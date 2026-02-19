// Financial Reconciliation Routes
const express = require('express');
const router = express.Router();
const { 
  reconcileFinancialEntries,
  autoCreateMissingJournalEntries,
  generateReconciliationReport,
  getAuditTrail
} = require('../controllers/financialReconciliationController');

// Reconciliation routes
router.get('/reconcile', reconcileFinancialEntries);
router.post('/reconcile/auto-create', autoCreateMissingJournalEntries);
router.get('/reconcile/report', generateReconciliationReport);
router.get('/reconcile/audit-trail', getAuditTrail);

module.exports = router;