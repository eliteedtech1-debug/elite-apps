/**
 * RBAC Sync Service
 * Automatically syncs user permissions when roles are assigned
 * Updates both new RBAC tables AND legacy users.permissions/accessTo fields
 */

const db = require('../models');
const { Op } = require('sequelize');

/**
 * Get all permissions for a user across all their active roles
 */
const getUserAllPermissions = async (userId, schoolId, branchId = null) => {
  try {
    const whereClause = {
      user_id: userId,
      school_id: schoolId,
      is_active: true,
      [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: new Date() } }
      ]
    };

    if (branchId) {
      whereClause[Op.or] = [
        { branch_id: branchId },
        { branch_id: null } // Include school-wide roles
      ];
    }

    const userRoles = await db.UserRole.findAll({
      where: whereClause,
      include: [{
        model: db.Role,
        as: 'role',
        include: [{
          model: db.Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      }]
    });

    // Collect all unique permissions and access modules
    const permissionsSet = new Set();
    const accessSet = new Set();
    const permissionObjects = [];

    userRoles.forEach(userRole => {
      if (userRole.role && userRole.role.permissions) {
        userRole.role.permissions.forEach(perm => {
          permissionsSet.add(perm.display_name);
          accessSet.add(perm.module);
          permissionObjects.push({
            name: perm.name,
            display_name: perm.display_name,
            module: perm.module,
            action: perm.action
          });
        });
      }
    });

    return {
      permissions: Array.from(permissionsSet),
      accessTo: Array.from(accessSet),
      permissionObjects,
      roles: userRoles.map(ur => ur.role?.display_name).filter(Boolean)
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {
      permissions: [],
      accessTo: [],
      permissionObjects: [],
      roles: []
    };
  }
};

/**
 * Sync user permissions to legacy users table
 * This ensures backward compatibility with existing code
 */
const syncUserPermissions = async (userId, schoolId, branchId = null) => {
  try {
    const userPermissions = await getUserAllPermissions(userId, schoolId, branchId);

    // Update users table with legacy format
    await db.users.update(
      {
        permissions: JSON.stringify(userPermissions.permissions),
        accessTo: JSON.stringify(userPermissions.accessTo)
      },
      {
        where: { id: userId }
      }
    );

    console.log(`✅ Synced permissions for user ${userId}:`, {
      permissions: userPermissions.permissions.length,
      accessTo: userPermissions.accessTo.length,
      roles: userPermissions.roles
    });

    return userPermissions;
  } catch (error) {
    console.error('Error syncing user permissions:', error);
    throw error;
  }
};

/**
 * Get preview of what permissions a role will grant
 * Used to show user what access they're about to assign
 */
const getRolePermissionsPreview = async (roleId) => {
  try {
    const role = await db.Role.findByPk(roleId, {
      include: [{
        model: db.Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    });

    if (!role) {
      return null;
    }

    const grouped = {};
    role.permissions?.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push({
        name: perm.name,
        display_name: perm.display_name,
        action: perm.action
      });
    });

    return {
      role_name: role.display_name,
      description: role.description,
      total_permissions: role.permissions?.length || 0,
      permissions_by_module: grouped,
      modules: Object.keys(grouped)
    };
  } catch (error) {
    console.error('Error getting role permissions preview:', error);
    return null;
  }
};

/**
 * Get user's effective permissions (for display)
 */
const getUserEffectivePermissions = async (userId, schoolId, branchId = null) => {
  try {
    const userPermissions = await getUserAllPermissions(userId, schoolId, branchId);

    // Group by module for easier reading
    const groupedPermissions = {};
    userPermissions.permissionObjects.forEach(perm => {
      if (!groupedPermissions[perm.module]) {
        groupedPermissions[perm.module] = [];
      }
      groupedPermissions[perm.module].push(perm);
    });

    return {
      user_id: userId,
      total_permissions: userPermissions.permissionObjects.length,
      total_modules: userPermissions.accessTo.length,
      roles: userPermissions.roles,
      permissions_by_module: groupedPermissions,
      raw_permissions: userPermissions.permissions
    };
  } catch (error) {
    console.error('Error getting effective permissions:', error);
    return null;
  }
};

/**
 * Check if user has specific permission
 */
const checkUserHasPermission = async (userId, permissionName, schoolId, branchId = null) => {
  try {
    const userPermissions = await getUserAllPermissions(userId, schoolId, branchId);
    return userPermissions.permissionObjects.some(p => p.name === permissionName);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Get permissions that would be added/removed if role is assigned/revoked
 */
const getPermissionDiff = async (userId, roleId, action, schoolId, branchId = null) => {
  try {
    // Get current permissions
    const currentPerms = await getUserAllPermissions(userId, schoolId, branchId);
    const currentSet = new Set(currentPerms.permissionObjects.map(p => p.name));

    // Get role permissions
    const rolePreview = await getRolePermissionsPreview(roleId);
    if (!rolePreview) {
      return null;
    }

    const rolePermNames = [];
    Object.values(rolePreview.permissions_by_module).forEach(perms => {
      perms.forEach(p => rolePermNames.push(p.name));
    });

    if (action === 'assign') {
      // Permissions that will be added
      const newPermissions = rolePermNames.filter(p => !currentSet.has(p));
      return {
        action: 'assign',
        role_name: rolePreview.role_name,
        permissions_to_add: newPermissions.length,
        new_permissions: newPermissions,
        total_after: currentPerms.permissionObjects.length + newPermissions.length
      };
    } else if (action === 'revoke') {
      // Permissions that might be removed (if not provided by other roles)
      const potentiallyRemoved = rolePermNames.filter(p => currentSet.has(p));
      return {
        action: 'revoke',
        role_name: rolePreview.role_name,
        permissions_potentially_removed: potentiallyRemoved.length,
        removed_permissions: potentiallyRemoved,
        total_after: Math.max(0, currentPerms.permissionObjects.length - potentiallyRemoved.length)
      };
    }

    return null;
  } catch (error) {
    console.error('Error calculating permission diff:', error);
    return null;
  }
};

module.exports = {
  getUserAllPermissions,
  syncUserPermissions,
  getRolePermissionsPreview,
  getUserEffectivePermissions,
  checkUserHasPermission,
  getPermissionDiff
};
