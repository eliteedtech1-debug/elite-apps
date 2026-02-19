'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WhatsAppMessage extends Model {
    static associate(models) {
      // Define associations if needed
    }
  }

  WhatsAppMessage.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    total_sent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_failed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    message_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    recipients: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of recipient phone numbers'
    },
    results: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed send results'
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Cost in local currency'
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'WhatsAppMessage',
    tableName: 'whatsapp_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
  });

  return WhatsAppMessage;
};
