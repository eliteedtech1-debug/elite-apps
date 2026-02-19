const db = require('../models');

module.exports = (app) => {
  app.post('/api/test-processpayment', async (req, res) => {
    try {
      const {
        admission_no,
        amount_paid,
        payment_method = "Bank Transfer",
        payment_reference = "",
        description = "Payment",
        school_id,
        branch_id = "",
        parent_id = "",
        term = "",
        academic_year = "",
        class_code = "",
      } = req.body;

      // Basic validation
      if (!admission_no || !amount_paid || !school_id) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: admission_no, amount_paid, school_id"
        });
      }

      const refNo = Math.floor(1e9 + Math.random() * 9e9);
      const finalPaymentReference = payment_reference || `PAY-${Date.now()}`;

      // Validate payment method
      const validMethods = ['Cash', 'Bank Transfer', 'Card', 'Mobile Money', 'Other'];
      const normalizedMethod = validMethods.find(m => 
        m.toLowerCase() === payment_method.toLowerCase()
      ) || 'Bank Transfer';

      console.log('🔍 Calling processPayment with:', {
        admission_no, refNo, amount_paid, normalizedMethod, school_id
      });

      const result = await db.sequelize.query(
        `CALL processPayment(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            admission_no,
            refNo.toString(),
            parseFloat(amount_paid),
            normalizedMethod,
            finalPaymentReference,
            description,
            school_id,
            branch_id,
            parent_id,
            term,
            academic_year,
            class_code
          ]
        }
      );

      return res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        data: result,
        payment_reference: finalPaymentReference,
        ref_no: refNo,
      });

    } catch (error) {
      console.error("❌ Error in test-processpayment:", error);
      return res.status(500).json({
        success: false,
        message: "Payment processing failed",
        error: error.message,
        details: {
          sql: error.sql,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage
        }
      });
    }
  });
};
