const db = require('../../config/database');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class StockManagementController {
  // Get stock levels by product, branch, and optional variant
  async getStockLevels(req, res) {
    try {
      const { school_id } = req.user;
      const { limit = 50 } = req.query;

      const query = `
        SELECT 
          ps.*,
          p.product_name,
          p.sku,
          pc.category_name,
          sl.branch_name
        FROM product_stock ps
        LEFT JOIN products p ON ps.product_id = p.product_id
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        LEFT JOIN school_locations sl ON ps.branch_id = sl.branch_id
        WHERE ps.school_id = ?
        LIMIT ?
      `;

      const [results] = await db.query(query, [school_id, parseInt(limit)]);

      return successResponse(res, 'Stock levels retrieved successfully', results);
    } catch (error) {
      console.error('Get stock levels error:', error);
      return errorResponse(res, 'Failed to retrieve stock levels', 500);
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(req, res) {
    try {
      const { school_id } = req.user;

      const query = `
        SELECT 
          ps.*,
          p.product_name,
          p.sku,
          pc.category_name,
          p.reorder_level
        FROM product_stock ps
        LEFT JOIN products p ON ps.product_id = p.product_id
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        WHERE ps.school_id = ? 
        AND ps.quantity_on_hand <= p.reorder_level
      `;

      const [results] = await db.query(query, [school_id]);

      return successResponse(res, 'Low stock alerts retrieved successfully', results);
    } catch (error) {
      console.error('Get low stock alerts error:', error);
      return errorResponse(res, 'Failed to retrieve low stock alerts', 500);
    }
  }

  // Get stock value summary
  async getStockValueSummary(req, res) {
    try {
      const { school_id } = req.user;

      const query = `
        SELECT 
          COUNT(*) as total_items,
          SUM(ps.quantity_on_hand * ps.cost_price) as total_cost_value,
          SUM(ps.quantity_on_hand * ps.selling_price) as total_selling_value,
          SUM(ps.quantity_on_hand * (ps.selling_price - ps.cost_price)) as potential_profit
        FROM product_stock ps
        WHERE ps.school_id = ?
      `;

      const [results] = await db.query(query, [school_id]);
      const summary = results[0] || {};

      return successResponse(res, 'Stock value summary retrieved successfully', summary);
    } catch (error) {
      console.error('Get stock value summary error:', error);
      return errorResponse(res, 'Failed to retrieve stock value summary', 500);
    }
  }

  // Adjust stock level
  async adjustStock(req, res) {
    try {
      const { 
        product_id, variant_id, branch_id, quantity_change, 
        reason, reference_type, reference_id 
      } = req.body;
      const { school_id, id: user_id } = req.user;

      // Update stock quantity
      const updateQuery = `
        UPDATE product_stock 
        SET quantity_on_hand = quantity_on_hand + ?
        WHERE product_id = ? AND branch_id = ? AND school_id = ?
      `;

      await db.query(updateQuery, [quantity_change, product_id, branch_id, school_id]);

      return successResponse(res, 'Stock adjusted successfully', {
        product_id,
        quantity_change,
        adjusted_by: user_id
      });
    } catch (error) {
      console.error('Adjust stock error:', error);
      return errorResponse(res, 'Failed to adjust stock', 500);
    }
  }
}

module.exports = new StockManagementController();