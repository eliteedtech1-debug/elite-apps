const GAAPComplianceService = require('../services/GAAPComplianceService');

/**
 * GAAP Compliance Controller
 * Handles GAAP compliance operations for Elite Scholar
 */

class GAAPComplianceController {
  
  /**
   * Update payment status for accrual accounting
   */
  static async updatePaymentStatus(req, res) {
    try {
      const { payment_entry_id, status, cash_received_date } = req.body;
      
      if (!payment_entry_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Payment entry ID and status are required'
        });
      }
      
      const result = await GAAPComplianceService.updatePaymentStatus(
        payment_entry_id, 
        status, 
        cash_received_date
      );
      
      return res.json(result);
      
    } catch (error) {
      console.error('Error in updatePaymentStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update payment status',
        error: error.message
      });
    }
  }
  
  /**
   * Calculate bad debt allowance
   */
  static async calculateBadDebtAllowance(req, res) {
    try {
      const { academic_year, term } = req.body;
      const school_id = req.user?.school_id;
      const branch_id = req.user?.branch_id;
      
      if (!school_id || !academic_year || !term) {
        return res.status(400).json({
          success: false,
          message: 'School ID, academic year, and term are required'
        });
      }
      
      const result = await GAAPComplianceService.calculateBadDebtAllowance(
        school_id,
        branch_id,
        academic_year,
        term
      );
      
      return res.json(result);
      
    } catch (error) {
      console.error('Error in calculateBadDebtAllowance:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate bad debt allowance',
        error: error.message
      });
    }
  }
  
  /**
   * Create deferred revenue entry
   */
  static async createDeferredRevenue(req, res) {
    try {
      const {
        student_id,
        admission_no,
        payment_entry_id,
        amount,
        service_period_start,
        service_period_end,
        recognition_method
      } = req.body;
      
      const school_id = req.user?.school_id;
      const branch_id = req.user?.branch_id;
      
      if (!student_id || !admission_no || !amount || !service_period_start || !service_period_end) {
        return res.status(400).json({
          success: false,
          message: 'Student ID, admission number, amount, and service period are required'
        });
      }
      
      const result = await GAAPComplianceService.createDeferredRevenue({
        studentId: student_id,
        admissionNo: admission_no,
        schoolId: school_id,
        branchId: branch_id,
        paymentEntryId: payment_entry_id,
        amount: parseFloat(amount),
        servicePeriodStart: service_period_start,
        servicePeriodEnd: service_period_end,
        recognitionMethod: recognition_method
      });
      
      return res.json(result);
      
    } catch (error) {
      console.error('Error in createDeferredRevenue:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create deferred revenue',
        error: error.message
      });
    }
  }
  
  /**
   * Recognize deferred revenue
   */
  static async recognizeDeferredRevenue(req, res) {
    try {
      const { recognition_date } = req.body;
      const school_id = req.user?.school_id;
      
      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }
      
      const result = await GAAPComplianceService.recognizeDeferredRevenue(
        school_id,
        recognition_date ? new Date(recognition_date) : new Date()
      );
      
      return res.json(result);
      
    } catch (error) {
      console.error('Error in recognizeDeferredRevenue:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to recognize deferred revenue',
        error: error.message
      });
    }
  }
  
  /**
   * Create period-end adjustments
   */
  static async createPeriodEndAdjustments(req, res) {
    try {
      const { period_year, period_month } = req.body;
      const school_id = req.user?.school_id;
      const branch_id = req.user?.branch_id;
      
      if (!school_id || !period_year || !period_month) {
        return res.status(400).json({
          success: false,
          message: 'School ID, period year, and period month are required'
        });
      }
      
      const result = await GAAPComplianceService.createPeriodEndAdjustments(
        school_id,
        branch_id,
        period_year,
        period_month
      );
      
      return res.json(result);
      
    } catch (error) {
      console.error('Error in createPeriodEndAdjustments:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create period-end adjustments',
        error: error.message
      });
    }
  }
  
  /**
   * Generate financial statements
   */
  static async generateFinancialStatements(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const school_id = req.user?.school_id;
      const branch_id = req.user?.branch_id;
      
      if (!school_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'School ID, start date, and end date are required'
        });
      }
      
      const result = await GAAPComplianceService.generateFinancialStatements(
        school_id,
        branch_id,
        start_date,
        end_date
      );
      
      return res.json(result);
      
    } catch (error) {
      console.error('Error in generateFinancialStatements:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate financial statements',
        error: error.message
      });
    }
  }
  
  /**
   * Get GAAP compliance status
   */
  static async getComplianceStatus(req, res) {
    try {
      const school_id = req.user?.school_id;
      const branch_id = req.user?.branch_id;
      
      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }
      
      const result = await GAAPComplianceService.getComplianceStatus(school_id, branch_id);
      
      return res.json(result);
      
    } catch (error) {
      console.error('Error in getComplianceStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get compliance status',
        error: error.message
      });
    }
  }
}

module.exports = GAAPComplianceController;
