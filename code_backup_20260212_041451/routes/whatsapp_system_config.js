const express = require('express');
const router = express.Router();
const whatsappService = require('../services/baileysWhatsappService');

// Get WhatsApp connection status
router.post('/status', async (req, res) => {
  try {
    const schoolId = 'SYSTEM'; // Global system-level WhatsApp for developers
    const client = whatsappService.clients.get(schoolId);
    
    if (client && client.user) {
      res.json({
        success: true,
        data: {
          status: 'connected',
          number: client.user.id.split('@')[0]
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          status: 'disconnected',
          number: null
        }
      });
    }
  } catch (error) {
    console.error('WhatsApp status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check WhatsApp status',
      error: error.message
    });
  }
});

// Initialize WhatsApp connection
router.post('/initialize', async (req, res) => {
  try {
    const schoolId = 'SYSTEM'; // Global system-level WhatsApp for developers
    
    console.log('🔄 Initializing SYSTEM WhatsApp...');
    
    // Initialize client without waiting for connection
    await whatsappService.initializeClient(schoolId, 'SystemWhatsApp', false);
    
    console.log('✅ Client initialized, waiting for QR code generation...');
    
    // Wait a bit for QR code to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get QR code if available
    const qrCode = whatsappService.qrCodes.get(schoolId);
    
    console.log('📱 QR Code status:', qrCode ? 'Available' : 'Not available');
    
    if (qrCode && qrCode.qr) {
      res.json({
        success: true,
        data: {
          qrCode: qrCode.qr,
          message: 'WhatsApp initialization started. Please scan the QR code.'
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Failed to generate QR code. Please try again.'
      });
    }
  } catch (error) {
    console.error('WhatsApp initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize WhatsApp',
      error: error.message
    });
  }
});

// Disconnect WhatsApp
router.post('/disconnect', async (req, res) => {
  try {
    const schoolId = 'SYSTEM'; // Global system-level WhatsApp for developers
    
    await whatsappService.disconnect(schoolId);
    
    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    console.error('WhatsApp disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect WhatsApp',
      error: error.message
    });
  }
});

// Cleanup session (force delete session files)
router.post('/cleanup', async (req, res) => {
  try {
    const schoolId = 'SYSTEM';
    
    console.log('🧹 Cleaning up SYSTEM WhatsApp session...');
    
    await whatsappService.disconnect(schoolId);
    
    res.json({
      success: true,
      message: 'WhatsApp session cleaned up successfully. You can now reconnect.'
    });
  } catch (error) {
    console.error('WhatsApp cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup WhatsApp session',
      error: error.message
    });
  }
});

module.exports = router;
