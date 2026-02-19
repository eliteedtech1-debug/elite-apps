ALTER TABLE `ca_setup` CHANGE `section_id` `section` VARCHAR(20)  DEFAULT NULL;

DELIMITER $$
DROP PROCEDURE IF EXISTS `GetAllCASetups`$$
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
END$$
DELIMITER ;


DROP PROCEDURE IF EXISTS `CreateUpdateCASetup`$$
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
        p_section,
        p_school_id,
        p_branch_id,
        'Active'
    )
    ON DUPLICATE KEY UPDATE
        week_number = VALUES(week_number),
        max_score = VALUES(max_score),
        overall_contribution_percent = VALUES(overall_contribution_percent),
        section = VALUES(section),
        school_id = VALUES(school_id),
        branch_id = VALUES(branch_id),
        status = VALUES(status);
END$$

DROP PROCEDURE IF EXISTS `GetAllCASetups`$$
CREATE PROCEDURE `GetAllCASetups`(IN `in_branch_id` VARCHAR(20))
BEGIN
    SELECT 
        ca.section,
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
    GROUP BY ca.section, ca.ca_type, ca.status
    ORDER BY ca.section, ca.ca_type;
END$$

DROP PROCEDURE IF EXISTS `GetCASetup`$$
CREATE PROCEDURE `GetCASetup`(
    IN `p_ca_type` ENUM('CA1','CA2','CA3','CA4','EXAM'),
    IN `p_school_id` VARCHAR(20),
    IN `p_branch_id` VARCHAR(30),
    IN `p_academic_year` VARCHAR(20),
    IN `p_term` VARCHAR(20),
    IN `p_section` VARCHAR(20)
)
BEGIN
    IF p_section IS NOT NULL AND p_section <> '' AND p_section <> '*' THEN
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
END$$

DROP  PROCEDURE IF EXISTS `InsertUpdateScore`$$
CREATE  PROCEDURE `InsertUpdateScore`(
    IN `p_admission_no` VARCHAR(50), 
    IN `p_subject_code` VARCHAR(20), 
    IN `p_class_code` VARCHAR(20), 
    IN `p_score` DECIMAL(5,2), 
    IN `p_max_score` DECIMAL(5,2), 
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
    DECLARE v_existing_count INT DEFAULT 0;
    DECLARE v_error_msg VARCHAR(255);
    DECLARE v_section VARCHAR(50) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- ✅ Step 1: Get section of the class
    SELECT section INTO v_section
    FROM classes
    WHERE class_code = p_class_code
      AND branch_id = p_branch_id
    LIMIT 1;

    -- ✅ Step 2: Try to find CA setup for this section
    SELECT id, max_score INTO v_ca_setup_id, v_max_score
    FROM ca_setup
    WHERE ca_type = p_ca_type
      AND week_number = p_week_number
      AND branch_id = p_branch_id
      AND status = 'Active'
      AND section = v_section
    LIMIT 1;

    -- ✅ Step 3: Fallback to generic setup (no section)
    IF v_ca_setup_id IS NULL THEN
        SELECT id, max_score INTO v_ca_setup_id, v_max_score
        FROM ca_setup
        WHERE ca_type = p_ca_type
          AND week_number = p_week_number
          AND branch_id = p_branch_id
          AND status = 'Active'
          AND (section IS NULL OR section = '')
        LIMIT 1;
    END IF;

    -- ✅ Step 4: If still not found, raise an error
    IF v_ca_setup_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No active CA setup found for this section or generic fallback.';
    END IF;

    -- ✅ Step 5: Check if score already exists
    SELECT COUNT(*) INTO v_existing_count
    FROM weekly_scores
    WHERE admission_no = p_admission_no
      AND subject_code = p_subject_code
      AND assessment_type = p_ca_type
      AND week_number = p_week_number;

    -- ✅ Step 6: If exists, check lock status
    IF v_existing_count > 0 THEN
        SELECT COALESCE(is_locked, FALSE) INTO v_is_locked
        FROM weekly_scores
        WHERE admission_no = p_admission_no
          AND subject_code = p_subject_code
          AND assessment_type = p_ca_type
          AND week_number = p_week_number
        LIMIT 1;

        IF v_is_locked THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Score is locked and cannot be modified.';
        END IF;
    END IF;

    -- ✅ Step 7: Validate score against max score
    IF p_score > v_max_score THEN
        SET v_error_msg = CONCAT('Score exceeds maximum allowed score of ', v_max_score);
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = v_error_msg;
    END IF;

    -- ✅ Step 8: Optional validation for academic year/term
    IF p_academic_year IS NOT NULL OR p_term IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM academic_weeks
            WHERE week_number = p_week_number
              AND (p_academic_year IS NULL OR academic_year = p_academic_year)
              AND (p_term IS NULL OR term = p_term)
              AND status = 'Active'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid academic year or term for this week.';
        END IF;
    END IF;

    -- ✅ Step 9: Insert or update weekly score
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
        updated_at = CURRENT_TIMESTAMP;

    COMMIT;
END$$
DELIMITER ;


ALTER TABLE `payment_entries` DROP INDEX `unique_payment_entry`; ALTER TABLE `payment_entries` DROP INDEX `uk_payment_entries_student_fee`;
ALTER TABLE `payment_entries` ADD UNIQUE(`ref_no`, `admission_no`, `class_code`, `academic_year`, `term`, `cr`, `dr`, `description`);


-- 03/11/2025

DELIMITER $$
DROP PROCEDURE IF EXISTS `CreateUpdateCASetup`$$
CREATE   PROCEDURE `CreateUpdateCASetup`(
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
END$$
DELIMITER ;

UPDATE `ca_setup` SET `section` = 'All' WHERE `ca_setup`.`section` IS NULL;
ALTER TABLE ca_setup 
ADD UNIQUE KEY unique_ca (ca_type, branch_id, section);




ALTER TABLE ca_setup 
DROP INDEX unique_ca_week,
ADD UNIQUE KEY unique_ca_week (ca_type, branch_id, section, week_number);

DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `GetSectionCASetup`(
    IN in_branch_id VARCHAR(20),
    IN in_section VARCHAR(20)
)
BEGIN
    DECLARE v_section VARCHAR(20);

    -- Normalize input
    SET v_section = IFNULL(NULLIF(in_section, ''), 'All');

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
            -- if user selects “All”, show everything
            v_section = 'All'
            OR ca.section = v_section
            -- fallback: if no section setup, include generic
            OR (v_section <> 'All' AND ca.section = 'All')
          )
    GROUP BY ca.section, ca.ca_type, ca.status
    ORDER BY 
        CASE WHEN ca.section = 'All' THEN 1 ELSE 0 END,  -- show generics last
        ca.ca_type;
END$$

DELIMITER ;

DELIMITER $$
DROP  PROCEDURE IF EXISTS `GetSectionCASetup`$$
CREATE  PROCEDURE `GetSectionCASetup`(
    IN in_branch_id VARCHAR(20),
    IN in_section VARCHAR(20)
)
BEGIN
    DECLARE v_section VARCHAR(50);
    DECLARE v_default_section VARCHAR(50);
    DECLARE v_has_section_records INT DEFAULT 0;

    -- Normalize input
    SET v_section = NULLIF(in_section, '');

    -- Determine what the table’s default section is (e.g., 'All')
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
        COALESCE(ca.section, v_default_section) AS section,
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
            (v_has_section_records > 0 AND ca.section = v_section)
            OR (v_has_section_records = 0 AND ca.section = v_default_section)
          )
    GROUP BY ca.section, ca.ca_type, ca.status
    ORDER BY ca.ca_type;

END$$

DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS `GetSectionCASetup`$$
CREATE PROCEDURE `GetSectionCASetup`(IN `in_branch_id` VARCHAR(20), IN `in_section` VARCHAR(20))
BEGIN
    DECLARE v_section VARCHAR(50);
    DECLARE v_default_section VARCHAR(50);
    DECLARE v_has_section_records INT DEFAULT 0;

    -- Normalize input
    SET v_section = NULLIF(in_section, '');

    -- Determine what the table’s default section is (e.g., 'All')
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
        COALESCE(ca.section, v_default_section) AS section,
        ca.ca_type,
        ca.status,
        ca.week_number,
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
            (v_has_section_records > 0 AND ca.section = v_section)
            OR (v_has_section_records = 0 AND ca.section = v_default_section)
          )
    GROUP BY ca.section, ca.ca_type, ca.status
    ORDER BY ca.ca_type;

END$$
DELIMITER ;