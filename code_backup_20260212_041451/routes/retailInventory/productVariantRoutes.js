const express = require('express');
const router = express.Router();
const productVariantController = require('../../controllers/retailInventory/productVariantController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Product Variant Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productVariantController.createVariant
);

router.get('/', productVariantController.getVariants);

router.get('/:variant_id', productVariantController.getVariantById);

router.put(
  '/:variant_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productVariantController.updateVariant
);

router.delete(
  '/:variant_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  productVariantController.deleteVariant
);

module.exports = router;