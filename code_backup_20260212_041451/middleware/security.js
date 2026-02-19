const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Security Middleware Configuration
 * Implements comprehensive security headers and protections using Helmet.js
 */

/**
 * Configure Helmet with custom security policies
 */
const configureHelmet = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", // Allow inline styles for UI frameworks
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net"
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Allow inline scripts (be cautious in production)
          "'unsafe-eval'", // Allow eval for development tools
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://js.paystack.co" // For payment integration
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "blob:",
          "https:", // Allow all HTTPS images
          "https://res.cloudinary.com", // Cloudinary images
          "https://cloudinary.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],
        connectSrc: [
          "'self'",
          "https://api.cloudinary.com",
          "https://api.paystack.co",
          "wss:", // WebSocket connections
          isProduction ? "https:" : "http://localhost:*" // Allow localhost in development
        ],
        frameSrc: [
          "'self'",
          "https://js.paystack.co" // For payment frames
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "data:"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null // Only in production
      },
      reportOnly: !isProduction // Report-only mode in development
    },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disable for compatibility with external resources

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: "same-origin-allow-popups" // Allow popups for payment gateways
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: "cross-origin" // Allow cross-origin requests for API
    },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false // Disable DNS prefetching for privacy
    },

    // Expect-CT (Certificate Transparency)
    expectCt: isProduction ? {
      maxAge: 86400, // 24 hours
      enforce: true,
      reportUri: process.env.CT_REPORT_URI || undefined
    } : false,

    // Feature Policy / Permissions Policy
    permissionsPolicy: {
      camera: ["'self'"],
      microphone: ["'self'"],
      geolocation: ["'self'"],
      payment: ["'self'", "https://js.paystack.co"],
      usb: ["'none'"],
      bluetooth: ["'none'"],
      magnetometer: ["'none'"],
      gyroscope: ["'none'"],
      accelerometer: ["'none'"]
    },

    // Frame Options
    frameguard: {
      action: 'deny' // Prevent clickjacking
    },

    // Hide Powered-By header
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false,

    // IE No Open
    ieNoOpen: true,

    // No Sniff
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Referrer Policy - more permissive for development, strict for production
    referrerPolicy: {
      policy: isProduction ? ["no-referrer", "strict-origin-when-cross-origin"] : ["no-referrer-when-downgrade"]
    },

    // X-XSS-Protection
    xssFilter: true
  });
};

/**
 * Rate limiting configuration
 */
const configureRateLimit = () => {
  // General API rate limit
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for health checks and static files
      return req.path === '/health' || req.path.startsWith('/static');
    }
  });

  // Strict rate limit for authentication endpoints (DISABLED)
  const authLimiter = (req, res, next) => {
    // Pass through all authentication requests without rate limiting
    next();
  };

  // Password reset rate limit
  const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 password reset attempts per hour
    message: {
      error: 'Too many password reset attempts, please try again later.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // File upload rate limit
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 uploads per windowMs
    message: {
      error: 'Too many upload attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  return {
    general: generalLimiter,
    auth: authLimiter,
    passwordReset: passwordResetLimiter,
    upload: uploadLimiter
  };
};

/**
 * Additional security headers
 */
const additionalSecurityHeaders = (req, res, next) => {
  // Server information hiding
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // More permissive referrer policy for development, strict for production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  } else {
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  }
  
  // Cache control for sensitive endpoints
  if (req.path.includes('/api/') && !req.path.includes('/public/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // CORS security headers (additional to existing CORS middleware)
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  
  next();
};

/**
 * Security logging middleware
 */
const securityLogger = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /vbscript:/i,  // VBScript injection
    /onload=/i,  // Event handler injection
    /onerror=/i  // Error handler injection
  ];
  
  const userAgent = req.get('User-Agent') || '';
  const requestUrl = req.originalUrl || req.url;
  const requestBody = JSON.stringify(req.body || {});
  
  // Check for suspicious patterns
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(requestUrl) || 
    pattern.test(requestBody) || 
    pattern.test(userAgent)
  );
  
  if (isSuspicious) {
    console.warn('🚨 Suspicious request detected:', {
      ip: req.ip,
      userAgent: userAgent,
      url: requestUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  // Log failed authentication attempts
  res.on('finish', () => {
    if (req.path.includes('/login') && res.statusCode === 401) {
      console.warn('🔐 Failed login attempt:', {
        ip: req.ip,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
};

/**
 * Input sanitization middleware
 */
const inputSanitizer = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
};

/**
 * Sanitize string values
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove potentially dangerous characters
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

module.exports = {
  configureHelmet,
  configureRateLimit,
  additionalSecurityHeaders,
  securityLogger,
  inputSanitizer
};