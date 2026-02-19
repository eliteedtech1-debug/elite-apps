const { DataTypes } = require('sequelize');
const { sequelize } = require('../../models');

// Define the StockAdjustment model
const StockAdjustment = sequelize.define('StockAdjustment', {
  adjustment_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false
  },
  adjustment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  adjustment_type: {
    type: DataTypes.ENUM('Physical Count', 'Damage', 'Theft', 'Expiry', 'Correction', 'Other'),
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
  branch_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  old_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  new_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantity_difference: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  school_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'stock_adjustments',
  timestamps: true,
  // Prevent Sequelize from modifying the table structure
  freezeTableName: true,
  indexes: [
    {
      fields: ['branch_id', 'adjustment_date']
    },
    {
      fields: ['product_id', 'adjustment_date']
    }
  ]
});

module.exports = StockAdjustment;