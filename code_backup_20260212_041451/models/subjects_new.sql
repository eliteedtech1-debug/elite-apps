DELIMITER $$
CREATE DEFINER=`root`@`%` PROCEDURE `subjects_new`(
    IN `query_type` VARCHAR(50), 
    IN `in_id` VARCHAR(50), 
    IN `in_subjects` TEXT,
    IN `in_section` VARCHAR(50), 
    IN `in_status` ENUM('Active','Inactive'), 
    IN `in_school_id` VARCHAR(20), 
    IN `in_class_code` VARCHAR(50)
)
BEGIN
    DECLARE last_code INT DEFAULT 0;
    DECLARE subject_code VARCHAR(100);
    DECLARE cur_subject VARCHAR(100);
    DECLARE cur_status VARCHAR(20);
    DECLARE remaining TEXT;
    DECLARE subject_pair TEXT;
    DECLARE delimiter_pos INT;
    DECLARE cur_section VARCHAR(50);
    DECLARE subject_triple TEXT;

    IF query_type = 'create' THEN
        START TRANSACTION;

        SELECT COALESCE(MAX(code),0) + 1 INTO last_code 
        FROM number_generator 
        WHERE prefix = 'sub' 
        FOR UPDATE;

        SET subject_code = CONCAT('SBJ', LPAD(last_code, 4, '0'));

        UPDATE number_generator 
        SET code = last_code 
        WHERE prefix = 'sub';

        INSERT INTO subjects(`subject`, `section`, `status`, `subject_code`, `school_id`, `class_code`)
        VALUES (in_subjects, in_section, in_status, subject_code, in_school_id, in_class_code);

        COMMIT;

    ELSEIF query_type = 'create_bulk' THEN
        START TRANSACTION;

        SELECT COALESCE(MAX(code),0) INTO last_code 
        FROM number_generator 
        WHERE prefix = 'sub' 
        FOR UPDATE;

        SET remaining = in_subjects;

        WHILE LENGTH(remaining) > 0 DO
            SET delimiter_pos = LOCATE('##', remaining);

            IF delimiter_pos > 0 THEN
                SET subject_pair = SUBSTRING(remaining, 1, delimiter_pos - 1);
                SET remaining = SUBSTRING(remaining, delimiter_pos + 2);
            ELSE
                SET subject_pair = remaining;
                SET remaining = '';
            END IF;

            SET cur_subject = SUBSTRING_INDEX(subject_pair, '|', 1);
            SET cur_status = SUBSTRING_INDEX(subject_pair, '|', -1);

            SET last_code = last_code + 1;
            SET subject_code = CONCAT('SBJ', LPAD(last_code, 4, '0'));

            INSERT INTO subjects(`subject`, `section`, `status`, `subject_code`, `school_id`, `class_code`)
            VALUES (cur_subject, in_section, cur_status, subject_code, in_school_id, in_class_code);
        END WHILE;

        UPDATE number_generator 
        SET code = last_code 
        WHERE prefix = 'sub';

        COMMIT;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM subjects 
        WHERE subject_code = in_id 
          AND school_id = in_school_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT s.*, c.class_name 
        FROM `subjects` s 
        JOIN classes c ON s.class_code = c.class_code 
        WHERE s.school_id = in_school_id;

    ELSEIF query_type = 'select-section-subjects' THEN
        SELECT * 
        FROM `subjects` 
        WHERE class_code = in_class_code 
          AND status = 'Active' 
          AND school_id = in_school_id 
        ORDER BY `subjects`.`subject_code` ASC;

    ELSEIF query_type = 'update' THEN
        UPDATE subjects
        SET
            `subject` = in_subjects,
            `section` = in_section,
            `status` = in_status,
            `class_code` = in_class_code
        WHERE
            subject_code = in_id AND school_id = in_school_id;

    ELSEIF query_type = 'assign_to_class' THEN
        START TRANSACTION;

        SELECT COALESCE(MAX(code),0) INTO last_code 
        FROM number_generator 
        WHERE prefix = 'sub' 
        FOR UPDATE;

        SET remaining = in_subjects;

        WHILE LENGTH(remaining) > 0 DO
            SET delimiter_pos = LOCATE('##', remaining);
            IF delimiter_pos > 0 THEN
                SET subject_triple = SUBSTRING(remaining, 1, delimiter_pos - 1);
                SET remaining = SUBSTRING(remaining, delimiter_pos + 2);
            ELSE
                SET subject_triple = remaining;
                SET remaining = '';
            END IF;

            SET cur_subject = SUBSTRING_INDEX(subject_triple, '|', 1);
            SET cur_status = SUBSTRING_INDEX(SUBSTRING_INDEX(subject_triple, '|', 2), '|', -1);
            SET cur_section = SUBSTRING_INDEX(subject_triple, '|', -1);

            SET last_code = last_code + 1;
            SET subject_code = CONCAT('SBJ', LPAD(last_code, 4, '0'));

            INSERT INTO subjects(`subject`, `section`, `status`, `subject_code`, `school_id`, `class_code`)
            VALUES (cur_subject, cur_section, cur_status, subject_code, in_school_id, in_class_code);
        END WHILE;

        UPDATE number_generator 
        SET code = last_code 
        WHERE prefix = 'sub';

        COMMIT;

    ELSEIF query_type = 'remove_from_class' THEN
        SET remaining = in_subjects;
        WHILE LENGTH(remaining) > 0 DO
            SET delimiter_pos = LOCATE('##', remaining);
            IF delimiter_pos > 0 THEN
                SET cur_subject = SUBSTRING(remaining, 1, delimiter_pos - 1);
                SET remaining = SUBSTRING(remaining, delimiter_pos + 2);
            ELSE
                SET cur_subject = remaining;
                SET remaining = '';
            END IF;

            DELETE FROM subjects
            WHERE `subject` = cur_subject
              AND `class_code` = in_class_code
              AND `school_id` = in_school_id;
        END WHILE;
    END IF;
END$$
DELIMITER ;