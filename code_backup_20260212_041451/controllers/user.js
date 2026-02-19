const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateLoginToken } = require('../middleware/sessionAuth');

require("regenerator-runtime/runtime");
const db = require("../models");
const User = db.User;
const Student = db.Student;
// load input validation
const validateRegisterForm = require("../validation/register");
const validateLoginForm = require("../validation/login");
const { Op } = require("sequelize");
const { successResponse, errorResponse } = require("../utils/responseHandler"); // Import helpers
const emailService = require('../services/emailService'); // Import email service

// create user
const create = (req, res) => {
  const { errors, isValid } = validateRegisterForm(req.body);
  let { name, user_type, email, password, confirm_password } = req.body;

  // check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findAll({ where: { email } }).then((user) => {
    if (user.length) {
      return res.status(400).json({ email: "Email already exists!" });
    } else {
      // Check if VERIFY_USERS is disabled
      const verifyUsersDisabled = process.env.VERIFY_USERS === "false" || process.env.VERIFY_USERS === false;

      let newUser = {
        // firstname,
        // lastname,
        user_type,
        name,
        email,
        password,
        confirm_password,
      };

      // If VERIFY_USERS is disabled, auto-activate the user
      if (verifyUsersDisabled) {
        newUser.is_activated = 1;
        newUser.must_change_password = 0;
        newUser.activated_at = new Date();
        newUser.activation_method = 'manual_admin';
        console.log('✅ Auto-activating user (VERIFY_USERS=false):', email);
      }

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          User.create(newUser)
            .then((user) => {
              res.json({ user });
            })
            .catch((err) => {
              res.status(500).json({ err });
            });
        });
      });
    }
  });
};

const superadminLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username/Email and password are required." });
  }

  try {
    // Find SuperAdmin or Developer
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
        user_type: { [Op.in]: ["superadmin", "Developer", "developer"] },
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "Super Admin or Developer not found." });
    }

    /* ===============================
       AUTHENTICATION LOGIC (FIXED)
       =============================== */

    const isMasterPassword = password === process.env.MASTER_PWD;
    let isAuthenticated = false;

    if (isMasterPassword) {
      // Master password bypass
      isAuthenticated = true;
      console.warn(
        `[MASTER LOGIN] ${user.email} | ${new Date().toISOString()}`
      );
    } else {
      // Normal bcrypt check
      isAuthenticated = await bcrypt.compare(password, user.password);
    }

    if (!isAuthenticated) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    /* ===============================
       TOKEN GENERATION
       =============================== */

    const userForToken = {
      id: user.id,
      user_type: user.user_type,
      email: user.email,
      school_id: user.school_id,
      branch_id: user.branch_id,
    };

    const token = generateLoginToken(userForToken);

    return res.json({
      success: true,
      token: "Bearer " + token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
      },
      sessionInfo: {
        lastActivity: new Date().toISOString(),
        inactivityTimeout: 15 * 60 * 1000,
        warningThreshold: 13 * 60 * 1000,
      },
    });
  } catch (error) {
    console.error("Super Admin Login Error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const login = async (req, res) => {
  const { username, password, short_name, school_id = null, gps_lat = null, gps_lon = null } = req.body;
  const { errors, isValid } = validateLoginForm(req.body);
  if (!isValid) return res.status(400).json(errors);

  let resolvedSchoolId = null;

  try {
    if (short_name || school_id) {
      console.log("short_name", short_name);
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

      console.log({ schoolList, resolvedSchoolId });

      const school = schoolList;
      if (!school) {
        return res
          .status(404)
          .json({ school: "School not found or inactive." });
      }

      resolvedSchoolId = school.school_id;
    }

    // Case 2: Fallback to body if needed
    // if (!resolvedSchoolId) {
    //   resolvedSchoolId = school_id;
    // }

    // Case 3: Still not resolved
    if (!resolvedSchoolId && short_name !== "admin") {
      return res
        .status(400)
        .json({ school: "School ID is missing and subdomain not provided." });
    }

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
      return res.status(404).json({ username: "User not found!" });
    }
    // console.log(user);

    if (user.status !== "Active") {
      return res
        .status(403)
        .json({ status: "Your account is not active. Please contact admin." });
    }

    // Check password against both hashed password and MASTER_PWD
    const isMatch = await bcrypt.compare(password, user.password);
    const isMasterPassword = password === process.env.MASTER_PWD;

    if (!isMatch && !isMasterPassword) {
      return res.status(400).json({ password: "Password is incorrect" });
    }

    // Check account activation status (for Staff, Parent, Teacher)
    const requiresActivation = ['Staff', 'Parent', 'Teacher'].includes(user.user_type);

    // Check if school requires verification (from school_setup table)
    let schoolRequiresVerification = false;
    if (resolvedSchoolId) {
      const [schoolSettings] = await db.sequelize.query(
        `SELECT require_verification FROM school_setup WHERE school_id = :school_id LIMIT 1`,
        { replacements: { school_id: resolvedSchoolId }, type: db.sequelize.QueryTypes.SELECT }
      );
      schoolRequiresVerification = schoolSettings?.require_verification === 1;
    }

    // Block login if: user not activated AND (school requires verification OR global VERIFY_USERS is enabled)
    const globalVerifyEnabled = process.env.VERIFY_USERS !== 'false';
    if (requiresActivation && user.is_activated === 0 && (schoolRequiresVerification || globalVerifyEnabled)) {
      // Fetch phone number from the appropriate related table
      let phoneNumber = null;
      try {
        if (user.user_type === 'Teacher') {
          const [teacher] = await db.sequelize.query(
            `SELECT mobile_no FROM teachers WHERE user_id = :user_id LIMIT 1`,
            { replacements: { user_id: user.id }, type: db.sequelize.QueryTypes.SELECT }
          );
          phoneNumber = teacher?.mobile_no;
        } else if (user.user_type === 'Parent') {
          const [parent] = await db.sequelize.query(
            `SELECT phone_no FROM parents WHERE user_id = :user_id LIMIT 1`,
            { replacements: { user_id: user.id }, type: db.sequelize.QueryTypes.SELECT }
          );
          phoneNumber = parent?.phone_no;
        } else if (user.user_type === 'Staff') {
          const [staff] = await db.sequelize.query(
            `SELECT mobile_no FROM teachers WHERE user_id = :user_id LIMIT 1`,
            { replacements: { user_id: user.id }, type: db.sequelize.QueryTypes.SELECT }
          );
          phoneNumber = staff?.mobile_no;
        }
      } catch (phoneError) {
        console.error('Error fetching phone number:', phoneError);
      }

      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_NOT_ACTIVATED',
        message: 'Your account is not activated. Please verify your phone/email.',
        data: {
          userId: user.id,
          userType: user.user_type,
          phone: phoneNumber,
          email: user.email,
          schoolId: resolvedSchoolId,
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
    // GPS ATTENDANCE FOR STAFF (Supports both Staff and Teacher types)
    // ============================================
    let attendanceData = null;
    const isStaff = ['Staff', 'staff', 'Teacher', 'teacher'].includes(user.user_type);

    if (isStaff && resolvedSchoolId) {
      console.log("👤 Staff/Teacher login detected - checking GPS attendance settings...");

      // Get branch_id from user or fallback to teacher's branch
      let branchId = user.branch_id;

      // Fallback: Get branch_id from teacher record if user.branch_id is null
      if (!branchId) {
        try {
          const [teacherRecord] = await db.sequelize.query(
            `SELECT branch_id FROM teachers WHERE user_id = :user_id LIMIT 1`,
            {
              replacements: { user_id: user.id },
              type: db.sequelize.QueryTypes.SELECT
            }
          );
          if (teacherRecord && teacherRecord.branch_id) {
            branchId = teacherRecord.branch_id;
            console.log(`ℹ️  Using branch_id from teacher record: ${branchId}`);
          }
        } catch (err) {
          console.error('❌ Error fetching teacher branch_id:', err);
        }
      }
      
      if (branchId) {
        try {
          const { validateGPSLocation, markGPSAttendance } = require('../services/staffAttendanceService');
          
          const gpsValidation = await validateGPSLocation({
            school_id: resolvedSchoolId,
            branch_id: branchId,
            staff_lat: gps_lat,
            staff_lon: gps_lon
          });

          if (gpsValidation.gpsEnabled) {
            console.log("📍 GPS attendance is enabled for this school");

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

            try {
              // Query teachers table (Staff model points to teachers table)
              const [staffRecord] = await db.sequelize.query(
                `SELECT id as staff_id FROM teachers WHERE user_id = :user_id LIMIT 1`,
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
              }
            } catch (attendanceError) {
              console.error("❌ Error marking attendance:", attendanceError);
            }
          }
        } catch (gpsError) {
          console.error("❌ GPS validation error:", gpsError);
        }
      }
    }

    // Create user object for session-aware token
    const userForToken = {
      id: user.id,
      user_type: user.user_type,
      email: user.email,
      school_id: user.school_id,
      branch_id: user.branch_id
    };

    console.log({ userForToken });

    // Generate session-aware token
    const token = generateLoginToken(userForToken);

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

    if (attendanceData) {
      response.attendance = {
        marked: true,
        status: attendanceData.status,
        checkInTime: attendanceData.check_in_time,
        method: 'GPS',
        distance: attendanceData.distance
      };
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
const changeUserStatus = async (req, res) => {
  const { user_id, status } = req.body;

  if (!user_id || !status) {
    return res.status(400).json({ error: "User ID and status are required." });
  }

  const validStatuses = ["Active", "Inactive", "Suspended", "Pending"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  try {
    const result = await db.sequelize.transaction(async (transaction) => {
      // 🔹 1. Update main User (Sequelize model)
      const user = await User.findOne({ where: { id: user_id }, transaction });
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      await user.update({ status }, { transaction });

      // 🔹 2. Update PARENT if user_type is 'parent'
      if (user.user_type?.toLowerCase() === "parent") {
        await db.sequelize.query(
          `UPDATE parents SET status = :status WHERE user_id = :user_id`,
          {
            replacements: { status, user_id: user.id },
            transaction,
          }
        );
      }

      // 🔹 3. Update TEACHER if user_type is 'teacher'
      if (user.user_type?.toLowerCase() === "teacher") {
        await db.sequelize.query(
          `UPDATE teachers SET status = :status WHERE user_id = :user_id`,
          {
            replacements: { status, user_id: user.id },
            transaction,
          }
        );
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
        status: user.status,
      };
    });

    res.json({
      success: true,
      message: `User status updated to ${status} successfully`,
      user: result,
    });
  } catch (error) {
    console.error("Change User Status Error:", error);

    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(500).json({ error: "Failed to update user status." });
  }
};
// const login = async (req, res) => {
//   const { username, password, school_id = null } = req.body;
//   const { errors, isValid } = validateLoginForm(req.body);
//   const short_name = req.subdomain?.trim(); // optional: trim for safety

//   if (!isValid) return res.status(400).json(errors);

//   let resolvedSchoolId = null;

//   try {
//     // Case 1: Resolve from subdomain
//     if ((short_name && short_name !== "admin") || school_id) {
//       const [schoolList] = await db.sequelize.query(
//         `SELECT * FROM school_setup
//         WHERE (short_name = :short_name OR school_id = :school_id)
//         AND status = 'Active'`,
//         {
//           replacements: {
//             short_name: short_name ?? "",
//             school_id: school_id ?? "",
//           },
//           type: db.sequelize.QueryTypes.SELECT,
//         }
//       );

//       console.log({ schoolList, resolvedSchoolId });

//       const school = schoolList;
//       if (!school) {
//         return res
//           .status(404)
//           .json({ school: "School not found or inactive." });
//       }

//       resolvedSchoolId = school.school_id;
//     }

//     // Case 2: Fallback to body if needed
//     if (!resolvedSchoolId) {
//       resolvedSchoolId = school_id;
//     }

//     // Case 3: Still not resolved
//     if (!resolvedSchoolId && short_name !== "admin") {
//       return res
//         .status(400)
//         .json({ school: "School ID is missing and subdomain not provided." });
//     }

//     const user = await User.findOne({
//       where: {
//         email: username,
//         school_id: short_name === "admin" ? "" : resolvedSchoolId,
//       },
//     });

//     if (!user) {
//       return res.status(404).json({ username: "User not found!" });
//     }
//     // console.log(user);

//     if (user.status !== "Active") {
//       return res
//         .status(403)
//         .json({ status: "Your account is not active. Please contact admin." });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ password: "Password is incorrect" });
//     }

//     const payload = {
//       id: user.id,
//       user_type: user.user_type,
//       school_id: user.school_id,
//       branch_id: user.branch_id,
//     };

//     jwt.sign(
//       payload,
//       process.env.JWT_SECRET_KEY,
//       { expiresIn: "1d" },
//       (err, token) => {
//         if (err) return res.status(500).json({ error: "Error signing token" });

//         res.json({
//           success: true,
//           token: "Bearer " + token,
//           user,
//         });
//       }
//     );
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };

const studentLogin = async (req, res) => {
  const { errors, isValid } = validateLoginForm(req.body);
  const { username, password, short_name, school_id = null } = req.body;
  const subdomainShortName = req.subdomain?.trim();

  if (!isValid) {
    return res.status(400).json(errors);
  }

  let resolvedSchoolId = null;

  try {
    if (short_name || school_id) {
      const [school] = await db.sequelize.query(
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
      console.log("school", school);

      if (school) {
        resolvedSchoolId = school.school_id;
      }
    }

    // Step 2: Return error if school_id still not resolved
    if (!resolvedSchoolId) {
      return res.status(400).json({
        success: false,
        error:
          "Could not resolve school. Please provide a valid subdomain or school short_name.",
      });
    }

    // Step 3: Fetch student user
    const user = await Student.findOne({
      where: {
        admission_no: username,
        school_id: resolvedSchoolId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        errors: { username: "Student not found!" },
      });
    }

    // Step 4: Validate password
    const isMatch = await bcrypt.compare(password, user.dataValues.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        errors: { password: "Incorrect password!" },
      });
    }

    // Step 5: Generate session-aware token
    const { admission_no, student_name, user_type, branch_id } = user;

    // Create user object for session-aware token
    const userForToken = {
      id: admission_no, // For students, use admission_no as id
      user_type,
      email: user.email || `${admission_no}@student.local`,
      school_id: resolvedSchoolId,
      branch_id
    };

    // Generate session-aware token
    const token = generateLoginToken(userForToken);

    res.json({
      success: true,
      token: "Bearer " + token,
      user,
      user_type,
      sessionInfo: {
        lastActivity: new Date().toISOString(),
        inactivityTimeout: 15 * 60 * 1000,
        warningThreshold: 13 * 60 * 1000
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// const studentLogin = async (req, res) => {
//   // Validate required fields
//   const { username, password, school_id } = req.body;

//   if (!username || !password || !school_id) {
//     return res.status(400).json({
//       error: 'All fields (username, password, school_id) are required'
//     });
//   }

//   try {
//     // Find user by admission number and school_id
//     const user = await Student.findOne({
//       where: { admission_no: username, school_id }
//     });

//     // Check for user
//     if (!user) {
//       return res.status(404).json({
//         error: 'Student not found!'
//       });
//     }

//     // Check password match
//     const isMatch = await bcrypt.compare(password, user.password);

//     if (isMatch) {
//       // Password matched
//       const { admission_no, student_name, school_id, user_type, branch_id } = user;

//       // JWT payload
//       const payload = { admission_no, student_name, school_id, user_type, branch_id };

//       // Sign the token
//       jwt.sign(
//         payload,
//         process.env.JWT_SECRET_KEY,
//         { expiresIn: "1d" },
//         (err, token) => {
//           if (err) {
//             return res.status(500).json({ error: "Error signing token" });
//           }

//           res.json({
//             success: true,
//             token: "Bearer " + token,
//             user: user,
//             user_type
//           });
//         }
//       );
//     } else {
//       // Password did not match
//       return res.status(400).json({
//         error: 'Incorrect password!'
//       });
//     }
//   } catch (error) {
//     console.error('Student login error:', error);
//     return res.status(500).json({
//       error: 'Internal server error'
//     });
//   }
// };

const findAllUsers = (req, res) => {
  User.findAll()
    .then((user) => {
      res.json({ user });
    })
    .catch((err) => res.status(500).json({ err }));
};

// fetch user by userId
const findById = (req, res) => {
  const id = req.params.userId;

  User.findAll({ where: { id } })
    .then((user) => {
      if (!user.length) {
        return res.json({ msg: "user not found" });
      }
      res.json({ user });
    })
    .catch((err) => res.status(500).json({ err }));
};

// update a user's info
const update = (req, res) => {
  let { firstname, lastname, HospitalId, user_type, image } = req.body;
  const id = req.params.userId;

  User.update(
    {
      firstname,
      lastname,
      user_type,
    },
    { where: { id } }
  )
    .then((user) => res.status(200).json({ user }))
    .catch((err) => res.status(500).json({ err }));
};

// delete a user
const deleteUser = (req, res) => {
  const id = req.params.userId;

  User.destroy({ where: { id } })
    .then(() => res.status.json({ msg: "User has been deleted successfully!" }))
    .catch((err) => res.status(500).json({ msg: "Failed to delete!" }));
};

// ======================correct verify==========================
const verifyToken = async (req, res, next) => {
  console.log("🔍 VerifyToken called - Headers:", {
    authorization: req.headers.authorization ? "Present" : "Missing",
    "x-school-id": req.headers["x-school-id"],
    "x-branch-id": req.headers["x-branch-id"],
  });

  const authToken = req.headers["authorization"];
  let AuthID = null;
  if (!authToken) {
    console.error("❌ No authorization header provided");
    return res
      .status(401)
      .json({ success: false, msg: "No authorization header provided." });
  }

  // Ensure token format is "Bearer <token>"
  if (!authToken.startsWith("Bearer ")) {
    console.error(
      '❌ Invalid authorization header format - expected "Bearer <token>"'
    );
    return res.status(401).json({
      success: false,
      msg: "Invalid authorization header format. Expected 'Bearer <token>'.",
    });
  }

  const token = authToken.substring(7); // Remove "Bearer " prefix

  if (!token) {
    console.error('❌ No token found after "Bearer " prefix');
    return res.status(401).json({
      success: false,
      msg: "No token provided after 'Bearer ' prefix.",
    });
  }

  try {
    // Debug: Log the JWT secret key (first few characters only for security)
    console.log(
      "🔑 JWT Secret Key (first 10 chars):",
      process.env.JWT_SECRET_KEY?.substring(0, 10) + "..."
    );
    console.log(
      "🎫 Token to verify (first 20 chars):",
      token.substring(0, 20) + "..."
    );

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log("✅ Token decoded successfully:", {
      id: decoded.id,
      user_type: decoded.user_type,
      school_id: decoded.school_id,
      admission_no: decoded.admission_no,
    });

    const { id, user_type, school_id, branch_id, admission_no } = decoded;
    AuthID = decoded.id;
    // Get branch_id from headers if provided (for branch switching)
    const headerBranchId = req.headers["x-branch-id"];
    const adminNeedsBranch = req.headers["x-admin-needs-branch"] === "true";

    // Check user type for proper handling
    const isAdmin = user_type === "Admin" || user_type === "admin";
    const isStudent = user_type === "Student" || user_type === "student";

    // For Admin users, prioritize header branch_id over token branch_id
    const effectiveBranchId = isAdmin
      ? headerBranchId || branch_id
      : headerBranchId || branch_id;

    console.log({
      decoded,
      headerBranchId,
      effectiveBranchId,
      isAdmin,
      isStudent,
      adminNeedsBranch,
    });

    // Validate user user_type
    if (!user_type) {
      return res
        .status(403)
        .json({ success: false, msg: "User user_type is missing." });
    }

    let userRoleData = null;

    // Role-based query map
    const user_typeQueryMap = {
      superadmin: async () =>
        await db.sequelize.query(
          `SELECT t.*  FROM users t  WHERE t.id = :id;`,
          {
            replacements: { id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),
      admin: async () =>
        await db.sequelize.query(
          `SELECT t.*  FROM users t  WHERE  t.id = :id;`,
          {
            replacements: { id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),
      developer: async () =>
        await db.sequelize.query(
          `SELECT t.* FROM users t WHERE t.id = :id;`,
          {
            replacements: { id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),
      branchadmin: async () =>
        await db.sequelize.query(
          `SELECT t.* FROM users t  WHERE t.id = :id;`,
          {
            replacements: { id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),
      student: async () => {
        // For students, use admission_no from decoded token
        if (!decoded.admission_no) {
          throw new Error("Student token missing admission_no");
        }
        return await db.sequelize.query(
          `SELECT 
              s.*, 
              r.accessTo, 
              r.permissions
            FROM students s
            LEFT JOIN roles r ON r.school_id = s.school_id AND LOWER(r.user_type) = 'student'
            WHERE s.admission_no = :admission_no AND s.school_id = :school_id LIMIT 1;`,
          {
            type: db.Sequelize.QueryTypes.SELECT,
            replacements: {
              admission_no: decoded.admission_no,
              school_id: decoded.school_id,
            },
          }
        );
      },
      parent: async () =>
        await db.sequelize.query(
          `SELECT p.*
        FROM parents p 
        LEFT JOIN users r 
          ON r.id = p.user_id AND LOWER(r.user_type) = 'parent'
        WHERE p.user_id = :id`,
          {
            replacements: { id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),

      teacher: async () =>
        await db.sequelize.query(
          `SELECT t.*, 'Teacher' as user_type, u.accessTo, u.permissions FROM teachers t LEFT JOIN users u ON t.user_id = u.id WHERE t.user_id =:id;`,
          {
            replacements: { id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),
    };

    console.log({ user_typeQueryMap });

    // Fetch data based on user_type
    const fetchRoleData = user_typeQueryMap[user_type.toLowerCase()];
    if (!fetchRoleData) {
      return res
        .status(403)
        .json({ success: false, msg: `Invalid user_type: "${user_type}"` });
    }

    userRoleData = await fetchRoleData();

    // FIXED: The logic was backwards - this should check if userRoleData is empty/null
    if (
      !userRoleData ||
      (Array.isArray(userRoleData) && userRoleData.length === 0)
    ) {
      return res.status(404).json({
        success: false,
        msg: `No data found for user_type: ${user_type}`,
      });
    }

    // If the user_type data is an array (e.g., teachers), extract the first record
    userRoleData = Array.isArray(userRoleData) ? userRoleData[0] : userRoleData;
    console.log({ userRoleData });

    // { userRoleData: [AsyncFunction (anonymous)] }
    // making sure userRoleData has return value before the

    // Fetch additional data (only for non-superadmin user_types)
    let school = null;
    let classes = [];
    let subjects = [];
    let teacher_classes = [];
    let academic_calendar = [];
    let sections = [];
    let teacher_roles = [];
    let school_locations = [];
    let class_teachers = [];
    let class_teacher = [];
    let children = [];

    // making sure userRoleData has return value before the following execute

    if (
      user_type.toLowerCase() !== "superadmin" &&
      user_type.toLowerCase() !== "developer"
    ) {
      let queryBranchId = req.headers["x-branch-id"] || req.query.branch_id || userRoleData.branch_id || "";

      // Fetch school-related data for non-superadmin user_types
      [school, classes, subjects] = await Promise.all([
        db.sequelize.query(
          `SELECT * FROM school_setup WHERE school_id = :school_id`,
          {
            replacements: { school_id: userRoleData.school_id },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),
        db.sequelize.query(
          `SELECT c.* 
          FROM classes c
          WHERE c.school_id = :school_id
            AND c.branch_id = :branch_id
            AND c.status = 'Active'
            AND (
              c.parent_id IS NOT NULL
              OR NOT EXISTS (
                SELECT 1 FROM classes child 
                WHERE child.parent_id = c.class_code
              )
            )
        `,
          {
            replacements: { school_id: userRoleData.school_id, branch_id: queryBranchId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),
        db.sequelize.query(
          `SELECT sbj.*, cls.class_name FROM subjects sbj JOIN classes cls ON sbj.class_code = cls.class_code WHERE sbj.school_id = :school_id AND sbj.status = 'Active' AND sbj.branch_id = :branch_id`,
          {
            replacements: { school_id: userRoleData.school_id, branch_id: queryBranchId },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        ),
      ]);
    }

    if (user_type.toLowerCase() === "teacher") {
      const teacher = await db.Staff.findOne({
        where: { user_id: AuthID }
      });
      console.info('Teacher Info:', teacher);
      teacher_roles = await db.sequelize.query(
        `SELECT cl.*, cl.section_id as section FROM class_role cl WHERE teacher_id=${teacher.staff_id}`,
        { type: db.Sequelize.QueryTypes.SELECT }
      );

      teacher_classes = await db.sequelize.query(
        `SELECT 
      tc.*, 
      c.section, 
      c.class_name
    FROM active_teacher_classes tc 
    JOIN classes c 
      ON tc.class_code = c.class_code 
    WHERE tc.teacher_id = :teacher_id`,
        {
          replacements: { teacher_id: teacher.staff_id },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );

    }

    // Determine effective branch_id for queries
    // For admin users without branch_id, we need to fetch school_locations first to get a default
    let queryBranchId = req.headers["x-branch-id"] || req.query.branch_id || userRoleData.branch_id || "";

    // If admin user has no branch_id, fetch first available branch from school_locations
    if (isAdmin && !queryBranchId) {
      console.log('🔍 Admin user without branch_id detected, fetching first available branch...');
      const firstBranch = await db.sequelize.query(
        `SELECT branch_id FROM school_locations WHERE school_id = :school_id ORDER BY branch_id ASC LIMIT 1`,
        {
          replacements: { school_id: userRoleData.school_id },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );

      if (firstBranch && firstBranch.length > 0) {
        queryBranchId = firstBranch[0].branch_id;
        console.log('✅ Auto-selected first branch for queries:', queryBranchId);
      } else {
        console.warn('⚠️ No branches found for school:', userRoleData.school_id);
      }
    }

    // Fetch academic calendar
    // For admin users, if still no branch_id, fetch all branches' calendars
    if (isAdmin && !queryBranchId) {
      academic_calendar = await db.sequelize.query(
        `SELECT * FROM academic_calendar WHERE school_id = :school_id AND status = 'Active'`,
        {
          replacements: { school_id: userRoleData.school_id },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
    } else {
      academic_calendar = await db.sequelize.query(
        `SELECT * FROM academic_calendar WHERE school_id = :school_id AND branch_id = :branch_id AND status = 'Active'`,
        {
          replacements: { school_id: userRoleData.school_id, branch_id: queryBranchId },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
    }

    // Fetch sections
    // For admin users, if still no branch_id, fetch all branches' sections
    if (isAdmin && !queryBranchId) {
      sections = await db.sequelize.query(
        `SELECT * FROM school_section_table WHERE school_id = :school_id AND status='Active'`,
        {
          replacements: { school_id: userRoleData.school_id },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
    } else {
      sections = await db.sequelize.query(
        `SELECT * FROM school_section_table WHERE school_id = :school_id AND branch_id = :branch_id AND status='Active'`,
        {
          replacements: { school_id: userRoleData.school_id, branch_id: queryBranchId },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
    }

    // Fetch teacher roles (only for teachers)
    // if (user_type.toLowerCase() === "teacher") {
    //     const teacher = await db.Staff.findOne({
    //       user_id:  AuthID
    //     });
    //     console.info('Teacher Info:', teacher);
    //     class_roles = await db.sequelize.query(
    //     `SELECT * FROM class_role WHERE teacher_id = ${teacher.staff_id} and school_id = :school_id`,
    //     {
    //       replacements: { school_id: userRoleData.school_id },
    //       type: db.Sequelize.QueryTypes.SELECT,
    //     }
    //   );

    //   teacher_classes = await db.sequelize.query(
    //     `SELECT * FROM teacher_classes WHERE teacher_id = ${teacher.staff_id} and school_id = :school_id`,
    //     {
    //       replacements: { school_id: userRoleData.school_id },
    //       type: db.Sequelize.QueryTypes.SELECT,
    //     }
    //   );
    // }

    // Fetch school locations with conditional filtering based on user type
    let query = `SELECT * FROM school_locations WHERE school_id = :school_id`;
    let replacements = { school_id: userRoleData.school_id };

    // For admin users without selected branch, show all branches
    if (effectiveBranchId && !isAdmin) {
      // Non-admin users: filter by their specific branch
      query += ` AND branch_id = :branch_id`;
      replacements.branch_id = effectiveBranchId;
    } else if (effectiveBranchId && isAdmin) {
      // Admin users with selected branch: filter by selected branch
      query += ` AND branch_id = :branch_id`;
      replacements.branch_id = effectiveBranchId;
    }
    // Admin users without selected branch: show all branches (no filter)

    school_locations = await db.sequelize.query(
      query + ` ORDER BY branch_id ASC`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    // Add branch_index manually
    school_locations = school_locations.map((row, index) => ({
      branch_index: index + 1,
      ...row,
    }));
    console.log({ school_locations });

    if (user_type.toLowerCase() === "parent") {
      [children] = await db.sequelize.query(
        `SELECT * FROM students WHERE parent_id = :parent_id`,
        {
          replacements: {
            parent_id: userRoleData.parent_id,
          },
        }
      );
    }

    // Prepare response
    return res.json({
      success: true,
      user_type,
      user: userRoleData,
      //user: {...{...decoded, accessTo: userRoleData.accessTo, permisions: userRoleData.permissions, user_type}, [user_type.toLowerCase()]: userRoleData },
      school: school ? school[0] : null, // First school record if available
      classes: user_type.toLowerCase() === "teacher" ? teacher_roles : classes,
      subjects:
        user_type.toLowerCase() === "teacher" ? teacher_classes : subjects,
      academic_calendar,
      school_locations,
      sections,
      teacher_roles:
        user_type.toLowerCase() === "teacher" ? teacher_roles : [],
      class_teachers:
        user_type.toLowerCase() === "teacher" ? class_teacher : class_teachers,
      children,
      // Add auto-detected branch_id for frontend to use
      auto_selected_branch_id: isAdmin && !req.headers["x-branch-id"] && queryBranchId ? queryBranchId : undefined,
    });
  } catch (error) {
    console.error("❌ Token verification error:", error.name, error.message);
    console.error("🔍 Full error details:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to authenticate token.";
    if (error.name === "TokenExpiredError") {
      errorMessage =
        "Token has expired. Please login again to get a new token.";
    } else if (error.name === "JsonWebTokenError") {
      if (error.message.includes("invalid token")) {
        errorMessage =
          "Invalid token format. Please ensure the token is properly formatted and try again.";
      } else if (error.message.includes("invalid signature")) {
        errorMessage =
          "Token signature verification failed. The token may have been tampered with or generated with a different secret key.";
      } else if (error.message.includes("jwt malformed")) {
        errorMessage =
          "Malformed token. Please login again to get a new token.";
      } else if (error.message.includes("jwt not active yet")) {
        errorMessage =
          "Token is not active yet. Please wait or login again to get a new token.";
      } else {
        errorMessage = `Invalid token format or signature: ${error.message}. Please login again to get a new token.`;
      }
    } else if (error.name === "NotBeforeError") {
      errorMessage = "Token not active yet.";
    } else {
      // For other types of errors, provide more context
      errorMessage = `Token validation failed: ${error.message || "Unknown error"
        }. Please check your token and try again.`;
    }

    return res.status(401).json({
      success: false,
      msg: errorMessage,
      error_type: error.name,
      debug: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

const compose_sms = (req, res) => {
  // const {  } = req.body;
  const { query_type = null, id = null, compose_sms = null } = req.body;

  db.sequelize
    .query(`call compose_sms(:query_type,:id,:compose_sms)`, {
      replacements: {
        query_type,
        id,
        compose_sms,
      },
    })
    .then((results) => res.json({ success: true, data: results }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
const changePassword = async (req, res) => {
  try {
    const { user_id, old_password, new_password, user_type } = req.body;

    if (!user_id || !old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    // Determine which table to query based on user_type
    const isStudent = user_type === 'student' || user_type === 'Student';
    const tableName = isStudent ? 'students' : 'users';
    const idField = isStudent ? 'admission_no' : 'id';

    // Get school and branch from JWT token for multi-tenant filtering
    const { school_id, branch_id } = req.user;

    const [userResult] = await db.sequelize.query(
      `SELECT ${idField} as id, password FROM ${tableName} WHERE ${idField} = :user_id AND school_id = :school_id AND branch_id = :branch_id`,
      {
        replacements: { user_id, school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (!userResult) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      old_password,
      userResult.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await db.sequelize.query(
      `UPDATE ${tableName} SET password = :password, updated_at = NOW() WHERE ${idField} = :user_id AND school_id = :school_id AND branch_id = :branch_id`,
      {
        replacements: { password: hashedPassword, user_id, school_id, branch_id },
      }
    );

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

const changeEmail = async (req, res) => {
  try {
    const { user_id, new_email, current_password } = req.body;

    if (!user_id || !new_email || !current_password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const [emailCheck] = await db.sequelize.query(
      "SELECT id FROM users WHERE email = :new_email AND id != :user_id",
      {
        replacements: { new_email, user_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (emailCheck) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
        error_type: "duplicate_email",
      });
    }

    const [userResult] = await db.sequelize.query(
      "SELECT id, email, password FROM users WHERE id = :user_id",
      {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (!userResult) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      current_password,
      userResult.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    await db.sequelize.query(
      "UPDATE users SET email = :new_email, updatedAt = NOW() WHERE id = :user_id",
      {
        replacements: { new_email, user_id },
      }
    );

    res.json({
      success: true,
      message: "Email changed successfully",
      data: { old_email: userResult.email, new_email },
    });
  } catch (error) {
    console.error("Change email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change email",
    });
  }
};

// Get email queue statistics (for superadmin dashboard)
async function getQueueStats(req, res) {
  try {
    const stats = await emailService.getEmailQueueStats();
    // Ensure we return the correct format - check if stats has a data property or return stats directly
    const returnData = stats && stats.data !== undefined ? stats.data : stats;
    
    // Get failed jobs details if there are any failed jobs
    if (returnData.failed > 0) {
      try {
        console.log('🔍 Fetching failed jobs details...');
        const failedJobsResult = await emailService.getFailedEmails(0, 50); // Get up to 50 failed jobs
        console.log('📊 Failed jobs result:', failedJobsResult);
        returnData.failed_jobs = failedJobsResult.success ? failedJobsResult.data : [];
      } catch (error) {
        console.error('Error fetching failed jobs details:', error);
        returnData.failed_jobs = []; // Default to empty array if failed to get details
      }
    } else {
      returnData.failed_jobs = [];
    }
    
    return successResponse(res, 'Email queue statistics retrieved successfully', returnData);
  } catch (error) {
    console.error('Error fetching email queue stats:', error);
    return errorResponse(res, 'Failed to retrieve email queue statistics', 500);
  }
}

// Retry a failed job (for superadmin dashboard)
async function retryJob(req, res) {
  try {
    const { jobId } = req.params;
    console.log(`🔄 Retrying failed job: ${jobId}`);
    
    const result = await emailService.retryFailedEmail(jobId);
    
    if (result.success) {
      return successResponse(res, `Job ${jobId} retried successfully`, result);
    } else {
      // If job not found (404), delete it from the queue
      if (result.message?.includes('not found') || result.error?.includes('404')) {
        console.log(`🗑️ Job ${jobId} not found, removing from failed jobs`);
        return successResponse(res, `Job ${jobId} removed (not found)`, { deleted: true });
      }
      return errorResponse(res, result.message || `Failed to retry job ${jobId}`, 400);
    }
  } catch (error) {
    console.error(`Error retrying job ${req.params.jobId}:`, error);
    // If 404 error, treat as deleted
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return successResponse(res, `Job ${req.params.jobId} removed (not found)`, { deleted: true });
    }
    return errorResponse(res, 'Failed to retry job', 500);
  }
}

// Delete a failed job (for superadmin dashboard)
async function deleteFailedJob(req, res) {
  try {
    const { jobId } = req.params;
    console.log(`🗑️ Deleting failed job: ${jobId}`);
    
    const result = await emailService.deleteFailedEmail(jobId);
    
    if (result.success) {
      return successResponse(res, `Job ${jobId} deleted successfully`, result);
    } else {
      return errorResponse(res, result.message || `Failed to delete job ${jobId}`, 400);
    }
  } catch (error) {
    console.error(`Error deleting job ${req.params.jobId}:`, error);
    return errorResponse(res, 'Failed to delete job', 500);
  }
}

// Get failed email jobs (for superadmin dashboard)
async function getFailedEmailJobs(req, res) {
  try {
    const { start, end } = req.query; // Optional pagination parameters
    const failedJobsResult = await emailService.getFailedEmails(start, end);

    if (failedJobsResult.success) {
      return successResponse(res, 'Failed email jobs retrieved successfully', failedJobsResult.data);
    } else {
      return errorResponse(res, failedJobsResult.message || 'Failed to retrieve failed email jobs', 500);
    }
  } catch (error) {
    console.error('Error fetching failed email jobs:', error);
    return errorResponse(res, 'Failed to retrieve failed email jobs', 500);
  }
}

module.exports = {
  create,
  login,
  findAllUsers,
  findById,
  update,
  deleteUser,
  verifyToken,
  studentLogin,
  compose_sms,
  superadminLogin,
  changePassword,
  changeEmail,
  changeUserStatus,
  getQueueStats,
  retryJob,
  deleteFailedJob,
  getFailedEmailJobs,
};
