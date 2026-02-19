const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AllowancePackage = sequelize.define('AllowancePackage', {
    package_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    package_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    package_code: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(20)
    },
    created_by: {
      type: DataTypes.STRING(50)
    }
  }, {
    tableName: 'allowance_packages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['package_code', 'school_id', 'branch_id'],
        name: 'uniq_package_code_school_branch'
      },
      {
        fields: ['school_id', 'branch_id'],
        name: 'idx_package_school'
      },
      {
        fields: ['is_active'],
        name: 'idx_package_active'
      }
    ]
  });

  AllowancePackage.associate = (models) => {
    AllowancePackage.belongsToMany(models.AllowanceType, {
      through: models.AllowancePackageItem,
      foreignKey: 'package_id',
      otherKey: 'allowance_id',
      as: 'allowances'
    });
  };

  return AllowancePackage;
};
