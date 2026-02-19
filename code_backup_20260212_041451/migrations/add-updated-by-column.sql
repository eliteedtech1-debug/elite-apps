-- Migration: Add updated_by column to payment_entries table
-- Date: 2024-12-20
-- Purpose: Add updated_by column for tracking who last updated payment entries
-- Safety: Uses IF NOT EXISTS to prevent errors if column already exists

-- Check if the column exists before adding it
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_entries'
    AND COLUMN_NAME = 'updated_by'
);

-- Add the column only if it doesn't exist
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE payment_entries ADD COLUMN updated_by VARCHAR(100) NULL DEFAULT NULL COMMENT "User who last updated this payment entry" AFTER created_by',
    'SELECT "Column updated_by already exists in payment_entries table" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column was added
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_entries'
    AND COLUMN_NAME = 'updated_by';