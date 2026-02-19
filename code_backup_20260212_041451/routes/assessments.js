const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Assessment generation aligned with existing workflow
router.post('/generate', assessmentController.generateAssessmentDraft);
router.post('/generate-draft', assessmentController.generateAssessmentDraft);
router.post('/submit-for-moderation', assessmentController.submitForModeration);

// Assessment management (aligned with existing system)
router.get('/my-submissions', assessmentController.getMySubmissions);
router.get('/:id/export', assessmentController.exportAssessment);

module.exports = router;
