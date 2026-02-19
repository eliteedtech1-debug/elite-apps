const PurchaseOrder = require('../../models/retailInventory/PurchaseOrder');
const PurchaseOrderItem = require('../../models/retailInventory/PurchaseOrderItem');
const StockTransaction = require('../../models/retailInventory/StockTransaction');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class PurchaseOrderController {
  // Create new purchase order
  async createPurchaseOrder(req, res) {
    try {
      const { 
        supplier_id, order_date, expected_delivery_date, notes,
        items 
      } = req.body;
      const { school_id, id: user_id, branch_id } = req.user;

      const po_id = generateId('PO');
      const po_number = `PO-${Date.now()}`; // Generate PO number based on timestamp

      // Calculate totals
      let subtotal = 0;
      items.forEach(item => {
        subtotal += (item.quantity_ordered * item.unit_cost);
      });
      
      const tax_amount = req.body.tax_amount || 0;
      const shipping_cost = req.body.shipping_cost || 0;
      const discount_amount = req.body.discount_amount || 0;
      const grand_total = subtotal + tax_amount + shipping_cost - discount_amount;

      const poData = {
        po_id,
        po_number,
        supplier_id,
        order_date,
        expected_delivery_date,
        actual_delivery_date: null,
        status: 'Draft', // Default to Draft status
        total_amount: subtotal,
        tax_amount,
        shipping_cost,
        discount_amount,
        grand_total,
        branch_id,
        school_id,
        created_by: user_id,
        approved_by: null,
        notes
      };

      await PurchaseOrder.create(poData);

      // Create purchase order items
      for (const item of items) {
        const item_id = generateId('PO-ITEM');
        const itemData = {
          po_item_id: item_id,
          po_id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity_ordered: item.quantity_ordered,
          quantity_received: 0, // Initially 0
          unit_cost: item.unit_cost,
          total_cost: item.quantity_ordered * item.unit_cost,
          notes: item.notes || ''
        };

        await PurchaseOrderItem.create(itemData);
      }

      return successResponse(res, 'Purchase order created successfully', { po_id, po_number }, 201);
    } catch (error) {
      console.error('Create purchase order error:', error);
      return errorResponse(res, 'Failed to create purchase order', 500);
    }
  }

  // Get all purchase orders with filters
  async getPurchaseOrders(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        supplier_id: req.query.supplier_id,
        branch_id: req.query.branch_id,
        status: req.query.status,
        created_by: req.query.created_by,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        search: req.query.search,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      const purchaseOrders = await PurchaseOrder.findBySchool(school_id, filters);

      return successResponse(res, 'Purchase orders retrieved successfully', purchaseOrders);
    } catch (error) {
      console.error('Get purchase orders error:', error);
      return errorResponse(res, 'Failed to retrieve purchase orders', 500);
    }
  }

  // Get single purchase order by ID
  async getPurchaseOrderById(req, res) {
    try {
      const { po_id } = req.params;

      const purchaseOrder = await PurchaseOrder.findById(po_id);

      if (!purchaseOrder) {
        return errorResponse(res, 'Purchase order not found', 404);
      }

      // Get purchase order items
      const items = await PurchaseOrderItem.findByPO(po_id);
      purchaseOrder.items = items;

      return successResponse(res, 'Purchase order retrieved successfully', purchaseOrder);
    } catch (error) {
      console.error('Get purchase order error:', error);
      return errorResponse(res, 'Failed to retrieve purchase order', 500);
    }
  }

  // Update purchase order
  async updatePurchaseOrder(req, res) {
    try {
      const { po_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.po_id;
      delete updateData.school_id;
      delete updateData.created_by;
      delete updateData.created_at;

      const result = await PurchaseOrder.update(po_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Purchase order not found', 404);
      }

      return successResponse(res, 'Purchase order updated successfully');
    } catch (error) {
      console.error('Update purchase order error:', error);
      return errorResponse(res, 'Failed to update purchase order', 500);
    }
  }

  // Update purchase order status
  async updatePurchaseOrderStatus(req, res) {
    try {
      const { po_id } = req.params;
      const { status } = req.body;
      
      // Only allow certain status changes
      const allowedStatuses = ['Draft', 'Pending Approval', 'Approved', 'Ordered', 'Cancelled'];
      if (!allowedStatuses.includes(status)) {
        return errorResponse(res, 'Invalid status provided', 400);
      }

      const updateData = {
        status,
        updated_at: new Date()
      };

      // If approving, set the approved_by field
      if (status === 'Approved') {
        updateData.approved_by = req.user.id;
      }

      const result = await PurchaseOrder.update(po_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Purchase order not found', 404);
      }

      return successResponse(res, `Purchase order status updated to ${status} successfully`);
    } catch (error) {
      console.error('Update purchase order status error:', error);
      return errorResponse(res, 'Failed to update purchase order status', 500);
    }
  }

  // Receive items for a purchase order
  async receivePurchaseOrderItems(req, res) {
    try {
      const { po_id } = req.params;
      const { items } = req.body;
      const { id: user_id, school_id, branch_id } = req.user;

      // Get full purchase order details to access school_id and branch_id
      const purchaseOrder = await PurchaseOrder.findById(po_id);
      if (!purchaseOrder) {
        return errorResponse(res, 'Purchase order not found', 404);
      }

      // Update purchase order status to 'Partially Received' or 'Received'
      let allReceived = true;

      for (const item of items) {
        const poItem = await PurchaseOrderItem.findById(item.po_item_id);
        if (!poItem) {
          return errorResponse(res, `Purchase order item ${item.po_item_id} not found`, 404);
        }

        // Update received quantity
        await PurchaseOrderItem.updateReceivedQuantity(item.po_item_id, item.quantity_received);

        // Create a stock transaction for the received items
        const transaction_id = generateId('STOCK-TRANS');
        const transaction_date = new Date().toISOString().split('T')[0];

        const transactionData = {
          transaction_id,
          transaction_type: 'Purchase',
          product_id: poItem.product_id,
          variant_id: poItem.variant_id || null,
          branch_id: purchaseOrder.branch_id,  // Use the PO branch
          quantity: item.quantity_received,
          unit_cost: poItem.unit_cost,
          reference_type: 'PO',
          reference_id: po_id, // Link to the purchase order
          notes: `Stock received from purchase order ${purchaseOrder.po_number}`,
          transaction_date,
          school_id: purchaseOrder.school_id, // Use the PO school
          created_by: user_id
        };

        await StockTransaction.create(transactionData);

        // Check if all items are received
        if (poItem.quantity_ordered > (poItem.quantity_received + item.quantity_received)) {
          allReceived = false;
        }
      }

      // Update PO status based on receipt status
      const newStatus = allReceived ? 'Received' : 'Partially Received';
      await PurchaseOrder.update(po_id, {
        status: newStatus,
        actual_delivery_date: new Date().toISOString().split('T')[0],
        updated_at: new Date()
      });

      return successResponse(res, `Purchase order items received successfully. New status: ${newStatus}`);
    } catch (error) {
      console.error('Receive purchase order items error:', error);
      return errorResponse(res, 'Failed to receive purchase order items', 500);
    }
  }
}

module.exports = new PurchaseOrderController();