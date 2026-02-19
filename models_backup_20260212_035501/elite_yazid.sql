-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 05, 2025 at 01:58 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `elite_yazid`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `academic_year` (IN `in_query_type` VARCHAR(20), IN `in_school_id` VARCHAR(50), IN `in_section_id` VARCHAR(50), IN `in_term` VARCHAR(50), IN `in_year` VARCHAR(50), IN `in_begin_date` VARCHAR(50), IN `in_end_date` VARCHAR(50), IN `in_status` VARCHAR(20))   BEGIN
IF in_query_type = 'create' THEN 
INSERT INTO `academic_calendar`(`academic_year`, `term`, `begin_date`, `end_date`, `status`, `school_id`, `section_id`) VALUES (in_year,in_term,date(in_begin_date),date(in_end_date),'active',in_school_id,in_section_id);

ELSEIF in_query_type = 'select' THEN 
SELECT * FROM academic_calendar;

ELSEIF in_query_type = 'selectByid' THEN 
SELECT * FROM academic_calendar WHERE school_id=in_school_id;


END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `account_chart` (IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First term','Second term','Third term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive'), IN `in_account_type` VARCHAR(100), IN `in_school_id` VARCHAR(11))   BEGIN
    -- Handle 'create' operation
    IF query_type = "create" THEN
        INSERT INTO `account_chart`(
            `description`, `amount`, `term`, `section`, `class_name`, 
            `revenue_type`, `account_type`, `is_optional`, `status`, `school_location`, `school_id`
        ) 
        VALUES (
            in_description, in_amount, in_term, in_section, in_class_name, 
            in_revenue_type, in_account_type, in_is_optional, in_status, in_school_location, in_school_id
        );

    ELSEIF query_type = "update" THEN
    UPDATE `account_chart`
    SET
        `description` = COALESCE(in_description, `description`),
        `amount` = COALESCE(in_amount, `amount`),
        `term` = COALESCE(in_term, `term`),
        `section` = COALESCE(in_section, `section`),
        `class_name` = COALESCE(in_class_name, `class_name`),
        `revenue_type` = COALESCE(in_revenue_type, `revenue_type`),
        `account_type` = COALESCE(in_account_type, `account_type`),
        `is_optional` = COALESCE(in_is_optional, `is_optional`),
        `status` = COALESCE(in_status, `status`),
        `school_location` = COALESCE(in_school_location, `school_location`),
        `school_id` = COALESCE(in_school_id, `school_id`)
    WHERE `code` = in_id; 

    -- Handle 'select-all' operation
    ELSEIF query_type = "select-all" THEN
        SELECT * FROM account_chart;

    -- Handle 'select' operation with dynamic filtering
    ELSEIF query_type = "select" THEN
        SET @query = 'SELECT * FROM account_chart';
        SET @where_clause = '';

        -- Filter by section
        IF in_section IS NOT NULL AND in_section != '' THEN 
            SET @where_clause = CONCAT(@where_clause, 'section = "', in_section, '"');
        END IF;

        -- Filter by class name, including 'All Classes'
        IF in_class_name IS NOT NULL AND in_class_name != '' THEN
            SET @where_clause = IF(@where_clause = '', 
                CONCAT('class_name = "', in_class_name, '" OR class_name = "All Classes"'),
                CONCAT(@where_clause, ' AND (class_name = "', in_class_name, '" OR class_name = "All Classes")')
            );
        END IF;

        -- Filter by term, including specific term and Each Term
        IF in_term IS NOT NULL AND in_term != '' THEN
            SET @where_clause = IF(@where_clause = '',
                CONCAT('(term = "', in_term, '" OR term = "Each Term")'),
                CONCAT(@where_clause, ' AND (term = "', in_term, '" OR term = "Each Term")')
            );
        END IF;

        -- Combine query and where clause
        IF @where_clause != '' THEN
            SET @query = CONCAT(@query, ' WHERE ', @where_clause);
        END IF;

        -- Execute the dynamic query
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

    -- Handle 'select-revenues' operation
    ELSEIF query_type = 'select-revenues' THEN
        SELECT * FROM account_chart 
        WHERE class_name IN ('All Classes', in_class_name)
          AND (section = in_section OR in_section IS NULL)
          AND term IN (in_term, 'Each Term')
          AND (school_id = in_school_id OR in_school_id IS NULL);

    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `admission_form` (IN `in_id` INT(10), IN `query_type` VARCHAR(100), IN `in_pupils_name` VARCHAR(100), IN `in_pupils_last_name` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_religion` INT(100), IN `in_health_needs` VARCHAR(100), IN `in_medical_report` VARCHAR(100), IN `in_last_school` VARCHAR(100), IN `in_last_class` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_town_lga` VARCHAR(100), IN `in_father_name` VARCHAR(100), IN `in_father_occupation` VARCHAR(100), IN `in_father_contact_address` VARCHAR(100), IN `in_father_postal_address` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_telephone` INT(100), IN `in_father_email` VARCHAR(100), IN `in_mother_name` VARCHAR(100), IN `in_mother_occupation` VARCHAR(100), IN `in_mother_address` VARCHAR(100), IN `in_mother_place_of_work` VARCHAR(100), IN `in_mother_telephone` VARCHAR(100), IN `in_mother_email` VARCHAR(100), IN `in_next_of_kin` VARCHAR(100), IN `in_next_of_kin_occupation` VARCHAR(100), IN `in_next_of_kin_contact_address` VARCHAR(100), IN `in_next_of_kin_email` VARCHAR(100), IN `in_next_of_kin_tel` INT(100), IN `in_student_signature` VARCHAR(100), IN `in_sponsor_signature` VARCHAR(100), IN `in_date_from` DATE, IN `in_date_to` DATE)   BEGIN 
    IF query_type="create" THEN 
    INSERT INTO `admission_form`(id, pupils_name, pupils_last_name,date_of_birth, religion, health_needs, medical_report, last_school, last_class, nationality, state_of_origin, town_lga, father_name, father_occupation, father_contact_address, father_postal_address, father_place_of_work, father_telephone, father_email, mother_name, mother_occupation, mother_address, mother_place_of_work, mother_telephone, mother_email, next_of_kin, next_of_kin_occupation, next_of_kin_contact_address, next_of_kin_email, next_of_kin_tel, student_signature, sponsor_signature, date_from, date_to
    ) VALUES (
    in_id,in_pupils_name,in_pupils_last_name,in_date_of_birth,in_religion,in_health_needs,in_medical_report,in_last_school,in_last_class,in_nationality,in_state_of_origin,in_town_lga,in_father_name,in_father_occupation,in_father_contact_address,in_father_postal_address,in_father_place_of_work,in_father_telephone,in_father_email,in_mother_name,in_mother_occupation,in_mother_address,in_mother_place_of_work,in_mother_telephone,in_mother_email,in_next_of_kin,in_next_of_kin_occupation,in_next_of_kin_contact_address,in_next_of_kin_email,in_next_of_kin_tel,in_student_signature,in_sponsor_signature,in_date_from,in_date_to
    );

    ELSEIF query_type='select' THEN
    SELECT * FROM `admission_form`;
    END IF;
    END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `admission_number_generator` (IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_serial_no` VARCHAR(100), IN `in_type_of_school` VARCHAR(100))   BEGIN
IF query_type='create' THEN
INSERT INTO `admission_number_generator`(school, class_type, admission_year, serial_no, type_of_school)
VALUES (in_school,in_class_type,in_admission_year,in_serial_no,in_type_of_school);

 ELSEIF query_type='select' THEN
    SELECT * FROM `admission_number_generator`  WHERE school=in_school AND class_type = in_class_type AND admission_year = in_admission_year;
  
  ELSEIF query_type='select_type_of_school' THEN
    SELECT DISTINCT type_of_school FROM `admission_number_generator`;
   
   
   ELSEIF query_type="update" THEN 
    UPDATE `admission_number_generator` SET serial_no= in_serial_no 
    WHERE school=in_school AND class_type = in_class_type AND admission_year = in_admission_year;

END IF; 
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `application` (IN `query_type` VARCHAR(100), IN `in_upload` VARCHAR(100), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_guardian_name` VARCHAR(100), IN `in_guardian_phone_no` VARCHAR(100), IN `in_guardian_email` VARCHAR(200), IN `in_guardian_address` VARCHAR(100), IN `in_guardian_relationship` VARCHAR(100), IN `in_parent_fullname` VARCHAR(100), IN `in_parent_phone_no` VARCHAR(100), IN `in_parent_email` VARCHAR(100), IN `in_parent_address` VARCHAR(100), IN `in_parent_occupation` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_last_school_attended` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_admission_no` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_status` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_school_id` VARCHAR(100), IN `p_short_name` VARCHAR(10))   BEGIN

	DECLARE app_id INT;
	DECLARE gur_id INT;
	DECLARE par_id INT;
    
    DECLARE app_code VARCHAR(50);
	DECLARE gur_code VARCHAR(50);
	DECLARE par_code VARCHAR(50);
IF query_type="create" THEN
SELECT  MAX(code) + 1 INTO app_id FROM number_generator WHERE description = "application_id";
    SELECT MAX(code) + 1 INTO gur_id  FROM number_generator WHERE description = "guardian_id";
    SELECT  MAX(code) + 1 INTO par_id FROM number_generator WHERE description = "parent_id";
    
    SET app_code  = CONCAT("APP/",p_short_name,'/', LPAD(CAST(app_id  AS CHAR(5)), 5, '0'));
    SET gur_code  = CONCAT("GUR/",p_short_name,'/', LPAD(CAST(gur_id  AS CHAR(5)), 5, '0'));
    SET par_code  = CONCAT("PAR/",p_short_name,'/', LPAD(CAST(par_id  AS CHAR(5)), 5, '0'));
    
   CALL parents('create', par_code, in_parent_fullname, in_parent_phone_no, in_parent_email, 
                  in_guardian_relationship, 0, in_parent_occupation, in_school_id, in_admission_no);
                   
                    CALL guardians('create',in_school_id, gur_code, app_code, in_guardian_name, 
                      in_guardian_address, in_guardian_email, in_guardian_phone_no);
                      
                      INSERT INTO secondary_school_entrance_form (upload, applicant_id, guardian_id, parent_id, type_of_application, name_of_applicant,
            home_address, date_of_birth, state_of_origin, 
            l_g_a, last_school_atterded, special_health_needs, 
            sex, admission_no, school, status, school_id, academic_year
        ) VALUES (
            in_upload, app_code, gur_code, par_code, in_type_of_application, in_name_of_applicant,
            in_home_address, in_date_of_birth, in_state_of_origin, 
            in_l_g_a, in_last_school_attended, in_special_health_needs, 
            in_sex, in_admission_no, in_school, in_status, in_school_id, in_academic_year
        );
        
        
        UPDATE number_generator SET code = app_id  WHERE description = "application_id";
    	UPDATE number_generator SET code = gur_id  WHERE description = "guardian_id";
    	UPDATE number_generator SET code = par_id  WHERE description = "parent_id";
        
        END IF;
        
       
       END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `assignmentResponses` (IN `query_type` VARCHAR(10), IN `p_assignment_id` INT, IN `p_question_id` INT, IN `p_admission_no` INT, IN `p_subject` VARCHAR(30), IN `p_response` TEXT, IN `p_class_name` VARCHAR(255))   BEGIN
    DECLARE record_exists INT DEFAULT 0;
    DECLARE correct_answer TEXT;
    DECLARE question_marks INT DEFAULT 0;
    DECLARE is_correct TINYINT DEFAULT 0;
    DECLARE score INT DEFAULT 0;

    -- Fetch the correct answer and marks for the question
    SELECT correct_answer, marks
    INTO correct_answer, question_marks
    FROM assignment_questions
    WHERE id = p_question_id;

    -- Determine if the response is correct
    IF p_response = correct_answer THEN
        SET is_correct = 1;
        SET score = marks;
    ELSE
        SET is_correct = 0;
        SET score = 0;
    END IF;

    -- Check if the record already exists
    SELECT COUNT(*)
    INTO record_exists
    FROM assignment_responses
    WHERE assignment_id = p_assignment_id
      AND question_id = p_question_id
      AND admission_no = p_admission_no;

    -- Handle actions
    IF query_type = 'insert' THEN
        IF record_exists = 0 THEN
            INSERT INTO assignment_responses (
                assignment_id, question_id, admission_no, subject, response, score, is_correct
            ) VALUES (
                p_assignment_id, p_question_id, p_admission_no, p_subject, p_response, score, is_correct
            );
         --   SET p_result_message = 'Record inserted successfully.';
        -- ELSE
         --   SET p_result_message = 'Record already exists.';
        END IF;

    ELSEIF query_type = 'upsert' THEN
        IF record_exists = 0 THEN
            INSERT INTO assignment_responses (
                assignment_id, question_id, admission_no, subject, response, score, is_correct
            ) VALUES (
                p_assignment_id, p_question_id, p_admission_no, p_subject, p_response, score, is_correct
            );
           -- SET p_result_message = 'Record inserted successfully.';
        ELSE
            UPDATE assignment_responses
            SET response = p_response,
                score = score,
                is_correct = is_correct
            WHERE assignment_id = p_assignment_id
              AND question_id = p_question_id
              AND admission_no = p_admission_no;
           -- SET p_result_message = 'Record updated successfully.';
        END IF;

    ELSEIF query_type = 'select' THEN
        -- Fetch records (output can be retrieved using SELECT in the caller)
        SELECT * FROM assignment_responses
        WHERE assignment_id = p_assignment_id
          AND admission_no = p_admission_no;

       -- SET p_result_message = 'Select query executed successfully.';

    -- ELSE
      --  SET p_result_message = 'Invalid action specified.';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `assignments` (IN `in_query_type` VARCHAR(10), IN `in_id` INT, IN `in_teacher_id` INT, IN `in_class_name` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_assignment_date` DATE, IN `in_submission_date` DATE, IN `in_attachment` VARCHAR(255), IN `in_content` TEXT, IN `in_teacher_name` VARCHAR(100), IN `in_title` VARCHAR(100), IN `in_marks` VARCHAR(100))   BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO assignments (teacher_id,class_name, subject, assignment_date, submission_date, attachment, content, teacher_name, title, marks)
        VALUES (in_teacher_id, in_class_name, in_subject, in_assignment_date, in_submission_date, in_attachment, in_content, in_teacher_name, in_title, in_marks);
        SELECT LAST_INSERT_ID() AS assignment_id;
    ELSEIF in_query_type = 'UPDATE' THEN
        UPDATE assignments
        SET class_name = COALESCE(in_class_name,class_name), 
        subject = COALESCE(in_subject,subject),
            assignment_date = COALESCE(in_assignment_date,assignment_date),
            submission_date = COALESCE(in_submission_date,submission_date),
            attachment = COALESCE(in_attachment,attachment),
            content = COALESCE(in_content,content),
            teacher_name = COALESCE(in_teacher_name,teacher_name),
            title = COALESCE(in_title,title),
            title = COALESCE(in_marks,marks)
        WHERE id = in_id;
    ELSEIF in_query_type = 'DELETE' THEN
        DELETE FROM Assignments WHERE id = in_id;
    ELSEIF in_query_type = 'select' THEN
        IF in_id IS NOT NULL THEN
            SELECT * FROM assignments WHERE id = in_id;
        ELSE
            SELECT * FROM assignments;
        END IF;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `assignment_questions` (IN `query_type` VARCHAR(30), IN `in_id` VARCHAR(10), IN `in_assignment_id` VARCHAR(10), IN `in_question_type` ENUM('Multiple Choice','True/False','Short Answer','Fill in the Blank','Essay'), IN `in_question_text` TEXT, IN `in_options` JSON, IN `in_correct_answer` VARCHAR(255), IN `in_marks` INT)   BEGIN
DECLARE assignment_id INT(10);
    IF query_type = 'insert' THEN
        -- Validate the question type
        IF in_question_type = 'Multiple Choice' THEN
            -- Ensure options and correct_answer are provided
            IF in_options IS NULL OR in_correct_answer IS NULL THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Options and correct answer must be provided for multiple-choice questions.';
            END IF;
        ELSEIF in_question_type='True/False' THEN
        -- Ensure correct_answer is provided
            IF in_correct_answer IS NULL THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Correct answer must be provided for true-false questions.';

            END IF;  
        END IF;
    INSERT INTO assignment_questions (assignment_id, question_type,question_text,  options, correct_answer, marks)
    VALUES (in_assignment_id, in_question_type, in_question_text, in_options, in_correct_answer, in_marks);
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `bookSupplies` (IN `p_action` VARCHAR(20), IN `p_record_id` INT, IN `p_book_title` VARCHAR(255), IN `p_author` VARCHAR(255), IN `p_isbn` VARCHAR(20), IN `p_cover_img` VARCHAR(255), IN `p_status` ENUM('Available','Reserved'), IN `p_qty` INT, IN `p_post_date` DATE, IN `p_publisher` VARCHAR(255), IN `p_subject` VARCHAR(255), IN `p_book_no` VARCHAR(50))   BEGIN
    IF p_action = 'CREATE' THEN
        INSERT INTO book_supplies (
            book_title, 
            author, 
            isbn, 
            cover_img, 
            status, 
            qty, 
            post_date, 
            publisher, 
            subject, 
            book_no
        )
        VALUES (
            p_book_title, 
            p_author, 
            p_isbn, 
            p_cover_img, 
            p_status, 
            p_qty, 
            p_post_date, 
            p_publisher, 
            p_subject, 
            p_book_no
        );
    ELSEIF p_action = 'UPDATE' THEN
        UPDATE book_supplies
        SET 
            book_title = p_book_title,
            author = p_author,
            cover_img = p_cover_img,
            status = p_status,
            qty = p_qty,
            post_date = p_post_date,
            publisher = p_publisher,
            subject = p_subject,
            book_no = p_book_no
        WHERE record_id = p_record_id;
    ELSEIF p_action = 'DELETE' THEN
        DELETE FROM book_supplies WHERE record_id = p_record_id;
     ELSEIF p_action = 'SELECT-ALL' THEN
        SELECT * FROM book_supplies;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `character_scores` (IN `query_type` VARCHAR(50), IN `in_school_id` VARCHAR(50), IN `in_academic_year` VARCHAR(50), IN `in_term` VARCHAR(50), IN `in_section` VARCHAR(50), IN `in_category` VARCHAR(50), IN `in_admission_no` VARCHAR(50), IN `in_student_name` VARCHAR(50), IN `in_grade` VARCHAR(50), IN `in_created_by` VARCHAR(50), IN `in_description` VARCHAR(50), IN `in_class_name` VARCHAR(50))   BEGIN
    
        IF query_type ='insert' THEN
                INSERT INTO `character_scores`(`school_id`, `academic_year`, `term`, `category`, `admission_no`, student_name, `grade`, `created_by`, `description`, `class_name`)
            VALUES(`in_school_id`, `in_academic_year`, `in_term`, `in_category`, `in_admission_no`, in_student_name, `in_grade`, `in_created_by`, `in_description`, `in_class_name`) ;
                
        ELSEIF query_type ='select-class-record' THEN
            SELECT * FROM character_scores WHERE class_name = in_class_name;

        ELSEIF query_type='Create Character' THEN 

            INSERT INTO  `character_traits` (`school_id`, `category`, `description`,`section`)
            VALUES (`in_school_id`, `in_category`, `in_description`,`in_section`);
        ELSEIF query_type='Select School Characters' THEN     
            SELECT * FROM  `character_traits` WHERE school_id = in_school_id;
        END IF;
    
    END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `classes` (IN `query_type` VARCHAR(50), IN `in_id` INT, IN `in_class_name` VARCHAR(100), IN `in_class_code` VARCHAR(100), IN `in_section` VARCHAR(100), IN `in_school_location` VARCHAR(200), IN `in_school_id` VARCHAR(10))   BEGIN
    IF query_type = 'create' THEN
        -- Insert a new class record
        INSERT INTO `classes`(`class_name`, `class_code`, `section`,`school_location`, `school_id`)
        VALUES (in_class_name, in_class_code, in_section, in_school_location, in_school_id);
    
    ELSEIF query_type = 'update' THEN
        -- Update an existing class record based on `in_id`
        UPDATE `classes`
        SET `class_name` = COALESCE(in_class_name,class_name),
            `class_code` = COALESCE(class_code,in_class_code),
            `section` = COALESCE(section,in_section),
            `school_location` = COALESCE(school_location,in_school_location),
            `school_id` = COALESCE(school_id,in_school_id)
        WHERE `id` = in_id;
        
    ELSEIF query_type = 'select' THEN

        SELECT * FROM `classes`
         WHERE (class_name = in_class_name OR in_class_name IS NULL OR class_name='All Classes' )
          AND (term = in_term OR in_term IS NULL or term ='Per Annum')
          AND (school_location = in_school_location OR in_school_location IS NULL);

    ELSEIF query_type = 'select-all' THEN
        -- Select all classes
       SELECT * FROM `classes` WHERE school_id = in_school_id ORDER BY id ASC;

    ELSEIF query_type = 'select-level' THEN
        -- Select classes based on `in_level`
        SELECT * FROM `classes`
        WHERE `class_code` = in_class_code;

    ELSEIF query_type = 'select-sections' THEN
        -- Select classes based on `in_section`
        SELECT DISTINCT section AS section FROM `classes`;

     ELSEIF query_type = 'select-section-classes' THEN
        -- Select classes based on `in_section`
        SELECT * FROM `classes`
        WHERE `section` = in_section AND school_id = in_school_id ORDER BY class_name ASC;
	ELSEIF query_type = 'select-unique-classes' THEN
    	 SELECT CONCAT(section,' ', class_code) as class_group, section, class_code  FROM `classes` GROUP BY section, class_code,class_name;

    ELSEIF query_type = 'select-class-count' THEN
    	SELECT  current_class AS class_name, COUNT(*) as student_count FROM `students` GROUP BY current_class;
    END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `ClassTiming` (IN `query_type` VARCHAR(10), IN `in_id` INT, IN `in_school_id` INT, IN `in_section` VARCHAR(255), IN `in_start_time` TIME, IN `in_end_time` TIME, IN `in_activities` TEXT)   BEGIN 
    -- Insert
    IF query_type = "create" THEN
        INSERT INTO class_timing (school_id, section, start_time, end_time, activities, created_at, updated_at)
        VALUES (in_school_id, in_section, in_start_time, in_end_time, in_activities, NOW(), NOW());

    -- Select all or filter by section if provided
    ELSEIF query_type = "select" THEN
        IF in_section IS NOT NULL THEN
            SELECT * FROM class_timing WHERE section = in_section ORDER BY `id` ASC;
        ELSE
            SELECT * FROM `class_timing` ORDER BY `id` ASC;
        END IF;

    -- Update
    ELSEIF query_type = "update" THEN
        UPDATE class_timing
        SET school_id = in_school_id,
            section = in_section,
            start_time = in_start_time,
            end_time = in_end_time,
            activities = in_activities,
            updated_at = NOW()
        WHERE id = in_id;

    -- Delete
    ELSEIF query_type = "delete" THEN
        DELETE FROM class_timing WHERE id = in_id;

    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `class_management` (IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_class_code` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_max_population` VARCHAR(100), IN `in_class_teacher` VARCHAR(100), IN `in_section` VARCHAR(100))   BEGIN 
IF query_type="create" THEN
INSERT INTO `class_management`(class_code, class_name, description, max_population, class_teacher, section)
VALUES (in_class_code, in_class_name, in_description, in_max_population, in_class_teacher, in_section);

ELSEIF query_type="select-all" THEN
SELECT * FROM `class_management`;
ELSEIF query_type="select" THEN
SELECT * FROM `class_management` WHERE no_of_student < max_population;
ELSEIF query_type='select_class_name' THEN 
    SELECT DISTINCT class_name FROM `class_management`  ORDER BY `class_management`.`id` ASC;
END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `class_role` (IN `in_teacher_id` INT(100), IN `in_section` VARCHAR(100), IN `in_subject` VARCHAR(200), IN `in_class` VARCHAR(200), IN `in_role` VARCHAR(200), IN `query_type` VARCHAR(100))   BEGIN

IF query_type = "create" THEN
INSERT INTO `class_role`(`teacher_id`, `section`, `subject`, `class_name`, `role`) 
VALUES(in_teacher_id,in_section,in_subject,in_class,in_role);

ELSEIF query_type ="select" 
THEN SELECT * FROM class_role;

ELSEIF query_type="byId" THEN
SELECT * FROM class_role WHERE teacher_id=in_teacher_id;

END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `class_rooms` (IN `query_type` VARCHAR(100), IN `in_id` INT(50), IN `in_block_no` VARCHAR(100), IN `in_capacity` INT(100), IN `in_status` VARCHAR(100))   BEGIN 
IF query_type="create" THEN
INSERT INTO `class_rooms`(block_no, capacity, status)
VALUES (in_block_no,in_capacity,in_status);

ELSEIF query_type="select" THEN
SELECT * FROM `class_rooms`;

END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `class_routine` (IN `in_id` INT(10), IN `query_type` VARCHAR(50), IN `in_teacher` VARCHAR(50), IN `in_class_` VARCHAR(100), IN `in_section` VARCHAR(50), IN `in_day` VARCHAR(50), IN `in_start_time` TIMESTAMP(6), IN `in_end_time` TIMESTAMP(6), IN `in_class_room` VARCHAR(50))   BEGIN 
IF query_type="create" THEN
INSERT INTO `class_routine`(teacher, class_, section, day, start_time, end_time, class_room) 
VALUES (in_teacher,in_class_,in_section,in_day,in_start_time,in_end_time,in_class_room);

ELSEIF query_type='select' THEN
    SELECT * FROM `class_routine`;
    
END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `dashboard_query` (IN `query_type` VARCHAR(100), IN `school_location` VARCHAR(500))   BEGIN
    -- Declare local variables to store counts
    DECLARE student_count INT;
    DECLARE teacher_count INT;
    DECLARE subject_count INT;
    DECLARE class_count INT;

    IF query_type = 'dashboard-cards' THEN
        -- Get the student count
        SELECT COUNT(*) INTO student_count 
        FROM students 
        WHERE school_location = school_location;

        -- Get the teacher count
        SELECT COUNT(*) INTO teacher_count 
        FROM teachers 
        WHERE school_location = school_location;

        -- Get the subject count
        SELECT COUNT(*) INTO subject_count 
        FROM subjects 
        WHERE school_location = school_location;

        -- Get the class count
        SELECT COUNT(*) INTO class_count 
        FROM classes;

        -- Return the aggregated results in a single row
        SELECT student_count AS student_count, 
               teacher_count AS teacher_count, 
               subject_count AS subject_count, 
               class_count AS class_count;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `data_entry_form` (IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_date` DATE, IN `in_admission_number` INT(100), IN `in_class1` VARCHAR(100), IN `in_stream` VARCHAR(100), IN `in_first_name1` VARCHAR(100), IN `in_middle_name` VARCHAR(100), IN `in_surname` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_blood_group` INT(100), IN `in_email` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_street` VARCHAR(100), IN `in_city` VARCHAR(100), IN `in_first_name` VARCHAR(100), IN `in_relationship` INT(100), IN `in_mobile_no` VARCHAR(100), IN `in_address` VARCHAR(100), IN `in_street1` VARCHAR(100), IN `in_city1` VARCHAR(100), IN `in_state` VARCHAR(100))   BEGIN 
    IF query_type="create" THEN
    INSERT INTO `data_entry_form`(id, date, admission_number, class1, stream, first_name1, middle_name, surname, sex, blood_group, email, nationality, state_of_origin, home_address, street, city, first_name, relationship, mobile_no, address, street1, city1, state
    ) VALUES (in_id,in_date,in_admission_number,in_class1,in_stream,in_first_name1,in_middle_name,in_surname,in_sex,in_blood_group,in_email,in_nationality,in_state_of_origin,in_home_address,in_street,in_city,in_first_name,in_relationship,in_mobile_no,in_address,in_street1,in_city1,in_state);

    ELSEIF query_type='select' THEN
    SELECT * FROM `data_entry_form`;
    END IF;
    END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `entrance_exam_submission` (IN `p_subject_id` INT, IN `p_subject_name` VARCHAR(255), IN `p_school_id` INT, IN `p_section_id` INT, IN `p_academic_year` VARCHAR(50), IN `p_exam_venue` TEXT, IN `p_exam_mark` DECIMAL(5,2), IN `p_applicant_id` INT, IN `p_exam_status` VARCHAR(50))   BEGIN
    
    INSERT INTO entrance_exam (
        subject_id, subject_name, school_id, section_id, 
        acadamic_year, exam_venue, exam_mark, applicant_id, exam_status
    ) VALUES (
        p_subject_id, p_subject_name, p_school_id, p_section_id, 
        p_academic_year, p_exam_venue, p_exam_mark, p_applicant_id, p_exam_status
    );

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `examinations` (IN `query_type` VARCHAR(50), IN `in_id` INT(11), IN `in_schedule_id` INT(11), IN `in_title` VARCHAR(50), IN `in_class_name` VARCHAR(50), IN `in_subject` VARCHAR(50), IN `in_exam_type` VARCHAR(50), IN `in_duration` VARCHAR(60), IN `in_start_time` VARCHAR(12), IN `in_end_time` VARCHAR(12), IN `in_invigilator` VARCHAR(50), IN `in_exam_date` DATE)   BEGIN
IF query_type="create" THEN
INSERT INTO `examinations` (schedule_id, title, class_name, subject, exam_type, duration, start_time, end_time, invigilator, exam_date) 
VALUES (in_schedule_id, in_title, in_class_name, in_subject, in_exam_type, in_duration, in_start_time,in_end_time, in_invigilator, in_exam_date);

ELSEIF query_type = "delete" THEN
    DELETE  FROM `examinations` WHERE id = in_id;

ELSEIF query_type = "select" THEN
    SET @query = "SELECT * FROM `examinations` WHERE 1 = 1";

    -- Add conditions dynamically if parameters are not NULL
    IF in_schedule_id IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND schedule_id = ", in_schedule_id);
    END IF;

    IF in_class_name IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND class_name LIKE '%", in_class_name, "%'");
    END IF;

    IF in_subject IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND subject LIKE '%", in_subject, "%'");
    END IF;

    IF in_exam_type IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND exam_type LIKE '%", in_exam_type, "%'");
    END IF;

    IF in_title IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND title LIKE '%", in_title, "%'");
    END IF;

    IF in_duration IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND duration LIKE '%", in_duration, "%'");
    END IF;

    IF in_start_time IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND start_time = '", in_start_time, "'");
    END IF;

    IF in_end_time IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND end_time = '", in_end_time, "'");
    END IF;

    IF in_invigilator IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND invigilator LIKE '%", in_invigilator, "%'");
    END IF;

    IF in_exam_date IS NOT NULL THEN
      SET @query = CONCAT(@query, " AND exam_date = '", in_exam_date, "'");
    END IF;

    -- Prepare the final query
    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

ELSEIF query_type="select-schedule" THEN
SELECT * FROM `examinations` WHERE schedule_id = in_schedule_id;

ELSEIF query_type="select-all" THEN
SELECT * FROM `examinations`;

END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exams_attendance` (IN `query_type` VARCHAR(50), IN `_id` INT, IN `_teacher_name` VARCHAR(50), IN `_teacher_id` VARCHAR(50), IN `_exam` VARCHAR(50), IN `_class_name` VARCHAR(50), IN `_day` VARCHAR(50), IN `_status` VARCHAR(50), IN `_student_name` VARCHAR(50), IN `_admission_no` VARCHAR(50), IN `_term` VARCHAR(50), IN `_academic_year` VARCHAR(50), IN `_start_date` DATE, IN `_end_date` DATE)   BEGIN
    IF query_type = 'create' THEN
        INSERT INTO exams_attendance (
            teacher_name,
            teacher_id,
            exam,
            class_name,
            day,
            status,
            student_name,
            admission_no,
            term,
            academic_year
        ) VALUES (
            _teacher_name,
            _teacher_id,
            _exam,
            _class_name,
            _day,
            _status,
            _student_name,
            _admission_no,
            _term,
            _academic_year
        );

    ELSEIF query_type = 'read' THEN
        SELECT * FROM exams_attendance WHERE id = _id;

    ELSEIF query_type = 'update' THEN
        UPDATE exams_attendance
        SET
            teacher_name = _teacher_name,
            teacher_id = _teacher_id,
            exam = _exam,
            class_name = _class_name,
            status = _status,
            student_name = _student_name,
            admission_no = _admission_no,
            term = _term,
            academic_year = _academic_year
        WHERE id = _id;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM exams_attendance WHERE id = _id;
    ELSEIF query_type = 'select-class' THEN

            SELECT 
            admission_no,
            student_name,
            DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
            `status`,
            notes
        FROM 
            exams_attendance
        WHERE 
            class_name = _class_name
            AND DATE(created_at) BETWEEN DATE(_start_date) AND DATE(_end_date)
        ORDER BY 
            admission_no, created_at;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_calendar` (IN `query_type` VARCHAR(50), IN `in_id` INT UNSIGNED, IN `in_admin_id` INT, IN `in_exam_name` VARCHAR(100), IN `in_academic_year` VARCHAR(45), IN `in_term` VARCHAR(50), IN `in_start_date` DATE, IN `in_end_date` DATE, IN `in_status` VARCHAR(30))   BEGIN
    IF query_type = 'create' THEN
        INSERT INTO exam_calendar (admin_id, exam_name, academic_year, term, start_date, end_date)
        VALUES (in_admin_id, in_exam_name, in_academic_year, in_term, in_start_date, in_end_date);

    ELSEIF query_type = 'update' THEN
        UPDATE exam_calendar
        SET exam_name = COALESCE(in_exam_name,exam_name),
            academic_year = COALESCE(in_academic_year,academic_year),
            term = COALESCE(in_term,term),
            start_date = COALESCE(in_start_date,start_date),
            end_date = COALESCE(in_end_date,end_date),
            status = COALESCE(in_status, status)
        WHERE id = in_id;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM exam_calendar
        WHERE id = in_id;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM exam_calendar
          WHERE (academic_year = in_academic_year OR in_academic_year IS NULL)
          AND (term = in_term OR in_term IS NULL)
          AND  (status = in_status OR in_status IS NULL)
          AND  in_end_date  BETWEEN start_date AND end_date;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM exam_calendar;

    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_creation` (IN `query_type` VARCHAR(100), IN `in_id` CHAR(100), IN `in_teacher_id` INT(20), IN `in_assessment_type` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_term` VARCHAR(100), IN `in_subject_name` VARCHAR(100), IN `in_commence_date` DATE, IN `in_start_time` TIME, IN `in_end_time` TIME, IN `in_status` VARCHAR(20))   BEGIN
DECLARE total_questions INT;
DECLARE total_marks INT;

IF query_type = "create" THEN
SELECT COUNT(id) INTO total_questions FROM exam_questions WHERE exam_id=in_id;
SELECT COUNT(marks) INTO total_marks FROM exam_questions WHERE exam_id=in_id;

INSERT INTO exam_creation(id,teacher_id, assessment_type, class_name,term, subject_name, commence_date, start_time, end_time,status)
VALUES (in_id,in_teacher_id, in_assessment_type, in_class_name,in_term, in_subject_name, in_commence_date, in_start_time, in_end_time,in_status);

ELSEIF query_type ="select-teacher-exams" THEN
SELECT x.*,(SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_questions,(SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_marks, CONCAT(x.class_name, ' ', x.term, '  ', x.subject_name, ' ', x.assessment_type ) AS assessment_type  FROM exam_creation x WHERE  x.teacher_id = in_teacher_id;

ELSEIF query_type ="select-student-exams" THEN
SELECT x.*,(SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_questions,(SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_marks, CONCAT(x.class_name, ' ', x.term, '  ', x.subject_name, ' ', x.assessment_type ) AS assessment_type  FROM exam_creation x WHERE  x.status = "completed";

ELSEIF query_type = "select" THEN 
	SELECT x.*, (SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_questions,(SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_marks, CONCAT(x.class_name, ' ', x.term, '  ',x.assessment_type ) AS assessment_type  FROM exam_creation x WHERE x.status = "inprogress";
    

ELSEIF query_type = "by_id" THEN
SELECT x.*,(SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_questions,(SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_marks, CONCAT(x.subject_name, ' ', x.assessment_type ) AS assessment_type  FROM exam_creation x WHERE id = in_id;

ELSEIF query_type = "status" THEN 
UPDATE ⁠exam_creation⁠ SET status = in_status where id = in_id;

END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_drading` (IN `_admission_no` VARCHAR(30), IN `_student_name` VARCHAR(30), IN `_classname` VARCHAR(30), IN `_subject` VARCHAR(30), IN `_CA_marks` INT, IN `_Ass_marks` INT, IN `_exam_marks` INT, IN `_term` INT, IN `_academic_year` INT)   BEGIN
    INSERT INTO exam_grading(
        admission_no,
        student_name,
        classname,
        subject,
        CA_marks,
        Ass_marks,
        exam_marks,
        total_score,
        term,
        academic_year
    ) 
    VALUES (
        _admission_no,
        _student_name,
        _classname,
        _subject,
        _CA_marks,
        _Ass_marks,
        _exam_marks,
        (_CA_marks + _Ass_marks + _exam_marks),
        _term,
        _academic_year
    );
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_grading` (IN `query_type` VARCHAR(50), IN `_admission_no` VARCHAR(30), IN `_student_name` VARCHAR(50), IN `_classname` VARCHAR(50), IN `_subject` VARCHAR(50), IN `_CA_marks` INT, IN `_Ass_marks` INT, IN `_exam_marks` INT, IN `_term` VARCHAR(30), IN `_academic_year` VARCHAR(20))   BEGIN
IF query_type='create' THEN
    INSERT INTO exam_grading(
        admission_no,
        student_name,
        classname,
        subject,
        CA_marks,
        Ass_marks,
        exam_marks,
        total_score,
        term,
        academic_year
    ) 
    VALUES (
        _admission_no,
        _student_name,
        _classname,
        _subject,
        _CA_marks,
        _Ass_marks,
        _exam_marks,
        (_CA_marks + _Ass_marks + _exam_marks),
        _term,
        _academic_year
    ) ON DUPLICATE KEY UPDATE
    CA_marks = VALUES(_CA_marks),
    Ass_marks = VALUES(_Ass_marks),
    exam_marks = VALUES(_exam_marks),
    exam_marks = VALUES(_exam_marks),
    total_score = (exam_grading.CA_marks + exam_grading.Ass_marks + exam_grading.exam_marks);
    
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_questions` (IN `query_type` VARCHAR(100), IN `in_id` CHAR(100), IN `in_exam_id` VARCHAR(100), IN `in_question` VARCHAR(400), IN `in_marks` INT(100), IN `in_option1` VARCHAR(200), IN `in_option2` VARCHAR(200), IN `in_option3` VARCHAR(200), IN `in_option4` VARCHAR(200), IN `in_answer` VARCHAR(200))   BEGIN
IF query_type = "create" THEN
INSERT INTO `exam_questions` (id,exam_id, question, marks, option1, option2, option3, option4, answer)
VALUES (in_id,in_exam_id, in_question, in_marks, in_option1, in_option2, in_option3, in_option4, in_answer);

ELSEIF query_type = "select" THEN 
SELECT t.*,concat(u.subject_name, ' ', u.term, ' ',u.assessment_type) AS exam,u.status FROM `exam_questions` t JOIN exam_creation u on t.exam_id = u.id WHERE exam_id = in_exam_id;

ELSEIF query_type = "delete" THEN
DELETE FROM `exam_questions` WHERE id = in_id;

ELSEIF query_type = "update" THEN
UPDATE `exam_questions` SET `question`=in_question,`marks`=in_marks,`option1`=in_option1,`option2`=in_option2,`option3`=in_option3,`option4`=in_option4,`answer`=in_answer WHERE id = in_id;

END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_subject` (IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_score` INT(100), IN `in_status` VARCHAR(100))   BEGIN 
IF query_type="create" THEN
INSERT INTO `exams_subject`(id, application_no, subject, score, status)
VALUES (in_id,in_application_no,in_subject,in_score,in_status);

ELSEIF query_type="select" THEN
SELECT * FROM `exams_subject`;
END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_subjects` (IN `query_type` VARCHAR(100), IN `in_id` INT(100), IN `in_application_no` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_score` INT(100), IN `in_status` VARCHAR(100))   BEGIN 
IF query_type="create" THEN
INSERT INTO exams_subject(application_no, subject)
VALUES (in_application_no,in_subject);

ELSEIF query_type="update" AND in_application_no IS NOT NULL AND in_application_no !='' THEN
	UPDATE exams_subject SET status = in_status, score=in_score WHERE application_no =in_application_no;
ELSEIF query_type="select" THEN
	SELECT * FROM exams_subject;
END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_table` (IN `query_type` VARCHAR(100), IN `in_id` INT, IN `in_exam_id` CHAR(100), IN `in_question_id` CHAR(100), IN `in_student_id` VARCHAR(50), IN `in_class_name` VARCHAR(100), IN `in_question` VARCHAR(300), IN `in_selected_option` VARCHAR(200), IN `in_response` VARCHAR(200), IN `in_answer` VARCHAR(200), IN `in_mark` INT(100), IN `in_remarks` VARCHAR(200))   BEGIN
IF query_type = "create" THEN
INSERT INTO `exam_table` (exam_id,question_id,student_id,class_name,question,selected_option,response,answer,mark,remarks)
VALUES(in_exam_id,in_question_id,in_student_id,in_class_name,in_question,in_selected_option,in_response,in_answer,in_mark,in_remarks);

ELSEIF query_type = "get_student_exam" THEN
SELECT
	t.*,
    s.student_name,
    s.admission_no
    FROM `exam_table` t 
    JOIN students s
    ON t.student_id = s.admission_no
    WHERE t.student_id = in_student_id AND t.exam_id = in_exam_id;
    
ELSEIF query_type = "get_results" THEN 
SELECT 
    s.student_name, 
    s.admission_no,
    SUM(CASE WHEN e.remarks = 'correct' THEN e.mark ELSE 0 END) AS total_score,
    SUM(e.mark) AS total_marks,
    concat(u.subject_name, ' ', u.assessment_type) as assessment_type
FROM 
    exam_table e
JOIN 
    students s 
ON 
    e.student_id = s.admission_no
JOIN 
   exam_creation u 
ON
  e.exam_id = u.id
GROUP BY 
    s.student_name, 
    s.admission_no, 
    e.exam_id
   HAVING e.exam_id = in_exam_id;
END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `genericSchoolFees` (IN `query_type` VARCHAR(20), IN `in_id` INT, IN `in_section` VARCHAR(50), IN `in_description` VARCHAR(100), IN `in_class_name` VARCHAR(50), IN `in_fees` DECIMAL(8,2), IN `in_term` VARCHAR(50), IN `in_academic_year` VARCHAR(9), IN `in_status` ENUM('Active','Inactive'), IN `in_created_by` VARCHAR(50), IN `in_school_id` VARCHAR(20))   BEGIN
    IF query_type = 'INSERT' THEN
        INSERT INTO generic_school_fees (section, description, class_name, fees, term, academic_year, status, created_by, school_id)
        VALUES (in_section, in_description, in_class_name, in_fees, in_term, in_academic_year, COALESCE(in_status, 'Active'), in_created_by, in_school_id);
    
    ELSEIF query_type = 'UPDATE' THEN
        UPDATE generic_school_fees
        SET section = COALESCE(in_section, section),
            description = COALESCE(in_description, description),
            class_name = COALESCE(in_class_name, class_name),
            fees = COALESCE(in_fees, fees),
            term = COALESCE(in_term, term),
            academic_year = COALESCE(in_academic_year, academic_year),
            status = COALESCE(in_status, status),
            created_by = COALESCE(in_created_by, created_by),
            school_id = COALESCE(in_school_id, school_id)
        WHERE id = in_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM generic_school_fees WHERE id = in_id;

    ELSEIF query_type = 'SELECT' THEN
        SELECT * FROM generic_school_fees 
        WHERE (in_id IS NULL OR id = in_id)
          AND (in_section IS NULL OR section = in_section)
          AND (in_description IS NULL OR description LIKE CONCAT('%', in_description, '%'))
          AND (in_class_name IS NULL OR class_name = in_class_name)
          AND (in_fees IS NULL OR fees = in_fees)
          AND (in_term IS NULL OR term = in_term)
          AND (in_academic_year IS NULL OR academic_year = in_academic_year)
          AND (in_status IS NULL OR status = in_status)
          AND (in_school_id IS NULL OR school_id = in_school_id);
    
    ELSE
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid query_type specified';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_class_results` (IN `query_type` VARCHAR(30), IN `in_admission_no` VARCHAR(30), IN `in_class_name` VARCHAR(30), IN `in_academic_year` VARCHAR(30), IN `in_term` VARCHAR(30), IN `in_school_id` VARCHAR(30))   BEGIN
  IF query_type = 'Select Class Reports' THEN
    SELECT *
    FROM exam_reports
    WHERE school_id = in_school_id 
      AND class_name = in_class_name 
      AND academic_year = in_academic_year
      AND term = in_term
    ORDER BY student_name DESC;

  ELSEIF query_type = 'Select Joined Class Reports' THEN
    SELECT 
      s.current_class AS class_name, 
      s.admission_no, 
      s.student_name, 
      COALESCE(SUM(CASE WHEN e.type = 'Academic' THEN 1 ELSE 0 END), 0) AS subjects_count, -- Corrected subjects_count
      COALESCE(e.academic_year, '') AS academic_year,  
      COALESCE(e.term, '') AS term, 
      COALESCE(SUM(CASE WHEN e.type = 'Academic' THEN e.ca1Score ELSE 0 END), 0) AS total_assignment_score,
      COALESCE(SUM(CASE WHEN e.type = 'Academic' THEN e.ca2Score ELSE 0 END), 0) AS total_ca_score,
      COALESCE(SUM(CASE WHEN e.type = 'Academic' THEN e.examScore ELSE 0 END), 0) AS total_exam_score,
      COALESCE(SUM(CASE WHEN e.type = 'Academic' THEN e.total_score ELSE 0 END), 0) AS total_score, 
      CASE 
          WHEN SUM(COALESCE(sub.total_ca1_score, 0) + COALESCE(sub.total_ca2_score, 0) + COALESCE(sub.total_exam_score, 0)) > 0 
          THEN COALESCE(SUM(CASE WHEN e.type = 'Academic' THEN e.total_score ELSE 0 END), 0) 
              / NULLIF(SUM(COALESCE(sub.total_ca1_score, 0) + COALESCE(sub.total_ca2_score, 0) + COALESCE(sub.total_exam_score, 0)), 0)
          ELSE 0 
      END AS avg_score,
      s.school_id AS school_id 
    FROM students s 
    LEFT JOIN exam_reports e 
        ON s.current_class = e.class_name 
        AND s.admission_no = e.admission_no 
    LEFT JOIN subjects sub 
        ON e.subject = sub.subject
    WHERE 
      s.school_id = in_school_id 
      AND s.current_class = in_class_name
    GROUP BY 
      s.current_class, 
      s.admission_no, 
      s.student_name, 
      e.academic_year, 
      e.term, 
      s.school_id
    ORDER BY s.student_name DESC;

  ELSEIF query_type = 'Select Class Summary' THEN
    SELECT 
        student_name, 
        admission_no, 
        SUM(total_score) AS total_score, 
        COUNT(CASE WHEN type = 'Academic' THEN 1 ELSE NULL END) AS subjects_count -- Added subjects_count
    FROM exam_reports
    WHERE school_id = in_school_id 
      AND class_name = in_class_name 
      AND academic_year = in_academic_year
    GROUP BY student_name, admission_no  
    ORDER BY total_score DESC;

  ELSEIF query_type = 'Select Student Report' THEN
    SELECT 
        admission_no, 
        SUM(total_score) AS total_score, 
        COUNT(CASE WHEN type = 'Academic' THEN 1 ELSE NULL END) AS subjects_count -- Added subjects_count
    FROM exam_reports 
    WHERE admission_no = in_admission_no  
    GROUP BY admission_no  
    ORDER BY total_score DESC;

  ELSEIF query_type = 'Select Student Draft' THEN
    SELECT *, 
      COUNT(CASE WHEN type = 'Academic' THEN 1 ELSE NULL END) AS subjects_count -- Added subjects_count
    FROM exam_reports 
    WHERE admission_no = in_admission_no 
      AND class_name = in_class_name 
      AND term = in_term 
      AND academic_year = in_academic_year;

  END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_results` (IN `query_type` VARCHAR(100))   BEGIN 

IF query_type = "select-all" THEN 
	SELECT * FROM exam_grading;
ELSEIF query_type = "select" THEN 
SELECT 
    ssef.admission_no AS admission_no,
    ssef.name_of_applicant AS student_name,
    ssef.current_class AS student_class,  -- Added student class


    MAX(CASE WHEN sm.subject = 'English' THEN sg.total_score ELSE 0 END) AS English,
    MAX(CASE WHEN sm.subject = 'Islamic' THEN sg.total_score ELSE 0 END) AS Islamic,
    MAX(CASE WHEN sm.subject = 'Physics' THEN sg.total_score ELSE 0 END) AS Physics,
    MAX(CASE WHEN sm.subject = 'Chemistry' THEN sg.total_score ELSE 0 END) AS Chemistry,
    MAX(CASE WHEN sm.subject = 'Math' THEN sg.total_score ELSE 0 END) AS Maths,
    MAX(CASE WHEN sm.subject = 'Computer' THEN sg.total_score ELSE 0 END) AS Computer,
    MAX(CASE WHEN sm.subject = 'Economics' THEN sg.total_score ELSE 0 END) AS `Economics`,
    

    SUM(sg.total_score) AS total_score,

    
    (SUM(sg.total_score) / 
     (SELECT SUM(sm.exam_pass_mark) 
      FROM subject_management sm 
      WHERE sm.select_class = ssef.class)) * 100 AS percentage,


    CASE 
        WHEN (SUM(sg.total_score) / (SELECT SUM(sm.exam_pass_mark) FROM subject_management sm WHERE sm.select_class = ssef.class)) * 100 >= 90 THEN 'A+'
        WHEN (SUM(sg.total_score) / (SELECT SUM(sm.exam_pass_mark) FROM subject_management sm WHERE sm.select_class = ssef.class)) * 100 >= 80 THEN 'A'
        WHEN (SUM(sg.total_score) / (SELECT SUM(sm.exam_pass_mark) FROM subject_management sm WHERE sm.select_class = ssef.class)) * 100 >= 70 THEN 'B+'
        WHEN (SUM(sg.total_score) / (SELECT SUM(sm.exam_pass_mark) FROM subject_management sm WHERE sm.select_class = ssef.class)) * 100 >= 60 THEN 'B'
        WHEN (SUM(sg.total_score) / (SELECT SUM(sm.exam_pass_mark) FROM subject_management sm WHERE sm.select_class = ssef.class)) * 100 >= 50 THEN 'C'
        ELSE 'F'
    END AS grade,


    CASE 
        WHEN (SUM(sg.total_score) / (SELECT SUM(sm.exam_pass_mark) FROM subject_management sm WHERE sm.select_class = ssef.class)) * 100 >= 50 THEN 'Pass'
        ELSE 'Fail'
    END AS result

FROM 
    secondary_school_entrance_form ssef
JOIN 
    exam_grading sg ON ssef.admission_no = sg.admission_no
JOIN 
    subject_management sm ON sg.subject = sm.subject 
    AND ssef.current_class = sm.select_class

GROUP BY 
    ssef.admission_no

ORDER BY 
    ssef.admission_no;
    
    
    END IF;
    END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `grades` (IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_grade` INT(50), IN `in_percentage` INT(14), IN `in_point` INT(50), IN `in_status` ENUM('Active','Inactive'))   BEGIN IF query_type="create" THEN INSERT INTO `grades` (grade, percentage,point,status) VALUES (in_grade, in_percentage, in_point, in_status); ELSEIF query_type="select" THEN SELECT * FROM `grades` WHERE id=in_id; ELSEIF query_type="select-all" THEN SELECT * FROM `grades`; END IF; END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `grade_setup` (IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_grade` VARCHAR(50), IN `in_remark` VARCHAR(50), IN `in_min_score` INT(3), IN `in_max_score` INT(3), IN `in_status` VARCHAR(30))   BEGIN 
    IF query_type="create" THEN 
        INSERT INTO `grade_setup` (grade, remark,min_score,max_score) 
        VALUES (in_grade, in_remark, in_min_score, in_max_score); 
    ELSEIF query_type="select" THEN 
        SELECT * FROM `grade_setup` WHERE id=in_id; 
    ELSEIF query_type="select-all" THEN 
        SELECT * FROM `grade_setup`; 
     ELSEIF query_type = 'UPDATE' THEN
        UPDATE grade_setup
            SET 
            grade = COALESCE(in_grade,grade),
            remark = COALESCE(in_remark,remark),
            min_score = COALESCE(in_min_score,min_score),
            max_score = COALESCE(in_max_score,max_score),
            status = COALESCE(in_status,status)
        WHERE id = in_id;
     ELSEIF query_type = 'DELETE' THEN
        DELETE FROM grade_setup
        WHERE id = in_id;
    END IF; 
    END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `Guardians` (IN `query_type` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `p_guardian_id` VARCHAR(20), IN `p_applicant_id` VARCHAR(20), IN `p_guardian_name` VARCHAR(100), IN `p_guardian_address` VARCHAR(255), IN `p_guardian_email` VARCHAR(200), IN `p_guardian_phone_no` VARCHAR(20))   BEGIN
    IF query_type = 'create' THEN
        INSERT INTO `gurdians_table`(
            `school_id`, `guardian_id`, `guardian_name`, `guardian_address`, `guardian_email`, `guardian_phone_no`
        ) 
        VALUES (
            p_school_id, p_guardian_id, p_guardian_name, p_guardian_address, p_guardian_email, p_guardian_phone_no
        );
    
    ELSEIF query_type = 'update' THEN
        UPDATE `gurdians_table`
        SET `guardian_name` = p_guardian_name,
            `guardian_address` = p_guardian_address,
            `guardian_email` = p_guardian_email,
            `guardian_phone_no` = p_guardian_phone_no
        WHERE `guardian_id` = p_guardian_id;
    
    ELSEIF query_type = 'delete' THEN
        DELETE FROM `gurdians_table` WHERE `guardian_id` = p_guardian_id;
    
    ELSEIF query_type = 'select' THEN
        SELECT * FROM `gurdians_table` WHERE `guardian_id` = p_guardian_id OR `guardian_id` IS NULL
        AND `school_id` = p_school_id;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `insert_transaction` (IN `p_student_id` INT(100), IN `p_revenue_head_id` INT(100), IN `p_amount_paid` DECIMAL(10,2), IN `p_payment_method` VARCHAR(100), IN `p_transaction_reference` VARCHAR(100))   BEGIN
    -- Insert a new transaction record into the transactions table
    INSERT INTO `transactions`(
        `student_id`, 
        `revenue_head_id`, 
        `amount_paid`, 
        `payment_date`, 
        `payment_method`, 
        `transaction_reference`, 
        `payment_status`, 
        `document_status`, 
        `print_count`, 
        `print_by`
    )
    VALUES (
        p_student_id, 
        p_revenue_head_id, 
        p_amount_paid, 
        CURRENT_TIMESTAMP, 
        p_payment_method, 
        p_transaction_reference, 
        'Pending', -- Default payment status
        'Saved',    -- Default document status
        0,          -- Default print count
        ''          -- Default print_by (empty)
    );
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `leaveRecords` (IN `query_type` VARCHAR(10), IN `in_record_id` INT, IN `in_user_id` VARCHAR(50), IN `in_user_role` VARCHAR(50), IN `in_user_name` VARCHAR(50), IN `in_class_name` VARCHAR(50), IN `in_type` VARCHAR(50), IN `in_start_date` DATE, IN `in_end_date` DATE, IN `in_no_of_days` INT, IN `in_applied_on` DATE, IN `in_status` ENUM('Pending','Approved','Rejected'), IN `in_approved_by` VARCHAR(50), IN `in_approved_on` DATE, IN `in_school_location` VARCHAR(200))   BEGIN
    IF query_type = 'CREATE' THEN
        -- Insert a new leave record
        INSERT INTO leave_records (
            user_role, user_id, user_name, class_name, type, start_date, end_date,
            no_of_days, applied_on, approved_by, school_location
        ) VALUES (
            in_user_role, in_user_id,  in_user_name, in_class_name, in_type, in_start_date, in_end_date,
            in_no_of_days, DATE(NOW()), in_approved_by,in_school_location
        );
    ELSEIF query_type = 'UPDATE' THEN
        -- Update an existing leave record
        UPDATE leave_records
        SET
            user_role = in_user_role,
            user_id = in_user_id,
            user_name = in_user_name,
            class_name = in_class_name,
            type = in_type,
            start_date = in_start_date,
            end_date = in_end_date,
            no_of_days = in_no_of_days,
            applied_on = in_applied_on,
            status = in_status,
            approved_by = in_approved_by
        WHERE id = in_record_id;
    ELSEIF query_type = 'select' THEN

        SELECT * FROM `leave_records`
          WHERE (user_id = in_user_id OR in_user_id IS NULL)
          AND (type = in_type OR in_type IS NULL)
          AND (applied_on = in_applied_on OR in_applied_on IS NULL)
          AND (user_name = in_user_name OR in_user_name IS NULL)
          AND (class_name = in_class_name OR in_class_name IS NULL)
          AND (approved_by = in_approved_by OR in_approved_by IS NULL)
          AND (school_location = in_school_location OR in_school_location IS NULL);

    ELSEIF query_type = 'DELETE' THEN
        -- Delete a leave record
        DELETE FROM leave_records
        WHERE id = in_record_id;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid operation type. Use CREATE, UPDATE, or DELETE.';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `lessons` (IN `in_query_type` VARCHAR(10), IN `in_assignment_id` INT, IN `in_class_name` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_lesson_date` DATE, IN `in_attachment` VARCHAR(255), IN `in_content` MEDIUMTEXT, IN `in_teacher` VARCHAR(100), IN `in_title` VARCHAR(100))   BEGIN
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `lesson_comments` (IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_lesson_id` INT(10), IN `in_user_id` INT(10), IN `in_user_name` VARCHAR(30), IN `in_user_role` VARCHAR(10), IN `in_parent_id` INT(11), IN `in_comment` VARCHAR(500))   BEGIN
 IF query_type="create" THEN
 INSERT INTO lesson_comments (lesson_id, user_id, user_name, user_role, comment, parent_id) 
 VALUES (in_lesson_id, in_user_id, in_user_name, in_user_role, in_comment, in_parent_id);
 
  ELSEIF  query_type="select" THEN
  SELECT * FROM lesson_comments WHERE lesson_id = in_lesson_id;
 END IF;
 
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `lesson_time_table` (IN `query_type` VARCHAR(50), IN `in_id` VARCHAR(50), IN `in_day` VARCHAR(20), IN `in_class_name` VARCHAR(50), IN `in_subject` VARCHAR(50), IN `in_teacher_id` INT(10), IN `in_section` VARCHAR(50), IN `in_school_location` VARCHAR(150), IN `in_start_time` VARCHAR(20), IN `in_end_time` VARCHAR(20), IN `in_status` VARCHAR(50), IN `in_school_id` INT(10))   BEGIN
    IF query_type = 'create' THEN
        INSERT INTO lesson_time_table(day, class_name, subject, teacher_id, section, school_location, start_time, end_time, school_id)
        VALUES (in_day, in_class_name, in_subject, in_teacher_id, in_section, in_school_location, in_start_time, in_end_time, in_school_id);
    
    ELSEIF query_type = 'update' THEN
        UPDATE lesson_time_table
        SET day = in_day,
            class_name = in_class_name,
            subject = in_subject,
            teacher_id = in_teacher_id,
            section = in_section,
            school_location = in_school_location,
            start_time = in_start_time,
            end_time = in_end_time,
            status = in_status,
            school_id = in_school_id
        WHERE id = in_id;
    
    ELSEIF query_type = 'select-all' THEN
        SELECT x.*, (SELECT y.name FROM teachers y WHERE y.id = x.teacher_id) AS teacher  
        FROM lesson_time_table x 
        WHERE x.status = 'Active';
    
    ELSEIF query_type = 'select' THEN
    SELECT l.*,t.name FROM lesson_time_table l LEFT JOIN teachers t ON l.teacher_id = t.id 
    WHERE section = in_section;
    
    ELSEIF query_type = 'select-class-subjects' THEN
    SELECT l.*,t.name FROM lesson_time_table l LEFT JOIN teachers t ON l.teacher_id = t.id 
    WHERE section = in_section AND class_name = in_class_name;
    
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `libraryCatalogue` (IN `query_type` ENUM('CREATE','UPDATE','RETURN','SELECT'), IN `in_book_title` VARCHAR(255), IN `in_author` VARCHAR(255), IN `in_isbn` VARCHAR(20), IN `in_cover_img` VARCHAR(500), IN `in_borrower_name` VARCHAR(255), IN `in_date_borrowed` DATE, IN `in_due_date` DATE, IN `in_return_date` DATE, IN `in_status` ENUM('Available','Borrowed','Overdue'), IN `in_qty` INT, IN `in_post_date` DATE, IN `in_rack_no` VARCHAR(255), IN `in_publisher` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_book_no` VARCHAR(50), IN `in_record_id` INT)   BEGIN
    -- Adding a new book record
    IF query_type = 'CREATE' THEN
        INSERT INTO library_catalogue (
            book_title, author, isbn, cover_img, borrower_name, date_borrowed, due_date, status, qty, post_date, rack_no, publisher, subject, book_no
        )
        VALUES (
            in_book_title, in_author, in_isbn, in_cover_img, in_borrower_name, in_date_borrowed, in_due_date, in_status, in_qty, in_post_date, in_rack_no, in_publisher, in_subject, in_book_no
        );

    -- Updating an existing book record using COALESCE
    ELSEIF query_type = 'UPDATE' THEN
        UPDATE library_catalogue
        SET 
            book_title = COALESCE(in_book_title, library_catalogue.book_title),
            author = COALESCE(in_author, library_catalogue.author),
            isbn = COALESCE(in_isbn, library_catalogue.isbn),
            cover_img = COALESCE(in_cover_img, library_catalogue.cover_img),
            borrower_name = COALESCE(in_borrower_name, library_catalogue.borrower_name),
            date_borrowed = COALESCE(in_date_borrowed, library_catalogue.date_borrowed),
            due_date = COALESCE(in_due_date, library_catalogue.due_date),
            status = COALESCE(in_status, library_catalogue.status),
            qty = COALESCE(in_qty, library_catalogue.qty),
            post_date = COALESCE(in_post_date, library_catalogue.post_date),
            rack_no = COALESCE(in_rack_no, library_catalogue.rack_no),
            publisher = COALESCE(in_publisher, library_catalogue.publisher),
            subject = COALESCE(in_subject, library_catalogue.subject),
            book_no = COALESCE(in_book_no, library_catalogue.book_no)
        WHERE id = in_record_id;

    -- Marking a book as returned
    ELSEIF query_type = 'RETURN' THEN
        UPDATE library_catalogue
        SET 
            return_date = in_return_date,
            status = 'Available',
            borrower_name = NULL,
            date_borrowed = NULL,
            due_date = NULL
        WHERE id = in_record_id;
    ELSEIF  query_type='SELECT' THEN
        SELECT * FROM library_catalogue
          WHERE (record_id = in_record_id OR in_record_id IS NULL)
          AND (book_title = in_book_title OR in_book_title IS NULL)
          AND  (status = in_status OR in_status IS NULL)
          AND  due_date  BETWEEN in_due_date AND in_due_date;

    ELSEIF   query_type='SELECT-ALL' THEN
        SELECT * FROM library_catalogue;

    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `ManageCalendarEvents` (IN `operation` VARCHAR(10), IN `event_id` INT, IN `title` VARCHAR(255), IN `start_date` DATETIME, IN `end_date` DATETIME, IN `school_location` VARCHAR(150), IN `status` ENUM('Active','Inactive','Cancelled'), IN `created_by` VARCHAR(50), IN `recurrence` ENUM('Once','Annual'))   BEGIN
    IF operation = 'CREATE' THEN
        INSERT INTO calendar_events (title, start_date, end_date, school_location, status, created_by, recurrence)
        VALUES (title, start_date, end_date, school_location, status, created_by, recurrence);
        
    ELSEIF operation = 'UPDATE' THEN
        UPDATE calendar_events
        SET title = title,
            start_date = start_date,
            end_date = end_date,
            school_location = school_location,
            status = status,
            created_by = created_by,
            recurrence = recurrence,
            updated_at = NOW()
        WHERE id = event_id;
        
    ELSEIF operation = 'DELETE' THEN
        DELETE FROM calendar_events
        WHERE id = event_id;
        
    ELSEIF operation = 'SELECT' THEN
        SELECT * 
        FROM calendar_events
        WHERE (event_id IS NULL OR id = event_id) -- Filter by event ID if provided
          AND (title IS NULL OR title LIKE CONCAT('%', title, '%')) -- Filter by title (partial match)
          AND (start_date IS NULL OR start_date >= start_date) -- Filter by start date
          AND (end_date IS NULL OR end_date <= end_date) -- Filter by end date
          AND (school_location IS NULL OR school_location LIKE CONCAT('%', school_location, '%')) -- Filter by school location
          AND (status IS NULL OR status = status) -- Filter by status
          AND (created_by IS NULL OR created_by = created_by) -- Filter by creator
          AND (recurrence IS NULL OR recurrence = recurrence); -- Filter by recurrence
          
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid operation specified';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `ManageRules` (IN `queryType` VARCHAR(10), IN `ruleID` INT, IN `ruleName` VARCHAR(100), IN `startTime` TIME, IN `endTime` TIME, IN `locationIsBoolean` BOOLEAN)   BEGIN
    IF queryType = 'insert' THEN
        INSERT INTO rules (rule_name, start_time, end_time, location_is_boolean, created_at, updated_at)
        VALUES (ruleName, startTime, endTime, locationIsBoolean, NOW(), NOW());
    ELSEIF queryType = 'get_one' THEN
        SELECT * FROM rules WHERE id = ruleID;
    ELSEIF queryType = 'get_all' THEN
        SELECT * FROM rules;
    ELSEIF queryType = 'edit' THEN
        UPDATE rules
        SET rule_name = ruleName,
            start_time = startTime,
            end_time = endTime,
            location_is_boolean = locationIsBoolean,
            updated_at = NOW()
        WHERE id = ruleID;
    ELSEIF queryType = 'delete' THEN
        DELETE FROM rules WHERE id = ruleID;
    ELSE
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid query type. Use insert, get_one, get_all, edit, or delete.';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `ManageSyllabus` (IN `op_type` VARCHAR(10), IN `p_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_level` INT, IN `p_academic_year` YEAR, IN `p_term` VARCHAR(50), IN `p_week_no` TINYINT, IN `p_title` VARCHAR(300), IN `p_content` TEXT)   BEGIN
    -- INSERT operation
    IF op_type = 'INSERT' THEN
        INSERT INTO syllabus (subject, class_level, academic_year, term, week_no, title, content)
        VALUES (p_subject, p_class_level, p_academic_year, p_term, p_week_no, p_title, p_content);

    -- UPDATE operation
    ELSEIF op_type = 'UPDATE' THEN
        UPDATE syllabus
        SET 
            subject = COALESCE(p_subject, subject),
            class_level = COALESCE(p_class_level, class_level),
            academic_year = COALESCE(p_academic_year, academic_year),
            term = COALESCE(p_term, term),
            week_no = COALESCE(p_week_no, week_no),
            title = COALESCE(p_title, title),
            content = COALESCE(p_content, content),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_id;

    -- DELETE operation
    ELSEIF op_type = 'DELETE' THEN
        DELETE FROM syllabus WHERE id = p_id;

    -- SELECT operation
    ELSEIF op_type = 'SELECT' THEN
        SELECT * FROM syllabus
        WHERE (id = p_id OR p_id IS NULL)
          AND (subject = p_subject OR p_subject IS NULL)
          AND (class_level = p_class_level OR p_class_level IS NULL)
          AND (academic_year = p_academic_year OR p_academic_year IS NULL)
          AND (term = p_term OR p_term IS NULL)
          AND (week_no = p_week_no OR p_week_no IS NULL)
          AND (title LIKE CONCAT('%', p_title, '%') OR p_title IS NULL);


    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_attendance` (IN `query_type` VARCHAR(20), IN `p_attendance_id` INT, IN `p_name` VARCHAR(255), IN `p_className` VARCHAR(255), IN `p_role` VARCHAR(255), IN `p_department` VARCHAR(255), IN `p_date` DATE, IN `p_check_in_time` TIME, IN `p_check_out_time` TIME)   BEGIN
    DECLARE v_remarks VARCHAR(255);
    DECLARE v_rule_name VARCHAR(255);
    
    -- Check-in process
    IF query_type = 'check_in' THEN
        -- Determine rule based on check-in time
        SELECT rule_name INTO v_rule_name 
        FROM rules 
        WHERE p_check_in_time BETWEEN start_time AND end_time 
        LIMIT 1;

        -- Set remarks
        IF v_rule_name IS NOT NULL THEN
            SET v_remarks = CONCAT('Checked in under: ', v_rule_name);
        ELSE
            SET v_remarks = 'Checked in outside defined rules';
        END IF;
        
        -- Insert attendance record
        INSERT INTO attendance (
            name, class_name, role, department, date,
            check_in_time, check_out_time, status, remarks
        ) VALUES (
            p_name, p_className, p_role, p_department, p_date,
            p_check_in_time, NULL, 'Present', v_remarks
        );

    -- Check-out process
    ELSEIF query_type = 'check_out' THEN
        -- Update the existing record with check-out time
        UPDATE attendance
        SET check_out_time = p_check_out_time
        WHERE name = p_name AND date = p_date AND check_out_time IS NULL;
    
    -- Get all records
    ELSEIF query_type = 'get_all' THEN
        SELECT * FROM attendance;
    
    -- Get single record
    ELSEIF query_type = 'get_one' THEN
        SELECT * FROM attendance WHERE attendance_id = p_attendance_id;
    
    -- Delete single record
    ELSEIF query_type = 'delete_one' THEN
        DELETE FROM attendance WHERE attendance_id = p_attendance_id;
    
    -- Delete all records
    ELSEIF query_type = 'delete_all' THEN
        DELETE FROM attendance;
    
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_branches` (IN `query_type` VARCHAR(50), IN `branch_id` INT, IN `school_id` VARCHAR(20), IN `location` VARCHAR(200), IN `short_name` VARCHAR(10), IN `status` ENUM('Active','Inactive'))   BEGIN
  -- Create a new branch
  IF query_type = 'create' THEN
    INSERT INTO school_locations (school_id, location, short_name, status)
    VALUES (school_id, location, short_name, status);
    SELECT LAST_INSERT_ID() AS branch_id;

  -- Get all branches for a specific school
  ELSEIF query_type = 'get_all' THEN
    SELECT * FROM school_locations WHERE school_id = school_id;

  -- Get a specific branch by ID
  ELSEIF query_type = 'get_one' THEN
    SELECT * FROM school_locations WHERE id = branch_id;

  -- Update a branch
  ELSEIF query_type = 'update' THEN
    UPDATE school_locations
    SET
      location = IFNULL(location, location),
      short_name = IFNULL(short_name, short_name),
      status = IFNULL(status, status)
    WHERE id = branch_id;

  -- Delete a specific branch
  ELSEIF query_type = 'delete_one' THEN
    DELETE FROM school_locations WHERE id = branch_id;

  -- Delete all branches for a specific school
  ELSEIF query_type = 'delete_all' THEN
    DELETE FROM school_locations WHERE school_id = school_id;

  ELSE
    -- Invalid query_type
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query type';
  END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_expenses` (IN `query_type` VARCHAR(10), IN `expose_id` INT, IN `category_name` VARCHAR(100), IN `source` VARCHAR(100), IN `transaction_type` VARCHAR(50))   BEGIN
    IF query_type = 'insert' THEN
        INSERT INTO exposes (category_name, source, transaction_type, created_at, updated_at)
        VALUES (category_name, source, transaction_type, NOW(), NOW());
    ELSEIF query_type = 'get_one' THEN
        SELECT * FROM exposes WHERE id = expose_id;
    ELSEIF query_type = 'get_all' THEN
        SELECT * FROM exposes;
    ELSEIF query_type = 'edit' THEN
        UPDATE exposes
        SET category_name = category_name,
            source = source,
            transaction_type = transaction_type,
            updated_at = NOW()
        WHERE id = expose_id;
    ELSEIF query_type = 'delete' THEN
        DELETE FROM exposes WHERE id = expose_id;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid query type. Use insert, get_one, get_all, edit, or delete.';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_financial_report` (IN `query_type` VARCHAR(20), IN `report_id` INT, IN `report_date` DATE, IN `report_category` VARCHAR(100), IN `report_description` TEXT, IN `report_amount` DECIMAL(10,2), IN `payment_method` VARCHAR(20))   BEGIN
    DECLARE total_income DECIMAL(10,2) DEFAULT 0;
    DECLARE total_expenses DECIMAL(10,2) DEFAULT 0;

    IF query_type = 'insert' THEN
        -- Insert a new financial report
        INSERT INTO financial_report (date, category, description, amount, payment_method, created_at, updated_at)
        VALUES (report_date, report_category, report_description, report_amount, payment_method, NOW(), NOW());

    ELSEIF query_type = 'get_one' THEN
        -- Retrieve a specific financial report by ID
        SELECT * FROM financial_report WHERE id = report_id;

    ELSEIF query_type = 'get_all' THEN
        -- Retrieve all financial reports
        SELECT * FROM financial_report;

    ELSEIF query_type = 'edit' THEN
        -- Update a financial report by ID
        UPDATE financial_report
        SET date = report_date,
            category = report_category,
            description = report_description,
            amount = report_amount,
            payment_method = payment_method,
            updated_at = NOW()
        WHERE id = report_id;

    ELSEIF query_type = 'delete' THEN
        -- Delete a financial report by ID
        DELETE FROM financial_report WHERE id = report_id;

 ELSEIF query_type = 'income_report' THEN
    -- Generate an income report with all columns and total income, and categories from income
    SELECT 
        fr.category,                                   -- Include category for grouping
        fr.date,                                       -- Example: Include date (You can add others as needed)
        fr.description,                                -- Example: Include description (Add others similarly)
        fr.payment_method,                             -- Example: Include payment_method (Add others as needed)
        SUM(fr.amount) AS total_income,                -- Calculate the total income
        i.income_category_name AS income_category      -- Get the category from the income table
    FROM financial_report fr
    LEFT JOIN income i ON fr.category = i.income_category_name   -- Join with the income table based on category
    WHERE fr.category IN (SELECT income_category_name FROM income) 
    GROUP BY fr.category, fr.date, fr.description, fr.payment_method, i.income_category_name;  -- Group by all non-aggregated columns


    ELSEIF query_type = 'expenses_report' THEN
    -- Generate an expenses report with all columns
    SELECT 
		fr.category,                                   -- Include category for grouping
        fr.date,                                       -- Example: Include date (You can add others as needed)
        fr.description,                                -- Example: Include description (Add others similarly)
        fr.payment_method,    
        SUM(fr.amount) AS total_expenses               -- Calculate the total expenses
    FROM financial_report fr
    LEFT JOIN exposes e 
        ON fr.category = e.category_name              -- Join with the expenses table based on category
    WHERE fr.category IN (SELECT category_name FROM exposes)
    GROUP BY fr.category, fr.date, fr.description, fr.payment_method, fr.amount, e.category_name;

    ELSEIF query_type = 'profit_loss' THEN
        -- Calculate total income
        SELECT 
            SUM(amount) 
        INTO total_income
        FROM financial_report
        WHERE category IN (SELECT income_category_name FROM income);

        -- Calculate total expenses
        SELECT 
            SUM(amount) 
        INTO total_expenses
        FROM financial_report
        WHERE category IN (SELECT category_name FROM exposes);

        -- Return profit/loss details
        SELECT 
            total_income AS total_income,
            total_expenses AS total_expenses,
            (total_income - total_expenses) AS balance;

    ELSE
        -- Handle invalid query type
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid query type. Use insert, get_one, get_all, edit, delete, income_report, expenses_report, or profit_loss.';
    END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_income` (IN `query_type` VARCHAR(10), IN `income_id` INT, IN `income_category_name` VARCHAR(100), IN `income_source` VARCHAR(50), IN `transaction_type` VARCHAR(50))   BEGIN
    IF query_type = 'insert' THEN
        INSERT INTO income (income_category_name, source, transaction_type, created_at, updated_at)
        VALUES (income_category_name, income_source, transaction_type, NOW(), NOW());
    ELSEIF query_type = 'get_one' THEN
        SELECT * FROM income WHERE id = income_id;
    ELSEIF query_type = 'get_all' THEN
        SELECT * FROM income;
    ELSEIF query_type = 'edit' THEN
        UPDATE income
        SET income_category_name = income_category_name,
            source = income_source,
            transaction_type = transaction_type,
            updated_at = NOW()
        WHERE id = income_id;
    ELSEIF query_type = 'delete' THEN
        DELETE FROM income WHERE id = income_id;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid query type. Use insert, get_one, get_all, edit, or delete.';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_payments` (IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_admission_no` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_ref_no` INT, IN `in_item_code` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(8,2), IN `in_discount` DECIMAL(8,2), IN `in_fines` DECIMAL(8,2), IN `in_qty` INT, IN `in_academic_year` VARCHAR(9), IN `in_term` VARCHAR(20), IN `in_status` ENUM('Paid','Unpaid'), IN `in_due_date` DATE, IN `in_payment_date` DATE, IN `in_payment_mode` VARCHAR(255), IN `in_created_by` VARCHAR(255), IN `in_school_id` VARCHAR(10), IN `in_limit` INT, IN `in_offset` INT, IN `start_date` DATE, IN `end_date` DATE)   BEGIN
    IF query_type = "create" THEN
        INSERT INTO `payments`(
            `ref_no`, `item_code`, `description`, `admission_no`, `class_name`, 
            `amount`, `qty`, `term`, `academic_year`, `discount`, `fines`, 
            `due_date`, `created_by`, `school_id`
        )
        VALUES (
            in_ref_no, in_item_code, in_description, in_admission_no, in_class_name, 
            in_amount, in_qty, in_term, in_academic_year, in_discount, in_fines, 
            in_due_date, in_created_by, in_school_id
        );
  
 ELSEIF query_type = 'select-bills' THEN
    SELECT 
        s.student_name, 
        s.current_class AS class_name, 
        s.admission_no, 
        COALESCE(p.term, in_term) AS term, 
        COUNT(p.item_code) AS invoice_count,
        COALESCE(SUM(p.amount), 0) AS total_invoice,
        COALESCE(SUM(p.discount), 0) AS total_discount,
        COALESCE(SUM(p.fines), 0) AS total_fines,
        COALESCE(SUM(p.amount_paid), 0) AS total_paid,
        COALESCE(SUM(p.amount), 0) - COALESCE(SUM(p.discount), 0)
          + COALESCE(SUM(p.fines), 0) - COALESCE(SUM(p.amount_paid), 0) AS balance,
        COALESCE(p.status, 'No Payments') AS status 
    FROM 
        students s 
    LEFT JOIN 
        payments p 
          ON s.admission_no = p.admission_no
         AND s.current_class = p.class_name
         AND (p.term = in_term OR p.term IS NULL)
    WHERE 
        s.current_class = in_class_name 
        AND s.school_id = in_school_id 
    GROUP BY 
        s.student_name, 
        s.current_class, 
        s.admission_no, 
        p.term, 
        p.status
    ORDER BY 
        s.student_name;
ELSEIF query_type = 'select-family-bills' THEN
    SELECT 
        s.student_name, 
        s.current_class AS class_name, 
        s.admission_no, 
        COALESCE(p.term, in_term) AS term, 
        COUNT(p.item_code) AS invoice_count,
        COALESCE(SUM(p.amount), 0) AS total_invoice,
        COALESCE(SUM(p.discount), 0) AS total_discount,
        COALESCE(SUM(p.fines), 0) AS total_fines,
        COALESCE(SUM(p.amount_paid), 0) AS total_paid,
        COALESCE(SUM(p.amount), 0) - COALESCE(SUM(p.discount), 0)
          + COALESCE(SUM(p.fines), 0) - COALESCE(SUM(p.amount_paid), 0) AS balance,
        COALESCE(p.status, 'No Payments') AS status 
    FROM 
        students s 
    LEFT JOIN 
        payments p 
          ON s.admission_no = p.admission_no
         AND s.current_class = p.class_name
         AND (p.term = in_term OR p.term IS NULL)
    WHERE 
         s.parent_id = in_id
    GROUP BY 
        s.student_name, 
        s.current_class, 
        s.admission_no, 
        p.term, 
        p.status
    ORDER BY 
        s.student_name;


    ELSEIF query_type = 'select-payments' THEN
        SELECT 
            s.student_name, 
            s.current_class AS class_name, 
            s.admission_no, 
            p.term AS term, 
            COUNT(p.item_code) AS invoice_count,
            COALESCE(SUM(p.amount), 0) AS total_invoice,
             COALESCE(SUM(CASE WHEN p.status = 'Paid' THEN p.amount ELSE 0 END), 0) AS amount_paid,
          
            p.status AS status 
        FROM 
            students s 
        JOIN 
            payments p 
        ON 
            s.admission_no = p.admission_no
            AND s.current_class = p.class_name
            AND p.term = in_term
        WHERE 
            s.current_class = in_class_name 
            AND p.amount > 0 
            AND p.school_id = in_school_id
        GROUP BY 
            s.student_name, 
            s.current_class, 
            s.admission_no, 
            p.term, 
            p.status
        ORDER BY 
            s.student_name;

    ELSEIF query_type = 'class-payments' THEN
        SELECT 
            s.student_name, 
            p.class_name, 
            p.academic_year,
            p.admission_no, 
            p.term, 
            COUNT(p.item_code) AS invoice_count,
            COALESCE(SUM(p.amount), 0) AS total_invoice,
            p.status
        FROM 
            students s 
        JOIN 
            payments p 
        ON 
            s.admission_no = p.admission_no
            AND s.current_class = p.class_name
            AND p.term = in_term
        WHERE 
            s.current_class = in_class_name 
            AND p.amount > 0 
            AND p.school_id = in_school_id
        GROUP BY 
            s.student_name, 
            p.class_name, 
            p.academic_year, 
            p.admission_no, 
            p.term, 
            p.status
        ORDER BY 
            s.student_name;

    ELSEIF query_type = 'select-class-count' THEN
        SELECT 
            class_name, 
            COUNT(DISTINCT admission_no) AS count_students 
        FROM 
            payments 
        WHERE 
            school_id = in_school_id
        GROUP BY 
            class_name 
        ORDER BY 
            class_name;

    ELSEIF query_type = "update-paid" THEN
        UPDATE 
            `payments`
        SET 
            amount_paid = COALESCE(in_amount, 0),
            `status` = COALESCE(in_status, `status`),
            payment_date = COALESCE(in_payment_date, payment_date),
            `payment_mode` = COALESCE(in_payment_mode, `payment_mode`)
        WHERE 
            item_code = in_item_code 
            AND ref_no = in_ref_no;

    ELSEIF query_type = "select-ref" THEN
        SELECT * FROM `payments` WHERE ref_no = in_ref_no;

    ELSEIF query_type = "select-id" THEN 
        SELECT * FROM `payments` WHERE id = in_id;

    ELSEIF query_type = "select-student" THEN 
        SELECT * FROM `payments` WHERE admission_no = in_admission_no;

    ELSEIF query_type = "select" THEN 
        SELECT * 
        FROM 
            `payments`
        WHERE 
            (admission_no = in_admission_no OR in_admission_no IS NULL)
            AND term = in_term;

    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_qr_code` (IN `query_type` VARCHAR(20), IN `qrcode_id` INT, IN `qr_code` TEXT, IN `user_type` VARCHAR(50), IN `expiry_datetime` DATETIME, IN `location_is_boolean` BOOLEAN, IN `longitude` DECIMAL(10,8), IN `latitude` DECIMAL(10,8), IN `status` ENUM('active','suspended','stopped'))   BEGIN
    -- Handle create operation
    IF query_type = 'create' THEN
        INSERT INTO qrcodesetup (qrcode, usertype, expiry_datetime, location_is_boolean, longitude, latitude)
        VALUES (
            qr_code, 
            user_type, 
            expiry_datetime, 
            location_is_boolean, 
            IF(location_is_boolean, longitude, NULL), 
            IF(location_is_boolean, latitude, NULL)
        );
        
    -- Handle edit operation
    ELSEIF query_type = 'edit' THEN
        UPDATE qrcodesetup
        SET 
            qrcode = qr_code,
            usertype = user_type,
            expiry_datetime = expiry_datetime,
            location_is_boolean = location_is_boolean,
            longitude = IF(location_is_boolean, longitude, NULL),
            latitude = IF(location_is_boolean, latitude, NULL),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = qrcode_id;
    
    -- Handle delete one operation
    ELSEIF query_type = 'delete_one' THEN
        DELETE FROM qrcodesetup
        WHERE id = qrcode_id;

    -- Handle delete all operation
    ELSEIF query_type = 'delete_all' THEN
        DELETE FROM qrcodesetup;

    -- Handle change status operation
    ELSEIF query_type = 'change_status' THEN
        UPDATE qrcodesetup
        SET 
            status = status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = qrcode_id;

    -- Handle get one operation
    ELSEIF query_type = 'get_one' THEN
        SELECT *
        FROM qrcodesetup
        WHERE id = qrcode_id;

    -- Handle get all operation
    ELSEIF query_type = 'get_all' THEN
        SELECT *
        FROM qrcodesetup;

    -- Handle invalid query type
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid query_type provided.';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_student_grading` (IN `query_type` VARCHAR(10), IN `p_id` INT, IN `p_admission_number` VARCHAR(50), IN `p_student_name` VARCHAR(100), IN `p_subject_name` VARCHAR(100), IN `p_class` VARCHAR(50), IN `p_score` DECIMAL(5,2), IN `p_mark_by` VARCHAR(100))   BEGIN
    IF query_type = 'INSERT' THEN
        INSERT INTO student_grading (admission_number, student_name, subject_name, class, score, mark_by)
        VALUES (p_admission_number, p_student_name, p_subject_name, p_class, p_score, p_mark_by);

    ELSEIF query_type = 'UPDATE' THEN
        UPDATE student_grading
        SET admission_number = p_admission_number,
            student_name = p_student_name,
            subject_name = p_subject_name,
            class = p_class,
            score = p_score,
            mark_by = p_mark_by
        WHERE id = p_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM student_grading
        WHERE id = p_id;

    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_task_todo` (IN `op_type` VARCHAR(10), IN `p_id` VARCHAR(100), IN `p_user_id` INT(11), IN `p_title` VARCHAR(200), IN `p_event_for` VARCHAR(60), IN `p_event_category` ENUM('Celebration','Training','Holidays','Meeting'), IN `p_start_date` DATE, IN `p_end_date` DATE, IN `p_start_time` TIME, IN `p_end_time` TIME, IN `p_attachment` VARCHAR(500), IN `p_content` TEXT, IN `p_created_by` VARCHAR(50), IN `p_priority` ENUM('High','Medium','Low'), IN `p_search_keyword` VARCHAR(50), IN `p_limit` INT(11), IN `p_offset` INT(11))   BEGIN
    -- Insert Operation
    IF op_type = 'INSERT' THEN
        INSERT INTO task_todos (
            title, event_for, event_categry, start_date, end_date, 
            start_time, end_time, attachment, content, created_by, user_id, priority, status
        )
        VALUES (
            p_title, p_event_for, p_event_category, p_start_date, p_end_date, 
            p_start_time, p_end_time, p_attachment, p_content, p_created_by, p_user_id, p_priority, p_search_keyword
        );

    -- Update Operation with COALESCE to handle NULL values
    ELSEIF op_type = 'UPDATE' THEN
        UPDATE task_todos
        SET 
            title = COALESCE(p_title, title),
            event_for = COALESCE(p_event_for, event_for),
            event_categry = COALESCE(p_event_category, event_categry),
            start_date = COALESCE(p_start_date, start_date),
            end_date = COALESCE(p_end_date, end_date),
            start_time = COALESCE(p_start_time, start_time),
            end_time = COALESCE(p_end_time, end_time),
            attachment = COALESCE(p_attachment, attachment),
            content = COALESCE(p_content, content),
            priority = COALESCE(p_priority, priority),
            status = COALESCE(p_search_keyword, status),
            created_by = COALESCE(p_created_by, created_by)
        WHERE id = p_id;

    -- Delete Operation
    ELSEIF op_type = 'DELETE' THEN
        DELETE FROM task_todos WHERE id = p_id;

       ELSEIF op_type = 'SELECT' THEN
        SELECT * 
        FROM task_todos
        WHERE (p_id IS NULL OR id = p_id) -- Filter by ID if provided
          AND (p_user_id IS NULL OR user_id = p_user_id) -- Filter by user ID if provided
          AND (p_event_category IS NULL OR event_categry = p_event_category) -- Filter by event category
          AND (p_date_filter IS NULL OR (start_date <= p_date_filter AND end_date >= p_date_filter)) -- Date range filter
          AND (p_search_keyword IS NULL OR 
               (title LIKE CONCAT('%', p_search_keyword, '%') OR content LIKE CONCAT('%', p_search_keyword, '%'))); -- Keyword filter

    ELSE
        SELECT 'Invalid Operation' AS message;
    END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `parents` (IN `query_type` VARCHAR(100), IN `in_id` INT, IN `in_name` VARCHAR(100), IN `in_phone_no` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_relationship` VARCHAR(100), IN `in_is_guardian` VARCHAR(3), IN `in_occupation` VARCHAR(100), IN `in_school_id` VARCHAR(20), IN `in_children_admin_no` VARCHAR(50))   BEGIN
    DECLARE _parent_id INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF query_type = 'create' THEN
        SELECT COUNT(id) INTO _parent_id 
        FROM parents 
        WHERE fullname = in_name AND phone_no = in_phone_no;

        IF _parent_id = 0 THEN
            INSERT INTO parents (fullname, phone_no, email, relationship, is_guardian, occupation, school_id)
            VALUES (in_name, in_phone_no, in_email, in_relationship, in_is_guardian, in_occupation, in_school_id);


            INSERT INTO users (name, email, username, role, password, school_id)
            VALUES (
                in_name, 
                in_email, 
                in_phone_no,
                'parent', 
                '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 
                in_school_id
            );

            SET _parent_id = LAST_INSERT_ID();
            UPDATE parents SET user_id = _parent_id WHERE school_id =in_school_id AND phone_no=in_phone_no AND fullname=in_name;

            IF UPPER(in_is_guardian) = 'YES' THEN
                UPDATE students 
                SET guardian_id = _parent_id 
                WHERE application_no = in_children_admin_no;
            ELSE
                UPDATE students 
                SET parent_id = _parent_id 
                WHERE application_no = in_children_admin_no;
            END IF;

            SELECT _parent_id AS new_parent_id; 
        ELSE
            UPDATE secondary_school_entrance_form 
            SET parent_id = _parent_id 
            WHERE application_no = in_children_admin_no;
        END IF;

    ELSEIF query_type = 'parent' THEN
        INSERT INTO parents (fullname, phone_no, email, relationship, is_guardian, occupation, school_id)
        VALUES (in_name, in_phone_no, in_email, in_relationship, in_is_guardian, in_occupation, in_school_id);

    ELSEIF query_type = 'select' THEN
        SELECT * FROM parents WHERE id = in_id;
        
     ELSEIF query_type = 'update-parent' THEN
        UPDATE parents 
        SET fullname = in_name,
            phone_no = in_phone_no,
            email = in_email,
            is_guardian = in_is_guardian
        WHERE id = in_id;
        
    ELSEIF query_type = 'link-child' THEN
        IF UPPER(in_is_guardian) = 'YES' THEN
            UPDATE students 
            SET guardian_id = in_id 
            WHERE application_no = in_children_admin_no;
        ELSE
            UPDATE students 
            SET parent_id = in_id 
            WHERE application_no = in_children_admin_no;
        END IF;

    ELSEIF query_type = 'childlist' THEN
        SELECT s.* 
        FROM students s 
        WHERE s.parent_id = in_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM parents;
    END IF;

    COMMIT;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `receipt_urls` (IN `query_type` VARCHAR(10), IN `in_id` VARCHAR(10), IN `in_ref_no` VARCHAR(20), IN `in_url` VARCHAR(500))   BEGIN
  IF query_type='create' THEN
  		INSERT INTO `receipt_urls`(`id`, `ref_no`, `url`) 
        VALUES (`in_id`, `in_ref_no`, `in_url`);
  ELSEIF   query_type='select' THEN
  	SELECT * FROM `receipt_urls` WHERE ref_no = `in_ref_no`;
  END IF;
  
  END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `revenue_heads` (IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First term','Second term','Third term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive'), IN `in_school_location` VARCHAR(100), IN `in_school_id` VARCHAR(11))   BEGIN
    -- Handle 'create' operation
    IF query_type = "create" THEN
        INSERT INTO `revenue_heads`(
            `description`, `amount`, `term`, `section`, `class_name`, 
            `revenue_type`, `is_optional`, `status`, `school_location`, `school_id`
        ) 
        VALUES (
            in_description, in_amount, in_term, in_section, in_class_name, 
            in_revenue_type, in_is_optional, in_status, in_school_location, in_school_id
        );

    -- Handle 'select-all' operation
    ELSEIF query_type = "select-all" THEN
        SELECT * FROM revenue_heads;

    -- Handle 'select' operation with dynamic filtering
    ELSEIF query_type = "select" THEN
        SET @query = 'SELECT * FROM revenue_heads';
        SET @where_clause = '';

        -- Filter by section
        IF in_section IS NOT NULL AND in_section != '' THEN 
            SET @where_clause = CONCAT(@where_clause, 'section = "', in_section, '"');
        END IF;

        -- Filter by class name, including 'All Classes'
        IF in_class_name IS NOT NULL AND in_class_name != '' THEN
            SET @where_clause = IF(@where_clause = '', 
                CONCAT('class_name = "', in_class_name, '" OR class_name = "All Classes"'),
                CONCAT(@where_clause, ' AND (class_name = "', in_class_name, '" OR class_name = "All Classes")')
            );
        END IF;

        -- Filter by term, including specific term and Each Term
        IF in_term IS NOT NULL AND in_term != '' THEN
            SET @where_clause = IF(@where_clause = '',
                CONCAT('(term = "', in_term, '" OR term = "Each Term")'),
                CONCAT(@where_clause, ' AND (term = "', in_term, '" OR term = "Each Term")')
            );
        END IF;

        -- Combine query and where clause
        IF @where_clause != '' THEN
            SET @query = CONCAT(@query, ' WHERE ', @where_clause);
        END IF;

        -- Execute the dynamic query
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

    -- Handle 'select-revenues' operation
    ELSEIF query_type = 'select-revenues' THEN
        SELECT * FROM revenue_heads 
        WHERE class_name IN ('All Classes', in_class_name)
          AND (section = in_section OR in_section IS NULL)
          AND term IN (in_term, 'Each Term')
          AND (school_id = in_school_id OR in_school_id IS NULL);

    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `schoolCalendar` (IN `query_type` VARCHAR(50), IN `in_event_id` INT, IN `in_title` VARCHAR(255), IN `in_start_date` DATETIME, IN `in_end_date` DATETIME, IN `in_color` VARCHAR(30), IN `in_status` ENUM('Active','Inactive','Cancelled'), IN `in_created_by` VARCHAR(50), IN `in_recurrence` ENUM('Once','Annual'), IN `in_school_location` VARCHAR(150), IN `in_school_id` VARCHAR(20))   BEGIN
    IF query_type = 'CREATE' THEN
        INSERT INTO school_calendar (title, start_date, end_date, school_location, color, status, created_by, recurrence)
        VALUES (in_title, in_start_date, in_end_date, in_school_location, in_color, in_status, COALESCE(in_created_by, 'Admin'), COALESCE(in_recurrence, 'Once'));

    ELSEIF query_type = 'Create Category' THEN
        INSERT INTO event_categories (category_name, category_color, category_status, school_id, school_location) 
        VALUES (in_title, in_color, in_status, in_school_id, in_school_location);
        SELECT * FROM event_categories WHERE id = LAST_INSERT_ID() AND school_id = in_school_id;

    ELSEIF query_type = 'Select All Categories' THEN
        SELECT * FROM event_categories WHERE school_id = in_school_id;

    ELSEIF query_type = 'UPDATE' THEN
        UPDATE school_calendar
        SET title = COALESCE(in_title, title), 
            start_date = COALESCE(in_start_date, start_date),  
            end_date = COALESCE(in_end_date, end_date), 
            school_location = COALESCE(in_school_location, school_location),
            status = COALESCE(in_status, status),  
            color = COALESCE(in_color, color),
            created_by = COALESCE(in_created_by, created_by), 
            recurrence = COALESCE(in_recurrence, recurrence) 
        WHERE id = in_event_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM school_calendar WHERE id = in_event_id;

    ELSEIF query_type = 'SELECT-ALL' THEN
        SELECT * FROM school_calendar;

    ELSEIF query_type = 'SELECT' THEN
        SELECT * 
        FROM school_calendar
        WHERE (in_event_id IS NULL OR id = in_event_id)
            AND (in_title IS NULL OR title LIKE CONCAT('%', in_title, '%'))
            AND (in_start_date IS NULL OR start_date >= in_start_date)
            AND (in_end_date IS NULL OR end_date <= in_end_date)
            AND (in_school_location IS NULL OR school_location LIKE CONCAT('%', in_school_location, '%')) 
            AND (in_color IS NULL OR color = in_color)
            AND (in_status IS NULL OR status = in_status)
            AND (in_created_by IS NULL OR created_by = in_created_by)
            AND (in_recurrence IS NULL OR recurrence = in_recurrence);

    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid query_type specified';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `school_setup` (IN `query_type` VARCHAR(20), IN `p_id` VARCHAR(10), IN `p_school_name` VARCHAR(500), IN `p_short_name` VARCHAR(10), IN `p_academic_year` VARCHAR(20), IN `p_session_start_date` DATE, IN `p_session_end_date` DATE, IN `p_status` VARCHAR(20), IN `p_badge_url` VARCHAR(500), IN `p_mission` VARCHAR(500), IN `p_vission` VARCHAR(500), IN `p_about_us` VARCHAR(500), IN `p_school_motto` VARCHAR(300), IN `p_state` VARCHAR(100), IN `p_lga` VARCHAR(100), IN `p_address` VARCHAR(255), IN `p_primary_contact_number` VARCHAR(13), IN `p_secondary_contact_number` VARCHAR(13), IN `p_email` VARCHAR(70), IN `p_school_master` TINYINT(1), IN `p_express_finance` TINYINT(1), IN `p_cbt_center` TINYINT(1), IN `p_result_station` TINYINT(1), IN `p_nursery` TINYINT(1), IN `p_primary` TINYINT(1), IN `p_junior_secondary` TINYINT(1), IN `p_senior_secondary` TINYINT(1), IN `p_islamiyya` TINYINT(1), IN `p_tahfiz` TINYINT(1), IN `p_admin_name` VARCHAR(50), IN `p_admin_email` VARCHAR(50), IN `p_admin_password` VARCHAR(100), IN `p_domain` VARCHAR(100))   BEGIN
    IF query_type = 'CREATE' THEN
        -- Generate the school URL
        SET @p_school_url = CONCAT(p_domain, '/', p_short_name, '/', p_id);

        -- Insert into school_setup table
        INSERT INTO `school_setup`(
            `id`, `school_name`, `short_name`, `school_motto`, `state`, `lga`, `address`, 
            `primary_contact_number`, `secondary_contact_number`, `email`, 
            `school_master`, `express_finance`, `cbt_center`, `result_station`, 
            `academic_year`, `session_start_date`, `session_end_date`, `status`, 
            `badge_url`, `mission`, `vission`, `about_us`, `nursery_section`, 
            `primary_section`, `junior_secondary_section`, `senior_secondary_section`, 
            `islamiyya`, `tahfiz`, `school_url`
        ) VALUES (
            p_id, p_school_name, p_short_name, p_school_motto, p_state, p_lga, p_address, 
            p_primary_contact_number, p_secondary_contact_number, p_email, 
            p_school_master, p_express_finance, p_cbt_center, p_result_station, 
            p_academic_year, p_session_start_date, p_session_end_date, p_status, 
            p_badge_url, p_mission, p_vission, p_about_us, p_nursery, p_primary, 
            p_junior_secondary, p_senior_secondary, p_islamiyya, p_tahfiz, @p_school_url
        );

        -- Insert into users table for the admin
        INSERT INTO `users` (
            `name`, `email`, `username`, `role`, `password`, `school_id`
        ) VALUES (
            p_admin_name, p_admin_email, p_short_name, 'Admin', p_admin_password, p_id
        );

        -- Return the newly created school ID
        SELECT p_id AS school_id;

    ELSEIF query_type = 'select' THEN
        -- Select all schools
        SELECT * FROM school_setup;

    ELSEIF query_type = 'select-school' THEN
        -- Select a specific school by ID
        SELECT * FROM school_setup WHERE id = p_id;

    ELSEIF query_type = 'get_school_url' THEN
        -- Select the school URL by ID
        SELECT school_url FROM school_setup WHERE id = p_id;

    ELSEIF query_type = 'update' THEN
        -- Update school status
        UPDATE school_setup
        SET status = p_status
        WHERE id = p_id;
        
    ELSEIF query_type = 'update_school' THEN
    -- Update school information
    UPDATE school_setup
    SET
        school_name = p_school_name,
        short_name = p_short_name,
        school_motto = p_school_motto,
        state = p_state,
        lga = p_lga,
        address = p_address,
        primary_contact_number = p_primary_contact_number,
        secondary_contact_number = p_secondary_contact_number,
        email = p_email,
        school_master = p_school_master,
        express_finance = p_express_finance,
        cbt_center = p_cbt_center,
        result_station = p_result_station,
        nursery_section = p_nursery,
        primary_section = p_primary,
        junior_secondary_section = p_junior_secondary,
        senior_secondary_section = p_senior_secondary,
        islamiyya = p_islamiyya,
        tahfiz = p_tahfiz
    WHERE id = p_id;    

    ELSEIF query_type = 'DELETE' THEN
        -- Delete a school
        DELETE FROM school_setup WHERE id = p_id;

    ELSE
        -- Invalid query_type
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `score_grades` (IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_grade` INT(50), IN `in_remark` INT(14), IN `in_min_score` INT(3), IN `in_max_score` INT(3), IN `in_status` INT(3))   BEGIN 
    IF query_type="create" THEN 
        INSERT INTO `score_grades` (grade, remark,min_score,max_score) 
        VALUES (in_grade, in_remark, in_min_score, in_max_score); 
    ELSEIF query_type="select" THEN 
        SELECT * FROM `score_grades` WHERE id=in_id; 
    ELSEIF query_type="select-all" THEN 
        SELECT * FROM `score_grades`; 
     ELSEIF query_type = 'UPDATE' THEN
        UPDATE score_grades
            SET 
            grade = COALESCE(in_grade,grade),
            remark = COALESCE(in_remark,remark),
            min_score = COALESCE(in_min_score,min_score),
            max_score = COALESCE(in_max_score,max_score),
            status = COALESCE(in_status,status)
        WHERE id = in_id;
    END IF; 
    END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `secondary_school_entrance_form` (IN `in_id` VARCHAR(100), IN `query_type` VARCHAR(100), IN `in_upload` VARCHAR(300), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_religion` VARCHAR(100), IN `in_tribe` VARCHAR(100), IN `in_school_attended` VARCHAR(100), IN `in_class1` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_time` VARCHAR(100), IN `in_venue` VARCHAR(100), IN `in_common_entrance` VARCHAR(100), IN `in_placement` VARCHAR(100), IN `in_examination_date` DATE, IN `in_date` VARCHAR(100), IN `in_first_name` VARCHAR(100), IN `in_examination_number` VARCHAR(100), IN `in_father_name` VARCHAR(100), IN `in_state_of_origin1` VARCHAR(100), IN `in_address` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_examination_number1` VARCHAR(100), IN `in_name1` VARCHAR(100), IN `in_mother_name` VARCHAR(100), IN `in_state_of_origin3` VARCHAR(100), IN `in_state_of_origin2` VARCHAR(100), IN `in_home_address1` VARCHAR(100), IN `in_office_marker_address` VARCHAR(100), IN `in_telephone_address` VARCHAR(100), IN `in_other_score` INT(10), IN `in_venue1` VARCHAR(100), IN `in_image` TEXT, IN `in_mathematics` INT(11), IN `in_english` INT(11), IN `in_others` VARCHAR(100), IN `in_admission_no` VARCHAR(100), IN `in_last_school_atterded` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_date_of_birth1` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_occapation` VARCHAR(100), IN `in_blood_group` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_admission_date` DATE, IN `in_roll_number` INT(100), IN `in_status` VARCHAR(100), IN `in_section` VARCHAR(100), IN `in_house` VARCHAR(100), IN `in_category` VARCHAR(100), IN `in_primary_contact_number` VARCHAR(100), IN `in_caste` VARCHAR(100), IN `in_mother_tongue` VARCHAR(100), IN `in_language_known` VARCHAR(100), IN `in_application_no` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_current_class` VARCHAR(100), IN `in_medical_condition` VARCHAR(100), IN `in_upload_transfer_certificate` VARCHAR(100), IN `in_school_id` INT(6))   BEGIN 
	DECLARE admin_no int;
    DECLARE last_no int;
    DECLARE max_no int;
    SELECT no_of_student into last_no from class_management WHERE class_name = in_current_class;
     SELECT max_population into max_no from class_management WHERE class_name = in_current_class;
     
    IF query_type="create" THEN
    SELECT serial_no + 1 INTO admin_no FROM `admission_number_generator`  WHERE school=in_school AND class_type = in_class_type AND admission_year = in_admission_year;
    
    INSERT INTO `secondary_school_entrance_form`(type_of_application, name_of_applicant, home_address, date_of_birth, sex, religion, tribe, school_attended, class1, state_of_origin, l_g_a, nationality, time, venue, common_entrance, placement, examination_date, date, first_name, examination_number, father_name, state_of_origin1, address, school, examination_number1, name1, mother_name, state_of_origin3, state_of_origin2, home_address1, office_marker_address, telephone_address, other_score, venue1, image, mathematics, english, others, admission_no, last_school_atterded, special_health_needs, date_of_birth1, father_place_of_work, father_occapation, blood_group, academic_year, admission_date, roll_number, status, section, house, category, primary_contact_number, caste, mother_tongue, language_known, application_no, current_class, upload, medical_condition, upload_transfer_certificate,school_id
    ) VALUES (in_type_of_application,in_name_of_applicant,in_home_address,in_date_of_birth,in_sex,in_religion,in_tribe,in_school_attended,
              in_class1,in_state_of_origin,in_l_g_a,in_nationality,in_time,in_venue,in_common_entrance,in_placement,in_examination_date,in_date,
              in_first_name,in_examination_number,in_father_name,in_state_of_origin1,in_address,in_school,in_examination_number1,in_name1,
              in_mother_name,in_state_of_origin3,in_state_of_origin2,in_home_address1,in_office_marker_address,in_telephone_address,
              in_other_score,in_venue1,in_image,in_mathematics,in_english,in_others,in_admission_no,in_last_school_atterded,in_special_health_needs,
              in_date_of_birth1,in_father_place_of_work,in_father_occapation,in_blood_group,in_academic_year,in_admission_date,in_roll_number,
              "Applicant",in_section,in_house,in_category,in_primary_contact_number, in_caste,in_mother_tongue,in_language_known,concat(in_school, '/', in_class_type, '/', in_admission_year, '/', admin_no),in_current_class, in_upload, in_medical_condition, in_upload_transfer_certificate,in_school_id);
UPDATE `admission_number_generator` SET serial_no = admin_no  WHERE school=in_school AND class_type = in_class_type AND admission_year = in_admission_year;
 SELECT concat(in_school, '/', in_class_type, '/', in_admission_year, '/', admin_no) AS admission_number;
    
    ELSEIF query_type='select' THEN
    SELECT * FROM `secondary_school_entrance_form`;
    
    ELSEIF query_type='select_admission_no' THEN 
    SELECT * FROM `secondary_school_entrance_form` WHERE admission_no != '' AND admission_no 	IS NOT null; 
    
      ELSEIF query_type='select_id' THEN
    SELECT * FROM `secondary_school_entrance_form` WHERE id=in_id;   
    
       ELSEIF query_type='select_application_no' THEN
    SELECT * FROM `secondary_school_entrance_form` WHERE application_no=in_application_no;
    
    
          ELSEIF query_type='by_admin_no' THEN
    SELECT * FROM `secondary_school_entrance_form` WHERE application_no=in_id;
      ELSEIF query_type = 'update-score' THEN
    UPDATE secondary_school_entrance_form
    SET
    mathematics=in_mathematics,
    english = in_english,
    other_score = in_other_score,
    admission_no = in_admission_no,
    current_class = in_current_class,
    status= in_status 
    WHERE id=in_id;
  
  ELSEIF query_type = 'update' THEN
    UPDATE secondary_school_entrance_form
    SET
    admission_no = in_admission_no,
    current_class = in_current_class,
    status= in_status 
    WHERE id=in_id;
    UPDATE students SET current_class = in_current_class WHERE app_id = in_id;
    
    UPDATE class_management x SET x.no_of_student = (x.no_of_student+1) WHERE x.class_name = in_current_class;
     ELSEIF query_type = 'update_current_class' THEN
     IF max_no = last_no THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Maximum number of students has been reached';
     ELSE
    UPDATE class_management SET no_of_student = last_no+1 WHERE class_name = in_current_class;
    UPDATE secondary_school_entrance_form SET current_class = in_current_class,
   	status= in_status WHERE id=in_id;
    
    UPDATE students SET current_class = in_current_class WHERE app_id = in_id;
    
    	END IF;
        ELSEIF query_type="select_user" THEN
SELECT 
    a.admission_no, 
    a.current_class, 
    a.name_of_applicant, 
    c.subject_name 
FROM 
    secondary_school_entrance_form AS a
JOIN
    subject_management AS c 
    ON c.select_class = a.current_class 
WHERE 
    c.select_class = in_current_class
GROUP BY 
    a.admission_no, 
    a.current_class, 
    a.name_of_applicant; 

    END IF;
    END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sections` (IN `in_query_type` VARCHAR(20), IN `in_school_id` VARCHAR(100), IN `in_section_id` VARCHAR(100), IN `in_section_name` VARCHAR(100), IN `in_address` VARCHAR(100), IN `in_short_name` VARCHAR(10))   BEGIN
DECLARE current_id INT;
DECLARE section_code varChar(50);

IF in_query_type = 'create' THEN 

SELECT code + 1 into current_id from number_generator WHERE description = 'section_id';

  SET section_code  = CONCAT("SEC/",in_short_name,'/', LPAD(CAST(current_id  AS CHAR(5)), 5, '0')); 

INSERT INTO school_section_table(school_id, section_id, section_name, section_address) VALUES (in_school_id,section_code,in_section_name,in_address);
UPDATE number_generator SET code = current_id WHERE description = 'section_id';

ELSEIF in_query_type = 'select' THEN
SELECT * FROM school_section_table WHERE school_id = in_school_id;


END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `studentAggregator` (IN `class_input` VARCHAR(50))   BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE student_adm VARCHAR(20);
    DECLARE student_name VARCHAR(20);
    DECLARE student_agg_score INT;
    DECLARE student_avg_score DECIMAL(10,2);
    DECLARE student_grade VARCHAR(5);
    DECLARE student_class VARCHAR(50);

    -- Declare cursor for retrieving student aggregate scores
    DECLARE student_cursor CURSOR FOR 
        SELECT 
            s.admission_no,
            s.student_name,
            s.current_class, 
            IFNULL(SUM(g.total_score), 0) AS aggregate_score, 
            IFNULL(SUM(g.total_score) / NULLIF(COUNT(DISTINCT g.subject), 0), 0) AS average_score
        FROM students s
        LEFT JOIN student_grading g ON s.admission_no = g.admission_no
        WHERE s.current_class = class_input
        GROUP BY s.admission_no, s.current_class;

    -- Declare a NOT FOUND handler to exit the loop
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    -- Ensure the student aggregated results table exists
    CREATE TABLE IF NOT EXISTS student_aggregated_results (
        admission_no VARCHAR(20) PRIMARY KEY,
        student_name VARCHAR(20),
        class_name VARCHAR(50),
        aggregate_score INT,
        average_score DECIMAL(10,2),
        aggregate_grade VARCHAR(5),
        position INT
    );

    -- Open cursor
    OPEN student_cursor;

    student_loop: LOOP
        -- Fetch the next row
        FETCH student_cursor INTO student_adm, student_name, student_class, student_agg_score, student_avg_score;
        
        -- Exit loop if no more rows
        IF done THEN 
            LEAVE student_loop;
        END IF;

        -- Get the grade based on average score
        SELECT grade INTO student_grade 
        FROM grade_setup 
        WHERE student_avg_score BETWEEN min_score AND max_score
        LIMIT 1;

        -- Handle cases where no grade is found
        IF student_grade IS NULL THEN
            SET student_grade = 'F'; -- Default grade if no record
        END IF;

        -- Insert or update student records
        INSERT INTO student_aggregated_results (admission_no, student_name, class_name, aggregate_score, average_score, aggregate_grade, position)
        VALUES (student_adm, student_name, student_class, student_agg_score, student_avg_score, student_grade, NULL)
        ON DUPLICATE KEY UPDATE
            student_name = VALUES(student_name),
            class_name = VALUES(class_name),
            aggregate_score = VALUES(aggregate_score),
            average_score = VALUES(average_score),
            aggregate_grade = VALUES(aggregate_grade);

    END LOOP;

    -- Close cursor
    CLOSE student_cursor;

    -- Assign position based on aggregate score (ranked from highest to lowest)
    UPDATE student_aggregated_results sr
    JOIN (
        SELECT admission_no, 
               DENSE_RANK() OVER (ORDER BY aggregate_score DESC) AS student_position
        FROM student_aggregated_results
    ) ranked ON sr.admission_no = ranked.admission_no
    SET sr.position = ranked.student_position;

    -- Return all student results
    SELECT * FROM student_aggregated_results WHERE class_name = class_input ORDER BY position;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `students_applications` (IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(100), IN `in_upload` VARCHAR(300), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_religion` VARCHAR(100), IN `in_tribe` VARCHAR(100), IN `in_school_attended` VARCHAR(100), IN `in_last_class` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_examination_date` DATE, IN `in_address` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_mathematics` INT(11), IN `in_english` INT(11), IN `in_others` VARCHAR(100), IN `in_other_score` INT(11), IN `in_admission_no` VARCHAR(100), IN `in_last_school_atterded` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_occapation` VARCHAR(100), IN `in_blood_group` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_admission_date` DATE, IN `in_status` VARCHAR(100), IN `in_mother_tongue` VARCHAR(100), IN `in_language_known` VARCHAR(100), IN `in_application_no` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_current_class` VARCHAR(100), IN `in_medical_condition` VARCHAR(100), IN `in_upload_transfer_certificate` VARCHAR(100), IN `in_school_id` INT(11))   BEGIN 
	DECLARE admin_no int;
    DECLARE last_no int;
    DECLARE max_no int;
    SELECT no_of_student into last_no from class_management WHERE class_name = in_current_class;
    SELECT max_population into max_no from class_management WHERE class_name = in_current_class;
     
    IF query_type="create" THEN
    SELECT serial_no + 1 INTO admin_no FROM `admission_number_generator`  WHERE school=in_school AND class_type = in_class_type AND admission_year = in_admission_year;
    
    INSERT INTO `secondary_school_entrance_form`(type_of_application,
     name_of_applicant,
     home_address,
     date_of_birth,
     sex,
     religion,
     tribe,
    school_attended,
     last_class,
     state_of_origin,
     l_g_a,
     nationality,
     examination_date,
     `address`,
     school,
     mathematics,
     english,
     others,
     other_score,
     admission_no,
     last_school_atterded,
     special_health_needs,
     blood_group,
     academic_year,
     admission_date,
     `status`,
     mother_tongue,
     language_known,
     application_no,
     current_class,
     upload,
     medical_condition,
     upload_transfer_certificate,
     school_id) 
   VALUES (in_type_of_application,
    in_name_of_applicant,
    in_home_address,
    in_date_of_birth,
    in_sex,
    in_religion,
    in_tribe,
    in_school_attended,
     in_last_class,
    in_state_of_origin,
    in_l_g_a,
    in_nationality,
    in_examination_date,
    in_address,
    in_school,
    in_mathematics,
    in_english,
    in_others,
    in_other_score,
    in_admission_no,
    in_last_school_atterded,
    in_special_health_needs,
    in_father_place_of_work,
    in_father_occapation,
    in_blood_group,
    in_academic_year,
    in_admission_date,
    "Applicant",
        concat(in_school, '/', in_class_type, '/', in_admission_year, '/', admin_no),
        in_current_class,
    in_upload,
    in_medical_condition,
    in_upload_transfer_certificate,
          in_school_id);
UPDATE `admission_number_generator` SET serial_no = admin_no  WHERE school=in_school AND class_type = in_class_type AND admission_year = in_admission_year;
    SELECT concat(in_school, '/', in_class_type, '/', in_admission_year, '/', admin_no) AS admission_number;
    
    ELSEIF query_type='select' THEN
    SELECT * FROM `secondary_school_entrance_form`;
    
    ELSEIF query_type='select_admission_no' THEN 
    SELECT * FROM `secondary_school_entrance_form` WHERE admission_no != '' AND admission_no 	IS NOT null; 
    
      ELSEIF query_type='select_id' THEN
    SELECT * FROM `secondary_school_entrance_form` WHERE id=in_id;
          ELSEIF query_type='by_admin_no' THEN
    SELECT * FROM `secondary_school_entrance_form` WHERE application_no=in_id;
    ELSEIF query_type = 'update' THEN
    UPDATE secondary_school_entrance_form
    SET
    mathematics=in_mathematics,
    english = in_english,
    others = in_others,
    admission_no = in_admission_no,
    current_class = in_current_class,
    `status`= in_status 
    WHERE id=in_id;
    
    UPDATE class_management x SET x.no_of_student = (x.no_of_student+1) WHERE x.class_name = in_current_class;
     ELSEIF query_type = 'update_current_class' THEN
     IF max_no = last_no THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Maximum number of students has been reached';
     ELSE
    UPDATE class_management SET no_of_student = last_no+1 WHERE class_name = in_current_class;
    UPDATE secondary_school_entrance_form SET current_class = in_current_class,
   	status= in_status WHERE id=in_id;
    	END IF;
        ELSEIF query_type="select_user" THEN
SELECT 
    a.admission_no, 
    a.current_class, 
    a.name_of_applicant, 
    c.subject_name 
FROM 
    secondary_school_entrance_form AS a
JOIN
    subject_management AS c 
    ON c.select_class = a.current_class 
WHERE 
    c.select_class = in_current_class
GROUP BY 
    a.admission_no, 
    a.current_class, 
    a.name_of_applicant; 

    END IF;
    END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `students_attendances` (IN `query_type` VARCHAR(50), IN `_id` INT, IN `_teacher_id` VARCHAR(50), IN `_student_id` VARCHAR(50), IN `_teacher_name` VARCHAR(50), IN `_section` VARCHAR(50), IN `_class_name` VARCHAR(50), IN `_day` VARCHAR(50), IN `_status` VARCHAR(50), IN `_student_name` VARCHAR(50), IN `_admission_no` VARCHAR(50), IN `_term` VARCHAR(50), IN `_academic_year` VARCHAR(50), IN `_start_date` DATE, IN `_end_date` DATE, IN `_school_id` VARCHAR(50))   BEGIN
    IF query_type = 'create' THEN

        INSERT INTO class_attendances (
            teacher_name,
            teacher_id,
            student_id,
            section,
            class_name,
            day,
            status,
            student_name,
            admission_no,
            term,
            academic_year,
            school_id
        ) VALUES (
            _teacher_name,
            _teacher_id,
            _student_id,
            _section,
            _class_name,
            _day,
            _status,
            _student_name,
            _admission_no,
            _term,
            _academic_year,
            _school_id
        );

    ELSEIF query_type = 'select-student' THEN
        SELECT * FROM class_attendances WHERE student_id = _student_id;

    ELSEIF query_type = 'update' THEN
        UPDATE class_attendances
        SET
            teacher_name = _teacher_name,
            teacher_id = _teacher_id,
            section = _section,
            class_name = _class_name,
            day = DATE_FORMAT(NOW(), '%W'),
            status = _status,
            student_name = _student_name,
            admission_no = _admission_no,
            term = _term,
            academic_year = _academic_year
        WHERE id = _id;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM class_attendances WHERE id = _id;
    ELSEIF query_type = 'select-class' THEN

            SELECT 
            admission_no,
            student_name,
            DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
            `status`,
            notes
        FROM 
            class_attendances
        WHERE 
            class_name = _class_name
            AND DATE(created_at) BETWEEN DATE(_start_date) AND DATE(_end_date)
        ORDER BY 
            admission_no, created_at;
    ELSEIF query_type = 'select' THEN

            SELECT 
            admission_no,
            student_name,
            DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
            `status`,
            notes
        FROM 
            class_attendances
        WHERE 
            admission_no = admission_no
            AND DATE(created_at) BETWEEN DATE(_start_date) AND DATE(_end_date)
        ORDER BY 
            admission_no, created_at;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `students_queries` (IN `query_type` VARCHAR(30), IN `p_id` INT, IN `p_parent_id` INT, IN `p_guardian_id` INT, IN `p_student_name` VARCHAR(255), IN `p_home_address` TEXT, IN `p_date_of_birth` DATE, IN `p_sex` VARCHAR(10), IN `p_religion` VARCHAR(50), IN `p_tribe` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_l_g_a` VARCHAR(100), IN `p_nationality` VARCHAR(100), IN `p_last_school_atterded` VARCHAR(100), IN `p_special_health_needs` VARCHAR(100), IN `p_blood_group` VARCHAR(100), IN `p_admission_no` VARCHAR(50), IN `p_admission_date` DATE, IN `p_academic_year` VARCHAR(20), IN `p_status` VARCHAR(100), IN `p_section` VARCHAR(100), IN `p_mother_tongue` VARCHAR(100), IN `p_language_known` VARCHAR(100), IN `p_current_class` VARCHAR(50), IN `p_profile_picture` VARCHAR(300), IN `p_medical_condition` VARCHAR(300), IN `p_transfer_certificate` VARCHAR(500), IN `p_school_location` VARCHAR(300), IN `in_school_id` INT(11))   BEGIN
DECLARE _adm_no VARCHAR(50);
DECLARE _short_name VARCHAR(50);
    IF p_school_location IS NOT NULL  AND p_school_location!='' THEN
        SELECT  short_name INTO _short_name from school_locations WHERE location = p_school_location;
     SET _adm_no = CONCAT(_short_name,p_admission_no);
    END IF;

    IF query_type = 'CREATE' THEN

        INSERT INTO students (
            parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
            l_g_a, nationality, last_school_atterded, special_health_needs, blood_group, 
            academic_year, status, section, mother_tongue, language_known, current_class, profile_picture, medical_condition,transfer_certificate,
            school_location,school_id
        )
        VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
            p_l_g_a, p_nationality, p_last_school_atterded, p_special_health_needs, p_blood_group, 
            p_academic_year, p_status, p_section, p_mother_tongue, p_language_known, p_current_class, p_profile_picture, p_medical_condition,
            p_transfer_certificate,p_school_location,in_school_id
        ); 
        
        SELECT admission_no 
FROM students 
WHERE school_id =  in_school_id
ORDER BY CAST(SUBSTRING_INDEX(admission_no, '/', -1) AS UNSIGNED) DESC 
LIMIT 1;

    -- SELECT query_type
    ELSEIF query_type = 'select-class' THEN
        SELECT * FROM students WHERE current_class = p_current_class AND school_id = in_school_id;
    ELSEIF query_type = 'class-grading' THEN
        CALL studentAggregator(p_current_class);
   ELSEIF query_type = 'SELECT' THEN
        SELECT * FROM students WHERE admission_no = p_admission_no;
   ELSEIF query_type = 'select-all' THEN
    SET @query = 'SELECT * FROM students';
    SET @where_clause = '';

    -- Check each condition and dynamically append to the WHERE clause
    IF p_student_name IS NOT NULL AND p_student_name != '' THEN
        SET @where_clause = CONCAT(@where_clause, 'student_name = "', p_student_name, '"');
    END IF;

    IF p_school_location IS NOT NULL AND p_school_location != '' THEN
        SET @where_clause = IF(@where_clause = '', 
            CONCAT('school_location = "', p_school_location, '"'),
            CONCAT(@where_clause, ' AND school_location = "', p_school_location, '"')
        );
    END IF;

    IF p_current_class IS NOT NULL AND p_current_class != '' THEN
        SET @where_clause = IF(@where_clause = '', 
            CONCAT('current_class = "', p_current_class, '"'),
            CONCAT(@where_clause, ' AND current_class = "', p_current_class, '"')
        );
    END IF;

    IF p_sex IS NOT NULL AND p_sex != '' THEN
        SET @where_clause = IF(@where_clause = '', 
            CONCAT('sex = "', p_sex, '"'),
            CONCAT(@where_clause, ' AND sex = "', p_sex, '"')
        );
    END IF;
    
      IF in_school_id IS NOT NULL AND in_school_id != '' THEN
        SET @where_clause = IF(@where_clause = '', 
            CONCAT('school_id = "', in_school_id, '"'),
            CONCAT(@where_clause, ' AND school_id = "', in_school_id, '"')
        );
    END IF;

    -- Append WHERE clause if any condition was added
    IF @where_clause != '' THEN
        SET @query = CONCAT(@query, ' WHERE ', @where_clause);
    END IF;

    -- Execute the dynamic query
    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
   ELSEIF query_type = 'select-all' THEN
    SELECT * FROM students WHERE school_id = in_school_id;
    

    ELSEIF query_type = 'UPDATE' THEN
        UPDATE students
		SET
		    parent_id = COALESCE(p_parent_id, parent_id),
		    guardian_id = COALESCE(p_guardian_id, guardian_id),
		    student_name = COALESCE(p_student_name, student_name),
		    home_address = COALESCE(p_home_address, home_address),
		    date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
		    sex = COALESCE(p_sex, sex),
		    religion = COALESCE(p_religion, religion),
		    tribe = COALESCE(p_tribe, tribe),
		    state_of_origin = COALESCE(p_state_of_origin, state_of_origin),
		    l_g_a = COALESCE(p_l_g_a, l_g_a),
		    nationality = COALESCE(p_nationality, nationality),
		    last_school_atterded = COALESCE(p_last_school_atterded, last_school_atterded),
		    special_health_needs = COALESCE(p_special_health_needs, special_health_needs),
		    blood_group = COALESCE(p_blood_group, blood_group),
		    admission_no = COALESCE(p_admission_no, admission_no),
		    admission_date = COALESCE(p_admission_date, admission_date),
		    academic_year = COALESCE(p_academic_year, academic_year),
		    `status` = COALESCE(p_status, `status`),
		    `section` = COALESCE(p_section, `section`),
		    mother_tongue = COALESCE(p_mother_tongue, mother_tongue),
		    language_known = COALESCE(p_language_known, language_known),
		    current_class = COALESCE(p_current_class, current_class),
		    profile_picture = COALESCE(p_profile_picture, profile_picture),
		    medical_condition = COALESCE(p_medical_condition, medical_condition),
		    school_location = COALESCE(p_school_location, school_location)
        WHERE id = p_id;
        SELECT * FROM students WHERE id = p_id;
    -- DELETE query_type
    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students WHERE id = p_id;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `student_assignments` (IN `query_type` VARCHAR(50), IN `in_admission_no` VARCHAR(8))   BEGIN
IF query_type ='get-result' THEN
SELECT * FROM student_grading WHERE admission_no = in_admission_no; 
END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `student_grading` (IN `query_type` ENUM('create','select','delete'), IN `in_id` INT, IN `in_calendar_id` INT, IN `in_admission_no` VARCHAR(100), IN `in_student_name` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_academic_year` VARCHAR(20), IN `in_term` VARCHAR(20), IN `in_ca1Score` DOUBLE(5,2), IN `in_ca2Score` DOUBLE(5,2), IN `in_examScore` DOUBLE(5,2), IN `in_mark_by` VARCHAR(100), IN `in_school_id` INT(11))   BEGIN
    DECLARE `in_total` DOUBLE(5,2);
    DECLARE `in_grade` VARCHAR(5);
    DECLARE `in_remark` VARCHAR(100);

    -- CREATE operation
    IF query_type = 'create' THEN
        -- Calculate total score
        SET in_total = in_ca1Score + in_ca2Score + in_examScore;

        -- Fetch grade and remark dynamically
        SELECT grade, remark
        INTO in_grade, in_remark
        FROM grade_setup
        WHERE in_total BETWEEN min_score AND max_score
        LIMIT 1;

        -- Check if record exists
        IF EXISTS (
            SELECT 1
            FROM student_grading
            WHERE admission_no = in_admission_no
              AND subject = in_subject
        ) THEN
            -- Update existing record
            UPDATE student_grading
            SET
                calendar_id = in_calendar_id,
                student_name = in_student_name,
                class_name = in_class_name,
                academic_year = in_academic_year,
                term = in_term,
                ca1Score = in_ca1Score,
                ca2Score = in_ca2Score,
                examScore = in_examScore,
                total_score = in_total,
                grade = in_grade,
                remark = in_remark,
                mark_by = in_mark_by
            WHERE admission_no = in_admission_no
              AND subject = in_subject;
        ELSE
            -- Insert new record
            INSERT INTO student_grading (
                calendar_id,
                admission_no,
                student_name,
                subject,
                class_name,
                academic_year,
                term,
                ca1Score,
                ca2Score,
                examScore,
                total_score,
                grade,
                remark,
                mark_by,
                school_id
            ) VALUES (
                in_calendar_id,
                in_admission_no,
                in_student_name,
                in_subject,
                in_class_name,
                in_academic_year,
                in_term,
                in_ca1Score,
                in_ca2Score,
                in_examScore,
                in_total,
                in_grade,
                in_remark,
                in_mark_by,
                in_school_id
            );
        END IF;

    -- SELECT operation
    ELSEIF query_type = 'select' THEN
        SELECT *
        FROM student_grading
        WHERE (admission_no = in_admission_no OR in_admission_no IS NULL)
          AND (subject = in_subject OR in_subject IS NULL)
          AND (class_name = in_class_name OR in_class_name IS NULL)
          AND (academic_year = in_academic_year OR in_academic_year IS NULL)
          AND (term = in_term OR in_term IS NULL);

    -- DELETE operation
    ELSEIF query_type = 'delete' THEN
        DELETE FROM student_grading
        WHERE admission_no = in_admission_no
          AND subject = in_subject;
    END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `student_parents` (IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(100), IN `in_name` VARCHAR(100), IN `in_phone_no` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_relationship` VARCHAR(100), IN `in_is_guardian` VARCHAR(100), IN `in_occupation` VARCHAR(100), IN `in_children_admin_no` VARCHAR(50), IN `in_school_id` INT(11))   BEGIN 
DECLARE count_parent INT(2) DEFAULT(0);
DECLARE _parent_id INT(11) DEFAULT(0);

IF query_type="create" THEN
SELECT  id into _parent_id from parent WHERE  fullname = in_name AND phone_no=in_phone_no;
IF _parent_id < 1 THEN
	INSERT INTO `parent`(fullname, phone_no, email, relationship, is_guardian, occupation,school_id)
	VALUES (in_name, in_phone_no, in_email, in_relationship, in_is_guardian, in_occupation,in_school_id);
    	IF in_is_guardian = 'Yes' THEN
     		UPDATE  `students` SET guardian_id = LAST_INSERT_ID() WHERE application_no = in_children_admin_no;  
        ELSE
        UPDATE  `students` SET parent_id = LAST_INSERT_ID() WHERE admission_no = in_children_admin_no; 
        END IF;
ELSE
	 UPDATE  `students` SET parent_id = _parent_id WHERE  admission_no = in_children_admin_no;
 END IF;	
ELSEIF query_type="select" THEN
SELECT * FROM `parent` WHERE id =  LAST_INSERT_ID();
ELSEIF query_type="select-all" THEN
SELECT * FROM `parent`;
END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `student_result` (IN `query_type` VARCHAR(50), IN `in_admission_no` VARCHAR(30))   BEGIN
IF query_type ='get-result' THEN
    SELECT a.*, (SELECT b.exam_name FROM exam_calendar b where a.calendar_id = b.id) as exam_name FROM student_grading a  WHERE admission_no = in_admission_no; 
END IF;


END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `subjects` (IN `query_type` VARCHAR(50), IN `in_id` VARCHAR(10), IN `in_subject` VARCHAR(50), IN `in_section` VARCHAR(50), IN `in_status` ENUM('Active','Inactive'), IN `in_school_id` VARCHAR(20))   BEGIN
DECLARE last_code int;
DECLARE subject_code varchar(100);


IF query_type='create' THEN
 SELECT MAX(code) + 1 INTO last_code FROM number_generator WHERE prefix = "sub";
  SET subject_code = CONCAT(UPPER(SUBSTRING(in_subject, 1, 3)), LPAD(last_code, 4, '0'));
	INSERT into subjects(`subject`, `section`, `status`,subject_code,school_id)
    VALUES(in_subject, in_section, in_status,subject_code,in_school_id);
    UPDATE number_generator SET code=last_code WHERE prefix="sub";
ELSEIF query_type='select-all' THEN
	SELECT * from subjects WHERE school_id = in_school_id;
ELSEIF query_type='select-section-subjects' THEN
    SELECT * FROM `subjects` where section = in_section AND status = "Active" AND school_id = in_school_id ORDER BY `subjects`.`subject_code` ASC;
END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `subject_management` (IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_select_class` VARCHAR(100), IN `in_subject_name` VARCHAR(100), IN `in_c_a_pass_mark` INT(100), IN `in_exam_pass_mark` INT(100), IN `in_other_description` VARCHAR(100), IN `in_assignment_pass_mark` INT(100))   BEGIN
IF query_type="create" THEN
INSERT INTO `subject_management`(select_class, subject_name, c_a_pass_mark, exam_pass_mark, other_description, assignment_pass_mark)
VALUES ( in_select_class, in_subject_name, in_c_a_pass_mark, in_exam_pass_mark, in_other_description, in_assignment_pass_mark);
ELSEIF query_type="select" THEN
SELECT * FROM `subject_management`;

ELSEIF query_type = "select-subject" THEN 
        SELECT DISTINCT(s.subject_name)  as `value`, s.subject_name as label
        FROM subject_management s;
ELSEIF query_type = "select_class" THEN
        SELECT s.subject_name
        FROM subject_management s
        JOIN class_management c ON c.class_name = s.select_class
        WHERE c.class_name = in_select_class;

END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `syllabus` (IN `query_type` VARCHAR(50), IN `p_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_code` VARCHAR(100), IN `p_term` VARCHAR(50), IN `p_week` TINYINT, IN `p_title` VARCHAR(300), IN `p_content` TEXT, IN `p_status` VARCHAR(30))   BEGIN
    -- INSERT operation
    IF query_type = 'CREATE' THEN
        INSERT INTO syllabus (subject, class_code, term, week, title, content)
        VALUES (p_subject, p_class_code, p_term, p_week, p_title, p_content);

    -- UPDATE operation 
    ELSEIF query_type = 'UPDATE' THEN
        UPDATE syllabus
        SET 
            subject = COALESCE(p_subject, subject),
            class_code = COALESCE(p_class_code, class_code),
            term = COALESCE(p_term, term),
            week = COALESCE(p_week, week),
            title = COALESCE(p_title, title),
            content = COALESCE(p_content, content),
            status =  COALESCE(p_status, status)
        WHERE id = p_id;

    -- DELETE operation
    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM syllabus WHERE id = p_id;

    -- SELECT operation
    ELSEIF query_type = 'select-all' THEN
    	SELECT * FROM syllabus;
    ELSEIF query_type = 'SELECT' THEN
        SELECT * FROM syllabus
        WHERE (id = p_id OR p_id IS NULL)
          AND (subject = p_subject OR p_subject IS NULL)
          AND (class_code = p_class_code OR p_class_code IS NULL)
          AND (term = p_term OR p_term IS NULL)
          AND (status = p_status OR p_status IS NULL)
          AND (title LIKE CONCAT('%', p_title, '%') OR p_title IS NULL);

    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `syllabusTracker` (IN `op_type` VARCHAR(10), IN `p_id` INT, IN `p_syllabu_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_level` INT, IN `p_term` VARCHAR(50), IN `p_academic_year` YEAR, IN `p_week` TINYINT, IN `p_status` ENUM('Pending','Ongoing','Onhold','Completed'))   BEGIN
    -- INSERT operation
    IF op_type = 'INSERT' THEN
        INSERT INTO syllabus_tracker (syllabu_id, subject, class_level, term, academic_year, week, status)
        VALUES (p_syllabu_id, p_subject, p_class_level, p_term, p_academic_year, p_week, p_status);

    -- UPDATE operation
    ELSEIF op_type = 'UPDATE' THEN
        UPDATE syllabus_tracker
        SET 
            syllabu_id = COALESCE(p_syllabu_id, syllabu_id),
            subject = COALESCE(p_subject, subject),
            class_level = COALESCE(p_class_level, class_level),
            term = COALESCE(p_term, term),
            academic_year = COALESCE(p_academic_year, academic_year),
            week = COALESCE(p_week, week),
            status = COALESCE(p_status, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_id;

    -- DELETE operation
    ELSEIF op_type = 'DELETE' THEN
        DELETE FROM syllabus_tracker WHERE id = p_id;

    -- SELECT operation
    ELSEIF op_type = 'SELECT' THEN
        SELECT * FROM syllabus_tracker
        WHERE (id = p_id OR p_id IS NULL)
          AND (syllabu_id = p_syllabu_id OR p_syllabu_id IS NULL)
          AND (subject = p_subject OR p_subject IS NULL)
          AND (class_level = p_class_level OR p_class_level IS NULL)
          AND (term = p_term OR p_term IS NULL)
          AND (academic_year = p_academic_year OR p_academic_year IS NULL)
          AND (status = p_status OR p_status IS NULL);
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `taskTodos` (IN `op_type` VARCHAR(100), IN `p_id` VARCHAR(100), IN `p_user_id` INT(11), IN `p_title` VARCHAR(200), IN `p_class_name` VARCHAR(60), IN `p_event_category` ENUM('Lesson','E-Class','Homework','Training','Holidays'), IN `p_due_date` DATE, IN `p_content` LONGTEXT, IN `p_created_by` VARCHAR(50), IN `p_priority` ENUM('High','Medium','Low'), IN `p_status` VARCHAR(50), IN `p_limit` INT(11), IN `p_offset` INT(11))   BEGIN
    -- Insert Operation
    IF op_type = 'create' THEN
        INSERT INTO task_todos (
            title, class_name, event_categry, due_date, content, created_by, user_id, priority, status
        )
        VALUES (
            p_title, p_class_name, p_event_category, p_due_date, p_content, p_created_by, p_user_id, p_priority, p_status
        );

    -- Update Operation with COALESCE to handle NULL values
    ELSEIF op_type = 'UPDATE' THEN
        UPDATE task_todos
        SET 
            title = COALESCE(p_title, title),
            class_name = COALESCE(p_class_name, class_name),
            event_categry = COALESCE(p_event_category, event_categry),
            due_date = COALESCE(p_due_date, due_date),
            content = COALESCE(p_content, content),
            priority = COALESCE(p_priority, priority),
            status = COALESCE(p_status, status),
            created_by = COALESCE(p_created_by, created_by)
        WHERE id = p_id;

    -- Delete Operation
    ELSEIF op_type = 'DELETE' THEN
        DELETE FROM task_todos WHERE id = p_id;

       ELSEIF op_type = 'SELECT-ALL' THEN
        SELECT * 
        FROM task_todos;
       ELSEIF op_type = 'SELECT' THEN
        SELECT * 
        FROM task_todos
        WHERE (p_id IS NULL OR id = p_id) -- Filter by ID if provided
          AND (p_user_id IS NULL OR user_id = p_user_id) -- Filter by user ID if provided
          AND (p_event_category IS NULL OR event_categry = p_event_category) -- Filter by event category
          AND (p_due_date IS NULL OR (due_date <= p_due_date AND due_date >= p_due_date)) -- Date range filter
          AND (p_status IS NULL OR 
               (title LIKE CONCAT('%', p_status, '%') OR content LIKE CONCAT('%', p_status, '%'))); -- Keyword filter

    ELSE
        SELECT 'Invalid Operation' AS message;
    END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `teachers` (IN `query_type` VARCHAR(100), IN `p_id` INT(10), IN `p_name` VARCHAR(255), IN `p_sex` VARCHAR(10), IN `p_age` INT, IN `p_address` TEXT, IN `p_date_of_birth` DATE, IN `p_marital_status` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_mobile_no` VARCHAR(20), IN `p_email` VARCHAR(100), IN `p_qualification` VARCHAR(255), IN `p_working_experience` TEXT, IN `p_religion` VARCHAR(50), IN `p_last_place_of_work` VARCHAR(255), IN `p_do_you_have` TEXT, IN `p_when_do` DATE, IN `p_account_name` VARCHAR(255), IN `p_account_number` VARCHAR(50), IN `p_bank` VARCHAR(100), IN `p_school_location` VARCHAR(100), IN `p_school_id` VARCHAR(20))   BEGIN
    DECLARE _teacher_id INTEGER;

    IF query_type = 'create' THEN
        INSERT INTO teachers (
            name,
            sex,
            age,
            address,
            date_of_birth,
            marital_status,
            state_of_origin,
            mobile_no,
            email,
            qualification,
            working_experience,
            religion,
            last_place_of_work,
            do_you_have,
            when_do,
            account_name,
            account_number,
            bank,
            school_location,
            school_id
        )
        VALUES (
            p_name,
            p_sex,
            p_age,
            p_address,
            p_date_of_birth,
            p_marital_status,
            p_state_of_origin,
            p_mobile_no,
            p_email,
            p_qualification,
            p_working_experience,
            p_religion,
            p_last_place_of_work,
            p_do_you_have,
            p_when_do,
            p_account_name,
            p_account_number,
            p_bank,
            p_school_location,
            p_school_id
        );
        
        SET _teacher_id = LAST_INSERT_ID();

        INSERT INTO users
        (name, email, password, role)
        VALUES(p_name, p_email, '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 'Teacher');
        SELECT _teacher_id AS teacher_id;
     ELSEIF query_type = 'select-class' THEN
     	
        SELECT * FROM teacher_classes WHERE teacher_id = p_id;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM teachers WHERE id = p_id;
    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teachers WHERE school_id = p_school_id;
        ELSEIF query_type='select_teacher_name' THEN
    		SELECT DISTINCT name FROM teachers;
    ELSEIF query_type = 'update' THEN
        UPDATE teachers
        SET 
            name = p_name,
            sex = p_sex,
            age = p_age,
            address = p_address,
            date_of_birth = p_date_of_birth,
            marital_status = p_marital_status,
            state_of_origin = p_state_of_origin,
            mobile_no = p_mobile_no,
            email = p_email,
            qualification = p_qualification,
            working_experience = p_working_experience,
            religion = p_religion,
            last_place_of_work = p_last_place_of_work,
            do_you_have = p_do_you_have,
            when_do = p_when_do,
            account_name = p_account_name,
            account_number = p_account_number,
            bank = p_bank,
            school_location = p_school_location
        WHERE id = p_id;
        SELECT id AS teacher_id FROM teachers WHERE id = p_id;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `teacher_classes` (IN `query_type` VARCHAR(50), IN `in_id` INT(11), IN `in_teacher_id` INT(11), IN `in_subject` VARCHAR(50), IN `in_section` VARCHAR(50), IN `in_class_name` VARCHAR(50), IN `in_class_code` VARCHAR(50), IN `in_class_level` INT(100))   BEGIN
    DECLARE x_class_code VARCHAR(30);
    DECLARE x_class_level INT;

    IF query_type = 'create' THEN
        SELECT class_code, level 
        INTO x_class_code, x_class_level 
        FROM classes 
        WHERE class_name = in_class_name 
        LIMIT 1;
        INSERT INTO teacher_classes (teacher_id, subject, section, class_name, class_level, class_code) 
        VALUES (in_teacher_id, in_subject, in_section, in_class_name, x_class_level, x_class_code);

    ELSEIF query_type = 'select' THEN
        SELECT * FROM teacher_classes WHERE teacher_id = in_teacher_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teacher_classes;

    ELSEIF query_type = 'update' THEN
        UPDATE teacher_classes 
        SET 
            subject = COALESCE(in_subject, subject), 
            section = COALESCE(in_section, section), 
            class_name = COALESCE(in_class_name, class_name), 
            class_level = COALESCE(in_class_level, class_level)
        WHERE id = in_id; 

    END IF;   
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `time_table` (IN `in_id` INT(10), IN `query_type` VARCHAR(50), IN `in_class_name` VARCHAR(100), IN `in_start_time` VARCHAR(100), IN `in_end_time` VARCHAR(100), IN `in_subject_name` VARCHAR(100))   BEGIN
IF query_type = "create" THEN 
INSERT INTO `time_table` (id, class_name, start_time, end_time, subject_name)
VALUES (in_id, in_class_name, in_start_time, in_end_time, in_subject_name);

ELSEIF query_type='select' THEN
SELECT * FROM `time_table`;

END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `trainees_crud` (IN `query_type` VARCHAR(10), IN `p_id` INT, IN `p_firstname` VARCHAR(255), IN `p_lastname` VARCHAR(255), IN `p_phone` VARCHAR(20), IN `p_email` VARCHAR(255), IN `p_state` VARCHAR(255), IN `p_lga` VARCHAR(255), IN `p_address` TEXT, IN `p_department` VARCHAR(255), IN `p_program_type` VARCHAR(100), IN `p_dob` DATE, IN `p_gender` ENUM('Male','Female','Other'), IN `p_payment_status` ENUM('Paid','Unpaid','Pending'))   BEGIN
    -- CREATE (Insert new record)
    IF query_type = 'CREATE' THEN
        INSERT INTO trainees (
            firstname, lastname, phone, email, state, lga, address, department, 
            program_type, dob, gender, payment_status
        ) VALUES (
            p_firstname, p_lastname, p_phone, p_email, p_state, p_lga, p_address, 
            p_department, p_program_type, p_dob, p_gender, p_payment_status
        );
        
    -- READ (Select record by ID)
    ELSEIF query_type = 'READ' THEN
        SELECT * FROM trainees WHERE id = p_id;
        
    -- UPDATE (Update existing record by ID)
    ELSEIF query_type = 'UPDATE' THEN
        UPDATE trainees
        SET
            firstname = p_firstname,
            lastname = p_lastname,
            phone = p_phone,
            email = p_email,
            state = p_state,
            lga = p_lga,
            address = p_address,
            department = p_department,
            program_type = p_program_type,
            dob = p_dob,
            gender = p_gender,
            payment_status = p_payment_status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_id;
        
    -- DELETE (Delete record by ID)
    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM trainees WHERE id = p_id;
        
    -- If no valid query_type is provided
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type specified.';
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `UpdateAdmissionNumbers` ()   BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE location VARCHAR(255);
    DECLARE loc_cursor CURSOR FOR
        SELECT DISTINCT school_location FROM students;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Cursor to iterate through each distinct location
    OPEN loc_cursor;

    location_loop: LOOP
        FETCH loc_cursor INTO location;
        IF done THEN
            LEAVE location_loop;
        END IF;

        -- Initialize a session variable for counter
        SET @counter = 0;

        -- Update admission_no for students in the current location
        UPDATE students
        SET admission_no = CONCAT(
            'YMA/', 
            FIND_IN_SET(school_location, (
                SELECT GROUP_CONCAT(DISTINCT school_location ORDER BY school_location)
                FROM students
            )), 
            '/', 
            LPAD(@counter := @counter + 1, 4, '0')
        )
        WHERE school_location = location
        ORDER BY id;

    END LOOP;

    CLOSE loc_cursor;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `update_transaction_status` (IN `p_transaction_id` INT(100), IN `p_payment_status` ENUM('Pending','Paid','Failed'), IN `p_document_status` ENUM('Printed','Saved'), IN `p_print_count` INT(2), IN `p_print_by` VARCHAR(100))   BEGIN
    -- Update transaction details
    UPDATE `transactions`
    SET
        `payment_status` = p_payment_status,
        `document_status` = p_document_status,
        `print_count` = p_print_count,
        `print_by` = p_print_by,
        `updated_at` = CURRENT_TIMESTAMP
    WHERE `id` = p_transaction_id;
END$$

--
-- Functions
--
CREATE DEFINER=`root`@`localhost` FUNCTION `INITCAP` (`input_string` VARCHAR(255)) RETURNS VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci DETERMINISTIC BEGIN
    DECLARE result VARCHAR(255);
    DECLARE i INT DEFAULT 1;
    DECLARE current_char CHAR(1);
    SET result = LOWER(input_string);
    SET result = CONCAT(UPPER(SUBSTRING(result, 1, 1)), SUBSTRING(result, 2));
    
    WHILE i <= LENGTH(result) DO
        SET current_char = SUBSTRING(result, i, 1);
        IF current_char = ' ' THEN
            SET result = CONCAT(
                SUBSTRING(result, 1, i),
                UPPER(SUBSTRING(result, i + 1, 1)),
                SUBSTRING(result, i + 2)
            );
        END IF;
        SET i = i + 1;
    END WHILE;
    
    RETURN result;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `academic_calendar`
--

CREATE TABLE `academic_calendar` (
  `academic_year` varchar(50) NOT NULL,
  `term` varchar(50) NOT NULL,
  `begin_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  `school_id` varchar(50) NOT NULL,
  `section_id` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `academic_calendar`
--

INSERT INTO `academic_calendar` (`academic_year`, `term`, `begin_date`, `end_date`, `status`, `school_id`, `section_id`) VALUES
('2024/2025', 'FIRST TERM', '2025-02-17', '2025-02-19', 'inactive', '1', 'SEC/YMA/00001'),
('2024/2025', 'FIRST TERM', '2025-02-17', '2025-02-19', 'inactive', '372369', 'SEC/NAF/00005 	'),
('2024/2025', 'First Term', '2024-10-01', '2025-01-31', 'active', 'EIA', ''),
('2024/2025', 'SECOND TERM', '2025-02-18', '2025-02-22', 'active', '1', 'SEC/YMA/00002'),
('2024/2025', 'SECOND TERM', '2025-02-18', '2025-02-22', 'active', '372369', 'SEC/NAF/00005 	'),
('2024/2025', 'Second Term', '2028-03-01', '2025-06-30', 'active', 'EIA', ''),
('2025/2026', 'Third Term', '2025-03-05', '2025-03-27', 'active', '', ''),
('2024/2025', 'Third Term', '2025-02-12', '2025-03-29', 'Active', '1', 'SEC/YMA/00002');

-- --------------------------------------------------------

--
-- Table structure for table `account_chart`
--

CREATE TABLE `account_chart` (
  `code` bigint(10) UNSIGNED ZEROFILL NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `term` enum('First term','Second term','Third term','Each Term') DEFAULT 'Each Term',
  `class_name` varchar(50) NOT NULL DEFAULT 'All Classes',
  `section` varchar(100) DEFAULT NULL,
  `revenue_type` enum('Fees','Charges','Fines','Sales','Earnings') NOT NULL DEFAULT 'Fees',
  `source` enum('School Fees','Other Revenue') NOT NULL DEFAULT 'School Fees',
  `student_type` enum('All','Returning','Fresh','None') NOT NULL DEFAULT 'All',
  `is_optional` enum('Yes','No') NOT NULL DEFAULT 'No',
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `account_type` enum('Revenue','Expenditure') NOT NULL DEFAULT 'Revenue',
  `school_location` varchar(300) DEFAULT NULL,
  `school_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `account_chart`
--

INSERT INTO `account_chart` (`code`, `description`, `amount`, `term`, `class_name`, `section`, `revenue_type`, `source`, `student_type`, `is_optional`, `status`, `account_type`, `school_location`, `school_id`, `created_at`, `updated_at`) VALUES
(0000000012, 'Library Fees', 1000.00, 'First term', 'All Classes', NULL, 'Fees', 'School Fees', 'Returning', 'Yes', 'Active', 'Revenue', NULL, 1, NULL, NULL),
(0000000013, 'School Fees', 10000.00, 'First term', 'All Classes', NULL, 'Fees', 'School Fees', 'Returning', 'No', 'Active', 'Revenue', NULL, 1, NULL, NULL),
(0000000014, 'School Uniform', 10000.00, 'First term', 'PRIMARY 1A', NULL, 'Sales', 'School Fees', 'Returning', 'Yes', 'Active', 'Revenue', NULL, 1, NULL, NULL),
(0000000015, 'School Uniform', 2000.00, 'Each Term', 'All Classes', NULL, 'Sales', 'School Fees', 'Returning', 'Yes', 'Active', 'Revenue', NULL, 1, NULL, NULL),
(0000000016, 'Sport Wears', 20000.00, 'Each Term', 'All Classes', NULL, 'Sales', 'School Fees', 'Returning', 'Yes', 'Active', 'Revenue', NULL, 1, NULL, NULL),
(0000000017, 'Pen Fee', 100.00, 'First term', 'All Classes', 'SECONDARY', 'Fees', 'School Fees', 'All', 'Yes', 'Active', 'Revenue', NULL, 1, '2025-01-23 19:38:30', '2025-01-23 19:38:30'),
(0000000018, 'School Bags', 3500.00, 'Each Term', 'All Classes', 'PRIMARY', 'Sales', 'School Fees', 'All', 'Yes', 'Active', 'Revenue', NULL, 1, '2025-01-25 22:02:53', '2025-01-25 22:02:53');

-- --------------------------------------------------------

--
-- Table structure for table `admission_form`
--

CREATE TABLE `admission_form` (
  `id` int(11) NOT NULL,
  `pupils_name` varchar(255) NOT NULL,
  `date_of_birth` date NOT NULL,
  `religion` varchar(50) DEFAULT NULL,
  `health_needs` text DEFAULT NULL,
  `medical_report` blob DEFAULT NULL,
  `last_school` varchar(255) DEFAULT NULL,
  `last_class` varchar(50) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `state_of_origin` varchar(100) DEFAULT NULL,
  `town_lga` varchar(100) DEFAULT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `father_occupation` varchar(100) DEFAULT NULL,
  `father_contact_address` text DEFAULT NULL,
  `father_postal_address` text DEFAULT NULL,
  `father_place_of_work` varchar(255) DEFAULT NULL,
  `father_telephone` varchar(20) DEFAULT NULL,
  `father_email` varchar(100) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `mother_occupation` varchar(100) DEFAULT NULL,
  `mother_address` text DEFAULT NULL,
  `mother_place_of_work` varchar(255) DEFAULT NULL,
  `mother_telephone` varchar(20) DEFAULT NULL,
  `mother_email` varchar(100) DEFAULT NULL,
  `next_of_kin` varchar(255) DEFAULT NULL,
  `next_of_kin_occupation` varchar(100) DEFAULT NULL,
  `next_of_kin_contact_address` text DEFAULT NULL,
  `next_of_kin_email` varchar(100) DEFAULT NULL,
  `next_of_kin_tel` varchar(20) DEFAULT NULL,
  `student_signature` varchar(255) DEFAULT NULL,
  `sponsor_signature` varchar(255) DEFAULT NULL,
  `date_from` date DEFAULT NULL,
  `date_to` date DEFAULT NULL,
  `pupils_last_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admission_no_gen`
--

CREATE TABLE `admission_no_gen` (
  `id` int(11) NOT NULL,
  `prefix` varchar(8) NOT NULL,
  `school_location` varchar(200) NOT NULL,
  `serial_no` int(4) UNSIGNED ZEROFILL DEFAULT 0000,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admission_no_gen`
--

INSERT INTO `admission_no_gen` (`id`, `prefix`, `school_location`, `serial_no`, `status`) VALUES
(1, 'YMA/1/', 'Satellite Town, Tudun Yola, Kabuga Kano', 0727, 'Active'),
(2, 'YMA/2/', 'Afforestation Road, Unguwar Jakada Dorayi Babba, Kano', 0469, 'Active'),
(3, 'YMA/3/', 'Hablan House, Rijiyar Zaki Off Gwarzo Road, Kano', 0029, 'Active');

--
-- Triggers `admission_no_gen`
--
DELIMITER $$
CREATE TRIGGER `before_insert_admission_no_gen` BEFORE INSERT ON `admission_no_gen` FOR EACH ROW BEGIN
  DECLARE max_serial INT;

  -- Find the maximum serial_no for the given prefix and school_location
  SELECT COALESCE(MAX(serial_no), 0) INTO max_serial
  FROM admission_no_gen
  WHERE prefix = NEW.prefix AND school_location = NEW.school_location;

  -- Increment the serial_no
  SET NEW.serial_no = max_serial + 1;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `admission_number_generator`
--

CREATE TABLE `admission_number_generator` (
  `id` int(11) NOT NULL,
  `school` varchar(100) DEFAULT NULL,
  `class_type` varchar(100) DEFAULT NULL,
  `admission_year` varchar(100) DEFAULT NULL,
  `serial_no` int(11) DEFAULT NULL,
  `type_of_school` varchar(100) DEFAULT NULL,
  `school_id` int(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admission_number_generator`
--

INSERT INTO `admission_number_generator` (`id`, `school`, `class_type`, `admission_year`, `serial_no`, `type_of_school`, `school_id`) VALUES
(1, 'YMA', 'PRI', '24', 0, 'PRIMARY', 1),
(2, 'YMA', 'SEC', '24', 0, 'SECONDARY', 1),
(3, 'YMA', 'NUR', '24', 0, 'NURSERY', 1),
(4, 'YMA', 'ISL', '24', 0, 'PRE-NURSERY', 1),
(5, 'YMA', 'APP-PRI', '24', 0, 'PRIMARY', 1),
(6, 'YMA', 'APP-SEC', '24', 0, 'SECONDARY', 1),
(7, 'YMA', 'APP-NUR', '24', 0, 'NURSERY', 1),
(8, 'YMA', 'APP-ISL', '24', 0, 'PRE-NURSERY', 1);

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` int(11) NOT NULL,
  `teacher_id` int(10) DEFAULT NULL,
  `class_name` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `assignment_date` date DEFAULT cast(current_timestamp() as date),
  `submission_date` date DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `teacher_name` varchar(100) DEFAULT NULL,
  `title` varchar(259) DEFAULT NULL,
  `marks` int(2) NOT NULL DEFAULT 0,
  `status` enum('Opened','Closed','Adjusted','Released') NOT NULL DEFAULT 'Opened'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignments`
--

INSERT INTO `assignments` (`id`, `teacher_id`, `class_name`, `subject`, `assignment_date`, `submission_date`, `attachment`, `content`, `teacher_name`, `title`, `marks`, `status`) VALUES
(1, 1, 'PRIMARY 1A', 'English', '2024-12-13', '2024-12-22', NULL, NULL, 'Halifa Shuaibu', 'english', 2055, 'Opened'),
(6, 17, 'SS 1', 'Chemistry', '2025-02-15', '2025-02-28', NULL, NULL, 'Ishaq Ibrahim', 'Electron Affinity trends', 2, 'Opened');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_questions`
--

CREATE TABLE `assignment_questions` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `question_type` enum('Multiple Choice','True/False','Short Answer','Fill in the Blank','Essay') NOT NULL DEFAULT 'Short Answer',
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `marks` int(3) NOT NULL DEFAULT 0,
  `correct_answer` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignment_questions`
--

INSERT INTO `assignment_questions` (`id`, `assignment_id`, `question_text`, `question_type`, `options`, `marks`, `correct_answer`) VALUES
(1, 6, 'What is the highest electron Atom', 'Multiple Choice', '[{"value":"Hydrogen","is_correct":false},{"value":"Flourine","is_correct":true},{"value":"Chlrorine","is_correct":false},{"value":"Thorium","is_correct":false}]', 2, 'Flourine');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_responses`
--

CREATE TABLE `assignment_responses` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `admission_no` varchar(15) NOT NULL,
  `subject` varchar(30) DEFAULT NULL,
  `response` text NOT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `score` int(3) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `class_name` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `date` date NOT NULL,
  `check_in_time` time DEFAULT NULL,
  `check_out_time` time DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`attendance_id`, `name`, `class_name`, `role`, `department`, `date`, `check_in_time`, `check_out_time`, `status`, `remarks`, `created_at`, `updated_at`) VALUES
(1, 'undefined', 'Unknown', 'admin', 'Unknown', '2025-02-15', '13:26:16', '00:00:00', 'Present', 'Checked in successfully', '2025-02-15 13:26:16', '2025-02-15 13:26:16'),
(2, 'undefined', 'Unknown', 'admin', 'Unknown', '2025-02-15', '13:47:23', '00:00:00', 'Present', 'Checked in successfully', '2025-02-15 13:47:24', '2025-02-15 13:47:24'),
(3, 'undefined', 'Unknown', 'admin', 'Unknown', '2025-02-15', '13:55:51', '00:00:00', 'Present', 'Checked in successfully', '2025-02-15 13:55:51', '2025-02-15 13:55:51'),
(4, 'undefined', 'Unknown', 'admin', 'Unknown', '2025-02-15', '13:56:14', '00:00:00', 'Present', 'Checked in successfully', '2025-02-15 13:56:15', '2025-02-15 13:56:15'),
(5, 'Unknown', 'Unknown', 'admin', 'Unknown', '2025-02-15', '15:03:04', '00:00:00', 'Present', 'Checked in successfully', '2025-02-15 14:03:04', '2025-02-15 14:03:04'),
(6, 'Ishaq Ibrahim', NULL, 'Teacher', 'Education', '2025-02-15', '16:00:11', '16:45:50', 'Present', 'Checked in outside defined rules', '2025-02-15 15:00:12', '2025-02-15 15:00:12'),
(7, 'Ishaq Ibrahim', NULL, 'Teacher', 'Education', '2025-02-15', '16:01:00', '16:45:50', 'Present', 'Checked in outside defined rules', '2025-02-15 15:01:01', '2025-02-15 15:01:01'),
(8, 'Ishaq Ibrahim', NULL, 'Teacher', 'Education', '2025-02-15', '16:05:42', '16:45:50', 'Present', 'Checked in outside defined rules', '2025-02-15 15:05:42', '2025-02-15 15:05:42'),
(9, 'Ishaq Ibrahim', NULL, 'Teacher', 'Education', '2025-02-15', '16:21:39', '16:45:50', 'Present', 'Checked in outside defined rules', '2025-02-15 15:21:39', '2025-02-15 15:21:39'),
(10, 'Ishaq Ibrahim', NULL, 'Teacher', 'Education', '2025-02-15', '16:29:19', '16:45:50', 'Present', 'Checked in outside defined rules', '2025-02-15 15:29:19', '2025-02-15 15:29:19'),
(11, 'Ishaq Ibrahim', NULL, 'Teacher', 'Education', '2025-02-15', '16:45:46', '16:45:50', 'Present', 'Checked in outside defined rules', '2025-02-15 15:45:47', '2025-02-15 15:45:47');

-- --------------------------------------------------------

--
-- Table structure for table `book_supplies`
--

CREATE TABLE `book_supplies` (
  `record_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `book_title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `isbn` varchar(20) NOT NULL,
  `cover_img` varchar(255) DEFAULT NULL,
  `status` enum('Available','Reserved') DEFAULT 'Available',
  `qty` int(11) DEFAULT 0,
  `post_date` date DEFAULT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `book_no` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `book_supplies`
--

INSERT INTO `book_supplies` (`record_id`, `book_title`, `author`, `isbn`, `cover_img`, `status`, `qty`, `post_date`, `publisher`, `subject`, `book_no`) VALUES
(000001, 'JIKI MAGAYI', 'BUHARI', 'KN783479', 'https://res.cloudinary.com/dp0qdgbih/image/upload/v1736991581/biocmyogcr7emtig5xwa.jpg', 'Available', 10000, '2021-01-01', 'NIGERIA', 'LIFE', '6348'),
(000002, 'LEGEND', 'ADEWALE', '455834', 'https://res.cloudinary.com/dp0qdgbih/image/upload/v1736992868/tcvnmm3sjy3wnvkmssnl.jpg', 'Available', 3, '2024-11-26', 'NNPC', 'Literature', '242');

-- --------------------------------------------------------

--
-- Table structure for table `character_scores`
--

CREATE TABLE `character_scores` (
  `id` int(11) NOT NULL,
  `calendar_id` int(11) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `academic_year` varchar(10) NOT NULL,
  `term` varchar(30) NOT NULL,
  `category` varchar(50) NOT NULL,
  `admission_no` varchar(20) NOT NULL,
  `student_name` varchar(50) NOT NULL,
  `grade` varchar(10) NOT NULL,
  `created_by` varchar(50) NOT NULL,
  `description` varchar(50) NOT NULL,
  `class_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `character_scores`
--

INSERT INTO `character_scores` (`id`, `calendar_id`, `school_id`, `academic_year`, `term`, `category`, `admission_no`, `student_name`, `grade`, `created_by`, `description`, `class_name`) VALUES
(23, NULL, '1', '2024/2025', 'First term', 'Affective Behavior', 'YMA/1/0025', 'ABDALLAH ABDULSALAM SABO', 'A', '16', 'Punctuality', 'PRIMARY 1'),
(24, NULL, '1', '2024/2025', 'First term', 'Skills', 'YMA/1/0025', 'ABDALLAH ABDULSALAM SABO', 'B', '16', 'Neetness', 'PRIMARY 1'),
(31, NULL, '1', '2024/2025', 'First term', 'Affective Behavior', 'YMA/1/0025', 'RAHAMA SANI ', 'A', '16', 'Punctuality', 'PRIMARY 1'),
(32, NULL, '1', '2024/2025', 'First term', 'Skills', 'YMA/1/0025', 'RAHAMA SANI ', 'B', '16', 'Neetness', 'PRIMARY 1'),
(33, NULL, '1', '2024/2025', 'First term', 'Affective Behavior', 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'B', '16', 'Punctuality', 'PRIMARY 1'),
(34, NULL, '1', '2024/2025', 'First term', 'Affective Behavior', 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'D', '16', 'Punctuality', 'PRIMARY 1'),
(35, NULL, '1', '2024/2025', 'First term', 'Affective Behavior', 'YMA/1/0025', 'RAHAMA SANI ', 'B', '16', 'Punctuality', 'PRIMARY 1'),
(36, NULL, '1', '2024/2025', 'First term', 'Skills', 'YMA/1/0025', 'RAHAMA SANI ', 'B', '16', 'Neetness', 'PRIMARY 1');

-- --------------------------------------------------------

--
-- Table structure for table `character_traits`
--

CREATE TABLE `character_traits` (
  `school_id` varchar(20) NOT NULL,
  `category` varchar(50) NOT NULL,
  `description` varchar(50) NOT NULL,
  `section` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `character_traits`
--

INSERT INTO `character_traits` (`school_id`, `category`, `description`, `section`) VALUES
('1', 'Affective Behavior', 'Punctuality', 'PRIMARY'),
('1', 'Skills', 'Neetness', 'PRIMARY');

-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `id` int(11) NOT NULL,
  `class_name` varchar(100) NOT NULL,
  `class_code` varchar(30) NOT NULL,
  `section` varchar(30) NOT NULL,
  `school_location` varchar(200) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `capacity` int(11) DEFAULT NULL,
  `school_id` int(11) NOT NULL,
  `level` int(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classes`
--

INSERT INTO `classes` (`id`, `class_name`, `class_code`, `section`, `school_location`, `created_at`, `updated_at`, `capacity`, `school_id`, `level`) VALUES
(15, 'ISLAMIYYA 1', 'ISLAMIYYA 1', 'ISLAMIYYA', '', '2024-10-28 14:39:38', '2024-10-28 14:39:38', 30, 1, NULL),
(9, 'JSS 1', 'JSS 1', 'JUNIOR SECONDARY', '', '2024-10-28 14:39:38', '2024-10-28 14:39:38', 30, 1, NULL),
(78, 'JSS 1A', '2025-JSS 1A', 'JUNIOR SECONDARY', '', '2025-03-05 10:57:09', '2025-03-05 10:57:09', NULL, 372369, NULL),
(10, 'JSS 2', 'JSS 2', 'JUNIOR SECONDARY', '', '2024-11-18 08:53:06', '2024-11-18 08:53:06', NULL, 1, NULL),
(11, 'JSS 3', 'JSS 3', 'JUNIOR SECONDARY', '', '2024-11-18 08:54:07', '2024-11-18 08:54:07', NULL, 1, NULL),
(2, 'NURSERY 1', 'NURSERY 1', 'NURSERY', '', '2024-10-28 11:41:15', '2024-10-28 11:41:15', NULL, 1, NULL),
(79, 'NURSERY 1', '2025-NURSERY 1', 'NURSERY', '', '2025-03-05 11:54:06', '2025-03-05 11:54:06', NULL, 493125, NULL),
(3, 'NURSERY 2', 'NURSERY 2', 'NURSERY', '', '2024-10-28 11:41:15', '2024-10-28 11:41:15', NULL, 1, NULL),
(80, 'PRE NURSERY', '2025-PRE NURSERY', 'NURSERY', '', '2025-03-05 11:54:22', '2025-03-05 11:54:22', NULL, 493125, NULL),
(1, 'PRE-NURSERY', 'PRE-NURSERY', 'NURSERY', '', '2024-11-18 12:42:27', '2024-11-18 12:42:27', NULL, 1, NULL),
(4, 'PRIMARY 1', 'PRIMARY 1', 'PRIMARY', '', '2024-10-28 12:05:23', '2024-10-28 12:05:23', NULL, 1, NULL),
(74, 'Primary 1 A', '2025-Primary 1 A', 'PRIMARY', '', '2025-03-05 10:13:21', '2025-03-05 10:13:21', NULL, 372369, NULL),
(75, 'Primary 1 B', '2025-Primary 1 B', 'PRIMARY', '', '2025-03-05 10:13:50', '2025-03-05 10:13:50', NULL, 372369, NULL),
(5, 'PRIMARY 2', 'PRIMARY 2', 'PRIMARY', '', '2024-10-28 14:21:22', '2024-10-28 14:21:22', NULL, 1, NULL),
(76, 'Primary 2 A', '2025-Primary 2 A', 'PRIMARY', '', '2025-03-05 10:14:06', '2025-03-05 10:14:06', NULL, 372369, NULL),
(77, 'Primary 2 B', '2025-Primary 2 B', 'PRIMARY', '', '2025-03-05 10:15:14', '2025-03-05 10:15:14', NULL, 372369, NULL),
(6, 'PRIMARY 3', 'PRIMARY 3', 'PRIMARY', '', '2024-10-28 14:34:23', '2024-10-28 14:34:23', 0, 1, NULL),
(7, 'PRIMARY 4', 'PRIMARY 4', 'PRIMARY', '', '2024-10-28 14:36:33', '2024-10-28 14:36:33', 78, 1, NULL),
(8, 'PRIMARY 5', 'PRIMARY 5', 'PRIMARY', '', '2024-10-28 14:36:33', '2024-10-28 14:36:33', 30, 1, NULL),
(12, 'SS 1', 'SS 1', 'SENIOR SECONDARY', '', '2024-11-18 08:54:07', '2024-11-18 08:54:07', NULL, 1, NULL),
(13, 'SS 2', 'SS 2', 'SENIOR SECONDARY', '', '2024-11-18 08:54:07', '2024-11-18 08:54:07', NULL, 1, NULL),
(14, 'SS 3', 'SS 3', 'SENIOR SECONDARY', '', '2024-11-18 08:54:07', '2024-11-18 08:54:07', NULL, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `class_attendances`
--

CREATE TABLE `class_attendances` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `teacher_name` varchar(50) DEFAULT NULL,
  `teacher_id` varchar(50) DEFAULT NULL,
  `section` varchar(50) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `day` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `student_name` varchar(50) DEFAULT NULL,
  `admission_no` varchar(50) DEFAULT NULL,
  `term` varchar(50) DEFAULT NULL,
  `academic_year` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `notes` int(200) DEFAULT NULL,
  `school_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_management`
--

CREATE TABLE `class_management` (
  `id` int(11) NOT NULL,
  `class_code` varchar(100) NOT NULL,
  `class_name` varchar(100) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `max_population` varchar(100) DEFAULT '30',
  `class_teacher` varchar(100) DEFAULT NULL,
  `section` varchar(100) DEFAULT NULL,
  `no_of_student` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_role`
--

CREATE TABLE `class_role` (
  `teacher_id` int(10) NOT NULL,
  `section` varchar(100) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `role` varchar(100) NOT NULL,
  `school_id` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `class_role`
--

INSERT INTO `class_role` (`teacher_id`, `section`, `subject`, `class_name`, `role`, `school_id`) VALUES
(17, 'SENIOR SECONDARY', '', 'SS 1', 'Form Master', '1'),
(21, 'NURSERY', '', 'NURSERY 1', 'Form Master', '1');

-- --------------------------------------------------------

--
-- Table structure for table `class_rooms`
--

CREATE TABLE `class_rooms` (
  `id` int(11) NOT NULL,
  `block_no` varchar(50) DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_routine`
--

CREATE TABLE `class_routine` (
  `id` int(11) NOT NULL,
  `teacher` varchar(50) DEFAULT NULL,
  `class_` varchar(50) DEFAULT NULL,
  `section` varchar(50) DEFAULT NULL,
  `day` varchar(50) DEFAULT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `class_room` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_timing`
--

CREATE TABLE `class_timing` (
  `id` int(11) NOT NULL,
  `school_id` varchar(20) NOT NULL,
  `section` varchar(50) NOT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `activities` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `class_timing`
--

INSERT INTO `class_timing` (`id`, `school_id`, `section`, `start_time`, `end_time`, `activities`, `created_at`, `updated_at`) VALUES
(24, '1', 'JUNIOR SECONDARY', '01:15 PM', '01:45 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(17, '1', 'JUNIOR SECONDARY', '08:00 AM', '08:45 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(18, '1', 'JUNIOR SECONDARY', '08:45 AM', '09:30 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(19, '1', 'JUNIOR SECONDARY', '09:30 AM', '10:15 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(20, '1', 'JUNIOR SECONDARY', '10:15 AM', '11:00 AM', 'break', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(21, '1', 'JUNIOR SECONDARY', '11:00 AM', '11:45 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(22, '1', 'JUNIOR SECONDARY', '11:45 AM', '12:30 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(23, '1', 'JUNIOR SECONDARY', '12:30 PM', '01:15 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(8, '1', 'PRIMARY', '01:15 PM', '01:45 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(1, '1', 'PRIMARY', '08:00 AM', '08:45 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(2, '1', 'PRIMARY', '08:45 AM', '09:30 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(3, '1', 'PRIMARY', '09:30 AM', '10:15 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(4, '1', 'PRIMARY', '10:15 AM', '11:00 AM', 'break', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(5, '1', 'PRIMARY', '11:00 AM', '11:45 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(6, '1', 'PRIMARY', '11:45 AM', '12:30 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(7, '1', 'PRIMARY', '12:30 PM', '01:15 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(16, '1', 'SENIOR SECONDARY', '01:15 PM', '01:45 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(9, '1', 'SENIOR SECONDARY', '08:00 AM', '08:45 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(10, '1', 'SENIOR SECONDARY', '08:45 AM', '09:30 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(11, '1', 'SENIOR SECONDARY', '09:30 AM', '10:15 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(12, '1', 'SENIOR SECONDARY', '10:15 AM', '11:00 AM', 'break', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(13, '1', 'SENIOR SECONDARY', '11:00 AM', '11:45 AM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(14, '1', 'SENIOR SECONDARY', '11:45 AM', '12:30 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14'),
(15, '1', 'SENIOR SECONDARY', '12:30 PM', '01:15 PM', 'lesson', '2025-02-25 15:26:14', '2025-02-25 15:26:14');

-- --------------------------------------------------------

--
-- Table structure for table `data_entry_form`
--

CREATE TABLE `data_entry_form` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `admission_number` varchar(50) NOT NULL,
  `class1` varchar(100) DEFAULT NULL,
  `stream` varchar(50) DEFAULT NULL,
  `first_name1` varchar(255) NOT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `surname` varchar(255) NOT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `blood_group` varchar(10) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `state_of_origin` varchar(100) DEFAULT NULL,
  `home_address` text DEFAULT NULL,
  `street` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `relationship` varchar(50) DEFAULT NULL,
  `mobile_no` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `street1` varchar(255) DEFAULT NULL,
  `city1` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `event_categories`
--

CREATE TABLE `event_categories` (
  `id` int(11) NOT NULL,
  `category_name` varchar(110) NOT NULL,
  `category_color` varchar(20) DEFAULT NULL,
  `category_status` enum('Active','Inactive','Suspended','Deleted') NOT NULL DEFAULT 'Active',
  `school_id` int(20) DEFAULT NULL,
  `school_location` int(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_categories`
--

INSERT INTO `event_categories` (`id`, `category_name`, `category_color`, `category_status`, `school_id`, `school_location`) VALUES
(1, 'SCHOOL OPENING', 'Primary', 'Active', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `examinations`
--

CREATE TABLE `examinations` (
  `id` int(11) NOT NULL,
  `schedule_id` int(11) NOT NULL,
  `class_name` varchar(100) DEFAULT NULL,
  `subject` varchar(50) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `exam_type` varchar(100) DEFAULT NULL,
  `exammination_hall` varchar(20) DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `start_time` varchar(12) DEFAULT NULL,
  `end_time` varchar(12) DEFAULT NULL,
  `invigilator` varchar(50) DEFAULT NULL,
  `exam_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `examinations`
--

INSERT INTO `examinations` (`id`, `schedule_id`, `class_name`, `subject`, `title`, `exam_type`, `exammination_hall`, `duration`, `start_time`, `end_time`, `invigilator`, `exam_date`) VALUES
(7, 0, 'NURSERY 2', 'Arabic', NULL, NULL, '', '3 hrs', '00:03:00', '04:05:00', 'Halifa Shuaibu', '2024-10-17'),
(8, 1, 'NURSERY 1A', 'ARABIC', NULL, NULL, '', '420', '21:00 PM', '21:00 PM', 'Ishaq Ibrahim', '2024-12-27'),
(9, 1, 'NURSERY 2B', 'AGRIC SCIENCE', NULL, NULL, NULL, '', '9:06 PM', NULL, 'Ishaq Ibrahim', '2024-12-26');

-- --------------------------------------------------------

--
-- Table structure for table `exams_attendance`
--

CREATE TABLE `exams_attendance` (
  `id` int(11) NOT NULL,
  `teacher_name` varchar(50) DEFAULT NULL,
  `teacher_id` varchar(50) DEFAULT NULL,
  `exam` varchar(50) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `student_name` varchar(50) DEFAULT NULL,
  `admission_no` varchar(50) DEFAULT NULL,
  `term` varchar(50) DEFAULT NULL,
  `academic_year` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `notes` int(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exams_subject`
--

CREATE TABLE `exams_subject` (
  `id` int(11) NOT NULL,
  `application_no` varchar(100) DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exam_calendar`
--

CREATE TABLE `exam_calendar` (
  `id` int(10) UNSIGNED NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `exam_name` varchar(100) DEFAULT NULL,
  `academic_year` varchar(45) DEFAULT NULL,
  `term` enum('First Term','Second Term','Third Term') DEFAULT NULL,
  `exam_type` enum('General C.A','Monthly C.A','Terminal Exam','Promotional Exam','Other Test') DEFAULT 'General C.A',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('Expired','Ongoing','Suspended','Deleted','Pending','Competed') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exam_calendar`
--

INSERT INTO `exam_calendar` (`id`, `admin_id`, `exam_name`, `academic_year`, `term`, `exam_type`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`) VALUES
(1, NULL, 'End of First Term', '2024/2025', NULL, 'General C.A', '2025-02-27', '2025-03-29', 'Pending', '2025-02-15 23:52:53', '2025-02-15 23:52:53');

-- --------------------------------------------------------

--
-- Table structure for table `exam_creation`
--

CREATE TABLE `exam_creation` (
  `id` char(100) NOT NULL,
  `teacher_id` int(20) DEFAULT NULL,
  `assessment_type` varchar(100) DEFAULT NULL,
  `class_name` varchar(100) DEFAULT NULL,
  `term` varchar(100) DEFAULT NULL,
  `subject_name` varchar(100) DEFAULT NULL,
  `commence_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exam_grading`
--

CREATE TABLE `exam_grading` (
  `id` int(11) NOT NULL,
  `exam_id` int(11) DEFAULT NULL,
  `admission_no` varchar(45) NOT NULL,
  `student_name` varchar(45) DEFAULT NULL,
  `class_name` varchar(45) DEFAULT NULL,
  `subject` varchar(45) DEFAULT NULL,
  `CA_marks` int(11) DEFAULT NULL,
  `Ass_marks` int(11) DEFAULT NULL,
  `exam_marks` int(11) DEFAULT NULL,
  `total_score` int(11) DEFAULT NULL,
  `term` varchar(30) NOT NULL,
  `academic_year` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exam_questions`
--

CREATE TABLE `exam_questions` (
  `id` char(100) NOT NULL,
  `exam_id` char(100) DEFAULT NULL,
  `question` varchar(400) DEFAULT NULL,
  `marks` int(11) DEFAULT NULL,
  `option1` varchar(200) DEFAULT NULL,
  `option2` varchar(200) DEFAULT NULL,
  `option3` varchar(200) DEFAULT NULL,
  `option4` varchar(200) DEFAULT NULL,
  `answer` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `exam_reports`
-- (See below for the actual view)
--
CREATE TABLE `exam_reports` (
`id` int(11)
,`calendar_id` int(11)
,`admission_no` varchar(100)
,`student_name` varchar(100)
,`subject` varchar(100)
,`class_name` varchar(100)
,`academic_year` varchar(20)
,`term` varchar(30)
,`ca1Score` int(4)
,`ca2Score` int(4)
,`examScore` int(4)
,`total_score` int(4)
,`grade` varchar(10)
,`remark` varchar(20)
,`mark_by` varchar(100)
,`school_id` varchar(20)
,`type` varchar(10)
);

-- --------------------------------------------------------

--
-- Table structure for table `exam_table`
--

CREATE TABLE `exam_table` (
  `id` int(11) NOT NULL,
  `exam_id` char(100) DEFAULT NULL,
  `question_id` char(100) DEFAULT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `class_name` varchar(100) DEFAULT NULL,
  `question` varchar(100) DEFAULT NULL,
  `selected_option` varchar(2) DEFAULT NULL,
  `response` varchar(200) DEFAULT NULL,
  `answer` varchar(200) DEFAULT NULL,
  `mark` int(100) DEFAULT NULL,
  `remarks` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exam_table`
--

INSERT INTO `exam_table` (`id`, `exam_id`, `question_id`, `student_id`, `class_name`, `question`, `selected_option`, `response`, `answer`, `mark`, `remarks`) VALUES
(1, '6cef938b-7924-4f04-8792-4e3c8e69825c', 'eb4c3783-ac75-40ff-ab25-78e63a409db8', 'YMA/3/0001', 'ISLAMIYYA 1C', 'dutjvh', 'C', 'ghjk', 'fchcgvjn', 11, 'incorrect');

-- --------------------------------------------------------

--
-- Table structure for table `exposes`
--

CREATE TABLE `exposes` (
  `id` int(11) NOT NULL,
  `category_name` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `transaction_type` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `financial_report`
--

CREATE TABLE `financial_report` (
  `id` int(11) NOT NULL,
  `date` date DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `generic_school_fees`
--

CREATE TABLE `generic_school_fees` (
  `id` int(11) NOT NULL,
  `section` varchar(50) DEFAULT NULL,
  `description` varchar(100) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `fees` decimal(8,2) NOT NULL DEFAULT 0.00,
  `term` varchar(50) NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_by` varchar(50) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updted_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `generic_school_fees`
--

INSERT INTO `generic_school_fees` (`id`, `section`, `description`, `class_name`, `fees`, `term`, `academic_year`, `status`, `created_by`, `school_id`, `created_at`, `updted_at`) VALUES
(1, 'PRIMARY', 'Basic literacy and numeracy skills', 'PRIMARY 1', 65000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(2, 'NURSERY', 'Introduction to structured learning', 'NURSERY 1', 55000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(3, 'NURSERY', 'Preparation for primary education', 'NURSERY 2', 60000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(4, 'NURSERY', 'Early childhood foundational class', 'PRE-NURSERY', 50000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(5, 'PRIMARY', 'Expanded literacy and numeracy development', 'PRIMARY 2', 70000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(6, 'PRIMARY', 'Intermediate primary education', 'PRIMARY 3', 75000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(7, 'PRIMARY', 'Advanced primary learning', 'PRIMARY 4', 80000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(8, 'PRIMARY', 'Final stage of primary education', 'PRIMARY 5', 85000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(9, 'JUNIOR SECONDARY', 'Introduction to secondary school subjects', 'JSS 1', 90000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(10, 'JUNIOR SECONDARY', 'Intermediate junior secondary education', 'JSS 2', 95000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(11, 'JUNIOR SECONDARY', 'Preparation for senior secondary education', 'JSS 3', 100000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(12, 'SENIOR SECONDARY', 'Introduction to advanced secondary education', 'SS 1', 110000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(13, 'SENIOR SECONDARY', 'Advanced senior secondary learning', 'SS 2', 115000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10'),
(14, 'SENIOR SECONDARY', 'Final stage before tertiary education', 'SS 3', 120000.00, 'First Term', '2024/2025', 'Active', 'Admin', '1', '2025-02-26 10:31:10', '2025-02-26 10:31:10');

-- --------------------------------------------------------

--
-- Table structure for table `grade_setup`
--

CREATE TABLE `grade_setup` (
  `id` int(2) NOT NULL,
  `grade` varchar(20) NOT NULL,
  `remark` varchar(50) DEFAULT NULL,
  `min_score` tinyint(2) NOT NULL,
  `max_score` tinyint(3) NOT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grade_setup`
--

INSERT INTO `grade_setup` (`id`, `grade`, `remark`, `min_score`, `max_score`, `status`) VALUES
(1, 'A', 'Excellent', 75, 100, 'Active'),
(2, 'B', 'Very Good', 70, 74, 'Active'),
(4, 'C', 'Good', 60, 69, 'Active'),
(5, 'D', 'Average', 50, 59, 'Active'),
(8, 'E', 'Fair', 40, 49, 'Active'),
(9, 'F', 'Poor', 0, 39, 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `income`
--

CREATE TABLE `income` (
  `id` int(11) NOT NULL,
  `income_category_name` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `transaction_type` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_records`
--

CREATE TABLE `leave_records` (
  `id` int(11) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `user_name` varchar(50) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `no_of_days` int(11) NOT NULL,
  `applied_on` date NOT NULL DEFAULT cast(current_timestamp() as date),
  `status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `approved_by` varchar(50) DEFAULT NULL,
  `approved_on` date DEFAULT NULL,
  `school_location` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leave_records`
--

INSERT INTO `leave_records` (`id`, `user_role`, `user_id`, `user_name`, `class_name`, `type`, `start_date`, `end_date`, `no_of_days`, `applied_on`, `status`, `approved_by`, `approved_on`, `school_location`) VALUES
(1, 'Student', 'YMA/1/0001', 'AMINA MUHD BAKO', NULL, 'Special Leave', '2025-03-06', '2025-04-04', 30, '2025-02-16', 'Pending', NULL, NULL, 'Satellite Town, Tudun Yola, Kabuga Kano');

-- --------------------------------------------------------

--
-- Table structure for table `lessons`
--

CREATE TABLE `lessons` (
  `id` int(11) NOT NULL,
  `class_name` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `lesson_date` date DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `content` mediumtext DEFAULT NULL,
  `teacher` varchar(100) DEFAULT NULL,
  `title` varchar(259) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lessons`
--

INSERT INTO `lessons` (`id`, `class_name`, `subject`, `lesson_date`, `attachment`, `content`, `teacher`, `title`) VALUES
(1, 'SS 1', 'Chemistry', '2025-02-15', NULL, '<h1>VELANCE ELECTRONS</h1><h2>What is velance electrons?</h2><p><br></p>', 'Ishaq Ibrahim', 'VELANCE ELECTRONS');

-- --------------------------------------------------------

--
-- Table structure for table `lesson_comments`
--

CREATE TABLE `lesson_comments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_name` varchar(50) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lesson_id` int(11) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lesson_time_table`
--

CREATE TABLE `lesson_time_table` (
  `id` int(11) NOT NULL,
  `day` varchar(20) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `teacher_id` int(10) NOT NULL,
  `section` varchar(50) NOT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `school_id` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lesson_time_table`
--

INSERT INTO `lesson_time_table` (`id`, `day`, `class_name`, `subject`, `teacher_id`, `section`, `school_location`, `start_time`, `end_time`, `status`, `school_id`, `created_at`, `updated_at`) VALUES
(1, 'Monday', 'JSS 1', 'I.R.S.', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(2, 'Monday', 'JSS 1', 'ARABIC LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(3, 'Monday', 'JSS 1', 'MATHEMATICS', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(4, 'Monday', 'JSS 1', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(5, 'Monday', 'JSS 1', 'P.H.E', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(6, 'Monday', 'JSS 1', 'CIVIC EDUCATION', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(7, 'Monday', 'JSS 1', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(8, 'Tuesday', 'JSS 1', 'ARABIC LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(9, 'Tuesday', 'JSS 1', 'AGRIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(10, 'Tuesday', 'JSS 1', 'ENGLISH LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(11, 'Tuesday', 'JSS 1', 'CIVIC EDUCATION', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(12, 'Tuesday', 'JSS 1', 'BASIC TECH.', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(13, 'Tuesday', 'JSS 1', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(14, 'Tuesday', 'JSS 1', 'P.H.E', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(15, 'Wednesday', 'JSS 1', 'I.R.S.', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(16, 'Wednesday', 'JSS 1', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(17, 'Wednesday', 'JSS 1', 'AGRIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(18, 'Wednesday', 'JSS 1', 'BASIC TECH.', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(19, 'Wednesday', 'JSS 1', 'CIVIC EDUCATION', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(20, 'Wednesday', 'JSS 1', 'CREATIVE ART', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(21, 'Wednesday', 'JSS 1', 'HAUSA LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(22, 'Thursday', 'JSS 1', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(23, 'Thursday', 'JSS 1', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(24, 'Thursday', 'JSS 1', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(25, 'Thursday', 'JSS 1', 'CREATIVE ART', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(26, 'Thursday', 'JSS 1', 'ARABIC LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(27, 'Thursday', 'JSS 1', 'BASIC TECH.', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(28, 'Friday', 'JSS 1', 'I.R.S.', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(29, 'Thursday', 'JSS 1', 'AGRIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(30, 'Friday', 'JSS 1', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(31, 'Friday', 'JSS 1', 'P.H.E', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(32, 'Friday', 'JSS 1', 'HAUSA LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(33, 'Friday', 'JSS 1', 'HOME ECONOMICS', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(34, 'Friday', 'JSS 1', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(35, 'Friday', 'JSS 1', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(36, 'Monday', 'JSS 2', 'HISTORY', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(37, 'Monday', 'JSS 2', 'CREATIVE ART', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(38, 'Monday', 'JSS 2', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(39, 'Monday', 'JSS 2', 'P.H.E', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(40, 'Monday', 'JSS 2', 'HOME ECONOMICS', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(41, 'Monday', 'JSS 2', 'CIVIC EDUCATION', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(42, 'Monday', 'JSS 2', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(43, 'Tuesday', 'JSS 2', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(44, 'Tuesday', 'JSS 2', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(45, 'Tuesday', 'JSS 2', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(46, 'Tuesday', 'JSS 2', 'CREATIVE ART', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(47, 'Tuesday', 'JSS 2', 'HOME ECONOMICS', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(48, 'Tuesday', 'JSS 2', 'HAUSA LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(49, 'Tuesday', 'JSS 2', 'MATHEMATICS', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(50, 'Wednesday', 'JSS 2', 'AGRIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(51, 'Wednesday', 'JSS 2', 'ARABIC LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(52, 'Wednesday', 'JSS 2', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(53, 'Wednesday', 'JSS 2', 'I.R.S.', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(54, 'Wednesday', 'JSS 2', 'BASIC TECH.', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(55, 'Wednesday', 'JSS 2', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(56, 'Wednesday', 'JSS 2', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(57, 'Thursday', 'JSS 2', 'AGRIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(58, 'Thursday', 'JSS 2', 'ENGLISH LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(59, 'Thursday', 'JSS 2', 'CIVIC EDUCATION', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(60, 'Thursday', 'JSS 2', 'P.H.E', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(61, 'Thursday', 'JSS 2', 'MATHEMATICS', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(62, 'Thursday', 'JSS 2', 'ARABIC LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(63, 'Thursday', 'JSS 2', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(64, 'Friday', 'JSS 2', 'ENGLISH LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(65, 'Friday', 'JSS 2', 'CIVIC EDUCATION', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(66, 'Friday', 'JSS 2', 'BASIC TECH.', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(67, 'Friday', 'JSS 2', 'HOME ECONOMICS', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(68, 'Friday', 'JSS 2', 'HISTORY', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(69, 'Friday', 'JSS 2', 'ARABIC LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(70, 'Friday', 'JSS 2', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(71, 'Monday', 'JSS 3', 'HISTORY', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(72, 'Monday', 'JSS 3', 'BASIC TECH.', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(73, 'Monday', 'JSS 3', 'P.H.E', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(74, 'Monday', 'JSS 3', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(75, 'Monday', 'JSS 3', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(76, 'Monday', 'JSS 3', 'CREATIVE ART', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(77, 'Tuesday', 'JSS 3', 'ENGLISH LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(78, 'Monday', 'JSS 3', 'HOME ECONOMICS', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(79, 'Tuesday', 'JSS 3', 'I.R.S.', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(80, 'Tuesday', 'JSS 3', 'CIVIC EDUCATION', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(81, 'Tuesday', 'JSS 3', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(82, 'Tuesday', 'JSS 3', 'HAUSA LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(83, 'Tuesday', 'JSS 3', 'P.H.E', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(84, 'Tuesday', 'JSS 3', 'ARABIC LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(85, 'Wednesday', 'JSS 3', 'AGRIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(86, 'Wednesday', 'JSS 3', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(87, 'Wednesday', 'JSS 3', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(88, 'Wednesday', 'JSS 3', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(89, 'Wednesday', 'JSS 3', 'P.H.E', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(90, 'Wednesday', 'JSS 3', 'CREATIVE ART', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(91, 'Wednesday', 'JSS 3', 'MATHEMATICS', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(92, 'Thursday', 'JSS 3', 'HOME ECONOMICS', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(93, 'Thursday', 'JSS 3', 'NATIONAL VALUE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(94, 'Thursday', 'JSS 3', 'BUSINESS STUDIES', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(95, 'Thursday', 'JSS 3', 'BASIC TECH.', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(96, 'Thursday', 'JSS 3', 'ENGLISH LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(97, 'Thursday', 'JSS 3', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(98, 'Thursday', 'JSS 3', 'I.R.S.', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(99, 'Friday', 'JSS 3', 'CIVIC EDUCATION', 16, 'JUNIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(100, 'Friday', 'JSS 3', 'ENGLISH LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(101, 'Friday', 'JSS 3', 'MATHEMATICS', 16, 'JUNIOR SECONDARY', NULL, '09:30 AM', '10:15 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(102, 'Friday', 'JSS 3', 'HOME ECONOMICS', 16, 'JUNIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(103, 'Friday', 'JSS 3', 'I.R.S.', 16, 'JUNIOR SECONDARY', NULL, '12:30 PM', '01:15 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(104, 'Friday', 'JSS 3', 'BASIC SCIENCE', 16, 'JUNIOR SECONDARY', NULL, '11:45 AM', '12:30 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(105, 'Friday', 'JSS 3', 'ARABIC LANGUAGE', 16, 'JUNIOR SECONDARY', NULL, '01:15 PM', '01:45 PM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(107, 'Tuesday', 'Primary 1 A', 'Basic Science', 59, 'Primary', '', '08:00 AM', '08:45 AM', 'Active', '372369', '2025-03-05 10:43:03', '2025-03-05 10:43:03'),
(108, 'Wednesday', 'Primary 1 A', 'Basic Science', 59, '', '', '08:00 AM', '08:45 AM', 'Active', '372369', '2025-03-05 10:43:30', '2025-03-05 10:43:30'),
(109, 'Monday', 'Primary 1 B', 'Basic Science', 59, '', '', '09:30 AM', '10:15 AM', 'Active', '372369', '2025-03-05 10:45:42', '2025-03-05 10:45:42'),
(110, 'Wednesday', 'Primary 1 A', 'Basic Science', 59, 'PRIMARY', '', '08:00 AM', '08:45 AM', 'Active', '372369', '2025-03-05 10:48:26', '2025-03-05 10:48:26'),
(111, 'Monday', 'Primary 1 A', 'Basic Science', 59, 'JUNIOR SECONDARY', '', '08:45 AM', '09:30 AM', 'Active', '372369', '2025-03-05 10:48:55', '2025-03-05 10:48:55'),
(112, 'Monday', 'SS 1', 'I.R.S.', 16, 'SENIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(113, 'Monday', 'SS 1', 'BASIC SCIENCE', 16, 'SENIOR SECONDARY', NULL, '08:45 AM', '09:30 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(114, 'Tuesday', 'SS 1', 'ARABIC LANGUAGE', 16, 'SENIOR SECONDARY', NULL, '08:00 AM', '08:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03'),
(115, 'Tuesday', 'SS 1', 'ENGLISH LANGUAGE', 16, 'SENIOR SECONDARY', NULL, '11:00 AM', '11:45 AM', 'Active', '1', '2025-02-26 17:00:03', '2025-02-26 17:00:03');

-- --------------------------------------------------------

--
-- Table structure for table `library_catalogue`
--

CREATE TABLE `library_catalogue` (
  `id` int(11) NOT NULL,
  `book_title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `isbn` varchar(20) NOT NULL,
  `cover_img` varchar(500) DEFAULT NULL,
  `borrower_name` varchar(255) DEFAULT NULL,
  `date_borrowed` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `status` enum('Available','Borrowed','Overdue') DEFAULT 'Available',
  `qty` int(11) DEFAULT 0,
  `post_date` date DEFAULT NULL,
  `rack_no` varchar(255) DEFAULT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `book_no` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `number_generator`
--

CREATE TABLE `number_generator` (
  `description` varchar(100) NOT NULL,
  `prefix` varchar(100) NOT NULL,
  `code` int(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `number_generator`
--

INSERT INTO `number_generator` (`description`, `prefix`, `code`) VALUES
('subject_code', 'sub', 4),
('teacher', 'teach', 0),
('section_id', 'sec', 8);

-- --------------------------------------------------------

--
-- Table structure for table `other_subjects`
--

CREATE TABLE `other_subjects` (
  `school_id` varchar(20) NOT NULL,
  `academic_year` varchar(10) NOT NULL,
  `term` varchar(30) NOT NULL,
  `category` varchar(50) NOT NULL,
  `admission_no` int(11) NOT NULL,
  `grade` varchar(10) NOT NULL,
  `created_by` varchar(50) NOT NULL,
  `description` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parents`
--

CREATE TABLE `parents` (
  `id` int(11) NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `phone_no` varchar(14) NOT NULL,
  `email` varchar(50) DEFAULT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `is_guardian` varchar(100) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `user_id` int(10) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'Parent'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `ref_no` int(11) NOT NULL,
  `item_code` bigint(10) UNSIGNED NOT NULL,
  `description` varchar(200) NOT NULL,
  `class_name` varchar(100) NOT NULL,
  `admission_no` varchar(20) NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `term` varchar(30) NOT NULL,
  `payment_mode` varchar(255) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `qty` tinyint(2) DEFAULT 1,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `discount` decimal(8,2) NOT NULL DEFAULT 0.00,
  `fines` decimal(8,2) NOT NULL DEFAULT 0.00,
  `status` enum('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
  `created_by` varchar(30) DEFAULT NULL,
  `school_id` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qrcodesetup`
--

CREATE TABLE `qrcodesetup` (
  `id` int(11) NOT NULL,
  `qrcode` text NOT NULL,
  `usertype` varchar(50) NOT NULL,
  `expiry_datetime` datetime NOT NULL,
  `location_is_boolean` tinyint(1) DEFAULT 0,
  `longitude` decimal(10,8) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `status` enum('active','suspended','stopped') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `qrcodesetup`
--

INSERT INTO `qrcodesetup` (`id`, `qrcode`, `usertype`, `expiry_datetime`, `location_is_boolean`, `longitude`, `latitude`, `status`, `created_at`, `updated_at`) VALUES
(2, 'https://res.cloudinary.com/dp0qdgbih/image/upload/v1739621522/document/b6icrgsoq5c15whdpvip.png', 'teacher', '2026-03-01 00:00:00', 1, 3.37920570, 6.52437930, 'active', '2025-02-15 12:12:02', '2025-02-15 12:12:02');

-- --------------------------------------------------------

--
-- Table structure for table `receipt_urls`
--

CREATE TABLE `receipt_urls` (
  `id` int(10) NOT NULL,
  `ref_no` varchar(30) NOT NULL,
  `url` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rules`
--

CREATE TABLE `rules` (
  `id` int(11) NOT NULL,
  `rule_name` varchar(255) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `location_is_boolean` tinyint(1) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rules`
--

INSERT INTO `rules` (`id`, `rule_name`, `start_time`, `end_time`, `location_is_boolean`, `created_at`, `updated_at`) VALUES
(12, 'Early', '07:00:00', '07:30:00', 0, '2025-02-15 12:08:52', '2025-02-15 12:08:52');

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `event_for` varchar(60) DEFAULT NULL,
  `event_categry` enum('Celebration','Training','Holidays','Meeting') DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `attachment` varchar(500) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `priority` enum('High','Medium','Low') NOT NULL DEFAULT 'Low',
  `status` enum('Pending','OnHold','Inprogress','Done') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_user() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_calendar`
--

CREATE TABLE `school_calendar` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `color` varchar(30) NOT NULL DEFAULT 'primary',
  `status` enum('Active','Inactive','Cancelled') NOT NULL DEFAULT 'Active',
  `created_by` varchar(50) DEFAULT NULL,
  `recurrence` enum('Once','Annual') NOT NULL DEFAULT 'Once',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_locations`
--

CREATE TABLE `school_locations` (
  `id` int(11) NOT NULL,
  `school_id` varchar(20) NOT NULL,
  `location` varchar(200) NOT NULL,
  `short_name` varchar(10) NOT NULL,
  `status` enum('Active','Inactive') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_locations`
--

INSERT INTO `school_locations` (`id`, `school_id`, `location`, `short_name`, `status`) VALUES
(1, '1', 'Afforestation Road, Unguwar Jakada Dorayi Babba, Kano', 'YMA', 'Active'),
(2, '1', 'Hablan House, Rijiyar Zaki Off Gwarzo Road, Kano', 'YMA', 'Active'),
(3, '1', 'Satellite Town, Tudun Yola, Kabuga Kano', 'YMA', 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `school_section_table`
--

CREATE TABLE `school_section_table` (
  `school_id` varchar(50) NOT NULL,
  `section_id` varchar(50) NOT NULL,
  `section_name` varchar(50) NOT NULL,
  `section_address` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_section_table`
--

INSERT INTO `school_section_table` (`school_id`, `section_id`, `section_name`, `section_address`) VALUES
('933369', 'SEC/PAJ/00006', 'NURSERY', 'satelight town'),
('933369', 'SEC/PAJ/00007', 'PRIMARY', 'satelight town'),
('933369', 'SEC/PAJ/00009', 'JUNIOR SECONDARY', 'satelight town'),
('933369', 'SEC/PAJ/00010', 'SENIOR SECONDARY', 'tudun murtala'),
('1', 'SEC/YMA/00001', 'NURSERY', 'Naibawa'),
('1', 'SEC/YMA/00002', 'PRIMARY', 'Naibawa'),
('1', 'SEC/YMA/00003', 'JUNIOR SECONDARY', 'NAIBAWA'),
('1', 'SEC/YMA/00004', 'SENIOR SECONDARY', 'KANO'),
('372369', 'SEC/NAF/00005', 'PRIMARY', 'Kano'),
('372369', 'SEC/NAF/00006', 'JUNIOR SECONDARY', 'Kano'),
('493125', 'SEC/BGA/00007', 'NURSERY', 'kano'),
('493125', 'SEC/BGA/00008', 'PRIMARY', 'kano');

-- --------------------------------------------------------

--
-- Table structure for table `school_setup`
--

CREATE TABLE `school_setup` (
  `id` varchar(10) NOT NULL,
  `serial_no` int(11) NOT NULL DEFAULT 0,
  `school_name` varchar(500) NOT NULL,
  `short_name` varchar(10) NOT NULL,
  `school_motto` varchar(500) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `lga` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `primary_contact_number` varchar(13) DEFAULT NULL,
  `secondary_contact_number` varchar(13) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `school_master` tinyint(1) DEFAULT 0,
  `express_finance` tinyint(1) DEFAULT 0,
  `cbt_center` tinyint(1) DEFAULT 0,
  `result_station` tinyint(1) DEFAULT 0,
  `academic_year` varchar(20) DEFAULT NULL,
  `term` enum('First term','Second term','Third term') DEFAULT NULL,
  `session_start_date` date DEFAULT NULL,
  `session_end_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `badge_url` varchar(500) DEFAULT NULL,
  `mission` varchar(300) DEFAULT NULL,
  `vission` varchar(300) DEFAULT NULL,
  `about_us` varchar(300) DEFAULT NULL,
  `nursery_section` tinyint(1) NOT NULL DEFAULT 0,
  `primary_section` tinyint(1) NOT NULL DEFAULT 0,
  `junior_secondary_section` tinyint(1) NOT NULL DEFAULT 0,
  `senior_secondary_section` tinyint(1) NOT NULL DEFAULT 0,
  `islamiyya` tinyint(1) NOT NULL DEFAULT 0,
  `tahfiz` tinyint(1) NOT NULL DEFAULT 0,
  `school_url` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_setup`
--

INSERT INTO `school_setup` (`id`, `serial_no`, `school_name`, `short_name`, `school_motto`, `state`, `lga`, `address`, `primary_contact_number`, `secondary_contact_number`, `email`, `school_master`, `express_finance`, `cbt_center`, `result_station`, `academic_year`, `term`, `session_start_date`, `session_end_date`, `status`, `badge_url`, `mission`, `vission`, `about_us`, `nursery_section`, `primary_section`, `junior_secondary_section`, `senior_secondary_section`, `islamiyya`, `tahfiz`, `school_url`, `created_at`, `updated_at`) VALUES
('1', 1001, 'YAZID MEMORIAL ACADEMY', 'YMA', '', '', '', 'No. 11 Hablan House, Rijiyar Zaki Off Gwarzo Road, Kano.', '0', NULL, '', 0, 0, 0, 0, '2024/2025', 'First term', '2024-09-01', '2025-08-30', 'active', 'https://yma.elscholar.ng/static/media/YMA.1fd9f35d0f3bd0a23212.png', '', '', '', 0, 0, 0, 0, 0, 0, NULL, '2024-11-15 10:35:47', '2025-03-05 11:41:30'),
('372369', 0, 'NAZIF ACADEMY', 'NAF', 'Education is Light', 'Kano', 'Nassarwa', 'Sani Abacha way', '08080808080', '', 'eliteedtech1@gmail.com', 1, 1, 1, 1, NULL, NULL, NULL, NULL, 'active', '', NULL, NULL, NULL, 1, 1, 1, 1, 0, 0, 'http://localhost:3000/NAF/372369', '2025-03-05 09:50:54', '2025-03-05 09:50:54'),
('493125', 0, 'BAGWAI ACADEMY', 'BGA', 'Education is Light', 'Kano', 'Kumbotso', 'Sani Abacha way', '0703535544', '070353843455', 'bagwai@gmail.com', 1, 1, 1, 1, NULL, NULL, NULL, NULL, 'active', '', NULL, NULL, NULL, 1, 1, 1, 1, 1, 1, 'http://localhost:3000/BGA/493125', '2025-03-05 11:52:12', '2025-03-05 11:52:12'),
('EIA', 0, 'ELITE INTERNATIONAL ACACEMY', 'EIA', 'Dedication is the key to success ', 'Kano State', 'Gwale ', 'African alacen Air Port Road Kano', '09160208018', '', 'halifashuaibu12@gmail.com', 1, 1, 1, 1, NULL, NULL, NULL, NULL, 'active', '', NULL, NULL, NULL, 1, 1, 1, 1, 0, 0, NULL, '2025-02-25 12:30:25', '2025-03-04 14:04:54');

-- --------------------------------------------------------

--
-- Table structure for table `secondary_school_entrance_form`
--

CREATE TABLE `secondary_school_entrance_form` (
  `id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `guardian_id` int(11) DEFAULT NULL,
  `name_of_applicant` varchar(255) NOT NULL,
  `type_of_application` varchar(100) DEFAULT NULL,
  `home_address` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `religion` varchar(50) DEFAULT NULL,
  `tribe` varchar(50) DEFAULT NULL,
  `school_attended` varchar(255) DEFAULT NULL,
  `class1` varchar(50) DEFAULT NULL,
  `state_of_origin` varchar(100) DEFAULT NULL,
  `l_g_a` varchar(100) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `time` time DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `common_entrance` varchar(50) DEFAULT NULL,
  `placement` varchar(50) DEFAULT NULL,
  `examination_date` date DEFAULT NULL,
  `date` date DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `examination_number` varchar(50) DEFAULT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `state_of_origin1` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `school` varchar(255) DEFAULT NULL,
  `examination_number1` varchar(50) DEFAULT NULL,
  `name1` varchar(255) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `state_of_origin2` varchar(100) DEFAULT NULL,
  `state_of_origin3` varchar(100) DEFAULT NULL,
  `home_address1` text DEFAULT NULL,
  `office_marker_address` text DEFAULT NULL,
  `telephone_address` varchar(20) DEFAULT NULL,
  `time1` time DEFAULT NULL,
  `venue1` varchar(255) DEFAULT NULL,
  `image` blob DEFAULT NULL,
  `last_school_atterded` varchar(100) DEFAULT NULL,
  `special_health_needs` varchar(100) DEFAULT NULL,
  `date_of_birth1` date DEFAULT NULL,
  `father_place_of_work` varchar(100) DEFAULT NULL,
  `father_occapation` varchar(100) DEFAULT NULL,
  `blood_group` varchar(100) DEFAULT NULL,
  `applicant_no` int(11) DEFAULT NULL,
  `class` varchar(100) DEFAULT NULL,
  `mathematics` int(11) DEFAULT 0,
  `english` int(11) DEFAULT 0,
  `others` varchar(100) DEFAULT NULL,
  `other_score` int(10) DEFAULT 0,
  `admission_no` varchar(50) DEFAULT NULL,
  `application_no` varchar(100) DEFAULT NULL,
  `academic_year` int(11) DEFAULT NULL,
  `admission_date` date DEFAULT NULL,
  `roll_number` int(11) DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  `section` varchar(100) DEFAULT NULL,
  `house` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `primary_contact_number` int(11) DEFAULT NULL,
  `caste` varchar(100) DEFAULT NULL,
  `mother_tongue` varchar(100) DEFAULT NULL,
  `language_known` varchar(100) DEFAULT NULL,
  `current_class` varchar(50) DEFAULT NULL,
  `upload` varchar(300) DEFAULT NULL,
  `medical_condition` varchar(300) DEFAULT NULL,
  `upload_transfer_certificate` varchar(300) DEFAULT NULL,
  `secondary_school_entrance_formcol` varchar(45) DEFAULT NULL,
  `school_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `secondary_school_entrance_form`
--
DELIMITER $$
CREATE TRIGGER `after_app_update` AFTER UPDATE ON `secondary_school_entrance_form` FOR EACH ROW BEGIN
    -- Check if the status has changed to 'Assigned'
    IF NEW.status = 'Assigned' AND OLD.status != 'Assigned' THEN
        -- Insert into students table
        INSERT INTO students (
            app_id,
            parent_id,
            guardian_id,
            full_name,
            home_address,
            date_of_birth,
            sex,
            religion,
            tribe,
            state_of_origin,
            l_g_a,
            nationality,
            last_school_atterded,
            special_health_needs,
            blood_group,
            admission_no,
            admission_date,
            academic_year,
            status,
            section,
            mother_tongue,
            language_known,
            current_class,
            profile_picture,
            medical_condition
        )
        VALUES (
            NEW.id,
            NEW.parent_id,
            NEW.guardian_id,
            NEW.name_of_applicant, -- Mapping name_of_applicant to full_name in students table
            NEW.home_address,
            NEW.date_of_birth,
            NEW.sex,
            NEW.religion,
            NEW.tribe,
            NEW.state_of_origin,
            NEW.l_g_a,
            NEW.nationality,
            NEW.last_school_atterded,
            NEW.special_health_needs,
            NEW.blood_group,
            NEW.admission_no,
            NEW.admission_date,
            NEW.academic_year,
            NEW.status,
            NEW.section,
            NEW.mother_tongue,
            NEW.language_known,
            NEW.current_class,
            NEW.upload, -- Mapping upload to profile_picture in students table
            NEW.medical_condition
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `app_id` int(11) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `guardian_id` int(11) DEFAULT NULL,
  `student_name` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'Student',
  `home_address` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `religion` varchar(50) DEFAULT NULL,
  `tribe` varchar(50) DEFAULT NULL,
  `state_of_origin` varchar(100) DEFAULT NULL,
  `l_g_a` varchar(100) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `last_school_atterded` varchar(100) DEFAULT NULL,
  `special_health_needs` varchar(100) DEFAULT NULL,
  `blood_group` varchar(100) DEFAULT NULL,
  `admission_no` varchar(50) NOT NULL,
  `admission_date` date DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  `section` varchar(100) DEFAULT NULL,
  `mother_tongue` varchar(100) DEFAULT NULL,
  `language_known` varchar(100) DEFAULT NULL,
  `current_class` varchar(50) DEFAULT NULL,
  `profile_picture` varchar(300) DEFAULT NULL,
  `medical_condition` varchar(300) DEFAULT NULL,
  `transfer_certificate` varchar(500) DEFAULT NULL,
  `school_location` varchar(200) DEFAULT NULL,
  `school_id` int(11) NOT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`app_id`, `parent_id`, `guardian_id`, `student_name`, `role`, `home_address`, `date_of_birth`, `sex`, `religion`, `tribe`, `state_of_origin`, `l_g_a`, `nationality`, `last_school_atterded`, `special_health_needs`, `blood_group`, `admission_no`, `admission_date`, `academic_year`, `status`, `section`, `mother_tongue`, `language_known`, `current_class`, `profile_picture`, `medical_condition`, `transfer_certificate`, `school_location`, `school_id`, `password`) VALUES
(NULL, NULL, NULL, 'HALIFA NAGUDU NAIBAWA', 'Student', 'Sani Abacha way', '2025-03-04', 'Male', 'Islam', '', '', '', NULL, NULL, '', 'A -ve', 'NAF/0001', NULL, '2024/2025', '', 'PRIMARY', 'Hausa', 'Hausa', 'Primary 1 A', '', '', NULL, 'KANO', 372369, NULL),
(NULL, NULL, NULL, 'UMAR SAN', 'Student', 'Sani Abacha way', '2025-03-11', 'Male', 'Christianity', '', '', '', NULL, NULL, '', 'A -ve', 'NAF/0002', NULL, '2024/2025', '', 'JUNIOR SECONDARY', 'Igbo', 'Igbo', 'JSS 1A', '', '', NULL, 'KANO', 372369, NULL);

--
-- Triggers `students`
--
DELIMITER $$
CREATE TRIGGER `generate_admission_no` BEFORE INSERT ON `students` FOR EACH ROW BEGIN
    DECLARE v_short_name VARCHAR(50);
    DECLARE v_last_number INT;
    DECLARE v_new_admission_no VARCHAR(100);

    -- Get the short_name of the school
    SELECT short_name INTO v_short_name 
    FROM school_setup 
    WHERE id = NEW.school_id;

    -- Get the last admission number for this school
    SELECT CAST(SUBSTRING_INDEX(admission_no, '/', -1) AS UNSIGNED) 
    INTO v_last_number
    FROM students 
    WHERE school_id = NEW.school_id 
    ORDER BY CAST(SUBSTRING_INDEX(admission_no, '/', -1) AS UNSIGNED) DESC 
    LIMIT 1;

    -- If no previous admission number exists, start from 1
    IF v_last_number IS NULL THEN
        SET v_last_number = 1;
    ELSE
        SET v_last_number = v_last_number + 1;
    END IF;

    -- Generate the new admission number
    SET v_new_admission_no = CONCAT(v_short_name, '/', LPAD(v_last_number, 4, '0'));

    -- Assign the generated admission number to the new student
    SET NEW.admission_no = v_new_admission_no;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `student_aggregated_results`
--

CREATE TABLE `student_aggregated_results` (
  `admission_no` varchar(20) NOT NULL,
  `student_name` varchar(20) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `aggregate_score` int(11) DEFAULT NULL,
  `average_score` decimal(10,2) DEFAULT NULL,
  `aggregate_grade` varchar(5) DEFAULT NULL,
  `position` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_aggregated_results`
--

INSERT INTO `student_aggregated_results` (`admission_no`, `student_name`, `class_name`, `aggregate_score`, `average_score`, `aggregate_grade`, `position`) VALUES
('YMA/1/0001', 'AMINA MUHD BAKO', 'SS 1', 0, 0.00, 'F', 5),
('YMA/1/0002', 'ABDULLAHI KABIR BELL', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0003', 'HANIFA SANI SAID', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0005', 'ABDALLAH ABDULSALAM ', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/1/0006', 'UMMI SALMA HABU HASS', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0007', 'AISHA HASSAN ISYAKU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0008', 'MAHMUD ADEEL MUHAMMA', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/1/0009', 'AL-AMIN HABU HASSAN', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0010', 'MUHAMMAD KHAMIS', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0011', 'SHARIF AIMAN AHMAD', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0013', 'MUHAMMAD YAHAYA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0014', 'AL_AMEEN DAHIRU', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0016', 'HASINA ABDULKADIR', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0017', 'MAIMUNA ABUBAKAR SAD', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0019', 'AMATULLAH K ABDUSSAL', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0020', 'FATIMA IBRAHIM BABA', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0023', 'RAJI AISHA LADAN', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0024', 'RUKAYYA IBRAHIM', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0025', 'RAHAMA SANI ', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/1/0027', 'MARYAM GADDAFI IBRAH', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0029', 'MUHAMMAD NURA NAGODA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0030', 'MUUHAMMAD K BELLO', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0033', 'HAFSA ABDURRAHIM.D', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0034', 'UMMUKULSUM YUSUF I', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0035', 'SAEED NURA SHEHU', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0037', 'AHMAD YUSUFSALIS', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0038', 'UMAR TIJJANI UMAR', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0039', 'AMINATU SANUSI', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0040', 'ABDUSSALAM AMINU ABD', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0041', 'MUSA JIBRIN ALI', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/1/0043', 'FATIMA ALIYU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0044', 'FAUZIYA DAUDA ARIBAD', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0045', 'SHAHBIR S. AHMAD', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0046', 'AHMAD', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0048', 'FATIMA MUHAMMAD TAHI', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/1/0049', 'SALMA ABDULLATEEF', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0050', 'MUSTAPHA SAIFULLAHI', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0051', 'HAFSAT MAHADI ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0053', 'ABDULRAHMAN UMAR GAY', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/1/0055', 'SALISU SALISU SAMINU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0056', 'ABDULQADIR IBRAHIM A', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0057', 'HANAN', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0058', 'MAHMUD RAJI LADAN', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/1/0060', 'HABIBA ALIYU SULEIMA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0061', 'HAFSAT MUHAMMAD BAKO', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0062', 'KHADIJA AMINU ABDULK', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0064', 'USMAN MUSA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0066', 'MUHAMMAD AHMAD JIBRI', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0067', 'AL-MUSTAPHA  IBRAHIM', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0068', 'FADILA TAHIR', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0069', 'MUSTAPHA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0071', 'ABDUSSAMAD YAHAYA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0072', 'KHADIJA SAI\'DU DUKAW', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0075', 'ISHA SANI SABITU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0076', 'SULEIMAN ALIYU SULEI', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0078', 'RAHMA MUSTAPHA', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0079', 'Ibrahim Gaddafi Ibra', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0080', 'SULAIMAN MUHAMMAD ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0083', 'KHADIJA ALIYU SULAMA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0084', 'RABI\'A YUSUF  SALISU', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0086', 'SAUDAI HASSAN ISYAKU', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0087', 'MUHAMMAD TAHIR', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0091', 'ABDULLWAHAB SAGIR SA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0092', 'HABIBA ABDULAZIZ', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0093', 'MISBANU BELLO USMAN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0095', 'AHMAD SULAMAN DANWAR', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0097', 'ALIYU USMAN ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0099', 'FATIMA SHEHU MAGAJI', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0101', 'ABUBAKAR ABDUIMUMIN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0104', 'FATIMA MUHAMMAD', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0105', 'KHADIJA IBRAHIM SIRA', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0106', 'ISAH BELLO USMAN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0109', 'SALISU UMAR SANI', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0111', 'FATIMA USMAN UMAR', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0113', 'ALAMIN NAZIFI AMINU', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0114', 'SHU\'AIB NASIDI', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0118', 'SAUDA TIJJANI UMAR', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0119', 'FARUK BASHIR UMAR', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0123', 'KHADIJA NAJIB USMAN', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0125', 'SADIQ M.B YOLA ', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0126', 'AZ-ZUBAIR ABDULRASHI', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0128', 'AUWAL NURADDEN ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0130', 'ABUBARKAR MUNZIA', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0131', 'FATIMA ABDULRAHMAN R', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0132', 'UMAR ABDULMUMIN', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0134', 'MARYAMA BILIYAMU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0135', 'SARAFU HABIBU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0137', 'MUHAMMAD KABIRU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0138', 'FATIMA SALISU SAMINU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0142', 'MARYAM ABDURRAHMAN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0143', 'KHADIJA ABDULRASHID ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0144', 'AISHA MUSTAFA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0145', 'MUHAMMAD BILIYAMINU ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0146', 'AISHA YAHAYA SANI', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0187', 'HAFSAT ASHIRU YUSUF', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0188', 'AYSHA UMAR KASIM', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0189', 'FARUK UMAR GAYA', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0190', 'FATIMA ABDULSALAM', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0191', 'HAMZA HABIB', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0192', 'USMAN MUSTAPHA  AHMA', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0193', 'ABUBAKAR TASIU', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0194', 'MOHAMMAD ABDUKADIR', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0195', 'AMMAR ADAM ', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0196', 'FATIMA EL-MASUR UBA', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0197', 'SADIQ EL-MANSUR', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0198', 'HAMIDAN SHARIFF SANI', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0199', 'IZZULARAB IBRAHIM', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0200', 'ABUBAKAR A UMAR ', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0201', 'MUNIRAT MUHAMMAD', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0202', 'ABUBAKAR SANI ABDULL', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0203', 'AZIMA ALIYU', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0204', 'ZAINAB AMINU SALADU ', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0205', 'ABDULMALIK MUBARAK', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0206', 'RAHMA AHMAD ', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0207', 'HASSANA ABUBAKAR ARZ', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0208', 'NASIR NURUDDAM', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0209', 'MUHAMMAD USMAN', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0210', 'ZULAIHAT B ', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0211', 'MUJIBA MUHAMMAD', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0212', 'ADAMA MUSTAPH', 'NURSERY 1', 584, 58.40, 'D', 4),
('YMA/1/0213', 'YAHYA Y ILYASU', 'NURSERY 1', 701, 70.10, 'B', 3),
('YMA/1/0214', 'YUSUF GARBA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0216', 'HUMAIDA SANI LAWAL', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0218', 'SULEIMAN AUWAL', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0220', 'SALMA KABIR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0223', 'AISHA Y BHUWO ', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0225', 'HAFSATS LAWAN', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0228', 'ZAHRA MUNIR SANI', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0230', 'USMAN ABEED MUHAMMMA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0231', 'ABDURRAHMAN A ADAM', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0232', 'HINDU MUHAMMAD', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0233', 'FAREED MUAZU', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0234', 'BASHIR NASIR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0235', 'HUSSAINI ABUBAKAR AR', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0236', 'ALIYU ASLAM', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0237', 'ABDULHAMEED', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0238', 'MARYAM MUSTAPHA KANY', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0239', 'SHEHU SHEHU BABA', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0240', 'FATIMA MB YOLA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0241', 'SHAMKA BILIYAMINU', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0242', 'MUHAMMAD YAHAYA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0243', 'AMATU HALIM MUHD ILI', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0244', 'ZINATULL EHIMAN MUDA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0245', 'MUH\'D BASHIR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0246', 'SADIQ BADAMASI ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0247', 'ABDULAZIZ MUDASSIR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0248', 'RAHAMA YUSUF GARBA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0249', 'MUKTAR IBRAHIM', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0250', 'FAUWWAZ ABDULKADIR ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0251', 'ALIYU NURA UBA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0252', 'RUKAYYA AMINU ABDULK', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0253', 'HAUWA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0254', 'SAUDAH AMINU KANO', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0255', 'RUKKAYA ABDULMALIK', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0256', 'HAUWA WADA AHMAD ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0257', 'ABDULLAHI GARBA SALE', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0258', 'FATIMA ADAM Z', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0259', 'KHADIJA SALSABEEL AH', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0260', 'FATIMA UMAR KASIM', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0262', 'RABIU SALISU SAMINU', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0265', 'ALIYU YUSUF GARBA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0266', 'RAHMA ABDULKADIR LAW', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0267', 'HASSANA USMAN UMAR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0268', 'HAFSAT MUHAMMAD SAMI', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0269', 'HABIBA TIJJANI UMAR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0270', 'SAFIYYAH MUBARAK UBA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0271', 'FATIMA HASSAN ISHYAK', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0272', 'FATIMA ABUBAKAR ARZI', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0273', 'MAHI SHARIF SANI', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0274', 'SULEIMAN AUWAL SULEI', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0275', 'ABUBAKAR SANUSI GARB', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0276', 'FATIMA JIBRIL JUDA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0277', 'RUKAYYA NURA UBA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0278', 'AISHA HABIBU', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0279', 'AMINATU HAMZA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0280', 'UMAR USMAN UMAR', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0281', 'USMAN MUHD ALTO', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0282', 'LUKMAN BILIYAMINU', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0283', 'AHMAD YUSUF GARBA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0284', 'ABDULRAUF SULEIMAN U', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0285', 'ATIAFRASH MOHD ATIAI', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0287', 'ABUBAKAR YUSUF GARBA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0288', 'KHADIJA USMAN ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0289', 'NAFISA TIJJANI UMAR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0290', 'HUSSAINI SANI', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0291', 'FATIMA FATIU ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0292', 'ABUBAKAR IBRAHIM', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0293', 'MUKHTAR SAMINU ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0294', 'AHMAD USMAN', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0295', 'ABDULLAH USMAN ', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0296', 'MARYAM ASHIRU YUSUF', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0297', 'MARYAM IDRIS', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0298', 'MARYAM BUHARI', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0299', 'ABDULLAH ZAMZILU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0300', 'MUHD A SAMINU ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0301', 'ALIYU SANI', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0302', 'KHALIL USMAN ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0303', 'ZULALIHAT ABDULHAMID', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0304', 'YUSUF MUAMMAD', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0305', 'RUQAYYA SAI\'DU DUKAW', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0306', 'HABIBA MURTALA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0307', 'KHADIJA BASHIR ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0308', 'RABI\'A AHMAD AHLI', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0309', 'BILKISU BASHIR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0310', 'AISHA DAHIRU', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0311', 'YUSUF YUSUF SA\'IDU', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0312', 'KHADIJA HAMZA SULAIM', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0313', 'FATIMA ABUBAKAR SADI', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0314', 'MUHAMMAD NURADDEEN', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0315', 'FATIMA SAIFULLAHI', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0316', '', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0317', 'AISHA YAHYA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0318', 'MUHAMMAD MURTALA SHA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0319', 'ZAINAB MUHIDDIN', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0320', 'TIJJANI AHMAD YUSUF', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0321', 'SUNUSI BASHIR SULAIM', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0322', 'HALIMA UMAR KASIM', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0323', 'SADIQ SULAIMAN MUHAM', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/1/0324', 'sulaiman abba', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0325', 'ABUBAKAR MUHD BAKO', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0326', 'SA\'ADA MUSTAPHA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0327', 'FATIMA KABIR BELLO', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/1/0328', 'HABIBA YAHAYA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0329', 'FATIMA LAWAN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0330', 'HAUWA UMAR MUHD', 'SS 2', 0, 0.00, 'F', 5),
('YMA/1/0338', 'ABUBAKAR MUSTAPHA', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/1/0339', 'ABDULKADIR NURA', 'SS 1', 0, 0.00, 'F', 5),
('YMA/1/0340', 'HAFSAT ABUBAKAR SANI', 'SS 1', 0, 0.00, 'F', 5),
('YMA/1/0341', 'USMAN MUHD GHAZALI', 'SS 1', 0, 0.00, 'F', 5),
('YMA/1/0342', 'AHMAD IDRIS WARURE', 'SS 1', 0, 0.00, 'F', 5),
('YMA/1/0343', 'UMMU-KULSUM MOHD', 'SS 1', 0, 0.00, 'F', 5),
('YMA/1/0344', 'AISHA RAJI LADAN', 'SS 1', 0, 0.00, 'F', 5),
('YMA/1/0350', 'ABDULLAHI SAMMANIMAR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0351', 'FATIMA YAHAYA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0352', 'FATIMA SAMMANI MAFRA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0353', 'MARYAM KABIR BELLO', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0354', 'BASMA .A. ABUBAKAR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0355', 'AHMAD HABIB', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0356', 'IBRAHIM YAHAYA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0357', 'AISHA UMAR SANI', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0358', 'KHADIJA ABDULSALAM', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0359', 'NOBEEL NASIR GARBA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/1/0363', 'ABDULHAMEED SULEIMAN', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0364', 'FAREED MUAZU', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0365', 'ZAHRA MUNIR SANI', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0366', 'USMAN ABEED MUHAMMAD', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0367', 'HAFSAT S LAWAN', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0368', 'aisha y.b/zuwo', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0369', 'SALMA KABIR BELLO', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0370', 'SULEIMAN AUWAL', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0371', 'MUH\'D BASHIR CHAMO', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0372', 'ZANITUL EHMAN MUDASS', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0373', 'RAHMA YUSUF GARBAR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0374', 'ABDULRAHMAN NURA NAG', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0375', 'RUKAYYA AMINU ABDULK', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0376', 'RUCAYYA ABDULMALILUA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0377', 'JAFAR GAFRISH', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/1/0378', 'HAMAIDA SANI LAWAL', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0379', 'YUSUF GARBA SALE', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0380', 'AISHA BADMASI ISMAIL', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0381', 'HUSAINA USMAN UMAR', 'NURSERY 1', 852, 85.20, 'A', 1),
('YMA/1/0382', 'YAHAYA Y ILIYASU', 'NURSERY 1', 749, 74.90, 'A', 2),
('YMA/1/0383', 'ADAMA MUSTAPH', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/1/0384', 'AHMAD SAIFULLAH', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0385', 'HANAN ABDUKADIR', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0386', 'ZULAIHAT B CHAMO', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0387', 'MUJIBA MUHAMMAD', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/1/0388', 'ABDULRAHMAN A ADAM', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0001', 'HAUWA ZAKARI', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0002', 'ABDULRAHMAN MURTAL A', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0003', 'ALIYU AHMAD MUHAMMAD', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0004', 'FATIMA HAFIZU DANNA ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0006', 'FATIMAH MIKAIL', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0008', 'FATIMA SUNISI ABUBAK', 'SS 2', 0, 0.00, 'F', 5),
('YMA/2/0009', 'HAFSAT IBRANEEN HAIN', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0011', 'SULAIMAN ALIYU', 'SS 2', 0, 0.00, 'F', 5),
('YMA/2/0012', 'HANAN ABDULLAHI MUHA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0013', 'JUWAIRIYYA KAMAL ABD', 'SS 2', 0, 0.00, 'F', 5),
('YMA/2/0014', 'AISHA AMINU', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0015', 'YUSUF ABDULLAHI', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0016', 'LAWAN YUSUF', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0017', 'AMINA AUWAL', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0019', 'KHADIJA UMAR ALIYU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0020', 'SAFIYA MUSA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0022', 'HUSAMUDDEEN AHMAD', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0024', 'SAADATU AHMAD', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0026', 'IBRAHIM DAYYABU', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0027', 'YUSUF AMINU ISYAKU', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0029', 'ABDULKADIR I BASHIR', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0031', 'HAUWA IBRAHIM', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0032', 'MUHAMMAD .A.SAAD', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0034', 'SARATU SHUAIBU NURAI', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0035', 'MARYAM HASSAN', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0036', 'AISHY AHMAL ', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0037', 'ISHAQ AHMED', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0039', 'ALAMIN YAHAYA', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0040', 'AISHA MU\'AZZIM', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0041', 'RAMATU MUSA BASHIR', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0043', 'MINAL JAMIL', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0044', 'KHADIJAH UMAR YAU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0047', 'USMAN IBRAHIM', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0048', 'MARYAM AUWAL ALIYU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0050', 'ZAINAB BELLO TUKUR', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0051', 'HAFSAT M. BASHIR', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0052', 'IBRAHIM ABUBAKAR', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0055', 'AISHA AHMAD MOHD', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0056', 'KHADIJA M. GHAZALI', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0058', 'ASMAU IBRAHIM', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0059', 'MUHAMMAD MUSTAPHA AL', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0060', 'SHAFIU ABDULLAHI', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0062', 'HALIMA BASHIR ABDULL', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0064', 'ZAINAB MUHHAMED', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0065', 'FATIMA ZARAH HAMZA S', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0067', 'HAUWA G HANGA', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0068', 'MARYAM YUSUF', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0070', 'KHADIJA ADNAN', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0073', 'UMMU\'ABIHA SABIU S.', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0075', 'HINDERTU AABUBAKAR A', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0076', 'WAHIDA JAMIL LAWAN', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/2/0077', 'AL-MUSTAPLA IMAIWAKE', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0095', 'USMAN YUSUF', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0096', 'MANSUR I. KYAURE', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0097', 'AUWAL AMINU', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0098', 'FATIMA UMAR', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0099', 'AHMAD MUJITABA ASHIR', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0100', 'MARYAM DAYYIB', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0101', 'MUHAMMDAD MUJITABA A', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0102', 'HALIMA MU\'AZZAM ', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0103', 'SADIK JAMIL', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0104', 'MARYAM AMINU SUNUSI', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0105', 'FATIMA ABDULLAHI', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0106', 'YAHAYA SHUAIBU ', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0107', 'AISHA ABDULLAHI ', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0108', 'MUHAMMAD SAFWAN', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0109', 'ALAMEEN HUSSAIN', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0110', 'ALIYU MUHAMMAD ALMOD', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0111', 'AISHA MUSA UMAR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0112', 'KHADIJA ABDULLAHI', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0113', 'FAIZA SANI MUBARAK', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0114', 'FUREATU ABDULLAHI', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0115', 'ABDULRAHMAN AMINU', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0116', 'ABDULLAHI ABDULAZIZ', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0117', 'ASMAU MURTALA', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0118', 'MUHAMMAD BELLO TUKUR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0119', 'AISHA GHALI GARBA', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0120', 'RAHAMA MUNZALI I', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0121', 'DAHIRU NAFIU', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0122', 'ABUBAKAR ADNAN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0124', 'SALAMA MUKTAR', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0128', 'ZULAIHAT SHUIAIB', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0130', 'USAMAN.S. OLUMBO', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0131', 'AISHA UMAR MUSTAPHA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0133', 'ABUBAKAR', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0135', 'ALMUSTAPHA  MUHAMMAD', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0136', 'AISHA MURTALA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0139', '', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0140', 'JUWAIRIYYA ASHIR', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0144', 'MUHAMMAD HAMZA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0147', 'SAUDAT SUNUSI', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0148', 'AL-AMIN DANLAMI', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0149', 'YAHAYA YAHAYA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0150', 'ABDULAHI SALAU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0151', 'KHALID A AHMAD', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0153', 'ABUBAKAK.S. YUSUF', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0154', 'ABUBAKAR G. HANGA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0155', 'USMAN HASSAN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0156', 'AUWAL SANI TUKUR', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0157', 'AHMAD SANI', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0158', 'MOHAMMAD YUSUF', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0167', 'MUHAMMAD BELLO TUKUR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0168', 'ABDULLAHI IBRAHIM', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0169', 'BASHIR BASHIR ABDULL', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0170', 'ABDULLAHI HAMID BASH', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0171', 'SAUDAT HASSAN', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0172', 'MAIMUNA AMINU IBRAHI', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0173', 'SADIQ ABBASMAI BARGO', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0174', 'MUHAMMAD DAYYIB UMAR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0175', 'RUKAYYA ABBAS SAFANA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0176', 'ADAM ABDULLAHI SAAD', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0177', 'BASHIR ABDULLAHI SAA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0178', 'AISHA ABDULLAHI SAAD', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0179', 'HAUWA NASIR LAWAN', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0180', 'ABDULLAHI ALIYU', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0181', 'KHADIJA HASSAN', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0182', 'RUNASA.U I BASHIR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/2/0184', 'YUSUF KHALIL YUSUF', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0185', 'AHMAD MUSA UMAR', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0186', 'FARUKU SANI', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0187', 'AISHA AHMAD', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0188', 'SHU\'AIBU ABUBAKAR', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0189', 'NABILA DANLAMI', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0190', 'HUDIRRIYAH IBRAHIM N', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0191', 'AISHA AUWAL ZUBAR', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0192', 'MUHAMMAD DANLAMI', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0193', 'AMATURRAHMAN MURTALA', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0194', 'JAMEEL IBRAHIM', 'SS 1', 0, 0.00, 'F', 5),
('YMA/2/0195', 'KHADIJA AMINU ISYAKU', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0196', 'ABUBAKAR SABIU', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0198', 'NANA KHADIJAH AHMAD', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0199', 'DAHA ABDULHADI', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0200', 'AMINAT SALAUDEEN', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0202', 'ABDULAZIZ ALIYU ', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0203', 'KHADIJA I MAIWAKE', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0204', 'ABUBAKAR ABBAS SAFAN', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0206', 'ASIYA MUKHTAR SALEH', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0208', 'AUWAL SHUAIBU', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0210', 'IBRAHIM KHLALI', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0211', 'FATIMA ABDULLAHI', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0212', 'UMAR S UMAR', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0214', 'Usman Muhammad ', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/2/0215', 'MAS\'UD NASIR ABUBAKA', 'PRIMARY 5', 0, 0.00, 'F', 5),
('YMA/2/0216', 'MUSTAFA NASIR ABUBAK', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0217', 'BILKISU SABI\'U', 'PRIMARY 2', 0, 0.00, 'F', 5),
('YMA/2/0224', 'ABUBAKAR ADNAN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0226', 'SALAMA MUKHTAR A', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0228', 'ZULAIHAT SHU\'AIBU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0241', 'AISHA UMAR MUSTAFA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0242', 'ABUBAKAR MUHAMMAD', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0243', 'ALMUSTAFA MUHAMMAD S', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0244', 'AISHA MURTALA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0245', 'KHADIJA SANI MUKHTAR', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0246', 'JUWAIRIYA ASHIR ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0247', 'BASHIR YAHAYA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0248', 'KABIR IBRAHIM MAIWAK', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0249', 'RABIU SHUAIBU', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0250', 'AMINA MU\'AZZAM', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0251', 'NAFISAT BASHIR AHAMA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0252', 'ABDULSHAKHUR MU\'AZZA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0253', 'MARYAM MUHD', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0254', 'KHAMIS GHALIM', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0255', 'MUHAMMAD JAMIL', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0256', 'USMAN HASSAN', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0257', 'ABUBAKAR G HANGA', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0258', 'Hauwa\'u karibullahi', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0259', 'Abubakar Ahmad Bose', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0260', 'Muhammad Nafi\'u Sali', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0261', 'Ahmad Nasir Lawan ', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0262', 'Aminu Umar Aminu', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0263', 'Ibrahim khaleel Danl', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0264', 'Mahmoud Safwan', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0265', 'Khalil Ibrahim Nasir', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0266', 'Hamzah Hamzah Sulaim', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0267', 'Lawan Bello Lawan ', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0268', 'Farouk g hanga ', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0269', 'Ummukulsum Umar Amin', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0270', 'Fatima Auwal ', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0271', 'Muhammad Sani musa ', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0272', 'Amina Auwal ', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/2/0278', 'Abdulahi salau', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0279', 'Muhammad Hamzah Sula', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0280', 'Saudat sunusi ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0281', 'Abubakar  .S. Yusuf ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0282', 'Mohammad Yusuf ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0283', 'Ahmad Sani Mubarak ', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0284', 'Auwal Sani Tunur', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/2/0285', 'Yahaya yahaya', 'PRIMARY 3', 0, 0.00, 'F', 5),
('YMA/3/0001', 'FATIMA ZAMZILU', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/3/0002', 'MARYAM JIBRIN ', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/3/0003', 'MUHAMMED SANI MUSA', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/3/0004', 'FATIMA BASHIR', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/3/0005', 'MUHAMMAH TAHIR', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/3/0009', 'ALAMEEN ZAMZILU ADO', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/3/0010', 'ZAINAB FATUHU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/3/0011', 'ABDULLAHI SUNUSI', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/3/0012', 'UMAR USMAN', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/3/0013', 'ISHAQ YUSUF', 'NURSERY 2', 0, 0.00, 'F', 5),
('YMA/3/0014', 'SAFIYA AL-HASSAN', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/3/0015', 'FATIMA IDRIS', 'NURSERY 1', 0, 0.00, 'F', 5),
('YMA/3/0016', 'NUSAIBA SUNUSI', 'PRIMARY 1', 0, 0.00, 'F', 5),
('YMA/3/0017', 'AHMAD SANI AMINU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/3/0018', 'AHMAD A SAMINU', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/3/0019', 'ABUBAKAR S ABUBAKAR', 'PRE-NURSERY', 0, 0.00, 'F', 5),
('YMA/3/0020', 'FATIMA BASHIR', 'NURSERY 2', 0, 0.00, 'F', 5);

-- --------------------------------------------------------

--
-- Stand-in structure for view `student_assessments`
-- (See below for the actual view)
--
CREATE TABLE `student_assessments` (
`id` int(11)
,`calendar_id` int(11)
,`admission_no` varchar(100)
,`student_name` varchar(100)
,`subject` varchar(100)
,`class_name` varchar(100)
,`academic_year` varchar(20)
,`term` varchar(20)
,`ca1Score` tinyint(2)
,`ca2Score` tinyint(2)
,`examScore` tinyint(2)
,`total_score` tinyint(3)
,`grade` enum('A','B','C','D','E','F')
,`remark` varchar(20)
,`mark_by` varchar(100)
,`exam_name` varchar(100)
);

-- --------------------------------------------------------

--
-- Table structure for table `student_assignments`
--

CREATE TABLE `student_assignments` (
  `id` int(11) NOT NULL,
  `teacher_id` int(10) NOT NULL,
  `assignment_id` int(10) NOT NULL,
  `school_id` varchar(10) DEFAULT NULL,
  `student_name` varchar(100) DEFAULT NULL,
  `admission_no` varchar(20) DEFAULT NULL,
  `class_name` varchar(50) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `level` int(11) DEFAULT NULL,
  `attachement` varchar(500) DEFAULT NULL,
  `content` text NOT NULL,
  `marks` int(11) DEFAULT NULL,
  `score` double DEFAULT NULL,
  `remark` varchar(500) DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_grading`
--

CREATE TABLE `student_grading` (
  `id` int(11) NOT NULL,
  `calendar_id` int(11) NOT NULL,
  `admission_no` varchar(100) NOT NULL,
  `student_name` varchar(100) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `class_name` varchar(100) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` varchar(20) NOT NULL,
  `ca1Score` tinyint(2) NOT NULL DEFAULT 0,
  `ca2Score` tinyint(2) NOT NULL DEFAULT 0,
  `examScore` tinyint(2) NOT NULL DEFAULT 0,
  `total_score` tinyint(3) NOT NULL DEFAULT 0,
  `grade` enum('A','B','C','D','E','F') DEFAULT NULL,
  `remark` varchar(20) DEFAULT NULL,
  `mark_by` varchar(100) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'Pending',
  `school_id` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_grading`
--

INSERT INTO `student_grading` (`id`, `calendar_id`, `admission_no`, `student_name`, `subject`, `class_name`, `academic_year`, `term`, `ca1Score`, `ca2Score`, `examScore`, `total_score`, `grade`, `remark`, `mark_by`, `status`, `school_id`) VALUES
(1, 0, 'YMA/1/0212', 'ADAMA MUSTAPH', 'CIVIC EDUCATION', 'NURSERY 1', '2024/2025', 'FIRST TERM', 8, 8, 56, 72, 'B', 'Very Good', 'Ishaq Ibrahim', 'Draft', 1),
(2, 0, 'YMA/1/0212', 'ADAMA MUSTAPH', 'ARABIC', 'NURSERY 1', '2024/2025', 'FIRST TERM', 10, 9, 30, 49, 'E', 'Fair', 'Ishaq Ibrahim', 'Draft', 1),
(3, 0, 'YMA/1/0212', 'ADAMA MUSTAPH', 'BASIC SCIENCE', 'NURSERY 1', '2024/2025', 'FIRST TERM', 18, 8, 60, 86, 'A', 'Excellent', 'Ishaq Ibrahim', 'Draft', 1),
(4, 0, 'YMA/1/0212', 'ADAMA MUSTAPH', 'COMPUTER STUDIES', 'NURSERY 1', '2024/2025', 'FIRST TERM', 20, 10, 33, 63, 'C', 'Good', 'Ishaq Ibrahim', 'Draft', 1),
(5, 0, 'YMA/1/0213', 'YAHYA Y ILYASU', 'BASIC SCIENCE', 'NURSERY 1', '2024/2025', 'FIRST TERM', 20, 8, 50, 78, 'A', 'Excellent', 'Ishaq Ibrahim', 'Draft', 1),
(6, 0, 'YMA/1/0213', 'YAHYA Y ILYASU', 'ARABIC', 'NURSERY 1', '2024/2025', 'FIRST TERM', 18, 3, 22, 43, 'E', 'Fair', 'Ishaq Ibrahim', 'Draft', 1),
(7, 0, 'YMA/1/0213', 'YAHYA Y ILYASU', 'CIVIC EDUCATION', 'NURSERY 1', '2024/2025', 'FIRST TERM', 13, 10, 50, 73, 'B', 'Very Good', 'Ishaq Ibrahim', 'Draft', 1),
(8, 0, 'YMA/1/0213', 'YAHYA Y ILYASU', 'DRAWING/COLOURING', 'NURSERY 1', '2024/2025', 'FIRST TERM', 10, 3, 40, 53, NULL, NULL, 'Ishaq Ibrahim', 'Draft', 1),
(9, 0, 'YMA/1/0213', 'YAHYA Y ILYASU', 'CREATIVE ART', 'NURSERY 1', '2024/2025', 'FIRST TERM', 9, 7, 65, 81, 'A', 'Excellent', 'Ishaq Ibrahim', 'Draft', 1),
(10, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'COMPUTER STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 18, 8, 68, 94, 'A', 'Excellent', 'Ishaq Ibrahim', 'Draft', 1),
(11, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'CIVIC EDUCATION', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 6, 43, 57, 'D', 'Average', 'Ishaq Ibrahim', 'Draft', 1),
(12, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'ARABIC LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 8, 28, 45, 'E', 'Fair', 'Ishaq Ibrahim', 'Draft', 1),
(13, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'BASIC SCIENCE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 12, 10, 55, 77, 'A', 'Excellent', 'Ishaq Ibrahim', 'Draft', 1),
(14, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'CREATIVE ART', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 18, 9, 55, 82, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(15, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'DRAWING/COLOURING', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 4, 10, 59, 73, 'B', 'Very Good', 'Ishaq Ibrahim', 'Saved', 1),
(16, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'HAUSA LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 12, 10, 29, 51, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(17, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'HAND WRITING', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 10, 3, 40, 53, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(18, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'ENGLISH LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 8, 33, 49, 'E', 'Fair', 'Ishaq Ibrahim', 'Saved', 1),
(19, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'HEALTH EDUCATION', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 10, 49, 68, 'C', 'Good', 'Ishaq Ibrahim', 'Saved', 1),
(20, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'NATIONAL VALUE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 10, 10, 30, 50, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(21, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'MATHEMATICS', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 8, 29, 46, 'E', 'Fair', 'Ishaq Ibrahim', 'Saved', 1),
(22, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'ISLAMIC STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 3, 10, 58, 71, 'B', 'Very Good', 'Ishaq Ibrahim', 'Saved', 1),
(23, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'RHYMES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 10, 4, 54, 68, 'C', 'Good', 'Ishaq Ibrahim', 'Saved', 1),
(24, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'SOCIAL STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 10, 1, 26, 37, 'F', 'Poor', 'Ishaq Ibrahim', 'Saved', 1),
(25, 0, 'YMA/1/0005', 'ABDALLAH ABDULSALAM SABO', 'PHYSICAL HEALTH EDUCATION (PHE)', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 5, 40, 53, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(26, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'CIVIC EDUCATION', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 3, 2, 70, 75, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(27, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'COMPUTER STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 70, 100, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(28, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'BASIC SCIENCE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 35, 65, 'C', 'Good', 'Ishaq Ibrahim', 'Saved', 1),
(29, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'ARABIC LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 10, 7, 70, 87, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(30, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'CREATIVE ART', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 70, 100, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(31, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'ENGLISH LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 40, 70, 'B', 'Very Good', 'Ishaq Ibrahim', 'Saved', 1),
(32, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'DRAWING/COLOURING', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 1, 45, 55, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(33, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'HEALTH EDUCATION', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 15, 8, 60, 83, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(34, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'HAUSA LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 4, 7, 44, 55, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(35, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'HAND WRITING', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 9, 28, 46, 'E', 'Fair', 'Ishaq Ibrahim', 'Saved', 1),
(36, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'ISLAMIC STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 4, 68, 80, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(37, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'MATHEMATICS', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 5, 59, 72, 'B', 'Very Good', 'Ishaq Ibrahim', 'Saved', 1),
(38, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'RHYMES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 18, 10, 70, 98, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(39, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'PHYSICAL HEALTH EDUCATION (PHE)', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 16, 10, 60, 86, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(40, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'NATIONAL VALUE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 12, 10, 70, 92, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(41, 0, 'YMA/1/0008', 'MAHMUD ADEEL MUHAMMAD', 'SOCIAL STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 66, 96, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(42, 0, 'YMA/1/0025', 'RAHAMA SANI', 'ARABIC LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 10, 7, 70, 87, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(43, 0, 'YMA/1/0025', 'RAHAMA SANI', 'BASIC SCIENCE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 35, 65, 'C', 'Good', 'Ishaq Ibrahim', 'Saved', 1),
(44, 0, 'YMA/1/0025', 'RAHAMA SANI', 'CIVIC EDUCATION', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 3, 2, 70, 75, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(45, 0, 'YMA/1/0025', 'RAHAMA SANI', 'COMPUTER STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 70, 100, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(46, 0, 'YMA/1/0025', 'RAHAMA SANI', 'CREATIVE ART', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 70, 100, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(47, 0, 'YMA/1/0025', 'RAHAMA SANI', 'DRAWING/COLOURING', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 1, 45, 55, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(48, 0, 'YMA/1/0025', 'RAHAMA SANI', 'ENGLISH LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 40, 70, 'B', 'Very Good', 'Ishaq Ibrahim', 'Saved', 1),
(49, 0, 'YMA/1/0025', 'RAHAMA SANI', 'HAND WRITING', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 9, 28, 46, 'E', 'Fair', 'Ishaq Ibrahim', 'Saved', 1),
(50, 0, 'YMA/1/0025', 'RAHAMA SANI', 'HAUSA LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 4, 7, 44, 55, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(51, 0, 'YMA/1/0025', 'RAHAMA SANI', 'HEALTH EDUCATION', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 15, 8, 60, 83, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(52, 0, 'YMA/1/0025', 'RAHAMA SANI', 'ISLAMIC STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 4, 68, 80, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(53, 0, 'YMA/1/0025', 'RAHAMA SANI', 'MATHEMATICS', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 5, 59, 72, 'B', 'Very Good', 'Ishaq Ibrahim', 'Saved', 1),
(54, 0, 'YMA/1/0025', 'RAHAMA SANI', 'NATIONAL VALUE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 12, 10, 70, 92, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(55, 0, 'YMA/1/0025', 'RAHAMA SANI', 'PHYSICAL HEALTH EDUCATION (PHE);', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 16, 10, 60, 86, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(56, 0, 'YMA/1/0025', 'RAHAMA SANI', 'RHYMES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 18, 10, 70, 98, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(57, 0, 'YMA/1/0025', 'RAHAMA SANI', 'SOCIAL STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 66, 96, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(58, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'ARABIC LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 10, 7, 70, 87, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(59, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'BASIC SCIENCE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 35, 65, 'C', 'Good', 'Ishaq Ibrahim', 'Saved', 1),
(60, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'CIVIC EDUCATION', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 3, 2, 70, 75, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(61, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'COMPUTER STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 70, 100, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(62, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'CREATIVE ART', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 70, 100, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(63, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'DRAWING/COLOURING', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 1, 45, 55, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(64, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'ENGLISH LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 40, 70, 'B', 'Very Good', 'Ishaq Ibrahim', 'Saved', 1),
(65, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'HAND WRITING', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 9, 9, 28, 46, 'E', 'Fair', 'Ishaq Ibrahim', 'Saved', 1),
(66, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'HAUSA LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 4, 7, 44, 55, 'D', 'Average', 'Ishaq Ibrahim', 'Saved', 1),
(67, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'HEALTH EDUCATION', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 15, 8, 60, 83, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(68, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'ISLAMIC STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 4, 68, 80, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(69, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'MATHEMATICS', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 8, 5, 59, 72, 'B', 'Very Good', 'Ishaq Ibrahim', 'Saved', 1),
(70, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'NATIONAL VALUE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 12, 10, 70, 92, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(71, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'PHYSICAL HEALTH EDUCATION (PHE)', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 16, 10, 60, 86, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(72, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'RHYMES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 18, 10, 70, 98, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(73, 0, 'YMA/1/0059', 'ZAINAB HASSAN ISYAKU', 'SOCIAL STUDIES', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 66, 96, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(74, 0, 'YMA/1/0338', 'ABUBAKAR MUSTAPHA', 'ARABIC LANGUAGE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 10, 7, 70, 87, 'A', 'Excellent', 'Ishaq Ibrahim', 'Saved', 1),
(75, 0, 'YMA/1/0338', 'ABUBAKAR MUSTAPHA', 'BASIC SCIENCE', 'PRIMARY 1', '2024/2025', 'FIRST TERM', 20, 10, 35, 65, 'C', 'Good', 'Ishaq Ibrahim', 'Saved', 1);

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `subject_code` varchar(50) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `school_id` int(11) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `section` varchar(45) NOT NULL,
  `sub_section` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`subject_code`, `subject`, `school_id`, `status`, `section`, `sub_section`) VALUES
('JUN008', 'AGRIC SCIENCE', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('SEN0010', 'AGRIC SCIENCE', 1, 'Active', 'SENIOR SECONDARY', 'Science'),
('NUR008', 'ARABIC', 1, 'Active', 'NURSERY', NULL),
('JUN009', 'ARABIC LANGUAGE', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('PRI007', 'ARABIC LANGUAGE', 1, 'Active', 'PRIMARY', NULL),
('SEN0017', 'ARABIC LANGUAGE', 1, 'Inactive', 'SENIOR SECONDARY', 'SENIOR'),
('JUN004', 'BASIC SCIENCE', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('NUR010', 'BASIC SCIENCE', 1, 'Active', 'NURSERY', NULL),
('PRI009', 'BASIC SCIENCE', 1, 'Active', 'PRIMARY', NULL),
('SEN0018', 'BASIC SCIENCE', 1, 'Inactive', 'SENIOR SECONDARY', 'JUNIOR'),
('BAS0002', 'Basic Science', 372369, 'Active', 'PRIMARY', NULL),
('JUN005', 'BASIC TECH.', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('SEN0019', 'BASIC TECH.', 1, 'Inactive', 'SENIOR SECONDARY', 'JUNIOR'),
('SEN0007', 'BIOLOGY', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('JUN010', 'BUSINESS STUDIES', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('SEN0020', 'BUSINESS STUDIES', 1, 'Inactive', 'SENIOR SECONDARY', 'SENIOR'),
('SEN0006', 'C.R.S.', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('SEN027', 'CATERING', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('SEN0013', 'CHEMISTRY', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('JUN014', 'CIVIC EDUCATION', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('SEN0003', 'CIVIC EDUCATION', 1, 'Active', 'SENIOR SECONDARY', 'ALL'),
('SEN025', 'COMMERCE', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('SEN0025', 'COMPUTER  STUDIES', 1, 'Inactive', 'SENIOR SECONDARY', 'ALL'),
('PRI005', 'COMPUTER STUDIES', 1, 'Active', 'PRIMARY', NULL),
('JUN015', 'CREATIVE ART', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('PRI010', 'CREATIVE ART', 1, 'Active', 'PRIMARY', NULL),
('DRA0003', 'DRAWING', 493125, 'Active', 'NURSERY', NULL),
('NUR006', 'DRAWING/COLOURING', 1, 'Active', 'NURSERY', NULL),
('SEN0008', 'ECONOMICS', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('JUN002', 'ENGLISH LANGUAGE', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('NUR002', 'ENGLISH LANGUAGE', 1, 'Active', 'NURSERY', NULL),
('PRI002', 'ENGLISH LANGUAGE', 1, 'Active', 'PRIMARY', NULL),
('SEN0002', 'ENGLISH LANGUAGE', 1, 'Active', 'SENIOR SECONDARY', NULL),
('SEN0012', 'ENGLISH LITERATURE', 1, 'Active', 'SENIOR SECONDARY', 'ART'),
('SEN0024', 'FINANCIAL ACCUNTING', 1, 'Inactive', 'SENIOR SECONDARY', 'SENIOR'),
('SEN0004', 'FURTHER MATHS', 1, 'Active', 'SENIOR SECONDARY', 'ALL'),
('SEN0005', 'GEOGRAPHY', 1, 'Active', 'SENIOR SECONDARY', 'ALL'),
('SEN0014', 'GOVERNMENT', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('NUR005', 'HAND WRITING', 1, 'Active', 'NURSERY', NULL),
('PRI004', 'HAND WRITING', 1, 'Active', 'PRIMARY', NULL),
('JUN012', 'HAUSA LANGUAGE', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('PRI008', 'HAUSA LANGUAGE', 1, 'Active', 'PRIMARY', NULL),
('SEN0016', 'HAUSA LANGUAGE', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('NUR004', 'HEALTH EDUCATION', 1, 'Active', 'NURSERY', NULL),
('JUN006', 'HISTORY', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('SEN0021', 'HISTORY', 1, 'Inactive', 'SENIOR SECONDARY', 'SENIOR'),
('JUN011', 'HOME ECONOMICS', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('SEN0022', 'HOME ECONOMICS', 1, 'Inactive', 'SENIOR SECONDARY', 'ART'),
('JUN007', 'I.R.S.', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('SEN0009', 'I.R.S.', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('NUR007', 'ISLAMIC STUDIES', 1, 'Active', 'NURSERY', NULL),
('PRI006', 'ISLAMIC STUDIES', 1, 'Active', 'PRIMARY', NULL),
('JUN001', 'MATHEMATICS', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('NUR001', 'MATHEMATICS', 1, 'Active', 'NURSERY', NULL),
('PRI001', 'MATHEMATICS', 1, 'Active', 'PRIMARY', NULL),
('SEN0001', 'MATHEMATICS', 1, 'Active', 'SENIOR SECONDARY', 'ALL'),
('JUN003', 'NATIONAL VALUE', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('PRI003', 'NATIONAL VALUE', 1, 'Active', 'PRIMARY', NULL),
('SEN0015', 'NATIONAL VALUE', 1, 'Active', 'SENIOR SECONDARY', NULL),
('NAT0001', 'National Value', 372369, 'Active', 'PRIMARY', NULL),
('JUN013', 'P.H.E', 1, 'Active', 'JUNIOR SECONDARY', NULL),
('SEN0023', 'P.H.E', 1, 'Inactive', 'SENIOR SECONDARY', 'SENIOR'),
('PRI011', 'PHYSICAL HEALTH EDUCATION (PHE)', 1, 'Active', 'PRIMARY', NULL),
('SEN0011', 'PHYSICS', 1, 'Active', 'SENIOR SECONDARY', 'SENIOR'),
('NUR009', 'RHYMES', 1, 'Active', 'NURSERY', 'Art'),
('NUR003', 'SOCIAL STUDIES', 1, 'Active', 'NURSERY', NULL),
('WRI0004', 'WRITTING', 493125, 'Active', 'PRIMARY', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `syllabus`
--

CREATE TABLE `syllabus` (
  `id` int(11) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `class_code` varchar(30) NOT NULL,
  `term` varchar(50) NOT NULL,
  `week` tinyint(2) DEFAULT NULL,
  `title` varchar(300) NOT NULL,
  `content` text NOT NULL,
  `status` enum('Pending','Ongoing','Onhold','Deleted') NOT NULL DEFAULT 'Pending',
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `syllabus_tracker`
--

CREATE TABLE `syllabus_tracker` (
  `id` int(11) NOT NULL,
  `syllabus_id` int(11) DEFAULT NULL,
  `subject` varchar(100) NOT NULL,
  `class_code` varchar(30) DEFAULT NULL,
  `term` varchar(50) NOT NULL,
  `academic_year` year(4) NOT NULL,
  `week` tinyint(1) DEFAULT NULL,
  `status` enum('Pending','Ongoing','Onhold','Completed') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_todos`
--

CREATE TABLE `task_todos` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `class_name` varchar(60) DEFAULT NULL,
  `event_categry` enum('Lesson','Homework','Holidays','E-Class','RollCall') DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `priority` enum('High','Medium','Low') NOT NULL DEFAULT 'Low',
  `status` enum('Pending','OnHold','Inprogress','Completed','Deleted') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` int(11) NOT NULL,
  `teacher_id` varchar(100) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'Teacher',
  `name` varchar(255) NOT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `marital_status` varchar(50) DEFAULT NULL,
  `state_of_origin` varchar(100) DEFAULT NULL,
  `mobile_no` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `working_experience` text DEFAULT NULL,
  `religion` varchar(50) DEFAULT NULL,
  `last_place_of_work` varchar(255) DEFAULT NULL,
  `do_you_have` text DEFAULT NULL,
  `when_do` date DEFAULT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `bank` varchar(100) DEFAULT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `school_id` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `teacher_id`, `user_id`, `role`, `name`, `sex`, `age`, `address`, `date_of_birth`, `marital_status`, `state_of_origin`, `mobile_no`, `email`, `qualification`, `working_experience`, `religion`, `last_place_of_work`, `do_you_have`, `when_do`, `account_name`, `account_number`, `bank`, `school_location`, `school_id`, `created_at`, `updated_at`) VALUES
(15, NULL, 12, 'Teacher', 'Ishaq Ibraheem', 'Male', NULL, 'Mabuga Bagwai', NULL, 'Married', 'Kano', '07035384184', 'ibagwai9@gmail.com', '', '', '', '', '', NULL, 'Ishaq Ibraheem', '9124611644', 'Opay', 'Satellite Town, Tudun Yola, Kabuga Kano', '1', '2025-02-28 08:46:17', '2025-02-28 08:46:17'),
(16, NULL, 13, 'Teacher', 'KHALISA SADIK', 'Male', NULL, 'Naibawa Kano', NULL, '', 'Kano', '07035384184', 'sadik@gmail.com', 'Bsc Chemistry', '', '', '', '', NULL, 'Khalipha', '00348342889', 'Access Bank', 'Afforestation Road, Unguwar Jakada Dorayi Babba, Kano', '1', '2025-02-28 08:46:32', '2025-02-28 08:46:32'),
(17, NULL, 14, 'Teacher', 'Ishaq Ibrahim', 'Male', NULL, 'Naibawa Kano', NULL, 'Single', 'Kano', '07035384184', 'teacher@gmail.com', 'Bsc Chemistry', '', '', '', '', NULL, 'Ishaq Ibraheem', '0548598398', 'Access Bank', 'Afforestation Road, Unguwar Jakada Dorayi Babba, Kano', '1', '2025-02-28 08:46:32', '2025-02-28 08:46:32'),
(18, NULL, 15, 'Teacher', 'ISAH MUHAMMAD RABIU', 'Male', NULL, 'NAIBAWA', NULL, 'Married', 'KANO', '080885084648', 'isahrabiu@gmail.com', 'NCE', '', 'Islam', '', '', NULL, 'Isah Rabiu', '05348348939', 'GTB', 'Hablan House, Rijiyar Zaki Off Gwarzo Road, Kano', '1', '2025-02-28 08:46:32', '2025-02-28 08:46:32'),
(19, NULL, NULL, 'Teacher', 'Halifa Shuaibu', 'Male', NULL, 'African alacen Air Port Road Kano', NULL, '', 'Kano', '09160208018', 'halifashuaibu12@gmail.com', '', '', '', '', '', NULL, '', '', '', '', '1', '2025-02-28 08:46:32', '2025-02-28 08:46:32'),
(22, NULL, NULL, 'Teacher', 'nazif abdullahi', 'Male', NULL, 'tudun murtala', NULL, 'Single', 'kano', '09031332845', 'nagudu@gmail.com', 'NUC ', 'dev', 'KUR', 'techer', 'NO', NULL, 'Musa Ibrahim', '12344322', 'UBA Bank', '', '1', '2025-02-28 08:46:32', '2025-02-28 08:46:32'),
(33, NULL, NULL, 'Teacher', 'Halifa Shuaibu', 'Male', NULL, 'African alacen Air Port Road Kano', NULL, '', 'Kano', '09160208018', 'test@gmail.com', 'neco', '', '', '', '', NULL, 'DANGANA', '1234321', 'Guaranty Trust Bank', '', '1', '2025-02-28 08:46:32', '2025-02-28 08:46:32'),
(34, NULL, NULL, 'Teacher', 'Umar Sani Baba', 'Male', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'Kano', '080887665565', 'umarsanibaba@gmail.com', 'neco', 'TEACHING', 'Muslim', 'KANO', 'yes', NULL, 'Umar Sani Baba ', '3009887878', 'Guaranty Trust Bank', '', '1', '2025-02-28 08:46:32', '2025-02-28 08:46:32'),
(35, NULL, NULL, 'Teacher', 'bashir muhammad jibrin', 'Male', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'Kano', '91689999', 'bashir@gmail.com', '', '', '', '', '', NULL, 'DANGANA', '2332', 'Guaranty Trust Bank', '', '933369', '2025-03-03 10:22:31', '2025-03-03 10:22:31'),
(37, NULL, NULL, 'Teacher', 'Halifa Shuaibu', 'Female', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'Kano', '91689999', '12@gmail.com', 'neco', 'TEACHING', 'Mother', 'techer', 'yes', NULL, 'DANGANA', '123456', 'access bank', '', '933369', '2025-03-03 10:22:38', '2025-03-03 10:22:38'),
(41, NULL, NULL, 'Teacher', 'Halifa Shuaibu', 'Female', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'Kano', '91689999', '882@gmail.com', 'neco', 'TEACHING', 'Mother', 'techer', 'yes', NULL, 'DANGANA', '123456', 'access bank', '', '', '2025-02-28 15:01:17', '2025-02-28 15:01:17'),
(42, NULL, NULL, 'Teacher', 'Halifa Shuaibu', 'Female', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'Kano', '91689999', 'halif@gmail.com', 'neco', 'TEACHING', 'MUSLIM', 'KANO', 'NO', NULL, 'DANGANA', '87654347', 'Guaranty Trust Bank', '', '', '2025-02-28 15:26:36', '2025-02-28 15:26:36'),
(44, NULL, NULL, 'Teacher', 'Halifa Shuaibu', 'Female', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'Kano', '91689999', '23323@gmail.com', 'neco', 'Teaching', 'MUSLIM', 'techer', 'yes', NULL, 'DANGANA', '43232123', 'Guaranty Trust Bank', '', '', '2025-03-01 08:06:21', '2025-03-01 08:06:21'),
(46, NULL, NULL, 'Teacher', 'Halifa Shuaibu', 'Female', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'Kano', '91689999', '2332323@gmail.com', 'neco', 'Teaching', 'MUSLIM', 'techer', 'yes', NULL, 'DANGANA', '43232123', 'Guaranty Trust Bank', '', '', '2025-03-01 08:10:36', '2025-03-01 08:10:36'),
(47, NULL, NULL, 'Teacher', 'nazif abdullahi', 'Male', NULL, 'tudun murtala', NULL, 'Single', 'KANO', '09160208018', 'nazif@gmail.com', 'NUC ', '', '', '', '', NULL, 'DANGANA', '938743', '222', '', '', '2025-03-03 10:05:20', '2025-03-03 10:05:20'),
(48, NULL, NULL, 'Teacher', '', '', NULL, '', NULL, '', '', '', '', '', '', '', '', '', NULL, '', '', '', '', '', '2025-03-03 10:11:06', '2025-03-03 10:11:06'),
(49, NULL, NULL, 'Teacher', 'Halifa Sadiq', 'Male', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'Kano', '91689999', 'sadiq@gmail.com', 'neco', 'dev', 'Muslim', 'techer', 'NO', NULL, 'Umar Sani Baba ', '56788', 'kano bank', '', '', '2025-03-03 10:28:12', '2025-03-03 10:28:12'),
(51, NULL, NULL, 'Teacher', 'kawu', 'Male', NULL, 'naibawa', NULL, 'Single', 'KANO', '9876543567', 'kawi@gmail.com', 'neco', 'TEACHING', 'KUR', 'KANO', 'NO', NULL, 'Umar Sani Baba ', '3456794', 'first bank', '', '933369', '2025-03-03 11:23:39', '2025-03-03 11:23:39'),
(52, NULL, NULL, 'Teacher', 'Ayo', 'Male', NULL, 'konar jaba', NULL, 'Married', 'Kano', '09160204444', 'kana@gmail.com', 'neco', 'TEACHING', '', '', '', NULL, 'halifa', '9887878787878', 'first bank', '', '933369', '2025-03-03 11:25:49', '2025-03-03 11:25:49'),
(54, NULL, NULL, 'Teacher', 'Ayo', 'Male', NULL, 'konar jaba', NULL, 'Married', 'Kano', '09160204444', 'kaa@gmail.com', 'neco', 'TEACHING', '', '', '', NULL, 'halifa', '9887878787878', 'first bank', '', '933369', '2025-03-03 11:34:17', '2025-03-03 11:34:17'),
(56, NULL, NULL, 'Teacher', 'dd2', 'Female', NULL, 'African alacen Air Port Road Kano', NULL, 'Single', 'KANO', '0909888777677', 'half@gmail.com', 'neco', 'TEACHING', 'kanio', 'techer', 'NO', NULL, 'halifa', '3456787654', 'Guaranty Trust Bank', '', '933369', '2025-03-04 08:37:39', '2025-03-04 08:37:39'),
(57, NULL, NULL, 'Teacher', 'murtalaa', 'Male', NULL, 'kanaaa', NULL, 'Single', 'KANO', '988877888', 'murrr@gmail.com', 'NUC ', 'dev', 'Muslim', 'techer', '', NULL, 'halifa', '23333333333332', 'Guaranty Trust Bank', '', '933369', '2025-03-04 08:39:12', '2025-03-04 08:39:12'),
(59, NULL, NULL, 'Teacher', 'Habib Lawan Jabir', 'Male', NULL, 'Sani Abacha way', NULL, 'Single', 'Kano', '', 'ibagwai9@gmail.com', 'Bsc Physics', 'None', 'Islam', 'Kano', 'No', NULL, 'Habib Lawan Jabir', '0990298888', 'Opay', '', '372369', '2025-03-05 10:21:43', '2025-03-05 10:21:43'),
(60, NULL, NULL, 'Teacher', 'ISYAKU MUHAMMAD', 'Male', NULL, 'KABUGA', NULL, 'Single', 'Kano', '07035384184', 'ibaai9@gmail.com', '', '', 'Islam', 'Kano', 'No', NULL, 'Isah Rabiu', '98767', 'GTB', '', '493125', '2025-03-05 11:59:27', '2025-03-05 11:59:27'),
(61, NULL, NULL, 'Teacher', 'ISYAKU MUHAMMAD', 'Male', NULL, 'KABUGA', NULL, 'Single', 'Kano', '07035384184', 'ibaai9@gmail.com', '', '', 'Islam', 'Kano', 'No', NULL, 'Isah Rabiu', '98767', 'GTB', '', '493125', '2025-03-05 12:00:35', '2025-03-05 12:00:35'),
(62, NULL, NULL, 'Teacher', 'ISYAKU MUHAMMAD', 'Male', NULL, 'KABUGA', NULL, 'Single', 'Kano', '07035384184', 'ibaai9@gmail.com', '', '', 'Islam', 'Kano', 'No', NULL, 'Isah Rabiu', '98767', 'GTB', '', '493125', '2025-03-05 12:02:35', '2025-03-05 12:02:35');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_classes`
--

CREATE TABLE `teacher_classes` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `section` varchar(50) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `role` enum('Form Master','Subject Teacher') NOT NULL DEFAULT 'Subject Teacher',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `class_level` varchar(100) DEFAULT NULL,
  `class_code` varchar(100) NOT NULL,
  `subject_code` varchar(100) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teacher_classes`
--

INSERT INTO `teacher_classes` (`id`, `teacher_id`, `section`, `subject`, `class_name`, `role`, `created_at`, `updated_at`, `class_level`, `class_code`, `subject_code`, `school_id`) VALUES
(1, 46, 'NURSERY', 'nazif', 'NURSERY 1', 'Subject Teacher', '2025-03-01 08:10:36', '2025-03-01 08:10:36', NULL, 'NURSERY 1', NULL, ''),
(4, 46, 'PRIMARY', 'nazif', 'primary 1', 'Subject Teacher', '2025-03-01 08:10:36', '2025-03-01 08:10:36', NULL, 'PRIMARY 1', NULL, ''),
(5, 47, 'PRIMARY', 'nagudu', 'primary 2', 'Subject Teacher', '2025-03-03 10:05:20', '2025-03-03 10:05:20', NULL, 'PRIMARY 2', NULL, ''),
(6, 48, 'NURSERY', 'nazif', 'PRE-NURSERY', 'Subject Teacher', '2025-03-03 10:11:06', '2025-03-03 10:11:06', NULL, 'PRE-NURSERY', NULL, ''),
(7, 49, 'PRIMARY', 'nagudu', 'primary 2', 'Subject Teacher', '2025-03-03 10:28:12', '2025-03-03 10:28:12', NULL, 'PRIMARY 2', NULL, ''),
(8, 56, 'PRIMARY', 'nagudu', 'primary 2', 'Subject Teacher', '2025-03-04 08:37:39', '2025-03-04 08:37:39', NULL, 'PRIMARY 2', NULL, ''),
(11, 57, 'NURSERY', 'nazif', 'PRE-NURSERY', 'Subject Teacher', '2025-03-04 08:39:12', '2025-03-04 08:39:12', NULL, 'PRE-NURSERY', NULL, '');

-- --------------------------------------------------------

--
-- Table structure for table `terms_setup`
--

CREATE TABLE `terms_setup` (
  `academic_year` varchar(50) NOT NULL,
  `term` varchar(50) NOT NULL,
  `begin_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  `school_id` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `terms_setup`
--

INSERT INTO `terms_setup` (`academic_year`, `term`, `begin_date`, `end_date`, `status`, `school_id`) VALUES
('2024/2025', 'FIRST TERM', '2025-02-17', '2025-02-19', 'inactive', '1'),
('2024/2025', 'SECOND TERM', '2025-02-18', '2025-02-22', 'inactive', '1'),
('2024/2025', 'Third Term', '2025-02-12', '2025-03-29', 'Active', '1');

-- --------------------------------------------------------

--
-- Table structure for table `time_table`
--

CREATE TABLE `time_table` (
  `id` int(11) NOT NULL,
  `class_name` varchar(100) NOT NULL,
  `start_time` varchar(100) DEFAULT NULL,
  `end_time` varchar(100) DEFAULT NULL,
  `subject_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trainees`
--

CREATE TABLE `trainees` (
  `id` int(11) NOT NULL,
  `firstname` varchar(255) NOT NULL,
  `lastname` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(255) NOT NULL,
  `state` varchar(255) DEFAULT NULL,
  `lga` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `program_type` varchar(100) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `payment_status` enum('Paid','Unpaid','Pending') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(100) NOT NULL,
  `student_id` int(100) NOT NULL,
  `revenue_head_id` int(100) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_method` varchar(100) NOT NULL,
  `transaction_reference` varchar(100) NOT NULL,
  `payment_status` enum('Pending','Paid','Failed') DEFAULT 'Pending',
  `document_status` enum('Printed','Saved') DEFAULT 'Saved',
  `print_count` int(2) DEFAULT 0,
  `print_by` varchar(100) DEFAULT '',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'Student',
  `password` varchar(255) DEFAULT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `school_id` varchar(10) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `username`, `role`, `password`, `school_location`, `school_id`, `createdAt`, `updatedAt`) VALUES
(1, 'Halifa Shuaibu', 'superadmin@gmail.com', NULL, 'superadmin', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2024-09-19 12:41:39', '2025-01-26 18:14:24'),
(14, 'Ishaq Ibrahim', 'teacher@gmail.com', NULL, 'Teacher', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2024-12-20 10:19:31', '2025-01-22 21:50:56'),
(16, 'Ishaq Ibrahim', 'admin@gmail.com', NULL, 'admin', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2024-09-19 12:41:39', '2025-01-26 10:54:42'),
(17, 'NAZIF ACADEMY TAHFIZ', 'naf@gmail.com', 'NAFT', 'Admin', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, 'NAFT', '2025-01-27 16:25:45', '2025-01-27 16:27:21'),
(18, 'BAGWAI ACADEMY', 'gwa@gmail.com', 'BGA', 'Admin', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, 'BGA', '2025-01-27 19:17:41', '2025-01-27 19:17:41'),
(19, 'ELITE ACADEMY', 'ela@gmail.com', 'ELA', 'Admin', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, 'ELA', '2025-01-27 19:29:08', '2025-01-27 19:29:08'),
(21, 'Ishaq Ibrahim', 'ibagwai9@gmail.com', '07035384184', 'parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 11:40:10', '2025-02-08 11:40:10'),
(22, 'abdullahi tijjani', 'nazif@gmail.com', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(23, 'frank edwad', 'nahhs003@gmail.com', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(24, 'haj fauziyya shu\'aib', 'kazaurefauziyya@gmail.com', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(25, 'Ishaq Ibraheem', NULL, NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(26, 'Nazif abdullahi', NULL, NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(27, 'Nazif abdullahi', 'nazifabdullahi003@gmail.com', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(28, 'presentation 2', 'presenta', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(29, 'testing parent', 'testing@gmail.com', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(30, 'testing three', 'nazi@gmail.com', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(31, 'testing version2', 'nazifabdullahi003@gmail.com', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(32, 'yusuf ibrahim', 'yusuf@gmail.com', NULL, 'Parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '1', '2025-02-08 19:38:48', '2025-02-08 19:38:48'),
(33, 'Halifa Shuaibu', 'halifashuaibu12@gmail.com', NULL, 'Teacher', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '', '2025-02-22 15:17:57', '2025-02-22 15:17:57'),
(34, 'Halifa Shuaibu', 'halifashuaibu12@gmail.com', NULL, 'Teacher', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '', '2025-02-22 15:19:04', '2025-02-22 15:19:04'),
(35, '', '', NULL, 'Teacher', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '', '2025-02-22 15:40:39', '2025-02-22 15:40:39'),
(36, 'nazif abdullahi', 'nagudu@gmail.com', NULL, 'Teacher', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '', '2025-02-23 10:35:09', '2025-02-23 10:35:09'),
(37, 'Halifa Shuaibu', 'test@gmail.com', NULL, 'Teacher', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '', '2025-02-23 10:39:34', '2025-02-23 10:39:34'),
(38, 'Umar Sani Baba', 'umarsanibaba@gmail.com', NULL, 'Teacher', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, '', '2025-02-25 09:46:15', '2025-02-25 09:46:15'),
(39, 'ELITE INTERNATIONAL ACACEMY', 'admin@eia.com', 'EIA', 'Admin', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', NULL, 'EIA', '2025-02-25 12:30:25', '2025-03-05 12:17:37'),
(40, 'Nazif', 'eliteedtech1@gmail.com', 'NAF', 'Admin', '$2a$10$Xx8LZoSwFHJlpQZrY3RuquiIKzvT/oq1yd2DaRgzERnA5wSgFWU1a', NULL, '372369', '2025-03-05 09:50:54', '2025-03-05 09:50:54'),
(41, 'ibrahim yusuf', 'bagwai@gmail.com', 'BGA', 'Admin', '$2a$10$UHiJPxRPYNyi305OMO10ROeX.dauiAOgHgXaaRul9JK/HTGHlKiIe', NULL, '493125', '2025-03-05 11:52:12', '2025-03-05 11:52:12');

-- --------------------------------------------------------

--
-- Structure for view `exam_reports`
--
DROP TABLE IF EXISTS `exam_reports`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `exam_reports`  AS SELECT `student_grading`.`id` AS `id`, `student_grading`.`calendar_id` AS `calendar_id`, `student_grading`.`admission_no` AS `admission_no`, `student_grading`.`student_name` AS `student_name`, `student_grading`.`subject` AS `subject`, `student_grading`.`class_name` AS `class_name`, `student_grading`.`academic_year` AS `academic_year`, `student_grading`.`term` AS `term`, `student_grading`.`ca1Score` AS `ca1Score`, `student_grading`.`ca2Score` AS `ca2Score`, `student_grading`.`examScore` AS `examScore`, `student_grading`.`total_score` AS `total_score`, `student_grading`.`grade` AS `grade`, `student_grading`.`remark` AS `remark`, `student_grading`.`mark_by` AS `mark_by`, `student_grading`.`school_id` AS `school_id`, 'Academic' AS `type` FROM `student_grading`union all select `c`.`id` AS `id`,`c`.`calendar_id` AS `calendar_id`,`c`.`admission_no` AS `admission_no`,`c`.`student_name` AS `student_name`,`c`.`description` AS `subject`,`c`.`class_name` AS `class_name`,`c`.`academic_year` AS `academic_year`,`c`.`term` AS `term`,0 AS `ca1Score`,0 AS `ca2Score`,0 AS `examScore`,0 AS `total_score`,`c`.`grade` AS `grade`,'' AS `remark`,`c`.`created_by` AS `mark_by`,`c`.`school_id` AS `school_id`,'Behavioral' AS `type` from `character_scores` `c`  ;

-- --------------------------------------------------------

--
-- Structure for view `student_assessments`
--
DROP TABLE IF EXISTS `student_assessments`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `student_assessments`  AS SELECT `sg`.`id` AS `id`, `sg`.`calendar_id` AS `calendar_id`, `sg`.`admission_no` AS `admission_no`, `sg`.`student_name` AS `student_name`, `sg`.`subject` AS `subject`, `sg`.`class_name` AS `class_name`, `sg`.`academic_year` AS `academic_year`, `sg`.`term` AS `term`, `sg`.`ca1Score` AS `ca1Score`, `sg`.`ca2Score` AS `ca2Score`, `sg`.`examScore` AS `examScore`, `sg`.`total_score` AS `total_score`, `sg`.`grade` AS `grade`, `sg`.`remark` AS `remark`, `sg`.`mark_by` AS `mark_by`, `ec`.`exam_name` AS `exam_name` FROM (`student_grading` `sg` join `exam_calendar` `ec` on(`sg`.`calendar_id` = `ec`.`id`)) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `academic_calendar`
--
ALTER TABLE `academic_calendar`
  ADD PRIMARY KEY (`term`,`school_id`,`section_id`),
  ADD KEY `fk_section_id` (`section_id`);

--
-- Indexes for table `account_chart`
--
ALTER TABLE `account_chart`
  ADD PRIMARY KEY (`code`),
  ADD KEY `school_id` (`school_id`);

--
-- Indexes for table `admission_form`
--
ALTER TABLE `admission_form`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admission_no_gen`
--
ALTER TABLE `admission_no_gen`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admission_number_generator`
--
ALTER TABLE `admission_number_generator`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `teacher_id` (`teacher_id`);

--
-- Indexes for table `assignment_questions`
--
ALTER TABLE `assignment_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assignment_id` (`assignment_id`);

--
-- Indexes for table `assignment_responses`
--
ALTER TABLE `assignment_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assignment_id` (`assignment_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`attendance_id`);

--
-- Indexes for table `book_supplies`
--
ALTER TABLE `book_supplies`
  ADD PRIMARY KEY (`record_id`),
  ADD UNIQUE KEY `isbn` (`isbn`),
  ADD UNIQUE KEY `isbn_2` (`isbn`);

--
-- Indexes for table `character_scores`
--
ALTER TABLE `character_scores`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `character_traits`
--
ALTER TABLE `character_traits`
  ADD PRIMARY KEY (`school_id`,`category`,`description`,`section`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`class_name`,`section`,`school_location`,`school_id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `school_id` (`school_id`),
  ADD KEY `section` (`section`),
  ADD KEY `class_name` (`class_name`);

--
-- Indexes for table `class_attendances`
--
ALTER TABLE `class_attendances`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `class_management`
--
ALTER TABLE `class_management`
  ADD PRIMARY KEY (`class_code`),
  ADD KEY `id` (`id`) USING BTREE;

--
-- Indexes for table `class_role`
--
ALTER TABLE `class_role`
  ADD PRIMARY KEY (`teacher_id`,`role`);

--
-- Indexes for table `class_rooms`
--
ALTER TABLE `class_rooms`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `class_routine`
--
ALTER TABLE `class_routine`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `class_timing`
--
ALTER TABLE `class_timing`
  ADD PRIMARY KEY (`school_id`,`section`,`start_time`,`end_time`,`activities`),
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `data_entry_form`
--
ALTER TABLE `data_entry_form`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `event_categories`
--
ALTER TABLE `event_categories`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `examinations`
--
ALTER TABLE `examinations`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `exams_attendance`
--
ALTER TABLE `exams_attendance`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `exams_subject`
--
ALTER TABLE `exams_subject`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exam_calendar`
--
ALTER TABLE `exam_calendar`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exam_creation`
--
ALTER TABLE `exam_creation`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exam_grading`
--
ALTER TABLE `exam_grading`
  ADD PRIMARY KEY (`admission_no`,`term`,`academic_year`),
  ADD UNIQUE KEY `id_UNIQUE` (`id`);

--
-- Indexes for table `exam_questions`
--
ALTER TABLE `exam_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `exam_id` (`exam_id`);

--
-- Indexes for table `exam_table`
--
ALTER TABLE `exam_table`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exposes`
--
ALTER TABLE `exposes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `financial_report`
--
ALTER TABLE `financial_report`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `generic_school_fees`
--
ALTER TABLE `generic_school_fees`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `grade_setup`
--
ALTER TABLE `grade_setup`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `income`
--
ALTER TABLE `income`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leave_records`
--
ALTER TABLE `leave_records`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lessons`
--
ALTER TABLE `lessons`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lesson_comments`
--
ALTER TABLE `lesson_comments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lesson_time_table`
--
ALTER TABLE `lesson_time_table`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `library_catalogue`
--
ALTER TABLE `library_catalogue`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `parents`
--
ALTER TABLE `parents`
  ADD PRIMARY KEY (`phone_no`,`school_id`),
  ADD KEY `user_parent_pk` (`user_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `item_id` (`item_code`),
  ADD KEY `payment_std_fk` (`admission_no`),
  ADD KEY `item_code` (`item_code`);

--
-- Indexes for table `qrcodesetup`
--
ALTER TABLE `qrcodesetup`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `receipt_urls`
--
ALTER TABLE `receipt_urls`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `rules`
--
ALTER TABLE `rules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `school_calendar`
--
ALTER TABLE `school_calendar`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `school_locations`
--
ALTER TABLE `school_locations`
  ADD PRIMARY KEY (`school_id`,`location`),
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `school_setup`
--
ALTER TABLE `school_setup`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `secondary_school_entrance_form`
--
ALTER TABLE `secondary_school_entrance_form`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`admission_no`);

--
-- Indexes for table `student_aggregated_results`
--
ALTER TABLE `student_aggregated_results`
  ADD PRIMARY KEY (`admission_no`);

--
-- Indexes for table `student_assignments`
--
ALTER TABLE `student_assignments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `student_grading`
--
ALTER TABLE `student_grading`
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `calendar_id` (`calendar_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`subject`,`school_id`,`section`),
  ADD UNIQUE KEY `id` (`subject_code`),
  ADD KEY `id_2` (`subject_code`),
  ADD KEY `school_id` (`school_id`),
  ADD KEY `subject` (`subject`,`section`);

--
-- Indexes for table `syllabus`
--
ALTER TABLE `syllabus`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `syllabus_tracker`
--
ALTER TABLE `syllabus_tracker`
  ADD PRIMARY KEY (`id`),
  ADD KEY `syllabus_id` (`syllabus_id`);

--
-- Indexes for table `task_todos`
--
ALTER TABLE `task_todos`
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `terms_setup`
--
ALTER TABLE `terms_setup`
  ADD PRIMARY KEY (`academic_year`,`term`,`school_id`);

--
-- Indexes for table `time_table`
--
ALTER TABLE `time_table`
  ADD UNIQUE KEY `id` (`id`) USING BTREE;

--
-- Indexes for table `trainees`
--
ALTER TABLE `trainees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `revenue_head_id` (`revenue_head_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `account_chart`
--
ALTER TABLE `account_chart`
  MODIFY `code` bigint(10) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `admission_form`
--
ALTER TABLE `admission_form`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admission_no_gen`
--
ALTER TABLE `admission_no_gen`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `admission_number_generator`
--
ALTER TABLE `admission_number_generator`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `assignment_questions`
--
ALTER TABLE `assignment_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `assignment_responses`
--
ALTER TABLE `assignment_responses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `book_supplies`
--
ALTER TABLE `book_supplies`
  MODIFY `record_id` int(6) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `character_scores`
--
ALTER TABLE `character_scores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT for table `class_attendances`
--
ALTER TABLE `class_attendances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `class_management`
--
ALTER TABLE `class_management`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `class_rooms`
--
ALTER TABLE `class_rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `class_routine`
--
ALTER TABLE `class_routine`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `class_timing`
--
ALTER TABLE `class_timing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `data_entry_form`
--
ALTER TABLE `data_entry_form`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `event_categories`
--
ALTER TABLE `event_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `examinations`
--
ALTER TABLE `examinations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `exams_attendance`
--
ALTER TABLE `exams_attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `exams_subject`
--
ALTER TABLE `exams_subject`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exam_calendar`
--
ALTER TABLE `exam_calendar`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `exam_grading`
--
ALTER TABLE `exam_grading`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exam_table`
--
ALTER TABLE `exam_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `exposes`
--
ALTER TABLE `exposes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_report`
--
ALTER TABLE `financial_report`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `generic_school_fees`
--
ALTER TABLE `generic_school_fees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `grade_setup`
--
ALTER TABLE `grade_setup`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `income`
--
ALTER TABLE `income`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave_records`
--
ALTER TABLE `leave_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `lessons`
--
ALTER TABLE `lessons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `lesson_comments`
--
ALTER TABLE `lesson_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lesson_time_table`
--
ALTER TABLE `lesson_time_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- AUTO_INCREMENT for table `library_catalogue`
--
ALTER TABLE `library_catalogue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `qrcodesetup`
--
ALTER TABLE `qrcodesetup`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `receipt_urls`
--
ALTER TABLE `receipt_urls`
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rules`
--
ALTER TABLE `rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_calendar`
--
ALTER TABLE `school_calendar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_locations`
--
ALTER TABLE `school_locations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `secondary_school_entrance_form`
--
ALTER TABLE `secondary_school_entrance_form`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_assignments`
--
ALTER TABLE `student_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_grading`
--
ALTER TABLE `student_grading`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `syllabus`
--
ALTER TABLE `syllabus`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `syllabus_tracker`
--
ALTER TABLE `syllabus_tracker`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `task_todos`
--
ALTER TABLE `task_todos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `time_table`
--
ALTER TABLE `time_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trainees`
--
ALTER TABLE `trainees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(100) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assignment_responses`
--
ALTER TABLE `assignment_responses`
  ADD CONSTRAINT `assignment_responses_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_responses_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `assignment_questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `exam_questions`
--
ALTER TABLE `exam_questions`
  ADD CONSTRAINT `exam_questions_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `exam_creation` (`id`);

--
-- Constraints for table `parents`
--
ALTER TABLE `parents`
  ADD CONSTRAINT `user_parent_pk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payment_std_fk` FOREIGN KEY (`admission_no`) REFERENCES `students` (`admission_no`),
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`item_code`) REFERENCES `account_chart` (`code`);

--
-- Constraints for table `syllabus_tracker`
--
ALTER TABLE `syllabus_tracker`
  ADD CONSTRAINT `syllabus_tracker_ibfk_1` FOREIGN KEY (`syllabus_id`) REFERENCES `syllabus` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
