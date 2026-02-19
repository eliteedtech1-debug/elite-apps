const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Syllabus = sequelize.define('Syllabus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    subject: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    class_code: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    term: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    week: {
      type: DataTypes.TINYINT,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Ongoing', 'Onhold', 'Deleted'),
      defaultValue: 'Pending'
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: true
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
    tableName: 'syllabus',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Syllabus;
};