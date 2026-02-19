// models/PermissionCategory.js
module.exports = (sequelize, DataTypes) => {
  const PermissionCategory = sequelize.define("PermissionCategory", {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    display_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(7), // e.g. #1677ff
      allowNull: true,
      defaultValue: '#1677ff',
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: "permission_categories",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ['name'],
        unique: true
      },
      {
        fields: ['sort_order']
      }
    ]
  });

  PermissionCategory.associate = (models) => {
    PermissionCategory.hasMany(models.EnhancedPermission, {
      foreignKey: "category_id",
      as: "permissions",
    });
  };

  return PermissionCategory;
};