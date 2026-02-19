const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const StaffAllowance = sequelize.define(
    "StaffAllowance",
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
      allowance_id: {
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
      tableName: "staff_allowances",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  StaffAllowance.associate = (models) => {
    // ✅ Associate with Staff
      StaffAllowance.belongsTo(models.Staff, {
        foreignKey: "staff_id",
        as: "staffAllowances"   // <-- alias is staffAllowances
      });


    // ✅ Associate with Allowance (assuming you have an Allowance model)
    StaffAllowance.belongsTo(models.AllowanceType, {
      foreignKey: "allowance_id",
      as: "allowance",
    });
  };

  return StaffAllowance;
};
