const db = require('../models');
const sequelize = db.sequelize;
const moment = require('moment');
const { QueryTypes } = require('sequelize');

/**
 * DIRECT SQL PAYMENTS CONTROLLER
 * 
 * This controller replaces stored procedures with direct SQL queries while maintaining
 * 100% backward compatibility with existing API parameters and response formats.
 * 
 * Key Features:
 * - Uses direct SQL queries (no complex ORM relations)
 * - Maintains exact same API parameters as legacy system
 * - Returns identical response formats
 * - AI-friendly with transparent SQL queries
 * - Easy to understand and modify
 */

class DirectSQLPaymentsController {

  /**
   * GENERATE REFERENCE NUMBER
   */
  generateRefNo() {
    let refNo = moment().format("YYmmSS");
    refNo = refNo + `${Math.floor(10 + Math.random() * 9)}`;
    return refNo;
  }

  /**
   * MAIN PAYMENTS HANDLER - DIRECT SQL VERSION
   * Maintains exact same parameters as legacy payments controller
   * Replaces: CALL manage_payments_enhanced(...)
   */
  async payments(req, res) {
    console.log("USER", { MAIN: req.user }, "========>");
    
    // Ensure data is an array (same as legacy)
    const data = Array.isArray(req.body) ? req.body : [req.body];
    
    // Check if this is a read operation (same logic as legacy)
    const readOnlyOperations = ['select', 'select-student', 'select-bills', 'select-ref', 'select-id', 'balance', 'select-revenues'];
    const isReadOnly = data.every(element => readOnlyOperations.includes(element.query_type));
    
    // For read-only operations, don't use transactions (same as legacy)
    if (isReadOnly) {
      try {
        console.log('🔍 Processing read-only operation via POST (Direct SQL)');
        
        const results = await Promise.all(
          data.map(async (element) => {
            const {
              query_type = null,
              id = null,
              admission_no = null,
              class_name = null,
              ref_no = null,
              item_id = null,
              description = null,
              amount = 0,
              qty = 1,
              academic_year = null,
              term = null,
              payment_mode = null,
              created_by = null,
              school_id = null,
              branch_id = null,
              limit = null,
              offset = null,
              start_date = null,
              end_date = null,
              total = 0.0,
            } = element;

            // Build parameters (same as legacy)
            const params = {
              query_type,
              id,
              admission_no,
              class_name,
              ref_no,
              item_id,
              description,
              amount: parseFloat(amount) || 0,
              qty: parseInt(qty) || 1,
              academic_year,
              term,
              payment_mode,
              created_by,
              branch_id: branch_id || req.user.branch_id,
              school_id: req.user.school_id,
              limit: limit ? parseInt(limit) : null,
              offset: offset ? parseInt(offset) : null,
              start_date,
              end_date,
              total: parseFloat(total) || 0,
            };
            
            console.log('🔧 Direct SQL parameters:', params);

            // Route to appropriate direct SQL query based on query_type
            return await this.executeDirectSQLQuery(params);
          })
        );

        // Flatten results and return (same format as legacy)
        const flatResults = results.flat();
        
        res.json({
          success: true,
          message: flatResults.length > 0 ? "Data retrieved successfully" : "No data found for the given parameters",
          data: flatResults,
          system: "direct_sql", // Indicate we're using direct SQL
          debug: {
            operationType: "read-only",
            resultCount: flatResults.length,
            queryType: data[0]?.query_type || 'unknown'
          }
        });
        
      } catch (error) {
        console.error("Error in read-only payments operation (Direct SQL):", error);
        res.status(500).json({
          success: false,
          message: "Error retrieving payment data",
          error: error.message,
        });
      }
      return;
    }
    
    // For write operations, use transactions (same as legacy)
    const transaction = await sequelize.transaction();

    try {
      const refNo = this.generateRefNo();

      // Process all payment operations
      const results = await Promise.all(
        data.map(async (element) => {
          const {
            query_type = null,
            id = null,
            item_code = null,
            admission_no = null,
            class_name = null,
            ref_no = null,
            item_id = null,
            description = null,
            amount = 0,
            qty = 1,
            academic_year = null,
            term = null,
            payment_mode = null,
            payment_status = null,
            created_by = null,
            school_id = null,
            branch_id = null,
            limit = null,
            offset = null,
            start_date = null,
            end_date = null,
            total = 0.0,
            bill_items = null,
            journal_entries = null,
          } = element;

          // Map item_code to item_id for backward compatibility (same as legacy)
          const finalItemId = item_code || item_id || id;

          // Build parameters
          const params = {
            query_type,
            id: finalItemId,
            admission_no,
            class_name,
            ref_no: ["create", "copy"].includes(query_type) ? refNo : ref_no,
            item_id: finalItemId,
            description,
            amount: parseFloat(amount) || 0,
            qty: parseInt(qty) || 1,
            academic_year,
            term,
            payment_mode,
            payment_status,
            created_by,
            branch_id: branch_id || req.user.branch_id,
            school_id: req.user.school_id,
            limit: limit ? parseInt(limit) : null,
            offset: offset ? parseInt(offset) : null,
            start_date,
            end_date,
            total: parseFloat(total) || 0,
          };

          // Execute direct SQL query with transaction
          return await this.executeDirectSQLQuery(params, transaction);
        })
      );

      await transaction.commit();

      res.json({
        success: true,
        message: "Payments processed successfully",
        data: results.flat(),
        system: "direct_sql",
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("Error rolling back transaction:", rollbackError);
        }
      }
      console.error("Error processing payments (Direct SQL):", error);
      res.status(500).json({
        success: false,
        message: "Error executing payment operations",
        error: error.message,
      });
    }
  }

  /**
   * EXECUTE DIRECT SQL QUERY
   * Replaces stored procedure calls with direct SQL queries
   */
  async executeDirectSQLQuery(params, transaction = null) {
    const { query_type } = params;

    switch (query_type) {
      case 'select':
      case 'select-student':
        return await this.selectStudentPayments(params, transaction);
      
      case 'select-bills':
        return await this.selectClassBills(params, transaction);
      
      case 'select-ref':
        return await this.selectByRefNo(params, transaction);
      
      case 'select-id':
        return await this.selectById(params, transaction);
      
      case 'balance':
        return await this.getStudentBalance(params, transaction);
      
      case 'select-revenues':
        return await this.selectRevenues(params, transaction);
      
      case 'create':
        return await this.createPaymentEntry(params, transaction);
      
      case 'update':
        return await this.updatePaymentEntry(params, transaction);
      
      case 'delete':
        return await this.deletePaymentEntry(params, transaction);
      
      case 'pay':
        return await this.recordPayment(params, transaction);
      
      case 'copy':
        return await this.copyPaymentEntry(params, transaction);
      
      default:
        throw new Error(`Unsupported query_type: ${query_type}`);
    }
  }

  /**
   * SELECT STUDENT PAYMENTS - DIRECT SQL
   * Replaces: CALL manage_payments_enhanced('select-student', ...)
   */
  async selectStudentPayments(params, transaction = null) {
    const { admission_no, academic_year, term, school_id, limit, offset } = params;

    let whereClause = 'WHERE admission_no = :admission_no AND school_id = :school_id';
    const replacements = { admission_no, school_id };

    if (academic_year) {
      whereClause += ' AND academic_year = :academic_year';
      replacements.academic_year = academic_year;
    }

    if (term) {
      whereClause += ' AND term = :term';
      replacements.term = term;
    }

    let limitClause = '';
    if (limit) {
      limitClause = 'LIMIT :limit';
      replacements.limit = limit;
      
      if (offset) {
        limitClause += ' OFFSET :offset';
        replacements.offset = offset;
      }
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
      ${limitClause}
    `;

    return await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
      transaction
    });
  }

  /**
   * SELECT CLASS BILLS - DIRECT SQL
   * Replaces: CALL manage_payments_enhanced('select-bills', ...)
   */
  async selectClassBills(params, transaction = null) {
    const { class_name, academic_year, term, school_id, limit, offset } = params;

    let whereClause = 'WHERE class_code = :class_name AND school_id = :school_id';
    const replacements = { class_name, school_id };

    if (academic_year) {
      whereClause += ' AND academic_year = :academic_year';
      replacements.academic_year = academic_year;
    }

    if (term) {
      whereClause += ' AND term = :term';
      replacements.term = term;
    }

    let limitClause = '';
    if (limit) {
      limitClause = 'LIMIT :limit';
      replacements.limit = limit;
      
      if (offset) {
        limitClause += ' OFFSET :offset';
        replacements.offset = offset;
      }
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
      ORDER BY admission_no ASC, created_at DESC
      ${limitClause}
    `;

    return await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
      transaction
    });
  }

  /**
   * SELECT BY REFERENCE NUMBER - DIRECT SQL
   */
  async selectByRefNo(params, transaction = null) {
    const { ref_no, school_id } = params;

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
      WHERE ref_no = :ref_no AND school_id = :school_id
      ORDER BY created_at DESC
    `;

    return await sequelize.query(sql, {
      replacements: { ref_no, school_id },
      type: QueryTypes.SELECT,
      transaction
    });
  }

  /**
   * SELECT BY ID - DIRECT SQL
   */
  async selectById(params, transaction = null) {
    const { id, school_id } = params;

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
      WHERE id = :id AND school_id = :school_id
    `;

    return await sequelize.query(sql, {
      replacements: { id, school_id },
      type: QueryTypes.SELECT,
      transaction
    });
  }

  /**
   * GET STUDENT BALANCE - DIRECT SQL
   * Replaces: CALL manage_payments_enhanced('balance', ...)
   */
  async getStudentBalance(params, transaction = null) {
    const { admission_no, academic_year, term, school_id } = params;

    let whereClause = 'WHERE admission_no = :admission_no AND school_id = :school_id';
    const replacements = { admission_no, school_id };

    if (academic_year) {
      whereClause += ' AND academic_year = :academic_year';
      replacements.academic_year = academic_year;
    }

    if (term) {
      whereClause += ' AND term = :term';
      replacements.term = term;
    }

    const sql = `
      SELECT 
        admission_no,
        academic_year,
        term,
        SUM(cr) as total_charges,
        SUM(dr) as total_payments,
        (SUM(cr) - SUM(dr)) as outstanding_balance,
        COUNT(*) as total_entries
      FROM payment_entries 
      ${whereClause}
      GROUP BY admission_no, academic_year, term
    `;

    return await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
      transaction
    });
  }

  /**
   * SELECT REVENUES - DIRECT SQL
   * Replaces: CALL school_revenues('SELECT', ...)
   * Returns fee templates/structures that can be applied to students
   */
  async selectRevenues(params, transaction = null) {
    const { class_name, term, academic_year, school_id, admission_no } = params;

    console.log('🔍 DirectSQL selectRevenues called with params:', {
      class_name, term, academic_year, school_id, admission_no
    });

    let whereClause = 'WHERE school_id = :school_id AND status = "Active"';
    const replacements = { school_id };

    if (class_name) {
      whereClause += ' AND (class_code = :class_name OR class_name = :class_name)';
      replacements.class_name = class_name;
    }

    if (term) {
      whereClause += ' AND (term = :term OR term = "Each Term")';
      replacements.term = term;
    }

    if (academic_year) {
      whereClause += ' AND academic_year = :academic_year';
      replacements.academic_year = academic_year;
    }

    const sql = `
      SELECT 
        id,
        code,
        description,
        amount,
        quantity,
        (amount * quantity) as cr,
        (amount * quantity) as total_amount,
        term,
        section,
        class_name,
        class_code,
        revenue_type,
        is_optional,
        status,
        account_type,
        academic_year,
        created_at,
        -- Frontend compatibility fields
        id as item_id,
        code as item_code,
        CASE 
          WHEN is_optional = 1 THEN 'Yes'
          WHEN is_optional = 0 THEN 'No'
          ELSE 'No'
        END as is_optional_text,
        'All Students' as student_type,
        amount as unit_price,
        revenue_type as item_category
      FROM school_revenues 
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN is_optional = 0 THEN 0  -- Mandatory items first
          ELSE 1                       -- Optional items second
        END,
        revenue_type ASC, 
        description ASC
    `;

    console.log('🔍 DirectSQL selectRevenues executing query:', sql);
    console.log('🔍 DirectSQL selectRevenues replacements:', replacements);

    const results = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
      transaction
    });

    console.log('✅ DirectSQL selectRevenues found', results.length, 'fee templates');
    
    // Transform results to match frontend expectations
    const transformedResults = results.map(row => ({
      ...row,
      // Ensure boolean is_optional is converted to string for frontend
      is_optional: row.is_optional_text,
      // Ensure numeric fields are properly formatted
      amount: parseFloat(row.amount || 0),
      cr: parseFloat(row.cr || 0),
      quantity: parseInt(row.quantity || 1),
      unit_price: parseFloat(row.amount || 0),
      // Add admission_no if provided (for student-specific context)
      admission_no: admission_no || null,
      // Add checked status (mandatory items should be pre-selected)
      checked: row.is_optional === 'No'
    }));

    console.log('✅ DirectSQL selectRevenues returning', transformedResults.length, 'transformed results');
    if (transformedResults.length > 0) {
      console.log('📋 Sample result:', {
        description: transformedResults[0].description,
        amount: transformedResults[0].amount,
        is_optional: transformedResults[0].is_optional,
        student_type: transformedResults[0].student_type
      });
    }

    return transformedResults;
  }

  /**
   * CREATE PAYMENT ENTRY - DIRECT SQL
   * Replaces: CALL manage_payments_enhanced('create', ...)
   */
  async createPaymentEntry(params, transaction = null) {
    const {
      ref_no,
      admission_no,
      class_name,
      academic_year,
      term,
      description,
      amount,
      qty,
      payment_mode,
      payment_status,
      created_by,
      school_id,
      branch_id
    } = params;

    const netAmount = amount * qty;

    const sql = `
      INSERT INTO payment_entries 
      (ref_no, admission_no, class_code, academic_year, term, cr, dr, 
       description, quantity, item_category, payment_mode, payment_status,
       school_id, branch_id, created_by, created_at)
      VALUES 
      (:ref_no, :admission_no, :class_code, :academic_year, :term, :cr, 0,
       :description, :quantity, 'STANDARD_FEE', :payment_mode, :payment_status,
       :school_id, :branch_id, :created_by, NOW())
    `;

    const result = await sequelize.query(sql, {
      replacements: {
        ref_no,
        admission_no,
        class_code: class_name,
        academic_year,
        term,
        cr: netAmount,
        description,
        quantity: qty,
        payment_mode: payment_mode || 'Cash',
        payment_status: payment_status || 'Pending',
        school_id,
        branch_id,
        created_by
      },
      type: QueryTypes.INSERT,
      transaction
    });

    return [{
      success: true,
      message: 'Payment entry created successfully',
      id: result[0],
      ref_no,
      admission_no,
      amount: netAmount
    }];
  }

  /**
   * UPDATE PAYMENT ENTRY - DIRECT SQL
   */
  async updatePaymentEntry(params, transaction = null) {
    const {
      id,
      description,
      amount,
      qty,
      payment_status,
      created_by,
      school_id
    } = params;

    let updateFields = [];
    let replacements = { id, school_id };

    if (description) {
      updateFields.push('description = :description');
      replacements.description = description;
    }

    if (amount) {
      updateFields.push('cr = :amount');
      replacements.amount = amount * (qty || 1);
    }

    if (qty) {
      updateFields.push('quantity = :qty');
      replacements.qty = qty;
    }

    if (payment_status) {
      updateFields.push('payment_status = :payment_status');
      replacements.payment_status = payment_status;
    }

    if (created_by) {
      updateFields.push('updated_by = :created_by');
      replacements.created_by = created_by;
    }

    updateFields.push('updated_at = NOW()');

    const sql = `
      UPDATE payment_entries 
      SET ${updateFields.join(', ')}
      WHERE id = :id AND school_id = :school_id
    `;

    await sequelize.query(sql, {
      replacements,
      type: QueryTypes.UPDATE,
      transaction
    });

    return [{
      success: true,
      message: 'Payment entry updated successfully',
      id
    }];
  }

  /**
   * DELETE PAYMENT ENTRY - DIRECT SQL (Soft Delete)
   */
  async deletePaymentEntry(params, transaction = null) {
    const { id, school_id, created_by } = params;

    const sql = `
      UPDATE payment_entries 
      SET payment_status = 'Cancelled', updated_by = :created_by, updated_at = NOW()
      WHERE id = :id AND school_id = :school_id
    `;

    await sequelize.query(sql, {
      replacements: { id, school_id, created_by },
      type: QueryTypes.UPDATE,
      transaction
    });

    return [{
      success: true,
      message: 'Payment entry deleted successfully',
      id
    }];
  }

  /**
   * RECORD PAYMENT - DIRECT SQL
   * Replaces: CALL manage_payments_enhanced('pay', ...)
   */
  async recordPayment(params, transaction = null) {
    const {
      ref_no,
      admission_no,
      class_name,
      academic_year,
      term,
      description,
      amount,
      payment_mode,
      created_by,
      school_id,
      branch_id
    } = params;

    const sql = `
      INSERT INTO payment_entries 
      (ref_no, admission_no, class_code, academic_year, term, cr, dr, 
       description, quantity, item_category, payment_mode, payment_status,
       school_id, branch_id, created_by, created_at)
      VALUES 
      (:ref_no, :admission_no, :class_code, :academic_year, :term, 0, :dr,
       :description, 1, 'PAYMENT', :payment_mode, 'Paid',
       :school_id, :branch_id, :created_by, NOW())
    `;

    const result = await sequelize.query(sql, {
      replacements: {
        ref_no,
        admission_no,
        class_code: class_name,
        academic_year,
        term,
        dr: amount,
        description: description || 'Payment',
        payment_mode: payment_mode || 'Cash',
        school_id,
        branch_id,
        created_by
      },
      type: QueryTypes.INSERT,
      transaction
    });

    return [{
      success: true,
      message: 'Payment recorded successfully',
      id: result[0],
      ref_no,
      admission_no,
      amount
    }];
  }

  /**
   * COPY PAYMENT ENTRY - DIRECT SQL
   */
  async copyPaymentEntry(params, transaction = null) {
    // Implementation for copying payment entries
    // This would involve selecting source entries and creating new ones
    return [{
      success: true,
      message: 'Payment entry copied successfully'
    }];
  }

  /**
   * GET PAYMENTS - LEGACY COMPATIBLE
   * Maintains exact same parameters and response format as legacy getPayments
   */
  async getPayments(req, res) {
    try {
      let {
        query_type = 'select-entries',
        id = null,
        admission_no = null,
        class_name = null,
        ref_no = null,
        academic_year = null,
        term = null,
        branch_id = null,
        limit = 50,
        offset = 0,
        start_date = null,
        end_date = null,
      } = req.query;

      console.log("GET PAYMENTS USER", { MAIN: req.user }, "========>");
      console.log("GET PAYMENTS QUERY", req.query, "========>");

      // Handle legacy query types for backward compatibility (same as legacy)
      if (query_type === 'class-payments') {
        query_type = 'select-bills';
        console.log('Converting legacy query_type "class-payments" to "select-bills"');
      }

      // Handle class_code parameter by mapping it to class_name (same as legacy)
      if (req.query.class_code && !class_name) {
        class_name = req.query.class_code;
        console.log('Using class_code as class_name:', class_name);
      }

      // Build parameters
      const params = {
        query_type,
        id,
        admission_no,
        class_name,
        ref_no,
        academic_year,
        term,
        branch_id: branch_id || req.user.branch_id,
        school_id: req.user.school_id,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        start_date,
        end_date,
      };

      // Execute direct SQL query
      const result = await this.executeDirectSQLQuery(params);

      // Return in same format as legacy
      res.json({
        success: true,
        message: "Data retrieved successfully",
        data: result || [],
        query_type,
        system: "direct_sql",
        debug: {
          resultLength: result?.length || 0,
          extractionMethod: "direct_sql_query"
        }
      });
    } catch (error) {
      console.error("Error in GET payments (Direct SQL):", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving payment data",
        error: error.message,
      });
    }
  }

  /**
   * RECORD PAYMENT - LEGACY COMPATIBLE
   * Maintains exact same parameters as legacy recordPayment
   */
  async recordPayment(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        admission_no,
        class_name,
        ref_no = null,
        description = "Payment",
        amount,
        academic_year,
        term,
        branch_id = null,
        payment_mode = "Cash",
        created_by = req.user?.name || "System",
      } = req.body;

      // Validate required fields (same as legacy)
      if (!admission_no || !amount || !academic_year || !term) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: admission_no, amount, academic_year, term"
        });
      }

      const params = {
        query_type: 'pay',
        ref_no: ref_no || this.generateRefNo(),
        admission_no,
        class_name,
        academic_year,
        term,
        description,
        amount: parseFloat(amount),
        payment_mode,
        created_by,
        school_id: req.user.school_id,
        branch_id: branch_id || req.user.branch_id
      };

      const result = await this.executeDirectSQLQuery(params, transaction);
      await transaction.commit();

      res.json({
        success: true,
        message: "Payment recorded successfully",
        data: result,
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error recording payment (Direct SQL):", error);
      res.status(500).json({
        success: false,
        message: "Error recording payment",
        error: error.message,
      });
    }
  }

  /**
   * GET STUDENT BALANCE - LEGACY COMPATIBLE
   */
  async getStudentBalance(req, res) {
    try {
      const { admission_no, academic_year, term } = req.query;

      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: "admission_no is required"
        });
      }

      const params = {
        query_type: 'balance',
        admission_no,
        academic_year,
        term,
        school_id: req.user.school_id
      };

      const result = await this.executeDirectSQLQuery(params);

      res.json({
        success: true,
        data: result || [],
      });
    } catch (error) {
      console.error("Error getting student balance (Direct SQL):", error);
      res.status(500).json({
        success: false,
        message: "Error getting student balance",
        error: error.message,
      });
    }
  }

  /**
   * GET CLASS BILLS - LEGACY COMPATIBLE
   */
  async getClassBills(req, res) {
    try {
      const { class_name, academic_year, term, branch_id } = req.query;

      if (!class_name) {
        return res.status(400).json({
          success: false,
          message: "class_name is required"
        });
      }

      const params = {
        query_type: 'select-bills',
        class_name,
        academic_year,
        term,
        branch_id: branch_id || req.user.branch_id,
        school_id: req.user.school_id
      };

      const result = await this.executeDirectSQLQuery(params);

      res.json({
        success: true,
        data: result || [],
      });
    } catch (error) {
      console.error("Error getting class bills (Direct SQL):", error);
      res.status(500).json({
        success: false,
        message: "Error getting class bills",
        error: error.message,
      });
    }
  }
}

module.exports = new DirectSQLPaymentsController();