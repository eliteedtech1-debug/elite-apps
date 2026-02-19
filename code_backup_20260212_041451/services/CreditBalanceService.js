const db = require('../models');
const { StudentLedger } = db;

class CreditBalanceService {
  /**
   * Add credit to student balance
   * @param {Object} params - Credit parameters
   * @param {string} params.student_id - Student ID
   * @param {string} params.admission_no - Admission number
   * @param {string} params.school_id - School ID
   * @param {string} params.branch_id - Branch ID
   * @param {number} params.amount - Credit amount
   * @param {string} params.description - Transaction description
   * @param {string} params.term - Academic term
   * @param {string} params.academic_year - Academic year
   * @param {string} params.reference_id - Reference ID (optional)
   */
  static async addCredit(params) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const {
        student_id,
        admission_no,
        school_id,
        branch_id,
        amount,
        description,
        term,
        academic_year,
        reference_id
      } = params;

      // Add to student ledger
      await StudentLedger.create({
        student_id,
        admission_no,
        school_id,
        branch_id,
        transaction_type: 'credit',
        amount: Math.abs(amount), // Ensure positive
        description: description || 'Credit balance added',
        term,
        academic_year,
        reference_id
      }, { transaction });

      // Update student credit balance
      await db.sequelize.query(
        `UPDATE students 
         SET credit_balance = credit_balance + :amount 
         WHERE admission_no = :admission_no 
         AND school_id = :school_id 
         AND branch_id = :branch_id`,
        {
          replacements: { amount: Math.abs(amount), admission_no, school_id, branch_id },
          transaction
        }
      );

      await transaction.commit();
      
      return {
        success: true,
        message: 'Credit added successfully',
        amount: Math.abs(amount)
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Use credit balance for bill settlement
   * @param {Object} params - Settlement parameters
   */
  static async useCredit(params) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const {
        student_id,
        admission_no,
        school_id,
        branch_id,
        amount,
        description,
        term,
        academic_year,
        reference_id
      } = params;

      // Check available credit balance
      const [student] = await db.sequelize.query(
        `SELECT credit_balance FROM students 
         WHERE admission_no = :admission_no 
         AND school_id = :school_id 
         AND branch_id = :branch_id`,
        {
          replacements: { admission_no, school_id, branch_id },
          transaction
        }
      );

      if (!student[0] || student[0].credit_balance < amount) {
        throw new Error('Insufficient credit balance');
      }

      // Add debit entry to ledger
      await StudentLedger.create({
        student_id,
        admission_no,
        school_id,
        branch_id,
        transaction_type: 'settlement',
        amount: Math.abs(amount),
        description: description || 'Credit used for bill settlement',
        term,
        academic_year,
        reference_id
      }, { transaction });

      // Update student credit balance
      await db.sequelize.query(
        `UPDATE students 
         SET credit_balance = credit_balance - :amount 
         WHERE admission_no = :admission_no 
         AND school_id = :school_id 
         AND branch_id = :branch_id`,
        {
          replacements: { amount: Math.abs(amount), admission_no, school_id, branch_id },
          transaction
        }
      );

      await transaction.commit();
      
      return {
        success: true,
        message: 'Credit used successfully',
        amount: Math.abs(amount),
        remaining_balance: student[0].credit_balance - Math.abs(amount)
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get student credit balance and ledger
   */
  static async getStudentCreditInfo(admission_no, school_id, branch_id) {
    try {
      // Get current balance from students table
      const [student] = await db.sequelize.query(
        `SELECT credit_balance FROM students 
         WHERE admission_no = :admission_no 
         AND school_id = :school_id`,
        {
          replacements: { admission_no, school_id }
        }
      );

      if (!student || !student[0]) {
        return {
          success: false,
          credit_balance: 0,
          ledger_history: []
        };
      }

      return {
        success: true,
        credit_balance: student[0].credit_balance || 0,
        ledger_history: []
      };
    } catch (error) {
      console.error('Error getting student credit info:', error);
      return {
        success: false,
        credit_balance: 0,
        ledger_history: [],
        error: error.message
      };
    }
  }

  /**
   * Calculate net invoice amount with scholarships and credit balance
   * Global Best Practice: Apply all credits at invoice generation
   */
  static async calculateNetInvoiceAmount(params) {
    try {
      const {
        student_id,
        admission_no,
        school_id,
        branch_id,
        base_amount,
        term,
        academic_year
      } = params;

      // Get student scholarship and credit info
      const [studentInfo] = await db.sequelize.query(
        `SELECT 
           scholarship_percentage,
           scholarship_type,
           scholarship_start_date,
           scholarship_end_date,
           credit_balance
         FROM students 
         WHERE admission_no = :admission_no 
         AND school_id = :school_id 
         AND branch_id = :branch_id`,
        {
          replacements: { admission_no, school_id, branch_id }
        }
      );

      if (!studentInfo[0]) {
        throw new Error('Student not found');
      }

      const student = studentInfo[0];
      let netAmount = parseFloat(base_amount);
      let scholarshipDiscount = 0;
      let creditApplied = 0;

      // Apply scholarship discount (if active and not 'None')
      const scholarshipPercentage = parseFloat(student.scholarship_percentage || 0);
      const isScholarshipActive = this.isScholarshipActive(student);
      const hasValidScholarship = student.scholarship_type !== 'None' && student.scholarship_type !== null;
      
      if (scholarshipPercentage > 0 && isScholarshipActive && hasValidScholarship) {
        scholarshipDiscount = (netAmount * scholarshipPercentage) / 100;
        netAmount -= scholarshipDiscount;
      }

      // Apply available credit balance
      const availableCredit = parseFloat(student.credit_balance || 0);
      if (availableCredit > 0 && netAmount > 0) {
        creditApplied = Math.min(availableCredit, netAmount);
        netAmount -= creditApplied;
      }

      return {
        success: true,
        base_amount: parseFloat(base_amount),
        scholarship_discount: scholarshipDiscount,
        scholarship_percentage: hasValidScholarship ? scholarshipPercentage : 0,
        scholarship_type: hasValidScholarship ? student.scholarship_type : null,
        credit_applied: creditApplied,
        available_credit: availableCredit,
        net_amount: Math.max(0, netAmount),
        invoice_breakdown: {
          base_amount: parseFloat(base_amount),
          scholarship_discount: -scholarshipDiscount,
          credit_applied: -creditApplied,
          net_due: Math.max(0, netAmount)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if scholarship is currently active
   */
  static isScholarshipActive(student) {
    if (!student.scholarship_start_date) return true; // No date restrictions
    
    const now = new Date();
    const startDate = new Date(student.scholarship_start_date);
    const endDate = student.scholarship_end_date ? new Date(student.scholarship_end_date) : null;
    
    if (now < startDate) return false; // Not started yet
    if (endDate && now > endDate) return false; // Expired
    
    return true;
  }

  /**
   * Process invoice with credit application (Global Best Practice)
   */
  static async processInvoiceWithCredits(invoiceData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const {
        student_id,
        admission_no,
        school_id,
        branch_id,
        base_amount,
        term,
        academic_year,
        invoice_id
      } = invoiceData;

      // Calculate net invoice amount
      const calculation = await this.calculateNetInvoiceAmount({
        student_id,
        admission_no,
        school_id,
        base_amount,
        term,
        academic_year
      });

      // If credit was applied, record the usage
      if (calculation.credit_applied > 0) {
        await this.useCredit({
          student_id,
          admission_no,
          school_id,
          branch_id,
          amount: calculation.credit_applied,
          description: `Credit applied to invoice ${term} ${academic_year}`,
          term,
          academic_year,
          reference_id: invoice_id
        });
      }

      await transaction.commit();
      
      return {
        success: true,
        ...calculation,
        credit_used: calculation.credit_applied,
        remaining_credit: calculation.available_credit - calculation.credit_applied
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Auto-settle bill using available credit (Legacy method - kept for backward compatibility)
   */
  static async autoSettleBill(billData) {
    try {
      const {
        student_id,
        admission_no,
        school_id,
        branch_id,
        bill_amount,
        term,
        academic_year,
        bill_id
      } = billData;

      // Get student credit balance
      const creditInfo = await this.getStudentCreditInfo(admission_no, school_id, branch_id);
      const availableCredit = parseFloat(creditInfo.credit_balance);
      
      if (availableCredit <= 0) {
        return {
          success: false,
          message: 'No credit balance available',
          settlement_amount: 0,
          remaining_bill: bill_amount
        };
      }

      // Calculate settlement amount
      const settlementAmount = Math.min(availableCredit, bill_amount);
      const remainingBill = bill_amount - settlementAmount;

      if (settlementAmount > 0) {
        // Use credit for settlement
        await this.useCredit({
          student_id,
          admission_no,
          school_id,
          branch_id,
          amount: settlementAmount,
          description: `Auto-settlement for ${term} ${academic_year}`,
          term,
          academic_year,
          reference_id: bill_id
        });
      }

      return {
        success: true,
        settlement_amount: settlementAmount,
        remaining_bill: remainingBill,
        remaining_credit: availableCredit - settlementAmount
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CreditBalanceService;
