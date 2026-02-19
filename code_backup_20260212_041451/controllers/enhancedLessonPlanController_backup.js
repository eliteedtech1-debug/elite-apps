const db = require('../models');
const { Op } = require('sequelize');

class EnhancedLessonPlanController {
  // GET /api/v1/lesson-plans - Get teacher's lesson plans
  async getLessonPlans(req, res) {
    try {
      const { id: teacher_id, school_id } = req.user;
      const { status, class_code, subject, date_from, date_to, page = 1, limit = 20 } = req.query;
      
      const whereClause = { 
        teacher_id, 
        school_id 
      };
      
      if (status) whereClause.status = status;
      if (class_code) whereClause.class_code = class_code;
      if (subject) whereClause.subject = subject;
      if (date_from && date_to) {
        whereClause.lesson_date = {
          [Op.between]: [date_from, date_to]
        };
      }
      
      const offset = (page - 1) * limit;
      
      const { count, rows: lessonPlans } = await db.sequelize.query(`
        SELECT 
          st.*,
          s.title as syllabus_title,
          s.content as syllabus_content,
          t.name as teacher_name,
          tr.name as reviewer_name
        FROM syllabus_tracker st
        LEFT JOIN syllabus s ON st.syllabus_id = s.id
        LEFT JOIN teachers t ON st.teacher_id = t.id
        LEFT JOIN teachers tr ON st.reviewed_by = tr.id
        WHERE st.teacher_id = :teacher_id 
        AND st.school_id = :school_id
        ${status ? 'AND st.status = :status' : ''}
        ${class_code ? 'AND st.class_code = :class_code' : ''}
        ${subject ? 'AND st.subject = :subject' : ''}
        ORDER BY st.lesson_date DESC, st.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { 
          teacher_id, 
          school_id, 
          status, 
          class_code, 
          subject, 
          limit: parseInt(limit), 
          offset 
        },
        type: db.Sequelize.QueryTypes.SELECT
      });
      
      res.json({
        success: true,
        data: {
          lesson_plans: lessonPlans,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(count / limit),
            total_records: count,
            per_page: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get lesson plans error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve lesson plans'
      });
    }
  }
  
  // POST /api/v1/lesson-plans - Create lesson plan
  async createLessonPlan(req, res) {
    try {
      const { id: teacher_id, school_id, branch_id } = req.user;
      const { 
        title, 
        subject_code,
        class_code,
        lesson_date, 
        duration_minutes,
        objectives, 
        content,
        activities, 
        resources,
        status,
        ai_generated,
        ai_model_used,
        teacher_edit_percentage
      } = req.body;
      
      // Validate required fields
      if (!title || !lesson_date || !class_code || !subject_code) {
        return res.status(400).json({
          success: false,
          error: 'Title, lesson date, class code, and subject are required'
        });
      }
      
      const lessonPlan = await db.sequelize.query(`
        INSERT INTO lesson_plans (
          title, subject_code, class_code, teacher_id, lesson_date, 
          duration_minutes, objectives, content, activities, resources,
          status, school_id, branch_id, ai_generated, ai_model_used,
          teacher_edit_percentage, created_at, updated_at
        ) VALUES (
          :title, :subject_code, :class_code, :teacher_id, :lesson_date,
          :duration_minutes, :objectives, :content, :activities, :resources,
          :status, :school_id, :branch_id, :ai_generated, :ai_model_used,
          :teacher_edit_percentage, NOW(), NOW()
        )
      `, {
        replacements: {
          title,
          subject_code,
          class_code,
          teacher_id,
          lesson_date,
          duration_minutes: duration_minutes || 40,
          objectives: objectives || '',
          content: content || '',
          activities: activities || '',
          resources: resources || '',
          status: status || 'draft',
          school_id,
          branch_id,
          ai_generated: ai_generated || false,
          ai_model_used: ai_model_used || null,
          teacher_edit_percentage: teacher_edit_percentage || 0
        },
        type: db.Sequelize.QueryTypes.INSERT
      });

      res.status(201).json({
        success: true,
        message: 'Lesson plan created successfully',
        data: { id: lessonPlan[0] }
      });

    } catch (error) {
      console.error('Create lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create lesson plan'
      });
    }
  }

  // PUT /api/v1/lesson-plans/:id - Update lesson plan
  async updateLessonPlan(req, res) {
    try {
      res.json({ success: true, message: 'Update not implemented yet' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Update failed' });
    }
  }

  // POST /api/v1/lesson-plans/:id/submit - Submit for review
  async submitForReview(req, res) {
    try {
      res.json({ success: true, message: 'Submit not implemented yet' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Submit failed' });
    }
  }

  // GET /api/v1/lesson-plans/dashboard - Teacher dashboard data
  async getDashboardData(req, res) {
    try {
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Dashboard failed' });
    }
  }
  
  // PUT /api/v1/lesson-plans/:id - Update lesson plan
  async updateLessonPlan(req, res) {
    try {
      const { id } = req.params;
      const { id: teacher_id } = req.user;
      const updateFields = req.body;
      
      // Build SET clause dynamically
      const allowedFields = [
        'title', 'lesson_date', 'objectives', 'lesson_content', 
        'activities', 'resources', 'status'
      ];
      
      const setClause = [];
      const replacements = { id, teacher_id };
      
      Object.keys(updateFields).forEach(field => {
        if (allowedFields.includes(field)) {
          setClause.push(`${field} = :${field}`);
          replacements[field] = updateFields[field];
        }
      });
      
      if (setClause.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }
      
      const [affectedRows] = await db.sequelize.query(`
        UPDATE syllabus_tracker 
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = :id AND teacher_id = :teacher_id
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.UPDATE
      });
      
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Lesson plan not found or access denied'
        });
      }
      
      res.json({
        success: true,
        message: 'Lesson plan updated successfully'
      });
    } catch (error) {
      console.error('Update lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update lesson plan'
      });
    }
  }
  
  // POST /api/v1/lesson-plans/:id/submit - Submit for review
  async submitForReview(req, res) {
    try {
      const { id } = req.params;
      const { id: teacher_id } = req.user;
      
      const [affectedRows] = await db.sequelize.query(`
        UPDATE syllabus_tracker 
        SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
        WHERE id = :id AND teacher_id = :teacher_id AND status = 'draft'
      `, {
        replacements: { id, teacher_id },
        type: db.Sequelize.QueryTypes.UPDATE
      });
      
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Lesson plan not found or cannot be submitted'
        });
      }
      
      res.json({
        success: true,
        message: 'Lesson plan submitted for review'
      });
    } catch (error) {
      console.error('Submit lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit lesson plan'
      });
    }
  }
  
  // GET /api/v1/lesson-plans/dashboard - Teacher dashboard data
  async getDashboardData(req, res) {
    try {
      const { id: teacher_id, school_id } = req.user;
      
      const dashboardData = await db.sequelize.query(`
        SELECT 
          COUNT(*) as total_plans,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_plans,
          COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_plans,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_plans,
          COUNT(CASE WHEN ai_generated = 1 THEN 1 END) as ai_generated_plans,
          COUNT(DISTINCT class_code) as classes_taught,
          COUNT(DISTINCT subject) as subjects_taught
        FROM syllabus_tracker 
        WHERE teacher_id = :teacher_id AND school_id = :school_id
      `, {
        replacements: { teacher_id, school_id },
        type: db.Sequelize.QueryTypes.SELECT
      });
      
      res.json({
        success: true,
        data: dashboardData[0]
      });
    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }
}

module.exports = new EnhancedLessonPlanController();
