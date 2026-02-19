const ProductVariant = require('../../models/retailInventory/ProductVariant');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class ProductVariantController {
  // Create new product variant
  async createVariant(req, res) {
    try {
      const { 
        product_id, variant_name, variant_sku, attribute_type,
        attribute_value, additional_cost 
      } = req.body;

      const variant_id = generateId('VAR');

      const variantData = {
        variant_id,
        product_id,
        variant_name,
        variant_sku,
        attribute_type,
        attribute_value,
        additional_cost: additional_cost || 0,
        is_active: true
      };

      await ProductVariant.create(variantData);

      return successResponse(res, 'Product variant created successfully', { variant_id }, 201);
    } catch (error) {
      console.error('Create product variant error:', error);
      return errorResponse(res, 'Failed to create product variant', 500);
    }
  }

  // Get all product variants by product
  async getVariants(req, res) {
    try {
      const { product_id } = req.params;
      const filters = {
        is_active: req.query.is_active,
        attribute_type: req.query.attribute_type,
        attribute_value: req.query.attribute_value,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      const variants = await ProductVariant.findByProduct(product_id, filters);

      return successResponse(res, 'Product variants retrieved successfully', variants);
    } catch (error) {
      console.error('Get product variants error:', error);
      return errorResponse(res, 'Failed to retrieve product variants', 500);
    }
  }

  // Get single product variant by ID
  async getVariantById(req, res) {
    try {
      const { variant_id } = req.params;

      const variant = await ProductVariant.findById(variant_id);

      if (!variant) {
        return errorResponse(res, 'Product variant not found', 404);
      }

      return successResponse(res, 'Product variant retrieved successfully', variant);
    } catch (error) {
      console.error('Get product variant error:', error);
      return errorResponse(res, 'Failed to retrieve product variant', 500);
    }
  }

  // Update product variant
  async updateVariant(req, res) {
    try {
      const { variant_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.variant_id;

      const result = await ProductVariant.update(variant_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Product variant not found', 404);
      }

      return successResponse(res, 'Product variant updated successfully');
    } catch (error) {
      console.error('Update product variant error:', error);
      return errorResponse(res, 'Failed to update product variant', 500);
    }
  }

  // Delete product variant (soft delete)
  async deleteVariant(req, res) {
    try {
      const { variant_id } = req.params;

      const result = await ProductVariant.delete(variant_id);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Product variant not found', 404);
      }

      return successResponse(res, 'Product variant deleted successfully');
    } catch (error) {
      console.error('Delete product variant error:', error);
      return errorResponse(res, 'Failed to delete product variant', 500);
    }
  }
}

module.exports = new ProductVariantController();