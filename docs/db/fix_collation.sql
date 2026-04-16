SET FOREIGN_KEY_CHECKS=0;

-- Fix database
ALTER DATABASE elite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix all tables (this will take a few minutes)
SELECT CONCAT('Fixing table: ', table_name) AS status
FROM information_schema.tables
WHERE table_schema = 'elite_db'
LIMIT 1;

SET @tables = (
  SELECT GROUP_CONCAT(
    CONCAT('ALTER TABLE `', table_name, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    SEPARATOR '\n'
  )
  FROM information_schema.tables
  WHERE table_schema = 'elite_db'
);

-- Execute for each table
-- Note: This is a template, actual execution happens via script

SET FOREIGN_KEY_CHECKS=1;
