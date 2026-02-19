const ProductCategory = require('../../models/retailInventory/ProductCategory');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class ProductCategoryController {
  // Create new product category
  async createCategory(req, res) {
    try {
      const { category_name, category_code, description, parent_category_id } = req.body;
      const { school_id } = req.user;

      const category_id = generateId('CAT-PROD');

      const categoryData = {
        category_id,
        category_name,
        category_code,
        description,
        parent_category_id,
        is_active: true,
        school_id
      };

      await ProductCategory.create(categoryData);

      return successResponse(res, 'Product category created successfully', { category_id }, 201);
    } catch (error) {
      console.error('Create product category error:', error);
      return errorResponse(res, 'Failed to create product category', 500);
    }
  }

  // Get all product categories with filters
  async getCategories(req, res) {
    try {
      console.log('=== ProductCategory.getCategories called ===');
      console.log('User:', req.user);
      console.log('Query params:', req.query);
      
      const { school_id } = req.user;
      const filters = {
        search: req.query.search,
        is_active: req.query.is_active,
        parent_category_id: req.query.parent_category_id,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      console.log('School ID:', school_id);
      console.log('Filters:', filters);

      const categories = await ProductCategory.findBySchool(school_id, filters);
      console.log('Categories found:', categories);

      return successResponse(res, 'Product categories retrieved successfully', categories);
    } catch (error) {
      console.error('Get product categories error:', error);
      return errorResponse(res, 'Failed to retrieve product categories', 500);
    }
  }

  // Get single product category by ID
  async getCategoryById(req, res) {
    try {
      const { category_id } = req.params;

      const category = await ProductCategory.findById(category_id);

      if (!category) {
        return errorResponse(res, 'Product category not found', 404);
      }

      return successResponse(res, 'Product category retrieved successfully', category);
    } catch (error) {
      console.error('Get product category error:', error);
      return errorResponse(res, 'Failed to retrieve product category', 500);
    }
  }

  // Update product category
  async updateCategory(req, res) {
    try {
      const { category_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.category_id;
      delete updateData.school_id;

      const result = await ProductCategory.update(category_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Product category not found', 404);
      }

      return successResponse(res, 'Product category updated successfully');
    } catch (error) {
      console.error('Update product category error:', error);
      return errorResponse(res, 'Failed to update product category', 500);
    }
  }

  // Delete product category (soft delete)
  async deleteCategory(req, res) {
    try {
      const { category_id } = req.params;

      const result = await ProductCategory.delete(category_id);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Product category not found', 404);
      }

      return successResponse(res, 'Product category deleted successfully');
    } catch (error) {
      console.error('Delete product category error:', error);
      return errorResponse(res, 'Failed to delete product category', 500);
    }
  }
}

module.exports = new ProductCategoryController();