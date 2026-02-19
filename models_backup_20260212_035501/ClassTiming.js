'use strict';

module.exports = (sequelize, DataTypes) => {
  const ClassTiming = sequelize.define('ClassTiming', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    start_time: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    end_time: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    activities: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'class_timing',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['school_id']
      },
      {
        fields: ['section']
      },
      {
        fields: ['school_id', 'section']
      }
    ]
  });

  ClassTiming.associate = function(models) {
    // Define associations here if needed
    // For example, if you have a School model:
    // ClassTiming.belongsTo(models.School, {
    //   foreignKey: 'school_id',
    //   as: 'school'
    // });
  };

  return ClassTiming;
};