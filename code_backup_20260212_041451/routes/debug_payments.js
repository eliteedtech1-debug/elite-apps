const debugPaymentsController = require("../controllers/debug_payments");
module.exports = (app) => {  // Debug routes for payments  
app.get("/debug-payments", debugPaymentsController.debugPayments);  
app.get("/debug-query-types", debugPaymentsController.debugQueryTypes);
};
