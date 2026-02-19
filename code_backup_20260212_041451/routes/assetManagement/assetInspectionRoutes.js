const express = require('express');
const router = express.Router();
const assetInspectionController = require('../../controllers/assetManagement/assetInspectionController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Asset Inspection Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager', 'Staff']),
  assetInspectionController.createInspection
);

router.get('/', assetInspectionController.getInspections);

router.get('/:inspection_id', assetInspectionController.getInspectionById);

router.put(
  '/:inspection_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetInspectionController.updateInspection
);

module.exports = router;