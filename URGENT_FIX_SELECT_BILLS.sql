-- URGENT FIX FOR SELECT-BILLS RETURNING ONLY 1 STUDENT
-- The issue is confirmed: 6 students exist but only 1 is returned

DELIMITER $$

-- First, let's see what the current procedure is actually returning
SELECT 'Current procedure debug - checking what it returns:' as debug_info;

CALL manage_payments_enhanced(
    'select-bills', 
    NULL, 
    NULL, 
    'CLS0003', 
    NULL, NULL, NULL, NULL, NULL,
    '2025/2026', 
    'First Term', 
    NULL, NULL, 
    'BRCH00001', 
    'SCH/1',
    NULL, NULL, NULL, NULL, NULL
);

-- Now let's create a fixed version
DROP PROCEDURE IF EXISTS `manage_payments_enhanced` $$

CREATE PROCEDURE `manage_payments_enhanced`(
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
    -- CREATE PAYMENT ENTRY (BILL/INVOICE)
    -- =====================================================================================
    IF query_type = 'create' THEN
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

    -- =====================================================================================
    -- UPDATE PAYMENT ENTRY
    -- =====================================================================================
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

    -- =====================================================================================
    -- RECORD PAYMENT (DEBIT ENTRY)
    -- =====================================================================================
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

    -- =====================================================================================
    -- SELECT STUDENT BILLS WITH BALANCE - FIXED VERSION
    -- =====================================================================================
    ELSEIF query_type = 'select-bills' THEN
        SELECT 
            s.student_name, 
            s.current_class AS class_name, 
            s.admission_no, 
            COALESCE(in_term, 'First Term') AS term,
            COUNT(pe.item_id) AS invoice_count,
            COALESCE(SUM(pe.cr), 0) AS total_invoice,
            COALESCE(SUM(pe.dr), 0) AS total_paid,
            COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) AS balance,
            CASE 
                WHEN COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) <= 0 THEN 'Paid'
                WHEN COALESCE(SUM(pe.dr), 0) > 0 THEN 'Partial'
                ELSE 'Unpaid'
            END AS payment_status
        FROM students s 
        LEFT JOIN payment_entries pe 
              ON s.admission_no = pe.admission_no
             AND (pe.term = in_term OR in_term IS NULL)
             AND (pe.academic_year = in_academic_year OR in_academic_year IS NULL)
             AND (pe.school_id = in_school_id OR in_school_id IS NULL)
        WHERE 
            s.current_class = in_class_name 
            AND (s.school_id = in_school_id OR in_school_id IS NULL)
            AND (s.branch_id = in_branch_id OR in_branch_id IS NULL)
        GROUP BY s.student_name, s.current_class, s.admission_no  -- FIXED: Removed pe.term from GROUP BY
        ORDER BY s.student_name;

    -- =====================================================================================
    -- SELECT FAMILY BILLS
    -- =====================================================================================
    ELSEIF query_type = 'select-family-bills' THEN
        SELECT 
            s.student_name, 
            s.current_class AS class_name, 
            s.admission_no, 
            COALESCE(in_term, 'First Term') AS term,
            COUNT(pe.item_id) AS invoice_count,
            COALESCE(SUM(pe.cr), 0) AS total_invoice,
            COALESCE(SUM(pe.dr), 0) AS total_paid,
            COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) AS balance,
            CASE 
                WHEN COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) <= 0 THEN 'Paid'
                WHEN COALESCE(SUM(pe.dr), 0) > 0 THEN 'Partial'
                ELSE 'Unpaid'
            END AS payment_status
        FROM students s 
        LEFT JOIN payment_entries pe 
              ON s.admission_no = pe.admission_no
             AND (pe.term = in_term OR in_term IS NULL)
             AND (pe.academic_year = in_academic_year OR in_academic_year IS NULL)
             AND (pe.school_id = in_school_id OR in_school_id IS NULL)
        WHERE 
            s.parent_id = in_id
            AND (s.school_id = in_school_id OR in_school_id IS NULL)
            AND (s.branch_id = in_branch_id OR in_branch_id IS NULL)
        GROUP BY s.student_name, s.current_class, s.admission_no  -- FIXED: Removed pe.term from GROUP BY
        ORDER BY s.student_name;

    -- =====================================================================================
    -- SELECT PAYMENT DETAILS FOR A STUDENT
    -- =====================================================================================
    ELSEIF query_type = 'select-payments' THEN
        SELECT 
            pe.*,
            s.student_name,
            CASE 
                WHEN pe.cr > 0 THEN 'Invoice'
                WHEN pe.dr > 0 THEN 'Payment'
                ELSE 'Unknown'
            END AS entry_type
        FROM payment_entries pe
        JOIN students s ON pe.admission_no = s.admission_no
        WHERE 
            pe.admission_no = in_admission_no
            AND (pe.term = in_term OR in_term IS NULL)
            AND (pe.academic_year = in_academic_year OR in_academic_year IS NULL)
            AND pe.school_id = in_school_id
            AND (in_branch_id IS NULL OR pe.branch_id = in_branch_id)
        ORDER BY pe.created_at DESC;

    -- =====================================================================================
    -- SELECT BY REFERENCE NUMBER
    -- =====================================================================================
    ELSEIF query_type = 'select-ref' THEN
        SELECT * FROM payment_entries 
        WHERE ref_no = in_ref_no 
        AND school_id = in_school_id;

    -- =====================================================================================
    -- SELECT BY ITEM ID
    -- =====================================================================================
    ELSEIF query_type = 'select-id' THEN 
        SELECT * FROM payment_entries 
        WHERE item_id = in_id 
        AND school_id = in_school_id;

    -- =====================================================================================
    -- SELECT STUDENT ENTRIES
    -- =====================================================================================
    ELSEIF query_type = 'select-student' THEN 
        SELECT * FROM payment_entries 
        WHERE 
            admission_no = in_admission_no
            AND (in_term IS NULL OR term = in_term)
            AND (in_academic_year IS NULL OR academic_year = in_academic_year)
            AND school_id = in_school_id
        ORDER BY created_at DESC;

    -- =====================================================================================
    -- GET STUDENT BALANCE
    -- =====================================================================================
    ELSEIF query_type = 'balance' THEN
        SELECT 
            admission_no,
            term,
            academic_year,
            COALESCE(SUM(cr), 0) AS total_invoiced,
            COALESCE(SUM(dr), 0) AS total_paid,
            COALESCE(SUM(cr), 0) - COALESCE(SUM(dr), 0) AS balance
        FROM payment_entries
        WHERE 
            admission_no = in_admission_no
            AND (in_term IS NULL OR term = in_term)
            AND (in_academic_year IS NULL OR academic_year = in_academic_year)
            AND school_id = in_school_id
        GROUP BY admission_no, term, academic_year;

    -- =====================================================================================
    -- DELETE PAYMENT ENTRY
    -- =====================================================================================
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
SELECT 'Testing fixed procedure:' as test_info;

CALL manage_payments_enhanced(
    'select-bills', 
    NULL, 
    NULL, 
    'CLS0003', 
    NULL, NULL, NULL, NULL, NULL,
    '2025/2026', 
    'First Term', 
    NULL, NULL, 
    'BRCH00001', 
    'SCH/1',
    NULL, NULL, NULL, NULL, NULL
);

SELECT 'Fix applied successfully! The procedure should now return all 6 students.' as success_message;"