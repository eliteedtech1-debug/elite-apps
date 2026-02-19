const express = require('express');
const passport = require('passport');
const CreditBalanceController = require('../controllers/CreditBalanceController');
const TrueStudentLedgerController = require('../controllers/TrueStudentLedgerController');

const router = express.Router();

// Get student credit balance and ledger history
router.get('/student', 
  passport.authenticate('jwt', { session: false }),
  CreditBalanceController.getStudentCreditInfo
);

// Add credit to student balance (manual credit)
router.post('/add-credit',
  passport.authenticate('jwt', { session: false }),
  CreditBalanceController.addCredit
);

// Use credit for bill settlement
router.post('/use-credit',
  passport.authenticate('jwt', { session: false }),
  CreditBalanceController.useCredit
);

// Auto-settle bill using available credit (Legacy - kept for backward compatibility)
router.post('/auto-settle',
  passport.authenticate('jwt', { session: false }),
  CreditBalanceController.autoSettleBill
);

// Calculate net invoice amount with scholarships and credits (Global Best Practice)
router.post('/calculate-net-invoice',
  passport.authenticate('jwt', { session: false }),
  CreditBalanceController.calculateNetInvoice
);

// Process invoice with credit application (Global Best Practice)
router.post('/process-invoice',
  passport.authenticate('jwt', { session: false }),
  CreditBalanceController.processInvoiceWithCredits
);

// TRUE STUDENT LEDGER - Complete financial history
router.get('/complete-ledger', 
  passport.authenticate('jwt', { session: false }),
  TrueStudentLedgerController.getCompleteStudentLedger
);

// Student financial summary
router.get('/financial-summary', 
  passport.authenticate('jwt', { session: false }),
  TrueStudentLedgerController.getStudentFinancialSummary
);

module.exports = router;
