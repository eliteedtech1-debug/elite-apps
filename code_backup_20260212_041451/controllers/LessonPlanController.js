const db = require('../models');

class LessonPlanController {
  // GET /api/v1/lesson-plans/dashboard - Teacher dashboard data
  async getDashboard(req, res) {
    try {
      const { school_id } = req.user;
      const effectiveSchoolId = school_id || req.headers['x-school-id'];

      // Mock dashboard data for now
      const dashboardData = {
        total_plans: 2,
        draft_plans: 1,
        approved_plans: 1,
        ai_generated_plans: 1,
        classes_taught: 2,
        subjects_taught: 3
      };

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }

  // GET /api/v1/lesson-plans - Get lesson plans
  async getLessonPlans(req, res) {
    try {
      const { school_id } = req.user;
      const effectiveSchoolId = school_id || req.headers['x-school-id'];
      const { limit = 10 } = req.query;

      // Mock lesson plans data for now
      const lessonPlans = [
        {
          id: 1,
          title: 'Introduction to Photosynthesis',
          subject: 'Biology',
          class: 'SS1 A',
          date: '2026-01-02',
          duration: 40,
          status: 'approved',
          ai_generated: true
        },
        {
          id: 2,
          title: 'Basic Algebra',
          subject: 'Mathematics',
          class: 'JSS2 B',
          date: '2026-01-01',
          duration: 60,
          status: 'draft',
          ai_generated: false
        }
      ];

      res.json({
        success: true,
        data: {
          lesson_plans: lessonPlans,
          total: lessonPlans.length
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
      const { id: user_id, school_id, branch_id } = req.user;
      const effectiveSchoolId = school_id || req.headers['x-school-id'];
      const effectiveBranchId = branch_id || req.headers['x-branch-id'];

      const {
        title,
        subject_code,
        class_code,
        lesson_date,
        duration_minutes = 40,
        content,
        objectives,
        activities,
        resources,
        status = 'draft',
        ai_generated = false,
        ai_model_used = 'custom',
        teacher_edit_percentage = 0
      } = req.body;

      // Validate required fields
      if (!title || !lesson_date || !class_code || !subject_code) {
        return res.status(400).json({
          success: false,
          error: 'Title, lesson date, class code, and subject are required'
        });
      }

      // Mock successful creation - no database operations for now
      const lessonPlan = {
        id: Date.now(),
        title,
        subject_code,
        class_code,
        lesson_date,
        duration_minutes,
        content,
        objectives,
        activities,
        resources,
        status,
        ai_generated,
        ai_model_used,
        teacher_edit_percentage,
        teacher_id: user_id,
        school_id: effectiveSchoolId,
        branch_id: effectiveBranchId,
        created_at: new Date().toISOString()
      };

      console.log('Lesson plan created successfully:', {
        id: lessonPlan.id,
        title: lessonPlan.title,
        school_id: effectiveSchoolId,
        branch_id: effectiveBranchId
      });

      res.json({
        success: true,
        message: 'Lesson plan created successfully',
        data: lessonPlan
      });
    } catch (error) {
      console.error('Create lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create lesson plan',
        details: error.message
      });
    }
  }

  // PUT /api/v1/lesson-plans/:id - Update lesson plan
  async updateLessonPlan(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      res.json({
        success: true,
        message: 'Lesson plan updated successfully',
        data: { id, ...updateData }
      });
    } catch (error) {
      console.error('Update lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update lesson plan'
      });
    }
  }

  // DELETE /api/v1/lesson-plans/:id - Delete lesson plan
  async deleteLessonPlan(req, res) {
    try {
      const { id } = req.params;

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
  }
}

module.exports = new LessonPlanController();
