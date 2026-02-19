const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IdCardBillingConfig = sequelize.define('IdCardBillingConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      index: true
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    service_type: {
      type: DataTypes.ENUM('basic_generation', 'premium_template', 'bulk_printing', 'express_delivery'),
      allowNull: false
    },
    cost_per_unit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    bulk_discount_threshold: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 50
    },
    bulk_discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 10.00
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    billing_frequency: {
      type: DataTypes.ENUM('per_card', 'monthly', 'quarterly', 'annual'),
      allowNull: false,
      defaultValue: 'per_card'
    },
    auto_bill: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'id_card_billing_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_school_service',
        fields: ['school_id', 'service_type', 'is_active']
      }
    ]
  });

  return IdCardBillingConfig;
};