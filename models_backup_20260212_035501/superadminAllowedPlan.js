module.exports = (sequelize, DataTypes) => {
  const SuperadminAllowedPlan = sequelize.define('SuperadminAllowedPlan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    superadmin_id: { type: DataTypes.INTEGER, allowNull: false },
    package_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'superadmin_allowed_plans',
    timestamps: false
  });

  return SuperadminAllowedPlan;
};
