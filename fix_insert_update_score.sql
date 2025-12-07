DELIMITER $$

DROP PROCEDURE IF EXISTS `InsertUpdateScore`$$

CREATE PROCEDURE `InsertUpdateScore`(
    IN `p_admission_no` VARCHAR(50), 
    IN `p_subject_code` VARCHAR(20), 
    IN `p_class_code` VARCHAR(20), 
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

    -- Step 1: Fetch CA setup by week_number (primary identifier)
    SELECT id, max_score INTO v_ca_setup_id, v_max_score
    FROM ca_setup
    WHERE week_number = p_week_number
      AND branch_id = p_branch_id
      AND status = 'Active'
    LIMIT 1;

    IF v_ca_setup_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'No active CA setup found for the given week number';
    END IF;

    -- Step 2: Check if score already exists and is locked
    SELECT COUNT(*), COALESCE(MAX(is_locked), FALSE) INTO v_existing_count, v_is_locked
    FROM weekly_scores
    WHERE admission_no = p_admission_no
      AND subject_code = p_subject_code
      AND week_number = p_week_number;

    IF v_existing_count > 0 AND v_is_locked THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Score is locked and cannot be modified';
    END IF;

    -- Step 3: Validate score against max score
    IF p_score > v_max_score THEN
        SET v_error_msg = CONCAT('Score exceeds maximum allowed score of ', v_max_score);
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = v_error_msg;
    END IF;

    -- Step 4: Insert or update score (using week_number as unique key)
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
END$$

DELIMITER ;
