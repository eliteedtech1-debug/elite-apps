
const { Op } = require('sequelize');
const db = require('../models');
function generateAbbreviation(name) {
  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word → use full word uppercased
    return words[0].toUpperCase();
  }

  // Multi-word → take initials
  return words.map(word => word[0].toUpperCase()).join('');
}


class LoanController {

    static async createLoanType(req, res) {
        
        try {
            const { school_id } = req.user;
            const { loan_type_name, loan_type_code, interest_rate, min_amount, max_amount, min_duration_months, max_duration_months, processing_fee_percentage } = req.body;

            if (!loan_type_name  || interest_rate === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Loan type name, code, and default interest rate are required'
                });
            }

           const loanType = await db.LoanType.create({
                    loan_type_name,
                    loan_type_code: loan_type_code 
                        ? loan_type_code.toUpperCase()
                        : generateAbbreviation(loan_type_name),
                    interest_rate,
                    min_amount,
                    max_amount,
                    min_duration_months,
                    max_duration_months,
                    processing_fee_percentage,
                    school_id
                });


            res.status(201).json({
                success: true,
                message: 'Loan type created successfully',
                data: loanType
            });
        } catch (error) {
            console.error('Error creating loan type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create loan type',
                error: error.message
            });
        }
    }
  
     // Update an existing loan type
     static async updateLoanType(req, res) {
         try {
             const { loanTypeId } = req.params;
             const { school_id } = req.user;
             const updateFields = req.body;

             const loanType = await db.LoanType.findOne({
                 where: {
                     loan_type_id: loanTypeId,
                     school_id
                 }
             });

             if (!loanType) {
                 return res.status(404).json({
                     success: false,
                     message: 'Loan type not found'
                 });
             }

             await loanType.update(updateFields);

             res.json({
                 success: true,
                 message: 'Loan type updated successfully',
                 data: loanType
             });
         } catch (error) {
             console.error('Error updating loan type:', error);
             res.status(500).json({
                 success: false,
                 message: 'Failed to update loan type',
                 error: error.message
             });
         }
     }
    // Delete a loan type
    static async deleteLoanType(req, res) {
        try {
            const { loanTypeId } = req.params;
            const { school_id } = req.user;

            const loanType = await db.LoanType.findOne({
                where: {
                    loan_type_id: loanTypeId,
                    school_id
                }
            });

            if (!loanType) {
                return res.status(404).json({
                    success: false,
                    message: 'Loan type not found'
                });
            }

            await loanType.destroy();

            res.json({
                success: true,
                message: 'Loan type deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting loan type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete loan type',
                error: error.message
            });
        }
    }

    static async getLoanTypes(req, res) {
        try {
            const { school_id, branch_id } = req.user;

            const loanTypes = await db.LoanType.findAll({
                where: { school_id }
            });

            res.json({
                success: true,
                data: loanTypes
            });
        } catch (error) {
            console.error('Error fetching loan types:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch loan types',
                error: error.message
            });
        }
    }

  // Get all loans with filters
  static async getLoans(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user.branch_id;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        loan_type_id, 
        staff_id,
        search 
      } = req.query;
      
      const whereClause = { school_id };
      if (branch_id) whereClause.branch_id = branch_id;
      
      if (status) whereClause.status = status;
      if (loan_type_id) whereClause.loan_type_id = loan_type_id;
      if (staff_id) whereClause.staff_id = staff_id;
      
      if (search) {
        whereClause[Op.or] = [
          { '$staff.name$': { [Op.like]: `%${search}%` } },
          { '$loanType.loan_type_name$': { [Op.like]: `%${search}%` } },
          { loan_reference: { [Op.like]: `%${search}%` } }
        ];
      }
      
      const loans = await db.Loan.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: db.Staff,
            as: 'staff',
            attributes: ['id', 'name', 'email', 'mobile_no', 'staff_role']
          },
          {
            model: db.LoanType,
            as: 'loanType',
            attributes: ['loan_type_name', 'loan_type_code', 'interest_rate']
          }
        ],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['created_at', 'DESC']]
      });
      
      res.json({
        success: true,
        data: loans.rows,
        pagination: {
          total: loans.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(loans.count / limit)
        }
      });
      
    } catch (error) {
      console.error('Error fetching loans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loans',
        error: error.message
      });
    }
  }
  
  // Get loans by loan type with member enrollment options
  static async getLoansByType(req, res) {
    try {
      const { loanTypeId } = req.params;
      const { school_id, branch_id } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status = 'all',
        enrolled_only = false 
      } = req.query;
      
      // Get loan type details
      const loanType = await db.Loan.findOne({
        where: { 
          loan_type_id: loanTypeId, 
          school_id, 
          branch_id 
        }
      });
      
      if (!loanType) {
        return res.status(404).json({
          success: false,
          message: 'Loan type not found'
        });
      }
      
      let whereClause = { 
        loan_type_id: loanTypeId,
        school_id,
        branch_id
      };
      
      if (status !== 'all') {
        whereClause.status = status;
      }
      
      // Get loans for this type
      const loans = await db.Loan.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: db.Staff,
            as: 'staff',
            attributes: ['id', 'name', 'email', 'mobile_no', 'staff_role', 'grade_id', 'step']
          }
        ],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['created_at', 'DESC']]
      });
      
      // Get eligible staff (those not already in this loan type or with completed loans)
      const excludeStaffIds = enrolled_only ? [] : loans.rows
        .filter(loan => ['active', 'pending'].includes(loan.status))
        .map(loan => loan.staff_id);
      
      const eligibleStaff = await db.Staff.findAll({
        where: {
          school_id,
          status: 'Active',
          payroll_status: 'Enrolled',
          ...(excludeStaffIds.length > 0 && { id: { [Op.notIn]: excludeStaffIds } })
        },
        attributes: ['id', 'name', 'email', 'staff_role', 'grade_id', 'step'],
        order: [['name', 'ASC']]
      });
      
      res.json({
        success: true,
        data: {
          loan_type: loanType,
          loans: loans.rows,
          eligible_staff: eligibleStaff,
          statistics: {
            total_loans: loans.count,
            active_loans: loans.rows.filter(l => l.status === 'active').length,
            completed_loans: loans.rows.filter(l => l.status === 'completed').length,
            pending_loans: loans.rows.filter(l => l.status === 'pending').length,
            total_principal: loans.rows.reduce((sum, l) => sum + parseFloat(l.principal_amount || 0), 0),
            total_outstanding: loans.rows
              .filter(l => l.status === 'active')
              .reduce((sum, l) => sum + parseFloat(l.balance_remaining || 0), 0)
          }
        },
        pagination: {
          total: loans.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(loans.count / limit)
        }
      });
      
    } catch (error) {
      console.error('Error fetching loans by type:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loans by type',
        error: error.message
      });
    }
  }
  
  static async enrollStaffInLoan(req, res) {
    console.log('🔧 Starting loan enrollment with Sequelize ORM...');

    try {
      const { school_id, branch_id, staff_id: created_by } = req.user;
      const {
        staff_id,
        loan_type_id,
        principal_amount,
        interest_rate,
        loan_duration_months,
        start_date,
        notes,
        guarantor_staff_id
      } = req.body;

      // Validate required fields
      if (!staff_id || !loan_type_id || !principal_amount || !loan_duration_months) {
        return res.status(400).json({
          success: false,
          message: 'Staff ID, loan type, principal amount, and duration are required'
        });
      }
      
      // Check if staff exists and is eligible
      const staff = await db.Staff.findOne({
        where: {
          id: staff_id,
          school_id
        }
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff not found or not eligible for loans'
        });
      }
      
      // Check if staff already has an active loan of this type
      const existingLoan = await db.Loan.findOne({
        where: {
          staff_id,
          loan_type_id,
          status: {
            [Op.in]: ['active', 'pending']
          }
        }
      });

      if (existingLoan) {
        return res.status(409).json({
          success: false,
          message: 'Staff member already has an active loan of this type'
        });
      }
      
      // Get loan type details
      const loanType = await db.LoanType.findOne({
        where: {
          loan_type_id,
          school_id
        }
      });

      if (!loanType) {
        return res.status(404).json({
          success: false,
          message: 'Loan type not found'
        });
      }

      // Validate guarantor if provided (optional - for record keeping only)
      if (guarantor_staff_id) {
        // Check if guarantor is the same as loan applicant
        if (parseInt(guarantor_staff_id) === parseInt(staff_id)) {
          return res.status(400).json({
            success: false,
            message: 'Guarantor cannot be the same as the loan recipient'
          });
        }

        // Check if guarantor exists
        const guarantor = await db.Staff.findOne({
          where: {
            id: guarantor_staff_id,
            school_id
          }
        });

        if (!guarantor) {
          return res.status(404).json({
            success: false,
            message: 'Guarantor not found. Please select a valid staff member.'
          });
        }

        console.log(`✅ Guarantor recorded: ${guarantor.name} (ID: ${guarantor_staff_id})`);
      }

      // Validate amount and duration against loan type limits
      const amount = parseFloat(principal_amount);
      const duration = parseInt(loan_duration_months);
      
      if (loanType.min_amount && amount < loanType.min_amount) {
        return res.status(400).json({
          success: false,
          message: `Minimum loan amount for this type is ₦${loanType.min_amount.toLocaleString()}`
        });
      }
      
      if (loanType.max_amount && amount > loanType.max_amount) {
        return res.status(400).json({
          success: false,
          message: `Maximum loan amount for this type is ₦${loanType.max_amount.toLocaleString()}`
        });
      }
      
      if (loanType.min_duration_months && duration < loanType.min_duration_months) {
        return res.status(400).json({
          success: false,
          message: `Minimum duration for this loan type is ${loanType.min_duration_months} months`
        });
      }
      
      if (loanType.max_duration_months && duration > loanType.max_duration_months) {
        return res.status(400).json({
          success: false,
          message: `Maximum duration for this loan type is ${loanType.max_duration_months} months`
        });
      }
      
      // Calculate loan details with interest breakdown
      const loanInterestRate = interest_rate !== undefined ? parseFloat(interest_rate) : loanType.interest_rate;
      const interestAmount = amount * (loanInterestRate / 100);
      const totalAmount = amount + interestAmount;
      const monthlyDeduction = totalAmount / duration;
      const processingFee = loanType.processing_fee_percentage ? 
        (amount * (loanType.processing_fee_percentage / 100)) : 0;
      
      // Calculate interest breakdown
      const interestBreakdown = {
        principal_amount: amount,
        interest_rate: loanInterestRate,
        interest_amount: interestAmount,
        total_amount: totalAmount,
        monthly_principal: amount / duration,
        monthly_interest: interestAmount / duration,
        monthly_deduction: monthlyDeduction
      };
      
      // Generate loan reference
      const loanReference = `${loanType.loan_type_code}-${staff.id}-${Date.now().toString().slice(-6)}`;
      
      // Create loan using ORM
      // Loan is automatically activated since the school has already approved it
      const newLoan = await db.Loan.create({
        loan_reference: loanReference,
        staff_id,
        loan_type_id,
        principal_amount: amount,
        interest_rate: loanInterestRate,
        total_amount: totalAmount,
        monthly_deduction: monthlyDeduction,
        balance_remaining: totalAmount,
        processing_fee: processingFee,
        duration_months: duration,
        start_date: start_date || new Date(),
        expected_end_date: new Date(Date.now() + (duration * 30 * 24 * 60 * 60 * 1000)),
        status: 'active',  // Auto-activate - school has already approved
        approval_status: 'approved',
        approved_by: created_by,
        approved_at: new Date(),
        guarantor_staff_id: guarantor_staff_id || null,  // Optional - for record keeping
        notes,
        school_id,
        branch_id,
        created_by
      });

      const loanId = newLoan.loan_id;
      console.log('✅ Loan created successfully with ID:', loanId);
      
      res.status(201).json({
        success: true,
        message: 'Loan recorded and activated successfully. Deductions will start from next payroll.',
        data: {
          loan_id: loanId,
          loan_reference: loanReference,
          status: 'active',
          monthly_deduction: monthlyDeduction,
          total_amount: totalAmount,
          processing_fee: processingFee,
          start_date: newLoan.start_date,
          expected_end_date: newLoan.expected_end_date,
          interest_breakdown: interestBreakdown
        }
      });
      
    } catch (error) {
      console.error('❌ Error enrolling staff in loan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enroll staff in loan',
        error: error.message
      });
    }
  }
  
  // Update loan status (approve, suspend, complete, etc.)
  static async updateLoanStatus(req, res) {
    console.log('🔧 Starting loan status update with db.sequelize.query()...');
    
    try {
      const { loanId } = req.params;
      const { school_id, branch_id, staff_id: updated_by } = req.user;
      const { status, notes, liquidation_amount } = req.body;
      
      // Find loan using raw SQL
      const [loanResult] = await db.sequelize.query(`
        SELECT * FROM loans WHERE loan_id = ? AND school_id = ? AND branch_id = ?
      `, {
        replacements: [loanId, school_id, branch_id],
        type: db.sequelize.QueryTypes.SELECT
      });
      
      if (loanResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }
      
      const loan = loanResult[0];
      
      const updateData = { 
        status, 
        notes: notes || loan.notes,
        updated_by 
      };
      
      // Handle specific status changes
      if (status === 'active') {
        updateData.approved_at = new Date();
        updateData.approved_by = updated_by;
      } else if (status === 'completed') {
        updateData.actual_end_date = new Date();
        updateData.balance_remaining = 0;
        
        if (liquidation_amount) {
          updateData.liquidation_amount = parseFloat(liquidation_amount);
          updateData.liquidation_date = new Date();
        }
      } else if (status === 'suspended') {
        updateData.suspended_at = new Date();
        updateData.suspended_by = updated_by;
      }
      
      // Update loan using raw SQL
      const updateFields = [];
      const updateValues = [];
      
      updateFields.push('status = ?', 'updated_by = ?');
      updateValues.push(status, updated_by);
      
      if (notes) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
      }
      
      // Handle specific status changes
      if (status === 'active') {
        updateFields.push('approved_at = NOW()', 'approved_by = ?');
        updateValues.push(updated_by);
      } else if (status === 'completed') {
        updateFields.push('actual_end_date = NOW()', 'balance_remaining = 0');
        
        if (liquidation_amount) {
          updateFields.push('liquidation_amount = ?', 'liquidation_date = NOW()');
          updateValues.push(parseFloat(liquidation_amount));
        }
      } else if (status === 'suspended') {
        updateFields.push('suspended_at = NOW()', 'suspended_by = ?');
        updateValues.push(updated_by);
      }
      
      updateValues.push(loanId);
      
      await db.sequelize.query(`
        UPDATE loans SET ${updateFields.join(', ')}, updated_at = NOW() WHERE loan_id = ?
      `, {
        replacements: updateValues,
        type: db.sequelize.QueryTypes.UPDATE
      });
      
      // Log status change (optional - skip if table doesn't exist)
      try {
        await db.sequelize.query(`
          INSERT INTO loan_status_history (
            loan_id, old_status, new_status, changed_by, change_reason, changed_at
          ) VALUES (
            ?, ?, ?, ?, ?, NOW()
          )
        `, {
          replacements: [
            loanId,
            loan.status,
            status,
            updated_by,
            notes || `Status changed to ${status}`
          ],
          type: db.sequelize.QueryTypes.INSERT
        });
      } catch (historyError) {
        console.warn('⚠️ Loan status history table not available, skipping history log:', historyError.message);
      }
      
      console.log('✅ Loan status updated successfully');
      
      res.json({
        success: true,
        message: `Loan ${status} successfully`
      });
      
    } catch (error) {
      console.error('❌ Error updating loan status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update loan status',
        error: error.message
      });
    }
  }
  
  // Bulk operations for loans
  static async bulkUpdateLoans(req, res) {
    console.log('🔧 Starting bulk loan update with db.sequelize.query()...');
    
    try {
      const { school_id, branch_id, staff_id: updated_by } = req.user;
      const { loan_ids, action, notes } = req.body;
      
      if (!Array.isArray(loan_ids) || loan_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Loan IDs array is required'
        });
      }
      
      const validActions = ['approve', 'suspend', 'complete', 'reject'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be one of: ' + validActions.join(', ')
        });
      }
      
      // Get loans to update using raw SQL
      const placeholders = loan_ids.map(() => '?').join(',');
      const [loans] = await db.sequelize.query(`
        SELECT * FROM loans 
        WHERE loan_id IN (${placeholders}) AND school_id = ? AND branch_id = ?
      `, {
        replacements: [...loan_ids, school_id, branch_id],
        type: db.sequelize.QueryTypes.SELECT
      });
      
      if (loans.length !== loan_ids.length) {
        return res.status(404).json({
          success: false,
          message: 'Some loans not found'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (const loan of loans) {
        try {
          let newStatus;
          const updateData = { updated_by };
          
          switch (action) {
            case 'approve':
              if (loan.status !== 'pending') {
                errors.push({ loan_id: loan.loan_id, error: 'Loan is not pending approval' });
                continue;
              }
              newStatus = 'active';
              updateData.status = 'active';
              updateData.approved_at = new Date();
              updateData.approved_by = updated_by;
              break;
              
            case 'suspend':
              if (!['active', 'pending'].includes(loan.status)) {
                errors.push({ loan_id: loan.loan_id, error: 'Loan cannot be suspended' });
                continue;
              }
              newStatus = 'suspended';
              updateData.status = 'suspended';
              updateData.suspended_at = new Date();
              updateData.suspended_by = updated_by;
              break;
              
            case 'complete':
              if (loan.status !== 'active') {
                errors.push({ loan_id: loan.loan_id, error: 'Only active loans can be completed' });
                continue;
              }
              newStatus = 'completed';
              updateData.status = 'completed';
              updateData.actual_end_date = new Date();
              updateData.balance_remaining = 0;
              break;
              
            case 'reject':
              if (loan.status !== 'pending') {
                errors.push({ loan_id: loan.loan_id, error: 'Only pending loans can be rejected' });
                continue;
              }
              newStatus = 'rejected';
              updateData.status = 'rejected';
              break;
          }
          
          if (notes) updateData.notes = notes;
          
          // Update loan using raw SQL
          const updateFields = ['status = ?', 'updated_by = ?'];
          const updateValues = [newStatus, updated_by];
          
          if (notes) {
            updateFields.push('notes = ?');
            updateValues.push(notes);
          }
          
          // Add specific fields based on action
          if (action === 'approve') {
            updateFields.push('approved_at = NOW()', 'approved_by = ?');
            updateValues.push(updated_by);
          } else if (action === 'suspend') {
            updateFields.push('suspended_at = NOW()', 'suspended_by = ?');
            updateValues.push(updated_by);
          } else if (action === 'complete') {
            updateFields.push('actual_end_date = NOW()', 'balance_remaining = 0');
          }
          
          updateValues.push(loan.loan_id);
          
          await db.sequelize.query(`
            UPDATE loans SET ${updateFields.join(', ')}, updated_at = NOW() WHERE loan_id = ?
          `, {
            replacements: updateValues,
            type: db.sequelize.QueryTypes.UPDATE
          });
          
          // Log status change (optional)
          try {
            await db.sequelize.query(`
              INSERT INTO loan_status_history (
                loan_id, old_status, new_status, changed_by, change_reason, changed_at
              ) VALUES (
                ?, ?, ?, ?, ?, NOW()
              )
            `, {
              replacements: [
                loan.loan_id,
                loan.status,
                newStatus,
                updated_by,
                notes || `Bulk ${action} operation`
              ],
              type: db.sequelize.QueryTypes.INSERT
            });
          } catch (historyError) {
            console.warn('⚠️ Loan status history table not available, skipping history log');
          }
          
          results.push({
            loan_id: loan.loan_id,
            status: 'success',
            new_status: newStatus
          });
          
        } catch (error) {
          errors.push({
            loan_id: loan.loan_id,
            error: error.message
          });
        }
      }
      
      console.log('✅ Bulk loan update completed successfully');
      
      res.json({
        success: errors.length === 0,
        message: `Processed ${loan_ids.length} loans. ${results.length} successful, ${errors.length} failed.`,
        results,
        errors
      });
      
    } catch (error) {
      console.error('❌ Error in bulk update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update',
        error: error.message
      });
    }
  }
  
  // Get loan statistics
  static async getLoanStatistics(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { period = '12' } = req.query; // months

      const periodDate = new Date();
      periodDate.setMonth(periodDate.getMonth() - parseInt(period));

      // Get loan type count
      const loanTypeCount = await db.LoanType.count({
        where: { school_id }
      });

      const [statistics] = await db.sequelize.query(`
        SELECT
          COUNT(*) as total_loans,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_loans,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_loans,
          COALESCE(SUM(principal_amount), 0) as total_principal,
          COALESCE(SUM(CASE WHEN status = 'active' THEN balance_remaining END), 0) as total_outstanding,
          COALESCE(AVG(interest_rate), 0) as average_interest_rate,
          COALESCE(AVG(duration_months), 0) as average_duration,
          COUNT(DISTINCT staff_id) as unique_borrowers
        FROM loans
        WHERE school_id = :schoolId
        ${branch_id ? 'AND branch_id = :branchId' : ''}
      `, {
        replacements: {
          schoolId: school_id,
          branchId: branch_id
        },
        type: db.sequelize.QueryTypes.SELECT
      });

      // Monthly trend
      const [monthlyTrend] = await db.sequelize.query(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as loan_count,
          SUM(principal_amount) as total_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
        FROM loans
        WHERE school_id = :schoolId
        ${branch_id ? 'AND branch_id = :branchId' : ''}
        AND created_at >= :periodDate
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
      `, {
        replacements: {
          schoolId: school_id,
          branchId: branch_id,
          periodDate
        },
        type: db.sequelize.QueryTypes.SELECT
      });

      // Top borrowers
      const [topBorrowers] = await db.sequelize.query(`
        SELECT
          s.name,
          s.id as staff_id,
          COUNT(l.loan_id) as loan_count,
          SUM(l.principal_amount) as total_borrowed,
          SUM(CASE WHEN l.status = 'active' THEN l.balance_remaining ELSE 0 END) as current_balance
        FROM loans l
        JOIN teachers s ON l.staff_id = s.id
        WHERE l.school_id = :schoolId
        ${branch_id ? 'AND l.branch_id = :branchId' : ''}
        GROUP BY s.id, s.name
        ORDER BY total_borrowed DESC
        LIMIT 10
      `, {
        replacements: {
          schoolId: school_id,
          branchId: branch_id
        },
        type: db.sequelize.QueryTypes.SELECT
      });

      const stats = statistics[0] || {};

      res.json({
        success: true,
        data: {
          totalLoanTypes: loanTypeCount,
          totalLoans: parseInt(stats.total_loans) || 0,
          activeLoans: parseInt(stats.active_loans) || 0,
          totalOutstanding: parseFloat(stats.total_outstanding) || 0,
          completedLoans: parseInt(stats.completed_loans) || 0,
          pendingLoans: parseInt(stats.pending_loans) || 0,
          suspendedLoans: parseInt(stats.suspended_loans) || 0,
          totalPrincipal: parseFloat(stats.total_principal) || 0,
          averageInterestRate: parseFloat(stats.average_interest_rate) || 0,
          averageDuration: parseFloat(stats.average_duration) || 0,
          uniqueBorrowers: parseInt(stats.unique_borrowers) || 0,
          monthlyTrend: monthlyTrend || [],
          topBorrowers: topBorrowers || []
        }
      });

    } catch (error) {
      console.error('Error fetching loan statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loan statistics',
        error: error.message
      });
    }
  }
  
  // Calculate loan payment schedule
  static async calculatePaymentSchedule(req, res) {
    try {
      const {
        principal_amount,
        interest_rate,
        duration_months,
        start_date
      } = req.body;
      
      if (!principal_amount || !duration_months) {
        return res.status(400).json({
          success: false,
          message: 'Principal amount and duration are required'
        });
      }
      
      const principal = parseFloat(principal_amount);
      const rate = parseFloat(interest_rate) || 0;
      const duration = parseInt(duration_months);
      const startDate = new Date(start_date || Date.now());
      
      const totalAmount = principal + (principal * (rate / 100));
      const monthlyPayment = totalAmount / duration;
      
      const schedule = [];
      let remainingBalance = totalAmount;
      
      for (let month = 1; month <= duration; month++) {
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + month - 1);
        
        const interestPortion = (remainingBalance * (rate / 100)) / duration;
        const principalPortion = monthlyPayment - interestPortion;
        
        remainingBalance = Math.max(0, remainingBalance - monthlyPayment);
        
        schedule.push({
          month,
          payment_date: paymentDate.toISOString().split('T')[0],
          monthly_payment: monthlyPayment,
          principal_portion: principalPortion,
          interest_portion: interestPortion,
          remaining_balance: remainingBalance
        });
      }
      
      res.json({
        success: true,
        data: {
          loan_summary: {
            principal_amount: principal,
            interest_rate: rate,
            total_amount: totalAmount,
            monthly_payment: monthlyPayment,
            total_interest: totalAmount - principal,
            duration_months: duration
          },
          payment_schedule: schedule
        }
      });
      
    } catch (error) {
      console.error('Error calculating payment schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate payment schedule',
        error: error.message
      });
    }
  }

  // Guarantor approval/rejection endpoint
  static async updateGuarantorApproval(req, res) {
    try {
      const { loanId } = req.params;
      const { approval_status, notes } = req.body;
      const guarantor_id = req.user.id || req.user.staff_id;

      // Validate approval status
      if (!['approved', 'rejected'].includes(approval_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid approval status. Must be "approved" or "rejected"'
        });
      }

      // Find the loan
      const loan = await db.Loan.findByPk(loanId, {
        include: [
          { model: db.Staff, as: 'staff', attributes: ['id', 'name', 'email'] },
          { model: db.Staff, as: 'guarantor', attributes: ['id', 'name', 'email'] }
        ]
      });

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      // Verify that the current user is the guarantor
      if (loan.guarantor_staff_id !== guarantor_id) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to approve/reject this loan. Only the assigned guarantor can perform this action.'
        });
      }

      // Check if already processed
      if (loan.guarantor_approval_status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'This loan has already been approved by the guarantor'
        });
      }

      if (loan.guarantor_approval_status === 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'This loan has already been rejected by the guarantor'
        });
      }

      // Update guarantor approval status
      await loan.update({
        guarantor_approval_status: approval_status,
        notes: notes ? `${loan.notes || ''}\nGuarantor ${approval_status}: ${notes}` : loan.notes
      });

      res.json({
        success: true,
        message: `Loan ${approval_status} by guarantor successfully`,
        data: {
          loan_id: loan.loan_id,
          loan_reference: loan.loan_reference,
          guarantor_approval_status: approval_status,
          staff_name: loan.staff?.name,
          guarantor_name: loan.guarantor?.name
        }
      });

    } catch (error) {
      console.error('Error updating guarantor approval:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update guarantor approval',
        error: error.message
      });
    }
  }

  // Get loans where current user is the guarantor
  static async getLoansAsGuarantor(req, res) {
    try {
      const guarantor_id = req.user.id || req.user.staff_id;
      const { school_id } = req.user;

      const loans = await db.Loan.findAll({
        where: {
          guarantor_staff_id: guarantor_id,
          school_id
        },
        include: [
          {
            model: db.Staff,
            as: 'staff',
            attributes: ['id', 'name', 'email', 'mobile_no']
          },
          {
            model: db.LoanType,
            as: 'loanType',
            attributes: ['loan_type_id', 'loan_type_name', 'interest_rate']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: loans,
        message: `Found ${loans.length} loans where you are the guarantor`
      });

    } catch (error) {
      console.error('Error fetching guarantor loans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch loans',
        error: error.message
      });
    }
  }

}

module.exports = LoanController;