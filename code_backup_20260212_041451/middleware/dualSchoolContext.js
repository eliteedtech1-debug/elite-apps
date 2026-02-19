const AdmissionHelpers = require('../utils/admissionHelpers');

const dualSchoolContext = async (req, res, next) => {
  try {
    let schoolContext = null;

    // Method 1: Try subdomain resolution first
    const host = req.get('host') || '';
    const subdomain = host.split('.')[0];
    
    if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      try {
        schoolContext = await AdmissionHelpers.resolveSchoolContext(subdomain);
        schoolContext.source = 'subdomain';
      } catch (error) {
        // Subdomain resolution failed, continue to login-based
      }
    }

    // Method 2: Fall back to login-based context
    if (!schoolContext && req.user) {
      const { school_id, branch_id } = req.user;
      
      if (school_id && branch_id) {
        const isValid = await AdmissionHelpers.validateBranch(school_id, branch_id);
        
        if (isValid) {
          schoolContext = {
            school_id,
            branch_id,
            source: 'login'
          };
        }
      }
    }

    // Method 3: Check request headers (for API calls)
    if (!schoolContext) {
      const headerSchoolId = req.headers['x-school-id'];
      const headerBranchId = req.headers['x-branch-id'];
      
      if (headerSchoolId && headerBranchId) {
        const isValid = await AdmissionHelpers.validateBranch(headerSchoolId, headerBranchId);
        
        if (isValid) {
          schoolContext = {
            school_id: headerSchoolId,
            branch_id: headerBranchId,
            source: 'headers'
          };
        }
      }
    }

    if (!schoolContext) {
      return res.status(400).json({ 
        success: false, 
        error: 'School context required. Use subdomain, login, or headers.' 
      });
    }

    req.schoolContext = schoolContext;
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'School context resolution failed' 
    });
  }
};

module.exports = dualSchoolContext;
