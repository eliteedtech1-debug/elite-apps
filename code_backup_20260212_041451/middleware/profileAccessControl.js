const db = require('../models');

/**
 * Profile Access Control Middleware
 * Ensures users can only access and modify profile data according to their role
 */

// Define field access permissions for each user type
const FIELD_PERMISSIONS = {
  admin: {
    read: ['*'], // Can read all fields
    write: ['*'], // Can write all fields
    restricted: [] // No restrictions for admin
  },
  superadmin: {
    read: ['*'],
    write: ['*'],
    restricted: []
  },
  teacher: {
    read: [
      'name', 'email', 'phone', 'mobile_no', 'address', 'date_of_birth', 'sex', 'gender',
      'qualification', 'working_experience', 'employee_id', 'department', 'bio',
      'health_status', 'medical_notes', 'passport_url', 'profile_picture',
      'marital_status', 'state_of_origin', 'religion', 'account_name', 'account_number', 'bank'
    ],
    write: [
      'name', 'email', 'phone', 'mobile_no', 'address', 'date_of_birth', 'sex', 'gender',
      'qualification', 'working_experience', 'bio', 'health_status', 'medical_notes',
      'passport_url', 'profile_picture', 'marital_status', 'religion', 'account_name', 'account_number', 'bank'
    ],
    restricted: ['employee_id', 'department', 'payroll_status', 'salary'] // Admin approval required
  },
  student: {
    read: [
      'student_name', 'surname', 'first_name', 'other_names', 'email', 'phone',
      'sex', 'gender', 'date_of_birth', 'home_address', 'address', 'religion', 'tribe',
      'state_of_origin', 'nationality', 'special_health_needs', 'health_status',
      'medical_condition', 'medical_notes', 'blood_group', 'profile_picture',
      'admission_no', 'current_class', 'class_name', 'section', 'academic_year'
    ],
    write: [
      'email', 'phone', 'home_address', 'address', 'religion',
      'special_health_needs', 'health_status', 'medical_condition', 'medical_notes',
      'profile_picture'
    ],
    restricted: [
      'admission_no', 'student_name', 'surname', 'first_name', 'other_names',
      'current_class', 'class_name', 'section', 'academic_year', 'date_of_birth'
    ] // Admin/Parent approval required
  },
  parent: {
    read: [
      'fullname', 'name', 'phone', 'email', 'relationship', 'occupation',
      'nationality', 'address', 'state', 'l_g_a', 'passport_url', 'profile_picture'
    ],
    write: [
      'fullname', 'name', 'phone', 'email', 'occupation', 'address', 'state', 'l_g_a',
      'passport_url', 'profile_picture'
    ],
    restricted: ['relationship', 'is_guardian'] // Admin approval required
  }
};

// Define which user types can access which profile types
const PROFILE_ACCESS_MATRIX = {
  admin: ['admin', 'teacher', 'student', 'parent'], // Can access all profile types
  superadmin: ['admin', 'teacher', 'student', 'parent'],
  teacher: ['teacher'], // Can only access own profile
  student: ['student'], // Can only access own profile
  parent: ['parent', 'student'] // Can access own profile and children's profiles
};

/**
 * Check if user has permission to access a specific profile
 */
const checkProfileAccess = async (req, res, next) => {
  try {
    const { user_id, user_type } = req.query || req.body;
    const requestingUser = req.user; // From JWT authentication
    
    if (!requestingUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const requestingUserType = requestingUser.user_type?.toLowerCase();
    const targetUserType = user_type?.toLowerCase();
    
    // Check if requesting user type can access target user type
    const allowedProfileTypes = PROFILE_ACCESS_MATRIX[requestingUserType] || [];
    
    if (!allowedProfileTypes.includes(targetUserType) && !allowedProfileTypes.includes('*')) {
      return res.status(403).json({
        success: false,
        message: `${requestingUserType} users cannot access ${targetUserType} profiles`
      });
    }
    
    // If not admin/superadmin, check if accessing own profile
    if (!['admin', 'superadmin'].includes(requestingUserType)) {
      if (requestingUser.id !== user_id && requestingUser.user_id !== user_id) {
        // For parents, check if accessing child's profile
        if (requestingUserType === 'parent' && targetUserType === 'student') {
          const isParentOfStudent = await checkParentChildRelationship(requestingUser.id, user_id);
          if (!isParentOfStudent) {
            return res.status(403).json({
              success: false,
              message: 'You can only access your own profile or your children\'s profiles'
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            message: 'You can only access your own profile'
          });
        }
      }
    }
    
    // Add access control info to request
    req.profileAccess = {
      requestingUser: requestingUser,
      requestingUserType: requestingUserType,
      targetUserType: targetUserType,
      canRead: allowedProfileTypes.includes(targetUserType) || allowedProfileTypes.includes('*'),
      canWrite: allowedProfileTypes.includes(targetUserType) || allowedProfileTypes.includes('*'),
      isOwnProfile: requestingUser.id === user_id || requestingUser.user_id === user_id
    };
    
    next();
  } catch (error) {
    console.error('Profile access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking profile access permissions'
    });
  }
};

/**
 * Check if parent has access to student profile
 */
const checkParentChildRelationship = async (parentUserId, studentUserId) => {
  try {
    const relationship = await db.sequelize.query(
      `SELECT 1 FROM students s 
       JOIN parents p ON s.parent_id = p.parent_id 
       WHERE p.user_id = :parentUserId AND s.admission_no = :studentUserId`,
      {
        replacements: { parentUserId, studentUserId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    return relationship.length > 0;
  } catch (error) {
    console.error('Error checking parent-child relationship:', error);
    return false;
  }
};

/**
 * Filter fields based on user permissions
 */
const filterFieldsByPermission = (fields, userType, operation = 'read') => {
  const permissions = FIELD_PERMISSIONS[userType?.toLowerCase()];
  if (!permissions) return {};
  
  const allowedFields = permissions[operation] || [];
  
  // If user has access to all fields
  if (allowedFields.includes('*')) {
    return fields;
  }
  
  // Filter fields based on permissions
  const filteredFields = {};
  Object.keys(fields).forEach(field => {
    if (allowedFields.includes(field)) {
      filteredFields[field] = fields[field];
    }
  });
  
  return filteredFields;
};

/**
 * Check if field requires admin approval
 */
const requiresAdminApproval = (field, userType) => {
  const permissions = FIELD_PERMISSIONS[userType?.toLowerCase()];
  if (!permissions) return true;
  
  return permissions.restricted.includes(field);
};

/**
 * Middleware to filter request body based on user permissions
 */
const filterRequestFields = (req, res, next) => {
  try {
    if (!req.profileAccess) {
      return res.status(403).json({
        success: false,
        message: 'Profile access not verified'
      });
    }
    
    const { requestingUserType } = req.profileAccess;
    
    // Admin and superadmin can modify all fields
    if (['admin', 'superadmin'].includes(requestingUserType)) {
      return next();
    }
    
    // Filter request body based on write permissions
    const filteredFields = filterFieldsByPermission(req.body, requestingUserType, 'write');
    
    // Check for restricted fields
    const restrictedFields = [];
    Object.keys(req.body).forEach(field => {
      if (requiresAdminApproval(field, requestingUserType)) {
        restrictedFields.push(field);
      }
    });
    
    if (restrictedFields.length > 0) {
      return res.status(403).json({
        success: false,
        message: `The following fields require admin approval: ${restrictedFields.join(', ')}`,
        restricted_fields: restrictedFields
      });
    }
    
    // Update request body with filtered fields
    req.body = { ...req.body, ...filteredFields };
    
    next();
  } catch (error) {
    console.error('Field filtering error:', error);
    res.status(500).json({
      success: false,
      message: 'Error filtering request fields'
    });
  }
};

/**
 * Log profile access activity
 */
const logProfileActivity = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the activity after response is sent
      setImmediate(async () => {
        try {
          if (req.profileAccess && req.profileAccess.requestingUser) {
            const { requestingUser } = req.profileAccess;
            const { user_id, user_type } = req.query || req.body;
            
            await db.sequelize.query(
              `INSERT INTO user_activity_log (user_id, activity_type, description, ip_address, user_agent, created_at) 
               VALUES (:user_id, :activity_type, :description, :ip_address, :user_agent, NOW())`,
              {
                replacements: {
                  user_id: requestingUser.id || requestingUser.user_id,
                  activity_type: `profile_${req.method.toLowerCase()}`,
                  description: `${req.method} ${req.path} - Target: ${user_type} ${user_id}`,
                  ip_address: req.ip || req.connection.remoteAddress,
                  user_agent: req.headers['user-agent'] || 'Unknown'
                },
                type: db.sequelize.QueryTypes.INSERT
              }
            );
          }
        } catch (logError) {
          console.error('Activity logging error:', logError);
        }
      });
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Activity logging setup error:', error);
    next();
  }
};

module.exports = {
  checkProfileAccess,
  filterRequestFields,
  logProfileActivity,
  filterFieldsByPermission,
  requiresAdminApproval,
  FIELD_PERMISSIONS,
  PROFILE_ACCESS_MATRIX
};