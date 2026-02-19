/**
 * PermissionAuditLog Model for RBAC System
 * Tracks all permission-related changes for audit purposes
 */

module.exports = (sequelize, DataTypes) => {
  const PermissionAuditLog = sequelize.define(
    'PermissionAuditLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who performed the action',
      },
      target_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who was affected by the action',
      },
      action: {
        type: DataTypes.ENUM(
          'role_assigned',
          'role_revoked',
          'permission_granted',
          'permission_revoked',
          'role_created',
          'role_updated',
          'role_deleted'
        ),
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.ENUM('role', 'permission', 'user_role', 'role_permission'),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      old_value: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Previous state before change',
      },
      new_value: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'New state after change',
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      school_id: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      branch_id: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
    },
    {
      tableName: 'permission_audit_log',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['target_user_id'],
        },
        {
          fields: ['action'],
        },
        {
          fields: ['entity_type'],
        },
        {
          fields: ['created_at'],
        },
      ],
    }
  );

  PermissionAuditLog.associate = (models) => {
    // User who performed the action
    if (models.User) {
      PermissionAuditLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'actor',
      });
    }

    // User who was affected
    if (models.User) {
      PermissionAuditLog.belongsTo(models.User, {
        foreignKey: 'target_user_id',
        as: 'target',
      });
    }
  };

  /**
   * Static method to log an action
   */
  PermissionAuditLog.logAction = async function ({
    userId,
    targetUserId = null,
    action,
    entityType,
    entityId = null,
    oldValue = null,
    newValue = null,
    reason = null,
    ipAddress = null,
    userAgent = null,
    schoolId = null,
    branchId = null,
  }) {
    return await this.create({
      user_id: userId,
      target_user_id: targetUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      reason,
      ip_address: ipAddress,
      user_agent: userAgent,
      school_id: schoolId,
      branch_id: branchId,
    });
  };

  return PermissionAuditLog;
};
