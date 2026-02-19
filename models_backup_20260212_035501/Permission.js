// models/permission.js
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define("Permission", {
    permission_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    permission_key: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
    },
    permission_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    feature_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: "permissions",
    timestamps: false,
    // Prevent Sequelize from modifying the table structure
    freezeTableName: true
  });

  Permission.associate = (models) => {
    Permission.belongsTo(models.Feature, {
      foreignKey: "feature_id",
      as: "feature",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    Permission.belongsToMany(models.Role, {
    through: "role_permissions",
    foreignKey: "permission_id",
    otherKey: "role_id",
    as: "roles"
  });

  };

  return Permission;
};
