const { body, param, query } = require('express-validator');

/**
 * ID Card Validation Schemas
 * Comprehensive validation rules for all ID Card operations
 */

class IdCardValidation {
  /**
   * Template creation validation
   */
  static createTemplate() {
    return [
      body('template_name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .matches(/^[a-zA-Z0-9\s\-_()]+$/)
        .withMessage('Template name: 3-100 chars, alphanumeric with spaces, hyphens, underscores, parentheses'),
      
      body('template_type')
        .isIn(['student', 'staff'])
        .withMessage('Template type must be student or staff'),
      
      body('dimensions')
        .isObject()
        .withMessage('Dimensions must be an object')
        .custom((value) => {
          const { width, height, unit } = value;
          
          if (!width || !height) {
            throw new Error('Dimensions must include width and height');
          }
          
          if (typeof width !== 'number' || typeof height !== 'number') {
            throw new Error('Width and height must be numbers');
          }
          
          if (unit && !['px', 'mm', 'in'].includes(unit)) {
            throw new Error('Unit must be px, mm, or in');
          }
          
          // Standard ID card size validation (in pixels)
          if (width < 200 || width > 1200 || height < 100 || height > 800) {
            throw new Error('Invalid dimensions: width 200-1200px, height 100-800px');
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
          
          if (value.opacity !== undefined) {
            if (typeof value.opacity !== 'number' || value.opacity < 0 || value.opacity > 1) {
              throw new Error('Background opacity must be number between 0 and 1');
            }
          }
          
          if (value.image_url && typeof value.image_url !== 'string') {
            throw new Error('Background image URL must be string');
          }
          
          return true;
        }),
      
      body('layout_config')
        .optional()
        .isObject()
        .custom((value) => {
          const allowedProps = ['margin', 'padding', 'border_radius', 'orientation'];
          const invalidProps = Object.keys(value).filter(key => !allowedProps.includes(key));
          
          if (invalidProps.length > 0) {
            throw new Error(`Invalid layout properties: ${invalidProps.join(', ')}`);
          }
          
          if (value.orientation && !['portrait', 'landscape'].includes(value.orientation)) {
            throw new Error('Orientation must be portrait or landscape');
          }
          
          return true;
        })
    ];
  }

  /**
   * Template update validation
   */
  static updateTemplate() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('Template ID must be positive integer'),
      
      body('template_name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .matches(/^[a-zA-Z0-9\s\-_()]+$/)
        .withMessage('Template name: 3-100 chars, alphanumeric with spaces, hyphens, underscores, parentheses'),
      
      body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be boolean'),
      
      body('is_default')
        .optional()
        .isBoolean()
        .withMessage('is_default must be boolean'),
      
      body('dimensions')
        .optional()
        .isObject()
        .custom((value) => {
          if (value.width && (typeof value.width !== 'number' || value.width < 200 || value.width > 1200)) {
            throw new Error('Width must be number between 200-1200');
          }
          if (value.height && (typeof value.height !== 'number' || value.height < 100 || value.height > 800)) {
            throw new Error('Height must be number between 100-800');
          }
          return true;
        })
    ];
  }

  /**
   * Template element validation
   */
  static templateElements() {
    return [
      body('elements')
        .isArray()
        .withMessage('Elements must be array')
        .custom((elements) => {
          const allowedTypes = ['text', 'image', 'barcode', 'qr_code'];
          const allowedKeys = [
            'student_name', 'student_id', 'admission_number', 'class', 'section',
            'photo', 'school_logo', 'school_name', 'qr_code', 'barcode',
            'valid_until', 'issue_date', 'contact_info'
          ];
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            
            if (!element.element_type || !allowedTypes.includes(element.element_type)) {
              throw new Error(`Element ${i}: Invalid type. Allowed: ${allowedTypes.join(', ')}`);
            }
            
            if (!element.element_key || !allowedKeys.includes(element.element_key)) {
              throw new Error(`Element ${i}: Invalid key. Allowed: ${allowedKeys.join(', ')}`);
            }
            
            if (!element.position_config || typeof element.position_config !== 'object') {
              throw new Error(`Element ${i}: position_config must be object`);
            }
            
            const { x, y, width, height } = element.position_config;
            if (typeof x !== 'number' || typeof y !== 'number' || 
                typeof width !== 'number' || typeof height !== 'number') {
              throw new Error(`Element ${i}: position values must be numbers`);
            }
            
            if (x < 0 || y < 0 || width <= 0 || height <= 0) {
              throw new Error(`Element ${i}: invalid position values`);
            }
            
            // Validate style config for text elements
            if (element.element_type === 'text' && element.style_config) {
              const style = element.style_config;
              if (style.font_size && (typeof style.font_size !== 'number' || style.font_size < 8 || style.font_size > 72)) {
                throw new Error(`Element ${i}: font_size must be number between 8-72`);
              }
              if (style.color && !/^#[0-9A-Fa-f]{6}$/.test(style.color)) {
                throw new Error(`Element ${i}: color must be valid hex format`);
              }
            }
          }
          
          return true;
        })
    ];
  }

  /**
   * Single card generation validation
   */
  static generateSingleCard() {
    return [
      body('student_id')
        .isInt({ min: 1 })
        .withMessage('Student ID must be positive integer'),
      
      body('template_id')
        .isInt({ min: 1 })
        .withMessage('Template ID must be positive integer'),
      
      body('card_data')
        .optional()
        .isObject()
        .custom((value) => {
          // Sanitize and validate card data
          const allowedFields = [
            'student_name', 'admission_number', 'class', 'section',
            'valid_until', 'emergency_contact', 'blood_group'
          ];
          
          for (const [key, val] of Object.entries(value)) {
            if (!allowedFields.includes(key)) {
              throw new Error(`Invalid card data field: ${key}`);
            }
            
            if (typeof val === 'string') {
              // Check for XSS patterns
              if (/<script|javascript:|on\w+\s*=/i.test(val)) {
                throw new Error(`Invalid content in field: ${key}`);
              }
              
              // Length validation
              if (val.length > 200) {
                throw new Error(`Field ${key} too long (max 200 chars)`);
              }
            }
          }
          
          return true;
        }),
      
      body('expires_at')
        .optional()
        .isISO8601()
        .withMessage('Expiry date must be valid ISO date')
        .custom((value) => {
          const expiryDate = new Date(value);
          const now = new Date();
          const maxExpiry = new Date();
          maxExpiry.setFullYear(now.getFullYear() + 5);
          
          if (expiryDate <= now) {
            throw new Error('Expiry date must be in the future');
          }
          
          if (expiryDate > maxExpiry) {
            throw new Error('Expiry date cannot be more than 5 years from now');
          }
          
          return true;
        })
    ];
  }

  /**
   * Batch card generation validation
   */
  static generateBatchCards() {
    return [
      body('template_id')
        .isInt({ min: 1 })
        .withMessage('Template ID must be positive integer'),
      
      body('student_ids')
        .isArray({ min: 1, max: 100 })
        .withMessage('Student IDs must be array with 1-100 items')
        .custom((ids) => {
          for (const id of ids) {
            if (!Number.isInteger(id) || id < 1) {
              throw new Error('All student IDs must be positive integers');
            }
          }
          
          // Check for duplicates
          const uniqueIds = new Set(ids);
          if (uniqueIds.size !== ids.length) {
            throw new Error('Duplicate student IDs not allowed');
          }
          
          return true;
        }),
      
      body('batch_options')
        .optional()
        .isObject()
        .custom((options) => {
          if (options.format && !['pdf', 'png', 'jpg'].includes(options.format)) {
            throw new Error('Format must be pdf, png, or jpg');
          }
          
          if (options.quality && (typeof options.quality !== 'number' || options.quality < 0.1 || options.quality > 1)) {
            throw new Error('Quality must be number between 0.1 and 1');
          }
          
          return true;
        })
    ];
  }

  /**
   * File upload validation
   */
  static validateFileUpload(uploadType) {
    return [
      body('upload_type')
        .optional()
        .isIn(['photo', 'logo', 'background'])
        .withMessage('Upload type must be photo, logo, or background'),
      
      // Custom validation will be handled by multer middleware
    ];
  }

  /**
   * Bulk photo upload validation
   */
  static validateBulkPhotoUpload() {
    return [
      body('mapping')
        .isObject()
        .withMessage('Mapping must be object')
        .custom((mapping) => {
          // Validate filename to student ID mapping
          for (const [filename, studentId] of Object.entries(mapping)) {
            if (!filename || typeof filename !== 'string') {
              throw new Error('Invalid filename in mapping');
            }
            
            if (!Number.isInteger(studentId) || studentId < 1) {
              throw new Error(`Invalid student ID for ${filename}`);
            }
            
            // Validate filename format
            if (!/^[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
              throw new Error(`Invalid filename format: ${filename}`);
            }
          }
          
          return true;
        })
    ];
  }

  /**
   * QR code verification validation
   */
  static validateQRVerification() {
    return [
      body('qr_data')
        .isString()
        .isLength({ min: 10, max: 1000 })
        .withMessage('QR data must be string between 10-1000 characters'),
      
      body('verification_context')
        .optional()
        .isObject()
        .custom((context) => {
          if (context.location && typeof context.location !== 'string') {
            throw new Error('Location must be string');
          }
          
          if (context.purpose && !['entry', 'exit', 'attendance', 'verification'].includes(context.purpose)) {
            throw new Error('Purpose must be entry, exit, attendance, or verification');
          }
          
          return true;
        })
    ];
  }

  /**
   * Template query validation
   */
  static validateTemplateQuery() {
    return [
      query('template_type')
        .optional()
        .isIn(['student', 'staff'])
        .withMessage('Template type must be student or staff'),
      
      query('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be boolean'),
      
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be positive integer'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1-100'),
      
      query('search')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .matches(/^[a-zA-Z0-9\s\-_]*$/)
        .withMessage('Search term: max 100 chars, alphanumeric with spaces, hyphens, underscores')
    ];
  }

  /**
   * Card generation query validation
   */
  static validateCardQuery() {
    return [
      query('student_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Student ID must be positive integer'),
      
      query('status')
        .optional()
        .isIn(['pending', 'generated', 'failed'])
        .withMessage('Status must be pending, generated, or failed'),
      
      query('from_date')
        .optional()
        .isISO8601()
        .withMessage('From date must be valid ISO date'),
      
      query('to_date')
        .optional()
        .isISO8601()
        .withMessage('To date must be valid ISO date')
        .custom((value, { req }) => {
          if (req.query.from_date && new Date(value) <= new Date(req.query.from_date)) {
            throw new Error('To date must be after from date');
          }
          return true;
        })
    ];
  }

  /**
   * Parameter validation
   */
  static validateParams() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be positive integer'),
      
      param('student_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Student ID must be positive integer'),
      
      param('batch_id')
        .optional()
        .isUUID()
        .withMessage('Batch ID must be valid UUID')
    ];
  }

  /**
   * School branding validation
   */
  static validateSchoolBranding() {
    return [
      body('primary_color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage('Primary color must be valid hex format (#RRGGBB)'),
      
      body('secondary_color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage('Secondary color must be valid hex format (#RRGGBB)'),
      
      body('font_family')
        .optional()
        .isIn(['Arial', 'Helvetica', 'Times New Roman', 'Calibri', 'Roboto'])
        .withMessage('Font family must be from allowed list'),
      
      body('school_motto')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('School motto max 200 characters'),
      
      body('contact_info')
        .optional()
        .isObject()
        .custom((info) => {
          if (info.phone && !/^\+?[\d\s\-()]{10,15}$/.test(info.phone)) {
            throw new Error('Invalid phone number format');
          }
          
          if (info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) {
            throw new Error('Invalid email format');
          }
          
          if (info.address && typeof info.address !== 'string') {
            throw new Error('Address must be string');
          }
          
          return true;
        })
    ];
  }
}

module.exports = IdCardValidation;