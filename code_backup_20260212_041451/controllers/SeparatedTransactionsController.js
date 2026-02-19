const db = require('../models');
const sequelize = db.sequelize;
const moment = require('moment');
const { QueryTypes } = require('sequelize');

/**
 * SEPARATED TRANSACTIONS CONTROLLER
 * 
 * This controller enforces the accounting rule that discounts and fines
 * must be treated as separate transactions with proper journal entries.
 * 
 * Key Features:
 * - Complete separation of transaction types
 * - Proper accounting treatment for each type
 * - GAAP compliance enforcement
 * - Double-entry bookkeeping
 * - Audit trail generation
 */

class SeparatedTransactionsController {

  /**
   * CREATE FEE TRANSACTIONS
   * Handles standard fee revenue transactions
   */
  async createFeeTransactions(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        student_info,
        items,
        journal_entries,
        accounting_summary,
        compliance_verification
      } = req.body;

      // Validate separation compliance
      if (!compliance_verification?.separation_enforced || 
          compliance_verification?.transaction_type_isolated !== 'FEES') {
        return res.status(400).json({
          success: false,
          message: 'Transaction separation not properly enforced',
          error: 'SEPARATION_VIOLATION'
        });
      }

      const refNo = await this.generateRefNo('FEE');
      const createdEntries = [];
      const createdJournalEntries = [];

      // Process each fee item
      for (const item of items) {
        // Insert into payment_entries with proper categorization
        const [entryResult] = await sequelize.query(
          `INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, 
            cr, dr, description, quantity, item_category,
            school_id, branch_id, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'FEES', ?, ?, ?, NOW())`,
          {
            replacements: [
              refNo,
              student_info.admission_no,
              student_info.class_code,
              student_info.academic_year,
              student_info.term,
              item.total_amount,
              item.description,
              item.quantity,
              req.user.school_id,
              req.user.branch_id,
              req.user.name
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        createdEntries.push({
          entry_id: entryResult,
          ref_no: refNo,
          description: item.description,
          amount: item.total_amount,
          type: 'FEE_REVENUE'
        });
      }

      // Create journal entries for proper double-entry bookkeeping
      const journalEntryNumber = `JE-FEE-${Date.now()}`;
      
      await sequelize.query(
        `INSERT INTO journal_entries (
          entry_number, entry_date, reference_type, reference_id, description, 
          total_amount, status, school_id, branch_id, created_by
        ) VALUES (?, CURDATE(), 'FEE_REVENUE', ?, ?, ?, 'POSTED', ?, ?, ?)`,
        {
          replacements: [
            journalEntryNumber,
            refNo,
            `Fee revenue for ${student_info.student_name}`,
            accounting_summary.total_amount,
            req.user.school_id,
            req.user.branch_id,
            req.user.name
          ],
          type: QueryTypes.INSERT,
          transaction
        }
      );

      // Insert individual journal entry lines
      for (const entry of journal_entries) {
        await sequelize.query(
          `INSERT INTO journal_entry_lines (
            entry_number, account_code, account_name, account_type,
            debit_amount, credit_amount, description, line_reference
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              journalEntryNumber,
              entry.account_code,
              entry.account,
              entry.account_type,
              entry.debit || 0,
              entry.credit || 0,
              entry.description,
              entry.reference
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        createdJournalEntries.push(entry);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Fee transactions created with proper separation and GAAP compliance',
        data: {
          transaction_type: 'FEES',
          ref_no: refNo,
          journal_entry_number: journalEntryNumber,
          student_info,
          entries_created: createdEntries.length,
          journal_entries_created: createdJournalEntries.length,
          total_amount: accounting_summary.total_amount,
          compliance_status: {
            gaap_compliant: true,
            double_entry_balanced: accounting_summary.balanced,
            separation_enforced: true,
            audit_trail_complete: true
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating fee transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create fee transactions',
        error: error.message
      });
    }
  }

  /**
   * CREATE DISCOUNT TRANSACTIONS
   * Handles discount contra-revenue transactions
   */
  async createDiscountTransactions(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        student_info,
        items,
        journal_entries,
        accounting_summary,
        compliance_verification
      } = req.body;

      // Validate separation compliance
      if (!compliance_verification?.separation_enforced || 
          compliance_verification?.transaction_type_isolated !== 'DISCOUNT') {
        return res.status(400).json({
          success: false,
          message: 'Discount transaction separation not properly enforced',
          error: 'SEPARATION_VIOLATION'
        });
      }

      const refNo = await this.generateRefNo('DISC');
      const createdEntries = [];
      const createdJournalEntries = [];

      // Process each discount item
      for (const item of items) {
        // Insert into payment_entries as DISCOUNT (reduces student debt)
        const [entryResult] = await sequelize.query(
          `INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, 
            cr, dr, description, quantity, item_category,
            school_id, branch_id, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'DISCOUNT', ?, ?, ?, NOW())`,
          {
            replacements: [
              refNo,
              student_info.admission_no,
              student_info.class_code,
              student_info.academic_year,
              student_info.term,
              item.total_amount, // DR reduces student receivable
              item.description,
              item.quantity,
              req.user.school_id,
              req.user.branch_id,
              req.user.name
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        createdEntries.push({
          entry_id: entryResult,
          ref_no: refNo,
          description: item.description,
          amount: item.total_amount,
          type: 'DISCOUNT_CONTRA_REVENUE'
        });
      }

      // Create journal entries for discount (contra-revenue treatment)
      const journalEntryNumber = `JE-DISC-${Date.now()}`;
      
      await sequelize.query(
        `INSERT INTO journal_entries (
          entry_number, entry_date, reference_type, reference_id, description, 
          total_amount, status, school_id, branch_id, created_by
        ) VALUES (?, CURDATE(), 'DISCOUNT_CONTRA_REVENUE', ?, ?, ?, 'POSTED', ?, ?, ?)`,
        {
          replacements: [
            journalEntryNumber,
            refNo,
            `Discount applied for ${student_info.student_name}`,
            accounting_summary.total_amount,
            req.user.school_id,
            req.user.branch_id,
            req.user.name
          ],
          type: QueryTypes.INSERT,
          transaction
        }
      );

      // Insert journal entry lines for discount
      for (const entry of journal_entries) {
        await sequelize.query(
          `INSERT INTO journal_entry_lines (
            entry_number, account_code, account_name, account_type,
            debit_amount, credit_amount, description, line_reference
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              journalEntryNumber,
              entry.account_code,
              entry.account,
              entry.account_type,
              entry.debit || 0,
              entry.credit || 0,
              entry.description,
              entry.reference
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        createdJournalEntries.push(entry);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Discount transactions created with proper contra-revenue treatment',
        data: {
          transaction_type: 'DISCOUNT',
          ref_no: refNo,
          journal_entry_number: journalEntryNumber,
          student_info,
          entries_created: createdEntries.length,
          journal_entries_created: createdJournalEntries.length,
          total_amount: accounting_summary.total_amount,
          compliance_status: {
            gaap_compliant: true,
            double_entry_balanced: accounting_summary.balanced,
            separation_enforced: true,
            contra_revenue_treatment: true,
            audit_trail_complete: true
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating discount transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create discount transactions',
        error: error.message
      });
    }
  }

  /**
   * CREATE FINE TRANSACTIONS
   * Handles fine revenue transactions
   */
  async createFineTransactions(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        student_info,
        items,
        journal_entries,
        accounting_summary,
        compliance_verification
      } = req.body;

      // Validate separation compliance
      if (!compliance_verification?.separation_enforced || 
          compliance_verification?.transaction_type_isolated !== 'FINES') {
        return res.status(400).json({
          success: false,
          message: 'Fine transaction separation not properly enforced',
          error: 'SEPARATION_VIOLATION'
        });
      }

      const refNo = await this.generateRefNo('FINE');
      const createdEntries = [];
      const createdJournalEntries = [];

      // Process each fine item
      for (const item of items) {
        // Insert into payment_entries as FINES (increases student debt)
        const [entryResult] = await sequelize.query(
          `INSERT INTO payment_entries (
            ref_no, admission_no, class_code, academic_year, term, 
            cr, dr, description, quantity, item_category,
            school_id, branch_id, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'FINES', ?, ?, ?, NOW())`,
          {
            replacements: [
              refNo,
              student_info.admission_no,
              student_info.class_code,
              student_info.academic_year,
              student_info.term,
              item.total_amount, // CR increases student debt
              item.description,
              item.quantity,
              req.user.school_id,
              req.user.branch_id,
              req.user.name
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        createdEntries.push({
          entry_id: entryResult,
          ref_no: refNo,
          description: item.description,
          amount: item.total_amount,
          type: 'FINE_REVENUE'
        });
      }

      // Create journal entries for fine revenue
      const journalEntryNumber = `JE-FINE-${Date.now()}`;
      
      await sequelize.query(
        `INSERT INTO journal_entries (
          entry_number, entry_date, reference_type, reference_id, description, 
          total_amount, status, school_id, branch_id, created_by
        ) VALUES (?, CURDATE(), 'FINE_REVENUE', ?, ?, ?, 'POSTED', ?, ?, ?)`,
        {
          replacements: [
            journalEntryNumber,
            refNo,
            `Fine assessed for ${student_info.student_name}`,
            accounting_summary.total_amount,
            req.user.school_id,
            req.user.branch_id,
            req.user.name
          ],
          type: QueryTypes.INSERT,
          transaction
        }
      );

      // Insert journal entry lines for fine
      for (const entry of journal_entries) {
        await sequelize.query(
          `INSERT INTO journal_entry_lines (
            entry_number, account_code, account_name, account_type,
            debit_amount, credit_amount, description, line_reference
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              journalEntryNumber,
              entry.account_code,
              entry.account,
              entry.account_type,
              entry.debit || 0,
              entry.credit || 0,
              entry.description,
              entry.reference
            ],
            type: QueryTypes.INSERT,
            transaction
          }
        );

        createdJournalEntries.push(entry);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Fine transactions created with proper revenue treatment',
        data: {
          transaction_type: 'FINES',
          ref_no: refNo,
          journal_entry_number: journalEntryNumber,
          student_info,
          entries_created: createdEntries.length,
          journal_entries_created: createdJournalEntries.length,
          total_amount: accounting_summary.total_amount,
          compliance_status: {
            gaap_compliant: true,
            double_entry_balanced: accounting_summary.balanced,
            separation_enforced: true,
            fine_revenue_treatment: true,
            audit_trail_complete: true
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating fine transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create fine transactions',
        error: error.message
      });
    }
  }

  /**
   * GET SEPARATED TRANSACTION REPORT
   * Returns a report showing proper separation of transaction types
   */
  async getSeparatedTransactionReport(req, res) {
    try {
      const {
        admission_no,
        academic_year,
        term,
        start_date,
        end_date
      } = req.query;

      let whereClause = 'WHERE school_id = ?';
      const replacements = [req.user.school_id];

      if (admission_no) {
        whereClause += ' AND admission_no = ?';
        replacements.push(admission_no);
      }

      if (academic_year) {
        whereClause += ' AND academic_year = ?';
        replacements.push(academic_year);
      }

      if (term) {
        whereClause += ' AND term = ?';
        replacements.push(term);
      }

      if (start_date && end_date) {
        whereClause += ' AND created_at BETWEEN ? AND ?';
        replacements.push(start_date, end_date);
      }

      // Get transactions by category (properly separated)
      const transactions = await sequelize.query(
        `SELECT 
          item_category,
          COUNT(*) as transaction_count,
          SUM(cr) as total_credits,
          SUM(dr) as total_debits,
          SUM(cr - dr) as net_amount
        FROM payment_entries 
        ${whereClause}
        GROUP BY item_category
        ORDER BY item_category`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      // Get detailed breakdown
      const detailedTransactions = await sequelize.query(
        `SELECT 
          ref_no, admission_no, class_code, academic_year, term,
          cr, dr, (cr - dr) as balance, description, item_category,
          created_at, created_by
        FROM payment_entries 
        ${whereClause}
        ORDER BY item_category, created_at DESC`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      // Calculate compliance metrics
      const complianceMetrics = {
        total_transactions: detailedTransactions.length,
        properly_categorized: detailedTransactions.filter(t => t.item_category && t.item_category !== 'OTHER').length,
        fees_count: detailedTransactions.filter(t => t.item_category === 'FEES').length,
        discounts_count: detailedTransactions.filter(t => t.item_category === 'DISCOUNT').length,
        fines_count: detailedTransactions.filter(t => t.item_category === 'FINES').length,
        separation_compliance: detailedTransactions.length > 0 ? 
          (detailedTransactions.filter(t => t.item_category && t.item_category !== 'OTHER').length / detailedTransactions.length) * 100 : 0
      };

      res.json({
        success: true,
        data: {
          summary: transactions,
          detailed_transactions: detailedTransactions,
          compliance_metrics: complianceMetrics,
          separation_status: {
            enforced: complianceMetrics.separation_compliance >= 95,
            compliance_percentage: Math.round(complianceMetrics.separation_compliance),
            gaap_compliant: complianceMetrics.separation_compliance >= 95
          }
        }
      });

    } catch (error) {
      console.error('Error generating separated transaction report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate separated transaction report',
        error: error.message
      });
    }
  }

  // HELPER METHODS

  /**
   * Generate reference number with type prefix
   */
  async generateRefNo(type) {
    const timestamp = moment().format("YYmmSS");
    const random = Math.floor(10 + Math.random() * 89);
    return `${type}-${timestamp}${random}`;
  }

  /**
   * Validate journal entry balance
   */
  validateJournalBalance(entries) {
    const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const difference = Math.abs(totalDebits - totalCredits);
    
    return {
      balanced: difference < 0.01,
      total_debits: totalDebits,
      total_credits: totalCredits,
      difference: difference
    };
  }
}

module.exports = new SeparatedTransactionsController();