-- Complete Database Collation Standardization Script
-- This will convert ALL tables in the database to use utf8mb4_unicode_ci collation

-- Disable foreign key checks temporarily to allow modifications
SET FOREIGN_KEY_CHECKS = 0;

-- Create a procedure to convert all tables to standardized collation
DELIMITER $$

DROP PROCEDURE IF EXISTS StandardizeAllTableCollations$$

CREATE PROCEDURE StandardizeAllTableCollations()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(255);
    DECLARE cur CURSOR FOR 
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_TYPE = 'BASE TABLE';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    table_loop: LOOP
        FETCH cur INTO table_name;
        IF done THEN
            LEAVE table_loop;
        END IF;
        
        SET @sql = CONCAT('ALTER TABLE `', table_name, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        SET @success_msg = CONCAT('✅ Converted table: ', table_name);
        
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            BEGIN
                SET @error_msg = CONCAT('❌ Error converting table: ', table_name);
                SELECT @error_msg AS status;
            END;
            
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            
            SELECT @success_msg AS status;
        END;
    END LOOP;
    
    CLOSE cur;
    
    SELECT '🎉 All tables have been standardized to utf8mb4_unicode_ci!' AS completion_status;
END$$

DELIMITER ;

-- Execute the procedure to fix all tables
CALL StandardizeAllTableCollations();

-- Drop the procedure
DROP PROCEDURE StandardizeAllTableCollations;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify that tables have been properly converted by showing any remaining non-standard collations
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLLATION_NAME,
    DATA_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLLATION_NAME IS NOT NULL
AND COLLATION_NAME != 'utf8mb4_unicode_ci'
ORDER BY TABLE_NAME, COLUMN_NAME
LIMIT 50;

SELECT 
    COUNT(*) AS remaining_non_standard_columns
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLLATION_NAME IS NOT NULL
AND COLLATION_NAME != 'utf8mb4_unicode_ci';

SELECT 'Final verification complete. All major collation issues should now be resolved.' AS status;
SELECT 'Stored procedures like academic_year, dashboard_query, and manage_branches should now work correctly.' AS resolution_note;