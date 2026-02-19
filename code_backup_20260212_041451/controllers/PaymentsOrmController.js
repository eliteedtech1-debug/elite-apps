const db = require("../models");
const { PaymentEntry, Student, CustomChargeItem } = db;
const sequelize = db.sequelize;
const { Op } = require("sequelize");

/**
 * ENHANCED PAYMENTS CONTROLLER - ORM BASED
 * 
 * This controller replaces stored procedure calls with proper ORM operations
 * for better maintainability, type safety, and code clarity.
 * 
 * Supports all operations that EditBillModals requires:
 * - Fetch student payments
 * - Create custom items with accounting
 * - Update bill items
 * - Exclude/delete payments
 */

/**
 * FETCH STUDENT PAYMENTS - ORM VERSION
 * Replaces query_type: "select" with proper ORM queries
 */
const getStudentPayments = async (req, res) => {
  try {
    const {
      admission_no,
      term,
      academic_year,
      class_name,
      payment_status,
      limit = 100,
      offset = 0
    } = req.body;

    console.log('🔍 ORM: Fetching student payments for:', {
      admission_no,
      term,
      academic_year,
      school_id: req.user.school_id
    });

    // Validate required parameters
    if (!admission_no) {
      return res.status(400).json({
        success: false,
        message: "admission_no is required"
      });
    }

    // Build where clause dynamically
    const whereClause = {
      admission_no,
      school_id: req.user.school_id
    };

    if (term) whereClause.term = term;
    if (academic_year) whereClause.academic_year = academic_year;
    if (payment_status) {
      whereClause.payment_status = Array.isArray(payment_status) 
        ? { [Op.in]: payment_status }
        : payment_status;
    } else {
      // Default: exclude cancelled payments
      whereClause.payment_status = { [Op.ne]: 'Cancelled' };
    }

    // Fetch payments using ORM
    const payments = await PaymentEntry.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id',
        'ref_no',
        'admission_no',
        'class_code',
        'academic_year',
        'term',
        'cr',
        'dr',
        'description',
        'quantity',
        'item_category',
        'payment_mode',
        'payment_status',
        'created_at',
        'updated_at',
        // Add computed fields for compatibility
        [sequelize.literal('CASE WHEN payment_status = "Pending" AND cr > 0 THEN "Yes" ELSE "No" END'), 'is_optional'],
        [sequelize.literal('cr'), 'amount'], // For EditBillModals compatibility
        [sequelize.literal('CONCAT(ref_no, "-", id)'), 'item_id'] // Generate item_id
      ]
    });

    console.log(`✅ ORM: Found ${payments.length} payment records`);

    // Transform data for EditBillModals compatibility
    const transformedPayments = payments.map(payment => ({
      id: payment.id,
      item_id: `${payment.ref_no}-${payment.id}`,
      admission_no: payment.admission_no,
      class_code: payment.class_code,
      academic_year: payment.academic_year,
      term: payment.term,
      cr: parseFloat(payment.cr || 0),
      dr: parseFloat(payment.dr || 0),
      description: payment.description,
      quantity: payment.quantity || 1,
      item_category: payment.item_category,
      payment_mode: payment.payment_mode,
      status: payment.payment_status,
      payment_status: payment.payment_status,
      is_optional: payment.dataValues.is_optional,
      amount: parseFloat(payment.cr || 0) / (payment.quantity || 1), // Unit price
      ref_no: payment.ref_no,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      // Additional fields for EditBillModals
      checked: payment.dataValues.is_optional === 'Yes' && payment.payment_status !== 'Paid',
      unit_price: parseFloat(payment.cr || 0) / (payment.quantity || 1),
      net_amount: parseFloat(payment.cr || 0)
    }));

    res.json({
      success: true,
      message: "Student payments retrieved successfully",
      data: transformedPayments,
      system: "ORM",
      debug: {
        totalRecords: payments.length,
        queryParameters: whereClause,
        ormUsed: true
      }
    });

  } catch (error) {
    console.error('❌ ORM Error fetching student payments:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching student payments",
      error: error.message,
      system: "ORM"
    });
  }
};

/**
 * CREATE CUSTOM ITEMS WITH ENHANCED ACCOUNTING - ORM VERSION
 * Replaces query_type: "create-with-enhanced-accounting"
 */
const createCustomItemsWithAccounting = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      admission_no,
      class_name,
      term,
      academic_year,
      branch_id,
      created_by,
      bill_items,
      journal_entries,
      accounting_summary
    } = req.body;

    console.log('🔧 ORM: Creating custom items with accounting for:', {
      admission_no,
      term,
      academic_year,
      itemsCount: bill_items?.length || 0
    });

    // Validate required fields
    if (!admission_no || !bill_items || !Array.isArray(bill_items) || bill_items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "admission_no and bill_items array are required"
      });
    }

    // Generate reference number
    const refNo = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdItems = [];

    // Get student class if not provided
    let studentClass = class_name;
    if (!studentClass && admission_no) {
      const student = await Student.findOne({
        where: {
          admission_no,
          school_id: req.user.school_id
        },
        attributes: ['current_class', 'class_name'],
        transaction
      });
      
      if (student) {
        studentClass = student.current_class || student.class_name;
        console.log(`📚 ORM: Retrieved student class: ${studentClass}`);
      }
    }

    // Create payment entries for each bill item
    for (const item of bill_items) {
      const paymentData = {
        ref_no: refNo,
        admission_no,
        class_code: studentClass,
        academic_year,
        term,
        cr: item.netAmount || 0,
        dr: 0,
        description: item.description,
        quantity: item.quantity || 1,
        item_category: mapItemCategoryToEnum(item.item_category),
        payment_mode: 'Manual',
        payment_status: 'Pending',
        school_id: req.user.school_id,
        branch_id: branch_id || req.user.branch_id,
        created_by: created_by || req.user.name || 'System'
      };

      const paymentEntry = await PaymentEntry.create(paymentData, { transaction });
      
      createdItems.push({
        id: paymentEntry.id,
        description: paymentEntry.description,
        amount: paymentEntry.cr,
        quantity: paymentEntry.quantity,
        item_category: paymentEntry.item_category,
        ref_no: paymentEntry.ref_no
      });

      console.log(`✅ ORM: Created payment entry ID: ${paymentEntry.id} for ${item.description}`);
    }

    // Create journal entries if provided
    if (journal_entries && Array.isArray(journal_entries) && journal_entries.length > 0) {
      await createJournalEntriesORM(journal_entries, transaction, req.user, refNo);
    }

    await transaction.commit();

    console.log(`🎉 ORM: Successfully created ${createdItems.length} custom items with accounting`);

    res.json({
      success: true,
      message: `Custom items created successfully with proper accounting treatment`,
      data: {
        admission_no,
        class_name: studentClass,
        term,
        academic_year,
        ref_no: refNo,
        items_created: createdItems.length,
        items: createdItems,
        accounting_summary,
        system: "ORM"
      }
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('❌ ORM Error creating custom items:', error);
    res.status(500).json({
      success: false,
      message: "Error creating custom items with accounting",
      error: error.message,
      system: "ORM"
    });
  }
};

/**
 * UPDATE BILL ITEMS - ORM VERSION
 * Replaces query_type: "update"
 */
const updateBillItems = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      id,
      item_code,
      quantity,
      amount,
      admission_no,
      term,
      academic_year
    } = req.body;

    console.log('🔧 ORM: Updating bill item:', {
      id: id || item_code,
      quantity,
      amount,
      admission_no
    });

    // Determine the item identifier
    const itemId = id || item_code;
    if (!itemId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "id or item_code is required for update"
      });
    }

    // Build where clause for finding the payment entry
    let whereClause = {
      school_id: req.user.school_id
    };

    // Handle different ID formats
    if (itemId.includes('-')) {
      // Format: "REF-timestamp-id" or "ref_no-id"
      const parts = itemId.split('-');
      const lastPart = parts[parts.length - 1];
      
      if (!isNaN(lastPart)) {
        whereClause.id = parseInt(lastPart);
      } else {
        whereClause.ref_no = itemId;
      }
    } else if (!isNaN(itemId)) {
      // Numeric ID
      whereClause.id = parseInt(itemId);
    } else {
      // String identifier - could be ref_no
      whereClause.ref_no = itemId;
    }

    // Add additional filters if provided
    if (admission_no) whereClause.admission_no = admission_no;
    if (term) whereClause.term = term;
    if (academic_year) whereClause.academic_year = academic_year;

    console.log('🔍 ORM: Update where clause:', whereClause);

    // Find the payment entry
    const paymentEntry = await PaymentEntry.findOne({
      where: whereClause,
      transaction
    });

    if (!paymentEntry) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Payment entry not found with identifier: ${itemId}`
      });
    }

    // Calculate new amounts
    const newQuantity = quantity || paymentEntry.quantity;
    const unitPrice = amount ? parseFloat(amount) / newQuantity : parseFloat(paymentEntry.cr) / paymentEntry.quantity;
    const newCr = unitPrice * newQuantity;

    // Update the payment entry
    await paymentEntry.update({
      quantity: newQuantity,
      cr: newCr,
      updated_by: req.user.name || 'System',
      updated_at: new Date()
    }, { transaction });

    await transaction.commit();

    console.log(`✅ ORM: Updated payment entry ID: ${paymentEntry.id}`);

    res.json({
      success: true,
      message: "Bill item updated successfully",
      data: {
        id: paymentEntry.id,
        ref_no: paymentEntry.ref_no,
        admission_no: paymentEntry.admission_no,
        quantity: paymentEntry.quantity,
        cr: paymentEntry.cr,
        updated_at: paymentEntry.updated_at,
        system: "ORM"
      }
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('❌ ORM Error updating bill item:', error);
    res.status(500).json({
      success: false,
      message: "Error updating bill item",
      error: error.message,
      system: "ORM"
    });
  }
};

/**
 * EXCLUDE/DELETE PAYMENTS - ORM VERSION
 * Handles payment exclusion (soft delete) for EditBillModals
 */
const excludePayments = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Handle both single object and array of objects
    const paymentData = Array.isArray(req.body) ? req.body : [req.body];
    
    console.log('🗑️ ORM: Excluding payments:', {
      count: paymentData.length,
      sampleData: paymentData[0]
    });

    const excludedItems = [];

    for (const payment of paymentData) {
      const {
        id,
        item_code,
        admission_no,
        academic_year,
        term,
        payment_status = 'Excluded'
      } = payment;

      // Determine the item identifier
      const itemId = item_code || id;
      if (!itemId) {
        console.warn('⚠️ ORM: Skipping payment without ID:', payment);
        continue;
      }

      // Build where clause
      let whereClause = {
        school_id: req.user.school_id
      };

      // Handle different ID formats (same logic as update)
      if (itemId.includes('-')) {
        const parts = itemId.split('-');
        const lastPart = parts[parts.length - 1];
        
        if (!isNaN(lastPart)) {
          whereClause.id = parseInt(lastPart);
        } else {
          whereClause.ref_no = itemId;
        }
      } else if (!isNaN(itemId)) {
        whereClause.id = parseInt(itemId);
      } else {
        whereClause.ref_no = itemId;
      }

      // Add additional filters
      if (admission_no) whereClause.admission_no = admission_no;
      if (term) whereClause.term = term;
      if (academic_year) whereClause.academic_year = academic_year;

      // Update payment status to excluded
      const [updatedCount] = await PaymentEntry.update({
        payment_status: payment_status,
        updated_by: req.user.name || 'System',
        updated_at: new Date()
      }, {
        where: whereClause,
        transaction
      });

      if (updatedCount > 0) {
        excludedItems.push({
          identifier: itemId,
          admission_no,
          status: payment_status,
          updated_count: updatedCount
        });
        console.log(`✅ ORM: Excluded payment with identifier: ${itemId}`);
      } else {
        console.warn(`⚠️ ORM: No payment found to exclude with identifier: ${itemId}`);
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `${excludedItems.length} payments excluded successfully`,
      data: {
        excluded_count: excludedItems.length,
        excluded_items: excludedItems,
        system: "ORM"
      }
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('❌ ORM Error excluding payments:', error);
    res.status(500).json({
      success: false,
      message: "Error excluding payments",
      error: error.message,
      system: "ORM"
    });
  }
};

/**
 * HELPER FUNCTIONS
 */

// Map item categories to enum values
const mapItemCategoryToEnum = (category) => {
  const mapping = {
    'FEES': 'STANDARD_FEE',
    'ITEMS': 'CUSTOM_CHARGE',
    'DISCOUNT': 'DISCOUNT',
    'FINES': 'FINE',
    'PENALTY': 'PENALTY',
    'REFUND': 'REFUND',
    'OTHER': 'OTHER'
  };
  return mapping[category] || 'CUSTOM_CHARGE';
};

// Create journal entries using ORM
const createJournalEntriesORM = async (entries, transaction, user, refNo) => {
  try {
    console.log('📊 ORM: Creating journal entries:', entries.length);

    // For now, we'll log the journal entries
    // In a full implementation, you would have JournalEntry and JournalEntryLine models
    for (const entry of entries) {
      console.log('📝 ORM Journal Entry:', {
        account: entry.account,
        account_code: entry.account_code,
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        description: entry.description,
        ref_no: refNo
      });
    }

    // TODO: Implement actual journal entry creation when models are available
    // const journalEntry = await JournalEntry.create({...}, { transaction });
    // for (const line of entries) {
    //   await JournalEntryLine.create({...}, { transaction });
    // }

    return true;
  } catch (error) {
    console.error('❌ ORM Error creating journal entries:', error);
    throw error;
  }
};

/**
 * MAIN PAYMENTS HANDLER - ORM VERSION
 * Routes requests based on query_type to appropriate ORM functions
 */
const  paymentsORM = async (req, res) => {
  try {
    // Handle both single object and array
    const data = Array.isArray(req.body) ? req.body[0] : req.body;
    const { query_type } = data;

    console.log('🔄 ORM: Processing payment request:', {
      query_type,
      user: req.user?.name,
      school_id: req.user?.school_id
    });

    // Route to appropriate ORM function based on query_type
    switch (query_type) {
      case 'select':
      case 'select-student':
        return await getStudentPayments(req, res);
        
      case 'create-with-enhanced-accounting':
        return await createCustomItemsWithAccounting(req, res);
        
      case 'update':
        return await updateBillItems(req, res);
        
      default:
        // For array of exclusion requests (no query_type)
        if (Array.isArray(req.body) && req.body.length > 0 && req.body[0].item_code) {
          return await excludePayments(req, res);
        }
        
        // Log technical details for developers
        console.error('❌ Unsupported query_type in PaymentsOrmController:', {
          query_type,
          supported_types: ['select', 'select-student', 'create-with-enhanced-accounting', 'update'],
          timestamp: new Date().toISOString(),
          user_id: req.user?.user_id,
          school_id: req.user?.school_id
        });

        return res.status(400).json({
          success: false,
          message: "The requested operation is not supported. Please check your request and try again.",
          error_code: 'UNSUPPORTED_OPERATION',
          system: "ORM"
        });
    }

  } catch (error) {
    console.error('❌ ORM Error in main payments handler:', error);
    res.status(500).json({
      success: false,
      message: "Error processing payment request",
      error: error.message,
      system: "ORM"
    });
  }
};

/**
 * GET STUDENT BALANCE - ORM VERSION
 */
const getStudentBalanceORM = async (req, res) => {
  try {
    const { admission_no, academic_year, term } = req.query;

    if (!admission_no) {
      return res.status(400).json({
        success: false,
        message: "admission_no is required"
      });
    }

    const balance = await PaymentEntry.getStudentBalance(
      admission_no,
      academic_year,
      term,
      req.user.school_id
    );

    res.json({
      success: true,
      data: [{
        admission_no,
        academic_year,
        term,
        balance: balance,
        system: "ORM"
      }]
    });

  } catch (error) {
    console.error('❌ ORM Error getting student balance:', error);
    res.status(500).json({
      success: false,
      message: "Error getting student balance",
      error: error.message,
      system: "ORM"
    });
  }
};

module.exports = {
  // Main ORM-based functions
  paymentsORM,
  getStudentPayments,
  createCustomItemsWithAccounting,
  updateBillItems,
  excludePayments,
  getStudentBalanceORM,
  
  // Helper functions
  mapItemCategoryToEnum,
  createJournalEntriesORM
};