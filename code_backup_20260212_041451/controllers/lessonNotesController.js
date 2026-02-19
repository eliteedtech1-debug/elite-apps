const db = require('../models');
const { Op } = require('sequelize');

// Create lesson note
const createLessonNote = async (req, res) => {
  try {
    const {
      lesson_plan_id,
      subject_code,
      class_code,
      topic,
      lesson_summary,
      student_participation,
      challenges_faced,
      improvements_needed,
      next_lesson_preparation,
      lesson_date,
      actual_duration_minutes,
      attendance_count
    } = req.body;

    const { id: teacher_id, school_id, branch_id } = req.user;

    const lessonNote = await db.LessonNote.create({
      lesson_plan_id: lesson_plan_id || null,
      teacher_id,
      school_id,
      branch_id,
      subject_code,
      class_code,
      topic,
      lesson_summary,
      student_participation,
      challenges_faced,
      improvements_needed,
      next_lesson_preparation,
      lesson_date,
      actual_duration_minutes,
      attendance_count,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      data: lessonNote,
      message: 'Lesson note created successfully'
    });
  } catch (error) {
    console.error('Create lesson note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lesson note'
    });
  }
};

// Get lesson notes
const getLessonNotes = async (req, res) => {
  try {
    const { id: teacher_id, school_id, branch_id, user_type } = req.user;
    const {
      page = 1,
      limit = 10,
      status,
      subject_code,
      class_code,
      date_from,
      date_to,
      teacher_id: filterTeacherId
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters based on user role
    if (user_type === 'Teacher') {
      whereClause.teacher_id = teacher_id;
    } else {
      whereClause.school_id = school_id;
      whereClause.branch_id = branch_id;
      
      if (filterTeacherId) {
        whereClause.teacher_id = filterTeacherId;
      }
    }

    if (status) whereClause.status = status;
    if (subject_code) whereClause.subject_code = subject_code;
    if (class_code) whereClause.class_code = class_code;

    if (date_from || date_to) {
      whereClause.lesson_date = {};
      if (date_from) whereClause.lesson_date[Op.gte] = date_from;
      if (date_to) whereClause.lesson_date[Op.lte] = date_to;
    }

    const { count, rows } = await db.LessonNote.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.Staff,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.LessonPlan,
          as: 'lessonPlan',
          attributes: ['id', 'topic', 'status']
        }
      ],
      order: [['lesson_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get lesson notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson notes'
    });
  }
};

// Get single lesson note
const getLessonNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: teacher_id, user_type, school_id, branch_id } = req.user;

    const whereClause = { id };
    
    if (user_type === 'Teacher') {
      whereClause.teacher_id = teacher_id;
    } else {
      whereClause.school_id = school_id;
      whereClause.branch_id = branch_id;
    }

    const lessonNote = await db.LessonNote.findOne({
      where: whereClause,
      include: [
        {
          model: db.Staff,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.LessonPlan,
          as: 'lessonPlan',
          attributes: ['id', 'topic', 'objectives', 'content', 'status']
        }
      ]
    });

    if (!lessonNote) {
      return res.status(404).json({
        success: false,
        error: 'Lesson note not found'
      });
    }

    res.json({
      success: true,
      data: lessonNote
    });
  } catch (error) {
    console.error('Get lesson note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson note'
    });
  }
};

// Update lesson note
const updateLessonNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: teacher_id, user_type, school_id, branch_id } = req.user;
    const updateData = req.body;

    const whereClause = { id };
    
    if (user_type === 'Teacher') {
      whereClause.teacher_id = teacher_id;
      // Teachers can only update if status is draft
      whereClause.status = 'draft';
    } else {
      whereClause.school_id = school_id;
      whereClause.branch_id = branch_id;
    }

    const lessonNote = await db.LessonNote.findOne({ where: whereClause });

    if (!lessonNote) {
      return res.status(404).json({
        success: false,
        error: 'Lesson note not found or cannot be updated'
      });
    }

    await lessonNote.update(updateData);

    res.json({
      success: true,
      data: lessonNote,
      message: 'Lesson note updated successfully'
    });
  } catch (error) {
    console.error('Update lesson note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lesson note'
    });
  }
};

// Submit lesson note
const submitLessonNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: teacher_id } = req.user;

    const lessonNote = await db.LessonNote.findOne({
      where: {
        id,
        teacher_id,
        status: 'draft'
      }
    });

    if (!lessonNote) {
      return res.status(404).json({
        success: false,
        error: 'Lesson note not found or already submitted'
      });
    }

    await lessonNote.update({
      status: 'submitted',
      submission_date: new Date()
    });

    res.json({
      success: true,
      data: lessonNote,
      message: 'Lesson note submitted successfully'
    });
  } catch (error) {
    console.error('Submit lesson note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit lesson note'
    });
  }
};

// Admin review lesson note
const reviewLessonNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_feedback } = req.body;
    const { school_id, branch_id } = req.user;

    const lessonNote = await db.LessonNote.findOne({
      where: {
        id,
        school_id,
        branch_id,
        status: 'submitted'
      }
    });

    if (!lessonNote) {
      return res.status(404).json({
        success: false,
        error: 'Lesson note not found or not in submitted status'
      });
    }

    await lessonNote.update({
      status: 'reviewed',
      admin_feedback
    });

    res.json({
      success: true,
      data: lessonNote,
      message: 'Lesson note reviewed successfully'
    });
  } catch (error) {
    console.error('Review lesson note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review lesson note'
    });
  }
};

// Delete lesson note
const deleteLessonNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: teacher_id, user_type, school_id, branch_id } = req.user;

    const whereClause = { id };
    
    if (user_type === 'Teacher') {
      whereClause.teacher_id = teacher_id;
      whereClause.status = 'draft'; // Only allow deletion of drafts
    } else {
      whereClause.school_id = school_id;
      whereClause.branch_id = branch_id;
    }

    const lessonNote = await db.LessonNote.findOne({ where: whereClause });

    if (!lessonNote) {
      return res.status(404).json({
        success: false,
        error: 'Lesson note not found or cannot be deleted'
      });
    }

    await lessonNote.destroy();

    res.json({
      success: true,
      message: 'Lesson note deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lesson note'
    });
  }
};

// Get lesson note statistics
const getLessonNoteStats = async (req, res) => {
  try {
    const { school_id, branch_id, user_type, id: teacher_id } = req.user;
    const { date_from, date_to } = req.query;

    const whereClause = {};
    
    if (user_type === 'Teacher') {
      whereClause.teacher_id = teacher_id;
    } else {
      whereClause.school_id = school_id;
      whereClause.branch_id = branch_id;
    }

    if (date_from || date_to) {
      whereClause.lesson_date = {};
      if (date_from) whereClause.lesson_date[Op.gte] = date_from;
      if (date_to) whereClause.lesson_date[Op.lte] = date_to;
    }

    const stats = await db.LessonNote.findAll({
      where: whereClause,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const formattedStats = {
      total: 0,
      draft: 0,
      submitted: 0,
      reviewed: 0
    };

    stats.forEach(stat => {
      formattedStats[stat.status] = parseInt(stat.count);
      formattedStats.total += parseInt(stat.count);
    });

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Get lesson note stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson note statistics'
    });
  }
};

module.exports = {
  createLessonNote,
  getLessonNotes,
  getLessonNote,
  updateLessonNote,
  submitLessonNote,
  reviewLessonNote,
  deleteLessonNote,
  getLessonNoteStats
};
