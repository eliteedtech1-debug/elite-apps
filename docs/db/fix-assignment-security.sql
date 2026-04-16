-- Fix assignment security vulnerability
-- The assignments stored procedure was hardcoded to teacher_id = 1
-- This allows any teacher to see all assignments instead of only their own

DELIMITER $$

DROP PROCEDURE IF EXISTS `assignments`$$

CREATE PROCEDURE `assignments`(
    IN `in_query_type` VARCHAR(50), 
    IN `in_id` VARCHAR(50), 
    IN `in_teacher_id` INT, 
    IN `in_class_name` VARCHAR(255), 
    IN `in_class_code` VARCHAR(20), 
    IN `in_subject` VARCHAR(255), 
    IN `in_subject_code` VARCHAR(20), 
    IN `in_assignment_date` DATE, 
    IN `in_submission_date` DATE, 
    IN `in_attachment` VARCHAR(255), 
    IN `in_content` TEXT, 
    IN `in_teacher_name` VARCHAR(100), 
    IN `in_title` VARCHAR(100), 
    IN `in_marks` VARCHAR(100), 
    IN `in_school_id` VARCHAR(20), 
    IN `in_branch_id` VARCHAR(20), 
    IN `in_academic_year` VARCHAR(20), 
    IN `in_term` VARCHAR(20), 
    IN `in_start_date` DATE, 
    IN `in_end_date` DATE, 
    IN `in_status` VARCHAR(50), 
    IN `in_admission_no` VARCHAR(20)
)
BEGIN
    IF in_query_type = 'create' THEN
        INSERT INTO assignments (
            teacher_id, class_name, subject, subject_code, assignment_date, submission_date, attachment,
            content, teacher_name, title, marks, school_id, branch_id, class_code, academic_year, term)
        VALUES (
            in_teacher_id, in_class_name, in_subject, in_subject_code, in_assignment_date, in_submission_date, in_attachment,
            in_content, in_teacher_name, in_title, in_marks, in_school_id, in_branch_id, in_class_code, in_academic_year, in_term);
        SELECT LAST_INSERT_ID() AS assignment_id;

    ELSEIF in_query_type = 'update' THEN
        UPDATE assignments
        SET 
            class_name = COALESCE(in_class_name, class_name),
            subject = COALESCE(in_subject, subject),
            subject_code = COALESCE(in_subject_code, subject_code),
            assignment_date = COALESCE(in_assignment_date, assignment_date),
            submission_date = COALESCE(in_submission_date, submission_date),
            attachment = COALESCE(in_attachment, attachment),
            content = COALESCE(in_content, content),
            teacher_name = COALESCE(in_teacher_name, teacher_name),
            title = COALESCE(in_title, title),
            marks = COALESCE(in_marks, marks),
            status = COALESCE(in_status, status)
        WHERE id = in_id AND teacher_id = in_teacher_id; -- SECURITY: Only allow updates by assignment creator
        SELECT in_id AS assignment_id;
        
    ELSEIF in_query_type = 'delete' THEN
        DELETE FROM assignment_questions WHERE id = in_id;
        
    ELSEIF in_query_type = 'delete_exam' THEN
        DELETE FROM assignments WHERE id = in_id AND teacher_id = in_teacher_id; -- SECURITY: Only allow deletion by assignment creator
        DELETE FROM assignment_questions WHERE assignment_id = in_id;
        
    ELSEIF in_query_type = 'select_teacher_assignment' THEN
        -- SECURITY FIX: Use in_teacher_id parameter instead of hardcoded teacher_id = 1
        SELECT 
            (SELECT SUM(aq.marks) FROM assignment_questions aq WHERE aq.assignment_id = a.id) as marks,
            a.* 
        FROM assignments a
        WHERE a.teacher_id = in_teacher_id  -- FIXED: Was hardcoded to 1
            AND a.academic_year = in_academic_year 
            AND a.term = in_term 
            AND a.school_id = in_school_id
            AND a.branch_id = in_branch_id
        ORDER BY a.assignment_date DESC;
        
    ELSEIF in_query_type = 'student_assignment' THEN
        SELECT a.*,
            COUNT(ar.question_id) AS response_count,
            COALESCE(q.total_marks, 0) AS marks,
            COALESCE(SUM(ar.score), 0) AS student_total_score
        FROM assignments a
        LEFT JOIN assignment_responses ar 
            ON ar.assignment_id = a.id 
            AND ar.admission_no = in_admission_no
        LEFT JOIN (
            SELECT assignment_id, SUM(marks) AS total_marks
            FROM assignment_questions
            GROUP BY assignment_id
        ) q ON q.assignment_id = a.id
        WHERE 
            a.class_code = in_class_code 
            AND a.status != 'draft'
            AND a.academic_year = in_academic_year 
            AND a.term = in_term 
            AND a.school_id = in_school_id 
            AND a.branch_id = in_branch_id
        GROUP BY a.id
        ORDER BY a.created_at DESC;

    ELSEIF in_query_type = 'select' THEN
        IF in_admission_no IS NOT NULL AND in_admission_no != '' THEN
            SELECT a.*,
                COUNT(ar.question_id) AS response_count,
                COALESCE(q.total_marks, 0) AS marks,
                COALESCE(SUM(ar.score), 0) AS student_total_score
            FROM assignments a
            LEFT JOIN assignment_responses ar 
                ON ar.assignment_id = a.id 
                AND ar.admission_no = in_admission_no
            LEFT JOIN (
                SELECT assignment_id, SUM(marks) AS total_marks
                FROM assignment_questions
                GROUP BY assignment_id
            ) q ON q.assignment_id = a.id
            WHERE a.id = in_id;     
        ELSE
            SELECT * FROM assignments WHERE id = in_id; 
        END IF;
        
    ELSEIF in_query_type = 'select-questions' THEN
        SELECT 
            q.id AS question_id,
            q.assignment_id,
            q.question_text,
            q.question_type,
            q.correct_answer,
            q.attachment_url,
            q.marks,
            q.options AS options_json 
        FROM assignment_questions q
        WHERE q.assignment_id = in_id;
 
    ELSEIF in_query_type = 'select-submitted' THEN
        SELECT
            a.assignment_id,
            a.question_text,
            a.question_type,
            a.correct_answer,
            a.marks,
            b.question_id,
            b.is_correct,
            b.id AS answer_id,
            b.response,
            b.admission_no,
            b.created_at AS submitted_on,
            b.score,
            b.remark
        FROM assignment_questions a
        JOIN assignment_responses b ON a.id = b.question_id
        WHERE b.assignment_id = in_id AND b.admission_no = in_content;

    ELSEIF in_query_type = 'select-responses' THEN           
        SELECT
            s.admission_no,
            s.student_name,
            ar.assignment_id,
            ar.question_id,
            ar.response,
            ar.score,
            ar.remark,
            ar.created_at AS submitted_on,
            aq.question_text,
            aq.correct_answer,
            aq.marks AS question_marks
        FROM assignment_responses ar
        JOIN students s ON s.admission_no = ar.admission_no
        JOIN assignment_questions aq ON aq.id = ar.question_id
        WHERE ar.assignment_id = in_id
        ORDER BY s.student_name, ar.question_id;
        
    END IF;
END$$

DELIMITER ;
