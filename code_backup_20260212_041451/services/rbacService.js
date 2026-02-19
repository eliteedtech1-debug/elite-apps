const db = require('../models');
const { Op } = require('sequelize');
const { getFallbackPermissions } = require('./fallbackPermissions');

const CACHE_TTL = 300; // 5 minutes
const permissionCache = new Map();

const getCacheKey = (userId, schoolId, branchId) => `${userId}:${schoolId}:${branchId || 'all'}`;

const invalidateUserCache = (userId, schoolId, branchId = null) => {
  if (branchId) {
    // Invalidate specific branch cache
    const cacheKey = getCacheKey(userId, schoolId, branchId);
    permissionCache.delete(cacheKey);
  } else {
    // Invalidate all branch caches for this user/school
    const prefix = `${userId}:${schoolId}:`;
    for (const key of permissionCache.keys()) {
      if (key.startsWith(prefix)) {
        permissionCache.delete(key);
      }
    }
  }
};

const getEffectivePermissions = async (userId, schoolId, branchId, userType, admissionNo = null) => {
  const cacheKey = getCacheKey(userId, schoolId, branchId);
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  let permissions = {};

  try {
    // Determine the actual user identifier based on user type
    let actualUserId = userId;
    
    if (userType?.toLowerCase() === 'teacher') {
      // For teachers, get the teacher record to find the actual user_id
      const teacherRecord = await db.sequelize.query(
        `SELECT user_id FROM teachers WHERE user_id = :user_id LIMIT 1`,
        {
          replacements: { user_id: userId },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );
      actualUserId = teacherRecord.length > 0 ? teacherRecord[0].user_id : userId;
    } else if (userType?.toLowerCase() === 'student') {
      // For students, use admission_no as identifier
      actualUserId = admissionNo || userId;
    }
    // For admin, branchadmin, superadmin, developer - use userId directly

    // 1. Get user's roles
    const userRoles = await db.UserRole.findAll({
      where: {
        user_id: actualUserId,
        school_id: schoolId,
        is_active: true,
        [Op.or]: [
          { branch_id: branchId },
          { branch_id: null }
        ],
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } }
        ]
      },
      include: [{ model: db.Role, as: 'role' }]
    });

    const roleIds = userRoles.map(ur => ur.role_id);

    // 2. Get role permissions
    if (roleIds.length > 0) {
      const rolePerms = await db.RolePermission.findAll({
        where: { role_id: { [Op.in]: roleIds } },
        include: [{ model: db.Feature, as: 'feature', where: { is_active: true } }]
      });

      rolePerms.forEach(rp => {
        const key = rp.feature.feature_key;
        if (!permissions[key]) {
          permissions[key] = { view: false, create: false, edit: false, delete: false, export: false, approve: false };
        }
        if (rp.can_view) permissions[key].view = true;
        if (rp.can_create) permissions[key].create = true;
        if (rp.can_edit) permissions[key].edit = true;
        if (rp.can_delete) permissions[key].delete = true;
        if (rp.can_export) permissions[key].export = true;
        if (rp.can_approve) permissions[key].approve = true;
      });
    }

    // 3. If no RBAC permissions found, use fallback permissions
    if (Object.keys(permissions).length === 0) {
      console.log(`🔄 No RBAC permissions found for user ${userId}, using fallback permissions`);
      permissions = await getFallbackPermissions(userType, schoolId);
    }

  } catch (error) {
    console.error('Error getting RBAC permissions:', error);
    // On error, always use fallback permissions
    console.log(`⚠️ RBAC error for user ${userId}, using fallback permissions`);
    permissions = await getFallbackPermissions(userType, schoolId);
  }

  // Cache the result
  permissionCache.set(cacheKey, {
    data: permissions,
    expires: Date.now() + (CACHE_TTL * 1000)
  });

  return permissions;
};

const checkPermission = async (userId, schoolId, branchId, featureKey, action = 'view') => {
  const perms = await getEffectivePermissions(userId, schoolId, branchId);
  return perms.features[featureKey]?.[action] === true;
};

const getUserMenu = async (userId, schoolId, branchId, userType) => {
  const perms = await getEffectivePermissions(userId, schoolId, branchId);
  const allowedFeatureKeys = Object.keys(perms.features).filter(k => perms.features[k].view);

  const features = await db.Feature.findAll({
    where: {
      feature_key: { [Op.in]: allowedFeatureKeys },
      is_active: true,
      is_menu_item: true
    },
    include: [{ model: db.FeatureCategory, as: 'category' }],
    order: [['display_order', 'ASC']]
  });

  // Filter by user type
  const filtered = features.filter(f => {
    if (!f.required_user_types) return true;
    const types = Array.isArray(f.required_user_types) ? f.required_user_types : JSON.parse(f.required_user_types || '[]');
    return types.length === 0 || types.includes(userType?.toLowerCase());
  });

  // Group by category
  const menu = {};
  filtered.forEach(f => {
    const catName = f.category?.category_name || 'Other';
    if (!menu[catName]) {
      menu[catName] = { name: catName, icon: f.category?.icon, items: [] };
    }
    menu[catName].items.push({
      key: f.feature_key,
      label: f.menu_label || f.feature_name,
      icon: f.menu_icon,
      route: f.route_path,
      permissions: perms.features[f.feature_key]
    });
  });

  return Object.values(menu);
};

const invalidateSchoolCache = (schoolId) => {
  const keysToDelete = [];
  for (const key of permissionCache.keys()) {
    if (key.includes(`:${schoolId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => permissionCache.delete(key));
  console.log(`🗑️ Cleared ${keysToDelete.length} permission cache entries for school ${schoolId}`);
};

const invalidateCache = (userId, schoolId, branchId) => {
  const cacheKey = getCacheKey(userId, schoolId, branchId);
  permissionCache.delete(cacheKey);
  permissionCache.delete(getCacheKey(userId, schoolId, null));
};

const getSuperadminAllowedFeatures = async (superadminUserId) => {
  try {
    const features = await db.sequelize.query(
      `SELECT 
        sf.feature_key,
        sf.can_enable,
        sf.max_tier,
        f.feature_name,
        f.description
      FROM superadmin_features sf
      JOIN features f ON sf.feature_key = f.feature_key
      WHERE sf.superadmin_id = :superadmin_id 
      AND sf.can_enable = true
      AND f.is_active = true
      ORDER BY f.display_order`,
      {
        replacements: { superadmin_id: superadminUserId },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    return features;
  } catch (error) {
    console.error('Error getting superadmin allowed features:', error);
    return [];
  }
};

const getSuperadminAllowedComponents = async (superadminId, featureKey) => {
  try {
    const components = await db.sequelize.query(
      `SELECT 
        sfc.component_key,
        sfc.can_enable,
        fc.component_name,
        fc.component_description,
        fc.required_tier
      FROM superadmin_feature_components sfc
      JOIN feature_components fc ON sfc.feature_key = fc.feature_key 
        AND sfc.component_key = fc.component_key
      WHERE sfc.superadmin_id = :superadmin_id 
      AND sfc.feature_key = :feature_key
      AND sfc.can_enable = true
      AND fc.is_active = true`,
      {
        replacements: { 
          superadmin_id: superadminId,
          feature_key: featureKey 
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    return components;
  } catch (error) {
    console.error('Error getting superadmin allowed components:', error);
    return [];
  }
};

const grantSuperadminFeature = async (superadminId, featureKey, maxTier, developerId) => {
  try {
    await db.sequelize.query(
      `INSERT INTO superadmin_features (superadmin_id, feature_key, max_tier, created_by)
       VALUES (:superadmin_id, :feature_key, :max_tier, :developer_id)
       ON DUPLICATE KEY UPDATE 
       max_tier = :max_tier, 
       can_enable = true,
       updated_at = NOW()`,
      {
        replacements: {
          superadmin_id: superadminId,
          feature_key: featureKey,
          max_tier: maxTier,
          developer_id: developerId
        },
        type: db.Sequelize.QueryTypes.INSERT,
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error granting superadmin feature:', error);
    throw error;
  }
};

const grantSuperadminComponent = async (superadminId, featureKey, componentKey, developerId) => {
  try {
    await db.sequelize.query(
      `INSERT INTO superadmin_feature_components (superadmin_id, feature_key, component_key, created_by)
       VALUES (:superadmin_id, :feature_key, :component_key, :developer_id)
       ON DUPLICATE KEY UPDATE 
       can_enable = true`,
      {
        replacements: {
          superadmin_id: superadminId,
          feature_key: featureKey,
          component_key: componentKey,
          developer_id: developerId
        },
        type: db.Sequelize.QueryTypes.INSERT,
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error granting superadmin component:', error);
    throw error;
  }
};

const assignRoleToUser = async (userId, roleId, schoolId, branchId, assignedBy) => {
  const [userRole, created] = await db.UserRole.findOrCreate({
    where: { user_id: userId, role_id: roleId, school_id: schoolId, branch_id: branchId },
    defaults: { assigned_by: assignedBy, is_active: true }
  });
  if (!created && !userRole.is_active) {
    await userRole.update({ is_active: true, assigned_by: assignedBy, revoked_at: null, revoked_by: null });
  }
  invalidateCache(userId, schoolId, branchId);
  return userRole;
};

const revokeRoleFromUser = async (userId, roleId, schoolId, branchId, revokedBy, reason) => {
  const userRole = await db.UserRole.findOne({
    where: { user_id: userId, role_id: roleId, school_id: schoolId, is_active: true }
  });
  if (userRole) {
    await userRole.update({ is_active: false, revoked_by: revokedBy, revoked_at: new Date(), revoke_reason: reason });
    invalidateCache(userId, schoolId, branchId);
  }
  return userRole;
};

const assignStaffRole = async (staffId, roleCode, schoolId) => {
  // Check if this is a teacher (staff) record
  const teacher = await db.sequelize.query(
    `SELECT * FROM teachers WHERE id = :staff_id OR user_id = :staff_id LIMIT 1`,
    {
      replacements: { staff_id: staffId },
      type: db.Sequelize.QueryTypes.SELECT,
    }
  );
  
  if (teacher.length === 0) {
    throw new Error('Staff/Teacher not found');
  }
  
  const teacherRecord = teacher[0];
  
  // Update the teacher's staff_role
  await db.sequelize.query(
    `UPDATE teachers SET staff_role = :role_code WHERE id = :teacher_id`,
    {
      replacements: { 
        role_code: roleCode,
        teacher_id: teacherRecord.id 
      },
      type: db.Sequelize.QueryTypes.UPDATE,
    }
  );
  
  // Invalidate cache for the user
  if (teacherRecord.user_id) {
    invalidateCache(teacherRecord.user_id, schoolId, teacherRecord.branch_id);
  }
  
  return { ...teacherRecord, staff_role: roleCode };
};

module.exports = {
  getEffectivePermissions,
  checkPermission,
  getUserMenu,
  invalidateCache,
  invalidateUserCache,
  invalidateSchoolCache,
  getSuperadminAllowedFeatures,
  getSuperadminAllowedComponents,
  grantSuperadminFeature,
  grantSuperadminComponent,
  assignRoleToUser,
  revokeRoleFromUser,
  assignStaffRole
};
