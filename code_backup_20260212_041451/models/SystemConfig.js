'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const SystemConfig = sequelize.define("SystemConfig", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    config_key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    config_value: { type: DataTypes.TEXT },
    config_type: { 
      type: DataTypes.ENUM("string", "number", "boolean", "json"),
      defaultValue: "string"
    },
    description: { type: DataTypes.TEXT },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
    updated_by: { type: DataTypes.STRING(100) }
  }, {
    tableName: "system_config",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  return SystemConfig;
};
