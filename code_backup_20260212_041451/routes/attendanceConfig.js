/**
 * Attendance Configuration Routes
 */

const express = require('express');
const router = express.Router();
const {
  getAttendanceConfig,
  updateAttendanceConfig,
  getAllBranchConfigs
} = require('../controllers/attendanceConfigController');

// Get attendance configuration for a specific branch
router.get('/attendance-config', getAttendanceConfig);

// Update attendance configuration for a branch
router.put('/attendance-config', updateAttendanceConfig);

// Get all branch configurations for a school
router.get('/attendance-config/all', getAllBranchConfigs);

module.exports = router;
