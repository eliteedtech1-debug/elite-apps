module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      table_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      record_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      old_values: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      new_values: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "audit_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return AuditLog;
};
