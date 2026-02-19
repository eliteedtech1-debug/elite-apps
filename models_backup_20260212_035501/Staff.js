'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Staff = sequelize.define('Staff', {
    staff_id: {  // 👈 maps to teachers.id but renamed for consistency
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'  // Maps to 'id' column in database
    },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    passport_url: { type: DataTypes.STRING(200), allowNull: true },
    user_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Teacher' },
    staff_type: { type: DataTypes.STRING(30), allowNull: true },
    staff_role: { type: DataTypes.STRING(30), allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    sex: { type: DataTypes.STRING(10), allowNull: true },
    age: { type: DataTypes.INTEGER, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    date_of_birth: { type: DataTypes.STRING(20), allowNull: true },
    marital_status: { type: DataTypes.STRING(50), allowNull: true },
    state_of_origin: { type: DataTypes.STRING(100), allowNull: true },
    mobile_no: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false },
    qualification: { type: DataTypes.STRING(255), allowNull: true },
    working_experience: { type: DataTypes.TEXT, allowNull: true },
    religion: { type: DataTypes.STRING(50), allowNull: true },
    last_place_of_work: { type: DataTypes.STRING(255), allowNull: true },
    account_name: { type: DataTypes.STRING(255), allowNull: true },
    account_number: { type: DataTypes.STRING(50), allowNull: true },
    bank: { type: DataTypes.STRING(100), allowNull: true },
    branch_id: { type: DataTypes.STRING(20), allowNull: true },
    school_id: { type: DataTypes.STRING(10), allowNull: false },
    grade_id: { type: DataTypes.INTEGER, allowNull: true },
    step: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM('Active', 'Suspended', 'Pending', 'Retired'),
      defaultValue: 'Pending'
    },
    payroll_status: {
      type: DataTypes.ENUM('Enrolled', 'Suspended', 'Pending'),
      defaultValue: 'Pending'
    },
    date_enrolled: { type: DataTypes.DATE, allowNull: true },
    date_suspended: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'teachers',  // 👈 points to teachers table
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['school_id', 'email'] },
      { unique: true, fields: ['school_id', 'mobile_no'] }
    ]
  });
  
  Staff.associate = (models) => {
    Staff.belongsTo(models.GradeLevel, { foreignKey: 'grade_id', as: 'grade' });
    // Removed GradeStep association since we're using calculated steps
    Staff.belongsToMany(models.DeductionType, {
      through: models.StaffDeduction,
      foreignKey: 'staff_id',
      otherKey: 'deduction_id',
      as: 'deductions',
    });
    Staff.hasMany(models.PayrollLine, { foreignKey: 'staff_id', as: 'payrollLines' });
    Staff.hasMany(models.StaffAllowance, { foreignKey: 'staff_id', as: 'allowances' });
    Staff.hasMany(models.StaffDeduction, { foreignKey: 'staff_id', as: 'staffDeductions' });
    Staff.hasMany(models.Loan, { foreignKey: 'staff_id', as: 'staffLoans' });
  };

  return Staff;
};
