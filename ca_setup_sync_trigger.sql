-- Script to create a trigger that updates ca_setup table when academic year status changes to active
-- This ensures ca_setup records have the correct academic year and term when they're set to active

DELIMITER $$

-- Create a trigger to update ca_setup when academic calendar status changes to active
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

-- Also create a procedure to manually update ca_setup for a specific school based on active academic year
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

DELIMITER ;