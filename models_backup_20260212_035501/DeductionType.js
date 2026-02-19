const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DeductionType = sequelize.define('DeductionType', {
        deduction_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        deduction_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        deduction_code: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true
        },
        calculation_type: {
            type: DataTypes.ENUM('fixed', 'percentage'),
            allowNull: false
        },
        default_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0.00
        },
        default_percentage: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0.00
        },
        frequency: {
            type: DataTypes.ENUM('monthly', 'per_annum'),
            allowNull: false,
            defaultValue: 'monthly'
        },
        is_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        description: {
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
        tableName: 'deduction_types',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

   DeductionType.associate = (models) => {
        DeductionType.belongsToMany(models.Staff, {
            through: models.StaffDeduction,
            foreignKey: 'deduction_id',
            otherKey: 'staff_id',
            as: 'staff'
        });
    };


    return DeductionType;
};
