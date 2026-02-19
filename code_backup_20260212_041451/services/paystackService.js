const axios = require('axios');
const db = require('../models');

// Get Paystack secret key from environment variables
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Create axios instance with default configuration
const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Get the correct Paystack API instance for a specific vendor/super admin
 * @param {number} userId - The user ID of the vendor/super admin
 * @returns {Object} Axios instance configured with the vendor's Paystack credentials
 */
const getVendorPaystackAPI = async (userId) => {
  // Fetch vendor's Paystack configuration
  const [configResult] = await db.sequelize.query(
    `SELECT paystack_secret_key FROM vendor_payment_configs WHERE user_id = :userId AND is_active = 1`,
    {
      replacements: { userId },
      type: db.sequelize.QueryTypes.SELECT
    }
  );

  if (!configResult || !configResult.paystack_secret_key) {
    // If no vendor-specific key, fall back to default
    return paystackAPI;
  }

  const vendorPaystackAPI = axios.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
      'Authorization': `Bearer ${configResult.paystack_secret_key}`,
      'Content-Type': 'application/json'
    }
  });

  return vendorPaystackAPI;
};

/**
 * Fetch all banks from Paystack
 * @returns {Promise<Array>} List of banks
 */
const fetchBanks = async () => {
  try {
    const response = await paystackAPI.get('/bank');
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to fetch banks: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Resolve account details using account number and bank code
 * @param {string} accountNumber - The account number to resolve
 * @param {string} bankCode - The bank code
 * @returns {Promise<Object>} Account details
 */
const resolveAccount = async (accountNumber, bankCode) => {
  try {
    const response = await paystackAPI.get(`/bank/resolve`, {
      params: {
        account_number: accountNumber,
        bank_code: bankCode
      }
    });
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to resolve account: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Get bank by ID
 * @param {string} bankId - The bank ID
 * @returns {Promise<Object|null>} Bank details or null if not found
 */
const getBankById = async (bankId) => {
  try {
    const banks = await fetchBanks();
    const bank = banks.find(b => b.id === bankId);
    return bank || null;
  } catch (error) {
    console.error(`Failed to get bank by ID: ${error.message}`);
    return null;
  }
};

/**
 * Initialize a Paystack transaction
 * @param {Object} paymentData - Payment data including amount, email, callback_url, etc.
 * @param {number} userId - The user ID of the vendor/super admin (now used to determine split)
 * @returns {Promise<Object>} Transaction initialization response
 */
const initializeTransaction = async (paymentData, userId) => {
  try {
    // Get the user's split payment configuration
    // In a real split payment scenario, you would look up the specific split configuration
    // based on the user or subscription plan. For now, we'll use a simplified approach.

    // Check if split payment configuration is needed based on the user
    const db = require('../models');
    const [configResult] = await db.sequelize.query(
      `SELECT paystack_subaccount_code FROM vendor_payment_configs WHERE user_id = :userId AND is_active = 1`,
      {
        replacements: { userId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // If user has a specific subaccount configured, add split payment parameters
    if (configResult && configResult.paystack_subaccount_code) {
      // Add split payment configuration to the payment data
      paymentData.subaccount = configResult.paystack_subaccount_code;
      // Use the commission percentage to determine how charges are split
      // The subaccount bears the transaction charges by default
      paymentData.transaction_charge = 0; // Subaccount bears all charges by default

      // Use split_code if configured for more complex splitting
      // Only add split_code if it's valid to avoid Paystack errors
      if (configResult.paystack_split_code) {
        // For now, skip the split_code since it's not yet active as mentioned
        // paymentData.split_code = configResult.paystack_split_code;
      }
    } else {
      // For default platform payments, you can use a split configuration
      // This allows for platform commission on all transactions
      // In a production environment, you might use different split codes based on
      // subscription plans or vendor agreements
      const platformSplitCode = process.env.PAYSTACK_SPLIT_CODE; // Define this in .env

      // Skip the platform split code as well since split is not yet active
      // if (platformSplitCode) {
      //   paymentData.split_code = platformSplitCode;
      // }
    }

    const vendorAPI = await getVendorPaystackAPI(userId);
    const response = await vendorAPI.post('/transaction/initialize', paymentData);
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to initialize transaction: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Verify a Paystack transaction
 * @param {string} reference - The transaction reference to verify
 * @param {number} userId - The user ID of the vendor/super admin
 * @returns {Promise<Object>} Verification response
 */
const verifyTransaction = async (reference, userId) => {
  try {
    const vendorAPI = await getVendorPaystackAPI(userId);
    const response = await vendorAPI.get(`/transaction/verify/${reference}`);
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to verify transaction: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Create a Paystack subaccount
 * @param {Object} subaccountData - Subaccount creation data
 * @returns {Promise<Object>} Subaccount creation response
 */
const createSubaccount = async (subaccountData) => {
  try {
    const response = await paystackAPI.post('/subaccount', subaccountData);
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to create subaccount: ${error.response?.data?.message || error.message}`);
  }
};

module.exports = {
  fetchBanks,
  resolveAccount,
  getBankById,
  initializeTransaction,
  verifyTransaction,
  createSubaccount
};