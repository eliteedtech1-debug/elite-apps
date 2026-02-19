const { sequelize } = require('../../models');
const AssetTransfer = sequelize.models.AssetTransfer || require('../../models/assetManagement/AssetTransfer')(sequelize);
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

class AssetTransferController {
  // Create new asset transfer
  async createTransfer(req, res) {
    try {
      const { 
        asset_id, from_room_id, to_room_id, from_branch_id, to_branch_id, 
        reason, notes 
      } = req.body;
      const { school_id, id: user_id } = req.user;

      const transfer_id = generateId('TRANS');
      const transfer_date = new Date().toISOString().split('T')[0]; // Today's date

      const transferData = {
        transfer_id,
        asset_id,
        from_room_id,
        to_room_id,
        from_branch_id,
        to_branch_id,
        transfer_date,
        transferred_by: user_id, // Current user transfers the asset
        received_by: null, // Will be updated when received
        reason,
        status: 'Pending', // Default status
        notes,
        school_id
      };

      await AssetTransfer.create(transferData);

      return successResponse(res, 'Asset transfer created successfully', { transfer_id }, 201);
    } catch (error) {
      console.error('Create asset transfer error:', error);
      return errorResponse(res, 'Failed to create asset transfer', 500);
    }
  }

  // Get all asset transfers with filters
  async getTransfers(req, res) {
    try {
      const { school_id } = req.user;
      const filters = {
        asset_id: req.query.asset_id,
        from_room_id: req.query.from_room_id,
        to_room_id: req.query.to_room_id,
        from_branch_id: req.query.from_branch_id,
        to_branch_id: req.query.to_branch_id,
        status: req.query.status,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      const transfers = await AssetTransfer.findBySchool(school_id, filters);

      return successResponse(res, 'Asset transfers retrieved successfully', transfers);
    } catch (error) {
      console.error('Get asset transfers error:', error);
      return errorResponse(res, 'Failed to retrieve asset transfers', 500);
    }
  }

  // Get single asset transfer by ID
  async getTransferById(req, res) {
    try {
      const { transfer_id } = req.params;

      const transfer = await AssetTransfer.findById(transfer_id);

      if (!transfer) {
        return errorResponse(res, 'Asset transfer not found', 404);
      }

      return successResponse(res, 'Asset transfer retrieved successfully', transfer);
    } catch (error) {
      console.error('Get asset transfer error:', error);
      return errorResponse(res, 'Failed to retrieve asset transfer', 500);
    }
  }

  // Update asset transfer
  async updateTransfer(req, res) {
    try {
      const { transfer_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.transfer_id;
      delete updateData.school_id;
      delete updateData.transfer_date;
      delete updateData.transferred_by;

      const result = await AssetTransfer.updateById(transfer_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Asset transfer not found', 404);
      }

      return successResponse(res, 'Asset transfer updated successfully');
    } catch (error) {
      console.error('Update asset transfer error:', error);
      return errorResponse(res, 'Failed to update asset transfer', 500);
    }
  }

  // Complete an asset transfer (update status to completed and set received_by)
  async completeTransfer(req, res) {
    try {
      const { transfer_id } = req.params;
      const { received_by } = req.body;
      const { id: user_id } = req.user; // The person completing the transfer

      const updateData = {
        status: 'Completed',
        received_by: received_by || user_id, // Set to specified person or current user
        updated_at: new Date()
      };

      const result = await AssetTransfer.updateById(transfer_id, updateData);

      if (result.affectedRows === 0) {
        return errorResponse(res, 'Asset transfer not found', 404);
      }

      return successResponse(res, 'Asset transfer completed successfully');
    } catch (error) {
      console.error('Complete asset transfer error:', error);
      return errorResponse(res, 'Failed to complete asset transfer', 500);
    }
  }
}

module.exports = new AssetTransferController();