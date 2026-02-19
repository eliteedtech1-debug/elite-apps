const express = require('express');
const router = express.Router();
const supplierController = require('../../controllers/retailInventory/supplierController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Supplier Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager']),
  supplierController.createSupplier
);

router.get('/', supplierController.getSuppliers);

router.get('/:supplier_id', supplierController.getSupplierById);

router.put(
  '/:supplier_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  supplierController.updateSupplier
);

router.delete(
  '/:supplier_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  supplierController.deleteSupplier
);

module.exports = router;