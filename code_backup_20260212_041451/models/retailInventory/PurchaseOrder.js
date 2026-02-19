const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../models');
const db = require('../../config/database');  // Added missing import

// Define the PurchaseOrder model
const PurchaseOrder = sequelize.define('PurchaseOrder', {
  po_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false
  },
  po_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  supplier_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  order_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expected_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actual_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Ordered', 'Partially Received', 'Received', 'Cancelled'),
    defaultValue: 'Draft'
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  grand_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  branch_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  school_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'purchase_orders',
  timestamps: true,
  indexes: [
    {
      fields: ['school_id', 'po_id']
    },
    {
      fields: ['supplier_id', 'order_date']
    },
    {
      fields: ['status']
    }
  ],
  // Prevent Sequelize from modifying the table structure
  freezeTableName: true
});

// Define associations for foreign key relationships
PurchaseOrder.associate = (models) => {
  // Supplier association
  if (models.Supplier) {
    PurchaseOrder.belongsTo(models.Supplier, {
      foreignKey: 'supplier_id',
      targetKey: 'supplier_id',
      as: 'supplier'
    });
  }

  // School Location (Branch) association
  if (models.SchoolLocation) {
    PurchaseOrder.belongsTo(models.SchoolLocation, {
      foreignKey: 'branch_id',
      targetKey: 'branch_id',
      as: 'branch'
    });
  }

  // School Setup association
  if (models.SchoolSetup) {
    PurchaseOrder.belongsTo(models.SchoolSetup, {
      foreignKey: 'school_id',
      targetKey: 'school_id',
      as: 'school'
    });
  }

  // User (created_by) association
  if (models.User) {
    PurchaseOrder.belongsTo(models.User, {
      foreignKey: 'created_by',
      targetKey: 'id',
      as: 'createdBy'
    });
  }

  // User (approved_by) association
  if (models.User) {
    PurchaseOrder.belongsTo(models.User, {
      foreignKey: 'approved_by',
      targetKey: 'id',
      as: 'approvedBy'
    });
  }

  // Purchase Order Items association
  if (models.PurchaseOrderItem) {
    PurchaseOrder.hasMany(models.PurchaseOrderItem, {
      foreignKey: 'po_id',
      sourceKey: 'po_id',
      as: 'items'
    });
  }

  // Stock Transactions association (for purchase transactions)
  if (models.StockTransaction) {
    PurchaseOrder.hasMany(models.StockTransaction, {
      foreignKey: 'reference_id',
      sourceKey: 'po_id',
      as: 'stockTransactions'
    });
  }
};

// Static methods for additional functionality beyond basic CRUD

// Get purchase summary report
PurchaseOrder.getPurchaseSummaryReport = async (school_id, filters = {}) => {
  let query = `
    SELECT 
      COUNT(*) as total_orders,
      SUM(grand_total) as total_purchases,
      AVG(grand_total) as average_order_value,
      SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) as completed_orders,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_orders
    FROM purchase_orders
    WHERE school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND order_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.branch_id) {
    query += ' AND branch_id = ?';
    params.push(filters.branch_id);
  }

  if (filters.supplier_id) {
    query += ' AND supplier_id = ?';
    params.push(filters.supplier_id);
  }

  const [rows] = await db.execute(query, params);
  return rows[0];
};

// Get purchase orders by supplier
PurchaseOrder.getPurchaseBySupplierReport = async (school_id, filters = {}) => {
  let query = `
    SELECT s.supplier_name,
           COUNT(*) as total_orders,
           SUM(po.grand_total) as total_spent
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.supplier_id
    WHERE po.school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND po.order_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.status) {
    query += ' AND po.status = ?';
    params.push(filters.status);
  }

  query += ' GROUP BY po.supplier_id, s.supplier_name ORDER BY total_spent DESC';

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get purchase orders by product/category
PurchaseOrder.getPurchaseByProductReport = async (school_id, filters = {}) => {
  let query = `
    SELECT p.product_name, p.sku,
           SUM(poi.quantity_ordered) as total_quantity,
           SUM(poi.total_cost) as total_cost,
           AVG(poi.unit_cost) as average_cost
    FROM purchase_order_items poi
    JOIN purchase_orders po ON poi.po_id = po.po_id
    JOIN products p ON poi.product_id = p.product_id
    WHERE po.school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND po.order_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.supplier_id) {
    query += ' AND po.supplier_id = ?';
    params.push(filters.supplier_id);
  }

  if (filters.status) {
    query += ' AND po.status = ?';
    params.push(filters.status);
  }

  query += ' GROUP BY poi.product_id ORDER BY total_cost DESC';

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get purchase trend analysis
PurchaseOrder.getPurchaseTrendAnalysis = async (school_id, filters = {}) => {
  let query = `
    SELECT
      DATE(order_date) as date,
      COUNT(*) as order_count,
      SUM(grand_total) as total_amount
    FROM purchase_orders
    WHERE school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND order_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  } else {
    // Default to last 30 days
    query += ' AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  }

  query += ' GROUP BY DATE(order_date) ORDER BY order_date ASC';

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get purchase orders by school with filters
PurchaseOrder.findBySchool = async (school_id, filters = {}) => {
  const whereClause = { school_id };

  if (filters.supplier_id) whereClause.supplier_id = filters.supplier_id;
  if (filters.branch_id) whereClause.branch_id = filters.branch_id;
  if (filters.status) whereClause.status = filters.status;
  if (filters.created_by) whereClause.created_by = filters.created_by;

  if (filters.start_date || filters.end_date) {
    whereClause.order_date = {};
    if (filters.start_date) whereClause.order_date[Op.gte] = filters.start_date;
    if (filters.end_date) whereClause.order_date[Op.lte] = filters.end_date;
  }

  if (filters.search) {
    whereClause[Op.or] = [
      { po_number: { [Op.like]: `%${filters.search}%` } }
    ];
  }

  const orders = await PurchaseOrder.findAll({
    where: whereClause,
    order: [['order_date', 'DESC'], ['createdAt', 'DESC']],
    limit: filters.limit ? parseInt(filters.limit) : undefined,
    offset: filters.offset ? parseInt(filters.offset) : undefined,
  });

  return orders;
};

// Find purchase order by ID
PurchaseOrder.findById = async (po_id) => {
  const query = `
    SELECT po.*,
           s.supplier_name,
           u.name as created_by_name,
           u2.name as approved_by_name,
           sl.branch_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
    LEFT JOIN users u ON po.created_by = u.id
    LEFT JOIN users u2 ON po.approved_by = u2.id
    LEFT JOIN school_locations sl ON po.branch_id = sl.branch_id
    WHERE po.po_id = ?
  `;

  const [rows] = await db.execute(query, [po_id]);
  return rows[0] || null;
};

// Update purchase order
PurchaseOrder.update = async (po_id, updateData) => {
  const updateFields = Object.keys(updateData).filter(key =>
    !['po_id', 'school_id', 'created_by', 'created_at'].includes(key)
  );

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const setClause = updateFields.map(field => `${field} = ?`).join(', ');
  const query = `UPDATE purchase_orders SET ${setClause}, updated_at = NOW() WHERE po_id = ?`;

  const values = updateFields.map(field => updateData[field]);
  values.push(po_id);

  return await db.execute(query, values);
};

module.exports = PurchaseOrder;