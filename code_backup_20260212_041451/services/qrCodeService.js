const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { uploadImage } = require('./cloudinaryService');

/**
 * QR Code Generation Service for Elite Scholar
 * Supports various QR code types for ID cards, attendance, payments, etc.
 */

class QRCodeService {
  constructor() {
    this.defaultOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    };

    // Ensure temp directory exists
    this.tempDir = path.join(process.cwd(), 'temp', 'qrcodes');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate QR code as Data URL
   * @param {string} data - Data to encode
   * @param {object} options - QR code options
   * @returns {Promise<string>} Data URL
   */
  async generateDataURL(data, options = {}) {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      return await QRCode.toDataURL(data, qrOptions);
    } catch (error) {
      throw new Error(`QR Code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code as Buffer
   * @param {string} data - Data to encode
   * @param {object} options - QR code options
   * @returns {Promise<Buffer>} QR code buffer
   */
  async generateBuffer(data, options = {}) {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      return await QRCode.toBuffer(data, qrOptions);
    } catch (error) {
      throw new Error(`QR Code buffer generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code and save to file
   * @param {string} data - Data to encode
   * @param {string} filename - Output filename
   * @param {object} options - QR code options
   * @returns {Promise<string>} File path
   */
  async generateFile(data, filename, options = {}) {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      const filePath = path.join(this.tempDir, filename);
      await QRCode.toFile(filePath, data, qrOptions);
      return filePath;
    } catch (error) {
      throw new Error(`QR Code file generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code and upload to Cloudinary
   * @param {string} data - Data to encode
   * @param {string} filename - Filename for upload
   * @param {object} options - QR code and upload options
   * @returns {Promise<object>} Upload result
   */
  async generateAndUpload(data, filename, options = {}) {
    try {
      const { qrOptions = {}, uploadOptions = {} } = options;
      const buffer = await this.generateBuffer(data, qrOptions);
      
      const result = await uploadImage(buffer, {
        folder: 'qr-codes',
        public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
        ...uploadOptions
      });

      return result;
    } catch (error) {
      throw new Error(`QR Code upload failed: ${error.message}`);
    }
  }

  /**
   * Generate student ID QR code
   * @param {object} studentData - Student information
   * @param {object} options - Generation options
   * @returns {Promise<object>} QR code result
   */
  async generateStudentIdQR(studentData, options = {}) {
    const {
      student_id,
      admission_no,
      name,
      class_name,
      school_id,
      branch_id
    } = studentData;

    const qrData = JSON.stringify({
      type: 'student_id',
      student_id,
      admission_no,
      name,
      class_name,
      school_id,
      branch_id,
      generated_at: new Date().toISOString()
    });

    const filename = `student_${student_id}_${Date.now()}`;
    
    if (options.uploadToCloud) {
      return await this.generateAndUpload(qrData, filename, {
        uploadOptions: { folder: 'id-cards/qr-codes' }
      });
    } else {
      return await this.generateDataURL(qrData);
    }
  }

  /**
   * Generate attendance QR code
   * @param {object} attendanceData - Attendance session data
   * @param {object} options - Generation options
   * @returns {Promise<object>} QR code result
   */
  async generateAttendanceQR(attendanceData, options = {}) {
    const {
      session_id,
      class_id,
      subject_id,
      teacher_id,
      date,
      school_id,
      branch_id,
      expires_at
    } = attendanceData;

    const qrData = JSON.stringify({
      type: 'attendance',
      session_id,
      class_id,
      subject_id,
      teacher_id,
      date,
      school_id,
      branch_id,
      expires_at: expires_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min default
      generated_at: new Date().toISOString()
    });

    const filename = `attendance_${session_id}_${Date.now()}`;
    
    if (options.uploadToCloud) {
      return await this.generateAndUpload(qrData, filename, {
        uploadOptions: { folder: 'attendance/qr-codes' }
      });
    } else {
      return await this.generateDataURL(qrData);
    }
  }

  /**
   * Generate payment QR code
   * @param {object} paymentData - Payment information
   * @param {object} options - Generation options
   * @returns {Promise<object>} QR code result
   */
  async generatePaymentQR(paymentData, options = {}) {
    const {
      payment_id,
      student_id,
      amount,
      description,
      school_id,
      branch_id,
      expires_at
    } = paymentData;

    const qrData = JSON.stringify({
      type: 'payment',
      payment_id,
      student_id,
      amount,
      description,
      school_id,
      branch_id,
      expires_at: expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours default
      generated_at: new Date().toISOString()
    });

    const filename = `payment_${payment_id}_${Date.now()}`;
    
    if (options.uploadToCloud) {
      return await this.generateAndUpload(qrData, filename, {
        uploadOptions: { folder: 'payments/qr-codes' }
      });
    } else {
      return await this.generateDataURL(qrData);
    }
  }

  /**
   * Generate exam QR code
   * @param {object} examData - Exam information
   * @param {object} options - Generation options
   * @returns {Promise<object>} QR code result
   */
  async generateExamQR(examData, options = {}) {
    const {
      exam_id,
      student_id,
      exam_name,
      subject_id,
      date,
      school_id,
      branch_id
    } = examData;

    const qrData = JSON.stringify({
      type: 'exam',
      exam_id,
      student_id,
      exam_name,
      subject_id,
      date,
      school_id,
      branch_id,
      generated_at: new Date().toISOString()
    });

    const filename = `exam_${exam_id}_${student_id}_${Date.now()}`;
    
    if (options.uploadToCloud) {
      return await this.generateAndUpload(qrData, filename, {
        uploadOptions: { folder: 'exams/qr-codes' }
      });
    } else {
      return await this.generateDataURL(qrData);
    }
  }

  /**
   * Generate generic QR code with custom data
   * @param {string} data - Data to encode
   * @param {string} type - QR code type
   * @param {object} options - Generation options
   * @returns {Promise<object>} QR code result
   */
  async generateCustomQR(data, type, options = {}) {
    const qrData = JSON.stringify({
      type: type || 'custom',
      data,
      generated_at: new Date().toISOString()
    });

    const filename = `${type || 'custom'}_${Date.now()}`;
    
    if (options.uploadToCloud) {
      return await this.generateAndUpload(qrData, filename, {
        uploadOptions: { folder: `${type || 'custom'}/qr-codes` }
      });
    } else {
      return await this.generateDataURL(qrData);
    }
  }

  /**
   * Validate and parse QR code data
   * @param {string} qrData - QR code data string
   * @returns {object} Parsed QR data
   */
  parseQRData(qrData) {
    try {
      const parsed = JSON.parse(qrData);
      
      // Validate required fields
      if (!parsed.type || !parsed.generated_at) {
        throw new Error('Invalid QR code format');
      }

      // Check expiration if applicable
      if (parsed.expires_at && new Date(parsed.expires_at) < new Date()) {
        throw new Error('QR code has expired');
      }

      return parsed;
    } catch (error) {
      throw new Error(`QR code parsing failed: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupTempFiles(maxAge = 60 * 60 * 1000) {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();

      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up temp QR file: ${file}`);
        }
      });
    } catch (error) {
      console.error('QR temp file cleanup failed:', error.message);
    }
  }

  /**
   * Health check for QR code service
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    try {
      await this.generateDataURL('health-check');
      return { status: 'healthy', message: 'QR Code service operational' };
    } catch (error) {
      return { status: 'error', message: `QR Code error: ${error.message}` };
    }
  }
}

// Export singleton instance
module.exports = new QRCodeService();