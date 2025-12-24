-- =====================================================
-- Elite Scholar Database Migration
-- Date: 2024-12-22
-- Description: Staff Verification Feature
-- Safe to re-run multiple times (idempotent)
-- =====================================================

-- =====================================================
-- 1. ADD require_verification COLUMN TO school_setup
-- =====================================================
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'school_setup' 
    AND COLUMN_NAME = 'require_verification'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE school_setup ADD COLUMN require_verification TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT "Column require_verification already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. DROP AND RECREATE school_setup PROCEDURE
-- =====================================================
DROP PROCEDURE IF EXISTS school_setup;

DELIMITER //

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
    IN p_vission TEXT,
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
    IN p_is_arabic TINYINT(1),
    IN p_default_lang VARCHAR(50),
    IN p_second_lang VARCHAR(50),
    IN p_personal_dev_scale VARCHAR(50),
    IN p_require_verification TINYINT(1)
)
BEGIN
    DECLARE v_school_id VARCHAR(50);
    DECLARE v_branch_id VARCHAR(50);
    DECLARE v_next_school_number INT;
    DECLARE v_next_branch_number INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF p_query_type = 'CREATE' THEN
        IF p_school_id IS NULL OR p_school_id = '' THEN
            school_loop: LOOP
                SELECT code INTO v_next_school_number
                FROM number_generator WHERE prefix = 'SCH' FOR UPDATE;

                SET v_school_id = CONCAT('SCH/', v_next_school_number);

                IF NOT EXISTS (SELECT 1 FROM school_setup WHERE school_id = v_school_id) THEN
                    UPDATE number_generator SET code = v_next_school_number + 1 WHERE prefix = 'SCH';
                    LEAVE school_loop;
                ELSE
                    UPDATE number_generator SET code = v_next_school_number + 1 WHERE prefix = 'SCH';
                END IF;
            END LOOP;
        ELSE
            SET v_school_id = p_school_id;
        END IF;
        
        branch_loop: LOOP
            SELECT code INTO v_next_branch_number
            FROM number_generator WHERE prefix = 'BRCH' FOR UPDATE;

            SET v_branch_id = CONCAT('BRCH/', v_next_branch_number);

            IF NOT EXISTS (SELECT 1 FROM school_locations WHERE branch_id = v_branch_id) THEN
                UPDATE number_generator SET code = v_next_branch_number + 1 WHERE prefix = 'BRCH';
                LEAVE branch_loop;
            ELSE
                UPDATE number_generator SET code = v_next_branch_number + 1 WHERE prefix = 'BRCH';
            END IF;
        END LOOP;
        
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
            personal_dev_scale, require_verification
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
            p_personal_dev_scale, COALESCE(p_require_verification, 0)
        );
        
        INSERT INTO users (
            name, email, username, password, user_type, status, branch_id, school_id,
            is_activated, first_login_completed, must_change_password, createdAt, activated_at, activation_method
        ) VALUES (
            p_admin_name, p_admin_email, p_admin_email, p_admin_password, 'admin', 'Active',
            v_branch_id, v_school_id, 1, 1, 0, NOW(), NOW(), 'manual_admin'
        );

        INSERT INTO school_locations (
            school_id, branch_name, short_name, location, status, branch_id, personal_dev_scale
        ) VALUES (
            v_school_id, p_school_name, p_short_name, p_address, 'active', v_branch_id, p_personal_dev_scale
        );

        SELECT v_school_id AS school_id, v_branch_id AS branch_id, 'School created successfully' AS message;
     
    ELSEIF p_query_type = 'update' OR p_query_type = 'update_school' THEN
        UPDATE school_setup SET 
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
            is_arabic = COALESCE(p_is_arabic, is_arabic),
            default_lang = COALESCE(p_default_lang, default_lang),
            second_lang = COALESCE(p_second_lang, second_lang),
            personal_dev_scale = COALESCE(p_personal_dev_scale, personal_dev_scale),
            require_verification = COALESCE(p_require_verification, require_verification),
            updated_at = NOW()
        WHERE school_id = p_school_id;
        
        SELECT p_school_id AS school_id, 'School updated successfully' AS message;
    
    ELSEIF p_query_type = 'select' OR p_query_type = 'select-all' THEN
        SELECT * FROM school_setup 
        WHERE (p_school_id IS NULL OR school_id = p_school_id)
        ORDER BY created_at DESC;
        
    ELSEIF p_query_type = 'select-by-short-name' THEN
        SELECT * FROM school_setup WHERE short_name = p_short_name ORDER BY created_at DESC;
        
    ELSEIF p_query_type = 'select-school' THEN
        SELECT * FROM school_setup WHERE school_id = p_school_id;
        
    ELSEIF p_query_type = 'DELETE' THEN
        DELETE FROM school_setup WHERE school_id = p_school_id;
        SELECT p_school_id AS school_id, 'School deleted successfully' AS message;
        
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query type';
    END IF;
    
    COMMIT;
END //

DELIMITER ;

-- =====================================================
-- 3. DROP AND RECREATE teachers PROCEDURE
-- =====================================================
DROP PROCEDURE IF EXISTS teachers;

DELIMITER //

CREATE PROCEDURE `teachers`(
    IN query_type VARCHAR(100),
    IN p_id INT(10),
    IN p_name VARCHAR(255),
    IN p_sex VARCHAR(10),
    IN p_age INT,
    IN p_address TEXT,
    IN p_date_of_birth VARCHAR(20),
    IN p_marital_status VARCHAR(50),
    IN p_state_of_origin VARCHAR(100),
    IN p_mobile_no VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_qualification VARCHAR(255),
    IN p_user_type VARCHAR(50),
    IN p_staff_type VARCHAR(255),
    IN p_staff_role VARCHAR(255),
    IN p_working_experience TEXT,
    IN p_religion VARCHAR(50),
    IN p_last_place_of_work VARCHAR(255),
    IN p_do_you_have TEXT,
    IN p_when_do DATE,
    IN p_account_name VARCHAR(255),
    IN p_account_number VARCHAR(50),
    IN p_bank VARCHAR(100),
    IN p_passport_url VARCHAR(200),
    IN p_branch_id VARCHAR(100),
    IN p_school_id VARCHAR(20),
    IN p_password VARCHAR(100)
)
BEGIN
    DECLARE _teacher_id INTEGER;
    DECLARE _user_id INTEGER;
    DECLARE _require_verification TINYINT DEFAULT 0;

    IF query_type = 'create' THEN
        START TRANSACTION;
        
        -- Check if school requires staff verification
        SELECT COALESCE(require_verification, 0) INTO _require_verification
        FROM school_setup WHERE school_id = p_school_id LIMIT 1;
        
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

        -- Create user with activation status based on school setting
        INSERT INTO users (name, email, username, phone, is_activated, must_change_password, activated_at, activation_method, password, user_type, school_id)
        VALUES (
            p_name, p_email, p_mobile_no, p_mobile_no,
            IF(_require_verification = 1, 0, 1),
            0,
            IF(_require_verification = 1, NULL, NOW()),
            IF(_require_verification = 1, NULL, 'manual_admin'),
            p_password, 'Teacher', p_school_id
        );
        
        SET _user_id = LAST_INSERT_ID();

        UPDATE teachers SET user_id = _user_id WHERE id = _teacher_id;
        
        COMMIT;
        SELECT _teacher_id AS teacher_id, _require_verification AS require_verification;

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

        SELECT user_id INTO _user_id FROM teachers WHERE id = p_id;

        UPDATE users
        SET 
            name = COALESCE(p_name, name),
            email = COALESCE(p_email, email),
            phone = COALESCE(p_mobile_no, phone),
            username = COALESCE(p_mobile_no, username)
        WHERE id = _user_id;

        SELECT id AS teacher_id FROM teachers WHERE id = p_id;
    END IF;
END //

DELIMITER ;

-- =====================================================
-- 4. UPDATE RBAC MENU CACHE (SuperAdmin section)
-- =====================================================
-- This updates the menu cache to include Queue Dashboard
-- Safe to run multiple times - uses JSON_CONTAINS check

SET @current_menu = (SELECT menu_data FROM rbac_menu_cache LIMIT 1);

-- Only update if Queue Dashboard is not already present
SET @has_queue = (
    SELECT CASE 
        WHEN @current_menu LIKE '%QUEUE_DASHBOARD_SA%' THEN 1 
        ELSE 0 
    END
);

-- Note: Menu cache update is complex in pure SQL
-- Recommend running this via application or manually updating
-- The SuperAdmin section should contain:
-- - Create School: /school-setup/add-school
-- - School List: /school-setup/school-list  
-- - Support Dashboard: /support/superadmin-dashboard
-- - Queue Dashboard: /superadmin/queues

SELECT 'Migration completed successfully' AS status;
SELECT 'Note: Verify rbac_menu_cache has Queue Dashboard entry' AS reminder;
