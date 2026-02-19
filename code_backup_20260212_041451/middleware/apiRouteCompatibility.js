/**
 * API Route Compatibility Middleware
 * 
 * This middleware addresses the inconsistent routing pattern in the application where:
 * - Most routes follow the standard pattern without /api/ prefix (e.g., /users/login, /payments)
 * - Some routes use /api/ prefix (e.g., /api/custom-charges, /api/v2/reports)
 * - Frontend helper functions automatically apply /api/ prefix to all requests
 * 
 * This middleware automatically redirects /api/* requests to their non-prefixed equivalents
 * when the /api/ route doesn't exist, maintaining compatibility with both patterns.
 */

const path = require('path');

/**
 * List of routes that should ONLY be accessible with /api/ prefix
 * These are routes that were intentionally designed with the prefix
 */
const API_ONLY_ROUTES = [
  // Enhanced financial routes (v2 API)
  '/api/v2/',
  
  // Custom charges and items
  '/api/custom-charges',
  '/api/custom-items',
  
  // Enhanced payments
  '/api/enhanced-payments',
  '/api/orm-payments',
  
  // Chart of accounts setup
  '/api/chart-of-accounts',
  '/api/setup-branch-accounts',
  '/api/ensure-all-branches-accounts',
  '/api/copy-chart-of-accounts',
  '/api/check-branch-accounts',
  '/api/create-default-chart-of-accounts',
  '/api/chart-of-accounts-setup',
  
  // Debug routes
  '/api/debug/',
  
  // Accounting API
  '/api/accounting/',
  
  // Profile routes
  '/api/profile/',
  
  // Student payment routes (these use /api/ prefix)
  '/api/studentpayment',
  '/api/getstudentpayment',
  '/api/studentpaymentInGeneral',
  '/api/allchildpaymentdetails',
  '/api/processpayment',
  '/api/completeprocesspayment',
  '/api/getstudentbalance',
  '/api/getpaymentreciept',
  '/api/getgeneralledger',
  '/api/getindividualledger',
  '/api/processparentpayment',
  
  // Attendance routes (these use /api/ prefix)
  '/api/attendance',
  
  // Fees routes
  '/api/fees',
  '/api/students'
];

/**
 * Check if a route should only be accessible with /api/ prefix
 */
function isApiOnlyRoute(path) {
  return API_ONLY_ROUTES.some(route => {
    if (route.endsWith('/')) {
      return path.startsWith(route);
    }
    return path === route || path.startsWith(route + '/');
  });
}

/**
 * API Route Compatibility Middleware
 */
function apiRouteCompatibility(req, res, next) {
  const originalUrl = req.originalUrl;
  const pathname = req.path;
  
  // Only process requests that start with /api/
  if (!pathname.startsWith('/api/')) {
    return next();
  }
  
  // Check if this is an API-only route that should keep the prefix
  if (isApiOnlyRoute(pathname)) {
    return next();
  }
  
  // Extract the path without /api/ prefix
  const pathWithoutApi = pathname.replace(/^\/api/, '');
  
  // If the path without /api/ is empty or just '/', skip
  if (!pathWithoutApi || pathWithoutApi === '/') {
    return next();
  }
  
  // Log the compatibility redirect for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 API Compatibility: ${pathname} -> ${pathWithoutApi}`);
  }
  
  // Modify the request to use the path without /api/ prefix
  req.url = req.url.replace(/^\/api/, '');
  req.originalUrl = originalUrl; // Keep original URL for logging
  
  // Continue to next middleware with modified path
  next();
}

module.exports = {
  apiRouteCompatibility,
  isApiOnlyRoute,
  API_ONLY_ROUTES
};