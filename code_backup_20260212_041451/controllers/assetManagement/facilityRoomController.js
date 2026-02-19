const { FacilityRoom } = require('../../models');
const { generateId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const { Op } = require('sequelize');

console.log('🔥 FacilityRoomController loaded, FacilityRoom:', !!FacilityRoom);

class FacilityRoomController {
  // Create new facility room
  async createRoom(req, res) {
    try {
      const { room_name, room_type, room_code, floor_number, capacity, branch_id, notes } = req.body;
      const { school_id } = req.user;

      const room_id = generateId('ROOM');

      const roomData = {
        room_id,
        room_name,
        room_type,
        room_code,
        floor_number,
        capacity,
        branch_id,
        school_id,
        is_active: true,
        notes
      };

      await FacilityRoom.create(roomData);

      return successResponse(res, 'Facility room created successfully', { room_id }, 201);
    } catch (error) {
      console.error('Create facility room error:', error);
      return errorResponse(res, 'Failed to create facility room', 500);
    }
  }

  // Get all facility rooms with filters
  async getRooms(req, res) {
    try {
      console.log('✅ getRooms called, req.user:', req.user);
      const { school_id } = req.user || {};
      if (!school_id) {
        console.log('❌ No school_id found');
        return errorResponse(res, 'School ID not found in request', 401);
      }
      console.log('✅ school_id:', school_id);
      const { branch_id, room_type, is_active, search, limit = 50, offset = 0 } = req.query;

      const whereClause = { school_id };
      if (branch_id) {
        whereClause.branch_id = branch_id;
      }
      if (room_type) {
        whereClause.room_type = room_type;
      }
      if (is_active !== undefined) {
        whereClause.is_active = is_active;
      }
      if (search) {
        whereClause[Op.or] = [
          { room_name: { [Op.like]: `%${search}%` } },
          { room_code: { [Op.like]: `%${search}%` } },
        ];
      }

      const rooms = await FacilityRoom.findAll({
        attributes: ['room_id', 'room_name', 'room_type', 'room_code', 'floor_number', 'capacity', 'branch_id', 'school_id', 'is_active', 'notes', 'status'],
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['room_name', 'ASC']],
        raw: true
      });

      return successResponse(res, 'Facility rooms retrieved successfully', rooms);
    } catch (error) {
      console.error('❌ Get facility rooms error:', error.message);
      console.error('❌ Stack:', error.stack);
      return errorResponse(res, 'Failed to retrieve facility rooms', 500);
    }
  }

  // Get single facility room by ID
  async getRoomById(req, res) {
    try {
      const { room_id } = req.params;

      const room = await FacilityRoom.findByPk(room_id);

      if (!room) {
        return errorResponse(res, 'Facility room not found', 404);
      }

      return successResponse(res, 'Facility room retrieved successfully', room);
    } catch (error) {
      console.error('Get facility room error:', error);
      return errorResponse(res, 'Failed to retrieve facility room', 500);
    }
  }

  // Update facility room
  async updateRoom(req, res) {
    try {
      const { room_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.room_id;
      delete updateData.school_id;

      const [updatedRowsCount] = await FacilityRoom.update(updateData, {
        where: { room_id },
      });

      if (updatedRowsCount === 0) {
        return errorResponse(res, 'Facility room not found', 404);
      }

      return successResponse(res, 'Facility room updated successfully');
    } catch (error) {
      console.error('Update facility room error:', error);
      return errorResponse(res, 'Failed to update facility room', 500);
    }
  }

  // Delete facility room (soft delete)
  async deleteRoom(req, res) {
    try {
      const { room_id } = req.params;

      const [updatedRowsCount] = await FacilityRoom.update(
        { is_active: false },
        { where: { room_id } }
      );

      if (updatedRowsCount === 0) {
        return errorResponse(res, 'Facility room not found', 404);
      }

      return successResponse(res, 'Facility room deleted successfully');
    } catch (error) {
      console.error('Delete facility room error:', error);
      return errorResponse(res, 'Failed to delete facility room', 500);
    }
  }
}

module.exports = new FacilityRoomController();