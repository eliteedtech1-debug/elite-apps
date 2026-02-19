/**
 * CA Report Data Enhancement Middleware
 * Adds schoolAssessmentType to report data for template selection
 */

const detectSchoolAssessmentType = async (req, res, next) => {
  try {
    const { school_id, branch_id } = req.user;
    
    if (!school_id || !branch_id) {
      return next();
    }

    // Check CA configuration to determine school assessment type
    const db = require("../models");
    
    const caSetups = await db.sequelize.query(
      `SELECT DISTINCT ca_type, week_number, COUNT(*) as count 
       FROM ca_setup 
       WHERE school_id = :school_id AND branch_id = :branch_id AND status = 'Active'
       GROUP BY ca_type, week_number
       ORDER BY ca_type, week_number`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Determine assessment type based on CA setup patterns
    const hasWeeklyPattern = caSetups.some(setup => 
      setup.week_number > 4 || 
      setup.ca_type.includes('WEEK') || 
      setup.ca_type.includes('MONTHLY')
    );

    const schoolAssessmentType = hasWeeklyPattern ? 'Monthly' : 'Traditional';
    
    // Add to request for use in controllers
    req.schoolAssessmentType = schoolAssessmentType;
    req.caSetupData = caSetups;
    
    next();
  } catch (error) {
    console.error('Error detecting school assessment type:', error);
    // Continue without assessment type detection
    req.schoolAssessmentType = 'Traditional';
    next();
  }
};

module.exports = {
  detectSchoolAssessmentType
};
