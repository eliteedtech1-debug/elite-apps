-- 29/3/2025
ALTER TABLE `character_traits` ADD `id` INT NOT NULL AUTO_INCREMENT FIRST, ADD UNIQUE (`id`);
ALTER TABLE `character_scores` CHANGE `category` `category` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;

DELIMITER $$
DROP PROCEDURE `get_class_results`$$
CREATE PROCEDURE `get_class_results`(
    IN `query_type` VARCHAR(30), 
    IN `in_admission_no` VARCHAR(30), 
    IN `in_class_name` VARCHAR(30), 
    IN `in_academic_year` VARCHAR(30), 
    IN `in_term` VARCHAR(30), 
    IN `in_school_id` VARCHAR(30))
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

ALTER TABLE `students` CHANGE `school_location` `branch_id` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;
ALTER TABLE `school_locations` ADD `primary_phone` VARCHAR(20) NULL DEFAULT NULL AFTER `admin_id`, ADD `secondary_phone` VARCHAR(20) NULL DEFAULT NULL AFTER `primary_phone`, ADD `email` VARCHAR(60) NULL DEFAULT NULL AFTER `secondary_phone`, ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `email`, ADD `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `school_locations` ADD INDEX(`branch_id`);
ALTER TABLE `students` ADD `class_name` VARCHAR(50) NOT NULL AFTER `current_class`;


DELIMITER $$
DROP PROCEDURE IF EXISTS `students_queries`$$
CREATE  PROCEDURE `students_queries`(
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
IN `in_school_id` VARCHAR(20))
BEGIN
    DECLARE _adm_no VARCHAR(50);
    DECLARE _short_name VARCHAR(50);
    DECLARE new_student_id INT;  -- Declare new_student_id
    DECLARE in_class_name VARCHAR(50);

    IF p_school_location IS NOT NULL AND p_school_location != '' THEN
        SELECT short_name INTO _short_name FROM school_locations WHERE branch_id = p_school_location;
        SET _adm_no = CONCAT(_short_name, p_admission_no);
    END IF;

    IF query_type = 'CREATE' THEN
        SELECT class_name INTO in_class_name FROM classes WHERE class_code = p_current_class;
        INSERT INTO students (
            parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
            l_g_a, nationality, last_school_atterded, special_health_needs, blood_group, admission_no, 
            academic_year, status, section, mother_tongue, language_known, current_class, class_name, profile_picture, medical_condition, transfer_certificate,
            branch_id, school_id
        )
        VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
            p_l_g_a, p_nationality, p_last_school_atterded, p_special_health_needs, p_blood_group, p_admission_no, 
            p_academic_year, p_status, p_section, p_mother_tongue, p_language_known, p_current_class, in_class_name, p_profile_picture, p_medical_condition,
            p_transfer_certificate, p_school_location, in_school_id
        ); 
        
        SELECT admission_no 
        FROM students 
        WHERE school_id = in_school_id
        ORDER BY CAST(SUBSTRING_INDEX(admission_no, '/', -1) AS UNSIGNED) DESC 
        LIMIT 1;

    ELSEIF query_type = 'returning_student' THEN
        INSERT INTO students (
            parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
            l_g_a, nationality, last_school_atterded, special_health_needs, blood_group, admission_no,
            academic_year, status, section, mother_tongue, language_known, current_class,
            profile_picture, medical_condition, transfer_certificate, branch_id, school_id
        )
        VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
            p_l_g_a, p_nationality, p_last_school_atterded, p_special_health_needs, p_blood_group, '', 
            p_academic_year, 'Active', p_section, p_mother_tongue, p_language_known, p_current_class,
            p_profile_picture, p_medical_condition, p_transfer_certificate, p_school_location, in_school_id
        ); 

        SET new_student_id = LAST_INSERT_ID();  

        CALL admission_generator(new_student_id, in_school_id, p_school_location);

        SELECT admission_no 
        FROM students 
        WHERE id = new_student_id;

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
           AND (p_school_location IS NULL OR p_school_location = '' OR branch_id = p_school_location);

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
DROP PROCEDURE IF EXISTS `students_attendances`$$
CREATE PROCEDURE `students_attendances`(
    IN `query_type` VARCHAR(50), 
IN `_id` INT, 
IN `_teacher_id` VARCHAR(50), 
IN `_student_id` VARCHAR(50), 
IN `_teacher_name` VARCHAR(50), 
IN `_section` VARCHAR(50), 
IN `_class_name` VARCHAR(50), 
IN `_day` VARCHAR(50), 
IN `_status` VARCHAR(50), 
IN `_student_name` VARCHAR(50), 
IN `_admission_no` VARCHAR(50), 
IN `_term` VARCHAR(50), 
IN `_academic_year` VARCHAR(50), 
IN `_start_date` DATE, 
IN `_end_date` DATE, 
IN `_school_id` VARCHAR(50), 
IN `_branch_id` VARCHAR(20))
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
            AND branch_id = _branch_id
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
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `teachers`$$
CREATE PROCEDURE `teachers`(
    IN `query_type` VARCHAR(100), 
IN `p_id` INT(10), 
IN `p_name` VARCHAR(255), 
IN `p_sex` VARCHAR(10), 
IN `p_age` INT, 
IN `p_address` TEXT, 
IN `p_date_of_birth` DATE, 
IN `p_marital_status` VARCHAR(50), 
IN `p_state_of_origin` VARCHAR(100), 
IN `p_mobile_no` VARCHAR(20), 
IN `p_email` VARCHAR(100), 
IN `p_qualification` VARCHAR(255), 
IN `p_working_experience` TEXT, 
IN `p_religion` VARCHAR(50), 
IN `p_last_place_of_work` VARCHAR(255), 
IN `p_do_you_have` TEXT, 
IN `p_when_do` DATE, 
IN `p_account_name` VARCHAR(255), 
IN `p_account_number` VARCHAR(50), 
IN `p_bank` VARCHAR(100), 
IN `p_school_location` VARCHAR(100), 
IN `p_school_id` VARCHAR(20))
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
DROP PROCEDURE IF EXISTS `parents`$$
CREATE PROCEDURE `parents`(
    IN `query_type` VARCHAR(100), 
IN `in_id` VARCHAR(20), 
IN `in_name` VARCHAR(100), 
IN `in_phone_no` VARCHAR(14), 
IN `in_email` VARCHAR(100), 
IN `in_relationship` VARCHAR(100), 
IN `in_is_guardian` VARCHAR(3), 
IN `in_occupation` VARCHAR(100), 
IN `in_children_admin_no` VARCHAR(50), 
IN `in_school_id` VARCHAR(20))
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

            INSERT INTO users (name, email, username, role, password, school_id)
            VALUES (
                in_name, 
                in_email, 
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
DROP PROCEDURE IF EXISTS `school_admission_form`$$
CREATE PROCEDURE `school_admission_form`(
    IN `p_query_type` VARCHAR(50), 
IN `p_upload` VARCHAR(255), 
IN `p_applicant_id` VARCHAR(50), 
IN `p_guardian_id` VARCHAR(50), 
IN `p_parent_id` VARCHAR(50), 
IN `p_type_of_application` VARCHAR(50), 
IN `p_name_of_applicant` VARCHAR(255), 
IN `p_home_address` TEXT, 
IN `p_date_of_birth` DATE, 
IN `p_guardian_name` VARCHAR(255), 
IN `p_guardian_phone_no` VARCHAR(20), 
IN `p_guardian_email` VARCHAR(100), 
IN `p_guardian_address` TEXT, 
IN `p_guardian_relationship` VARCHAR(50), 
IN `p_parent_fullname` VARCHAR(255), 
IN `p_parent_phone_no` VARCHAR(20), 
IN `p_parent_email` VARCHAR(100), 
IN `p_parent_address` TEXT, 
IN `p_parent_occupation` VARCHAR(100), 
IN `p_state_of_origin` VARCHAR(100), 
IN `p_l_g_a` VARCHAR(100), 
IN `p_last_school_attended` VARCHAR(255), 
IN `p_mathematics` VARCHAR(5), 
IN `p_english` VARCHAR(5), 
IN `p_special_health_needs` TEXT, 
IN `p_sex` VARCHAR(10), 
IN `p_admission_no` VARCHAR(50), 
IN `p_school` VARCHAR(100), 
IN `p_status` VARCHAR(20), 
IN `p_academic_year` VARCHAR(20), 
IN `p_school_id` VARCHAR(20), 
IN `p_branch_id` VARCHAR(20), 
IN `p_short_name` VARCHAR(20), 
IN `p_last_class` VARCHAR(100), 
IN `p_others` VARCHAR(50), 
IN `in_id` INT(11), 
IN `p_other_score` INT(11))
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
        UPDATE applicants SET
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
DROP PROCEDURE IF EXISTS `guardians`$$
CREATE PROCEDURE `parents`(
    IN `query_type` VARCHAR(100), 
IN `in_id` VARCHAR(20), 
IN `in_name` VARCHAR(100), 
IN `in_phone_no` VARCHAR(14), 
IN `in_email` VARCHAR(100), 
IN `in_relationship` VARCHAR(100), 
IN `in_is_guardian` VARCHAR(3), 
IN `in_occupation` VARCHAR(100), 
IN `in_children_admin_no` VARCHAR(50), 
IN `in_school_id` VARCHAR(20))
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
DROP PROCEDURE IF EXISTS `students_attendances`$$
CREATE PROCEDURE `students_attendances`(
    IN `query_type` VARCHAR(50), 
    IN `_id` INT, 
    IN `_teacher_id` VARCHAR(50), 
    IN `_student_id` VARCHAR(50), 
    IN `_teacher_name` VARCHAR(50), 
    IN `_section` VARCHAR(50), 
    IN `_class_name` VARCHAR(50), 
    IN `_day` VARCHAR(50), 
    IN `_status` VARCHAR(50), 
    IN `_student_name` VARCHAR(50), 
    IN `_admission_no` VARCHAR(50), 
    IN `_term` VARCHAR(50), 
    IN `_academic_year` VARCHAR(50), 
    IN `_start_date` DATE, 
    IN `_end_date` DATE, 
    IN `_notes` VARCHAR(200), 
    IN `_school_id` VARCHAR(50), 
    IN `_branch_id` VARCHAR(20))
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
END $$

DELIMITER ;

CREATE TABLE `class_attendances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `notes` varchar(200) DEFAULT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `branch_id` int(20) DEFAULT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

RENAME TABLE `elite_db`.`secondary_school_entrance_form` TO `elite_db`.`school_applicants`;
ALTER TABLE `class_attendances` ADD `branch_id` INT(20) NULL DEFAULT NULL AFTER `school_id`;
ALTER TABLE `class_attendances` CHANGE `school_id` `school_id` VARCHAR(20) NULL DEFAULT NULL;
ALTER TABLE `teachers` CHANGE `school_location` `branch_id` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;
ALTER TABLE `class_attendances` DROP `student_id`;


-- 3/4/2025

DELIMITER $$
DROP PROCEDURE IF EXISTS `school_revenues`$$
CREATE  PROCEDURE `school_revenues`(
    IN `query_type` VARCHAR(100), 
    IN `in_id` VARCHAR(11), 
    IN `in_description` VARCHAR(100), 
    IN `in_amount` DECIMAL(10,2), 
    IN `in_term` ENUM('First term','Second term','Third term','Each Term'), 
    IN `in_section` VARCHAR(100), 
    IN `in_class_name` VARCHAR(100), 
    IN `in_revenue_type` ENUM('Fees','Charges','Fines','Sales','Earnings'), 
    IN `in_is_optional` ENUM('Yes','No'), 
    IN `in_status` ENUM('Active','Inactive'), 
    IN `in_account_type` VARCHAR(100), 
    IN `in_school_id` VARCHAR(20),
    IN `in_branch_id` VARCHAR(20))
BEGIN
    -- Handle 'create' operation
    IF query_type = "create" THEN
        INSERT INTO `school_revenues`(
            `description`, `amount`, `term`, `section`, `class_name`, 
            `revenue_type`, `account_type`, `is_optional`, `status`, `school_location`, `school_id`
        ) 
        VALUES (
            in_description, in_amount, in_term, in_section, in_class_name, 
            in_revenue_type, in_account_type, in_is_optional, in_status, in_school_id, in_branch_id
        );

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
        SELECT * FROM school_revenues WHEN school_id = in_school_id 
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
    ELSEIF query_type = 'select-revenues' THEN
        SELECT * FROM school_revenues 
        WHERE  school_id = in_school_id
            AND class_name IN ('All Classes', in_class_name)
            AND (section = in_section OR in_section IS NULL)
            AND term IN (in_term, 'Each Term')
            AND (in_branch_id IS NULL OR in_branch_id = '' OR branch_id = in_branch_id);
    END IF;
END$$
DELIMITER ;


UPDATE students s
SET class_name = c.class_name
FROM classes c
WHERE s.current_class = c.class_code;

DROP  TABLE IF EXISTS `payment_entries`;
CREATE TABLE `payment_entries` (
  `admission_no` varchar(100) NOT NULL,
  `class_code` varchar(100) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
    `term` varchar(20) DEFAULT NULL,
  `cr` decimal(10,2) DEFAULT 0.00,
  `dr` decimal(10,2) DEFAULT 0.00,
  `description` varchar(255) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`class_code`, `admission_no`, `school_id`),

  KEY `admission_no` (`admission_no`),
  KEY `school_id` (`school_id`),
  KEY `class_code` (`class_code`),

  CONSTRAINT `payment_entries_ibfk_1` FOREIGN KEY (`class_code`) 
      REFERENCES `classes` (`class_code`) ON DELETE CASCADE ON UPDATE CASCADE,
  
  CONSTRAINT `payment_entries_ibfk_2` FOREIGN KEY (`admission_no`) 
      REFERENCES `students` (`admission_no`) ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `payment_entries_ibfk_3` FOREIGN KEY (`school_id`) 
      REFERENCES `school_setup` (`school_id`) ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 27/4/2025

ALTER TABLE `assignments` ADD `class_code` VARCHAR(20) NOT NULL AFTER `class_name`;
ALTER TABLE `assignments` ADD `academic_year` VARCHAR(9) NOT NULL AFTER `branch_id`, ADD `term` VARCHAR(50) NOT NULL AFTER `academic_year`;

ALTER TABLE `lessons` ADD `academic_year` VARCHAR(9) NOT NULL AFTER `branch_id`, ADD `term` VARCHAR(50) NOT NULL AFTER `academic_year`;

ALTER TABLE `lesson_comments` CHANGE `user_id` `user_id` VARCHAR(15) NOT NULL;


DELIMITER $$
DROP  PROCEDURE IF EXISTS `lesson_comments`$$
CREATE PROCEDURE `lesson_comments`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_lesson_id` INT(10), IN `in_user_id` VARCHAR(15), IN `in_user_name` VARCHAR(30), IN `in_user_role` VARCHAR(10), IN `in_parent_id` INT(11), IN `in_comment` VARCHAR(500))
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
DROP PROCEDURE IF EXISTS `assignments`$$
CREATE  PROCEDURE `assignments`(
    IN `in_query_type` VARCHAR(50), 
IN `in_id` INT, 
IN `in_teacher_id` INT, 
IN `in_class_name` VARCHAR(255), 
IN `in_subject` VARCHAR(255), 
IN `in_assignment_date` DATE, 
IN `in_submission_date` DATE, 
IN `in_attachment` VARCHAR(255), 
IN `in_content` TEXT, 
IN `in_teacher_name` VARCHAR(100), 
IN `in_title` VARCHAR(100), 
IN `in_marks` VARCHAR(100), 
IN `in_school_id` VARCHAR(20), 
IN `in_branch_id` VARCHAR(20), 
IN `in_class_code` VARCHAR(20), 
IN `in_academic_year` VARCHAR(20), 
IN `in_term` VARCHAR(20), 
IN `in_start_date` DATE, 
IN `in_end_date` DATE)
BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO assignments (
            teacher_id, class_name, subject, assignment_date, submission_date, attachment,
            content, teacher_name, title, marks, school_id, branch_id, class_code,academic_year, term)
        VALUES (
            in_teacher_id, in_class_name, in_subject, in_assignment_date, in_submission_date, in_attachment,
            in_content, in_teacher_name, in_title, in_marks, in_school_id, in_branch_id, in_class_code, in_academic_year, in_term);
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
            marks = COALESCE(in_marks, marks),
            academic_year = COALESCE(in_academic_year, academic_year),
            term = COALESCE(in_term, term)
        WHERE id = in_id;

    ELSEIF in_query_type = 'DELETE' THEN
        DELETE FROM assignments WHERE id = in_id;

    ELSEIF in_query_type = 'select' THEN
        IF in_id IS NOT NULL AND in_id !='' THEN
            SELECT * FROM assignments WHERE id = in_id;
        ELSEIF in_teacher_id IS NOT NULL AND in_teacher_id!='' THEN
            SELECT * FROM assignments 
            WHERE teacher_id=in_teacher_id AND academic_year = in_academic_year AND term = in_term;
        ELSE
            SELECT * FROM assignments 
            WHERE class_code=in_class_code AND academic_year = in_academic_year AND term = in_term 
            AND school_id = in_school_id AND branch_id = in_branch_id;
        END IF;
    ELSEIF in_query_type = 'select-questions' THEN
        SELECT * FROM assignment_questions
            WHERE assignment_id=in_id;
    END IF;
END$$
DELIMITER ;      

DELIMITER $$
DROP  PROCEDURE IF EXISTS `lessons`$$
CREATE  PROCEDURE `lessons`(IN `in_query_type` VARCHAR(50), IN `in_assignment_id` INT, IN `in_class_name` VARCHAR(255), IN `in_subject` VARCHAR(255), IN `in_lesson_date` DATE, IN `in_attachment` VARCHAR(255), IN `in_content` MEDIUMTEXT, IN `in_teacher` VARCHAR(100), IN `in_teacher_id` VARCHAR(15), IN `in_title` VARCHAR(100), IN `in_school_id` VARCHAR(20), IN `in_branch_id` VARCHAR(20), IN `in_class_code` VARCHAR(20))
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
    ELSEIF in_query_type = 'select teacher lessons' THEN
    	 SELECT * FROM lessons WHERE teacher_id = in_teacher_id;
    ELSEIF in_query_type = 'select' THEN
        IF in_assignment_id IS NOT NULL THEN
            SELECT * FROM lessons WHERE id = in_assignment_id;
        ELSE
            SELECT * FROM lessons WHERE school_id = in_school_id and branch_id = in_branch_id and class_code = in_class_code;
        END IF;
    END IF;
END$$
DELIMITER ;

-- 29/4/2025

CREATE TABLE `exam_ca_setup` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  
  `ca1` TINYINT(2) NOT NULL DEFAULT 0,
  `ca1_label` VARCHAR(50) DEFAULT 'CA1',

  `ca2` TINYINT(2) NOT NULL DEFAULT 0,
  `ca2_label` VARCHAR(50) DEFAULT 'CA2',

  `ca3` TINYINT(2) NOT NULL DEFAULT 0,
  `ca3_label` VARCHAR(50) DEFAULT 'CA3',

  `ca4` TINYINT(2) NOT NULL DEFAULT 0,
  `ca4_label` VARCHAR(50) DEFAULT 'CA4',

  `exam` INT(3) NOT NULL DEFAULT 0,
  `exam_label` VARCHAR(50) DEFAULT 'Exam',

  `section` VARCHAR(30) DEFAULT NULL,
  `school_id` VARCHAR(15) NOT NULL,
  
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

CREATE PROCEDURE insert_exam_ca_setup (
  IN in_query_type VARCHAR(10),

  IN in_ca1 TINYINT,
  IN in_ca2 TINYINT,
  IN in_ca3 TINYINT,
  IN in_ca4 TINYINT,
  IN in_exam INT,

  IN in_ca1_label VARCHAR(50),
  IN in_ca2_label VARCHAR(50),
  IN in_ca3_label VARCHAR(50),
  IN in_ca4_label VARCHAR(50),
  IN in_exam_label VARCHAR(50),

  IN in_section VARCHAR(30),
  IN in_school_id VARCHAR(15)
)
BEGIN
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
    SELECT * FROM exam_ca_setup WHERE school_id = in_school_id;

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
END //

DELIMITER ;


DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `grade_setup`(IN `query_type` VARCHAR(100), IN `in_id` INT(10), IN `in_section` VARCHAR(50), IN `in_grade` VARCHAR(50), IN `in_remark` VARCHAR(50), IN `in_min_score` INT(3), IN `in_max_score` INT(3), IN `in_status` VARCHAR(30), IN `in_school_id` VARCHAR(10))
BEGIN 
    IF query_type="create" THEN 
        INSERT INTO `grade_setup` (section,grade, remark,min_score,max_score, school_id) 
        VALUES (in_section,in_grade, in_remark, in_min_score, in_max_score, in_school_id); 
    ELSEIF query_type="select" THEN 
        SELECT * FROM `grade_setup` WHERE id=in_id; 
    ELSEIF query_type="select-all" THEN 
      SELECT * FROM `grade_setup` WHERE section =in_section AND school_id =in_school_id; 
        
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

ALTER TABLE `student_grading` CHANGE `ca1Score` `ca1Score` TINYINT(2) NOT NULL DEFAULT '0', CHANGE `ca2Score` `ca2Score` TINYINT(2) NOT NULL DEFAULT '0';
ALTER TABLE `student_grading` ADD `ca3Score` TINYINT(2) NOT NULL DEFAULT '0' AFTER `ca2Score`, ADD `ca4Score` TINYINT(2) NOT NULL DEFAULT '0' AFTER `ca3Score`;

DROP PROCEDURE `student_grading`;

DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `student_grading`(
    IN `query_type` VARCHAR(50),
    IN `in_id` INT,
    IN `in_calendar_id` VARCHAR(20),
    IN `in_admission_no` VARCHAR(100),
    IN `in_student_name` VARCHAR(100),
    IN `in_subject` VARCHAR(100),
    IN `in_class_name` VARCHAR(100),
    IN `in_academic_year` VARCHAR(20),
    IN `in_term` VARCHAR(20),
    IN `in_ca1Score` DOUBLE(5,2),
    IN `in_ca2Score` DOUBLE(5,2),
    IN `in_ca3Score` DOUBLE(5,2),
    IN `in_ca4Score` DOUBLE(5,2),
    IN `in_examScore` DOUBLE(5,2),
    IN `in_mark_by` VARCHAR(100),
    IN `in_status` VARCHAR(50),
    IN `in_branch_id` VARCHAR(50),
    IN `in_school_id` VARCHAR(20)
)
BEGIN
    DECLARE `in_total` DOUBLE(5,2);
    DECLARE `in_grade` VARCHAR(5);
    DECLARE `in_remark` VARCHAR(100);
    DECLARE `in_subject_code` VARCHAR(50);

    -- CREATE operation
    IF query_type = 'create' THEN
        SELECT subject_code INTO in_subject_code FROM subjects WHERE subject = in_subject AND class_code = in_class_name;

        -- Calculate total score
        SET in_total = in_ca1Score + in_ca2Score + in_ca3Score + in_ca4Score + in_examScore;

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
              AND school_id = in_school_id
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
                ca3Score = in_ca3Score,
                ca4Score = in_ca4Score,
                examScore = in_examScore,
                total_score = in_total,
                grade = in_grade,
                remark = in_remark,
                mark_by = in_mark_by,
                status = in_status
            WHERE admission_no = in_admission_no
              AND subject = in_subject
              AND school_id = in_school_id;
        ELSE
            -- Insert new record
            INSERT INTO student_grading (
                calendar_id,
                admission_no,
                student_name,
                subject,
                subject_code,
                class_name,
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
                in_calendar_id,
                in_admission_no,
                in_student_name,
                in_subject,
                in_subject_code,
                in_class_name,
                in_academic_year,
                in_term,
                in_ca1Score,
                in_ca2Score,
                in_ca3Score,
                in_ca4Score,
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

    -- FETCH DRAFT MARKS
    ELSEIF query_type = 'students_marks' THEN
        SELECT *
        FROM student_grading
        WHERE school_id = in_school_id
          AND class_name = in_class_name
          AND term = in_term
          AND status = 'Draft'
          AND subject = in_subject
          AND academic_year = in_academic_year;

    -- DELETE operation
    ELSEIF query_type = 'delete' THEN
        DELETE FROM student_grading
        WHERE admission_no = in_admission_no
          AND subject = in_subject
          AND school_id = in_school_id;
    END IF;
END$$

DELIMITER ;


-- 5/5/2025

ALTER TABLE `parents` ADD `address` VARCHAR(200) NULL DEFAULT NULL AFTER `role`, ADD `state` VARCHAR(50) NULL DEFAULT NULL AFTER `address`, ADD `l_g_a` VARCHAR(50) NULL DEFAULT NULL AFTER `state`;
ALTER TABLE `parents` ADD `nationality` VARCHAR(50) NULL DEFAULT NULL AFTER `role`;
ALTER TABLE `parents` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `l_g_a`, ADD `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;
ALTER TABLE `teachers` CHANGE `email_address` `email` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
DELIMITER $$

CREATE PROCEDURE `update_parent`(
	IN `query_type` VARCHAR(100), 
	IN `in_id` VARCHAR(100), 
	IN `in_name` VARCHAR(100), 
	IN `in_phone` VARCHAR(14), 
	IN `in_email` VARCHAR(100), 
	IN `in_occupation` VARCHAR(100), 
	IN `in_school_id` VARCHAR(50), 
	IN `in_user_id` INT,
	IN `in_role` VARCHAR(20),
	IN `in_nationality` VARCHAR(50),
	IN `in_address` VARCHAR(200),
	IN `in_state` VARCHAR(50),
	IN `in_lga` VARCHAR(50)
)
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
			l_g_a        = COALESCE(NULLIF(in_lga, ''), l_g_a)
		WHERE parent_id = in_id;
	END IF;
END$$

DELIMITER ;


ALTER TABLE `parents` ADD `passport_url` VARCHAR(300) NULL DEFAULT NULL AFTER `l_g_a`;
ALTER TABLE `parents` ADD `passport_url` VARCHAR(300) NULL DEFAULT NULL AFTER `l_g_a`;

DELIMITER $$
DROP PROCEDURE IF EXISTS `update_parent`$$
CREATE PROCEDURE `update_parent`(
	IN `query_type` VARCHAR(100), 
	IN `in_id` VARCHAR(100), 
	IN `in_name` VARCHAR(100), 
	IN `in_phone` VARCHAR(14), 
	IN `in_email` VARCHAR(100), 
	IN `in_occupation` VARCHAR(100), 
	IN `in_school_id` VARCHAR(50), 
	IN `in_user_id` INT,
	IN `in_role` VARCHAR(20),
	IN `in_nationality` VARCHAR(50),
	IN `in_address` VARCHAR(200),
	IN `in_state` VARCHAR(50),
	IN `in_lga` VARCHAR(50),
	IN `in_passport_url` VARCHAR(300)
)
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
END$$

DELIMITER ;

DROP TABLE IF EXISTS `notice_board`
CREATE TABLE `notice_board` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `status` VARCHAR(50),
  `due_date` DATE,
  `category` ENUM('Notice', 'Notification') NOT NULL,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


DELIMITER $$
DROP PROCEDURE IF EXISTS `manage_notice_board`$$
CREATE PROCEDURE `manage_notice_board`(
  IN query_type VARCHAR(20),
  IN in_id VARCHAR(50),
  IN in_title VARCHAR(255),
  IN in_description TEXT,
  IN in_status VARCHAR(50),
  IN in_due_date VARCHAR(50),
  IN in_category ENUM('Notice', 'Notification'),
  IN in_created_by VARCHAR(30),
  IN in_branch_id VARCHAR(50),
  IN in_school_id VARCHAR(50)
)
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
END$$


DELIMITER ;



-- 19-5-2025
ALTER TABLE `users` CHANGE `phone_no` `phone` VARCHAR(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL;
ALTER TABLE `payment_receipts` CHANGE `status` `status` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL;

ALTER TABLE `payment_entries`
ADD COLUMN `item_id` INT(11) NOT NULL AUTO_INCREMENT,
ADD UNIQUE (`item_id`);


ALTER TABLE `payment_entries` ADD `payment_mode` VARCHAR(30) NULL DEFAULT NULL AFTER `description`;

ALTER TABLE `assignment_responses` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `score`, ADD `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;
ALTER TABLE `assignment_responses` ADD `remark` VARCHAR(200) NULL DEFAULT NULL AFTER `response`;

ALTER TABLE `assignment_questions` ADD `attachment_url` VARCHAR(300) NULL DEFAULT NULL AFTER `question_text`;
DELIMITER $$

DROP PROCEDURE IF EXISTS `assignment_questions`$$

CREATE PROCEDURE `assignment_questions`(
    IN query_type VARCHAR(30),
    IN in_id VARCHAR(10),
    IN in_assignment_id VARCHAR(10),
    IN in_question_type VARCHAR(30),
    IN in_question_text TEXT,
    IN in_attachment_url VARCHAR(300),
    IN in_options JSON,
    IN in_correct_answer VARCHAR(255),
    IN in_marks INT
)
BEGIN
    -- Validate input for insert or update
    IF query_type = 'insert' OR query_type = 'update' THEN

        IF in_question_type = 'Multiple Choice' THEN
            IF in_options IS NULL OR in_correct_answer IS NULL THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Options and correct answer must be provided for multiple-choice questions.';
            END IF;

        ELSEIF in_question_type = 'True/False' THEN
            IF in_correct_answer IS NULL THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Correct answer must be provided for true-false questions.';
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
                assignment_id = COALESCE(NULLIF(in_assignment_id, ''), assignment_id),
                question_type = COALESCE(NULLIF(in_question_type, ''), question_type),
                question_text = COALESCE(NULLIF(in_question_text, ''), question_text),
                attachment_url = COALESCE(NULLIF(in_attachment_url, ''), attachment_url),
                options = COALESCE(in_options, options),
                correct_answer = COALESCE(NULLIF(in_correct_answer, ''), correct_answer),
                marks = COALESCE(in_marks, marks)
            WHERE id = in_id;
        END IF;

    ELSE
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid query_type. Use "insert" or "update".';
    END IF;
END$$

DELIMITER ;


-- 28/5/2025
ALTER TABLE `user_roles` ADD `accessTo` TEXT NULL DEFAULT NULL AFTER `permissions`;
ALTER TABLE `user_roles` ADD `permissions` TEXT NULL DEFAULT NULL AFTER `role_id`;

ALTER TABLE `teachers` ADD `staff_type` VARCHAR(30) NULL DEFAULT NULL AFTER `user_type`;
ALTER TABLE `teachers` ADD `staff_role` VARCHAR(30) NULL DEFAULT NULL AFTER `staff_type`;

DELIMITER $$
DROP PROCEDURE IF EXISTS `teachers`$$
CREATE  PROCEDURE `teachers`(
    IN `query_type` VARCHAR(100), 
IN `p_id` INT(10), 
IN `p_name` VARCHAR(255), 
IN `p_sex` VARCHAR(10), 
IN `p_age` INT, 
IN `p_address` TEXT, 
IN `p_date_of_birth` DATE, 
IN `p_marital_status` VARCHAR(50), 
IN `p_state_of_origin` VARCHAR(100), 
IN `p_mobile_no` VARCHAR(20), 
IN `p_email` VARCHAR(100), 
IN `p_qualification` VARCHAR(255), 
IN `p_user_type` VARCHAR(50),
IN `p_staff_type` VARCHAR(255), 
IN `p_staff_role` VARCHAR(255), 
IN `p_working_experience` TEXT, 
IN `p_religion` VARCHAR(50), 
IN `p_last_place_of_work` VARCHAR(255), 
IN `p_do_you_have` TEXT, 
IN `p_when_do` DATE, 
IN `p_account_name` VARCHAR(255), 
IN `p_account_number` VARCHAR(50), 
IN `p_bank` VARCHAR(100), 
IN `p_passport_url` VARCHAR(200), 
IN `p_school_location` VARCHAR(100), 
IN `p_school_id` VARCHAR(20), 
IN `p_password` VARCHAR(100))
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
            staff_type,
            staff_role,
            working_experience,
            religion,
            last_place_of_work,
            do_you_have,
            when_do,
            account_name,
            account_number,
            bank,
            passport_url,
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
            p_staff_type,
            p_staff_role,
            p_working_experience,
            p_religion,
            p_last_place_of_work,
            p_do_you_have,
            p_when_do,
            p_account_name,
            p_account_number,
            p_bank,
            p_passport_url,
            p_school_location,
            p_school_id
        );
        
        SET _teacher_id = LAST_INSERT_ID();

        INSERT INTO users
        (name, email, phone, password, user_type, school_id)
        VALUES(p_name, p_email, p_mobile_no, p_password, p_user_type, p_school_id);
        
        SET _user_id = LAST_INSERT_ID();
        UPDATE teachers SET user_id = _user_id WHERE id = _teacher_id;
        
        
        SELECT _teacher_id AS teacher_id;
     ELSEIF query_type = 'select-class' THEN
     	
        SELECT * FROM teacher_classes WHERE teacher_id = p_id;
	ELSEIF query_type = 'select-roles' THEN
     SELECT * FROM class_role WHERE teacher_id = p_id;
    ELSEIF query_type = 'select' THEN
        SELECT * FROM teachers WHERE id = p_id;
    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teachers WHERE school_id = p_school_id
        AND (p_school_location IS NULL OR p_school_location = '' OR branch_id = p_school_location);
       -- AND  branch_id = p_school_location;
        ELSEIF query_type='select_teacher_name' THEN
    		SELECT DISTINCT name FROM teachers;
   ELSEIF query_type = 'update' THEN
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
        do_you_have = COALESCE(p_do_you_have, do_you_have),
        when_do = COALESCE(p_when_do, when_do),
        account_name = COALESCE(p_account_name, account_name),
        account_number = COALESCE(p_account_number, account_number),
        bank = COALESCE(p_bank, bank),
        passport_url = COALESCE(p_passport_url, passport_url),
        branch_id = COALESCE(p_school_location, branch_id)
    WHERE id = p_id;
    
    SELECT id AS teacher_id FROM teachers WHERE id = p_id;
END IF;

END$$
DELIMITER ;




DELIMITER $$
DROP PROCEDURE IF EXISTS managePrivilages$$
CREATE PROCEDURE managePrivilages(
  IN `query_type` VARCHAR(20),
  IN `in_id` VARCHAR(20), ,
  IN `in_user_id` INT,
  IN `in_user_type` VARCHAR(20),
IN `in_description` VARCHAR(100),
  IN `in_accessTo` TEXT,
  IN `in_permissions` TEXT,
  IN `in_school_id` VARCHAR(20)
) 
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

 ELSEIF  query_type = 'SELECT ROLE SETUP' THEN
   SELECT * FROM roles WHERE school_id = in_school_id;
END IF;
END $$

DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `teachers`(
    IN `query_type` VARCHAR(100), 
IN `p_id` VARCHAR(20),  
IN `p_name` VARCHAR(255), 
IN `p_sex` VARCHAR(10), 
IN `p_age` INT, 
IN `p_address` TEXT, 
IN `p_date_of_birth` DATE, 
IN `p_marital_status` VARCHAR(50), 
IN `p_state_of_origin` VARCHAR(100), 
IN `p_mobile_no` VARCHAR(20), 
IN `p_email` VARCHAR(100), 
IN `p_qualification` VARCHAR(255), 
IN `p_user_type` VARCHAR(50),
IN `p_staff_type` VARCHAR(255), 
IN `p_staff_role` VARCHAR(255), 
IN `p_working_experience` TEXT, 
IN `p_religion` VARCHAR(50), 
IN `p_last_place_of_work` VARCHAR(255), 
IN `p_do_you_have` TEXT, 
IN `p_when_do` DATE, 
IN `p_account_name` VARCHAR(255), 
IN `p_account_number` VARCHAR(50), 
IN `p_bank` VARCHAR(100), 
IN `p_passport_url` VARCHAR(200), 
IN `p_school_location` VARCHAR(100), 
IN `p_school_id` VARCHAR(20), 
IN `p_password` VARCHAR(100))
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
            staff_type,
            staff_role,
            working_experience,
            religion,
            last_place_of_work,
            do_you_have,
            when_do,
            account_name,
            account_number,
            bank,
            passport_url,
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
            p_staff_type,
            p_staff_role,
            p_working_experience,
            p_religion,
            p_last_place_of_work,
            p_do_you_have,
            p_when_do,
            p_account_name,
            p_account_number,
            p_bank,
            p_passport_url,
            p_school_location,
            p_school_id
        );
        
        SET _teacher_id = LAST_INSERT_ID();

        INSERT INTO users
        (name, email, phone, password, user_type, school_id)
        VALUES(p_name, p_email, p_mobile_no, p_password, p_user_type, p_school_id);
        
        SET _user_id = LAST_INSERT_ID();
        UPDATE teachers SET user_id = _user_id WHERE id = _teacher_id;
        
        
        SELECT _teacher_id AS teacher_id;
     ELSEIF query_type = 'select-class' THEN
     	
        SELECT * FROM teacher_classes WHERE teacher_id = p_id;
	ELSEIF query_type = 'select-roles' THEN
     SELECT * FROM class_role WHERE teacher_id = p_id;
    ELSEIF query_type = 'select' THEN
        SELECT * FROM teachers WHERE id = p_id;
    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teachers WHERE school_id = p_school_id
        AND (p_school_location IS NULL OR p_school_location = '' OR branch_id = p_school_location);
       -- AND  branch_id = p_school_location;
        ELSEIF query_type='select_teacher_name' THEN
    		SELECT DISTINCT name FROM teachers;
   ELSEIF query_type = 'update' THEN
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
        do_you_have = COALESCE(p_do_you_have, do_you_have),
        when_do = COALESCE(p_when_do, when_do),
        account_name = COALESCE(p_account_name, account_name),
        account_number = COALESCE(p_account_number, account_number),
        bank = COALESCE(p_bank, bank),
        passport_url = COALESCE(p_passport_url, passport_url),
        branch_id = COALESCE(p_school_location, branch_id)
    WHERE id = p_id;
    
    SELECT id AS teacher_id FROM teachers WHERE id = p_id;
END IF;

END$$
DELIMITER ;


-- 18/Jun/2025

DELIMITER $$
DROP PROCEDURE IF EXISTS `exam_question_options`$$
CREATE  PROCEDURE `exam_question_options`(
    IN `query_type` VARCHAR(30), 
    IN `p_id` VARCHAR(20), 
    IN `p_question_id` INT, 
    IN `p_option` VARCHAR(200),
    IN `p_is_correct` VARCHAR(4),
    IN `p_marks` VARCHAR(4)
    )
BEGIN
    IF query_type = 'insert' THEN
        INSERT INTO `exam_question_options` (`question_id`, `option`, `is_correct`,`marks`)
        VALUES (p_question_id, p_option,p_is_correct,p_marks);

    ELSEIF query_type = 'update' THEN
        UPDATE `exam_question_options`
        SET 
            question_id = COALESCE(p_question_id, question_id),
            `option` = COALESCE(p_option, `option`)
        WHERE id = p_id;

    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_questions`(
    IN `query_type` VARCHAR(10), 
    IN `p_id` VARCHAR(20), 
    IN `p_exam_id` VARCHAR(36), 
    IN `p_question_type` VARCHAR(50), 
    IN `p_question_text` TEXT, 
    IN `p_attachment_url` TEXT, 
    IN `p_question_hint` VARCHAR(255), 
    IN `p_is_case_sensitive` TINYINT(1),
    IN `p_marks` DECIMAL(10,2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An error occurred processing the request.';
    END;

    START TRANSACTION;

    IF query_type = 'insert' THEN
        INSERT INTO exam_questions (
            exam_id, question_type, question_text, attachment_url, question_hint, is_case_sensitive, marks
        )
        VALUES (
            p_exam_id, p_question_type, p_question_text, p_attachment_url, p_question_hint, p_is_case_sensitive, p_marks
        );

        -- Return inserted ID
        SELECT LAST_INSERT_ID() AS question_id;

    ELSEIF query_type = 'update' THEN
        UPDATE exam_questions
        SET question_type     = COALESCE(p_question_type, question_type),
            question_text     = COALESCE(p_question_text, question_text),
            attachment_url    = COALESCE(p_attachment_url, attachment_url),
            question_hint     = COALESCE(p_question_hint, question_hint),
            is_case_sensitive = COALESCE(p_is_case_sensitive, is_case_sensitive),
            marks             = COALESCE(p_marks, marks)
        WHERE id = p_id;

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
            SELECT CONCAT(
                '[',
                GROUP_CONCAT(
                    CONCAT(
                        '{"id":', o.id,
                        ',"value":"', REPLACE(o.option, '"', '"'), '"}'
                    )
                ),
                ']'
            )
            FROM exam_question_options o
            WHERE o.question_id = q.id
        ) AS options_json
    FROM 
        exam_questions q
    WHERE 
        q.exam_id = p_exam_id;

    ELSEIF query_type = 'select-options' THEN
        SELECT 
            q.*,
            (
                SELECT CONCAT(
                    '[',
                    IFNULL(GROUP_CONCAT(
                        CONCAT(
                            '{"id":', o.id,
                            ',"value":"', REPLACE(o.option, '"', '\"'),
                            '","is_correct":"', REPLACE(o.is_correct, '"', '\"'),
                            '","marks":"', REPLACE(o.marks, '"', '\"'),
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

END$$
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `examinations`$$
CREATE  PROCEDURE `examinations`(
    IN `query_type` VARCHAR(100), 
    IN `in_id` VARCHAR(50), 
    IN `in_teacher_id` VARCHAR(20), 
    IN `in_assessment_type` VARCHAR(100), 
    IN `in_section` VARCHAR(30), 
    IN `in_class_name` VARCHAR(100), 
    IN `in_class_code` VARCHAR(20), 
    IN `in_term` VARCHAR(100), 
    IN `in_subject_name` VARCHAR(100), 
    IN `in_subject_code` VARCHAR(20), 
    IN `in_commence_date` DATE, 
    IN `in_start_time` VARCHAR(20), 
    IN `in_end_time` VARCHAR(20), 
    IN `in_status` VARCHAR(20), 
    IN `in_academic_year` VARCHAR(20), 
    IN `in_school_id` VARCHAR(20), 
    IN `in_branch_id` VARCHAR(20))
BEGIN
    DECLARE total_questions INT;
    DECLARE total_marks INT;

    IF query_type = "create" THEN
        SELECT COUNT(id) INTO total_questions FROM exam_questions WHERE exam_id=in_id;
        SELECT COUNT(marks) INTO total_marks FROM exam_questions WHERE exam_id=in_id;

        INSERT INTO examinations(id,teacher_id, assessment_type, section, class_name,class_code,term, subject_name,subject_code, commence_date, start_time, end_time,status,academic_year,school_id,branch_id)
        VALUES (in_id,in_teacher_id, in_assessment_type, in_section, in_class_name,in_class_code,in_term, in_subject_name, in_subject_code, in_commence_date, in_start_time, in_end_time,in_status,in_academic_year,in_school_id,in_branch_id);

    ELSEIF query_type ="select-teacher-exams" THEN
        SELECT x.*,(SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_questions,(SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_marks, CONCAT(x.class_name, ' ', x.term, '  ', x.subject_name, ' ', x.assessment_type ) AS assessment_type  FROM examinations x WHERE  x.teacher_id = in_teacher_id;

    ELSEIF query_type = "select-student-exams" THEN
        SELECT 
            x.*,
            COUNT(DISTINCT q.id) AS total_questions,
            COALESCE(SUM(q.marks), 0) AS total_marks,
            CONCAT(x.subject_name, ' ', x.assessment_type) AS exam_name,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM exam_responses er
                    WHERE er.exam_id = x.id AND er.class_code = in_class_code
                ) THEN 'completed'
                WHEN x.commence_date = CURDATE() THEN 'pending'
                WHEN x.commence_date > CURDATE() THEN 'upcoming'
                ELSE 'missed'
            END AS student_exam_status
        FROM 
            examinations x
        LEFT JOIN exam_questions q 
            ON q.exam_id = x.id
        WHERE 
            x.class_code = in_class_code 
            AND x.commence_date = CURDATE()
            -- EXCLUDE exams already taken by the student
            AND NOT EXISTS (
                SELECT 1 FROM exam_responses er2
                WHERE er2.exam_id = x.id 
                AND er2.admission_no = in_id
            )
        GROUP BY x.id;
    ELSEIF query_type = "select-all-exams" THEN
        SELECT 
            ec.*,
            COUNT(eq.id) AS total_questions,
            COALESCE(SUM(eq.marks), 0) AS total_marks,
            CASE 
                WHEN ec.commence_date > CURDATE() THEN 'incoming'
                ELSE 'completed'
            END AS exam_status
        FROM examinations ec
        LEFT JOIN exam_questions eq ON eq.exam_id = ec.id
        GROUP BY ec.id;
    ELSEIF query_type = "Select Incoming Exams" THEN 
        SELECT 
            ec.*,
            COUNT(eq.id) AS total_questions,
            COALESCE(SUM(eq.marks), 0) AS total_marks
        FROM 
            examinations ec
        LEFT JOIN 
            exam_questions eq ON eq.exam_id = ec.id
        WHERE 
            DATE(ec.commence_date) > CURDATE()
        GROUP BY  ec.id;

    ELSEIF query_type = "Select Completed Exams" THEN 
        SELECT 
                ec.*,
                COUNT(eq.id) AS total_questions,
                COALESCE(SUM(eq.score), 0) AS total_scores
        FROM 
            examinations ec
        LEFT JOIN 
            exam_responses eq ON eq.exam_id = ec.id
        WHERE 
            DATE(ec.commence_date) < CURDATE()
        GROUP BY  ec.id;

    ELSEIF query_type = "select" THEN 

        IF in_id IS NOT NULL AND in_id != '' THEN
            SELECT 
                ec.* FROM 
                examinations ec
            WHERE 
                ec.id = in_id;
        END IF;

        SELECT x.*, (SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_questions,(SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_marks, CONCAT(x.class_name, ' ', x.term, '  ',x.assessment_type ) AS assessment_type  FROM examinations x WHERE x.status != "pending";
        
    ELSEIF query_type = "by_id" THEN
        SELECT x.*,(SELECT COUNT(q.id) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_questions,(SELECT SUM(q.marks) FROM exam_questions q WHERE q.exam_id = x.id ) AS total_marks, CONCAT(x.subject_name, ' ', x.assessment_type ) AS assessment_type  FROM examinations x WHERE id = in_id;
       -- Admin & Teachers   
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
                            ',"value":"', REPLACE(o.option, '"', '\"'),
                            '","is_correct":"', REPLACE(o.is_correct, '"', '\"'),
                            '","marks":"', REPLACE(o.marks, '"', '\"'),
                            '"}'
                        )
                    ), ''),
                    ']'
                )AS options_json
        FROM exam_questions q
        LEFT JOIN exam_question_options o ON q.id = o.question_id
        WHERE q.exam_id = in_id
        GROUP BY 
            q.id, 
            q.exam_id, 
            q.question_text, 
            q.question_type, 
            q.question_hint, 
            q.attachment_url, 
            q.marks;


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
                        '{"id":', o.id, -- include the option ID
                        ',"value":"',
                        REPLACE(o.option, '"', '"'), -- using correct column name: option
                        '"}'
                    )
                ),
                ']'
            ) AS options_json
        FROM exam_questions q
        LEFT JOIN exam_question_options o ON q.id = o.question_id
        WHERE q.exam_id = in_id
        GROUP BY 
            q.id, 
            q.exam_id, 
            q.question_text, 
            q.question_type, 
            q.question_hint, 
            q.attachment_url, 
            q.marks;
   
    ELSEIF query_type = "status" THEN 
        UPDATE examinations SET status = in_status where id = in_id;
    ELSEIF query_type = 'update' THEN
    -- Update the examinations table using COALESCE to preserve existing values if input is NULL
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
        branch_id = COALESCE(in_branch_id, branch_id)
    WHERE id = in_id;

END IF;
END$$
DELIMITER ;
