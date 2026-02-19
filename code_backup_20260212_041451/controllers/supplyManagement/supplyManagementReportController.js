const { successResponse, errorResponse } = require('../../utils/responseHandler');
const Asset = require('../../models/assetManagement/Asset');
const Product = require('../../models/retailInventory/Product');
const ProductStock = require('../../models/retailInventory/ProductStock');
const SalesTransaction = require('../../models/retailInventory/SalesTransaction');
const PurchaseOrder = require('../../models/retailInventory/PurchaseOrder');

class SupplyManagementReportController {
  // Get supply management dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const { school_id } = req.user;
      const { branch_id } = req.query;

      // Get asset statistics
      const assetStats = await Asset.getStatisticsBySchool(school_id, branch_id);

      // Get inventory statistics
      const inventoryStats = await Product.getInventoryStatistics(school_id, branch_id);

      // Get sales statistics
      const salesStats = await SalesTransaction.getSalesSummary(school_id, '2023-01-01', new Date().toISOString().split('T')[0]);

      // Get stock statistics (using existing method)
      const stockStats = await ProductStock.getStockValue(school_id);

      // Get recent transactions
      const recentTransactions = await SalesTransaction.getRecentTransactions(school_id, branch_id, 10);

      const dashboardData = {
        assets: assetStats,
        inventory: inventoryStats,
        sales: salesStats,
        stock: stockStats,
        recentTransactions,
        summary: {
          totalAssetValue: assetStats.total_value,
          totalInventoryValue: inventoryStats.total_value,
          totalSales: salesStats.total_sales,
          totalLowStockItems: stockStats.low_stock_items
        }
      };

      return successResponse(res, 'Dashboard statistics retrieved successfully', dashboardData);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return errorResponse(res, 'Failed to retrieve dashboard statistics', 500);
    }
  }

  // Get asset reports
  async getAssetReports(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        branch_id: req.query.branch_id,
        category_id: req.query.category_id,
        status: req.query.status,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        search: req.query.search,
        report_type: req.query.report_type || 'summary'
      };

      // Based on report type, get different asset reports
      let reportData;
      switch (filters.report_type) {
        case 'summary':
          reportData = await Asset.getAssetSummaryReport(school_id, filters);
          break;
        case 'by-category':
          reportData = await Asset.getAssetByCategoryReport(school_id, filters);
          break;
        case 'by-status':
          reportData = await Asset.getAssetByStatusReport(school_id, filters);
          break;
        case 'maintenance-due':
          reportData = await Asset.getMaintenanceDueReport(school_id, filters);
          break;
        case 'depreciation':
          reportData = await Asset.getDepreciationReport(school_id, filters);
          break;
        default:
          reportData = await Asset.getAssetSummaryReport(school_id, filters);
      }

      return successResponse(res, `Asset ${filters.report_type} report retrieved successfully`, reportData);
    } catch (error) {
      console.error('Get asset reports error:', error);
      return errorResponse(res, 'Failed to retrieve asset reports', 500);
    }
  }

  // Get inventory reports
  async getInventoryReports(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        branch_id: req.query.branch_id,
        category_id: req.query.category_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        search: req.query.search,
        report_type: req.query.report_type || 'summary'
      };

      // Based on report type, get different inventory reports
      let reportData;
      switch (filters.report_type) {
        case 'summary':
          reportData = await Product.getInventorySummaryReport(school_id, filters);
          break;
        case 'low-stock':
          reportData = await Product.getLowStockReport(school_id, filters);
          break;
        case 'stock-movement':
          reportData = await ProductStock.getStockMovementReport(school_id, filters);
          break;
        case 'product-sales':
          reportData = await SalesTransaction.getSalesByProductReport(school_id, filters);
          break;
        case 'profitability':
          reportData = await SalesTransaction.getProfitabilityReport(school_id, filters);
          break;
        default:
          reportData = await Product.getInventorySummaryReport(school_id, filters);
      }

      return successResponse(res, `Inventory ${filters.report_type} report retrieved successfully`, reportData);
    } catch (error) {
      console.error('Get inventory reports error:', error);
      return errorResponse(res, 'Failed to retrieve inventory reports', 500);
    }
  }

  // Get sales reports
  async getSalesReports(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        branch_id: req.query.branch_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        customer_type: req.query.customer_type,
        payment_status: req.query.payment_status,
        report_type: req.query.report_type || 'summary'
      };

      // Based on report type, get different sales reports
      let reportData;
      switch (filters.report_type) {
        case 'summary':
          reportData = await SalesTransaction.getSalesSummaryReport(school_id, filters);
          break;
        case 'by-product':
          reportData = await SalesTransaction.getSalesByProductReport(school_id, filters);
          break;
        case 'by-customer':
          reportData = await SalesTransaction.getSalesByCustomerReport(school_id, filters);
          break;
        case 'trend-analysis':
          reportData = await SalesTransaction.getSalesTrendAnalysis(school_id, filters);
          break;
        case 'payment-status':
          reportData = await SalesTransaction.getPaymentStatusReport(school_id, filters);
          break;
        default:
          reportData = await SalesTransaction.getSalesSummaryReport(school_id, filters);
      }

      return successResponse(res, `Sales ${filters.report_type} report retrieved successfully`, reportData);
    } catch (error) {
      console.error('Get sales reports error:', error);
      return errorResponse(res, 'Failed to retrieve sales reports', 500);
    }
  }

  // Get purchase reports
  async getPurchaseReports(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        branch_id: req.query.branch_id,
        supplier_id: req.query.supplier_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        status: req.query.status,
        report_type: req.query.report_type || 'summary'
      };

      // Based on report type, get different purchase reports
      let reportData;
      switch (filters.report_type) {
        case 'summary':
          reportData = await PurchaseOrder.getPurchaseSummaryReport(school_id, filters);
          break;
        case 'by-supplier':
          reportData = await PurchaseOrder.getPurchaseBySupplierReport(school_id, filters);
          break;
        case 'by-product':
          reportData = await PurchaseOrder.getPurchaseByProductReport(school_id, filters);
          break;
        case 'trend-analysis':
          reportData = await PurchaseOrder.getPurchaseTrendAnalysis(school_id, filters);
          break;
        default:
          reportData = await PurchaseOrder.getPurchaseSummaryReport(school_id, filters);
      }

      return successResponse(res, `Purchase ${filters.report_type} report retrieved successfully`, reportData);
    } catch (error) {
      console.error('Get purchase reports error:', error);
      return errorResponse(res, 'Failed to retrieve purchase reports', 500);
    }
  }

  // Get stock reports
  async getStockReports(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        branch_id: req.query.branch_id,
        category_id: req.query.category_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        report_type: req.query.report_type || 'summary'
      };

      // Based on report type, get different stock reports
      let reportData;
      switch (filters.report_type) {
        case 'summary':
          reportData = await ProductStock.getStockSummaryReport(school_id, filters);
          break;
        case 'movement':
          reportData = await ProductStock.getStockMovementReport(school_id, filters);
          break;
        case 'valuation':
          reportData = await ProductStock.getStockValuationReport(school_id, filters);
          break;
        case 'adjustment':
          // Stock adjustment reports would come from StockAdjustment model
          // For now, return a placeholder or use the general report
          reportData = await ProductStock.getStockSummaryReport(school_id, filters);
          break;
        default:
          reportData = await ProductStock.getStockSummaryReport(school_id, filters);
      }

      return successResponse(res, `Stock ${filters.report_type} report retrieved successfully`, reportData);
    } catch (error) {
      console.error('Get stock reports error:', error);
      return errorResponse(res, 'Failed to retrieve stock reports', 500);
    }
  }

  // Export report in specified format
  async exportReport(req, res) {
    try {
      const { report_type, format, filters } = req.body;
      const { school_id } = req.user;

      // Validate report type and format
      const validReportTypes = [
        'asset-summary', 'inventory-summary', 'sales-summary', 
        'purchase-summary', 'stock-summary', 'low-stock', 
        'sales-trends', 'purchase-trends', 'profitability'
      ];
      
      const validFormats = ['pdf', 'excel', 'csv', 'json'];

      if (!validReportTypes.includes(report_type)) {
        return errorResponse(res, 'Invalid report type specified', 400);
      }

      if (!validFormats.includes(format)) {
        return errorResponse(res, 'Invalid export format. Valid formats: pdf, excel, csv, json', 400);
      }

      // Prepare the report data based on type
      let reportData;
      switch (report_type) {
        case 'asset-summary':
          reportData = await Asset.getAssetSummaryReport(school_id, filters);
          break;
        case 'inventory-summary':
          reportData = await Product.getInventorySummaryReport(school_id, filters);
          break;
        case 'sales-summary':
          reportData = await SalesTransaction.getSalesSummaryReport(school_id, filters);
          break;
        case 'purchase-summary':
          reportData = await PurchaseOrder.getPurchaseSummaryReport(school_id, filters);
          break;
        case 'stock-summary':
          reportData = await ProductStock.getStockSummaryReport(school_id, filters);
          break;
        case 'low-stock':
          reportData = await Product.getLowStockReport(school_id, filters);
          break;
        case 'sales-trends':
          reportData = await SalesTransaction.getSalesTrendAnalysis(school_id, filters);
          break;
        case 'purchase-trends':
          reportData = await PurchaseOrder.getPurchaseTrendAnalysis(school_id, filters);
          break;
        case 'profitability':
          reportData = await SalesTransaction.getProfitabilityReport(school_id, filters);
          break;
        default:
          reportData = await Asset.getAssetSummaryReport(school_id, filters);
      }

      // For now, return the data - in a real implementation, we would generate the formatted report
      // and set appropriate headers for download

      // Set appropriate content type based on format
      switch (format) {
        case 'pdf':
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="report-${report_type}.pdf"`);
          break;
        case 'excel':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="report-${report_type}.xlsx"`);
          break;
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="report-${report_type}.csv"`);
          break;
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="report-${report_type}.json"`);
          break;
      }

      return res.json({
        success: true,
        message: `Report exported successfully in ${format} format`,
        report_type,
        format,
        data: reportData
      });
    } catch (error) {
      console.error('Export report error:', error);
      return errorResponse(res, 'Failed to export report', 500);
    }
  }
}

module.exports = new SupplyManagementReportController();