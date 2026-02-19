const AdmissionHelpers = require('../utils/admissionHelpers');

class ClassController {
  // Get classes using dual context resolution
  static async getClasses(req, res) {
    try {
      // Use school context from middleware (dual resolution)
      const { school_id, branch_id } = req.schoolContext || {};

      if (!school_id || !branch_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'School context not resolved' 
        });
      }

      const classes = await AdmissionHelpers.getActiveClasses(school_id, branch_id);
      
      res.json({ 
        success: true, 
        data: classes,
        context: {
          school_id,
          branch_id,
          source: req.schoolContext.source
        }
      });
    } catch (error) {
      console.error('Error fetching classes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = ClassController;
