-- ================================nazifsql

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateUpdateCASetup`(IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'), IN `p_academic_year` VARCHAR(20), IN `p_term` VARCHAR(50), IN `p_overall_contribution` DECIMAL(5,2), IN `p_week_no` INT(4), IN `p_max_score` INT(4), IN `p_school_id` VARCHAR(15))
BEGIN
    #DECLARE EXIT HANDLER FOR SQLEXCEPTION
    #BEGIN
    #    ROLLBACK;
    #    RESIGNAL;
    #END;
    
    #START TRANSACTION; 
    -- #START TRANSACTION; 
    
    INSERT INTO ca_setup (
        ca_type, 
        week_number, 
        max_score, 
        overall_contribution_percent, 
        academic_year, 
        term,
        is_active,
        school_id
    ) VALUES (
        p_ca_type,
        p_week_no,
        p_max_score,
        p_overall_contribution,
        p_academic_year,
        p_term,
        TRUE,
        p_school_id
    )
    ON DUPLICATE KEY UPDATE
        max_score = VALUES(max_score),
        overall_contribution_percent = VALUES(overall_contribution_percent),
        is_active = VALUES(is_active),
        school_id = VALUES(school_id);
        
    #COMMIT;
END$$
DELIMITER ;

ALTER TABLE `grade_boundaries` ADD `school_id` VARCHAR(20) NOT NULL AFTER `created_at`;


DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `DeleteCAAndGradeBoundaries`(
    IN `p_query_type` VARCHAR(20), -- Expected values: 'ca', 'grade'
    IN `p_id` INT,                 -- ID of the record to delete
    IN `p_school_id` VARCHAR(20)   -- School ID for validation
)
BEGIN
    DECLARE rows_affected INT DEFAULT 0;

    -- Check the query type and perform the corresponding delete operation
    IF p_query_type = 'ca' THEN
        -- Delete from ca_setup table based on id and school_id
        DELETE FROM ca_setup
        WHERE id = p_id AND school_id = p_school_id;

        SET rows_affected = ROW_COUNT();

        -- Optional: Handle no rows affected if needed
        -- IF rows_affected = 0 THEN
        --    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No matching CA Setup record found to delete.';
        -- END IF;

    ELSEIF p_query_type = 'grade' THEN
        -- Delete from grade_boundaries table based on id and school_id
        DELETE FROM grade_boundaries
        WHERE id = p_id AND school_id = p_school_id;

        SET rows_affected = ROW_COUNT();

        -- Optional: Handle no rows affected if needed
        -- IF rows_affected = 0 THEN
        --    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No matching Grade Boundary record found to delete.';
        -- END IF;

    ELSE
        -- Handle invalid query type
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid p_query_type provided. Expected ''ca'' or ''grade''.';
    END IF;

    -- Optionally, you can SELECT the rows_affected count if needed
    -- SELECT rows_affected AS deleted_rows;

END$$
DELIMITER ;




-- =================end nazifsql