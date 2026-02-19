const db = require("../models");

/**
 * Financial Dashboard Controller
 * Provides financial APIs with query parameter support
 * Handles school_id from query parameters or authentication context
 */

class FinancialDashboardController {
  
  /**
   * Get school_id from query params or user context
   */
  static getSchoolId(req) {
    const { school_id } = req.user;
    if (school_id && school_id !== 'undefined') {
      return school_id;
    }
    return req.user?.school_id;
  }

  /**
   * Financial Dashboard API
   * GET /dashboard?school_id=...&start_date=...&end_date=...
   */
  static async getDashboard(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const school_id = FinancialDashboardController.getSchoolId(req);

      // Get key financial metrics
      const metricsQuery = `
        SELECT
          -- Revenue metrics from payment_entries
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue') THEN pe.cr ELSE 0 END), 0) as total_expected_revenue,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue') THEN pe.dr ELSE 0 END), 0) as total_received_revenue,

          -- Expense metrics
          COALESCE(SUM(CASE WHEN pe.item_category = 'Other Expenditure' THEN pe.dr ELSE 0 END), 0) as other_expenditure,
          COALESCE(SUM(CASE WHEN pe.item_category = 'Salary' THEN pe.dr ELSE 0 END), 0) as payroll_paid,
          COALESCE(SUM(CASE WHEN pe.item_category = 'Salary' THEN pe.cr ELSE 0 END), 0) as payroll_expected,

          -- Outstanding balances
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN (pe.cr - pe.dr) ELSE 0 END), 0) as outstanding_fees,

          -- Payment counts
          COUNT(CASE WHEN pe.dr > 0 AND pe.item_category IN ('Fees', 'Item') THEN 1 END) as payment_count

        FROM payment_entries pe
        WHERE pe.school_id = ?
          AND pe.payment_status != 'Excluded'
          ${start_date && end_date ? 'AND DATE(pe.created_at) BETWEEN ? AND ?' : ''}
      `;

      const params = [school_id];
      if (start_date && end_date) {
        params.push(start_date, end_date);
      }

      let metrics;
      try {
        const result = await db.sequelize.query(metricsQuery, {
          replacements: params,
          type: db.Sequelize.QueryTypes.SELECT
        });
        metrics = result[0] || {};
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in financial dashboard:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      // Calculate derived metrics
      const totalExpenditure = parseFloat(metrics.payroll_paid || 0) + parseFloat(metrics.other_expenditure || 0);
      const netProfit = parseFloat(metrics.total_received_revenue || 0) - totalExpenditure;
      const revenueRealizationRate = metrics.total_expected_revenue > 0
        ? (metrics.total_received_revenue / metrics.total_expected_revenue) * 100
        : 0;

      // Get recent transactions
      const recentTransactionsQuery = `
        SELECT
          pe.ref_no,
          pe.admission_no,
          pe.description,
          pe.dr as amount,
          pe.created_at as transaction_date,
          pe.item_category,
          'Payment' as transaction_type
        FROM payment_entries pe
        WHERE pe.school_id = ?
          AND pe.dr > 0
          AND pe.payment_status != 'Excluded'
        ORDER BY pe.created_at DESC
        LIMIT 10
      `;

      let recentTransactions;
      try {
        const result = await db.sequelize.query(recentTransactionsQuery, {
          replacements: [school_id],
          type: db.Sequelize.QueryTypes.SELECT
        });
        recentTransactions = result;
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in financial dashboard (recent transactions):', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      res.json({
        success: true,
        data: {
          key_metrics: {
            total_expected_revenue: parseFloat(metrics.total_expected_revenue || 0),
            total_received_revenue: parseFloat(metrics.total_received_revenue || 0),
            total_expenditure: totalExpenditure,
            payroll_expenses: parseFloat(metrics.payroll_paid || 0),
            other_expenses: parseFloat(metrics.other_expenditure || 0),
            net_profit: netProfit,
            outstanding_fees: parseFloat(metrics.outstanding_fees || 0),
            revenue_realization_rate: revenueRealizationRate,
            payment_count: parseInt(metrics.payment_count || 0)
          },
          recent_transactions: recentTransactions,
          period: {
            start_date: start_date || 'All time',
            end_date: end_date || 'All time'
          },
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message
      });
    }
  }

  /**
   * Trial Balance API
   * GET /trial-balance?school_id=...&as_of_date=...
   */
  static async getTrialBalance(req, res) {
    try {
      const { as_of_date } = req.query;
      const school_id = FinancialDashboardController.getSchoolId(req);
      const asOfDate = as_of_date || new Date().toISOString().split('T')[0];

      // Generate trial balance from payment_entries
      const query = `
        SELECT 
          CASE 
            WHEN pe.item_category = 'Fees' THEN '4100'
            WHEN pe.item_category = 'Item' THEN '4200'
            WHEN pe.item_category = 'Other Revenue' THEN '4900'
            WHEN pe.item_category = 'Salary' THEN '5100'
            WHEN pe.item_category = 'Other Expenditure' THEN '5900'
            ELSE '1100'
          END as account_code,
          
          CASE 
            WHEN pe.item_category = 'Fees' THEN 'Tuition Fees'
            WHEN pe.item_category = 'Item' THEN 'Other Fees'
            WHEN pe.item_category = 'Other Revenue' THEN 'Other Revenue'
            WHEN pe.item_category = 'Salary' THEN 'Salaries & Wages'
            WHEN pe.item_category = 'Other Expenditure' THEN 'Other Expenses'
            ELSE 'Cash'
          END as account_name,
          
          CASE 
            WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue') THEN 'REVENUE'
            WHEN pe.item_category IN ('Salary', 'Other Expenditure') THEN 'EXPENSE'
            ELSE 'ASSET'
          END as account_type,
          
          CASE 
            WHEN pe.item_category IN ('Salary', 'Other Expenditure') THEN COALESCE(SUM(pe.dr - pe.cr), 0)
            ELSE 0
          END as debit_balance,
          
          CASE 
            WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue') THEN COALESCE(SUM(pe.cr - pe.dr), 0)
            ELSE 0
          END as credit_balance
          
        FROM payment_entries pe
        WHERE pe.school_id = ?
          AND DATE(pe.created_at) <= ?
          AND pe.payment_status != 'Excluded'
        GROUP BY pe.item_category
        HAVING (COALESCE(SUM(pe.dr - pe.cr), 0) != 0 OR COALESCE(SUM(pe.cr - pe.dr), 0) != 0)
        ORDER BY account_code
      `;

      let accounts;
      try {
        const result = await db.sequelize.query(query, {
          replacements: [school_id, asOfDate],
          type: db.Sequelize.QueryTypes.SELECT
        });
        accounts = result;
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in trial balance:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch trial balance data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      // Calculate totals
      const totalDebits = accounts.reduce((sum, account) => sum + parseFloat(account.debit_balance || 0), 0);
      const totalCredits = accounts.reduce((sum, account) => sum + parseFloat(account.credit_balance || 0), 0);

      res.json({
        success: true,
        data: {
          accounts: accounts,
          totals: {
            total_debits: totalDebits,
            total_credits: totalCredits,
            difference: Math.abs(totalDebits - totalCredits),
            is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
          },
          as_of_date: asOfDate,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching trial balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trial balance',
        error: error.message
      });
    }
  }

  /**
   * Balance Sheet API
   * GET /balance-sheet?school_id=...&as_of_date=...
   */
  static async getBalanceSheet(req, res) {
    try {
      const { as_of_date } = req.query;
      const school_id = FinancialDashboardController.getSchoolId(req);
      const asOfDate = as_of_date || new Date().toISOString().split('T')[0];

      // Generate balance sheet from payment_entries
      const query = `
        SELECT 
          'ASSETS' as section,
          'Cash' as account_name,
          '1100' as account_code,
          COALESCE(SUM(pe.dr - pe.cr), 0) as amount
        FROM payment_entries pe
        WHERE pe.school_id = ?
          AND DATE(pe.created_at) <= ?
          AND pe.payment_status != 'Excluded'
          
        UNION ALL
        
        SELECT 
          'ASSETS' as section,
          'Accounts Receivable' as account_name,
          '1200' as account_code,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN (pe.cr - pe.dr) ELSE 0 END), 0) as amount
        FROM payment_entries pe
        WHERE pe.school_id = ?
          AND DATE(pe.created_at) <= ?
          AND pe.payment_status != 'Excluded'
          
        UNION ALL
        
        SELECT 
          'EQUITY' as section,
          'Retained Earnings' as account_name,
          '3100' as account_code,
          COALESCE(SUM(
            CASE WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue') THEN (pe.cr - pe.dr)
                 WHEN pe.item_category IN ('Salary', 'Other Expenditure') THEN -(pe.dr - pe.cr)
                 ELSE 0 END
          ), 0) as amount
        FROM payment_entries pe
        WHERE pe.school_id = ?
          AND DATE(pe.created_at) <= ?
          AND pe.payment_status != 'Excluded'
      `;

      let balanceSheetData;
      try {
        const result = await db.sequelize.query(query, {
          replacements: [school_id, asOfDate, school_id, asOfDate, school_id, asOfDate],
          type: db.Sequelize.QueryTypes.SELECT
        });
        balanceSheetData = result;
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in balance sheet:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch balance sheet data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      // Group by section
      const grouped = balanceSheetData.reduce((acc, account) => {
        if (!acc[account.section]) {
          acc[account.section] = [];
        }
        acc[account.section].push(account);
        return acc;
      }, {});

      // Calculate totals
      const totalAssets = (grouped.ASSETS || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
      const totalLiabilities = (grouped.LIABILITIES || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
      const totalEquity = (grouped.EQUITY || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);

      res.json({
        success: true,
        data: {
          assets: grouped.ASSETS || [],
          liabilities: grouped.LIABILITIES || [],
          equity: grouped.EQUITY || [],
          totals: {
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            total_equity: totalEquity,
            total_liabilities_and_equity: totalLiabilities + totalEquity,
            is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
          },
          as_of_date: asOfDate,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch balance sheet',
        error: error.message
      });
    }
  }

  /**
   * Income Statement API
   * GET /income-statement?school_id=...&start_date=...&end_date=...
   */
  static async getIncomeStatement(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const school_id = FinancialDashboardController.getSchoolId(req);

      // Parse date range - handle comma-separated dates
      let startDate, endDate;
      if (start_date && start_date.includes(',')) {
        [startDate, endDate] = start_date.split(',');
      } else {
        startDate = start_date;
        endDate = end_date;
      }

      const query = `
        SELECT 
          CASE 
            WHEN pe.item_category = 'Fees' THEN 'Tuition Fees'
            WHEN pe.item_category = 'Item' THEN 'Other Fees'
            WHEN pe.item_category = 'Other Revenue' THEN 'Other Revenue'
            WHEN pe.item_category = 'Salary' THEN 'Salaries & Wages'
            WHEN pe.item_category = 'Other Expenditure' THEN 'Other Expenses'
          END as account_name,
          
          CASE 
            WHEN pe.item_category = 'Fees' THEN '4100'
            WHEN pe.item_category = 'Item' THEN '4200'
            WHEN pe.item_category = 'Other Revenue' THEN '4900'
            WHEN pe.item_category = 'Salary' THEN '5100'
            WHEN pe.item_category = 'Other Expenditure' THEN '5900'
          END as account_code,
          
          CASE 
            WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue') THEN 'REVENUE'
            WHEN pe.item_category IN ('Salary', 'Other Expenditure') THEN 'EXPENSE'
          END as account_type,
          
          CASE 
            WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue') THEN COALESCE(SUM(pe.dr), 0)
            WHEN pe.item_category IN ('Salary', 'Other Expenditure') THEN COALESCE(SUM(pe.dr), 0)
            ELSE 0
          END as amount
          
        FROM payment_entries pe
        WHERE pe.school_id = ?
          AND pe.payment_status != 'Excluded'
          ${startDate && endDate ? 'AND DATE(pe.created_at) BETWEEN ? AND ?' : ''}
        GROUP BY pe.item_category
        HAVING amount > 0
        ORDER BY account_type, account_code
      `;

      const params = [school_id];
      if (startDate && endDate) {
        params.push(startDate, endDate);
      }

      let incomeStatementData;
      try {
        const result = await db.sequelize.query(query, {
          replacements: params,
          type: db.Sequelize.QueryTypes.SELECT
        });
        incomeStatementData = result;
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in income statement:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch income statement data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      // Group by account type
      const grouped = incomeStatementData.reduce((acc, account) => {
        if (!acc[account.account_type]) {
          acc[account.account_type] = [];
        }
        acc[account.account_type].push(account);
        return acc;
      }, {});

      // Calculate totals
      const totalRevenue = (grouped.REVENUE || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
      const totalExpenses = (grouped.EXPENSE || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
      const netIncome = totalRevenue - totalExpenses;

      res.json({
        success: true,
        data: {
          revenue: grouped.REVENUE || [],
          expenses: grouped.EXPENSE || [],
          totals: {
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            net_income: netIncome,
            profit_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
          },
          period: {
            start_date: startDate || 'All time',
            end_date: endDate || 'All time'
          },
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching income statement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch income statement',
        error: error.message
      });
    }
  }

  /**
   * Metrics API
   * GET /metrics?start_date=...&end_date=...&branch_id=...
   */
  static async getMetrics(req, res) {
    try {
      const { start_date, end_date, branch_id } = req.query;
      const school_id = FinancialDashboardController.getSchoolId(req);

      const query = `
        SELECT 
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN pe.cr ELSE 0 END), 0) as expected_fees,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN pe.dr ELSE 0 END), 0) as collected_fees,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN (pe.cr - pe.dr) ELSE 0 END), 0) as outstanding_fees,
          COUNT(DISTINCT CASE WHEN pe.item_category IN ('Fees', 'Item') AND pe.dr > 0 THEN pe.admission_no END) as paid_students,
          COUNT(DISTINCT CASE WHEN pe.item_category IN ('Fees', 'Item') AND (pe.cr - pe.dr) > 0 THEN pe.admission_no END) as unpaid_students,
          COALESCE(SUM(CASE WHEN pe.item_category = 'Salary' THEN pe.dr ELSE 0 END), 0) as payroll_expenses,
          COALESCE(SUM(CASE WHEN pe.item_category = 'Other Expenditure' THEN pe.dr ELSE 0 END), 0) as other_expenses
        FROM payment_entries pe
        WHERE pe.school_id = ?
          ${branch_id ? 'AND pe.branch_id = ?' : ''}
          ${start_date && end_date ? 'AND DATE(pe.created_at) BETWEEN ? AND ?' : ''}
          AND pe.payment_status != 'Excluded'
      `;

      const params = [school_id];
      if (branch_id) params.push(branch_id);
      if (start_date && end_date) params.push(start_date, end_date);

      let result;
      try {
        const metrics = await db.sequelize.query(query, {
          replacements: params,
          type: db.Sequelize.QueryTypes.SELECT
        });
        result = metrics[0] || {};
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in metrics:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch metrics data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }
      const collectionRate = result.expected_fees > 0 ? (result.collected_fees / result.expected_fees) * 100 : 0;
      const totalExpenses = parseFloat(result.payroll_expenses || 0) + parseFloat(result.other_expenses || 0);
      const netProfit = parseFloat(result.collected_fees || 0) - totalExpenses;

      res.json({
        success: true,
        data: {
          expected_fees: parseFloat(result.expected_fees || 0),
          collected_fees: parseFloat(result.collected_fees || 0),
          outstanding_fees: parseFloat(result.outstanding_fees || 0),
          collection_rate: collectionRate,
          paid_students: parseInt(result.paid_students || 0),
          unpaid_students: parseInt(result.unpaid_students || 0),
          payroll_expenses: parseFloat(result.payroll_expenses || 0),
          other_expenses: parseFloat(result.other_expenses || 0),
          total_expenses: totalExpenses,
          net_profit: netProfit,
          period: {
            start_date: start_date || 'All time',
            end_date: end_date || 'All time',
            branch_id: branch_id || 'All branches'
          },
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch metrics',
        error: error.message
      });
    }
  }

  /**
   * Payment Trends API
   * GET /payment-trends?start_date=...&end_date=...&branch_id=...
   */
  static async getPaymentTrends(req, res) {
    try {
      const { start_date, end_date, branch_id } = req.query;
      const school_id = FinancialDashboardController.getSchoolId(req);

      const query = `
        SELECT 
          DATE_FORMAT(pe.created_at, '%Y-%m') as month,
          YEAR(pe.created_at) as year,
          MONTH(pe.created_at) as month_num,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN pe.dr ELSE 0 END), 0) as collected_amount,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN pe.cr ELSE 0 END), 0) as expected_amount,
          COUNT(CASE WHEN pe.dr > 0 AND pe.item_category IN ('Fees', 'Item') THEN 1 END) as payment_count
        FROM payment_entries pe
        WHERE pe.school_id = ?
          ${branch_id ? 'AND pe.branch_id = ?' : ''}
          ${start_date && end_date ? 'AND DATE(pe.created_at) BETWEEN ? AND ?' : ''}
          AND pe.payment_status != 'Excluded'
        GROUP BY DATE_FORMAT(pe.created_at, '%Y-%m'), YEAR(pe.created_at), MONTH(pe.created_at)
        ORDER BY year, month_num
      `;

      const params = [school_id];
      if (branch_id) params.push(branch_id);
      if (start_date && end_date) params.push(start_date, end_date);

      let trends;
      try {
        trends = await db.sequelize.query(query, {
          replacements: params,
          type: db.Sequelize.QueryTypes.SELECT
        });
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in payment trends:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment trends data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      // Calculate collection rates and format data
      const formattedTrends = trends.map(trend => ({
        month: trend.month,
        year: trend.year,
        collected_amount: parseFloat(trend.collected_amount || 0),
        expected_amount: parseFloat(trend.expected_amount || 0),
        outstanding_amount: parseFloat(trend.expected_amount || 0) - parseFloat(trend.collected_amount || 0),
        collection_rate: trend.expected_amount > 0 ? (trend.collected_amount / trend.expected_amount) * 100 : 0,
        payment_count: parseInt(trend.payment_count || 0)
      }));

      res.json({
        success: true,
        data: formattedTrends,
        period: {
          start_date: start_date || 'All time',
          end_date: end_date || 'All time',
          branch_id: branch_id || 'All branches'
        },
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching payment trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment trends',
        error: error.message
      });
    }
  }

  /**
   * Classwise Collection API
   * GET /classwise-collection?start_date=...&end_date=...&branch_id=...
   */
  static async getClasswiseCollection(req, res) {
    try {
      const { start_date, end_date, branch_id } = req.query;
      const school_id = FinancialDashboardController.getSchoolId(req);

      const query = `
        SELECT 
          s.class_name,
          s.current_class,
          COUNT(DISTINCT s.admission_no) as total_students,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN pe.cr ELSE 0 END), 0) as expected_amount,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN pe.dr ELSE 0 END), 0) as collected_amount,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item') THEN (pe.cr - pe.dr) ELSE 0 END), 0) as outstanding_amount,
          COUNT(DISTINCT CASE WHEN pe.dr > 0 AND pe.item_category IN ('Fees', 'Item') THEN pe.admission_no END) as paid_students,
          COUNT(DISTINCT CASE WHEN (pe.cr - pe.dr) > 0 AND pe.item_category IN ('Fees', 'Item') THEN pe.admission_no END) as unpaid_students
        FROM students s
        LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no 
          AND pe.school_id = s.school_id
          ${start_date && end_date ? 'AND DATE(pe.created_at) BETWEEN ? AND ?' : ''}
          AND pe.payment_status != 'Excluded'
        WHERE s.school_id = ?
          ${branch_id ? 'AND s.branch_id = ?' : ''}
        GROUP BY s.class_name, s.current_class
        ORDER BY s.class_name
      `;

      const params = [];
      if (start_date && end_date) params.push(start_date, end_date);
      params.push(school_id);
      if (branch_id) params.push(branch_id);

      let classData;
      try {
        classData = await db.sequelize.query(query, {
          replacements: params,
          type: db.Sequelize.QueryTypes.SELECT
        });
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in classwise collection:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch classwise collection data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      // Calculate collection rates
      const formattedData = classData.map(classInfo => ({
        class_name: classInfo.class_name,
        current_class: classInfo.current_class,
        total_students: parseInt(classInfo.total_students || 0),
        expected_amount: parseFloat(classInfo.expected_amount || 0),
        collected_amount: parseFloat(classInfo.collected_amount || 0),
        outstanding_amount: parseFloat(classInfo.outstanding_amount || 0),
        paid_students: parseInt(classInfo.paid_students || 0),
        unpaid_students: parseInt(classInfo.unpaid_students || 0),
        collection_rate: classInfo.expected_amount > 0 ? (classInfo.collected_amount / classInfo.expected_amount) * 100 : 0
      }));

      res.json({
        success: true,
        data: formattedData,
        period: {
          start_date: start_date || 'All time',
          end_date: end_date || 'All time',
          branch_id: branch_id || 'All branches'
        },
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching classwise collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch classwise collection',
        error: error.message
      });
    }
  }

  /**
   * Payment Methods API
   * GET /payment-methods?start_date=...&end_date=...&branch_id=...
   */
  static async getPaymentMethods(req, res) {
    try {
      const { start_date, end_date, branch_id } = req.query;
      const school_id = FinancialDashboardController.getSchoolId(req);

      const query = `
        SELECT 
          COALESCE(pe.payment_mode, 'Cash') as payment_method,
          COALESCE(SUM(pe.dr), 0) as amount,
          COUNT(*) as transaction_count
        FROM payment_entries pe
        WHERE pe.school_id = ?
          ${branch_id ? 'AND pe.branch_id = ?' : ''}
          ${start_date && end_date ? 'AND DATE(pe.created_at) BETWEEN ? AND ?' : ''}
          AND pe.dr > 0
          AND pe.item_category IN ('Fees', 'Item')
          AND pe.payment_status != 'Excluded'
        GROUP BY COALESCE(pe.payment_mode, 'Cash')
        ORDER BY amount DESC
      `;

      const params = [school_id];
      if (branch_id) params.push(branch_id);
      if (start_date && end_date) params.push(start_date, end_date);

      let paymentMethods;
      try {
        paymentMethods = await db.sequelize.query(query, {
          replacements: params,
          type: db.Sequelize.QueryTypes.SELECT
        });
      } catch (queryError) {
        // Check if this is specifically the logger error
        if (queryError.message && (queryError.message.includes('logger.logQueryError is not a function') ||
            typeof queryError.original?.message === 'string' && queryError.original.message.includes('logger.logQueryError is not a function'))) {
          console.error('Database logging error in payment methods:', queryError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment methods data',
            error: 'Database configuration error: Internal logging issue'
          });
        }
        // If it's another error, re-throw it to be caught by the outer catch block
        throw queryError;
      }

      // Calculate percentages
      const totalAmount = paymentMethods.reduce((sum, method) => sum + parseFloat(method.amount || 0), 0);
      const formattedData = paymentMethods.map(method => ({
        payment_method: method.payment_method,
        amount: parseFloat(method.amount || 0),
        transaction_count: parseInt(method.transaction_count || 0),
        percentage: totalAmount > 0 ? (method.amount / totalAmount) * 100 : 0
      }));

      res.json({
        success: true,
        data: formattedData,
        totals: {
          total_amount: totalAmount,
          total_transactions: paymentMethods.reduce((sum, method) => sum + parseInt(method.transaction_count || 0), 0)
        },
        period: {
          start_date: start_date || 'All time',
          end_date: end_date || 'All time',
          branch_id: branch_id || 'All branches'
        },
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment methods',
        error: error.message
      });
    }
  }
}

module.exports = FinancialDashboardController;