'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportTicket extends Model {
    static associate(models) {
      SupportTicket.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      SupportTicket.belongsTo(models.User, {
        foreignKey: 'assigned_to',
        as: 'assignedAgent'
      });
      SupportTicket.hasMany(models.TicketMessage, {
        foreignKey: 'ticketId',
        as: 'messages'
      });
    }
  }

  SupportTicket.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for anonymous users
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Anonymous user contact information (used when user_id is null)
    anonymous_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    anonymous_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    anonymous_phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('open', 'in-progress', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    category: {
      type: DataTypes.ENUM('technical', 'billing', 'feature-request', 'account', 'onboarding', 'other'),
      defaultValue: 'other'
    },
    response_time: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    resolution_time: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SupportTicket',
    tableName: 'support_tickets',
    timestamps: true,
    underscored: true
  });

  return SupportTicket;
};