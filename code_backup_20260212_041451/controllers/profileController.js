const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../models');
const emailService = require('../services/emailService');

// Configure nodemailer with enhanced error handling
const createEmailTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
    socketTimeout: 10000 // 10 seconds
  };
  
  console.log('📧 Email config:', {
    host: config.host,
    port: config.port,
    user: config.auth.user,
    hasPassword: !!config.auth.pass
  });
  
  return nodemailer.createTransport(config);
};

const transporter = createEmailTransporter();

// Test email connection
const testEmailConnection = async () => {
  try {
    console.log('🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.log('❌ SMTP connection failed:', error.message);
    return false;
  }
};

// Send email with retry logic
const sendEmailWithRetry = async (mailOptions, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Sending email (attempt ${attempt}/${maxRetries})...`);
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.log(`❌ Email send attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error; // Re-throw on final attempt
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Generate 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Update profile picture
const updateProfilePicture = async (req, res) => {
  try {
    const { user_id, user_type, branch_id, profile_picture } = req.body;
    
    // Validate input
    if (!user_id || !profile_picture) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id and profile_picture'
      });
    }
    
    // Update user profile picture based on user type
    let updateQuery;
    let tableName;
    
    switch (user_type?.toLowerCase()) {
      case 'teacher':
        tableName = 'teachers';
        updateQuery = `UPDATE teachers SET passport_url = :profile_picture WHERE user_id = :user_id`;
        break;
      case 'student':
        tableName = 'students';
        updateQuery = `UPDATE students SET profile_picture = :profile_picture WHERE admission_no = :user_id`;
        break;
      case 'admin':
      case 'superadmin':
      case 'branchadmin':
        tableName = 'users';
        updateQuery = `UPDATE users SET passport_url = :profile_picture WHERE id = :user_id`;
        break;
      case 'parent':
        tableName = 'parents';
        updateQuery = `UPDATE parents SET passport_url = :profile_picture WHERE user_id = :user_id`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }
    
    const [result] = await db.sequelize.query(updateQuery, {
      replacements: { profile_picture, user_id },
      type: db.sequelize.QueryTypes.UPDATE
    });
    
    if (result === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Log the activity
    try {
      await db.sequelize.query(
        `INSERT INTO user_activity_log (user_id, activity_type, description, created_at) VALUES (:user_id, 'profile_picture_update', 'Profile picture updated', NOW())`,
        {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    } catch (logError) {
      console.log('Activity log error:', logError);
      // Don't fail the main operation if logging fails
    }
    
    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        user_id: user_id,
        profile_picture: profile_picture
      }
    });
    
  } catch (error) {
    console.error('Profile picture update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture'
    });
  }
};

// Request email change
const requestEmailChange = async (req, res) => {
  try {
    console.log('🔍 Email change request received:', req.body);
    const { user_id, new_email, current_password, user_type } = req.body;
    
    // Validate input
    if (!user_id || !new_email || !current_password || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, new_email, current_password, user_type'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Check if new email is already in use
    const emailCheckQuery = `
      SELECT id FROM users WHERE email = :new_email AND id != :user_id
      UNION
      SELECT user_id as id FROM teachers WHERE email = :new_email AND user_id != :user_id
      UNION
      SELECT user_id as id FROM parents WHERE email = :new_email AND user_id != :user_id
    `;
    
    console.log('🔍 Checking email duplication for:', new_email);
    
    const emailCheck = await db.sequelize.query(emailCheckQuery, {
      replacements: { new_email, user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (emailCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use by another account'
      });
    }
    
    // Get user data and verify current password
    let userQuery;
    switch (user_type?.toLowerCase()) {
      case 'teacher':
        userQuery = `SELECT name, email, password FROM teachers WHERE user_id = :user_id`;
        break;
      case 'student':
        userQuery = `SELECT student_name as name, '' as email, password FROM students WHERE admission_no = :user_id`;
        break;
      case 'admin':
      case 'superadmin':
        userQuery = `SELECT name, email, password FROM users WHERE id = :user_id`;
        break;
      case 'parent':
        userQuery = `SELECT fullname as name, email, password FROM parents WHERE user_id = :user_id`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }
    
    const userResult = await db.sequelize.query(userQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult[0];
    
    // Verify current password
    const bcrypt = require('bcrypt');
    let isPasswordValid = false;
    
    try {
      if (user.password) {
        isPasswordValid = await bcrypt.compare(current_password, user.password);
      }
    } catch (error) {
      console.log('Password verification error:', error);
    }
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Check if user already has a pending email change
    const pendingCheck = await db.sequelize.query(
      `SELECT id FROM email_verifications WHERE user_id = :user_id AND verified_at IS NULL`,
      {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (pendingCheck.length > 0) {
      // Cancel existing pending change
      await db.sequelize.query(
        `DELETE FROM email_verifications WHERE user_id = :user_id AND verified_at IS NULL`,
        {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.DELETE
        }
      );
    }
    
    // Generate verification code and create email verification record
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await db.sequelize.query(
      `INSERT INTO email_verifications (user_id, old_email, new_email, verification_code, expires_at, created_at) VALUES (:user_id, :old_email, :new_email, :verification_code, :expires_at, NOW())`,
      {
        replacements: {
          user_id,
          old_email: user.email,
          new_email,
          verification_code: verificationCode,
          expires_at: expiresAt
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );
    
    // Send verification email
    const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Email Change Verification - School Management System</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;>
                <h1 style="margin: 0;>Email Change Verification</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;>
                <h2>Hello ${user.name},</h2>
                
                <p>You have requested to change your email address from <strong>${user.email}</strong> to <strong>${new_email}</strong>.</p>
                
                <p>Please use the verification code below to confirm this change:</p>
                
                <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;>
                    <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;>${verificationCode}</h1>
                </div>
                
                <div style="background: #e8f4fd; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0;>
                    <h4 style="margin: 0 0 10px 0; color: #1890ff;>Important Information:</h4>
                    <ul style="margin: 0; padding-left: 20px;>
                        <li>This code will expire in <strong>10 minutes</strong></li>
                        <li>You can continue using your current email (<strong>${user.email}</strong>) to login until verification is complete</li>
                        <li>After verification, your email will be updated to <strong>${new_email}</strong></li>
                        <li>If you didn't request this change, please contact your administrator immediately</li>
                    </ul>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;>
                    <p>This is an automated message from School Management System</p>
                    <p>Please do not reply to this email</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    const mailOptions = {
      from: process.env.SMTP_FROM_ADDRESS || 'noreply@school.com',
      to: new_email,
      subject: 'Email Change Verification Required - School Management System',
      html: emailTemplate
    };
    
    // Use queue system for reliable email delivery
    const emailResult = await emailService.sendEmailChangeVerification({
      user_id,
      user_name: user.name,
      old_email: user.email,
      new_email,
      verification_code: verificationCode,
      expires_at: expiresAt
    });
    
    console.log('📧 Email queue result:', emailResult);
    
    res.json({
      success: true,
      message: 'Email change request submitted successfully. Please check your new email for verification code.',
      data: {
        user_id,
        old_email: user.email,
        new_email,
        expires_at: expiresAt,
        verification_sent: emailResult.success,
        queue_info: emailResult.success ? {
          job_id: emailResult.job_id,
          queue_position: emailResult.queue_position
        } : null,
        email_error: emailResult.success ? null : emailResult.error
      }
    });
    
  } catch (error) {
    console.error('😱 Request email change error:', error);
    console.error('😱 Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to process email change request',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Send email verification
const sendEmailVerification = async (req, res) => {
  try {
    const { user_id, new_email, user_type, current_email } = req.body;
    
    // Validate input
    if (!user_id || !new_email || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if new email is already in use
    const emailCheckQuery = `
      SELECT id FROM users WHERE email = :new_email AND id != :user_id
      UNION
      SELECT user_id as id FROM teachers WHERE email = :new_email AND user_id != :user_id
      UNION
      SELECT user_id as id FROM parents WHERE email = :new_email AND user_id != :user_id
    `;
    
    const emailCheck = await db.sequelize.query(emailCheckQuery, {
      replacements: { new_email, user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (emailCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use'
      });
    }
    
    // Check rate limiting (max 5 attempts per hour)
    const recentAttempts = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM email_verifications WHERE user_id = :user_id AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (recentAttempts[0]?.count >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please try again later.'
      });
    }
    
    // Get user data
    let userQuery;
    switch (user_type?.toLowerCase()) {
      case 'teacher':
        userQuery = `SELECT name, email FROM teachers WHERE user_id = :user_id`;
        break;
      case 'student':
        userQuery = `SELECT student_name as name, '' as email FROM students WHERE admission_no = :user_id`;
        break;
      case 'admin':
      case 'superadmin':
        userQuery = `SELECT name, email FROM users WHERE id = :user_id`;
        break;
      case 'parent':
        userQuery = `SELECT parent_name as name, email FROM parents WHERE user_id = :user_id`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }
    
    const userResult = await db.sequelize.query(userQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult[0];
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store verification record
    await db.sequelize.query(
      `INSERT INTO email_verifications (user_id, old_email, new_email, verification_code, expires_at, created_at) VALUES (:user_id, :current_email, :new_email, :verification_code, :expires_at, NOW())`,
      {
        replacements: {
          user_id,
          current_email: current_email || user.email,
          new_email,
          verification_code: verificationCode,
          expires_at: expiresAt
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );
    
    // Send verification email
    const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset=\"utf-8\">
        <title>Email Verification - School Management System</title>
    </head>
    <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\">
        <div style=\"max-width: 600px; margin: 0 auto; padding: 20px;\">
            <div style=\"background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;\">
                <h1 style=\"margin: 0;\">Email Verification Required</h1>
            </div>
            
            <div style=\"background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;\">
                <h2>Hello ${user.name},</h2>
                
                <p>You have requested to change your email address from <strong>${current_email || user.email}</strong> to <strong>${new_email}</strong>.</p>
                
                <p>Please use the verification code below to confirm this change:</p>
                
                <div style=\"background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;\">
                    <h1 style=\"color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;\">${verificationCode}</h1>
                </div>
                
                <p><strong>Important:</strong></p>
                <ul>
                    <li>This code will expire in 24 hours</li>
                    <li>After verification, you'll need to login with your new email address</li>
                    <li>If you didn't request this change, please contact your administrator immediately</li>
                </ul>
                
                <div style=\"margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;\">
                    <p>This is an automated message from School Management System</p>
                    <p>Please do not reply to this email</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    const mailOptions = {
      from: process.env.SMTP_FROM_ADDRESS || 'noreply@school.com',
      to: new_email,
      subject: 'Email Verification Required - School Management System',
      html: emailTemplate
    };
    
    // Send email with retry logic
    try {
      await sendEmailWithRetry(mailOptions);
      
      res.json({
        success: true,
        message: 'Verification email sent successfully',
        data: {
          expires_at: expiresAt,
          verification_sent: true
        }
      });
    } catch (emailError) {
      console.log('⚠️ Email verification sending failed:', emailError.message);
      
      res.status(500).json({
        success: false,
        message: 'Email verification request created but failed to send email. Please contact your administrator.',
        error_type: 'email_send_failed',
        debug: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email'
    });
  }
};

// Verify email change
const verifyEmailChange = async (req, res) => {
  try {
    const { user_id, verification_code, new_email } = req.body;
    
    // Validate input
    if (!user_id || !verification_code || !new_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check verification attempts (max 5 per hour)
    const attemptCheck = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM verification_attempts WHERE user_id = :user_id AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (attemptCheck[0]?.count >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please request a new code.'
      });
    }
    
    // Get verification record
    const verificationResult = await db.sequelize.query(
      `SELECT * FROM email_verifications WHERE user_id = :user_id AND verification_code = :verification_code AND new_email = :new_email AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { user_id, verification_code, new_email },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (verificationResult.length === 0) {
      // Record failed attempt
      try {
        await db.sequelize.query(
          `INSERT INTO verification_attempts (user_id, attempt_type, success, created_at) VALUES (:user_id, 'email_verification', 0, NOW())`,
          {
            replacements: { user_id },
            type: db.sequelize.QueryTypes.INSERT
          }
        );
      } catch (logError) {
        console.log('Failed attempt log error:', logError);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    const verification = verificationResult[0];
    
    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }
    
    // Update user email based on user type
    let updateEmailQuery;
    const userType = req.body.user_type || 'user'; // fallback
    
    switch (userType.toLowerCase()) {
      case 'teacher':
        updateEmailQuery = `UPDATE teachers SET email = :new_email, updated_at = NOW() WHERE user_id = :user_id`;
        break;
      case 'student':
        updateEmailQuery = `UPDATE students SET email = :new_email, updated_at = NOW() WHERE admission_no = :user_id`;
        break;
      case 'admin':
      case 'superadmin':
        updateEmailQuery = `UPDATE users SET email = :new_email, email_verified_at = NOW(), updated_at = NOW() WHERE id = :user_id`;
        break;
      case 'parent':
        updateEmailQuery = `UPDATE parents SET email = :new_email, updated_at = NOW() WHERE user_id = :user_id`;
        break;
      default:
        updateEmailQuery = `UPDATE users SET email = :new_email, email_verified_at = NOW(), updated_at = NOW() WHERE id = :user_id`;
    }
    
    await db.sequelize.query(updateEmailQuery, {
      replacements: { new_email, user_id },
      type: db.sequelize.QueryTypes.UPDATE
    });
    
    // Mark verification as completed
    await db.sequelize.query(
      `UPDATE email_verifications SET verified_at = NOW() WHERE id = :verification_id`,
      {
        replacements: { verification_id: verification.id },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );
    
    // Clear failed attempts
    try {
      await db.sequelize.query(
        `DELETE FROM verification_attempts WHERE user_id = :user_id AND attempt_type = 'email_verification'`,
        {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.DELETE
        }
      );
    } catch (clearError) {
      console.log('Clear attempts error:', clearError);
    }
    
    res.json({
      success: true,
      message: 'Email verified and updated successfully',
      data: {
        user_id: user_id,
        new_email: new_email,
        login_required: true
      }
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during email verification'
    });
  }
};

// Enhanced profile update - Flexible field updates
// Users can update any single field or multiple fields
// Only provided fields will be updated, others remain untouched
const updateProfile = async (req, res) => {
  try {
    console.log('🔍 Profile update request body:', req.body);
    console.log('🔍 Request body keys:', Object.keys(req.body));
    console.log('🔍 Digital signature in request:', req.body.digital_signature ? 'YES' : 'NO');
    console.log('🔍 Digital signature length:', req.body.digital_signature?.length || 0);
    console.log('🔍 Gender in request:', req.body.gender);
    console.log('🔍 All field values:');
    Object.keys(req.body).forEach(key => {
      console.log(`   ${key}:`, req.body[key]);
    });
    
    const {
      user_id,
      user_type,
      branch_id,
      full_name,
      email,
      phone,
      date_of_birth,
      gender,
      health_status,
      medical_notes,
      address,
      bio,
      // Teacher specific
      employee_id,
      qualification,
      experience,
      subjects,
      department,
      // Student specific
      parent_name,
      // Parent specific
      occupation,
      emergency_contact,
      // Digital signature
      digital_signature
    } = req.body;
    
    console.log('🔍 Extracted digital_signature:', digital_signature);
    console.log('🔍 Extracted digital_signature type:', typeof digital_signature);
    console.log('🔍 Extracted digital_signature length:', digital_signature?.length || 0);
    
    // Validate input - only user_id is required
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: user_id'
      });
    }
    
    // Check if at least one field is provided for update
    const hasUpdateFields = full_name || email || phone || date_of_birth || gender || 
                           health_status || medical_notes || address || bio || 
                           employee_id || qualification || experience || department || 
                           parent_name || occupation || emergency_contact || digital_signature;
    
    console.log('🔍 Field validation:');
    console.log('   full_name:', full_name ? 'YES' : 'NO');
    console.log('   email:', email ? 'YES' : 'NO');
    console.log('   phone:', phone ? 'YES' : 'NO');
    console.log('   digital_signature:', digital_signature ? 'YES' : 'NO');
    console.log('   hasUpdateFields:', hasUpdateFields);
    
    if (!hasUpdateFields) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be provided for update'
      });
    }
    
    console.log('🔍 Updating profile for user_id:', user_id, 'user_type:', user_type);
    console.log('🔍 Digital signature data length:', digital_signature?.length || 0);
    console.log('🔍 Digital signature preview:', digital_signature?.substring(0, 50) + '...' || 'No signature data');
    
    // Validate unique constraints (email and phone per school_id)
    if (email !== undefined || phone !== undefined) {
      let uniqueCheckQuery = '';
      let checkParams = { user_id };
      
      switch (user_type?.toLowerCase()) {
        case 'admin':
        case 'superadmin':
          if (email !== undefined) {
            uniqueCheckQuery += `SELECT 'email' as field, id as existing_user_id FROM users WHERE email = :email AND school_id = (SELECT school_id FROM users WHERE id = :user_id) AND id != :user_id`;
            checkParams.email = email;
          }
          if (phone !== undefined) {
            if (uniqueCheckQuery) uniqueCheckQuery += ' UNION ALL ';
            uniqueCheckQuery += `SELECT 'phone' as field, id as existing_user_id FROM users WHERE phone = :phone AND school_id = (SELECT school_id FROM users WHERE id = :user_id) AND id != :user_id`;
            checkParams.phone = phone;
          }
          break;
        case 'teacher':
          if (email !== undefined) {
            uniqueCheckQuery += `SELECT 'email' as field, user_id as existing_user_id FROM teachers WHERE email = :email AND school_id = (SELECT school_id FROM teachers WHERE user_id = :user_id) AND user_id != :user_id`;
            checkParams.email = email;
          }
          if (phone !== undefined) {
            if (uniqueCheckQuery) uniqueCheckQuery += ' UNION ALL ';
            uniqueCheckQuery += `SELECT 'phone' as field, user_id as existing_user_id FROM teachers WHERE mobile_no = :phone AND school_id = (SELECT school_id FROM teachers WHERE user_id = :user_id) AND user_id != :user_id`;
            checkParams.phone = phone;
          }
          break;
        case 'student':
          if (email !== undefined) {
            uniqueCheckQuery += `SELECT 'email' as field, admission_no as existing_user_id FROM students WHERE email = :email AND school_id = (SELECT school_id FROM students WHERE admission_no = :user_id) AND admission_no != :user_id`;
            checkParams.email = email;
          }
          if (phone !== undefined) {
            if (uniqueCheckQuery) uniqueCheckQuery += ' UNION ALL ';
            uniqueCheckQuery += `SELECT 'phone' as field, admission_no as existing_user_id FROM students WHERE phone = :phone AND school_id = (SELECT school_id FROM students WHERE admission_no = :user_id) AND admission_no != :user_id`;
            checkParams.phone = phone;
          }
          break;
        case 'parent':
          if (email !== undefined) {
            uniqueCheckQuery += `SELECT 'email' as field, user_id as existing_user_id FROM parents WHERE email = :email AND school_id = (SELECT school_id FROM parents WHERE user_id = :user_id) AND user_id != :user_id`;
            checkParams.email = email;
          }
          if (phone !== undefined) {
            if (uniqueCheckQuery) uniqueCheckQuery += ' UNION ALL ';
            uniqueCheckQuery += `SELECT 'phone' as field, user_id as existing_user_id FROM parents WHERE phone = :phone AND school_id = (SELECT school_id FROM parents WHERE user_id = :user_id) AND user_id != :user_id`;
            checkParams.phone = phone;
          }
          break;
      }
      
      if (uniqueCheckQuery) {
        console.log('🔍 Checking unique constraints:', uniqueCheckQuery);
        const duplicateCheck = await db.sequelize.query(uniqueCheckQuery, {
          replacements: checkParams,
          type: db.sequelize.QueryTypes.SELECT
        });
        
        if (duplicateCheck.length > 0) {
          const duplicateField = duplicateCheck[0].field;
          const duplicateValue = duplicateField === 'email' ? email : phone;
          
          return res.status(400).json({
            success: false,
            message: `${duplicateField === 'email' ? 'Email' : 'Phone number'} '${duplicateValue}' is already in use by another user in this school`,
            error_type: 'duplicate_' + duplicateField,
            field: duplicateField,
            value: duplicateValue
          });
        }
      }
    }
    
    // Get current user data to check email change
    let currentUserQuery;
    switch (user_type?.toLowerCase()) {
      case 'teacher':
        currentUserQuery = `SELECT email FROM teachers WHERE user_id = :user_id OR id = :user_id LIMIT 1`;
        break;
      case 'student':
        currentUserQuery = `SELECT email FROM students WHERE admission_no = :user_id`;
        break;
      case 'admin':
      case 'superadmin':
        currentUserQuery = `SELECT email FROM users WHERE id = :user_id`;
        break;
      case 'parent':
        currentUserQuery = `SELECT email FROM parents WHERE id = :user_id`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }
    
    const currentUserResult = await db.sequelize.query(currentUserQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (currentUserResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const currentUser = currentUserResult[0];
    const emailChanged = email && currentUser.email !== email;
    
    // Build update query based on user type
    let updateQuery;
    let updateFields = {};
    
    // Build fields based on user type - only include provided fields that exist in the table
    const buildUpdateFields = (userType) => {
      const fields = {};
      console.log('🔍 buildUpdateFields called with userType:', userType);
      console.log('🔍 digital_signature parameter value:', digital_signature);
      
      // User type specific fields based on actual table columns
      const normalizedType = userType?.toLowerCase();
      console.log('🔍 Normalized type in buildUpdateFields:', normalizedType);
      
      switch (normalizedType) {
        case 'teacher':
          // Teachers table has a limited schema. Only map to columns that truly exist.
          if (full_name !== undefined) fields.name = full_name;
          if (email !== undefined && !emailChanged) fields.email = email;
          if (phone !== undefined) fields.mobile_no = phone; // teachers table uses mobile_no
          if (gender !== undefined) fields.sex = gender; // teachers table uses sex
          if (address !== undefined) fields.address = address;
          if (date_of_birth !== undefined) fields.date_of_birth = date_of_birth;
          if (qualification !== undefined) fields.qualification = qualification;
          if (experience !== undefined) fields.working_experience = experience;
          // Fields like health_status, medical_notes, bio, department, employee_id, digital_signature
          // do not exist on teachers table and must be handled elsewhere (users table, etc.)
          break;
          
        case 'student':
          // Students table has extended fields
          if (full_name !== undefined) fields.student_name = full_name;
          if (email !== undefined && !emailChanged) fields.email = email;
          if (phone !== undefined) fields.phone = phone;
          if (gender !== undefined) fields.sex = gender;
          if (health_status !== undefined) fields.special_health_needs = health_status;
          if (medical_notes !== undefined) fields.medical_condition = medical_notes;
          if (address !== undefined) fields.home_address = address;
          if (date_of_birth !== undefined) fields.date_of_birth = date_of_birth;
          if (parent_name !== undefined) fields.parent_name = parent_name;
          if (digital_signature !== undefined) fields.digital_signature = digital_signature;
          break;
          
        case 'admin':
        case 'superadmin':
          // Users table has limited fields - only update what exists
          // Available columns: id, name, email, phone, username, user_type, password, status, branch_id, school_id, createdAt, updatedAt, last_activity, role, permissions, accessTo, digital_signature
          if (full_name !== undefined) fields.name = full_name;
          if (phone !== undefined) fields.phone = phone;
          if (email !== undefined && !emailChanged) fields.email = email;
          if (digital_signature !== undefined) {
            console.log('🔍 Adding digital_signature to admin fields:', digital_signature?.length || 0, 'chars');
            fields.digital_signature = digital_signature;
          }
          // Note: users table doesn't have these columns, so we skip them:
          // gender, health_status, medical_notes, address, bio, date_of_birth, employee_id, qualification, experience, department, parent_name, occupation, emergency_contact
          console.log('🔍 Admin fields to update:', fields);
          break;
          
        case 'parent':
          // Parents table has extended fields
          if (full_name !== undefined) fields.fullname = full_name; // parents table uses fullname
          if (email !== undefined && !emailChanged) fields.email = email;
          if (phone !== undefined) fields.phone = phone;
          if (gender !== undefined) fields.gender = gender;
          if (health_status !== undefined) fields.health_status = health_status;
          if (medical_notes !== undefined) fields.medical_notes = medical_notes;
          if (address !== undefined) fields.address = address;
          if (bio !== undefined) fields.bio = bio;
          if (occupation !== undefined) fields.occupation = occupation;
          if (emergency_contact !== undefined) fields.emergency_contact = emergency_contact;
          if (digital_signature !== undefined) fields.digital_signature = digital_signature;
          break;
          
        default:
          throw new Error('Invalid user type: ' + userType);
      }
      
      return fields;
    };

    const syncTeacherUserAccount = async ({ userId, full_name, phone, email, emailChanged, digital_signature }) => {
      try {
        const syncFields = {};
        if (full_name !== undefined) syncFields.name = full_name;
        if (phone !== undefined) syncFields.phone = phone;
        if (email !== undefined && !emailChanged) syncFields.email = email;
        if (digital_signature !== undefined) syncFields.digital_signature = digital_signature;

        const cleanedFields = Object.fromEntries(
          Object.entries(syncFields).filter(([_, value]) => value !== undefined && value !== null)
        );

        if (Object.keys(cleanedFields).length === 0) {
          console.log('👩🏽‍🏫 No overlapping fields to sync to users table for teacher');
          return;
        }

        const setClause = Object.keys(cleanedFields)
          .map(key => `${key} = :${key}`)
          .join(', ');

        const syncQuery = `UPDATE users SET ${setClause}, updatedAt = NOW() WHERE id = :user_id`;
        console.log('👩🏽‍🏫 Syncing teacher data to users table with query:', syncQuery);

        await db.sequelize.query(syncQuery, {
          replacements: { ...cleanedFields, user_id: userId },
          type: db.sequelize.QueryTypes.UPDATE
        });
      } catch (syncError) {
        console.error('⚠️ Failed to sync teacher profile into users table:', syncError);
      }
    };
    
    try {
      updateFields = buildUpdateFields(user_type);
      console.log('🔍 Built update fields:', updateFields);
      console.log('🔍 Built update fields keys:', Object.keys(updateFields));
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Email is already handled in buildUpdateFields for each user type
    
    // Filter out undefined and null values, but allow empty strings (user might want to clear a field)
    let filteredFields = Object.fromEntries(
      Object.entries(updateFields).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    // For admin users, explicitly remove fields that don't exist in the users table
    if (user_type?.toLowerCase() === 'admin' || user_type?.toLowerCase() === 'superadmin') {
      const allowedAdminFields = ['name', 'email', 'phone', 'username', 'digital_signature'];
      const adminFilteredFields = {};
      
      Object.keys(filteredFields).forEach(key => {
        if (allowedAdminFields.includes(key)) {
          adminFilteredFields[key] = filteredFields[key];
        } else {
          console.log(`🙅 Removing unsupported admin field: ${key}`);
        }
      });
      
      filteredFields = adminFilteredFields;
      console.log('🔍 Admin fields after explicit filtering:', filteredFields);
    }
    
    console.log('🔍 Fields to update:', filteredFields);
    console.log('🔍 Number of fields to update:', Object.keys(filteredFields).length);
    console.log('🔍 Filtered fields keys:', Object.keys(filteredFields));
    console.log('🔍 Checking for problematic fields:');
    Object.keys(filteredFields).forEach(key => {
      console.log(`   ${key}: ${typeof filteredFields[key]} = ${filteredFields[key]}`);
    });
    
    if (Object.keys(filteredFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    const setClause = Object.keys(filteredFields)
      .map(key => `${key} = :${key}`)
      .join(', ');
    
    // Build the appropriate UPDATE query
    const normalizedUserType = user_type?.toLowerCase();
    console.log('🔍 Normalized user_type:', normalizedUserType);
    console.log('🔍 Fields to update:', Object.keys(filteredFields));
    console.log('🔍 Digital signature in filtered fields:', filteredFields.digital_signature ? 'YES' : 'NO');
    
    switch (normalizedUserType) {
      case 'teacher':
        updateQuery = `UPDATE teachers SET ${setClause}, updated_at = NOW() WHERE user_id = :user_id`;
        break;
      case 'student':
        updateQuery = `UPDATE students SET ${setClause}, updated_at = NOW() WHERE admission_no = :user_id`;
        break;
      case 'admin':
      case 'superadmin':
        updateQuery = `UPDATE users SET ${setClause}, updatedAt = NOW() WHERE id = :user_id`;
        break;
      case 'parent':
        updateQuery = `UPDATE parents SET ${setClause}, updated_at = NOW() WHERE user_id = :user_id`;
        break;
    }
    
    console.log('🔍 Update query:', updateQuery);
    console.log('🔍 Query replacements:', { ...filteredFields, user_id });
    console.log('🔍 Final digital_signature value being sent to DB:', filteredFields.digital_signature?.length || 0, 'chars');
    
    const result = await db.sequelize.query(updateQuery, {
      replacements: { ...filteredFields, user_id },
      type: db.sequelize.QueryTypes.UPDATE
    });
    
    console.log('📝 Full update result:', result);
    console.log('📈 Result type:', typeof result);
    console.log('📈 Result length:', result?.length);
    
    // For UPDATE queries, Sequelize returns [metadata, affectedRows]
    const affectedRows = result[1] || result?.affectedRows || 0;
    console.log('📈 Affected rows:', affectedRows);
    
    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no changes made'
      });
    }
    
    // Handle subjects for teachers
    if (normalizedUserType === 'teacher') {
      await syncTeacherUserAccount({
        userId: user_id,
        full_name,
        phone,
        email,
        emailChanged,
        digital_signature
      });
    }

    if (user_type?.toLowerCase() === 'teacher' && subjects && Array.isArray(subjects)) {
      // This would need to be implemented based on your teacher_subjects table schema
      // await updateTeacherSubjects(user_id, subjects);
    }
    
    // Log the activity
    try {
      await db.sequelize.query(
        `INSERT INTO user_activity_log (user_id, activity_type, description, created_at) VALUES (:user_id, 'profile_update', 'Profile information updated', NOW())`,
        {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    } catch (logError) {
      console.log('Activity log error:', logError);
      // Don't fail the main operation if logging fails
    }
    
    // Get updated user data to return
    let updatedUserQuery;
    switch (user_type?.toLowerCase()) {
      case 'teacher':
        updatedUserQuery = `SELECT 
            user_id,
            name,
            email,
            mobile_no as phone,
            sex as gender,
            address,
            date_of_birth,
            qualification,
            working_experience as experience,
            marital_status,
            state_of_origin,
            religion,
            last_place_of_work,
            account_name,
            account_number,
            bank,
            branch_id,
            school_id,
            status,
            payroll_status,
            created_at,
            updated_at
          FROM teachers WHERE user_id = :user_id`;
        break;
      case 'student':
        updatedUserQuery = `SELECT admission_no as user_id, student_name as name, email, phone, gender, health_status, medical_notes, address, bio FROM students WHERE admission_no = :user_id`;
        break;
      case 'admin':
      case 'superadmin':
        updatedUserQuery = `SELECT id as user_id, name, email, phone, gender, health_status, medical_notes, address, bio FROM users WHERE id = :user_id`;
        break;
      case 'parent':
        updatedUserQuery = `SELECT user_id, parent_name as name, email, phone, gender, health_status, medical_notes, address, bio FROM parents WHERE user_id = :user_id`;
        break;
    }
    
    const updatedUserResult = await db.sequelize.query(updatedUserQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    const updatedFieldNames = Object.keys(filteredFields);
    const fieldCount = updatedFieldNames.length;
    
    // Create user-friendly field names for response
    const friendlyFieldNames = updatedFieldNames.map(field => {
      const fieldMap = {
        'name': 'Full Name',
        'phone': 'Phone Number',
        'mobile_no': 'Phone Number',
        'email': 'Email Address',
        'student_name': 'Student Name',
        'fullname': 'Full Name',
        'sex': 'Gender',
        'gender': 'Gender',
        'home_address': 'Address',
        'address': 'Address',
        'date_of_birth': 'Date of Birth',
        'working_experience': 'Work Experience',
        'qualification': 'Qualification',
        'medical_condition': 'Medical Notes',
        'special_health_needs': 'Health Status'
      };
      return fieldMap[field] || field;
    });
    
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: [affectedRows]
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    
    // Handle specific database errors
    let errorMessage = 'Failed to update profile';
    let errorType = 'server_error';
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = 'Email or phone number already exists in this school';
      errorType = 'duplicate_constraint';
    } else if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Invalid data provided: ' + error.errors.map(e => e.message).join(', ');
      errorType = 'validation_error';
    } else if (error.name === 'SequelizeDatabaseError') {
      if (error.message.includes('Unknown column')) {
        errorMessage = 'Some profile fields are not supported for this user type';
        errorType = 'unsupported_field';
      } else {
        errorMessage = 'Database error occurred while updating profile';
        errorType = 'database_error';
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error_type: errorType,
      status: 'error',
      timestamp: new Date().toISOString(),
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user profile data
const getUserProfile = async (req, res) => {
  try {
    let { user_id, user_type } = req.query;
    
    // Validate input
    if (!user_id || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: user_id and user_type'
      });
    }
    
    console.log('🔍 Getting profile for user_id:', user_id, 'user_type:', user_type);
    console.log('🔍 Authenticated user from JWT:', req.user?.id, req.user?.user_type);
    
    // Allow admins and teachers to access profiles
    // Admins can view any profile, users can view their own profile
    const isAdmin = req.user && ['Admin', 'SuperAdmin'].includes(req.user.user_type);
    const isOwnProfile = req.user && (req.user.id == user_id || req.user.id === user_id);
    
    // For students, always allow access to their own profile
    const isStudentOwnProfile = req.user && req.user.user_type === 'Student' && 
                               user_type?.toLowerCase() === 'student';
    
    console.log('🔐 Authorization check:', { 
      isAdmin, 
      isOwnProfile, 
      isStudentOwnProfile,
      reqUserId: req.user?.id, 
      reqUserType: req.user?.user_type, 
      reqAdmissionNo: req.user?.admission_no,
      paramUserId: user_id, 
      paramUserType: user_type 
    });
    
    // If not admin and not own profile, check if user_id might be teachers.id instead of users.id
    // This is a workaround for Redux store storing teachers.id instead of users.id
    let actualUserId = user_id;
    if (!isAdmin && !isOwnProfile && !isStudentOwnProfile) {
      console.log('⚠️ User trying to access different profile. Checking if it\'s a teachers.id mismatch or student ID mismatch...');
      
      // For students, always use JWT admission_no regardless of requested user_id
      if (user_type?.toLowerCase() === 'student' && req.user?.user_type === 'Student') {
        console.log('⚠️ Student request detected. Using JWT admission_no:', req.user.id, 'instead of requested user_id:', user_id);
        actualUserId = req.user.id; // Always use JWT admission_no for students
      } else {
      
      // Check if user_id exists in users table
      const userExistsQuery = 'SELECT id FROM users WHERE id = :user_id LIMIT 1';
      const userExists = await db.sequelize.query(userExistsQuery, {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT
      });
      
      if (userExists.length === 0) {
        // user_id doesn't exist in users table, check if it's a teachers.id
        console.log('⚠️ user_id', user_id, 'not found in users table. Checking teachers table...');
        const teacherQuery = 'SELECT user_id FROM teachers WHERE id = :teacher_id AND user_id = :auth_user_id LIMIT 1';
        const teacher = await db.sequelize.query(teacherQuery, {
          replacements: { teacher_id: user_id, auth_user_id: req.user.id },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        if (teacher.length > 0) {
          console.log('✅ Found teacher record! teachers.id =', user_id, 'maps to users.id =', teacher[0].user_id);
          actualUserId = teacher[0].user_id;
        } else {
          console.log('❌ Not a valid teachers.id for this user. Using authenticated user ID:', req.user.id);
          actualUserId = req.user.id;
        }
      } else {
        console.log('❌ Authorization failed: user', req.user?.id, '(', req.user?.user_type, ') trying to access', user_id, '(', user_type, ')');
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this profile'
        });
      }
      }
    }
    
    console.log('✅ Authorization passed. Using user_id:', actualUserId);
    console.log('🔍 Final user_id for query:', actualUserId);
    
    // Update user_id to the actual user ID (handles teachers.id -> users.id conversion)
    user_id = actualUserId;
    
    let profileQuery;
    let profileData = null;
    let teacherProfileFallback = false;
    
    // Get profile data based on user type
    switch (user_type?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        profileQuery = `
          SELECT 
            id as user_id,
            name,
            email,
            phone,
            username,
            user_type,
            status,
            branch_id,
            school_id,
            createdAt as created_at,
            updatedAt as updated_at,
            passport_url as profile_picture,
            digital_signature
          FROM users 
          WHERE id = :user_id
        `;
        break;
        
      case 'teacher':
        // First, try to find teacher by user_id
        console.log('🔍 Looking for teacher with user_id:', user_id);
        profileQuery = `
          SELECT 
            t.user_id,
            t.name,
            t.email,
            t.mobile_no as phone,
            t.sex as gender,
            t.age,
            t.address,
            t.date_of_birth,
            t.marital_status,
            t.state_of_origin,
            t.qualification,
            t.working_experience as experience,
            t.religion,
            t.last_place_of_work,
            t.account_name,
            t.account_number,
            t.bank,
            t.branch_id,
            t.school_id,
            t.status,
            t.passport_url as profile_picture,
            t.payroll_status,
            t.created_at,
            t.updated_at,
            u.user_type,
            u.username,
            u.digital_signature as digital_signature
          FROM teachers t
          LEFT JOIN users u ON t.user_id = u.id
          WHERE t.user_id = :user_id
        `;
        break;
        
      case 'student':
        profileQuery = `
          SELECT 
            s.admission_no as user_id,
            s.admission_no,
            s.student_name as name,
            s.surname,
            s.first_name,
            s.other_names,
            s.email,
            s.phone,
            s.sex as gender,
            s.date_of_birth,
            s.home_address as address,
            s.religion,
            s.tribe,
            s.state_of_origin,
            s.l_g_a,
            s.nationality,
            s.last_school_attended,
            s.special_health_needs as health_status,
            s.medical_condition as medical_notes,
            s.blood_group,
            s.admission_date,
            s.academic_year,
            s.current_class,
            s.class_name,
            s.section,
            s.mother_tongue,
            s.language_known,
            s.profile_picture,
            s.digital_signature,
            s.branch_id,
            s.school_id,
            s.status,
            s.user_type,
            s.created_at,
            s.updated_at
          FROM students s
          WHERE s.admission_no = :user_id
        `;
        break;
        
      case 'parent':
        profileQuery = `
          SELECT 
            p.user_id,
            p.parent_id,
            p.fullname as name,
            p.phone,
            p.email,
            p.relationship,
            p.is_guardian,
            p.occupation,
            p.nationality,
            p.address,
            p.state,
            p.l_g_a,
            p.passport_url as profile_picture,
            p.school_id,
            p.status,
            p.user_type,
            p.created_at,
            p.updated_at,
            u.username
          FROM parents p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.user_id = :user_id
        `;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type: ' + user_type
        });
    }
    
    // Execute the query
    console.log('📊 Executing profile query for user_type:', user_type, 'user_id:', user_id);
    console.log('📊 Query:', profileQuery.substring(0, 200) + '...');
    
    const result = await db.sequelize.query(profileQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    console.log('📊 Query result count:', result.length);
    if (result.length > 0) {
      console.log('✅ Found profile:', { user_id: result[0].user_id, name: result[0].name });
    } else {
      console.log('❌ No profile found for user_id:', user_id, 'user_type:', user_type);
      
      // For teachers, try to find by checking if user_id exists in users table
      if (user_type?.toLowerCase() === 'teacher') {
        console.log('🔍 Checking if user exists in users table...');
        const userCheck = await db.sequelize.query(
          'SELECT id, name, email, user_type FROM users WHERE id = :user_id',
          {
            replacements: { user_id },
            type: db.sequelize.QueryTypes.SELECT
          }
        );
        console.log('🔍 User table check result:', userCheck);
        
        // Check if teacher record exists at all
        const teacherCheck = await db.sequelize.query(
          'SELECT user_id, name, email FROM teachers WHERE user_id = :user_id',
          {
            replacements: { user_id },
            type: db.sequelize.QueryTypes.SELECT
          }
        );
        console.log('🔍 Teacher table check result:', teacherCheck);
      }
    }
    
    if (result.length === 0) {
      // Handle teacher fallback when admin accounts exist without teachers row
      if (user_type?.toLowerCase() === 'teacher') {
        console.log('⚠️ Teacher row not found for user_id:', user_id, '— attempting fallback to users table');
        const teacherFallback = await db.sequelize.query(
          `SELECT 
             id as user_id,
             name,
             email,
             phone,
             username,
             user_type,
             status,
             branch_id,
             school_id,
             createdAt as created_at,
             updatedAt as updated_at,
             passport_url as profile_picture,
             digital_signature
           FROM users
           WHERE id = :user_id`,
          {
            replacements: { user_id },
            type: db.sequelize.QueryTypes.SELECT
          }
        );

        if (teacherFallback.length > 0) {
          console.log('✅ Using users table fallback for teacher profile');
          profileData = {
            ...teacherFallback[0],
            // Provide teacher-specific defaults so frontend remains stable
            branch_id: teacherFallback[0].branch_id || req.headers['x-branch-id'] || null,
            school_id: teacherFallback[0].school_id || req.headers['x-school-id'] || null,
            status: teacherFallback[0].status || 'Active',
            payroll_status: 'Pending',
            qualification: null,
            experience: null,
            account_name: null,
            account_number: null,
            bank: null,
            user_type: 'Teacher',
            username: teacherFallback[0].username || teacherFallback[0].email,
            fallback_source: 'users_table'
          };
          teacherProfileFallback = true;
        } else {
          return res.status(404).json({
            success: false,
            message: 'User profile not found'
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }
    } else {
      profileData = result[0];
    }
    
    // Get additional data for specific user types
    let additionalData = {};
    
    if (user_type?.toLowerCase() === 'teacher') {
      // Get teacher's classes and subjects
      try {
        const classesQuery = `
          SELECT c.class_name, c.section, c.level
          FROM active_teacher_classes tc
          JOIN classes c ON tc.class_id = c.class_id
          WHERE tc.teacher_id = :user_id
        `;
        
        const subjectsQuery = `
          SELECT s.subject_name, s.subject_code
          FROM teacher_subjects ts
          JOIN subjects s ON ts.subject_id = s.subject_id
          WHERE ts.teacher_id = :user_id
        `;
        
        const [classes, subjects] = await Promise.all([
          db.sequelize.query(classesQuery, {
            replacements: { user_id },
            type: db.sequelize.QueryTypes.SELECT
          }),
          db.sequelize.query(subjectsQuery, {
            replacements: { user_id },
            type: db.sequelize.QueryTypes.SELECT
          })
        ]);
        
        additionalData.classes = classes || [];
        additionalData.subjects = subjects || [];
      } catch (err) {
        console.log('Error fetching teacher additional data:', err);
        additionalData.classes = [];
        additionalData.subjects = [];
      }
    }
    
    if (user_type?.toLowerCase() === 'student') {
      // Get student's parent information
      try {
        const parentQuery = `
          SELECT p.fullname as parent_name, p.phone as parent_phone, p.email as parent_email, p.relationship
          FROM parents p
          WHERE p.parent_id = (SELECT parent_id FROM students WHERE admission_no = :user_id)
        `;
        
        const parents = await db.sequelize.query(parentQuery, {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        additionalData.parents = parents || [];
      } catch (err) {
        console.log('Error fetching student parent data:', err);
        additionalData.parents = [];
      }
    }
    
    if (user_type?.toLowerCase() === 'parent') {
      // Get parent's children
      try {
        const childrenQuery = `
          SELECT s.admission_no, s.student_name, s.current_class, s.status
          FROM students s
          WHERE s.parent_id = (SELECT parent_id FROM parents WHERE user_id = :user_id)
        `;
        
        const children = await db.sequelize.query(childrenQuery, {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        additionalData.children = children || [];
      } catch (err) {
        console.log('Error fetching parent children data:', err);
        additionalData.children = [];
      }
    }
    
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        profile: profileData,
        additional: additionalData,
        user_type: user_type,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error_type: 'server_error',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get security settings
const getSecuritySettings = async (req, res) => {
  try {
    let { user_id, user_type } = req.query;
    
    // Validate input
    if (!user_id || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: user_id and user_type'
      });
    }
    
    console.log('🔍 Getting security settings for user_id:', user_id, 'user_type:', user_type);
    console.log('🔍 Authenticated user from JWT:', req.user?.id, req.user?.user_type);
    
    // Allow admins and users to access security settings
    // Admins can view any security settings, users can view their own
    const isAdmin = req.user && ['Admin', 'SuperAdmin'].includes(req.user.user_type);
    const isOwnProfile = req.user && (req.user.id == user_id || req.user.id === user_id);
    
    // For students, always allow access to their own security settings
    const isStudentOwnProfile = req.user && req.user.user_type === 'Student' && 
                               user_type?.toLowerCase() === 'student';
    
    console.log('🔐 Security settings authorization check:', { 
      isAdmin, 
      isOwnProfile, 
      isStudentOwnProfile,
      reqUserId: req.user?.id, 
      reqUserType: req.user?.user_type 
    });
    
    // If not admin and not own profile, check if user_id might be teachers.id instead of users.id
    let actualUserId = user_id;
    if (!isAdmin && !isOwnProfile && !isStudentOwnProfile) {
      console.log('⚠️ User trying to access different security settings. Checking if it\'s a teachers.id mismatch...');
      
      // For students, always use JWT admission_no
      if (user_type?.toLowerCase() === 'student' && req.user?.user_type === 'Student') {
        console.log('⚠️ Student request detected. Using JWT admission_no:', req.user.id);
        actualUserId = req.user.id;
      } else {
        // Check if user_id exists in users table
        const userExistsQuery = 'SELECT id FROM users WHERE id = :user_id LIMIT 1';
        const userExists = await db.sequelize.query(userExistsQuery, {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        if (userExists.length === 0) {
        // user_id doesn't exist in users table, check if it's a teachers.id
        console.log('⚠️ user_id', user_id, 'not found in users table. Checking teachers table...');
        const teacherQuery = 'SELECT user_id FROM teachers WHERE id = :teacher_id AND user_id = :auth_user_id LIMIT 1';
        const teacher = await db.sequelize.query(teacherQuery, {
          replacements: { teacher_id: user_id, auth_user_id: req.user.id },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        if (teacher.length > 0) {
          console.log('✅ Found teacher record! teachers.id =', user_id, 'maps to users.id =', teacher[0].user_id);
          actualUserId = teacher[0].user_id;
        } else {
          console.log('❌ Not a valid teachers.id for this user. Using authenticated user ID:', req.user.id);
          actualUserId = req.user.id;
        }
        } else {
          console.log('❌ Authorization failed: user', req.user?.id, '(', req.user?.user_type, ') trying to access', user_id);
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this'
          });
        }
      }
    }
    
    console.log('✅ Security settings authorization passed. Using user_id:', actualUserId);
    
    // Update user_id to the actual user ID
    user_id = actualUserId;
    
    let securityQuery;
    
    // Get security settings based on user type
    switch (user_type?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        securityQuery = `
          SELECT 
            id as user_id,
            email,
            username,
            user_type,
            status,
            createdAt as account_created,
            updatedAt as last_updated,
            CASE WHEN password IS NOT NULL AND password != '' THEN 1 ELSE 0 END as has_password
          FROM users 
          WHERE id = :user_id
        `;
        break;
        
      case 'teacher':
        securityQuery = `
          SELECT 
            t.user_id,
            t.email,
            t.status,
            t.created_at as account_created,
            t.updated_at as last_updated,
            u.username,
            u.user_type,
            CASE WHEN u.password IS NOT NULL AND u.password != '' THEN 1 ELSE 0 END as has_password
          FROM teachers t
          LEFT JOIN users u ON t.user_id = u.id
          WHERE t.user_id = :user_id
        `;
        break;
        
      case 'student':
        securityQuery = `
          SELECT 
            s.admission_no as user_id,
            s.email,
            s.status,
            s.created_at as account_created,
            s.updated_at as last_updated,
            s.user_type,
            CASE WHEN s.password IS NOT NULL AND s.password != '' THEN 1 ELSE 0 END as has_password
          FROM students s
          WHERE s.admission_no = :user_id
        `;
        break;
        
      case 'parent':
        securityQuery = `
          SELECT 
            p.user_id,
            p.email,
            p.status,
            p.created_at as account_created,
            p.updated_at as last_updated,
            u.username,
            u.user_type,
            CASE WHEN u.password IS NOT NULL AND u.password != '' THEN 1 ELSE 0 END as has_password
          FROM parents p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.user_id = :user_id
        `;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type: ' + user_type
        });
    }
    
    // Execute the query
    const result = await db.sequelize.query(securityQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const securityData = result[0];
    
    // Get login history (if user_activity_log table exists)
    let loginHistory = [];
    try {
      const loginHistoryQuery = `
        SELECT 
          activity_type,
          description,
          created_at
        FROM user_activity_log 
        WHERE user_id = :user_id 
        AND activity_type IN ('login', 'logout', 'password_change', 'email_change')
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      loginHistory = await db.sequelize.query(loginHistoryQuery, {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT
      });
    } catch (err) {
      console.log('Login history not available:', err.message);
      loginHistory = [];
    }
    
    // Get email verification status (if email_verifications table exists)
    let emailVerificationStatus = null;
    try {
      const emailVerificationQuery = `
        SELECT 
          new_email,
          verified_at,
          created_at,
          expires_at
        FROM email_verifications 
        WHERE user_id = :user_id 
        AND verified_at IS NULL
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const pendingVerification = await db.sequelize.query(emailVerificationQuery, {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT
      });
      
      if (pendingVerification.length > 0) {
        emailVerificationStatus = {
          pending_email: pendingVerification[0].new_email,
          expires_at: pendingVerification[0].expires_at,
          requested_at: pendingVerification[0].created_at
        };
      }
    } catch (err) {
      console.log('Email verification status not available:', err.message);
    }
    
    // Security recommendations
    const recommendations = [];
    
    if (!securityData.has_password) {
      recommendations.push({
        type: 'password',
        priority: 'high',
        message: 'Set up a strong password for your account'
      });
    }
    
    if (!securityData.email || securityData.email === '') {
      recommendations.push({
        type: 'email',
        priority: 'medium',
        message: 'Add an email address for account recovery'
      });
    }
    
    if (loginHistory.length === 0) {
      recommendations.push({
        type: 'activity',
        priority: 'low',
        message: 'No recent login activity recorded'
      });
    }
    
    res.json({
      success: true,
      message: 'Security settings retrieved successfully',
      data: {
        user_info: {
          user_id: securityData.user_id,
          email: securityData.email,
          username: securityData.username,
          user_type: securityData.user_type,
          status: securityData.status,
          account_created: securityData.account_created,
          last_updated: securityData.last_updated
        },
        security_status: {
          has_password: Boolean(securityData.has_password),
          email_verified: Boolean(securityData.email && !emailVerificationStatus),
          pending_email_verification: emailVerificationStatus,
          two_factor_enabled: false, // Not implemented yet
          login_notifications: true // Default setting
        },
        recent_activity: loginHistory,
        recommendations: recommendations,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security settings',
      error_type: 'server_error',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get teacher profile data
const getTeacherProfileData = async (req, res) => {
  try {
    const { teacher_id, branch_id } = req.query;
    
    if (!teacher_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: teacher_id and branch_id'
      });
    }
    
    // Get teacher basic info
    const teacherInfo = await db.sequelize.query(
      `SELECT t.*, u.name, u.email, u.phone FROM teachers t 
       LEFT JOIN users u ON t.user_id = u.id 
       WHERE t.user_id = :teacher_id`,
      {
        replacements: { teacher_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (teacherInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Get assigned classes
    const classes = await db.sequelize.query(
      `SELECT c.class_id, c.class_name, c.section, c.level,
              (SELECT COUNT(*) FROM students s WHERE s.class_id = c.class_id AND s.branch_id = :branch_id) as student_count
       FROM active_teacher_classes tc
       JOIN classes c ON tc.class_id = c.class_id
       WHERE tc.teacher_id = :teacher_id AND c.branch_id = :branch_id`,
      {
        replacements: { teacher_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    // Get teaching subjects
    const subjects = await db.sequelize.query(
      `SELECT sub.subject_id, sub.subject_name, sub.subject_code, c.class_name, 
              COALESCE(ts.weekly_hours, 0) as weekly_hours
       FROM teacher_subjects ts
       JOIN subjects sub ON ts.subject_id = sub.subject_id
       JOIN classes c ON ts.class_id = c.class_id
       WHERE ts.teacher_id = :teacher_id AND c.branch_id = :branch_id`,
      {
        replacements: { teacher_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    // Get schedule (if teacher_timetable exists)
    const schedule = await db.sequelize.query(
      `SELECT 
         CASE tt.day_of_week
           WHEN 1 THEN 'Monday'
           WHEN 2 THEN 'Tuesday'
           WHEN 3 THEN 'Wednesday'
           WHEN 4 THEN 'Thursday'
           WHEN 5 THEN 'Friday'
           WHEN 6 THEN 'Saturday'
           WHEN 7 THEN 'Sunday'
         END as day,
         TIME_FORMAT(tt.start_time, '%H:%i') as start_time,
         TIME_FORMAT(tt.end_time, '%H:%i') as end_time,
         sub.subject_name,
         c.class_name,
         COALESCE(cr.room_name, 'TBA') as room
       FROM teacher_timetable tt
       JOIN subjects sub ON tt.subject_id = sub.subject_id
       JOIN classes c ON tt.class_id = c.class_id
       LEFT JOIN classrooms cr ON tt.classroom_id = cr.classroom_id
       WHERE tt.teacher_id = :teacher_id AND c.branch_id = :branch_id
       ORDER BY tt.day_of_week, tt.start_time`,
      {
        replacements: { teacher_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    // Calculate statistics
    const totalStudents = classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0);
    const weeklyHours = subjects.reduce((sum, sub) => sum + (sub.weekly_hours || 0), 0);
    
    const profileData = {
      teacher_info: teacherInfo[0],
      classes: classes || [],
      subjects: subjects || [],
      schedule: schedule || [],
      statistics: {
        total_classes: classes.length,
        total_students: totalStudents,
        weekly_hours: weeklyHours
      }
    };
    
    res.json({
      success: true,
      data: profileData
    });
    
  } catch (error) {
    console.error('Teacher profile data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher profile data'
    });
  }
};

// Send verification code for password change
const sendVerificationCode = async (req, res) => {
  try {
    const { user_id, method, purpose } = req.body;
    
    // Validate input
    if (!user_id || !method || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, method, and purpose'
      });
    }
    
    // Check rate limiting (max 5 attempts per hour)
    const recentAttempts = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM verification_codes WHERE user_id = :user_id AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (recentAttempts[0]?.count >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please try again later.'
      });
    }
    
    // Get user data
    const userQuery = `
      SELECT name, email, phone FROM users WHERE id = :user_id
      UNION
      SELECT name, email, mobile_no as phone FROM teachers WHERE user_id = :user_id
      UNION
      SELECT student_name as name, email, phone FROM students WHERE admission_no = :user_id
      UNION
      SELECT fullname as name, email, phone FROM parents WHERE user_id = :user_id
    `;
    
    const userResult = await db.sequelize.query(userQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult[0];
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store verification code
    await db.sequelize.query(
      `INSERT INTO verification_codes (user_id, code, method, purpose, expires_at, created_at) VALUES (:user_id, :code, :method, :purpose, :expires_at, NOW())`,
      {
        replacements: {
          user_id,
          code: verificationCode,
          method,
          purpose,
          expires_at: expiresAt
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );
    
    // Send verification code based on method
    if (method === 'email') {
      if (!user.email) {
        return res.status(400).json({
          success: false,
          message: 'No email address found for this user'
        });
      }
      
      const emailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Password Change Verification - School Management System</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;>
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;>
                  <h1 style="margin: 0;>Password Change Verification</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;>
                  <h2>Hello ${user.name},</h2>
                  
                  <p>You have requested to change your password. Please use the verification code below to proceed:</p>
                  
                  <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;>
                      <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;>${verificationCode}</h1>
                  </div>
                  
                  <p><strong>Important:</strong></p>
                  <ul>
                      <li>This code will expire in 15 minutes</li>
                      <li>If you didn't request this change, please contact your administrator immediately</li>
                      <li>Do not share this code with anyone</li>
                  </ul>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;>
                      <p>This is an automated message from School Management System</p>
                      <p>Please do not reply to this email</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
      `;
      
      const mailOptions = {
        from: process.env.SMTP_FROM_ADDRESS || 'noreply@school.com',
        to: user.email,
        subject: 'Password Change Verification Code - School Management System',
        html: emailTemplate
      };
      
      await transporter.sendMail(mailOptions);
      
    } else if (method === 'whatsapp') {
      if (!user.phone) {
        return res.status(400).json({
          success: false,
          message: 'No phone number found for this user'
        });
      }
      
      // For now, we'll just return success. In a real implementation,
      // you would integrate with a WhatsApp API service
      console.log(`WhatsApp verification code ${verificationCode} would be sent to ${user.phone}`);
    }
    
    res.json({
      success: true,
      message: `Verification code sent via ${method}`,
      data: {
        method: method,
        expires_at: expiresAt,
        masked_contact: method === 'email' 
          ? user.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')
          : user.phone?.replace(/(\d{3})(\d*)(\d{3})/, '$1***$3')
      }
    });
    
  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
};

// Change password with verification
const changePasswordVerified = async (req, res) => {
  try {
    const { user_id, verification_code, current_password, new_password, method } = req.body;
    
    // Validate input
    if (!user_id || !verification_code || !current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate password strength
    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }
    
    // Check verification code
    const verificationResult = await db.sequelize.query(
      `SELECT * FROM verification_codes WHERE user_id = :user_id AND code = :verification_code AND purpose = 'password_change' AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { user_id, verification_code },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (verificationResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    const verification = verificationResult[0];
    
    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }
    
    // Get user and verify current password
    const userQuery = `
      SELECT id, password, user_type FROM users WHERE id = :user_id
      UNION
      SELECT user_id as id, password, 'teacher' as user_type FROM teachers WHERE user_id = :user_id
      UNION
      SELECT admission_no as id, password, 'student' as user_type FROM students WHERE admission_no = :user_id
      UNION
      SELECT user_id as id, password, 'parent' as user_type FROM parents WHERE user_id = :user_id
    `;
    
    const userResult = await db.sequelize.query(userQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult[0];
    
    // Verify current password (you'll need to implement password hashing/verification)
    const bcrypt = require('bcrypt');
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);
    
    // Update password based on user type
    let updatePasswordQuery;
    switch (user.user_type?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        updatePasswordQuery = `UPDATE users SET password = :new_password, password_changed_at = NOW(), updated_at = NOW() WHERE id = :user_id`;
        break;
      case 'teacher':
        updatePasswordQuery = `UPDATE teachers SET password = :new_password, password_changed_at = NOW(), updated_at = NOW() WHERE user_id = :user_id`;
        break;
      case 'student':
        updatePasswordQuery = `UPDATE students SET password = :new_password, password_changed_at = NOW(), updated_at = NOW() WHERE admission_no = :user_id`;
        break;
      case 'parent':
        updatePasswordQuery = `UPDATE parents SET password = :new_password, password_changed_at = NOW(), updated_at = NOW() WHERE user_id = :user_id`;
        break;
      default:
        updatePasswordQuery = `UPDATE users SET password = :new_password, password_changed_at = NOW(), updated_at = NOW() WHERE id = :user_id`;
    }
    
    await db.sequelize.query(updatePasswordQuery, {
      replacements: { new_password: hashedNewPassword, user_id },
      type: db.sequelize.QueryTypes.UPDATE
    });
    
    // Mark verification code as used
    await db.sequelize.query(
      `UPDATE verification_codes SET used_at = NOW() WHERE id = :verification_id`,
      {
        replacements: { verification_id: verification.id },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );
    
    // Log the activity
    try {
      await db.sequelize.query(
        `INSERT INTO user_activity_log (user_id, activity_type, description, created_at) VALUES (:user_id, 'password_change', 'Password changed successfully', NOW())`,
        {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    } catch (logError) {
      console.log('Activity log error:', logError);
    }
    
    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        user_id: user_id,
        changed_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Get pending email change
const getPendingEmailChange = async (req, res) => {
  try {
    const { user_id, user_type } = req.query;
    
    // Validate input
    if (!user_id || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: user_id and user_type'
      });
    }
    
    // Get pending email change
    const pendingQuery = `
      SELECT 
        id,
        user_id,
        old_email,
        new_email,
        verification_code,
        expires_at,
        created_at,
        attempts
      FROM email_verifications 
      WHERE user_id = :user_id AND verified_at IS NULL
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const pendingResult = await db.sequelize.query(pendingQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (pendingResult.length === 0) {
      return res.json({
        success: true,
        message: 'No pending email change found',
        data: {
          pending_change: null
        }
      });
    }
    
    const pendingChange = pendingResult[0];
    
    // Check if expired
    const isExpired = new Date(pendingChange.expires_at) < new Date();
    
    res.json({
      success: true,
      message: 'Pending email change retrieved successfully',
      data: {
        pending_change: {
          id: pendingChange.id,
          user_id: pendingChange.user_id,
          old_email: pendingChange.old_email,
          new_email: pendingChange.new_email,
          expires_at: pendingChange.expires_at,
          created_at: pendingChange.created_at,
          attempts: pendingChange.attempts,
          is_expired: isExpired,
          status: isExpired ? 'expired' : 'pending'
        }
      }
    });
    
  } catch (error) {
    console.error('Get pending email change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending email change'
    });
  }
};

// Cancel email change
const cancelEmailChange = async (req, res) => {
  try {
    const { user_id, user_type } = req.body;
    
    // Validate input
    if (!user_id || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id and user_type'
      });
    }
    
    // Check if there's a pending email change
    const pendingQuery = `
      SELECT id, new_email FROM email_verifications 
      WHERE user_id = :user_id AND verified_at IS NULL
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const pendingResult = await db.sequelize.query(pendingQuery, {
      replacements: { user_id },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    if (pendingResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending email change found to cancel'
      });
    }
    
    const pendingChange = pendingResult[0];
    
    // Delete the pending email change
    await db.sequelize.query(
      `DELETE FROM email_verifications WHERE user_id = :user_id AND verified_at IS NULL`,
      {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.DELETE
      }
    );
    
    // Log the activity
    try {
      await db.sequelize.query(
        `INSERT INTO user_activity_log (user_id, activity_type, description, created_at) VALUES (:user_id, 'email_change_cancelled', 'Email change request cancelled', NOW())`,
        {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    } catch (logError) {
      console.log('Activity log error:', logError);
    }
    
    res.json({
      success: true,
      message: 'Email change request cancelled successfully',
      data: {
        user_id,
        cancelled_email: pendingChange.new_email,
        cancelled_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Cancel email change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel email change request'
    });
  }
};

module.exports = {
  updateProfilePicture,
  requestEmailChange,
  sendEmailVerification,
  verifyEmailChange,
  getPendingEmailChange,
  cancelEmailChange,
  updateProfile,
  getUserProfile,
  getSecuritySettings,
  getTeacherProfileData,
  sendVerificationCode,
  changePasswordVerified
};