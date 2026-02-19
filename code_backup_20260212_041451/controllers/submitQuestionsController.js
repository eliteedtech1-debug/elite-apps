/**
 * Submit Questions Controller
 * Handles CA/Exam question submission by teachers
 */

const db = require('../models');
const dayjs = require('dayjs');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get all CA/Exam setups for current academic year
 */
const getCASetups = async (req, res) => {
  try {
    const { school_id, branch_id, section } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const whereClause = {
      school_id,
      is_active: true
    };

    if (branch_id) whereClause.branch_id = branch_id;
    if (section) whereClause.section = section;

    const setups = await db.ca_setup.findAll({
      where: whereClause,
      order: [['week_number', 'ASC']]
    });

    res.json({
      success: true,
      data: setups
    });
  } catch (error) {
    console.error('Error fetching CA setups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CA setups',
      error: error.message
    });
  }
};

/**
 * Get teacher's submissions
 */
const getTeacherSubmissions = async (req, res) => {
  try {
    const { teacher_id, school_id, academic_year, term, status } = req.query;

    if (!teacher_id || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID and School ID are required'
      });
    }

    const whereClause = {
      teacher_id,
      school_id
    };

    if (academic_year) whereClause.academic_year = academic_year;
    if (term) whereClause.term = term;
    if (status) whereClause.status = status;

    const submissions = await db.ca_exam_submissions.findAll({
      where: whereClause,
      include: [
        {
          model: db.Subject,
          as: 'subject',
          attributes: ['subject_code', 'subject']
        },
        {
          model: db.Class,
          as: 'class',
          attributes: ['id', 'class_name']
        },
        {
          model: db.ca_setup,
          as: 'ca_setup',
          attributes: ['id', 'ca_type', 'week_number', 'scheduled_date', 'submission_deadline']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: submissions,
      count: submissions.length
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};

/**
 * Create new submission
 */
const createSubmission = async (req, res) => {
  try {
    const {
      teacher_id,
      subject_id,
      class_id,
      ca_setup_id,
      ca_type,
      comments,
      school_id,
      branch_id,
      academic_year,
      term
    } = req.body;

    // Validate required fields
    if (!teacher_id || !subject_id || !class_id || !ca_setup_id || !ca_type || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get CA setup to check deadline
    const caSetup = await db.ca_setup.findByPk(ca_setup_id);
    if (!caSetup) {
      return res.status(404).json({
        success: false,
        message: 'CA setup not found'
      });
    }

    // Check if submission already exists
    const existing = await db.ca_exam_submissions.findOne({
      where: {
        teacher_id,
        subject_id,
        class_id,
        ca_type,
        academic_year,
        term,
        school_id
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Submission already exists for this CA/Exam. Please edit the existing submission.'
      });
    }

    // Generate submission code
    const submission_code = `SUB-${ca_type}-${Date.now()}`;

    // Calculate deadline (2-3 weeks before scheduled date for CA, 4 weeks for EXAM)
    const weeksBeforeDeadline = ca_type === 'EXAM' ? 4 : 3;
    const scheduled_date = dayjs().add(caSetup.week_number, 'week');
    const deadline_date = scheduled_date.subtract(weeksBeforeDeadline, 'week');
    
    // Check if past deadline
    const now = dayjs();
    const is_late = now.isAfter(deadline_date);

    // Create submission
    const submission = await db.ca_exam_submissions.create({
      submission_code,
      teacher_id,
      subject_id,
      class_id,
      ca_setup_id,
      ca_type,
      comments,
      status: 'Draft',
      deadline_date: deadline_date.toDate(),
      scheduled_date: scheduled_date.toDate(),
      is_late,
      school_id,
      branch_id: branch_id || caSetup.branch_id,
      academic_year,
      term,
      created_by: req.user?.id || teacher_id
    });

    res.json({
      success: true,
      message: 'Submission created successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create submission',
      error: error.message
    });
  }
};

/**
 * Upload question file
 */
const uploadQuestionFile = async (req, res) => {
  try {
    const { submission_id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const submission = await db.ca_exam_submissions.findByPk(submission_id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if submission is locked
    if (submission.is_locked) {
      return res.status(400).json({
        success: false,
        message: 'Submission is locked and cannot be modified'
      });
    }

    // Delete old file if exists
    if (submission.question_file) {
      try {
        await fs.unlink(submission.question_file);
      } catch (err) {
        console.log('Old file not found or already deleted');
      }
    }

    // Update submission with file info
    await submission.update({
      question_file: req.file.path,
      question_file_name: req.file.originalname,
      question_file_size: req.file.size,
      updated_by: req.user?.id
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file_name: req.file.originalname,
        file_size: req.file.size,
        file_path: req.file.path
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
};

/**
 * Update submission
 */
const updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, status } = req.body;

    const submission = await db.ca_exam_submissions.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if submission is locked
    if (submission.is_locked && status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: 'Submission is locked and cannot be modified'
      });
    }

    const updateData = {
      updated_by: req.user?.id
    };

    if (comments !== undefined) updateData.comments = comments;
    
    if (status) {
      updateData.status = status;
      if (status === 'Submitted') {
        updateData.submission_date = new Date();
      }
    }

    await submission.update(updateData);

    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update submission',
      error: error.message
    });
  }
};

/**
 * Submit for moderation
 */
const submitForModeration = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await db.ca_exam_submissions.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Validate submission
    if (!submission.question_file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload question file before submitting'
      });
    }

    if (submission.status === 'Submitted' || submission.status === 'Under Moderation') {
      return res.status(400).json({
        success: false,
        message: 'Submission already submitted'
      });
    }

    // Check deadline
    const now = dayjs();
    const deadline = dayjs(submission.deadline_date);
    const is_late = now.isAfter(deadline);

    await submission.update({
      status: 'Submitted',
      submission_date: new Date(),
      is_late,
      updated_by: req.user?.id
    });

    // TODO: Send notification to moderation committee

    res.json({
      success: true,
      message: is_late 
        ? 'Submission submitted (Late submission noted)' 
        : 'Submission submitted successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error submitting for moderation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit for moderation',
      error: error.message
    });
  }
};

/**
 * Delete submission (only if Draft)
 */
const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await db.ca_exam_submissions.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    if (submission.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft submissions can be deleted'
      });
    }

    // Delete file if exists
    if (submission.question_file) {
      try {
        await fs.unlink(submission.question_file);
      } catch (err) {
        console.log('File not found or already deleted');
      }
    }

    await submission.destroy();

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete submission',
      error: error.message
    });
  }
};

/**
 * Get submission statistics
 */
const getSubmissionStats = async (req, res) => {
  try {
    const { teacher_id, school_id, academic_year, term } = req.query;

    if (!teacher_id || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID and School ID are required'
      });
    }

    const whereClause = {
      teacher_id,
      school_id
    };

    if (academic_year) whereClause.academic_year = academic_year;
    if (term) whereClause.term = term;

    const stats = await db.ca_exam_submissions.findAll({
      where: whereClause,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const statsObj = {
      total: 0,
      draft: 0,
      submitted: 0,
      under_moderation: 0,
      approved: 0,
      rejected: 0,
      modification_required: 0
    };

    stats.forEach(stat => {
      const status = stat.status.toLowerCase().replace(/ /g, '_');
      statsObj[status] = parseInt(stat.get('count'));
      statsObj.total += parseInt(stat.get('count'));
    });

    res.json({
      success: true,
      data: statsObj
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

module.exports = {
  getCASetups,
  getTeacherSubmissions,
  createSubmission,
  uploadQuestionFile,
  updateSubmission,
  submitForModeration,
  deleteSubmission,
  getSubmissionStats
};
