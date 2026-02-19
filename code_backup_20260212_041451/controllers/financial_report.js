const db = require("../models");

/**
 * Controller for managing payment entries using the manage_payment_entries stored procedure
 * Provides CRUD operations for payment entries including student payments, income, and expenses
 */
const PaymentEntryController = {
  /**
   * Insert a new payment entry (student-related)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async createPaymentEntry(req, res) {
    const {
      item_id,
      ref_no,
      admission_no,
      class_code,
      academic_year,
      term,
      cr,
      dr,
      description,
      payment_mode,
      school_id,
      branch_id,
      payment_status,
      quantity,
      is_optional
    } = req.body;

    try {
      await db.sequelize.query(
        `CALL manage_payment_entries(
          'insert', :item_id, :ref_no, :admission_no, :class_code, :academic_year, 
          :term, :cr, :dr, :description, :payment_mode, :school_id, :branch_id, 
          :payment_status, :quantity, :is_optional
        )`,
        {
          replacements: {
            item_id: item_id || null,
            ref_no,
            admission_no,
            class_code,
            academic_year,
            term,
            cr: cr || 0.00,
            dr: dr || 0.00,
            description,
            payment_mode,
            school_id,
            branch_id,
            payment_status: payment_status || 'completed',
            quantity: quantity || 1,
            is_optional: is_optional || 'No'
          }
        }
      );

      return res.status(201).json({
        message: "Payment entry created successfully",
        success: true
      });
    } catch (error) {
      console.error("Error creating payment entry:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Insert a new income entry (not tied to student)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async createIncomeEntry(req, res) {
    const {
      ref_no,
      academic_year,
      term,
      cr,
      description,
      payment_mode,
      school_id,
      branch_id,
      payment_status,
      quantity,
      is_optional
    } = req.body;

    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'insert_income', NULL, :ref_no, NULL, NULL, :academic_year, 
          :term, :cr, 0.00, :description, :payment_mode, :school_id, :branch_id, 
          :payment_status, :quantity, :is_optional
        )`,
        {
          replacements: {
            ref_no,
            academic_year,
            term,
            cr: cr || 0.00,
            description,
            payment_mode,
            school_id,
            branch_id,
            payment_status: payment_status || 'completed',
            quantity: quantity || 1,
            is_optional: is_optional || 'No'
          }
        }
      );
      
      // Handle the result safely
      let responseData = null;
      if (result && Array.isArray(result) && result.length > 0) {
        responseData = Array.isArray(result[0]) && result[0].length > 0 ? result[0][0] : result[0];
      }
      
      return res.status(201).json({ 
        message: "Income entry created successfully",
        data: responseData,
        success: true 
      });
    } catch (error) {
      console.error("Error creating income entry:", error);
      return res.status(500).json({ 
        error: error.message,
        success: false 
      });
    }
  },

  /**
   * Insert a new expense entry (not tied to student)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async createExpenseEntry(req, res) {
    const {
      ref_no,
      academic_year,
      term,
      dr,
      description,
      payment_mode,
      school_id,
      branch_id,
      payment_status,
      quantity,
      is_optional
    } = req.body;

    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'insert_expense', NULL, :ref_no, NULL, NULL, :academic_year, 
          :term, 0.00, :dr, :description, :payment_mode, :school_id, :branch_id, 
          :payment_status, :quantity, :is_optional
        )`,
        {
          replacements: {
            ref_no,
            academic_year,
            term,
            dr: dr || 0.00,
            description,
            payment_mode,
            school_id,
            branch_id,
            payment_status: payment_status || 'completed',
            quantity: quantity || 1,
            is_optional: is_optional || 'No'
          }
        }
      );
      
      // Handle the result safely
      let responseData = null;
      if (result && Array.isArray(result) && result.length > 0) {
        responseData = Array.isArray(result[0]) && result[0].length > 0 ? result[0][0] : result[0];
      }
      
      return res.status(201).json({ 
        message: "Expense entry created successfully",
        data: responseData,
        success: true 
      });
    } catch (error) {
      console.error("Error creating expense entry:", error);
      return res.status(500).json({ 
        error: error.message,
        success: false 
      });
    }
  },

  /**
   * Get one payment entry by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with payment entry data
   */
  async getPaymentEntry(req, res) {
    const { id } = req.params;

    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'get_one', :item_id, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`,
        {
          replacements: { item_id: id }
        }
      );

      if (!result || result.length === 0) {
        return res.status(404).json({
          message: "Payment entry not found",
          success: false
        });
      }

      return res.status(200).json({
        data: result[0],
        success: true
      });
    } catch (error) {
      console.error("Error fetching payment entry:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Get all payment entries
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with array of payment entries
   */
  async getAllPaymentEntries(req, res) {
    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'get_all', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      return res.status(200).json({
        data: result || [],
        count: result ? result.length : 0,
        success: true
      });
    } catch (error) {
      console.error("Error fetching all payment entries:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Update a payment entry
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async updatePaymentEntry(req, res) {
    const { id } = req.params;
    const {
      ref_no,
      admission_no,
      class_code,
      academic_year,
      term,
      cr,
      dr,
      description,
      payment_mode,
      school_id,
      branch_id,
      payment_status,
      quantity,
      is_optional
    } = req.body;

    try {
      await db.sequelize.query(
        `CALL manage_payment_entries(
          'edit', :item_id, :ref_no, :admission_no, :class_code, :academic_year, 
          :term, :cr, :dr, :description, :payment_mode, :school_id, :branch_id, 
          :payment_status, :quantity, :is_optional
        )`,
        {
          replacements: {
            item_id: id,
            ref_no,
            admission_no,
            class_code,
            academic_year,
            term,
            cr: cr || 0.00,
            dr: dr || 0.00,
            description,
            payment_mode,
            school_id,
            branch_id,
            payment_status,
            quantity: quantity || 1,
            is_optional: is_optional || 'No'
          }
        }
      );

      return res.status(200).json({
        message: "Payment entry updated successfully",
        success: true
      });
    } catch (error) {
      console.error("Error updating payment entry:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Delete a payment entry
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async deletePaymentEntry(req, res) {
    const { id } = req.params;

    try {
      await db.sequelize.query(
        `CALL manage_payment_entries(
          'delete', :item_id, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`,
        {
          replacements: { item_id: id }
        }
      );

      return res.status(200).json({
        message: "Payment entry deleted successfully",
        success: true
      });
    } catch (error) {
      console.error("Error deleting payment entry:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  }
};

/**
 * Controller for financial reports using the manage_payment_entries stored procedure
 * Provides various financial reports including income, expenses, credits, debits, and summaries
 */
const FinancialReportController = {
  /**
   * Get credit report (student payments received)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with credit report data
   */
  async getCreditReport(req, res) {
    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'credit_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      return res.status(200).json({
        data: result || [],
        count: result ? result.length : 0,
        success: true,
        report_type: 'credit_report'
      });
    } catch (error) {
      console.error("Error generating credit report:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Get debit report (student charges/fees)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with debit report data
   */
  async getDebitReport(req, res) {
    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'debit_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      return res.status(200).json({
        data: result || [],
        count: result ? result.length : 0,
        success: true,
        report_type: 'debit_report'
      });
    } catch (error) {
      console.error("Error generating debit report:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Get income report (all income including student payments)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with income report data
   */
  async getIncomeReport(req, res) {
    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'income_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      return res.status(200).json({
        data: result || [],
        count: result ? result.length : 0,
        success: true,
        report_type: 'income_report'
      });
    } catch (error) {
      console.error("Error generating income report:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Get expenses report (all expenses)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with expenses report data
   */
  async getExpensesReport(req, res) {
    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'expenses_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      return res.status(200).json({
        data: result || [],
        count: result ? result.length : 0,
        success: true,
        report_type: 'expenses_report'
      });
    } catch (error) {
      console.error("Error generating expenses report:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Get balance report (total credits vs debits)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with balance report data
   */
  async getBalanceReport(req, res) {
    try {
      const result = await db.sequelize.query(
        `CALL manage_payment_entries(
          'balance_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      return res.status(200).json({
        data: result[0] || { total_credit: 0, total_debit: 0, balance: 0 },
        success: true,
        report_type: 'balance_report'
      });
    } catch (error) {
      console.error("Error generating balance report:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Get comprehensive financial summary with calculated totals and formatted data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with comprehensive financial summary
   */
  async getFinancialSummary(req, res) {
    try {
      // Get all reports in parallel for better performance
      const [incomeResult] = await db.sequelize.query(
        `CALL manage_payment_entries(
          'income_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      const [expensesResult] = await db.sequelize.query(
        `CALL manage_payment_entries(
          'expenses_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      const [balanceResult] = await db.sequelize.query(
        `CALL manage_payment_entries(
          'balance_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      // Ensure we have arrays and calculate totals safely
      const incomeArray = Array.isArray(incomeResult) ? incomeResult : [];
      const expensesArray = Array.isArray(expensesResult) ? expensesResult : [];

      // Calculate totals with proper error handling
      const totalIncome = incomeArray.reduce((sum, item) => {
        const amount = parseFloat(item.total_income || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const totalExpenses = expensesArray.reduce((sum, item) => {
        const amount = parseFloat(item.total_expenses || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      // Format response for better frontend consumption
      return res.status(200).json({
        summary: {
          total_income: parseFloat(totalIncome.toFixed(2)),
          total_expenses: parseFloat(totalExpenses.toFixed(2)),
          net_profit: parseFloat(netProfit.toFixed(2)),
          profit_margin: parseFloat(profitMargin.toFixed(2)),
          balance_data: balanceResult[0] || { total_credit: 0, total_debit: 0, balance: 0 }
        },
        detailed_reports: {
          income: {
            items: incomeArray,
            count: incomeArray.length,
            total: parseFloat(totalIncome.toFixed(2))
          },
          expenses: {
            items: expensesArray,
            count: expensesArray.length,
            total: parseFloat(totalExpenses.toFixed(2))
          }
        },
        success: true,
        report_type: 'financial_summary',
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating financial summary:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Get financial dashboard with formatted data for frontend consumption
   * Includes summary cards, chart data, and recent transactions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with formatted dashboard data
   */
  async getFinancialDashboard(req, res) {
    try {
      // Get all reports in parallel
      const [incomeResult] = await db.sequelize.query(
        `CALL manage_payment_entries(
          'income_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      const [expensesResult] = await db.sequelize.query(
        `CALL manage_payment_entries(
          'expenses_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      const [creditResult] = await db.sequelize.query(
        `CALL manage_payment_entries(
          'credit_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      const [debitResult] = await db.sequelize.query(
        `CALL manage_payment_entries(
          'debit_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      const [balanceResult] = await db.sequelize.query(
        `CALL manage_payment_entries(
          'balance_report', NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
          NULL, NULL, NULL
        )`
      );

      // Ensure we have arrays
      const incomeArray = Array.isArray(incomeResult) ? incomeResult : [];
      const expensesArray = Array.isArray(expensesResult) ? expensesResult : [];
      const creditArray = Array.isArray(creditResult) ? creditResult : [];
      const debitArray = Array.isArray(debitResult) ? debitResult : [];

      // Calculate totals with error handling
      const totalIncome = incomeArray.reduce((sum, item) => {
        const amount = parseFloat(item.total_income || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const totalExpenses = expensesArray.reduce((sum, item) => {
        const amount = parseFloat(item.total_expenses || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const totalCredits = creditArray.reduce((sum, item) => {
        const amount = parseFloat(item.total_credit || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const totalDebits = debitArray.reduce((sum, item) => {
        const amount = parseFloat(item.total_debit || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      // Helper function to format currency
      const formatCurrency = (amount) => {
        return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
      };

      // Format response for dashboard
      return res.status(200).json({
        dashboard: {
          summary_cards: {
            total_income: {
              value: parseFloat(totalIncome.toFixed(2)),
              formatted: formatCurrency(totalIncome),
              count: incomeArray.length,
              trend: 'up'
            },
            total_expenses: {
              value: parseFloat(totalExpenses.toFixed(2)),
              formatted: formatCurrency(totalExpenses),
              count: expensesArray.length,
              trend: 'down'
            },
            net_profit: {
              value: parseFloat(netProfit.toFixed(2)),
              formatted: formatCurrency(netProfit),
              margin: parseFloat(profitMargin.toFixed(2)),
              status: netProfit >= 0 ? 'profit' : 'loss'
            },
            total_credits: {
              value: parseFloat(totalCredits.toFixed(2)),
              formatted: formatCurrency(totalCredits),
              count: creditArray.length
            },
            total_debits: {
              value: parseFloat(totalDebits.toFixed(2)),
              formatted: formatCurrency(totalDebits),
              count: debitArray.length
            }
          },
          charts_data: {
            income_vs_expenses: {
              labels: ['Income', 'Expenses'],
              data: [totalIncome, totalExpenses],
              colors: ['#10B981', '#EF4444']
            },
            profit_loss_trend: {
              profit: netProfit,
              profit_margin: profitMargin,
              status: netProfit >= 0 ? 'positive' : 'negative'
            }
          },
          recent_transactions: {
            income: incomeArray.slice(0, 5).map(item => ({
              ...item,
              amount_formatted: formatCurrency(parseFloat(item.total_income || 0)),
              type: 'income'
            })),
            expenses: expensesArray.slice(0, 5).map(item => ({
              ...item,
              amount_formatted: formatCurrency(parseFloat(item.total_expenses || 0)),
              type: 'expense'
            }))
          }
        },
        raw_data: {
          income: incomeArray,
          expenses: expensesArray,
          credits: creditArray,
          debits: debitArray,
          balance: balanceResult[0] || { total_credit: 0, total_debit: 0, balance: 0 }
        },
        success: true,
        report_type: 'financial_dashboard',
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating financial dashboard:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Get payment entries report with filtering options
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with filtered payment entries
   */
  async getPaymentEntriesReport(req, res) {
    const {
      start_date,
      end_date,
      branch_id,
      school_id,
      type, // 'income', 'expense', 'all'
      academic_year,
      term,
      payment_mode,
      payment_status,
      limit = 100,
      offset = 0
    } = req.query;

    try {
      // Build the WHERE clause based on filters
      let whereConditions = [];
      let replacements = {};

      // Date range filter
      if (start_date && end_date) {
        whereConditions.push('DATE(created_at) BETWEEN :start_date AND :end_date');
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      } else if (start_date) {
        whereConditions.push('DATE(created_at) >= :start_date');
        replacements.start_date = start_date;
      } else if (end_date) {
        whereConditions.push('DATE(created_at) <= :end_date');
        replacements.end_date = end_date;
      }

      // Branch filter
      if (branch_id) {
        whereConditions.push('branch_id = :branch_id');
        replacements.branch_id = branch_id;
      }

      // School filter
      if (school_id) {
        whereConditions.push('school_id = :school_id');
        replacements.school_id = school_id;
      }

      // Type filter (income/expense)
      if (type === 'income') {
        whereConditions.push('cr > 0');
      } else if (type === 'expense') {
        whereConditions.push('dr > 0');
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

      // Payment mode filter
      if (payment_mode) {
        whereConditions.push('payment_mode = :payment_mode');
        replacements.payment_mode = payment_mode;
      }

      // Payment status filter
      if (payment_status) {
        whereConditions.push('payment_status = :payment_status');
        replacements.payment_status = payment_status;
      }

      // Build the complete query
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          item_id,
          ref_no,
          admission_no,
          class_code,
          academic_year,
          term,
          cr,
          dr,
          description,
          payment_mode,
          school_id,
          branch_id,
          payment_status,
          quantity,
          is_optional,
          created_at,
          updated_at,
          CASE 
            WHEN cr > 0 THEN 'income'
            WHEN dr > 0 THEN 'expense'
            ELSE 'other'
          END as entry_type
        FROM payment_entries 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
      `;

      // Add pagination to replacements
      replacements.limit = parseInt(limit);
      replacements.offset = parseInt(offset);

      // Execute the query
      const result = await db.sequelize.query(query, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payment_entries 
        ${whereClause}
      `;
      
      const countResult = await db.sequelize.query(countQuery, {
        replacements: Object.fromEntries(
          Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))
        ),
        type: db.Sequelize.QueryTypes.SELECT
      });

      const total = countResult[0]?.total || 0;

      // Calculate summary statistics
      // ✅ FIXED: Revenue = Actual Payments Received (dr), NOT Invoices (cr)
      // Only count actual payments (dr > 0) and exclude unpaid invoices
      const totalIncome = result
        .filter(item => item.dr > 0 && item.payment_status !== 'Unpaid')
        .reduce((sum, item) => sum + parseFloat(item.dr || 0), 0);
      
      const totalExpenses = result
        .filter(item => item.dr > 0)
        .reduce((sum, item) => sum + parseFloat(item.dr || 0), 0);

      // Calculate accounts receivable (unpaid invoices) separately
      const accountsReceivable = result
        .filter(item => item.cr > 0 && (parseFloat(item.cr || 0) - parseFloat(item.dr || 0)) > 0)
        .reduce((sum, item) => sum + (parseFloat(item.cr || 0) - parseFloat(item.dr || 0)), 0);

      const netAmount = totalIncome - totalExpenses;

      return res.status(200).json({
        data: result,
        pagination: {
          total: parseInt(total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(total / limit),
          current_page: Math.floor(offset / limit) + 1
        },
        summary: {
          total_income: parseFloat(totalIncome.toFixed(2)),
          total_expenses: parseFloat(totalExpenses.toFixed(2)),
          net_amount: parseFloat(netAmount.toFixed(2)),
          income_count: result.filter(item => item.dr > 0 && item.payment_status !== 'Unpaid').length,
          expense_count: result.filter(item => item.dr > 0).length,
          total_entries: result.length
        },
        filters_applied: {
          start_date,
          end_date,
          branch_id,
          school_id,
          type,
          academic_year,
          term,
          payment_mode,
          payment_status
        },
        success: true,
        report_type: 'payment_entries_report',
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating payment entries report:", error);
      return res.status(500).json({
        error: error.message,
        success: false
      });
    }
  },

  /**
   * Legacy method for backward compatibility
   * Redirects to financial summary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response from getFinancialSummary
   */
  async getProfitLossReport(req, res) {
    return FinancialReportController.getFinancialSummary(req, res);
  }
};

/**
 * Controller for managing payment methods (kept for backward compatibility)
 * Provides CRUD operations for payment methods
 */
const PaymentMethodController = {
  /**
   * Insert a new payment method
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async createPaymentMethod(req, res) {
    const { paymentName } = req.body;

    try {
      await db.sequelize.query(
        "CALL manage_payment_method('insert', NULL, :paymentName)",
        {
          replacements: { paymentName }
        }
      );

      return res.status(201).json({
        message: "Payment method created successfully"
      });
    } catch (error) {
      console.error("Error creating payment method:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Get one payment method by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with payment method data
   */
  async getPaymentMethod(req, res) {
    const { id } = req.params;

    try {
      const [paymentMethod] = await db.sequelize.query(
        "CALL manage_payment_method('get_one', :paymentID, NULL)",
        {
          replacements: { paymentID: id }
        }
      );

      if (!paymentMethod) {
        return res.status(404).json({
          message: "Payment method not found"
        });
      }

      return res.status(200).json(paymentMethod);
    } catch (error) {
      console.error("Error fetching payment method:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Get all payment methods
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with array of payment methods
   */
  async getAllPaymentMethods(req, res) {
    try {
      const paymentMethods = await db.sequelize.query(
        "CALL manage_payment_method('get_all', NULL, NULL)"
      );

      return res.status(200).json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Edit a payment method
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async updatePaymentMethod(req, res) {
    const { id } = req.params;
    const { paymentName } = req.body;

    try {
      await db.sequelize.query(
        "CALL manage_payment_method('edit', :paymentID, :paymentName)",
        {
          replacements: { paymentID: id, paymentName }
        }
      );

      return res.status(200).json({
        message: "Payment method updated successfully"
      });
    } catch (error) {
      console.error("Error updating payment method:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Delete a payment method
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async deletePaymentMethod(req, res) {
    const { id } = req.params;

    try {
      await db.sequelize.query(
        "CALL manage_payment_method('delete', :paymentID, NULL)",
        {
          replacements: { paymentID: id }
        }
      );

      return res.status(200).json({
        message: "Payment method deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  }
};

// Keep the existing controllers for backward compatibility
const IncomeController = {
  /**
   * Insert a new income record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async createIncome(req, res) {
    const { incomeCategoryName, source, transactionType } = req.body;

    try {
      await db.sequelize.query(
        "CALL manage_income('insert', NULL, :incomeCategoryName, :source, :transactionType)",
        {
          replacements: { incomeCategoryName, source, transactionType }
        }
      );
      return res.status(201).json({
        message: "Income record created successfully"
      });
    } catch (error) {
      console.error("Error creating income:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Get one income record by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with income data
   */
  async getIncome(req, res) {
    const { id } = req.params;

    try {
      const [income] = await db.sequelize.query(
        "CALL manage_income('get_one', :incomeID, NULL, NULL, NULL)",
        {
          replacements: { incomeID: id }
        }
      );
      if (!income) {
        return res.status(404).json({
          message: "Income record not found"
        });
      }
      return res.status(200).json(income);
    } catch (error) {
      console.error("Error fetching income by ID:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Get all income records
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with array of income records
   */
  async getAllIncome(req, res) {
    try {
      const incomeRecords = await db.sequelize.query(
        "CALL manage_income('get_all', NULL, NULL, NULL, NULL)"
      );
      return res.status(200).json(incomeRecords);
    } catch (error) {
      console.error("Error fetching all income records:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Edit an income record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async updateIncome(req, res) {
    const { id } = req.params;
    const { incomeCategoryName, source, transactionType } = req.body;

    try {
      await db.sequelize.query(
        "CALL manage_income('edit', :incomeID, :incomeCategoryName, :source, :transactionType)",
        {
          replacements: {
            incomeID: id,
            incomeCategoryName,
            source,
            transactionType
          }
        }
      );
      return res.status(200).json({
        message: "Income record updated successfully"
      });
    } catch (error) {
      console.error("Error updating income:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Delete an income record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async deleteIncome(req, res) {
    const { id } = req.params;

    try {
      await db.sequelize.query(
        "CALL manage_income('delete', :incomeID, NULL, NULL, NULL)",
        {
          replacements: { incomeID: id }
        }
      );
      return res.status(200).json({
        message: "Income record deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting income:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  }
};

/**
 * Controller for managing expenses (kept for backward compatibility)
 * Provides CRUD operations for expense records
 */
const ExposeController = {
  /**
   * Insert a new expense record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async createExpose(req, res) {
    const { categoryName, source, transactionType } = req.body;

    try {
      await db.sequelize.query(
        "CALL manage_expenses('insert', NULL, :categoryName, :source, :transactionType)",
        {
          replacements: { categoryName, source, transactionType }
        }
      );
      return res.status(201).json({
        message: "Expense record created successfully"
      });
    } catch (error) {
      console.error("Error creating expense:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Get one expense record by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with expense data
   */
  async getExpose(req, res) {
    const { id } = req.params;

    try {
      const [expose] = await db.sequelize.query(
        "CALL manage_expenses('get_one', :exposeID, NULL, NULL, NULL)",
        {
          replacements: { exposeID: id }
        }
      );
      if (!expose) {
        return res.status(404).json({
          message: "Expense record not found"
        });
      }
      return res.status(200).json(expose);
    } catch (error) {
      console.error("Error fetching expense by ID:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Get all expense records
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with array of expense records
   */
  async getAllExposes(req, res) {
    try {
      const exposes = await db.sequelize.query(
        "CALL manage_expenses('get_all', NULL, NULL, NULL, NULL)"
      );
      return res.status(200).json(exposes);
    } catch (error) {
      console.error("Error fetching all expense records:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Edit an expense record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async updateExpose(req, res) {
    const { id } = req.params;
    const { categoryName, source, transactionType } = req.body;

    try {
      await db.sequelize.query(
        "CALL manage_expenses('edit', :exposeID, :categoryName, :source, :transactionType)",
        {
          replacements: { exposeID: id, categoryName, source, transactionType }
        }
      );
      return res.status(200).json({
        message: "Expense record updated successfully"
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  /**
   * Delete an expense record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with success/error status
   */
  async deleteExpose(req, res) {
    const { id } = req.params;

    try {
      await db.sequelize.query(
        "CALL manage_expenses('delete', :exposeID, NULL, NULL, NULL)",
        {
          replacements: { exposeID: id }
        }
      );
      return res.status(200).json({
        message: "Expense record deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  }
};

module.exports = {
  PaymentEntryController,
  FinancialReportController,
  PaymentMethodController,
  IncomeController,
  ExposeController
};