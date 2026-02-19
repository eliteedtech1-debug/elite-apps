// Reconciliation Service for Payment Entries and Journal Entries
const db = require('../models');
const { QueryTypes } = require('sequelize');

class FinancialReconciliationService {
  /**
   * Reconcile payment entries with journal entries
   */
  static async reconcilePaymentEntries(
    schoolId = '',
    branchId = '',
    startDate = '',
    endDate = ''
  ) {
    try {
      // Get payment entries without journal entries
      const [unmatchedPayments] = await db.sequelize.query(
        `SELECT pe.item_id, pe.cr, pe.dr, pe.description, pe.created_at
         FROM payment_entries pe
         LEFT JOIN journal_entries je ON pe.journal_entry_id = je.entry_id
         WHERE pe.school_id = :schoolId
         AND (pe.branch_id = :branchId OR :branchId IS NULL)
         AND (pe.created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))
         AND pe.journal_entry_id IS NULL
         AND (pe.cr > 0 OR pe.dr > 0)`,
        {
          replacements: {
            schoolId,
            branchId: branchId || null,
            startDate: startDate || null,
            endDate: endDate || null
          },
          type: QueryTypes.SELECT
        }
      );

      // Get journal entries without payment entries
      const [unmatchedJournals] = await db.sequelize.query(
        `SELECT je.entry_id, je.total_amount, je.description, je.created_at
         FROM journal_entries je
         LEFT JOIN payment_entries pe ON je.entry_id = pe.journal_entry_id
         WHERE je.school_id = :schoolId
         AND (je.branch_id = :branchId OR :branchId IS NULL)
         AND (je.created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))
         AND je.reference_type = 'STUDENT_PAYMENT'
         AND pe.item_id IS NULL`,
        {
          replacements: {
            schoolId,
            branchId: branchId || null,
            startDate: startDate || null,
            endDate: endDate || null
          },
          type: QueryTypes.SELECT
        }
      );

      // Find discrepancies in amounts
      const [discrepancies] = await db.sequelize.query(
        `SELECT 
           pe.item_id as payment_entry_id,
           je.entry_id as journal_entry_id,
           pe.description,
           ABS(pe.cr - je.total_amount) as amount_difference
         FROM payment_entries pe
         JOIN journal_entries je ON pe.journal_entry_id = je.entry_id
         WHERE pe.school_id = :schoolId
         AND (pe.branch_id = :branchId OR :branchId IS NULL)
         AND ABS(pe.cr - je.total_amount) > 0.01`,
        {
          replacements: {
            schoolId,
            branchId: branchId || null
          },
          type: QueryTypes.SELECT
        }
      );

      return {
        totalPaymentEntries: unmatchedPayments.length,
        totalJournalEntries: unmatchedJournals.length,
        matchedEntries: 0, // This would need a more complex query to calculate
        unmatchedPaymentEntries: unmatchedPayments.length,
        unmatchedJournalEntries: unmatchedJournals.length,
        discrepancies: discrepancies
      };
    } catch (error) {
      console.error('Error during reconciliation:', error);
      throw new Error('Failed to reconcile financial entries');
    }
  }

  /**
   * Create audit trail entry for financial transactions
   */
  static async createAuditTrail(auditData) {
    try {
      await db.sequelize.query(
        `INSERT INTO financial_audit_trail (
           table_name, record_id, action, old_values, new_values,
           user_id, ip_address, user_agent, school_id, branch_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            auditData.table_name,
            auditData.record_id,
            auditData.action,
            JSON.stringify(auditData.old_values),
            JSON.stringify(auditData.new_values),
            auditData.user_id,
            auditData.ip_address,
            auditData.user_agent,
            auditData.school_id,
            auditData.branch_id
          ]
        }
      );
    } catch (error) {
      console.error('Error creating audit trail:', error);
      // Don't throw error as this shouldn't break the main process
    }
  }

  /**
   * Auto-create missing journal entries for payment entries
   */
  static async autoCreateMissingJournalEntries(
    schoolId = '',
    branchId = ''
  ) {
    try {
      // Find payment entries without journal entries
      const [unmatchedPayments] = await db.sequelize.query(
        `SELECT item_id, cr, dr, description, school_id, branch_id, created_at
         FROM payment_entries
         WHERE school_id = :schoolId
         AND (branch_id = :branchId OR :branchId IS NULL)
         AND journal_entry_id IS NULL
         AND (cr > 0 OR dr > 0)
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        {
          replacements: {
            schoolId,
            branchId: branchId || null
          },
          type: QueryTypes.SELECT
        }
      );

      let created = 0;
      let failed = 0;

      // Create journal entries for each unmatched payment
      for (const payment of unmatchedPayments) {
        try {
          await db.sequelize.query(
            `CALL convert_payment_to_journal(:payment_entry_id, :created_by)`,
            {
              replacements: {
                payment_entry_id: payment.item_id,
                created_by: 'SYSTEM_AUTO_RECONCILE'
              }
            }
          );
          created++;
        } catch (error) {
          console.error(`Failed to create journal entry for payment ${payment.item_id}:`, error);
          failed++;
        }
      }

      return { created, failed };
    } catch (error) {
      console.error('Error auto-creating journal entries:', error);
      throw new Error('Failed to auto-create missing journal entries');
    }
  }

  /**
   * Generate reconciliation report
   */
  static async generateReconciliationReport(
    schoolId = '',
    branchId = '',
    startDate = '',
    endDate = ''
  ) {
    try {
      // Get summary statistics
      const [summary] = await db.sequelize.query(
        `SELECT 
           COUNT(*) as total_records,
           SUM(CASE WHEN pe.journal_entry_id IS NOT NULL THEN 1 ELSE 0 END) as matched_records,
           SUM(CASE WHEN pe.journal_entry_id IS NULL THEN 1 ELSE 0 END) as unmatched_records,
           SUM(COALESCE(pe.cr, 0)) as total_cr_amount,
           SUM(COALESCE(pe.dr, 0)) as total_dr_amount
         FROM payment_entries pe
         WHERE pe.school_id = :schoolId
         AND (pe.branch_id = :branchId OR :branchId IS NULL)
         AND (pe.created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))`,
        {
          replacements: {
            schoolId,
            branchId: branchId || null,
            startDate: startDate || null,
            endDate: endDate || null
          },
          type: QueryTypes.SELECT
        }
      );

      // Get recent audit trail entries
      const [auditTrail] = await db.sequelize.query(
        `SELECT *
         FROM financial_audit_trail
         WHERE school_id = :schoolId
         AND (branch_id = :branchId OR :branchId IS NULL)
         AND (created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))
         ORDER BY created_at DESC
         LIMIT 50`,
        {
          replacements: {
            schoolId,
            branchId: branchId || null,
            startDate: startDate || null,
            endDate: endDate || null
          },
          type: QueryTypes.SELECT
        }
      );

      return {
        summary: summary[0],
        auditTrail,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating reconciliation report:', error);
      throw new Error('Failed to generate reconciliation report');
    }
  }
}

module.exports = FinancialReconciliationService;