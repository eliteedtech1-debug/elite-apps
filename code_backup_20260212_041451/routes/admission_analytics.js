const { 
  getAdmissionDashboard,
  getApplicationReports,
  getAdmissionComparison
} = require("../controllers/admission_analytics");
const passport = require("passport");

module.exports = (app) => {
  // Get admission dashboard analytics
  app.get("/analytics/admission/dashboard",
    passport.authenticate('jwt', { session: false }),
    getAdmissionDashboard
  );

  // Get detailed application reports
  app.get("/analytics/admission/reports",
    passport.authenticate('jwt', { session: false }),
    getApplicationReports
  );

  // Get admission comparison data
  app.get("/analytics/admission/comparison",
    passport.authenticate('jwt', { session: false }),
    getAdmissionComparison
  );
};
