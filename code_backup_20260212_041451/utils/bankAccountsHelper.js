const db = require("../models");

/**
 * Get default bank account for a school
 * This is used in invoice generation to include bank details
 *
 * @param {string} school_id - The school ID
 * @param {string} branch_id - Optional branch ID
 * @returns {Promise<Object|null>} Bank account details or null if not found
 */
async function getDefaultBankAccount(school_id, branch_id = null) {
  try {
    let query = `
      SELECT
        id,
        account_name,
        account_number,
        bank_name,
        bank_code,
        swift_code,
        branch_address
      FROM school_bank_accounts
      WHERE school_id = :school_id
        AND is_default = 1
        AND status = 'Active'
    `;

    const replacements = { school_id };

    // Optionally filter by branch
    if (branch_id) {
      query += ` AND (branch_id = :branch_id OR branch_id IS NULL)`;
      replacements.branch_id = branch_id;
    }

    query += ` LIMIT 1`;

    const [account] = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    return account || null;
  } catch (error) {
    console.error('Error fetching default bank account:', error);
    return null;
  }
}

/**
 * Get all active bank accounts for a school
 *
 * @param {string} school_id - The school ID
 * @param {string} branch_id - Optional branch ID
 * @returns {Promise<Array>} Array of bank accounts
 */
async function getActiveBankAccounts(school_id, branch_id = null) {
  try {
    let query = `
      SELECT
        id,
        account_name,
        account_number,
        bank_name,
        bank_code,
        swift_code,
        branch_address,
        is_default
      FROM school_bank_accounts
      WHERE school_id = :school_id
        AND status = 'Active'
    `;

    const replacements = { school_id };

    if (branch_id) {
      query += ` AND (branch_id = :branch_id OR branch_id IS NULL)`;
      replacements.branch_id = branch_id;
    }

    query += ` ORDER BY is_default DESC, created_at DESC`;

    const accounts = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    return accounts || [];
  } catch (error) {
    console.error('Error fetching active bank accounts:', error);
    return [];
  }
}

/**
 * Format bank account for invoice display
 *
 * @param {Object} account - Bank account object
 * @returns {Object} Formatted bank details for invoice
 */
function formatBankDetailsForInvoice(account) {
  if (!account) {
    return null;
  }

  return {
    bankName: account.bank_name,
    accountNumber: account.account_number,
    accountName: account.account_name,
    bankCode: account.bank_code || '',
    swiftCode: account.swift_code || '',
    branchAddress: account.branch_address || ''
  };
}

module.exports = {
  getDefaultBankAccount,
  getActiveBankAccounts,
  formatBankDetailsForInvoice
};
