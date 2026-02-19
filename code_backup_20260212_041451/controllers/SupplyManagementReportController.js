const SupplyManagementReportingService = require('../services/SupplyManagementReportingService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

class SupplyManagementReportController {
  // Get asset reports
  async getAssetReport(req, res) {
    try {
      const { school_id } = req.user;
      const { report_type, ...params } = req.query;

      if (!report_type) {
        return errorResponse(res, 'Report type is required', 400);
      }

      const reportData = await SupplyManagementReportingService.getAssetReports(school_id, report_type, params);

      return successResponse(res, 'Asset report retrieved successfully', reportData);
    } catch (error) {
      console.error('Get asset report error:', error);
      return errorResponse(res, 'Failed to retrieve asset report', 500);
    }
  }

  // Get inventory reports
  async getInventoryReport(req, res) {
    try {
      const { school_id } = req.user;
      const { report_type, ...params } = req.query;

      if (!report_type) {
        return errorResponse(res, 'Report type is required', 400);
      }

      const reportData = await SupplyManagementReportingService.getInventoryReports(school_id, report_type, params);

      return successResponse(res, 'Inventory report retrieved successfully', reportData);
    } catch (error) {
      console.error('Get inventory report error:', error);
      return errorResponse(res, 'Failed to retrieve inventory report', 500);
    }
  }

  // Export reports
  async exportReport(req, res) {
    try {
      const { school_id } = req.user;
      const { report_type, format = 'json', ...params } = req.query;

      if (!report_type) {
        return errorResponse(res, 'Report type is required', 400);
      }

      if (!['json', 'csv', 'pdf'].includes(format)) {
        return errorResponse(res, 'Invalid export format. Use json, csv, or pdf', 400);
      }

      const exportData = await SupplyManagementReportingService.exportReport(report_type, school_id, params, format);

      // Set appropriate headers for download
      let contentType;
      let fileName;
      
      switch(format) {
        case 'json':
          contentType = 'application/json';
          fileName = `supply-management-report-${report_type}-${Date.now()}.json`;
          break;
        case 'csv':
          contentType = 'text/csv';
          fileName = `supply-management-report-${report_type}-${Date.now()}.csv`;
          break;
        case 'pdf':
          contentType = 'application/pdf';
          fileName = `supply-management-report-${report_type}-${Date.now()}.pdf`;
          break;
        default:
          contentType = 'application/json';
          fileName = `supply-management-report-${report_type}-${Date.now()}.json`;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      return res.send(exportData);
    } catch (error) {
      console.error('Export report error:', error);
      return errorResponse(res, 'Failed to export report', 500);
    }
  }
}

module.exports = new SupplyManagementReportController();