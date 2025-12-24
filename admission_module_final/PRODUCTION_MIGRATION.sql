-- =====================================================
-- ADMISSION MODULE - PRODUCTION MIGRATION SCRIPT
-- =====================================================
-- Version: 1.0
-- Date: 2025-12-13
-- Description: Complete migration for admission module with token system
-- 
-- IMPORTANT: This script is designed for ZERO DOWNTIME deployment
-- All changes are additive and backward compatible
-- =====================================================

-- Start transaction for atomic migration
START TRANSACTION;

-- =====================================================
-- 1. CREATE ADMISSION TOKENS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `admission_tokens` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `token_code` VARCHAR(50) NOT NULL,
  `school_id` VARCHAR(20) NOT NULL,
  `branch_id` VARCHAR(20) NOT NULL,
  `usage_limit` INT(11) NOT NULL DEFAULT 1,
  `used_count` INT(11) NOT NULL DEFAULT 0,
  `expires_at` DATETIME NULL DEFAULT NULL,
  `status` ENUM('active', 'used', 'expired', 'disabled') NOT NULL DEFAULT 'active',
  `created_by` INT(11) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admission_tokens_code` (`token_code`),
  KEY `idx_admission_tokens_school_branch` (`school_id`, `branch_id`),
  KEY `idx_admission_tokens_status` (`status`),
  KEY `idx_admission_tokens_expires` (`expires_at`),
  KEY `idx_admission_tokens_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. ADD INDEXES TO EXISTING SCHOOL_APPLICANTS TABLE
-- =====================================================

-- Add indexes for performance optimization (if not exists)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND index_name = 'idx_school_applicants_school_branch') = 0,
  'CREATE INDEX idx_school_applicants_school_branch ON school_applicants(school_id, branch_id)',
  'SELECT "Index idx_school_applicants_school_branch already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND index_name = 'idx_school_applicants_status') = 0,
  'CREATE INDEX idx_school_applicants_status ON school_applicants(status)',
  'SELECT "Index idx_school_applicants_status already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND index_name = 'idx_school_applicants_academic_year') = 0,
  'CREATE INDEX idx_school_applicants_academic_year ON school_applicants(academic_year)',
  'SELECT "Index idx_school_applicants_academic_year already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. ADD OPTIONAL COLUMNS TO SCHOOL_APPLICANTS
-- =====================================================

-- Add token reference column (optional, for audit trail)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND column_name = 'admission_token_used') = 0,
  'ALTER TABLE school_applicants ADD COLUMN admission_token_used VARCHAR(50) NULL DEFAULT NULL',
  'SELECT "Column admission_token_used already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add payment reference column (optional, for payment tracking)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND column_name = 'payment_reference') = 0,
  'ALTER TABLE school_applicants ADD COLUMN payment_reference VARCHAR(100) NULL DEFAULT NULL',
  'SELECT "Column payment_reference already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add access method tracking (optional, for analytics)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND column_name = 'access_method') = 0,
  'ALTER TABLE school_applicants ADD COLUMN access_method ENUM("free", "token", "payment") NULL DEFAULT NULL',
  'SELECT "Column access_method already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 4. CREATE ADMISSION AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `admission_audit_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NULL DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `resource_type` VARCHAR(50) NOT NULL,
  `resource_id` VARCHAR(50) NOT NULL,
  `old_values` JSON NULL DEFAULT NULL,
  `new_values` JSON NULL DEFAULT NULL,
  `school_id` VARCHAR(20) NOT NULL,
  `branch_id` VARCHAR(20) NOT NULL,
  `ip_address` VARCHAR(45) NULL DEFAULT NULL,
  `user_agent` TEXT NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_log_user` (`user_id`),
  KEY `idx_audit_log_resource` (`resource_type`, `resource_id`),
  KEY `idx_audit_log_school_branch` (`school_id`, `branch_id`),
  KEY `idx_audit_log_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. CREATE SCHOOL ADMISSION SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `school_admission_settings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(20) NOT NULL,
  `branch_id` VARCHAR(20) NOT NULL,
  `access_mode` ENUM('FREE', 'TOKEN_REQUIRED', 'PAYMENT_REQUIRED', 'TOKEN_OR_PAYMENT') NOT NULL DEFAULT 'FREE',
  `application_fee` DECIMAL(10,2) NULL DEFAULT NULL,
  `exam_fee` DECIMAL(10,2) NULL DEFAULT NULL,
  `acceptance_fee` DECIMAL(10,2) NULL DEFAULT NULL,
  `academic_year` VARCHAR(20) NOT NULL,
  `admission_start_date` DATE NULL DEFAULT NULL,
  `admission_end_date` DATE NULL DEFAULT NULL,
  `max_applications_per_class` INT(11) NULL DEFAULT NULL,
  `auto_generate_admission_no` BOOLEAN NOT NULL DEFAULT TRUE,
  `require_entrance_exam` BOOLEAN NOT NULL DEFAULT FALSE,
  `settings_json` JSON NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admission_settings_school_branch_year` (`school_id`, `branch_id`, `academic_year`),
  KEY `idx_admission_settings_school_branch` (`school_id`, `branch_id`),
  KEY `idx_admission_settings_academic_year` (`academic_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. CREATE ADMISSION WORKFLOW HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS `admission_workflow_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `application_id` INT(11) NOT NULL,
  `from_status` VARCHAR(50) NULL DEFAULT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `action_by` INT(11) NULL DEFAULT NULL,
  `action_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `comments` TEXT NULL DEFAULT NULL,
  `workflow_data` JSON NULL DEFAULT NULL,
  `school_id` VARCHAR(20) NOT NULL,
  `branch_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_workflow_history_application` (`application_id`),
  KEY `idx_workflow_history_status` (`to_status`),
  KEY `idx_workflow_history_action_by` (`action_by`),
  KEY `idx_workflow_history_school_branch` (`school_id`, `branch_id`),
  KEY `idx_workflow_history_date` (`action_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. INSERT DEFAULT ADMISSION SETTINGS
-- =====================================================

-- Insert default settings for existing schools (if any)
INSERT IGNORE INTO `school_admission_settings` 
  (`school_id`, `branch_id`, `access_mode`, `academic_year`, `auto_generate_admission_no`, `require_entrance_exam`)
SELECT DISTINCT 
  `school_id`, 
  `branch_id`, 
  'FREE' as access_mode,
  COALESCE(`academic_year`, YEAR(CURDATE())) as academic_year,
  TRUE as auto_generate_admission_no,
  FALSE as require_entrance_exam
FROM `school_applicants` 
WHERE `school_id` IS NOT NULL 
  AND `branch_id` IS NOT NULL
  AND `school_id` != ''
  AND `branch_id` != '';

-- =====================================================
-- 8. CREATE STORED PROCEDURES FOR TOKEN MANAGEMENT
-- =====================================================

DELIMITER $$

-- Procedure to validate and use admission token
DROP PROCEDURE IF EXISTS `validate_and_use_admission_token`$$
CREATE PROCEDURE `validate_and_use_admission_token`(
  IN p_token_code VARCHAR(50),
  IN p_school_id VARCHAR(20),
  IN p_branch_id VARCHAR(20),
  OUT p_valid BOOLEAN,
  OUT p_message VARCHAR(255)
)
BEGIN
  DECLARE v_token_id INT DEFAULT NULL;
  DECLARE v_usage_limit INT DEFAULT 0;
  DECLARE v_used_count INT DEFAULT 0;
  DECLARE v_expires_at DATETIME DEFAULT NULL;
  DECLARE v_status VARCHAR(20) DEFAULT NULL;
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_valid = FALSE;
    SET p_message = 'Database error occurred';
  END;
  
  START TRANSACTION;
  
  -- Get token details with row lock
  SELECT id, usage_limit, used_count, expires_at, status
  INTO v_token_id, v_usage_limit, v_used_count, v_expires_at, v_status
  FROM admission_tokens 
  WHERE token_code = p_token_code 
    AND school_id = p_school_id 
    AND branch_id = p_branch_id
  FOR UPDATE;
  
  -- Check if token exists
  IF v_token_id IS NULL THEN
    SET p_valid = FALSE;
    SET p_message = 'Invalid token';
    ROLLBACK;
  -- Check if token is active
  ELSEIF v_status != 'active' THEN
    SET p_valid = FALSE;
    SET p_message = CONCAT('Token is ', v_status);
    ROLLBACK;
  -- Check if token has expired
  ELSEIF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    UPDATE admission_tokens SET status = 'expired' WHERE id = v_token_id;
    SET p_valid = FALSE;
    SET p_message = 'Token has expired';
    ROLLBACK;
  -- Check if token usage limit exceeded
  ELSEIF v_used_count >= v_usage_limit THEN
    UPDATE admission_tokens SET status = 'used' WHERE id = v_token_id;
    SET p_valid = FALSE;
    SET p_message = 'Token usage limit exceeded';
    ROLLBACK;
  -- Token is valid, increment usage
  ELSE
    UPDATE admission_tokens 
    SET used_count = used_count + 1,
        status = CASE WHEN used_count + 1 >= usage_limit THEN 'used' ELSE 'active' END
    WHERE id = v_token_id;
    
    SET p_valid = TRUE;
    SET p_message = 'Token used successfully';
    COMMIT;
  END IF;
  
END$$

-- Procedure to cleanup expired tokens
DROP PROCEDURE IF EXISTS `cleanup_expired_admission_tokens`$$
CREATE PROCEDURE `cleanup_expired_admission_tokens`()
BEGIN
  -- Mark expired tokens
  UPDATE admission_tokens 
  SET status = 'expired' 
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
  -- Return count of expired tokens
  SELECT ROW_COUNT() as expired_count;
END$$

DELIMITER ;

-- =====================================================
-- 9. CREATE VIEWS FOR REPORTING
-- =====================================================

-- View for admission statistics
CREATE OR REPLACE VIEW `v_admission_statistics` AS
SELECT 
  sa.school_id,
  sa.branch_id,
  sa.academic_year,
  COUNT(*) as total_applications,
  SUM(CASE WHEN sa.status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
  SUM(CASE WHEN sa.status = 'screened' THEN 1 ELSE 0 END) as screened_count,
  SUM(CASE WHEN sa.status = 'exam_scheduled' THEN 1 ELSE 0 END) as exam_scheduled_count,
  SUM(CASE WHEN sa.status = 'exam_passed' THEN 1 ELSE 0 END) as exam_passed_count,
  SUM(CASE WHEN sa.status = 'admitted' THEN 1 ELSE 0 END) as admitted_count,
  SUM(CASE WHEN sa.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
  SUM(CASE WHEN sa.access_method = 'token' THEN 1 ELSE 0 END) as token_applications,
  SUM(CASE WHEN sa.access_method = 'payment' THEN 1 ELSE 0 END) as paid_applications,
  SUM(CASE WHEN sa.access_method = 'free' THEN 1 ELSE 0 END) as free_applications
FROM school_applicants sa
GROUP BY sa.school_id, sa.branch_id, sa.academic_year;

-- View for token usage statistics
CREATE OR REPLACE VIEW `v_token_statistics` AS
SELECT 
  at.school_id,
  at.branch_id,
  COUNT(*) as total_tokens,
  SUM(CASE WHEN at.status = 'active' THEN 1 ELSE 0 END) as active_tokens,
  SUM(CASE WHEN at.status = 'used' THEN 1 ELSE 0 END) as used_tokens,
  SUM(CASE WHEN at.status = 'expired' THEN 1 ELSE 0 END) as expired_tokens,
  SUM(CASE WHEN at.status = 'disabled' THEN 1 ELSE 0 END) as disabled_tokens,
  SUM(at.used_count) as total_usage,
  AVG(at.used_count) as avg_usage_per_token
FROM admission_tokens at
GROUP BY at.school_id, at.branch_id;

-- =====================================================
-- 10. CREATE TRIGGERS FOR AUDIT LOGGING
-- =====================================================

DELIMITER $$

-- Trigger for admission token changes
DROP TRIGGER IF EXISTS `tr_admission_tokens_audit`$$
CREATE TRIGGER `tr_admission_tokens_audit`
AFTER UPDATE ON `admission_tokens`
FOR EACH ROW
BEGIN
  INSERT INTO admission_audit_log (
    action, resource_type, resource_id, 
    old_values, new_values, school_id, branch_id
  ) VALUES (
    'UPDATE', 'admission_token', NEW.id,
    JSON_OBJECT(
      'status', OLD.status,
      'used_count', OLD.used_count,
      'updated_at', OLD.updated_at
    ),
    JSON_OBJECT(
      'status', NEW.status,
      'used_count', NEW.used_count,
      'updated_at', NEW.updated_at
    ),
    NEW.school_id, NEW.branch_id
  );
END$$

-- Trigger for school applicants status changes
DROP TRIGGER IF EXISTS `tr_school_applicants_status_audit`$$
CREATE TRIGGER `tr_school_applicants_status_audit`
AFTER UPDATE ON `school_applicants`
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO admission_workflow_history (
      application_id, from_status, to_status, 
      school_id, branch_id, workflow_data
    ) VALUES (
      NEW.id, OLD.status, NEW.status,
      NEW.school_id, NEW.branch_id,
      JSON_OBJECT(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'change_timestamp', NOW()
      )
    );
  END IF;
END$$

DELIMITER ;

-- =====================================================
-- 11. GRANT PERMISSIONS (Adjust as needed)
-- =====================================================

-- Note: Adjust these permissions based on your application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON admission_tokens TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON school_applicants TO 'app_user'@'%';
-- GRANT SELECT, INSERT ON admission_audit_log TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON school_admission_settings TO 'app_user'@'%';
-- GRANT SELECT, INSERT ON admission_workflow_history TO 'app_user'@'%';
-- GRANT SELECT ON v_admission_statistics TO 'app_user'@'%';
-- GRANT SELECT ON v_token_statistics TO 'app_user'@'%';
-- GRANT EXECUTE ON PROCEDURE validate_and_use_admission_token TO 'app_user'@'%';
-- GRANT EXECUTE ON PROCEDURE cleanup_expired_admission_tokens TO 'app_user'@'%';

-- =====================================================
-- 12. VALIDATION QUERIES
-- =====================================================

-- Verify tables were created
SELECT 
  TABLE_NAME, 
  TABLE_ROWS, 
  CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN (
    'admission_tokens', 
    'admission_audit_log', 
    'school_admission_settings',
    'admission_workflow_history'
  );

-- Verify indexes were created
SELECT 
  TABLE_NAME, 
  INDEX_NAME, 
  COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('admission_tokens', 'school_applicants')
  AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME;

-- Verify columns were added to school_applicants
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'school_applicants'
  AND COLUMN_NAME IN ('admission_token_used', 'payment_reference', 'access_method');

-- Verify stored procedures were created
SELECT 
  ROUTINE_NAME, 
  ROUTINE_TYPE, 
  CREATED
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = DATABASE() 
  AND ROUTINE_NAME LIKE '%admission_token%';

-- Verify views were created
SELECT 
  TABLE_NAME, 
  VIEW_DEFINITION
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'v_%admission%';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Commit the transaction
COMMIT;

-- Log migration completion
INSERT INTO admission_audit_log (
  action, resource_type, resource_id, 
  new_values, school_id, branch_id
) VALUES (
  'MIGRATION', 'database', 'admission_module',
  JSON_OBJECT(
    'migration_version', '1.0',
    'migration_date', NOW(),
    'tables_created', JSON_ARRAY(
      'admission_tokens',
      'admission_audit_log', 
      'school_admission_settings',
      'admission_workflow_history'
    ),
    'indexes_created', JSON_ARRAY(
      'idx_admission_tokens_school_branch',
      'idx_admission_tokens_status',
      'idx_school_applicants_school_branch',
      'idx_school_applicants_status'
    )
  ),
  'SYSTEM', 'SYSTEM'
);

SELECT 'ADMISSION MODULE MIGRATION COMPLETED SUCCESSFULLY' as status;

-- =====================================================
-- END OF MIGRATION SCRIPT
-- =====================================================
