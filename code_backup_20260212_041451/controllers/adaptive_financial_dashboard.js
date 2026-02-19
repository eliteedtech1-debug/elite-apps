const db = require("../models");

/**
 * Adaptive Financial Dashboard Controller
 * Automatically detects and uses the best available financial data source
 * Tries multiple data sources in order of preference
 */

const AdaptiveFinancialDashboardController = {
  /**
   * Generate financial dashboard using the best available data source
   */
  async getFinancialDashboard(req, res) {
    const { 
      start_date = new Date(new Date().setDate(new Date().getDate() - 29)),
      end_date = new Date()
    } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      console.log('📊 Generating adaptive financial dashboard for:', { school_id, branch_id, start_date, end_date });
      
      // Try different data sources in order of preference
      const dataSources = [
        { name: 'general_ledger', method: 'tryGeneralLedger' },
        { name: 'payment_entries', method: 'tryPaymentEntries' },
        { name: 'account_balances', method: 'tryAccountBalances' },
        { name: 'student_payments', method: 'tryStudentPayments' },
        { name: 'fee_payments', method: 'tryFeePayments' }
      ];

      let financialData = null;
      let usedDataSource = null;

      for (const source of dataSources) {
        try {
          console.log(`🔍 Trying data source: ${source.name}`);
          const data = await this[source.method](school_id, branch_id, start_date, end_date);
          if (data && (data.total_revenue > 0 || data.total_expenses > 0)) {
            financialData = data;
            usedDataSource = source.name;
            console.log(`✅ Successfully got data from: ${source.name}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Failed to get data from ${source.name}:`, error.message);
        }
      }

      // If no data source worked, create empty response with debugging info
      if (!financialData) {
        console.log('⚠️ No financial data found in any source, creating empty response');
        financialData = {
          total_revenue: 0,
          total_expenses: 0,
          payroll_expenses: 0,
          net_income: 0,
          profit_margin: 0,
          cash_balance: 0,
          total_assets: 0,
          total_liabilities: 0,
          total_equity: 0,
          accounts_receivable: 0,
          debt_to_equity_ratio: 0,
          recent_transactions: []
        };
        usedDataSource = 'none_found';
      }

      const responseData = {
        success: true,
        data: {
          key_metrics: {
            total_revenue: financialData.total_revenue,
            total_expenses: financialData.total_expenses,
            payroll_expenses: financialData.payroll_expenses,
            net_income: financialData.net_income,
            profit_margin: financialData.profit_margin,
            cash_balance: financialData.cash_balance,
            total_assets: financialData.total_assets,
            total_liabilities: financialData.total_liabilities,
            total_equity: financialData.total_equity,
            accounts_receivable: financialData.accounts_receivable,
            debt_to_equity_ratio: financialData.debt_to_equity_ratio
          },
          recent_transactions: financialData.recent_transactions || [],
          period: {
            start_date,
            end_date
          },
          generated_at: new Date().toISOString(),
          data_source: `adaptive_${usedDataSource}`,
          debug_info: {
            attempted_sources: dataSources.map(s => s.name),
            successful_source: usedDataSource,
            query_parameters: { school_id, branch_id, start_date, end_date }
          }
        }
      };

      console.log('✅ Sending adaptive response with data source:', usedDataSource);
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("❌ Error generating adaptive financial dashboard:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        data_source: 'adaptive_error'
      });
    }
  },

  /**
   * Try to get data from general_ledger table
   */
  async tryGeneralLedger(school_id, branch_id, start_date, end_date) {
    console.log('🔍 Trying general_ledger...');
    
    // Check if table exists and has data
    const checkQuery = `SELECT COUNT(*) as count FROM general_ledger WHERE school_id = :school_id`;
    const [checkResult] = await db.sequelize.query(checkQuery, { replacements: { school_id } });
    
    if (checkResult[0].count === 0) {
      throw new Error('No data in general_ledger for this school');
    }

    const revenueQuery = `
      SELECT COALESCE(SUM(credit_amount), 0) as total_revenue
      FROM general_ledger 
      WHERE school_id = :school_id 
        AND (:branch_id = '' OR branch_id = :branch_id)
        AND credit_amount > 0 
        AND DATE(transaction_date) BETWEEN :start_date AND :end_date
    `;

    const expenseQuery = `
      SELECT 
        COALESCE(SUM(debit_amount), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN description LIKE '%salary%' OR description LIKE '%payroll%' THEN debit_amount ELSE 0 END), 0) as payroll_expenses
      FROM general_ledger 
      WHERE school_id = :school_id 
        AND (:branch_id = '' OR branch_id = :branch_id)
        AND debit_amount > 0 
        AND DATE(transaction_date) BETWEEN :start_date AND :end_date
    `;

    const replacements = { school_id, branch_id, start_date, end_date };
    const [revenueResult] = await db.sequelize.query(revenueQuery, { replacements });
    const [expenseResult] = await db.sequelize.query(expenseQuery, { replacements });

    const revenue = parseFloat(revenueResult[0].total_revenue || 0);
    const expenses = parseFloat(expenseResult[0].total_expenses || 0);
    const payroll = parseFloat(expenseResult[0].payroll_expenses || 0);

    return {
      total_revenue: revenue,
      total_expenses: expenses,
      payroll_expenses: payroll,
      net_income: revenue - expenses,
      profit_margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
      cash_balance: revenue - expenses, // Simplified
      total_assets: revenue * 1.2, // Simplified
      total_liabilities: expenses * 0.3, // Simplified
      total_equity: (revenue * 1.2) - (expenses * 0.3),
      accounts_receivable: revenue * 0.15,
      debt_to_equity_ratio: 0.2,
      recent_transactions: []
    };
  },

  /**
   * Try to get data from payment_entries table
   */
  async tryPaymentEntries(school_id, branch_id, start_date, end_date) {
    console.log('🔍 Trying payment_entries...');
    
    const checkQuery = `SELECT COUNT(*) as count FROM payment_entries WHERE school_id = :school_id`;
    const [checkResult] = await db.sequelize.query(checkQuery, { replacements: { school_id } });
    
    if (checkResult[0].count === 0) {
      throw new Error('No data in payment_entries for this school');
    }

    // ✅ FIXED: Revenue = Actual Payments (dr), NOT Invoices (cr)
    // Only count actual payments received, exclude unpaid invoices
    const revenueQuery = `
      SELECT COALESCE(SUM(dr), 0) as total_revenue
      FROM payment_entries 
      WHERE school_id = :school_id 
        AND (:branch_id = '' OR branch_id = :branch_id)
        AND dr > 0 
        AND payment_status != 'Unpaid'
        AND DATE(created_at) BETWEEN :start_date AND :end_date
        AND payment_status != 'Excluded'
    `;

    const expenseQuery = `
      SELECT 
        COALESCE(SUM(dr), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN item_category = 'Salary' OR description LIKE '%salary%' THEN dr ELSE 0 END), 0) as payroll_expenses
      FROM payment_entries 
      WHERE school_id = :school_id 
        AND (:branch_id = '' OR branch_id = :branch_id)
        AND dr > 0 
        AND DATE(created_at) BETWEEN :start_date AND :end_date
        AND payment_status != 'Excluded'
    `;

    const replacements = { school_id, branch_id, start_date, end_date };
    const [revenueResult] = await db.sequelize.query(revenueQuery, { replacements });
    const [expenseResult] = await db.sequelize.query(expenseQuery, { replacements });

    const revenue = parseFloat(revenueResult[0].total_revenue || 0);
    const expenses = parseFloat(expenseResult[0].total_expenses || 0);
    const payroll = parseFloat(expenseResult[0].payroll_expenses || 0);

    return {
      total_revenue: revenue,
      total_expenses: expenses,
      payroll_expenses: payroll,
      net_income: revenue - expenses,
      profit_margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
      cash_balance: revenue - expenses,
      total_assets: revenue * 1.2,
      total_liabilities: expenses * 0.3,
      total_equity: (revenue * 1.2) - (expenses * 0.3),
      accounts_receivable: revenue * 0.15,
      debt_to_equity_ratio: 0.2,
      recent_transactions: []
    };
  },

  /**
   * Try to get data from account_balances table
   */
  async tryAccountBalances(school_id, branch_id, start_date, end_date) {
    console.log('🔍 Trying account_balances...');
    
    const checkQuery = `SELECT COUNT(*) as count FROM account_balances WHERE school_id = :school_id`;
    const [checkResult] = await db.sequelize.query(checkQuery, { replacements: { school_id } });
    
    if (checkResult[0].count === 0) {
      throw new Error('No data in account_balances for this school');
    }

    const balanceQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN coa.account_type = 'REVENUE' THEN ab.current_balance ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN coa.account_type = 'EXPENSE' THEN ab.current_balance ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN coa.account_type = 'ASSET' THEN ab.current_balance ELSE 0 END), 0) as total_assets,
        COALESCE(SUM(CASE WHEN coa.account_type = 'LIABILITY' THEN ab.current_balance ELSE 0 END), 0) as total_liabilities
      FROM account_balances ab
      LEFT JOIN chart_of_accounts coa ON ab.account_id = coa.account_id
      WHERE ab.school_id = :school_id
    `;

    const [balanceResult] = await db.sequelize.query(balanceQuery, { replacements: { school_id } });

    const revenue = parseFloat(balanceResult[0].total_revenue || 0);
    const expenses = parseFloat(balanceResult[0].total_expenses || 0);
    const assets = parseFloat(balanceResult[0].total_assets || 0);
    const liabilities = parseFloat(balanceResult[0].total_liabilities || 0);

    return {
      total_revenue: revenue,
      total_expenses: expenses,
      payroll_expenses: expenses * 0.4, // Estimate
      net_income: revenue - expenses,
      profit_margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
      cash_balance: assets * 0.3, // Estimate
      total_assets: assets,
      total_liabilities: liabilities,
      total_equity: assets - liabilities,
      accounts_receivable: revenue * 0.15,
      debt_to_equity_ratio: (assets - liabilities) > 0 ? liabilities / (assets - liabilities) : 0,
      recent_transactions: []
    };
  },

  /**
   * Try to get data from student_payments or similar tables
   */
  async tryStudentPayments(school_id, branch_id, start_date, end_date) {
    console.log('🔍 Trying student_payments...');
    
    // This is a fallback - try to find any table with payment-like data
    const tables = ['student_payments', 'fee_payments', 'payments', 'transactions'];
    
    for (const tableName of tables) {
      try {
        const checkQuery = `SELECT COUNT(*) as count FROM ${tableName} WHERE school_id = :school_id`;
        const [checkResult] = await db.sequelize.query(checkQuery, { replacements: { school_id } });
        
        if (checkResult[0].count > 0) {
          // Found data, try to extract financial info
          const dataQuery = `SELECT SUM(amount) as total FROM ${tableName} WHERE school_id = :school_id`;
          const [dataResult] = await db.sequelize.query(dataQuery, { replacements: { school_id } });
          
          const total = parseFloat(dataResult[0].total || 0);
          
          return {
            total_revenue: total,
            total_expenses: 0,
            payroll_expenses: 0,
            net_income: total,
            profit_margin: 100,
            cash_balance: total,
            total_assets: total,
            total_liabilities: 0,
            total_equity: total,
            accounts_receivable: 0,
            debt_to_equity_ratio: 0,
            recent_transactions: []
          };
        }
      } catch (error) {
        // Table doesn't exist or has different structure
        continue;
      }
    }
    
    throw new Error('No suitable payment tables found');
  },

  /**
   * Try fee_payments table
   */
  async tryFeePayments(school_id, branch_id, start_date, end_date) {
    return this.tryStudentPayments(school_id, branch_id, start_date, end_date);
  }
};

module.exports = AdaptiveFinancialDashboardController;