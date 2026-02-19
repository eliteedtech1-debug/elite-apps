const { 
  getNotificationHistory, 
  resendNotification 
} = require("../controllers/notification_service");
const passport = require("passport");

module.exports = (app) => {
  // Get notification history for an applicant
  app.get("/notifications/history/:applicant_id",
    passport.authenticate('jwt', { session: false }),
    getNotificationHistory
  );

  // Resend notification
  app.post("/notifications/resend",
    passport.authenticate('jwt', { session: false }),
    resendNotification
  );
};
