const express = require('express');
const router = express.Router();
const stockTransactionController = require('../../controllers/retailInventory/stockTransactionController');
const { authenticate, authorize } = require('../../middleware/auth');

// Apply authentication and authorization middleware to all routes
router.use(authenticate);

// Routes for stock transactions
router.get('/', stockTransactionController.getStockTransactions);
router.get('/summary', stockTransactionController.getStockTransactionSummary);
router.get('/trends', stockTransactionController.getStockTransactionTrends);
router.get('/value', stockTransactionController.getStockValueByTransactionType);
router.get('/:transaction_id', stockTransactionController.getStockTransactionById);
router.post('/',
  authorize(['admin', 'manager', 'storekeeper']),
  stockTransactionController.createStockTransaction
);

module.exports = router;