const gatewayConfig = require('../services/gateway.config.service');

class SchoolOnboardingController {
  /**
   * Add bank account during school onboarding
   * POST /api/schools/bank-accounts
   */
  async addBankAccount(req, res) {
    try {
      const { accountName, accountNumber, bankCode, bankName, accountType } = req.body;
      const schoolId = req.headers['x-school-id'];

      // Validate required fields
      if (!accountName || !accountNumber || !bankCode || !accountType) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['accountName', 'accountNumber', 'bankCode', 'accountType']
        });
      }

      // Validate account type
      if (!['revenue', 'platform_fee', 'other'].includes(accountType)) {
        return res.status(400).json({ 
          error: 'Invalid account type',
          allowed: ['revenue', 'platform_fee', 'other']
        });
      }

      const account = await gatewayConfig.addSchoolBankAccount({
        schoolId,
        accountName,
        accountNumber,
        bankCode,
        bankName: bankName || '',
        accountType
      });

      res.json({
        success: true,
        message: 'Bank account added successfully',
        account
      });

    } catch (error) {
      console.error('Add Bank Account Error:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ 
          error: 'Bank account already exists for this school' 
        });
      }

      res.status(500).json({ error: 'Failed to add bank account' });
    }
  }

  /**
   * Get school's bank accounts
   * GET /api/schools/bank-accounts
   */
  async getBankAccounts(req, res) {
    try {
      const schoolId = req.headers['x-school-id'];

      const accounts = await gatewayConfig.getSchoolBankAccounts(schoolId);

      res.json({
        success: true,
        accounts
      });

    } catch (error) {
      console.error('Get Bank Accounts Error:', error);
      res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
  }
}

module.exports = new SchoolOnboardingController();
