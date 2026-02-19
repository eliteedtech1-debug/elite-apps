const AdmissionHelpers = require('../utils/admissionHelpers');

const enforceBranchContext = async (req, res, next) => {
  try {
    const { school_id, branch_id } = req.body;
    
    if (!school_id || !branch_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'school_id and branch_id are required' 
      });
    }

    const isValid = await AdmissionHelpers.validateBranch(school_id, branch_id);
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid branch for school' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Branch validation failed' });
  }
};

module.exports = enforceBranchContext;
