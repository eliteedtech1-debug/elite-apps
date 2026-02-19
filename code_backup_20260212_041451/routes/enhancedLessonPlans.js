const express = require('express');
const router = express.Router();
const enhancedLessonPlanController = require('../controllers/enhancedLessonPlanController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Lesson plan CRUD operations
router.get('/', enhancedLessonPlanController.getLessonPlans);
router.post('/', enhancedLessonPlanController.createLessonPlan);
router.put('/:id', enhancedLessonPlanController.updateLessonPlan);

// Workflow operations
router.post('/:id/submit', enhancedLessonPlanController.submitForReview);

// Dashboard and analytics
router.get('/dashboard', enhancedLessonPlanController.getDashboardData);

module.exports = router;
