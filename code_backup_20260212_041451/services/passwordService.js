const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../models');

/**
 * Password Service
 * Handles password validation, hashing, and security features
 */

/**
 * Password strength validation
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const maxLength = 128;
  
  const checks = {
    length: password.length >= minLength && password.length <= maxLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noSpaces: !/\s/.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  let strength = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  const requirements = [];
  if (!checks.length) requirements.push(`At least ${minLength} characters`);
  if (!checks.uppercase) requirements.push('At least one uppercase letter');
  if (!checks.lowercase) requirements.push('At least one lowercase letter');
  if (!checks.numbers) requirements.push('At least one number');
  if (!checks.symbols) requirements.push('At least one special character');
  if (!checks.noSpaces) requirements.push('No spaces allowed');
  
  return {
    isValid: score >= 4, // Require at least 4 criteria
    strength,
    score,
    checks,
    requirements,
    message: requirements.length > 0 ? `Password must have: ${requirements.join(', ')}` : 'Password meets requirements'
  };
};

/**
 * Hash password with bcrypt
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify password against hash
 */
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate secure verification code
 */
const generateVerificationCode = (length = 6) => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
};

/**
 * Generate secure token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Check if password was recently used
 */
const checkPasswordHistory = async (userId, userType, newPasswordHash, historyLimit = 5) => {
  try {
    let historyQuery;
    
    switch (userType?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        historyQuery = `
          SELECT password_hash FROM password_history 
          WHERE user_id = :userId AND user_type = :userType 
          ORDER BY created_at DESC LIMIT :historyLimit
        `;
        break;
      case 'teacher':
        historyQuery = `
          SELECT password_hash FROM password_history 
          WHERE user_id = :userId AND user_type = 'teacher' 
          ORDER BY created_at DESC LIMIT :historyLimit
        `;
        break;
      case 'student':
        historyQuery = `
          SELECT password_hash FROM password_history 
          WHERE user_id = :userId AND user_type = 'student' 
          ORDER BY created_at DESC LIMIT :historyLimit
        `;
        break;
      case 'parent':
        historyQuery = `
          SELECT password_hash FROM password_history 
          WHERE user_id = :userId AND user_type = 'parent' 
          ORDER BY created_at DESC LIMIT :historyLimit
        `;
        break;
      default:
        return false;
    }
    
    const history = await db.sequelize.query(historyQuery, {
      replacements: { userId, userType, historyLimit },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    // Check if new password matches any in history
    for (const record of history) {
      if (await verifyPassword(newPasswordHash, record.password_hash)) {
        return true; // Password was recently used
      }
    }
    
    return false;
  } catch (error) {
    console.error('Password history check error:', error);
    return false; // Allow password change if history check fails
  }
};

/**
 * Store password in history
 */
const storePasswordHistory = async (userId, userType, passwordHash) => {
  try {
    await db.sequelize.query(
      `INSERT INTO password_history (user_id, user_type, password_hash, created_at) 
       VALUES (:userId, :userType, :passwordHash, NOW())`,
      {
        replacements: { userId, userType, passwordHash },
        type: db.sequelize.QueryTypes.INSERT
      }
    );
    
    // Clean up old history (keep only last 10 passwords)
    await db.sequelize.query(
      `DELETE FROM password_history 
       WHERE user_id = :userId AND user_type = :userType 
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM password_history 
           WHERE user_id = :userId AND user_type = :userType 
           ORDER BY created_at DESC LIMIT 10
         ) AS recent
       )`,
      {
        replacements: { userId, userType },
        type: db.sequelize.QueryTypes.DELETE
      }
    );
  } catch (error) {
    console.error('Password history storage error:', error);
    // Don't fail password change if history storage fails
  }
};

/**
 * Change password with verification
 */
const changePassword = async (userId, userType, currentPassword, newPassword, verificationCode = null) => {
  try {
    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: passwordValidation.message,
        validation: passwordValidation
      };
    }
    
    // Get current password hash
    let currentPasswordQuery;
    switch (userType?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        currentPasswordQuery = `SELECT password FROM users WHERE id = :userId`;
        break;
      case 'teacher':
        currentPasswordQuery = `SELECT u.password FROM users u JOIN teachers t ON u.id = t.user_id WHERE t.user_id = :userId`;
        break;
      case 'student':
        currentPasswordQuery = `SELECT password FROM students WHERE admission_no = :userId`;
        break;
      case 'parent':
        currentPasswordQuery = `SELECT u.password FROM users u JOIN parents p ON u.id = p.user_id WHERE p.user_id = :userId`;
        break;
      default:
        return {
          success: false,
          message: 'Invalid user type'
        };
    }
    
    const currentPasswordResult = await db.sequelize.query(currentPasswordQuery, {
      replacements: { userId },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (currentPasswordResult.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    const currentPasswordHash = currentPasswordResult[0].password;
    
    // Verify current password
    if (currentPasswordHash && !(await verifyPassword(currentPassword, currentPasswordHash))) {
      return {
        success: false,
        message: 'Current password is incorrect'
      };
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Check password history
    const wasRecentlyUsed = await checkPasswordHistory(userId, userType, newPassword);
    if (wasRecentlyUsed) {
      return {
        success: false,
        message: 'Password was recently used. Please choose a different password.'
      };
    }
    
    // Update password
    let updatePasswordQuery;
    switch (userType?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        updatePasswordQuery = `UPDATE users SET password = :newPasswordHash, updated_at = NOW() WHERE id = :userId`;
        break;
      case 'teacher':
        updatePasswordQuery = `UPDATE users SET password = :newPasswordHash, updated_at = NOW() WHERE id = (SELECT user_id FROM teachers WHERE user_id = :userId)`;
        break;
      case 'student':
        updatePasswordQuery = `UPDATE students SET password = :newPasswordHash, updated_at = NOW() WHERE admission_no = :userId`;
        break;
      case 'parent':
        updatePasswordQuery = `UPDATE users SET password = :newPasswordHash, updated_at = NOW() WHERE id = (SELECT user_id FROM parents WHERE user_id = :userId)`;
        break;
    }
    
    await db.sequelize.query(updatePasswordQuery, {
      replacements: { newPasswordHash, userId },
      type: db.sequelize.QueryTypes.UPDATE
    });
    
    // Store in password history
    if (currentPasswordHash) {
      await storePasswordHistory(userId, userType, currentPasswordHash);
    }
    
    // Log activity
    await db.sequelize.query(
      `INSERT INTO user_activity_log (user_id, activity_type, description, created_at) 
       VALUES (:userId, 'password_change', 'Password changed successfully', NOW())`,
      {
        replacements: { userId },
        type: db.sequelize.QueryTypes.INSERT
      }
    );
    
    return {
      success: true,
      message: 'Password changed successfully',
      passwordStrength: passwordValidation.strength
    };
    
  } catch (error) {
    console.error('Password change error:', error);
    return {
      success: false,
      message: 'An error occurred while changing password'
    };
  }
};

/**
 * Generate password reset token
 */
const generatePasswordResetToken = async (userId, userType, contact) => {
  try {
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store reset token - contact can be email or phone
    await db.sequelize.query(
      `INSERT INTO password_reset_tokens (user_id, user_type, email, contact, token, expires_at, created_at) 
       VALUES (:userId, :userType, :contact, :contact, :token, :expiresAt, NOW()) 
       ON DUPLICATE KEY UPDATE token = :token, expires_at = :expiresAt, created_at = NOW()`,
      {
        replacements: { userId, userType, contact, token, expiresAt },
        type: db.sequelize.QueryTypes.INSERT
      }
    );
    
    return {
      success: true,
      token,
      expiresAt
    };
  } catch (error) {
    console.error('Password reset token generation error:', error);
    return {
      success: false,
      message: 'Failed to generate reset token'
    };
  }
};

/**
 * Verify password reset token
 */
const verifyPasswordResetToken = async (token) => {
  try {
    const result = await db.sequelize.query(
      `SELECT user_id, user_type, email, expires_at FROM password_reset_tokens 
       WHERE token = :token AND expires_at > NOW() AND used_at IS NULL`,
      {
        replacements: { token },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (result.length === 0) {
      return {
        success: false,
        message: 'Invalid or expired reset token'
      };
    }
    
    return {
      success: true,
      data: result[0]
    };
  } catch (error) {
    console.error('Password reset token verification error:', error);
    return {
      success: false,
      message: 'Failed to verify reset token'
    };
  }
};

module.exports = {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  generateVerificationCode,
  generateSecureToken,
  changePassword,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  checkPasswordHistory,
  storePasswordHistory
};