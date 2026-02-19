const express = require('express');
const router = express.Router();
const AdmissionBranchController = require('../controllers/AdmissionBranchController');

// Get single branch details by branch_id (query param)
router.get('/branches', AdmissionBranchController.getBranchDetails);

// Get branches with ongoing admissions for a specific school (query param)
router.get('/schools/branches', AdmissionBranchController.getAdmissionBranches);

// Get all schools with ongoing admissions (public endpoint)
router.get('/schools', AdmissionBranchController.getSchoolsWithAdmissions);

// Get classes for public admission form
router.get('/classes', AdmissionBranchController.getPublicClasses);

// Submit public admission application
router.post('/applications', AdmissionBranchController.submitPublicApplication);

// Initialize admission payment
router.post('/payment', AdmissionBranchController.initializeAdmissionPayment);

module.exports = router;
