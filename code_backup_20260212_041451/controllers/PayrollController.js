const { Op, Transaction, col, fn, literal } = require('sequelize');
const {
  PayrollPeriod,
  PayrollLine,
  Staff,
  StaffAllowance,
  StaffDeduction,
  AllowanceType,
  DeductionType,
  GradeLevel,
  Loan,
  sequelize
} = require('../models');
const db = require('../models');
const auditLog = require('../utils/audit');
const PaymentGatewayService = require('../services/PaymentGatewayService');

// Helper function to get school_id and branch_id with header fallback
function getSchoolAndBranchIds(req) {
  const school_id = req.user.school_id || req.headers['x-school-id'];
  const branch_id = req.user.branch_id || req.headers['x-branch-id'];
  return { school_id, branch_id };
}

class PayrollController {
  // Get all staff allowances
  static async getAllStaffAllowances(req, res) {
    try {
      const { school_id, branch_id } = getSchoolAndBranchIds(req);

      // Get all staff allowances with raw query to avoid association issues
      const query = `
        SELECT sa.*, t.name as first_name, '' as last_name, t.id as staff_number, at.allowance_name,
               CASE WHEN sa.end_date IS NULL THEN 1 ELSE 0 END as is_active
        FROM staff_allowances sa
        JOIN teachers t ON sa.staff_id = t.id
        JOIN allowance_types at ON sa.allowance_id = at.allowance_id
        WHERE t.school_id = ?
        ${branch_id ? 'AND t.branch_id = ?' : ''}
        ORDER BY sa.created_at DESC
      `;

      const replacements = branch_id ? [school_id, branch_id] : [school_id];
      const staffAllowances = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: staffAllowances
      });
    } catch (error) {
      console.error('Error fetching staff allowances:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch staff allowances'
      });
    }
  }

  // Get all staff deductions
  static async getAllStaffDeductions(req, res) {
    try {
      const { school_id, branch_id } = getSchoolAndBranchIds(req);

      // Get all staff deductions with raw query to avoid association issues
      const query = `
        SELECT sd.*, t.name as first_name, '' as last_name, t.id as staff_number, dt.deduction_name,
               CASE WHEN sd.end_date IS NULL THEN 1 ELSE 0 END as is_active
        FROM staff_deductions sd
        JOIN teachers t ON sd.staff_id = t.id
        JOIN deduction_types dt ON sd.deduction_id = dt.deduction_id
        WHERE t.school_id = ?
        ${branch_id ? 'AND t.branch_id = ?' : ''}
        ORDER BY sd.created_at DESC
      `;

      const replacements = branch_id ? [school_id, branch_id] : [school_id];
      const staffDeductions = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: staffDeductions
      });
    } catch (error) {
      console.error('Error fetching staff deductions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch staff deductions'
      });
    }
  }
  static async initiatePeriod(req, res) {
    try {
      const { period_month } = req.body;
      const { school_id, branch_id } = getSchoolAndBranchIds(req);
      const actor_id = req.user.staff_id || req.user.id || req.user.user_id;

      if (!period_month) {
        return res.status(400).json({
          success: false,
          message: 'Period month is required'
        });
      }

      console.log(`🚀 Initiating payroll for ${period_month}, School: ${school_id}, Branch: ${branch_id}`);

      // Parse period month to get year and month number
      const [year, month] = period_month.split('-');
      const monthNum = parseInt(month);

      // Check if period already exists (allow re-initiation for incomplete periods)
      const existingPeriod = await sequelize.query(`
        SELECT period_id, status FROM payroll_periods 
        WHERE period_month = ? AND school_id = ?
      `, {
        replacements: [period_month, school_id],
        type: sequelize.QueryTypes.SELECT
      });

      if (existingPeriod.length > 0 && existingPeriod[0].status !== 'initiated') {
        return res.status(400).json({
          success: false,
          message: `Payroll period for ${period_month} already exists with status: ${existingPeriod[0].status}`
        });
      }
      
      // Use existing period_id if re-initiating
      const payrollPeriodId = existingPeriod.length > 0 ? existingPeriod[0].period_id : null;

      // Get staff with calculated totals using single SQL query
      const staffWithTotals = await sequelize.query(`
        SELECT 
          t.id as staff_id,
          t.name,
          t.grade_id,
          t.step,
          gl.basic_salary,
          gl.increment_rate,
          CASE
            WHEN gl.basic_salary IS NOT NULL AND t.step IS NOT NULL THEN
              gl.basic_salary + (COALESCE(t.step, 1) - 1) * COALESCE(gl.increment_rate, 0)
            WHEN gl.basic_salary IS NOT NULL THEN
              gl.basic_salary
            ELSE
              0
          END as calculated_basic_salary,
          COALESCE((SELECT SUM(amount) FROM staff_allowances sa 
            WHERE sa.staff_id = t.id 
            AND (sa.end_date IS NULL OR sa.end_date >= CURDATE())
            AND sa.effective_date <= CURDATE()), 0) as total_allowances,
          COALESCE((SELECT SUM(amount) FROM staff_deductions sd 
            WHERE sd.staff_id = t.id 
            AND (sd.end_date IS NULL OR sd.end_date >= CURDATE())
            AND sd.effective_date <= CURDATE()), 0) as total_deductions
        FROM teachers t
        LEFT JOIN grade_levels gl ON t.grade_id = gl.grade_id
        WHERE t.school_id = :school_id
        AND t.status = 'Active'
        AND t.payroll_status = 'Enrolled'
        ${branch_id ? 'AND t.branch_id = :branch_id' : ''}
        ORDER BY t.name
      `, {
        replacements: { 
          school_id,
          ...(branch_id && { branch_id })
        },
        type: sequelize.QueryTypes.SELECT
      });

      if (!staffWithTotals || staffWithTotals.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No enrolled staff found for payroll processing'
        });
      }

      console.log(`✅ Found ${staffWithTotals.length} enrolled staff for payroll`);

      // Create or update payroll period
      let finalPeriodId;
      if (payrollPeriodId) {
        // Update existing period
        await sequelize.query(`
          UPDATE payroll_periods 
          SET total_staff = ?, updated_at = NOW()
          WHERE period_id = ?
        `, {
          replacements: [staffWithTotals.length, payrollPeriodId],
          type: sequelize.QueryTypes.UPDATE
        });
        finalPeriodId = payrollPeriodId;
        console.log('✅ Updated existing payroll period:', finalPeriodId);
      } else {
        // Create new period
        const [payrollPeriodResult] = await sequelize.query(`
          INSERT INTO payroll_periods (
            period_month, period_year, period_month_num, status, total_staff,
            initiated_by, initiated_at, school_id, branch_id, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            period_month,
            year,
            month,
            'initiated',
            staffWithTotals.length,
            actor_id,
            school_id,
            branch_id,
            `Payroll initiated for ${staffWithTotals.length} staff members`
          ],
          type: sequelize.QueryTypes.INSERT
        });
        finalPeriodId = payrollPeriodResult;
        console.log('✅ Payroll period created with ID:', finalPeriodId);
      }

      // Process each staff member using SQL results
      const payrollLines = [];
      let totalBasicSalary = 0;
      let totalAllowances = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;

      console.log(`🚀 Processing ${staffWithTotals.length} staff members...`);

      // Process each staff member using SQL results
      for (const staff of staffWithTotals) {
        const basicSalary = parseFloat(staff.calculated_basic_salary) || 0;
        const allowances = parseFloat(staff.total_allowances) || 0;
        const deductions = parseFloat(staff.total_deductions) || 0;
        
        // Get individual loans for this staff member
        const staffLoans = await sequelize.query(`
          SELECT l.loan_id, l.monthly_deduction, lt.loan_type_name, l.balance_remaining
          FROM loans l
          LEFT JOIN loan_types lt ON l.loan_type_id = lt.loan_type_id
          WHERE l.staff_id = ? AND l.status = 'active' AND l.balance_remaining > 0
        `, {
          replacements: [staff.staff_id],
          type: sequelize.QueryTypes.SELECT
        });
        
        const totalLoans = staffLoans.reduce((sum, loan) => sum + parseFloat(loan.monthly_deduction || 0), 0);
        const netPay = basicSalary + allowances - deductions - totalLoans;

        console.log(`💰 ${staff.name}: Basic=₦${basicSalary}, Allowances=₦${allowances}, Deductions=₦${deductions}, Loans=₦${totalLoans}, Net=₦${netPay}`);

        // Create payroll line (update if already exists)
        const [payrollLineResult] = await sequelize.query(`
          INSERT INTO payroll_lines (
            period_id, staff_id, basic_salary, total_allowances, total_deductions, total_loans,
            gross_pay, net_pay, school_id, branch_id, notes, is_processed,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            basic_salary = VALUES(basic_salary),
            total_allowances = VALUES(total_allowances),
            total_deductions = VALUES(total_deductions),
            total_loans = VALUES(total_loans),
            gross_pay = VALUES(gross_pay),
            net_pay = VALUES(net_pay),
            notes = VALUES(notes),
            updated_at = NOW()
        `, {
          replacements: [
            finalPeriodId,
            staff.staff_id,
            basicSalary,
            allowances,
            deductions,
            totalLoans,
            basicSalary + allowances,
            netPay,
            school_id,
            branch_id,
            `Payroll for ${staff.name}`
          ],
          type: sequelize.QueryTypes.INSERT
        });

        const payrollLineId = payrollLineResult;

        // Create detailed payroll items for salary slip breakdown
        
        // 1. Create basic salary item (using 'allowance' type with special item_id 0)
        if (basicSalary > 0) {
          await sequelize.query(`
            INSERT INTO payroll_items (
              payroll_line_id, item_type, item_id, item_name, amount, 
              calculation_base, rate, notes, created_at
            ) VALUES (?, 'allowance', 0, 'Basic Salary', ?, ?, 1.00, 'Monthly basic salary', NOW())
          `, {
            replacements: [payrollLineId, basicSalary, basicSalary],
            type: sequelize.QueryTypes.INSERT
          });
        }

        // 2. Create individual allowance items
        const staffAllowances = await sequelize.query(`
          SELECT sa.*, at.allowance_name, at.allowance_code, at.calculation_type
          FROM staff_allowances sa
          JOIN allowance_types at ON sa.allowance_id = at.allowance_id
          WHERE sa.staff_id = ? 
            AND (sa.end_date IS NULL OR sa.end_date >= CURDATE())
            AND sa.effective_date <= CURDATE()
        `, {
          replacements: [staff.staff_id],
          type: sequelize.QueryTypes.SELECT
        });

        for (const allowance of staffAllowances) {
          const allowanceAmount = parseFloat(allowance.amount || 0);
          if (allowanceAmount > 0) {
            await sequelize.query(`
              INSERT INTO payroll_items (
                payroll_line_id, item_type, item_id, item_name, amount, 
                calculation_base, rate, notes, created_at
              ) VALUES (?, 'allowance', ?, ?, ?, ?, ?, ?, NOW())
            `, {
              replacements: [
                payrollLineId, 
                allowance.allowance_id, 
                allowance.allowance_name,
                allowanceAmount,
                basicSalary,
                allowance.calculation_type === 'percentage' ? (allowanceAmount / basicSalary * 100) : 1.00,
                `${allowance.allowance_name} - ${allowance.calculation_type}`
              ],
              type: sequelize.QueryTypes.INSERT
            });
          }
        }

        // 3. Create individual deduction items
        const staffDeductions = await sequelize.query(`
          SELECT sd.*, dt.deduction_name, dt.deduction_code, dt.calculation_type
          FROM staff_deductions sd
          JOIN deduction_types dt ON sd.deduction_id = dt.deduction_id
          WHERE sd.staff_id = ? 
            AND (sd.end_date IS NULL OR sd.end_date >= CURDATE())
            AND sd.effective_date <= CURDATE()
        `, {
          replacements: [staff.staff_id],
          type: sequelize.QueryTypes.SELECT
        });

        for (const deduction of staffDeductions) {
          const deductionAmount = parseFloat(deduction.amount || 0);
          if (deductionAmount > 0) {
            await sequelize.query(`
              INSERT INTO payroll_items (
                payroll_line_id, item_type, item_id, item_name, amount, 
                calculation_base, rate, notes, created_at
              ) VALUES (?, 'deduction', ?, ?, ?, ?, ?, ?, NOW())
            `, {
              replacements: [
                payrollLineId, 
                deduction.deduction_id, 
                deduction.deduction_name,
                deductionAmount,
                basicSalary,
                deduction.calculation_type === 'percentage' ? (deductionAmount / basicSalary * 100) : 1.00,
                `${deduction.deduction_name} - ${deduction.calculation_type}`
              ],
              type: sequelize.QueryTypes.INSERT
            });
          }
        }

        // 4. Create individual loan items
        for (const loan of staffLoans) {
          const loanAmount = parseFloat(loan.monthly_deduction || 0);
          if (loanAmount > 0) {
            await sequelize.query(`
              INSERT INTO payroll_items (
                payroll_line_id, item_type, item_id, item_name, amount, 
                calculation_base, rate, notes, created_at
              ) VALUES (?, 'loan', ?, ?, ?, ?, ?, ?, NOW())
            `, {
              replacements: [
                payrollLineId, 
                loan.loan_id, 
                `${loan.loan_type_name || 'Staff'} Loan Repayment`,
                loanAmount,
                loan.balance_remaining,
                1.00,
                `Monthly repayment for ${loan.loan_type_name || 'Staff'} loan (Balance: ₦${loan.balance_remaining})`
              ],
              type: sequelize.QueryTypes.INSERT
            });
          }
        }

        // Update totals
        totalBasicSalary += basicSalary;
        totalAllowances += allowances;
        totalDeductions += deductions;
        totalNetPay += netPay;

        payrollLines.push({
          staff_id: staff.staff_id,
          staff_name: staff.name,
          basic_salary: basicSalary,
          allowances: allowances,
          deductions: deductions,
          loans: totalLoans,
          net_salary: netPay
        });
      }

      console.log(`📊 Final totals: Basic=₦${totalBasicSalary}, Allowances=₦${totalAllowances}, Deductions=₦${totalDeductions}, Net=₦${totalNetPay}`);

      // Update payroll period with calculated totals
      await sequelize.query(`
        UPDATE payroll_periods 
        SET total_basic_salary = ?, total_allowances = ?, total_deductions = ?, 
            total_net_pay = ?, status = 'initiated'
        WHERE period_id = ?
      `, {
        replacements: [totalBasicSalary, totalAllowances, totalDeductions, totalNetPay, finalPeriodId],
        type: sequelize.QueryTypes.UPDATE
      });

      // Log audit trail
      await auditLog(
        'payroll_initiation',
        'payroll_periods',
        finalPeriodId,
        { period_month, total_staff: staffWithTotals.length, total_net_pay: totalNetPay },
        actor_id,
        school_id
      );

      const summary = {
        period_id: finalPeriodId,
        period_month,
        total_staff: staffWithTotals.length,
        total_basic: totalBasicSalary,
        total_allowances: totalAllowances,
        total_deductions: totalDeductions,
        total_net: totalNetPay,
        status: 'initiated'
      };

      res.json({
        success: true,
        message: `Payroll successfully initiated for ${period_month}`,
        summary,
        details: payrollLines
      });

    } catch (error) {
      console.error('❌ Error initiating payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate payroll',
        error: error.message
      });
    }
  }

  /**
   * Calculate payroll for a single staff member
   */
  static async calculateStaffPayroll(staff, period_month) {
    // This method is no longer used since we calculate directly in SQL
    // Keeping for backward compatibility
    return {
      basicSalary: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      netPay: 0,
      notes: 'Calculated via SQL query'
    };
  }

  // Approve Payroll Period
  static async approvePeriod(req, res) {
    try {
      const { periodId } = req.params;
      const { notes } = req.body;
      const actor_id = req.user.staff_id || req.user.id || req.user.user_id;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      console.log('Approving payroll with:', { periodId, actor_id, school_id, user: req.user });

      if (!actor_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found in request. Please ensure you are properly authenticated.'
        });
      }

      // Get period details first
      const period = await PayrollPeriod.findByPk(periodId);
      if (!period) {
        return res.status(404).json({
          success: false,
          message: 'Payroll period not found'
        });
      }

      // Instead of calling stored procedure, update directly
      await period.update({
        status: 'approved',
        approved_by: actor_id,
        approved_at: new Date(),
        notes: notes || 'Approved for disbursement'
      });

      res.json({
        success: true,
        message: `Payroll period ${period.period_month} approved successfully`
      });

    } catch (error) {
      console.error('Error approving payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve payroll',
        error: error.message
      });
    }
  }

  // Add one-time item (overtime, bonus, fine, penalty) to specific period
  static async addOneTimeItem(req, res) {
    try {
      const { periodId, staffId } = req.params;
      const { item_type, item_name, amount, notes } = req.body;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      // Get payroll line for this staff in this period
      const [payrollLine] = await db.sequelize.query(`
        SELECT payroll_line_id FROM payroll_lines 
        WHERE period_id = ? AND staff_id = ?
      `, {
        replacements: [periodId, staffId],
        type: db.Sequelize.QueryTypes.SELECT
      });

      if (!payrollLine) {
        return res.status(404).json({
          success: false,
          message: 'Staff not found in this payroll period'
        });
      }

      // Add item to payroll_items
      await db.sequelize.query(`
        INSERT INTO payroll_items (payroll_line_id, item_type, item_name, amount, notes, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, {
        replacements: [payrollLine.payroll_line_id, item_type, item_name, amount, notes || ''],
        type: db.Sequelize.QueryTypes.INSERT
      });

      // Recalculate totals for this staff
      const [items] = await db.sequelize.query(`
        SELECT item_type, SUM(amount) as total
        FROM payroll_items
        WHERE payroll_line_id = ?
        GROUP BY item_type
      `, {
        replacements: [payrollLine.payroll_line_id],
        type: db.Sequelize.QueryTypes.SELECT
      });

      const allowances = items.find(i => i.item_type === 'allowance')?.total || 0;
      const deductions = items.find(i => i.item_type === 'deduction')?.total || 0;
      const loans = items.find(i => i.item_type === 'loan')?.total || 0;

      // Get basic salary
      const [line] = await db.sequelize.query(`
        SELECT basic_salary FROM payroll_lines WHERE payroll_line_id = ?
      `, {
        replacements: [payrollLine.payroll_line_id],
        type: db.Sequelize.QueryTypes.SELECT
      });

      const netPay = parseFloat(line.basic_salary) + parseFloat(allowances) - parseFloat(deductions) - parseFloat(loans);

      // Update payroll line
      await db.sequelize.query(`
        UPDATE payroll_lines 
        SET total_allowances = ?, total_deductions = ?, total_loans = ?, net_pay = ?
        WHERE payroll_line_id = ?
      `, {
        replacements: [allowances, deductions, loans, netPay, payrollLine.payroll_line_id],
        type: db.Sequelize.QueryTypes.UPDATE
      });

      // Recalculate period totals
      const [periodTotals] = await db.sequelize.query(`
        SELECT 
          SUM(basic_salary) as total_basic,
          SUM(total_allowances) as total_allowances,
          SUM(total_deductions) as total_deductions,
          SUM(net_pay) as total_net
        FROM payroll_lines
        WHERE period_id = ?
      `, {
        replacements: [periodId],
        type: db.Sequelize.QueryTypes.SELECT
      });

      await db.sequelize.query(`
        UPDATE payroll_periods
        SET total_basic_salary = ?, total_allowances = ?, total_deductions = ?, total_net_pay = ?
        WHERE period_id = ?
      `, {
        replacements: [
          periodTotals.total_basic,
          periodTotals.total_allowances,
          periodTotals.total_deductions,
          periodTotals.total_net,
          periodId
        ],
        type: db.Sequelize.QueryTypes.UPDATE
      });

      res.json({
        success: true,
        message: `${item_type === 'allowance' ? 'Allowance' : 'Deduction'} added successfully`,
        data: { net_pay: netPay }
      });

    } catch (error) {
      console.error('Error adding one-time item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add item',
        error: error.message
      });
    }
  }

  // Return payroll for correction
  static async returnForCorrection(req, res) {
    try {
      const { periodId } = req.params;
      const { reason, notes } = req.body;
      const actor_id = req.user.staff_id || req.user.id || req.user.user_id;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      console.log('Returning payroll for correction with:', { periodId, actor_id, school_id, reason, notes, user: req.user });

      if (!actor_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found in request. Please ensure you are properly authenticated.'
        });
      }

      // Find the payroll period
      const period = await PayrollPeriod.findByPk(periodId);

      if (!period) {
        return res.status(404).json({
          success: false,
          message: 'Payroll period not found'
        });
      }

      // Check if period can be returned for correction
      if (!['initiated', 'approved'].includes(period.status)) {
        return res.status(400).json({
          success: false,
          message: `Payroll cannot be returned for correction in current status: ${period.status}`
        });
      }

      // Check if any salaries have been disbursed
      const disbursedCount = await PayrollLine.count({
        where: {
          period_id: periodId,
          is_processed: true
        }
      });

      if (disbursedCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot return payroll for correction after salaries have been disbursed'
        });
      }

      // Update period status to draft for correction
      const oldStatus = period.status;
      await period.update({
        status: 'draft',
        notes: `${period.notes || ''} | Returned for correction by ${req.user.name || 'User'}: ${reason || notes || 'No reason provided'}`
      });

      console.log(`Payroll period ${periodId} status changed from ${oldStatus} to draft`);

      res.json({
        success: true,
        message: 'Payroll period returned for correction successfully',
        data: {
          period_id: periodId,
          old_status: oldStatus,
          new_status: 'draft',
          reason: reason || notes || 'No reason provided'
        }
      });

    } catch (error) {
      console.error('Error returning payroll for correction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to return payroll for correction',
        error: error.message
      });
    }
  }

  // Get Payroll Periods
  static async getPeriods(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      // Use raw SQL to avoid model association issues
      const periods = await sequelize.query(`
        SELECT 
          period_id, period_month, period_year, period_month_num, status,
          total_staff, total_basic_salary, total_allowances, total_deductions,
          total_net_pay, initiated_by, initiated_at, school_id, branch_id,
          notes, created_at, updated_at
        FROM payroll_periods
        WHERE school_id = :school_id
        ${status ? 'AND status = :status' : ''}
        ORDER BY period_month DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { 
          school_id, 
          ...(status && { status }),
          limit: parseInt(limit),
          offset: (page - 1) * limit
        },
        type: sequelize.QueryTypes.SELECT
      });

      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM payroll_periods
        WHERE school_id = :school_id
        ${status ? 'AND status = :status' : ''}
      `, {
        replacements: { 
          school_id, 
          ...(status && { status })
        },
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: periods,
        pagination: {
          total: countResult.total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult.total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching periods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payroll periods',
        error: error.message
      });
    }
  }

  static async getEnrolledStaff(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user.branch_id || null;

      // Use raw SQL to get enrolled staff with proper field mapping (using subqueries to avoid cartesian product)
      const enrolledStaff = await db.sequelize.query(`
        SELECT
          s.id as staff_id,
          s.name,
          s.email,
          s.mobile_no,
          s.payroll_status,
          s.date_enrolled,
          s.grade_id,
          s.step,
          g.grade_name,
          g.grade_code,
          g.basic_salary,
          g.increment_rate,
          CASE
            WHEN g.basic_salary IS NOT NULL AND s.step IS NOT NULL THEN
              g.basic_salary + (COALESCE(s.step, 1) - 1) * COALESCE(g.increment_rate, 0)
            WHEN g.basic_salary IS NOT NULL THEN
              g.basic_salary
            ELSE
              0
          END as calculated_basic_salary,
          COALESCE((
            SELECT SUM(
              CASE 
                WHEN sa.percentage IS NOT NULL THEN 
                  (CASE
                    WHEN s.grade_id IS NOT NULL AND s.step IS NOT NULL THEN
                      (g.basic_salary + (COALESCE(s.step, 1) - 1) * COALESCE(g.increment_rate, 0)) * sa.percentage / 100
                    WHEN s.grade_id IS NOT NULL THEN
                      g.basic_salary * sa.percentage / 100
                    ELSE 0
                  END)
                ELSE sa.amount
              END
            )
            FROM staff_allowances sa 
            WHERE sa.staff_id = s.id 
            AND (sa.end_date IS NULL OR sa.end_date >= CURDATE())
            AND sa.effective_date <= CURDATE()
          ), 0) as total_allowances,
          COALESCE((SELECT SUM(amount) FROM staff_deductions sd 
            WHERE sd.staff_id = s.id 
            AND (sd.end_date IS NULL OR sd.end_date >= CURDATE())
            AND sd.effective_date <= CURDATE()), 0) as total_deductions,
          COALESCE((SELECT SUM(monthly_deduction) FROM loans l 
            WHERE l.staff_id = s.id 
            AND l.status = 'active'
            AND l.balance_remaining > 0), 0) as total_loans,
          (
            CASE
              WHEN g.basic_salary IS NOT NULL AND s.step IS NOT NULL THEN
                g.basic_salary + (COALESCE(s.step, 1) - 1) * COALESCE(g.increment_rate, 0)
              WHEN g.basic_salary IS NOT NULL THEN
                g.basic_salary
              ELSE
                0
            END + COALESCE((
              SELECT SUM(
                CASE 
                  WHEN sa.percentage IS NOT NULL THEN 
                    (CASE
                      WHEN s.grade_id IS NOT NULL AND s.step IS NOT NULL THEN
                        (g.basic_salary + (COALESCE(s.step, 1) - 1) * COALESCE(g.increment_rate, 0)) * sa.percentage / 100
                      WHEN s.grade_id IS NOT NULL THEN
                        g.basic_salary * sa.percentage / 100
                      ELSE 0
                    END)
                  ELSE sa.amount
                END
              )
              FROM staff_allowances sa 
              WHERE sa.staff_id = s.id 
              AND (sa.end_date IS NULL OR sa.end_date >= CURDATE())
              AND sa.effective_date <= CURDATE()
            ), 0)
            - (
                COALESCE((SELECT SUM(amount) FROM staff_deductions sd 
                  WHERE sd.staff_id = s.id 
                  AND (sd.end_date IS NULL OR sd.end_date >= CURDATE())
                  AND sd.effective_date <= CURDATE()), 0)
                + COALESCE((SELECT SUM(monthly_deduction) FROM loans l 
                  WHERE l.staff_id = s.id 
                  AND l.status = 'active'
                  AND l.balance_remaining > 0), 0)
              )
          ) as net_pay
        FROM teachers s
        LEFT JOIN grade_levels g ON s.grade_id = g.grade_id
        WHERE s.school_id = :school_id
        ${branch_id ? 'AND s.branch_id = :branch_id' : ''}
        AND s.payroll_status = 'Enrolled'
        ORDER BY s.name
      `, {
        replacements: branch_id ? { school_id, branch_id } : { school_id },
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Debug: Log the structure of enrolled staff
      if (enrolledStaff && enrolledStaff.length > 0) {
        console.log('Enrolled staff structure (first record):', {
          staff_id: enrolledStaff[0].staff_id,
          name: enrolledStaff[0].name,
          keys: Object.keys(enrolledStaff[0])
        });
      }

      // Calculate summary statistics
      const totalStaff = enrolledStaff.length;
      const totalNetPayroll = enrolledStaff.reduce((sum, staff) => 
        sum + parseFloat(staff.net_pay || 0), 0
      );
      
      res.json({ 
        success: true, 
        data: { 
          staff: enrolledStaff,
          summary: {
            total_staff: totalStaff,
            enrolled_staff: totalStaff,
            suspended_staff: 0,
            net_payroll: totalNetPayroll
          }
        } 
      });
    } catch (error) {
      console.error('Error fetching enrolled staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch enrolled staff',
        error: error.message
      });
    }
  }

  // Get Period Details
  static async getPeriodDetails(req, res) {
    try {
      const { periodId } = req.params;
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user.branch_id;

      const [period] = await sequelize.query(`
        SELECT * FROM payroll_periods 
        WHERE period_id = :periodId AND school_id = :school_id
      `, {
        replacements: { periodId, school_id },
        type: sequelize.QueryTypes.SELECT
      });

      if (!period) {
        return res.status(404).json({ 
          success: false, 
          message: 'Payroll period not found' 
        });
      }

      const payrollLines = await sequelize.query(`
        SELECT 
          pl.*,
          t.name as staff_name,
          t.email as staff_email,
          t.grade_id,
          t.step,
          gl.grade_name,
          gl.grade_code,
          gl.basic_salary as grade_basic_salary,
          gl.increment_rate
        FROM payroll_lines pl
        JOIN teachers t ON pl.staff_id = t.id
        LEFT JOIN grade_levels gl ON t.grade_id = gl.grade_id
        WHERE pl.period_id = :periodId 
          AND pl.school_id = :school_id
          AND pl.branch_id = :branch_id
        ORDER BY t.name
      `, {
        replacements: { periodId, school_id, branch_id },
        type: sequelize.QueryTypes.SELECT
      });

      res.json({ 
        success: true, 
        data: { 
          ...period, 
          payrollLines 
        } 
      });
    } catch (error) {
      console.error('Error fetching period details:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch period details', 
        error: error.message 
      });
    }
  }

  // Approve Payroll Period
  static async approvePeriod(req, res) {
    try {
      const { periodId } = req.params;
      const { notes } = req.body;
      const actor_id = req.user.staff_id || req.user.id || req.user.user_id;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      await sequelize.query(`
        UPDATE payroll_periods
        SET status = 'approved', approved_by = ?, approved_at = NOW(), notes = ?
        WHERE period_id = ? AND school_id = ?
      `, {
        replacements: [actor_id, notes || 'Approved for disbursement', periodId, school_id],
        type: sequelize.QueryTypes.UPDATE
      });

      res.json({
        success: true,
        message: 'Payroll period approved successfully'
      });

    } catch (error) {
      console.error('Error approving payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve payroll',
        error: error.message
      });
    }
  }

  // Delete Payroll Period
  static async deletePeriod(req, res) {
    try {
      const { periodId } = req.params;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      // Delete payroll items first (child of payroll_lines)
      await sequelize.query(`
        DELETE pi FROM payroll_items pi
        INNER JOIN payroll_lines pl ON pi.payroll_line_id = pl.payroll_line_id
        WHERE pl.period_id = ?
      `, {
        replacements: [periodId],
        type: sequelize.QueryTypes.DELETE
      });

      // Delete payroll lines
      await sequelize.query(`
        DELETE FROM payroll_lines WHERE period_id = ?
      `, {
        replacements: [periodId],
        type: sequelize.QueryTypes.DELETE
      });

      // Delete the period
      await sequelize.query(`
        DELETE FROM payroll_periods 
        WHERE period_id = ? AND school_id = ?
      `, {
        replacements: [periodId, school_id],
        type: sequelize.QueryTypes.DELETE
      });

      res.json({
        success: true,
        message: 'Payroll period deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting payroll period:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete payroll period',
        error: error.message
      });
    }
  }

  // Placeholder methods for routes that exist but aren't implemented yet
  static async getStaffPayrollHistory(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getPayslip(req, res) {
    try {
      const { staffId, periodId } = req.params;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      // Get payroll line with staff details
      const [payrollLine] = await sequelize.query(`
        SELECT 
          pl.*,
          pp.period_month,
          pp.period_year,
          t.name as staff_name,
          t.email as staff_email,
          t.mobile_no,
          t.grade_id,
          t.step,
          gl.grade_name,
          gl.grade_code,
          gl.basic_salary as grade_basic_salary
        FROM payroll_lines pl
        JOIN payroll_periods pp ON pl.period_id = pp.period_id
        JOIN teachers t ON pl.staff_id = t.id
        LEFT JOIN grade_levels gl ON t.grade_id = gl.grade_id
        WHERE pl.staff_id = ? AND pl.period_id = ? AND pl.school_id = ?
      `, {
        replacements: [staffId, periodId, school_id],
        type: sequelize.QueryTypes.SELECT
      });

      if (!payrollLine) {
        return res.status(404).json({
          success: false,
          message: 'Payslip not found for the specified staff and period'
        });
      }

      // Get detailed breakdown from payroll_items
      const payrollItems = await sequelize.query(`
        SELECT 
          item_type,
          item_id,
          item_name,
          amount,
          calculation_base,
          rate,
          notes
        FROM payroll_items
        WHERE payroll_line_id = ?
        ORDER BY 
          CASE item_type 
            WHEN 'basic_salary' THEN 1
            WHEN 'allowance' THEN 2
            WHEN 'deduction' THEN 3
            WHEN 'loan' THEN 4
          END,
          item_name
      `, {
        replacements: [payrollLine.payroll_line_id],
        type: sequelize.QueryTypes.SELECT
      });

      // Group items by type for better presentation
      const breakdown = {
        basic_salary: [],
        allowances: [],
        deductions: [],
        loans: []
      };

      payrollItems.forEach(item => {
        if (item.item_type === 'basic_salary') {
          breakdown.basic_salary.push(item);
        } else if (item.item_type === 'allowance') {
          breakdown.allowances.push(item);
        } else if (item.item_type === 'deduction') {
          breakdown.deductions.push(item);
        } else if (item.item_type === 'loan') {
          breakdown.loans.push(item);
        }
      });

      // Calculate totals for verification
      const calculatedTotals = {
        basic_salary: breakdown.basic_salary.reduce((sum, item) => sum + parseFloat(item.amount), 0),
        allowances: breakdown.allowances.reduce((sum, item) => sum + parseFloat(item.amount), 0),
        deductions: breakdown.deductions.reduce((sum, item) => sum + parseFloat(item.amount), 0),
        loans: breakdown.loans.reduce((sum, item) => sum + parseFloat(item.amount), 0)
      };

      calculatedTotals.gross_pay = calculatedTotals.basic_salary + calculatedTotals.allowances;
      calculatedTotals.total_deductions = calculatedTotals.deductions + calculatedTotals.loans;
      calculatedTotals.net_pay = calculatedTotals.gross_pay - calculatedTotals.total_deductions;

      res.json({
        success: true,
        data: {
          payroll_info: {
            period_month: payrollLine.period_month,
            period_year: payrollLine.period_year,
            staff_id: payrollLine.staff_id,
            staff_name: payrollLine.staff_name,
            staff_email: payrollLine.staff_email,
            mobile_no: payrollLine.mobile_no,
            grade_name: payrollLine.grade_name,
            grade_code: payrollLine.grade_code,
            step: payrollLine.step,
            is_processed: payrollLine.is_processed
          },
          salary_breakdown: breakdown,
          summary: {
            basic_salary: parseFloat(payrollLine.basic_salary),
            total_allowances: parseFloat(payrollLine.total_allowances),
            gross_pay: parseFloat(payrollLine.gross_pay),
            total_deductions: parseFloat(payrollLine.total_deductions),
            total_loans: parseFloat(payrollLine.total_loans || 0),
            net_pay: parseFloat(payrollLine.net_pay)
          },
          calculated_totals: calculatedTotals,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error generating payslip:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate payslip',
        error: error.message
      });
    }
  }

  static async getAllPayslips(req, res) {
    try {
      const { periodId } = req.params;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      // Get all payroll lines for the period with staff details
      const payrollLines = await sequelize.query(`
        SELECT 
          pl.*,
          pp.period_month,
          pp.period_year,
          t.name as staff_name,
          t.email as staff_email,
          t.grade_id,
          gl.grade_name,
          gl.grade_code
        FROM payroll_lines pl
        JOIN payroll_periods pp ON pl.period_id = pp.period_id
        JOIN teachers t ON pl.staff_id = t.id
        LEFT JOIN grade_levels gl ON t.grade_id = gl.grade_id
        WHERE pl.period_id = ? AND pl.school_id = ?
        ORDER BY t.name
      `, {
        replacements: [periodId, school_id],
        type: sequelize.QueryTypes.SELECT
      });

      if (!payrollLines || payrollLines.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No payslips found for the specified period'
        });
      }

      // Get breakdown counts for each payroll line
      const payrollLineIds = payrollLines.map(line => line.payroll_line_id);
      const itemCounts = await sequelize.query(`
        SELECT 
          payroll_line_id,
          item_type,
          COUNT(*) as item_count,
          SUM(amount) as total_amount
        FROM payroll_items
        WHERE payroll_line_id IN (:payrollLineIds)
        GROUP BY payroll_line_id, item_type
      `, {
        replacements: { payrollLineIds },
        type: sequelize.QueryTypes.SELECT
      });

      // Group item counts by payroll line
      const itemCountsByLine = {};
      itemCounts.forEach(count => {
        if (!itemCountsByLine[count.payroll_line_id]) {
          itemCountsByLine[count.payroll_line_id] = {};
        }
        itemCountsByLine[count.payroll_line_id][count.item_type] = {
          count: count.item_count,
          total: parseFloat(count.total_amount)
        };
      });

      // Enhance payroll lines with breakdown info
      const enhancedPayslips = payrollLines.map(line => ({
        ...line,
        breakdown_available: itemCountsByLine[line.payroll_line_id] ? true : false,
        breakdown_summary: itemCountsByLine[line.payroll_line_id] || {},
        payslip_url: `/payroll/payslip/${line.staff_id}/${periodId}`
      }));

      res.json({
        success: true,
        data: {
          period_info: {
            period_id: periodId,
            period_month: payrollLines[0].period_month,
            period_year: payrollLines[0].period_year
          },
          payslips: enhancedPayslips,
          summary: {
            total_staff: payrollLines.length,
            total_basic_salary: payrollLines.reduce((sum, line) => sum + parseFloat(line.basic_salary), 0),
            total_allowances: payrollLines.reduce((sum, line) => sum + parseFloat(line.total_allowances), 0),
            total_deductions: payrollLines.reduce((sum, line) => sum + parseFloat(line.total_deductions), 0),
            total_loans: payrollLines.reduce((sum, line) => sum + parseFloat(line.total_loans || 0), 0),
            total_net_pay: payrollLines.reduce((sum, line) => sum + parseFloat(line.net_pay), 0)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching payslips:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payslips',
        error: error.message
      });
    }
  }

  static async enrollStaff(req, res) {
    try {
      const { staffId } = req.params;
      const { grade_id, step_number, effective_date } = req.body;
      const actor_id = req.user.id;

      const staff = await Staff.findByPk(staffId);
      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff not found'
        });
      }

      // Update staff payroll status
      await staff.update({
        payroll_status: 'enrolled',
        grade_id,
        step: step_number,
        date_enrolled: effective_date || new Date(),
        date_suspended: null
      });

      res.json({
        success: true,
        message: 'Staff enrolled in payroll successfully'
      });

    } catch (error) {
      console.error('Error enrolling staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enroll staff',
        error: error.message
      });
    }
  }

  static async suspendStaff(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async syncAdminUsers(req, res) {
    try {
      const AdminTeacherSync = require('../utils/AdminTeacherSync');
      const schoolId = req.headers['x-school-id'] || req.user.school_id;
      const branchId = req.headers['x-branch-id'] || req.user.branch_id;

      const result = await AdminTeacherSync.syncAdminUsers(schoolId, branchId);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          added: result.added
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to sync admin users',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in syncAdminUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  static async getAdminUsersToSync(req, res) {
    try {
      const AdminTeacherSync = require('../utils/AdminTeacherSync');
      const schoolId = req.headers['x-school-id'] || req.user.school_id;
      const branchId = req.headers['x-branch-id'] || req.user.branch_id;

      const result = await AdminTeacherSync.getAdminUsersToSync(schoolId, branchId);
      
      if (result.success) {
        res.json({
          success: true,
          admins: result.admins,
          count: result.count
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get admin users',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in getAdminUsersToSync:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  static async addAdminUsersToTeachers(req, res) {
    try {
      const AdminTeacherSync = require('../utils/AdminTeacherSync');
      const { adminUsers } = req.body;

      if (!adminUsers || !Array.isArray(adminUsers)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin users data'
        });
      }

      const result = await AdminTeacherSync.addAdminUsersToTeachers(adminUsers);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          added: result.added
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to add admin users',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in addAdminUsersToTeachers:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // Additional placeholder methods for all the routes
  static async promoteStaff(req, res) {
    try {
      const { staffId } = req.params;
      const { grade_id, step_number, effective_date } = req.body;
      const actor_id = req.user.id;

      const staff = await Staff.findByPk(staffId);
      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff not found'
        });
      }

      // Check if staff is enrolled in payroll (case-insensitive)
      if (!staff.payroll_status || staff.payroll_status.toLowerCase() !== 'enrolled') {
        return res.status(400).json({
          success: false,
          message: 'Staff must be enrolled in payroll before promotion'
        });
      }

      // Update staff with new grade/step
      await staff.update({
        grade_id,
        step: step_number,
        date_enrolled: effective_date || new Date()
      });

      res.json({
        success: true,
        message: 'Staff promoted successfully'
      });

    } catch (error) {
      console.error('Error promoting staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to promote staff',
        error: error.message
      });
    }
  }

  static async unenrollStaff(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async terminateStaff(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getAllStaff(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user.branch_id || null;

      // Get all staff (teachers) with their payroll information and complete grade level details
      const allStaff = await db.sequelize.query(`
        SELECT
          s.id as staff_id,
          s.name,
          s.staff_role,
          s.email,
          s.mobile_no,
          COALESCE(s.payroll_status, 'Not Enrolled') as payroll_status,
          s.date_enrolled,
          s.grade_id,
          s.step,
          g.grade_id as grade_level_id,
          g.grade_name,
          g.grade_code,
          g.description as grade_description,
          g.basic_salary as grade_basic_salary,
          g.increment_rate,
          g.minimum_years_for_increment,
          g.maximum_steps,
          g.notes as grade_notes,
          g.effective_date as grade_effective_date,
          g.is_active as grade_is_active,
          g.school_id as grade_school_id,
          g.branch_id as grade_branch_id,
          s.step as step_number,
          CASE
            WHEN s.grade_id IS NOT NULL AND s.step IS NOT NULL THEN
              g.basic_salary + (COALESCE(s.step, 1) - 1) * COALESCE(g.increment_rate, 0)
            WHEN s.grade_id IS NOT NULL THEN
              g.basic_salary
            ELSE
              NULL
          END as calculated_basic_salary,
          COALESCE((
            SELECT SUM(
              CASE 
                WHEN sa.percentage IS NOT NULL THEN 
                  (CASE
                    WHEN s.grade_id IS NOT NULL AND s.step IS NOT NULL THEN
                      (g.basic_salary + (COALESCE(s.step, 1) - 1) * COALESCE(g.increment_rate, 0)) * sa.percentage / 100
                    WHEN s.grade_id IS NOT NULL THEN
                      g.basic_salary * sa.percentage / 100
                    ELSE 0
                  END)
                ELSE sa.amount
              END
            )
            FROM staff_allowances sa
            WHERE sa.staff_id = s.id
              AND (sa.end_date IS NULL OR sa.end_date >= CURDATE())
              AND sa.effective_date <= CURDATE()
          ), 0) as total_allowances,
          COALESCE(SUM(sd.amount), 0) as total_deductions
        FROM teachers s
        LEFT JOIN grade_levels g ON s.grade_id = g.grade_id
        LEFT JOIN staff_deductions sd ON s.id = sd.staff_id
          AND (sd.end_date IS NULL OR sd.end_date >= CURDATE())
          AND sd.effective_date <= CURDATE()
        WHERE s.school_id = :school_id
        ${branch_id ? 'AND s.branch_id = :branch_id' : ''}
        GROUP BY s.id, s.name, s.staff_role, s.email, s.mobile_no, s.payroll_status,
                 s.date_enrolled, s.grade_id, s.step,
                 g.grade_id, g.grade_name, g.grade_code, g.description, g.basic_salary,
                 g.increment_rate, g.minimum_years_for_increment, g.maximum_steps,
                 g.notes, g.effective_date, g.is_active, g.school_id, g.branch_id
        ORDER BY s.name
      `, {
        replacements: branch_id ? { school_id, branch_id } : { school_id },
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Transform the results to include grade_level as a nested object
      const transformedStaff = allStaff.map(staff => {
        const result = {
          id: staff.staff_id,
          staff_id: staff.staff_id,
          first_name: staff.name,
          name: staff.name,
          staff_role: staff.staff_role,
          email: staff.email,
          mobile_no: staff.mobile_no,
          payroll_status: staff.payroll_status,
          date_enrolled: staff.date_enrolled,
          grade_id: staff.grade_id,
          step: staff.step,
          step_number: staff.step_number,
          calculated_basic_salary: staff.calculated_basic_salary,
          total_allowances: staff.total_allowances,
          total_deductions: staff.total_deductions,
          grade_level: null
        };

        // Only include grade_level object if staff has a grade assigned
        if (staff.grade_id && staff.grade_level_id) {
          result.grade = {
            grade_id: staff.grade_level_id,
            grade_name: staff.grade_name,
            grade_code: staff.grade_code,
            description: staff.grade_description,
            basic_salary: staff.grade_basic_salary,
            increment_rate: staff.increment_rate,
            minimum_years_for_increment: staff.minimum_years_for_increment,
            maximum_steps: staff.maximum_steps,
            notes: staff.grade_notes,
            effective_date: staff.grade_effective_date,
            is_active: staff.grade_is_active,
            school_id: staff.grade_school_id,
            branch_id: staff.grade_branch_id
          };
        }

        return result;
      });

      const totalStaff = transformedStaff.length;
      const enrolledStaff = transformedStaff.filter(s => s.payroll_status?.toLowerCase() === 'enrolled').length;
      const suspendedStaff = transformedStaff.filter(s => s.payroll_status?.toLowerCase() === 'suspended').length;
      const totalNetPayroll = transformedStaff.reduce((sum, s) => sum + parseFloat(s.net_pay || 0), 0);

      res.json({ 
        success: true, 
        data: { 
          staff: transformedStaff,
          summary: {
            total_staff: totalStaff,
            enrolled_staff: enrolledStaff,
            suspended_staff: suspendedStaff,
            net_payroll: totalNetPayroll
          }
        } 
      });
    } catch (error) {
      console.error('Error fetching all staff:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching all staff',
        error: error.message
      });
    }
  }

  // Allowances
  static async getAllowanceTypes(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const allowances = await db.AllowanceType.findAll({ where: { is_active: true, school_id } });
      return res.json({ success: true, data: allowances });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createAllowanceType(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const allowance = await db.AllowanceType.create({ ...req.body, school_id });
      return res.json({ success: true, data: allowance });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateAllowanceType(req, res) {
    try {
      const { allowanceId } = req.params;
      const allowance = await db.AllowanceType.findByPk(allowanceId);
      if (!allowance) return res.status(404).json({ success: false, message: 'Allowance type not found' });
      await allowance.update(req.body);
      return res.json({ success: true, data: allowance });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteAllowanceType(req, res) {
    try {
      const { allowanceId } = req.params;
      const allowance = await db.AllowanceType.findByPk(allowanceId);
      if (!allowance) return res.status(404).json({ success: false, message: 'Allowance type not found' });
      // Soft delete by setting is_active = false if column exists
      if (typeof allowance.is_active !== 'undefined') {
        await allowance.update({ is_active: false });
      } else {
        await allowance.destroy();
      }
      return res.json({ success: true, message: 'Allowance type removed' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getDeductionTypes(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const deductions = await DeductionType.findAll({ where: { is_active: true, school_id } });
      return res.json({ success: true, data: deductions });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createDeductionType(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const deduction = await DeductionType.create({ ...req.body, school_id });
      return res.json({ success: true, data: deduction });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateDeductionType(req, res) {
    try {
      const { deductionId } = req.params;
      const deduction = await DeductionType.findByPk(deductionId);
      if (!deduction) return res.status(404).json({ success: false, message: 'Deduction type not found' });
      await deduction.update(req.body);
      return res.json({ success: true, data: deduction });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteDeductionType(req, res) {
    try {
      const { deductionId } = req.params;
      const deduction = await DeductionType.findByPk(deductionId);
      if (!deduction) return res.status(404).json({ success: false, message: 'Deduction type not found' });
      if (typeof deduction.is_active !== 'undefined') {
        await deduction.update({ is_active: false });
      } else {
        await deduction.destroy();
      }
      return res.json({ success: true, message: 'Deduction type removed' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Staff Allowances
  static async getStaffAllowances(req, res) {
    try {
      const { staffId } = req.params;
      
      const allowances = await db.sequelize.query(`
        SELECT sa.*, at.allowance_name, at.allowance_code
        FROM staff_allowances sa
        JOIN allowance_types at ON sa.allowance_id = at.allowance_id
        WHERE sa.staff_id = ?
        ORDER BY sa.created_at DESC
      `, {
        replacements: [staffId],
        type: db.Sequelize.QueryTypes.SELECT
      });
      
      return res.json({ success: true, data: allowances });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async assignAllowance(req, res) {
    try {
      const { staffId } = req.params;
      const { allowance_id, amount, percentage, effective_date, end_date, notes } = req.body;

      const staff = await Staff.findByPk(staffId);
      if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

      const assignment = await StaffAllowance.create({
        staff_id: staffId,
        allowance_id,
        amount: amount || null,
        percentage: percentage || null,
        effective_date,
        end_date: end_date || null,
        notes: notes || '',
        is_active: 1
      });
      return res.json({ success: true, message: 'Allowance assigned', data: assignment });
    } catch (err) {
      let errorMessage = 'Failed to assign allowance';
      
      if (err.name === 'SequelizeUniqueConstraintError' || 
          (err.original && err.original.code === 'ER_DUP_ENTRY')) {
        errorMessage = 'This allowance is already assigned to this staff member';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      return res.status(400).json({ success: false, message: errorMessage });
    }
  }

  static async removeAllowance(req, res) {
    try {
      const { staffId, allowanceId } = req.params;
      const assignment = await StaffAllowance.findOne({
        where: { staff_id: staffId, allowance_id: allowanceId }
      });
      if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
      await assignment.destroy();
      return res.json({ success: true, message: 'Allowance removed' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Deductions
  static async getStaffDeductions(req, res) {
    try {
      const { staffId } = req.params;
      const staff = await Staff.findByPk(staffId, { 
        include: [{
          model: DeductionType,
          as: 'deductions',
          through: { attributes: ['id', 'effective_date', 'end_date', 'amount', 'percentage', 'notes', 'created_at', 'updated_at'] }
        }]
      });
      if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
      return res.json({ success: true, data: staff.deductions });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async assignDeduction(req, res) {
    try {
      const { staffId } = req.params;
      const { deduction_id, amount, percentage, effective_date, end_date, notes } = req.body;

      const staff = await Staff.findByPk(staffId);
      if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

      const assignment = await StaffDeduction.create({
        staff_id: staffId,
        deduction_id,
        amount: amount !== undefined && amount !== null ? amount : null,
        percentage: percentage || null,
        effective_date,
        end_date: end_date || null,
        notes: notes || '',
        is_active: 1
      });
      return res.json({ success: true, message: 'Deduction assigned', data: assignment });
    } catch (err) {
      let errorMessage = 'Failed to assign deduction';
      
      if (err.name === 'SequelizeUniqueConstraintError' || 
          (err.original && err.original.code === 'ER_DUP_ENTRY')) {
        errorMessage = 'This deduction is already assigned to this staff member';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      return res.status(400).json({ success: false, message: errorMessage });
    }
  }

  static async removeDeduction(req, res) {
    try {
      const { deductionId } = req.params; // treat as staff_deduction_id
      const assignment = await StaffDeduction.findByPk(deductionId);
      if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
      if (typeof assignment.is_active !== 'undefined') {
        await assignment.update({ is_active: 0 });
      } else {
        await assignment.destroy();
      }
      return res.json({ success: true, message: 'Deduction assignment removed' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getAllowancePackages(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      const packages = await db.sequelize.query(
        `SELECT 
          ap.*,
          GROUP_CONCAT(api.allowance_id) as allowance_ids,
          GROUP_CONCAT(at.allowance_name) as allowance_names
         FROM allowance_packages ap
         LEFT JOIN allowance_package_items api ON ap.package_id = api.package_id
         LEFT JOIN allowance_types at ON api.allowance_id = at.allowance_id
         WHERE ap.school_id = ?
         GROUP BY ap.package_id
         ORDER BY ap.created_at DESC`,
        {
          replacements: [school_id],
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      // Parse allowance_ids and allowance_names into proper format
      const formattedPackages = packages.map(pkg => {
        const ids = pkg.allowance_ids ? pkg.allowance_ids.split(',').map(Number) : [];
        const names = pkg.allowance_names ? pkg.allowance_names.split(',') : [];
        
        const allowances = ids.map((id, index) => ({
          allowance_id: id,
          allowance_name: names[index] || ''
        }));

        return {
          ...pkg,
          allowances,
          allowance_count: allowances.length
        };
      });

      res.json({
        success: true,
        data: formattedPackages
      });
    } catch (error) {
      console.error('Error fetching allowance packages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch allowance packages',
        error: error.message
      });
    }
  }

  static async createAllowancePackage(req, res) {
    try {
      const { package_name, package_code, description, allowances, is_active } = req.body;
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user.branch_id;

      // Create package
      const [packageResult] = await db.sequelize.query(
        `INSERT INTO allowance_packages (package_name, package_code, description, school_id, branch_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        {
          replacements: [package_name, package_code, description, school_id, branch_id, is_active ? 1 : 0],
          type: db.sequelize.QueryTypes.INSERT
        }
      );

      const packageId = packageResult;

      // Add allowances to package
      if (allowances && allowances.length > 0) {
        const values = allowances.map(allowanceId => 
          `(${packageId}, ${allowanceId}, NOW())`
        ).join(',');
        
        await db.sequelize.query(
          `INSERT INTO allowance_package_items (package_id, allowance_id, created_at) VALUES ${values}`
        );
      }

      res.json({
        success: true,
        message: 'Allowance package created successfully',
        package_id: packageId
      });
    } catch (error) {
      console.error('Error creating allowance package:', error);
      
      let errorMessage = 'Failed to create allowance package';
      if (error.name === 'SequelizeUniqueConstraintError' || 
          (error.original && error.original.code === 'ER_DUP_ENTRY')) {
        errorMessage = 'An allowance package with this code already exists';
      }
      
      res.status(400).json({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }
  }

  static async updateAllowancePackage(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async deleteAllowancePackage(req, res) {
    try {
      const { packageId } = req.params;

      // Delete package items first
      await db.sequelize.query(
        `DELETE FROM allowance_package_items WHERE package_id = ?`,
        { replacements: [packageId] }
      );

      // Delete package
      await db.sequelize.query(
        `DELETE FROM allowance_packages WHERE package_id = ?`,
        { replacements: [packageId] }
      );

      res.json({
        success: true,
        message: 'Allowance package deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting allowance package:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete allowance package',
        error: error.message
      });
    }
  }

  // One-Time Item Templates
  static async getOneTimeTemplates(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      
      const templates = await db.sequelize.query(`
        SELECT * FROM onetime_item_templates
        WHERE school_id = ? AND is_active = 1
        ORDER BY item_type, template_name
      `, {
        replacements: [school_id],
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createOneTimeTemplate(req, res) {
    try {
      const { template_name, item_type, calculation_type, amount_per_unit, fixed_amount, unit_label, description } = req.body;
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user.branch_id;

      const [result] = await db.sequelize.query(`
        INSERT INTO onetime_item_templates 
        (template_name, item_type, calculation_type, amount_per_unit, fixed_amount, unit_label, description, school_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [template_name, item_type, calculation_type, amount_per_unit, fixed_amount, unit_label, description, school_id, branch_id],
        type: db.Sequelize.QueryTypes.INSERT
      });

      res.json({ success: true, message: 'Template created', template_id: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateOneTimeTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      
      await db.sequelize.query(
        'UPDATE onetime_item_templates SET template_name = ?, item_type = ?, calculation_type = ?, amount_per_unit = ?, unit_label = ?, description = ?, updated_at = NOW() WHERE template_id = ? AND school_id = ?',
        {
          replacements: [req.body.template_name, req.body.item_type, req.body.calculation_type, req.body.amount_per_unit || null, req.body.unit_label || null, req.body.description || null, templateId, school_id],
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );
      
      res.json({ success: true, message: 'Template updated' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteOneTimeTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      
      await db.sequelize.query(
        'UPDATE onetime_item_templates SET is_active = 0 WHERE template_id = ? AND school_id = ?',
        {
          replacements: [templateId, school_id],
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );
      
      res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async assignPackageToStaff(req, res) {
    try {
      const { staffId } = req.params;
      const { package_id, effective_date } = req.body;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      const mysqlDate = effective_date ? new Date(effective_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      // Get package items (allowances and deductions)
      const packageItems = await db.sequelize.query(`
        SELECT 
          api.item_type,
          api.allowance_id, 
          api.deduction_id,
          api.amount as package_amount, 
          api.percentage as package_percentage,
          at.allowance_name, 
          at.calculation_type as allowance_calc_type, 
          at.default_amount as allowance_default,
          dt.deduction_name,
          dt.calculation_type as deduction_calc_type,
          dt.default_amount as deduction_default
        FROM allowance_package_items api
        LEFT JOIN allowance_types at ON api.allowance_id = at.allowance_id
        LEFT JOIN deduction_types dt ON api.deduction_id = dt.deduction_id
        WHERE api.package_id = ?
      `, {
        replacements: [package_id],
        type: db.Sequelize.QueryTypes.SELECT
      });

      if (packageItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Package has no items'
        });
      }

      let allowanceCount = 0;
      let deductionCount = 0;

      for (const item of packageItems) {
        let amount = 0;
        let percentage = null;

        if (item.item_type === 'allowance') {
          // Handle allowance
          if (item.package_amount !== null) {
            amount = item.package_amount;
          } else if (item.package_percentage !== null) {
            percentage = item.package_percentage;
            amount = null;
          } else if (item.allowance_calc_type === 'percentage') {
            percentage = parseFloat(item.allowance_default) || 0;
            amount = null;
          } else {
            amount = parseFloat(item.allowance_default) || 0;
          }

          const query = percentage !== null
            ? `INSERT INTO staff_allowances (staff_id, allowance_id, percentage, effective_date, created_at, updated_at)
               VALUES (?, ?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE percentage = VALUES(percentage), effective_date = VALUES(effective_date), updated_at = NOW()`
            : `INSERT INTO staff_allowances (staff_id, allowance_id, amount, effective_date, created_at, updated_at)
               VALUES (?, ?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE amount = VALUES(amount), effective_date = VALUES(effective_date), updated_at = NOW()`;

          const params = percentage !== null
            ? [staffId, item.allowance_id, percentage, mysqlDate]
            : [staffId, item.allowance_id, amount, mysqlDate];

          await db.sequelize.query(query, {
            replacements: params,
            type: db.Sequelize.QueryTypes.INSERT
          });
          allowanceCount++;

        } else if (item.item_type === 'deduction') {
          // Handle deduction
          if (item.package_amount !== null) {
            amount = item.package_amount;
          } else if (item.package_percentage !== null) {
            percentage = item.package_percentage;
            amount = null;
          } else if (item.deduction_calc_type === 'percentage') {
            percentage = parseFloat(item.deduction_default) || 0;
            amount = null;
          } else {
            amount = parseFloat(item.deduction_default) || 0;
          }

          const query = percentage !== null
            ? `INSERT INTO staff_deductions (staff_id, deduction_id, percentage, effective_date, created_at, updated_at)
               VALUES (?, ?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE percentage = VALUES(percentage), effective_date = VALUES(effective_date), updated_at = NOW()`
            : `INSERT INTO staff_deductions (staff_id, deduction_id, amount, effective_date, created_at, updated_at)
               VALUES (?, ?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE amount = VALUES(amount), effective_date = VALUES(effective_date), updated_at = NOW()`;

          const params = percentage !== null
            ? [staffId, item.deduction_id, percentage, mysqlDate]
            : [staffId, item.deduction_id, amount, mysqlDate];

          await db.sequelize.query(query, {
            replacements: params,
            type: db.Sequelize.QueryTypes.INSERT
          });
          deductionCount++;
        }
      }

      res.json({
        success: true,
        message: `Package assigned: ${allowanceCount} allowances, ${deductionCount} deductions added.`
      });
    } catch (error) {
      console.error('Error assigning package:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign package',
        error: error.message
      });
    }
  }

  static async getGradePackages(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async assignPackageToGrade(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async removePackageFromGrade(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getAllStaffDeductions(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getLoans(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async createLoan(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async approveLoan(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async updateLoan(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async closeLoan(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async deleteLoan(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getPayrollSummary(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getBankSchedule(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async exportPayslips(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async exportExcel(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getDeductionReport(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getLoanReport(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getSalaryReport(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getSalaryAnalytics(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getSalaryComparison(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async exportSalaryReport(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getNetSalaryReport(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  // Create payroll journal entries for proper accounting
  static async createPayrollJournalEntries(payrollLine, period_month, school_id, branch_id, created_by, transaction) {
    try {
      // Ensure school_id and branch_id are always set
      school_id = school_id || payrollLine.school_id;
      branch_id = branch_id || payrollLine.branch_id || null;
      
      const reference = `PAYROLL-${period_month}-STAFF-${payrollLine.staff_id}`;
      const description = `Salary disbursement for staff ${payrollLine.staff_id} - ${period_month}`;
      
      // Get payroll items (allowances, deductions, loans) for this payroll line
      const payrollItems = await sequelize.query(`
        SELECT
          pi.item_type,
          pi.item_id,
          pi.item_name,
          pi.amount
        FROM payroll_items pi
        WHERE pi.payroll_line_id = :payroll_line_id
      `, {
        replacements: { payroll_line_id: payrollLine.payroll_line_id },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      // Group items by type
      const allowances = payrollItems.filter(item => item.item_type === 'allowance');
      const deductions = payrollItems.filter(item => item.item_type === 'deduction');
      const loans = payrollItems.filter(item => item.item_type === 'loan');

      const journal_entries = [];
      const payment_entries = [];
      let total_debits = 0;
      let total_credits = 0;

      // Calculate totals from actual payroll items instead of potentially incorrect payroll_lines totals
      const basic_salary = parseFloat(payrollLine.basic_salary || 0);
      const allowances_total = allowances.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const deductions_total = deductions.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const loans_total = loans.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      
      // Calculate gross salary (basic + allowances, but don't double-count basic salary if it's in allowances)
      const basic_in_allowances = allowances.find(item => item.item_id === 0 || item.item_name.toLowerCase().includes('basic'));
      const gross_salary = basic_in_allowances ? allowances_total : (basic_salary + allowances_total);
      
      console.log(`Staff ${payrollLine.staff_id} accounting breakdown:`, {
        basic_salary,
        allowances_total,
        deductions_total,
        loans_total,
        gross_salary,
        payroll_line_totals: {
          basic: payrollLine.basic_salary,
          allowances: payrollLine.total_allowances,
          deductions: payrollLine.total_deductions,
          loans: payrollLine.total_loans,
          net: payrollLine.net_pay
        }
      });

      // 1. DEBIT: Salary Expense (Gross Salary)
      if (gross_salary > 0) {
        journal_entries.push({
          reference,
          account_code: '5100', // Salary Expense
          account: 'Salary Expense',
          debit: gross_salary,
          credit: 0,
          description: `Gross salary expense - ${description}`,
          school_id,
          branch_id,
          created_by
        });
        total_debits += gross_salary;

        payment_entries.push({
          item_category: 'Payroll Expense',
          ref_no: reference,
          admission_no: null,
          class_code: null,
          academic_year: new Date().getFullYear(),
          term: 'Annual',
          dr: gross_salary,
          cr: 0,
          description: `Gross salary expense - Staff ${payrollLine.staff_id}`,
          school_id,
          branch_id,
          payment_mode: 'Bank Transfer',
          payment_status: 'Processed'
        });
      }

      // 2. CREDIT: Various Liability Accounts (Deductions)
      if (deductions_total > 0) {
        // Group deductions by type for proper accounting
        const deduction_groups = {};
        deductions.forEach(ded => {
          const key = ded.item_name;
          if (!deduction_groups[key]) {
            deduction_groups[key] = 0;
          }
          deduction_groups[key] += parseFloat(ded.amount || 0);
        });

        Object.entries(deduction_groups).forEach(([deduction_name, amount]) => {
          if (amount > 0) {
            let account_code = '2200'; // Default: Other Payables
            let account_name = 'Payroll Deductions Payable';
            
            // Map specific deductions to appropriate liability accounts
            if (deduction_name.toLowerCase().includes('tax') || deduction_name.toLowerCase().includes('paye')) {
              account_code = '2210';
              account_name = 'Tax Payable';
            } else if (deduction_name.toLowerCase().includes('pension') || deduction_name.toLowerCase().includes('retirement')) {
              account_code = '2220';
              account_name = 'Pension Contributions Payable';
            } else if (deduction_name.toLowerCase().includes('union') || deduction_name.toLowerCase().includes('dues')) {
              account_code = '2230';
              account_name = 'Union Dues Payable';
            }

            journal_entries.push({
              reference,
              account_code,
              account: account_name,
              debit: 0,
              credit: amount,
              description: `${deduction_name} deduction - ${description}`,
              school_id,
              branch_id,
              created_by
            });
            total_credits += amount;

            payment_entries.push({
              item_category: 'Payroll Deduction',
              ref_no: reference,
              admission_no: null,
              class_code: null,
              academic_year: new Date().getFullYear(),
              term: 'Annual',
              dr: 0,
              cr: amount,
              description: `${deduction_name} - Staff ${payrollLine.staff_id}`,
              school_id,
              branch_id,
              payment_mode: 'Deduction',
              payment_status: 'Processed'
            });
          }
        });
      }

      // 3. CREDIT: Loans Receivable (Loan Repayments)
      if (loans_total > 0) {
        journal_entries.push({
          reference,
          account_code: '1300', // Loans Receivable
          account: 'Staff Loans Receivable',
          debit: 0,
          credit: loans_total,
          description: `Loan repayment recovery - ${description}`,
          school_id,
          branch_id,
          created_by
        });
        total_credits += loans_total;

        payment_entries.push({
          item_category: 'Loan Recovery',
          ref_no: reference,
          admission_no: null,
          class_code: null,
          academic_year: new Date().getFullYear(),
          term: 'Annual',
          dr: 0,
          cr: loans_total,
          description: `Loan repayment - Staff ${payrollLine.staff_id}`,
          school_id,
          branch_id,
          payment_mode: 'Salary Deduction',
          payment_status: 'Processed'
        });
      }

      // 4. CREDIT: Cash/Bank Account (Net Pay) - Calculate as gross - deductions - loans
      const calculated_net_pay = gross_salary - deductions_total - loans_total;
      if (calculated_net_pay > 0) {
        journal_entries.push({
          reference,
          account_code: '1100', // Cash/Bank
          account: 'Bank Account',
          debit: 0,
          credit: calculated_net_pay,
          description: `Net salary payment - ${description}`,
          school_id,
          branch_id,
          created_by
        });
        total_credits += calculated_net_pay;

        payment_entries.push({
          item_category: 'Salary Payment',
          ref_no: reference,
          admission_no: null,
          class_code: null,
          academic_year: new Date().getFullYear(),
          term: 'Annual',
          dr: 0,
          cr: calculated_net_pay,
          description: `Net salary payment - Staff ${payrollLine.staff_id}`,
          school_id,
          branch_id,
          payment_mode: 'Bank Transfer',
          payment_status: 'Processed'
        });
      }

      // Verify accounting equation balance
      if (Math.abs(total_debits - total_credits) > 0.01) {
        throw new Error(`Journal entries not balanced: Debits=${total_debits.toFixed(2)}, Credits=${total_credits.toFixed(2)}`);
      }

      // Insert journal entries
      for (const entry of journal_entries) {
        await sequelize.query(`
          INSERT INTO journal_entries (
            reference, account_code, account, debit, credit, description,
            school_id, branch_id, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            entry.reference,
            entry.account_code,
            entry.account,
            entry.debit,
            entry.credit,
            entry.description,
            entry.school_id,
            entry.branch_id || null,
            entry.created_by
          ],
          type: sequelize.QueryTypes.INSERT,
          transaction
        });
      }

      // Insert payment entries for reporting
      for (const entry of payment_entries) {
        await sequelize.query(`
          INSERT INTO payment_entries (
            item_category, ref_no, admission_no, class_code, academic_year, term,
            dr, cr, description, school_id, branch_id, payment_mode, payment_status,
            quantity, is_optional, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            entry.item_category,
            entry.ref_no,
            entry.admission_no || null,
            entry.class_code || null,
            entry.academic_year,
            entry.term,
            entry.dr,
            entry.cr,
            entry.description,
            entry.school_id,
            entry.branch_id || null,
            entry.payment_mode,
            entry.payment_status,
            1, // quantity - default to 1
            'No' // is_optional - default to 'No'
          ],
          type: sequelize.QueryTypes.INSERT,
          transaction
        });
      }

      console.log(`✅ Created ${journal_entries.length} journal entries for payroll disbursement (Staff: ${payrollLine.staff_id})`);
      console.log(`✅ Created ${payment_entries.length} payment entries for financial reporting`);
      console.log(`   Debits: ${total_debits.toFixed(2)}, Credits: ${total_credits.toFixed(2)} - BALANCED ✓`);

      return {
        entries_created: journal_entries.length,
        payment_entries_created: payment_entries.length,
        total_debits,
        total_credits,
        balanced: true
      };

    } catch (error) {
      console.error('Error creating payroll journal entries:', error);
      throw error;
    }
  }

  static async disburseSalary(req, res) {
    try {
      const { staffId } = req.params;
      const { period_month } = req.body;
      const { school_id, branch_id } = getSchoolAndBranchIds(req);

      // Validate required parameters
      if (!staffId || staffId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'Staff ID is required and cannot be undefined'
        });
      }

      if (!period_month) {
        return res.status(400).json({
          success: false,
          message: 'Period month is required in request body'
        });
      }

      console.log(`Disbursing salary for staff ID: ${staffId}, period: ${period_month}`);

      // Find the payroll period (check if it exists first)
      const anyPeriod = await PayrollPeriod.findOne({
        where: {
          period_month,
          school_id
        }
      });

      if (!anyPeriod) {
        // Check what periods are available for debugging
        const availablePeriods = await PayrollPeriod.findAll({
          where: { school_id },
          attributes: ['period_month', 'status', 'period_id'],
          order: [['period_month', 'DESC']],
          limit: 10
        });
        
        console.log('Available periods for school:', school_id, availablePeriods.map(p => ({ 
          period: p.period_month, 
          status: p.status, 
          id: p.period_id 
        })));
        
        return res.status(404).json({
          success: false,
          message: `Payroll period for ${period_month} not found. Please initiate payroll for this period first.`,
          available_periods: availablePeriods.map(p => ({ 
            period_month: p.period_month, 
            status: p.status,
            period_id: p.period_id
          }))
        });
      }

      if (anyPeriod.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: `Payroll period for ${period_month} is not approved. Current status: ${anyPeriod.status}. Please approve the payroll period before disbursing salaries.`
        });
      }

      const period = anyPeriod;

      // Find the payroll line for this staff
      console.log(`Looking for payroll line: period_id=${period.period_id}, staff_id=${staffId}`);
      
      const payrollLine = await PayrollLine.findOne({
        where: {
          period_id: period.period_id,
          staff_id: staffId
        }
      });

      if (!payrollLine) {
        // Check if staff exists in any payroll lines for this period
        const allPayrollLines = await PayrollLine.findAll({
          where: {
            period_id: period.period_id
          },
          attributes: ['staff_id'],
          limit: 10
        });
        
        console.log('Available staff IDs in this period:', allPayrollLines.map(pl => pl.staff_id));
        
        return res.status(404).json({
          success: false,
          message: `Staff payroll record not found for staff ID ${staffId} in period ${period_month}. This staff may not be enrolled in payroll for this period.`
        });
      }

      if (payrollLine.is_processed) {
        return res.status(400).json({
          success: false,
          message: 'Salary already disbursed for this staff'
        });
      }

      // Start a transaction for atomicity
      const transaction = await sequelize.transaction();

      try {
        // Create journal entries for proper accounting
        console.log('Creating journal entries for payroll line:', payrollLine.payroll_line_id);
        const journalEntryResult = await PayrollController.createPayrollJournalEntries(
          payrollLine,
          period_month,
          school_id,
          req.user.branch_id,
          req.user.id || req.user.staff_id || 'system',
          transaction
        );
        console.log('Journal entries created successfully');

        // Mark as disbursed
        console.log('Marking payroll line as processed');
        await payrollLine.update({
          is_processed: true
        }, { transaction });
        console.log('Payroll line marked as processed');

        // Update loan balances if any loans were deducted
        console.log('Updating loan balances');
        await sequelize.query(`
          UPDATE loans l
          JOIN payroll_items pi ON l.loan_id = pi.item_id AND pi.item_type = 'loan'
          SET
            l.balance_remaining = GREATEST(0, l.balance_remaining - pi.amount),
            l.status = CASE WHEN (l.balance_remaining - pi.amount) <= 0 THEN 'completed' ELSE 'active' END,
            l.actual_end_date = CASE WHEN (l.balance_remaining - pi.amount) <= 0 THEN CURDATE() ELSE NULL END
          WHERE pi.payroll_line_id = :payroll_line_id
        `, {
          replacements: { payroll_line_id: payrollLine.payroll_line_id },
          type: sequelize.QueryTypes.UPDATE,
          transaction
        });

        await transaction.commit();

        return res.json({
          success: true,
          message: 'Salary disbursed successfully with accounting entries',
          data: {
            payroll: payrollLine,
            accounting: journalEntryResult
          }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (err) {
      console.error('Error disbursing salary:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to disburse salary',
        error: err.message 
      });
    }
  }

  // Disburse all approved salaries for a period
  static async disburseAll(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { period_month } = req.body;
      const { school_id, branch_id } = getSchoolAndBranchIds(req);
      const created_by = req.user.id;

      // Validate required parameters
      if (!period_month) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Period month is required in request body'
        });
      }

      console.log(`Attempting to disburse all for period: ${period_month}, school: ${school_id}, created_by: ${created_by}`);

      // First check if the period exists at all using raw SQL
      const [anyPeriod] = await sequelize.query(`
        SELECT * FROM payroll_periods 
        WHERE period_month = ? AND school_id = ?
      `, {
        replacements: [period_month, school_id],
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      if (!anyPeriod) {
        // Check what periods are available using raw SQL
        const availablePeriods = await sequelize.query(`
          SELECT period_month, status FROM payroll_periods 
          WHERE school_id = ? 
          ORDER BY period_month DESC 
          LIMIT 10
        `, {
          replacements: [school_id],
          type: sequelize.QueryTypes.SELECT,
          transaction
        });

        console.log('Available periods:', availablePeriods.map(p => ({ period: p.period_month, status: p.status })));

        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Payroll period for ${period_month} not found. Please initiate payroll for this period first.`,
          available_periods: availablePeriods.map(p => ({ period_month: p.period_month, status: p.status }))
        });
      }

      // Check if the period is approved
      if (anyPeriod.status !== 'approved') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Payroll period for ${period_month} is not approved. Current status: ${anyPeriod.status}. Please approve the payroll period before disbursing salaries.`,
          current_status: anyPeriod.status,
          period_id: anyPeriod.period_id
        });
      }

      const period = anyPeriod;

      // Get all unprocessed payroll lines with details using raw SQL
      const unprocessedLines = await sequelize.query(`
        SELECT 
          payroll_line_id,
          period_id,
          staff_id,
          basic_salary,
          total_allowances,
          total_deductions,
          total_loans,
          gross_pay,
          net_pay,
          is_processed,
          notes,
          branch_id,
          school_id,
          created_at,
          updated_at
        FROM payroll_lines 
        WHERE period_id = ? AND is_processed = 0
      `, {
        replacements: [period.period_id],
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      if (!unprocessedLines || unprocessedLines.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No pending salary disbursements found'
        });
      }

      // Get payroll items (allowances, deductions, loans) for all unprocessed lines
      const payrollLineIds = unprocessedLines.map(line => line.payroll_line_id);
      const payrollItems = await sequelize.query(`
        SELECT
          pi.payroll_line_id,
          pi.item_type,
          pi.item_id,
          pi.item_name,
          pi.amount
        FROM payroll_items pi
        WHERE pi.payroll_line_id IN (:payrollLineIds)
      `, {
        replacements: { payrollLineIds },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      // Group payroll items by line
      const itemsByLine = {};
      payrollItems.forEach(item => {
        if (!itemsByLine[item.payroll_line_id]) {
          itemsByLine[item.payroll_line_id] = { allowances: [], deductions: [], loans: [] };
        }
        if (item.item_type === 'allowance') {
          itemsByLine[item.payroll_line_id].allowances.push(item);
        } else if (item.item_type === 'deduction') {
          itemsByLine[item.payroll_line_id].deductions.push(item);
        } else if (item.item_type === 'loan') {
          itemsByLine[item.payroll_line_id].loans.push(item);
        }
      });

      // Create accounting journal entries for salary disbursement using direct SQL
      // This ensures proper double-entry accounting per the PAYROLL_ACCOUNTING_SYSTEM.md documentation
      const transactionDate = new Date().toISOString().split('T')[0];
      let totalJournalEntries = 0;

      // Create individual journal entries for each staff member for detailed tracking
      for (const line of unprocessedLines) {
        console.log(`Processing staff ${line.staff_id}: basic=${line.basic_salary}, allowances=${line.total_allowances}, deductions=${line.total_deductions}, net=${line.net_pay}`);
        try {
          // Use our centralized accounting function
          const journalResult = await PayrollController.createPayrollJournalEntries(
            line,
            period_month,
            school_id,
            branch_id,
            created_by,
            transaction
          );

          totalJournalEntries += journalResult.entries_created;
          console.log(`✅ Created ${journalResult.entries_created} balanced journal entries for staff ${line.staff_id}`);

        } catch (journalError) {
          console.error(`Error creating journal entries for staff ${line.staff_id}:`, journalError);
          throw journalError; // Rollback transaction if journal entry creation fails
        }
      }

      // Mark all as disbursed using raw SQL
      await sequelize.query(`
        UPDATE payroll_lines 
        SET is_processed = 1 
        WHERE period_id = ? AND is_processed = 0
      `, {
        replacements: [period.period_id],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      });

      // Update loan balances for all loans
      await sequelize.query(`
        UPDATE loans l
        JOIN payroll_items pi ON l.loan_id = pi.item_id AND pi.item_type = 'loan'
        JOIN payroll_lines pl ON pi.payroll_line_id = pl.payroll_line_id
        SET
          l.balance_remaining = GREATEST(0, l.balance_remaining - pi.amount),
          l.status = CASE WHEN (l.balance_remaining - pi.amount) <= 0 THEN 'completed' ELSE 'active' END,
          l.actual_end_date = CASE WHEN (l.balance_remaining - pi.amount) <= 0 THEN CURDATE() ELSE NULL END
        WHERE pl.period_id = :period_id
      `, {
        replacements: { period_id: period.period_id },
        type: sequelize.QueryTypes.UPDATE,
        transaction
      });

      // Calculate totals for response
      let totalBasicSalary = 0;
      let totalAllowances = 0;
      let totalDeductions = 0;
      let totalLoans = 0;
      let totalNetPay = 0;

      unprocessedLines.forEach(line => {
        totalBasicSalary += parseFloat(line.basic_salary || 0);
        totalAllowances += parseFloat(line.total_allowances || 0);
        totalDeductions += parseFloat(line.total_deductions || 0);
        totalLoans += parseFloat(line.total_loans || 0);
        totalNetPay += parseFloat(line.net_pay || 0);
      });

      const totalGrossSalary = totalBasicSalary + totalAllowances;

      // Get breakdown of deductions by type for tax reporting
      const deductionBreakdown = await sequelize.query(`
        SELECT
          pi.item_name,
          SUM(pi.amount) as total_amount
        FROM payroll_items pi
        JOIN payroll_lines pl ON pi.payroll_line_id = pl.payroll_line_id
        WHERE pl.period_id = :period_id
          AND pi.item_type = 'deduction'
        GROUP BY pi.item_name
        ORDER BY total_amount DESC
      `, {
        replacements: { period_id: period.period_id },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      // Update period status to locked using raw SQL
      await sequelize.query(`
        UPDATE payroll_periods 
        SET status = 'locked' 
        WHERE period_id = ?
      `, {
        replacements: [period.period_id],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      });

      await transaction.commit();

      return res.json({
        success: true,
        message: `Successfully disbursed salaries for ${unprocessedLines.length} staff members with proper accounting entries`,
        data: {
          period_month,
          staff_count: unprocessedLines.length,
          total_disbursed: totalNetPay,
          accounting_summary: {
            basic_salary: totalBasicSalary,
            allowances: totalAllowances,
            gross_salary: totalGrossSalary,
            deductions: totalDeductions,
            loans_recovered: totalLoans,
            net_pay: totalNetPay,
            // Detailed breakdown for tax remittance
            deduction_breakdown: deductionBreakdown,
            // Accounting entries created (actual count)
            journal_entries_created: totalJournalEntries,
            // Accounting impact explanation
            accounting_impact: {
              expense_recorded: `₦${totalGrossSalary.toFixed(2)} (Basic Salary + Allowances) - Reduces school profit`,
              cash_outflow: `₦${totalNetPay.toFixed(2)} (Net pay to staff) - Reduces cash/bank balance`,
              liability_increased: `₦${totalDeductions.toFixed(2)} (Taxes withheld) - School must remit to govt/unions`,
              asset_recovered: `₦${totalLoans.toFixed(2)} (Loan repayments) - Reduces loans receivable`
            },
            records_location: {
              payroll_details: 'payroll_lines + payroll_items tables',
              accounting_records: 'journal_entries table (reference like PAYROLL-' + period_month + '%)'
            }
          }
        }
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Error disbursing all salaries:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to disburse all salaries',
        error: err.message
      });
    }
  }

  static async getStaffLoans(req, res) {
    try {
      const { staffId } = req.params;
      
      // For now, return empty array since loans functionality isn't fully implemented
      res.json({ 
        success: true, 
        data: [] 
      });
    } catch (error) {
      console.error('Error fetching staff loans:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }

  static async getDashboardKPIs(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getDashboardCharts(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async testAnalytics(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async returnForCorrection(req, res) {
    res.json({ success: false, message: 'Method not implemented yet' });
  }

  static async getPaymentGatewayConfig(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const config = await PaymentGatewayService.getSchoolGatewayConfig(school_id);
      
      if (!config) {
        return res.json({ success: true, data: null, message: 'No payment gateway configured' });
      }

      const configData = JSON.parse(config.config_data);
      delete configData.api_key;
      delete configData.api_token;

      res.json({ 
        success: true, 
        data: { 
          gateway_name: config.gateway_name, 
          is_active: config.is_active,
          environment: configData.environment 
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getPaymentIntegrationType(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const integrationType = await PaymentGatewayService.getSchoolPaymentIntegration(school_id);
      
      res.json({ 
        success: true, 
        data: { 
          integration_type: integrationType,
          is_payroll_only: integrationType === 'payroll_only'
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async disburseSalaryViaGateway(req, res) {
    try {
      const { staffId } = req.params;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      const staff = await db.sequelize.query(
        `SELECT s.*, pl.net_pay, pl.payroll_line_id 
         FROM teachers s 
         LEFT JOIN payroll_lines pl ON s.id = pl.staff_id 
         WHERE s.id = ? AND s.school_id = ?`,
        {
          replacements: [staffId, school_id],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      if (!staff || staff.length === 0) {
        return res.status(404).json({ success: false, message: 'Staff not found' });
      }

      const result = await PaymentGatewayService.disburseSalaryViaRemita(staff[0], school_id);

      if (result.success && staff[0].payroll_line_id) {
        await db.sequelize.query(
          `UPDATE payroll_lines 
           SET payment_method = 'gateway', 
               gateway_name = 'remita', 
               payment_reference = ?, 
               payment_status = 'success',
               payment_response = ?,
               payment_completed_at = NOW(),
               is_processed = 1,
               disbursement_status = 'disbursed'
           WHERE payroll_line_id = ?`,
          {
            replacements: [result.reference, JSON.stringify(result.data), staff[0].payroll_line_id]
          }
        );
      }

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async checkPaymentStatus(req, res) {
    try {
      const { reference } = req.params;
      const school_id = req.headers['x-school-id'] || req.user.school_id;

      const result = await PaymentGatewayService.checkRemitaPaymentStatus(reference, school_id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = PayrollController;
