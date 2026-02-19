const { DataTypes } = require('sequelize');
const { sequelize } = require('../../models');

// Define the PurchaseOrderItem model
const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  po_item_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false
  },
  po_id: {
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
  quantity_ordered: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  quantity_received: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  unit_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'purchase_order_items',
  timestamps: true,
  indexes: [
    {
      fields: ['po_id', 'po_item_id']
    },
    {
      fields: ['product_id']
    }
  ],
  // Prevent Sequelize from modifying the table structure
  freezeTableName: true
});

// Define associations for foreign key relationships
PurchaseOrderItem.associate = (models) => {
  // Purchase Order association
  if (models.PurchaseOrder) {
    PurchaseOrderItem.belongsTo(models.PurchaseOrder, {
      foreignKey: 'po_id',
      targetKey: 'po_id',
      as: 'purchaseOrder'
    });
  }

  // Product association
  if (models.Product) {
    PurchaseOrderItem.belongsTo(models.Product, {
      foreignKey: 'product_id',
      targetKey: 'product_id',
      as: 'product'
    });
  }

  // Product Variant association
  if (models.ProductVariant) {
    PurchaseOrderItem.belongsTo(models.ProductVariant, {
      foreignKey: 'variant_id',
      targetKey: 'variant_id',
      as: 'variant'
    });
  }
};

// Static methods for additional functionality beyond basic CRUD

// Find purchase order items by PO ID
PurchaseOrderItem.findByPO = async (po_id) => {
  const query = `
    SELECT poi.*,
           p.product_name,
           p.sku,
           pv.variant_name
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_id = p.product_id
    LEFT JOIN product_variants pv ON poi.variant_id = pv.variant_id
    WHERE poi.po_id = ?
    ORDER BY poi.created_at ASC
  `;

  const [rows] = await PurchaseOrderItem.sequelize.query(query, {
    replacements: [po_id],
    type: PurchaseOrderItem.sequelize.QueryTypes.SELECT
  });

  return rows;
};

// Find purchase order item by ID
PurchaseOrderItem.findById = async (po_item_id) => {
  const query = `
    SELECT poi.*,
           p.product_name,
           p.sku,
           pv.variant_name
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_id = p.product_id
    LEFT JOIN product_variants pv ON poi.variant_id = pv.variant_id
    WHERE poi.po_item_id = ?
  `;

  const [rows] = await PurchaseOrderItem.sequelize.query(query, {
    replacements: [po_item_id],
    type: PurchaseOrderItem.sequelize.QueryTypes.SELECT
  });

  return rows[0] || null;
};

// Update received quantity
PurchaseOrderItem.updateReceivedQuantity = async (po_item_id, quantity_received) => {
  const query = `
    UPDATE purchase_order_items
    SET quantity_received = quantity_received + ?,
        updated_at = NOW()
    WHERE po_item_id = ?
  `;

  return await PurchaseOrderItem.sequelize.query(query, {
    replacements: [quantity_received, po_item_id],
    type: PurchaseOrderItem.sequelize.QueryTypes.UPDATE
  });
};

module.exports = PurchaseOrderItem;