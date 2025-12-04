-- Add soft delete support to teachers table
-- This migration adds is_deleted, deleted_at, deleted_by columns
-- and updates unique constraints to support email/phone reuse

-- Step 1: Add soft delete columns to teachers table
ALTER TABLE teachers
  ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by VARCHAR(50) NULL;

-- Step 2: Drop existing unique constraints on email and phone
ALTER TABLE teachers DROP INDEX teachers_school_id_email;
ALTER TABLE teachers DROP INDEX teachers_school_id_mobile_no;

-- Step 3: Add new scoped unique constraints (unique only for non-deleted records)
ALTER TABLE teachers
  ADD UNIQUE KEY unique_email_active (email, school_id, is_deleted),
  ADD UNIQUE KEY unique_phone_active (mobile_no, school_id, is_deleted);

-- Step 4: Add soft delete columns to users table
ALTER TABLE users
  ADD COLUMN is_deleted TINYINT(1) DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by VARCHAR(50) NULL;

-- Step 5: Update users table unique constraint for email to support soft delete
ALTER TABLE users DROP INDEX email;
ALTER TABLE users
  ADD UNIQUE KEY unique_email_active (email, school_id, is_deleted);

-- Verification queries (run these to verify the changes)
-- SHOW CREATE TABLE teachers;
-- SHOW CREATE TABLE users;
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'teachers' AND COLUMN_NAME IN ('is_deleted', 'deleted_at', 'deleted_by');
