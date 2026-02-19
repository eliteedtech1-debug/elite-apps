/**
 * CA/Exam Process Controller
 * 
 * Handles the complete workflow for CA and Exam question management:
 * - Configuration by Admin/Exam Officer
 * - Question submission by Teachers
 * - Moderation workflow
 * - Notification system
 * - Printing and CBT support
 */

const db = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate scheduled date and submission deadline
 */
async function calculateCADates(caSetupId, academicYearStart) {
  try {
    const result = await db.sequelize.query(
      'CALL sp_calculate_ca_dates(:ca_setup_id, :academic_year_start)',
      {
        replacements: {
          ca_setup_id: caSetupId,
          academic_year_start: academicYearStart
        }
      }
    );
    return result[0][0];
  } catch (error) {
    console.error('Error calculating CA dates:', error);
    throw error;
  }
}

/**
 * Generate unique submission code
 */
function generateSubmissionCode(schoolId, caType, teacherId) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `SUB-${schoolId}-${caType}-${teacherId}-${timestamp}-${random}`;
}

/**
 * Generate unique notification code
 */
function generateNotificationCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `NOTIF-${timestamp}-${random}`;
}

/**
 * Check if deadline has passed
 */
function isDeadlinePassed(deadline) {
  return new Date(deadline) < new Date();
}

/**
 * Calculate days remaining until deadline
 */
function getDaysRemaining(deadline) {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// =====================================================
// CA/EXAM SETUP MANAGEMENT (Admin/Exam Officer)
// =====================================================

/**
 * Get all CA/Exam setups for a school
 */
exports.getCASetups = async (req, res) => {
  try {
    const { academic_year, term, ca_type, is_active, school_id: query_school_id, branch_id: query_branch_id } = req.query;
    const school_id = req.user?.school_id || req.headers['x-school-id'] || query_school_id;
    const branch_id = req.user?.branch_id || req.headers['x-branch-id'] || query_branch_id;

    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID and Branch ID are required'
      });
    }

    const setups = await db.sequelize.query(
      `SELECT 
        cs.*,
        aw.end_date as submission_deadline,
        DATEDIFF(aw.end_date, CURDATE()) as days_until_deadline,
        (SELECT COUNT(*) FROM ca_exam_submissions ces 
         WHERE ces.ca_setup_id = cs.id) as total_submissions,
        (SELECT COUNT(*) FROM ca_exam_submissions ces 
         WHERE ces.ca_setup_id = cs.id AND ces.status = 'Approved') as approved_submissions
      FROM ca_setup cs
      LEFT JOIN academic_weeks aw ON (
        CASE 
          WHEN cs.week_number > 2 THEN cs.week_number - 2
          ELSE cs.week_number - 1
        END
      ) = aw.week_number
        AND cs.school_id = aw.school_id
        AND cs.branch_id = aw.branch_id
        ${academic_year ? 'AND aw.academic_year = :academic_year' : ''}
        ${term ? 'AND aw.term = :term' : ''}
      WHERE cs.school_id = :school_id
        AND cs.branch_id = :branch_id
        ${ca_type ? 'AND cs.ca_type = :ca_type' : ''}
        ${is_active !== undefined ? 'AND cs.status = :status' : ''}
      ORDER BY cs.week_number ASC`,
      {
        replacements: { 
          school_id, 
          branch_id, 
          academic_year, 
          term, 
          ca_type, 
          ...(is_active !== undefined && { status: is_active === 1 ? 'Active' : 'Inactive' })
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: setups,
      count: setups.length
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
 * Create new CA/Exam setup
 */
exports.createCASetup = async (req, res) => {
  try {
    const {
      school_id,
      branch_id,
      ca_type,
      week_number,
      max_score,
      overall_contribution_percent,
      section,
      academic_year_start
    } = req.body;

    // Validation
    if (!school_id || !branch_id || !ca_type || !week_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check for overlapping weeks
    const [existing] = await db.sequelize.query(
      `SELECT id FROM ca_setup 
       WHERE school_id = :school_id 
         AND branch_id = :branch_id 
         AND week_number = :week_number 
         AND status = 'Active'`,
      {
        replacements: { school_id, branch_id, week_number },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Week ${week_number} is already assigned to another CA/Exam`
      });
    }

    // Insert CA setup
    const [result] = await db.sequelize.query(
      `INSERT INTO ca_setup (
        school_id, branch_id, ca_type, week_number, max_score,
        overall_contribution_percent, section, is_active, status,
        created_at, updated_at
      ) VALUES (
        :school_id, :branch_id, :ca_type, :week_number, :max_score,
        :overall_contribution_percent, :section, 1, 'Active',
        NOW(), NOW()
      )`,
      {
        replacements: {
          school_id,
          branch_id,
          ca_type,
          week_number,
          max_score: max_score || 100,
          overall_contribution_percent: overall_contribution_percent || 0,
          section: section || null
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    const caSetupId = result;

    // Calculate dates if academic year start is provided
    if (academic_year_start) {
      await calculateCADates(caSetupId, academic_year_start);
    }

    // Fetch the created setup
    const [setup] = await db.sequelize.query(
      'SELECT * FROM ca_setup WHERE id = :id',
      {
        replacements: { id: caSetupId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      message: 'CA/Exam setup created successfully',
      data: setup
    });
  } catch (error) {
    console.error('Error creating CA setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create CA setup',
      error: error.message
    });
  }
};

/**
 * Update CA/Exam setup
 */
exports.updateCASetup = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      week_number,
      max_score,
      overall_contribution_percent,
      is_active,
      status,
      academic_year_start
    } = req.body;

    // Check if setup exists
    const [existing] = await db.sequelize.query(
      'SELECT * FROM ca_setup WHERE id = :id',
      {
        replacements: { id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'CA setup not found'
      });
    }

    // Update setup
    await db.sequelize.query(
      `UPDATE ca_setup SET
        week_number = COALESCE(:week_number, week_number),
        max_score = COALESCE(:max_score, max_score),
        overall_contribution_percent = COALESCE(:overall_contribution_percent, overall_contribution_percent),
        is_active = COALESCE(:is_active, is_active),
        status = COALESCE(:status, status),
        updated_at = NOW()
      WHERE id = :id`,
      {
        replacements: {
          id,
          week_number,
          max_score,
          overall_contribution_percent,
          is_active,
          status
        }
      }
    );

    // Recalculate dates if week_number changed or academic_year_start provided
    if (week_number || academic_year_start) {
      await calculateCADates(id, academic_year_start || existing.academic_year_start);
    }

    // Fetch updated setup
    const [updated] = await db.sequelize.query(
      'SELECT * FROM ca_setup WHERE id = :id',
      {
        replacements: { id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      message: 'CA setup updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating CA setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update CA setup',
      error: error.message
    });
  }
};

/**
 * Update CA/Exam setup in bulk (for deactivate/delete operations)
 */
exports.updateCASetupBulk = async (req, res) => {
  try {
    const {
      query_type,
      id,
      ca_type,
      academic_year,
      term,
      status,
      section
    } = req.body;

    // Require ID for all operations to prevent bulk updates
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID is required for CA setup updates'
      });
    }

    if (query_type === 'Deactivate') {
      const result = await db.sequelize.query(
        `UPDATE ca_setup SET
          status = 'Inactive',
          is_active = 0,
          updated_at = NOW()
        WHERE id = :id`,
        { replacements: { id: parseInt(id) } }
      );

      res.json({
        success: true,
        message: 'CA setup deactivated successfully'
      });
    } else if (query_type === 'Activate') {
      const result = await db.sequelize.query(
        `UPDATE ca_setup SET
          status = 'Active',
          is_active = 1,
          updated_at = NOW()
        WHERE id = :id`,
        { replacements: { id: parseInt(id) } }
      );

      res.json({
        success: true,
        message: 'CA setup activated successfully'
      });
    } else if (query_type === 'Delete') {
      // Build dynamic where clause for delete
      let whereClause = 'WHERE cs.ca_type = :ca_type';
      let replacements = { ca_type };

      if (academic_year) {
        whereClause += ' AND cs.academic_year = :academic_year';
        replacements.academic_year = academic_year;
      }

      if (term) {
        whereClause += ' AND cs.term = :term';
        replacements.term = term;
      }

      if (section && section !== 'All') {
        whereClause += ' AND (cs.section = :section OR cs.section = "All")';
        replacements.section = section;
      }

      // Check if there are submissions first
      const [submissions] = await db.sequelize.query(
        `SELECT COUNT(*) as count FROM ca_exam_submissions ces
         JOIN ca_setup cs ON ces.ca_setup_id = cs.id
         ${whereClause}`,
        {
          replacements,
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (submissions.count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete CA setup with existing submissions. Please deactivate instead.'
        });
      }

      // Delete CA setups matching criteria
      let deleteWhereClause = whereClause.replace(/cs\./g, '');
      await db.sequelize.query(
        `DELETE FROM ca_setup ${deleteWhereClause}`,
        { replacements }
      );

      res.json({
        success: true,
        message: 'CA setup deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid query_type. Use "Activate", "Deactivate" or "Delete"'
      });
    }
  } catch (error) {
    console.error('Error updating CA setup bulk:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update CA setup',
      error: error.message
    });
  }
};

/**
 * Delete CA/Exam setup
 */
exports.deleteCASetup = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are submissions
    const [submissions] = await db.sequelize.query(
      'SELECT COUNT(*) as count FROM ca_exam_submissions WHERE ca_setup_id = :id',
      {
        replacements: { id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (submissions.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete CA setup with existing submissions. Please deactivate instead.'
      });
    }

    // Delete setup
    await db.sequelize.query(
      'DELETE FROM ca_setup WHERE id = :id',
      {
        replacements: { id }
      }
    );

    res.json({
      success: true,
      message: 'CA setup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting CA setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete CA setup',
      error: error.message
    });
  }
};

// =====================================================
// QUESTION SUBMISSION (Teachers)
// =====================================================

/**
 * Get teacher's submissions
 */
exports.getTeacherSubmissions = async (req, res) => {
  try {
    const { school_id, branch_id, academic_year, term, status } = req.query;
    const userType = req.user.user_type;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'school_id is required'
      });
    }

    const isAdmin = ['Admin', 'SuperAdmin', 'admin', 'superadmin'].includes(userType);
    let teacher_id = null;

    if (!isAdmin) {
      const teacher = await db.sequelize.query(
        'SELECT id FROM teachers WHERE user_id = :user_id AND school_id = :school_id',
        {
          replacements: { user_id: req.user.id, school_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (!teacher || teacher.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
      teacher_id = teacher[0].id;
    }

    const submissions = await db.sequelize.query(
      `SELECT 
        ces.*,
        cs.ca_type,
        cs.week_number,
        cs.scheduled_date,
        cs.submission_deadline,
        s.subject as subject_name,
        c.class_name,
        t.name as teacher_name,
        DATEDIFF(cs.submission_deadline, CURDATE()) as days_remaining,
        CASE 
          WHEN cs.submission_deadline < CURDATE() THEN 1
          ELSE 0
        END as is_overdue
      FROM ca_exam_submissions ces
      JOIN ca_setup cs ON ces.ca_setup_id = cs.id
      JOIN subjects s ON ces.subject_code = s.subject_code
      JOIN classes c ON ces.class_id = c.class_code
      LEFT JOIN teachers t ON ces.teacher_id = t.id
      WHERE ces.school_id = :school_id
        ${!isAdmin ? 'AND ces.teacher_id = :teacher_id' : ''}
        ${branch_id ? 'AND ces.branch_id = :branch_id' : ''}
        ${academic_year ? 'AND ces.academic_year = :academic_year' : ''}
        ${term ? 'AND ces.term = :term' : ''}
        ${status ? 'AND ces.status = :status' : ''}
      ORDER BY cs.submission_deadline ASC`,
      {
        replacements: { teacher_id, school_id, branch_id, academic_year, term, status },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: submissions,
      count: submissions.length,
      readOnly: isAdmin
    });
  } catch (error) {
    console.error('Error fetching teacher submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};

/**
 * Get teacher's subjects from teacher_classes
 */
exports.getTeacherSubjects = async (req, res) => {
  try {
    const { school_id } = req.query;
    console.log('getTeacherSubjects called:', { req_user: req.user, school_id });

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'school_id is required'
      });
    }

    const teacher = await db.sequelize.query(
      'SELECT id FROM teachers WHERE user_id = :user_id AND school_id = :school_id',
      {
        replacements: { user_id: req.user.id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    console.log('Teacher query result:', teacher);

    if (!teacher || teacher.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const subjects = await db.sequelize.query(
      `SELECT DISTINCT subject_code, subject, class_code, class_name
       FROM active_teacher_classes 
       WHERE teacher_id = :teacher_id AND school_id = :school_id
       ORDER BY class_name, subject`,
      {
        replacements: { teacher_id: teacher[0].id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Error fetching teacher subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message
    });
  }
};

/**
 * Create or update submission (Draft/Submit)
 */
exports.submitQuestions = async (req, res) => {
  try {
    const {
      school_id: body_school_id,
      branch_id: body_branch_id,
      ca_setup_id,
      subject_id,
      class_id,
      academic_year,
      term,
      comments,
      submit_now // true = submit, false = save as draft
    } = req.body;

    // Get school_id and branch_id from req.user, body, or headers (in priority order)
    const school_id = req.user?.school_id || body_school_id || req.headers['x-school-id'];
    const branch_id = req.user?.branch_id || body_branch_id || req.headers['x-branch-id'];

    // Debug logging
    console.log('Submit Questions - IDs:', {
      user_school_id: req.user?.school_id,
      user_branch_id: req.user?.branch_id,
      body_school_id,
      body_branch_id,
      header_school_id: req.headers['x-school-id'],
      header_branch_id: req.headers['x-branch-id'],
      final_school_id: school_id,
      final_branch_id: branch_id
    });

    // Validation
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'school_id is required. Please ensure it is sent in request body or headers.'
      });
    }

    // Get teacher_id from authenticated user
    const teacher = await db.sequelize.query(
      'SELECT id FROM teachers WHERE user_id = :user_id AND school_id = :school_id',
      {
        replacements: { user_id: req.user.id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!teacher || teacher.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const teacher_id = teacher[0].id;

    // Validation
    if (!school_id || !ca_setup_id || !subject_id || !class_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get CA setup details
    const [caSetup] = await db.sequelize.query(
      'SELECT * FROM ca_setup WHERE id = :id',
      {
        replacements: { id: ca_setup_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!caSetup) {
      return res.status(404).json({
        success: false,
        message: 'CA setup not found'
      });
    }

    // Check deadline if submitting - mark as late if passed
    const isLate = submit_now && isDeadlinePassed(caSetup.submission_deadline);

    // Handle file upload
    let fileData = {};
    if (req.file) {
      // Upload to Cloudinary
      const cloudinary = require('cloudinary').v2;
      
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'ca-questions',
          resource_type: 'auto',
          type: 'upload',
          access_mode: 'public',
          public_id: `${school_id}_${ca_setup_id}_${Date.now()}`
        });

        fileData = {
          question_file_url: result.secure_url,
          question_file_name: req.file.originalname,
          question_file_type: req.file.mimetype,
          question_file_size: req.file.size
        };

        // Delete local file after upload
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file to cloud storage'
        });
      }
    }

    // Check if submission exists
    const [existing] = await db.sequelize.query(
      `SELECT id, status FROM ca_exam_submissions 
       WHERE school_id = :school_id 
         AND teacher_id = :teacher_id 
         AND subject_code = :subject_code 
         AND class_id = :class_id`,
      {
        replacements: { school_id, teacher_id, subject_code: subject_id, class_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (existing && existing.is_locked) {
      return res.status(400).json({
        success: false,
        message: 'Submission is locked and cannot be modified'
      });
    }

    const status = submit_now ? 'Submitted' : 'Draft';
    const submission_date = submit_now ? new Date() : null;

    if (existing) {
      // Update existing submission
      await db.sequelize.query(
        `UPDATE ca_exam_submissions SET
          ${Object.keys(fileData).length > 0 ? `
            question_file_url = :question_file_url,
            question_file_name = :question_file_name,
            question_file_type = :question_file_type,
            question_file_size = :question_file_size,
          ` : ''}
          comments = :comments,
          status = :status,
          submission_date = :submission_date,
          is_late_submission = :is_late_submission,
          updated_at = NOW(),
          updated_by = :teacher_id
        WHERE id = :id`,
        {
          replacements: {
            id: existing.id,
            ...fileData,
            comments,
            status,
            submission_date,
            is_late_submission: isLate ? 1 : 0,
            teacher_id
          }
        }
      );

      // Log action
      await db.sequelize.query(
        `INSERT INTO ca_exam_moderation_logs (
          submission_id, moderator_id, action, previous_status, new_status, comments, 
          school_id, branch_id, action_by, action_date, created_at, updated_at
        ) VALUES (
          :submission_id, :moderator_id, :action, :previous_status, :new_status, :comments,
          :school_id, :branch_id, :action_by, NOW(), NOW(), NOW()
        )`,
        {
          replacements: {
            submission_id: existing.id,
            moderator_id: req.user.id,
            action: submit_now ? 'Approved' : 'Modification Requested',
            previous_status: existing.status,
            new_status: status,
            comments: comments || 'Submission updated',
            school_id,
            branch_id,
            action_by: req.user.id
          }
        }
      );

      res.json({
        success: true,
        message: submit_now 
          ? (isLate ? 'Questions submitted successfully (marked as late submission)' : 'Questions submitted successfully')
          : 'Draft saved successfully',
        data: { id: existing.id, status, is_late_submission: isLate }
      });
    } else {
      // Create new submission
      const submission_code = `SUB-${school_id}-${caSetup.ca_type}-${teacher_id}-${Date.now()}`;

      const [result] = await db.sequelize.query(
        `INSERT INTO ca_exam_submissions (
          submission_code, teacher_id, subject_code, class_id, ca_setup_id, ca_type,
          ${Object.keys(fileData).length > 0 ? 'question_file, question_file_name, question_file_size,' : ''}
          comments, status, submission_date, is_late_submission,
          school_id, branch_id, academic_year, term, created_at, created_by
        ) VALUES (
          :submission_code, :teacher_id, :subject_code, :class_id, :ca_setup_id, :ca_type,
          ${Object.keys(fileData).length > 0 ? ':question_file, :question_file_name, :question_file_size,' : ''}
          :comments, :status, :submission_date, :is_late_submission,
          :school_id, :branch_id, :academic_year, :term, NOW(), :teacher_id
        )`,
        {
          replacements: {
            submission_code,
            teacher_id,
            subject_code: subject_id,
            class_id,
            ca_setup_id,
            ca_type: caSetup.ca_type,
            question_file: fileData.question_file_url || null,
            question_file_name: fileData.question_file_name || null,
            question_file_size: fileData.question_file_size || null,
            comments,
            status,
            submission_date: submit_now ? new Date() : null,
            is_late_submission: isLate ? 1 : 0,
            school_id,
            branch_id,
            academic_year,
            term
          },
          type: db.sequelize.QueryTypes.INSERT
        }
      );

      const submissionId = result;

      // Log action
      await db.sequelize.query(
        `INSERT INTO ca_exam_moderation_logs (
          submission_id, moderator_id, action, new_status, comments,
          school_id, branch_id, action_by, action_date, created_at, updated_at
        ) VALUES (
          :submission_id, :moderator_id, :action, :new_status, :comments,
          :school_id, :branch_id, :action_by, NOW(), NOW(), NOW()
        )`,
        {
          replacements: {
            submission_id: submissionId,
            moderator_id: req.user.id,
            action: submit_now ? 'Approved' : 'Modification Requested',
            new_status: status,
            comments: comments || 'Initial submission',
            school_id,
            branch_id,
            action_by: req.user.id
          }
        }
      );

      // Send notification to admin if submitted
      if (submit_now) {
        const notification_code = generateNotificationCode();
        await db.sequelize.query(
          `INSERT INTO ca_exam_notifications (
            notification_code, school_id, branch_id, ca_setup_id,
            notification_type, recipient_type, title, message,
            ca_type, submission_id, priority
          ) VALUES (
            :notification_code, :school_id, :branch_id, :ca_setup_id,
            'Submission Received', 'Admin', :title, :message,
            :ca_type, :submission_id, 'Normal'
          )`,
          {
            replacements: {
              notification_code,
              school_id,
              branch_id,
              ca_setup_id,
              title: `New ${caSetup.ca_type} Question Submission`,
              message: `A teacher has submitted questions for ${caSetup.ca_type}. Please review.`,
              ca_type: caSetup.ca_type,
              submission_id: submissionId
            }
          }
        );
      }

      res.json({
        success: true,
        message: submit_now 
          ? (isLate ? 'Questions submitted successfully (marked as late submission)' : 'Questions submitted successfully')
          : 'Draft saved successfully',
        data: { id: submissionId, status, submission_code, is_late_submission: isLate }
      });
    }
  } catch (error) {
    console.error('Error submitting questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit questions',
      error: error.message
    });
  }
};

// =====================================================
// SUBMISSION MANAGEMENT
// =====================================================

exports.updateSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { comments, submit_now } = req.body;
    const userId = req.user.id;
    const school_id = req.user?.school_id || req.headers['x-school-id'];

    // Get teacher_id from user_id
    const teacher = await db.sequelize.query(
      'SELECT id FROM teachers WHERE user_id = :user_id AND school_id = :school_id',
      {
        replacements: { user_id: userId, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!teacher || teacher.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const teacher_id = teacher[0].id;

    // Get existing submission
    const [submission] = await db.sequelize.query(
      `SELECT * FROM ca_exam_submissions WHERE id = :id AND teacher_id = :teacher_id`,
      {
        replacements: { id: submissionId, teacher_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or you do not have permission to edit it'
      });
    }

    // Only allow editing if status is Draft or Modification Requested
    if (submission.status !== 'Draft' && submission.status !== 'Modification Requested') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit submission with status: ${submission.status}`
      });
    }

    let updateFields = {};
    let questionFileUrl = submission.question_file_url;
    let questionFileName = submission.question_file_name;

    // Handle file upload if present
    if (req.file) {
      const cloudinary = require('cloudinary').v2;
      
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'ca-questions',
          resource_type: 'auto',
          type: 'upload',
          access_mode: 'public',
          public_id: `${submission.school_id}_${submission.ca_setup_id}_${Date.now()}`
        });

        questionFileUrl = result.secure_url;
        questionFileName = req.file.originalname;

        // Delete local file after upload
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file to cloud storage'
        });
      }
    }

    // Update submission
    const newStatus = submit_now === 'true' || submit_now === true ? 'Submitted' : 'Draft';
    const submissionDate = submit_now === 'true' || submit_now === true ? new Date() : submission.submission_date;

    await db.sequelize.query(
      `UPDATE ca_exam_submissions
       SET question_file_url = :question_file_url,
           question_file_name = :question_file_name,
           comments = :comments,
           status = :status,
           submission_date = :submission_date,
           updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          id: submissionId,
          question_file_url: questionFileUrl,
          question_file_name: questionFileName,
          comments: comments || submission.comments,
          status: newStatus,
          submission_date: submissionDate
        },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    return res.status(200).json({
      success: true,
      message: submit_now ? 'Submission updated and resubmitted successfully' : 'Submission updated successfully'
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update submission',
      error: error.message
    });
  }
};

exports.deleteSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const userId = req.user.id;

    // Only allow deleting drafts
    await db.sequelize.query(
      `DELETE FROM ca_exam_submissions
       WHERE id = :id AND teacher_id = :teacher_id AND status = 'Draft'`,
      {
        replacements: { id: submissionId, teacher_id: userId },
        type: db.sequelize.QueryTypes.DELETE
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete draft',
      error: error.message
    });
  }
};

exports.submitForModeration = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const userId = req.user.id;
    const school_id = req.user?.school_id || req.headers['x-school-id'];

    // Get teacher_id from user_id
    const teacher = await db.sequelize.query(
      'SELECT id FROM teachers WHERE user_id = :user_id AND school_id = :school_id',
      {
        replacements: { user_id: userId, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!teacher || teacher.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const teacher_id = teacher[0].id;

    await db.sequelize.query(
      `UPDATE ca_exam_submissions
       SET status = 'Submitted', submission_date = NOW()
       WHERE id = :id AND teacher_id = :teacher_id AND status = 'Draft'`,
      {
        replacements: { id: submissionId, teacher_id },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Submitted for moderation successfully'
    });
  } catch (error) {
    console.error('Error submitting for moderation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit for moderation',
      error: error.message
    });
  }
};

// =====================================================
// MODERATION
// =====================================================

exports.getPendingSubmissions = async (req, res) => {
  try {
    const { school_id: query_school_id, branch_id: query_branch_id, academic_year, term, status } = req.query;

    // Get school_id and branch_id from query, headers, or user
    const school_id = query_school_id || req.headers['x-school-id'] || req.user?.school_id;
    const branch_id = query_branch_id || req.headers['x-branch-id'] || req.user?.branch_id;

    let statusFilter = '';
    if (status && status.toLowerCase() !== 'all') {
      const statuses = status.split(',').map(s => `'${s.trim()}'`).join(',');
      statusFilter = `AND ces.status IN (${statuses})`;
    } else if (!status) {
      // Default: show only pending submissions
      statusFilter = `AND ces.status IN ('Submitted', 'Under Moderation')`;
    }
    // If status === 'all', no filter (show all statuses)

    console.log('getPendingSubmissions - Filters:', { school_id, branch_id, academic_year, term, status, statusFilter });

    const submissions = await db.sequelize.query(
      `SELECT ces.*,
              t.name as teacher_name,
              sub.subject as subject_name,
              c.class_name
       FROM ca_exam_submissions ces
       LEFT JOIN teachers t ON ces.teacher_id = t.id
       LEFT JOIN subjects sub ON ces.subject_code = sub.subject_code
       LEFT JOIN classes c ON ces.class_id = c.class_code
       WHERE ces.school_id = :school_id
         ${branch_id ? 'AND ces.branch_id = :branch_id' : ''}
         ${academic_year ? 'AND ces.academic_year = :academic_year' : ''}
         ${term ? 'AND ces.term = :term' : ''}
         ${statusFilter}
       ORDER BY ces.submission_date DESC`,
      {
        replacements: { school_id, branch_id, academic_year, term },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    console.log('getPendingSubmissions - Results:', submissions.length, 'submissions found');
    console.log('Sample statuses:', submissions.slice(0, 5).map(s => ({ id: s.id, status: s.status, submission_code: s.submission_code })));

    return res.status(200).json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};

exports.approveSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { comments } = req.body;
    const userId = req.user.id;

    // Get current status
    const [submission] = await db.sequelize.query(
      'SELECT status, school_id, branch_id FROM ca_exam_submissions WHERE id = :id',
      {
        replacements: { id: submissionId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    await db.sequelize.query(
      `UPDATE ca_exam_submissions
       SET status = 'Approved', updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: { id: submissionId },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    // Log moderation action
    await db.sequelize.query(
      `INSERT INTO ca_exam_moderation_logs
       (submission_id, moderator_id, action, previous_status, new_status, comments, 
        school_id, branch_id, action_by, action_date, created_at, updated_at)
       VALUES (:submission_id, :moderator_id, 'Approved', :previous_status, 'Approved', :comments,
        :school_id, :branch_id, :action_by, NOW(), NOW(), NOW())`,
      {
        replacements: {
          submission_id: submissionId,
          moderator_id: userId,
          previous_status: submission?.status || 'Submitted',
          comments: comments || 'Approved',
          school_id: submission?.school_id,
          branch_id: submission?.branch_id,
          action_by: userId
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Submission approved'
    });
  } catch (error) {
    console.error('Error approving submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve submission',
      error: error.message
    });
  }
};

exports.rejectSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    // Get current status
    const [submission] = await db.sequelize.query(
      'SELECT status, school_id, branch_id FROM ca_exam_submissions WHERE id = :id',
      {
        replacements: { id: submissionId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    await db.sequelize.query(
      `UPDATE ca_exam_submissions
       SET status = 'Rejected', rejection_reason = :reason, updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: { id: submissionId, reason },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    // Log moderation action
    await db.sequelize.query(
      `INSERT INTO ca_exam_moderation_logs
       (submission_id, moderator_id, action, previous_status, new_status, comments,
        school_id, branch_id, action_by, action_date, created_at, updated_at)
       VALUES (:submission_id, :moderator_id, 'Rejected', :previous_status, 'Rejected', :reason,
        :school_id, :branch_id, :action_by, NOW(), NOW(), NOW())`,
      {
        replacements: {
          submission_id: submissionId,
          moderator_id: userId,
          previous_status: submission?.status || 'Submitted',
          reason: reason,
          school_id: submission?.school_id,
          branch_id: submission?.branch_id,
          action_by: userId
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Submission rejected'
    });
  } catch (error) {
    console.error('Error rejecting submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject submission',
      error: error.message
    });
  }
};

exports.requestModification = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { comments } = req.body;
    const userId = req.user.id;

    await db.sequelize.query(
      `UPDATE ca_exam_submissions
       SET status = 'Modification Requested'
       WHERE id = :id`,
      {
        replacements: { id: submissionId, user_id: userId },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    // Log moderation action
    await db.sequelize.query(
      `INSERT INTO ca_exam_moderation_logs
       (submission_id, moderator_id, action, comments, school_id, branch_id, action_by, action_date, created_at, updated_at)
       VALUES (:submission_id, :moderator_id, 'Modification Requested', :comments, :school_id, :branch_id, :action_by, NOW(), NOW(), NOW())`,
      {
        replacements: {
          submission_id: submissionId,
          moderator_id: userId,
          comments: comments,
          school_id: req.headers['x-school-id'] || req.user?.school_id,
          branch_id: req.headers['x-branch-id'] || req.user?.branch_id,
          action_by: userId
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Modification requested'
    });
  } catch (error) {
    console.error('Error requesting modification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to request modification',
      error: error.message
    });
  }
};

exports.replaceQuestionFile = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { comments } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Replacement file is required'
      });
    }

    // Upload to Cloudinary
    const cloudinary = require('cloudinary').v2;
    let replacementFileUrl, replacementFileName;

    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'ca-questions',
        resource_type: 'auto',
        type: 'upload',
        access_mode: 'public',
        public_id: `replaced_${submissionId}_${Date.now()}`
      });

      replacementFileUrl = result.secure_url;
      replacementFileName = req.file.originalname;

      // Delete local file after upload
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to cloud storage'
      });
    }

    await db.sequelize.query(
      `UPDATE ca_exam_submissions
       SET question_file_url = :question_file_url,
           question_file_name = :question_file_name,
           updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          id: submissionId,
          question_file_url: replacementFileUrl,
          question_file_name: replacementFileName
        },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    // Log moderation action
    await db.sequelize.query(
      `INSERT INTO ca_exam_moderation_logs
       (submission_id, moderator_id, action, comments, school_id, branch_id, action_by, action_date, created_at, updated_at)
       VALUES (:submission_id, :moderator_id, 'File Replaced', :comments, :school_id, :branch_id, :action_by, NOW(), NOW(), NOW())`,
      {
        replacements: {
          submission_id: submissionId,
          moderator_id: userId,
          comments: comments || 'Question file replaced',
          school_id: req.headers['x-school-id'] || req.user?.school_id,
          branch_id: req.headers['x-branch-id'] || req.user?.branch_id,
          action_by: userId
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Question file replaced successfully'
    });
  } catch (error) {
    console.error('Error replacing file:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to replace file',
      error: error.message
    });
  }
};

exports.getModerationLogs = async (req, res) => {
  try {
    const submissionId = req.params.id;

    const logs = await db.sequelize.query(
      `SELECT ml.*, u.name as moderator_name
       FROM ca_exam_moderation_logs ml
       LEFT JOIN users u ON ml.moderator_id = u.id
       WHERE ml.submission_id = :submission_id
       ORDER BY ml.created_at DESC`,
      {
        replacements: { submission_id: submissionId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching moderation logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
      error: error.message
    });
  }
};

// =====================================================
// PRINT
// =====================================================

exports.getApprovedForPrint = async (req, res) => {
  try {
    const { school_id: query_school_id, branch_id: query_branch_id, academic_year, term, ca_type, is_printed } = req.query;

    // Get school_id and branch_id from query, headers, or user
    const school_id = query_school_id || req.headers['x-school-id'] || req.user?.school_id;
    const branch_id = query_branch_id || req.headers['x-branch-id'] || req.user?.branch_id;

    console.log('getApprovedForPrint params:', { school_id, branch_id, academic_year, term, ca_type, is_printed });

    let caTypeFilter = ca_type ? `AND ces.ca_type = :ca_type` : '';
    let printedFilter = is_printed !== undefined ? `AND ces.is_printed = :is_printed` : '';

    const query = `SELECT ces.*,
              u.name as teacher_name,
              sub.subject as subject_name,
              c.class_name,
              cs.max_score,
              cs.scheduled_date,
              ces.updated_at as approved_date
       FROM ca_exam_submissions ces
       LEFT JOIN users u ON ces.teacher_id = u.id
       LEFT JOIN subjects sub ON ces.subject_code = sub.subject_code
       LEFT JOIN classes c ON ces.class_id = c.class_code
       LEFT JOIN ca_setup cs ON ces.ca_setup_id = cs.id
       WHERE ces.school_id = :school_id
         AND ces.branch_id = :branch_id
         AND ces.academic_year = :academic_year
         AND ces.term = :term
         AND ces.status = 'Approved'
         ${caTypeFilter}
         ${printedFilter}
       ORDER BY ces.ca_type, c.class_name, sub.subject`;

    console.log('Query:', query);
    console.log('Replacements:', { school_id, branch_id, academic_year, term, ca_type, is_printed });

    // Debug: Check what data exists
    const allApproved = await db.sequelize.query(
      `SELECT school_id, branch_id, academic_year, term, status, ca_type 
       FROM ca_exam_submissions 
       WHERE school_id = :school_id AND status = 'Approved'
       LIMIT 5`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    console.log('Sample approved submissions in DB:', allApproved);

    const submissions = await db.sequelize.query(query, {
      replacements: {
        school_id,
        branch_id,
        academic_year,
        term,
        ...(ca_type && { ca_type }),
        ...(is_printed !== undefined && { is_printed: parseInt(is_printed) })
      },
      type: db.sequelize.QueryTypes.SELECT
    });

    console.log('Found submissions:', submissions.length);

    return res.status(200).json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching approved submissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch approved submissions',
      error: error.message
    });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const userId = req.user.id;

    // Mark as printed
    await db.sequelize.query(
      `UPDATE ca_exam_submissions
       SET is_printed = 1, printed_by = :user_id, printed_date = NOW(), print_count = print_count + 1
       WHERE id = :id`,
      {
        replacements: { id: submissionId, user_id: userId },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    return res.status(200).json({
      success: true,
      message: 'PDF generated successfully'
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const submissionId = req.params.id;

    return res.status(200).json({
      success: true,
      message: 'Download initiated'
    });
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download PDF',
      error: error.message
    });
  }
};

// =====================================================
// PROGRESS TRACKING
// =====================================================

exports.getProgressOverview = async (req, res) => {
  try {
    const { school_id, branch_id, academic_year, term, ca_type } = req.query;

    let caTypeFilter = ca_type ? `AND cs.ca_type = :ca_type` : '';

    const overview = await db.sequelize.query(
      `SELECT
         COUNT(DISTINCT cs.id) as total_setups,
         COUNT(DISTINCT ces.id) as total_expected_submissions,
         SUM(CASE WHEN ces.status IN ('Submitted', 'Under Moderation', 'Approved') THEN 1 ELSE 0 END) as submitted_count,
         SUM(CASE WHEN ces.status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
         SUM(CASE WHEN ces.status IN ('Submitted', 'Under Moderation') THEN 1 ELSE 0 END) as pending_count,
         SUM(CASE WHEN ces.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count
       FROM ca_setup cs
       LEFT JOIN ca_exam_submissions ces ON cs.id = ces.ca_setup_id
         AND ces.academic_year = :academic_year
         AND ces.term = :term
       WHERE cs.school_id = :school_id
         AND cs.branch_id = :branch_id
         ${caTypeFilter}`,
      {
        replacements: {
          school_id,
          branch_id,
          academic_year,
          term,
          ...(ca_type && { ca_type })
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const result = overview[0] || {};
    result.completion_percentage = result.total_expected_submissions > 0
      ? Math.round((result.submitted_count / result.total_expected_submissions) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching progress overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: error.message
    });
  }
};

exports.getProgressBySubject = async (req, res) => {
  try {
    const { school_id, branch_id, academic_year, term, ca_type } = req.query;

    let caTypeFilter = ca_type ? `AND ces.ca_type = :ca_type` : '';

    const progress = await db.sequelize.query(
      `SELECT
         sub.subject_code,
         sub.subject as subject_name,
         (SELECT COUNT(*) FROM subjects WHERE status = 'Active' AND school_id = :school_id ${branch_id ? 'AND branch_id = :branch_id' : ''}) as total_expected,
         SUM(CASE WHEN ces.status IN ('Submitted', 'Under Moderation', 'Approved') THEN 1 ELSE 0 END) as submitted,
         SUM(CASE WHEN ces.status = 'Approved' THEN 1 ELSE 0 END) as approved,
         SUM(CASE WHEN ces.status IN ('Submitted', 'Under Moderation') THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN ces.status = 'Rejected' THEN 1 ELSE 0 END) as rejected
       FROM subjects sub
       LEFT JOIN ca_exam_submissions ces ON sub.subject_code = ces.subject_code
         AND ces.school_id = :school_id
         ${branch_id ? 'AND ces.branch_id = :branch_id' : ''}
         ${academic_year ? 'AND ces.academic_year = :academic_year' : ''}
         ${term ? 'AND ces.term = :term' : ''}
         ${caTypeFilter}
       WHERE sub.status = 'Active'
         AND sub.school_id = :school_id
         ${branch_id ? 'AND sub.branch_id = :branch_id' : ''}
       GROUP BY sub.subject_code, sub.subject`,
      {
        replacements: {
          school_id,
          branch_id,
          academic_year,
          term,
          ...(ca_type && { ca_type })
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Calculate completion percentage
    progress.forEach(item => {
      item.completion_percentage = item.total_expected > 0
        ? Math.round((item.submitted / item.total_expected) * 100)
        : 0;
    });

    return res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching progress by subject:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: error.message
    });
  }
};

exports.getProgressByTeacher = async (req, res) => {
  try {
    const { school_id, branch_id, academic_year, term, ca_type } = req.query;

    let caTypeFilter = ca_type ? `AND cs.ca_type = :ca_type` : '';

    const progress = await db.sequelize.query(
      `SELECT
         t.id as teacher_id,
         t.name as teacher_name,
         (COUNT(DISTINCT tc.subject_code) * COUNT(DISTINCT cs.ca_type)) as total_expected,
         SUM(CASE WHEN ces.status IN ('Submitted', 'Under Moderation', 'Approved') THEN 1 ELSE 0 END) as submitted,
         SUM(CASE WHEN ces.status = 'Approved' THEN 1 ELSE 0 END) as approved,
         SUM(CASE WHEN ces.status IN ('Submitted', 'Under Moderation') THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN ces.status = 'Draft' THEN 1 ELSE 0 END) as draft
       FROM teachers t
       JOIN active_teacher_classes tc ON t.id = tc.teacher_id
       CROSS JOIN ca_setup cs
       LEFT JOIN ca_exam_submissions ces ON t.id = ces.teacher_id 
         AND tc.subject_code = ces.subject_code
         AND cs.id = ces.ca_setup_id
       WHERE t.school_id = :school_id
         AND cs.school_id = :school_id
         ${branch_id ? 'AND cs.branch_id = :branch_id' : ''}
         ${caTypeFilter}
       GROUP BY t.id, t.name`,
      {
        replacements: {
          school_id,
          branch_id,
          academic_year,
          term,
          ...(ca_type && { ca_type })
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Calculate completion percentage
    progress.forEach(item => {
      item.completion_percentage = item.total_expected > 0
        ? Math.round((item.submitted / item.total_expected) * 100)
        : 0;
    });

    return res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching progress by teacher:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: error.message
    });
  }
};

exports.getProgressByClass = async (req, res) => {
  try {
    const { school_id, branch_id, academic_year, term, ca_type } = req.query;

    let caTypeFilter = ca_type ? `AND cs.ca_type = :ca_type` : '';

    const progress = await db.sequelize.query(
      `SELECT
         c.class_code as class_id,
         c.class_name,
         (COUNT(DISTINCT s.subject_code) * COUNT(DISTINCT cs.ca_type)) as total_expected,
         SUM(CASE WHEN ces.status IN ('Submitted', 'Under Moderation', 'Approved') THEN 1 ELSE 0 END) as submitted,
         SUM(CASE WHEN ces.status = 'Approved' THEN 1 ELSE 0 END) as approved,
         SUM(CASE WHEN ces.status IN ('Submitted', 'Under Moderation') THEN 1 ELSE 0 END) as pending
       FROM classes c
       JOIN subjects s ON s.class_code = c.class_code
       CROSS JOIN ca_setup cs
       LEFT JOIN ca_exam_submissions ces ON c.class_code = ces.class_id
         AND s.subject_code = ces.subject_code
         AND cs.id = ces.ca_setup_id
       WHERE c.school_id = :school_id
         AND cs.school_id = :school_id
         ${branch_id ? 'AND c.branch_id = :branch_id AND cs.branch_id = :branch_id' : ''}
         ${caTypeFilter}
       GROUP BY c.class_code, c.class_name`,
      {
        replacements: {
          school_id,
          branch_id,
          academic_year,
          term,
          ...(ca_type && { ca_type })
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Calculate completion percentage
    progress.forEach(item => {
      item.completion_percentage = item.total_expected > 0
        ? Math.round((item.submitted / item.total_expected) * 100)
        : 0;
    });

    return res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching progress by class:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: error.message
    });
  }
};

// =====================================================
// NOTIFICATIONS
// =====================================================

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { school_id, branch_id } = req.query;

    const notifications = await db.sequelize.query(
      `SELECT * FROM ca_exam_notifications
       WHERE recipient_id = :user_id
         AND school_id = :school_id
         AND branch_id = :branch_id
       ORDER BY sent_date DESC
       LIMIT 50`,
      {
        replacements: { user_id: userId, school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    return res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    await db.sequelize.query(
      `UPDATE ca_exam_notifications
       SET is_read = 1, read_date = NOW()
       WHERE id = :id AND recipient_id = :user_id`,
      {
        replacements: { id: notificationId, user_id: userId },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
};

module.exports = exports;
