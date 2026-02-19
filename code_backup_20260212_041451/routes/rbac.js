const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getUserFeatures } = require('../middleware/checkFeatureAccess');
const rbacService = require('../services/rbacService');
const rbacController = require('../controllers/rbacController');
const db = require('../models');

// ============================================================================
// AUDIT LOGGING HELPER
// ============================================================================

const logRbacAction = async (action, { target_user_id, role_name, performed_by, school_id, details }) => {
  try {
    await db.sequelize.query(`
      INSERT INTO rbac_audit_log (action, target_user_id, role_name, performed_by, school_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, { replacements: [action, target_user_id, role_name, performed_by, school_id, JSON.stringify(details || {})] });
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

// Manual trigger for role expiration check (also runs on cron)
router.post('/check-expired-roles', authenticateToken, async (req, res) => {
  try {
    if (!['developer', 'superadmin'].includes(req.user.user_type?.toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const { runExpirationCheck } = require('../services/roleExpirationService');
    const result = await runExpirationCheck();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get audit logs
router.get('/audit-log', authenticateToken, async (req, res) => {
  try {
    const { school_id } = req.query;
    const userType = req.user.user_type?.toLowerCase();
    
    let whereClause = '';
    const replacements = [];
    
    if (userType !== 'developer' && userType !== 'superadmin') {
      whereClause = 'WHERE a.school_id = ?';
      replacements.push(school_id || req.user.school_id);
    }
    
    const logs = await db.sequelize.query(`
      SELECT a.*, u.name as performer_name, t.name as target_name
      FROM rbac_audit_log a
      LEFT JOIN users u ON a.performed_by = u.id
      LEFT JOIN users t ON a.target_user_id = t.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT 100
    `, { replacements, type: db.Sequelize.QueryTypes.SELECT });
    
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// USER TYPES MANAGEMENT
// ============================================================================

// Get all user types
router.get('/user-types', authenticateToken, async (req, res) => {
  try {
    const [roles] = await db.sequelize.query(`
      SELECT user_type as type_name, user_type as type_key, description, COUNT(*) as count
      FROM roles 
      GROUP BY user_type, description
      ORDER BY user_type
    `);
    const formatted = roles.map((r, i) => ({
      id: i + 1,
      type_key: r.type_key?.toLowerCase(),
      type_name: r.type_name,
      description: r.description,
      count: r.count
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create user type
router.post('/user-types', authenticateToken, async (req, res) => {
  try {
    const { type_name, type_key } = req.body;
    const { school_id } = req.user;
    const existing = await db.Role.findOne({ where: { user_type: type_name, school_id } });
    if (existing) return res.status(400).json({ success: false, error: 'User type already exists' });
    const role = await db.Role.create({ user_type: type_name, description: type_key, school_id, role_code: type_key });
    res.json({ success: true, data: { id: role.role_id, type_key, type_name } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// USER PERMISSIONS & MENU (New Phase 2 endpoints)
// ============================================================================

// Get current user's effective permissions
router.get('/permissions', authenticateToken, rbacController.getUserPermissions);

// Get specific user's permissions (for admin use)
router.get('/user-permissions/:user_id', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const school_id = req.query.school_id || req.user.school_id;

    // Only admin/branchadmin can view other users' permissions
    if (!['admin', 'branchadmin'].includes(req.user.user_type?.toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Only admins can view user permissions' });
    }

    // Get user info to determine user type
    const user = await db.User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const rbacService = require('../services/rbacService');
    const permissions = await rbacService.getEffectivePermissions(
      user_id, 
      school_id, 
      user.branch_id, 
      user.user_type
    );

    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's effective menu items (what they actually have access to)
router.get('/user-effective-menu/:user_id', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const school_id = req.query.school_id || req.user.school_id;

    // Only admin/branchadmin can view other users' menu
    if (!['admin', 'branchadmin'].includes(req.user.user_type?.toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Only admins can view user menu' });
    }

    // Get target user info - this user_id should be the actual users.id
    const user = await db.User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Create a fake request object with the target user's context
    const fakeReq = {
      user: {
        id: parseInt(user_id), // This is the actual users.id
        user_type: user.user_type,
        school_id: school_id,
        branch_id: user.branch_id
      },
      headers: {
        'x-user-type': user.user_type,
        'x-branch-id': user.branch_id,
        'x-school-id': school_id
      },
      query: {
        compact: 'true',
        school_id: school_id
      }
    };

    // Get user's menu using the same controller logic
    const rbacController = require('../controllers/rbacController');
    
    // Create a fake response object to capture the menu data
    let menuData = null;
    const fakeRes = {
      json: (data) => {
        menuData = data;
      },
      status: () => fakeRes
    };

    // Call getUserMenu with the fake request
    await rbacController.getUserMenu(fakeReq, fakeRes);

    if (menuData && menuData.success && menuData.data) {
      // Extract menu item IDs from the hierarchical menu structure
      const extractMenuIds = (menuItems) => {
        const ids = [];
        
        const processItems = (items) => {
          if (!items) return;
          
          items.forEach(item => {
            if (item.id) {
              ids.push(item.id);
            }
            
            // Handle submenu items
            if (item.submenuItems && Array.isArray(item.submenuItems)) {
              item.submenuItems.forEach(subItem => {
                if (subItem.id) {
                  ids.push(subItem.id);
                }
              });
            }
            
            // Handle nested items
            if (item.items && Array.isArray(item.items)) {
              processItems(item.items);
            }
          });
        };

        // Process top-level categories
        if (Array.isArray(menuItems)) {
          menuItems.forEach(category => {
            if (category.items && Array.isArray(category.items)) {
              processItems(category.items);
            }
          });
        }

        return [...new Set(ids)]; // Remove duplicates
      };

      const accessibleMenuIds = extractMenuIds(menuData.data);
      res.json({ success: true, data: accessibleMenuIds });
    } else {
      res.json({ success: true, data: [] });
    }
  } catch (error) {
    console.error('Error fetching user effective menu:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get dynamic menu for current user
router.get('/menu', authenticateToken, rbacController.getUserMenu);
router.get('/menu-items-by-roles', authenticateToken, rbacController.getMenuItemsByRoles);

// Get/Update menu config (Developer only)
router.get('/menu-config', authenticateToken, rbacController.getMenuConfig);
router.put('/menu-config', authenticateToken, rbacController.updateMenuConfig);
router.post('/menu-items', authenticateToken, rbacController.createMenuItem);
router.put('/menu-items/:id', authenticateToken, rbacController.updateMenuItem);
router.delete('/menu-items/:id', authenticateToken, rbacController.deleteMenuItem);
router.post('/menu-items/bulk-access', authenticateToken, rbacController.bulkUpdateMenuAccess);

// Package management (Developer only)
router.post('/packages', authenticateToken, rbacController.createPackage);
router.put('/packages/:id', authenticateToken, rbacController.updatePackage);
router.delete('/packages/:id', authenticateToken, rbacController.deletePackage);

// Role Inheritance
router.get('/role-inheritance', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.sequelize.query('SELECT * FROM role_inheritance ORDER BY child_role');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/role-inheritance', authenticateToken, async (req, res) => {
  try {
    const { child_role, parent_role } = req.body;
    await db.sequelize.query(
      'INSERT INTO role_inheritance (child_role, parent_role) VALUES (?, ?)',
      { replacements: [child_role, parent_role] }
    );
    res.json({ success: true, message: 'Rule added' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/role-inheritance/:id', authenticateToken, async (req, res) => {
  try {
    await db.sequelize.query('DELETE FROM role_inheritance WHERE id = ?', { replacements: [req.params.id] });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Permission Templates
router.get('/permission-templates', authenticateToken, rbacController.getPermissionTemplates);
router.post('/permission-templates', authenticateToken, rbacController.createPermissionTemplate);
router.put('/permission-templates/:id', authenticateToken, rbacController.updatePermissionTemplate);
router.post('/permission-templates/:id/apply', authenticateToken, rbacController.applyPermissionTemplate);
router.delete('/permission-templates/:id', authenticateToken, rbacController.deletePermissionTemplate);

// Feature-based menu filtering
router.get('/menu-by-feature', authenticateToken, async (req, res) => {
  try {
    const { feature } = req.query;
    const items = await db.sequelize.query(
      `SELECT id, label, link, feature FROM rbac_menu_items WHERE feature = ? AND is_active = 1`,
      { replacements: [feature], type: db.Sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/feature-categories', authenticateToken, async (req, res) => {
  try {
    const [categories] = await db.sequelize.query(
      `SELECT feature, COUNT(*) as count FROM rbac_menu_items WHERE feature IS NOT NULL GROUP BY feature ORDER BY count DESC`
    );
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cache warming endpoint
router.post('/warm-cache', authenticateToken, async (req, res) => {
  try {
    const { school_id } = req.body;
    const { menuCache } = require('../utils/menuCache');
    await menuCache.warmCache(school_id, db);
    res.json({ success: true, message: 'Cache warming initiated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Permission conflict detection
router.get('/permission-conflicts', authenticateToken, async (req, res) => {
  try {
    // Find roles with inheritance loops
    const [loops] = await db.sequelize.query(`
      SELECT r1.child_role, r1.parent_role, r2.parent_role as grandparent
      FROM role_inheritance r1
      JOIN role_inheritance r2 ON r1.parent_role = r2.child_role
      WHERE r2.parent_role = r1.child_role
    `);
    
    // Find duplicate menu access
    const [duplicates] = await db.sequelize.query(`
      SELECT menu_item_id, user_type, COUNT(*) as cnt
      FROM rbac_menu_access
      GROUP BY menu_item_id, user_type
      HAVING cnt > 1
    `);
    
    // Find orphan menu items (no access assigned)
    const [orphans] = await db.sequelize.query(`
      SELECT m.id, m.label FROM rbac_menu_items m
      LEFT JOIN rbac_menu_access a ON m.id = a.menu_item_id
      WHERE a.id IS NULL AND m.is_active = 1
    `);
    
    res.json({ success: true, data: { loops, duplicates, orphans } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Role cloning
router.post('/clone-role', authenticateToken, async (req, res) => {
  try {
    const { source_role, new_role_name } = req.body;
    const school_id = req.user.school_id;
    
    // Check if role already exists
    const [existing] = await db.sequelize.query(
      'SELECT role_id FROM roles WHERE user_type = ? AND (school_id = ? OR school_id IS NULL)',
      { replacements: [new_role_name, school_id], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    if (existing) {
      return res.status(400).json({ success: false, error: 'Role already exists' });
    }
    
    // Create the new role in roles table
    await db.sequelize.query(
      'INSERT INTO roles (user_type, description, school_id, role_code) VALUES (?, ?, ?, ?)',
      { replacements: [new_role_name, `Cloned from ${source_role}`, school_id, new_role_name.toLowerCase().replace(/\s+/g, '_')] }
    );
    
    // Get source role's menu access
    const [access] = await db.sequelize.query(
      'SELECT menu_item_id FROM rbac_menu_access WHERE user_type = ?',
      { replacements: [source_role] }
    );
    
    // Create new role access
    for (const item of access) {
      await db.sequelize.query(
        'INSERT IGNORE INTO rbac_menu_access (menu_item_id, user_type) VALUES (?, ?)',
        { replacements: [item.menu_item_id, new_role_name] }
      );
    }
    
    res.json({ success: true, message: `Created role "${new_role_name}" with ${access.length} permissions` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Permission diff - compare two roles
router.get('/permission-diff', authenticateToken, async (req, res) => {
  try {
    const { role1, role2 } = req.query;
    
    const [role1Only] = await db.sequelize.query(`
      SELECT m.id, m.label FROM rbac_menu_items m
      JOIN rbac_menu_access a ON m.id = a.menu_item_id
      WHERE a.user_type = ? AND m.id NOT IN (
        SELECT menu_item_id FROM rbac_menu_access WHERE user_type = ?
      )`, { replacements: [role1, role2] });
    
    const [role2Only] = await db.sequelize.query(`
      SELECT m.id, m.label FROM rbac_menu_items m
      JOIN rbac_menu_access a ON m.id = a.menu_item_id
      WHERE a.user_type = ? AND m.id NOT IN (
        SELECT menu_item_id FROM rbac_menu_access WHERE user_type = ?
      )`, { replacements: [role2, role1] });
    
    const [common] = await db.sequelize.query(`
      SELECT m.id, m.label FROM rbac_menu_items m
      JOIN rbac_menu_access a1 ON m.id = a1.menu_item_id AND a1.user_type = ?
      JOIN rbac_menu_access a2 ON m.id = a2.menu_item_id AND a2.user_type = ?
    `, { replacements: [role1, role2] });
    
    res.json({ success: true, data: { role1Only, role2Only, common } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export permissions
router.get('/export-permissions', authenticateToken, async (req, res) => {
  try {
    const { user_type } = req.query;
    const [access] = await db.sequelize.query(`
      SELECT m.label, m.link, a.user_type
      FROM rbac_menu_access a
      JOIN rbac_menu_items m ON a.menu_item_id = m.id
      ${user_type ? 'WHERE a.user_type = ?' : ''}
      ORDER BY a.user_type, m.label
    `, user_type ? { replacements: [user_type] } : {});
    
    res.json({ success: true, data: access });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import permissions
router.post('/import-permissions', authenticateToken, async (req, res) => {
  try {
    const { permissions } = req.body; // [{user_type, link}, ...]
    let imported = 0;
    
    for (const p of permissions) {
      const [item] = await db.sequelize.query(
        'SELECT id FROM rbac_menu_items WHERE link = ?',
        { replacements: [p.link], type: db.Sequelize.QueryTypes.SELECT }
      );
      if (item) {
        await db.sequelize.query(
          'INSERT IGNORE INTO rbac_menu_access (menu_item_id, user_type) VALUES (?, ?)',
          { replacements: [item.id, p.user_type] }
        );
        imported++;
      }
    }
    
    res.json({ success: true, message: `Imported ${imported} permissions` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Audit Logs
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const [rows] = await db.sequelize.query(
      'SELECT * FROM permission_audit_log ORDER BY created_at DESC LIMIT ?',
      { replacements: [parseInt(limit)] }
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user's accessible features (legacy)
router.get('/user/features', authenticateToken, getUserFeatures);

// ============================================================================
// UNIFIED ROLES ENDPOINT (Phase 1 - Single Source of Truth)
// ============================================================================

router.get('/roles-unified', authenticateToken, async (req, res) => {
  try {
    const school_id = req.query.school_id || req.user.school_id;
    const userType = req.user.user_type?.toLowerCase();
    const isDeveloper = userType === 'developer';
    
    // SECURITY: Filter system roles for non-developers
    const systemRoleFilter = isDeveloper 
      ? '' 
      : "AND r.user_type NOT IN ('superadmin', 'developer', 'SuperAdmin', 'Developer', 'student', 'parent', 'Student', 'Parent')";
    
    // Developers see all roles, others see only their school's roles
    const schoolFilter = isDeveloper 
      ? '' 
      : "AND (r.school_id = :school_id OR r.school_id IS NULL OR r.school_id = 'default')";
    
    // Get base user types from roles table (one per school)
    const baseRoles = await db.sequelize.query(`
      SELECT DISTINCT 
        r.role_id as id,
        r.user_type as role_name,
        CONCAT(UPPER(SUBSTRING(r.user_type, 1, 1)), LOWER(SUBSTRING(r.user_type, 2))) as display_name,
        r.description,
        r.is_system_role,
        r.school_id
      FROM roles r
      WHERE r.school_id = :school_id
      ${systemRoleFilter}
      GROUP BY r.user_type
      ORDER BY r.is_system_role DESC, r.user_type ASC
    `, { 
      replacements: { school_id }, 
      type: db.Sequelize.QueryTypes.SELECT 
    });

    // Get custom staff roles from staff_role_definitions
    let staffRoles = [];
    try {
      staffRoles = await db.sequelize.query(`
        SELECT 
          id,
          role_code as role_name,
          role_name as display_name,
          description,
          is_system_role,
          'global' as school_id
        FROM staff_role_definitions
        WHERE is_system_role = 1
        ORDER BY role_name ASC
      `, {
        type: db.Sequelize.QueryTypes.SELECT
      });
    } catch (err) {
      // Table might not exist or have different structure
      console.log('staff_role_definitions not available:', err.message);
    }

    // Combine both sources
    const roles = [...baseRoles, ...staffRoles];
    
    // Get role hierarchy
    const hierarchy = await db.sequelize.query(`
      SELECT id, child_role, parent_role 
      FROM role_inheritance 
      ORDER BY parent_role, child_role
    `, { type: db.Sequelize.QueryTypes.SELECT });
    
    // Get simple list of role names for dropdowns
    const roleNames = [...new Set(roles.map(r => r.role_name))];
    
    res.json({ 
      success: true, 
      data: { 
        roles,
        hierarchy,
        roleNames
      } 
    });
  } catch (err) {
    console.error('Unified roles error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// FEATURES & ROLES MANAGEMENT
// ============================================================================

// List all features
router.get('/features', authenticateToken, rbacController.listFeatures);

// List roles for school
router.get('/roles', authenticateToken, rbacController.listRoles);

// Create custom role
router.post('/roles', authenticateToken, rbacController.createRole);

// Update role permissions
router.put('/roles/:id/permissions', authenticateToken, rbacController.updateRolePermissions);

// ============================================================================
// USER ROLE ASSIGNMENT (Legacy compatibility for teacher management)
// ============================================================================

// Get available roles (user types)
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const school_id = req.query.school_id || req.user.school_id;
    
    // Get school's package level
    const [schoolPkg] = await db.sequelize.query(`
      SELECT package_id FROM rbac_school_packages 
      WHERE school_id = :school_id AND is_active = 1 LIMIT 1
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });

    const packageId = schoolPkg?.package_id || 4; // Default to free tier
    
    // Get available user types including inherited roles (no package restrictions)
    // SECURITY: Filter out system roles for non-developers
    const systemRoleFilter = req.user.user_type === 'Developer' ? '' : 
      "AND r.user_type NOT IN ('superadmin', 'developer', 'SuperAdmin', 'Developer')";
    
    const [roles] = await db.sequelize.query(`
      SELECT DISTINCT 
        r.user_type as role_name,
        r.user_type as display_name,
        r.role_id as id,
        r.description
      FROM roles r
      WHERE (r.school_id = :school_id OR r.school_id IS NULL)
      ${systemRoleFilter}
      
      UNION
      
      SELECT DISTINCT
        ri.child_role as role_name,
        ri.child_role as display_name,
        CONCAT('inherited_', ri.id) as id,
        CONCAT('Extends ', ri.parent_role, ' role') as description
      FROM role_inheritance ri
      WHERE ri.child_role NOT IN ('superadmin', 'developer', 'SuperAdmin', 'Developer')
      
      ORDER BY role_name
    `, { replacements: { school_id } });

    res.json({ success: true, data: { roles } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user's assigned roles
router.get('/user-roles/:user_id', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const school_id = req.query.school_id || req.user.school_id;
    
    // Get user's current role assignments including inherited roles
    const [roles] = await db.sequelize.query(`
      SELECT 
        ur.user_id,
        ur.role_id,
        ur.is_active,
        ur.expires_at,
        ur.assigned_by,
        COALESCE(u.name, u.email, 'System') as assigned_by_name,
        COALESCE(ur.assigned_role_name, r.user_type) as role_name,
        COALESCE(ur.assigned_role_name, r.user_type) as display_name
      FROM user_roles ur
      LEFT JOIN roles r ON ur.role_id = r.role_id AND r.school_id = :school_id
      LEFT JOIN users u ON ur.assigned_by = u.id
      WHERE ur.user_id = :user_id 
      AND ur.is_active = 1
    `, { replacements: { user_id, school_id } });

    res.json({ success: true, data: { roles } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Assign role to user
router.post('/assign-role', authenticateToken, async (req, res) => {
  try {
    const { user_id, role_id, expires_at } = req.body;
    const school_id = req.body.school_id || req.user.school_id;
    
    // Get user's base type to validate role assignment
    const [targetUser] = await db.sequelize.query(`
      SELECT user_type FROM users WHERE id = :user_id LIMIT 1
    `, { replacements: { user_id }, type: db.Sequelize.QueryTypes.SELECT });
    
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userBaseType = targetUser.user_type?.toLowerCase();
    const roleToAssign = typeof role_id === 'string' ? role_id.toLowerCase() : role_id;
    
    // VALIDATION: Prevent invalid role assignments
    const isStaff = ['teacher', 'admin', 'branchadmin'].includes(userBaseType);
    const isStudentRole = ['student', 'parent'].includes(roleToAssign);
    
    if (isStaff && isStudentRole) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot assign ${roleToAssign} role to staff members` 
      });
    }
    
    if (!isStaff && !isStudentRole) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot assign staff roles to ${userBaseType} accounts` 
      });
    }
    
    // Get school's package level
    const [schoolPkg] = await db.sequelize.query(`
      SELECT package_id FROM rbac_school_packages 
      WHERE school_id = :school_id AND is_active = 1 LIMIT 1
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });

    const packageId = schoolPkg?.package_id || 4; // Default to free tier

    // Find the role (check both roles table and inherited roles)
    let [role] = await db.sequelize.query(`
      SELECT role_id, user_type FROM roles WHERE role_id = :role_id OR user_type = :role_id LIMIT 1
    `, { replacements: { role_id }, type: db.Sequelize.QueryTypes.SELECT });

    // If not found in roles table, check if it's an inherited role
    if (!role) {
      const [inheritedRole] = await db.sequelize.query(`
        SELECT ri.child_role as user_type, r.role_id, r.user_type as parent_role 
        FROM role_inheritance ri
        JOIN roles r ON ri.parent_role = r.user_type
        WHERE ri.child_role = :role_id LIMIT 1
      `, { replacements: { role_id }, type: db.Sequelize.QueryTypes.SELECT });
      
      if (inheritedRole) {
        role = { role_id: inheritedRole.role_id, user_type: inheritedRole.user_type };
      }
    }

    // CRITICAL SECURITY: Only developers can assign system roles
    const [roleCheck] = await db.sequelize.query(`
      SELECT is_system_role FROM roles WHERE role_id = :role_id OR user_type = :role_id LIMIT 1
    `, { replacements: { role_id }, type: db.Sequelize.QueryTypes.SELECT });
    
    if (roleCheck?.is_system_role === 1 && req.user.user_type !== 'Developer') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Only developers can assign system roles.' 
      });
    }

    // Check if assignment already exists
    const [existing] = await db.sequelize.query(`
      SELECT user_id FROM user_roles 
      WHERE user_id = :user_id AND role_id = :actual_role_id AND is_active = 1
    `, { replacements: { user_id, actual_role_id: role.role_id }, type: db.Sequelize.QueryTypes.SELECT });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Role already assigned' });
    }

    // Assign the role
    const formattedExpiresAt = expires_at ? new Date(expires_at).toISOString().slice(0, 19).replace('T', ' ') : null;
    await db.sequelize.query(`
      INSERT INTO user_roles (user_id, role_id, assigned_role_name, expires_at, assigned_by, is_active)
      VALUES (:user_id, :role_id, :assigned_role_name, :expires_at, :assigned_by, 1)
    `, { replacements: { user_id, role_id: role.role_id, assigned_role_name: role.user_type, expires_at: formattedExpiresAt, assigned_by: req.user.id } });

    // Invalidate user's permission cache
    const rbacService = require('../services/rbacService');
    rbacService.invalidateUserCache(user_id, school_id, req.body.branch_id);

    // Notify user of role change via notification system
    try {
      await db.sequelize.query(`
        INSERT INTO notifications (user_id, title, message, type, school_id, created_at)
        VALUES (:user_id, :title, :message, 'role_change', :school_id, NOW())
      `, { 
        replacements: { 
          user_id, 
          title: 'New Role Assigned',
          message: `You have been assigned the "${role.user_type}" role${expires_at ? ` until ${new Date(expires_at).toLocaleDateString()}` : ''}`,
          school_id 
        } 
      });
    } catch (notifError) {
      console.log('Notification creation failed:', notifError.message);
    }

    // Audit log
    await logRbacAction('assign', {
      target_user_id: user_id,
      role_name: role.user_type,
      performed_by: req.user.id,
      school_id,
      details: { expires_at }
    });

    res.json({ success: true, message: 'Role assigned successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke role from user
router.post('/revoke-role', authenticateToken, async (req, res) => {
  try {
    const { user_id, role_id, reason, school_id, branch_id } = req.body;
    
    // Deactivate the role assignment
    await db.sequelize.query(`
      UPDATE user_roles 
      SET is_active = 0, revoked_at = NOW(), revoke_reason = :reason, revoked_by = :revoked_by, updated_at = NOW()
      WHERE user_id = :user_id AND role_id = :role_id AND is_active = 1
    `, { replacements: { user_id, role_id, reason, revoked_by: req.user.id } });

    // Invalidate user's permission cache
    const rbacService = require('../services/rbacService');
    rbacService.invalidateUserCache(user_id, school_id || req.user.school_id, branch_id);

    // Notify user of role revocation via WebSocket
    const rbacWebSocket = require('../services/rbacWebSocket');
    rbacWebSocket.notifyPermissionChange(school_id || req.user.school_id, user_id, 'role_revoked', {
      role_id,
      revoked_by: req.user.name || req.user.email,
      reason
    });

    // Audit log
    await logRbacAction('revoke', {
      target_user_id: user_id,
      role_name: role_id,
      performed_by: req.user.id,
      school_id: school_id || req.user.school_id,
      details: { reason }
    });

    res.json({ success: true, message: 'Role revoked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// STAFF ROLE MANAGEMENT
// ============================================================================

// List staff role definitions
router.get('/staff-roles', authenticateToken, rbacController.listStaffRoles);

// Assign staff role
router.post('/staff/:id/role', authenticateToken, rbacController.assignStaffRole);

// ============================================================================
// SUPERADMIN FEATURE MANAGEMENT
// ============================================================================

// Get superadmin's allowed features
router.get('/superadmins/:id/features', authenticateToken, rbacController.getSuperadminFeatures);

// Update superadmin's features (developer only)
router.put('/superadmins/:id/features', authenticateToken, rbacController.grantSuperadminFeature);

// Get all available features
router.get('/all-features', authenticateToken, rbacController.getAllFeatures);

// Assign features to school (SuperAdmin)
router.post('/schools/features', authenticateToken, rbacController.assignSchoolFeatures);

// Check access to specific feature
router.get('/check-access/:featureCode', authenticateToken, async (req, res) => {
  try {
    const { school_id, user_type } = req.user;
    const { featureCode } = req.params;

    const result = await db.sequelize.query(`
      SELECT 
        f.feature_code,
        rp.can_view, rp.can_create, rp.can_edit, rp.can_delete,
        JSON_CONTAINS(sp.features, JSON_QUOTE(f.feature_code)) as has_feature
      FROM features f
      JOIN role_permissions rp ON f.id = rp.feature_id
      JOIN roles r ON rp.role_id = r.id
      JOIN school_subscriptions ss ON ss.school_id = :school_id
      JOIN subscription_packages sp ON ss.package_id = sp.id
      WHERE f.feature_code = :feature_code
        AND r.role_name = :role_name
        AND ss.is_active = TRUE
      LIMIT 1
    `, {
      replacements: { school_id, feature_code: featureCode, role_name: user_type.toLowerCase() },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: result[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SUPER ADMIN ROUTES
// ============================================================================

// Get all schools with subscriptions
router.get('/super-admin/schools-subscriptions', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'SuperAdmin' && req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Super admin or Developer only' });
    }

    const whereClause = req.user.user_type === 'SuperAdmin' 
      ? 'WHERE s.created_by = :user_id' 
      : '';

    const schools = await db.sequelize.query(`
      SELECT 
        s.school_id,
        s.school_name,
        sp.package_name,
        sp.display_name as package_display_name,
        rsp.start_date,
        rsp.end_date,
        rsp.is_active
      FROM school_setup s
      LEFT JOIN rbac_school_packages rsp ON s.school_id = rsp.school_id AND rsp.is_active = TRUE
      LEFT JOIN subscription_packages sp ON rsp.package_id = sp.id
      ${whereClause}
      ORDER BY s.school_name
    `, {
      replacements: { user_id: req.user.id },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: schools });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all packages
router.get('/super-admin/packages', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'SuperAdmin' && req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Super admin or Developer only' });
    }

    const packages = await db.sequelize.query(`
      SELECT * FROM subscription_packages WHERE is_active = TRUE ORDER BY display_name
    `, {
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all features
router.get('/super-admin/all-features', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'SuperAdmin' && req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Super admin or Developer only' });
    }

    const features = await db.sequelize.query(`
      SELECT feature_key, feature_name, category_id as category
      FROM features 
      WHERE is_active = TRUE 
      ORDER BY category_id, feature_name
    `, {
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: features });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get school feature overrides
router.get('/super-admin/school-overrides/:school_id', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'SuperAdmin' && req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Super admin or Developer only' });
    }

    const { school_id } = req.params;

    // Check if SuperAdmin created this school
    if (req.user.user_type === 'SuperAdmin') {
      const schoolCheck = await db.sequelize.query(`
        SELECT school_id FROM school_setup WHERE school_id = :school_id AND created_by = :user_id
      `, {
        replacements: { school_id, user_id: req.user.id },
        type: db.sequelize.QueryTypes.SELECT
      });

      if (schoolCheck.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied to this school' });
      }
    }

    const result = await db.sequelize.query(`
      SELECT features_override FROM rbac_school_packages 
      WHERE school_id = :school_id AND is_active = TRUE
      LIMIT 1
    `, {
      replacements: { school_id },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: result[0]?.features_override || {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign package to school
router.post('/super-admin/assign-package', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'SuperAdmin' && req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Super admin or Developer only' });
    }

    const { school_id, package_id, start_date, end_date } = req.body;

    // Check if SuperAdmin created this school
    if (req.user.user_type === 'SuperAdmin') {
      const schoolCheck = await db.sequelize.query(`
        SELECT school_id FROM school_setup WHERE school_id = :school_id AND created_by = :user_id
      `, {
        replacements: { school_id, user_id: req.user.id },
        type: db.sequelize.QueryTypes.SELECT
      });

      if (schoolCheck.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied to this school' });
      }
    }

    await db.sequelize.query(`
      INSERT INTO rbac_school_packages (school_id, package_id, start_date, end_date, is_active, created_by)
      VALUES (:school_id, :package_id, :start_date, :end_date, TRUE, :created_by)
      ON DUPLICATE KEY UPDATE 
        package_id = :package_id, 
        end_date = :end_date, 
        updated_by = :created_by,
        updated_at = NOW()
    `, {
      replacements: { school_id, package_id, start_date, end_date, created_by: req.user.id }
    });

    res.json({ success: true, message: 'Package assigned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle feature for school
router.post('/super-admin/toggle-feature', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'SuperAdmin' && req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Super admin or Developer only' });
    }

    const { school_id, feature_code, enabled } = req.body;

    // Check if SuperAdmin created this school
    if (req.user.user_type === 'SuperAdmin') {
      const schoolCheck = await db.sequelize.query(`
        SELECT school_id FROM school_setup WHERE school_id = :school_id AND created_by = :user_id
      `, {
        replacements: { school_id, user_id: req.user.id },
        type: db.sequelize.QueryTypes.SELECT
      });

      if (schoolCheck.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied to this school' });
      }
    }

    await db.sequelize.query(`
      UPDATE rbac_school_packages 
      SET features_override = JSON_SET(
        COALESCE(features_override, '{}'),
        '$.${feature_code}',
        :enabled
      ),
      updated_by = :updated_by,
      updated_at = NOW()
      WHERE school_id = :school_id AND is_active = TRUE
    `, {
      replacements: { school_id, enabled, updated_by: req.user.id }
    });

    res.json({ success: true, message: 'Feature toggled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DEVELOPER ROUTES (Manage Super Admins)
// ============================================================================

// Get all super admins
router.get('/developer/super-admins', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Developer access only' });
    }

    const superAdmins = await db.sequelize.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.allowed_features,
        u.status
      FROM users u
      WHERE u.user_type = 'SuperAdmin'
      ORDER BY u.name
    `, {
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: superAdmins });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update super admin permissions
router.post('/developer/update-superadmin-permissions', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Developer access only' });
    }

    const { superadmin_id, allowed_features } = req.body;

    await db.sequelize.query(`
      UPDATE users 
      SET allowed_features = :allowed_features,
          updatedAt = NOW()
      WHERE id = :superadmin_id AND user_type = 'SuperAdmin'
    `, {
      replacements: { 
        superadmin_id, 
        allowed_features: JSON.stringify(allowed_features) 
      }
    });

    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// TIME-BASED PERMISSIONS
// ============================================================================

// Set time-based access for a menu item
router.post('/time-based-access', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, user_type, valid_from, valid_until, school_id } = req.body;
    await db.sequelize.query(`
      INSERT INTO rbac_menu_access (menu_item_id, user_type, valid_from, valid_until, school_id)
      VALUES (:menu_item_id, :user_type, :valid_from, :valid_until, :school_id)
      ON DUPLICATE KEY UPDATE valid_from = :valid_from, valid_until = :valid_until
    `, { replacements: { menu_item_id, user_type, valid_from, valid_until, school_id } });
    res.json({ success: true, message: 'Time-based access set' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get time-based permissions
router.get('/time-based-access', authenticateToken, async (req, res) => {
  try {
    const { school_id } = req.query;
    const [rows] = await db.sequelize.query(`
      SELECT a.*, m.label as menu_label 
      FROM rbac_menu_access a
      JOIN rbac_menu_items m ON a.menu_item_id = m.id
      WHERE (a.valid_from IS NOT NULL OR a.valid_until IS NOT NULL)
      ${school_id ? 'AND (a.school_id = :school_id OR a.school_id IS NULL)' : ''}
      ORDER BY a.valid_until
    `, { replacements: { school_id } });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check subscription status
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const school_id = req.query.school_id || req.user.school_id;
    
    // Check if school is in onboarding mode
    const [schoolSetup] = await db.sequelize.query(`
      SELECT is_onboarding FROM school_setup WHERE school_id = :school_id LIMIT 1
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });
    
    // Get subscription info
    const [subscription] = await db.sequelize.query(`
      SELECT rsp.*, sp.package_name, sp.display_name, sp.price_monthly, sp.features,
        DATEDIFF(rsp.end_date, CURDATE()) as days_remaining,
        CASE WHEN rsp.end_date < CURDATE() THEN 'expired'
             WHEN rsp.end_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'expiring_soon'
             ELSE 'active' END as status
      FROM rbac_school_packages rsp
      JOIN subscription_packages sp ON rsp.package_id = sp.id
      WHERE rsp.school_id = :school_id AND rsp.is_active = 1
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });

    // If onboarding and no active subscription, provide trial standard plan
    const isOnboarding = schoolSetup?.is_onboarding == 1;
    let effectiveSubscription = subscription;
    let isTrial = false;
    
    if (isOnboarding && (!subscription || subscription.status === 'expired')) {
      isTrial = true;
      effectiveSubscription = {
        package_name: 'standard',
        display_name: 'Standard (Trial)',
        status: 'active',
        days_remaining: 30,
        is_trial: true
      };
    }

    // Get student count for pricing
    const [studentCount] = await db.sequelize.query(`
      SELECT COUNT(*) as count FROM students WHERE school_id = :school_id AND status = 'Active'
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });

    // Get all packages for comparison
    const packages = await db.sequelize.query(`
      SELECT id, package_name, display_name, package_description, features, price_monthly
      FROM subscription_packages WHERE is_active = 1 ORDER BY price_monthly DESC
    `, { type: db.Sequelize.QueryTypes.SELECT });

    res.json({ 
      success: true, 
      data: {
        subscription: effectiveSubscription || null,
        student_count: studentCount?.count || 0,
        packages,
        is_expired: isTrial ? false : (subscription ? subscription.status === 'expired' : true),
        is_expiring_soon: subscription?.status === 'expiring_soon',
        is_trial: isTrial,
        is_onboarding: isOnboarding
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get school-scoped menu items (only items available to school's package)
router.get('/school-menu-items', authenticateToken, async (req, res) => {
  try {
    const school_id = req.query.school_id || req.user.school_id;
    
    if (!school_id) {
      return res.status(400).json({ success: false, error: 'School ID required' });
    }

    const userType = req.user.user_type?.toLowerCase();
    const isSystemUser = userType === 'developer' || userType === 'superadmin';

    // Get school's package
    const [schoolPkg] = await db.sequelize.query(`
      SELECT package_id FROM rbac_school_packages 
      WHERE school_id = :school_id AND is_active = 1 LIMIT 1
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });

    const packageId = schoolPkg?.package_id || 4;

    // Get menu items, excluding system-only items for non-system users and respecting package restrictions
    let query = `
      SELECT DISTINCT m.id, m.label, m.icon, m.link, m.parent_id
      FROM rbac_menu_items m
      LEFT JOIN rbac_menu_packages p ON m.id = p.menu_item_id
      WHERE m.is_active = 1
      AND (p.package_id IS NULL OR :package_id >= p.package_id)`;
    
    if (!isSystemUser) {
      // Exclude items that ONLY have developer/superadmin access
      query += ` AND m.id NOT IN (
        SELECT menu_item_id FROM rbac_menu_access 
        GROUP BY menu_item_id 
        HAVING COUNT(*) = SUM(CASE WHEN user_type IN ('developer', 'superadmin') THEN 1 ELSE 0 END)
      )`;
    }
    
    query += ` ORDER BY m.parent_id IS NULL DESC, m.sort_order`;

    const rows = await db.sequelize.query(query, { 
      replacements: { package_id: packageId }, 
      type: db.Sequelize.QueryTypes.SELECT 
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get school-scoped user types (only types relevant to school)
router.get('/school-user-types', authenticateToken, async (req, res) => {
  try {
    const school_id = req.query.school_id || req.user.school_id;
    
    if (!school_id) {
      return res.status(400).json({ success: false, error: 'School ID required' });
    }

    // Get user types that exist in this school
    const [rows] = await db.sequelize.query(`
      SELECT DISTINCT user_type as value, 
        CASE 
          WHEN user_type = 'admin' THEN 'Admin'
          WHEN user_type = 'branchadmin' THEN 'Branch Admin'
          WHEN user_type = 'teacher' THEN 'Teacher'
          WHEN user_type = 'student' THEN 'Student'
          WHEN user_type = 'parent' THEN 'Parent'
          ELSE UPPER(SUBSTRING(user_type, 1, 1)) + LOWER(SUBSTRING(user_type, 2))
        END as label
      FROM user_accounts 
      WHERE school_id = :school_id AND is_active = 1
      ORDER BY 
        CASE user_type 
          WHEN 'admin' THEN 1
          WHEN 'branchadmin' THEN 2
          WHEN 'teacher' THEN 3
          WHEN 'student' THEN 4
          WHEN 'parent' THEN 5
          ELSE 6
        END
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Set conditional access
router.post('/conditional-access', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, user_type, condition_type, condition_value, school_id } = req.body;
    await db.sequelize.query(`
      INSERT INTO rbac_conditional_access (menu_item_id, user_type, condition_type, condition_value, school_id)
      VALUES (:menu_item_id, :user_type, :condition_type, :condition_value, :school_id)
    `, { replacements: { menu_item_id, user_type, condition_type, condition_value, school_id } });
    res.json({ success: true, message: 'Conditional access set' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get conditional permissions
router.get('/conditional-access', authenticateToken, async (req, res) => {
  try {
    const { school_id } = req.query;
    const [rows] = await db.sequelize.query(`
      SELECT c.*, m.label as menu_label 
      FROM rbac_conditional_access c
      JOIN rbac_menu_items m ON c.menu_item_id = m.id
      WHERE c.is_active = 1 ${school_id ? 'AND c.school_id = :school_id' : ''}
      ORDER BY c.condition_type, c.condition_value
    `, { replacements: { school_id } });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Log menu access for analytics
router.post('/log-access', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, session_id } = req.body;
    const { id: user_id, user_type, school_id } = req.user;
    await db.sequelize.query(`
      INSERT INTO rbac_usage_analytics (user_id, menu_item_id, school_id, user_type, session_id)
      VALUES (:user_id, :menu_item_id, :school_id, :user_type, :session_id)
    `, { replacements: { user_id, menu_item_id, school_id, user_type, session_id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get usage analytics (school-specific for school admins)
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    // School admins can only see their school's analytics
    const school_id = req.query.school_id || req.user.school_id;
    
    if (!school_id) {
      return res.status(400).json({ success: false, error: 'School ID required' });
    }

    const [rows] = await db.sequelize.query(`
      SELECT m.label, m.link, COUNT(*) as access_count,
        COUNT(DISTINCT a.user_id) as unique_users,
        DATE(a.access_time) as access_date
      FROM rbac_usage_analytics a
      JOIN rbac_menu_items m ON a.menu_item_id = m.id
      WHERE a.access_time >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
      AND a.school_id = :school_id
      GROUP BY m.id, DATE(a.access_time)
      ORDER BY access_count DESC, access_date DESC
    `, { replacements: { school_id, days } });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// WEBSOCKET INTEGRATION
// ============================================================================

const rbacWebSocket = require('../services/rbacWebSocket');

// Notify permission changes via WebSocket
const notifyPermissionChange = (schoolId, userId, changeType, data) => {
  rbacWebSocket.notifyPermissionChange(schoolId, userId, changeType, data);
};

// Enhanced time-based access with WebSocket notification
router.post('/time-based-access', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, user_type, valid_from, valid_until, school_id } = req.body;
    await db.sequelize.query(`
      INSERT INTO rbac_menu_access (menu_item_id, user_type, valid_from, valid_until, school_id)
      VALUES (:menu_item_id, :user_type, :valid_from, :valid_until, :school_id)
      ON DUPLICATE KEY UPDATE valid_from = :valid_from, valid_until = :valid_until
    `, { replacements: { menu_item_id, user_type, valid_from, valid_until, school_id } });
    
    notifyPermissionChange(school_id, null, 'time_based_updated', { menu_item_id, user_type });
    res.json({ success: true, message: 'Time-based access set' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create super admin
router.post('/developer/create-superadmin', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Developer access only' });
    }

    const { name, email, password } = req.body;
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.sequelize.query(`
      INSERT INTO users (name, email, username, password, user_type, status, school_id, createdAt, updatedAt)
      VALUES (:name, :email, :email, :password, 'SuperAdmin', 'Active', 'SCH/1', NOW(), NOW())
    `, {
      replacements: { name, email, password: hashedPassword }
    });

    res.json({ success: true, message: 'SuperAdmin created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// INDIVIDUAL MENU ITEM PERMISSIONS
// ============================================================================

// Grant specific menu item access to a user
router.post('/grant-menu-access', authenticateToken, async (req, res) => {
  try {
    const { user_id, menu_item_id, expires_at } = req.body;
    const school_id = req.body.school_id || req.user.school_id;
    
    // Only admin/branchadmin can grant access
    if (!['admin', 'branchadmin'].includes(req.user.user_type?.toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Only admins can grant menu access' });
    }

    // Check if menu item exists and is available to school's package
    const [schoolPkg] = await db.sequelize.query(`
      SELECT package_id FROM rbac_school_packages 
      WHERE school_id = :school_id AND is_active = 1 LIMIT 1
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });

    const packageId = schoolPkg?.package_id || 4;

    const [menuItem] = await db.sequelize.query(`
      SELECT m.id, m.label FROM rbac_menu_items m
      LEFT JOIN rbac_menu_packages p ON m.id = p.menu_item_id
      WHERE m.id = :menu_item_id AND m.is_active = 1
      AND (p.package_id IS NULL OR :package_id <= p.package_id)
    `, { replacements: { menu_item_id, package_id: packageId }, type: db.Sequelize.QueryTypes.SELECT });

    if (!menuItem) {
      return res.status(404).json({ success: false, error: 'Menu item not available in your subscription' });
    }

    // Grant access
    await db.sequelize.query(`
      INSERT INTO rbac_user_menu_access (user_id, menu_item_id, school_id, expires_at, granted_by, created_at)
      VALUES (:user_id, :menu_item_id, :school_id, :expires_at, :granted_by, NOW())
      ON DUPLICATE KEY UPDATE expires_at = :expires_at, updated_at = NOW()
    `, { replacements: { user_id, menu_item_id, school_id, expires_at: expires_at || null, granted_by: req.user.id } });

    // Notify user of menu access grant via WebSocket
    const rbacWebSocket = require('../services/rbacWebSocket');
    rbacWebSocket.notifyPermissionChange(school_id, user_id, 'menu_access_granted', {
      menu_item_id,
      menu_label: menuItem.label,
      granted_by: req.user.name || req.user.email,
      expires_at,
      message: `You now have access to "${menuItem.label}"${expires_at ? ` until ${new Date(expires_at).toLocaleDateString()}` : ''}`
    });

    res.json({ success: true, message: 'Menu access granted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke specific menu item access from a user
router.post('/revoke-menu-access', authenticateToken, async (req, res) => {
  try {
    const { user_id, menu_item_id } = req.body;
    const school_id = req.body.school_id || req.user.school_id;
    
    if (!['admin', 'branchadmin'].includes(req.user.user_type?.toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Only admins can revoke menu access' });
    }

    await db.sequelize.query(`
      DELETE FROM rbac_user_menu_access 
      WHERE user_id = :user_id AND menu_item_id = :menu_item_id AND school_id = :school_id
    `, { replacements: { user_id, menu_item_id, school_id } });

    res.json({ success: true, message: 'Menu access revoked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user's individual menu permissions
router.get('/user-menu-access/:user_id', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const school_id = req.query.school_id || req.user.school_id;
    
    const [access] = await db.sequelize.query(`
      SELECT uma.*, m.label, m.link, m.icon
      FROM rbac_user_menu_access uma
      JOIN rbac_menu_items m ON uma.menu_item_id = m.id
      WHERE uma.user_id = :user_id AND uma.school_id = :school_id
      AND (uma.expires_at IS NULL OR uma.expires_at > NOW())
      ORDER BY m.label
    `, { replacements: { user_id, school_id } });

    res.json({ success: true, data: access });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get active payment providers
router.get('/payment-providers', async (req, res) => {
  try {
    const providers = await db.sequelize.query(
      `SELECT id, name, code, is_active FROM payment_providers WHERE is_active = 1 ORDER BY id`,
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, data: providers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Initialize subscription payment (supports multiple providers)
router.post('/subscription/initialize-payment', authenticateToken, async (req, res) => {
  try {
    const { amount, email, school_id, package_id, package_name, terms, student_count, callback_url, payment_provider_id = 1, discount_percent = 0 } = req.body;
    
    if (!amount || !email || !school_id || !package_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Get provider
    const [provider] = await db.sequelize.query(
      `SELECT * FROM payment_providers WHERE id = :id AND is_active = 1`,
      { replacements: { id: payment_provider_id }, type: db.Sequelize.QueryTypes.SELECT }
    );
    if (!provider) {
      return res.status(400).json({ success: false, message: 'Invalid payment provider' });
    }

    // Get package price
    const [pkg] = await db.sequelize.query(
      `SELECT price_monthly FROM subscription_packages WHERE id = :id`,
      { replacements: { id: package_id }, type: db.Sequelize.QueryTypes.SELECT }
    );
    const pricePerStudent = parseFloat(pkg?.price_monthly || 0);

    // Calculate costs - use frontend amount as total (already includes any custom discount)
    const base_cost = pricePerStudent * student_count * terms;
    const addon_cost = 0;
    const subtotal = base_cost + addon_cost;
    const discount_amount = subtotal - amount; // Calculate actual discount from difference
    const total_cost = amount; // Use the amount from frontend (already discounted)

    const reference = `SUB-${school_id.replace('/', '')}-${Date.now()}`;
    const invoiceNumber = `INV-${school_id.replace('/', '')}-${Date.now()}`;
    
    // Create or get subscription
    const endDateInterval = terms === 3 ? '12 MONTH' : '4 MONTH';
    const subscriptionType = terms === 3 ? 'annually' : 'termly';
    let [subscription] = await db.sequelize.query(`
      SELECT id FROM school_subscriptions WHERE school_id = :school_id LIMIT 1
    `, { replacements: { school_id }, type: db.Sequelize.QueryTypes.SELECT });
    
    if (!subscription) {
      const [result] = await db.sequelize.query(`
        INSERT INTO school_subscriptions (school_id, pricing_plan_id, subscription_type, subscription_start_date, subscription_end_date, active_students_count, base_cost, addon_cost, discount_amount, total_cost, balance, status, created_at)
        VALUES (:school_id, :package_id, :subscription_type, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ${endDateInterval}), :student_count, :base_cost, :addon_cost, :discount_amount, :total_cost, :total_cost, 'pending', NOW())
      `, { replacements: { school_id, package_id, subscription_type: subscriptionType, student_count, base_cost, addon_cost, discount_amount, total_cost } });
      subscription = { id: result };
    }

    // Create invoice
    await db.sequelize.query(`
      INSERT INTO subscription_invoices (invoice_number, school_id, subscription_id, invoice_date, due_date, subtotal, discount, total_amount, balance, payment_status)
      VALUES (:invoice_number, :school_id, :subscription_id, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), :subtotal, :discount, :total, :total, 'unpaid')
    `, { replacements: { invoice_number: invoiceNumber, school_id, subscription_id: subscription.id, subtotal, discount: discount_amount, total: total_cost } });

    const [invoice] = await db.sequelize.query(`SELECT id FROM subscription_invoices WHERE invoice_number = :invoice_number`, 
      { replacements: { invoice_number: invoiceNumber }, type: db.Sequelize.QueryTypes.SELECT });

    let paymentResult;
    const axios = require('axios');

    // Initialize based on provider
    if (provider.code === 'paystack') {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        { email, amount: Math.round(total_cost * 100), reference, callback_url, metadata: { school_id, package_id, invoice_id: invoice.id } },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
      );
      if (!response.data.status) throw new Error('Paystack initialization failed');
      paymentResult = response.data.data;
    } else if (provider.code === 'zainpay') {
      const zainpay = require('../services/zainpayService');
      const result = await zainpay.initializePayment({ amount: total_cost, email, reference, callbackUrl: callback_url, metadata: { school_id, package_id } });
      if (!result.success) throw new Error('Zainpay initialization failed');
      paymentResult = result;
    } else if (provider.code === 'flutterwave') {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        { tx_ref: reference, amount: total_cost, currency: 'NGN', redirect_url: callback_url, customer: { email }, meta: { school_id, package_id } },
        { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' } }
      );
      if (response.data.status !== 'success') throw new Error('Flutterwave initialization failed');
      paymentResult = { authorization_url: response.data.data.link, reference };
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported payment provider' });
    }

    // Store pending payment
    await db.sequelize.query(`
      INSERT INTO subscription_payments (subscription_id, invoice_id, payment_date, amount_paid, payment_method, gateway_reference, payment_status, school_id, payment_provider_id)
      VALUES (:subscription_id, :invoice_id, CURDATE(), :amount, :provider_code, :reference, 'pending', :school_id, :provider_id)
    `, { replacements: { subscription_id: subscription.id, invoice_id: invoice.id, amount: total_cost, reference, school_id, provider_code: provider.code, provider_id: provider.id } });

    res.json({ success: true, data: paymentResult });
  } catch (err) {
    console.error('Payment init error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

// Clear all RBAC menu cache
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    const { menuCache } = require('../utils/menuCache');
    const { school_id } = req.query;
    
    if (school_id) {
      await menuCache.invalidateSchool(school_id);
      res.json({ success: true, message: `Cache cleared for ${school_id}` });
    } else {
      await menuCache.invalidateAll();
      res.json({ success: true, message: 'All cache cleared' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
