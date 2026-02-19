const express = require('express');
const router = express.Router();
const IdCardGenerationController = require('../controllers/IdCardGenerationController');
const auth = require('../middleware/auth');
const multer = require('multer');
const IdCardService = require('../services/IdCardService');

const upload = multer({ dest: 'uploads/temp/' });

// Card generation endpoints
router.post('/single', auth.authenticate, IdCardGenerationController.generateSingleCard);
router.post('/batch', auth.authenticate, IdCardGenerationController.generateBatchCards);
router.get('/batch/:batch_id/status', auth.authenticate, IdCardGenerationController.getBatchStatus);
router.get('/:id/download', auth.authenticate, IdCardGenerationController.downloadCard);
router.get('/student/:student_id', auth.authenticate, IdCardGenerationController.getStudentCards);

// Student photo upload endpoint
router.post('/upload-student-photo', auth.authenticate, upload.single('photo'), async (req, res) => {
  try {
    const { school_id } = req.user;
    const { student_id } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No photo uploaded' });
    }

    if (!student_id) {
      return res.status(400).json({ success: false, error: 'Student ID is required' });
    }

    const photoUrl = await IdCardService.uploadImage(req.file, `${school_id}/students`);
    res.json({ 
      success: true, 
      message: 'Student photo uploaded successfully',
      data: { photo_url: photoUrl, student_id } 
    });
  } catch (error) {
    console.error('Student photo upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk photo upload endpoint
router.post('/upload-bulk-photos', auth.authenticate, upload.array('photos', 50), async (req, res) => {
  try {
    const { school_id } = req.user;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No photos uploaded' });
    }

    const uploadPromises = req.files.map(async (file, index) => {
      try {
        const photoUrl = await IdCardService.uploadImage(file, `${school_id}/students`);
        return { 
          success: true, 
          original_name: file.originalname,
          photo_url: photoUrl 
        };
      } catch (error) {
        return { 
          success: false, 
          original_name: file.originalname,
          error: error.message 
        };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({ 
      success: true, 
      message: `Uploaded ${successful.length} photos successfully`,
      data: { 
        successful: successful.length,
        failed: failed.length,
        results 
      } 
    });
  } catch (error) {
    console.error('Bulk photo upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;