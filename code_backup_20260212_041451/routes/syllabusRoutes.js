const express = require('express');
const syllabusController = require('../controllers/syllabusController');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(app) {
  // Apply authentication to all syllabus routes
  app.use('/api/v1/syllabus', authenticateToken);
  app.use('/api/v1/lesson-plans', authenticateToken);

  // Syllabus routes
  app.get('/api/v1/syllabus/topics', syllabusController.getSyllabusTopics);
  app.get('/api/v1/syllabus/coverage', syllabusController.getCurriculumCoverage);

  // Lesson plans list
  app.get('/api/v1/lesson-plans', syllabusController.getLessonPlans);
  
  // Get academic weeks for a school
  app.get('/api/v1/lesson-plans/weeks', syllabusController.getAcademicWeeks);
  
  // Save lesson plan
  app.post('/api/v1/lesson-plans', syllabusController.saveLessonPlan);

  // Delete lesson plan
  app.delete('/api/v1/lesson-plans/:id', syllabusController.deleteLessonPlan);

  // Submit lesson plan for review
  app.post('/api/v1/lesson-plans/:id/submit', syllabusController.submitLessonPlan);

  // AI-powered lesson plan routes
  app.post('/api/v1/lesson-plans/generate', syllabusController.generateLessonPlan);
  app.post('/api/v1/lesson-plans/generate-content', syllabusController.generateLessonContent);
  app.put('/api/v1/lesson-plans/:id/enhance', syllabusController.enhanceLessonPlan);
};