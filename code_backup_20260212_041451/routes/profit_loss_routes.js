/**
 * Comprehensive Profit & Loss Routes
 * 
 * Provides detailed profit and loss data for the ProfitLoss component
 * Returns individual transactions and summary data in a single API call.
 */

const { authenticateToken } = require('../middleware/auth');
const db = require('../models');

module.exports = (app) => {
  // Simple test route to verify the module is loading
  app.get('/api/v2/reports/test-route', (req, res) => {
    res.json({
      success: true,
      message: 'Profit loss routes module is loaded successfully',
      timestamp: new Date().toISOString()
    });
  });
  /**
   * Get comprehensive profit & loss data
   * GET /api/v2/reports/profit-loss-detailed
   * 
   * Query Parameters:
   * - start_date: Start date (YYYY-MM-DD)
   * - end_date: End date (YYYY-MM-DD)
   * - school_id: Filter by school (from auth context)
   * - branch_id: Filter by branch (from auth context)
   * - academic_year: Filter by academic year
   * - term: Filter by term
   */
  app.get('/api/v2/reports/profit-loss-detailed', authenticateToken, async (req, res) => {
    try {
      const {
        start_date,
        end_date,
        academic_year,
        term,
        branch_id,
        school_id
      } = req.query;

      // Use authenticated user's school_id and branch_id if not provided
      const effectiveSchoolId = school_id || req.user?.school_id;
      const effectiveBranchId = branch_id || req.user?.branch_id;

      // Debug logging
      console.log('📊 Profit/Loss API called with:', {
        query_params: req.query,
        effective_school_id: effectiveSchoolId,
        effective_branch_id: effectiveBranchId,
        user_context: req.user
      });

      // Build where conditions
      const whereConditions = [];
      const replacements = {};

      // Always filter by school
      if (effectiveSchoolId) {
        whereConditions.push('school_id = :school_id');
        replacements.school_id = effectiveSchoolId;
      }

      // Filter by branch if provided
      if (effectiveBranchId) {
        whereConditions.push('branch_id = :branch_id');
        replacements.branch_id = effectiveBranchId;
      }

      // Date range filter
      if (start_date && end_date) {
        whereConditions.push('DATE(created_at) BETWEEN :start_date AND :end_date');
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      }

      // Academic year filter
      if (academic_year) {
        whereConditions.push('academic_year = :academic_year');
        replacements.academic_year = academic_year;
      }

      // Term filter
      if (term) {
        whereConditions.push('term = :term');
        replacements.term = term;
      }

      // Exclude excluded entries
      whereConditions.push("payment_status != 'Excluded'");

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Query for income transactions (cr > 0)
      const incomeQuery = `
        SELECT 
          item_id as id,
          DATE(created_at) as date,
          'Income' as category,
          description,
          cr as amount,
          COALESCE(payment_mode, 'Cash') as payment_method,
          ref_no,
          academic_year,
          term,
          branch_id,
          admission_no,
          class_code,
          item_category,
          payment_status,
          created_by
        FROM payment_entries 
        ${whereClause} AND cr > 0
        ORDER BY created_at DESC
      `;

      // Query for expense transactions (dr > 0)
      const expenseQuery = `
        SELECT 
          item_id as id,
          DATE(created_at) as date,
          'Expense' as category,
          description,
          dr as amount,
          COALESCE(payment_mode, 'Cash') as payment_method,
          ref_no,
          academic_year,
          term,
          branch_id,
          admission_no,
          class_code,
          item_category,
          payment_status,
          created_by
        FROM payment_entries 
        ${whereClause} AND dr > 0
        ORDER BY created_at DESC
      `;

      // Query for summary totals
      const summaryQuery = `
        SELECT 
          SUM(cr) as total_income,
          SUM(dr) as total_expenses,
          (SUM(cr) - SUM(dr)) as balance,
          COUNT(CASE WHEN cr > 0 THEN 1 END) as income_count,
          COUNT(CASE WHEN dr > 0 THEN 1 END) as expense_count
        FROM payment_entries 
        ${whereClause}
      `;

      // Execute all queries in parallel
      const [incomeData, expenseData, summaryData] = await Promise.all([
        db.sequelize.query(incomeQuery, {
          replacements,
          type: db.Sequelize.QueryTypes.SELECT
        }),
        db.sequelize.query(expenseQuery, {
          replacements,
          type: db.Sequelize.QueryTypes.SELECT
        }),
        db.sequelize.query(summaryQuery, {
          replacements,
          type: db.Sequelize.QueryTypes.SELECT
        })
      ]);

      // Transform income data to match component expectations
      const incomeTransactions = incomeData.map(item => ({
        id: `income-${item.id}`,
        date: item.date || new Date().toISOString().split('T')[0],
        category: 'Income',
        description: item.description || 'Income Transaction',
        amount: parseFloat(item.amount) || 0,
        payment_method: item.payment_method || 'Cash',
        ref_no: item.ref_no,
        academic_year: item.academic_year,
        term: item.term,
        branch_id: item.branch_id,
        admission_no: item.admission_no,
        class_code: item.class_code,
        item_category: item.item_category,
        payment_status: item.payment_status,
        created_by: item.created_by
      }));

      // Transform expense data to match component expectations
      const expenseTransactions = expenseData.map(item => ({
        id: `expense-${item.id}`,
        date: item.date || new Date().toISOString().split('T')[0],
        category: 'Expense',
        description: item.description || 'Expense Transaction',
        amount: parseFloat(item.amount) || 0,
        payment_method: item.payment_method || 'Cash',
        ref_no: item.ref_no,
        academic_year: item.academic_year,
        term: item.term,
        branch_id: item.branch_id,
        admission_no: item.admission_no,
        class_code: item.class_code,
        item_category: item.item_category,
        payment_status: item.payment_status,
        created_by: item.created_by
      }));

      // Extract summary data
      const summary = summaryData[0] || {
        total_income: 0,
        total_expenses: 0,
        balance: 0,
        income_count: 0,
        expense_count: 0
      };

      // Calculate additional metrics
      const totalIncome = parseFloat(summary.total_income) || 0;
      const totalExpenses = parseFloat(summary.total_expenses) || 0;
      const balance = parseFloat(summary.balance) || 0;
      const profitMargin = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;
      const performanceStatus = balance >= 0 ? 'Profitable' : 'Loss';

      const response = {
        success: true,
        data: {
          income_transactions: incomeTransactions,
          expense_transactions: expenseTransactions,
          all_transactions: [...incomeTransactions, ...expenseTransactions].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
          summary: {
            total_income: totalIncome,
            total_expenses: totalExpenses,
            balance: balance,
            profit_margin: parseFloat(profitMargin.toFixed(2)),
            income_count: parseInt(summary.income_count) || 0,
            expense_count: parseInt(summary.expense_count) || 0,
            total_transactions: incomeTransactions.length + expenseTransactions.length,
            performance_status: performanceStatus
          }
        },
        filters: {
          school_id: effectiveSchoolId,
          branch_id: effectiveBranchId,
          start_date,
          end_date,
          academic_year,
          term
        },
        report_type: 'profit_loss_detailed',
        generated_at: new Date().toISOString()
      };

      // Debug logging
      console.log('✅ Profit/Loss API response summary:', {
        income_count: incomeTransactions.length,
        expense_count: expenseTransactions.length,
        total_transactions: incomeTransactions.length + expenseTransactions.length,
        summary: response.data.summary
      });

      return res.status(200).json(response);

    } catch (error) {
      console.error('Error fetching profit & loss data:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        report_type: 'profit_loss_detailed'
      });
    }
  });

  /**
   * Get profit & loss summary only (lightweight version)
   * GET /api/v2/reports/profit-loss-summary
   */
  app.get('/api/v2/reports/profit-loss-summary', authenticateToken, async (req, res) => {
    try {
      const {
        start_date,
        end_date,
        academic_year,
        term,
        branch_id,
        school_id
      } = req.query;

      // Use authenticated user's school_id and branch_id if not provided
      const effectiveSchoolId = school_id || req.user?.school_id;
      const effectiveBranchId = branch_id || req.user?.branch_id;

      // Build where conditions
      const whereConditions = [];
      const replacements = {};

      // Always filter by school
      if (effectiveSchoolId) {
        whereConditions.push('school_id = :school_id');
        replacements.school_id = effectiveSchoolId;
      }

      // Filter by branch if provided
      if (effectiveBranchId) {
        whereConditions.push('branch_id = :branch_id');
        replacements.branch_id = effectiveBranchId;
      }

      // Date range filter
      if (start_date && end_date) {
        whereConditions.push('DATE(created_at) BETWEEN :start_date AND :end_date');
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      }

      // Academic year filter
      if (academic_year) {
        whereConditions.push('academic_year = :academic_year');
        replacements.academic_year = academic_year;
      }

      // Term filter
      if (term) {
        whereConditions.push('term = :term');
        replacements.term = term;
      }

      // Exclude excluded entries
      whereConditions.push("payment_status != 'Excluded'");

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Query for summary totals only
      const summaryQuery = `
        SELECT 
          SUM(cr) as total_income,
          SUM(dr) as total_expenses,
          (SUM(cr) - SUM(dr)) as balance,
          COUNT(CASE WHEN cr > 0 THEN 1 END) as income_count,
          COUNT(CASE WHEN dr > 0 THEN 1 END) as expense_count,
          COUNT(*) as total_transactions,
          MIN(created_at) as earliest_transaction,
          MAX(created_at) as latest_transaction
        FROM payment_entries 
        ${whereClause}
      `;

      const summaryData = await db.sequelize.query(summaryQuery, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      const summary = summaryData[0] || {
        total_income: 0,
        total_expenses: 0,
        balance: 0,
        income_count: 0,
        expense_count: 0,
        total_transactions: 0,
        earliest_transaction: null,
        latest_transaction: null
      };

      // Calculate additional metrics for consistency
      const totalIncome = parseFloat(summary.total_income) || 0;
      const totalExpenses = parseFloat(summary.total_expenses) || 0;
      const balance = parseFloat(summary.balance) || 0;
      const profitMargin = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;
      const performanceStatus = balance >= 0 ? 'Profitable' : 'Loss';

      const response = {
        success: true,
        data: {
          total_income: totalIncome,
          total_expenses: totalExpenses,
          balance: balance,
          profit_margin: parseFloat(profitMargin.toFixed(2)),
          income_count: parseInt(summary.income_count) || 0,
          expense_count: parseInt(summary.expense_count) || 0,
          total_transactions: parseInt(summary.total_transactions) || 0,
          earliest_transaction: summary.earliest_transaction,
          latest_transaction: summary.latest_transaction,
          performance_status: performanceStatus,
          formatted: {
            total_income: `₦${totalIncome.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
            total_expenses: `₦${totalExpenses.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
            balance: `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
          }
        },
        filters: {
          school_id: effectiveSchoolId,
          branch_id: effectiveBranchId,
          start_date,
          end_date,
          academic_year,
          term
        },
        report_type: 'profit_loss_summary',
        generated_at: new Date().toISOString()
      };

      return res.status(200).json(response);

    } catch (error) {
      console.error('Error fetching profit & loss summary:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        report_type: 'profit_loss_summary'
      });
    }
  });

  /**
   * Test endpoint to verify data availability
   * GET /api/v2/reports/profit-loss-test
   */
  app.get('/api/v2/reports/profit-loss-test', authenticateToken, async (req, res) => {
    try {
      const { school_id, branch_id } = req.query;
      const effectiveSchoolId = school_id || req.user?.school_id;
      const effectiveBranchId = branch_id || req.user?.branch_id;

      // Quick test query to check data availability
      const testQuery = `
        SELECT 
          COUNT(*) as total_records,
          SUM(CASE WHEN cr > 0 THEN 1 ELSE 0 END) as income_records,
          SUM(CASE WHEN dr > 0 THEN 1 ELSE 0 END) as expense_records,
          SUM(cr) as total_income,
          SUM(dr) as total_expenses,
          MIN(created_at) as earliest_date,
          MAX(created_at) as latest_date
        FROM payment_entries 
        WHERE school_id = :school_id
          AND payment_status != 'Excluded'
      `;

      const testData = await db.sequelize.query(testQuery, {
        replacements: { school_id: effectiveSchoolId },
        type: db.Sequelize.QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        message: 'Profit/Loss test data retrieved successfully',
        data: {
          test_results: testData[0],
          context: {
            school_id: effectiveSchoolId,
            branch_id: effectiveBranchId,
            user: req.user
          },
          api_status: 'operational'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in profit/loss test:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        message: 'Profit/Loss test failed'
      });
    }
  });

  /**
   * API Documentation
   */
  app.get('/api/v2/reports/profit-loss-docs', (req, res) => {
    res.json({
      message: "Profit & Loss API Documentation",
      version: "2.0.0",
      description: "Comprehensive profit and loss reporting with ORM-based data access",
      endpoints: {
        "/api/v2/reports/profit-loss-detailed": {
          method: "GET",
          description: "Get detailed profit & loss data with individual transactions",
          query_params: {
            start_date: "Start date (YYYY-MM-DD)",
            end_date: "End date (YYYY-MM-DD)",
            academic_year: "Academic year filter",
            term: "Term filter",
            branch_id: "Branch ID (optional, uses auth context)",
            school_id: "School ID (optional, uses auth context)"
          },
          returns: {
            income_transactions: "Array of income transaction objects",
            expense_transactions: "Array of expense transaction objects", 
            all_transactions: "Combined and sorted array of all transactions",
            summary: "Summary totals and counts"
          }
        },
        "/api/v2/reports/profit-loss-summary": {
          method: "GET",
          description: "Get profit & loss summary data only (lightweight)",
          query_params: {
            start_date: "Start date (YYYY-MM-DD)",
            end_date: "End date (YYYY-MM-DD)",
            academic_year: "Academic year filter",
            term: "Term filter",
            branch_id: "Branch ID (optional, uses auth context)",
            school_id: "School ID (optional, uses auth context)"
          },
          returns: "Summary data with totals, counts, and performance metrics"
        }
      },
      data_format: {
        Transaction: {
          id: "string (prefixed with 'income-' or 'expense-')",
          date: "string (YYYY-MM-DD)",
          category: "string ('Income' or 'Expense')",
          description: "string",
          amount: "number",
          payment_method: "string",
          ref_no: "string",
          academic_year: "string",
          term: "string",
          branch_id: "string",
          admission_no: "string (optional)",
          class_code: "string (optional)",
          item_category: "string",
          payment_status: "string",
          created_by: "string"
        },
        Summary: {
          total_income: "number",
          total_expenses: "number",
          balance: "number",
          profit_margin: "number (percentage)",
          income_count: "number",
          expense_count: "number",
          total_transactions: "number",
          performance_status: "string ('Profitable' or 'Loss')"
        }
      }
    });
  });
};