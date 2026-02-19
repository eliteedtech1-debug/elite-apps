const db = require('../models');
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

/**
 * OTP Service for Account Activation
 * Handles OTP generation, verification, and rate limiting
 */
class OTPService {
  /**
   * Generate and send activation OTP
   * @param {Object} params - { userId, userType, schoolId, branchId, phone, email, userName }
   * @returns {Promise<Object>} - { success, otp, expiresAt, message }
   */
  static async generateActivationOTP({ userId, userType, schoolId, branchId, phone, email, userName }) {
    try {
      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit({ userId, userType, requestType: 'activation_otp' });
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: rateLimitCheck.message,
          error: 'RATE_LIMIT_EXCEEDED'
        };
      }

      // Call stored procedure to generate OTP
      const result = await db.sequelize.query(
        'CALL generate_activation_otp(:p_user_id, :p_user_type, :p_school_id, :p_branch_id, @p_otp, @p_expires_at)',
        {
          replacements: {
            p_user_id: userId,
            p_user_type: userType,
            p_school_id: schoolId,
            p_branch_id: branchId
          },
          type: QueryTypes.RAW
        }
      );

      // Get the OUT parameters
      const outParams = await db.sequelize.query('SELECT @p_otp as otp, @p_expires_at as expires_at', {
        type: QueryTypes.SELECT
      });

      const { otp, expires_at } = outParams[0];

      // Send OTP via both SMS and Email simultaneously
      const deliveryPromises = [];
      const deliveryChannels = [];

      // Send via SMS if phone number provided
      if (phone) {
        deliveryPromises.push(this.sendOTPviaSMS(phone, otp, userType, schoolId));
        deliveryChannels.push('SMS');
      }

      // Send via Email if email provided
      if (email) {
        deliveryPromises.push(this.sendOTPviaEmail(email, otp, userType, userName));
        deliveryChannels.push('Email');
      }

      // Wait for all deliveries to complete (don't fail if one fails)
      await Promise.allSettled(deliveryPromises);

      // Update rate limit
      await this.updateRateLimit({ userId, userType, requestType: 'activation_otp' });

      // Build response message
      let deliveryMessage = 'Activation OTP sent';
      if (deliveryChannels.length > 0) {
        const maskedPhone = phone ? this.maskPhone(phone) : null;
        const maskedEmail = email ? this.maskEmail(email) : null;

        if (maskedPhone && maskedEmail) {
          deliveryMessage = `Activation OTP sent to ${maskedPhone} (SMS) and ${maskedEmail} (Email). Valid for 5 minutes.`;
        } else if (maskedPhone) {
          deliveryMessage = `Activation OTP sent to ${maskedPhone} (SMS). Valid for 5 minutes.`;
        } else if (maskedEmail) {
          deliveryMessage = `Activation OTP sent to ${maskedEmail} (Email). Valid for 5 minutes.`;
        }
      }

      return {
        success: true,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined, // Only return OTP in dev mode
        expiresAt: expires_at,
        message: deliveryMessage,
        deliveryChannels
      };
    } catch (error) {
      console.error('Error generating activation OTP:', error);
      return {
        success: false,
        message: 'Failed to generate OTP',
        error: error.message
      };
    }
  }

  /**
   * Verify activation OTP
   * @param {Object} params - { userId, userType, otp, schoolId, branchId }
   * @returns {Promise<Object>} - { success, result, message }
   */
  static async verifyActivationOTP({ userId, userType, otp, schoolId, branchId }) {
    try {
      // Call stored procedure to verify OTP
      await db.sequelize.query(
        'CALL verify_activation_otp(:p_user_id, :p_user_type, :p_otp, :p_school_id, :p_branch_id, @p_result, @p_message)',
        {
          replacements: {
            p_user_id: userId,
            p_user_type: userType,
            p_otp: otp,
            p_school_id: schoolId,
            p_branch_id: branchId
          },
          type: QueryTypes.RAW
        }
      );

      // Get the OUT parameters
      const outParams = await db.sequelize.query('SELECT @p_result as result, @p_message as message', {
        type: QueryTypes.SELECT
      });

      const { result, message } = outParams[0];

      return {
        success: result === 'SUCCESS',
        result,
        message
      };
    } catch (error) {
      console.error('Error verifying activation OTP:', error);
      return {
        success: false,
        result: 'ERROR',
        message: 'Failed to verify OTP',
        error: error.message
      };
    }
  }

  /**
   * Complete account activation with password change
   * @param {Object} params - { userId, userType, newPassword, schoolId, branchId, ipAddress, userAgent }
   * @returns {Promise<Object>} - { success, message }
   */
  static async completeActivation({ userId, userType, newPassword, schoolId, branchId, ipAddress, userAgent }) {
    try {
      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.message,
          errors: passwordValidation.errors
        };
      }

      // Check password history
      const historyCheck = await this.checkPasswordHistory({ userId, userType, newPassword });
      if (!historyCheck.allowed) {
        return {
          success: false,
          message: historyCheck.message,
          error: 'PASSWORD_REUSE'
        };
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and complete activation
      await db.sequelize.query(
        `UPDATE users
         SET password = :password,
             must_change_password = 0,
             first_login_completed = 1,
             password_changed_at = NOW()
         WHERE id = :userId`,
        {
          replacements: { password: hashedPassword, userId },
          type: QueryTypes.UPDATE
        }
      );

      // Save password to history
      await this.savePasswordHistory({ userId, userType, passwordHash: hashedPassword, ipAddress, userAgent });

      // Log activation completion
      await db.sequelize.query(
        `INSERT INTO account_activation_logs
         (user_id, user_type, action, status, school_id, branch_id, ip_address, user_agent)
         VALUES (:userId, :userType, 'password_changed', 'success', :schoolId, :branchId, :ipAddress, :userAgent)`,
        {
          replacements: { userId, userType, schoolId, branchId, ipAddress, userAgent },
          type: QueryTypes.INSERT
        }
      );

      return {
        success: true,
        message: 'Account activated successfully. You can now login with your new password.'
      };
    } catch (error) {
      console.error('Error completing activation:', error);
      return {
        success: false,
        message: 'Failed to complete activation',
        error: error.message
      };
    }
  }

  /**
   * Check rate limiting for OTP requests
   * @param {Object} params - { userId, userType, requestType }
   * @returns {Promise<Object>} - { allowed, message }
   */
  static async checkRateLimit({ userId, userType, requestType }) {
    try {
      const windowMinutes = parseInt(process.env.OTP_REQUEST_WINDOW_MINUTES) || 15;
      const maxRequests = parseInt(process.env.MAX_OTP_REQUESTS_PER_WINDOW) || 3;

      const result = await db.sequelize.query(
        `SELECT COUNT(*) as request_count
         FROM otp_rate_limits
         WHERE user_id = :userId
           AND user_type = :userType
           AND request_type = :requestType
           AND window_end > NOW()`,
        {
          replacements: { userId, userType, requestType },
          type: QueryTypes.SELECT
        }
      );

      const requestCount = result[0]?.request_count || 0;

      if (requestCount >= maxRequests) {
        return {
          allowed: false,
          message: `Too many OTP requests. Please try again after ${windowMinutes} minutes.`
        };
      }

      return {
        allowed: true,
        remainingAttempts: maxRequests - requestCount
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Allow request if rate limit check fails (fail open)
      return { allowed: true };
    }
  }

  /**
   * Update rate limit record
   * @param {Object} params - { userId, userType, requestType }
   */
  static async updateRateLimit({ userId, userType, requestType, ipAddress }) {
    try {
      const windowMinutes = parseInt(process.env.OTP_REQUEST_WINDOW_MINUTES) || 15;

      await db.sequelize.query(
        `INSERT INTO otp_rate_limits (user_id, user_type, request_type, ip_address, window_end)
         VALUES (:userId, :userType, :requestType, :ipAddress, NOW() + INTERVAL ${windowMinutes} MINUTE)`,
        {
          replacements: { userId, userType, requestType, ipAddress },
          type: QueryTypes.INSERT
        }
      );
    } catch (error) {
      console.error('Error updating rate limit:', error);
    }
  }

  /**
   * Validate password strength
   * @param {string} password
   * @returns {Object} - { valid, message, errors }
   */
  static validatePasswordStrength(password) {
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
    const requireUppercase = process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false';
    const requireLowercase = process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false';
    const requireNumber = process.env.PASSWORD_REQUIRE_NUMBER !== 'false';
    const requireSpecial = process.env.PASSWORD_REQUIRE_SPECIAL !== 'false';

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('. ') : 'Password is strong',
      errors
    };
  }

  /**
   * Check password history to prevent reuse
   * @param {Object} params - { userId, userType, newPassword }
   * @returns {Promise<Object>} - { allowed, message }
   */
  static async checkPasswordHistory({ userId, userType, newPassword }) {
    try {
      const historyCount = parseInt(process.env.PASSWORD_HISTORY_COUNT) || 5;

      const history = await db.sequelize.query(
        `SELECT password_hash
         FROM secure_passwords_history
         WHERE user_id = :userId AND user_type = :userType
         ORDER BY created_at DESC
         LIMIT ${historyCount}`,
        {
          replacements: { userId, userType },
          type: QueryTypes.SELECT
        }
      );

      // Check if new password matches any of the historical passwords
      for (const record of history) {
        const matches = await bcrypt.compare(newPassword, record.password_hash);
        if (matches) {
          return {
            allowed: false,
            message: `Password was used recently. Please choose a different password.`
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking password history:', error);
      // Allow password change if history check fails
      return { allowed: true };
    }
  }

  /**
   * Save password to history
   * @param {Object} params - { userId, userType, passwordHash, ipAddress, userAgent }
   */
  static async savePasswordHistory({ userId, userType, passwordHash, ipAddress, userAgent }) {
    try {
      const historyCount = parseInt(process.env.PASSWORD_HISTORY_COUNT) || 5;

      // Insert new password
      await db.sequelize.query(
        `INSERT INTO secure_passwords_history (user_id, user_type, password_hash, ip_address, user_agent)
         VALUES (:userId, :userType, :passwordHash, :ipAddress, :userAgent)`,
        {
          replacements: { userId, userType, passwordHash, ipAddress, userAgent },
          type: QueryTypes.INSERT
        }
      );

      // Keep only last N passwords
      await db.sequelize.query(
        `DELETE FROM secure_passwords_history
         WHERE user_id = :userId AND user_type = :userType
         AND id NOT IN (
           SELECT id FROM (
             SELECT id FROM secure_passwords_history
             WHERE user_id = :userId AND user_type = :userType
             ORDER BY created_at DESC
             LIMIT ${historyCount}
           ) AS recent_passwords
         )`,
        {
          replacements: { userId, userType },
          type: QueryTypes.DELETE
        }
      );
    } catch (error) {
      console.error('Error saving password history:', error);
    }
  }

  /**
   * Send OTP via SMS
   * @param {string} phone
   * @param {string} otp
   * @param {string} userType
   */
  static async sendOTPviaSMS(phone, otp, userType, schoolId = null) {
    try {
      // Use existing SMS service
      const smsService = require('./smsService');

      // Fetch school information to determine language preference
      let schoolInfo = null;
      if (schoolId) {
        try {
          const db = require('../models');
          const [schools] = await db.sequelize.query(
            'SELECT default_lang FROM school_setup WHERE school_id = ?',
            { replacements: [schoolId], type: db.sequelize.QueryTypes.SELECT }
          );
          schoolInfo = schools && schools.length > 0 ? schools[0] : null;
        } catch (err) {
          console.warn('Could not fetch school language settings:', err.message);
        }
      }

      // Check if school uses Arabic as default language
      const schoolLanguage = schoolInfo?.default_lang || 'en';
      const isArabic = schoolLanguage === 'ar';

      // Create appropriate OTP message based on language
      const message = isArabic
        ? `رمز تفعيل حسابك في إليت شولر هو: ${otp}. سارٍ لمدة 5 دقائق. لا تشارك هذا الرمز مع أي شخص.`
        : `Your ElScholar account activation OTP is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;

      await smsService.sendSMS({
        phone,
        message,
        purpose: 'account_activation'
      });

      console.log(`✅ OTP SMS sent to ${this.maskPhone(phone)} for ${userType} activation`);
    } catch (error) {
      console.error('❌ Error sending OTP SMS:', error);
      // Don't throw error - OTP is still generated and can be used
    }
  }

  /**
   * Send OTP via Email
   * @param {string} email
   * @param {string} otp
   * @param {string} userType
   * @param {string} userName
   */
  static async sendOTPviaEmail(email, otp, userType, userName) {
    try {
      // Use existing email service
      const emailService = require('./emailService');

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
            <p>If you didn't request this OTP, please ignore this email or contact support if you have concerns.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Security Tips:</strong><br>
              • Never share your OTP with anyone<br>
              • ElScholar staff will never ask for your OTP<br>
              • This OTP is valid for 5 minutes only
            </p>
          </div>
        `,
        notification_type: 'account_activation',
        template_data: {
          otp,
          user_type: userType,
          user_name: userName,
          expiry_minutes: 5
        }
      }, {
        priority: 1 // High priority for activation OTP
      });

      console.log(`✅ OTP Email sent to ${this.maskEmail(email)} for ${userType} activation`);
    } catch (error) {
      console.error('❌ Error sending OTP Email:', error);
      // Don't throw error - OTP is still generated and can be used
    }
  }

  /**
   * Mask phone number for privacy
   * @param {string} phone
   * @returns {string}
   */
  static maskPhone(phone) {
    if (!phone || phone.length < 4) return '****';
    return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
  }

  /**
   * Mask email address for privacy
   * @param {string} email
   * @returns {string}
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

  /**
   * Manually activate account (admin action)
   * @param {Object} params - { userId, adminId, schoolId, branchId }
   * @returns {Promise<Object>}
   */
  static async manualActivation({ userId, adminId, schoolId, branchId }) {
    try {
      await db.sequelize.query(
        `UPDATE users
         SET is_activated = 1,
             activated_at = NOW(),
             activation_method = 'manual_admin',
             activation_otp = NULL,
             activation_otp_expires_at = NULL
         WHERE id = :userId`,
        {
          replacements: { userId },
          type: QueryTypes.UPDATE
        }
      );

      // Log manual activation
      await db.sequelize.query(
        `INSERT INTO account_activation_logs
         (user_id, user_type, action, status, school_id, branch_id, metadata)
         VALUES (:userId, 'Staff', 'manual_activation', 'success', :schoolId, :branchId, :metadata)`,
        {
          replacements: {
            userId,
            schoolId,
            branchId,
            metadata: JSON.stringify({ activated_by_admin_id: adminId })
          },
          type: QueryTypes.INSERT
        }
      );

      return {
        success: true,
        message: 'Account activated manually by admin'
      };
    } catch (error) {
      console.error('Error in manual activation:', error);
      return {
        success: false,
        message: 'Failed to activate account',
        error: error.message
      };
    }
  }
}

module.exports = OTPService;
