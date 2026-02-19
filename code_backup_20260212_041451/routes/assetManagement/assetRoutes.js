const express = require('express');
const router = express.Router();
const assetController = require('../../controllers/assetManagement/assetController');
const assetCategoryController = require('../../controllers/assetManagement/assetCategoryController');
const facilityRoomController = require('../../controllers/assetManagement/facilityRoomController');
const assetInspectionController = require('../../controllers/assetManagement/assetInspectionController');
const maintenanceRequestController = require('../../controllers/assetManagement/maintenanceRequestController');
const assetTransferController = require('../../controllers/assetManagement/assetTransferController');
const assetDashboardController = require('../../controllers/assetManagement/assetDashboardController');
const passport = require('passport');
const { authorizeRoles } = require('../../middleware/authMiddleware');

// All routes require authentication using passport (consistent with rest of app)
router.use(passport.authenticate('jwt', { session: false }));

// Asset Category Routes
router.post(
  '/categories',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetCategoryController.createCategory
);

router.get(
  '/categories',
  assetCategoryController.getCategories
);

router.get(
  '/categories/:category_id',
  assetCategoryController.getCategoryById
);

router.put(
  '/categories/:category_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetCategoryController.updateCategory
);

router.delete(
  '/categories/:category_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetCategoryController.deleteCategory
);

// Facility Room Routes
router.post(
  '/rooms',
  authorizeRoles(['Admin', 'Inventory Manager']),
  facilityRoomController.createRoom
);

router.get(
  '/rooms',
  facilityRoomController.getRooms
);

router.get(
  '/rooms/:room_id',
  facilityRoomController.getRoomById
);

router.put(
  '/rooms/:room_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  facilityRoomController.updateRoom
);

router.delete(
  '/rooms/:room_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  facilityRoomController.deleteRoom
);

// Asset Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetController.createAsset
);

router.get('/', assetController.getAssets);

router.get('/statistics', assetController.getAssetStatistics);

router.get('/maintenance-due', assetController.getMaintenanceDue);

router.get('/by-category/:category_id', assetController.getAssetsByCategory);

router.get('/by-room/:room_id', assetController.getAssetsByRoom);

router.get('/recent', assetController.getRecentAssets);

const upload = require('../../middleware/multerConfig');
const { inspectionUpload } = require('../../middleware/multerConfig');

router.get(
  '/:asset_id/images',
  assetController.getAssetImages
);

router.post(
  '/:asset_id/images',
  authorizeRoles(['Admin', 'Inventory Manager']),
  upload.array('images', 5),
  assetController.uploadAssetImages
);

router.get('/:asset_id', assetController.getAssetById);

// Asset action routes
router.get('/:asset_id/qr', assetController.generateQR);
router.get('/:asset_id/history', assetController.getAssetHistory);
router.put('/:asset_id/status', authorizeRoles(['Admin', 'Inventory Manager']), assetController.updateStatus);

router.put(
  '/:asset_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetController.updateAsset
);

router.delete(
  '/:asset_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetController.deleteAsset
);

// Asset Inspection Routes
router.post(
  '/:asset_id/inspections',
  authorizeRoles(['Admin', 'Inventory Manager', 'Staff']),
  inspectionUpload.array('attachments', 10),
  assetInspectionController.createInspection
);

router.get(
  '/inspections',
  assetInspectionController.getInspections
);

router.get(
  '/inspections/:inspection_id',
  assetInspectionController.getInspectionById
);

router.put(
  '/inspections/:inspection_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetInspectionController.updateInspection
);

// Maintenance Request Routes
router.post(
  '/maintenance-requests',
  authorizeRoles(['Admin', 'Inventory Manager', 'Staff']),
  maintenanceRequestController.createRequest
);

router.get(
  '/maintenance-requests',
  maintenanceRequestController.getRequests
);

router.get(
  '/maintenance-requests/:request_id',
  maintenanceRequestController.getRequestById
);

router.put(
  '/maintenance-requests/:request_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  maintenanceRequestController.updateRequest
);

// Asset Transfer Routes
router.post(
  '/transfers',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetTransferController.createTransfer
);

router.get(
  '/transfers',
  assetTransferController.getTransfers
);

router.get(
  '/transfers/:transfer_id',
  assetTransferController.getTransferById
);

router.put(
  '/transfers/:transfer_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetTransferController.updateTransfer
);

router.put(
  '/transfers/:transfer_id/complete',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetTransferController.completeTransfer
);

// Asset Dashboard Routes
router.get(
  '/dashboard/stats',
  assetDashboardController.getDashboardStats
);

router.get(
  '/dashboard/reports',
  assetDashboardController.getAssetReports
);

router.get(
  '/summary',
  assetDashboardController.getAssetsSummary
);

// Asset Import Route
// Using the same upload middleware instance defined above (line 90)
router.post(
  '/import',
  authorizeRoles(['Admin', 'Inventory Manager']),
  upload.single('file'),  // Expecting a file upload with field name 'file'
  assetController.importAssets
);

module.exports = router;