const { Product } = require('../../models');
const ProductVariant = require('../../models/retailInventory/ProductVariant');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const { Op } = require('sequelize');

class ProductController {
  // Create new product
  async createProduct(req, res) {
    try {
      const {
        sku, product_name, category_id, description, unit_of_measure,
        has_variants, brand, supplier_id, reorder_level, is_active,
        image_url, notes
      } = req.body;
      const { school_id, id: user_id } = req.user;

      // Validation
      if (!sku || !product_name || !category_id) {
        return errorResponse(res, 'SKU, product name, and category ID are required', 400);
      }

      // Check if product with SKU already exists
      const existingProduct = await Product.findOne({ where: { sku } });
      if (existingProduct) {
        return errorResponse(res, 'Product with this SKU already exists', 400);
      }

      const product_id = generateId('PROD');

      const productData = {
        product_id,
        sku,
        product_name,
        category_id,
        description: description || null,
        unit_of_measure: unit_of_measure || 'piece',
        has_variants: has_variants || false,
        brand: brand || null,
        supplier_id: supplier_id || null,
        reorder_level: reorder_level || 10,
        school_id,
        is_active: is_active !== undefined ? is_active : true,
        image_url: image_url || null,
        notes: notes || null,
        created_by: user_id
      };

      const newProduct = await Product.create(productData);

      return successResponse(res, 'Product created successfully', { product_id: newProduct.product_id, sku }, 201);
    } catch (error) {
      console.error('Create product error:', error);
      return errorResponse(res, 'Failed to create product', 500);
    }
  }

  // Get all products with filters
  async getProducts(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        category_id: req.query.category_id,
        is_active: req.query.is_active !== 'false',
        search: req.query.search,
        brand: req.query.brand,
        has_variants: req.query.has_variants,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      // Use Sequelize findAll instead of custom method
      const whereClause = { school_id, is_active: filters.is_active };
      
      if (filters.category_id) whereClause.category_id = filters.category_id;
      if (filters.brand) whereClause.brand = filters.brand;
      if (filters.has_variants !== undefined) whereClause.has_variants = filters.has_variants;
      if (filters.search) {
        whereClause[Op.or] = [
          { product_name: { [Op.like]: `%${filters.search}%` } },
          { sku: { [Op.like]: `%${filters.search}%` } }
        ];
      }

      const products = await Product.findAll({
        where: whereClause,
        limit: filters.limit,
        offset: filters.offset,
        order: [['product_name', 'ASC']]
      });

      return successResponse(res, 'Products retrieved successfully', products);
    } catch (error) {
      console.error('Get products error:', error);
      return errorResponse(res, 'Failed to retrieve products', 500);
    }
  }

  // Get single product by ID
  async getProductById(req, res) {
    try {
      const { product_id } = req.params;

      const product = await Product.findById(product_id);

      if (!product) {
        return errorResponse(res, 'Product not found', 404);
      }

      // If product has variants, get them too
      if (product.has_variants) {
        const variants = await ProductVariant.findByProduct(product_id);
        product.variants = variants;
      }

      return successResponse(res, 'Product retrieved successfully', product);
    } catch (error) {
      console.error('Get product error:', error);
      return errorResponse(res, 'Failed to retrieve product', 500);
    }
  }

  // Update product
  async updateProduct(req, res) {
    try {
      const { product_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.product_id;
      delete updateData.school_id;
      delete updateData.created_by;
      delete updateData.created_at;

      const result = await Product.update(product_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Product not found', 404);
      }

      return successResponse(res, 'Product updated successfully');
    } catch (error) {
      console.error('Update product error:', error);
      return errorResponse(res, 'Failed to update product', 500);
    }
  }

  // Delete product (soft delete)
  async deleteProduct(req, res) {
    try {
      const { product_id } = req.params;

      const result = await Product.delete(product_id);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Product not found', 404);
      }

      return successResponse(res, 'Product deleted successfully');
    } catch (error) {
      console.error('Delete product error:', error);
      return errorResponse(res, 'Failed to delete product', 500);
    }
  }

  // Get products by category
  async getProductsByCategory(req, res) {
    try {
      const { category_id } = req.params;

      const products = await Product.findByCategory(category_id);

      return successResponse(res, 'Category products retrieved successfully', products);
    } catch (error) {
      console.error('Get category products error:', error);
      return errorResponse(res, 'Failed to retrieve category products', 500);
    }
  }

  // Get low stock products
  async getLowStockProducts(req, res) {
    try {
      const { school_id } = req.user;

      const products = await Product.getLowStockProducts(school_id);

      return successResponse(res, 'Low stock products retrieved successfully', products);
    } catch (error) {
      console.error('Get low stock products error:', error);
      return errorResponse(res, 'Failed to retrieve low stock products', 500);
    }
  }
}

module.exports = new ProductController();