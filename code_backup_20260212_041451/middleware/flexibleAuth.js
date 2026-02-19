/** 
 * Flexible Authentication Middleware
 * Provides environment-aware authentication with reduced security for development
 */

const passport = require("passport");
const jwt = require('jsonwebtoken');

// Initialize passport with existing configuration
require('../config/passport')(passport);

/**
 * Environment-aware authentication middleware
 * - Always requires Bearer token, X-School-Id, and X-Branch-Id from frontend
 * - Automatically injects school_id and branch_id into req.body and req.query
 * - Development: More permissive validation, allows bypass options
 * - Production: Maintains security but with fallbacks
 */
const flexibleAuth = (options = {}) => {
  // For small projects, make production behave like development
  const isSmallProject = true; // Set to true to make production more permissive
  
  const {
    allowBypass = isSmallProject,
    requireToken = true,
    requireHeaders = true,
    validateExpiry = !isSmallProject,
    strictMode = !isSmallProject
  } = options;

  return async (req, res, next) => {
    const isDevelopment = process.env.NODE_ENV === 'development' || isSmallProject;
    
    try {
      // Always require Bearer token (except for development bypass)
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      // Always require X-School-Id and X-Branch-Id headers (except for development bypass)
      const headerSchoolId = req.headers['x-school-id'] || req.headers['X-School-ID'];
      const headerBranchId = req.headers['x-branch-id'] || req.headers['X-Branch-ID'];
      
      // Check for development bypass (enabled for small projects)
      if (isDevelopment && allowBypass && req.query.bypass_auth === 'true') {
        console.log('🔓 Development bypass: Authentication skipped');
        const mockSchoolId = headerSchoolId || 'SCH/1';
        const mockBranchId = headerBranchId || 'BRCH00001';
        
        req.user = {
          id: 'dev_user',
          user_type: 'Admin',
          school_id: mockSchoolId,
          branch_id: mockBranchId,
          is_admin: true,
          is_development_bypass: true
        };
        
        // Inject into req.body and req.query even for bypass
        injectSchoolContext(req, mockSchoolId, mockBranchId, 'Admin');
        return next();
      }

      // Validate required headers
      if (requireHeaders) {
        if (!headerSchoolId) {
          return res.status(400).json({
            success: false,
            message: 'X-School-Id header is required',
            required_headers: ['Authorization', 'X-School-Id', 'X-Branch-Id']
          });
        }
        
        if (!headerBranchId) {
          return res.status(400).json({
            success: false,
            message: 'X-Branch-Id header is required',
            required_headers: ['Authorization', 'X-School-Id', 'X-Branch-Id']
          });
        }
      }

      // Validate required token
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Bearer token is required',
          required_headers: ['Authorization', 'X-School-Id', 'X-Branch-Id'],
          hint: isDevelopment ? 'Add ?bypass_auth=true for development bypass' : undefined
        });
      }

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      } catch (jwtError) {
        if (isDevelopment && !strictMode) {
          console.log('🔓 Development: Invalid token, attempting to decode without verification');
          try {
            decoded = jwt.decode(token);
            if (!decoded) {
              throw new Error('Token cannot be decoded');
            }
            console.log('⚠️ Using unverified token in development mode');
          } catch (decodeError) {
            return res.status(401).json({
              success: false,
              message: 'Invalid token format',
              hint: isDevelopment ? 'Token cannot be decoded even in development mode' : undefined
            });
          }
        } else {
          if (jwtError.name === 'TokenExpiredError') {
            return res.status(401).json({
              success: false,
              message: 'Access token has expired'
            });
          }
          return res.status(401).json({
            success: false,
            message: 'Invalid access token'
          });
        }
      }

      // Check token expiry (flexible in development)
      if (validateExpiry && decoded.exp && Date.now() >= decoded.exp * 1000) {
        if (isDevelopment && !strictMode) {
          console.log('⚠️ Development: Token expired but allowing access');
        } else {
          return res.status(401).json({
            success: false,
            message: 'Access token has expired'
          });
        }
      }

      // Extract user information
      const isAdmin = decoded.user_type === 'Admin' || decoded.user_type === 'admin' || decoded.role === 'admin';
      const isStudent = decoded.user_type === 'Student' || decoded.user_type === 'student';

      // Determine effective branch ID
      let effectiveBranchId = null;
      if (isAdmin) {
        effectiveBranchId = headerBranchId || decoded.branch_id || null;
      } else {
        effectiveBranchId = headerBranchId || decoded.branch_id || null;
      }

      // Validate branch_id
      if (effectiveBranchId === '' || effectiveBranchId === 'null' || effectiveBranchId === 'undefined') {
        effectiveBranchId = null;
      }

      // Use header values as the authoritative source (frontend-provided)
      const finalSchoolId = headerSchoolId || decoded.school_id;
      const finalBranchId = headerBranchId || effectiveBranchId;
      
      // Validate that header values match token values (relaxed for small projects)
      if (strictMode && !isSmallProject) {
        if (decoded.school_id && headerSchoolId && decoded.school_id !== headerSchoolId) {
          return res.status(403).json({
            success: false,
            message: 'X-School-Id header does not match token school_id',
            token_school_id: decoded.school_id,
            header_school_id: headerSchoolId
          });
        }
        
        if (decoded.branch_id && headerBranchId && decoded.branch_id !== headerBranchId && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'X-Branch-Id header does not match token branch_id (non-admin users)',
            token_branch_id: decoded.branch_id,
            header_branch_id: headerBranchId
          });
        }
      }
      
      // Inject school and branch context into both req.body and req.query
      injectSchoolContext(req, finalSchoolId, finalBranchId, decoded.user_type, decoded.admission_no, isAdmin);

      // Create user object with final (header-prioritized) values
      if (isStudent) {
        req.user = {
          admission_no: decoded.admission_no,
          student_name: decoded.student_name,
          user_type: decoded.user_type,
          school_id: finalSchoolId,
          branch_id: finalBranchId,
          is_admin: false,
          is_student: true,
          header_provided: {
            school_id: !!headerSchoolId,
            branch_id: !!headerBranchId
          }
        };
      } else {
        req.user = {
          id: decoded.id || decoded.user_id,
          user_type: decoded.user_type,
          email: decoded.email,
          role: decoded.role || 'user',
          school_id: finalSchoolId,
          branch_id: finalBranchId,
          is_admin: isAdmin,
          is_student: false,
          header_provided: {
            school_id: !!headerSchoolId,
            branch_id: !!headerBranchId
          }
        };
      }

      next();
    } catch (error) {
      console.error('Flexible authentication error:', error);
      
      if (isDevelopment && !strictMode && headerSchoolId && headerBranchId) {
        console.log('🔓 Development: Authentication error, using fallback user with provided headers');
        req.user = {
          id: 'fallback_user',
          user_type: 'Admin',
          school_id: headerSchoolId,
          branch_id: headerBranchId,
          is_admin: true,
          is_fallback_user: true
        };
        
        // Inject context even for fallback
        injectSchoolContext(req, headerSchoolId, headerBranchId, 'Admin');
        return next();
      }
      
      return res.status(500).json({
        success: false,
        message: 'Authentication failed',
        required_headers: ['Authorization', 'X-School-Id', 'X-Branch-Id']
      });
    }
  };
};

/**
 * Helper function to inject school context into both req.body and req.query
 * This ensures forms don't need to manually include school_id and branch_id
 */
function injectSchoolContext(req, schoolId, branchId, userType, admissionNo, isAdmin) {
  // Ensure req.query exists
  if (!req.query) {
    req.query = {};
  }
  
  // Ensure req.body exists
  if (!req.body) {
    req.body = {};
  }
  
  // Inject school_id into both query and body (if not already present)
  if (schoolId) {
    if (!req.query.school_id) {
      req.query.school_id = schoolId;
      console.log(`🏢 Injected school_id into req.query: ${schoolId}`);
    }
    if (!req.body.school_id) {
      req.body.school_id = schoolId;
      console.log(`🏢 Injected school_id into req.body: ${schoolId}`);
    }
  }
  
  // Inject branch_id into both query and body (if not already present)
  if (branchId) {
    if (!req.query.branch_id) {
      req.query.branch_id = branchId;
      console.log(`🌳 Injected branch_id into req.query: ${branchId}`);
    }
    if (!req.body.branch_id) {
      req.body.branch_id = branchId;
      console.log(`🌳 Injected branch_id into req.body: ${branchId}`);
    }
  } else if (isAdmin) {
    // For Admin users without branch_id, inject special flags
    if (!req.query.admin_no_branch) {
      req.query.admin_no_branch = 'true';
      console.log('⚠️ Admin user without branch_id - injected admin_no_branch flag into req.query');
    }
    if (!req.body.admin_no_branch) {
      req.body.admin_no_branch = 'true';
      console.log('⚠️ Admin user without branch_id - injected admin_no_branch flag into req.body');
    }
  }
  
  // Inject user_type into both query and body
  if (userType) {
    if (!req.query.user_type) {
      req.query.user_type = userType;
    }
    if (!req.body.user_type) {
      req.body.user_type = userType;
    }
  }
  
  // For students, also inject admission_no
  if (admissionNo) {
    if (!req.query.admission_no) {
      req.query.admission_no = admissionNo;
      console.log(`🎓 Injected admission_no into req.query: ${admissionNo}`);
    }
    if (!req.body.admission_no) {
      req.body.admission_no = admissionNo;
      console.log(`🎓 Injected admission_no into req.body: ${admissionNo}`);
    }
  }
}

/**
 * Permissive authentication for development
 * Still requires headers but allows bypass and is more forgiving
 */
const devAuth = flexibleAuth({
  allowBypass: true,
  requireToken: true,
  requireHeaders: true,
  validateExpiry: false,
  strictMode: false
});

/**
 * Balanced authentication for production with fallbacks
 */
const prodAuth = flexibleAuth({
  allowBypass: true, // Changed to true for small projects
  requireToken: true,
  validateExpiry: false, // Changed to false for small projects
  strictMode: false // Changed to false for small projects
});

/**
 * Strict authentication for sensitive operations
 */
const strictAuth = flexibleAuth({
  allowBypass: false,
  requireToken: true,
  validateExpiry: true,
  strictMode: true
});

/**
 * Environment-aware authentication selector
 */
const smartAuth = (level = 'balanced') => {
  // For small projects, always use permissive auth
  const isSmallProject = true;
  
  if (isSmallProject) {
    return devAuth;
  }
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  switch (level) {
    case 'permissive':
      return devAuth;
    case 'strict':
      return strictAuth;
    case 'balanced':
    default:
      return isDevelopment ? devAuth : prodAuth;
  }
};

/**
 * Legacy passport authentication with fallback
 */
const passportWithFallback = (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // For small projects, always allow development-like behavior
  const isSmallProject = true;
  
  // Try passport authentication first
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Passport authentication error:', err);
      if (isDevelopment || isSmallProject) {
        console.log('🔓 Development/Small Project: Passport failed, using fallback');
        return devAuth(req, res, next);
      }
      return res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
    
    if (!user) {
      console.log('Passport authentication failed:', info);
      if (isDevelopment || isSmallProject) {
        console.log('🔓 Development/Small Project: No user from passport, using fallback');
        return devAuth(req, res, next);
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
    
    // Passport succeeded
    req.user = user;
    
    // Inject context into req.query for consistency
    if (!req.query) {
      req.query = {};
    }
    
    if (user.school_id) {
      req.query.school_id = user.school_id;
    }
    
    if (user.branch_id) {
      req.query.branch_id = user.branch_id;
    }
    
    req.query.user_type = user.user_type;
    
    next();
  })(req, res, next);
};

module.exports = {
  flexibleAuth,
  devAuth,
  prodAuth,
  strictAuth,
  smartAuth,
  passportWithFallback
};