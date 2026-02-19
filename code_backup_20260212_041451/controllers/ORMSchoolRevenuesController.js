const db = require('../models');
const { SchoolRevenue } = db;
const { Op, fn, col, QueryTypes } = require('sequelize');

/**
 * ORM-BASED SCHOOL REVENUES CONTROLLER
 * 
 * This controller replaces the school_revenues stored procedure with ORM operations for:
 * - Revenue items management (CRUD operations)
 * - Revenue queries and filtering
 * - Revenue reporting and analytics
 * - Class-based revenue management
 * 
 * Benefits:
 * - AI-friendly code that's easy to understand and modify
 * - Type safety and validation
 * - Better error handling
 * - Easier testing and debugging
 * - No stored procedure dependencies
 * 
 * NOTE: Using direct function exports instead of class to avoid binding issues
 */

/**
 * CREATE SCHOOL REVENUE
 * Replaces: CALL school_revenues('INSERT', ...)
 * Supports both single and bulk creation for multiple classes and terms
 */
const createRevenue = async (req, res) => {
  console.log('🔧 Starting revenue creation with db.sequelize.query()...');
  
  try {
    const {
      description,
      amount,
      term,
      section,
      class_name,
      class_code,
      revenue_type = 'Fees',
      is_optional = 'No',
      status = 'Active',
      account_type = 'Revenue',
      academic_year,
      quantity = 1,
      student_type = 'All Students',
    } = req.body;

    // Validate required fields
    if (!description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: description, amount'
      });
    }

    // Handle both single class_code and array of class_name objects
    let classes = [];
    if (class_code) {
      // Single class_code provided
      classes = [{ value: class_code, label: class_name || class_code }];
    } else if (Array.isArray(class_name)) {
      // Array of class objects provided
      classes = class_name;
    } else if (class_name) {
      // Single class_name provided
      classes = [{ value: class_name, label: class_name }];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either class_code or class_name array is required'
      });
    }

    // Handle both single term and array of term objects
    let terms = [];
    if (Array.isArray(term)) {
      // Array of term objects provided
      terms = term;
    } else if (term) {
      // Single term provided
      terms = [{ value: term, label: term }];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Term is required'
      });
    }

    console.log('📝 Processing revenue creation for:', {
      description,
      amount,
      classes_count: classes.length,
      terms_count: terms.length,
      total_combinations: classes.length * terms.length
    });

    // Get school_id from multiple sources
    const school_id = req.user?.school_id || 
                     req.headers['x-school-id'] || 
                     req.body.school_id;
    const branch_id = req.user?.branch_id || 
                     req.headers['x-branch-id'] || 
                     req.body.branch_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const createdRevenues = [];
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Create revenue entries for each class and term combination
    for (const classObj of classes) {
      for (const termObj of terms) {
        try {
          // Generate unique code for each combination
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);
          const code = `${timestamp.toString().slice(-6)}${random.toString().padStart(4, '0')}`;

          console.log('🆕 Creating revenue with raw SQL:', {
            code,
            description,
            amount: parseFloat(amount),
            class_code: classObj.value,
            class_name: classObj.label,
            term: termObj.value,
            school_id
          });

          // Use raw SQL to avoid transaction issues
          const insertSQL = `
            INSERT INTO school_revenues (
              code, description, amount, term, section, class_name, class_code,
              revenue_type, is_optional, status, account_type, academic_year,
              quantity, student_type, school_id, branch_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `;
          
          const insertValues = [
            code,
            description,
            parseFloat(amount),
            termObj.value,
            section || '',
            classObj.label,
            classObj.value,
            revenue_type,
            is_optional,
            status,
            account_type,
            academic_year,
            parseInt(quantity),
            student_type,
            school_id,
            branch_id || null
          ];
          
          const [insertResult] = await db.sequelize.query(insertSQL, {
            replacements: insertValues,
            type: db.sequelize.QueryTypes.INSERT
          });
          
          const newRevenueId = insertResult;
          
          createdRevenues.push({
            id: newRevenueId,
            code: code,
            description: description,
            amount: parseFloat(amount),
            quantity: parseInt(quantity),
            total_amount: parseFloat(amount) * parseInt(quantity),
            status: status,
            class_code: classObj.value,
            class_name: classObj.label,
            term: termObj.value,
            academic_year: academic_year
          });
          
          successCount++;
          console.log(`✅ Revenue created successfully: ${code} for ${classObj.label} - ${termObj.value}`);
          
        } catch (error) {
          console.error(`❌ Error creating revenue for ${classObj.label} - ${termObj.value}:`, error.message);
          errors.push({
            class_code: classObj.value,
            class_name: classObj.label,
            term: termObj.value,
            error: error.message
          });
          errorCount++;
        }
      }
    }

    console.log('✅ Revenue creation completed:', {
      total_combinations: classes.length * terms.length,
      success_count: successCount,
      error_count: errorCount
    });

    res.json({
      success: errorCount === 0,
      message: `Revenue creation completed: ${successCount} successful, ${errorCount} failed`,
      data: {
        created_revenues: createdRevenues,
        success_count: successCount,
        error_count: errorCount,
        errors: errors,
        total_combinations: classes.length * terms.length
      },
      system: 'SQL'
    });

  } catch (error) {
    console.error('❌ Error creating revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create revenue',
      error: error.message,
      system: 'SQL'
    });
  }
};

/**
 * UPDATE SCHOOL REVENUE
 * Replaces: CALL school_revenues('UPDATE', ...)
 */

const updateRevenue = async (req, res) => {
  try {
    const code = req.params.code || req.body.code || req.body.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Revenue code is required for update'
      });
    }

    const school_id = req.user?.school_id || 
                     req.headers['x-school-id'] || 
                     req.body.school_id;
    const branch_id = req.user?.branch_id || 
                     req.headers['x-branch-id'] || 
                     req.body.branch_id;

    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID and Branch ID are required'
      });
    }

    // Allowed fields to update (prevents accidental overwrite)
    const allowedFields = [
      'description',
      'amount',
      'term',
      'section',
      'class_name',
      'class_code',
      'revenue_type',
      'is_optional',
      'status',
      'account_type',
      'academic_year',
      'quantity'
    ];

    // Build SET clause dynamically
    const updates = [];
    const values = [];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    // Add WHERE conditions
    values.push(code, school_id, branch_id);

    // Run raw SQL UPDATE
    const [result] = await db.sequelize.query(
      `
      UPDATE school_revenues
      SET ${updates.join(', ')}
      WHERE code = ? AND school_id = ? AND branch_id = ?
      `,
      { replacements: values, type: QueryTypes.UPDATE }
    );

    // Fetch updated record
    const [updatedRevenue] = await db.sequelize.query(
      `
      SELECT code, description, amount, quantity, status, class_code
      FROM school_revenues
      WHERE code = ? AND school_id = ? AND branch_id = ?
      `,
      {
        replacements: [code, school_id, branch_id],
        type: QueryTypes.SELECT
      }
    );

    if (!updatedRevenue) {
      return res.status(404).json({
        success: false,
        message: `Revenue with code ${code} not found`
      });
    }

    res.json({
      success: true,
      message: 'Revenue updated successfully',
      data: updatedRevenue
    });

  } catch (error) {
    console.error('❌ Error updating revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update revenue',
      error: error.message
    });
  }
};




/**
 * DELETE SCHOOL REVENUE
 * Replaces: CALL school_revenues('DELETE', ...)
 */
const deleteRevenue = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Get code from params or body
    const code = req.params.code || req.body.code || req.body.id;
    
    if (!code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Revenue code is required for deletion'
      });
    }

    // Get school_id from multiple sources
    const school_id = req.user?.school_id || 
                     req.headers['x-school-id'] || 
                     req.body.school_id;
    
    if (!school_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    console.log('🗑️ Deleting revenue with code:', code, 'for school:', school_id);

    // Find the revenue first
    const revenue = await SchoolRevenue.findOne({
      where: {
        code,
        school_id
      },
      transaction
    });

    if (!revenue) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Revenue with code ${code} not found`
      });
    }

    // Soft delete by setting status to 'Archived'
    await SchoolRevenue.update(
      { status: 'Archived' },
      {
        where: {
          code,
          school_id
        },
        transaction
      }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Revenue deleted successfully',
      data: {
        code: revenue.code,
        status: 'Archived'
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error deleting revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete revenue',
      error: error.message
    });
  }
};

/**
 * GET SCHOOL REVENUES
 * Replaces: CALL school_revenues('SELECT', ...)
 */
const getRevenues = async (req, res) => {
  try {
    const {
      id,
      code,
      class_code,
      class_name,
      term,
      section,
      revenue_type,
      status = '',
      academic_year,
      is_optional,
      limit = 50,
      offset = 0
    } = req.query;

    // Get school_id from multiple sources with fallbacks
    const school_id = req.user?.school_id || 
                     req.headers['x-school-id'] || 
                     req.query.school_id || 
                     req.body.school_id;
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required',
        error: 'Missing school_id in user, headers, or query parameters'
      });
    }

    const where = {
      school_id: school_id
    };

    // Build where conditions
    if (code) where.code = code;
    if (id) where.id = id;
    if (class_code) where.class_code = class_code;
    if (class_name) where.class_name = class_name;
    if (term) where.term = term;
    if (section) where.section = section;
    if (academic_year) where.academic_year = academic_year;
    if (revenue_type) where.revenue_type = revenue_type;
    if (is_optional !== undefined) where.is_optional = is_optional === 'true' ? 'Yes' : 'No';
    
    // Filter by status - default to Active if not specified, 'all' shows Active+Posted only
    if (status && status !== 'all') {
      // Handle case insensitive status matching
      const statusMap = {
        'active': 'Active',
        'posted': 'Posted', 
        'archived': 'Archived',
        'draft': 'Draft'
      };
      where.status = statusMap[status.toLowerCase()] || status;
    } else if (status === 'all') {
      // Show Active and Posted, but exclude Archived
      where.status = { [db.Sequelize.Op.in]: ['Active', 'Posted'] };
    } else if (!status) {
      where.status = 'Active';
    }

    console.log('🔍 Getting revenues with filters:', where);

    const revenues = await SchoolRevenue.findAll({
      where,
      order: [['class_code', 'ASC'], ['revenue_type', 'ASC'], ['description', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Transform for frontend
    const transformedRevenues = revenues.map(revenue => ({
      id: revenue.code,
      item_id: revenue.code,
      code: revenue.code,
      description: revenue.description,
      amount: revenue.amount,
      quantity: revenue.quantity || 1,
      total_amount: revenue.amount * (revenue.quantity || 1),
      term: revenue.term,
      section: revenue.section,
      class_name: revenue.class_name,
      class_code: revenue.class_code,
      revenue_type: revenue.revenue_type,
      is_optional: revenue.is_optional,
      status: revenue.status,
      account_type: revenue.account_type,
      academic_year: revenue.academic_year,
      created_at: revenue.created_at,
      student_type: revenue.student_type || 'All',
      unit_price: revenue.unit_price,
      source: 'School Fees',
      student_count: 0,
      expected_amount: 0,
      due_date: null
    }));

    // Calculate totals
    const totalAmount = transformedRevenues.reduce((sum, item) => sum + item.total_amount, 0);

    res.json({
      success: true,
      message: 'Revenues retrieved successfully',
      data: transformedRevenues,
      totals: {
        total_amount: totalAmount,
        count: transformedRevenues.length
      },
      filters: { class_code, term, section, status, academic_year }
    });

  } catch (error) {
    console.error('❌ Error getting revenues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenues',
      error: error.message
    });
  }
};

/**
 * GET REVENUES BY CLASS
 * Replaces: CALL school_revenues('SELECT', ...) with class filtering
 */
const getRevenuesByClass = async (req, res) => {
  try {
    const {
      class_code,
      term,
      academic_year,
      status = 'Active',
      include_optional = true
    } = req.query;

    if (!class_code) {
      return res.status(400).json({
        success: false,
        message: 'class_code is required'
      });
    }

    const school_id = req.user?.school_id || req.headers['x-school-id'];
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const where = {
      class_code,
      school_id,
      status
    };

    if (term) where.term = term;
    if (academic_year) where.academic_year = academic_year;
    if (include_optional === 'false') where.is_optional = 'No';

    const revenues = await SchoolRevenue.findAll({
      where,
      order: [['revenue_type', 'ASC'], ['description', 'ASC']]
    });

    // Calculate grand total
    const grandTotal = revenues.reduce((sum, revenue) => {
      const amount = parseFloat(revenue.amount || 0);
      const quantity = parseInt(revenue.quantity || 1);
      return sum + (amount * quantity);
    }, 0);

    res.json({
      success: true,
      message: 'Class revenues retrieved successfully',
      data: {
        class_code,
        term,
        academic_year,
        grouped_revenues: revenues,
        grand_total: grandTotal,
        total_items: revenues.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting class revenues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get class revenues',
      error: error.message
    });
  }
};

/**
 * GET REVENUE ITEMS
 * Returns individual revenue items for detailed view
 */
const getRevenueItems = async (req, res) => {
  try {
    const {
      class_code,
      academic_year,
      term,
      revenue_type,
      status
    } = req.query;

    // For inventory/quick-sale context (revenue_type=ITEMS), class_code is optional
    const isInventoryRequest = revenue_type === 'ITEMS' && status === 'Active';
    
    if (!class_code && !isInventoryRequest) {
      return res.status(400).json({
        success: false,
        message: 'class_code is required for detailed revenue items'
      });
    }

    // Get school_id from multiple sources with fallbacks
    const school_id = req.user?.school_id || 
                     req.headers['x-school-id'] || 
                     req.query.school_id || 
                     req.body.school_id;

    const branch_id = req.user?.branch_id || 
                     req.headers['x-branch-id'] || 
                     req.query.branch_id || 
                     req.body.branch_id;
                  
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const where = {
      school_id: school_id,
      status: { [Op.in]: ['Posted', 'Active', 'Published'] }
    };

    // Only add class_code to where clause if it's provided
    if (class_code) {
      where.class_code = class_code;
    }

    // Only add academic_year if provided
    if (academic_year) {
      where.academic_year = academic_year;
    }

    // Only add term if provided
    if (term) {
      where.term = term;
    }

    if (branch_id) {
      where.branch_id = branch_id;
    }

    console.log('📝 Getting individual revenue items with filters:', where);

    // Get individual revenue items
    const revenueItems = await SchoolRevenue.findAll({
      where,
      order: [['revenue_type', 'ASC'], ['description', 'ASC']]
    });

    console.log(`✅ Found ${revenueItems.length} individual revenue items`);

    // Transform for frontend
    const transformedItems = revenueItems.map(item => ({
      id: item.code,
      code: item.code,
      description: item.description,
      amount: item.amount,
      quantity: item.quantity || 1,
      total_amount: item.amount * (item.quantity || 1),
      term: item.term,
      section: item.section,
      class_name: item.class_name,
      class_code: item.class_code,
      revenue_type: item.revenue_type,
      item_category: item.revenue_type,
      is_optional: item.is_optional,
      status: item.status,
      account_type: item.account_type,
      academic_year: item.academic_year,
      created_at: item.created_at,
      updated_at: item.updated_at,
      student_type: item.student_type || 'All',
      unit_price: item.unit_price,
      due_date: item.due_date
    }));

    // Calculate totals
    const summary = {
      total_items: transformedItems.length,
      total_amount: transformedItems.reduce((sum, item) => sum + item.total_amount, 0),
      fees_count: transformedItems.filter(item => item.revenue_type === 'Fees').length,
      items_count: transformedItems.filter(item => item.revenue_type === 'Items').length,
      optional_count: transformedItems.filter(item => item.is_optional === 'Yes').length,
      mandatory_count: transformedItems.filter(item => item.is_optional === 'No').length
    };

    res.json({
      success: true,
      message: `Retrieved ${transformedItems.length} revenue items for class ${class_code}`,
      data: transformedItems,
      summary,
      class_code,
      filters: { class_code, academic_year, term },
      system: 'ORM_INDIVIDUAL_ITEMS'
    });

  } catch (error) {
    console.error('❌ Error getting revenue items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue items',
      error: error.message,
      system: 'ORM_INDIVIDUAL_ITEMS'
    });
  }
};

/**
 * GET AGGREGATED CLASS REVENUES
 * Returns aggregated revenue data per class
 
// const getAggregatedClassRevenues = async (req, res) => {
//   try {
//     const {
//       academic_year,
//       term,
//       status
//     } = req.query;

//     // Get school_id from multiple sources with fallbacks
//     const school_id = req.user?.school_id || 
//                      req.headers['x-school-id'] || 
//                      req.query.school_id || 
//                      req.body.school_id;
    
//     const branch_id = req.user?.branch_id || 
//                      req.headers['x-branch-id'] || 
//                      req.query.branch_id || 
//                      req.body.branch_id;
    
//     // Validate required parameters
//     if (!school_id || !academic_year || !term) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required parameters: school_id, academic_year, term',
//         error: 'MISSING_REQUIRED_PARAMETERS'
//       });
//     }

//     const where = {
//       school_id: school_id,
//       academic_year: academic_year,
//       term: term
//     };
    
//     // Only add status filter if explicitly provided
//     if (status) {
//       where.status = status;
//     }

//     if (branch_id) {
//       where.branch_id = branch_id;
//     }

//     console.log('📊 Getting aggregated class revenues with filters:', where);
    
//     // First, let's check if there are ANY records for this school
//     const totalRecords = await SchoolRevenue.count({
//       where: { school_id: school_id }
//     });
//     console.log(`📊 Total records for school ${school_id}: ${totalRecords}`);
    
//     // Check records with just academic_year and term
//     const basicRecords = await SchoolRevenue.count({
//       where: {
//         school_id: school_id,
//         academic_year: academic_year,
//         term: term
//       }
//     });
//     console.log(`📊 Records with academic_year=${academic_year} and term=${term}: ${basicRecords}`);
    
//     // Check what statuses exist
//     const statusCheck = await SchoolRevenue.findAll({
//       where: {
//         school_id: school_id,
//         academic_year: academic_year,
//         term: term
//       },
//       attributes: [
//         'status',
//         [fn('COUNT', col('code')), 'count']
//       ],
//       group: ['status'],
//       raw: true
//     });
//     console.log('📊 Status distribution:', statusCheck);

//     // Get aggregated data per class
//     const aggregatedRevenues = await SchoolRevenue.findAll({
//       where,
//       attributes: [
//         'class_code',
//         'class_name', 
//         'term',
//         'academic_year',
//         [fn('COUNT', col('code')), 'items_count'],
//         [fn('SUM', col('amount')), 'total_amount'],
//         [fn('GROUP_CONCAT', col('revenue_type')), 'revenue_types'],
//         [fn('GROUP_CONCAT', col('description')), 'descriptions'],
//         [fn('MIN', col('created_at')), 'first_created'],
//         [fn('MAX', col('updated_at')), 'last_updated']
//       ],
//       group: [
//         'class_code',
//         'class_name',
//         'term', 
//         'academic_year'
//       ],
//       order: [['class_code', 'ASC'], ['term', 'ASC']],
//       logging: console.log // Enable SQL logging
//     });

//     console.log(`✅ Found ${aggregatedRevenues.length} aggregated class revenue records`);
    
//     // If no aggregated results, let's try a simpler query to see what's available
//     if (aggregatedRevenues.length === 0) {
//       console.log('⚠️ No aggregated results found, checking individual records...');
//       const individualRecords = await SchoolRevenue.findAll({
//         where,
//         limit: 5,
//         logging: console.log
//       });
//       console.log(`🔍 Found ${individualRecords.length} individual records with same filters`);
//       if (individualRecords.length > 0) {
//         console.log('🔍 Sample record:', {
//           class_code: individualRecords[0].class_code,
//           class_name: individualRecords[0].class_name,
//           term: individualRecords[0].term,
//           academic_year: individualRecords[0].academic_year,
//           status: individualRecords[0].status,
//           amount: individualRecords[0].amount
//         });
//       }
//     }

//     // Transform for frontend compatibility with existing FeesSetup component
//     const transformedRevenues = aggregatedRevenues.map(revenue => {
//       const revenueTypes = revenue.get('revenue_types') ? 
//         revenue.get('revenue_types').split(',').filter((v, i, a) => a.indexOf(v) === i) : ['FEES'];
      
//       // Create unique identifier for aggregated data
//       const uniqueId = `AGG-${revenue.class_code}-${revenue.term}-${revenue.academic_year}`.replace(/[^a-zA-Z0-9-]/g, '-');
      
//       return {
//         code: uniqueId, // Unique identifier for aggregated data
//         class_name: revenue.class_name,
//         class_code: revenue.class_code,
//         total_amount: parseFloat(revenue.get('total_amount')) || 0,
//         term: revenue.term,
//         academic_year: revenue.academic_year,
//         status: 'No Record', // Default status for aggregated view
//         student_count: 0, // Will be populated by student count API
//         expected_amount: 0, // Will be populated by student count API
//         id: uniqueId, // Unique identifier for aggregated data
//         item_id: uniqueId, // Unique identifier for aggregated data
//         revenue_type: revenueTypes[0] || 'FEES', // Primary revenue type
//         item_category: 'School Fees', // Default for FeesSetup page
//         items_count: parseInt(revenue.get('items_count')) || 0,
//         revenue_types: revenueTypes,
//         descriptions: revenue.get('descriptions'),
//         first_created: revenue.get('first_created'),
//         last_updated: revenue.get('last_updated')
//       };
//     });

//     // Calculate summary totals
//     const summary = {
//       total_classes: transformedRevenues.length,
//       grand_total_amount: transformedRevenues.reduce((sum, item) => sum + item.total_amount, 0),
//       total_revenue_items: transformedRevenues.reduce((sum, item) => sum + item.items_count, 0),
//       average_per_class: transformedRevenues.length > 0 ? 
//         transformedRevenues.reduce((sum, item) => sum + item.total_amount, 0) / transformedRevenues.length : 0
//     };

//     res.json({
//       success: true,
//       message: `Retrieved ${transformedRevenues.length} aggregated class revenue records`,
//       data: transformedRevenues,
//       summary,
//       aggregation_type: 'per_class',
//       filters: { academic_year, term, status, school_id, branch_id },
//       system: 'ORM_AGGREGATED_CLASSES'
//     });

//   } catch (error) {
//     console.error('❌ Error getting aggregated class revenues:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get aggregated class revenues',
//       error: error.message,
//       system: 'ORM_AGGREGATED_CLASSES'
//     });
//   }
// };

*/
// const getAggregatedClassRevenues = async (req, res) => {
//   try {
//     const { academic_year, term, status } = req.query;

//     const school_id =
//       req.user?.school_id ||
//       req.headers['x-school-id'] ||
//       req.query.school_id ||
//       req.body.school_id;

//     const branch_id =
//       req.user?.branch_id ||
//       req.headers['x-branch-id'] ||
//       req.query.branch_id ||
//       req.body.branch_id;

//     if (!school_id || !academic_year || !term) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required parameters: school_id, academic_year, term',
//         error: 'MISSING_REQUIRED_PARAMETERS'
//       });
//     }

//     console.log('📊 Getting aggregated class revenues (student-count decoupled + expected)', {
//       school_id,
//       branch_id,
//       academic_year,
//       term,
//       status
//     });

//     const sql = `
//       WITH student_counts AS (
//         SELECT 
//           current_class AS class_code,
//           COUNT(DISTINCT admission_no) AS student_count
//         FROM students
//         WHERE school_id = :school_id
//           ${branch_id ? 'AND branch_id = :branch_id' : ''}
//         GROUP BY current_class
//       ),
//       published_revenue_amounts AS (
//         SELECT 
//           class_code,
//           SUM(CASE WHEN status = 'Posted' THEN amount ELSE 0 END) AS published_total_amount
//         FROM school_revenues
//         WHERE school_id = :school_id
//           AND academic_year = :academic_year
//           AND term = :term
//           AND status IN ('Posted', 'Active', 'Pending')
//           ${branch_id ? 'AND branch_id = :branch_id' : ''}
//         GROUP BY class_code
//       ),
//       revenue_counts AS (
//         SELECT 
//           class_code,
//           COUNT(DISTINCT CASE WHEN status = 'Posted' THEN code END) AS published_items,
//           COUNT(DISTINCT CASE WHEN status IN ('Posted', 'Active', 'Pending') THEN code END) AS total_items,
//           SUM(CASE WHEN status = 'Posted' THEN amount ELSE 0 END) AS published_amount,
//           SUM(CASE WHEN status IN ('Posted', 'Active', 'Pending') THEN amount ELSE 0 END) AS total_amount_all
//         FROM school_revenues
//         WHERE school_id = :school_id
//           AND academic_year = :academic_year
//           AND term = :term
//           AND status IN ('Posted', 'Active', 'Pending')
//           ${branch_id ? 'AND branch_id = :branch_id' : ''}
//         GROUP BY class_code
//       )
//       SELECT 
//         sc.class_code,
//         MAX(s.class_name) AS class_name,
//         :term AS term,
//         :academic_year AS academic_year,
//         sc.student_count,
//         COALESCE(pra.published_total_amount * sc.student_count, 0) AS expected_amount,
//         COALESCE(rc.total_items, 0) AS items_count,
//         COALESCE(rc.published_items, 0) AS published_items,
//         COALESCE(rc.published_amount, 0) AS published_amount,
//         COALESCE(rc.total_amount_all, 0) AS total_amount,
//         GROUP_CONCAT(DISTINCT sr.revenue_type) AS revenue_types,
//         GROUP_CONCAT(DISTINCT sr.description) AS descriptions,
//         MIN(sr.created_at) AS first_created,
//         MAX(sr.updated_at) AS last_updated
//       FROM student_counts sc
//       LEFT JOIN students s 
//         ON s.current_class = sc.class_code
//         AND s.school_id = :school_id
//         ${branch_id ? 'AND s.branch_id = :branch_id' : ''}
//       LEFT JOIN revenue_counts rc
//         ON rc.class_code = sc.class_code
//       LEFT JOIN school_revenues sr
//         ON sr.class_code = sc.class_code
//         AND sr.school_id = :school_id
//         AND sr.academic_year = :academic_year
//         AND sr.term = :term
//         AND sr.status IN ('Posted', 'Active', 'Pending')
//         ${branch_id ? 'AND sr.branch_id = :branch_id' : ''}
//       LEFT JOIN published_revenue_amounts pra
//         ON pra.class_code = sc.class_code
//       GROUP BY sc.class_code
//       ORDER BY sc.class_code ASC;
//     `;

//     const aggregatedRevenues = await db.sequelize.query(sql, {
//       replacements: {
//         school_id,
//         academic_year,
//         term,
//         branch_id: branch_id ?? null,
//         status: status ?? null
//       },
//       type: QueryTypes.SELECT
//     });

//     console.log(`✅ Found ${aggregatedRevenues.length} aggregated class revenue records`);

//     const transformedRevenues = aggregatedRevenues.map(r => {
//       const revenueTypes = r.revenue_types
//         ? String(r.revenue_types).split(',').filter((v, i, a) => a.indexOf(v) === i)
//         : [];

//       const uniqueId = `AGG-${r.class_code || 'NO_CLASS'}-${r.term}-${r.academic_year}`.replace(
//         /[^a-zA-Z0-9-]/g,
//         '-'
//       );

//       const totalAmount = parseFloat(r.total_amount) || 0; // This is now sum of published items only
//       const expectedAmount = parseFloat(r.expected_amount) || 0;
//       const studentCount = parseInt(r.student_count, 10) || 0;
//       const totalItems = parseInt(r.items_count, 10) || 0;
//       const publishedItems = parseInt(r.published_items, 10) || 0;

//       return {
//         id: uniqueId,
//         code: uniqueId,
//         class_code: r.class_code || null,
//         class_name: r.class_name || null,
//         student_count: studentCount,
//         expected_amount: expectedAmount,
//         total_amount: totalAmount, // Sum of published items only
//         balance_remaining: expectedAmount - totalAmount,
//         avg_amount: studentCount > 0 ? totalAmount / studentCount : 0,
//         term: r.term,
//         academic_year: r.academic_year,
//         status: publishedItems > 0 ? 'Billed' : 'Unbilled',
//         item_id: uniqueId,
//         revenue_type: revenueTypes[0] || 'N/A',
//         item_category: 'School Fees',
//         items_count: totalItems, // Total items (published + unpublished)
//         published_items: publishedItems, // Published items count
//         revenue_types: revenueTypes,
//         descriptions: r.descriptions || null,
//         first_created: r.first_created || null,
//         last_updated: r.last_updated || null
//       };
//     });

//     // billed vs unbilled count
//     let billed_count = 0;
//     let unbilled_count = 0;
//     if (transformedRevenues.length > 0) {
//       const classCodes = transformedRevenues.map(r => r.class_code).filter(Boolean);

//       if (classCodes.length > 0) {
//         const billedClasses = await db.sequelize.query(
//           `
//           SELECT DISTINCT class_code
//           FROM payment_entries
//           WHERE school_id = :school_id
//             AND academic_year = :academic_year
//             AND term = :term
//             AND class_code IN (:classCodes)
//           `,
//           {
//             replacements: { school_id, academic_year, term, classCodes },
//             type: QueryTypes.SELECT
//           }
//         );

//         const billedSet = new Set(billedClasses.map(r => r.class_code));
//         billed_count = billedSet.size;
//         unbilled_count = classCodes.filter(code => !billedSet.has(code)).length;
//       }
//     }

//     // summary
//     const total_amount_sum = transformedRevenues.reduce((sum, item) => sum + item.total_amount, 0);
//     const total_students = transformedRevenues.reduce((sum, item) => sum + item.student_count, 0);

//     const summary = {
//       total_classes: transformedRevenues.length,
//       grand_total_amount: total_amount_sum,
//       total_revenue_items: transformedRevenues.reduce((sum, item) => sum + item.items_count, 0),
//       average_per_class: transformedRevenues.length > 0 ? total_amount_sum / transformedRevenues.length : 0,
//       billed_count,
//       unbilled_count,
//       total_students
//     };

//     res.json({
//       success: true,
//       message: `Retrieved ${transformedRevenues.length} aggregated class revenue records`,
//       data: transformedRevenues,
//       summary,
//       aggregation_type: 'per_class',
//       filters: { academic_year, term, status, school_id, branch_id },
//       system: 'RAWSQL_AGGREGATED_CLASSES'
//     });
//   } catch (error) {
//     console.error('❌ Error getting aggregated class revenues:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get aggregated class revenues',
//       error: error.message,
//       system: 'RAWSQL_AGGREGATED_CLASSES'
//     });
//   }
// };

const getAggregatedClassRevenues = async (req, res) => {
  try {
    const { academic_year, term, status, exclude_parent_classes } = req.query;

    const school_id =
      req.user?.school_id ||
      req.headers['x-school-id'] ||
      req.query.school_id ||
      req.body.school_id;

    const branch_id =
      req.user?.branch_id ||
      req.headers['x-branch-id'] ||
      req.query.branch_id ||
      req.body.branch_id;

    if (!school_id || !academic_year || !term) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: school_id, academic_year, term',
        error: 'MISSING_REQUIRED_PARAMETERS'
      });
    }

    console.log('📊 Getting aggregated class revenues - all active classes with payment_entries data', {
      school_id,
      branch_id,
      academic_year,
      term,
      status,
      exclude_parent_classes
    });

    // Show ALL active classes, with payment_entries data where available
    // Exclude parent classes if requested
    const parentClassFilter = exclude_parent_classes === 'true' ? `
      AND c.class_code NOT IN (
        SELECT DISTINCT parent_id 
        FROM classes 
        WHERE parent_id IS NOT NULL 
        AND school_id = :school_id
        ${branch_id ? 'AND branch_id = :branch_id' : ''}
      )
    ` : '';

    const sql = `
      SELECT 
        c.class_code,
        c.class_name,
        c.parent_id,
        COALESCE(s_summary.student_count, 0) AS student_count,
        COALESCE(pe_summary.expected_amount, 0) AS expected_amount,
        COALESCE(pe_summary.collected_amount, 0) AS collected_amount,
        COALESCE(pe_summary.items_count, 0) AS items_count,
        'Published' AS status,
        :term AS term,
        :academic_year AS academic_year
      FROM classes c
      LEFT JOIN (
        SELECT 
          s.current_class,
          COUNT(DISTINCT s.admission_no) AS student_count
        FROM students s
        WHERE s.school_id = :school_id
          ${branch_id ? 'AND s.branch_id = :branch_id' : ''}
          AND s.status IN ('Active', 'Suspended')
        GROUP BY s.current_class
      ) s_summary ON c.class_code = s_summary.current_class
      LEFT JOIN (
        SELECT 
          s.current_class as class_code,
          SUM(CASE 
            WHEN pe.cr > 0 AND pe.payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') AND pe.description NOT IN ('Discount', 'Scholarship', 'Refund')
            THEN pe.cr 
            ELSE 0 
          END) + SUM(CASE 
            WHEN pe.cr < 0 AND pe.description IN ('Discount', 'Scholarship')
            THEN pe.cr 
            ELSE 0 
          END) as expected_amount,
          SUM(CASE 
            WHEN pe.dr > 0 AND pe.payment_status IN ('Confirmed', 'Paid', 'completed') 
            THEN pe.dr 
            ELSE 0 
          END) - SUM(CASE 
            WHEN pe.payment_status = 'Refund' AND pe.cr > 0 
            THEN pe.cr 
            ELSE 0 
          END) as collected_amount,
          COUNT(DISTINCT CASE 
            WHEN pe.cr > 0 AND pe.payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') AND pe.description NOT IN ('Discount', 'Scholarship', 'Refund')
            THEN pe.ref_no 
          END) as items_count
        FROM payment_entries pe
        LEFT JOIN students s ON pe.admission_no = s.admission_no AND pe.school_id = s.school_id
        WHERE pe.school_id = :school_id
          AND pe.term = :term 
          AND pe.academic_year = :academic_year
          ${branch_id ? 'AND pe.branch_id = :branch_id' : ''}
          AND pe.payment_status NOT IN ('Excluded', 'excluded', 'EXCLUDED')
        GROUP BY s.current_class
      ) pe_summary ON c.class_code = pe_summary.class_code
      WHERE c.school_id = :school_id
        ${branch_id ? 'AND c.branch_id = :branch_id' : ''}
        AND c.status = 'Active'
        ${parentClassFilter}
      ORDER BY c.class_name ASC
    `;

    const aggregatedRevenues = await db.sequelize.query(sql, {
      replacements: {
        school_id,
        academic_year,
        term,
        branch_id: branch_id ?? null,
        status: status ?? null
      },
      type: QueryTypes.SELECT
    });

    console.log(`✅ Found ${aggregatedRevenues.length} aggregated class revenue records`);
    console.log('🔍 Sample aggregated data:', aggregatedRevenues.slice(0, 3));

    const transformedRevenues = aggregatedRevenues.map(r => {
      const revenueTypes = r.revenue_types
        ? String(r.revenue_types).split(',').filter((v, i, a) => a.indexOf(v) === i)
        : [];

      const uniqueId = `AGG-${r.class_code || 'NO_CLASS'}-${r.term}-${r.academic_year}`.replace(
        /[^a-zA-Z0-9-]/g,
        '-'
      );

      const totalAmount = parseFloat(r.collected_amount) || 0;
      const expectedAmount = parseFloat(r.expected_amount) || 0;
      const studentCount = parseInt(r.student_count, 10) || 0;
      const totalItems = parseInt(r.items_count, 10) || 0;
      const publishedItems = parseInt(r.published_items, 10) || 0;

      return {
        id: uniqueId,
        code: uniqueId,
        class_code: r.class_code || null,
        class_name: r.class_name || null,
        student_count: studentCount,
        expected_amount: expectedAmount,
        total_amount: totalAmount,
        collected_amount: totalAmount,
        balance_remaining: expectedAmount - totalAmount,
        avg_amount: studentCount > 0 ? totalAmount / studentCount : 0,
        term: r.term,
        academic_year: r.academic_year,
        status: publishedItems > 0 ? 'Billed' : 'Unbilled',
        item_id: uniqueId,
        revenue_type: revenueTypes[0] || 'N/A',
        item_category: 'School Fees',
        items_count: totalItems,
        published_items: publishedItems,
        revenue_types: revenueTypes,
        descriptions: r.descriptions || null,
        first_created: r.first_created || null,
        last_updated: r.last_updated || null
      };
    });

    // billed vs unbilled count
    let billed_count = 0;
    let unbilled_count = 0;
    if (transformedRevenues.length > 0) {
      const classCodes = transformedRevenues.map(r => r.class_code).filter(Boolean);

      if (classCodes.length > 0) {
        const billedClasses = await db.sequelize.query(
          `
          SELECT DISTINCT class_code
          FROM payment_entries
          WHERE school_id = :school_id
            AND academic_year = :academic_year
            AND term = :term
            AND class_code IN (:classCodes)
          `,
          {
            replacements: { school_id, academic_year, term, classCodes },
            type: QueryTypes.SELECT
          }
        );

        const billedSet = new Set(billedClasses.map(r => r.class_code));
        billed_count = billedSet.size;
        unbilled_count = classCodes.filter(code => !billedSet.has(code)).length;
      }
    }

    // summary - use the raw aggregatedRevenues data for accurate calculations
    const total_expected_amount = aggregatedRevenues.reduce((sum, item) => sum + (parseFloat(item.expected_amount) || 0), 0);
    const total_students = aggregatedRevenues.reduce((sum, item) => sum + (parseInt(item.student_count) || 0), 0);

    console.log('🔍 Summary calculation debug:', {
      total_classes: aggregatedRevenues.length,
      total_expected_amount,
      total_students,
      sample_data: aggregatedRevenues.slice(0, 2).map(r => ({
        class_name: r.class_name,
        student_count: r.student_count,
        expected_amount: r.expected_amount
      }))
    });

    const summary = {
      total_classes: aggregatedRevenues.length,
      grand_total_amount: total_expected_amount,
      total_revenue_items: aggregatedRevenues.reduce((sum, item) => sum + (parseInt(item.items_count) || 0), 0),
      average_per_class: aggregatedRevenues.length > 0 ? total_expected_amount / aggregatedRevenues.length : 0,
      billed_count,
      unbilled_count,
      total_students
    };

    res.json({
      success: true,
      message: `Retrieved ${transformedRevenues.length} aggregated class revenue records`,
      data: transformedRevenues,
      summary,
      aggregation_type: 'per_class',
      filters: { academic_year, term, status, school_id, branch_id },
      system: 'RAWSQL_AGGREGATED_CLASSES'
    });
  } catch (error) {
    console.error('❌ Error getting aggregated class revenues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get aggregated class revenues',
      error: error.message,
      system: 'RAWSQL_AGGREGATED_CLASSES'
    });
  }
};


// Export all functions directly
module.exports = {
  createRevenue,
  updateRevenue,
  deleteRevenue,
  getRevenues,
  getRevenuesByClass,
  getRevenueItems,
  getAggregatedClassRevenues,
  // Add other methods as needed
  copyRevenuesToClass: async (req, res) => {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  },
  getRevenueAnalytics: async (req, res) => {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  },
  bulkCreateRevenues: async (req, res) => {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }
};