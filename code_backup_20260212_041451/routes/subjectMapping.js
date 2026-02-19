const express = require('express');
const router = express.Router();
const subjectMappingController = require('../controllers/subjectMappingController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// School subject management
router.get('/school-subjects', subjectMappingController.getSchoolSubjects);
router.get('/global-content', subjectMappingController.getGlobalContent);
router.get('/global-content-details', subjectMappingController.getGlobalContentDetails);

// AI-powered mapping suggestions
router.post('/auto-suggest', subjectMappingController.autoSuggestMappings);
router.post('/bulk-create', subjectMappingController.bulkCreateMappings);

// Mapping operations
router.post('/create', subjectMappingController.createMapping);
router.put('/:id/approve', subjectMappingController.approveMapping);

// Content access
router.get('/mapped-content', subjectMappingController.getMappedContent);
router.post('/generate-lesson-plan', subjectMappingController.generateLessonPlanFromMapping);

module.exports = router;
