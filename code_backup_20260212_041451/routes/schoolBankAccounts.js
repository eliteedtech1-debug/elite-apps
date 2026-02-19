const express = require('express');
const router = express.Router();
const passport = require('passport');

const {
  getBankAccounts,
  getDefaultBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
  registerWithPaystack
} = require('../controllers/schoolBankAccounts');

// All routes require JWT authentication
const auth = passport.authenticate('jwt', { session: false });

// Get all bank accounts for a school
router.get('/', auth, getBankAccounts);

// Get default bank account
router.get('/default', auth, getDefaultBankAccount);

// Create new bank account
router.post('/', auth, createBankAccount);

// Update bank account
router.put('/:accountId', auth, updateBankAccount);

// Delete bank account
router.delete('/:accountId', auth, deleteBankAccount);

// Set default bank account
router.patch('/:accountId/set-default', auth, setDefaultBankAccount);

// Register existing account with Paystack
router.post('/:accountId/register-paystack', auth, registerWithPaystack);

module.exports = router;
