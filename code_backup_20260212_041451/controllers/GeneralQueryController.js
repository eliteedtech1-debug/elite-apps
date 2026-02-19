const db = require('../models');
const { Op } = require('sequelize');
const sequelize = db.sequelize;

/**
 * GENERAL QUERY CONTROLLER
 * 
 * Provides generic querying functionality with automatic branch filtering.
 * Always filters by current user's school_id and branch_id to ensure data isolation.
 * 
 * Uses the correct table structure:
 * - SchoolSetup (school_setup table) for school information
 * - SchoolLocation (school_locations table) for branch/location information
 * 
 * Supported operations:
 * - select-all: Get all records for current branch
 * - select: Get filtered records for current branch
 */

class GeneralQueryController {

  /**
   * SELECT-ALL: Get all records from a table for the current user's branch
   * Always filters by school_id and branch_id from user context
   */
  async selectAll(req, res) {
    try {
      const {
        table_name,
        model_name,
        limit = 100,
        offset = 0,
        order_by = 'created_at',
        order_direction = 'DESC',
        include_relations = false
      } = req.body;

      console.log('🔍 GeneralQuery: select-all request', {
        table_name,
        model_name,
        user_school_id: req.user.school_id,
        user_branch_id: req.user.branch_id,
        limit,
        offset
      });

      // Determine the model to use
      const modelName = model_name || this.getModelNameFromTable(table_name);
      if (!modelName) {
        return res.status(400).json({
          success: false,
          message: "table_name or model_name is required"
        });
      }

      // Get the model
      const Model = db[modelName];
      if (!Model) {
        return res.status(400).json({
          success: false,
          message: `Model '${modelName}' not found`
        });
      }

      // Build base where clause with branch filtering
      const whereClause = this.buildBranchFilter(req.user);

      // Build query options
      const queryOptions = {
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[order_by, order_direction.toUpperCase()]]
      };

      // Add relations if requested
      if (include_relations && Model.associations) {
        queryOptions.include = this.buildIncludeOptions(Model);
      }

      console.log('🔍 GeneralQuery: Executing select-all with options:', {
        modelName,
        whereClause,
        limit: queryOptions.limit,
        offset: queryOptions.offset
      });

      // Execute query
      const results = await Model.findAll(queryOptions);

      // Get total count for pagination
      const totalCount = await Model.count({ where: whereClause });

      console.log(`✅ GeneralQuery: select-all found ${results.length} records (total: ${totalCount})`);

      res.json({
        success: true,
        message: `All ${modelName} records retrieved successfully`,
        data: results,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < totalCount
        },
        query_type: "select-all",
        system: "general_query_controller",
        debug: {
          model_name: modelName,
          table_name: table_name,
          branch_filter: whereClause,
          result_count: results.length
        }
      });

    } catch (error) {
      console.error('❌ GeneralQuery: Error in select-all:', error);
      res.status(500).json({
        success: false,
        message: "Error retrieving records",
        error: error.message,
        system: "general_query_controller"
      });
    }
  }

  /**
   * SELECT: Get filtered records from a table for the current user's branch
   * Applies additional filters while maintaining branch isolation
   */
  async select(req, res) {
    try {
      const {
        table_name,
        model_name,
        where_conditions = {},
        limit = 100,
        offset = 0,
        order_by = 'created_at',
        order_direction = 'DESC',
        include_relations = false,
        attributes = null // Specific columns to select
      } = req.body;

      console.log('🔍 GeneralQuery: select request', {
        table_name,
        model_name,
        where_conditions,
        user_school_id: req.user.school_id,
        user_branch_id: req.user.branch_id
      });

      // Determine the model to use
      const modelName = model_name || this.getModelNameFromTable(table_name);
      if (!modelName) {
        return res.status(400).json({
          success: false,
          message: "table_name or model_name is required"
        });
      }

      // Get the model
      const Model = db[modelName];
      if (!Model) {
        return res.status(400).json({
          success: false,
          message: `Model '${modelName}' not found`
        });
      }

      // Build where clause: branch filter + additional conditions
      const branchFilter = this.buildBranchFilter(req.user);
      const whereClause = {
        [Op.and]: [
          branchFilter,
          where_conditions
        ]
      };

      // Build query options
      const queryOptions = {
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[order_by, order_direction.toUpperCase()]]
      };

      // Add specific attributes if requested
      if (attributes && Array.isArray(attributes)) {
        queryOptions.attributes = attributes;
      }

      // Add relations if requested
      if (include_relations && Model.associations) {
        queryOptions.include = this.buildIncludeOptions(Model);
      }

      console.log('🔍 GeneralQuery: Executing select with options:', {
        modelName,
        whereClause,
        limit: queryOptions.limit,
        offset: queryOptions.offset
      });

      // Execute query
      const results = await Model.findAll(queryOptions);

      // Get total count for pagination
      const totalCount = await Model.count({ where: whereClause });

      console.log(`✅ GeneralQuery: select found ${results.length} records (total: ${totalCount})`);

      res.json({
        success: true,
        message: `Filtered ${modelName} records retrieved successfully`,
        data: results,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < totalCount
        },
        query_type: "select",
        system: "general_query_controller",
        debug: {
          model_name: modelName,
          table_name: table_name,
          branch_filter: branchFilter,
          additional_conditions: where_conditions,
          result_count: results.length
        }
      });

    } catch (error) {
      console.error('❌ GeneralQuery: Error in select:', error);
      res.status(500).json({
        success: false,
        message: "Error retrieving filtered records",
        error: error.message,
        system: "general_query_controller"
      });
    }
  }

  /**
   * MAIN HANDLER: Routes requests based on query_type
   */
  async handleGeneralQuery(req, res) {
    try {
      const { query_type } = req.body;

      console.log('🔄 GeneralQuery: Processing request:', {
        query_type,
        user: req.user?.name,
        school_id: req.user?.school_id,
        branch_id: req.user?.branch_id
      });

      switch (query_type) {
        case 'select-all':
          return await this.selectAll(req, res);
          
        case 'select':
          return await this.select(req, res);
          
        default:
          return res.status(400).json({
            success: false,
            message: "Unsupported query_type. Supported types: 'select-all', 'select'",
            supported_types: ['select-all', 'select'],
            system: "general_query_controller"
          });
      }

    } catch (error) {
      console.error('❌ GeneralQuery: Error in main handler:', error);
      res.status(500).json({
        success: false,
        message: "Error processing general query request",
        error: error.message,
        system: "general_query_controller"
      });
    }
  }

  /**
   * HELPER METHODS
   */

  /**
   * Build branch filter based on user context
   * Always includes school_id, includes branch_id if available
   */
  buildBranchFilter(user) {
    const filter = {
      school_id: user.school_id
    };

    // Add branch_id filter if user has a specific branch and the table supports it
    if (user.branch_id && user.branch_id !== 'ALL') {
      filter.branch_id = user.branch_id;
    }

    return filter;
  }

  /**
   * Get model name from table name
   */
  getModelNameFromTable(tableName) {
    if (!tableName) return null;

    const tableToModelMap = {
      'payment_entries': 'PaymentEntry',
      'students': 'Student',
      'staff': 'Staff',
      'school_setup': 'SchoolSetup',
      'school_locations': 'SchoolLocation',
      'subjects': 'Subject',
      'classes': 'Class',
      'chart_of_accounts': 'ChartOfAccounts',
      'journal_entries': 'JournalEntry',
      'custom_charge_items': 'CustomChargeItem',
      'loans': 'Loan',
      'loan_payments': 'LoanPayment',
      'support_tickets': 'SupportTicket',
      'ca_assessments_v2': 'CAAssessmentV2',
      'ca_templates': 'CATemplate',
      'knowledge_domains': 'KnowledgeDomain',
      'grade_boundaries': 'GradeBoundary'
    };

    return tableToModelMap[tableName] || this.pascalCase(tableName);
  }

  /**
   * Convert string to PascalCase for model names
   */
  pascalCase(str) {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Build include options for relations
   */
  buildIncludeOptions(Model) {
    const includes = [];
    
    // Add common associations if they exist
    if (Model.associations) {
      Object.keys(Model.associations).forEach(associationName => {
        const association = Model.associations[associationName];
        
        // Include basic associations without nested includes to avoid circular references
        includes.push({
          model: association.target,
          as: associationName,
          required: false // LEFT JOIN
        });
      });
    }

    return includes;
  }

  /**
   * Validate that user has access to the requested school/branch
   */
  validateBranchAccess(user, requestedSchoolId, requestedBranchId) {
    // User must have access to the school
    if (user.school_id !== requestedSchoolId) {
      return false;
    }

    // If user has a specific branch, they can only access that branch
    if (user.branch_id && user.branch_id !== 'ALL' && user.branch_id !== requestedBranchId) {
      return false;
    }

    return true;
  }
}

module.exports = new GeneralQueryController();