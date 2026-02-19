const { DataTypes } = require('sequelize');
const PayrollLine = require('./PayrollLine');

module.exports = (sequelize) => {
    const PayrollPeriod = sequelize.define('PayrollPeriod', {
        period_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        period_month: {
            type: DataTypes.STRING(7), // e.g. "2025-08"
            allowNull: false
        },
        period_year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_month_num: {
            type: DataTypes.INTEGER, // e.g. 8 for August
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('draft', 'initiated', 'approved', 'locked'),
            defaultValue: 'draft'
        },
        total_staff: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_basic_salary: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0.00
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
        total_net_pay: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0.00
        },
        initiated_by: {
            type: DataTypes.INTEGER
        },
        initiated_at: {
            type: DataTypes.DATE
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
        tableName: 'payroll_periods',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Associations
    const PayrollLineModel = PayrollLine(sequelize);

    PayrollPeriod.hasMany(PayrollLineModel, { foreignKey: 'period_id', as: 'payrollLines' });
    // PayrollLineModel.belongsTo(PayrollPeriod, { foreignKey: 'period_id', as: 'period' });

    return PayrollPeriod;
};
