const CreditBalanceService = require('../services/CreditBalanceService');

class CreditBalanceController {
  /**
   * Get student credit balance and ledger history
   */
  static async getStudentCreditInfo(req, res) {
    try {
      const { admission_no } = req.query;
      const { school_id } = req.user;
      const branch_id = req.headers['x-branch-id'];

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: 'Admission number is required as query parameter'
        });
      }

      if (!branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required in headers'
        });
      }

      const result = await CreditBalanceService.getStudentCreditInfo(admission_no, school_id, branch_id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get student credit info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get student credit information',
        error: error.message
      });
    }
  }

  /**
   * Add credit to student balance (manual credit)
   */
  static async addCredit(req, res) {
    try {
      const {
        student_id,
        admission_no,
        amount,
        description,
        term,
        academic_year,
        reference_id
      } = req.body;

      const { school_id } = req.user;
      const branch_id = req.headers['x-branch-id'];

      if (!admission_no || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Admission number and valid amount are required'
        });
      }

      const result = await CreditBalanceService.addCredit({
        student_id,
        admission_no,
        school_id,
        branch_id,
        amount,
        description,
        term,
        academic_year,
        reference_id
      });

      res.json(result);
    } catch (error) {
      console.error('Add credit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add credit',
        error: error.message
      });
    }
  }

  /**
   * Use credit for bill settlement
   */
  static async useCredit(req, res) {
    try {
      const {
        student_id,
        admission_no,
        amount,
        description,
        term,
        academic_year,
        reference_id
      } = req.body;

      const { school_id } = req.user;
      const branch_id = req.headers['x-branch-id'];

      if (!admission_no || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Admission number and valid amount are required'
        });
      }

      const result = await CreditBalanceService.useCredit({
        student_id,
        admission_no,
        school_id,
        branch_id,
        amount,
        description,
        term,
        academic_year,
        reference_id
      });

      res.json(result);
    } catch (error) {
      console.error('Use credit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to use credit',
        error: error.message
      });
    }
  }

  /**
   * Calculate net invoice amount with scholarships and credits
   * Global Best Practice: Apply all adjustments at invoice generation
   */
  static async calculateNetInvoice(req, res) {
    try {
      const {
        student_id,
        admission_no,
        base_amount,
        term,
        academic_year
      } = req.body;

      const { school_id } = req.user;
      const branch_id = req.headers['x-branch-id'];

      if (!admission_no || !base_amount || base_amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Admission number and valid base amount are required'
        });
      }

      if (!branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required in headers'
        });
      }

      const result = await CreditBalanceService.calculateNetInvoiceAmount({
        student_id,
        admission_no,
        school_id,
        branch_id,
        base_amount,
        term,
        academic_year
      });

      res.json(result);
    } catch (error) {
      console.error('Calculate net invoice error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate net invoice amount',
        error: error.message
      });
    }
  }

  /**
   * Process invoice with credit application
   */
  static async processInvoiceWithCredits(req, res) {
    try {
      const {
        student_id,
        admission_no,
        base_amount,
        term,
        academic_year,
        invoice_id
      } = req.body;

      const { school_id } = req.user;
      const branch_id = req.headers['x-branch-id'];

      if (!admission_no || !base_amount || base_amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Admission number and valid base amount are required'
        });
      }

      const result = await CreditBalanceService.processInvoiceWithCredits({
        student_id,
        admission_no,
        school_id,
        branch_id,
        base_amount,
        term,
        academic_year,
        invoice_id
      });

      res.json(result);
    } catch (error) {
      console.error('Process invoice with credits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process invoice with credits',
        error: error.message
      });
    }
  }

  /**
   * Auto-settle bill using available credit (Legacy - kept for backward compatibility)
   */
  static async autoSettleBill(req, res) {
    try {
      const {
        student_id,
        admission_no,
        bill_amount,
        term,
        academic_year,
        bill_id
      } = req.body;

      const { school_id } = req.user;
      const branch_id = req.headers['x-branch-id'];

      if (!admission_no || !bill_amount || bill_amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Admission number and valid bill amount are required'
        });
      }

      const result = await CreditBalanceService.autoSettleBill({
        student_id,
        admission_no,
        school_id,
        branch_id,
        bill_amount,
        term,
        academic_year,
        bill_id
      });

      res.json(result);
    } catch (error) {
      console.error('Auto settle bill error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-settle bill',
        error: error.message
      });
    }
  }
}

module.exports = CreditBalanceController;
