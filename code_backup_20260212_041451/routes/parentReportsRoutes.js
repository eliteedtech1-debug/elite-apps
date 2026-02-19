const express = require('express');
const router = express.Router();
const parentReportsController = require('../controllers/parentReportsController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route GET /api/parent-reports/availability
 * @desc Get report availability for a student (CA and End of Term reports)
 * @access Private (Parents and Admin)
 */
router.get('/availability', authenticateToken, parentReportsController.getReportAvailability);

/**
 * @route GET /api/parent-reports/end-of-term
 * @desc Get End of Term report data for a specific student
 * @access Private (Parents and Admin)
 */
router.get('/end-of-term', authenticateToken, parentReportsController.getEndOfTermReport);

module.exports = router;
