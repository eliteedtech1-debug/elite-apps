const { 
  updateApplicationStatusWithNotification, 
  submitApplicationWithNotification,
  sendBulkNotifications 
} = require("../controllers/enhanced_application_controller");
const passport = require("passport");

module.exports = (app) => {
  // Enhanced application submission with notifications
  app.post("/application-enhanced/submit",
    passport.authenticate('jwt', { session: false }),
    submitApplicationWithNotification
  );

  // Enhanced status update with notifications
  app.post("/application-enhanced/update-status",
    passport.authenticate('jwt', { session: false }),
    updateApplicationStatusWithNotification
  );

  // Bulk notifications
  app.post("/application-enhanced/bulk-notifications",
    passport.authenticate('jwt', { session: false }),
    sendBulkNotifications
  );
};
