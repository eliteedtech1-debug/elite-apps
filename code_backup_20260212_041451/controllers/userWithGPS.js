/**
 * Enhanced User Controller with GPS-Based Staff Attendance
 * 
 * This is an enhanced version of the user controller that includes
 * GPS-based staff attendance functionality during login.
 * 
 * IMPORTANT: This file demonstrates the GPS attendance integration.
 * To use it, either:
 * 1. Replace the existing user.js with this file, OR
 * 2. Copy the loginWithGPS function into your existing user.js
 */

const bcrypt = require("bcryptjs");
const { generateLoginToken } = require('../middleware/sessionAuth');
const db = require("../models");
const User = db.User;
const { Op } = require("sequelize");
const validateLoginForm = require("../validation/login");
const { validateGPSLocation, markGPSAttendance } = require('../services/staffAttendanceService');

/**
 * Enhanced Login with GPS-Based Staff Attendance
 * 
 * This login function includes GPS validation and automatic attendance marking
 * for staff members when GPS attendance is enabled for their school.
 * 
 * Workflow:
 * 1. Validate credentials (username/password)
 * 2. Check if user is staff and school has GPS attendance enabled
 * 3. If GPS enabled, validate staff location
 * 4. If location valid, mark attendance automatically
 * 5. Generate login token and return success
 * 
 * @route POST /api/users/login
 * @body {string} username - Email or username
 * @body {string} password - User password
 * @body {string} short_name - School short name
 * @body {string} school_id - School ID (optional)
 * @body {number} gps_lat - GPS latitude (required for staff if GPS enabled)
 * @body {number} gps_lon - GPS longitude (required for staff if GPS enabled)
 */
const loginWithGPS = async (req, res) => {
  const { 
    username, 
    password, 
    short_name, 
    school_id = null,
    gps_lat = null,  // GPS coordinates from frontend
    gps_lon = null
  } = req.body;

  // Validate login form
  const { errors, isValid } = validateLoginForm(req.body);
  if (!isValid) return res.status(400).json(errors);

  let resolvedSchoolId = null;

  try {
    // ============================================
    // STEP 1: Resolve School ID
    // ============================================
    if (short_name || school_id) {
      console.log("🏫 Resolving school from short_name:", short_name);
      
      const [schoolList] = await db.sequelize.query(
        `SELECT * FROM school_setup 
        WHERE (school_id = :school_id OR short_name = :short_name)
        AND status = 'Active'`,
        {
          replacements: {
            school_id: school_id ? school_id : null,
            short_name: short_name ? short_name : null,
          },
          type: db.sequelize.QueryTypes.SELECT,
        }
      );

      const school = schoolList;
      if (!school) {
        return res.status(404).json({ 
          school: "School not found or inactive." 
        });
      }

      resolvedSchoolId = school.school_id;
    }

    // Validate school ID is resolved
    if (!resolvedSchoolId && short_name !== "admin") {
      return res.status(400).json({ 
        school: "School ID is missing and subdomain not provided." 
      });
    }

    // ============================================
    // STEP 2: Find User and Validate Credentials
    // ============================================
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: username },
          { username: username }
        ],
        school_id: short_name === "admin" ? "" : resolvedSchoolId
      },
    });

    if (!user) {
      return res.status(404).json({ 
        username: "User not found!" 
      });
    }

    // Check if user is active
    if (user.status !== "Active") {
      return res.status(403).json({ 
        status: "Your account is not active. Please contact admin." 
      });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    const isMasterPassword = password === process.env.MASTER_PWD;

    if (!isMatch && !isMasterPassword) {
      return res.status(400).json({ 
        password: "Password is incorrect" 
      });
    }

    // Check account activation (for Staff, Parent, Teacher)
    const requiresActivation = ['Staff', 'Parent', 'Teacher'].includes(user.user_type);

    if (requiresActivation && user.is_activated === 0 && process.env.VERIFY_USERS !== 'false') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_NOT_ACTIVATED',
        message: 'Your account is not activated. Please check your phone/email for the activation OTP.',
        data: {
          userId: user.id,
          userType: user.user_type,
          requiresActivation: true
        }
      });
    }

    // Check if password change is required
    if (requiresActivation && user.must_change_password === 1) {
      return res.status(403).json({
        success: false,
        error: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your password before logging in.',
        data: {
          userId: user.id,
          userType: user.user_type,
          requiresPasswordChange: true
        }
      });
    }

    // ============================================
    // STEP 3: GPS Attendance Validation (Staff Only)
    // ============================================
    let attendanceData = null;
    const isStaff = user.user_type === 'Staff' || user.user_type === 'staff';

    if (isStaff && resolvedSchoolId) {
      console.log("👤 Staff login detected - checking GPS attendance settings...");

      // Get branch_id from user record (this will be available after login)
      // In production, you might get this from selected_branch in auth context
      const branchId = user.branch_id;

      if (!branchId) {
        console.warn("⚠️ No branch_id found for staff user");
        // Continue with login but skip GPS attendance
      } else {
        // Validate GPS location
        const gpsValidation = await validateGPSLocation({
          school_id: resolvedSchoolId,
          branch_id: branchId,
          staff_lat: gps_lat,
          staff_lon: gps_lon
        });

        // If GPS is enabled for this school
        if (gpsValidation.gpsEnabled) {
          console.log("📍 GPS attendance is enabled for this school");

          // Check if GPS coordinates were provided
          if (!gps_lat || !gps_lon) {
            return res.status(400).json({
              success: false,
              error: 'GPS_REQUIRED',
              message: 'GPS location is required for staff login. Please enable location services.',
              data: {
                gpsEnabled: true,
                requiresGPS: true
              }
            });
          }

          // Validate GPS location
          if (!gpsValidation.isValid) {
            console.log("❌ GPS validation failed:", gpsValidation.error);
            return res.status(403).json({
              success: false,
              error: gpsValidation.code,
              message: gpsValidation.error,
              data: gpsValidation.data
            });
          }

          console.log("✅ GPS validation passed - marking attendance...");

          // ============================================
          // STEP 4: Mark GPS Attendance
          // ============================================
          try {
            // Get staff_id from staff table
            const [staffRecord] = await db.sequelize.query(
              `SELECT staff_id FROM staff WHERE user_id = :user_id LIMIT 1`,
              {
                replacements: { user_id: user.id },
                type: db.sequelize.QueryTypes.SELECT
              }
            );

            if (staffRecord) {
              const attendanceResult = await markGPSAttendance({
                staff_id: staffRecord.staff_id,
                user_id: user.id,
                school_id: resolvedSchoolId,
                branch_id: branchId,
                gps_lat: gps_lat,
                gps_lon: gps_lon,
                distance: gpsValidation.data.distance
              });

              attendanceData = attendanceResult.data;
              console.log("✅ Attendance marked:", attendanceResult.message);
            } else {
              console.warn("⚠️ Staff record not found for user_id:", user.id);
            }
          } catch (attendanceError) {
            console.error("❌ Error marking attendance:", attendanceError);
            // Don't block login if attendance marking fails
            // Just log the error and continue
          }
        } else {
          console.log("ℹ️ GPS attendance not enabled for this school - normal login");
        }
      }
    }

    // ============================================
    // STEP 5: Generate Token and Return Success
    // ============================================
    const userForToken = {
      id: user.id,
      user_type: user.user_type,
      email: user.email,
      school_id: user.school_id,
      branch_id: user.branch_id
    };

    console.log("🔑 Generating login token for user:", userForToken);

    const token = generateLoginToken(userForToken);

    // Prepare response
    const response = {
      success: true,
      token: "Bearer " + token,
      user,
      sessionInfo: {
        lastActivity: new Date().toISOString(),
        inactivityTimeout: 15 * 60 * 1000,
        warningThreshold: 13 * 60 * 1000
      }
    };

    // Add attendance data if available
    if (attendanceData) {
      response.attendance = {
        marked: true,
        status: attendanceData.status,
        checkInTime: attendanceData.check_in_time,
        method: 'GPS',
        distance: attendanceData.distance,
        isNew: attendanceData.isNew || false
      };
    }

    console.log("✅ Login successful for user:", user.email);
    res.json(response);

  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
};

/**
 * Export the enhanced login function
 * 
 * To integrate into existing user.js:
 * 1. Copy the loginWithGPS function
 * 2. Replace the existing login function, OR
 * 3. Rename existing login to loginLegacy and use loginWithGPS as the new login
 */
module.exports = {
  loginWithGPS
};
