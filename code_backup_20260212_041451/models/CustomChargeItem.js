const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomChargeItem = sequelize.define('CustomChargeItem', {
    charge_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    charge_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    charge_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    item_category: {
      type: DataTypes.ENUM('Fees', 'Items', 'Discount', 'Fines', 'Penalties', 'Refunds', 'Other Revenue', 'Expenses'),
      allowNull: false,
      defaultValue: 'Fees'
    },
    account_type: {
      type: DataTypes.ENUM('ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE'),
      allowNull: false,
      defaultValue: 'REVENUE'
    },
    normal_balance: {
      type: DataTypes.ENUM('DEBIT', 'CREDIT'),
      allowNull: false,
      defaultValue: 'CREDIT'
    },
    default_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    is_taxable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    is_mandatory: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    applicable_classes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of class codes this charge applies to'
    },
    applicable_terms: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of terms this charge applies to'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'DRAFT'),
      defaultValue: 'ACTIVE'
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    created_by: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'custom_charge_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['school_id', 'branch_id']
      },
      {
        fields: ['item_category']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['charge_code', 'school_id']
      }
    ]
  });

  // Define associations
  CustomChargeItem.associate = (models) => {
    // Add associations here if needed
  };

  return CustomChargeItem;
};