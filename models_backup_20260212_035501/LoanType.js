const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoanType = sequelize.define('LoanType', {
    loan_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    loan_type_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    loan_type_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    },
    max_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    min_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00
    },
    interest_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    max_duration_months: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    min_duration_months: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    processing_fee_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    eligibility_criteria: {
      type: DataTypes.JSON,
      allowNull: true
    },
    required_documents: {
      type: DataTypes.JSON,
      allowNull: true
    },
    auto_approval_limit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Loans below this amount can be auto-approved'
    },
    requires_guarantor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    tableName: 'loan_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['loan_type_code', 'school_id', 'branch_id']
      },
      {
        fields: ['school_id', 'branch_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Define associations
  LoanType.associate = (models) => {
    LoanType.hasMany(models.Loan, { 
      foreignKey: 'loan_type_id', 
      as: 'loans',
      onDelete: 'RESTRICT'
    });
    
    LoanType.belongsTo(models.Staff, { 
      foreignKey: 'created_by', 
      as: 'creator'
    });
    
    LoanType.belongsTo(models.Staff, { 
      foreignKey: 'updated_by', 
      as: 'updater'
    });
  };

  return LoanType;
};
