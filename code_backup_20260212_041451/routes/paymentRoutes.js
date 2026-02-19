const paymentController = require('../controllers/paymentController');
const { upload } = require('../config/multerConfig'); // Use existing upload middleware
const { authenticateToken } = require('../middleware/auth'); // Import authentication middleware

module.exports = (app) => {
  // Paystack payment initialization
  app.post('/api/paystack/initialize', authenticateToken, paymentController.initializePayment);

  // Flutterwave payment initialization
  app.post('/api/flutterwave/initialize', authenticateToken, paymentController.initializeFlutterwavePayment);

  // Flutterwave payment verification
  app.post('/api/flutterwave/verify', authenticateToken, paymentController.verifyFlutterwavePayment);

  // Paystack callback endpoint (webhook from Paystack, no auth required)
  app.post('/api/paystack/callback', paymentController.handlePaystackCallback);

  // Paystack payment verification (for frontend callback)
  app.post('/api/paystack/verify', authenticateToken, paymentController.verifyPaystackPayment);

  // Bank transfer with receipt upload
  app.post('/api/bank-transfer', authenticateToken, upload.single('receipt'), paymentController.uploadBankTransferReceipt);

  // Vendor payment configuration
  app.get('/api/vendor-payment-config', authenticateToken, paymentController.getVendorPaymentConfig);
  app.put('/api/vendor-payment-config', authenticateToken, paymentController.updateVendorPaymentConfig);

  // Payment verification endpoints (for super admins)
  app.get('/api/subscription-payments', authenticateToken, paymentController.getPendingPayments);
  app.post('/api/verify-payment', authenticateToken, paymentController.verifyPayment);
};