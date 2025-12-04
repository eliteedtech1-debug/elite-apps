USE skcooly_db;

DELIMITER $$

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