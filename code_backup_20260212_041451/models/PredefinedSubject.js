'use strict';

module.exports = (sequelize, DataTypes) => {
  const PredefinedSubject = sequelize.define('PredefinedSubject', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Core'
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Nursery, Primary, Junior Secondary, Senior Secondary'
    },
    stream: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'For Senior Secondary: General, Science, Arts, Commercial, Technical'
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'NULL for system-wide, specific school_id for school-specific subjects'
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active'
    }
  }, {
    tableName: 'predefined_subjects',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['section', 'stream'] },
      { fields: ['school_id'] }
    ]
  });

  return PredefinedSubject;
};
