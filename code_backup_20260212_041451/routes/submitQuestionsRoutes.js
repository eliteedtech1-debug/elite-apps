/**
 * Submit Questions Routes
 * API endpoints for CA/Exam question submission
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/submitQuestionsController');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/exam-questions';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'question-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept PDF, DOC, DOCX files
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Routes
router.get('/ca-setups', controller.getCASetups);
router.get('/submissions', controller.getTeacherSubmissions);
router.get('/submissions/stats', controller.getSubmissionStats);
router.post('/submissions', controller.createSubmission);
router.post('/submissions/:submission_id/upload', upload.single('question_file'), controller.uploadQuestionFile);
router.put('/submissions/:id', controller.updateSubmission);
router.post('/submissions/:id/submit', controller.submitForModeration);
router.delete('/submissions/:id', controller.deleteSubmission);

module.exports = router;
