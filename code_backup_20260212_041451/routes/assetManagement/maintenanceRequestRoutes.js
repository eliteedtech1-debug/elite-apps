const express = require('express');
const router = express.Router();
const maintenanceRequestController = require('../../controllers/assetManagement/maintenanceRequestController');
const upload = require('../../middleware/multerConfig');
const passport = require('passport');

router.use(passport.authenticate('jwt', { session: false }));

router.get('/', maintenanceRequestController.getRequests);
router.post('/', maintenanceRequestController.createRequest);
router.get('/:request_id', maintenanceRequestController.getRequestById);
router.put('/:request_id', maintenanceRequestController.updateRequest);
router.delete('/:request_id', maintenanceRequestController.deleteRequest);

router.post(
  '/:request_id/images',
  upload.array('images', 5),
  maintenanceRequestController.uploadMaintenanceImages
);

module.exports = router;