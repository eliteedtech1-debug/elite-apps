/**
 * Security Configuration
 * Environment-specific security settings and constants
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  // Environment flags
  isProduction,
  isDevelopment,

  // Rate limiting configuration
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 500 : 1000, // Stricter in production
      message: 'Too many requests from this IP, please try again later.'
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 5 : 10, // Stricter in production
      message: 'Too many authentication attempts, please try again later.'
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Very strict for password resets
      message: 'Too many password reset attempts, please try again later.'
    },
    upload: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 20 : 50, // Stricter in production
      message: 'Too many upload attempts, please try again later.'
    }
  },

  // Content Security Policy domains
  csp: {
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for many UI frameworks
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com",
      "https://cdn.jsdelivr.net",
      "https://stackpath.bootstrapcdn.com"
    ],
    scriptSrc: [
      "'self'",
      ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : []), // Only in development
      "https://cdnjs.cloudflare.com",
      "https://cdn.jsdelivr.net",
      "https://js.paystack.co",
      "https://checkout.flutterwave.com"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "https://res.cloudinary.com",
      "https://cloudinary.com",
      "https://images.unsplash.com"
    ],
    connectSrc: [
      "'self'",
      "https://api.cloudinary.com",
      "https://api.paystack.co",
      "https://api.flutterwave.com",
      "wss:",
      ...(isDevelopment ? ["http://localhost:*", "ws://localhost:*"] : [])
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://cdnjs.cloudflare.com",
      "https://stackpath.bootstrapcdn.com"
    ],
    frameSrc: [
      "'self'",
      "https://js.paystack.co",
      "https://checkout.flutterwave.com"
    ]
  },

  // HSTS configuration
  hsts: {
    maxAge: isProduction ? 31536000 : 0, // 1 year in production, disabled in development
    includeSubDomains: isProduction,
    preload: isProduction
  },

  // Trusted domains for CORS
  trustedDomains: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    ...(isProduction ? [
      'https://yourdomain.com',
      'https://www.yourdomain.com',
      'https://app.yourdomain.com'
    ] : [])
  ].filter(Boolean),

  // Security headers
  headers: {
    // Remove server information
    removeHeaders: ['X-Powered-By', 'Server'],
    
    // Custom security headers
    customHeaders: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=self, microphone=self, geolocation=self, payment=self'
    }
  },

  // Input validation patterns
  validation: {
    suspiciousPatterns: [
      /\.\./,  // Directory traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /javascript:/i,  // JavaScript injection
      /vbscript:/i,  // VBScript injection
      /onload=/i,  // Event handler injection
      /onerror=/i,  // Error handler injection
      /eval\(/i,  // Eval injection
      /expression\(/i,  // CSS expression injection
      /import\s/i,  // ES6 import injection
      /require\(/i  // Node.js require injection
    ],
    
    // Maximum lengths for different input types
    maxLengths: {
      email: 254,
      password: 128,
      name: 100,
      description: 1000,
      url: 2048,
      phone: 20
    }
  },

  // File upload security
  upload: {
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  },

  // Session security
  session: {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  },

  // JWT security
  jwt: {
    secret: process.env.JWT_SECRET_KEY || 'your-jwt-secret',
    expiresIn: '24h',
    algorithm: 'HS256'
  },

  // Database security
  database: {
    ssl: isProduction,
    connectionLimit: 10,
    acquire: 60000, // Changed from acquireTimeout (deprecated in MySQL2)
    timeout: 60000
  },

  // Logging configuration
  logging: {
    level: isProduction ? 'warn' : 'debug',
    logSuspiciousActivity: true,
    logFailedAuth: true,
    logRateLimitHits: true
  }
};