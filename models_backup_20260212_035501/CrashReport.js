'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CrashReport extends Model {
    static associate(models) {
      CrashReport.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        allowNull: true
      });
    }
  }

  CrashReport.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    schoolId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    branchId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stackTrace: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    componentStack: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deviceInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('deviceInfo');
        if (!rawValue) return null;
        try {
          return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        } catch (e) {
          return rawValue;
        }
      },
      set(value) {
        if (value === null || value === undefined) {
          this.setDataValue('deviceInfo', null);
        } else {
          this.setDataValue('deviceInfo', typeof value === 'string' ? value : JSON.stringify(value));
        }
      }
    },
    appVersion: {
      type: DataTypes.STRING,
      allowNull: true
    },
    os: {
      type: DataTypes.STRING,
      allowNull: true
    },
    browser: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('uncaught_error', 'unhandled_promise_rejection', 'console_error', 'reported_error', 'generic_error'),
      defaultValue: 'generic_error'
    }
  }, {
    sequelize,
    modelName: 'CrashReport',
    tableName: 'crash_reports',
    timestamps: true,
    underscored: true,
    // Prevent Sequelize from modifying the table structure
    freezeTableName: true
  });

  return CrashReport;
};