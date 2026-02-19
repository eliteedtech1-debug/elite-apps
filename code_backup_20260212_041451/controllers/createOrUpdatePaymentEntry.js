const db = require('../models');
const moment = require('moment');

/**
 * CREATE OR UPDATE PAYMENT ENTRY
 * New endpoint that implements true upsert logic
 * Handles both creation and updates based on description uniqueness
 */
async function createOrUpdatePaymentEntry(req, res) {
  console.log('🔧 Starting createOrUpdatePaymentEntry with upsert logic...');
  
  try {
    const {
      admission_no,
      class_code,
      academic_year,
      term,
      description,
      amount,
      netAmount,
      quantity = 1,
      item_category = 'STANDARD_FEE',
      payment_mode = 'Cash',
      branch_id,
      created_by
    } = req.body;

    // Generate reference number
    function generateRefNo() {
      let refNo = moment().format("YYmmSS");
      refNo = refNo + `${Math.floor(10 + Math.random() * 9)}`;
      return refNo;
    }

    // Validate required fields
    console.log('🔍 Validating required fields:', {
      admission_no: !!admission_no,
      amount: !!amount,
      netAmount: !!netAmount,
      description: !!description,
      academic_year: !!academic_year,
      term: !!term,
      class_code: !!class_code
    });
    
    if (!admission_no || (!amount && !netAmount) || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: admission_no, amount, description',
        received_fields: {
          admission_no,
          amount,
          netAmount,
          description,
          academic_year,
          term,
          class_code
        }
      });
    }
    
    // Additional validation for database required fields
    if (!academic_year || !term) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: academic_year, term',
        received_fields: {
          academic_year,
          term
        }
      });
    }

    const ref_no = generateRefNo();
    const safeQuantity = quantity || 1;
    const finalAmount = netAmount || (parseFloat(amount) * parseInt(safeQuantity));
    const finalSchoolId = req.user?.school_id || req.body.school_id;
    const finalBranchId = branch_id || req.user?.branch_id || req.body.branch_id;

    // Validate that we have school_id and branch_id
    if (!finalSchoolId) {
      return res.status(400).json({
        success: false,
        message: 'Missing school_id: Please ensure you are logged in or provide school_id in request body',
        debug: {
          user_school_id: req.user?.school_id,
          body_school_id: req.body.school_id,
          headers: {
            'x-school-id': req.headers['x-school-id'],
            'X-School-Id': req.headers['X-School-Id']
          }
        }
      });
    }
    
    if (!finalBranchId) {
      return res.status(400).json({
        success: false,
        message: 'Missing branch_id: Please provide branch_id in request body',
        debug: {
          user_branch_id: req.user?.branch_id,
          body_branch_id: req.body.branch_id,
          provided_branch_id: branch_id
        }
      });
    }

    console.log('🔧 Processing upsert with data:', {
      ref_no,
      admission_no,
      class_code,
      description,
      amount: finalAmount,
      quantity: safeQuantity,
      school_id: finalSchoolId,
      branch_id: finalBranchId,
      academic_year,
      term,
      item_category,
      payment_mode
    });

    // STEP 1: Check for existing item with same description, term, and academic year
    console.log('🔍 Checking for existing item with parameters:', {
      admission_no,
      description,
      term,
      academic_year,
      school_id: finalSchoolId
    });
    
    const existingResult = await db.sequelize.query(
      `SELECT * FROM payment_entries 
       WHERE admission_no = :admission_no 
         AND description = :description 
         AND term = :term 
         AND academic_year = :academic_year 
         AND school_id = :school_id 
       ORDER BY created_at DESC
       LIMIT 1`,
      {
        replacements: {
          admission_no,
          description,
          term,
          academic_year,
          school_id: finalSchoolId
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    console.log('🔍 Existing item check result:', {
      found: existingResult.length > 0,
      count: existingResult.length,
      item: existingResult.length > 0 ? {
        item_id: existingResult[0].item_id,
        description: existingResult[0].description,
        status: existingResult[0].payment_status,
        amount: existingResult[0].cr,
        quantity: existingResult[0].quantity
      } : null
    });

    if (existingResult.length > 0) {
      // STEP 2: Update existing item
      const existingItem = existingResult[0];
      
      console.log('🔄 Updating existing item:', {
        item_id: existingItem.item_id,
        current_status: existingItem.payment_status,
        old_amount: existingItem.cr,
        new_amount: finalAmount,
        old_quantity: existingItem.quantity,
        new_quantity: safeQuantity
      });

      // Determine new status: if currently excluded, set to pending; otherwise keep current status
      const newStatus = existingItem.payment_status === 'Excluded' ? 'Pending' : existingItem.payment_status;
      
      await db.sequelize.query(
        `UPDATE payment_entries 
         SET cr = :amount,
             dr = 0,
             quantity = :quantity,
             item_category = :item_category,
             payment_mode = :payment_mode,
             payment_status = :payment_status,
             ref_no = :ref_no,
             branch_id = :branch_id,
             created_by = :created_by,
             updated_at = NOW()
         WHERE item_id = :item_id`,
        {
          replacements: {
            amount: finalAmount,
            quantity: safeQuantity,
            item_category,
            payment_mode,
            payment_status: newStatus,
            ref_no,
            branch_id: finalBranchId,
            created_by,
            item_id: existingItem.item_id
          },
          type: db.sequelize.QueryTypes.UPDATE
        }
      );

      const action = existingItem.payment_status === 'Excluded' ? 'reactivated' : 'updated';
      console.log(`✅ Existing item ${action} successfully`);

      res.json({
        success: true,
        message: `Payment entry ${action} successfully`,
        data: {
          item_id: existingItem.item_id,
          ref_no: ref_no,
          admission_no: admission_no,
          amount: finalAmount,
          description: description,
          balance: finalAmount,
          action: action,
          old_status: existingItem.payment_status,
          new_status: newStatus,
          old_amount: existingItem.cr,
          new_amount: finalAmount
        },
        system: 'SQL'
      });
      return;
    }

    // STEP 3: No existing item found, create new entry
    console.log('📝 No existing item found, creating new entry...');
    
    const insertSQL = `
      INSERT INTO payment_entries (
        ref_no, admission_no, class_code, academic_year, term, 
        cr, dr, description, quantity, item_category, 
        payment_mode, payment_status, school_id, branch_id, created_by, 
        created_at, updated_at
      ) VALUES (
        :ref_no, :admission_no, :class_code, :academic_year, :term,
        :cr, :dr, :description, :quantity, :item_category,
        :payment_mode, :payment_status, :school_id, :branch_id, :created_by,
        NOW(), NOW()
      )
    `;
    
    const insertReplacements = {
      ref_no,
      admission_no,
      class_code,
      academic_year,
      term,
      cr: finalAmount,
      dr: 0,
      description,
      quantity: safeQuantity,
      item_category,
      payment_mode,
      payment_status: 'Pending',
      school_id: finalSchoolId,
      branch_id: finalBranchId,
      created_by
    };
    
    console.log('🔧 Executing INSERT with replacements:', insertReplacements);
    
    const [insertResult] = await db.sequelize.query(insertSQL, {
      replacements: insertReplacements,
      type: db.sequelize.QueryTypes.INSERT
    });
    
    const newItemId = insertResult;
    
    console.log('✅ New payment entry created successfully with ID:', newItemId);

    res.json({
      success: true,
      message: 'Payment entry created successfully',
      data: {
        item_id: newItemId,
        ref_no: ref_no,
        admission_no: admission_no,
        amount: finalAmount,
        description: description,
        balance: finalAmount,
        action: 'created'
      },
      system: 'SQL'
    });

  } catch (error) {
    console.error('❌ SQL Error in createOrUpdatePaymentEntry:', {
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      original: error.original,
      stack: error.stack
    });
    
    // Provide more detailed error information
    let errorMessage = 'Failed to create or update payment entry';
    let errorDetails = error.message;
    
    if (error.original) {
      errorDetails = error.original.message || error.original.sqlMessage || error.message;
      
      // Handle specific MySQL errors
      if (error.original.code === 'ER_DUP_ENTRY' || error.original.errno === 1062) {
        errorMessage = 'Duplicate entry detected - this should not happen with upsert logic';
        errorDetails = 'A payment entry with this description already exists. Please contact support.';
      } else if (error.original.code === 'ER_NO_REFERENCED_ROW_2' || error.original.errno === 1452) {
        errorMessage = 'Foreign key constraint violation';
        errorDetails = 'Referenced student, class, or school data not found';
      } else if (error.original.code === 'ER_BAD_NULL_ERROR' || error.original.errno === 1048) {
        errorMessage = 'Required field missing';
        errorDetails = 'One or more required database fields are null';
      } else if (error.original.code === 'ER_DATA_TOO_LONG' || error.original.errno === 1406) {
        errorMessage = 'Data too long';
        errorDetails = 'One or more fields exceed maximum length';
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorDetails,
      system: 'SQL',
      debug: {
        error_code: error.code || error.original?.code,
        error_number: error.errno || error.original?.errno,
        sql_state: error.sqlState || error.original?.sqlState,
        endpoint: 'createOrUpdatePaymentEntry'
      }
    });
  }
}

module.exports = createOrUpdatePaymentEntry;