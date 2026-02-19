const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../models');

/**
 * ID Card Security Middleware
 * Implements comprehensive security measures for Student ID Card Generator
 */

class IdCardSecurity {
  /**
   * Input validation schemas for template data
   */
  static validateTemplateData() {
    return [
      body('template_name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .matches(/^[a-zA-Z0-9\s\-_]+$/)
        .withMessage('Template name must be 3-100 characters, alphanumeric with spaces, hyphens, underscores only'),
      
      body('template_type')
        .isIn(['student', 'staff'])
        .withMessage('Template type must be either student or staff'),
      
      body('dimensions')
        .isObject()
        .withMessage('Dimensions must be an object')
        .custom((value) => {
          if (!value.width || !value.height) {
            throw new Error('Dimensions must include width and height');
          }
          if (value.width < 200 || value.width > 1000 || value.height < 100 || value.height > 800) {
            throw new Error('Invalid dimensions: width 200-1000px, height 100-800px');
          }
          return true;
        }),
      
      body('background_config')
        .optional()
        .isObject()
        .custom((value) => {
          if (value.color && !/^#[0-9A-Fa-f]{6}$/.test(value.color)) {
            throw new Error('Background color must be valid hex format (#RRGGBB)');
          }
          if (value.opacity && (value.opacity < 0 || value.opacity > 1)) {
            throw new Error('Background opacity must be between 0 and 1');
          }
          return true;
        }),
      
      body('elements')
        .optional()
        .isArray()
        .custom((elements) => {
          const allowedTypes = ['text', 'image', 'barcode', 'qr_code'];
          const allowedKeys = ['student_name', 'student_id', 'class', 'photo', 'school_logo', 'qr_code', 'barcode'];
          
          for (const element of elements) {
            if (!allowedTypes.includes(element.element_type)) {
              throw new Error(`Invalid element type: ${element.element_type}`);
            }
            if (!allowedKeys.includes(element.element_key)) {
              throw new Error(`Invalid element key: ${element.element_key}`);
            }
            if (!element.position_config || typeof element.position_config !== 'object') {
              throw new Error('Each element must have position_config object');
            }
          }
          return true;
        })
    ];
  }

  /**
   * Input validation for student information
   */
  static validateStudentData() {
    return [
      body('student_id')
        .isInt({ min: 1 })
        .withMessage('Student ID must be a positive integer'),
      
      body('template_id')
        .isInt({ min: 1 })
        .withMessage('Template ID must be a positive integer'),
      
      body('card_data')
        .optional()
        .isObject()
        .custom((value) => {
          // Sanitize card data to prevent XSS
          const sanitizedData = {};
          for (const [key, val] of Object.entries(value)) {
            if (typeof val === 'string') {
              sanitizedData[key] = val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                     .replace(/javascript:/gi, '')
                                     .replace(/on\w+\s*=/gi, '')
                                     .trim();
            } else {
              sanitizedData[key] = val;
            }
          }
          return true;
        })
    ];
  }

  /**
   * File upload security configuration
   */
  static configureFileUpload(uploadType = 'photo') {
    const storage = multer.memoryStorage();
    
    const fileFilter = (req, file, cb) => {
      const allowedMimes = {
        photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        logo: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'],
        background: ['image/jpeg', 'image/jpg', 'image/png']
      };

      const allowedExts = {
        photo: ['.jpg', '.jpeg', '.png', '.webp'],
        logo: ['.jpg', '.jpeg', '.png', '.svg'],
        background: ['.jpg', '.jpeg', '.png']
      };

      const fileExt = path.extname(file.originalname).toLowerCase();
      const mimeType = file.mimetype.toLowerCase();

      // Check file extension and MIME type
      if (!allowedMimes[uploadType].includes(mimeType) || 
          !allowedExts[uploadType].includes(fileExt)) {
        return cb(new Error(`Invalid file type for ${uploadType}. Allowed: ${allowedExts[uploadType].join(', ')}`));
      }

      // Additional security checks
      if (file.originalname.includes('..') || file.originalname.includes('/')) {
        return cb(new Error('Invalid filename'));
      }

      cb(null, true);
    };

    const limits = {
      photo: { fileSize: 5 * 1024 * 1024 }, // 5MB
      logo: { fileSize: 2 * 1024 * 1024 },  // 2MB
      background: { fileSize: 10 * 1024 * 1024 } // 10MB
    };

    return multer({
      storage,
      fileFilter,
      limits: limits[uploadType]
    });
  }

  /**
   * Access control integration with existing RBAC system
   */
  static requireIdCardPermission(action) {
    return async (req, res, next) => {
      try {
        const { user_type, school_id, branch_id, id: user_id } = req.user;

        if (!user_id) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Define permission matrix
        const permissions = {
          'create_template': ['Admin', 'SuperAdmin', 'Teacher'],
          'edit_template': ['Admin', 'SuperAdmin'],
          'delete_template': ['Admin', 'SuperAdmin'],
          'generate_card': ['Admin', 'SuperAdmin', 'Teacher'],
          'view_cards': ['Admin', 'SuperAdmin', 'Teacher', 'Parent'],
          'upload_photos': ['Admin', 'SuperAdmin', 'Teacher'],
          'manage_branding': ['Admin', 'SuperAdmin']
        };

        const allowedRoles = permissions[action] || [];
        
        if (!allowedRoles.includes(user_type)) {
          return res.status(403).json({
            success: false,
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            user_role: user_type,
            required_action: action
          });
        }

        // Additional checks for specific actions
        if (action === 'view_cards' && user_type === 'Parent') {
          // Parents can only view their own children's cards
          const studentId = req.params.student_id || req.body.student_id;
          if (studentId) {
            const student = await db.Student.findOne({
              where: { id: studentId, school_id }
            });
            
            if (!student || student.parent_id !== user_id) {
              return res.status(403).json({
                success: false,
                error: 'Parents can only view their own children\'s ID cards'
              });
            }
          }
        }

        // Log access attempt
        console.log(`ID Card Access: ${user_type} (${user_id}) performing ${action} for school ${school_id}`);
        
        next();
      } catch (error) {
        console.error('ID Card permission check error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify permissions'
        });
      }
    };
  }

  /**
   * QR code data encryption for student verification
   */
  static encryptQRData(data, schoolId) {
    try {
      const secretKey = process.env.QR_ENCRYPTION_KEY || `idcard_${schoolId}_secret`;
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, secretKey);
      
      const jsonData = JSON.stringify({
        ...data,
        timestamp: Date.now(),
        school_id: schoolId
      });
      
      let encrypted = cipher.update(jsonData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('QR encryption error:', error);
      throw new Error('Failed to encrypt QR data');
    }
  }

  /**
   * QR code data decryption for verification
   */
  static decryptQRData(encryptedData, schoolId) {
    try {
      const secretKey = process.env.QR_ENCRYPTION_KEY || `idcard_${schoolId}_secret`;
      const algorithm = 'aes-256-gcm';
      
      const decipher = crypto.createDecipher(algorithm, secretKey);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const data = JSON.parse(decrypted);
      
      // Verify timestamp (valid for 1 year)
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (Date.now() - data.timestamp > oneYear) {
        throw new Error('QR code expired');
      }
      
      return data;
    } catch (error) {
      console.error('QR decryption error:', error);
      throw new Error('Invalid or expired QR code');
    }
  }

  /**
   * Audit logging for template creation and card generation
   */
  static auditLogger(action) {
    return async (req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Log the action after response
        setImmediate(async () => {
          try {
            const { user_type, school_id, branch_id, id: user_id } = req.user;
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            const auditData = {
              action,
              user_id,
              user_type,
              school_id,
              branch_id,
              ip_address: ip,
              user_agent: userAgent,
              request_data: {
                method: req.method,
                url: req.originalUrl,
                params: req.params,
                body: action.includes('upload') ? 'FILE_UPLOAD' : req.body
              },
              response_status: res.statusCode,
              timestamp: new Date()
            };

            // Store in audit log table
            await db.sequelize.query(`
              INSERT INTO id_card_audit_log 
              (action_type, user_id, school_id, branch_id, request_data, ip_address, user_agent, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, {
              replacements: [
                action,
                user_id,
                school_id,
                branch_id,
                JSON.stringify(auditData.request_data),
                ip,
                userAgent
              ]
            });

            // Log to console for monitoring
            console.log(`🔍 ID Card Audit: ${action}`, {
              user: `${user_type}(${user_id})`,
              school: school_id,
              status: res.statusCode,
              ip
            });
          } catch (error) {
            console.error('Audit logging error:', error);
          }
        });
        
        originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Validation error handler
   */
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    next();
  }

  /**
   * School/Branch context validation
   */
  static validateSchoolContext(req, res, next) {
    const { school_id, branch_id } = req.user;
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        error: 'School context required'
      });
    }

    // Add school context to request for use in controllers
    req.schoolContext = {
      school_id,
      branch_id: branch_id || null
    };
    
    next();
  }

  /**
   * Rate limiting for file uploads
   */
  static uploadRateLimit() {
    const attempts = new Map();
    
    return (req, res, next) => {
      const key = `${req.ip}_${req.user.id}`;
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const maxAttempts = 20; // 20 uploads per 15 minutes
      
      if (!attempts.has(key)) {
        attempts.set(key, []);
      }
      
      const userAttempts = attempts.get(key);
      
      // Remove old attempts
      const recentAttempts = userAttempts.filter(time => now - time < windowMs);
      
      if (recentAttempts.length >= maxAttempts) {
        return res.status(429).json({
          success: false,
          error: 'Too many upload attempts. Please try again later.',
          retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
        });
      }
      
      recentAttempts.push(now);
      attempts.set(key, recentAttempts);
      
      next();
    };
  }

  /**
   * Template ownership validation
   */
  static validateTemplateOwnership(req, res, next) {
    return async (req, res, next) => {
      try {
        const templateId = req.params.id;
        const { school_id, branch_id, user_type } = req.user;
        
        if (!templateId) {
          return next();
        }

        const template = await db.IdCardTemplate.findOne({
          where: { id: templateId }
        });

        if (!template) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }

        // Check school ownership
        if (template.school_id !== school_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this template'
          });
        }

        // Check branch ownership for non-admin users
        if (user_type !== 'SuperAdmin' && template.branch_id && template.branch_id !== branch_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this branch template'
          });
        }

        req.template = template;
        next();
      } catch (error) {
        console.error('Template ownership validation error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to validate template ownership'
        });
      }
    };
  }
}

module.exports = IdCardSecurity;