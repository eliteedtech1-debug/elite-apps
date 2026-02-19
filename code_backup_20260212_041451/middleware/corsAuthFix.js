/**
 * CORS and Authentication Fix Middleware
 * 
 * This middleware provides a comprehensive solution for CORS and authentication issues
 * by ensuring proper headers are set and authentication errors are handled gracefully.
 */

/**
 * Enhanced CORS middleware that ensures all requests get proper CORS headers
 */
function enhancedCors(req, res, next) {
  const origin = req.headers.origin;
  
  // Set CORS headers for all requests
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-school-id',
    'X-School-Id',
    'X-School-ID',
    'x-branch-id',
    'X-Branch-Id',
    'X-Branch-ID',
    'x-admin-needs-branch',
    'X-Admin-Needs-Branch',
    'x-auto-selected-branch',
    'X-Auto-Selected-Branch',
    'X-User-Id',
    'X-User-Type',
    'x-user-id',
    'x-user-type',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-Forwarded-For',
    'User-Agent'
  ].join(','));
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', [
    'x-school-id',
    'x-branch-id',
    'x-admin-needs-branch',
    'x-auto-selected-branch'
  ].join(','));
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ CORS preflight handled for ${req.path} from origin: ${origin || 'none'}`);
    return res.status(200).end();
  }
  
  next();
}

/**
 * Authentication error handler that provides proper CORS headers even on auth failures
 */
function authErrorHandler(err, req, res, next) {
  // Ensure CORS headers are set even on authentication errors
  enhancedCors(req, res, () => {});
  
  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    console.log(`🔐 Authentication failed for ${req.path}:`, err.message);
    
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'Unauthorized',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      hint: 'Please provide a valid Authorization header with Bearer token'
    });
  }
  
  // Pass other errors to the next error handler
  next(err);
}

/**
 * Request logger for debugging CORS and authentication issues
 */
function requestLogger(req, res, next) {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  if (isDevelopment && (req.path.includes('branches') || req.method === 'OPTIONS')) {
    console.log(`🌐 ${req.method} ${req.path}`);
    console.log(`   Origin: ${req.headers.origin || 'none'}`);
    console.log(`   Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`);
    
    const contextHeaders = {
      'x-school-id': req.headers['x-school-id'],
      'x-branch-id': req.headers['x-branch-id'],
      'x-user-id': req.headers['x-user-id'],
      'x-user-type': req.headers['x-user-type']
    };
    
    const hasContextHeaders = Object.values(contextHeaders).some(val => val !== undefined);
    if (hasContextHeaders) {
      console.log(`   Context Headers:`, contextHeaders);
    }
  }
  
  next();
}

/**
 * Global middleware setup function
 */
function setupCorsAuthFix(app) {
  // Apply enhanced CORS to all requests
  app.use(enhancedCors);
  
  // Apply request logging
  app.use(requestLogger);
  
  // Apply authentication error handler
  app.use(authErrorHandler);
  
  console.log('✅ CORS and Authentication fix middleware applied');
}

module.exports = {
  enhancedCors,
  authErrorHandler,
  requestLogger,
  setupCorsAuthFix
};