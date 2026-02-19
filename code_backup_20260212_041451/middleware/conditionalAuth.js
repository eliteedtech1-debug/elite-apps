const { isPublicPath } = require('../config/publicRoutes');
const { getAuth, noAuth } = require('../config/authConfig');

/**
 * Authentication middleware that skips authentication for public routes
 * For public routes, it allows access without authentication
 * For private routes, it applies the appropriate authentication based on environment
 */
const conditionalAuth = (req, res, next) => {
  // Determine the environment
  const environment = process.env.NODE_ENV || 'development';
  
  // Check if the current path is a public route
  if (isPublicPath(req.path, environment)) {
    // For public routes, skip all authentication
    return noAuth(req, res, next);
  }
  
  // For non-public routes, apply default authentication
  const authMiddleware = getAuth('default');
  
  // Call the authentication middleware only for non-public routes
  return authMiddleware(req, res, next);
};

module.exports = {
  conditionalAuth
};