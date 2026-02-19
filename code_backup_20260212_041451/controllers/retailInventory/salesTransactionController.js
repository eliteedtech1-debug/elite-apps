const SalesTransaction = require('../../models/retailInventory/SalesTransaction');
const SalesTransactionItem = require('../../models/retailInventory/SalesTransactionItem');
const ProductStock = require('../../models/retailInventory/ProductStock');
const StockTransaction = require('../../models/retailInventory/StockTransaction');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

console.log('=== SalesTransactionController loaded ===');

class SalesTransactionController {
  // Create new sales transaction
  async createSale(req, res) {
    try {
      const { 
        customer_type, customer_id, customer_name, payment_method, 
        items, notes 
      } = req.body;
      const { school_id, id: user_id, branch_id } = req.user;

      const sale_id = generateId('SALE');
      const sale_number = `SAL-${Date.now()}`; // Generate sale number based on timestamp
      const sale_date = new Date().toISOString().split('T')[0]; // Today's date

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        const itemTotal = item.quantity * item.unit_price;
        const discountAmount = (item.discount_percent || 0) / 100 * itemTotal;
        subtotal += (itemTotal - discountAmount);
      }
      
      const discount_amount = req.body.discount_amount || 0;
      const tax_amount = req.body.tax_amount || 0;
      const total_amount = subtotal + tax_amount - discount_amount;
      const amount_paid = req.body.amount_paid || 0;

      const saleData = {
        sale_id,
        sale_number,
        sale_date,
        customer_type,
        customer_id: customer_id || null,
        customer_name: customer_name || null,
        payment_method,
        payment_status: amount_paid >= total_amount ? 'Paid' : 
                       amount_paid > 0 ? 'Partial' : 'Pending',
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        amount_paid,
        branch_id,
        school_id,
        sold_by: user_id,
        notes
      };

      await SalesTransaction.create(saleData);

      // Create sales transaction items and update stock
      for (const item of items) {
        const item_id = generateId('SALE-ITEM');
        const itemData = {
          sale_item_id: item_id,
          sale_id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          discount_amount: (item.discount_percent || 0) / 100 * (item.quantity * item.unit_price),
          total_price: item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100),
          cost_price: item.cost_price || 0
        };

        await SalesTransactionItem.create(itemData);

        // Update stock levels for the sold items
        await ProductStock.updateQuantity(item.product_id, -item.quantity, 'sale');
        
        // Create stock transaction record
        const transaction_id = generateId('STOCK-TRANS');
        
        const transactionData = {
          transaction_id,
          transaction_type: 'Sale',
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          branch_id,
          quantity: -item.quantity, // Negative for sales
          unit_cost: item.cost_price || 0,
          reference_type: 'Sale',
          reference_id: sale_id,
          notes: `Sale transaction ${sale_number}`,
          transaction_date: sale_date,
          school_id,
          created_by: user_id
        };

        await StockTransaction.create(transactionData);
      }

      return successResponse(res, 'Sales transaction created successfully', { 
        sale_id, 
        sale_number,
        total_amount 
      }, 201);
    } catch (error) {
      console.error('Create sales transaction error:', error);
      return errorResponse(res, 'Failed to create sales transaction', 500);
    }
  }

  // Get all sales transactions with filters
  async getSalesTransactions(req, res) {
    try {
      console.log('=== SalesTransactionController.getSalesTransactions called ===');
      console.log('User:', req.user);
      console.log('Query params:', req.query);
      
      const { school_id } = req.user;
      const filters = {
        branch_id: req.query.branch_id,
        customer_id: req.query.customer_id,
        customer_type: req.query.customer_type,
        payment_method: req.query.payment_method,
        payment_status: req.query.payment_status,
        sold_by: req.query.sold_by,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        search: req.query.search,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      console.log('School ID:', school_id);
      console.log('Filters:', filters);

      const sales = await SalesTransaction.findBySchool(school_id, filters);
      console.log('Sales found:', sales);

      return successResponse(res, 'Sales transactions retrieved successfully', sales);
    } catch (error) {
      console.error('Get sales transactions error:', error);
      return errorResponse(res, 'Failed to retrieve sales transactions', 500);
    }
  }

  // Get single sales transaction by ID
  async getSalesTransactionById(req, res) {
    try {
      const { sale_id } = req.params;

      const sale = await SalesTransaction.findById(sale_id);

      if (!sale) {
        return errorResponse(res, 'Sales transaction not found', 404);
      }

      // Get sales transaction items
      const items = await SalesTransactionItem.getItemsWithProductDetails(sale_id);
      sale.items = items;

      return successResponse(res, 'Sales transaction retrieved successfully', sale);
    } catch (error) {
      console.error('Get sales transaction error:', error);
      return errorResponse(res, 'Failed to retrieve sales transaction', 500);
    }
  }

  // Update sales transaction payment status
  async updateSalePaymentStatus(req, res) {
    try {
      const { sale_id } = req.params;
      const { payment_status, amount_paid } = req.body;

      // Validate payment status
      const validStatuses = ['Pending', 'Partial', 'Paid', 'Refunded'];
      if (!validStatuses.includes(payment_status)) {
        return errorResponse(res, 'Invalid payment status provided', 400);
      }

      const updateData = {
        payment_status,
        amount_paid: amount_paid !== undefined ? amount_paid : undefined,
        updated_at: new Date()
      };

      const result = await SalesTransaction.update(sale_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Sales transaction not found', 404);
      }

      return successResponse(res, `Sales transaction payment status updated to ${payment_status} successfully`);
    } catch (error) {
      console.error('Update sale payment status error:', error);
      return errorResponse(res, 'Failed to update sale payment status', 500);
    }
  }

  // Get sales summary
  async getSalesSummary(req, res) {
    try {
      const { school_id } = req.user;
      const { start_date, end_date } = req.query;

      // Use today if no date range provided
      const startDate = start_date || new Date().toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];

      const summary = await SalesTransaction.getSalesSummary(school_id, startDate, endDate);

      return successResponse(res, 'Sales summary retrieved successfully', summary);
    } catch (error) {
      console.error('Get sales summary error:', error);
      return errorResponse(res, 'Failed to retrieve sales summary', 500);
    }
  }
}

module.exports = new SalesTransactionController();