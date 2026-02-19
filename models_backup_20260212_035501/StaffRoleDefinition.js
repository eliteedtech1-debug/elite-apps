module.exports = (sequelize, DataTypes) => {
  const StaffRoleDefinition = sequelize.define('StaffRoleDefinition', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    role_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_system_role: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    default_feature_access: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'staff_role_definitions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return StaffRoleDefinition;
};
