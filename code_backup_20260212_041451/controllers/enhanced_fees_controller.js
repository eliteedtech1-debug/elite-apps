const mysql = require('mysql2/promise');
const db = require('../models');
const moment = require('moment');

class EnhancedFeesController {

  // Fee Items Management
  async createFeeItem(req, res) {
    try {

      const {
        fee_code,
        fee_name,
        description,
        amount,
        fee_type,
        account_id,
        is_mandatory,
        is_recurring,
        academic_year,
        term,
        class_applicable,
        school_id,
        branch_id,
        created_by
      } = req.body;

      const [result] = await db.sequelize.query(
        `INSERT INTO fee_items (
          fee_code, fee_name, description, amount, fee_type, account_id,
          is_mandatory, is_recurring, academic_year, term, class_applicable,
          school_id, branch_id, created_by, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())`,
        {
          replacements: [
            fee_code, fee_name, description, amount, fee_type, account_id,
            is_mandatory, is_recurring, academic_year, term,
            JSON.stringify(class_applicable), school_id, branch_id, created_by
          ],
          type: db.Sequelize.QueryTypes.INSERT
        }
      );

      res.json({
        success: true,
        message: 'Fee item created successfully',
        data: {
          fee_id: result.insertId,
          fee_code,
          fee_name
        }
      });

    } catch (error) {
      console.error('Error creating fee item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create fee item',
        error: error.message
      });
    }
  }

  async getFeeItems(req, res) {

    try {
      const {
        academic_year,
        term,
        fee_type,
        status,
        branch_id,
        page = 1,
        limit = 100
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
        SELECT fi.*, ca.account_name, ca.account_code
        FROM fee_items fi
        LEFT JOIN chart_of_accounts ca ON fi.account_id = ca.account_id
        WHERE fi.branch_id = ?
      `;
      const params = [branch_id];

      if (academic_year) {
        query += ' AND fi.academic_year = ?';
        params.push(academic_year);
      }

      if (term) {
        query += ' AND fi.term = ?';
        params.push(term);
      }

      if (fee_type) {
        query += ' AND fi.fee_type = ?';
        params.push(fee_type);
      }

      if (status) {
        query += ' AND fi.status = ?';
        params.push(status);
      }

      query += ' ORDER BY fi.created_at DESC';

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      // Get total count for pagination info
      let countQuery = `
        SELECT COUNT(*) as total
        FROM fee_items fi
        WHERE fi.branch_id = ?
      `;
      const countParams = [branch_id];

      if (academic_year) {
        countQuery += ' AND fi.academic_year = ?';
        countParams.push(academic_year);
      }
      if (term) {
        countQuery += ' AND fi.term = ?';
        countParams.push(term);
      }
      if (fee_type) {
        countQuery += ' AND fi.fee_type = ?';
        countParams.push(fee_type);
      }
      if (status) {
        countQuery += ' AND fi.status = ?';
        countParams.push(status);
      }

      const [countResult] = await db.sequelize.query(countQuery, {
        replacements: countParams,
        type: db.Sequelize.QueryTypes.SELECT
      });

      const rows = await db.sequelize.query(query, {
        replacements: params,
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('Error fetching fee items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch fee items',
        error: error.message
      });
    }
  }

  // Fee Structures Management
  async createFeeStructure(req, res) {
    
    try {
      await db.sequelize.beginTransaction();

      const {
        structure_name,
        class_code,
        class_name,
        academic_year,
        term,
        fee_items,
        total_amount,
        school_id,
        branch_id,
        created_by
      } = req.body;

      // Create fee structure
      const [structureResult] = await db.sequelize.query(
        `INSERT INTO fee_structures (
          structure_name, class_code, class_name, academic_year, term,
          total_amount, school_id, branch_id, created_by, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', NOW())`,
        {
          replacements: [
            structure_name, class_code, class_name, academic_year, term,
            total_amount, school_id, branch_id, created_by
          ],
          type: db.Sequelize.QueryTypes.INSERT
        }
      );

      const structureId = structureResult.insertId;

      // Add fee items to structure
      for (const item of fee_items) {
        await db.sequelize.query(
          `INSERT INTO fee_structure_items (
            structure_id, fee_id, fee_code, fee_name, amount, fee_type,
            account_id, is_mandatory, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          {
            replacements: [
              structureId, item.fee_id || null, item.fee_code, item.fee_name,
              item.amount, item.fee_type, item.account_id, item.is_mandatory
            ],
            type: db.Sequelize.QueryTypes.INSERT
          }
        );
      }

      await db.sequelize.commit();

      res.json({
        success: true,
        message: 'Fee structure created successfully',
        data: {
          structure_id: structureId,
          structure_name
        }
      });

    } catch (error) {
      await db.sequelize.rollback();
      console.error('Error creating fee structure:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create fee structure',
        error: error.message
      });
    }
  }

  async getFeeStructures(req, res) {
    
    try {
      const { academic_year, term, branch_id } = req.query;

      let query = `
        SELECT fs.*, 
               COUNT(fsi.item_id) as item_count
        FROM fee_structures fs
        LEFT JOIN fee_structure_items fsi ON fs.structure_id = fsi.structure_id
        WHERE fs.branch_id = ?
      `;
      const params = [branch_id];

      if (academic_year) {
        query += ' AND fs.academic_year = ?';
        params.push(academic_year);
      }

      if (term) {
        query += ' AND fs.term = ?';
        params.push(term);
      }

      query += ' GROUP BY fs.structure_id ORDER BY fs.created_at DESC';

      const structures = await db.sequelize.query(query, {
        replacements: params,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get fee items for each structure
      for (const structure of structures) {
        const items = await db.sequelize.query(
          `SELECT fsi.*, ca.account_name, ca.account_code
           FROM fee_structure_items fsi
           LEFT JOIN chart_of_accounts ca ON fsi.account_id = ca.account_id
           WHERE fsi.structure_id = ?
           ORDER BY fsi.created_at`,
          {
            replacements: [structure.structure_id],
            type: db.Sequelize.QueryTypes.SELECT
          }
        );
        structure.fee_items = items;
      }

      res.json({
        success: true,
        data: structures
      });

    } catch (error) {
      console.error('Error fetching fee structures:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch fee structures',
        error: error.message
      });
    }
  }

  async publishFeeStructure(req, res) {
    
    try {
      await db.sequelize.beginTransaction();

      const { structureId } = req.params;
      const { published_by, school_id } = req.body;

      // Update structure status
      await db.sequelize.query(
        `UPDATE fee_structures 
         SET status = 'PUBLISHED', published_by = ?, published_at = NOW()
         WHERE structure_id = ? AND school_id = ?`,
        {
          replacements: [published_by, structureId, school_id],
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );

      // Get structure details for journal entry
      const structureRows = await db.sequelize.query(
        `SELECT fs.*, fsi.fee_name, fsi.amount, fsi.account_id
         FROM fee_structures fs
         JOIN fee_structure_items fsi ON fs.structure_id = fsi.structure_id
         WHERE fs.structure_id = ?`,
        {
          replacements: [structureId],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      await db.sequelize.commit();

      res.json({
        success: true,
        message: 'Fee structure published successfully',
        data: structureRows[0]
      });

    } catch (error) {
      await db.sequelize.rollback();
      console.error('Error publishing fee structure:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish fee structure',
        error: error.message
      });
    }
  }

  // Student Bills Management
  async getStudentBills(req, res) {
    
    try {
      const {
        academic_year,
        term,
        class_name,
        status,
        search,
        branch_id
      } = req.query;

      let query = `
        SELECT b.*, s.student_name, s.class_name, s.admission_no,
               SUM(bi.amount) as original_total,
               SUM(bi.adjusted_amount) as adjusted_total,
               SUM(bi.adjusted_amount - bi.amount) as total_adjustments
        FROM bills b
        JOIN students s ON b.student_admission_no = s.admission_no
        LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
        WHERE b.branch_id = ?
      `;
      const params = [branch_id];

      if (academic_year) {
        query += ' AND b.academic_year = ?';
        params.push(academic_year);
      }

      if (term) {
        query += ' AND b.term = ?';
        params.push(term);
      }

      if (class_name) {
        query += ' AND s.class_name LIKE ?';
        params.push(`%${class_name}%`);
      }

      if (status) {
        query += ' AND b.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (s.student_name LIKE ? OR s.admission_no LIKE ? OR b.bill_number LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' GROUP BY b.bill_id ORDER BY b.created_at DESC';

      const rows = await db.sequelize.query(query, {
        replacements: params,
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Error fetching student bills:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student bills',
        error: error.message
      });
    }
  }

  async adjustBill(req, res) {
    
    try {
      await db.sequelize.beginTransaction();

      const {
        student_admission_no,
        bill_id,
        adjustment_type,
        adjustment_reason,
        adjustment_value,
        is_percentage,
        apply_to_all,
        notes,
        adjusted_by,
        school_id,
        branch_id
      } = req.body;

      // Get outstanding amounts for this student
      const entries = await db.sequelize.query(
        `SELECT item_id, cr, dr, (cr - dr) as outstanding, description
         FROM payment_entries
         WHERE admission_no = ? AND (cr - dr) > 0`,
        {
          replacements: [student_admission_no],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      if (entries.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No outstanding bills found for this student'
        });
      }

      let totalAdjustment = 0;
      const adjustmentDetails = [];

      for (const entry of entries) {
        let adjustmentAmount = 0;
        
        if (is_percentage) {
          adjustmentAmount = (entry.outstanding * adjustment_value) / 100;
        } else {
          if (apply_to_all) {
            adjustmentAmount = adjustment_value / entries.length;
          } else {
            adjustmentAmount = adjustment_value;
          }
        }

        // Apply adjustment based on type (always as a credit/payment)
        if (adjustment_type === 'DISCOUNT' || adjustment_type === 'WAIVER' || adjustment_type === 'SCHOLARSHIP') {
          // Add a payment entry to reduce the outstanding amount
          const adjustmentRef = `ADJ-${adjustment_type}-${Date.now()}`;
          
          await db.sequelize.query(
            `INSERT INTO payment_entries (
              ref_no, admission_no, class_code, academic_year, term,
              cr, dr, description, school_id, branch_id, item_category, created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NOW())`,
            {
              replacements: [
                adjustmentRef,
                student_admission_no,
                '', // Class code can be filled later
                new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
                'First Term', // Default term
                adjustmentAmount,
                `${adjustment_type}: ${adjustment_reason}`,
                school_id || 'default',
                branch_id,
                adjustment_type
              ],
              type: db.Sequelize.QueryTypes.INSERT
            }
          );
          
          totalAdjustment += adjustmentAmount;
          adjustmentDetails.push({
            entry_id: entry.item_id,
            original_amount: entry.outstanding,
            adjustment_amount: adjustmentAmount,
            adjustment_type,
            reference: adjustmentRef
          });
        }
      }

      await db.sequelize.commit();

      res.json({
        success: true,
        message: 'Bill adjustment applied successfully',
        data: {
          student_admission_no,
          total_adjustment: totalAdjustment,
          adjustment_type,
          adjustment_reason,
          adjustment_details: adjustmentDetails
        }
      });

    } catch (error) {
      await db.sequelize.rollback();
      console.error('Error adjusting bill:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to adjust bill',
        error: error.message
      });
    }
  }

  // Family Bills Management
  async getFamilyBills(req, res) {
    
    try {
      const { academic_year, term, branch_id, search, balance_status, class_name } = req.query;

      // First, let's get families with their basic info
      let familyQuery = `
        SELECT DISTINCT p.parent_id as family_id, 
               p.fullname as parent_name,
               p.phone as parent_phone,
               p.email as parent_email,
               COUNT(DISTINCT s.admission_no) as student_count
        FROM parents p
        JOIN students s ON p.parent_id = s.parent_id
        WHERE s.school_id = ? AND s.branch_id = ?
      `;
      const familyParams = [req.query.school_id || 'default', branch_id];

      if (search) {
        familyQuery += ' AND (p.fullname LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)';
        familyParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (class_name) {
        familyQuery += ' AND s.class_name LIKE ?';
        familyParams.push(`%${class_name}%`);
      }

      familyQuery += ' GROUP BY p.parent_id, p.fullname, p.phone, p.email ORDER BY p.fullname';

      const families = await db.sequelize.query(familyQuery, {
        replacements: familyParams,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // For each family, get detailed billing information
      for (const family of families) {
        // Get students for this family
        const students = await db.sequelize.query(
          `SELECT s.admission_no, s.student_name, s.class_name, s.current_class
           FROM students s
           WHERE s.parent_id = ? AND s.branch_id = ?`,
          {
            replacements: [family.family_id, branch_id],
            type: db.Sequelize.QueryTypes.SELECT
          }
        );
        
        // Calculate family totals from payment_entries (existing table)
        let totalInvoice = 0;
        let totalPaid = 0;
        let totalBalance = 0;
        const studentBills = [];

        for (const student of students) {
          // Get billing data from payment_entries table
          let billQuery = `
            SELECT 
              pe.admission_no,
              pe.academic_year,
              pe.term,
              SUM(pe.cr) as invoice_amount,
              SUM(pe.dr) as paid_amount,
              (SUM(pe.cr) - SUM(pe.dr)) as outstanding_amount
            FROM payment_entries pe
            WHERE pe.admission_no = ?
          `;
          const billParams = [student.admission_no];

          if (academic_year) {
            billQuery += ' AND pe.academic_year = ?';
            billParams.push(academic_year);
          }

          if (term) {
            billQuery += ' AND pe.term = ?';
            billParams.push(term);
          }

          billQuery += ' GROUP BY pe.admission_no, pe.academic_year, pe.term';

          const billData = await db.sequelize.query(billQuery, {
            replacements: billParams,
            type: db.Sequelize.QueryTypes.SELECT
          });
          
          if (billData.length > 0) {
            const bill = billData[0];
            totalInvoice += parseFloat(bill.invoice_amount || 0);
            totalPaid += parseFloat(bill.paid_amount || 0);
            totalBalance += parseFloat(bill.outstanding_amount || 0);
            
            studentBills.push({
              student_name: student.student_name,
              admission_no: student.admission_no,
              class_name: student.class_name,
              invoice_amount: bill.invoice_amount,
              paid_amount: bill.paid_amount,
              outstanding_amount: bill.outstanding_amount
            });
          }
        }

        // Apply balance status filter
        if (balance_status === 'OUTSTANDING' && totalBalance <= 0) continue;
        if (balance_status === 'PAID' && totalBalance > 0) continue;

        // Get family discount if exists
        const discountData = await db.sequelize.query(
          `SELECT family_discount, family_discount_type, discount_reason
           FROM family_billing
           WHERE family_id = ?`,
          {
            replacements: [family.family_id],
            type: db.Sequelize.QueryTypes.SELECT
          }
        );

        family.students = students;
        family.bills = studentBills;
        family.total_family_invoice = totalInvoice;
        family.total_family_paid = totalPaid;
        family.total_family_balance = totalBalance;
        family.family_discount = discountData.length > 0 ? discountData[0] : null;
        
        // Get payment history
        const paymentHistory = await db.sequelize.query(
          `SELECT 
             pe.ref_no as receipt_number,
             pe.created_at as payment_date,
             pe.dr as amount,
             'CASH' as payment_method,
             pe.created_by as collected_by,
             pe.description as notes
           FROM payment_entries pe
           JOIN students s ON pe.admission_no = s.admission_no
           WHERE s.parent_id = ? AND pe.dr > 0
           ORDER BY pe.created_at DESC
           LIMIT 10`,
          {
            replacements: [family.family_id],
            type: db.Sequelize.QueryTypes.SELECT
          }
        );
        
        family.payment_history = paymentHistory;
      }

      // Filter out families with no billing data if needed
      const filteredFamilies = families.filter(family => 
        family.total_family_invoice > 0 || balance_status === 'ALL'
      );

      res.json({
        success: true,
        data: filteredFamilies
      });

    } catch (error) {
      console.error('Error fetching family bills:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch family bills',
        error: error.message
      });
    }
  }

  async applyFamilyDiscount(req, res) {
    
    try {
      await db.sequelize.beginTransaction();

      const {
        family_id,
        family_discount,
        family_discount_type,
        discount_reason,
        apply_to_existing_bills,
        adjusted_by,
        school_id,
        branch_id
      } = req.body;

      // Create family_billing table if it doesn't exist
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS family_billing (
          id INT PRIMARY KEY AUTO_INCREMENT,
          family_id VARCHAR(20) NOT NULL,
          family_discount DECIMAL(10,2) DEFAULT 0,
          family_discount_type ENUM('PERCENTAGE', 'FIXED', 'SIBLING', 'SCHOLARSHIP') DEFAULT 'PERCENTAGE',
          discount_reason TEXT,
          school_id VARCHAR(20) NOT NULL,
          branch_id VARCHAR(20) NOT NULL,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_family_billing (family_id, school_id, branch_id)
        )
      `, {
        type: db.Sequelize.QueryTypes.RAW
      });

      // Insert or update family billing record
      await db.sequelize.query(
        `INSERT INTO family_billing (
          family_id, family_discount, family_discount_type, discount_reason,
          school_id, branch_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          family_discount = VALUES(family_discount),
          family_discount_type = VALUES(family_discount_type),
          discount_reason = VALUES(discount_reason),
          updated_at = NOW()`,
        {
          replacements: [
            family_id, family_discount, family_discount_type, discount_reason,
            school_id || 'default', branch_id, adjusted_by
          ],
          type: db.Sequelize.QueryTypes.INSERT
        }
      );

      if (apply_to_existing_bills) {
        // Get students for this family
        const students = await db.sequelize.query(
          `SELECT admission_no FROM students WHERE parent_id = ?`,
          {
            replacements: [family_id],
            type: db.Sequelize.QueryTypes.SELECT
          }
        );

        // Apply discount to existing payment entries
        for (const student of students) {
          // Get unpaid amounts from payment_entries
          const entries = await db.sequelize.query(
            `SELECT item_id, cr, dr, (cr - dr) as outstanding
             FROM payment_entries
             WHERE admission_no = ? AND (cr - dr) > 0`,
            {
              replacements: [student.admission_no],
              type: db.Sequelize.QueryTypes.SELECT
            }
          );

          for (const entry of entries) {
            let discountAmount = 0;
            if (family_discount_type === 'PERCENTAGE') {
              discountAmount = (entry.outstanding * family_discount) / 100;
            } else {
              // For fixed amount, distribute across all outstanding entries
              const totalOutstanding = entries.reduce((sum, e) => sum + parseFloat(e.outstanding), 0);
              discountAmount = totalOutstanding > 0 ? (entry.outstanding / totalOutstanding) * family_discount : 0;
            }

            // Apply discount by adding a credit entry
            if (discountAmount > 0) {
              await db.sequelize.query(
                `INSERT INTO payment_entries (
                  ref_no, admission_no, class_code, academic_year, term,
                  cr, dr, description, school_id, branch_id, item_category
                ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'Family Discount')`,
                {
                  replacements: [
                    `DISC-${Date.now()}`,
                    student.admission_no,
                    '', // Will be filled from existing entry if needed
                    new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
                    'First Term', // Default term
                    discountAmount,
                    `Family discount: ${discount_reason}`,
                    school_id || 'default',
                    branch_id
                  ],
                  type: db.Sequelize.QueryTypes.INSERT
                }
              );
            }
          }
        }
      }

      await db.sequelize.commit();

      res.json({
        success: true,
        message: 'Family discount applied successfully',
        data: {
          family_id,
          family_discount,
          family_discount_type,
          discount_amount: family_discount
        }
      });

    } catch (error) {
      await db.sequelize.rollback();
      console.error('Error applying family discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply family discount',
        error: error.message
      });
    }
  }

  // Cash Collection Management
  async openCashDrawer(req, res) {
    
    try {
      const {
        opening_balance,
        opened_by,
        school_id,
        branch_id,
        notes
      } = req.body;

      // Check if there's already an open drawer
      const existingDrawer = await db.sequelize.query(
        `SELECT * FROM cash_drawers 
         WHERE opened_by = ? AND status = 'OPEN' AND branch_id = ?`,
        {
          replacements: [opened_by, branch_id],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      if (existingDrawer.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You already have an open cash drawer'
        });
      }

      const [result] = await db.sequelize.query(
        `INSERT INTO cash_drawers (
          opening_balance, current_balance, total_collections, total_payments,
          opened_by, opened_at, status, school_id, branch_id, notes
        ) VALUES (?, ?, 0, 0, ?, NOW(), 'OPEN', ?, ?, ?)`,
        {
          replacements: [opening_balance, opening_balance, opened_by, school_id, branch_id, notes],
          type: db.Sequelize.QueryTypes.INSERT
        }
      );

      res.json({
        success: true,
        message: 'Cash drawer opened successfully',
        data: {
          drawer_id: result.insertId,
          opening_balance,
          status: 'OPEN'
        }
      });

    } catch (error) {
      console.error('Error opening cash drawer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to open cash drawer',
        error: error.message
      });
    }
  }

  async closeCashDrawer(req, res) {
    
    try {
      const {
        drawer_id,
        closing_balance,
        closed_by,
        notes
      } = req.body;

      // Get current drawer details
      const drawerRows = await db.sequelize.query(
        `SELECT * FROM cash_drawers WHERE drawer_id = ?`,
        {
          replacements: [drawer_id],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      if (drawerRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cash drawer not found'
        });
      }

      const drawer = drawerRows[0];
      const variance = closing_balance - drawer.current_balance;

      await db.sequelize.query(
        `UPDATE cash_drawers 
         SET closing_balance = ?, variance = ?, closed_by = ?, 
             closed_at = NOW(), status = 'CLOSED', notes = ?
         WHERE drawer_id = ?`,
        {
          replacements: [closing_balance, variance, closed_by, notes, drawer_id],
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );

      res.json({
        success: true,
        message: 'Cash drawer closed successfully',
        data: {
          drawer_id,
          closing_balance,
          variance,
          status: 'CLOSED'
        }
      });

    } catch (error) {
      console.error('Error closing cash drawer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to close cash drawer',
        error: error.message
      });
    }
  }

  async getCashDrawerStatus(req, res) {
    
    try {
      const { branch_id, user_id } = req.query;

      const rows = await db.sequelize.query(
        `SELECT * FROM cash_drawers 
         WHERE opened_by = ? AND branch_id = ? AND status = 'OPEN'
         ORDER BY opened_at DESC LIMIT 1`,
        {
          replacements: [user_id, branch_id],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: rows[0] || null
      });

    } catch (error) {
      console.error('Error fetching cash drawer status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cash drawer status',
        error: error.message
      });
    }
  }

  // Payment Processing
  async processPayment(req, res) {
    
    try {
      await db.sequelize.beginTransaction();

      const {
        family_id,
        amount,
        payment_method,
        payment_reference,
        notes,
        collected_by,
        school_id,
        branch_id,
        allocations
      } = req.body;

      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}`;
      const paymentDate = moment().format('YYYY-MM-DD HH:mm:ss');

      // Get students for this family
      const students = await db.sequelize.query(
        `SELECT admission_no, student_name FROM students WHERE parent_id = ?`,
        {
          replacements: [family_id],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      if (students.length === 0) {
        throw new Error('No students found for this family');
      }

      let totalProcessed = 0;
      const paymentDetails = [];

      // If allocations are provided, use them; otherwise distribute equally
      if (allocations && allocations.length > 0) {
        for (const allocation of allocations) {
          if (allocation.amount > 0) {
            // Add payment entry
            await db.sequelize.query(
              `INSERT INTO payment_entries (
                ref_no, admission_no, class_code, academic_year, term,
                cr, dr, description, school_id, branch_id, item_category, created_at
              ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'Payment', NOW())`,
              {
                replacements: [
                  receiptNumber,
                  allocation.student_id,
                  '', // Class code can be filled later
                  new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
                  'First Term', // Default term
                  allocation.amount,
                  `Payment: ${payment_method} - ${notes || ''}`,
                  school_id || 'default',
                  branch_id
                ],
                type: db.Sequelize.QueryTypes.INSERT
              }
            );
            
            totalProcessed += allocation.amount;
            paymentDetails.push({
              student_id: allocation.student_id,
              amount: allocation.amount
            });
          }
        }
      } else {
        // Distribute payment equally among students
        const amountPerStudent = amount / students.length;
        
        for (const student of students) {
          await db.sequelize.query(
            `INSERT INTO payment_entries (
              ref_no, admission_no, class_code, academic_year, term,
              cr, dr, description, school_id, branch_id, item_category, created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'Payment', NOW())`,
            {
              replacements: [
                receiptNumber,
                student.admission_no,
                '', // Class code can be filled later
                new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
                'First Term', // Default term
                amountPerStudent,
                `Family payment: ${payment_method} - ${notes || ''}`,
                school_id || 'default',
                branch_id
              ],
              type: db.Sequelize.QueryTypes.INSERT
            }
          );
          
          paymentDetails.push({
            student_id: student.admission_no,
            student_name: student.student_name,
            amount: amountPerStudent
          });
        }
        
        totalProcessed = amount;
      }

      await db.sequelize.commit();

      // Invalidate dashboard cache
      const cacheService = require('../services/cacheService');
      await cacheService.invalidateDashboard(school_id, branch_id);

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          payment_id: receiptNumber,
          receipt_number: receiptNumber,
          family_id,
          total_amount: totalProcessed,
          payment_method,
          payment_date: paymentDate,
          payment_details: paymentDetails
        }
      });

    } catch (error) {
      await db.sequelize.rollback();
      console.error('Error processing payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment',
        error: error.message
      });
    }
  }

  // Search and Reports
  async searchStudentsWithOutstandingPayments(req, res) {
    
    try {
      const {
        search,
        class_name,
        academic_year,
        term,
        branch_id
      } = req.query;

      let query = `
        SELECT s.admission_no, s.student_name, s.class_name,
               p.fullname as parent_name, p.phone as parent_phone, p.email as parent_email,
               SUM(b.outstanding_amount) as outstanding_balance,
               COUNT(b.bill_id) as bill_count
        FROM students s
        LEFT JOIN parents p ON s.parent_id = p.parent_id
        LEFT JOIN bills b ON s.admission_no = b.student_admission_no
        WHERE s.branch_id = ? AND b.outstanding_amount > 0
      `;
      const params = [branch_id];

      if (search) {
        query += ' AND (s.student_name LIKE ? OR s.admission_no LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (class_name) {
        query += ' AND s.class_name LIKE ?';
        params.push(`%${class_name}%`);
      }

      if (academic_year) {
        query += ' AND b.academic_year = ?';
        params.push(academic_year);
      }

      if (term) {
        query += ' AND b.term = ?';
        params.push(term);
      }

      query += ' GROUP BY s.admission_no HAVING outstanding_balance > 0 ORDER BY s.student_name';

      const students = await db.sequelize.query(query, {
        replacements: params,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get outstanding bills for each student
      for (const student of students) {
        const bills = await db.sequelize.query(
          `SELECT b.bill_id, b.bill_number, b.bill_date, b.due_date,
                  b.original_total, b.paid_amount, b.outstanding_amount, b.status,
                  bi.item_id, bi.fee_name, bi.amount, bi.paid_amount as item_paid_amount,
                  bi.outstanding_amount as item_outstanding_amount
           FROM bills b
           LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
           WHERE b.student_admission_no = ? AND b.outstanding_amount > 0
           ${academic_year ? 'AND b.academic_year = ?' : ''}
           ${term ? 'AND b.term = ?' : ''}
           ORDER BY b.due_date`,
          {
            replacements: [
              student.admission_no,
              ...(academic_year ? [academic_year] : []),
              ...(term ? [term] : [])
            ],
            type: db.Sequelize.QueryTypes.SELECT
          }
        );

        // Group bill items by bill
        const billsMap = new Map();
        bills.forEach(row => {
          if (!billsMap.has(row.bill_id)) {
            billsMap.set(row.bill_id, {
              bill_id: row.bill_id,
              bill_number: row.bill_number,
              bill_date: row.bill_date,
              due_date: row.due_date,
              original_amount: row.original_total,
              paid_amount: row.paid_amount,
              outstanding_amount: row.outstanding_amount,
              status: row.status,
              bill_items: []
            });
          }

          if (row.item_id) {
            billsMap.get(row.bill_id).bill_items.push({
              item_id: row.item_id,
              fee_name: row.fee_name,
              amount: row.amount,
              paid_amount: row.item_paid_amount,
              outstanding_amount: row.item_outstanding_amount
            });
          }
        });

        student.bills = Array.from(billsMap.values());
      }

      res.json({
        success: true,
        data: students
      });

    } catch (error) {
      console.error('Error searching students:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search students',
        error: error.message
      });
    }
  }

  // Fees Metrics and Reports
  async getFeesMetrics(req, res) {
    
    try {
      const { start_date, end_date, branch_id } = req.query;

      // Get basic metrics
      const metricsRows = await db.sequelize.query(
        `SELECT 
           SUM(b.original_total) as total_expected_fees,
           SUM(b.paid_amount) as total_collected_fees,
           SUM(b.outstanding_amount) as outstanding_fees,
           COUNT(DISTINCT s.admission_no) as total_students,
           COUNT(DISTINCT CASE WHEN b.status = 'PAID' THEN s.admission_no END) as paid_students,
           COUNT(DISTINCT CASE WHEN b.status = 'PARTIAL' THEN s.admission_no END) as partial_paid_students,
           COUNT(DISTINCT CASE WHEN b.status IN ('PUBLISHED', 'OVERDUE') THEN s.admission_no END) as unpaid_students
         FROM bills b
         JOIN students s ON b.student_admission_no = s.admission_no
         WHERE b.branch_id = ? AND b.bill_date BETWEEN ? AND ?`,
        {
          replacements: [branch_id, start_date, end_date],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      const metrics = metricsRows[0];
      metrics.collection_rate = metrics.total_expected_fees > 0 
        ? (metrics.total_collected_fees / metrics.total_expected_fees) * 100 
        : 0;

      // Get overdue amount (with 7-day grace period after mid-term)
      const overdueRows = await db.sequelize.query(
        `SELECT SUM(outstanding_amount) as overdue_amount
         FROM bills 
         WHERE branch_id = ? 
         AND DATE_ADD(due_date, INTERVAL 7 DAY) < CURDATE() 
         AND outstanding_amount > 0
         AND (
           -- Apply grace period only after first payment (mid-term)
           EXISTS (
             SELECT 1 FROM payments p 
             WHERE p.student_admission_no = bills.student_admission_no 
             AND p.academic_year = bills.academic_year 
             AND p.term = bills.term
           )
           OR 
           -- No grace period for first-time payments
           NOT EXISTS (
             SELECT 1 FROM payments p 
             WHERE p.student_admission_no = bills.student_admission_no 
             AND p.academic_year = bills.academic_year 
             AND p.term = bills.term
           ) AND due_date < CURDATE()
         )`,
        {
          replacements: [branch_id],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      metrics.overdue_amount = overdueRows[0].overdue_amount || 0;

      // Get advance payments
      const advanceRows = await db.sequelize.query(
        `SELECT SUM(amount) as advance_payments
         FROM payments 
         WHERE branch_id = ? AND payment_date BETWEEN ? AND ? 
         AND payment_date < (SELECT MIN(bill_date) FROM bills WHERE student_admission_no = payments.student_admission_no)`,
        {
          replacements: [branch_id, start_date, end_date],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      metrics.advance_payments = advanceRows[0].advance_payments || 0;

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Error fetching fees metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch fees metrics',
        error: error.message
      });
    }
  }

  async getPaymentTrends(req, res) {
    
    try {
      const { start_date, end_date, branch_id } = req.query;

      const rows = await db.sequelize.query(
        `SELECT 
           DATE_FORMAT(payment_date, '%Y-%m') as month,
           YEAR(payment_date) as year,
           SUM(total_amount) as collected,
           COUNT(*) as payment_count
         FROM payments 
         WHERE branch_id = ? AND payment_date BETWEEN ? AND ?
         GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
         ORDER BY month`,
        {
          replacements: [branch_id, start_date, end_date],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      // Get expected amounts for the same periods
      for (const row of rows) {
        const monthStart = `${row.month}-01`;
        const monthEnd = `${row.month}-31`;
        
        const expectedRows = await db.sequelize.query(
          `SELECT SUM(original_total) as expected
           FROM bills 
           WHERE branch_id = ? AND bill_date BETWEEN ? AND ?`,
          {
            replacements: [branch_id, monthStart, monthEnd],
            type: db.Sequelize.QueryTypes.SELECT
          }
        );

        row.expected = expectedRows[0].expected || 0;
        row.outstanding = row.expected - row.collected;
        row.collection_rate = row.expected > 0 ? (row.collected / row.expected) * 100 : 0;
      }

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Error fetching payment trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment trends',
        error: error.message
      });
    }
  }

  async getClasswiseCollection(req, res) {
    
    try {
      const { start_date, end_date, branch_id } = req.query;

      const rows = await db.sequelize.query(
        `SELECT 
           s.class_name,
           COUNT(DISTINCT s.admission_no) as total_students,
           SUM(b.original_total) as expected_amount,
           SUM(b.paid_amount) as collected_amount,
           SUM(b.outstanding_amount) as outstanding_amount
         FROM students s
         LEFT JOIN bills b ON s.admission_no = b.student_admission_no 
           AND b.bill_date BETWEEN ? AND ?
         WHERE s.branch_id = ?
         GROUP BY s.class_name
         ORDER BY s.class_name`,
        {
          replacements: [start_date, end_date, branch_id],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      // Calculate collection rates
      rows.forEach(row => {
        row.collection_rate = row.expected_amount > 0 
          ? (row.collected_amount / row.expected_amount) * 100 
          : 0;
      });

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Error fetching classwise collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch classwise collection',
        error: error.message
      });
    }
  }

  async getPaymentMethods(req, res) {
    
    try {
      const { start_date, end_date, branch_id } = req.query;

      const rows = await db.sequelize.query(
        `SELECT 
           payment_method,
           SUM(total_amount) as amount,
           COUNT(*) as count
         FROM payments 
         WHERE branch_id = ? AND payment_date BETWEEN ? AND ?
         GROUP BY payment_method
         ORDER BY amount DESC`,
        {
          replacements: [branch_id, start_date, end_date],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      // Calculate percentages
      const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
      rows.forEach(row => {
        row.percentage = totalAmount > 0 ? (row.amount / totalAmount) * 100 : 0;
      });

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment methods',
        error: error.message
      });
    }
  }

  async getRecentPayments(req, res) {
    
    try {
      const { limit = 10, branch_id } = req.query;

      const rows = await db.sequelize.query(
        `SELECT p.payment_id, p.receipt_number, p.student_name, 
                s.class_name, p.total_amount as amount, p.payment_method,
                p.payment_date, u.full_name as collected_by
         FROM payments p
         LEFT JOIN students s ON p.student_admission_no = s.admission_no
         LEFT JOIN users u ON p.collected_by = u.user_id
         WHERE p.branch_id = ?
         ORDER BY p.created_at DESC
         LIMIT ?`,
        {
          replacements: [branch_id, parseInt(limit)],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Error fetching recent payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent payments',
        error: error.message
      });
    }
  }

  // Check if payment is overdue considering 7-day grace period
  async checkPaymentOverdue(req, res) {
    try {
      const { admission_no, academic_year, term, branch_id } = req.query;

      if (!admission_no || !academic_year || !term || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: admission_no, academic_year, term, branch_id'
        });
      }

      const overdueQuery = `
        SELECT 
          b.bill_id,
          b.bill_number,
          b.due_date,
          b.outstanding_amount,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM payments p 
              WHERE p.student_admission_no = b.student_admission_no 
              AND p.academic_year = b.academic_year 
              AND p.term = b.term
            ) THEN 
              -- Has made payments: 7-day grace period
              CASE WHEN DATE_ADD(b.due_date, INTERVAL 7 DAY) < CURDATE() THEN 1 ELSE 0 END
            ELSE 
              -- No payments made: no grace period
              CASE WHEN b.due_date < CURDATE() THEN 1 ELSE 0 END
          END as is_overdue,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM payments p 
              WHERE p.student_admission_no = b.student_admission_no 
              AND p.academic_year = b.academic_year 
              AND p.term = b.term
            ) THEN DATE_ADD(b.due_date, INTERVAL 7 DAY)
            ELSE b.due_date
          END as effective_due_date
        FROM bills b
        WHERE b.student_admission_no = ?
        AND b.academic_year = ?
        AND b.term = ?
        AND b.branch_id = ?
        AND b.outstanding_amount > 0
        ORDER BY b.due_date
      `;

      const results = await db.sequelize.query(overdueQuery, {
        replacements: [admission_no, academic_year, term, branch_id],
        type: db.Sequelize.QueryTypes.SELECT
      });

      const overdueBills = results.filter(bill => bill.is_overdue === 1);
      const totalOverdue = overdueBills.reduce((sum, bill) => sum + parseFloat(bill.outstanding_amount), 0);

      res.json({
        success: true,
        data: {
          bills: results,
          overdue_bills: overdueBills,
          total_overdue_amount: totalOverdue,
          has_grace_period: results.some(bill => 
            new Date(bill.effective_due_date) > new Date(bill.due_date)
          )
        }
      });

    } catch (error) {
      console.error('Error checking payment overdue status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check overdue status',
        error: error.message
      });
    }
  }
}

module.exports = new EnhancedFeesController();