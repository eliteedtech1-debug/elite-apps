const express = require('express');
const lessonNotesController = require('../controllers/lessonNotesController');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(app) {
  // Apply authentication to all lesson note routes
  app.use('/lesson-notes', authenticateToken);
  
  // Lesson note routes
  app.post('/lesson-notes', lessonNotesController.createLessonNote);
  app.get('/lesson-notes', lessonNotesController.getLessonNotes);
  app.get('/lesson-notes/stats', lessonNotesController.getLessonNoteStats);
  app.get('/lesson-notes/:id', lessonNotesController.getLessonNote);
  app.put('/lesson-notes/:id', lessonNotesController.updateLessonNote);
  app.post('/lesson-notes/:id/submit', lessonNotesController.submitLessonNote);
  app.post('/lesson-notes/:id/review', lessonNotesController.reviewLessonNote);
  app.delete('/lesson-notes/:id', lessonNotesController.deleteLessonNote);
};
