DROP TRIGGER IF EXISTS update_class_name_references;

DELIMITER $$
CREATE TRIGGER update_class_name_references 
AFTER UPDATE ON classes
FOR EACH ROW
BEGIN
    IF OLD.class_name != NEW.class_name THEN
        UPDATE teacher_classes 
        SET class_name = NEW.class_name 
        WHERE class_name = OLD.class_name 
        AND class_code = NEW.class_code;
        
        UPDATE students 
        SET class_name = NEW.class_name 
        WHERE class_name = OLD.class_name 
        AND current_class = NEW.class_code;
        
        UPDATE class_role 
        SET class_name = NEW.class_name 
        WHERE class_name = OLD.class_name 
        AND class_code = NEW.class_code;
    END IF;
END $$
DELIMITER ;