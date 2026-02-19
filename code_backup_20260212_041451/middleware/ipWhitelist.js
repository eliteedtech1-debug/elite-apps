/**
 * IP Whitelist Middleware
 * Provides IP-based access control for sensitive endpoints
 */

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         'unknown';
}

/**
 * IP whitelist middleware factory
 */
function createIPWhitelist(options = {}) {
  const {
    allowedIPs = [],
    allowLocalhost = true,
    allowPrivateNetworks = false,
    errorMessage = 'Access denied from this IP address',
    logAccess = true
  } = options;
  
  // Default allowed IPs
  const defaultAllowedIPs = [
    '102.210.146.74', // skcoolyplus.org.ng
    '208.115.219.142', // Additional whitelisted IP
  ];
  
  // Add environment-configured IPs
  const envIPs = process.env.ALLOWED_IPS ? 
    process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()) : [];
  
  const finalAllowedIPs = [...defaultAllowedIPs, ...allowedIPs, ...envIPs];
  
  // Add localhost IPs if allowed
  if (allowLocalhost) {
    finalAllowedIPs.push('127.0.0.1', '::1', 'localhost');
  }
  
  // Add private network ranges if allowed
  if (allowPrivateNetworks) {
    // This is a simplified check - in production, you might want more sophisticated CIDR checking
    finalAllowedIPs.push('10.', '172.16.', '192.168.');
  }
  
  return (req, res, next) => {
    const clientIP = getClientIP(req);
    
    if (logAccess) {
      console.log(`🔍 IP whitelist check: ${clientIP} for ${req.method} ${req.path}`);
    }
    
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      if (logAccess) {
        console.log(`🔓 Development mode: IP whitelist bypassed for ${clientIP}`);
      }
      return next();
    }
    
    // Check if IP is allowed
    const isAllowed = finalAllowedIPs.some(allowedIP => {
      if (allowedIP.endsWith('.')) {
        // Subnet check (simplified)
        return clientIP.startsWith(allowedIP);
      }
      return clientIP === allowedIP;
    });
    
    if (isAllowed) {
      if (logAccess) {
        console.log(`✅ IP whitelist: Access granted for ${clientIP}`);
      }
      return next();
    }
    
    // Access denied
    if (logAccess) {
      console.log(`🚫 IP whitelist: Access denied for ${clientIP}`);
      console.log(`   Allowed IPs: ${finalAllowedIPs.join(', ')}`);
    }
    
    return res.status(403).json({
      success: false,
      message: errorMessage,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * Predefined middleware for admin endpoints
 */
const adminIPWhitelist = createIPWhitelist({
  allowedIPs: ['102.210.146.74', '208.115.219.142'], // skcoolyplus.org.ng and additional IP
  allowLocalhost: true,
  allowPrivateNetworks: false,
  errorMessage: 'Admin access denied from this IP address',
  logAccess: true
});

/**
 * Predefined middleware for API endpoints
 */
const apiIPWhitelist = createIPWhitelist({
  allowedIPs: ['102.210.146.74', '208.115.219.142'], // skcoolyplus.org.ng and additional IP
  allowLocalhost: true,
  allowPrivateNetworks: true, // Allow private networks for API access
  errorMessage: 'API access denied from this IP address',
  logAccess: true
});

module.exports = {
  createIPWhitelist,
  adminIPWhitelist,
  apiIPWhitelist,
  getClientIP
};
