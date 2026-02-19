/**
 * Chart of Accounts API Routes
 * Provides accounting configuration for different item categories
 */

const express = require('express');
const router = express.Router();

// Chart of Accounts configuration endpoint
router.post('/config', async (req, res) => {
  try {
    const { category, school_id } = req.body;
    
    console.log('🔧 Chart of Accounts config requested:', { category, school_id });
    
    // GAAP-compliant chart of accounts configuration
    const configs = {
      'FEES': {
        account_type: 'REVENUE',
        debit_account: '1210', // Accounts Receivable - Students
        credit_account: '4100', // Tuition and Fee Revenue
        debit_account_name: 'Accounts Receivable - Students',
        credit_account_name: 'Tuition and Fee Revenue',
        description: 'Regular tuition fees and academic charges',
        revenue_recognition: 'EARNED'
      },
      'ITEMS': {
        account_type: 'REVENUE',
        debit_account: '1210',
        credit_account: '4200',
        debit_account_name: 'Accounts Receivable - Students',
        credit_account_name: 'Sales Revenue - Educational Materials',
        description: 'Physical educational materials and supplies sold',
        revenue_recognition: 'DELIVERED'
      },
      'DISCOUNT': {
        account_type: 'CONTRA_REVENUE',
        debit_account: '4150',
        credit_account: '1210',
        debit_account_name: 'Student Discounts and Scholarships',
        credit_account_name: 'Accounts Receivable - Students',
        description: 'Discounts and scholarships given to students',
        revenue_recognition: 'IMMEDIATE'
      },
      'FINES': {
        account_type: 'REVENUE',
        debit_account: '1210',
        credit_account: '4300',
        debit_account_name: 'Accounts Receivable - Students',
        credit_account_name: 'Other Revenue - Fines and Penalties',
        description: 'Fines and penalties assessed to students',
        revenue_recognition: 'ASSESSED'
      },
      'PENALTY': {
        account_type: 'REVENUE',
        debit_account: '1210',
        credit_account: '4300',
        debit_account_name: 'Accounts Receivable - Students',
        credit_account_name: 'Other Revenue - Fines and Penalties',
        description: 'Late payment penalties and administrative fees',
        revenue_recognition: 'ASSESSED'
      },
      'REFUND': {
        account_type: 'LIABILITY',
        debit_account: '5250',
        credit_account: '2100',
        debit_account_name: 'Student Refunds Expense',
        credit_account_name: 'Accounts Payable - Student Refunds',
        description: 'Refunds owed to students for overpayments or withdrawals',
        revenue_recognition: 'REVERSAL'
      },
      'OTHER': {
        account_type: 'REVENUE',
        debit_account: '1210',
        credit_account: '4400',
        debit_account_name: 'Accounts Receivable - Students',
        credit_account_name: 'Other Operating Revenue',
        description: 'Miscellaneous charges and other revenue',
        revenue_recognition: 'EARNED'
      }
    };
    
    const config = configs[category] || configs['FEES'];
    
    console.log('✅ Chart of Accounts config returned:', { category, config });
    
    res.json({
      success: true,
      message: 'Chart of accounts configuration retrieved successfully',
      config: config,
      metadata: {
        category: category,
        school_id: school_id,
        gaap_compliant: true,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Chart of Accounts config error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chart of accounts configuration',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all chart of accounts
router.get('/all', async (req, res) => {
  try {
    const { school_id } = req.query;
    
    console.log('🔧 All chart of accounts requested for school:', school_id);
    
    // Standard chart of accounts structure
    const chartOfAccounts = {
      assets: {
        '1000': 'Cash and Cash Equivalents',
        '1100': 'Petty Cash',
        '1200': 'Bank Accounts',
        '1210': 'Accounts Receivable - Students',
        '1220': 'Accounts Receivable - Other',
        '1300': 'Inventory - Educational Materials',
        '1400': 'Prepaid Expenses',
        '1500': 'Fixed Assets',
        '1600': 'Accumulated Depreciation'
      },
      liabilities: {
        '2000': 'Accounts Payable',
        '2100': 'Accounts Payable - Student Refunds',
        '2200': 'Accrued Expenses',
        '2300': 'Deferred Revenue',
        '2400': 'Short-term Loans',
        '2500': 'Long-term Debt'
      },
      equity: {
        '3000': 'Retained Earnings',
        '3100': 'Current Year Earnings',
        '3200': 'Capital Contributions'
      },
      revenue: {
        '4000': 'Operating Revenue',
        '4100': 'Tuition and Fee Revenue',
        '4150': 'Student Discounts and Scholarships',
        '4200': 'Sales Revenue - Educational Materials',
        '4300': 'Other Revenue - Fines and Penalties',
        '4400': 'Other Operating Revenue',
        '4500': 'Non-Operating Revenue'
      },
      expenses: {
        '5000': 'Operating Expenses',
        '5100': 'Salaries and Wages',
        '5200': 'Benefits',
        '5250': 'Student Refunds Expense',
        '5300': 'Utilities',
        '5400': 'Supplies',
        '5500': 'Depreciation',
        '5600': 'Other Operating Expenses'
      }
    };
    
    res.json({
      success: true,
      message: 'Chart of accounts retrieved successfully',
      data: chartOfAccounts,
      metadata: {
        school_id: school_id,
        total_accounts: Object.values(chartOfAccounts).reduce((sum, category) => sum + Object.keys(category).length, 0),
        gaap_compliant: true,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Chart of Accounts retrieval error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chart of accounts',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;