const passport = require("passport");
const GAAPComplianceController = require("../controllers/GAAPComplianceController");

/**
 * GAAP Compliance Routes
 * Handles all GAAP compliance operations
 */

module.exports = (app) => {
  
  // Update payment status for accrual accounting
  app.post(
    "/api/gaap/payment-status",
    passport.authenticate("jwt", { session: false }),
    GAAPComplianceController.updatePaymentStatus
  );
  
  // Calculate bad debt allowance
  app.post(
    "/api/gaap/bad-debt-allowance",
    passport.authenticate("jwt", { session: false }),
    GAAPComplianceController.calculateBadDebtAllowance
  );
  
  // Create deferred revenue entry
  app.post(
    "/api/gaap/deferred-revenue",
    passport.authenticate("jwt", { session: false }),
    GAAPComplianceController.createDeferredRevenue
  );
  
  // Recognize deferred revenue
  app.post(
    "/api/gaap/recognize-revenue",
    passport.authenticate("jwt", { session: false }),
    GAAPComplianceController.recognizeDeferredRevenue
  );
  
  // Create period-end adjustments
  app.post(
    "/api/gaap/period-adjustments",
    passport.authenticate("jwt", { session: false }),
    GAAPComplianceController.createPeriodEndAdjustments
  );
  
  // Generate financial statements
  app.get(
    "/api/gaap/financial-statements",
    passport.authenticate("jwt", { session: false }),
    GAAPComplianceController.generateFinancialStatements
  );
  
  // Get GAAP compliance status
  app.get(
    "/api/gaap/compliance-status",
    passport.authenticate("jwt", { session: false }),
    GAAPComplianceController.getComplianceStatus
  );
};
