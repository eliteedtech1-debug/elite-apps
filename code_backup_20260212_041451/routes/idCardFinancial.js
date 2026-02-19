const express = require('express');
const router = express.Router();
const IdCardFinancialController = require('../controllers/IdCardFinancialController');
const auth = require('../middleware/auth');

router.get('/billing-config', auth.authenticate, IdCardFinancialController.getBillingConfig);
router.put('/billing-config', auth.authenticate, IdCardFinancialController.updateBillingConfig);
router.post('/calculate-cost', auth.authenticate, IdCardFinancialController.calculateCost);
router.post('/create-billing', auth.authenticate, IdCardFinancialController.createBilling);
router.get('/analytics', auth.authenticate, IdCardFinancialController.getUsageAnalytics);
router.post('/payment/:financial_tracking_id', auth.authenticate, IdCardFinancialController.processPayment);
router.get('/report', auth.authenticate, IdCardFinancialController.getFinancialReport);
router.get('/audit-trail', auth.authenticate, IdCardFinancialController.getAuditTrail);

module.exports = router;