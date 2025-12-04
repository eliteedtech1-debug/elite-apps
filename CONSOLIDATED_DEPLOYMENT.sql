-- ========================================================================
-- CONSOLIDATED DEPLOYMENT SCRIPT
-- ========================================================================
-- This script contains all database changes for:
-- 1. Teacher Soft Delete Implementation
-- 2. School Bank Accounts Feature
--
-- Date: 2025-12-01
-- IMPORTANT: Run this script on production database
-- Backup recommended before running
-- ========================================================================

-- ========================================================================
-- PART 1: TEACHER SOFT DELETE IMPLEMENTATION
-- ========================================================================

-- Step 1: Add soft delete columns to teachers table
ALTER TABLE teachers
  ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by VARCHAR(50) NULL;

-- Step 2: Drop existing unique constraints on teachers table
SET @constraint_exists = (SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'teachers'
    AND CONSTRAINT_NAME = 'teachers_school_id_email');

SET @sql = IF(@constraint_exists > 0,
  'ALTER TABLE teachers DROP INDEX teachers_school_id_email',
  'SELECT "Constraint teachers_school_id_email does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists = (SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'teachers'
    AND CONSTRAINT_NAME = 'teachers_school_id_mobile_no');

SET @sql = IF(@constraint_exists > 0,
  'ALTER TABLE teachers DROP INDEX teachers_school_id_mobile_no',
  'SELECT "Constraint teachers_school_id_mobile_no does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Add new scoped unique constraints to teachers table
ALTER TABLE teachers
  ADD UNIQUE KEY unique_email_active (email, school_id, is_deleted);

ALTER TABLE teachers
  ADD UNIQUE KEY unique_phone_active (mobile_no, school_id, is_deleted);

-- Step 4: Add soft delete columns to users table
ALTER TABLE users
  ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by VARCHAR(50) NULL;

-- Step 5: Update users table unique constraint for scoped uniqueness
SET @constraint_exists = (SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND CONSTRAINT_NAME = 'email');

SET @sql = IF(@constraint_exists > 0,
  'ALTER TABLE users DROP INDEX email',
  'SELECT "Constraint email does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE users
  ADD UNIQUE KEY unique_email_active (email, school_id, is_deleted);

-- ========================================================================
-- PART 2: SCHOOL BANK ACCOUNTS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS `school_bank_accounts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(10) NOT NULL,
  `branch_id` VARCHAR(20) NULL,
  `account_name` VARCHAR(255) NOT NULL COMMENT 'Account holder name',
  `account_number` VARCHAR(50) NOT NULL COMMENT 'Bank account number',
  `bank_name` VARCHAR(100) NOT NULL COMMENT 'Name of the bank',
  `bank_code` VARCHAR(10) NULL COMMENT 'Bank code (e.g., for Nigerian banks)',
  `swift_code` VARCHAR(20) NULL COMMENT 'SWIFT/BIC code for international transfers',
  `branch_address` TEXT NULL COMMENT 'Bank branch address',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT 'Default account for invoices',
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_per_school` (`school_id`, `account_number`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_is_default` (`is_default`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='School bank accounts for invoicing';

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Verify teachers table columns
SELECT
  'Teachers Soft Delete Columns' AS verification_type,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'teachers'
  AND COLUMN_NAME IN ('is_deleted', 'deleted_at', 'deleted_by');

-- Verify users table columns
SELECT
  'Users Soft Delete Columns' AS verification_type,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME IN ('is_deleted', 'deleted_at', 'deleted_by');

-- Verify teachers table unique constraints
SELECT
  'Teachers Unique Constraints' AS verification_type,
  TABLE_NAME,
  CONSTRAINT_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS columns
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'teachers'
  AND CONSTRAINT_NAME IN ('unique_email_active', 'unique_phone_active')
GROUP BY CONSTRAINT_NAME;

-- Verify users table unique constraint
SELECT
  'Users Unique Constraint' AS verification_type,
  TABLE_NAME,
  CONSTRAINT_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS columns
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND CONSTRAINT_NAME = 'unique_email_active'
GROUP BY CONSTRAINT_NAME;

-- Verify school_bank_accounts table
SELECT
  'Bank Accounts Table' AS verification_type,
  COUNT(*) AS column_count
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'school_bank_accounts';

SHOW CREATE TABLE school_bank_accounts;

-- ========================================================================
-- DEPLOYMENT SUMMARY
-- ========================================================================
--
-- Changes Applied:
-- 1. ✅ Teachers table: Added soft delete support with scoped uniqueness
-- 2. ✅ Users table: Added soft delete support with scoped uniqueness
-- 3. ✅ School bank accounts table created
--
-- Next Steps:
-- 1. Deploy backend code changes (controllers and routes)
-- 2. Deploy frontend code changes (UI components)
-- 3. Test teacher deletion
-- 4. Test bank account management
-- 5. Update invoice templates to include bank details
--
-- ========================================================================

-- ========================================================================
-- ROLLBACK SCRIPT (If needed - DO NOT RUN unless rolling back)
-- ========================================================================
/*
-- Rollback Teacher Soft Delete
ALTER TABLE teachers DROP COLUMN is_deleted;
ALTER TABLE teachers DROP COLUMN deleted_at;
ALTER TABLE teachers DROP COLUMN deleted_by;
ALTER TABLE teachers DROP INDEX unique_email_active;
ALTER TABLE teachers DROP INDEX unique_phone_active;
ALTER TABLE teachers ADD UNIQUE KEY teachers_school_id_email (school_id, email);
ALTER TABLE teachers ADD UNIQUE KEY teachers_school_id_mobile_no (school_id, mobile_no);

-- Rollback Users Soft Delete
ALTER TABLE users DROP COLUMN is_deleted;
ALTER TABLE users DROP COLUMN deleted_at;
ALTER TABLE users DROP COLUMN deleted_by;
ALTER TABLE users DROP INDEX unique_email_active;
ALTER TABLE users ADD UNIQUE KEY email (email, school_id);

-- Rollback Bank Accounts Table
DROP TABLE IF EXISTS school_bank_accounts;
*/
-- ========================================================================
