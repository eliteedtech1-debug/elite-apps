-- =====================================================
-- GPS-Based Staff Attendance System Migration
-- =====================================================
-- This migration adds GPS attendance functionality to the system
-- It creates the staff_attendance table and adds GPS-related columns
-- to school_locations table (for branch-specific GPS coordinates)
-- and school_setup table (for school-wide GPS attendance setting).
-- 
-- Compatible with MySQL 5.7+ and MariaDB 10.2+
-- =====================================================

-- =====================================================
-- STEP 1: Add GPS columns to school_locations table
-- =====================================================
-- These columns store each branch's GPS coordinates and attendance settings
-- Note: GPS coordinates are per branch since branches can be in different locations

-- Check if latitude column exists, if not add it
SET @dbname = DATABASE();
SET @tablename = 'school_locations';
SET @columnname = 'latitude';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` DECIMAL(10, 8) NULL COMMENT ''Branch GPS latitude coordinate'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check if longitude column exists, if not add it
SET @columnname = 'longitude';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` DECIMAL(11, 8) NULL COMMENT ''Branch GPS longitude coordinate'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check if gps_radius column exists, if not add it
SET @columnname = 'gps_radius';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` INT DEFAULT 80 COMMENT ''Allowed radius in meters for GPS attendance (default: 80m)'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- STEP 2: Add GPS setting to school_setup table
-- =====================================================
-- This is a school-wide setting to enable/disable GPS attendance

SET @tablename = 'school_setup';
SET @columnname = 'staff_login_system';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` TINYINT(1) DEFAULT 0 COMMENT ''0=Normal login, 1=GPS-based attendance login'';')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- STEP 3: Create staff_attendance table
-- =====================================================
-- This table stores daily attendance records for staff members

CREATE TABLE IF NOT EXISTS `staff_attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `staff_id` VARCHAR(50) NOT NULL COMMENT 'Staff ID from staff table',
  `user_id` INT NULL COMMENT 'User ID from users table (optional reference)',
  `school_id` VARCHAR(50) NOT NULL COMMENT 'School ID',
  `branch_id` VARCHAR(50) NULL COMMENT 'Branch ID (from school_locations)',
  `date` DATE NOT NULL COMMENT 'Attendance date',
  `check_in_time` DATETIME NOT NULL COMMENT 'Check-in timestamp',
  `check_out_time` DATETIME NULL COMMENT 'Check-out timestamp (optional)',
  `method` ENUM('GPS', 'Manual', 'Biometric', 'Import') DEFAULT 'GPS' 
    COMMENT 'Attendance marking method',
  `gps_lat` DECIMAL(10, 8) NULL COMMENT 'GPS latitude at check-in',
  `gps_lon` DECIMAL(11, 8) NULL COMMENT 'GPS longitude at check-in',
  `distance_from_branch` INT NULL COMMENT 'Distance from branch in meters',
  `status` ENUM('Present', 'Late', 'Absent', 'Half-Day', 'Leave') DEFAULT 'Present'
    COMMENT 'Attendance status',
  `remarks` TEXT NULL COMMENT 'Additional notes or remarks',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT NULL COMMENT 'User ID who created the record',
  `updated_by` INT NULL COMMENT 'User ID who last updated the record',
  
  -- Indexes for performance
  INDEX `idx_staff_date` (`staff_id`, `date`),
  INDEX `idx_school_date` (`school_id`, `date`),
  INDEX `idx_branch_date` (`branch_id`, `date`),
  INDEX `idx_method` (`method`),
  INDEX `idx_status` (`status`),
  
  -- Unique constraint: One attendance record per staff per day per branch
  UNIQUE KEY `unique_staff_date_branch` (`staff_id`, `date`, `school_id`, `branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Staff daily attendance records with GPS tracking support';

-- =====================================================
-- STEP 4: Create biometric_import_log table
-- =====================================================
-- This table logs all biometric attendance imports for audit purposes

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

-- =====================================================
-- STEP 5: Create view for attendance dashboard
-- =====================================================

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
-- STEP 6: Sample configuration (OPTIONAL - for testing)
-- =====================================================
-- Uncomment and modify these queries to configure GPS attendance

-- Example 1: Enable GPS attendance for a school
-- UPDATE `school_setup` 
-- SET `staff_login_system` = 1
-- WHERE `school_id` = 'YOUR_SCHOOL_ID';

-- Example 2: Set GPS coordinates for Main Branch
-- UPDATE `school_locations` 
-- SET 
--   `latitude` = 9.0820,      -- Abuja, Nigeria (example)
--   `longitude` = 7.5340,
--   `gps_radius` = 100         -- 100 meters radius
-- WHERE `school_id` = 'YOUR_SCHOOL_ID' AND `branch_id` = 'MAIN';

-- Example 3: Set GPS coordinates for Secondary Branch
-- UPDATE `school_locations` 
-- SET 
--   `latitude` = 9.1500,      -- Different location
--   `longitude` = 7.6000,
--   `gps_radius` = 80          -- 80 meters radius
-- WHERE `school_id` = 'YOUR_SCHOOL_ID' AND `branch_id` = 'SEC';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the migration was successful

-- Check if columns were added to school_locations
-- SELECT 
--   COLUMN_NAME, 
--   DATA_TYPE, 
--   COLUMN_DEFAULT, 
--   COLUMN_COMMENT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'school_locations'
--   AND COLUMN_NAME IN ('latitude', 'longitude', 'gps_radius');

-- Check if column was added to school_setup
-- SELECT 
--   COLUMN_NAME, 
--   DATA_TYPE, 
--   COLUMN_DEFAULT, 
--   COLUMN_COMMENT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'school_setup'
--   AND COLUMN_NAME = 'staff_login_system';

-- Check if tables were created
-- SHOW TABLES LIKE 'staff_attendance';
-- SHOW TABLES LIKE 'biometric_import_log';

-- Check if view was created
-- SHOW CREATE VIEW staff_attendance_summary;

-- =====================================================
-- Migration Complete! ✅
-- =====================================================
-- 
-- NEXT STEPS:
-- 
-- 1. Configure GPS coordinates for each branch:
--    UPDATE school_locations 
--    SET latitude = [LAT], longitude = [LON], gps_radius = [RADIUS]
--    WHERE school_id = 'XXX' AND branch_id = 'YYY';
--
-- 2. Enable GPS attendance for schools:
--    UPDATE school_setup 
--    SET staff_login_system = 1
--    WHERE school_id = 'XXX';
--
-- 3. Test GPS login with staff accounts
--
-- 4. Import historical biometric data (optional)
--
-- IMPORTANT NOTES:
-- ✓ GPS coordinates are stored per branch in school_locations table
-- ✓ Each branch can have different GPS coordinates and radius
-- ✓ staff_login_system is a school-wide setting in school_setup
-- ✓ selected_branch from store.auth determines which branch's GPS to use
-- ✓ When staff logs in, the system will:
--   1. Get selected_branch from auth context (user.branch_id)
--   2. Fetch GPS coordinates from school_locations for that branch
--   3. Validate staff location against branch GPS coordinates
--   4. Mark attendance for that specific branch
--
-- TROUBLESHOOTING:
-- - If columns already exist, they will be skipped (no error)
-- - If tables already exist, they will be skipped (no error)
-- - Check verification queries above to confirm migration
-- - Review error log if any issues occur
--
-- =====================================================
