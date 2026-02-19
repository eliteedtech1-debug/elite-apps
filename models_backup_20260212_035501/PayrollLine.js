  const { DataTypes } = require('sequelize');

  module.exports = (sequelize) => {
    const PayrollLine = sequelize.define('PayrollLine', {
      payroll_line_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      period_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'payroll_periods',
          key: 'period_id'
        }
      },
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'staff',
          key: 'staff_id'
        }
      },
      basic_salary: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      total_allowances: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0.00
      },
      total_deductions: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0.00
      },
      total_loans: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0.00
      },
      gross_pay: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      net_pay: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      is_processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
      }
    }, {
      tableName: 'payroll_lines',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // Associations
    PayrollLine.associate = (models) => {
      PayrollLine.belongsTo(models.PayrollPeriod, { foreignKey: 'period_id', as: 'period' });
      PayrollLine.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });  // ✅ Added
    };

    return PayrollLine;
  };
