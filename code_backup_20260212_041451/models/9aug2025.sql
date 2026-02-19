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
        SELECT x.*, (SELECT y.name FROM teachers y WHERE y.staff_id = x.teacher_id) AS teacher  
        FROM lesson_time_table x 
        WHERE x.status = 'Active';
    
    ELSEIF query_type = 'select' THEN
    SELECT l.*,t.name FROM lesson_time_table l LEFT JOIN teachers t ON l.teacher_id = t.staff_id 
    WHERE section = in_section;
    
    ELSEIF query_type = 'select-class-subjects' THEN
    SELECT l.*,t.name FROM lesson_time_table l LEFT JOIN teachers t ON l.teacher_id = t.staff_id 
    WHERE section = in_section AND class_name = in_class_name;
    ELSEIF query_type = 'teacher-select' THEN
    SELECT l.*,t.name FROM lesson_time_table l LEFT JOIN teachers t ON l.teacher_id = t.staff_id 
    WHERE teacher_id = in_teacher_id;
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `teachers`(IN `query_type` VARCHAR(100), IN `p_id` INT(10), IN `p_name` VARCHAR(255), IN `p_sex` VARCHAR(10), IN `p_age` INT, IN `p_address` TEXT, IN `p_date_of_birth` VARCHAR(20), IN `p_marital_status` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_mobile_no` VARCHAR(20), IN `p_email` VARCHAR(100), IN `p_qualification` VARCHAR(255), IN `p_user_type` VARCHAR(50), IN `p_staff_type` VARCHAR(255), IN `p_staff_role` VARCHAR(255), IN `p_working_experience` TEXT, IN `p_religion` VARCHAR(50), IN `p_last_place_of_work` VARCHAR(255), IN `p_do_you_have` TEXT, IN `p_when_do` DATE, IN `p_account_name` VARCHAR(255), IN `p_account_number` VARCHAR(50), IN `p_bank` VARCHAR(100), IN `p_passport_url` VARCHAR(200), IN `p_school_location` VARCHAR(100), IN `p_school_id` VARCHAR(20), IN `p_password` VARCHAR(100))
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
        UPDATE teachers SET user_id = _user_id WHERE staff_id = _teacher_id;
        
        
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
        AND (
            p_school_location IS NULL OR p_school_location = '' OR t.branch_id = p_school_location
        );
    ELSEIF query_type = 'select-roles' THEN
     SELECT * FROM class_role WHERE teacher_id = p_id;
    ELSEIF query_type = 'select' THEN
        SELECT * FROM teachers WHERE staff_id = p_id;
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
    WHERE staff_id = p_id;
    
    SELECT staff_id AS teacher_id FROM teachers WHERE staff_id = p_id;
END IF;

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `parents`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(20), IN `in_name` VARCHAR(100), IN `in_phone` VARCHAR(14), IN `in_email` VARCHAR(100), IN `in_relationship` VARCHAR(100), IN `in_is_guardian` VARCHAR(3), IN `in_occupation` VARCHAR(100), IN `in_children_admin_no` VARCHAR(50), IN `in_school_id` VARCHAR(20))
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

            INSERT INTO users (name, email, username, phone, user_type, password, school_id)
            VALUES (
                in_name, 
                in_email, 
                in_phone,
                in_phone,
                'parent', 
                '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 
                in_school_id
            );
            
             INSERT INTO parents (parent_id,fullname, phone, email, relationship, is_guardian, occupation, school_id,user_id)
            VALUES (par_code,in_name, in_phone, in_email, in_relationship, in_is_guardian, in_occupation, in_school_id,LAST_INSERT_ID());
            
            UPDATE number_generator SET code = par_id  WHERE description = "parent_id";

	ELSEIF query_type = 'parent' THEN
         SELECT code + 1 INTO par_id FROM number_generator WHERE description = "parent_id";
           SET par_code  = CONCAT("PAR/",in_short_name,'/', LPAD(CAST(par_id  AS CHAR(5)), 5, '0'));

            INSERT INTO users (name, email, username, phone, role, password, school_id)
            VALUES (
                in_name, 
                in_email, 
                in_name,
                in_phone,
                'parent', 
                '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 
                in_school_id
            );
            
             INSERT INTO parents (parent_id,fullname, phone, email, relationship, is_guardian, occupation, school_id,user_id)
            VALUES (par_code,in_name, in_phone, in_email, in_relationship, in_is_guardian, in_occupation, in_school_id,LAST_INSERT_ID());
            
            UPDATE  `students` SET parent_id = par_code WHERE admission_no = in_children_admin_no; 
            UPDATE number_generator SET code = par_id  WHERE description = "parent_id";


    ELSEIF query_type = 'select' THEN
        SELECT * FROM parents WHERE parent_id = in_id;
        
     ELSEIF query_type = 'update-parent' THEN
        UPDATE parents 
        SET fullname = in_name,
            phone = in_phone,
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
        SELECT * FROM parents WHERE school_id = in_school_id;
    END IF;

    COMMIT;
END$$
DELIMITER ;


DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `class_role`(IN `query_type` VARCHAR(100), IN `in_class_role_id` VARCHAR(20), IN `in_teacher_id` INT, IN `in_section_id` VARCHAR(50), IN `in_class_code` VARCHAR(100), IN `in_role` ENUM('Form Master','Subject Teacher'), IN `in_class_name` VARCHAR(20), IN `in_school_id` VARCHAR(20))
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

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetAcademicWeeksByMonth`(
  IN p_year INT,
  IN p_month INT,
  IN p_school_id VARCHAR(20),
  IN p_academic_year VARCHAR(10)
)
BEGIN
  SELECT 
    aw.id AS week_id,
    aw.week_number,
    aw.begin,
    aw.end,
    CONCAT_WS('|',
      -- Sunday
      CASE WHEN DAYNAME(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY)) = 'Sunday' THEN 'U' ELSE LEFT(DAYNAME(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY)), 1) END,
      -- Monday
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 1 DAY)) = 'Sunday' THEN 'U' ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 1 DAY)), 1) END,
      -- Tuesday
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 2 DAY)) = 'Sunday' THEN 'U' ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 2 DAY)), 1) END,
      -- Wednesday
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 3 DAY)) = 'Sunday' THEN 'U' ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 3 DAY)), 1) END,
      -- Thursday
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 4 DAY)) = 'Sunday' THEN 'U' ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 4 DAY)), 1) END,
      -- Friday
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 5 DAY)) = 'Sunday' THEN 'U' ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 5 DAY)), 1) END,
      -- Saturday
      CASE WHEN DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 6 DAY)) = 'Sunday' THEN 'U' ELSE LEFT(DAYNAME(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 6 DAY)), 1) END
    ) AS day_letters,

    CONCAT_WS('|',
      DAY(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 1 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 2 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 3 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 4 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 5 DAY)),
      DAY(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 6 DAY))
    ) AS day_numbers,

    CONCAT_WS('|',
      DATE_FORMAT(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 1 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 2 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 3 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 4 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 5 DAY), '%Y-%m-%d'),
      DATE_FORMAT(DATE_ADD(DATE_SUB(aw.begin, INTERVAL (DAYOFWEEK(aw.begin) - 1) DAY), INTERVAL 6 DAY), '%Y-%m-%d')
    ) AS full_dates

  FROM academic_weeks aw
  WHERE aw.status = 'Active'
    AND aw.school_id = p_school_id
    AND aw.academic_year = p_academic_year
    AND (
      (YEAR(aw.begin) = p_year AND MONTH(aw.begin) = p_month)
      OR (YEAR(aw.end) = p_year AND MONTH(aw.end) = p_month)
      OR (
        aw.begin <= LAST_DAY(STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d'))
        AND aw.end >= STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d')
      )
    )
  ORDER BY aw.begin;
END$$
DELIMITER ;

-- ========20 aug 2025========

CREATE TABLE fees_structure (
    fee_id INT PRIMARY KEY AUTO_INCREMENT,
    class_code VARCHAR(20) NOT NULL,
    item_name VARCHAR(100) NOT NULL, 
    amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT
);
CREATE TABLE student_bills (
    bill_id INT PRIMARY KEY AUTO_INCREMENT,
    admission_no VARCHAR(20) NOT NULL,
    term_id INT NOT NULL,
    session_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL,
    status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admission_no) REFERENCES students(admission_no),
    UNIQUE KEY unique_student_term_session (admission_no, term_id, session_id)
);
CREATE TABLE bill_items (
    bill_item_id INT PRIMARY KEY AUTO_INCREMENT,
    bill_id INT NOT NULL,
    fee_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    amount_snapshot DECIMAL(10,2) NOT NULL, -- Snapshot amount at billing time
    FOREIGN KEY (bill_id) REFERENCES student_bills(bill_id) ON DELETE CASCADE,
    FOREIGN KEY (fee_id) REFERENCES fees_structure(fee_id)
);