const passport = require('passport');
const profileController = require('../controllers/profileController');
const { checkProfileAccess, filterRequestFields, logProfileActivity } = require('../middleware/profileAccessControl');
const passwordService = require('../services/passwordService');

module.exports = (app) => {
  // Apply authentication middleware to all profile routes
  const authMiddleware = passport.authenticate('jwt', { session: false });
  
  // Profile Data Routes
  
  /**
   * GET /api/profile/user
   * Get user profile data with role-based field filtering
   */
  app.get('/api/profile/user', 
    authMiddleware,
    checkProfileAccess,
    logProfileActivity,
    profileController.getUserProfile
  );
  
  /**
   * PUT /api/profile/user
   * Update user profile with role-based access control
   */
  app.put('/api/profile/user',
    authMiddleware,
    checkProfileAccess,
    filterRequestFields,
    logProfileActivity,
    profileController.updateProfile
  );
  
  /**
   * GET /api/profile/security
   * Get security settings and status
   */
  app.get('/api/profile/security',
    authMiddleware,
    checkProfileAccess,
    logProfileActivity,
    profileController.getSecuritySettings
  );
  
  /**
   * PUT /api/profile/picture
   * Update profile picture
   */
  app.put('/api/profile/picture',
    authMiddleware,
    checkProfileAccess,
    logProfileActivity,
    profileController.updateProfilePicture
  );
  
  // Password Management Routes
  
  /**
   * POST /api/profile/password/validate
   * Validate password strength
   */
  app.post('/api/profile/password/validate',
    authMiddleware,
    async (req, res) => {
      try {
        const { password } = req.body;
        
        if (!password) {
          return res.status(400).json({
            success: false,
            message: 'Password is required'
          });
        }
        
        const validation = passwordService.validatePasswordStrength(password);
        
        res.json({
          success: true,
          validation
        });
      } catch (error) {
        console.error('Password validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Password validation failed'
        });
      }
    }
  );
  
  /**
   * POST /api/profile/password/change
   * Change password with verification
   */
  app.post('/api/profile/password/change',
    authMiddleware,
    logProfileActivity,
    async (req, res) => {
      try {
        const { current_password, new_password, verification_code } = req.body;
        const user = req.user;
        
        if (!current_password || !new_password) {
          return res.status(400).json({
            success: false,
            message: 'Current password and new password are required'
          });
        }
        
        const result = await passwordService.changePassword(
          user.id || user.user_id,
          user.user_type,
          current_password,
          new_password,
          verification_code
        );
        
        if (result.success) {
          res.json({
            success: true,
            message: result.message,
            passwordStrength: result.passwordStrength
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.message,
            validation: result.validation
          });
        }
      } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
          success: false,
          message: 'Password change failed'
        });
      }
    }
  );
};