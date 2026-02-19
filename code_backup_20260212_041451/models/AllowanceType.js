const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AllowanceType = sequelize.define('AllowanceType', {
    allowance_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    allowance_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    allowance_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
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
    is_general: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_taxable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    tableName: 'allowance_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
   indexes: [
    {
      unique: true,
      fields: ['allowance_code', 'school_id', 'branch_id'],
      name: 'uniq_allowance_code_school_branch'
    }
  ]
  });

  AllowanceType.associate = (models) => {
    AllowanceType.belongsToMany(models.Staff, {
      through: models.StaffAllowance,
      foreignKey: 'allowance_id',
      otherKey: 'staff_id',
      as: 'staff'
    });
  };

  return AllowanceType;
};
