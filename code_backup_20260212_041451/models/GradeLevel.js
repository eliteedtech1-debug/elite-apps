'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GradeLevel = sequelize.define('GradeLevel', {
    grade_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    grade_name: { type: DataTypes.STRING(50), allowNull: false },
    grade_code: { type: DataTypes.STRING(10), allowNull: false },
    description: { type: DataTypes.TEXT },
    basic_salary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },
    increment_rate: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },
    minimum_years_for_increment: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    maximum_steps: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    notes: { type: DataTypes.TEXT },
    effective_date: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    school_id: { type: DataTypes.STRING(10), allowNull: false },
    branch_id: { type: DataTypes.STRING(10), allowNull: true }
  }, {
    tableName: 'grade_levels',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  GradeLevel.associate = (models) => {
    
    GradeLevel.hasMany(models.Staff, { foreignKey: 'grade_id', as: 'staff' });
  };

  return GradeLevel;
};
