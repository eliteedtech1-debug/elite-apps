/**
 * Role-based authentication middleware
 * Checks if the authenticated user has the required role(s) to access a resource
 */

/**
 * Middleware to check if user has required roles
 * @param {Array|String} allowedRoles - Array of allowed roles or single role string
 * @returns {Function} Express middleware function
 */
const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Convert single role to array for consistent handling
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      
      // Get user role from the authenticated user object
      const userRole = req.user.user_type || req.user.role;
      
      // Check if user has any of the required roles
      const hasRequiredRole = roles.some(role => {
        // Case-insensitive role comparison
        return userRole && userRole.toLowerCase() === role.toLowerCase();
      });

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${userRole}`,
        });
      }

      // User has required role, proceed to next middleware
      next();
    } catch (error) {
      console.error("Error in role-based auth middleware:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during role verification",
        error: error.message,
      });
    }
  };
};

/**
 * Predefined role groups for common access patterns
 */
const ROLE_GROUPS = {
  // Administrative roles
  ADMIN_ROLES: ['admin', 'branchadmin', 'superadmin', 'Developer'],
  
  // Examination management roles
  EXAM_ROLES: ['admin', 'branchadmin', 'exam_officer'],
  
  // Teaching and academic roles
  ACADEMIC_ROLES: ['admin', 'branchadmin', 'teacher', 'exam_officer'],
  
  // Student and parent access
  STUDENT_PARENT_ROLES: ['student', 'parent'],
  
  // All authenticated users
  ALL_AUTHENTICATED: ['admin', 'branchadmin', 'teacher', 'student', 'parent', 'exam_officer', 'superadmin'],
};

/**
 * Convenience middleware functions for common role patterns
 */
const requireAdminRoles = () => requireRoles(ROLE_GROUPS.ADMIN_ROLES);
const requireExamRoles = () => requireRoles(ROLE_GROUPS.EXAM_ROLES);
const requireAcademicRoles = () => requireRoles(ROLE_GROUPS.ACADEMIC_ROLES);
const requireStudentParentRoles = () => requireRoles(ROLE_GROUPS.STUDENT_PARENT_ROLES);
const requireAnyAuthenticatedRole = () => requireRoles(ROLE_GROUPS.ALL_AUTHENTICATED);

/**
 * Role hierarchy checker
 * Determines if a role has higher or equal privileges to another role
 */
const ROLE_HIERARCHY = {
  'Developer': 110,
  'superadmin': 100,
  'admin': 90,
  'branchadmin': 80,
  'exam_officer': 70,
  'teacher': 60,
  'parent': 30,
  'student': 20,
};

const hasRoleHierarchy = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole?.toLowerCase()] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole?.toLowerCase()] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Middleware to check role hierarchy
 * @param {String} minimumRole - Minimum required role level
 * @returns {Function} Express middleware function
 */
const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userRole = req.user.user_type || req.user.role;
      
      if (!hasRoleHierarchy(userRole, minimumRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Minimum required role: ${minimumRole}. Your role: ${userRole}`,
        });
      }

      next();
    } catch (error) {
      console.error("Error in role hierarchy middleware:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during role verification",
        error: error.message,
      });
    }
  };
};

module.exports = {
  requireRoles,
  requireAdminRoles,
  requireExamRoles,
  requireAcademicRoles,
  requireStudentParentRoles,
  requireAnyAuthenticatedRole,
  requireMinimumRole,
  hasRoleHierarchy,
  ROLE_GROUPS,
  ROLE_HIERARCHY,
};