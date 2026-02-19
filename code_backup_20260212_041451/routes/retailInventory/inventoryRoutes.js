const express = require('express');
const router = express.Router();
const productCategoryController = require('../../controllers/retailInventory/productCategoryController');
const productController = require('../../controllers/retailInventory/productController');
const productVariantController = require('../../controllers/retailInventory/productVariantController');
const stockManagementController = require('../../controllers/retailInventory/stockManagementController');
const supplierController = require('../../controllers/retailInventory/supplierController');
const purchaseOrderController = require('../../controllers/retailInventory/purchaseOrderController');
const salesTransactionController = require('../../controllers/retailInventory/salesTransactionController');
const stockAdjustmentController = require('../../controllers/retailInventory/stockAdjustmentController');
const stockTransactionController = require('../../controllers/retailInventory/stockTransactionController');
const inventoryDashboardController = require('../../controllers/retailInventory/inventoryDashboardController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Product Category Routes
router.post(
  '/categories',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productCategoryController.createCategory
);

router.get(
  '/categories',
  productCategoryController.getCategories
);

router.get(
  '/categories/:category_id',
  productCategoryController.getCategoryById
);

router.put(
  '/categories/:category_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productCategoryController.updateCategory
);

router.delete(
  '/categories/:category_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productCategoryController.deleteCategory
);

// Purchase Order Routes (with alias for orders) - MUST BE BEFORE generic routes
router.post(
  '/purchase-orders',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.createPurchaseOrder
);

router.post(
  '/orders',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.createPurchaseOrder
);

router.get(
  '/purchase-orders',
  purchaseOrderController.getPurchaseOrders
);

router.get(
  '/orders',
  purchaseOrderController.getPurchaseOrders
);

router.get(
  '/purchase-orders/:po_id',
  purchaseOrderController.getPurchaseOrderById
);

router.get(
  '/orders/:po_id',
  purchaseOrderController.getPurchaseOrderById
);

router.put(
  '/purchase-orders/:po_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.updatePurchaseOrder
);

router.put(
  '/orders/:po_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.updatePurchaseOrder
);

router.put(
  '/purchase-orders/:po_id/status',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.updatePurchaseOrderStatus
);

router.put(
  '/orders/:po_id/status',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.updatePurchaseOrderStatus
);

router.put(
  '/purchase-orders/:po_id/receive',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.receivePurchaseOrderItems
);

router.put(
  '/orders/:po_id/receive',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.receivePurchaseOrderItems
);

// Supplier Routes (MUST BE BEFORE generic product routes)
router.post(
  '/suppliers',
  authorizeRoles(['Admin', 'Inventory Manager']),
  supplierController.createSupplier
);

router.get(
  '/suppliers',
  supplierController.getSuppliers
);

router.get(
  '/suppliers/:supplier_id',
  supplierController.getSupplierById
);

router.put(
  '/suppliers/:supplier_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  supplierController.updateSupplier
);

router.delete(
  '/suppliers/:supplier_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  supplierController.deleteSupplier
);

// Sales Transaction Routes (MUST BE BEFORE generic product routes)
router.post(
  '/sales',
  authorizeRoles(['Admin', 'Inventory Manager', 'Cashier']),
  salesTransactionController.createSale
);

router.get(
  '/sales',
  salesTransactionController.getSalesTransactions
);

router.get(
  '/sales/summary',
  salesTransactionController.getSalesSummary
);

router.get(
  '/sales/:sale_id',
  salesTransactionController.getSalesTransactionById
);

router.put(
  '/sales/:sale_id/payment-status',
  authorizeRoles(['Admin', 'Inventory Manager', 'Cashier']),
  salesTransactionController.updateSalePaymentStatus
);

// Product Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productController.createProduct
);

router.get('/', productController.getProducts);

router.get('/low-stock', productController.getLowStockProducts);

router.get('/by-category/:category_id', productController.getProductsByCategory);

router.get('/:product_id', productController.getProductById);

router.put(
  '/:product_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productController.updateProduct
);

router.delete(
  '/:product_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productController.deleteProduct
);

// Product Variant Routes
router.post(
  '/:product_id/variants',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productVariantController.createVariant
);

router.get(
  '/:product_id/variants',
  productVariantController.getVariants
);

router.get(
  '/variants/:variant_id',
  productVariantController.getVariantById
);

router.put(
  '/variants/:variant_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productVariantController.updateVariant
);

router.delete(
  '/variants/:variant_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productVariantController.deleteVariant
);

// Stock Management Routes
router.get(
  '/stock',
  stockManagementController.getStockLevels
);

router.get(
  '/stock/:product_id/:branch_id',
  stockManagementController.getStockByProductBranch
);

router.put(
  '/stock/adjust',
  authorizeRoles(['Admin', 'Inventory Manager']),
  stockManagementController.adjustStock
);

router.get(
  '/stock/low-alerts',
  stockManagementController.getLowStockAlerts
);

router.get(
  '/stock/value-summary',
  stockManagementController.getStockValueSummary
);

router.put(
  '/stock/purchase-order',
  authorizeRoles(['Admin', 'Inventory Manager']),
  stockManagementController.updateStockFromPurchaseOrder
);

// Purchase Order Routes (with alias for orders)
router.post(
  '/purchase-orders',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.createPurchaseOrder
);

router.post(
  '/orders',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.createPurchaseOrder
);

router.get(
  '/purchase-orders',
  purchaseOrderController.getPurchaseOrders
);

router.get(
  '/orders',
  purchaseOrderController.getPurchaseOrders
);

router.get(
  '/purchase-orders/:po_id',
  purchaseOrderController.getPurchaseOrderById
);

router.get(
  '/orders/:po_id',
  purchaseOrderController.getPurchaseOrderById
);

router.put(
  '/purchase-orders/:po_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.updatePurchaseOrder
);

router.put(
  '/orders/:po_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.updatePurchaseOrder
);

router.put(
  '/purchase-orders/:po_id/status',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.updatePurchaseOrderStatus
);

router.put(
  '/orders/:po_id/status',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.updatePurchaseOrderStatus
);

router.put(
  '/purchase-orders/:po_id/receive',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.receivePurchaseOrderItems
);

router.put(
  '/orders/:po_id/receive',
  authorizeRoles(['Admin', 'Inventory Manager']),
  purchaseOrderController.receivePurchaseOrderItems
);

// Stock Adjustment Routes
router.post(
  '/stock-adjustments',
  authorizeRoles(['Admin', 'Inventory Manager']),
  stockAdjustmentController.createAdjustment
);

router.get(
  '/stock-adjustments',
  stockAdjustmentController.getAdjustments
);

router.get(
  '/stock-adjustments/:adjustment_id',
  stockAdjustmentController.getAdjustmentById
);

router.get(
  '/stock-adjustments/summary',
  stockAdjustmentController.getAdjustmentSummary
);

// Stock Transaction Routes
router.get(
  '/stock-transactions',
  stockTransactionController.getStockTransactions
);

router.get(
  '/stock-transactions/summary',
  stockTransactionController.getStockTransactionSummary
);

router.get(
  '/stock-transactions/trends',
  stockTransactionController.getStockTransactionTrends
);

router.get(
  '/stock-transactions/value',
  stockTransactionController.getStockValueByTransactionType
);

router.get(
  '/stock-transactions/:transaction_id',
  stockTransactionController.getStockTransactionById
);

router.post(
  '/stock-transactions',
  authorizeRoles(['Admin', 'Inventory Manager', 'Storekeeper']),
  stockTransactionController.createStockTransaction
);

// Inventory Dashboard Routes
router.get(
  '/dashboard/stats',
  inventoryDashboardController.getDashboardStats
);

router.get(
  '/dashboard/reports',
  inventoryDashboardController.getInventoryReports
);

router.get(
  '/dashboard/analytics',
  inventoryDashboardController.getProductSalesAnalytics
);

module.exports = router;