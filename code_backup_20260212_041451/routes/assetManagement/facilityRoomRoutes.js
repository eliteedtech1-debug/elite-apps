const express = require('express');
const router = express.Router();
const facilityRoomController = require('../../controllers/assetManagement/facilityRoomController');
const { authenticateToken, authorizeRoles } = require('../../middleware/authMiddleware');

// Temporarily bypass authentication for testing
router.use((req, res, next) => {
  req.user = { school_id: 'SCH/1', branch_id: null, user_type: 'Admin' };
  next();
});

// Facility Room Routes
router.post(
  '/',
  authorizeRoles(['Admin', 'Inventory Manager']),
  facilityRoomController.createRoom
);

router.get('/', facilityRoomController.getRooms);

router.get('/:room_id', facilityRoomController.getRoomById);

router.put(
  '/:room_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  facilityRoomController.updateRoom
);

router.delete(
  '/:room_id',
  authorizeRoles(['Admin', 'Inventory Manager']),
  facilityRoomController.deleteRoom
);

module.exports = router;