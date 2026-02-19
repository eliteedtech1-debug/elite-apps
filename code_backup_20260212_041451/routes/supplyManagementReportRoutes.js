const express = require('express');
const router = express.Router();
const supplyManagementReportController = require('../controllers/supplyManagement/supplyManagementReportController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Supply Management Reports Routes
router.get(
  '/dashboard-stats',
  supplyManagementReportController.getDashboardStats
);

router.get(
  '/asset-reports',
  supplyManagementReportController.getAssetReports
);

router.get(
  '/inventory-reports',
  supplyManagementReportController.getInventoryReports
);

router.get(
  '/sales-reports',
  supplyManagementReportController.getSalesReports
);

router.get(
  '/purchase-reports',
  supplyManagementReportController.getPurchaseReports
);

router.get(
  '/stock-reports',
  supplyManagementReportController.getStockReports
);

router.post(
  '/export',
  supplyManagementReportController.exportReport
);

module.exports = router;