USE full_skcooly;

-- Get the current procedure definition
SET @sql = (SELECT ROUTINE_DEFINITION FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_SCHEMA = 'full_skcooly' AND ROUTINE_NAME = 'students_queries');

-- Replace the select-class query to include branch_id filter
SET @sql = REPLACE(@sql, 
    'WHERE s.current_class = p_current_class\r\n      AND s.status IN (''Active'', ''Suspended'')\r\n      AND s.school_id = in_school_id',
    'WHERE s.current_class = p_current_class\r\n      AND s.status IN (''Active'', ''Suspended'')\r\n      AND s.school_id = in_school_id\r\n      AND s.branch_id = p_branch_id'
);

-- Drop and recreate the procedure
DROP PROCEDURE IF EXISTS students_queries;

SET @create_sql = CONCAT('CREATE PROCEDURE students_queries(IN `query_type` VARCHAR(30), IN `p_id` INT, IN `p_parent_id` VARCHAR(20), IN `p_guardian_id` VARCHAR(20), IN `p_student_name` VARCHAR(255), IN `p_home_address` TEXT, IN `p_date_of_birth` DATE, IN `p_sex` VARCHAR(10), IN `p_religion` VARCHAR(50), IN `p_tribe` VARCHAR(50), IN `p_state_of_origin` VARCHAR(100), IN `p_l_g_a` VARCHAR(100), IN `p_nationality` VARCHAR(100), IN `p_last_school_attended` VARCHAR(100), IN `p_special_health_needs` VARCHAR(100), IN `p_blood_group` VARCHAR(100), IN `p_admission_no` VARCHAR(50), IN `p_admission_date` DATE, IN `p_academic_year` VARCHAR(20), IN `p_status` VARCHAR(100), IN `p_section` VARCHAR(100), IN `p_mother_tongue` VARCHAR(100), IN `p_language_known` VARCHAR(100), IN `p_current_class` VARCHAR(50), IN `p_profile_picture` VARCHAR(300), IN `p_medical_condition` VARCHAR(300), IN `p_transfer_certificate` VARCHAR(500), IN `p_branch_id` VARCHAR(300), IN `in_school_id` VARCHAR(20), IN `in_password` VARCHAR(100)) ', @sql);

PREPARE stmt FROM @create_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
