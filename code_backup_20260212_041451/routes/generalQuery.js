const express = require('express');
const router = express.Router();
const GeneralQueryController = require('../controllers/GeneralQueryController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GENERAL QUERY ROUTES
 * 
 * Provides generic querying functionality with automatic branch filtering.
 * All routes require authentication and automatically filter by user's school_id and branch_id.
 * 
 * Routes:
 * - POST /api/general-query - Main handler for select-all and select operations
 * - POST /api/general-query/select-all - Direct select-all endpoint
 * - POST /api/general-query/select - Direct select endpoint
 */

/**
 * Main general query handler
 * Routes based on query_type in request body
 * 
 * Body parameters:
 * - query_type: 'select-all' | 'select'
 * - table_name: string (optional if model_name provided)
 * - model_name: string (optional if table_name provided)
 * - Additional parameters based on query_type
 */
router.post('/', authenticateToken, async (req, res) => {
  await GeneralQueryController.handleGeneralQuery(req, res);
});

/**
 * SELECT-ALL: Get all records for current user's branch
 * 
 * Body parameters:
 * - table_name: string (e.g., 'payment_entries', 'students')
 * - model_name: string (e.g., 'PaymentEntry', 'Student') - alternative to table_name
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - order_by: string (default: 'created_at')
 * - order_direction: 'ASC' | 'DESC' (default: 'DESC')
 * - include_relations: boolean (default: false)
 * 
 * Example request:
 * {
 *   "table_name": "payment_entries",
 *   "limit": 50,
 *   "order_by": "created_at",
 *   "order_direction": "DESC"
 * }
 */
router.post('/select-all', authenticateToken, async (req, res) => {
  // Set query_type for the controller
  req.body.query_type = 'select-all';
  await GeneralQueryController.handleGeneralQuery(req, res);
});

/**
 * SELECT: Get filtered records for current user's branch
 * 
 * Body parameters:
 * - table_name: string (e.g., 'payment_entries', 'students')
 * - model_name: string (e.g., 'PaymentEntry', 'Student') - alternative to table_name
 * - where_conditions: object - additional filter conditions
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - order_by: string (default: 'created_at')
 * - order_direction: 'ASC' | 'DESC' (default: 'DESC')
 * - include_relations: boolean (default: false)
 * - attributes: array - specific columns to select (optional)
 * 
 * Example request:
 * {
 *   "table_name": "payment_entries",
 *   "where_conditions": {
 *     "payment_status": "Pending",
 *     "academic_year": "2024/2025"
 *   },
 *   "limit": 50,
 *   "attributes": ["id", "admission_no", "description", "cr", "payment_status"]
 * }
 */
router.post('/select', authenticateToken, async (req, res) => {
  // Set query_type for the controller
  req.body.query_type = 'select';
  await GeneralQueryController.handleGeneralQuery(req, res);
});

router.get('/select', authenticateToken, async (req, res) => {
  req.body = { query_type: 'select', table_name: req.query.table, ...req.query };
  await GeneralQueryController.handleGeneralQuery(req, res);
});

/**
 * GET AVAILABLE MODELS: List all available models for querying
 * Useful for frontend to know what models/tables are available
 */
router.get('/models', authenticateToken, async (req, res) => {
  try {
    const db = require('../models');
    
    const availableModels = Object.keys(db)
      .filter(key => key !== 'sequelize' && key !== 'Sequelize')
      .map(modelName => {
        const model = db[modelName];
        return {
          model_name: modelName,
          table_name: model.tableName || modelName.toLowerCase(),
          has_school_id: model.rawAttributes?.school_id ? true : false,
          has_branch_id: model.rawAttributes?.branch_id ? true : false,
          supports_branch_filtering: (model.rawAttributes?.school_id && model.rawAttributes?.branch_id) ? true : false
        };
      })
      .sort((a, b) => a.model_name.localeCompare(b.model_name));

    res.json({
      success: true,
      message: "Available models retrieved successfully",
      data: availableModels,
      total_models: availableModels.length,
      system: "general_query_controller"
    });

  } catch (error) {
    console.error('❌ Error getting available models:', error);
    res.status(500).json({
      success: false,
      message: "Error retrieving available models",
      error: error.message,
      system: "general_query_controller"
    });
  }
});

/**
 * GET MODEL SCHEMA: Get detailed schema information for a specific model
 * Useful for frontend to understand what fields are available for filtering
 */
router.get('/models/:modelName/schema', authenticateToken, async (req, res) => {
  try {
    const { modelName } = req.params;
    const db = require('../models');
    
    const Model = db[modelName];
    if (!Model) {
      return res.status(404).json({
        success: false,
        message: `Model '${modelName}' not found`
      });
    }

    const attributes = {};
    Object.keys(Model.rawAttributes).forEach(attrName => {
      const attr = Model.rawAttributes[attrName];
      attributes[attrName] = {
        type: attr.type.constructor.name,
        allowNull: attr.allowNull,
        primaryKey: attr.primaryKey || false,
        autoIncrement: attr.autoIncrement || false,
        defaultValue: attr.defaultValue,
        unique: attr.unique || false
      };
    });

    const associations = {};
    if (Model.associations) {
      Object.keys(Model.associations).forEach(assocName => {
        const assoc = Model.associations[assocName];
        associations[assocName] = {
          type: assoc.associationType,
          target_model: assoc.target.name,
          foreign_key: assoc.foreignKey,
          as: assoc.as
        };
      });
    }

    res.json({
      success: true,
      message: `Schema for ${modelName} retrieved successfully`,
      data: {
        model_name: modelName,
        table_name: Model.tableName,
        attributes,
        associations,
        supports_branch_filtering: (attributes.school_id && attributes.branch_id) ? true : false
      },
      system: "general_query_controller"
    });

  } catch (error) {
    console.error('❌ Error getting model schema:', error);
    res.status(500).json({
      success: false,
      message: "Error retrieving model schema",
      error: error.message,
      system: "general_query_controller"
    });
  }
});

module.exports = router;