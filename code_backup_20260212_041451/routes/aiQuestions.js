const express = require('express');
const router = express.Router();
const aiQuestionController = require('../controllers/aiQuestionController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// POST /api/v1/ai-questions/generate - Generate questions from lesson plan
router.post('/generate', aiQuestionController.generateFromLessonPlan);

// GET /api/v1/ai-questions/lesson-plans - Get teacher's lesson plans
router.get('/lesson-plans', aiQuestionController.getTeacherLessonPlans);

// GET /api/v1/ai-questions/models - Get available AI models
router.get('/models', aiQuestionController.getAvailableModels);

// GET /api/v1/ai-questions/history - Get generation history
router.get('/history', aiQuestionController.getGenerationHistory);

module.exports = router;
