const rbacService = require('../services/rbacService');

const requireFeature = (featureKey, action = 'view') => {
  return async (req, res, next) => {
    try {
      const { id: userId, school_id: schoolId, branch_id: branchId, user_type } = req.user;

      // Superadmins/Developers bypass
      if (['superadmin', 'developer'].includes(user_type?.toLowerCase())) {
        return next();
      }

      const hasPermission = await rbacService.checkPermission(userId, schoolId, branchId, featureKey, action);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `You don't have permission to ${action} ${featureKey}`,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ success: false, error: 'Permission check failed' });
    }
  };
};

const loadPermissions = async (req, res, next) => {
  try {
    const { id: userId, school_id: schoolId, branch_id: branchId } = req.user;
    const perms = await rbacService.getEffectivePermissions(userId, schoolId, branchId);
    req.permissions = perms.features;
    req.userRoles = perms.roles;
    next();
  } catch (error) {
    console.error('Load permissions error:', error);
    next();
  }
};

module.exports = { requireFeature, loadPermissions };
