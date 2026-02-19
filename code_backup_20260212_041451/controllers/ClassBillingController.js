const db = require("../models");
const sequelize = db.sequelize;
const { QueryTypes } = require("sequelize");

/**
 * Class Billing Controller - Provides aggregated billing data for classes
 * This replaces the broken procedure-based approach with direct SQL queries
 */

/**
 * Get aggregated billing data for a class
 * Returns student-level aggregated data instead of individual payment entries
 */
const getClassBillingData = async (req, res) => {
  try {
    let {
      query_type = 'select-bills-aggregated',
      class_code = null,
      class_name = null,
      term = null,
      academic_year = null,
      branch_id = null,
      school_id = null,
      limit = 100,
      offset = 0
    } = req.query;

    console.log('🔍 ClassBillingController - getClassBillingData called with:', {
      query_type,
      class_code,
      class_name,
      term,
      academic_year,
      branch_id: branch_id || req.user?.branch_id,
      school_id: school_id || req.user?.school_id
    });

    // Handle class_code parameter - use it as the primary identifier
    const classIdentifier = class_code || class_name;
    
    if (!classIdentifier) {
      return res.status(400).json({
        success: false,
        message: "class_code or class_name parameter is required",
        data: []
      });
    }

    // Set default values from user context
    const finalBranchId = branch_id || req.user?.branch_id;
    const finalSchoolId = school_id || req.user?.school_id;

    if (!finalSchoolId) {
      return res.status(400).json({
        success: false,
        message: "school_id is required",
        data: []
      });
    }

    // Build the aggregated query - Fixed to match working API pattern
    const sql = `
      SELECT 
        s.admission_no,
        s.student_name,
        s.current_class as class_name,
        COALESCE(pe.term, :term) as term,
        COALESCE(pe.academic_year, :academic_year) as academic_year,
        COUNT(pe.item_id) as invoice_count,
        COALESCE(SUM(pe.cr), 0) as total_invoice,
        COALESCE(SUM(pe.dr), 0) as total_paid,
        COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) as balance,
        CASE 
          WHEN COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) <= 0 THEN 'Paid'
          WHEN COALESCE(SUM(pe.dr), 0) > 0 THEN 'Partial'
          ELSE 'Unpaid'
        END as payment_status,
        MAX(pe.created_at) as last_transaction_date,
        COUNT(CASE WHEN pe.payment_status = 'Confirmed' THEN 1 END) as confirmed_payments,
        COUNT(CASE WHEN pe.payment_status = 'Pending' THEN 1 END) as pending_payments
      FROM students s 
      LEFT JOIN payment_entries pe 
        ON s.admission_no = pe.admission_no
        ${term ? 'AND pe.term = :term' : ''}
        ${academic_year ? 'AND pe.academic_year = :academic_year' : ''}
        AND pe.school_id = :school_id
        ${finalBranchId ? 'AND pe.branch_id = :branch_id' : ''}
      WHERE 
        s.current_class = :class_identifier
        AND s.school_id = :school_id
        ${finalBranchId ? 'AND s.branch_id = :branch_id' : ''}
        AND s.status IN ('Active', 'Suspended')
      GROUP BY 
        s.admission_no, 
        s.student_name, 
        s.current_class
      ORDER BY s.student_name ASC
      LIMIT :limit OFFSET :offset
    `;

    const replacements = {
      class_identifier: classIdentifier,
      school_id: finalSchoolId,
      term: term || null,
      academic_year: academic_year || null,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    };

    if (finalBranchId) {
      replacements.branch_id = finalBranchId;
    }

    console.log('🔍 Executing SQL with replacements:', replacements);

    const result = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT
    });

    console.log('✅ Query executed successfully:', {
      resultCount: result.length,
      sampleData: result.slice(0, 2)
    });

    // Calculate summary statistics
    const summary = {
      total_students: result.length,
      billed_students: result.filter(s => s.invoice_count > 0).length,
      unbilled_students: result.filter(s => s.invoice_count === 0).length,
      total_amount: result.reduce((sum, s) => sum + parseFloat(s.total_invoice || 0), 0),
      total_paid: result.reduce((sum, s) => sum + parseFloat(s.total_paid || 0), 0),
      outstanding_balance: result.reduce((sum, s) => sum + parseFloat(s.balance || 0), 0)
    };

    res.json({
      success: true,
      message: `Retrieved ${result.length} students from class ${classIdentifier}`,
      data: result,
      summary,
      query_type: 'select-bills-aggregated',
      system: 'orm_direct_sql',
      debug: {
        class_identifier: classIdentifier,
        term,
        academic_year,
        school_id: finalSchoolId,
        branch_id: finalBranchId,
        sql_executed: true
      }
    });

  } catch (error) {
    console.error("❌ Error in getClassBillingData:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving class billing data",
      error: error.message,
      data: []
    });
  }
};

/**
 * Get detailed billing breakdown for a specific student
 */
const getStudentBillingDetails = async (req, res) => {
  try {
    const {
      admission_no,
      term = null,
      academic_year = null,
      branch_id = null,
      school_id = null
    } = req.query;

    if (!admission_no) {
      return res.status(400).json({
        success: false,
        message: "admission_no parameter is required",
        data: []
      });
    }

    const finalBranchId = branch_id || req.user?.branch_id;
    const finalSchoolId = school_id || req.user?.school_id;

    const sql = `
      SELECT 
        pe.item_id,
        pe.ref_no,
        pe.admission_no,
        pe.class_code,
        pe.description,
        pe.cr,
        pe.dr,
        (pe.cr - pe.dr) as balance,
        pe.quantity,
        pe.item_category,
        pe.payment_mode,
        pe.payment_status,
        pe.term,
        pe.academic_year,
        pe.created_at,
        pe.created_by,
        pe.due_date,
        pe.is_optional
      FROM payment_entries pe
      WHERE pe.admission_no = :admission_no
        AND pe.school_id = :school_id
        ${finalBranchId ? 'AND pe.branch_id = :branch_id' : ''}
        ${term ? 'AND pe.term = :term' : ''}
        ${academic_year ? 'AND pe.academic_year = :academic_year' : ''}
      ORDER BY pe.created_at DESC
    `;

    const replacements = {
      admission_no,
      school_id: finalSchoolId
    };

    if (finalBranchId) replacements.branch_id = finalBranchId;
    if (term) replacements.term = term;
    if (academic_year) replacements.academic_year = academic_year;

    const result = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      message: `Retrieved ${result.length} billing entries for student ${admission_no}`,
      data: result,
      query_type: 'select-student-details',
      system: 'orm_direct_sql'
    });

  } catch (error) {
    console.error("❌ Error in getStudentBillingDetails:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving student billing details",
      error: error.message,
      data: []
    });
  }
};

/**
 * Get class summary statistics
 */
const getClassSummary = async (req, res) => {
  try {
    const {
      class_code,
      term = null,
      academic_year = null,
      branch_id = null,
      school_id = null
    } = req.query;

    if (!class_code) {
      return res.status(400).json({
        success: false,
        message: "class_code parameter is required"
      });
    }

    const finalBranchId = branch_id || req.user?.branch_id;
    const finalSchoolId = school_id || req.user?.school_id;

    const sql = `
      SELECT 
        COUNT(DISTINCT s.admission_no) as total_students,
        COUNT(DISTINCT pe.admission_no) as students_with_bills,
        COUNT(pe.item_id) as total_bill_items,
        SUM(pe.cr) as total_charges,
        SUM(pe.dr) as total_payments,
        SUM(pe.cr - pe.dr) as outstanding_balance,
        AVG(pe.cr) as average_charge,
        COUNT(CASE WHEN pe.payment_status = 'Confirmed' THEN 1 END) as confirmed_payments,
        COUNT(CASE WHEN pe.payment_status = 'Pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN pe.payment_status = 'Cancelled' THEN 1 END) as cancelled_payments
      FROM students s
      LEFT JOIN payment_entries pe 
        ON s.admission_no = pe.admission_no
        AND s.current_class = pe.class_code
        ${term ? 'AND pe.term = :term' : ''}
        ${academic_year ? 'AND pe.academic_year = :academic_year' : ''}
        AND pe.school_id = :school_id
        ${finalBranchId ? 'AND pe.branch_id = :branch_id' : ''}
      WHERE 
        s.current_class = :class_code
        AND s.school_id = :school_id
        ${finalBranchId ? 'AND s.branch_id = :branch_id' : ''}
        AND s.status = 'Active'
    `;

    const replacements = {
      class_code,
      school_id: finalSchoolId
    };

    if (finalBranchId) replacements.branch_id = finalBranchId;
    if (term) replacements.term = term;
    if (academic_year) replacements.academic_year = academic_year;

    const result = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      message: "Class summary retrieved successfully",
      data: result[0] || {},
      query_type: 'class-summary',
      system: 'orm_direct_sql'
    });

  } catch (error) {
    console.error("❌ Error in getClassSummary:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving class summary",
      error: error.message
    });
  }
};

/**
 * Test function to verify database connectivity and data
 */
const testClassBilling = async (req, res) => {
  try {
    const { class_code = 'CLS0003' } = req.query;
    const school_id = req.user?.school_id;

    // Test 1: Check if students exist in the class
    const studentsQuery = `
      SELECT COUNT(*) as student_count, current_class
      FROM students 
      WHERE current_class = :class_code AND school_id = :school_id
      GROUP BY current_class
    `;

    const studentsResult = await sequelize.query(studentsQuery, {
      replacements: { class_code, school_id },
      type: QueryTypes.SELECT
    });

    // Test 2: Check if payment entries exist for the class
    const paymentsQuery = `
      SELECT COUNT(*) as payment_count, class_code
      FROM payment_entries 
      WHERE class_code = :class_code AND school_id = :school_id
      GROUP BY class_code
    `;

    const paymentsResult = await sequelize.query(paymentsQuery, {
      replacements: { class_code, school_id },
      type: QueryTypes.SELECT
    });

    // Test 3: Sample data
    const sampleQuery = `
      SELECT s.admission_no, s.student_name, s.current_class,
             COUNT(pe.item_id) as bill_count,
             SUM(pe.cr) as total_charges
      FROM students s
      LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no
      WHERE s.current_class = :class_code AND s.school_id = :school_id
      GROUP BY s.admission_no, s.student_name, s.current_class
      LIMIT 5
    `;

    const sampleResult = await sequelize.query(sampleQuery, {
      replacements: { class_code, school_id },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      message: "Class billing test completed",
      data: {
        students_in_class: studentsResult[0]?.student_count || 0,
        payment_entries_for_class: paymentsResult[0]?.payment_count || 0,
        sample_students: sampleResult,
        test_parameters: {
          class_code,
          school_id,
          user_branch_id: req.user?.branch_id
        }
      },
      system: 'orm_direct_sql'
    });

  } catch (error) {
    console.error("❌ Error in testClassBilling:", error);
    res.status(500).json({
      success: false,
      message: "Error testing class billing",
      error: error.message
    });
  }
};

/**
 * Debug function without authentication to test database queries
 */
const debugClassBilling = async (req, res) => {
  try {
    const { class_code = 'CLS0003', school_id = 'SCH/1' } = req.query;

    console.log('🔍 Debug class billing - no auth required:', {
      class_code,
      school_id
    });

    // Test the exact query from the working API
    const workingApiQuery = `
      SELECT 
        class_name,
        current_class,
        COUNT(DISTINCT s.admission_no) as student_count,
        COALESCE(SUM(pe.cr), 0) as total_expected_amount,
        COALESCE(SUM(pe.dr), 0) as total_collected_amount,
        COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) as balance_remaining
      FROM students s
      LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no
      WHERE s.current_class = :class_code AND s.school_id = :school_id
      GROUP BY s.current_class, class_name
    `;

    const workingResult = await sequelize.query(workingApiQuery, {
      replacements: { class_code, school_id },
      type: QueryTypes.SELECT
    });

    // Test simple students query first
    const simpleStudentsQuery = `
      SELECT 
        s.admission_no,
        s.student_name,
        s.current_class,
        s.school_id,
        s.status
      FROM students s 
      WHERE 
        s.current_class = :class_code
        AND s.school_id = :school_id
      ORDER BY s.student_name ASC
    `;

    const simpleStudentsResult = await sequelize.query(simpleStudentsQuery, {
      replacements: { class_code, school_id },
      type: QueryTypes.SELECT
    });

    // Test my V2 query (simplified)
    const v2Query = `
      SELECT 
        s.admission_no,
        s.student_name,
        s.current_class as class_name,
        COUNT(pe.item_id) as invoice_count,
        COALESCE(SUM(pe.cr), 0) as total_invoice,
        COALESCE(SUM(pe.dr), 0) as total_paid,
        COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) as balance
      FROM students s 
      LEFT JOIN payment_entries pe 
        ON s.admission_no = pe.admission_no
        AND pe.school_id = :school_id
      WHERE 
        s.current_class = :class_code
        AND s.school_id = :school_id
      GROUP BY 
        s.admission_no, 
        s.student_name, 
        s.current_class
      ORDER BY s.student_name ASC
    `;

    const v2Result = await sequelize.query(v2Query, {
      replacements: { class_code, school_id },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      message: "Debug completed",
      data: {
        working_api_result: workingResult,
        simple_students_result: simpleStudentsResult,
        v2_api_result: v2Result,
        comparison: {
          working_api_count: workingResult.length,
          simple_students_count: simpleStudentsResult.length,
          v2_api_count: v2Result.length,
          working_student_count: workingResult[0]?.student_count || 0
        }
      },
      debug: {
        class_code,
        school_id,
        queries_executed: 3
      }
    });

  } catch (error) {
    console.error("❌ Error in debugClassBilling:", error);
    res.status(500).json({
      success: false,
      message: "Error in debug",
      error: error.message
    });
  }
};

module.exports = {
  getClassBillingData,
  getStudentBillingDetails,
  getClassSummary,
  testClassBilling,
  debugClassBilling
};