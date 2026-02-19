const StockAdjustment = require('../../models/retailInventory/StockAdjustment');
const ProductStock = require('../../models/retailInventory/ProductStock');
const StockTransaction = require('../../models/retailInventory/StockTransaction');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class StockAdjustmentController {
  // Create new stock adjustment
  async createAdjustment(req, res) {
    try {
      const { 
        adjustment_type, product_id, variant_id, branch_id, 
        old_quantity, new_quantity, reason, approved_by 
      } = req.body;
      const { school_id, id: user_id } = req.user;

      const adjustment_id = generateId('ADJ');
      const adjustment_date = new Date().toISOString().split('T')[0]; // Today's date

      // Calculate the difference
      const quantity_difference = new_quantity - old_quantity;

      const adjustmentData = {
        adjustment_id,
        adjustment_date,
        adjustment_type,
        product_id,
        variant_id: variant_id || null,
        branch_id,
        old_quantity,
        new_quantity,
        quantity_difference,
        reason,
        approved_by: approved_by || null, // Can be approved by someone else
        school_id,
        created_by: user_id
      };

      await StockAdjustment.create(adjustmentData);

      // Update the product stock
      const stock = await ProductStock.findByProductBranch(product_id, branch_id, variant_id);
      if (stock) {
        await ProductStock.updateQuantity(stock.stock_id, quantity_difference, 'adjustment');
      } else {
        // If no stock record exists, create one with the new quantity
        await ProductStock.createOrUpdate({
          product_id,
          variant_id: variant_id || null,
          branch_id,
          quantity_on_hand: new_quantity,
          cost_price: 0, // Placeholder
          selling_price: 0, // Placeholder
          school_id
        });
      }

      // Create a stock transaction record
      const transaction_id = generateId('STOCK-TRANS');
      
      const transactionData = {
        transaction_id,
        transaction_type: 'Adjustment',
        product_id,
        variant_id: variant_id || null,
        branch_id,
        quantity: quantity_difference, // positive for additions, negative for deductions
        unit_cost: 0, // Cost not applicable for adjustments
        reference_type: 'Stock Adjustment',
        reference_id: adjustment_id,
        notes: `Stock adjustment: ${reason}`,
        transaction_date: adjustment_date,
        school_id,
        created_by: user_id
      };

      await StockTransaction.create(transactionData);

      return successResponse(res, 'Stock adjustment created successfully', { adjustment_id }, 201);
    } catch (error) {
      console.error('Create stock adjustment error:', error);
      return errorResponse(res, 'Failed to create stock adjustment', 500);
    }
  }

  // Get all stock adjustments with filters
  async getAdjustments(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        branch_id: req.query.branch_id,
        product_id: req.query.product_id,
        variant_id: req.query.variant_id,
        adjustment_type: req.query.adjustment_type,
        created_by: req.query.created_by,
        approved_by: req.query.approved_by,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        search: req.query.search,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      const adjustments = await StockAdjustment.findBySchool(school_id, filters);

      return successResponse(res, 'Stock adjustments retrieved successfully', adjustments);
    } catch (error) {
      console.error('Get stock adjustments error:', error);
      return errorResponse(res, 'Failed to retrieve stock adjustments', 500);
    }
  }

  // Get single stock adjustment by ID
  async getAdjustmentById(req, res) {
    try {
      const { adjustment_id } = req.params;

      const adjustment = await StockAdjustment.findById(adjustment_id);

      if (!adjustment) {
        return errorResponse(res, 'Stock adjustment not found', 404);
      }

      return successResponse(res, 'Stock adjustment retrieved successfully', adjustment);
    } catch (error) {
      console.error('Get stock adjustment error:', error);
      return errorResponse(res, 'Failed to retrieve stock adjustment', 500);
    }
  }

  // Get stock adjustment summary by type
  async getAdjustmentSummary(req, res) {
    try {
      const { school_id } = req.user;

      const summary = await StockAdjustment.getAdjustmentSummary(school_id);

      return successResponse(res, 'Stock adjustment summary retrieved successfully', summary);
    } catch (error) {
      console.error('Get stock adjustment summary error:', error);
      return errorResponse(res, 'Failed to retrieve stock adjustment summary', 500);
    }
  }
}

module.exports = new StockAdjustmentController();