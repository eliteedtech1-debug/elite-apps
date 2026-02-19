'use strict';

module.exports = (sequelize, DataTypes) => {
  const LessonTimeTable = sequelize.define('LessonTimeTable', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    day: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    class_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    school_location: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    start_time: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    end_time: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active'
    },
    school_id: {
      type: DataTypes.STRING(20),
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
    tableName: 'lesson_time_table',
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
        fields: ['class_name']
      },
      {
        fields: ['teacher_id']
      },
      {
        fields: ['day']
      },
      {
        fields: ['school_id', 'section', 'class_name']
      }
    ]
  });

  LessonTimeTable.associate = function(models) {
    // Define associations here if needed
    // For example, if you have Teacher and Subject models:
    // LessonTimeTable.belongsTo(models.Teacher, {
    //   foreignKey: 'teacher_id',
    //   as: 'teacher'
    // });
  };

  return LessonTimeTable;
};