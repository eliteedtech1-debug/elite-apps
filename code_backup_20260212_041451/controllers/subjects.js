const db = require("../models");
const { v4: uuidv4 } = require('uuid');
const enhancedController = require('./subjectsEnhanced');

/**
 * Enhanced Subjects Controller with backward compatibility
 * This controller now uses ORM operations instead of stored procedures
 * while maintaining all existing API endpoints and functionality.
 */

/**
 * Update elective information for a subject
 * Now uses enhanced ORM-based operations with better error handling
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSubjectElective = async (req, res) => {
  try {
    const {
      subject_code,
      is_elective,
      elective_group,
      school_id
    } = req.body;

    const finalSchoolId = school_id || req.user?.school_id;
    
    if (!finalSchoolId || !subject_code) {
      return res.status(400).json({
        success: false,
        error: "School ID and subject code are required"
      });
    }

    console.log(`🔄 Updating elective info for subject: ${subject_code}`);

    // Update the subject with elective information using enhanced model
    const affectedRows = await db.Subject.updateBySubjectCode(subject_code, {
      is_elective: is_elective,
      elective_group: elective_group
    }, { school_id: finalSchoolId });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Subject not found"
      });
    }

    // Get the updated subject
    const updatedSubject = await db.Subject.findOne({
      where: {
        subject_code: subject_code,
        school_id: finalSchoolId
      }
    });

    res.json({
      success: true,
      data: updatedSubject,
      message: "Subject elective information updated successfully"
    });

  } catch (error) {
    console.error("Error updating subject elective information:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get subjects by section with elective support
 * Now uses enhanced ORM-based operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubjectsBySection = async (req, res) => {
  try {
    console.log(`🔍 Enhanced getSubjectsBySection called:`, req.query);
    
    // Delegate to enhanced controller which uses ORM operations
    return await enhancedController.getSubjectsBySection(req, res);

  } catch (error) {
    console.error("Error fetching subjects by section:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to fetch subjects"
    });
  }
};

/**
 * Get elective groups for a section
 * Now uses enhanced ORM-based operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getElectiveGroups = async (req, res) => {
  try {
    console.log(`🔍 Enhanced getElectiveGroups called:`, req.query);
    
    // Delegate to enhanced controller which uses ORM operations
    return await enhancedController.getElectiveGroups(req, res);

  } catch (error) {
    console.error("Error fetching elective groups:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Legacy endpoint for backward compatibility
 * Now uses enhanced ORM-based operations
 */
const getSubjectsLegacy = async (req, res) => {
  try {
    console.log('🔍 Enhanced legacy subjects endpoint called:', req.query);
    
    // Check if db.Subject is available
    if (!db || !db.Subject) {
      console.error('❌ db.Subject is not available:', { db: !!db, Subject: !!db?.Subject });
      return res.status(500).json({
        success: false,
        error: "Subject model is not available. Database connection issue.",
        debug: {
          db_available: !!db,
          subject_model_available: !!db?.Subject,
          available_models: db ? Object.keys(db).filter(key => typeof db[key] === 'object' && db[key].name) : []
        }
      });
    }
    
    // Delegate to enhanced controller which uses ORM operations
    return await enhancedController.getSubjects(req, res);

  } catch (error) {
    console.error("Database Error in getSubjectsLegacy:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Handle various subject operations based on query_type
 * Now uses enhanced ORM-based operations instead of stored procedures
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleSubjectOperations = async (req, res) => {
  try {
    console.log(`🔄 Enhanced Subject operation: ${req.body.query_type}`, {
      school_id: req.user?.school_id,
      subject_code: req.body.subject_code,
      subject: req.body.subject,
      apply_to_all: req.body.apply_to_all
    });

    // Delegate to enhanced controller which uses ORM operations
    return await enhancedController.handleSubjectOperations(req, res);

  } catch (error) {
    console.error("Error in handleSubjectOperations:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all subjects for a specific class
 * Used for student subject assignment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubjectsByClass = async (req, res) => {
  try {
    const { class_code } = req.query;
    const school_id = req.headers['x-school-id'] || req.query.school_id || req.user?.school_id;

    console.log(`🔍 Fetching subjects for class: ${class_code}, school: ${school_id}`);

    if (!class_code || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'class_code and school_id are required'
      });
    }

    // Get all subjects for the class
    const subjects = await db.sequelize.query(`
      SELECT
        subject_code,
        subject as subject_name,
        type as subject_type,
        class_code
      FROM subjects
      WHERE class_code = :class_code
        AND school_id = :school_id
        AND status = 'Active'
      ORDER BY
        CASE
          WHEN LOWER(type) IN ('core', 'compulsory') THEN 1
          WHEN LOWER(type) IN ('selective', 'elective') THEN 3
          ELSE 2
        END,
        subject
    `, {
      replacements: { class_code, school_id },
      type: db.Sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${subjects.length} subjects for class ${class_code}`);

    res.json({
      success: true,
      data: subjects
    });

  } catch (error) {
    console.error('❌ Error fetching subjects by class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects for class',
      error: error.message
    });
  }
};

// Legacy helper functions removed - now using enhanced ORM-based operations
// All functionality has been moved to subjectsEnhanced.js for better maintainability

module.exports = {
  getSubjectsBySection,
  getElectiveGroups,
  getSubjectsLegacy,
  updateSubjectElective,
  handleSubjectOperations,
  getSubjectsByClass,
  // Export enhanced controller functions for direct access
  ...enhancedController
};