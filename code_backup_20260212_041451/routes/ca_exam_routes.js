const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const caExamProcessController = require('../controllers/caExamProcessController');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/ca-questions');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ca-question-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOC/DOCX files allowed.'));
    }
  }
});

// ==================== CA SETUP ROUTES (Admin/Branch Admin) ====================
router.get('/ca-setup', authenticateToken, caExamProcessController.getCASetups);
router.post('/ca-setup', authenticateToken, caExamProcessController.createCASetup);
router.put('/ca-setup/:id', authenticateToken, caExamProcessController.updateCASetup);
router.put('/ca-setup', authenticateToken, caExamProcessController.updateCASetupBulk); // For deactivate/delete operations
router.delete('/ca-setup/:id', authenticateToken, caExamProcessController.deleteCASetup);

// ==================== SUBMISSION ROUTES (Teachers) ====================
router.get('/ca-submissions/my', authenticateToken, caExamProcessController.getTeacherSubmissions);
router.get('/teacher-subjects', authenticateToken, caExamProcessController.getTeacherSubjects);
router.post('/ca-submissions', authenticateToken, upload.single('questionFile'), caExamProcessController.submitQuestions);
router.put('/ca-submissions/:id', authenticateToken, upload.single('questionFile'), caExamProcessController.updateSubmission);
router.delete('/ca-submissions/:id', authenticateToken, caExamProcessController.deleteSubmission);
router.post('/ca-submissions/:id/submit', authenticateToken, caExamProcessController.submitForModeration);

// ==================== MODERATION ROUTES (Admin/Moderators) ====================
router.get('/ca-moderation/pending', authenticateToken, caExamProcessController.getPendingSubmissions);
router.post('/ca-moderation/:id/approve', authenticateToken, caExamProcessController.approveSubmission);
router.post('/ca-moderation/:id/reject', authenticateToken, caExamProcessController.rejectSubmission);
router.post('/ca-moderation/:id/request-modification', authenticateToken, caExamProcessController.requestModification);
router.post('/ca-moderation/:id/replace-file', authenticateToken, upload.single('replacementFile'), caExamProcessController.replaceQuestionFile);
router.get('/ca-moderation/logs/:submission_id', authenticateToken, caExamProcessController.getModerationLogs);

// ==================== PRINT ROUTES (Admin/Teachers) ====================
router.get('/ca-print/approved', authenticateToken, caExamProcessController.getApprovedForPrint);
router.post('/ca-print/generate/:id', authenticateToken, caExamProcessController.generatePDF);
router.get('/ca-print/download/:id', authenticateToken, caExamProcessController.downloadPDF);

// ==================== PROGRESS TRACKING ROUTES (Admin/Management) ====================
router.get('/ca-progress/overview', authenticateToken, caExamProcessController.getProgressOverview);
router.get('/ca-progress/by-subject', authenticateToken, caExamProcessController.getProgressBySubject);
router.get('/ca-progress/by-teacher', authenticateToken, caExamProcessController.getProgressByTeacher);
router.get('/ca-progress/by-class', authenticateToken, caExamProcessController.getProgressByClass);

// ==================== NOTIFICATION ROUTES ====================
router.get('/ca-notifications/my', authenticateToken, caExamProcessController.getMyNotifications);
router.put('/ca-notifications/:id/read', authenticateToken, caExamProcessController.markNotificationRead);

module.exports = router;
