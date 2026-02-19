const db = require('../config/database');

class GatewayConfigService {
  /**
   * Get app-level Remita configuration from environment variables
   * @returns {Object} Remita configuration
   */
  getRemitaConfig() {
    const isProduction = process.env.REMITA_ENVIRONMENT === 'production';
    
    return {
      merchantId: process.env.REMITA_MERCHANT_ID,
      apiKey: process.env.REMITA_API_KEY,
      serviceTypeId: process.env.REMITA_SERVICE_TYPE_ID,
      isProduction,
      gatewayUrl: isProduction
        ? 'https://login.remita.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit'
        : 'https://remitademo.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit',
      verifyUrl: isProduction
        ? 'https://login.remita.net/remita/ecomm'
        : 'https://remitademo.net/remita/ecomm',
      paymentUrl: isProduction
        ? 'https://login.remita.net/remita/ecomm/finalize.reg'
        : 'https://remitademo.net/remita/ecomm/finalize.reg'
    };
  }

  /**
   * Get school's bank accounts for split payment
   * @param {string} schoolId - School ID
   * @returns {Promise<Array>} Array of bank accounts
   */
  async getSchoolBankAccounts(schoolId) {
    const [accounts] = await db.execute(
      `SELECT * FROM school_bank_accounts 
       WHERE school_id = ? AND is_active = 1 
       ORDER BY is_default DESC, account_type`,
      [schoolId]
    );
    return accounts;
  }

  /**
   * Get platform fee account
   * @returns {Promise<Object>} Platform fee account
   */
  async getPlatformAccount() {
    const [accounts] = await db.execute(
      `SELECT * FROM school_bank_accounts 
       WHERE school_id = 'PLATFORM' AND account_type = 'platform_fee' 
       LIMIT 1`
    );
    return accounts[0];
  }

  /**
   * Add bank account for school during onboarding
   * @param {Object} accountData - Account details
   * @returns {Promise<Object>} Created account
   */
  async addSchoolBankAccount(accountData) {
    const { schoolId, accountName, accountNumber, bankCode, bankName, accountType } = accountData;
    
    const [result] = await db.execute(
      `INSERT INTO school_bank_accounts 
       (school_id, account_name, account_number, bank_code, bank_name, account_type, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId, 
        accountName, 
        accountNumber, 
        bankCode, 
        bankName, 
        accountType,
        accountType === 'revenue' ? 1 : 0
      ]
    );

    return { id: result.insertId, ...accountData };
  }

  /**
   * Validate Remita configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    const config = this.getRemitaConfig();
    
    if (!config.merchantId || !config.apiKey || !config.serviceTypeId) {
      throw new Error('Remita configuration incomplete. Check environment variables.');
    }
  }
}

module.exports = new GatewayConfigService();
