const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    user_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    accessTo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_system_role: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    default_permissions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'school_setup',
        key: 'school_id'
      }
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Prevent Sequelize from modifying the table structure
    freezeTableName: true
  });
  Role.associate = (models) => {
    // Role.js
    Role.belongsToMany(models.Permission, {
      through: "role_permissions",
      foreignKey: "role_id",
      otherKey: "permission_id",
      as: "grantedPermissions"   // 👈 avoid collision
    });

  };
  return Role;
};
