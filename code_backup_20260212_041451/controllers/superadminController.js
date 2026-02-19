const db = require('../models');
const bcrypt = require('bcrypt');

// Plan hierarchy: elite(1) > premium(2) > standard(3) > free(4)
const PLAN_HIERARCHY = { elite: 1, premium: 2, standard: 3, free: 4 };

// Get all superadmins
const getSuperAdmins = async (req, res) => {
  try {
    const superadmins = await db.sequelize.query(
      `SELECT id, name, email, phone, user_type, status
       FROM users WHERE user_type IN ('superadmin', 'SuperAdmin', 'developer', 'Developer') ORDER BY id DESC`,
      { type: db.Sequelize.QueryTypes.SELECT }
    );

    const parsed = await Promise.all(superadmins.map(async (sa) => {
      const [overrides, allowedPlans] = await Promise.all([
        db.sequelize.query(
          `SELECT menu_item_id FROM superadmin_override_features WHERE superadmin_id = ?`,
          { replacements: [sa.id], type: db.Sequelize.QueryTypes.SELECT }
        ),
        db.sequelize.query(
          `SELECT package_id FROM superadmin_allowed_plans WHERE superadmin_id = ?`,
          { replacements: [sa.id], type: db.Sequelize.QueryTypes.SELECT }
        )
      ]);
      return {
        ...sa,
        plan: sa.user_type.toLowerCase() === 'developer' ? 'elite' : 'premium',
        override_features: overrides.map(f => f.menu_item_id),
        allowed_plans: allowedPlans.map(p => p.package_id)
      };
    }));

    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Error fetching superadmins:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create superadmin
const createSuperAdmin = async (req, res) => {
  try {
    const { name, email, phone, password, features, plan } = req.body;

    // Check if email exists
    const existing = await db.sequelize.query(
      `SELECT id FROM users WHERE email = ?`,
      { replacements: [email], type: db.Sequelize.QueryTypes.SELECT }
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const featuresJson = JSON.stringify(features || []);

    await db.sequelize.query(
      `INSERT INTO users (name, email, phone, password, user_type, status, features, plan, created_at) 
       VALUES (?, ?, ?, ?, 'superadmin', 'Active', ?, ?, NOW())`,
      { replacements: [name, email, phone, hashedPassword, featuresJson, plan || 'standard'] }
    );

    res.json({ success: true, message: 'SuperAdmin created successfully' });
  } catch (error) {
    console.error('Error creating superadmin:', error);
    res.status(500).json({ success: false, message: 'Failed to create superadmin' });
  }
};

// Update superadmin
const updateSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status, features, plan } = req.body;

    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (features) { updates.push('features = ?'); values.push(JSON.stringify(features)); }
    if (plan) { updates.push('plan = ?'); values.push(plan); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    await db.sequelize.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      { replacements: values }
    );

    res.json({ success: true, message: 'SuperAdmin updated successfully' });
  } catch (error) {
    console.error('Error updating superadmin:', error);
    res.status(500).json({ success: false, message: 'Failed to update superadmin' });
  }
};

// Update superadmin features (plan + overrides)
const updateSuperAdminFeatures = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, override_features } = req.body;

    // Update plan
    if (plan) {
      await db.sequelize.query(
        `UPDATE users SET subscription_plan = ? WHERE id = ?`,
        { replacements: [plan, id] }
      );
    }

    // Clear existing override features
    await db.sequelize.query(
      `DELETE FROM superadmin_override_features WHERE superadmin_id = ?`,
      { replacements: [id] }
    );

    // Insert new override features
    if (override_features && override_features.length > 0) {
      const values = override_features.map(f => `(${id}, ${f})`).join(',');
      await db.sequelize.query(
        `INSERT INTO superadmin_override_features (superadmin_id, menu_item_id) VALUES ${values}`
      );
    }

    // Also update superadmin_menu_access with effective features (plan + overrides)
    // First get all menu items for the plan level and below
    const planLevel = PLAN_HIERARCHY[plan] || 4;
    const planFeatures = await db.sequelize.query(
      `SELECT DISTINCT menu_item_id FROM rbac_menu_packages WHERE package_id >= ?`,
      { replacements: [planLevel], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    const planFeatureIds = planFeatures.map(f => f.menu_item_id);
    const allFeatureIds = [...new Set([...planFeatureIds, ...(override_features || [])])];

    // Update superadmin_menu_access
    await db.sequelize.query(
      `DELETE FROM superadmin_menu_access WHERE superadmin_id = ?`,
      { replacements: [id] }
    );

    if (allFeatureIds.length > 0) {
      const values = allFeatureIds.map(f => `(${id}, ${f})`).join(',');
      await db.sequelize.query(
        `INSERT INTO superadmin_menu_access (superadmin_id, menu_item_id) VALUES ${values}`
      );
    }

    res.json({ success: true, message: 'Features updated successfully' });
  } catch (error) {
    console.error('Error updating features:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete superadmin
const deleteSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    await db.sequelize.query(
      `UPDATE users SET status = 'Deleted' WHERE id = ? AND user_type IN ('superadmin', 'SuperAdmin')`,
      { replacements: [id] }
    );

    res.json({ success: true, message: 'SuperAdmin deleted successfully' });
  } catch (error) {
    console.error('Error deleting superadmin:', error);
    res.status(500).json({ success: false, message: 'Failed to delete superadmin' });
  }
};

// Get current user's features (for superadmins)
const getMyFeatures = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.user_type?.toLowerCase();
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // For developers and superadmins, return all features
    if (userType === 'superadmin' || userType === 'developer') {
      const allFeatures = [
        'Generate MOU',
        'School Management',
        'User Management', 
        'Billing Setup',
        'Academic Management',
        'Communication Tools',
        'Reports & Analytics',
        'System Configuration'
      ];

      return res.json({ 
        success: true, 
        data: { 
          features: allFeatures,
          plan: 'elite',
          user_id: userId
        } 
      });
    }

    // Get user's school and plan (for non-superadmins)
    const [userSchool] = await db.sequelize.query(
      `SELECT s.subscription_plan FROM users u 
       LEFT JOIN schools s ON u.school_id = s.school_id 
       WHERE u.id = ?`,
      { replacements: [userId], type: db.Sequelize.QueryTypes.SELECT }
    );

    // Get features for this user from superadmin_features table
    const features = await db.sequelize.query(
      `SELECT f.feature_name, f.menu_label FROM superadmin_features sf
       JOIN features f ON sf.feature_id = f.id
       WHERE sf.superadmin_user_id = ? AND sf.is_active = 1`,
      { replacements: [userId], type: db.Sequelize.QueryTypes.SELECT }
    );

    res.json({ 
      success: true, 
      data: { 
        features: features.map(f => f.menu_label || f.feature_name),
        plan: userSchool?.subscription_plan || 'standard',
        user_id: userId
      } 
    });
  } catch (error) {
    console.error('Error fetching my features:', error);
    
    // Fallback for developers/superadmins even on error
    const ut = req.user?.user_type?.toLowerCase();
    if (ut === 'superadmin' || ut === 'developer') {
      return res.json({ 
        success: true, 
        data: { 
          features: ['Generate MOU', 'School Management', 'User Management'],
          plan: 'elite',
          user_id: req.user.id
        } 
      });
    }
    
    res.status(500).json({ success: false, message: 'Failed to fetch features' });
  }
};

// Get features included in each plan
const getPlanFeatures = async (req, res) => {
  try {
    // Get all menu items with their package assignments
    const menuItems = await db.sequelize.query(
      `SELECT mi.id, mi.label, mi.parent_id, rmp.package_id
       FROM rbac_menu_items mi
       LEFT JOIN rbac_menu_packages rmp ON mi.id = rmp.menu_item_id
       ORDER BY mi.id`,
      { type: db.Sequelize.QueryTypes.SELECT }
    );

    // Group by plan level (starter=1, standard=2, premium=3, elite=4)
    const planFeatures = {
      starter: [],
      standard: [],
      premium: [],
      elite: []
    };

    const packageToPlan = { 1: 'starter', 2: 'standard', 3: 'premium', 4: 'elite' };

    menuItems.forEach(item => {
      if (item.package_id) {
        const plan = packageToPlan[item.package_id];
        if (plan && !planFeatures[plan].includes(item.id)) {
          planFeatures[plan].push(item.id);
        }
      }
    });

    // Calculate cumulative features (elite includes all lower tiers)
    const cumulativeFeatures = {
      starter: [...planFeatures.starter],
      standard: [...new Set([...planFeatures.starter, ...planFeatures.standard])],
      premium: [...new Set([...planFeatures.starter, ...planFeatures.standard, ...planFeatures.premium])],
      elite: [...new Set([...planFeatures.starter, ...planFeatures.standard, ...planFeatures.premium, ...planFeatures.elite])]
    };

    res.json({ 
      success: true, 
      data: {
        byPlan: planFeatures,
        cumulative: cumulativeFeatures,
        menuItems: menuItems
      }
    });
  } catch (error) {
    console.error('Error fetching plan features:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch plan features' });
  }
};

module.exports = {
  getSuperAdmins,
  createSuperAdmin,
  updateSuperAdmin,
  updateSuperAdminFeatures,
  deleteSuperAdmin,
  getMyFeatures,
  getPlanFeatures
};
