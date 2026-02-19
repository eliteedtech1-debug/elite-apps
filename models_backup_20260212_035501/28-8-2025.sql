
ALTER TABLE `teachers` CHANGE `created_at` `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CHANGE `updated_at` `updated_at` DATETIME on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
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
IN `p_branch_id` VARCHAR(300), 
IN `in_school_id` VARCHAR(20), 
IN `in_password` VARCHAR(100))
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

    IF query_type IN ('CREATE','returning_student','BULK RETURNINGS') THEN

        -- Split student_name into surname, first_name, and other_names
        SET p_surname     = SUBSTRING_INDEX(p_student_name, ' ', 1);  

        SET p_first_name  = SUBSTRING_INDEX(SUBSTRING_INDEX(p_student_name, ' ', 2), ' ', -1);

        SET p_other_names = NULL;
        IF (LENGTH(p_student_name) - LENGTH(REPLACE(p_student_name, ' ', ''))) >= 2 THEN
            SET p_other_names = SUBSTRING(p_student_name,
                                LENGTH(p_surname) + LENGTH(p_first_name) + 3); -- +3 for spaces
        END IF;

      START TRANSACTION;

      -- Fetch class details
      SELECT class_name, class_code, section 
      INTO in_class_name, in_current_class, in_class_section
      FROM classes 
      WHERE (class_code = p_current_class OR class_name = p_current_class) AND school_id = in_school_id AND branch_id = p_branch_id
      LIMIT 1;

      IF in_class_name IS NULL THEN
          ROLLBACK;
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class not found for current_class: ';
      END IF;

      -- Get school branch info
      SELECT code, short_name 
      INTO in_code, in_short_name
      FROM school_locations
      WHERE school_id = in_school_id AND branch_id = p_branch_id
      LIMIT 1;

      IF in_short_name IS NULL THEN
          ROLLBACK;
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'School location not found for school_id: branch  ';
      END IF;

      -- Get branch index
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

      -- Generate admission number
      SET generated_adm_no = CONCAT(UPPER(in_short_name), '/', branch_index, '/', LPAD(in_code + 1, 4, '0'));
    END IF;

    IF query_type = 'BULK RETURNINGS' THEN
        IF p_admission_no IS NOT NULL AND EXISTS (
            SELECT 1 FROM students WHERE admission_no = p_admission_no
        ) THEN
            -- Update existing student
            UPDATE students
            SET 
                student_name = p_student_name,
                sex = p_sex,
                academic_year = p_academic_year,
                status = 'Returning Student',
                current_class = COALESCE(in_current_class, current_class),
                class_name = COALESCE(in_class_name, class_name),
                section = COALESCE(in_class_section, section),
                password = COALESCE(in_password, password),
                branch_id = COALESCE(p_branch_id, branch_id),
                school_id = COALESCE(in_school_id, school_id)
            WHERE admission_no = p_admission_no;
            COMMIT;
        ELSE
            -- Lock the row for concurrency safety
            SELECT code 
            INTO in_code 
            FROM school_locations 
            WHERE school_id = in_school_id AND branch_id = p_branch_id 
            FOR UPDATE;

            IF in_code IS NULL THEN
                ROLLBACK;
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to lock school_locations row for school_id: ';
            END IF;

            -- Regenerate with locked code
            SET generated_adm_no = CONCAT(UPPER(in_short_name), '/', branch_index, '/', LPAD(in_code + 1, 4, '0'));

            -- Check for duplicates with retry logic
            SET @attempt = 0;
            WHILE @attempt < 3 DO
                SELECT COUNT(*) INTO @exists 
                FROM students 
                WHERE admission_no = generated_adm_no;

                IF @exists = 0 THEN
                    -- Exit loop if no duplicate
                    SET @attempt = 3;
                ELSE
                    -- Increment code and try a new admission number
                    SET in_code = in_code + 1;
                    SET generated_adm_no = CONCAT(UPPER(in_short_name), '/', branch_index, '/', LPAD(in_code + 1, 4, '0'));
                    SET @attempt = @attempt + 1;
                END IF;
            END WHILE;

            IF @exists > 0 THEN
                ROLLBACK;
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to generate unique admission number after retries: ';
            END IF;

            -- Insert student
            INSERT INTO students (
                surname, first_name, other_names, student_name, sex, admission_no, academic_year, status,
                current_class, class_name, section, branch_id, school_id, password
            ) VALUES (
                p_surname, p_first_name, p_other_names, p_student_name, p_sex, generated_adm_no, p_academic_year,
                'Returning Student', in_current_class,
                in_class_name, COALESCE(in_class_section, 'A'), p_branch_id, in_school_id, in_password
            );
            
            UPDATE school_locations 
            SET code = in_code + 1
            WHERE school_id = in_school_id AND branch_id = p_branch_id;

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
        SELECT * FROM students 
        WHERE admission_no = p_admission_no;
        
        ELSEIF query_type = 'add-parent' THEN
        UPDATE students SET parent_id = p_parent_id 
        WHERE admission_no = p_admission_no AND school_id = in_school_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM students 
        WHERE school_id = in_school_id
        AND branch_id = p_branch_id;
    ELSEIF query_type ='search' THEN
    SET @query = 'SELECT student_name, admission_no, sex, class_name, current_class AS class_code, status FROM students s';
    SET @where_clause = '';

    -- Build WHERE clause conditionally
    IF p_student_name IS NOT NULL AND p_student_name != '' THEN
        SET @where_clause = CONCAT(@where_clause, 's.student_name = "', p_student_name, '"');
    END IF;

    IF p_current_class IS NOT NULL AND p_current_class != '' THEN
        SET @where_clause = IF(@where_clause = '', 
            CONCAT('s.current_class = "', p_current_class, '"'),
            CONCAT(@where_clause, ' AND s.current_class = "', p_current_class, '"')
        );
    END IF;

    IF p_sex IS NOT NULL AND p_sex != '' THEN
        SET @where_clause = IF(@where_clause = '', 
            CONCAT('s.sex = "', p_sex, '"'),
            CONCAT(@where_clause, ' AND s.sex = "', p_sex, '"')
        );
    END IF;

    -- Always filter by school_id
    SET @where_clause = IF(@where_clause = '',
        CONCAT('s.school_id = "', in_school_id, '"'),
        CONCAT(@where_clause, ' AND s.school_id = "', in_school_id, '"')
    );

    -- Optional branch_id filter
    IF p_branch_id IS NOT NULL AND p_branch_id != '' THEN
        SET @where_clause = CONCAT(@where_clause, ' AND s.branch_id = "', p_branch_id, '"');
    END IF;

    -- Finalize the query
    SET @query = CONCAT(@query, ' WHERE ', @where_clause);

    -- Execute the dynamic query
    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    ELSEIF query_type = 'UPDATE' THEN
         SELECT class_name, class_code INTO in_class_name, in_current_class FROM classes WHERE class_name = p_current_class;

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
            current_class = COALESCE(in_current_class, current_class),
            class_name = COALESCE(in_class_name, class_name),
            profile_picture = COALESCE(p_profile_picture, profile_picture),
            medical_condition = COALESCE(p_medical_condition, medical_condition),
            branch_id = COALESCE(p_branch_id, branch_id),
            reason = COALESCE(p_transfer_certificate, reason)
        WHERE admission_no = p_admission_no;
        
        SELECT * FROM students WHERE admission_no = p_admission_no;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students WHERE id = p_id;
    END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS `students_queries_v2`$$
CREATE  PROCEDURE `students_queries_v2`(
    IN `query_type` VARCHAR(30), 
    IN `p_id` INT, 
    IN `p_parent_id` VARCHAR(20), 
    IN `p_guardian_id` VARCHAR(20),  
    IN `p_surname` VARCHAR(100),
    IN `p_first_name` VARCHAR(100),
    IN `p_other_names` VARCHAR(100),
    IN `p_home_address` TEXT, 
    IN `p_date_of_birth` DATE, 
    IN `p_sex` VARCHAR(10), 
    IN `p_religion` VARCHAR(50), 
    IN `p_tribe` VARCHAR(50), 
    IN `p_state_of_origin` VARCHAR(100), 
    IN `p_l_g_a` VARCHAR(100), 
    IN `p_nationality` VARCHAR(100), 
    IN `p_last_school_attended` VARCHAR(100), 
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
    IN `p_branch_id` VARCHAR(300), 
    IN `in_school_id` VARCHAR(20), 
    IN `in_password` VARCHAR(100)
)
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
    SET v_student_name = CONCAT_WS(' ', p_surname, p_first_name, p_other_names);
    SET in_student_name = v_student_name;

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

        -- Generate admission number
        SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));
    END IF;

    IF query_type = 'CREATE' THEN
        -- Lock the row for concurrency safety
        SELECT code 
        INTO in_code 
        FROM school_locations 
        WHERE school_id = in_school_id 
        AND branch_id = p_branch_id 
        FOR UPDATE;

        -- Regenerate with locked code
        SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));

        -- Check for duplicates
        SELECT COUNT(*) INTO exists_count 
        FROM students 
        WHERE admission_no = generated_adm_no;

        IF exists_count = 0 THEN
            INSERT INTO students (
                surname, first_name, other_names, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
                l_g_a, nationality, last_school_attended, special_health_needs, blood_group, admission_no, 
                academic_year, status, section, mother_tongue, language_known, current_class, class_name, profile_picture, 
                medical_condition, transfer_certificate, branch_id, school_id, password
            ) VALUES (
                p_surname, p_first_name, p_other_names, in_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
                p_l_g_a, p_nationality, p_last_school_attended, p_special_health_needs, p_blood_group, 
                generated_adm_no, 
                p_academic_year, 'Fresh Student', p_section, p_mother_tongue, p_language_known, 
                in_current_class, in_class_name, p_profile_picture,
                p_medical_condition, p_transfer_certificate, p_branch_id, in_school_id, in_password
            );

            -- Update code in school_locations
            UPDATE school_locations
            SET code = in_code + 1
            WHERE school_id = in_school_id 
            AND branch_id = p_branch_id;

            -- Return the new student record
            SELECT * FROM students WHERE admission_no = generated_adm_no;
            COMMIT;
        ELSE
            SET error_msg = CONCAT('Admission number already exists: ', COALESCE(generated_adm_no, 'NULL'));
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
        END IF;

    ELSEIF query_type = 'returning_student' THEN
        -- Lock the row for concurrency safety
        SELECT code 
        INTO in_code 
        FROM school_locations 
        WHERE school_id = in_school_id 
        AND branch_id = p_branch_id 
        FOR UPDATE;

        -- Regenerate with locked code
        SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));

        -- Check for duplicates
        SELECT COUNT(*) INTO exists_count 
        FROM students 
        WHERE admission_no = generated_adm_no;

        IF exists_count = 0 THEN
            INSERT INTO students (
                surname, first_name, other_names, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
                l_g_a, nationality, last_school_attended, special_health_needs, blood_group, admission_no, 
                academic_year, status, section, mother_tongue, language_known, current_class, class_name, profile_picture, 
                medical_condition, transfer_certificate, branch_id, school_id, password
            ) VALUES (
                p_surname, p_first_name, p_other_names, in_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
                p_l_g_a, p_nationality, p_last_school_attended, p_special_health_needs, p_blood_group, 
                generated_adm_no, 
                p_academic_year, 'Returning Student', p_section, p_mother_tongue, p_language_known, 
                in_current_class, in_class_name, p_profile_picture,
                p_medical_condition, p_transfer_certificate, p_branch_id, in_school_id, in_password
            );

            -- Update code in school_locations
            UPDATE school_locations
            SET code = in_code + 1
            WHERE school_id = in_school_id 
            AND branch_id = p_branch_id;

            -- Return the generated admission number
            SELECT generated_adm_no AS admission_no;
            COMMIT;
        ELSE
            SET error_msg = CONCAT('Admission number already exists: ', COALESCE(generated_adm_no, 'NULL'));
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
        END IF;

    ELSEIF query_type = 'BULK RETURNINGS' THEN
        IF p_admission_no IS NOT NULL AND EXISTS (
            SELECT 1 FROM students WHERE admission_no = p_admission_no
        ) THEN
            -- Update existing student
            UPDATE students
            SET 
                surname = p_surname,
                first_name = p_first_name,
                other_names = p_other_names,
                student_name = in_student_name,
                sex = p_sex,
                academic_year = p_academic_year,
                status = 'Returning Student',
                current_class = COALESCE(in_current_class, current_class),
                class_name = COALESCE(in_class_name, class_name),
                section = COALESCE(in_class_section, section),
                password = COALESCE(in_password, password),
                branch_id = COALESCE(p_branch_id, branch_id),
                school_id = COALESCE(in_school_id, school_id)
            WHERE admission_no = p_admission_no;
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
                'Returning Student', in_current_class,
                in_class_name, COALESCE(in_class_section, 'A'), p_branch_id, in_school_id, in_password
            );

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
            middle_name = COALESCE(p_middle_name, middle_name),
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

        SELECT * 
        FROM students 
        WHERE admission_no = p_admission_no;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students 
        WHERE id = p_id;
    END IF;
END$$
DELIMITER ;


ALTER TABLE `school_setup` CHANGE `is_onbording` `is_onbording` BOOLEAN NOT NULL DEFAULT FALSE;


DROP PROCEDURE `teachers`;
DELIMITER $$
CREATE  PROCEDURE `teachers`(
    IN `query_type` VARCHAR(100),
    IN `p_id` INT(10),
    IN `p_name` VARCHAR(255),
    IN `p_sex` VARCHAR(10),
    IN `p_age` INT,
    IN `p_address` TEXT,
    IN `p_date_of_birth` VARCHAR(20),
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
    IN `p_password` VARCHAR(100)
)
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
            p_account_name, p_account_number, p_bank, p_passport_url, p_school_location, p_school_id
        );
        
        SET _teacher_id = LAST_INSERT_ID();

        INSERT INTO users (name, email, phone, password, user_type, school_id)
        VALUES (p_name, p_email, p_mobile_no, p_password, p_user_type, p_school_id);
        
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
          AND (p_school_location IS NULL OR p_school_location = '' OR t.branch_id = p_school_location);

    ELSEIF query_type = 'select-roles' THEN
        SELECT * FROM class_role WHERE teacher_id = p_id;

    ELSEIF query_type = 'select' THEN
        SELECT * FROM teachers WHERE id = p_id;

    ELSEIF query_type = 'select-all' THEN
        SELECT * FROM teachers 
        WHERE school_id = p_school_id
          AND (p_school_location IS NULL OR p_school_location = '' OR branch_id = p_school_location);

    ELSEIF query_type = 'select_teacher_name' THEN
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

-- 29-08-2025
ALTER TABLE `students` ADD `reason` VARCHAR(150) NULL DEFAULT NULL AFTER `transfer_certificate`;

CREATE TABLE `attendance_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `admission_no` varchar(20) NOT NULL,
  `class_code` varchar(20) NOT NULL,
  `academic_week_id` int(11) NOT NULL,
  `attendance_date` date NOT NULL,
  `day_of_week` tinyint(4) NOT NULL COMMENT '1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday',
  `status` enum('P','A','L','E','D','HD-IN','HD-OUT') NOT NULL COMMENT 'P=Present, A=Absent, L=Late, E=Excused, D=Dismissed',
  `marked_by` varchar(20) NOT NULL COMMENT 'Teacher/Staff ID who marked attendance',
  `marked_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance` (`admission_no`,`attendance_date`),
  KEY `idx_student_class` (`admission_no`,`class_code`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `idx_week` (`academic_week_id`),
  KEY `idx_status` (`status`),
  KEY `idx_marked_by` (`marked_by`),
  KEY `class_code` (`class_code`),
  CONSTRAINT `attendance_records_ibfk_1` FOREIGN KEY (`admission_no`) REFERENCES `students` (`admission_no`) ON DELETE CASCADE,
  CONSTRAINT `attendance_records_ibfk_2` FOREIGN KEY (`class_code`) REFERENCES `classes` (`class_code`) ON DELETE CASCADE,
  CONSTRAINT `attendance_records_ibfk_3` FOREIGN KEY (`academic_week_id`) REFERENCES `academic_weeks` (`id`) ON DELETE CASCADE
);
DELIMITER $$
DROP PROCEDURE IF EXISTS `SubmitAttendance`$$
CREATE  PROCEDURE `SubmitAttendance`(
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
  DECLARE v_status VARCHAR(1);
  DECLARE v_notes TEXT;
  DECLARE i INT DEFAULT 0;
  DECLARE array_length INT;

  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SET array_length = JSON_LENGTH(p_attendance_data);

  WHILE i < array_length DO
    SET v_admission_no = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].admission_no')));
    SET v_status = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].status')));
    SET v_notes = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].notes')));

    INSERT INTO attendance_records (
      admission_no, class_code, academic_week_id, attendance_date, 
      day_of_week, status, marked_by, notes, branch_id, school_id
    ) VALUES (
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

  CALL UpdateAttendanceSummary(p_class_code, YEAR(p_attendance_date), MONTH(p_attendance_date));

  COMMIT;

  SELECT 'Attendance submitted successfully' AS message, array_length AS records_processed;
END$$
DELIMITER ;




DELIMITER $$
DROP PROCEDURE IF EXISTS `dashboard_query`$$
CREATE  PROCEDURE `dashboard_query`(
    IN `query_type` VARCHAR(100),
    IN `in_branch_id` VARCHAR(50),
    IN `in_school_id` VARCHAR(50)
)
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

    IF query_type = 'Select CBT Dashboard' THEN
        -- Super Admin → no filter
        IF in_school_id IS NULL OR in_branch_id IS NULL THEN
            SELECT COUNT(*) INTO student_count FROM students;
            SELECT COUNT(DISTINCT subject) INTO subject_count FROM subjects;
            SELECT COUNT(*) INTO pending_exams FROM examinations WHERE status = 'Pending';
            SELECT COUNT(*) INTO upcoming_exams FROM examinations WHERE status = 'Approved';
        ELSE
            -- Limited Analytics (school + branch)
            SELECT COUNT(*) INTO student_count FROM students WHERE school_id = in_school_id;
            SELECT COUNT(DISTINCT subject) INTO subject_count FROM subjects WHERE school_id = in_school_id;
            SELECT COUNT(*) INTO pending_exams FROM examinations WHERE school_id = in_school_id AND status = 'Pending';
            SELECT COUNT(*) INTO upcoming_exams FROM examinations WHERE school_id = in_school_id AND status = 'Approved';
        END IF;

        SELECT student_count AS total_students, pending_exams, upcoming_exams;

    ELSEIF query_type = 'dashboard-cards' THEN
        -- Limited Analytics (school + branch provided)
        IF in_school_id IS NOT NULL AND in_branch_id IS NOT NULL THEN
            -- Students
            SELECT COUNT(*) INTO student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id;

            SELECT COUNT(*) INTO active_student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status = 'Active';

            SELECT COUNT(*) INTO inactive_student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status != 'Active';

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
            WHERE school_id = in_school_id  AND status != 'Active';

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

        ELSE
            -- Super Admin → no filter
            SELECT COUNT(*) INTO student_count FROM students;
            SELECT COUNT(*) INTO active_student_count FROM students WHERE status = 'Active';
            SELECT COUNT(*) INTO inactive_student_count FROM students WHERE status != 'Active';

            SELECT COUNT(*) INTO teacher_count FROM teachers;
            SELECT COUNT(*) INTO active_teacher_count FROM teachers WHERE status = 'Active';
            SELECT COUNT(*) INTO inactive_teacher_count FROM teachers WHERE status != 'Active';

            SELECT COUNT(DISTINCT subject) INTO subject_count FROM subjects;
            SELECT COUNT(DISTINCT subject) INTO active_subject_count FROM subjects WHERE status = 'Active';
            SELECT COUNT(DISTINCT subject) INTO inactive_subject_count FROM subjects WHERE status != 'Active';

            SELECT COUNT(*) INTO class_count FROM classes;
            SELECT COUNT(*) INTO active_class_count FROM classes WHERE status = 'Active';
            SELECT COUNT(*) INTO inactive_class_count FROM classes WHERE status != 'Active';
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
            inactive_class_count;
    END IF;
END$$
DELIMITER ;

ALTER TABLE `payment_entries` ADD `item_category` VARCHAR(50) NULL DEFAULT NULL COMMENT 'item_category School Fees, Personal, ETC' AFTER `item_id`;
UPDATE `payment_entries` SET `item_category` = 'School Fees';



DELIMITER $$
DROP PROCEDURE IF EXISTS `dashboard_query`$$

CREATE   PROCEDURE `dashboard_query`(
    IN `query_type` VARCHAR(100),
    IN `in_branch_id` VARCHAR(50),
    IN `in_school_id` VARCHAR(50)
)
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
            SELECT COUNT(*) INTO student_count FROM students WHERE school_id = in_school_id;
            SELECT COUNT(DISTINCT subject) INTO subject_count FROM subjects WHERE school_id = in_school_id;
            SELECT COUNT(*) INTO pending_exams FROM examinations WHERE school_id = in_school_id AND status = 'Pending';
            SELECT COUNT(*) INTO upcoming_exams FROM examinations WHERE school_id = in_school_id AND status = 'Approved';
        END IF;

        SELECT student_count AS total_students, pending_exams, upcoming_exams;

    ELSEIF query_type = 'dashboard-cards' THEN
        -- Limited Analytics (school + branch provided)
        IF in_school_id IS NOT NULL AND in_branch_id IS NOT NULL THEN
            -- Students
            SELECT COUNT(*) INTO student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id;

            SELECT COUNT(*) INTO active_student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status = 'Active';

            SELECT COUNT(*) INTO inactive_student_count 
            FROM students 
            WHERE school_id = in_school_id AND branch_id = in_branch_id AND status != 'Active';

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
            WHERE school_id = in_school_id ;

            SELECT COUNT(DISTINCT subject) INTO active_subject_count 
            FROM subjects 
            WHERE school_id = in_school_id  AND status = 'Active';

            SELECT COUNT(DISTINCT subject) INTO inactive_subject_count 
            FROM subjects 
            WHERE school_id = in_school_id  AND status != 'Active';

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

        ELSE
            -- Super Admin → no filter
            SELECT COUNT(*) INTO student_count FROM students;
            SELECT COUNT(*) INTO active_student_count FROM students WHERE status IN ('Returning Students','Fresh Student', 'Active');
            SELECT COUNT(*) INTO inactive_student_count FROM students WHERE status NOT IN ('Returning Students','Fresh Student', 'Active');

            SELECT COUNT(*) INTO teacher_count FROM teachers;
            SELECT COUNT(*) INTO active_teacher_count FROM teachers WHERE status = 'Active';
            SELECT COUNT(*) INTO inactive_teacher_count FROM teachers WHERE status != 'Active';

            SELECT COUNT(DISTINCT subject) INTO subject_count FROM subjects;
            SELECT COUNT(DISTINCT subject) INTO active_subject_count FROM subjects WHERE status = 'Active';
            SELECT COUNT(DISTINCT subject) INTO inactive_subject_count FROM subjects WHERE status != 'Active';

            SELECT COUNT(*) INTO class_count FROM classes;
            SELECT COUNT(*) INTO active_class_count FROM classes WHERE status = 'Active';
            SELECT COUNT(*) INTO inactive_class_count FROM classes WHERE status != 'Active';
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
            inactive_class_count;
            parent_count,
            active_parent_count,
            inactive_parent_count;
    END IF;
END$$
DELIMITER ;


ALTER TABLE `parents` ADD `status` ENUM('Active','Inactive') NOT NULL DEFAULT 'Active' AFTER `passport_url`;

ALTER TABLE `attendance_records` CHANGE `status` `status` ENUM('P','A','L','E','D','HD-IN','HD-OUT') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'P=Present, A=Absent, L=Late, E=Excused, D=Dismissed';

ALTER TABLE `roles` ADD `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

UPDATE `roles` SET `school_id` = 'default' WHERE  `roles`.`school_id` = '';

INSERT INTO feature_categories (id, category_name, color, description, display_order, is_active, created_at, updated_at)
VALUES
(1, 'Core', '#1677ff', 'Essential system features', 1, 1, NOW(), NOW()),
(2, 'Academic-Core', '#722ed1', 'Core academic features', 2, 1, NOW(), NOW()),
(3, 'Academic-Premium', '#fa5a07', 'Premium academic features (CBT, AI)', 3, 1, NOW(), NOW()),
(4, 'Financial', '#fa8c16', 'Financial management features', 4, 1, NOW(), NOW()),
(5, 'Communication', '#eb2f96', 'Communication tools', 5, 1, NOW(), NOW());


INSERT INTO features (id, feature_key, feature_name, description, category_id, is_active, created_at, updated_at)
VALUES
(1, 'Dashboard', 'Dashboard Access', 'Real-time analytics', 1, 1, NOW(), NOW()),
(2, 'Personal Data Mngr', 'Personal Data Manager', 'Manage records', 1, 1, NOW(), NOW()),
(3, 'Class Management', 'Class Management', 'Schedule & lessons', 2, 1, NOW(), NOW()),
(4, 'Exams & Records', 'Exams & Records', 'Exam planning', 2, 1, NOW(), NOW()),
(5, 'CBT System', 'CBT System', 'Computer-based testing', 3, 1, NOW(), NOW()),
(6, 'Finance & Account', 'Finance & Account', 'Financial management', 4, 1, NOW(), NOW()),
(7, 'Express Finance', 'Express Finance', 'Advanced billing', 4, 1, NOW(), NOW()),
(8, 'Notifications', 'Notifications', 'System notifications', 5, 1, NOW(), NOW()),
(9, 'Communication', 'Communication Tools', 'Messaging tools', 5, 1, NOW(), NOW());



CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);

-- 3. Create a helper table to hold raw exploded permissions temporarily
DROP TABLE IF EXISTS tmp_role_permissions_raw;
CREATE TABLE tmp_role_permissions_raw (
  role_id INT,
  permission_name VARCHAR(255)
);

-- 4. Split comma-separated permissions into rows
-- ⚠️ This uses a numbers table trick. Adjust sequence length if needed.
INSERT INTO tmp_role_permissions_raw (role_id, permission_name)
SELECT r.role_id,
       TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(r.permissions, ',', n.n), ',', -1)) AS permission_name
FROM roles r
JOIN (
    SELECT a.N + b.N * 10 + 1 AS n
    FROM (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
          UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
    CROSS JOIN (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
) n
ON n.n <= 1 + LENGTH(r.permissions) - LENGTH(REPLACE(r.permissions, ',', ''));

-- 5. Insert unique permissions into permissions table
INSERT IGNORE INTO permissions (permission_key, permission_name)
SELECT 
   LOWER(REPLACE(REPLACE(TRIM(permission_name), ' ', '_'), '/', '_')) AS permission_key,
   TRIM(permission_name) AS permission_name
FROM tmp_role_permissions_raw
WHERE TRIM(permission_name) <> '';

-- 6. Map roles to permission IDs
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rpr.role_id, p.permission_id
FROM tmp_role_permissions_raw rpr
JOIN permissions p ON p.permission_name = TRIM(rpr.permission_name);

-- 7. Cleanup temporary table
DROP TABLE tmp_role_permissions_raw;


ALTER TABLE permissions
ADD COLUMN feature_id INT NULL AFTER description;

ALTER TABLE `permissions` ADD `feature_id` INT(11) NULL DEFAULT NULL AFTER `permission_id`;

ALTER TABLE permissions
ADD COLUMN feature_id INT NULL AFTER description,
ADD CONSTRAINT fk_permissions_feature
  FOREIGN KEY (feature_id) REFERENCES features(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

ALTER TABLE permissions
MODIFY COLUMN feature_id INT UNSIGNED NULL;

ALTER TABLE permissions
ADD CONSTRAINT fk_permissions_feature
  FOREIGN KEY (feature_id) REFERENCES features(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;


ALTER TABLE students
ADD COLUMN surname VARCHAR(100) NOT NULL AFTER student_name,
ADD COLUMN first_name VARCHAR(100) NOT NULL AFTER surname,
ADD COLUMN other_names VARCHAR(100) NULL AFTER first_name;


UPDATE students
SET 
    surname = SUBSTRING_INDEX(TRIM(student_name), ' ', 1),
    first_name = SUBSTRING_INDEX(SUBSTRING_INDEX(TRIM(student_name), ' ', 2), ' ', -1),
    other_names = NULLIF(TRIM(
        SUBSTRING(
            TRIM(student_name),
            LENGTH(SUBSTRING_INDEX(TRIM(student_name), ' ', 2)) + 2
        )
    ), '');

DELIMITER $$

CREATE PROCEDURE `students_queries_v2`(
    IN `query_type` VARCHAR(30), 
    IN `p_id` INT, 
    IN `p_parent_id` VARCHAR(20), 
    IN `p_guardian_id` VARCHAR(20),  
    IN `p_surname` VARCHAR(100),
    IN `p_first_name` VARCHAR(100),
    IN `p_other_names` VARCHAR(100),
    IN `p_home_address` TEXT, 
    IN `p_date_of_birth` DATE, 
    IN `p_sex` VARCHAR(10), 
    IN `p_religion` VARCHAR(50), 
    IN `p_tribe` VARCHAR(50), 
    IN `p_state_of_origin` VARCHAR(100), 
    IN `p_l_g_a` VARCHAR(100), 
    IN `p_nationality` VARCHAR(100), 
    IN `p_last_school_attended` VARCHAR(100), 
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
    IN `p_branch_id` VARCHAR(300), 
    IN `in_school_id` VARCHAR(20), 
    IN `in_password` VARCHAR(100)
)
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
    SET v_student_name = CONCAT_WS(' ', p_surname, p_first_name, p_other_names);
    SET in_student_name = v_student_name;

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

        -- Generate admission number
        SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));
    END IF;

    IF query_type = 'CREATE' THEN
        -- Lock the row for concurrency safety
        SELECT code 
        INTO in_code 
        FROM school_locations 
        WHERE school_id = in_school_id 
        AND branch_id = p_branch_id 
        FOR UPDATE;

        -- Regenerate with locked code
        SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));

        -- Check for duplicates
        SELECT COUNT(*) INTO exists_count 
        FROM students 
        WHERE admission_no = generated_adm_no;

        IF exists_count = 0 THEN
            INSERT INTO students (
                parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
                l_g_a, nationality, last_school_attended, special_health_needs, blood_group, admission_no, 
                academic_year, status, section, mother_tongue, language_known, current_class, class_name, profile_picture, 
                medical_condition, transfer_certificate, branch_id, school_id, password
            ) VALUES (
                p_parent_id, p_guardian_id, in_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
                p_l_g_a, p_nationality, p_last_school_attended, p_special_health_needs, p_blood_group, 
                generated_adm_no, 
                p_academic_year, 'Fresh Student', p_section, p_mother_tongue, p_language_known, 
                in_current_class, in_class_name, p_profile_picture,
                p_medical_condition, p_transfer_certificate, p_branch_id, in_school_id, in_password
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

            -- Return the new student record
            SELECT * FROM students WHERE id = new_student_id;
            COMMIT;
        ELSE
            SET error_msg = CONCAT('Admission number already exists: ', COALESCE(generated_adm_no, 'NULL'));
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
        END IF;

    ELSEIF query_type = 'returning_student' THEN
        -- Lock the row for concurrency safety
        SELECT code 
        INTO in_code 
        FROM school_locations 
        WHERE school_id = in_school_id 
        AND branch_id = p_branch_id 
        FOR UPDATE;

        -- Regenerate with locked code
        SET generated_adm_no = CONCAT(UPPER(COALESCE(in_short_name, '')), '/', COALESCE(branch_index, 0), '/', LPAD(COALESCE(in_code + 1, 1), 4, '0'));

        -- Check for duplicates
        SELECT COUNT(*) INTO exists_count 
        FROM students 
        WHERE admission_no = generated_adm_no;

        IF exists_count = 0 THEN
            INSERT INTO students (
                parent_id, guardian_id, student_name, home_address, date_of_birth, sex, religion, tribe, state_of_origin,
                l_g_a, nationality, last_school_attended, special_health_needs, blood_group, admission_no, 
                academic_year, status, section, mother_tongue, language_known, current_class, class_name, profile_picture, 
                medical_condition, transfer_certificate, branch_id, school_id, password
            ) VALUES (
                p_parent_id, p_guardian_id, in_student_name, p_home_address, p_date_of_birth, p_sex, p_religion, p_tribe, p_state_of_origin,
                p_l_g_a, p_nationality, p_last_school_attended, p_special_health_needs, p_blood_group, 
                generated_adm_no, 
                p_academic_year, 'Returning Student', p_section, p_mother_tongue, p_language_known, 
                in_current_class, in_class_name, p_profile_picture,
                p_medical_condition, p_transfer_certificate, p_branch_id, in_school_id, in_password
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

            -- Return the generated admission number
            SELECT generated_adm_no AS admission_no;
            COMMIT;
        ELSE
            SET error_msg = CONCAT('Admission number already exists: ', COALESCE(generated_adm_no, 'NULL'));
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_msg;
        END IF;

    ELSEIF query_type = 'BULK RETURNINGS' THEN
        IF p_admission_no IS NOT NULL AND EXISTS (
            SELECT 1 FROM students WHERE admission_no = p_admission_no
        ) THEN
            -- Update existing student
            UPDATE students
            SET 
                student_name = in_student_name,
                sex = p_sex,
                academic_year = p_academic_year,
                status = 'Returning Student',
                current_class = COALESCE(in_current_class, current_class),
                class_name = COALESCE(in_class_name, class_name),
                section = COALESCE(in_class_section, section),
                password = COALESCE(in_password, password),
                branch_id = COALESCE(p_branch_id, branch_id),
                school_id = COALESCE(in_school_id, school_id)
            WHERE admission_no = p_admission_no;
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
                'Returning Student', in_current_class,
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
            middle_name = COALESCE(p_middle_name, middle_name),
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

        SELECT * 
        FROM students 
        WHERE admission_no = p_admission_no;

    ELSEIF query_type = 'DELETE' THEN
        DELETE FROM students 
        WHERE id = p_id;
    END IF;
END$$

DELIMITER ;



ALTER TABLE `students` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `password`, ADD `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `students` 
ADD COLUMN `id` INT(11) NOT NULL AUTO_INCREMENT FIRST,
ADD PRIMARY KEY (`id`);

ALTER TABLE `school_setup` CHANGE `is_onbording` `is_onboarding` TINYINT(1) NOT NULL DEFAULT '0';



DELIMITER $$
DROP  PROCEDURE IF EXISTS `manage_payments`$$
CREATE PROCEDURE `manage_payments`(IN `query_type` VARCHAR(100), IN `in_id` VARCHAR(11), IN `in_admission_no` VARCHAR(100), IN `in_class_name` VARCHAR(100), IN `in_ref_no` INT, IN `in_item_id` VARCHAR(100), IN `in_description` VARCHAR(100), IN `in_amount` DECIMAL(8,2), IN `in_discount` DECIMAL(8,2), IN `in_fines` DECIMAL(8,2), IN `in_qty` INT, IN `in_academic_year` VARCHAR(9), IN `in_term` VARCHAR(20), IN `in_status` ENUM('Paid','Unpaid'), IN `in_due_date` DATE, IN `in_payment_date` DATE, IN `in_payment_mode` VARCHAR(255), IN `in_created_by` VARCHAR(255), IN `in_branch_id` VARCHAR(20), IN `in_school_id` VARCHAR(10), IN `in_limit` INT, IN `in_offset` INT, IN `start_date` DATE, IN `end_date` DATE, IN `total` VARCHAR(100))
BEGIN

  -- ✅ SELECT BILLS
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

        -- ✅ Insert new CR entry
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, school_id, branch_id,
            quantity, is_optional
        )
        VALUES (
            in_ref_no, in_admission_no, in_class_name, in_academic_year, in_term,
            in_amount, 0.00, in_description, in_school_id, in_branch_id,
            in_qty, 'Yes'
        );
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
         AND (p.term = in_term OR p.term IS NULL)
    WHERE 
        s.current_class = in_class_name 
        AND s.school_id = in_school_id
        AND payment_status != 'Excluded'
        AND p.academic_year = in_academic_year
        AND p.term = in_term
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

  -- ✅ UPDATE PAID
  ELSEIF query_type = 'update-paid' THEN
    UPDATE payment_entries
    SET 
        dr = COALESCE(in_amount, 0),
        `status` = COALESCE(in_status, `status`),
        payment_date = COALESCE(in_payment_date, payment_date),
        payment_mode = COALESCE(in_payment_mode, payment_mode)
    WHERE 
        item_id = in_item_id 
        AND ref_no = in_ref_no;

  -- ✅ SELECT REF
  ELSEIF query_type = 'select-ref' THEN
    SELECT * FROM payment_entries WHERE ref_no = in_ref_no;

  -- ✅ SELECT ID
  ELSEIF query_type = 'select-id' THEN 
    SELECT * FROM payment_entries WHERE id = in_id;

  -- ✅ SELECT STUDENT
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
ELSEIF query_type = 'delete' THEN 
	UPDATE payment_entries SET payment_status = 'Excluded'
    WHERE item_id = in_item_id;
  END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE  PROCEDURE `manage_payment_entries`(
    IN p_query_type VARCHAR(30),
    IN p_item_id INT,
    IN p_ref_no VARCHAR(30),
    IN p_admission_no VARCHAR(100),
    IN p_class_code VARCHAR(100),
    IN p_academic_year VARCHAR(20),
    IN p_term VARCHAR(20),
    IN p_cr DECIMAL(10,2),
    IN p_dr DECIMAL(10,2),
    IN p_description_text VARCHAR(255),
    IN p_payment_mode VARCHAR(30),
    IN p_school_id VARCHAR(20),
    IN p_branch_id VARCHAR(20),
    IN p_payment_status VARCHAR(20),
    IN p_quantity INT,
    IN p_is_optional ENUM('Yes','No')
)
BEGIN
    DECLARE total_credit DECIMAL(10,2) DEFAULT 0;
    DECLARE total_debit DECIMAL(10,2) DEFAULT 0;

    -- Insert for student-related records
    IF p_query_type = 'insert' THEN
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, cr, dr,
            description, payment_mode, school_id, branch_id, payment_status, quantity, is_optional,
            created_at, updated_at
        ) VALUES (
            p_ref_no, p_admission_no, p_class_code, p_academic_year, p_term, p_cr, p_dr,
            p_description_text, p_payment_mode, p_school_id, p_branch_id, p_payment_status, p_quantity, p_is_optional,
            NOW(), NOW()
        );

    -- Insert general income
    ELSEIF p_query_type = 'insert_income' THEN
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, cr, dr,
            description, payment_mode, school_id, branch_id, payment_status, quantity, is_optional,
            created_at, updated_at
        ) VALUES (
            p_ref_no, NULL, NULL, p_academic_year, p_term, p_cr, 0.00,
            p_description_text, p_payment_mode, p_school_id, p_branch_id, p_payment_status, p_quantity, p_is_optional,
            NOW(), NOW()
        );

    -- Insert general expense
    ELSEIF p_query_type = 'insert_expense' THEN
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, cr, dr,
            description, payment_mode, school_id, branch_id, payment_status, quantity, is_optional,
            created_at, updated_at
        ) VALUES (
            p_ref_no, NULL, NULL, p_academic_year, p_term, 0.00, p_dr,
            p_description_text, p_payment_mode, p_school_id, p_branch_id, p_payment_status, p_quantity, p_is_optional,
            NOW(), NOW()
        );

    -- Get one record
    ELSEIF p_query_type = 'get_one' THEN
        SELECT * FROM payment_entries WHERE item_id = p_item_id;

    -- Get all records
    ELSEIF p_query_type = 'get_all' THEN
        SELECT * FROM payment_entries;

    -- Edit a record
    ELSEIF p_query_type = 'edit' THEN
        UPDATE payment_entries
        SET ref_no = p_ref_no,
            admission_no = p_admission_no,
            class_code = p_class_code,
            academic_year = p_academic_year,
            term = p_term,
            cr = p_cr,
            dr = p_dr,
            description = p_description_text,
            payment_mode = p_payment_mode,
            school_id = p_school_id,
            branch_id = p_branch_id,
            payment_status = p_payment_status,
            quantity = p_quantity,
            is_optional = p_is_optional,
            updated_at = NOW()
        WHERE item_id = p_item_id;

    -- Delete a record
    ELSEIF p_query_type = 'delete' THEN
        DELETE FROM payment_entries WHERE item_id = p_item_id;

    -- Credit report (only student-related)
    ELSEIF p_query_type = 'credit_report' THEN
        SELECT 
            admission_no,
            class_code,
            academic_year,
            term,
            payment_mode,
            SUM(cr) AS total_credit
        FROM payment_entries
        WHERE admission_no IS NOT NULL AND class_code IS NOT NULL
        GROUP BY admission_no, class_code, academic_year, term, payment_mode;

    -- Debit report (only student-related)
    ELSEIF p_query_type = 'debit_report' THEN
        SELECT 
            admission_no,
            class_code,
            academic_year,
            term,
            payment_mode,
            SUM(dr) AS total_debit
        FROM payment_entries
        WHERE admission_no IS NOT NULL AND class_code IS NOT NULL
        GROUP BY admission_no, class_code, academic_year, term, payment_mode;

    -- Income report (general + student-related CR > 0)
    ELSEIF p_query_type = 'income_report' THEN
        SELECT 
            ref_no,
            description,
            admission_no,
            class_code,
            academic_year,
            term,
            payment_mode,
            SUM(cr) AS total_income
        FROM payment_entries
        WHERE cr > 0
        GROUP BY ref_no, description, admission_no, class_code, academic_year, term, payment_mode;

    -- Expenses report (general + student-related DR > 0)
    ELSEIF p_query_type = 'expenses_report' THEN
        SELECT 
            ref_no,
            description,
            admission_no,
            class_code,
            academic_year,
            term,
            payment_mode,
            SUM(dr) AS total_expenses
        FROM payment_entries
        WHERE dr > 0
        GROUP BY ref_no, description, admission_no, class_code, academic_year, term, payment_mode;

    -- Balance report (total CR - total DR)
    ELSEIF p_query_type = 'balance_report' THEN
        SELECT SUM(cr) INTO total_credit FROM payment_entries;
        SELECT SUM(dr) INTO total_debit FROM payment_entries;

        SELECT 
            total_credit AS total_credit,
            total_debit AS total_debit,
            (total_credit - total_debit) AS balance;

    -- Handle invalid
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid query type. Use insert, insert_income, insert_expense, get_one, get_all, edit, delete, credit_report, debit_report, income_report, expenses_report, or balance_report.';
    END IF;

END$
DELIMITER ;

-- ========================================
-- INCOME STATEMENT GENERATION PROCEDURE
-- ========================================
DELIMITER $

DROP PROCEDURE IF EXISTS `generate_income_statement`$

CREATE PROCEDURE `generate_income_statement`(
    IN p_school_id VARCHAR(20),
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Declare variables
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_account_code VARCHAR(20);
    DECLARE v_account_name VARCHAR(100);
    DECLARE v_account_type VARCHAR(20);
    DECLARE v_account_subtype VARCHAR(50);
    DECLARE v_amount DECIMAL(10,2) DEFAULT 0;
    
    -- Declare cursor for revenue accounts
    DECLARE revenue_cursor CURSOR FOR
        SELECT 
            '4000' as account_code,
            'Tuition Fees' as account_name,
            'REVENUE' as account_type,
            'FEES' as account_subtype,
            COALESCE(SUM(cr), 0) as amount
        FROM payment_entries 
        WHERE school_id = p_school_id 
            AND cr > 0 
            AND DATE(created_at) BETWEEN p_start_date AND p_end_date
            AND payment_status != 'Excluded'
        
        UNION ALL
        
        SELECT 
            '4100' as account_code,
            'Other Income' as account_name,
            'REVENUE' as account_type,
            'OTHER' as account_subtype,
            COALESCE(SUM(cr), 0) as amount
        FROM payment_entries 
        WHERE school_id = p_school_id 
            AND cr > 0 
            AND description NOT LIKE '%fee%' AND description NOT LIKE '%Fee%' AND description NOT LIKE '%FEES%' AND description NOT LIKE '%Fees%'
            AND DATE(created_at) BETWEEN p_start_date AND p_end_date
            AND payment_status != 'Excluded';
    
    -- Declare cursor for expense accounts
    DECLARE expense_cursor CURSOR FOR
        SELECT 
            '5000' as account_code,
            'Salaries & Wages' as account_name,
            'EXPENSE' as account_type,
            'SALARIES' as account_subtype,
            COALESCE(SUM(dr), 0) as amount
        FROM payment_entries 
        WHERE school_id = p_school_id 
            AND dr > 0 
            AND (description LIKE '%salary%' OR description LIKE '%wage%' OR description LIKE '%payroll%')
            AND DATE(created_at) BETWEEN p_start_date AND p_end_date
            AND payment_status != 'Excluded'
            
        UNION ALL
        
        SELECT 
            '5100' as account_code,
            'Utilities' as account_name,
            'EXPENSE' as account_type,
            'UTILITIES' as account_subtype,
            COALESCE(SUM(dr), 0) as amount
        FROM payment_entries 
        WHERE school_id = p_school_id 
            AND dr > 0 
            AND (description LIKE '%electric%' OR description LIKE '%water%' OR description LIKE '%internet%' OR description LIKE '%utility%')
            AND DATE(created_at) BETWEEN p_start_date AND p_end_date
            AND payment_status != 'Excluded'
            
        UNION ALL
        
        SELECT 
            '5200' as account_code,
            'Supplies & Materials' as account_name,
            'EXPENSE' as account_type,
            'SUPPLIES' as account_subtype,
            COALESCE(SUM(dr), 0) as amount
        FROM payment_entries 
        WHERE school_id = p_school_id 
            AND dr > 0 
            AND (description LIKE '%supply%' OR description LIKE '%material%' OR description LIKE '%book%' OR description LIKE '%stationery%')
            AND DATE(created_at) BETWEEN p_start_date AND p_end_date
            AND payment_status != 'Excluded'
            
        UNION ALL
        
        SELECT 
            '5900' as account_code,
            'Other Expenses' as account_name,
            'EXPENSE' as account_type,
            'OTHER' as account_subtype,
            COALESCE(SUM(dr), 0) as amount
        FROM payment_entries 
        WHERE school_id = p_school_id 
            AND dr > 0 
            AND description NOT LIKE '%salary%' AND description NOT LIKE '%wage%' AND description NOT LIKE '%payroll%'
            AND description NOT LIKE '%electric%' AND description NOT LIKE '%water%' AND description NOT LIKE '%internet%' AND description NOT LIKE '%utility%'
            AND description NOT LIKE '%supply%' AND description NOT LIKE '%material%' AND description NOT LIKE '%book%' AND description NOT LIKE '%stationery%'
            AND DATE(created_at) BETWEEN p_start_date AND p_end_date
            AND payment_status != 'Excluded';

    -- Declare continue handler
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table to store results
    DROP TEMPORARY TABLE IF EXISTS temp_income_statement;
    CREATE TEMPORARY TABLE temp_income_statement (
        account_code VARCHAR(20),
        account_name VARCHAR(100),
        account_type VARCHAR(20),
        account_subtype VARCHAR(50),
        amount DECIMAL(10,2)
    );
    
    -- Process revenue accounts
    OPEN revenue_cursor;
    read_revenue: LOOP
        FETCH revenue_cursor INTO v_account_code, v_account_name, v_account_type, v_account_subtype, v_amount;
        IF done THEN
            LEAVE read_revenue;
        END IF;
        
        -- Only insert if amount > 0
        IF v_amount > 0 THEN
            INSERT INTO temp_income_statement (account_code, account_name, account_type, account_subtype, amount)
            VALUES (v_account_code, v_account_name, v_account_type, v_account_subtype, v_amount);
        END IF;
    END LOOP;
    CLOSE revenue_cursor;
    
    -- Reset done flag
    SET done = FALSE;
    
    -- Process expense accounts
    OPEN expense_cursor;
    read_expense: LOOP
        FETCH expense_cursor INTO v_account_code, v_account_name, v_account_type, v_account_subtype, v_amount;
        IF done THEN
            LEAVE read_expense;
        END IF;
        
        -- Only insert if amount > 0
        IF v_amount > 0 THEN
            INSERT INTO temp_income_statement (account_code, account_name, account_type, account_subtype, amount)
            VALUES (v_account_code, v_account_name, v_account_type, v_account_subtype, v_amount);
        END IF;
    END LOOP;
    CLOSE expense_cursor;
    
    -- Return results
    SELECT 
        account_code,
        account_name,
        account_type,
        account_subtype,
        amount
    FROM temp_income_statement
    ORDER BY account_type DESC, account_code;
    
    -- Clean up
    DROP TEMPORARY TABLE IF EXISTS temp_income_statement;
    
END$

DELIMITER ;



DELIMITER $$
DROP  PROCEDURE `getstudentPayments`$$
CREATE PROCEDURE `getstudentPayments`(IN `query_type` VARCHAR(50), IN `in_parent_id` VARCHAR(50), IN `in_admission_no` TEXT, IN `in_term` VARCHAR(50), IN `in_academic_year` VARCHAR(20), IN `in_school_id` VARCHAR(20))
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
        JOIN classes c ON e.class_code = c.class_code
        WHERE e.admission_no = in_admission_no 
          AND e.payment_status != 'Excluded'
          AND e.school_id = in_school_id
        GROUP BY e.academic_year, e.admission_no, e.term, e.class_code, c.class_name;
        
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
      AND e.school_id = in_school_id
    GROUP BY e.admission_no
) AS fee_balance ON s.admission_no = fee_balance.admission_no
WHERE p.school_id = in_school_id
GROUP BY p.parent_id, p.fullname, p.phone, p.email
HAVING total_balance > 0 OR COUNT(s.admission_no) > 0
ORDER BY total_balance DESC;

    END IF;
    END$$
DELIMITER ;

DELIMITER $$
DROP PROCEDURE `getstudentPayments`$$
CREATE  PROCEDURE `getstudentPayments`(IN `query_type` VARCHAR(50), IN `in_parent_id` VARCHAR(50), IN `in_admission_no` TEXT, IN `in_term` VARCHAR(50), IN `in_academic_year` VARCHAR(20), IN `in_school_id` VARCHAR(20))
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
        JOIN classes c ON e.class_code = c.class_code
        WHERE e.admission_no = in_admission_no 
          AND e.payment_status != 'Excluded'
          AND e.school_id = in_school_id
        GROUP BY e.academic_year, e.admission_no, e.term, e.class_code, c.class_name;
        
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
      AND e.school_id = in_school_id
    GROUP BY e.admission_no
) AS fee_balance ON s.admission_no = fee_balance.admission_no
WHERE p.school_id = in_school_id
GROUP BY p.parent_id, p.fullname, p.phone, p.email
HAVING total_balance > 0 OR COUNT(s.admission_no) > 0
ORDER BY total_balance DESC;

    END IF;
    END$$
DELIMITER ;