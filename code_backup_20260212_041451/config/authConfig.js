/**
 * Authentication Configuration
 * Environment-aware authentication settings for development and production
 */

const { smartAuth, passportWithFallback, devAuth, strictAuth } = require('../middleware/flexibleAuth');
const { authenticateToken } = require('../middleware/auth');
const passport = require('passport');

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Authentication Strategy Configuration
 * All strategies (except 'none') now require Bearer token, X-School-Id, and X-Branch-Id headers
 */
const authStrategies = {
  // No authentication - for public endpoints only
  none: (req, res, next) => next(),
  
  // Development-friendly authentication (requires headers but allows bypass)
  dev: devAuth,
  
  // Balanced authentication (recommended for most endpoints)
  balanced: smartAuth('balanced'),
  
  // Strict authentication (for sensitive operations)
  strict: strictAuth,
  
  // Legacy passport authentication with fallback
  passport: passportWithFallback,
  
  // Custom token authentication
  custom: authenticateToken,
  
  // Original passport (for comparison)
  passportOriginal: passport.authenticate('jwt', { session: false })
};

/**
 * Environment-specific default strategies
 */
const defaultStrategies = {
  development: {
    default: 'balanced',      // Most endpoints
    sensitive: 'balanced',    // Sensitive operations (still permissive in dev)
    public: 'none',          // Public endpoints
    legacy: 'passport'       // Legacy endpoints
  },
  production: {
    default: 'balanced',      // Most endpoints
    sensitive: 'strict',      // Sensitive operations
    public: 'none',          // Public endpoints
    legacy: 'passport'       // Legacy endpoints
  }
};

/**
 * Get authentication middleware based on environment and security level
 */
const getAuth = (level = 'default') => {
  const environment = isDevelopment ? 'development' : 'production';
  const strategyName = defaultStrategies[environment][level] || 'balanced';
  
  const strategy = authStrategies[strategyName];
  if (!strategy) {
    console.warn(`Unknown auth strategy: ${strategyName}, falling back to balanced`);
    return authStrategies.balanced;
  }
  
  return strategy;
};

/**
 * Endpoint-specific authentication configuration
 */
const endpointAuth = {
  // Financial endpoints
  payments: getAuth('default'),
  'financial-reports': getAuth('default'),
  'school-revenues': getAuth('default'),
  
  // Administrative endpoints
  'user-management': getAuth('sensitive'),
  'school-setup': getAuth('sensitive'),
  'system-config': getAuth('strict'),
  
  // Student endpoints
  'student-data': getAuth('default'),
  'student-payments': getAuth('default'),
  
  // Public endpoints
  'health-check': getAuth('public'),
  'cors-test': getAuth('public'),
  
  // Debug endpoints (development only)
  'debug': isDevelopment ? getAuth('dev') : getAuth('strict')
};

/**
 * Route pattern matching for automatic auth selection
 */
const getAuthForRoute = (routePath) => {
  // Remove leading slash and parameters
  const cleanPath = routePath.replace(/^\//, '').split('?')[0].split('/')[0];
  
  // Check for specific endpoint configurations
  if (endpointAuth[cleanPath]) {
    return endpointAuth[cleanPath];
  }
  
  // Pattern-based matching
  if (routePath.includes('/debug/')) {
    return endpointAuth.debug;
  }
  
  if (routePath.includes('/admin/') || routePath.includes('/system/')) {
    return getAuth('sensitive');
  }
  
  if (routePath.includes('/api/v2/')) {
    return getAuth('default');
  }
  
  if (routePath.includes('/public/') || routePath.includes('/health')) {
    return getAuth('public');
  }
  
  // Default fallback
  return getAuth('default');
};

/**
 * Security level recommendations
 */
const securityLevels = {
  public: {
    description: 'No authentication required',
    use: 'Health checks, CORS tests, public documentation',
    security: 'None'
  },
  dev: {
    description: 'Development-friendly with bypass options',
    use: 'Development testing, debugging',
    security: 'Very Low'
  },
  balanced: {
    description: 'Flexible authentication with fallbacks',
    use: 'Most application endpoints',
    security: 'Medium'
  },
  strict: {
    description: 'Full authentication with no fallbacks',
    use: 'Sensitive operations, user management',
    security: 'High'
  }
};

/**
 * Migration helper for updating routes
 */
const migrateRoute = (currentAuth, routePath) => {
  console.log(`
🔄 Migrating route: ${routePath}`);
  
  // Detect current authentication method
  let currentMethod = 'unknown';
  if (currentAuth.toString().includes('passport.authenticate')) {
    currentMethod = 'passport';
  } else if (currentAuth.toString().includes('authenticateToken')) {
    currentMethod = 'custom';
  }
  
  const recommendedAuth = getAuthForRoute(routePath);
  const environment = isDevelopment ? 'development' : 'production';
  
  console.log(`📊 Current: ${currentMethod}`);
  console.log(`🎯 Recommended: ${recommendedAuth.name || 'balanced'}`);
  console.log(`🌍 Environment: ${environment}`);
  
  return recommendedAuth;
};

/**
 * Debugging helper
 */
const debugAuth = () => {
  console.log('\n🔍 Authentication Configuration Debug');
  console.log('═'.repeat(50));
  console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
  console.log(`Default Strategy: ${defaultStrategies[isDevelopment ? 'development' : 'production'].default}`);
  console.log('\nAvailable Strategies:');
  Object.keys(authStrategies).forEach(strategy => {
    console.log(`  - ${strategy}`);
  });
  console.log('\nSecurity Levels:');
  Object.entries(securityLevels).forEach(([level, config]) => {
    console.log(`  - ${level}: ${config.description} (${config.security})`);
  });
  console.log('═'.repeat(50));
};

module.exports = {
  authStrategies,
  defaultStrategies,
  getAuth,
  endpointAuth,
  getAuthForRoute,
  securityLevels,
  migrateRoute,
  debugAuth,
  
  // Convenience exports
  noAuth: authStrategies.none,
  devAuth: authStrategies.dev,
  balancedAuth: authStrategies.balanced,
  strictAuth: authStrategies.strict,
  passportAuth: authStrategies.passport,
  customAuth: authStrategies.custom
};