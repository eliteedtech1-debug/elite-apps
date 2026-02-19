const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AllowancePackageItem = sequelize.define('AllowancePackageItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    allowance_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2)
    }
  }, {
    tableName: 'allowance_package_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['package_id', 'allowance_id'],
        name: 'uniq_package_allowance'
      }
    ]
  });

  AllowancePackageItem.associate = (models) => {
    AllowancePackageItem.belongsTo(models.AllowancePackage, {
      foreignKey: 'package_id',
      as: 'package'
    });
    AllowancePackageItem.belongsTo(models.AllowanceType, {
      foreignKey: 'allowance_id',
      as: 'allowance'
    });
  };

  return AllowancePackageItem;
};
