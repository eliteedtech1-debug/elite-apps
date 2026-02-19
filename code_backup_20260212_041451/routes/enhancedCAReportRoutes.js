const passport = require("passport");
const enhancedCAReportController = require("../controllers/enhancedCAReportController");

module.exports = (app) => {
  // Enhanced CA Report endpoints with Traditional/Monthly school support
  
  /**
   * Get Enhanced CA Report
   * Supports both Traditional (CA1,CA2,CA3,CA4) and Monthly (week-based) systems
   * Query params:
   * - class_code: Class identifier
   * - subject_code: Subject identifier  
   * - ca_type: Assessment type (CA1, CA2, etc.)
   * - week_number: Week number (for monthly schools)
   * - admission_no: Student admission number
   * - academic_year: Academic year
   * - term: Academic term
   * - assessment_mode: 'traditional' or 'monthly' (optional, auto-detected)
   */
  app.get(
    "/reports/enhanced-ca-report", 
    passport.authenticate("jwt", { session: false }), 
    enhancedCAReportController.getEnhancedCAReport
  );

  /**
   * Get Available Assessment Types
   * Returns the school's assessment configuration (Traditional vs Monthly)
   * and available CA types
   */
  app.get(
    "/assessment-types/available", 
    passport.authenticate("jwt", { session: false }), 
    enhancedCAReportController.getAvailableAssessmentTypes
  );

  // Backward compatibility endpoints
  
  /**
   * Traditional CA Report (backward compatible)
   * Specifically for Traditional schools using CA1, CA2, CA3, CA4 system
   */
  app.get(
    "/reports/traditional-ca-report", 
    passport.authenticate("jwt", { session: false }), 
    (req, res, next) => {
      req.query.assessment_mode = 'traditional';
      next();
    },
    enhancedCAReportController.getEnhancedCAReport
  );

  /**
   * Monthly CA Report (backward compatible)
   * Specifically for Monthly schools using week-based assessments
   */
  app.get(
    "/reports/monthly-ca-report", 
    passport.authenticate("jwt", { session: false }), 
    (req, res, next) => {
      req.query.assessment_mode = 'monthly';
      next();
    },
    enhancedCAReportController.getEnhancedCAReport
  );

  /**
   * Class CA Report with school type detection
   * Enhanced version of existing getClassCAReports endpoint
   */
  app.post(
    "/reports/class-ca-enhanced", 
    passport.authenticate("jwt", { session: false }), 
    (req, res, next) => {
      // Convert POST body to query params for consistency
      req.query = { ...req.query, ...req.body };
      next();
    },
    enhancedCAReportController.getEnhancedCAReport
  );
};