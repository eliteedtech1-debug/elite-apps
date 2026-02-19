const db = require("../models");

/**
 * Simplified Financial Dashboard Controller with Enhanced Debugging
 * Uses payment_entries table directly for financial reporting
 * Temporary solution until full accounting system is implemented
 */

const SimplifiedFinancialDashboardController = {
  /**
   * Generate financial dashboard using payment_entries data
   */
  async getFinancialDashboard(req, res) {
    const { 
      start_date = new Date(new Date().setDate(new Date().getDate() - 29)),
      end_date = new Date()
    } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      console.log('📊 Generating simplified financial dashboard for:', { school_id, branch_id, start_date, end_date });
      
      // First, let's check if there's any data in payment_entries for this school
      const dataCheckQuery = `
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN cr > 0 THEN 1 END) as credit_entries,
          COUNT(CASE WHEN dr > 0 THEN 1 END) as debit_entries,
          SUM(cr) as total_credits,
          SUM(dr) as total_debits,
          MIN(created_at) as earliest_entry,
          MAX(created_at) as latest_entry
        FROM payment_entries 
        WHERE school_id = :school_id
      `;
      
      const [dataCheck] = await db.sequelize.query(dataCheckQuery, { replacements: { school_id } });
      console.log('🔍 Payment entries data check for school:', dataCheck[0]);

      // Check data with branch filter
      if (branch_id && branch_id !== '') {
        const branchDataCheckQuery = `
          SELECT 
            COUNT(*) as total_entries,
            COUNT(CASE WHEN cr > 0 THEN 1 END) as credit_entries,
            COUNT(CASE WHEN dr > 0 THEN 1 END) as debit_entries,
            SUM(cr) as total_credits,
            SUM(dr) as total_debits
          FROM payment_entries 
          WHERE school_id = :school_id AND branch_id = :branch_id
        `;
        
        const [branchDataCheck] = await db.sequelize.query(branchDataCheckQuery, { replacements: { school_id, branch_id } });
        console.log('🏢 Payment entries data check for branch:', branchDataCheck[0]);
      }

      // Check data within date range
      const dateRangeCheckQuery = `
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN cr > 0 THEN 1 END) as credit_entries,
          COUNT(CASE WHEN dr > 0 THEN 1 END) as debit_entries,
          SUM(cr) as total_credits,
          SUM(dr) as total_debits
        FROM payment_entries 
        WHERE school_id = :school_id 
          AND (:branch_id = '' OR branch_id = :branch_id)
          AND DATE(created_at) BETWEEN :start_date AND :end_date
      `;
      
      const [dateRangeCheck] = await db.sequelize.query(dateRangeCheckQuery, { replacements: { school_id, branch_id, start_date, end_date } });
      console.log('📅 Payment entries data check for date range:', dateRangeCheck[0]);

      // Get revenue data from payment_entries (actual payments received)
      // ✅ FIXED: Revenue = Actual Payments (dr), NOT Invoices (cr)
      // Only count actual payments received, exclude unpaid invoices
      const revenueQuery = `
        SELECT 
          COALESCE(SUM(dr), 0) as total_revenue,
          COUNT(CASE WHEN dr > 0 AND payment_status != 'Unpaid' THEN 1 END) as revenue_transactions
        FROM payment_entries 
        WHERE school_id = :school_id 
          AND (:branch_id = '' OR branch_id = :branch_id)
          AND dr > 0 
          AND payment_status != 'Unpaid'
          AND DATE(created_at) BETWEEN :start_date AND :end_date
          AND payment_status != 'Excluded'
      `;

      // Get expense data from payment_entries (debit entries)
      const expenseQuery = `
        SELECT 
          COALESCE(SUM(dr), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN item_category = 'Salary' OR description LIKE '%salary%' OR description LIKE '%payroll%' THEN dr ELSE 0 END), 0) as payroll_expenses,
          COUNT(CASE WHEN dr > 0 THEN 1 END) as expense_transactions
        FROM payment_entries 
        WHERE school_id = :school_id 
          AND (:branch_id = '' OR branch_id = :branch_id)
          AND dr > 0 
          AND DATE(created_at) BETWEEN :start_date AND :end_date
          AND payment_status != 'Excluded'
      `;

      // Get cash balance (simplified calculation)
      const cashBalanceQuery = `
        SELECT 
          COALESCE(SUM(cr - dr), 0) as cash_balance
        FROM payment_entries 
        WHERE school_id = :school_id 
          AND (:branch_id = '' OR branch_id = :branch_id)
          AND payment_status != 'Excluded'
      `;

      // Get recent transactions (only actual payments/expenses, NOT unpaid invoices)
      // ✅ FIXED: Only show actual transactions (dr > 0), exclude unpaid invoices (cr > 0 AND dr = 0)
      const recentTransactionsQuery = `
        SELECT 
          created_at as entry_date,
          description,
          item_category,
          CASE 
            WHEN item_category IN ('Fees', 'Item', 'Other Revenue') AND dr > 0 THEN 'STUDENT_PAYMENT'
            WHEN item_category = 'Salary' THEN 'PAYROLL'
            WHEN dr > 0 THEN 'EXPENSE'
            ELSE 'OTHER'
          END as reference_type,
          CASE 
            WHEN item_category IN ('Fees', 'Item', 'Other Revenue') AND dr > 0 THEN 'Revenue Account'
            WHEN item_category = 'Salary' THEN 'Salary Account'
            WHEN dr > 0 THEN 'Expense Account'
            ELSE 'Other Account'
          END as account_name,
          dr as debit_amount,
          cr as credit_amount,
          dr as total_amount
        FROM payment_entries 
        WHERE school_id = :school_id 
          AND (:branch_id = '' OR branch_id = :branch_id)
          AND dr > 0
          AND payment_status != 'Excluded'
          AND payment_status != 'Unpaid'
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const replacements = { school_id, branch_id, start_date, end_date };
      console.log('🔧 Query replacements:', replacements);

      // Execute all queries
      console.log('🔍 Executing revenue query...');
      const [revenueResult] = await db.sequelize.query(revenueQuery, { replacements });
      console.log('💰 Revenue result:', revenueResult[0]);

      console.log('🔍 Executing expense query...');
      const [expenseResult] = await db.sequelize.query(expenseQuery, { replacements });
      console.log('💸 Expense result:', expenseResult[0]);

      console.log('🔍 Executing cash balance query...');
      const [cashBalanceResult] = await db.sequelize.query(cashBalanceQuery, { replacements });
      console.log('💵 Cash balance result:', cashBalanceResult[0]);

      console.log('🔍 Executing recent transactions query...');
      const [recentTransactions] = await db.sequelize.query(recentTransactionsQuery, { replacements });
      console.log('📋 Recent transactions count:', recentTransactions.length);

      const revenue = revenueResult[0] || { total_revenue: 0, revenue_transactions: 0 };
      const expense = expenseResult[0] || { total_expenses: 0, payroll_expenses: 0, expense_transactions: 0 };
      const cashBalance = cashBalanceResult[0] || { cash_balance: 0 };

      // Calculate derived metrics
      const totalRevenue = parseFloat(revenue.total_revenue || 0);
      const totalExpenses = parseFloat(expense.total_expenses || 0);
      const payrollExpenses = parseFloat(expense.payroll_expenses || 0);
      const netIncome = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
      const currentCashBalance = parseFloat(cashBalance.cash_balance || 0);

      // Simplified asset/liability calculations (for demo purposes)
      const totalAssets = Math.max(currentCashBalance, 0) + (totalRevenue * 0.1); // Simplified
      const totalLiabilities = Math.max(totalExpenses * 0.2, 0); // Simplified
      const totalEquity = totalAssets - totalLiabilities;
      const accountsReceivable = totalRevenue * 0.15; // Simplified
      const debtToEquityRatio = totalEquity > 0 ? totalLiabilities / totalEquity : 0;

      console.log('💰 Financial metrics calculated:', {
        totalRevenue,
        totalExpenses,
        payrollExpenses,
        netIncome,
        profitMargin,
        currentCashBalance
      });

      const responseData = {
        success: true,
        data: {
          key_metrics: {
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            payroll_expenses: payrollExpenses,
            net_income: netIncome,
            profit_margin: profitMargin,
            cash_balance: currentCashBalance,
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            total_equity: totalEquity,
            accounts_receivable: accountsReceivable,
            debt_to_equity_ratio: debtToEquityRatio
          },
          recent_transactions: recentTransactions || [],
          period: {
            start_date,
            end_date
          },
          generated_at: new Date().toISOString(),
          data_source: 'simplified_payment_entries',
          debug_info: {
            total_entries_in_db: dataCheck[0].total_entries,
            entries_in_date_range: dateRangeCheck[0].total_entries,
            query_parameters: replacements
          }
        }
      };

      console.log('✅ Sending response with data:', responseData.data.key_metrics);
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("❌ Error generating simplified financial dashboard:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        data_source: 'simplified_payment_entries'
      });
    }
  },

  /**
   * Get income data from payment_entries
   */
  async getIncomeData(req, res) {
    const { 
      start_date = new Date(new Date().setDate(new Date().getDate() - 29)),
      end_date = new Date()
    } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      const query = `
        SELECT 
          item_id as id,
          description as category,
          cr as amount,
          DATE(created_at) as date,
          description,
          'School Operations' as source,
          'Revenue' as transaction_type
        FROM payment_entries 
        WHERE school_id = :school_id 
          AND (:branch_id = '' OR branch_id = :branch_id)
          AND cr > 0 
          AND DATE(created_at) BETWEEN :start_date AND :end_date
          AND payment_status != 'Excluded'
        ORDER BY created_at DESC
      `;

      const [incomeData] = await db.sequelize.query(query, {
        replacements: { school_id, branch_id, start_date, end_date }
      });

      return res.status(200).json({
        success: true,
        data: incomeData
      });
    } catch (error) {
      console.error("Error fetching income data:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get expense data from payment_entries
   */
  async getExpenseData(req, res) {
    const { 
      start_date = new Date(new Date().setDate(new Date().getDate() - 29)),
      end_date = new Date()
    } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      const query = `
        SELECT 
          item_id as id,
          COALESCE(item_category, 'General Expense') as category,
          dr as amount,
          DATE(created_at) as date,
          description,
          'Various' as vendor,
          payment_mode as payment_method
        FROM payment_entries 
        WHERE school_id = :school_id 
          AND (:branch_id = '' OR branch_id = :branch_id)
          AND dr > 0 
          AND DATE(created_at) BETWEEN :start_date AND :end_date
          AND payment_status != 'Excluded'
        ORDER BY created_at DESC
      `;

      const [expenseData] = await db.sequelize.query(query, {
        replacements: { school_id, branch_id, start_date, end_date }
      });

      return res.status(200).json({
        success: true,
        data: expenseData
      });
    } catch (error) {
      console.error("Error fetching expense data:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = SimplifiedFinancialDashboardController;