const db = require('../models');
// Note: Enhanced permission service removed - using simplified auth
const { Op } = require('sequelize');

class PermissionController {
  
  // Get all permission categories
  async getCategories(req, res) {
    try {
      const categories = await db.PermissionCategory.findAll({
        where: { is_active: true },
        include: [
          {
            model: db.EnhancedPermission,
            as: 'permissions',
            where: { is_active: true },
            required: false
          }
        ],
        order: [['sort_order', 'ASC'], ['name', 'ASC']]
      });

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching categories: ' + error.message
      });
    }
  }

  // Get all permissions
  async getPermissions(req, res) {
    try {
      const { category_id, resource, action } = req.query;
      const where = { is_active: true };

      if (category_id) where.category_id = category_id;
      if (resource) where.resource = resource;
      if (action) where.action = action;

      const permissions = await db.EnhancedPermission.findAll({
        where,
        include: [
          {
            model: db.PermissionCategory,
            as: 'category'
          }
        ],
        order: [['category_id', 'ASC'], ['sort_order', 'ASC'], ['resource', 'ASC'], ['action', 'ASC']]
      });

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching permissions: ' + error.message
      });
    }
  }

  // Get user permissions
  async getUserPermissions(req, res) {
    try {
      const { user_id } = req.params;
      const { school_id } = req.query;

      if (!user_id || !school_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID and School ID are required'
        });
      }

      const permissions = await permissionService.getUserPermissions(user_id, school_id);

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user permissions: ' + error.message
      });
    }
  }

  // Check specific permission
  async checkPermission(req, res) {
    try {
      const { user_id, school_id, resource, action, scope = 'SCHOOL' } = req.body;

      if (!user_id || !school_id || !resource || !action) {
        return res.status(400).json({
          success: false,
          message: 'User ID, School ID, resource, and action are required'
        });
      }

      const hasPermission = await permissionService.hasPermission(
        user_id, school_id, resource, action, scope
      );

      res.json({
        success: true,
        data: {
          hasPermission,
          permission: `${resource}:${action}:${scope}`
        }
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking permission: ' + error.message
      });
    }
  }

  // Grant role permission
  async grantRolePermission(req, res) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const { role_id, permission_id, conditions, expires_at } = req.body;
      const granted_by = req.user?.id;

      if (!role_id || !permission_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Role ID and Permission ID are required'
        });
      }

      // Check if permission already exists
      const existing = await db.RolePermission.findOne({
        where: { role_id, permission_id },
        transaction
      });

      if (existing) {
        // Update existing permission
        await existing.update({
          granted: true,
          conditions,
          expires_at,
          granted_by,
          granted_at: new Date()
        }, { transaction });
      } else {
        // Create new permission
        await db.RolePermission.create({
          role_id,
          permission_id,
          granted: true,
          conditions,
          expires_at,
          granted_by
        }, { transaction });
      }

      // Invalidate cache for all users with this role
      await this.invalidateRoleCache(role_id);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Permission granted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error granting role permission:', error);
      res.status(500).json({
        success: false,
        message: 'Error granting permission: ' + error.message
      });
    }
  }

  // Revoke role permission
  async revokeRolePermission(req, res) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const { role_id, permission_id } = req.body;

      if (!role_id || !permission_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Role ID and Permission ID are required'
        });
      }

      await db.RolePermission.destroy({
        where: { role_id, permission_id },
        transaction
      });

      // Invalidate cache for all users with this role
      await this.invalidateRoleCache(role_id);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Permission revoked successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error revoking role permission:', error);
      res.status(500).json({
        success: false,
        message: 'Error revoking permission: ' + error.message
      });
    }
  }

  // Grant user permission override
  async grantUserPermission(req, res) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const { user_id, permission_id, granted, conditions, reason, expires_at } = req.body;
      const granted_by = req.user?.id;

      if (!user_id || !permission_id || granted === undefined) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'User ID, Permission ID, and granted status are required'
        });
      }

      // Get user's school_id
      const user = await db.User.findByPk(user_id);
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await db.UserPermissionOverride.upsert({
        user_id,
        permission_id,
        granted,
        conditions,
        reason,
        expires_at,
        granted_by,
        is_active: true
      }, { transaction });

      // Invalidate user cache
      await permissionService.invalidateUserCache(user_id, user.school_id);

      await transaction.commit();

      res.json({
        success: true,
        message: `Permission ${granted ? 'granted' : 'denied'} successfully`
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error managing user permission:', error);
      res.status(500).json({
        success: false,
        message: 'Error managing permission: ' + error.message
      });
    }
  }

  // Remove user permission override
  async removeUserPermission(req, res) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const { user_id, permission_id } = req.body;

      if (!user_id || !permission_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'User ID and Permission ID are required'
        });
      }

      // Get user's school_id
      const user = await db.User.findByPk(user_id);
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await db.UserPermissionOverride.destroy({
        where: { user_id, permission_id },
        transaction
      });

      // Invalidate user cache
      await permissionService.invalidateUserCache(user_id, user.school_id);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Permission override removed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error removing user permission:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing permission: ' + error.message
      });
    }
  }

  // Get role permissions
  async getRolePermissions(req, res) {
    try {
      const { role_id } = req.params;

      if (!role_id) {
        return res.status(400).json({
          success: false,
          message: 'Role ID is required'
        });
      }

      const rolePermissions = await db.RolePermission.findAll({
        where: { role_id },
        include: [
          {
            model: db.EnhancedPermission,
            as: 'permission',
            include: [
              {
                model: db.PermissionCategory,
                as: 'category'
              }
            ]
          }
        ]
      });

      res.json({
        success: true,
        data: rolePermissions
      });
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching role permissions: ' + error.message
      });
    }
  }

  // Bulk update role permissions
  async bulkUpdateRolePermissions(req, res) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const { role_id, permissions } = req.body;
      const granted_by = req.user?.id;

      if (!role_id || !Array.isArray(permissions)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Role ID and permissions array are required'
        });
      }

      // Remove existing permissions
      await db.RolePermission.destroy({
        where: { role_id },
        transaction
      });

      // Add new permissions
      const rolePermissions = permissions.map(permission => ({
        role_id,
        permission_id: permission.permission_id,
        granted: permission.granted !== false,
        conditions: permission.conditions,
        expires_at: permission.expires_at,
        granted_by
      }));

      if (rolePermissions.length > 0) {
        await db.RolePermission.bulkCreate(rolePermissions, { transaction });
      }

      // Invalidate cache for all users with this role
      await this.invalidateRoleCache(role_id);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Role permissions updated successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating role permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating permissions: ' + error.message
      });
    }
  }

  // Invalidate cache for all users with a specific role
  async invalidateRoleCache(roleId) {
    try {
      const userRoles = await db.UserRoles.findAll({
        where: { role_id: roleId },
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'school_id']
          }
        ]
      });

      for (const userRole of userRoles) {
        if (userRole.user) {
          await permissionService.invalidateUserCache(
            userRole.user.id, 
            userRole.user.school_id
          );
        }
      }
    } catch (error) {
      console.error('Error invalidating role cache:', error);
    }
  }

  // Clear expired permissions
  async clearExpiredPermissions(req, res) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const now = new Date();

      // Clear expired role permissions
      const expiredRolePermissions = await db.RolePermission.destroy({
        where: {
          expires_at: {
            [Op.lt]: now
          }
        },
        transaction
      });

      // Clear expired user permission overrides
      const expiredUserPermissions = await db.UserPermissionOverride.destroy({
        where: {
          expires_at: {
            [Op.lt]: now
          }
        },
        transaction
      });

      // Clear expired cache entries
      await db.PermissionCache.cleanExpired();

      await transaction.commit();

      res.json({
        success: true,
        message: 'Expired permissions cleared successfully',
        data: {
          expiredRolePermissions,
          expiredUserPermissions
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error clearing expired permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error clearing expired permissions: ' + error.message
      });
    }
  }

  // Get permission statistics
  async getPermissionStats(req, res) {
    try {
      const { school_id } = req.query;

      const stats = await db.sequelize.query(`
        SELECT 
          COUNT(DISTINCT ep.id) as total_permissions,
          COUNT(DISTINCT pc.id) as total_categories,
          COUNT(DISTINCT rp.id) as total_role_permissions,
          COUNT(DISTINCT upo.id) as total_user_overrides,
          COUNT(DISTINCT cache.id) as cached_users
        FROM enhanced_permissions ep
        LEFT JOIN permission_categories pc ON ep.category_id = pc.id
        LEFT JOIN role_permissions rp ON ep.id = rp.permission_id
        LEFT JOIN user_permission_overrides upo ON ep.id = upo.permission_id
        LEFT JOIN permission_cache cache ON cache.expires_at > NOW()
        WHERE ep.is_active = 1
      `, {
        type: db.sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      console.error('Error fetching permission stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching permission stats: ' + error.message
      });
    }
  }
}

module.exports = new PermissionController();