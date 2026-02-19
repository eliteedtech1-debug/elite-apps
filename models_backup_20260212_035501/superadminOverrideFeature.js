module.exports = (sequelize, DataTypes) => {
  const SuperadminOverrideFeature = sequelize.define('SuperadminOverrideFeature', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    superadmin_id: { type: DataTypes.INTEGER, allowNull: false },
    menu_item_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'superadmin_override_features',
    timestamps: false
  });

  return SuperadminOverrideFeature;
};
