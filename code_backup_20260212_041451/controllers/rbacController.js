const rbacService = require('../services/rbacService');
const db = require('../models');
const { menuCache } = require('../utils/menuCache');

const getUserPermissions = async (req, res) => {
  try {
    const { id: userId, school_id: schoolId, branch_id: branchId, user_type: userType, admission_no: admissionNo } = req.user;
    const perms = await rbacService.getEffectivePermissions(userId, schoolId, branchId, userType, admissionNo);
    res.json({ success: true, data: { features: perms } });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get permissions' });
  }
};

const getUserMenu = async (req, res) => {
  try {
    let schoolId = req.query.school_id || req.user?.school_id;
    // Normalize school_id to SCH/X format if numeric
    if (schoolId && !String(schoolId).startsWith('SCH/')) {
      schoolId = `SCH/${schoolId}`;
    }
    
    // Check if admin is accessing another user's menu
    const targetUserId = req.query.target_user_id;
    let effectiveUser = req.user;
    
    if (targetUserId && ['admin', 'branchadmin'].includes(req.user?.user_type?.toLowerCase())) {
      // Admin is accessing another user's menu
      const targetUser = await db.User.findByPk(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Target user not found' });
      }
      
      // Use target user's context
      effectiveUser = {
        id: parseInt(targetUserId),
        user_type: targetUser.user_type,
        school_id: schoolId,
        branch_id: targetUser.branch_id
      };
    }
    
    const baseUserType = (req.headers['x-user-type'] || effectiveUser?.user_type)?.toLowerCase();
    const branchId = req.headers['x-branch-id'] || effectiveUser?.branch_id;
    const compact = req.query.compact === 'true';
    
    // Normalize user type to lowercase for consistent comparison
    const normalizedBaseUserType = baseUserType?.toLowerCase();
    
    // Developer operations are school-independent
    const isDeveloper = normalizedBaseUserType === 'developer';
    const isSystemUser = normalizedBaseUserType === 'developer' || normalizedBaseUserType === 'superadmin';
    const effectiveSchoolId = isDeveloper ? null : schoolId;
    
    // Get user's assigned roles to determine effective user type and all roles
    // For multi-school users, include ALL active roles regardless of school assignment
    const userRoles = await db.sequelize.query(
      `SELECT DISTINCT r.user_type FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = ? AND ur.is_active = 1
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       ORDER BY CASE LOWER(r.user_type) 
         WHEN 'developer' THEN 1 
         WHEN 'superadmin' THEN 2 
         WHEN 'admin' THEN 3 
         WHEN 'branchadmin' THEN 4 
         ELSE 5 END`,
      { replacements: [effectiveUser?.id], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Use highest privilege role for response, but include ALL roles for menu access
    const effectiveUserType = userRoles.length > 0 ? userRoles[0].user_type.toLowerCase() : normalizedBaseUserType;
    const allUserRoles = userRoles.length > 0 ? userRoles.map(r => r.user_type.toLowerCase()) : [normalizedBaseUserType];
    
    console.log('RBAC Menu Debug:', { 
      schoolId, 
      baseUserType, 
      effectiveUserType, 
      allUserRoles,
      branchId, 
      compact 
    });

    // Check cache first (only for non-compact requests)
    if (!compact) {
      const cached = await menuCache.get(schoolId, effectiveUserType);
      if (cached) return res.json(cached);
    }

    // Check school status
    const [schoolSetup] = await db.sequelize.query(
      `SELECT is_onboarding FROM school_setup WHERE school_id = ? LIMIT 1`,
      { replacements: [schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    const isOnboarding = schoolSetup?.is_onboarding == 1;
    
    // Check for invoices (paid or pending) - use invoice's plan for pending invoices
    const [invoice] = await db.sequelize.query(
      `SELECT i.id, i.payment_status, i.invoice_status, ss.pricing_plan_id
       FROM subscription_invoices i
       JOIN school_subscriptions ss ON i.subscription_id = ss.id
       WHERE i.school_id = ? 
         AND (i.invoice_status IS NULL OR i.invoice_status IN ('published', 'sent') OR i.payment_status IN ('paid', 'pending'))
       ORDER BY i.created_at DESC LIMIT 1`,
      { replacements: [schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    const hasPaidInvoice = invoice?.payment_status === 'paid';
    const hasPendingInvoice = invoice && invoice.payment_status === 'pending';
    const hasUnpaidOrRejectedInvoice = invoice && ['unpaid', 'rejected'].includes(invoice.payment_status);
    
    // Pending invoices are allowed to access custom items (same as paid)
    const canAccessCustomItems = hasPaidInvoice || hasPendingInvoice || !hasUnpaidOrRejectedInvoice;
    
    // Get the actual subscription package from school_subscriptions (source of truth)
    const latestSubscription = await db.sequelize.query(
      `SELECT ss.pricing_plan_id, sp.pricing_name, ss.status as subscription_status
       FROM school_subscriptions ss
       JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
       WHERE ss.school_id = ?
       ORDER BY ss.created_at DESC LIMIT 1`,
      { replacements: [schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Get package from rbac_school_packages (used as cache/fallback)
    const schoolPackage = await db.sequelize.query(
      `SELECT sp.id as package_id, sp.package_name FROM rbac_school_packages rsp
       JOIN subscription_packages sp ON rsp.package_id = sp.id
       WHERE rsp.school_id = ? AND rsp.is_active = 1 LIMIT 1`,
      { replacements: [schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Determine package and label
    // Priority: 1) Paid/Pending invoice plan, 2) school_subscriptions (source of truth), 3) rbac_school_packages (cache), 4) onboarding trial, 5) starter
    let schoolPkgId = 1;
    let packageName = 'starter';
    let packageLabel = 'Starter';
    
    // Helper function to lookup package_id from pricing_plan_id
    const lookupPackageFromPricing = async (pricing_plan_id) => {
      const result = await db.sequelize.query(
        `SELECT pkg.id as package_id, pkg.package_name
         FROM subscription_pricing sp
         JOIN subscription_packages pkg ON LOWER(REPLACE(sp.pricing_name, ' Plan', '')) = LOWER(pkg.package_name)
         WHERE sp.id = ? AND pkg.is_active = 1
         LIMIT 1`,
        { replacements: [pricing_plan_id], type: db.Sequelize.QueryTypes.SELECT }
      );
      return result && result.length > 0 ? result[0] : null;
    };
    
    // Priority 1: Paid/Pending invoice plan (invoice is authoritative when paid/pending)
    if (invoice && invoice.pricing_plan_id && (hasPaidInvoice || hasPendingInvoice)) {
      const packageFromInvoice = await lookupPackageFromPricing(invoice.pricing_plan_id);
      if (packageFromInvoice) {
        schoolPkgId = packageFromInvoice.package_id;
        packageName = packageFromInvoice.package_name;
        packageLabel = hasPendingInvoice 
          ? `${packageName.charAt(0).toUpperCase() + packageName.slice(1)} (pending)`
          : packageName.charAt(0).toUpperCase() + packageName.slice(1);
      }
    }
    // Priority 2: school_subscriptions (source of truth) - use actual subscription
    else if (latestSubscription && latestSubscription[0] && latestSubscription[0].pricing_plan_id) {
      const packageFromSub = await lookupPackageFromPricing(latestSubscription[0].pricing_plan_id);
      if (packageFromSub) {
        schoolPkgId = packageFromSub.package_id;
        packageName = packageFromSub.package_name;
        packageLabel = packageName.charAt(0).toUpperCase() + packageName.slice(1);
      }
    }
    // Priority 3: rbac_school_packages (used as cache/fallback)
    else if (schoolPackage[0] && schoolPackage[0].package_id) {
      schoolPkgId = schoolPackage[0].package_id;
      packageName = schoolPackage[0].package_name;
      packageLabel = packageName.charAt(0).toUpperCase() + packageName.slice(1);
    }
    // Priority 4: Onboarding trial
    else if (isOnboarding) {
      schoolPkgId = 2;
      packageName = 'standard';
      packageLabel = 'Standard (trial)';
    }
    // Priority 5: Default to starter
    // (already set above)
    
    // SECURITY: Unpaid/rejected invoices override everything (except onboarding)
    if (hasUnpaidOrRejectedInvoice && !isOnboarding) {
      schoolPkgId = 1;
      packageName = 'starter';
      packageLabel = 'Starter';
    }
    
    // SECURITY: Cap at starter if no valid package found
    if (!schoolPkgId || schoolPkgId < 1 || schoolPkgId > 4) {
      schoolPkgId = 1;
      packageName = 'starter';
      packageLabel = 'Starter';
    }
    
    console.log('RBAC Package Debug:', { 
      schoolId, 
      schoolPkgId, 
      packageLabel,
      packageName,
      isOnboarding, 
      hasPaidInvoice, 
      hasPendingInvoice,
      hasUnpaidOrRejectedInvoice,
      subscriptionPricingPlanId: latestSubscription[0]?.pricing_plan_id,
      subscriptionStatus: latestSubscription[0]?.subscription_status,
      rbacPackageFromDB: schoolPackage[0]?.package_id,
      rbacPackageNameFromDB: schoolPackage[0]?.package_name,
      invoicePlanId: invoice?.pricing_plan_id,
      invoiceStatus: invoice?.payment_status,
      invoiceInvoiceStatus: invoice?.invoice_status,
      packageSource: invoice && invoice.pricing_plan_id && (hasPaidInvoice || hasPendingInvoice) 
        ? 'invoice' 
        : latestSubscription && latestSubscription[0] && latestSubscription[0].pricing_plan_id
        ? 'subscription'
        : schoolPackage[0]
        ? 'rbac_cache'
        : isOnboarding
        ? 'onboarding_trial'
        : 'default_starter'
    });

    // FIXED: Enhanced role inheritance with comprehensive logging
    console.log('🔍 RBAC Debug - Starting role inheritance resolution for user:', effectiveUser?.id);
    
    // Get inherited roles for all user roles (not just effective one)
    const allRolesWithInheritance = [...allUserRoles];
    
    for (const role of allUserRoles) {
      console.log(`🔍 RBAC Debug - Checking inheritance for role: ${role}`);
      const inheritedRoles = await db.sequelize.query(
        `SELECT parent_role FROM role_inheritance WHERE child_role = ?`,
        { replacements: [role], type: db.Sequelize.QueryTypes.SELECT }
      );
      
      if (inheritedRoles.length > 0) {
        const parentRoles = inheritedRoles.map(r => r.parent_role);
        console.log(`🔍 RBAC Debug - Role ${role} inherits from:`, parentRoles);
        allRolesWithInheritance.push(...parentRoles);
      }
    }
    
    // Remove duplicates and ensure we have at least the effective user type
    const allRoles = allUserRoles.length > 0 ? 
      [...new Set(allRolesWithInheritance)] : 
      [effectiveUserType];

    console.log('🔍 RBAC Debug - Final role aggregation:', {
      originalRoles: allUserRoles,
      withInheritance: allRolesWithInheritance,
      finalUniqueRoles: allRoles,
      roleCount: allRoles.length
    });

    // Check subscription expiry
    const subscription = await db.sequelize.query(
      `SELECT end_date FROM rbac_school_packages WHERE school_id = ? AND is_active = 1 LIMIT 1`,
      { replacements: [schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    const isExpired = subscription[0]?.end_date && new Date(subscription[0].end_date) < new Date();

    // Package hierarchy: elite(4) > premium(3) > standard(2) > starter(1)
    // Package IDs: 1=starter, 2=standard, 3=premium, 4=elite
    // Time-based: check valid_from/valid_until, school-specific overrides
    // If subscription expired, only show starter tier items (package_id = 1)
    // SECURITY: Developers and superadmins bypass package restrictions (system-level access)
    let effectivePkgId = isExpired ? 1 : schoolPkgId;
    
    // Determine if custom sidebar items (school menu access) should be shown
    // Rule: Show custom items if:
    //   - Invoice is paid OR pending (allowed), OR
    //   - Invoice is NOT unpaid/rejected, OR
    //   - School is on onboarding (exception)
    //   - User is developer/superadmin (system-level access)
    // Note: Pending invoices are allowed to continue accessing custom items
    const canShowCustomItems = canAccessCustomItems || isOnboarding || isSystemUser;
    
    // If invoice is unpaid/rejected and NOT onboarding, restrict to starter plan only (package_id = 1)
    // BUT: Developers and superadmins bypass this restriction
    if (hasUnpaidOrRejectedInvoice && !isOnboarding && !isSystemUser) {
      effectivePkgId = 1; // Force starter plan only
    }
    
    // For system users (developers/superadmins), set a high package_id to see all items
    if (isSystemUser) {
      effectivePkgId = 4; // Elite level access for system users
    }
    
    console.log('🔍 RBAC Debug - Package and access determination:', { 
      schoolId, 
      schoolPkgId,
      effectivePkgId,
      packageLabel,
      hasUnpaidOrRejectedInvoice, 
      isOnboarding, 
      canShowCustomItems,
      isSystemUser
    });
    
    // FIXED: Enhanced menu query with comprehensive debugging
    console.log('🔍 RBAC Debug - Building menu query for roles:', allRoles);
    
    // Build IN clause with correct number of placeholders for allRoles
    const rolePlaceholders = allRoles.map(() => '?').join(',');
    
    console.log('🔍 RBAC Debug - Query setup:', {
      allRoles,
      rolePlaceholdersCount: allRoles.length,
      schoolId,
      effectiveUserType,
      effectivePkgId
    });
    let itemsQuery = `
      SELECT DISTINCT m.id, m.parent_id, m.label, m.icon, m.link, m.sort_order
      FROM rbac_menu_items m
      JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
      LEFT JOIN rbac_menu_packages rmp ON m.id = rmp.menu_item_id
      WHERE m.is_active = 1 
      AND ma.user_type IN (${rolePlaceholders})
      AND ma.access_type IN ('default', 'additional')
      AND (ma.valid_from IS NULL OR ma.valid_from <= CURDATE())
      AND (ma.valid_until IS NULL OR ma.valid_until >= CURDATE())
      AND (ma.school_id IS NULL OR ma.school_id = ?)
      AND (
        m.restricted_user_types IS NULL 
        OR NOT JSON_CONTAINS(m.restricted_user_types, JSON_QUOTE(?))
      )
      AND (
        rmp.package_id IS NULL 
        OR ? >= rmp.package_id
      )
      ORDER BY m.sort_order
    `;
    
    // Build replacements array: [...allRoles, schoolId, effectiveUserType, effectivePkgId]
    const replacements = [...allRoles, schoolId, effectiveUserType, effectivePkgId];
    
    // Execute the query with enhanced debugging
    const items = await db.sequelize.query(
      itemsQuery,
      { replacements, type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Debug logging specifically for SCH/23
    if (schoolId === 'SCH/23') {
      console.log('🔍 DEBUG SCH/23 - Query parameters:', {
        allRoles,
        schoolId,
        effectiveUserType,
        effectivePkgId,
        canShowCustomItems,
        hasUnpaidOrRejectedInvoice,
        isOnboarding,
        isSystemUser
      });
      console.log('🔍 DEBUG SCH/23 - Query:', itemsQuery);
      console.log('🔍 DEBUG SCH/23 - Replacements:', replacements);
    }
    
    console.log('🔍 RBAC Debug - Query results:', {
      totalItemsFound: items.length,
      expectedMinimum: 124, // Based on our analysis for user 1212
      querySuccess: items.length > 0,
      sampleItems: items.slice(0, 3).map(i => ({ id: i.id, label: i.label, parent_id: i.parent_id })),
      allRolesUsed: allRoles,
      replacementsCount: replacements.length
    });
    
    // Apply school feature overrides (add/remove features)
    let filteredItems = [...items];
    
    if (!isSystemUser && schoolId) {
      try {
        const [schoolOverrides] = await db.sequelize.query(
          `SELECT features_override FROM rbac_school_packages WHERE school_id = ? AND is_active = 1 LIMIT 1`,
          { replacements: [schoolId], type: db.Sequelize.QueryTypes.SELECT }
        );
        
        if (schoolOverrides?.features_override) {
          const overrides = typeof schoolOverrides.features_override === 'string' 
            ? JSON.parse(schoolOverrides.features_override) 
            : schoolOverrides.features_override;
          
          const { add = [], remove = [] } = overrides;
          
          // Remove disabled features
          if (remove.length > 0) {
            filteredItems = filteredItems.filter(item => !remove.includes(item.id));
            console.log('RBAC Feature Override - Removed items:', remove);
          }
          
          // Add extra features (if they exist in the database but weren't included by package restrictions)
          if (add.length > 0) {
            const addPlaceholders = add.map(() => '?').join(',');
            const extraItems = await db.sequelize.query(
              `SELECT DISTINCT m.id, m.parent_id, m.label, m.icon, m.link, m.sort_order
               FROM rbac_menu_items m
               JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
               WHERE m.is_active = 1 
               AND ma.user_type IN (${rolePlaceholders})
               AND ma.access_type IN ('default', 'additional')
               AND (ma.valid_from IS NULL OR ma.valid_from <= CURDATE())
               AND (ma.valid_until IS NULL OR ma.valid_until >= CURDATE())
               AND (ma.school_id IS NULL OR ma.school_id = ?)
               AND m.id IN (${addPlaceholders})
               AND m.id NOT IN (${filteredItems.map(() => '?').join(',')})`,
              { 
                replacements: [...allRoles, schoolId, ...add, ...filteredItems.map(item => item.id)], 
                type: db.Sequelize.QueryTypes.SELECT 
              }
            );
            
            filteredItems = [...filteredItems, ...extraItems];
            console.log('RBAC Feature Override - Added items:', add, 'Found extra items:', extraItems.length);
          }
        }
      } catch (error) {
        console.error('Error applying feature overrides:', error);
        // Continue with original items if override parsing fails
      }
    }
    
    console.log('RBAC Query Params:', {
      allRoles,
      effectivePkgId,
      schoolId,
      userId: req.user?.id || 0
    });
    
    console.log('RBAC Query Results:', {
      totalItems: filteredItems.length,
      rootItems: filteredItems.filter(i => i.parent_id === null).length,
      hasQueryMarker: filteredItems.some(i => i.query_marker === 'V3_SIMPLIFIED')
    });
    
    // Debug: Check for Scanner items in database directly
    const scannerCheck = await db.sequelize.query(
      `SELECT m.id, m.parent_id, m.label, m.link, m.is_active,
              GROUP_CONCAT(DISTINCT a.user_type) as access_user_types,
              GROUP_CONCAT(DISTINCT p.package_id) as package_ids
       FROM rbac_menu_items m
       LEFT JOIN rbac_menu_access a ON m.id = a.menu_item_id
       LEFT JOIN rbac_menu_packages p ON m.id = p.menu_item_id
       WHERE (m.label LIKE '%Scan%' OR m.link LIKE '%scanner%')
       GROUP BY m.id`,
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Debug: Check for parent attendance items (these are parent items for scanner sub-items)
    const attendanceParents = await db.sequelize.query(
      `SELECT m.id, m.parent_id, m.label, m.link, m.is_active
       FROM rbac_menu_items m
       WHERE (m.label LIKE '%Student Attendance%' OR m.label LIKE '%Staff Attendance%')
       AND m.parent_id IS NOT NULL`,
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    
    console.log('RBAC Scanner Items Debug:', {
      scannerItemsInDB: scannerCheck || [],
      attendanceParents: attendanceParents || [],
      allRolesForQuery: allRoles
    });
    
    // Debug: Check for Scanner items in query results
    const scannerItems = filteredItems.filter(i => i.label && (i.label.toLowerCase().includes('scan') || i.link?.includes('scanner')));
    const attendanceItems = filteredItems.filter(i => i.label && i.label.toLowerCase().includes('attendance'));
    console.log('RBAC Query Debug:', { 
      schoolId, 
      itemCount: filteredItems.length, 
      scannerItemsInQuery: scannerItems.map(i => ({ id: i.id, label: i.label, link: i.link, parent_id: i.parent_id })),
      scannerItemsInDB: scannerCheck || [],
      allRoles,
      effectivePkgId,
      attendanceItems: attendanceItems.map(i => ({ id: i.id, label: i.label, parent_id: i.parent_id }))
    });
    
    // Debug: Check if parent attendance items are in the query results
    const parentAttendanceInQuery = filteredItems.filter(i => 
      i.label && (i.label.toLowerCase().includes('student attendance') || i.label.toLowerCase().includes('staff attendance'))
    );
    console.log('RBAC Parent Attendance in Query:', {
      parentItems: parentAttendanceInQuery.map(i => ({ id: i.id, label: i.label, parent_id: i.parent_id })),
      scannerItemsLookingForParents: scannerItems.map(i => ({ id: i.id, label: i.label, parent_id: i.parent_id }))
    });
    
    // Build tree structure (compact mode omits icons only)
    const buildTree = (items, parentId = null) => {
      return items
        .filter(i => i.parent_id === parentId)
        .map(i => {
          const children = buildTree(items, i.id);
          const item = { label: i.label, link: i.link };
          if (!compact) item.icon = i.icon;
          if (children.length > 0) { item.submenu = true; item.submenuItems = children; }
          return item;
        });
    };

    const rootItems = filteredItems.filter(i => i.parent_id === null);
    console.log('RBAC Root Items Debug:', {
      totalItems: filteredItems.length,
      rootItemsCount: rootItems.length,
      rootItems: rootItems.map(i => ({ id: i.id, label: i.label, parent_id: i.parent_id })),
      allItems: filteredItems.map(i => ({ id: i.id, label: i.label, parent_id: i.parent_id }))
    });
    const menuData = rootItems.map(section => {
      const sectionItems = buildTree(filteredItems, section.id);
      // Debug attendance section
      if (section.label && section.label.toLowerCase().includes('attendance')) {
        const directChildren = filteredItems.filter(i => i.parent_id === section.id);
        console.log('Attendance Section Debug:', {
          sectionId: section.id,
          sectionLabel: section.label,
          directChildren: directChildren.map(i => ({ id: i.id, label: i.label, link: i.link, parent_id: i.parent_id })),
          builtTree: sectionItems
        });
      }
      return {
        name: section.label,
        items: sectionItems
      };
    });

    const response = { 
      success: true, 
      data: menuData, 
      ...(effectiveUserType !== 'developer' && effectiveUserType !== 'superadmin' ? { package: packageLabel } : {}), 
      user_type: effectiveUserType,
      // Add debug info for verification
      debug: {
        totalMenuItems: filteredItems.length,
        userRoles: allRoles,
        effectivePackage: effectivePkgId,
        schoolId: schoolId,
        expectedCount: 124
      }
    };
    
    console.log('✅ RBAC Debug - Final menu response:', {
      menuSections: menuData.length,
      totalItems: filteredItems.length,
      userType: effectiveUserType,
      package: packageLabel,
      isExpectedCount: filteredItems.length >= 120, // Allow some variance
      allRolesUsed: allRoles
    });
    
    if (!compact) await menuCache.set(schoolId, effectiveUserType, response);
    
    res.json(response);
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ success: false, error: 'Failed to get menu' });
  }
};

const listFeatures = async (req, res) => {
  try {
    const features = await db.Feature.findAll({
      where: { is_active: true },
      include: [{ model: db.FeatureCategory, as: 'category' }],
      order: [['display_order', 'ASC']]
    });
    res.json({ success: true, data: features });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list features' });
  }
};

const listRoles = async (req, res) => {
  try {
    const { school_id } = req.user;
    
    // SECURITY: Filter out system roles for non-developers
    const whereClause = { 
      [db.Sequelize.Op.or]: [{ school_id }, { school_id: null }]
    };
    
    if (req.user.user_type !== 'Developer') {
      whereClause.is_system_role = { [db.Sequelize.Op.ne]: 1 };
    }
    
    const roles = await db.Role.findAll({ where: whereClause });
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list roles' });
  }
};

const createRole = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { role_code, user_type, description } = req.body;
    const role = await db.Role.create({ role_code, user_type, description, school_id });
    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create role' });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body; // [{ feature_id, can_view, can_create, can_edit, can_delete }]

    await db.RolePermission.destroy({ where: { role_id: id } });
    const records = permissions.map(p => ({ role_id: id, ...p }));
    await db.RolePermission.bulkCreate(records);

    res.json({ success: true, message: 'Permissions updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update permissions' });
  }
};

const getMenuItemsByRoles = async (req, res) => {
  try {
    const { roles, school_id } = req.query;
    
    if (!roles) {
      return res.status(400).json({ success: false, error: 'Roles parameter required' });
    }
    
    const roleList = roles.split(',').map(r => r.trim());
    
    const menuItems = await db.sequelize.query(
      `SELECT DISTINCT m.id 
       FROM rbac_menu_items m
       JOIN rbac_menu_access a ON m.id = a.menu_item_id
       WHERE a.user_type IN (?) AND m.is_active = 1
       AND (a.school_id IS NULL OR a.school_id = ?)`,
      { replacements: [roleList, school_id], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    const menuItemIds = menuItems.map(item => item.id);
    res.json({ success: true, data: menuItemIds });
  } catch (error) {
    console.error('Get menu items by roles error:', error);
    res.status(500).json({ success: false, error: 'Failed to get menu items' });
  }
};

const getUserRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id } = req.user;
    const userRoles = await db.UserRole.findAll({
      where: { user_id: id, school_id, is_active: true },
      include: [{ model: db.Role, as: 'role' }]
    });
    res.json({ success: true, data: userRoles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user roles' });
  }
};

const assignRole = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const { role_id, branch_id } = req.body;
    const { id: assignedBy, school_id } = req.user;

    const userRole = await rbacService.assignRoleToUser(targetUserId, role_id, school_id, branch_id, assignedBy);
    res.json({ success: true, data: userRole });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to assign role' });
  }
};

const revokeRole = async (req, res) => {
  try {
    const { user_id, role_id, reason } = req.body;
    const { id: revokedBy, school_id } = req.user;

    await db.sequelize.query(
      `UPDATE user_roles 
       SET is_active = 0, revoked_by = ?, revoked_at = NOW(), revoke_reason = ?
       WHERE user_id = ? AND role_id = ?`,
      { replacements: [revokedBy, reason, user_id, role_id] }
    );

    res.json({ success: true, message: 'Role revoked successfully' });
  } catch (error) {
    console.error('Revoke role error:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke role' });
  }
};

const listStaffRoles = async (req, res) => {
  try {
    const roles = await db.StaffRoleDefinition.findAll();
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list staff roles' });
  }
};

const assignStaffRole = async (req, res) => {
  try {
    const { id: staffId } = req.params;
    const { role_code } = req.body;
    const { school_id } = req.user;

    const staff = await rbacService.assignStaffRole(staffId, role_code, school_id);
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSuperadminFeatures = async (req, res) => {
  try {
    const { id } = req.params || req.user;
    
    // Get features granted to this superadmin
    const features = await db.sequelize.query(`
      SELECT f.feature_key, f.feature_name, f.description, sf.is_active
      FROM superadmin_features sf
      JOIN features f ON sf.feature_id = f.id
      WHERE sf.superadmin_user_id = ? AND sf.is_active = 1
    `, { replacements: [id], type: db.Sequelize.QueryTypes.SELECT });
    
    res.json({ success: true, data: features });
  } catch (error) {
    console.error('Get superadmin features error:', error);
    res.status(500).json({ success: false, error: 'Failed to get superadmin features' });
  }
};

// Developer grants features to SuperAdmin
const grantSuperadminFeature = async (req, res) => {
  try {
    const { id } = req.params; // superadmin_id
    const { feature_keys } = req.body;
    const { id: developerId, user_type } = req.user;
    
    if (user_type !== 'Developer') {
      return res.status(403).json({ success: false, error: 'Only Developers can grant features to SuperAdmins' });
    }
    
    // Get feature IDs
    const features = await db.sequelize.query(`
      SELECT id, feature_key FROM features WHERE feature_key IN (?) AND is_active = 1
    `, { replacements: [feature_keys], type: db.Sequelize.QueryTypes.SELECT });
    
    // Insert or update superadmin_features
    for (const feature of features) {
      await db.sequelize.query(`
        INSERT INTO superadmin_features (superadmin_user_id, feature_id, granted_by, granted_at, is_active)
        VALUES (?, ?, ?, NOW(), 1)
        ON DUPLICATE KEY UPDATE is_active = 1, granted_by = ?, granted_at = NOW()
      `, { replacements: [id, feature.id, developerId, developerId] });
    }
    
    res.json({ success: true, message: 'Features granted successfully' });
  } catch (error) {
    console.error('Grant superadmin feature error:', error);
    res.status(500).json({ success: false, error: 'Failed to grant features' });
  }
};

// SuperAdmin assigns features to school
const assignSchoolFeatures = async (req, res) => {
  try {
    const { school_id, package_id, features_override } = req.body;
    const superadminId = req.user.id;
    const userType = req.user.user_type?.toLowerCase();
    
    // Verify requester is SuperAdmin or Developer
    if (userType !== 'superadmin' && userType !== 'developer') {
      return res.status(403).json({ success: false, error: 'Only SuperAdmins can assign features to schools' });
    }
    
    // If SuperAdmin, validate against allowed features
    if (userType === 'superadmin' && features_override?.add) {
      const allowedFeatures = await db.sequelize.query(`
        SELECT f.feature_key FROM superadmin_features sf
        JOIN features f ON sf.feature_id = f.id
        WHERE sf.superadmin_user_id = ? AND sf.is_active = 1
      `, { replacements: [superadminId], type: db.Sequelize.QueryTypes.SELECT });
      
      const allowedKeys = allowedFeatures.map(f => f.feature_key);
      const invalidFeatures = features_override.add.filter(f => !allowedKeys.includes(f));
      
      if (invalidFeatures.length > 0) {
        return res.status(403).json({ 
          success: false, 
          error: `You are not allowed to assign these features: ${invalidFeatures.join(', ')}` 
        });
      }
    }
    
    // Update or insert rbac_school_packages
    await db.sequelize.query(`
      INSERT INTO rbac_school_packages (school_id, package_id, start_date, end_date, features_override, is_active, created_by, created_at, updated_at)
      VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), ?, 1, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        package_id = VALUES(package_id),
        features_override = VALUES(features_override),
        updated_by = ?,
        updated_at = NOW()
    `, { 
      replacements: [school_id, package_id, JSON.stringify(features_override || {}), superadminId, superadminId] 
    });
    
    // Clear RBAC permission cache for all users in this school
    const rbacService = require('../services/rbacService');
    rbacService.invalidateSchoolCache(school_id);
    
    res.json({ success: true, message: 'School features assigned successfully' });
  } catch (error) {
    console.error('Assign school features error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign school features' });
  }
};

// Get all features (for Developer to see all available)
const getAllFeatures = async (req, res) => {
  try {
    const features = await db.sequelize.query(`
      SELECT id, feature_key, feature_name, description, is_active
      FROM features WHERE is_active = 1
      ORDER BY feature_name
    `, { type: db.Sequelize.QueryTypes.SELECT });
    
    res.json({ success: true, data: features });
  } catch (error) {
    console.error('Get all features error:', error);
    res.status(500).json({ success: false, error: 'Failed to get features' });
  }
};

// Get school's effective features
const getSchoolFeatures = async (req, res) => {
  try {
    const { school_id } = req.query;
    
    if (!school_id) {
      return res.status(400).json({ success: false, error: 'school_id query parameter is required' });
    }
    
    // Get actual subscription from school_subscriptions table (regardless of status)
    const subscriptionResult = await db.sequelize.query(`
      SELECT ss.*, sp.package_name, sp.display_name, sp.features as base_features,
             spr.base_price_per_student, spr.pricing_name
      FROM school_subscriptions ss
      JOIN subscription_packages sp ON ss.pricing_plan_id = sp.id
      LEFT JOIN subscription_pricing spr ON sp.package_name = spr.pricing_name
      WHERE ss.school_id = ?
      ORDER BY ss.created_at DESC LIMIT 1
    `, { replacements: [school_id], type: db.Sequelize.QueryTypes.SELECT });
    
    // Get any RBAC overrides if they exist
    const rbacResult = await db.sequelize.query(`
      SELECT features_override
      FROM rbac_school_packages 
      WHERE school_id = ? AND is_active = 1
      ORDER BY created_at DESC LIMIT 1
    `, { replacements: [school_id], type: db.Sequelize.QueryTypes.SELECT });
    
    if (subscriptionResult.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          plan: 'No Subscription',
          package: 'none', 
          features: [],
          subscriptionType: null,
          startDate: null,
          endDate: null,
          planFeatures: {},
          overrides: []
        } 
      });
    }
    
    const subscription = subscriptionResult[0];
    let features = JSON.parse(subscription.base_features || '[]');
    const override = rbacResult.length > 0 && rbacResult[0].features_override 
      ? JSON.parse(rbacResult[0].features_override) 
      : {};
    
    // Apply overrides
    if (override.add) features = [...new Set([...features, ...override.add])];
    if (override.remove) features = features.filter(f => !override.remove.includes(f));
    
    // Convert features array to planFeatures object
    const planFeatures = {};
    features.forEach(feature => {
      planFeatures[feature] = 1;
    });
    
    res.json({ 
      success: true, 
      data: { 
        plan: subscription.display_name || subscription.package_name,
        package: subscription.package_name,
        subscriptionType: subscription.subscription_type,
        startDate: subscription.subscription_start_date,
        endDate: subscription.subscription_end_date,
        planFeatures: planFeatures,
        overrides: override.add || [],
        status: subscription.status,
        pricing: subscription.base_price_per_student || 500 // Include pricing information
      } 
    });
  } catch (error) {
    console.error('Get school features error:', error);
    res.status(500).json({ success: false, error: 'Failed to get school features' });
  }
};

const getMenuConfig = async (req, res) => {
  try {
    const { user_type, id: userId } = req.user;
    const normalizedUserType = user_type?.toLowerCase();
    
    // Allow developers and superadmins
    if (normalizedUserType !== 'developer' && normalizedUserType !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Developer or SuperAdmin access required' });
    }
    
    // Plan hierarchy: elite(1) > premium(2) > standard(3) > free/starter(4)
    const PLAN_HIERARCHY = { elite: 1, premium: 2, standard: 3, free: 4, starter: 4 };
    
    let userPlanLevel = 1; // Default to elite (all access) for developers
    let userPlan = 'elite';
    
    // Get superadmin's plan if not developer
    if (normalizedUserType === 'superadmin') {
      try {
        const userPlanResult = await db.sequelize.query(
          `SELECT subscription_plan FROM users WHERE id = ?`,
          { replacements: [userId], type: db.Sequelize.QueryTypes.SELECT }
        );
        
        if (userPlanResult && userPlanResult.length > 0) {
          userPlan = (userPlanResult[0]?.subscription_plan || 'standard').toLowerCase().replace(/\s+plan$/i, '').trim();
          userPlanLevel = PLAN_HIERARCHY[userPlan] || 4;
        } else {
          // Default to standard if no plan found
          userPlan = 'standard';
          userPlanLevel = 3;
        }
      } catch (planError) {
        console.error('Error fetching superadmin plan:', planError);
        // Default to standard on error
        userPlan = 'standard';
        userPlanLevel = 3;
      }
    }
    
    // Get all menu items with their access and package info
    const queryReplacements = [];
    let itemsQuery = `
      SELECT m.*, 
        GROUP_CONCAT(DISTINCT a.user_type) as user_types,
        GROUP_CONCAT(DISTINCT p.package_id) as package_ids
      FROM rbac_menu_items m
      LEFT JOIN rbac_menu_access a ON m.id = a.menu_item_id
      LEFT JOIN rbac_menu_packages p ON m.id = p.menu_item_id
      WHERE m.is_active = 1
    `;
    
    // Filter menu items by plan level for superadmins
    if (normalizedUserType === 'superadmin') {
      // Package IDs: 1=starter, 2=standard, 3=premium, 4=elite
      // Plan hierarchy levels: elite=1, premium=2, standard=3, starter=4
      // Users with a plan can see items in their plan and all lower-tier plans
      // Formula: maxPackageId = 5 - userPlanLevel
      const maxPackageId = 5 - userPlanLevel;
      itemsQuery += ` AND (p.package_id IS NULL OR p.package_id <= ?)`;
      queryReplacements.push(maxPackageId);
    }
    
    itemsQuery += `
      GROUP BY m.id
      ORDER BY m.parent_id IS NULL DESC, m.sort_order
    `;
    
    const items = await db.sequelize.query(itemsQuery, { 
      replacements: queryReplacements,
      type: db.Sequelize.QueryTypes.SELECT 
    });
    
    // Get packages - filter by plan level for superadmins
    const packageReplacements = [];
    let packagesQuery = 'SELECT id, package_name FROM subscription_packages WHERE is_active = 1';
    if (normalizedUserType === 'superadmin') {
      const maxPackageId = 5 - userPlanLevel;
      packagesQuery += ` AND id <= ?`;
      packageReplacements.push(maxPackageId);
    }
    packagesQuery += ' ORDER BY id';
    
    const packages = await db.sequelize.query(packagesQuery, { 
      replacements: packageReplacements,
      type: db.Sequelize.QueryTypes.SELECT 
    });
    
    // Get user types from database
    const userTypesResult = await db.sequelize.query(
      'SELECT DISTINCT user_type FROM roles ORDER BY user_type',
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    const userTypes = userTypesResult.map(r => r.user_type);
    
    // Stats
    const stats = {
      modules: items.filter(i => !i.parent_id).length,
      items: items.filter(i => i.parent_id).length,
      totalItems: items.length
    };
    
    res.json({ success: true, data: { items, packages, userTypes, stats } });
  } catch (error) {
    console.error('Get menu config error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get menu config',
      message: error.message 
    });
  }
};

const updateMenuConfig = async (req, res) => {
  try {
    const { user_type } = req.user;
    if (user_type?.toLowerCase() !== 'developer') {
      return res.status(403).json({ success: false, error: 'Developer access required' });
    }
    const { menu_data } = req.body;
    await db.sequelize.query(
      `UPDATE rbac_menu_cache SET menu_data = ?, updated_at = NOW()`,
      { replacements: [JSON.stringify(menu_data)], type: db.Sequelize.QueryTypes.UPDATE }
    );
    await menuCache.invalidateAll();
    res.json({ success: true, message: 'Menu updated' });
  } catch (error) {
    console.error('Update menu config error:', error);
    res.status(500).json({ success: false, error: 'Failed to update menu config' });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { user_type } = req.user;
    if (user_type?.toLowerCase() !== 'developer') {
      return res.status(403).json({ success: false, error: 'Developer access required' });
    }
    
    const { parent_id, label, icon, link, sort_order, user_types, package_ids } = req.body;
    
    // Parse comma-separated strings to arrays
    const userTypesArray = typeof user_types === 'string' ? user_types.split(',').map(s => s.trim()) : user_types || [];
    const packageIdsArray = typeof package_ids === 'string' ? package_ids.split(',').map(s => s.trim()) : package_ids || [];
    
    const [result] = await db.sequelize.query(
      'INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order) VALUES (?, ?, ?, ?, ?)',
      { replacements: [parent_id || null, label, icon || null, link || null, sort_order || 0] }
    );
    
    const menuId = result;
    
    // Add user access
    if (userTypesArray.length) {
      for (const ut of userTypesArray) {
        await db.sequelize.query(
          'INSERT INTO rbac_menu_access (menu_item_id, user_type) VALUES (?, ?)',
          { replacements: [menuId, ut] }
        );
      }
    }
    
    // Add package restrictions
    if (packageIdsArray.length) {
      for (const pid of packageIdsArray) {
        await db.sequelize.query(
          'INSERT INTO rbac_menu_packages (menu_item_id, package_id) VALUES (?, ?)',
          { replacements: [menuId, pid] }
        );
      }
    }
    
    res.json({ success: true, data: { id: menuId }, message: 'Menu item created' });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const { user_type, id: userId } = req.user;
    if (user_type?.toLowerCase() !== 'developer') {
      return res.status(403).json({ success: false, error: 'Developer access required' });
    }
    
    const { id } = req.params;
    const { parent_id, label, icon, link, sort_order, user_types, package_ids } = req.body;
    
    // Get old values for audit
    const [oldItem] = await db.sequelize.query(
      'SELECT * FROM rbac_menu_items WHERE id = ?',
      { replacements: [id], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    const updates = [];
    const replacements = [];
    
    if (parent_id !== undefined) { updates.push('parent_id = ?'); replacements.push(parent_id); }
    if (label !== undefined) { updates.push('label = ?'); replacements.push(label); }
    if (icon !== undefined) { updates.push('icon = ?'); replacements.push(icon); }
    if (link !== undefined) { updates.push('link = ?'); replacements.push(link); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); replacements.push(sort_order); }
    
    if (updates.length > 0) {
      replacements.push(id);
      await db.sequelize.query(
        `UPDATE rbac_menu_items SET ${updates.join(', ')} WHERE id = ?`,
        { replacements }
      );
    }
    
    if (user_types !== undefined) {
      await db.sequelize.query('DELETE FROM rbac_menu_access WHERE menu_item_id = ?', { replacements: [id] });
      const typesArray = Array.isArray(user_types) ? user_types : (user_types ? user_types.split(',').filter(Boolean) : []);
      for (const ut of typesArray) {
        await db.sequelize.query(
          'INSERT INTO rbac_menu_access (menu_item_id, user_type) VALUES (?, ?)',
          { replacements: [id, ut.trim()] }
        );
      }
    }
    
    if (package_ids !== undefined) {
      await db.sequelize.query('DELETE FROM rbac_menu_packages WHERE menu_item_id = ?', { replacements: [id] });
      const pkgArray = Array.isArray(package_ids) ? package_ids : (package_ids ? package_ids.split(',').filter(Boolean) : []);
      for (const pid of pkgArray) {
        await db.sequelize.query(
          'INSERT INTO rbac_menu_packages (menu_item_id, package_id) VALUES (?, ?)',
          { replacements: [id, pid] }
        );
      }
    }
    
    await menuCache.invalidateAll();
    res.json({ success: true, message: 'Menu item updated' });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const { user_type } = req.user;
    if (user_type?.toLowerCase() !== 'developer') {
      return res.status(403).json({ success: false, error: 'Developer access required' });
    }
    
    const { id } = req.params;
    await db.sequelize.query('DELETE FROM rbac_menu_items WHERE id = ?', { replacements: [id] });
    
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createPackage = async (req, res) => {
  try {
    const { user_type } = req.user;
    if (user_type?.toLowerCase() !== 'developer') {
      return res.status(403).json({ success: false, error: 'Developer access required' });
    }
    
    const { package_name, display_name, description } = req.body;
    
    const [result] = await db.sequelize.query(
      'INSERT INTO subscription_packages (package_name, display_name, description, is_active) VALUES (?, ?, ?, 1)',
      { replacements: [package_name, display_name || package_name, description] }
    );
    
    res.json({ success: true, data: { id: result }, message: 'Package created' });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updatePackage = async (req, res) => {
  try {
    const { user_type } = req.user;
    if (user_type?.toLowerCase() !== 'developer') {
      return res.status(403).json({ success: false, error: 'Developer access required' });
    }
    
    const { id } = req.params;
    const { package_name, display_name, description } = req.body;
    
    await db.sequelize.query(
      'UPDATE subscription_packages SET package_name = ?, display_name = ?, description = ? WHERE id = ?',
      { replacements: [package_name, display_name, description, id] }
    );
    
    res.json({ success: true, message: 'Package updated' });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deletePackage = async (req, res) => {
  try {
    const { user_type } = req.user;
    if (user_type?.toLowerCase() !== 'developer') {
      return res.status(403).json({ success: false, error: 'Developer access required' });
    }
    
    const { id } = req.params;
    await db.sequelize.query('DELETE FROM subscription_packages WHERE id = ?', { replacements: [id] });
    
    res.json({ success: true, message: 'Package deleted' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Permission Templates
const getPermissionTemplates = async (req, res) => {
  try {
    const templates = await db.sequelize.query(
      'SELECT * FROM rbac_permission_templates ORDER BY name',
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createPermissionTemplate = async (req, res) => {
  try {
    const { name, description, menu_items } = req.body;
    const [result] = await db.sequelize.query(
      'INSERT INTO rbac_permission_templates (name, description, menu_items, created_by) VALUES (?, ?, ?, ?)',
      { replacements: [name, description, JSON.stringify(menu_items), req.user.id] }
    );
    res.json({ success: true, data: { id: result } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const applyPermissionTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_type, school_id } = req.body;
    
    const [template] = await db.sequelize.query(
      'SELECT menu_items FROM rbac_permission_templates WHERE id = ?',
      { replacements: [id], type: db.Sequelize.QueryTypes.SELECT }
    );
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    
    const menuKeys = JSON.parse(template.menu_items);
    const menuItems = await db.sequelize.query(
      'SELECT id FROM rbac_menu_items WHERE link IN (?) OR label IN (?)',
      { replacements: [menuKeys, menuKeys], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    for (const item of menuItems) {
      await db.sequelize.query(
        'INSERT IGNORE INTO rbac_menu_access (menu_item_id, user_type) VALUES (?, ?)',
        { replacements: [item.id, user_type] }
      );
    }
    
    await menuCache.invalidate(school_id, user_type);
    res.json({ success: true, message: `Applied template to ${user_type}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deletePermissionTemplate = async (req, res) => {
  try {
    await db.sequelize.query('DELETE FROM rbac_permission_templates WHERE id = ?', { replacements: [req.params.id] });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updatePermissionTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, menu_items } = req.body;
    await db.sequelize.query(
      'UPDATE rbac_permission_templates SET name = ?, description = ?, menu_items = ? WHERE id = ?',
      { replacements: [name, description, JSON.stringify(menu_items), id] }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Bulk update menu items
const bulkUpdateMenuAccess = async (req, res) => {
  try {
    const { user_type, id: userId } = req.user;
    if (user_type?.toLowerCase() !== 'developer') {
      return res.status(403).json({ success: false, error: 'Developer access required' });
    }
    
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'updates array required' });
    }
    
    for (const item of updates) {
      const { menu_item_id, user_types } = item;
      await db.sequelize.query('DELETE FROM rbac_menu_access WHERE menu_item_id = ?', { replacements: [menu_item_id] });
      for (const ut of (user_types || [])) {
        await db.sequelize.query(
          'INSERT INTO rbac_menu_access (menu_item_id, user_type) VALUES (?, ?)',
          { replacements: [menu_item_id, ut] }
        );
      }
    }
    
    await db.sequelize.query(
      `INSERT INTO permission_audit_log (user_id, action, entity_type, entity_id, new_value, created_at) 
       VALUES (?, 'BULK_UPDATE', 'menu_access', NULL, ?, NOW())`,
      { replacements: [userId, JSON.stringify({ count: updates.length })] }
    );
    
    await menuCache.invalidateAll();
    res.json({ success: true, message: `Updated ${updates.length} items` });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getUserPermissions,
  getUserMenu,
  getMenuConfig,
  updateMenuConfig,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createPackage,
  updatePackage,
  deletePackage,
  listFeatures,
  listRoles,
  createRole,
  updateRolePermissions,
  getUserRoles,
  assignRole,
  revokeRole,
  listStaffRoles,
  assignStaffRole,
  getSuperadminFeatures,
  grantSuperadminFeature,
  assignSchoolFeatures,
  getAllFeatures,
  getSchoolFeatures,
  bulkUpdateMenuAccess,
  getPermissionTemplates,
  createPermissionTemplate,
  applyPermissionTemplate,
  deletePermissionTemplate,
  updatePermissionTemplate,
  getMenuItemsByRoles,
  revokeRole
};
