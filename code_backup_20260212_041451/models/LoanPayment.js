const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const LoanPayment = sequelize.define('LoanPayment', {
    payment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    loan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'loans',
        key: 'loan_id'
      }
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payment_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    principal_portion: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00
    },
    interest_portion: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00
    },
    balance_after_payment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    payment_method: {
      type: DataTypes.ENUM('payroll_deduction', 'cash', 'bank_transfer', 'cheque', 'other'),
      defaultValue: 'payroll_deduction'
    },
    payment_reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_automated: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this payment was automatically processed via payroll'
    },
    processed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'staff',
        key: 'staff_id'
      }
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'loan_payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['loan_id']
      },
      {
        fields: ['payment_date']
      },
      {
        fields: ['payment_method']
      }
    ]
  });

  LoanPayment.associate = (models) => {
    LoanPayment.belongsTo(models.Loan, { 
      foreignKey: 'loan_id', 
      as: 'loan'
    });
    
    LoanPayment.belongsTo(models.Staff, { 
      foreignKey: 'processed_by', 
      as: 'processor'
    });
  };

  return LoanPayment;
};
