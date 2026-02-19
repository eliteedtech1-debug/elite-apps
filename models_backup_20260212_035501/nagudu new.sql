DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ClassTiming`(IN `query_type` VARCHAR(10), IN `in_id` INT, IN `in_school_id` INT, IN `in_section` VARCHAR(255), IN `in_start_time` TIME, IN `in_end_time` TIME, IN `in_activities` TEXT)
BEGIN 
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `Guardians`(IN `query_type` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `p_guardian_id` VARCHAR(20), IN `p_applicant_id` VARCHAR(20), IN `p_guardian_name` VARCHAR(100), IN `p_guardian_address` VARCHAR(255), IN `p_guardian_email` VARCHAR(200), IN `p_guardian_phone_no` VARCHAR(20))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ManageCalendarEvents`(IN `operation` VARCHAR(10), IN `event_id` INT, IN `title` VARCHAR(255), IN `start_date` DATETIME, IN `end_date` DATETIME, IN `school_location` VARCHAR(150), IN `status` ENUM('Active','Inactive','Cancelled'), IN `created_by` VARCHAR(50), IN `recurrence` ENUM('Once','Annual'))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ManageRules`(IN `queryType` VARCHAR(10), IN `ruleID` INT, IN `ruleName` VARCHAR(100), IN `startTime` TIME, IN `endTime` TIME, IN `locationIsBoolean` BOOLEAN)
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ManageSyllabus`(IN `op_type` VARCHAR(10), IN `p_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_level` INT, IN `p_academic_year` YEAR, IN `p_term` VARCHAR(50), IN `p_week_no` TINYINT, IN `p_title` VARCHAR(300), IN `p_content` TEXT)
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `UpdateAdmissionNumbers`()
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `academic_year`(IN `in_query_type` VARCHAR(20), IN `in_school_id` VARCHAR(50), IN `in_id` VARCHAR(50), IN `in_term` VARCHAR(50), IN `in_year` VARCHAR(50), IN `in_begin_date` VARCHAR(50), IN `in_end_date` VARCHAR(50), IN `in_status` VARCHAR(20))
BEGIN
IF in_query_type = 'create' THEN 
INSERT INTO `academic_calendar`(`academic_year`, `term`, `begin_date`, `end_date`, `status`, `school_id`) VALUES (in_year,in_term,date(in_begin_date),date(in_end_date),'inactive',in_school_id);

ELSEIF in_query_type = 'select' THEN 
SELECT * FROM academic_calendar;

ELSEIF in_query_type = 'selectByid' THEN 
SELECT * FROM academic_calendar WHERE school_id=in_school_id;

ELSEIF in_query_type = 'update-status' THEN 
IF 	in_status='active' THEN
	
UPDATE academic_calendar SET status= "inactive" WHERE school_id = in_school_id;
END IF;
UPDATE academic_calendar SET status= in_status WHERE id = in_id;

ELSEIF in_query_type = 'update' THEN
UPDATE `academic_calendar` SET `academic_year`=in_year,`term`=in_term,`begin_date`=date(in_begin_date),`end_date`= date(in_end_date) WHERE id = in_id;

END IF;

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `account_chart`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First term','Second term','Third term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive'), IN `in_account_type` VARCHAR(100), IN `in_school_id` VARCHAR(11))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `admission_form`(IN `in_id` INT(10), IN `query_type` VARCHAR(100), IN `in_pupils_name` VARCHAR(100), IN `in_pupils_last_name` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_religion` INT(100), IN `in_health_needs` VARCHAR(100), IN `in_medical_report` VARCHAR(100), IN `in_last_school` VARCHAR(100), IN `in_last_class` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_town_lga` VARCHAR(100), IN `in_father_name` VARCHAR(100), IN `in_father_occupation` VARCHAR(100), IN `in_father_contact_address` VARCHAR(100), IN `in_father_postal_address` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_telephone` INT(100), IN `in_father_email` VARCHAR(100), IN `in_mother_name` VARCHAR(100), IN `in_mother_occupation` VARCHAR(100), IN `in_mother_address` VARCHAR(100), IN `in_mother_place_of_work` VARCHAR(100), IN `in_mother_telephone` VARCHAR(100), IN `in_mother_email` VARCHAR(100), IN `in_next_of_kin` VARCHAR(100), IN `in_next_of_kin_occupation` VARCHAR(100), IN `in_next_of_kin_contact_address` VARCHAR(100), IN `in_next_of_kin_email` VARCHAR(100), IN `in_next_of_kin_tel` INT(100), IN `in_student_signature` VARCHAR(100), IN `in_sponsor_signature` VARCHAR(100), IN `in_date_from` DATE, IN `in_date_to` DATE)
BEGIN 
    IF query_type="create" THEN 
    INSERT INTO `admission_form`(id, pupils_name, pupils_last_name,date_of_birth, religion, health_needs, medical_report, last_school, last_class, nationality, state_of_origin, town_lga, father_name, father_occupation, father_contact_address, father_postal_address, father_place_of_work, father_telephone, father_email, mother_name, mother_occupation, mother_address, mother_place_of_work, mother_telephone, mother_email, next_of_kin, next_of_kin_occupation, next_of_kin_contact_address, next_of_kin_email, next_of_kin_tel, student_signature, sponsor_signature, date_from, date_to
    ) VALUES (
    in_id,in_pupils_name,in_pupils_last_name,in_date_of_birth,in_religion,in_health_needs,in_medical_report,in_last_school,in_last_class,in_nationality,in_state_of_origin,in_town_lga,in_father_name,in_father_occupation,in_father_contact_address,in_father_postal_address,in_father_place_of_work,in_father_telephone,in_father_email,in_mother_name,in_mother_occupation,in_mother_address,in_mother_place_of_work,in_mother_telephone,in_mother_email,in_next_of_kin,in_next_of_kin_occupation,in_next_of_kin_contact_address,in_next_of_kin_email,in_next_of_kin_tel,in_student_signature,in_sponsor_signature,in_date_from,in_date_to
    );

    ELSEIF query_type='select' THEN
    SELECT * FROM `admission_form`;
    END IF;
    END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `admission_generator`(
    IN `stud_id` INT,
    IN `sch_id` VARCHAR(30),
    IN `branch_id_param` VARCHAR(30)
)
BEGIN
    DECLARE in_code INT;
    DECLARE in_short_name VARCHAR(30);
    DECLARE branch_position INT;

    -- Get the current code and short_name for the given school and branch
    SELECT code, short_name 
      INTO in_code, in_short_name
      FROM school_locations
     WHERE school_id = sch_id
       AND branch_id = branch_id_param
     LIMIT 1;

    -- Get branch position based on id ordering
    SELECT COUNT(*) 
      INTO branch_position
      FROM school_locations
     WHERE school_id = sch_id
       AND id <= (SELECT id FROM school_locations 
                  WHERE school_id = sch_id 
                    AND branch_id = branch_id_param
                  LIMIT 1);

    -- Update student's admission number
    UPDATE students
       SET admission_no = CONCAT(in_short_name, '/', branch_position, '/', LPAD(in_code + 1, 4, '0'))
     WHERE id = stud_id;

    -- Increment the code for the branch in school_locations
    UPDATE school_locations
       SET code = in_code + 1
     WHERE school_id = sch_id
       AND branch_id = branch_id_param;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `admission_no_generator`(IN `app_id` VARCHAR(30), IN `sch_id` VARCHAR(30), IN `brch_id` VARCHAR(30))
BEGIN
    DECLARE in_code INT;
    DECLARE in_short_name VARCHAR(30);
    DECLARE branch_position INT;

    -- Get the current code and short name for the given school and branch
    SELECT code, short_name 
    INTO in_code, in_short_name 
    FROM school_locations 
    WHERE school_id = sch_id 
    AND branch_id = brch_id;

    -- Get branch position (Modify based on actual schema)
    SELECT ROW_NUMBER() OVER (ORDER BY branch_name) INTO branch_position
    FROM school_locations 
    WHERE school_id = sch_id 
    AND branch_id = brch_id;

    -- Update admission number in the student's record
    UPDATE school_applicants 
    SET admission_no = CONCAT(in_short_name, '/', branch_position, '/', LPAD(in_code + 1, 4, '0'))
    WHERE applicant_id = app_id;

    -- Increment the code for the branch in school_locations
    UPDATE school_locations 
    SET code = in_code + 1 
    WHERE school_id = sch_id 
    AND branch_name = branch;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `admission_number_generator`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_serial_no` VARCHAR(100), IN `in_type_of_school` VARCHAR(100))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `application`(IN `query_type` VARCHAR(100), IN `in_upload` VARCHAR(100), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_guardian_name` VARCHAR(100), IN `in_guardian_phone_no` VARCHAR(100), IN `in_guardian_email` VARCHAR(200), IN `in_guardian_address` VARCHAR(100), IN `in_guardian_relationship` VARCHAR(100), IN `in_parent_fullname` VARCHAR(100), IN `in_parent_phone_no` VARCHAR(100), IN `in_parent_email` VARCHAR(100), IN `in_parent_address` VARCHAR(100), IN `in_parent_occupation` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_last_school_attended` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_admission_no` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_status` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_school_id` VARCHAR(100), IN `p_short_name` VARCHAR(10))
BEGIN

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
                      
                      INSERT INTO school_applicants (upload, applicant_id, guardian_id, parent_id, type_of_application, name_of_applicant,
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `assignmentResponses`(IN `query_type` VARCHAR(10), IN `p_assignment_id` INT, IN `p_question_id` INT, IN `p_admission_no` INT, IN `p_subject` VARCHAR(30), IN `p_response` TEXT, IN `p_class_name` VARCHAR(255))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `assignment_questions`(IN `query_type` VARCHAR(30), IN `in_id` VARCHAR(10), IN `in_assignment_id` VARCHAR(10), IN `in_question_type` ENUM('Multiple Choice','True/False','Short Answer','Fill in the Blank','Essay'), IN `in_question_text` TEXT, IN `in_options` JSON, IN `in_correct_answer` VARCHAR(255), IN `in_marks` INT)
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `assignments`(IN `in_query_type` VARCHAR(50), IN `in_id` INT, IN `in_teacher_id` INT, IN `in_class_name` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_assignment_date` DATE, IN `in_submission_date` DATE, IN `in_attachment` VARCHAR(255), IN `in_content` TEXT, IN `in_teacher_name` VARCHAR(100), IN `in_title` VARCHAR(100), IN `in_marks` VARCHAR(100), IN `in_school_id` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_class_code` VARCHAR(20), IN `in_start_date` DATE, IN `in_end_date` DATE)
BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO assignments (
            teacher_id, class_name, subject, assignment_date, submission_date, attachment,
            content, teacher_name, title, marks, school_id, branch_id, class_code, start_date, end_date
        )
        VALUES (
            in_teacher_id, in_class_name, in_subject, in_assignment_date, in_submission_date, in_attachment,
            in_content, in_teacher_name, in_title, in_marks, in_school_id, in_branch_id, in_class_code, in_start_date, in_end_date );
        SELECT LAST_INSERT_ID() AS assignment_id;

    ELSEIF in_query_type = 'UPDATE' THEN
        UPDATE assignments
        SET 
            class_name = COALESCE(in_class_name, class_name),
            subject = COALESCE(in_subject, subject),
            assignment_date = COALESCE(in_assignment_date, assignment_date),
            submission_date = COALESCE(in_submission_date, submission_date),
            attachment = COALESCE(in_attachment, attachment),
            content = COALESCE(in_content, content),
            teacher_name = COALESCE(in_teacher_name, teacher_name),
            title = COALESCE(in_title, title),
            marks = COALESCE(in_marks, marks)  -- Corrected here (marks instead of title)
        WHERE id = in_id;

    ELSEIF in_query_type = 'DELETE' THEN
        DELETE FROM assignments WHERE id = in_id;
	ELSEIF in_query_type = 'student_assignment' THEN
    	SELECT * FROM `assignments` WHERE class_name = in_class_name AND school_id = in_school_id AND branch_id = in_branch_id;
    
    ELSEIF in_query_type = 'select' THEN
        IF in_id IS NOT NULL AND in_id !='' THEN
            SELECT * FROM assignments WHERE id = in_id;
        ELSE
            SELECT * FROM assignments 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND DATE(created_at) BETWEEN in_start_date AND in_end_date;
        END IF;

    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `bookSupplies`(IN `p_action` VARCHAR(20), IN `p_record_id` INT, IN `p_book_title` VARCHAR(255), IN `p_author` VARCHAR(255), IN `p_isbn` VARCHAR(20), IN `p_cover_img` VARCHAR(255), IN `p_status` ENUM('Available','Reserved'), IN `p_qty` INT, IN `p_post_date` DATE, IN `p_publisher` VARCHAR(255), IN `p_subject` VARCHAR(255), IN `p_book_no` VARCHAR(50))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `branch_admin`(IN `query_type` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_name` VARCHAR(250), IN `in_email` VARCHAR(70), IN `in_phone_no` VARCHAR(14), IN `in_password` VARCHAR(100), IN `in_username` VARCHAR(50), IN `in_school_id` VARCHAR(20))
BEGIN
IF  query_type = 'create' THEN
	INSERT INTO `users`(`name`, `email`, `phone_no`, `username`, `role`, `password`, `branch_id`, `school_id`)
    VALUES (in_name, in_email,in_phone_no,in_username, 'branchadmin',in_password,
            in_branch_id, in_school_id);
        
        UPDATE `school_locations` SET `admin_id` = LAST_INSERT_ID() WHERE id = in_branch_id;
        ELSEIF query_type = 'select' THEN 
        SELECT name,email,phone_no,username FROM `users` WHERE branch_id = in_branch_id;
        END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `character_scores`(IN `query_type` VARCHAR(50), IN `in_school_id` VARCHAR(50), IN `in_academic_year` VARCHAR(50), IN `in_term` VARCHAR(50), IN `in_section` VARCHAR(50), IN `in_category` VARCHAR(50), IN `in_admission_no` VARCHAR(50), IN `in_student_name` VARCHAR(50), IN `in_grade` VARCHAR(50), IN `in_created_by` VARCHAR(50), IN `in_description` VARCHAR(50), IN `in_class_name` VARCHAR(50))
BEGIN
    
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `class_management`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_class_code` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_max_population` VARCHAR(100), IN `in_class_teacher` VARCHAR(100), IN `in_section` VARCHAR(100))
BEGIN 
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `class_role`(IN `in_teacher_id` INT(100), IN `in_section` VARCHAR(100), IN `in_subject` VARCHAR(200), IN `in_class` VARCHAR(200), IN `in_role` VARCHAR(200), IN `query_type` VARCHAR(100), IN `in_school_id` VARCHAR(20))
BEGIN

IF query_type = "create" THEN
INSERT INTO `class_role`(`teacher_id`, `section`, `subject`, `class_name`, `role`,school_id) 
VALUES(in_teacher_id,in_section,in_subject,in_class,in_role,in_school_id);

ELSEIF query_type ="select" 
THEN SELECT * FROM class_role;

ELSEIF query_type="byId" THEN
SELECT * FROM class_role WHERE teacher_id=in_teacher_id;

END IF;

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `class_routine`(IN `in_id` INT(10), IN `query_type` VARCHAR(50), IN `in_teacher` VARCHAR(50), IN `in_class_` VARCHAR(100), IN `in_section` VARCHAR(50), IN `in_day` VARCHAR(50), IN `in_start_time` TIMESTAMP(6), IN `in_end_time` TIMESTAMP(6), IN `in_class_room` VARCHAR(50))
BEGIN 
IF query_type="create" THEN
INSERT INTO `class_routine`(teacher, class_, section, day, start_time, end_time, class_room) 
VALUES (in_teacher,in_class_,in_section,in_day,in_start_time,in_end_time,in_class_room);

ELSEIF query_type='select' THEN
    SELECT * FROM `class_routine`;
    
END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `classes`(IN `query_type` VARCHAR(50), IN `in_id` INT, IN `in_class_name` VARCHAR(100), IN `in_class_code` VARCHAR(100), IN `in_section` VARCHAR(100), IN `in_school_location` VARCHAR(200), IN `in_school_id` VARCHAR(10))
BEGIN
DECLARE last_code int;
DECLARE class_code varchar(100);

 IF query_type = 'create' THEN
  START TRANSACTION;
  
  SELECT MAX(code) + 1 INTO @last_code FROM number_generator WHERE prefix = "CLA" FOR UPDATE;

  SET class_code = CONCAT(UPPER(SUBSTRING(in_class_name, 1, 2)), LPAD(@last_code, 4, '0'));

	UPDATE number_generator SET code = @last_code WHERE prefix = "cla";
        -- Insert a new class record
        INSERT INTO `classes`(`class_name`, `class_code`, `section`,`branch_id`, `school_id`)
        VALUES (in_class_name, class_code, in_section, in_school_location, in_school_id);
        
        COMMIT;
    
    ELSEIF query_type = 'update' THEN
        -- Update an existing class record based on `in_id`
        UPDATE `classes`
        SET `class_name` = COALESCE(in_class_name,class_name),
            `class_code` = COALESCE(class_code,in_class_code),
            `section` = COALESCE(section,in_section),
            `branch_id` = COALESCE(school_location,in_school_location),
            `school_id` = COALESCE(school_id,in_school_id)
        WHERE `id` = in_id;
        
    ELSEIF query_type = 'select' THEN

        SELECT * FROM `classes`
         WHERE (class_name = in_class_name OR in_class_name IS NULL OR class_name='All Classes' )
          AND (term = in_term OR in_term IS NULL or term ='Per Annum')
          AND (branch_id = in_school_location OR in_school_location IS NULL);

    ELSEIF query_type = 'select-all' THEN
        -- Select all classes
       SELECT * FROM `classes` WHERE school_id = in_school_id;

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
    	SELECT  class_name, class_code,   COUNT(*) as student_count FROM `students` GROUP BY class_name;
    END IF;

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `dashboard_query`(IN `query_type` VARCHAR(100), IN `school_location` VARCHAR(500))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `data_entry_form`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_date` DATE, IN `in_admission_number` INT(100), IN `in_class1` VARCHAR(100), IN `in_stream` VARCHAR(100), IN `in_first_name1` VARCHAR(100), IN `in_middle_name` VARCHAR(100), IN `in_surname` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_blood_group` INT(100), IN `in_email` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_street` VARCHAR(100), IN `in_city` VARCHAR(100), IN `in_first_name` VARCHAR(100), IN `in_relationship` INT(100), IN `in_mobile_no` VARCHAR(100), IN `in_address` VARCHAR(100), IN `in_street1` VARCHAR(100), IN `in_city1` VARCHAR(100), IN `in_state` VARCHAR(100))
BEGIN 
    IF query_type="create" THEN
    INSERT INTO `data_entry_form`(id, date, admission_number, class1, stream, first_name1, middle_name, surname, sex, blood_group, email, nationality, state_of_origin, home_address, street, city, first_name, relationship, mobile_no, address, street1, city1, state
    ) VALUES (in_id,in_date,in_admission_number,in_class1,in_stream,in_first_name1,in_middle_name,in_surname,in_sex,in_blood_group,in_email,in_nationality,in_state_of_origin,in_home_address,in_street,in_city,in_first_name,in_relationship,in_mobile_no,in_address,in_street1,in_city1,in_state);

    ELSEIF query_type='select' THEN
    SELECT * FROM `data_entry_form`;
    END IF;
    END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `entrance_exam_submission`(IN `p_subject_id` INT, IN `p_subject_name` VARCHAR(255), IN `p_school_id` INT, IN `p_section_id` INT, IN `p_academic_year` VARCHAR(50), IN `p_exam_venue` TEXT, IN `p_exam_mark` DECIMAL(5,2), IN `p_applicant_id` INT, IN `p_exam_status` VARCHAR(50))
BEGIN
    
    INSERT INTO entrance_exam (
        subject_id, subject_name, school_id, section_id, 
        acadamic_year, exam_venue, exam_mark, applicant_id, exam_status
    ) VALUES (
        p_subject_id, p_subject_name, p_school_id, p_section_id, 
        p_academic_year, p_exam_venue, p_exam_mark, p_applicant_id, p_exam_status
    );

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_calendar`(IN `query_type` VARCHAR(50), IN `in_id` INT UNSIGNED, IN `in_admin_id` INT, IN `in_exam_name` VARCHAR(100), IN `in_academic_year` VARCHAR(45), IN `in_term` VARCHAR(50), IN `in_start_date` DATE, IN `in_end_date` DATE, IN `in_status` VARCHAR(30), IN `in_school_id` VARCHAR(20))
BEGIN
    IF query_type = 'create' THEN
        INSERT INTO exam_calendar (admin_id, exam_name, academic_year, term, start_date, end_date,school_id)
        VALUES (in_admin_id, in_exam_name, in_academic_year, in_term, in_start_date, in_end_date,in_school_id);

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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_creation`(IN `query_type` VARCHAR(100), IN `in_id` CHAR(100), IN `in_teacher_id` INT(20), IN `in_assessment_type` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_term` VARCHAR(100), IN `in_subject_name` VARCHAR(100), IN `in_commence_date` DATE, IN `in_start_time` TIME, IN `in_end_time` TIME, IN `in_status` VARCHAR(20))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_drading`(IN `_admission_no` VARCHAR(30), IN `_student_name` VARCHAR(30), IN `_classname` VARCHAR(30), IN `_subject` VARCHAR(30), IN `_CA_marks` INT, IN `_Ass_marks` INT, IN `_exam_marks` INT, IN `_term` INT, IN `_academic_year` INT)
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_grading`(IN `query_type` VARCHAR(50), IN `_admission_no` VARCHAR(30), IN `_student_name` VARCHAR(50), IN `_classname` VARCHAR(50), IN `_subject` VARCHAR(50), IN `_CA_marks` INT, IN `_Ass_marks` INT, IN `_exam_marks` INT, IN `_term` VARCHAR(30), IN `_academic_year` VARCHAR(20))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_questions`(IN `query_type` VARCHAR(100), IN `in_id` CHAR(100), IN `in_exam_id` VARCHAR(100), IN `in_question` VARCHAR(400), IN `in_marks` INT(100), IN `in_option1` VARCHAR(200), IN `in_option2` VARCHAR(200), IN `in_option3` VARCHAR(200), IN `in_option4` VARCHAR(200), IN `in_answer` VARCHAR(200))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_subject`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_score` INT(100), IN `in_status` VARCHAR(100))
BEGIN 
IF query_type="create" THEN
INSERT INTO `exams_subject`(id, application_no, subject, score, status)
VALUES (in_id,in_application_no,in_subject,in_score,in_status);

ELSEIF query_type="select" THEN
SELECT * FROM `exams_subject`;
END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_subjects`(IN `query_type` VARCHAR(100), IN `in_id` INT(100), IN `in_application_no` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_score` INT(100), IN `in_status` VARCHAR(100))
BEGIN 
IF query_type="create" THEN
INSERT INTO exams_subject(application_no, subject)
VALUES (in_application_no,in_subject);

ELSEIF query_type="update" AND in_application_no IS NOT NULL AND in_application_no !='' THEN
	UPDATE exams_subject SET status = in_status, score=in_score WHERE application_no =in_application_no;
ELSEIF query_type="select" THEN
	SELECT * FROM exams_subject;
END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_table`(IN `query_type` VARCHAR(100), IN `in_id` INT, IN `in_exam_id` CHAR(100), IN `in_question_id` CHAR(100), IN `in_student_id` VARCHAR(50), IN `in_class_name` VARCHAR(100), IN `in_question` VARCHAR(300), IN `in_selected_option` VARCHAR(200), IN `in_response` VARCHAR(200), IN `in_answer` VARCHAR(200), IN `in_mark` INT(100), IN `in_remarks` VARCHAR(200))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `examinations`(IN `query_type` VARCHAR(50), IN `in_id` INT(11), IN `in_subject_name` VARCHAR(20), IN `in_title` VARCHAR(50), IN `in_class_name` VARCHAR(50), IN `in_class_code` VARCHAR(50), IN `in_subject_code` VARCHAR(50), IN `in_exam_type` VARCHAR(50), IN `in_duration` VARCHAR(60), IN `in_start_time` VARCHAR(12), IN `in_end_time` VARCHAR(12), IN `in_invigilator` VARCHAR(50), IN `in_exam_date` DATE, IN `in_term` VARCHAR(20), IN `in_academic_year` VARCHAR(20), IN `in_school_id` VARCHAR(20))
BEGIN
DECLARE last_code INT;
DECLARE exam_code VARCHAR(100);

IF query_type="create" THEN
    SELECT COALESCE(MAX(code), 0) + 1 INTO last_code FROM number_generator WHERE prefix = 'exm';
    SET exam_code = CONCAT('EX/', UPPER(SUBSTRING(in_subject_code, 1, 3)), '/', UPPER(SUBSTRING(in_academic_year, 1, 4)), '/', LPAD(last_code, 4, '0'));

        UPDATE number_generator SET code = last_code WHERE prefix = 'exm';
INSERT INTO `examinations` (exam_code,subject_name, title, class_name, class_code, subject_code, exam_type, duration, start_time, end_time, invigilator, exam_date,term,academic_year,school_id) 
VALUES (exam_code,in_subject_name, in_title, in_class_name,in_class_code, in_subject_code, in_exam_type, in_duration, in_start_time,in_end_time, in_invigilator, in_exam_date,in_term,in_academic_year,in_school_id);

ELSEIF query_type = "delete" THEN
    DELETE  FROM `examinations` WHERE id = in_id;

ELSEIF query_type="select-schedule" THEN
SELECT * FROM `examinations` WHERE class_name = in_class_name;

ELSEIF query_type="select-all" THEN
SELECT * FROM `examinations` WHERE school_id = in_school_id;

END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exams_attendance`(IN `query_type` VARCHAR(50), IN `_id` INT, IN `_teacher_name` VARCHAR(50), IN `_teacher_id` VARCHAR(50), IN `_exam` VARCHAR(50), IN `_class_name` VARCHAR(50), IN `_day` VARCHAR(50), IN `_status` VARCHAR(50), IN `_student_name` VARCHAR(50), IN `_admission_no` VARCHAR(50), IN `_term` VARCHAR(50), IN `_academic_year` VARCHAR(50), IN `_start_date` DATE, IN `_end_date` DATE)
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `generate_admission_no_for_returning_students`(IN `student_id` VARCHAR(30), IN `sch_id` VARCHAR(30), IN `branch` VARCHAR(30))
BEGIN  
    DECLARE in_code INT;  
    DECLARE in_short_name VARCHAR(30);  
    DECLARE branch_position INT;  
    DECLARE new_admission_no VARCHAR(50);  

    -- Get the current code and short name for the given school and branch  
    SELECT code, short_name   
    INTO in_code, in_short_name   
    FROM school_locations   
    WHERE school_id = sch_id   
    AND branch_name = branch;  

    -- Get branch position  
    SELECT ROW_NUMBER() OVER (ORDER BY branch_name) INTO branch_position  
    FROM school_locations   
    WHERE school_id = sch_id   
    AND branch_name = branch;  

    -- Generate admission number  
    SET new_admission_no = CONCAT(in_short_name, '/', branch_position, '/', LPAD(in_code + 1, 4, '0'));  

    -- Assign the admission number to the returning student  
    UPDATE students  
    SET admission_no = new_admission_no  
    WHERE id = student_id;  

    -- Increment the code for the branch  
    UPDATE school_locations   
    SET code = in_code + 1   
    WHERE school_id = sch_id   
    AND branch_name = branch;  
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `genericSchoolFees`(IN `query_type` VARCHAR(20), IN `in_id` INT, IN `in_section` VARCHAR(50), IN `in_description` VARCHAR(100), IN `in_class_name` VARCHAR(50), IN `in_fees` DECIMAL(8,2), IN `in_term` VARCHAR(50), IN `in_academic_year` VARCHAR(9), IN `in_status` ENUM('Active','Inactive'), IN `in_created_by` VARCHAR(50), IN `in_school_id` VARCHAR(20))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `get_class_results`(IN `query_type` VARCHAR(30), IN `in_admission_no` VARCHAR(30), IN `in_class_name` VARCHAR(30), IN `in_academic_year` VARCHAR(30), IN `in_term` VARCHAR(30), IN `in_school_id` VARCHAR(30))
BEGIN
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
        COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count, -- Count distinct subjects
         
        COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count,
    SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) AS avg_score, -- Avoid division by zero
    RANK() OVER (ORDER BY SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) DESC) AS position,

      COALESCE(MAX(e.academic_year), '') AS academic_year,  -- Use MAX to avoid splitting rows
      COALESCE(MAX(e.term), '') AS term,  
      COALESCE(SUM(e.ca1Score), 0) AS total_assignment_score,
      COALESCE(SUM(e.ca2Score), 0) AS total_ca_score,
      COALESCE(SUM(e.examScore), 0) AS total_exam_score,
      COALESCE(SUM(e.total_score), 0) AS total_score, 
      s.school_id AS school_id 
    FROM students s 
    LEFT JOIN exam_reports e 
        ON s.admission_no = e.admission_no 
        AND s.current_class = e.class_name
    WHERE 
      s.school_id = in_school_id 
      AND s.current_class = in_class_name
    GROUP BY 
      s.current_class, 
      s.admission_no, 
      s.student_name, 
      s.school_id
    ORDER BY s.student_name DESC;

  ELSEIF query_type = 'Select Class Summary' THEN
    SELECT 
        student_name, 
        admission_no, 
        SUM(total_score) AS total_score, 
        COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count,
    SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) AS avg_score, -- Avoid division by zero
    RANK() OVER (ORDER BY SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) DESC) AS position
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
       COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count -- Added subjects_count
    FROM exam_reports 
    WHERE admission_no = in_admission_no  
    GROUP BY admission_no  
    ORDER BY total_score DESC;

  ELSEIF query_type = 'Select Student Draft' THEN
    SELECT * FROM `exam_reports` WHERE admission_no= in_admission_no;

  END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `get_results`(IN `query_type` VARCHAR(100))
BEGIN 

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
    school_applicants ssef
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `grade_setup`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_grade` VARCHAR(50), IN `in_remark` VARCHAR(50), IN `in_min_score` INT(3), IN `in_max_score` INT(3), IN `in_status` VARCHAR(30))
BEGIN 
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `grades`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_grade` INT(50), IN `in_percentage` INT(14), IN `in_point` INT(50), IN `in_status` ENUM('Active','Inactive'))
BEGIN IF query_type="create" THEN INSERT INTO `grades` (grade, percentage,point,status) VALUES (in_grade, in_percentage, in_point, in_status); ELSEIF query_type="select" THEN SELECT * FROM `grades` WHERE id=in_id; ELSEIF query_type="select-all" THEN SELECT * FROM `grades`; END IF; END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `insert_transaction`(IN `p_student_id` INT(100), IN `p_revenue_head_id` INT(100), IN `p_amount_paid` DECIMAL(10,2), IN `p_payment_method` VARCHAR(100), IN `p_transaction_reference` VARCHAR(100))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `leaveRecords`(IN `query_type` VARCHAR(10), IN `in_record_id` INT, IN `in_user_id` VARCHAR(50), IN `in_user_role` VARCHAR(50), IN `in_user_name` VARCHAR(50), IN `in_class_name` VARCHAR(50), IN `in_type` VARCHAR(50), IN `in_start_date` DATE, IN `in_end_date` DATE, IN `in_no_of_days` INT, IN `in_applied_on` DATE, IN `in_status` ENUM('Pending','Approved','Rejected'), IN `in_approved_by` VARCHAR(50), IN `in_approved_on` DATE, IN `in_school_location` VARCHAR(200))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `lesson_comments`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_lesson_id` INT(10), IN `in_user_id` INT(10), IN `in_user_name` VARCHAR(30), IN `in_user_role` VARCHAR(10), IN `in_parent_id` INT(11), IN `in_comment` VARCHAR(500))
BEGIN
 IF query_type="create" THEN
 INSERT INTO lesson_comments (lesson_id, user_id, user_name, user_role, comment, parent_id) 
 VALUES (in_lesson_id, in_user_id, in_user_name, in_user_role, in_comment, in_parent_id);
 
  ELSEIF  query_type="select" THEN
  SELECT * FROM lesson_comments WHERE lesson_id = in_lesson_id;
 END IF;
 
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `lesson_time_table`(IN `query_type` VARCHAR(50), IN `in_id` VARCHAR(50), IN `in_day` VARCHAR(20), IN `in_class_name` VARCHAR(50), IN `in_subject` VARCHAR(50), IN `in_teacher_id` INT(10), IN `in_section` VARCHAR(50), IN `in_school_location` VARCHAR(150), IN `in_start_time` VARCHAR(20), IN `in_end_time` VARCHAR(20), IN `in_status` VARCHAR(50), IN `in_school_id` VARCHAR(10), IN `in_branch_id` VARCHAR(20), IN `in_class_code` VARCHAR(20))
BEGIN
    IF query_type = 'create' THEN
        INSERT INTO lesson_time_table(day, class_name, subject, teacher_id, section, school_location, start_time, end_time, school_id,branch_id,class_code)
        VALUES (in_day, in_class_name, in_subject, in_teacher_id, in_section, in_school_location, in_start_time, in_end_time, in_school_id,in_branch_id,in_class_code);
    
    ELSEIF query_type = 'update' THEN
        UPDATE lesson_time_table
        SET day = in_day,
            class_name = in_class_name,
            class_code = in_class_code,
            subject = in_subject,
            teacher_id = in_teacher_id,
            section = in_section,
            school_location = in_school_location,
            start_time = in_start_time,
            end_time = in_end_time,
            status = in_status
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `lessons`(IN `in_query_type` VARCHAR(10), IN `in_assignment_id` INT, IN `in_class_name` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_lesson_date` DATE, IN `in_attachment` VARCHAR(255), IN `in_content` MEDIUMTEXT, IN `in_teacher` VARCHAR(100), IN `in_title` VARCHAR(100), IN `in_school_id` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_class_code` VARCHAR(20))
BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO lessons (class_name, subject, lesson_date , attachment, content, teacher, title, school_id, branch_id, class_code)
        VALUES (in_class_name, in_subject, in_lesson_date, in_attachment, in_content, in_teacher, in_title, in_school_id, in_branch_id, in_class_code);
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
            SELECT * FROM lessons WHERE school_id = in_school_id and branch_id = in_branch_id and class_code = in_class_code;
        END IF;
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `libraryCatalogue`(IN `query_type` ENUM('CREATE','UPDATE','RETURN','SELECT'), IN `in_book_title` VARCHAR(255), IN `in_author` VARCHAR(255), IN `in_isbn` VARCHAR(20), IN `in_cover_img` VARCHAR(500), IN `in_borrower_name` VARCHAR(255), IN `in_date_borrowed` DATE, IN `in_due_date` DATE, IN `in_return_date` DATE, IN `in_status` ENUM('Available','Borrowed','Overdue'), IN `in_qty` INT, IN `in_post_date` DATE, IN `in_rack_no` VARCHAR(255), IN `in_publisher` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_book_no` VARCHAR(50), IN `in_record_id` INT)
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_attendance`(IN `query_type` VARCHAR(20), IN `p_attendance_id` INT, IN `p_name` VARCHAR(255), IN `p_className` VARCHAR(255), IN `p_role` VARCHAR(255), IN `p_department` VARCHAR(255), IN `p_date` DATE, IN `p_check_in_time` TIME, IN `p_check_out_time` TIME)
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_branches`(IN `query_type` VARCHAR(50), IN `in_branch_id` INT, IN `in_school_id` VARCHAR(20), IN `in_branch_name` VARCHAR(50), IN `in_location` VARCHAR(200), IN `in_short_name` VARCHAR(10), IN `in_status` ENUM('Active','Inactive'))
BEGIN 
	DECLARE brch_id INT;
    DECLARE brch_code VARCHAR(50);
  -- Create a new branch
  IF query_type = 'create' THEN
  		
        SELECT code + 1 INTO brch_id FROM number_generator WHERE description = "branch_code";
        SET brch_code  = CONCAT("BRCH", LPAD(CAST(brch_id  AS CHAR(5)), 5, '0'));
  
    INSERT INTO school_locations (branch_id,school_id, branch_name, location, short_name, status)
    VALUES (brch_code,in_school_id, in_branch_name, in_location, in_short_name, in_status);
    SELECT LAST_INSERT_ID() AS branch_id;

  -- Get all branches for a specific school
  ELSEIF query_type = 'get_all' THEN
    SELECT * FROM school_locations WHERE school_id = in_school_id;

  -- Get a specific branch by ID
  ELSEIF query_type = 'get_one' THEN
    SELECT * FROM school_locations WHERE id = in_branch_id;

  -- Update a branch
  ELSEIF query_type = 'update' THEN
    UPDATE school_locations
    SET
      location = IFNULL(in_location, location),
      short_name = IFNULL(in_short_name, short_name),
      status = IFNULL(in_status, status)
    WHERE id = in_branch_id;

  -- Delete a specific branch
  ELSEIF query_type = 'delete_one' THEN
    DELETE FROM school_locations WHERE id = in_branch_id;

  -- Delete all branches for a specific school
  ELSEIF query_type = 'delete_all' THEN
    DELETE FROM school_locations WHERE school_id = in_school_id;

  ELSE
    -- Invalid query_type
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query type';
  END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_expenses`(IN `query_type` VARCHAR(10), IN `expose_id` INT, IN `category_name` VARCHAR(100), IN `source` VARCHAR(100), IN `transaction_type` VARCHAR(50))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_financial_report`(IN `query_type` VARCHAR(20), IN `report_id` INT, IN `report_date` DATE, IN `report_category` VARCHAR(100), IN `report_description` TEXT, IN `report_amount` DECIMAL(10,2), IN `payment_method` VARCHAR(20))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_income`(IN `query_type` VARCHAR(10), IN `income_id` INT, IN `income_category_name` VARCHAR(100), IN `income_source` VARCHAR(50), IN `transaction_type` VARCHAR(50))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_payments`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_admission_no` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_ref_no` INT, IN `in_item_code` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(8,2), IN `in_discount` DECIMAL(8,2), IN `in_fines` DECIMAL(8,2), IN `in_qty` INT, IN `in_academic_year` VARCHAR(9), IN `in_term` VARCHAR(20), IN `in_status` ENUM('Paid','Unpaid'), IN `in_due_date` DATE, IN `in_payment_date` DATE, IN `in_payment_mode` VARCHAR(255), IN `in_created_by` VARCHAR(255), IN `in_school_id` VARCHAR(10), IN `in_limit` INT, IN `in_offset` INT, IN `start_date` DATE, IN `end_date` DATE)
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_qr_code`(IN `query_type` VARCHAR(20), IN `qrcode_id` INT, IN `qr_code` TEXT, IN `user_type` VARCHAR(50), IN `expiry_datetime` DATETIME, IN `location_is_boolean` BOOLEAN, IN `longitude` DECIMAL(10,8), IN `latitude` DECIMAL(10,8), IN `status` ENUM('active','suspended','stopped'))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_student_grading`(IN `query_type` VARCHAR(10), IN `p_id` INT, IN `p_admission_number` VARCHAR(50), IN `p_student_name` VARCHAR(100), IN `p_subject_name` VARCHAR(100), IN `p_class` VARCHAR(50), IN `p_score` DECIMAL(5,2), IN `p_mark_by` VARCHAR(100))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `manage_task_todo`(IN `op_type` VARCHAR(10), IN `p_id` VARCHAR(100), IN `p_user_id` INT(11), IN `p_title` VARCHAR(200), IN `p_event_for` VARCHAR(60), IN `p_event_category` ENUM('Celebration','Training','Holidays','Meeting'), IN `p_start_date` DATE, IN `p_end_date` DATE, IN `p_start_time` TIME, IN `p_end_time` TIME, IN `p_attachment` VARCHAR(500), IN `p_content` TEXT, IN `p_created_by` VARCHAR(50), IN `p_priority` ENUM('High','Medium','Low'), IN `p_search_keyword` VARCHAR(50), IN `p_limit` INT(11), IN `p_offset` INT(11))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `parents`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(20), IN `in_name` VARCHAR(100), IN `in_phone_no` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_relationship` VARCHAR(100), IN `in_is_guardian` VARCHAR(3), IN `in_occupation` VARCHAR(100), IN `in_children_admin_no` VARCHAR(50), IN `in_school_id` VARCHAR(20))
BEGIN
    DECLARE par_id INT;
    DECLARE par_code VARCHAR(50);
    DECLARE in_short_name VARCHAR(10);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF query_type = 'create' THEN
    		SELECT s.short_name INTO in_short_name FROM school_setup s WHERE s.school_id= in_school_id;
            

           SELECT code + 1 INTO par_id FROM number_generator WHERE description = "parent_id";
           SET par_code  = CONCAT("PAR/",in_short_name,'/', LPAD(CAST(par_id  AS CHAR(5)), 5, '0'));

            INSERT INTO users (name, email, username, phone_no, role, password, school_id)
            VALUES (
                in_name, 
                in_email, 
                in_phone_no,
                in_phone_no,
                'parent', 
                '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 
                in_school_id
            );
            
             INSERT INTO parents (parent_id,fullname, phone_no, email, relationship, is_guardian, occupation, school_id,user_id)
            VALUES (par_code,in_name, in_phone_no, in_email, in_relationship, in_is_guardian, in_occupation, in_school_id,LAST_INSERT_ID());
            
            UPDATE number_generator SET code = par_id  WHERE description = "parent_id";

	ELSEIF query_type = 'parent' THEN
         SELECT code + 1 INTO par_id FROM number_generator WHERE description = "parent_id";
           SET par_code  = CONCAT("PAR/",in_short_name,'/', LPAD(CAST(par_id  AS CHAR(5)), 5, '0'));

            INSERT INTO users (name, email, username, phone_no, role, password, school_id)
            VALUES (
                in_name, 
                in_email, 
                in_name,
                in_phone_no,
                'parent', 
                '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 
                in_school_id
            );
            
             INSERT INTO parents (parent_id,fullname, phone_no, email, relationship, is_guardian, occupation, school_id,user_id)
            VALUES (par_code,in_name, in_phone_no, in_email, in_relationship, in_is_guardian, in_occupation, in_school_id,LAST_INSERT_ID());
            
            UPDATE  `students` SET parent_id = par_code WHERE admission_no = in_children_admin_no; 
            UPDATE number_generator SET code = par_id  WHERE description = "parent_id";


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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `receipt_urls`(IN `query_type` VARCHAR(10), IN `in_id` VARCHAR(10), IN `in_ref_no` VARCHAR(20), IN `in_url` VARCHAR(500))
BEGIN
  IF query_type='create' THEN
  		INSERT INTO `receipt_urls`(`id`, `ref_no`, `url`) 
        VALUES (`in_id`, `in_ref_no`, `in_url`);
  ELSEIF   query_type='select' THEN
  	SELECT * FROM `receipt_urls` WHERE ref_no = `in_ref_no`;
  END IF;
  
  END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `revenue_heads`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First term','Second term','Third term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive'), IN `in_school_location` VARCHAR(100), IN `in_school_id` VARCHAR(11))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `schoolCalendar`(IN `query_type` VARCHAR(50), IN `in_event_id` INT, IN `in_title` VARCHAR(255), IN `in_start_date` DATETIME, IN `in_end_date` DATETIME, IN `in_color` VARCHAR(30), IN `in_status` ENUM('Active','Inactive','Cancelled'), IN `in_created_by` VARCHAR(50), IN `in_recurrence` ENUM('Once','Annual'), IN `in_school_location` VARCHAR(150), IN `in_school_id` VARCHAR(20))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `school_admission_form`(IN `p_query_type` VARCHAR(50), IN `p_upload` VARCHAR(255), IN `p_applicant_id` VARCHAR(50), IN `p_guardian_id` VARCHAR(50), IN `p_parent_id` VARCHAR(50), IN `p_type_of_application` VARCHAR(50), IN `p_name_of_applicant` VARCHAR(255), IN `p_home_address` TEXT, IN `p_date_of_birth` DATE, IN `p_guardian_name` VARCHAR(255), IN `p_guardian_phone_no` VARCHAR(20), IN `p_guardian_email` VARCHAR(100), IN `p_guardian_address` TEXT, IN `p_guardian_relationship` VARCHAR(50), IN `p_parent_fullname` VARCHAR(255), IN `p_parent_phone_no` VARCHAR(20), IN `p_parent_email` VARCHAR(100), IN `p_parent_address` TEXT, IN `p_parent_occupation` VARCHAR(100), IN `p_state_of_origin` VARCHAR(100), IN `p_l_g_a` VARCHAR(100), IN `p_last_school_attended` VARCHAR(255), IN `p_mathematics` VARCHAR(5), IN `p_english` VARCHAR(5), IN `p_special_health_needs` TEXT, IN `p_sex` VARCHAR(10), IN `p_admission_no` VARCHAR(50), IN `p_school` VARCHAR(100), IN `p_status` VARCHAR(20), IN `p_academic_year` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_short_name` VARCHAR(20), IN `p_last_class` VARCHAR(100), IN `p_others` VARCHAR(50), IN `in_id` INT(11), IN `p_other_score` INT(11))
BEGIN

	DECLARE app_id INT;
	DECLARE gur_id INT;
	DECLARE par_id INT;
    
    DECLARE app_code VARCHAR(50);
	DECLARE gur_code VARCHAR(50);
	DECLARE par_code VARCHAR(50);
    
      IF p_query_type = 'Update Scores' THEN
    UPDATE school_applicants
    SET
        mathematics = p_mathematics,
        english = p_english,
        other_score = p_other_score, 
        current_class = p_last_class, 
        status = p_status
    WHERE applicant_id = p_applicant_id;
    
    SELECT * FROM school_applicants WHERE applicant_id = p_applicant_id;

    
    ELSEIF  p_query_type = 'create' THEN

    
    SELECT code + 1 INTO app_id FROM number_generator WHERE description = "application_id";
    SELECT code + 1 INTO gur_id  FROM number_generator WHERE description = "guardian_id";
    SELECT code + 1 INTO par_id FROM number_generator WHERE description = "parent_id";
    
    SET app_code  = CONCAT("APP/",p_short_name,'/', LPAD(CAST(app_id  AS CHAR(5)), 5, '0'));
    SET gur_code  = CONCAT("GUR/",p_short_name,'/', LPAD(CAST(gur_id  AS CHAR(5)), 5, '0'));
    SET par_code  = CONCAT("PAR/",p_short_name,'/', LPAD(CAST(par_id  AS CHAR(5)), 5, '0'));
    
    CALL parents('create', par_code, p_parent_fullname, p_parent_phone_no, p_parent_email,p_guardian_relationship, 'Yes',p_parent_occupation,p_admission_no,p_school_id);

     CALL guardians('create',p_school_id, gur_code, app_code, p_guardian_name, 
                      p_guardian_address, p_guardian_email, p_guardian_phone_no);
    INSERT INTO school_applicants (
        upload, applicant_id, guardian_id, parent_id, type_of_application, name_of_applicant,
        home_address, date_of_birth,last_class, state_of_origin, 
        l_g_a, last_school_atterded, special_health_needs, 
        sex,others, admission_no, school, status, school_id, branch_id, academic_year
    ) VALUES (
        p_upload, app_code, gur_code, par_code, p_type_of_application, p_name_of_applicant,
        p_home_address, p_date_of_birth, p_last_class, p_state_of_origin, 
        p_l_g_a, p_last_school_attended, p_special_health_needs, 
        p_sex,   p_others, p_admission_no, p_school, p_status, p_school_id, p_branch_id, p_academic_year
    );
        
    UPDATE number_generator SET code = app_id  WHERE description = "application_id";
    UPDATE number_generator SET code = gur_id  WHERE description = "guardian_id";
    UPDATE number_generator SET code = par_id  WHERE description = "parent_id";

    ELSEIF p_query_type='select' THEN
    	SELECT * FROM school_applicants 
    	WHERE school_id = p_school_id 
      	AND (p_branch_id IS NULL OR p_branch_id = '' OR branch_id = p_branch_id);

        
    ELSEIF p_query_type = 'select_application_no' THEN
    SELECT * FROM `school_applicants` WHERE applicant_id = p_applicant_id;
	
    ELSEIF p_query_type='select_id' THEN
    SELECT * FROM `school_applicants` WHERE id=in_id;
    
  
    ELSEIF p_query_type = 'update' THEN
        UPDATE school_applicants SET
            upload = p_upload,
            guardian_id = p_guardian_id,
            parent_id = p_parent_id,
            type_of_application = p_type_of_application,
            name_of_applicant = p_name_of_applicant,
            home_address = p_home_address,
            date_of_birth = p_date_of_birth,
            guardian_name = p_guardian_name,
            guardian_phone_no = p_guardian_phone_no,
            guardian_email = p_guardian_email,
            guardian_address = p_guardian_address,
            guardian_relationship = p_guardian_relationship,
            parent_fullname = p_parent_fullname,
            parent_phone_no = p_parent_phone_no,
            parent_email = p_parent_email,
            parent_address = p_parent_address,
            parent_occupation = p_parent_occupation,
            state_of_origin = p_state_of_origin,
            l_g_a = p_l_g_a,
            last_school_attended = p_last_school_attended,
            mathematics = p_mathematics,
            english = p_english,
            special_health_needs = p_special_health_needs,
            sex = p_sex,
            admission_no = p_admission_no,
            school = p_school,
            status = p_status,
            school_id = p_school_id,
            academic_year = p_academic_year
        WHERE id = p_applicant_id;
        
        CALL parents('update', p_parent_id, p_parent_fullname, p_parent_phone_no, p_parent_email, 
                     p_guardian_relationship, 0, p_parent_occupation, p_school_id, p_admission_no);

        CALL guardians(p_school_id, p_guardian_id, p_applicant_id, p_guardian_name, 
                       p_guardian_address, p_guardian_email, p_guardian_phone_no);
                       
                           ELSEIF p_query_type = 'select_application_no' THEN
    SELECT * FROM `school_applicants` WHERE applicant_id = p_applicant_id;
	
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `school_applicants`(IN `in_id` VARCHAR(100), IN `query_type` VARCHAR(100), IN `in_upload` VARCHAR(300), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_religion` VARCHAR(100), IN `in_tribe` VARCHAR(100), IN `in_school_attended` VARCHAR(100), IN `in_class1` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_time` VARCHAR(100), IN `in_venue` VARCHAR(100), IN `in_common_entrance` VARCHAR(100), IN `in_placement` VARCHAR(100), IN `in_examination_date` DATE, IN `in_date` VARCHAR(100), IN `in_first_name` VARCHAR(100), IN `in_examination_number` VARCHAR(100), IN `in_father_name` VARCHAR(100), IN `in_state_of_origin1` VARCHAR(100), IN `in_address` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_examination_number1` VARCHAR(100), IN `in_name1` VARCHAR(100), IN `in_mother_name` VARCHAR(100), IN `in_state_of_origin3` VARCHAR(100), IN `in_state_of_origin2` VARCHAR(100), IN `in_home_address1` VARCHAR(100), IN `in_office_marker_address` VARCHAR(100), IN `in_telephone_address` VARCHAR(100), IN `in_other_score` INT(10), IN `in_venue1` VARCHAR(100), IN `in_image` TEXT, IN `in_mathematics` INT(11), IN `in_english` INT(11), IN `in_others` VARCHAR(100), IN `in_admission_no` VARCHAR(100), IN `in_last_school_atterded` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_date_of_birth1` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_occapation` VARCHAR(100), IN `in_blood_group` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_admission_date` DATE, IN `in_roll_number` INT(100), IN `in_status` VARCHAR(100), IN `in_section` VARCHAR(100), IN `in_house` VARCHAR(100), IN `in_category` VARCHAR(100), IN `in_primary_contact_number` VARCHAR(100), IN `in_caste` VARCHAR(100), IN `in_mother_tongue` VARCHAR(100), IN `in_language_known` VARCHAR(100), IN `in_application_no` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_current_class` VARCHAR(100), IN `in_medical_condition` VARCHAR(100), IN `in_upload_transfer_certificate` VARCHAR(100), IN `in_school_id` INT(6))
BEGIN 
	DECLARE admin_no int;
    DECLARE last_no int;
    DECLARE max_no int;
    SELECT no_of_student into last_no from class_management WHERE class_name = in_current_class;
     SELECT max_population into max_no from class_management WHERE class_name = in_current_class;
     
    IF query_type="create" THEN
    SELECT serial_no + 1 INTO admin_no FROM `admission_number_generator`  WHERE school=in_school AND class_type = in_class_type AND admission_year = in_admission_year;
    
    INSERT INTO `school_applicants`(type_of_application, name_of_applicant, home_address, date_of_birth, sex, religion, tribe, school_attended, class1, state_of_origin, l_g_a, nationality, time, venue, common_entrance, placement, examination_date, date, first_name, examination_number, father_name, state_of_origin1, address, school, examination_number1, name1, mother_name, state_of_origin3, state_of_origin2, home_address1, office_marker_address, telephone_address, other_score, venue1, image, mathematics, english, others, admission_no, last_school_atterded, special_health_needs, date_of_birth1, father_place_of_work, father_occapation, blood_group, academic_year, admission_date, roll_number, status, section, house, category, primary_contact_number, caste, mother_tongue, language_known, application_no, current_class, upload, medical_condition, upload_transfer_certificate,school_id
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
    SELECT * FROM `school_applicants`;
    
    ELSEIF query_type='select_admission_no' THEN 
    SELECT * FROM `school_applicants` WHERE admission_no != '' AND admission_no 	IS NOT null; 
    
      ELSEIF query_type='select_id' THEN
    SELECT * FROM `school_applicants` WHERE id=in_id;   
    
       ELSEIF query_type='select_application_no' THEN
    SELECT * FROM `school_applicants` WHERE application_no=in_application_no;
    
    
          ELSEIF query_type='by_admin_no' THEN
    SELECT * FROM `school_applicants` WHERE application_no=in_id;
      ELSEIF query_type = 'update-score' THEN
    UPDATE school_applicants
    SET
    mathematics=in_mathematics,
    english = in_english,
    other_score = in_other_score,
    admission_no = in_admission_no,
    current_class = in_current_class,
    status= in_status 
    WHERE id=in_id;
  
  ELSEIF query_type = 'update' THEN
    UPDATE school_applicants
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
    UPDATE school_applicants SET current_class = in_current_class,
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
    school_applicants AS a
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `school_revenues`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First term','Second term','Third term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive'), IN `in_account_type` VARCHAR(100), IN `in_school_id` VARCHAR(20), IN `in_branch_id` VARCHAR(20))
BEGIN
    -- Handle 'create' operation
    IF query_type = "create" THEN
        INSERT INTO `school_revenues`(
            `description`, `amount`, `term`, `section`, `class_name`, 
            `revenue_type`, `account_type`, `is_optional`, `status`, `branch_id`, `school_id`
        ) 
        VALUES (
            in_description, in_amount, in_term, in_section, in_class_name, 
            in_revenue_type, in_account_type, in_is_optional, in_status, in_branch_id, in_school_id
        );

    -- Handle 'update' operation
    ELSEIF query_type = "update" THEN
        UPDATE `school_revenues`
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
            `branch_id` = COALESCE(in_branch_id, `branch_id`),
            `school_id` = COALESCE(in_school_id, `school_id`)
        WHERE `code` = in_id; 

    -- Handle 'select-all' operation
    ELSEIF query_type = "select-all" THEN
        SELECT * FROM school_revenues 
        WHERE school_id = in_school_id 
            AND (in_branch_id IS NULL OR in_branch_id = '' OR branch_id = in_branch_id);

    -- Handle 'select' operation with dynamic filtering
    ELSEIF query_type = "select" THEN
        SET @query = 'SELECT * FROM school_revenues';
        
        -- Mandatory condition for school_id
        SET @where_clause = CONCAT('school_id = "', in_school_id, '"');

        -- Filter by section (if provided)
        IF in_section IS NOT NULL AND in_section != '' THEN 
            SET @where_clause = CONCAT(@where_clause, ' AND section = "', in_section, '"');
        END IF;

        -- Filter by class name, including 'All Classes' (if provided)
        IF in_class_name IS NOT NULL AND in_class_name != '' THEN
            SET @where_clause = CONCAT(@where_clause, ' AND (class_name = "', in_class_name, '" OR class_name = "All Classes")');
        END IF;

        -- Filter by term, including specific term and "Each Term" (if provided)
        IF in_term IS NOT NULL AND in_term != '' THEN
            SET @where_clause = CONCAT(@where_clause, ' AND (term = "', in_term, '" OR term = "Each Term")');
        END IF;

        -- Optional filter by branch_id
        IF in_branch_id IS NOT NULL AND in_branch_id != '' THEN
            SET @where_clause = CONCAT(@where_clause, ' AND branch_id = "', in_branch_id, '"');
        END IF;

        -- Combine query and WHERE clause
        SET @query = CONCAT(@query, ' WHERE ', @where_clause);

        -- Execute the dynamic query
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

    -- Handle 'select-revenues' operation
    ELSEIF query_type = "select-revenues" THEN
        SELECT * FROM school_revenues 
        WHERE school_id = in_school_id
            AND class_name IN ('All Classes', in_class_name)
            AND (section = in_section OR in_section IS NULL)
            AND term IN (in_term, 'Each Term')
            AND (in_branch_id IS NULL OR in_branch_id = '' OR branch_id = in_branch_id);
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `school_setup`(IN `query_type` VARCHAR(20), IN `p_sch_id` VARCHAR(10), IN `p_school_name` VARCHAR(500), IN `p_short_name` VARCHAR(10), IN `p_academic_year` VARCHAR(20), IN `p_session_start_date` DATE, IN `p_session_end_date` DATE, IN `p_status` VARCHAR(20), IN `p_badge_url` VARCHAR(500), IN `p_mission` VARCHAR(500), IN `p_vission` VARCHAR(500), IN `p_about_us` VARCHAR(500), IN `p_school_motto` VARCHAR(300), IN `p_state` VARCHAR(100), IN `p_lga` VARCHAR(100), IN `p_address` VARCHAR(255), IN `p_primary_contact_number` VARCHAR(13), IN `p_secondary_contact_number` VARCHAR(13), IN `p_email` VARCHAR(70), IN `p_school_master` TINYINT(1), IN `p_express_finance` TINYINT(1), IN `p_cbt_center` TINYINT(1), IN `p_result_station` TINYINT(1), IN `p_nursery` TINYINT(1), IN `p_primary` TINYINT(1), IN `p_junior_secondary` TINYINT(1), IN `p_senior_secondary` TINYINT(1), IN `p_islamiyya` TINYINT(1), IN `p_tahfiz` TINYINT(1), IN `p_admin_name` VARCHAR(50), IN `p_admin_email` VARCHAR(50), IN `p_admin_password` VARCHAR(100), IN `p_domain` VARCHAR(100))
BEGIN
DECLARE in_sch_id VARCHAR(20);
DECLARE current_id INT(8);
DECLARE in_prefix VARCHAR(5);


-- Lock the row to prevent concurrent reads
SELECT MAX(code) + 1 INTO @current_id FROM number_generator WHERE description = 'school_code' FOR UPDATE;

SELECT prefix INTO @in_prefix FROM number_generator WHERE description = 'school_code';

SET @in_sch_id = CONCAT(@in_prefix, '/', @current_id); 

    IF query_type = 'CREATE' THEN

		INSERT INTO `admission_number_generator`(`school_short_name`, `branch`, `code`, `school_id`)
        VALUE(p_short_name, p_address, 0, @in_sch_id );
        
        INSERT INTO `school_locations`(`school_id`, `branch_name`,`location`, `short_name`, `status`) 
		VALUES(@in_sch_id, 'Main Branch',  p_address, p_short_name, 'Active' );
        -- Generate the school URL
        SET @p_school_url = CONCAT(p_domain, '/', p_short_name, '/', @in_sch_id);

        -- Insert into school_setup table
        INSERT INTO `school_setup`(
            `school_id`, `school_name`, `short_name`, `school_motto`, `state`, `lga`, `address`, 
            `primary_contact_number`, `secondary_contact_number`, `email`, 
            `school_master`, `express_finance`, `cbt_center`, `result_station`, 
            `academic_year`, `session_start_date`, `session_end_date`, `status`, 
            `badge_url`, `mission`, `vission`, `about_us`, `nursery_section`, 
            `primary_section`, `junior_secondary_section`, `senior_secondary_section`, 
            `islamiyya`, `tahfiz`, `school_url`
        ) VALUES (
            @in_sch_id , p_school_name, p_short_name, p_school_motto, p_state, p_lga, p_address, 
            p_primary_contact_number, p_secondary_contact_number, p_email, 
            p_school_master, p_express_finance, p_cbt_center, p_result_station, 
            p_academic_year, p_session_start_date, p_session_end_date, p_status, 
            p_badge_url, p_mission, p_vission, p_about_us, p_nursery, p_primary, 
            p_junior_secondary, p_senior_secondary, p_islamiyya, p_tahfiz, @p_school_url
        );
		-- Update the `code` field
		UPDATE number_generator SET `code` = @current_id WHERE description = 'school_code';

        -- Insert into users table for the admin
        INSERT INTO `users` (
            `name`, `email`, `username`, `role`, `password`, `school_id`
        ) VALUES (
            p_admin_name, p_admin_email, p_short_name, 'Admin', p_admin_password, @in_sch_id
        );

        -- Return the newly created school ID
        SELECT @in_sch_id AS school_id; 

    ELSEIF query_type = 'select' THEN
        -- Select all schools
        SELECT * FROM school_setup ORDER BY school_id ASC;
    ELSEIF query_type = 'select-school' THEN
        -- Select a specific school by ID
        SELECT * FROM school_setup WHERE school_id = p_sch_id;

    ELSEIF query_type = 'get_school_url' THEN
        -- Select the school URL by ID
        SELECT school_url FROM school_setup WHERE school_id = p_sch_id;

    ELSEIF query_type = 'update' THEN
        -- Update school status
        UPDATE school_setup
        SET status = p_status
        WHERE school_id = p_sch_id;
        
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
    WHERE school_id = p_sch_id; 

    ELSEIF query_type = 'DELETE' THEN
        -- Delete a school
        DELETE FROM school_setup WHERE school_id = p_sch_id;

    ELSE
        -- Invalid query_type
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type';
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `score_grades`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_grade` INT(50), IN `in_remark` INT(14), IN `in_min_score` INT(3), IN `in_max_score` INT(3), IN `in_status` INT(3))
BEGIN 
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sections`(IN `in_query_type` VARCHAR(20), IN `in_school_id` VARCHAR(100), IN `in_section_id` VARCHAR(100), IN `in_section_name` VARCHAR(100), IN `in_address` VARCHAR(100), IN `in_short_name` VARCHAR(10))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `studentAggregator`(IN `class_input` VARCHAR(50))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `student_assignments`(IN `query_type` VARCHAR(50), IN `in_admission_no` VARCHAR(8))
BEGIN
IF query_type ='get-result' THEN
SELECT * FROM student_grading WHERE admission_no = in_admission_no; 
END IF;

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `student_grading`(IN `query_type` ENUM('create','select','delete'), IN `in_id` INT, IN `in_calendar_id` VARCHAR(20), IN `in_admission_no` VARCHAR(100), IN `in_student_name` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_academic_year` VARCHAR(20), IN `in_term` VARCHAR(20), IN `in_ca1Score` DOUBLE(5,2), IN `in_ca2Score` DOUBLE(5,2), IN `in_examScore` DOUBLE(5,2), IN `in_mark_by` VARCHAR(100), IN `in_status` VARCHAR(50), IN `in_school_id` VARCHAR(20))
BEGIN
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
              AND subject = in_subject AND school_id = in_school_id;
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
                status,
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
                in_status,
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
          AND (term = in_term OR in_term IS NULL)
          AND school_id = in_school_id;

    -- DELETE operation
    ELSEIF query_type = 'delete' THEN
        DELETE FROM student_grading
        WHERE admission_no = in_admission_no
          AND subject = in_subject AND school_id = in_school_id;
    END IF;

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `student_parents`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(100), IN `in_name` VARCHAR(100), IN `in_phone_no` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_relationship` VARCHAR(100), IN `in_is_guardian` VARCHAR(100), IN `in_occupation` VARCHAR(100), IN `in_children_admin_no` VARCHAR(50), IN `in_school_id` INT(11))
BEGIN 
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `student_result`(IN `query_type` VARCHAR(50), IN `in_admission_no` VARCHAR(30))
BEGIN
IF query_type ='get-result' THEN
    SELECT a.*, (SELECT b.exam_name FROM exam_calendar b where a.calendar_id = b.id) as exam_name FROM student_grading a  WHERE admission_no = in_admission_no; 
END IF;


END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `students_applications`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(100), IN `in_upload` VARCHAR(300), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_religion` VARCHAR(100), IN `in_tribe` VARCHAR(100), IN `in_school_attended` VARCHAR(100), IN `in_last_class` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_examination_date` DATE, IN `in_address` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_mathematics` INT(11), IN `in_english` INT(11), IN `in_others` VARCHAR(100), IN `in_other_score` INT(11), IN `in_admission_no` VARCHAR(100), IN `in_last_school_atterded` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_occapation` VARCHAR(100), IN `in_blood_group` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_admission_date` DATE, IN `in_status` VARCHAR(100), IN `in_mother_tongue` VARCHAR(100), IN `in_language_known` VARCHAR(100), IN `in_application_no` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_current_class` VARCHAR(100), IN `in_medical_condition` VARCHAR(100), IN `in_upload_transfer_certificate` VARCHAR(100), IN `in_school_id` INT(11))
BEGIN 
	DECLARE admin_no int;
    DECLARE last_no int;
    DECLARE max_no int;
    SELECT no_of_student into last_no from class_management WHERE class_name = in_current_class;
    SELECT max_population into max_no from class_management WHERE class_name = in_current_class;
     
    IF query_type="create" THEN
    SELECT serial_no + 1 INTO admin_no FROM `admission_number_generator`  WHERE school=in_school AND class_type = in_class_type AND admission_year = in_admission_year;
    
    INSERT INTO `school_applicants`(type_of_application,
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
    SELECT * FROM `school_applicants`;
    
    ELSEIF query_type='select_admission_no' THEN 
    SELECT * FROM `school_applicants` WHERE admission_no != '' AND admission_no 	IS NOT null; 
    
      ELSEIF query_type='select_id' THEN
    SELECT * FROM `school_applicants` WHERE id=in_id;
          ELSEIF query_type='by_admin_no' THEN
    SELECT * FROM `school_applicants` WHERE application_no=in_id;
    ELSEIF query_type = 'update' THEN
    UPDATE school_applicants
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
    UPDATE school_applicants SET current_class = in_current_class,
   	status= in_status WHERE id=in_id;
    	END IF;
        ELSEIF query_type="select_user" THEN
SELECT 
    a.admission_no, 
    a.current_class, 
    a.name_of_applicant, 
    c.subject_name 
FROM 
    school_applicants AS a
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `students_attendances`(IN `query_type` VARCHAR(50), IN `_id` INT, IN `_teacher_id` VARCHAR(50), IN `_student_id` VARCHAR(50), IN `_teacher_name` VARCHAR(50), IN `_section` VARCHAR(50), IN `_class_name` VARCHAR(50), IN `_day` VARCHAR(50), IN `_status` VARCHAR(50), IN `_student_name` VARCHAR(50), IN `_admission_no` VARCHAR(50), IN `_term` VARCHAR(50), IN `_academic_year` VARCHAR(50), IN `_start_date` DATE, IN `_end_date` DATE, IN `_notes` VARCHAR(200), IN `_school_id` VARCHAR(50), IN `_branch_id` VARCHAR(20))
BEGIN
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
            notes,
            academic_year,
            school_id,
            branch_id
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
            _notes,
            _academic_year,
            _school_id,
            _branch_id
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
            AND school_id = _school_id
            AND (_branch_id IS NULL OR _branch_id = '' OR branch_id = _branch_id)
            AND DATE(created_at) BETWEEN DATE(_start_date) AND DATE(_end_date)
        ORDER BY 
            admission_no, student_name, created_at;
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `students_queries`(
    IN `query_type` VARCHAR(30), 
    IN `p_id` INT, 
    IN `p_parent_id` VARCHAR(20), 
    IN `p_guardian_id` VARCHAR(20), 
    IN `p_student_name` VARCHAR(255), 
    IN `p_home_address` TEXT, 
    IN `p_date_of_birth` DATE, 
    IN `p_sex` VARCHAR(10), 
    IN `p_religion` VARCHAR(50), 
    IN `p_tribe` VARCHAR(50), 
    IN `p_state_of_origin` VARCHAR(100), 
    IN `p_l_g_a` VARCHAR(100), 
    IN `p_nationality` VARCHAR(100), 
    IN `p_last_school_atterded` VARCHAR(100), 
    IN `p_special_health_needs` VARCHAR(100), 
    IN `p_blood_group` VARCHAR(100), 
    IN `p_admission_no` VARCHAR(50), 
    IN `p_admission_date` DATE, 
    IN `p_academic_year` VARCHAR(20), 
    IN `p_status` VARCHAR(100), 
    IN `p_section` VARCHAR(100), 
    IN `p_mother_tongue` VARCHAR(100), 
    IN `p_language_known` VARCHAR(100), 
    IN `p_current_class` VARCHAR(50), 
    IN `p_profile_picture` VARCHAR(300), 
    IN `p_medical_condition` VARCHAR(300), 
    IN `p_transfer_certificate` VARCHAR(500), 
    IN `p_school_location` VARCHAR(300), 
    IN `in_school_id` VARCHAR(20)
)
BEGIN
    DECLARE new_student_id INT;
    DECLARE generated_admNo VARCHAR(20);
    IF query_type = 'CREATE' THEN

        -- Insert student without admission_no
        INSERT INTO students (
            parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
            l_g_a, nationality, last_school_atterded, special_health_needs, blood_group, admission_no, 
            academic_year, status, section, mother_tongue, language_known, current_class, profile_picture, 
            medical_condition, transfer_certificate, branch_id, school_id
        )
        VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
            p_l_g_a, p_nationality, p_last_school_atterded, p_special_health_needs, p_blood_group, CONCAT('TMP-', UNIX_TIMESTAMP(), '-', in_school_id), 
            p_academic_year, 'Fresh Student', p_section, p_mother_tongue, p_language_known, p_current_class, p_profile_picture,
            p_medical_condition, p_transfer_certificate, p_school_location, in_school_id
        );

        -- Get last inserted student id
        SET new_student_id = LAST_INSERT_ID();

        -- Call admission_generator to set admission_no
        CALL admission_generator(new_student_id, in_school_id, p_school_location);

        -- Return student record
        SELECT * FROM students WHERE id = new_student_id;

    ELSEIF query_type = 'returning_student' THEN

        INSERT INTO students (
            parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
            l_g_a, nationality, last_school_atterded, special_health_needs, blood_group, admission_no, 
            academic_year, status, section, mother_tongue, language_known, current_class, profile_picture, 
            medical_condition, transfer_certificate, branch_id, school_id
        )
        VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
            p_l_g_a, p_nationality, p_last_school_atterded, p_special_health_needs, p_blood_group,  CONCAT('TMP-', UNIX_TIMESTAMP(), '-', in_school_id), 
            p_academic_year, 'Returning Student', p_section, p_mother_tongue, p_language_known, p_current_class, p_profile_picture,
            p_medical_condition, p_transfer_certificate, p_school_location, in_school_id
        );

        SET new_student_id = LAST_INSERT_ID();

        CALL admission_generator(new_student_id, in_school_id, p_school_location);

        SELECT admission_no FROM students WHERE id = new_student_id;
  ELSEIF query_type = 'select-class' THEN
            SELECT * 
            FROM students 
            WHERE current_class = p_current_class 
            AND school_id = in_school_id 
            AND (p_school_location IS NULL OR p_school_location = '' OR branch_id = p_school_location);

    ELSEIF query_type = 'class-grading' THEN
        CALL studentAggregator(p_current_class);

    ELSEIF query_type = 'SELECT' THEN
        SELECT * FROM students WHERE admission_no = p_admission_no;

    ELSEIF query_type = 'select-all' THEN
        SELECT *, c.class_name FROM students s JOIN classes c ON s.current_class = c.class_code 
        WHERE s.school_id = in_school_id
           AND (p_school_location IS NULL OR p_school_location = '' OR s.branch_id = p_school_location);

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
            status = COALESCE(p_status, status),
            section = COALESCE(p_section, section),
            mother_tongue = COALESCE(p_mother_tongue, mother_tongue),
            language_known = COALESCE(p_language_known, language_known),
            current_class = COALESCE(p_current_class, current_class),
            profile_picture = COALESCE(p_profile_picture, profile_picture),
            medical_condition = COALESCE(p_medical_condition, medical_condition),
            school_location = COALESCE(p_school_location, school_location)
        WHERE id = p_id;
        
        SELECT * FROM students WHERE id = p_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students WHERE id = p_id;
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `subject_management`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_select_class` VARCHAR(100), IN `in_subject_name` VARCHAR(100), IN `in_c_a_pass_mark` INT(100), IN `in_exam_pass_mark` INT(100), IN `in_other_description` VARCHAR(100), IN `in_assignment_pass_mark` INT(100))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `subjects`(IN `query_type` VARCHAR(50), IN `in_id` VARCHAR(10), IN `in_subject` VARCHAR(50), IN `in_section` VARCHAR(50), IN `in_status` ENUM('Active','Inactive'), IN `in_school_id` VARCHAR(20), IN `in_class_code` VARCHAR(50))
BEGIN
DECLARE last_code int;
DECLARE subject_code varchar(100);


IF query_type='create' THEN
 START TRANSACTION;

SELECT MAX(code) + 1 INTO @last_code FROM number_generator WHERE prefix = "sub" FOR UPDATE;

SET @subject_code = CONCAT(UPPER(SUBSTRING(in_subject, 1, 3)), LPAD(@last_code, 4, '0'));

UPDATE number_generator SET code = @last_code WHERE prefix = "sub";

INSERT INTO subjects(`subject`, `section`, `status`, `subject_code`, `school_id`, `class_code`)
VALUES (in_subject, in_section, in_status, @subject_code, in_school_id, in_class_code);

COMMIT;
    
ELSEIF query_type='select-all' THEN
	SELECT s.*,c.class_name FROM `subjects` s JOIN classes c ON s.class_code = c.class_code WHERE s.school_id = in_school_id;
ELSEIF query_type='select-section-subjects' THEN
    SELECT * FROM `subjects` where class_code = in_class_code AND status = "Active" AND school_id = in_school_id ORDER BY `subjects`.`subject_code` 
    ASC;
END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `syllabus`(IN `query_type` VARCHAR(50), IN `p_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_code` VARCHAR(100), IN `p_term` VARCHAR(50), IN `p_week` TINYINT, IN `p_title` VARCHAR(300), IN `p_content` TEXT, IN `p_status` VARCHAR(30))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `syllabusTracker`(IN `op_type` VARCHAR(10), IN `p_id` INT, IN `p_syllabu_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_level` INT, IN `p_term` VARCHAR(50), IN `p_academic_year` YEAR, IN `p_week` TINYINT, IN `p_status` ENUM('Pending','Ongoing','Onhold','Completed'))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `taskTodos`(IN `op_type` VARCHAR(100), IN `p_id` VARCHAR(100), IN `p_user_id` INT(11), IN `p_title` VARCHAR(200), IN `p_class_name` VARCHAR(60), IN `p_event_category` ENUM('Lesson','E-Class','Homework','Training','Holidays'), IN `p_due_date` DATE, IN `p_content` LONGTEXT, IN `p_created_by` VARCHAR(50), IN `p_priority` ENUM('High','Medium','Low'), IN `p_status` VARCHAR(50), IN `p_limit` INT(11), IN `p_offset` INT(11))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `teacher_classes`(IN `query_type` VARCHAR(50), IN `in_id` INT(11), IN `in_teacher_id` INT(11), IN `in_subject` VARCHAR(50), IN `in_section` VARCHAR(50), IN `in_class_name` VARCHAR(50), IN `in_class_code` VARCHAR(50), IN `in_class_level` INT(100), IN `in_school_id` VARCHAR(20))
BEGIN
    DECLARE x_class_code VARCHAR(30);
    DECLARE x_class_level INT;

    IF query_type = 'create' THEN
        SELECT class_code, level 
        INTO x_class_code, x_class_level 
        FROM classes 
        WHERE class_name = in_class_name 
        LIMIT 1;
        INSERT INTO teacher_classes (teacher_id, subject, section, class_name, class_level, class_code,school_id) 
        VALUES (in_teacher_id, in_subject, in_section, in_class_name, x_class_level, x_class_code, in_school_id);

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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `teachers`(IN `query_type` VARCHAR(100), IN `p_id` INT(10), IN `p_name` VARCHAR(255), IN `p_sex` VARCHAR(10), IN `p_age` INT, IN `p_address` TEXT, IN `p_date_of_birth` DATE, IN `p_marital_status` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_mobile_no` VARCHAR(20), IN `p_email` VARCHAR(100), IN `p_qualification` VARCHAR(255), IN `p_working_experience` TEXT, IN `p_religion` VARCHAR(50), IN `p_last_place_of_work` VARCHAR(255), IN `p_do_you_have` TEXT, IN `p_when_do` DATE, IN `p_account_name` VARCHAR(255), IN `p_account_number` VARCHAR(50), IN `p_bank` VARCHAR(100), IN `p_school_location` VARCHAR(100), IN `p_school_id` VARCHAR(20))
BEGIN
    DECLARE _teacher_id INTEGER;
    DECLARE _user_id INTEGER;

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
            branch_id,
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
        (name, email, phone_no, password, role, school_id)
        VALUES(p_name, p_email, p_mobile_no, '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 'Teacher', p_school_id);
        
        SET _user_id = LAST_INSERT_ID();
        UPDATE teachers SET user_id = _user_id WHERE id = _teacher_id;
        
        
        SELECT _teacher_id AS teacher_id;
     ELSEIF query_type = 'select-class' THEN
     	
        SELECT * FROM teacher_classes WHERE teacher_id = p_id;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM teachers WHERE id = p_id;
    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teachers WHERE school_id = p_school_id
        AND (p_school_location IS NULL OR p_school_location = '' OR branch_id = p_school_location);
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
            branch_id = p_school_location
        WHERE id = p_id;
        SELECT id AS teacher_id FROM teachers WHERE id = p_id;
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `time_table`(IN `in_id` INT(10), IN `query_type` VARCHAR(50), IN `in_class_name` VARCHAR(100), IN `in_start_time` VARCHAR(100), IN `in_end_time` VARCHAR(100), IN `in_subject_name` VARCHAR(100))
BEGIN
IF query_type = "create" THEN 
INSERT INTO `time_table` (id, class_name, start_time, end_time, subject_name)
VALUES (in_id, in_class_name, in_start_time, in_end_time, in_subject_name);

ELSEIF query_type='select' THEN
SELECT * FROM `time_table`;

END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `trainees_crud`(IN `query_type` VARCHAR(10), IN `p_id` INT, IN `p_firstname` VARCHAR(255), IN `p_lastname` VARCHAR(255), IN `p_phone` VARCHAR(20), IN `p_email` VARCHAR(255), IN `p_state` VARCHAR(255), IN `p_lga` VARCHAR(255), IN `p_address` TEXT, IN `p_department` VARCHAR(255), IN `p_program_type` VARCHAR(100), IN `p_dob` DATE, IN `p_gender` ENUM('Male','Female','Other'), IN `p_payment_status` ENUM('Paid','Unpaid','Pending'))
BEGIN
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
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `update_student_scores`(IN `p_applicant_id` VARCHAR(50), IN `p_mathematics` VARCHAR(5), IN `p_english` VARCHAR(5), IN `p_other_score` VARCHAR(5), IN `p_status` VARCHAR(20), IN `p_branch` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `query_type` VARCHAR(20))
BEGIN
    IF query_type = 'Pass' THEN
    CALL admission_generator(p_applicant_id, p_school_id, p_branch);
    UPDATE school_applicants
    SET 
        mathematics = p_mathematics,
        english = p_english,
        other_score = p_other_score,
        status = p_status
    WHERE applicant_id = p_applicant_id;

    -- Check if the update was successful
    SELECT ROW_COUNT() AS affected_rows;
    
    
    ELSEIF query_type = 'Assigned' THEN 
     UPDATE school_applicants
    SET 
        mathematics = p_mathematics,
        english = p_english,
        other_score = p_other_score,
        status = p_status
    WHERE applicant_id = p_applicant_id;
    
    END IF;
    
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `update_transaction_status`(IN `p_transaction_id` INT(100), IN `p_payment_status` ENUM('Pending','Paid','Failed'), IN `p_document_status` ENUM('Printed','Saved'), IN `p_print_count` INT(2), IN `p_print_by` VARCHAR(100))
BEGIN
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
DELIMITER ;
