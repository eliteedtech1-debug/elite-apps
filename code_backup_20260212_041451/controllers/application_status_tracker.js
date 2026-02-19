const db = require("../models");
const moment = require("moment");

/**
 * Enhanced Application Status Tracking System
 * Provides comprehensive status management with history tracking
 */

// Application status constants
const APPLICATION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted', 
  UNDER_REVIEW: 'under_review',
  DOCUMENTS_REQUIRED: 'documents_required',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  EXAM_SCHEDULED: 'exam_scheduled',
  EXAM_COMPLETED: 'exam_completed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WAITLISTED: 'waitlisted',
  ADMITTED: 'admitted',
  ENROLLED: 'enrolled'
};

// Status workflow definitions
const STATUS_WORKFLOW = {
  [APPLICATION_STATUS.DRAFT]: [APPLICATION_STATUS.SUBMITTED],
  [APPLICATION_STATUS.SUBMITTED]: [APPLICATION_STATUS.UNDER_REVIEW, APPLICATION_STATUS.DOCUMENTS_REQUIRED],
  [APPLICATION_STATUS.UNDER_REVIEW]: [APPLICATION_STATUS.EXAM_SCHEDULED, APPLICATION_STATUS.INTERVIEW_SCHEDULED, APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.DOCUMENTS_REQUIRED],
  [APPLICATION_STATUS.DOCUMENTS_REQUIRED]: [APPLICATION_STATUS.UNDER_REVIEW],
  [APPLICATION_STATUS.INTERVIEW_SCHEDULED]: [APPLICATION_STATUS.EXAM_SCHEDULED, APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED],
  [APPLICATION_STATUS.EXAM_SCHEDULED]: [APPLICATION_STATUS.EXAM_COMPLETED],
  [APPLICATION_STATUS.EXAM_COMPLETED]: [APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WAITLISTED],
  [APPLICATION_STATUS.APPROVED]: [APPLICATION_STATUS.ADMITTED],
  [APPLICATION_STATUS.WAITLISTED]: [APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED],
  [APPLICATION_STATUS.ADMITTED]: [APPLICATION_STATUS.ENROLLED],
  [APPLICATION_STATUS.REJECTED]: [], // Terminal status
  [APPLICATION_STATUS.ENROLLED]: [] // Terminal status
};

/**
 * Update application status with history tracking
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const {
      applicant_id,
      new_status,
      comments = '',
      next_action_date = null,
      assigned_to = null,
      documents_required = null,
      exam_details = null,
      interview_details = null
    } = req.body;

    const updated_by = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;
    const branch_id = req.user?.branch_id;

    // Validate required fields
    if (!applicant_id || !new_status) {
      return res.status(400).json({
        success: false,
        message: "Applicant ID and new status are required"
      });
    }

    // Validate status
    if (!Object.values(APPLICATION_STATUS).includes(new_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided"
      });
    }

    // Get current application status
    const currentApplication = await db.sequelize.query(
      `SELECT status, applicant_id FROM school_applicants WHERE applicant_id = :applicant_id AND school_id = :school_id`,
      {
        replacements: { applicant_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!currentApplication.length) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const current_status = currentApplication[0].status;

    // Validate status transition
    if (current_status && STATUS_WORKFLOW[current_status] && 
        !STATUS_WORKFLOW[current_status].includes(new_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${current_status} to ${new_status}`
      });
    }

    // Update application status
    await db.sequelize.query(
      `UPDATE school_applicants 
       SET status = :new_status, 
           updated_at = NOW(),
           next_action_date = :next_action_date,
           assigned_to = :assigned_to
       WHERE applicant_id = :applicant_id AND school_id = :school_id`,
      {
        replacements: {
          new_status,
          next_action_date,
          assigned_to,
          applicant_id,
          school_id
        }
      }
    );

    // Insert status history record
    await db.sequelize.query(
      `INSERT INTO application_status_history 
       (applicant_id, previous_status, new_status, comments, updated_by, 
        school_id, branch_id, documents_required, exam_details, interview_details, created_at)
       VALUES (:applicant_id, :previous_status, :new_status, :comments, :updated_by, 
               :school_id, :branch_id, :documents_required, :exam_details, :interview_details, NOW())`,
      {
        replacements: {
          applicant_id,
          previous_status: current_status,
          new_status,
          comments,
          updated_by,
          school_id,
          branch_id,
          documents_required: documents_required ? JSON.stringify(documents_required) : null,
          exam_details: exam_details ? JSON.stringify(exam_details) : null,
          interview_details: interview_details ? JSON.stringify(interview_details) : null
        }
      }
    );

    // Handle specific status actions
    await handleStatusSpecificActions(applicant_id, new_status, req.body, school_id, branch_id);

    res.json({
      success: true,
      message: "Application status updated successfully",
      data: {
        applicant_id,
        previous_status: current_status,
        new_status,
        updated_at: new Date()
      }
    });

  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating application status",
      error: error.message
    });
  }
};

/**
 * Get application status history
 */
const getApplicationStatusHistory = async (req, res) => {
  try {
    const { applicant_id } = req.params;
    const school_id = req.user?.school_id;

    const history = await db.sequelize.query(
      `SELECT ash.*, u.name as updated_by_name
       FROM application_status_history ash
       LEFT JOIN users u ON ash.updated_by = u.id
       WHERE ash.applicant_id = :applicant_id AND ash.school_id = :school_id
       ORDER BY ash.created_at DESC`,
      {
        replacements: { applicant_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error("Error fetching status history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching status history",
      error: error.message
    });
  }
};

/**
 * Get application status dashboard
 */
const getStatusDashboard = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const branch_id = req.user?.branch_id;
    const { academic_year } = req.query;

    // Get status counts
    const statusCounts = await db.sequelize.query(
      `SELECT status, COUNT(*) as count
       FROM school_applicants 
       WHERE school_id = :school_id 
       ${branch_id ? 'AND branch_id = :branch_id' : ''}
       ${academic_year ? 'AND academic_year = :academic_year' : ''}
       GROUP BY status`,
      {
        replacements: { school_id, branch_id, academic_year },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Get pending actions
    const pendingActions = await db.sequelize.query(
      `SELECT applicant_id, name_of_applicant, status, next_action_date
       FROM school_applicants 
       WHERE school_id = :school_id 
       ${branch_id ? 'AND branch_id = :branch_id' : ''}
       AND next_action_date IS NOT NULL 
       AND next_action_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
       AND status NOT IN ('rejected', 'enrolled')
       ORDER BY next_action_date ASC`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Get recent status changes
    const recentChanges = await db.sequelize.query(
      `SELECT ash.*, sa.name_of_applicant, u.name as updated_by_name
       FROM application_status_history ash
       JOIN school_applicants sa ON ash.applicant_id = sa.applicant_id
       LEFT JOIN users u ON ash.updated_by = u.id
       WHERE ash.school_id = :school_id
       ${branch_id ? 'AND ash.branch_id = :branch_id' : ''}
       ORDER BY ash.created_at DESC
       LIMIT 20`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: {
        statusCounts,
        pendingActions,
        recentChanges,
        availableStatuses: APPLICATION_STATUS
      }
    });

  } catch (error) {
    console.error("Error fetching status dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching status dashboard",
      error: error.message
    });
  }
};

/**
 * Handle status-specific actions
 */
const handleStatusSpecificActions = async (applicant_id, status, data, school_id, branch_id) => {
  switch (status) {
    case APPLICATION_STATUS.EXAM_SCHEDULED:
      if (data.exam_details) {
        await scheduleExam(applicant_id, data.exam_details, school_id, branch_id);
      }
      break;
    
    case APPLICATION_STATUS.INTERVIEW_SCHEDULED:
      if (data.interview_details) {
        await scheduleInterview(applicant_id, data.interview_details, school_id, branch_id);
      }
      break;
    
    case APPLICATION_STATUS.ADMITTED:
      await generateAdmissionLetter(applicant_id, school_id, branch_id);
      break;
    
    case APPLICATION_STATUS.ENROLLED:
      await convertToStudent(applicant_id, school_id, branch_id);
      break;
  }
};

/**
 * Schedule exam for applicant
 */
const scheduleExam = async (applicant_id, exam_details, school_id, branch_id) => {
  try {
    await db.sequelize.query(
      `INSERT INTO application_exams 
       (applicant_id, exam_date, exam_time, venue, subjects, instructions, school_id, branch_id, created_at)
       VALUES (:applicant_id, :exam_date, :exam_time, :venue, :subjects, :instructions, :school_id, :branch_id, NOW())`,
      {
        replacements: {
          applicant_id,
          exam_date: exam_details.date,
          exam_time: exam_details.time,
          venue: exam_details.venue,
          subjects: JSON.stringify(exam_details.subjects || []),
          instructions: exam_details.instructions || '',
          school_id,
          branch_id
        }
      }
    );
  } catch (error) {
    console.error("Error scheduling exam:", error);
  }
};

/**
 * Schedule interview for applicant
 */
const scheduleInterview = async (applicant_id, interview_details, school_id, branch_id) => {
  try {
    await db.sequelize.query(
      `INSERT INTO application_interviews 
       (applicant_id, interview_date, interview_time, venue, interviewer, notes, school_id, branch_id, created_at)
       VALUES (:applicant_id, :interview_date, :interview_time, :venue, :interviewer, :notes, :school_id, :branch_id, NOW())`,
      {
        replacements: {
          applicant_id,
          interview_date: interview_details.date,
          interview_time: interview_details.time,
          venue: interview_details.venue,
          interviewer: interview_details.interviewer,
          notes: interview_details.notes || '',
          school_id,
          branch_id
        }
      }
    );
  } catch (error) {
    console.error("Error scheduling interview:", error);
  }
};

/**
 * Generate admission letter
 */
const generateAdmissionLetter = async (applicant_id, school_id, branch_id) => {
  try {
    // Implementation for admission letter generation
    console.log(`Generating admission letter for ${applicant_id}`);
  } catch (error) {
    console.error("Error generating admission letter:", error);
  }
};

/**
 * Convert applicant to student
 */
const convertToStudent = async (applicant_id, school_id, branch_id) => {
  try {
    // Implementation for converting applicant to student
    console.log(`Converting applicant ${applicant_id} to student`);
  } catch (error) {
    console.error("Error converting to student:", error);
  }
};

/**
 * Get next possible statuses for an application
 */
const getNextPossibleStatuses = async (req, res) => {
  try {
    const { applicant_id } = req.params;
    const school_id = req.user?.school_id;

    const application = await db.sequelize.query(
      `SELECT status FROM school_applicants WHERE applicant_id = :applicant_id AND school_id = :school_id`,
      {
        replacements: { applicant_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!application.length) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const current_status = application[0].status;
    const next_statuses = STATUS_WORKFLOW[current_status] || [];

    res.json({
      success: true,
      data: {
        current_status,
        next_possible_statuses: next_statuses
      }
    });

  } catch (error) {
    console.error("Error getting next possible statuses:", error);
    res.status(500).json({
      success: false,
      message: "Error getting next possible statuses",
      error: error.message
    });
  }
};

module.exports = {
  updateApplicationStatus,
  getApplicationStatusHistory,
  getStatusDashboard,
  getNextPossibleStatuses,
  APPLICATION_STATUS,
  STATUS_WORKFLOW
};
