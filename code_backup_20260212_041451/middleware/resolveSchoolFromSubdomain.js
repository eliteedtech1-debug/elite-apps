const AdmissionHelpers = require('../utils/admissionHelpers');

const resolveSchoolFromSubdomain = async (req, res, next) => {
  try {
    const host = req.get('host') || '';
    const subdomain = host.split('.')[0];
    
    const schoolContext = await AdmissionHelpers.resolveSchoolContext(subdomain);
    req.schoolContext = schoolContext;

    next();
  } catch (error) {
    const statusCode = error.message === 'Invalid subdomain' ? 400 : 404;
    res.status(statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = resolveSchoolFromSubdomain;
