const express = require('express');
const router = express.Router();
const AdmissionTokenController = require('../controllers/AdmissionTokenController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, AdmissionTokenController.getTokens);
router.post('/generate', authenticateToken, AdmissionTokenController.generateTokens);
router.put('/bulk-expire', authenticateToken, AdmissionTokenController.bulkExpireTokens);
router.put('/bulk-disable', authenticateToken, AdmissionTokenController.bulkDisableTokens);
router.put('/bulk-enable', authenticateToken, AdmissionTokenController.bulkEnableTokens);
router.put('/bulk-extend', authenticateToken, AdmissionTokenController.bulkExtendTokens);
router.put('/:id', authenticateToken, AdmissionTokenController.updateToken);
router.put('/:id/disable', authenticateToken, AdmissionTokenController.disableToken);
router.get('/stats', authenticateToken, AdmissionTokenController.getStats);
router.post('/validate', AdmissionTokenController.validateToken);
router.post('/use', AdmissionTokenController.useToken);

module.exports = router;
