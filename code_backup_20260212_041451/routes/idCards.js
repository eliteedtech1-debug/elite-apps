const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import sub-routers
const templateRoutes = require('./idCardTemplates');
const generationRoutes = require('./idCardGeneration');

// Mount sub-routes
router.use('/templates', templateRoutes);
router.use('/generation', generationRoutes);

// Health check endpoint
router.get('/health', auth.authenticate, (req, res) => {
  res.json({ 
    success: true, 
    message: 'ID Card service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;