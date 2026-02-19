/**
 * GPS Configuration Routes
 * 
 * API endpoints for managing GPS configuration for school branches
 */

const express = require('express');
const router = express.Router();
const gpsConfigController = require('../controllers/gpsConfigController');

// Get all branches with GPS configuration
router.get('/school-locations', gpsConfigController.getBranches);

// Update GPS configuration for a branch
router.put('/school-locations/gps', gpsConfigController.updateBranchGPS);

// Get school GPS attendance status
router.get('/school-setup', gpsConfigController.getSchoolGPSStatus);

// Update school GPS attendance setting
router.put('/school-setup/gps', gpsConfigController.updateSchoolGPS);

// Get GPS configuration summary
router.get('/gps-summary', gpsConfigController.getGPSSummary);

module.exports = router;
