const {
  PaymentEntryController,
  FinancialReportController,
  PaymentMethodController,
  IncomeController,
  ExposeController
} = require("../controllers/financial_report");

module.exports = (app) => {
  // ========================================
  // PAYMENT ENTRY ROUTES (New - using manage_payment_entries stored procedure)
  // ========================================
  
  // Create payment entry (student-related)
  app.post("/payment-entries", PaymentEntryController.createPaymentEntry);
  
  // Create income entry (not tied to student)
  app.post("/payment-entries/income", PaymentEntryController.createIncomeEntry);
  
  // Create expense entry (not tied to student)
  app.post("/payment-entries/expense", PaymentEntryController.createExpenseEntry);
  
  // Get single payment entry
  app.get("/payment-entries/:id", PaymentEntryController.getPaymentEntry);
  
  // Get all payment entries
  app.get("/payment-entries", PaymentEntryController.getAllPaymentEntries);
  
  // Update payment entry
  app.put("/payment-entries/:id", PaymentEntryController.updatePaymentEntry);
  
  // Delete payment entry
  app.delete("/payment-entries/:id", PaymentEntryController.deletePaymentEntry);

  // ========================================
  // FINANCIAL REPORTS ROUTES (Updated - using manage_payment_entries stored procedure)
  // ========================================
  
  // Credit report (student payments received)
  app.get("/reports/credit", FinancialReportController.getCreditReport);
  
  // Debit report (student charges/fees)
  app.get("/reports/debit", FinancialReportController.getDebitReport);
  
  // Income report (all income including student payments)
  app.get("/reports/income", FinancialReportController.getIncomeReport);
  
  // Expenses report (all expenses)
  app.get("/reports/expenses", FinancialReportController.getExpensesReport);
  
  // Balance report (total credits vs debits)
  app.get("/reports/balance", FinancialReportController.getBalanceReport);
  
  // Comprehensive financial summary
  app.get("/reports/financial-summary", FinancialReportController.getFinancialSummary);
  
  // Financial dashboard (formatted for frontend)
  app.get("/reports/dashboard", FinancialReportController.getFinancialDashboard);
  
  // Payment entries report with filtering
  app.get("/reports/payment-entries", FinancialReportController.getPaymentEntriesReport);

  // ========================================
  // LEGACY ROUTES (Backward compatibility)
  // ========================================
  
  // Payment Method Routes (existing)
  app.post("/new-payment-method", PaymentMethodController.createPaymentMethod);
  app.get("/get-all-payment-methods", PaymentMethodController.getAllPaymentMethods);
  app.get("/get-payment-method/:id", PaymentMethodController.getPaymentMethod);
  app.put("/update-payment-method/:id", PaymentMethodController.updatePaymentMethod);
  app.delete("/delete-payment-method/:id", PaymentMethodController.deletePaymentMethod);

  // Income Routes (existing)
  app.post("/new-income", IncomeController.createIncome);
  app.get("/get-income/:id", IncomeController.getIncome);
  app.get("/get-all-income", IncomeController.getAllIncome);
  app.put("/update-income/:id", IncomeController.updateIncome);
  app.delete("/delete-income/:id", IncomeController.deleteIncome);

  // Expose Routes (existing)
  app.post("/new-expose", ExposeController.createExpose);
  app.get("/get-expose/:id", ExposeController.getExpose);
  app.get("/get-all-exposes", ExposeController.getAllExposes);
  app.put("/update-expose/:id", ExposeController.updateExpose);
  app.delete("/delete-expose/:id", ExposeController.deleteExpose);

  // Legacy report routes (redirected to new endpoints)
  app.get("/income-report", FinancialReportController.getIncomeReport);
  app.get("/expenses-report", FinancialReportController.getExpensesReport);
  app.get("/profit-loss-report", FinancialReportController.getProfitLossReport);

  // ========================================
  // PROFIT & LOSS API (TEMPORARY WORKAROUND)
  // ========================================
  
  // Comprehensive Profit & Loss API for ProfitLoss component
  app.get('/api/v2/reports/profit-loss-detailed', async (req, res) => {
    try {
      const {
        start_date,
        end_date,
        academic_year,
        term,
        branch_id,
        school_id
      } = req.query;

      // Use provided school_id and branch_id
      const effectiveSchoolId = school_id || 'SCH/1';
      const effectiveBranchId = branch_id || null;

      console.log('📊 Profit/Loss API called with:', {
        query_params: req.query,
        effective_school_id: effectiveSchoolId,
        effective_branch_id: effectiveBranchId
      });

      // Import db here to avoid circular dependency
      const db = require('../models');

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

  // Test endpoint for profit loss
  app.get('/api/v2/reports/profit-loss-test', (req, res) => {
    res.json({
      success: true,
      message: 'Profit/Loss API is working (added to financial_report.js)',
      timestamp: new Date().toISOString(),
      note: 'This route is now in financial_report.js which is actively loaded'
    });
  });
  
  // ========================================
  // API DOCUMENTATION ROUTE
  // ========================================
  app.get("/financial-api-docs", (req, res) => {
    res.json({
      message: "Financial Report API Documentation",
      version: "2.0.0",
      endpoints: {
        payment_entries: {
          description: "Manage payment entries using the manage_payment_entries stored procedure",
          routes: {
            "POST /payment-entries": {
              description: "Create a new payment entry (student-related)",
              required_fields: ["ref_no", "admission_no", "class_code", "academic_year", "term", "description", "payment_mode", "school_id", "branch_id"],
              optional_fields: ["item_id", "cr", "dr", "payment_status", "quantity", "is_optional"]
            },
            "POST /payment-entries/income": {
              description: "Create a new income entry (not tied to student)",
              required_fields: ["ref_no", "academic_year", "term", "cr", "description", "payment_mode", "school_id", "branch_id"],
              optional_fields: ["item_id", "payment_status", "quantity", "is_optional"]
            },
            "POST /payment-entries/expense": {
              description: "Create a new expense entry (not tied to student)",
              required_fields: ["ref_no", "academic_year", "term", "dr", "description", "payment_mode", "school_id", "branch_id"],
              optional_fields: ["item_id", "payment_status", "quantity", "is_optional"]
            },
            "GET /payment-entries": "Get all payment entries",
            "GET /payment-entries/:id": "Get single payment entry by ID",
            "PUT /payment-entries/:id": "Update payment entry",
            "DELETE /payment-entries/:id": "Delete payment entry"
          }
        },
        financial_reports: {
          description: "Generate various financial reports",
          routes: {
            "GET /reports/credit": "Get credit report (student payments received)",
            "GET /reports/debit": "Get debit report (student charges/fees)",
            "GET /reports/income": "Get income report (all income including student payments)",
            "GET /reports/expenses": "Get expenses report (all expenses)",
            "GET /reports/balance": "Get balance report (total credits vs debits)",
            "GET /reports/financial-summary": "Get comprehensive financial summary",
            "GET /reports/dashboard": "Get formatted financial dashboard for frontend (recommended)",
            "GET /reports/payment-entries": "Get filtered payment entries report with pagination and summary statistics"
          }
        },
        legacy_endpoints: {
          description: "Backward compatibility endpoints",
          routes: {
            "POST /new-payment-method": "Create payment method",
            "GET /get-all-payment-methods": "Get all payment methods",
            "GET /income-report": "Legacy income report (redirected)",
            "GET /expenses-report": "Legacy expenses report (redirected)"
          }
        }
      },
      stored_procedure_info: {
        name: "manage_payment_entries",
        supported_operations: [
          "insert", "insert_income", "insert_expense", "get_one", "get_all", 
          "edit", "delete", "credit_report", "debit_report", "income_report", 
          "expenses_report", "balance_report"
        ]
      },
      example_requests: {
        create_student_payment: {
          method: "POST",
          url: "/payment-entries",
          body: {
            ref_no: "PAY001",
            admission_no: "STU001",
            class_code: "JSS1A",
            academic_year: "2023/2024",
            term: "First Term",
            cr: 50000.00,
            dr: 0.00,
            description: "School fees payment",
            payment_mode: "Cash",
            school_id: "SCH/1",
            branch_id: "BRCH00001",
            payment_status: "completed",
            quantity: 1,
            is_optional: "No"
          }
        },
        create_income: {
          method: "POST",
          url: "/payment-entries/income",
          body: {
            ref_no: "INC001",
            academic_year: "2023/2024",
            term: "First Term",
            cr: 100000.00,
            description: "Donation received",
            payment_mode: "Bank Transfer",
            school_id: "SCH/1",
            branch_id: "BRCH00001"
          }
        },
        create_expense: {
          method: "POST",
          url: "/payment-entries/expense",
          body: {
            ref_no: "EXP001",
            academic_year: "2023/2024",
            term: "First Term",
            dr: 25000.00,
            description: "Office supplies purchase",
            payment_mode: "Cash",
            school_id: "SCH/1",
            branch_id: "BRCH00001"
          }
        },
        get_dashboard: {
          method: "GET",
          url: "/reports/dashboard",
          description: "Get formatted financial dashboard with summary cards, charts data, and recent transactions"
        },
        get_payment_entries_report: {
          method: "GET",
          url: "/reports/payment-entries?start_date=2025-08-12&end_date=2025-09-11&branch_id=BRCH00001&type=income",
          description: "Get filtered payment entries report with date range, branch, and type filters",
          query_parameters: {
            start_date: "Start date (YYYY-MM-DD)",
            end_date: "End date (YYYY-MM-DD)",
            branch_id: "Branch ID filter",
            school_id: "School ID filter",
            type: "Entry type: 'income', 'expense', or 'all'",
            academic_year: "Academic year filter",
            term: "Term filter",
            payment_mode: "Payment mode filter",
            payment_status: "Payment status filter",
            limit: "Number of records per page (default: 100)",
            offset: "Number of records to skip (default: 0)"
          }
        }
      }
    });
  });
};