USE full_skcooly;

DROP PROCEDURE IF EXISTS students_queries;

DELIMITER $$

CREATE PROCEDURE students_queries(
    IN query_type VARCHAR(30), 
    IN p_id INT, 
    IN p_parent_id VARCHAR(20), 
    IN p_guardian_id VARCHAR(20), 
    IN p_student_name VARCHAR(255), 
    IN p_home_address TEXT, 
    IN p_date_of_birth DATE, 
    IN p_sex VARCHAR(10), 
    IN p_religion VARCHAR(50), 
    IN p_tribe VARCHAR(50), 
    IN p_state_of_origin VARCHAR(100), 
    IN p_l_g_a VARCHAR(100), 
    IN p_nationality VARCHAR(100), 
    IN p_last_school_attended VARCHAR(100), 
    IN p_special_health_needs VARCHAR(100), 
    IN p_blood_group VARCHAR(100), 
    IN p_admission_no VARCHAR(50), 
    IN p_admission_date DATE, 
    IN p_academic_year VARCHAR(20), 
    IN p_status VARCHAR(100), 
    IN p_section VARCHAR(100), 
    IN p_mother_tongue VARCHAR(100), 
    IN p_language_known VARCHAR(100), 
    IN p_current_class VARCHAR(50), 
    IN p_profile_picture VARCHAR(300), 
    IN p_medical_condition VARCHAR(300), 
    IN p_transfer_certificate VARCHAR(500), 
    IN p_branch_id VARCHAR(300), 
    IN in_school_id VARCHAR(20), 
    IN in_password VARCHAR(100)
)
BEGIN
    IF query_type = 'select-class' THEN
        SELECT s.*, 
               CASE
                   WHEN cs.stream = 'Mixed' AND s.stream IN ('General', 'None') THEN 'NotStreamed'
                   WHEN cs.stream NOT IN ('None', 'General', 'Mixed') AND s.stream <> cs.stream THEN 'NotStreamed'
                   ELSE 'Streamed'
               END AS stream_status
        FROM students s
        LEFT JOIN classes cs ON s.current_class = cs.class_code
        WHERE s.current_class = p_current_class
          AND s.status IN ('Active', 'Suspended')
          AND s.school_id = in_school_id
          AND s.branch_id = p_branch_id
        ORDER BY s.class_name, s.student_name ASC;
    END IF;
END$$

DELIMITER ;
