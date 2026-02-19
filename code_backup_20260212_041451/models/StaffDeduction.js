const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const StaffDeduction = sequelize.define(
    "StaffDeduction",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      staff_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      deduction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      effective_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "staff_deductions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  StaffDeduction.associate = (models) => {

    
    // ✅ Associate with Staff
    StaffDeduction.belongsTo(models.Staff, {
      foreignKey: "staff_id",
      as: "staff",
    });

    // ✅ Associate with DeductionType
    StaffDeduction.belongsTo(models.DeductionType, {
      foreignKey: "deduction_id",
      as: "deduction",
    });
  };

  return StaffDeduction;
};
