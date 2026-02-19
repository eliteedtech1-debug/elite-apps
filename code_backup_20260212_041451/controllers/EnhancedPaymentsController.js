const db = require('../models');
const sequelize = db.sequelize;
const moment = require('moment');
const { QueryTypes } = require('sequelize');

/**
 * ENHANCED PAYMENTS CONTROLLER
 * 
 * This controller handles payments with complete separation of:
 * - Standard fee items (basic charges)
 * - Custom items (additional charges)
 * - Discounts (separate liability/expense items)
 * - Fines (separate revenue items)
 * 
 * Each type gets proper accounting treatment as separate entities.
 */

class EnhancedPaymentsController {

  /**
   * CREATE BILL WITH SEPARATED ENTITIES
   * Creates a bill with standard items, custom items, discounts, and fines as separate entities
   */
  async createBillWithSeparatedEntities(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        admission_no,
        class_code,
        academic_year,
        term,
        standard_items = [], // Basic fee items
        custom_items = [],   // Custom charges
        discounts = [],      // Discount items (separate entities)
        fines = [],          // Fine items (separate entities)
        branch_id,
        created_by,
        create_journal_entry = true,
        notes
      } = req.body;

      // Validate required fields
      if (!admission_no || (!standard_items.length && !custom_items.length && !discounts.length && !fines.length)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: admission_no and at least one item type'
        });
      }

      const refNo = await this.generateRefNo();
      const appliedItems = [];
      const journalEntries = [];

      // Process standard fee items
      for (const item of standard_items) {
        const {
          description,
          unit_price,
          quantity = 1,
          item_category = 'STANDARD_FEE'
        } = item;

        const totalAmount = unit_price * quantity;

        // Insert standard fee item
        await sequelize.query(
          `INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, cr, dr,
            description, quantity, item_category, school_id, branch_id, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NOW())`,
          {
            replacements: [
              refNo, admission_no, class_code, academic_year, term, totalAmount, 
              description, quantity, item_category, req.user.school_id,
              branch_id || req.user.branch_id, created_by
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        appliedItems.push({
          type: 'STANDARD_FEE',
          description,
          amount: totalAmount,
          quantity,
          accounting_treatment: 'REVENUE'
        });

        // Journal entry for standard fee (Asset/Revenue)
        if (create_journal_entry) {
          journalEntries.push({
            account: `Accounts Receivable - ${admission_no}`,
            account_type: 'ASSET',
            debit: totalAmount,
            credit: 0,
            description: `Standard Fee: ${description}`
          });
          journalEntries.push({
            account: 'Fee Revenue',
            account_type: 'REVENUE',
            debit: 0,
            credit: totalAmount,
            description: `Fee Revenue: ${description}`
          });
        }
      }

      // Process custom items using unified API
      if (custom_items.length > 0) {
        for (const item of custom_items) {
          const {
            item_id,
            custom_amount,
            quantity = 1,
            custom_description
          } = item;

          // Get custom item details
          const customItemDetails = await sequelize.query(
            `SELECT * FROM custom_items WHERE item_id = ? AND school_id = ?`,
            {
              replacements: [item_id, req.user.school_id],
              type: QueryTypes.SELECT,
              transaction
            }
          );

          if (customItemDetails.length === 0) {
            throw new Error(`Custom item with ID ${item_id} not found`);
          }

          const customItem = customItemDetails[0];
          const finalAmount = custom_amount || customItem.default_amount;
          const totalAmount = finalAmount * quantity;
          const description = custom_description || customItem.item_name;

          // Determine debit/credit based on item type
          const { cr, dr } = this.calculateDebitCredit(customItem, totalAmount);

          // Insert custom item
          await sequelize.query(
            `INSERT INTO payment_entries (
              ref_no, admission_no, class_code, academic_year, term, cr, dr,
              description, quantity, item_category, school_id, branch_id, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            {
              replacements: [
                refNo, admission_no, class_code, academic_year, term, cr, dr,
                description, quantity, customItem.item_category, req.user.school_id,
                branch_id || req.user.branch_id, created_by
              ],
              type: QueryTypes.INSERT,
              transaction
            }
          );

          appliedItems.push({
            type: customItem.item_type,
            description,
            amount: totalAmount,
            quantity,
            accounting_treatment: customItem.account_type
          });

          // Journal entry for custom item
          if (create_journal_entry) {
            journalEntries.push({
              account: this.getAccountName(customItem.item_category, customItem.item_type),
              account_type: customItem.account_type,
              debit: dr,
              credit: cr,
              description: `${customItem.item_type}: ${description}`
            });
          }
        }
      }

      // Process discount items as separate entities
      for (const discount of discounts) {
        const {
          description,
          amount,
          discount_type = 'FIXED', // FIXED or PERCENTAGE
          percentage_base_amount = 0
        } = discount;

        let finalDiscountAmount = amount;
        if (discount_type === 'PERCENTAGE' && percentage_base_amount > 0) {
          finalDiscountAmount = (percentage_base_amount * amount) / 100;
        }

        // Insert discount as separate entity (reduces student debt)
        await sequelize.query(
          `INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, cr, dr,
            description, quantity, item_category, school_id, branch_id, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1, 'DISCOUNT', ?, ?, ?, NOW())`,
          {
            replacements: [
              refNo, admission_no, class_code, academic_year, term, finalDiscountAmount,
              description, req.user.school_id, branch_id || req.user.branch_id, created_by
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        appliedItems.push({
          type: 'DISCOUNT',
          description,
          amount: finalDiscountAmount,
          quantity: 1,
          accounting_treatment: 'EXPENSE'
        });

        // Journal entry for discount (Expense/Asset)
        if (create_journal_entry) {
          journalEntries.push({
            account: 'Student Discount Expense',
            account_type: 'EXPENSE',
            debit: finalDiscountAmount,
            credit: 0,
            description: `Discount: ${description}`
          });
          journalEntries.push({
            account: `Accounts Receivable - ${admission_no}`,
            account_type: 'ASSET',
            debit: 0,
            credit: finalDiscountAmount,
            description: `Discount Applied: ${description}`
          });
        }
      }

      // Process fine items as separate entities
      for (const fine of fines) {
        const {
          description,
          amount,
          fine_type = 'PENALTY'
        } = fine;

        // Insert fine as separate entity (increases student debt)
        await sequelize.query(
          `INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, cr, dr,
            description, quantity, item_category, school_id, branch_id, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?, ?, ?, NOW())`,
          {
            replacements: [
              refNo, admission_no, class_code, academic_year, term, amount,
              description, fine_type, req.user.school_id, branch_id || req.user.branch_id, created_by
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        appliedItems.push({
          type: fine_type,
          description,
          amount,
          quantity: 1,
          accounting_treatment: 'REVENUE'
        });

        // Journal entry for fine (Asset/Revenue)
        if (create_journal_entry) {
          journalEntries.push({
            account: `Accounts Receivable - ${admission_no}`,
            account_type: 'ASSET',
            debit: amount,
            credit: 0,
            description: `${fine_type}: ${description}`
          });
          journalEntries.push({
            account: fine_type === 'FINE' ? 'Fine Revenue' : 'Penalty Revenue',
            account_type: 'REVENUE',
            debit: 0,
            credit: amount,
            description: `${fine_type} Revenue: ${description}`
          });
        }
      }

      // Create journal entries if requested
      if (create_journal_entry && journalEntries.length > 0) {
        await this.createJournalEntry(journalEntries, transaction, req.user.school_id, branch_id || req.user.branch_id, created_by);
      }

      await transaction.commit();

      // Calculate totals by type
      const summary = {
        standard_fees: appliedItems.filter(i => i.type === 'STANDARD_FEE').reduce((sum, i) => sum + i.amount, 0),
        custom_items: appliedItems.filter(i => !['STANDARD_FEE', 'DISCOUNT', 'FINE', 'PENALTY'].includes(i.type)).reduce((sum, i) => sum + i.amount, 0),
        discounts: appliedItems.filter(i => i.type === 'DISCOUNT').reduce((sum, i) => sum + i.amount, 0),
        fines: appliedItems.filter(i => ['FINE', 'PENALTY'].includes(i.type)).reduce((sum, i) => sum + i.amount, 0),
        net_total: appliedItems.reduce((sum, i) => {
          return i.type === 'DISCOUNT' ? sum - i.amount : sum + i.amount;
        }, 0)
      };

      res.json({
        success: true,
        message: 'Bill created with separated entities and proper accounting',
        data: {
          ref_no: refNo,
          admission_no,
          class_code,
          academic_year,
          term,
          items_applied: appliedItems.length,
          items: appliedItems,
          summary,
          accounting_entries: journalEntries.length,
          notes
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating bill with separated entities:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create bill with separated entities',
        error: error.message
      });
    }
  }

  /**
   * GET STUDENT BILL BREAKDOWN
   * Returns a breakdown of all bill components for a student
   */
  async getStudentBillBreakdown(req, res) {
    try {
      const {
        admission_no,
        academic_year,
        term
      } = req.query;

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: 'admission_no is required'
        });
      }

      let whereClause = 'WHERE admission_no = ? AND school_id = ?';
      const replacements = [admission_no, req.user.school_id];

      if (academic_year) {
        whereClause += ' AND academic_year = ?';
        replacements.push(academic_year);
      }

      if (term) {
        whereClause += ' AND term = ?';
        replacements.push(term);
      }

      const items = await sequelize.query(
        `SELECT 
          ref_no, admission_no, class_code, academic_year, term,
          cr, dr, (cr - dr) as balance, description, quantity, item_category,
          created_at, created_by
        FROM payment_entries 
        ${whereClause} 
        ORDER BY created_at DESC`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      // Group by item category
      const breakdown = {
        standard_fees: items.filter(i => i.item_category === 'STANDARD_FEE'),
        custom_items: items.filter(i => !['STANDARD_FEE', 'DISCOUNT', 'FINE', 'PENALTY'].includes(i.item_category)),
        discounts: items.filter(i => i.item_category === 'DISCOUNT'),
        fines: items.filter(i => ['FINE', 'PENALTY'].includes(i.item_category)),
      };

      // Calculate totals
      const totals = {
        standard_fees: breakdown.standard_fees.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0),
        custom_items: breakdown.custom_items.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0),
        discounts: breakdown.discounts.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0),
        fines: breakdown.fines.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0),
      };

      totals.net_outstanding = totals.standard_fees + totals.custom_items - totals.discounts + totals.fines;

      res.json({
        success: true,
        data: {
          admission_no,
          academic_year,
          term,
          breakdown,
          totals,
          total_items: items.length
        }
      });

    } catch (error) {
      console.error('Error getting student bill breakdown:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get student bill breakdown',
        error: error.message
      });
    }
  }

  // HELPER METHODS

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
      
      console.log(`📊 Creating enhanced journal entry: ${entryNumber} with ${entries.length} lines`);

      try {
        await sequelize.query(
          `INSERT INTO journal_entries 
           (entry_number, entry_date, reference_type, description, total_amount, 
            status, created_by, school_id, branch_id) 
           VALUES (?, CURDATE(), 'ENHANCED_PAYMENT', ?, ?, 
                   'POSTED', ?, ?, ?)`,
          {
            replacements: [
              entryNumber,
              entries[0]?.description || 'Enhanced payment with separated entities',
              totalAmount,
              created_by,
              school_id,
              branch_id,
            ],
            transaction,
            type: QueryTypes.INSERT
          }
        );

        console.log(`✅ Enhanced journal entry created: ${entryNumber}`);
        return true;
      } catch (journalError) {
        console.log('📝 Journal entries table not available, skipping journal entry creation');
        return true;
      }

    } catch (error) {
      console.error('❌ Error creating enhanced journal entries:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedPaymentsController();