-- Migration: Add update_student_scores stored procedure
-- Date: 2025-12-14
-- Description: Creates stored procedure for updating student application scores and status

DELIMITER $$

DROP PROCEDURE IF EXISTS `update_student_scores`$$

CREATE PROCEDURE `update_student_scores`(
  IN p_applicant_id VARCHAR(50),
  IN p_mathematics VARCHAR(5),
  IN p_english VARCHAR(5),
  IN p_other_score VARCHAR(5),
  IN p_status VARCHAR(20),
  IN p_branch VARCHAR(20),
  IN p_school_id VARCHAR(20),
  IN query_type VARCHAR(20)
)
BEGIN
    IF query_type = 'Pass' THEN
        CALL admission_no_generator(p_applicant_id, p_school_id, p_branch);
        UPDATE school_applicants
        SET 
            mathematics = p_mathematics,
            english = p_english,
            other_score = p_other_score,
            status = p_status
        WHERE 
            applicant_id = p_applicant_id 
            AND school_id = p_school_id 
            AND branch_id = p_branch;
        
        SELECT ROW_COUNT() AS affected_rows;
        
    ELSEIF query_type = 'Assigned' THEN 
        UPDATE school_applicants
        SET 
            mathematics = p_mathematics,
            english = p_english,
            other_score = p_other_score,
            status = p_status
        WHERE 
            applicant_id = p_applicant_id 
            AND school_id = p_school_id 
            AND branch_id = p_branch;
            
    ELSE
        UPDATE school_applicants
        SET 
            mathematics = p_mathematics,
            english = p_english,
            other_score = p_other_score,
            status = p_status
        WHERE 
            applicant_id = p_applicant_id 
            AND school_id = p_school_id 
            AND branch_id = p_branch;
    END IF;
    
END$$

DELIMITER ;

-- Rollback script (uncomment to rollback):
-- DROP PROCEDURE IF EXISTS `update_student_scores`;
