const db = require('../models');
const sequelize = db.sequelize;
const moment = require('moment');
const { QueryTypes } = require('sequelize');

/**
 * ACCOUNTING COMPLIANCE CONTROLLER
 * 
 * This controller enforces critical accounting rule compliance:
 * 1. Proper separation of discounts and fines
 * 2. GAAP compliance enforcement
 * 3. Double-entry bookkeeping validation
 * 4. Audit trail maintenance
 * 5. Financial reporting accuracy
 * 
 * CRITICAL: This controller ensures no mixing of transaction types
 * and maintains proper accounting standards without breaking existing code.
 */

class AccountingComplianceController {

  /**
   * VALIDATE TRANSACTION SEPARATION
   * Ensures discounts and fines are treated as separate transactions
   */
  async validateTransactionSeparation(req, res) {
    try {
      const {
        admission_no,
        academic_year,
        term,
        transaction_type // FEES, DISCOUNT, FINES, PENALTY, REFUND
      } = req.query;

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: 'admission_no is required for transaction validation'
        });
      }

      // Check for mixed transaction types in same records (VIOLATION)
      const mixedTransactions = await sequelize.query(
        `SELECT 
          pe.item_id,
          pe.ref_no,
          pe.description,
          pe.item_category,
          pe.cr,
          pe.dr,
          pe.created_at,
          CASE 
            WHEN pe.item_category IN ('DISCOUNT', 'FINES', 'PENALTY') 
            AND EXISTS (
              SELECT 1 FROM payment_entries pe2 
              WHERE pe2.ref_no = pe.ref_no 
              AND pe2.item_category != pe.item_category
              AND pe2.item_category IN ('FEES', 'ITEMS', 'DISCOUNT', 'FINES', 'PENALTY')
            ) THEN 'VIOLATION'
            ELSE 'COMPLIANT'
          END as compliance_status
        FROM payment_entries pe
        WHERE pe.admission_no = ?
        ${academic_year ? 'AND pe.academic_year = ?' : ''}
        ${term ? 'AND pe.term = ?' : ''}
        ${transaction_type ? 'AND pe.item_category = ?' : ''}
        AND pe.school_id = ?
        ORDER BY pe.created_at DESC`,
        {
          replacements: [
            admission_no,
            ...(academic_year ? [academic_year] : []),
            ...(term ? [term] : []),
            ...(transaction_type ? [transaction_type] : []),
            req.user.school_id
          ],
          type: QueryTypes.SELECT
        }
      );

      // Identify violations
      const violations = mixedTransactions.filter(t => t.compliance_status === 'VIOLATION');
      const compliantTransactions = mixedTransactions.filter(t => t.compliance_status === 'COMPLIANT');

      // Calculate compliance metrics
      const complianceMetrics = {
        total_transactions: mixedTransactions.length,
        compliant_transactions: compliantTransactions.length,
        violation_transactions: violations.length,
        compliance_percentage: mixedTransactions.length > 0 
          ? Math.round((compliantTransactions.length / mixedTransactions.length) * 100) 
          : 100,
        gaap_compliant: violations.length === 0,
        separation_enforced: violations.length === 0
      };

      res.json({
        success: true,
        message: `Transaction separation validation completed for ${admission_no}`,
        data: {
          compliance_status: violations.length === 0 ? 'COMPLIANT' : 'VIOLATIONS_FOUND',
          metrics: complianceMetrics,
          violations: violations.map(v => ({
            item_id: v.item_id,
            ref_no: v.ref_no,
            description: v.description,
            item_category: v.item_category,
            amount: parseFloat(v.cr || 0) - parseFloat(v.dr || 0),
            violation_type: 'MIXED_TRANSACTION_TYPES',
            created_at: v.created_at
          })),
          compliant_transactions: compliantTransactions.length,
          recommendations: violations.length > 0 ? [
            'Separate mixed transaction types into individual records',
            'Create proper journal entries for each transaction type',
            'Ensure discounts use contra-revenue accounts',
            'Ensure fines use separate revenue accounts'
          ] : []
        }
      });

    } catch (error) {
      console.error('Error validating transaction separation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate transaction separation',
        error: error.message
      });
    }
  }

  /**
   * FIX ACCOUNTING VIOLATIONS
   * Automatically fixes critical accounting rule violations
   */
  async fixAccountingViolations(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        admission_no,
        academic_year,
        term,
        fix_type = 'SEPARATE_TRANSACTIONS', // SEPARATE_TRANSACTIONS, CREATE_JOURNAL_ENTRIES, BOTH
        dry_run = true // Set to false to actually apply fixes
      } = req.body;

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: 'admission_no is required for fixing violations'
        });
      }

      console.log(`🔧 Starting accounting violation fixes for ${admission_no} (dry_run: ${dry_run})`);

      const fixes = [];
      let totalFixed = 0;

      // 1. Fix mixed transaction types
      if (fix_type === 'SEPARATE_TRANSACTIONS' || fix_type === 'BOTH') {
        const mixedTransactions = await sequelize.query(
          `SELECT 
            pe.item_id,
            pe.ref_no,
            pe.admission_no,
            pe.class_code,
            pe.academic_year,
            pe.term,
            pe.cr,
            pe.dr,
            pe.description,
            pe.item_category,
            pe.quantity,
            pe.payment_mode,
            pe.payment_status,
            pe.school_id,
            pe.branch_id,
            pe.created_by
          FROM payment_entries pe
          WHERE pe.admission_no = ?
          AND pe.school_id = ?
          ${academic_year ? 'AND pe.academic_year = ?' : ''}
          ${term ? 'AND pe.term = ?' : ''}
          AND pe.item_category IN ('DISCOUNT', 'FINES', 'PENALTY')
          ORDER BY pe.created_at ASC`,
          {
            replacements: [
              admission_no,
              req.user.school_id,
              ...(academic_year ? [academic_year] : []),
              ...(term ? [term] : [])
            ],
            type: QueryTypes.SELECT,
            transaction
          }
        );

        for (const mixedTx of mixedTransactions) {
          // Create separate transaction for each type
          const newRefNo = await this.generateRefNo(mixedTx.item_category);
          
          if (!dry_run) {
            // Create new separated transaction
            await sequelize.query(
              `INSERT INTO payment_entries (
                ref_no, admission_no, class_code, academic_year, term,
                cr, dr, description, quantity, item_category,
                payment_mode, payment_status, school_id, branch_id, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              {
                replacements: [
                  newRefNo,
                  mixedTx.admission_no,
                  mixedTx.class_code,
                  mixedTx.academic_year,
                  mixedTx.term,
                  mixedTx.cr,
                  mixedTx.dr,
                  `[SEPARATED] ${mixedTx.description}`,
                  mixedTx.quantity,
                  mixedTx.item_category,
                  mixedTx.payment_mode,
                  mixedTx.payment_status,
                  mixedTx.school_id,
                  mixedTx.branch_id,
                  `${mixedTx.created_by || 'System'} - Compliance Fix`
                ],
                type: QueryTypes.INSERT,
                transaction
              }
            );

            // Mark original as separated
            await sequelize.query(
              `UPDATE payment_entries 
               SET description = CONCAT('[ORIGINAL-SEPARATED] ', description),
                   payment_status = 'Separated'
               WHERE item_id = ?`,
              {
                replacements: [mixedTx.item_id],
                type: QueryTypes.UPDATE,
                transaction
              }
            );
          }

          fixes.push({
            type: 'TRANSACTION_SEPARATION',
            original_id: mixedTx.item_id,
            original_ref: mixedTx.ref_no,
            new_ref: newRefNo,
            item_category: mixedTx.item_category,
            amount: parseFloat(mixedTx.cr || 0) - parseFloat(mixedTx.dr || 0),
            description: mixedTx.description,
            status: dry_run ? 'PLANNED' : 'APPLIED'
          });
          totalFixed++;
        }
      }

      // 2. Create proper journal entries
      if (fix_type === 'CREATE_JOURNAL_ENTRIES' || fix_type === 'BOTH') {
        const transactionsNeedingJournals = await sequelize.query(
          `SELECT 
            pe.item_id,
            pe.ref_no,
            pe.admission_no,
            pe.cr,
            pe.dr,
            pe.description,
            pe.item_category
          FROM payment_entries pe
          LEFT JOIN journal_entries je ON pe.ref_no = je.reference_id
          WHERE pe.admission_no = ?
          AND pe.school_id = ?
          AND je.entry_id IS NULL
          AND pe.item_category IN ('DISCOUNT', 'FINES', 'PENALTY', 'FEES', 'ITEMS')
          ${academic_year ? 'AND pe.academic_year = ?' : ''}
          ${term ? 'AND pe.term = ?' : ''}`,
          {
            replacements: [
              admission_no,
              req.user.school_id,
              ...(academic_year ? [academic_year] : []),
              ...(term ? [term] : [])
            ],
            type: QueryTypes.SELECT,
            transaction
          }
        );

        for (const tx of transactionsNeedingJournals) {
          const journalEntries = this.createProperJournalEntries(tx);
          
          if (!dry_run) {
            const journalEntryNumber = `JE-${tx.item_category}-${Date.now()}`;
            
            // Create journal entry header
            await sequelize.query(
              `INSERT INTO journal_entries (
                entry_number, entry_date, reference_type, reference_id, description,
                total_amount, status, school_id, branch_id, created_by
              ) VALUES (?, CURDATE(), ?, ?, ?, ?, 'POSTED', ?, ?, ?)`,
              {
                replacements: [
                  journalEntryNumber,
                  `${tx.item_category}_COMPLIANCE_FIX`,
                  tx.ref_no,
                  `Compliance fix for ${tx.item_category}: ${tx.description}`,
                  Math.abs(parseFloat(tx.cr || 0) - parseFloat(tx.dr || 0)),
                  req.user.school_id,
                  req.user.branch_id,
                  req.user.name || 'Compliance System'
                ],
                type: QueryTypes.INSERT,
                transaction
              }
            );

            // Create journal entry lines
            for (const entry of journalEntries) {
              await sequelize.query(
                `INSERT INTO journal_entry_lines (
                  entry_number, account_code, account_name, account_type,
                  debit_amount, credit_amount, description, line_reference
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                {
                  replacements: [
                    journalEntryNumber,
                    entry.account_code,
                    entry.account_name,
                    entry.account_type,
                    entry.debit || 0,
                    entry.credit || 0,
                    entry.description,
                    tx.ref_no
                  ],
                  type: QueryTypes.INSERT,
                  transaction
                }
              );
            }
          }

          fixes.push({
            type: 'JOURNAL_ENTRY_CREATION',
            transaction_id: tx.item_id,
            ref_no: tx.ref_no,
            item_category: tx.item_category,
            journal_entries: journalEntries.length,
            amount: parseFloat(tx.cr || 0) - parseFloat(tx.dr || 0),
            status: dry_run ? 'PLANNED' : 'APPLIED'
          });
        }
      }

      if (!dry_run) {
        await transaction.commit();
        console.log(`✅ Applied ${totalFixed} accounting compliance fixes for ${admission_no}`);
      } else {
        await transaction.rollback();
        console.log(`📋 Planned ${totalFixed} accounting compliance fixes for ${admission_no} (dry run)`);
      }

      res.json({
        success: true,
        message: dry_run 
          ? `Identified ${totalFixed} accounting violations that can be fixed`
          : `Successfully applied ${totalFixed} accounting compliance fixes`,
        data: {
          admission_no,
          fix_type,
          dry_run,
          total_fixes: totalFixed,
          fixes_applied: fixes,
          compliance_status: totalFixed === 0 ? 'ALREADY_COMPLIANT' : (dry_run ? 'FIXES_PLANNED' : 'FIXES_APPLIED'),
          next_steps: dry_run ? [
            'Review the planned fixes above',
            'Set dry_run=false to apply the fixes',
            'Verify compliance after applying fixes'
          ] : [
            'Verify all transactions are properly separated',
            'Check journal entries are balanced',
            'Run compliance validation again'
          ]
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error fixing accounting violations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix accounting violations',
        error: error.message
      });
    }
  }

  /**
   * ENFORCE TRANSACTION SEPARATION
   * Middleware to prevent mixing of transaction types
   */
  async enforceTransactionSeparation(req, res, next) {
    try {
      // Only apply to payment creation/update endpoints
      if (!req.body || !req.body.item_category) {
        return next();
      }

      const { item_category, ref_no, admission_no } = req.body;

      // Check if this reference number already has different transaction types
      if (ref_no) {
        const existingTransactions = await sequelize.query(
          `SELECT DISTINCT item_category 
           FROM payment_entries 
           WHERE ref_no = ? AND school_id = ?`,
          {
            replacements: [ref_no, req.user.school_id],
            type: QueryTypes.SELECT
          }
        );

        const existingCategories = existingTransactions.map(t => t.item_category);
        
        // Check for mixing violations
        if (existingCategories.length > 0 && !existingCategories.includes(item_category)) {
          const criticalMix = (
            (item_category === 'DISCOUNT' && existingCategories.some(c => ['FEES', 'FINES', 'PENALTY'].includes(c))) ||
            (item_category === 'FINES' && existingCategories.some(c => ['FEES', 'DISCOUNT'].includes(c))) ||
            (item_category === 'PENALTY' && existingCategories.some(c => ['FEES', 'DISCOUNT'].includes(c)))
          );

          if (criticalMix) {
            return res.status(400).json({
              success: false,
              message: 'CRITICAL ACCOUNTING VIOLATION: Cannot mix discounts, fines, and fees in the same transaction',
              error: 'TRANSACTION_SEPARATION_VIOLATION',
              details: {
                attempted_category: item_category,
                existing_categories: existingCategories,
                ref_no: ref_no,
                violation_type: 'MIXED_TRANSACTION_TYPES',
                compliance_requirement: 'Discounts and fines must be treated as separate transactions'
              },
              recommendations: [
                'Use a different reference number for this transaction type',
                'Create separate transactions for each category',
                'Ensure proper accounting treatment for each type'
              ]
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Error in transaction separation enforcement:', error);
      next(); // Don't block the request on enforcement errors
    }
  }

  /**
   * GENERATE COMPLIANCE REPORT
   * Comprehensive accounting compliance report
   */
  async generateComplianceReport(req, res) {
    try {
      const {
        start_date,
        end_date,
        academic_year,
        term,
        class_code
      } = req.query;

      // Overall compliance metrics
      const complianceMetrics = await sequelize.query(
        `SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT admission_no) as total_students,
          COUNT(DISTINCT ref_no) as total_references,
          SUM(CASE WHEN item_category = 'FEES' THEN 1 ELSE 0 END) as fees_transactions,
          SUM(CASE WHEN item_category = 'DISCOUNT' THEN 1 ELSE 0 END) as discount_transactions,
          SUM(CASE WHEN item_category = 'FINES' THEN 1 ELSE 0 END) as fines_transactions,
          SUM(CASE WHEN item_category = 'PENALTY' THEN 1 ELSE 0 END) as penalty_transactions,
          SUM(cr) as total_charges,
          SUM(dr) as total_payments
        FROM payment_entries
        WHERE school_id = ?
        ${start_date && end_date ? 'AND created_at BETWEEN ? AND ?' : ''}
        ${academic_year ? 'AND academic_year = ?' : ''}
        ${term ? 'AND term = ?' : ''}
        ${class_code ? 'AND class_code = ?' : ''}`,
        {
          replacements: [
            req.user.school_id,
            ...(start_date && end_date ? [start_date, end_date] : []),
            ...(academic_year ? [academic_year] : []),
            ...(term ? [term] : []),
            ...(class_code ? [class_code] : [])
          ],
          type: QueryTypes.SELECT
        }
      );

      // Separation compliance check
      const separationViolations = await sequelize.query(
        `SELECT 
          ref_no,
          GROUP_CONCAT(DISTINCT item_category) as mixed_categories,
          COUNT(DISTINCT item_category) as category_count,
          SUM(cr - dr) as total_amount
        FROM payment_entries
        WHERE school_id = ?
        ${start_date && end_date ? 'AND created_at BETWEEN ? AND ?' : ''}
        ${academic_year ? 'AND academic_year = ?' : ''}
        ${term ? 'AND term = ?' : ''}
        GROUP BY ref_no
        HAVING COUNT(DISTINCT item_category) > 1
        AND (
          (FIND_IN_SET('DISCOUNT', GROUP_CONCAT(DISTINCT item_category)) > 0 
           AND (FIND_IN_SET('FEES', GROUP_CONCAT(DISTINCT item_category)) > 0 
                OR FIND_IN_SET('FINES', GROUP_CONCAT(DISTINCT item_category)) > 0))
          OR
          (FIND_IN_SET('FINES', GROUP_CONCAT(DISTINCT item_category)) > 0 
           AND FIND_IN_SET('FEES', GROUP_CONCAT(DISTINCT item_category)) > 0)
        )`,
        {
          replacements: [
            req.user.school_id,
            ...(start_date && end_date ? [start_date, end_date] : []),
            ...(academic_year ? [academic_year] : []),
            ...(term ? [term] : [])
          ],
          type: QueryTypes.SELECT
        }
      );

      // Journal entry compliance
      const journalCompliance = await sequelize.query(
        `SELECT 
          COUNT(pe.item_id) as transactions_without_journals,
          SUM(pe.cr - pe.dr) as amount_without_journals
        FROM payment_entries pe
        LEFT JOIN journal_entries je ON pe.ref_no = je.reference_id
        WHERE pe.school_id = ?
        AND je.entry_id IS NULL
        AND pe.item_category IN ('DISCOUNT', 'FINES', 'PENALTY', 'FEES')
        ${start_date && end_date ? 'AND pe.created_at BETWEEN ? AND ?' : ''}`,
        {
          replacements: [
            req.user.school_id,
            ...(start_date && end_date ? [start_date, end_date] : [])
          ],
          type: QueryTypes.SELECT
        }
      );

      const metrics = complianceMetrics[0];
      const violations = separationViolations;
      const journalIssues = journalCompliance[0];

      // Calculate compliance scores
      const separationCompliance = violations.length === 0 ? 100 : 
        Math.max(0, 100 - (violations.length / parseInt(metrics.total_references) * 100));
      
      const journalEntryCompliance = parseInt(journalIssues.transactions_without_journals) === 0 ? 100 :
        Math.max(0, 100 - (parseInt(journalIssues.transactions_without_journals) / parseInt(metrics.total_transactions) * 100));

      const overallCompliance = Math.round((separationCompliance + journalEntryCompliance) / 2);

      res.json({
        success: true,
        message: 'Accounting compliance report generated successfully',
        data: {
          report_period: {
            start_date,
            end_date,
            academic_year,
            term,
            class_code
          },
          overall_compliance: {
            score: overallCompliance,
            status: overallCompliance >= 95 ? 'EXCELLENT' : 
                   overallCompliance >= 85 ? 'GOOD' : 
                   overallCompliance >= 70 ? 'NEEDS_IMPROVEMENT' : 'CRITICAL',
            gaap_compliant: overallCompliance >= 95
          },
          transaction_metrics: {
            total_transactions: parseInt(metrics.total_transactions),
            total_students: parseInt(metrics.total_students),
            total_references: parseInt(metrics.total_references),
            fees_transactions: parseInt(metrics.fees_transactions),
            discount_transactions: parseInt(metrics.discount_transactions),
            fines_transactions: parseInt(metrics.fines_transactions),
            penalty_transactions: parseInt(metrics.penalty_transactions),
            total_charges: parseFloat(metrics.total_charges || 0),
            total_payments: parseFloat(metrics.total_payments || 0)
          },
          separation_compliance: {
            score: Math.round(separationCompliance),
            violations_found: violations.length,
            violations: violations.map(v => ({
              ref_no: v.ref_no,
              mixed_categories: v.mixed_categories,
              category_count: v.category_count,
              total_amount: parseFloat(v.total_amount)
            })),
            status: violations.length === 0 ? 'COMPLIANT' : 'VIOLATIONS_FOUND'
          },
          journal_entry_compliance: {
            score: Math.round(journalEntryCompliance),
            transactions_without_journals: parseInt(journalIssues.transactions_without_journals),
            amount_without_journals: parseFloat(journalIssues.amount_without_journals || 0),
            status: parseInt(journalIssues.transactions_without_journals) === 0 ? 'COMPLIANT' : 'MISSING_JOURNALS'
          },
          recommendations: [
            ...(violations.length > 0 ? ['Fix transaction separation violations immediately'] : []),
            ...(parseInt(journalIssues.transactions_without_journals) > 0 ? ['Create missing journal entries'] : []),
            ...(overallCompliance < 95 ? ['Implement automated compliance checks'] : []),
            'Regular compliance monitoring',
            'Staff training on accounting standards'
          ]
        }
      });

    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate compliance report',
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
   * Create proper journal entries for transaction types
   */
  createProperJournalEntries(transaction) {
    const amount = Math.abs(parseFloat(transaction.cr || 0) - parseFloat(transaction.dr || 0));
    const entries = [];

    switch (transaction.item_category) {
      case 'DISCOUNT':
        entries.push(
          {
            account_code: '4150',
            account_name: 'Student Discounts and Scholarships',
            account_type: 'CONTRA_REVENUE',
            debit: amount,
            credit: 0,
            description: `Discount applied: ${transaction.description}`
          },
          {
            account_code: '1210',
            account_name: 'Accounts Receivable - Students',
            account_type: 'ASSET',
            debit: 0,
            credit: amount,
            description: `Reduction in receivables for discount`
          }
        );
        break;

      case 'FINES':
      case 'PENALTY':
        entries.push(
          {
            account_code: '1210',
            account_name: 'Accounts Receivable - Students',
            account_type: 'ASSET',
            debit: amount,
            credit: 0,
            description: `${transaction.item_category} assessed: ${transaction.description}`
          },
          {
            account_code: '4300',
            account_name: 'Other Revenue - Fines and Penalties',
            account_type: 'REVENUE',
            debit: 0,
            credit: amount,
            description: `Revenue from ${transaction.item_category.toLowerCase()}`
          }
        );
        break;

      case 'FEES':
        entries.push(
          {
            account_code: '1210',
            account_name: 'Accounts Receivable - Students',
            account_type: 'ASSET',
            debit: amount,
            credit: 0,
            description: `Fee charged: ${transaction.description}`
          },
          {
            account_code: '4100',
            account_name: 'Tuition and Fee Revenue',
            account_type: 'REVENUE',
            debit: 0,
            credit: amount,
            description: `Revenue from fees`
          }
        );
        break;

      case 'ITEMS':
        entries.push(
          {
            account_code: '1210',
            account_name: 'Accounts Receivable - Students',
            account_type: 'ASSET',
            debit: amount,
            credit: 0,
            description: `Item sold: ${transaction.description}`
          },
          {
            account_code: '4200',
            account_name: 'Sales Revenue - Educational Materials',
            account_type: 'REVENUE',
            debit: 0,
            credit: amount,
            description: `Revenue from item sales`
          }
        );
        break;
    }

    return entries;
  }
}

module.exports = new AccountingComplianceController();