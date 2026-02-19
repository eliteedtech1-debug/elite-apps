const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IdCardFinancialTracking = sequelize.define('IdCardFinancialTracking', {
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
    card_generation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cost_type: {
      type: DataTypes.ENUM('generation', 'printing', 'premium_template', 'bulk_discount'),
      allowNull: false
    },
    base_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    total_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    billing_status: {
      type: DataTypes.ENUM('pending', 'billed', 'paid', 'waived'),
      allowNull: false,
      defaultValue: 'pending'
    },
    payment_entry_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true
    },
    journal_entry_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'id_card_financial_tracking',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_school_billing',
        fields: ['school_id', 'billing_status']
      },
      {
        name: 'idx_cost_tracking',
        fields: ['cost_type', 'created_at']
      }
    ]
  });

  IdCardFinancialTracking.associate = function(models) {
    IdCardFinancialTracking.belongsTo(models.PaymentEntry, { 
      foreignKey: 'payment_entry_id',
      as: 'paymentEntry'
    });
    IdCardFinancialTracking.belongsTo(models.JournalEntry, { 
      foreignKey: 'journal_entry_id',
      as: 'journalEntry'
    });
  };

  return IdCardFinancialTracking;
};