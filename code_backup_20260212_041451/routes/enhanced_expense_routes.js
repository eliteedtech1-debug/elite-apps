/**
 * Enhanced Expense Routes
 * 
 * Provides expense data endpoints that return individual expense records
 * in the format expected by the GroupedExpenseReport component.
 */

const { authenticateToken } = require('../middleware/auth');
const db = require('../models');

module.exports = (app) => {
  /**
   * Get individual expense records for GroupedExpenseReport component
   * GET /reports/expenses
   * 
   * Query Parameters:
   * - school_id: Filter by school (from auth context)
   * - branch_id: Filter by branch (from auth context)
   * - start_date: Start date (YYYY-MM-DD)
   * - end_date: End date (YYYY-MM-DD)
   * - academic_year: Filter by academic year
   * - term: Filter by term
   */
  app.get('/reports/expenses', authenticateToken, async (req, res) => {
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

      // Only get expense records (dr > 0)
      whereConditions.push('dr > 0');
      whereConditions.push("payment_status != 'Excluded'");

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Query to get individual expense records
      const expenseQuery = `
        SELECT 
          item_id as id,
          DATE(created_at) as date,
          description,
          COALESCE(item_category, 'General Expense') as category,
          dr as amount,
          COALESCE(payment_mode, 'Cash') as payment_method,
          'Various' as vendor,
          ref_no as reference_id,
          'Operating' as expense_type,
          'Expense' as transaction_type,
          branch_id,
          payment_status,
          created_by,
          academic_year,
          term,
          class_code as department,
          admission_no,
          quantity,
          'Payment Entry' as source
        FROM payment_entries 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 1000
      `;

      const expenseData = await db.sequelize.query(expenseQuery, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Transform data to match ExpenseRecord interface
      const transformedData = expenseData.map(item => ({
        id: item.id || `exp_${Date.now()}_${Math.random()}`,
        date: item.date || new Date().toISOString().split('T')[0],
        description: item.description || 'Expense Transaction',
        category: item.category || 'General Expense',
        amount: parseFloat(item.amount) || 0,
        vendor: item.vendor || 'Various',
        payment_method: item.payment_method || 'Cash',
        reference_id: item.reference_id,
        department: item.department || 'General',
        approved_by: item.created_by || 'System',
        created_by: item.created_by || 'System',
        expense_type: item.expense_type || 'Operating',
        source: item.source || 'Payment Entry',
        transaction_type: 'Expense',
        branch_id: item.branch_id,
        payment_status: item.payment_status || 'Completed',
        invoice_number: item.reference_id,
        tax_amount: 0
      }));

      return res.status(200).json({
        success: true,
        data: transformedData,
        count: transformedData.length,
        filters: {
          school_id: effectiveSchoolId,
          branch_id: effectiveBranchId,
          start_date,
          end_date,
          academic_year,
          term
        },
        report_type: 'individual_expenses',
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching expense data:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        report_type: 'individual_expenses'
      });
    }
  });

  /**
   * Get expense entries for payments API compatibility
   * This handles the fetchExpenseEntries call from GroupedExpenseReport
   */
  app.post('/payments', authenticateToken, async (req, res) => {
    try {
      const { query_type } = req.body;

      // Handle expense-report query type
      if (query_type === 'expense-report') {
        const {
          start_date,
          end_date,
          school_id,
          branch_id
        } = req.body;

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

        // Only get expense records (dr > 0)
        whereConditions.push('dr > 0');
        whereConditions.push("payment_status != 'Excluded'");

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Query to get expense entries
        const expenseQuery = `
          SELECT 
            item_id,
            ref_no,
            DATE(created_at) as date,
            description,
            dr,
            item_category,
            payment_mode,
            branch_id,
            created_by,
            payment_status,
            academic_year,
            term,
            class_code as department,
            'Various' as vendor,
            'Various' as supplier,
            0 as tax_amount,
            '' as invoice_number,
            'Operating' as expense_type
          FROM payment_entries 
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT 1000
        `;

        const expenseData = await db.sequelize.query(expenseQuery, {
          replacements,
          type: db.Sequelize.QueryTypes.SELECT
        });

        return res.status(200).json({
          success: true,
          data: expenseData,
          count: expenseData.length,
          query_type: 'expense-report'
        });
      }

      // For other query types, return empty response or handle as needed
      return res.status(400).json({
        success: false,
        message: 'Unsupported query_type for this endpoint',
        supported_types: ['expense-report']
      });

    } catch (error) {
      console.error('Error handling payments request:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * TEMPORARY: Profit & Loss Routes (added here because profit_loss_routes.js not loading)
   * GET /api/v2/reports/profit-loss-detailed
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

      console.log('📊 Profit/Loss API called with:', {
        query_params: req.query,
        effective_school_id: effectiveSchoolId,
        effective_branch_id: effectiveBranchId
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

      // Transform income data
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

      // Transform expense data
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
   * Test endpoint for profit loss
   */
  app.get('/api/v2/reports/profit-loss-test', (req, res) => {
    res.json({
      success: true,
      message: 'Profit/Loss API is working (temporary location)',
      timestamp: new Date().toISOString(),
      note: 'This route is temporarily in enhanced_expense_routes.js'
    });
  });

  /**
   * API Documentation
   */
  app.get('/api/expense-docs', (req, res) => {
    res.json({
      message: "Enhanced Expense API Documentation",
      version: "1.0.0",
      description: "Provides individual expense records for GroupedExpenseReport component",
      endpoints: {
        "/reports/expenses": {
          method: "GET",
          description: "Get individual expense records",
          query_params: {
            start_date: "Start date (YYYY-MM-DD)",
            end_date: "End date (YYYY-MM-DD)",
            academic_year: "Academic year filter",
            term: "Term filter",
            branch_id: "Branch ID (optional, uses auth context)",
            school_id: "School ID (optional, uses auth context)"
          },
          returns: "Array of ExpenseRecord objects"
        },
        "/payments (POST with query_type: 'expense-report')": {
          method: "POST",
          description: "Get expense entries for payments API compatibility",
          body_params: {
            query_type: "Must be 'expense-report'",
            start_date: "Start date (YYYY-MM-DD)",
            end_date: "End date (YYYY-MM-DD)",
            school_id: "School ID (optional, uses auth context)",
            branch_id: "Branch ID (optional, uses auth context)"
          },
          returns: "Array of expense entries from payment_entries table"
        }
      },
      data_format: {
        ExpenseRecord: {
          id: "string",
          date: "string (YYYY-MM-DD)",
          description: "string",
          category: "string",
          amount: "number",
          vendor: "string",
          payment_method: "string",
          reference_id: "string (optional)",
          department: "string (optional)",
          approved_by: "string (optional)",
          created_by: "string (optional)",
          expense_type: "string (optional)",
          source: "string (optional)",
          transaction_type: "string",
          branch_id: "string (optional)",
          payment_status: "string (optional)",
          invoice_number: "string (optional)",
          tax_amount: "number (optional)"
        }
      }
    });
  });
};