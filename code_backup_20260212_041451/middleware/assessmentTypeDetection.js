const db = require("../models");

/**
 * Middleware to detect and inject school assessment type
 * Determines if school uses Traditional (CA1,CA2,CA3,CA4) or Monthly (week-based) assessments
 */
const detectSchoolAssessmentType = async (req, res, next) => {
  try {
    const school_id = req.user?.school_id || req.headers['x-school-id'];
    const branch_id = req.user?.branch_id || req.headers['x-branch-id'];

    if (!school_id || !branch_id) {
      return next(); // Skip detection if no school context
    }

    // Check if assessment type is already specified
    if (req.query.assessment_mode || req.body.assessment_mode) {
      return next();
    }

    // Query CA setup to determine school type
    const caSetups = await db.sequelize.query(
      `SELECT DISTINCT ca_type, COUNT(*) as count, MAX(week_number) as max_week
       FROM ca_setup 
       WHERE school_id = :school_id AND branch_id = :branch_id AND status = 'Active'
       GROUP BY ca_type
       ORDER BY ca_type`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (caSetups.length === 0) {
      // No CA setup found, default to traditional
      req.school_assessment_type = {
        type: 'traditional',
        available_types: [],
        is_traditional: true,
        is_monthly: false,
        detection_reason: 'no_ca_setup_found'
      };
      return next();
    }

    // Analyze CA setup patterns
    const caTypes = caSetups.map(s => s.ca_type);
    const traditionalTypes = ['CA1', 'CA2', 'CA3', 'CA4'];
    
    // Check for traditional pattern
    const hasTraditionalPattern = traditionalTypes.every(type => 
      caTypes.includes(type)
    );

    // Check for monthly/weekly patterns
    const hasWeeklyPattern = caSetups.some(setup => 
      setup.ca_type.includes('WEEK') || 
      setup.ca_type.includes('MONTHLY') ||
      setup.ca_type.includes('TEST') ||
      setup.max_week > 4
    );

    // Check for high number of assessments (indicates monthly system)
    const hasHighAssessmentCount = caSetups.length > 6;

    // Check for week-based naming patterns
    const hasWeekBasedNaming = caTypes.some(type => 
      /WEEK\d+|W\d+|TEST\d+/.test(type)
    );

    // Determine school type based on analysis
    let schoolType;
    let detectionReason;

    if (hasTraditionalPattern && !hasWeeklyPattern && !hasHighAssessmentCount) {
      schoolType = 'traditional';
      detectionReason = 'traditional_ca_pattern_detected';
    } else if (hasWeeklyPattern || hasHighAssessmentCount || hasWeekBasedNaming) {
      schoolType = 'monthly';
      detectionReason = 'weekly_monthly_pattern_detected';
    } else if (hasTraditionalPattern) {
      schoolType = 'traditional';
      detectionReason = 'traditional_pattern_fallback';
    } else {
      schoolType = 'monthly';
      detectionReason = 'monthly_fallback';
    }

    // Inject assessment type info into request
    req.school_assessment_type = {
      type: schoolType,
      available_types: caTypes,
      is_traditional: schoolType === 'traditional',
      is_monthly: schoolType === 'monthly',
      detection_reason: detectionReason,
      ca_setup_count: caSetups.length,
      max_week_number: Math.max(...caSetups.map(s => s.max_week || 0)),
      analysis: {
        has_traditional_pattern: hasTraditionalPattern,
        has_weekly_pattern: hasWeeklyPattern,
        has_high_assessment_count: hasHighAssessmentCount,
        has_week_based_naming: hasWeekBasedNaming
      }
    };

    // Auto-inject assessment_mode if not specified
    if (!req.query.assessment_mode && !req.body.assessment_mode) {
      req.query.assessment_mode = schoolType;
      if (req.body && typeof req.body === 'object') {
        req.body.assessment_mode = schoolType;
      }
    }

    next();

  } catch (error) {
    console.error('Error in detectSchoolAssessmentType middleware:', error);
    
    // Set default on error
    req.school_assessment_type = {
      type: 'traditional',
      available_types: [],
      is_traditional: true,
      is_monthly: false,
      detection_reason: 'error_fallback',
      error: error.message
    };
    
    next(); // Continue despite error
  }
};

/**
 * Middleware to validate assessment mode parameter
 */
const validateAssessmentMode = (req, res, next) => {
  const validModes = ['traditional', 'monthly'];
  const assessmentMode = req.query.assessment_mode || req.body.assessment_mode;

  if (assessmentMode && !validModes.includes(assessmentMode.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: `Invalid assessment_mode. Must be one of: ${validModes.join(', ')}`,
      provided: assessmentMode,
      valid_options: validModes
    });
  }

  next();
};

/**
 * Middleware to ensure backward compatibility with existing CA report endpoints
 */
const ensureBackwardCompatibility = (req, res, next) => {
  // Map old query types to new assessment modes
  const queryType = req.query.query_type || req.body.query_type;
  
  if (queryType) {
    // If query_type suggests traditional assessment
    if (queryType.includes('CA1') || queryType.includes('CA2') || 
        queryType.includes('CA3') || queryType.includes('CA4')) {
      req.query.assessment_mode = 'traditional';
      if (req.body && typeof req.body === 'object') {
        req.body.assessment_mode = 'traditional';
      }
    }
    
    // If query_type suggests weekly/monthly assessment
    if (queryType.includes('Week') || queryType.includes('Monthly') || 
        queryType.includes('TEST')) {
      req.query.assessment_mode = 'monthly';
      if (req.body && typeof req.body === 'object') {
        req.body.assessment_mode = 'monthly';
      }
    }
  }

  next();
};

/**
 * Middleware to add assessment type info to response headers
 */
const addAssessmentTypeHeaders = (req, res, next) => {
  if (req.school_assessment_type) {
    res.set({
      'X-School-Assessment-Type': req.school_assessment_type.type,
      'X-Assessment-Detection-Reason': req.school_assessment_type.detection_reason,
      'X-Available-CA-Types': req.school_assessment_type.available_types.join(',')
    });
  }
  
  next();
};

module.exports = {
  detectSchoolAssessmentType,
  validateAssessmentMode,
  ensureBackwardCompatibility,
  addAssessmentTypeHeaders
};