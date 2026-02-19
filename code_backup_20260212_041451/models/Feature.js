module.exports = (sequelize, DataTypes) => {
  const Feature = sequelize.define('Feature', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    feature_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'feature_key'
    },
    feature_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    parent_feature_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    menu_label: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    menu_label_ar: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    menu_icon: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    route_path: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_menu_item: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    required_user_types: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'features',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['feature_key']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  Feature.associate = (models) => {
    Feature.belongsTo(models.FeatureCategory, {
      foreignKey: 'category_id',
      as: 'category'
    });
    
    Feature.hasMany(models.RolePermission, {
      foreignKey: 'feature_id',
      as: 'rolePermissions'
    });
    
    Feature.hasMany(models.UserPermissionOverride, {
      foreignKey: 'feature_id',
      as: 'userOverrides'
    });
  };

  return Feature;
};
