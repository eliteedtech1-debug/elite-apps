const StockTransaction = require('../../models/retailInventory/StockTransaction');
const Product = require('../../models/retailInventory/Product');
const ProductVariant = require('../../models/retailInventory/ProductVariant');
const SchoolLocation = require('../../models/SchoolLocation');
const User = require('../../models/user');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class StockTransactionController {
  // Get all stock transactions with filters
  async getStockTransactions(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        branch_id: req.query.branch_id,
        product_id: req.query.product_id,
        variant_id: req.query.variant_id,
        transaction_type: req.query.transaction_type,
        reference_type: req.query.reference_type,
        reference_id: req.query.reference_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      // Base query
      let query = `
        SELECT st.*, 
               p.product_name,
               p.sku,
               pv.variant_name,
               u.name as created_by_name,
               sl.branch_name
        FROM stock_transactions st
        LEFT JOIN products p ON st.product_id = p.product_id
        LEFT JOIN product_variants pv ON st.variant_id = pv.variant_id
        LEFT JOIN users u ON st.created_by = u.id
        LEFT JOIN school_locations sl ON st.branch_id = sl.branch_id
        WHERE st.school_id = ?
      `;
      const params = [school_id];

      // Apply filters
      if (filters.branch_id) {
        query += ' AND st.branch_id = ?';
        params.push(filters.branch_id);
      }
      
      if (filters.product_id) {
        query += ' AND st.product_id = ?';
        params.push(filters.product_id);
      }
      
      if (filters.variant_id) {
        query += ' AND st.variant_id = ?';
        params.push(filters.variant_id);
      }
      
      if (filters.transaction_type) {
        query += ' AND st.transaction_type = ?';
        params.push(filters.transaction_type);
      }
      
      if (filters.reference_type) {
        query += ' AND st.reference_type = ?';
        params.push(filters.reference_type);
      }
      
      if (filters.reference_id) {
        query += ' AND st.reference_id = ?';
        params.push(filters.reference_id);
      }
      
      if (filters.start_date && filters.end_date) {
        query += ' AND st.transaction_date BETWEEN ? AND ?';
        params.push(filters.start_date, filters.end_date);
      }

      if (filters.search) {
        query += ' AND (p.product_name LIKE ? OR p.sku LIKE ? OR st.reference_id LIKE ?)';
        const searchParam = `%${filters.search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      query += ' ORDER BY st.transaction_date DESC, st.created_at DESC';

      if (filters.limit > 0) {
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, filters.offset);
      }

      const [transactions] = await StockTransaction.sequelize.query(query, {
        replacements: params,
        type: StockTransaction.sequelize.QueryTypes.SELECT
      });

      return successResponse(res, 'Stock transactions retrieved successfully', transactions);
    } catch (error) {
      console.error('Get stock transactions error:', error);
      return errorResponse(res, 'Failed to retrieve stock transactions', 500);
    }
  }

  // Get single stock transaction by ID
  async getStockTransactionById(req, res) {
    try {
      const { transaction_id } = req.params;
      const { school_id } = req.user;

      const query = `
        SELECT st.*, 
               p.product_name,
               p.sku,
               pv.variant_name,
               u.name as created_by_name,
               sl.branch_name
        FROM stock_transactions st
        LEFT JOIN products p ON st.product_id = p.product_id
        LEFT JOIN product_variants pv ON st.variant_id = pv.variant_id
        LEFT JOIN users u ON st.created_by = u.id
        LEFT JOIN school_locations sl ON st.branch_id = sl.branch_id
        WHERE st.transaction_id = ? AND st.school_id = ?
      `;

      const [transactions] = await StockTransaction.sequelize.query(query, {
        replacements: [transaction_id, school_id],
        type: StockTransaction.sequelize.QueryTypes.SELECT
      });

      if (!transactions || transactions.length === 0) {
        return errorResponse(res, 'Stock transaction not found', 404);
      }

      return successResponse(res, 'Stock transaction retrieved successfully', transactions[0]);
    } catch (error) {
      console.error('Get stock transaction error:', error);
      return errorResponse(res, 'Failed to retrieve stock transaction', 500);
    }
  }

  // Get stock transaction summary for dashboard
  async getStockTransactionSummary(req, res) {
    try {
      const { school_id } = req.user;
      const { branch_id } = req.query;

      let query = `
        SELECT 
          transaction_type,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) as total_in,
          SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END) as total_out,
          COUNT(DISTINCT product_id) as unique_products
        FROM stock_transactions
        WHERE school_id = ?
      `;
      const params = [school_id];

      if (branch_id) {
        query += ' AND branch_id = ?';
        params.push(branch_id);
      }

      query += ' GROUP BY transaction_type ORDER BY transaction_type';

      const [summary] = await StockTransaction.sequelize.query(query, {
        replacements: params,
        type: StockTransaction.sequelize.QueryTypes.SELECT
      });

      return successResponse(res, 'Stock transaction summary retrieved successfully', summary);
    } catch (error) {
      console.error('Get stock transaction summary error:', error);
      return errorResponse(res, 'Failed to retrieve stock transaction summary', 500);
    }
  }

  // Create a new stock transaction
  async createStockTransaction(req, res) {
    try {
      const {
        transaction_type,
        product_id,
        variant_id,
        branch_id,
        quantity,
        unit_cost,
        reference_type,
        reference_id,
        transaction_date,
        notes
      } = req.body;
      
      const { school_id, id: user_id } = req.user;

      // Validate required fields
      if (!transaction_type || !product_id || !branch_id || quantity === undefined) {
        return errorResponse(res, 'Transaction type, product_id, branch_id, and quantity are required', 400);
      }

      // Validate transaction type
      const validTypes = ['Purchase', 'Sale', 'Adjustment', 'Transfer', 'Return', 'Damage'];
      if (!validTypes.includes(transaction_type)) {
        return errorResponse(res, 'Invalid transaction type', 400);
      }

      // Validate transaction date
      const date = transaction_date || new Date().toISOString().split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return errorResponse(res, 'Invalid transaction date format. Use YYYY-MM-DD', 400);
      }

      // Generate transaction ID
      const transaction_id = generateId('ST');

      // Prepare transaction data
      const transactionData = {
        transaction_id,
        transaction_type,
        product_id,
        branch_id,
        quantity: parseInt(quantity),
        unit_cost: unit_cost ? parseFloat(unit_cost) : null,
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        transaction_date: date,
        school_id,
        created_by: user_id,
        notes: notes || null
      };

      // If variant_id provided, add it to transaction data
      if (variant_id) {
        transactionData.variant_id = variant_id;
      }

      // Create the stock transaction
      const newTransaction = await StockTransaction.create(transactionData);

      return successResponse(res, 'Stock transaction created successfully', newTransaction, 201);
    } catch (error) {
      console.error('Create stock transaction error:', error);
      return errorResponse(res, 'Failed to create stock transaction', 500);
    }
  }

  // Get stock transaction trends by date
  async getStockTransactionTrends(req, res) {
    try {
      const { school_id } = req.user;
      const { branch_id, start_date, end_date, transaction_type } = req.query;

      let query = `
        SELECT 
          DATE(transaction_date) as date,
          transaction_type,
          SUM(quantity) as total_quantity,
          COUNT(*) as transaction_count
        FROM stock_transactions
        WHERE school_id = ?
      `;
      const params = [school_id];

      if (branch_id) {
        query += ' AND branch_id = ?';
        params.push(branch_id);
      }

      if (start_date && end_date) {
        query += ' AND transaction_date BETWEEN ? AND ?';
        params.push(start_date, end_date);
      } else {
        // Default to last 30 days
        query += ' AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      }

      if (transaction_type) {
        query += ' AND transaction_type = ?';
        params.push(transaction_type);
      }

      query += ' GROUP BY DATE(transaction_date), transaction_type ORDER BY date ASC';

      const [trends] = await StockTransaction.sequelize.query(query, {
        replacements: params,
        type: StockTransaction.sequelize.QueryTypes.SELECT
      });

      return successResponse(res, 'Stock transaction trends retrieved successfully', trends);
    } catch (error) {
      console.error('Get stock transaction trends error:', error);
      return errorResponse(res, 'Failed to retrieve stock transaction trends', 500);
    }
  }

  // Get stock value by transaction type
  async getStockValueByTransactionType(req, res) {
    try {
      const { school_id } = req.user;
      const { branch_id, start_date, end_date } = req.query;

      let query = `
        SELECT 
          transaction_type,
          SUM(quantity * IFNULL(unit_cost, 0)) as total_value
        FROM stock_transactions
        WHERE school_id = ?
      `;
      const params = [school_id];

      if (branch_id) {
        query += ' AND branch_id = ?';
        params.push(branch_id);
      }

      if (start_date && end_date) {
        query += ' AND transaction_date BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      query += ' GROUP BY transaction_type ORDER BY total_value DESC';

      const [results] = await StockTransaction.sequelize.query(query, {
        replacements: params,
        type: StockTransaction.sequelize.QueryTypes.SELECT
      });

      return successResponse(res, 'Stock value by transaction type retrieved successfully', results);
    } catch (error) {
      console.error('Get stock value by transaction type error:', error);
      return errorResponse(res, 'Failed to retrieve stock value', 500);
    }
  }
}

module.exports = new StockTransactionController();