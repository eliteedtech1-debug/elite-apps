
DROP FUNCTION IF EXISTS get_average_depreciation_rate;

DELIMITER $$
CREATE FUNCTION `get_average_depreciation_rate`() RETURNS decimal(5,2)
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE avg_rate DECIMAL(5,2);
    
    SELECT ROUND(AVG(depreciation_rate), 2) INTO avg_rate
    FROM asset_categories 
    WHERE depreciation_rate IS NOT NULL 
    AND depreciation_rate > 0
    ORDER BY created_at DESC 
    LIMIT 10;
    
    IF avg_rate IS NULL THEN
        SET avg_rate = 15.00;
    END IF;
    
    RETURN avg_rate;
END$$
DELIMITER ;

DROP FUNCTION IF EXISTS INITCAP;

DELIMITER $$
CREATE FUNCTION `INITCAP`(`input_string` VARCHAR(255)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
    DETERMINISTIC
BEGIN
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

DROP FUNCTION IF EXISTS JSON_ARRAYAGG;

DELIMITER $$
CREATE FUNCTION `JSON_ARRAYAGG`(`col` TEXT) RETURNS text CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
    DETERMINISTIC
BEGIN
  RETURN CONCAT('[', GROUP_CONCAT(QUOTE(col)), ']');
END$$

DROP PROCEDURE IF EXISTS academic_year $$
CREATE PROCEDURE `academic_year`(IN `in_query_type` VARCHAR(20), IN `in_id` VARCHAR(50), IN `in_term` VARCHAR(50), IN `in_year` VARCHAR(50), IN `in_begin_date` VARCHAR(50), IN `in_end_date` VARCHAR(50), IN `in_status` VARCHAR(20), IN `in_total_weeks` INT(14), IN `in_branch_id` VARCHAR(30), IN `in_school_id` VARCHAR(30))
BEGIN
  DECLARE v_begin DATE;
  DECLARE v_end DATE;

  -- Convert input strings to dates
  SET v_begin = DATE(in_begin_date);
  SET v_end = DATE(in_end_date);

  IF in_query_type = 'create' THEN

    INSERT INTO `academic_calendar` (
      `academic_year`, `term`, `begin_date`, `end_date`, `status`, `total_weeks`, `school_id`, `branch_id`
    ) VALUES (
      in_year, in_term, v_begin, v_end, 'Inactive', in_total_weeks, in_school_id, in_branch_id
    )
    ON DUPLICATE KEY UPDATE
      `begin_date` = VALUES(`begin_date`),
      `end_date` = VALUES(`end_date`),
      `total_weeks` = VALUES(`total_weeks`);

    CALL generate_academic_weeks(in_year, in_term, v_begin, v_end, in_branch_id, in_school_id);

  ELSEIF in_query_type = 'select' THEN

    SELECT * FROM academic_calendar WHERE branch_id = in_branch_id;

  ELSEIF in_query_type = 'selectByid' THEN

    SELECT * FROM academic_calendar WHERE branch_id = in_branch_id;

  ELSEIF in_query_type = 'update-status' THEN

    IF in_status = 'Active' THEN
      UPDATE academic_calendar SET status = 'Inactive' WHERE branch_id = in_branch_id;
    END IF;

    UPDATE academic_calendar SET status = in_status WHERE id = in_id;

  ELSEIF in_query_type = 'delete' THEN

    DELETE FROM academic_calendar 
    WHERE academic_year = in_year AND term = in_term;

    DELETE FROM academic_weeks 
    WHERE academic_year = in_year AND term = in_term;

  ELSEIF in_query_type = 'update' THEN

    UPDATE `academic_calendar`
    SET 
      `academic_year` = in_year,
      `term` = in_term,
      `begin_date` = v_begin,
      `end_date` = v_end,
      `total_weeks` = in_total_weeks
    WHERE id = in_id;

    CALL generate_academic_weeks(in_year, in_term, v_begin, v_end, in_branch_id, in_school_id);

  END IF;
END $$

DROP PROCEDURE IF EXISTS account_chart $$
CREATE PROCEDURE `account_chart`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First term','Second term','Third term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive'), IN `in_account_type` VARCHAR(100), IN `in_school_id` VARCHAR(11))
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
END $$

DROP PROCEDURE IF EXISTS admission_form $$
CREATE PROCEDURE `admission_form`(IN `in_id` INT(10), IN `query_type` VARCHAR(100), IN `in_pupils_name` VARCHAR(100), IN `in_pupils_last_name` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_religion` INT(100), IN `in_health_needs` VARCHAR(100), IN `in_medical_report` VARCHAR(100), IN `in_last_school` VARCHAR(100), IN `in_last_class` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_town_lga` VARCHAR(100), IN `in_father_name` VARCHAR(100), IN `in_father_occupation` VARCHAR(100), IN `in_father_contact_address` VARCHAR(100), IN `in_father_postal_address` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_telephone` INT(100), IN `in_father_email` VARCHAR(100), IN `in_mother_name` VARCHAR(100), IN `in_mother_occupation` VARCHAR(100), IN `in_mother_address` VARCHAR(100), IN `in_mother_place_of_work` VARCHAR(100), IN `in_mother_telephone` VARCHAR(100), IN `in_mother_email` VARCHAR(100), IN `in_next_of_kin` VARCHAR(100), IN `in_next_of_kin_occupation` VARCHAR(100), IN `in_next_of_kin_contact_address` VARCHAR(100), IN `in_next_of_kin_email` VARCHAR(100), IN `in_next_of_kin_tel` INT(100), IN `in_student_signature` VARCHAR(100), IN `in_sponsor_signature` VARCHAR(100), IN `in_date_from` DATE, IN `in_date_to` DATE)
BEGIN 
    IF query_type="create" THEN 
    INSERT INTO `admission_form`(id, pupils_name, pupils_last_name,date_of_birth, religion, health_needs, medical_report, last_school, last_class, nationality, state_of_origin, town_lga, father_name, father_occupation, father_contact_address, father_postal_address, father_place_of_work, father_telephone, father_email, mother_name, mother_occupation, mother_address, mother_place_of_work, mother_telephone, mother_email, next_of_kin, next_of_kin_occupation, next_of_kin_contact_address, next_of_kin_email, next_of_kin_tel, student_signature, sponsor_signature, date_from, date_to
    ) VALUES (
    in_id,in_pupils_name,in_pupils_last_name,in_date_of_birth,in_religion,in_health_needs,in_medical_report,in_last_school,in_last_class,in_nationality,in_state_of_origin,in_town_lga,in_father_name,in_father_occupation,in_father_contact_address,in_father_postal_address,in_father_place_of_work,in_father_telephone,in_father_email,in_mother_name,in_mother_occupation,in_mother_address,in_mother_place_of_work,in_mother_telephone,in_mother_email,in_next_of_kin,in_next_of_kin_occupation,in_next_of_kin_contact_address,in_next_of_kin_email,in_next_of_kin_tel,in_student_signature,in_sponsor_signature,in_date_from,in_date_to
    );

    ELSEIF query_type='select' THEN
    SELECT * FROM `admission_form`;
    END IF;
    END $$
    
DROP PROCEDURE IF EXISTS admission_generator $$
CREATE PROCEDURE `admission_generator`(IN `stud_id` INT, IN `sch_id` VARCHAR(30), IN `branch_index` VARCHAR(30))
BEGIN
    DECLARE in_code INT;
    DECLARE in_short_name VARCHAR(30);

    -- Get the current code and short_name for the given school and branch
    SELECT code, short_name 
      INTO in_code, in_short_name
      FROM school_locations
     WHERE school_id = sch_id
       AND branch_id = branch_id_param
     LIMIT 1;

    -- Update student's admission number
    UPDATE students
       SET admission_no = CONCAT(in_short_name, '/', branch_index, '/', LPAD(in_code + 1, 4, '0'))
     WHERE id = stud_id;

    -- Increment the code for the branch in school_locations
    UPDATE school_locations
       SET code = in_code + 1
     WHERE school_id = sch_id
       AND branch_id = branch_id_param;
END $$

DROP PROCEDURE IF EXISTS admission_no_generator $$
CREATE PROCEDURE `admission_no_generator`(IN `app_id` VARCHAR(30), IN `sch_id` VARCHAR(30), IN `branch` VARCHAR(30))
BEGIN
    DECLARE in_code INT;
    DECLARE in_short_name VARCHAR(30);
    DECLARE branch_position INT;

    -- Get the current code and short name for the given school and branch
    SELECT code, short_name 
    INTO in_code, in_short_name 
    FROM school_locations 
    WHERE school_id = sch_id 
    AND branch_name = branch;

    -- Get branch position (Modify based on actual schema)
    SELECT ROW_NUMBER() OVER (ORDER BY branch_name) INTO branch_position
    FROM school_locations 
    WHERE school_id = sch_id 
    AND branch_name = branch;

    -- Update admission number in the student's record
    UPDATE school_applicants 
    SET admission_no = CONCAT(in_short_name, '/', branch_position, '/', LPAD(in_code + 1, 4, '0'))
    WHERE applicant_id = app_id;

    -- Increment the code for the branch in school_locations
    UPDATE school_locations 
    SET code = in_code + 1 
    WHERE school_id = sch_id 
    AND branch_name = branch;
END $$

DROP PROCEDURE IF EXISTS admission_number_generator $$
CREATE PROCEDURE `admission_number_generator`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_serial_no` VARCHAR(100), IN `in_type_of_school` VARCHAR(100))
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
END $$

DROP PROCEDURE IF EXISTS application $$
CREATE PROCEDURE `application`(IN `query_type` VARCHAR(100), IN `in_upload` VARCHAR(100), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_guardian_name` VARCHAR(100), IN `in_guardian_phone` VARCHAR(100), IN `in_guardian_email` VARCHAR(200), IN `in_guardian_address` VARCHAR(100), IN `in_guardian_relationship` VARCHAR(100), IN `in_parent_fullname` VARCHAR(100), IN `in_parent_phone` VARCHAR(100), IN `in_parent_email` VARCHAR(100), IN `in_parent_address` VARCHAR(100), IN `in_parent_occupation` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_last_school_attended` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_admission_no` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_status` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_school_id` VARCHAR(100), IN `p_short_name` VARCHAR(10))
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
    
   CALL parents('create', par_code, in_parent_fullname, in_parent_phone, in_parent_email, 
                  in_guardian_relationship, 0, in_parent_occupation, in_school_id, in_admission_no);
                   
                    CALL guardians('create',in_school_id, gur_code, app_code, in_guardian_name, 
                      in_guardian_address, in_guardian_email, in_guardian_phone);
                      
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
        
       
       END $$
       
DROP PROCEDURE IF EXISTS assignmentResponses $$
CREATE PROCEDURE `assignmentResponses`(
    IN p_assignment_id INT,
    IN p_question_id INT,
    IN p_admission_no VARCHAR(20),
    IN p_subject VARCHAR(30),
    IN p_response TEXT,
    IN p_score DECIMAL(5,2),
    IN p_remark VARCHAR(255),
    IN p_response_id INT
)
BEGIN
    DECLARE v_correct_answer TEXT;
    DECLARE v_marks DECIMAL(5,2);
    DECLARE v_is_correct TINYINT DEFAULT 0;
    DECLARE v_auto_score DECIMAL(5,2) DEFAULT 0;
    DECLARE v_record_exists INT DEFAULT 0;

    IF p_response_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_record_exists
        FROM assignment_responses
        WHERE id = p_response_id;

        IF v_record_exists = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Response record not found. Invalid response_id.';
        END IF;

        UPDATE assignment_responses
        SET
            score = COALESCE(p_score, score),
            remark = COALESCE(p_remark, remark)
        WHERE id = p_response_id;

        SELECT 
            id,
            assignment_id,
            question_id,
            admission_no,
            subject,
            response,
            score,
            is_correct,
            marks,
            remark,
            NOW() AS updated_at
        FROM assignment_responses
        WHERE id = p_response_id;

    ELSEIF p_question_id IS NOT NULL AND p_admission_no IS NOT NULL THEN
        SELECT correct_answer, marks
        INTO v_correct_answer, v_marks
        FROM assignment_questions
        WHERE id = p_question_id;

        IF v_correct_answer IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Question not found: ';
        END IF;

        IF p_response = v_correct_answer THEN
            SET v_is_correct = 1;
            SET v_auto_score = v_marks;
        ELSE
            SET v_is_correct = 0;
            SET v_auto_score = 0;
        END IF;

        SELECT COUNT(*) INTO v_record_exists
        FROM assignment_responses
        WHERE assignment_id = p_assignment_id
          AND question_id = p_question_id
          AND admission_no = p_admission_no;

        IF v_record_exists = 0 THEN
            INSERT INTO assignment_responses (
                assignment_id, question_id, admission_no, subject, response, score, is_correct, marks, remark
            ) VALUES (
                p_assignment_id, p_question_id, p_admission_no, p_subject, p_response, v_auto_score, v_is_correct, v_marks, p_remark
            );
        ELSE
            UPDATE assignment_responses
            SET
                response = p_response,
                score = v_auto_score,
                is_correct = v_is_correct,
                remark = COALESCE(p_remark, remark)
            WHERE assignment_id = p_assignment_id
              AND question_id = p_question_id
              AND admission_no = p_admission_no;
        END IF;

        SELECT 
            id,
            assignment_id,
            question_id,
            admission_no,
            subject,
            response,
            score,
            is_correct,
            marks,
            remark,
            NOW() AS updated_at
        FROM assignment_responses
        WHERE assignment_id = p_assignment_id
          AND question_id = p_question_id
          AND admission_no = p_admission_no;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid parameters. Either provide (question_id + admission_no) for student submission OR response_id for teacher update.';
    END IF;

END $$

DROP PROCEDURE IF EXISTS assignments $$
CREATE PROCEDURE `assignments`(IN `in_query_type` VARCHAR(50), IN `in_id` VARCHAR(50), IN `in_teacher_id` INT, IN `in_class_name` VARCHAR(255), IN `in_class_code` VARCHAR(20), IN `in_subject` VARCHAR(255), IN `in_subject_code` VARCHAR(20), IN `in_assignment_date` DATE, IN `in_submission_date` DATE, IN `in_attachment` VARCHAR(255), IN `in_content` TEXT, IN `in_teacher_name` VARCHAR(100), IN `in_title` VARCHAR(100), IN `in_marks` VARCHAR(100), IN `in_school_id` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_academic_year` VARCHAR(20), IN `in_term` VARCHAR(20), IN `in_start_date` DATE, IN `in_end_date` DATE, IN `in_status` VARCHAR(50), IN `in_admission_no` VARCHAR(20))
BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO assignments (
            teacher_id, class_name, subject, subject_code, assignment_date, submission_date, attachment,
            content, teacher_name, title, marks, school_id, branch_id, class_code,academic_year, term)
        VALUES (
            in_teacher_id, in_class_name, in_subject, in_subject_code, in_assignment_date, in_submission_date, in_attachment,
            in_content, in_teacher_name, in_title, in_marks, in_school_id, in_branch_id, in_class_code, in_academic_year, in_term);
        SELECT LAST_INSERT_ID() AS assignment_id;

    ELSEIF in_query_type = 'update' THEN
        UPDATE assignments
        SET 
            class_name = COALESCE(in_class_name, class_name),
            subject = COALESCE(in_subject, subject),
            subject_code = COALESCE(in_subject_code, subject_code),
            assignment_date = COALESCE(in_assignment_date, assignment_date),
            submission_date = COALESCE(in_submission_date, submission_date),
            attachment = COALESCE(in_attachment, attachment),
            content = COALESCE(in_content, content),
            teacher_name = COALESCE(in_teacher_name, teacher_name),
            title = COALESCE(in_title, title),
            marks = COALESCE(in_marks, marks),
            status = COALESCE(in_status, status)
        WHERE id = in_id;
		SELECT  in_id AS assignment_id;
    ELSEIF in_query_type = 'delete' THEN
        DELETE FROM assignment_questions WHERE id = in_id;
     ELSEIF in_query_type = 'delete_exam' THEN
        DELETE FROM assignments WHERE id = in_id;
        DELETE FROM assignment_questions WHERE assignment_id = in_id;
        
    ELSEIF in_query_type = 'select_teacher_assignment' THEN
    	SELECT (SELECT SUM(aq.marks) FROM assignment_questions aq WHERE aq.assignment_id = a.id) as marks,
        a.* FROM assignments a
		WHERE a.teacher_id = 1 
    	AND a.academic_year = in_academic_year 
    	AND a.term = in_term ORDER BY a.assignment_date DESC;
    ELSEIF in_query_type = 'student_assignment' THEN
    SELECT a.*,
    COUNT(ar.question_id) AS response_count,
    COALESCE(q.total_marks, 0) AS marks,
    COALESCE(SUM(ar.score), 0) AS student_total_score
	FROM assignments a
	LEFT JOIN assignment_responses ar 
    ON ar.assignment_id = a.id 
    AND ar.admission_no = in_admission_no
	LEFT JOIN (
    SELECT assignment_id, SUM(marks) AS total_marks
    FROM assignment_questions
    GROUP BY assignment_id
	) q ON q.assignment_id = a.id
WHERE 
    a.class_code = in_class_code 
    AND a.status != 'draft'
    AND a.academic_year = in_academic_year 
    AND a.term = in_term 
    AND a.school_id = in_school_id 
    AND a.branch_id = in_branch_id
GROUP BY a.id
ORDER BY a.created_at DESC;

    ELSEIF in_query_type = 'select' THEN
        IF in_admission_no IS NOT NULL AND in_admission_no !='' THEN
        	SELECT a.*,
    COUNT(ar.question_id) AS response_count,
    COALESCE(q.total_marks, 0) AS marks,
    COALESCE(SUM(ar.score), 0) AS student_total_score
	FROM assignments a
	LEFT JOIN assignment_responses ar 
    ON ar.assignment_id = a.id 
    AND ar.admission_no = in_admission_no
	LEFT JOIN (
    SELECT assignment_id, SUM(marks) AS total_marks
    FROM assignment_questions
    GROUP BY assignment_id
	) q ON q.assignment_id = a.id
            WHERE a.id = in_id;     
        ELSE
           SELECT * FROM assignments WHERE id = in_id; 
        END IF;
   ELSEIF in_query_type = 'select-questions' THEN
   SELECT 
    q.id AS question_id,
    q.assignment_id,
    q.question_text,
    q.question_type,
    q.correct_answer,
    q.attachment_url,
    q.marks,
    q.options AS options_json 
FROM assignment_questions q
WHERE q.assignment_id = in_id;
 
    ELSEIF in_query_type = 'select-submitted' THEN
        SELECT
        	  a.assignment_id,
              a.question_text,
              a.question_type,
              a.correct_answer,
              a.marks,
              b.question_id,
              b.is_correct,
              b.id AS answer_id,
              b.response,
              b.admission_no,
              b.created_at AS submitted_on,
              b.score,
              b.remark
         FROM assignment_questions a
         JOIN assignment_responses b ON a.id = b.question_id
         WHERE b.assignment_id = in_id AND b.admission_no = in_content;

   ELSEIF in_query_type = 'select-responses' THEN           
           SELECT
      s.admission_no,
      s.student_name,
      ar.assignment_id,
      COUNT(ar.assignment_id) AS response_count,
      SUM(ar.score) as score,
      SUM(ar.marks) as marks
    FROM students s
    LEFT JOIN assignment_responses ar
      ON s.admission_no = ar.admission_no
      AND ar.assignment_id = in_id
    WHERE s.current_class = in_class_code
      AND s.school_id = in_school_id
    GROUP BY s.admission_no, s.student_name;
    END IF;
END $$

DROP PROCEDURE IF EXISTS assignment_questions $$
CREATE PROCEDURE `assignment_questions`(IN `query_type` VARCHAR(10), IN `in_id` INT, IN `in_assignment_id` INT, IN `in_question_type` ENUM('Multiple Choice','True/False','Short Answer','Fill in the Blank','Essay'), IN `in_question_text` TEXT, IN `in_attachment_url` VARCHAR(300), IN `in_options` JSON, IN `in_correct_answer` TEXT, IN `in_marks` DECIMAL(5))
BEGIN
    -- Validate input type
    IF query_type NOT IN ('insert', 'update') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid query_type. Use "insert" or "update".';
    END IF;

    -- Validation based on question type
    IF in_question_type = 'Multiple Choice' THEN
        IF in_options IS NULL OR JSON_VALID(in_options) = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Options must be provided and must be a valid JSON array for Multiple Choice questions.';
        END IF;
        IF in_correct_answer IS NULL OR TRIM(in_correct_answer) = '' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Correct answer must be provided for Multiple Choice questions.';
        END IF;

    ELSEIF in_question_type = 'True/False' THEN
        IF in_correct_answer IS NULL OR TRIM(in_correct_answer) = '' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Correct answer must be provided for True/False questions.';
        END IF;
        -- Optional: enforce "True" or "False"
        IF in_correct_answer NOT IN ('True', 'False', 'true', 'false') THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Correct answer for True/False must be "True" or "False".';
        END IF;
        -- For True/False, options should be NULL (optional enforcement)
        IF in_options IS NOT NULL THEN
            SET in_options = NULL; -- Auto-clear options if accidentally passed
        END IF;

    ELSE
        -- For Short Answer, Fill in the Blank, Essay
        IF in_correct_answer IS NULL OR TRIM(in_correct_answer) = '' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Correct answer must be provided for this question type.';
        END IF;
        -- Options should not be used for non-MCQ types — clear them if provided
        IF in_options IS NOT NULL THEN
            SET in_options = NULL;
        END IF;
    END IF;

    -- Insert logic
    IF query_type = 'insert' THEN
        INSERT INTO assignment_questions (
            assignment_id, question_type, question_text, attachment_url, options, correct_answer, marks
        ) VALUES (
            in_assignment_id, in_question_type, in_question_text, in_attachment_url, in_options, in_correct_answer, in_marks
        );

    -- Update logic
    ELSEIF query_type = 'update' THEN
        UPDATE assignment_questions
        SET
            assignment_id = COALESCE(in_assignment_id, assignment_id),
            question_type = COALESCE(in_question_type, question_type),
            question_text = COALESCE(in_question_text, question_text),
            attachment_url = COALESCE(in_attachment_url, attachment_url),
            options = COALESCE(in_options, options),
            correct_answer = COALESCE(in_correct_answer, correct_answer),
            marks = COALESCE(in_marks, marks)
        WHERE id = in_id;

    END IF;

END $$

DROP PROCEDURE IF EXISTS assignment_question_options $$
CREATE PROCEDURE `assignment_question_options`(IN `p_question_id` INT, IN `p_options_json` JSON)
BEGIN
    DECLARE v_index INT DEFAULT 0;
    DECLARE v_options_length INT;
    DECLARE v_option VARCHAR(255);
    DECLARE v_is_correct BOOLEAN;

    -- Check if JSON is valid and not empty
    IF JSON_VALID(p_options_json) AND p_options_json IS NOT NULL THEN
        SET v_options_length = JSON_LENGTH(p_options_json);

    WHILE v_index < v_options_length DO
        SET v_option = JSON_UNQUOTE(JSON_EXTRACT(p_options_json, CONCAT('$[', v_index, '].value')));

        SET v_is_correct = CASE 
                         WHEN JSON_UNQUOTE(JSON_EXTRACT(p_options_json, CONCAT('$[', v_index, '].is_correct'))) = 'true' THEN 1
                         ELSE 0
                       END;

    IF v_option IS NOT NULL THEN
        INSERT INTO assignment_question_options (question_id, option, is_correct)
        VALUES (p_question_id, v_option, v_is_correct);
    END IF;

    SET v_index = v_index + 1;
END WHILE;
    END IF;
END $$

DROP PROCEDURE IF EXISTS attendance_setup $$
CREATE PROCEDURE `attendance_setup`(
  IN action VARCHAR(50),
    IN p_school_id VARCHAR(50),
    IN p_branch_id VARCHAR(50),
    IN p_allow_backdated_attendance TINYINT,
    IN p_backdated_days SMALLINT
)
BEGIN
    IF action = 'UPDATE' THEN
      UPDATE `school_locations`
      SET
          `allow_backdated_attendance` = p_allow_backdated_attendance,
          `backdated_days` = p_backdated_days
      WHERE
          `school_id` = p_school_id AND
          `branch_id` = p_branch_id;
    ELSEIF action = 'SELECT' THEN
      SELECT
          `allow_backdated_attendance`,
          `backdated_days`
      FROM `school_locations`
      WHERE
          `school_id` = p_school_id AND
          `branch_id` = p_branch_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS AutoEscalateTickets $$
CREATE PROCEDURE `AutoEscalateTickets`()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE ticket_id INT;
  DECLARE ticket_priority VARCHAR(20);
  DECLARE ticket_category VARCHAR(100);
  DECLARE created_time TIMESTAMP;
  DECLARE escalation_minutes INT;
  DECLARE escalate_to_user INT;
  DECLARE escalate_to_type VARCHAR(20);
  
  DECLARE ticket_cursor CURSOR FOR
    SELECT st.id, st.priority, st.category, st.created_at
    FROM support_tickets st
    WHERE st.status IN ('open', 'in-progress')
    AND st.escalated_at IS NULL
    AND st.assigned_to IS NULL;
    
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN ticket_cursor;
  
  ticket_loop: LOOP
    FETCH ticket_cursor INTO ticket_id, ticket_priority, ticket_category, created_time;
    
    IF done THEN
      LEAVE ticket_loop;
    END IF;
    
    -- Find applicable escalation rule
    SELECT escalate_after_minutes, escalate_to_user_id, escalate_to_user_type
    INTO escalation_minutes, escalate_to_user, escalate_to_type
    FROM support_escalation_rules
    WHERE priority = ticket_priority
    AND (category IS NULL OR category = ticket_category)
    AND is_active = TRUE
    ORDER BY CASE WHEN category = ticket_category THEN 1 ELSE 2 END
    LIMIT 1;
    
    -- Check if ticket should be escalated
    IF escalation_minutes IS NOT NULL 
    AND TIMESTAMPDIFF(MINUTE, created_time, NOW()) >= escalation_minutes THEN
      
      -- Find an available agent if escalate_to_user is not specified
      IF escalate_to_user IS NULL AND escalate_to_type IS NOT NULL THEN
        SELECT u.id INTO escalate_to_user
        FROM users u
        LEFT JOIN support_agent_status sas ON u.id = sas.agent_id
        WHERE u.user_type = escalate_to_type
        AND (sas.status IN ('online', 'away') OR sas.status IS NULL)
        AND (sas.current_ticket_count < sas.max_concurrent_tickets OR sas.current_ticket_count IS NULL)
        ORDER BY COALESCE(sas.current_ticket_count, 0) ASC
        LIMIT 1;
      END IF;
      
      -- Escalate the ticket
      IF escalate_to_user IS NOT NULL THEN
        UPDATE support_tickets
        SET assigned_to = escalate_to_user,
            escalated_at = NOW(),
            escalated_by = NULL,
            status = 'in-progress',
            updated_at = NOW()
        WHERE id = ticket_id;
        
        -- Add escalation message
        INSERT INTO ticket_messages (ticket_id, sender_id, message, is_from_user, is_automated, created_at, updated_at)
        VALUES (ticket_id, escalate_to_user, 'This ticket has been automatically escalated due to response time requirements.', FALSE, TRUE, NOW(), NOW());
        
        -- Update agent ticket count
        UPDATE support_agent_status
        SET current_ticket_count = current_ticket_count + 1
        WHERE agent_id = escalate_to_user;
      END IF;
    END IF;
    
  END LOOP;
  
  CLOSE ticket_cursor;
END $$

DROP PROCEDURE IF EXISTS auto_copy_chart_of_accounts $$
CREATE PROCEDURE `auto_copy_chart_of_accounts`(IN `p_source_school_id` VARCHAR(20), IN `p_source_branch_id` VARCHAR(20), IN `p_target_school_id` VARCHAR(20), IN `p_target_branch_id` VARCHAR(20), IN `p_created_by` VARCHAR(50))
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_source_account_id INT;
    DECLARE v_source_parent_id INT;
    DECLARE v_new_account_id INT;
    DECLARE v_new_parent_id INT;
    DECLARE v_account_code VARCHAR(20);
    DECLARE v_account_name VARCHAR(100);
    DECLARE v_account_type ENUM('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE');
    DECLARE v_account_subtype VARCHAR(50);
    DECLARE v_normal_balance ENUM('DEBIT','CREDIT');
    DECLARE v_description TEXT;
    DECLARE v_is_active TINYINT(1);
    DECLARE v_is_system_account TINYINT(1);
    DECLARE v_copied_count INT DEFAULT 0;
    DECLARE v_error_count INT DEFAULT 0;
    DECLARE v_error_msg VARCHAR(255);
    
    
    DECLARE accounts_cursor CURSOR FOR
        SELECT 
            account_id, account_code, account_name, account_type, account_subtype,
            parent_account_id, normal_balance, description, is_active, is_system_account
        FROM chart_of_accounts
        WHERE school_id = p_source_school_id
        AND (branch_id = p_source_branch_id OR (p_source_branch_id IS NULL AND branch_id IS NULL))
        AND is_active = 1
        ORDER BY 
            CASE WHEN parent_account_id IS NULL THEN 0 ELSE 1 END,  
            account_code;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        INSERT INTO financial_audit_trail (
            table_name, record_id, action, old_values, new_values, 
            user_id, school_id, branch_id
        ) VALUES (
            'auto_copy_chart_of_accounts', 0, 'ERROR', NULL,
            JSON_OBJECT(
                'error', v_error_msg,
                'source_school_id', p_source_school_id,
                'source_branch_id', p_source_branch_id,
                'target_school_id', p_target_school_id,
                'target_branch_id', p_target_branch_id,
                'copied_count', v_copied_count,
                'error_count', v_error_count
            ),
            p_created_by, p_target_school_id, p_target_branch_id
        );
        RESIGNAL SET MESSAGE_TEXT = v_error_msg;
    END;
    
    
    IF p_created_by IS NULL OR p_created_by = '' THEN
        SET p_created_by = 'SYSTEM_AUTO_COPY';
    END IF;
    
    
    IF (SELECT COUNT(*) FROM chart_of_accounts 
        WHERE school_id = p_source_school_id 
        AND (branch_id = p_source_branch_id OR (p_source_branch_id IS NULL AND branch_id IS NULL))
        AND is_active = 1) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Source branch has no chart of accounts to copy';
    END IF;
    
    
    IF (SELECT COUNT(*) FROM chart_of_accounts 
        WHERE school_id = p_target_school_id 
        AND branch_id = p_target_branch_id) > 0 THEN
        
        INSERT INTO financial_audit_trail (
            table_name, record_id, action, old_values, new_values, 
            user_id, school_id, branch_id
        ) VALUES (
            'auto_copy_chart_of_accounts', 0, 'START', NULL,
            JSON_OBJECT(
                'warning', 'Target branch already has chart of accounts',
                'existing_accounts', (SELECT COUNT(*) FROM chart_of_accounts 
                                    WHERE school_id = p_target_school_id 
                                    AND branch_id = p_target_branch_id),
                'source_school_id', p_source_school_id,
                'source_branch_id', p_source_branch_id,
                'target_school_id', p_target_school_id,
                'target_branch_id', p_target_branch_id
            ),
            p_created_by, p_target_school_id, p_target_branch_id
        );
    END IF;
    
    
    START TRANSACTION;
    
    
    CREATE TEMPORARY TABLE IF NOT EXISTS account_id_mapping (
        old_account_id INT,
        new_account_id INT,
        account_code VARCHAR(20),
        PRIMARY KEY (old_account_id),
        KEY idx_new_id (new_account_id),
        KEY idx_code (account_code)
    );
    
    
    DELETE FROM account_id_mapping;
    
    
    INSERT INTO financial_audit_trail (
        table_name, record_id, action, old_values, new_values, 
        user_id, school_id, branch_id
    ) VALUES (
        'auto_copy_chart_of_accounts', 0, 'START', NULL,
        JSON_OBJECT(
            'source_school_id', p_source_school_id,
            'source_branch_id', p_source_branch_id,
            'target_school_id', p_target_school_id,
            'target_branch_id', p_target_branch_id,
            'source_account_count', (SELECT COUNT(*) FROM chart_of_accounts 
                                   WHERE school_id = p_source_school_id 
                                   AND (branch_id = p_source_branch_id OR (p_source_branch_id IS NULL AND branch_id IS NULL))
                                   AND is_active = 1)
        ),
        p_created_by, p_target_school_id, p_target_branch_id
    );
    
    
    OPEN accounts_cursor;
    
    copy_loop: LOOP
        FETCH accounts_cursor INTO 
            v_source_account_id, v_account_code, v_account_name, v_account_type, v_account_subtype,
            v_source_parent_id, v_normal_balance, v_description, v_is_active, v_is_system_account;
        
        IF v_done THEN
            LEAVE copy_loop;
        END IF;
        
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            BEGIN
                SET v_error_count = v_error_count + 1;
                GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
                INSERT INTO financial_audit_trail (
                    table_name, record_id, action, old_values, new_values, 
                    user_id, school_id, branch_id
                ) VALUES (
                    'auto_copy_chart_of_accounts', v_source_account_id, 'ERROR', NULL,
                    JSON_OBJECT(
                        'error', v_error_msg,
                        'account_code', v_account_code,
                        'account_name', v_account_name
                    ),
                    p_created_by, p_target_school_id, p_target_branch_id
                );
            END;
            
            
            IF NOT EXISTS (
                SELECT 1 FROM chart_of_accounts 
                WHERE school_id = p_target_school_id 
                AND branch_id = p_target_branch_id 
                AND account_code = v_account_code
            ) THEN
                
                INSERT INTO chart_of_accounts (
                    account_code, account_name, account_type, account_subtype,
                    parent_account_id, normal_balance, description, 
                    is_active, is_system_account, school_id, branch_id
                ) VALUES (
                    v_account_code, v_account_name, v_account_type, v_account_subtype,
                    NULL, v_normal_balance, v_description,
                    v_is_active, v_is_system_account, p_target_school_id, p_target_branch_id
                );
                
                SET v_new_account_id = LAST_INSERT_ID();
                SET v_copied_count = v_copied_count + 1;
                
                
                INSERT INTO account_id_mapping (old_account_id, new_account_id, account_code)
                VALUES (v_source_account_id, v_new_account_id, v_account_code);
                
            ELSE
                
                SELECT account_id INTO v_new_account_id
                FROM chart_of_accounts 
                WHERE school_id = p_target_school_id 
                AND branch_id = p_target_branch_id 
                AND account_code = v_account_code;
                
                
                INSERT IGNORE INTO account_id_mapping (old_account_id, new_account_id, account_code)
                VALUES (v_source_account_id, v_new_account_id, v_account_code);
            END IF;
        END;
    END LOOP;
    
    CLOSE accounts_cursor;
    
    
    UPDATE chart_of_accounts target
    JOIN chart_of_accounts source ON source.account_code = target.account_code
    JOIN account_id_mapping parent_map ON source.parent_account_id = parent_map.old_account_id
    SET target.parent_account_id = parent_map.new_account_id
    WHERE target.school_id = p_target_school_id
    AND target.branch_id = p_target_branch_id
    AND source.school_id = p_source_school_id
    AND (source.branch_id = p_source_branch_id OR (p_source_branch_id IS NULL AND source.branch_id IS NULL))
    AND source.parent_account_id IS NOT NULL;
    
    
    DROP TEMPORARY TABLE account_id_mapping;
    
    
    COMMIT;
    
    
    INSERT INTO financial_audit_trail (
        table_name, record_id, action, old_values, new_values, 
        user_id, school_id, branch_id
    ) VALUES (
        'auto_copy_chart_of_accounts', 0, 'COMPLETE', NULL,
        JSON_OBJECT(
            'copied_count', v_copied_count,
            'error_count', v_error_count,
            'source_school_id', p_source_school_id,
            'source_branch_id', p_source_branch_id,
            'target_school_id', p_target_school_id,
            'target_branch_id', p_target_branch_id
        ),
        p_created_by, p_target_school_id, p_target_branch_id
    );
    
    
    SELECT 
        v_copied_count as accounts_copied,
        v_error_count as errors_encountered,
        'Chart of accounts copied successfully' as message;
        
END $$

DROP PROCEDURE IF EXISTS bookSupplies $$
CREATE PROCEDURE `bookSupplies`(IN `p_action` VARCHAR(20), IN `p_record_id` INT, IN `p_book_title` VARCHAR(255), IN `p_author` VARCHAR(255), IN `p_isbn` VARCHAR(20), IN `p_cover_img` VARCHAR(255), IN `p_status` ENUM('Available','Reserved'), IN `p_qty` INT, IN `p_post_date` DATE, IN `p_publisher` VARCHAR(255), IN `p_subject` VARCHAR(255), IN `p_book_no` VARCHAR(50))
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
END $$

DROP PROCEDURE IF EXISTS branch_admin $$
CREATE PROCEDURE `branch_admin`(IN `query_type` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_name` VARCHAR(250), IN `in_email` VARCHAR(70), IN `in_phone` VARCHAR(14), IN `in_password` VARCHAR(100), IN `in_username` VARCHAR(50), IN `in_school_id` VARCHAR(20), IN `in_status` VARCHAR(20), IN `in_id` VARCHAR(11))
BEGIN
    IF query_type = 'create' THEN
        -- Create new branch admin user and link to school location
        INSERT INTO `users`(
            `name`, `email`, `phone`, `username`, 
            `user_type`, `password`, `branch_id`, `school_id`
        ) VALUES (
            in_name, in_email, in_phone, in_username, 
            'branchadmin', in_password, in_branch_id, in_school_id
        );
        
        UPDATE `school_locations` 
        SET `admin_id` = LAST_INSERT_ID() 
        WHERE id = in_branch_id;
        
    ELSEIF query_type = 'select' THEN 
        -- Retrieve user details for branch
        SELECT id,name, email, phone, username,status 
        FROM `users` 
        WHERE branch_id = in_branch_id;
        
    ELSEIF query_type = 'update' THEN
        -- Update existing user details (including status)
        UPDATE `users` 
        SET 
            name = COALESCE(in_name, name),
            email = COALESCE(in_email, email),
            phone = COALESCE(in_phone, phone),
            username = COALESCE(in_username, username),
            password = COALESCE(in_password, password),
            status = COALESCE(in_status, status) 
        WHERE id = in_id;
        
    ELSEIF query_type = 'delete' THEN
        -- Delete user and unlink from school location
        DELETE FROM `users` 
        WHERE id = in_id;
        
        UPDATE `school_locations` 
        SET admin_id = NULL 
        WHERE id = in_branch_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS BulkUpsertStudentScores $$
CREATE PROCEDURE `BulkUpsertStudentScores`(IN `scores_json` JSON)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE total_records INT;
    
    SET total_records = JSON_LENGTH(scores_json);
    
    WHILE i < total_records DO
        INSERT INTO student_scores (
            admission_no, subject_code, class_code, ca_setup_id,
            ca_type, week_number, score, max_score,
            academic_year, term, school_id
        ) VALUES (
            JSON_UNQUOTE(JSON_EXTRACT(scores_json, CONCAT('$[', i, '].admission_no'))),
            JSON_UNQUOTE(JSON_EXTRACT(scores_json, CONCAT('$[', i, '].subject_code'))),
            JSON_UNQUOTE(JSON_EXTRACT(scores_json, CONCAT('$[', i, '].class_code'))),
            JSON_EXTRACT(scores_json, CONCAT('$[', i, '].ca_setup_id')),
            JSON_UNQUOTE(JSON_EXTRACT(scores_json, CONCAT('$[', i, '].ca_type'))),
            JSON_EXTRACT(scores_json, CONCAT('$[', i, '].week_number')),
            JSON_EXTRACT(scores_json, CONCAT('$[', i, '].score')),
            JSON_EXTRACT(scores_json, CONCAT('$[', i, '].max_score')),
            JSON_UNQUOTE(JSON_EXTRACT(scores_json, CONCAT('$[', i, '].academic_year'))),
            JSON_UNQUOTE(JSON_EXTRACT(scores_json, CONCAT('$[', i, '].term'))),
            JSON_UNQUOTE(JSON_EXTRACT(scores_json, CONCAT('$[', i, '].school_id')))
        ) ON DUPLICATE KEY UPDATE
            score = VALUES(score),
            updated_at = CURRENT_TIMESTAMP;
        
        SET i = i + 1;
    END WHILE;
END $$

DROP PROCEDURE IF EXISTS bulk_convert_payments_to_journal $$
CREATE PROCEDURE `bulk_convert_payments_to_journal`(IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_limit` INT)
BEGIN
    -- Declare all variables first
    DECLARE v_converted_count INT DEFAULT 0;
    DECLARE v_error_count INT DEFAULT 0;
    DECLARE v_payment_entry_id INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_limit INT;

    -- Declare cursor
    DECLARE payment_cursor CURSOR FOR
        SELECT item_id
        FROM payment_entries
        WHERE school_id = p_school_id
        AND (branch_id = p_branch_id OR p_branch_id IS NULL)
        AND journal_entry_id IS NULL
        AND (cr > 0 OR dr > 0)
        AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)
        ORDER BY created_at DESC
        LIMIT v_limit;

    -- Declare handlers
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Now set the default value for v_limit
    SET v_limit = COALESCE(p_limit, 100);

    -- Start transaction
    START TRANSACTION;

    -- Open cursor
    OPEN payment_cursor;

    -- Process each payment entry
    conversion_loop:LOOP
        FETCH payment_cursor INTO v_payment_entry_id;

        IF done THEN
            LEAVE conversion_loop;
        END IF;

        -- Try to convert each payment entry
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            BEGIN
                SET v_error_count = v_error_count + 1;
                INSERT INTO financial_audit_trail (
                    table_name,
                    record_id,
                    action,
                    old_values,
                    new_values,
                    user_id,
                    school_id,
                    branch_id
                ) VALUES (
                    'bulk_conversion',
                    v_payment_entry_id,
                    'ERROR',
                    NULL,
                    JSON_OBJECT('error', 'Payment conversion failed'),
                    'SYSTEM_BULK_CONVERT',
                    p_school_id,
                    p_branch_id
                );
            END;

            -- Convert payment to journal entry
            CALL convert_payment_to_journal(v_payment_entry_id, 'SYSTEM_BULK_CONVERT');
            SET v_converted_count = v_converted_count + 1;
        END;
    END LOOP;

    -- Close cursor
    CLOSE payment_cursor;

    -- Commit transaction
    COMMIT;

    -- Return conversion summary
    SELECT
        v_converted_count AS converted_count,
        v_error_count AS error_count,
        v_limit AS limit_processed;

END $$

DROP PROCEDURE IF EXISTS character_scores $$
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
    IN `in_id` INT
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
        INSERT INTO `character_traits` (`school_id`, `category`, `description`, `section`)
        VALUES (in_school_id, in_category, in_description, in_section);

    ELSEIF query_type = 'Update Character' THEN
        UPDATE `character_traits`
        SET 
            `category` = in_category,
            `description` = in_description,
            `section` = in_section
        WHERE `id` = in_id AND `school_id` = in_school_id;

    ELSEIF query_type = 'Delete Character' THEN
        DELETE FROM `character_traits`
        WHERE `id` = in_id AND `school_id` = in_school_id;

    ELSEIF query_type = 'Select School Characters' THEN
        SELECT COUNT(*) INTO rows_found 
        FROM character_traits 
        WHERE school_id = in_school_id AND section = in_section;
        
        IF rows_found > 0 AND in_section IS NOT NULL AND in_section != '' THEN
            SELECT * FROM character_traits 
            WHERE school_id = in_school_id AND section = in_section;
        ELSE
            SELECT * FROM character_traits 
            WHERE school_id = in_school_id;
        END IF;

    ELSE
        SELECT 'Invalid query_type provided' AS message;
    END IF;

END $$

DROP PROCEDURE IF EXISTS classes $$
CREATE PROCEDURE `classes`(IN `query_type` VARCHAR(50), IN `in_id` INT, IN `in_class_name` VARCHAR(100), IN `in_class_code` VARCHAR(100), IN `in_section` VARCHAR(100), IN `in_branch_id` VARCHAR(200), IN `in_school_id` VARCHAR(10))
BEGIN
    DECLARE last_code INT;
    DECLARE new_class_code VARCHAR(100);

    IF query_type = 'create' THEN
        -- ✅ Validate inputs
        IF in_section IS NULL OR in_section = '' THEN
            SIGNAL SQLSTATE '45000' 
                SET MESSAGE_TEXT = 'Section cannot be empty';
        END IF;

        IF in_branch_id IS NULL OR in_branch_id = '' THEN
            SIGNAL SQLSTATE '45000' 
                SET MESSAGE_TEXT = 'Branch ID cannot be empty';
        END IF;

        START TRANSACTION;

        SELECT MAX(code) + 1 INTO @last_code 
        FROM number_generator 
        WHERE prefix = 'CLA' 
        FOR UPDATE;

        SET new_class_code = CONCAT('CLS', LPAD(@last_code, 4, '0'));

        UPDATE number_generator 
        SET code = @last_code 
        WHERE prefix = 'CLA';

        INSERT INTO `classes`(`class_name`, `class_code`, `section`, `branch_id`, `school_id`)
        VALUES (in_class_name, new_class_code, in_section, in_branch_id, in_school_id);

        COMMIT;

    ELSEIF query_type = 'update' THEN
        UPDATE `classes`
        SET `class_name` = COALESCE(in_class_name, class_name),
            `section` = COALESCE(in_section, section),
            `branch_id` = COALESCE(in_branch_id, branch_id),
            `school_id` = COALESCE(in_school_id, school_id)
        WHERE `class_code` = in_class_code;
        
    ELSEIF query_type = 'delete' THEN 
        DELETE FROM `classes` WHERE `class_code` = in_class_code;

    -- ✅ UPDATED: 'select' now excludes parent classes that have arms
    ELSEIF query_type = 'select' THEN
        SELECT c.* 
        FROM `classes` c
        WHERE (c.class_name = in_class_name OR in_class_name IS NULL OR c.class_name = 'All Classes')
          AND (c.branch_id = in_branch_id OR in_branch_id IS NULL)
          AND (c.school_id = in_school_id OR in_school_id IS NULL)
          AND (
            c.parent_id IS NOT NULL
            OR NOT EXISTS (
                SELECT 1 FROM `classes` child 
                WHERE child.parent_id = c.class_code
            )
          )
        ORDER BY c.class_code ASC;

    -- ✅ UPDATED: 'select-all'
    ELSEIF query_type = 'select-all' THEN
        IF in_branch_id IS NOT NULL THEN
		    SELECT c.* 
		    FROM classes c
		    WHERE c.branch_id = in_branch_id 
		      AND c.school_id = in_school_id
		      AND (
		        c.parent_id IS NOT NULL
		        OR NOT EXISTS (
		            SELECT 1 
		            FROM classes child 
		            WHERE child.parent_id = c.class_code
		        )
		      )
		      AND (in_class_code IS NULL OR c.class_code = in_class_code)
		    ORDER BY c.class_name, c.class_code ASC;
        ELSE
            SELECT c.* 
            FROM `classes` c
            WHERE c.school_id = in_school_id
              AND (
                c.parent_id IS NOT NULL
                OR NOT EXISTS (
                    SELECT 1 FROM `classes` child 
                    WHERE child.parent_id = c.class_code
                )
              )
            ORDER BY c.class_name, c.class_code ASC;
        END IF;

    ELSEIF query_type = 'select-sections' THEN
        -- ❌ No change: just returns section names
        SELECT DISTINCT section AS section FROM `classes`
        ORDER BY class_code ASC;

    -- ✅ UPDATED: 'select-section-classes'
    ELSEIF query_type = 'select-section-classes' THEN
        SELECT c.* 
        FROM `classes` c
        WHERE c.`section` = in_section 
          AND c.school_id = in_school_id
          AND (
            c.parent_id IS NOT NULL
            OR NOT EXISTS (
                SELECT 1 FROM `classes` child 
                WHERE child.parent_id = c.class_code
            )
          )
        ORDER BY c.class_code ASC;

    -- ⚠️ Optional: 'select-unique-classes'
    -- Only update if used in UI for class selection
    -- For now, leave as-is to avoid breaking reports
    ELSEIF query_type = 'select-unique-classes' THEN
        SELECT CONCAT(section, ' ', class_code) AS class_group, section, class_code
        FROM `classes`
        GROUP BY section, class_code, class_name;

    ELSEIF query_type = 'select-class-count' THEN
        -- ❌ No change: reads from `students`, not affected
        SELECT class_name, current_class, COUNT(*) AS student_count
        FROM `students` 
        WHERE school_id = in_school_id
        GROUP BY class_name
        ORDER BY current_class ASC;
    ELSEIF query_type = 'select_with_student_count' AND in_branch_id IS NOT NULL THEN
        SELECT 
            c.*, 
            COUNT(s.id) AS student_count
        FROM classes c
        LEFT JOIN students s 
            ON s.current_class = c.class_code
            AND s.status IN ('Suspended', 'Active')
        WHERE c.branch_id = in_branch_id 
          AND c.school_id = in_school_id
          AND (
            c.parent_id IS NOT NULL
            OR NOT EXISTS (
                SELECT 1 
                FROM classes child 
                WHERE child.parent_id = c.class_code
            )
          )
        GROUP BY c.class_code
        ORDER BY c.class_code, c.class_name, c.class_code ASC;
    END IF;

END $$

DROP PROCEDURE IF EXISTS classes_atomic $$
CREATE PROCEDURE `classes_atomic`(
    IN `query_type` VARCHAR(50),
    IN `in_id` INT,
    IN `in_class_name` VARCHAR(100),
    IN `in_class_code` VARCHAR(100),
    IN `in_section` VARCHAR(100),
    IN `in_branch_id` VARCHAR(200),
    IN `in_school_id` VARCHAR(10),
    IN `in_class_arms_json` TEXT,
    IN `in_stream` VARCHAR(50)   -- ✅ NEW stream input
)
BEGIN
    DECLARE last_code INT;
    DECLARE new_class_code VARCHAR(100);
    DECLARE new_arm_code VARCHAR(100);
    DECLARE new_class_id INT;
    DECLARE i INT DEFAULT 0;
    DECLARE arm_name VARCHAR(100);
    DECLARE arm_code_from_json VARCHAR(100);
    DECLARE arm_status VARCHAR(50);
    DECLARE existing_class_id INT;
    DECLARE final_stream VARCHAR(50);  -- ✅ NEW

    -- ✅ Default stream logic
    SET final_stream = IFNULL(NULLIF(in_stream, ''), 'General');

    IF query_type = 'create_with_arms' THEN
        SET i = 0; -- Reset loop counter for each execution
        IF in_section IS NULL OR in_section = '' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section cannot be empty';
        END IF;
        IF in_branch_id IS NULL OR in_branch_id = '' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch ID cannot be empty';
        END IF;

        START TRANSACTION;

        SELECT id INTO existing_class_id
        FROM `classes`
        WHERE `class_name` = in_class_name
          AND `section` = in_section
          AND `branch_id` = in_branch_id
          AND `school_id` = in_school_id
        LIMIT 1;

        IF existing_class_id IS NULL THEN
            SELECT COALESCE(MAX(code), 0) + 1 INTO last_code
            FROM number_generator
            WHERE prefix = 'CLA'
            FOR UPDATE;

            SET new_class_code = CONCAT('CLS', LPAD(last_code, 4, '0'));

            UPDATE number_generator
            SET code = last_code
            WHERE prefix = 'CLA';

            INSERT INTO `classes`(`class_name`, `class_code`, `section`, `branch_id`, `school_id`, `stream`)
            VALUES (in_class_name, new_class_code, in_section, in_branch_id, in_school_id, final_stream);

            SET new_class_id = LAST_INSERT_ID();
        ELSE
            SET new_class_id = existing_class_id;
        END IF;

        IF in_class_arms_json IS NOT NULL AND JSON_VALID(in_class_arms_json) THEN
            WHILE i < JSON_LENGTH(in_class_arms_json) DO
                SET arm_name = JSON_UNQUOTE(JSON_EXTRACT(in_class_arms_json, CONCAT('$[', i, '].arm_name')));
                SET arm_code_from_json = JSON_UNQUOTE(JSON_EXTRACT(in_class_arms_json, CONCAT('$[', i, '].arm_code')));
                SET arm_status = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(in_class_arms_json, CONCAT('$[', i, '].status'))), 'Active');

                INSERT IGNORE INTO `class_arms`(`class_id`, `arm_name`, `arm_code`, `school_id`, `branch_id`, `status`)
                VALUES (new_class_id, arm_name, arm_code_from_json, in_school_id, in_branch_id, arm_status);

                SET i = i + 1;
            END WHILE;
        END IF;

        COMMIT;

        SELECT new_class_id as class_id;

    ELSEIF query_type = 'create' THEN
        SELECT id INTO existing_class_id
        FROM `classes`
        WHERE `class_name` = in_class_name
          AND `section` = in_section
          AND `branch_id` = in_branch_id
          AND `school_id` = in_school_id
        LIMIT 1;

        IF existing_class_id IS NULL THEN
            IF in_section IS NULL OR in_section = '' THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Section cannot be empty';
            END IF;

            IF in_branch_id IS NULL OR in_branch_id = '' THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Branch ID cannot be empty';
            END IF;

            START TRANSACTION;

            SELECT COALESCE(MAX(code), 0) + 1 INTO last_code
            FROM number_generator
            WHERE prefix = 'CLA'
            FOR UPDATE;

            SET new_class_code = CONCAT('CLS', LPAD(last_code, 4, '0'));

            UPDATE number_generator
            SET code = last_code
            WHERE prefix = 'CLA';

            INSERT INTO `classes`(`class_name`, `class_code`, `section`, `branch_id`, `school_id`, `stream`)
            VALUES (in_class_name, new_class_code, in_section, in_branch_id, in_school_id, final_stream);

            COMMIT;
        END IF;

    ELSEIF query_type = 'create_class_arm' THEN
        START TRANSACTION;

        SELECT COALESCE(MAX(code), 0) + 1 INTO last_code
        FROM number_generator
        WHERE prefix = 'ARM' FOR UPDATE;

        SET new_arm_code = CONCAT('ARM', LPAD(last_code, 4, '0'));

        UPDATE number_generator SET code = last_code WHERE prefix = 'ARM';

        INSERT INTO `class_arms`(`class_id`, `arm_name`, `arm_code`, `school_id`, `branch_id`)
        SELECT c.id, in_class_name, new_arm_code, in_school_id, in_branch_id
        FROM `classes` c WHERE c.class_code = in_class_code;

        COMMIT;

    ELSEIF query_type = 'update' THEN
        UPDATE `classes`
        SET `class_name` = COALESCE(in_class_name, class_name),
            `section` = COALESCE(in_section, section),
            `branch_id` = COALESCE(in_branch_id, branch_id),
            `school_id` = COALESCE(in_school_id, school_id),
            `stream` = COALESCE(final_stream, stream)
        WHERE `class_code` = in_class_code;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM `classes`
        WHERE (class_name = in_class_name OR in_class_name IS NULL OR class_name = 'All Classes')
          AND (branch_id = in_branch_id OR in_branch_id IS NULL)
          AND (school_id = in_school_id OR in_school_id IS NULL)
        ORDER BY class_code ASC;

    ELSEIF query_type = 'select-all' THEN
        SELECT
            c.*,
            COALESCE(
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'arm_id', ca.id,
                        'arm_name', ca.arm_name,
                        'arm_code', ca.arm_code,
                        'status', ca.status
                    )
                )
                FROM `class_arms` ca
                WHERE ca.class_id = c.id),
                JSON_ARRAY()
            ) as arms
        FROM `classes` c
        WHERE
            (c.branch_id = in_branch_id OR in_branch_id IS NULL)
            AND c.school_id = in_school_id
        GROUP BY c.id
        ORDER BY c.class_name, c.class_code ASC;

    ELSEIF query_type = 'select_class_arms' THEN
        SELECT ca.*
        FROM `class_arms` ca
        JOIN `classes` c ON ca.class_id = c.id
        WHERE c.class_code = in_class_code AND ca.school_id = in_school_id;

    ELSEIF query_type = 'select-sections' THEN
        SELECT DISTINCT section AS section FROM `classes`
        ORDER BY class_code ASC;

    ELSEIF query_type = 'select-section-classes' THEN
        SELECT * FROM `classes`
        WHERE `section` = in_section AND school_id = in_school_id
        ORDER BY class_code ASC;

    ELSEIF query_type = 'select-unique-classes' THEN
        SELECT CONCAT(section, ' ', class_code) AS class_group, section, class_code
        FROM `classes`
        GROUP BY section, class_code, class_name;

    ELSEIF query_type = 'select-class-count' THEN
        SELECT class_name, current_class, COUNT(*) AS student_count
        FROM `students`
        WHERE school_id = in_school_id
        GROUP BY class_name
        ORDER BY current_class ASC;
    END IF;

END $$

DROP PROCEDURE IF EXISTS ClassTiming $$
CREATE PROCEDURE `ClassTiming`(IN `query_type` VARCHAR(20), IN `in_id` INT, IN `in_school_id` VARCHAR(20), IN `in_section` VARCHAR(255), IN `in_start_time` VARCHAR(15), IN `in_end_time` VARCHAR(15), IN `in_activities` VARCHAR(30))
BEGIN 
    -- Insert
    IF query_type = "create" THEN
        INSERT INTO class_timing (school_id, section, start_time, end_time, activities, created_at, updated_at)
        VALUES (in_school_id, in_section, in_start_time, in_end_time, in_activities, NOW(), NOW());

    -- Select all or filter by section if provided
    ELSEIF query_type = "select" THEN
        IF in_section IS NOT NULL THEN
            SELECT * FROM class_timing 
            WHERE section = in_section AND school_id=in_school_id  ORDER BY `id` ASC;
        ELSE
            SELECT * FROM `class_timing` WHERE school_id=in_school_id ORDER BY `id` ASC;
        END IF;
        
       ELSEIF query_type = "default_timing" THEN
        IF in_section IS NOT NULL THEN
            SELECT * FROM class_timing 
            WHERE section = in_section AND school_id="default_timing";
        ELSE
            SELECT * FROM `class_timing` WHERE school_id="default_timing" ORDER BY `id` ASC;
        END IF;  
      

    -- Update
    ELSEIF query_type = "update" THEN
        UPDATE class_timing
        SET 
            start_time = in_start_time,
            end_time = in_end_time,
            activities = in_activities,
            updated_at = NOW()
        WHERE id = in_id;

    -- Delete
    ELSEIF query_type = "delete" THEN
        DELETE FROM class_timing WHERE id = in_id;

    END IF;
END $$

DROP PROCEDURE IF EXISTS class_management $$
CREATE PROCEDURE `class_management`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_class_code` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_max_population` VARCHAR(100), IN `in_class_teacher` VARCHAR(100), IN `in_section` VARCHAR(100))
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
END $$

DROP PROCEDURE IF EXISTS class_role $$
CREATE PROCEDURE `class_role`(IN `query_type` VARCHAR(100), IN `in_class_role_id` VARCHAR(20), IN `in_teacher_id` INT, IN `in_section_id` VARCHAR(50), IN `in_class_code` VARCHAR(100), IN `in_role` ENUM('Form Master','Subject Teacher'), IN `in_class_name` VARCHAR(20), IN `in_school_id` VARCHAR(20))
BEGIN
  DECLARE current_id INT;
  DECLARE new_class_role_id VARCHAR(20);

  IF query_type = "create" THEN
    -- Generate next ID from number_generator
    SELECT code + 1 INTO current_id FROM number_generator WHERE description = 'class_role_id' FOR UPDATE;

    -- Generate formatted class_role_id: CR/XYZ/00001
    SET new_class_role_id = CONCAT('CR/', '/', LPAD(CAST(current_id AS CHAR(5)), 5, '0'));

    -- Insert into class_role table
    INSERT INTO 
    `class_role`(`teacher_id`, `section_id`, `class_code`, `role`, `class_role_id`,`class_name`,`school_id`) 
    VALUES (in_teacher_id, in_section_id, in_class_code, in_role, new_class_role_id, in_class_name,      in_school_id);

    -- Update number generator
    UPDATE number_generator SET code = current_id WHERE description = 'class_role_id';

  ELSEIF query_type = "select" THEN
    SELECT * FROM `class_role`;

  ELSEIF query_type = "byId" THEN
    SELECT * FROM `class_role` 
    WHERE `teacher_id` = in_teacher_id;

  ELSEIF query_type = "update" THEN
    -- You must pass the existing class_role_id when updating
    -- in_teacher_id is assumed to belong to the same record
    UPDATE `class_role`
    SET
      `section_id` = COALESCE(in_section_id, `section_id`),
      `class_code` = COALESCE(in_class_code, `class_code`),
      `role` = COALESCE(in_role, `role`)
    WHERE
      `teacher_id` = in_teacher_id;

  END IF;

END $$

DROP PROCEDURE IF EXISTS class_routine $$
CREATE PROCEDURE `class_routine`(IN `in_id` INT(10), IN `query_type` VARCHAR(50), IN `in_teacher` VARCHAR(50), IN `in_class_` VARCHAR(100), IN `in_section` VARCHAR(50), IN `in_day` VARCHAR(50), IN `in_start_time` TIMESTAMP(6), IN `in_end_time` TIMESTAMP(6), IN `in_class_room` VARCHAR(50))
BEGIN 
IF query_type="create" THEN
INSERT INTO `class_routine`(teacher, class_, section, day, start_time, end_time, class_room) 
VALUES (in_teacher,in_class_,in_section,in_day,in_start_time,in_end_time,in_class_room);

ELSEIF query_type='select' THEN
    SELECT * FROM `class_routine`;
    
END IF;
END $$

DROP PROCEDURE IF EXISTS cleanup_expired_otps $$
CREATE PROCEDURE `cleanup_expired_otps`()
BEGIN
  -- Clear expired OTPs
  UPDATE users
  SET
    activation_otp = NULL,
    activation_otp_expires_at = NULL
  WHERE
    activation_otp_expires_at IS NOT NULL
    AND activation_otp_expires_at < NOW();

  -- Clear expired temp tokens
  DELETE FROM activation_temp_tokens
  WHERE expires_at < NOW();

  -- Clear old rate limit windows
  DELETE FROM otp_rate_limits
  WHERE `window_end` < DATE_SUB(NOW(), INTERVAL 1 DAY);
END $$

DROP PROCEDURE IF EXISTS completeProcessPayment $$
CREATE PROCEDURE `completeProcessPayment`(IN `p_admission_no` VARCHAR(100), IN `p_ref_no` VARCHAR(30), IN `p_amount_paid` DECIMAL(10,2), IN `p_payment_method` ENUM('Cash','Bank Transfer','Card','Mobile Money','Other'), IN `p_payment_reference` VARCHAR(100), IN `p_description` VARCHAR(255), IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_parent_id` VARCHAR(100), IN `p_term` VARCHAR(100), IN `p_academic_year` VARCHAR(100), IN `p_class_code` VARCHAR(100))
BEGIN
    DECLARE receipt_no VARCHAR(50);
    DECLARE full_receipt_id VARCHAR(60);
    DECLARE credit DECIMAL(10, 2) DEFAULT 0;
    DECLARE debit DECIMAL(10, 2) DEFAULT 0;
    DECLARE actual_balance DECIMAL(10, 2);
    DECLARE actual_status VARCHAR(20);

    SET receipt_no = LPAD(FLOOR(RAND() * 10000000000), 10, '0');
    
    SET full_receipt_id = CONCAT('RCPT-', receipt_no);
    
    SELECT 
        COALESCE(SUM(cr), 0),
        COALESCE(SUM(dr), 0)
    INTO credit, debit
    FROM payment_entries 
    WHERE admission_no = p_admission_no AND ref_no = p_ref_no;
    
    SET actual_balance = credit - (debit + p_amount_paid);
    
    IF ABS(actual_balance) = 0 THEN
    SET actual_status = 'Full Payment';
	ELSEIF actual_balance < 0 THEN
    SET actual_status = 'Overpaid';
	ELSE
    SET actual_status = 'Part Payment';
	END IF;

    INSERT INTO payment_receipts(
        receipt_id,	
        admission_no,
        ref_no,	
        amount_paid,
        payment_date,
        payment_method,
        payment_reference,
        description,
        balance,
        status,
        school_id,
        branch_id,
        parent_id
    ) VALUES (
        full_receipt_id,
        p_admission_no,
        p_ref_no,
        p_amount_paid,
        CURDATE(),
        p_payment_method, 
        p_payment_reference, 
        p_description,
        actual_balance,
        actual_status,
        p_school_id,
        p_branch_id,
        p_parent_id
    );
    
  --  UPDATE payment_entries SET dr = dr + p_amount_paid WHERE admission_no = p_admission_no AND ref_no = p_ref_no;
   INSERT INTO payment_entries (
    ref_no,
    admission_no,
    class_code,
    academic_year,
    term,
    cr,
    dr,
    description,
    school_id,
    branch_id
) VALUES (
    p_ref_no,
    p_admission_no,
    p_class_code,
    p_academic_year,
    p_term,
    0.00,
    p_amount_paid,
    p_description,
    p_school_id,
    p_branch_id
);


END $$

DROP PROCEDURE IF EXISTS convert_columns_to_unicode_ci $$
CREATE PROCEDURE `convert_columns_to_unicode_ci`(IN db_name VARCHAR(255))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE t_name VARCHAR(255);
    DECLARE c_name VARCHAR(255);
    DECLARE c_type VARCHAR(255);
    DECLARE c_nullable VARCHAR(3);
    DECLARE c_default TEXT;
    DECLARE c_collation VARCHAR(255);

    DECLARE cur CURSOR FOR 
        SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = db_name
          AND DATA_TYPE IN ('varchar','text','char','tinytext','mediumtext','longtext');

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO t_name, c_name, c_type, c_nullable, c_default, c_collation;

        IF done THEN
            LEAVE read_loop;
        END IF;

        SET @default_sql = '';

        -- Handle default values safely
        IF c_default IS NOT NULL THEN
            SET @escaped_default = REPLACE(c_default, '''', '\\''');
            SET @default_sql = CONCAT(' DEFAULT ''', @escaped_default, '''');
        END IF;

        SET @stmt = CONCAT(
            'ALTER TABLE `', db_name, '`.`', t_name, 
            '` MODIFY `', c_name, '` ', c_type,
            ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
            IF(c_nullable = 'NO', ' NOT NULL', ''),
            @default_sql,
            ';'
        );

        PREPARE s FROM @stmt;
        EXECUTE s;
        DEALLOCATE PREPARE s;

    END LOOP;

    CLOSE cur;

END $$

DROP PROCEDURE IF EXISTS convert_db_to_unicode_ci $$
CREATE PROCEDURE `convert_db_to_unicode_ci`(IN db_name VARCHAR(255))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE t_name VARCHAR(255);
    DECLARE cur CURSOR FOR 
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = db_name
          AND TABLE_TYPE = 'BASE TABLE';  -- ✅ Skip views
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO t_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET @s = CONCAT(
            'ALTER TABLE `', db_name, '`.`', t_name, 
            '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
        );
        PREPARE stmt FROM @s;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    CLOSE cur;
END $$

DROP PROCEDURE IF EXISTS convert_payment_to_journal $$
CREATE PROCEDURE `convert_payment_to_journal`(IN `p_payment_entry_id` INT, IN `p_user_id` VARCHAR(50))
BEGIN
    DECLARE v_cr_amount DECIMAL(15,2);
    DECLARE v_dr_amount DECIMAL(15,2);
    DECLARE v_description TEXT;
    DECLARE v_school_id VARCHAR(20);
    DECLARE v_branch_id VARCHAR(20);
    DECLARE v_admission_no VARCHAR(50);
    DECLARE v_entry_date DATE;
    DECLARE v_ref_no VARCHAR(30);
    DECLARE v_journal_entry_id INT;
    DECLARE v_entry_number VARCHAR(50);
    DECLARE v_cash_account_id INT;
    DECLARE v_revenue_account_id INT;
    DECLARE v_expense_account_id INT;
    DECLARE v_error_msg VARCHAR(255);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        RESIGNAL SET MESSAGE_TEXT = v_error_msg;
    END;
    
    
    SELECT 
        cr, dr, description, school_id, branch_id, 
        admission_no, created_at, ref_no
    INTO 
        v_cr_amount, v_dr_amount, v_description, v_school_id, v_branch_id,
        v_admission_no, v_entry_date, v_ref_no
    FROM payment_entries 
    WHERE item_id = p_payment_entry_id;
    
    
    IF v_school_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment entry not found';
    END IF;
    
    
    SET v_entry_number = CONCAT('JE', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(p_payment_entry_id, 6, '0'));
    
    
    SELECT account_id INTO v_cash_account_id
    FROM chart_of_accounts 
    WHERE school_id = v_school_id 
    AND branch_id = v_branch_id 
    AND account_type = 'ASSET' 
    AND account_subtype = 'CASH'
    AND is_active = 1
    LIMIT 1;
    
    
    IF v_cash_account_id IS NULL THEN
        SELECT account_id INTO v_cash_account_id
        FROM chart_of_accounts 
        WHERE school_id = v_school_id 
        AND account_type = 'ASSET' 
        AND account_subtype = 'CASH'
        AND is_active = 1
        LIMIT 1;
    END IF;
    
    
    SELECT account_id INTO v_revenue_account_id
    FROM chart_of_accounts 
    WHERE school_id = v_school_id 
    AND branch_id = v_branch_id 
    AND account_type = 'REVENUE' 
    AND account_subtype = 'FEES'
    AND is_active = 1
    LIMIT 1;
    
    
    IF v_revenue_account_id IS NULL THEN
        SELECT account_id INTO v_revenue_account_id
        FROM chart_of_accounts 
        WHERE school_id = v_school_id 
        AND account_type = 'REVENUE' 
        AND account_subtype = 'FEES'
        AND is_active = 1
        LIMIT 1;
    END IF;
    
    
    SELECT account_id INTO v_expense_account_id
    FROM chart_of_accounts 
    WHERE school_id = v_school_id 
    AND branch_id = v_branch_id 
    AND account_type = 'EXPENSE' 
    AND is_active = 1
    LIMIT 1;
    
    
    IF v_expense_account_id IS NULL THEN
        SELECT account_id INTO v_expense_account_id
        FROM chart_of_accounts 
        WHERE school_id = v_school_id 
        AND account_type = 'EXPENSE' 
        AND is_active = 1
        LIMIT 1;
    END IF;
    
    
    IF v_cash_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No accounting configuration found for transaction type: Fees - Missing CASH account';
    END IF;
    
    IF v_revenue_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No accounting configuration found for transaction type: Fees - Missing REVENUE account';
    END IF;
    
    IF v_expense_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No accounting configuration found for transaction type: Items - Missing EXPENSE account';
    END IF;
    
    
    START TRANSACTION;
    
    
    INSERT INTO journal_entries (
        entry_number,
        entry_date,
        reference_type,
        reference_id,
        description,
        total_amount,
        status,
        school_id,
        branch_id,
        created_by,
        created_at
    ) VALUES (
        v_entry_number,
        v_entry_date,
        'STUDENT_PAYMENT',
        v_ref_no,
        v_description,
        GREATEST(v_cr_amount, v_dr_amount),
        'POSTED',
        v_school_id,
        v_branch_id,
        p_user_id,
        NOW()
    );
    
    SET v_journal_entry_id = LAST_INSERT_ID();
    
    
    IF v_cr_amount > 0 THEN
        
        INSERT INTO journal_entry_lines (
            entry_id, account_id, debit_amount, credit_amount, description, line_number
        ) VALUES 
        (v_journal_entry_id, v_cash_account_id, v_cr_amount, 0, v_description, 1),
        (v_journal_entry_id, v_revenue_account_id, 0, v_cr_amount, v_description, 2);
    END IF;
    
    IF v_dr_amount > 0 THEN
        
        INSERT INTO journal_entry_lines (
            entry_id, account_id, debit_amount, credit_amount, description, line_number
        ) VALUES 
        (v_journal_entry_id, v_expense_account_id, v_dr_amount, 0, v_description, 1),
        (v_journal_entry_id, v_cash_account_id, 0, v_dr_amount, v_description, 2);
    END IF;
    
    
    UPDATE payment_entries 
    SET journal_entry_id = v_journal_entry_id, is_posted = 1
    WHERE item_id = p_payment_entry_id;
    
    
    COMMIT;
    
    
    SELECT v_journal_entry_id as journal_entry_id, v_entry_number as entry_number, 'SUCCESS' as status;
    
END $$

DROP PROCEDURE IF EXISTS CreateUpdateCASetup $$
CREATE PROCEDURE `CreateUpdateCASetup`(
    IN `p_ca_type` ENUM('CA1','CA2','CA3','CA4','EXAM'),
    IN `p_overall_contribution` DECIMAL(5,2),
    IN `p_week_no` INT(4),
    IN `p_max_score` DECIMAL(5,2),
    IN `p_section` VARCHAR(20),
    IN `p_school_id` VARCHAR(15),
    IN `p_branch_id` VARCHAR(20)
)
BEGIN
    DECLARE v_section VARCHAR(20) DEFAULT NULL;
    DECLARE existing_id INT;

    -- Treat empty as NULL (generic)
    SET v_section = NULLIF(p_section, '');

    SELECT id INTO existing_id
    FROM ca_setup
    WHERE ca_type = p_ca_type
      AND branch_id = p_branch_id
      AND (
            (v_section IS NULL AND section IS NULL)
            OR (v_section IS NOT NULL AND section = v_section)
          )
    LIMIT 1;

    IF existing_id IS NULL THEN
        INSERT INTO ca_setup (
            ca_type,
            week_number,
            max_score,
            overall_contribution_percent,
            section,
            school_id,
            branch_id,
            status
        ) VALUES (
            p_ca_type,
            p_week_no,
            p_max_score,
            p_overall_contribution,
            v_section,
            p_school_id,
            p_branch_id,
            'Active'
        );
    ELSE
        UPDATE ca_setup
        SET 
            week_number = p_week_no,
            max_score = p_max_score,
            overall_contribution_percent = p_overall_contribution,
            school_id = p_school_id,
            status = 'Active',
            updated_at = NOW()
        WHERE id = existing_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS CreateUpdateGradeBoundaries $$
CREATE PROCEDURE `CreateUpdateGradeBoundaries`(
    IN `p_grade` VARCHAR(5),
    IN `p_min_percentage` DECIMAL(5,2),
    IN `p_max_percentage` DECIMAL(5,2),
    IN `p_remark` VARCHAR(50),
    IN `p_school_id` VARCHAR(20),
    IN `p_branch_id` VARCHAR(20)
)
BEGIN
    DECLARE existing_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if the grade already exists for this branch and school
    SELECT id INTO existing_id
    FROM grade_boundaries
    WHERE grade = p_grade
      AND school_id = p_school_id
      AND branch_id = p_branch_id
      AND status = 'Active'
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
        -- Update existing record
        UPDATE grade_boundaries
        SET 
            min_percentage = p_min_percentage,
            max_percentage = p_max_percentage,
            remark = p_remark,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = existing_id;
    ELSE
        -- Insert new record
        INSERT INTO grade_boundaries (
            grade,
            min_percentage,
            max_percentage,
            remark,
            school_id,
            branch_id,
            status
        ) VALUES (
            p_grade,
            p_min_percentage,
            p_max_percentage,
            p_remark,
            p_school_id,
            p_branch_id,
            'Active'
        );
    END IF;

    COMMIT;
END $$

DROP PROCEDURE IF EXISTS CreateUpdateGradeBoundariesJSON $$
CREATE PROCEDURE `CreateUpdateGradeBoundariesJSON`(
    IN `p_grades_json` LONGTEXT,
    IN `p_school_id` VARCHAR(20),
    IN `p_branch_id` VARCHAR(30)
)
BEGIN
    DECLARE v_index INT DEFAULT 0;
    DECLARE v_grade VARCHAR(10);
    DECLARE v_min DECIMAL(5,2);
    DECLARE v_max DECIMAL(5,2);
    DECLARE v_remark VARCHAR(100);
    DECLARE v_array_len INT;

    -- Get array length
    SET v_array_len = JSON_LENGTH(p_grades_json);

    -- Start transaction
    START TRANSACTION;

    -- Loop through each grade in the JSON array
    WHILE v_index < v_array_len DO
        -- Extract values
        SET v_grade = JSON_UNQUOTE(JSON_EXTRACT(p_grades_json, CONCAT('$[', v_index, '].grade')));
        SET v_min = JSON_EXTRACT(p_grades_json, CONCAT('$[', v_index, '].min_percentage'));
        SET v_max = JSON_EXTRACT(p_grades_json, CONCAT('$[', v_index, '].max_percentage'));
        SET v_remark = JSON_UNQUOTE(JSON_EXTRACT(p_grades_json, CONCAT('$[', v_index, '].remark')));

        -- Upsert: Insert or update based on unique key
        INSERT INTO grade_boundaries (
            grade, min_percentage, max_percentage, remark, school_id, branch_id
        ) VALUES (
            v_grade, v_min, v_max, v_remark, p_school_id, p_branch_id
        )
        ON DUPLICATE KEY UPDATE
            min_percentage = VALUES(min_percentage),
            max_percentage = VALUES(max_percentage),
            remark = VALUES(remark),
            updated_at = CURRENT_TIMESTAMP;

        SET v_index = v_index + 1;
    END WHILE;

    COMMIT;
END $$

DROP PROCEDURE IF EXISTS create_default_chart_of_accounts $$
CREATE PROCEDURE `create_default_chart_of_accounts`(IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_created_by` VARCHAR(50))
BEGIN
    DECLARE v_error_msg VARCHAR(255);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        RESIGNAL SET MESSAGE_TEXT = v_error_msg;
    END;
    
    
    IF p_created_by IS NULL OR p_created_by = '' THEN
        SET p_created_by = 'SYSTEM_DEFAULT';
    END IF;
    
    START TRANSACTION;
    
    
    INSERT INTO chart_of_accounts (
        account_code, account_name, account_type, account_subtype, 
        normal_balance, description, is_active, is_system_account, 
        school_id, branch_id
    ) VALUES
    
    ('1110', 'Cash and Cash Equivalents', 'ASSET', 'CASH', 'DEBIT', 'Cash on hand and in banks', 1, 1, p_school_id, p_branch_id),
    ('1120', 'Accounts Receivable', 'ASSET', 'RECEIVABLE', 'DEBIT', 'Money owed to the school', 1, 1, p_school_id, p_branch_id),
    ('1130', 'Student Fees Receivable', 'ASSET', 'RECEIVABLE', 'DEBIT', 'Outstanding student fees', 1, 1, p_school_id, p_branch_id),
    
    
    ('2110', 'Accounts Payable', 'LIABILITY', 'PAYABLE', 'CREDIT', 'Money owed by the school', 1, 1, p_school_id, p_branch_id),
    ('2120', 'Accrued Expenses', 'LIABILITY', 'ACCRUED', 'CREDIT', 'Accrued expenses payable', 1, 1, p_school_id, p_branch_id),
    
    
    ('3100', 'Retained Earnings', 'EQUITY', 'RETAINED', 'CREDIT', 'Accumulated earnings', 1, 1, p_school_id, p_branch_id),
    
    
    ('4100', 'School Fees Revenue', 'REVENUE', 'FEES', 'CREDIT', 'Student tuition and fees', 1, 1, p_school_id, p_branch_id),
    ('4110', 'Admission Fees', 'REVENUE', 'FEES', 'CREDIT', 'Student admission fees', 1, 1, p_school_id, p_branch_id),
    ('4120', 'Transport Fees', 'REVENUE', 'FEES', 'CREDIT', 'Student transport fees', 1, 1, p_school_id, p_branch_id),
    ('4130', 'Canteen Fees', 'REVENUE', 'FEES', 'CREDIT', 'Student canteen fees', 1, 1, p_school_id, p_branch_id),
    ('4200', 'Other Income', 'REVENUE', 'OTHER', 'CREDIT', 'Miscellaneous income', 1, 1, p_school_id, p_branch_id),
    
    
    ('5100', 'Personnel Expenses', 'EXPENSE', 'PERSONNEL', 'DEBIT', 'Staff salaries and wages', 1, 1, p_school_id, p_branch_id),
    ('5200', 'Utilities', 'EXPENSE', 'UTILITIES', 'DEBIT', 'Electricity, water, gas', 1, 1, p_school_id, p_branch_id),
    ('5300', 'Maintenance', 'EXPENSE', 'MAINTENANCE', 'DEBIT', 'Building and equipment maintenance', 1, 1, p_school_id, p_branch_id),
    ('5400', 'Office Supplies', 'EXPENSE', 'SUPPLIES', 'DEBIT', 'Office supplies and stationery', 1, 1, p_school_id, p_branch_id),
    ('5500', 'Transportation', 'EXPENSE', 'TRANSPORT', 'DEBIT', 'Transportation and fuel costs', 1, 1, p_school_id, p_branch_id),
    ('5900', 'Other Expenses', 'EXPENSE', 'OTHER', 'DEBIT', 'Miscellaneous expenses', 1, 1, p_school_id, p_branch_id);
    
    COMMIT;
    
    SELECT 
        ROW_COUNT() as accounts_created,
        'Default chart of accounts created successfully' as message;
        
END $$

DROP PROCEDURE IF EXISTS create_journal_entry $$
CREATE PROCEDURE `create_journal_entry`(IN `p_entry_date` DATE, IN `p_reference_type` VARCHAR(50), IN `p_reference_id` VARCHAR(50), IN `p_description` TEXT, IN `p_created_by` VARCHAR(50), IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_journal_lines` JSON, OUT `p_entry_id` INT)
BEGIN
    DECLARE v_entry_number VARCHAR(50);
    DECLARE v_total_debits DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_total_credits DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_line_count INT;
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_account_id INT;
    DECLARE v_debit_amount DECIMAL(15,2);
    DECLARE v_credit_amount DECIMAL(15,2);
    DECLARE v_line_description TEXT;
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_seq_num INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_msg;
    END;

    START TRANSACTION;

    -- Generate entry number using string operations
    SELECT COALESCE(MAX(SUBSTRING(entry_number, -6)), 0) + 1 INTO v_seq_num
    FROM journal_entries 
    WHERE school_id = p_school_id 
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND DATE(created_at) = p_entry_date;
    
    SET v_entry_number = CONCAT('JE-', p_school_id, '-', IFNULL(p_branch_id, 'MAIN'), '-', DATE_FORMAT(p_entry_date, '%Y%m%d'), '-', LPAD(v_seq_num, 6, '0'));

    -- Validate journal lines
    SET v_line_count = JSON_LENGTH(p_journal_lines);
    
    IF v_line_count < 2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Journal entry must have at least 2 lines';
    END IF;

    -- Calculate totals
    WHILE v_i < v_line_count DO
        SET v_debit_amount = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_journal_lines, CONCAT('$[', v_i, '].debit_amount'))) AS DECIMAL(15,2));
        SET v_credit_amount = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_journal_lines, CONCAT('$[', v_i, '].credit_amount'))) AS DECIMAL(15,2));
        
        SET v_total_debits = v_total_debits + COALESCE(v_debit_amount, 0);
        SET v_total_credits = v_total_credits + COALESCE(v_credit_amount, 0);
        
        SET v_i = v_i + 1;
    END WHILE;

    -- Validate balanced entry
    IF ABS(v_total_debits - v_total_credits) > 0.01 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Journal entry is not balanced. Debits must equal credits.';
    END IF;

    -- Create journal entry header
    INSERT INTO journal_entries (
        entry_number, entry_date, reference_type, reference_id, description,
        total_amount, created_by, school_id, branch_id
    ) VALUES (
        v_entry_number, p_entry_date, p_reference_type, p_reference_id, p_description,
        v_total_debits, p_created_by, p_school_id, p_branch_id
    );

    SET p_entry_id = LAST_INSERT_ID();

    -- Create journal entry lines
    SET v_i = 0;
    WHILE v_i < v_line_count DO
        SET v_account_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_journal_lines, CONCAT('$[', v_i, '].account_id'))) AS UNSIGNED);
        SET v_debit_amount = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_journal_lines, CONCAT('$[', v_i, '].debit_amount'))) AS DECIMAL(15,2));
        SET v_credit_amount = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_journal_lines, CONCAT('$[', v_i, '].credit_amount'))) AS DECIMAL(15,2));
        SET v_line_description = JSON_UNQUOTE(JSON_EXTRACT(p_journal_lines, CONCAT('$[', v_i, '].description')));

        INSERT INTO journal_entry_lines (
            entry_id, account_id, debit_amount, credit_amount, description, line_number
        ) VALUES (
            p_entry_id, v_account_id, COALESCE(v_debit_amount, 0), COALESCE(v_credit_amount, 0), 
            v_line_description, v_i + 1
        );

        SET v_i = v_i + 1;
    END WHILE;

    COMMIT;
END $$

DROP PROCEDURE IF EXISTS create_simplified_chart_of_accounts $$
CREATE PROCEDURE `create_simplified_chart_of_accounts`(IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20))
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Simplified chart of accounts for basic operations
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, description, school_id, branch_id, is_system_account) VALUES
    ('1110', 'Cash', 'ASSET', 'CASH', 'DEBIT', 'Cash on hand and in banks', p_school_id, p_branch_id, 1),
    ('1120', 'Accounts Receivable', 'ASSET', 'RECEIVABLE', 'DEBIT', 'Money owed to the school', p_school_id, p_branch_id, 1),
    ('2110', 'Accounts Payable', 'LIABILITY', 'PAYABLE', 'CREDIT', 'Money owed to suppliers', p_school_id, p_branch_id, 1),
    ('3100', 'Capital', 'EQUITY', 'CAPITAL', 'CREDIT', 'Initial capital investment', p_school_id, p_branch_id, 1),
    ('4100', 'Tuition Fees', 'REVENUE', 'FEES', 'CREDIT', 'Student tuition and fees', p_school_id, p_branch_id, 1),
    ('5100', 'Salaries and Wages', 'EXPENSE', 'SALARY', 'DEBIT', 'Staff salaries and wages', p_school_id, p_branch_id, 1),
    ('5200', 'Operating Expenses', 'EXPENSE', 'OPERATING', 'DEBIT', 'General operating expenses', p_school_id, p_branch_id, 1);

    COMMIT;
END $$

DROP PROCEDURE IF EXISTS dashboard_query $$
CREATE PROCEDURE `dashboard_query`(IN `query_type` VARCHAR(100), IN `in_branch_id` VARCHAR(50), IN `in_school_id` VARCHAR(50))
BEGIN
    -- Declare all counters
    DECLARE student_count INT DEFAULT 0;
    DECLARE active_student_count INT DEFAULT 0;
    DECLARE inactive_student_count INT DEFAULT 0;

    DECLARE teacher_count INT DEFAULT 0;
    DECLARE active_teacher_count INT DEFAULT 0;
    DECLARE inactive_teacher_count INT DEFAULT 0;

    DECLARE subject_count INT DEFAULT 0;
    DECLARE active_subject_count INT DEFAULT 0;
    DECLARE inactive_subject_count INT DEFAULT 0;

    DECLARE class_count INT DEFAULT 0;
    DECLARE active_class_count INT DEFAULT 0;
    DECLARE inactive_class_count INT DEFAULT 0;

    DECLARE pending_exams INT DEFAULT 0;
    DECLARE upcoming_exams INT DEFAULT 0;

    DECLARE parent_count INT DEFAULT 0;
    DECLARE active_parent_count INT DEFAULT 0;
    DECLARE inactive_parent_count INT DEFAULT 0;

    IF query_type = 'Select CBT Dashboard' THEN
        -- Super Admin → no filter
        IF in_school_id IS NULL OR in_branch_id IS NULL THEN
            SELECT COUNT(*) INTO student_count FROM students;
            SELECT COUNT(DISTINCT subject) INTO subject_count FROM subjects;
            SELECT COUNT(*) INTO pending_exams FROM examinations WHERE status = 'Pending';
            SELECT COUNT(*) INTO upcoming_exams FROM examinations WHERE status = 'Approved';
        ELSE
            -- Limited Analytics (school + branch)
            SELECT COUNT(*) INTO student_count 
            FROM students 
            WHERE school_id = in_school_id;

            SELECT COUNT(DISTINCT subject) INTO subject_count 
            FROM subjects 
            WHERE school_id = in_school_id;

            SELECT COUNT(*) INTO pending_exams 
            FROM examinations 
            WHERE school_id = in_school_id AND status = 'Pending';

            SELECT COUNT(*) INTO upcoming_exams 
            FROM examinations 
            WHERE school_id = in_school_id AND status = 'Approved';
        END IF;

        SELECT student_count AS total_students, pending_exams, upcoming_exams;

    ELSEIF query_type = 'dashboard-cards' THEN
        -- Limited Analytics (school + branch provided)
        IF in_school_id IS NOT NULL AND in_branch_id IS NOT NULL THEN
            -- Students
            SELECT COUNT(*) INTO student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status IN ('Active','Suspended');

            SELECT COUNT(*) INTO active_student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id 
              AND status IN ('Active');

            SELECT COUNT(*) INTO inactive_student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id 
              AND status NOT IN ('Active');

            -- Teachers
            SELECT COUNT(*) INTO teacher_count 
            FROM teachers 
            WHERE school_id = in_school_id AND branch_id = in_branch_id;

            SELECT COUNT(*) INTO active_teacher_count 
            FROM teachers 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status = 'Active';

            SELECT COUNT(*) INTO inactive_teacher_count 
            FROM teachers 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status != 'Active';

            -- Subjects
            SELECT COUNT(DISTINCT subject) INTO subject_count 
            FROM subjects 
            WHERE school_id = in_school_id;

            SELECT COUNT(DISTINCT subject) INTO active_subject_count 
            FROM subjects 
            WHERE school_id = in_school_id AND status = 'Active';

            SELECT COUNT(DISTINCT subject) INTO inactive_subject_count 
            FROM subjects 
            WHERE school_id = in_school_id AND status != 'Active';

            -- Classes
            SELECT COUNT(*) INTO class_count 
            FROM classes 
            WHERE school_id = in_school_id AND branch_id = in_branch_id;

            SELECT COUNT(*) INTO active_class_count 
            FROM classes 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status = 'Active';

            SELECT COUNT(*) INTO inactive_class_count 
            FROM classes 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status != 'Active';

            -- Parents
            SELECT COUNT(*) INTO parent_count 
            FROM parents 
            WHERE school_id = in_school_id;

            SELECT COUNT(*) INTO active_parent_count 
            FROM parents 
            WHERE school_id = in_school_id AND status = 'Active';

            SELECT COUNT(*) INTO inactive_parent_count 
            FROM parents 
            WHERE school_id = in_school_id AND status != 'Active';

        ELSEIF in_school_id IS NOT NULL AND in_branch_id IS NULL THEN
            -- School Master Admin
            SELECT COUNT(*) INTO student_count 
            FROM students 
            WHERE school_id = in_school_id AND status IN ('Active','Suspended');

            SELECT COUNT(*) INTO active_student_count 
            FROM students 
            WHERE school_id = in_school_id 
              AND status IN ('Active');

            SELECT COUNT(*) INTO inactive_student_count 
            FROM students 
            WHERE school_id = in_school_id 
              AND status NOT IN ('Active');

            -- Teachers
            SELECT COUNT(*) INTO teacher_count 
            FROM teachers 
            WHERE school_id = in_school_id;

            SELECT COUNT(*) INTO active_teacher_count 
            FROM teachers 
            WHERE school_id = in_school_id AND status = 'Active';

            SELECT COUNT(*) INTO inactive_teacher_count
            FROM teachers 
            WHERE school_id = in_school_id AND status != 'Active';

            -- Subjects
            SELECT COUNT(DISTINCT subject) INTO subject_count 
            FROM subjects 
            WHERE school_id = in_school_id;

            SELECT COUNT(DISTINCT subject) INTO active_subject_count 
            FROM subjects 
            WHERE school_id = in_school_id AND status = 'Active';

            SELECT COUNT(DISTINCT subject) INTO inactive_subject_count 
            FROM subjects 
            WHERE school_id = in_school_id AND status != 'Active';

            -- Classes
            SELECT COUNT(*) INTO class_count 
            FROM classes 
            WHERE school_id = in_school_id;

            SELECT COUNT(*) INTO active_class_count 
            FROM classes 
            WHERE school_id = in_school_id AND status = 'Active';

            SELECT COUNT(*) INTO inactive_class_count 
            FROM classes 
            WHERE school_id = in_school_id AND status != 'Active';

            -- Parents
            SELECT COUNT(*) INTO parent_count 
            FROM parents 
            WHERE school_id = in_school_id;

            SELECT COUNT(*) INTO active_parent_count 
            FROM parents 
            WHERE school_id = in_school_id AND status = 'Active';

            SELECT COUNT(*) INTO inactive_parent_count 
            FROM parents 
            WHERE school_id = in_school_id AND status != 'Active';

        ELSE
            -- Super Admin → no filter
            SELECT COUNT(*) INTO student_count FROM students;
            SELECT COUNT(*) INTO active_student_count FROM students WHERE status IN ('Active');
            SELECT COUNT(*) INTO inactive_student_count FROM students WHERE status NOT IN ('Active');

            SELECT COUNT(*) INTO teacher_count FROM teachers;
            SELECT COUNT(*) INTO active_teacher_count FROM teachers WHERE status = 'Active';
            SELECT COUNT(*) INTO inactive_teacher_count FROM teachers WHERE status != 'Active';

            SELECT COUNT(DISTINCT subject) INTO subject_count FROM subjects;
            SELECT COUNT(DISTINCT subject) INTO active_subject_count FROM subjects WHERE status = 'Active';
            SELECT COUNT(DISTINCT subject) INTO inactive_subject_count FROM subjects WHERE status != 'Active';

            SELECT COUNT(*) INTO class_count FROM classes;
            SELECT COUNT(*) INTO active_class_count FROM classes WHERE status = 'Active';
            SELECT COUNT(*) INTO inactive_class_count FROM classes WHERE status != 'Active';

            SELECT COUNT(*) INTO parent_count FROM parents;
            SELECT COUNT(*) INTO active_parent_count FROM parents WHERE status = 'Active';
            SELECT COUNT(*) INTO inactive_parent_count FROM parents WHERE status != 'Active';
        END IF;

        -- Final Result
        SELECT 
            student_count,
            active_student_count,
            inactive_student_count,
            teacher_count,
            active_teacher_count,
            inactive_teacher_count,
            subject_count,
            active_subject_count,
            inactive_subject_count,
            class_count,
            active_class_count,
            inactive_class_count,
            parent_count,
            active_parent_count,
            inactive_parent_count;
    END IF;
END $$

DROP PROCEDURE IF EXISTS data_entry_form $$
CREATE PROCEDURE `data_entry_form`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_date` DATE, IN `in_admission_number` INT(100), IN `in_class1` VARCHAR(100), IN `in_stream` VARCHAR(100), IN `in_first_name1` VARCHAR(100), IN `in_middle_name` VARCHAR(100), IN `in_surname` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_blood_group` INT(100), IN `in_email` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_street` VARCHAR(100), IN `in_city` VARCHAR(100), IN `in_first_name` VARCHAR(100), IN `in_relationship` INT(100), IN `in_mobile_no` VARCHAR(100), IN `in_address` VARCHAR(100), IN `in_street1` VARCHAR(100), IN `in_city1` VARCHAR(100), IN `in_state` VARCHAR(100))
BEGIN 
    IF query_type="create" THEN
    INSERT INTO `data_entry_form`(id, date, admission_number, class1, stream, first_name1, middle_name, surname, sex, blood_group, email, nationality, state_of_origin, home_address, street, city, first_name, relationship, mobile_no, address, street1, city1, state
    ) VALUES (in_id,in_date,in_admission_number,in_class1,in_stream,in_first_name1,in_middle_name,in_surname,in_sex,in_blood_group,in_email,in_nationality,in_state_of_origin,in_home_address,in_street,in_city,in_first_name,in_relationship,in_mobile_no,in_address,in_street1,in_city1,in_state);

    ELSEIF query_type='select' THEN
    SELECT * FROM `data_entry_form`;
    END IF;
    END $$
    
DROP PROCEDURE IF EXISTS DeactivateCASetup $$
CREATE PROCEDURE `DeactivateCASetup`(IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50))
BEGIN
    UPDATE ca_setup 
    SET is_active = FALSE 
    WHERE ca_type = p_ca_type 
      AND academic_year = p_academic_year 
      AND term = p_term;
END $$

DROP PROCEDURE IF EXISTS DeleteCAAndGradeBoundaries $$
CREATE PROCEDURE `DeleteCAAndGradeBoundaries`(
    IN `p_query_type` VARCHAR(20),
    IN `p_id` INT
)
BEGIN
    DECLARE rows_affected INT DEFAULT 0;

    -- Check the query type and perform the corresponding delete operation
    IF UPPER(p_query_type) = 'DELETE CA' THEN
        -- Delete from ca_setup table based on id
        DELETE FROM ca_setup
        WHERE id = p_id;

        SET rows_affected = ROW_COUNT();

        IF rows_affected = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No matching CA setup record found to delete.';
        END IF;

    ELSEIF UPPER(p_query_type) = 'DELETE BOUNDARY' THEN
        -- Delete from grade_boundaries table based on id
        DELETE FROM grade_boundaries
        WHERE id = p_id;

        SET rows_affected = ROW_COUNT();

        IF rows_affected = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No matching grade boundary record found to delete.';
        END IF;

    ELSE
        -- Handle invalid query type
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid p_query_type provided. Expected ''DELETE CA'' or ''DELETE BOUNDARY''.';
    END IF;

    -- Optionally return number of deleted rows
    SELECT rows_affected AS deleted_rows;

END $$

DROP PROCEDURE IF EXISTS DeleteCASetup $$
CREATE PROCEDURE `DeleteCASetup`(IN `p_id` INT)
BEGIN
    DELETE FROM ca_setup WHERE id = p_id;
END $$

DROP PROCEDURE IF EXISTS DeleteStudentScore $$
CREATE PROCEDURE `DeleteStudentScore`(IN `p_admission_no` VARCHAR(50), IN `p_ca_setup_id` INT, IN `p_subject_code` VARCHAR(10))
BEGIN
    DELETE FROM student_scores 
    WHERE admission_no = p_admission_no 
        AND ca_setup_id = p_ca_setup_id 
        AND subject_code = p_subject_code;
END $$

DROP PROCEDURE IF EXISTS end_of_term_report $$
CREATE PROCEDURE `end_of_term_report`(IN `p_query_type` VARCHAR(20), IN `p_admission_no` VARCHAR(50), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `p_class_code` VARCHAR(20))
BEGIN
    -- For specific student
    IF LOWER(p_query_type) = 'student' THEN
        SELECT *
        FROM `view_end_of_term_report`
        WHERE `admission_no` = p_admission_no
          AND `academic_year` = p_academic_year
          AND `term` = p_term
          AND `school_id` = p_school_id;

    -- For specific class (no school-wide aggregation)
    ELSEIF LOWER(p_query_type) = 'class' THEN
        SELECT *
        FROM `view_end_of_term_report`
        WHERE `class_code` = p_class_code
          AND `academic_year` = p_academic_year
          AND `term` = p_term
          AND `school_id` = p_school_id;

    -- For entire school
    ELSEIF LOWER(p_query_type) = 'school' THEN
        CALL getendoftermreport(p_academic_year, p_term, p_school_id);

    -- Invalid query_type
    ELSE
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid query_type. Use "student", "class", or "school".';
    END IF;
END $$

DROP PROCEDURE IF EXISTS entrance_exam_submission $$
CREATE PROCEDURE `entrance_exam_submission`(IN `p_subject_id` INT, IN `p_subject_name` VARCHAR(255), IN `p_school_id` INT, IN `p_section_id` INT, IN `p_academic_year` VARCHAR(50), IN `p_exam_venue` TEXT, IN `p_exam_mark` DECIMAL(5,2), IN `p_applicant_id` INT, IN `p_exam_status` VARCHAR(50))
BEGIN
    
    INSERT INTO entrance_exam (
        subject_id, subject_name, school_id, section_id, 
        acadamic_year, exam_venue, exam_mark, applicant_id, exam_status
    ) VALUES (
        p_subject_id, p_subject_name, p_school_id, p_section_id, 
        p_academic_year, p_exam_venue, p_exam_mark, p_applicant_id, p_exam_status
    );

END $$

DROP PROCEDURE IF EXISTS examinations $$
CREATE PROCEDURE `examinations`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(50), IN `in_teacher_id` VARCHAR(20), IN `in_assessment_type` VARCHAR(100), IN `in_section` VARCHAR(30), IN `in_class_name` VARCHAR(100), IN `in_class_code` VARCHAR(20), IN `in_term` VARCHAR(100), IN `in_subject_name` VARCHAR(100), IN `in_subject_code` VARCHAR(20), IN `in_commence_date` DATE, IN `in_start_time` VARCHAR(20), IN `in_end_time` VARCHAR(20), IN `in_status` VARCHAR(20), IN `in_comment` VARCHAR(200), IN `in_academic_year` VARCHAR(20), IN `in_school_id` VARCHAR(20), IN `in_branch_id` VARCHAR(20))
BEGIN
    DECLARE total_questions INT;
    DECLARE total_marks INT;

    IF query_type = "create" THEN
        SELECT COUNT(id) INTO total_questions FROM exam_questions WHERE exam_id = in_id;
        SELECT SUM(marks) INTO total_marks FROM exam_questions WHERE exam_id = in_id;

        INSERT INTO examinations (
            id, teacher_id, assessment_type, section, class_name, class_code, term,
            subject_name, subject_code, commence_date, start_time, end_time,
            status, academic_year, school_id, branch_id
        )
        VALUES (
            in_id, in_teacher_id, in_assessment_type, in_section, in_class_name, in_class_code,
            in_term, in_subject_name, in_subject_code, in_commence_date,
            in_start_time, in_end_time, in_status, in_academic_year, in_school_id, in_branch_id
        );

    ELSEIF query_type = 'select-teacher-exams' THEN
        SELECT 
            x.*,
            (SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id) AS total_questions,
            (SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id) AS total_marks,
            x.class_name, x.term, x.subject_name, x.assessment_type  
        FROM examinations x
        WHERE x.teacher_id = in_teacher_id
        AND x.status NOT IN ('Approved', 'Completed');
ELSEIF query_type = "select-student-exams" THEN
    SELECT 
        x.*,
        COUNT(DISTINCT q.id) AS total_questions,
        COALESCE(SUM(q.marks), 0) AS total_marks,
        CONCAT(x.subject_name, ' ', x.assessment_type) AS exam_name,
        CASE
            -- WHEN EXISTS (
            --     SELECT 1 FROM exam_responses er
            --     WHERE er.exam_id = x.id AND er.class_code = in_class_code
            -- ) THEN 'Completed'
            WHEN x.commence_date = CURDATE() THEN 'Pending'
            WHEN x.commence_date > CURDATE() THEN 'Upcoming'
            ELSE 'Missed'
        END AS exam_status
    FROM examinations x
    LEFT JOIN exam_questions q ON q.exam_id = x.id
    WHERE x.class_code = in_class_code 
      AND x.commence_date = CURDATE()
    --   AND EXISTS (
    --       SELECT 1 FROM exam_questions WHERE exam_id = x.id
    --   )
      AND NOT EXISTS (
          SELECT 1 FROM exam_responses er2
          WHERE er2.exam_id = x.id AND er2.admission_no = in_id
      )
    GROUP BY x.id;

    ELSEIF query_type = "select-all-exams" THEN
        SELECT 
            ec.*,
            COUNT(eq.id) AS total_questions,
            COALESCE(SUM(eq.marks), 0) AS total_marks,
            CASE 
                WHEN ec.commence_date > CURDATE() THEN 'Incoming'
                ELSE 'Completed'
            END AS exam_status
        FROM examinations ec
        LEFT JOIN exam_questions eq ON eq.exam_id = ec.id
        WHERE ec.school_id = in_school_id 
        AND ec.branch_id = in_branch_id
        GROUP BY ec.id;

    ELSEIF query_type = "Teacher Exams" THEN 
        SELECT 
            ec.*,
            COUNT(eq.id) AS total_questions,
            COALESCE(SUM(eq.marks), 0) AS total_marks
        FROM examinations ec
        LEFT JOIN exam_questions eq ON eq.exam_id = ec.id
        WHERE ec.school_id = in_school_id
        AND DATE(ec.commence_date) > CURDATE()
        AND ec.status IN ('Pending', 'Disapproved')
        GROUP BY ec.id;

    ELSEIF query_type = "Select Incoming Exams" THEN 
        SELECT 
            ec.*,
            COUNT(eq.id) AS total_questions,
            COALESCE(SUM(eq.marks), 0) AS total_marks
        FROM examinations ec
        LEFT JOIN exam_questions eq ON eq.exam_id = ec.id
        WHERE ec.school_id = in_school_id
        AND ec.branch_id = in_branch_id
        AND DATE(ec.commence_date) > CURDATE()
        GROUP BY ec.id;

    ELSEIF query_type = "Select Completed Exams" THEN 
        SELECT 
            ex.*,
            COUNT(DISTINCT eq.id) AS total_questions,
            COUNT(DISTINCT er.id) AS total_responses,
            COALESCE(SUM(eq.marks), 0) AS total_marks
        FROM examinations ex
        LEFT JOIN exam_questions eq ON eq.exam_id = ex.id
        LEFT JOIN exam_responses er ON er.exam_id = ex.id
        WHERE ex.school_id = in_school_id
        AND ex.branch_id = in_branch_id
        AND DATE(ex.commence_date) >= CURDATE()
        GROUP BY ex.id;

    ELSEIF query_type = "select" THEN 
        IF in_id IS NOT NULL AND in_id != '' THEN
            SELECT ec.* 
            FROM examinations ec
            WHERE ec.id = in_id;
        ELSEIF in_status IS NOT NULL AND in_status != '' THEN
               SELECT 
            x.*, 
            (SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id) AS total_questions,
            (SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id) AS total_marks
        FROM examinations x
        WHERE x.status = in_status
        AND x.branch_id = in_branch_id
        AND x.school_id = in_school_id;
        END IF;

        SELECT 
            x.*, 
            (SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id) AS total_questions,
            (SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id) AS total_marks
        FROM examinations x 
        WHERE x.status = in_status
        AND x.school_id = in_school_id 
        AND x.branch_id = in_branch_id;

    ELSEIF query_type = "by_id" THEN
        SELECT 
            x.*,
            (SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id) AS total_questions,
            (SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id) AS total_marks,
            CONCAT(x.subject_name, ' ', x.assessment_type) AS assessment_type  
        FROM examinations x 
        WHERE id = in_id;

    ELSEIF query_type = "select-question-options" THEN
        SELECT 
            q.id AS question_id,
            q.exam_id,
            q.question_text,
            q.question_type,
            q.question_hint,
            q.attachment_url,
            q.marks,
            CONCAT(
                '[',
                IFNULL(GROUP_CONCAT(
                    CONCAT(
                        '{"id":', o.id,
                        ',"value":"', REPLACE(o.option, '"', '\\"'),
                        '","is_correct":"', REPLACE(o.is_correct, '"', '\\"'),
                        '","marks":"', REPLACE(o.marks, '"', '\\"'),
                        '"}'
                    )
                ), ''),
                ']'
            ) AS options_json
        FROM exam_questions q
        LEFT JOIN exam_question_options o ON q.id = o.question_id
        WHERE q.exam_id = in_id
        GROUP BY 
            q.id, q.exam_id, q.question_text, q.question_type, 
            q.question_hint, q.attachment_url, q.marks;

    ELSEIF query_type = "select-questions" THEN
        SELECT 
            q.id AS question_id,
            q.exam_id,
            q.question_text,
            q.question_type,
            q.question_hint,
            q.attachment_url,
            q.marks,
            CONCAT(
                '[',
                GROUP_CONCAT(
                    CONCAT(
                        '{"id":', o.id,
                        ',"value":"', REPLACE(o.option, '\"', '\\"'),
                        '"}'
                    )
                ),
                ']'
            ) AS options_json
        FROM exam_questions q
        LEFT JOIN exam_question_options o ON q.id = o.question_id
        WHERE q.exam_id = in_id
        GROUP BY 
            q.id, q.exam_id, q.question_text, q.question_type, 
            q.question_hint, q.attachment_url, q.marks;

    ELSEIF query_type = "status" THEN 
        UPDATE examinations 
        SET status = in_status 
        WHERE id = in_id;
	ELSEIF query_type = "Select Released Exams" THEN 
        SELECT 
            ex.*,
            COUNT(DISTINCT eq.id) AS total_questions,
            COUNT(DISTINCT er.id) AS total_responses,
            COALESCE(SUM(eq.marks), 0) AS total_marks
        FROM examinations ex
        LEFT JOIN exam_questions eq ON eq.exam_id = ex.id
        LEFT JOIN exam_responses er ON er.exam_id = ex.id
        WHERE ex.school_id = in_school_id
        AND ex.branch_id = in_branch_id
        AND status ='Released'
        GROUP BY ex.id;

    ELSEIF query_type = 'update' THEN
        UPDATE examinations
        SET
            teacher_id = COALESCE(in_teacher_id, teacher_id),
            assessment_type = COALESCE(in_assessment_type, assessment_type),
            class_name = COALESCE(in_class_name, class_name),
            class_code = COALESCE(in_class_code, class_code),
            term = COALESCE(in_term, term),
            subject_name = COALESCE(in_subject_name, subject_name),
            subject_code = COALESCE(in_subject_code, subject_code),
            commence_date = COALESCE(in_commence_date, commence_date),
            start_time = COALESCE(in_start_time, start_time),
            end_time = COALESCE(in_end_time, end_time),
            `status` = COALESCE(in_status, `status`),
            section = COALESCE(in_section, `section`),
            academic_year = COALESCE(in_academic_year, academic_year),
            school_id = COALESCE(in_school_id, school_id),
            comment = COALESCE(in_comment, comment)
        WHERE id = in_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS examResponses $$
CREATE PROCEDURE `examResponses`(IN `query_type` VARCHAR(30), IN `p_id` INT(11), IN `p_exam_id` VARCHAR(100), IN `p_question_id` INT, IN `p_admission_no` VARCHAR(20), IN `p_class_name` VARCHAR(30), IN `p_class_code` VARCHAR(30), IN `p_subject_name` VARCHAR(30), IN `p_subject_code` VARCHAR(30), IN `p_response` TEXT, IN `p_attachment_url` VARCHAR(300), IN `p_score` DECIMAL(2,1), IN `p_remark` VARCHAR(255))
BEGIN
    DECLARE record_exists INT DEFAULT 0;
    DECLARE in_correct_answer TEXT;
    DECLARE question_marks INT DEFAULT 0;
    DECLARE is_correct TINYINT DEFAULT 0;
    DECLARE in_score DECIMAL(4,1) DEFAULT 0.0;
    DECLARE case_sensitive TINYINT DEFAULT 0;
    DECLARE allow_partial_credit TINYINT DEFAULT 0;

    DECLARE total_correct INT DEFAULT 0;
    DECLARE matched INT DEFAULT 0;
    DECLARE correct_option TEXT;
    DECLARE cur_index INT DEFAULT 1;

    -- Fetch metadata
    SELECT correct_answer, marks, is_case_sensitive, partial_credit
    INTO in_correct_answer, question_marks, case_sensitive, allow_partial_credit
    FROM exam_questions
    WHERE id = p_question_id;

    -- Normalize strings
    IF case_sensitive = 0 THEN
        SET p_response = LOWER(TRIM(p_response));
        SET in_correct_answer = LOWER(TRIM(in_correct_answer));
    END IF;

    -- Scoring
    IF p_response = in_correct_answer THEN
        SET is_correct = 1;
        SET in_score = question_marks;
    ELSEIF allow_partial_credit = 1 THEN
        SET total_correct = LENGTH(in_correct_answer) - LENGTH(REPLACE(in_correct_answer, ',', '')) + 1;
        SET matched = 0;
        SET cur_index = 1;

        WHILE cur_index <= total_correct DO
            SET correct_option = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(in_correct_answer, ',', cur_index), ',', -1));
            IF FIND_IN_SET(correct_option, p_response) > 0 THEN
                SET matched = matched + 1;
            END IF;
            SET cur_index = cur_index + 1;
        END WHILE;

        SET in_score = ROUND((matched / total_correct) * question_marks, 1);
        SET is_correct = 0;
    ELSE
        SET is_correct = 0;
        SET in_score = 0;
    END IF;

    -- Check for existing response
    SELECT COUNT(*)
    INTO record_exists
    FROM exam_responses
    WHERE exam_id = p_exam_id
      AND question_id = p_question_id
      AND admission_no = p_admission_no;

    -- Insert or update
    IF query_type = 'insert' THEN
        IF record_exists = 0 THEN
            INSERT INTO exam_responses (
                exam_id, question_id, admission_no, subject_name, subject_code, class_name, class_code, response, score, is_correct, attachment_url
            ) VALUES (
                p_exam_id, p_question_id, p_admission_no, p_subject_name, p_subject_code, p_class_name, p_class_code, p_response, in_score, is_correct, p_attachment_url
            );
        END IF;

    ELSEIF query_type = 'upsert' THEN
        IF record_exists = 0 THEN
            INSERT INTO exam_responses (
                exam_id, question_id, admission_no, subject_name, response, score, is_correct, attachment_url
            ) VALUES (
                p_exam_id, p_question_id, p_admission_no, p_subject_name, p_response, in_score, is_correct, p_attachment_url
            );
        ELSE
            UPDATE exam_responses
            SET response = p_response,
                score = in_score,
                is_correct = is_correct
            WHERE exam_id = p_exam_id
              AND question_id = p_question_id
              AND admission_no = p_admission_no;
        END IF;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM exam_responses
        WHERE exam_id = p_exam_id
          AND admission_no = p_admission_no;

    ELSEIF query_type = 'update' THEN
        UPDATE exam_responses
        SET
            response = COALESCE(p_response, response),
            score = COALESCE(p_score, score),
            remark = COALESCE(p_remark, remark)
        WHERE id = p_id;
       ELSEIF query_type = 'get_student_exam' THEN
        SELECT
            r.id,
            s.student_name,
            s.admission_no,
            r.question_id,
            q.question_text,
            q.question_hint,
            q.question_type,
            q.marks AS max_marks,
            r.score AS max_score,
            q.correct_answer,
            r.remark,
            GROUP_CONCAT(DISTINCT r.response) AS selected_responses,
            SUM(CASE 
                WHEN qo.is_correct = 1 THEN qo.marks 
                ELSE 0 
            END) AS earned_score,
            GROUP_CONCAT(
                CONCAT(
                    '{"response":"', qo.option,
                    '", "is_correct":', qo.is_correct,
                    ', "marks":', qo.marks, '}'
                )
            ) AS response_json
        FROM exam_responses r
        JOIN students s ON r.admission_no = s.admission_no
        JOIN exam_questions q ON r.question_id = q.id
        LEFT JOIN exam_question_options qo 
            ON qo.question_id = q.id AND FIND_IN_SET(qo.option, r.response)
        WHERE r.admission_no = p_admission_no
          AND r.exam_id = p_exam_id
        GROUP BY r.id, r.question_id, s.student_name, s.admission_no, q.question_text, q.question_type, q.marks, q.correct_answer;

    ELSEIF query_type = 'get_results' THEN
        SELECT 
            s.student_name, 
            s.admission_no,
            SUM(CASE WHEN e.is_correct > 0 THEN e.score ELSE 0 END) AS total_score,
            SUM(e.score) AS total_scores,
            SUM(CASE WHEN e.is_correct > 0 THEN 1 ELSE 0 END) AS correct_answers,
            (SELECT COUNT(*) FROM exam_questions q WHERE q.exam_id = e.exam_id) AS total_questions,
            (SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = e.exam_id) AS total_earnable_marks,
            CONCAT(u.subject_name, ' ', u.assessment_type) AS assessment_type,
            u.class_name,
            u.term,
            u.academic_year
        FROM exam_responses e
        JOIN students s ON e.admission_no = s.admission_no
        JOIN examinations u ON e.exam_id = u.id
        WHERE e.exam_id = p_exam_id
        GROUP BY s.student_name, s.admission_no, e.exam_id, u.subject_name, u.assessment_type, u.class_name, u.term, u.academic_year;

    END IF;
END $$

DROP PROCEDURE IF EXISTS exams_attendance $$
CREATE PROCEDURE `exams_attendance`(IN `query_type` VARCHAR(50), IN `_id` INT, IN `_teacher_name` VARCHAR(50), IN `_teacher_id` VARCHAR(50), IN `_exam` VARCHAR(50), IN `_class_name` VARCHAR(50), IN `_day` VARCHAR(50), IN `_status` VARCHAR(50), IN `_student_name` VARCHAR(50), IN `_admission_no` VARCHAR(50), IN `_term` VARCHAR(50), IN `_academic_year` VARCHAR(50), IN `_start_date` DATE, IN `_end_date` DATE)
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
END $$

DROP PROCEDURE IF EXISTS exam_calendar $$
CREATE PROCEDURE `exam_calendar`(IN `query_type` VARCHAR(50), IN `in_id` INT UNSIGNED, IN `in_admin_id` INT, IN `in_exam_name` VARCHAR(100), IN `in_academic_year` VARCHAR(45), IN `in_term` VARCHAR(50), IN `in_start_date` DATE, IN `in_end_date` DATE, IN `in_status` VARCHAR(30), IN `in_school_id` VARCHAR(20))
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
END $$

DROP PROCEDURE IF EXISTS exam_ca_setup $$
CREATE PROCEDURE `exam_ca_setup`(IN `in_query_type` VARCHAR(20), IN `in_ca1` TINYINT, IN `in_ca2` TINYINT, IN `in_ca3` TINYINT, IN `in_ca4` TINYINT, IN `in_exam` INT, IN `in_ca1_label` VARCHAR(50), IN `in_ca2_label` VARCHAR(50), IN `in_ca3_label` VARCHAR(50), IN `in_ca4_label` VARCHAR(50), IN `in_exam_label` VARCHAR(50), IN `in_section` VARCHAR(30), IN `in_school_id` VARCHAR(15))
BEGIN
DECLARE rows_found INT;
  DECLARE total INT;
  SET total = in_ca1 + in_ca2 + in_ca3 + in_ca4 + in_exam;

  IF in_query_type = 'CREATE' THEN
    IF total != 100 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Combined CA and Exam scores must be exactly 100';
    ELSE
      INSERT INTO exam_ca_setup (
        ca1, ca2, ca3, ca4, exam,
        ca1_label, ca2_label, ca3_label, ca4_label, exam_label,
        section, school_id
      ) VALUES (
        in_ca1, in_ca2, in_ca3, in_ca4, in_exam,
        in_ca1_label, in_ca2_label, in_ca3_label, in_ca4_label, in_exam_label,
        in_section, in_school_id
      );
    END IF;

  ELSEIF in_query_type = 'SELECT' THEN
  
  SELECT COUNT(*) INTO rows_found FROM exam_ca_setup WHERE school_id = in_school_id AND section = in_section;
    IF rows_found >0 THEN
      SELECT * FROM exam_ca_setup
      WHERE section = in_section AND school_id = in_school_id;
    ELSE
      SELECT * FROM exam_ca_setup
      WHERE section IS NULL AND school_id = in_school_id AND section = '';
    END IF;
 ELSEIF in_query_type = 'SELECT-ALL' THEN
  

      SELECT * FROM exam_ca_setup
      WHERE  school_id = in_school_id;


 
  ELSEIF in_query_type = 'UPDATE' THEN
    IF total != 100 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Combined CA and Exam scores must be exactly 100';
    ELSE
      UPDATE exam_ca_setup
      SET ca1 = in_ca1,
          ca2 = in_ca2,
          ca3 = in_ca3,
          ca4 = in_ca4,
          exam = in_exam,
          ca1_label = in_ca1_label,
          ca2_label = in_ca2_label,
          ca3_label = in_ca3_label,
          ca4_label = in_ca4_label,
          exam_label = in_exam_label
      WHERE section = in_section AND school_id = in_school_id;
    END IF;

  ELSE
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid query type provided';
  END IF;
END $$

DROP PROCEDURE IF EXISTS exam_drading $$
CREATE PROCEDURE `exam_drading`(IN `_admission_no` VARCHAR(30), IN `_student_name` VARCHAR(30), IN `_classname` VARCHAR(30), IN `_subject` VARCHAR(30), IN `_CA_marks` INT, IN `_Ass_marks` INT, IN `_exam_marks` INT, IN `_term` INT, IN `_academic_year` INT)
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
END $$

DROP PROCEDURE IF EXISTS exam_grading $$
CREATE PROCEDURE `exam_grading`(IN `query_type` VARCHAR(50), IN `_admission_no` VARCHAR(30), IN `_student_name` VARCHAR(50), IN `_classname` VARCHAR(50), IN `_subject` VARCHAR(50), IN `_CA_marks` INT, IN `_Ass_marks` INT, IN `_exam_marks` INT, IN `_term` VARCHAR(30), IN `_academic_year` VARCHAR(20))
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
END $$

DROP PROCEDURE IF EXISTS exam_questions $$
CREATE PROCEDURE `exam_questions`(IN `query_type` VARCHAR(20), IN `p_id` VARCHAR(20), IN `p_exam_id` VARCHAR(36), IN `p_question_type` VARCHAR(50), IN `p_question_text` TEXT, IN `p_attachment_url` TEXT, IN `p_question_hint` VARCHAR(255), IN `p_is_case_sensitive` TINYINT(1), IN `p_correct_answer` VARCHAR(100), IN `p_marks` DECIMAL(10,2))
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An error occurred processing the request.';
    END;

    START TRANSACTION;

    IF query_type = 'insert' THEN
        INSERT INTO exam_questions (
            exam_id, question_type, question_text, attachment_url, question_hint, is_case_sensitive, correct_answer, marks
        )
        VALUES (
            p_exam_id, p_question_type, p_question_text, p_attachment_url, p_question_hint, p_is_case_sensitive, p_correct_answer, p_marks
        );

        SELECT LAST_INSERT_ID() AS question_id;

    ELSEIF query_type = 'update' THEN
        UPDATE exam_questions
        SET 
            question_type     = COALESCE(p_question_type, question_type),
            question_text     = COALESCE(p_question_text, question_text),
            attachment_url    = COALESCE(p_attachment_url, attachment_url),
            question_hint     = COALESCE(p_question_hint, question_hint),
            is_case_sensitive = COALESCE(p_is_case_sensitive, is_case_sensitive),
            correct_answer    = COALESCE(p_correct_answer, correct_answer),
            marks             = COALESCE(p_marks, marks)
        WHERE id = p_id;

        COMMIT;
        SELECT p_id AS question_id;

    ELSEIF query_type = 'delete' THEN
        IF p_id IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Question ID required for delete';
        END IF;

        DELETE FROM exam_question_options WHERE question_id = p_id;
        DELETE FROM exam_questions WHERE id = p_id;

        SELECT p_id AS question_id;

    ELSEIF query_type = 'select' THEN
        SELECT 
            q.*,
            (
                SELECT COUNT(*) 
                FROM exam_question_options o 
                WHERE o.question_id = q.id AND o.is_correct = 'true'
            ) > 1 AS is_multi_responses, -- returns 1 if more than one correct
            (
                SELECT CONCAT(
                    '[',
                    GROUP_CONCAT(
                        CONCAT(
                            '{"id":', o.id,
                            ',"value":"', REPLACE(o.option, '"', '\"'), '"}'
                        )
                    ),
                    ']'
                )
                FROM exam_question_options o
                WHERE o.question_id = q.id
            ) AS options_json
        FROM exam_questions q
        WHERE q.exam_id = p_exam_id;

    ELSEIF query_type = 'select-options' THEN
        SELECT 
            q.*,
            (
                SELECT CONCAT(
                    '[',
                    IFNULL(GROUP_CONCAT(
                        CONCAT(
                            '{"id":', o.id,
                            ',"value":"', REPLACE(o.option, '"', '\\"'),
                            '","is_correct":"', REPLACE(o.is_correct, '"', '\\"'),
                            '","marks":"', REPLACE(o.marks, '"', '\\"'),
                            '"}'
                        )
                    ), ''),
                    ']'
                )
                FROM exam_question_options o
                WHERE o.question_id = q.id
            ) AS options_json
        FROM exam_questions q
        WHERE q.exam_id = p_exam_id;

    END IF;

    COMMIT;

END $$

DROP PROCEDURE IF EXISTS exam_question_options $$
CREATE PROCEDURE `exam_question_options`(IN `query_type` VARCHAR(30), IN `p_id` VARCHAR(20), IN `p_question_id` INT, IN `p_option` VARCHAR(200), IN `p_is_correct` VARCHAR(4), IN `p_marks` VARCHAR(4))
BEGIN
DECLARE n_marks VARCHAR(3);

    IF query_type = 'insert' THEN
    	IF p_marks ='' THEN
        SET n_marks =0;
        ELSE
        SET n_marks =p_marks;
        END IF;
        INSERT INTO `exam_question_options` (`question_id`, `option`, `is_correct`,`marks`)
        VALUES (p_question_id, p_option,p_is_correct, n_marks);

    ELSEIF query_type = 'update' THEN
        UPDATE `exam_question_options`
        SET 
            question_id = COALESCE(p_question_id, question_id),
            `option` = COALESCE(p_option, `option`),
            `is_correct` = COALESCE(p_is_correct, `is_correct`),
            `marks` = COALESCE(p_marks, `marks`)
        WHERE id = p_id;

    END IF;
END $$

DROP PROCEDURE IF EXISTS exam_remarks $$
CREATE PROCEDURE `exam_remarks`(
  IN action_type VARCHAR(10), 
  IN in_id VARCHAR(10), 
  IN in_created_by VARCHAR(20), 
  IN in_admission_no VARCHAR(20), 
  IN in_academic_year VARCHAR(9), 
  IN in_term VARCHAR(20), 
  IN in_remark_type VARCHAR(20), 
  IN in_remark VARCHAR(500)
)
BEGIN
  IF action_type = 'CREATE' THEN
    INSERT INTO exam_remarks (created_by, admission_no, academic_year, term, remark_type, remark)
    VALUES (in_created_by, in_admission_no, in_academic_year, in_term, in_remark_type, in_remark)
    ON DUPLICATE KEY UPDATE
      created_by = VALUES(created_by),
      remark = VALUES(remark);

  ELSEIF action_type = 'SELECT' THEN
    SELECT * FROM exam_remarks
    WHERE remark_type = in_remark_type 
      AND admission_no = in_admission_no 
      AND academic_year = in_academic_year 
      AND term = in_term;

  ELSE 
    SELECT 'Invalid action_type. Use CREATE or SELECT.' AS message;
  END IF;
END $$

DROP PROCEDURE IF EXISTS exam_subject $$
CREATE PROCEDURE `exam_subject`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_score` INT(100), IN `in_status` VARCHAR(100))
BEGIN 
IF query_type="create" THEN
INSERT INTO `exams_subject`(id, application_no, subject, score, status)
VALUES (in_id,in_application_no,in_subject,in_score,in_status);

ELSEIF query_type="select" THEN
SELECT * FROM `exams_subject`;
END IF;
END $$

DROP PROCEDURE IF EXISTS exam_subjects $$
CREATE PROCEDURE `exam_subjects`(IN `query_type` VARCHAR(100), IN `in_id` INT(100), IN `in_application_no` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_score` INT(100), IN `in_status` VARCHAR(100))
BEGIN 
IF query_type="create" THEN
INSERT INTO exams_subject(application_no, subject)
VALUES (in_application_no,in_subject);

ELSEIF query_type="update" AND in_application_no IS NOT NULL AND in_application_no !='' THEN
	UPDATE exams_subject SET status = in_status, score=in_score WHERE application_no =in_application_no;
ELSEIF query_type="select" THEN
	SELECT * FROM exams_subject;
END IF;
END $$

DROP PROCEDURE IF EXISTS exam_table $$
CREATE PROCEDURE `exam_table`(IN `query_type` VARCHAR(100), IN `in_id` INT, IN `in_exam_id` CHAR(100), IN `in_question_id` CHAR(100), IN `in_student_id` VARCHAR(50), IN `in_class_name` VARCHAR(100), IN `in_question` VARCHAR(300), IN `in_selected_option` VARCHAR(200), IN `in_response` VARCHAR(200), IN `in_answer` VARCHAR(200), IN `in_mark` INT(100), IN `in_remarks` VARCHAR(200), IN `in_subject` VARCHAR(50))
BEGIN
IF query_type = "create" THEN
INSERT INTO `exam_table` (exam_id,question_id,student_id,class_name,question,selected_option,response,answer,mark,remarks,subject)
VALUES(in_exam_id,in_question_id,in_student_id,in_class_name,in_question,in_selected_option,in_response,in_answer,in_mark,in_remarks,in_subject);

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
    
    -- Total score (marks for correct answers)
    SUM(CASE WHEN e.remarks = 'correct' THEN e.mark ELSE 0 END) AS total_score,
    
    -- Total marks for all answered questions
    SUM(e.mark) AS total_marks,

    -- Count of correct answers
    SUM(CASE WHEN e.remarks = 'correct' THEN 1 ELSE 0 END) AS correct_answers,

    -- Total number of questions for the exam
    (SELECT COUNT(*) FROM exam_questions q WHERE q.exam_id = e.exam_id) AS total_questions,

    -- Additional exam info
    CONCAT(u.subject_name, ' ', u.assessment_type) AS assessment_type,
    u.class_name,
    u.term

FROM 
    exam_table e

JOIN 
    students s ON e.student_id = s.admission_no

JOIN 
    exam_creation u ON e.exam_id = u.id

WHERE 
    e.exam_id = in_exam_id

GROUP BY 
    s.student_name, 
    s.admission_no, 
    e.exam_id, 
    u.subject_name, 
    u.assessment_type, 
    u.class_name, 
    u.term;

END IF;
END $$

DROP PROCEDURE IF EXISTS GenerateCAReport $$
CREATE PROCEDURE `GenerateCAReport`(IN `p_class_code` VARCHAR(20), IN `p_subject_code` VARCHAR(20), IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50))
BEGIN
    SELECT 
        s.admission_no,
        s.student_name,
        s.class_code,
        s.subject_code,
        s.subject_name,
        -- Dynamic week scores (hardcoded for 4 weeks as example)
        MAX(CASE WHEN ca.week_number = 1 THEN COALESCE(ws.score, 0) END) as week_1_score,
        MAX(CASE WHEN ca.week_number = 2 THEN COALESCE(ws.score, 0) END) as week_2_score,
        MAX(CASE WHEN ca.week_number = 3 THEN COALESCE(ws.score, 0) END) as week_3_score,
        MAX(CASE WHEN ca.week_number = 4 THEN COALESCE(ws.score, 0) END) as week_4_score,
        -- CA calculations
        SUM(COALESCE(ws.score, 0)) as ca_total,
        (SUM(COALESCE(ws.score, 0)) / 
         (SELECT SUM(max_score) FROM ca_setup 
          WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE)
        ) * 100 as ca_percentage,
        (SUM(COALESCE(ws.score, 0)) / 
         (SELECT SUM(max_score) FROM ca_setup 
          WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE)
        ) * 100 * 
        (SELECT DISTINCT overall_contribution_percent FROM ca_setup 
         WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE LIMIT 1
        ) / 100 as overall_contribution,
        -- Dynamic grade from grade_boundaries
        (SELECT gb.grade 
         FROM grade_boundaries gb
         WHERE gb.ca_type = p_ca_type
           AND gb.academic_year = p_academic_year
           AND gb.term = p_term
           AND gb.is_active = TRUE
           AND (SUM(COALESCE(ws.score, 0)) / 
                (SELECT SUM(max_score) FROM ca_setup 
                 WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE)
               ) * 100 >= gb.min_percentage
           AND (SUM(COALESCE(ws.score, 0)) / 
                (SELECT SUM(max_score) FROM ca_setup 
                 WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE)
               ) * 100 <= gb.max_percentage
         LIMIT 1) as grade,
        NOW() as report_generated_at,
        p_ca_type as assessment_type -- Pass ca_type as assessment_type
    FROM student_subjects_view s
    LEFT JOIN ca_setup ca ON (
        ca.ca_type = p_ca_type
        AND ca.academic_year = p_academic_year
        AND ca.term = p_term
        AND ca.is_active = TRUE
    )
    LEFT JOIN weekly_scores ws ON (
        ws.student_admission_no = s.admission_no 
        AND ws.subject_code = s.subject_code 
        AND ws.ca_setup_id = ca.id
        AND ws.assessment_type = p_ca_type
    )
    WHERE s.class_code = p_class_code 
      AND s.subject_code = p_subject_code
    GROUP BY s.admission_no, s.student_name, s.class_code, s.subject_code, s.subject_name
    ORDER BY s.student_name ASC;
END $$

DROP PROCEDURE IF EXISTS generate_academic_weeks $$
CREATE PROCEDURE `generate_academic_weeks`(
  IN p_academic_year VARCHAR(50), 
  IN p_term VARCHAR(20), 
  IN p_begin_date DATE, 
  IN p_end_date DATE, 
  IN in_branch_id VARCHAR(30), 
  IN in_school_id VARCHAR(30)
)
BEGIN
  DECLARE start_date DATE;
  DECLARE end_date DATE;
  DECLARE week_num INT DEFAULT 1;

  -- 1. Clean old rows completely (safe re-generate)
  DELETE FROM academic_weeks
  WHERE academic_year = p_academic_year
    AND term = p_term
    AND school_id = in_school_id
    AND branch_id = in_branch_id;

  -- 2. Start generating weeks
  SET start_date = p_begin_date;

  WHILE start_date <= p_end_date DO

    SET end_date = LEAST(DATE_ADD(start_date, INTERVAL 6 DAY), p_end_date);

    INSERT INTO academic_weeks (
      week_number, academic_year, term, weeks, begin_date, end_date, school_id, branch_id
    )
    VALUES (
      week_num,
      p_academic_year,
      p_term,
      CONCAT('Week ', week_num),
      start_date,
      end_date,
      in_school_id,
      in_branch_id
    );

    SET start_date = DATE_ADD(end_date, INTERVAL 1 DAY);
    SET week_num = week_num + 1;

  END WHILE;

END $$

DROP PROCEDURE IF EXISTS generate_activation_otp $$
CREATE PROCEDURE `generate_activation_otp`(
  IN p_user_id INT,
  IN p_user_type VARCHAR(50),
  IN p_school_id VARCHAR(50),
  IN p_branch_id VARCHAR(50),
  OUT p_otp VARCHAR(6),
  OUT p_expires_at DATETIME
)
BEGIN
  DECLARE v_otp VARCHAR(6);
  DECLARE v_expires_at DATETIME;

  -- Generate 6-digit OTP
  SET v_otp = LPAD(FLOOR(100000 + (RAND() * 900000)), 6, '0');

  -- Set expiry time (5 minutes from now)
  SET v_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE);

  -- Update user with OTP
  UPDATE users
  SET
    activation_otp = v_otp,
    activation_otp_expires_at = v_expires_at,
    activation_otp_attempts = 0
  WHERE id = p_user_id;

  -- Log OTP generation
  INSERT INTO account_activation_logs (
    user_id,
    user_type,
    action,
    otp_code,
    status,
    school_id,
    branch_id
  ) VALUES (
    p_user_id,
    p_user_type,
    'otp_sent',
    v_otp,
    'success',
    p_school_id,
    p_branch_id
  );

  -- Return OTP and expiry
  SET p_otp = v_otp;
  SET p_expires_at = v_expires_at;
END $$

DROP PROCEDURE IF EXISTS generate_admission_no_for_returning_students $$
CREATE PROCEDURE `generate_admission_no_for_returning_students`(IN `student_id` VARCHAR(30), IN `sch_id` VARCHAR(30), IN `branch` VARCHAR(30))
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
END $$

DROP PROCEDURE IF EXISTS generate_balance_sheet $$
CREATE PROCEDURE `generate_balance_sheet`(IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_as_of_date` DATE)
BEGIN
    -- Assets
    SELECT 
        'ASSETS' as section,
        coa.account_code,
        coa.account_name,
        coa.account_subtype,
        CASE 
            WHEN coa.normal_balance = 'DEBIT' THEN COALESCE(ab.current_balance, 0)
            ELSE -COALESCE(ab.current_balance, 0)
        END AS amount
    FROM chart_of_accounts coa
    LEFT JOIN account_balances ab ON coa.account_id = ab.account_id 
        AND ab.school_id = p_school_id
        AND (p_branch_id IS NULL OR ab.branch_id = p_branch_id)
    WHERE coa.school_id = p_school_id 
        AND (p_branch_id IS NULL OR coa.branch_id = p_branch_id)
        AND coa.account_type = 'ASSET'
        AND coa.is_active = 1
    
    UNION ALL
    
    -- Liabilities
    SELECT 
        'LIABILITIES' as section,
        coa.account_code,
        coa.account_name,
        coa.account_subtype,
        CASE 
            WHEN coa.normal_balance = 'CREDIT' THEN COALESCE(ab.current_balance, 0)
            ELSE -COALESCE(ab.current_balance, 0)
        END AS amount
    FROM chart_of_accounts coa
    LEFT JOIN account_balances ab ON coa.account_id = ab.account_id 
        AND ab.school_id = p_school_id
        AND (p_branch_id IS NULL OR ab.branch_id = p_branch_id)
    WHERE coa.school_id = p_school_id 
        AND (p_branch_id IS NULL OR coa.branch_id = p_branch_id)
        AND coa.account_type = 'LIABILITY'
        AND coa.is_active = 1
    
    UNION ALL
    
    -- Equity
    SELECT 
        'EQUITY' as section,
        coa.account_code,
        coa.account_name,
        coa.account_subtype,
        CASE 
            WHEN coa.normal_balance = 'CREDIT' THEN COALESCE(ab.current_balance, 0)
            ELSE -COALESCE(ab.current_balance, 0)
        END AS amount
    FROM chart_of_accounts coa
    LEFT JOIN account_balances ab ON coa.account_id = ab.account_id 
        AND ab.school_id = p_school_id
        AND (p_branch_id IS NULL OR ab.branch_id = p_branch_id)
    WHERE coa.school_id = p_school_id 
        AND (p_branch_id IS NULL OR coa.branch_id = p_branch_id)
        AND coa.account_type = 'EQUITY'
        AND coa.is_active = 1
    
    ORDER BY section, account_code;
END $$

DROP PROCEDURE IF EXISTS generate_income_statement $$
CREATE PROCEDURE `generate_income_statement`(IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_start_date` DATE, IN `p_end_date` DATE)
BEGIN
    -- Revenue
    SELECT 
        'REVENUE' as section,
        coa.account_code,
        coa.account_name,
        coa.account_subtype,
        SUM(CASE 
            WHEN coa.normal_balance = 'CREDIT' THEN gl.credit_amount - gl.debit_amount
            ELSE gl.debit_amount - gl.credit_amount
        END) AS amount
    FROM chart_of_accounts coa
    LEFT JOIN general_ledger gl ON coa.account_id = gl.account_id 
        AND gl.school_id = p_school_id
        AND (p_branch_id IS NULL OR gl.branch_id = p_branch_id)
        AND gl.transaction_date BETWEEN p_start_date AND p_end_date
    WHERE coa.school_id = p_school_id 
        AND (p_branch_id IS NULL OR coa.branch_id = p_branch_id)
        AND coa.account_type = 'REVENUE'
        AND coa.is_active = 1
    GROUP BY coa.account_id, coa.account_code, coa.account_name, coa.account_subtype
    HAVING amount != 0
    
    UNION ALL
    
    -- Expenses
    SELECT 
        'EXPENSES' as section,
        coa.account_code,
        coa.account_name,
        coa.account_subtype,
        SUM(CASE 
            WHEN coa.normal_balance = 'DEBIT' THEN gl.debit_amount - gl.credit_amount
            ELSE gl.credit_amount - gl.debit_amount
        END) AS amount
    FROM chart_of_accounts coa
    LEFT JOIN general_ledger gl ON coa.account_id = gl.account_id 
        AND gl.school_id = p_school_id
        AND (p_branch_id IS NULL OR gl.branch_id = p_branch_id)
        AND gl.transaction_date BETWEEN p_start_date AND p_end_date
    WHERE coa.school_id = p_school_id 
        AND (p_branch_id IS NULL OR coa.branch_id = p_branch_id)
        AND coa.account_type = 'EXPENSE'
        AND coa.is_active = 1
    GROUP BY coa.account_id, coa.account_code, coa.account_name, coa.account_subtype
    HAVING amount != 0
    
    ORDER BY section, account_code;
END $$

DROP PROCEDURE IF EXISTS generate_trial_balance $$
CREATE PROCEDURE `generate_trial_balance`(IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_as_of_date` DATE)
BEGIN
    SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        CASE 
            WHEN coa.normal_balance = 'DEBIT' AND ab.current_balance >= 0 THEN ab.current_balance
            WHEN coa.normal_balance = 'DEBIT' AND ab.current_balance < 0 THEN 0
            ELSE 0
        END AS debit_balance,
        CASE 
            WHEN coa.normal_balance = 'CREDIT' AND ab.current_balance >= 0 THEN ab.current_balance
            WHEN coa.normal_balance = 'CREDIT' AND ab.current_balance < 0 THEN 0
            WHEN coa.normal_balance = 'DEBIT' AND ab.current_balance < 0 THEN ABS(ab.current_balance)
            ELSE 0
        END AS credit_balance,
        ab.current_balance
    FROM chart_of_accounts coa
    LEFT JOIN account_balances ab ON coa.account_id = ab.account_id 
        AND ab.school_id = p_school_id
        AND (p_branch_id IS NULL OR ab.branch_id = p_branch_id)
    LEFT JOIN general_ledger gl ON coa.account_id = gl.account_id 
        AND gl.school_id = p_school_id 
        AND (p_branch_id IS NULL OR gl.branch_id = p_branch_id)
        AND gl.transaction_date <= p_as_of_date
    WHERE coa.school_id = p_school_id 
        AND (p_branch_id IS NULL OR coa.branch_id = p_branch_id)
        AND coa.is_active = 1
        AND (ab.current_balance IS NOT NULL AND ab.current_balance != 0)
    GROUP BY coa.account_id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance, ab.current_balance
    ORDER BY coa.account_code;
END $$

DROP PROCEDURE IF EXISTS genericSchoolFees $$
CREATE PROCEDURE `genericSchoolFees`(IN `query_type` VARCHAR(20), IN `in_id` INT, IN `in_section` VARCHAR(50), IN `in_description` VARCHAR(100), IN `in_class_name` VARCHAR(50), IN `in_fees` DECIMAL(8,2), IN `in_term` VARCHAR(50), IN `in_academic_year` VARCHAR(9), IN `in_status` ENUM('Active','Inactive'), IN `in_created_by` VARCHAR(50), IN `in_school_id` VARCHAR(20))
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
END $$

DROP PROCEDURE IF EXISTS GetAcademicReport $$
CREATE PROCEDURE `GetAcademicReport`(IN `query_type` VARCHAR(20), IN `p_admission_no` VARCHAR(50), IN `p_class_code` VARCHAR(30), IN `p_school_id` VARCHAR(20), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50))
BEGIN
    -- Declare variables at the top
    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_class_exists INT DEFAULT 0;
    DECLARE v_year VARCHAR(20);
    DECLARE v_term_val VARCHAR(50);

    -- Error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 
            'error' AS status,
            'An error occurred while processing the request.' AS message;
    END;

    -- Apply default values
    SET v_year = IFNULL(p_academic_year, '2025/2026');
    SET v_term_val = IFNULL(p_term, 'First Term');

    START TRANSACTION;

    IF query_type = 'student' THEN

        -- Check if student exists
        SELECT COUNT(*) INTO v_student_exists 
        FROM students 
        WHERE admission_no = p_admission_no;

        IF v_student_exists = 0 THEN
            SELECT 
                'error' AS status,
                'Student not found with the provided admission number' AS message,
                NULL AS student_info,
                NULL AS subjects_data;
        ELSE
            -- Return student basic info
            SELECT 
                'success' AS status,
                'Student report retrieved successfully' AS message,
                JSON_OBJECT(
                    'admission_no', s.admission_no,
                    'student_name', s.student_name,
                    'class_name', s.class_name,
                    'class_code', s.current_class,
                    'school_id', s.school_id,
                    'section', s.section,

                    'academic_year', v_year,
                    'term', v_term_val
                ) AS student_info
            FROM students s
            WHERE s.admission_no = p_admission_no;

            -- Return subjects performance
            SELECT
                admission_no,
                student_name,
                class_name,
                class_code,
                school_id,
                section,
                subject_code,
                subject,
                academic_year,
                term,
                ca1_score,
                ca2_score,
                ca3_score,
                exam_score,
                total_score,
                total_max_score,
                raw_percentage,
                average_percentage,
                class_avg_ca1,
                class_avg_ca2,
                class_avg_ca3,
                class_avg_exam,
                class_average,
                class_raw_average,
                grade,
                remark,
                position,
                total_students,
                position_display,
                ca_breakdown,
                total_assessments
            FROM view_end_of_term_report
            WHERE admission_no = p_admission_no
              AND academic_year = v_year
              AND term = v_term_val
            ORDER BY subject;
        END IF;

    ELSEIF query_type = 'class' THEN

        -- Check if class exists
        SELECT COUNT(*) INTO v_class_exists 
        FROM classes 
        WHERE class_code = p_class_code AND school_id = p_school_id;

        IF v_class_exists = 0 THEN
            SELECT 
                'error' AS status,
                'Class not found with the provided class code and school ID' AS message;
        ELSE
            -- Return class summary
            SELECT
                class_name,
                class_code,
                school_id,
                subject,
                academic_year,
                term,
                total_students_assessed,
                class_average,
                avg_ca1,
                avg_ca2,
                avg_ca3,
                avg_exam,
                excellent_count,
                good_count,
                fair_count,
                pass_count,
                fail_count,
                pass_rate
            FROM view_class_performance_summary
            WHERE class_code = p_class_code 
              AND school_id = p_school_id
              AND academic_year = v_year
              AND term = v_term_val
            ORDER BY subject;
        END IF;

    ELSE
        SELECT 
            'error' AS status,
            'Invalid query_type. Use ''student'' or ''class''.' AS message;
    END IF;

    COMMIT;
END $$

DROP PROCEDURE IF EXISTS GetAcademicWeeks $$
CREATE PROCEDURE `GetAcademicWeeks`(IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50), IN `p_start_month` VARCHAR(7), IN `p_end_month` VARCHAR(7))
BEGIN
    DECLARE v_limit INT;

    -- Step 1: Get the number of active CA setups
    SELECT COUNT(*) INTO v_limit
    FROM ca_setup 
    WHERE ca_type = p_ca_type 
      AND academic_year = p_academic_year 
      AND term = p_term 
      AND is_active = TRUE;

    -- Step 2: Preprocess CA setups with row numbers
    CREATE TEMPORARY TABLE tmp_ca_setup AS
    SELECT 
        cs.*,
        ROW_NUMBER() OVER (
            PARTITION BY ca_type, academic_year, term 
            ORDER BY cs.week_number ASC
        ) AS rn
    FROM ca_setup cs
    WHERE cs.ca_type = p_ca_type
      AND cs.academic_year = p_academic_year
      AND cs.term = p_term
      AND cs.is_active = TRUE;

    -- Step 3: Query academic weeks and join with temp table
    SELECT 
        aw.id AS academic_week_id,
        aw.week_number AS academic_week_number,
        aw.academic_year,
        aw.term,
        aw.weeks,
        aw.begin,
        aw.end,
        ca.id AS ca_setup_id,
        ca.week_number AS ca_week_number,
        ca.max_score,
        ca.overall_contribution_percent,
        ca.ca_type
    FROM Academic_weeks aw
    INNER JOIN (
        SELECT * FROM tmp_ca_setup
    ) ca ON ca.rn = aw.week_number
    WHERE (
        (DATE(aw.begin) >= DATE(CONCAT(p_start_month, '-01')) 
         AND DATE(aw.begin) <= LAST_DAY(CONCAT(p_end_month, '-01')))
        OR 
        (DATE(aw.end) >= DATE(CONCAT(p_start_month, '-01')) 
         AND DATE(aw.end) <= LAST_DAY(CONCAT(p_end_month, '-01')))
    )
    AND aw.academic_year = p_academic_year
    AND aw.term = p_term
    ORDER BY aw.begin ASC
    LIMIT v_limit;

    -- Cleanup
    DROP TEMPORARY TABLE tmp_ca_setup;
END $$

DROP PROCEDURE IF EXISTS GetAcademicWeeksByDateRange $$
CREATE PROCEDURE `GetAcademicWeeksByDateRange`(
    IN `p_start_date` DATE,
    IN `p_end_date` DATE,
    IN `p_school_id` VARCHAR(20),
    IN `p_branch_id` VARCHAR(50)
)
BEGIN
  SELECT 
    aw.id AS week_id,
    aw.week_number,
    aw.begin_date,
    aw.end_date,

    -- Generate day letters (U for Sunday, otherwise first letter of weekday)
    CONCAT_WS('|',
      CASE WHEN DAYNAME(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 1 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 1 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 2 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 2 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 3 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 3 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 4 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 4 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 5 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 5 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 6 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(aw.begin_date, INTERVAL (1 - DAYOFWEEK(aw.begin_date)) + 6 DAY)), 1) END
    ) AS day_letters,

    -- Generate day numbers
    CONCAT_WS('|',
      DAY(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 1 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 2 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 3 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 4 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 5 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 6 DAY))
    ) AS day_numbers,

    -- Generate full date list
    CONCAT_WS('|',
      DATE_FORMAT(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 1 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 2 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 3 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 4 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 5 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 6 DAY), '%Y-%m-%d')
    ) AS full_dates

  FROM academic_weeks aw
  WHERE aw.status = 'Active'
    AND aw.school_id = p_school_id
    AND aw.branch_id = p_branch_id
    AND aw.begin_date <= p_end_date
    AND aw.end_date >= p_start_date
  ORDER BY aw.begin_date;
END $$

DROP PROCEDURE IF EXISTS GetAcademicWeeksByMonth $$
CREATE PROCEDURE `GetAcademicWeeksByMonth`(
    IN `p_year` INT,
    IN `p_month` INT,
    IN `p_school_id` VARCHAR(20),
    IN `p_academic_year` VARCHAR(10)
)
BEGIN
  SELECT 
    aw.id AS week_id,
    aw.week_number,
    aw.begin_date,
    aw.end_date,

    -- Generate day letters (U for Sunday, otherwise first letter of weekday)
    CONCAT_WS('|',
      CASE WHEN DAYNAME(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 1 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 1 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 2 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 2 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 3 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 3 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 4 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 4 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 5 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 5 DAY)), 1) END,
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 6 DAY)) = 'Sunday' THEN 'U' 
           ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 6 DAY)), 1) END
    ) AS day_letters,

    -- Generate day numbers (1–31)
    CONCAT_WS('|',
      DAY(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 1 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 2 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 3 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 4 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 5 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 6 DAY))
    ) AS day_numbers,

    -- Generate full date list for the week
    CONCAT_WS('|',
      DATE_FORMAT(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 1 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 2 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 3 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 4 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 5 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin_date, INTERVAL (DAYOFWEEK(aw.begin_date) - 1) DAY), INTERVAL 6 DAY), '%Y-%m-%d')
    ) AS full_dates

  FROM academic_weeks aw
  WHERE aw.status = 'Active'
    AND aw.school_id = p_school_id
    AND aw.academic_year = p_academic_year
    AND (
      (YEAR(aw.begin_date) = p_year AND MONTH(aw.begin_date) = p_month)
      OR (YEAR(aw.end_date) = p_year AND MONTH(aw.end_date) = p_month)
      OR (
        aw.begin_date <= LAST_DAY(STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d'))
        AND aw.end_date >= STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d')
      )
    )
  ORDER BY aw.begin_date;
END $$

DROP PROCEDURE IF EXISTS GetAllCASetups $$
CREATE PROCEDURE `GetAllCASetups`(IN `in_branch_id` VARCHAR(20))
BEGIN
    SELECT 
        COALESCE(ca.section, 'All') AS section,
        ca.ca_type,
        ca.status,
        COUNT(ca.week_number) AS week_count,
        SUM(ca.max_score) AS total_max_score,
        AVG(ca.overall_contribution_percent) AS contribution_percent,
        MIN(ca.created_at) AS created_at,
        GROUP_CONCAT(
            CONCAT('W', ca.week_number, ':', ca.max_score)
            ORDER BY ca.week_number SEPARATOR ', '
        ) AS week_breakdown
    FROM ca_setup ca
    WHERE ca.status = 'Active'
      AND ca.branch_id = in_branch_id
      AND (
            ca.section IS NULL
            OR ca.section IN (
                SELECT DISTINCT s.section
                FROM ca_setup s
                WHERE s.branch_id = in_branch_id
              )
          )
    GROUP BY ca.section, ca.ca_type, ca.status
    ORDER BY ca.section, ca.ca_type;
END $$

DROP PROCEDURE IF EXISTS GetAttendanceByDateRange $$
CREATE PROCEDURE `GetAttendanceByDateRange`(
    IN `p_class_code` VARCHAR(20),
    IN `p_start_date` DATE,
    IN `p_end_date` DATE
)
BEGIN
  SELECT 
    ar.admission_no,
    s.student_name,
    s.admission_no,
    ar.attendance_date,
    ar.day_of_week,
    ar.status,
    ar.notes,
    ar.marked_at,
    aw.week_number,
    aw.begin_date AS week_start,
    aw.end_date AS week_end
  FROM attendance_records ar
  JOIN students s ON ar.admission_no = s.admission_no
  JOIN academic_weeks aw ON ar.academic_week_id = aw.id
  WHERE ar.class_code = p_class_code
    AND ar.attendance_date BETWEEN p_start_date AND p_end_date
  ORDER BY s.student_name, ar.attendance_date;
END $$

DROP PROCEDURE IF EXISTS GetAttendanceByMonth $$
CREATE PROCEDURE `GetAttendanceByMonth`(IN `p_class_code` VARCHAR(20), IN `p_year` INT, IN `p_month` INT)
BEGIN
  SELECT 
    ar.admission_no,
    s.student_name,
    s.admission_no,
    ar.attendance_date,
    ar.day_of_week,
    ar.status,
    ar.notes,
    ar.marked_at,
    aw.week_number,
    aw.begin_date AS week_start,
    aw.end_date AS week_end
  FROM attendance_records ar
  JOIN students s ON ar.admission_no = s.admission_no
  JOIN academic_weeks aw ON ar.academic_week_id = aw.id
  WHERE ar.class_code = p_class_code
    AND YEAR(ar.attendance_date) = p_year
    AND MONTH(ar.attendance_date) = p_month
  ORDER BY s.student_name, ar.attendance_date;
END $$

DROP PROCEDURE IF EXISTS GetAttendanceSummaryReport $$
CREATE PROCEDURE `GetAttendanceSummaryReport`(IN `p_class_code` VARCHAR(20), IN `p_year` INT, IN `p_month` INT)
BEGIN
  DECLARE v_month_start DATE;
  SET v_month_start = STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d');

  SELECT 
    s.admission_no,
    s.student_name,
    s.admission_no,
    COALESCE(asum.total_days, 0),
    COALESCE(asum.present_days, 0),
    COALESCE(asum.absent_days, 0),
    COALESCE(asum.late_days, 0),
    COALESCE(asum.excused_days, 0),
    COALESCE(asum.dismissed_days, 0),
    COALESCE(asum.attendance_percentage, 0)
  FROM students s
  LEFT JOIN attendance_summary asum 
    ON s.admission_no = asum.admission_no 
    AND asum.class_code = p_class_code 
    AND asum.month = v_month_start
  WHERE s.current_class = p_class_code
  ORDER BY s.admission_no;
END $$

DROP PROCEDURE IF EXISTS GetCASetup $$
CREATE PROCEDURE `GetCASetup`(
    IN `p_ca_type` ENUM('CA1','CA2','CA3','CA4','EXAM'),
    IN `p_school_id` VARCHAR(20),
    IN `p_branch_id` VARCHAR(30),
    IN `p_academic_year` VARCHAR(20),
    IN `p_term` VARCHAR(20),
    IN `p_section` VARCHAR(20)
)
BEGIN
    IF p_section IS NOT NULL THEN
        SELECT 
            cs.id,
            cs.ca_type,
            cs.week_number,
            cs.max_score,
            cs.overall_contribution_percent,
            cs.status,
            cs.section,
            p_academic_year AS academic_year,
            p_term AS term,
            aw.begin_date AS week_begin_date,
            aw.end_date AS week_end_date
        FROM ca_setup cs
        LEFT JOIN academic_weeks aw 
            ON cs.week_number = aw.week_number
            AND cs.school_id = aw.school_id
            AND cs.branch_id = aw.branch_id
            AND aw.academic_year = p_academic_year
            AND aw.term = p_term
            AND aw.status = 'Active'
        WHERE cs.ca_type = p_ca_type
          AND cs.status = 'Active'
          AND cs.school_id = p_school_id
          AND cs.branch_id = p_branch_id
          AND cs.section = p_section
        ORDER BY cs.week_number ASC;
    ELSE
        SELECT 
            cs.id,
            cs.ca_type,
            cs.week_number,
            cs.max_score,
            cs.overall_contribution_percent,
            cs.status,
            cs.section,
            p_academic_year AS academic_year,
            p_term AS term,
            aw.begin_date AS week_begin_date,
            aw.end_date AS week_end_date
        FROM ca_setup cs
        LEFT JOIN academic_weeks aw 
            ON cs.week_number = aw.week_number
            AND cs.school_id = aw.school_id
            AND cs.branch_id = aw.branch_id
            AND aw.academic_year = p_academic_year
            AND aw.term = p_term
            AND aw.status = 'Active'
        WHERE cs.ca_type = p_ca_type
          AND cs.status = 'Active'
          AND cs.school_id = p_school_id
          AND cs.branch_id = p_branch_id
        ORDER BY cs.week_number ASC;
    END IF;
END $$

DROP PROCEDURE IF EXISTS GetCAStatistics $$
CREATE PROCEDURE `GetCAStatistics`(IN `p_class_code` VARCHAR(20), IN `p_subject_code` VARCHAR(20), IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50))
BEGIN
    SELECT 
        COUNT(DISTINCT s.admission_no) as total_students,
        -- Get configuration from CA setup
        (SELECT SUM(max_score) FROM ca_setup 
         WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE) as total_max_score,
        (SELECT DISTINCT overall_contribution_percent FROM ca_setup 
         WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE LIMIT 1) as contribution_percent,        -- Calculate class statistics
        AVG(student_stats.ca_total) as avg_ca_total,
        AVG(student_stats.ca_percentage) as class_average_percentage,
        AVG(student_stats.overall_contribution) as class_average_contribution,
        -- Performance range
        MAX(student_stats.ca_percentage) as highest_percentage,
        MIN(student_stats.ca_percentage) as lowest_percentage,
        -- Total scores
        SUM(student_stats.ca_total) as total_class_score
    FROM student_subjects_view s
    LEFT JOIN (
        SELECT 
            ws.admission_no,
            SUM(COALESCE(ws.score, 0)) as ca_total,
            (SUM(COALESCE(ws.score, 0)) / 
             (SELECT SUM(max_score) FROM ca_setup 
              WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE)
            ) * 100 as ca_percentage,
            (SUM(COALESCE(ws.score, 0)) / 
             (SELECT SUM(max_score) FROM ca_setup 
              WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE)
            ) * 100 * 
            (SELECT DISTINCT overall_contribution_percent FROM ca_setup 
             WHERE ca_type = p_ca_type AND academic_year = p_academic_year AND term = p_term AND is_active = TRUE LIMIT 1
            ) / 100 as overall_contribution
        FROM weekly_scores ws
        INNER JOIN ca_setup ca ON ws.academic_week_id = ca.week_number
        WHERE ws.subject_code = p_subject_code
          AND ws.class_code = p_class_code
          AND ws.assessment_type = p_ca_type
          AND ca.academic_year = p_academic_year
          AND ca.term = p_term
        GROUP BY ws.admission_no
    ) student_stats ON student_stats.admission_no = s.admission_no
    WHERE s.class_code = p_class_code 
      AND s.subject_code = p_subject_code;
END $$

DROP PROCEDURE IF EXISTS GetClassCAReports $$
CREATE PROCEDURE `GetClassCAReports`(
    IN `p_query_type` VARCHAR(50),
    IN `p_class_code` VARCHAR(20),
    IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'),
    IN `p_academic_year` VARCHAR(20),
    IN `p_term` VARCHAR(50),
    IN `p_admission_no` VARCHAR(20),
    IN `p_branch_id` VARCHAR(20),
    IN `p_school_id` VARCHAR(20)
)
BEGIN
    IF p_query_type = 'View Class CA Report' THEN
        -- Use window functions for accurate positioning with stream filtering
        SELECT
            base_data.admission_no,
            base_data.subject_code,
            base_data.ca_setup_id,
            base_data.score,
            base_data.max_score,
            base_data.week_number,
            base_data.assessment_type,
            base_data.student_name,
            base_data.class_name,
            base_data.school_id,
            base_data.current_class,
            base_data.subject,
            base_data.academic_year,
            base_data.term,
            base_data.overall_contribution_percent,
            base_data.total_students_in_class,
            base_data.avg_per_subject,
            -- Use ROW_NUMBER() for proper sequential positioning
            ROW_NUMBER() OVER (
                PARTITION BY base_data.subject_code, base_data.assessment_type
                ORDER BY base_data.score DESC, base_data.student_name ASC
            ) AS sbj_position
        FROM (
            SELECT
                ws.admission_no,
                ws.subject_code,
                ws.ca_setup_id,
                ws.score,
                ws.max_score,
                ws.week_number,
                ws.assessment_type,
                s.student_name,
                c.class_name,
                ws.school_id,
                c.class_code AS current_class,
                sub.subject_name AS subject,
                aw.academic_year,
                aw.term,
                cs.overall_contribution_percent,
                -- Count total students in class for this subject and CA type
                COUNT(*) OVER (
                    PARTITION BY ws.subject_code, ws.assessment_type
                ) AS total_students_in_class,
                -- Calculate average score for this subject and CA type
                AVG(ws.score) OVER (
                    PARTITION BY ws.subject_code, ws.assessment_type
                ) AS avg_per_subject
            FROM weekly_scores ws
            INNER JOIN students s ON ws.admission_no = s.admission_no
            INNER JOIN classes c ON s.current_class = c.class_code
            INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
            INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
            LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
                AND aw.academic_year = p_academic_year
                AND aw.term = p_term
                AND aw.school_id = p_school_id
            WHERE aw.academic_year = p_academic_year
              AND ws.assessment_type = p_ca_type
              AND s.current_class = p_class_code
              AND ws.school_id = p_school_id
              AND aw.term = p_term
              AND s.status = 'Active'
              -- Stream filtering: allow core subjects for all, and subjects matching student's stream
              AND (
                  sub.type = 'core'
                  OR s.stream = 'General'
                  OR s.stream = 'None'
                  OR s.stream = sub.type
              )
        ) AS base_data
        ORDER BY base_data.subject_code, base_data.score DESC, base_data.student_name;

    ELSEIF p_query_type = "View Student CA Report" THEN
        -- Use window functions for individual student report with stream filtering
        SELECT
            base_data.admission_no,
            base_data.subject_code,
            base_data.ca_setup_id,
            base_data.score,
            base_data.max_score,
            base_data.week_number,
            base_data.assessment_type,
            base_data.student_name,
            base_data.class_name,
            base_data.school_id,
            base_data.current_class,
            base_data.subject,
            base_data.academic_year,
            base_data.term,
            base_data.overall_contribution_percent,
            base_data.total_students_in_class,
            base_data.avg_per_subject,
            -- Use ROW_NUMBER() for proper sequential positioning
            ROW_NUMBER() OVER (
                PARTITION BY base_data.subject_code, base_data.assessment_type
                ORDER BY base_data.score DESC, base_data.student_name ASC
            ) AS sbj_position
        FROM (
            SELECT
                ws.admission_no,
                ws.subject_code,
                ws.ca_setup_id,
                ws.score,
                ws.max_score,
                ws.week_number,
                ws.assessment_type,
                s.student_name,
                c.class_name,
                ws.school_id,
                c.class_code AS current_class,
                sub.subject_name AS subject,
                aw.academic_year,
                aw.term,
                cs.overall_contribution_percent,
                -- Count total students in class for this subject and CA type
                COUNT(*) OVER (
                    PARTITION BY ws.subject_code, ws.assessment_type
                ) AS total_students_in_class,
                -- Calculate average score for this subject and CA type
                AVG(ws.score) OVER (
                    PARTITION BY ws.subject_code, ws.assessment_type
                ) AS avg_per_subject
            FROM weekly_scores ws
            INNER JOIN students s ON ws.admission_no = s.admission_no
            INNER JOIN classes c ON s.current_class = c.class_code
            INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
            INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
            LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
                AND aw.academic_year = p_academic_year
                AND aw.term = p_term
                AND aw.school_id = p_school_id
            WHERE aw.academic_year = p_academic_year
              AND ws.assessment_type = p_ca_type
              AND ws.admission_no = p_admission_no
              AND ws.school_id = p_school_id
              AND aw.term = p_term
              AND s.status = 'Active'
              -- Stream filtering: allow core subjects for all, and subjects matching student's stream
              AND (
                  sub.type = 'core'
                  OR s.stream = 'General'
                  OR s.stream = 'None'
                  OR s.stream = sub.type
              )
        ) AS base_data
        ORDER BY base_data.subject_code, base_data.score DESC;

    ELSEIF p_query_type = "student admission_no" THEN
        -- Get distinct student admission numbers and names
        SELECT DISTINCT
            s.admission_no,
            s.student_name
        FROM students s
        WHERE s.school_id = p_school_id
          AND s.status = 'Active'
        ORDER BY s.student_name;

    ELSE
        -- Default case: return all data for other query types with stream filtering
        SELECT
            ws.admission_no,
            ws.subject_code,
            ws.ca_setup_id,
            ws.score,
            ws.max_score,
            ws.week_number,
            ws.assessment_type,
            s.student_name,
            c.class_name,
            ws.school_id,
            c.class_code AS current_class,
            sub.subject_name AS subject,
            aw.academic_year,
            aw.term,
            cs.overall_contribution_percent,
            COUNT(*) OVER (
                PARTITION BY ws.subject_code, ws.assessment_type
            ) AS total_students_in_class,
            AVG(ws.score) OVER (
                PARTITION BY ws.subject_code, ws.assessment_type
            ) AS avg_per_subject,
            ROW_NUMBER() OVER (
                PARTITION BY s.current_class, ws.subject_code, ws.assessment_type
                ORDER BY ws.score DESC, s.student_name ASC
            ) AS sbj_position
        FROM weekly_scores ws
        INNER JOIN students s ON ws.admission_no = s.admission_no
        INNER JOIN classes c ON s.current_class = c.class_code
        INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
        INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
        LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
            AND aw.academic_year = p_academic_year
            AND aw.term = p_term
            AND aw.school_id = p_school_id
        WHERE ws.school_id = p_school_id
          AND s.status = 'Active'
          -- Apply stream filtering for all other query types as well
          AND (
              sub.type = 'core'
              OR s.stream = 'General'
              OR s.stream = 'None'
              OR s.stream = sub.type
          )
        ORDER BY s.current_class, sub.subject_code, ws.assessment_type, ws.score DESC;
    END IF;
END $$

DROP PROCEDURE IF EXISTS GetClasses $$
CREATE PROCEDURE `GetClasses`()
BEGIN
    SELECT DISTINCT
        class_code,
        MIN(class_name) as class_name,
        COUNT(DISTINCT subject_code) as subject_count,
        COUNT(DISTINCT admission_no) as student_count
    FROM student_subjects_view 
    GROUP BY class_code
    ORDER BY class_code;
END $$

DROP PROCEDURE IF EXISTS GetClassSummaryReport $$
CREATE PROCEDURE `GetClassSummaryReport`(IN `p_class_code` VARCHAR(30), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50), IN `p_school_id` VARCHAR(20))
BEGIN
    -- Declare all variables first
    DECLARE v_class_exists INT DEFAULT 0;
    DECLARE v_error_message VARCHAR(255) DEFAULT '';

    -- Error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 
            'error' AS status,
            'An error occurred while retrieving the class summary.' AS message;
    END;

    START TRANSACTION;

    -- Check if class exists
    SELECT COUNT(*) INTO v_class_exists 
    FROM classes 
    WHERE class_code = p_class_code AND school_id = p_school_id;

    IF v_class_exists = 0 THEN
        SELECT 
            'error' AS status,
            'Class not found with the provided class code and school ID' AS message;
    ELSE
        -- Return class summary data
        #SELECT
          #  class_name,
          #  class_code,
           # school_id,
          #  subject,
           # academic_year,
           # term,
           # total_students_assessed,
           # class_average,
           # avg_ca1,
          #  avg_ca2,
           # avg_ca3,
           # avg_exam,
           # excellent_count,
            #good_count,
            #fair_count,
            #pass_count,
            #fail_count,
          #  pass_rate
        -- FROM view_class_performance_summary
        
        SELECT * FROM view_end_of_term_report
        WHERE class_code = p_class_code 
          AND school_id = p_school_id
          AND academic_year = p_academic_year
          AND term = p_term
        ORDER BY subject;
    END IF;

    COMMIT;
END $$

DROP PROCEDURE IF EXISTS GetDashboardData $$
CREATE PROCEDURE `GetDashboardData`(IN `p_class_code` VARCHAR(20), IN `p_subject_code` VARCHAR(20), IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50), IN `p_start_month` VARCHAR(7), IN `p_end_month` VARCHAR(7), IN `p_school_id` VARCHAR(20))
BEGIN
    DECLARE v_limit INT;

    -- Step 1: Get number of CA setups
    SELECT COUNT(*) INTO v_limit
    FROM ca_setup 
    WHERE ca_type = p_ca_type 
      AND academic_year = p_academic_year 
      AND term = p_term 
      AND school_id = p_school_id
      AND is_active = TRUE;

    -- Step 2: Create temp table of relevant academic weeks joined with CA setup
    CREATE TEMPORARY TABLE tmp_weeks AS
    SELECT 
        aw.id AS academic_week_id,
        ca.id AS ca_setup_id,
        ca.week_number AS ca_week_number,
        aw.weeks,
        aw.begin,
        aw.end,
        ca.max_score,
        ca.overall_contribution_percent,
        ROW_NUMBER() OVER (ORDER BY aw.begin ASC) AS rn
    FROM Academic_weeks aw
    JOIN ca_setup ca ON
        ca.academic_year = p_academic_year
        AND ca.term = p_term
        AND ca.ca_type = p_ca_type
        AND ca.is_active = TRUE
    WHERE  aw.academic_year = p_academic_year
    AND aw.term = p_term
    ORDER BY aw.begin ASC
    LIMIT v_limit;

    -- Step 3: Main query using cross join with limited weeks
    SELECT 
        s.admission_no,
        s.student_name,
        s.class_code,
        s.subject_code,
        s.subject_name,
        w.academic_week_id,
        w.ca_setup_id,
        w.ca_week_number,
        w.weeks AS week_label,
        w.begin AS begin_date,
        w.end AS end_date,
        w.max_score,
        w.overall_contribution_percent,
        COALESCE(ws.score, 0) AS current_score,
        ws.is_locked,
        ws.updated_at AS score_last_updated
    FROM student_subjects_view s
    CROSS JOIN tmp_weeks w
    LEFT JOIN weekly_scores ws ON 
		ws.subject_code = s.subject_code 
        AND ws.assessment_type = p_ca_type
    WHERE s.class_code = p_class_code 
      AND s.subject_code = p_subject_code;

    -- Cleanup
    DROP TEMPORARY TABLE tmp_weeks;
END $$

DROP PROCEDURE IF EXISTS GetEndOfTermReport $$
CREATE PROCEDURE `GetEndOfTermReport`(
    IN p_admission_no VARCHAR(50),
    IN p_class_code VARCHAR(50),
    IN p_academic_year VARCHAR(20),
    IN p_term VARCHAR(50),
    IN p_school_id VARCHAR(50),
    IN p_branch_id VARCHAR(50)
)
BEGIN
    -- =====================================================
    -- IMPORTANT: This procedure respects school.has_class_stream flag
    -- If has_class_stream = 0: ALL students see ALL subjects
    -- If has_class_stream = 1: Stream and selective filtering applies
    -- =====================================================

    DECLARE v_has_class_stream TINYINT DEFAULT 0;

    -- Check if school has stream feature enabled
    SELECT has_class_stream INTO v_has_class_stream
    FROM school_setup
    WHERE school_id = p_school_id
    LIMIT 1;

    -- Set default if not found
    SET v_has_class_stream = COALESCE(v_has_class_stream, 0);

    -- Temporary table to hold student scores with subject filtering
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_student_scores (
        admission_no VARCHAR(50),
        student_name VARCHAR(255),
        subject_code VARCHAR(50),
        subject VARCHAR(255),
        ca1_score DECIMAL(10,2),
        ca2_score DECIMAL(10,2),
        ca3_score DECIMAL(10,2),
        exam_score DECIMAL(10,2),
        total_score DECIMAL(10,2),
        max_possible DECIMAL(10,2),
        percentage DECIMAL(10,2),
        student_stream VARCHAR(50),
        subject_type VARCHAR(50),
        INDEX idx_admission (admission_no),
        INDEX idx_subject (subject_code)
    );

    -- Clear temp table
    TRUNCATE TABLE temp_student_scores;

    -- =====================================================
    -- STEP 1: Fetch student scores with stream-aware filtering
    -- =====================================================
    IF p_admission_no IS NOT NULL THEN
        -- Single student report
        INSERT INTO temp_student_scores
        SELECT
            s.admission_no,
            s.student_name,
            subj.subject_code,
            subj.subject_name,
            COALESCE(ca1.total_score, 0) as ca1_score,
            COALESCE(ca2.total_score, 0) as ca2_score,
            COALESCE(ca3.total_score, 0) as ca3_score,
            COALESCE(exam.score, 0) as exam_score,
            (COALESCE(ca1.total_score, 0) + COALESCE(ca2.total_score, 0) +
             COALESCE(ca3.total_score, 0) + COALESCE(exam.score, 0)) as total_score,
            (COALESCE(ca1.max_score, 0) + COALESCE(ca2.max_score, 0) +
             COALESCE(ca3.max_score, 0) + COALESCE(exam.max_score, 0)) as max_possible,
            CASE
                WHEN (COALESCE(ca1.max_score, 0) + COALESCE(ca2.max_score, 0) +
                      COALESCE(ca3.max_score, 0) + COALESCE(exam.max_score, 0)) > 0
                THEN ((COALESCE(ca1.total_score, 0) + COALESCE(ca2.total_score, 0) +
                       COALESCE(ca3.total_score, 0) + COALESCE(exam.score, 0)) /
                      (COALESCE(ca1.max_score, 0) + COALESCE(ca2.max_score, 0) +
                       COALESCE(ca3.max_score, 0) + COALESCE(exam.max_score, 0))) * 100
                ELSE 0
            END as percentage,
            s.stream as student_stream,
            subj.type as subject_type
        FROM students s
        INNER JOIN subjects subj ON subj.class_code = s.current_class
            AND subj.school_id = s.school_id
            AND subj.status = 'Active'
        LEFT JOIN (
            SELECT subject_code, admission_no, SUM(score) as total_score, SUM(max_score) as max_score
            FROM weekly_scores
            WHERE assessment_type = 'CA1' AND academic_year = p_academic_year AND term = p_term
            GROUP BY subject_code, admission_no
        ) ca1 ON ca1.subject_code = subj.subject_code AND ca1.admission_no = s.admission_no
        LEFT JOIN (
            SELECT subject_code, admission_no, SUM(score) as total_score, SUM(max_score) as max_score
            FROM weekly_scores
            WHERE assessment_type = 'CA2' AND academic_year = p_academic_year AND term = p_term
            GROUP BY subject_code, admission_no
        ) ca2 ON ca2.subject_code = subj.subject_code AND ca2.admission_no = s.admission_no
        LEFT JOIN (
            SELECT subject_code, admission_no, SUM(score) as total_score, SUM(max_score) as max_score
            FROM weekly_scores
            WHERE assessment_type = 'CA3' AND academic_year = p_academic_year AND term = p_term
            GROUP BY subject_code, admission_no
        ) ca3 ON ca3.subject_code = subj.subject_code AND ca3.admission_no = s.admission_no
        LEFT JOIN examinations exam ON exam.subject_code = subj.subject_code
            AND exam.admission_no = s.admission_no
            AND exam.academic_year = p_academic_year
            AND exam.term = p_term
        WHERE s.admission_no = p_admission_no
            AND s.school_id = p_school_id
            AND s.current_class = p_class_code
            AND (
                -- APPLY STREAM FILTERING ONLY IF has_class_stream = 1
                v_has_class_stream = 0  -- Stream disabled: show ALL subjects
                OR (
                    v_has_class_stream = 1 AND (
                        -- Stream enabled: apply filtering
                        LOWER(TRIM(COALESCE(subj.type, ''))) = 'core'  -- Core subjects
                        OR LOWER(TRIM(COALESCE(s.stream, 'general'))) IN ('general', 'none', '')  -- General stream students
                        OR LOWER(TRIM(COALESCE(s.stream, ''))) = LOWER(TRIM(COALESCE(subj.type, '')))  -- Matching stream
                        OR (
                            -- Selective subjects: only if student selected it
                            LOWER(TRIM(COALESCE(subj.type, ''))) = 'selective'
                            AND EXISTS (
                                SELECT 1 FROM student_subjects ss
                                WHERE ss.admission_no = s.admission_no
                                    AND ss.subject_code = subj.subject_code
                                    AND ss.school_id = s.school_id
                            )
                        )
                    )
                )
            );
    ELSE
        -- Class report
        INSERT INTO temp_student_scores
        SELECT
            s.admission_no,
            s.student_name,
            subj.subject_code,
            subj.subject_name,
            COALESCE(ca1.total_score, 0) as ca1_score,
            COALESCE(ca2.total_score, 0) as ca2_score,
            COALESCE(ca3.total_score, 0) as ca3_score,
            COALESCE(exam.score, 0) as exam_score,
            (COALESCE(ca1.total_score, 0) + COALESCE(ca2.total_score, 0) +
             COALESCE(ca3.total_score, 0) + COALESCE(exam.score, 0)) as total_score,
            (COALESCE(ca1.max_score, 0) + COALESCE(ca2.max_score, 0) +
             COALESCE(ca3.max_score, 0) + COALESCE(exam.max_score, 0)) as max_possible,
            CASE
                WHEN (COALESCE(ca1.max_score, 0) + COALESCE(ca2.max_score, 0) +
                      COALESCE(ca3.max_score, 0) + COALESCE(exam.max_score, 0)) > 0
                THEN ((COALESCE(ca1.total_score, 0) + COALESCE(ca2.total_score, 0) +
                       COALESCE(ca3.total_score, 0) + COALESCE(exam.score, 0)) /
                      (COALESCE(ca1.max_score, 0) + COALESCE(ca2.max_score, 0) +
                       COALESCE(ca3.max_score, 0) + COALESCE(exam.max_score, 0))) * 100
                ELSE 0
            END as percentage,
            s.stream as student_stream,
            subj.type as subject_type
        FROM students s
        INNER JOIN subjects subj ON subj.class_code = s.current_class
            AND subj.school_id = s.school_id
            AND subj.status = 'Active'
        LEFT JOIN (
            SELECT subject_code, admission_no, SUM(score) as total_score, SUM(max_score) as max_score
            FROM weekly_scores
            WHERE assessment_type = 'CA1' AND academic_year = p_academic_year AND term = p_term
            GROUP BY subject_code, admission_no
        ) ca1 ON ca1.subject_code = subj.subject_code AND ca1.admission_no = s.admission_no
        LEFT JOIN (
            SELECT subject_code, admission_no, SUM(score) as total_score, SUM(max_score) as max_score
            FROM weekly_scores
            WHERE assessment_type = 'CA2' AND academic_year = p_academic_year AND term = p_term
            GROUP BY subject_code, admission_no
        ) ca2 ON ca2.subject_code = subj.subject_code AND ca2.admission_no = s.admission_no
        LEFT JOIN (
            SELECT subject_code, admission_no, SUM(score) as total_score, SUM(max_score) as max_score
            FROM weekly_scores
            WHERE assessment_type = 'CA3' AND academic_year = p_academic_year AND term = p_term
            GROUP BY subject_code, admission_no
        ) ca3 ON ca3.subject_code = subj.subject_code AND ca3.admission_no = s.admission_no
        LEFT JOIN examinations exam ON exam.subject_code = subj.subject_code
            AND exam.admission_no = s.admission_no
            AND exam.academic_year = p_academic_year
            AND exam.term = p_term
        WHERE s.school_id = p_school_id
            AND s.current_class = p_class_code
            AND s.status = 'Active'
            AND (
                -- APPLY STREAM FILTERING ONLY IF has_class_stream = 1
                v_has_class_stream = 0  -- Stream disabled: show ALL subjects
                OR (
                    v_has_class_stream = 1 AND (
                        -- Stream enabled: apply filtering
                        LOWER(TRIM(COALESCE(subj.type, ''))) = 'core'  -- Core subjects
                        OR LOWER(TRIM(COALESCE(s.stream, 'general'))) IN ('general', 'none', '')  -- General stream students
                        OR LOWER(TRIM(COALESCE(s.stream, ''))) = LOWER(TRIM(COALESCE(subj.type, '')))  -- Matching stream
                        OR (
                            -- Selective subjects: only if student selected it
                            LOWER(TRIM(COALESCE(subj.type, ''))) = 'selective'
                            AND EXISTS (
                                SELECT 1 FROM student_subjects ss
                                WHERE ss.admission_no = s.admission_no
                                    AND ss.subject_code = subj.subject_code
                                    AND ss.school_id = s.school_id
                            )
                        )
                    )
                )
            );
    END IF;

    -- =====================================================
    -- STEP 2: Calculate class positions using STANDARD COMPETITION RANKING
    -- If 2 students tie at 3rd, next student is 5th (not 4th)
    -- =====================================================

    -- Calculate total scores per student
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_student_totals (
        admission_no VARCHAR(50),
        student_name VARCHAR(255),
        total_score DECIMAL(10,2),
        total_percentage DECIMAL(10,2),
        subject_count INT,
        INDEX idx_admission (admission_no)
    );

    TRUNCATE TABLE temp_student_totals;

    INSERT INTO temp_student_totals
    SELECT
        admission_no,
        student_name,
        ROUND(SUM(total_score), 2) as total_score,
        ROUND(AVG(percentage), 2) as total_percentage,
        COUNT(subject_code) as subject_count
    FROM temp_student_scores
    GROUP BY admission_no, student_name;

    -- Add ranking using standard competition ranking
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_rankings (
        admission_no VARCHAR(50),
        class_position INT,
        INDEX idx_admission (admission_no)
    );

    TRUNCATE TABLE temp_rankings;

    -- Use ROW_NUMBER with grouping to get proper rank skipping
    INSERT INTO temp_rankings
    SELECT
        admission_no,
        @rank := @rank + (@prev_pct != total_percentage OR @prev_score != total_score) *
                 (SELECT COUNT(*) + 1
                  FROM temp_student_totals t2
                  WHERE (t2.total_percentage > t1.total_percentage)
                     OR (t2.total_percentage = t1.total_percentage AND t2.total_score > t1.total_score)) as class_position
    FROM temp_student_totals t1
    CROSS JOIN (SELECT @rank := 0, @prev_pct := NULL, @prev_score := NULL) r
    ORDER BY total_percentage DESC, total_score DESC;

    -- =====================================================
    -- STEP 3: Calculate subject positions (per subject, per class)
    -- =====================================================
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_subject_positions (
        admission_no VARCHAR(50),
        subject_code VARCHAR(50),
        subject_position INT,
        total_students_in_subject INT,
        INDEX idx_admission_subject (admission_no, subject_code)
    );

    TRUNCATE TABLE temp_subject_positions;

    INSERT INTO temp_subject_positions
    SELECT
        t1.admission_no,
        t1.subject_code,
        (SELECT COUNT(*) + 1
         FROM temp_student_scores t2
         WHERE t2.subject_code = t1.subject_code
           AND (t2.percentage > t1.percentage
                OR (t2.percentage = t1.percentage AND t2.total_score > t1.total_score))
        ) as subject_position,
        (SELECT COUNT(DISTINCT admission_no)
         FROM temp_student_scores t3
         WHERE t3.subject_code = t1.subject_code
        ) as total_students_in_subject
    FROM temp_student_scores t1;

    -- =====================================================
    -- STEP 4: Return final result with all rankings
    -- =====================================================
    SELECT
        ts.admission_no,
        ts.student_name,
        ts.subject_code,
        ts.subject,
        ts.ca1_score,
        ts.ca2_score,
        ts.ca3_score,
        ts.exam_score,
        ts.total_score,
        ts.percentage,
        ts.student_stream,
        ts.subject_type,
        r.class_position as position,
        (SELECT COUNT(DISTINCT admission_no) FROM temp_student_totals) as total_students_in_class,
        sp.subject_position,
        sp.total_students_in_subject,
        st.total_percentage as average_percentage,
        (SELECT total_score FROM temp_student_totals WHERE admission_no = ts.admission_no) as student_total_score
    FROM temp_student_scores ts
    LEFT JOIN temp_rankings r ON r.admission_no = ts.admission_no
    LEFT JOIN temp_subject_positions sp ON sp.admission_no = ts.admission_no AND sp.subject_code = ts.subject_code
    LEFT JOIN temp_student_totals st ON st.admission_no = ts.admission_no
    ORDER BY ts.admission_no, ts.subject;

    -- Clean up
    DROP TEMPORARY TABLE IF EXISTS temp_student_scores;
    DROP TEMPORARY TABLE IF EXISTS temp_student_totals;
    DROP TEMPORARY TABLE IF EXISTS temp_rankings;
    DROP TEMPORARY TABLE IF EXISTS temp_subject_positions;

END $$

DROP PROCEDURE IF EXISTS GetGradeBoundaries $$
CREATE PROCEDURE `GetGradeBoundaries`(
    IN `query_type` VARCHAR(50),
    IN `p_branch_id` VARCHAR(50)
)
BEGIN
    IF query_type = 'SELECT' THEN
        SELECT 
            id,
            grade,
            min_percentage,
            max_percentage,
            remark,
            school_id,
            branch_id
        FROM grade_boundaries 
        WHERE branch_id = p_branch_id
          AND status = 'Active'
        ORDER BY min_percentage DESC;

    ELSEIF query_type = 'SELECT-ALL' THEN
        SELECT 
            id,
            grade,
            min_percentage,
            max_percentage,
            remark,
            school_id,
            branch_id
        FROM grade_boundaries 
        WHERE branch_id = p_branch_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS GetMiniClassCAReport $$
CREATE PROCEDURE `GetMiniClassCAReport`(
    IN p_class_code VARCHAR(20),
    IN p_ca_type VARCHAR(10),
    IN p_academic_year VARCHAR(20),
    IN p_term VARCHAR(20),
    IN p_school_id VARCHAR(20)
)
BEGIN
    SELECT 
        ws.admission_no,
        ws.subject_code,
        ws.ca_setup_id,
        ws.score,
        ws.max_score,
        ws.week_number,
        ws.assessment_type,
        s.student_name,
        c.class_name,
        ws.class_code,
        cs.ca_type,
        cs.overall_contribution_percent,
        (
            SELECT COUNT(*) + 1
            FROM weekly_scores ws2
            INNER JOIN students s2 ON ws2.admission_no = s2.admission_no
            WHERE ws2.subject_code = ws.subject_code
              AND ws2.assessment_type = p_ca_type
              AND s2.school_id = p_school_id
              AND s2.class_code = p_class_code
              AND (
                   ws2.score > ws.score OR
                   (ws2.score = ws.score AND s2.student_name < s.student_name)
              )
        ) AS sbj_position
    FROM weekly_scores ws
    INNER JOIN students s ON ws.admission_no = s.admission_no
    INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
    INNER JOIN classes c ON c.class_code = ws.class_code
    WHERE ws.class_code = p_class_code
      AND ws.assessment_type = p_ca_type
      AND ws.academic_year = p_academic_year
      AND ws.term = p_term
      AND ws.status = 'Draft'
      AND cs.school_id = p_school_id
    ORDER BY ws.subject_code, s.student_name;

END $$

DROP PROCEDURE IF EXISTS getProcesecedPayment $$
CREATE PROCEDURE `getProcesecedPayment`(IN `in_parent_id` VARCHAR(100))
SELECT * FROM payment_receipts WHERE parent_id = in_parent_id $$

DROP PROCEDURE IF EXISTS GetProgressReportStats $$
CREATE PROCEDURE `GetProgressReportStats`(IN `p_class_code` VARCHAR(10), IN `p_subject_code` VARCHAR(10), IN `p_ca_type` VARCHAR(10), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50))
BEGIN
    SELECT 
        COUNT(DISTINCT sv.admission_no) as total_students,
        AVG(ss.score) as average_score,
        SUM(cs.max_score) as total_max_score,
        cs.overall_contribution_percent,
        COUNT(DISTINCT cs.week_number) as total_weeks
    FROM student_subjects_view sv
    LEFT JOIN student_scores ss ON sv.admission_no = ss.admission_no 
        AND sv.subject_code = ss.subject_code
    LEFT JOIN ca_setup cs ON ss.ca_setup_id = cs.id
    WHERE sv.class_code = p_class_code 
        AND sv.subject_code = p_subject_code
        AND (cs.ca_type = p_ca_type OR cs.ca_type IS NULL)
        AND (cs.academic_year = p_academic_year OR cs.academic_year IS NULL)
        AND (cs.term = p_term OR cs.term IS NULL)
        AND (cs.is_active = 1 OR cs.is_active IS NULL)
    GROUP BY cs.overall_contribution_percent;
END $$

DROP PROCEDURE IF EXISTS GetSectionCASetup $$
CREATE PROCEDURE `GetSectionCASetup`(IN `in_branch_id` VARCHAR(20), IN `in_section` VARCHAR(20))
BEGIN
    DECLARE v_section VARCHAR(50);
    DECLARE v_default_section VARCHAR(50);
    DECLARE v_has_section_records INT DEFAULT 0;

    -- Normalize input
    SET v_section = NULLIF(in_section, '');

    -- Determine what the table's default section is (e.g., 'All')
    SELECT DISTINCT section
    INTO v_default_section
    FROM ca_setup
    WHERE branch_id = in_branch_id
    ORDER BY CASE WHEN section IS NULL THEN 1 ELSE 0 END
    LIMIT 1;

    -- If no default found, fallback to NULL
    SET v_default_section = IFNULL(v_default_section, 'All');

    -- Check if this section has specific active records
    IF v_section IS NOT NULL THEN
        SELECT COUNT(*) INTO v_has_section_records
        FROM ca_setup
        WHERE branch_id = in_branch_id
          AND section = v_section
          AND status = 'Active';
    END IF;

    -- Main query: prefer section rows, else fallback to default
    SELECT
        ca.id,
        COALESCE(ca.section, v_default_section) AS section,
        ca.ca_type,
        ca.status,
        ca.week_number,
        ca.max_score,
        ca.overall_contribution_percent AS contribution_percent,
        ca.created_at
    FROM ca_setup ca
    WHERE ca.status = 'Active'
      AND ca.branch_id = in_branch_id
      AND (
            (v_has_section_records > 0 AND ca.section = v_section)
            OR (v_has_section_records = 0 AND ca.section = v_default_section)
          )
    ORDER BY ca.ca_type, ca.week_number;

END $$

DROP PROCEDURE IF EXISTS GetStudentEndOfTermReport $$
CREATE PROCEDURE `GetStudentEndOfTermReport`(IN `p_admission_no` VARCHAR(50), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50))
BEGIN
    -- All DECLARE statements must come first
    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_error_message VARCHAR(255) DEFAULT '';
    DECLARE v_year VARCHAR(20);
    DECLARE v_term_val VARCHAR(50);

    -- Error handler must come before any statements
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 
            'error' AS status,
            'An error occurred while retrieving the report.' AS message,
            NULL AS student_info,
            NULL AS subjects_data;
    END;

    -- Set default values
    SET v_year = IFNULL(p_academic_year, '2025/2026');
    SET v_term_val = IFNULL(p_term, 'First Term');

    START TRANSACTION;

    -- Check if student exists
    SELECT COUNT(*) INTO v_student_exists 
    FROM students 
    WHERE admission_no = p_admission_no;

    IF v_student_exists = 0 THEN
        SELECT 
            'error' AS status,
            'Student not found with the provided admission number' AS message,
            NULL AS student_info,
            NULL AS subjects_data;
    ELSE
        -- Return student basic information
        SELECT 
            'success' AS status,
            'Student report retrieved successfully' AS message,
            JSON_OBJECT(
                'admission_no', s.admission_no,
                'student_name', s.student_name,
                'class_name', s.class_name,
                'class_code', s.current_class,
                'school_id', s.school_id,
                'section', s.section,
                'academic_year', v_year,
                'term', v_term_val
            ) AS student_info
        FROM students s
        WHERE s.admission_no = p_admission_no;

        -- Return subjects performance data
        SELECT
            *
        FROM view_end_of_term_report
        WHERE admission_no = p_admission_no
          AND academic_year = v_year
          AND term = v_term_val
        ORDER BY subject;
    END IF;

    COMMIT;
END $$

DROP PROCEDURE IF EXISTS getstudentPayments $$
CREATE PROCEDURE `getstudentPayments`(IN `query_type` VARCHAR(50), IN `in_parent_id` VARCHAR(50), IN `in_admission_no` TEXT, IN `in_term` VARCHAR(50), IN `in_academic_year` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_school_id` VARCHAR(20))
BEGIN
    IF query_type = 'getstudentPayments' THEN
        
        SELECT
            e.*,
            s.parent_id,
            s.admission_no,
            s.class_name
        FROM payment_entries e
        JOIN students s ON e.admission_no = s.admission_no
        WHERE s.admission_no = in_admission_no 
          AND e.payment_status != 'Excluded'
          AND e.term = in_term 
          AND e.academic_year = in_academic_year
          AND e.branch_id = in_branch_id
          AND s.school_id = in_school_id;

    ELSEIF query_type = 'studentPayment' THEN
        
        SELECT 
            SUM(e.cr) AS totalBalance,
            e.academic_year,
            e.admission_no,
            e.term,
            e.class_code,
            c.class_name
        FROM payment_entries e
        JOIN students c ON e.class_code = c.current_class
        WHERE e.admission_no = in_admission_no 
          AND e.payment_status != 'Excluded'
          AND e.school_id = in_school_id
        GROUP BY e.academic_year, e.admission_no, e.term, e.class_code, c.class_name;
        
    
    ELSEIF query_type = 'select-class-count' THEN
    	SELECT 
            s.class_name,
            s.current_class,
            COUNT(DISTINCT s.admission_no) AS student_count,
            COALESCE(SUM(p.cr), 0) AS total_expected_amount,
            COALESCE(SUM(p.dr), 0) AS total_collected_amount,
            COALESCE(SUM(p.cr - p.dr), 0) AS balance_remaining,
            p.academic_year,
            p.term
        FROM 
            students s
        LEFT JOIN 
            payment_entries p 
            ON s.admission_no = p.admission_no 
            AND p.school_id = in_school_id                
            AND p.academic_year = in_academic_year        
            AND p.term = in_term                        
        WHERE 
            s.school_id = in_school_id                         
        GROUP BY 
            s.class_name, 
            s.current_class, 
            p.academic_year, 
            p.term  
        ORDER BY 
            total_expected_amount DESC;
    ELSEIF query_type = 'getparentsWithBalances' THEN
        SELECT 
        p.parent_id,
        p.fullname AS parent_name,
        p.phone,
        p.email,
        s.branch_id,
        COUNT(s.admission_no) AS children_count,
        fee_balance.term,
        COALESCE(SUM(fee_balance.balance), 0) AS total_balance,
        CONCAT('[', 
            COALESCE(
                GROUP_CONCAT(
                    CONCAT(
                        '{',
                        '"admission_no":"', s.admission_no, '"',
                        ',"student_name":"', s.student_name, '"',
                        ',"class_name":"', s.class_name, '"',
                        ',"class_code":"', s.current_class, '"',
                        ',"balance":', COALESCE(fee_balance.balance, 0),
                        '}'
                    )
                    ORDER BY s.student_name
                    SEPARATOR ','
                ),
                ''
            ), 
        ']') AS children
                FROM parents p
                JOIN students s ON p.parent_id = s.parent_id
                LEFT JOIN (
                    SELECT 
                        e.admission_no,
                        e.term,
                        SUM(e.cr) - SUM(e.dr) AS balance
                    FROM payment_entries e
                    WHERE e.academic_year = in_academic_year 
                      AND e.payment_status != 'Excluded'
                      AND e.term = in_term 
                      AND e.branch_id = in_branch_id
                      AND e.school_id = in_school_id
                    GROUP BY e.admission_no
                ) AS fee_balance ON s.admission_no = fee_balance.admission_no
                WHERE p.school_id = in_school_id
                GROUP BY p.parent_id, p.fullname, p.phone, p.email
                HAVING total_balance > 0 OR COUNT(s.admission_no) > 0
                ORDER BY total_balance DESC;
    END IF;
    END $$
    
DROP PROCEDURE IF EXISTS GetStudentsByClass $$
CREATE PROCEDURE `GetStudentsByClass`(IN `p_class_code` VARCHAR(20))
BEGIN
  SELECT 
    s.student_name AS name,
    s.admission_no,
    c.class_name,
    c.level AS grade_level,
    c.section
  FROM students s
  JOIN classes c ON s.current_class = c.class_code
  WHERE s.current_class = p_class_code 
    AND c.status = 'Active'
  ORDER BY s.student_name;
END $$

DROP PROCEDURE IF EXISTS GetStudentsByClassSubject $$
CREATE PROCEDURE `GetStudentsByClassSubject`(IN `p_class_code` VARCHAR(20), IN `p_subject_code` VARCHAR(20))
BEGIN
    SELECT DISTINCT
        admission_no,
        student_name,
        class_code,
        subject_code,
        subject_name
    FROM student_subjects_view 
    WHERE class_code  = p_class_code
      AND subject_code  = p_subject_code 
    ORDER BY admission_no, student_name ASC;
END $$

DROP PROCEDURE IF EXISTS GetStudentScores $$
CREATE PROCEDURE `GetStudentScores`(IN `query_type` VARCHAR(50), IN `p_admission_no` VARCHAR(50), IN `p_subject_code` VARCHAR(50), IN `p_class_code` VARCHAR(20), IN `p_ca_type` VARCHAR(10), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(20), IN `p_week_number` INT)
BEGIN
    IF query_type = 'SELECT-ALL' THEN
        SELECT 
            ws.id,
            ws.admission_no AS admissionNo,
            ws.subject_code AS subjectCode,
            ws.class_code AS classCode,
            ws.score,
            ws.max_score AS maxScore,
            ws.week_number AS weekNumber,
            ws.assessment_type AS caType,
            ws.created_at AS createdAt,
            ws.updated_at AS updatedAt,
            aw.academic_year AS academicYear,
            aw.term AS term
        FROM weekly_scores ws
        LEFT JOIN academic_weeks aw
            ON ws.week_number = aw.week_number
           AND aw.status = 'Active'
           AND (p_academic_year IS NULL OR aw.academic_year = p_academic_year)
           AND (p_term IS NULL OR aw.term = p_term)
        LEFT JOIN ca_setup cs
            ON ws.ca_setup_id = cs.id
        WHERE (p_subject_code IS NULL OR ws.subject_code = p_subject_code)
          AND (p_class_code IS NULL OR ws.class_code = p_class_code)
          AND (p_ca_type IS NULL OR ws.assessment_type = p_ca_type)
        ORDER BY ws.updated_at DESC;

    ELSEIF query_type = 'SELECT' THEN
        SELECT 
            ws.id,
            ws.admission_no AS admissionNo,
            ws.subject_code AS subjectCode,
            ws.class_code AS classCode,
            ws.score,
            ws.max_score AS maxScore,
            ws.week_number AS weekNumber,
            ws.assessment_type AS caType,
            ws.created_at AS createdAt,
            ws.updated_at AS updatedAt,
            aw.academic_year AS academicYear,
            aw.term AS term
        FROM weekly_scores ws
        LEFT JOIN academic_weeks aw
            ON ws.week_number = aw.week_number
           AND aw.status = 'Active'
           AND (p_academic_year IS NULL OR aw.academic_year = p_academic_year)
           AND (p_term IS NULL OR aw.term = p_term)
        LEFT JOIN ca_setup cs
            ON ws.ca_setup_id = cs.id
        WHERE (p_admission_no IS NULL OR ws.admission_no = p_admission_no)
          AND (p_subject_code IS NULL OR ws.subject_code = p_subject_code)
          AND (p_class_code IS NULL OR ws.class_code = p_class_code)
          AND (p_ca_type IS NULL OR ws.assessment_type = p_ca_type)
          AND (p_week_number IS NULL OR ws.week_number = p_week_number)
        ORDER BY ws.updated_at DESC;
    END IF;
END $$

DROP PROCEDURE IF EXISTS GetSubjectsByClass $$
CREATE PROCEDURE `GetSubjectsByClass`(IN `p_class_code` VARCHAR(20))
BEGIN
    SELECT DISTINCT
        subject_code,
        subject_name,
        COUNT(DISTINCT admission_no) as student_count
    FROM student_subjects_view 
    WHERE class_code = p_class_code
    GROUP BY subject_code, subject_name
    ORDER BY subject_name ASC;
END $$

DROP PROCEDURE IF EXISTS GetWeekAccessControl $$
CREATE PROCEDURE `GetWeekAccessControl`(IN `p_class_code` VARCHAR(20), IN `p_subject_code` VARCHAR(20), IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50))
BEGIN
    DECLARE v_count INT DEFAULT 0;

    -- Check if record exists
    SELECT COUNT(*) INTO v_count
    FROM week_access_control 
    WHERE class_code = p_class_code 
      AND subject_code = p_subject_code 
      AND ca_type = p_ca_type 
      AND academic_year = p_academic_year 
      AND term = p_term;

    -- If not exists, insert default
    IF v_count = 0 THEN
        INSERT INTO week_access_control (
            class_code, subject_code, ca_type, current_week_number, 
            unlocked_previous_weeks, final_results_generated, 
            academic_year, term
        ) VALUES (
            p_class_code, p_subject_code, p_ca_type, 2, '[]', FALSE, p_academic_year, p_term
        );
    END IF;

    -- Select the record (either existing or newly inserted)
    SELECT 
        current_week_number,
        unlocked_previous_weeks,
        final_results_generated
    FROM week_access_control 
    WHERE class_code = p_class_code 
      AND subject_code = p_subject_code 
      AND ca_type = p_ca_type 
      AND academic_year = p_academic_year 
      AND term = p_term;
END $$

DROP PROCEDURE IF EXISTS get_class_results $$
CREATE PROCEDURE `get_class_results`(IN `query_type` VARCHAR(30), IN `in_admission_no` VARCHAR(30), IN `in_class_code` VARCHAR(30), IN `in_academic_year` VARCHAR(30), IN `in_term` VARCHAR(30), IN `in_school_id` VARCHAR(30), IN `in_branch_id` VARCHAR(30))
BEGIN
    DECLARE class_count INT;
    DECLARE class_section VARCHAR(50);
    
    -- Convert input parameters to match column collations
    SET in_school_id = CONVERT(in_school_id USING utf8mb4) COLLATE utf8mb4_unicode_ci;
    SET in_class_code = CONVERT(in_class_code USING utf8mb4) COLLATE utf8mb4_unicode_ci;
    SET in_academic_year = CONVERT(in_academic_year USING utf8mb4) COLLATE utf8mb4_unicode_ci;
    SET in_term = CONVERT(in_term USING utf8mb4) COLLATE utf8mb4_unicode_ci;
    SET in_admission_no = CONVERT(in_admission_no USING utf8mb4) COLLATE utf8mb4_unicode_ci;

    IF query_type = 'Select Class Reports' THEN
        SELECT *
        FROM exam_reports
        WHERE school_id = in_school_id 
          AND class_code = in_class_code 
          AND academic_year = in_academic_year
          AND term = in_term
        ORDER BY student_name DESC;

    ELSEIF query_type = 'Select Joined Class Reports' THEN
        SELECT 
            s.current_class AS class_code, 
            s.section,
            s.admission_no, 
            s.student_name, 
            (SELECT remark 
             FROM exam_remarks 
             WHERE term = in_term 
               AND admission_no = s.admission_no 
               AND academic_year = in_academic_year 
               AND remark_type = 'Teacher Remark'
             LIMIT 1) AS teacher_remark,

            (SELECT COUNT(*) 
             FROM students x
             WHERE x.current_class = in_class_code 
               AND school_id = in_school_id) AS count_students,

            COUNT(CASE WHEN e.type = 'Academic' THEN 1 END) AS subjects_count,
            COUNT(CASE WHEN e.type != 'Academic' THEN 1 END) AS characters_count,

            SUM(COALESCE(e.total_score, 0)) * 1.0 / NULLIF(COUNT(CASE WHEN e.type = 'Academic' THEN 1 END), 0) AS avg_score,

            RANK() OVER (ORDER BY SUM(COALESCE(e.total_score, 0)) DESC) AS position,

            COALESCE(MAX(e.academic_year), '') AS academic_year,
            COALESCE(MAX(e.term), '') AS term,

            COALESCE(SUM(e.ca1Score), 0) AS total_ca1_score,
            COALESCE(SUM(e.ca2Score), 0) AS total_ca2_score,
            COALESCE(SUM(e.ca3Score), 0) AS total_ca3_score,
            COALESCE(SUM(e.ca4Score), 0) AS total_ca4_score,
            COALESCE(SUM(e.examScore), 0) AS total_exam_score,
            COALESCE(SUM(e.total_score), 0) AS total_score, 

            s.school_id AS school_id 

        FROM students s
        LEFT JOIN exam_reports e 
            ON s.admission_no = e.admission_no 
            AND s.current_class = e.class_code 
            AND e.term = in_term

        WHERE s.school_id = in_school_id 
          AND s.current_class = in_class_code

        GROUP BY 
            s.current_class,
            s.section,
            s.admission_no, 
            s.student_name, 
            s.school_id

        ORDER BY total_score DESC;

    ELSEIF query_type = 'Select Class Summary' THEN
        SELECT 
            student_name, 
            admission_no, 
            SUM(total_score) AS total_score,
            COUNT(CASE WHEN type = 'Academic' THEN 1 END) AS subjects_count,
            SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) AS avg_score,
            RANK() OVER (
                ORDER BY SUM(total_score) * 1.0 / NULLIF(COUNT(CASE WHEN type = 'Academic' THEN 1 END), 0) DESC
            ) AS position
        FROM exam_reports
        WHERE school_id = in_school_id 
          AND class_code = in_class_code 
          AND academic_year = in_academic_year
          AND term = in_term
        GROUP BY student_name, admission_no  
        ORDER BY total_score DESC;

    ELSEIF query_type = 'Select Student Draft' THEN
        SELECT class_count, e.*
        FROM exam_reports e
        WHERE e.academic_year = in_academic_year
          AND e.admission_no = in_admission_no
          AND e.term = in_term
        ORDER BY e.subject_code ASC;

    END IF;

END $$

DROP PROCEDURE IF EXISTS get_results $$
CREATE PROCEDURE `get_results`(IN `query_type` VARCHAR(100))
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
    END $$
    
DROP PROCEDURE IF EXISTS get_student_dashboard_data $$
CREATE PROCEDURE `get_student_dashboard_data`(IN `p_admission_no` VARCHAR(20), IN `p_class_name` VARCHAR(255), IN `p_class_code` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_academic_year` VARCHAR(9), IN `p_term` VARCHAR(50), IN `query_type` VARCHAR(20))
BEGIN

    -- 1. Recent Assignments (5 most recent)
    IF query_type = 'assignment' THEN
    SELECT 
        a.id,
        a.title,
        a.subject,
        a.teacher_name,
        a.submission_date,
        a.marks,
        a.status,
        ar.total_score,
        COALESCE(ar.response_count, 0) as response_count,
        COALESCE(ar.total_score, 0) as total_score,
        CASE 
            WHEN ar.response_count > 0 AND ar.total_score > 0 THEN 'submitted'
            WHEN a.submission_date < CURDATE() THEN 'overdue'
            WHEN a.status = 'Published' THEN 'pending'
            ELSE 'draft'
        END as assignment_status
    FROM assignments a
    LEFT JOIN (
        SELECT 
            assignment_id,
            COUNT(*) as response_count,
            SUM(score) as total_score
        FROM assignment_responses 
        WHERE admission_no = p_admission_no
        GROUP BY assignment_id
    ) ar ON a.id = ar.assignment_id
    WHERE a.class_name = p_class_name
        AND a.class_code = p_class_code
        AND a.school_id = p_school_id
        AND a.branch_id = p_branch_id
        AND a.academic_year = p_academic_year
        AND a.term = p_term
        AND a.status IN ('Published', 'Completed')
    ORDER BY a.submission_date DESC
    LIMIT 5;
	
    ELSEIF query_type = 'lesson' THEN 
    -- 2. Recent Lessons (5 most recent)
   SELECT 
    l.id,
    l.title,
    s.subject,  
    l.teacher,
    l.lesson_date,
    l.status,
    CASE 
        WHEN l.lesson_date > CURDATE() THEN 'upcoming'
        WHEN l.status = 'Completed' THEN 'completed'
        WHEN l.status = 'Published' THEN 'published'
        ELSE 'draft'
    END as lesson_status
FROM lessons l
LEFT JOIN subjects s ON l.subject = s.subject_code  
WHERE l.class_name = p_class_name
    AND l.class_code = p_class_code
    AND l.school_id = p_school_id
    AND l.branch_id = p_branch_id
    AND l.academic_year = p_academic_year
    AND l.term = p_term
    AND l.status IN ('Published', 'Completed')
ORDER BY l.lesson_date DESC
LIMIT 5;
	
    ELSEIF query_type = 'timetable' THEN 
    -- 3. Today's Timetable
    SELECT 
        ltt.id,
        ltt.subject,
        ltt.start_time,
        ltt.end_time,
        ltt.day,
        COALESCE(t.name, 'Unknown Teacher') as teacher_name
    FROM lesson_time_table ltt
    LEFT JOIN teachers t ON CAST(ltt.teacher_id AS CHAR) = CAST(t.id AS CHAR)
    WHERE ltt.class_name = p_class_name
        AND ltt.class_code = p_class_code
        AND ltt.school_id = p_school_id
        AND ltt.branch_id = p_branch_id
        AND ltt.day = DAYNAME(CURDATE())
        AND ltt.status = 'Active'
    ORDER BY ltt.start_time;
    
	ELSEIF query_type = 'attendance' THEN
    -- 4. Recent Attendance (last 10 records)
    SELECT 
        ar.id,
        ar.attendance_date,
        CASE 
            WHEN ar.status = 'P' THEN 'present'
            WHEN ar.status = 'A' THEN 'absent'
            WHEN ar.status = 'L' THEN 'late'
            WHEN ar.status = 'E' THEN 'excused'
            ELSE ar.status
        END as status,
        COALESCE(t.name, 'Unknown Teacher') as teacher_name
    FROM attendance_records ar
    LEFT JOIN teachers t ON CAST(ar.marked_by AS CHAR) = CAST(t.id AS CHAR)
    WHERE ar.admission_no = p_admission_no
        AND ar.class_code = p_class_code
        AND ar.school_id = p_school_id
        AND ar.branch_id = p_branch_id
    ORDER BY ar.attendance_date DESC
    LIMIT 10;

    -- 5. Simple Stats (as separate columns in one row)
    ELSEIF query_type = 'summary' THEN
    SELECT 
        -- Assignments
        (SELECT COUNT(*) FROM assignments a
         LEFT JOIN assignment_responses ar ON a.id = ar.assignment_id AND ar.admission_no = p_admission_no
         WHERE a.class_name = p_class_name AND a.class_code = p_class_code 
           AND a.school_id = p_school_id AND a.branch_id = p_branch_id 
           AND a.academic_year = p_academic_year AND a.term = p_term
           AND a.status IN ('Published', 'Completed')
           AND ar.id IS NULL AND a.submission_date >= CURDATE()) as pending_assignments,

        (SELECT COUNT(*) FROM assignments a
         INNER JOIN assignment_responses ar ON a.id = ar.assignment_id AND ar.admission_no = p_admission_no
         WHERE a.class_name = p_class_name AND a.class_code = p_class_code 
           AND a.school_id = p_school_id AND a.branch_id = p_branch_id 
           AND a.academic_year = p_academic_year AND a.term = p_term
           AND a.status IN ('Published', 'Completed')) as submitted_assignments,

        -- Lessons
        (SELECT COUNT(*) FROM lessons 
         WHERE class_name = p_class_name AND class_code = p_class_code 
           AND school_id = p_school_id AND branch_id = p_branch_id 
           AND academic_year = p_academic_year AND term = p_term) as total_lessons,

        (SELECT COUNT(*) FROM lessons 
         WHERE class_name = p_class_name AND class_code = p_class_code 
           AND school_id = p_school_id AND branch_id = p_branch_id 
           AND academic_year = p_academic_year AND term = p_term
           AND status = 'Completed') as completed_lessons;

        ELSEIF query_type = 'fullattendance' THEN
        SELECT 
        ar.id,
        ar.attendance_date,
        CASE 
            WHEN ar.status = 'P' THEN 'present'
            WHEN ar.status = 'A' THEN 'absent'
            WHEN ar.status = 'L' THEN 'late'
            WHEN ar.status = 'E' THEN 'excused'
            ELSE ar.status
        END as status,
        COALESCE(t.name, 'Unknown Teacher') as teacher_name
    FROM attendance_records ar
    LEFT JOIN teachers t ON CAST(ar.marked_by AS CHAR) = CAST(t.id AS CHAR)
    WHERE ar.admission_no = p_admission_no
        AND ar.class_code = p_class_code
        AND ar.school_id = p_school_id
        AND ar.branch_id = p_branch_id
    ORDER BY ar.attendance_date DESC;
           
       END IF;    
END $$

DROP PROCEDURE IF EXISTS grades $$
CREATE PROCEDURE `grades`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_grade` INT(50), IN `in_percentage` INT(14), IN `in_point` INT(50), IN `in_status` ENUM('Active','Inactive'))
BEGIN IF query_type="create" THEN INSERT INTO `grades` (grade, percentage,point,status) VALUES (in_grade, in_percentage, in_point, in_status); ELSEIF query_type="select" THEN SELECT * FROM `grades` WHERE id=in_id; ELSEIF query_type="select-all" THEN SELECT * FROM `grades`; END IF; END $$

DROP PROCEDURE IF EXISTS grade_setup $$
CREATE PROCEDURE `grade_setup`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_section` VARCHAR(50), IN `in_grade` VARCHAR(50), IN `in_remark` VARCHAR(50), IN `in_min_score` INT(3), IN `in_max_score` INT(3), IN `in_status` VARCHAR(30), IN `in_school_id` VARCHAR(10))
BEGIN 
DECLARE rows_found INT;
    IF query_type="create" THEN 
        INSERT INTO `grade_setup` (section,grade, remark,min_score,max_score, school_id) 
        VALUES (in_section,in_grade, in_remark, in_min_score, in_max_score, in_school_id); 
    ELSEIF query_type="select" THEN 
    	SELECT COUNT(*) INTO rows_found FROM grade_setup WHERE school_id = in_school_id AND section = in_section;
        
       IF rows_found > 0 THEN
          SELECT * FROM grade_setup WHERE school_id = in_school_id AND section = in_section;
       ELSE
       	SELECT * FROM grade_setup WHERE school_id = in_school_id AND section = '';
       END IF;
    ELSEIF query_type="select-all" THEN 
      SELECT * FROM `grade_setup` WHERE  school_id =in_school_id; 
        
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
    END $$
    
DROP PROCEDURE IF EXISTS Guardians $$
CREATE PROCEDURE `Guardians`(IN `query_type` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `p_guardian_id` VARCHAR(20), IN `p_applicant_id` VARCHAR(20), IN `p_guardian_name` VARCHAR(100), IN `p_guardian_address` VARCHAR(255), IN `p_guardian_email` VARCHAR(200), IN `p_guardian_phone` VARCHAR(20))
BEGIN
    IF query_type = 'create' THEN
        INSERT INTO `gurdians_table`(
            `school_id`, `guardian_id`, `guardian_name`, `guardian_address`, `guardian_email`, `guardian_phone`
        ) 
        VALUES (
            p_school_id, p_guardian_id, p_guardian_name, p_guardian_address, p_guardian_email, p_guardian_phone
        );
    
    ELSEIF query_type = 'update' THEN
        UPDATE `gurdians_table`
        SET `guardian_name` = p_guardian_name,
            `guardian_address` = p_guardian_address,
            `guardian_email` = p_guardian_email,
            `guardian_phone` = p_guardian_phone
        WHERE `guardian_id` = p_guardian_id;
    
    ELSEIF query_type = 'delete' THEN
        DELETE FROM `gurdians_table` WHERE `guardian_id` = p_guardian_id;
    
    ELSEIF query_type = 'select' THEN
        SELECT * FROM `gurdians_table` WHERE `guardian_id` = p_guardian_id OR `guardian_id` IS NULL
        AND `school_id` = p_school_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS initialize_branch_accounting $$
CREATE PROCEDURE `initialize_branch_accounting`(IN `p_school_id` VARCHAR(20), IN `p_new_branch_id` VARCHAR(20), IN `p_created_by` VARCHAR(50))
BEGIN
    DECLARE v_main_branch_id VARCHAR(20);
    DECLARE v_account_count INT DEFAULT 0;
    DECLARE v_error_msg VARCHAR(255);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        INSERT INTO financial_audit_trail (
            table_name, record_id, action, old_values, new_values, 
            user_id, school_id, branch_id
        ) VALUES (
            'initialize_branch_accounting', 0, 'ERROR', NULL,
            JSON_OBJECT(
                'error', v_error_msg,
                'school_id', p_school_id,
                'new_branch_id', p_new_branch_id
            ),
            p_created_by, p_school_id, p_new_branch_id
        );
        RESIGNAL SET MESSAGE_TEXT = v_error_msg;
    END;
    
    
    IF p_created_by IS NULL OR p_created_by = '' THEN
        SET p_created_by = 'SYSTEM_BRANCH_INIT';
    END IF;
    
    
    INSERT INTO financial_audit_trail (
        table_name, record_id, action, old_values, new_values, 
        user_id, school_id, branch_id
    ) VALUES (
        'initialize_branch_accounting', 0, 'START', NULL,
        JSON_OBJECT(
            'school_id', p_school_id,
            'new_branch_id', p_new_branch_id,
            'action', 'Initializing accounting for new branch'
        ),
        p_created_by, p_school_id, p_new_branch_id
    );
    
    
    SELECT branch_id INTO v_main_branch_id
    FROM chart_of_accounts
    WHERE school_id = p_school_id
    AND is_active = 1
    GROUP BY branch_id
    ORDER BY MIN(created_at), COUNT(*) DESC
    LIMIT 1;
    
    
    IF v_main_branch_id IS NULL THEN
        SELECT DISTINCT branch_id INTO v_main_branch_id
        FROM chart_of_accounts
        WHERE school_id = p_school_id
        AND is_active = 1
        AND branch_id IS NOT NULL
        LIMIT 1;
    END IF;
    
    
    IF v_main_branch_id IS NULL THEN
        IF (SELECT COUNT(*) FROM chart_of_accounts 
            WHERE school_id = p_school_id AND branch_id IS NULL AND is_active = 1) > 0 THEN
            SET v_main_branch_id = NULL; 
        END IF;
    END IF;
    
    
    IF v_main_branch_id IS NULL AND 
       (SELECT COUNT(*) FROM chart_of_accounts WHERE school_id = p_school_id AND is_active = 1) = 0 THEN
        
        
        CALL create_default_chart_of_accounts(p_school_id, p_new_branch_id, p_created_by);
        
        INSERT INTO financial_audit_trail (
            table_name, record_id, action, old_values, new_values, 
            user_id, school_id, branch_id
        ) VALUES (
            'initialize_branch_accounting', 0, 'COMPLETE', NULL,
            JSON_OBJECT(
                'method', 'Created default chart of accounts',
                'school_id', p_school_id,
                'new_branch_id', p_new_branch_id,
                'accounts_created', (SELECT COUNT(*) FROM chart_of_accounts 
                                   WHERE school_id = p_school_id AND branch_id = p_new_branch_id)
            ),
            p_created_by, p_school_id, p_new_branch_id
        );
        
        SELECT 
            (SELECT COUNT(*) FROM chart_of_accounts 
             WHERE school_id = p_school_id AND branch_id = p_new_branch_id) as accounts_created,
            0 as accounts_copied,
            'Default chart of accounts created for new branch' as message;
        
    ELSE
        
        CALL auto_copy_chart_of_accounts(p_school_id, v_main_branch_id, p_school_id, p_new_branch_id, p_created_by);
        
        SELECT COUNT(*) INTO v_account_count
        FROM chart_of_accounts
        WHERE school_id = p_school_id AND branch_id = p_new_branch_id;
        
        INSERT INTO financial_audit_trail (
            table_name, record_id, action, old_values, new_values, 
            user_id, school_id, branch_id
        ) VALUES (
            'initialize_branch_accounting', 0, 'COMPLETE', NULL,
            JSON_OBJECT(
                'method', 'Copied from main branch',
                'source_branch_id', v_main_branch_id,
                'school_id', p_school_id,
                'new_branch_id', p_new_branch_id,
                'accounts_copied', v_account_count
            ),
            p_created_by, p_school_id, p_new_branch_id
        );
        
        SELECT 
            0 as accounts_created,
            v_account_count as accounts_copied,
            CONCAT('Chart of accounts copied from branch ', IFNULL(v_main_branch_id, 'MAIN'), ' to new branch') as message;
    END IF;
    
END $$

DROP PROCEDURE IF EXISTS InsertUpdateScore $$
CREATE PROCEDURE `InsertUpdateScore`(
    IN `p_admission_no` VARCHAR(50), 
    IN `p_subject_code` VARCHAR(50), 
    IN `p_class_code` VARCHAR(50), 
    IN `p_score` DECIMAL(5,2), 
    IN `p_ca_setup_id` VARCHAR(50), 
    IN `p_ca_type` VARCHAR(10), 
    IN `p_week_number` INT, 
    IN `p_academic_year` VARCHAR(20), 
    IN `p_term` VARCHAR(20), 
    IN `p_branch_id` VARCHAR(20)
)
BEGIN
    DECLARE v_ca_setup_id INT DEFAULT NULL;
    DECLARE v_max_score DECIMAL(5,2) DEFAULT 0;
    DECLARE v_is_locked BOOLEAN DEFAULT FALSE;
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_existing_count INT DEFAULT 0;
    DECLARE v_error_msg VARCHAR(255);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;

    SELECT id, max_score INTO v_ca_setup_id, v_max_score
    FROM ca_setup
    WHERE week_number = p_week_number
      AND ca_type = p_ca_type
      AND branch_id = p_branch_id
      AND status = 'Active'
    LIMIT 1;

    IF v_ca_setup_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'No active CA setup found for the given week number and CA type';
    END IF;

    SELECT COUNT(*), COALESCE(MAX(is_locked), FALSE) INTO v_existing_count, v_is_locked
    FROM weekly_scores
    WHERE admission_no = p_admission_no
      AND subject_code = p_subject_code
      AND week_number = p_week_number;

    IF v_existing_count > 0 AND v_is_locked THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Score is locked and cannot be modified';
    END IF;

    IF p_score > v_max_score THEN
        SET v_error_msg = CONCAT('Score exceeds maximum allowed score of ', v_max_score);
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = v_error_msg;
    END IF;

    INSERT INTO weekly_scores (
        admission_no,
        subject_code,
        class_code,
        ca_setup_id,
        score,
        max_score,
        week_number,
        assessment_type,
        academic_year,
        term
    ) VALUES (
        p_admission_no,
        p_subject_code,
        p_class_code,
        v_ca_setup_id,
        p_score,
        v_max_score,
        p_week_number,
        p_ca_type,
        p_academic_year,
        p_term
    )
    ON DUPLICATE KEY UPDATE 
        score = p_score,
        ca_setup_id = v_ca_setup_id,
        max_score = v_max_score;

    COMMIT;
END $$

DROP PROCEDURE IF EXISTS insert_transaction $$
CREATE PROCEDURE `insert_transaction`(IN `p_student_id` INT(100), IN `p_revenue_head_id` INT(100), IN `p_amount_paid` DECIMAL(10,2), IN `p_payment_method` VARCHAR(100), IN `p_transaction_reference` VARCHAR(100))
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
END $$

DROP PROCEDURE IF EXISTS leaveRecords $$
CREATE PROCEDURE `leaveRecords`(IN `query_type` VARCHAR(10), IN `in_record_id` INT, IN `in_user_id` VARCHAR(50), IN `in_user_role` VARCHAR(50), IN `in_user_name` VARCHAR(50), IN `in_class_name` VARCHAR(50), IN `in_type` VARCHAR(50), IN `in_start_date` DATE, IN `in_end_date` DATE, IN `in_no_of_days` INT, IN `in_applied_on` DATE, IN `in_status` ENUM('Pending','Approved','Rejected'), IN `in_approved_by` VARCHAR(50), IN `in_approved_on` DATE, IN `in_school_location` VARCHAR(200))
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
END $$

DROP PROCEDURE IF EXISTS lessons $$
CREATE PROCEDURE `lessons`(IN `in_query_type` VARCHAR(50), IN `in_lesson_id` INT, IN `in_class_name` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_lesson_date` DATE, IN `in_attachment` VARCHAR(255), IN `in_content` TEXT, IN `in_teacher` VARCHAR(100), IN `in_teacher_id` VARCHAR(15), IN `in_title` VARCHAR(100), IN `in_school_id` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_class_code` VARCHAR(20), IN `in_academic_year` VARCHAR(30), IN `in_term` VARCHAR(30), IN `in_duration` INT, IN `in_materials` TEXT, IN `in_objectives` TEXT, IN `in_status` VARCHAR(50))
BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO lessons (
            class_name, subject, lesson_date, attachment, content,
            teacher, title, school_id, branch_id, class_code,
            teacher_id, academic_year, term, duration, materials, objectives, status
        )
        VALUES (
            in_class_name, in_subject, in_lesson_date, in_attachment, in_content,
            in_teacher, in_title, in_school_id, in_branch_id, in_class_code,
            in_teacher_id, in_academic_year, in_term, in_duration, in_materials, in_objectives, 
            in_status
        );

    ELSEIF in_query_type = 'UPDATE' THEN
        UPDATE lessons
        SET 
            class_name = COALESCE(in_class_name, class_name),
            subject = COALESCE(in_subject, subject),
            lesson_date = COALESCE(in_lesson_date, lesson_date),
            attachment = COALESCE(in_attachment, attachment),
            content = COALESCE(in_content, content),
            teacher = COALESCE(in_teacher, teacher),
            title = COALESCE(in_title, title),
            duration = COALESCE(in_duration, duration),
            materials = COALESCE(in_materials, materials),
            objectives = COALESCE(in_objectives, objectives),
            status = COALESCE(in_status, status),
            updated_at = NOW()
        WHERE id = in_lesson_id;

    ELSEIF in_query_type = 'delete' THEN
        DELETE FROM lessons WHERE id = in_lesson_id;
        DELETE FROM lesson_comments WHERE lesson_id = in_lesson_id;

    ELSEIF in_query_type = 'select_teacher_lessons' THEN
        SELECT l.*, s.subject
        FROM lessons l
        JOIN subjects s ON s.subject_code = l.subject
        WHERE l.teacher_id = in_teacher_id
          AND l.school_id = in_school_id
          AND l.branch_id = in_branch_id
        ORDER BY l.lesson_date DESC;

    ELSEIF in_query_type = 'select' THEN
        IF in_lesson_id IS NOT NULL AND in_lesson_id !='' THEN
            SELECT l.*, s.subject
            FROM lessons l
            JOIN subjects s ON s.subject_code = l.subject
            WHERE l.id = in_lesson_id;
        ELSE
            SELECT l.*, s.subject
            FROM lessons l
            JOIN subjects s ON s.subject_code = l.subject
            WHERE l.school_id = in_school_id
              AND l.branch_id = in_branch_id
              AND l.class_code = in_class_code
              AND l.status != 'draft'
            ORDER BY l.lesson_date DESC;
        END IF;

    END IF;
END $$

DROP PROCEDURE IF EXISTS lesson_comments $$
CREATE PROCEDURE `lesson_comments`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_lesson_id` INT(10), IN `in_user_id` VARCHAR(15), IN `in_user_name` VARCHAR(30), IN `in_user_role` VARCHAR(10), IN `in_parent_id` INT(11), IN `in_comment` VARCHAR(500))
BEGIN
 IF query_type="create" THEN
 INSERT INTO lesson_comments (lesson_id, user_id, user_name, user_role, comment, parent_id) 
 VALUES (in_lesson_id, in_user_id, in_user_name, in_user_role, in_comment, in_parent_id);
 
  ELSEIF  query_type="select" THEN
  SELECT * FROM lesson_comments WHERE lesson_id = in_lesson_id;
 END IF;
 
END $$

DROP PROCEDURE IF EXISTS lesson_time_table $$
CREATE PROCEDURE `lesson_time_table`(IN `query_type` VARCHAR(50), IN `in_id` VARCHAR(50), IN `in_day` VARCHAR(20), IN `in_class_name` VARCHAR(50), IN `in_subject` VARCHAR(50), IN `in_teacher_id` INT(10), IN `in_section` VARCHAR(50), IN `in_school_location` VARCHAR(150), IN `in_start_time` VARCHAR(20), IN `in_end_time` VARCHAR(20), IN `in_status` VARCHAR(50), IN `in_school_id` VARCHAR(10), IN `in_branch_id` VARCHAR(20), IN `in_class_code` VARCHAR(20))
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
        WHERE x.status = 'Active' AND x.school_id = in_school_id;
    
    ELSEIF query_type = 'select' THEN
    SELECT l.*,t.name FROM lesson_time_table l LEFT JOIN teachers t ON l.teacher_id = t.id 
    WHERE section = in_section AND l.school_id = in_school_id;
    
    ELSEIF query_type = 'select-class-subjects' THEN
    SELECT l.*,t.name FROM lesson_time_table l LEFT JOIN teachers t ON l.teacher_id = t.id 
    WHERE section = in_section AND class_name = in_class_name AND l.school_id = in_school_id;
    ELSEIF query_type = 'teacher-select' THEN
    SELECT l.*,t.name FROM lesson_time_table l LEFT JOIN teachers t ON l.teacher_id = t.id 
    WHERE teacher_id = in_teacher_id AND l.school_id = in_school_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS libraryCatalogue $$
CREATE PROCEDURE `libraryCatalogue`(IN `query_type` ENUM('CREATE','UPDATE','RETURN','SELECT'), IN `in_book_title` VARCHAR(255), IN `in_author` VARCHAR(255), IN `in_isbn` VARCHAR(20), IN `in_cover_img` VARCHAR(500), IN `in_borrower_name` VARCHAR(255), IN `in_date_borrowed` DATE, IN `in_due_date` DATE, IN `in_return_date` DATE, IN `in_status` ENUM('Available','Borrowed','Overdue'), IN `in_qty` INT, IN `in_post_date` DATE, IN `in_rack_no` VARCHAR(255), IN `in_publisher` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_book_no` VARCHAR(50), IN `in_record_id` INT)
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
END $$

DROP PROCEDURE IF EXISTS LinkStudentsToUsers $$
CREATE PROCEDURE `LinkStudentsToUsers`()
BEGIN
    -- Step 1: Create temporary table to map student IDs to new user IDs
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_student_user_map (
        student_id INT PRIMARY KEY,
        admission_no VARCHAR(50)
    );

    -- Step 2: Insert unlinked students (user_id = 0) into users table
    INSERT INTO users (username, name, school_id, user_type)
    SELECT 
        admission_no AS username,
        student_name AS name,
        school_id,
        'Student' AS user_type
    FROM students
    WHERE user_id = 0;

    -- Step 3: Store student IDs and usernames in temp table for mapping
    INSERT INTO temp_student_user_map (student_id, admission_no)
    SELECT id, admission_no
    FROM students
    WHERE user_id = 0;

    -- Step 4: Update students.user_id with the newly inserted user IDs
    UPDATE students s
    JOIN temp_student_user_map t ON s.id = t.student_id
    JOIN users u ON u.username = t.admission_no
    SET s.user_id = u.id;

    -- Step 5: Optionally drop temp table (auto dropped at session end)
    DROP TEMPORARY TABLE IF EXISTS temp_student_user_map;
END $$

DROP PROCEDURE IF EXISTS ListCASetups $$
CREATE PROCEDURE `ListCASetups`(
    IN query_type VARCHAR(50),
    IN p_school_id VARCHAR(20),
    IN p_branch_id VARCHAR(20)
)
BEGIN
    IF query_type = 'SELECT-BRANCH-SETUP' THEN
        SELECT 
            id,
            ca_type,
            week_number,
            max_score,
            overall_contribution_percent,
            status,
            school_id,
            branch_id,
            created_at,
            updated_at
        FROM ca_setup
        WHERE status = 'Active'
          AND school_id = p_school_id
          AND branch_id = p_branch_id
        ORDER BY ca_type, week_number;

    ELSEIF query_type = 'SELECT-SCHOOL-SETUP' THEN
        SELECT 
            id,
            ca_type,
            week_number,
            max_score,
            overall_contribution_percent,
            status,
            school_id,
            branch_id,
            created_at,
            updated_at
        FROM ca_setup
        WHERE status = 'Active'
          AND school_id = p_school_id
        ORDER BY branch_id, ca_type, week_number;
    END IF;
END $$

DROP PROCEDURE IF EXISTS LockAllScores $$
CREATE PROCEDURE `LockAllScores`(IN `p_class_code` VARCHAR(20), IN `p_subject_code` VARCHAR(20), IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'))
BEGIN
    UPDATE weekly_scores 
    SET is_locked = TRUE 
    WHERE class_code = p_class_code 
      AND subject_code = p_subject_code 
      AND assessment_type = p_ca_type;
END $$

DROP PROCEDURE IF EXISTS ManageCalendarEvents $$
CREATE PROCEDURE `ManageCalendarEvents`(IN `operation` VARCHAR(10), IN `event_id` INT, IN `title` VARCHAR(255), IN `start_date` DATETIME, IN `end_date` DATETIME, IN `school_location` VARCHAR(150), IN `status` ENUM('Active','Inactive','Cancelled'), IN `created_by` VARCHAR(50), IN `recurrence` ENUM('Once','Annual'))
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
END $$

DROP PROCEDURE IF EXISTS managePrivilages $$
CREATE PROCEDURE `managePrivilages`(IN `query_type` VARCHAR(20), IN `in_id` INT, IN `in_user_id` INT, IN `in_user_type` VARCHAR(20), IN `in_description` VARCHAR(100), IN `in_accessTo` TEXT, IN `in_permissions` TEXT, IN `in_school_id` VARCHAR(20))
BEGIN
IF query_type = 'CREATE USER ROLE' THEN

  INSERT INTO `roles`(`user_type`, `description`, `accessTo`, `permissions`, `school_id`) 
  VALUES (`in_user_type`, `in_description`, `in_accessTo`, `in_permissions`, `in_school_id`);

ELSEIF  query_type = 'CREATE ROLE SETUP' THEN
    INSERT INTO `roles`(`user_type`, `description`, `accessTo`, `permissions`, `school_id`) 
    VALUES (`in_user_type`, `in_description`, `in_accessTo`, `in_permissions`, `in_school_id`);
ELSEIF  query_type = 'UPDATE ROLE SETUP' THEN
    UPDATE `roles` SET `user_type`=in_user_type,`description`=in_description,`accessTo`=in_accessTo,`permissions`=in_permissions WHERE `role_id` = in_id;
ELSEIF  query_type = 'UPDATE USER ROLE' THEN
 UPDATE `user_roles` SET accessTo = in_accessTo, permissions = in_permissions WHERE user_id =in_user_id;
ELSEIF query_type = 'select' THEN
 	SELECT * FROM `user_roles` WHERE user_id = in_user_id;
 ELSEIF  query_type = 'SELECT ROLE SETUP' THEN
   SELECT * FROM roles WHERE school_id = in_school_id;
END IF;
END $$

DROP PROCEDURE IF EXISTS ManageRules $$
CREATE PROCEDURE `ManageRules`(IN `queryType` VARCHAR(10), IN `ruleID` INT, IN `ruleName` VARCHAR(100), IN `startTime` TIME, IN `endTime` TIME, IN `locationIsBoolean` BOOLEAN)
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
END $$

DROP PROCEDURE IF EXISTS ManageSyllabus $$
CREATE PROCEDURE `ManageSyllabus`(IN `op_type` VARCHAR(10), IN `p_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_level` INT, IN `p_academic_year` YEAR, IN `p_term` VARCHAR(50), IN `p_week_no` TINYINT, IN `p_title` VARCHAR(300), IN `p_content` TEXT)
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
END $$

DROP PROCEDURE IF EXISTS manage_attendance $$
CREATE PROCEDURE `manage_attendance`(IN `query_type` VARCHAR(20), IN `p_attendance_id` INT, IN `p_name` VARCHAR(255), IN `p_className` VARCHAR(255), IN `p_role` VARCHAR(255), IN `p_department` VARCHAR(255), IN `p_date` DATE, IN `p_check_in_time` TIME, IN `p_check_out_time` TIME)
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
END $$

DROP PROCEDURE IF EXISTS manage_branches $$
CREATE PROCEDURE `manage_branches`(IN `query_type` VARCHAR(50), IN `in_branch_id` VARCHAR(50), IN `in_school_id` VARCHAR(20), IN `in_branch_name` VARCHAR(50), IN `in_location` VARCHAR(200), IN `in_short_name` VARCHAR(10), IN `in_status` ENUM('Active','Inactive'))
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
	UPDATE  number_generator SET `code` = brch_id WHERE description ='branch_code';
  -- Get all branches for a specific school
  ELSEIF query_type = 'get_all' THEN
    SELECT * FROM school_locations WHERE school_id = in_school_id ORDER BY branch_id ASC;

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


  ELSEIF query_type = 'select' THEN
    SELECT * FROM school_locations WHERE school_id = in_school_id;
    
  -- Delete all branches for a specific school
  ELSEIF query_type = 'delete_all' THEN
    DELETE FROM school_locations WHERE school_id = in_school_id;

  ELSE
    -- Invalid query_type
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query type';
  END IF;
END $$

DROP PROCEDURE IF EXISTS manage_expenses $$
CREATE PROCEDURE `manage_expenses`(IN `query_type` VARCHAR(10), IN `expose_id` INT, IN `category_name` VARCHAR(100), IN `source` VARCHAR(100), IN `transaction_type` VARCHAR(50))
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
END $$

DROP PROCEDURE IF EXISTS manage_financial_report $$
CREATE PROCEDURE `manage_financial_report`(IN `query_type` VARCHAR(20), IN `report_id` INT, IN `report_date` DATE, IN `report_category` VARCHAR(100), IN `report_description` TEXT, IN `report_amount` DECIMAL(10,2), IN `payment_method` VARCHAR(20))
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

END $$

DROP PROCEDURE IF EXISTS manage_income $$
CREATE PROCEDURE `manage_income`(IN `query_type` VARCHAR(10), IN `income_id` INT, IN `income_category_name` VARCHAR(100), IN `income_source` VARCHAR(50), IN `transaction_type` VARCHAR(50))
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
END $$

DROP PROCEDURE IF EXISTS manage_notice_board $$
CREATE PROCEDURE `manage_notice_board`(IN `query_type` VARCHAR(20), IN `in_id` VARCHAR(50), IN `in_title` VARCHAR(255), IN `in_description` TEXT, IN `in_status` VARCHAR(50), IN `in_due_date` VARCHAR(50), IN `in_category` ENUM('Notice','Notification'), IN `in_created_by` VARCHAR(30), IN `in_branch_id` VARCHAR(50), IN `in_school_id` VARCHAR(50))
BEGIN
  IF query_type = 'insert' THEN
    INSERT INTO notice_board (
      title, description, status, due_date, category,
      school_id, branch_id, created_by
    )
    VALUES (
      in_title, in_description, in_status, in_due_date, in_category,
      in_school_id, in_branch_id, in_created_by
    );

  ELSEIF query_type = 'update' THEN
    UPDATE notice_board
    SET
      title       = COALESCE(NULLIF(in_title, ''), title),
      description = COALESCE(NULLIF(in_description, ''), description),
      status      = COALESCE(NULLIF(in_status, ''), status),
      due_date    = IFNULL(in_due_date, due_date),
      category    = COALESCE(NULLIF(in_category, ''), category),
      school_id   = COALESCE(NULLIF(in_school_id, ''), school_id),
      branch_id   = COALESCE(NULLIF(in_branch_id, ''), branch_id),
      created_by  = IF(in_created_by = 0, created_by, in_created_by)
    WHERE id = in_id;

  ELSEIF query_type = 'SELECT' THEN
    SELECT * FROM notice_board WHERE school_id = in_school_id
      AND (in_branch_id IS NULL OR in_branch_id = '' OR branch_id = in_branch_id)
      AND (in_category IS NULL OR in_category = '' OR category = in_category)
      AND (in_status IS NULL OR in_status = '' OR status = in_status)
      AND DATE(due_date) >= CURDATE()
      ORDER BY created_at DESC;
    ELSEIF query_type = 'select-all' THEN
    SELECT * FROM notice_board WHERE school_id = in_school_id
      ORDER BY created_at DESC;
  END IF;
END $$

DROP PROCEDURE IF EXISTS manage_payments $$
CREATE PROCEDURE `manage_payments`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_admission_no` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_ref_no` INT, IN `in_item_id` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(8,2), IN `in_discount` DECIMAL(8,2), IN `in_fines` DECIMAL(8,2), IN `in_qty` INT, IN `in_academic_year` VARCHAR(9), IN `in_term` VARCHAR(20), IN `in_status` VARCHAR(20), IN `in_due_date` DATE, IN `in_payment_date` DATE, IN `in_payment_mode` VARCHAR(255), IN `in_created_by` VARCHAR(255), IN `in_branch_id` VARCHAR(20), IN `in_school_id` VARCHAR(10), IN `in_limit` INT, IN `in_offset` INT, IN `start_date` DATE, IN `end_date` DATE, IN `total` VARCHAR(100))
BEGIN

  -- ✅ CREATE ENTRY
  IF query_type = 'create' THEN
        DELETE FROM payment_entries
        WHERE 
            admission_no = in_admission_no
            AND class_code = in_class_name
            AND term = in_term
            AND academic_year = in_academic_year
            AND cr > 0
            AND dr = 0
            AND school_id = in_school_id;

        -- Calculate unit_price from amount and quantity
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, unit_price, dr, description, school_id, branch_id,
            quantity, is_optional
        )
        VALUES (
            in_ref_no, in_admission_no, in_class_name, in_academic_year, in_term,
            in_amount, 
            CASE WHEN in_qty > 0 THEN in_amount / in_qty ELSE in_amount END,
            0.00, in_description, in_school_id, in_branch_id,
            in_qty, 'Yes'
        );

  -- ✅ UPDATE ONLY DR PAYMENT FIELDS
  ELSEIF query_type = 'update-paid' THEN
    UPDATE payment_entries
    SET 
        dr = COALESCE(in_amount, dr),
        `status` = COALESCE(in_status, `status`),
        payment_date = COALESCE(in_payment_date, payment_date),
        payment_mode = COALESCE(in_payment_mode, payment_mode)
    WHERE 
        item_id = in_item_id 
        AND ref_no = in_ref_no;

  -- ✅ UPDATE ANY FIELD
ELSEIF query_type = 'update' THEN
    UPDATE payment_entries
    SET 
        cr = COALESCE(in_amount, cr),
        unit_price = CASE 
            WHEN in_qty > 0 AND in_amount IS NOT NULL THEN in_amount / in_qty
            WHEN in_qty > 0 THEN cr / in_qty
            ELSE unit_price
        END,
        description = COALESCE(in_description, description),
        `payment_status` = COALESCE(in_status, `payment_status`),
        due_date = COALESCE(in_due_date, due_date),
        payment_date = COALESCE(in_payment_date, payment_date),
        payment_mode = COALESCE(in_payment_mode, payment_mode),
        created_by = COALESCE(in_created_by, created_by),
        branch_id = COALESCE(in_branch_id, branch_id),
        school_id = COALESCE(in_school_id, school_id)
    WHERE item_id = in_item_id;


   -- ✅ UPDATE ONLY DR PAYMENT FIELDS
  ELSEIF query_type = 'update-paid' THEN
    UPDATE payment_entries
    SET 
        dr = COALESCE(in_amount, dr),
        `status` = COALESCE(in_status, `status`),
        payment_date = COALESCE(in_payment_date, payment_date),
        payment_mode = COALESCE(in_payment_mode, payment_mode)
    WHERE 
        item_id = in_item_id 
        AND ref_no = in_ref_no;

  -- ✅ SELECT BILLS (Include all students even without payments)
ELSEIF query_type = 'select-bills' THEN
    SELECT 
        s.student_name, 
        s.current_class AS class_name, 
        s.admission_no, 
        COALESCE(p.term, in_term) AS term, 
        COUNT(p.item_id) AS invoice_count,
        COALESCE(SUM(p.cr), 0) AS total_invoice,
        COALESCE(SUM(p.dr), 0) AS total_paid,
        COALESCE(SUM(p.cr), 0) - COALESCE(SUM(p.dr), 0) AS balance
    FROM students s 
    LEFT JOIN payment_entries p 
        ON s.admission_no = p.admission_no
        AND s.current_class = p.class_code
        AND p.school_id = in_school_id
        AND p.academic_year = in_academic_year
        AND p.term = in_term
        AND (p.payment_status IS NULL OR p.payment_status != 'Excluded')
    WHERE 
        s.current_class = in_class_name
        AND s.school_id = in_school_id
    GROUP BY s.student_name, s.current_class, s.admission_no, p.term
    ORDER BY s.student_name;


  -- ✅ SELECT FAMILY BILLS
  ELSEIF query_type = 'select-family-bills' THEN
    SELECT 
        s.student_name, 
        s.current_class AS class_name, 
        s.admission_no, 
        COALESCE(p.term, in_term) AS term, 
        COUNT(p.item_id) AS invoice_count,
        COALESCE(SUM(p.cr), 0) AS total_invoice,
        COALESCE(SUM(p.discount), 0) AS total_discount,
        COALESCE(SUM(p.fines), 0) AS total_fines,
        COALESCE(SUM(p.dr), 0) AS total_paid,
        COALESCE(SUM(p.cr), 0) - COALESCE(SUM(p.discount), 0)
          + COALESCE(SUM(p.fines), 0) - COALESCE(SUM(p.dr), 0) AS balance
    FROM students s 
    LEFT JOIN payment_entries p 
          ON s.admission_no = p.admission_no
         AND s.current_class = p.class_code
         AND (p.term = in_term OR p.term IS NULL)
    WHERE s.parent_id = in_id
    GROUP BY s.student_name, s.current_class, s.admission_no, p.term
    ORDER BY s.student_name;

  -- ✅ SELECT PAYMENTS
  ELSEIF query_type = 'select-payments' THEN
    SELECT 
        s.student_name, 
        s.current_class AS class_name, 
        s.admission_no, 
        p.term AS term, 
        COUNT(p.item_id) AS invoice_count,
        COALESCE(SUM(p.cr), 0) AS total_invoice,
        COALESCE(SUM(p.dr), 0) AS amount_paid
    FROM students s 
    JOIN payment_entries p 
        ON s.admission_no = p.admission_no
       AND s.current_class = p.class_code
       AND p.term = in_term
    WHERE 
        s.current_class = in_class_name
        AND p.cr > 0 
        AND p.school_id = in_school_id
    GROUP BY s.student_name, s.current_class, s.admission_no, p.term
    ORDER BY s.student_name;

  -- ✅ CLASS PAYMENTS
  ELSEIF query_type = 'class-payments' THEN
    SELECT 
        s.student_name, 
        p.class_code, 
        p.academic_year,
        p.admission_no, 
        p.term, 
        COUNT(p.item_id) AS invoice_count,
        COALESCE(SUM(p.cr), 0) AS total_invoice
    FROM students s 
    JOIN payment_entries p 
        ON s.admission_no = p.admission_no
       AND s.current_class = p.class_code
       AND p.term = in_term
       AND p.academic_year = in_academic_year
    WHERE 
        s.current_class = in_class_name 
        AND p.cr > 0 
        AND p.school_id = in_school_id
    GROUP BY s.student_name, p.class_code, p.academic_year, p.admission_no, p.term
    ORDER BY s.student_name;

  -- ✅ SELECT CLASS COUNT
  ELSEIF query_type = 'select-class-count' THEN
    SELECT 
        class_code, 
        COUNT(DISTINCT admission_no) AS count_students 
    FROM payment_entries
    WHERE school_id = in_school_id
    GROUP BY class_code 
    ORDER BY class_code;

  -- ✅ SELECT REF
  ELSEIF query_type = 'select-ref' THEN
    SELECT * FROM payment_entries WHERE ref_no = in_ref_no;

  -- ✅ SELECT BY ID
  ELSEIF query_type = 'select-id' THEN 
    SELECT * FROM payment_entries WHERE id = in_id;

  -- ✅ SELECT BY STUDENT
  ELSEIF query_type = 'select-student' THEN 
    SELECT * FROM payment_entries WHERE admission_no = in_admission_no;

  -- ✅ GENERIC SELECT
  ELSEIF query_type = 'select' THEN 
    SELECT * 
    FROM payment_entries
    WHERE 
        admission_no = in_admission_no 
        AND term = in_term 
        AND payment_status != 'Excluded'
        AND academic_year = in_academic_year;

  -- ✅ SOFT DELETE
  ELSEIF query_type = 'delete' THEN 
    UPDATE payment_entries 
    SET payment_status = 'Excluded'
    WHERE item_id = in_item_id;
 -- ✅ DELETE STUDENT INVOICE (for copying bills)  
 ELSEIF query_type = 'delete-student-invoice' THEN 
   DELETE FROM payment_entries 
   WHERE   
     admission_no = in_admission_no                
     AND class_code = in_class_name                
     AND academic_year = in_academic_year         
     AND term = in_term        
     AND school_id = in_school_id                 
     AND cr > 0                
     AND dr = 0;  
  END IF;

END $$

DROP PROCEDURE IF EXISTS manage_payments_enhanced $$
CREATE PROCEDURE `manage_payments_enhanced`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_admission_no` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_ref_no` INT, IN `in_item_id` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_qty` INT, IN `in_academic_year` VARCHAR(20), IN `in_term` VARCHAR(20), IN `in_payment_mode` VARCHAR(255), IN `in_created_by` VARCHAR(255), IN `in_branch_id` VARCHAR(20), IN `in_school_id` VARCHAR(20), IN `in_limit` INT, IN `in_offset` INT, IN `start_date` DATE, IN `end_date` DATE, IN `total` VARCHAR(100), IN `in_payment_status` VARCHAR(50))
BEGIN
    DECLARE v_affected_rows INT DEFAULT 0;

    IF query_type = 'update' THEN
        UPDATE payment_entries
        SET 
            payment_status = IFNULL(in_payment_status, payment_status),
            updated_at = NOW()
        WHERE 
            item_id = IFNULL(in_item_id, in_id)
            AND school_id = in_school_id;

        SET v_affected_rows = ROW_COUNT();
        SELECT v_affected_rows as affected_rows;

    ELSEIF query_type = 'select-bills' THEN
        SELECT 
            s.student_name, 
            s.current_class AS class_name, 
            s.admission_no, 
            pe.term AS term, 
            COUNT(pe.item_id) AS invoice_count,
            SUM(pe.cr) AS total_invoice,
            SUM(pe.dr) AS total_paid,
            (SUM(pe.cr) - SUM(pe.dr)) AS balance
        FROM students s 
        LEFT JOIN payment_entries pe 
              ON s.admission_no = pe.admission_no
             AND s.current_class = pe.class_code
             AND pe.payment_status != 'Excluded'
        WHERE 
            s.current_class = in_class_name 
            AND s.school_id = in_school_id
        GROUP BY s.student_name, s.current_class, s.admission_no, pe.term
        ORDER BY s.student_name;

    ELSEIF query_type = 'select' THEN 
        SELECT * FROM payment_entries pe
        WHERE 
            (in_admission_no IS NULL OR pe.admission_no = in_admission_no)
            AND (in_term IS NULL OR pe.term = in_term)
            AND (in_academic_year IS NULL OR pe.academic_year = in_academic_year)
            AND pe.school_id = in_school_id
            AND pe.payment_status != 'Excluded'
        ORDER BY pe.created_at DESC
        LIMIT 100;

    ELSEIF query_type = 'select-student' THEN 
        SELECT * FROM payment_entries pe
        WHERE 
            pe.admission_no = in_admission_no
            AND pe.school_id = in_school_id
            AND pe.payment_status != 'Excluded'
        ORDER BY pe.created_at DESC;

    ELSE
        SELECT 'Query type not implemented' as message;
    END IF;

END $$

DROP PROCEDURE IF EXISTS manage_payments_enhanced_fixed $$
CREATE PROCEDURE `manage_payments_enhanced_fixed`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_admission_no` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_ref_no` INT, IN `in_item_id` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_qty` INT, IN `in_academic_year` VARCHAR(20), IN `in_term` VARCHAR(20), IN `in_payment_mode` VARCHAR(255), IN `in_created_by` VARCHAR(255), IN `in_branch_id` VARCHAR(20), IN `in_school_id` VARCHAR(20), IN `in_limit` INT, IN `in_offset` INT, IN `start_date` DATE, IN `end_date` DATE, IN `total` VARCHAR(100))
BEGIN
    DECLARE v_ref_no INT;

    -- =====================================================================================
    -- SELECT STUDENT BILLS WITH BALANCE - FIXED VERSION
    -- =====================================================================================
    IF query_type = 'select-bills' THEN
        -- Debug: Log the parameters being used
        SELECT CONCAT('DEBUG: Parameters - class_name: ', IFNULL(in_class_name, 'NULL'), 
                     ', term: ', IFNULL(in_term, 'NULL'), 
                     ', academic_year: ', IFNULL(in_academic_year, 'NULL'),
                     ', branch_id: ', IFNULL(in_branch_id, 'NULL'),
                     ', school_id: ', IFNULL(in_school_id, 'NULL')) AS debug_info;
        
        SELECT 
            s.student_name, 
            s.current_class AS class_name, 
            s.admission_no, 
            IFNULL(in_term, 'N/A') AS term,  -- Use input term instead of pe.term
            COUNT(pe.item_id) AS invoice_count,
            IFNULL(SUM(CASE WHEN pe.cr IS NOT NULL THEN pe.cr ELSE 0 END), 0) AS total_invoice,
            IFNULL(SUM(CASE WHEN pe.dr IS NOT NULL THEN pe.dr ELSE 0 END), 0) AS total_paid,
            IFNULL(SUM(CASE WHEN pe.cr IS NOT NULL THEN pe.cr ELSE 0 END), 0) - 
            IFNULL(SUM(CASE WHEN pe.dr IS NOT NULL THEN pe.dr ELSE 0 END), 0) AS balance,
            CASE 
                WHEN IFNULL(SUM(CASE WHEN pe.cr IS NOT NULL THEN pe.cr ELSE 0 END), 0) - 
                     IFNULL(SUM(CASE WHEN pe.dr IS NOT NULL THEN pe.dr ELSE 0 END), 0) <= 0 THEN 'Paid'
                WHEN IFNULL(SUM(CASE WHEN pe.dr IS NOT NULL THEN pe.dr ELSE 0 END), 0) > 0 THEN 'Partial'
                ELSE 'Unpaid'
            END AS payment_status,
            -- Additional debug fields
            s.branch_id as student_branch_id,
            s.school_id as student_school_id,
            COUNT(DISTINCT pe.item_id) as distinct_payment_entries
        FROM students s 
        LEFT JOIN payment_entries pe 
              ON s.admission_no = pe.admission_no
             AND s.current_class = pe.class_code
             AND (in_term IS NULL OR pe.term = in_term)
             AND (in_academic_year IS NULL OR pe.academic_year = in_academic_year)
             AND (in_school_id IS NULL OR pe.school_id = in_school_id)
        WHERE 
            s.current_class = in_class_name 
            AND (in_school_id IS NULL OR s.school_id = in_school_id)
            AND (in_branch_id IS NULL OR s.branch_id = in_branch_id)
        GROUP BY s.student_name, s.current_class, s.admission_no, s.branch_id, s.school_id  -- Fixed GROUP BY
        ORDER BY s.student_name;

    -- =====================================================================================
    -- All other query types remain the same as original procedure
    -- =====================================================================================
    ELSEIF query_type = 'create' THEN
        -- Generate reference number if not provided
        IF in_ref_no IS NULL OR in_ref_no = 0 THEN
            SET v_ref_no = FLOOR(1000000000 + RAND() * 9000000000);
        ELSE
            SET v_ref_no = in_ref_no;
        END IF;

        -- Insert new payment entry (bill/invoice)
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, payment_mode, school_id, branch_id
        )
        VALUES (
            v_ref_no, in_admission_no, in_class_name, in_academic_year, in_term,
            IFNULL(in_amount, 0.00), 0.00, in_description, in_payment_mode, 
            in_school_id, in_branch_id
        );

        -- Return the created entry
        SELECT * FROM payment_entries WHERE ref_no = v_ref_no AND admission_no = in_admission_no;

    ELSEIF query_type = 'update' THEN
        UPDATE payment_entries
        SET 
            cr = IFNULL(in_amount, cr),
            description = IFNULL(in_description, description),
            payment_mode = IFNULL(in_payment_mode, payment_mode),
            academic_year = IFNULL(in_academic_year, academic_year),
            term = IFNULL(in_term, term),
            branch_id = IFNULL(in_branch_id, branch_id),
            updated_at = NOW()
        WHERE 
            (item_id = in_item_id OR ref_no = in_ref_no)
            AND admission_no = in_admission_no
            AND school_id = in_school_id;

        -- Return affected rows
        SELECT ROW_COUNT() as affected_rows;

    ELSEIF query_type = 'pay' THEN
        -- Generate reference number if not provided
        IF in_ref_no IS NULL OR in_ref_no = 0 THEN
            SET v_ref_no = FLOOR(1000000000 + RAND() * 9000000000);
        ELSE
            SET v_ref_no = in_ref_no;
        END IF;

        -- Insert payment record (debit entry)
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, payment_mode, school_id, branch_id
        )
        VALUES (
            v_ref_no, 
            in_admission_no, in_class_name, in_academic_year, in_term,
            0.00, IFNULL(in_amount, 0.00), 
            CONCAT('Payment for: ', IFNULL(in_description, 'School fees')), 
            in_payment_mode, in_school_id, in_branch_id
        );

        -- Return the payment entry
        SELECT * FROM payment_entries WHERE item_id = LAST_INSERT_ID();

    ELSEIF query_type = 'select-student' THEN 
        SELECT * FROM payment_entries 
        WHERE 
            admission_no = in_admission_no
            AND (in_term IS NULL OR term = in_term)
            AND (in_academic_year IS NULL OR academic_year = in_academic_year)
            AND school_id = in_school_id
        ORDER BY created_at DESC;

    ELSEIF query_type = 'balance' THEN
        SELECT 
            admission_no,
            term,
            academic_year,
            IFNULL(SUM(cr), 0) AS total_invoiced,
            IFNULL(SUM(dr), 0) AS total_paid,
            IFNULL(SUM(cr), 0) - IFNULL(SUM(dr), 0) AS balance
        FROM payment_entries
        WHERE 
            admission_no = in_admission_no
            AND (in_term IS NULL OR term = in_term)
            AND (in_academic_year IS NULL OR academic_year = in_academic_year)
            AND school_id = in_school_id
        GROUP BY admission_no, term, academic_year;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM payment_entries 
        WHERE 
            (item_id = in_id OR ref_no = in_ref_no)
            AND school_id = in_school_id;

        SELECT ROW_COUNT() as deleted_rows;

    END IF;

END $$

DROP PROCEDURE IF EXISTS manage_payment_entries $$
CREATE PROCEDURE `manage_payment_entries`(IN `query_type` VARCHAR(50), IN `item_id` INT, IN `ref_no` VARCHAR(30), IN `admission_no` VARCHAR(100), IN `class_code` VARCHAR(100), IN `academic_year` VARCHAR(20), IN `term` VARCHAR(20), IN `cr` DECIMAL(10,2), IN `dr` DECIMAL(10,2), IN `description` VARCHAR(255), IN `payment_mode` VARCHAR(30), IN `school_id` VARCHAR(20), IN `branch_id` VARCHAR(20), IN `payment_status` VARCHAR(30), IN `quantity` INT, IN `is_optional` VARCHAR(10))
BEGIN
    DECLARE v_ref_no VARCHAR(30);
    
    -- Generate reference number if not provided
    IF ref_no IS NULL OR ref_no = '' THEN
        SET v_ref_no = CONCAT('REF', UNIX_TIMESTAMP(), FLOOR(RAND() * 1000));
    ELSE
        SET v_ref_no = ref_no;
    END IF;

    -- =====================================================================================
    -- INSERT PAYMENT ENTRY (STUDENT-RELATED)
    -- =====================================================================================
    IF query_type = 'insert' THEN
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, payment_mode, school_id, branch_id
        )
        VALUES (
            v_ref_no, admission_no, class_code, academic_year, term,
            IFNULL(cr, 0.00), IFNULL(dr, 0.00), description, payment_mode, 
            school_id, branch_id
        );
        
        SELECT LAST_INSERT_ID() as item_id, v_ref_no as ref_no;

    -- =====================================================================================
    -- INSERT INCOME ENTRY (NOT TIED TO STUDENT)
    -- =====================================================================================
    ELSEIF query_type = 'insert_income' THEN
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, payment_mode, school_id, branch_id
        )
        VALUES (
            v_ref_no, NULL, NULL, academic_year, term,
            IFNULL(cr, 0.00), 0.00, description, payment_mode, 
            school_id, branch_id
        );
        
        SELECT LAST_INSERT_ID() as item_id, v_ref_no as ref_no, 'income' as entry_type;

    -- =====================================================================================
    -- INSERT EXPENSE ENTRY (NOT TIED TO STUDENT)
    -- =====================================================================================
    ELSEIF query_type = 'insert_expense' THEN
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, payment_mode, school_id, branch_id
        )
        VALUES (
            v_ref_no, NULL, NULL, academic_year, term,
            0.00, IFNULL(dr, 0.00), description, payment_mode, 
            school_id, branch_id
        );
        
        SELECT LAST_INSERT_ID() as item_id, v_ref_no as ref_no, 'expense' as entry_type;

    -- =====================================================================================
    -- GET ONE PAYMENT ENTRY
    -- =====================================================================================
    ELSEIF query_type = 'get_one' THEN
        SELECT * FROM payment_entries WHERE item_id = item_id;

    -- =====================================================================================
    -- GET ALL PAYMENT ENTRIES
    -- =====================================================================================
    ELSEIF query_type = 'get_all' THEN
        SELECT * FROM payment_entries ORDER BY created_at DESC;

    -- =====================================================================================
    -- UPDATE PAYMENT ENTRY
    -- =====================================================================================
    ELSEIF query_type = 'edit' THEN
        UPDATE payment_entries
        SET 
            ref_no = IFNULL(ref_no, ref_no),
            admission_no = IFNULL(admission_no, admission_no),
            class_code = IFNULL(class_code, class_code),
            academic_year = IFNULL(academic_year, academic_year),
            term = IFNULL(term, term),
            cr = IFNULL(cr, cr),
            dr = IFNULL(dr, dr),
            description = IFNULL(description, description),
            payment_mode = IFNULL(payment_mode, payment_mode),
            school_id = IFNULL(school_id, school_id),
            branch_id = IFNULL(branch_id, branch_id),
            updated_at = NOW()
        WHERE item_id = item_id;
        
        SELECT ROW_COUNT() as affected_rows;

    -- =====================================================================================
    -- DELETE PAYMENT ENTRY
    -- =====================================================================================
    ELSEIF query_type = 'delete' THEN
        DELETE FROM payment_entries WHERE item_id = item_id;
        SELECT ROW_COUNT() as deleted_rows;

    -- =====================================================================================
    -- CREDIT REPORT (INCOME/PAYMENTS RECEIVED)
    -- =====================================================================================
    ELSEIF query_type = 'credit_report' THEN
        SELECT 
            'Credit Entries' as report_type,
            SUM(cr) as total_credit,
            COUNT(*) as entry_count,
            academic_year,
            term
        FROM payment_entries 
        WHERE cr > 0 
        GROUP BY academic_year, term
        ORDER BY academic_year DESC, term;

    -- =====================================================================================
    -- DEBIT REPORT (EXPENSES/CHARGES)
    -- =====================================================================================
    ELSEIF query_type = 'debit_report' THEN
        SELECT 
            'Debit Entries' as report_type,
            SUM(dr) as total_debit,
            COUNT(*) as entry_count,
            academic_year,
            term
        FROM payment_entries 
        WHERE dr > 0 
        GROUP BY academic_year, term
        ORDER BY academic_year DESC, term;

    -- =====================================================================================
    -- INCOME REPORT (ALL INCOME INCLUDING STUDENT PAYMENTS)
    -- =====================================================================================
    ELSEIF query_type = 'income_report' THEN
        SELECT 
            description,
            SUM(cr) as total_income,
            COUNT(*) as transaction_count,
            academic_year,
            term,
            payment_mode
        FROM payment_entries 
        WHERE cr > 0 
        GROUP BY description, academic_year, term, payment_mode
        ORDER BY total_income DESC;

    -- =====================================================================================
    -- EXPENSES REPORT (ALL EXPENSES)
    -- =====================================================================================
    ELSEIF query_type = 'expenses_report' THEN
        SELECT 
            description,
            SUM(dr) as total_expenses,
            COUNT(*) as transaction_count,
            academic_year,
            term,
            payment_mode
        FROM payment_entries 
        WHERE dr > 0 
        GROUP BY description, academic_year, term, payment_mode
        ORDER BY total_expenses DESC;

    -- =====================================================================================
    -- BALANCE REPORT (TOTAL CREDITS VS DEBITS)
    -- =====================================================================================
    ELSEIF query_type = 'balance_report' THEN
        SELECT 
            IFNULL(SUM(cr), 0) as total_credit,
            IFNULL(SUM(dr), 0) as total_debit,
            IFNULL(SUM(cr), 0) - IFNULL(SUM(dr), 0) as balance,
            COUNT(*) as total_entries
        FROM payment_entries;

    END IF;

END $$

DROP PROCEDURE IF EXISTS manage_qr_code $$
CREATE PROCEDURE `manage_qr_code`(IN `query_type` VARCHAR(20), IN `qrcode_id` INT, IN `qr_code` TEXT, IN `user_type` VARCHAR(50), IN `expiry_datetime` DATETIME, IN `location_is_boolean` BOOLEAN, IN `longitude` DECIMAL(10,8), IN `latitude` DECIMAL(10,8), IN `status` ENUM('active','suspended','stopped'))
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
END $$

DROP PROCEDURE IF EXISTS manage_student_grading $$
CREATE PROCEDURE `manage_student_grading`(IN `query_type` VARCHAR(10), IN `p_id` INT, IN `p_admission_number` VARCHAR(50), IN `p_student_name` VARCHAR(100), IN `p_subject_name` VARCHAR(100), IN `p_class` VARCHAR(50), IN `p_score` DECIMAL(5,2), IN `p_mark_by` VARCHAR(100))
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
END $$

DROP PROCEDURE IF EXISTS manage_task_todo $$
CREATE PROCEDURE `manage_task_todo`(IN `op_type` VARCHAR(10), IN `p_id` VARCHAR(100), IN `p_user_id` INT(11), IN `p_title` VARCHAR(200), IN `p_event_for` VARCHAR(60), IN `p_event_category` ENUM('Celebration','Training','Holidays','Meeting'), IN `p_start_date` DATE, IN `p_end_date` DATE, IN `p_start_time` TIME, IN `p_end_time` TIME, IN `p_attachment` VARCHAR(500), IN `p_content` TEXT, IN `p_created_by` VARCHAR(50), IN `p_priority` ENUM('High','Medium','Low'), IN `p_search_keyword` VARCHAR(50), IN `p_limit` INT(11), IN `p_offset` INT(11))
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

END $$

DROP PROCEDURE IF EXISTS migrate_legacy_payments $$
CREATE PROCEDURE `migrate_legacy_payments`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE v_ref_no INT;
    DECLARE v_admission_no VARCHAR(20);
    DECLARE v_class_name VARCHAR(100);
    DECLARE v_academic_year VARCHAR(9);
    DECLARE v_term VARCHAR(30);
    DECLARE v_amount DECIMAL(10,2);
    DECLARE v_amount_paid DECIMAL(10,2);
    DECLARE v_discount DECIMAL(8,2);
    DECLARE v_fines DECIMAL(8,2);
    DECLARE v_description VARCHAR(200);
    DECLARE v_payment_mode VARCHAR(255);
    DECLARE v_school_id VARCHAR(10);
    DECLARE v_created_at TIMESTAMP;
    DECLARE v_status ENUM('Paid','Unpaid');
    
    DECLARE payment_cursor CURSOR FOR 
        SELECT id, ref_no, admission_no, class_name, academic_year, term, 
               amount, IFNULL(amount_paid, 0), discount, fines, description, 
               payment_mode, school_id, created_at, status
        FROM payments 
        WHERE id NOT IN (
            SELECT DISTINCT CAST(SUBSTRING_INDEX(description, 'Legacy ID:', -1) AS UNSIGNED)
            FROM payment_entries 
            WHERE description LIKE '%Legacy ID:%'
        );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    START TRANSACTION;
    
    OPEN payment_cursor;
    
    read_loop: LOOP
        FETCH payment_cursor INTO v_id, v_ref_no, v_admission_no, v_class_name, 
                                  v_academic_year, v_term, v_amount, v_amount_paid, 
                                  v_discount, v_fines, v_description, v_payment_mode, 
                                  v_school_id, v_created_at, v_status;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Insert the bill/invoice (CR entry)
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, payment_mode, school_id, branch_id, created_at
        )
        VALUES (
            v_ref_no, v_admission_no, v_class_name, v_academic_year, v_term,
            v_amount + v_fines - v_discount, 0.00, 
            CONCAT(v_description, ' (Legacy ID:', v_id, ')'),
            v_payment_mode, v_school_id, 'MIGRATED', v_created_at
        );
        
        -- Insert payment record (DR entry) if amount was paid
        IF v_amount_paid > 0 THEN
            INSERT INTO payment_entries (
                ref_no, admission_no, class_code, academic_year, term,
                cr, dr, description, payment_mode, school_id, branch_id, created_at
            )
            VALUES (
                v_ref_no, v_admission_no, v_class_name, v_academic_year, v_term,
                0.00, v_amount_paid, 
                CONCAT('Payment for: ', v_description, ' (Legacy ID:', v_id, ')'),
                v_payment_mode, v_school_id, 'MIGRATED', v_created_at
            );
        END IF;
        
    END LOOP;
    
    CLOSE payment_cursor;
    
    COMMIT;
    
    -- Return migration summary
    SELECT 
        COUNT(*) as total_legacy_payments,
        (SELECT COUNT(*) FROM payment_entries WHERE description LIKE '%Legacy ID:%') as migrated_entries,
        'Migration completed successfully' as status;
        
END $$

DROP PROCEDURE IF EXISTS migrate_payment_entries_to_accounting $$
CREATE PROCEDURE `migrate_payment_entries_to_accounting`(IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_limit` INT(6))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_payment_entry_id INT;
    DECLARE v_processed_count INT DEFAULT 0;
    DECLARE v_error_count INT DEFAULT 0;
    DECLARE v_error_msg VARCHAR(255);
    
    -- Cursor for payment entries without journal entries
    DECLARE payment_cursor CURSOR FOR
        SELECT item_id
        FROM payment_entries
        WHERE school_id = p_school_id
        AND (branch_id = p_branch_id OR p_branch_id IS NULL)
        AND journal_entry_id IS NULL
        AND (cr > 0 OR dr > 0)
        AND created_at >= DATE_SUB(NOW(), INTERVAL 2 YEAR)  -- Only process recent entries
        ORDER BY created_at DESC
        LIMIT p_limit;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        INSERT INTO financial_audit_trail (
            table_name, 
            record_id, 
            action, 
            old_values, 
            new_values, 
            user_id, 
            school_id, 
            branch_id
        ) VALUES (
            'migration_payment_entries',
            0,
            'ERROR',
            NULL,
            JSON_OBJECT('error', v_error_msg, 'processed_count', v_processed_count, 'error_count', v_error_count),
            'SYSTEM_MIGRATION',
            p_school_id,
            p_branch_id
        );
        RESIGNAL SET MESSAGE_TEXT = v_error_msg;
    END;

    -- Start transaction
    START TRANSACTION;
    
    -- Create audit trail entry for migration start
    INSERT INTO financial_audit_trail (
        table_name, 
        record_id, 
        action, 
        old_values, 
        new_values, 
        user_id, 
        school_id, 
        branch_id
    ) VALUES (
        'migration_payment_entries',
        0,
        'START',
        NULL,
        JSON_OBJECT('school_id', p_school_id, 'branch_id', p_branch_id, 'limit', p_limit),
        'SYSTEM_MIGRATION',
        p_school_id,
        p_branch_id
    );
    
    -- Open cursor
    OPEN payment_cursor;
    
    -- Process each payment entry
    payment_loop: LOOP
        FETCH payment_cursor INTO v_payment_entry_id;
            
        IF done THEN
            LEAVE payment_loop;
        END IF;
        
        -- Try to create journal entry for this payment entry
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            BEGIN
                SET v_error_count = v_error_count + 1;
                GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
                INSERT INTO financial_audit_trail (
                    table_name, 
                    record_id, 
                    action, 
                    old_values, 
                    new_values, 
                    user_id, 
                    school_id, 
                    branch_id
                ) VALUES (
                    'migration_payment_entries',
                    v_payment_entry_id,
                    'ERROR',
                    NULL,
                    JSON_OBJECT('error', v_error_msg),
                    'SYSTEM_MIGRATION',
                    p_school_id,
                    p_branch_id
                );
            END;
            
            -- Call procedure to convert payment to journal entry
            CALL convert_payment_to_journal(v_payment_entry_id, 'SYSTEM_MIGRATION');
            SET v_processed_count = v_processed_count + 1;
        END;
    END LOOP;
    
    -- Close cursor
    CLOSE payment_cursor;
    
    -- Commit transaction
    COMMIT;
    
    -- Create audit trail entry for migration completion
    INSERT INTO financial_audit_trail (
        table_name, 
        record_id, 
        action, 
        old_values, 
        new_values, 
        user_id, 
        school_id, 
        branch_id
    ) VALUES (
        'migration_payment_entries',
        0,
        'COMPLETE',
        NULL,
        JSON_OBJECT('processed_count', v_processed_count, 'error_count', v_error_count, 'total_attempted', v_processed_count + v_error_count),
        'SYSTEM_MIGRATION',
        p_school_id,
        p_branch_id
    );
    
    -- Return migration summary
    SELECT 
        v_processed_count as processed_count,
        v_error_count as error_count,
        (v_processed_count + v_error_count) as total_attempted;
        
END $$

DROP PROCEDURE IF EXISTS others_staff $$
CREATE PROCEDURE `others_staff`(IN `p_quary` VARCHAR(10), IN `p_id` INT, IN `p_user_id` INT, IN `p_passport_url` VARCHAR(200), IN `p_role` VARCHAR(20), IN `p_name` VARCHAR(255), IN `p_sex` VARCHAR(10), IN `p_age` INT, IN `p_address` TEXT, IN `p_date_of_birth` DATE, IN `p_marital_status` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_mobile_no` VARCHAR(20), IN `p_email` VARCHAR(100), IN `p_qualification` VARCHAR(255), IN `p_working_experience` TEXT, IN `p_religion` VARCHAR(50), IN `p_last_place_of_work` VARCHAR(255), IN `p_do_you_have` TEXT, IN `p_when_do` DATE, IN `p_account_name` VARCHAR(255), IN `p_account_number` VARCHAR(50), IN `p_bank` VARCHAR(100), IN `p_branch_id` VARCHAR(20), IN `p_school_id` VARCHAR(10))
BEGIN
    IF p_quary = 'CREATE' THEN
        INSERT INTO others_staff (
            id, user_id, passport_url, role, name, sex, age, address, date_of_birth,
            marital_status, state_of_origin, mobile_no, email, qualification,
            working_experience, religion, last_place_of_work, do_you_have, when_do,
            account_name, account_number, bank, branch_id, school_id
        ) VALUES (
            p_id, p_user_id, p_passport_url, p_role, p_name, p_sex, p_age, p_address, p_date_of_birth,
            p_marital_status, p_state_of_origin, p_mobile_no, p_email, p_qualification,
            p_working_experience, p_religion, p_last_place_of_work, p_do_you_have, p_when_do,
            p_account_name, p_account_number, p_bank, p_branch_id, p_school_id
        );

    ELSEIF p_quary = 'SELECT-ALL' THEN
        IF p_branch_id IS NOT NULL AND p_branch_id != '' THEN
            SELECT * FROM others_staff WHERE school_id = p_school_id AND branch_id = p_branch_id;
        ELSE
            SELECT * FROM others_staff WHERE school_id = p_school_id;
        END IF;

    ELSEIF p_quary = 'READ' THEN
        SELECT * FROM others_staff WHERE id = p_id;

    ELSEIF p_quary = 'UPDATE' THEN
        UPDATE others_staff
        SET 
            user_id = COALESCE(p_user_id, user_id),
            passport_url = COALESCE(p_passport_url, passport_url),
            role = COALESCE(p_role, role),
            name = COALESCE(p_name, name),
            sex = COALESCE(p_sex, sex),
            age = COALESCE(p_age, age),
            address = COALESCE(p_address, address),
            date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
            marital_status = COALESCE(p_marital_status, marital_status),
            state_of_origin = COALESCE(p_state_of_origin, state_of_origin),
            mobile_no = COALESCE(p_mobile_no, mobile_no),
            email = COALESCE(p_email, email),
            qualification = COALESCE(p_qualification, qualification),
            working_experience = COALESCE(p_working_experience, working_experience),
            religion = COALESCE(p_religion, religion),
            last_place_of_work = COALESCE(p_last_place_of_work, last_place_of_work),
            do_you_have = COALESCE(p_do_you_have, do_you_have),
            when_do = COALESCE(p_when_do, when_do),
            account_name = COALESCE(p_account_name, account_name),
            account_number = COALESCE(p_account_number, account_number),
            bank = COALESCE(p_bank, bank),
            branch_id = COALESCE(p_branch_id, branch_id),
            school_id = COALESCE(p_school_id, school_id)
        WHERE id = p_id;

    ELSEIF p_quary = 'DELETE' THEN
        DELETE FROM others_staff WHERE id = p_id;

    ELSE
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid quary parameter. Use CREATE, SELECT-ALL, READ, UPDATE, or DELETE.';
    END IF;
END $$

DROP PROCEDURE IF EXISTS parent $$
CREATE PROCEDURE `parent`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(100), IN `in_name` VARCHAR(100), IN `in_phone` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_relationship` VARCHAR(100), IN `in_is_guardian` VARCHAR(100), IN `in_occupation` VARCHAR(100), IN `in_children_admin_no` VARCHAR(50), IN `in_school_id` VARCHAR(50), IN `in_branch_id` VARCHAR(50))
BEGIN 
DECLARE count_parent INT(2) DEFAULT(0);
DECLARE _parent_id INT(11) DEFAULT(0);

IF query_type="create" THEN
SELECT  id into _parent_id from parent WHERE  fullname = in_name AND phone=in_phone;
	IF _parent_id < 1 THEN
		INSERT INTO `parents`(fullname, phone, email, relationship, is_guardian, occupation, branch_id, school_id)
		VALUES (in_name, in_phone, in_email, in_relationship, in_is_guardian, in_occupation, in_branch_id, in_school_id);
	END IF;	
ELSEIF query_type="select" THEN
SELECT * FROM `parents` WHERE id =  in_id;
ELSEIF query_type="select-all" THEN
SELECT * FROM `parents`;
END IF;
END $$

DROP PROCEDURE IF EXISTS parents $$
CREATE PROCEDURE `parents`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(20), IN `in_name` VARCHAR(100), IN `in_phone` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_relationship` VARCHAR(100), IN `in_is_guardian` VARCHAR(3), IN `in_occupation` VARCHAR(100), IN `in_children_admin_no` VARCHAR(50), IN `in_school_id` VARCHAR(20))
BEGIN
    DECLARE par_id INT DEFAULT 0;
    DECLARE par_code VARCHAR(50) DEFAULT NULL;
    DECLARE in_short_name VARCHAR(50) DEFAULT NULL;
    DECLARE got_parent_lock INT DEFAULT 0;
    DECLARE had_parent_lock INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Ensure any acquired named lock is released, rollback, then re-throw
        IF had_parent_lock = 1 THEN
            SELECT RELEASE_LOCK('parent_id_lock');
            SET had_parent_lock = 0;
        END IF;
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF query_type = 'create' THEN

        -- Get school's short_name (used in parent code)
        SELECT COALESCE(s.short_name, '') INTO in_short_name
        FROM school_setup s
        WHERE s.school_id = in_school_id
        LIMIT 1;

        -- Acquire named lock for safe parent id generation (5s timeout)
        SELECT GET_LOCK('parent_id_lock', 5) INTO got_parent_lock;
        IF got_parent_lock = 1 THEN
            SET had_parent_lock = 1;

            -- Generate next parent numeric id and update generator safely
            SELECT code + 1 INTO par_id
            FROM number_generator
            WHERE description = 'parent_id'
            FOR UPDATE;

            SET par_code = CONCAT('PAR/', TRIM(in_short_name), '/', LPAD(CAST(par_id AS CHAR(5)), 5, '0'));

            -- Insert user record (parent account)
            INSERT INTO users (name, email, username, phone, user_type, password, school_id)
            VALUES (
                in_name,
                in_email,
                in_phone,     -- username set to phone in original
                in_phone,
                'parent',
                '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.',
                in_school_id
            );

            -- Insert into parents table linking to created user id
            INSERT INTO parents (parent_id, fullname, phone, email, relationship, is_guardian, occupation, school_id, user_id)
            VALUES (
                par_code,
                in_name,
                in_phone,
                in_email,
                in_relationship,
                in_is_guardian,
                in_occupation,
                in_school_id,
                LAST_INSERT_ID()
            );

            -- Persist new generator code
            UPDATE number_generator SET code = par_id WHERE description = 'parent_id';
            SELECT par_code AS parent_id;
            -- Release named lock
            SELECT RELEASE_LOCK('parent_id_lock');
            SET had_parent_lock = 0;

            COMMIT;

            -- return new parent code
            SELECT par_code AS parent_id;
        ELSE
            -- failed to acquire lock
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to acquire parent_id lock';
        END IF;

    ELSEIF query_type = 'parent' THEN
        -- This branch appears similar to 'create'; ensure in_short_name is available
        SELECT COALESCE(s.short_name, '') INTO in_short_name
        FROM school_setup s
        WHERE s.school_id = in_school_id
        LIMIT 1;

        SELECT GET_LOCK('parent_id_lock', 5) INTO got_parent_lock;
        IF got_parent_lock = 1 THEN
            SET had_parent_lock = 1;

            SELECT code + 1 INTO par_id
            FROM number_generator
            WHERE description = 'parent_id'
            FOR UPDATE;

            SET par_code = CONCAT('PAR/', TRIM(in_short_name), '/', LPAD(CAST(par_id AS CHAR(5)), 5, '0'));

            INSERT INTO users (name, email, username, phone, user_type, password, school_id)
            VALUES (
                in_name,
                in_email,
                in_name,   -- username set to name as in original 'parent' branch
                in_phone,
                'parent',
                '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.',
                in_school_id
            );

            INSERT INTO parents (parent_id, fullname, phone, email, relationship, is_guardian, occupation, school_id, user_id)
            VALUES (
                par_code,
                in_name,
                in_phone,
                in_email,
                in_relationship,
                in_is_guardian,
                in_occupation,
                in_school_id,
                LAST_INSERT_ID()
            );

            -- Link parent to student by admission_no (keep consistent key)
            UPDATE students SET parent_id = par_code WHERE admission_no = in_children_admin_no;

            UPDATE number_generator SET code = par_id WHERE description = 'parent_id';

            SELECT RELEASE_LOCK('parent_id_lock');
            SET had_parent_lock = 0;

            COMMIT;

            SELECT par_code AS parent_id;
        ELSE
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to acquire parent_id lock';
        END IF;

    ELSEIF query_type = 'select' THEN
        -- select a parent record
        SELECT * FROM parents WHERE parent_id = in_id;
        COMMIT;

    ELSEIF query_type = 'update-parent' THEN
        UPDATE parents
        SET fullname = in_name,
            phone = in_phone,
            email = in_email,
            relationship = in_relationship,
            occupation = in_occupation
        WHERE parent_id = in_id;
        IF in_email IS NOT NULL AND in_email != "" THEN
        	UPDATE users SET email = in_email WHERE id = (
            SELECT user_id FROM parents WHERE parent_id = in_id
          );
        END IF;
        COMMIT;

    ELSEIF query_type = 'link-child' THEN
        -- Link parent/guardian to student (use admission_no consistently)
        IF UPPER(in_is_guardian) = 'YES' THEN
            UPDATE students
            SET guardian_id = in_id
            WHERE admission_no = in_children_admin_no;
        ELSE
            UPDATE students
            SET parent_id = in_id
            WHERE admission_no = in_children_admin_no;
        END IF;
        COMMIT;

    ELSEIF query_type = 'childlist' THEN
        SELECT s.*
        FROM students s
        WHERE s.parent_id = in_id;
        COMMIT;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM parents WHERE school_id = in_school_id;
        COMMIT;

    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type';
    END IF;

END $$

DROP PROCEDURE IF EXISTS payment_history $$
CREATE PROCEDURE `payment_history`(IN `query_type` VARCHAR(50), IN `in_parent_id` VARCHAR(50), IN `in_admission_no` VARCHAR(50))
BEGIN
    IF query_type = "get-general-ledger" THEN
    SELECT 
        e.*, 
        s.*,
        SUM(e.cr - e.dr) OVER (PARTITION BY e.admission_no ORDER BY e.created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
    FROM 
        payment_entries e
    JOIN 
        students s ON e.admission_no = s.admission_no
    WHERE 
    	s.parent_id = in_parent_id
    ORDER BY
        e.created_at DESC;

     ELSEIF query_type = "get-individual-ledger" THEN
     	SELECT * FROM payment_entries 
        WHERE description = "Payment" AND admission_no = in_admission_no
        ORDER BY
        	created_at DESC;
    END IF;
END $$

DROP PROCEDURE IF EXISTS post_journal_entry $$
CREATE PROCEDURE `post_journal_entry`(IN `p_entry_id` INT, IN `p_posted_by` VARCHAR(50))
BEGIN
    DECLARE v_entry_date DATE;
    DECLARE v_school_id VARCHAR(20);
    DECLARE v_branch_id VARCHAR(20);
    DECLARE v_entry_number VARCHAR(50);
    DECLARE v_total_amount DECIMAL(15,2);
    DECLARE v_error_msg VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    
    -- Cursor variables
    DECLARE v_line_id INT;
    DECLARE v_account_id INT;
    DECLARE v_debit_amount DECIMAL(15,2);
    DECLARE v_credit_amount DECIMAL(15,2);
    DECLARE v_description TEXT;
    DECLARE v_account_code VARCHAR(20);
    DECLARE v_account_name VARCHAR(100);
    DECLARE v_normal_balance ENUM('DEBIT', 'CREDIT');
    DECLARE v_current_balance DECIMAL(15,2) DEFAULT 0.00;
    
    -- Cursor for journal entry lines (MySQL 8 compatible)
    DECLARE line_cursor CURSOR FOR
        SELECT 
            jel.line_id, 
            jel.account_id, 
            jel.debit_amount, 
            jel.credit_amount, 
            jel.description,
            COALESCE(coa.account_code, '') as account_code,
            COALESCE(coa.account_name, '') as account_name,
            COALESCE(coa.normal_balance, 'DEBIT') as normal_balance
        FROM journal_entry_lines jel
        LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
        WHERE jel.entry_id = p_entry_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        RESIGNAL SET MESSAGE_TEXT = v_error_msg;
    END;

    -- Start transaction
    START TRANSACTION;

    -- Get journal entry details
    SELECT 
        entry_date, 
        school_id, 
        branch_id, 
        entry_number, 
        total_amount
    INTO 
        v_entry_date, 
        v_school_id, 
        v_branch_id, 
        v_entry_number, 
        v_total_amount
    FROM journal_entries
    WHERE entry_id = p_entry_id AND status = 'DRAFT';

    -- Validate journal entry exists and is draft
    IF v_school_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Journal entry not found or already posted';
    END IF;

    -- Open cursor for journal entry lines
    OPEN line_cursor;
    
    -- Process each line
    read_loop: LOOP
        FETCH line_cursor INTO 
            v_line_id, 
            v_account_id, 
            v_debit_amount, 
            v_credit_amount, 
            v_description,
            v_account_code,
            v_account_name,
            v_normal_balance;
            
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Get current account balance (if account_balances table exists)
        SET @balance_table_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'account_balances');
        
        IF @balance_table_exists > 0 THEN
            SELECT COALESCE(current_balance, 0) INTO v_current_balance
            FROM account_balances
            WHERE account_id = v_account_id 
            AND school_id = v_school_id 
            AND (branch_id = v_branch_id OR v_branch_id IS NULL)
            LIMIT 1;
        END IF;

        -- Calculate new balance based on account normal balance
        IF v_normal_balance = 'DEBIT' THEN
            SET v_current_balance = v_current_balance + v_debit_amount - v_credit_amount;
        ELSE
            SET v_current_balance = v_current_balance + v_credit_amount - v_debit_amount;
        END IF;

        -- Insert into general ledger (if table exists)
        SET @ledger_table_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'general_ledger');
        
        IF @ledger_table_exists > 0 THEN
            INSERT INTO general_ledger (
                account_id, 
                entry_id, 
                line_id, 
                transaction_date, 
                debit_amount, 
                credit_amount,
                running_balance, 
                description, 
                reference_number, 
                school_id, 
                branch_id
            ) VALUES (
                v_account_id, 
                p_entry_id, 
                v_line_id, 
                v_entry_date, 
                v_debit_amount, 
                v_credit_amount,
                v_current_balance, 
                v_description, 
                v_entry_number, 
                v_school_id, 
                v_branch_id
            );
        END IF;

        -- Update or insert account balance (if table exists)
        IF @balance_table_exists > 0 THEN
            INSERT INTO account_balances (
                account_id, 
                current_balance, 
                debit_total, 
                credit_total, 
                last_transaction_date, 
                school_id, 
                branch_id
            ) VALUES (
                v_account_id, 
                v_current_balance, 
                v_debit_amount, 
                v_credit_amount, 
                v_entry_date, 
                v_school_id, 
                v_branch_id
            ) ON DUPLICATE KEY UPDATE
                current_balance = v_current_balance,
                debit_total = debit_total + v_debit_amount,
                credit_total = credit_total + v_credit_amount,
                last_transaction_date = v_entry_date;
        END IF;

    END LOOP;
    
    -- Close cursor
    CLOSE line_cursor;

    -- Update journal entry status
    UPDATE journal_entries
    SET status = 'POSTED', posted_by = p_posted_by, posted_at = NOW()
    WHERE entry_id = p_entry_id;

    -- Commit transaction
    COMMIT;

    -- Create audit trail entry
    INSERT INTO financial_audit_trail (
        table_name, 
        record_id, 
        action, 
        old_values, 
        new_values, 
        user_id, 
        school_id, 
        branch_id
    ) VALUES (
        'journal_entries',
        p_entry_id,
        'POST',
        JSON_OBJECT('status', 'DRAFT'),
        JSON_OBJECT('status', 'POSTED', 'posted_by', p_posted_by, 'posted_at', NOW()),
        p_posted_by,
        v_school_id,
        v_branch_id
    );

END $$

DROP PROCEDURE IF EXISTS processPayment $$
CREATE PROCEDURE `processPayment`(IN `p_admission_no` VARCHAR(100), IN `p_ref_no` VARCHAR(30), IN `p_amount_paid` DECIMAL(10,2), IN `p_payment_method` ENUM('Cash','Bank Transfer','Card','Mobile Money','Other'), IN `p_payment_reference` VARCHAR(100), IN `p_description` VARCHAR(255), IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_parent_id` VARCHAR(100), IN `p_term` VARCHAR(100), IN `p_academic_year` VARCHAR(100), IN `p_class_code` VARCHAR(100))
BEGIN
    DECLARE receipt_no VARCHAR(50);
    DECLARE full_receipt_id VARCHAR(60);
    DECLARE credit DECIMAL(10, 2) DEFAULT 0;
    DECLARE debit DECIMAL(10, 2) DEFAULT 0;
    DECLARE actual_balance DECIMAL(10, 2);
    DECLARE actual_status VARCHAR(20);
    DECLARE v_payment_entry_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Start transaction
    START TRANSACTION;

    SET receipt_no = LPAD(FLOOR(RAND() * 10000000000), 10, '0');
    SET full_receipt_id = CONCAT('RCPT-', receipt_no);
    
    SELECT 
        COALESCE(SUM(cr), 0),
        COALESCE(SUM(dr), 0)
    INTO credit, debit
    FROM payment_entries 
    WHERE admission_no = p_admission_no AND ref_no = p_ref_no;
    
    SET actual_balance = credit - (debit + p_amount_paid);
    
    IF ABS(actual_balance) = 0 THEN
        SET actual_status = 'Full Payment';
    ELSEIF actual_balance < 0 THEN
        SET actual_status = 'Overpaid';
    ELSE
        SET actual_status = 'Part Payment';
    END IF;

    INSERT INTO payment_receipts(
        receipt_id,    
        admission_no,
        ref_no,    
        amount_paid,
        payment_date,
        payment_method,
        payment_reference,
        description,
        balance,
        status,
        school_id,
        branch_id,
        parent_id
    ) VALUES (
        full_receipt_id,
        p_admission_no,
        p_ref_no,
        p_amount_paid,
        CURDATE(),
        p_payment_method, 
        p_payment_reference, 
        p_description,
        actual_balance,
        actual_status,
        p_school_id,
        p_branch_id,
        p_parent_id
    );
    
    -- Insert payment entry for the payment made
    INSERT INTO payment_entries (
        ref_no,
        admission_no,
        class_code,
        academic_year,
        term,
        cr,
        dr,
        payment_mode,
        description,
        school_id,
        branch_id
    ) VALUES (
        p_ref_no,
        p_admission_no,
        p_class_code,
        p_academic_year,
        p_term,
        0.00,
        p_amount_paid,
        p_payment_method,
        p_description,
        p_school_id,
        p_branch_id
    );
    
    -- Get the ID of the newly created payment entry
    SET v_payment_entry_id = LAST_INSERT_ID();
    
    -- Automatically create journal entry for this payment
    CALL convert_payment_to_journal(v_payment_entry_id, 'SYSTEM');
    
    -- Commit transaction
    COMMIT;
    
    SELECT * FROM payment_entries WHERE ref_no = p_ref_no;
END $$

DROP PROCEDURE IF EXISTS process_assessment_scores $$
CREATE PROCEDURE `process_assessment_scores`(IN `in_student_id` VARCHAR(30), IN `in_school_id` VARCHAR(30), IN `in_subject_code` VARCHAR(30), IN `in_term` VARCHAR(10), IN `in_session` VARCHAR(15))
BEGIN
  DECLARE v_ca1_weeks VARCHAR(50);
  DECLARE v_ca2_weeks VARCHAR(50);
  DECLARE v_ca3_weeks VARCHAR(50);
  DECLARE v_exam_pct INT;
  DECLARE v_ca1_pct INT;
  DECLARE v_ca2_pct INT;
  DECLARE v_ca3_pct INT;
  DECLARE v_total_ca INT;

  DECLARE v_ca1_score FLOAT DEFAULT 0;
  DECLARE v_ca2_score FLOAT DEFAULT 0;
  DECLARE v_ca3_score FLOAT DEFAULT 0;
  DECLARE v_exam_score FLOAT DEFAULT 0;
  DECLARE v_total_score FLOAT DEFAULT 0;

  -- Fetch config
  SELECT ca1_weeks, ca2_weeks, ca3_weeks, exam_percentage, ca1_percentage, ca2_percentage, ca3_percentage, total_ca_expected
  INTO v_ca1_weeks, v_ca2_weeks, v_ca3_weeks, v_exam_pct, v_ca1_pct, v_ca2_pct, v_ca3_pct, v_total_ca
  FROM assessment_config
  WHERE school_id = in_school_id AND term = in_term AND session = in_session
  LIMIT 1;

  -- CA1 Score
  SELECT AVG(score) INTO v_ca1_score FROM assessment_scores
  WHERE student_id = in_student_id AND school_id = in_school_id AND subject_code = in_subject_code
    AND FIND_IN_SET(week_no, v_ca1_weeks)
    AND term = in_term AND session = in_session;

  -- CA2 Score
  SELECT AVG(score) INTO v_ca2_score FROM assessment_scores
  WHERE student_id = in_student_id AND school_id = in_school_id AND subject_code = in_subject_code
    AND FIND_IN_SET(week_no, v_ca2_weeks)
    AND term = in_term AND session = in_session;

  -- Optional CA3 Score
  IF v_total_ca = 3 THEN
    SELECT AVG(score) INTO v_ca3_score FROM assessment_scores
    WHERE student_id = in_student_id AND school_id = in_school_id AND subject_code = in_subject_code
      AND FIND_IN_SET(week_no, v_ca3_weeks)
      AND term = in_term AND session = in_session;
  END IF;

  -- Exam Score (if stored separately)
  SELECT MAX(exam_score) INTO v_exam_score FROM assessment_scores
  WHERE student_id = in_student_id AND school_id = in_school_id AND subject_code = in_subject_code
    AND term = in_term AND session = in_session;

  -- Final Score Calculation
  SET v_total_score = 
      (v_ca1_score * v_ca1_pct / 100) +
      (v_ca2_score * v_ca2_pct / 100) +
      (v_ca3_score * v_ca3_pct / 100) +
      (v_exam_score * v_exam_pct / 100);

  -- Output final score
  SELECT 
    v_ca1_score AS ca1_score,
    v_ca2_score AS ca2_score,
    v_ca3_score AS ca3_score,
    v_exam_score AS exam_score,
    v_total_score AS final_total;

END $$

DROP PROCEDURE IF EXISTS prog_assessment_config $$
CREATE PROCEDURE `prog_assessment_config`(IN `query_type` VARCHAR(20), IN `in_school_id` VARCHAR(50), IN `in_ca_name` VARCHAR(50), IN `in_week_number` INT, IN `in_max_score` INT, IN `in_component_weight` DECIMAL(5,2), IN `in_branch_id` VARCHAR(50))
BEGIN
    IF query_type = 'insert' THEN
        INSERT INTO prog_assessment_config (school_id, ca_name, week_number, max_score, component_weight,branch_id)
        VALUES (in_school_id, in_ca_name, in_week_number, in_max_score, in_component_weight, in_branch_id);

    ELSEIF query_type = 'update' THEN
        UPDATE prog_assessment_config
        SET max_score = in_max_score,
            component_weight = in_component_weight,
            branch_id = in_branch_id
        WHERE school_id = in_school_id
          AND ca_name = in_ca_name
          AND week_number = in_week_number;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM prog_assessment_config
        WHERE school_id = in_school_id
          AND ca_name = in_ca_name
          AND week_number = in_week_number;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM prog_assessment_config
        WHERE school_id = in_school_id
          AND ca_name = in_ca_name;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM prog_assessment_config
        WHERE school_id = in_school_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS receipt_urls $$
CREATE PROCEDURE `receipt_urls`(IN `query_type` VARCHAR(10), IN `in_id` VARCHAR(10), IN `in_ref_no` VARCHAR(20), IN `in_url` VARCHAR(500))
BEGIN
  IF query_type='create' THEN
  		INSERT INTO `receipt_urls`(`id`, `ref_no`, `url`) 
        VALUES (`in_id`, `in_ref_no`, `in_url`);
  ELSEIF   query_type='select' THEN
  	SELECT * FROM `receipt_urls` WHERE ref_no = `in_ref_no`;
  END IF;
  
  END $$
  
DROP PROCEDURE IF EXISTS revenue_heads $$
CREATE PROCEDURE `revenue_heads`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First term','Second term','Third term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive'), IN `in_school_location` VARCHAR(100), IN `in_school_id` VARCHAR(11))
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
END $$

DROP PROCEDURE IF EXISTS schoolCalendar $$
CREATE PROCEDURE `schoolCalendar`(IN `query_type` VARCHAR(50), IN `in_event_id` INT, IN `in_title` VARCHAR(255), IN `in_start_date` DATETIME, IN `in_end_date` DATETIME, IN `in_color` VARCHAR(30), IN `in_status` ENUM('Active','Inactive','Cancelled'), IN `in_created_by` VARCHAR(50), IN `in_recurrence` ENUM('Once','Annual'), IN `in_branch_id` VARCHAR(150), IN `in_school_id` VARCHAR(20))
BEGIN
    IF query_type = 'CREATE' THEN
        INSERT INTO school_calendar (title, start_date, end_date, branch_id, color, status, created_by, recurrence, school_id)
        VALUES (in_title, in_start_date, in_end_date, in_branch_id, in_color, in_status, COALESCE(in_created_by, 'Admin'), COALESCE(in_recurrence, 'Once'), in_school_id);

    ELSEIF query_type = 'Create Category' THEN
        INSERT INTO event_categories (category_name, category_color, category_status, school_id, branch_id) 
        VALUES (in_title, in_color, in_status, in_school_id, in_branch_id);
        SELECT * FROM event_categories WHERE id = LAST_INSERT_ID() AND school_id = in_school_id;

    ELSEIF query_type = 'Select All Categories' THEN
        SELECT * FROM event_categories WHERE school_id = in_school_id;

    ELSEIF query_type = 'UPDATE' THEN
        UPDATE school_calendar
        SET title = COALESCE(in_title, title), 
            start_date = COALESCE(in_start_date, start_date),  
            end_date = COALESCE(in_end_date, end_date), 
            branch_id = COALESCE(in_branch_id, branch_id),
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
            AND (in_branch_id IS NULL OR branch_id LIKE CONCAT('%', in_branch_id, '%')) 
            AND (in_color IS NULL OR color = in_color)
            AND (in_status IS NULL OR status = in_status)
            AND (in_created_by IS NULL OR created_by = in_created_by)
            AND (in_recurrence IS NULL OR recurrence = in_recurrence);

    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid query_type specified';
    END IF;
END $$

DROP PROCEDURE IF EXISTS school_admission_form $$
CREATE PROCEDURE `school_admission_form`(IN `p_query_type` VARCHAR(50), IN `p_upload` VARCHAR(255), IN `p_applicant_id` VARCHAR(50), IN `p_guardian_id` VARCHAR(50), IN `p_parent_id` VARCHAR(50), IN `p_type_of_application` VARCHAR(50), IN `p_name_of_applicant` VARCHAR(255), IN `p_home_address` TEXT, IN `p_date_of_birth` DATE, IN `p_guardian_name` VARCHAR(255), IN `p_guardian_phone` VARCHAR(20), IN `p_guardian_email` VARCHAR(100), IN `p_guardian_address` TEXT, IN `p_guardian_relationship` VARCHAR(50), IN `p_parent_fullname` VARCHAR(255), IN `p_parent_phone` VARCHAR(20), IN `p_parent_email` VARCHAR(100), IN `p_parent_address` TEXT, IN `p_parent_occupation` VARCHAR(100), IN `p_state_of_origin` VARCHAR(100), IN `p_l_g_a` VARCHAR(100), IN `p_last_school_attended` VARCHAR(255), IN `p_mathematics` VARCHAR(5), IN `p_english` VARCHAR(5), IN `p_special_health_needs` TEXT, IN `p_sex` VARCHAR(10), IN `p_admission_no` VARCHAR(50), IN `p_school` VARCHAR(100), IN `p_status` VARCHAR(20), IN `p_academic_year` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20), IN `p_short_name` VARCHAR(20), IN `p_last_class` VARCHAR(100), IN `p_others` VARCHAR(50), IN `in_id` INT(11), IN `p_other_score` INT(11))
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
    
    CALL parents('create', par_code, p_parent_fullname, p_parent_phone, p_parent_email,p_guardian_relationship, 'Yes',p_parent_occupation,p_admission_no,p_school_id);

     CALL guardians('create',p_school_id, gur_code, app_code, p_guardian_name, 
                      p_guardian_address, p_guardian_email, p_guardian_phone);
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
        UPDATE applicants SET
            upload = p_upload,
            guardian_id = p_guardian_id,
            parent_id = p_parent_id,
            type_of_application = p_type_of_application,
            name_of_applicant = p_name_of_applicant,
            home_address = p_home_address,
            date_of_birth = p_date_of_birth,
            guardian_name = p_guardian_name,
            guardian_phone = p_guardian_phone,
            guardian_email = p_guardian_email,
            guardian_address = p_guardian_address,
            guardian_relationship = p_guardian_relationship,
            parent_fullname = p_parent_fullname,
            parent_phone = p_parent_phone,
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
        
        CALL parents('update', p_parent_id, p_parent_fullname, p_parent_phone, p_parent_email, 
                     p_guardian_relationship, 0, p_parent_occupation, p_school_id, p_admission_no);

        CALL guardians(p_school_id, p_guardian_id, p_applicant_id, p_guardian_name, 
                       p_guardian_address, p_guardian_email, p_guardian_phone);
                       
                           ELSEIF p_query_type = 'select_application_no' THEN
    SELECT * FROM `school_applicants` WHERE applicant_id = p_applicant_id;
	
    END IF;
END $$

DROP PROCEDURE IF EXISTS school_applicants $$
CREATE PROCEDURE `school_applicants`(IN `in_id` VARCHAR(100), IN `query_type` VARCHAR(100), IN `in_upload` VARCHAR(300), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_religion` VARCHAR(100), IN `in_tribe` VARCHAR(100), IN `in_school_attended` VARCHAR(100), IN `in_class1` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_time` VARCHAR(100), IN `in_venue` VARCHAR(100), IN `in_common_entrance` VARCHAR(100), IN `in_placement` VARCHAR(100), IN `in_examination_date` DATE, IN `in_date` VARCHAR(100), IN `in_first_name` VARCHAR(100), IN `in_examination_number` VARCHAR(100), IN `in_father_name` VARCHAR(100), IN `in_state_of_origin1` VARCHAR(100), IN `in_address` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_examination_number1` VARCHAR(100), IN `in_name1` VARCHAR(100), IN `in_mother_name` VARCHAR(100), IN `in_state_of_origin3` VARCHAR(100), IN `in_state_of_origin2` VARCHAR(100), IN `in_home_address1` VARCHAR(100), IN `in_office_marker_address` VARCHAR(100), IN `in_telephone_address` VARCHAR(100), IN `in_other_score` INT(10), IN `in_venue1` VARCHAR(100), IN `in_image` TEXT, IN `in_mathematics` INT(11), IN `in_english` INT(11), IN `in_others` VARCHAR(100), IN `in_admission_no` VARCHAR(100), IN `in_last_school_atterded` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_date_of_birth1` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_occapation` VARCHAR(100), IN `in_blood_group` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_admission_date` DATE, IN `in_roll_number` INT(100), IN `in_status` VARCHAR(100), IN `in_section` VARCHAR(100), IN `in_house` VARCHAR(100), IN `in_category` VARCHAR(100), IN `in_primary_contact_number` VARCHAR(100), IN `in_caste` VARCHAR(100), IN `in_mother_tongue` VARCHAR(100), IN `in_language_known` VARCHAR(100), IN `in_application_no` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_current_class` VARCHAR(100), IN `in_medical_condition` VARCHAR(100), IN `in_upload_transfer_certificate` VARCHAR(100), IN `in_school_id` INT(6))
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
    END $$
    
DROP PROCEDURE IF EXISTS school_revenues $$
CREATE PROCEDURE `school_revenues`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(10,2), IN `in_term` ENUM('First Term','Second Term','Third Term','Each Term'), IN `in_section` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_class_code` VARCHAR(20), IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings','Items'), IN `in_is_optional` ENUM('Yes','No'), IN `in_status` ENUM('Active','Inactive','Posted','Pending',''), IN `in_account_type` VARCHAR(100), IN `in_school_id` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_academic_year` VARCHAR(20), IN `in_quantity` INT(11))
BEGIN
    -- Handle 'create' operation
    IF query_type = "create" THEN
    IF in_status = '' OR in_status IS NULL THEN
        SET in_status = 'Active';
    END IF;

    INSERT INTO `school_revenues`(
        `description`, `amount`, `term`,`academic_year`, `section`, `class_name`,`class_code`, 
        `revenue_type`, `account_type`, `is_optional`, `status`, `branch_id`, `school_id`,`quantity`
    ) 
    VALUES (
        in_description, in_amount, in_term,in_academic_year, in_section, in_class_name,in_class_code, 
        in_revenue_type, in_account_type, in_is_optional, in_status, in_branch_id, in_school_id,
        in_quantity
    )
    ON DUPLICATE KEY UPDATE
        `amount` = VALUES(`amount`),
        `account_type` = VALUES(`account_type`),
        `is_optional` = VALUES(`is_optional`),
        `status` = VALUES(`status`),
        `quantity` = VALUES(`quantity`);


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

ELSEIF query_type = "select-all" THEN
    SELECT 
        c.class_name,
        c.class_code,
        COALESCE(SUM(r.amount), 0) AS total_amount,
        in_term AS term,  -- Always return the requested term
        in_academic_year AS academic_year,
        COALESCE(MAX(r.status), 'No Record') AS status,
        COALESCE(MAX(r.code), 0) AS code
    FROM classes c
    LEFT JOIN school_revenues r
        ON c.class_code = r.class_code
        AND r.academic_year = in_academic_year
        AND r.term = in_term
        AND r.school_id = in_school_id
        AND r.branch_id = in_branch_id
    WHERE c.school_id = in_school_id
    GROUP BY c.class_code, c.class_name
    ORDER BY c.class_code;

     ELSEIF query_type = 'next-fee' THEN 
        SELECT SUM(amount) AS total_fees FROM `school_revenues`
        WHERE  section=in_section AND branch_id = in_branch_id AND school_id = in_school_id
        AND academic_year = in_academic_year AND term = in_term AND status='Active' AND class_name IN('All Classes',in_class_name);

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
            AND class_code =in_class_code
            AND  academic_year = in_academic_year
            AND term =in_term
            AND in_branch_id =in_branch_id;
            
    ELSEIF query_type = "delete" THEN
       DELETE FROM `school_revenues` WHERE code = in_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS school_setup $$
CREATE PROCEDURE `school_setup`(
    IN p_query_type VARCHAR(50),
    IN p_school_id VARCHAR(50),
    IN p_school_name VARCHAR(255),
    IN p_school_second_name VARCHAR(255),
    IN p_short_name VARCHAR(50),
    IN p_academic_year VARCHAR(20),
    IN p_session_start_date DATE,
    IN p_session_end_date DATE,
    IN p_status VARCHAR(20),
    IN p_badge_url TEXT,
    IN p_mission TEXT,
    IN p_vission TEXT,  -- Note: likely meant "vision"
    IN p_about_us TEXT,
    IN p_school_motto VARCHAR(255),
    IN p_state VARCHAR(100),
    IN p_lga VARCHAR(100),
    IN p_address TEXT,
    IN p_primary_contact_number VARCHAR(20),
    IN p_secondary_contact_number VARCHAR(20),
    IN p_email_address VARCHAR(255),
    IN p_school_master TINYINT(1),
    IN p_express_finance TINYINT(1),
    IN p_cbt_center TINYINT(1),
    IN p_result_station TINYINT(1),
    IN p_nursery TINYINT(1),
    IN p_primary TINYINT(1),
    IN p_junior_secondary TINYINT(1),
    IN p_senior_secondary TINYINT(1),
    IN p_islamiyya TINYINT(1),
    IN p_tahfiz TINYINT(1),
    IN p_admin_name VARCHAR(255),
    IN p_admin_email VARCHAR(255),
    IN p_admin_password TEXT,
    IN p_domain VARCHAR(255),
    IN p_section_type VARCHAR(50),
    IN p_created_by INT,
    IN p_cbt_stand_alone TINYINT(1),
    IN p_sms_subscription TINYINT(1),
    IN p_whatsapp_subscription TINYINT(1),
    IN p_email_subscription TINYINT(1),
    IN p_assessmentType VARCHAR(50),
    IN p_is_arabic TINYINT(1),      -- New multilingual field
    IN p_default_lang VARCHAR(50),  -- New multilingual field
    IN p_second_lang VARCHAR(50),   -- New multilingual field
    IN p_personal_dev_scale VARCHAR(50),
    IN p_require_verification TINYINT(1),
    IN p_has_class_stream TINYINT(1)
)
BEGIN
    DECLARE v_school_id VARCHAR(50);
    DECLARE v_next_school_number INT;
    DECLARE v_school_code VARCHAR(10);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Start transaction
    START TRANSACTION;

    -- Handle CREATE query type
    IF p_query_type = 'CREATE' THEN
        
        -- Generate school ID if not provided
        IF p_school_id IS NULL OR p_school_id = '' THEN
            -- Get the next number from number_generator for 'SCH' code
            SELECT IFNULL(next_number, 1) INTO v_next_school_number
            FROM number_generator 
            WHERE code = 'SCH' 
            FOR UPDATE;
            
            -- Generate the school ID in the format "SCH/x"
            SET v_school_id = CONCAT('SCH/', v_next_school_number);
            
            -- Update the number_generator for 'SCH' code
            UPDATE number_generator 
            SET next_number = next_number + 1 
            WHERE code = 'SCH';
        ELSE
            SET v_school_id = p_school_id;
        END IF;
        
        -- Insert into school_setup table
        INSERT INTO school_setup (
            school_id, school_name, school_second_name, short_name, academic_year, 
            session_start_date, session_end_date, status, badge_url, mission, 
            vission, about_us, school_motto, state, lga, address, 
            primary_contact_number, secondary_contact_number, email_address, 
            school_master, express_finance, cbt_center, result_station, 
            nursery_section, primary_section, junior_secondary_section, 
            senior_secondary_section, islamiyya, tahfiz, created_at, 
            cbt_stand_alone, sms_subscription, whatsapp_subscription, 
            email_subscription, assessmentType, is_arabic, default_lang, second_lang,
            personal_dev_scale, require_verification, has_class_stream
        ) VALUES (
            v_school_id, p_school_name, p_school_second_name, p_short_name, p_academic_year,
            p_session_start_date, p_session_end_date, p_status, p_badge_url, p_mission,
            p_vission, p_about_us, p_school_motto, p_state, p_lga, p_address,
            p_primary_contact_number, p_secondary_contact_number, p_email_address,
            p_school_master, p_express_finance, p_cbt_center, p_result_station,
            p_nursery, p_primary, p_junior_secondary, p_senior_secondary,
            p_islamiyya, p_tahfiz, NOW(),
            p_cbt_stand_alone, p_sms_subscription, p_whatsapp_subscription,
            p_email_subscription, p_assessmentType, p_is_arabic, p_default_lang, p_second_lang,
            p_personal_dev_scale, p_require_verification, p_has_class_stream
        );
        
        -- Create the admin user
        INSERT INTO users (
            school_id, user_name, email, password, user_type, status, created_at
        ) VALUES (
            v_school_id, p_admin_name, p_admin_email, p_admin_password, 'admin', 'active', NOW()
        );

        -- Create a default branch for the school
        INSERT INTO branches (
            school_id, branch_name, short_name, location, status, created_at
        ) VALUES (
            v_school_id, p_school_name, p_short_name, p_address, 'active', NOW()
        );
        
        -- Return the created school ID
        SELECT v_school_id AS school_id, 'School created successfully' AS message;
        
    -- Handle UPDATE query type
    ELSEIF p_query_type = 'update' THEN
        UPDATE school_setup 
        SET 
            school_name = COALESCE(p_school_name, school_name),
            school_second_name = COALESCE(p_school_second_name, school_second_name),
            short_name = COALESCE(p_short_name, short_name),
            academic_year = COALESCE(p_academic_year, academic_year),
            session_start_date = COALESCE(p_session_start_date, session_start_date),
            session_end_date = COALESCE(p_session_end_date, session_end_date),
            status = COALESCE(p_status, status),
            badge_url = COALESCE(p_badge_url, badge_url),
            mission = COALESCE(p_mission, mission),
            vission = COALESCE(p_vission, vission),
            about_us = COALESCE(p_about_us, about_us),
            school_motto = COALESCE(p_school_motto, school_motto),
            state = COALESCE(p_state, state),
            lga = COALESCE(p_lga, lga),
            address = COALESCE(p_address, address),
            primary_contact_number = COALESCE(p_primary_contact_number, primary_contact_number),
            secondary_contact_number = COALESCE(p_secondary_contact_number, secondary_contact_number),
            email_address = COALESCE(p_email_address, email_address),
            school_master = COALESCE(p_school_master, school_master),
            express_finance = COALESCE(p_express_finance, express_finance),
            cbt_center = COALESCE(p_cbt_center, cbt_center),
            result_station = COALESCE(p_result_station, result_station),
            nursery_section = COALESCE(p_nursery, nursery_section),
            primary_section = COALESCE(p_primary, primary_section),
            junior_secondary_section = COALESCE(p_junior_secondary, junior_secondary_section),
            senior_secondary_section = COALESCE(p_senior_secondary, senior_secondary_section),
            islamiyya = COALESCE(p_islamiyya, islamiyya),
            tahfiz = COALESCE(p_tahfiz, tahfiz),
            cbt_stand_alone = COALESCE(p_cbt_stand_alone, cbt_stand_alone),
            sms_subscription = COALESCE(p_sms_subscription, sms_subscription),
            whatsapp_subscription = COALESCE(p_whatsapp_subscription, whatsapp_subscription),
            email_subscription = COALESCE(p_email_subscription, email_subscription),
            assessmentType = COALESCE(p_assessmentType, assessmentType),
            is_arabic = COALESCE(p_is_arabic, is_arabic),  -- New multilingual field
            default_lang = COALESCE(p_default_lang, default_lang),  -- New multilingual field
            second_lang = COALESCE(p_second_lang, second_lang),  -- New multilingual field
            personal_dev_scale = COALESCE(p_personal_dev_scale, personal_dev_scale),
            require_verification = COALESCE(p_require_verification, require_verification),
            has_class_stream = COALESCE(p_has_class_stream, has_class_stream),
            updated_at = NOW()
        WHERE school_id = p_school_id;
        
        SELECT p_school_id AS school_id, 'School updated successfully' AS message;
        
    -- Handle UPDATE_SCHOOL query type (additional fields)
    ELSEIF p_query_type = 'update_school' THEN
        UPDATE school_setup 
        SET 
            school_name = COALESCE(p_school_name, school_name),
            school_second_name = COALESCE(p_school_second_name, school_second_name),
            short_name = COALESCE(p_short_name, short_name),
            school_motto = COALESCE(p_school_motto, school_motto),
            state = COALESCE(p_state, state),
            lga = COALESCE(p_lga, lga),
            address = COALESCE(p_address, address),
            primary_contact_number = COALESCE(p_primary_contact_number, primary_contact_number),
            secondary_contact_number = COALESCE(p_secondary_contact_number, secondary_contact_number),
            email_address = COALESCE(p_email_address, email_address),
            school_master = COALESCE(p_school_master, school_master),
            express_finance = COALESCE(p_express_finance, express_finance),
            cbt_center = COALESCE(p_cbt_center, cbt_center),
            result_station = COALESCE(p_result_station, result_station),
            nursery_section = COALESCE(p_nursery, nursery_section),
            primary_section = COALESCE(p_primary, primary_section),
            junior_secondary_section = COALESCE(p_junior_secondary, junior_secondary_section),
            senior_secondary_section = COALESCE(p_senior_secondary, senior_secondary_section),
            islamiyya = COALESCE(p_islamiyya, islamiyya),
            tahfiz = COALESCE(p_tahfiz, tahfiz),
            section_type = COALESCE(p_section_type, section_type),
            cbt_stand_alone = COALESCE(p_cbt_stand_alone, cbt_stand_alone),
            sms_subscription = COALESCE(p_sms_subscription, sms_subscription),
            whatsapp_subscription = COALESCE(p_whatsapp_subscription, whatsapp_subscription),
            email_subscription = COALESCE(p_email_subscription, email_subscription),
            assessmentType = COALESCE(p_assessmentType, assessmentType),
            is_arabic = COALESCE(p_is_arabic, is_arabic),  -- New multilingual field
            default_lang = COALESCE(p_default_lang, default_lang),  -- New multilingual field
            second_lang = COALESCE(p_second_lang, second_lang),  -- New multilingual field
            personal_dev_scale = COALESCE(p_personal_dev_scale, personal_dev_scale),
            require_verification = COALESCE(p_require_verification, require_verification),
            has_class_stream = COALESCE(p_has_class_stream, has_class_stream),
            updated_at = NOW()
        WHERE school_id = p_school_id;
        
        SELECT p_school_id AS school_id, 'School information updated successfully' AS message;
        
    -- Handle SELECT query type
    ELSEIF p_query_type = 'select' OR p_query_type = 'select-all' THEN
        SELECT * FROM school_setup 
        WHERE (p_school_id IS NULL OR school_id = p_school_id)
        ORDER BY created_at DESC;
        
    -- Handle SELECT BY SHORT NAME
    ELSEIF p_query_type = 'select-by-short-name' THEN
        SELECT * FROM school_setup 
        WHERE short_name = p_short_name
        ORDER BY created_at DESC;
        
    -- Handle SELECT SCHOOL
    ELSEIF p_query_type = 'select-school' THEN
        SELECT * FROM school_setup 
        WHERE school_id = p_school_id;
        
    -- Handle DELETE query type
    ELSEIF p_query_type = 'DELETE' THEN
        DELETE FROM school_setup WHERE school_id = p_school_id;
        SELECT p_school_id AS school_id, 'School deleted successfully' AS message;
        
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query type';
    END IF;
    
    COMMIT;
    
END $$

DROP PROCEDURE IF EXISTS score_grades $$
CREATE PROCEDURE `score_grades`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_grade` INT(50), IN `in_remark` INT(14), IN `in_min_score` INT(3), IN `in_max_score` INT(3), IN `in_status` INT(3))
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
    END $$
    
DROP PROCEDURE IF EXISTS sections $$
CREATE PROCEDURE `sections`(IN `in_query_type` VARCHAR(20), IN `in_school_id` VARCHAR(100), IN `in_section_id` VARCHAR(100), IN `in_section_name` VARCHAR(100), IN `in_branch_id` VARCHAR(100), IN `in_short_name` VARCHAR(10))
BEGIN
    DECLARE current_id INT;
    DECLARE section_code VARCHAR(50);
    DECLARE in_address VARCHAR(150);

    IF in_query_type = 'create' THEN 
        
        -- Check if section already exists for the branch
        IF EXISTS (
            SELECT 1 FROM school_section_table 
            WHERE school_id = in_school_id 
              AND branch_id = in_branch_id 
              AND section_name = in_section_name
        ) THEN
            -- Update existing record instead of inserting new one
            UPDATE school_section_table
            SET 
                section_name = in_section_name,
                school_id = in_school_id
            WHERE branch_id = in_branch_id 
              AND section_name = in_section_name;

        ELSE
            -- Generate new section code
            SELECT code + 1 INTO current_id 
            FROM number_generator 
            WHERE description = 'section_id';

            SELECT COALESCE(branch_name,'') INTO in_address 
            FROM school_locations 
            WHERE branch_id = in_branch_id 
            LIMIT 1;
            
            SET section_code = CONCAT("SEC/", in_short_name, '/', LPAD(CAST(current_id AS CHAR(5)), 5, '0'));

            INSERT INTO school_section_table (
                school_id, section_id, section_name, section_address, branch_id
            ) VALUES (
                in_school_id, section_code, in_section_name, in_address, in_branch_id
            );

            UPDATE number_generator 
            SET code = current_id 
            WHERE description = 'section_id';
        END IF;

    ELSEIF in_query_type = 'select' THEN
        IF in_branch_id IS NOT NULL AND in_branch_id != '' THEN
            SELECT * 
            FROM school_section_table 
            WHERE branch_id = in_branch_id 
              AND school_id = in_school_id 
              AND status ='Active'
            ORDER BY section_id ASC;
        ELSE 
            SELECT * 
            FROM school_section_table 
            WHERE school_id = in_school_id 
            AND status ='Active'
            ORDER BY section_id ASC;
        END IF;
    END IF;
END $$

DROP PROCEDURE IF EXISTS sp_approve_payroll $$
CREATE PROCEDURE `sp_approve_payroll`(IN `p_period_month` VARCHAR(7), IN `p_actor_id` INT, IN `p_school_id` VARCHAR(10), IN `p_notes` TEXT)
BEGIN
    DECLARE v_period_id INT;
    DECLARE v_status VARCHAR(20);
    
    -- Get period details
    SELECT period_id, status INTO v_period_id, v_status
    FROM payroll_periods 
    WHERE period_month = p_period_month AND school_id = p_school_id;
    
    -- Check if period exists and is in correct status
    IF v_period_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payroll period not found';
    END IF;
    
    IF v_status NOT IN ('initiated') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payroll cannot be approved in current status';
    END IF;
    
    START TRANSACTION;
    
    -- Update period status
    UPDATE payroll_periods 
    SET 
        status = 'approved',
        approved_by = p_actor_id,
        approved_at = NOW(),
        notes = p_notes
    WHERE period_id = v_period_id;
    
    -- Insert approval record
    INSERT INTO payroll_approvals (period_id, approved_by, approval_status, approval_notes, approved_at)
    VALUES (v_period_id, p_actor_id, 'approved', p_notes, NOW());
    
    -- Update loan balances
    UPDATE loans l
    JOIN payroll_items pi ON l.loan_id = pi.item_id AND pi.item_type = 'loan'
    JOIN payroll_lines pl ON pi.payroll_line_id = pl.payroll_line_id
    SET 
        l.balance_remaining = GREATEST(0, l.balance_remaining - pi.amount),
        l.status = CASE WHEN (l.balance_remaining - pi.amount) <= 0 THEN 'completed' ELSE 'active' END,
        l.actual_end_date = CASE WHEN (l.balance_remaining - pi.amount) <= 0 THEN CURDATE() ELSE NULL END
    WHERE pl.period_id = v_period_id;
    
    -- Audit log
    INSERT INTO payroll_audit (table_name, record_id, action, new_values, user_id, user_name, notes)
    VALUES ('payroll_periods', v_period_id, 'approve', JSON_OBJECT('approved_by', p_actor_id, 'notes', p_notes), p_actor_id, 'System', 'Payroll approved');
    
    COMMIT;
    
    SELECT 'Payroll approved successfully' as message, v_period_id as period_id;
    
END $$

DROP PROCEDURE IF EXISTS sp_initiate_payroll $$
CREATE PROCEDURE `sp_initiate_payroll`(IN `p_period_month` VARCHAR(7), IN `p_actor_id` INT, IN `p_school_id` VARCHAR(10))
BEGIN
    -- ========================
    -- DECLARATIONS
    -- ========================
    DECLARE done_staff INT DEFAULT FALSE;
    DECLARE done_loan INT DEFAULT FALSE;

    DECLARE v_period_id INT;
    DECLARE v_staff_id INT;
    DECLARE v_basic_salary DECIMAL(15,2);
    DECLARE v_total_allowances DECIMAL(15,2);
    DECLARE v_total_deductions DECIMAL(15,2);
    DECLARE v_gross_pay DECIMAL(15,2);
    DECLARE v_net_pay DECIMAL(15,2);
    DECLARE v_payroll_line_id INT;
    DECLARE v_loan_id INT;
    DECLARE v_monthly_deduction DECIMAL(15,2);
    DECLARE v_balance_remaining DECIMAL(15,2);
    DECLARE v_loan_type_name VARCHAR(100);

    -- ========================
    -- CURSORS
    -- ========================
    DECLARE staff_cursor CURSOR FOR
        SELECT s.id, COALESCE(gl.basic_salary, 0) AS basic_salary
        FROM staff s
        LEFT JOIN grade_levels gl ON s.grade_id = gl.grade_id
        WHERE s.school_id = p_school_id 
          AND s.payroll_status = 'enrolled'
          AND (s.date_suspended IS NULL OR s.date_suspended > LAST_DAY(CONCAT(p_period_month, '-01')));

    DECLARE loan_cursor CURSOR FOR
        SELECT l.loan_id, l.monthly_deduction, l.balance_remaining, lt.loan_type_name
        FROM loans l
        JOIN loan_types lt ON l.loan_type_id = lt.loan_type_id
        WHERE l.staff_id = v_staff_id 
          AND l.status = 'active'
          AND l.payment_frequency = 'monthly'
          AND l.start_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
          AND l.balance_remaining > 0;

    -- ========================
    -- HANDLERS
    -- ========================
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_staff = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An error occurred during payroll initiation';
    END;

    -- ========================
    -- TRANSACTION START
    -- ========================
    START TRANSACTION;

    -- Validate p_period_month format
    IF p_period_month NOT REGEXP '^[0-9]{4}-[0-1][0-9]$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid period_month format. Expected YYYY-MM';
    END IF;

    -- Create or get period
    INSERT INTO payroll_periods (
        period_month, period_year, period_month_num, school_id, initiated_by, initiated_at, status
    )
    VALUES (
        p_period_month,
        YEAR(CONCAT(p_period_month, '-01')),
        MONTH(CONCAT(p_period_month, '-01')),
        p_school_id,
        p_actor_id,
        NOW(),
        'initiated'
    )
    ON DUPLICATE KEY UPDATE
        initiated_by = p_actor_id,
        initiated_at = NOW(),
        status = 'initiated';

    SELECT period_id INTO v_period_id 
    FROM payroll_periods 
    WHERE period_month = p_period_month AND school_id = p_school_id;

    -- Clear existing payroll lines
    DELETE FROM payroll_items 
    WHERE payroll_line_id IN (SELECT payroll_line_id FROM payroll_lines WHERE period_id = v_period_id);
    DELETE FROM payroll_adjustments 
    WHERE payroll_line_id IN (SELECT payroll_line_id FROM payroll_lines WHERE period_id = v_period_id);
    DELETE FROM payroll_lines WHERE period_id = v_period_id;

    -- ========================
    -- STAFF LOOP
    -- ========================
    OPEN staff_cursor;
    staff_loop: LOOP
        FETCH staff_cursor INTO v_staff_id, v_basic_salary;
        IF done_staff THEN
            LEAVE staff_loop;
        END IF;

        -- Calculate Allowances
        SELECT COALESCE(SUM(
            CASE 
                WHEN at.calculation_type = 'fixed' THEN COALESCE(sa.amount, at.default_amount)
                WHEN at.calculation_type = 'percentage' THEN v_basic_salary * (at.default_percentage / 100)
                ELSE 0
            END
        ), 0) INTO v_total_allowances
        FROM staff_allowances sa
        JOIN allowance_types at ON sa.allowance_id = at.allowance_id
        WHERE sa.staff_id = v_staff_id 
          AND at.is_active = 1
          AND sa.effective_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
          AND (sa.end_date IS NULL OR sa.end_date >= CONCAT(p_period_month, '-01'));

        -- Calculate Deductions
        SELECT COALESCE(SUM(
            CASE 
                WHEN dt.calculation_type = 'fixed' THEN COALESCE(sd.amount, dt.default_amount)
                WHEN dt.calculation_type = 'percentage' THEN v_basic_salary * (dt.default_percentage / 100)
                ELSE 0
            END
        ), 0) INTO v_total_deductions
        FROM staff_deductions sd
        JOIN deduction_types dt ON sd.deduction_id = dt.deduction_id
        WHERE sd.staff_id = v_staff_id 
          AND dt.is_active = 1
          AND sd.effective_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
          AND (sd.end_date IS NULL OR sd.end_date >= CONCAT(p_period_month, '-01'));

        -- Add Loan Deductions
        SET v_total_deductions = v_total_deductions + COALESCE((
            SELECT SUM(monthly_deduction)
            FROM loans
            WHERE staff_id = v_staff_id 
              AND status = 'active'
              AND payment_frequency = 'monthly'
              AND start_date <= LAST_DAY(CONCAT(p_period_month, '-01'))
              AND balance_remaining > 0
        ), 0);

        -- Calculate Gross & Net Pay
        SET v_gross_pay = v_basic_salary + v_total_allowances;
        SET v_net_pay = GREATEST(0, v_gross_pay - v_total_deductions);

        -- Insert Payroll Line
        INSERT INTO payroll_lines (
            period_id, staff_id, basic_salary, total_allowances, 
            total_deductions, gross_pay, net_pay, is_processed
        ) VALUES (
            v_period_id, v_staff_id, v_basic_salary, v_total_allowances,
            v_total_deductions, v_gross_pay, v_net_pay, 1
        );

        SET v_payroll_line_id = LAST_INSERT_ID();

        -- ========================
        -- LOAN LOOP
        -- ========================
        SET done_loan = FALSE;
        OPEN loan_cursor;
        loan_loop: LOOP
            FETCH loan_cursor INTO v_loan_id, v_monthly_deduction, v_balance_remaining, v_loan_type_name;
            IF done_loan THEN
                LEAVE loan_loop;
            END IF;

            -- Insert Loan Deduction Item
            INSERT INTO payroll_items (payroll_line_id, item_type, item_id, item_name, amount)
            VALUES (
                v_payroll_line_id,
                'loan',
                v_loan_id,
                CONCAT(v_loan_type_name, ' Loan'),
                v_monthly_deduction
            );

            -- Record Loan Payment
            INSERT INTO loan_payments (
                loan_id, payment_date, payment_amount, balance_after_payment, 
                payment_method, is_automated, processed_by
            ) VALUES (
                v_loan_id,
                LAST_DAY(CONCAT(p_period_month, '-01')),
                v_monthly_deduction,
                GREATEST(0, v_balance_remaining - v_monthly_deduction),
                'payroll_deduction',
                TRUE,
                p_actor_id
            );

            -- Update Loan Balance
            UPDATE loans
            SET 
                balance_remaining = GREATEST(0, balance_remaining - v_monthly_deduction),
                payments_made = payments_made + 1,
                last_payment_date = LAST_DAY(CONCAT(p_period_month, '-01')),
                last_payment_amount = v_monthly_deduction,
                next_payment_date = DATE_ADD(LAST_DAY(CONCAT(p_period_month, '-01')), INTERVAL 1 MONTH),
                status = CASE 
                    WHEN balance_remaining - v_monthly_deduction <= 0 THEN 'completed'
                    ELSE status
                END,
                actual_end_date = CASE 
                    WHEN balance_remaining - v_monthly_deduction <= 0 THEN LAST_DAY(CONCAT(p_period_month, '-01'))
                    ELSE actual_end_date
                END
            WHERE loan_id = v_loan_id;

        END LOOP loan_loop;
        CLOSE loan_cursor;

    END LOOP staff_loop;
    CLOSE staff_cursor;

    -- ========================
    -- UPDATE PAYROLL TOTALS
    -- ========================
    UPDATE payroll_periods pp
    SET 
        total_staff = (SELECT COUNT(*) FROM payroll_lines WHERE period_id = v_period_id),
        total_basic_salary = (SELECT COALESCE(SUM(basic_salary), 0) FROM payroll_lines WHERE period_id = v_period_id),
        total_allowances = (SELECT COALESCE(SUM(total_allowances), 0) FROM payroll_lines WHERE period_id = v_period_id),
        total_deductions = (SELECT COALESCE(SUM(total_deductions), 0) FROM payroll_lines WHERE period_id = v_period_id),
        total_net_pay = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_lines WHERE period_id = v_period_id)
    WHERE pp.period_id = v_period_id;

    -- Audit log
    INSERT INTO payroll_audit (table_name, record_id, action, new_values, user_id, user_name, notes)
    VALUES ('payroll_periods', v_period_id, 'initiate', JSON_OBJECT('period_month', p_period_month), p_actor_id, 'System', 'Payroll initiated');

    COMMIT;

    SELECT 'Payroll initiated successfully' AS message, v_period_id AS period_id;
END $$

DROP PROCEDURE IF EXISTS studentAggregator $$
CREATE PROCEDURE `studentAggregator`(IN `class_input` VARCHAR(50))
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

END $$

DROP PROCEDURE IF EXISTS studentPayments $$
CREATE PROCEDURE `studentPayments`(IN `in_code` BIGINT, IN `in_class_code` VARCHAR(100), IN `in_term_input` VARCHAR(100))
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE r_school_id VARCHAR(20);
  DECLARE r_branch_id VARCHAR(20);
  DECLARE r_description VARCHAR(100);
  DECLARE r_amount DECIMAL(10,2);
  DECLARE r_unit_price DECIMAL(10,2);
  DECLARE r_class_name VARCHAR(100);
  DECLARE r_term VARCHAR(20);
  DECLARE r_academic_year VARCHAR(20);
  DECLARE r_code BIGINT;
  DECLARE r_quantity INT DEFAULT 1;
  DECLARE v_existing_count INT DEFAULT 0;

  
  DECLARE revenue_cursor CURSOR FOR
    SELECT code, school_id, branch_id, description, amount, unit_price, class_name, term, academic_year, quantity
    FROM school_revenues
    WHERE class_code = in_class_code 
      AND term = in_term_input 
      AND status = 'Active';  

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  
  IF in_code != 0 THEN
    SELECT 
      school_id, branch_id, description, amount, unit_price, class_name, term, academic_year, quantity
    INTO 
      r_school_id, r_branch_id, r_description, r_amount, r_unit_price, r_class_name, r_term, r_academic_year, r_quantity
    FROM school_revenues
    WHERE code = in_code
    LIMIT 1;

    
    IF r_school_id IS NOT NULL THEN
      
      SELECT COUNT(*) INTO v_existing_count
      FROM payment_entries
      WHERE ref_no = in_code;

      
      IF v_existing_count = 0 THEN
        
        UPDATE school_revenues SET status = "Posted" WHERE code = in_code;

        
        IF r_class_name = 'All Classes' THEN
          INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity)
          SELECT in_code, admission_no, current_class, r_academic_year, r_term, r_amount, r_unit_price, r_description, r_school_id, r_branch_id, r_quantity
          FROM students
          WHERE school_id = r_school_id AND (branch_id = r_branch_id OR r_branch_id IS NULL);
        ELSE
          INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity)
          SELECT in_code, admission_no, current_class, r_academic_year, r_term, r_amount, r_unit_price, r_description, r_school_id, r_branch_id, r_quantity
          FROM students
          WHERE school_id = r_school_id AND (branch_id = r_branch_id OR r_branch_id IS NULL) AND class_name = r_class_name;
        END IF;
      END IF;
    END IF;

  
  ELSE
    OPEN revenue_cursor;

    revenue_loop: LOOP
      FETCH revenue_cursor INTO r_code, r_school_id, r_branch_id, r_description, r_amount, r_unit_price, r_class_name, r_term, r_academic_year, r_quantity;

      IF done THEN
        LEAVE revenue_loop;
      END IF;

      
      SELECT COUNT(*) INTO v_existing_count
      FROM payment_entries
      WHERE ref_no = r_code;

      
      IF v_existing_count = 0 THEN
        
        UPDATE school_revenues SET status = "Posted" WHERE code = r_code;

        
        IF r_class_name = 'All Classes' THEN
          INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity)
          SELECT r_code, admission_no, current_class, r_academic_year, r_term, r_amount, r_unit_price, r_description, r_school_id, r_branch_id, r_quantity
          FROM students
          WHERE school_id = r_school_id AND (branch_id = r_branch_id OR r_branch_id IS NULL);
        ELSE
          INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity)
          SELECT r_code, admission_no, current_class, r_academic_year, r_term, r_amount, r_unit_price, r_description, r_school_id, r_branch_id, r_quantity
          FROM students
          WHERE school_id = r_school_id AND (branch_id = r_branch_id OR r_branch_id IS NULL) AND class_name = r_class_name;
        END IF;
      END IF;

    END LOOP;

    CLOSE revenue_cursor;
  END IF;

END $$

DROP PROCEDURE IF EXISTS studentPayments_enhanced $$
CREATE PROCEDURE `studentPayments_enhanced`(IN `in_code` BIGINT, IN `in_class_code` VARCHAR(100), IN `in_term_input` VARCHAR(100), IN `in_create_journal_entries` BOOLEAN, IN `in_created_by` VARCHAR(50))
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE r_school_id VARCHAR(20);
  DECLARE r_branch_id VARCHAR(20);
  DECLARE r_description VARCHAR(100);
  DECLARE r_amount DECIMAL(10,2);
  DECLARE r_unit_price DECIMAL(10,2);
  DECLARE r_class_name VARCHAR(100);
  DECLARE r_term VARCHAR(20);
  DECLARE r_academic_year VARCHAR(20);
  DECLARE r_code BIGINT;
  DECLARE r_quantity INT DEFAULT 1;
  DECLARE v_payment_entry_id INT;

  -- Cursor for looping when code is not provided
  DECLARE revenue_cursor CURSOR FOR
    SELECT code, school_id, branch_id, description, amount, unit_price, class_name, term, academic_year, quantity
    FROM school_revenues
    WHERE class_code = in_class_code AND term = in_term_input;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  -- CASE 1: If in_code is provided, process one row
  IF in_code != 0 THEN
    SELECT 
      school_id, branch_id, description, amount, unit_price, class_name, term, academic_year, quantity
    INTO 
      r_school_id, r_branch_id, r_description, r_amount, r_unit_price, r_class_name, r_term, r_academic_year, r_quantity
    FROM school_revenues
    WHERE code = in_code
    LIMIT 1;

    UPDATE school_revenues SET status = "Posted" WHERE code = in_code;

    IF r_class_name = 'All Classes' THEN
      INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity)
      SELECT in_code, admission_no, current_class, r_academic_year, r_term, r_amount, r_unit_price, r_description, r_school_id, r_branch_id, r_quantity
      FROM students
      WHERE school_id = r_school_id AND (branch_id = r_branch_id OR r_branch_id IS NULL);
    ELSE
      INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity)
      SELECT in_code, admission_no, current_class, r_academic_year, r_term, r_amount, r_unit_price, r_description, r_school_id, r_branch_id, r_quantity
      FROM students
      WHERE school_id = r_school_id AND (branch_id = r_branch_id OR r_branch_id IS NULL) AND class_name = r_class_name;
    END IF;

    -- Create journal entries if requested
    IF in_create_journal_entries = TRUE THEN
      -- Get the newly created payment entries
      SELECT item_id INTO v_payment_entry_id 
      FROM payment_entries 
      WHERE ref_no = in_code 
      ORDER BY created_at DESC 
      LIMIT 1;
      
      -- Call procedure to convert payment to journal entry
      CALL convert_payment_to_journal(v_payment_entry_id, COALESCE(in_created_by, 'SYSTEM'));
    END IF;

  -- CASE 2: If class_code + term are used (code = 0)
  ELSE
    OPEN revenue_cursor;

    revenue_loop: LOOP
      FETCH revenue_cursor INTO r_code, r_school_id, r_branch_id, r_description, r_amount, r_unit_price, r_class_name, r_term, r_academic_year, r_quantity;

      IF done THEN
        LEAVE revenue_loop;
      END IF;

      UPDATE school_revenues SET status = "Posted" WHERE code = r_code;

      IF r_class_name = 'All Classes' THEN
        INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity)
        SELECT r_code, admission_no, current_class, r_academic_year, r_term, r_amount, r_unit_price, r_description, r_school_id, r_branch_id, r_quantity
        FROM students
        WHERE school_id = r_school_id AND (branch_id = r_branch_id OR r_branch_id IS NULL);
      ELSE
        INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity)
        SELECT r_code, admission_no, current_class, r_academic_year, r_term, r_amount, r_unit_price, r_description, r_school_id, r_branch_id, r_quantity
        FROM students
        WHERE school_id = r_school_id AND (branch_id = r_branch_id OR r_branch_id IS NULL) AND class_name = r_class_name;
      END IF;

      -- Create journal entries if requested
      IF in_create_journal_entries = TRUE THEN
        -- Get the newly created payment entries
        SELECT item_id INTO v_payment_entry_id 
        FROM payment_entries 
        WHERE ref_no = r_code 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Call procedure to convert payment to journal entry
        CALL convert_payment_to_journal(v_payment_entry_id, COALESCE(in_created_by, 'SYSTEM'));
      END IF;

    END LOOP;

    CLOSE revenue_cursor;
  END IF;

END $$

DROP PROCEDURE IF EXISTS students_applications $$
CREATE PROCEDURE `students_applications`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(100), IN `in_upload` VARCHAR(300), IN `in_type_of_application` VARCHAR(100), IN `in_name_of_applicant` VARCHAR(100), IN `in_home_address` VARCHAR(100), IN `in_date_of_birth` VARCHAR(100), IN `in_sex` VARCHAR(100), IN `in_religion` VARCHAR(100), IN `in_tribe` VARCHAR(100), IN `in_school_attended` VARCHAR(100), IN `in_last_class` VARCHAR(100), IN `in_state_of_origin` VARCHAR(100), IN `in_l_g_a` VARCHAR(100), IN `in_nationality` VARCHAR(100), IN `in_examination_date` DATE, IN `in_address` VARCHAR(100), IN `in_school` VARCHAR(100), IN `in_mathematics` INT(11), IN `in_english` INT(11), IN `in_others` VARCHAR(100), IN `in_other_score` INT(11), IN `in_admission_no` VARCHAR(100), IN `in_last_school_atterded` VARCHAR(100), IN `in_special_health_needs` VARCHAR(100), IN `in_father_place_of_work` VARCHAR(100), IN `in_father_occapation` VARCHAR(100), IN `in_blood_group` VARCHAR(100), IN `in_academic_year` VARCHAR(100), IN `in_admission_date` DATE, IN `in_status` VARCHAR(100), IN `in_mother_tongue` VARCHAR(100), IN `in_language_known` VARCHAR(100), IN `in_application_no` VARCHAR(100), IN `in_admission_year` VARCHAR(100), IN `in_class_type` VARCHAR(100), IN `in_current_class` VARCHAR(100), IN `in_medical_condition` VARCHAR(100), IN `in_upload_transfer_certificate` VARCHAR(100), IN `in_school_id` INT(11))
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
    END $$
    
DROP PROCEDURE IF EXISTS students_attendances $$
CREATE PROCEDURE `students_attendances`(IN `query_type` VARCHAR(50), IN `_id` INT, IN `_teacher_id` VARCHAR(50), IN `_teacher_name` VARCHAR(50), IN `_section` VARCHAR(50), IN `_class_name` VARCHAR(50), IN `_day` VARCHAR(50), IN `_status` VARCHAR(50), IN `_student_name` VARCHAR(50), IN `_admission_no` VARCHAR(50), IN `_term` VARCHAR(50), IN `_academic_year` VARCHAR(50), IN `_start_date` DATE, IN `_end_date` DATE, IN `_notes` VARCHAR(200), IN `_school_id` VARCHAR(50), IN `_branch_id` VARCHAR(20))
BEGIN
    IF query_type = 'create' THEN
    INSERT INTO class_attendances (
        teacher_name,
        teacher_id,
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
        branch_id,
        attendance_date
    ) VALUES (
        _teacher_name,
        _teacher_id,
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
        _branch_id,
        CURRENT_DATE
    )
    ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        notes = VALUES(notes),
        teacher_name = VALUES(teacher_name),
        teacher_id = VALUES(teacher_id),
        section = VALUES(section),
        class_name = VALUES(class_name),
        day = VALUES(day);

    ELSEIF query_type = 'select-student' THEN
        SELECT * FROM class_attendances WHERE admission_no = _admission_no;

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
END $$

DROP PROCEDURE IF EXISTS students_queries $$
CREATE PROCEDURE `students_queries`(IN `query_type` VARCHAR(30), IN `p_id` INT, IN `p_parent_id` VARCHAR(20), IN `p_guardian_id` VARCHAR(20), IN `p_student_name` VARCHAR(255), IN `p_home_address` TEXT, IN `p_date_of_birth` DATE, IN `p_sex` VARCHAR(10), IN `p_religion` VARCHAR(50), IN `p_tribe` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_l_g_a` VARCHAR(100), IN `p_nationality` VARCHAR(100), IN `p_last_school_attended` VARCHAR(100), IN `p_special_health_needs` VARCHAR(100), IN `p_blood_group` VARCHAR(100), IN `p_admission_no` VARCHAR(50), IN `p_admission_date` DATE, IN `p_academic_year` VARCHAR(20), IN `p_status` VARCHAR(100), IN `p_section` VARCHAR(100), IN `p_mother_tongue` VARCHAR(100), IN `p_language_known` VARCHAR(100), IN `p_current_class` VARCHAR(50), IN `p_profile_picture` VARCHAR(300), IN `p_medical_condition` VARCHAR(300), IN `p_transfer_certificate` VARCHAR(500), IN `p_branch_id` VARCHAR(300), IN `in_school_id` VARCHAR(20), IN `in_password` VARCHAR(100))
BEGIN
    DECLARE new_student_id INT;
    DECLARE in_class_name VARCHAR(50);
    DECLARE in_current_class VARCHAR(50);
    DECLARE in_code INT DEFAULT 0;
    DECLARE in_short_name VARCHAR(50);
    DECLARE branch_index INT DEFAULT 0;
    DECLARE generated_adm_no VARCHAR(50);
    DECLARE in_student_name VARCHAR(255);
    DECLARE in_class_section VARCHAR(255);
    DECLARE error_msg VARCHAR(255);
    DECLARE p_surname VARCHAR(20);
    DECLARE p_first_name VARCHAR(20);
    DECLARE p_other_names VARCHAR(20);

    -- Error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
    END;

    -- Parse name only for relevant query types
    IF query_type IN ('CREATE','returning_student','BULK RETURNINGS') THEN
        -- Normalize: ensure we handle names safely
        SET @name_parts_count = LENGTH(p_student_name) - LENGTH(REPLACE(p_student_name, ' ', '')) + 1;
        SET p_surname = SUBSTRING_INDEX(p_student_name, ' ', -1);
        SET p_first_name = SUBSTRING_INDEX(p_student_name, ' ', 1);
        SET p_other_names = NULL;
        IF @name_parts_count > 2 THEN
            SET p_other_names = TRIM(
                SUBSTRING(
                    p_student_name,
                    LENGTH(p_first_name) + 1,
                    LENGTH(p_student_name) - LENGTH(p_first_name) - LENGTH(p_surname) - 1
                )
            );
        END IF;

	    IF p_current_class IS NULL THEN
	        ROLLBACK;
	        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class not found for current_class';
	    ELSE
	    	 -- Fetch class details (needed for most write operations)
		    SELECT class_name, class_code, section
		    INTO in_class_name, in_current_class, in_class_section
		    FROM classes
		    WHERE (class_code = p_current_class OR class_name = p_current_class)
		      AND school_id = in_school_id
		      AND branch_id = p_branch_id
		    LIMIT 1;

	    END IF;

	    -- ✅ CRITICAL: Ensure class exists
	    IF in_class_name IS NULL THEN
	        ROLLBACK;
	        SIGNAL SQLSTATE '45000'
	            SET MESSAGE_TEXT = 'Invalid class: Class not found for the given school and branch';
	    END IF;

        -- Start transaction for write operations
    	START TRANSACTION;

	END IF;
    -- Get school branch info
    SELECT code, short_name
    INTO in_code, in_short_name
    FROM school_locations
    WHERE school_id = in_school_id AND branch_id = p_branch_id
    LIMIT 1;

    IF in_short_name IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'School location not found';
    END IF;

    -- Get branch index (for admission number)
    SELECT COUNT(*)
    INTO branch_index
    FROM school_locations
    WHERE school_id = in_school_id
      AND id <= (
          SELECT id
          FROM school_locations
          WHERE school_id = in_school_id AND branch_id = p_branch_id
          LIMIT 1
      );

    -- Generate default admission number (may not be used if user provides one)
    SET generated_adm_no = CONCAT(UPPER(in_short_name), '/', branch_index, '/', LPAD(in_code + 1, 4, '0'));

    -- Handle specific query types
    IF query_type = 'BULK RETURNINGS' THEN
        -- Treat empty string as NULL
        IF p_admission_no = '' THEN
            SET p_admission_no = NULL;
        END IF;

        IF p_admission_no IS NOT NULL THEN
            -- User provided admission number
            IF EXISTS (SELECT 1 FROM students WHERE admission_no = p_admission_no) THEN
                -- Update existing
                UPDATE students
                SET
                    student_name = p_student_name,
                    sex = p_sex,
                    academic_year = p_academic_year,
                    status = 'Active',
                    current_class = COALESCE(in_current_class, current_class),
                    class_name = COALESCE(in_class_name, class_name),
                    section = COALESCE(in_class_section, section),
                    password = COALESCE(in_password, password),
                    branch_id = COALESCE(p_branch_id, branch_id),
                    school_id = COALESCE(in_school_id, school_id)
                WHERE admission_no = p_admission_no;

                COMMIT;

                SELECT p_admission_no AS admission_no;
            ELSE
                -- Insert with user-provided admission_no
                INSERT INTO students (
                    surname, first_name, other_names, student_name, sex, admission_no, academic_year, status, student_type,
                    current_class, class_name, section, branch_id, school_id, password
                ) VALUES (
                    p_surname, p_first_name, p_other_names, p_student_name, p_sex, p_admission_no, p_academic_year,
                    'Active','Returning', in_current_class,
                    in_class_name,in_class_section, p_branch_id, in_school_id, in_password
                );
                COMMIT;
                SELECT p_admission_no AS admission_no;
            END IF;
        ELSE
            -- Auto-generate admission number
            SELECT code
            INTO in_code
            FROM school_locations
            WHERE school_id = in_school_id AND branch_id = p_branch_id
            FOR UPDATE;

            IF in_code IS NULL THEN
                ROLLBACK;
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to lock school_locations row';
            END IF;

            SET generated_adm_no = CONCAT(UPPER(in_short_name), '/', branch_index, '/', LPAD(in_code + 1, 4, '0'));

            SET @attempt = 0;
            WHILE @attempt < 3 DO
                SELECT COUNT(*) INTO @exists
                FROM students
                WHERE admission_no = generated_adm_no;

                IF @exists = 0 THEN
                    SET @attempt = 3;
                ELSE
                    SET in_code = in_code + 1;
                    SET generated_adm_no = CONCAT(UPPER(in_short_name), '/', branch_index, '/', LPAD(in_code + 1, 4, '0'));
                    SET @attempt = @attempt + 1;
                END IF;
            END WHILE;

            IF @exists > 0 THEN
                ROLLBACK;
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to generate unique admission number';
            END IF;

            INSERT INTO students (
                surname, first_name, other_names, student_name, sex, admission_no, academic_year, status, student_type,
                current_class, class_name, section, branch_id, school_id, password
            ) VALUES (
                p_surname, p_first_name, p_other_names, p_student_name, p_sex, generated_adm_no, p_academic_year,
                'Active','Returning', in_current_class,
                in_class_name, in_class_section, p_branch_id, in_school_id, in_password
            );

            UPDATE school_locations
            SET code = in_code + 1
            WHERE school_id = in_school_id AND branch_id = p_branch_id;

            SELECT generated_adm_no AS admission_no;
            COMMIT;
        END IF;

   ELSEIF query_type = 'select-class' THEN

    SELECT
        s.*,
        CASE
            -- RULE 1: Mixed class → student cannot be General or None
            WHEN cs.stream = 'Mixed'
                 AND s.stream IN ('General', 'None')
            THEN 'NotStreamed'

            -- RULE 2: Specific class stream → student must match exactly
            WHEN cs.stream NOT IN ('None', 'General', 'Mixed')
                 AND s.stream <> cs.stream
            THEN 'NotStreamed'

            -- RULE 3: Otherwise OK
            ELSE 'Streamed'
        END AS stream_status
    FROM students s
    LEFT JOIN classes cs
        ON s.current_class = cs.class_code
    WHERE s.current_class = p_current_class
      AND s.status IN ('Active', 'Suspended')
      AND s.school_id = in_school_id
    ORDER BY s.class_name, s.student_name ASC;


    ELSEIF query_type = 'children' THEN
        SELECT * FROM students
        WHERE school_id = in_school_id AND parent_id IS NULL AND current_class = p_current_class;

    ELSEIF query_type = 'class-grading' THEN
        CALL studentAggregator(p_current_class);

    ELSEIF query_type = 'SELECT' THEN
        SELECT * FROM students WHERE admission_no = p_admission_no;

    ELSEIF query_type = 'add-parent' THEN
        UPDATE students SET parent_id = p_parent_id
        WHERE admission_no = p_admission_no AND school_id = in_school_id;

   ELSEIF query_type = 'select-all' THEN

    IF p_status IS NULL OR p_status = '' OR p_status = 'All' THEN

        SELECT
            s.*,
            CASE
                -- RULE 1: Mixed class → student cannot be General or None
                WHEN cs.stream = 'Mixed'
                     AND s.stream IN ('General', 'None')
                THEN 'NotStreamed'

                -- RULE 2: Specific class stream → student must match
                WHEN cs.stream NOT IN ('None', 'General', 'Mixed')
                     AND s.stream <> cs.stream
                THEN 'NotStreamed'

                -- RULE 3: OK for General/None classes
                ELSE 'Streamed'
            END AS stream_status
        FROM students s
        LEFT JOIN classes cs
            ON s.current_class = cs.class_code
        WHERE s.school_id = in_school_id
          AND s.branch_id = p_branch_id
          AND s.status IN ('Active', 'Suspended')
          AND (p_current_class IS NULL OR p_current_class = '' OR s.current_class = p_current_class)
          AND (p_section IS NULL OR p_section = '' OR s.section = p_section)
        ORDER BY s.admission_no, s.class_name, s.student_name ASC;

    ELSE

        SELECT
            s.*,
            CASE
                -- RULE 1: Mixed class → student cannot be General or None
                WHEN cs.stream = 'Mixed'
                     AND s.stream IN ('General', 'None')
                THEN 'NotStreamed'

                -- RULE 2: Specific class stream → student must match
                WHEN cs.stream NOT IN ('None', 'General', 'Mixed')
                     AND s.stream <> cs.stream
                THEN 'NotStreamed'

                -- RULE 3: OK for General/None classes
                ELSE 'Streamed'
            END AS stream_status
        FROM students s
        LEFT JOIN classes cs
            ON s.current_class = cs.class_code
        WHERE s.school_id = in_school_id
          AND s.branch_id = p_branch_id
          AND s.status = p_status
          AND (p_current_class IS NULL OR p_current_class = '' OR s.current_class = p_current_class)
          AND (p_section IS NULL OR p_section = '' OR s.section = p_section)
        ORDER BY s.admission_no, s.class_name, s.student_name ASC;

    END IF;


    ELSEIF query_type = 'search' THEN
        SET @query = 'SELECT student_name, admission_no, sex, class_name, current_class AS class_code, status FROM students s';
        SET @where_clause = '';

        IF p_student_name IS NOT NULL AND p_student_name != '' THEN
            SET @where_clause = CONCAT(@where_clause, 's.student_name = "', p_student_name, '"');
        END IF;

        IF p_current_class IS NOT NULL AND p_current_class != '' THEN
            SET @where_clause = IF(@where_clause = '',
                CONCAT('s.current_class = "', p_current_class, '"'),
                CONCAT(@where_clause, ' AND s.current_class = "', p_current_class, '"')
            );
        END IF;

        IF p_section IS NOT NULL AND p_section != '' THEN
            SET @where_clause = IF(@where_clause = '',
                CONCAT('s.section = "', p_section, '"'),
                CONCAT(@where_clause, ' AND s.section = "', p_section, '"')
            );
        END IF;

        IF p_sex IS NOT NULL AND p_sex != '' THEN
            SET @where_clause = IF(@where_clause = '',
                CONCAT('s.sex = "', p_sex, '"'),
                CONCAT(@where_clause, ' AND s.sex = "', p_sex, '"')
            );
        END IF;

        SET @where_clause = IF(@where_clause = '',
            CONCAT('s.school_id = "', in_school_id, '"'),
            CONCAT(@where_clause, ' AND s.school_id = "', in_school_id, '"')
        );

        IF p_branch_id IS NOT NULL AND p_branch_id != '' THEN
            SET @where_clause = CONCAT(@where_clause, ' AND s.branch_id = "', p_branch_id, '"');
        END IF;

        SET @query = CONCAT(@query, ' WHERE ', @where_clause);
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

    ELSEIF query_type = 'UPDATE' THEN
        SELECT class_name, class_code INTO in_class_name, in_current_class
        FROM classes WHERE class_name = p_current_class;

        UPDATE students SET
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
            last_school_attended = COALESCE(p_last_school_attended, last_school_attended),
            special_health_needs = COALESCE(p_special_health_needs, special_health_needs),
            blood_group = COALESCE(p_blood_group, blood_group),
            admission_no = COALESCE(p_admission_no, admission_no),
            admission_date = COALESCE(p_admission_date, admission_date),
            academic_year = COALESCE(p_academic_year, academic_year),
            status = COALESCE(p_status, status),
            section = COALESCE(p_section, section),
            mother_tongue = COALESCE(p_mother_tongue, mother_tongue),
            language_known = COALESCE(p_language_known, language_known),
            current_class = COALESCE(in_current_class, current_class),
            class_name = COALESCE(in_class_name, class_name),
            profile_picture = COALESCE(p_profile_picture, profile_picture),
            medical_condition = COALESCE(p_medical_condition, medical_condition),
            branch_id = COALESCE(p_branch_id, branch_id),
            reason = COALESCE(p_transfer_certificate, reason)
        WHERE admission_no = p_admission_no;

        SELECT * FROM students WHERE admission_no = p_admission_no;

    ELSEIF query_type = 'updatewithadmissionNo' THEN
        SELECT class_name, class_code INTO in_class_name, in_current_class
        FROM classes WHERE class_name = p_current_class;

        UPDATE students SET
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
            last_school_attended = COALESCE(p_last_school_attended, last_school_attended),
            special_health_needs = COALESCE(p_special_health_needs, special_health_needs),
            blood_group = COALESCE(p_blood_group, blood_group),
            admission_no = COALESCE(p_admission_no, admission_no),
            admission_date = COALESCE(p_admission_date, admission_date),
            academic_year = COALESCE(p_academic_year, academic_year),
            section = COALESCE(p_section, section),
            mother_tongue = COALESCE(p_mother_tongue, mother_tongue),
            language_known = COALESCE(p_language_known, language_known),
            current_class = COALESCE(in_current_class, current_class),
            class_name = COALESCE(in_class_name, class_name),
            profile_picture = COALESCE(p_profile_picture, profile_picture),
            medical_condition = COALESCE(p_medical_condition, medical_condition),
            branch_id = COALESCE(p_branch_id, branch_id),
            reason = COALESCE(p_transfer_certificate, reason)
        WHERE id = p_id;

        SELECT * FROM students WHERE id = p_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students WHERE id = p_id;
        COMMIT;

    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown query_type';
    END IF;

END $$

DROP PROCEDURE IF EXISTS students_queries_v2 $$
CREATE PROCEDURE `students_queries_v2`(IN `query_type` VARCHAR(30), IN `p_id` INT, IN `p_parent_id` VARCHAR(20), IN `p_guardian_id` VARCHAR(20), IN `p_surname` VARCHAR(100), IN `p_first_name` VARCHAR(100), IN `p_other_names` VARCHAR(100), IN `p_home_address` TEXT, IN `p_date_of_birth` DATE, IN `p_sex` VARCHAR(10), IN `p_religion` VARCHAR(50), IN `p_tribe` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_l_g_a` VARCHAR(100), IN `p_nationality` VARCHAR(100), IN `p_last_school_attended` VARCHAR(100), IN `p_special_health_needs` VARCHAR(100), IN `p_blood_group` VARCHAR(100), IN `p_admission_no` VARCHAR(50), IN `p_admission_date` DATE, IN `p_academic_year` VARCHAR(20), IN `p_status` VARCHAR(100), IN `p_section` VARCHAR(100), IN `p_mother_tongue` VARCHAR(100), IN `p_language_known` VARCHAR(100), IN `p_current_class` VARCHAR(50), IN `p_profile_picture` VARCHAR(300), IN `p_medical_condition` VARCHAR(300), IN `p_transfer_certificate` VARCHAR(500), IN `p_branch_id` VARCHAR(300), IN `in_school_id` VARCHAR(20), IN `in_password` VARCHAR(100))
BEGIN
    -- Declare all variables and handlers at the beginning
    DECLARE new_student_id INT;
    DECLARE in_class_name VARCHAR(50);
    DECLARE in_current_class VARCHAR(50);
    DECLARE in_code INT DEFAULT 0;
    DECLARE in_short_name VARCHAR(50);
    DECLARE branch_index INT DEFAULT 0;
    DECLARE generated_adm_no VARCHAR(50);
    DECLARE in_student_name VARCHAR(255);
    DECLARE in_class_section VARCHAR(255);
    DECLARE error_msg VARCHAR(255);
    DECLARE v_student_name VARCHAR(255);
    DECLARE exists_count INT;
    DECLARE attempt INT DEFAULT 0;
    DECLARE query_text TEXT;
    DECLARE where_clause VARCHAR(1000);  -- Fixed variable name

    -- Error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_msg = MESSAGE_TEXT;
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
    END;

    -- Set student name
    SET v_student_name = CONCAT_WS(' ', p_first_name, p_other_names, p_surname);    SET in_student_name = v_student_name;

    IF query_type IN ('CREATE', 'returning_student', 'BULK RETURNINGS') THEN
        START TRANSACTION;

        -- Fetch class details
        SELECT class_name, class_code, section 
        INTO in_class_name, in_current_class, in_class_section
        FROM classes 
        WHERE (class_code = p_current_class OR class_name = p_current_class) 
        AND school_id = in_school_id 
        AND branch_id = p_branch_id
        LIMIT 1;

        IF in_class_name IS NULL THEN
            SET error_msg = CONCAT('Class not found for current_class: ', COALESCE(p_current_class, 'NULL'));
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
        END IF;

        -- Get school branch info
        SELECT code, short_name 
        INTO in_code, in_short_name
        FROM school_locations
        WHERE school_id = in_school_id 
        AND branch_id = p_branch_id
        LIMIT 1;

        IF in_short_name IS NULL THEN
            SET error_msg = CONCAT('School location not found for school_id: ', COALESCE(in_school_id, 'NULL'), ' branch: ', COALESCE(p_branch_id, 'NULL'));
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
        END IF;

        -- Get branch index
        SELECT COUNT(*) 
        INTO branch_index
        FROM school_locations
        WHERE school_id = in_school_id
        AND id <= (
            SELECT id 
            FROM school_locations 
            WHERE school_id = in_school_id 
            AND branch_id = p_branch_id
            LIMIT 1
        );

        -- Generate admission number only if p_admission_no is null or empty
        IF p_admission_no IS NULL OR TRIM(p_admission_no) = '' THEN
            SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));
        ELSE
            SET generated_adm_no = TRIM(p_admission_no);
        END IF;
    END IF;

    IF query_type = 'CREATE' THEN
        -- Lock the row for concurrency safety only if we need to auto-generate
        IF p_admission_no IS NULL OR TRIM(p_admission_no) = '' THEN
            SELECT code 
            INTO in_code 
            FROM school_locations 
            WHERE school_id = in_school_id 
            AND branch_id = p_branch_id 
            FOR UPDATE;

            -- Regenerate with locked code
            SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));
        ELSE
            SET generated_adm_no = TRIM(p_admission_no);
        END IF;

        -- Check for duplicates
        SELECT COUNT(*) INTO exists_count 
        FROM students 
        WHERE admission_no = generated_adm_no;

        IF exists_count = 0 THEN
            INSERT INTO students (
                parent_id, guardian_id, surname, first_name, other_names,  student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
                l_g_a, nationality, last_school_attended, special_health_needs, blood_group, admission_no, 
                academic_year, status, section, mother_tongue, language_known, current_class, class_name, profile_picture, 
                medical_condition, transfer_certificate, branch_id, school_id, password
            ) VALUES (
                p_parent_id, p_guardian_id, p_surname, p_first_name, p_other_names, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
                p_l_g_a, p_nationality, p_last_school_attended, p_special_health_needs, p_blood_group, 
                generated_adm_no, 
                p_academic_year, 'Active', p_section, p_mother_tongue, p_language_known, 
                in_current_class, in_class_name, p_profile_picture,
                p_medical_condition, p_transfer_certificate, p_branch_id, in_school_id, in_password
            );

            -- Get the new student ID
            SET new_student_id = LAST_INSERT_ID();
            
            -- Update code in school_locations only if we auto-generated the admission number
            IF p_admission_no IS NULL OR TRIM(p_admission_no) = '' THEN
                UPDATE school_locations
                SET code = in_code + 1
                WHERE school_id = in_school_id 
                AND branch_id = p_branch_id;
            END IF;

            -- Return the new student record
            SELECT * FROM students WHERE id = new_student_id;
            COMMIT;
        ELSE
            SET error_msg = CONCAT('Admission number already exists: ', COALESCE(generated_adm_no, 'NULL'));
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
        END IF;

    ELSEIF query_type = 'returning_student' THEN
        -- Lock the row for concurrency safety only if we need to auto-generate
        IF p_admission_no IS NULL OR TRIM(p_admission_no) = '' THEN
            SELECT code 
            INTO in_code 
            FROM school_locations 
            WHERE school_id = in_school_id 
            AND branch_id = p_branch_id 
            FOR UPDATE;

            -- Regenerate with locked code
            SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));
        ELSE
            SET generated_adm_no = TRIM(p_admission_no);
        END IF;

        -- Check for duplicates
        SELECT COUNT(*) INTO exists_count 
        FROM students 
        WHERE admission_no = generated_adm_no;

        IF exists_count = 0 THEN
            INSERT INTO students (
                parent_id, guardian_id, surname, first_name, other_names, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
                l_g_a, nationality, last_school_attended, special_health_needs, blood_group, admission_no, 
                academic_year, status, section, mother_tongue, language_known, current_class, class_name, profile_picture, 
                medical_condition, transfer_certificate, branch_id, school_id, password
            ) VALUES (
                p_parent_id, p_guardian_id, p_surname, p_first_name, p_other_names,v_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
                p_l_g_a, p_nationality, p_last_school_attended, p_special_health_needs, p_blood_group, 
                generated_adm_no, 
                p_academic_year, 'Active', p_section, p_mother_tongue, p_language_known, 
                in_current_class, in_class_name, p_profile_picture,
                p_medical_condition, p_transfer_certificate, p_branch_id, in_school_id, in_password
            );

            -- Update code in school_locations only if we auto-generated the admission number
            IF p_admission_no IS NULL OR TRIM(p_admission_no) = '' THEN
                UPDATE school_locations
                SET code = in_code + 1
                WHERE school_id = in_school_id 
                AND branch_id = p_branch_id;
            END IF;

            -- Return the generated admission number
            SELECT generated_adm_no AS admission_no;
            COMMIT;
        ELSE
            SET error_msg = CONCAT('Admission number already exists: ', COALESCE(generated_adm_no, 'NULL'));
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
        END IF;

    ELSEIF query_type = 'BULK RETURNINGS' THEN
        IF p_admission_no IS NOT NULL AND TRIM(p_admission_no) != '' THEN
            -- Use provided admission number for update
            SET generated_adm_no = TRIM(p_admission_no);
            
            IF EXISTS (
                SELECT 1 FROM students WHERE admission_no = generated_adm_no
            ) THEN
                -- Update existing student
                UPDATE students
                SET 
                    student_name = v_student_name,
                    sex = p_sex,
                    academic_year = p_academic_year,
                    status = 'Active',
                    current_class = COALESCE(in_current_class, current_class),
                    class_name = COALESCE(in_class_name, class_name),
                    section = COALESCE(in_class_section, section),
                    password = COALESCE(in_password, password),
                    branch_id = COALESCE(p_branch_id, branch_id),
                    school_id = COALESCE(in_school_id, school_id)
                WHERE admission_no = generated_adm_no;
                COMMIT;
            ELSE
                -- Lock the row for concurrency safety
                SELECT code 
                INTO in_code 
                FROM school_locations 
                WHERE school_id = in_school_id 
                AND branch_id = p_branch_id 
                FOR UPDATE;

                IF in_code IS NULL THEN
                    SET error_msg = CONCAT('Failed to lock school_locations row for school_id: ', COALESCE(in_school_id, 'NULL'));
                    ROLLBACK;
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
                END IF;

                -- Use provided admission number for insert
                SET generated_adm_no = TRIM(p_admission_no);

                -- Check for duplicates with retry logic
                SET attempt = 0;
                WHILE attempt < 3 DO
                    SELECT COUNT(*) INTO exists_count 
                    FROM students 
                    WHERE admission_no = generated_adm_no;

                    IF exists_count = 0 THEN
                        -- Exit loop if no duplicate
                        SET attempt = 3;
                    ELSE
                        -- Increment code and try a new admission number
                        SET in_code = in_code + 1;
                        SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));
                        SET attempt = attempt + 1;
                    END IF;
                END WHILE;

                IF exists_count > 0 THEN
                    SET error_msg = CONCAT('Failed to generate unique admission number after retries: ', COALESCE(generated_adm_no, 'NULL'));
                    ROLLBACK;
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
                END IF;

                -- Insert student
                INSERT INTO students (
                    surname, first_name, other_names, student_name, sex, admission_no, academic_year, status,
                    current_class, class_name, section, branch_id, school_id, password
                ) VALUES (
                    p_surname, p_first_name, p_other_names, in_student_name, p_sex, generated_adm_no, p_academic_year,
                    'Active', in_current_class,
                    in_class_name, COALESCE(in_class_section, 'A'), p_branch_id, in_school_id, in_password
                );

                -- Get the new student ID
                SET new_student_id = LAST_INSERT_ID();

                -- Create user record
                INSERT INTO users (
                    name, username, password, user_type, school_id, branch_id
                ) VALUES (
                    in_student_name, generated_adm_no, in_password, 'student', in_school_id, p_branch_id
                );

                -- Update student with user_id
                UPDATE students
                SET user_id = LAST_INSERT_ID()
                WHERE admission_no = generated_adm_no;

                -- Update code in school_locations 
                UPDATE school_locations 
                SET code = in_code + 1
                WHERE school_id = in_school_id 
                AND branch_id = p_branch_id;

                -- Return generated admission number
                SELECT generated_adm_no AS admission_no;
                COMMIT;
            END IF;
        ELSE
            -- Lock the row for concurrency safety
            SELECT code 
            INTO in_code 
            FROM school_locations 
            WHERE school_id = in_school_id 
            AND branch_id = p_branch_id 
            FOR UPDATE;

            IF in_code IS NULL THEN
                SET error_msg = CONCAT('Failed to lock school_locations row for school_id: ', COALESCE(in_school_id, 'NULL'));
                ROLLBACK;
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
            END IF;

            -- Regenerate with locked code
            SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));

            -- Check for duplicates with retry logic
            SET attempt = 0;
            WHILE attempt < 3 DO
                SELECT COUNT(*) INTO exists_count 
                FROM students 
                WHERE admission_no = generated_adm_no;

                IF exists_count = 0 THEN
                    -- Exit loop if no duplicate
                    SET attempt = 3;
                ELSE
                    -- Increment code and try a new admission number
                    SET in_code = in_code + 1;
                    SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));
                    SET attempt = attempt + 1;
                END IF;
            END WHILE;

            IF exists_count > 0 THEN
                SET error_msg = CONCAT('Failed to generate unique admission number after retries: ', COALESCE(generated_adm_no, 'NULL'));
                ROLLBACK;
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
            END IF;

            -- Insert student
            INSERT INTO students (
                surname, first_name, other_names, student_name, sex, admission_no, academic_year, status,
                current_class, class_name, section, branch_id, school_id, password
            ) VALUES (
                p_surname, p_first_name, p_other_names, in_student_name, p_sex, generated_adm_no, p_academic_year,
                'Active', in_current_class,
                in_class_name, COALESCE(in_class_section, 'A'), p_branch_id, in_school_id, in_password
            );

            -- Get the new student ID
            SET new_student_id = LAST_INSERT_ID();

            -- Create user record
            INSERT INTO users (
                name, username, password, user_type, school_id, branch_id
            ) VALUES (
                in_student_name, generated_adm_no, in_password, 'student', in_school_id, p_branch_id
            );

            -- Update student with user_id
            UPDATE students
            SET user_id = LAST_INSERT_ID()
            WHERE admission_no = generated_adm_no;

            -- Update code in school_locations
            UPDATE school_locations 
            SET code = in_code + 1
            WHERE school_id = in_school_id 
            AND branch_id = p_branch_id;

            -- Return generated admission number
            SELECT generated_adm_no AS admission_no;
            COMMIT;
        END IF;

    ELSEIF query_type = 'select-class' THEN
        SELECT * 
        FROM students 
        WHERE current_class = p_current_class 
        AND school_id = in_school_id;

    ELSEIF query_type = 'class-grading' THEN
        CALL studentAggregator(p_current_class);

    ELSEIF query_type = 'SELECT' THEN
        SELECT * 
        FROM students 
        WHERE admission_no = p_admission_no;

    ELSEIF query_type = 'add-parent' THEN
        UPDATE students 
        SET parent_id = p_parent_id 
        WHERE admission_no = p_admission_no 
        AND school_id = in_school_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT * 
        FROM students 
        WHERE school_id = in_school_id
        AND branch_id = p_branch_id;

    ELSEIF query_type = 'search' THEN
        SET query_text = 'SELECT student_name, admission_no, sex, class_name, current_class AS class_code, status FROM students s';
        SET where_clause = '';

        -- Build WHERE clause conditionally
        IF p_surname IS NOT NULL AND p_surname != '' THEN
            SET where_clause = CONCAT(where_clause, 's.surname = "', p_surname, '"');
        END IF;
        
        IF p_current_class IS NOT NULL AND p_current_class != '' THEN
            SET where_clause = IF(where_clause = '', 
                CONCAT('s.current_class = "', p_current_class, '"'),
                CONCAT(where_clause, ' AND s.current_class = "', p_current_class, '"')
            );
        END IF;

        IF p_sex IS NOT NULL AND p_sex != '' THEN
            SET where_clause = IF(where_clause = '', 
                CONCAT('s.sex = "', p_sex, '"'),
                CONCAT(where_clause, ' AND s.sex = "', p_sex, '"')
            );
        END IF;

        -- Always filter by school_id
        SET where_clause = IF(where_clause = '',
            CONCAT('s.school_id = "', in_school_id, '"'),
            CONCAT(where_clause, ' AND s.school_id = "', in_school_id, '"')
        );

        -- Optional branch_id filter
        IF p_branch_id IS NOT NULL AND p_branch_id != '' THEN
            SET where_clause = CONCAT(where_clause, ' AND s.branch_id = "', p_branch_id, '"');
        END IF;

        -- Finalize the query
        SET query_text = CONCAT(query_text, ' WHERE ', where_clause);

        -- Execute the dynamic query
        PREPARE stmt FROM query_text;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

    ELSEIF query_type = 'UPDATE' THEN
        SELECT class_name, class_code 
        INTO in_class_name, in_current_class 
        FROM classes 
        WHERE class_name = p_current_class 
        LIMIT 1;

        UPDATE students
        SET
            parent_id = COALESCE(p_parent_id, parent_id),
            guardian_id = COALESCE(p_guardian_id, guardian_id),
            surname = COALESCE(p_surname, surname),
            first_name = COALESCE(p_first_name, first_name),
            other_names = COALESCE(p_other_names, other_names),
            home_address = COALESCE(p_home_address, home_address),
            date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
            sex = COALESCE(p_sex, sex),
            religion = COALESCE(p_religion, religion),
            tribe = COALESCE(p_tribe, tribe),
            state_of_origin = COALESCE(p_state_of_origin, state_of_origin),
            l_g_a = COALESCE(p_l_g_a, l_g_a),
            nationality = COALESCE(p_nationality, nationality),
            last_school_attended = COALESCE(p_last_school_attended, last_school_attended),
            special_health_needs = COALESCE(p_special_health_needs, special_health_needs),
            blood_group = COALESCE(p_blood_group, blood_group),
            admission_no = COALESCE(p_admission_no, admission_no),
            admission_date = COALESCE(p_admission_date, admission_date),
            academic_year = COALESCE(p_academic_year, academic_year),
            status = COALESCE(p_status, status),
            section = COALESCE(p_section, section),
            mother_tongue = COALESCE(p_mother_tongue, mother_tongue),
            language_known = COALESCE(p_language_known, language_known),
            current_class = COALESCE(in_current_class, current_class),
            class_name = COALESCE(in_class_name, class_name),
            profile_picture = COALESCE(p_profile_picture, profile_picture),
            medical_condition = COALESCE(p_medical_condition, medical_condition),
            branch_id = COALESCE(p_branch_id, branch_id),
            transfer_certificate = COALESCE(p_transfer_certificate, transfer_certificate)
        WHERE admission_no = p_admission_no;

        SELECT * 
        FROM students 
        WHERE admission_no = p_admission_no;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students 
        WHERE id = p_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS student_assignments $$
CREATE PROCEDURE `student_assignments`(IN `query_type` VARCHAR(50), IN `in_id` VARCHAR(8), IN `in_assignment_id` VARCHAR(8), IN `in_student_name` VARCHAR(100), IN `in_admission_no` VARCHAR(20), IN `in_class_name` VARCHAR(80), IN `in_subject` VARCHAR(200), IN `in_teacher_id` VARCHAR(10), IN `in_teacher_name` VARCHAR(50), IN `in_attachement` VARCHAR(500), IN `in_content` TEXT, IN `in_marks` VARCHAR(8), IN `in_score` VARCHAR(8), IN `in_remark` VARCHAR(8), IN `in_comment` VARCHAR(500))
BEGIN
    IF query_type ='create' THEN
        INSERT INTO `student_assignments`( `assignment_id`,`student_name`, `admission_no`, `class_name`, `subject`, `teacher_id`, `teacher_name`, `content`) 
        VALUES ( `in_assignment_id`,`in_student_name`, `in_admission_no`, `in_class_name`, `in_subject`, `in_teacher_id`, `in_teacher_name`, `in_content`);
      ELSEIF query_type = 'update' THEN
        UPDATE `student_assignments`
        SET 
            `assignment_id` = COALESCE(`in_assignment_id`, `assignment_id`),
            `student_name` = COALESCE(`in_student_name`, `student_name`),
            `admission_no` = COALESCE(`in_admission_no`, `admission_no`),
            `class_name` = COALESCE(`in_class_name`, `class_name`),
            `subject` = COALESCE(`in_subject`, `subject`),
            `teacher_id` = COALESCE(`in_teacher_id`, `teacher_id`),
            `teacher_name` = COALESCE(`in_teacher_name`, `teacher_name`),
            `content` = COALESCE(`in_content`, `content`),
            `marks` = COALESCE(`in_marks`, `marks`),
            `score` = COALESCE(`in_score`, `score`),
            `remark` = COALESCE(`in_remark`, `remark`),
            `comment` = COALESCE(`in_comment`, `comment`),
            `updated_at` = NOW()
        WHERE `id` = `in_id`;

    ELSEIF query_type ='select' THEN
     
        IF in_assignment_id IS NOT NULL AND in_admission_no !='' THEN
           SELECT * FROM `student_assignments` WHERE admission_no = in_admission_no AND assignment_id = in_assignment_id;
       
        ELSEIF in_teacher_id IS NOT NULL AND in_teacher_id !='' AND in_assignment_id IS NOT NULL AND in_assignment_id!='' THEN
        
           SELECT * FROM `student_assignments` WHERE teacher_id = in_teacher_id AND assignment_id = in_assignment_id;
        ELSEIF in_id IS NOT NULL AND in_id !='' THEN
        
           SELECT * FROM `student_assignments` WHERE id = in_id;
        ELSE 
           SELECT * FROM `student_assignments`;
        END IF;
    END IF;
END $$

DROP PROCEDURE IF EXISTS student_grading $$
CREATE PROCEDURE `student_grading`(IN `query_type` VARCHAR(50), IN `in_id` INT(11), IN `in_class_code` VARCHAR(20), IN `in_admission_no` VARCHAR(100), IN `in_student_name` VARCHAR(100), IN `in_subject` VARCHAR(100), IN `in_subject_code` VARCHAR(100), IN `in_academic_year` VARCHAR(20), IN `in_term` VARCHAR(20), IN `in_ca1Score` VARCHAR(5), IN `in_ca2Score` VARCHAR(5), IN `in_ca3Score` VARCHAR(5), IN `in_ca4Score` VARCHAR(5), IN `in_examScore` VARCHAR(5), IN `in_mark_by` VARCHAR(100), IN `in_status` VARCHAR(50), IN `in_branch_id` VARCHAR(50), IN `in_school_id` VARCHAR(20))
BEGIN
    DECLARE `in_total` DOUBLE(5,2);
    DECLARE `in_grade` VARCHAR(5);
    DECLARE `in_remark` VARCHAR(100);
   # DECLARE `in_subj_code` VARCHAR(50);
   # DECLARE `in_cls_code` VARCHAR(50);

    IF query_type = 'create' THEN
        -- Get class and subject codes
        #SELECT class_code INTO in_cls_code FROM classes 
        #WHERE class_name = in_class_name AND branch_id = in_branch_id;

        #SELECT subject_code INTO in_subj_code FROM subjects 
        #WHERE subject = in_subject AND class_code = in_cls_code;

        -- Calculate total score with blank check
        SET in_total = 
            COALESCE(NULLIF(in_ca1Score, ''), 0) +
            COALESCE(NULLIF(in_ca2Score, ''), 0) +
            COALESCE(NULLIF(in_ca3Score, ''), 0) +
            COALESCE(NULLIF(in_ca4Score, ''), 0) +
            COALESCE(NULLIF(in_examScore, ''), 0);

        -- Fetch grade and remark
        SELECT grade, remark INTO in_grade, in_remark
        FROM grade_setup
        WHERE in_total BETWEEN min_score AND max_score
        LIMIT 1;

        -- Update or insert based on existence
        IF EXISTS (
            SELECT 1 FROM student_grading
            WHERE admission_no = in_admission_no AND subject_code = in_subject_code AND school_id = in_school_id
        ) THEN
            UPDATE student_grading
            SET
                class_code = in_class_code,
                subject_code = in_subject_code,
                academic_year = in_academic_year,
                term = in_term,
                ca1Score = COALESCE(NULLIF(in_ca1Score, ''), 0),
                ca2Score = COALESCE(NULLIF(in_ca2Score, ''), 0),
                ca3Score = COALESCE(NULLIF(in_ca3Score, ''), 0),
                ca4Score = COALESCE(NULLIF(in_ca4Score, ''), 0),
                examScore = COALESCE(NULLIF(in_examScore, ''), 0),
                total_score = in_total,
                grade = in_grade,
                remark = in_remark,
                mark_by = in_mark_by,
                status = in_status
            WHERE admission_no = in_admission_no AND subject_code = in_subject_code AND school_id = in_school_id;
        ELSE
            INSERT INTO student_grading (
                branch_id,
                admission_no,
                student_name,
                subject,
                subject_code,
                class_code,
                academic_year,
                term,
                ca1Score,
                ca2Score,
                ca3Score,
                ca4Score,
                examScore,
                total_score,
                grade,
                remark,
                mark_by,
                status,
                school_id
            ) VALUES (
                in_branch_id,
                in_admission_no,
                in_student_name,
                in_subject,
                in_subject_code,
                in_class_code,
                in_academic_year,
                in_term,
                COALESCE(NULLIF(in_ca1Score, ''), 0),
                COALESCE(NULLIF(in_ca2Score, ''), 0),
                COALESCE(NULLIF(in_ca3Score, ''), 0),
                COALESCE(NULLIF(in_ca4Score, ''), 0),
                COALESCE(NULLIF(in_examScore, ''), 0),

                in_total,
                in_grade,
                in_remark,
                in_mark_by,
                in_status,
                in_school_id
            );
        END IF;

    ELSEIF query_type = 'select' THEN
        SELECT *
        FROM student_grading
        WHERE (admission_no = in_admission_no OR in_admission_no IS NULL)
          AND (subject_code = in_subject_code OR in_subject_code IS NULL)
          AND (class_code = in_class_name OR in_class_name IS NULL)
          AND (academic_year = in_academic_year OR in_academic_year IS NULL)
          AND (term = in_term OR in_term IS NULL)
          AND (branch_id = in_branch_id OR in_branch_id IS NULL)
          AND school_id = in_school_id;

    ELSEIF query_type = 'students_marks' THEN
        SELECT *
        FROM student_grading
        WHERE school_id = in_school_id
          AND class_code = in_class_code
          AND term = in_term
          AND status = 'Draft'
          AND subject_code = in_subject_code
          AND academic_year = in_academic_year;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM student_grading
        WHERE id = in_id;
    END IF;
END $$

DROP PROCEDURE IF EXISTS student_parents $$
CREATE PROCEDURE `student_parents`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(100), IN `in_name` VARCHAR(100), IN `in_phone` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_relationship` VARCHAR(100), IN `in_is_guardian` VARCHAR(100), IN `in_occupation` VARCHAR(100), IN `in_children_admin_no` VARCHAR(50), IN `in_school_id` INT(11))
BEGIN 
DECLARE count_parent INT(2) DEFAULT(0);
DECLARE _parent_id INT(11) DEFAULT(0);

IF query_type="create" THEN
SELECT  id into _parent_id from parent WHERE  fullname = in_name AND phone=in_phone;
IF _parent_id < 1 THEN
	INSERT INTO `parent`(fullname, phone, email, relationship, is_guardian, occupation,school_id)
	VALUES (in_name, in_phone, in_email, in_relationship, in_is_guardian, in_occupation,in_school_id);
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
END $$

DROP PROCEDURE IF EXISTS student_result $$
CREATE PROCEDURE `student_result`(IN `query_type` VARCHAR(50), IN `in_admission_no` VARCHAR(30))
BEGIN
IF query_type ='get-result' THEN
    SELECT a.*, (SELECT b.exam_name FROM exam_calendar b where a.calendar_id = b.id) as exam_name FROM student_grading a  WHERE admission_no = in_admission_no; 
END IF;


END $$

DROP PROCEDURE IF EXISTS subjects $$
CREATE PROCEDURE `subjects`(IN `query_type` VARCHAR(50), IN `in_id` VARCHAR(10), IN `in_subject` VARCHAR(50), IN `in_section` VARCHAR(50), IN `in_status` ENUM('Active','Inactive'), IN `in_school_id` VARCHAR(20), IN `in_class_code` VARCHAR(50))
BEGIN
DECLARE last_code int;
DECLARE subject_code varchar(100);


IF query_type='create' THEN
 START TRANSACTION;

SELECT MAX(code) + 1 INTO @last_code FROM number_generator WHERE prefix = "sub" FOR UPDATE;

SET @subject_code = CONCAT('SBJ', LPAD(@last_code, 4, '0'));

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
END $$

DROP PROCEDURE IF EXISTS subject_management $$
CREATE PROCEDURE `subject_management`(IN `in_id` INT(100), IN `query_type` VARCHAR(100), IN `in_select_class` VARCHAR(100), IN `in_subject_name` VARCHAR(100), IN `in_c_a_pass_mark` INT(100), IN `in_exam_pass_mark` INT(100), IN `in_other_description` VARCHAR(100), IN `in_assignment_pass_mark` INT(100))
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
END $$

DROP PROCEDURE IF EXISTS SubmitAttendance $$
CREATE PROCEDURE `SubmitAttendance`(
  IN `p_class_code` VARCHAR(20),
  IN `p_academic_week_id` INT,
  IN `p_attendance_date` DATE,
  IN `p_day_of_week` TINYINT,
  IN `p_marked_by` VARCHAR(20),
  IN `p_attendance_data` JSON,
  IN `p_branch_id` VARCHAR(50),
  IN `p_school_id` VARCHAR(50)
)
BEGIN
  DECLARE v_admission_no VARCHAR(20);
  DECLARE v_status VARCHAR(10);
  DECLARE v_notes TEXT;
  DECLARE i INT DEFAULT 0;
  DECLARE array_length INT DEFAULT JSON_LENGTH(p_attendance_data);

  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    SELECT 'Failed to submit attendance due to an error' AS error_message;
  END;

  WHILE i < array_length DO
    
    SET v_admission_no = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].admission_no')));
    SET v_status = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].status')));
    SET v_notes = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].notes')));

    INSERT INTO attendance_records (
      admission_no, class_code, academic_week_id, attendance_date,
      day_of_week, status, marked_by, notes, branch_id, school_id
    )
    VALUES (
      v_admission_no, p_class_code, p_academic_week_id, p_attendance_date,
      p_day_of_week, v_status, p_marked_by, v_notes, p_branch_id, p_school_id
    )
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      marked_by = VALUES(marked_by),
      notes = VALUES(notes),
      marked_at = CURRENT_TIMESTAMP;

    SET i = i + 1;
  END WHILE;

  -- ✅ Only lightweight output here — NO writes after loop
  SELECT 'Attendance submitted successfully' AS message, array_length AS records_processed;

END $$

DROP PROCEDURE IF EXISTS syllabus $$
CREATE PROCEDURE `syllabus`(IN `query_type` VARCHAR(50), IN `p_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_code` VARCHAR(100), IN `p_term` VARCHAR(50), IN `p_week` TINYINT, IN `p_title` VARCHAR(300), IN `p_content` TEXT, IN `p_status` VARCHAR(30))
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
END $$

DROP PROCEDURE IF EXISTS syllabusTracker $$
CREATE PROCEDURE `syllabusTracker`(IN `op_type` VARCHAR(10), IN `p_id` INT, IN `p_syllabu_id` INT, IN `p_subject` VARCHAR(100), IN `p_class_level` INT, IN `p_term` VARCHAR(50), IN `p_academic_year` YEAR, IN `p_week` TINYINT, IN `p_status` ENUM('Pending','Ongoing','Onhold','Completed'))
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
END $$

DROP PROCEDURE IF EXISTS sync_branch_chart_of_accounts $$
CREATE PROCEDURE `sync_branch_chart_of_accounts`(IN `p_school_id` VARCHAR(20), IN `p_target_branch_id` VARCHAR(20), IN `p_sync_mode` ENUM('ADD_MISSING','FULL_SYNC'), IN `p_created_by` VARCHAR(50))
BEGIN
    DECLARE v_main_branch_id VARCHAR(20);
    DECLARE v_error_msg VARCHAR(255);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        ROLLBACK;
        RESIGNAL SET MESSAGE_TEXT = v_error_msg;
    END;
    
    
    IF p_created_by IS NULL OR p_created_by = '' THEN
        SET p_created_by = 'SYSTEM_SYNC';
    END IF;
    IF p_sync_mode IS NULL OR p_sync_mode = '' THEN
        SET p_sync_mode = 'ADD_MISSING';
    END IF;
    
    
    SELECT branch_id INTO v_main_branch_id
    FROM chart_of_accounts
    WHERE school_id = p_school_id
    AND branch_id != p_target_branch_id
    AND is_active = 1
    GROUP BY branch_id
    ORDER BY MIN(created_at), COUNT(*) DESC
    LIMIT 1;
    
    IF v_main_branch_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No main branch found to sync from';
    END IF;
    
    START TRANSACTION;
    
    IF p_sync_mode = 'ADD_MISSING' THEN
        
        INSERT INTO chart_of_accounts (
            account_code, account_name, account_type, account_subtype,
            normal_balance, description, is_active, is_system_account, 
            school_id, branch_id
        )
        SELECT 
            main.account_code, main.account_name, main.account_type, main.account_subtype,
            main.normal_balance, main.description, main.is_active, main.is_system_account,
            p_school_id, p_target_branch_id
        FROM chart_of_accounts main
        LEFT JOIN chart_of_accounts target ON main.account_code = target.account_code 
            AND target.school_id = p_school_id 
            AND target.branch_id = p_target_branch_id
        WHERE main.school_id = p_school_id
        AND main.branch_id = v_main_branch_id
        AND main.is_active = 1
        AND target.account_id IS NULL;
        
        SELECT ROW_COUNT() as accounts_added, 'Missing accounts added successfully' as message;
        
    ELSE 
        
        
        CALL sync_branch_chart_of_accounts(p_school_id, p_target_branch_id, 'ADD_MISSING', p_created_by);
    END IF;
    
    COMMIT;
    
END $$

DROP PROCEDURE IF EXISTS taskTodos $$
CREATE PROCEDURE `taskTodos`(IN `op_type` VARCHAR(100), IN `p_id` VARCHAR(100), IN `p_user_id` INT(11), IN `p_title` VARCHAR(200), IN `p_class_name` VARCHAR(60), IN `p_event_category` ENUM('Lesson','E-Class','Homework','Training','Holidays'), IN `p_due_date` DATE, IN `p_content` LONGTEXT, IN `p_created_by` VARCHAR(50), IN `p_priority` ENUM('High','Medium','Low'), IN `p_status` VARCHAR(50), IN `p_limit` INT(11), IN `p_offset` INT(11))
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

END $$

DROP PROCEDURE IF EXISTS teachers $$
CREATE PROCEDURE `teachers`(IN `query_type` VARCHAR(100), IN `p_id` INT(10), IN `p_name` VARCHAR(255), IN `p_sex` VARCHAR(10), IN `p_age` INT, IN `p_address` TEXT, IN `p_date_of_birth` VARCHAR(20), IN `p_marital_status` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_mobile_no` VARCHAR(20), IN `p_email` VARCHAR(100), IN `p_qualification` VARCHAR(255), IN `p_user_type` VARCHAR(50), IN `p_staff_type` VARCHAR(255), IN `p_staff_role` VARCHAR(255), IN `p_working_experience` TEXT, IN `p_religion` VARCHAR(50), IN `p_last_place_of_work` VARCHAR(255), IN `p_do_you_have` TEXT, IN `p_when_do` DATE, IN `p_account_name` VARCHAR(255), IN `p_account_number` VARCHAR(50), IN `p_bank` VARCHAR(100), IN `p_passport_url` VARCHAR(200), IN `p_branch_id` VARCHAR(100), IN `p_school_id` VARCHAR(20), IN `p_password` VARCHAR(100))
BEGIN
    DECLARE _teacher_id INTEGER;
    DECLARE _user_id INTEGER;

    -- 🚨 error handler: rollback if any SQL error occurs
    -- DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    -- BEGIN
    --     ROLLBACK;
    --     SELECT 'Error: Transaction rolled back due to failure' AS error_message;
    -- END;

    IF query_type = 'create' THEN
        START TRANSACTION;
        
        INSERT INTO teachers (
            name, sex, age, address, date_of_birth, marital_status,
            state_of_origin, mobile_no, email, qualification, staff_type,
            staff_role, working_experience, religion, last_place_of_work,
            account_name, account_number, bank, passport_url, branch_id, school_id
        )
        VALUES (
            p_name, p_sex, p_age, p_address, p_date_of_birth, p_marital_status,
            p_state_of_origin, p_mobile_no, p_email, p_qualification, p_staff_type,
            p_staff_role, p_working_experience, p_religion, p_last_place_of_work,
            p_account_name, p_account_number, p_bank, p_passport_url, p_branch_id, p_school_id
        );
        
        SET _teacher_id = LAST_INSERT_ID();

        INSERT INTO users (name, email, username, phone, is_activated, must_change_password, activated_at,activation_method,  password, user_type, school_id)
        VALUES (p_name, p_email, p_mobile_no, p_mobile_no, 1,0, NOW(),  'manual_admin', p_password,'Teacher', p_school_id);
        
        SET _user_id = LAST_INSERT_ID();

        UPDATE teachers SET user_id = _user_id WHERE id = _teacher_id;
        
        -- COMMIT;
        SELECT _teacher_id AS teacher_id;

    ELSEIF query_type = 'select-class' THEN
        SELECT * FROM teacher_classes WHERE teacher_id = p_id;

    ELSEIF query_type = 'select-with-roles' THEN
        SELECT 
            t.*,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'teacher_id', cr.teacher_id,
                        'section', cr.section,
                        'class_name', cr.class_name,
                        'role', cr.role
                    )
                )
                FROM class_role cr
                WHERE cr.teacher_id = t.id
            ) AS teacherRoles,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(            
                        'teacher_id', tc.teacher_id,
                        'section', tc.section,
                        'subject', tc.subject,
                        'class_name', tc.class_name,
                        'role', tc.role
                    )
                )
                FROM teacher_classes tc
                WHERE tc.teacher_id = t.id
            ) AS teacherClasses
        FROM teachers t
        WHERE t.school_id = p_school_id
          AND (p_branch_id IS NULL OR p_branch_id = '' OR t.branch_id = p_branch_id);

    ELSEIF query_type = 'select-roles' THEN
        SELECT * FROM class_role WHERE teacher_id = p_id;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM teachers WHERE id = p_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teachers 
        WHERE school_id = p_school_id
          AND (p_branch_id IS NULL OR p_branch_id = '' OR branch_id = p_branch_id);

    ELSEIF query_type = 'select_teacher_name' THEN
        SELECT DISTINCT name FROM teachers;

  ELSEIF query_type = 'update' THEN

    -- 1️⃣ Update TEACHERS table
    UPDATE teachers
    SET 
        name = COALESCE(p_name, name),
        sex = COALESCE(p_sex, sex),
        age = COALESCE(p_age, age),
        address = COALESCE(p_address, address),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        marital_status = COALESCE(p_marital_status, marital_status),
        state_of_origin = COALESCE(p_state_of_origin, state_of_origin),
        mobile_no = COALESCE(p_mobile_no, mobile_no),
        email = COALESCE(p_email, email),
        qualification = COALESCE(p_qualification, qualification),
        staff_type = COALESCE(p_staff_type, staff_type),
        staff_role = COALESCE(p_staff_role, staff_role),
        working_experience = COALESCE(p_working_experience, working_experience),
        religion = COALESCE(p_religion, religion),
        last_place_of_work = COALESCE(p_last_place_of_work, last_place_of_work),
        account_name = COALESCE(p_account_name, account_name),
        account_number = COALESCE(p_account_number, account_number),
        bank = COALESCE(p_bank, bank),
        passport_url = COALESCE(p_passport_url, passport_url),
        branch_id = COALESCE(p_branch_id, branch_id)
    WHERE id = p_id;

    -- 2️⃣ Find the linked user_id
    SELECT user_id INTO _user_id FROM teachers WHERE id = p_id;

    -- 3️⃣ Update USERS table
    UPDATE users
    SET 
        name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        phone = COALESCE(p_mobile_no, phone),
        username = COALESCE(p_mobile_no, username)
    WHERE id = _user_id;

    -- 4️⃣ Return updated teacher id
    SELECT id AS teacher_id FROM teachers WHERE id = p_id;
	END IF;
END $$

DROP PROCEDURE IF EXISTS teacher_classes $$
CREATE PROCEDURE `teacher_classes`(IN `query_type` VARCHAR(50), IN `in_id` INT(11), IN `in_teacher_id` INT(11), IN `in_subject` VARCHAR(50), IN `in_subject_code` VARCHAR(50), IN `in_class_name` VARCHAR(50), IN `in_class_code` VARCHAR(50))
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF query_type = 'create' THEN
        START TRANSACTION;
        
        -- Check if already exists
        IF EXISTS (
            SELECT 1 FROM teacher_classes 
            WHERE teacher_id = in_teacher_id 
              AND class_code = in_class_code 
              AND subject_code = in_subject_code
        ) THEN
            -- Update existing record
            UPDATE teacher_classes 
            SET 
                subject = in_subject,
                class_name = in_class_name
            WHERE 
                teacher_id = in_teacher_id 
                AND class_code = in_class_code 
                AND subject_code = in_subject_code;
                
            SELECT 'UPDATED' as status, teacher_id, class_code, subject_code FROM teacher_classes 
            WHERE teacher_id = in_teacher_id AND class_code = in_class_code AND subject_code = in_subject_code;
        ELSE
            -- Insert new record
            INSERT INTO teacher_classes (
                teacher_id, 
                class_code, 
                class_name, 
                subject_code, 
                subject,
                school_id
            ) VALUES (
                in_teacher_id, 
                in_class_code, 
                in_class_name, 
                in_subject_code, 
                in_subject,
                (SELECT school_id FROM teachers WHERE id = in_teacher_id LIMIT 1)
            );
            
            SELECT 'INSERTED' as status, in_teacher_id as teacher_id, in_class_code as class_code, in_subject_code as subject_code;
        END IF;
        
        COMMIT;
        
    ELSEIF query_type = 'select' THEN
        SELECT * FROM teacher_classes WHERE teacher_id = in_teacher_id;
        
    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teacher_classes;
        
    ELSEIF query_type = 'update' THEN
        -- For update, we need a way to identify the record
        -- Since your table doesn't have an auto-increment id, we'll update by teacher_id, class_code, and subject_code
        UPDATE teacher_classes 
        SET 
            subject = COALESCE(in_subject, subject),
            class_name = COALESCE(in_class_name, class_name),
            subject_code = COALESCE(in_subject_code, subject_code)
        WHERE teacher_id = in_teacher_id 
          AND class_code = in_class_code 
          AND subject_code = in_subject_code;
        
        SELECT 'UPDATED' as status, teacher_id, class_code, subject_code FROM teacher_classes 
        WHERE teacher_id = in_teacher_id AND class_code = in_class_code AND subject_code = in_subject_code;
    END IF;
END $$

DROP PROCEDURE IF EXISTS teacher_dashboard_summary $$
CREATE PROCEDURE `teacher_dashboard_summary`(IN `p_query_type` VARCHAR(20), IN `p_teacher_id` INT, IN `p_branch_id` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `p_academic_year` VARCHAR(9), IN `p_term` VARCHAR(50))
BEGIN
    /* SUMMARY BLOCK  – high-level cards */
    IF p_query_type = 'summary' THEN
        SELECT 
        -- Classes where teacher is subject teacher
        (SELECT COUNT(*) 
         FROM teacher_classes tc 
         WHERE tc.teacher_id = p_teacher_id AND tc.school_id = p_school_id) AS subjects_count,

        (SELECT COUNT(DISTINCT tc.class_code)
         FROM teacher_classes tc 
         WHERE tc.teacher_id = p_teacher_id AND tc.school_id = p_school_id) AS class_count,

        -- Classes where teacher is form master
        (SELECT COUNT(*)
         FROM class_role cr
         WHERE cr.teacher_id = p_teacher_id 
           AND cr.school_id = p_school_id 
           AND cr.role = 'Form Master') AS form_master_classes,

        -- Total lessons delivered this term
        (SELECT COUNT(*)
         FROM lessons ls
         WHERE ls.teacher_id = p_teacher_id
           AND ls.school_id = p_school_id
           AND ls.academic_year = p_academic_year
           AND ls.term = p_term) AS lessons_count,

        -- Total assignments set this term
        (SELECT COUNT(*)
         FROM assignments a
         WHERE a.teacher_id = p_teacher_id
           AND a.school_id = p_school_id
           AND a.academic_year = p_academic_year
           AND a.term = p_term) AS assignments_count,

        (SELECT SUM(CASE WHEN a.status = 'Draft' THEN 1 ELSE 0 END)
         FROM assignments a
         WHERE a.teacher_id = p_teacher_id
           AND a.school_id = p_school_id
           AND a.academic_year = p_academic_year
           AND a.term = p_term) AS open_assignments;
    END IF;

    /* DETAILED LESSON LIST */
    IF p_query_type = 'lessons' THEN
       SELECT l.*,s.subject,c.class_name FROM lessons l 
        JOIN subjects s ON s.subject_code = l.subject
        JOIN classes c ON c.class_code = l.class_code
        WHERE teacher_id = p_teacher_id
          AND l.branch_id = p_branch_id
          AND l.school_id = p_school_id
          AND l.academic_year = p_academic_year
          AND l.term = p_term
        ORDER BY lesson_date DESC LIMIT 5;
    END IF;

    /* DETAILED ASSIGNMENTS LIST */
    IF p_query_type = 'assignments' THEN
        SELECT 
    a.id,
    a.class_name,
    a.class_code,
    a.subject,
    a.title,
    a.assignment_date,
    a.submission_date,
    a.status,

    -- Submissions received
    COALESCE((
        SELECT COUNT(DISTINCT ar2.admission_no)
        FROM assignment_responses ar2
        WHERE ar2.assignment_id = a.id
    ), 0) AS submissions,

    -- Total students in class
    (
        SELECT COUNT(*)
        FROM students s
        WHERE s.current_class = a.class_code
          AND s.school_id = a.school_id
          AND s.branch_id = a.branch_id
    ) AS total_students

FROM assignments a

WHERE 
    a.teacher_id = p_teacher_id
    AND a.branch_id = p_branch_id
    AND a.school_id = p_school_id
    AND a.academic_year = p_academic_year
    AND a.term = p_term

ORDER BY a.assignment_date DESC LIMIT 4;

    END IF;
END $$

DROP PROCEDURE IF EXISTS time_table $$
CREATE PROCEDURE `time_table`(IN `in_id` INT(10), IN `query_type` VARCHAR(50), IN `in_class_name` VARCHAR(100), IN `in_start_time` VARCHAR(100), IN `in_end_time` VARCHAR(100), IN `in_subject_name` VARCHAR(100))
BEGIN
IF query_type = "create" THEN 
INSERT INTO `time_table` (id, class_name, start_time, end_time, subject_name)
VALUES (in_id, in_class_name, in_start_time, in_end_time, in_subject_name);

ELSEIF query_type='select' THEN
SELECT * FROM `time_table`;

END IF;
END $$

DROP PROCEDURE IF EXISTS trainees_crud $$
CREATE PROCEDURE `trainees_crud`(IN `query_type` VARCHAR(10), IN `p_id` INT, IN `p_firstname` VARCHAR(255), IN `p_lastname` VARCHAR(255), IN `p_phone` VARCHAR(20), IN `p_email` VARCHAR(255), IN `p_state` VARCHAR(255), IN `p_lga` VARCHAR(255), IN `p_address` TEXT, IN `p_department` VARCHAR(255), IN `p_program_type` VARCHAR(100), IN `p_dob` DATE, IN `p_gender` ENUM('Male','Female','Other'), IN `p_payment_status` ENUM('Paid','Unpaid','Pending'))
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
END $$

DROP PROCEDURE IF EXISTS UnlockSpecificWeek $$
CREATE PROCEDURE `UnlockSpecificWeek`(IN `p_class_code` VARCHAR(20), IN `p_subject_code` VARCHAR(20), IN `p_week_number` INT, IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'))
BEGIN
    UPDATE weekly_scores ws
    INNER JOIN ca_setup ca ON ws.ca_setup_id = ca.id
    SET ws.is_locked = FALSE 
    WHERE ws.class_code = p_class_code 
      AND ws.subject_code = p_subject_code 
      AND ca.week_number = p_week_number
      AND ws.assessment_type = p_ca_type;
END $$

DROP PROCEDURE IF EXISTS UpdateAdmissionNumbers $$
CREATE PROCEDURE `UpdateAdmissionNumbers`()
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
END $$

DROP PROCEDURE IF EXISTS UpdateAttendanceSummary $$
CREATE PROCEDURE `UpdateAttendanceSummary`(IN `p_class_code` VARCHAR(20), IN `p_year` INT, IN `p_month` INT)
BEGIN
  DECLARE v_month_start DATE;
  SET v_month_start = STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d');

  INSERT INTO attendance_summary (
    admission_no, class_code, month, total_days, present_days, absent_days, 
    late_days, excused_days, dismissed_days
  )
  SELECT 
    s.admission_no,
    p_class_code,
    v_month_start,
    COUNT(*) AS total_days,
    SUM(CASE WHEN ar.status = 'P' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'A' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'L' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'E' THEN 1 ELSE 0 END),
    SUM(CASE WHEN ar.status = 'D' THEN 1 ELSE 0 END)
  FROM students s
  LEFT JOIN attendance_records ar 
    ON s.admission_no = ar.admission_no 
    AND ar.class_code = p_class_code
    AND YEAR(ar.attendance_date) = p_year 
    AND MONTH(ar.attendance_date) = p_month
  WHERE s.current_class = p_class_code AND s.status = 'active'
  GROUP BY s.admission_no

  ON DUPLICATE KEY UPDATE
    total_days = VALUES(total_days),
    present_days = VALUES(present_days),
    absent_days = VALUES(absent_days),
    late_days = VALUES(late_days),
    excused_days = VALUES(excused_days),
    dismissed_days = VALUES(dismissed_days);
END $$

DROP PROCEDURE IF EXISTS UpdateScoreStatus $$
CREATE PROCEDURE `UpdateScoreStatus`(
    IN `query_type` VARCHAR(20),        -- 'SubjectTeacher', 'FormMaster', or 'Admin'
    IN `p_subject_code` VARCHAR(20),    -- For Subject Teacher (nullable)
    IN `p_class_code` VARCHAR(20),      -- For Form Master (nullable)
    IN `p_academic_year` VARCHAR(10),
    IN `p_term` VARCHAR(20),
    IN `p_new_status` VARCHAR(20)       -- Optional override status, especially for Admin
)
BEGIN
    DECLARE v_updated_count INT DEFAULT 0;
    DECLARE v_target_status VARCHAR(20);

    START TRANSACTION;

    -- 🧩 Determine the target status dynamically
    IF query_type = 'SubjectTeacher' THEN
        SET v_target_status = 'Submitted';
    ELSEIF query_type = 'FormMaster' THEN
        SET v_target_status = 'Approved';
    ELSEIF query_type = 'Admin' THEN
        -- Admin can specify any status (fallback to Released if none given)
        SET v_target_status = COALESCE(p_new_status, 'Released');
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid query_type. Must be SubjectTeacher, FormMaster, or Admin';
    END IF;


    -- 👩‍🏫 1️⃣ Subject Teacher → Submitted
    IF query_type = 'SubjectTeacher' THEN
        UPDATE weekly_scores
        SET status = v_target_status,
            is_locked = 0
        WHERE subject_code = p_subject_code
          AND academic_year = p_academic_year
          AND term = p_term
          AND status = 'Draft';

        SELECT ROW_COUNT() INTO v_updated_count;


    -- 👨‍🏫 2️⃣ Form Master → Approved (lock)
    ELSEIF query_type = 'FormMaster' THEN
        UPDATE weekly_scores
        SET status = v_target_status,
            is_locked = 1
        WHERE class_code = p_class_code
          AND academic_year = p_academic_year
          AND term = p_term
          AND status = 'Submitted';

        SELECT ROW_COUNT() INTO v_updated_count;


    -- 🧑‍💼 3️⃣ Admin → Any status (flexible override)
    ELSEIF query_type = 'Admin' THEN
        UPDATE weekly_scores
        SET status = v_target_status,
            is_locked = CASE
                WHEN v_target_status IN ('Approved', 'Released') THEN 1
                ELSE is_locked
            END
        WHERE academic_year = p_academic_year
          AND term = p_term;

        SELECT ROW_COUNT() INTO v_updated_count;
    END IF;

    COMMIT;

    SELECT CONCAT(v_updated_count, ' record(s) updated to ', v_target_status, ' by ', query_type) AS message;
END $$

DROP PROCEDURE IF EXISTS UpdateWeekAccessControl $$
CREATE PROCEDURE `UpdateWeekAccessControl`(IN `p_class_code` VARCHAR(20), IN `p_subject_code` VARCHAR(20), IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'), IN `p_current_week` INT, IN `p_unlocked_weeks` JSON, IN `p_final_results` BOOLEAN, IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50))
BEGIN
    INSERT INTO week_access_control (
        class_code,
        subject_code,
        ca_type,
        current_week_number,
        unlocked_previous_weeks,
        final_results_generated,
        academic_year,
        term
    ) VALUES (
        p_class_code,
        p_subject_code,
        p_ca_type,
        p_current_week,
        p_unlocked_weeks,
        p_final_results,
        p_academic_year,
        p_term
    )
    ON DUPLICATE KEY UPDATE
        current_week_number = VALUES(current_week_number),
        unlocked_previous_weeks = VALUES(unlocked_previous_weeks),
        final_results_generated = VALUES(final_results_generated),
        updated_at = CURRENT_TIMESTAMP;
END $$

DROP PROCEDURE IF EXISTS update_parent $$
CREATE PROCEDURE `update_parent`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(100), IN `in_name` VARCHAR(100), IN `in_phone` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_occupation` VARCHAR(100), IN `in_school_id` VARCHAR(50), IN `in_user_id` INT, IN `in_role` VARCHAR(20), IN `in_nationality` VARCHAR(50), IN `in_address` VARCHAR(200), IN `in_state` VARCHAR(50), IN `in_lga` VARCHAR(50), IN `in_passport_url` VARCHAR(300))
BEGIN 
	IF query_type = "update_parent" THEN
		UPDATE `parents` 
		SET 
			fullname     = COALESCE(NULLIF(in_name, ''), fullname),
			phone        = COALESCE(NULLIF(in_phone, ''), phone),
			email        = COALESCE(NULLIF(in_email, ''), email),
			occupation   = COALESCE(NULLIF(in_occupation, ''), occupation),
			school_id    = COALESCE(NULLIF(in_school_id, ''), school_id),
			user_id      = IF(in_user_id IS NULL OR in_user_id = 0, user_id, in_user_id),
			role         = COALESCE(NULLIF(in_role, ''), role),
			nationality  = COALESCE(NULLIF(in_nationality, ''), nationality),
			address      = COALESCE(NULLIF(in_address, ''), address),
			state        = COALESCE(NULLIF(in_state, ''), state),
			l_g_a        = COALESCE(NULLIF(in_lga, ''), l_g_a),
			passport_url = COALESCE(NULLIF(in_passport_url, ''), passport_url)
		WHERE parent_id = in_id;
	END IF;
END $$

DROP PROCEDURE IF EXISTS update_student_scores $$
CREATE PROCEDURE `update_student_scores`(IN `p_applicant_id` VARCHAR(50), IN `p_mathematics` VARCHAR(5), IN `p_english` VARCHAR(5), IN `p_other_score` VARCHAR(5), IN `p_status` VARCHAR(20), IN `p_branch` VARCHAR(20), IN `p_school_id` VARCHAR(20), IN `query_type` VARCHAR(20))
BEGIN
    IF query_type = 'Pass' THEN
    CALL admission_no_generator(p_applicant_id, p_school_id, p_branch);
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
    
END $$

DROP PROCEDURE IF EXISTS update_transaction_status $$
CREATE PROCEDURE `update_transaction_status`(IN `p_transaction_id` INT(100), IN `p_payment_status` ENUM('Pending','Paid','Failed'), IN `p_document_status` ENUM('Printed','Saved'), IN `p_print_count` INT(2), IN `p_print_by` VARCHAR(100))
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
END $$

DROP PROCEDURE IF EXISTS verify_activation_otp $$
CREATE PROCEDURE `verify_activation_otp`(
  IN p_user_id INT(11),
  IN p_user_type VARCHAR(50),
  IN p_otp VARCHAR(6),
  IN p_school_id VARCHAR(50),
  IN p_branch_id VARCHAR(50),
  OUT p_result VARCHAR(50),
  OUT p_message VARCHAR(255)
)
BEGIN
  proc_block: BEGIN

    DECLARE v_stored_otp VARCHAR(6);
    DECLARE v_expires_at DATETIME;
    DECLARE v_attempts INT;
    DECLARE v_is_activated TINYINT(1);

    -- Get user's OTP data
    SELECT
      activation_otp,
      activation_otp_expires_at,
      activation_otp_attempts,
      is_activated
    INTO
      v_stored_otp,
      v_expires_at,
      v_attempts,
      v_is_activated
    FROM users
    WHERE id = p_user_id
    LIMIT 1;

    -- Already activated
    IF v_is_activated = 1 THEN
      SET p_result = 'ALREADY_ACTIVATED';
      SET p_message = 'Account is already activated';

      INSERT INTO account_activation_logs (
        user_id, user_type, action, otp_code, status, failure_reason, school_id, branch_id
      ) VALUES (
        p_user_id, p_user_type, 'otp_failed', p_otp, 'failed', 'Already activated', p_school_id, p_branch_id
      );

      LEAVE proc_block;
    END IF;

    -- No OTP found
    IF v_stored_otp IS NULL THEN
      SET p_result = 'NO_OTP';
      SET p_message = 'No OTP found. Please request a new OTP';

      INSERT INTO account_activation_logs (
        user_id, user_type, action, otp_code, status, failure_reason, school_id, branch_id
      ) VALUES (
        p_user_id, p_user_type, 'otp_failed', p_otp, 'failed', 'No OTP exists', p_school_id, p_branch_id
      );

      LEAVE proc_block;
    END IF;

    -- OTP expired
    IF v_expires_at < NOW() THEN
      SET p_result = 'EXPIRED';
      SET p_message = 'OTP has expired. Please request a new OTP';

      INSERT INTO account_activation_logs (
        user_id, user_type, action, otp_code, status, failure_reason, school_id, branch_id
      ) VALUES (
        p_user_id, p_user_type, 'otp_expired', p_otp, 'failed', 'OTP expired', p_school_id, p_branch_id
      );

      -- Clear expired OTP
      UPDATE users
      SET
        activation_otp = NULL,
        activation_otp_expires_at = NULL
      WHERE id = p_user_id;

      LEAVE proc_block;
    END IF;

    -- Too many attempts
    IF v_attempts >= 3 THEN
      SET p_result = 'TOO_MANY_ATTEMPTS';
      SET p_message = 'Too many failed attempts. Please request a new OTP';

      INSERT INTO account_activation_logs (
        user_id, user_type, action, otp_code, status, failure_reason, school_id, branch_id
      ) VALUES (
        p_user_id, p_user_type, 'otp_failed', p_otp, 'failed', 'Too many attempts', p_school_id, p_branch_id
      );

      UPDATE users
      SET
        activation_otp = NULL,
        activation_otp_expires_at = NULL,
        activation_otp_attempts = 0
      WHERE id = p_user_id;

      LEAVE proc_block;
    END IF;

    -- CORRECT OTP
    IF v_stored_otp = p_otp THEN
      UPDATE users
      SET
        is_activated = 1,
        activated_at = NOW(),
        activation_method = 'otp_sms',
        activation_otp = NULL,
        activation_otp_expires_at = NULL,
        activation_otp_attempts = 0,
        must_change_password = 1
      WHERE id = p_user_id;

      SET p_result = 'SUCCESS';
      SET p_message = 'OTP verified successfully. Please change your password';

      INSERT INTO account_activation_logs (
        user_id, user_type, action, otp_code, status, school_id, branch_id
      ) VALUES (
        p_user_id, p_user_type, 'otp_verified', p_otp, 'success', p_school_id, p_branch_id
      );

      INSERT INTO account_activation_logs (
        user_id, user_type, action, status, school_id, branch_id
      ) VALUES (
        p_user_id, p_user_type, 'account_activated', 'success', p_school_id, p_branch_id
      );

    ELSE
      -- WRONG OTP
      UPDATE users
      SET activation_otp_attempts = activation_otp_attempts + 1
      WHERE id = p_user_id;

      SET p_result = 'INVALID_OTP';
      SET p_message = CONCAT('Invalid OTP. ', (3 - v_attempts - 1), ' attempts remaining');

      INSERT INTO account_activation_logs (
        user_id, user_type, action, otp_code, status, failure_reason, school_id, branch_id
      ) VALUES (
        p_user_id, p_user_type, 'otp_failed', p_otp, 'failed', 'Invalid OTP', p_school_id, p_branch_id
      );
    END IF;

  END proc_block;
END $$

DROP PROCEDURE IF EXISTS verify_branch_accounting_setup $$
CREATE PROCEDURE `verify_branch_accounting_setup`(IN `p_school_id` VARCHAR(20), IN `p_branch_id` VARCHAR(20))
BEGIN
    SELECT 
        p_school_id as school_id,
        p_branch_id as branch_id,
        COUNT(*) as total_accounts,
        SUM(CASE WHEN account_type = 'ASSET' THEN 1 ELSE 0 END) as asset_accounts,
        SUM(CASE WHEN account_type = 'LIABILITY' THEN 1 ELSE 0 END) as liability_accounts,
        SUM(CASE WHEN account_type = 'EQUITY' THEN 1 ELSE 0 END) as equity_accounts,
        SUM(CASE WHEN account_type = 'REVENUE' THEN 1 ELSE 0 END) as revenue_accounts,
        SUM(CASE WHEN account_type = 'EXPENSE' THEN 1 ELSE 0 END) as expense_accounts,
        CASE 
            WHEN COUNT(*) = 0 THEN 'NO_ACCOUNTS'
            WHEN COUNT(*) < 10 THEN 'MINIMAL_SETUP'
            WHEN SUM(CASE WHEN account_type = 'ASSET' THEN 1 ELSE 0 END) = 0 THEN 'MISSING_ASSETS'
            WHEN SUM(CASE WHEN account_type = 'REVENUE' THEN 1 ELSE 0 END) = 0 THEN 'MISSING_REVENUE'
            WHEN SUM(CASE WHEN account_type = 'EXPENSE' THEN 1 ELSE 0 END) = 0 THEN 'MISSING_EXPENSES'
            ELSE 'COMPLETE'
        END as setup_status,
        CASE 
            WHEN COUNT(*) = 0 THEN 'Branch has no chart of accounts. Run initialize_branch_accounting.'
            WHEN COUNT(*) < 10 THEN 'Branch has minimal chart of accounts. Consider copying from main branch.'
            ELSE 'Branch accounting setup is complete.'
        END as recommendation
    FROM chart_of_accounts
    WHERE school_id = p_school_id 
    AND branch_id = p_branch_id
    AND is_active = 1;
END $$
DELIMITER ;

