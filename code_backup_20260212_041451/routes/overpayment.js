const passport = require("passport");
const {
  processOverpayment,
  getStudentBalanceAllTerms,
  getStudentPaymentHistory,
} = require("../controllers/overpaymentController");

module.exports = (app) => {
  // Process overpayment across multiple terms
  app.post(
    "/api/process-overpayment",
    passport.authenticate("jwt", { session: false }),
    processOverpayment
  );

  // Get student balance across all terms
  app.get(
    "/api/student-balance-all-terms",
    passport.authenticate("jwt", { session: false }),
    getStudentBalanceAllTerms
  );

  // Get detailed payment history for a student
  app.get(
    "/api/student-payment-trace",
    passport.authenticate("jwt", { session: false }),
    getStudentPaymentHistory
  );
};
