const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const SalaryStructureHistory = sequelize.define(
    "SalaryStructureHistory",
    {
      history_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      grade_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      old_basic_salary: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      new_basic_salary: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      old_increment_rate: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      new_increment_rate: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      change_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      school_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      branch_id: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "salary_structure_history",
      timestamps: false, // only created_at is tracked
    }
  );

  SalaryStructureHistory.associate = (models) => {
    SalaryStructureHistory.belongsTo(models.GradeLevel, {
      foreignKey: "grade_id",
      as: "grade",
      onDelete: "CASCADE",
    });
  };

  return SalaryStructureHistory;
};
