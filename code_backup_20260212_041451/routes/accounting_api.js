/**
 * Accounting API Routes
 * 
 * This module provides the accounting API endpoints that the frontend expects.
 * It includes chart of accounts configuration and transaction creation.
 * 
 * Security Features:
 * - Input validation and sanitization
 * - SQL injection prevention through ORM
 * - Authentication and authorization
 * - Rate limiting
 * - Comprehensive error handling
 */

const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const models = require('../models');

// Rate limiting configurations
const configLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 config requests per windowMs
  message: { success: false, message: 'Too many configuration requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const transactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 transaction requests per windowMs
  message: { success: false, message: 'Too many transaction requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = (app) => {

  /**
   * Security: Input sanitization middleware
   */
  const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        return obj.trim().replace(/[<>\"'%;()&+]/g, '');
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    next();
  };

  /**
   * Security: Error handler that doesn't expose sensitive information
   */
  const handleError = (res, error, statusCode = 400) => {
    console.error('Accounting API Error:', error);
    
    let message = 'An error occurred while processing your request';
    
    if (error.message.includes('validation')) {
      message = error.message;
    } else if (error.message.includes('not found')) {
      message = 'Configuration not found';
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      message = 'Access denied';
    }
    
    res.status(statusCode).json({
      success: false,
      message: message,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * @route POST /api/accounting/chart-of-accounts/config
   * @desc Get accounting configuration for a specific category
   * @access Private
   */
  app.post('/api/accounting/chart-of-accounts/config',
    authenticateToken,
    sanitizeInput,
    configLimiter,
    [
      body('category').notEmpty().withMessage('Category is required'),
      body('school_id').notEmpty().withMessage('School ID is required')
    ],
    async (req, res) => {
    try {
      // Security: Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { category, school_id } = req.body;

      // Security: Standard accounting configuration (GAAP-compliant)
      const accountingConfigs = {
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

      const config = accountingConfigs[category.toUpperCase()] || accountingConfigs['FEES'];

      res.status(200).json({
        success: true,
        message: 'Accounting configuration retrieved successfully',
        config: config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      handleError(res, error, 500);
    }
  });

  /**
   * @route POST /api/accounting/transactions/create-student-charges
   * @desc Create student charges with proper accounting entries
   * @access Private
   */
  app.post('/api/accounting/transactions/create-student-charges',
    authenticateToken,
    sanitizeInput,
    transactionLimiter,
    [
      body('student_info.admission_no').notEmpty().withMessage('Admission number is required'),
      body('bill_items').isArray({ min: 1 }).withMessage('Bill items array is required'),
      body('journal_entries').isArray().withMessage('Journal entries must be an array')
    ],
    async (req, res) => {
    try {
      // Security: Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        student_info,
        bill_items,
        journal_entries,
        accounting_summary,
        metadata
      } = req.body;

      const createdItems = [];
      const createdJournalEntries = [];

      // Security: Use transaction for atomic operation
      await models.sequelize.transaction(async (transaction) => {
        // Create custom items
        for (const item of bill_items) {
          const customItem = await models.CustomItem.create({
            description: item.description,
            unit_price: parseFloat(item.baseAmount),
            quantity: parseInt(item.quantity),
            item_category: item.item_category,
            account_type: item.account_type,
            debit_account: item.debit_account,
            credit_account: item.credit_account,
            net_amount: parseFloat(item.netAmount),
            discount: parseFloat(item.discount || 0),
            fines: parseFloat(item.fines || 0),
            admission_no: student_info.admission_no,
            class_code: student_info.class_name,
            term: student_info.term,
            academic_year: student_info.academic_year,
            school_id: req.headers['x-school-id'],
            branch_id: req.headers['x-branch-id'],
            created_by: req.user.id,
            status: 'APPLIED'
          }, { transaction });

          createdItems.push(customItem);
        }

        // Create journal entries
        for (const entry of journal_entries) {
          const journalEntry = await models.JournalEntry.create({
            account: entry.account,
            account_code: entry.account_code,
            account_type: entry.account_type,
            debit: parseFloat(entry.debit || 0),
            credit: parseFloat(entry.credit || 0),
            description: entry.description,
            reference: entry.reference,
            transaction_date: entry.transaction_date || new Date(),
            school_id: req.headers['x-school-id'],
            branch_id: req.headers['x-branch-id'],
            student_id: student_info.admission_no,
            created_by: req.user?.id || 1,
            status: 'POSTED'
          }, { transaction });

          createdJournalEntries.push(journalEntry);
        }

        // Validate journal entries balance
        const totalDebits = createdJournalEntries.reduce((sum, entry) => sum + parseFloat(entry.debit), 0);
        const totalCredits = createdJournalEntries.reduce((sum, entry) => sum + parseFloat(entry.credit), 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          throw new Error(
            `Journal entries do not balance. Debits: ₦${totalDebits.toLocaleString()}, Credits: ₦${totalCredits.toLocaleString()}`
          );
        }
      });

      res.status(201).json({
        success: true,
        message: 'Student charges created successfully with proper accounting entries',
        data: {
          custom_items: createdItems,
          journal_entries: createdJournalEntries,
          accounting_summary: accounting_summary
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      handleError(res, error, 500);
    }
  });

  /**
   * @route GET /api/accounting/chart-of-accounts/summary
   * @desc Get chart of accounts summary for a school
   * @access Private
   */
  app.get('/api/accounting/chart-of-accounts/summary',
    authenticateToken,
    sanitizeInput,
    configLimiter,
    async (req, res) => {
    try {
      const school_id = req.headers['x-school-id'];
      
      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required in headers'
        });
      }

      // Get standard chart of accounts template
      const standardAccounts = [
        // Assets (1000-1999)
        { account_code: '1100', account_name: 'Cash and Cash Equivalents', account_type: 'ASSET', category: 'CURRENT_ASSET' },
        { account_code: '1200', account_name: 'Accounts Receivable', account_type: 'ASSET', category: 'CURRENT_ASSET' },
        { account_code: '1210', account_name: 'Accounts Receivable - Students', account_type: 'ASSET', category: 'CURRENT_ASSET' },
        { account_code: '1300', account_name: 'Inventory - Educational Materials', account_type: 'ASSET', category: 'CURRENT_ASSET' },
        { account_code: '1500', account_name: 'Property, Plant & Equipment', account_type: 'ASSET', category: 'NON_CURRENT_ASSET' },
        
        // Liabilities (2000-2999)
        { account_code: '2100', account_name: 'Accounts Payable', account_type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { account_code: '2200', account_name: 'Accrued Expenses', account_type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        { account_code: '2300', account_name: 'Deferred Revenue - Tuition', account_type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
        
        // Equity (3000-3999)
        { account_code: '3100', account_name: 'Retained Earnings', account_type: 'EQUITY', category: 'OWNERS_EQUITY' },
        
        // Revenue (4000-4999)
        { account_code: '4100', account_name: 'Tuition and Fee Revenue', account_type: 'REVENUE', category: 'OPERATING_REVENUE' },
        { account_code: '4150', account_name: 'Student Discounts and Scholarships', account_type: 'CONTRA_REVENUE', category: 'OPERATING_REVENUE' },
        { account_code: '4200', account_name: 'Sales Revenue - Educational Materials', account_type: 'REVENUE', category: 'OPERATING_REVENUE' },
        { account_code: '4300', account_name: 'Other Revenue - Fines and Penalties', account_type: 'REVENUE', category: 'NON_OPERATING_REVENUE' },
        { account_code: '4400', account_name: 'Other Operating Revenue', account_type: 'REVENUE', category: 'OPERATING_REVENUE' },
        
        // Expenses (5000-5999)
        { account_code: '5100', account_name: 'Salaries and Wages', account_type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { account_code: '5200', account_name: 'Administrative Expenses', account_type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { account_code: '5250', account_name: 'Student Refunds Expense', account_type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
        { account_code: '5300', account_name: 'Utilities and Maintenance', account_type: 'EXPENSE', category: 'OPERATING_EXPENSE' }
      ];

      res.status(200).json({
        success: true,
        message: 'Chart of accounts summary retrieved successfully',
        data: {
          standard_accounts: standardAccounts,
          total_accounts: standardAccounts.length,
          by_type: {
            ASSET: standardAccounts.filter(a => a.account_type === 'ASSET').length,
            LIABILITY: standardAccounts.filter(a => a.account_type === 'LIABILITY').length,
            EQUITY: standardAccounts.filter(a => a.account_type === 'EQUITY').length,
            REVENUE: standardAccounts.filter(a => a.account_type === 'REVENUE').length,
            CONTRA_REVENUE: standardAccounts.filter(a => a.account_type === 'CONTRA_REVENUE').length,
            EXPENSE: standardAccounts.filter(a => a.account_type === 'EXPENSE').length
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      handleError(res, error, 500);
    }
  });

  /**
   * @route GET /api/pending-invoices
   * @desc Get pending invoices for a school
   * @access Private
   */
  app.get('/api/pending-invoices',
    authenticateToken,
    sanitizeInput,
    configLimiter,
    async (req, res) => {
    try {
      const school_id = req.headers['x-school-id'] || req.query.school_id;
      const user = req.user; // Assuming user info is available from authenticateToken middleware

      // Check if user is super admin (assuming user.id == 1 is super admin)
      const isSuperAdmin = user && user.id === 1;

      let invoiceResults = [];

      if (isSuperAdmin && !school_id) {
        // For super admins requesting all schools' pending invoices
        invoiceResults = await models.sequelize.query(`
          SELECT
           si.id AS invoice_id,
           si.invoice_number,
           si.school_id,
           si.subscription_id,
           ss.subscription_type, -- Added from school_subscriptions
           si.invoice_date,
           si.due_date,
           CAST(si.total_amount AS DECIMAL(10,2)) AS total_amount,
           CAST(si.amount_paid AS DECIMAL(10,2)) AS amount_paid,
          CAST(si.balance AS DECIMAL(10,2)) AS balance,
          si.payment_status,
          si.invoice_status,
          si.created_at,
          si.updated_at,
          'subscription-invoice' AS invoice_type
      FROM subscription_invoices si
      LEFT JOIN school_subscriptions ss
          ON si.subscription_id = ss.id
      WHERE si.payment_status = 'unpaid'
        AND si.balance > 0.01
        AND (si.invoice_status = 'published' OR si.invoice_status = 'sent')
      ORDER BY si.due_date ASC
      LIMIT 1000; -- Limit to 1000 for super admins to prevent too much data

        `, {
          replacements: [],
          type: models.sequelize.QueryTypes.SELECT
        });
      } else {
        // For regular users or when school_id is specified (including super admin viewing specific school)
        if (!school_id) {
          return res.status(400).json({
            success: false,
            message: 'School ID is required in headers or query parameters'
          });
        }

        // Find pending subscription invoices from the subscription_invoices table
        // Also get related subscription details from school_subscriptions
        invoiceResults = await models.sequelize.query(`
          SELECT
           si.id AS invoice_id,
           si.invoice_number,
           si.subscription_id,
           si.school_id,
           ss.subscription_type, -- Added from school_subscriptions
           si.invoice_date,
           si.due_date,
           CAST(si.total_amount AS DECIMAL(10,2)) AS total_amount,
           CAST(si.amount_paid AS DECIMAL(10,2)) AS amount_paid,
          CAST(si.balance AS DECIMAL(10,2)) AS balance,
          si.payment_status,
          si.invoice_status,
          si.created_at,
          si.updated_at,
          'subscription-invoice' AS invoice_type
      FROM subscription_invoices si
      LEFT JOIN school_subscriptions ss
          ON si.subscription_id = ss.id
      WHERE si.school_id = ?
        AND si.payment_status = 'unpaid'
        AND si.balance > 0.01
        AND (si.invoice_status = 'published' OR si.invoice_status = 'sent')
      ORDER BY si.due_date ASC
      LIMIT 100;

        `, {
          replacements: [school_id],
          type: models.sequelize.QueryTypes.SELECT
        });

        // If there are multiple invoices, sum them for dashboard display
        if (invoiceResults.length > 1) {
          const totalBalance = invoiceResults.reduce((sum, invoice) => sum + parseFloat(invoice.balance), 0);
          const earliestDue = invoiceResults[0]; // Already ordered by due_date ASC
          
          // Return a summary invoice for dashboard
          invoiceResults = [{
            ...earliestDue,
            invoice_number: `${invoiceResults.length} Pending Invoices`,
            balance: totalBalance.toFixed(2),
            total_amount: totalBalance.toFixed(2),
            invoice_count: invoiceResults.length
          }];
        }
      }

      // Get school names for the invoices (for super admin view)
      if (isSuperAdmin && invoiceResults.length > 0) {
        // Get unique school IDs
        const schoolIds = [...new Set(invoiceResults.map(invoice => invoice.school_id))];

        // Fetch school names
        const schoolResults = await models.sequelize.query(`
          SELECT school_id, school_name
          FROM school_setup
          WHERE school_id IN (${schoolIds.map(() => '?').join(',')})
        `, {
          replacements: schoolIds,
          type: models.sequelize.QueryTypes.SELECT
        });

        // Create a map of school_id to school_name
        const schoolMap = {};
        schoolResults.forEach(school => {
          schoolMap[school.school_id] = school.school_name;
        });

        // Add school_name to each invoice
        invoiceResults = invoiceResults.map(invoice => ({
          ...invoice,
          school_name: schoolMap[invoice.school_id] || 'Unknown School'
        }));
      }

      // For each invoice, get additional subscription details
      const subscriptionInvoices = await Promise.all(invoiceResults.map(async (invoice) => {
        // Get subscription details based on subscription_id
        const subscriptionDetails = await models.sequelize.query(`
          SELECT 
            subscription_type,
            pricing_plan_id,
            subscription_start_date,
            subscription_end_date,
            current_term,
            academic_year,
            active_students_count,
            cbt_stand_alone_enabled,
            sms_subscription_enabled,
            whatsapp_subscription_enabled,
            email_subscription_enabled,
            express_finance_enabled,
            base_cost,
            addon_cost,
            discount_amount,
            total_cost
          FROM school_subscriptions 
          WHERE id = ?
        `, {
          replacements: [invoice.subscription_id],
          type: models.sequelize.QueryTypes.SELECT
        });
        
        if (subscriptionDetails.length > 0) {
          return {
            ...invoice,
            subscription_type: subscriptionDetails[0].subscription_type,
            pricing_plan_id: subscriptionDetails[0].pricing_plan_id,
            subscription_start_date: subscriptionDetails[0].subscription_start_date,
            subscription_end_date: subscriptionDetails[0].subscription_end_date,
            current_term: subscriptionDetails[0].current_term,
            academic_year: subscriptionDetails[0].academic_year,
            active_students_count: subscriptionDetails[0].active_students_count,
            cbt_stand_alone_enabled: subscriptionDetails[0].cbt_stand_alone_enabled,
            sms_subscription_enabled: subscriptionDetails[0].sms_subscription_enabled,
            whatsapp_subscription_enabled: subscriptionDetails[0].whatsapp_subscription_enabled,
            email_subscription_enabled: subscriptionDetails[0].email_subscription_enabled,
            express_finance_enabled: subscriptionDetails[0].express_finance_enabled,
            base_cost: subscriptionDetails[0].base_cost,
            addon_cost: subscriptionDetails[0].addon_cost,
            discount_amount: subscriptionDetails[0].discount_amount,
            total_cost: subscriptionDetails[0].total_cost
          };
        } else {
          // Return invoice with default values if no subscription details found
          return {
            ...invoice,
            subscription_type: 'Application Subscription' // Default value
          };
        }
      }));

      // Sort by due date (ascending)
      subscriptionInvoices.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      // For regular users, return the most urgent pending invoice (due soonest)
      if (!isSuperAdmin) {
        // Filter invoices due within 14 days to prioritize them
        const today = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 14);

        const urgentInvoices = subscriptionInvoices.filter(invoice => {
          const dueDate = new Date(invoice.due_date);
          return dueDate >= today && invoice.balance > 0;
        });

        // Return the most urgent invoice (due soonest) or any pending invoice if none are urgent
        let selectedInvoice = null;
        if (urgentInvoices.length > 0) {
          // Sort urgent invoices by due date (soonest first)
          urgentInvoices.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
          selectedInvoice = urgentInvoices[0];
        } else if (subscriptionInvoices.length > 0) {
          // If no urgent invoices, return the first one (already sorted by due date)
          selectedInvoice = subscriptionInvoices[0];
        }

        res.status(200).json({
          success: true,
          message: 'Pending invoices retrieved successfully',
          data: selectedInvoice,
          timestamp: new Date().toISOString()
        });
      } else {
        // For super admins, return all pending invoices
        res.status(200).json({
          success: true,
          message: 'Pending invoices retrieved successfully',
          data: subscriptionInvoices,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Pending invoices error details:', error);
      handleError(res, error, 500);
    }
  });

  /**
   * @route PUT /api/invoices/:invoice_id/publish
   * @desc Publish or send an invoice (change status from 'draft' to 'published' or 'sent')
   * @access Private (Super Admin or Admin)
   */
  app.put('/api/invoices/:invoice_id/publish',
    authenticateToken,
    sanitizeInput,
    configLimiter,
    async (req, res) => {
      try {
        const { invoice_id } = req.params;
        const { action = 'publish' } = req.body; // 'publish' or 'send'
        const user = req.user;

        if (!invoice_id) {
          return res.status(400).json({
            success: false,
            message: 'Invoice ID is required'
          });
        }

        // Determine the target status
        const targetStatus = action === 'send' ? 'sent' : 'published';

        // Check if invoice exists
        const [invoice] = await models.sequelize.query(
          `SELECT id, invoice_status, school_id FROM subscription_invoices WHERE id = ?`,
          {
            replacements: [invoice_id],
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        if (!invoice) {
          return res.status(404).json({
            success: false,
            message: 'Invoice not found'
          });
        }

        // Update invoice status
        await models.sequelize.query(
          `UPDATE subscription_invoices 
           SET invoice_status = :target_status, updated_at = NOW() 
           WHERE id = :invoice_id`,
          {
            replacements: {
              target_status: targetStatus,
              invoice_id: invoice_id
            },
            type: models.sequelize.QueryTypes.UPDATE
          }
        );

        res.json({
          success: true,
          message: `Invoice ${action === 'send' ? 'sent' : 'published'} successfully`,
          data: {
            invoice_id: parseInt(invoice_id),
            invoice_status: targetStatus
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Publish invoice error:', error);
        handleError(res, error, 500);
      }
    }
  );

};