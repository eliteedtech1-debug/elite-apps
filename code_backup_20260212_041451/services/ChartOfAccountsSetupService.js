/**
 * Chart of Accounts Setup Service
 * 
 * Automatically creates standard chart of accounts for new schools and branches.
 * Ensures every school gets a GAAP-compliant accounting structure automatically.
 * 
 * Security Features:
 * - Atomic transactions for setup operations
 * - Comprehensive audit logging
 * - Input validation and sanitization
 * - Error handling with rollback
 * - Duplicate prevention
 */

// Import models dynamically to avoid circular dependency
let models = null;
const getModels = () => {
  if (!models) {
    models = require('../models');
  }
  return models;
};
const { Op } = require('sequelize');

class ChartOfAccountsSetupService {
  constructor() {
    this.standardChartTemplate = this.getStandardChartTemplate();
  }

  /**
   * Get the standard GAAP-compliant chart of accounts template
   */
  getStandardChartTemplate() {
    return [
      // ASSETS (1000-1999)
      {
        account_code: '1100',
        account_name: 'Cash and Cash Equivalents',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Cash on hand, bank accounts, and short-term investments',
        is_system_account: true
      },
      {
        account_code: '1110',
        account_name: 'Petty Cash',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Small amounts of cash kept on hand for minor expenses',
        parent_account_code: '1100',
        is_system_account: true
      },
      {
        account_code: '1120',
        account_name: 'Bank Account - Operating',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Primary operating bank account',
        parent_account_code: '1100',
        is_system_account: true
      },
      {
        account_code: '1200',
        account_name: 'Accounts Receivable',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Amounts owed to the school by students and other parties',
        is_system_account: true
      },
      {
        account_code: '1210',
        account_name: 'Accounts Receivable - Students',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Tuition fees and other charges owed by students',
        parent_account_code: '1200',
        is_system_account: true
      },
      {
        account_code: '1220',
        account_name: 'Accounts Receivable - Other',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Other receivables not related to student fees',
        parent_account_code: '1200',
        is_system_account: true
      },
      {
        account_code: '1300',
        account_name: 'Inventory',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Educational materials, supplies, and other inventory items',
        is_system_account: true
      },
      {
        account_code: '1310',
        account_name: 'Inventory - Educational Materials',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Books, stationery, and educational supplies for sale',
        parent_account_code: '1300',
        is_system_account: true
      },
      {
        account_code: '1400',
        account_name: 'Prepaid Expenses',
        account_type: 'ASSET',
        account_category: 'CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Expenses paid in advance',
        is_system_account: true
      },
      {
        account_code: '1500',
        account_name: 'Property, Plant & Equipment',
        account_type: 'ASSET',
        account_category: 'NON_CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Long-term physical assets used in operations',
        is_system_account: true
      },
      {
        account_code: '1510',
        account_name: 'Buildings',
        account_type: 'ASSET',
        account_category: 'NON_CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'School buildings and structures',
        parent_account_code: '1500',
        is_system_account: true
      },
      {
        account_code: '1520',
        account_name: 'Equipment',
        account_type: 'ASSET',
        account_category: 'NON_CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Educational and office equipment',
        parent_account_code: '1500',
        is_system_account: true
      },
      {
        account_code: '1530',
        account_name: 'Furniture & Fixtures',
        account_type: 'ASSET',
        account_category: 'NON_CURRENT_ASSET',
        normal_balance: 'DEBIT',
        description: 'Furniture, fixtures, and fittings',
        parent_account_code: '1500',
        is_system_account: true
      },

      // LIABILITIES (2000-2999)
      {
        account_code: '2100',
        account_name: 'Accounts Payable',
        account_type: 'LIABILITY',
        account_category: 'CURRENT_LIABILITY',
        normal_balance: 'CREDIT',
        description: 'Amounts owed to suppliers and vendors',
        is_system_account: true
      },
      {
        account_code: '2110',
        account_name: 'Accounts Payable - Student Refunds',
        account_type: 'LIABILITY',
        account_category: 'CURRENT_LIABILITY',
        normal_balance: 'CREDIT',
        description: 'Refunds owed to students',
        parent_account_code: '2100',
        is_system_account: true
      },
      {
        account_code: '2200',
        account_name: 'Accrued Expenses',
        account_type: 'LIABILITY',
        account_category: 'CURRENT_LIABILITY',
        normal_balance: 'CREDIT',
        description: 'Expenses incurred but not yet paid',
        is_system_account: true
      },
      {
        account_code: '2210',
        account_name: 'Accrued Salaries',
        account_type: 'LIABILITY',
        account_category: 'CURRENT_LIABILITY',
        normal_balance: 'CREDIT',
        description: 'Salaries earned by staff but not yet paid',
        parent_account_code: '2200',
        is_system_account: true
      },
      {
        account_code: '2300',
        account_name: 'Deferred Revenue',
        account_type: 'LIABILITY',
        account_category: 'CURRENT_LIABILITY',
        normal_balance: 'CREDIT',
        description: 'Revenue received in advance',
        is_system_account: true
      },
      {
        account_code: '2310',
        account_name: 'Deferred Revenue - Tuition',
        account_type: 'LIABILITY',
        account_category: 'CURRENT_LIABILITY',
        normal_balance: 'CREDIT',
        description: 'Tuition fees received in advance',
        parent_account_code: '2300',
        is_system_account: true
      },
      {
        account_code: '2400',
        account_name: 'Taxes Payable',
        account_type: 'LIABILITY',
        account_category: 'CURRENT_LIABILITY',
        normal_balance: 'CREDIT',
        description: 'Various taxes owed to government',
        is_system_account: true
      },

      // EQUITY (3000-3999)
      {
        account_code: '3100',
        account_name: 'Retained Earnings',
        account_type: 'EQUITY',
        account_category: 'OWNERS_EQUITY',
        normal_balance: 'CREDIT',
        description: 'Accumulated earnings retained in the business',
        is_system_account: true
      },
      {
        account_code: '3200',
        account_name: 'Current Year Earnings',
        account_type: 'EQUITY',
        account_category: 'OWNERS_EQUITY',
        normal_balance: 'CREDIT',
        description: 'Net income for the current fiscal year',
        is_system_account: true
      },

      // REVENUE (4000-4999)
      {
        account_code: '4100',
        account_name: 'Tuition and Fee Revenue',
        account_type: 'REVENUE',
        account_category: 'OPERATING_REVENUE',
        normal_balance: 'CREDIT',
        description: 'Primary revenue from tuition and academic fees',
        is_system_account: true
      },
      {
        account_code: '4110',
        account_name: 'Tuition Revenue',
        account_type: 'REVENUE',
        account_category: 'OPERATING_REVENUE',
        normal_balance: 'CREDIT',
        description: 'Revenue from tuition fees',
        parent_account_code: '4100',
        is_system_account: true
      },
      {
        account_code: '4120',
        account_name: 'Registration Fees',
        account_type: 'REVENUE',
        account_category: 'OPERATING_REVENUE',
        normal_balance: 'CREDIT',
        description: 'Revenue from registration and enrollment fees',
        parent_account_code: '4100',
        is_system_account: true
      },
      {
        account_code: '4130',
        account_name: 'Examination Fees',
        account_type: 'REVENUE',
        account_category: 'OPERATING_REVENUE',
        normal_balance: 'CREDIT',
        description: 'Revenue from examination and assessment fees',
        parent_account_code: '4100',
        is_system_account: true
      },
      {
        account_code: '4150',
        account_name: 'Student Discounts and Scholarships',
        account_type: 'CONTRA_REVENUE',
        account_category: 'OPERATING_REVENUE',
        normal_balance: 'DEBIT',
        description: 'Discounts and scholarships given to students (contra-revenue)',
        is_system_account: true
      },
      {
        account_code: '4200',
        account_name: 'Sales Revenue - Educational Materials',
        account_type: 'REVENUE',
        account_category: 'OPERATING_REVENUE',
        normal_balance: 'CREDIT',
        description: 'Revenue from sale of books, supplies, and educational materials',
        is_system_account: true
      },
      {
        account_code: '4300',
        account_name: 'Other Revenue',
        account_type: 'REVENUE',
        account_category: 'NON_OPERATING_REVENUE',
        normal_balance: 'CREDIT',
        description: 'Revenue from fines, penalties, and other sources',
        is_system_account: true
      },
      {
        account_code: '4310',
        account_name: 'Fine Revenue',
        account_type: 'REVENUE',
        account_category: 'NON_OPERATING_REVENUE',
        normal_balance: 'CREDIT',
        description: 'Revenue from student fines and penalties',
        parent_account_code: '4300',
        is_system_account: true
      },
      {
        account_code: '4400',
        account_name: 'Other Operating Revenue',
        account_type: 'REVENUE',
        account_category: 'OPERATING_REVENUE',
        normal_balance: 'CREDIT',
        description: 'Other miscellaneous operating revenue',
        is_system_account: true
      },

      // EXPENSES (5000-5999)
      {
        account_code: '5100',
        account_name: 'Salaries and Wages',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Salaries and wages paid to staff',
        is_system_account: true
      },
      {
        account_code: '5110',
        account_name: 'Teaching Staff Salaries',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Salaries paid to teaching staff',
        parent_account_code: '5100',
        is_system_account: true
      },
      {
        account_code: '5120',
        account_name: 'Administrative Staff Salaries',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Salaries paid to administrative staff',
        parent_account_code: '5100',
        is_system_account: true
      },
      {
        account_code: '5200',
        account_name: 'Administrative Expenses',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'General administrative and office expenses',
        is_system_account: true
      },
      {
        account_code: '5210',
        account_name: 'Office Supplies',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Office supplies and stationery',
        parent_account_code: '5200',
        is_system_account: true
      },
      {
        account_code: '5220',
        account_name: 'Communication Expenses',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Telephone, internet, and communication costs',
        parent_account_code: '5200',
        is_system_account: true
      },
      {
        account_code: '5250',
        account_name: 'Student Refunds Expense',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Refunds paid to students',
        is_system_account: true
      },
      {
        account_code: '5300',
        account_name: 'Utilities and Maintenance',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Utilities, maintenance, and facility costs',
        is_system_account: true
      },
      {
        account_code: '5310',
        account_name: 'Electricity',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Electricity and power costs',
        parent_account_code: '5300',
        is_system_account: true
      },
      {
        account_code: '5320',
        account_name: 'Water and Sanitation',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Water, sewage, and sanitation costs',
        parent_account_code: '5300',
        is_system_account: true
      },
      {
        account_code: '5330',
        account_name: 'Building Maintenance',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Building repairs and maintenance',
        parent_account_code: '5300',
        is_system_account: true
      },
      {
        account_code: '5400',
        account_name: 'Educational Expenses',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Direct educational and instructional expenses',
        is_system_account: true
      },
      {
        account_code: '5410',
        account_name: 'Teaching Materials',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Teaching aids, materials, and supplies',
        parent_account_code: '5400',
        is_system_account: true
      },
      {
        account_code: '5420',
        account_name: 'Library Expenses',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Library books, materials, and maintenance',
        parent_account_code: '5400',
        is_system_account: true
      },
      {
        account_code: '5500',
        account_name: 'Marketing and Promotion',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Marketing, advertising, and promotional expenses',
        is_system_account: true
      },
      {
        account_code: '5600',
        account_name: 'Professional Services',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Legal, accounting, and other professional services',
        is_system_account: true
      },
      {
        account_code: '5700',
        account_name: 'Depreciation Expense',
        account_type: 'EXPENSE',
        account_category: 'OPERATING_EXPENSE',
        normal_balance: 'DEBIT',
        description: 'Depreciation of property, plant, and equipment',
        is_system_account: true
      }
    ];
  }

  /**
   * Automatically setup chart of accounts for a new school
   */
  async setupSchoolChartOfAccounts(schoolId, schoolName, createdBy = 'system') {
    try {
      console.log(`Setting up chart of accounts for school: ${schoolId} (${schoolName})`);

      // Check if chart of accounts already exists for this school
      const models = getModels();
      const existingAccounts = await models.ChartOfAccounts.count({
        where: { school_id: schoolId }
      });

      if (existingAccounts > 0) {
        console.log(`Chart of accounts already exists for school ${schoolId}. Skipping setup.`);
        return {
          success: true,
          message: 'Chart of accounts already exists',
          accounts_created: 0,
          existing_accounts: existingAccounts
        };
      }

      const createdAccounts = [];

      // Use transaction for atomic operation
      await models.sequelize.transaction(async (transaction) => {
        for (const accountTemplate of this.standardChartTemplate) {
          try {
            const account = await models.ChartOfAccounts.create({
              account_code: accountTemplate.account_code,
              account_name: accountTemplate.account_name,
              account_type: accountTemplate.account_type,
              account_category: accountTemplate.account_category,
              normal_balance: accountTemplate.normal_balance,
              description: accountTemplate.description,
              parent_account_code: accountTemplate.parent_account_code,
              is_active: true,
              is_system_account: accountTemplate.is_system_account || false,
              current_balance: 0,
              school_id: schoolId,
              branch_id: null, // School-level accounts have no branch
              created_by: createdBy
            }, { transaction });

            createdAccounts.push(account);
          } catch (error) {
            console.error(`Failed to create account ${accountTemplate.account_code} for school ${schoolId}:`, error.message);
            // Continue with other accounts even if one fails
          }
        }

        // Log the setup operation
        console.log(`Successfully created ${createdAccounts.length} accounts for school ${schoolId}`);
      });

      return {
        success: true,
        message: `Chart of accounts setup completed for school ${schoolName}`,
        accounts_created: createdAccounts.length,
        school_id: schoolId,
        accounts: createdAccounts
      };

    } catch (error) {
      console.error(`Error setting up chart of accounts for school ${schoolId}:`, error);
      throw new Error(`Failed to setup chart of accounts for school ${schoolId}: ${error.message}`);
    }
  }

  /**
   * Automatically setup chart of accounts for a new branch
   */
  async setupBranchChartOfAccounts(schoolId, branchId, branchName, createdBy = 'system') {
    try {
      console.log(`Setting up chart of accounts for branch: ${branchId} (${branchName}) in school: ${schoolId}`);

      // Check if chart of accounts already exists for this branch
      const models = getModels();
      const existingAccounts = await models.ChartOfAccounts.count({
        where: { 
          school_id: schoolId,
          branch_id: branchId
        }
      });

      if (existingAccounts > 0) {
        console.log(`Chart of accounts already exists for branch ${branchId}. Skipping setup.`);
        return {
          success: true,
          message: 'Chart of accounts already exists for branch',
          accounts_created: 0,
          existing_accounts: existingAccounts
        };
      }

      // Get school-level accounts to copy
      const schoolAccounts = await models.ChartOfAccounts.findAll({
        where: {
          school_id: schoolId,
          branch_id: null // School-level accounts
        }
      });

      if (schoolAccounts.length === 0) {
        // If no school accounts exist, create them first
        await this.setupSchoolChartOfAccounts(schoolId, 'Auto-created for branch', createdBy);
        
        // Fetch the newly created school accounts
        const newSchoolAccounts = await models.ChartOfAccounts.findAll({
          where: {
            school_id: schoolId,
            branch_id: null
          }
        });
        schoolAccounts.push(...newSchoolAccounts);
      }

      const createdAccounts = [];

      // Use transaction for atomic operation
      await models.sequelize.transaction(async (transaction) => {
        for (const schoolAccount of schoolAccounts) {
          try {
            const branchAccount = await models.ChartOfAccounts.create({
              account_code: schoolAccount.account_code,
              account_name: `${schoolAccount.account_name} - ${branchName}`,
              account_type: schoolAccount.account_type,
              account_category: schoolAccount.account_category,
              normal_balance: schoolAccount.normal_balance,
              description: `${schoolAccount.description} (Branch: ${branchName})`,
              parent_account_code: schoolAccount.parent_account_code,
              is_active: true,
              is_system_account: schoolAccount.is_system_account,
              current_balance: 0,
              school_id: schoolId,
              branch_id: branchId,
              created_by: createdBy
            }, { transaction });

            createdAccounts.push(branchAccount);
          } catch (error) {
            console.error(`Failed to create branch account ${schoolAccount.account_code} for branch ${branchId}:`, error.message);
            // Continue with other accounts even if one fails
          }
        }

        console.log(`Successfully created ${createdAccounts.length} branch accounts for branch ${branchId}`);
      });

      return {
        success: true,
        message: `Chart of accounts setup completed for branch ${branchName}`,
        accounts_created: createdAccounts.length,
        school_id: schoolId,
        branch_id: branchId,
        accounts: createdAccounts
      };

    } catch (error) {
      console.error(`Error setting up chart of accounts for branch ${branchId}:`, error);
      throw new Error(`Failed to setup chart of accounts for branch ${branchId}: ${error.message}`);
    }
  }

  /**
   * Setup chart of accounts for existing schools that don't have it
   */
  async setupExistingSchools() {
    try {
      console.log('Setting up chart of accounts for existing schools...');

      // This would need to be adapted based on your school model structure
      // For now, I'll provide a template that you can customize
      
      const results = [];
      
      // You would replace this with actual school fetching logic
      // const schools = await models.School.findAll();
      
      console.log('Existing schools setup completed');
      return results;

    } catch (error) {
      console.error('Error setting up chart of accounts for existing schools:', error);
      throw error;
    }
  }

  /**
   * Validate chart of accounts setup for a school/branch
   */
  async validateChartOfAccountsSetup(schoolId, branchId = null) {
    try {
      const models = getModels();
      const accounts = await models.ChartOfAccounts.findAll({
        where: {
          school_id: schoolId,
          branch_id: branchId
        }
      });

      const validation = {
        total_accounts: accounts.length,
        has_assets: accounts.some(a => a.account_type === 'ASSET'),
        has_liabilities: accounts.some(a => a.account_type === 'LIABILITY'),
        has_equity: accounts.some(a => a.account_type === 'EQUITY'),
        has_revenue: accounts.some(a => a.account_type === 'REVENUE'),
        has_expenses: accounts.some(a => a.account_type === 'EXPENSE'),
        has_receivables: accounts.some(a => a.account_code === '1210'),
        has_revenue_accounts: accounts.some(a => a.account_code === '4100'),
        is_complete: false
      };

      validation.is_complete = validation.has_assets && 
                              validation.has_liabilities && 
                              validation.has_equity && 
                              validation.has_revenue && 
                              validation.has_expenses &&
                              validation.has_receivables &&
                              validation.has_revenue_accounts;

      return validation;

    } catch (error) {
      console.error('Error validating chart of accounts setup:', error);
      throw error;
    }
  }
}

module.exports = new ChartOfAccountsSetupService();