-- ============================================
-- Biometric Import System - Database Migration
-- ============================================
-- This migration adds support for importing attendance data
-- from biometric devices (fingerprint, facial recognition, card readers)
-- ============================================

-- Create biometric import history table
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
  INDEX `idx_device_type` (`device_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks biometric attendance import history';

-- Add device_id column to staff_attendance if not exists
ALTER TABLE `staff_attendance` 
ADD COLUMN IF NOT EXISTS `device_id` VARCHAR(50) DEFAULT NULL COMMENT 'Biometric device identifier'
AFTER `method`;

-- Add index for device_id
ALTER TABLE `staff_attendance` 
ADD INDEX IF NOT EXISTS `idx_device_id` (`device_id`);

-- Create uploads directory structure (to be created by application)
-- uploads/
-- └── biometric/
--     ├── fingerprint/
--     ├── facial/
--     └── card/

-- ============================================
-- Sample Data for Testing
-- ============================================

-- Insert sample import history (for testing)
INSERT INTO `biometric_import_history` 
(`school_id`, `branch_id`, `file_name`, `device_type`, `total_records`, `successful`, `failed`, `imported_by`, `status`)
VALUES
('SCH001', 'BR001', 'fingerprint_attendance_2024-12-02.csv', 'fingerprint', 50, 48, 2, 'admin', 'completed'),
('SCH001', 'BR001', 'facial_recognition_2024-12-01.xlsx', 'facial', 45, 45, 0, 'admin', 'completed'),
('SCH001', 'BR002', 'card_reader_2024-11-30.csv', 'card', 30, 28, 2, 'admin', 'partial');

-- ============================================
-- Stored Procedure: Get Import Statistics
-- ============================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_get_import_statistics`$$

CREATE PROCEDURE `sp_get_import_statistics`(
  IN p_school_id VARCHAR(50),
  IN p_branch_id VARCHAR(50),
  IN p_start_date DATE,
  IN p_end_date DATE
)
BEGIN
  SELECT 
    device_type,
    COUNT(*) as total_imports,
    SUM(total_records) as total_records,
    SUM(successful) as total_successful,
    SUM(failed) as total_failed,
    ROUND(SUM(successful) * 100.0 / NULLIF(SUM(total_records), 0), 2) as success_rate
  FROM biometric_import_history
  WHERE school_id = p_school_id
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_start_date IS NULL OR DATE(import_date) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(import_date) <= p_end_date)
  GROUP BY device_type
  ORDER BY total_imports DESC;
END$$

DELIMITER ;

-- ============================================
-- Stored Procedure: Clean Old Import Logs
-- ============================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_clean_old_import_logs`$$

CREATE PROCEDURE `sp_clean_old_import_logs`(
  IN p_days_to_keep INT
)
BEGIN
  DELETE FROM biometric_import_history
  WHERE import_date < DATE_SUB(NOW(), INTERVAL p_days_to_keep DAY)
    AND status IN ('completed', 'failed');
    
  SELECT ROW_COUNT() as deleted_records;
END$$

DELIMITER ;

-- ============================================
-- Views for Reporting
-- ============================================

-- View: Recent Import Summary
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

-- View: Device Type Statistics
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

-- ============================================
-- Triggers
-- ============================================

-- Trigger: Update import statistics after insert
DELIMITER $$

DROP TRIGGER IF EXISTS `trg_after_import_insert`$$

CREATE TRIGGER `trg_after_import_insert`
AFTER INSERT ON `biometric_import_history`
FOR EACH ROW
BEGIN
  -- Log the import event (optional - can be used for audit)
  -- INSERT INTO audit_log (table_name, action, record_id, user_id, created_at)
  -- VALUES ('biometric_import_history', 'INSERT', NEW.id, NEW.imported_by, NOW());
  
  -- Update school statistics (if you have a school_statistics table)
  -- UPDATE school_statistics 
  -- SET total_biometric_imports = total_biometric_imports + 1
  -- WHERE school_id = NEW.school_id;
  
  NULL; -- Placeholder for future logic
END$$

DELIMITER ;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Composite index for common queries
ALTER TABLE `biometric_import_history`
ADD INDEX `idx_school_branch_date` (`school_id`, `branch_id`, `import_date`);

-- Index for status filtering
ALTER TABLE `biometric_import_history`
ADD INDEX `idx_status_date` (`status`, `import_date`);

-- ============================================
-- Grants (if using separate database user)
-- ============================================

-- GRANT SELECT, INSERT, UPDATE ON biometric_import_history TO 'app_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE sp_get_import_statistics TO 'app_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE sp_clean_old_import_logs TO 'app_user'@'localhost';

-- ============================================
-- Migration Complete
-- ============================================

SELECT 'Biometric Import System migration completed successfully!' as status;
