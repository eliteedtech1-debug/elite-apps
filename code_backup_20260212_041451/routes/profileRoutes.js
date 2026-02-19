const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Get user profile
router.get('/', profileController.getUserProfile);
router.get('/profile', profileController.getUserProfile); // Alternative route for clarity

// Security settings
router.get('/security-settings', profileController.getSecuritySettings);

// Profile picture update
router.put('/update-profile-picture', profileController.updateProfilePicture);

// Email change and verification
router.post('/request-email-change', profileController.requestEmailChange);
router.post('/send-email-verification', profileController.sendEmailVerification);
router.post('/verify-email-change', profileController.verifyEmailChange);
router.get('/pending-email-change', profileController.getPendingEmailChange);
router.post('/cancel-email-change', profileController.cancelEmailChange);

// Profile management
router.put('/update-profile', profileController.updateProfile);

// Teacher specific routes
router.get('/teachers/profile-data', profileController.getTeacherProfileData);

// Password change verification
router.post('/send-verification-code', profileController.sendVerificationCode);
router.post('/change-password-verified', profileController.changePasswordVerified);

module.exports = router;