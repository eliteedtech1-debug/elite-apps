const TrueStudentLedgerService = require('../services/TrueStudentLedgerService');

class TrueStudentLedgerController {
  static async getCompleteStudentLedger(req, res) {
    try {
      const { admission_no } = req.query;
      
      // Get branch_id and school_id from user or headers
      const school_id = req.user?.school_id || req.headers['x-school-id'];
      const branch_id = req.user?.branch_id || req.headers['x-branch-id'];

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: 'Admission number is required'
        });
      }

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID and Branch ID are required'
        });
      }

      const result = await TrueStudentLedgerService.getCompleteStudentLedger(
        admission_no, 
        school_id, 
        branch_id
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);

    } catch (error) {
      console.error('Error in getCompleteStudentLedger:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getStudentFinancialSummary(req, res) {
    try {
      const { admission_no } = req.query;
      
      // Get branch_id and school_id from user or headers
      const school_id = req.user?.school_id || req.headers['x-school-id'];
      const branch_id = req.user?.branch_id || req.headers['x-branch-id'];

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: 'Admission number is required'
        });
      }

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID and Branch ID are required'
        });
      }

      const result = await TrueStudentLedgerService.getStudentFinancialSummary(
        admission_no, 
        school_id, 
        branch_id
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);

    } catch (error) {
      console.error('Error in getStudentFinancialSummary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = TrueStudentLedgerController;
