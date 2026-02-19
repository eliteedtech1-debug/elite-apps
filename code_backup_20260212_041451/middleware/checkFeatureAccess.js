const db = require('../models');

/**
 * Middleware to check if user has access to a feature
 * Checks both school subscription and role permissions
 */
const checkFeatureAccess = (featureCode, action = 'view') => {
  return async (req, res, next) => {
    try {
      const { school_id, user_type, id: user_id } = req.user;

      // Step 1: Check if school has feature in their subscription package
      const schoolSubscription = await db.sequelize.query(`
        SELECT 
          ss.id,
          ss.is_active,
          sp.features,
          ss.features_override
        FROM rbac_school_packages ss
        JOIN subscription_packages sp ON ss.package_id = sp.id
        WHERE ss.school_id = :school_id 
          AND ss.is_active = TRUE
          AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
        LIMIT 1
      `, {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      });

      if (!schoolSubscription.length) {
        return res.status(403).json({
          success: false,
          error: 'No active subscription found for your school',
          code: 'NO_SUBSCRIPTION'
        });
      }

      const subscription = schoolSubscription[0];
      const packageFeatures = subscription.features || [];
      const overrideFeatures = subscription.features_override || {};

      // Check if feature is in package or explicitly enabled in override
      const hasFeatureInPackage = packageFeatures.includes(featureCode);
      const isExplicitlyEnabled = overrideFeatures[featureCode] === true;
      const isExplicitlyDisabled = overrideFeatures[featureCode] === false;

      if (!hasFeatureInPackage && !isExplicitlyEnabled) {
        return res.status(403).json({
          success: false,
          error: 'This feature is not available in your subscription package',
          code: 'FEATURE_NOT_IN_PACKAGE',
          feature: featureCode
        });
      }

      if (isExplicitlyDisabled) {
        return res.status(403).json({
          success: false,
          error: 'This feature has been disabled for your school',
          code: 'FEATURE_DISABLED',
          feature: featureCode
        });
      }

      // Step 2: Check role permissions
      const rolePermission = await db.sequelize.query(`
        SELECT 
          rp.can_view,
          rp.can_create,
          rp.can_edit,
          rp.can_delete,
          rp.can_export,
          rp.can_approve
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN features f ON rp.feature_id = f.id
        WHERE r.role_name = :role_name
          AND f.feature_code = :feature_code
        LIMIT 1
      `, {
        replacements: { 
          role_name: user_type.toLowerCase(), 
          feature_code: featureCode 
        },
        type: db.sequelize.QueryTypes.SELECT
      });

      if (!rolePermission.length) {
        return res.status(403).json({
          success: false,
          error: 'Your role does not have access to this feature',
          code: 'ROLE_NO_ACCESS',
          feature: featureCode
        });
      }

      const permission = rolePermission[0];
      const actionField = `can_${action}`;

      if (!permission[actionField]) {
        return res.status(403).json({
          success: false,
          error: `You do not have permission to ${action} this feature`,
          code: 'INSUFFICIENT_PERMISSION',
          feature: featureCode,
          action
        });
      }

      // Step 3: Check user-specific overrides
      const userOverride = await db.sequelize.query(`
        SELECT 
          upo.override_type,
          upo.expires_at
        FROM user_permission_overrides upo
        JOIN features f ON upo.feature_id = f.id
        WHERE upo.user_id = :user_id
          AND f.feature_code = :feature_code
          AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
        LIMIT 1
      `, {
        replacements: { user_id, feature_code: featureCode },
        type: db.sequelize.QueryTypes.SELECT
      });

      if (userOverride.length && userOverride[0].override_type === 'revoke') {
        return res.status(403).json({
          success: false,
          error: 'Your access to this feature has been revoked',
          code: 'ACCESS_REVOKED',
          feature: featureCode
        });
      }

      // All checks passed
      req.featureAccess = {
        feature_code: featureCode,
        permissions: permission,
        has_override: userOverride.length > 0
      };

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify feature access'
      });
    }
  };
};

/**
 * Get all accessible features for a user
 */
const getUserFeatures = async (req, res) => {
  try {
    const { school_id, user_type, id: user_id } = req.user;

    const features = await db.sequelize.query(`
      SELECT DISTINCT
        f.feature_code,
        f.feature_name,
        f.category,
        f.route_path,
        f.sidebar_icon,
        f.display_order,
        rp.can_view,
        rp.can_create,
        rp.can_edit,
        rp.can_delete,
        rp.can_export,
        rp.can_approve
      FROM features f
      JOIN role_permissions rp ON f.id = rp.feature_id
      JOIN roles r ON rp.role_id = r.id
      JOIN rbac_school_packages ss ON ss.school_id = :school_id
      JOIN subscription_packages sp ON ss.package_id = sp.id
      WHERE r.role_name = :role_name
        AND f.is_active = TRUE
        AND ss.is_active = TRUE
        AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
        AND JSON_CONTAINS(sp.features, JSON_QUOTE(f.feature_code))
        AND rp.can_view = TRUE
      ORDER BY f.category, f.display_order
    `, {
      replacements: { 
        school_id, 
        role_name: user_type.toLowerCase() 
      },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Get user features error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user features'
    });
  }
};

module.exports = {
  checkFeatureAccess,
  getUserFeatures
};
