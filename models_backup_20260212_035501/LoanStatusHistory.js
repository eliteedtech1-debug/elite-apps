const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const LoanStatusHistory = sequelize.define('LoanStatusHistory', {
    history_id: {
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
    old_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    changed_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'staff_id'
      }
    },
    change_reason: {
      type: DataTypes.TEXT
    },
    changed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    additional_data: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'loan_status_history',
    timestamps: false,
    indexes: [
      {
        fields: ['loan_id']
      },
      {
        fields: ['changed_by']
      },
      {
        fields: ['changed_at']
      }
    ]
  });

  LoanStatusHistory.associate = (models) => {
    LoanStatusHistory.belongsTo(models.Loan, { 
      foreignKey: 'loan_id', 
      as: 'loan'
    });
    
    LoanStatusHistory.belongsTo(models.Staff, { 
      foreignKey: 'changed_by', 
      as: 'changer'
    });
  };

  return LoanStatusHistory;
};