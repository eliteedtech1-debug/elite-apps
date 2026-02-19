const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');

/**
 * Enhanced security middleware for login endpoints
 */

// Helper function to get client IP address
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// Strict rate limiting for login endpoints
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to include both IP and username
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const username = req.body?.username || 'unknown';
    return `${ip}:${username}`;
  },
  // Skip successful requests
  skipSuccessfulRequests: true,
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    const ip = getClientIP(req);
    console.log(`🚨 Rate limit exceeded for IP: ${ip}, Username: ${req.body?.username}`);
    
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString()
    });
  }
});

// Progressive delay for repeated requests
const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per window without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  // Custom key generator
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const username = req.body?.username || 'unknown';
    return `${ip}:${username}`;
  },
  validate: {
    delayMs: false // Disable the warning about delayMs behavior change
  }
});

// Enhanced helmet configuration for login security
const loginHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input sanitization middleware
const sanitizeLoginInput = (req, res, next) => {
  if (req.body) {
    // Sanitize username
    if (req.body.username) {
      req.body.username = req.body.username.toString().trim().toLowerCase();
      
      // Basic validation
      if (req.body.username.length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input format'
        });
      }
    }
    
    // Sanitize password (don't modify, just validate length)
    if (req.body.password) {
      if (typeof req.body.password !== 'string' || req.body.password.length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input format'
        });
      }
    }
    
    // Sanitize school_id
    if (req.body.school_id) {
      req.body.school_id = req.body.school_id.toString().trim();
      
      if (req.body.school_id.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input format'
        });
      }
    }
  }
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Cache control for login endpoints
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  next();
};

// Request logging middleware for security monitoring
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'];
  const method = req.method;
  const url = req.originalUrl;
  
  // Log request details (without sensitive data)
  console.log(`🔐 Security Log: ${method} ${url} from ${ip}`);
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const success = data?.success !== false;
    
    console.log(`🔐 Security Response: ${res.statusCode} in ${duration}ms - Success: ${success}`);
    
    // Log failed login attempts
    if (!success && url.includes('/login')) {
      console.log(`🚨 Failed login attempt: IP=${ip}, Username=${req.body?.username}, UserAgent=${userAgent}`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Suspicious activity detection
const suspiciousActivityDetector = (req, res, next) => {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'];
  
  // Skip suspicious activity detection for superadmin-login
  if (req.path === '/superadmin-login') {
    return next();
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|java/i,
    /sqlmap|nikto|nmap|masscan/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent || '')
  );
  
  if (isSuspicious) {
    console.log(`🚨 Suspicious activity detected: IP=${ip}, UserAgent=${userAgent}`);
    
    // Log to security events (if database is available)
    // This would be implemented with actual database logging
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  next();
};

// Combine all login security middleware
const loginSecurityStack = [
  securityHeaders,
  loginHelmet,
  securityLogger,
  suspiciousActivityDetector,
  sanitizeLoginInput,
  loginSlowDown,
  loginRateLimit
];

// Export individual middleware and combined stack
module.exports = {
  loginRateLimit,
  loginSlowDown,
  loginHelmet,
  sanitizeLoginInput,
  securityHeaders,
  securityLogger,
  suspiciousActivityDetector,
  loginSecurityStack
};