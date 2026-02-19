ALTER TABLE classes 
ADD COLUMN stream ENUM(
    'Science',
    'Art',
    'Commercial',
    'Technical',
    'Vocational',
    'General',
    'Mixed',
    'None'
) DEFAULT 'General' AFTER level;


ALTER TABLE `students` ADD `stream` ENUM('Science','Art','Commercial','Technical','Vocational','Agricultural Science','General','Mixed','None')
NOT NULL DEFAULT 'General' AFTER `section`; 

DELIMITER $$
DROP PROCEDURE IF EXISTS `classes_atomic`$$
CREATE  PROCEDURE `classes_atomic`(
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

END$$
DELIMITER ;


DELIMITER $$
DROP PROCEDURE IF EXISTS `students_queries`$$
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
        WHERE id = p_id;
        
        SELECT * FROM students WHERE id = p_id;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students WHERE id = p_id;
        COMMIT;

    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown query_type';
    END IF;

END$$
DELIMITER ;

ALTER TABLE `school_setup` ADD `has_class_stream` BOOLEAN NOT NULL DEFAULT FALSE AFTER `about_us`;

CREATE OR REPLACE VIEW student_subjects_view AS
SELECT 
    s.subject_code AS subject_code,
    s.subject AS subject_name,
    s.class_code AS class_code,
    st.admission_no AS admission_no,
    st.student_name AS student_name,
    st.class_name AS class_name,
    st.school_id AS school_id,
    st.stream AS student_stream,
    st.status AS status,
    s.type AS subject_type
FROM subjects s
JOIN students st ON s.class_code = st.current_class;

 DELIMITER $$                                                                                                                                                           │
                                                                                                                                                                           │
    DROP PROCEDURE IF EXISTS GetClassCAReports $$                                                                                                                          │
                                                                                                                                                                           │
    CREATE PROCEDURE `GetClassCAReports`(                                                                                                                                  │
        IN `p_query_type` VARCHAR(50),                                                                                                                                     │
        IN `p_class_code` VARCHAR(20),                                                                                                                                     │
        IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'),                                                                                                                     │
        IN `p_academic_year` VARCHAR(20),                                                                                                                                  │
        IN `p_term` VARCHAR(50),                                                                                                                                           │
        IN `p_admission_no` VARCHAR(20),                                                                                                                                   │
        IN `p_branch_id` VARCHAR(20),                                                                                                                                      │
        IN `p_school_id` VARCHAR(20)                                                                                                                                       │
    )                                                                                                                                                                      │
    BEGIN                                                                                                                                                                  │
        IF p_query_type = 'View Class CA Report' THEN                                                                                                                      │
            -- Use window functions for accurate positioning with stream filtering                                                                                         │
            SELECT                                                                                                                                                         │
                base_data.admission_no,                                                                                                                                    │
                base_data.subject_code,                                                                                                                                    │
                base_data.ca_setup_id,                                                                                                                                     │
                base_data.score,                                                                                                                                           │
                base_data.max_score,                                                                                                                                       │
                base_data.week_number,                                                                                                                                     │
                base_data.assessment_type,                                                                                                                                 │
                base_data.student_name,                                                                                                                                    │
                base_data.class_name,                                                                                                                                      │
                base_data.school_id,                                                                                                                                       │
                base_data.current_class,                                                                                                                                   │
                base_data.subject,                                                                                                                                         │
                base_data.academic_year,                                                                                                                                   │
                base_data.term,                                                                                                                                            │
                base_data.overall_contribution_percent,                                                                                                                    │
                base_data.total_students_in_class,                                                                                                                         │
                base_data.avg_per_subject,                                                                                                                                 │
                -- Use ROW_NUMBER() for proper sequential positioning                                                                                                      │
                ROW_NUMBER() OVER (                                                                                                                                        │
                    PARTITION BY base_data.subject_code, base_data.assessment_type                                                                                         │
                    ORDER BY base_data.score DESC, base_data.student_name ASC                                                                                              │
                ) AS sbj_position                                                                                                                                          │
            FROM (                                                                                                                                                         │
                SELECT                                                                                                                                                     │
                    ws.admission_no,                                                                                                                                       │
                    ws.subject_code,                                                                                                                                       │
                    ws.ca_setup_id,                                                                                                                                        │
                    ws.score,                                                                                                                                              │
                    ws.max_score,                                                                                                                                          │
                    ws.week_number,                                                                                                                                        │
                    ws.assessment_type,                                                                                                                                    │
                    s.student_name,                                                                                                                                        │
                    c.class_name,                                                                                                                                          │
                    ws.school_id,                                                                                                                                          │
                    c.class_code AS current_class,                                                                                                                         │
                    sub.subject_name AS subject,                                                                                                                           │
                    aw.academic_year,                                                                                                                                      │
                    aw.term,                                                                                                                                               │
                    cs.overall_contribution_percent,                                                                                                                       │
                    -- Count total students in class for this subject and CA type                                                                                          │
                    COUNT(*) OVER (                                                                                                                                        │
                        PARTITION BY ws.subject_code, ws.assessment_type                                                                                                   │
                    ) AS total_students_in_class,                                                                                                                          │
                    -- Calculate average score for this subject and CA type                                                                                                │
                    AVG(ws.score) OVER (                                                                                                                                   │
                        PARTITION BY ws.subject_code, ws.assessment_type                                                                                                   │
                    ) AS avg_per_subject                                                                                                                                   │
                FROM weekly_scores ws                                                                                                                                      │
                INNER JOIN students s ON ws.admission_no = s.admission_no                                                                                                  │
                INNER JOIN classes c ON s.current_class = c.class_code                                                                                                     │
                INNER JOIN subjects sub ON ws.subject_code = sub.subject_code                                                                                              │
                INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id                                                                                                           │
                LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number                                                                                             │
                    AND aw.academic_year = p_academic_year                                                                                                                 │
                    AND aw.term = p_term                                                                                                                                   │
                    AND aw.school_id = p_school_id                                                                                                                         │
                WHERE aw.academic_year = p_academic_year                                                                                                                   │
                  AND ws.assessment_type = p_ca_type                                                                                                                       │
                  AND s.current_class = p_class_code                                                                                                                       │
                  AND ws.school_id = p_school_id                                                                                                                           │
                  AND aw.term = p_term                                                                                                                                     │
                  AND s.status = 'Active'                                                                                                                                  │
                  -- Stream filtering: allow core subjects for all, and subjects matching student's stream                                                                 │
                  AND (                                                                                                                                                    │
                      sub.type = 'core'                                                                                                                                    │
                      OR s.stream = 'General'                                                                                                                              │
                      OR s.stream = 'None'                                                                                                                                 │
                      OR s.stream = sub.type                                                                                                                               │
                  )                                                                                                                                                        │
            ) AS base_data                                                                                                                                                 │
            ORDER BY base_data.subject_code, base_data.score DESC, base_data.student_name;                                                                                 │
                                                                                                                                                                           │
        ELSEIF p_query_type = "View Student CA Report" THEN                                                                                                                │
            -- Use window functions for individual student report with stream filtering                                                                                    │
            SELECT                                                                                                                                                         │
                base_data.admission_no,                                                                                                                                    │
                base_data.subject_code,                                                                                                                                    │
                base_data.ca_setup_id,                                                                                                                                     │
                base_data.score,                                                                                                                                           │
                base_data.max_score,                                                                                                                                       │
                base_data.week_number,                                                                                                                                     │
                base_data.assessment_type,                                                                                                                                 │
                base_data.student_name,                                                                                                                                    │
                base_data.class_name,                                                                                                                                      │
                base_data.school_id,                                                                                                                                       │
                base_data.current_class,                                                                                                                                   │
                base_data.subject,                                                                                                                                         │
                base_data.academic_year,                                                                                                                                   │
                base_data.term,                                                                                                                                            │
                base_data.overall_contribution_percent,                                                                                                                    │
                base_data.total_students_in_class,                                                                                                                         │
                base_data.avg_per_subject,                                                                                                                                 │
                -- Use ROW_NUMBER() for proper sequential positioning                                                                                                      │
                ROW_NUMBER() OVER (                                                                                                                                        │
                    PARTITION BY base_data.subject_code, base_data.assessment_type                                                                                         │
                    ORDER BY base_data.score DESC, base_data.student_name ASC                                                                                              │
                ) AS sbj_position                                                                                                                                          │
            FROM (                                                                                                                                                         │
                SELECT                                                                                                                                                     │
                    ws.admission_no,                                                                                                                                       │
                    ws.subject_code,                                                                                                                                       │
                    ws.ca_setup_id,                                                                                                                                        │
                    ws.score,                                                                                                                                              │
                    ws.max_score,                                                                                                                                          │
                    ws.week_number,                                                                                                                                        │
                    ws.assessment_type,                                                                                                                                    │
                    s.student_name,                                                                                                                                        │
                    c.class_name,                                                                                                                                          │
                    ws.school_id,                                                                                                                                          │
                    c.class_code AS current_class,                                                                                                                         │
                    sub.subject_name AS subject,                                                                                                                           │
                    aw.academic_year,                                                                                                                                      │
                    aw.term,                                                                                                                                               │
                    cs.overall_contribution_percent,                                                                                                                       │
                    -- Count total students in class for this subject and CA type                                                                                          │
                    COUNT(*) OVER (                                                                                                                                        │
                        PARTITION BY ws.subject_code, ws.assessment_type                                                                                                   │
                    ) AS total_students_in_class,                                                                                                                          │
                    -- Calculate average score for this subject and CA type                                                                                                │
                    AVG(ws.score) OVER (                                                                                                                                   │
                        PARTITION BY ws.subject_code, ws.assessment_type                                                                                                   │
                    ) AS avg_per_subject                                                                                                                                   │
                FROM weekly_scores ws                                                                                                                                      │
                INNER JOIN students s ON ws.admission_no = s.admission_no                                                                                                  │
                INNER JOIN classes c ON s.current_class = c.class_code                                                                                                     │
                INNER JOIN subjects sub ON ws.subject_code = sub.subject_code                                                                                              │
                INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id                                                                                                           │
                LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number                                                                                             │
                    AND aw.academic_year = p_academic_year                                                                                                                 │
                    AND aw.term = p_term                                                                                                                                   │
                    AND aw.school_id = p_school_id                                                                                                                         │
                WHERE aw.academic_year = p_academic_year                                                                                                                   │
                  AND ws.assessment_type = p_ca_type                                                                                                                       │
                  AND ws.admission_no = p_admission_no                                                                                                                     │
                  AND ws.school_id = p_school_id                                                                                                                           │
                  AND aw.term = p_term                                                                                                                                     │
                  AND s.status = 'Active'                                                                                                                                  │
                  -- Stream filtering: allow core subjects for all, and subjects matching student's stream                                                                 │
                  AND (                                                                                                                                                    │
                      sub.type = 'core'                                                                                                                                    │
                      OR s.stream = 'General'                                                                                                                              │
                      OR s.stream = 'None'                                                                                                                                 │
                      OR s.stream = sub.type                                                                                                                               │
                  )                                                                                                                                                        │
            ) AS base_data                                                                                                                                                 │
            ORDER BY base_data.subject_code, base_data.score DESC;                                                                                                         │
                                                                                                                                                                           │
        ELSEIF p_query_type = "student admission_no" THEN                                                                                                                  │
            -- Get distinct student admission numbers and names                                                                                                            │
            SELECT DISTINCT                                                                                                                                                │
                s.admission_no,                                                                                                                                            │
                s.student_name                                                                                                                                             │
            FROM students s                                                                                                                                                │
            WHERE s.school_id = p_school_id                                                                                                                                │
              AND s.status = 'Active'                                                                                                                                      │
            ORDER BY s.student_name;                                                                                                                                       │
                                                                                                                                                                           │
        ELSE                                                                                                                                                               │
            -- Default case: return all data for other query types with stream filtering                                                                                   │
            SELECT                                                                                                                                                         │
                ws.admission_no,                                                                                                                                           │
                ws.subject_code,                                                                                                                                           │
                ws.ca_setup_id,                                                                                                                                            │
                ws.score,                                                                                                                                                  │
                ws.max_score,                                                                                                                                              │
                ws.week_number,                                                                                                                                            │
                ws.assessment_type,                                                                                                                                        │
                s.student_name,                                                                                                                                            │
                c.class_name,                                                                                                                                              │
                ws.school_id,                                                                                                                                              │
                c.class_code AS current_class,                                                                                                                             │
                sub.subject_name AS subject,                                                                                                                               │
                aw.academic_year,                                                                                                                                          │
                aw.term,                                                                                                                                                   │
                cs.overall_contribution_percent,                                                                                                                           │
                COUNT(*) OVER (                                                                                                                                            │
                    PARTITION BY ws.subject_code, ws.assessment_type                                                                                                       │
                ) AS total_students_in_class,                                                                                                                              │
                AVG(ws.score) OVER (                                                                                                                                       │
                    PARTITION BY ws.subject_code, ws.assessment_type                                                                                                       │
                ) AS avg_per_subject,                                                                                                                                      │
                ROW_NUMBER() OVER (                                                                                                                                        │
                    PARTITION BY s.current_class, ws.subject_code, ws.assessment_type                                                                                      │
                    ORDER BY ws.score DESC, s.student_name ASC                                                                                                             │
                ) AS sbj_position                                                                                                                                          │
            FROM weekly_scores ws                                                                                                                                          │
            INNER JOIN students s ON ws.admission_no = s.admission_no                                                                                                      │
            INNER JOIN classes c ON s.current_class = c.class_code                                                                                                         │
            INNER JOIN subjects sub ON ws.subject_code = sub.subject_code                                                                                                  │
            INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id                                                                                                               │
            LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number                                                                                                 │
                AND aw.academic_year = p_academic_year                                                                                                                     │
                AND aw.term = p_term                                                                                                                                       │
                AND aw.school_id = p_school_id                                                                                                                             │
            WHERE ws.school_id = p_school_id                                                                                                                               │
              AND s.status = 'Active'                                                                                                                                      │
              -- Apply stream filtering for all other query types as well                                                                                                  │
              AND (                                                                                                                                                        │
                  sub.type = 'core'                                                                                                                                        │
                  OR s.stream = 'General'                                                                                                                                  │
                  OR s.stream = 'None'                                                                                                                                     │
                  OR s.stream = sub.type                                                                                                                                   │
              )                                                                                                                                                            │
            ORDER BY s.current_class, sub.subject_code, ws.assessment_type, ws.score DESC;                                                                                 │
        END IF;                                                                                                                                                            │
    END $$                                                                                                                                                                 │
    DELIMITER ;

    drop table if exists subject_streams;
    CREATE TABLE subject_streams (
    subject_code VARCHAR(50) NOT NULL,
    stream ENUM('General','Science','Arts','Technical','Commercial','None') NOT NULL,
    PRIMARY KEY(subject_code, stream),
    FOREIGN KEY(subject_code) REFERENCES subjects(subject_code);


    UPDATE `subjects`   SET
 `subjects`.`type` ='General' WHERE 
 `subjects`.`type` ='core';
 UPDATE `subjects`   SET
 `subjects`.`type` ='Arts' WHERE 
 `subjects`.`type` ='art';
);


UPDATE `subjects`   SET
 `subjects`.`type` ='Science' WHERE 
 `subjects`.`type` ='Science';

UPDATE `subjects`   SET
 `subjects`.`type` ='Technical' WHERE 
 `subjects`.`type` ='tech' or type='technical';

 UPDATE `subjects`   SET
 `subjects`.`type` ='Vocational' WHERE 
 `subjects`.`type` ='vocational';

 ALTER TABLE `students` CHANGE `stream` `stream` ENUM('Science','Commercial','Technical','Humanities','Vocational','General','Mixed','None','Arts') NOT NULL DEFAULT 'General';