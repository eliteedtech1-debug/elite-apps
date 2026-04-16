-- =====================================================
-- CONSOLIDATED DATABASE MIGRATION
-- =====================================================
-- This file consolidates all pending SQL migrations into a single,
-- idempotent migration that can be safely run multiple times.
--
-- Created: 2025-12-03
-- Source Files:
--   - database_migrations/ca_exam_submissions_fixes.sql
--   - database_migrations/create_ca_exam_tables.sql
--   - database_migrations/remove_payment_unique_constraint.sql
--   - src/models/biometric_import_migration.sql
--   - src/models/ca_exam_process_migration.sql
--   - src/models/ca_setup_migration.sql
--   - src/models/gps_attendance_migration.sql
--
-- IMPORTANT: This migration uses IF NOT EXISTS and dynamic checks
-- to ensure it can be run multiple times without errors.
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Set database variables for dynamic checks
SET @dbname = DATABASE();

-- =====================================================
-- SECTION 1: GPS-BASED STAFF ATTENDANCE SYSTEM
-- =====================================================

-- Add GPS columns to school_locations table

SET @tablename = 'school_locations';

-- Add latitude column
SET @columnname = 'latitude';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` DECIMAL(10, 8) NULL COMMENT ''Branch GPS latitude coordinate'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add longitude column
SET @columnname = 'longitude';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` DECIMAL(11, 8) NULL COMMENT ''Branch GPS longitude coordinate'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add gps_radius column
SET @columnname = 'gps_radius';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` INT DEFAULT 80 COMMENT ''Allowed radius in meters for GPS attendance (default: 80m)'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add GPS setting to school_setup table
SET @tablename = 'school_setup';
SET @columnname = 'staff_login_system';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` TINYINT(1) DEFAULT 0 COMMENT ''0=Normal login, 1=GPS-based attendance login'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create staff_attendance table
CREATE TABLE IF NOT EXISTS `staff_attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `staff_id` VARCHAR(50) NOT NULL COMMENT 'Staff ID from teachers table',
  `user_id` INT NULL COMMENT 'User ID from users table',
  `school_id` VARCHAR(50) NOT NULL COMMENT 'School ID',
  `branch_id` VARCHAR(50) NULL COMMENT 'Branch ID',
  `date` DATE NOT NULL COMMENT 'Attendance date',
  `check_in_time` DATETIME NOT NULL COMMENT 'Check-in timestamp',
  `check_out_time` DATETIME NULL COMMENT 'Check-out timestamp',
  `method` ENUM('GPS', 'Manual', 'Biometric', 'Import') DEFAULT 'GPS'
    COMMENT 'Attendance marking method',
  `gps_lat` DECIMAL(10, 8) NULL COMMENT 'GPS latitude at check-in',
  `gps_lon` DECIMAL(11, 8) NULL COMMENT 'GPS longitude at check-in',
  `distance_from_branch` INT NULL COMMENT 'Distance from branch in meters',
  `status` ENUM('Present', 'Late', 'Absent', 'Half-Day', 'Leave') DEFAULT 'Present'
    COMMENT 'Attendance status',
  `remarks` TEXT NULL COMMENT 'Additional notes',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT NULL COMMENT 'User ID who created the record',
  `updated_by` INT NULL COMMENT 'User ID who last updated',

  INDEX `idx_staff_date` (`staff_id`, `date`),
  INDEX `idx_school_date` (`school_id`, `date`),
  INDEX `idx_branch_date` (`branch_id`, `date`),
  INDEX `idx_method` (`method`),
  INDEX `idx_status` (`status`),

  UNIQUE KEY `unique_staff_date_branch` (`staff_id`, `date`, `school_id`, `branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Staff daily attendance records with GPS tracking';

-- Add device_id column to staff_attendance if not exists
SET @tablename = 'staff_attendance';
SET @columnname = 'device_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` VARCHAR(50) DEFAULT NULL COMMENT ''Biometric device identifier'' AFTER `method`;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for device_id if not exists
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'staff_attendance' AND INDEX_NAME = 'idx_device_id') > 0,
  'SELECT 1',
  'ALTER TABLE `staff_attendance` ADD INDEX `idx_device_id` (`device_id`);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create staff_attendance_summary view
CREATE OR REPLACE VIEW `staff_attendance_summary` AS
SELECT
  sa.school_id,
  sa.branch_id,
  sa.date,
  sa.method,
  COUNT(DISTINCT sa.staff_id) as total_staff,
  SUM(CASE WHEN sa.status = 'Present' THEN 1 ELSE 0 END) as present_count,
  SUM(CASE WHEN sa.status = 'Late' THEN 1 ELSE 0 END) as late_count,
  SUM(CASE WHEN sa.status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
  SUM(CASE WHEN sa.status = 'Leave' THEN 1 ELSE 0 END) as leave_count,
  SUM(CASE WHEN sa.method = 'GPS' THEN 1 ELSE 0 END) as gps_attendance,
  SUM(CASE WHEN sa.method = 'Biometric' THEN 1 ELSE 0 END) as biometric_attendance,
  SUM(CASE WHEN sa.method = 'Manual' THEN 1 ELSE 0 END) as manual_attendance
FROM staff_attendance sa
GROUP BY sa.school_id, sa.branch_id, sa.date, sa.method;

-- =====================================================
-- SECTION 2: BIOMETRIC IMPORT SYSTEM
-- =====================================================

-- Create biometric_import_history table
CREATE TABLE IF NOT EXISTS `biometric_import_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) DEFAULT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `device_type` ENUM('fingerprint', 'facial', 'card', 'other') NOT NULL DEFAULT 'fingerprint',
  `total_records` INT NOT NULL DEFAULT 0,
  `successful` INT NOT NULL DEFAULT 0,
  `failed` INT NOT NULL DEFAULT 0,
  `imported_by` VARCHAR(50) DEFAULT NULL,
  `import_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'partial') NOT NULL DEFAULT 'pending',
  `error_log` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_school_id` (`school_id`),
  INDEX `idx_branch_id` (`branch_id`),
  INDEX `idx_import_date` (`import_date`),
  INDEX `idx_status` (`status`),
  INDEX `idx_device_type` (`device_type`),
  INDEX `idx_school_branch_date` (`school_id`, `branch_id`, `import_date`),
  INDEX `idx_status_date` (`status`, `import_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks biometric attendance import history';

-- Create biometric_import_log table (for compatibility)
CREATE TABLE IF NOT EXISTS `biometric_import_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NULL,
  `import_date` DATE NOT NULL COMMENT 'Date of import',
  `file_name` VARCHAR(255) NULL COMMENT 'Original file name',
  `total_records` INT DEFAULT 0 COMMENT 'Total records in file',
  `successful_imports` INT DEFAULT 0 COMMENT 'Successfully imported records',
  `failed_imports` INT DEFAULT 0 COMMENT 'Failed import records',
  `error_log` TEXT NULL COMMENT 'JSON array of errors',
  `imported_by` INT NOT NULL COMMENT 'User ID who performed import',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_school_import_date` (`school_id`, `import_date`),
  INDEX `idx_branch_import_date` (`branch_id`, `import_date`),
  INDEX `idx_imported_by` (`imported_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Log of biometric attendance imports from CSV/Excel files';

-- Create views for biometric import reporting
CREATE OR REPLACE VIEW `v_recent_import_summary` AS
SELECT
  h.id,
  h.school_id,
  h.branch_id,
  h.file_name,
  h.device_type,
  h.total_records,
  h.successful,
  h.failed,
  h.imported_by,
  h.import_date,
  h.status,
  ROUND(h.successful * 100.0 / NULLIF(h.total_records, 0), 2) as success_rate,
  CASE
    WHEN h.failed = 0 THEN 'Perfect'
    WHEN h.failed <= 5 THEN 'Good'
    WHEN h.failed <= 10 THEN 'Fair'
    ELSE 'Poor'
  END as quality_rating
FROM biometric_import_history h
WHERE h.import_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY h.import_date DESC;

CREATE OR REPLACE VIEW `v_device_type_statistics` AS
SELECT
  school_id,
  device_type,
  COUNT(*) as total_imports,
  SUM(total_records) as total_records,
  SUM(successful) as total_successful,
  SUM(failed) as total_failed,
  ROUND(AVG(successful * 100.0 / NULLIF(total_records, 0)), 2) as avg_success_rate,
  MAX(import_date) as last_import_date
FROM biometric_import_history
GROUP BY school_id, device_type;

-- =====================================================
-- SECTION 3: CA SETUP SYSTEM
-- =====================================================

-- Create ca_setup table
CREATE TABLE IF NOT EXISTS `ca_setup` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ca_type` ENUM('CA1', 'CA2', 'CA3', 'CA4', 'EXAM') NOT NULL,
  `week_number` INT NOT NULL COMMENT 'Week number in academic calendar',
  `max_score` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  `overall_contribution_percent` DECIMAL(5,2) NOT NULL COMMENT 'Contribution to overall grade (%)',
  `is_active` TINYINT(1) DEFAULT 1,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `status` ENUM('Active', 'Inactive', 'Completed') DEFAULT 'Active',
  `section` VARCHAR(50) NULL COMMENT 'Section/Level if applicable',
  `academic_year` VARCHAR(20) NOT NULL,
  `term` VARCHAR(20) NOT NULL,
  `scheduled_date` DATE NULL COMMENT 'Calculated from week_number',
  `submission_deadline` DATE NULL COMMENT 'Deadline for question submission',
  `notification_sent` TINYINT(1) DEFAULT 0 COMMENT 'Notification sent to teachers',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`),
  UNIQUE KEY `ca_setup_school_id_branch_id_academic_year_term_ca_type`
    (`school_id`, `branch_id`, `academic_year`, `term`, `ca_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add columns to ca_setup if they don't exist
SET @tablename = 'ca_setup';

SET @columnname = 'scheduled_date';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` DATE NULL COMMENT ''Auto-calculated scheduled date based on week_number'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'submission_deadline';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` DATE NULL COMMENT ''Deadline for teachers to submit questions'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'notification_sent';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` TINYINT(1) DEFAULT 0 COMMENT ''Whether notification has been sent to teachers'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add CBT support to school_setup
SET @tablename = 'school_setup';
SET @columnname = 'cbt_enabled';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` TINYINT(1) DEFAULT 0 COMMENT ''Enable Computer-Based Testing (CBT) for this school'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- SECTION 4: CA/EXAM SUBMISSIONS SYSTEM
-- =====================================================

-- Create ca_exam_submissions table
CREATE TABLE IF NOT EXISTS `ca_exam_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_code` VARCHAR(50) UNIQUE NULL COMMENT 'Unique submission identifier',
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `ca_setup_id` INT NULL COMMENT 'Reference to ca_setup table',
  `ca_type` ENUM('CA1', 'CA2', 'CA3', 'CA4', 'EXAM') NOT NULL,
  `teacher_id` INT NOT NULL COMMENT 'User ID of submitting teacher',
  `subject_code` VARCHAR(50) NOT NULL COMMENT 'Subject code (e.g., SBJ1501)',
  `class_id` VARCHAR(50) NOT NULL,
  `academic_year` VARCHAR(20) NOT NULL,
  `term` VARCHAR(20) NOT NULL,

  -- Question file details
  `question_file` VARCHAR(500) NULL COMMENT 'Path to uploaded question file',
  `question_file_url` VARCHAR(500) NULL COMMENT 'Alternative field name',
  `question_file_name` VARCHAR(255) NULL,
  `question_file_type` VARCHAR(50) NULL COMMENT 'PDF, DOC, DOCX',
  `question_file_size` INT NULL COMMENT 'File size in bytes',

  -- Submission details
  `comments` TEXT NULL COMMENT 'Teacher comments/notes',
  `status` ENUM('Draft', 'Submitted', 'Under Moderation', 'Under Review', 'Approved', 'Rejected', 'Modification Requested') DEFAULT 'Draft',
  `submitted_at` DATETIME NULL COMMENT 'When teacher submitted',
  `submission_date` DATETIME NULL COMMENT 'Alternative field name',
  `deadline` DATETIME NULL COMMENT 'Submission deadline',
  `is_locked` TINYINT(1) DEFAULT 0 COMMENT 'Locked after approval',

  -- Moderation details
  `moderated_by` INT NULL COMMENT 'User ID of moderator',
  `moderation_date` DATETIME NULL,
  `moderated_date` DATETIME NULL COMMENT 'Alternative field name',
  `moderation_comments` TEXT NULL,
  `rejection_reason` TEXT NULL,

  -- Replacement file
  `replacement_file_url` VARCHAR(500) NULL,
  `replacement_file_name` VARCHAR(255) NULL,
  `replaced_by` INT NULL,
  `replacement_date` DATETIME NULL,

  -- Printing status
  `is_printed` TINYINT(1) DEFAULT 0,
  `printed_by` INT NULL,
  `printed_date` DATETIME NULL,
  `print_count` INT DEFAULT 0,

  -- CBT support
  `cbt_enabled` TINYINT(1) DEFAULT 0,
  `cbt_initiated_by` INT NULL,
  `cbt_initiated_date` DATETIME NULL,

  -- Audit fields
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT NULL,
  `updated_by` INT NULL,

  -- Indexes
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_ca_setup` (`ca_setup_id`),
  INDEX `idx_teacher` (`teacher_id`),
  INDEX `idx_subject_code` (`subject_code`),
  INDEX `idx_class_id` (`class_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_academic` (`academic_year`, `term`),
  INDEX `idx_ca_type` (`ca_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Teacher question submissions for CA and Exams';

-- Fix ca_exam_submissions table columns (make them safe for re-runs)
SET @tablename = 'ca_exam_submissions';

-- Change class_id to VARCHAR if it's INT
SET @preparedStatement = (SELECT IF(
  (SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'class_id') = 'int',
  CONCAT('ALTER TABLE `', @tablename, '` MODIFY COLUMN `class_id` VARCHAR(50) NOT NULL;'),
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add submitted_at if not exists
SET @columnname = 'submitted_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname,
         '` DATETIME NULL AFTER `status`;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create ca_exam_moderation_logs table
CREATE TABLE IF NOT EXISTS `ca_exam_moderation_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_id` INT NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `moderator_id` INT NOT NULL COMMENT 'User ID of moderator',
  `action` ENUM('Submitted', 'Under Review', 'Approved', 'Rejected', 'Modification Requested', 'File Replaced', 'Locked', 'Unlocked', 'Printed') NOT NULL,
  `action_by` INT NOT NULL COMMENT 'User ID who performed action',
  `action_date` DATETIME NOT NULL,
  `comments` TEXT NULL,
  `previous_status` VARCHAR(50) NULL,
  `new_status` VARCHAR(50) NULL,
  `reason` TEXT NULL,
  `file_changed` TINYINT(1) DEFAULT 0,
  `old_file_url` VARCHAR(500) NULL,
  `new_file_url` VARCHAR(500) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_submission` (`submission_id`),
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_action_by` (`action_by`),
  INDEX `idx_action_date` (`action_date`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit log for all moderation actions on CA/Exam submissions';

-- Create ca_exam_notifications table
CREATE TABLE IF NOT EXISTS `ca_exam_notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `notification_code` VARCHAR(50) UNIQUE NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `ca_setup_id` INT NOT NULL,
  `notification_type` ENUM('Upcoming Deadline', 'Deadline Reminder', 'Submission Received', 'Moderation Update', 'Approval', 'Rejection', 'Modification Request') NOT NULL,
  `recipient_type` ENUM('Teacher', 'Admin', 'Exam Officer', 'Moderation Committee', 'All') NOT NULL,
  `recipient_id` INT NULL COMMENT 'Specific user ID or NULL for broadcast',
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `ca_type` VARCHAR(20) NULL,
  `subject_name` VARCHAR(100) NULL,
  `class_name` VARCHAR(100) NULL,
  `deadline_date` DATE NULL,
  `is_sent` TINYINT(1) DEFAULT 0,
  `sent_date` DATETIME NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_date` DATETIME NULL,
  `sent_via_email` TINYINT(1) DEFAULT 0,
  `sent_via_sms` TINYINT(1) DEFAULT 0,
  `sent_via_push` TINYINT(1) DEFAULT 0,
  `sent_via_in_app` TINYINT(1) DEFAULT 1,
  `submission_id` INT NULL,
  `priority` ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_ca_setup` (`ca_setup_id`),
  INDEX `idx_recipient` (`recipient_id`),
  INDEX `idx_type` (`notification_type`),
  INDEX `idx_status` (`is_sent`, `is_read`),
  INDEX `idx_deadline` (`deadline_date`),
  INDEX `idx_submission` (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Notifications for CA/Exam process workflow';

-- Create ca_exam_print_logs table
CREATE TABLE IF NOT EXISTS `ca_exam_print_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_id` INT NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `printed_by` INT NOT NULL,
  `print_date` DATETIME NOT NULL,
  `print_type` ENUM('Preview', 'Download', 'Print') NOT NULL,
  `copies_count` INT DEFAULT 1,
  `pdf_file_url` VARCHAR(500) NULL,
  `pdf_file_size` INT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_submission` (`submission_id`),
  INDEX `idx_school_branch` (`school_id`, `branch_id`),
  INDEX `idx_printed_by` (`printed_by`),
  INDEX `idx_print_date` (`print_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Log of all question paper printing activities';

-- =====================================================
-- SECTION 5: PAYMENT ENTRIES - REMOVE UNIQUE CONSTRAINTS
-- =====================================================

-- Remove invalid unique constraints that prevent multiple payments
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'payment_entries'
   AND INDEX_NAME = 'uk_payment_entries_student_fee') > 0,
  'ALTER TABLE `payment_entries` DROP INDEX `uk_payment_entries_student_fee`;',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'payment_entries'
   AND INDEX_NAME = 'unique_payment_entry') > 0,
  'ALTER TABLE `payment_entries` DROP INDEX `unique_payment_entry`;',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- SECTION 6: VIEWS FOR REPORTING
-- =====================================================

-- CA/Exam submission summary view
CREATE OR REPLACE VIEW `v_ca_exam_submission_summary` AS
SELECT
  ces.school_id,
  ces.branch_id,
  ces.academic_year,
  ces.term,
  ces.ca_type,
  ces.status,
  COUNT(*) as submission_count,
  COUNT(DISTINCT ces.teacher_id) as teacher_count,
  COUNT(DISTINCT ces.subject_code) as subject_count,
  COUNT(DISTINCT ces.class_id) as class_count,
  SUM(CASE WHEN ces.is_locked = 1 THEN 1 ELSE 0 END) as locked_count,
  SUM(CASE WHEN ces.is_printed = 1 THEN 1 ELSE 0 END) as printed_count
FROM ca_exam_submissions ces
GROUP BY ces.school_id, ces.branch_id, ces.academic_year, ces.term, ces.ca_type, ces.status;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Consolidated database migration completed successfully!' as status,
       'All tables, columns, and views have been created/updated safely.' as message,
       'This migration is idempotent and can be run multiple times.' as note; 
