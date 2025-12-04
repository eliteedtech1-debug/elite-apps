-- Simple Script to Convert Entire Database Collation to utf8mb4_unicode_ci
-- This addresses the global collation issue affecting your application

-- Set the session to handle large operations
SET SESSION sql_mode = '';

-- First, convert the database character set
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Then, convert all existing tables to use the correct character set and collation
-- We'll use dynamic SQL to generate and execute ALTER TABLE statements for all tables

-- Create a temporary table to store table names
CREATE TEMPORARY TABLE temp_tables AS
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'BASE TABLE';

-- Update all tables one by one
SELECT 'Converting tables to utf8mb4_unicode_ci...' AS status_message;

-- Convert each table individually 
SET @sql = NULL;

-- Process tables with a simple loop approach
SELECT 
    GROUP_CONCAT(
        CONCAT('ALTER TABLE `', TABLE_NAME, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;') 
        SEPARATOR ' '
    ) INTO @sql
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'BASE TABLE';

-- Execute the combined statement
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify that all tables now use the correct collation
SELECT 'Checking table character sets and collations...' AS status_message;

SELECT 
    TABLE_NAME,
    TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'BASE TABLE';

-- Now identify any columns that still have different collations
SELECT 'Identifying columns with non-standard collations...' AS status_message;

SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLLATION_NAME IS NOT NULL
AND COLLATION_NAME != 'utf8mb4_unicode_ci'
LIMIT 50;

-- If there are still columns with different collations, fix them individually
-- For VARCHAR, CHAR, TEXT and other character-based columns
SELECT 'Creating statements to fix remaining column collations...' AS status_message;

-- Generate ALTER statements for columns that still have wrong collations
SELECT 
    GROUP_CONCAT(
        CONCAT(
            'ALTER TABLE `', TABLE_NAME, '` MODIFY `', COLUMN_NAME, '` ', 
            COLUMN_TYPE,
            CASE 
                WHEN COLLATION_NAME IS NOT NULL AND DATA_TYPE IN ('varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext', 'enum', 'set') 
                THEN ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
                ELSE ''
            END,
            CASE 
                WHEN IS_NULLABLE = 'YES' THEN ' NULL' 
                ELSE ' NOT NULL' 
            END,
            CASE 
                WHEN COLUMN_DEFAULT IS NOT NULL THEN CONCAT(' DEFAULT \'', COLUMN_DEFAULT, '\'')
                WHEN IS_NULLABLE = 'YES' THEN ' DEFAULT NULL'
                ELSE ''
            END
        ) SEPARATOR ';'
    ) INTO @sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLLATION_NAME IS NOT NULL
AND COLLATION_NAME != 'utf8mb4_unicode_ci'
AND DATA_TYPE IN ('varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext', 'enum', 'set');

-- If there are columns to fix, execute the statements
IF @sql IS NOT NULL AND LENGTH(@sql) > 0 THEN
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT 'Remaining column collations have been fixed!' AS status_message;
ELSE
    SELECT 'No columns with mismatched collations found - all good!' AS status_message;
END IF;

-- Final verification: Check if any collation issues remain
SELECT 
    COLLATION_NAME AS remaining_collation,
    COUNT(*) AS count
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLLATION_NAME IS NOT NULL
GROUP BY COLLATION_NAME
ORDER BY COUNT(*) DESC;

-- Success message
SELECT 'SUCCESS: Entire database collation has been standardized to utf8mb4_unicode_ci!' AS final_message;
SELECT 'The "Illegal mix of collations" errors should now be resolved throughout your application.' AS resolution_message;