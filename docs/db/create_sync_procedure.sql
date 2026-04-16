USE skcooly_db;

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