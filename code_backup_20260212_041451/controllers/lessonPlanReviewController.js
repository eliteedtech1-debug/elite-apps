const { sequelize } = require('../models');
const { LessonPlan, LessonPlanReview } = require('../models');
const { REVIEW_STATUS, VALID_REVIEW_STATUSES } = require('../constants/lessonPlanStatus');

// Authorize review - only admin/branchadmin
const authorizeReview = (req, res, next) => {
  const userRole = req.user?.role || req.headers['x-user-type'];
  if (!['admin', 'branchadmin'].includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Only admins can review lesson plans' 
    });
  }
  next();
};

// Validate review input
const validateReviewInput = (status, remark) => {
  const errors = [];
  
  if (!VALID_REVIEW_STATUSES.includes(status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`);
  }
  
  if (!remark || remark.trim().length === 0) {
    errors.push('Remark is required');
  }
  
  if (remark && remark.length > 500) {
    errors.push('Remark must be 500 characters or less');
  }
  
  return errors;
};

// Review lesson plan with audit trail
const reviewLessonPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const reviewedBy = req.user?.id;

    // Validate input
    const errors = validateReviewInput(status, remarks);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    // Check lesson plan exists
    const lessonPlan = await LessonPlan.findByPk(id);
    if (!lessonPlan) {
      return res.status(404).json({ success: false, message: 'Lesson plan not found' });
    }

    // Check if already reviewed
    if (lessonPlan.status !== 'submitted') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot review lesson plan with status: ${lessonPlan.status}` 
      });
    }

    // Atomic transaction: update lesson plan + create audit log
    await sequelize.transaction(async (t) => {
      // Update lesson plan status
      await LessonPlan.update(
        { 
          status: status
        },
        { 
          where: { id },
          transaction: t
        }
      );

      // Create audit log entry
      await LessonPlanReview.create(
        {
          lesson_plan_id: id,
          reviewed_by: reviewedBy,
          status: status,
          remark: remarks.trim()
        },
        { transaction: t }
      );
    });

    res.json({ 
      success: true, 
      message: `Lesson plan ${status} successfully`,
      data: { id, status, reviewed_at: new Date() }
    });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to review lesson plan',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get review history for a lesson plan
const getReviewHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await LessonPlanReview.findAll({
      where: { lesson_plan_id: id },
      attributes: ['id', 'status', 'remark', 'reviewed_at', 'reviewed_by'],
      include: [
        {
          association: 'reviewer',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['reviewed_at', 'DESC']]
    });

    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error('Get review history error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch review history' });
  }
};

module.exports = {
  authorizeReview,
  reviewLessonPlan,
  getReviewHistory,
  validateReviewInput
};
