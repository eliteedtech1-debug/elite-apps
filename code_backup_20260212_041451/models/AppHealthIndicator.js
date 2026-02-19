'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AppHealthIndicator extends Model {
    static associate(models) {
      // No associations needed for this model
    }
  }

  AppHealthIndicator.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },
    uptimePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    averageResponseTime: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    errorRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    crashCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    userSatisfaction: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    activeUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    apiSuccessRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AppHealthIndicator',
    tableName: 'app_health_indicators',
    timestamps: true,
    underscored: true
  });

  return AppHealthIndicator;
};