const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import services
const qrCodeService = require('../services/qrCodeService');
const barcodeService = require('../services/barcodeService');
const pdfStorageService = require('../services/pdfStorageService');
const cloudinaryService = require('../services/cloudinaryService');
const { healthCheck } = require('../config/externalServices');

// Configure multer for file uploads
const upload = multer({
  dest: 'temp/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

/**
 * QR Code Generation Routes
 */

// Generate QR code for student ID
router.post('/qr-code/student-id', async (req, res) => {
  try {
    const { student_id, admission_no, name, class_name, school_id, branch_id, uploadToCloud = false } = req.body;

    if (!student_id || !name) {
      return res.status(400).json({ error: 'Student ID and name are required' });
    }

    const studentData = { student_id, admission_no, name, class_name, school_id, branch_id };
    const result = await qrCodeService.generateStudentIdQR(studentData, { uploadToCloud });

    res.json({
      success: true,
      qrCode: result,
      type: 'student_id'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate QR code for attendance
router.post('/qr-code/attendance', async (req, res) => {
  try {
    const { session_id, class_id, subject_id, teacher_id, date, school_id, branch_id, expires_at, uploadToCloud = false } = req.body;

    if (!session_id || !class_id) {
      return res.status(400).json({ error: 'Session ID and class ID are required' });
    }

    const attendanceData = { session_id, class_id, subject_id, teacher_id, date, school_id, branch_id, expires_at };
    const result = await qrCodeService.generateAttendanceQR(attendanceData, { uploadToCloud });

    res.json({
      success: true,
      qrCode: result,
      type: 'attendance'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate QR code for payment
router.post('/qr-code/payment', async (req, res) => {
  try {
    const { payment_id, student_id, amount, description, school_id, branch_id, expires_at, uploadToCloud = false } = req.body;

    if (!payment_id || !student_id || !amount) {
      return res.status(400).json({ error: 'Payment ID, student ID, and amount are required' });
    }

    const paymentData = { payment_id, student_id, amount, description, school_id, branch_id, expires_at };
    const result = await qrCodeService.generatePaymentQR(paymentData, { uploadToCloud });

    res.json({
      success: true,
      qrCode: result,
      type: 'payment'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate custom QR code
router.post('/qr-code/custom', async (req, res) => {
  try {
    const { data, type, uploadToCloud = false, options = {} } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const result = await qrCodeService.generateCustomQR(data, type, { uploadToCloud, ...options });

    res.json({
      success: true,
      qrCode: result,
      type: type || 'custom'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Barcode Generation Routes
 */

// Generate barcode for student ID
router.post('/barcode/student-id', async (req, res) => {
  try {
    const { student_id, admission_no, uploadToCloud = false, options = {} } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const studentData = { student_id, admission_no };
    const result = await barcodeService.generateStudentIdBarcode(studentData, { uploadToCloud, ...options });

    res.json({
      success: true,
      barcode: result,
      type: 'student_id'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate barcode for asset
router.post('/barcode/asset', async (req, res) => {
  try {
    const { asset_id, asset_code, uploadToCloud = false, options = {} } = req.body;

    if (!asset_id) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    const assetData = { asset_id, asset_code };
    const result = await barcodeService.generateAssetBarcode(assetData, { uploadToCloud, ...options });

    res.json({
      success: true,
      barcode: result,
      type: 'asset'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate barcode for inventory
router.post('/barcode/inventory', async (req, res) => {
  try {
    const { product_id, sku, uploadToCloud = false, options = {} } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const inventoryData = { product_id, sku };
    const result = await barcodeService.generateInventoryBarcode(inventoryData, { uploadToCloud, ...options });

    res.json({
      success: true,
      barcode: result,
      type: 'inventory'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate custom barcode
router.post('/barcode/custom', async (req, res) => {
  try {
    const { data, type, uploadToCloud = false, options = {} } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Validate barcode data
    if (!barcodeService.validateBarcodeData(data, options.format)) {
      return res.status(400).json({ error: 'Invalid barcode data format' });
    }

    const result = await barcodeService.generateCustomBarcode(data, type, { uploadToCloud, ...options });

    res.json({
      success: true,
      barcode: result,
      type: type || 'custom'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PDF Storage Routes
 */

// Upload PDF file
router.post('/pdf/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const { category = 'general', metadata = {}, preferCloud = true } = req.body;
    const filename = req.file.originalname;

    const result = await pdfStorageService.storePDF(
      req.file.path,
      filename,
      category,
      {
        preferCloud: preferCloud === 'true',
        metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata
      }
    );

    res.json({
      success: true,
      file: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Store student report PDF
router.post('/pdf/student-report', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const reportData = req.body;
    const pdfBuffer = require('fs').readFileSync(req.file.path);

    const result = await pdfStorageService.storeStudentReport(pdfBuffer, reportData);

    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Store ID card PDF
router.post('/pdf/id-card', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const cardData = req.body;
    const pdfBuffer = require('fs').readFileSync(req.file.path);

    const result = await pdfStorageService.storeIdCard(pdfBuffer, cardData);

    res.json({
      success: true,
      idCard: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get PDF file info
router.get('/pdf/info/:provider/:filePath(*)', async (req, res) => {
  try {
    const { provider, filePath } = req.params;
    const result = await pdfStorageService.getFileInfo(filePath, provider);

    res.json({
      success: true,
      fileInfo: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Image Upload Routes
 */

// Upload image to Cloudinary
router.post('/image/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { folder = 'images', options = {} } = req.body;
    const uploadOptions = typeof options === 'string' ? JSON.parse(options) : options;

    const result = await cloudinaryService.uploadImage(req.file.path, {
      folder,
      ...uploadOptions
    });

    res.json({
      success: true,
      image: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload ID card image
router.post('/image/id-card', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { options = {} } = req.body;
    const uploadOptions = typeof options === 'string' ? JSON.parse(options) : options;

    const result = await cloudinaryService.uploadIdCard(req.file.path, uploadOptions);

    res.json({
      success: true,
      idCard: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get optimized image URL
router.get('/image/optimize/:publicId(*)', (req, res) => {
  try {
    const { publicId } = req.params;
    const transformations = req.query;

    const optimizedUrl = cloudinaryService.getOptimizedImageUrl(publicId, transformations);

    res.json({
      success: true,
      url: optimizedUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get thumbnail URL
router.get('/image/thumbnail/:publicId(*)', (req, res) => {
  try {
    const { publicId } = req.params;
    const { size = 150 } = req.query;

    const thumbnailUrl = cloudinaryService.getThumbnailUrl(publicId, parseInt(size));

    res.json({
      success: true,
      url: thumbnailUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health Check Routes
 */

// Overall health check
router.get('/health', async (req, res) => {
  try {
    const health = await healthCheck.checkAll();
    
    res.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Individual service health checks
router.get('/health/qr-code', async (req, res) => {
  try {
    const health = await qrCodeService.healthCheck();
    res.json({ success: true, health });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/health/barcode', async (req, res) => {
  try {
    const health = await barcodeService.healthCheck();
    res.json({ success: true, health });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/health/pdf-storage', async (req, res) => {
  try {
    const health = await pdfStorageService.healthCheck();
    res.json({ success: true, health });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/health/cloudinary', async (req, res) => {
  try {
    const health = await cloudinaryService.healthCheck();
    res.json({ success: true, health });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Utility Routes
 */

// Clean up temporary files
router.post('/cleanup/temp', async (req, res) => {
  try {
    const { maxAge = 3600000 } = req.body; // 1 hour default

    // Clean up QR code temp files
    qrCodeService.cleanupTempFiles(maxAge);
    
    // Clean up barcode temp files
    barcodeService.cleanupTempFiles(maxAge);
    
    // Clean up PDF temp files
    const pdfCleanup = await pdfStorageService.cleanupOldFiles('temp', maxAge);

    res.json({
      success: true,
      message: 'Temporary files cleaned up',
      pdfCleanup
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;