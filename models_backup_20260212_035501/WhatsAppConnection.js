'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WhatsAppConnection extends Model {
    static associate(models) {
      // Define associations if needed
    }
  }

  WhatsAppConnection.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Connected WhatsApp number'
    },
    status: {
      type: DataTypes.ENUM('connected', 'disconnected', 'pending', 'error'),
      allowNull: true,
      defaultValue: 'disconnected'
    },
    connected_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    disconnected_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_activity: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_messages_sent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    total_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional connection metadata'
    }
  }, {
    sequelize,
    modelName: 'WhatsAppConnection',
    tableName: 'whatsapp_connections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  return WhatsAppConnection;
};
