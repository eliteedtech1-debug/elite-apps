-- Complete Database Collation Fix
-- Converts entire database to use utf8mb4_unicode_ci for consistency
-- This fixes the "Illegal mix of collations" error occurring throughout the application

-- First, get list of all tables in the database
SET @database_name = DATABASE();

-- Create a procedure to convert all tables and their columns to utf8mb4_unicode_ci
DELIMITER $$

DROP PROCEDURE IF EXISTS ConvertDatabaseCollation$$

CREATE PROCEDURE ConvertDatabaseCollation()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(255);
    DECLARE column_name VARCHAR(255);
    DECLARE data_type VARCHAR(255);
    
    -- Declare cursor for tables
    DECLARE table_cursor CURSOR FOR 
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = @database_name 
        AND TABLE_TYPE = 'BASE TABLE';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table to store column info
    CREATE TEMPORARY TABLE temp_columns (
        table_name VARCHAR(255),
        column_name VARCHAR(255),
        data_type VARCHAR(255),
        is_nullable VARCHAR(3),
        column_default TEXT
    );
    
    -- Open cursor
    OPEN table_cursor;
    
    table_loop: LOOP
        FETCH table_cursor INTO table_name;
        IF done THEN
            LEAVE table_loop;
        END IF;
        
        -- Convert entire table to utf8mb4_unicode_ci
        SET @sql = CONCAT('ALTER TABLE `', table_name, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SELECT CONCAT('Converted table: ', table_name, ' to utf8mb4_unicode_ci') AS status;
        
    END LOOP;
    
    CLOSE table_cursor;
    
    -- Second pass: Check for any remaining columns that might still have different collations
    -- and specifically update them
    SET done = FALSE;
    OPEN table_cursor;
    
    column_loop: LOOP
        FETCH table_cursor INTO table_name;
        IF done THEN
            LEAVE column_loop;
        END IF;
        
        -- Get columns with character type that may still have different collations
        INSERT INTO temp_columns (table_name, column_name, data_type, is_nullable, column_default)
        SELECT 
            TABLE_NAME,
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @database_name
        AND TABLE_NAME = table_name
        AND (DATA_TYPE IN ('varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext', 'enum', 'set'))
        AND (COLLATION_NAME IS NULL OR COLLATION_NAME != 'utf8mb4_unicode_ci');
        
    END LOOP;
    
    CLOSE table_cursor;
    
    -- Process each column that still needs collation fix
    ALTER TABLE temp_columns ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST;
    
    SET done = FALSE;
    BEGIN
        DECLARE column_done INT DEFAULT FALSE;
        DECLARE col_table_name VARCHAR(255);
        DECLARE col_column_name VARCHAR(255);
        DECLARE col_data_type VARCHAR(255);
        DECLARE col_is_nullable VARCHAR(3);
        DECLARE col_column_default TEXT;
        
        DECLARE column_cursor CURSOR FOR
            SELECT table_name, column_name, data_type, is_nullable, column_default
            FROM temp_columns;
        
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET column_done = TRUE;
        
        OPEN column_cursor;
        
        fix_column_loop: LOOP
            FETCH column_cursor INTO col_table_name, col_column_name, col_data_type, col_is_nullable, col_column_default;
            IF column_done THEN
                LEAVE fix_column_loop;
            END IF;
            
            -- Build MODIFY statement based on column attributes
            SET @modify_sql = CONCAT(
                'ALTER TABLE `', col_table_name, '` MODIFY `', col_column_name, '` ',
                col_data_type
            );
            
            -- Add character set and collation for text-based types
            IF col_data_type IN ('varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext') THEN
                SET @modify_sql = CONCAT(@modify_sql, ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            END IF;
            
            -- Add NULL/NOT NULL
            IF col_is_nullable = 'YES' THEN
                SET @modify_sql = CONCAT(@modify_sql, ' NULL');
            ELSE
                SET @modify_sql = CONCAT(@modify_sql, ' NOT NULL');
            END IF;
            
            -- Add default value if it exists
            IF col_column_default IS NOT NULL THEN
                IF col_column_default = '' THEN
                    SET @modify_sql = CONCAT(@modify_sql, " DEFAULT ''");
                ELSE
                    SET @modify_sql = CONCAT(@modify_sql, ' DEFAULT \'', col_column_default, '\'');
                END IF;
            END IF;
            
            -- Execute the modify statement
            PREPARE modify_stmt FROM @modify_sql;
            EXECUTE modify_stmt;
            DEALLOCATE PREPARE modify_stmt;
            
            SELECT CONCAT('Fixed collation for: ', col_table_name, '.', col_column_name) AS status;
            
        END LOOP;
        
        CLOSE column_cursor;
    END;
    
    DROP TEMPORARY TABLE temp_columns;
    
    SELECT 'Database-wide collation conversion completed!' AS status;
    
END$$

DELIMITER ;

-- Execute the procedure to convert entire database
CALL ConvertDatabaseCollation();

-- Drop the procedure after execution
DROP PROCEDURE ConvertDatabaseCollation;

-- Verify the results
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLLATION_NAME IS NOT NULL
AND COLLATION_NAME != 'utf8mb4_unicode_ci'
LIMIT 20;

SELECT 'Verification: If the above query returns no results, then all columns have been standardized to utf8mb4_unicode_ci.' AS verification_note;

-- Final check: Count how many columns still have different collations
SELECT 
    COLLATION_NAME,
    COUNT(*) as count
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLLATION_NAME IS NOT NULL
GROUP BY COLLATION_NAME
ORDER BY COUNT(*) DESC;

SELECT 'Final verification complete. All tables and columns should now use utf8mb4_unicode_ci collation.' AS final_status;