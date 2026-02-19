const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  // Define the ProductStock model
  const ProductStock = sequelize.define('ProductStock', {
    stock_id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
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
    quantity_on_hand: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    quantity_reserved: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    quantity_available: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.quantity_on_hand - this.quantity_reserved;
      }
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    selling_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    last_updated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'product_stock',
    timestamps: true,
    // Prevent Sequelize from modifying the table structure
    freezeTableName: true,
    indexes: [
      {
        fields: ['product_id', 'branch_id']
      },
      {
        fields: ['quantity_available']
      }
    ]
  });

  ProductStock.associate = (models) => {
    ProductStock.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'Product',
    });
    ProductStock.belongsTo(models.SchoolLocation, {
      foreignKey: 'branch_id',
      as: 'SchoolLocation',
    });
  };

  // Static methods for additional functionality

  // Get stock by product and branch
  ProductStock.findByProductBranch = async (product_id, branch_id, variant_id = null) => {
    let query = `
      SELECT ps.*, p.product_name, p.sku
      FROM product_stock ps
      LEFT JOIN products p ON ps.product_id = p.product_id
      WHERE ps.product_id = ? AND ps.branch_id = ?
    `;

    const params = [product_id, branch_id];

    if (variant_id) {
      query += ' AND ps.variant_id = ?';
      params.push(variant_id);
    } else {
      query += ' AND ps.variant_id IS NULL';
    }

    const [rows] = await sequelize.query(query, { replacements: params });
    // Note: using sequelize.query with replacements
    return rows[0];
  };

  // Update quantity
  ProductStock.updateQuantity = async (stock_id, quantity_delta, update_type = 'adjustment') => {
    let query;
    if (update_type === 'sale') {
      // For sales, decrease available quantity
      query = `
        UPDATE product_stock 
        SET quantity_on_hand = quantity_on_hand - ?, 
            quantity_available = quantity_on_hand - quantity_reserved - ?
        WHERE stock_id = ?
      `;
    } else {
      // For other updates, adjust on-hand quantity and recalculate available
      query = `
        UPDATE product_stock 
        SET quantity_on_hand = quantity_on_hand + ?, 
            quantity_available = (quantity_on_hand + ?) - quantity_reserved
        WHERE stock_id = ?
      `;
    }

    const [result] = await sequelize.query(query, {
      replacements: [
        Math.abs(quantity_delta), // for sales, we pass negative value
        Math.abs(quantity_delta), // for other adjustments, we pass positive value
        stock_id
      ]
    });

    return result;
  };

  // Get stock value by school
  ProductStock.getStockValue = async (school_id) => {
    const { Product } = sequelize.models;
    const stockValue = await ProductStock.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity_available')), 'total_items'],
        [sequelize.fn('SUM', sequelize.literal('quantity_available * selling_price')), 'total_selling_value'],
        [sequelize.fn('SUM', sequelize.literal('quantity_available * cost_price')), 'total_cost_value'],
      ],
      include: [
        {
          model: Product,
          as: 'Product',
          attributes: [],
          where: { is_active: true },
        },
      ],
      where: { school_id },
      raw: true,
    });

    return stockValue[0];
  };

  // Get low stock products
  ProductStock.getLowStockProducts = async (school_id) => {
    const { Product, ProductCategory, SchoolLocation } = sequelize.models;
    const lowStockProducts = await ProductStock.findAll({
      where: {
        school_id,
        quantity_available: {
          [Op.lte]: sequelize.col('Product.reorder_level'),
        },
      },
      include: [
        {
          model: Product,
          as: 'Product',
          where: { is_active: true },
          attributes: ['product_name', 'sku', 'reorder_level'],
        },
        {
          model: ProductCategory,
          as: 'ProductCategory',
          attributes: ['category_name'],
        },
        {
          model: SchoolLocation,
          as: 'SchoolLocation',
          attributes: ['branch_name'],
        },
      ],
      order: [['quantity_available', 'ASC']],
    });

    return lowStockProducts;
  };

  // Get stock summary report
  ProductStock.getStockSummaryReport = async (school_id, filters = {}) => {
    let query = `
      SELECT p.product_name, p.sku, pc.category_name,
             ps.quantity_on_hand, ps.quantity_reserved, ps.quantity_available,
             ps.cost_price, ps.selling_price,
             (ps.quantity_available * ps.selling_price) as total_value,
             sl.branch_name
      FROM product_stock ps
      JOIN products p ON ps.product_id = p.product_id
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      LEFT JOIN school_locations sl ON ps.branch_id = sl.branch_id
      WHERE ps.school_id = ? AND p.is_active = true
    `;

    const params = [school_id];

    if (filters.branch_id) {
      query += ' AND ps.branch_id = ?';
      params.push(filters.branch_id);
    }

    if (filters.category_id) {
      query += ' AND pc.category_id = ?';
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

  // Get stock movement report
  ProductStock.getStockMovementReport = async (school_id, filters = {}) => {
    // This would typically join with stock_transactions table
    // For now, returning a simplified version
    return [];
  };

  // Create or update stock record
  ProductStock.createOrUpdate = async (stockData) => {
    const existingStock = await ProductStock.findOne({
      where: {
        product_id: stockData.product_id,
        branch_id: stockData.branch_id,
        variant_id: stockData.variant_id || null
      }
    });

    if (existingStock) {
      // Update existing record
      await existingStock.update(stockData);
      return existingStock;
    } else {
      // Create new record
      const newStock = await ProductStock.create({
        stock_id: require('../../utils/idGenerator').generateId('STOCK'),
        ...stockData
      });
      return newStock;
    }
  };

  // Get stock valuation report
  ProductStock.getStockValuationReport = async (school_id, filters = {}) => {
    let query = `
      SELECT p.product_name, p.sku, pc.category_name,
             SUM(ps.quantity_available) as total_quantity,
             ps.cost_price,
             ps.selling_price,
             (SUM(ps.quantity_available) * ps.cost_price) as total_cost_value,
             (SUM(ps.quantity_available) * ps.selling_price) as total_selling_value,
             ((SUM(ps.quantity_available) * ps.selling_price) - (SUM(ps.quantity_available) * ps.cost_price)) as total_profit
      FROM product_stock ps
      JOIN products p ON ps.product_id = p.product_id
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      WHERE ps.school_id = ? AND p.is_active = true
      GROUP BY p.product_id, ps.cost_price, ps.selling_price
    `;

    const params = [school_id];

    if (filters.branch_id) {
      query += ' AND ps.branch_id = ?';
      params.push(filters.branch_id);
    }

    if (filters.category_id) {
      query += ' AND pc.category_id = ?';
      params.push(filters.category_id);
    }

    query += ' ORDER BY total_quantity DESC';

    const [rows] = await sequelize.query(query, { replacements: params });
    return rows;
  };

  return ProductStock;
};