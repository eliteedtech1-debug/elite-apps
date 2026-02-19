// models/EnhancedPermission.js
module.exports = (sequelize, DataTypes) => {
  const EnhancedPermission = sequelize.define("EnhancedPermission", {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    display_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'permission_categories',
        key: 'id'
      }
    },
    resource: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'The resource this permission applies to (e.g., students, teachers, classes)'
    },
    action: {
      type: DataTypes.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'),
      allowNull: false,
      comment: 'The action that can be performed'
    },
    scope: {
      type: DataTypes.ENUM('ALL', 'OWN', 'BRANCH', 'SCHOOL'),
      allowNull: false,
      defaultValue: 'SCHOOL',
      comment: 'The scope of the permission'
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional conditions for the permission (JSON format)'
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this is a system permission that cannot be deleted'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: "enhanced_permissions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ['resource', 'action', 'scope'],
        unique: true,
        name: 'unique_permission'
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  EnhancedPermission.associate = (models) => {
    EnhancedPermission.belongsTo(models.PermissionCategory, {
      foreignKey: "category_id",
      as: "category",
    });

    EnhancedPermission.belongsToMany(models.Role, {
      through: "RolePermission",
      foreignKey: "permission_id",
      otherKey: "role_id",
      as: "roles"
    });

    EnhancedPermission.hasMany(models.UserPermissionOverride, {
      foreignKey: "permission_id",
      as: "userOverrides",
    });
  };

  // Helper method to generate permission key
  EnhancedPermission.prototype.getPermissionKey = function() {
    return `${this.resource}:${this.action}:${this.scope}`;
  };

  // Static method to parse permission key
  EnhancedPermission.parsePermissionKey = function(key) {
    const parts = key.split(':');
    return {
      resource: parts[0],
      action: parts[1],
      scope: parts[2] || 'SCHOOL'
    };
  };

  return EnhancedPermission;
};