ALTER TABLE `ca_setup` ADD `section_id` VARCHAR(20) NULL DEFAULT NULL AFTER `status`;

ALTER TABLE ca_setup 
ADD UNIQUE KEY unique_ca (ca_type, section_id, school_id, branch_id);


DELIMITER $$

DROP PROCEDURE IF EXISTS `CreateUpdateCASetup`$$
CREATE PROCEDURE `CreateUpdateCASetup`(
    IN `p_ca_type` ENUM('CA1','CA2','CA3','CA4','EXAM'),
    IN `p_overall_contribution` DECIMAL(5,2),
    IN `p_week_no` INT(4),
    IN `p_max_score` DECIMAL(5,2),
    IN `p_section_id` VARCHAR(20),
    IN `p_school_id` VARCHAR(15),
    IN `p_branch_id` VARCHAR(20)
)
BEGIN
    INSERT INTO ca_setup (
        ca_type,
        week_number,
        max_score,
        overall_contribution_percent,
        section_id,
        school_id,
        branch_id,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_ca_type,
        p_week_no,
        p_max_score,
        p_overall_contribution,
        p_section_id,
        p_school_id,
        p_branch_id,
        'Active',
        NOW(),
        NOW()
    )
    ON DUPLICATE KEY UPDATE
        week_number = VALUES(week_number),
        max_score = VALUES(max_score),
        overall_contribution_percent = VALUES(overall_contribution_percent),
        section_id = VALUES(section_id),
        school_id = VALUES(school_id),
        branch_id = VALUES(branch_id),
        status = VALUES(status),
        updated_at = NOW();
END$$


DROP PROCEDURE IF EXISTS `GetCASetup`$$
CREATE PROCEDURE `GetCASetup`(
    IN `p_ca_type` ENUM('CA1','CA2','CA3','CA4','EXAM'),
    IN `p_school_id` VARCHAR(20),
    IN `p_branch_id` VARCHAR(30),
    IN `p_academic_year` VARCHAR(20),
    IN `p_term` VARCHAR(20),
    IN `p_section_id` VARCHAR(20)
)
BEGIN
    IF p_section_id IS NOT NULL AND p_section_id <> '' AND p_section_id <> '*' THEN
        SELECT 
            cs.id,
            cs.ca_type,
            cs.week_number,
            cs.max_score,
            cs.overall_contribution_percent,
            cs.status,
            cs.section_id,
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
          AND cs.section_id = p_section_id
        ORDER BY cs.week_number ASC;
    ELSE
        SELECT 
            cs.id,
            cs.ca_type,
            cs.week_number,
            cs.max_score,
            cs.overall_contribution_percent,
            cs.status,
            cs.section_id,
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

DELIMITER ;


ALTER TABLE `weekly_scores` ADD `status` ENUM('Draft','Submitted','Released','Approved','Archived','UnderReview','Cancelled') NOT NULL DEFAULT 'Draft' AFTER `is_locked`;


ALTER TABLE `weekly_scores` ADD `academic_year` VARCHAR(10) NOT NULL AFTER `status`, ADD `term` VARCHAR(20) NOT NULL AFTER `academic_year`;



CREATE TABLE `weekly_scores` (
 `id` int(11) NOT NULL AUTO_INCREMENT,
 `admission_no` varchar(50) NOT NULL,
 `subject_code` varchar(20) NOT NULL,
 `class_code` varchar(20) NOT NULL,
 `ca_setup_id` int(11) NOT NULL,
 `score` decimal(5,2) DEFAULT 0.00,
 `max_score` decimal(5,2) NOT NULL,
 `week_number` int(11) NOT NULL,
 `assessment_type` enum('CA1','CA2','EXAM') DEFAULT 'CA1',
 `is_locked` tinyint(1) DEFAULT 0,
 `status` enum('Draft','Submitted','Released','Approved','Archived','UnderReview','Cancelled') NOT NULL DEFAULT 'Draft',
 `academic_year` varchar(10) NOT NULL,
 `term` varchar(20) NOT NULL,
 `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
 `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
 PRIMARY KEY (`id`),
 KEY `weekly_scores_ibfk_1` (`admission_no`),
 KEY `weekly_scores_ibfk_2` (`subject_code`),
 KEY `weekly_scores_ibfk_3` (`class_code`),
 CONSTRAINT `weekly_scores_ibfk_1` FOREIGN KEY (`admission_no`) REFERENCES `students` (`admission_no`),
 CONSTRAINT `weekly_scores_ibfk_2` FOREIGN KEY (`subject_code`) REFERENCES `subjects` (`subject_code`),
 CONSTRAINT `weekly_scores_ibfk_3` FOREIGN KEY (`class_code`) REFERENCES `classes` (`class_code`)
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DELIMITER $$
DROP PROCEDURE IF EXISTS `InsertUpdateScore`$$
CREATE PROCEDURE `InsertUpdateScore`(
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
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_existing_count INT DEFAULT 0;
    DECLARE v_error_msg VARCHAR(255);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;

    -- ✅ Step 1: Validate that the CA setup exists for this CA type and week number
    SELECT COUNT(*) INTO v_count
    FROM ca_setup
    WHERE ca_type = p_ca_type
      AND week_number = p_week_number
      AND branch_id = p_branch_id
      AND status = 'Active';

    IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'No active CA setup found for the given CA type and week number';
    ELSEIF v_count > 1 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Multiple CA setups found. Please ensure unique CA setup per CA type and week';
    END IF;

    -- ✅ Step 2: Fetch CA setup ID and max score
    SELECT id, max_score INTO v_ca_setup_id, v_max_score
    FROM ca_setup
    WHERE ca_type = p_ca_type
      AND week_number = p_week_number
      AND branch_id=p_branch_id
      AND status = 'Active'
    LIMIT 1;

    -- ✅ Step 3: Check if score already exists
    SELECT COUNT(*) INTO v_existing_count
    FROM weekly_scores
    WHERE admission_no = p_admission_no
      AND subject_code = p_subject_code
      AND assessment_type = p_ca_type
      AND week_number = p_week_number;

    -- ✅ Step 4: If exists, check if locked
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
            SET MESSAGE_TEXT = 'Score is locked and cannot be modified';
        END IF;
    END IF;

    -- ✅ Step 5: Validate score against max score
    IF p_score > v_max_score THEN
        SET v_error_msg = CONCAT('Score exceeds maximum allowed score of ', v_max_score);
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = v_error_msg;
    END IF;

    -- ✅ Optional: Validate academic year and term using academic_weeks table
    IF p_academic_year IS NOT NULL OR p_term IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM academic_weeks
            WHERE week_number = p_week_number
              AND (p_academic_year IS NULL OR academic_year = p_academic_year)
              AND (p_term IS NULL OR term = p_term)
              AND status = 'Active'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid academic year or term for this week';
        END IF;
    END IF;

    -- ✅ Step 6: Insert or update score
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
        score = p_score;

    COMMIT;
END$$
DELIMITER ;


DELETE ws1 FROM weekly_scores ws1
JOIN weekly_scores ws2 
  ON ws1.admission_no = ws2.admission_no
 AND ws1.subject_code = ws2.subject_code
 AND ws1.assessment_type = ws2.assessment_type
 AND ws1.week_number = ws2.week_number
 AND ws1.academic_year = ws2.academic_year
 AND ws1.term = ws2.term
 AND ws1.id < ws2.id;
 
 ALTER TABLE weekly_scores
ADD CONSTRAINT uq_student_score
UNIQUE KEY (
    admission_no,
    subject_code,
    assessment_type,
    week_number,
    academic_year,
    term
);


DELIMITER $$

DROP PROCEDURE IF EXISTS `UpdateScoreStatus`$$
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
END$$

DELIMITER ;
 