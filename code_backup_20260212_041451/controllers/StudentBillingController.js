const db = require('../models');
const sequelize = db.sequelize;
const { QueryTypes } = require('sequelize');

/**
 * STUDENT BILLING CONTROLLER
 * 
 * Provides aggregated student billing data for the BillClasses component
 * Returns student-level summaries instead of individual invoice line items
 */

class StudentBillingController {

  /**
   * GET AGGREGATED CLASS BILLS
   * Returns student-level aggregated billing data that matches the frontend table structure
   * 
   * Expected response format:
   * {
   *   admission_no: string,
   *   student_name: string,
   *   class_name: string,
   *   invoice_count: number,
   *   total_invoice: number,
   *   discount: number,
   *   fines: number
   * }
   */
  async getAggregatedClassBills(req, res) {
    try {
      const { 
        class_code, 
        class_name, 
        academic_year, 
        term, 
        branch_id,
        limit = 100,
        offset = 0 
      } = req.query;

      console.log('🔍 StudentBillingController: Getting aggregated class bills', {
        class_code,
        class_name,
        academic_year,
        term,
        branch_id: branch_id || req.user.branch_id,
        school_id: req.user.school_id
      });

      // Use class_code as primary identifier, fallback to class_name
      const classIdentifier = class_code || class_name;
      
      if (!classIdentifier) {
        return res.status(400).json({
          success: false,
          message: "class_code or class_name is required"
        });
      }

      let whereClause = 'WHERE pe.class_code = :class_identifier AND pe.school_id = :school_id';
      const replacements = { 
        class_identifier: classIdentifier, 
        school_id: req.user.school_id 
      };

      if (academic_year) {
        whereClause += ' AND pe.academic_year = :academic_year';
        replacements.academic_year = academic_year;
      }

      if (term) {
        whereClause += ' AND pe.term = :term';
        replacements.term = term;
      }

      if (branch_id || req.user.branch_id) {
        whereClause += ' AND pe.branch_id = :branch_id';
        replacements.branch_id = branch_id || req.user.branch_id;
      }

      let limitClause = '';
      if (limit) {
        limitClause = 'LIMIT :limit';
        replacements.limit = parseInt(limit);
        
        if (offset) {
          limitClause += ' OFFSET :offset';
          replacements.offset = parseInt(offset);
        }
      }

      // ✅ AGGREGATED QUERY: Returns student-level data that matches frontend table structure
      const sql = `
        SELECT 
          pe.admission_no,
          COALESCE(s.student_name, CONCAT('Student ', pe.admission_no)) as student_name,
          COALESCE(s.class_name, pe.class_code) as class_name,
          COUNT(CASE WHEN pe.payment_status != 'Excluded' AND pe.cr > 0 THEN 1 END) as invoice_count,
          ROUND(SUM(CASE WHEN pe.payment_status != 'Excluded' THEN pe.cr * pe.quantity ELSE 0 END), 2) as total_invoice,
          ROUND(SUM(CASE WHEN pe.payment_status != 'Excluded' THEN pe.dr ELSE 0 END), 2) as total_payments,
          ROUND((SUM(CASE WHEN pe.payment_status != 'Excluded' THEN pe.cr * pe.quantity ELSE 0 END) - 
                 SUM(CASE WHEN pe.payment_status != 'Excluded' THEN pe.dr ELSE 0 END)), 2) as outstanding_balance,
          MAX(pe.created_at) as last_updated,
          0 as discount,
          0 as fines
        FROM payment_entries pe
        LEFT JOIN students s ON pe.admission_no = s.admission_no AND s.school_id = pe.school_id
        ${whereClause}
        GROUP BY pe.admission_no, s.student_name, s.class_name, pe.class_code
        HAVING invoice_count > 0
        ORDER BY pe.admission_no ASC
        ${limitClause}
      `;

      console.log('🔍 Executing SQL:', sql);
      console.log('🔍 With replacements:', replacements);

      const result = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT
      });

      console.log('✅ Query result:', {
        count: result.length,
        sampleData: result.slice(0, 2)
      });

      res.json({
        success: true,
        message: "Aggregated student billing data retrieved successfully",
        data: result || [],
        query_type: "select-bills-aggregated",
        system: "student_billing_controller",
        debug: {
          resultLength: result?.length || 0,
          extractionMethod: "aggregated_sql_query",
          classIdentifier,
          parameters: {
            class_code,
            class_name,
            academic_year,
            term,
            branch_id: branch_id || req.user.branch_id
          }
        }
      });

    } catch (error) {
      console.error("❌ Error in getAggregatedClassBills:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving aggregated student billing data",
        error: error.message,
      });
    }
  }

  /**
   * GET DETAILED STUDENT BILLS
   * Returns individual invoice line items for a specific student (for Preview functionality)
   */
  async getDetailedStudentBills(req, res) {
    try {
      const { 
        admission_no,
        academic_year, 
        term, 
        branch_id 
      } = req.query;

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: "admission_no is required"
        });
      }

      let whereClause = 'WHERE admission_no = :admission_no AND school_id = :school_id';
      const replacements = { 
        admission_no, 
        school_id: req.user.school_id 
      };

      if (academic_year) {
        whereClause += ' AND academic_year = :academic_year';
        replacements.academic_year = academic_year;
      }

      if (term) {
        whereClause += ' AND term = :term';
        replacements.term = term;
      }

      if (branch_id || req.user.branch_id) {
        whereClause += ' AND branch_id = :branch_id';
        replacements.branch_id = branch_id || req.user.branch_id;
      }

      const sql = `
        SELECT 
          id,
          ref_no,
          admission_no,
          class_code,
          academic_year,
          term,
          cr,
          dr,
          (cr - dr) as balance,
          description,
          quantity,
          item_category,
          payment_mode,
          payment_status,
          created_at,
          created_by
        FROM payment_entries 
        ${whereClause} 
        ORDER BY created_at DESC
      `;

      const result = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        message: "Detailed student billing data retrieved successfully",
        data: result || [],
        query_type: "select-student-bills-detailed",
        system: "student_billing_controller"
      });

    } catch (error) {
      console.error("❌ Error in getDetailedStudentBills:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving detailed student billing data",
        error: error.message,
      });
    }
  }

  /**
   * GET CLASS BILLING SUMMARY
   * Returns summary statistics for a class
   */
  async getClassBillingSummary(req, res) {
    try {
      const { 
        class_code, 
        class_name, 
        academic_year, 
        term, 
        branch_id 
      } = req.query;

      const classIdentifier = class_code || class_name;
      
      if (!classIdentifier) {
        return res.status(400).json({
          success: false,
          message: "class_code or class_name is required"
        });
      }

      let whereClause = 'WHERE class_code = :class_identifier AND school_id = :school_id';
      const replacements = { 
        class_identifier: classIdentifier, 
        school_id: req.user.school_id 
      };

      if (academic_year) {
        whereClause += ' AND academic_year = :academic_year';
        replacements.academic_year = academic_year;
      }

      if (term) {
        whereClause += ' AND term = :term';
        replacements.term = term;
      }

      if (branch_id || req.user.branch_id) {
        whereClause += ' AND branch_id = :branch_id';
        replacements.branch_id = branch_id || req.user.branch_id;
      }

      const sql = `
        SELECT 
          COUNT(DISTINCT admission_no) as total_students,
          COUNT(DISTINCT CASE WHEN payment_status != 'Excluded' AND cr > 0 THEN admission_no END) as billed_students,
          COUNT(DISTINCT CASE WHEN payment_status != 'Excluded' AND dr > 0 THEN admission_no END) as students_with_payments,
          ROUND(SUM(CASE WHEN payment_status != 'Excluded' THEN cr * quantity ELSE 0 END), 2) as total_billed_amount,
          ROUND(SUM(CASE WHEN payment_status != 'Excluded' THEN dr ELSE 0 END), 2) as total_payments_received,
          ROUND((SUM(CASE WHEN payment_status != 'Excluded' THEN cr * quantity ELSE 0 END) - 
                 SUM(CASE WHEN payment_status != 'Excluded' THEN dr ELSE 0 END)), 2) as total_outstanding
        FROM payment_entries 
        ${whereClause}
      `;

      const result = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT
      });

      const summary = result[0] || {
        total_students: 0,
        billed_students: 0,
        students_with_payments: 0,
        total_billed_amount: 0,
        total_payments_received: 0,
        total_outstanding: 0
      };

      res.json({
        success: true,
        message: "Class billing summary retrieved successfully",
        data: summary,
        query_type: "class-billing-summary",
        system: "student_billing_controller"
      });

    } catch (error) {
      console.error("❌ Error in getClassBillingSummary:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving class billing summary",
        error: error.message,
      });
    }
  }
}

module.exports = new StudentBillingController();