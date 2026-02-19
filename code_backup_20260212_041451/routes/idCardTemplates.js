const express = require('express');
const router = express.Router();
const IdCardTemplateController = require('../controllers/IdCardTemplateController');
const auth = require('../middleware/auth');
const multer = require('multer');
const IdCardService = require('../services/IdCardService');

const upload = multer({ dest: 'uploads/temp/' });

// Template CRUD operations
router.post('/', auth.authenticate, (req, res) => {
  IdCardTemplateController.createTemplate(req, res);
});
router.get('/', auth.authenticate, (req, res) => {
  IdCardTemplateController.getTemplates(req, res);
});
router.get('/default', auth.authenticate, (req, res) => {
  IdCardTemplateController.getDefaultTemplate(req, res);
});
router.get('/:id', auth.authenticate, (req, res) => {
  IdCardTemplateController.getTemplate(req, res);
});
router.put('/:id', auth.authenticate, (req, res) => {
  IdCardTemplateController.updateTemplate(req, res);
});
router.delete('/:id', auth.authenticate, (req, res) => {
  IdCardTemplateController.deleteTemplate(req, res);
});

// Image upload endpoints
router.post('/upload-logo', auth.authenticate, upload.single('logo'), async (req, res) => {
  try {
    const { school_id } = req.user;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const logoUrl = await IdCardService.uploadImage(req.file, `${school_id}/logos`);
    res.json({ 
      success: true, 
      message: 'Logo uploaded successfully',
      data: { logo_url: logoUrl } 
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/upload-background', auth.authenticate, upload.single('background'), async (req, res) => {
  try {
    const { school_id } = req.user;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const backgroundUrl = await IdCardService.uploadImage(req.file, `${school_id}/backgrounds`);
    res.json({ 
      success: true, 
      message: 'Background uploaded successfully',
      data: { background_url: backgroundUrl } 
    });
  } catch (error) {
    console.error('Background upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Template preview endpoint
router.post('/:id/preview', auth.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const sampleData = req.body.sample_data || {
      first_name: 'John',
      last_name: 'Doe',
      student_id: 'SAMPLE001',
      class_name: 'Grade 10A'
    };

    const preview = await IdCardService.getCardPreview(id, sampleData);
    res.json({ 
      success: true, 
      message: 'Preview generated successfully',
      data: preview 
    });
  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save ID card template configuration
router.post('/save', async (req, res) => {
  try {
    const { school_id, branch_id, template_config } = req.body;
    const user_id = req.headers['x-user-id'];
    const header_school_id = req.headers['x-school-id'];
    const header_branch_id = req.headers['x-branch-id'];

    const final_school_id = school_id || header_school_id;
    const final_branch_id = branch_id || header_branch_id;

    if (!final_school_id || !template_config) {
      return res.status(400).json({
        success: false,
        message: 'School ID and template configuration are required'
      });
    }

    console.log('Saving template config:', {
      user_id,
      school_id: final_school_id,
      branch_id: final_branch_id,
      template_config
    });

    res.json({
      success: true,
      message: 'Template configuration saved successfully'
    });

  } catch (error) {
    console.error('Error saving template config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save template configuration'
    });
  }
});

module.exports = router;