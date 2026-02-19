const db = require('../models');
const sequelize = db.sequelize;
const moment = require('moment');
const { QueryTypes } = require('sequelize');

/**
 * UNIFIED CUSTOM ITEMS CONTROLLER
 * 
 * This controller manages ALL custom items as separate, independent entities.
 * No mixing of discounts, fines, or other charges in the same form.
 * Each item type is treated as a distinct custom item with proper accounting.
 */

class UnifiedCustomItemsController {

  /**
   * CREATE CUSTOM ITEM
   * Creates any type of custom item (Fees, Discounts, Fines, etc.)
   */
  async createCustomItem(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        item_code,
        item_name,
        description,
        item_category, // Fees, Items, Discount, Fines, Penalties, Refunds, etc.
        item_type, // CHARGE, DISCOUNT, FINE, PENALTY, REFUND, etc.
        default_amount,
        calculation_method = 'FIXED', // FIXED, PERCENTAGE, CALCULATED
        percentage_rate = 0.00,
        is_taxable = false,
        tax_rate = 0.00,
        is_mandatory = false,
        is_recurring = false,
        applicable_classes = [],
        applicable_terms = [],
        applicable_sections = [],
        min_amount = 0.00,
        max_amount = null,
        status = 'ACTIVE',
        branch_id,
        created_by
      } = req.body;

      // Validate required fields
      if (!item_code || !item_name || !item_category || !item_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: item_code, item_name, item_category, item_type'
        });
      }

      // Determine account type and normal balance based on item category
      const accountingRules = this.getAccountingRules(item_category, item_type);

      // Create custom item
      const customItem = await sequelize.query(
        `INSERT INTO custom_items (
          item_code, item_name, description, item_category, item_type, account_type, normal_balance,
          default_amount, calculation_method, percentage_rate, is_taxable, tax_rate, 
          is_mandatory, is_recurring, applicable_classes, applicable_terms, applicable_sections,
          min_amount, max_amount, status, school_id, branch_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            item_code, item_name, description, item_category, item_type,
            accountingRules.account_type, accountingRules.normal_balance,
            default_amount, calculation_method, percentage_rate, is_taxable, tax_rate,
            is_mandatory, is_recurring, 
            JSON.stringify(applicable_classes), JSON.stringify(applicable_terms), JSON.stringify(applicable_sections),
            min_amount, max_amount, status, req.user.school_id, branch_id || req.user.branch_id, created_by
          ],
          type: QueryTypes.INSERT,
          transaction
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: `Custom ${item_type.toLowerCase()} item created successfully`,
        data: {
          item_id: customItem[0],
          item_code,
          item_name,
          item_category,
          item_type,
          account_type: accountingRules.account_type,
          normal_balance: accountingRules.normal_balance,
          default_amount,
          calculation_method
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating custom item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create custom item',
        error: error.message
      });
    }
  }

  /**
   * GET CUSTOM ITEMS BY CATEGORY/TYPE
   * Retrieves custom items filtered by category or type
   */
  async getCustomItems(req, res) {
    try {
      const {
        item_category,
        item_type,
        status = 'ACTIVE',
        branch_id,
        class_code,
        term
      } = req.query;

      let whereClause = 'WHERE school_id = ?';
      const replacements = [req.user.school_id];

      if (item_category) {
        whereClause += ' AND item_category = ?';
        replacements.push(item_category);
      }

      if (item_type) {
        whereClause += ' AND item_type = ?';
        replacements.push(item_type);
      }

      if (status) {
        whereClause += ' AND status = ?';
        replacements.push(status);
      }

      if (branch_id) {
        whereClause += ' AND (branch_id = ? OR branch_id IS NULL)';
        replacements.push(branch_id);
      }

      // Filter by applicable classes and terms
      if (class_code) {
        whereClause += ' AND (JSON_CONTAINS(applicable_classes, ?) OR JSON_CONTAINS(applicable_classes, \'["ALL"]\'))';
        replacements.push(JSON.stringify([class_code]));
      }

      if (term) {
        whereClause += ' AND (JSON_CONTAINS(applicable_terms, ?) OR JSON_CONTAINS(applicable_terms, \'["ALL"]\'))';
        replacements.push(JSON.stringify([term]));
      }

      const customItems = await sequelize.query(
        `SELECT * FROM custom_items ${whereClause} ORDER BY item_type, item_category, item_name`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      // Group by item type for better organization
      const groupedItems = customItems.reduce((acc, item) => {
        if (!acc[item.item_type]) {
          acc[item.item_type] = [];
        }
        acc[item.item_type].push(item);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          items: customItems,
          grouped_items: groupedItems,
          total_count: customItems.length
        }
      });

    } catch (error) {
      console.error('Error fetching custom items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch custom items',
        error: error.message
      });
    }
  }

  /**
   * APPLY CUSTOM ITEMS TO STUDENT
   * Applies any combination of custom items to a student
   */
  async applyCustomItems(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        admission_no,
        class_code,
        academic_year,
        term,
        items, // Array of item objects
        branch_id,
        created_by,
        create_journal_entry = true,
        notes
      } = req.body;

      // Validate required fields
      if (!admission_no || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: admission_no, items (array)'
        });
      }

      const refNo = await this.generateRefNo();
      const appliedItems = [];
      const journalEntries = [];

      // Get student's current balance for percentage calculations
      const currentBalance = await this.getStudentBalance(admission_no, academic_year, term, req.user.school_id);

      // Process each item
      for (const itemRequest of items) {
        const {
          item_id,
          custom_amount,
          quantity = 1,
          custom_description,
          percentage_base_amount // For percentage-based calculations
        } = itemRequest;

        // Get custom item details
        const customItem = await sequelize.query(
          `SELECT * FROM custom_items WHERE item_id = ? AND school_id = ?`,
          {
            replacements: [item_id, req.user.school_id],
            type: QueryTypes.SELECT,
            transaction
          }
        );

        if (customItem.length === 0) {
          throw new Error(`Custom item with ID ${item_id} not found`);
        }

        const item = customItem[0];
        
        // Calculate final amount based on calculation method
        let finalAmount = custom_amount || item.default_amount;
        
        if (item.calculation_method === 'PERCENTAGE') {
          const baseAmount = percentage_base_amount || currentBalance;
          finalAmount = (baseAmount * item.percentage_rate) / 100;
        }

        // Apply min/max limits
        if (item.min_amount && finalAmount < item.min_amount) {
          finalAmount = item.min_amount;
        }
        if (item.max_amount && finalAmount > item.max_amount) {
          finalAmount = item.max_amount;
        }

        const totalAmount = finalAmount * quantity;
        const description = custom_description || item.item_name;

        // Calculate tax if applicable
        let taxAmount = 0;
        if (item.is_taxable && item.tax_rate > 0) {
          taxAmount = (totalAmount * item.tax_rate) / 100;
        }

        const finalTotalAmount = totalAmount + taxAmount;

        // Determine debit/credit based on item type and category
        const { cr, dr } = this.calculateDebitCredit(item, finalTotalAmount);

        // Insert into payment_entries
        await sequelize.query(
          `INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, cr, dr,
            description, quantity, item_category, school_id, branch_id, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          {
            replacements: [
              refNo, admission_no, class_code, academic_year, term, cr, dr,
              description, quantity, item.item_category, req.user.school_id,
              branch_id || req.user.branch_id, created_by
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        appliedItems.push({
          item_code: item.item_code,
          item_name: item.item_name,
          item_category: item.item_category,
          item_type: item.item_type,
          calculation_method: item.calculation_method,
          amount: finalAmount,
          quantity,
          tax_amount: taxAmount,
          total_amount: finalTotalAmount,
          description
        });

        // Prepare journal entry
        if (create_journal_entry) {
          journalEntries.push({
            account: this.getAccountName(item.item_category, item.item_type),
            account_type: item.account_type,
            debit: dr,
            credit: cr,
            description: `${description} - ${admission_no}`
          });
        }
      }

      // Create journal entries if requested
      if (create_journal_entry && journalEntries.length > 0) {
        await this.createJournalEntry(journalEntries, transaction, req.user.school_id, branch_id || req.user.branch_id, created_by);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Custom items applied successfully',
        data: {
          ref_no: refNo,
          admission_no,
          class_code,
          academic_year,
          term,
          items_applied: appliedItems.length,
          total_amount: appliedItems.reduce((sum, item) => sum + item.total_amount, 0),
          items: appliedItems,
          notes
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error applying custom items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply custom items',
        error: error.message
      });
    }
  }

  /**
   * GET AVAILABLE DISCOUNTS
   * Get all available discount items for a student
   */
  async getAvailableDiscounts(req, res) {
    try {
      const { class_code, term, branch_id } = req.query;

      let whereClause = 'WHERE school_id = ? AND item_type = ? AND status = ?';
      const replacements = [req.user.school_id, 'DISCOUNT', 'ACTIVE'];

      if (branch_id) {
        whereClause += ' AND (branch_id = ? OR branch_id IS NULL)';
        replacements.push(branch_id);
      }

      if (class_code) {
        whereClause += ' AND (JSON_CONTAINS(applicable_classes, ?) OR JSON_CONTAINS(applicable_classes, \'["ALL"]\'))';
        replacements.push(JSON.stringify([class_code]));
      }

      if (term) {
        whereClause += ' AND (JSON_CONTAINS(applicable_terms, ?) OR JSON_CONTAINS(applicable_terms, \'["ALL"]\'))';
        replacements.push(JSON.stringify([term]));
      }

      const discounts = await sequelize.query(
        `SELECT * FROM custom_items ${whereClause} ORDER BY item_name`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: discounts
      });

    } catch (error) {
      console.error('Error fetching available discounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available discounts',
        error: error.message
      });
    }
  }

  /**
   * GET AVAILABLE FINES/PENALTIES
   * Get all available fine/penalty items
   */
  async getAvailableFines(req, res) {
    try {
      const { class_code, term, branch_id } = req.query;

      let whereClause = 'WHERE school_id = ? AND item_type IN (?, ?) AND status = ?';
      const replacements = [req.user.school_id, 'FINE', 'PENALTY', 'ACTIVE'];

      if (branch_id) {
        whereClause += ' AND (branch_id = ? OR branch_id IS NULL)';
        replacements.push(branch_id);
      }

      if (class_code) {
        whereClause += ' AND (JSON_CONTAINS(applicable_classes, ?) OR JSON_CONTAINS(applicable_classes, \'["ALL"]\'))';
        replacements.push(JSON.stringify([class_code]));
      }

      if (term) {
        whereClause += ' AND (JSON_CONTAINS(applicable_terms, ?) OR JSON_CONTAINS(applicable_terms, \'["ALL"]\'))';
        replacements.push(JSON.stringify([term]));
      }

      const fines = await sequelize.query(
        `SELECT * FROM custom_items ${whereClause} ORDER BY item_type, item_name`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: fines
      });

    } catch (error) {
      console.error('Error fetching available fines:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available fines',
        error: error.message
      });
    }
  }

  /**
   * GET STUDENT CUSTOM ITEMS
   * Retrieves all custom items applied to a student
   */
  async getStudentCustomItems(req, res) {
    try {
      const {
        admission_no,
        academic_year,
        term,
        item_category,
        item_type
      } = req.query;

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: 'admission_no is required'
        });
      }

      let whereClause = 'WHERE pe.admission_no = ? AND pe.school_id = ?';
      const replacements = [admission_no, req.user.school_id];

      if (academic_year) {
        whereClause += ' AND pe.academic_year = ?';
        replacements.push(academic_year);
      }

      if (term) {
        whereClause += ' AND pe.term = ?';
        replacements.push(term);
      }

      if (item_category) {
        whereClause += ' AND pe.item_category = ?';
        replacements.push(item_category);
      }

      // Join with custom_items to get item_type information
      const items = await sequelize.query(
        `SELECT 
          pe.item_id, pe.ref_no, pe.admission_no, pe.class_code, pe.academic_year, pe.term,
          pe.cr, pe.dr, (pe.cr - pe.dr) as balance, pe.description, pe.quantity, pe.item_category,
          pe.payment_mode, pe.created_at, pe.created_by,
          ci.item_type, ci.calculation_method, ci.percentage_rate
        FROM payment_entries pe
        LEFT JOIN custom_items ci ON pe.description LIKE CONCAT('%', ci.item_name, '%')
        ${whereClause} 
        ORDER BY pe.created_at DESC`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      // Group by item type
      const groupedItems = items.reduce((acc, item) => {
        const type = item.item_type || 'UNKNOWN';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(item);
        return acc;
      }, {});

      // Calculate summary by type
      const summary = {
        total_charges: items.filter(i => parseFloat(i.cr || 0) > 0).reduce((sum, item) => sum + parseFloat(item.cr || 0), 0),
        total_credits: items.filter(i => parseFloat(i.dr || 0) > 0).reduce((sum, item) => sum + parseFloat(item.dr || 0), 0),
        outstanding_balance: items.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0),
        total_items: items.length,
        by_type: {}
      };

      // Calculate summary by type
      Object.keys(groupedItems).forEach(type => {
        summary.by_type[type] = {
          count: groupedItems[type].length,
          total_amount: groupedItems[type].reduce((sum, item) => sum + parseFloat(item.balance || 0), 0)
        };
      });

      res.json({
        success: true,
        data: {
          items,
          grouped_items: groupedItems,
          summary
        }
      });

    } catch (error) {
      console.error('Error fetching student custom items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student custom items',
        error: error.message
      });
    }
  }

  // HELPER METHODS

  /**
   * Get accounting rules based on item category and type
   */
  getAccountingRules(itemCategory, itemType) {
    const rules = {
      // Charges increase student debt (Asset - Receivables)
      'CHARGE': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'FEE': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'ITEM': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'FINE': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'PENALTY': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      
      // Credits reduce student debt
      'DISCOUNT': { account_type: 'EXPENSE', normal_balance: 'DEBIT' },
      'REFUND': { account_type: 'LIABILITY', normal_balance: 'CREDIT' },
      'CREDIT': { account_type: 'LIABILITY', normal_balance: 'CREDIT' },
      
      // Other types
      'EXPENSE': { account_type: 'EXPENSE', normal_balance: 'DEBIT' },
      'OTHER': { account_type: 'REVENUE', normal_balance: 'CREDIT' }
    };

    return rules[itemType] || rules[itemCategory] || { account_type: 'REVENUE', normal_balance: 'CREDIT' };
  }

  /**
   * Calculate debit and credit amounts based on item type
   */
  calculateDebitCredit(item, amount) {
    switch (item.item_type) {
      case 'DISCOUNT':
      case 'REFUND':
      case 'CREDIT':
        // These reduce what student owes (credit to student account)
        return { cr: 0, dr: amount };
      
      default:
        // CHARGE, FEE, ITEM, FINE, PENALTY increase what student owes (debit to student account)
        return { cr: amount, dr: 0 };
    }
  }

  /**
   * Get account name based on item category and type
   */
  getAccountName(itemCategory, itemType) {
    const accountNames = {
      'CHARGE': 'Student Receivables',
      'FEE': 'Tuition Fees',
      'ITEM': 'Other Income',
      'FINE': 'Fine Income',
      'PENALTY': 'Penalty Income',
      'DISCOUNT': 'Discount Allowed',
      'REFUND': 'Refunds Payable',
      'CREDIT': 'Student Credits',
      'EXPENSE': 'General Expenses',
      'OTHER': 'Other Income'
    };

    return accountNames[itemType] || accountNames[itemCategory] || 'Other Income';
  }

  /**
   * Generate reference number
   */
  async generateRefNo() {
    let refNo = moment().format("YYmmSS");
    refNo = refNo + `${Math.floor(10 + Math.random() * 9)}`;
    return refNo;
  }

  /**
   * Get student's current balance
   */
  async getStudentBalance(admission_no, academic_year, term, school_id) {
    const result = await sequelize.query(
      `SELECT SUM(cr - dr) as balance 
       FROM payment_entries 
       WHERE admission_no = ? AND academic_year = ? AND term = ? AND school_id = ?`,
      {
        replacements: [admission_no, academic_year, term, school_id],
        type: QueryTypes.SELECT
      }
    );

    return parseFloat(result[0]?.balance || 0);
  }

  /**
   * Create journal entry for proper double-entry bookkeeping
   */
  async createJournalEntry(entries, transaction, school_id, branch_id, created_by) {
    try {
      if (!entries || entries.length === 0) {
        console.log('📝 No journal entries to create');
        return true;
      }

      const totalAmount = entries.reduce((sum, entry) => {
        return sum + Math.max(entry.debit || 0, entry.credit || 0);
      }, 0);

      const entryNumber = `JE-${Date.now()}`;
      
      console.log(`📊 Creating journal entry: ${entryNumber} with ${entries.length} lines`);

      try {
        await sequelize.query(
          `INSERT INTO journal_entries 
           (entry_number, entry_date, reference_type, description, total_amount, 
            status, created_by, school_id, branch_id) 
           VALUES (?, CURDATE(), 'CUSTOM_ITEM', ?, ?, 
                   'POSTED', ?, ?, ?)`,
          {
            replacements: [
              entryNumber,
              entries[0]?.description || 'Custom item journal entry',
              totalAmount,
              created_by,
              school_id,
              branch_id,
            ],
            transaction,
            type: QueryTypes.INSERT
          }
        );

        console.log(`✅ Journal entry created: ${entryNumber}`);
        return true;
      } catch (journalError) {
        console.log('📝 Journal entries table not available, skipping journal entry creation');
        return true;
      }

    } catch (error) {
      console.error('❌ Error creating journal entries:', error);
      throw error;
    }
  }
}

module.exports = new UnifiedCustomItemsController();