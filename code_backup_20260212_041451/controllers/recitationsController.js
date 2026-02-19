const db = require('../models');
const localUploadService = require('../services/localUploadService');
const { Op } = require('sequelize');

// Create a new recitation (Teacher only)
const createRecitation = async (req, res) => {
  try {
    const { title, description, class_code, class_name, allow_replies, due_date } = req.body;
    
    const user_id = req.user.id;
    const is_admin = req.user.is_admin || ['Admin', 'admin', 'branchadmin'].includes(req.user.user_type);

    let teacher_id = null;

    // Try to get teacher_id from teachers table
    const teacher = await db.sequelize.query(
      `SELECT id FROM teachers WHERE user_id = :user_id LIMIT 1`,
      {
        replacements: { user_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (teacher && teacher.length > 0) {
      teacher_id = teacher[0].id;
    } else if (is_admin) {
      // For admins without teacher record, use user_id as teacher_id
      teacher_id = user_id;
      console.log('ℹ️ Admin user, using user_id as teacher_id:', teacher_id);
    } else {
      return res.status(403).json({
        success: false,
        error: 'Teacher record not found for this user'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    // Upload audio to local server
    const uploadResult = await localUploadService.uploadAudio(req.file.path);

    // Create recitation record
    const recitation = await db.Recitation.create({
      teacher_id,
      class_code,
      class_name,
      title,
      description,
      audio_url: uploadResult.secure_url,
      audio_public_id: uploadResult.public_id,
      audio_format: uploadResult.format,
      duration_seconds: uploadResult.duration,
      allow_replies: allow_replies !== undefined ? allow_replies : true,
      due_date: due_date ? new Date(due_date) : null
    });

    // Emit socket event to students in the class
    const io = req.app.get('io');
    if (io) {
      io.to(`class:${class_code}`).emit('recitation:new', {
        recitation_id: recitation.id,
        title: recitation.title,
        teacher_id: recitation.teacher_id,
        class_code: recitation.class_code,
        due_date: recitation.due_date
      });
    }

    res.status(201).json({
      success: true,
      data: recitation
    });
  } catch (error) {
    console.error('Create recitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create recitation'
    });
  }
};

// Get recitations with pagination and filters
const getRecitations = async (req, res) => {
  try {
    const { 
      class_code, 
      teacher_id, 
      page = 1, 
      limit = 10,
      search,
      status = 'all'
    } = req.query;

    console.log('🔍 User requesting recitations:', {
      user_type: req.user.user_type,
      admission_no: req.user.admission_no,
      id: req.user.id
    });

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (class_code) whereClause.class_code = class_code;
    if (teacher_id) whereClause.teacher_id = teacher_id;
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Date filters
    if (status === 'active') {
      whereClause[Op.or] = [
        { due_date: null },
        { due_date: { [Op.gte]: new Date() } }
      ];
    } else if (status === 'expired') {
      whereClause.due_date = { [Op.lt]: new Date() };
    }

    // Build reply filter for students
    const replyWhere = req.user.admission_no ? { admission_no: req.user.admission_no } : {};
    console.log('🔍 Reply filter:', replyWhere);
    console.log('🔍 User admission_no:', req.user.admission_no);

    const { count, rows } = await db.Recitation.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.Staff,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.RecitationReply,
          as: 'replies',
          attributes: ['id', 'admission_no', 'status', 'audio_url', 'created_at', 'allow_resubmit'],
          where: replyWhere,
          required: false,
          include: [
            {
              model: db.RecitationFeedback,
              as: 'feedback',
              attributes: ['grade', 'comment']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add reply statistics and student_reply for students
    const recitationsWithStats = rows.map(recitation => {
      console.log(`📊 Recitation ${recitation.id}: ${recitation.replies.length} replies`);
      if (recitation.replies.length > 0) {
        console.log('   Reply admission_nos:', recitation.replies.map(r => r.admission_no));
      }
      
      const replyStats = {
        total_replies: recitation.replies.length,
        submitted_replies: recitation.replies.filter(r => r.status === 'submitted').length,
        graded_replies: recitation.replies.filter(r => r.status === 'graded').length
      };

      return {
        ...recitation.toJSON(),
        reply_stats: replyStats,
        submission_count: recitation.replies.length,
        student_reply: recitation.replies.length > 0 ? recitation.replies[0] : null
      };
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json({
      success: true,
      data: recitationsWithStats,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get recitations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recitations'
    });
  }
};

// Get single recitation with details
const getRecitationById = async (req, res) => {
  try {
    const { id } = req.params;

    const recitation = await db.Recitation.findByPk(id, {
      include: [
        {
          model: db.Staff,
          as: 'teacher',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.RecitationReply,
          as: 'replies',
          include: [
            {
              model: db.Student,
              as: 'student',
              attributes: ['id', 'student_name', 'admission_no']
            },
            {
              model: db.RecitationFeedback,
              as: 'feedback'
            }
          ]
        }
      ]
    });

    if (!recitation) {
      return res.status(404).json({
        success: false,
        error: 'Recitation not found'
      });
    }

    res.json({
      success: true,
      data: recitation
    });
  } catch (error) {
    console.error('Get recitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recitation'
    });
  }
};

// Create a reply to recitation (Student only)
const createReply = async (req, res) => {
  try {
    const { id: recitation_id } = req.params;
    const admission_no = req.user.admission_no;
    const { transcript } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    // Check if recitation exists and allows replies
    const recitation = await db.Recitation.findByPk(recitation_id);
    if (!recitation) {
      return res.status(404).json({
        success: false,
        error: 'Recitation not found'
      });
    }

    if (!recitation.allow_replies) {
      return res.status(403).json({
        success: false,
        error: 'Replies are not allowed for this recitation'
      });
    }

    // Check if due date has passed
    if (recitation.due_date && new Date() > recitation.due_date) {
      return res.status(403).json({
        success: false,
        error: 'Due date has passed'
      });
    }

    // Check if student already replied
    const existingReply = await db.RecitationReply.findOne({
      where: { recitation_id, admission_no }
    });

    if (existingReply) {
      return res.status(409).json({
        success: false,
        error: 'You have already submitted a reply to this recitation'
      });
    }

    // Upload audio to local server
    const uploadResult = await localUploadService.uploadAudio(req.file.path);

    // Create reply record
    const reply = await db.RecitationReply.create({
      recitation_id,
      admission_no,
      audio_url: uploadResult.secure_url,
      audio_public_id: uploadResult.public_id,
      audio_format: uploadResult.format,
      duration_seconds: uploadResult.duration,
      transcript: transcript || null
    });

    // Emit socket event to teacher
    const io = req.app.get('io');
    if (io) {
      io.to(`teacher:${recitation.teacher_id}`).emit('recitation:reply', {
        reply_id: reply.id,
        recitation_id: recitation.id,
        admission_no: reply.admission_no,
        recitation_title: recitation.title
      });
    }

    res.status(201).json({
      success: true,
      data: reply
    });
  } catch (error) {
    console.error('Create reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reply'
    });
  }
};

// Get replies for a recitation (Teacher only)
const getReplies = async (req, res) => {
  try {
    const { id: recitation_id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { recitation_id };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await db.RecitationReply.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.Student,
          as: 'student',
          attributes: ['id', 'student_name', 'admission_no', 'class_code']
        },
        {
          model: db.RecitationFeedback,
          as: 'feedback',
          include: [
            {
              model: db.Staff,
              as: 'teacher',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
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
    console.error('Get replies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch replies'
    });
  }
};

// Submit feedback for a reply (Teacher only)
const submitFeedback = async (req, res) => {
  try {
    const { reply_id } = req.params;
    const { grade, comment } = req.body;
    const teacher_id = req.user.id;

    if (grade === undefined || grade < 0 || grade > 100) {
      return res.status(400).json({
        success: false,
        error: 'Grade must be between 0 and 100'
      });
    }

    // Check if reply exists
    const reply = await db.RecitationReply.findByPk(reply_id, {
      include: [
        {
          model: db.Recitation,
          as: 'recitation'
        },
        {
          model: db.Student,
          as: 'student',
          attributes: ['id', 'student_name']
        }
      ]
    });

    if (!reply) {
      return res.status(404).json({
        success: false,
        error: 'Reply not found'
      });
    }

    // Check if feedback already exists
    const existingFeedback = await db.RecitationFeedback.findOne({
      where: { reply_id }
    });

    let feedback;
    if (existingFeedback) {
      // Update existing feedback
      await existingFeedback.update({
        grade,
        comment: comment || null,
        teacher_id
      });
      feedback = existingFeedback;
    } else {
      // Create new feedback
      feedback = await db.RecitationFeedback.create({
        reply_id,
        teacher_id,
        grade,
        comment: comment || null
      });
    }

    // Update reply status to graded
    await reply.update({ status: 'graded' });

    // Emit socket event to student
    const io = req.app.get('io');
    if (io) {
      io.to(`student:${reply.admission_no}`).emit('recitation:graded', {
        reply_id: reply.id,
        recitation_id: reply.recitation.id,
        recitation_title: reply.recitation.title,
        grade: feedback.grade,
        has_comment: !!feedback.comment
      });
    }

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
};

// Submit reply (Student) - Alternative endpoint with recitation_id in body
const submitReply = async (req, res) => {
  try {
    const { recitation_id, admission_no, name } = req.body;

    if (!recitation_id) {
      return res.status(400).json({
        success: false,
        error: 'recitation_id is required'
      });
    }

    if (!admission_no) {
      return res.status(400).json({
        success: false,
        error: 'admission_no is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    // Check if recitation exists and allows replies
    const recitation = await db.Recitation.findByPk(recitation_id);
    if (!recitation) {
      return res.status(404).json({
        success: false,
        error: 'Recitation not found'
      });
    }

    if (!recitation.allow_replies) {
      return res.status(403).json({
        success: false,
        error: 'Replies are not allowed for this recitation'
      });
    }

    // Check if due date has passed
    if (recitation.due_date && new Date() > recitation.due_date) {
      return res.status(403).json({
        success: false,
        error: 'Due date has passed'
      });
    }

    // Check if student already replied
    const existingReply = await db.RecitationReply.findOne({
      where: { recitation_id, admission_no }
    });

    if (existingReply && !existingReply.allow_resubmit) {
      return res.status(409).json({
        success: false,
        error: 'You have already submitted a reply to this recitation'
      });
    }

    // Upload audio to local server
    const uploadResult = await localUploadService.uploadAudio(req.file.path);

    if (existingReply && existingReply.allow_resubmit) {
      // Update existing reply
      await existingReply.update({
        audio_url: uploadResult.secure_url,
        audio_public_id: uploadResult.public_id,
        audio_format: uploadResult.format,
        duration_seconds: uploadResult.duration,
        status: 'submitted',
        allow_resubmit: false
      });

      res.status(200).json({
        success: true,
        data: existingReply
      });
    } else {
      // Create new reply record
      const reply = await db.RecitationReply.create({
        recitation_id,
        admission_no,
        audio_url: uploadResult.secure_url,
        audio_public_id: uploadResult.public_id,
        audio_format: uploadResult.format,
        duration_seconds: uploadResult.duration
      });

      // Emit socket event to teacher
      const io = req.app.get('io');
      if (io) {
        io.to(`teacher:${recitation.teacher_id}`).emit('recitation:reply', {
          reply_id: reply.id,
          recitation_id: recitation.id,
          admission_no: admission_no,
          student_name: name,
          recitation_title: recitation.title
        });
      }

      res.status(201).json({
        success: true,
        data: reply
      });
    }
  } catch (error) {
    console.error('Submit reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit reply'
    });
  }
};

// Request student to repeat submission
const requestRepeat = async (req, res) => {
  try {
    const { reply_id } = req.params;

    const reply = await db.RecitationReply.findByPk(reply_id);
    if (!reply) {
      return res.status(404).json({
        success: false,
        error: 'Reply not found'
      });
    }

    await reply.update({ allow_resubmit: true });

    res.json({
      success: true,
      message: 'Student can now resubmit'
    });
  } catch (error) {
    console.error('Request repeat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request repeat'
    });
  }
};

module.exports = {
  createRecitation,
  getRecitations,
  getRecitationById,
  createReply,
  getReplies,
  submitFeedback,
  submitReply,
  requestRepeat
};
