const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EliteLog extends Model {}

  EliteLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'announcement'),
      defaultValue: 'info'
    },
    category: {
      type: DataTypes.ENUM('system', 'academic', 'finance', 'attendance', 'general'),
      defaultValue: 'general'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read'
    },
    readAt: {
      type: DataTypes.DATE,
      field: 'read_at'
    },
    actionUrl: {
      type: DataTypes.STRING(500),
      field: 'action_url'
    },
    metadata: {
      type: DataTypes.JSON
    },
    schoolId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'school_id'
    },
    branchId: {
      type: DataTypes.STRING(200),
      field: 'branch_id'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by'
    }
  }, {
    sequelize,
    modelName: 'EliteLog',
    tableName: 'elite_logs',
    timestamps: true,
    underscored: true
  });

  return EliteLog;
};
