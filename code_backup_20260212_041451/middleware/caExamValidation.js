/**
 * CA/Exam Validation Middleware
 *
 * Provides validation functions for:
 * - Submission deadlines
 * - Duplicate submissions
 * - CA setup percentages
 * - Week numbers
 * - File uploads
 */

const db = require('../models');
const { isDeadlinePassed, validateWeekNumber } = require('../utils/caExamDateUtils');
const { Op } = require('sequelize');

/**
 * Validate submission deadline
 * Ensures submissions are made before the deadline
 * Allows admin override with reason
 */
async function validateSubmissionDeadline(req, res, next) {
  try {
    const { ca_setup_id } = req.body;
    const userId = req.user.id;
    const userType = req.user.user_type;

    // Get CA setup to check deadline
    const [caSetup] = await db.sequelize.query(
      `SELECT submission_deadline, ca_type FROM ca_setup WHERE id = :ca_setup_id`,
      {
        replacements: { ca_setup_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!caSetup) {
      return res.status(404).json({
        success: false,
        message: 'CA/Exam setup not found'
      });
    }

    const deadlinePassed = isDeadlinePassed(caSetup.submission_deadline);

    // Allow admin to override deadline
    if (deadlinePassed && (userType === 'Admin' || userType === 'BranchAdmin')) {
      if (!req.body.override_reason) {
        return res.status(400).json({
          success: false,
          message: 'Deadline has passed. Admin override requires a reason.',
          requiresOverride: true
        });
      }

      // Log admin override
      console.log(`[ADMIN OVERRIDE] User ${userId} submitting after deadline for ${caSetup.ca_type}. Reason: ${req.body.override_reason}`);
      req.adminOverride = true;
      return next();
    }

    // For teachers, strictly enforce deadline
    if (deadlinePassed) {
      return res.status(400).json({
        success: false,
        message: `Submission deadline has passed (${new Date(caSetup.submission_deadline).toDateString()}). Please contact your exam officer.`,
        deadline: caSetup.submission_deadline
      });
    }

    next();
  } catch (error) {
    console.error('Error validating submission deadline:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating deadline',
      error: error.message
    });
  }
}

/**
 * Prevent duplicate submissions
 * One submission per teacher per subject per class per CA type per term
 */
async function preventDuplicateSubmission(req, res, next) {
  try {
    const {
      school_id,
      branch_id,
      ca_setup_id,
      subject_id,
      class_id,
      academic_year,
      term
    } = req.body;

    const teacher_id = req.user.id;
    const submissionId = req.params.id; // For update operations

    // Check for existing submission
    const whereClause = {
      school_id,
      branch_id,
      ca_setup_id,
      teacher_id,
      subject_id,
      class_id,
      academic_year,
      term,
      status: { [Op.ne]: 'Draft' } // Ignore drafts
    };

    // Exclude current submission if updating
    if (submissionId) {
      whereClause.id = { [Op.ne]: submissionId };
    }

    const [existingSubmission] = await db.sequelize.query(
      `SELECT id, status, submission_code
       FROM ca_exam_submissions
       WHERE school_id = :school_id
         AND branch_id = :branch_id
         AND ca_setup_id = :ca_setup_id
         AND teacher_id = :teacher_id
         AND subject_id = :subject_id
         AND class_id = :class_id
         AND academic_year = :academic_year
         AND term = :term
         AND status != 'Draft'
         ${submissionId ? 'AND id != :submission_id' : ''}
       LIMIT 1`,
      {
        replacements: {
          school_id,
          branch_id,
          ca_setup_id,
          teacher_id,
          subject_id,
          class_id,
          academic_year,
          term,
          submission_id: submissionId
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: `You have already submitted questions for this subject and class (${existingSubmission.submission_code})`,
        existingSubmission: {
          id: existingSubmission.id,
          code: existingSubmission.submission_code,
          status: existingSubmission.status
        }
      });
    }

    next();
  } catch (error) {
    console.error('Error checking duplicate submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating submission',
      error: error.message
    });
  }
}

/**
 * Validate CA setup percentages
 * Ensures total contribution = 100%
 */
async function validateCASetupPercentages(req, res, next) {
  try {
    const {
      school_id,
      branch_id,
      academic_year,
      term,
      section,
      overall_contribution_percent
    } = req.body;

    const setupId = req.params.id; // For update operations

    // Get existing setups for this section
    const existingSetups = await db.sequelize.query(
      `SELECT id, ca_type, overall_contribution_percent
       FROM ca_setup
       WHERE school_id = :school_id
         AND branch_id = :branch_id
         AND academic_year = :academic_year
         AND term = :term
         AND section = :section
         ${setupId ? 'AND id != :setup_id' : ''}`,
      {
        replacements: {
          school_id,
          branch_id,
          academic_year,
          term,
          section,
          setup_id: setupId
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Calculate total percentage
    let totalPercent = parseFloat(overall_contribution_percent) || 0;
    existingSetups.forEach(setup => {
      totalPercent += parseFloat(setup.overall_contribution_percent) || 0;
    });

    if (totalPercent > 100) {
      return res.status(400).json({
        success: false,
        message: `Total contribution percentage cannot exceed 100%. Current total: ${totalPercent}%`,
        currentTotal: totalPercent,
        existingSetups: existingSetups.map(s => ({
          ca_type: s.ca_type,
          percent: s.overall_contribution_percent
        }))
      });
    }

    // Warn if total is less than 100%
    if (totalPercent < 100) {
      req.percentageWarning = {
        currentTotal: totalPercent,
        remaining: 100 - totalPercent,
        message: `Total contribution is ${totalPercent}%. Remaining: ${100 - totalPercent}%`
      };
    }

    next();
  } catch (error) {
    console.error('Error validating percentages:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating percentages',
      error: error.message
    });
  }
}

/**
 * Validate week number for CA setup
 */
async function validateCAWeekNumber(req, res, next) {
  try {
    const { week_number, school_id } = req.body;

    // Get academic year dates from school setup
    const [schoolSetup] = await db.sequelize.query(
      `SELECT academic_year_start, academic_year_end
       FROM school_setup
       WHERE school_id = :school_id
       LIMIT 1`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!schoolSetup || !schoolSetup.academic_year_start) {
      return res.status(400).json({
        success: false,
        message: 'Academic year dates not configured in school setup. Please set academic year start and end dates.'
      });
    }

    // Validate week number
    const validation = validateWeekNumber(
      week_number,
      schoolSetup.academic_year_start,
      schoolSetup.academic_year_end
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        academicYearStart: schoolSetup.academic_year_start,
        academicYearEnd: schoolSetup.academic_year_end
      });
    }

    next();
  } catch (error) {
    console.error('Error validating week number:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating week number',
      error: error.message
    });
  }
}

/**
 * Validate file upload
 */
function validateFileUpload(req, res, next) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'Question file is required'
    });
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds 10MB limit'
    });
  }

  // Check file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.'
    });
  }

  next();
}

module.exports = {
  validateSubmissionDeadline,
  preventDuplicateSubmission,
  validateCASetupPercentages,
  validateCAWeekNumber,
  validateFileUpload
};
