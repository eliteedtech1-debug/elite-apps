DROP PROCEDURE IF EXISTS GetStudentScores;

DELIMITER $$

CREATE PROCEDURE `GetStudentScores`(
    IN `query_type` VARCHAR(50), 
    IN `p_admission_no` VARCHAR(50), 
    IN `p_subject_code` VARCHAR(50), 
    IN `p_class_code` VARCHAR(20), 
    IN `p_ca_type` VARCHAR(10), 
    IN `p_academic_year` VARCHAR(20), 
    IN `p_term` VARCHAR(20), 
    IN `p_week_number` INT
)
BEGIN
    IF query_type = 'SELECT-ALL' THEN
        SELECT DISTINCT
            ws.id,
            ws.admission_no AS admissionNo,
            ws.subject_code AS subjectCode,
            ws.class_code AS classCode,
            ws.score,
            ws.max_score AS maxScore,
            ws.week_number AS weekNumber,
            ws.assessment_type AS caType,
            ws.created_at AS createdAt,
            ws.updated_at AS updatedAt,
            ws.academic_year AS academicYear,
            ws.term AS term
        FROM weekly_scores ws
        WHERE (p_subject_code IS NULL OR ws.subject_code = p_subject_code)
          AND (p_class_code IS NULL OR ws.class_code = p_class_code)
          AND (p_ca_type IS NULL OR ws.assessment_type = p_ca_type)
          AND (p_academic_year IS NULL OR ws.academic_year = p_academic_year)
          AND (p_term IS NULL OR ws.term = p_term)
        ORDER BY ws.updated_at DESC;

    ELSEIF query_type = 'SELECT' THEN
        SELECT DISTINCT
            ws.id,
            ws.admission_no AS admissionNo,
            ws.subject_code AS subjectCode,
            ws.class_code AS classCode,
            ws.score,
            ws.max_score AS maxScore,
            ws.week_number AS weekNumber,
            ws.assessment_type AS caType,
            ws.created_at AS createdAt,
            ws.updated_at AS updatedAt,
            ws.academic_year AS academicYear,
            ws.term AS term
        FROM weekly_scores ws
        WHERE (p_admission_no IS NULL OR ws.admission_no = p_admission_no)
          AND (p_subject_code IS NULL OR ws.subject_code = p_subject_code)
          AND (p_class_code IS NULL OR ws.class_code = p_class_code)
          AND (p_ca_type IS NULL OR ws.assessment_type = p_ca_type)
          AND (p_week_number IS NULL OR ws.week_number = p_week_number)
          AND (p_academic_year IS NULL OR ws.academic_year = p_academic_year)
          AND (p_term IS NULL OR ws.term = p_term)
        ORDER BY ws.updated_at DESC;
    END IF;
END$$

DELIMITER ;
