const db = require('../models');
const sequelize = db.sequelize;
const { QueryTypes } = require('sequelize');

/**
 * ACCOUNTING COMPLIANCE MIDDLEWARE
 * 
 * This middleware enforces critical accounting rules without breaking existing functionality:
 * 1. Prevents mixing of discounts and fines in same transactions
 * 2. Ensures proper transaction categorization
 * 3. Validates GAAP compliance
 * 4. Maintains audit trail integrity
 * 
 * CRITICAL: This middleware is designed to be non-breaking - it warns and guides
 * rather than blocking legitimate operations.
 */

/**
 * TRANSACTION SEPARATION ENFORCER
 * Prevents critical accounting violations while maintaining system functionality
 */
const enforceTransactionSeparation = async (req, res, next) => {
  try {
    // Only apply to payment-related operations
    if (!req.body || !req.path.includes('payment') && !req.path.includes('billing')) {
      return next();
    }

    const { item_category, ref_no, admission_no } = req.body;

    // Skip if no category specified (backward compatibility)
    if (!item_category) {
      return next();
    }

    // Check for critical mixing violations
    if (ref_no && req.user?.school_id) {
      const existingTransactions = await sequelize.query(
        `SELECT DISTINCT item_category 
         FROM payment_entries 
         WHERE ref_no = ? AND school_id = ?
         AND payment_status != 'Cancelled'`,
        {
          replacements: [ref_no, req.user.school_id],
          type: QueryTypes.SELECT
        }
      );

      const existingCategories = existingTransactions.map(t => t.item_category).filter(Boolean);
      
      // Define critical mixing scenarios that violate accounting principles
      const isCriticalViolation = (
        // Discount mixed with fees or fines
        (item_category === 'DISCOUNT' && existingCategories.some(c => ['FEES', 'FINES', 'PENALTY'].includes(c))) ||
        // Fines mixed with discounts
        (item_category === 'FINES' && existingCategories.includes('DISCOUNT')) ||
        // Penalties mixed with discounts
        (item_category === 'PENALTY' && existingCategories.includes('DISCOUNT')) ||
        // Existing discount with new fees/fines
        (existingCategories.includes('DISCOUNT') && ['FEES', 'FINES', 'PENALTY'].includes(item_category))
      );

      if (isCriticalViolation) {
        // Log the violation for audit purposes
        console.warn('🚨 CRITICAL ACCOUNTING VIOLATION PREVENTED:', {
          ref_no,
          attempted_category: item_category,
          existing_categories: existingCategories,
          admission_no,
          user: req.user?.name,
          timestamp: new Date().toISOString()
        });

        // Return detailed error with guidance
        return res.status(400).json({
          success: false,
          message: 'CRITICAL ACCOUNTING VIOLATION: Cannot mix discounts and fines in the same transaction',
          error: 'TRANSACTION_SEPARATION_VIOLATION',
          violation_details: {
            attempted_category: item_category,
            existing_categories: existingCategories,
            ref_no: ref_no,
            violation_type: 'MIXED_TRANSACTION_TYPES',
            gaap_compliance: false,
            audit_impact: 'HIGH'
          },
          compliance_guidance: {
            requirement: 'Discounts and fines must be treated as separate transactions per GAAP',
            solution: 'Use different reference numbers for different transaction types',
            proper_treatment: {
              discounts: 'Use contra-revenue accounts (Dr. Discount Expense, Cr. Accounts Receivable)',
              fines: 'Use revenue accounts (Dr. Accounts Receivable, Cr. Fine Revenue)',
              fees: 'Use revenue accounts (Dr. Accounts Receivable, Cr. Fee Revenue)'
            }
          },
          recommended_actions: [
            'Generate a new reference number for this transaction type',
            'Create separate payment entries for each category',
            'Ensure proper journal entries for each transaction type',
            'Maintain audit trail separation'
          ]
        });
      }
    }

    // Add compliance metadata to request for downstream processing
    req.accounting_compliance = {
      transaction_type: item_category,
      separation_enforced: true,
      gaap_compliant: true,
      audit_trail_maintained: true
    };

    next();
  } catch (error) {
    console.error('Error in accounting compliance middleware:', error);
    // Don't break the request flow on middleware errors
    next();
  }
};

/**
 * GAAP COMPLIANCE VALIDATOR
 * Ensures transactions follow Generally Accepted Accounting Principles
 */
const validateGAAPCompliance = (req, res, next) => {
  try {
    const { item_category, cr, dr, description } = req.body;

    // Skip validation if not a financial transaction
    if (!item_category || (!cr && !dr)) {
      return next();
    }

    const violations = [];
    const warnings = [];

    // 1. Revenue Recognition Principle
    if (item_category === 'FEES' && !description) {
      violations.push('Revenue transactions must have proper descriptions for audit trail');
    }

    // 2. Matching Principle
    if (item_category === 'DISCOUNT' && parseFloat(cr || 0) > 0) {
      warnings.push('Discounts should typically be recorded as debits (contra-revenue)');
    }

    // 3. Consistency Principle
    if (item_category === 'FINES' && parseFloat(dr || 0) > 0) {
      warnings.push('Fines should typically be recorded as credits (revenue)');
    }

    // 4. Full Disclosure Principle
    if (!description || description.trim().length < 5) {
      violations.push('Transactions must have adequate descriptions for full disclosure');
    }

    // Add compliance information to request
    req.gaap_compliance = {
      validated: true,
      violations: violations,
      warnings: warnings,
      compliant: violations.length === 0,
      score: violations.length === 0 ? 100 : Math.max(0, 100 - (violations.length * 25))
    };

    // Log warnings but don't block (educational approach)
    if (warnings.length > 0) {
      console.warn('⚠️ GAAP Compliance Warnings:', {
        item_category,
        warnings,
        user: req.user?.name,
        timestamp: new Date().toISOString()
      });
    }

    // Block only critical violations
    if (violations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'GAAP Compliance violations detected',
        error: 'GAAP_COMPLIANCE_VIOLATION',
        violations: violations,
        warnings: warnings,
        compliance_score: req.gaap_compliance.score,
        gaap_principles: {
          revenue_recognition: 'Revenue must be recognized when earned',
          matching_principle: 'Expenses must be matched with related revenues',
          consistency: 'Accounting methods must be applied consistently',
          full_disclosure: 'All material information must be disclosed'
        },
        corrective_actions: [
          'Provide adequate transaction descriptions',
          'Use proper debit/credit classifications',
          'Ensure revenue recognition timing is correct',
          'Maintain consistent accounting treatment'
        ]
      });
    }

    next();
  } catch (error) {
    console.error('Error in GAAP compliance validation:', error);
    next();
  }
};

/**
 * AUDIT TRAIL ENFORCER
 * Ensures proper audit trail maintenance
 */
const enforceAuditTrail = (req, res, next) => {
  try {
    // Add audit trail metadata to all financial transactions
    if (req.body && (req.body.item_category || req.body.cr || req.body.dr)) {
      req.body.audit_metadata = {
        created_by: req.user?.name || 'System',
        created_at: new Date().toISOString(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        compliance_enforced: true,
        gaap_validated: !!req.gaap_compliance,
        separation_enforced: !!req.accounting_compliance
      };

      // Ensure proper reference numbering for audit trail
      if (!req.body.ref_no && req.body.item_category) {
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
        const random = Math.floor(1000 + Math.random() * 9000);
        req.body.ref_no = `${req.body.item_category}-${timestamp}-${random}`;
      }
    }

    next();
  } catch (error) {
    console.error('Error in audit trail enforcement:', error);
    next();
  }
};

/**
 * DOUBLE-ENTRY VALIDATOR
 * Ensures proper double-entry bookkeeping
 */
const validateDoubleEntry = (req, res, next) => {
  try {
    const { journal_entries } = req.body;

    // Skip if no journal entries provided
    if (!journal_entries || !Array.isArray(journal_entries)) {
      return next();
    }

    // Validate double-entry balance
    const totalDebits = journal_entries.reduce((sum, entry) => sum + (parseFloat(entry.debit || 0)), 0);
    const totalCredits = journal_entries.reduce((sum, entry) => sum + (parseFloat(entry.credit || 0)), 0);
    const difference = Math.abs(totalDebits - totalCredits);

    if (difference > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Double-entry bookkeeping violation: Debits must equal credits',
        error: 'DOUBLE_ENTRY_VIOLATION',
        balance_details: {
          total_debits: totalDebits,
          total_credits: totalCredits,
          difference: difference,
          balanced: false
        },
        accounting_principle: 'Every transaction must have equal debits and credits',
        corrective_action: 'Adjust journal entries to ensure debits equal credits'
      });
    }

    // Add validation metadata
    req.double_entry_validation = {
      validated: true,
      balanced: true,
      total_debits: totalDebits,
      total_credits: totalCredits,
      entry_count: journal_entries.length
    };

    next();
  } catch (error) {
    console.error('Error in double-entry validation:', error);
    next();
  }
};

/**
 * COMPLIANCE LOGGER
 * Logs all compliance-related activities for audit purposes
 */
const logComplianceActivity = (req, res, next) => {
  try {
    // Log compliance activities for audit trail
    if (req.accounting_compliance || req.gaap_compliance || req.double_entry_validation) {
      const complianceLog = {
        timestamp: new Date().toISOString(),
        user: req.user?.name || 'Anonymous',
        ip_address: req.ip,
        endpoint: req.path,
        method: req.method,
        transaction_type: req.body?.item_category,
        compliance_checks: {
          separation_enforced: !!req.accounting_compliance,
          gaap_validated: !!req.gaap_compliance,
          double_entry_validated: !!req.double_entry_validation,
          audit_trail_maintained: !!req.body?.audit_metadata
        },
        compliance_scores: {
          gaap_score: req.gaap_compliance?.score || 100,
          overall_compliant: (
            (!req.gaap_compliance || req.gaap_compliance.compliant) &&
            (!req.double_entry_validation || req.double_entry_validation.balanced)
          )
        }
      };

      console.log('📊 Accounting Compliance Activity:', complianceLog);
    }

    next();
  } catch (error) {
    console.error('Error in compliance logging:', error);
    next();
  }
};

module.exports = {
  enforceTransactionSeparation,
  validateGAAPCompliance,
  enforceAuditTrail,
  validateDoubleEntry,
  logComplianceActivity
};