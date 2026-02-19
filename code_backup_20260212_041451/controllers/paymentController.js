const { initializeTransaction, verifyTransaction } = require('../services/paystackService');
const db = require('../models');

/**
 * Initialize a Paystack payment for a specific invoice
 */
const initializePayment = async (req, res) => {
  try {
    const { invoice_id, email, callback_url } = req.body;
    const user = req.user; // Authenticated user

    // Validate input
    if (!invoice_id) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID is required'
      });
    }

    // Fetch invoice details
    const [invoiceResult] = await db.sequelize.query(
      `SELECT si.*, ss.school_id, s.school_name
       FROM subscription_invoices si
       JOIN school_subscriptions ss ON si.subscription_id = ss.id
       JOIN school_setup s ON ss.school_id = s.school_id
       WHERE si.id = :invoice_id`,
      {
        replacements: { invoice_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!invoiceResult) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if a payment with this invoice_id and pending status already exists for retry handling
    const [existingPayment] = await db.sequelize.query(
      `SELECT * FROM subscription_payments
       WHERE invoice_id = :invoice_id
       AND payment_status = 'pending'
       AND payment_method = 'online'
       ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { invoice_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    let referenceToUse;
    let transactionData;

    // Prepare payment data for Paystack
    const paymentData = {
      amount: Math.round(invoiceResult.total_amount * 100), // Paystack uses kobo (multiply by 100)
      email: email || user.email, // Use provided email or user's email
      reference: `INV-${invoiceResult.invoice_number}-${Date.now()}`,
      callback_url: callback_url || `${process.env.APP_URL}/payment/callback`,
      metadata: {
        invoice_id: invoiceResult.id,
        invoice_number: invoiceResult.invoice_number,
        school_id: invoiceResult.school_id,
        user_id: user.id,
        subscription_id: invoiceResult.subscription_id
      },
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
    };

    // Initialize the transaction with the user's ID to get their specific Paystack API if needed
    transactionData = await initializeTransaction(paymentData, user.id);
    referenceToUse = transactionData.reference;

    let paymentIdToReturn;

    if (existingPayment) {
      // If there's already a pending payment for this invoice, update it with the new transaction data
      // This allows for payment retries without creating duplicate records

      await db.sequelize.query(
        `UPDATE subscription_payments
         SET
           gateway_reference = :gateway_reference,
           reference_number = :reference_number,
           amount_paid = :amount_paid,
           payment_method = :payment_method,
           channel = :channel,
           payment_status = 'pending',
           payment_provider_id = 1,
           updated_at = NOW()
         WHERE id = :payment_id`,
        {
          replacements: {
            gateway_reference: transactionData.reference,
            reference_number: transactionData.reference,
            amount_paid: invoiceResult.total_amount,
            payment_method: 'online',
            channel: 'paystack',
            payment_id: existingPayment.id
          },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );

      paymentIdToReturn = existingPayment.id;

      console.log(`Updated existing pending payment record for invoice ${invoice_id} with new reference ${referenceToUse}`);
    } else {
      // No existing pending payment, so create a new one
      await db.sequelize.query(
        `INSERT INTO subscription_payments (
          subscription_id, invoice_id, payment_date, amount_paid,
          payment_method, reference_number, payment_status,
          gateway_reference, channel, created_by, school_id, payment_provider_id
        ) VALUES (
          :subscription_id, :invoice_id, CURDATE(), :amount_paid,
          :payment_method, :reference_number, :payment_status,
          :gateway_reference, :channel, :created_by, :school_id, 1
        )`,
        {
          replacements: {
            subscription_id: invoiceResult.subscription_id,
            invoice_id: invoiceResult.id,
            amount_paid: invoiceResult.total_amount,
            payment_method: 'online',
            reference_number: transactionData.reference,
            payment_status: 'pending',
            gateway_reference: transactionData.reference,
            channel: 'paystack',
            created_by: user.id,
            school_id: invoiceResult.school_id
          },
          type: db.sequelize.QueryTypes.INSERT
        }
      );

      // Get the ID of the newly inserted payment
      const [newPayment] = await db.sequelize.query(
        `SELECT id FROM subscription_payments
         WHERE reference_number = :reference_number
         AND invoice_id = :invoice_id
         ORDER BY created_at DESC LIMIT 1`,
        {
          replacements: { reference_number: transactionData.reference, invoice_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      paymentIdToReturn = newPayment?.id;

      console.log(`Created new payment record for invoice ${invoice_id} with reference ${referenceToUse}`);
    }

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorization_url: transactionData.authorization_url,
        access_code: transactionData.access_code,
        reference: referenceToUse
      }
    });
  } catch (error) {
    console.error('Error initializing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing payment',
      error: error.message
    });
  }
};

/**
 * Verify Paystack payment (for frontend callback)
 */
const verifyPaystackPayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required' });
    }

    console.log('Verifying payment with reference:', reference);

    // Verify the transaction with Paystack
    let transactionData;
    try {
      transactionData = await verifyTransaction(reference, req.user.id);
      console.log('Paystack verification result:', transactionData);
    } catch (verifyError) {
      console.error('Paystack verification error:', verifyError.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to verify payment with Paystack: ' + verifyError.message 
      });
    }

    if (transactionData.status === 'success') {
      // Check if payment was already processed
      const [existingPayment] = await db.sequelize.query(
        `SELECT payment_status FROM subscription_payments WHERE gateway_reference = :reference LIMIT 1`,
        {
          replacements: { reference },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (existingPayment && existingPayment.payment_status === 'completed') {
        return res.json({ success: true, message: 'Payment already verified', data: transactionData });
      }

      // Update the payment status in subscription_payments
      await db.sequelize.query(
        `UPDATE subscription_payments 
         SET payment_status = 'completed', 
             verification_status = 'verified',
             amount_paid = :amount_paid,
             gateway_response = :gateway_response,
             verified_at = NOW()
         WHERE gateway_reference = :reference`,
        {
          replacements: {
            amount_paid: transactionData.amount / 100, // Convert from kobo to naira
            gateway_response: JSON.stringify(transactionData),
            reference
          },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );

      // Update invoice and subscription status
      const [paymentResult] = await db.sequelize.query(
        `SELECT invoice_id FROM subscription_payments WHERE gateway_reference = :reference LIMIT 1`,
        {
          replacements: { reference },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (paymentResult && paymentResult.invoice_id) {
        // Update the invoice
        await db.sequelize.query(
          `UPDATE subscription_invoices
           SET amount_paid = :amount_paid,
               balance = total_amount - :amount_paid,
               payment_status = CASE 
                 WHEN :amount_paid >= total_amount THEN 'paid'
                 ELSE 'partial'
               END,
               updated_at = NOW()
           WHERE id = :invoice_id`,
          {
            replacements: {
              amount_paid: transactionData.amount / 100,
              invoice_id: paymentResult.invoice_id
            },
            type: db.sequelize.QueryTypes.UPDATE
          }
        );

        // Activate school package after successful payment
        const [invoiceDetails] = await db.sequelize.query(
          `SELECT si.school_id, ss.pricing_plan_id 
           FROM subscription_invoices si
           JOIN school_subscriptions ss ON si.subscription_id = ss.id
           WHERE si.id = :invoice_id`,
          {
            replacements: { invoice_id: paymentResult.invoice_id },
            type: db.sequelize.QueryTypes.SELECT
          }
        );

        if (invoiceDetails) {
          // Update or insert school package
          await db.sequelize.query(
            `INSERT INTO rbac_school_packages (school_id, package_id, is_active, start_date, end_date, activated_at, created_at)
             VALUES (:school_id, :package_id, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 4 MONTH), NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
             package_id = :package_id, is_active = 1, end_date = DATE_ADD(CURDATE(), INTERVAL 4 MONTH), activated_at = NOW()`,
            {
              replacements: {
                school_id: invoiceDetails.school_id,
                package_id: invoiceDetails.pricing_plan_id
              },
              type: db.sequelize.QueryTypes.INSERT
            }
          );

          // Clear menu cache for this school
          const { menuCache } = require('../utils/menuCache');
          await menuCache.invalidateSchool(invoiceDetails.school_id);

          // Notify frontend to refresh sidebar
          try {
            const rbacWebSocket = require('../services/rbacWebSocket');
            rbacWebSocket.notifyPermissionChange(invoiceDetails.school_id, req.user.id, 'package_activated', {
              package_id: invoiceDetails.pricing_plan_id,
              message: 'Subscription activated - sidebar updated'
            });
          } catch (wsError) {
            console.log('WebSocket notification failed:', wsError.message);
          }
        }
      }

      res.json({ success: true, message: 'Payment verified successfully', data: transactionData });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed', data: transactionData });
    }
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};

/**
 * Handle Paystack callback to verify payment
 */
const handlePaystackCallback = async (req, res) => {
  try {
    const { reference } = req.body;

    // Verify the transaction with Paystack
    const transactionData = await verifyTransaction(reference, 1); // Using default user id 1 for main Paystack account

    if (transactionData.status === 'success') {
      // Update the payment status in subscription_payments
      await db.sequelize.query(
        `UPDATE subscription_payments 
         SET payment_status = 'completed', 
             amount_paid = :amount_paid,
             gateway_response = :gateway_response,
             verified_at = NOW()
         WHERE gateway_reference = :reference`,
        {
          replacements: {
            amount_paid: transactionData.amount / 100, // Convert from kobo to naira
            gateway_response: JSON.stringify(transactionData),
            reference
          },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );

      // Update the invoice and subscription with payment information
      // Get payment details to update invoice and subscription
      const [paymentResult] = await db.sequelize.query(
        `SELECT * FROM subscription_payments WHERE gateway_reference = :reference`,
        {
          replacements: { reference },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (paymentResult) {
        // Update the invoice
        await db.sequelize.query(
          `UPDATE subscription_invoices
           SET amount_paid = amount_paid + :amount_paid,
               balance = total_amount - (amount_paid + :amount_paid),
               payment_status = CASE 
                 WHEN (amount_paid + :amount_paid) >= total_amount THEN 'paid'
                 WHEN (amount_paid + :amount_paid) > 0 THEN 'partial'
                 ELSE 'unpaid'
               END,
               last_payment_date = NOW()
           WHERE id = :invoice_id`,
          {
            replacements: {
              amount_paid: paymentResult.amount_paid,
              invoice_id: paymentResult.invoice_id
            },
            type: db.sequelize.QueryTypes.UPDATE
          }
        );

        // Update the subscription
        await db.sequelize.query(
          `UPDATE school_subscriptions
           SET amount_paid = amount_paid + :amount_paid,
               balance = total_cost - (amount_paid + :amount_paid),
               payment_status = CASE 
                 WHEN (amount_paid + :amount_paid) >= total_cost THEN 'paid'
                 WHEN (amount_paid + :amount_paid) > 0 THEN 'partial'
                 ELSE 'pending'
               END,
               last_payment_date = NOW()
           WHERE id = :subscription_id`,
          {
            replacements: {
              amount_paid: paymentResult.amount_paid,
              subscription_id: paymentResult.subscription_id
            },
            type: db.sequelize.QueryTypes.UPDATE
          }
        );
      }
    }

    // Respond to Paystack to acknowledge receipt
    res.status(200).json({
      status: 'success',
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Error handling Paystack callback:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing callback',
      error: error.message
    });
  }
};

/**
 * Upload bank transfer receipt and create payment record
 */
const uploadBankTransferReceipt = async (req, res) => {
  try {
    const { invoice_id, bank_name, account_number, account_name } = req.body;
    const user = req.user;

    // Validate required fields
    if (!invoice_id) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID is required'
      });
    }

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Validate bank details if provided
    if (!bank_name || !account_number || !account_name) {
      return res.status(400).json({
        success: false,
        message: 'Bank details (bank_name, account_number, account_name) are required'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Receipt file is required'
      });
    }

    // Fetch invoice details
    const [invoiceResult] = await db.sequelize.query(
      `SELECT si.*, ss.school_id
       FROM subscription_invoices si
       JOIN school_subscriptions ss ON si.subscription_id = ss.id
       WHERE si.id = :invoice_id`,
      {
        replacements: { invoice_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!invoiceResult) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Validate that the invoice has required payment amount information
    const amountToPay = invoiceResult.total_amount || invoiceResult.total_cost || invoiceResult.balance || 0;
    if (amountToPay <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice amount'
      });
    }

    // File is already uploaded to Cloudinary via multer-storage-cloudinary
    // req.file.path contains the Cloudinary URL
    const receiptUrl = req.file.path;

    console.log('📸 Receipt uploaded to Cloudinary:', receiptUrl);

    // Save the payment record with receipt information
    const [insertResult] = await db.sequelize.query(
      `INSERT INTO subscription_payments (
        subscription_id, invoice_id, payment_date, amount_paid,
        payment_method, reference_number, payment_status,
        notes, receipt_url, bank_name, account_number, account_name,
        verification_status, created_by, school_id
      ) VALUES (
        :subscription_id, :invoice_id, CURDATE(), :amount_paid,
        :payment_method, :reference_number, :payment_status,
        :notes, :receipt_url, :bank_name, :account_number, :account_name,
        :verification_status, :created_by, :school_id
      )`,
      {
        replacements: {
          subscription_id: invoiceResult.subscription_id || null,
          invoice_id: invoiceResult.id,
          amount_paid: amountToPay,
          payment_method: 'bank_transfer',
          reference_number: `BANK-${Date.now()}`,
          payment_status: 'completed', // Initially completed but pending verification
          notes: 'Bank transfer with receipt upload pending verification',
          receipt_url: receiptUrl,
          bank_name: bank_name || null,
          account_number: account_number || null,
          account_name: account_name || null,
          verification_status: 'pending',
          created_by: user.id,
          school_id: invoiceResult.school_id || null
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    const paymentId = insertResult;

    console.log('✅ Payment record created with ID:', paymentId);

    return res.status(200).json({
      success: true,
      message: 'Bank transfer receipt uploaded successfully, awaiting verification',
      data: {
        payment_id: paymentId,
        receipt_url: receiptUrl,
        amount_paid: amountToPay,
        verification_status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error uploading bank transfer receipt:', error);
    // This catch block will handle errors that occur before the file processing begins
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error uploading receipt',
        error: error.message
      });
    }
  }
};

/**
 * Get vendor payment configuration for authenticated user
 */
const getVendorPaymentConfig = async (req, res) => {
  try {
    const user = req.user;
    
    // Fetch vendor payment configuration
    const [configResult] = await db.sequelize.query(
      `SELECT bank_name, account_number, account_name, is_active
       FROM vendor_payment_configs 
       WHERE user_id = :user_id`,
      {
        replacements: { user_id: user.id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.status(200).json({
      success: true,
      data: configResult || null
    });
  } catch (error) {
    console.error('Error fetching vendor payment config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment configuration',
      error: error.message
    });
  }
};

/**
 * Update vendor payment configuration
 */
const updateVendorPaymentConfig = async (req, res) => {
  try {
    const user = req.user;
    const { bank_name, account_number, account_name, paystack_public_key, paystack_secret_key } = req.body;
    
    // Check if configuration already exists
    const [existingConfig] = await db.sequelize.query(
      `SELECT id FROM vendor_payment_configs WHERE user_id = :user_id`,
      {
        replacements: { user_id: user.id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (existingConfig) {
      // Update existing configuration
      await db.sequelize.query(
        `UPDATE vendor_payment_configs 
         SET bank_name = :bank_name,
             account_number = :account_number,
             account_name = :account_name,
             paystack_public_key = :paystack_public_key,
             paystack_secret_key = :paystack_secret_key,
             updated_at = NOW()
         WHERE user_id = :user_id`,
        {
          replacements: {
            user_id: user.id,
            bank_name,
            account_number,
            account_name,
            paystack_public_key: paystack_public_key || null,
            paystack_secret_key: paystack_secret_key ? `:enc:${paystack_secret_key}` : null // Add encryption in production
          },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
    } else {
      // Create new configuration
      await db.sequelize.query(
        `INSERT INTO vendor_payment_configs (
          user_id, bank_name, account_number, account_name, 
          paystack_public_key, paystack_secret_key
        ) VALUES (
          :user_id, :bank_name, :account_number, :account_name,
          :paystack_public_key, :paystack_secret_key
        )`,
        {
          replacements: {
            user_id: user.id,
            bank_name,
            account_number,
            account_name,
            paystack_public_key: paystack_public_key || null,
            paystack_secret_key: paystack_secret_key ? `:enc:${paystack_secret_key}` : null
          },
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating vendor payment config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment configuration',
      error: error.message
    });
  }
};

/**
 * Get pending payments for verification
 */
const getPendingPayments = async (req, res) => {
  try {
    const user = req.user;

    // Only allow super admins to access this data
    if (user.id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only super admin can view pending payments.'
      });
    }

    // Fetch pending payments with receipt uploads
    const results = await db.sequelize.query(
      `SELECT sp.*, si.invoice_number, ss.school_id, sch.school_name
       FROM subscription_payments sp
       LEFT JOIN subscription_invoices si ON sp.invoice_id = si.id
       LEFT JOIN school_subscriptions ss ON sp.subscription_id = ss.id
       LEFT JOIN school_setup sch ON ss.school_id = sch.school_id
       WHERE sp.verification_status = 'pending'
       AND sp.payment_method = 'bank_transfer'
       ORDER BY sp.created_at DESC`,
      {
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending payments',
      error: error.message
    });
  }
};

/**
 * Verify a payment (approve or reject)
 */
const verifyPayment = async (req, res) => {
  try {
    const { payment_id, verification_status } = req.body;
    const user = req.user;

    // Only allow super admins to verify payments
    if (user.id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only super admin can verify payments.'
      });
    }

    if (!['verified', 'rejected'].includes(verification_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status. Must be "verified" or "rejected".'
      });
    }

    // Update the verification status
    await db.sequelize.query(
      `UPDATE subscription_payments
       SET verification_status = :verification_status,
           verified_by = :verified_by,
           verified_at = NOW()
       WHERE id = :payment_id`,
      {
        replacements: {
          payment_id,
          verification_status,
          verified_by: user.id
        },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    // If payment is verified, update the related invoice and subscription
    if (verification_status === 'verified') {
      const [paymentResult] = await db.sequelize.query(
        `SELECT * FROM subscription_payments WHERE id = :payment_id`,
        {
          replacements: { payment_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (paymentResult) {
        // Update the invoice
        await db.sequelize.query(
          `UPDATE subscription_invoices
           SET amount_paid = amount_paid + :amount_paid,
               balance = total_amount - (amount_paid + :amount_paid),
               payment_status = CASE
                 WHEN (amount_paid + :amount_paid) >= total_amount THEN 'paid'
                 WHEN (amount_paid + :amount_paid) > 0 THEN 'partial'
                 ELSE 'unpaid'
               END,
               last_payment_date = NOW()
           WHERE id = :invoice_id`,
          {
            replacements: {
              amount_paid: paymentResult.amount_paid,
              invoice_id: paymentResult.invoice_id
            },
            type: db.sequelize.QueryTypes.UPDATE
          }
        );

        // Update the subscription
        await db.sequelize.query(
          `UPDATE school_subscriptions
           SET amount_paid = amount_paid + :amount_paid,
               balance = total_cost - (amount_paid + :amount_paid),
               payment_status = CASE
                 WHEN (amount_paid + :amount_paid) >= total_cost THEN 'paid'
                 WHEN (amount_paid + :amount_paid) > 0 THEN 'partial'
                 ELSE 'pending'
               END,
               last_payment_date = NOW()
           WHERE id = :subscription_id`,
          {
            replacements: {
              amount_paid: paymentResult.amount_paid,
              subscription_id: paymentResult.subscription_id
            },
            type: db.sequelize.QueryTypes.UPDATE
          }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Payment ${verification_status} successfully`
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

/**
 * Initialize a Flutterwave payment for a specific invoice
 */
const initializeFlutterwavePayment = async (req, res) => {
  try {
    const { invoice_id, email, callback_url } = req.body;
    const user = req.user;

    if (!invoice_id) {
      return res.status(400).json({ success: false, message: 'Invoice ID is required' });
    }

    const [invoice] = await db.sequelize.query(
      `SELECT si.*, ss.school_id FROM subscription_invoices si
       JOIN school_subscriptions ss ON si.subscription_id = ss.id
       WHERE si.id = :invoice_id`,
      { replacements: { invoice_id }, type: db.sequelize.QueryTypes.SELECT }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const reference = `FLW-${invoice.invoice_number}-${Date.now()}`;
    const axios = require('axios');
    
    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: reference,
        amount: invoice.total_amount,
        currency: 'NGN',
        redirect_url: callback_url || `${process.env.APP_URL}/payment/callback`,
        customer: { email: email || user.email },
        meta: { invoice_id, school_id: invoice.school_id, user_id: user.id }
      },
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }
    );

    if (response.data.status !== 'success') {
      throw new Error('Flutterwave initialization failed');
    }

    // Save payment record
    await db.sequelize.query(
      `INSERT INTO subscription_payments (subscription_id, invoice_id, payment_date, amount_paid, payment_method, reference_number, payment_status, gateway_reference, channel, created_by, school_id, payment_provider_id)
       VALUES (:subscription_id, :invoice_id, CURDATE(), :amount, 'online', :reference, 'pending', :reference, 'flutterwave', :user_id, :school_id, 2)`,
      { replacements: { subscription_id: invoice.subscription_id, invoice_id, amount: invoice.total_amount, reference, user_id: user.id, school_id: invoice.school_id } }
    );

    res.json({ success: true, data: { authorization_url: response.data.data.link, reference } });
  } catch (error) {
    console.error('Flutterwave init error:', error.message);
    const msg = error.response?.status === 401 
      ? 'Flutterwave API key not configured or invalid' 
      : 'Failed to initialize Flutterwave payment';
    res.status(500).json({ success: false, message: msg });
  }
};

/**
 * Verify Flutterwave payment
 */
const verifyFlutterwavePayment = async (req, res) => {
  try {
    const { transaction_id, tx_ref } = req.body;
    if (!transaction_id) {
      return res.status(400).json({ success: false, message: 'Transaction ID required' });
    }

    const axios = require('axios');
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }
    );

    if (response.data.status !== 'success' || response.data.data.status !== 'successful') {
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }

    const txData = response.data.data;
    
    // Update payment record
    await db.sequelize.query(
      `UPDATE subscription_payments SET payment_status = 'completed', gateway_reference = :gateway_ref, updated_at = NOW()
       WHERE reference_number = :tx_ref AND payment_status = 'pending'`,
      { replacements: { gateway_ref: transaction_id, tx_ref } }
    );

    // Get payment to update invoice
    const [payment] = await db.sequelize.query(
      `SELECT * FROM subscription_payments WHERE reference_number = :tx_ref`,
      { replacements: { tx_ref }, type: db.sequelize.QueryTypes.SELECT }
    );

    if (payment) {
      // Update invoice
      await db.sequelize.query(
        `UPDATE subscription_invoices SET amount_paid = amount_paid + :amount, balance = total_amount - (amount_paid + :amount),
         payment_status = CASE WHEN (amount_paid + :amount) >= total_amount THEN 'paid' ELSE 'partial' END, last_payment_date = NOW()
         WHERE id = :invoice_id`,
        { replacements: { amount: payment.amount_paid, invoice_id: payment.invoice_id } }
      );

      // Get subscription details for package activation
      const [subscription] = await db.sequelize.query(
        `SELECT ss.*, si.due_date FROM school_subscriptions ss 
         JOIN subscription_invoices si ON si.subscription_id = ss.id
         WHERE ss.id = :subscription_id`,
        { replacements: { subscription_id: payment.subscription_id }, type: db.sequelize.QueryTypes.SELECT }
      );

      // Update subscription
      await db.sequelize.query(
        `UPDATE school_subscriptions SET amount_paid = amount_paid + :amount, balance = total_cost - (amount_paid + :amount),
         payment_status = CASE WHEN (amount_paid + :amount) >= total_cost THEN 'paid' ELSE 'partial' END, status = 'active', last_payment_date = NOW()
         WHERE id = :subscription_id`,
        { replacements: { amount: payment.amount_paid, subscription_id: payment.subscription_id } }
      );

      // Activate package in rbac_school_packages
      if (subscription) {
        const endDate = subscription.subscription_end_date || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000); // 4 months default
        await db.sequelize.query(
          `INSERT INTO rbac_school_packages (school_id, package_id, is_active, start_date, end_date, created_at)
           VALUES (:school_id, :package_id, 1, CURDATE(), :end_date, NOW())
           ON DUPLICATE KEY UPDATE package_id = :package_id, is_active = 1, end_date = :end_date`,
          { replacements: { school_id: payment.school_id, package_id: subscription.pricing_plan_id || 3, end_date: endDate } }
        );
        
        // Clear menu cache for this school
        const { menuCache } = require('../utils/menuCache');
        await menuCache.invalidateSchool(payment.school_id);
      }
    }

    res.json({ success: true, message: 'Payment verified', data: { amount: txData.amount, reference: tx_ref } });
  } catch (error) {
    console.error('Flutterwave verify error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};

module.exports = {
  initializePayment,
  initializeFlutterwavePayment,
  verifyFlutterwavePayment,
  verifyPaystackPayment,
  handlePaystackCallback,
  uploadBankTransferReceipt,
  getVendorPaymentConfig,
  updateVendorPaymentConfig,
  getPendingPayments,
  verifyPayment
};
