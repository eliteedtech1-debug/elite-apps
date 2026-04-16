-- ======================================
-- FINAL ADMISSION MODULE MIGRATION
-- Admission Dashboard Toggle Implementation
-- Generated: 2025-12-13
-- ======================================

-- STEP 1: Add admission toggle fields to school_admission_settings
-- This adds the admission_open toggle and admission_closing_date fields
ALTER TABLE school_admission_settings 
ADD COLUMN admission_open TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Toggle for admission open/closed status',
ADD COLUMN admission_closing_date DATE NULL COMMENT 'Date when admission automatically closes';

-- STEP 2: Add index for performance optimization
-- Index for efficient querying of open admissions by date
CREATE INDEX idx_admission_status ON school_admission_settings (admission_open, admission_closing_date, school_id, branch_id);

-- STEP 3: Data backfill - Set default values for existing records
-- Ensure all existing admission settings have admission_open = 1 (open by default)
UPDATE school_admission_settings 
SET admission_open = 1 
WHERE admission_open IS NULL;

-- STEP 4: Create trigger for automatic admission closure
-- This trigger automatically closes admission when closing date is reached
DELIMITER $$

CREATE TRIGGER tr_auto_close_admission 
BEFORE UPDATE ON school_admission_settings
FOR EACH ROW
BEGIN
    -- Auto-close admission if closing date has passed
    IF NEW.admission_closing_date IS NOT NULL 
       AND NEW.admission_closing_date <= CURDATE() 
       AND NEW.admission_open = 1 THEN
        SET NEW.admission_open = 0;
    END IF;
END$$

DELIMITER ;

-- STEP 5: Create stored procedure for daily admission status check
-- This procedure can be called by a cron job to ensure admission status is updated
DELIMITER $$

CREATE PROCEDURE sp_update_admission_status()
BEGIN
    -- Close admissions where closing date has passed
    UPDATE school_admission_settings 
    SET admission_open = 0 
    WHERE admission_closing_date IS NOT NULL 
      AND admission_closing_date <= CURDATE() 
      AND admission_open = 1;
      
    -- Log the number of affected records
    SELECT ROW_COUNT() as closed_admissions;
END$$

DELIMITER ;

-- STEP 6: Validation queries to ensure migration success
-- Query 1: Verify new columns exist
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'elite_db' 
  AND TABLE_NAME = 'school_admission_settings' 
  AND COLUMN_NAME IN ('admission_open', 'admission_closing_date');

-- Query 2: Verify index was created
SELECT INDEX_NAME, COLUMN_NAME 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'elite_db' 
  AND TABLE_NAME = 'school_admission_settings' 
  AND INDEX_NAME = 'idx_admission_status';

-- Query 3: Verify trigger was created
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE 
FROM INFORMATION_SCHEMA.TRIGGERS 
WHERE TRIGGER_SCHEMA = 'elite_db' 
  AND TRIGGER_NAME = 'tr_auto_close_admission';

-- Query 4: Verify stored procedure was created
SELECT ROUTINE_NAME, ROUTINE_TYPE 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = 'elite_db' 
  AND ROUTINE_NAME = 'sp_update_admission_status';

-- Query 5: Test data integrity - count records with new fields
SELECT 
    COUNT(*) as total_records,
    SUM(CASE WHEN admission_open = 1 THEN 1 ELSE 0 END) as open_admissions,
    SUM(CASE WHEN admission_closing_date IS NOT NULL THEN 1 ELSE 0 END) as with_closing_date
FROM school_admission_settings;

-- ROLLBACK INSTRUCTIONS (Execute these if rollback is needed)
-- ROLLBACK STEP 1: Drop trigger
-- DROP TRIGGER IF EXISTS tr_auto_close_admission;

-- ROLLBACK STEP 2: Drop stored procedure  
-- DROP PROCEDURE IF EXISTS sp_update_admission_status;

-- ROLLBACK STEP 3: Drop index
-- DROP INDEX idx_admission_status ON school_admission_settings;

-- ROLLBACK STEP 4: Remove columns (WARNING: This will delete data)
-- ALTER TABLE school_admission_settings 
-- DROP COLUMN admission_open,
-- DROP COLUMN admission_closing_date;

-- ======================================
-- MIGRATION COMPLETE
-- ======================================
