const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Define the Product model
  const Product = sequelize.define('Product', {
    product_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    product_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    category_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unit_of_measure: {
      type: DataTypes.STRING(50),
      defaultValue: 'piece'
    },
    has_variants: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    supplier_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    reorder_level: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'products',
    timestamps: true,
    // Prevent Sequelize from modifying the table structure
    freezeTableName: true,
    indexes: [
      {
        fields: ['school_id', 'product_id']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['sku']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Static methods for additional functionality beyond basic CRUD

  // Get inventory statistics by school
  Product.getInventoryStatistics = async (school_id, branch_id = null) => {
    let query = `
      SELECT 
        COUNT(*) as total_products,
        SUM(ps.quantity_available * ps.selling_price) as total_value,
        SUM(CASE WHEN ps.quantity_available <= p.reorder_level THEN 1 ELSE 0 END) as low_stock_items
      FROM products p
      LEFT JOIN product_stock ps ON p.product_id = ps.product_id
      WHERE p.school_id = ? AND p.is_active = true
    `;

    const params = [school_id];

    if (branch_id) {
      query += ' AND ps.branch_id = ?';
      params.push(branch_id);
    }

    const [rows] = await sequelize.query(query, { replacements: params });
    // Note: db.execute uses replacements in newer sequelize versions or we use sequelize.query
    // Original code used db.execute, assuming it meant sequelize.query with replacements.
    // However, db object is not available here easily unless we pass it or use sequelize directly.
    // sequelize.query returns [results, metadata].
    return rows[0];
  };

  // Get inventory summary report
  Product.getInventorySummaryReport = async (school_id, filters = {}) => {
    let query = `
      SELECT p.product_name, p.sku, pc.category_name, ps.quantity_available,
             ps.cost_price, ps.selling_price, p.reorder_level,
             (ps.quantity_available * ps.selling_price) as total_value,
             sl.branch_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      LEFT JOIN product_stock ps ON p.product_id = ps.product_id
      LEFT JOIN school_locations sl ON ps.branch_id = sl.branch_id
      WHERE p.school_id = ? AND p.is_active = true
    `;

    const params = [school_id];

    if (filters.branch_id) {
      query += ' AND ps.branch_id = ?';
      params.push(filters.branch_id);
    }

    if (filters.category_id) {
      query += ' AND p.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.search) {
      query += ' AND (p.product_name LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY ps.quantity_available ASC';

    const [rows] = await sequelize.query(query, { replacements: params });
    return rows;
  };

  // Get low stock report
  Product.getLowStockReport = async (school_id, filters = {}) => {
    let query = `
      SELECT p.product_name, p.sku, pc.category_name, ps.quantity_available,
             p.reorder_level, ps.branch_id, sl.branch_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      LEFT JOIN product_stock ps ON p.product_id = ps.product_id
      LEFT JOIN school_locations sl ON ps.branch_id = sl.branch_id
      WHERE p.school_id = ? 
      AND p.is_active = true
      AND ps.quantity_available <= p.reorder_level
    `;

    const params = [school_id];

    if (filters.branch_id) {
      query += ' AND ps.branch_id = ?';
      params.push(filters.branch_id);
    }

    if (filters.category_id) {
      query += ' AND p.category_id = ?';
      params.push(filters.category_id);
    }

    query += ' ORDER BY ps.quantity_available ASC';

    const [rows] = await sequelize.query(query, { replacements: params });
    return rows;
  };

  // Get products by category
  Product.getByCategory = async (category_id) => {
    const query = `
      SELECT p.*, pc.category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      WHERE p.category_id = ?
      AND p.is_active = true
      ORDER BY p.product_name
    `;

    const [rows] = await sequelize.query(query, { replacements: [category_id] });
    return rows;
  };

  // Find products by school with filters
  Product.findBySchool = async (school_id, filters = {}) => {
    let query = `
      SELECT p.*, pc.category_name, ps.quantity_available, ps.cost_price, ps.selling_price, sl.branch_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      LEFT JOIN product_stock ps ON p.product_id = ps.product_id
      LEFT JOIN school_locations sl ON ps.branch_id = sl.branch_id
      WHERE p.school_id = ? AND p.is_active = ?
    `;

    const params = [school_id, true];

    if (filters.category_id) {
      query += ' AND p.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.search) {
      query += ' AND (p.product_name LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.brand) {
      query += ' AND p.brand = ?';
      params.push(filters.brand);
    }

    if (filters.has_variants !== undefined) {
      query += ' AND p.has_variants = ?';
      params.push(filters.has_variants);
    }

    query += ' ORDER BY p.product_name';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(parseInt(filters.offset));
      }
    }

    const [rows] = await sequelize.query(query, { replacements: params });
    return rows;
  };

  // Find product by ID
  Product.findById = async (product_id) => {
    const query = `
      SELECT p.*, pc.category_name, ps.quantity_available, ps.cost_price, ps.selling_price, sl.branch_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      LEFT JOIN product_stock ps ON p.product_id = ps.product_id
      LEFT JOIN school_locations sl ON ps.branch_id = sl.branch_id
      WHERE p.product_id = ?
    `;

    const [rows] = await sequelize.query(query, { replacements: [product_id] });
    return rows[0] || null;
  };

  // Update product by ID
  Product.update = async (product_id, updateData) => {
    const allowedFields = [
      'product_name', 'sku', 'category_id', 'description', 'unit_of_measure',
      'has_variants', 'brand', 'supplier_id', 'reorder_level', 'is_active',
      'image_url', 'notes'
    ];

    const updateFields = Object.keys(updateData).filter(key =>
      allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE products SET ${setClause}, updated_at = NOW() WHERE product_id = ?`;

    const values = updateFields.map(field => updateData[field]);
    values.push(product_id);

    const [result] = await sequelize.query(query, { replacements: values });
    return result;
  };

  // Delete (soft delete) product by ID
  Product.delete = async (product_id) => {
    const query = `UPDATE products SET is_active = false, updated_at = NOW() WHERE product_id = ?`;
    const [result] = await sequelize.query(query, { replacements: [product_id] });
    return result;
  };

  return Product;
};
