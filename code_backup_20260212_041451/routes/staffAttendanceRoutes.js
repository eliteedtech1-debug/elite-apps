/**
 * Staff Attendance Routes
 * 
 * API endpoints for staff attendance management including:
 * - GPS-based attendance (handled in login)
 * - Manual attendance entry
 * - Biometric import from CSV/Excel
 * - Attendance reports and analytics
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const {
  getAttendance,
  markAttendance,
  markManualAttendance,
  markCheckout,
  importBiometric,
  getAttendanceSummary,
  getImportHistory,
  quickScan
} = require('../controllers/staffAttendanceController');
const biometricImportController = require('../controllers/biometricImportController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/biometric/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'biometric-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// Middleware for authentication (optional - uncomment if you have auth middleware)
// const { verifyToken } = require('../controllers/user');

/**
 * @route   GET /api/staff-attendance
 * @desc    Get attendance records
 * @access  Private (requires authentication)
 * @query   school_id, branch_id, staff_id, start_date, end_date, method
 */
router.get('/', getAttendance);

/**
 * @route   POST /api/staff-attendance
 * @desc    Mark automatic attendance (login-based)
 * @access  Private (requires authentication)
 * @body    staff_id, teacher_id, school_id, branch_id, date, time_in, status, latitude, longitude, login_attendance
 */
router.post('/', markAttendance);

/**
 * @route   POST /api/staff-attendance/manual
 * @desc    Mark manual attendance
 * @access  Private (requires authentication)
 * @body    staff_id, school_id, branch_id, date, check_in_time, check_out_time, status, remarks
 */
router.post('/manual', markManualAttendance);

/**
 * @route   POST /api/staff-attendance/:id/checkout
 * @desc    Mark checkout for staff
 * @access  Private (requires authentication)
 * @body    check_out_time, remarks
 */
router.post('/:id/checkout', markCheckout);

/**
 * @route   POST /api/staff-attendance/import/preview
 * @desc    Preview biometric import file
 * @access  Private (requires authentication)
 * @body    file (multipart), device_type, school_id, branch_id
 */
router.post('/import/preview', upload.single('file'), biometricImportController.previewImport);

/**
 * @route   POST /api/staff-attendance/import
 * @desc    Import biometric attendance from CSV/Excel
 * @access  Private (requires authentication)
 * @body    school_id, branch_id, records[], device_type
 */
router.post('/import', biometricImportController.importAttendance);

/**
 * @route   GET /api/staff-attendance/summary
 * @desc    Get attendance summary/statistics
 * @access  Private (requires authentication)
 * @query   school_id, branch_id, start_date, end_date
 */
router.get('/summary', getAttendanceSummary);

/**
 * @route   GET /api/staff-attendance/import-history
 * @desc    Get biometric import history
 * @access  Private (requires authentication)
 * @query   school_id, branch_id, limit
 */
router.get('/import-history', getImportHistory);

/**
 * @route   POST /api/staff-attendance/quick-scan
 * @desc    Quick scan for staff attendance using QR code
 * @access  Private (requires authentication)
 * @body    staff_id, date (optional), time (optional), location (optional)
 */
router.post(
  '/quick-scan',
  passport.authenticate('jwt', { session: false }),
  quickScan
);

module.exports = router;
