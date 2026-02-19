const express = require('express');
const router = express.Router();
const lessonPlanController = require('../controllers/lessonPlan');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get teacher's lesson plans
router.get('/', lessonPlanController.getTeacherLessonPlans);

// Create new lesson plan
router.post('/', lessonPlanController.createLessonPlan);

module.exports = router;
