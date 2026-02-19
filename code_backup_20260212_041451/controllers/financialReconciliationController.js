// Financial Reconciliation Routes Handler
const db = require("../models");

/**
 * Reconcile payment entries with journal entries
 */
const reconcileFinancialEntries = async (req, res) => {
  try {
    const { school_id, branch_id, start_date, end_date } = req.query;
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Get payment entries without journal entries
    const [unmatchedPayments] = await db.sequelize.query(
      `SELECT 
         pe.item_id, 
         pe.ref_no,
         pe.admission_no,
         pe.cr, 
         pe.dr, 
         pe.description, 
         pe.created_at,
         pe.school_id,
         pe.branch_id,
         s.student_name,
         s.class_name
       FROM payment_entries pe
       LEFT JOIN journal_entries je ON pe.journal_entry_id = je.entry_id
       LEFT JOIN students s ON pe.admission_no = s.admission_no
       WHERE pe.school_id = :schoolId
       AND (pe.branch_id = :branchId OR :branchId IS NULL)
       AND (pe.created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))
       AND pe.journal_entry_id IS NULL
       AND (pe.cr > 0 OR pe.dr > 0)
       ORDER BY pe.created_at DESC`,
      {
        replacements: {
          schoolId: school_id,
          branchId: branch_id || null,
          startDate: start_date || null,
          endDate: end_date || null
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Get journal entries without payment entries (for STUDENT_PAYMENT type)
    const [unmatchedJournals] = await db.sequelize.query(
      `SELECT 
         je.entry_id, 
         je.entry_number,
         je.total_amount, 
         je.description, 
         je.created_at,
         je.school_id,
         je.branch_id,
         je.reference_id
       FROM journal_entries je
       LEFT JOIN payment_entries pe ON je.entry_id = pe.journal_entry_id
       WHERE je.school_id = :schoolId
       AND (je.branch_id = :branchId OR :branchId IS NULL)
       AND (je.created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))
       AND je.reference_type = 'STUDENT_PAYMENT'
       AND pe.item_id IS NULL
       ORDER BY je.created_at DESC`,
      {
        replacements: {
          schoolId: school_id,
          branchId: branch_id || null,
          startDate: start_date || null,
          endDate: end_date || null
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Find discrepancies in amounts
    const [discrepancies] = await db.sequelize.query(
      `SELECT 
         pe.item_id as payment_entry_id,
         je.entry_id as journal_entry_id,
         pe.description,
         pe.cr as payment_amount,
         je.total_amount as journal_amount,
         ABS(pe.cr - je.total_amount) as amount_difference,
         s.student_name,
         s.class_name
       FROM payment_entries pe
       JOIN journal_entries je ON pe.journal_entry_id = je.entry_id
       LEFT JOIN students s ON pe.admission_no = s.admission_no
       WHERE pe.school_id = :schoolId
       AND (pe.branch_id = :branchId OR :branchId IS NULL)
       AND ABS(pe.cr - je.total_amount) > 0.01
       AND (pe.created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))
       ORDER BY pe.created_at DESC`,
      {
        replacements: {
          schoolId: school_id,
          branchId: branch_id || null,
          startDate: start_date || null,
          endDate: end_date || null
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Calculate summary statistics
    const [totalPaymentEntries] = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM payment_entries 
       WHERE school_id = :schoolId
       AND (branch_id = :branchId OR :branchId IS NULL)
       AND (created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))`,
      {
        replacements: {
          schoolId: school_id,
          branchId: branch_id || null,
          startDate: start_date || null,
          endDate: end_date || null
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const [totalJournalEntries] = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM journal_entries 
       WHERE school_id = :schoolId
       AND (branch_id = :branchId OR :branchId IS NULL)
       AND reference_type = 'STUDENT_PAYMENT'
       AND (created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))`,
      {
        replacements: {
          schoolId: school_id,
          branchId: branch_id || null,
          startDate: start_date || null,
          endDate: end_date || null
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const summary = {
      total_payment_entries: totalPaymentEntries[0]?.count || 0,
      total_journal_entries: totalJournalEntries[0]?.count || 0,
      total_unmatched_payments: unmatchedPayments.length,
      total_unmatched_journals: unmatchedJournals.length,
      total_discrepancies: discrepancies.length,
      total_matched: (totalPaymentEntries[0]?.count || 0) - unmatchedPayments.length,
      payment_journal_match_rate: (totalPaymentEntries[0]?.count || 0) > 0 
        ? (((totalPaymentEntries[0]?.count || 0) - unmatchedPayments.length) / (totalPaymentEntries[0]?.count || 0)) * 100 
        : 0
    };

    res.status(200).json({
      success: true,
      message: 'Financial reconciliation completed',
      data: {
        summary,
        unmatched_payments: unmatchedPayments,
        unmatched_journals: unmatchedJournals,
        discrepancies: discrepancies
      }
    });
  } catch (error) {
    console.error('Error in reconcileFinancialEntries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reconcile financial entries',
      error: error.message
    });
  }
};

/**
 * Auto-create missing journal entries for payment entries
 */
const autoCreateMissingJournalEntries = async (req, res) => {
  try {
    const { school_id, branch_id, limit = 100 } = req.body;
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Find payment entries without journal entries
    const [unmatchedPayments] = await db.sequelize.query(
      `SELECT item_id, cr, dr, description, school_id, branch_id, created_at, admission_no
       FROM payment_entries
       WHERE school_id = :schoolId
       AND (branch_id = :branchId OR :branchId IS NULL)
       AND journal_entry_id IS NULL
       AND (cr > 0 OR dr > 0)
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY created_at DESC
       LIMIT :limit`,
      {
        replacements: {
          schoolId: school_id,
          branchId: branch_id || null,
          limit: parseInt(limit) || 100
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    let created = 0;
    let failed = 0;
    const errors = [];

    // Create journal entries for each unmatched payment
    for (const payment of unmatchedPayments) {
      try {
        await db.sequelize.query(
          `CALL convert_payment_to_journal(:payment_entry_id, :created_by)`,
          {
            replacements: {
              payment_entry_id: payment.item_id,
              created_by: req.user?.user_id || 'SYSTEM_AUTO_RECONCILE'
            }
          }
        );
        created++;
      } catch (error) {
        console.error(`Failed to create journal entry for payment ${payment.item_id}:`, error);
        errors.push({
          payment_entry_id: payment.item_id,
          error: error.message
        });
        failed++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${unmatchedPayments.length} payment entries`,
      data: {
        created,
        failed,
        total_processed: unmatchedPayments.length,
        errors
      }
    });
  } catch (error) {
    console.error('Error in autoCreateMissingJournalEntries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-create missing journal entries',
      error: error.message
    });
  }
};

/**
 * Generate detailed reconciliation report
 */
const generateReconciliationReport = async (req, res) => {
  try {
    const { school_id, branch_id, start_date, end_date } = req.query;
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Get summary statistics
    const [summaryStats] = await db.sequelize.query(
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
          schoolId: school_id,
          branchId: branch_id || null,
          startDate: start_date || null,
          endDate: end_date || null
        },
        type: db.sequelize.QueryTypes.SELECT
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
          schoolId: school_id,
          branchId: branch_id || null,
          startDate: start_date || null,
          endDate: end_date || null
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.status(200).json({
      success: true,
      message: 'Reconciliation report generated',
      data: {
        summary: summaryStats[0],
        auditTrail,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error in generateReconciliationReport:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reconciliation report',
      error: error.message
    });
  }
};

/**
 * Get audit trail
 */
const getAuditTrail = async (req, res) => {
  try {
    const { school_id, branch_id, table_name, record_id, start_date, end_date, limit = 100 } = req.query;
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const [auditTrail] = await db.sequelize.query(
      `SELECT *
       FROM financial_audit_trail
       WHERE school_id = :schoolId
       AND (branch_id = :branchId OR :branchId IS NULL)
       AND (table_name = :tableName OR :tableName IS NULL)
       AND (record_id = :recordId OR :recordId IS NULL)
       AND (created_at BETWEEN :startDate AND :endDate OR (:startDate IS NULL AND :endDate IS NULL))
       ORDER BY created_at DESC
       LIMIT :limit`,
      {
        replacements: {
          schoolId: school_id,
          branchId: branch_id || null,
          tableName: table_name || null,
          recordId: record_id || null,
          startDate: start_date || null,
          endDate: end_date || null,
          limit: parseInt(limit) || 100
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.status(200).json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    console.error('Error in getAuditTrail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit trail',
      error: error.message
    });
  }
};

module.exports = {
  reconcileFinancialEntries,
  autoCreateMissingJournalEntries,
  generateReconciliationReport,
  getAuditTrail
};