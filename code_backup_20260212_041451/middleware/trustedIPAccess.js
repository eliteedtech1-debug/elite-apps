/**
 * Trusted IP Access Middleware
 * Allows trusted IPs to access the entire API without restrictions
 */

/**
 * Get client IP address from request with comprehensive detection
 */
function getClientIP(req) {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.headers['cf-connecting-ip'] || // Cloudflare
         req.headers['x-client-ip'] ||
         req.headers['x-forwarded'] ||
         req.headers['forwarded-for'] ||
         req.headers['forwarded'] ||
         'unknown';
}

/**
 * Check if IP is in CIDR range (simplified implementation)
 */
function isIPInCIDR(ip, cidr) {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  
  // Simplified CIDR check for common cases
  const [network, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength);
  
  // For IPv4 /24 networks (most common)
  if (prefix === 24) {
    const networkBase = network.substring(0, network.lastIndexOf('.'));
    const ipBase = ip.substring(0, ip.lastIndexOf('.'));
    return networkBase === ipBase;
  }
  
  // For other cases, fall back to prefix matching
  return ip.startsWith(network.substring(0, network.lastIndexOf('.')));
}

/**
 * Get trusted IPs from environment and configuration
 */
function getTrustedIPs() {
  const trustedIPs = new Set();
  
  // Default trusted IPs
  const defaultTrustedIPs = [
    '102.210.146.74', // skcoolyplus.org.ng
    '208.115.219.142', // Additional whitelisted IP
  ];
  
  // Add default IPs
  defaultTrustedIPs.forEach(ip => trustedIPs.add(ip));
  
  // Add environment-configured IPs
  if (process.env.ALLOWED_IPS) {
    const envIPs = process.env.ALLOWED_IPS.split(',').map(ip => ip.trim());
    envIPs.forEach(ip => trustedIPs.add(ip));
  }
  
  // Add trusted IP ranges for production
  if (process.env.TRUSTED_IP_RANGES) {
    const ranges = process.env.TRUSTED_IP_RANGES.split(',').map(range => range.trim());
    ranges.forEach(range => trustedIPs.add(range));
  }
  
  // In development, add localhost IPs
  if (process.env.NODE_ENV === 'development') {
    trustedIPs.add('127.0.0.1');
    trustedIPs.add('::1');
    trustedIPs.add('localhost');
    trustedIPs.add('::ffff:127.0.0.1'); // IPv6 mapped IPv4
  }
  
  return Array.from(trustedIPs);
}

/**
 * Check if an IP is trusted
 */
function isTrustedIP(clientIP) {
  const trustedIPs = getTrustedIPs();
  
  // Direct IP match
  if (trustedIPs.includes(clientIP)) {
    return true;
  }
  
  // Check CIDR ranges and partial matches
  return trustedIPs.some(trustedIP => {
    // CIDR notation
    if (trustedIP.includes('/')) {
      return isIPInCIDR(clientIP, trustedIP);
    }
    
    // Subnet prefix (e.g., "192.168.1.")
    if (trustedIP.endsWith('.')) {
      return clientIP.startsWith(trustedIP);
    }
    
    // Exact match
    return clientIP === trustedIP;
  });
}

/**
 * Trusted IP bypass middleware
 * This middleware should be applied early in the middleware stack
 */
function trustedIPBypass(options = {}) {
  const {
    logAccess = true,
    bypassAuthentication = true,
    bypassRateLimit = true,
    bypassCORS = false, // Usually we still want CORS for browsers
    allowedPaths = ['*'], // '*' means all paths
    deniedPaths = [] // Paths that trusted IPs cannot access
  } = options;
  
  return (req, res, next) => {
    const clientIP = getClientIP(req);
    
    // Check if this is a trusted IP
    if (!isTrustedIP(clientIP)) {
      // Not a trusted IP, continue with normal middleware chain
      return next();
    }
    
    // Check if path is denied for trusted IPs
    if (deniedPaths.length > 0) {
      const isDenied = deniedPaths.some(deniedPath => {
        if (deniedPath === '*') return true;
        if (deniedPath.endsWith('*')) {
          return req.path.startsWith(deniedPath.slice(0, -1));
        }
        return req.path === deniedPath || req.path.startsWith(deniedPath + '/');
      });
      
      if (isDenied) {
        if (logAccess) {
          console.log(`🚫 Trusted IP ${clientIP} denied access to restricted path: ${req.path}`);
        }
        return next(); // Continue with normal middleware
      }
    }
    
    // Check if path is allowed for trusted IPs
    if (allowedPaths[0] !== '*') {
      const isAllowed = allowedPaths.some(allowedPath => {
        if (allowedPath === '*') return true;
        if (allowedPath.endsWith('*')) {
          return req.path.startsWith(allowedPath.slice(0, -1));
        }
        return req.path === allowedPath || req.path.startsWith(allowedPath + '/');
      });
      
      if (!isAllowed) {
        if (logAccess) {
          console.log(`🚫 Trusted IP ${clientIP} accessing non-whitelisted path: ${req.path}`);
        }
        return next(); // Continue with normal middleware
      }
    }
    
    if (logAccess) {
      console.log(`🔑 Trusted IP detected: ${clientIP} accessing ${req.method} ${req.path}`);
    }
    
    // Mark request as coming from trusted IP
    req.isTrustedIP = true;
    req.trustedIPAddress = clientIP;
    
    // Bypass authentication if enabled
    if (bypassAuthentication) {
      req.skipAuthentication = true;
      if (logAccess) {
        console.log(`🔓 Authentication bypassed for trusted IP: ${clientIP}`);
      }
    }
    
    // Bypass rate limiting if enabled
    if (bypassRateLimit) {
      req.skipRateLimit = true;
      if (logAccess) {
        console.log(`⚡ Rate limiting bypassed for trusted IP: ${clientIP}`);
      }
    }
    
    // Add trusted IP headers for downstream middleware
    res.setHeader('X-Trusted-IP', 'true');
    res.setHeader('X-Client-IP', clientIP);
    
    next();
  };
}

/**
 * Rate limit bypass middleware for trusted IPs
 */
function trustedIPRateLimitBypass(req, res, next) {
  if (req.isTrustedIP || req.skipRateLimit) {
    // Skip rate limiting for trusted IPs
    return next();
  }
  next();
}

/**
 * Authentication bypass middleware for trusted IPs
 */
function trustedIPAuthBypass(req, res, next) {
  if (req.isTrustedIP || req.skipAuthentication) {
    // Skip authentication for trusted IPs
    console.log(`🔑 Authentication bypassed for trusted IP: ${req.trustedIPAddress || getClientIP(req)}`);
    return next();
  }
  next();
}

/**
 * Enhanced rate limiter that respects trusted IPs
 */
function createTrustedIPAwareRateLimit(rateLimitConfig) {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    ...rateLimitConfig,
    skip: (req) => {
      // Skip rate limiting for trusted IPs
      if (req.isTrustedIP || req.skipRateLimit) {
        return true;
      }
      
      // Apply original skip logic if provided
      if (rateLimitConfig.skip) {
        return rateLimitConfig.skip(req);
      }
      
      return false;
    }
  });
}

/**
 * Middleware to log trusted IP access
 */
function trustedIPLogger(req, res, next) {
  if (req.isTrustedIP) {
    const originalSend = res.send;
    res.send = function(data) {
      console.log(`🔑 Trusted IP ${req.trustedIPAddress} completed ${req.method} ${req.path} - Status: ${res.statusCode}`);
      return originalSend.call(this, data);
    };
  }
  next();
}

/**
 * Get trusted IP status for debugging
 */
function getTrustedIPStatus() {
  const trustedIPs = getTrustedIPs();
  return {
    trustedIPs,
    count: trustedIPs.length,
    environment: process.env.NODE_ENV,
    allowedIPs: process.env.ALLOWED_IPS,
    trustedRanges: process.env.TRUSTED_IP_RANGES
  };
}

module.exports = {
  trustedIPBypass,
  trustedIPRateLimitBypass,
  trustedIPAuthBypass,
  createTrustedIPAwareRateLimit,
  trustedIPLogger,
  isTrustedIP,
  getClientIP,
  getTrustedIPs,
  getTrustedIPStatus
};