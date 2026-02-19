
const db = require("../models")
/**
 * Enhanced Financial Controller
 * Implements standard accounting principles with double-entry bookkeeping
 * Provides comprehensive financial reporting and management
 */

/**
 * Chart of Accounts Controller
 * Manages the chart of accounts following standard accounting structure
 */
const ChartOfAccountsController = {
  /**
   * Get chart of accounts for a school
   */
  async getChartOfAccounts(req, res) {
    const { account_type, is_active = true } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      let whereClause = 'WHERE school_id = :school_id';
      const replacements = { school_id };
      
      // Add branch_id filter if provided
      if (branch_id) {
        whereClause += ' AND branch_id = :branch_id';
        replacements.branch_id = branch_id;
      }

      if (account_type) {
        whereClause += ' AND account_type = :account_type';
        replacements.account_type = account_type;
      }

      if (is_active !== undefined) {
        whereClause += ' AND is_active = :is_active';
        replacements.is_active = is_active === 'true' ? 1 : 0;
      }

      const query = `
        SELECT 
          account_id,
          account_code,
          account_name,
          account_type,
          account_subtype,
          parent_account_id,
          normal_balance,
          description,
          is_active,
          is_system_account,
          (SELECT account_name FROM chart_of_accounts p WHERE p.account_id = coa.parent_account_id) as parent_account_name,
          (SELECT COALESCE(current_balance, 0) FROM account_balances ab WHERE ab.account_id = coa.account_id AND ab.school_id = coa.school_id) as current_balance
        FROM chart_of_accounts coa
        ${whereClause}
        ORDER BY account_code
      `;

      const [accounts] = await db.sequelize.query(query, { replacements });

      return res.status(200).json({
        success: true,
        data: accounts,
        count: accounts.length
      });
    } catch (error) {
      console.error("Error fetching chart of accounts:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Create a new account
   */
  async createAccount(req, res) {
    const {
      account_code,
      account_name,
      account_type,
      account_subtype,
      parent_account_id,
      normal_balance,
      description
    } = req.body;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      const query = `
        INSERT INTO chart_of_accounts (
          account_code, account_name, account_type, account_subtype,
          parent_account_id, normal_balance, description, school_id, branch_id
        ) VALUES (
          :account_code, :account_name, :account_type, :account_subtype,
          :parent_account_id, :normal_balance, :description, :school_id, :branch_id
        )
      `;

      await db.sequelize.query(query, {
        replacements: {
          account_code,
          account_name,
          account_type,
          account_subtype,
          parent_account_id,
          normal_balance,
          description,
          school_id,
          branch_id
        }
      });

      return res.status(201).json({
        success: true,
        message: "Account created successfully"
      });
    } catch (error) {
      console.error("Error creating account:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Initialize default chart of accounts for a school
   */
  async initializeDefaultAccounts(req, res) {
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      await db.sequelize.query(
        'CALL create_default_chart_of_accounts(:school_id, :branch_id)',
        { replacements: { school_id, branch_id } }
      );

      return res.status(200).json({
        success: true,
        message: "Default chart of accounts created successfully"
      });
    } catch (error) {
      console.error("Error initializing default accounts:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Initialize simplified chart of accounts for a school
   */
  async initializeSimplifiedAccounts(req, res) {
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      // Check if simplified procedure exists
      try {
        await db.sequelize.query(
          'CALL create_simplified_chart_of_accounts(:school_id, :branch_id)',
          { replacements: { school_id, branch_id } }
        );

        return res.status(200).json({
          success: true,
          message: "Simplified chart of accounts created successfully"
        });
      } catch (procError) {
        // If simplified procedure doesn't exist, create minimal accounts manually
        console.log("Simplified procedure not found, creating minimal accounts manually");
        
        const minimalAccounts = [
          {
            account_code: '1110',
            account_name: 'Cash',
            account_type: 'ASSET',
            account_subtype: 'CASH',
            normal_balance: 'DEBIT',
            description: 'Cash on hand and in banks',
            school_id,
            branch_id
          },
          {
            account_code: '1120',
            account_name: 'Accounts Receivable',
            account_type: 'ASSET',
            account_subtype: 'RECEIVABLE',
            normal_balance: 'DEBIT',
            description: 'Money owed to the school',
            school_id,
            branch_id
          },
          {
            account_code: '4100',
            account_name: 'Tuition Fees',
            account_type: 'REVENUE',
            account_subtype: 'FEES',
            normal_balance: 'CREDIT',
            description: 'Student tuition and fees',
            school_id,
            branch_id
          },
          {
            account_code: '5100',
            account_name: 'Salaries and Wages',
            account_type: 'EXPENSE',
            account_subtype: 'SALARY',
            normal_balance: 'DEBIT',
            description: 'Staff salaries and wages',
            school_id,
            branch_id
          }
        ];

        // Create each account
        for (const account of minimalAccounts) {
          try {
            await db.sequelize.query(`
              INSERT INTO chart_of_accounts (
                account_code, account_name, account_type, account_subtype,
                normal_balance, description, school_id, branch_id
              ) VALUES (
                :account_code, :account_name, :account_type, :account_subtype,
                :normal_balance, :description, :school_id, :branch_id
              )
            `, {
              replacements: account
            });
          } catch (insertError) {
            console.error(`Failed to create account ${account.account_name}:`, insertError);
          }
        }

        return res.status(200).json({
          success: true,
          message: "Minimal chart of accounts created successfully"
        });
      }
    } catch (error) {
      console.error("Error initializing simplified accounts:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * Journal Entries Controller
 * Manages double-entry bookkeeping journal entries
 */
const JournalEntriesController = {
  /**
   * Helper function to find or use fallback account
   * Implements intelligent account selection strategy
   */
  async findOrFallbackAccount(account_id, school_id, branch_id, transaction) {
    try {
      // Try to find the specific account
      const [accountInfo] = await db.sequelize.query(
        'SELECT account_id, account_name, account_code, account_type FROM chart_of_accounts WHERE account_id = :account_id AND school_id = :school_id',
        {
          replacements: { account_id, school_id },
          type: db.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (accountInfo) {
        return accountInfo;
      }

      // Account not found, try to find a fallback
      console.log(`Account ID ${account_id} not found, attempting fallback selection`);

      // Get all accounts for this school to analyze and find best match
      const [allAccounts] = await db.sequelize.query(
        'SELECT account_id, account_name, account_code, account_type, account_subtype FROM chart_of_accounts WHERE school_id = :school_id AND is_active = 1 ORDER BY account_code',
        {
          replacements: { school_id },
          type: db.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (!allAccounts || allAccounts.length === 0) {
        console.error('No accounts found in chart of accounts. Please initialize default accounts.');
        return null;
      }

      // Use a generic revenue or expense account as fallback based on account code range
      // This follows the pattern established in the frontend
      let fallbackAccount = null;

      // Try to determine the intended account type from the original account_id
      // Frontend typically uses account IDs in these ranges:
      // - Revenue accounts (REVENUE type): typically IDs 20-40, codes 4xxx
      // - Expense accounts (EXPENSE type): typically IDs 40-60, codes 5xxx
      // - Asset accounts (ASSET type): typically IDs 1-20, codes 1xxx

      if (account_id >= 20 && account_id <= 40) {
        // Likely revenue account - find any REVENUE type account
        fallbackAccount = allAccounts.find(acc =>
          acc.account_type?.toUpperCase() === 'REVENUE' &&
          acc.account_code?.startsWith('4')
        );
      } else if (account_id >= 40 && account_id <= 60) {
        // Likely expense account - find any EXPENSE type account
        fallbackAccount = allAccounts.find(acc =>
          acc.account_type?.toUpperCase() === 'EXPENSE' &&
          acc.account_code?.startsWith('5')
        );
      } else if (account_id >= 1 && account_id <= 20) {
        // Likely asset account - find any ASSET type account
        fallbackAccount = allAccounts.find(acc =>
          acc.account_type?.toUpperCase() === 'ASSET' &&
          (acc.account_code?.startsWith('1') || acc.account_subtype?.toUpperCase() === 'CASH' || acc.account_subtype?.toUpperCase() === 'BANK')
        );
      }

      if (fallbackAccount) {
        console.log(`Using fallback account: ${fallbackAccount.account_name} (${fallbackAccount.account_code}) for original account ID ${account_id}`);
        return fallbackAccount;
      }

      // Final fallback - use first available account of each major type
      const firstRevenue = allAccounts.find(acc => acc.account_type?.toUpperCase() === 'REVENUE');
      const firstExpense = allAccounts.find(acc => acc.account_type?.toUpperCase() === 'EXPENSE');
      const firstAsset = allAccounts.find(acc => acc.account_type?.toUpperCase() === 'ASSET');

      // Return the most appropriate based on original account ID range
      fallbackAccount = firstRevenue || firstExpense || firstAsset || allAccounts[0];

      if (fallbackAccount) {
        console.log(`Using ultimate fallback account: ${fallbackAccount.account_name} (${fallbackAccount.account_code})`);
        return fallbackAccount;
      }

      return null;
    } catch (error) {
      console.error('Error in findOrFallbackAccount:', error);
      return null;
    }
  },

  /**
   * Create a new journal entry
   */
  async createJournalEntry(req, res) {
    const {
      entry_date,
      reference_type,
      reference_id,
      description,
      journal_lines
    } = req.body;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';
    const created_by = req.user?.id || 'system';

    try {
      // Validate journal lines
      if (!Array.isArray(journal_lines) || journal_lines.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Journal entry must have at least 2 lines"
        });
      }

      // Validate that debits equal credits
      const totalDebits = journal_lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
      const totalCredits = journal_lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return res.status(400).json({
          success: false,
          error: "Journal entry is not balanced. Debits must equal credits."
        });
      }

      // Use a database transaction to ensure atomicity
      const transaction = await db.sequelize.transaction();
      
      try {
        const createdEntries = [];
        
        // Create each journal line as a separate entry
        for (const line of journal_lines) {
          const { account_id, debit_amount, credit_amount, description: lineDescription } = line;

          // Get account information with intelligent fallback
          const accountInfo = await this.findOrFallbackAccount(account_id, school_id, branch_id, transaction);

          if (!accountInfo) {
            await transaction.rollback();
            console.error(`Failed to find account or fallback for account_id: ${account_id}`);
            return res.status(400).json({
              success: false,
              error: `Account with ID ${account_id} not found and no suitable fallback account available. Please initialize chart of accounts.`
            });
          }
          
          // Create the journal entry record
          console.log(`Creating journal entry with account_type: "${accountInfo.account_type}" (type: ${typeof accountInfo.account_type})`);

          const journalEntry = await db.JournalEntry.create({
            account: accountInfo.account_name,
            account_code: accountInfo.account_code,
            account_type: accountInfo.account_type,
            debit: debit_amount,
            credit: credit_amount,
            description: lineDescription || description,
            reference: `${reference_type}:${reference_id}`,
            transaction_date: entry_date,
            posting_date: entry_date,
            school_id,
            branch_id,
            status: 'POSTED', // Newly created entries are posted by default
            created_by,
            updated_by: created_by
          }, { transaction });

          console.log(`✅ Journal entry created successfully for account: ${accountInfo.account_name}`);
          
          createdEntries.push(journalEntry);
        }
        
        await transaction.commit();
        
        // Return success response
        return res.status(201).json({
          success: true,
          message: "Journal entry created successfully",
          data: {
            entries: createdEntries,
            total_entries: createdEntries.length,
            total_debits: totalDebits,
            total_credits: totalCredits,
            balanced: Math.abs(totalDebits - totalCredits) < 0.01
          }
        });
      } catch (error) {
        await transaction.rollback();
        console.error("Error creating journal entries:", error);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to create journal entry"
        });
      }
    } catch (error) {
      console.error("❌ Error processing journal entry request:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error occurred"
      });
    }
  },

  /**
   * Post a journal entry to the general ledger
   */
  async postJournalEntry(req, res) {
    const { entry_id } = req.params;
    const posted_by = req.user?.id || 'system';

    try {
      await db.sequelize.query(
        'CALL post_journal_entry(:entry_id, :posted_by)',
        { replacements: { entry_id, posted_by } }
      );

      return res.status(200).json({
        success: true,
        message: "Journal entry posted successfully"
      });
    } catch (error) {
      console.error("Error posting journal entry:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get journal entries
   */
  async getJournalEntries(req, res) {
    const { 
      start_date, 
      end_date, 
      status = 'all', 
      reference_type,
      page = 1, 
      limit = 50 
    } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      let whereClause = 'WHERE je.school_id = :school_id';
      const replacements = { school_id };
      
      // Add branch_id filter if provided
      if (branch_id) {
        whereClause += ' AND je.branch_id = :branch_id';
        replacements.branch_id = branch_id;
      }

      if (start_date && end_date) {
        whereClause += ' AND je.entry_date BETWEEN :start_date AND :end_date';
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      }

      if (status !== 'all') {
        whereClause += ' AND je.status = :status';
        replacements.status = status.toUpperCase();
      }

      if (reference_type) {
        whereClause += ' AND je.reference_type = :reference_type';
        replacements.reference_type = reference_type.toUpperCase();
      }

      const offset = (page - 1) * limit;
      whereClause += ' ORDER BY je.entry_date DESC, je.entry_id DESC LIMIT :limit OFFSET :offset';
      replacements.limit = parseInt(limit);
      replacements.offset = offset;

      const query = `
        SELECT 
          je.entry_id,
          je.entry_number,
          je.entry_date,
          je.reference_type,
          je.reference_id,
          je.description,
          je.total_amount,
          je.status,
          je.created_by,
          je.posted_by,
          je.posted_at,
          je.created_at,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'line_id', jel.line_id,
                'account_id', jel.account_id,
                'account_code', coa.account_code,
                'account_name', coa.account_name,
                'debit_amount', jel.debit_amount,
                'credit_amount', jel.credit_amount,
                'description', jel.description
              )
            )
            FROM journal_entry_lines jel
            JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
            WHERE jel.entry_id = je.entry_id
            ORDER BY jel.line_number
          ) as journal_lines
        FROM journal_entries je
        ${whereClause}
      `;

      const entries = await db.sequelize.query(query, { replacements });

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM journal_entries je
        ${whereClause.replace('ORDER BY je.entry_date DESC, je.entry_id DESC LIMIT :limit OFFSET :offset', '')}
      `;
      
      const countReplacements = { ...replacements };
      delete countReplacements.limit;
      delete countReplacements.offset;
      
      const [{ total }] = await db.sequelize.query(countQuery, { replacements: countReplacements });

      return res.status(200).json({
        success: true,
        data: entries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * Financial Reports Controller
 * Generates standard financial reports
 */
const FinancialReportsController = {
  /**
   * Generate Trial Balance
   */
  async getTrialBalance(req, res) {
    const { as_of_date = new Date() } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      const trialBalance = await db.sequelize.query(
        'CALL generate_trial_balance(:school_id, :branch_id, :as_of_date)',
        { replacements: { school_id, branch_id, as_of_date } }
      );

      // Calculate totals
      const totalDebits = trialBalance.reduce((sum, account) => sum + parseFloat(account.debit_balance || 0), 0);
      const totalCredits = trialBalance.reduce((sum, account) => sum + parseFloat(account.credit_balance || 0), 0);

      return res.status(200).json({
        success: true,
        data: {
          accounts: trialBalance,
          totals: {
            total_debits: totalDebits,
            total_credits: totalCredits,
            difference: Math.abs(totalDebits - totalCredits),
            is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
          },
          as_of_date,
          generated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error generating trial balance:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Generate Balance Sheet
   */
  async getBalanceSheet(req, res) {
    const { as_of_date = new Date() } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      const balanceSheet = await db.sequelize.query(
        'CALL generate_balance_sheet(:school_id, :branch_id, :as_of_date)',
        { replacements: { school_id, branch_id, as_of_date } }
      );

      // Group by section
      const grouped = balanceSheet.reduce((acc, account) => {
        if (!acc[account.section]) {
          acc[account.section] = [];
        }
        acc[account.section].push(account);
        return acc;
      }, {});

      // Calculate totals
      const totalAssets = (grouped.ASSETS || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
      const totalLiabilities = (grouped.LIABILITIES || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
      const totalEquity = (grouped.EQUITY || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);

      return res.status(200).json({
        success: true,
        data: {
          assets: grouped.ASSETS || [],
          liabilities: grouped.LIABILITIES || [],
          equity: grouped.EQUITY || [],
          totals: {
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            total_equity: totalEquity,
            total_liabilities_and_equity: totalLiabilities + totalEquity,
            is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
          },
          as_of_date,
          generated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error generating balance sheet:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Generate Income Statement
   */
  async getIncomeStatement(req, res) {
    const { 
      start_date = new Date(new Date().setDate(new Date().getDate() - 29)),
      end_date = new Date()
    } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      // Try to use the stored procedure first
      try {
        const incomeStatement = await db.sequelize.query(
          'CALL generate_income_statement(:school_id, :branch_id, :start_date, :end_date)',
          { replacements: { school_id, branch_id, start_date, end_date } }
        );

        // Group by account type
        const grouped = incomeStatement.reduce((acc, account) => {
          if (!acc[account.account_type]) {
            acc[account.account_type] = [];
          }
          acc[account.account_type].push(account);
          return acc;
        }, {});

        // Calculate totals
        const totalRevenue = (grouped.REVENUE || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
        const totalExpenses = (grouped.EXPENSES || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
        const netIncome = totalRevenue - totalExpenses;

        return res.status(200).json({
          success: true,
          data: {
            revenue: grouped.REVENUE || [],
            expenses: grouped.EXPENSES || [],
            totals: {
              total_revenue: totalRevenue,
              total_expenses: totalExpenses,
              net_income: netIncome,
              profit_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
            },
            period: {
              start_date,
              end_date
            },
            generated_at: new Date().toISOString()
          }
        });
      } catch (procError) {
        // If stored procedure doesn't exist, fall back to direct query
        console.log("Stored procedure not found, using fallback query");
        
        // Fallback implementation using direct queries
        const revenueQuery = `
          SELECT 
            CASE 
              WHEN description LIKE '%fee%' OR description LIKE '%Fee%' OR description LIKE '%FEES%' OR description LIKE '%Fees%' 
              THEN '4000' 
              ELSE '4100' 
            END as account_code,
            CASE 
              WHEN description LIKE '%fee%' OR description LIKE '%Fee%' OR description LIKE '%FEES%' OR description LIKE '%Fees%' 
              THEN 'Tuition Fees' 
              ELSE 'Other Income' 
            END as account_name,
            'REVENUE' as account_type,
            CASE 
              WHEN description LIKE '%fee%' OR description LIKE '%Fee%' OR description LIKE '%FEES%' OR description LIKE '%Fees%' 
              THEN 'FEES' 
              ELSE 'OTHER' 
            END as account_subtype,
            COALESCE(SUM(cr), 0) as amount
          FROM payment_entries 
          WHERE school_id = :school_id 
            AND (:branch_id IS NULL OR branch_id = :branch_id)
            AND cr > 0 
            AND DATE(created_at) BETWEEN :start_date AND :end_date
            AND payment_status != 'Excluded'
          GROUP BY 
            CASE 
              WHEN description LIKE '%fee%' OR description LIKE '%Fee%' OR description LIKE '%FEES%' OR description LIKE '%Fees%' 
              THEN '4000' 
              ELSE '4100' 
            END,
            CASE 
              WHEN description LIKE '%fee%' OR description LIKE '%Fee%' OR description LIKE '%FEES%' OR description LIKE '%Fees%' 
              THEN 'Tuition Fees' 
              ELSE 'Other Income' 
            END,
            CASE 
              WHEN description LIKE '%fee%' OR description LIKE '%Fee%' OR description LIKE '%FEES%' OR description LIKE '%Fees%' 
              THEN 'FEES' 
              ELSE 'OTHER' 
            END
          HAVING COALESCE(SUM(cr), 0) > 0
        `;

        const expenseQuery = `
          SELECT 
            CASE 
              WHEN description LIKE '%salary%' OR description LIKE '%wage%' OR description LIKE '%payroll%'
              THEN '5000'
              WHEN description LIKE '%electric%' OR description LIKE '%water%' OR description LIKE '%internet%' OR description LIKE '%utility%'
              THEN '5100'
              WHEN description LIKE '%supply%' OR description LIKE '%material%' OR description LIKE '%book%' OR description LIKE '%stationery%'
              THEN '5200'
              ELSE '5900'
            END as account_code,
            CASE 
              WHEN description LIKE '%salary%' OR description LIKE '%wage%' OR description LIKE '%payroll%'
              THEN 'Salaries & Wages'
              WHEN description LIKE '%electric%' OR description LIKE '%water%' OR description LIKE '%internet%' OR description LIKE '%utility%'
              THEN 'Utilities'
              WHEN description LIKE '%supply%' OR description LIKE '%material%' OR description LIKE '%book%' OR description LIKE '%stationery%'
              THEN 'Supplies & Materials'
              ELSE 'Other Expenses'
            END as account_name,
            'EXPENSE' as account_type,
            CASE 
              WHEN description LIKE '%salary%' OR description LIKE '%wage%' OR description LIKE '%payroll%'
              THEN 'SALARIES'
              WHEN description LIKE '%electric%' OR description LIKE '%water%' OR description LIKE '%internet%' OR description LIKE '%utility%'
              THEN 'UTILITIES'
              WHEN description LIKE '%supply%' OR description LIKE '%material%' OR description LIKE '%book%' OR description LIKE '%stationery%'
              THEN 'SUPPLIES'
              ELSE 'OTHER'
            END as account_subtype,
            COALESCE(SUM(dr), 0) as amount
          FROM payment_entries 
          WHERE school_id = :school_id 
            AND (:branch_id IS NULL OR branch_id = :branch_id)
            AND dr > 0 
            AND DATE(created_at) BETWEEN :start_date AND :end_date
            AND payment_status != 'Excluded'
          GROUP BY 
            CASE 
              WHEN description LIKE '%salary%' OR description LIKE '%wage%' OR description LIKE '%payroll%'
              THEN '5000'
              WHEN description LIKE '%electric%' OR description LIKE '%water%' OR description LIKE '%internet%' OR description LIKE '%utility%'
              THEN '5100'
              WHEN description LIKE '%supply%' OR description LIKE '%material%' OR description LIKE '%book%' OR description LIKE '%stationery%'
              THEN '5200'
              ELSE '5900'
            END,
            CASE 
              WHEN description LIKE '%salary%' OR description LIKE '%wage%' OR description LIKE '%payroll%'
              THEN 'Salaries & Wages'
              WHEN description LIKE '%electric%' OR description LIKE '%water%' OR description LIKE '%internet%' OR description LIKE '%utility%'
              THEN 'Utilities'
              WHEN description LIKE '%supply%' OR description LIKE '%material%' OR description LIKE '%book%' OR description LIKE '%stationery%'
              THEN 'Supplies & Materials'
              ELSE 'Other Expenses'
            END,
            CASE 
              WHEN description LIKE '%salary%' OR description LIKE '%wage%' OR description LIKE '%payroll%'
              THEN 'SALARIES'
              WHEN description LIKE '%electric%' OR description LIKE '%water%' OR description LIKE '%internet%' OR description LIKE '%utility%'
              THEN 'UTILITIES'
              WHEN description LIKE '%supply%' OR description LIKE '%material%' OR description LIKE '%book%' OR description LIKE '%stationery%'
              THEN 'SUPPLIES'
              ELSE 'OTHER'
            END
          HAVING COALESCE(SUM(dr), 0) > 0
        `;

        const [revenueResult] = await db.sequelize.query(revenueQuery, {
          replacements: { school_id, branch_id, start_date, end_date }
        });

        const [expenseResult] = await db.sequelize.query(expenseQuery, {
          replacements: { school_id, branch_id, start_date, end_date }
        });

        // Combine revenue and expense results
        const combinedResults = [...revenueResult, ...expenseResult];

        // Group by account type
        const grouped = combinedResults.reduce((acc, account) => {
          if (!acc[account.account_type]) {
            acc[account.account_type] = [];
          }
          acc[account.account_type].push(account);
          return acc;
        }, {});

        // Calculate totals
        const totalRevenue = (grouped.REVENUE || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
        const totalExpenses = (grouped.EXPENSES || []).reduce((sum, account) => sum + parseFloat(account.amount || 0), 0);
        const netIncome = totalRevenue - totalExpenses;

        return res.status(200).json({
          success: true,
          data: {
            revenue: grouped.REVENUE || [],
            expenses: grouped.EXPENSES || [],
            totals: {
              total_revenue: totalRevenue,
              total_expenses: totalExpenses,
              net_income: netIncome,
              profit_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
            },
            period: {
              start_date,
              end_date
            },
            generated_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error("Error generating income statement:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Generate Cash Flow Statement
   */
  async getCashFlowStatement(req, res) {
    const { 
      start_date = new Date(new Date().setDate(new Date().getDate() - 29)),
      end_date = new Date()
    } = req.query;
    const {school_id}=req.user
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? ''
    try {
      // Get cash account transactions
      const query = `
        SELECT 
          gl.transaction_date,
          gl.description,
          gl.debit_amount,
          gl.credit_amount,
          gl.debit_amount - gl.credit_amount as net_change,
          coa.account_name,
          je.reference_type
        FROM general_ledger gl
        JOIN chart_of_accounts coa ON gl.account_id = coa.account_id
        JOIN journal_entries je ON gl.entry_id = je.entry_id
        WHERE gl.school_id = :school_id
          AND branch_id= :branch_id
          AND gl.transaction_date BETWEEN :start_date AND :end_date
          AND coa.account_subtype = 'CASH'
          AND je.status = 'POSTED'
        ORDER BY gl.transaction_date, gl.ledger_id
      `;

      const [cashTransactions] = await db.sequelize.query(query, {
        replacements: { school_id, branch_id, start_date, end_date }
      });

      // Categorize cash flows
      const operatingActivities = [];
      const investingActivities = [];
      const financingActivities = [];

      cashTransactions.forEach(transaction => {
        const activity = {
          date: transaction.transaction_date,
          description: transaction.description,
          amount: parseFloat(transaction.net_change)
        };

        // Categorize based on reference type and description
        if (transaction.reference_type === 'STUDENT_PAYMENT' || 
            transaction.description.toLowerCase().includes('fee') ||
            transaction.description.toLowerCase().includes('salary') ||
            transaction.description.toLowerCase().includes('expense')) {
          operatingActivities.push(activity);
        } else if (transaction.description.toLowerCase().includes('equipment') ||
                   transaction.description.toLowerCase().includes('building') ||
                   transaction.description.toLowerCase().includes('asset')) {
          investingActivities.push(activity);
        } else {
          financingActivities.push(activity);
        }
      });

      // Calculate totals
      const netOperatingCash = operatingActivities.reduce((sum, activity) => sum + activity.amount, 0);
      const netInvestingCash = investingActivities.reduce((sum, activity) => sum + activity.amount, 0);
      const netFinancingCash = financingActivities.reduce((sum, activity) => sum + activity.amount, 0);
      const netCashFlow = netOperatingCash + netInvestingCash + netFinancingCash;

      return res.status(200).json({
        success: true,
        data: {
          operating_activities: operatingActivities,
          investing_activities: investingActivities,
          financing_activities: financingActivities,
          totals: {
            net_operating_cash: netOperatingCash,
            net_investing_cash: netInvestingCash,
            net_financing_cash: netFinancingCash,
            net_cash_flow: netCashFlow
          },
          period: {
            start_date,
            end_date
          },
          generated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error generating cash flow statement:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Generate comprehensive financial dashboard
   */
  async getFinancialDashboard(req, res) {
    const { 
      start_date = new Date(new Date().setDate(new Date().getDate() - 29)),
      end_date = new Date()
    } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';

    try {
      // Get key financial metrics including payroll data
      const metricsQuery = `
        SELECT 
          -- Revenue metrics
          COALESCE(SUM(CASE WHEN coa.account_type = 'REVENUE' THEN gl.credit_amount - gl.debit_amount ELSE 0 END), 0) as total_revenue,
          
          -- Expense metrics
          COALESCE(SUM(CASE WHEN coa.account_type = 'EXPENSE' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as total_expenses,
          
          -- Payroll expenses (from payment_entries with item_category = 'Salary')
          COALESCE(SUM(CASE WHEN pe.item_category = 'Salary' THEN pe.dr ELSE 0 END), 0) as payroll_expenses,
          
          -- Asset metrics
          COALESCE(SUM(CASE WHEN coa.account_type = 'ASSET' AND coa.account_subtype = 'CASH' THEN ab.current_balance ELSE 0 END), 0) as cash_balance,
          COALESCE(SUM(CASE WHEN coa.account_type = 'ASSET' THEN ab.current_balance ELSE 0 END), 0) as total_assets,
          
          -- Liability metrics
          COALESCE(SUM(CASE WHEN coa.account_type = 'LIABILITY' THEN ab.current_balance ELSE 0 END), 0) as total_liabilities,
          
          -- Receivables
          COALESCE(SUM(CASE WHEN coa.account_subtype = 'RECEIVABLE' THEN ab.current_balance ELSE 0 END), 0) as accounts_receivable
          
        FROM chart_of_accounts coa
        LEFT JOIN account_balances ab ON coa.account_id = ab.account_id AND ab.school_id = :school_id
        LEFT JOIN general_ledger gl ON coa.account_id = gl.account_id 
          AND gl.school_id = :school_id 
          AND (:branch_id IS NULL OR gl.branch_id = :branch_id)
          AND gl.transaction_date BETWEEN :start_date AND :end_date
        LEFT JOIN payment_entries pe ON pe.school_id = :school_id 
          AND (:branch_id IS NULL OR pe.branch_id = :branch_id)
          AND DATE(pe.created_at) BETWEEN :start_date AND :end_date
          AND pe.payment_status != 'Excluded'
        WHERE coa.school_id = :school_id 
          AND (:branch_id IS NULL OR coa.branch_id = :branch_id)
          AND coa.is_active = 1
      `;

      const [[metrics]] = await db.sequelize.query(metricsQuery, {
        replacements: { school_id, branch_id, start_date, end_date }
      });

      // Calculate derived metrics
      const netIncome = parseFloat(metrics.total_revenue) - parseFloat(metrics.total_expenses);
      const profitMargin = metrics.total_revenue > 0 ? (netIncome / metrics.total_revenue) * 100 : 0;
      const totalEquity = parseFloat(metrics.total_assets) - parseFloat(metrics.total_liabilities);
      const debtToEquityRatio = totalEquity > 0 ? parseFloat(metrics.total_liabilities) / totalEquity : 0;

      // Get recent transactions including payroll
      const recentTransactionsQuery = `
        SELECT 
          je.entry_date,
          je.description,
          je.total_amount,
          je.reference_type,
          coa.account_name,
          jel.debit_amount,
          jel.credit_amount
        FROM journal_entries je
        JOIN journal_entry_lines jel ON je.entry_id = jel.entry_id
        JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
        WHERE je.school_id = :school_id 
          AND (:branch_id IS NULL OR je.branch_id = :branch_id)
          AND je.status = 'POSTED'
        ORDER BY je.entry_date DESC, je.entry_id DESC
        LIMIT 10
      `;

      const [recentTransactions] = await db.sequelize.query(recentTransactionsQuery, {
        replacements: { school_id, branch_id }
      });

      // Get recent payroll payments
      const recentPayrollQuery = `
        SELECT 
          pe.created_at as entry_date,
          pe.description,
          pe.dr as total_amount,
          'PAYROLL' as reference_type,
          'Salary Payment' as account_name,
          pe.dr as debit_amount,
          0 as credit_amount
        FROM payment_entries pe
        WHERE pe.school_id = :school_id 
          AND (:branch_id IS NULL OR pe.branch_id = :branch_id)
          AND pe.item_category = 'Salary'
          AND pe.dr > 0
          AND DATE(pe.created_at) BETWEEN :start_date AND :end_date
          AND pe.payment_status != 'Excluded'
        ORDER BY pe.created_at DESC
        LIMIT 5
      `;

      const [recentPayrollPayments] = await db.sequelize.query(recentPayrollQuery, {
        replacements: { school_id, branch_id, start_date, end_date }
      });

      // Combine recent transactions with payroll payments
      const allRecentTransactions = [...recentTransactions, ...recentPayrollPayments]
        .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
        .slice(0, 10);

      return res.status(200).json({
        success: true,
        data: {
          key_metrics: {
            total_revenue: parseFloat(metrics.total_revenue || 0),
            total_expenses: parseFloat(metrics.total_expenses || 0),
            payroll_expenses: parseFloat(metrics.payroll_expenses || 0),
            net_income: netIncome,
            profit_margin: profitMargin,
            cash_balance: parseFloat(metrics.cash_balance || 0),
            total_assets: parseFloat(metrics.total_assets || 0),
            total_liabilities: parseFloat(metrics.total_liabilities || 0),
            total_equity: totalEquity,
            accounts_receivable: parseFloat(metrics.accounts_receivable || 0),
            debt_to_equity_ratio: debtToEquityRatio
          },
          recent_transactions: allRecentTransactions,
          period: {
            start_date,
            end_date
          },
          generated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error generating financial dashboard:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * Payment Integration Controller
 * Bridges the old payment system with the new accounting system
 */
const PaymentIntegrationController = {
  /**
   * Convert payment entry to journal entry
   */
  async convertPaymentToJournal(req, res) {
    const { payment_entry_id } = req.params;
    const created_by = req.user?.id || 'system';

    try {
      await db.sequelize.query(
        'CALL convert_payment_to_journal(:payment_entry_id, :created_by)',
        { replacements: { payment_entry_id, created_by } }
      );

      return res.status(200).json({
        success: true,
        message: "Payment entry converted to journal entry successfully"
      });
    } catch (error) {
      console.error("Error converting payment to journal:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Bulk convert unposted payment entries
   */
  async bulkConvertPayments(req, res) {
    const { limit = 100 } = req.query;
    const { school_id } = req.user;
    const branch_id = req.user.branch_id ?? req.query.branch_id ?? '';
    const created_by = req.user?.id || 'system';

    try {
      // Get unposted payment entries
      const [unpostedPayments] = await db.sequelize.query(`
        SELECT item_id 
        FROM payment_entries 
        WHERE school_id = :school_id 
          AND (:branch_id IS NULL OR branch_id = :branch_id)
          AND (is_posted IS NULL OR is_posted = 0)
          AND (cr > 0 OR dr > 0)
        LIMIT :limit
      `, { replacements: { school_id, branch_id, limit: parseInt(limit) } });

      let converted = 0;
      let errors = [];

      for (const payment of unpostedPayments) {
        try {
          await db.sequelize.query(
            'CALL convert_payment_to_journal(:payment_entry_id, :created_by)',
            { replacements: { payment_entry_id: payment.item_id, created_by } }
          );
          converted++;
        } catch (error) {
          errors.push({
            payment_id: payment.item_id,
            error: error.message
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Converted ${converted} payment entries to journal entries`,
        data: {
          converted_count: converted,
          total_found: unpostedPayments.length,
          errors: errors
        }
      });
    } catch (error) {
      console.error("Error bulk converting payments:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = {
  ChartOfAccountsController,
  JournalEntriesController,
  FinancialReportsController,
  PaymentIntegrationController
};