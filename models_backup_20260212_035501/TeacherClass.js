const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeacherClass = sequelize.define('TeacherClass', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    class_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('Form Master', 'Subject Teacher'),
      defaultValue: 'Subject Teacher'
    },
    class_level: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    class_code: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'teacher_classes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  TeacherClass.associate = function(models) {
    TeacherClass.belongsTo(models.Staff, {
      foreignKey: 'teacher_id',
      as: 'teacher'
    });
  };

  return TeacherClass;
};