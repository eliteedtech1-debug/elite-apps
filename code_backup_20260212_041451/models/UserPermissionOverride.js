// models/UserPermissionOverride.js
module.exports = (sequelize, DataTypes) => {
  const UserPermissionOverride = sequelize.define("UserPermissionOverride", {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    feature_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'features',
        key: 'id'
      }
    },
    granted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: 'Whether the permission is granted (true) or explicitly denied (false)'
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional conditions for this user-specific permission'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for the override'
    },
    granted_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who granted this override'
    },
    granted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this override expires (null for permanent)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: "user_permission_overrides",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ['user_id', 'feature_id'],
        unique: true,
        name: 'unique_user_feature_override'
      },
      {
        fields: ['granted']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  UserPermissionOverride.associate = (models) => {
    UserPermissionOverride.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });

    UserPermissionOverride.belongsTo(models.Feature, {
      foreignKey: "feature_id",
      as: "feature",
    });

    UserPermissionOverride.belongsTo(models.User, {
      foreignKey: "granted_by",
      as: "grantedByUser",
    });
  };

  // Instance method to check if override is currently valid
  UserPermissionOverride.prototype.isValid = function() {
    if (!this.is_active) return false;
    if (this.expires_at && new Date() > this.expires_at) return false;
    return true;
  };

  return UserPermissionOverride;
};