-- FIX FOR SELECT-BILLS PROCEDURE
-- The issue is in the GROUP BY clause which can create multiple rows per student

DELIMITER $$

DROP PROCEDURE IF EXISTS `manage_payments_enhanced_fixed` $$

CREATE PROCEDURE `manage_payments_enhanced_fixed`(
    IN `query_type` VARCHAR(100), 
    IN `in_id` VARCHAR(11), 
    IN `in_admission_no` VARCHAR(100), 
    IN `in_class_name` VARCHAR(100), 
    IN `in_ref_no` INT, 
    IN `in_item_id` VARCHAR(100), 
    IN `in_description` VARCHAR(100), 
    IN `in_amount` DECIMAL(10,2),
    IN `in_qty` INT, 
    IN `in_academic_year` VARCHAR(20),
    IN `in_term` VARCHAR(20), 
    IN `in_payment_mode` VARCHAR(255), 
    IN `in_created_by` VARCHAR(255), 
    IN `in_branch_id` VARCHAR(20), 
    IN `in_school_id` VARCHAR(20),
    IN `in_limit` INT, 
    IN `in_offset` INT, 
    IN `start_date` DATE, 
    IN `end_date` DATE, 
    IN `total` VARCHAR(100)
)
BEGIN
    DECLARE v_ref_no INT;

    -- =====================================================================================
    -- SELECT STUDENT BILLS WITH BALANCE - FIXED VERSION
    -- =====================================================================================
    IF query_type = 'select-bills' THEN
        -- Debug: Log the parameters being used
        SELECT CONCAT('DEBUG: Parameters - class_name: ', IFNULL(in_class_name, 'NULL'), 
                     ', term: ', IFNULL(in_term, 'NULL'), 
                     ', academic_year: ', IFNULL(in_academic_year, 'NULL'),
                     ', branch_id: ', IFNULL(in_branch_id, 'NULL'),
                     ', school_id: ', IFNULL(in_school_id, 'NULL')) AS debug_info;
        
        SELECT 
            s.student_name, 
            s.current_class AS class_name, 
            s.admission_no, 
            IFNULL(in_term, 'N/A') AS term,  -- Use input term instead of pe.term
            COUNT(pe.item_id) AS invoice_count,
            IFNULL(SUM(CASE WHEN pe.cr IS NOT NULL THEN pe.cr ELSE 0 END), 0) AS total_invoice,
            IFNULL(SUM(CASE WHEN pe.dr IS NOT NULL THEN pe.dr ELSE 0 END), 0) AS total_paid,
            IFNULL(SUM(CASE WHEN pe.cr IS NOT NULL THEN pe.cr ELSE 0 END), 0) - 
            IFNULL(SUM(CASE WHEN pe.dr IS NOT NULL THEN pe.dr ELSE 0 END), 0) AS balance,
            CASE 
                WHEN IFNULL(SUM(CASE WHEN pe.cr IS NOT NULL THEN pe.cr ELSE 0 END), 0) - 
                     IFNULL(SUM(CASE WHEN pe.dr IS NOT NULL THEN pe.dr ELSE 0 END), 0) <= 0 THEN 'Paid'
                WHEN IFNULL(SUM(CASE WHEN pe.dr IS NOT NULL THEN pe.dr ELSE 0 END), 0) > 0 THEN 'Partial'
                ELSE 'Unpaid'
            END AS payment_status,
            -- Additional debug fields
            s.branch_id as student_branch_id,
            s.school_id as student_school_id,
            COUNT(DISTINCT pe.item_id) as distinct_payment_entries
        FROM students s 
        LEFT JOIN payment_entries pe 
              ON s.admission_no = pe.admission_no
             AND s.current_class = pe.class_code
             AND (in_term IS NULL OR pe.term = in_term)
             AND (in_academic_year IS NULL OR pe.academic_year = in_academic_year)
             AND (in_school_id IS NULL OR pe.school_id = in_school_id)
        WHERE 
            s.current_class = in_class_name 
            AND (in_school_id IS NULL OR s.school_id = in_school_id)
            AND (in_branch_id IS NULL OR s.branch_id = in_branch_id)
        GROUP BY s.student_name, s.current_class, s.admission_no, s.branch_id, s.school_id  -- Fixed GROUP BY
        ORDER BY s.student_name;

    -- =====================================================================================
    -- All other query types remain the same as original procedure
    -- =====================================================================================
    ELSEIF query_type = 'create' THEN
        -- Generate reference number if not provided
        IF in_ref_no IS NULL OR in_ref_no = 0 THEN
            SET v_ref_no = FLOOR(1000000000 + RAND() * 9000000000);
        ELSE
            SET v_ref_no = in_ref_no;
        END IF;

        -- Insert new payment entry (bill/invoice)
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, payment_mode, school_id, branch_id
        )
        VALUES (
            v_ref_no, in_admission_no, in_class_name, in_academic_year, in_term,
            IFNULL(in_amount, 0.00), 0.00, in_description, in_payment_mode, 
            in_school_id, in_branch_id
        );

        -- Return the created entry
        SELECT * FROM payment_entries WHERE ref_no = v_ref_no AND admission_no = in_admission_no;

    ELSEIF query_type = 'update' THEN
        UPDATE payment_entries
        SET 
            cr = IFNULL(in_amount, cr),
            description = IFNULL(in_description, description),
            payment_mode = IFNULL(in_payment_mode, payment_mode),
            academic_year = IFNULL(in_academic_year, academic_year),
            term = IFNULL(in_term, term),
            branch_id = IFNULL(in_branch_id, branch_id),
            updated_at = NOW()
        WHERE 
            (item_id = in_item_id OR ref_no = in_ref_no)
            AND admission_no = in_admission_no
            AND school_id = in_school_id;

        -- Return affected rows
        SELECT ROW_COUNT() as affected_rows;

    ELSEIF query_type = 'pay' THEN
        -- Generate reference number if not provided
        IF in_ref_no IS NULL OR in_ref_no = 0 THEN
            SET v_ref_no = FLOOR(1000000000 + RAND() * 9000000000);
        ELSE
            SET v_ref_no = in_ref_no;
        END IF;

        -- Insert payment record (debit entry)
        INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term,
            cr, dr, description, payment_mode, school_id, branch_id
        )
        VALUES (
            v_ref_no, 
            in_admission_no, in_class_name, in_academic_year, in_term,
            0.00, IFNULL(in_amount, 0.00), 
            CONCAT('Payment for: ', IFNULL(in_description, 'School fees')), 
            in_payment_mode, in_school_id, in_branch_id
        );

        -- Return the payment entry
        SELECT * FROM payment_entries WHERE item_id = LAST_INSERT_ID();

    ELSEIF query_type = 'select-student' THEN 
        SELECT * FROM payment_entries 
        WHERE 
            admission_no = in_admission_no
            AND (in_term IS NULL OR term = in_term)
            AND (in_academic_year IS NULL OR academic_year = in_academic_year)
            AND school_id = in_school_id
        ORDER BY created_at DESC;

    ELSEIF query_type = 'balance' THEN
        SELECT 
            admission_no,
            term,
            academic_year,
            IFNULL(SUM(cr), 0) AS total_invoiced,
            IFNULL(SUM(dr), 0) AS total_paid,
            IFNULL(SUM(cr), 0) - IFNULL(SUM(dr), 0) AS balance
        FROM payment_entries
        WHERE 
            admission_no = in_admission_no
            AND (in_term IS NULL OR term = in_term)
            AND (in_academic_year IS NULL OR academic_year = in_academic_year)
            AND school_id = in_school_id
        GROUP BY admission_no, term, academic_year;

    ELSEIF query_type = 'delete' THEN
        DELETE FROM payment_entries 
        WHERE 
            (item_id = in_id OR ref_no = in_ref_no)
            AND school_id = in_school_id;

        SELECT ROW_COUNT() as deleted_rows;

    END IF;

END $$

DELIMITER ;

-- Test the fixed procedure
SELECT 'Fixed procedure created. Test with:' as message;
SELECT 'CALL manage_payments_enhanced_fixed("select-bills", NULL, NULL, "CLS0003", NULL, NULL, NULL, NULL, NULL, "2025/2026", "First Term", NULL, NULL, "1", "1", NULL, NULL, NULL, NULL, NULL);' as test_query;

-- Quick test to see student count
SELECT 
    'Student count check:' as info,
    COUNT(*) as total_students,
    current_class,
    school_id,
    branch_id
FROM students 
WHERE current_class = 'CLS0003' 
GROUP BY current_class, school_id, branch_id;

-- Check payment entries for this class
SELECT 
    'Payment entries check:' as info,
    COUNT(*) as total_entries,
    COUNT(DISTINCT admission_no) as unique_students,
    class_code,
    term,
    academic_year
FROM payment_entries 
WHERE class_code = 'CLS0003' 
AND term = 'First Term' 
AND academic_year = '2025/2026'
GROUP BY class_code, term, academic_year;

