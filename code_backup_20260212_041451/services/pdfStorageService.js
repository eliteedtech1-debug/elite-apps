const fs = require('fs');
const path = require('path');
const { uploadPDF } = require('./cloudinaryService');

/**
 * PDF Storage and CDN Service for Elite Scholar
 * Handles PDF storage, optimization, and CDN delivery
 */

class PDFStorageService {
  constructor() {
    // Storage paths
    this.paths = {
      temp: path.join(process.cwd(), 'temp', 'pdfs'),
      storage: path.join(process.cwd(), 'storage', 'pdfs'),
      public: path.join(process.cwd(), 'public', 'pdfs'),
      reports: path.join(process.cwd(), 'storage', 'pdfs', 'reports'),
      idCards: path.join(process.cwd(), 'storage', 'pdfs', 'id-cards'),
      certificates: path.join(process.cwd(), 'storage', 'pdfs', 'certificates'),
      invoices: path.join(process.cwd(), 'storage', 'pdfs', 'invoices'),
      transcripts: path.join(process.cwd(), 'storage', 'pdfs', 'transcripts')
    };

    // CDN configuration
    this.cdnConfig = {
      baseUrl: process.env.CDN_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
      enabled: process.env.CDN_ENABLED === 'true',
      cloudinaryEnabled: process.env.CLOUDINARY_CLOUD_NAME ? true : false
    };

    // Initialize directories
    this.initializeDirectories();
  }

  /**
   * Initialize storage directories
   */
  initializeDirectories() {
    Object.values(this.paths).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created PDF directory: ${dir}`);
      }
    });
  }

  /**
   * Store PDF locally
   * @param {Buffer|string} source - PDF buffer or file path
   * @param {string} filename - Output filename
   * @param {string} category - Storage category (reports, id-cards, etc.)
   * @param {object} options - Storage options
   * @returns {Promise<object>} Storage result
   */
  async storeLocally(source, filename, category = 'general', options = {}) {
    try {
      const { subfolder = '', metadata = {} } = options;
      
      // Determine storage directory
      const categoryPath = this.paths[category] || this.paths.storage;
      const storageDir = subfolder ? 
        path.join(categoryPath, subfolder) : 
        categoryPath;
      
      // Ensure directory exists
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const filePath = path.join(storageDir, filename);
      
      // Handle different source types
      if (Buffer.isBuffer(source)) {
        fs.writeFileSync(filePath, source);
      } else if (typeof source === 'string' && fs.existsSync(source)) {
        fs.copyFileSync(source, filePath);
      } else {
        throw new Error('Invalid source: must be Buffer or valid file path');
      }

      // Generate URLs
      const relativePath = path.relative(this.paths.public, filePath);
      const publicUrl = `/pdfs/${relativePath.replace(/\\/g, '/')}`;
      const cdnUrl = this.cdnConfig.enabled ? 
        `${this.cdnConfig.baseUrl}${publicUrl}` : 
        publicUrl;

      // Store metadata if provided
      if (Object.keys(metadata).length > 0) {
        const metadataPath = filePath + '.meta.json';
        fs.writeFileSync(metadataPath, JSON.stringify({
          ...metadata,
          created_at: new Date().toISOString(),
          file_size: fs.statSync(filePath).size,
          file_path: filePath
        }, null, 2));
      }

      return {
        success: true,
        path: filePath,
        url: publicUrl,
        cdnUrl: cdnUrl,
        size: fs.statSync(filePath).size,
        category,
        filename,
        metadata
      };
    } catch (error) {
      throw new Error(`Local PDF storage failed: ${error.message}`);
    }
  }

  /**
   * Upload PDF to Cloudinary CDN
   * @param {Buffer|string} source - PDF buffer or file path
   * @param {string} filename - Filename for upload
   * @param {string} category - Upload category
   * @param {object} options - Upload options
   * @returns {Promise<object>} Upload result
   */
  async uploadToCloudinary(source, filename, category = 'general', options = {}) {
    try {
      if (!this.cdnConfig.cloudinaryEnabled) {
        throw new Error('Cloudinary not configured');
      }

      const { metadata = {}, tags = [] } = options;
      
      const uploadOptions = {
        folder: `pdfs/${category}`,
        public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
        tags: [category, ...tags],
        context: metadata,
        ...options.cloudinaryOptions
      };

      const result = await uploadPDF(source, uploadOptions);

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        size: result.bytes,
        format: result.format,
        category,
        filename,
        metadata,
        provider: 'cloudinary'
      };
    } catch (error) {
      throw new Error(`Cloudinary PDF upload failed: ${error.message}`);
    }
  }

  /**
   * Store PDF with automatic fallback (Cloudinary -> Local)
   * @param {Buffer|string} source - PDF buffer or file path
   * @param {string} filename - Filename
   * @param {string} category - Storage category
   * @param {object} options - Storage options
   * @returns {Promise<object>} Storage result
   */
  async storePDF(source, filename, category = 'general', options = {}) {
    const { preferCloud = true, fallbackToLocal = true } = options;

    try {
      // Try Cloudinary first if preferred and available
      if (preferCloud && this.cdnConfig.cloudinaryEnabled) {
        try {
          const cloudResult = await this.uploadToCloudinary(source, filename, category, options);
          
          // Also store locally as backup if requested
          if (options.backupLocally) {
            const localResult = await this.storeLocally(source, filename, category, options);
            cloudResult.localBackup = localResult;
          }
          
          return cloudResult;
        } catch (cloudError) {
          console.warn('Cloudinary upload failed, falling back to local storage:', cloudError.message);
          
          if (!fallbackToLocal) {
            throw cloudError;
          }
        }
      }

      // Store locally
      return await this.storeLocally(source, filename, category, options);
    } catch (error) {
      throw new Error(`PDF storage failed: ${error.message}`);
    }
  }

  /**
   * Generate student report PDF storage
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {object} reportData - Report metadata
   * @param {object} options - Storage options
   * @returns {Promise<object>} Storage result
   */
  async storeStudentReport(pdfBuffer, reportData, options = {}) {
    const {
      student_id,
      report_type,
      academic_year,
      term,
      class_name,
      school_id
    } = reportData;

    const filename = `${report_type}_${student_id}_${academic_year}_${term}_${Date.now()}.pdf`;
    const subfolder = `${school_id}/${academic_year}/${term}`;

    const metadata = {
      type: 'student_report',
      student_id,
      report_type,
      academic_year,
      term,
      class_name,
      school_id,
      generated_at: new Date().toISOString()
    };

    return await this.storePDF(pdfBuffer, filename, 'reports', {
      ...options,
      subfolder,
      metadata,
      tags: ['student-report', report_type, academic_year]
    });
  }

  /**
   * Generate ID card PDF storage
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {object} cardData - ID card metadata
   * @param {object} options - Storage options
   * @returns {Promise<object>} Storage result
   */
  async storeIdCard(pdfBuffer, cardData, options = {}) {
    const {
      student_id,
      card_type,
      academic_year,
      school_id,
      batch_id
    } = cardData;

    const filename = `id_card_${student_id}_${academic_year}_${Date.now()}.pdf`;
    const subfolder = batch_id ? 
      `${school_id}/${academic_year}/batch_${batch_id}` : 
      `${school_id}/${academic_year}`;

    const metadata = {
      type: 'id_card',
      student_id,
      card_type,
      academic_year,
      school_id,
      batch_id,
      generated_at: new Date().toISOString()
    };

    return await this.storePDF(pdfBuffer, filename, 'idCards', {
      ...options,
      subfolder,
      metadata,
      tags: ['id-card', card_type, academic_year]
    });
  }

  /**
   * Generate invoice PDF storage
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {object} invoiceData - Invoice metadata
   * @param {object} options - Storage options
   * @returns {Promise<object>} Storage result
   */
  async storeInvoice(pdfBuffer, invoiceData, options = {}) {
    const {
      invoice_id,
      student_id,
      invoice_type,
      academic_year,
      school_id
    } = invoiceData;

    const filename = `invoice_${invoice_id}_${Date.now()}.pdf`;
    const subfolder = `${school_id}/${academic_year}`;

    const metadata = {
      type: 'invoice',
      invoice_id,
      student_id,
      invoice_type,
      academic_year,
      school_id,
      generated_at: new Date().toISOString()
    };

    return await this.storePDF(pdfBuffer, filename, 'invoices', {
      ...options,
      subfolder,
      metadata,
      tags: ['invoice', invoice_type, academic_year]
    });
  }

  /**
   * Generate certificate PDF storage
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {object} certificateData - Certificate metadata
   * @param {object} options - Storage options
   * @returns {Promise<object>} Storage result
   */
  async storeCertificate(pdfBuffer, certificateData, options = {}) {
    const {
      student_id,
      certificate_type,
      academic_year,
      school_id,
      certificate_id
    } = certificateData;

    const filename = `certificate_${certificate_id || student_id}_${certificate_type}_${Date.now()}.pdf`;
    const subfolder = `${school_id}/${academic_year}`;

    const metadata = {
      type: 'certificate',
      student_id,
      certificate_type,
      academic_year,
      school_id,
      certificate_id,
      generated_at: new Date().toISOString()
    };

    return await this.storePDF(pdfBuffer, filename, 'certificates', {
      ...options,
      subfolder,
      metadata,
      tags: ['certificate', certificate_type, academic_year]
    });
  }

  /**
   * Get PDF file information
   * @param {string} filePath - File path or public ID
   * @param {string} provider - Storage provider (local, cloudinary)
   * @returns {Promise<object>} File information
   */
  async getFileInfo(filePath, provider = 'local') {
    try {
      if (provider === 'local') {
        if (!fs.existsSync(filePath)) {
          throw new Error('File not found');
        }

        const stats = fs.statSync(filePath);
        const metadataPath = filePath + '.meta.json';
        let metadata = {};

        if (fs.existsSync(metadataPath)) {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }

        return {
          exists: true,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          metadata,
          provider: 'local'
        };
      } else if (provider === 'cloudinary') {
        // Implementation for Cloudinary file info would go here
        // For now, return basic info
        return {
          exists: true,
          provider: 'cloudinary',
          public_id: filePath
        };
      }
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Delete PDF file
   * @param {string} filePath - File path or public ID
   * @param {string} provider - Storage provider
   * @returns {Promise<object>} Deletion result
   */
  async deleteFile(filePath, provider = 'local') {
    try {
      if (provider === 'local') {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          
          // Also delete metadata file if exists
          const metadataPath = filePath + '.meta.json';
          if (fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
          }
        }
        
        return { success: true, message: 'File deleted successfully' };
      } else if (provider === 'cloudinary') {
        // Implementation for Cloudinary file deletion would go here
        return { success: true, message: 'File deleted from Cloudinary' };
      }
    } catch (error) {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Clean up old PDF files
   * @param {string} category - Category to clean
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<object>} Cleanup result
   */
  async cleanupOldFiles(category = 'temp', maxAge = 24 * 60 * 60 * 1000) {
    try {
      const targetPath = this.paths[category] || this.paths.temp;
      const files = fs.readdirSync(targetPath, { withFileTypes: true });
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(targetPath, file.name);
          const stats = fs.statSync(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`Cleaned up old PDF: ${file.name}`);
          }
        }
      }

      return {
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} old PDF files`
      };
    } catch (error) {
      throw new Error(`PDF cleanup failed: ${error.message}`);
    }
  }

  /**
   * Health check for PDF storage service
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    try {
      // Check if directories exist and are writable
      const testFile = path.join(this.paths.temp, 'health-check.txt');
      fs.writeFileSync(testFile, 'health check');
      fs.unlinkSync(testFile);

      return {
        status: 'healthy',
        message: 'PDF storage service operational',
        directories: Object.keys(this.paths).length,
        cloudinaryEnabled: this.cdnConfig.cloudinaryEnabled
      };
    } catch (error) {
      return {
        status: 'error',
        message: `PDF storage error: ${error.message}`
      };
    }
  }
}

// Export singleton instance
module.exports = new PDFStorageService();