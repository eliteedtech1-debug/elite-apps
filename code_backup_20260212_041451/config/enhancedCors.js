/**
 * Enhanced CORS Configuration with IP Whitelist Support
 * Supports both domain names and IP addresses for skcoolyplus.org.ng
 */

const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

// Cache for IP lookups to avoid repeated DNS queries
const ipCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve domain to IP address with caching
 */
async function resolveToIP(domain) {
  const now = Date.now();
  const cached = ipCache.get(domain);
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.ip;
  }
  
  try {
    const result = await lookup(domain);
    const ip = result.address;
    ipCache.set(domain, { ip, timestamp: now });
    console.log(`🔍 DNS lookup: ${domain} -> ${ip}`);
    return ip;
  } catch (error) {
    console.warn(`⚠️ DNS lookup failed for ${domain}:`, error.message);
    return null;
  }
}

/**
 * Enhanced CORS origin checker with IP whitelist support
 */
const createEnhancedCorsOptions = () => {
  return {
    origin: function (origin, callback) {
      // 🔓 PERMISSIVE CORS: Allow all origins if they have valid Bearer token
      // The security is now handled by the Bearer token authentication
      
      console.log(`🌐 CORS check for origin: ${origin || 'no-origin'}`);
      
      // Always allow requests - security is handled by Bearer token
      console.log(`✅ CORS allowed (permissive mode): ${origin || 'no-origin'}`);
      return callback(null, true);
    },
    
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      // Branch context headers (both cases for compatibility)
      "x-school-id",
      "X-School-Id",
      "X-School-ID",
      "x-branch-id", 
      "X-Branch-Id",
      "X-Branch-ID",
      "x-admin-needs-branch",
      "X-Admin-Needs-Branch",
      "x-auto-selected-branch",
      "X-Auto-Selected-Branch",
      // User context headers
      "X-User-Id",
      "X-User-Type",
      "x-user-id",
      "x-user-type",
      // Additional common headers
      "Accept",
      "Origin",
      "Cache-Control",
      "X-Forwarded-For",
      "User-Agent"
    ],
    
    exposedHeaders: [
      "x-school-id",
      "x-branch-id",
      "x-admin-needs-branch",
      "x-auto-selected-branch"
    ],
    
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false
  };
};

/**
 * IP-based rate limiting middleware
 */
const createIPRateLimiter = () => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: function(req) {
      // Get client IP
      const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      
      // Higher limits for whitelisted IPs
      const allowedIPs = [
        '102.210.146.74', // skcoolyplus.org.ng
        '208.115.219.142', // Additional whitelisted IP
        '127.0.0.1',
        '::1'
      ];
      
      if (process.env.ALLOWED_IPS) {
        const envIPs = process.env.ALLOWED_IPS.split(',').map(ip => ip.trim());
        allowedIPs.push(...envIPs);
      }
      
      if (allowedIPs.includes(clientIP)) {
        console.log(`🚀 Higher rate limit for whitelisted IP: ${clientIP}`);
        return 2000; // Higher limit for whitelisted IPs
      }
      
      return 1000; // Standard limit
    },
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: function(req) {
      // Skip rate limiting for whitelisted IPs in development
      if (process.env.NODE_ENV === 'development') {
        const clientIP = req.ip || req.connection.remoteAddress;
        return clientIP === '127.0.0.1' || clientIP === '::1';
      }
      return false;
    }
  });
};

module.exports = {
  createEnhancedCorsOptions,
  createIPRateLimiter,
  resolveToIP
};
