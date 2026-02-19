const IdCardSecurity = require('./idCardSecurity');
const IdCardValidation = require('../validation/idCardValidation');
const IdCardFileUpload = require('./idCardFileUpload');
const IdCardAuditLogger = require('../services/idCardAuditLogger');
const { validationResult } = require('express-validator');

/**
 * Comprehensive Security Integration for ID Card System
 * Orchestrates all security components for complete protection
 */

class IdCardSecurityIntegration {
  /**
   * Complete security middleware stack for template operations
   */
  static templateSecurityStack(action) {
    const middlewares = [];

    // 1. Authentication and authorization
    middlewares.push(IdCardSecurity.requireIdCardPermission(action));
    
    // 2. School context validation
    middlewares.push(IdCardSecurity.validateSchoolContext);
    
    // 3. Input validation based on action
    switch (action) {
      case 'create':
        middlewares.push(...IdCardValidation.createTemplate());
        break;
      case 'update':
        middlewares.push(...IdCardValidation.updateTemplate());
        break;
      case 'delete':
        middlewares.push(IdCardSecurity.validateTemplateOwnership);
        break;
    }
    
    // 4. Validation error handler
    middlewares.push(IdCardSecurity.handleValidationErrors);
    
    // 5. Audit logging
    middlewares.push(IdCardAuditLogger.createAuditMiddleware(`template_${action}`, 'template'));
    
    return middlewares;
  }

  /**
   * Complete security middleware stack for card generation
   */
  static cardGenerationSecurityStack(action) {
    const middlewares = [];

    // 1. Authentication and authorization
    middlewares.push(IdCardSecurity.requireIdCardPermission('generate_card'));
    
    // 2. School context validation
    middlewares.push(IdCardSecurity.validateSchoolContext);
    
    // 3. Input validation
    if (action === 'single') {
      middlewares.push(...IdCardValidation.generateSingleCard());
    } else if (action === 'batch') {
      middlewares.push(...IdCardValidation.generateBatchCards());
    }
    
    // 4. Validation error handler
    middlewares.push(IdCardSecurity.handleValidationErrors);
    
    // 5. Rate limiting for generation
    middlewares.push(this.createGenerationRateLimit());
    
    // 6. Audit logging
    middlewares.push(IdCardAuditLogger.createAuditMiddleware(`card_generation_${action}`, 'card_generation'));
    
    return middlewares;
  }

  /**
   * Complete security middleware stack for file uploads
   */
  static fileUploadSecurityStack(uploadType, isMultiple = false) {
    const middlewares = [];

    // 1. Authentication and authorization
    middlewares.push(IdCardSecurity.requireIdCardPermission('upload_photos'));
    
    // 2. School context validation
    middlewares.push(IdCardSecurity.validateSchoolContext);
    
    // 3. Upload rate limiting
    middlewares.push(IdCardFileUpload.createUploadRateLimit());
    
    // 4. File upload middleware
    if (isMultiple) {
      middlewares.push(IdCardFileUpload.createBulkUploadMiddleware(uploadType));
      middlewares.push(...IdCardValidation.validateBulkPhotoUpload());
    } else {
      middlewares.push(IdCardFileUpload.createSingleUploadMiddleware(uploadType));
      middlewares.push(...IdCardValidation.validateFileUpload(uploadType));
    }
    
    // 5. File upload error handler
    middlewares.push(IdCardFileUpload.handleUploadError);
    
    // 6. Validation error handler
    middlewares.push(IdCardSecurity.handleValidationErrors);
    
    // 7. File processing and security scanning
    middlewares.push(this.createFileProcessingMiddleware(uploadType));
    
    // 8. Audit logging
    middlewares.push(IdCardAuditLogger.createAuditMiddleware(`file_upload_${uploadType}`, 'file_upload'));
    
    return middlewares;
  }

  /**
   * Security middleware for QR code verification
   */
  static qrVerificationSecurityStack() {
    return [
      // Allow anonymous access for QR verification
      this.createAnonymousAuthMiddleware(),
      ...IdCardValidation.validateQRVerification(),
      IdCardSecurity.handleValidationErrors,
      this.createQRVerificationRateLimit(),
      IdCardAuditLogger.createAuditMiddleware('qr_verification', 'verification')
    ];
  }

  /**
   * Security middleware for viewing operations
   */
  static viewSecurityStack(resourceType) {
    return [
      IdCardSecurity.requireIdCardPermission('view_cards'),
      IdCardSecurity.validateSchoolContext,
      ...IdCardValidation.validateCardQuery(),
      IdCardSecurity.handleValidationErrors,
      IdCardAuditLogger.createAuditMiddleware(`view_${resourceType}`, resourceType)
    ];
  }

  /**
   * Create file processing middleware
   */
  static createFileProcessingMiddleware(uploadType) {
    return async (req, res, next) => {
      try {
        const userContext = {
          id: req.user.id,
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        };

        if (req.files && req.files.length > 0) {
          // Process multiple files
          const processedFiles = [];
          
          for (const file of req.files) {
            try {
              const processed = await IdCardFileUpload.processUploadedFile(
                file, 
                uploadType, 
                userContext
              );
              processedFiles.push(processed);
            } catch (error) {
              // Log security event for failed file processing
              await IdCardAuditLogger.logSecurityEvent('file_processing_failed', {
                severity: 'medium',
                description: `File processing failed: ${error.message}`,
                resource: file.originalname
              }, {
                id: req.user.id,
                user_type: req.user.user_type,
                school_id: req.user.school_id,
                ip: req.ip,
                userAgent: req.get('User-Agent')
              });
              
              throw error;
            }
          }
          
          req.processedFiles = processedFiles;
        } else if (req.file) {
          // Process single file
          try {
            const processed = await IdCardFileUpload.processUploadedFile(
              req.file, 
              uploadType, 
              userContext
            );
            req.processedFile = processed;
          } catch (error) {
            await IdCardAuditLogger.logSecurityEvent('file_processing_failed', {
              severity: 'medium',
              description: `File processing failed: ${error.message}`,
              resource: req.file.originalname
            }, {
              id: req.user.id,
              user_type: req.user.user_type,
              school_id: req.user.school_id,
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });
            
            throw error;
          }
        }

        next();
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    };
  }

  /**
   * Create generation rate limiting
   */
  static createGenerationRateLimit() {
    const attempts = new Map();
    
    return (req, res, next) => {
      const key = `gen_${req.user.id}_${req.user.school_id}`;
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hour
      const maxGenerations = req.body.student_ids ? 50 : 100; // Lower limit for batch
      
      if (!attempts.has(key)) {
        attempts.set(key, []);
      }
      
      const userAttempts = attempts.get(key);
      const recentAttempts = userAttempts.filter(time => now - time < windowMs);
      
      if (recentAttempts.length >= maxGenerations) {
        // Log security event for rate limit exceeded
        IdCardAuditLogger.logSecurityEvent('rate_limit_exceeded', {
          severity: 'medium',
          description: 'Card generation rate limit exceeded',
          resource: 'card_generation'
        }, {
          id: req.user.id,
          user_type: req.user.user_type,
          school_id: req.user.school_id,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(429).json({
          success: false,
          error: 'Generation rate limit exceeded',
          retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
        });
      }
      
      recentAttempts.push(now);
      attempts.set(key, recentAttempts);
      
      next();
    };
  }

  /**
   * Create QR verification rate limiting
   */
  static createQRVerificationRateLimit() {
    const attempts = new Map();
    
    return (req, res, next) => {
      const key = `qr_${req.ip}`;
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const maxVerifications = 50;
      
      if (!attempts.has(key)) {
        attempts.set(key, []);
      }
      
      const ipAttempts = attempts.get(key);
      const recentAttempts = ipAttempts.filter(time => now - time < windowMs);
      
      if (recentAttempts.length >= maxVerifications) {
        // Log security event for suspicious QR verification activity
        IdCardAuditLogger.logSecurityEvent('qr_rate_limit_exceeded', {
          severity: 'high',
          description: 'Excessive QR verification attempts from IP',
          resource: 'qr_verification'
        }, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(429).json({
          success: false,
          error: 'Too many verification attempts',
          retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
        });
      }
      
      recentAttempts.push(now);
      attempts.set(key, recentAttempts);
      
      next();
    };
  }

  /**
   * Create anonymous authentication middleware for QR verification
   */
  static createAnonymousAuthMiddleware() {
    return (req, res, next) => {
      // Allow anonymous access but try to get user info if available
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        try {
          const jwt = require('jsonwebtoken');
          const token = authHeader.replace('Bearer ', '');
          const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET);
          
          req.user = {
            id: decoded.id || decoded.userId,
            user_type: decoded.user_type || decoded.userType,
            school_id: decoded.school_id || decoded.schoolId,
            branch_id: decoded.branch_id || decoded.branchId
          };
        } catch (error) {
          // Invalid token, continue as anonymous
          req.user = null;
        }
      } else {
        req.user = null;
      }
      
      next();
    };
  }

  /**
   * Create comprehensive error handler for ID Card operations
   */
  static createErrorHandler() {
    return async (error, req, res, next) => {
      // Log security event for errors
      if (req.user) {
        await IdCardAuditLogger.logSecurityEvent('operation_error', {
          severity: 'low',
          description: error.message,
          resource: req.originalUrl
        }, {
          id: req.user.id,
          user_type: req.user.user_type,
          school_id: req.user.school_id,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      // Handle different types of errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details
        });
      }

      if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (error.name === 'ForbiddenError') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Generic error response
      console.error('ID Card operation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    };
  }

  /**
   * Create security headers middleware
   */
  static createSecurityHeaders() {
    return (req, res, next) => {
      // ID Card specific security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Cache control for sensitive operations
      if (req.path.includes('/generate') || req.path.includes('/upload')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }
      
      next();
    };
  }

  /**
   * Create complete security middleware stack for any ID Card route
   */
  static createCompleteSecurityStack(operation, options = {}) {
    const middlewares = [
      this.createSecurityHeaders()
    ];

    switch (operation) {
      case 'template_create':
        middlewares.push(...this.templateSecurityStack('create'));
        break;
      case 'template_update':
        middlewares.push(...this.templateSecurityStack('update'));
        break;
      case 'template_delete':
        middlewares.push(...this.templateSecurityStack('delete'));
        break;
      case 'card_generate_single':
        middlewares.push(...this.cardGenerationSecurityStack('single'));
        break;
      case 'card_generate_batch':
        middlewares.push(...this.cardGenerationSecurityStack('batch'));
        break;
      case 'file_upload_single':
        middlewares.push(...this.fileUploadSecurityStack(options.uploadType || 'photo', false));
        break;
      case 'file_upload_bulk':
        middlewares.push(...this.fileUploadSecurityStack(options.uploadType || 'photo', true));
        break;
      case 'qr_verification':
        middlewares.push(...this.qrVerificationSecurityStack());
        break;
      case 'view_cards':
        middlewares.push(...this.viewSecurityStack('cards'));
        break;
      case 'view_templates':
        middlewares.push(...this.viewSecurityStack('templates'));
        break;
      default:
        // Basic security for other operations
        middlewares.push(
          IdCardSecurity.requireIdCardPermission('view_cards'),
          IdCardSecurity.validateSchoolContext,
          IdCardAuditLogger.createAuditMiddleware(operation, 'general')
        );
    }

    // Add error handler at the end
    middlewares.push(this.createErrorHandler());

    return middlewares;
  }
}

module.exports = IdCardSecurityIntegration;