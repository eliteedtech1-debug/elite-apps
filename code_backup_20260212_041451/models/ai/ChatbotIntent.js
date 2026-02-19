'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChatbotIntent extends Model {
    static associate(models) {
      // No associations needed for now
    }
  }

  ChatbotIntent.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    patterns: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    responses: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    requiresEscalation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'requires_escalation'
    },
    createsTicket: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'creates_ticket'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    sequelize,
    modelName: 'ChatbotIntent',
    tableName: 'chatbot_intents',
    timestamps: true,
    underscored: true
  });

  return ChatbotIntent;
};