'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChatbotKnowledgeBase extends Model {
    static associate(models) {
      // No associations needed for now
    }
  }

  ChatbotKnowledgeBase.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    keywords: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    intent: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    sequelize,
    modelName: 'ChatbotKnowledgeBase',
    tableName: 'chatbot_knowledge_base',
    timestamps: true,
    underscored: true
  });

  return ChatbotKnowledgeBase;
};