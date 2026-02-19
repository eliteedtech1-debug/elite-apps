const StudentBillingController = require('../controllers/StudentBillingController');
const { authenticate } = require('../middleware/auth');

/**
 * STUDENT BILLING ROUTES
 * 
 * Provides aggregated student billing data for the BillClasses component
 * These routes return student-level summaries instead of individual invoice line items
 */

module.exports = function(app) {
  /**
   * @route GET /api/student-billing/class-bills
   * @desc Get aggregated student billing data for a class
   * @access Private
   * @params class_code, class_name, academic_year, term, branch_id, limit, offset
   * @returns Array of student objects with aggregated billing data
   * 
   * Response format:
   * {
   *   success: true,
   *   data: [
   *     {
   *       admission_no: "213232/1/0005",
   *       student_name: "John Doe",
   *       class_name: "Primary 1",
   *       invoice_count: 4,
   *       total_invoice: 1079184.75,
   *       discount: 0,
   *       fines: 0
   *     }
   *   ]
   * }
   */
  app.get('/api/student-billing/class-bills', authenticate, StudentBillingController.getAggregatedClassBills);

  /**
   * @route GET /api/student-billing/student-details
   * @desc Get detailed invoice breakdown for a specific student
   * @access Private
   * @params admission_no, academic_year, term, branch_id
   * @returns Array of individual invoice line items
   */
  app.get('/api/student-billing/student-details', authenticate, StudentBillingController.getDetailedStudentBills);

  /**
   * @route GET /api/student-billing/class-summary
   * @desc Get billing summary statistics for a class
   * @access Private
   * @params class_code, class_name, academic_year, term, branch_id
   * @returns Summary object with totals and counts
   */
  app.get('/api/student-billing/class-summary', authenticate, StudentBillingController.getClassBillingSummary);
};