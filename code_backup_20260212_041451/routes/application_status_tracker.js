const { 
  updateApplicationStatus, 
  getApplicationStatusHistory, 
  getStatusDashboard,
  getNextPossibleStatuses 
} = require("../controllers/application_status_tracker");
const passport = require("passport");

module.exports = (app) => {
  // Update application status
  app.post("/application-status/update",
    passport.authenticate('jwt', { session: false }),
    updateApplicationStatus
  );

  // Get application status history
  app.get("/application-status/history/:applicant_id",
    passport.authenticate('jwt', { session: false }),
    getApplicationStatusHistory
  );

  // Get status dashboard
  app.get("/application-status/dashboard",
    passport.authenticate('jwt', { session: false }),
    getStatusDashboard
  );

  // Get next possible statuses for an application
  app.get("/application-status/next-statuses/:applicant_id",
    passport.authenticate('jwt', { session: false }),
    getNextPossibleStatuses
  );
};
