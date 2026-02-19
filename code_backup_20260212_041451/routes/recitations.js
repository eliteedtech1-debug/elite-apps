const express = require('express');
const router = express.Router();
const recitationsController = require('../controllers/recitationsController');
const { authenticateToken } = require('../middleware/auth');
const { uploadSingleAudio, handleUploadError, validateAudioUpload } = require('../middleware/uploadAudio');

// Apply authentication to all routes
router.use(authenticateToken);

// Teacher routes
router.post('/', 
  uploadSingleAudio,
  handleUploadError,
  validateAudioUpload,
  recitationsController.createRecitation
);

router.get('/', recitationsController.getRecitations);
router.get('/:id', recitationsController.getRecitationById);
router.get('/:id/replies', recitationsController.getReplies);

// Student reply route (with recitation_id in body)
router.post('/reply', 
  uploadSingleAudio,
  handleUploadError,
  validateAudioUpload,
  recitationsController.submitReply
);

// Student routes
router.post('/:id/replies',
  uploadSingleAudio,
  handleUploadError,
  validateAudioUpload,
  recitationsController.createReply
);

// Teacher feedback routes
router.post('/replies/:reply_id/feedback', recitationsController.submitFeedback);

// Teacher request repeat route
router.post('/replies/:reply_id/request-repeat', recitationsController.requestRepeat);

module.exports = router;
