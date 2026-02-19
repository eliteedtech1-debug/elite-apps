CREATE TRIGGER `generate_admission_no` BEFORE INSERT ON `students`
 FOR EACH ROW BEGIN
  DECLARE location_prefix VARCHAR(10);
  DECLARE next_serial INT;

  -- Validate if the school_location is not null or empty
  IF NEW.school_location IS NULL OR TRIM(NEW.school_location) = '' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'School location cannot be null or empty for admission number generation';
  END IF;

  -- Fetch the prefix and current serial_no for the provided school_location
  SELECT `prefix`, `serial_no`
  INTO location_prefix, next_serial
  FROM `admission_no_gen`
  WHERE `school_location` = NEW.school_location AND `status` = 'Active'
  LIMIT 1;

  -- Check if no matching record was found
  IF location_prefix IS NULL OR next_serial IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid school location or no active record in admission_no_gen';
  END IF;

  -- Increment the serial number
  SET next_serial = next_serial + 1;

  -- Update the admission_no_gen table with the new serial number
  UPDATE `admission_no_gen`
  SET `serial_no` = next_serial
  WHERE `school_location` = NEW.school_location;

  -- Generate the admission number
  SET NEW.admission_no = CONCAT(location_prefix, LPAD(next_serial, 4, '0'));
END

ALTER TABLE `exam_grading` ADD `term` VARCHAR(30) NOT NULL AFTER `total_score`, ADD `academic_year` VARCHAR(15) NOT NULL AFTER `term`;
ALTER TABLE `exam_grading` ADD PRIMARY KEY(`admission_no`, `term`, `academic_year`);

DELIMITER $$
DROP PROCEDURE `exam_drading`$$
CREATE  PROCEDURE `exam_drading`(
    
    IN `_admission_no` VARCHAR(30), 
    IN `_student_name` VARCHAR(30), 
    IN `_classname` VARCHAR(30), 
    IN `_subject` VARCHAR(30), 
    IN `_CA_marks` INT, 
    IN `_Ass_marks` INT, 
    IN `_exam_marks` INT,
    IN `_term` INT,
    IN `_academic_year` INT
)
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

DELIMITER //

CREATE PROCEDURE school_setup(
    IN query_type VARCHAR(10), 
    IN p_id INT,
    IN p_school_name VARCHAR(500),
    IN p_short_name VARCHAR(10),
    IN p_academic_year VARCHAR(20),
    IN p_session_start_date DATE,
    IN p_session_end_date DATE,
    IN p_status VARCHAR(20),
    IN p_badge_url VARCHAR(500),
    IN p_mission VARCHAR(500),
    IN p_vission VARCHAR(500),
    IN p_about_us VARCHAR(500)
)
BEGIN
    IF query_type = 'CREATE' THEN
        INSERT INTO school_setup (
            school_name, short_name, academic_year, session_start_date, session_end_date,
            status, badge_url, mission, vission, about_us
        )
        VALUES (
            p_school_name, p_short_name, p_academic_year, p_session_start_date, p_session_end_date,
            p_status, p_badge_url, p_mission, p_vission, p_about_us
        );

    ELSEIF query_type = 'READ' THEN
        SELECT * FROM school_setup WHERE id = p_id;

    ELSEIF query_type = 'UPDATE' THEN
        UPDATE school_setup
        SET
            school_name = p_school_name,
            short_name = p_short_name,
            academic_year = p_academic_year,
            session_start_date = p_session_start_date,
            session_end_date = p_session_end_date,
            status = p_status,
            badge_url = p_badge_url,
            mission = p_mission,
            vission = p_vission,
            about_us = p_about_us
        WHERE id = p_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM school_setup WHERE id = p_id;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type type';
    END IF;
END;
//

DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS exam_grading $$
CREATE  PROCEDURE `exam_grading`(
    IN `query_type` VARCHAR(50), 
IN `_admission_no` VARCHAR(30), 
IN `_student_name` VARCHAR(50), 
IN `_classname` VARCHAR(50), 
IN `_subject` VARCHAR(50), 
IN `_CA_marks` INT, 
IN `_Ass_marks` INT, 
IN `_exam_marks` INT, 
IN `_term` VARCHAR(30), 
IN `_academic_year` VARCHAR(20))
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
DROP PROCEDURE IF EXISTS `get_results`$$
CREATE  PROCEDURE `get_results`(IN `query_type` VARCHAR(100))
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
DELIMITER ;



-- 8/11/2024

DELIMITER $$
DROP PROCEDURE IF EXISTS `students_attendances`$$
CREATE PROCEDURE `students_attendances`(
    IN `query_type` VARCHAR(50),
    IN `_id` INT,
    IN `_teacher_name` VARCHAR(50),
    IN `_teacher_id` VARCHAR(50),
    IN `_section` VARCHAR(50),
    IN `_class_name` VARCHAR(50),
    IN `_day` VARCHAR(50),
    IN `_status` VARCHAR(50),
    IN `_student_name` VARCHAR(50),
    IN `_admission_no` VARCHAR(50),
    IN `_term` VARCHAR(50),
    IN `_academic_year` VARCHAR(50),
    IN `_start_date` DATE,
    IN `_end_date` DATE
)
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
            academic_year
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
            _academic_year
        );

    ELSEIF query_type = 'read' THEN
        SELECT * FROM class_attendances WHERE id = _id;

    ELSEIF query_type = 'update' THEN
        UPDATE class_attendances
        SET
            teacher_name = _teacher_name,
            teacher_id = _teacher_id,
            section = _section,
            class_name = _class_name,
            day = _day,
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
            AND created_at BETWEEN _start_date AND _end_date
        ORDER BY 
            admission_no, created_at;
    END IF;
END$$
DELIMITER ;

-- 12/11/2024

CREATE TABLE `exams_attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `notes` int(200) DEFAULT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
DELIMITER $$
CREATE  PROCEDURE `exams_attendance`(
    IN `query_type` VARCHAR(50), 
    IN `_id` INT, 
    IN `_teacher_name` VARCHAR(50), 
    IN `_teacher_id` VARCHAR(50), 
    IN `_exam` VARCHAR(50), 
    IN `_class_name` VARCHAR(50), 
    IN `_status` VARCHAR(50), 
    IN `_student_name` VARCHAR(50), 
    IN `_admission_no` VARCHAR(50), 
    IN `_term` VARCHAR(50), 
    IN `_academic_year` VARCHAR(50), 
    IN `_start_date` DATE, 
    IN `_end_date` DATE)
BEGIN
    IF query_type = 'create' THEN
        INSERT INTO exams_attendance (
            teacher_name,
            teacher_id,
            exam,
            class_name,
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


-- 18/11/2024

DELIMITER $$
DROP PROCEDURE  IF EXISTS `students_queries`$$
CREATE  PROCEDURE `students_queries`(
    IN `query_type` VARCHAR(30), 
IN `p_id` INT, 
IN `p_parent_id` INT, 
IN `p_guardian_id` INT, 
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
IN `p_academic_year` INT, 
IN `p_status` VARCHAR(100), 
IN `p_section` VARCHAR(100), 
IN `p_mother_tongue` VARCHAR(100), 
IN `p_language_known` VARCHAR(100), 
IN `p_current_class` VARCHAR(50), 
IN `p_profile_picture` VARCHAR(300), 
IN `p_medical_condition` VARCHAR(300), 
IN `p_transfer_certificate` VARCHAR(500),
IN `p_school_location` VARCHAR(300) )
BEGIN
    -- CREATE query_type
    IF query_type = 'CREATE' THEN
        INSERT INTO students (
            parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
            l_g_a, nationality, last_school_atterded, special_health_needs, blood_group, admission_no, admission_date, 
            academic_year, status, section, mother_tongue, language_known, current_class, profile_picture, medical_condition,transfer_certificate,
            school_location
        )
        VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
            p_l_g_a, p_nationality, p_last_school_atterded, p_special_health_needs, p_blood_group, p_admission_no, p_admission_date, 
            p_academic_year, p_status, p_section, p_mother_tongue, p_language_known, p_current_class, p_profile_picture, p_medical_condition,
            p_transfer_certificate,p_school_location
        );
    -- SELECT query_type
    ELSEIF query_type = 'select-class' THEN
        SELECT * FROM students WHERE current_class = p_current_class;
    ELSEIF query_type = 'SELECT' THEN
        SELECT * FROM students WHERE id = p_id;
    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM students;
    -- UPDATE query_type
    ELSEIF query_type = 'UPDATE' THEN
        UPDATE students
        SET
            parent_id = p_parent_id,
            guardian_id = p_guardian_id,
            student_name = p_student_name,
            home_address = p_home_address,
            date_of_birth = p_date_of_birth,
            sex = p_sex,
            religion = p_religion,
            tribe = p_tribe,
            state_of_origin = p_state_of_origin,
            l_g_a = p_l_g_a,
            nationality = p_nationality,
            last_school_atterded = p_last_school_atterded,
            special_health_needs = p_special_health_needs,
            blood_group = p_blood_group,
            admission_no = p_admission_no,
            admission_date = p_admission_date,
            academic_year = p_academic_year,
            status = p_status,
            section = p_section,
            mother_tongue = p_mother_tongue,
            language_known = p_language_known,
            current_class = p_current_class,
            profile_picture = p_profile_picture,
            medical_condition = p_medical_condition,
            school_location=p_school_location
        WHERE id = p_id;
    -- DELETE query_type
    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students WHERE id = p_id;
    END IF;
END$$
DELIMITER ;

ALTER TABLE `students` ADD `transfer_certificate` VARCHAR(500) NULL DEFAULT NULL AFTER `medical_condition`;

ALTER TABLE `students` CHANGE `academic_year` `academic_year` VARCHAR(20) NULL DEFAULT NULL;

ALTER TABLE `account_chart` ADD `payment_type` VARCHAR(100) NOT NULL AFTER `class_code`;

ALTER TABLE `account_chart` CHANGE `status` `status` ENUM('Active','Inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'Active';


DELIMITER $$
DROP PROCEDURE `account_chart`$$
CREATE  PROCEDURE `account_chart`(
    IN `query_type` VARCHAR(100), 
    IN `in_id` INT, 
    IN `in_code` VARCHAR(10), 
    IN `in_description` VARCHAR(100), 
    IN `in_amount` DECIMAL(10,2), 
    IN `in_year` YEAR, 
    IN `in_term` VARCHAR(100), 
    IN `in_section` VARCHAR(100), 
    IN `in_class_code` VARCHAR(100), 
    IN `in_payment_type` VARCHAR(100), 
    IN `in_status` VARCHAR(100), 
    IN `in_school_location` VARCHAR(100))
BEGIN
IF query_type="create" THEN
    INSERT INTO `account_chart`(code, description, amount, year, term, section, class_code, payment_type, status, school_location ) 
    VALUES (in_code,in_description,in_amount,in_year,in_term,in_section,in_class_code, in_payment_type, in_status,in_school_location);

ELSEIF query_type="select" THEN
    IF in_section IS NOT NULL AND in_section !='' THEN 
        SELECT * FROM `account_chart` WHERE `section` = in_section; 
        # AND class_code IS NULL OR class_code = in_class_code;
    END IF;
ELSEIF query_type="select-all" THEN
    SELECT * FROM `account_chart`;
END IF;
END$$
DELIMITER ;



CREATE TABLE `transactions` (
  `id` INT(100) NOT NULL AUTO_INCREMENT,          -- Unique identifier for the transaction
  `student_id` INT(100) NOT NULL,                 -- Reference to the student making the payment (foreign key)
  `revenue_head_id` INT(100) NOT NULL,            -- Reference to the revenue head (foreign key)
  `amount_paid` DECIMAL(10,2) NOT NULL,           -- Amount paid by the student
  `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Date and time when the payment was made
  `payment_method` VARCHAR(100) NOT NULL,         -- Method of payment (e.g., cash, transfer, online)
  `transaction_reference` VARCHAR(100) NOT NULL,  -- Unique transaction reference
  `payment_status` ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',  -- Status of the transaction
  `document_status` ENUM('Printed', 'Saved') DEFAULT 'Saved',  -- Status of the transaction
  `print_count` INT(2) DEFAULT 0,  -- Status of the transaction
  `print_by` VARCHAR(100) DEFAULT '',  -- Status of the transaction
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,  -- Date when the transaction record was created
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Date when the transaction record was last updated
  PRIMARY KEY (`id`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`),  -- Foreign key to the students table
  FOREIGN KEY (`revenue_head_id`) REFERENCES `account_chart`(`id`)  -- Foreign key to the account_chart table
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
DELIMITER $$

CREATE PROCEDURE `insert_transaction`(
    IN p_student_id INT(100),
    IN p_revenue_head_id INT(100),
    IN p_amount_paid DECIMAL(10,2),
    IN p_payment_method VARCHAR(100),
    IN p_transaction_reference VARCHAR(100)
)
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

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE `update_transaction_status`(
    IN p_transaction_id INT(100),
    IN p_payment_status ENUM('Pending', 'Paid', 'Failed'),
    IN p_document_status ENUM('Printed', 'Saved'),
    IN p_print_count INT(2),
    IN p_print_by VARCHAR(100)
)
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

DELIMITER ;


DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `lesson_time_table`(IN `query_type` VARCHAR(50), IN `in_id` VARCHAR(50), IN `in_day` VARCHAR(20), IN `in_class_name` VARCHAR(50), IN `in_subject` VARCHAR(50), IN `in_teacher_id` INT(10), IN `in_section` VARCHAR(50), IN `in_school_location` VARCHAR(150), IN `in_start_time` VARCHAR(20), IN `in_end_time` VARCHAR(20), IN `in_status` VARCHAR(50))
BEGIN
    IF query_type='create' THEN
        INSERT INTO lesson_time_table(day, class_name, subject, teacher_id, section, school_location, start_time, end_time)
        VALUES(in_day, in_class_name, in_subject, in_teacher_id, in_section, in_school_location, in_start_time,in_end_time);

    ELSEIF query_type='update' THEN
        UPDATE lesson_time_table
        SET day=in_day,
            class_name=in_class_name,
            subject=in_subject,
            teacher_id=teacher_id,
            section=section,
            school_location=in_school_location,
            start_time=in_start_time,
            end_time=in_end_time,
            status=in_status
            WHERE id = in_id;

    ELSEIF query_type='select-all' THEN
        SELECT x.*, (SELECT y.name FROM teachers y WHERE id = x.teacher_id) AS teacher  FROM lesson_time_table x WHERE x.status='Active';
    ELSEIF query_type='select' THEN
        IF in_class_name IS NOT NULL AND in_class_name !='' THEN
            SELECT x.*, (SELECT y.name FROM teachers y WHERE id = x.teacher_id) AS teacher  FROM lesson_time_table x WHERE x.class_name=in_class_name;
        ELSEIF in_id IS NOT NULL AND in_id !='' THEN
            SELECT x.*, (SELECT y.name FROM teachers y WHERE id = x.teacher_id) AS teacher  FROM lesson_time_table x WHERE x.id=in_id;
        END IF;
    ELSEIF query_type='select-day-subjects' THEN
        SELECT * FROM lesson_time_table WHERE status='Active' AND day = in_day;

    END IF;

END$$
DELIMITER ;


-- 29/11/2024

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `students_attendances`(IN `query_type` VARCHAR(50), IN `_id` INT, IN `_teacher_name` VARCHAR(50), IN `_teacher_id` VARCHAR(50), IN `_section` VARCHAR(50), IN `_class_name` VARCHAR(50), IN `_day` VARCHAR(50), IN `_status` VARCHAR(50), IN `_student_name` VARCHAR(50), IN `_admission_no` VARCHAR(50), IN `_term` VARCHAR(50), IN `_academic_year` VARCHAR(50), IN `_start_date` DATE, IN `_end_date` DATE)
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
            academic_year
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
            _academic_year
        );

    ELSEIF query_type = 'read' THEN
        SELECT * FROM class_attendances WHERE id = _id;

    ELSEIF query_type = 'update' THEN
        UPDATE class_attendances
        SET
            teacher_name = _teacher_name,
            teacher_id = _teacher_id,
            section = _section,
            class_name = _class_name,
            day = _day,
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
DELIMITER ;



ALTER TABLE `class_attendances` ADD `student_id` INT NULL DEFAULT NULL AFTER `id`;
UPDATE class_attendances
SET day= DATE_FORMAT(created_at, '%W');

DELIMITER $$
DROP PROCEDURE `students_attendances`$$
CREATE  PROCEDURE `students_attendances`(
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
IN `_end_date` DATE)
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
            academic_year
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
            _academic_year
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
DELIMITER;


DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `lessons`(
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


CREATE TABLE `school_management_db`.`student_assignments` (`id` INT NOT NULL AUTO_INCREMENT , `assignment_id` INT(10) NOT NULL , `student_id` INT(10) NOT NULL , `class_name` VARCHAR(50) NOT NULL ,`subject` VARCHAR(50) NOT NULL , `teacher_name` VARCHAR(50) NOT NULL , `level` INT NOT NULL , `attachement` VARCHAR(500) NOT NULL , `content` TEXT NOT NULL , `marks` INT NOT NULL , `score` DOUBLE NOT NULL , `remark` VARCHAR(500) NOT NULL , `comment` VARCHAR(500) NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP , PRIMARY KEY (`id`)) ENGINE = InnoDB;

DELIMITER $$
DROP  PROCEDURE  IF EXISTS `assignments`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `assignments`(
    IN `in_query_type` VARCHAR(10), 
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
IN `in_marks` VARCHAR(100))
BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO assignments (teacher_id,class_name, subject, assignment_date, submission_date, attachment, content, teacher_name, title, marks)
        VALUES (in_teacher_id, in_class_name, in_subject, in_assignment_date, in_submission_date, in_attachment, in_content, in_teacher_name, in_title, in_marks);
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
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `student_assignments`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `student_assignments`(
    IN `query_type` VARCHAR(50), 
IN `in_id` VARCHAR(8), 
IN `in_assignment_id` VARCHAR(8), 
IN `in_student_id` VARCHAR(8), 
IN `in_student_name` VARCHAR(100), 
IN `in_admission_no` VARCHAR(20), 
IN `in_class_name` VARCHAR(80), 
IN `in_subject` VARCHAR(200), 
IN `in_teacher_id` VARCHAR(10), 
IN `in_teacher_name` VARCHAR(50), 
IN `in_level` VARCHAR(8), 
IN `in_attachement` VARCHAR(500), 
IN `in_content` TEXT, 
IN `in_marks` VARCHAR(8), 
IN `in_score` VARCHAR(8), 
IN `in_remark` VARCHAR(8), 
IN `in_comment` VARCHAR(500))
BEGIN
    IF query_type ='create' THEN
        INSERT INTO `student_assignments`( `assignment_id`, `student_id`, `student_name`, `admission_no`, `class_name`, `subject`, `teacher_id`, `teacher_name`, `level`,`content`) 
        VALUES ( `in_assignment_id`, `in_student_id`,`in_student_name`, `in_admission_no`, `in_class_name`, `in_subject`, `in_teacher_id`, `in_teacher_name`, `in_level`,`in_content`);
      ELSEIF query_type = 'update' THEN
        UPDATE `student_assignments`
        SET 
            `assignment_id` = COALESCE(`in_assignment_id`, `assignment_id`),
            `student_id` = COALESCE(`in_student_id`, `student_id`),
            `student_name` = COALESCE(`in_student_name`, `student_name`),
            `admission_no` = COALESCE(`in_admission_no`, `admission_no`),
            `class_name` = COALESCE(`in_class_name`, `class_name`),
            `subject` = COALESCE(`in_subject`, `subject`),
            `teacher_id` = COALESCE(`in_teacher_id`, `teacher_id`),
            `teacher_name` = COALESCE(`in_teacher_name`, `teacher_name`),
            `level` = COALESCE(`in_level`, `level`),
            `content` = COALESCE(`in_content`, `content`),
            `marks` = COALESCE(`in_marks`, `marks`),
            `score` = COALESCE(`in_score`, `score`),
            `remark` = COALESCE(`in_remark`, `remark`),
            `comment` = COALESCE(`in_comment`, `comment`),
            `updated_at` = NOW()
        WHERE `id` = `in_id`;

    ELSEIF query_type ='select' THEN
     
        IF in_assignment_id IS NOT NULL AND in_student_id !='' THEN
           SELECT * FROM `student_assignments` WHERE student_id = in_student_id AND assignment_id = in_assignment_id;
       
        ELSEIF in_teacher_id IS NOT NULL AND in_teacher_id !='' AND in_assignment_id IS NOT NULL AND in_assignment_id!='' THEN
        
           SELECT * FROM `student_assignments` WHERE teacher_id = in_teacher_id AND assignment_id = in_assignment_id;
        ELSEIF in_id IS NOT NULL AND in_id !='' THEN
        
           SELECT * FROM `student_assignments` WHERE id = in_id;
        ELSE 
           SELECT * FROM `student_assignments`;
        END IF;
    END IF;
END$$
DELIMITER ;



DELIMITER //

CREATE TRIGGER `before_insert_admission_no_gen`
BEFORE INSERT ON `admission_no_gen`
FOR EACH ROW
BEGIN
  DECLARE max_serial INT;

  -- Find the maximum serial_no for the given prefix and school_location
  SELECT COALESCE(MAX(serial_no), 0) INTO max_serial
  FROM admission_no_gen
  WHERE prefix = NEW.prefix AND school_location = NEW.school_location;

  -- Increment the serial_no
  SET NEW.serial_no = max_serial + 1;
END;
//

DELIMITER ;
DELIMITER $$

CREATE TRIGGER `generate_admission_no`
BEFORE INSERT ON `students`
FOR EACH ROW
BEGIN
  DECLARE location_prefix VARCHAR(10);
  DECLARE next_serial INT;

  -- Validate if the school_location is not null or empty
  IF NEW.school_location IS NULL OR TRIM(NEW.school_location) = '' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'School location cannot be null or empty for admission number generation';
  END IF;

  -- Fetch the prefix and current serial_no for the provided school_location
  SELECT `prefix`, `serial_no`
  INTO location_prefix, next_serial
  FROM `admission_no_gen`
  WHERE `school_location` = NEW.school_location AND `status` = 'Active'
  LIMIT 1;

  -- Check if no matching record was found
  IF location_prefix IS NULL OR next_serial IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid school location or no active record in admission_no_gen';
  END IF;

  -- Increment the serial number
  SET next_serial = next_serial + 1;

  -- Update the admission_no_gen table with the new serial number
  UPDATE `admission_no_gen`
  SET `serial_no` = next_serial
  WHERE `school_location` = NEW.school_location;

  -- Generate the admission number
  SET NEW.admission_no = CONCAT(location_prefix, LPAD(next_serial, 4, '0'));
END$$

DELIMITER ;


DELIMITER $$

CREATE PROCEDURE `dashboard_query` (
    IN query_type VARCHAR(100),
    IN school_location VARCHAR(500)
)
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
END $$

DELIMITER ;


DELIMITER $$

CREATE PROCEDURE `exam_grading` (
    IN query_type ENUM('create', 'select', 'delete'),
    IN in_admission_no VARCHAR(100),
    IN in_student_name VARCHAR(100),
    IN in_subject VARCHAR(100),
    IN in_class_name VARCHAR(100),
    IN in_academic_year VARCHAR(20),
    IN in_term VARCHAR(20),
    IN in_ca1Score INT(4),
    IN in_ca2Score INT(4),
    IN in_examScore INT(4),
    IN in_mark_by VARCHAR(100)
)
BEGIN
    DECLARE total DOUBLE(3,1);
    DECLARE grade ENUM('A1','B2','B3','C4','C5','C6','D7','E8','F9');
    DECLARE remark VARCHAR(20);

    -- CREATE operation
    IF query_type = 'create' THEN
        -- Calculate the total score
        SET total = in_ca1Score + in_ca2Score + in_examScore;

        -- Assign grade based on the total score
        CASE 
            WHEN total >= 75 THEN SET grade = 'A1';
            WHEN total >= 70 THEN SET grade = 'B2';
            WHEN total >= 65 THEN SET grade = 'B3';
            WHEN total >= 60 THEN SET grade = 'C4';
            WHEN total >= 55 THEN SET grade = 'C5';
            WHEN total >= 50 THEN SET grade = 'C6';
            WHEN total >= 45 THEN SET grade = 'D7';
            WHEN total >= 40 THEN SET grade = 'E8';
            ELSE SET grade = 'F9';
        END CASE;

        -- Generate a remark based on the grade
        CASE 
            WHEN grade = 'A1' THEN SET remark = 'Excellent';
            WHEN grade = 'B2' THEN SET remark = 'Very Good';
            WHEN grade = 'B3' THEN SET remark = 'Good';
            WHEN grade = 'C4' THEN SET remark = 'Pass';
            WHEN grade = 'C5' THEN SET remark = 'Pass';
            WHEN grade = 'C6' THEN SET remark = 'Pass';
            ELSE SET remark = 'Fail';
        END CASE;

        -- Check if the record exists
        IF EXISTS (
            SELECT 1
            FROM student_grading
            WHERE admission_no = in_admission_no
              AND subject = in_subject
        ) THEN
            -- Update existing record
            UPDATE student_grading
            SET
                student_name = in_student_name,
                class_name = in_class_name,
                academic_year = in_academic_year,
                term = in_term,
                ca1Score = in_ca1Score,
                ca2Score = in_ca2Score,
                examScore = in_examScore,
                total_score = total,
                grade = grade,
                remark = remark,
                mark_by = in_mark_by
            WHERE admission_no = in_admission_no
              AND subject = in_subject;
        ELSE
            -- Insert new record
            INSERT INTO student_grading (
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
                mark_by
            ) VALUES (
                in_admission_no,
                in_student_name,
                in_subject,
                in_class_name,
                in_academic_year,
                in_term,
                in_ca1Score,
                in_ca2Score,
                in_examScore,
                total,
                grade,
                remark,
                in_mark_by
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

DELIMITER ;




DELIMITER $$
DROP PROCEDURE `students_queries`$$
CREATE  PROCEDURE `students_queries`(
    IN `query_type` VARCHAR(30), 
    IN `p_id` INT, 
    IN `p_parent_id` INT, 
    IN `p_guardian_id` INT, 
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
    IN `p_school_location` VARCHAR(300))
BEGIN
DECLARE _adm_no VARCHAR(50);
DECLARE _short_name VARCHAR(50);
    IF p_school_location IS NOT NULL  AND p_school_location!='' THEN
        SELECT  short_name INTO _short_name from school_locations WHERE location = p_school_location;
     SET _adm_no = CONCAT(_short_name,p_admission_no);
    END IF;

    IF query_type = 'CREATE' THEN

        INSERT INTO students (
            parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
            l_g_a, nationality, last_school_atterded, special_health_needs, blood_group, admission_no, admission_date, 
            academic_year, status, section, mother_tongue, language_known, current_class, profile_picture, medical_condition,transfer_certificate,
            school_location
        )
        VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
            p_l_g_a, p_nationality, p_last_school_atterded, p_special_health_needs, p_blood_group, _adm_no, p_admission_date, 
            p_academic_year, p_status, p_section, p_mother_tongue, p_language_known, p_current_class, p_profile_picture, p_medical_condition,
            p_transfer_certificate,p_school_location
        );
        SELECT * FROM students WHERE id = LAST_INSERT_ID(); 
    -- SELECT query_type
    ELSEIF query_type = 'select-class' THEN
        SELECT * FROM students WHERE current_class = p_current_class;
    ELSEIF query_type = 'SELECT' THEN
        SELECT * FROM students WHERE id = p_id;
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

    -- Append WHERE clause if any condition was added
    IF @where_clause != '' THEN
        SET @query = CONCAT(@query, ' WHERE ', @where_clause);
    END IF;

    -- Execute the dynamic query
    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

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
DELIMITER ;


ALTER TABLE `lessons` CHANGE `subject_name` `subject` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;






CREATE TABLE `assignment_questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignment_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `question_type` enum('multiple_choice','true_false','short_answer','essay') NOT NULL DEFAULT 'short_answer',
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `marks` int(3) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `assignment_id` (`assignment_id`),
  CONSTRAINT `assignment_questions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `assignment_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignment_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `subject` int(11) NOT NULL,
  `response` text NOT NULL,
  `score` int(3) DEFAULT 0,
  `is_correct` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`question_id`) REFERENCES `assignment_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



DELIMITER $$

CREATE TRIGGER update_true_false_response
AFTER INSERT ON assignment_responses
FOR EACH ROW
BEGIN
  IF (
    SELECT question_type FROM assignment_questions WHERE id = NEW.question_id
  ) = 'true_false' THEN
    SET NEW.is_correct = 
      CASE 
        WHEN NEW.response = (SELECT correct_answer FROM assignment_questions WHERE id = NEW.question_id) 
        THEN 1 
        ELSE 0 
      END;

    SET NEW.score = 
      CASE 
        WHEN NEW.is_correct = 1 
        THEN (SELECT marks FROM assignment_questions WHERE id = NEW.question_id) 
        ELSE 0 
      END;
  END IF;
END$$

DELIMITER ;
DELIMITER $$

CREATE TRIGGER update_multiple_choice_response
AFTER INSERT ON assignment_responses
FOR EACH ROW
BEGIN
  IF (
    SELECT question_type FROM assignment_questions WHERE id = NEW.question_id
  ) = 'multiple_choice' THEN
    SET NEW.is_correct = 
      CASE 
        WHEN JSON_CONTAINS(
          (SELECT options FROM assignment_questions WHERE id = NEW.question_id), 
          JSON_OBJECT('value', NEW.response, 'is_correct', TRUE)
        ) 
        THEN 1 
        ELSE 0 
      END;

    SET NEW.score = 
      CASE 
        WHEN NEW.is_correct = 1 
        THEN (SELECT marks FROM assignment_questions WHERE id = NEW.question_id) 
        ELSE 0 
      END;
  END IF;
END$$

DELIMITER ;
DELIMITER $$
DROP PROCEDURE `assignment_questions`$$
CREATE  PROCEDURE `assignment_questions`(
    IN query_type VARCHAR(30),
    IN in_id VARCHAR(10),
    IN in_assignment_id VARCHAR(10),
    IN in_question_text TEXT,
    IN in_question_type ENUM('Multiple Choice', 'True/False', 'Short Answer','Fill in the Blank','Essay'),
    IN in_options JSON,
    IN in_correct_answer VARCHAR(255),
    IN in_marks INT
)
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

CREATE PROCEDURE InsertQuestion(
    IN question_text TEXT,
    IN question_type ENUM('multiple_choice', 'true_false', 'short_answer'),
    IN options JSON,
    IN correct_answer VARCHAR(255),
    IN marks INT
)
BEGIN
    -- Validate the question type
    IF question_type = 'multiple_choice' THEN
        -- Ensure options and correct_answer are provided
        IF options IS NULL OR correct_answer IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Options and correct answer must be provided for multiple-choice questions.';
        END IF;
    ELSEIF question_type='true_false' THEN
    -- Ensure correct_answer is provided
        IF correct_answer IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Correct answer must be provided for true-false questions.';

    END IF;

    -- Insert the question
    INSERT INTO assignment_questions (question_text, question_type, options, correct_answer, marks)
    VALUES (question_text, question_type, options, correct_answer, marks);
END$$

DELIMITER;

DELIMITER $$
DROP PROCEDURE IF EXISTS assignmentResponses $$
CREATE PROCEDURE assignmentResponses (
    IN query_type VARCHAR(10),         -- Action type: 'insert', 'upsert', 'select'
    IN p_assignment_id INT,         -- Assignment ID
    IN p_question_id INT,           -- Question ID
    IN p_student_id INT,            -- Student ID
    IN p_subject INT,               -- Subject ID
    IN p_response TEXT,
     OUT p_result_message VARCHAR(255) 
)
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
      AND student_id = p_student_id;

    -- Handle actions
    IF query_type = 'insert' THEN
        IF record_exists = 0 THEN
            INSERT INTO assignment_responses (
                assignment_id, question_id, student_id, subject, response, score, is_correct
            ) VALUES (
                p_assignment_id, p_question_id, p_student_id, p_subject, p_response, score, is_correct
            );
            SET p_result_message = 'Record inserted successfully.';
        ELSE
            SET p_result_message = 'Record already exists.';
        END IF;

    ELSEIF query_type = 'upsert' THEN
        IF record_exists = 0 THEN
            INSERT INTO assignment_responses (
                assignment_id, question_id, student_id, subject, response, score, is_correct
            ) VALUES (
                p_assignment_id, p_question_id, p_student_id, p_subject, p_response, score, is_correct
            );
            SET p_result_message = 'Record inserted successfully.';
        ELSE
            UPDATE assignment_responses
            SET response = p_response,
                score = score,
                is_correct = is_correct
            WHERE assignment_id = p_assignment_id
              AND question_id = p_question_id
              AND student_id = p_student_id;
            SET p_result_message = 'Record updated successfully.';
        END IF;

    ELSEIF query_type = 'select' THEN
        -- Fetch records (output can be retrieved using SELECT in the caller)
        SELECT * FROM assignment_responses
        WHERE assignment_id = p_assignment_id
          AND student_id = p_student_id;

        SET p_result_message = 'Select query executed successfully.';

    ELSE
        SET p_result_message = 'Invalid action specified.';
    END IF;
END$$

DELIMITER ;

CREATE TABLE `school_calendar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `status` enum('Active','Inactive','Cancelled') NOT NULL DEFAULT 'Active',
  `created_by` varchar(50) DEFAULT NULL,
  `recurrence` enum('Once','Annual') NOT NULL DEFAULT 'Once',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DELIMITER $$
DROP PROCEDURE schoolCaledar$$
CREATE PROCEDURE schoolCaledar (
    IN query_type VARCHAR(10),        
    IN in_event_id VARCHAR(100),                
    IN in_title VARCHAR(255),          
    IN in_start_date DATETIME,
    IN in_end_date DATETIME,
    IN in_school_location VARCHAR(150),
    IN in_status ENUM('Active',
    IN in_created_by VARCHAR(50),
    IN in_recurrence ENUM('Once', 'Annual') 
)
BEGIN
    IF query_type = 'CREATE' THEN
        INSERT INTO school_calendar (title, start_date, end_date, school_location, status, created_by, recurrence)
        VALUES (title, start_date, end_date, school_location, status, created_by, recurrence);
        
    ELSEIF query_type = 'UPDATE' THEN
        UPDATE school_calendar
        SET title = title,
            start_date = start_date,
            end_date = end_date,
            school_location = school_location,
            status = status,
            created_by = created_by,
            recurrence = recurrence,
            updated_at = NOW()
        WHERE id = event_id;
        
    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM school_calendar
        WHERE id = event_id;
        
   -- Enhanced Select Operation
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


SET FOREIGN_KEY_CHECKS =0; 
    TRUNCATE payments;
    TRUNCATE  `students`;
    ALTER TABLE `students` ADD INDEX(`id`);
    ALTER TABLE `students` DROP PRIMARY KEY;
SET FOREIGN_KEY_CHECKS =1; 


DELIMITER $$
DROP PROCEDURE IF EXISTS `assignmentResponses`$$
CREATE PROCEDURE `assignmentResponses`(
    IN `query_type` VARCHAR(10), 
    IN `p_assignment_id` INT, 
    IN `p_question_id` INT, 
    IN `p_admission_no` INT, 
    IN `p_subject` VARCHAR(30), 
    IN `p_response` TEXT, 
    IN `p_class_name` VARCHAR(255))
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
    DROP PROCEDURE IF EXISTS `manage_task_todo`$$
CREATE PROCEDURE manage_task_todo(
    IN op_type VARCHAR(10),
    IN p_id VARCHAR(100),
    IN p_user_id INT(11),
    IN p_title VARCHAR(200),
    IN p_event_for VARCHAR(60),
    IN p_event_category ENUM('Celebration','Training','Holidays','Meeting'),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_start_time TIME,
    IN p_end_time TIME,
    IN p_attachment VARCHAR(500),
    IN p_content TEXT,
    IN p_created_by VARCHAR(50),
    IN p_priority ENUM('High','Medium','Low'),
    IN p_search_keyword VARCHAR(50),
    IN p_limit INT(11),
    IN p_offset INT(11)
)
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

DELIMITER ;


DELIMITER $$
DROP PROCEDURE `teachers`$$
CREATE  PROCEDURE `teachers`(IN `p_id` INT(10), IN `query_type` VARCHAR(10), IN `p_name` VARCHAR(255), IN `p_sex` VARCHAR(10), IN `p_age` INT, IN `p_address` TEXT, IN `p_date_of_birth` DATE, IN `p_marital_status` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_mobile_no` VARCHAR(20), IN `p_email` VARCHAR(100), IN `p_qualification` VARCHAR(255), IN `p_working_experience` TEXT, IN `p_religion` VARCHAR(50), IN `p_last_place_of_work` VARCHAR(255), IN `p_do_you_have` TEXT, IN `p_when_do` DATE, IN `p_account_name` VARCHAR(255), IN `p_account_number` VARCHAR(50), IN `p_bank` VARCHAR(100), IN `p_school_location` VARCHAR(100))
BEGIN
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
            school_location
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
            p_school_location
        );
        
        INSERT INTO users
        (name, email, password, role)
        VALUES(p_name, p_email, '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 'Teacher');
        SELECT id as teacher_id FROM teachers WHERE id = LAST_INSERT_ID();
     ELSEIF query_type = 'select-class' THEN
     	
        SELECT * FROM teacher_classes WHERE teacher_id = p_id;
    ELSEIF query_type = 'select' THEN
        SELECT * FROM teachers WHERE id = p_id;
    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teachers;
        ELSEIF query_type='select_teacher_name' THEN
    		SELECT DISTINCT name FROM `teachers`;
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
DELIMITER ;

DROP TABLE IF EXISTS syllabus;
CREATE TABLE syllabus (
    id INT AUTO_INCREMENT PRIMARY KEY,              
    subject VARCHAR(100) NOT NULL,             
    class_code INT(1) NOT NULL,             
    academic_year YEAR NOT NULL,           
    term VARCHAR(50) NOT NULL,    
    week_no TINYINT(1),
    title VARCHAR(300) NOT NULL,        
    content TEXT NOT NULL,                 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



DROP TABLE IF EXISTS syllabus_tracker;

CREATE TABLE syllabus_tracker (
    id INT AUTO_INCREMENT PRIMARY KEY,              
    syllabus_id INT(11),                                -- References syllabus.id
    subject VARCHAR(100) NOT NULL,             
    class_code INT(1) NOT NULL,              
    term VARCHAR(50) NOT NULL,              
    academic_year YEAR NOT NULL,
    week_no TINYINT(1),
    status ENUM('Pending','Ongoing','Onhold','Completed') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (syllabus_id) REFERENCES syllabus(id) ON DELETE CASCADE
);



DELIMITER $$
DROP PROCEDURE IF EXISTS syllabus$$
CREATE PROCEDURE syllabus(
    IN op_type VARCHAR(10),          
    IN p_id INT,                
    IN p_subject VARCHAR(100), 
    IN p_class_code INT, 
    IN p_academic_year YEAR,
    IN p_term VARCHAR(50),
    IN p_week_no TINYINT,
    IN p_title VARCHAR(300),
    IN p_content TEXT
)
BEGIN
    -- INSERT operation
    IF op_type = 'INSERT' THEN
        INSERT INTO syllabus (subject, class_code, academic_year, term, week_no, title, content)
        VALUES (p_subject, p_class_code, p_academic_year, p_term, p_week_no, p_title, p_content);

    -- UPDATE operation
    ELSEIF op_type = 'UPDATE' THEN
        UPDATE syllabus
        SET 
            subject = COALESCE(p_subject, subject),
            class_code = COALESCE(p_class_code, class_code),
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
          AND (class_code = p_class_code OR p_class_code IS NULL)
          AND (academic_year = p_academic_year OR p_academic_year IS NULL)
          AND (term = p_term OR p_term IS NULL)
          AND (week_no = p_week_no OR p_week_no IS NULL)
          AND (title LIKE CONCAT('%', p_title, '%') OR p_title IS NULL);

    END IF;
END$$

DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS syllabusTracker$$

CREATE PROCEDURE syllabusTracker(
    IN op_type VARCHAR(10),         
    IN p_id INT, 
    IN p_syllabu_id INT, 
    IN p_subject VARCHAR(100),
    IN p_class_code INT,
    IN p_term VARCHAR(50),
    IN p_academic_year YEAR,
    IN p_week_no TINYINT,
    IN p_status ENUM('Pending','Ongoing','Onhold','Completed') 
)
BEGIN
    -- INSERT operation
    IF op_type = 'INSERT' THEN
        INSERT INTO syllabus_tracker (syllabu_id, subject, class_code, term, academic_year, week_no, status)
        VALUES (p_syllabu_id, p_subject, p_class_code, p_term, p_academic_year, p_week_no, p_status);

    -- UPDATE operation
    ELSEIF op_type = 'UPDATE' THEN
        UPDATE syllabus_tracker
        SET 
            syllabu_id = COALESCE(p_syllabu_id, syllabu_id),
            subject = COALESCE(p_subject, subject),
            class_code = COALESCE(p_class_code, class_code),
            term = COALESCE(p_term, term),
            academic_year = COALESCE(p_academic_year, academic_year),
            week_no = COALESCE(p_week_no, week_no),
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
          AND (class_code = p_class_code OR p_class_code IS NULL)
          AND (term = p_term OR p_term IS NULL)
          AND (academic_year = p_academic_year OR p_academic_year IS NULL)
          AND (week_no = p_week_no OR p_week_no IS NULL)
          AND (status = p_status OR p_status IS NULL);
    END IF;
END$$

DELIMITER ;



CREATE TABLE `schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_user() ON UPDATE current_timestamp(),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci


DELIMITER $$
CREATE PROCEDURE `schedules`(
    IN op_type VARCHAR(10),
    IN p_id VARCHAR(100),
    IN p_user_id INT(11),
    IN p_title VARCHAR(200),
    IN p_event_for VARCHAR(60),
    IN p_event_category ENUM('Celebration','Training','Holidays','Meeting'),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_start_time TIME,
    IN p_end_time TIME,
    IN p_attachment VARCHAR(500),
    IN p_content TEXT,
    IN p_created_by VARCHAR(50),
    IN p_priority ENUM('High','Medium','Low'),
    IN p_search_keyword VARCHAR(50),
    IN p_limit INT(11),
    IN p_offset INT(11)
)
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
DROP PROCEDURE IF EXISTS `taskTodos`$$
CREATE PROCEDURE `taskTodos`(
    IN op_type VARCHAR(10),
    IN p_id VARCHAR(100),
    IN p_user_id INT(11),
    IN p_title VARCHAR(200),
    IN p_class_name VARCHAR(60),
    IN p_event_category ENUM('Lesson','E-Class','Homework','Training','Holidays'),
    IN p_due_date DATE,
    IN p_content TEXT,
    IN p_created_by VARCHAR(50),
    IN p_priority ENUM('High','Medium','Low'),
    IN p_status VARCHAR(50),
    IN p_limit INT(11),
    IN p_offset INT(11)
)
BEGIN
    -- Insert Operation
    IF op_type = 'INSERT' THEN
        INSERT INTO task_todos (
            title, class_name, event_categry, start_date, end_date, 
            start_time, end_time, attachment, content, created_by, user_id, priority, status
        )
        VALUES (
            p_title, p_class_name, p_event_category, p_start_date, p_end_date, 
            p_start_time, p_end_time, p_attachment, p_content, p_created_by, p_user_id, p_priority, p_status
        );

    -- Update Operation with COALESCE to handle NULL values
    ELSEIF op_type = 'UPDATE' THEN
        UPDATE task_todos
        SET 
            title = COALESCE(p_title, title),
            class_name = COALESCE(p_class_name, class_name),
            event_categry = COALESCE(p_event_category, event_categry),
            due_date = COALESCE(p_start_date, start_date),
            end_date = COALESCE(p_end_date, end_date),
            start_time = COALESCE(p_start_time, start_time),
            end_time = COALESCE(p_end_time, end_time),
            attachment = COALESCE(p_attachment, attachment),
            content = COALESCE(p_content, content),
            priority = COALESCE(p_priority, priority),
            status = COALESCE(p_status, status),
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
          AND (p_date_filter IS NULL OR (due_date <= p_date_filter AND end_date >= p_date_filter)) -- Date range filter
          AND (p_status IS NULL OR 
               (title LIKE CONCAT('%', p_status, '%') OR content LIKE CONCAT('%', p_status, '%'))); -- Keyword filter

    ELSE
        SELECT 'Invalid Operation' AS message;
    END IF;

END$$
DELIMITER ;


DELIMITER $$

DROP  PROCEDURE IF EXISTS `teacher_classes`$$

CREATE  PROCEDURE `teacher_classes`(
    IN `query_type` VARCHAR(50), 
IN `in_id` INT(11), 
IN `in_teacher_id` INT(11), 
IN `in_subject` VARCHAR(50), 
IN `in_section` VARCHAR(50), 
IN `in_class_name` VARCHAR(50), 
IN `in_class_code` INT(2))
BEGIN
    IF query_type ='create' THEN
        INSERT INTO `teacher_classes`(`teacher_id`, `subject`, `section`, `class_name`, `class_code`) 
        VALUES (`in_teacher_id`, `in_subject`, `in_section`, `in_class_name`, `in_class_code`) ;
    ELSEIF query_type='select' THEN
        SELECT * FROM `teacher_classes` WHERE teacher_id = in_teacher_id;
    ELSEIF query_type='select-all' THEN
        SELECT * FROM `teacher_classes`;
    END IF;
END$$
DELIMITER ;

ALTER TABLE `teachers` ADD `user_id` INT NOT NULL AFTER `id`; ALTER TABLE `teachers` ADD `role` VARCHAR(20) NOT NULL DEFAULT 'Teacher' AFTER `user_id`;



DELIMITER $$
CREATE PROCEDURE `teacher_classes`(
    IN `query_type` VARCHAR(50), 
IN `in_id` INT(11), 
IN `in_teacher_id` INT(11), 
IN `in_subject` VARCHAR(50), 
IN `in_section` VARCHAR(50), 
IN `in_class_name` VARCHAR(50), 
IN `in_class_code` INT(2))
BEGIN
    IF query_type ='create' THEN
        INSERT INTO `teacher_classes`(`teacher_id`, `subject`, `section`, `class_name`, `class_code`) 
        VALUES (`in_teacher_id`, `in_subject`, `in_section`, `in_class_name`, `in_class_code`) ;
    ELSEIF query_type='select' THEN
        SELECT * FROM `teacher_classes` WHERE teacher_id = in_teacher_id;
    ELSEIF query_type='select-all' THEN
        SELECT * FROM `teacher_classes`;
    ELSEIF query_type='update' THEN 
        UPDATE `teacher_classes` 
            SET 
                `subject` = COALESCE(in_subject, `subject`), 
                `section` = COALESCE(in_section, `section`), 
                `class_name` = COALESCE(in_class_name, `class_name`), 
                `class_code` = COALESCE(in_class_code, `class_code`)
            WHERE `id` = in_id; -- Specify which row to update using in_id
    
    END IF;   
    END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS `exam_calendar`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `exam_calendar`(
    IN query_type VARCHAR(50),
    IN in_id INT UNSIGNED,
    IN in_admin_id INT,
    IN in_exam_name VARCHAR(100),
    IN in_academic_year VARCHAR(45),
    IN in_term VARCHAR(50),
    IN in_start_date DATE,
    IN in_end_date DATE
)
BEGIN
    IF query_type = 'create' THEN
        INSERT INTO exam_calendar (admin_id, exam_name, academic_year, term, start_date, end_date)
        VALUES (in_admin_id, in_exam_name, in_academic_year, in_term, in_start_date, in_end_date);

    ELSEIF query_type = 'update' THEN
        UPDATE exam_calendar
        SET exam_name = COALESCE(in_exam_name,exam_name),
            academic_year = COALESCE(in_academic_year,academic_year),
            term = COALESCE(in_term,term),
            start_date = COALESCE(in_start_date,start_date),
            end_date = COALESCE(in_end_date,end_date)
        WHERE id = in_id;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM exam_calendar
        WHERE id = in_id;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM exam_calendar
        WHERE id = in_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM exam_calendar;

    END IF;
END$$
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `examinations` $$

CREATE 
    PROCEDURE `examinations`(
        IN `query_type` VARCHAR(50), 
    IN `in_id` INT(11), 
    IN `in_schedule_id` INT(11), 
    IN `in_title` VARCHAR(50), 
    IN `in_class_name` VARCHAR(50), 
    IN `in_subject` VARCHAR(50), 
    IN `in_exam_type` VARCHAR(50), 
    IN `in_duration` VARCHAR(60), 
    IN `in_start_time` VARCHAR(12), 
    IN `in_end_time` VARCHAR(12), 
    IN `in_invigilator` VARCHAR(50), 
    IN `in_exam_date` DATE)
BEGIN
IF query_type="create" THEN
INSERT INTO `examinations` (schedule_id, title, class_name, subject, exam_type, duration, start_time, end_time, invigilator, exam_date) 
VALUES (in_schedule_id, in_title, in_class_name, in_subject, in_exam_type, in_duration, in_start_time,in_end_time, in_invigilator, in_exam_date);

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
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `syllabus`$$
CREATE  PROCEDURE `syllabus`(
    IN `query_type` VARCHAR(50), 
    IN `p_id` INT, 
    IN `p_subject` VARCHAR(100), 
    IN `p_class_code`VARCHAR(100), 
    IN `p_term` VARCHAR(50), 
    IN `p_week` TINYINT, 
    IN `p_title` VARCHAR(300), 
    IN `p_content` TEXT, 
    IN `p_status` VARCHAR(30))
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
          AND (academic_year = p_academic_year OR p_academic_year IS NULL)
          AND (term = p_term OR p_term IS NULL)
          AND (status = p_status OR p_status IS NULL)
          AND (title LIKE CONCAT('%', p_title, '%') OR p_title IS NULL);

    END IF;
END$$
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS   `classes`$$

CREATE  PROCEDURE `classes`(
IN `query_type` VARCHAR(50), 
IN `in_id` INT, 
IN `in_class_name` VARCHAR(100), 
IN `in_class_code` VARCHAR(100), 
IN `in_section` VARCHAR(100), 
IN `in_level` INT, 
IN `in_school_location` VARCHAR(200), 
IN `in_capacity` VARCHAR(10))
BEGIN
    IF query_type = 'create' THEN
        -- Insert a new class record
        INSERT INTO `classes`(`class_name`, `class_code`, `section`, `level`, `school_location`, `capacity`)
        VALUES (in_class_name, in_class_code, in_section, in_level, in_school_location, in_capacity);
    
    ELSEIF query_type = 'update' THEN
        -- Update an existing class record based on `in_id`
        UPDATE `classes`
        SET `class_name` = COALESCE(in_class_name,class_name),
            `class_code` = COALESCE(class_code,in_class_code),
            `section` = COALESCE(section,in_section),
            `level` = COALESCE(level,in_level),
            `school_location` = COALESCE(school_location,in_school_location),
            `capacity` = COALESCE(capacity,in_capacity)
        WHERE `id` = in_id;
        
    ELSEIF query_type = 'select' THEN

        SELECT * FROM `classes`
         WHERE (id = in_id OR in_id IS NULL)
          AND (class_name = in_class_name OR in_class_name IS NULL)
          AND (class_code = in_class_code OR in_class_code IS NULL)
          AND (level = in_level OR in_level IS NULL)
          AND (in_school_location = in_school_location OR in_school_location IS NULL);

    ELSEIF query_type = 'select-all' THEN
        -- Select all classes
        SELECT * FROM `classes`;

    ELSEIF query_type = 'select-level' THEN
        -- Select classes based on `in_level`
        SELECT * FROM `classes`
        WHERE `level` = in_level;

    ELSEIF query_type = 'select-sections' THEN
        -- Select classes based on `in_section`
        SELECT DISTINCT section AS section FROM `classes`;

     ELSEIF query_type = 'select-section-classes' THEN
        -- Select classes based on `in_section`
        SELECT * FROM `classes`
        WHERE `section` = in_section ORDER BY class_name ASC;
	ELSEIF query_type = 'select-unique-classes' THEN
    	 SELECT CONCAT(section,' ', level) as class_group, section, level  FROM `classes` GROUP BY section, level;

    END IF;

END$$
DELIMITER ;




DELIMITER $$

DROP PROCEDURE IF EXISTS `teacher_classes`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `teacher_classes`(
    IN `query_type` VARCHAR(50), 
    IN `in_id` INT(11), 
    IN `in_teacher_id` INT(11), 
    IN `in_subject` VARCHAR(50), 
    IN `in_section` VARCHAR(50), 
    IN `in_class_name` VARCHAR(50), 
    IN `in_class_code` VARCHAR(50))
    BEGIN
        DECLARE x_class_code VARCHAR(30);

    IF query_type ='create' THEN
        SELECT class_code INTO x_class_code FROM classes WHERE class_name = in_class_name;

        INSERT INTO `teacher_classes`(`teacher_id`, `subject`, `section`, `class_name`, `class_code`) 
        VALUES (`in_teacher_id`, `in_subject`, `in_section`, `in_class_name`, x_class_code) ;
    ELSEIF query_type='select' THEN
        SELECT * FROM `teacher_classes` WHERE teacher_id = in_teacher_id;
    ELSEIF query_type='select-all' THEN
        SELECT * FROM `teacher_classes`;
    ELSEIF query_type='update' THEN 
        UPDATE `teacher_classes` 
            SET 
                `subject` = COALESCE(in_subject, `subject`), 
                `section` = COALESCE(in_section, `section`), 
                `class_name` = COALESCE(in_class_name, `class_name`), 
                `class_code` = COALESCE(in_class_code, `class_code`)
            WHERE `id` = in_id; -- Specify which row to update using in_id
    
    END IF;   
END$$
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `students_queries`$$
CREATE PROCEDURE `students_queries`(
    IN `query_type` VARCHAR(30), 
    IN `p_id` INT, 
    IN `p_parent_id` INT, 
    IN `p_guardian_id` INT, 
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
    IN `p_school_location` VARCHAR(300))
BEGIN
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
            school_location
        )
        VALUES (
            p_parent_id, p_guardian_id, p_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
            p_l_g_a, p_nationality, p_last_school_atterded, p_special_health_needs, p_blood_group, 
            p_academic_year, p_status, p_section, p_mother_tongue, p_language_known, p_current_class, p_profile_picture, p_medical_condition,
            p_transfer_certificate,p_school_location
        );
        SELECT * FROM students WHERE id = LAST_INSERT_ID(); 
    -- SELECT query_type
    ELSEIF query_type = 'select-class' THEN
        SELECT * FROM students WHERE current_class = p_current_class;
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

    -- Append WHERE clause if any condition was added
    IF @where_clause != '' THEN
        SET @query = CONCAT(@query, ' WHERE ', @where_clause);
    END IF;

    -- Execute the dynamic query
    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

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
DELIMITER ;

DROP TABLE IF EXISTS leave_records;

CREATE TABLE leave_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_role VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    no_of_days INT NOT NULL,
    applied_on DATE NOT NULL DEFAULT DATE(NOW()),
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL,
    approved_by VARCHAR(50) NOT NULL
);

DELIMITER $$


DELIMITER $$
DROP PROCEDURE IF EXISTS `leaveRecords`$$
CREATE PROCEDURE `leaveRecords`(
    IN query_type VARCHAR(10),
    IN in_record_id INT,
    IN in_user_id VARCHAR(50),
    IN in_user_role VARCHAR(50),
    IN in_user_name VARCHAR(50),
    IN in_class_name VARCHAR(50),
    IN in_type VARCHAR(50),
    IN in_start_date DATE,
    IN in_end_date DATE,
    IN in_no_of_days INT,
    IN in_applied_on DATE,
    IN in_status ENUM('Pending', 'Approved', 'Rejected'),
    IN in_approved_by VARCHAR(50),
    IN in_approved_on DATE,
    IN in_school_location VARCHAR(200)
)
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
DROP  PROCEDURE IF EXISTS `student_grading`$$
CREATE PROCEDURE `student_grading`(
    IN `query_type` ENUM('create', 'select', 'delete'), 
    IN `in_id` INT,
    IN `in_calendar_id` INT,
    IN `in_admission_no` VARCHAR(100), 
    IN `in_student_name` VARCHAR(100), 
    IN `in_subject` VARCHAR(100), 
    IN `in_class_name` VARCHAR(100), 
    IN `in_academic_year` VARCHAR(20), 
    IN `in_term` VARCHAR(20), 
    IN `in_ca1Score` DOUBLE(5,2), 
    IN `in_ca2Score` DOUBLE(5,2), 
    IN `in_examScore` DOUBLE(5,2), 
    IN `in_mark_by` VARCHAR(100)
)
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
        FROM grading_rules
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
                mark_by
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
                in_mark_by
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
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `exam_calendar`$$
CREATE PROCEDURE `exam_calendar`(
    IN query_type VARCHAR(50),
    IN in_id INT UNSIGNED,
    IN in_admin_id INT,
    IN in_exam_name VARCHAR(100),
    IN in_academic_year VARCHAR(45),
    IN in_term VARCHAR(50),
    IN in_start_date DATE,
    IN in_end_date DATE,
    IN in_status VARCHAR(30)
)
BEGIN
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
DELIMITER ;

DROP  TABLE IF EXISTS book_supplies;

CREATE TABLE book_supplies (
    record_id INT(6) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    book_title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    cover_img VARCHAR(255),
    status ENUM('Available', 'Reserved') DEFAULT 'Available',
    qty INT DEFAULT 0,
    post_date DATE,
    publisher VARCHAR(255),
    subject VARCHAR(255),
    book_no VARCHAR(50),
    UNIQUE (isbn)
);

DROP  TABLE IF EXISTS `library_catalogue`;
CREATE TABLE `library_catalogue` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `book_title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255) NOT NULL,
  `isbn` VARCHAR(20) NOT NULL,
  `cover_img` VARCHAR(500) DEFAULT NULL,
  `borrower_name` VARCHAR(255) DEFAULT NULL,
  `date_borrowed` DATE DEFAULT NULL,
  `due_date` DATE DEFAULT NULL,
  `return_date` DATE DEFAULT NULL,
  `status` ENUM('Available', 'Borrowed', 'Overdue') DEFAULT 'Available',
  `qty` INT DEFAULT 0,
  `post_date` DATE DEFAULT NULL,
  `rack_no` VARCHAR(255) DEFAULT NULL,
  `publisher` VARCHAR(255) DEFAULT NULL,
  `subject` VARCHAR(255) DEFAULT NULL,
  `book_no` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

DELIMITER $$
DROP PROCEDURE IF EXISTS libraryCatalogue $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `libraryCatalogue`(
    IN query_type ENUM('CREATE', 'UPDATE', 'RETURN','SELECT'),
    IN in_book_title VARCHAR(255),
    IN in_author VARCHAR(255),
    IN in_isbn VARCHAR(20),
    IN in_cover_img VARCHAR(500),
    IN in_borrower_name VARCHAR(255),
    IN in_date_borrowed DATE,
    IN in_due_date DATE,
    IN in_return_date DATE,
    IN in_status ENUM('Available', 'Borrowed', 'Overdue'),
    IN in_qty INT,
    IN in_post_date DATE,
    IN in_rack_no VARCHAR(255),
    IN in_publisher VARCHAR(255),
    IN in_subject VARCHAR(255),
    IN in_book_no VARCHAR(50),
    IN in_record_id INT
)
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
DROP PROCEDURE IF EXISTS bookSupplies $$
CREATE PROCEDURE bookSupplies(
    IN p_action VARCHAR(20),
    IN p_record_id INT,
    IN p_book_title VARCHAR(255),
    IN p_author VARCHAR(255),
    IN p_isbn VARCHAR(20),
    IN p_cover_img VARCHAR(255),
    IN p_status ENUM('Available', 'Reserved'),
    IN p_qty INT,
    IN p_post_date DATE,
    IN p_publisher VARCHAR(255),
    IN p_subject VARCHAR(255),
    IN p_book_no VARCHAR(50)
)
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
            book_title = COALESCE(p_book_title,book_title),
            author = COALESCE(p_author,author),
            cover_img = COALESCE(p_cover_img,cover_img),
            status = COALESCE(p_status,
            qty = COALESCE(p_qty,qty),
            post_date = COALESCE(p_post_date,post_date),
            publisher = COALESCE(p_publisher,
            subject = COALESCE(p_subject,publisher),
            book_no = COALESCE(p_book_no,book_no)
        WHERE record_id = p_record_id;
    ELSEIF p_action = 'DELETE' THEN
        DELETE FROM book_supplies WHERE record_id = p_record_id;
    END IF;
END $$

DELIMITER ;


DELIMITER $$
DROP PROCEDURE  IF EXISTS `grade_setup` $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `grade_setup`(
    IN `query_type` VARCHAR(100), 
    IN `in_id` INT(10), 
    IN `in_grade` VARCHAR(50), 
    IN `in_remark` VARCHAR(50), 
    IN `in_min_score` INT(3), 
    IN `in_max_score` INT(3),
    IN `in_status` VARCHAR(30))
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




// SCHOOLY

UPDATE `classes` SET `school_id` = '1';

ALTER TABLE `classes` ADD  FOREIGN KEY (`school_id`) REFERENCES `school_setup`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;


ALTER TABLE `subjects` ADD `school_id` INT NOT NULL AFTER `subject`;
ALTER TABLE `subjects` ADD INDEX(`id`);

UPDATE `subjects` SET `school_id` = '1';

ALTER TABLE `subjects` ADD  CONSTRAINT `sch_subject_fk` FOREIGN KEY (`school_id`) REFERENCES `school_setup`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `users` ADD `school_id` INT(6) NOT NULL AFTER `password`;
UPDATE `users` SET `school_id` = '1' ;

ALTER TABLE `students` ADD `school_id` INT(11) NOT NULL AFTER `school_location`;
UPDATE `students` SET `school_id` = '1';

DROP TABLE `account_chart`;

CREATE TABLE `account_chart` (
  `code` bigint(6) unsigned zerofill NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `description` varchar(100) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `term` enum('First term','Second term','Third term','Per Annum') DEFAULT NULL,
  `class_name` varchar(50) NOT NULL DEFAULT 'All Classes',
  `section` varchar(100) DEFAULT NULL,
  `revenue_type` enum('Fees','Charges','Fines','Sales','Earnings') NOT NULL DEFAULT 'Fees',
  `is_optional` enum('Yes','No') NOT NULL DEFAULT 'No',
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `school_location` varchar(300) DEFAULT NULL,
  `school_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  KEY `school_id` (`school_id`),
  CONSTRAINT `account_chart_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `school_setup` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DELIMITER $$
DROP PROCEDURE `account_chart`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `account_chart`(IN `query_type` VARCHAR(100), 
IN `in_id` VARCHAR(11), 
IN `in_description` VARCHAR(100), 
IN `in_amount` DECIMAL(10,2), 
IN `in_term` ENUM('First term','Second term','Third term','Per Annum'), 
IN `in_section` VARCHAR(100), 
IN `in_class_name` VARCHAR(100), 
IN `in_revenue_type` ENUM('Fees', 'Charges', 'Fines', 'Sales', 'Earnings'), 
IN `in_is_optional` ENUM('Yes', 'No') ,
IN `in_status` ENUM('Active','Inactive'), 
IN `in_school_location` VARCHAR(100), 
IN `in_school_id` VARCHAR(11))
BEGIN
IF query_type="create" THEN
   INSERT INTO `account_chart`(`description`, `amount`, `term`, `section`, `class_name`, `revenue_type`, `is_optional`, `status`, `school_location`, `school_id`) 
   VALUES (`in_description`,  `in_amount`, `in_term`, `in_section`, `in_class_name`, `in_revenue_type`,  `in_is_optional`, `in_status`, `in_school_location`, `in_school_id`);
ELSEIF query_type="select-all" THEN
    SELECT * FROM account_chart;

ELSEIF query_type="select" THEN
    SET @query = 'SELECT * FROM account_chart';
    SET @where_clause = '';

    IF in_section IS NOT NULL AND in_section !='' THEN 
        SET @where_clause = CONCAT(@where_clause, 'section = "', in_section, '"');
    END IF;
    IF in_class_name IS NOT NULL AND in_class_name!='' THEN
          SET @where_clause = IF(@where_clause = '', 
            CONCAT('class_name = "', in_class_name, '"'),
            CONCAT(@where_clause, ' OR class_name = "', 'All Classes', '"')
        );
    END IF;
    IF in_term IS NOT NULL AND in_term !='' THEN
          SET @where_clause = IF(@where_clause = '', 
            CONCAT('term = "', in_term, '"'),
            CONCAT(@where_clause, ' AND term = "', in_term, '"')

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
ELSEIF query_type ='select-revenues' THEN
    SELECT * FROM account_chart 
        WHERE class_name IN ('All Classes',in_class_name)
        AND (section = in_section OR in_section IS NULL)
        OR  term IN (in_term, 'Per Annum')
        AND  (school_id = in_school_id OR in_school_id IS NULL);
END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS `classes`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `classes`(
IN `query_type` VARCHAR(50), 
IN `in_id` INT, 
IN `in_class_name` VARCHAR(100), 
IN `in_class_code` VARCHAR(100), 
IN `in_section` VARCHAR(100), 
IN `in_school_location` VARCHAR(200), 
IN `in_school_id` VARCHAR(10))
BEGIN
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
        SELECT * FROM `classes`;

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
        WHERE `section` = in_section ORDER BY class_name ASC;
	ELSEIF query_type = 'select-unique-classes' THEN
    	 SELECT CONCAT(section,' ', class_code) as class_group, section, class_code  FROM `classes` GROUP BY section, class_code,class_name;

    END IF;

END$$
DELIMITER ;






DELIMITER $$
DROP PROCEDURE `manage_payments` $$
CREATE  PROCEDURE `manage_payments`(
    IN `query_type` VARCHAR(100),
    IN `in_id` INT,
    IN `in_admission_no` INT,
    IN `in_ref_no` INT,
    IN `in_item_code` INT,
    IN `in_description` VARCHAR(100),
    IN `in_amount` DECIMAL(10, 2),
    IN `in_qty` TINYINT(2),
    IN `in_academic_year` VARCHAR(9),
    IN `in_term` VARCHAR(9),
    IN `in_status` ENUM('Paid','Unpaid'),
    IN `in_payment_date` DATE,
    IN `in_mode` VARCHAR(255),
    IN `in_created_by`  VARCHAR(255),
    IN `in_limit` INT,
    IN `in_offset` INT,
    IN `start_date` DATE,
    IN `end_date` DATE
)
BEGIN
    IF query_type = "create" THEN
     INSERT INTO `payments`(`ref_no`, `item_code`, `description`, `admission_no`, `amount`, `qty`, `term`, `academic_year`, `amount_paid`, `status`,  `mode`, `created_by`)
     VALUES (`in_ref_no`, `in_item_code`, `in_description`, `in_admission_no`, `in_amount`, `in_qty`, `in_term`, `in_academic_year`, 0, 'Unpaid', `in_payment_date`, `in_mode`, `in_created_by`);
    ELSEIF query_type = "update" THEN
        UPDATE `payments`
        SET student_id = COALESCE(in_student_id, student_id),
            admission_no = COALESCE(in_admission_no, admission_no),
            ref_no = COALESCE(in_ref_no, ref_no),
            item_code = COALESCE(in_item_code, item_code),
            description = COALESCE(in_description, description),
            amount = COALESCE(in_amount, amount),
            qty = COALESCE(in_qty, qty),
            school_location = COALESCE(in_school_location, school_location),
            academic_year = COALESCE(in_academic_year, academic_year),
            status = COALESCE(in_status, status),
            payment_date = COALESCE(in_payment_date, payment_date),
            mode = COALESCE(in_mode, mode),
            due_date = COALESCE(in_due_date, due_date),
            updated_at = COALESCE(in_updated_at, CURRENT_TIMESTAMP)
        WHERE id = in_id;

    ELSEIF query_type = "select-ref" THEN
        SELECT * FROM `payments` WHERE ref_no = in_ref_no;
    ELSEIF query_type = "select-id" THEN 
            SELECT * FROM `payments` WHERE id = in_id;
    ELSEIF query_type = "select-student" THEN 
              SELECT * FROM `payments` WHERE student_id = in_student_id;
    END IF;
END$$
DELIMITER ;




DELIMITER $$
DROP PROCEDURE `account_chart`$$
CREATE  PROCEDURE `account_chart`(
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
    IN `in_school_id` VARCHAR(11))
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
DROP  PROCEDURE IF EXISTS `manage_payments`$$
CREATE  PROCEDURE `manage_payments`(
    
    IN `query_type` VARCHAR(100), 
    IN `in_id` VARCHAR(11), 
    IN `in_admission_no` VARCHAR(100), 
    IN `in_class_name` VARCHAR(100), 
    IN `in_ref_no` INT, 
    IN `in_item_code` VARCHAR(100), 
    IN `in_description` VARCHAR(100), 
    IN `in_amount` DECIMAL(8,2), 
    IN `in_discount` DECIMAL(8,2), 
    IN `in_fines` DECIMAL(8,2), 
    IN `in_qty` INT(3), 
    IN `in_academic_year` VARCHAR(9), 
    IN `in_term` VARCHAR(20), 
    IN `in_status` ENUM('Paid','Unpaid'), 
    IN `in_due_date` DATE, 
    IN `in_payment_date` DATE, 
    IN `in_mode` VARCHAR(255), 
    IN `in_created_by` VARCHAR(255), 
    IN `in_limit` INT, 
    IN `in_offset` INT, 
    IN `start_date` DATE, 
    IN `end_date` DATE)
BEGIN
    IF query_type = "create" THEN
        INSERT INTO `payments`(`ref_no`, `item_code`, `description`, `admission_no`, `class_name`, `amount`, `qty`, `term`, `academic_year`, `discount`, `fines`,  due_date,  `created_by`)
        VALUES (`in_ref_no`, `in_item_code`, `in_description`, `in_admission_no`, `in_class_name`, `in_amount`, `in_qty`, `in_term`, `in_academic_year`, in_discount, in_fines, `in_due_date`, `in_created_by`);
  
   ELSEIF query_type = 'select-bils' THEN
        SELECT 
            s.student_name, 
            s.current_class AS class_name, 
            s.admission_no, 
            COALESCE(p.term, in_term) AS term, -- Use the input term if no payments exist
            COUNT(p.item_code) AS invoice_count, -- Count items per student (will be 0 if no payments)
            COALESCE(SUM(p.amount), 0) AS total_invoice, -- Ensure 0 when no payments
            COALESCE(p.status, 'No Payments') AS status -- Show 'No Payments' if no matching records
        FROM 
            students s 
        LEFT JOIN 
            payments p 
        ON 
            s.admission_no = p.admission_no
            AND s.current_class = p.class_name
            AND (p.term = in_term OR in_term IS NULL)
        WHERE 
            s.current_class = in_class_name -- Include only students in the input class
        GROUP BY 
            s.student_name, 
            s.current_class, 
            s.admission_no, 
            p.term, 
            p.status
        ORDER BY 
            s.student_name;

    ELSEIF query_type = "update-paid" THEN
        UPDATE `payments`
            SET amount_paid = COALESCE(in_amount, amount_paid),
            `status` = COALESCE(in_status, `status`),
            payment_date = COALESCE(in_payment_date, payment_date),
            `mode` = COALESCE(in_mode, `mode`)
        WHERE ref_no = in_ref_no;

    ELSEIF query_type = "select-ref" THEN
        SELECT * FROM `payments` WHERE ref_no = in_ref_no;
    ELSEIF query_type = "select-id" THEN 
            SELECT * FROM `payments` WHERE id = in_id;
    ELSEIF query_type = "select-student" THEN 
              SELECT * FROM `payments` WHERE student_id = in_student_id;
    ELSEIF query_type = "select" THEN 
        SELECT * 
            FROM `payments`
           -- WHERE class_name = in_class_name
           -- AND 
            WHERE (admission_no = in_admission_no OR in_admission_no IS NULL)
            AND term = in_term;
            -- AND (status = in_status OR in_status IS NULL);

    END IF;
END$$
DELIMITER ;

DELIMITER //
DROP TRIGGER IF EXISTS `before_insert_admission_no_gen`//

CREATE OR UPDATE  TRIGGER `before_insert_admission_no_gen` BEFORE INSERT ON `admission_no_gen` FOR EACH ROW BEGIN
  DECLARE max_serial INT;

  -- Find the maximum serial_no for the given prefix and school_location
  SELECT COALESCE(MAX(serial_no), 0) INTO max_serial
  FROM admission_no_gen
  WHERE  school_location = NEW.school_location;

  -- Increment the serial_no
  SET NEW.serial_no = max_serial + 1;
END //

DELIMITER //
DROP TRIGGER IF EXISTS `after_app_update`//

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
END //


DELIMITER //
DROP TRIGGER IF EXISTS `generate_admission_no` //
CREATE TRIGGER `generate_admission_no` BEFORE INSERT ON `students` FOR EACH ROW BEGIN
  DECLARE location_prefix VARCHAR(10);
  DECLARE next_serial INT;

  -- Validate if the school_location is not null or empty
  IF NEW.school_location IS NULL OR TRIM(NEW.school_location) = '' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'School location cannot be null or empty for admission number generation';
  END IF;

  -- Fetch the prefix and current serial_no for the provided school_location
  SELECT `prefix`, `serial_no`
  INTO location_prefix, next_serial
  FROM `admission_no_gen`
  WHERE `school_location` = NEW.school_location AND `status` = 'Active'
  LIMIT 1;

  -- Check if no matching record was found
  IF location_prefix IS NULL OR next_serial IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid school location or no active record in admission_no_gen';
  END IF;

  -- Increment the serial number
  SET next_serial = next_serial + 1;

  -- Update the admission_no_gen table with the new serial number
  UPDATE `admission_no_gen`
  SET `serial_no` = next_serial
  WHERE `school_location` = NEW.school_location;

  -- Generate the admission number
  SET NEW.admission_no = CONCAT(location_prefix, LPAD(next_serial, 4, '0'));
END //



DELIMITER $$
DROP   PROCEDURE IF exists `school_setup` $$
CREATE  PROCEDURE `school_setup`(
    IN `query_type` VARCHAR(10), 
IN `p_id` INT, 
IN `p_school_name` VARCHAR(500), 
IN `p_short_name` VARCHAR(10), 
IN `p_academic_year` VARCHAR(20), 
IN `p_session_start_date` DATE, 
IN `p_session_end_date` DATE, 
IN `p_status` VARCHAR(20), 
IN `p_badge_url` VARCHAR(500), 
IN `p_mission` VARCHAR(500), 
IN `p_vission` VARCHAR(500), 
IN `p_about_us` VARCHAR(500), 
IN `p_school_motto` VARCHAR(300), 
IN `p_state` VARCHAR(100), 
IN `p_lga` VARCHAR(100), 
IN `p_address` VARCHAR(255), 
IN `p_primary_contact_number` INT(18), 
IN `p_secondary_contact_number` INT(18), 
IN `p_email` VARCHAR(70), 
IN `p_school_master` TINYINT(1), 
IN `p_express_finance` TINYINT(1), 
IN `p_cbt_center` TINYINT(1), 
IN `p_result_station` TINYINT(1)
BEGIN
    IF query_type = 'CREATE' THEN
    INSERT INTO `school_setup`(`school_id`, `school_name`, `short_name`, `school_motto`, `state`, `lga`, `address`,      			`primary_contact_number`, `secondary_contact_number`, `email`, `school_master`, `express_finance`, 					`cbt_center`, `result_station`, `academic_year`, `session_start_date`, `session_end_date`, `status`, 						`badge_url`, `mission`, `vission`, `about_us`)
        VALUES (
            p_school_id,  p_school_name, p_short_name,p_school_motto, p_state, p_lga, p_address, p_primary_contact_number, 				p_secondary_contact_number, p_email, p_school_master, p_express_finance, p_cbt_center, p_result_station,  			  p_academic_year, p_session_start_date, p_session_end_date,
            p_status, p_badge_url, p_mission, p_vission, p_about_us
        );

    ELSEIF query_type = 'select' THEN
        SELECT * FROM school_setup;

    ELSEIF query_type = 'UPDATE' THEN
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
            academic_year = p_academic_year,
            session_start_date = p_session_start_date,
            session_end_date = p_session_end_date,
            status = p_status,
            badge_url = p_badge_url,
            mission = p_mission,
            vission = p_vission,
            about_us = p_about_us
        WHERE id = p_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM school_setup WHERE id = p_id;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type type';
    END IF;
END$$
DELIMITER ;

-- UPDATE 

ALTER TABLE `school_setup` ADD `serial_no` INT(11) NOT NULL DEFAULT '0' AFTER `id`;

DELIMITER $$

CREATE TRIGGER generate_admission_no_if_null
BEFORE INSERT ON students
FOR EACH ROW
BEGIN
  DECLARE in_short_name VARCHAR(10);
  DECLARE next_serial INT;

  -- Validate if the school_id is not null or empty
  IF NEW.school_id IS NULL OR TRIM(NEW.school_id) = '' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'School id cannot be null or empty for admission number generation';
  END IF;

  -- Fetch the prefix and current serial_no for the provided school_id
  SELECT `short_name`, `serial_no`
  INTO in_short_name, next_serial
  FROM `school_setup`
  WHERE `school_id` = NEW.school_id AND `status` = 'Active'
  LIMIT 1;

  -- Check if no matching record was found
  IF in_short_name IS NULL OR next_serial IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid school_id or no active record in school_setup';
  END IF;

  -- Increment the serial number
  SET next_serial = next_serial + 1;

  -- Update the school_setup table with the new serial number
  UPDATE `school_setup`
  SET `serial_no` = next_serial
  WHERE `school_id` = NEW.school_id;

  -- Generate the admission number
  SET NEW.admission_no = CONCAT(in_short_name, LPAD(next_serial, 4, '0'));
END$$

DELIMITER ;


-- 27/1/2025

ALTER TABLE `students` ADD `phone_number` VARCHAR(14) NULL DEFAULT NULL AFTER `home_address`, ADD `email` VARCHAR(50) NULL DEFAULT NULL AFTER `phone_number`;



DELIMITER $$
DROP  PROCEDURE IF EXISTS `school_setup` $$
CREATE  PROCEDURE `school_setup`(
    IN `query_type` VARCHAR(10), 
IN `p_id` VARCHAR(10), 
IN `p_school_name` VARCHAR(500), 
IN `p_short_name` VARCHAR(10), 
IN `p_academic_year` VARCHAR(20), 
IN `p_session_start_date` DATE, 
IN `p_session_end_date` DATE, 
IN `p_status` VARCHAR(20), 
IN `p_badge_url` VARCHAR(500), 
IN `p_mission` VARCHAR(500), 
IN `p_vission` VARCHAR(500), 
IN `p_about_us` VARCHAR(500), 
IN `p_school_motto` VARCHAR(300), 
IN `p_state` VARCHAR(100), 
IN `p_lga` VARCHAR(100), 
IN `p_address` VARCHAR(255), 
IN `p_primary_contact_number` VARCHAR(13), 
IN `p_secondary_contact_number` VARCHAR(13), 
IN `p_email` VARCHAR(70), 
IN `p_school_master` TINYINT(1), 
IN `p_express_finance` TINYINT(1), 
IN `p_cbt_center` TINYINT(1), 
IN `p_result_station` TINYINT(1), 
IN `p_nursery` TINYINT(1), 
IN `p_primary` TINYINT(1), 
IN `p_junior_secondary` TINYINT(1), 
IN `p_senior_secondary` TINYINT(1), 
IN `p_islamiyya` TINYINT(1), 
IN `p_tahfiz` TINYINT(1))
BEGIN
    IF query_type = 'CREATE' THEN
    INSERT INTO `school_setup`(`id`, `school_name`, `short_name`, `school_motto`, `state`, `lga`, `address`,      			`primary_contact_number`, `secondary_contact_number`, `email`, `school_master`, `express_finance`, 					`cbt_center`, `result_station`, `academic_year`, `session_start_date`, `session_end_date`, `status`, 						`badge_url`, `mission`, `vission`, `about_us`,`nursery_section`,`primary_section`,`junior_secondary_section`,`senior_secondary_section`,`islamiyya`,`tahfiz`)
        VALUES (
	            p_id,  p_school_name, p_short_name,p_school_motto, p_state, p_lga, p_address, p_primary_contact_number, 						 	      
            	p_secondary_contact_number, p_email, p_school_master, p_express_finance, p_cbt_center, p_result_station,  			 
            	p_academic_year, p_session_start_date, p_session_end_date,
            	p_status, p_badge_url, p_mission, p_vission, p_about_us,p_nursery,p_primary,p_junior_secondary,p_senior_secondary,p_islamiyya,p_tahfiz
        );
        INSERT INTO users
        (name, email, username, role, password, school_id)
        VALUES(p_school_name, p_email,p_short_name, 'Admin', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', p_id );
        SELECT p_id AS school_id;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM school_setup;
    ELSEIF query_type = 'update' THEN
        UPDATE school_setup
        SET
            status = p_status
        WHERE id = p_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM school_setup WHERE id = p_id;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type type';
    END IF;
END$$
DELIMITER ;

ALTER TABLE `school_setup` ADD `serial_no` INT NOT NULL DEFAULT '0' AFTER `id`;
DELIMITER $$


DROP PROCEDURE IF EXISTS `manage_payments`$$ 
CREATE PROCEDURE `manage_payments`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_admission_no` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_ref_no` INT, IN `in_item_code` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(8,2), IN `in_discount` DECIMAL(8,2), IN `in_fines` DECIMAL(8,2), IN `in_qty` INT, IN `in_academic_year` VARCHAR(9), IN `in_term` VARCHAR(20), IN `in_status` ENUM('Paid','Unpaid'), IN `in_due_date` DATE, IN `in_payment_date` DATE, IN `in_payment_mode` VARCHAR(255), IN `in_created_by` VARCHAR(255), IN `in_school_id` VARCHAR(10), IN `in_limit` INT, IN `in_offset` INT, IN `start_date` DATE, IN `end_date` DATE)
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
        (COALESCE(SUM(p.amount), 0) - COALESCE(SUM(p.discount), 0))+ COALESCE(SUM(p.fines)) AS total_invoice,
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
        (COALESCE(SUM(p.amount), 0) - COALESCE(SUM(p.discount), 0))+ COALESCE(SUM(p.fines)) AS total_invoice,
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

CREATE PROCEDURE `receipt_urls`
   (IN `query_type` VARCHAR(10),IN `in_id` VARCHAR(10), IN `in_ref_no` VARCHAR(20), IN `in_url` VARCHAR(500))
   
  BEGIN
  IF query_type='create' THEN
  		INSERT INTO `receipt_urls`(`id`, `ref_no`, `url`) 
        VALUES (`in_id`, `in_ref_no`, `in_url`);
  ELSEIF   query_type='select' THEN
  	SELECT * FROM `receipt_urls` WHERE ref_no = `in_ref_no`;
  END IF;
  
  END $$


  -- 15-02-2026
  ALTER TABLE `student_assignments` CHANGE `student_id` `school_id` VARCHAR(10) NULL DEFAULT NULL;
  ALTER TABLE `student_assignments` ADD `teacher_id` INT(10) NOT NULL AFTER `id`;


DELIMITER $$
DROP PROCEDURE IF EXISTS `student_assignments`$$
CREATE  PROCEDURE `student_assignments`(
    IN `query_type` VARCHAR(50), 
    IN `in_id` VARCHAR(8), 
    IN `in_teacher_id` VARCHAR(10), 
    IN `in_assignment_id` VARCHAR(8), 
    IN `in_school_id` VARCHAR(8), 
    IN `in_student_name` VARCHAR(100), 
    IN `in_admission_no` VARCHAR(20), 
    IN `in_class_name` VARCHAR(80), 
    IN `in_subject` VARCHAR(200), 
    IN `in_level` VARCHAR(8), 
    IN `in_attachement` VARCHAR(500), 
    IN `in_content` TEXT, 
    IN `in_marks` VARCHAR(8), 
    IN `in_score` VARCHAR(8), 
    IN `in_remark` VARCHAR(8), 
    IN `in_comment` VARCHAR(500))
BEGIN
    IF query_type ='create' THEN
        INSERT INTO `student_assignments`( `assignment_id`, `school_id`, `student_name`, `admission_no`, `class_name`, `subject`, `teacher_id`, `teacher_name`, `level`,`content`) 
        VALUES ( `in_assignment_id`, `in_school_id`,`in_student_name`, `in_admission_no`, `in_class_name`, `in_subject`, `in_teacher_id`, `in_teacher_name`, `in_level`,`in_content`);
      ELSEIF query_type = 'update' THEN
        UPDATE `student_assignments`
        SET 
            `assignment_id` = COALESCE(`in_assignment_id`, `assignment_id`),
            `school_id` = COALESCE(`in_school_id`, `school_id`),
            `student_name` = COALESCE(`in_student_name`, `student_name`),
            `admission_no` = COALESCE(`in_admission_no`, `admission_no`),
            `class_name` = COALESCE(`in_class_name`, `class_name`),
            `subject` = COALESCE(`in_subject`, `subject`),
            `teacher_id` = COALESCE(`in_teacher_id`, `teacher_id`),
            `teacher_name` = COALESCE(`in_teacher_name`, `teacher_name`),
            `level` = COALESCE(`in_level`, `level`),
            `content` = COALESCE(`in_content`, `content`),
            `marks` = COALESCE(`in_marks`, `marks`),
            `score` = COALESCE(`in_score`, `score`),
            `remark` = COALESCE(`in_remark`, `remark`),
            `comment` = COALESCE(`in_comment`, `comment`),
            `updated_at` = NOW()
        WHERE `id` = `in_id`;

    ELSEIF query_type ='select' THEN
     
        IF in_assignment_id IS NOT NULL AND in_school_id !='' THEN
           SELECT * FROM `student_assignments` WHERE school_id = in_school_id AND assignment_id = in_assignment_id;
       
        ELSEIF in_teacher_id IS NOT NULL AND in_teacher_id !='' AND in_assignment_id IS NOT NULL AND in_assignment_id!='' THEN
        
           SELECT * FROM `student_assignments` WHERE teacher_id = in_teacher_id AND assignment_id = in_assignment_id;
        ELSEIF in_id IS NOT NULL AND in_id !='' THEN
        
           SELECT * FROM `student_assignments` WHERE id = in_id;
        ELSE 
           SELECT * FROM `student_assignments`;
        END IF;
    END IF;
END$$
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `student_result`$$
CREATE  PROCEDURE `student_result`(
    IN `query_type` VARCHAR(50), 
    IN `in_admission_no` VARCHAR(30)
)
BEGIN
IF query_type ='get-result' THEN
    SELECT a.*, (SELECT b.exam_name FROM exam_calendar b where a.calendar_id = b.id) as exam_name FROM student_grading a  WHERE admission_no = in_admission_no; 
END IF;


END$$


ALTER TABLE `examinations` ADD `exam_type` VARCHAR(100) NULL DEFAULT NULL AFTER `title`;




-- 16/2/2025

CREATE TABLE `character_traits` (
  `school_id` varchar(20) NOT NULL,
  `category` varchar(50) NOT NULL,
  `description` varchar(50) NOT NULL,
  `section` varchar(50) NOT NULL
);
ALTER TABLE `character_traits` ADD PRIMARY KEY(`school_id`, `category`, `description`, `section`);

CREATE TABLE `character_scores` (
  `school_id` varchar(20) NOT NULL,
  `academic_year` varchar(10) NOT NULL,
  `term` varchar(30) NOT NULL,
  `category` varchar(50) NOT NULL,
  `admission_no` int(11) NOT NULL,
  `grade` varchar(10) NOT NULL,
  `created_by` varchar(50) NOT NULL,
  `description` varchar(50) NOT NULL,
  `class_name` varchar(50) NOT NULL
);

DELIMITER $$
DROP PROCEDURE IF EXISTS character_scores$$

CREATE  PROCEDURE `character_scores`(IN `query_type` VARCHAR(50), IN `in_school_id` VARCHAR(50), IN `in_academic_year` VARCHAR(50), IN `in_term` VARCHAR(50), IN `in_section` VARCHAR(50), IN `in_category` VARCHAR(50), IN `in_admission_no` VARCHAR(50), IN `in_grade` VARCHAR(50), IN `in_created_by` VARCHAR(50), IN `in_description` VARCHAR(50), IN `in_class_name` VARCHAR(50))
BEGIN
    
        IF query_type ='insert' THEN
                INSERT INTO `character_scores`(`school_id`, `academic_year`, `term`, `category`, `admission_no`, `grade`, `created_by`, `description`, `class_name`)
            VALUES(`in_school_id`, `in_academic_year`, `in_term`, `in_category`, `in_admission_no`, `in_grade`, `in_created_by`, `in_description`, `in_class_name`) ;
                
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

ALTER TABLE `character_scores` DROP PRIMARY KEY; ALTER TABLE `character_scores` ADD `id` INT NOT NULL FIRST;
ALTER TABLE `character_scores` ADD PRIMARY KEY(`school_id`, `academic_year`, `term`, `admission_no`, `description`);


DELIMITER $$
DROP PROCEDURE `get_class_results`$$
CREATE PROCEDURE `get_class_results`(
    IN query_type VARCHAR(30),
    IN in_class_name VARCHAR(30),
    IN in_academic_year VARCHAR(30),
    IN in_term VARCHAR(30),
    IN in_school_id VARCHAR(30)
)
BEGIN
IF query_type ='Get Class Reports' THE
  SELECT * FROM student_grading WHERE class_name = in_class_name AND academic_year=in_academic_year AND term =in_term, school_id=in_school_id;
END$$
DELIMITER ;

-- 18/2/2025

DROP TABLE IF EXISTS `parents` ;
CREATE TABLE `parents` (
  `parent_id` varchar(50) NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `phone_no` varchar(14) NOT NULL,
  `email` varchar(50) DEFAULT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `is_guardian` varchar(100) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `user_id` int(10) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'Parent',
  `school_location` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `payments`;
CREATE TABLE `fees_billings` (
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
  `status` enum('Paid','Unpaid','Pending Payment') NOT NULL DEFAULT 'Unpaid',
  `created_by` varchar(30) DEFAULT NULL,
  `school_id` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE `qrcodesetup` ;
CREATE TABLE `qrcodesetup` (
  `id` int(11) NOT NULL,
  `school_id` VARCHAR(20) DEFAULT NULL,
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
