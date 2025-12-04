-- Comprehensive SQL script for fixing database schema issues
-- This includes all changes needed to resolve the API errors

-- 1. Add moderated_date column to ca_exam_submissions table
-- This fixes the error: "Unknown column 'ces.moderated_date' in 'field list'"
ALTER TABLE `ca_exam_submissions` 
ADD COLUMN `moderated_date` DATETIME NULL DEFAULT NULL COMMENT 'Date when the submission was moderated/approved';

-- 2. Add missing academic_year and term columns to ca_setup table
-- This fixes the error: "Unknown column 'cs.academic_year' in 'where clause'"
ALTER TABLE `ca_setup` 
ADD COLUMN `academic_year` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Academic year for the CA setup',
ADD COLUMN `term` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Term for the CA setup';

-- 3. Create stored procedure to sync ca_setup with active academic calendar
-- This allows manual synchronization when needed
DELIMITER $$

CREATE PROCEDURE SyncCaSetupWithActiveAcademicYear(IN input_school_id VARCHAR(50))
BEGIN
    DECLARE active_academic_year VARCHAR(20);
    DECLARE active_term VARCHAR(50);
    
    -- Get the current active academic year and term for the school
    SELECT academic_year, term
    INTO active_academic_year, active_term
    FROM academic_calendar
    WHERE school_id = input_school_id AND status = 'Active'
    LIMIT 1;
    
    -- If active academic year is found, update the ca_setup records
    IF active_academic_year IS NOT NULL THEN
        UPDATE ca_setup
        SET
            academic_year = active_academic_year,
            term = active_term
        WHERE school_id = input_school_id;
    END IF;
END$$

-- 4. Create trigger to automatically sync ca_setup when academic calendar status changes to Active
CREATE TRIGGER update_ca_setup_on_academic_year_activation
    AFTER UPDATE ON academic_calendar
    FOR EACH ROW
BEGIN
    -- Check if the status changed to Active
    IF NEW.status = 'Active' AND OLD.status != 'Active' THEN
        -- Update ca_setup records to match the new active academic year and term
        UPDATE ca_setup
        SET
            academic_year = NEW.academic_year,
            term = NEW.term
        WHERE school_id = NEW.school_id;
    END IF;
END$$

DELIMITER ;

-- 5. Update existing ca_setup records to match active academic calendar entries
-- This handles schools that are already in the middle of a term
UPDATE ca_setup cs 
JOIN academic_calendar ac ON cs.school_id = ac.school_id 
SET 
    cs.academic_year = ac.academic_year, 
    cs.term = ac.term 
WHERE 
    ac.status = 'Active';