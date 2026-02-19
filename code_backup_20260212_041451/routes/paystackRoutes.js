const paystackController = require('../controllers/paystackController');

module.exports = (app) => {
  app.get('/banks', paystackController.getAllBanks);
  app.post('/resolve-account', paystackController.resolveBankAccount);
  app.get('/banks/:id', paystackController.getBankById);

  // Subscription payment routes - moved to paymentRoutes.js to avoid conflicts
  // app.post('/api/paystack/initialize', paystackController.initializePayment);
  // app.get('/api/paystack/verify', paystackController.verifyPayment);
};