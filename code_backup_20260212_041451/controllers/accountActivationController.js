const OTPService = require('../services/otpService');
const db = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * Account Activation Controller
 * Handles API endpoints for account activation flow
 */
class AccountActivationController {
  /**
   * Send activation OTP
   * POST /api/auth/send-activation-otp
   * Body: { userId, userType, phone }
   */
  static async sendActivationOTP(req, res) {
    try {
      const { userId, userType, phone, school_id: bodySchoolId, branch_id: bodyBranchId } = req.body;
      const { school_id: userSchoolId, branch_id: userBranchId } = req.user || {};

      // Use school_id and branch_id from req.user first, then fallback to req.body
      const school_id = userSchoolId || bodySchoolId;
      const branch_id = userBranchId || bodyBranchId;

      // Validation
      if (!userId || !userType) {
        return res.status(400).json({
          success: false,
          message: 'User ID and user type are required'
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required for OTP delivery'
        });
      }

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID and Branch ID are required'
        });
      }

      // Check if user exists and is not already activated
      const user = await db.sequelize.query(
        `SELECT id, is_activated, user_type, phone
         FROM users
         WHERE id = :userId`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT
        }
      );

      if (!user || user.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user[0].is_activated === 1) {
        return res.status(400).json({
          success: false,
          message: 'Account is already activated',
          error: 'ALREADY_ACTIVATED'
        });
      }

      // Generate and send OTP
      const result = await OTPService.generateActivationOTP({
        userId,
        userType,
        schoolId: school_id,
        branchId: branch_id,
        phone
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            expiresAt: result.expiresAt,
            ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in sendActivationOTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Verify activation OTP
   * POST /api/auth/verify-activation-otp
   * Body: { userId, userType, otp, autoLogin }
   */
  static async verifyActivationOTP(req, res) {
    try {
      const { userId, userType, otp, autoLogin, school_id: bodySchoolId, branch_id: bodyBranchId } = req.body;
      const { school_id: userSchoolId, branch_id: userBranchId } = req.user || {};

      // Use school_id and branch_id from req.user first, then fallback to req.body
      const school_id = userSchoolId || bodySchoolId;
      const branch_id = userBranchId || bodyBranchId;

      // Validation
      if (!userId || !userType || !otp) {
        return res.status(400).json({
          success: false,
          message: 'User ID, user type, and OTP are required'
        });
      }

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID and Branch ID are required'
        });
      }

      // Verify OTP
      const result = await OTPService.verifyActivationOTP({
        userId,
        userType,
        otp,
        schoolId: school_id,
        branchId: branch_id
      });

      if (result.success) {
        // If autoLogin requested, generate token and return user data
        if (autoLogin) {
          const jwt = require('jsonwebtoken');
          const [user] = await db.sequelize.query(
            `SELECT id, name, email, user_type, school_id, branch_id, phone FROM users WHERE id = :userId`,
            { replacements: { userId }, type: QueryTypes.SELECT }
          );
          
          if (user) {
            const token = jwt.sign(
              { id: user.id, user_type: user.user_type, school_id: user.school_id, branch_id: user.branch_id, email: user.email },
              process.env.JWT_SECRET || 'secret',
              { expiresIn: '24h' }
            );
            
            return res.status(200).json({
              success: true,
              message: result.message,
              token,
              user
            });
          }
        }
        
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            result: result.result,
            nextStep: 'change_password'
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.result
        });
      }
    } catch (error) {
      console.error('Error in verifyActivationOTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Complete activation with password change
   * POST /api/auth/complete-activation
   * Body: { userId, userType, newPassword, confirmPassword }
   */
  static async completeActivation(req, res) {
    try {
      const { userId, userType, newPassword, confirmPassword, school_id: bodySchoolId, branch_id: bodyBranchId } = req.body;
      const { school_id: userSchoolId, branch_id: userBranchId } = req.user || {};

      // Use school_id and branch_id from req.user first, then fallback to req.body
      const school_id = userSchoolId || bodySchoolId;
      const branch_id = userBranchId || bodyBranchId;

      // Validation
      if (!userId || !userType || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID and Branch ID are required'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // Check if user is activated and must change password
      const user = await db.sequelize.query(
        `SELECT id, is_activated, must_change_password
         FROM users
         WHERE id = :userId`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT
        }
      );

      if (!user || user.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user[0].is_activated !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Account is not activated. Please verify OTP first.',
          error: 'NOT_ACTIVATED'
        });
      }

      if (user[0].must_change_password !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Password change not required',
          error: 'NO_PASSWORD_CHANGE_REQUIRED'
        });
      }

      // Get IP and user agent
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      // Complete activation
      const result = await OTPService.completeActivation({
        userId,
        userType,
        newPassword,
        schoolId: school_id,
        branchId: branch_id,
        ipAddress,
        userAgent
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            activationComplete: true,
            canLogin: true
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
          errors: result.errors
        });
      }
    } catch (error) {
      console.error('Error in completeActivation:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Resend activation OTP
   * POST /api/auth/resend-activation-otp
   * Body: { userId, userType, phone }
   */
  static async resendActivationOTP(req, res) {
    try {
      const { userId, userType, phone, school_id: bodySchoolId, branch_id: bodyBranchId } = req.body;
      const { school_id: userSchoolId, branch_id: userBranchId } = req.user || {};

      // Use school_id and branch_id from req.user first, then fallback to req.body
      const school_id = userSchoolId || bodySchoolId;
      const branch_id = userBranchId || bodyBranchId;

      // Validation
      if (!userId || !userType || !phone) {
        return res.status(400).json({
          success: false,
          message: 'User ID, user type, and phone number are required'
        });
      }

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID and Branch ID are required'
        });
      }

      // Check cooldown period
      const cooldownMinutes = parseInt(process.env.OTP_RESEND_COOLDOWN_MINUTES) || 1;

      const lastOTP = await db.sequelize.query(
        `SELECT created_at
         FROM account_activation_logs
         WHERE user_id = :userId
           AND user_type = :userType
           AND action = 'otp_sent'
         ORDER BY created_at DESC
         LIMIT 1`,
        {
          replacements: { userId, userType },
          type: QueryTypes.SELECT
        }
      );

      if (lastOTP && lastOTP.length > 0) {
        const lastSentTime = new Date(lastOTP[0].created_at);
        const now = new Date();
        const minutesSinceLastOTP = (now - lastSentTime) / 1000 / 60;

        if (minutesSinceLastOTP < cooldownMinutes) {
          const remainingSeconds = Math.ceil((cooldownMinutes * 60) - (minutesSinceLastOTP * 60));
          return res.status(429).json({
            success: false,
            message: `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
            error: 'COOLDOWN_PERIOD',
            data: { remainingSeconds }
          });
        }
      }

      // Generate and send new OTP
      const result = await OTPService.generateActivationOTP({
        userId,
        userType,
        schoolId: school_id,
        branchId: branch_id,
        phone
      });

      // Log resend action
      await db.sequelize.query(
        `INSERT INTO account_activation_logs
         (user_id, user_type, action, status, school_id, branch_id)
         VALUES (:userId, :userType, 'otp_resent', 'success', :schoolId, :branchId)`,
        {
          replacements: { userId, userType, schoolId: school_id, branchId: branch_id },
          type: QueryTypes.INSERT
        }
      );

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'New OTP sent successfully',
          data: {
            expiresAt: result.expiresAt,
            ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in resendActivationOTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Check activation status
   * GET /api/auth/activation-status/:userId
   */
  static async getActivationStatus(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const user = await db.sequelize.query(
        `SELECT
           is_activated,
           must_change_password,
           first_login_completed,
           activated_at,
           activation_method
         FROM users
         WHERE id = :userId`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT
        }
      );

      if (!user || user.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const status = user[0];

      return res.status(200).json({
        success: true,
        data: {
          isActivated: status.is_activated === 1,
          mustChangePassword: status.must_change_password === 1,
          firstLoginCompleted: status.first_login_completed === 1,
          activatedAt: status.activated_at,
          activationMethod: status.activation_method,
          nextStep: this.determineNextStep(status)
        }
      });
    } catch (error) {
      console.error('Error in getActivationStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Manual activation by admin
   * POST /api/auth/manual-activation
   * Body: { userId }
   * Requires: Admin authentication
   */
  static async manualActivation(req, res) {
    try {
      const { userId, school_id: bodySchoolId, branch_id: bodyBranchId } = req.body;
      const { school_id: userSchoolId, branch_id: userBranchId, user_id: adminId } = req.user || {};

      // Use school_id and branch_id from req.user first, then fallback to req.body
      const school_id = userSchoolId || bodySchoolId;
      const branch_id = userBranchId || bodyBranchId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID and Branch ID are required'
        });
      }

      // TODO: Add admin authorization check

      const result = await OTPService.manualActivation({
        userId,
        adminId,
        schoolId: school_id,
        branchId: branch_id
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in manualActivation:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get activation logs (admin only)
   * GET /api/auth/activation-logs/:userId
   */
  static async getActivationLogs(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const logs = await db.sequelize.query(
        `SELECT
           id,
           user_type,
           action,
           status,
           failure_reason,
           ip_address,
           created_at
         FROM account_activation_logs
         WHERE user_id = :userId
         ORDER BY created_at DESC
         LIMIT :limit`,
        {
          replacements: { userId, limit: parseInt(limit) },
          type: QueryTypes.SELECT
        }
      );

      return res.status(200).json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('Error in getActivationLogs:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Helper: Determine next step in activation flow
   */
  static determineNextStep(status) {
    if (status.is_activated === 0) {
      return 'verify_otp';
    } else if (status.must_change_password === 1) {
      return 'change_password';
    } else if (status.first_login_completed === 0) {
      return 'complete_profile';
    } else {
      return 'login';
    }
  }

  /**
   * Validate password strength (endpoint for frontend)
   * POST /api/auth/validate-password
   * Body: { password }
   */
  static async validatePassword(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }

      const validation = OTPService.validatePasswordStrength(password);

      return res.status(200).json({
        success: validation.valid,
        data: {
          valid: validation.valid,
          message: validation.message,
          errors: validation.errors
        }
      });
    } catch (error) {
      console.error('Error in validatePassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = AccountActivationController;
