// Middleware to inject notifications into existing messaging
const notificationService = require('../services/notificationService');

const injectNotifications = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to inject notifications
  res.json = function(data) {
    // If this is a successful messaging response, send notification
    if (data.success && req.body && (req.body.message || req.body.title)) {
      const { recipients, message, title, school_id } = req.body;
      
      // Send notification in background (non-blocking)
      if (recipients && recipients.length > 0) {
        notificationService.integrateWithMessaging({
          recipients: Array.isArray(recipients) ? recipients : [recipients],
          title: title || 'New Message',
          message: message || 'You have received a new message',
          type: 'info',
          schoolId: school_id || req.user?.school_id
        }).catch(err => console.error('Notification integration error:', err));
      }
    }
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = { injectNotifications };
