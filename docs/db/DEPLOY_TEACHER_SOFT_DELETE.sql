-- ========================================================================
-- TEACHER SOFT DELETE - PRODUCTION DEPLOYMENT SCRIPT
-- ========================================================================
-- This script adds soft delete support to the teachers and users tables
-- Run this on the production database to enable teacher soft delete
-- Date: 2025-12-01
-- ========================================================================

-- Backup recommendation before running:
-- mysqldump -u root -p skcooly_db teachers users > backup_teachers_users_$(date +%Y%m%d_%H%M%S).sql

-- ========================================================================
-- STEP 1: Add soft delete columns to teachers table
-- ========================================================================

ALTER TABLE teachers
  ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by VARCHAR(50) NULL;

-- ========================================================================
-- STEP 2: Drop existing unique constraints on teachers table
-- ========================================================================

-- Check if constraints exist before dropping
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

-- ========================================================================
-- STEP 3: Add new scoped unique constraints to teachers table
-- ========================================================================

-- Add scoped unique constraint for email (unique only for non-deleted)
ALTER TABLE teachers
  ADD UNIQUE KEY unique_email_active (email, school_id, is_deleted);

-- Add scoped unique constraint for phone (unique only for non-deleted)
ALTER TABLE teachers
  ADD UNIQUE KEY unique_phone_active (mobile_no, school_id, is_deleted);

-- ========================================================================
-- STEP 4: Add soft delete columns to users table
-- ========================================================================

ALTER TABLE users
  ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by VARCHAR(50) NULL;

-- ========================================================================
-- STEP 5: Update users table unique constraint for scoped uniqueness
-- ========================================================================

-- Drop existing email unique constraint
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

-- Add scoped unique constraint for email
ALTER TABLE users
  ADD UNIQUE KEY unique_email_active (email, school_id, is_deleted);

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Verify teachers table columns
SELECT
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
  TABLE_NAME,
  CONSTRAINT_NAME,
  COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'teachers'
  AND CONSTRAINT_NAME IN ('unique_email_active', 'unique_phone_active')
ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION;

-- Verify users table unique constraint
SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND CONSTRAINT_NAME = 'unique_email_active'
ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION;

-- ========================================================================
-- EXPECTED VERIFICATION OUTPUT
-- ========================================================================
-- Teachers columns should show:
--   is_deleted | tinyint | YES | 0
--   deleted_at | datetime | YES | NULL
--   deleted_by | varchar | YES | NULL
--
-- Users columns should show:
--   is_deleted | tinyint | YES | 0
--   deleted_at | datetime | YES | NULL
--   deleted_by | varchar | YES | NULL
--
-- Teachers constraints should show:
--   unique_email_active: (email, school_id, is_deleted)
--   unique_phone_active: (mobile_no, school_id, is_deleted)
--
-- Users constraint should show:
--   unique_email_active: (email, school_id, is_deleted)
-- ========================================================================

-- ========================================================================
-- ROLLBACK SCRIPT (In case you need to undo changes)
-- ========================================================================
-- IMPORTANT: Only run this if you need to rollback the changes!
--
-- ALTER TABLE teachers DROP COLUMN is_deleted;
-- ALTER TABLE teachers DROP COLUMN deleted_at;
-- ALTER TABLE teachers DROP COLUMN deleted_by;
-- ALTER TABLE teachers DROP INDEX unique_email_active;
-- ALTER TABLE teachers DROP INDEX unique_phone_active;
-- ALTER TABLE teachers ADD UNIQUE KEY teachers_school_id_email (school_id, email);
-- ALTER TABLE teachers ADD UNIQUE KEY teachers_school_id_mobile_no (school_id, mobile_no);
--
-- ALTER TABLE users DROP COLUMN is_deleted;
-- ALTER TABLE users DROP COLUMN deleted_at;
-- ALTER TABLE users DROP COLUMN deleted_by;
-- ALTER TABLE users DROP INDEX unique_email_active;
-- ALTER TABLE users ADD UNIQUE KEY email (email, school_id);
-- ========================================================================
