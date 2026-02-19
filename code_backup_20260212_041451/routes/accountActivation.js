const express = require('express');
const router = express.Router();
const AccountActivationController = require('../controllers/accountActivationController');

/**
 * Account Activation Routes
 * All routes under /api/auth/activation
 */

// Send activation OTP
router.post('/send-otp', AccountActivationController.sendActivationOTP);

// Resend activation OTP
router.post('/resend-otp', AccountActivationController.resendActivationOTP);

// Verify activation OTP
router.post('/verify-otp', AccountActivationController.verifyActivationOTP);

// Complete activation with password change
router.post('/complete', AccountActivationController.completeActivation);

// Get activation status
router.get('/status/:userId', AccountActivationController.getActivationStatus);

// Manual activation by admin (requires admin auth)
router.post('/manual-activate', AccountActivationController.manualActivation);

// Get activation logs (admin only)
router.get('/logs/:userId', AccountActivationController.getActivationLogs);

// Validate password strength
router.post('/validate-password', AccountActivationController.validatePassword);

module.exports = router;
