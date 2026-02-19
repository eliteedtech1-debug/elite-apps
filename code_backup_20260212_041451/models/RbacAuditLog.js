const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RbacAuditLog = sequelize.define('RbacAuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    action: {
      type: DataTypes.ENUM('assign', 'revoke', 'create', 'update', 'delete'),
      allowNull: false
    },
    target_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    role_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    performed_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'rbac_audit_log',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return RbacAuditLog;
};
