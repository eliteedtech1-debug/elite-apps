-- =====================================================
-- ADMISSION MODULE - ROLLBACK SCRIPT
-- =====================================================
-- Version: 1.0
-- Date: 2025-12-13
-- Description: Complete rollback for admission module migration
-- 
-- WARNING: This script will remove all admission module enhancements
-- Use only in case of critical issues requiring rollback
-- =====================================================

-- Start transaction for atomic rollback
START TRANSACTION;

-- =====================================================
-- 1. LOG ROLLBACK INITIATION
-- =====================================================

INSERT INTO admission_audit_log (
  action, resource_type, resource_id, 
  new_values, school_id, branch_id
) VALUES (
  'ROLLBACK_START', 'database', 'admission_module',
  JSON_OBJECT(
    'rollback_version', '1.0',
    'rollback_date', NOW(),
    'reason', 'Manual rollback initiated'
  ),
  'SYSTEM', 'SYSTEM'
);

-- =====================================================
-- 2. DROP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS `tr_admission_tokens_audit`;
DROP TRIGGER IF EXISTS `tr_school_applicants_status_audit`;

-- =====================================================
-- 3. DROP VIEWS
-- =====================================================

DROP VIEW IF EXISTS `v_admission_statistics`;
DROP VIEW IF EXISTS `v_token_statistics`;

-- =====================================================
-- 4. DROP STORED PROCEDURES
-- =====================================================

DROP PROCEDURE IF EXISTS `validate_and_use_admission_token`;
DROP PROCEDURE IF EXISTS `cleanup_expired_admission_tokens`;

-- =====================================================
-- 5. REMOVE ADDED COLUMNS FROM SCHOOL_APPLICANTS
-- =====================================================

-- Remove admission_token_used column
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND column_name = 'admission_token_used') > 0,
  'ALTER TABLE school_applicants DROP COLUMN admission_token_used',
  'SELECT "Column admission_token_used does not exist"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove payment_reference column
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND column_name = 'payment_reference') > 0,
  'ALTER TABLE school_applicants DROP COLUMN payment_reference',
  'SELECT "Column payment_reference does not exist"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove access_method column
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND column_name = 'access_method') > 0,
  'ALTER TABLE school_applicants DROP COLUMN access_method',
  'SELECT "Column access_method does not exist"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 6. DROP INDEXES FROM SCHOOL_APPLICANTS
-- =====================================================

-- Drop school_branch index
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND index_name = 'idx_school_applicants_school_branch') > 0,
  'DROP INDEX idx_school_applicants_school_branch ON school_applicants',
  'SELECT "Index idx_school_applicants_school_branch does not exist"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop status index
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND index_name = 'idx_school_applicants_status') > 0,
  'DROP INDEX idx_school_applicants_status ON school_applicants',
  'SELECT "Index idx_school_applicants_status does not exist"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop academic_year index
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE table_schema = DATABASE() 
   AND table_name = 'school_applicants' 
   AND index_name = 'idx_school_applicants_academic_year') > 0,
  'DROP INDEX idx_school_applicants_academic_year ON school_applicants',
  'SELECT "Index idx_school_applicants_academic_year does not exist"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 7. BACKUP AND DROP NEW TABLES
-- =====================================================

-- Create backup tables before dropping (optional)
CREATE TABLE IF NOT EXISTS `admission_tokens_backup` AS SELECT * FROM `admission_tokens`;
CREATE TABLE IF NOT EXISTS `admission_audit_log_backup` AS SELECT * FROM `admission_audit_log`;
CREATE TABLE IF NOT EXISTS `school_admission_settings_backup` AS SELECT * FROM `school_admission_settings`;
CREATE TABLE IF NOT EXISTS `admission_workflow_history_backup` AS SELECT * FROM `admission_workflow_history`;

-- Drop the new tables
DROP TABLE IF EXISTS `admission_workflow_history`;
DROP TABLE IF EXISTS `school_admission_settings`;
DROP TABLE IF EXISTS `admission_audit_log`;
DROP TABLE IF EXISTS `admission_tokens`;

-- =====================================================
-- 8. VALIDATION QUERIES
-- =====================================================

-- Verify tables were dropped
SELECT 
  'DROPPED TABLES CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All new tables dropped'
    ELSE CONCAT('WARNING: ', COUNT(*), ' tables still exist')
  END as result
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN (
    'admission_tokens', 
    'admission_audit_log', 
    'school_admission_settings',
    'admission_workflow_history'
  );

-- Verify indexes were dropped
SELECT 
  'DROPPED INDEXES CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All new indexes dropped'
    ELSE CONCAT('WARNING: ', COUNT(*), ' indexes still exist')
  END as result
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'school_applicants'
  AND INDEX_NAME IN (
    'idx_school_applicants_school_branch',
    'idx_school_applicants_status',
    'idx_school_applicants_academic_year'
  );

-- Verify columns were removed
SELECT 
  'DROPPED COLUMNS CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All new columns dropped'
    ELSE CONCAT('WARNING: ', COUNT(*), ' columns still exist')
  END as result
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'school_applicants'
  AND COLUMN_NAME IN ('admission_token_used', 'payment_reference', 'access_method');

-- Verify stored procedures were dropped
SELECT 
  'DROPPED PROCEDURES CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All procedures dropped'
    ELSE CONCAT('WARNING: ', COUNT(*), ' procedures still exist')
  END as result
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = DATABASE() 
  AND ROUTINE_NAME LIKE '%admission_token%';

-- Verify views were dropped
SELECT 
  'DROPPED VIEWS CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All views dropped'
    ELSE CONCAT('WARNING: ', COUNT(*), ' views still exist')
  END as result
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'v_%admission%';

-- Verify triggers were dropped
SELECT 
  'DROPPED TRIGGERS CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All triggers dropped'
    ELSE CONCAT('WARNING: ', COUNT(*), ' triggers still exist')
  END as result
FROM INFORMATION_SCHEMA.TRIGGERS 
WHERE TRIGGER_SCHEMA = DATABASE() 
  AND TRIGGER_NAME LIKE '%admission%';

-- =====================================================
-- 9. LOG ROLLBACK COMPLETION
-- =====================================================

-- Note: This will fail if admission_audit_log was dropped, which is expected
-- INSERT INTO admission_audit_log (
--   action, resource_type, resource_id, 
--   new_values, school_id, branch_id
-- ) VALUES (
--   'ROLLBACK_COMPLETE', 'database', 'admission_module',
--   JSON_OBJECT(
--     'rollback_version', '1.0',
--     'rollback_date', NOW(),
--     'status', 'completed'
--   ),
--   'SYSTEM', 'SYSTEM'
-- );

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

-- Commit the rollback transaction
COMMIT;

SELECT 'ADMISSION MODULE ROLLBACK COMPLETED SUCCESSFULLY' as status;

-- =====================================================
-- POST-ROLLBACK INSTRUCTIONS
-- =====================================================

/*
POST-ROLLBACK CHECKLIST:

1. VERIFY APPLICATION FUNCTIONALITY:
   - Test existing admission workflows
   - Verify school_applicants table integrity
   - Check stored procedure functionality

2. BACKUP TABLE CLEANUP (Optional):
   - Review backup tables created during rollback
   - Drop backup tables if rollback was successful:
     DROP TABLE IF EXISTS admission_tokens_backup;
     DROP TABLE IF EXISTS admission_audit_log_backup;
     DROP TABLE IF EXISTS school_admission_settings_backup;
     DROP TABLE IF EXISTS admission_workflow_history_backup;

3. APPLICATION CODE ROLLBACK:
   - Remove or disable admission token API endpoints
   - Revert frontend components to previous versions
   - Update application configuration

4. MONITORING:
   - Monitor application logs for errors
   - Check database performance
   - Verify user functionality

5. COMMUNICATION:
   - Notify stakeholders of rollback completion
   - Document rollback reason and resolution
   - Plan for future deployment if needed

ROLLBACK VERIFICATION QUERIES:

-- Check school_applicants table structure
DESCRIBE school_applicants;

-- Verify existing data integrity
SELECT COUNT(*) as total_applications FROM school_applicants;

-- Check for any remaining admission module artifacts
SHOW TABLES LIKE '%admission%';
SHOW PROCEDURE STATUS WHERE Name LIKE '%admission%';
SHOW TRIGGERS LIKE '%admission%';

*/

-- =====================================================
-- END OF ROLLBACK SCRIPT
-- =====================================================
