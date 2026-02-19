DROP TABLE IF EXISTS assignments;

CREATE TABLE `assignments` (
 `id` int(11) NOT NULL AUTO_INCREMENT,
 `class_name` varchar(255) DEFAULT NULL,
 `subject` varchar(255) DEFAULT NULL,
 `assignment_date` date DEFAULT NULL,
 `submission_date` date DEFAULT NULL,
 `attachment` varchar(255) DEFAULT NULL,
 `content` text DEFAULT NULL,
 `teacher` varchar(100) DEFAULT NULL,
 `title` varchar(259) DEFAULT NULL,
 PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS lessons;
	CREATE TABLE `lessons` (
 `id` int(11) NOT NULL AUTO_INCREMENT,
 `class_name` varchar(255) DEFAULT NULL,
 `subject` varchar(255) DEFAULT NULL,
 `lesson_date` date DEFAULT NULL,
 `attachment` varchar(255) DEFAULT NULL,
 `content` text DEFAULT NULL,
 `teacher` varchar(100) DEFAULT NULL,
 `title` varchar(259) DEFAULT NULL,
 PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




DROP PROCEDURE `assignments`;

DELIMITER $$

CREATE  PROCEDURE `assignments`(IN `in_query_type` VARCHAR(10), IN `in_assignment_id` INT, IN `in_class_name` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_assignment_date` DATE, IN `in_submission_date` DATE, IN `in_attachment` VARCHAR(255), IN `in_content` TEXT, IN `in_teacher` VARCHAR(100), IN `in_title` VARCHAR(100)) NOT DETERMINISTIC CONTAINS SQL SQL SECURITY DEFINER BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO assignments (class_name, subject, assignment_date, submission_date, attachment, content, teacher, title)
        VALUES (in_class_name, in_subject, in_assignment_date, in_submission_date, in_attachment, in_content, in_teacher, in_title);
    ELSEIF in_query_type = 'UPDATE' THEN
        UPDATE assignments
        SET class_name = in_class_name,
            subject = in_subject,
            assignment_date = in_assignment_date,
            submission_date = in_submission_date,
            attachment = in_attachment,
            content = in_content,
            teacher = in_teacher,
            title = in_title
        WHERE id = in_assignment_id;
    ELSEIF in_query_type = 'DELETE' THEN
        DELETE FROM Assignments WHERE id = in_assignment_id;
    ELSEIF in_query_type = 'select' THEN
        IF in_assignment_id IS NOT NULL THEN
            SELECT * FROM assignments WHERE id = in_assignment_id;
        ELSE
            SELECT * FROM assignments;
        END IF;
    END IF;
END $$

DELIMITER $$
CREATE  PROCEDURE `lessons`(
    IN `in_query_type` VARCHAR(10), 
IN `in_assignment_id` INT, 
IN `in_class_name` VARCHAR(255), 
IN `in_subject` VARCHAR(255), 
IN `in_lesson_date` DATE, 
IN `in_attachment` VARCHAR(255), 
IN `in_content` TEXT, 
IN `in_teacher` VARCHAR(100), 
IN `in_title` VARCHAR(100))
BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO lessons (class_name, subject, lesson_date , attachment, content, teacher, title)
        VALUES (in_class_name, in_subject, in_lesson_date, in_attachment, in_content, in_teacher, in_title);
    ELSEIF in_query_type = 'UPDATE' THEN
        UPDATE assignments
        SET class_name = in_class_name,
            subject = in_subject,
            lesson_date = in_lesson_date,
            attachment = in_attachment,
            content = in_content,
            teacher = in_teacher,
            title = in_title
        WHERE id = in_assignment_id;
    ELSEIF in_query_type = 'DELETE' THEN
        DELETE FROM Assignments WHERE id = in_assignment_id;
    ELSEIF in_query_type = 'select' THEN
        IF in_assignment_id IS NOT NULL THEN
            SELECT * FROM lessons WHERE id = in_assignment_id;
        ELSE
            SELECT * FROM lessons;
        END IF;
    END IF;
END$$
DELIMITER ;



