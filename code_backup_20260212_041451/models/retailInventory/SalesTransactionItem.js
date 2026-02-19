const { DataTypes } = require('sequelize');
const { sequelize } = require('../../models');

// Define the SalesTransactionItem model
const SalesTransactionItem = sequelize.define('SalesTransactionItem', {
  sale_item_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false
  },
  sale_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  product_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  variant_id: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  cost_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'sales_transaction_items',
  timestamps: true,
  // Prevent Sequelize from modifying the table structure
  freezeTableName: true,
  indexes: [
    {
      fields: ['sale_id', 'sale_item_id']
    },
    {
      fields: ['product_id']
    }
  ]
});

module.exports = SalesTransactionItem;