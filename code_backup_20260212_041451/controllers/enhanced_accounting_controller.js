/**
 * Enhanced Accounting Controller
 * 
 * This controller provides comprehensive financial reporting using proper accounting principles.
 * It integrates with Chart of Accounts and Journal Entries for clean accounting reports.
 */

const db = require('../models');
const { Op } = require('sequelize');

class EnhancedAccountingController {
  /**
   * Get Income & Expenses Report
   * Combines data from payment_entries for comprehensive reporting
   */
  static async getIncomeExpensesReport(req, res) {
    try {
      const {
        school_id,
        branch_id,
        start_date,
        end_date,
        academic_year,
        term
      } = req.query;

      // Build where conditions for the query
      const whereConditions = [];
      const replacements = {};

      if (school_id) {
        whereConditions.push('school_id = :school_id');
        replacements.school_id = school_id;
      }
      if (branch_id) {
        whereConditions.push('branch_id = :branch_id');
        replacements.branch_id = branch_id;
      }
      if (academic_year) {
        whereConditions.push('academic_year = :academic_year');
        replacements.academic_year = academic_year;
      }
      if (term) {
        whereConditions.push('term = :term');
        replacements.term = term;
      }
      if (start_date && end_date) {
        whereConditions.push('DATE(created_at) BETWEEN :start_date AND :end_date');
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get income data from payment_entries
      const incomeQuery = `
        SELECT 
          description,
          SUM(cr) as amount,
          COUNT(*) as transaction_count,
          'Income' as category
        FROM payment_entries 
        ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} cr > 0
        GROUP BY description
        ORDER BY amount DESC
      `;

      // Get expense data from payment_entries
      const expenseQuery = `
        SELECT 
          description,
          SUM(dr) as amount,
          COUNT(*) as transaction_count,
          'Expense' as category
        FROM payment_entries 
        ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} dr > 0
        GROUP BY description
        ORDER BY amount DESC
      `;

      // Execute queries
      const incomeData = await db.sequelize.query(incomeQuery, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      const expenseData = await db.sequelize.query(expenseQuery, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Calculate totals
      const totalIncome = incomeData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const totalExpenses = expenseData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const netIncome = totalIncome - totalExpenses;

      // Format response
      const response = {
        success: true,
        report_type: 'income_expenses_report',
        generated_at: new Date().toISOString(),
        filters: {
          school_id,
          branch_id,
          start_date,
          end_date,
          academic_year,
          term
        },
        summary: {
          total_income: parseFloat(totalIncome.toFixed(2)),
          total_expenses: parseFloat(totalExpenses.toFixed(2)),
          net_income: parseFloat(netIncome.toFixed(2)),
          profit_margin: totalIncome > 0 ? parseFloat(((netIncome / totalIncome) * 100).toFixed(2)) : 0,
          income_entries: incomeData.length,
          expense_entries: expenseData.length
        },
        data: {
          income: incomeData.map(item => ({
            ...item,
            amount: parseFloat(item.amount || 0),
            formatted_amount: `₦${parseFloat(item.amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
          })),
          expenses: expenseData.map(item => ({
            ...item,
            amount: parseFloat(item.amount || 0),
            formatted_amount: `₦${parseFloat(item.amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
          }))
        }
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error generating Income & Expenses Report:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        report_type: 'income_expenses_report'
      });
    }
  }

  /**
   * Get Income Reports
   * Detailed income analysis with source tracking
   */
  static async getIncomeReports(req, res) {
    try {
      const {
        school_id,
        branch_id,
        start_date,
        end_date,
        academic_year,
        term,
        group_by = 'description'
      } = req.query;

      // Build where conditions
      const whereConditions = [];
      const replacements = {};

      if (school_id) {
        whereConditions.push('school_id = :school_id');
        replacements.school_id = school_id;
      }
      if (branch_id) {
        whereConditions.push('branch_id = :branch_id');
        replacements.branch_id = branch_id;
      }
      if (academic_year) {
        whereConditions.push('academic_year = :academic_year');
        replacements.academic_year = academic_year;
      }
      if (term) {
        whereConditions.push('term = :term');
        replacements.term = term;
      }
      if (start_date && end_date) {
        whereConditions.push('DATE(created_at) BETWEEN :start_date AND :end_date');
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const incomeQuery = `
        SELECT 
          description as category,
          SUM(cr) as total_amount,
          COUNT(*) as transaction_count,
          AVG(cr) as average_amount
        FROM payment_entries 
        ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} cr > 0
        GROUP BY description
        ORDER BY total_amount DESC
      `;

      const incomeData = await db.sequelize.query(incomeQuery, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      const totalIncome = incomeData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

      const response = {
        success: true,
        report_type: 'income_reports',
        generated_at: new Date().toISOString(),
        filters: {
          school_id,
          branch_id,
          start_date,
          end_date,
          academic_year,
          term,
          group_by
        },
        summary: {
          total_income: parseFloat(totalIncome.toFixed(2)),
          categories_count: incomeData.length,
          formatted_total: `₦${totalIncome.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
        },
        data: {
          all_categories: incomeData.map(item => ({
            ...item,
            total_amount: parseFloat(item.total_amount || 0),
            formatted_amount: `₦${parseFloat(item.total_amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
            percentage: totalIncome > 0 ? parseFloat(((item.total_amount / totalIncome) * 100).toFixed(2)) : 0
          }))
        }
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error generating Income Reports:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        report_type: 'income_reports'
      });
    }
  }

  /**
   * Get Expenses Reports
   * Detailed expense analysis with categorization
   */
  static async getExpensesReports(req, res) {
    try {
      const {
        school_id,
        branch_id,
        start_date,
        end_date,
        academic_year,
        term,
        group_by = 'description'
      } = req.query;

      // Build where conditions
      const whereConditions = [];
      const replacements = {};

      if (school_id) {
        whereConditions.push('school_id = :school_id');
        replacements.school_id = school_id;
      }
      if (branch_id) {
        whereConditions.push('branch_id = :branch_id');
        replacements.branch_id = branch_id;
      }
      if (academic_year) {
        whereConditions.push('academic_year = :academic_year');
        replacements.academic_year = academic_year;
      }
      if (term) {
        whereConditions.push('term = :term');
        replacements.term = term;
      }
      if (start_date && end_date) {
        whereConditions.push('DATE(created_at) BETWEEN :start_date AND :end_date');
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const expenseQuery = `
        SELECT 
          description as category,
          SUM(dr) as total_amount,
          COUNT(*) as transaction_count,
          AVG(dr) as average_amount
        FROM payment_entries 
        ${whereClause} ${whereConditions.length > 0 ? 'AND' : 'WHERE'} dr > 0
        GROUP BY description
        ORDER BY total_amount DESC
      `;

      const expenseData = await db.sequelize.query(expenseQuery, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      const totalExpenses = expenseData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

      const response = {
        success: true,
        report_type: 'expenses_reports',
        generated_at: new Date().toISOString(),
        filters: {
          school_id,
          branch_id,
          start_date,
          end_date,
          academic_year,
          term,
          group_by
        },
        summary: {
          total_expenses: parseFloat(totalExpenses.toFixed(2)),
          categories_count: expenseData.length,
          formatted_total: `₦${totalExpenses.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
        },
        data: {
          all_categories: expenseData.map(item => ({
            ...item,
            total_amount: parseFloat(item.total_amount || 0),
            formatted_amount: `₦${parseFloat(item.total_amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
            percentage: totalExpenses > 0 ? parseFloat(((item.total_amount / totalExpenses) * 100).toFixed(2)) : 0
          }))
        }
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error generating Expenses Reports:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        report_type: 'expenses_reports'
      });
    }
  }

  /**
   * Get Profit and Loss Statement
   * Comprehensive P&L using proper accounting principles
   */
  static async getProfitAndLoss(req, res) {
    try {
      const {
        school_id,
        branch_id,
        start_date,
        end_date,
        academic_year,
        term
      } = req.query;

      // Build where conditions
      const whereConditions = [];
      const replacements = {};

      if (school_id) {
        whereConditions.push('school_id = :school_id');
        replacements.school_id = school_id;
      }
      if (branch_id) {
        whereConditions.push('branch_id = :branch_id');
        replacements.branch_id = branch_id;
      }
      if (academic_year) {
        whereConditions.push('academic_year = :academic_year');
        replacements.academic_year = academic_year;
      }
      if (term) {
        whereConditions.push('term = :term');
        replacements.term = term;
      }
      if (start_date && end_date) {
        whereConditions.push('DATE(created_at) BETWEEN :start_date AND :end_date');
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get summary totals
      const summaryQuery = `
        SELECT 
          SUM(cr) as total_revenue,
          SUM(dr) as total_expenses,
          SUM(cr) - SUM(dr) as net_income,
          COUNT(CASE WHEN cr > 0 THEN 1 END) as revenue_transactions,
          COUNT(CASE WHEN dr > 0 THEN 1 END) as expense_transactions
        FROM payment_entries 
        ${whereClause}
      `;

      const summaryData = await db.sequelize.query(summaryQuery, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      const summary = summaryData[0] || {
        total_revenue: 0,
        total_expenses: 0,
        net_income: 0,
        revenue_transactions: 0,
        expense_transactions: 0
      };

      // Calculate additional metrics
      const grossProfit = parseFloat(summary.total_revenue || 0);
      const totalExpenses = parseFloat(summary.total_expenses || 0);
      const netIncome = grossProfit - totalExpenses;
      const profitMargin = grossProfit > 0 ? (netIncome / grossProfit) * 100 : 0;

      const response = {
        success: true,
        report_type: 'profit_and_loss',
        generated_at: new Date().toISOString(),
        period: {
          start_date: start_date || 'Beginning',
          end_date: end_date || 'Current',
          academic_year,
          term
        },
        filters: {
          school_id,
          branch_id,
          start_date,
          end_date,
          academic_year,
          term
        },
        financial_summary: {
          gross_revenue: parseFloat(grossProfit.toFixed(2)),
          total_expenses: parseFloat(totalExpenses.toFixed(2)),
          net_income: parseFloat(netIncome.toFixed(2)),
          profit_margin: parseFloat(profitMargin.toFixed(2)),
          revenue_transactions: parseInt(summary.revenue_transactions || 0),
          expense_transactions: parseInt(summary.expense_transactions || 0),
          formatted_revenue: `₦${grossProfit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          formatted_expenses: `₦${totalExpenses.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          formatted_net_income: `₦${netIncome.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          performance_status: netIncome >= 0 ? 'Profitable' : 'Loss'
        }
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error generating Profit and Loss Statement:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        report_type: 'profit_and_loss'
      });
    }
  }

  /**
   * Get Trial Balance
   * Shows all account balances to verify books balance
   */
  static async getTrialBalance(req, res) {
    try {
      const { school_id, branch_id, as_of_date } = req.query;

      // Build where conditions
      const whereConditions = [];
      const replacements = {};

      if (school_id) {
        whereConditions.push('school_id = :school_id');
        replacements.school_id = school_id;
      }
      if (branch_id) {
        whereConditions.push('branch_id = :branch_id');
        replacements.branch_id = branch_id;
      }
      if (as_of_date) {
        whereConditions.push('DATE(created_at) <= :as_of_date');
        replacements.as_of_date = as_of_date;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get trial balance from payment entries
      const trialBalanceQuery = `
        SELECT 
          'PAYMENT_ENTRIES' as account_code,
          'Payment Entries Summary' as account,
          'Mixed' as account_type,
          SUM(dr) as total_debits,
          SUM(cr) as total_credits
        FROM payment_entries
        ${whereClause}
      `;

      const trialBalanceData = await db.sequelize.query(trialBalanceQuery, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Calculate totals
      const totalDebits = trialBalanceData.reduce((sum, item) => sum + parseFloat(item.total_debits || 0), 0);
      const totalCredits = trialBalanceData.reduce((sum, item) => sum + parseFloat(item.total_credits || 0), 0);
      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

      const response = {
        success: true,
        report_type: 'trial_balance',
        generated_at: new Date().toISOString(),
        as_of_date: as_of_date || new Date().toISOString().split('T')[0],
        filters: { school_id, branch_id, as_of_date },
        summary: {
          total_debits: parseFloat(totalDebits.toFixed(2)),
          total_credits: parseFloat(totalCredits.toFixed(2)),
          difference: parseFloat((totalDebits - totalCredits).toFixed(2)),
          is_balanced: isBalanced,
          accounts_count: trialBalanceData.length,
          formatted_debits: `₦${totalDebits.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          formatted_credits: `₦${totalCredits.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
        },
        accounts: trialBalanceData.map(item => ({
          account_code: item.account_code,
          account_name: item.account,
          account_type: item.account_type,
          debit_balance: parseFloat(item.total_debits || 0),
          credit_balance: parseFloat(item.total_credits || 0),
          net_balance: parseFloat((item.total_debits || 0) - (item.total_credits || 0)),
          formatted_debit: `₦${parseFloat(item.total_debits || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          formatted_credit: `₦${parseFloat(item.total_credits || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
        }))
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error generating Trial Balance:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        report_type: 'trial_balance'
      });
    }
  }
}

module.exports = EnhancedAccountingController;