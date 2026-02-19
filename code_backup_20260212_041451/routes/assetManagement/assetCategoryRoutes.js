const express = require('express');
const router = express.Router();
const assetCategoryController = require('../../controllers/assetManagement/assetCategoryController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// Asset Category Routes
router.post(
  '/',
  // Temporarily removed authentication for testing
  // authorizeRoles(['Admin', 'Inventory Manager']),
  assetCategoryController.createCategory
);

router.get('/average-depreciation-rate', assetCategoryController.getAverageDepreciationRate);

router.get('/', assetCategoryController.getCategories);

router.get('/:category_id', assetCategoryController.getCategoryById);

// All other routes require authentication
router.use(authenticateToken);

router.put(
  '/:category_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetCategoryController.updateCategory
);

router.delete(
  '/:category_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  assetCategoryController.deleteCategory
);

module.exports = router;