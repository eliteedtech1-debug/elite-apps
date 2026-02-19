/**
 * Header Injection Middleware
 * Safely injects X-School-Id and X-Branch-Id headers into request objects
 * Always overrides user-sent values to ensure consistency and security
 */

/**
 * Middleware to inject header values into req.user, req.body, and req.query
 * This ensures that school_id and branch_id are always available from headers
 * and overrides any user-sent values to prevent inconsistencies
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.overrideUser - Whether to override req.user values (default: true)
 * @param {boolean} options.overrideBody - Whether to override req.body values (default: true)
 * @param {boolean} options.overrideQuery - Whether to override req.query values (default: true)
 * @param {boolean} options.createIfMissing - Whether to create objects if they don't exist (default: true)
 * @param {boolean} options.logInjections - Whether to log injection activities (default: development mode)
 */
const headerInjectionMiddleware = (options = {}) => {
  const {
    overrideUser = true,
    overrideBody = true,
    overrideQuery = true,
    createIfMissing = true,
    logInjections = process.env.NODE_ENV === 'development'
  } = options;

  return (req, res, next) => {
    try {
      // Extract headers (case-insensitive)
      const headerSchoolId = req.headers['x-school-id'] || 
                            req.headers['X-School-Id'] || 
                            req.headers['X-School-ID'] || 
                            req.headers['x-school-ID'];
      
      const headerBranchId = req.headers['x-branch-id'] || 
                            req.headers['X-Branch-Id'] || 
                            req.headers['X-Branch-ID'] || 
                            req.headers['x-branch-ID'];
      
      const headerUserId = req.headers['x-user-id'] || 
                          req.headers['X-User-Id'] || 
                          req.headers['X-User-ID'] || 
                          req.headers['x-user-ID'];
      
      const headerUserType = req.headers['x-user-type'] || 
                            req.headers['X-User-Type'] || 
                            req.headers['X-User-TYPE'] || 
                            req.headers['x-user-TYPE'];

      // Create objects if they don't exist
      if (createIfMissing) {
        if (!req.user) req.user = {};
        if (!req.body) req.body = {};
        if (!req.query) req.query = {};
      }

      // Inject into req.user
      if (overrideUser && req.user) {
        if (headerSchoolId) {
          const oldValue = req.user.school_id;
          req.user.school_id = headerSchoolId;
          if (logInjections && oldValue !== headerSchoolId) {
            console.log(`🏢 Header injection: req.user.school_id: ${oldValue || 'undefined'} → ${headerSchoolId}`);
          }
        }
        
        if (headerBranchId) {
          const oldValue = req.user.branch_id;
          req.user.branch_id = headerBranchId;
          if (logInjections && oldValue !== headerBranchId) {
            console.log(`🌳 Header injection: req.user.branch_id: ${oldValue || 'undefined'} → ${headerBranchId}`);
          }
        }
        
        if (headerUserId) {
          const oldValue = req.user.id;
          req.user.id = headerUserId;
          if (logInjections && oldValue !== headerUserId) {
            console.log(`👤 Header injection: req.user.id: ${oldValue || 'undefined'} → ${headerUserId}`);
          }
        }
        
        if (headerUserType) {
          const oldValue = req.user.user_type;
          req.user.user_type = headerUserType;
          if (logInjections && oldValue !== headerUserType) {
            console.log(`🎭 Header injection: req.user.user_type: ${oldValue || 'undefined'} → ${headerUserType}`);
          }
        }
      }

      // Inject into req.body
      if (overrideBody && req.body) {
        if (headerSchoolId) {
          const oldValue = req.body.school_id;
          req.body.school_id = headerSchoolId;
          if (logInjections && oldValue !== headerSchoolId) {
            console.log(`🏢 Header injection: req.body.school_id: ${oldValue || 'undefined'} → ${headerSchoolId}`);
          }
        }
        
        if (headerBranchId) {
          const oldValue = req.body.branch_id;
          req.body.branch_id = headerBranchId;
          if (logInjections && oldValue !== headerBranchId) {
            console.log(`🌳 Header injection: req.body.branch_id: ${oldValue || 'undefined'} → ${headerBranchId}`);
          }
        }
        
        if (headerUserId) {
          const oldValue = req.body.user_id;
          req.body.user_id = headerUserId;
          if (logInjections && oldValue !== headerUserId) {
            console.log(`👤 Header injection: req.body.user_id: ${oldValue || 'undefined'} → ${headerUserId}`);
          }
        }
        
        if (headerUserType) {
          const oldValue = req.body.user_type;
          req.body.user_type = headerUserType;
          if (logInjections && oldValue !== headerUserType) {
            console.log(`🎭 Header injection: req.body.user_type: ${oldValue || 'undefined'} → ${headerUserType}`);
          }
        }
      }

      // Inject into req.query
      if (overrideQuery && req.query) {
        if (headerSchoolId) {
          const oldValue = req.query.school_id;
          req.query.school_id = headerSchoolId;
          if (logInjections && oldValue !== headerSchoolId) {
            console.log(`🏢 Header injection: req.query.school_id: ${oldValue || 'undefined'} → ${headerSchoolId}`);
          }
        }
        
        if (headerBranchId) {
          const oldValue = req.query.branch_id;
          req.query.branch_id = headerBranchId;
          if (logInjections && oldValue !== headerBranchId) {
            console.log(`🌳 Header injection: req.query.branch_id: ${oldValue || 'undefined'} → ${headerBranchId}`);
          }
        }
        
        if (headerUserId) {
          const oldValue = req.query.user_id;
          req.query.user_id = headerUserId;
          if (logInjections && oldValue !== headerUserId) {
            console.log(`👤 Header injection: req.query.user_id: ${oldValue || 'undefined'} → ${headerUserId}`);
          }
        }
        
        if (headerUserType) {
          const oldValue = req.query.user_type;
          req.query.user_type = headerUserType;
          if (logInjections && oldValue !== headerUserType) {
            console.log(`🎭 Header injection: req.query.user_type: ${oldValue || 'undefined'} → ${headerUserType}`);
          }
        }
      }

      // Add metadata about header injection
      if (!req.headerInjection) {
        req.headerInjection = {
          applied: true,
          timestamp: new Date().toISOString(),
          headers: {
            school_id: headerSchoolId || null,
            branch_id: headerBranchId || null,
            user_id: headerUserId || null,
            user_type: headerUserType || null
          },
          options: {
            overrideUser,
            overrideBody,
            overrideQuery
          }
        };
      }

      next();
    } catch (error) {
      console.error('❌ Header injection middleware error:', error);
      // Never block requests - always continue
      next();
    }
  };
};

/**
 * Aggressive header injection that always overrides everything
 * Use this when you want to ensure headers always take precedence
 */
const aggressiveHeaderInjection = headerInjectionMiddleware({
  overrideUser: true,
  overrideBody: true,
  overrideQuery: true,
  createIfMissing: true,
  logInjections: true
});

/**
 * Safe header injection that only fills missing values
 * Use this when you want to preserve existing values but fill gaps
 */
const safeHeaderInjection = (req, res, next) => {
  try {
    // Extract headers (case-insensitive)
    const headerSchoolId = req.headers['x-school-id'] || 
                          req.headers['X-School-Id'] || 
                          req.headers['X-School-ID'];
    
    const headerBranchId = req.headers['x-branch-id'] || 
                          req.headers['X-Branch-Id'] || 
                          req.headers['X-Branch-ID'];
    
    const headerUserId = req.headers['x-user-id'] || 
                        req.headers['X-User-Id'] || 
                        req.headers['X-User-ID'];
    
    const headerUserType = req.headers['x-user-type'] || 
                          req.headers['X-User-Type'] || 
                          req.headers['X-User-TYPE'];

    // Create objects if they don't exist
    if (!req.user) req.user = {};
    if (!req.body) req.body = {};
    if (!req.query) req.query = {};

    // Only inject if values don't already exist
    if (headerSchoolId && !req.user.school_id) req.user.school_id = headerSchoolId;
    if (headerBranchId && !req.user.branch_id) req.user.branch_id = headerBranchId;
    if (headerUserId && !req.user.id) req.user.id = headerUserId;
    if (headerUserType && !req.user.user_type) req.user.user_type = headerUserType;

    if (headerSchoolId && !req.body.school_id) req.body.school_id = headerSchoolId;
    if (headerBranchId && !req.body.branch_id) req.body.branch_id = headerBranchId;
    if (headerUserId && !req.body.user_id) req.body.user_id = headerUserId;
    if (headerUserType && !req.body.user_type) req.body.user_type = headerUserType;

    if (headerSchoolId && !req.query.school_id) req.query.school_id = headerSchoolId;
    if (headerBranchId && !req.query.branch_id) req.query.branch_id = headerBranchId;
    if (headerUserId && !req.query.user_id) req.query.user_id = headerUserId;
    if (headerUserType && !req.query.user_type) req.query.user_type = headerUserType;

    next();
  } catch (error) {
    console.error('❌ Safe header injection error:', error);
    // Never block requests
    next();
  }
};

/**
 * Silent header injection that doesn't log anything
 * Use this in production to avoid log noise
 */
const silentHeaderInjection = headerInjectionMiddleware({
  overrideUser: true,
  overrideBody: true,
  overrideQuery: true,
  createIfMissing: true,
  logInjections: false
});

/**
 * Development header injection with verbose logging
 * Use this in development to see exactly what's happening
 */
const verboseHeaderInjection = headerInjectionMiddleware({
  overrideUser: true,
  overrideBody: true,
  overrideQuery: true,
  createIfMissing: true,
  logInjections: true
});

/**
 * Environment-aware header injection
 * Automatically chooses the right injection strategy based on environment
 */
const smartHeaderInjection = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? verboseHeaderInjection : silentHeaderInjection;
};

module.exports = {
  headerInjectionMiddleware,
  aggressiveHeaderInjection,
  safeHeaderInjection,
  silentHeaderInjection,
  verboseHeaderInjection,
  smartHeaderInjection
};