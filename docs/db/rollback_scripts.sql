-- =====================================================
-- ADMISSION MODULE ROLLBACK SCRIPTS
-- Date: 2025-12-13
-- Purpose: Rollback normalization changes if needed
-- WARNING: This will remove all normalized data!
-- =====================================================

-- Set session variables for safety
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

-- =====================================================
-- EMERGENCY ROLLBACK PROCEDURE
-- =====================================================

-- Log rollback start
INSERT INTO migration_log (migration_name, phase, status, started_at) 
VALUES ('admission_module_rollback', 'start', 'started', NOW());

-- =====================================================
-- STEP 1: DROP FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop foreign keys from school_applicants (if they exist)
SET @sql = (SELECT CONCAT('ALTER TABLE school_applicants DROP FOREIGN KEY ', CONSTRAINT_NAME, ';')
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'school_applicants' 
            AND CONSTRAINT_NAME = 'fk_primary_guardian');
            
PREPARE stmt FROM COALESCE(@sql, 'SELECT "No fk_primary_guardian constraint found"');
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT CONCAT('ALTER TABLE school_applicants DROP FOREIGN KEY ', CONSTRAINT_NAME, ';')
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'school_applicants' 
            AND CONSTRAINT_NAME = 'fk_primary_parent');
            
PREPARE stmt FROM COALESCE(@sql, 'SELECT "No fk_primary_parent constraint found"');
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop foreign keys from new tables
ALTER TABLE admission_guardians DROP FOREIGN KEY IF EXISTS fk_guardian_applicant;
ALTER TABLE admission_parents DROP FOREIGN KEY IF EXISTS fk_parent_applicant;
ALTER TABLE admission_documents DROP FOREIGN KEY IF EXISTS fk_document_applicant;
ALTER TABLE admission_status_history DROP FOREIGN KEY IF EXISTS fk_status_applicant;

-- Log step completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_rollback', 'drop_constraints', 'completed', NOW(), NOW());

-- =====================================================
-- STEP 2: DROP NEW COLUMNS FROM school_applicants
-- =====================================================

-- Drop new columns added during migration
ALTER TABLE school_applicants 
DROP COLUMN IF EXISTS primary_guardian_id,
DROP COLUMN IF EXISTS primary_parent_id,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS updated_by;

-- Log step completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_rollback', 'drop_columns', 'completed', NOW(), NOW());

-- =====================================================
-- STEP 3: RESTORE ORIGINAL COLUMN NAMES
-- =====================================================

-- Restore original column names (if they were changed)
-- Note: Only run these if the columns were actually renamed during migration

-- Check if columns exist before attempting to rename
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'school_applicants' 
                   AND COLUMN_NAME = 'last_school_attended');

-- Restore typo if it was fixed
IF @col_exists > 0 THEN
    ALTER TABLE school_applicants 
    CHANGE COLUMN last_school_attended last_school_atterded VARCHAR(255);
END IF;

-- Note: Uncomment these if column renames were applied during migration
-- ALTER TABLE school_applicants 
-- CHANGE COLUMN local_government_area l_g_a VARCHAR(100),
-- CHANGE COLUMN gender sex VARCHAR(10),
-- CHANGE COLUMN other_subjects others VARCHAR(100);

-- Log step completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_rollback', 'restore_columns', 'completed', NOW(), NOW());

-- =====================================================
-- STEP 4: DROP INDEXES ADDED DURING MIGRATION
-- =====================================================

-- Drop indexes that were added during migration
DROP INDEX IF EXISTS idx_school_branch ON school_applicants;
DROP INDEX IF EXISTS idx_applicant_id ON school_applicants;
DROP INDEX IF EXISTS idx_status ON school_applicants;
DROP INDEX IF EXISTS idx_academic_year ON school_applicants;
DROP INDEX IF EXISTS idx_admission_no ON school_applicants;

-- Log step completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_rollback', 'drop_indexes', 'completed', NOW(), NOW());

-- =====================================================
-- STEP 5: DROP NEW TABLES
-- =====================================================

-- Drop all new tables created during migration
DROP TABLE IF EXISTS admission_status_history;
DROP TABLE IF EXISTS admission_documents;
DROP TABLE IF EXISTS admission_parents;
DROP TABLE IF EXISTS admission_guardians;

-- Log step completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_rollback', 'drop_tables', 'completed', NOW(), NOW());

-- =====================================================
-- STEP 6: RESTORE FROM BACKUP (OPTIONAL)
-- =====================================================

-- WARNING: This will completely replace current data with backup
-- Only uncomment if you want to restore ALL data from backup

/*
-- Verify backup exists
SELECT COUNT(*) as backup_record_count FROM school_applicants_backup;

-- Clear current table
TRUNCATE TABLE school_applicants;

-- Restore from backup
INSERT INTO school_applicants 
SELECT * FROM school_applicants_backup;

-- Verify restoration
SELECT 
    (SELECT COUNT(*) FROM school_applicants) as current_count,
    (SELECT COUNT(*) FROM school_applicants_backup) as backup_count;
*/

-- Log step completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_rollback', 'backup_restore', 'skipped', NOW(), NOW());

-- =====================================================
-- STEP 7: VALIDATION AFTER ROLLBACK
-- =====================================================

-- Check table structure is back to original
SELECT 'Rollback Validation' as check_type;

-- Verify school_applicants structure
SELECT 
    'school_applicants columns' as check_name,
    COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'school_applicants';

-- Verify new tables are gone
SELECT 
    'Remaining new tables' as check_name,
    COUNT(*) as table_count
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('admission_guardians', 'admission_parents', 'admission_documents', 'admission_status_history');

-- Check data count
SELECT 
    'Total applicants after rollback' as check_name,
    COUNT(*) as count
FROM school_applicants;

-- Check for any remaining foreign keys
SELECT 
    'Remaining foreign keys' as check_name,
    COUNT(*) as count
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'school_applicants' 
AND CONSTRAINT_NAME LIKE 'fk_%';

-- =====================================================
-- STEP 8: CLEANUP BACKUP TABLE (OPTIONAL)
-- =====================================================

-- WARNING: Only run this if you're sure rollback was successful
-- and you no longer need the backup

/*
DROP TABLE IF EXISTS school_applicants_backup;
*/

-- Log step completion
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_rollback', 'cleanup', 'skipped', NOW(), NOW());

-- =====================================================
-- RESTORE SESSION VARIABLES
-- =====================================================

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

-- Final log entry
INSERT INTO migration_log (migration_name, phase, status, started_at, completed_at) 
VALUES ('admission_module_rollback', 'complete', 'completed', NOW(), NOW());

-- =====================================================
-- ROLLBACK COMPLETED
-- =====================================================

SELECT 'ADMISSION MODULE ROLLBACK COMPLETED' as status;
SELECT 'Database structure restored to pre-migration state' as result;
SELECT 'Check migration_log table for detailed rollback status' as log_info;

-- Show rollback summary
SELECT 
    phase,
    status,
    started_at,
    completed_at,
    TIMESTAMPDIFF(SECOND, started_at, completed_at) as duration_seconds
FROM migration_log 
WHERE migration_name = 'admission_module_rollback'
ORDER BY started_at;

-- =====================================================
-- POST-ROLLBACK INSTRUCTIONS
-- =====================================================

/*
POST-ROLLBACK CHECKLIST:

1. Verify application functionality:
   - Test admission form submission
   - Test applicant listing
   - Test status updates
   - Test exam score entry

2. Check stored procedures:
   - Ensure school_admission_form procedure works
   - Verify update_student_scores procedure
   - Test all admission-related procedures

3. Verify data integrity:
   - Check applicant counts match expectations
   - Verify no data corruption occurred
   - Test multi-tenant isolation

4. Update application code:
   - Remove any references to new tables
   - Revert API changes that used normalized structure
   - Update frontend components if needed

5. Monitor performance:
   - Check query performance is restored
   - Monitor for any issues in production
   - Verify indexes are working correctly

6. Clean up (if rollback successful):
   - Remove backup table: DROP TABLE school_applicants_backup;
   - Clean up migration logs if desired
   - Document lessons learned

EMERGENCY CONTACTS:
- DBA Team: [contact info]
- Development Team: [contact info]
- System Administrator: [contact info]
*/
