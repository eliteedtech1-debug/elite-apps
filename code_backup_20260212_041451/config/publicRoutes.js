/**
 * Public Routes Configuration
 * Centralized management of routes that don't require authentication
 */

// Define public endpoints that don't need authentication
// These support both exact matches and prefix matching (path.startsWith)
const publicEndpoints = [
  // Core system endpoints
  '/',                    // Home page
  '/health',             // Health check
  '/status',             // Status check
  '/favicon.ico',        // Favicon
  '/robots.txt',         // Robots.txt
  '/sitemap.xml',        // Sitemap
  
  // Authentication endpoints
  '/users/login',        // User login
  '/students/login',     // Student login
  '/superadmin-login',   // Admin login
  '/auth',               // Authentication routes (all under /auth/*)
  '/oauth',              // OAuth routes (all under /oauth/*)
  '/api/auth/activation', // Account activation routes (OTP verification)
  '/users/forgot-password', // Password reset routes
  
  // Public school information
  '/schools/get-details', // Public school details
  
  // Static content
  '/static',             // Static files (all files under /static/*)
  '/uploads/public',     // Public uploads (all under /uploads/public/*)
  '/assets',             // Asset files (all under /assets/*)
  
  // Public APIs
  '/public',             // Public API endpoints (all under /public/*)
  '/api/public',         // Public API v2 (all under /api/public/*)
  '/api/v1/public',      // Versioned public API
  '/api/v2/public',      // Versioned public API
  '/verify-token',       // Token verification endpoint
  
  // Documentation
  '/docs',               // Documentation (all under /docs/*)
  '/api-docs',           // API documentation
  '/swagger',            // Swagger documentation
  
  // Testing and debugging (development)
  '/cors-test',          // CORS testing
  '/branches-test',      // Branch testing
  '/branches-no-auth',   // Branch debug
  '/branches-debug',     // Branch debug endpoint
  '/api/orm-payments',   // ORM payments API (development)
  '/repoerts/attendance/dashboard-test', // Attendance testing
  '/bypass-auth',        // Authentication bypass for small projects
  
  // Well-known URIs (for OAuth, SSL certificates, etc.)
  '/.well-known'         // Well-known URIs (all under /.well-known/*)
];

// Define special test endpoints (development/testing only)
const specialTestEndpoints = [
  '/payments/test-summary',           // Payment testing
  '/payments/bypass-auth',            // Development bypass
  '/payments/test-no-auth',           // No auth testing
  '/payments/school-fees-progress-test', // Progress testing
  '/test',                            // General testing (all under /test/*)
  '/debug'                            // Debug endpoints (all under /debug/*)
];

// Define regex patterns for more complex matching
const publicPatterns = [
  /^\/favicon\.(ico|png|svg)$/,       // Favicon files
  /^\/apple-touch-icon.*\.png$/,      // Apple touch icons
  /^\/android-chrome.*\.png$/,        // Android chrome icons
  /^\/manifest\.json$/,               // Web app manifest
  /^\/sw\.js$/,                       // Service worker
  /^\/api\/v\d+\/public\//,           // Versioned public APIs
  /^\/webhooks\//,                    // Webhook endpoints
  /^\/callback\//                     // OAuth/payment callbacks
];

// Environment-specific endpoints
const developmentOnlyEndpoints = [
  '/dev',                // Development tools (all under /dev/*)
  '/playground',         // API playground
  '/mock'                // Mock endpoints (all under /mock/*)
];

/**
 * Check if a path is public (doesn't require authentication)
 * @param {string} path - The request path
 * @param {string} environment - The current environment (development/production)
 * @returns {boolean} - True if the path is public
 */
function isPublicPath(path, environment = 'production') {
  // Check exact matches and prefix matches
  const isPublicEndpoint = publicEndpoints.some(endpoint => {
    return path === endpoint || path.startsWith(endpoint + '/');
  });
  
  // Check regex patterns
  const matchesPattern = publicPatterns.some(pattern => pattern.test(path));
  
  // Check development-only endpoints in development environment
  let isDevelopmentEndpoint = false;
  if (environment === 'development') {
    isDevelopmentEndpoint = developmentOnlyEndpoints.some(endpoint => {
      return path === endpoint || path.startsWith(endpoint + '/');
    });
  }
  
  return isPublicEndpoint || matchesPattern || isDevelopmentEndpoint;
}

/**
 * Check if a path is a special test endpoint
 * @param {string} path - The request path
 * @param {string} environment - The current environment
 * @returns {boolean} - True if the path is a special test endpoint
 */
function isSpecialTestPath(path, environment = 'production') {
  // Special test endpoints are only available in development
  if (environment !== 'development') {
    return false;
  }
  
  return specialTestEndpoints.some(endpoint => {
    return path === endpoint || path.startsWith(endpoint + '/');
  });
}

/**
 * Add a new public endpoint
 * @param {string} endpoint - The endpoint to add
 */
function addPublicEndpoint(endpoint) {
  if (!publicEndpoints.includes(endpoint)) {
    publicEndpoints.push(endpoint);
    console.log(`✅ Added public endpoint: ${endpoint}`);
  }
}

/**
 * Remove a public endpoint
 * @param {string} endpoint - The endpoint to remove
 */
function removePublicEndpoint(endpoint) {
  const index = publicEndpoints.indexOf(endpoint);
  if (index > -1) {
    publicEndpoints.splice(index, 1);
    console.log(`❌ Removed public endpoint: ${endpoint}`);
  }
}

/**
 * Get all public endpoints
 * @returns {Array} - Array of public endpoints
 */
function getPublicEndpoints() {
  return [...publicEndpoints];
}

/**
 * Get all special test endpoints
 * @returns {Array} - Array of special test endpoints
 */
function getSpecialTestEndpoints() {
  return [...specialTestEndpoints];
}

/**
 * Debug function to log all public routes
 */
function debugPublicRoutes() {
  console.log('\n🔓 Public Routes Configuration');
  console.log('═'.repeat(50));
  console.log('📋 Public Endpoints:');
  publicEndpoints.forEach(endpoint => {
    console.log(`  - ${endpoint}`);
  });
  
  console.log('\n🧪 Special Test Endpoints (Development Only):');
  specialTestEndpoints.forEach(endpoint => {
    console.log(`  - ${endpoint}`);
  });
  
  console.log('\n🎯 Regex Patterns:');
  publicPatterns.forEach(pattern => {
    console.log(`  - ${pattern}`);
  });
  
  console.log('\n🔧 Development Only Endpoints:');
  developmentOnlyEndpoints.forEach(endpoint => {
    console.log(`  - ${endpoint}`);
  });
  
  console.log('═'.repeat(50));
}

module.exports = {
  publicEndpoints,
  specialTestEndpoints,
  publicPatterns,
  developmentOnlyEndpoints,
  isPublicPath,
  isSpecialTestPath,
  addPublicEndpoint,
  removePublicEndpoint,
  getPublicEndpoints,
  getSpecialTestEndpoints,
  debugPublicRoutes
};