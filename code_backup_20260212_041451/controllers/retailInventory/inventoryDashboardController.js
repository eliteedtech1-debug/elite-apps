const { Product, ProductStock, SalesTransaction, StockTransaction, PurchaseOrder } = require('../../models');
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const { sequelize } = require('../../models');
const { Op } = require('sequelize');

class InventoryDashboardController {
  // Get comprehensive inventory dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const { school_id } = req.user;
      const { branch_id } = req.query;

      const whereClause = { school_id };
      if (branch_id) {
        whereClause.branch_id = branch_id;
      }

      // Get product stock value summary
      const stockValueResult = await ProductStock.findAll({
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
        where: whereClause,
        raw: true,
      });

      const stockValue = stockValueResult[0] || { total_items: 0, total_selling_value: 0, total_cost_value: 0 };

      // Get low stock items
      const lowStockItems = await ProductStock.findAll({
        where: {
          school_id,
          quantity_available: {
            [Op.lte]: sequelize.col('Product.reorder_level'),
          },
          ...(branch_id && { branch_id }),
        },
        include: [
          {
            model: Product,
            as: 'Product',
            where: { is_active: true },
            attributes: ['product_name', 'sku', 'reorder_level'],
          },
        ],
        order: [['quantity_available', 'ASC']],
        limit: 5,
      });

      // Get recent sales
      const recentSales = await SalesTransaction.findAll({
        where: whereClause,
        order: [['sale_date', 'DESC']],
        limit: 5,
      });

      // Get recent stock transactions
      const recentTransactions = await StockTransaction.findAll({
        where: whereClause,
        order: [['transaction_date', 'DESC']],
        limit: 5,
      });

      // Get recent purchase orders
      const recentPOs = await PurchaseOrder.findAll({
        where: whereClause,
        order: [['order_date', 'DESC']],
        limit: 5,
      });

      const dashboardData = {
        stockValue,
        totalLowStockItems: lowStockItems.length,
        lowStockItems,
        totalRecentSales: recentSales.length,
        recentSales,
        totalRecentTransactions: recentTransactions.length,
        recentTransactions,
        totalRecentPOs: recentPOs.length,
        recentPOs
      };

      return successResponse(res, 'Inventory dashboard statistics retrieved successfully', dashboardData);
    } catch (error) {
      console.error('Get inventory dashboard statistics error:', error);
      return errorResponse(res, 'Failed to retrieve inventory dashboard statistics', 500);
    }
  }

  // Get inventory reports by various criteria
  async getInventoryReports(req, res) {
    try {
      const { school_id } = req.user;
      const { report_type, start_date, end_date, category_id, branch_id } = req.query;

      let reportData = {};

      switch(report_type) {
        case 'stock-summary':
          // Get stock value summary
          reportData = await ProductStock.getStockValue(school_id);
          break;
          
        case 'low-stock':
          // Get low stock items
          reportData = await ProductStock.getLowStockProducts(school_id);
          break;
          
        case 'sales-summary':
          // Get sales summary for the date range
          const startDate = start_date || new Date().toISOString().split('T')[0];
          const endDate = end_date || new Date().toISOString().split('T')[0];
          reportData = await SalesTransaction.getSalesSummary(school_id, startDate, endDate);
          break;
          
        case 'stock-transactions':
          // Get stock transactions summary
          reportData = await StockTransaction.getTransactionSummary(school_id, start_date, end_date);
          break;
          
        default:
          return errorResponse(res, 'Invalid report type specified', 400);
      }

      return successResponse(res, `${report_type} report retrieved successfully`, reportData);
    } catch (error) {
      console.error('Get inventory reports error:', error);
      return errorResponse(res, 'Failed to retrieve inventory reports', 500);
    }
  }

  // Get product sales analytics
  async getProductSalesAnalytics(req, res) {
    try {
      const { school_id } = req.user;
      const { start_date, end_date, product_id, branch_id } = req.query;

      // This would typically involve more complex queries to get sales analytics
      // For now, return a placeholder response
      const analytics = {
        topSellingProducts: [],
        slowMovingProducts: [],
        salesTrend: [],
        revenueByProduct: []
      };

      return successResponse(res, 'Product sales analytics retrieved successfully', analytics);
    } catch (error) {
      console.error('Get product sales analytics error:', error);
      return errorResponse(res, 'Failed to retrieve product sales analytics', 500);
    }
  }
}

module.exports = new InventoryDashboardController();