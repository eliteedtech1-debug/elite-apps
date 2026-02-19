const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabus');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get syllabus tree structure
router.get('/tree', syllabusController.getSyllabusTree);

// Get syllabus coverage data
router.get('/coverage', syllabusController.getSyllabusCoverage);

// Get syllabus topics for specific class/subject
router.get('/topics/:classCode/:subject', syllabusController.getSyllabusTopics);

module.exports = router;
