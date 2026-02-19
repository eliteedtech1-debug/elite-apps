'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TicketMessage extends Model {
    static associate(models) {
      TicketMessage.belongsTo(models.SupportTicket, {
        foreignKey: 'ticket_id',
        as: 'ticket'
      });
      TicketMessage.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender'
      });
    }
  }

  TicketMessage.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'ticket_id',
      references: {
        model: 'support_tickets',
        key: 'id'
      }
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sender_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isFromUser: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_from_user'
    },
    isAutomated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_automated'
    }
  }, {
    sequelize,
    modelName: 'TicketMessage',
    tableName: 'ticket_messages',
    timestamps: true,
    underscored: true
  });

  return TicketMessage;
};