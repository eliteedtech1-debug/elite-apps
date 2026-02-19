const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../models');
const db = require('../../config/database');

// Define the SalesTransaction model
const SalesTransaction = sequelize.define('SalesTransaction', {
  sale_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false
  },
  sale_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  sale_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  customer_type: {
    type: DataTypes.ENUM('Student', 'Parent', 'Staff', 'External'),
    defaultValue: 'Student'
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  customer_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  payment_method: {
    type: DataTypes.ENUM('Cash', 'Bank Transfer', 'Card', 'Cheque', 'Mobile Money', 'Credit'),
    defaultValue: 'Cash'
  },
  payment_status: {
    type: DataTypes.ENUM('Pending', 'Partial', 'Paid', 'Refunded'),
    defaultValue: 'Pending'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  branch_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  school_id: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  sold_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sales_transactions',
  timestamps: true,
  // Prevent Sequelize from modifying the table structure
  freezeTableName: true,
  indexes: [
    {
      fields: ['school_id', 'sale_date']
    },
    {
      fields: ['branch_id', 'sale_date']
    },
    {
      fields: ['customer_id']
    },
    {
      fields: ['payment_status']
    }
  ]
});

// Static methods for additional functionality

// Find sales transactions by school with filters
SalesTransaction.findBySchool = async function(schoolId, filters = {}) {
  const whereClause = { school_id: schoolId };

  // Apply filters
  if (filters.branch_id) whereClause.branch_id = filters.branch_id;
  if (filters.customer_id) whereClause.customer_id = filters.customer_id;
  if (filters.customer_type) whereClause.customer_type = filters.customer_type;
  if (filters.payment_method) whereClause.payment_method = filters.payment_method;
  if (filters.payment_status) whereClause.payment_status = filters.payment_status;
  if (filters.sold_by) whereClause.sold_by = filters.sold_by;

  // Date range filter
  if (filters.start_date || filters.end_date) {
    whereClause.sale_date = {};
    if (filters.start_date) whereClause.sale_date[Op.gte] = filters.start_date;
    if (filters.end_date) whereClause.sale_date[Op.lte] = filters.end_date;
  }

  // Search filter (sale_number, customer_name)
  if (filters.search) {
    whereClause[Op.or] = [
      { sale_number: { [Op.like]: `%${filters.search}%` } },
      { customer_name: { [Op.like]: `%${filters.search}%` } }
    ];
  }

  return await this.findAll({
    where: whereClause,
    limit: parseInt(filters.limit) || 50,
    offset: parseInt(filters.offset) || 0,
    order: [['sale_date', 'DESC'], ['createdAt', 'DESC']]
  });
};

// Find sales transaction by ID
SalesTransaction.findById = async function(saleId) {
  return await this.findOne({
    where: { sale_id: saleId }
  });
};

// Get sales summary statistics
SalesTransaction.getSalesSummary = async (school_id, start_date, end_date) => {
  const query = `
    SELECT 
      COUNT(*) as total_sales,
      SUM(total_amount) as total_revenue,
      SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) as completed_sales,
      SUM(CASE WHEN payment_status = 'Pending' THEN 1 ELSE 0 END) as pending_sales,
      SUM(CASE WHEN payment_status = 'Partial' THEN 1 ELSE 0 END) as partial_sales,
      AVG(total_amount) as average_sale_value,
      SUM(discount_amount) as total_discounts,
      SUM(tax_amount) as total_tax_collected
    FROM sales_transactions
    WHERE school_id = ? AND sale_date BETWEEN ? AND ?
  `;

  const [rows] = await db.execute(query, [school_id, start_date, end_date]);
  return rows[0];
};

// Get sales by product report
SalesTransaction.getSalesByProductReport = async (school_id, filters = {}) => {
  let query = `
    SELECT p.product_name, p.sku, 
           SUM(sti.quantity) as total_quantity_sold,
           SUM(sti.total_price) as total_revenue,
           AVG(sti.unit_price) as average_unit_price
    FROM sales_transaction_items sti
    JOIN sales_transactions st ON sti.sale_id = st.sale_id
    JOIN products p ON sti.product_id = p.product_id
    WHERE st.school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND st.sale_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.branch_id) {
    query += ' AND st.branch_id = ?';
    params.push(filters.branch_id);
  }

  query += ' GROUP BY sti.product_id, p.product_name, p.sku ORDER BY total_revenue DESC';

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get sales by customer report
SalesTransaction.getSalesByCustomerReport = async (school_id, filters = {}) => {
  let query = `
    SELECT 
      customer_type,
      customer_name,
      COUNT(*) as total_transactions,
      SUM(total_amount) as total_spent,
      AVG(total_amount) as average_transaction_value,
      MAX(sale_date) as last_purchase_date
    FROM sales_transactions
    WHERE school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND sale_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.customer_type) {
    query += ' AND customer_type = ?';
    params.push(filters.customer_type);
  }

  if (filters.payment_method) {
    query += ' AND payment_method = ?';
    params.push(filters.payment_method);
  }

  query += ' GROUP BY customer_type, customer_name ORDER BY total_spent DESC';

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get sales trend analysis
SalesTransaction.getSalesTrendAnalysis = async (school_id, filters = {}) => {
  let query = `
    SELECT 
      DATE(sale_date) as date,
      COUNT(*) as transaction_count,
      SUM(total_amount) as daily_revenue
    FROM sales_transactions
    WHERE school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND sale_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  } else {
    // Default to last 30 days if no date range provided
    query += ' AND sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  }

  query += ' GROUP BY DATE(sale_date) ORDER BY sale_date ASC';

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get payment status report
SalesTransaction.getPaymentStatusReport = async (school_id, filters = {}) => {
  let query = `
    SELECT 
      payment_status,
      COUNT(*) as count,
      SUM(total_amount) as total_amount,
      SUM(amount_paid) as total_paid,
      (SUM(total_amount) - SUM(amount_paid)) as outstanding_amount
    FROM sales_transactions
    WHERE school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND sale_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.branch_id) {
    query += ' AND branch_id = ?';
    params.push(filters.branch_id);
  }

  if (filters.payment_method) {
    query += ' AND payment_method = ?';
    params.push(filters.payment_method);
  }

  query += ' GROUP BY payment_status ORDER BY total_amount DESC';

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get profitability report
SalesTransaction.getProfitabilityReport = async (school_id, filters = {}) => {
  let query = `
    SELECT 
      p.product_name, p.sku,
      SUM(sti.quantity) as total_units_sold,
      SUM(sti.total_price) as total_revenue,
      SUM(sti.quantity * sti.cost_price) as total_cost,
      (SUM(sti.total_price) - SUM(sti.quantity * sti.cost_price)) as total_profit,
      ((SUM(sti.total_price) - SUM(sti.quantity * sti.cost_price)) / SUM(sti.total_price) * 100) as profit_margin
    FROM sales_transaction_items sti
    JOIN sales_transactions st ON sti.sale_id = st.sale_id
    JOIN products p ON sti.product_id = p.product_id
    WHERE st.school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND st.sale_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.branch_id) {
    query += ' AND st.branch_id = ?';
    params.push(filters.branch_id);
  }

  query += ' GROUP BY sti.product_id, p.product_name, p.sku ORDER BY total_profit DESC';

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get sales summary report
SalesTransaction.getSalesSummaryReport = async (school_id, filters = {}) => {
  let query = `
    SELECT st.sale_number, st.sale_date, st.customer_name, st.customer_type,
           st.total_amount, st.payment_status, st.payment_method,
           st.subtotal, st.discount_amount, st.tax_amount,
           st.amount_paid, sl.branch_name
    FROM sales_transactions st
    LEFT JOIN school_locations sl ON st.branch_id = sl.branch_id
    WHERE st.school_id = ?
  `;

  const params = [school_id];

  if (filters.start_date && filters.end_date) {
    query += ' AND st.sale_date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  if (filters.branch_id) {
    query += ' AND st.branch_id = ?';
    params.push(filters.branch_id);
  }

  if (filters.customer_type) {
    query += ' AND st.customer_type = ?';
    params.push(filters.customer_type);
  }

  if (filters.payment_method) {
    query += ' AND st.payment_method = ?';
    params.push(filters.payment_method);
  }

  if (filters.payment_status) {
    query += ' AND st.payment_status = ?';
    params.push(filters.payment_status);
  }

  query += ' ORDER BY st.sale_date DESC';

  if (filters.limit) {
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
  }

  const [rows] = await db.execute(query, params);
  return rows;
};

// Get sales summary (simpler version for dashboard)
SalesTransaction.getSalesSummary = async (school_id, branch_id = null) => {
  let query = `
    SELECT 
      COUNT(*) as total_sales,
      SUM(total_amount) as total_revenue,
      SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) as paid_sales,
      SUM(CASE WHEN payment_status = 'Pending' THEN 1 ELSE 0 END) as pending_sales,
      AVG(total_amount) as avg_sale_value
    FROM sales_transactions
    WHERE school_id = ?
  `;

  const params = [school_id];

  if (branch_id) {
    query += ' AND branch_id = ?';
    params.push(branch_id);
  }

  const [rows] = await db.execute(query, params);
  return rows[0];
};

// Get recent transactions
SalesTransaction.getRecentTransactions = async (school_id, branch_id = null, limit = 10) => {
  let query = `
    SELECT st.sale_number, st.sale_date, st.customer_name, st.customer_type,
           st.total_amount, st.payment_status, st.payment_method,
           st.sold_by, u.name as seller_name, sl.branch_name
    FROM sales_transactions st
    LEFT JOIN users u ON st.sold_by = u.id
    LEFT JOIN school_locations sl ON st.branch_id = sl.branch_id
    WHERE st.school_id = ?
  `;

  const params = [school_id];

  if (branch_id) {
    query += ' AND st.branch_id = ?';
    params.push(branch_id);
  }

  query += ' ORDER BY st.sale_date DESC, st.created_at DESC LIMIT ?';
  params.push(limit);

  const [rows] = await db.execute(query, params);
  return rows;
};

module.exports = SalesTransaction;