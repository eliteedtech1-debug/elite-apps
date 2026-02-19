'use strict';
const { DataTypes } = require('sequelize');

/**
 * StaffAttendance Model
 *
 * Tracks staff attendance including GPS-based check-ins,
 * manual entries, and biometric imports.
 *
 * Key Features:
 * - GPS-based attendance with location tracking
 * - Multiple attendance methods (GPS, Manual, Biometric, Import)
 * - Check-in and check-out times
 * - Distance tracking from branch location
 * - Multiple attendance statuses
 */
module.exports = (sequelize) => {
  const StaffAttendance = sequelize.define('StaffAttendance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    staff_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'References teachers.id (staff record)'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'References users.id'
    },
    school_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'School identifier for multi-tenancy'
    },
    branch_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Branch identifier for multi-location schools'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Attendance date (YYYY-MM-DD)'
    },
    check_in_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Check-in timestamp'
    },
    check_out_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Check-out timestamp (optional)'
    },
    method: {
      type: DataTypes.ENUM('GPS', 'Manual', 'Biometric', 'Import'),
      allowNull: true,
      defaultValue: 'GPS',
      comment: 'Method used to mark attendance'
    },
    gps_lat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: 'GPS latitude at check-in (for GPS method)'
    },
    gps_lon: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: 'GPS longitude at check-in (for GPS method)'
    },
    distance_from_branch: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Distance from branch in meters (for GPS method)'
    },
    status: {
      type: DataTypes.ENUM('Present', 'Late', 'Absent', 'Half-Day', 'Leave'),
      allowNull: true,
      defaultValue: 'Present',
      comment: 'Attendance status'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes or comments'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID who created this record'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID who last updated this record'
    }
  }, {
    tableName: 'staff_attendance',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      // Composite index for quick lookups
      { fields: ['school_id', 'staff_id', 'date'] },
      { fields: ['school_id', 'branch_id', 'date'] },
      { fields: ['school_id', 'date', 'status'] },
      { fields: ['method'] }
    ]
  });

  // Define associations
  StaffAttendance.associate = (models) => {
    // Associate with Staff (teachers table)
    if (models.Staff) {
      StaffAttendance.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        targetKey: 'staff_id', // Maps to teachers.id via Staff model
        as: 'staff'
      });
    }

    // Associate with User
    if (models.User) {
      StaffAttendance.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    // Associate with SchoolSetup
    if (models.SchoolSetup) {
      StaffAttendance.belongsTo(models.SchoolSetup, {
        foreignKey: 'school_id',
        as: 'school'
      });
    }

    // Associate with SchoolLocation (branch)
    if (models.SchoolLocation) {
      StaffAttendance.belongsTo(models.SchoolLocation, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
    }
  };

  return StaffAttendance;
};
