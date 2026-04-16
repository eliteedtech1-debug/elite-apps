DROP PROCEDURE IF EXISTS `character_scores`;

DELIMITER $$

CREATE PROCEDURE `character_scores`(
    IN `query_type` VARCHAR(50), 
    IN `in_school_id` VARCHAR(50), 
    IN `in_academic_year` VARCHAR(50), 
    IN `in_term` VARCHAR(50), 
    IN `in_section` VARCHAR(50), 
    IN `in_category` VARCHAR(50), 
    IN `in_admission_no` VARCHAR(50), 
    IN `in_student_name` VARCHAR(50), 
    IN `in_grade` VARCHAR(50), 
    IN `in_created_by` VARCHAR(50), 
    IN `in_description` VARCHAR(50), 
    IN `in_class_name` VARCHAR(50), 
    IN `in_class_code` VARCHAR(50),
    IN `in_id` INT,
    IN `in_branch_id` VARCHAR(50)
)
BEGIN
    DECLARE rows_found INT;
    
    IF query_type = 'insert' THEN
        INSERT INTO `character_scores` (
            `school_id`, `academic_year`, `term`, `category`, `admission_no`,
            `student_name`, `grade`, `created_by`, `description`, `class_name`, `class_code`
        )
        VALUES (
            in_school_id, in_academic_year, in_term, in_category, in_admission_no,
            in_student_name, in_grade, in_created_by, in_description, in_class_name, in_class_code
        )
        ON DUPLICATE KEY UPDATE
            grade = VALUES(grade),
            created_by = VALUES(created_by);

    ELSEIF query_type = 'select-class-record' THEN
        SELECT * FROM character_scores
        WHERE class_code = in_class_code;

    ELSEIF query_type = 'Create Character' THEN
        INSERT INTO `character_traits` (`school_id`, `branch_id`, `category`, `description`, `section`)
        VALUES (in_school_id, in_branch_id, in_category, in_description, in_section);

    ELSEIF query_type = 'Update Character' THEN
        UPDATE `character_traits`
        SET 
            `category` = in_category,
            `description` = in_description,
            `section` = in_section
        WHERE `id` = in_id AND `school_id` = in_school_id AND `branch_id` = in_branch_id;

    ELSEIF query_type = 'Delete Character' THEN
        DELETE FROM `character_traits`
        WHERE `id` = in_id AND `school_id` = in_school_id AND `branch_id` = in_branch_id;

    ELSE
        SELECT 'Invalid query_type provided' AS message;
    END IF;
END$$

DELIMITER ;
