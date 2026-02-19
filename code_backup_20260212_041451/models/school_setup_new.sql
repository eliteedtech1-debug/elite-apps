ALTER TABLE `school_setup` ADD `school_second_name` VARCHAR(100) NULL DEFAULT NULL AFTER `school_name`;


DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `school_setup`(IN `query_type` VARCHAR(50), IN `p_sch_id` VARCHAR(10), IN `p_school_name` VARCHAR(500), IN `p_school_second_name` VARCHAR(100), IN `p_short_name` VARCHAR(20), IN `p_academic_year` VARCHAR(20), IN `p_session_start_date` DATE, IN `p_session_end_date` DATE, IN `p_status` VARCHAR(20), IN `p_badge_url` VARCHAR(500), IN `p_mission` VARCHAR(500), IN `p_vission` VARCHAR(500), IN `p_about_us` VARCHAR(500), IN `p_school_motto` VARCHAR(300), IN `p_state` VARCHAR(100), IN `p_lga` VARCHAR(100), IN `p_address` VARCHAR(255), IN `p_primary_contact_number` VARCHAR(13), IN `p_secondary_contact_number` VARCHAR(13), IN `p_email` VARCHAR(70), IN `p_school_master` TINYINT(1), IN `p_express_finance` TINYINT(1), IN `p_cbt_center` TINYINT(1), IN `p_result_station` TINYINT(1), IN `p_nursery` TINYINT(1), IN `p_primary` TINYINT(1), IN `p_junior_secondary` TINYINT(1), IN `p_senior_secondary` TINYINT(1), IN `p_islamiyya` TINYINT(1), IN `p_tahfiz` TINYINT(1), IN `p_admin_name` VARCHAR(50), IN `p_admin_email` VARCHAR(50), IN `p_admin_password` VARCHAR(100), IN `p_domain` VARCHAR(100), IN `p_section_type` VARCHAR(30), IN `p_created_by` VARCHAR(20), IN `p_cbt_stand_alone` TINYINT(1), IN `p_sms_subscription` TINYINT(1), IN `p_whatsapp_subscription` TINYINT(1), IN `p_email_subscription` TINYINT(1), IN `p_assessmentType` VARCHAR(20), IN `p_is_arabic` TINYINT(1), IN `p_default_lang` VARCHAR(5), IN `p_second_lang` VARCHAR(5))
BEGIN
    DECLARE in_sch_id VARCHAR(20);
    DECLARE current_id INT(8);
    DECLARE in_prefix VARCHAR(5);
    DECLARE brch_id INT;
    DECLARE brch_code VARCHAR(50);
    DECLARE p_cbt_url VARCHAR(50);
    DECLARE trimed_short_name VARCHAR(50);
    DECLARE got_school_lock, got_branch_lock INT DEFAULT 0;

    -- Trim short name
    SET trimed_short_name = TRIM(p_short_name);

    -- ============================================
    -- SAFE ID GENERATION SECTION
    -- ============================================
    IF query_type NOT LIKE '%select%' AND query_type != 'update' AND query_type != 'update_school' THEN
        -- Attempt to get school_code lock for 5 seconds
        SELECT GET_LOCK('school_code_lock', 5) INTO got_school_lock;
        IF got_school_lock = 1 THEN
            SELECT MAX(code) + 1 INTO current_id
            FROM number_generator
            WHERE description = 'school_code';

            SELECT prefix INTO in_prefix
            FROM number_generator
            WHERE description = 'school_code';

            SET in_sch_id = CONCAT(in_prefix, '/', current_id);

            -- Update the code safely
            UPDATE number_generator
            SET code = current_id
            WHERE description = 'school_code';

            -- Release the lock immediately
            SELECT RELEASE_LOCK('school_code_lock');
        ELSE
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to acquire school_code lock';
        END IF;

        -- Now safely generate branch code
        SELECT GET_LOCK('branch_code_lock', 5) INTO got_branch_lock;
        IF got_branch_lock = 1 THEN
            SELECT code + 1 INTO brch_id
            FROM number_generator
            WHERE description = 'branch_code';

            SET brch_code = CONCAT('BRCH', LPAD(CAST(brch_id AS CHAR(5)), 5, '0'));

            UPDATE number_generator
            SET code = brch_id
            WHERE description = 'branch_code';

            SELECT RELEASE_LOCK('branch_code_lock');
        ELSE
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to acquire branch_code lock';
        END IF;
    END IF;


    -- ============================================
    -- MAIN LOGIC
    -- ============================================

    IF query_type = 'CREATE' THEN
        -- Insert into school_locations
        INSERT INTO `school_locations`(`branch_id`, `school_id`, `branch_name`, `location`, `short_name`, `status`)
        VALUES (brch_code, in_sch_id, 'Main Branch', p_address, trimed_short_name, 'Active');

        -- Generate URLs
        SET @p_school_url = CONCAT('www.', trimed_short_name, '.elitescholar.ng');
        SET p_cbt_url = CONCAT('www.', trimed_short_name, '.elitecbt.ng');

        -- Insert into school_setup
        INSERT INTO `school_setup`(
            `school_id`, `school_name`, `school_second_name`, `short_name`, `school_motto`, `state`, `lga`, `address`,
            `primary_contact_number`, `secondary_contact_number`, `email_address`,
            `school_master`, `express_finance`, `cbt_center`, `result_station`,
            `academic_year`, `session_start_date`, `session_end_date`, `status`,
            `badge_url`, `mission`, `vission`, `about_us`, `nursery_section`,
            `primary_section`, `junior_secondary_section`, `senior_secondary_section`,
            `islamiyya`, `tahfiz`, `school_url`, `cbt_url`, `created_by`, `section_type`,
            `cbt_stand_alone`, `sms_subscription`, `whatsapp_subscription`, `email_subscription`, `assessmentType`,
            `is_arabic`, `default_lang`, `second_lang`
        ) VALUES (
            in_sch_id, p_school_name, p_school_second_name, trimed_short_name, p_school_motto, p_state, p_lga, p_address,
            p_primary_contact_number, p_secondary_contact_number, p_email,
            p_school_master, p_express_finance, p_cbt_center, p_result_station,
            p_academic_year, p_session_start_date, p_session_end_date, p_status,
            p_badge_url, p_mission, p_vission, p_about_us, p_nursery, p_primary,
            p_junior_secondary, p_senior_secondary, p_islamiyya, p_tahfiz,
            @p_school_url, p_cbt_url, p_created_by, p_section_type,
            COALESCE(p_cbt_stand_alone, 0), COALESCE(p_sms_subscription, 0),
            COALESCE(p_whatsapp_subscription, 0), COALESCE(p_email_subscription, 0),
            COALESCE(p_assessmentType, 'Fixed'),
            COALESCE(p_is_arabic, 0), COALESCE(p_default_lang, 'en'), p_second_lang
        );

        -- Insert admin user
        INSERT INTO `users` (`name`, `email`, `username`, `user_type`, `password`, `school_id`)
        VALUES (p_admin_name, p_admin_email, trimed_short_name, 'Admin', p_admin_password, in_sch_id);

        -- Return created ID
        SELECT in_sch_id AS school_id;


    -- ========================
    -- SELECT OPERATIONS
    -- ========================
    ELSEIF query_type = 'select' THEN
        IF CAST(p_created_by AS CHAR(20)) = '1' THEN
            SELECT school_id, school_name, school_second_name, short_name, school_motto, state, lga, address,
            primary_contact_number, secondary_contact_number, email_address,
            school_master, express_finance, cbt_center, result_station,
            academic_year, session_start_date, session_end_date, status,
            badge_url, mission, vission, about_us, nursery_section,
            primary_section, junior_secondary_section, senior_secondary_section,
            islamiyya, tahfiz, school_url, cbt_url, created_by, section_type,
            cbt_stand_alone, sms_subscription, whatsapp_subscription, email_subscription, assessmentType,
            is_arabic, default_lang, second_lang
            FROM school_setup ORDER BY school_id ASC;
        ELSE
            SELECT school_id, school_name, school_second_name, short_name, school_motto, state, lga, address,
            primary_contact_number, secondary_contact_number, email_address,
            school_master, express_finance, cbt_center, result_station,
            academic_year, session_start_date, session_end_date, status,
            badge_url, mission, vission, about_us, nursery_section,
            primary_section, junior_secondary_section, senior_secondary_section,
            islamiyya, tahfiz, school_url, cbt_url, created_by, section_type,
            cbt_stand_alone, sms_subscription, whatsapp_subscription, email_subscription, assessmentType,
            is_arabic, default_lang, second_lang
            FROM school_setup
            WHERE CAST(created_by AS CHAR(20)) = CAST(p_created_by AS CHAR(20))
            ORDER BY school_id ASC;
        END IF;

    ELSEIF query_type = 'select-school' THEN
        SELECT school_id, school_name, school_second_name, short_name, school_motto, state, lga, address,
        primary_contact_number, secondary_contact_number, email_address,
        school_master, express_finance, cbt_center, result_station,
        academic_year, session_start_date, session_end_date, status,
        badge_url, mission, vission, about_us, nursery_section,
        primary_section, junior_secondary_section, senior_secondary_section,
        islamiyya, tahfiz, school_url, cbt_url, created_by, section_type,
        cbt_stand_alone, sms_subscription, whatsapp_subscription, email_subscription, assessmentType,
        is_arabic, default_lang, second_lang
        FROM school_setup WHERE school_id = p_sch_id;

    ELSEIF query_type = 'select-all' THEN
    	IF p_created_by=1 THEN
        	SELECT school_id, school_name, school_second_name, short_name, school_motto, state, lga, address,
        	primary_contact_number, secondary_contact_number, email_address,
        	school_master, express_finance, cbt_center, result_station,
        	academic_year, session_start_date, session_end_date, status,
        	badge_url, mission, vission, about_us, nursery_section,
        	primary_section, junior_secondary_section, senior_secondary_section,
        	islamiyya, tahfiz, school_url, cbt_url, created_by, section_type,
        	cbt_stand_alone, sms_subscription, whatsapp_subscription, email_subscription, assessmentType,
        	is_arabic, default_lang, second_lang
        	FROM school_setup;
        ELSE
        	 SELECT school_id, school_name, school_second_name, short_name, school_motto, state, lga, address,
        	 primary_contact_number, secondary_contact_number, email_address,
        	 school_master, express_finance, cbt_center, result_station,
        	 academic_year, session_start_date, session_end_date, status,
        	 badge_url, mission, vission, about_us, nursery_section,
        	 primary_section, junior_secondary_section, senior_secondary_section,
        	 islamiyya, tahfiz, school_url, cbt_url, created_by, section_type,
        	 cbt_stand_alone, sms_subscription, whatsapp_subscription, email_subscription, assessmentType,
        	 is_arabic, default_lang, second_lang
        	 FROM school_setup WHERE created_by=p_created_by;
        END IF;
	ELSEIF query_type = 'select-all-with-student-count' THEN
    IF p_created_by = 1 THEN
        SELECT ss.school_id, ss.school_name, ss.school_second_name, ss.short_name, ss.school_motto, ss.state, ss.lga, ss.address,
        ss.primary_contact_number, ss.secondary_contact_number, ss.email_address,
        ss.school_master, ss.express_finance, ss.cbt_center, ss.result_station,
        ss.academic_year, ss.session_start_date, ss.session_end_date, ss.status,
        ss.badge_url, ss.mission, ss.vission, ss.about_us, ss.nursery_section,
        ss.primary_section, ss.junior_secondary_section, ss.senior_secondary_section,
        ss.islamiyya, ss.tahfiz, ss.school_url, ss.cbt_url, ss.created_by, ss.section_type,
        ss.cbt_stand_alone, ss.sms_subscription, ss.whatsapp_subscription, ss.email_subscription, ss.assessmentType,
        ss.is_arabic, ss.default_lang, ss.second_lang,
        COALESCE(sc.total_students, 0) AS total_students
        FROM school_setup ss
        LEFT JOIN (
            SELECT school_id, COUNT(*) AS total_students
            FROM students
            GROUP BY school_id
        ) sc ON sc.school_id = ss.school_id;

    ELSE
        SELECT ss.school_id, ss.school_name, ss.school_second_name, ss.short_name, ss.school_motto, ss.state, ss.lga, ss.address,
        ss.primary_contact_number, ss.secondary_contact_number, ss.email_address,
        ss.school_master, ss.express_finance, ss.cbt_center, ss.result_station,
        ss.academic_year, ss.session_start_date, ss.session_end_date, ss.status,
        ss.badge_url, ss.mission, ss.vission, ss.about_us, ss.nursery_section,
        ss.primary_section, ss.junior_secondary_section, ss.senior_secondary_section,
        ss.islamiyya, ss.tahfiz, ss.school_url, ss.cbt_url, ss.created_by, ss.section_type,
        ss.cbt_stand_alone, ss.sms_subscription, ss.whatsapp_subscription, ss.email_subscription, ss.assessmentType,
        ss.is_arabic, ss.default_lang, ss.second_lang,
        COALESCE(sc.total_students, 0) AS total_students
        FROM school_setup ss
        LEFT JOIN (
            SELECT school_id, COUNT(*) AS total_students
            FROM students
            GROUP BY school_id
        ) sc ON sc.school_id = ss.school_id
        WHERE ss.created_by = p_created_by;

    END IF;

    ELSEIF query_type = 'select-subjects' THEN
        SELECT * FROM subjects WHERE school_id = p_sch_id GROUP BY subject;

    ELSEIF query_type = 'select-class-names' THEN
        SELECT * FROM classes WHERE school_id = p_sch_id ORDER BY class_id ASC;

    ELSEIF query_type = 'select-section-classes' THEN
        SELECT * FROM classes
        WHERE school_id = p_sch_id
        AND branch_id = p_school_name
        ORDER BY class_code ASC;

    ELSEIF query_type = 'get_school_url' THEN
        SELECT school_url FROM school_setup WHERE school_id = p_sch_id;

    ELSEIF query_type = 'update' THEN
        UPDATE school_setup SET status = p_status WHERE school_id = p_sch_id;

    ELSEIF query_type = 'update_school' THEN
        UPDATE school_setup
        SET
            school_name               = COALESCE(p_school_name, school_name),
            school_second_name        = COALESCE(p_school_second_name, school_second_name),
            short_name                = COALESCE(p_short_name, short_name),
            school_motto              = COALESCE(p_school_motto, school_motto),
            state                     = COALESCE(p_state, state),
            lga                       = COALESCE(p_lga, lga),
            address                   = COALESCE(p_address, address),
            primary_contact_number    = COALESCE(p_primary_contact_number, primary_contact_number),
            secondary_contact_number  = COALESCE(p_secondary_contact_number, secondary_contact_number),
            email_address             = COALESCE(p_email, email_address),
            school_master             = COALESCE(p_school_master, school_master),
            express_finance           = COALESCE(p_express_finance, express_finance),
            cbt_center                = COALESCE(p_cbt_center, cbt_center),
            cbt_stand_alone           = COALESCE(p_cbt_stand_alone, cbt_stand_alone),
            result_station            = COALESCE(p_result_station, result_station),
            nursery_section           = COALESCE(p_nursery, nursery_section),
            primary_section           = COALESCE(p_primary, primary_section),
            junior_secondary_section  = COALESCE(p_junior_secondary, junior_secondary_section),
            senior_secondary_section  = COALESCE(p_senior_secondary, senior_secondary_section),
            islamiyya                 = COALESCE(p_islamiyya, islamiyya),
            tahfiz                    = COALESCE(p_tahfiz, tahfiz),
            school_url                = COALESCE(p_domain, school_url),
            section_type              = COALESCE(p_section_type, section_type),
            sms_subscription          = COALESCE(p_sms_subscription, sms_subscription),
            whatsapp_subscription     = COALESCE(p_whatsapp_subscription, whatsapp_subscription),
            email_subscription        = COALESCE(p_email_subscription, email_subscription),
            assessmentType            = COALESCE(p_assessmentType, assessmentType),
            is_arabic                 = COALESCE(p_is_arabic, is_arabic),
            default_lang              = COALESCE(p_default_lang, default_lang),
            second_lang               = COALESCE(p_second_lang, second_lang)
        WHERE school_id = p_sch_id;

    ELSEIF query_type = 'get-branches' THEN
        SELECT * FROM school_locations WHERE school_id = p_sch_id ORDER BY branch_id ASC;

    ELSEIF query_type = 'get-sections' THEN
        SELECT * FROM school_section_table WHERE school_id = p_sch_id;

    ELSEIF query_type = 'select-academic-calendar' THEN
        SELECT * FROM academic_calendar WHERE school_id = p_sch_id ORDER BY status ASC;

    ELSEIF query_type = 'select-by-short-name' THEN
        SELECT * FROM school_setup WHERE LOWER(short_name) = LOWER(p_short_name);

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid query_type';
    END IF;
END$$
DELIMITER ;


CREATE TABLE `school_setup` (
  `school_id` varchar(20) NOT NULL DEFAULT '0',
  `school_name` varchar(500) NOT NULL,
  `school_second_name` varchar(100) DEFAULT NULL,
  `section_type` varchar(50) DEFAULT NULL,
  `short_name` varchar(10) NOT NULL,
  `school_motto` varchar(500) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `lga` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `primary_contact_number` varchar(13) DEFAULT NULL,
  `secondary_contact_number` varchar(13) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `school_master` tinyint(1) DEFAULT 0,
  `express_finance` tinyint(1) DEFAULT 0,
  `cbt_center` tinyint(1) DEFAULT 0,
  `result_station` tinyint(1) DEFAULT 0,
  `academic_year` varchar(20) DEFAULT NULL,
  `term` enum('First term','Second term','Third term') DEFAULT NULL,
  `session_start_date` date DEFAULT NULL,
  `session_end_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `is_onboarding` tinyint(1) NOT NULL DEFAULT 1,
  `badge_url` varchar(500) DEFAULT NULL,
  `website` varchar(200) DEFAULT NULL,
  `mission` varchar(500) DEFAULT NULL,
  `vission` varchar(500) DEFAULT NULL,
  `about_us` varchar(300) DEFAULT NULL,
  `has_class_stream` tinyint(1) NOT NULL DEFAULT 0,
  `nursery_section` tinyint(1) NOT NULL DEFAULT 0,
  `primary_section` tinyint(1) NOT NULL DEFAULT 0,
  `junior_secondary_section` tinyint(1) NOT NULL DEFAULT 0,
  `senior_secondary_section` tinyint(1) NOT NULL DEFAULT 0,
  `islamiyya` tinyint(1) NOT NULL DEFAULT 0,
  `tahfiz` tinyint(1) NOT NULL DEFAULT 0,
  `school_url` varchar(200) DEFAULT NULL,
  `cbt_url` varchar(50) DEFAULT NULL,
  `cbt_stand_alone` tinyint(1) NOT NULL DEFAULT 0,
  `sms_subscription` tinyint(1) NOT NULL DEFAULT 0,
  `whatsapp_subscription` tinyint(1) NOT NULL DEFAULT 0,
  `email_subscription` tinyint(1) NOT NULL DEFAULT 0,
  `assessmentType` enum('Monthly','Fixed') NOT NULL DEFAULT 'Fixed',
  `created_by` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_arabic` tinyint(1) DEFAULT 0 COMMENT 'Enable Arabic report support: 0=English only, 1=Arabic enabled',
  `default_lang` varchar(5) NOT NULL DEFAULT 'en' COMMENT 'Primary language for the school (e.g., en, ar, fr, es)',
  `second_lang` varchar(5) DEFAULT NULL COMMENT 'Optional secondary language for bilingual schools (e.g., ar, fr, es)',
  PRIMARY KEY (`school_id`),
  UNIQUE KEY `short_name` (`short_name`),
  UNIQUE KEY `school_setup_school_id` (`school_id`),
  UNIQUE KEY `school_setup_short_name` (`short_name`),
  UNIQUE KEY `email_address` (`email_address`),
  KEY `school_setup_status` (`status`),
  KEY `school_setup_state` (`state`),
  KEY `school_setup_lga` (`lga`),
  KEY `school_setup_academic_year` (`academic_year`),
  KEY `school_setup_term` (`term`),
  KEY `school_setup_is_onbording` (`is_onboarding`)
);