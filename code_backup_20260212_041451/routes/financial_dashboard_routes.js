const FinancialDashboardController = require('../controllers/financial_dashboard_controller');
const { authenticate } = require('../middleware/auth');
const { dashboardCache } = require('../middleware/cacheMiddleware');

module.exports = (app) => {
  // Apply authentication middleware to all routes
  // Note: If authentication is not required, remove the authenticate middleware

  // ========================================
  // FINANCIAL DASHBOARD APIS
  // ========================================

  /**
   * Financial Dashboard
   * GET /dashboard?branch_id=...&start_date=...&end_date=...
   */
  app.get('/dashboard', authenticate, dashboardCache, FinancialDashboardController.getDashboard);

  /**
   * Trial Balance Report
   * GET /trial-balance?branch_id=...&as_of_date=...
   */
  app.get('/trial-balance', authenticate, FinancialDashboardController.getTrialBalance);

  /**
   * Balance Sheet Report
   * GET /balance-sheet?branch_id=...&as_of_date=...
   */
  app.get('/balance-sheet', authenticate, FinancialDashboardController.getBalanceSheet);

  /**
   * Income Statement Report
   * GET /income-statement?branch_id=...&start_date=...&end_date=...
   * Note: Also supports comma-separated dates in start_date parameter
   */
  app.get('/income-statement', authenticate, FinancialDashboardController.getIncomeStatement);

  /**
   * Financial Metrics
   * GET /metrics?start_date=...&end_date=...&branch_id=...
   */
  app.get('/metrics', authenticate, FinancialDashboardController.getMetrics);

  /**
   * Payment Trends
   * GET /payment-trends?start_date=...&end_date=...&branch_id=...
   */
  app.get('/payment-trends', authenticate, FinancialDashboardController.getPaymentTrends);

  /**
   * Classwise Collection Report
   * GET /classwise-collection?start_date=...&end_date=...&branch_id=...
   */
  app.get('/classwise-collection', authenticate, FinancialDashboardController.getClasswiseCollection);

  /**
   * Payment Methods Analysis
   * GET /payment-methods?start_date=...&end_date=...&branch_id=...
   */
  app.get('/payment-methods', authenticate, FinancialDashboardController.getPaymentMethods);

  // ========================================
  // API DOCUMENTATION ROUTE
  // ========================================
  app.get('/financial-dashboard-docs', (req, res) => {
    res.json({
      message: "Financial Dashboard API Documentation",
      version: "1.0.0",
      description: "Financial APIs with query parameter support for ElScholar system",
      base_url: req.protocol + '://' + req.get('host'),
      authentication: "Required - Bearer token or session-based authentication",
      
      endpoints: {
        dashboard: {
          method: "GET",
          path: "/dashboard",
          description: "Get comprehensive financial dashboard with key metrics and recent transactions",
          query_parameters: {
            branch_id: "Branch identifier (optional - will use authenticated user's Branch if not provided or 'undefined')",
            start_date: "Start date for metrics calculation (YYYY-MM-DD format, optional)",
            end_date: "End date for metrics calculation (YYYY-MM-DD format, optional)"
          },
          example: "/dashboard?branch_id=SCH001&start_date=2025-01-01&end_date=2025-01-31",
          response_format: {
            success: "boolean",
            data: {
              key_metrics: "Object with financial KPIs",
              recent_transactions: "Array of recent payment transactions",
              period: "Object with date range",
              generated_at: "ISO timestamp"
            }
          }
        },
        
        trial_balance: {
          method: "GET",
          path: "/trial-balance",
          description: "Generate trial balance report showing account balances",
          query_parameters: {
            branch_id: "Branch identifier (optional)",
            as_of_date: "Report date (YYYY-MM-DD format, defaults to today)"
          },
          example: "/trial-balance?branch_id=SCH001&as_of_date=2025-01-31",
          response_format: {
            success: "boolean",
            data: {
              accounts: "Array of accounts with debit/credit balances",
              totals: "Object with total debits, credits, and balance check",
              as_of_date: "Report date",
              generated_at: "ISO timestamp"
            }
          }
        },
        
        balance_sheet: {
          method: "GET",
          path: "/balance-sheet",
          description: "Generate balance sheet report showing assets, liabilities, and equity",
          query_parameters: {
            branch_id: "Branch identifier (optional)",
            as_of_date: "Report date (YYYY-MM-DD format, defaults to today)"
          },
          example: "/balance-sheet?branch_id=SCH001&as_of_date=2025-01-31",
          response_format: {
            success: "boolean",
            data: {
              assets: "Array of asset accounts",
              liabilities: "Array of liability accounts",
              equity: "Array of equity accounts",
              totals: "Object with section totals and balance verification",
              as_of_date: "Report date",
              generated_at: "ISO timestamp"
            }
          }
        },
        
        income_statement: {
          method: "GET",
          path: "/income-statement",
          description: "Generate income statement (profit & loss) report",
          query_parameters: {
            branch_id: "Branch identifier (optional)",
            start_date: "Period start date (YYYY-MM-DD format) or comma-separated date range",
            end_date: "Period end date (YYYY-MM-DD format, optional if start_date contains both dates)"
          },
          example: "/income-statement?branch_id=SCH001&start_date=2025-01-01&end_date=2025-01-31",
          alternative_example: "/income-statement?branch_id=SCH001&start_date=2025-01-01,2025-01-31",
          response_format: {
            success: "boolean",
            data: {
              revenue: "Array of revenue accounts",
              expenses: "Array of expense accounts",
              totals: "Object with revenue, expense totals and net income",
              period: "Object with date range",
              generated_at: "ISO timestamp"
            }
          }
        },
        
        metrics: {
          method: "GET",
          path: "/metrics",
          description: "Get financial metrics and KPIs",
          query_parameters: {
            start_date: "Start date for metrics (YYYY-MM-DD format, optional)",
            end_date: "End date for metrics (YYYY-MM-DD format, optional)",
            branch_id: "Branch identifier for filtering (optional)"
          },
          example: "/metrics?start_date=2025-01-01&end_date=2025-01-31&branch_id=BRCH001",
          response_format: {
            success: "boolean",
            data: {
              expected_fees: "Total expected fee amount",
              collected_fees: "Total collected fee amount",
              outstanding_fees: "Total outstanding fee amount",
              collection_rate: "Collection rate percentage",
              paid_students: "Number of students who paid",
              unpaid_students: "Number of students with outstanding balances",
              payroll_expenses: "Total payroll expenses",
              other_expenses: "Total other expenses",
              total_expenses: "Total all expenses",
              net_profit: "Net profit calculation",
              period: "Object with date range and branch info",
              generated_at: "ISO timestamp"
            }
          }
        },
        
        payment_trends: {
          method: "GET",
          path: "/payment-trends",
          description: "Get payment collection trends over time",
          query_parameters: {
            start_date: "Start date for trend analysis (YYYY-MM-DD format, optional)",
            end_date: "End date for trend analysis (YYYY-MM-DD format, optional)",
            branch_id: "Branch identifier for filtering (optional)"
          },
          example: "/payment-trends?start_date=2025-01-01&end_date=2025-12-31&branch_id=BRCH001",
          response_format: {
            success: "boolean",
            data: "Array of monthly trend objects with collected/expected amounts and rates",
            period: "Object with date range and branch info",
            generated_at: "ISO timestamp"
          }
        },
        
        classwise_collection: {
          method: "GET",
          path: "/classwise-collection",
          description: "Get fee collection analysis by class",
          query_parameters: {
            start_date: "Start date for analysis (YYYY-MM-DD format, optional)",
            end_date: "End date for analysis (YYYY-MM-DD format, optional)",
            branch_id: "Branch identifier for filtering (optional)"
          },
          example: "/classwise-collection?start_date=2025-01-01&end_date=2025-01-31&branch_id=BRCH001",
          response_format: {
            success: "boolean",
            data: "Array of class-wise collection data with student counts and amounts",
            period: "Object with date range and branch info",
            generated_at: "ISO timestamp"
          }
        },
        
        payment_methods: {
          method: "GET",
          path: "/payment-methods",
          description: "Analyze payment methods usage and amounts",
          query_parameters: {
            start_date: "Start date for analysis (YYYY-MM-DD format, optional)",
            end_date: "End date for analysis (YYYY-MM-DD format, optional)",
            branch_id: "Branch identifier for filtering (optional)"
          },
          example: "/payment-methods?start_date=2025-01-01&end_date=2025-01-31&branch_id=BRCH001",
          response_format: {
            success: "boolean",
            data: "Array of payment method analysis with amounts and percentages",
            totals: "Object with total amounts and transaction counts",
            period: "Object with date range and branch info",
            generated_at: "ISO timestamp"
          }
        }
      },
      
      common_features: {
        branch_id_handling: "If branch_id is not provided or is 'undefined', the API will use the authenticated user's branch_id",
        date_formats: "All dates should be in YYYY-MM-DD format",
        authentication: "All endpoints require authentication via the authenticate middleware",
        error_handling: "All endpoints return standardized error responses with success: false and error details",
        data_source: "All APIs query the payment_entries table and related tables using Sequelize ORM"
      },
      
      error_responses: {
        authentication_error: {
          status: 401,
          response: {
            success: false,
            message: "Authentication required"
          }
        },
        server_error: {
          status: 500,
          response: {
            success: false,
            message: "Error message describing the issue",
            error: "Detailed error information"
          }
        }
      },
      
      notes: [
        "All monetary amounts are returned as numbers (not strings)",
        "Dates are returned in ISO format for timestamps and YYYY-MM-DD for date fields",
        "The APIs filter out records with payment_status = 'Excluded'",
        "Branch filtering is optional and will include all branches if not specified",
        "Collection rates are calculated as percentages (0-100)",
        "The income statement API supports both separate start_date/end_date parameters and comma-separated dates in start_date"
      ]
    });
  });
};