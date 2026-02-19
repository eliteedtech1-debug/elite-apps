module.exports = (sequelize, DataTypes) => {
  const SuperadminFeature = sequelize.define('SuperadminFeature', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    superadmin_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    feature_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    granted_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    granted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'superadmin_features',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['superadmin_user_id', 'feature_id'], name: 'uk_superadmin_feature' },
      { fields: ['superadmin_user_id'] }
    ]
  });

  SuperadminFeature.associate = (models) => {
    SuperadminFeature.belongsTo(models.User, { foreignKey: 'superadmin_user_id', as: 'superadmin' });
    SuperadminFeature.belongsTo(models.Feature, { foreignKey: 'feature_id', as: 'feature' });
    SuperadminFeature.belongsTo(models.User, { foreignKey: 'granted_by', as: 'grantor' });
  };

  return SuperadminFeature;
};
