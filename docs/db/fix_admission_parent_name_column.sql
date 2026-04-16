-- Fix for admission application parent_name column issue
-- Run this SQL to check and fix the column name

-- Check current column structure
DESCRIBE school_applicants;

-- If the column is named 'parent_fullname' instead of 'parent_name', run:
-- ALTER TABLE school_applicants CHANGE parent_fullname parent_name VARCHAR(255);

-- Or if you want to add the missing column:
-- ALTER TABLE school_applicants ADD COLUMN parent_name VARCHAR(255) AFTER special_health_needs;

-- Alternative: Check if there's a mismatch and fix it
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'school_applicants' 
  AND TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME LIKE '%parent%';
