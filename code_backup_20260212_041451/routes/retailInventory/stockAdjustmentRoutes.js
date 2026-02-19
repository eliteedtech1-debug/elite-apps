const express = require('express');
const router = express.Router();
const stockAdjustmentController = require('../../controllers/retailInventory/stockAdjustmentController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Stock Adjustment Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager']),
  stockAdjustmentController.createAdjustment
);

router.get('/', stockAdjustmentController.getAdjustments);

router.get('/:adjustment_id', stockAdjustmentController.getAdjustmentById);

router.get(
  '/summary',
  stockAdjustmentController.getAdjustmentSummary
);

module.exports = router;