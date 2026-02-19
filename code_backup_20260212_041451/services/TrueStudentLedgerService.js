const db = require('../config/database');

class TrueStudentLedgerService {
  static async getCompleteStudentLedger(admissionNo, schoolId, branchId) {
    try {
      const query = `
        SELECT 
          created_at as transaction_date,
          CASE 
            WHEN cr > 0 THEN 'DEBIT'
            WHEN dr > 0 THEN 'CREDIT'
          END as transaction_type,
          CASE 
            WHEN cr > 0 THEN cr
            WHEN dr > 0 THEN dr
            ELSE 0
          END as amount,
          CONCAT(COALESCE(item_category, 'Fee'), ': ', description) as description,
          term,
          academic_year,
          'payment_entry' as source_type,
          item_id as reference_id,
          payment_status
        FROM payment_entries 
        WHERE admission_no = ? AND school_id = ? AND branch_id = ?
        AND payment_status NOT IN ('Excluded', 'Cancelled')
        AND (dr > 0 OR cr > 0)
        ORDER BY created_at ASC, item_id ASC
      `;

      const [results] = await db.execute(query, [
        admissionNo, schoolId, branchId
      ]);

      // Calculate running balance (DEBIT increases balance, CREDIT/SETTLEMENT decreases)
      let runningBalance = 0;
      const ledgerWithBalance = results.map(transaction => {
        if (transaction.transaction_type === 'DEBIT') {
          runningBalance += parseFloat(transaction.amount);
        } else {
          runningBalance -= parseFloat(transaction.amount);
        }
        return {
          ...transaction,
          running_balance: runningBalance.toFixed(2)
        };
      });

      return {
        success: true,
        data: ledgerWithBalance,
        summary: {
          total_debits: results.filter(t => t.transaction_type === 'DEBIT').reduce((sum, t) => sum + parseFloat(t.amount), 0),
          total_credits: results.filter(t => t.transaction_type === 'CREDIT').reduce((sum, t) => sum + parseFloat(t.amount), 0),
          current_balance: runningBalance.toFixed(2)
        }
      };

    } catch (error) {
      console.error('Error fetching complete student ledger:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getStudentFinancialSummary(admissionNo, schoolId, branchId) {
    try {
      const query = `
        SELECT 
          s.admission_no,
          s.student_name,
          s.credit_balance,
          COALESCE(pe_summary.total_charges, 0) as total_invoiced,
          COALESCE(pe_summary.total_payments, 0) as total_paid,
          COALESCE(pe_summary.total_charges, 0) - COALESCE(pe_summary.total_payments, 0) as outstanding_balance,
          COALESCE(pe_summary.avg_days_outstanding, 0) as days_outstanding,
          CASE 
            WHEN COALESCE(pe_summary.unpaid_count, 0) = 0 THEN 1
            WHEN COALESCE(pe_summary.avg_days_outstanding, 0) <= 30 THEN 1
            ELSE 0
          END as gaap_compliant,
          CASE 
            WHEN (COALESCE(pe_summary.total_charges, 0) - COALESCE(pe_summary.total_payments, 0)) < 0 
            THEN ABS(COALESCE(pe_summary.total_charges, 0) - COALESCE(pe_summary.total_payments, 0))
            ELSE 0
          END as available_credit
        FROM students s
        LEFT JOIN (
          SELECT 
            admission_no,
            SUM(CASE 
              WHEN payment_status NOT IN ('Excluded', 'Cancelled') AND cr > 0 THEN cr 
              ELSE 0 
            END) as total_charges,
            SUM(CASE 
              WHEN payment_status NOT IN ('Excluded', 'Cancelled') AND dr > 0 THEN dr 
              ELSE 0 
            END) as total_payments,
            COUNT(CASE 
              WHEN payment_status = 'Billed' AND cr > dr THEN 1 
            END) as unpaid_count,
            AVG(CASE 
              WHEN payment_status = 'Billed' AND days_outstanding > 0 THEN days_outstanding 
              ELSE 0 
            END) as avg_days_outstanding
          FROM payment_entries 
          WHERE school_id = ? AND branch_id = ?
          GROUP BY admission_no
        ) pe_summary ON s.admission_no = pe_summary.admission_no
        WHERE s.admission_no = ? AND s.school_id = ? AND s.branch_id = ?
      `;

      const [results] = await db.execute(query, [schoolId, branchId, admissionNo, schoolId, branchId]);
      
      return {
        success: true,
        data: results[0] || null
      };

    } catch (error) {
      console.error('Error fetching student financial summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = TrueStudentLedgerService;
