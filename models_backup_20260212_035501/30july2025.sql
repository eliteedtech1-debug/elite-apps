-- Query to get total number of students per class
SELECT 
    c.class_name,
    c.class_code,
    c.section,
    c.school_id,
    c.branch_id,
    c.capacity,
    c.level,
    c.status AS class_status,
    COUNT(s.admission_no) AS total_students,
    c.capacity - COUNT(s.admission_no) AS available_capacity,
    ROUND((COUNT(s.admission_no) / c.capacity) * 100, 2) AS occupancy_percentage
FROM classes c
LEFT JOIN students s ON (
    c.class_name = s.class_name 
    AND c.school_id = s.school_id 
    AND c.section = s.section
    AND s.status != 'Inactive'  -- Exclude inactive students
)
WHERE c.status = 'Active'  -- Only active classes
GROUP BY 
    c.class_name, 
    c.class_code, 
    c.section, 
    c.school_id, 
    c.branch_id, 
    c.capacity, 
    c.level, 
    c.status
ORDER BY 
    c.school_id, 
    c.level, 
    c.class_name, 
    c.section;

-- Alternative view for easy reuse
CREATE OR REPLACE VIEW `view_students_per_class` AS
SELECT 
    c.class_name,
    c.class_code,
    c.section,
    c.school_id,
    c.branch_id,
    c.capacity,
    c.level,
    c.status AS class_status,
    COUNT(s.admission_no) AS total_students,
    CASE 
        WHEN c.capacity IS NOT NULL 
        THEN c.capacity - COUNT(s.admission_no)
        ELSE NULL 
    END AS available_capacity,
    CASE 
        WHEN c.capacity IS NOT NULL AND c.capacity > 0
        THEN ROUND((COUNT(s.admission_no) / c.capacity) * 100, 2)
        ELSE NULL 
    END AS occupancy_percentage,
    -- Additional useful information
    COUNT(CASE WHEN s.sex = 'Male' THEN 1 END) AS male_students,
    COUNT(CASE WHEN s.sex = 'Female' THEN 1 END) AS female_students,
    c.created_at AS class_created_at,
    c.updated_at AS class_updated_at
FROM classes c
LEFT JOIN students s ON (
    c.class_name = s.class_name 
    AND c.school_id = s.school_id 
    AND c.section = s.section
    AND s.status != 'Inactive'  -- Exclude inactive students
)
WHERE c.status = 'Active'  -- Only active classes
GROUP BY 
    c.class_name, 
    c.class_code, 
    c.section, 
    c.school_id, 
    c.branch_id, 
    c.capacity, 
    c.level, 
    c.status,
    c.created_at,
    c.updated_at
ORDER BY 
    c.school_id, 
    c.level, 
    c.class_name, 
    c.section;

-- Quick summary query for administrators
SELECT 
    school_id,
    COUNT(DISTINCT class_name) AS total_classes,
    SUM(total_students) AS total_students_in_school,
    AVG(total_students) AS avg_students_per_class,
    SUM(capacity) AS total_capacity,
    ROUND(AVG(occupancy_percentage), 2) AS avg_occupancy_percentage
FROM view_students_per_class
GROUP BY school_id
ORDER BY school_id;


ALTER TABLE `grade_boundaries` ADD `remark` VARCHAR(50) NOT NULL AFTER `school_id`;


DELIMITER $$

CREATE PROCEDURE GetStudentEndOfTermReport(
    IN p_admission_no VARCHAR(50),
    IN p_academic_year VARCHAR(20),
    IN p_term VARCHAR(50)
)
BEGIN
    -- All DECLARE statements must come first
    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_error_message VARCHAR(255) DEFAULT '';
    DECLARE v_year VARCHAR(20);
    DECLARE v_term_val VARCHAR(50);

    -- Error handler must come before any statements
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 
            'error' AS status,
            'An error occurred while retrieving the report.' AS message,
            NULL AS student_info,
            NULL AS subjects_data;
    END;

    -- Set default values
    SET v_year = IFNULL(p_academic_year, '2025/2026');
    SET v_term_val = IFNULL(p_term, 'First Term');

    START TRANSACTION;

    -- Check if student exists
    SELECT COUNT(*) INTO v_student_exists 
    FROM students 
    WHERE admission_no = p_admission_no;

    IF v_student_exists = 0 THEN
        SELECT 
            'error' AS status,
            'Student not found with the provided admission number' AS message,
            NULL AS student_info,
            NULL AS subjects_data;
    ELSE
        -- Return student basic information
        SELECT 
            'success' AS status,
            'Student report retrieved successfully' AS message,
            JSON_OBJECT(
                'admission_no', s.admission_no,
                'student_name', s.student_name,
                'class_name', s.class_name,
                'class_code', s.current_class,
                'school_id', s.school_id,
                'section', s.section,
                'academic_year', v_year,
                'term', v_term_val
            ) AS student_info
        FROM students s
        WHERE s.admission_no = p_admission_no;

        -- Return subjects performance data
        SELECT
            *
        FROM view_end_of_term_report
        WHERE admission_no = p_admission_no
          AND academic_year = v_year
          AND term = v_term_val
        ORDER BY subject;
    END IF;

    COMMIT;
END$$

DELIMITER ;
