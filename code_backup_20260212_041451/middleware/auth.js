/**
 * Permissive Authentication Middleware
 * Allows all requests without strict authentication
 */

const jwt = require('jsonwebtoken');

// Simple auth that allows everything
const auth = (req, res, next) => {
  // Try to decode JWT token first
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'your_jwt_secret');
      req.user = {
        id: decoded.id || decoded.userId,
        user_type: decoded.user_type || decoded.userType,
        school_id: decoded.school_id || decoded.schoolId,
        branch_id: decoded.branch_id || decoded.branchId,
        passport_url: decoded.passport_url,
        is_admin: ['Admin', 'SuperAdmin', 'superadmin'].includes(decoded.user_type),
        is_agent: ['SuperAdmin', 'superadmin', 'Developer', 'developer'].includes(decoded.user_type)
      };
      return next();
    } catch (err) {
      // Token invalid, fall through to header-based auth
    }
  }
  
  // Fallback to header-based auth
  let headerSchoolId = req.headers['x-school-id'] || req.headers['X-School-Id'];
  if (headerSchoolId && !String(headerSchoolId).startsWith('SCH/')) {
    headerSchoolId = `SCH/${headerSchoolId}`;
  }
  const headerBranchId = req.headers['x-branch-id'] || req.headers['X-Branch-Id'] || 'BRCH00001';
  const headerUserType = req.headers['x-user-type'] || req.headers['X-User-Type'] || 'Admin';
  const headerUserId = req.headers['x-user-id'] || req.headers['X-User-Id'] || '';
  const headerPassportUrl = req.headers['x-passport-url'] || req.headers['X-Passport-Url'] || '';
  
  req.user = {
    id: parseInt(headerUserId, 10) || 1,
    user_type: headerUserType,
    school_id: headerSchoolId,
    branch_id: headerBranchId,
    passport_url: headerPassportUrl,
    is_admin: ['Admin', 'SuperAdmin', 'superadmin'].includes(headerUserType),
    is_agent: ['SuperAdmin', 'superadmin', 'Developer', 'developer'].includes(headerUserType)
  };
  
  next();
};

// Simple authorization that allows everything
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    next();
  };
};

// Simple permission check that allows everything
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    next();
  };
};

// Simple school access validation
const validateSchoolAccess = (req, res, next) => {
  next();
};

module.exports = {
  authenticate: auth,
  authenticateToken: auth,
  authorize,
  requirePermission,
  validateSchoolAccess
};