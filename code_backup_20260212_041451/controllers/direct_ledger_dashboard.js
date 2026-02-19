const db = require("../models");

/**
 * Direct Ledger Financial Dashboard Controller
 * Bypasses journal entries and accesses general ledger directly
 * Provides immediate financial reporting while journal system is being implemented
 */

const DirectLedgerDashboardController = {
  /**
   * Generate financial dashboard using general ledger data directly
   */
  async getFinancialDashboard(req, res) {
    const { 
      start_date = new Date(new Date().setDate(new Date().getDate() - 29)),
      end_date = new Date()
    } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      console.log('📊 Generating direct ledger financial dashboard for:', { school_id, branch_id, start_date, end_date });
      
      // First, let's check if there's any data in general_ledger for this school
      const dataCheckQuery = `
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN debit_amount > 0 THEN 1 END) as debit_entries,
          COUNT(CASE WHEN credit_amount > 0 THEN 1 END) as credit_entries,
          SUM(debit_amount) as total_debits,
          SUM(credit_amount) as total_credits,
          MIN(transaction_date) as earliest_entry,
          MAX(transaction_date) as latest_entry
        FROM general_ledger 
        WHERE school_id = :school_id
      `;
      
      const [dataCheck] = await db.sequelize.query(dataCheckQuery, { replacements: { school_id } });
      console.log('🔍 General ledger data check for school:', dataCheck[0]);

      // Check data with branch filter if provided
      if (branch_id && branch_id !== '') {
        const branchDataCheckQuery = `
          SELECT 
            COUNT(*) as total_entries,
            SUM(debit_amount) as total_debits,
            SUM(credit_amount) as total_credits
          FROM general_ledger 
          WHERE school_id = :school_id AND branch_id = :branch_id
        `;
        
        const [branchDataCheck] = await db.sequelize.query(branchDataCheckQuery, { replacements: { school_id, branch_id } });
        console.log('🏢 General ledger data check for branch:', branchDataCheck[0]);
      }

      // Get revenue data from general ledger (credit amounts for revenue accounts)
      const revenueQuery = `
        SELECT 
          COALESCE(SUM(gl.credit_amount), 0) as total_revenue,
          COUNT(CASE WHEN gl.credit_amount > 0 THEN 1 END) as revenue_transactions
        FROM general_ledger gl
        LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        WHERE gl.school_id = :school_id 
          AND (:branch_id = '' OR gl.branch_id = :branch_id)
          AND gl.credit_amount > 0 
          AND DATE(gl.transaction_date) BETWEEN :start_date AND :end_date
          AND (coa.account_type = 'REVENUE' OR gl.description LIKE '%fee%' OR gl.description LIKE '%payment%' OR gl.description LIKE '%income%')
      `;

      // Get expense data from general ledger (debit amounts for expense accounts)
      const expenseQuery = `
        SELECT 
          COALESCE(SUM(gl.debit_amount), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN (coa.account_type = 'EXPENSE' AND coa.account_subtype LIKE '%SALARY%') 
                              OR gl.description LIKE '%salary%' 
                              OR gl.description LIKE '%payroll%' 
                              OR gl.description LIKE '%wage%' 
                         THEN gl.debit_amount ELSE 0 END), 0) as payroll_expenses,
          COUNT(CASE WHEN gl.debit_amount > 0 THEN 1 END) as expense_transactions
        FROM general_ledger gl
        LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        WHERE gl.school_id = :school_id 
          AND (:branch_id = '' OR gl.branch_id = :branch_id)
          AND gl.debit_amount > 0 
          AND DATE(gl.transaction_date) BETWEEN :start_date AND :end_date
          AND (coa.account_type = 'EXPENSE' OR gl.description LIKE '%expense%' OR gl.description LIKE '%cost%')
      `;

      // Get cash balance from general ledger (cash accounts)
      const cashBalanceQuery = `
        SELECT 
          COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as cash_balance
        FROM general_ledger gl
        LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        WHERE gl.school_id = :school_id 
          AND (:branch_id = '' OR gl.branch_id = :branch_id)
          AND (coa.account_type = 'ASSET' AND coa.account_subtype = 'CASH' 
               OR gl.description LIKE '%cash%' 
               OR gl.description LIKE '%bank%')
      `;

      // Get asset totals
      const assetQuery = `
        SELECT 
          COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as total_assets
        FROM general_ledger gl
        LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        WHERE gl.school_id = :school_id 
          AND (:branch_id = '' OR gl.branch_id = :branch_id)
          AND (coa.account_type = 'ASSET' OR gl.description LIKE '%asset%')
      `;

      // Get liability totals
      const liabilityQuery = `
        SELECT 
          COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) as total_liabilities
        FROM general_ledger gl
        LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        WHERE gl.school_id = :school_id 
          AND (:branch_id = '' OR gl.branch_id = :branch_id)
          AND (coa.account_type = 'LIABILITY' OR gl.description LIKE '%liability%' OR gl.description LIKE '%payable%')
      `;

      // Get recent transactions from general ledger
      const recentTransactionsQuery = `
        SELECT 
          gl.transaction_date as entry_date,
          gl.description,
          CASE 
            WHEN gl.credit_amount > 0 AND (coa.account_type = 'REVENUE' OR gl.description LIKE '%fee%' OR gl.description LIKE '%payment%') THEN 'STUDENT_PAYMENT'
            WHEN gl.debit_amount > 0 AND (gl.description LIKE '%salary%' OR gl.description LIKE '%payroll%') THEN 'PAYROLL'
            WHEN gl.debit_amount > 0 THEN 'EXPENSE'
            ELSE 'TRANSFER'
          END as reference_type,
          COALESCE(coa.account_name, 'General Account') as account_name,
          gl.debit_amount,
          gl.credit_amount,
          CASE WHEN gl.credit_amount > 0 THEN gl.credit_amount ELSE gl.debit_amount END as total_amount
        FROM general_ledger gl
        LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        WHERE gl.school_id = :school_id 
          AND (:branch_id = '' OR gl.branch_id = :branch_id)
          AND (gl.debit_amount > 0 OR gl.credit_amount > 0)
        ORDER BY gl.transaction_date DESC, gl.ledger_id DESC
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

      console.log('🔍 Executing asset query...');
      const [assetResult] = await db.sequelize.query(assetQuery, { replacements });
      console.log('🏦 Asset result:', assetResult[0]);

      console.log('🔍 Executing liability query...');
      const [liabilityResult] = await db.sequelize.query(liabilityQuery, { replacements });
      console.log('📋 Liability result:', liabilityResult[0]);

      console.log('🔍 Executing recent transactions query...');
      const [recentTransactions] = await db.sequelize.query(recentTransactionsQuery, { replacements });
      console.log('📋 Recent transactions count:', recentTransactions.length);

      const revenue = revenueResult[0] || { total_revenue: 0, revenue_transactions: 0 };
      const expense = expenseResult[0] || { total_expenses: 0, payroll_expenses: 0, expense_transactions: 0 };
      const cashBalance = cashBalanceResult[0] || { cash_balance: 0 };
      const assets = assetResult[0] || { total_assets: 0 };
      const liabilities = liabilityResult[0] || { total_liabilities: 0 };

      // Calculate derived metrics
      const totalRevenue = parseFloat(revenue.total_revenue || 0);
      const totalExpenses = parseFloat(expense.total_expenses || 0);
      const payrollExpenses = parseFloat(expense.payroll_expenses || 0);
      const netIncome = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
      const currentCashBalance = parseFloat(cashBalance.cash_balance || 0);
      const totalAssets = parseFloat(assets.total_assets || 0);
      const totalLiabilities = parseFloat(liabilities.total_liabilities || 0);
      const totalEquity = totalAssets - totalLiabilities;
      const accountsReceivable = totalRevenue * 0.15; // Simplified calculation
      const debtToEquityRatio = totalEquity > 0 ? totalLiabilities / totalEquity : 0;

      console.log('💰 Financial metrics calculated:', {
        totalRevenue,
        totalExpenses,
        payrollExpenses,
        netIncome,
        profitMargin,
        currentCashBalance,
        totalAssets,
        totalLiabilities,
        totalEquity
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
          data_source: 'direct_general_ledger',
          debug_info: {
            total_ledger_entries: dataCheck[0].total_entries,
            total_debits: dataCheck[0].total_debits,
            total_credits: dataCheck[0].total_credits,
            query_parameters: replacements
          }
        }
      };

      console.log('✅ Sending response with data:', responseData.data.key_metrics);
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("❌ Error generating direct ledger financial dashboard:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        data_source: 'direct_general_ledger'
      });
    }
  },

  /**
   * Get income data directly from general ledger
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
          gl.ledger_id as id,
          COALESCE(coa.account_name, 'Revenue') as category,
          gl.credit_amount as amount,
          DATE(gl.transaction_date) as date,
          gl.description,
          'School Operations' as source,
          'Revenue' as transaction_type
        FROM general_ledger gl
        LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        WHERE gl.school_id = :school_id 
          AND (:branch_id = '' OR gl.branch_id = :branch_id)
          AND gl.credit_amount > 0 
          AND DATE(gl.transaction_date) BETWEEN :start_date AND :end_date
          AND (coa.account_type = 'REVENUE' OR gl.description LIKE '%fee%' OR gl.description LIKE '%payment%' OR gl.description LIKE '%income%')
        ORDER BY gl.transaction_date DESC
      `;

      const [incomeData] = await db.sequelize.query(query, {
        replacements: { school_id, branch_id, start_date, end_date }
      });

      return res.status(200).json({
        success: true,
        data: incomeData
      });
    } catch (error) {
      console.error("Error fetching income data from general ledger:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get expense data directly from general ledger
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
          gl.ledger_id as id,
          COALESCE(coa.account_name, 'General Expense') as category,
          gl.debit_amount as amount,
          DATE(gl.transaction_date) as date,
          gl.description,
          'Various' as vendor,
          'Cash' as payment_method
        FROM general_ledger gl
        LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        WHERE gl.school_id = :school_id 
          AND (:branch_id = '' OR gl.branch_id = :branch_id)
          AND gl.debit_amount > 0 
          AND DATE(gl.transaction_date) BETWEEN :start_date AND :end_date
          AND (coa.account_type = 'EXPENSE' OR gl.description LIKE '%expense%' OR gl.description LIKE '%cost%')
        ORDER BY gl.transaction_date DESC
      `;

      const [expenseData] = await db.sequelize.query(query, {
        replacements: { school_id, branch_id, start_date, end_date }
      });

      return res.status(200).json({
        success: true,
        data: expenseData
      });
    } catch (error) {
      console.error("Error fetching expense data from general ledger:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = DirectLedgerDashboardController;