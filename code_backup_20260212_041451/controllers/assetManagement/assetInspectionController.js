const AssetInspection = require('../../models/assetManagement/AssetInspection');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class AssetInspectionController {
  // Create new asset inspection
  async createInspection(req, res) {
    try {
      const { 
        asset_id, inspection_date, inspector_id, condition_rating,
        status_after_inspection, findings, recommendations,
        next_inspection_date 
      } = req.body;
      const { school_id, id: user_id } = req.user;

      const inspection_id = generateId('INS');

      // Handle Cloudinary file uploads
      let attachments = [];
      if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          url: file.path, // Cloudinary URL
          size: file.size,
          mimetype: file.mimetype,
          public_id: file.public_id // Cloudinary public ID for deletion
        }));
      }

      const inspectionData = {
        inspection_id,
        asset_id,
        inspection_date,
        inspector_id: inspector_id || user_id,
        condition_rating,
        status_after_inspection,
        findings,
        recommendations,
        attachments: JSON.stringify(attachments),
        next_inspection_date,
        school_id
      };

      await AssetInspection.create(inspectionData);

      return successResponse(res, 'Asset inspection created successfully', { 
        inspection_id,
        attachments_count: attachments.length 
      }, 201);
    } catch (error) {
      console.error('Create asset inspection error:', error);
      return errorResponse(res, 'Failed to create asset inspection', 500);
    }
  }

  // Get all asset inspections with filters
  async getInspections(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        asset_id: req.query.asset_id,
        inspector_id: req.query.inspector_id,
        condition_rating: req.query.condition_rating,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      const inspections = await AssetInspection.findBySchool(school_id, filters);

      return successResponse(res, 'Asset inspections retrieved successfully', inspections);
    } catch (error) {
      console.error('Get asset inspections error:', error);
      return errorResponse(res, 'Failed to retrieve asset inspections', 500);
    }
  }

  // Get single asset inspection by ID
  async getInspectionById(req, res) {
    try {
      const { inspection_id } = req.params;

      const inspection = await AssetInspection.findById(inspection_id);

      if (!inspection) {
        return errorResponse(res, 'Asset inspection not found', 404);
      }

      return successResponse(res, 'Asset inspection retrieved successfully', inspection);
    } catch (error) {
      console.error('Get asset inspection error:', error);
      return errorResponse(res, 'Failed to retrieve asset inspection', 500);
    }
  }

  // Update asset inspection
  async updateInspection(req, res) {
    try {
      const { inspection_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.inspection_id;
      delete updateData.school_id;

      const result = await AssetInspection.update(inspection_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Asset inspection not found', 404);
      }

      return successResponse(res, 'Asset inspection updated successfully');
    } catch (error) {
      console.error('Update asset inspection error:', error);
      return errorResponse(res, 'Failed to update asset inspection', 500);
    }
  }
}

module.exports = new AssetInspectionController();