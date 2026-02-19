const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GradeAllowancePackage = sequelize.define('GradeAllowancePackage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    grade_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'If true, this package is automatically assigned to staff with this grade'
    },
    effective_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    created_by: {
      type: DataTypes.STRING(50)
    }
  }, {
    tableName: 'grade_allowance_packages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['grade_id', 'package_id', 'effective_date'],
        name: 'uniq_grade_package_date'
      }
    ]
  });

  GradeAllowancePackage.associate = (models) => {
    GradeAllowancePackage.belongsTo(models.GradeLevel, {
      foreignKey: 'grade_id',
      as: 'grade'
    });
    GradeAllowancePackage.belongsTo(models.AllowancePackage, {
      foreignKey: 'package_id',
      as: 'package'
    });
  };

  return GradeAllowancePackage;
};
