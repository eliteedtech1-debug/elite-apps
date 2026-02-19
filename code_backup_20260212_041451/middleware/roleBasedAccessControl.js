const db = require('../models');

class RoleBasedAccessControl {
  // Middleware to check if user has specific permission
  static checkPermission(requiredPermission) {
    return async (req, res, next) => {
      try {
        const { id: teacher_id } = req.user;

        if (!teacher_id) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Get teacher role
        const teacherRole = await db.TeacherRole.findOne({
          where: {
            teacher_id,
            is_active: true
          }
        });

        let hasPermission = false;

        // Check role-based permission
        if (teacherRole && teacherRole.hasPermission(requiredPermission)) {
          hasPermission = true;
        } else {
          // Check additional permissions
          hasPermission = await db.TeacherPermission.checkPermission(teacher_id, requiredPermission);
        }

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: `Permission denied. Required permission: ${requiredPermission}`,
            required_permission: requiredPermission,
            user_role: teacherRole?.role_type || 'No Role'
          });
        }

        // Add role information to request
        req.userRole = teacherRole?.role_type || 'Subject Teacher';
        req.userPermissions = teacherRole?.permissions || {};

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify permissions'
        });
      }
    };
  }

  // Middleware to check if user has any of the specified roles
  static requireRole(allowedRoles) {
    if (typeof allowedRoles === 'string') {
      allowedRoles = [allowedRoles];
    }

    return async (req, res, next) => {
      try {
        const { id: teacher_id } = req.user;

        if (!teacher_id) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const teacherRole = await db.TeacherRole.findOne({
          where: {
            teacher_id,
            is_active: true
          }
        });

        const userRole = teacherRole?.role_type || 'Subject Teacher';

        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({
            success: false,
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            user_role: userRole,
            allowed_roles: allowedRoles
          });
        }

        // Add role information to request
        req.userRole = userRole;
        req.userPermissions = teacherRole?.permissions || {};

        next();
      } catch (error) {
        console.error('Role check error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify role'
        });
      }
    };
  }

  // Middleware to check if user can access specific resource
  static checkResourceAccess(resourceType) {
    return async (req, res, next) => {
      try {
        const { id: teacher_id, school_id } = req.user;
        const resourceId = req.params.id;

        if (!teacher_id || !resourceId) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request parameters'
          });
        }

        let hasAccess = false;
        let resource = null;

        switch (resourceType) {
          case 'lesson_plan':
            resource = await db.LessonPlanEnhanced.findOne({
              where: { id: resourceId, school_id }
            });

            if (resource) {
              // Teacher can access their own plans
              if (resource.teacher_id === teacher_id) {
                hasAccess = true;
              } else {
                // Check if user is a collaborator
                const collaboration = await db.LessonPlanCollaborator.findOne({
                  where: {
                    lesson_plan_id: resourceId,
                    collaborator_id: teacher_id
                  }
                });

                if (collaboration) {
                  hasAccess = true;
                } else {
                  // Check if user has administrative role
                  const teacherRole = await db.TeacherRole.findOne({
                    where: { teacher_id, is_active: true }
                  });

                  if (teacherRole && ['Department Head', 'Content Reviewer'].includes(teacherRole.role_type)) {
                    hasAccess = true;
                  }
                }
              }
            }
            break;

          case 'syllabus':
            resource = await db.Syllabus.findOne({
              where: { id: resourceId }
            });

            if (resource) {
              // Check if teacher is assigned to this class/subject
              const assignment = await db.TeacherClass.findOne({
                where: {
                  teacher_id,
                  class_code: resource.class_code,
                  subject: resource.subject
                }
              });

              hasAccess = !!assignment;
            }
            break;

          default:
            return res.status(400).json({
              success: false,
              error: 'Invalid resource type'
            });
        }

        if (!resource) {
          return res.status(404).json({
            success: false,
            error: `${resourceType.replace('_', ' ')} not found`
          });
        }

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: `Access denied to this ${resourceType.replace('_', ' ')}`
          });
        }

        // Add resource to request for use in controller
        req.resource = resource;
        next();
      } catch (error) {
        console.error('Resource access check error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify resource access'
        });
      }
    };
  }

  // Middleware to check if user can perform specific action on resource
  static checkActionPermission(action, resourceType) {
    return async (req, res, next) => {
      try {
        const { id: teacher_id } = req.user;
        const resource = req.resource; // Should be set by checkResourceAccess

        if (!resource) {
          return res.status(400).json({
            success: false,
            error: 'Resource not found in request context'
          });
        }

        const teacherRole = await db.TeacherRole.findOne({
          where: { teacher_id, is_active: true }
        });

        const userRole = teacherRole?.role_type || 'Subject Teacher';
        let canPerformAction = false;

        switch (resourceType) {
          case 'lesson_plan':
            switch (action) {
              case 'edit':
                canPerformAction = resource.canEdit(teacher_id, userRole);
                break;
              case 'approve':
                canPerformAction = resource.canApprove(userRole);
                break;
              case 'submit':
                canPerformAction = resource.teacher_id === teacher_id && resource.status === 'draft';
                break;
              case 'delete':
                canPerformAction = resource.teacher_id === teacher_id && resource.status === 'draft';
                break;
              default:
                canPerformAction = false;
            }
            break;

          case 'syllabus':
            switch (action) {
              case 'edit':
                canPerformAction = ['Curriculum Designer', 'Department Head'].includes(userRole);
                break;
              case 'create':
                canPerformAction = ['Curriculum Designer', 'Department Head'].includes(userRole);
                break;
              case 'delete':
                canPerformAction = userRole === 'Department Head';
                break;
              default:
                canPerformAction = false;
            }
            break;

          default:
            canPerformAction = false;
        }

        if (!canPerformAction) {
          return res.status(403).json({
            success: false,
            error: `You do not have permission to ${action} this ${resourceType.replace('_', ' ')}`,
            user_role: userRole,
            required_action: action
          });
        }

        next();
      } catch (error) {
        console.error('Action permission check error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify action permission'
        });
      }
    };
  }

  // Middleware to load user permissions into request
  static loadUserPermissions() {
    return async (req, res, next) => {
      try {
        const { id: teacher_id } = req.user;

        if (!teacher_id) {
          req.userRole = null;
          req.userPermissions = {};
          return next();
        }

        // Get teacher role
        const teacherRole = await db.TeacherRole.findOne({
          where: {
            teacher_id,
            is_active: true
          }
        });

        // Get additional permissions
        const additionalPermissions = await db.TeacherPermission.getTeacherPermissions(teacher_id);

        // Combine permissions
        const rolePermissions = teacherRole?.permissions || {};
        const allPermissions = { ...rolePermissions, ...additionalPermissions };

        // Add to request
        req.userRole = teacherRole?.role_type || 'Subject Teacher';
        req.userPermissions = allPermissions;
        req.teacherRole = teacherRole;

        next();
      } catch (error) {
        console.error('Load user permissions error:', error);
        // Don't fail the request, just continue without permissions
        req.userRole = null;
        req.userPermissions = {};
        next();
      }
    };
  }

  // Helper method to check multiple permissions
  static checkMultiplePermissions(permissions, requireAll = false) {
    return async (req, res, next) => {
      try {
        const { id: teacher_id } = req.user;

        if (!teacher_id) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const teacherRole = await db.TeacherRole.findOne({
          where: {
            teacher_id,
            is_active: true
          }
        });

        const additionalPermissions = await db.TeacherPermission.getTeacherPermissions(teacher_id);
        const allPermissions = { ...teacherRole?.permissions, ...additionalPermissions };

        const permissionResults = permissions.map(permission => ({
          permission,
          granted: allPermissions[permission] === true
        }));

        const hasRequiredPermissions = requireAll
          ? permissionResults.every(p => p.granted)
          : permissionResults.some(p => p.granted);

        if (!hasRequiredPermissions) {
          return res.status(403).json({
            success: false,
            error: `Insufficient permissions. Required: ${permissions.join(requireAll ? ' AND ' : ' OR ')}`,
            permission_check: permissionResults,
            user_role: teacherRole?.role_type || 'No Role'
          });
        }

        req.userRole = teacherRole?.role_type || 'Subject Teacher';
        req.userPermissions = allPermissions;

        next();
      } catch (error) {
        console.error('Multiple permissions check error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to verify permissions'
        });
      }
    };
  }
}

module.exports = RoleBasedAccessControl;