const allowOnly = function(accessLevel, callback) {
    function checkUserRole(req, res) {
        // Handle different user object structures from passport
        let role;
        
        if (!req.user) {
            console.error('❌ No user found in request');
            return res.status(403).json({ msg: 'Authentication required' });
        }
        
        // Check if user is an array (old format)
        if (Array.isArray(req.user)) {
            if (req.user.length > 0 && req.user[0].dataValues) {
                role = req.user[0].dataValues.role || req.user[0].dataValues.user_type;
            } else if (req.user.length > 0) {
                role = req.user[0].role || req.user[0].user_type;
            }
        }
        // Check if user has dataValues (Sequelize model)
        else if (req.user.dataValues) {
            role = req.user.dataValues.role || req.user.dataValues.user_type;
        }
        // Check if user is a plain object (from raw SQL query or JWT)
        else if (req.user.role) {
            role = req.user.role;
        }
        // Check if user has user_type (for students/teachers from JWT)
        else if (req.user.user_type) {
            role = req.user.user_type;
        }
        
        if (!role) {
            console.error('❌ No role found for user:', req.user);
            return res.status(403).json({ msg: 'User role not found' });
        }
        
        console.log('🔍 Access Level Required:', accessLevel);
        console.log('🔍 User Role:', role);
        
        // Convert string role to numeric value for bitwise comparison
        const config = require('../config/config');
        let userRoleValue;
        
        switch(role.toLowerCase()) {
            case 'admin':
            case 'administrator':
            case 'branchadmin':
                userRoleValue = config.userRoles.admin;
                break;
            case 'teacher':
            case 'student':
            case 'parent':
                userRoleValue = config.userRoles.user; // Teachers, Students, Parents are users
                break;
            case 'superadmin':
            case 'super admin':
                userRoleValue = config.userRoles.superAdmin;
                break;
            default:
                userRoleValue = config.userRoles.guest;
        }
        
        console.log('🔍 User Role Value:', userRoleValue);
        
        if(!(accessLevel & userRoleValue)) {
            return res.status(403).json({ msg: 'You do not have access to this' });
        }

        callback(req, res);
    }

    return checkUserRole;
}


const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    return res.status(403).json({ message: 'Unauthorized access' });
  };
  
  // Helper function to extract user role consistently
const getUserRole = (user) => {
    if (!user) return null;
    
    // Check if user is an array (old format)
    if (Array.isArray(user)) {
        if (user.length > 0 && user[0].dataValues) {
            return user[0].dataValues.role || user[0].dataValues.user_type;
        } else if (user.length > 0) {
            return user[0].role || user[0].user_type;
        }
    }
    // Check if user has dataValues (Sequelize model)
    else if (user.dataValues) {
        return user.dataValues.role || user.dataValues.user_type;
    }
    // Check if user is a plain object
    else {
        return user.role || user.user_type;
    }
    
    return null;
};

const isAdmin = (req, res, next) => {
    const role = getUserRole(req.user);
    if (role === 'Admin') return next();
    return res.status(403).json({ message: 'Admins only' });
};

const isTeacher = (req, res, next) => {
    const role = getUserRole(req.user);
    if (role === 'Teacher') return next();
    return res.status(403).json({ message: 'Teacher only' });
};

const isStudent = (req, res, next) => {
    const role = getUserRole(req.user);
    if (role === 'Student') return next();
    return res.status(403).json({ message: 'Student only' });
};

  // middleware/subdomain.js
  // const reqSubDomain = (req, res, next) => {
  //   const host = req.headers.host?.split(':')[0]; // Removes port if present, e.g., localhost:3000
  //   console.log("Host:", host);
  
  //   const domainParts = host.split('.');
  
  //   if (
  //     domainParts.length >= 3 && // at least subdomain.domain.tld
  //     domainParts[0] !== 'www' &&
  //     domainParts.length <= 5 // to filter out extremely long subdomains
  //   ) {
  //     req.subdomain = domainParts[0];
  //   } else {
  //     req.subdomain = null;
  //   }
  
  //   next();
  // };
  const reqSubDomain = (req, res, next) => {
    const origin = req.headers.origin || req.headers.referer;
  
    if (origin) {
      try {
        const hostname = new URL(origin).hostname; // e.g. yma.elscholar.ng
        const parts = hostname.split('.');
  
        if (parts.length >= 3) {
          req.subdomain = parts[0]; // 'yma'
        } else {
          req.subdomain = null;
        }
      } catch (e) {
        req.subdomain = null;
      }
    } else {
      req.subdomain = null;
    }
  
    next();
  };
  
module.exports = { allowOnly, isAuthenticated, isAdmin, isTeacher, isStudent, reqSubDomain, getUserRole };