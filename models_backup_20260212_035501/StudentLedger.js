const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudentLedger = sequelize.define('StudentLedger', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    student_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Reference to students table'
    },
    admission_no: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Student admission number'
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'School identifier'
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Branch identifier'
    },
    transaction_type: {
      type: DataTypes.ENUM('credit', 'debit', 'settlement'),
      allowNull: false,
      comment: 'Type of ledger transaction'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Transaction amount'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Transaction description'
    },
    term: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Academic term'
    },
    academic_year: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Academic year'
    },
    reference_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Reference to payment or bill ID'
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
    tableName: 'student_ledger',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['student_id'] },
      { fields: ['admission_no'] },
      { fields: ['school_id', 'branch_id'] },
      { fields: ['transaction_type'] },
      { fields: ['created_at'] }
    ]
  });

  // Define associations
  StudentLedger.associate = (models) => {
    // Association with Student model (if exists)
    if (models.Student) {
      StudentLedger.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student'
      });
    }
  };

  return StudentLedger;
};
