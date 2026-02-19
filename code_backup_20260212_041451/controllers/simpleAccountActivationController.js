const db = require('../models');
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Simple Account Activation Controller
 * Handles account activation without stored procedures
 * Works with just userId, userType, phone/email, and school_id
 */
class SimpleAccountActivationController {
  /**
   * Generate OTP directly in database
   * POST /api/auth/simple/send-otp
   * Body: { userId, userType, phone?, email?, school_id }
   */
  static async sendOTP(req, res) {
    try {
      const { userId, userType, phone, email, school_id } = req.body;

      // Validation
      if (!userId || !userType || !school_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID, user type, and school ID are required'
        });
      }

      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          message: 'Either phone number or email is required for OTP delivery'
        });
      }

      // Check if user exists
      const [user] = await db.sequelize.query(
        `SELECT id, is_activated, phone, email, name FROM users WHERE id = :userId AND school_id = :school_id`,
        {
          replacements: { userId, school_id },
          type: QueryTypes.SELECT
        }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.is_activated === 1) {
        return res.status(400).json({
          success: false,
          message: 'Account is already activated'
        });
      }

      // Check rate limiting (max 3 OTPs per 15 minutes)
      const rateLimitCheck = await this.checkRateLimit(userId, userType);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: rateLimitCheck.message
        });
      }

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database
      await db.sequelize.query(
        `INSERT INTO account_activation_otps (user_id, user_type, otp, expires_at, school_id, created_at)
         VALUES (:userId, :userType, :otp, :expiresAt, :school_id, NOW())
         ON DUPLICATE KEY UPDATE 
         otp = :otp, expires_at = :expiresAt, attempts = 0, created_at = NOW()`,
        {
          replacements: { userId, userType, otp, expiresAt, school_id },
          type: QueryTypes.INSERT
        }
      );

      // Send OTP via available channels
      const deliveryResults = await this.sendOTPToChannels({
        otp,
        phone: phone || user.phone,
        email: email || user.email,
        userName: user.name,
        userType,
        school_id
      });

      // Update rate limit
      await this.updateRateLimit(userId, userType, req.ip);

      return res.status(200).json({
        success: true,
        message: deliveryResults.message,
        data: {
          expiresAt,
          deliveryChannels: deliveryResults.channels,
          ...(process.env.NODE_ENV === 'development' && { otp })
        }
      });

    } catch (error) {
      console.error('Error in sendOTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Verify OTP by checking database records
   * POST /api/auth/simple/verify-otp
   * Body: { userId, userType, otp, school_id }
   */
  static async verifyOTP(req, res) {
    try {
      const { userId, userType, otp, school_id } = req.body;

      // Validation
      if (!userId || !userType || !otp || !school_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID, user type, OTP, and school ID are required'
        });
      }

      // Get OTP record
      const [otpRecord] = await db.sequelize.query(
        `SELECT id, otp, expires_at, attempts FROM account_activation_otps 
         WHERE user_id = :userId AND user_type = :userType AND school_id = :school_id
         ORDER BY created_at DESC LIMIT 1`,
        {
          replacements: { userId, userType, school_id },
          type: QueryTypes.SELECT
        }
      );

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found. Please request a new OTP.'
        });
      }

      // Check if OTP is expired
      if (new Date() > new Date(otpRecord.expires_at)) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        });
      }

      // Check attempts limit
      if (otpRecord.attempts >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        });
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        // Increment attempts
        await db.sequelize.query(
          `UPDATE account_activation_otps SET attempts = attempts + 1 WHERE id = :id`,
          {
            replacements: { id: otpRecord.id },
            type: QueryTypes.UPDATE
          }
        );

        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please try again.',
          data: { remainingAttempts: 2 - otpRecord.attempts }
        });
      }

      // OTP is valid - activate user account
      await db.sequelize.query(
        `UPDATE users SET 
         is_activated = 1, 
         activated_at = NOW(), 
         activation_method = 'otp_simple',
         must_change_password = 1
         WHERE id = :userId AND school_id = :school_id`,
        {
          replacements: { userId, school_id },
          type: QueryTypes.UPDATE
        }
      );

      // Clear OTP record
      await db.sequelize.query(
        `DELETE FROM account_activation_otps WHERE id = :id`,
        {
          replacements: { id: otpRecord.id },
          type: QueryTypes.DELETE
        }
      );

      // Log successful activation
      await this.logActivationEvent({
        userId,
        userType,
        action: 'otp_verified',
        status: 'success',
        school_id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(200).json({
        success: true,
        message: 'Account activated successfully. Please set your password.',
        data: {
          activated: true,
          nextStep: 'set_password'
        }
      });

    } catch (error) {
      console.error('Error in verifyOTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update user activation status directly
   * POST /api/auth/simple/set-password
   * Body: { userId, userType, password, confirmPassword, school_id }
   */
  static async setPassword(req, res) {
    try {
      const { userId, userType, password, confirmPassword, school_id } = req.body;

      // Validation
      if (!userId || !userType || !password || !confirmPassword || !school_id) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
          errors: passwordValidation.errors
        });
      }

      // Check if user is activated and needs password change
      const [user] = await db.sequelize.query(
        `SELECT id, is_activated, must_change_password FROM users 
         WHERE id = :userId AND school_id = :school_id`,
        {
          replacements: { userId, school_id },
          type: QueryTypes.SELECT
        }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.is_activated !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Account is not activated. Please verify OTP first.'
        });
      }

      if (user.must_change_password !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Password change not required'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      await db.sequelize.query(
        `UPDATE users SET 
         password = :password,
         must_change_password = 0,
         first_login_completed = 1,
         password_changed_at = NOW()
         WHERE id = :userId AND school_id = :school_id`,
        {
          replacements: { password: hashedPassword, userId, school_id },
          type: QueryTypes.UPDATE
        }
      );

      // Log password change
      await this.logActivationEvent({
        userId,
        userType,
        action: 'password_set',
        status: 'success',
        school_id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(200).json({
        success: true,
        message: 'Password set successfully. You can now login.',
        data: {
          activationComplete: true,
          canLogin: true
        }
      });

    } catch (error) {
      console.error('Error in setPassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get activation status
   * GET /api/auth/simple/status/:userId/:school_id
   */
  static async getActivationStatus(req, res) {
    try {
      const { userId, school_id } = req.params;

      if (!userId || !school_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID and school ID are required'
        });
      }

      const [user] = await db.sequelize.query(
        `SELECT is_activated, must_change_password, first_login_completed, 
         activated_at, activation_method FROM users 
         WHERE id = :userId AND school_id = :school_id`,
        {
          replacements: { userId, school_id },
          type: QueryTypes.SELECT
        }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          isActivated: user.is_activated === 1,
          mustChangePassword: user.must_change_password === 1,
          firstLoginCompleted: user.first_login_completed === 1,
          activatedAt: user.activated_at,
          activationMethod: user.activation_method,
          nextStep: this.determineNextStep(user)
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
   * Check rate limiting
   */
  static async checkRateLimit(userId, userType) {
    try {
      const windowMinutes = 15;
      const maxRequests = 3;

      const [result] = await db.sequelize.query(
        `SELECT COUNT(*) as request_count FROM account_activation_rate_limits 
         WHERE user_id = :userId AND user_type = :userType 
         AND created_at > DATE_SUB(NOW(), INTERVAL ${windowMinutes} MINUTE)`,
        {
          replacements: { userId, userType },
          type: QueryTypes.SELECT
        }
      );

      const requestCount = result?.request_count || 0;

      if (requestCount >= maxRequests) {
        return {
          allowed: false,
          message: `Too many OTP requests. Please try again after ${windowMinutes} minutes.`
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Update rate limit record
   */
  static async updateRateLimit(userId, userType, ipAddress) {
    try {
      await db.sequelize.query(
        `INSERT INTO account_activation_rate_limits (user_id, user_type, ip_address, created_at)
         VALUES (:userId, :userType, :ipAddress, NOW())`,
        {
          replacements: { userId, userType, ipAddress },
          type: QueryTypes.INSERT
        }
      );
    } catch (error) {
      console.error('Error updating rate limit:', error);
    }
  }

  /**
   * Send OTP to available channels
   */
  static async sendOTPToChannels({ otp, phone, email, userName, userType, school_id }) {
    const deliveryPromises = [];
    const channels = [];

    // Send via SMS if phone available
    if (phone) {
      deliveryPromises.push(this.sendOTPviaSMS(phone, otp, userType, school_id));
      channels.push('SMS');
    }

    // Send via Email if email available
    if (email) {
      deliveryPromises.push(this.sendOTPviaEmail(email, otp, userType, userName));
      channels.push('Email');
    }

    // Wait for all deliveries (don't fail if one fails)
    await Promise.allSettled(deliveryPromises);

    // Build message
    let message = 'Activation OTP sent';
    if (phone && email) {
      message = `Activation OTP sent to ${this.maskPhone(phone)} (SMS) and ${this.maskEmail(email)} (Email). Valid for 5 minutes.`;
    } else if (phone) {
      message = `Activation OTP sent to ${this.maskPhone(phone)} (SMS). Valid for 5 minutes.`;
    } else if (email) {
      message = `Activation OTP sent to ${this.maskEmail(email)} (Email). Valid for 5 minutes.`;
    }

    return { message, channels };
  }

  /**
   * Send OTP via SMS
   */
  static async sendOTPviaSMS(phone, otp, userType, school_id) {
    try {
      const smsService = require('../services/smsService');
      
      const message = `Your ElScholar account activation OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`;

      await smsService.sendSMS({
        phone,
        message,
        purpose: 'account_activation'
      });

      console.log(`✅ OTP SMS sent to ${this.maskPhone(phone)}`);
    } catch (error) {
      console.error('❌ Error sending OTP SMS:', error);
    }
  }

  /**
   * Send OTP via Email
   */
  static async sendOTPviaEmail(email, otp, userType, userName) {
    try {
      const emailService = require('../services/emailService');

      await emailService.sendNotification({
        email,
        user_name: userName || userType,
        subject: 'Account Activation OTP - ElScholar',
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Account Activation OTP</h2>
            <p>Hello ${userName || userType},</p>
            <p>Your account activation OTP is:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #ef4444; font-weight: bold;">This OTP will expire in 5 minutes.</p>
            <p>If you didn't request this OTP, please ignore this email.</p>
          </div>
        `,
        notification_type: 'account_activation'
      }, { priority: 1 });

      console.log(`✅ OTP Email sent to ${this.maskEmail(email)}`);
    } catch (error) {
      console.error('❌ Error sending OTP Email:', error);
    }
  }

  /**
   * Log activation events
   */
  static async logActivationEvent({ userId, userType, action, status, school_id, ipAddress, userAgent, metadata }) {
    try {
      await db.sequelize.query(
        `INSERT INTO account_activation_logs 
         (user_id, user_type, action, status, school_id, ip_address, user_agent, metadata, created_at)
         VALUES (:userId, :userType, :action, :status, :school_id, :ipAddress, :userAgent, :metadata, NOW())`,
        {
          replacements: {
            userId,
            userType,
            action,
            status,
            school_id,
            ipAddress,
            userAgent,
            metadata: metadata ? JSON.stringify(metadata) : null
          },
          type: QueryTypes.INSERT
        }
      );
    } catch (error) {
      console.error('Error logging activation event:', error);
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password) {
    const minLength = 8;
    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('. ') : 'Password is strong',
      errors
    };
  }

  /**
   * Determine next step in activation flow
   */
  static determineNextStep(user) {
    if (user.is_activated === 0) {
      return 'verify_otp';
    } else if (user.must_change_password === 1) {
      return 'set_password';
    } else if (user.first_login_completed === 0) {
      return 'complete_profile';
    } else {
      return 'login';
    }
  }

  /**
   * Mask phone number for privacy
   */
  static maskPhone(phone) {
    if (!phone || phone.length < 4) return '****';
    return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
  }

  /**
   * Mask email address for privacy
   */
  static maskEmail(email) {
    if (!email || !email.includes('@')) return '****@****.***';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart.slice(-1);
    return `${maskedLocal}@${domain}`;
  }
}

module.exports = SimpleAccountActivationController;