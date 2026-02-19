const {
  ChartOfAccountsController,
  JournalEntriesController,
  FinancialReportsController,
  PaymentIntegrationController
} = require("../controllers/enhanced_financial_controller");
const { authenticateToken } = require("../middleware/auth");
const { dashboardCache } = require("../middleware/cacheMiddleware");
const { 
  reconcileFinancialEntries,
  autoCreateMissingJournalEntries,
  generateReconciliationReport,
  getAuditTrail
} = require("../controllers/financialReconciliationController");

module.exports = (app) => {
  // ========================================
  // CHART OF ACCOUNTS ROUTES
  // ========================================
  
  // Get chart of accounts for a school
  app.get("/api/v2/schools/chart-of-accounts", authenticateToken, ChartOfAccountsController.getChartOfAccounts);
  
  // Create a new account
  app.post("/api/v2/chart-of-accounts", authenticateToken, ChartOfAccountsController.createAccount);
  
  // Initialize default chart of accounts for a school
  app.post("/api/v2/schools/chart-of-accounts/initialize", authenticateToken, ChartOfAccountsController.initializeDefaultAccounts);
  
  // Initialize simplified chart of accounts for a school
  app.post("/api/v2/schools/chart-of-accounts/initialize-simplified", authenticateToken, ChartOfAccountsController.initializeSimplifiedAccounts);

  // ========================================
  // JOURNAL ENTRIES ROUTES (Double-Entry Bookkeeping)
  // ========================================
  
  // Create a new journal entry
  app.post("/api/v2/journal-entries", authenticateToken, (req, res) => JournalEntriesController.createJournalEntry(req, res));
  
  // Post a journal entry to general ledger
  app.post("/api/v2/journal-entries/:entry_id/post", authenticateToken, (req, res) => JournalEntriesController.postJournalEntry(req, res));
  
  // Get journal entries for a school
  app.get("/api/v2/schools/journal-entries", authenticateToken, (req, res) => JournalEntriesController.getJournalEntries(req, res));

  // ========================================
  // FINANCIAL REPORTS ROUTES (Standard Accounting Reports)
  // ========================================
  
  // Trial Balance
  app.get("/api/v2/schools/reports/trial-balance", authenticateToken, FinancialReportsController.getTrialBalance);
  
  // Balance Sheet
  app.get("/api/v2/schools/reports/balance-sheet", authenticateToken, FinancialReportsController.getBalanceSheet);
  
  // Income Statement (Profit & Loss)
  app.get("/api/v2/schools/reports/income-statement", authenticateToken, FinancialReportsController.getIncomeStatement);
  
  // Cash Flow Statement
  app.get("/api/v2/schools/reports/cash-flow", authenticateToken, FinancialReportsController.getCashFlowStatement);
  
  // Comprehensive Financial Dashboard
  app.get("/api/v2/schools/reports/dashboard", authenticateToken, dashboardCache, FinancialReportsController.getFinancialDashboard);

  // ========================================
  // PAYMENT INTEGRATION ROUTES (Bridge to new system)
  // ========================================
  
  // Convert single payment entry to journal entry
  app.post("/api/v2/payment-entries/:payment_entry_id/convert", authenticateToken, PaymentIntegrationController.convertPaymentToJournal);
  
  // Bulk convert unposted payment entries
  app.post("/api/v2/schools/payment-entries/bulk-convert", authenticateToken, PaymentIntegrationController.bulkConvertPayments);

  // ========================================
  // FINANCIAL RECONCILIATION ROUTES
  // ========================================
  
  // Reconcile payment entries with journal entries
  app.get("/api/v2/schools/reconciliation", authenticateToken, reconcileFinancialEntries);
  
  // Auto-create missing journal entries
  app.post("/api/v2/schools/reconciliation/auto-create", authenticateToken, autoCreateMissingJournalEntries);
  
  // Generate reconciliation report
  app.get("/api/v2/schools/reconciliation/report", authenticateToken, generateReconciliationReport);
  
  // Get audit trail
  app.get("/api/v2/schools/reconciliation/audit-trail", authenticateToken, getAuditTrail);

  // ========================================
  // LEGACY COMPATIBILITY ROUTES
  // ========================================
  
  // Redirect old financial report routes to new enhanced versions
  app.get("/reports/enhanced-income", authenticateToken, (req, res) => {

    res.redirect(`/api/v2/schools/reports/income-statement?${new URLSearchParams(req.query)}`);
  });
  
  app.get("/reports/enhanced-expenses", (req, res) => {
    res.redirect(`/api/v2/schools/reports/expenses-report?${new URLSearchParams(req.query)}`);
  });
  
  app.get("/reports/enhanced-profit-loss", (req, res) => {
    res.redirect(`/api/v2/schools/reports/profit-loss?${new URLSearchParams(req.query)}`);
  });
  
  app.get("/reports/enhanced-dashboard", (req, res) => {
    res.redirect(`/api/v2/schools/reports/dashboard?${new URLSearchParams(req.query)}`);
  });

  // ========================================
  // API DOCUMENTATION ROUTE
  // ========================================
  app.get("/api/v2/financial-docs", (req, res) => {
    res.json({
      message: "Enhanced Financial Management API Documentation",
      version: "2.0.0",
      description: "Comprehensive accounting system following standard accounting principles with double-entry bookkeeping",
      features: [
        "Chart of Accounts management",
        "Double-entry bookkeeping with journal entries",
        "General ledger and account balances",
        "Standard financial reports (Trial Balance, Balance Sheet, Income Statement, Cash Flow)",
        "Financial dashboard with key metrics",
        "Integration with existing payment system",
        "Audit trail for all financial transactions",
        "Financial reconciliation and discrepancy detection"
      ],
      endpoints: {
        chart_of_accounts: {
          description: "Manage chart of accounts following standard accounting structure",
          routes: {
            "GET /api/v2/schools/chart-of-accounts": {
              description: "Get chart of accounts for a school",
              query_params: {
                branch_id: "Branch ID to filter accounts (required)",
                account_type: "Filter by account type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)",
                is_active: "Filter by active status (true/false)"
              }
            },
            "POST /api/v2/chart-of-accounts": {
              description: "Create a new account",
              required_fields: ["account_code", "account_name", "account_type", "normal_balance"],
              optional_fields: ["account_subtype", "parent_account_id", "description"],
              note: "Branch ID is determined from authentication context"
            },
            "POST /api/v2/schools/chart-of-accounts/initialize": {
              description: "Initialize default chart of accounts for a school",
              note: "Creates a comprehensive set of accounts suitable for educational institutions"
            },
            "POST /api/v2/schools/chart-of-accounts/initialize-simplified": {
              description: "Initialize simplified chart of accounts for a school",
              note: "Creates a lightweight set of essential accounts for basic financial tracking"
            }
          }
        },
        journal_entries: {
          description: "Double-entry bookkeeping journal entries",
          routes: {
            "POST /api/v2/journal-entries": {
              description: "Create a new journal entry",
              required_fields: ["entry_date", "reference_type", "description", "journal_lines"],
              note: "Branch ID is determined from authentication context",
              journal_lines_format: [
                {
                  account_id: "integer",
                  debit_amount: "decimal (optional, default 0)",
                  credit_amount: "decimal (optional, default 0)",
                  description: "string (optional)"
                }
              ],
              validation: "Total debits must equal total credits"
            },
            "POST /api/v2/journal-entries/:entry_id/post": {
              description: "Post journal entry to general ledger",
              note: "Updates account balances and creates general ledger entries"
            },
            "GET /api/v2/schools/journal-entries": {
              description: "Get journal entries for a school",
              query_params: {
                branch_id: "Branch ID to filter entries (required)",
                start_date: "Filter by start date",
                end_date: "Filter by end date",
                status: "Filter by status (DRAFT, POSTED, REVERSED)",
                reference_type: "Filter by reference type",
                page: "Page number for pagination",
                limit: "Number of records per page"
              }
            }
          }
        },
        financial_reports: {
          description: "Standard accounting reports",
          routes: {
            "GET /api/v2/schools/reports/trial-balance": {
              description: "Generate trial balance report",
              query_params: {
                branch_id: "Branch ID for the report (required)",
                as_of_date: "Report date (default: today)"
              },
              returns: "List of accounts with debit/credit balances and totals"
            },
            "GET /api/v2/schools/reports/balance-sheet": {
              description: "Generate balance sheet report",
              query_params: {
                branch_id: "Branch ID for the report (required)",
                as_of_date: "Report date (default: today)"
              },
              returns: "Assets, Liabilities, and Equity with totals"
            },
            "GET /api/v2/schools/reports/income-statement": {
              description: "Generate income statement (profit & loss) report",
              query_params: {
                branch_id: "Branch ID for the report (required)",
                start_date: "Period start date (default: beginning of year)",
                end_date: "Period end date (default: today)"
              },
              returns: "Revenue and Expenses with net income calculation"
            },
            "GET /api/v2/schools/reports/cash-flow": {
              description: "Generate cash flow statement",
              query_params: {
                branch_id: "Branch ID for the report (required)",
                start_date: "Period start date (default: beginning of year)",
                end_date: "Period end date (default: today)"
              },
              returns: "Operating, Investing, and Financing activities"
            },
            "GET /api/v2/schools/reports/dashboard": {
              description: "Comprehensive financial dashboard",
              query_params: {
                branch_id: "Branch ID for the report (required)",
                start_date: "Period start date (default: beginning of year)",
                end_date: "Period end date (default: today)"
              },
              returns: "Key financial metrics, ratios, and recent transactions"
            }
          }
        },
        payment_integration: {
          description: "Bridge existing payment system with new accounting system",
          routes: {
            "POST /api/v2/payment-entries/:payment_entry_id/convert": {
              description: "Convert single payment entry to journal entry",
              note: "Creates proper double-entry journal entry from payment entry"
            },
            "POST /api/v2/schools/payment-entries/bulk-convert": {
              description: "Bulk convert unposted payment entries",
              query_params: {
                limit: "Maximum number of entries to convert (default: 100)"
              },
              returns: "Conversion summary with success count and errors"
            }
          }
        },
        financial_reconciliation: {
          description: "Financial reconciliation services",
          routes: {
            "GET /api/v2/schools/reconciliation": {
              description: "Reconcile payment entries with journal entries",
              query_params: {
                school_id: "School ID for reconciliation (required)",
                branch_id: "Branch ID to filter (optional)",
                start_date: "Start date for reconciliation (optional)",
                end_date: "End date for reconciliation (optional)"
              },
              returns: "Reconciliation summary with matched/unmatched entries and discrepancies"
            },
            "POST /api/v2/schools/reconciliation/auto-create": {
              description: "Auto-create missing journal entries for payment entries",
              body_params: {
                school_id: "School ID for reconciliation (required)",
                branch_id: "Branch ID to filter (optional)"
              },
              returns: "Creation summary with success count and errors"
            },
            "GET /api/v2/schools/reconciliation/report": {
              description: "Generate detailed reconciliation report",
              query_params: {
                school_id: "School ID for report (required)",
                branch_id: "Branch ID to filter (optional)",
                start_date: "Start date for report (optional)",
                end_date: "End date for report (optional)"
              },
              returns: "Detailed reconciliation report with statistics and audit trail"
            },
            "GET /api/v2/schools/reconciliation/audit-trail": {
              description: "Get financial audit trail",
              query_params: {
                school_id: "School ID for audit trail (required)",
                branch_id: "Branch ID to filter (optional)",
                table_name: "Table name to filter (optional)",
                record_id: "Record ID to filter (optional)",
                start_date: "Start date for audit trail (optional)",
                end_date: "End date for audit trail (optional)",
                limit: "Maximum number of records (default: 100)"
              },
              returns: "List of audit trail entries"
            }
          }
        }
      },
      accounting_principles: {
        double_entry_bookkeeping: "Every transaction affects at least two accounts",
        chart_of_accounts: "Standardized account structure (Assets, Liabilities, Equity, Revenue, Expenses)",
        normal_balances: {
          ASSET: "DEBIT",
          LIABILITY: "CREDIT", 
          EQUITY: "CREDIT",
          REVENUE: "CREDIT",
          EXPENSE: "DEBIT"
        },
        financial_statements: [
          "Trial Balance - Ensures debits equal credits",
          "Balance Sheet - Assets = Liabilities + Equity",
          "Income Statement - Revenue - Expenses = Net Income",
          "Cash Flow Statement - Operating, Investing, Financing activities"
        ]
      },
      migration_guide: {
        step_1: "Initialize chart of accounts: POST /api/v2/schools/chart-of-accounts/initialize",
        step_2: "Convert existing payments: POST /api/v2/schools/payment-entries/bulk-convert",
        step_3: "Start using journal entries for new transactions: POST /api/v2/journal-entries",
        step_4: "Enable financial reconciliation: GET /api/v2/schools/reconciliation",
        step_5: "Generate reports: Use /api/v2/schools/reports/* endpoints"
      },
      examples: {
        student_fee_payment: {
          description: "Record student fee payment",
          journal_entry: {
            entry_date: "2025-01-15",
            reference_type: "STUDENT_PAYMENT",
            reference_id: "PAY001",
            description: "School fees payment from John Doe",
            branch_id: "BRCH00001",
            journal_lines: [
              {
                account_id: 5, // Bank Account - Main (1112)
                debit_amount: 50000.00,
                credit_amount: 0.00,
                description: "Cash received"
              },
              {
                account_id: 25, // Tuition Fees (4110)
                debit_amount: 0.00,
                credit_amount: 50000.00,
                description: "Tuition fees earned"
              }
            ]
          }
        },
        expense_payment: {
          description: "Record expense payment",
          journal_entry: {
            entry_date: "2025-01-15",
            reference_type: "EXPENSE",
            reference_id: "EXP001",
            description: "Office supplies purchase",
            branch_id: "BRCH00001",
            journal_lines: [
              {
                account_id: 45, // Office Supplies (5232)
                debit_amount: 15000.00,
                credit_amount: 0.00,
                description: "Office supplies expense"
              },
              {
                account_id: 5, // Bank Account - Main (1112)
                debit_amount: 0.00,
                credit_amount: 15000.00,
                description: "Cash paid"
              }
            ]
          }
        }
      }
    });
  });
};