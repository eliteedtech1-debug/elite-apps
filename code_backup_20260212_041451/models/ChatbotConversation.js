'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChatbotConversation extends Model {
    static associate(models) {
      ChatbotConversation.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        required: false
      });
      ChatbotConversation.belongsTo(models.SupportTicket, {
        foreignKey: 'ticketId',
        as: 'ticket',
        required: false
      });
    }
  }

  ChatbotConversation.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'session_id'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id'
    },
    userMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'user_message'
    },
    botResponse: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'bot_response'
    },
    intent: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true
    },
    escalatedToHuman: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'escalated_to_human'
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'ticket_id'
    }
  }, {
    sequelize,
    modelName: 'ChatbotConversation',
    tableName: 'chatbot_conversations',
    timestamps: true,
    underscored: true
  });

  return ChatbotConversation;
};