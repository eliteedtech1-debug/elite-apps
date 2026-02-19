const db = require('../../models');
const MaintenanceRequest = db.MaintenanceRequest;
const Asset = db.Asset;
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class MaintenanceRequestController {
  // Create new maintenance request
  async createRequest(req, res) {
    try {
      const { 
        asset_id, priority, issue_description, assigned_to, 
        estimated_cost, vendor_name, vendor_contact 
      } = req.body;
      const { school_id, id: user_id } = req.user;
      const branch_id = req.headers['x-branch-id'] || req.user.branch_id;

      const request_id = generateId('REQ');
      const request_date = new Date().toISOString().split('T')[0]; // Today's date

      const requestData = {
        request_id,
        asset_id,
        request_date,
        requested_by: user_id, // Current user creates the request
        priority,
        issue_description,
        status: 'Pending', // Default status
        assigned_to,
        estimated_cost,
        actual_cost: 0, // Initially 0
        vendor_name,
        vendor_contact,
        school_id,
        branch_id
      };

      await MaintenanceRequest.create(requestData);

      // Update asset status to 'Under Maintenance'
      await Asset.update({ status: 'Under Maintenance' }, { where: { asset_id } });

      return successResponse(res, 'Maintenance request created successfully', { request_id }, 201);
    } catch (error) {
      console.error('Create maintenance request error:', error);
      return errorResponse(res, 'Failed to create maintenance request', 500);
    }
  }

  // Get all maintenance requests with filters
  async getRequests(req, res) {
    try {
      const { school_id } = req.user;
      const { 
        asset_id, requested_by, assigned_to, status, priority, branch_id,
        limit = 50, offset = 0 
      } = req.query;

      const whereClause = { school_id };
      
      if (asset_id) whereClause.asset_id = asset_id;
      if (requested_by) whereClause.requested_by = requested_by;
      if (assigned_to) whereClause.assigned_to = assigned_to;
      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;
      if (branch_id) whereClause.branch_id = branch_id;

      const requests = await MaintenanceRequest.findAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['request_date', 'DESC']]
      });

      return successResponse(res, 'Maintenance requests retrieved successfully', requests);
    } catch (error) {
      console.error('Get maintenance requests error:', error);
      return errorResponse(res, 'Failed to retrieve maintenance requests', 500);
    }
  }

  // Get single maintenance request by ID
  async getRequestById(req, res) {
    try {
      const { request_id } = req.params;
      const { school_id } = req.user;

      const request = await MaintenanceRequest.findOne({
        where: { 
          request_id,
          school_id 
        }
      });

      if (!request) {
        return errorResponse(res, 'Maintenance request not found', 404);
      }

      return successResponse(res, 'Maintenance request retrieved successfully', request);
    } catch (error) {
      console.error('Get maintenance request error:', error);
      return errorResponse(res, 'Failed to retrieve maintenance request', 500);
    }
  }

  // Update maintenance request
  async updateRequest(req, res) {
    try {
      const { request_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.request_id;
      delete updateData.school_id;
      delete updateData.request_date;
      delete updateData.requested_by;

      const result = await MaintenanceRequest.update(request_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Maintenance request not found', 404);
      }

      if (updateData.status === 'Completed') {
        const request = await MaintenanceRequest.findById(request_id);
        await Asset.update({ status: 'Working' }, { where: { asset_id: request.asset_id } });
      }

      return successResponse(res, 'Maintenance request updated successfully');
    } catch (error) {
      console.error('Update maintenance request error:', error);
      return errorResponse(res, 'Failed to update maintenance request', 500);
    }
  }

  // Upload maintenance request images
  async uploadMaintenanceImages(req, res) {
    try {
      const { request_id } = req.params;
      const images = req.files;

      if (!images || images.length === 0) {
        return errorResponse(res, 'No images uploaded', 400);
      }

      const image_urls = images.map(image => image.path);

      for (const image_url of image_urls) {
        await db.sequelize.query(
          'INSERT INTO maintenance_images (request_id, image_url) VALUES (:request_id, :image_url)',
          {
            replacements: { request_id, image_url },
            type: db.sequelize.QueryTypes.INSERT,
          }
        );
      }

      return successResponse(res, 'Images uploaded successfully');
    } catch (error) {
      console.error('Upload maintenance images error:', error);
      return errorResponse(res, 'Failed to upload images', 500);
    }
  }

  // Delete maintenance request
  async deleteRequest(req, res) {
    try {
      const { request_id } = req.params;
      
      const [updatedRowsCount] = await MaintenanceRequest.update(
        { status: 'Cancelled' },
        { where: { request_id } }
      );

      if (updatedRowsCount === 0) {
        return errorResponse(res, 'Maintenance request not found', 404);
      }

      return successResponse(res, 'Maintenance request deleted successfully');
    } catch (error) {
      console.error('Delete maintenance request error:', error);
      return errorResponse(res, 'Failed to delete maintenance request', 500);
    }
  }
}

module.exports = new MaintenanceRequestController();
module.exports.uploadMaintenanceImages = new MaintenanceRequestController().uploadMaintenanceImages;