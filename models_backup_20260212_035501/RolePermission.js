module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    feature_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'features',
        key: 'id'
      }
    },
    can_view: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    can_create: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_edit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_delete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_export: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_approve: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'role_permissions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'feature_id']
      }
    ]
  });

  RolePermission.associate = (models) => {
    RolePermission.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role'
    });
    
    RolePermission.belongsTo(models.Feature, {
      foreignKey: 'feature_id',
      as: 'feature'
    });
  };

  return RolePermission;
};
