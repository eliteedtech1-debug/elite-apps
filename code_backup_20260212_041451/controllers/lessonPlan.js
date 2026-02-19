const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const lessonPlanController = {
  // Get lesson plans for a teacher
  async getTeacherLessonPlans(req, res) {
    try {
      const { teacher_id } = req.query;
      const school_id = req.headers['x-school-id'];

      const lessonPlans = await sequelize.query(`
        SELECT 
          lp.*,
          s.subject as subject_name,
          c.class_name
        FROM lesson_plans lp
        LEFT JOIN subjects s ON lp.subject_code = s.subject_code
          AND s.school_id = :school_id
        LEFT JOIN classes c ON lp.class_code = c.class_code
          AND c.school_id = :school_id
        WHERE lp.teacher_id = :teacher_id
        AND lp.school_id = :school_id
        ORDER BY lp.lesson_date DESC
      `, {
        replacements: { teacher_id, school_id },
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: lessonPlans
      });
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch lesson plans'
      });
    }
  },

  // Create a new lesson plan
  async createLessonPlan(req, res) {
    try {
      const {
        teacher_id,
        school_id,
        branch_id,
        subject_code,
        class_code,
        syllabus_topic_id,
        lesson_title,
        lesson_date,
        objectives,
        content,
        materials
      } = req.body;

      const result = await sequelize.query(`
        INSERT INTO lesson_plans (
          teacher_id, school_id, branch_id, subject_code, class_code,
          syllabus_topic_id, lesson_title, lesson_date, objectives,
          content, materials, status, created_at
        ) VALUES (
          :teacher_id, :school_id, :branch_id, :subject_code, :class_code,
          :syllabus_topic_id, :lesson_title, :lesson_date, :objectives,
          :content, :materials, 'Draft', NOW()
        )
      `, {
        replacements: {
          teacher_id, school_id, branch_id, subject_code, class_code,
          syllabus_topic_id, lesson_title, lesson_date, objectives,
          content, materials
        },
        type: QueryTypes.INSERT
      });

      res.json({
        success: true,
        data: { id: result[0], message: 'Lesson plan created successfully' }
      });
    } catch (error) {
      console.error('Error creating lesson plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create lesson plan'
      });
    }
  }
};

module.exports = lessonPlanController;
