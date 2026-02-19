const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../models');
const otpService = require('../services/otpService');

// Simple OTP generation
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP endpoint
router.post('/send-otp', async (req, res) => {
  try {
    const { userId, userType, phone, email, school_id, delivery_method = 'email' } = req.body;

    if (!userId || !userType || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: userId, userType, school_id'
      });
    }

    let targetEmail = email;
    let targetPhone = phone;

    // If email or phone are missing, try to lookup user by userId/username/email and school_id/short_name
    let canonicalUserId = userId;
    let canonicalUserType = userType;
    let canonicalSchoolId = school_id;

    if (!targetEmail || !targetPhone) {
      const userLookup = await db.sequelize.query(
        `SELECT u.id, u.email, u.phone, u.user_type, u.school_id, u.username
         FROM users u
         LEFT JOIN school_setup ss ON u.school_id = ss.school_id
         WHERE (u.id = :userId OR u.username = :userId OR u.email = :userId) 
         AND (u.school_id = :school_id OR ss.short_name = :school_id OR u.school_id = :short_name OR ss.short_name = :short_name)
         LIMIT 1`,
        {
          replacements: {
            userId,
            school_id: school_id || '',
            short_name: req.body.short_name || school_id || ''
          },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      if (userLookup.length > 0) {
        targetEmail = userLookup[0].email;
        targetPhone = userLookup[0].phone;
        canonicalUserId = userLookup[0].id.toString();
        canonicalUserType = userLookup[0].user_type;
        canonicalSchoolId = userLookup[0].school_id;
      } else {
        return res.status(404).json({
          success: false,
          message: `User '${userId}' not found in school '${school_id}'. Please check your ID and school name.`
        });
      }
    }

    if (!targetEmail && !targetPhone) {
      return res.status(400).json({
        success: false,
        message: 'Either phone or email is required. No contact information found for this ID.'
      });
    }

    // Simple rate limiting - max 3 requests per 15 minutes
    const rateLimitCheck = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM account_activation_otps 
       WHERE user_id = ? AND user_type = ? AND school_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      {
        replacements: [canonicalUserId, canonicalUserType, canonicalSchoolId],
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    if (rateLimitCheck[0].count >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait 15 minutes before trying again.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database (simple table)
    await db.sequelize.query(
      `INSERT INTO account_activation_otps (user_id, user_type, school_id, otp, expires_at, delivery_method, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at), delivery_method = VALUES(delivery_method), created_at = NOW()`,
      {
        replacements: [canonicalUserId, canonicalUserType, canonicalSchoolId, otp, expiresAt, delivery_method],
        type: db.Sequelize.QueryTypes.INSERT
      }
    );

    // Send OTP via email/SMS using existing service
    try {
      if ((delivery_method === 'email' || !delivery_method) && targetEmail) {
        await otpService.sendOTPviaEmail(targetEmail, otp, userType, 'User');
      } else if (delivery_method === 'sms' && targetPhone) {
        await otpService.sendOTPviaSMS(targetPhone, otp, userType, 'User');
      } else if (delivery_method === 'both' || !delivery_method) {
        // Send via both if requested, or if no method specified and both available
        const deliveryPromises = [];
        if (targetEmail) deliveryPromises.push(otpService.sendOTPviaEmail(targetEmail, otp, userType, 'User'));
        if (targetPhone) deliveryPromises.push(otpService.sendOTPviaSMS(targetPhone, otp, userType, 'User'));

        // If 'email' was requested but only phone is available
        if (delivery_method === 'email' && !targetEmail && targetPhone) {
          deliveryPromises.push(otpService.sendOTPviaSMS(targetPhone, otp, userType, 'User'));
        }

        await Promise.all(deliveryPromises);
      }
    } catch (emailError) {
      console.error('Email/SMS sending error:', emailError);
      // Don't fail the request if email fails, OTP is still stored
    }

    // For development, return OTP in response
    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.json({
      success: true,
      message: `OTP sent via ${delivery_method}`,
      email: targetEmail,
      phone: targetPhone,
      userId: canonicalUserId,
      userType: canonicalUserType,
      school_id: canonicalSchoolId,
      ...(isDevelopment && { otp }) // Only show OTP in development
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, userType, otp, school_id } = req.body;

    if (!userId || !userType || !otp || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Check OTP
    const result = await db.sequelize.query(
      `SELECT * FROM account_activation_otps 
       WHERE user_id = ? AND user_type = ? AND school_id = ? AND otp = ? AND expires_at > NOW()`,
      {
        replacements: [userId, userType, school_id, otp],
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    if (result.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as verified (don't activate yet - wait for password)
    await db.sequelize.query(
      `UPDATE account_activation_otps SET verified = 1 WHERE user_id = ? AND user_type = ? AND school_id = ?`,
      {
        replacements: [userId, userType, school_id],
        type: db.Sequelize.QueryTypes.UPDATE
      }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully. Please set your password.'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
});

// Set password and activate account
router.post('/set-password', async (req, res) => {
  try {
    const { userId, userType, school_id, password } = req.body;

    if (!userId || !userType || !school_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if OTP was verified
    const otpRecord = await db.sequelize.query(
      `SELECT * FROM account_activation_otps 
       WHERE user_id = ? AND user_type = ? AND school_id = ? AND verified = 1`,
      {
        replacements: [userId, userType, school_id],
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    if (otpRecord.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please verify OTP first'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and activate account
    await db.sequelize.query(
      `UPDATE users SET 
        password = ?,
        is_activated = 1, 
        status = 'Active', 
        activated_at = NOW(),
        must_change_password = 0
       WHERE id = ?`,
      {
        replacements: [hashedPassword, userId],
        type: db.Sequelize.QueryTypes.UPDATE
      }
    );

    // Delete used OTP record
    await db.sequelize.query(
      `DELETE FROM account_activation_otps WHERE user_id = ? AND user_type = ? AND school_id = ?`,
      {
        replacements: [userId, userType, school_id],
        type: db.Sequelize.QueryTypes.DELETE
      }
    );

    res.json({
      success: true,
      message: 'Password set and account activated successfully'
    });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set password',
      error: error.message
    });
  }
});

module.exports = router;
