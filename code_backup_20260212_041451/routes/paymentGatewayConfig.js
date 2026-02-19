const express = require('express');
const router = express.Router();
const PaymentGatewayConfigController = require('../controllers/PaymentGatewayConfigController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, PaymentGatewayConfigController.getAllConfigs);
router.get('/:schoolId', authenticate, PaymentGatewayConfigController.getConfigBySchool);
router.post('/', authenticate, PaymentGatewayConfigController.createConfig);
router.put('/:id', authenticate, PaymentGatewayConfigController.updateConfig);

module.exports = router;
