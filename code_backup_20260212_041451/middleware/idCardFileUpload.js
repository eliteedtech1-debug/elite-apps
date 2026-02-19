const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * Enhanced File Upload Security for ID Card System
 * Implements comprehensive security measures for photo and asset uploads
 */

class IdCardFileUpload {
  /**
   * Secure file storage configuration
   */
  static configureStorage() {
    return multer.memoryStorage(); // Use memory storage for security processing
  }

  /**
   * Advanced file filter with security checks
   */
  static createFileFilter(uploadType) {
    return async (req, file, cb) => {
      try {
        // Define allowed file types per upload category
        const allowedTypes = {
          student_photo: {
            mimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            extensions: ['.jpg', '.jpeg', '.png', '.webp'],
            maxSize: 5 * 1024 * 1024, // 5MB
            minDimensions: { width: 200, height: 200 },
            maxDimensions: { width: 2000, height: 2000 }
          },
          school_logo: {
            mimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'],
            extensions: ['.jpg', '.jpeg', '.png', '.svg'],
            maxSize: 2 * 1024 * 1024, // 2MB
            minDimensions: { width: 100, height: 100 },
            maxDimensions: { width: 1000, height: 1000 }
          },
          background_image: {
            mimes: ['image/jpeg', 'image/jpg', 'image/png'],
            extensions: ['.jpg', '.jpeg', '.png'],
            maxSize: 10 * 1024 * 1024, // 10MB
            minDimensions: { width: 300, height: 200 },
            maxDimensions: { width: 3000, height: 2000 }
          }
        };

        const config = allowedTypes[uploadType];
        if (!config) {
          return cb(new Error(`Invalid upload type: ${uploadType}`));
        }

        // Basic file validation
        const fileExt = path.extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype.toLowerCase();

        // Check MIME type and extension
        if (!config.mimes.includes(mimeType) || !config.extensions.includes(fileExt)) {
          return cb(new Error(`Invalid file type. Allowed: ${config.extensions.join(', ')}`));
        }

        // Filename security checks
        if (this.hasUnsafeFilename(file.originalname)) {
          return cb(new Error('Unsafe filename detected'));
        }

        // File size check (additional to multer limits)
        if (file.size && file.size > config.maxSize) {
          return cb(new Error(`File too large. Max size: ${config.maxSize / (1024 * 1024)}MB`));
        }

        cb(null, true);
      } catch (error) {
        cb(new Error(`File validation error: ${error.message}`));
      }
    };
  }

  /**
   * Check for unsafe filename patterns
   */
  static hasUnsafeFilename(filename) {
    const unsafePatterns = [
      /\.\./,           // Directory traversal
      /[<>:"|?*]/,      // Windows reserved characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
      /^\./,            // Hidden files
      /\s$/,            // Trailing spaces
      /\.$|\.$/,        // Trailing dots
      /[^\x20-\x7E]/,   // Non-printable characters
    ];

    return unsafePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Advanced image security processing
   */
  static async processAndValidateImage(buffer, uploadType, filename) {
    try {
      const allowedTypes = {
        student_photo: {
          minDimensions: { width: 200, height: 200 },
          maxDimensions: { width: 2000, height: 2000 },
          aspectRatio: { min: 0.8, max: 1.25 }, // Portrait orientation preferred
          quality: 85
        },
        school_logo: {
          minDimensions: { width: 100, height: 100 },
          maxDimensions: { width: 1000, height: 1000 },
          aspectRatio: { min: 0.5, max: 2.0 },
          quality: 90
        },
        background_image: {
          minDimensions: { width: 300, height: 200 },
          maxDimensions: { width: 3000, height: 2000 },
          aspectRatio: { min: 1.2, max: 2.0 }, // Landscape orientation
          quality: 80
        }
      };

      const config = allowedTypes[uploadType];
      if (!config) {
        throw new Error(`Invalid upload type: ${uploadType}`);
      }

      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Validate image format
      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
        throw new Error('Invalid image format');
      }

      // Check for malicious content in EXIF data
      if (metadata.exif) {
        const exifString = metadata.exif.toString();
        if (this.hasUnsafeContent(exifString)) {
          // Strip EXIF data for security
          buffer = await sharp(buffer).rotate().toBuffer();
        }
      }

      // Dimension validation
      const { width, height } = metadata;
      if (width < config.minDimensions.width || height < config.minDimensions.height) {
        throw new Error(`Image too small. Minimum: ${config.minDimensions.width}x${config.minDimensions.height}`);
      }

      if (width > config.maxDimensions.width || height > config.maxDimensions.height) {
        throw new Error(`Image too large. Maximum: ${config.maxDimensions.width}x${config.maxDimensions.height}`);
      }

      // Aspect ratio validation
      const aspectRatio = width / height;
      if (aspectRatio < config.aspectRatio.min || aspectRatio > config.aspectRatio.max) {
        throw new Error(`Invalid aspect ratio. Expected: ${config.aspectRatio.min}-${config.aspectRatio.max}`);
      }

      // Process and optimize image
      let processedBuffer = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(
          Math.min(width, config.maxDimensions.width),
          Math.min(height, config.maxDimensions.height),
          { 
            fit: 'inside',
            withoutEnlargement: true
          }
        )
        .jpeg({ quality: config.quality, progressive: true })
        .toBuffer();

      // Generate secure filename
      const secureFilename = this.generateSecureFilename(filename, uploadType);

      return {
        buffer: processedBuffer,
        filename: secureFilename,
        metadata: {
          width: Math.min(width, config.maxDimensions.width),
          height: Math.min(height, config.maxDimensions.height),
          format: 'jpeg',
          size: processedBuffer.length
        }
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Check for unsafe content in image data
   */
  static hasUnsafeContent(content) {
    const unsafePatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /<?php/i
    ];

    return unsafePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Generate secure filename with hash
   */
  static generateSecureFilename(originalName, uploadType) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('md5').update(originalName + timestamp).digest('hex').substring(0, 8);
    const extension = path.extname(originalName).toLowerCase();
    
    return `${uploadType}_${timestamp}_${hash}_${random}${extension}`;
  }

  /**
   * Bulk upload security middleware
   */
  static createBulkUploadMiddleware(uploadType, maxFiles = 50) {
    const upload = multer({
      storage: this.configureStorage(),
      fileFilter: this.createFileFilter(uploadType),
      limits: {
        files: maxFiles,
        fileSize: uploadType === 'background_image' ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
        fieldSize: 1024 * 1024, // 1MB for form fields
        fields: 10 // Limit number of form fields
      }
    });

    return upload.array('files', maxFiles);
  }

  /**
   * Single upload security middleware
   */
  static createSingleUploadMiddleware(uploadType, fieldName = 'file') {
    const upload = multer({
      storage: this.configureStorage(),
      fileFilter: this.createFileFilter(uploadType),
      limits: {
        files: 1,
        fileSize: uploadType === 'background_image' ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
        fieldSize: 1024 * 1024,
        fields: 5
      }
    });

    return upload.single(fieldName);
  }

  /**
   * File upload rate limiting
   */
  static createUploadRateLimit() {
    const uploadAttempts = new Map();
    
    return (req, res, next) => {
      const key = `${req.ip}_${req.user?.id || 'anonymous'}`;
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const maxUploads = 20; // 20 uploads per window
      
      if (!uploadAttempts.has(key)) {
        uploadAttempts.set(key, []);
      }
      
      const attempts = uploadAttempts.get(key);
      const recentAttempts = attempts.filter(time => now - time < windowMs);
      
      if (recentAttempts.length >= maxUploads) {
        return res.status(429).json({
          success: false,
          error: 'Upload rate limit exceeded',
          retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
        });
      }
      
      recentAttempts.push(now);
      uploadAttempts.set(key, recentAttempts);
      
      next();
    };
  }

  /**
   * Virus scanning placeholder (integrate with actual antivirus)
   */
  static async scanForViruses(buffer, filename) {
    // Placeholder for virus scanning integration
    // In production, integrate with ClamAV or similar
    
    // Basic pattern detection for known malicious signatures
    const maliciousPatterns = [
      Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'),
      Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'),
    ];

    for (const pattern of maliciousPatterns) {
      if (buffer.includes(pattern)) {
        throw new Error('Malicious content detected');
      }
    }

    return true;
  }

  /**
   * Complete file processing pipeline
   */
  static async processUploadedFile(file, uploadType, userContext) {
    try {
      // Virus scan
      await this.scanForViruses(file.buffer, file.originalname);

      // Process and validate image
      const processed = await this.processAndValidateImage(
        file.buffer, 
        uploadType, 
        file.originalname
      );

      // Add user context to metadata
      processed.metadata.uploadedBy = userContext.id;
      processed.metadata.schoolId = userContext.school_id;
      processed.metadata.branchId = userContext.branch_id;
      processed.metadata.uploadType = uploadType;
      processed.metadata.originalName = file.originalname;
      processed.metadata.uploadedAt = new Date().toISOString();

      return processed;
    } catch (error) {
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  /**
   * Cleanup temporary files
   */
  static async cleanupTempFiles(files) {
    if (!Array.isArray(files)) {
      files = [files];
    }

    for (const file of files) {
      try {
        if (file.path) {
          await fs.unlink(file.path);
        }
      } catch (error) {
        console.warn(`Failed to cleanup temp file: ${file.path}`, error);
      }
    }
  }

  /**
   * File upload error handler
   */
  static handleUploadError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
      let message = 'File upload error';
      let statusCode = 400;

      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'File too large';
          break;
        case 'LIMIT_FILE_COUNT':
          message = 'Too many files';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Unexpected file field';
          break;
        case 'LIMIT_PART_COUNT':
          message = 'Too many parts';
          break;
        case 'LIMIT_FIELD_KEY':
          message = 'Field name too long';
          break;
        case 'LIMIT_FIELD_VALUE':
          message = 'Field value too long';
          break;
        case 'LIMIT_FIELD_COUNT':
          message = 'Too many fields';
          break;
      }

      return res.status(statusCode).json({
        success: false,
        error: message,
        code: error.code
      });
    }

    if (error.message) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    next(error);
  }
}

module.exports = IdCardFileUpload;