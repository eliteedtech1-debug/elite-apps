const paystackService = require('../services/paystackService');

/**
 * Get all banks from Paystack
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllBanks = async (req, res) => {
  try {
    const banks = await paystackService.fetchBanks();
    res.status(200).json({
      success: true,
      data: banks
    });
  } catch (error) {
    // Log the error for debugging but return a friendly error response
    console.error('Error fetching banks from Paystack:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve banks at this time. Please try again later.',
      // You could potentially return cached banks here if available
    });
  }
};

/**
 * Resolve account details using account number and bank code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resolveBankAccount = async (req, res) => {
  try {
    const { account_number, bank_code } = req.body;
    
    // Validate input
    if (!account_number || !bank_code) {
      return res.status(400).json({
        success: false,
        message: 'Account number and bank code are required'
      });
    }
    
    const accountDetails = await paystackService.resolveAccount(account_number, bank_code);
    
    res.status(200).json({
      success: true,
      data: accountDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get bank by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getBankById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(200).json({
        success: true,
        data: {}
      });
    }

    const bank = await paystackService.getBankById(id);

    res.status(200).json({
      success: true,
      data: bank || {}
    });
  } catch (error) {
    console.error('Error fetching bank by ID:', error);
    res.status(200).json({
      success: true,
      data: {}
    });
  }
};

/**
 * Initialize a Paystack payment transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initializePayment = async (req, res) => {
  try {
    const { invoice_id, email, school_id } = req.body;
    const userId = req.user?.id || req.user?.user_id;

    // Validate required fields
    if (!invoice_id || !email) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID and email are required'
      });
    }

    // Fetch invoice details to get the amount
    const db = require('../models');
    const [invoice] = await db.sequelize.query(
      `SELECT * FROM subscription_invoices WHERE id = :invoice_id`,
      {
        replacements: { invoice_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if invoice is already paid
    if (invoice.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already paid'
      });
    }

    // Prepare payment data
    const amount = Math.round((invoice.balance || invoice.total_cost) * 100); // Convert to kobo
    const reference = `INV-${invoice.invoice_number}-${Date.now()}`;

    const paymentData = {
      email: email,
      amount: amount,
      reference: reference,
      currency: 'NGN',
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/callback`,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        school_id: school_id || invoice.school_id,
        custom_fields: [
          {
            display_name: 'Invoice Number',
            variable_name: 'invoice_number',
            value: invoice.invoice_number
          },
          {
            display_name: 'School ID',
            variable_name: 'school_id',
            value: school_id || invoice.school_id
          }
        ]
      }
    };

    // Initialize transaction
    const transaction = await paystackService.initializeTransaction(paymentData, userId);

    // Store the payment reference in database for later verification
    await db.sequelize.query(
      `UPDATE subscription_invoices SET payment_reference = :reference WHERE id = :invoice_id`,
      {
        replacements: { reference, invoice_id },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    res.status(200).json({
      success: true,
      data: {
        authorization_url: transaction.authorization_url,
        access_code: transaction.access_code,
        reference: transaction.reference
      }
    });
  } catch (error) {
    console.error('Error initializing Paystack payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment'
    });
  }
};

/**
 * Verify a Paystack payment transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.query;
    const userId = req.user?.id || req.user?.user_id;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    // Verify transaction with Paystack
    const verification = await paystackService.verifyTransaction(reference, userId);

    if (verification.status === 'success') {
      // Update invoice payment status
      const db = require('../models');
      const invoiceId = verification.metadata?.invoice_id;

      if (invoiceId) {
        const amountPaid = verification.amount / 100; // Convert from kobo

        await db.sequelize.query(
          `UPDATE subscription_invoices
           SET payment_status = 'paid',
               amount_paid = amount_paid + :amount_paid,
               balance = balance - :amount_paid,
               updated_at = NOW()
           WHERE id = :invoice_id`,
          {
            replacements: { invoice_id: invoiceId, amount_paid: amountPaid },
            type: db.sequelize.QueryTypes.UPDATE
          }
        );
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: verification
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        data: verification
      });
    }
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

module.exports = {
  getAllBanks,
  resolveBankAccount,
  getBankById,
  initializePayment,
  verifyPayment
};