const { QueryTypes } = require("sequelize");
const db = require("../models");

/**
 * Process Overpayment Across Multiple Terms
 *
 * This controller handles payments that exceed the current term's balance
 * and automatically distributes the excess to subsequent terms in order:
 * First Term -> Second Term -> Third Term
 *
 * @route POST /api/process-overpayment
 * @param {string} admission_no - Student admission number
 * @param {number} amount_paid - Total amount being paid
 * @param {string} payment_method - Payment method (Cash, Bank Transfer, etc.)
 * @param {string} current_term - Starting term (First Term, Second Term, Third Term)
 * @param {string} academic_year - Academic year
 * @param {string} school_id - School ID
 * @param {string} branch_id - Branch ID
 */
const processOverpayment = async (req, res) => {
  const {
    admission_no,
    amount_paid,
    payment_method = "Bank Transfer",
    payment_reference,
    current_term,
    academic_year,
    school_id,
    branch_id,
    parent_id,
    class_code,
  } = req.body;

  // Validation
  if (!admission_no) {
    return res.status(400).json({
      success: false,
      message: "Admission number is required",
    });
  }

  if (!amount_paid || amount_paid <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid payment amount is required",
    });
  }

  if (!current_term || !academic_year) {
    return res.status(400).json({
      success: false,
      message: "Term and academic year are required",
    });
  }

  const transaction = await db.sequelize.transaction();

  try {
    console.log('💰 Processing overpayment for:', {
      admission_no,
      amount_paid,
      current_term,
      academic_year
    });

    // Define term order
    const termOrder = ['First Term', 'Second Term', 'Third Term'];
    const currentTermIndex = termOrder.indexOf(current_term);

    if (currentTermIndex === -1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid term specified",
      });
    }

    let remainingAmount = parseFloat(amount_paid);
    const paymentDistribution = [];
    const processedPayments = [];

    // Process each term starting from current term
    for (let i = currentTermIndex; i < termOrder.length && remainingAmount > 0; i++) {
      const term = termOrder[i];

      console.log(`\n📊 Checking ${term} for balances...`);

      // Get all unpaid invoices for this term
      const invoices = await db.sequelize.query(
        `SELECT
          pe.item_id,
          pe.ref_no,
          pe.description,
          pe.cr,
          pe.dr,
          (pe.cr - pe.dr) AS balance,
          pe.class_code,
          pe.academic_year,
          pe.term
        FROM payment_entries pe
        WHERE pe.admission_no = :admission_no
          AND pe.school_id = :school_id
          AND pe.branch_id = :branch_id
          AND pe.term = :term
          AND pe.academic_year = :academic_year
          AND (pe.cr - pe.dr) > 0
        ORDER BY pe.created_at ASC`,
        {
          replacements: {
            admission_no,
            school_id: school_id || req.user?.school_id,
            branch_id: branch_id || req.user?.branch_id,
            term,
            academic_year,
          },
          type: QueryTypes.SELECT,
          transaction,
        }
      );

      if (invoices.length === 0) {
        console.log(`✓ No outstanding balance for ${term}`);
        continue;
      }

      // Calculate total balance for this term
      const termBalance = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance), 0);
      console.log(`💵 ${term} balance: ₦${termBalance.toLocaleString()}`);

      // Determine how much to apply to this term
      const amountToApply = Math.min(remainingAmount, termBalance);
      let termAmountRemaining = amountToApply;

      console.log(`💳 Applying ₦${amountToApply.toLocaleString()} to ${term}`);

      // Generate unique payment reference for this term's payment
      const paymentRef = payment_reference || `PAY-${Date.now()}-${i}`;
      const refNo = generate10DigitRandom();

      // Apply payment to invoices in order
      for (const invoice of invoices) {
        if (termAmountRemaining <= 0) break;

        const invoiceBalance = parseFloat(invoice.balance);
        const paymentForInvoice = Math.min(termAmountRemaining, invoiceBalance);

        // Update the payment entry with debit (payment)
        await db.sequelize.query(
          `UPDATE payment_entries
          SET dr = dr + :payment_amount,
              payment_mode = :payment_method,
              updated_at = NOW()
          WHERE item_id = :item_id`,
          {
            replacements: {
              payment_amount: paymentForInvoice,
              payment_method,
              item_id: invoice.item_id,
            },
            type: QueryTypes.UPDATE,
            transaction,
          }
        );

        processedPayments.push({
          term,
          item_id: invoice.item_id,
          description: invoice.description,
          invoice_balance: invoiceBalance,
          payment_applied: paymentForInvoice,
          remaining_balance: invoiceBalance - paymentForInvoice,
        });

        termAmountRemaining -= paymentForInvoice;
      }

      // Record payment distribution
      paymentDistribution.push({
        term,
        amount_applied: amountToApply,
        term_balance_before: termBalance,
        term_balance_after: termBalance - amountToApply,
      });

      remainingAmount -= amountToApply;
    }

    // Check if there's still remaining amount (overpayment beyond all terms)
    const excessAmount = remainingAmount;

    if (excessAmount > 0) {
      console.log(`\n💰 Excess payment: ₦${excessAmount.toLocaleString()}`);
      console.log('⚠️ This amount will be credited to student account for future use');

      // Create a credit entry for the excess amount
      await db.sequelize.query(
        `INSERT INTO payment_entries (
          ref_no,
          admission_no,
          class_code,
          academic_year,
          term,
          cr,
          dr,
          description,
          school_id,
          branch_id,
          payment_mode,
          item_category
        ) VALUES (
          :ref_no,
          :admission_no,
          :class_code,
          :academic_year,
          'Third Term',
          0.00,
          :excess_amount,
          'Advance Payment / Overpayment Credit',
          :school_id,
          :branch_id,
          :payment_method,
          'Advance Payment'
        )`,
        {
          replacements: {
            ref_no: `ADV-${Date.now()}`,
            admission_no,
            class_code: class_code || req.body.class_code,
            academic_year,
            excess_amount: excessAmount,
            school_id: school_id || req.user?.school_id,
            branch_id: branch_id || req.user?.branch_id,
            payment_method,
          },
          type: QueryTypes.INSERT,
          transaction,
        }
      );
    }

    // Commit transaction
    await transaction.commit();

    console.log('\n✅ Overpayment processing completed successfully');

    return res.status(200).json({
      success: true,
      message: "Payment processed successfully across multiple terms",
      data: {
        total_paid: parseFloat(amount_paid),
        distribution: paymentDistribution,
        excess_amount: excessAmount,
        processed_payments: processedPayments,
        summary: {
          terms_affected: paymentDistribution.length,
          total_distributed: parseFloat(amount_paid) - excessAmount,
          has_excess: excessAmount > 0,
        },
      },
    });

  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error processing overpayment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process overpayment",
      error: error.message,
    });
  }
};

/**
 * Get Student Balance Across All Terms
 *
 * @route GET /api/student-balance-all-terms
 * @param {string} admission_no - Student admission number
 * @param {string} academic_year - Academic year
 */
const getStudentBalanceAllTerms = async (req, res) => {
  const { admission_no, academic_year, school_id, branch_id } = req.query;

  if (!admission_no || !academic_year) {
    return res.status(400).json({
      success: false,
      message: "Admission number and academic year are required",
    });
  }

  try {
    const termOrder = ['First Term', 'Second Term', 'Third Term'];
    const balances = [];
    let totalBalance = 0;

    for (const term of termOrder) {
      const result = await db.sequelize.query(
        `SELECT
          SUM(pe.cr - pe.dr) AS balance,
          COUNT(*) AS invoice_count
        FROM payment_entries pe
        WHERE pe.admission_no = :admission_no
          AND pe.school_id = :school_id
          AND pe.branch_id = :branch_id
          AND pe.term = :term
          AND pe.academic_year = :academic_year`,
        {
          replacements: {
            admission_no,
            school_id: school_id || req.user?.school_id,
            branch_id: branch_id || req.user?.branch_id,
            term,
            academic_year,
          },
          type: QueryTypes.SELECT,
        }
      );

      const termBalance = parseFloat(result[0]?.balance || 0);
      const invoiceCount = parseInt(result[0]?.invoice_count || 0);

      balances.push({
        term,
        balance: termBalance,
        invoice_count: invoiceCount,
        has_invoice: invoiceCount > 0,
      });

      totalBalance += termBalance;
    }

    return res.status(200).json({
      success: true,
      data: {
        admission_no,
        academic_year,
        terms: balances,
        total_balance: totalBalance,
      },
    });

  } catch (error) {
    console.error("Error fetching student balance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student balance",
      error: error.message,
    });
  }
};

// Helper function to generate random 10-digit number
function generate10DigitRandom() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}



/**
 * Get detailed payment history for a student
 * Shows all payments with breakdown of how each payment was applied
 */
const getStudentPaymentHistory = async (req, res) => {
  const { admission_no, academic_year, term } = req.query;
  const school_id = req.query.school_id || req.user?.school_id;
  const branch_id = req.query.branch_id || req.user?.branch_id;

  if (!admission_no) {
    return res.status(400).json({
      success: false,
      message: "Admission number is required",
    });
  }

  try {
    // Get all payment entries (for item breakdown)
    const allEntries = await db.sequelize.query(
      `SELECT 
        pe.item_id,
        pe.ref_no,
        pe.description,
        pe.cr as invoice_amount,
        pe.dr as paid_amount,
        (pe.cr - pe.dr) as balance,
        pe.payment_mode,
        pe.payment_date,
        pe.payment_status,
        pe.term,
        pe.academic_year,
        pe.item_category,
        pe.created_at,
        pe.updated_at,
        pe.updated_by as received_by
      FROM payment_entries pe
      WHERE pe.admission_no = :admission_no
        AND pe.school_id = :school_id
        AND pe.payment_status NOT IN ('Excluded', 'Cancelled')
        ${branch_id ? 'AND pe.branch_id = :branch_id' : ''}
        ${academic_year ? 'AND pe.academic_year = :academic_year' : ''}
        ${term ? 'AND pe.term = :term' : ''}
      ORDER BY pe.term, pe.created_at`,
      {
        replacements: { admission_no, school_id, branch_id, academic_year, term },
        type: QueryTypes.SELECT,
      }
    );

    // Get payment transactions grouped by term (actual payments made)
    const paymentTransactions = await db.sequelize.query(
      `SELECT 
        pe.term,
        pe.academic_year,
        pe.payment_date,
        pe.payment_mode,
        SUM(pe.cr) as total_invoice,
        SUM(pe.dr) as total_paid,
        SUM(pe.cr) - SUM(pe.dr) as balance,
        MAX(pe.ref_no) as ref_no,
        GROUP_CONCAT(DISTINCT pe.description SEPARATOR ', ') as items_paid,
        COUNT(*) as item_count
      FROM payment_entries pe
      WHERE pe.admission_no = :admission_no
        AND pe.school_id = :school_id
        AND pe.payment_status NOT IN ('Excluded', 'Cancelled')
        AND pe.item_category != 'Advance Payment'
        ${branch_id ? 'AND pe.branch_id = :branch_id' : ''}
        ${academic_year ? 'AND pe.academic_year = :academic_year' : ''}
        ${term ? 'AND pe.term = :term' : ''}
      GROUP BY pe.term, pe.academic_year, pe.payment_date, pe.payment_mode
      ORDER BY pe.academic_year DESC, 
        CASE pe.term WHEN 'First Term' THEN 1 WHEN 'Second Term' THEN 2 WHEN 'Third Term' THEN 3 END`,
      {
        replacements: { admission_no, school_id, branch_id, academic_year, term },
        type: QueryTypes.SELECT,
      }
    );

    let totalInvoice = 0;
    let totalPaid = 0;

    allEntries.forEach(p => {
      if (p.item_category !== 'Advance Payment') {
        totalInvoice += parseFloat(p.invoice_amount) || 0;
        totalPaid += parseFloat(p.paid_amount) || 0;
      }
    });

    // Calculate remaining overpayment
    const remainingAdvance = allEntries
      .filter(p => p.item_category === 'Advance Payment')
      .reduce((sum, p) => sum + Math.max(0, (parseFloat(p.paid_amount) || 0) - (parseFloat(p.invoice_amount) || 0)), 0);

    return res.status(200).json({
      success: true,
      data: {
        admission_no,
        academic_year: academic_year || 'All Years',
        term: term || 'All Terms',
        summary: {
          total_invoice: totalInvoice,
          total_paid: totalPaid,
          total_balance: totalInvoice - totalPaid,
          overpayment: remainingAdvance
        },
        // Payment transactions by term (for receipts)
        payment_transactions: paymentTransactions,
        // All item entries (for detailed breakdown)
        all_transactions: allEntries
      }
    });

  } catch (error) {
    console.error("Error fetching payment history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message,
    });
  }
};

module.exports = {
  processOverpayment,
  getStudentBalanceAllTerms,
  getStudentPaymentHistory,
};
