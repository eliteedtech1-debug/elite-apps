-- Fix stream filtering in GetClassCAReports stored procedure
-- This ensures students can only see subjects they are allowed to based on their stream

DELIMITER $$

DROP PROCEDURE IF EXISTS GetClassCAReports $$

CREATE PROCEDURE `GetClassCAReports`(
    IN `p_query_type` VARCHAR(50),
    IN `p_class_code` VARCHAR(20),
    IN `p_ca_type` ENUM('CA1','CA2','CA3','EXAM'),
    IN `p_academic_year` VARCHAR(20),
    IN `p_term` VARCHAR(50),
    IN `p_admission_no` VARCHAR(20),
    IN `p_branch_id` VARCHAR(20),
    IN `p_school_id` VARCHAR(20)
)
BEGIN
    IF p_query_type = 'View Class CA Report' THEN
        -- Use window functions for accurate positioning with stream filtering
        SELECT
            base_data.admission_no,
            base_data.subject_code,
            base_data.ca_setup_id,
            base_data.score,
            base_data.max_score,
            base_data.week_number,
            base_data.assessment_type,
            base_data.student_name,
            base_data.class_name,
            base_data.school_id,
            base_data.current_class,
            base_data.subject,
            base_data.academic_year,
            base_data.term,
            base_data.overall_contribution_percent,
            base_data.total_students_in_class,
            base_data.avg_per_subject,
            -- Use ROW_NUMBER() for proper sequential positioning
            ROW_NUMBER() OVER (
                PARTITION BY base_data.subject_code, base_data.assessment_type
                ORDER BY base_data.score DESC, base_data.student_name ASC
            ) AS sbj_position
        FROM (
            SELECT
                ws.admission_no,
                ws.subject_code,
                ws.ca_setup_id,
                ws.score,
                ws.max_score,
                ws.week_number,
                ws.assessment_type,
                s.student_name,
                c.class_name,
                ws.school_id,
                c.class_code AS current_class,
                sub.subject_name AS subject,
                aw.academic_year,
                aw.term,
                cs.overall_contribution_percent,
                -- Count total students in class for this subject and CA type
                COUNT(*) OVER (
                    PARTITION BY ws.subject_code, ws.assessment_type
                ) AS total_students_in_class,
                -- Calculate average score for this subject and CA type
                AVG(ws.score) OVER (
                    PARTITION BY ws.subject_code, ws.assessment_type
                ) AS avg_per_subject
            FROM weekly_scores ws
            INNER JOIN students s ON ws.admission_no = s.admission_no
            INNER JOIN classes c ON s.current_class = c.class_code
            INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
            INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
            LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
                AND aw.academic_year = p_academic_year
                AND aw.term = p_term
                AND aw.school_id = p_school_id
            WHERE aw.academic_year = p_academic_year
              AND ws.assessment_type = p_ca_type
              AND s.current_class = p_class_code
              AND ws.school_id = p_school_id
              AND aw.term = p_term
              AND s.status = 'Active'
              -- Stream filtering: allow core subjects for all, and subjects matching student's stream
              AND (
                  sub.type = 'core'
                  OR s.stream = 'General'
                  OR s.stream = 'None'
                  OR s.stream = sub.type
              )
        ) AS base_data
        ORDER BY base_data.subject_code, base_data.score DESC, base_data.student_name;

    ELSEIF p_query_type = "View Student CA Report" THEN
        -- Use window functions for individual student report with stream filtering
        SELECT
            base_data.admission_no,
            base_data.subject_code,
            base_data.ca_setup_id,
            base_data.score,
            base_data.max_score,
            base_data.week_number,
            base_data.assessment_type,
            base_data.student_name,
            base_data.class_name,
            base_data.school_id,
            base_data.current_class,
            base_data.subject,
            base_data.academic_year,
            base_data.term,
            base_data.overall_contribution_percent,
            base_data.total_students_in_class,
            base_data.avg_per_subject,
            -- Use ROW_NUMBER() for proper sequential positioning
            ROW_NUMBER() OVER (
                PARTITION BY base_data.subject_code, base_data.assessment_type
                ORDER BY base_data.score DESC, base_data.student_name ASC
            ) AS sbj_position
        FROM (
            SELECT
                ws.admission_no,
                ws.subject_code,
                ws.ca_setup_id,
                ws.score,
                ws.max_score,
                ws.week_number,
                ws.assessment_type,
                s.student_name,
                c.class_name,
                ws.school_id,
                c.class_code AS current_class,
                sub.subject_name AS subject,
                aw.academic_year,
                aw.term,
                cs.overall_contribution_percent,
                -- Count total students in class for this subject and CA type
                COUNT(*) OVER (
                    PARTITION BY ws.subject_code, ws.assessment_type
                ) AS total_students_in_class,
                -- Calculate average score for this subject and CA type
                AVG(ws.score) OVER (
                    PARTITION BY ws.subject_code, ws.assessment_type
                ) AS avg_per_subject
            FROM weekly_scores ws
            INNER JOIN students s ON ws.admission_no = s.admission_no
            INNER JOIN classes c ON s.current_class = c.class_code
            INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
            INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
            LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
                AND aw.academic_year = p_academic_year
                AND aw.term = p_term
                AND aw.school_id = p_school_id
            WHERE aw.academic_year = p_academic_year
              AND ws.assessment_type = p_ca_type
              AND ws.admission_no = p_admission_no
              AND ws.school_id = p_school_id
              AND aw.term = p_term
              AND s.status = 'Active'
              -- Stream filtering: allow core subjects for all, and subjects matching student's stream
              AND (
                  sub.type = 'core'
                  OR s.stream = 'General'
                  OR s.stream = 'None'
                  OR s.stream = sub.type
              )
        ) AS base_data
        ORDER BY base_data.subject_code, base_data.score DESC;

    ELSEIF p_query_type = "student admission_no" THEN
        -- Get distinct student admission numbers and names
        SELECT DISTINCT
            s.admission_no,
            s.student_name
        FROM students s
        WHERE s.school_id = p_school_id
          AND s.status = 'Active'
        ORDER BY s.student_name;

    ELSE
        -- Default case: return all data for other query types with stream filtering
        SELECT
            ws.admission_no,
            ws.subject_code,
            ws.ca_setup_id,
            ws.score,
            ws.max_score,
            ws.week_number,
            ws.assessment_type,
            s.student_name,
            c.class_name,
            ws.school_id,
            c.class_code AS current_class,
            sub.subject_name AS subject,
            aw.academic_year,
            aw.term,
            cs.overall_contribution_percent,
            COUNT(*) OVER (
                PARTITION BY ws.subject_code, ws.assessment_type
            ) AS total_students_in_class,
            AVG(ws.score) OVER (
                PARTITION BY ws.subject_code, ws.assessment_type
            ) AS avg_per_subject,
            ROW_NUMBER() OVER (
                PARTITION BY s.current_class, ws.subject_code, ws.assessment_type
                ORDER BY ws.score DESC, s.student_name ASC
            ) AS sbj_position
        FROM weekly_scores ws
        INNER JOIN students s ON ws.admission_no = s.admission_no
        INNER JOIN classes c ON s.current_class = c.class_code
        INNER JOIN subjects sub ON ws.subject_code = sub.subject_code
        INNER JOIN ca_setup cs ON ws.ca_setup_id = cs.id
        LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
            AND aw.academic_year = p_academic_year
            AND aw.term = p_term
            AND aw.school_id = p_school_id
        WHERE ws.school_id = p_school_id
          AND s.status = 'Active'
          -- Apply stream filtering for all other query types as well
          AND (
              sub.type = 'core'
              OR s.stream = 'General'
              OR s.stream = 'None'
              OR s.stream = sub.type
          )
        ORDER BY s.current_class, sub.subject_code, ws.assessment_type, ws.score DESC;
    END IF;
END $$
DELIMITER ;