const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinaryAlt = require('../../CloudinaryAltenative');

const router = express.Router();

// Configure multer for temporary file storage
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/');

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// File upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to CloudinaryAlternative
    const uploadResult = await cloudinaryAlt.uploader.upload(req.file.path, {
      filename: req.file.originalname,
      folder: 'profiles'
    });

    // Clean up temp file
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      result: {
        filename: req.file.originalname,
        size: req.file.size,
        secure_url: uploadResult.secure_url || uploadResult.url,
        public_id: uploadResult.public_id
      }
    });
  } catch (error) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

module.exports = router;
