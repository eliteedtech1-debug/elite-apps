-- =====================================================
-- Student ID Card Generator - Database Rollback Script
-- Phase 1 Deployment - Emergency Rollback
-- =====================================================

-- Create rollback log entry
INSERT INTO migration_log (migration_name, executed_at, status, notes) 
VALUES ('id_card_rollback', NOW(), 'started', 'Rolling back ID Card Generator Phase 1')
ON DUPLICATE KEY UPDATE executed_at = NOW(), status = 'started';

-- Backup existing data before rollback (if tables exist)
SET @backup_timestamp = DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s');

-- Create backup tables if original tables exist
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = DATABASE() AND table_name = 'generated_id_cards') > 0,
  CONCAT('CREATE TABLE generated_id_cards_backup_', @backup_timestamp, ' AS SELECT * FROM generated_id_cards;'),
  'SELECT "No generated_id_cards table to backup" as message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = DATABASE() AND table_name = 'template_audit_log') > 0,
  CONCAT('CREATE TABLE template_audit_log_backup_', @backup_timestamp, ' AS SELECT * FROM template_audit_log;'),
  'SELECT "No template_audit_log table to backup" as message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = DATABASE() AND table_name = 'template_elements') > 0,
  CONCAT('CREATE TABLE template_elements_backup_', @backup_timestamp, ' AS SELECT * FROM template_elements;'),
  'SELECT "No template_elements table to backup" as message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = DATABASE() AND table_name = 'school_branding') > 0,
  CONCAT('CREATE TABLE school_branding_backup_', @backup_timestamp, ' AS SELECT * FROM school_branding;'),
  'SELECT "No school_branding table to backup" as message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = DATABASE() AND table_name = 'id_card_templates') > 0,
  CONCAT('CREATE TABLE id_card_templates_backup_', @backup_timestamp, ' AS SELECT * FROM id_card_templates;'),
  'SELECT "No id_card_templates table to backup" as message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop stored procedures
DROP PROCEDURE IF EXISTS GetActiveTemplate;
DROP PROCEDURE IF EXISTS GenerateCardNumber;

-- Drop tables in correct order (respecting foreign key constraints)
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS template_audit_log;
DROP TABLE IF EXISTS generated_id_cards;
DROP TABLE IF EXISTS template_elements;
DROP TABLE IF EXISTS school_branding;
DROP TABLE IF EXISTS id_card_templates;

SET FOREIGN_KEY_CHECKS = 1;

-- Remove any ID Card related menu items (if RBAC system exists)
DELETE FROM menu_items WHERE menu_key LIKE 'id_card%' OR menu_key LIKE 'id-card%';
DELETE FROM role_permissions WHERE permission_key LIKE 'id_card%' OR permission_key LIKE 'id-card%';

-- Clean up any ID Card related configuration
DELETE FROM system_settings WHERE setting_key LIKE 'id_card%' OR setting_key LIKE 'id-card%';

-- Update rollback log
UPDATE migration_log 
SET status = 'completed', notes = CONCAT(notes, ' - Rollback completed successfully at ', NOW())
WHERE migration_name = 'id_card_rollback';

-- Final verification
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: All ID Card tables have been removed'
    ELSE CONCAT('WARNING: ', COUNT(*), ' ID Card tables still exist')
  END as rollback_status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name IN ('id_card_templates', 'template_elements', 'school_branding', 'generated_id_cards', 'template_audit_log');

-- Show backup tables created
SELECT 
  table_name as backup_table_created,
  table_rows as rows_backed_up,
  create_time as backup_created_at
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name LIKE CONCAT('%_backup_', @backup_timestamp)
ORDER BY table_name;

SELECT CONCAT('Rollback completed at: ', NOW()) as completion_message;