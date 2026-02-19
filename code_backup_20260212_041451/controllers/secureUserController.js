const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

require("regenerator-runtime/runtime");
const db = require("../models");
const User = db.User;
const Student = db.Student;

// Load input validation
const validateRegisterForm = require("../validation/register");
const validateLoginForm = require("../validation/login");
const { Op } = require("sequelize");

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Enhanced secure login with comprehensive security measures
 */
const secureLogin = async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];
  
  try {
    const { username, password, school_id = null } = req.body;
    const { errors, isValid } = validateLoginForm(req.body);
    const short_name = school_id;

    // Input validation
    if (!isValid) {
      // Generic error response
      return res.status(400).json({
        success: false,
        message: "Invalid input provided"
      });
    }

    // Check for account lockout
    const lockoutStatus = await checkAccountLockout(username, clientIP);
    if (lockoutStatus.isLocked) {
      return res.status(429).json({
        success: false,
        message: "Account temporarily locked due to multiple failed attempts",
        lockoutUntil: lockoutStatus.lockoutUntil
      });
    }

    let resolvedSchoolId = null;

    // Resolve school ID with error handling - accept both school_id and short_name
    if (short_name && short_name !== "admin") {
      try {
        // First try to resolve as short_name
        const [schoolList] = await db.sequelize.query(
          `SELECT school_id FROM school_setup 
           WHERE short_name = :short_name AND status = 'Active'`,
          {
            replacements: { short_name },
            type: db.sequelize.QueryTypes.SELECT,
          }
        );

        if (schoolList) {
          resolvedSchoolId = schoolList.school_id;
        } else {
          // If not found as short_name, try to resolve as school_id directly
          const [schoolById] = await db.sequelize.query(
            `SELECT school_id FROM school_setup 
             WHERE school_id = :school_id AND status = 'Active'`,
            {
              replacements: { school_id: short_name },
              type: db.sequelize.QueryTypes.SELECT,
            }
          );
          
          if (schoolById) {
            resolvedSchoolId = schoolById.school_id;
          }
        }
      } catch (schoolError) {
        console.error('School resolution error:', schoolError);
        return res.status(500).json({
          success: false,
          message: "Authentication service temporarily unavailable"
        });
      }
    }

    // Validate school requirement
    if (!resolvedSchoolId && short_name !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Find user with timing attack protection
    let user;
    try {
      user = await User.findOne({
        where: {
          email: username,
          school_id: short_name === "admin" ? "" : resolvedSchoolId,
        },
        attributes: ['id', 'email', 'password', 'user_type', 'school_id', 'branch_id', 'status', 'name']
      });
    } catch (userError) {
      console.error('User lookup error:', userError);
      return res.status(500).json({
        success: false,
        message: "Authentication service temporarily unavailable"
      });
    }

    // Timing attack protection - always perform password comparison
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // dummy hash
    const passwordToCheck = user ? user.password : dummyHash;
    
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, passwordToCheck);
    } catch (bcryptError) {
      console.error('Password comparison error:', bcryptError);
      isMatch = false;
    }

    // Validate user existence and password in single check
    if (!user || !isMatch) {
      // Add artificial delay to prevent timing attacks
      const elapsedTime = Date.now() - startTime;
      const minResponseTime = 1000; // 1 second minimum
      if (elapsedTime < minResponseTime) {
        await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Check account status
    if (user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active. Please contact administrator."
      });
    }

    // Generate secure JWT payload (minimal data)
    const payload = {
      id: user.id,
      user_type: user.user_type,
      school_id: user.school_id,
      branch_id: user.branch_id,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // Unique token ID for revocation
    };

    // Sign token with enhanced security
    jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY,
      { 
        expiresIn: "1d",
        issuer: "elscholar-api",
        audience: "elscholar-client"
      },
      async (err, token) => {
        if (err) {
          console.error('Token signing error:', err);
          return res.status(500).json({
            success: false,
            message: "Authentication service temporarily unavailable"
          });
        }

        // Secure response with minimal user data
        res.json({
          success: true,
          token: "Bearer " + token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            user_type: user.user_type,
            school_id: user.school_id,
            branch_id: user.branch_id
            // Removed sensitive fields like password, full user object, etc.
          },
          session: {
            expires_in: "1d",
            issued_at: new Date().toISOString()
          }
        });
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    
    return res.status(500).json({
      success: false,
      message: "Authentication service temporarily unavailable"
    });
  }
};

/**
 * Check if account is locked due to failed attempts (DISABLED)
 */
const checkAccountLockout = async (username, ipAddress) => {
  // Disabled - return unlocked status
  return { isLocked: false, attemptCount: 0, lockoutUntil: null };
};

/**
 * Record failed login attempt (DISABLED)
 */
const recordFailedAttempt = async (username, ipAddress) => {
  // Disabled - no database logging
  return;
};

/**
 * Clear failed attempts after successful login (DISABLED)
 */
const clearFailedAttempts = async (username, ipAddress) => {
  // Disabled - no database clearing
  return;
};

/**
 * Comprehensive login attempt logging (DISABLED)
 */
const logLoginAttempt = async (logData) => {
  // Disabled - no database logging
  return;
};

/**
 * Enhanced secure student login
 */
const secureStudentLogin = async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const { errors, isValid } = validateLoginForm(req.body);
    const { username, password, school_id: requestSchoolId = null } = req.body;
    const short_name = req.subdomain?.trim();

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid input provided"
      });
    }

    // Check for account lockout
    const lockoutStatus = await checkAccountLockout(username, clientIP);
    if (lockoutStatus.isLocked) {
      return res.status(429).json({
        success: false,
        message: "Account temporarily locked due to multiple failed attempts"
      });
    }

    let resolvedSchoolId = null;

    // Resolve school ID
    if (short_name || requestSchoolId) {
      try {
        const [school] = await db.sequelize.query(
          `SELECT school_id FROM school_setup 
           WHERE (short_name = :short_name OR school_id = :school_id) 
           AND status = 'Active' LIMIT 1`,
          {
            replacements: {
              short_name: short_name || '',
              school_id: requestSchoolId || ''
            },
            type: db.sequelize.QueryTypes.SELECT,
          }
        );

        if (school) {
          resolvedSchoolId = school.school_id;
        }
      } catch (error) {
        console.error('School resolution error:', error);
      }
    }

    if (!resolvedSchoolId) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Find student with timing attack protection
    let user;
    try {
      user = await Student.findOne({
        where: {
          admission_no: username,
          school_id: resolvedSchoolId,
        },
        attributes: ['admission_no', 'student_name', 'password', 'user_type', 'school_id', 'branch_id', 'status']
      });
    } catch (error) {
      console.error('Student lookup error:', error);
      return res.status(500).json({
        success: false,
        message: "Authentication service temporarily unavailable"
      });
    }

    // Timing attack protection
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const passwordToCheck = user ? user.dataValues.password : dummyHash;
    
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, passwordToCheck);
    } catch (error) {
      console.error('Password comparison error:', error);
      isMatch = false;
    }

    if (!user || !isMatch) {
      // Add artificial delay
      const elapsedTime = Date.now() - startTime;
      const minResponseTime = 1000;
      if (elapsedTime < minResponseTime) {
        await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate secure token
    const { admission_no, student_name, user_type, branch_id, school_id } = user;

    const payload = {
      admission_no,
      student_name,
      school_id: user.school_id,
      user_type,
      branch_id,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID()
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY,
      { 
        expiresIn: "1d",
        issuer: "elscholar-api",
        audience: "elscholar-client"
      },
      async (err, token) => {
        if (err) {
          console.error('Token signing error:', err);
          return res.status(500).json({
            success: false,
            message: "Authentication service temporarily unavailable"
          });
        }

        res.json({
          success: true,
          token: "Bearer " + token,
          user: {
            admission_no,
            student_name,
            user_type,
            school_id: user.school_id,
            branch_id
          },
          session: {
            expires_in: "1d",
            issued_at: new Date().toISOString()
          }
        });
      }
    );

  } catch (error) {
    console.error("Student login error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication service temporarily unavailable"
    });
  }
};

module.exports = {
  secureLogin,
  secureStudentLogin,
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  logLoginAttempt
};