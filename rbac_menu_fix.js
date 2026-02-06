// RBAC Menu System Fix - Enhanced Role Aggregation
// This file contains the corrected getUserMenu function

const getUserMenu = async (req, res) => {
  try {
    let schoolId = req.query.school_id || req.user?.school_id;
    // Normalize school_id to SCH/X format if numeric
    if (schoolId && !String(schoolId).startsWith('SCH/')) {
      schoolId = `SCH/${schoolId}`;
    }
    const baseUserType = (req.headers['x-user-type'] || req.user?.user_type)?.toLowerCase();
    const branchId = req.headers['x-branch-id'] || req.user?.branch_id;
    const compact = req.query.compact === 'true';
    
    // Normalize user type to lowercase for consistent comparison
    const normalizedBaseUserType = baseUserType?.toLowerCase();
    
    // Developer operations are school-independent
    const isDeveloper = normalizedBaseUserType === 'developer';
    const isSystemUser = normalizedBaseUserType === 'developer' || normalizedBaseUserType === 'superadmin';
    const effectiveSchoolId = isDeveloper ? null : schoolId;
    
    // FIXED: Enhanced role aggregation with better error handling
    console.log('🔍 RBAC Debug - Starting role resolution for user:', req.user?.id);
    
    // Get user's assigned roles to determine effective user type and all roles
    const userRoles = await db.sequelize.query(
      `SELECT r.user_type FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = ? AND (r.school_id = ? OR r.school_id IS NULL OR ? = 1) AND ur.is_active = 1
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       ORDER BY CASE LOWER(r.user_type) 
         WHEN 'developer' THEN 1 
         WHEN 'superadmin' THEN 2 
         WHEN 'admin' THEN 3 
         WHEN 'branchadmin' THEN 4 
         ELSE 5 END`,
      { replacements: [req.user?.id, effectiveSchoolId, isDeveloper ? 1 : 0], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Use highest privilege role for response, but include ALL roles for menu access
    const effectiveUserType = userRoles.length > 0 ? userRoles[0].user_type.toLowerCase() : normalizedBaseUserType;
    const allUserRoles = userRoles.map(r => r.user_type.toLowerCase());
    
    console.log('🔍 RBAC Debug - User roles found:', { 
      userId: req.user?.id,
      schoolId, 
      baseUserType, 
      effectiveUserType, 
      allUserRoles,
      userRolesCount: userRoles.length
    });

    // Check cache first (only for non-compact requests)
    if (!compact) {
      const cached = await menuCache.get(schoolId, effectiveUserType);
      if (cached) {
        console.log('📦 RBAC Debug - Returning cached menu for:', effectiveUserType);
        return res.json(cached);
      }
    }

    // [School status and package logic remains the same...]
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
    
    // [Package determination logic remains the same...]
    // Get package from rbac_school_packages (used as cache/fallback)
    const schoolPackage = await db.sequelize.query(
      `SELECT sp.id as package_id, sp.package_name FROM rbac_school_packages rsp
       JOIN subscription_packages sp ON rsp.package_id = sp.id
       WHERE rsp.school_id = ? AND rsp.is_active = 1 LIMIT 1`,
      { replacements: [schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Determine package and label
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

    // FIXED: Enhanced role inheritance with comprehensive logging
    console.log('🔍 RBAC Debug - Starting role inheritance resolution');
    
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
    let effectivePkgId = isExpired ? 1 : schoolPkgId;
    
    // Determine if custom sidebar items (school menu access) should be shown
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
    console.log('🔍 RBAC Debug - Building menu query');
    
    // Build IN clause with correct number of placeholders for allRoles
    const rolePlaceholders = allRoles.map(() => '?').join(',');
    
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
    
    // FIXED: Correct parameter binding
    const replacements = [...allRoles, schoolId, effectiveUserType, effectivePkgId];
    
    console.log('🔍 RBAC Debug - Query parameters:', {
      query: itemsQuery.replace(/\s+/g, ' ').trim(),
      allRoles,
      schoolId,
      effectiveUserType,
      effectivePkgId,
      replacementsCount: replacements.length,
      rolePlaceholdersCount: allRoles.length
    });
    
    // Execute the query
    const items = await db.sequelize.query(
      itemsQuery,
      { replacements, type: db.Sequelize.QueryTypes.SELECT }
    );
    
    console.log('🔍 RBAC Debug - Query results:', {
      totalItemsFound: items.length,
      expectedMinimum: 124, // Based on our analysis
      itemSample: items.slice(0, 5).map(i => ({ id: i.id, label: i.label, parent_id: i.parent_id }))
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
            const beforeCount = filteredItems.length;
            filteredItems = filteredItems.filter(item => !remove.includes(item.id));
            console.log('🔍 RBAC Debug - Feature override removal:', {
              removedFeatures: remove,
              beforeCount,
              afterCount: filteredItems.length,
              removedCount: beforeCount - filteredItems.length
            });
          }
          
          // Add extra features (if they exist in the database but weren't included by package restrictions)
          if (add.length > 0) {
            const addPlaceholders = add.map(() => '?').join(',');
            const existingIds = filteredItems.map(item => item.id);
            const existingPlaceholders = existingIds.length > 0 ? existingIds.map(() => '?').join(',') : '0';
            
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
               ${existingIds.length > 0 ? `AND m.id NOT IN (${existingPlaceholders})` : ''}`,
              { 
                replacements: [...allRoles, schoolId, ...add, ...existingIds], 
                type: db.Sequelize.QueryTypes.SELECT 
              }
            );
            
            const beforeCount = filteredItems.length;
            filteredItems = [...filteredItems, ...extraItems];
            console.log('🔍 RBAC Debug - Feature override addition:', {
              addedFeatures: add,
              beforeCount,
              afterCount: filteredItems.length,
              addedCount: extraItems.length
            });
          }
        }
      } catch (error) {
        console.error('❌ RBAC Error - Feature overrides failed:', error);
        // Continue with original items if override parsing fails
      }
    }
    
    console.log('🔍 RBAC Debug - Final menu processing:', {
      finalItemCount: filteredItems.length,
      expectedCount: 124,
      isExpectedCount: filteredItems.length >= 120, // Allow some variance
      rootItems: filteredItems.filter(i => i.parent_id === null).length
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
    const menuData = rootItems.map(section => {
      const sectionItems = buildTree(filteredItems, section.id);
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
        schoolId: schoolId
      }
    };
    
    console.log('✅ RBAC Debug - Menu response prepared:', {
      menuSections: menuData.length,
      totalItems: filteredItems.length,
      userType: effectiveUserType,
      package: packageLabel
    });
    
    if (!compact) await menuCache.set(schoolId, effectiveUserType, response);
    
    res.json(response);
  } catch (error) {
    console.error('❌ RBAC Error - Get menu failed:', error);
    res.status(500).json({ success: false, error: 'Failed to get menu' });
  }
};