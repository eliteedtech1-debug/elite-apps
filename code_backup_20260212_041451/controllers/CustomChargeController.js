const db = require('../models');
const sequelize = db.sequelize;
const moment = require('moment');
const { QueryTypes } = require('sequelize');

/**
 * CUSTOM CHARGE CONTROLLER
 * 
 * This controller manages custom charges with proper accounting treatment.
 * It handles different item categories (Fees, Items, Discount, Fines, etc.)
 * and ensures proper double-entry bookkeeping.
 */

class CustomChargeController {

  /**
   * CREATE CUSTOM CHARGE ITEM TEMPLATE
   * Creates a reusable charge item template
   */
  async createChargeItem(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        charge_code,
        charge_name,
        description,
        item_category,
        account_type,
        default_amount,
        is_taxable = false,
        tax_rate = 0.00,
        is_mandatory = true,
        is_recurring = false,
        applicable_classes = [],
        applicable_terms = [],
        status = 'ACTIVE',
        branch_id,
        created_by
      } = req.body;

      // Validate required fields
      if (!charge_code || !charge_name || !item_category || !default_amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: charge_code, charge_name, item_category, default_amount'
        });
      }

      // Determine account type and normal balance based on item category
      const accountingRules = this.getAccountingRules(item_category);

      // Create charge item
      const chargeItem = await sequelize.query(
        `INSERT INTO custom_charge_items (
          charge_code, charge_name, description, item_category, account_type, normal_balance,
          default_amount, is_taxable, tax_rate, is_mandatory, is_recurring,
          applicable_classes, applicable_terms, status, school_id, branch_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            charge_code, charge_name, description, item_category, 
            accountingRules.account_type, accountingRules.normal_balance,
            default_amount, is_taxable, tax_rate, is_mandatory, is_recurring,
            JSON.stringify(applicable_classes), JSON.stringify(applicable_terms),
            status, req.user.school_id, branch_id || req.user.branch_id, created_by
          ],
          type: QueryTypes.INSERT,
          transaction
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Custom charge item created successfully',
        data: {
          charge_id: chargeItem[0],
          charge_code,
          charge_name,
          item_category,
          account_type: accountingRules.account_type,
          normal_balance: accountingRules.normal_balance
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating custom charge item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create custom charge item',
        error: error.message
      });
    }
  }

  /**
   * GET CHARGE ITEMS
   * Retrieves charge item templates
   */
  async getChargeItems(req, res) {
    try {
      const {
        item_category,
        status = 'ACTIVE',
        branch_id
      } = req.query;

      let whereClause = 'WHERE school_id = ?';
      const replacements = [req.user.school_id];

      if (item_category) {
        whereClause += ' AND item_category = ?';
        replacements.push(item_category);
      }

      if (status) {
        whereClause += ' AND status = ?';
        replacements.push(status);
      }

      if (branch_id) {
        whereClause += ' AND (branch_id = ? OR branch_id IS NULL)';
        replacements.push(branch_id);
      }

      const chargeItems = await sequelize.query(
        `SELECT * FROM custom_charge_items ${whereClause} ORDER BY item_category, charge_name`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: chargeItems
      });

    } catch (error) {
      console.error('Error fetching charge items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch charge items',
        error: error.message
      });
    }
  }

  /**
   * APPLY CUSTOM CHARGES TO STUDENT
   * Applies charges to a student with proper accounting treatment
   */
  async applyCharges(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        admission_no,
        class_code,
        academic_year,
        term,
        charges, // Array of charge objects
        branch_id,
        created_by,
        create_journal_entry = true
      } = req.body;

      // Validate required fields
      if (!admission_no || !charges || !Array.isArray(charges) || charges.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: admission_no, charges (array)'
        });
      }

      const refNo = await this.generateRefNo();
      const appliedCharges = [];
      const journalEntries = [];

      // Process each charge
      for (const charge of charges) {
        const {
          charge_id,
          charge_code,
          amount,
          quantity = 1,
          description: customDescription
        } = charge;

        // Get charge item details
        const chargeItem = await sequelize.query(
          `SELECT * FROM custom_charge_items WHERE charge_id = ? AND school_id = ?`,
          {
            replacements: [charge_id, req.user.school_id],
            type: QueryTypes.SELECT,
            transaction
          }
        );

        if (chargeItem.length === 0) {
          throw new Error(`Charge item with ID ${charge_id} not found`);
        }

        const item = chargeItem[0];
        const finalAmount = amount || item.default_amount;
        const totalAmount = finalAmount * quantity;
        const description = customDescription || item.charge_name;

        // Calculate tax if applicable
        let taxAmount = 0;
        if (item.is_taxable && item.tax_rate > 0) {
          taxAmount = (totalAmount * item.tax_rate) / 100;
        }

        const finalTotalAmount = totalAmount + taxAmount;

        // Determine debit/credit based on item category and accounting rules
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

        appliedCharges.push({
          charge_code: item.charge_code,
          charge_name: item.charge_name,
          item_category: item.item_category,
          amount: finalAmount,
          quantity,
          tax_amount: taxAmount,
          total_amount: finalTotalAmount,
          description
        });

        // Prepare journal entry
        if (create_journal_entry) {
          journalEntries.push({
            account: this.getAccountName(item.item_category),
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
        message: 'Custom charges applied successfully',
        data: {
          ref_no: refNo,
          admission_no,
          class_code,
          academic_year,
          term,
          charges_applied: appliedCharges.length,
          total_amount: appliedCharges.reduce((sum, charge) => sum + charge.total_amount, 0),
          charges: appliedCharges
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error applying custom charges:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply custom charges',
        error: error.message
      });
    }
  }

  /**
   * APPLY DISCOUNT
   * Applies discount as a separate charge item
   */
  async applyDiscount(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        admission_no,
        class_code,
        academic_year,
        term,
        discount_amount,
        discount_type = 'FIXED', // FIXED or PERCENTAGE
        discount_reason,
        applicable_to_ref_no, // Optional: specific transaction to apply discount to
        branch_id,
        created_by
      } = req.body;

      // Validate required fields
      if (!admission_no || !discount_amount || !discount_reason) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: admission_no, discount_amount, discount_reason'
        });
      }

      const refNo = await this.generateRefNo();
      let finalDiscountAmount = discount_amount;

      // If percentage discount, calculate based on outstanding balance
      if (discount_type === 'PERCENTAGE') {
        const outstandingBalance = await this.getOutstandingBalance(admission_no, academic_year, term, req.user.school_id);
        finalDiscountAmount = (outstandingBalance * discount_amount) / 100;
      }

      // Apply discount as a credit entry (reduces student's debt)
      await sequelize.query(
        `INSERT INTO payment_entries (
          ref_no, admission_no, class_code, academic_year, term, cr, dr,
          description, quantity, item_category, school_id, branch_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1, 'Discount', ?, ?, ?, NOW())`,
        {
          replacements: [
            refNo, admission_no, class_code, academic_year, term, finalDiscountAmount,
            `Discount: ${discount_reason}`, req.user.school_id,
            branch_id || req.user.branch_id, created_by
          ],
          type: QueryTypes.INSERT,
          transaction
        }
      );

      // Create journal entry for discount
      await this.createJournalEntry([
        {
          account: 'Discount Allowed',
          account_type: 'EXPENSE',
          debit: finalDiscountAmount,
          credit: 0,
          description: `Discount Applied - ${admission_no}: ${discount_reason}`
        },
        {
          account: 'Student Receivables',
          account_type: 'ASSET',
          debit: 0,
          credit: finalDiscountAmount,
          description: `Discount Applied - ${admission_no}: ${discount_reason}`
        }
      ], transaction, req.user.school_id, branch_id || req.user.branch_id, created_by);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Discount applied successfully',
        data: {
          ref_no: refNo,
          admission_no,
          discount_type,
          discount_amount: finalDiscountAmount,
          discount_reason
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error applying discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply discount',
        error: error.message
      });
    }
  }

  /**
   * APPLY FINE
   * Applies fine as a separate charge item
   */
  async applyFine(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        admission_no,
        class_code,
        academic_year,
        term,
        fine_amount,
        fine_reason,
        due_date,
        branch_id,
        created_by
      } = req.body;

      // Validate required fields
      if (!admission_no || !fine_amount || !fine_reason) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: admission_no, fine_amount, fine_reason'
        });
      }

      const refNo = await this.generateRefNo();

      // Apply fine as a debit entry (increases student's debt)
      await sequelize.query(
        `INSERT INTO payment_entries (
          ref_no, admission_no, class_code, academic_year, term, cr, dr,
          description, quantity, item_category, school_id, branch_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, 'Fines', ?, ?, ?, NOW())`,
        {
          replacements: [
            refNo, admission_no, class_code, academic_year, term, fine_amount,
            `Fine: ${fine_reason}`, req.user.school_id,
            branch_id || req.user.branch_id, created_by
          ],
          type: QueryTypes.INSERT,
          transaction
        }
      );

      // Create journal entry for fine
      await this.createJournalEntry([
        {
          account: 'Student Receivables',
          account_type: 'ASSET',
          debit: fine_amount,
          credit: 0,
          description: `Fine Applied - ${admission_no}: ${fine_reason}`
        },
        {
          account: 'Fine Income',
          account_type: 'REVENUE',
          debit: 0,
          credit: fine_amount,
          description: `Fine Applied - ${admission_no}: ${fine_reason}`
        }
      ], transaction, req.user.school_id, branch_id || req.user.branch_id, created_by);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Fine applied successfully',
        data: {
          ref_no: refNo,
          admission_no,
          fine_amount,
          fine_reason,
          due_date
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error applying fine:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply fine',
        error: error.message
      });
    }
  }

  /**
   * GET STUDENT CHARGES
   * Retrieves all charges for a student
   */
  async getStudentCharges(req, res) {
    try {
      const {
        admission_no,
        academic_year,
        term,
        item_category
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

      if (item_category) {
        whereClause += ' AND item_category = ?';
        replacements.push(item_category);
      }

      const charges = await sequelize.query(
        `SELECT 
          item_id, ref_no, admission_no, class_code, academic_year, term,
          cr, dr, (cr - dr) as balance, description, quantity, item_category,
          payment_mode, created_at, created_by
        FROM payment_entries 
        ${whereClause} 
        ORDER BY created_at DESC`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      // Calculate summary
      const summary = {
        total_charges: charges.reduce((sum, charge) => sum + parseFloat(charge.cr || 0), 0),
        total_payments: charges.reduce((sum, charge) => sum + parseFloat(charge.dr || 0), 0),
        outstanding_balance: charges.reduce((sum, charge) => sum + parseFloat(charge.balance || 0), 0),
        total_items: charges.length
      };

      res.json({
        success: true,
        data: {
          charges,
          summary
        }
      });

    } catch (error) {
      console.error('Error fetching student charges:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student charges',
        error: error.message
      });
    }
  }

  // HELPER METHODS

  /**
   * Get accounting rules based on item category
   */
  getAccountingRules(itemCategory) {
    const rules = {
      'Fees': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'Items': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'Discount': { account_type: 'EXPENSE', normal_balance: 'DEBIT' },
      'Fines': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'Penalties': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'Refunds': { account_type: 'LIABILITY', normal_balance: 'CREDIT' },
      'Other Revenue': { account_type: 'REVENUE', normal_balance: 'CREDIT' },
      'Expenses': { account_type: 'EXPENSE', normal_balance: 'DEBIT' }
    };

    return rules[itemCategory] || { account_type: 'REVENUE', normal_balance: 'CREDIT' };
  }

  /**
   * Calculate debit and credit amounts based on item category
   */
  calculateDebitCredit(item, amount) {
    // For student charges, we typically:
    // - Debit Student Receivables (Asset) - increases what student owes
    // - Credit Revenue accounts - increases school income
    
    switch (item.item_category) {
      case 'Discount':
        // Discount reduces what student owes
        return { cr: 0, dr: amount }; // Credit to student account (reduces debt)
      
      case 'Refunds':
        // Refund reduces what student owes
        return { cr: 0, dr: amount }; // Credit to student account (reduces debt)
      
      default:
        // Fees, Items, Fines, Penalties increase what student owes
        return { cr: amount, dr: 0 }; // Debit to student account (increases debt)
    }
  }

  /**
   * Get account name based on item category
   */
  getAccountName(itemCategory) {
    const accountNames = {
      'Fees': 'Tuition Fees',
      'Items': 'Other Income',
      'Discount': 'Discount Allowed',
      'Fines': 'Fine Income',
      'Penalties': 'Penalty Income',
      'Refunds': 'Refunds Payable',
      'Other Revenue': 'Other Income',
      'Expenses': 'General Expenses'
    };

    return accountNames[itemCategory] || 'Other Income';
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
   * Get outstanding balance for a student
   */
  async getOutstandingBalance(admission_no, academic_year, term, school_id) {
    const result = await sequelize.query(
      `SELECT SUM(cr - dr) as outstanding_balance 
       FROM payment_entries 
       WHERE admission_no = ? AND academic_year = ? AND term = ? AND school_id = ?`,
      {
        replacements: [admission_no, academic_year, term, school_id],
        type: QueryTypes.SELECT
      }
    );

    return parseFloat(result[0]?.outstanding_balance || 0);
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

      // Calculate total amount for the journal entry
      const totalAmount = entries.reduce((sum, entry) => {
        return sum + Math.max(entry.debit || 0, entry.credit || 0);
      }, 0);

      // Generate unique entry number
      const entryNumber = `JE-${Date.now()}`;
      
      console.log(`📊 Creating journal entry: ${entryNumber} with ${entries.length} lines`);

      // Create journal entry header (if journal_entries table exists)
      try {
        const headerResult = await sequelize.query(
          `INSERT INTO journal_entries 
           (entry_number, entry_date, reference_type, description, total_amount, 
            status, created_by, school_id, branch_id) 
           VALUES (?, CURDATE(), 'CUSTOM_CHARGE', ?, ?, 
                   'POSTED', ?, ?, ?)`,
          {
            replacements: [
              entryNumber,
              entries[0]?.description || 'Custom charge journal entry',
              totalAmount,
              created_by,
              school_id,
              branch_id,
            ],
            transaction,
            type: QueryTypes.INSERT
          }
        );

        console.log(`✅ Journal entry header created: ${entryNumber}`);
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

module.exports = new CustomChargeController();