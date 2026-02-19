const express = require('express');
const router = express.Router();
const salesTransactionController = require('../../controllers/retailInventory/salesTransactionController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Sales Transaction Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager', 'Cashier']),
  salesTransactionController.createSale
);

router.get('/', salesTransactionController.getSalesTransactions);

router.get('/:sale_id', salesTransactionController.getSalesTransactionById);

router.put(
  '/:sale_id/payment-status',
  authorizeRoles(['Admin', 'Inventory Manager', 'Cashier']),
  salesTransactionController.updateSalePaymentStatus
);

router.get(
  '/summary',
  salesTransactionController.getSalesSummary
);

module.exports = router;