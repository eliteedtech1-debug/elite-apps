const express = require('express');
const router = express.Router();
const assetTransferController = require('../../controllers/assetManagement/assetTransferController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Asset Transfer Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetTransferController.createTransfer
);

router.get('/', assetTransferController.getTransfers);

router.get('/:transfer_id', assetTransferController.getTransferById);

router.put(
  '/:transfer_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetTransferController.updateTransfer
);

router.put(
  '/:transfer_id/complete',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetTransferController.completeTransfer
);

module.exports = router;