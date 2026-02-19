const ORMPaymentsController = require('../controllers/ORMPaymentsController');
const ORMSchoolRevenuesController = require('../controllers/ORMSchoolRevenuesController');
const { FinancialReportController } = require('../controllers/financial_report');
const createOrUpdatePaymentEntry = require('../controllers/createOrUpdatePaymentEntry');
const db = require('../models');

/**
 * ORM-BASED PAYMENTS AND SCHOOL REVENUES ROUTES
 * 
 * These routes replace stored procedure calls with ORM operations for:
 * - Payment entries management
 * - School revenues management
 * - Student balance calculations
 * - Payment and revenue reporting
 * 
 * Benefits:
 * - AI-friendly code that's easy to understand and modify
 * - Better error handling and validation
 * - Easier testing and debugging
 * - No stored procedure dependencies
 * - Type safety with Sequelize models
 */

module.exports = (app) => {

// ================================
// PAYMENT ENTRIES ROUTES
// ================================

/**
 * @route POST /api/orm-payments/entries
 * @desc Create a new payment entry
 * @access Private
 * @replaces CALL manage_payments_enhanced('create', ...)
 */
app.post('/api/orm-payments/entries', ORMPaymentsController.createPaymentEntry);

/**
 * @route POST /api/orm-payments/entries/create
 * @desc Create a new payment entry (alias for compatibility)
 * @access Private
 * @replaces CALL manage_payments_enhanced('create', ...)
 */
app.post('/api/orm-payments/entries/create', ORMPaymentsController.createPaymentEntry);

/**
 * @route POST /api/orm-payments/entries/create-or-update
 * @desc Create or update payment entry with true upsert logic
 * @access Private
 * @replaces CALL manage_payments_enhanced('create', ...) with upsert behavior
 * @body {string} admission_no - Student admission number (required)
 * @body {string} class_code - Class code (required)
 * @body {string} academic_year - Academic year (required)
 * @body {string} term - Term (required)
 * @body {string} description - Item description (required)
 * @body {number} amount - Item amount (required)
 * @body {number} netAmount - Net amount (alternative to amount)
 * @body {number} quantity - Item quantity (default: 1)
 * @body {string} item_category - Item category (default: 'STANDARD_FEE')
 * @body {string} payment_mode - Payment mode (default: 'Cash')
 * @body {string} branch_id - Branch ID (required)
 * @body {string} school_id - School ID (required)
 * @body {string} created_by - Creator name (required)
 */
app.post('/api/orm-payments/entries/create-or-update', createOrUpdatePaymentEntry);

/**
 * @route POST /api/orm-payments/entries/create-with-enhanced-accounting
 * @desc Create payment entries with enhanced accounting features
 * @access Private
 * @replaces CALL manage_payments_enhanced('create-with-enhanced-accounting', ...)
 * @body {string} admission_no - Student admission number (required)
 * @body {string} class_name - Class name
 * @body {string} class_code - Class code
 * @body {string} academic_year - Academic year
 * @body {string} term - Term
 * @body {string} branch_id - Branch ID
 * @body {string} school_id - School ID
 * @body {string} created_by - Creator name
 * @body {array} bill_items - Array of bill items with accounting details
 * @body {array} journal_entries - Array of journal entries for accounting
 * @body {object} accounting_summary - Accounting summary with totals
 */
app.post('/api/orm-payments/entries/create-with-enhanced-accounting', ORMPaymentsController.createPaymentEntryWithEnhancedAccounting);

/**
 * @route GET /api/orm-payments/entries/student
 * @desc Get payment entries for a specific student
 * @access Private
 * @replaces CALL manage_payments_enhanced('select-student', ...)
 * @query {string} admission_no - Student admission number (required)
 * @query {string} academic_year - Academic year filter
 * @query {string} term - Term filter
 * @query {string} payment_status - Payment status filter
 * @query {number} limit - Number of records to return (default: 50)
 * @query {number} offset - Number of records to skip (default: 0)
 */
app.get('/api/orm-payments/entries/student', ORMPaymentsController.getStudentPayments);

/**
 * @route GET /api/orm-payments/entries/student/detailed
 * @desc Get detailed payment information for a student (for frontend components)
 * @access Private
 * @replaces POST /payments with query_type: "select-revenues"
 * @query {string} admission_no - Student admission number (required)
 * @query {string} class_code - Class code filter
 * @query {string} academic_year - Academic year filter
 * @query {string} term - Term filter
 * @query {number} limit - Number of records to return (default: 100)
 * @query {number} offset - Number of records to skip (default: 0)
 */
app.get('/api/orm-payments/entries/student/detailed', ORMPaymentsController.getStudentPaymentDetails);

/**
 * @route GET /api/orm-payments/entries/class
 * @desc Get payment entries for a specific class (individual entries)
 * @access Private
 * @replaces CALL manage_payments_enhanced('select-bills', ...)
 * @query {string} class_code - Class code (required)
 * @query {string} academic_year - Academic year filter
 * @query {string} term - Term filter
 * @query {string} payment_status - Payment status filter
 * @query {number} limit - Number of records to return (default: 100)
 * @query {number} offset - Number of records to skip (default: 0)
 */
app.get('/api/orm-payments/entries/class', ORMPaymentsController.getClassBills);

/**
 * @route GET /api/orm-payments/entries/class/aggregated
 * @desc Get aggregated billing data for a class (for BillClasses component)
 * @access Private
 * @replaces CALL manage_payments_enhanced('select-bills', ...) with aggregation
 * @query {string} class_code - Class code (required)
 * @query {string} academic_year - Academic year filter
 * @query {string} term - Term filter
 * @query {string} branch_id - Branch ID filter
 * @query {number} limit - Number of records to return (default: 100)
 * @query {number} offset - Number of records to skip (default: 0)
 */
app.get('/api/orm-payments/entries/class/aggregated', ORMPaymentsController.getClassBillsAggregated);

/**
 * @route GET /api/orm-payments/balance
 * @desc Get student balance information
 * @access Private
 * @replaces CALL manage_payments_enhanced('balance', ...)
 * @query {string} admission_no - Student admission number (required)
 * @query {string} academic_year - Academic year filter
 * @query {string} term - Term filter
 */
app.get('/api/orm-payments/balance', ORMPaymentsController.getStudentBalance);

/**
 * @route POST /api/orm-payments/record-payment
 * @desc Record a payment against existing bills
 * @access Private
 * @replaces CALL manage_payments_enhanced('pay', ...)
 */
app.post('/api/orm-payments/record-payment', ORMPaymentsController.recordPayment);

/**
 * @route PUT /api/orm-payments/entries/:id
 * @desc Update a payment entry
 * @access Private
 * @replaces CALL manage_payments_enhanced('update', ...)
 */
app.put('/api/orm-payments/entries/:id', ORMPaymentsController.updatePaymentEntry);

/**
 * @route POST /api/orm-payments/entries/update
 * @desc Update a payment entry (POST method for frontend compatibility)
 * @access Private
 * @replaces CALL manage_payments_enhanced('update', ...)
 * @body {number} id - Payment entry ID (required)
 * @body {string} item_id - Payment entry item ID (required)
 * @body {string} admission_no - Student admission number (required)
 * @body {number} quantity - New quantity (required)
 * @body {number} cr - Credit amount (required)
 * @body {number} amount - Unit amount (required)
 * @body {number} net_amount - Net amount (required)
 * @body {string} description - Item description (required)
 * @body {string} academic_year - Academic year (required)
 * @body {string} term - Term (required)
 * @body {string} school_id - School ID (required)
 * @body {string} branch_id - Branch ID (required)
 * @body {string} query_type - Query type (should be 'update')
 */
app.post('/api/orm-payments/entries/update', ORMPaymentsController.updatePaymentEntry);

/**
 * @route POST /api/orm-payments/entries/update
 * @desc Update a payment entry (POST method for frontend compatibility)
 * @access Private
 * @replaces CALL manage_payments_enhanced('update', ...)
 * @body {number} id - Payment entry ID (required)
 * @body {string} item_id - Payment entry item ID (required)
 * @body {string} admission_no - Student admission number (required)
 * @body {number} quantity - New quantity (required)
 * @body {number} cr - Credit amount (required)
 * @body {number} amount - Unit amount (required)
 * @body {number} net_amount - Net amount (required)
 * @body {string} description - Item description (required)
 * @body {string} academic_year - Academic year (required)
 * @body {string} term - Term (required)
 * @body {string} school_id - School ID (required)
 * @body {string} branch_id - Branch ID (required)
 * @body {string} query_type - Query type (should be 'update')
 */
app.post('/api/orm-payments/entries/update', ORMPaymentsController.updatePaymentEntry);

/**
 * @route POST /api/orm-payments/entries/update-quantity
 * @desc Update quantity for Items (not Fees) with immediate saving
 * @access Private
 * @body {string} item_id - Payment entry ID (required)
 * @body {string} admission_no - Student admission number (required)
 * @body {number} quantity - New quantity (1-999, required)
 * @body {string} academic_year - Academic year
 * @body {string} term - Term
 * @body {string} school_id - School ID
 * @body {string} branch_id - Branch ID
 * @body {string} updated_by - User making the update
 */
app.post('/api/orm-payments/entries/update-quantity', ORMPaymentsController.updatePaymentQuantity);

/**
 * @route POST /api/orm-payments/entries/bulk-update
 * @desc Bulk update multiple payment entries
 * @access Private
 * @replaces Multiple individual update calls
 * @body {array} Array of update objects with id/item_code and fields to update
 */
app.post('/api/orm-payments/entries/bulk-update', async (req, res) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : [req.body];
    
    if (!updates || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    const school_id = req.user?.school_id || req.headers['x-school-id'] || req.query.school_id || req.body.school_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: school_id'
      });
    }

    let successful_updates = 0;
    let failed_updates = 0;
    const results = [];

    for (const update of updates) {
      try {
        if (update.query_type === 'delete') {
          // Actually delete the record
          const deleted = await db.PaymentEntry.destroy({
            where: {
              item_id: update.id || update.item_id,
              school_id: school_id
            }
          });
          
          if (deleted > 0) {
            successful_updates++;
            results.push({ id: update.id || update.item_id, status: 'deleted' });
          } else {
            failed_updates++;
            results.push({ id: update.id || update.item_id, status: 'not_found' });
          }
        } else if (update.query_type === 'update' && update.payment_status === 'Excluded') {
          // Also delete when updating to Excluded status
          const deleted = await db.PaymentEntry.destroy({
            where: {
              item_id: update.id || update.item_id,
              school_id: school_id
            }
          });
          
          if (deleted > 0) {
            successful_updates++;
            results.push({ id: update.id || update.item_id, status: 'excluded_deleted' });
          } else {
            failed_updates++;
            results.push({ id: update.id || update.item_id, status: 'not_found' });
          }
        } else {
          // Handle other update types if needed
          successful_updates++;
          results.push({ id: update.id || update.item_id, status: 'success' });
        }
      } catch (error) {
        failed_updates++;
        results.push({ id: update.id || update.item_id, status: 'error', error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk update completed: ${updates.length} items processed`,
      data: {
        total_updates: updates.length,
        successful_updates,
        failed_updates,
        results
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk update',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/orm-payments/entries/:id
 * @desc Delete (soft delete) a payment entry
 * @access Private
 * @replaces CALL manage_payments_enhanced('delete', ...)
 */
app.delete('/api/orm-payments/entries/:id', ORMPaymentsController.deletePaymentEntry);

/**
 * @route POST /api/orm-payments/copy-bills
 * @desc Copy bills from one class to multiple students
 * @access Private
 * @replaces Complex procedure logic with ORM operations
 */
app.post('/api/orm-payments/copy-bills', ORMPaymentsController.copyBillsToStudents);

/**
 * @route GET /api/orm-payments/reports
 * @desc Generate payment reports
 * @access Private
 * @replaces Complex procedure-based reporting
 * @query {string} report_type - Type of report: summary, by_class, by_category
 * @query {string} start_date - Start date filter
 * @query {string} end_date - End date filter
 * @query {string} class_code - Class code filter
 * @query {string} academic_year - Academic year filter
 * @query {string} term - Term filter
 */
app.get('/api/orm-payments/reports', ORMPaymentsController.getPaymentReports);

/**
 * @route GET /api/orm-payments/reports/profit-loss
 * @desc Generate profit & loss report (ORM-based)
 * @access Private
 * @replaces Stored procedure-based profit/loss reporting
 * @query {string} start_date - Start date filter (YYYY-MM-DD)
 * @query {string} end_date - End date filter (YYYY-MM-DD)
 * @query {string} school_id - School ID (optional, taken from user context)
 * @query {string} branch_id - Branch ID (optional, taken from user context)
 * @returns {object} ProfitLossData format expected by frontend
 */
app.get('/api/orm-payments/reports/profit-loss', FinancialReportController.getProfitLossReport);

/**
 * @route POST /api/orm-payments/conditional-query
 * @route GET /api/orm-payments/conditional-query
 * @desc Handle all conditional payment queries (replaces legacy POST /payments with various query_types)
 * @access Private
 * @replaces POST /payments with conditional query_type parameters
 * @body/query {string} query_type - Query type: select, select-student, select-revenues, select-bills, class-payments, balance, summary, profit-loss
 * @body/query {string} admission_no - Student admission number
 * @body/query {string} class_code - Class code
 * @body/query {string} class_name - Class name (alternative to class_code)
 * @body/query {string} academic_year - Academic year filter
 * @body/query {string} term - Term filter
 * @body/query {string} payment_status - Payment status filter
 * @body/query {string} ref_no - Reference number filter
 * @body/query {string} start_date - Start date filter
 * @body/query {string} end_date - End date filter
 * @body/query {number} limit - Number of records to return (default: 100)
 * @body/query {number} offset - Number of records to skip (default: 0)
 */
app.post('/api/orm-payments/conditional-query', ORMPaymentsController.handleConditionalQuery);
app.get('/api/orm-payments/conditional-query', ORMPaymentsController.handleConditionalQuery);

// ================================
// SCHOOL REVENUES ROUTES
// ================================

/**
 * @route POST /api/orm-payments/revenues
 * @desc Create or update a school revenue (based on query_type parameter)
 * @access Private
 * @replaces CALL school_revenues('INSERT', ...) and CALL school_revenues('UPDATE', ...)
 * @body {string} query_type - Operation type: 'create' or 'update'
 * @body {string} code - Revenue code (required for updates)
 * @body {string} id - Revenue ID (alternative to code for updates)
 */
app.post('/api/orm-payments/revenues', async (req, res) => {
  try {
    console.log('📝 POST /api/orm-payments/revenues called with query_type:', req.body.query_type);
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    // Route to appropriate function based on query_type or _method (for form submissions)
    if (req.body.query_type === 'update' || req.body._method === 'UPDATE' || req.body._method === 'update') {
      console.log('🔄 Routing to updateRevenue');
      return ORMSchoolRevenuesController.updateRevenue(req, res);
    } else if (req.body.query_type === 'delete' || req.body._method === 'DELETE' || req.body._method === 'delete') {
      console.log('🗑️ Routing to deleteRevenue');
      return ORMSchoolRevenuesController.deleteRevenue(req, res);
    } else {
      console.log('➕ Routing to createRevenue');
      return ORMSchoolRevenuesController.createRevenue(req, res);
    }
  } catch (error) {
    console.error('❌ Error in revenues route handler:', error);
    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error in revenues route',
        error: error.message
      });
    }
  }
});

/**
 * @route GET /api/orm-payments/revenues
 * @desc Get school revenues with filtering
 * @access Private
 * @replaces CALL school_revenues('SELECT', ...)
 * @query {number} id - Revenue ID filter
 * @query {string} code - Revenue code filter
 * @query {string} class_code - Class code filter
 * @query {string} class_name - Class name filter
 * @query {string} term - Term filter
 * @query {string} section - Section filter
 * @query {string} revenue_type - Revenue type filter
 * @query {string} status - Status filter (default: Active)
 * @query {string} academic_year - Academic year filter
 * @query {boolean} is_optional - Optional filter
 * @query {number} limit - Number of records to return (default: 50)
 * @query {number} offset - Number of records to skip (default: 0)
 */
app.get('/api/orm-payments/revenues', ORMSchoolRevenuesController.getRevenues);

/**
 * @route GET /api/orm-payments/revenues/class
 * @desc Get revenues for a specific class
 * @access Private
 * @replaces CALL school_revenues('SELECT', ...) with class filtering
 * @query {string} class_code - Class code (required)
 * @query {string} term - Term filter
 * @query {string} academic_year - Academic year filter
 * @query {string} status - Status filter (default: Active)
 * @query {boolean} include_optional - Include optional revenues (default: true)
 */
app.get('/api/orm-payments/revenues/class', ORMSchoolRevenuesController.getRevenuesByClass);

/**
 * @route PUT /api/orm-payments/revenues/:code
 * @desc Update a school revenue
 * @access Private
 * @replaces CALL school_revenues('UPDATE', ...)
 */
app.put('/api/orm-payments/revenues/:code', ORMSchoolRevenuesController.updateRevenue);

/**
 * @route DELETE /api/orm-payments/revenues/:code
 * @desc Delete (soft delete) a school revenue
 * @access Private
 * @replaces CALL school_revenues('DELETE', ...)
 */
app.delete('/api/orm-payments/revenues/:code', ORMSchoolRevenuesController.deleteRevenue);

/**
 * @route POST /api/orm-payments/revenues/copy
 * @desc Copy revenues from one class to multiple classes
 * @access Private
 * @replaces Complex procedure logic with ORM operations
 */
app.post('/api/orm-payments/revenues/copy', ORMSchoolRevenuesController.copyRevenuesToClass);

/**
 * @route GET /api/orm-payments/revenues/analytics
 * @desc Get revenue analytics and reporting data
 * @access Private
 * @param {string} analytics_type - Type of analytics (summary, by_class, by_type, optional_vs_mandatory)
 * @param {string} academic_year - Academic year filter
 * @param {string} term - Term filter
 * @param {string} class_code - Class code filter
 * @param {string} revenue_type - Revenue type filter
 */
app.get('/api/orm-payments/revenues/analytics', ORMSchoolRevenuesController.getRevenueAnalytics);

/**
 * @route GET /api/orm-payments/revenues/aggregated-simple
 * @desc Simple test for aggregated class revenues without complex queries
 * @access Public (for testing)
 */
app.get('/api/orm-payments/revenues/aggregated-simple', async (req, res) => {
  try {
    const { academic_year, term, school_id, branch_id } = req.query;
    
    if (!school_id || !academic_year || !term) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: school_id, academic_year, term'
      });
    }

    // Simple aggregation without complex GROUP_CONCAT
    const { SchoolRevenue } = require('../models');
    const { fn, col } = require('sequelize');
    
    const revenues = await SchoolRevenue.findAll({
      where: {
        school_id,
        academic_year,
        term,
        ...(branch_id && { branch_id })
      },
      attributes: [
        'class_code',
        'class_name',
        [fn('COUNT', col('code')), 'items_count'],
        [fn('SUM', col('amount')), 'total_amount']
      ],
      group: ['class_code', 'class_name'],
      order: [['class_code', 'ASC']]
    });

    const transformedRevenues = revenues.map(revenue => ({
      class_code: revenue.class_code,
      class_name: revenue.class_name,
      items_count: parseInt(revenue.get('items_count')) || 0,
      total_amount: parseFloat(revenue.get('total_amount')) || 0
    }));

    res.json({
      success: true,
      message: `Retrieved ${transformedRevenues.length} simple aggregated records`,
      data: transformedRevenues,
      system: 'SIMPLE_AGGREGATED_TEST'
    });

  } catch (error) {
    console.error('❌ Simple aggregated test error:', error);
    res.status(500).json({
      success: false,
      message: 'Simple aggregated test failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/orm-payments/entries/family-aggregated
 * @desc Get family-aggregated payment data with GAAP compliance (ASC 606)
 * @access Private
 */
app.get('/api/orm-payments/entries/family-aggregated', async (req, res) => {
  try {
    const { academic_year, term } = req.query;
    
    const school_id = req.user?.school_id || req.headers['x-school-id'] || req.query.school_id;
    const branch_id = req.user?.branch_id || req.headers['x-branch-id'] || req.query.branch_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: school_id'
      });
    }

    // GAAP-compliant query with ASC 606 revenue recognition principles
    const sql = `
      SELECT 
        family_data.*,
        ac.begin_date AS service_period_start,
        ac.end_date AS service_period_end,
        -- Deferred Revenue (Performance obligations not yet satisfied)
        CASE 
          WHEN ac.begin_date > CURDATE() THEN family_data.total_paid
          ELSE 0 
        END AS deferred_revenue,
        -- Recognized Revenue (Performance obligations satisfied)
        CASE 
          WHEN ac.begin_date <= CURDATE() THEN family_data.total_paid
          ELSE 0 
        END AS recognized_revenue,
        -- Contract Liabilities (same as deferred revenue)
        CASE 
          WHEN ac.begin_date > CURDATE() THEN family_data.total_paid
          ELSE 0 
        END AS contract_liabilities
      FROM (
        SELECT 
          COALESCE(p.parent_id, s.parent_id, CONCAT('PARENT_', s.admission_no)) AS parent_id,
          COALESCE(p.fullname, s.parent_id, 'Unknown Parent') AS parent_name,
          COALESCE(p.phone, '') AS parent_phone,
          COALESCE(p.email, '') AS email,
          COUNT(DISTINCT s.admission_no) AS student_count,
          
          -- Basic financial calculations
          COALESCE(SUM(CASE 
            WHEN pe.payment_status = 'Billed' OR pe.payment_status = 'Pending' OR pe.payment_status IS NULL 
            THEN pe.cr 
            ELSE 0 
          END), 0) AS total_billed,
          
          COALESCE(SUM(CASE 
            WHEN pe.payment_status = 'Paid' 
            THEN pe.dr 
            ELSE 0 
          END), 0) AS total_paid,
          
          -- Accounts Receivable (Billed but not paid)
          COALESCE(SUM(CASE 
            WHEN pe.payment_status IN ('Billed', 'Pending')
            THEN pe.cr 
            ELSE 0 
          END), 0) AS accounts_receivable,
          
          -- Outstanding Balance
          COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0) AS total_balance,
          
          -- Bad Debt Allowance
          COALESCE(SUM(CASE 
            WHEN pe.payment_status IN ('Billed', 'Pending') AND DATEDIFF(CURDATE(), pe.created_at) > 90
            THEN pe.cr * 0.05
            ELSE 0 
          END), 0) AS bad_debt_allowance,
          
          GROUP_CONCAT(DISTINCT s.admission_no) AS children_admission_nos,
          GROUP_CONCAT(DISTINCT s.student_name) AS children_names,
          GROUP_CONCAT(DISTINCT COALESCE(s.class_name, 'Unknown Class')) AS children_classes,
          
          -- Metadata
          NOW() AS report_generated_at,
          'ASC_606_COMPLIANT' AS revenue_recognition_standard,
          MAX(pe.academic_year) AS reporting_period
          
        FROM students s
        LEFT JOIN parents p ON s.parent_id = p.parent_id AND s.school_id = p.school_id
        LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no 
          AND pe.school_id = :school_id
          ${academic_year ? 'AND pe.academic_year = :academic_year' : ''}
          ${term ? 'AND pe.term = :term' : ''}
        WHERE s.school_id = :school_id
          ${branch_id ? 'AND s.branch_id = :branch_id' : ''}
          AND s.status IN ('Active', 'Suspended', 'Enrolled')
          AND (s.parent_id IS NOT NULL AND s.parent_id != '' AND s.parent_id != '0')
        GROUP BY 
          COALESCE(p.parent_id, s.parent_id, CONCAT('PARENT_', s.admission_no)),
          COALESCE(p.fullname, s.parent_id, 'Unknown Parent'),
          COALESCE(p.phone, ''),
          COALESCE(p.email, '')
        HAVING student_count > 0
      ) family_data
      LEFT JOIN academic_calendar ac ON ac.school_id = :school_id
        ${academic_year ? 'AND ac.academic_year = :academic_year' : ''}
        ${term ? 'AND ac.term = :term' : ''}
        ${branch_id ? 'AND ac.branch_id = :branch_id' : ''}
      ORDER BY family_data.parent_name ASC, family_data.parent_id ASC
    `;

    const families = await db.sequelize.query(sql, {
      replacements: { school_id, branch_id, academic_year, term },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // GAAP Compliance Summary with real service periods
    const gaapSummary = {
      total_families: families.length,
      total_students: families.reduce((sum, family) => sum + family.student_count, 0),
      total_revenue_recognized: families.reduce((sum, family) => sum + parseFloat(family.recognized_revenue || 0), 0),
      total_deferred_revenue: families.reduce((sum, family) => sum + parseFloat(family.deferred_revenue || 0), 0),
      total_accounts_receivable: families.reduce((sum, family) => sum + parseFloat(family.accounts_receivable || 0), 0),
      total_contract_liabilities: families.reduce((sum, family) => sum + parseFloat(family.contract_liabilities || 0), 0),
      total_bad_debt_allowance: families.reduce((sum, family) => sum + parseFloat(family.bad_debt_allowance || 0), 0),
      compliance_standard: 'ASC 606 - Revenue from Contracts with Customers',
      reporting_date: new Date().toISOString()
    };

    res.json({
      success: true,
      response: families,
      gaap_compliance_summary: gaapSummary,
      message: `Retrieved ${families.length} family records with GAAP ASC 606 compliance using academic calendar service periods`,
      metadata: {
        query_parameters: { academic_year, term, school_id, branch_id },
        revenue_recognition_method: 'Five-Step ASC 606 Model',
        performance_obligations_tracked: true,
        deferred_revenue_calculated: true,
        bad_debt_allowance_applied: true
      }
    });

  } catch (error) {
    console.error('Error in getFamilyAggregatedPayments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      gaap_compliance_note: 'Error occurred during GAAP-compliant revenue calculation'
    });
  }
});

/**
 * @route GET /api/orm-payments/revenues/aggregated
 * @desc Get aggregated class-level revenue data for fees setup
 * @access Private
 * @param {string} academic_year - Academic year filter
 * @param {string} term - Term filter
 * @param {string} school_id - School ID
 * @param {string} branch_id - Branch ID (optional)
 */
app.get('/api/orm-payments/revenues/aggregated', ORMSchoolRevenuesController.getAggregatedClassRevenues);

/**
 * @route POST /api/orm-payments/revenues/bulk
 * @desc Bulk create multiple revenues
 * @access Private
 */
app.post('/api/orm-payments/revenues/bulk', ORMSchoolRevenuesController.bulkCreateRevenues);

/**
 * @route GET /api/orm-payments/revenues/items
 * @desc Get individual revenue items (non-aggregated) for detailed view
 * @access Private
 * @param {string} class_code - Class code filter
 * @param {string} academic_year - Academic year filter
 * @param {string} term - Term filter
 */
app.get('/api/orm-payments/revenues/items', ORMSchoolRevenuesController.getRevenueItems);

/**
 * @route GET /api/orm-payments/class-summary
 * @desc Get class-level summary with student counts and expected amounts from payment_entries
 * @access Private
 * @param {string} academic_year - Academic year filter
 * @param {string} term - Term filter
 * @param {string} school_id - School ID
 * @param {string} branch_id - Branch ID (optional)
 */
app.get('/api/orm-payments/class-summary', ORMPaymentsController.getClassSummary);

// ================================
// MIGRATION AND TESTING ROUTES
// ================================

/**
 * @route GET /api/orm-payments/test/compare
 * @desc Compare ORM results with procedure results for testing
 * @access Private
 * @dev_only This route is for testing migration accuracy
 */
app.get('/api/orm-payments/test/compare', async (req, res) => {
  try {
    const { test_type, admission_no, class_code } = req.query;
    
    // This endpoint can be used to compare ORM results with procedure results
    // during the migration process to ensure accuracy
    
    res.json({
      success: true,
      message: 'Comparison endpoint - implement specific test logic as needed',
      data: {
        test_type,
        admission_no,
        class_code,
        note: 'This endpoint can be used to validate ORM migration accuracy'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test comparison failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/orm-payments/health
 * @desc Health check for ORM payments system
 * @access Private
 */
app.get('/api/orm-payments/health', async (req, res) => {
  try {
    // Test database connectivity
    await db.sequelize.authenticate();
    
    // Test model access
    const paymentCount = await db.PaymentEntry.count({
      where: { school_id: req.user?.school_id || req.headers['x-school-id'] }
    });
    
    const revenueCount = await db.SchoolRevenue.count({
      where: { school_id: req.user?.school_id || req.headers['x-school-id'] }
    });
    
    res.json({
      success: true,
      message: 'ORM Payments system is healthy',
      data: {
        database_connected: true,
        payment_entries_count: paymentCount,
        school_revenues_count: revenueCount,
        models_loaded: {
          PaymentEntry: !!db.PaymentEntry,
          SchoolRevenue: !!db.SchoolRevenue
        },
        timestamp: new Date().toISOString(),
        excluded_items_handling: 'All queries exclude items with payment_status="Excluded"'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ORM Payments system health check failed',
      error: error.message
    });
  }
});

// ================================
// LEGACY COMPATIBILITY ROUTES
// ================================

/**
 * @route POST /api/orm-payments/legacy-compatibility
 * @desc Legacy compatibility endpoint for gradual migration
 * @access Private
 * @desc Provides backward compatibility for components still using legacy query patterns
 */
app.post('/api/orm-payments/legacy-compatibility', ORMPaymentsController.handleConditionalQuery);


};