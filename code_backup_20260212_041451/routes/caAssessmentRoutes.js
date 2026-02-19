const passport = require("passport");
const caAssessmentController = require("../controllers/caAssessmentController"); // Adjust path
const enhancedCAReportController = require("../controllers/enhancedCAReportController");
const { getEnhancedClassCAReports } = require("../controllers/enhancedClassCAReports");
const { 
  detectSchoolAssessmentType, 
  validateAssessmentMode, 
  ensureBackwardCompatibility,
  addAssessmentTypeHeaders 
} = require("../middleware/assessmentTypeDetection");

// Middleware to require authentication for all routes in this file (optional, but common)
// const requireAuth = passport.authenticate("jwt", { session: false });

module.exports = (app) => {
  // --- Enhanced CA Report Endpoints (Traditional vs Monthly School Support) ---
  
  /**
   * Enhanced Class CA Reports with automatic school type detection
   * Supports both Traditional (CA1,CA2,CA3,CA4) and Monthly (week-based) systems
   */
  app.post("/reports/class-ca-enhanced", 
    passport.authenticate("jwt", { session: false }),
    detectSchoolAssessmentType,
    validateAssessmentMode,
    ensureBackwardCompatibility,
    addAssessmentTypeHeaders,
    getEnhancedClassCAReports
  );

  /**
   * Get Enhanced CA Report (GET endpoint)
   * Auto-detects school assessment type and provides appropriate data structure
   */
  app.get("/reports/enhanced-ca-report", 
    passport.authenticate("jwt", { session: false }),
    detectSchoolAssessmentType,
    validateAssessmentMode,
    addAssessmentTypeHeaders,
    enhancedCAReportController.getEnhancedCAReport
  );

  /**
   * Get Available Assessment Types for School
   * Returns school's assessment configuration and available CA types
   */
  app.get("/assessment-types/available", 
    passport.authenticate("jwt", { session: false }),
    enhancedCAReportController.getAvailableAssessmentTypes
  );

  /**
   * Traditional CA Report (backward compatible)
   * Forces traditional assessment mode (CA1, CA2, CA3, CA4)
   */
  app.get("/reports/traditional-ca-report", 
    passport.authenticate("jwt", { session: false }),
    (req, res, next) => {
      req.query.assessment_mode = 'traditional';
      next();
    },
    validateAssessmentMode,
    addAssessmentTypeHeaders,
    enhancedCAReportController.getEnhancedCAReport
  );

  /**
   * Monthly CA Report (backward compatible)
   * Forces monthly assessment mode (week-based assessments)
   */
  app.get("/reports/monthly-ca-report", 
    passport.authenticate("jwt", { session: false }),
    (req, res, next) => {
      req.query.assessment_mode = 'monthly';
      next();
    },
    validateAssessmentMode,
    addAssessmentTypeHeaders,
    enhancedCAReportController.getEnhancedCAReport
  );

  // --- Existing CA Setup Management ---
  app.get("/ca-setups", passport.authenticate("jwt", { session: false }), caAssessmentController.getAllCASetups);
  app.get("/ca-setup", passport.authenticate("jwt", { session: false }), caAssessmentController.getCASetup);
  app.post("/ca-setup", passport.authenticate("jwt", { session: false }), caAssessmentController.createUpdateCASetup);
  app.put("/ca-setup", passport.authenticate("jwt", { session: false }), caAssessmentController.deleteCASetup);
  app.put("/ca-setup/delete", passport.authenticate("jwt", { session: false }), caAssessmentController.deleteCASetup);
  app.put("/ca-setup/update-status", passport.authenticate("jwt", { session: false }), caAssessmentController.updateCASetupStatus);
  app.put("/ca-setup/:id/lock", passport.authenticate("jwt", { session: false }), caAssessmentController.lockUnlockCASetup);
  app.get("/ca-setups/list-by-section", passport.authenticate("jwt", { session: false }), caAssessmentController.getSectionCASetup);
  // --- Grade Boundaries ---
  app.get("/grade-boundaries", passport.authenticate("jwt", { session: false }), caAssessmentController.getGradeBoundaries);
  app.post("/grade-boundaries", passport.authenticate("jwt", { session: false }), caAssessmentController.createUpdateGradeBoundaries);
  app.put("/grade-boundaries/delete", passport.authenticate("jwt", { session: false }), caAssessmentController.deleteGradeBoundaries);

  // --- Academic Data ---
  app.get("/assessment_classes", passport.authenticate("jwt", { session: false }), caAssessmentController.getClasses);
  app.get("/classes/subjects", passport.authenticate("jwt", { session: false }), caAssessmentController.getSubjectsByClass);
  app.get("/student-subject-view", passport.authenticate("jwt", { session: false }), caAssessmentController.getStudentsByClassSubject);

  // --- Weekly Progress Report / Dashboard ---
  app.get("/academic-weeks", passport.authenticate("jwt", { session: false }), caAssessmentController.getAcademicWeeks);
  app.get("/dashboard-data", passport.authenticate("jwt", { session: false }), caAssessmentController.getDashboardData);
  app.get("/week-access-control", passport.authenticate("jwt", { session: false }), caAssessmentController.getWeekAccessControl);
  app.put("/week-access-control", passport.authenticate("jwt", { session: false }), caAssessmentController.updateWeekAccessControl);

  // --- Score Management ---
  app.post("/scores", passport.authenticate("jwt", { session: false }), caAssessmentController.insertUpdateScore);
  app.post("/scores/bulk", passport.authenticate("jwt", { session: false }), caAssessmentController.bulkInsertUpdateScores);
  app.delete("/scores/:id", passport.authenticate("jwt", { session: false }), caAssessmentController.deleteScore);
  app.post("/get-scores", passport.authenticate("jwt", { session: false }), caAssessmentController.handleGetScoreRequest);
  // --- Statistics and Reporting ---
  app.get("/statistics", passport.authenticate("jwt", { session: false }), caAssessmentController.getCAStatistics);
  app.get("/reports/ca-report", passport.authenticate("jwt", { session: false }), caAssessmentController.generateCAReport);

  // --- Enhanced Administrative Endpoints ---
  app.put("/scores/lock", passport.authenticate("jwt", { session: false }), caAssessmentController.lockAllScores);
  app.put("/scores/unlock-week", passport.authenticate("jwt", { session: false }), caAssessmentController.unlockSpecificWeek);
  
  // Enhanced class CA reports with school type detection
  app.post("/reports/class-ca", 
    passport.authenticate("jwt", { session: false }),
    detectSchoolAssessmentType,
    validateAssessmentMode,
    ensureBackwardCompatibility,
    addAssessmentTypeHeaders,
    getEnhancedClassCAReports
  );
  
  // Original endpoint maintained for backward compatibility
  app.post("/reports/class-ca-original", passport.authenticate("jwt", { session: false }), caAssessmentController.getClassCAReports);
  app.post("/reports/student-end-of-term", passport.authenticate("jwt", { session: false }), caAssessmentController.getStudentEndOfTermReport);
  app.post("/reports/class-end-of-term", passport.authenticate("jwt", { session: false }), caAssessmentController.getClassEndOfTermReport);
  app.post("/reports/end_of_term_report", passport.authenticate("jwt", { session: false }), caAssessmentController.getEndOfTermReport);
  // Temporary test endpoint without auth
  app.post("/reports/end_of_term_report_test", caAssessmentController.getEndOfTermReport);
  app.post("/reports/end_of_session_aggregate", passport.authenticate("jwt", { session: false }), caAssessmentController.getEndOfSessionAggregateReport);
  app.post("/reports/class_shared_data", passport.authenticate("jwt", { session: false }), caAssessmentController.getClassSharedData);
  app.post("/reports/student_remarks_signatures", passport.authenticate("jwt", { session: false }), caAssessmentController.getStudentRemarksAndSignatures);
  app.post("/reports/assessment-progress", passport.authenticate("jwt", { session: false }), caAssessmentController.getAssessmentProgress);
  app.get("/ca-setups/list", passport.authenticate("jwt", { session: false }), caAssessmentController.listCASetups);
  app.post("/scores/update-status", passport.authenticate("jwt", { session: false }), caAssessmentController.updateScoreStatus);

  // --- Assessment Workflow Management ---
  app.post("/ca-setups/release", passport.authenticate("jwt", { session: false }), caAssessmentController.releaseAssessment);
  app.post("/ca-setups/release-status", passport.authenticate("jwt", { session: false }), caAssessmentController.getSectionReleaseStatus);
  app.post("/ca-setups/lock", passport.authenticate("jwt", { session: false }), caAssessmentController.lockAssessment);
  app.post("/ca-setups/unlock", passport.authenticate("jwt", { session: false }), caAssessmentController.unlockAssessment);
  app.post("/ca-setups/change-status", passport.authenticate("jwt", { session: false }), caAssessmentController.changeAssessmentStatus);
  app.post("/ca-setups/send-notification", passport.authenticate("jwt", { session: false }), caAssessmentController.sendTeacherNotification);
  app.post("/ca-setups/set-deadline", passport.authenticate("jwt", { session: false }), caAssessmentController.setSubmissionDeadline);
};
