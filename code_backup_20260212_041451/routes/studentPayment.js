const passport = require("passport");
const {
  studentPayment,
  getstudentpayment,
  processPayment,
  getStudentBalance,
  getPaymentReceipts,
  studentpayment,
  completeProcessPayment,
  allChildPayment,
  getGeneralLedger,
  getIndividualLedeger,
  processParentPayment,
} = require("../controllers/studentPayment");

module.exports = (app) => {
  app.post(
    "/api/studentpayment",
    passport.authenticate("jwt", { session: false }),
    studentPayment
  );
  app.get(
    "/api/getstudentpayment",
    passport.authenticate("jwt", { session: false }),
    getstudentpayment
  );
  app.get(
    "/api/studentpaymentInGeneral",
    passport.authenticate("jwt", { session: false }),
    studentPayment
  );
  app.get(
    "/api/allchildpaymentdetails",
    passport.authenticate("jwt", { session: false }),
    allChildPayment
  );
  app.post(
    "/api/processpayment",
    // passport.authenticate("jwt", { session: false }), // Temporarily disabled for debugging
    processPayment
  );
  app.post(
    "/api/completeprocesspayment",
    passport.authenticate("jwt", { session: false }),
    completeProcessPayment
  );
  app.get(
    "/api/getstudentbalance",
    passport.authenticate("jwt", { session: false }),
    getStudentBalance
  );
  app.get(
    "/api/getpaymentreciept",
    passport.authenticate("jwt", { session: false }),
    getPaymentReceipts
  );
  app.get(
    "/api/getgeneralledger",
    passport.authenticate("jwt", { session: false }),
    getGeneralLedger
  );
  app.get(
    "/api/getindividualledger",
    passport.authenticate("jwt", { session: false }),
    getIndividualLedeger
  );
  app.post(
    "/api/processparentpayment",
    passport.authenticate("jwt", { session: false }),
    processParentPayment
  );
};

// new procedures
// studentPayments, getstudentPayments ,processPayment , generateReceiptId , student_balances, getProcesecedPayment, completeprocesspayment
