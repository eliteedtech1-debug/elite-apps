module.exports = (sequelize, DataTypes) => {
  const MaintenanceRequest = sequelize.define('MaintenanceRequest', {
    request_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    asset_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    request_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'),
      defaultValue: 'Pending'
    },
    school_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'maintenance_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return MaintenanceRequest;
};
