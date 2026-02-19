const passport = require("passport");
const config = require("../config/config");
const { allowOnly } = require("../services/routesHelper");
const {
  create,
  login,
  findAllUsers,
  findById,
  update,
  deleteUser,
  verifyToken,
  studentLogin,
  compose_sms,
  changeEmail,
  changePassword,
  changeUserStatus,
} = require("../controllers/user");

// Additional dependencies for email change functionality
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const db = require("../models");
// const db = require("../../config/database");

module.exports = (app) => {
  // Debug middleware to log all requests to /users/*
  app.use('/users/*', (req, res, next) => {
    console.log(`🌐 Request to ${req.originalUrl} - Method: ${req.method}`);
    console.log('🌐 Request body keys:', Object.keys(req.body || {}));
    next();
  });
  // create a new user
  app.post(
    "/users/create",
    passport.authenticate("jwt", { session: false }),
    // allowOnly(config.accessLevels.admin,
    create
  );

  // user login
  app.post("/users/login", login);

  // Dedicated profile update routes for each user type - MUST be before /users/:userId routes
  const profileController = require('../controllers/profileController');
  const adminProfileController = require('../controllers/adminProfileController');
  
  // Get user profile route
  app.get(
    "/users/profile",
    passport.authenticate("jwt", { session: false }),
    profileController.getUserProfile
  );
  
  // Get user security settings route
  app.get(
    "/users/security-settings",
    passport.authenticate("jwt", { session: false }),
    profileController.getSecuritySettings
  );
  
  // Profile picture update route
  app.put(
    "/users/update-profile-picture",
    passport.authenticate("jwt", { session: false }),
    profileController.updateProfilePicture
  );
  
  // Admin profile update route - uses dedicated admin controller
  app.put(
    "/users/update-admin-profile",
    passport.authenticate("jwt", { session: false }),
    async (req, res, next) => {
      console.log('🎯 /users/update-admin-profile route hit!');
      console.log('🎯 Request method:', req.method);
      console.log('🎯 Request body keys:', Object.keys(req.body));

      const headerUserType = req.headers['x-user-type'];
      const inferredUserType = req.body?.user_type || headerUserType;
      const normalizedType = inferredUserType?.toLowerCase();
      const authUserType = req.user?.user_type?.toLowerCase();
      const isTeacherRequest = normalizedType === 'teacher' || authUserType === 'teacher';
      const isStudentRequest = normalizedType === 'student' || authUserType === 'student';

      // Reject student requests
      if (isStudentRequest) {
        return res.status(403).json({
          success: false,
          message: 'Students cannot use admin profile update endpoint. Use /users/update-student-profile instead.'
        });
      }

      if (isTeacherRequest) {
        console.log('👩🏽‍🏫 Teacher detected on admin profile route. Redirecting to teacher profile handler.');
        try {
          let incomingUserId = req.body?.user_id || req.user?.id;
          console.log('👩🏽‍🏫 Incoming user_id from payload:', incomingUserId);

          if (!incomingUserId) {
            return res.status(400).json({
              success: false,
              message: 'Missing user_id for teacher profile update'
            });
          }

          // Normalize teacher identifiers (teachers.id vs users.id)
          const teacherLookupQuery = `
            SELECT user_id
            FROM teachers
            WHERE id = :teacherPrimaryId
               OR user_id = :teacherUserId
            LIMIT 1
          `;

          const teacherLookup = await db.sequelize.query(teacherLookupQuery, {
            replacements: {
              teacherPrimaryId: incomingUserId,
              teacherUserId: incomingUserId
            },
            type: db.sequelize.QueryTypes.SELECT
          });

          if (teacherLookup.length === 0) {
            console.log('⚠️ No teacher record found for id:', incomingUserId, '— falling back to admin profile update.');
            req.body.user_type = req.body.user_type || req.user?.user_type || 'Admin';
            return next();
          }

          incomingUserId = teacherLookup[0].user_id;
          console.log('👩🏽‍🏫 Normalized teacher user_id:', incomingUserId);

          req.body.user_id = incomingUserId;
          req.body.user_type = 'Teacher';

          return profileController.updateProfile(req, res);
        } catch (error) {
          console.error('❌ Failed to redirect teacher profile update:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update teacher profile',
            error_type: 'teacher_profile_update_error'
          });
        }
      }

      next();
    },
    adminProfileController.updateAdminProfile
  );
  
  // Teacher profile update route
  app.put(
    "/users/update-teacher-profile",
    passport.authenticate("jwt", { session: false }),
    (req, res, next) => {
      console.log('🎯 /users/update-teacher-profile route hit!');
      req.body.user_type = 'Teacher';
      next();
    },
    profileController.updateProfile
  );
  
  // Send OTP for email/phone verification
  app.post('/users/send-profile-otp', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
      }

      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET);
      
      if (decoded.user_type !== 'Student' && decoded.user_type !== 'Developer') {
        return res.status(403).json({ success: false, message: 'Access denied - Students and Developers only' });
      }

      let { email, phone } = req.body;
      
      // If no email/phone provided, get current values from database
      if (!email && !phone) {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'full_skcooly'
        });
        
        const [studentData] = await connection.execute(
          'SELECT email, phone FROM students WHERE admission_no = ? AND school_id = ? AND branch_id = ?',
          [decoded.id, decoded.school_id, decoded.branch_id]
        );
        
        await connection.end();
        
        if (studentData.length === 0) {
          return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        email = studentData[0].email;
        phone = studentData[0].phone;
      }
      
      if (!email && !phone) {
        return res.status(400).json({ success: false, message: 'No email or phone found for verification' });
      }

      // Generate separate OTPs for email and phone
      const emailOtp = email ? Math.floor(100000 + Math.random() * 900000).toString() : null;
      const phoneOtp = phone ? Math.floor(100000 + Math.random() * 900000).toString() : null;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'full_skcooly'
      });

      // Store separate OTPs
      if (email && emailOtp) {
        await connection.execute(
          'INSERT INTO account_activation_otps (user_id, user_type, school_id, otp, expires_at, delivery_method, verified) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at), verified = 0, created_at = NOW()',
          [decoded.id, 'Student', decoded.school_id, emailOtp, expiresAt, 'email', 0]
        );
        console.log(`📧 Email OTP for ${email}: ${emailOtp}`);
        
        // Send email OTP
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: true,
          auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD
          }
        });

        await transporter.sendMail({
          from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_ADDRESS}>`,
          to: email,
          subject: 'Email Verification Code - Elite Edu Tech Systems Ltd',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email Verification</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://files.elitescholar.ng//uploads/startuplogo_1770297530_698498ba127ac.png" alt="Elite Edu Tech Systems Ltd" style="max-width: 200px; height: auto;">
                  <h1 style="color: #1890ff; margin: 20px 0 10px 0;">Elite Edu Tech Systems Ltd</h1>
                  <p style="color: #666; margin: 0;">Educational Technology Solutions</p>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
                  <h2 style="color: #333; margin-bottom: 20px;">Email Verification Required</h2>
                  <p style="color: #666; margin-bottom: 30px; font-size: 16px;">Please use the verification code below to verify your email address:</p>
                  
                  <div style="background-color: #1890ff; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${emailOtp}</span>
                  </div>
                  
                  <p style="color: #999; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
                  <p style="color: #999; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2026 Elite Edu Tech Systems Ltd. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        });
      }
      
      if (phone && phoneOtp) {
        await connection.execute(
          'INSERT INTO account_activation_otps (user_id, user_type, school_id, otp, expires_at, delivery_method, verified) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at), verified = 0, created_at = NOW()',
          [decoded.id, 'Student', decoded.school_id, phoneOtp, expiresAt, 'whatsapp', 0]
        );
        console.log(`📱 WhatsApp OTP for ${phone}: ${phoneOtp}`);
        
        // Try WhatsApp first, fallback to SMS
        try {
          const whatsappService = require('../services/baileysWhatsappService');
          const message = `🔐 Your Elite Scholar verification code is: *${phoneOtp}*\n\nValid for 10 minutes. Do not share this code with anyone.\n\n- Elite Edutech Systems`;
          
          await whatsappService.sendMessage('SYSTEM', phone, message);
          console.log(`✅ WhatsApp OTP sent successfully to ${phone}`);
        } catch (whatsappError) {
          console.log(`⚠️ WhatsApp failed, falling back to SMS: ${whatsappError.message}`);
          
          // Fallback to SMS
          const smsService = require('../services/smsService');
          try {
            await smsService.sendPasswordResetOTPSms({
              user_id: decoded.id,
              phone: phone,
              otp_code: phoneOtp,
              expires_at: expiresAt,
              school_id: decoded.school_id,
              branch_id: decoded.branch_id,
              sender: 'EliteEdTec'
            });
            console.log(`✅ SMS OTP sent successfully to ${phone}`);
          } catch (smsError) {
            console.error('❌ Both WhatsApp and SMS failed:', smsError.message);
          }
        }
      }

      await connection.end();

      res.json({
        success: true,
        message: phone ? 'OTP sent successfully. Please check your WhatsApp.' : 'OTP sent successfully',
        sentTo: { email: !!email, phone: !!phone }
      });

    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
    }
  });

  // Verify contact information (email/phone)
  app.post('/users/verify-contact', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
      }

      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET);
      
      if (decoded.user_type !== 'Student') {
        return res.status(403).json({ success: false, message: 'Access denied - Students only' });
      }

      const { email, phone, emailOtp, phoneOtp } = req.body;

      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'full_skcooly'
      });

      // Verify email OTP
      if (email && emailOtp) {
        const [otpRows] = await connection.execute(
          'SELECT * FROM account_activation_otps WHERE user_id = ? AND otp = ? AND delivery_method = ? AND expires_at > NOW() AND verified = 0',
          [decoded.id, emailOtp, 'email']
        );

        if (otpRows.length === 0) {
          await connection.end();
          return res.status(400).json({
            success: false,
            message: 'Invalid or expired email OTP'
          });
        }

        // Update student email verification status
        await connection.execute(
          'UPDATE students SET email_verified = TRUE, email_verified_at = NOW() WHERE admission_no = ?',
          [decoded.id]
        );

        // Delete used OTP
        await connection.execute('UPDATE account_activation_otps SET verified = 1 WHERE user_id = ? AND delivery_method = ?', [decoded.id, 'email']);
        await connection.end();

        return res.json({
          success: true,
          message: 'Email verified successfully'
        });
      }

      // Verify phone OTP
      if (phone && phoneOtp) {
        const [otpRows] = await connection.execute(
          'SELECT * FROM account_activation_otps WHERE user_id = ? AND otp = ? AND delivery_method = ? AND expires_at > NOW() AND verified = 0',
          [decoded.id, phoneOtp, 'whatsapp']
        );

        if (otpRows.length === 0) {
          await connection.end();
          return res.status(400).json({
            success: false,
            message: 'Invalid or expired phone OTP'
          });
        }

        // Update student phone verification status
        await connection.execute(
          'UPDATE students SET phone_verified = TRUE, phone_verified_at = NOW() WHERE admission_no = ?',
          [decoded.id]
        );

        // Delete used OTP
        await connection.execute('UPDATE account_activation_otps SET verified = 1 WHERE user_id = ? AND delivery_method = ?', [decoded.id, 'whatsapp']);
        await connection.end();

        return res.json({
          success: true,
          message: 'Phone verified successfully'
        });
      }

      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Email or phone with OTP required'
      });

    } catch (error) {
      console.error('Verify contact error:', error);
      res.status(500).json({ success: false, message: 'Failed to verify contact', error: error.message });
    }
  });

  // Student profile update route - FIXED VERSION (with OTP verification)
  app.put(
    "/users/update-student-profile",
    async (req, res) => {
      try {
        console.log('🎯 /users/update-student-profile route hit!');
        
        // Manual JWT verification to bypass Passport middleware
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET);
        
        if (decoded.user_type !== 'Student') {
          return res.status(403).json({ success: false, message: 'Access denied - Students only' });
        }
        
        const { id: admission_no, school_id, branch_id } = decoded;
        const { email, phone, address, digital_signature, full_name, date_of_birth, user_id, user_type, branch_id: requestBranchId, otp } = req.body;

        console.log('🎯 Request body:', req.body);
        console.log('🎯 JWT decoded:', { admission_no, school_id, branch_id });

        // Build allowed fields - ignore restricted fields like full_name, date_of_birth
        const allowedFields = {};
        if (address !== undefined) allowedFields.home_address = address;
        if (digital_signature !== undefined) allowedFields.digital_signature = digital_signature;
        if (email !== undefined) allowedFields.email = email;
        if (phone !== undefined) allowedFields.phone = phone;

        // Log ignored fields for debugging
        const ignoredFields = [];
        if (full_name !== undefined) ignoredFields.push('full_name');
        if (date_of_birth !== undefined) ignoredFields.push('date_of_birth');
        if (user_id !== undefined) ignoredFields.push('user_id');
        if (user_type !== undefined) ignoredFields.push('user_type');
        if (requestBranchId !== undefined) ignoredFields.push('branch_id');
        
        if (ignoredFields.length > 0) {
          console.log('🎯 Ignored restricted fields:', ignoredFields);
        }

        if (Object.keys(allowedFields).length === 0) {
          return res.status(400).json({
            success: false,
            message: "No valid fields to update"
          });
        }

        console.log('🎯 Allowed fields to update:', allowedFields);
        
        // Direct MySQL update to bypass all Sequelize hooks/middleware
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'full_skcooly'
        });
        
        // Check if email or phone is changing to reset verification
        if (allowedFields.email || allowedFields.phone) {
          const [currentData] = await connection.execute(
            'SELECT email, phone FROM students WHERE admission_no = ? AND school_id = ? AND branch_id = ?',
            [admission_no, school_id, branch_id]
          );
          
          if (currentData.length > 0) {
            const current = currentData[0];
            if (allowedFields.email && allowedFields.email !== current.email) {
              allowedFields.email_verified = 0;
              allowedFields.email_verified_at = null;
            }
            if (allowedFields.phone && allowedFields.phone !== current.phone) {
              allowedFields.phone_verified = 0;
              allowedFields.phone_verified_at = null;
            }
          }
        }
        
        const updateFields = Object.keys(allowedFields).map(field => `${field} = ?`).join(', ');
        const replacements = [...Object.values(allowedFields), admission_no, school_id, branch_id];
        
        const query = `UPDATE students SET ${updateFields}, updated_at = NOW() WHERE admission_no = ? AND school_id = ? AND branch_id = ?`;
        console.log('🎯 Direct MySQL query:', query);
        console.log('🎯 Replacements:', replacements);
        
        const [result] = await connection.execute(query, replacements);
        await connection.end();
        
        console.log('🎯 Direct MySQL update successful:', result);
        
        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Student not found or no changes made"
          });
        }
        
        res.json({
          success: true,
          message: "Student profile updated successfully"
        });

      } catch (error) {
        console.error("Student profile update error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update student profile",
          error: error.message
        });
      }
    }
  );
  
  // Parent profile update route
  app.put(
    "/users/update-parent-profile",
    passport.authenticate("jwt", { session: false }),
    (req, res, next) => {
      console.log('🎯 /users/update-parent-profile route hit!');
      req.body.user_type = 'Parent';
      next();
    },
    profileController.updateProfile
  );

  // compose_sms(app);
  app.post("/compose_sms", compose_sms);
  // user login
  app.post("/students/login", studentLogin);

  // user login
  // app.post('/students/login', studentLogin);

  // Token verification endpoint - should NOT require authentication
  // This endpoint verifies if a token is valid, so it can't require auth to access
  app.get("/verify-token", verifyToken);

  //retrieve all users
  app.get(
    "/users",
    passport.authenticate("jwt", {
      session: false,
    }),
    allowOnly(config.accessLevels.admin, findAllUsers)
  );

  // Handle POST requests to /users for specific queries
  app.post(
    "/users",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      const { query_type, school_id, branch_id } = req.body;
      
      if (query_type === 'get-principal-signature') {
        try {
          // First try to find branch admin (principal)
          let principalQuery = `
            SELECT digital_signature 
            FROM users 
            WHERE school_id = ? AND branch_id = ? AND user_type IN ('Admin', 'branchadmin')
            LIMIT 1
          `;
          
          let principal = await db.sequelize.query(principalQuery, {
            replacements: [school_id, branch_id],
            type: db.sequelize.QueryTypes.SELECT,
          });
          
          // If not found, fallback to general admin
          if (principal.length === 0) {
            principalQuery = `
              SELECT digital_signature 
              FROM users 
              WHERE school_id = ? AND user_type = 'Admin'
              LIMIT 1
            `;
            
            principal = await db.sequelize.query(principalQuery, {
              replacements: [school_id],
              type: db.sequelize.QueryTypes.SELECT,
            });
          }
          
          if (principal.length > 0) {
            return res.json({
              success: true,
              data: { digital_signature: principal[0].digital_signature }
            });
          } else {
            return res.json({
              success: false,
              message: 'No principal signature found'
            });
          }
        } catch (error) {
          console.error('Error fetching principal signature:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch principal signature'
          });
        }
      }
      
      // Handle other query types here if needed
      return res.status(400).json({
        success: false,
        message: 'Invalid query_type'
      });
    }
  );

  // retrieve user by id
  app.get(
    "/users/:userId",
    passport.authenticate("jwt", {
      session: false,
    }),
    allowOnly(config.accessLevels.admin, findById)
  );

  // update a user with id
  app.put(
    "/users/:userId",
    passport.authenticate("jwt", {
      session: false,
    }),
    allowOnly(config.accessLevels.user, update)
  );

  // delete a user
  app.delete(
    "/users/:userId",
    passport.authenticate("jwt", {
      session: false,
    }),
    allowOnly(config.accessLevels.admin, deleteUser)
  );

  // Email change functionality
  // Change email endpoint
  app.post(
    "/users/change-email",
    passport.authenticate("jwt", { session: false }),
    changeEmail
  );
  app.put(
    "/update/user",
    passport.authenticate("jwt", { session: false }),
    changeUserStatus
  );
  app.post(
    "/users/change-password",
    passport.authenticate("jwt", { session: false }),
    changePassword
  );

  // Configure nodemailer
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Generate 6-digit verification code
  function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Request email change endpoint
  app.post("/users/request-email-change", async (req, res) => {
    try {
      console.log("📧 Email change request received:", req.body);
      const { user_id, new_email, current_password, user_type } = req.body;

      // Validate input
      if (!user_id || !new_email || !current_password || !user_type) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: user_id, new_email, current_password, user_type",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(new_email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      // Check if new email is already in use
      const emailCheckQuery = `
        SELECT id FROM users WHERE email = ? AND id != ?
        UNION
        SELECT user_id as id FROM teachers WHERE email = ? AND user_id != ?
        UNION
        SELECT user_id as id FROM parents WHERE email = ? AND user_id != ?
      `;

      console.log("🔍 Checking email duplication for:", new_email);

      const emailCheck = await db.sequelize.query(emailCheckQuery, {
        replacements: [new_email, user_id, new_email, user_id, new_email, user_id],
        type: db.sequelize.QueryTypes.SELECT,
      });

      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email address is already in use by another account",
        });
      }

      // Get user data and verify current password
      let userQuery;
      switch (user_type?.toLowerCase()) {
        case "teacher":
          userQuery = `SELECT name, email, password FROM teachers WHERE user_id = ?`;
          break;
        case "student":
          userQuery = `SELECT student_name as name, '' as email, password FROM students WHERE admission_no = ?`;
          break;
        case "admin":
        case "superadmin":
          userQuery = `SELECT name, email, password FROM users WHERE id = ?`;
          break;
        case "parent":
          userQuery = `SELECT fullname as name, email, password FROM parents WHERE user_id = ?`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid user type",
          });
      }

      const userResult = await db.sequelize.query(userQuery, {
        replacements: [user_id],
        type: db.sequelize.QueryTypes.SELECT,
      });

      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userResult[0];

      // Verify current password
      let isPasswordValid = false;

      try {
        if (user.password) {
          isPasswordValid = await bcrypt.compare(
            current_password,
            user.password
          );
        }
      } catch (error) {
        console.log("Password verification error:", error);
      }

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Generate verification code and create email verification record
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Try to use email service for reliable delivery
      try {
        const emailService = require("../services/emailService");
        const emailResult = await emailService.sendEmailChangeVerification({
          user_id,
          user_name: user.name,
          old_email: user.email,
          new_email,
          verification_code: verificationCode,
          expires_at: expiresAt,
            reset_url: `${process.env.FRONTEND_URL}/reset-password?token=${resetTokenResult.token}`,
            reset_token: resetTokenResult.token
        });

        console.log("📧 Email queue result:", emailResult);

        res.json({
          success: true,
          message:
            "Email change request submitted successfully. Please check your new email for verification code.",
          data: {
            user_id,
            old_email: user.email,
            new_email,
            expires_at: expiresAt,
            reset_url: `${process.env.FRONTEND_URL}/reset-password?token=${resetTokenResult.token}`,
            reset_token: resetTokenResult.token,
            verification_sent: emailResult.success,
            queue_info: emailResult.success
              ? {
                  job_id: emailResult.job_id,
                  queue_position: emailResult.queue_position,
                }
              : null,
            email_error: emailResult.success ? null : emailResult.error,
          },
        });
      } catch (emailServiceError) {
        console.log(
          "⚠️ Email service not available, using fallback:",
          emailServiceError.message
        );

        // Fallback to direct email sending
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
                    <h1 style="margin: 0;>📧 Email Change Verification</h1>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;>
                    <h2>Hello ${user.name},</h2>
                    
                    <p>You have requested to change your email address from <strong>${user.email}</strong> to <strong>${new_email}</strong>.</p>
                    
                    <p>Please use the verification code below to confirm this change:</p>
                    
                    <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;>
                        <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;>${verificationCode}</h1>
                    </div>
                    
                    <div style="background: #e8f4fd; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0;>
                        <h4 style="margin: 0 0 10px 0; color: #1890ff;>🔒 Important Security Information:</h4>
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
          from: {
            name: process.env.SMTP_FROM_NAME || "School Management System",
            address: process.env.SMTP_FROM_ADDRESS || process.env.SMTP_USERNAME,
          },
          to: new_email,
          subject:
            "Email Change Verification Required - School Management System",
          html: emailTemplate,
        };

        try {
          await transporter.sendMail(mailOptions);

          res.json({
            success: true,
            message:
              "Email change request submitted successfully. Please check your new email for verification code.",
            data: {
              user_id,
              old_email: user.email,
              new_email,
              expires_at: expiresAt,
              reset_url: `${process.env.FRONTEND_URL}/reset-password?token=${resetTokenResult.token}`,
              reset_token: resetTokenResult.token,
              verification_sent: true,
              fallback_email: true,
            },
          });
        } catch (emailError) {
          console.log(
            "⚠️ Email sending failed, but request is still valid:",
            emailError.message
          );

          res.json({
            success: true,
            message:
              "Email change request submitted successfully. However, there was an issue sending the verification email. Please contact your administrator.",
            data: {
              user_id,
              old_email: user.email,
              new_email,
              expires_at: expiresAt,
            reset_url: `${process.env.FRONTEND_URL}/reset-password?token=${resetTokenResult.token}`,
            reset_token: resetTokenResult.token,
              verification_sent: false,
              email_error: emailError.message,
            },
          });
        }
      }
    } catch (error) {
      console.error("😱 Request email change error:", error);
      console.error("😱 Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to process email change request",
        debug:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });

  // Password reset functionality
  const passwordService = require('../services/passwordService');
  const emailService = require('../services/emailService');
  const smsService = require('../services/smsService');

  // Forgot password endpoint - sends reset OTP
  app.post("/auth/forgot-password", async (req, res) => {
    try {
      console.log("🔒 Forgot password request received:", req.body);
      const { email, phone, school_id, admission_no, userType } = req.body;

      // Validate input based on user type
      if (userType === 'Student') {
        // Students only need admission_no
        if (!admission_no) {
          return res.status(400).json({
            success: false,
            message: "Please provide admission number"
          });
        }
      } else {
        // Staff need email or phone
        if (!email && !phone) {
          return res.status(400).json({
            success: false,
            message: "Please provide either email or phone number"
          });
        }
      }

      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: "School ID is required"
        });
      }

      // Find user by email or phone - fetch both email and phone for dual delivery
      let userQuery;
      let queryParams;

      // Handle Student password reset
      if (userType === 'Student' && admission_no) {
        userQuery = `
          SELECT admission_no as user_id, 
                 student_name as name, 
                 email, 
                 phone, 
                 'Student' as user_type 
          FROM students 
          WHERE admission_no = ? AND school_id = ?;
        `;
        queryParams = [admission_no, school_id];
      } else if (email) {
        userQuery = `
          SELECT id as user_id, name, email, phone, user_type FROM users WHERE email = ? AND school_id = ?;
        `;
        queryParams = [email, school_id];
      } else {
        userQuery = `
          SELECT id as user_id, name, email, phone, user_type FROM users WHERE phone = ? AND school_id = ?;
        `;
        queryParams = [phone, school_id];
      }

      const userResult = await db.sequelize.query(userQuery, {
        replacements: queryParams,
        type: db.sequelize.QueryTypes.SELECT,
      });

      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No account found with the provided information"
        });
      }

      const user = userResult[0];
      console.log("🔍 DEBUG: User object for forgot password:", JSON.stringify(user, null, 2));
      const verificationCode = passwordService.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Generate reset token - use user's contact from database
      const contactForToken = user.email || user.phone;
      const resetTokenResult = await passwordService.generatePasswordResetToken(
        user.user_id,
        user.user_type,
        contactForToken
      );

      if (!resetTokenResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate reset token"
        });
      }

      // Update the token record with OTP code and school_id
      const primaryContact = user.email || user.phone;
      await db.sequelize.query(
        `UPDATE password_reset_tokens
         SET otp_code = ?, school_id = ?, contact = ?, email = ?, expires_at = ?, used_at = NULL, created_at = NOW()
         WHERE token = ?`,
        {
          replacements: [verificationCode, school_id, primaryContact, user.email || '', expiresAt, resetTokenResult.token],
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );

      // Send OTP via both email and SMS if available, or the one that was provided
      // PRODUCTION SYNC: Ensure all required fields are included for email worker
      const deliveryMethods = [];

      // Always send email OTP if user has an email address
      if (user.email) {
        try {
          // PRODUCTION FIX: Send password reset OTP email with all required fields
          const emailData = {
            user_id: user.user_id,
            user_name: user.name,
            user_type: user.user_type, // Required by email worker
            email: user.email,
            otp_code: verificationCode,
            expires_at: expiresAt,
            reset_url: `${process.env.FRONTEND_URL}/reset-password?token=${resetTokenResult.token}`, // Required by email worker
            reset_token: resetTokenResult.token, // Required by email worker
          };
          console.log("🔍 DEBUG: Email data being sent to queue:", JSON.stringify(emailData, null, 2));
          const emailResult = await emailService.sendPasswordResetOTP(emailData);

          console.log("📧 Password reset email queued:", emailResult);
          deliveryMethods.push('email');
        } catch (emailError) {
          console.error("⚠️ Email sending failed:", emailError);
        }
      }

      // Always send WhatsApp and SMS OTP if user has a phone number
      if (user.phone) {
        // Send WhatsApp
        try {
          const whatsappService = require('../services/baileysWhatsappService');
          const message = `🔐 Your Elite Scholar password reset code is: *${verificationCode}*\n\nValid for 30 minutes. Do not share this code with anyone.\n\n- Elite Edutech Systems`;
          
          await whatsappService.sendMessage('SYSTEM', user.phone, message);
          console.log(`✅ WhatsApp password reset OTP sent to ${user.phone}`);
          deliveryMethods.push('whatsapp');
        } catch (whatsappError) {
          console.error(`❌ WhatsApp failed: ${whatsappError.message}`);
        }

        // Send SMS (redundancy for phone)
        try {
          const smsResult = await smsService.sendPasswordResetOTPSms({
            user_id: user.user_id,
            user_name: user.name,
            phone: user.phone,
            otp_code: verificationCode,
            expires_at: expiresAt,
            reset_url: `${process.env.FRONTEND_URL}/reset-password?token=${resetTokenResult.token}`,
            reset_token: resetTokenResult.token,
            school_id: school_id
          });

          console.log("📱 Password reset SMS queued:", smsResult);
          deliveryMethods.push('sms');
        } catch (smsError) {
          console.error("❌ SMS failed:", smsError);
        }

        // Log OTP in development for testing
        if (process.env.NODE_ENV === 'development') {
          console.log("📱 [DEV ONLY] OTP:", verificationCode);
        }
      }

      // Determine which contact method was used for the response
      let deliveryInfo = 'both';
      if (deliveryMethods.length === 1) {
        deliveryInfo = deliveryMethods[0];
      } else if (deliveryMethods.length === 0) {
        deliveryInfo = 'none';
      }

      // Mask phone number for security (show first 4 and last 1 digits)
      const maskPhone = (phone) => {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 6) return phone;
        return cleaned.substring(0, 4) + '*'.repeat(cleaned.length - 5) + cleaned.substring(cleaned.length - 1);
      };

      // Mask email for security (show first 2 chars and domain)
      const maskEmail = (email) => {
        if (!email) return '';
        const [local, domain] = email.split('@');
        if (!domain) return email;
        if (local.length <= 2) return email;
        return local.substring(0, 2) + '*'.repeat(local.length - 2) + '@' + domain;
      };

      // Build detailed response message
      let responseMessage = '';
      const maskedPhone = user.phone ? maskPhone(user.phone) : '';
      const maskedEmail = user.email ? maskEmail(user.email) : '';
      
      if (user.email && user.phone) {
        // Both email and phone
        const phoneChannels = [];
        if (deliveryMethods.includes('whatsapp')) phoneChannels.push('WhatsApp');
        if (deliveryMethods.includes('sms')) phoneChannels.push('SMS');
        
        if (phoneChannels.length > 0) {
          responseMessage = `Password reset OTP sent to your email (${maskedEmail}) and phone (${maskedPhone}) via ${phoneChannels.join(' & ')}.`;
        } else {
          responseMessage = `Password reset OTP sent to your email (${maskedEmail}).`;
        }
      } else if (user.phone) {
        // Phone only
        const phoneChannels = [];
        if (deliveryMethods.includes('whatsapp')) phoneChannels.push('WhatsApp');
        if (deliveryMethods.includes('sms')) phoneChannels.push('SMS');
        
        if (phoneChannels.length > 0) {
          responseMessage = `Password reset OTP sent to your phone (${maskedPhone}) via ${phoneChannels.join(' & ')}.`;
        } else {
          responseMessage = 'Password reset OTP generated. Please check your phone.';
        }
      } else if (user.email) {
        // Email only
        responseMessage = `Password reset OTP sent to your email (${maskedEmail}).`;
      } else {
        responseMessage = 'Password reset OTP generated successfully.';
      }

      res.json({
        success: true,
        message: responseMessage,
        data: {
          contact: email || phone,
          delivery_methods: deliveryMethods,
          expires_in_minutes: 15
        }
      });

    } catch (error) {
      console.error("😱 Forgot password error:", error);
      console.error("😱 Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to process password reset request",
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Reset password endpoint - verifies OTP and updates password
  app.post("/auth/reset-password", async (req, res) => {
    try {
      console.log("🔒 Reset password request received:", req.body);
      const { email, phone, user_id, otp_code, new_password, school_id } = req.body;

      // Validate input - need at least one identifier
      if (!email && !phone && !user_id) {
        return res.status(400).json({
          success: false,
          message: "Please provide email, phone number, or user ID"
        });
      }

      if (!otp_code || !new_password || !school_id) {
        return res.status(400).json({
          success: false,
          message: "OTP code, new password, and school ID are required"
        });
      }

      // Validate password strength
      const passwordValidation = passwordService.validatePasswordStrength(new_password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message,
          validation: passwordValidation
        });
      }

      // Verify OTP - check by contact (email/phone) or user_id
      const contactIdentifier = email || phone || user_id;
      const otpQuery = `
        SELECT user_id, user_type, school_id, expires_at
        FROM password_reset_tokens
        WHERE (contact = ? OR user_id = ?) AND otp_code = ? AND school_id = ? AND expires_at > NOW() AND used_at IS NULL
      `;

      const otpResult = await db.sequelize.query(otpQuery, {
        replacements: [contactIdentifier, contactIdentifier, otp_code, school_id],
        type: db.sequelize.QueryTypes.SELECT,
      });

      if (otpResult.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP code"
        });
      }

      const otpRecord = otpResult[0];

      // Hash new password
      const newPasswordHash = await passwordService.hashPassword(new_password);

      // Update password based on user type
      let updatePasswordQuery;
      switch (otpRecord.user_type?.toLowerCase()) {
        case 'admin':
        case 'superadmin':
        case 'teacher':
        case 'parent':
          // All non-student users authenticate via users table
          updatePasswordQuery = `UPDATE users SET password = ? WHERE id = ?`;
          break;
        case 'student':
          // Students authenticate via students table with admission_no
          updatePasswordQuery = `UPDATE students SET password = ? WHERE admission_no = ?`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid user type"
          });
      }

      await db.sequelize.query(updatePasswordQuery, {
        replacements: [newPasswordHash, otpRecord.user_id],
        type: db.sequelize.QueryTypes.UPDATE,
      });

      // Mark OTP as used
      await db.sequelize.query(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE (contact = ? OR user_id = ?) AND otp_code = ? AND school_id = ?`,
        {
          replacements: [contactIdentifier, contactIdentifier, otp_code, school_id],
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );

      // Log activity
      await db.sequelize.query(
        `INSERT INTO user_activity_log (user_id, activity_type, description, created_at)
         VALUES (?, 'password_reset', 'Password reset via forgot password flow', NOW())`,
        {
          replacements: [otpRecord.user_id],
          type: db.sequelize.QueryTypes.INSERT,
        }
      );

      res.json({
        success: true,
        message: "Password reset successfully! You can now login with your new password.",
        data: {
          user_id: otpRecord.user_id,
          user_type: otpRecord.user_type
        }
      });

    } catch (error) {
      console.error("😱 Reset password error:", error);
      console.error("😱 Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
};
