-- =====================================================
-- GPS-BASED STAFF ATTENDANCE SYSTEM - PRODUCTION MIGRATION
-- =====================================================
-- This migration file contains all database changes needed for
-- the GPS-based staff attendance system.
--
-- FEATURES:
-- 1. GPS coordinates in school_locations table
-- 2. Staff login system flag in school_setup
-- 3. Staff attendance tracking table
-- 4. Biometric import logging table
--
-- SAFE TO RUN MULTIPLE TIMES (uses IF NOT EXISTS)
-- =====================================================

-- Set SQL mode and character set
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- =====================================================
-- 1. ADD GPS COLUMNS TO school_locations TABLE
-- =====================================================
-- These columns store the branch GPS coordinates and allowed radius

ALTER TABLE `school_locations`
ADD COLUMN IF NOT EXISTS `latitude` DECIMAL(10, 8) NULL DEFAULT NULL
  COMMENT 'GPS latitude of branch location',
ADD COLUMN IF NOT EXISTS `longitude` DECIMAL(11, 8) NULL DEFAULT NULL
  COMMENT 'GPS longitude of branch location',
ADD COLUMN IF NOT EXISTS `gps_radius` INT(11) NULL DEFAULT 80
  COMMENT 'Allowed GPS radius in meters (default: 80m)';

-- Add index for GPS lookups
ALTER TABLE `school_locations`
ADD INDEX IF NOT EXISTS `idx_gps_enabled` (`school_id`, `branch_id`, `latitude`, `longitude`);

-- =====================================================
-- 2. ADD STAFF LOGIN SYSTEM FLAG TO school_setup TABLE
-- =====================================================
-- This flag enables/disables GPS-based staff attendance per school

ALTER TABLE `school_setup`
ADD COLUMN IF NOT EXISTS `staff_login_system` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'Enable GPS-based staff attendance: 0=disabled, 1=enabled';

-- Add index for quick lookups
ALTER TABLE `school_setup`
ADD INDEX IF NOT EXISTS `idx_staff_login_system` (`school_id`, `staff_login_system`);

-- =====================================================
-- 3. CREATE staff_attendance TABLE
-- =====================================================
-- Main table for tracking staff attendance with GPS support

CREATE TABLE IF NOT EXISTS `staff_attendance` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `staff_id` VARCHAR(50) NOT NULL COMMENT 'References teachers.id',
  `user_id` INT(11) NULL DEFAULT NULL COMMENT 'References users.id',
  `school_id` VARCHAR(50) NOT NULL COMMENT 'School identifier for multi-tenancy',
  `branch_id` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Branch identifier',
  `date` DATE NOT NULL COMMENT 'Attendance date (YYYY-MM-DD)',
  `check_in_time` DATETIME NOT NULL COMMENT 'Check-in timestamp',
  `check_out_time` DATETIME NULL DEFAULT NULL COMMENT 'Check-out timestamp (optional)',
  `method` ENUM('GPS', 'Manual', 'Biometric', 'Import') NULL DEFAULT 'GPS'
    COMMENT 'Method used to mark attendance',
  `gps_lat` DECIMAL(10, 8) NULL DEFAULT NULL
    COMMENT 'GPS latitude at check-in (for GPS method)',
  `gps_lon` DECIMAL(11, 8) NULL DEFAULT NULL
    COMMENT 'GPS longitude at check-in (for GPS method)',
  `distance_from_branch` INT(11) NULL DEFAULT NULL
    COMMENT 'Distance from branch in meters (for GPS method)',
  `status` ENUM('Present', 'Late', 'Absent', 'Half-Day', 'Leave') NULL DEFAULT 'Present'
    COMMENT 'Attendance status',
  `remarks` TEXT NULL DEFAULT NULL COMMENT 'Additional notes or comments',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT(11) NULL DEFAULT NULL COMMENT 'User ID who created this record',
  `updated_by` INT(11) NULL DEFAULT NULL COMMENT 'User ID who last updated this record',
  PRIMARY KEY (`id`),
  INDEX `idx_staff_date` (`staff_id`, `date`),
  INDEX `idx_school_staff_date` (`school_id`, `staff_id`, `date`),
  INDEX `idx_school_branch_date` (`school_id`, `branch_id`, `date`),
  INDEX `idx_school_date_status` (`school_id`, `date`, `status`),
  INDEX `idx_method` (`method`),
  INDEX `idx_user_id` (`user_id`),
  UNIQUE INDEX `idx_unique_attendance` (`school_id`, `staff_id`, `date`)
    COMMENT 'Ensure one attendance record per staff per day'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Staff attendance records with GPS tracking support';

-- =====================================================
-- 4. CREATE biometric_import_log TABLE
-- =====================================================
-- Logs biometric attendance imports from CSV/Excel files

CREATE TABLE IF NOT EXISTS `biometric_import_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NULL DEFAULT NULL,
  `import_date` DATE NOT NULL COMMENT 'Date when import was performed',
  `file_name` VARCHAR(255) NOT NULL COMMENT 'Original file name',
  `total_records` INT(11) NOT NULL DEFAULT 0 COMMENT 'Total records in file',
  `successful_imports` INT(11) NOT NULL DEFAULT 0 COMMENT 'Successfully imported records',
  `failed_imports` INT(11) NOT NULL DEFAULT 0 COMMENT 'Failed import records',
  `error_log` TEXT NULL DEFAULT NULL COMMENT 'JSON array of errors',
  `imported_by` INT(11) NOT NULL COMMENT 'User ID who performed the import',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_school_import_date` (`school_id`, `import_date`),
  INDEX `idx_imported_by` (`imported_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Logs biometric attendance data imports';

-- =====================================================
-- 5. CREATE staff_attendance_summary TABLE (OPTIONAL)
-- =====================================================
-- Pre-calculated attendance summary for faster reporting
-- This can be populated via a scheduled job or trigger

CREATE TABLE IF NOT EXISTS `staff_attendance_summary` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `staff_id` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NULL DEFAULT NULL,
  `month` TINYINT(2) NOT NULL COMMENT 'Month (1-12)',
  `year` YEAR NOT NULL COMMENT 'Year',
  `total_present` INT(11) NOT NULL DEFAULT 0,
  `total_late` INT(11) NOT NULL DEFAULT 0,
  `total_absent` INT(11) NOT NULL DEFAULT 0,
  `total_half_day` INT(11) NOT NULL DEFAULT 0,
  `total_leave` INT(11) NOT NULL DEFAULT 0,
  `working_days` INT(11) NOT NULL DEFAULT 0 COMMENT 'Total working days in month',
  `attendance_percentage` DECIMAL(5, 2) NULL DEFAULT NULL COMMENT 'Percentage of days present',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_unique_summary` (`school_id`, `staff_id`, `year`, `month`),
  INDEX `idx_school_month` (`school_id`, `year`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Monthly attendance summary for staff';

-- =====================================================
-- 6. SAMPLE DATA FOR TESTING (OPTIONAL - COMMENT OUT IN PRODUCTION)
-- =====================================================
-- Uncomment the following lines to add sample GPS coordinates for testing

/*
-- Update a sample school to enable GPS attendance
UPDATE `school_setup`
SET `staff_login_system` = 1
WHERE `school_id` = 'YOUR_TEST_SCHOOL_ID'
LIMIT 1;

-- Add GPS coordinates to a sample branch
UPDATE `school_locations`
SET
  `latitude` = 9.0820,     -- Sample: Abuja, Nigeria
  `longitude` = 7.5324,
  `gps_radius` = 100       -- 100 meters radius
WHERE `school_id` = 'YOUR_TEST_SCHOOL_ID'
  AND `branch_id` = 'YOUR_TEST_BRANCH_ID'
LIMIT 1;
*/

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration was successful

-- Check if columns were added to school_locations
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'school_locations'
  AND COLUMN_NAME IN ('latitude', 'longitude', 'gps_radius');

-- Check if column was added to school_setup
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'school_setup'
  AND COLUMN_NAME = 'staff_login_system';

-- Check if staff_attendance table was created
SHOW TABLES LIKE 'staff_attendance';

-- Check staff_attendance table structure
DESCRIBE staff_attendance;

-- Check biometric_import_log table
SHOW TABLES LIKE 'biometric_import_log';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Update GPS coordinates for your school branches
-- 2. Enable GPS attendance for test schools (staff_login_system = 1)
-- 3. Test the login flow with GPS coordinates from frontend
-- 4. Monitor the staff_attendance table for new records
-- =====================================================
