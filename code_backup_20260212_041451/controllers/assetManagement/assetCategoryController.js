const db = require('../../models');
console.log('🔍 AssetCategory controller - db keys:', Object.keys(db));
console.log('🔍 AssetCategory controller - AssetCategory available:', !!db.AssetCategory);
const AssetCategory = db.AssetCategory;
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const { Op } = require('sequelize');

class AssetCategoryController {
  // Create new asset category
  async createCategory(req, res) {
    try {
      const { category_name, category_code, description, parent_category_id, depreciation_rate } = req.body;
      const school_id = req.user?.school_id || req.headers['x-school-id'] || 'SCH/18';

      const category_id = generateId('CAT-ASSET');

      let finalDepreciationRate = depreciation_rate;

      // If no depreciation rate provided, calculate average from top 10 recent categories
      if (!depreciation_rate) {
        try {
          const avgResult = await db.sequelize.query(
            'SELECT get_average_depreciation_rate() as avg_rate',
            { type: db.sequelize.QueryTypes.SELECT }
          );
          finalDepreciationRate = avgResult[0]?.avg_rate || 15.00;
        } catch (err) {
          console.log('Could not get average rate, using default:', err.message);
          finalDepreciationRate = 15.00;
        }
      }

      const categoryData = {
        category_id,
        category_name,
        category_code,
        description,
        parent_category_id,
        depreciation_rate: finalDepreciationRate,
        is_active: true,
        school_id
      };

      await AssetCategory.create(categoryData);

      return successResponse(res, 'Asset category created successfully', { 
        category_id, 
        depreciation_rate: finalDepreciationRate 
      }, 201);
    } catch (error) {
      console.error('Create asset category error:', error);
      return errorResponse(res, 'Failed to create asset category', 500);
    }
  }

  // Get all asset categories with filters
  async getCategories(req, res) {
    try {
      const school_id = req.user?.school_id || req.headers['x-school-id'] || 'SCH/1';
      const { search, is_active, parent_category_id, limit = 50, offset = 0 } = req.query;

      const whereClause = {
        [Op.or]: [
          { school_id: school_id },
          { school_id: null }
        ]
      };
      if (search) {
        whereClause[Op.and] = [
          {
            [Op.or]: [
              { category_name: { [Op.like]: `%${search}%` } },
              { category_code: { [Op.like]: `%${search}%` } },
            ]
          }
        ];
      }
      if (is_active !== undefined) {
        whereClause.is_active = is_active;
      }
      if (parent_category_id) {
        whereClause.parent_category_id = parent_category_id;
      }

      const categories = await AssetCategory.findAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['category_name', 'ASC']],
      });

      return successResponse(res, 'Asset categories retrieved successfully', categories);
    } catch (error) {
      console.error('Get asset categories error:', error);
      return errorResponse(res, 'Failed to retrieve asset categories', 500);
    }
  }

  // Get single asset category by ID
  async getCategoryById(req, res) {
    try {
      const { category_id } = req.params;

      const category = await AssetCategory.findByPk(category_id);

      if (!category) {
        return errorResponse(res, 'Asset category not found', 404);
      }

      return successResponse(res, 'Asset category retrieved successfully', category);
    } catch (error) {
      console.error('Get asset category error:', error);
      return errorResponse(res, 'Failed to retrieve asset category', 500);
    }
  }

  // Update asset category
  async updateCategory(req, res) {
    try {
      const { category_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.category_id;
      delete updateData.school_id;

      const [updatedRowsCount] = await AssetCategory.update(updateData, {
        where: { category_id },
      });

      if (updatedRowsCount === 0) {
        return errorResponse(res, 'Asset category not found', 404);
      }

      return successResponse(res, 'Asset category updated successfully');
    } catch (error) {
      console.error('Update asset category error:', error);
      return errorResponse(res, 'Failed to update asset category', 500);
    }
  }

  // Delete asset category (soft delete)
  async deleteCategory(req, res) {
    try {
      const { category_id } = req.params;

      const [updatedRowsCount] = await AssetCategory.update(
        { is_active: false },
        { where: { category_id } }
      );

      if (updatedRowsCount === 0) {
        return errorResponse(res, 'Asset category not found', 404);
      }

      return successResponse(res, 'Asset category deleted successfully');
    } catch (error) {
      console.error('Delete asset category error:', error);
      return errorResponse(res, 'Failed to delete asset category', 500);
    }
  }

  // Get average depreciation rate for auto-fill
  async getAverageDepreciationRate(req, res) {
    try {
      const school_id = req.user?.school_id || req.headers['x-school-id'] || 'SCH/1';

      const avgResult = await db.sequelize.query(
        `SELECT ROUND(AVG(depreciation_rate), 2) as avg_rate
         FROM asset_categories 
         WHERE depreciation_rate IS NOT NULL 
         AND depreciation_rate > 0
         AND (school_id = :school_id OR school_id IS NULL)
         ORDER BY created_at DESC 
         LIMIT 10`,
        { 
          replacements: { school_id },
          type: db.sequelize.QueryTypes.SELECT 
        }
      );

      const avgRate = avgResult[0]?.avg_rate || 15.00;

      return successResponse(res, 'Average depreciation rate retrieved', { 
        average_rate: parseFloat(avgRate) 
      });
    } catch (error) {
      console.error('Get average depreciation rate error:', error);
      return successResponse(res, 'Default depreciation rate provided', { 
        average_rate: 15.00 
      });
    }
  }
}

module.exports = new AssetCategoryController();