
// models/Loan.js - Enhanced Loan Model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Loan = sequelize.define('Loan', {
    loan_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    loan_reference: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'teachers',
        key: 'id'
      }
    },
    loan_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'loan_types',
        key: 'loan_type_id'
      }
    },
    principal_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    interest_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    monthly_deduction: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    balance_remaining: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    processing_fee: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00
    },
    duration_months: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    expected_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    actual_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'suspended', 'rejected', 'defaulted'),
      defaultValue: 'active'  // Loans are active by default - school has already approved
    },
    approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved'  // Loans are pre-approved - just recording them
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teachers',
        key: 'id'
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    suspended_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teachers',
        key: 'id'
      }
    },
    suspended_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    liquidation_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Amount paid for early liquidation'
    },
    liquidation_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    guarantor_staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teachers',
        key: 'id'
      }
    },
    guarantor_approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    payment_frequency: {
      type: DataTypes.ENUM('monthly', 'bi-weekly', 'weekly'),
      defaultValue: 'monthly'
    },
    next_payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    payments_made: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    last_payment_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT
    },
    school_id: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'loans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['loan_reference']
      },
      {
        fields: ['staff_id']
      },
      {
        fields: ['loan_type_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['school_id', 'branch_id']
      },
      {
        fields: ['start_date']
      },
      {
        fields: ['next_payment_date']
      }
    ]
  });

  Loan.associate = (models) => {
  // Main staff member who took the loan
  Loan.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
  // Staff member who approved the loan
  Loan.belongsTo(models.Staff, { foreignKey: 'approved_by', as: 'approver' });
  // Staff member who suspended the loan
  Loan.belongsTo(models.Staff, { foreignKey: 'suspended_by', as: 'suspender' });
  // Staff member who is the guarantor
  Loan.belongsTo(models.Staff, { foreignKey: 'guarantor_staff_id', as: 'guarantor' });
  // Loan type association
  Loan.belongsTo(models.LoanType, { foreignKey: 'loan_type_id', as: 'loanType' });
  // Related payments
  Loan.hasMany(models.LoanPayment, { foreignKey: 'loan_id', as: 'payments' });
  // Status history
  Loan.hasMany(models.LoanStatusHistory, { foreignKey: 'loan_id', as: 'statusHistory' });
};

  return Loan;
};