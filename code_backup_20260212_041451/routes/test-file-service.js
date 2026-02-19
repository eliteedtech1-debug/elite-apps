const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cloudinaryAlt = require('../../CloudinaryAltenative');

const router = express.Router();
const upload = multer({ dest: 'temp/' });

// Upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('File received:', req.file);
    console.log('FILE_REPO_URL:', process.env.FILE_REPO_URL);
    console.log('FILE_REPO_API_KEY:', process.env.FILE_REPO_API_KEY);
    
    // Pass the original filename to help with file type detection
    const result = await cloudinaryAlt.uploader.upload(req.file.path, {
      filename: req.file.originalname
    });
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      result: {
        secure_url: result.secure_url,
        public_id: result.public_id,
        url: result.url
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete endpoint
router.delete('/delete/:publicId', async (req, res) => {
  try {
    const result = await cloudinaryAlt.uploader.destroy(req.params.publicId);
    
    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
