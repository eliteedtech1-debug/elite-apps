const db = require('../models');
const { Op } = require('sequelize');

// Create lesson plan
const createLessonPlan = async (req, res) => {
  try {
    const {
      title,
      subject_code,
      class_code,
      lesson_date,
      duration_minutes,
      objectives,
      activities,
      status
    } = req.body;

    const { id: teacher_id, school_id, branch_id } = req.user;

    const lessonPlan = await db.LessonPlan.create({
      title,
      teacher_id,
      school_id,
      branch_id,
      subject_code,
      class_code,
      lesson_date,
      duration_minutes: duration_minutes || 40,
      objectives,
      activities,
      status: status || 'draft'
    });

    res.status(201).json({
      success: true,
      data: lessonPlan,
      message: 'Lesson plan created successfully'
    });
  } catch (error) {
    console.error('Create lesson plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lesson plan'
    });
  }
};

// Get lesson plans
const getLessonPlans = async (req, res) => {
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

    const { count, rows } = await db.LessonPlan.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.Staff,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
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
    console.error('Get lesson plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson plans'
    });
  }
};

// Get single lesson plan
const getLessonPlan = async (req, res) => {
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

    const lessonPlan = await db.LessonPlan.findOne({
      where: whereClause,
      include: [
        {
          model: db.Staff,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.LessonNote,
          as: 'notes',
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        error: 'Lesson plan not found'
      });
    }

    res.json({
      success: true,
      data: lessonPlan
    });
  } catch (error) {
    console.error('Get lesson plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson plan'
    });
  }
};

// Update lesson plan
const updateLessonPlan = async (req, res) => {
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

    const lessonPlan = await db.LessonPlan.findOne({ where: whereClause });

    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        error: 'Lesson plan not found or cannot be updated'
      });
    }

    await lessonPlan.update(updateData);

    res.json({
      success: true,
      data: lessonPlan,
      message: 'Lesson plan updated successfully'
    });
  } catch (error) {
    console.error('Update lesson plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lesson plan'
    });
  }
};

// Submit lesson plan
const submitLessonPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: teacher_id } = req.user;

    const lessonPlan = await db.LessonPlan.findOne({
      where: {
        id,
        teacher_id,
        status: 'draft'
      }
    });

    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        error: 'Lesson plan not found or already submitted'
      });
    }

    await lessonPlan.update({
      status: 'submitted',
      submission_date: new Date()
    });

    res.json({
      success: true,
      data: lessonPlan,
      message: 'Lesson plan submitted successfully'
    });
  } catch (error) {
    console.error('Submit lesson plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit lesson plan'
    });
  }
};

// Admin approve/reject lesson plan
const reviewLessonPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_feedback } = req.body;
    const { school_id, branch_id } = req.user;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be approved or rejected'
      });
    }

    const lessonPlan = await db.LessonPlan.findOne({
      where: {
        id,
        school_id,
        branch_id,
        status: 'submitted'
      }
    });

    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        error: 'Lesson plan not found or not in submitted status'
      });
    }

    await lessonPlan.update({
      status,
      admin_feedback
    });

    res.json({
      success: true,
      data: lessonPlan,
      message: `Lesson plan ${status} successfully`
    });
  } catch (error) {
    console.error('Review lesson plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review lesson plan'
    });
  }
};

// Delete lesson plan
const deleteLessonPlan = async (req, res) => {
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

    const lessonPlan = await db.LessonPlan.findOne({ where: whereClause });

    if (!lessonPlan) {
      return res.status(404).json({
        success: false,
        error: 'Lesson plan not found or cannot be deleted'
      });
    }

    await lessonPlan.destroy();

    res.json({
      success: true,
      message: 'Lesson plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lesson plan'
    });
  }
};

// Get lesson plan statistics
const getLessonPlanStats = async (req, res) => {
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

    const stats = await db.LessonPlan.findAll({
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
      approved: 0,
      rejected: 0
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
    console.error('Get lesson plan stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson plan statistics'
    });
  }
};

module.exports = {
  createLessonPlan,
  getLessonPlans,
  getLessonPlan,
  updateLessonPlan,
  submitLessonPlan,
  reviewLessonPlan,
  deleteLessonPlan,
  getLessonPlanStats
};
