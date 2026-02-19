const express = require('express');
const router = express.Router();
const schoolFeesPaymentController = require('../controllers/schoolfees.payment.controller');
const { authenticate } = require('../middleware/auth');

// Get student's pending fees
router.get(
  '/student/:admissionNo/pending',
  authenticate,
  schoolFeesPaymentController.getPendingFees
);

// Generate RRR for payment
router.post(
  '/generate-rrr',
  authenticate,
  schoolFeesPaymentController.generateRRR
);

// Verify payment
router.get(
  '/verify/:rrr',
  authenticate,
  schoolFeesPaymentController.verifyPayment
);

// Get payment history for parent
router.get(
  '/parent/:parentId/history',
  authenticate,
  schoolFeesPaymentController.getPaymentHistory
);

// Webhook endpoint (no authentication - Remita callback)
router.post(
  '/webhook/remita',
  schoolFeesPaymentController.handleWebhook
);

module.exports = router;
