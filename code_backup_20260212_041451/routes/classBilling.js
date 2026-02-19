const express = require('express');
const router = express.Router();
const {
  getClassBillingData,
  getStudentBillingDetails,
  getClassSummary,
  testClassBilling,
  debugClassBilling
} = require('../controllers/ClassBillingController');

// Middleware to ensure user authentication
const authenticateUser = (req, res, next) => {
  if (!req.user || !req.user.school_id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required - school_id not found'
    });
  }
  next();
};

/**
 * @route GET /api/v2/class-billing
 * @desc Get aggregated billing data for a class
 * @access Private
 * @params class_code, term, academic_year, branch_id (optional)
 */
router.get('/', authenticateUser, getClassBillingData);

/**
 * @route GET /api/v2/class-billing/student
 * @desc Get detailed billing breakdown for a specific student
 * @access Private
 * @params admission_no, term, academic_year, branch_id (optional)
 */
router.get('/student', authenticateUser, getStudentBillingDetails);

/**
 * @route GET /api/v2/class-billing/summary
 * @desc Get class summary statistics
 * @access Private
 * @params class_code, term, academic_year, branch_id (optional)
 */
router.get('/summary', authenticateUser, getClassSummary);

/**
 * @route GET /api/v2/class-billing/test
 * @desc Test class billing functionality
 * @access Private
 * @params class_code (optional, defaults to CLS0003)
 */
router.get('/test', authenticateUser, testClassBilling);

/**
 * @route GET /api/v2/class-billing/debug
 * @desc Debug class billing functionality (no auth required)
 * @access Public
 * @params class_code, school_id (optional)
 */
router.get('/debug', debugClassBilling);

module.exports = router;