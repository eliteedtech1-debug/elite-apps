/**
 * Role Expiration Service
 * Handles auto-revocation of expired roles and expiration notifications
 */

const db = require('../models');

const checkExpiredRoles = async () => {
  try {
    // Find and revoke expired roles
    const [expired] = await db.sequelize.query(`
      SELECT ur.id, ur.user_id, ur.role_id, ur.assigned_role_name, u.name, u.email, s.school_id
      FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      LEFT JOIN school_setup s ON u.school_id = s.school_id
      WHERE ur.is_active = 1 AND ur.expires_at IS NOT NULL AND ur.expires_at < NOW()
    `);

    for (const role of expired) {
      // Revoke the role
      await db.sequelize.query(`
        UPDATE user_roles SET is_active = 0, revoked_at = NOW(), revoke_reason = 'Auto-expired'
        WHERE id = ?
      `, { replacements: [role.id] });

      // Log to audit
      await db.sequelize.query(`
        INSERT INTO rbac_audit_log (action, target_user_id, role_name, performed_by, school_id, details, created_at)
        VALUES ('revoke', ?, ?, 0, ?, '{"reason":"auto_expired"}', NOW())
      `, { replacements: [role.user_id, role.assigned_role_name, role.school_id] });

      console.log(`[RoleExpiration] Auto-revoked role "${role.assigned_role_name}" from user ${role.user_id}`);
    }

    if (expired.length > 0) {
      console.log(`[RoleExpiration] Revoked ${expired.length} expired roles`);
    }

    return expired.length;
  } catch (err) {
    console.error('[RoleExpiration] Error:', err);
    return 0;
  }
};

const notifyExpiringRoles = async (daysAhead = 3) => {
  try {
    // Find roles expiring soon
    const [expiring] = await db.sequelize.query(`
      SELECT ur.user_id, ur.assigned_role_name, ur.expires_at, u.school_id
      FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      WHERE ur.is_active = 1 
        AND ur.expires_at IS NOT NULL 
        AND ur.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
        AND ur.expiry_notified = 0
    `, { replacements: [daysAhead] });

    for (const role of expiring) {
      // Send notification
      await db.sequelize.query(`
        INSERT INTO notifications (user_id, title, message, type, school_id, created_at)
        VALUES (?, 'Role Expiring Soon', ?, 'role_expiring', ?, NOW())
      `, { 
        replacements: [
          role.user_id, 
          `Your "${role.assigned_role_name}" role will expire on ${new Date(role.expires_at).toLocaleDateString()}`,
          role.school_id
        ] 
      });

      // Mark as notified
      await db.sequelize.query(`
        UPDATE user_roles SET expiry_notified = 1 WHERE user_id = ? AND assigned_role_name = ?
      `, { replacements: [role.user_id, role.assigned_role_name] });
    }

    if (expiring.length > 0) {
      console.log(`[RoleExpiration] Sent ${expiring.length} expiration warnings`);
    }

    return expiring.length;
  } catch (err) {
    console.error('[RoleExpiration] Notification error:', err);
    return 0;
  }
};

// Run both checks
const runExpirationCheck = async () => {
  const revoked = await checkExpiredRoles();
  const notified = await notifyExpiringRoles(3);
  return { revoked, notified };
};

module.exports = { checkExpiredRoles, notifyExpiringRoles, runExpirationCheck };
