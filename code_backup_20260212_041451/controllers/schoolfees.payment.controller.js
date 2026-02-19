const db = require('../config/database');
const remitaService = require('../services/remita.service');
const gatewayConfig = require('../services/gateway.config.service');

class SchoolFeesPaymentController {
  /**
   * Get student's pending fees
   * GET /api/schoolfees/student/:admissionNo/pending
   */
  async getPendingFees(req, res) {
    try {
      const { admissionNo } = req.params;
      const schoolId = req.headers['x-school-id'];

      // Get student details with parent info
      const [students] = await db.execute(
        `SELECT s.*, p.fullname as parent_name, p.email as parent_email, 
                p.phone as parent_phone, p.parent_id
         FROM students s
         LEFT JOIN parents p ON s.parent_id = p.parent_id
         WHERE s.admission_no = ? AND s.school_id = ?`,
        [admissionNo, schoolId]
      );

      if (students.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const student = students[0];

      // Get pending payment entries
      const [pendingFees] = await db.execute(
        `SELECT * FROM payment_entries 
         WHERE admission_no = ? 
         AND payment_status = 'Pending'
         AND school_id = ?
         ORDER BY due_date ASC`,
        [admissionNo, schoolId]
      );

      const totalAmount = pendingFees.reduce((sum, fee) => sum + parseFloat(fee.dr || 0), 0);

      res.json({
        success: true,
        student: {
          admissionNo: student.admission_no,
          name: student.student_name,
          class: student.class_name,
          academicYear: student.academic_year
        },
        parent: {
          parentId: student.parent_id,
          name: student.parent_name,
          email: student.parent_email,
          phone: student.parent_phone
        },
        pendingFees,
        totalAmount: parseFloat(totalAmount.toFixed(2))
      });
    } catch (error) {
      console.error('Get Pending Fees Error:', error);
      res.status(500).json({ error: 'Failed to fetch pending fees' });
    }
  }

  /**
   * Generate RRR for school fees payment
   * POST /api/schoolfees/generate-rrr
   */
  async generateRRR(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { admissionNo, selectedItems, payerInfo, term } = req.body;
      const schoolId = req.headers['x-school-id'];

      // Validate input
      if (!admissionNo || !selectedItems || selectedItems.length === 0) {
        return res.status(400).json({ error: 'Invalid request data' });
      }

      // Get student details
      const [students] = await connection.execute(
        'SELECT * FROM students WHERE admission_no = ? AND school_id = ?',
        [admissionNo, schoolId]
      );

      if (students.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Student not found' });
      }

      const student = students[0];

      // Get selected payment items
      const placeholders = selectedItems.map(() => '?').join(',');
      const [items] = await connection.execute(
        `SELECT * FROM payment_entries 
         WHERE item_id IN (${placeholders}) 
         AND admission_no = ? 
         AND payment_status = 'Pending'`,
        [...selectedItems, admissionNo]
      );

      if (items.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'No valid payment items found' });
      }

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.dr || 0), 0);

      // Get Remita configuration
      gatewayConfig.validateConfig();
      const remitaConfig = gatewayConfig.getRemitaConfig();

      // Get school and platform bank accounts
      const schoolAccounts = await gatewayConfig.getSchoolBankAccounts(schoolId);
      const revenueAccount = schoolAccounts.find(a => a.account_type === 'revenue');
      
      if (!revenueAccount) {
        await connection.rollback();
        return res.status(400).json({ error: 'School bank account not configured' });
      }

      const platformAccount = await gatewayConfig.getPlatformAccount();
      
      if (!platformAccount) {
        await connection.rollback();
        return res.status(500).json({ error: 'Platform account not configured' });
      }

      // Generate payment reference
      const paymentRef = remitaService.generatePaymentRef();

      // Prepare line items for split payment
      const platformFee = 500; // ₦500 platform fee
      const lineItems = remitaService.prepareLineItems(
        totalAmount,
        revenueAccount,
        platformAccount,
        platformFee
      );

      // Generate RRR from Remita
      const result = await remitaService.generateRRR(remitaConfig, {
        paymentRef,
        amount: totalAmount,
        payerName: payerInfo.name || student.student_name,
        payerEmail: payerInfo.email || '',
        payerPhone: payerInfo.phone || '',
        lineItems
      });

      // Save transaction to database
      const [txnResult] = await connection.execute(
        `INSERT INTO school_fees_transactions 
         (school_id, branch_id, admission_no, parent_id, payment_ref, rrr, amount, 
          status, academic_year, term, payment_items, line_items, remita_request, remita_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          student.branch_id,
          admissionNo,
          student.parent_id,
          paymentRef,
          result.rrr,
          totalAmount,
          student.academic_year,
          term || 'First Term',
          JSON.stringify(selectedItems),
          JSON.stringify(lineItems),
          JSON.stringify({ paymentRef, lineItems }),
          JSON.stringify(result)
        ]
      );

      const transactionId = txnResult.insertId;

      // Update payment_entries with transaction reference
      await connection.execute(
        `UPDATE payment_entries 
         SET school_fees_transaction_id = ?, remita_rrr = ?
         WHERE item_id IN (${placeholders})`,
        [transactionId, result.rrr, ...selectedItems]
      );

      await connection.commit();

      // Build payment URL
      const paymentUrl = `${remitaConfig.paymentUrl}?merchantId=${remitaConfig.merchantId}&rrr=${result.rrr}`;

      res.json({
        success: true,
        rrr: result.rrr,
        paymentRef,
        amount: totalAmount,
        paymentUrl,
        transactionId
      });

    } catch (error) {
      await connection.rollback();
      console.error('Generate RRR Error:', error);
      res.status(500).json({ 
        error: 'Failed to generate payment reference',
        message: error.message 
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Verify payment status
   * GET /api/schoolfees/verify/:rrr
   */
  async verifyPayment(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { rrr } = req.params;

      // Get transaction details
      const [transactions] = await connection.execute(
        'SELECT * FROM school_fees_transactions WHERE rrr = ?',
        [rrr]
      );

      if (transactions.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const transaction = transactions[0];

      // Verify with Remita
      const remitaConfig = gatewayConfig.getRemitaConfig();
      const verification = await remitaService.verifyPayment(remitaConfig, rrr);

      // Check if payment is successful
      const isSuccessful = verification.status === '00' || verification.status === '01';

      if (isSuccessful) {
        // Update transaction status
        await connection.execute(
          `UPDATE school_fees_transactions 
           SET status = 'success', remita_response = ?, payment_date = NOW()
           WHERE rrr = ?`,
          [JSON.stringify(verification.data), rrr]
        );

        // Update payment_entries
        await connection.execute(
          `UPDATE payment_entries 
           SET payment_status = 'Paid', payment_date = NOW()
           WHERE remita_rrr = ?`,
          [rrr]
        );

        await connection.commit();

        res.json({
          success: true,
          message: 'Payment verified successfully',
          status: verification.status,
          amount: verification.amount
        });
      } else {
        await connection.rollback();
        res.json({
          success: false,
          message: 'Payment not successful',
          status: verification.status
        });
      }

    } catch (error) {
      await connection.rollback();
      console.error('Verify Payment Error:', error);
      res.status(500).json({ error: 'Failed to verify payment' });
    } finally {
      connection.release();
    }
  }

  /**
   * Handle Remita webhook callback
   * POST /api/schoolfees/webhook/remita
   */
  async handleWebhook(req, res) {
    try {
      const { rrr, status } = req.body;

      // Log webhook event
      await db.execute(
        `INSERT INTO remita_webhooks 
         (rrr, event_type, payload, processed)
         VALUES (?, 'payment.notification', ?, 0)`,
        [rrr, JSON.stringify(req.body)]
      );

      // Process webhook asynchronously (don't block response)
      this.processWebhook(rrr, status).catch(err => 
        console.error('Webhook processing error:', err)
      );

      // Respond immediately to Remita
      res.status(200).send('OK');

    } catch (error) {
      console.error('Webhook Error:', error);
      res.status(500).send('ERROR');
    }
  }

  /**
   * Process webhook asynchronously
   * @private
   */
  async processWebhook(rrr, status) {
    if (status === '00' || status === '01') {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        await connection.execute(
          `UPDATE school_fees_transactions 
           SET status = 'success', payment_date = NOW() 
           WHERE rrr = ?`,
          [rrr]
        );

        await connection.execute(
          `UPDATE payment_entries 
           SET payment_status = 'Paid', payment_date = NOW()
           WHERE remita_rrr = ?`,
          [rrr]
        );

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  }

  /**
   * Get payment history for parent
   * GET /api/schoolfees/parent/:parentId/history
   */
  async getPaymentHistory(req, res) {
    try {
      const { parentId } = req.params;
      const schoolId = req.headers['x-school-id'];

      const [history] = await db.execute(
        `SELECT 
          t.rrr,
          t.amount,
          t.status,
          t.created_at as transaction_date,
          s.student_name,
          s.admission_no,
          s.class_name,
          t.academic_year,
          t.term
         FROM school_fees_transactions t
         JOIN students s ON t.admission_no = s.admission_no
         WHERE t.parent_id = ? AND t.school_id = ?
         ORDER BY t.created_at DESC
         LIMIT 50`,
        [parentId, schoolId]
      );

      res.json({ success: true, history });

    } catch (error) {
      console.error('Get Payment History Error:', error);
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  }
}

module.exports = new SchoolFeesPaymentController();
