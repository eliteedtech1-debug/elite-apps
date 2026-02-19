/**
 * Authentication Bypass Middleware
 * 
 * This middleware allows certain routes to bypass authentication when needed,
 * particularly useful for development and testing scenarios.
 */

const jwt = require('jsonwebtoken');

/**
 * Routes that can bypass authentication in development mode
 */
const BYPASSABLE_ROUTES = [
  '/branches',
  '/branches-test',
  '/branches-no-auth',
  '/branches-debug',
  '/api/orm-payments'
];

/**
 * Check if a route can bypass authentication
 * @param {string} path - The request path
 * @returns {boolean} - True if the route can bypass auth
 */
function canBypassAuth(path) {
  return BYPASSABLE_ROUTES.some(route => {
    return path === route || path.startsWith(route + '/');
  });
}

/**
 * Extract user context from headers (for bypassed routes)
 * @param {Object} req - Express request object
 * @returns {Object} - User context object
 */
function extractUserContext(req) {
  return {
    id: req.headers['x-user-id'] || req.headers['X-User-Id'] || 712,
    user_type: req.headers['x-user-type'] || req.headers['X-User-Type'] || 'Admin',
    school_id: req.headers['x-school-id'] || req.headers['X-School-Id'] || 'SCH/1',
    branch_id: req.headers['x-branch-id'] || req.headers['X-Branch-Id'] || null
  };
}

/**
 * Validate JWT token without throwing errors
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null if invalid
 */
function validateToken(token) {
  try {
    if (!token) return null;
    
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '');
    
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET_KEY);
    return decoded;
  } catch (error) {
    console.log('🔍 Token validation failed:', error.message);
    return null;
  }
}

/**
 * Authentication bypass middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function authBypass(req, res, next) {
  const path = req.path;
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  // Only apply bypass in development mode and for bypassable routes
  if (!isDevelopment || !canBypassAuth(path)) {
    return next();
  }
  
  // Check if there's a valid token first
  const authHeader = req.headers.authorization;
  const tokenPayload = validateToken(authHeader);
  
  if (tokenPayload) {
    // Token is valid, let normal authentication proceed
    console.log('✅ Valid token found, proceeding with normal auth');
    return next();
  }
  
  // No valid token, but route can be bypassed
  console.log(`🔓 Auth bypass activated for ${path} (development mode)`);
  
  // Extract user context from headers
  const userContext = extractUserContext(req);
  
  // Create a mock user object for the request
  req.user = {
    id: userContext.id,
    user_type: userContext.user_type,
    school_id: userContext.school_id,
    branch_id: userContext.branch_id,
    // Add additional fields that might be expected
    dataValues: {
      id: userContext.id,
      user_type: userContext.user_type,
      school_id: userContext.school_id,
      branch_id: userContext.branch_id
    }
  };
  
  console.log('🔍 Mock user context created:', {
    id: req.user.id,
    user_type: req.user.user_type,
    school_id: req.user.school_id,
    branch_id: req.user.branch_id
  });
  
  // Skip to the actual route handler
  next();
}

/**
 * Conditional authentication middleware
 * Uses bypass if available, otherwise requires authentication
 */
function conditionalAuth(req, res, next) {
  const path = req.path;
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  // Apply bypass first
  authBypass(req, res, () => {
    // If user was set by bypass, continue
    if (req.user) {
      return next();
    }
    
    // Otherwise, require authentication
    const passport = require('passport');
    passport.authenticate('jwt', { session: false })(req, res, next);
  });
}

module.exports = {
  authBypass,
  conditionalAuth,
  canBypassAuth,
  extractUserContext,
  validateToken,
  BYPASSABLE_ROUTES
};