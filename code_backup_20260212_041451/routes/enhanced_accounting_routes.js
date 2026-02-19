/**
 * Enhanced Accounting Routes
 * 
 * Provides comprehensive financial reporting routes using proper accounting principles.
 * Integrates with Chart of Accounts and Journal Entries for clean accounting reports.
 */

const EnhancedAccountingController = require('../controllers/enhanced_accounting_controller');
const { authenticateToken } = require('../middleware/auth');

module.exports = (app) => {
  // ========================================
  // ENHANCED FINANCIAL REPORTS ROUTES
  // ========================================
  
  /**
   * Income & Expenses Report
   * GET /api/v2/accounting/income-expenses
   * 
   * Query Parameters:
   * - school_id: Filter by school
   * - branch_id: Filter by branch
   * - start_date: Start date (YYYY-MM-DD)
   * - end_date: End date (YYYY-MM-DD)
   * - academic_year: Filter by academic year
   * - term: Filter by term
   */
  app.get('/api/v2/accounting/income-expenses', 
    authenticateToken, 
    EnhancedAccountingController.getIncomeExpensesReport
  );

  /**
   * Income Reports
   * GET /api/v2/accounting/income-reports
   * 
   * Query Parameters:
   * - school_id: Filter by school
   * - branch_id: Filter by branch
   * - start_date: Start date (YYYY-MM-DD)
   * - end_date: End date (YYYY-MM-DD)
   * - academic_year: Filter by academic year
   * - term: Filter by term
   * - group_by: Grouping option (description, academic_year, term, payment_mode, monthly)
   */
  app.get('/api/v2/accounting/income-reports', 
    authenticateToken, 
    EnhancedAccountingController.getIncomeReports
  );

  /**
   * Expenses Reports
   * GET /api/v2/accounting/expenses-reports
   * 
   * Query Parameters:
   * - school_id: Filter by school
   * - branch_id: Filter by branch
   * - start_date: Start date (YYYY-MM-DD)
   * - end_date: End date (YYYY-MM-DD)
   * - academic_year: Filter by academic year
   * - term: Filter by term
   * - group_by: Grouping option (description, academic_year, term, payment_mode, monthly)
   */
  app.get('/api/v2/accounting/expenses-reports', 
    authenticateToken, 
    EnhancedAccountingController.getExpensesReports
  );

  /**
   * Profit and Loss Statement
   * GET /api/v2/accounting/profit-loss
   * 
   * Query Parameters:
   * - school_id: Filter by school
   * - branch_id: Filter by branch
   * - start_date: Start date (YYYY-MM-DD)
   * - end_date: End date (YYYY-MM-DD)
   * - academic_year: Filter by academic year
   * - term: Filter by term
   */
  app.get('/api/v2/accounting/profit-loss', 
    authenticateToken, 
    EnhancedAccountingController.getProfitAndLoss
  );

  /**
   * Trial Balance
   * GET /api/v2/accounting/trial-balance
   * 
   * Query Parameters:
   * - school_id: Filter by school
   * - branch_id: Filter by branch
   * - as_of_date: As of date (YYYY-MM-DD)
   */
  app.get('/api/v2/accounting/trial-balance', 
    authenticateToken, 
    EnhancedAccountingController.getTrialBalance
  );

  // ========================================
  // LEGACY ROUTE REDIRECTS
  // ========================================
  
  // Redirect old income & expenses routes to new enhanced versions
  app.get('/income-expenses', (req, res) => {
    res.redirect(`/api/v2/accounting/income-expenses?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/income-expenses', (req, res) => {
    res.redirect(`/api/v2/accounting/income-expenses?${new URLSearchParams(req.query)}`);
  });

  // Redirect old income reports routes
  app.get('/income-reports', (req, res) => {
    res.redirect(`/api/v2/accounting/income-reports?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/income-reports', (req, res) => {
    res.redirect(`/api/v2/accounting/income-reports?${new URLSearchParams(req.query)}`);
  });

  // Redirect old expenses reports routes
  app.get('/expenses-reports', (req, res) => {
    res.redirect(`/api/v2/accounting/expenses-reports?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/expenses-reports', (req, res) => {
    res.redirect(`/api/v2/accounting/expenses-reports?${new URLSearchParams(req.query)}`);
  });

  // Redirect old profit & loss routes
  app.get('/profit-loss', (req, res) => {
    res.redirect(`/api/v2/accounting/profit-loss?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/profit-loss', (req, res) => {
    res.redirect(`/api/v2/accounting/profit-loss?${new URLSearchParams(req.query)}`);
  });

  app.get('/profit-loss-report', (req, res) => {
    res.redirect(`/api/v2/accounting/profit-loss?${new URLSearchParams(req.query)}`);
  });

  // ========================================
  // API DOCUMENTATION ROUTE
  // ========================================
  app.get('/api/v2/accounting/docs', (req, res) => {
    res.json({
      message: "Enhanced Accounting API Documentation",
      version: "2.0.0",
      description: "Comprehensive financial reporting using proper accounting principles",
      features: [
        "Income & Expenses Reports with source tracking",
        "Detailed Income Reports with multiple grouping options",
        "Comprehensive Expenses Reports with categorization",
        "Profit & Loss Statement with performance metrics",
        "Trial Balance for account verification",
        "Integration with Chart of Accounts",
        "Journal Entry support for double-entry bookkeeping",
        "Revenue source tracking from bills",
        "Clean accounting reports with proper formatting"
      ],
      endpoints: {
        income_expenses: {
          url: "/api/v2/accounting/income-expenses",
          method: "GET",
          description: "Combined Income & Expenses report with summary metrics"
        },
        income_reports: {
          url: "/api/v2/accounting/income-reports",
          method: "GET",
          description: "Detailed income analysis with source tracking"
        },
        expenses_reports: {
          url: "/api/v2/accounting/expenses-reports",
          method: "GET",
          description: "Detailed expense analysis with categorization"
        },
        profit_loss: {
          url: "/api/v2/accounting/profit-loss",
          method: "GET",
          description: "Comprehensive Profit & Loss statement with performance metrics"
        },
        trial_balance: {
          url: "/api/v2/accounting/trial-balance",
          method: "GET",
          description: "Trial balance showing all account balances for verification"
        }
      }
    });
  });
};