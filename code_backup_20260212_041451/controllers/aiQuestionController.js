const aiQuestionService = require('../services/aiQuestionService');
const db = require('../models');
const { QueryTypes } = require('sequelize');

class AIQuestionController {
  // Generate questions from lesson plan or manual input
  async generateFromLessonPlan(req, res) {
    try {
      const { lesson_plan_id, manual_input, question_config } = req.body;
      const { id: teacher_id } = req.user;

      if (!lesson_plan_id && !manual_input) {
        return res.status(400).json({
          success: false,
          error: 'lesson_plan_id or manual_input is required'
        });
      }

      let lessonData;

      if (manual_input) {
        // Manual input mode
        lessonData = {
          title: `${manual_input.subject} - ${manual_input.class}`,
          subject_code: manual_input.subject,
          class_code: manual_input.class,
          objectives: manual_input.objectives,
          content: `Topics: ${manual_input.topics}\n\nContext: ${manual_input.context}`,
          activities: manual_input.topics
        };
      } else {
        // Lesson plan mode
        const lessonPlan = await db.sequelize.query(`
          SELECT 
            id, title, subject_code, class_code, 
            objectives, content, activities, resources,
            syllabus_topics, curriculum_alignment_percentage
          FROM lesson_plans 
          WHERE id = :lesson_plan_id AND teacher_id = :teacher_id
        `, {
          replacements: { lesson_plan_id, teacher_id },
          type: QueryTypes.SELECT
        });

        if (!lessonPlan.length) {
          return res.status(404).json({
            success: false,
            error: 'Lesson plan not found or access denied'
          });
        }

        lessonData = lessonPlan[0];
      }

      // Default question configuration
      const config = {
        questionTypes: ['multiple_choice', 'short_answer'],
        difficulty: 'medium',
        count: 10,
        model: 'auto',
        ...question_config
      };

      // Generate questions using AI
      const generatedQuestions = await aiQuestionService.generateQuestions(lessonData, config);

      // Save generation record (only for lesson plan mode)
      if (lesson_plan_id) {
        await db.sequelize.query(`
          INSERT INTO ai_question_generations (
            lesson_plan_id, teacher_id, question_config, 
            generated_questions, ai_model_used, created_at
          ) VALUES (
            :lesson_plan_id, :teacher_id, :question_config,
            :generated_questions, :ai_model_used, NOW()
          )
        `, {
          replacements: {
            lesson_plan_id,
            teacher_id,
            question_config: JSON.stringify(config),
            generated_questions: JSON.stringify(generatedQuestions),
            ai_model_used: generatedQuestions.generated_by
          }
        });
      }

      res.json({
        success: true,
        data: {
          lesson_plan: {
            id: lessonData.id || 'manual',
            title: lessonData.title,
            subject_code: lessonData.subject_code,
            class_code: lessonData.class_code
          },
          questions: generatedQuestions.questions,
          metadata: {
            total_marks: generatedQuestions.total_marks,
            estimated_time: generatedQuestions.estimated_time,
            generated_by: generatedQuestions.generated_by,
            generated_at: generatedQuestions.generated_at,
            question_count: generatedQuestions.questions.length,
            input_mode: manual_input ? 'manual' : 'lesson_plan'
          }
        }
      });

    } catch (error) {
      console.error('Generate questions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate questions'
      });
    }
  }

  // Get teacher's lesson plans for question generation
  async getTeacherLessonPlans(req, res) {
    try {
      const { subject_code, class_code } = req.query;
      const { id: teacher_id } = req.user;

      let whereClause = 'WHERE teacher_id = :teacher_id';
      const replacements = { teacher_id };

      if (subject_code) {
        whereClause += ' AND subject_code = :subject_code';
        replacements.subject_code = subject_code;
      }

      if (class_code) {
        whereClause += ' AND class_code = :class_code';
        replacements.class_code = class_code;
      }

      const lessonPlans = await db.sequelize.query(`
        SELECT 
          id, title, subject_code, class_code, lesson_date,
          objectives, curriculum_alignment_percentage,
          syllabus_topics, created_at,
          CASE 
            WHEN objectives IS NOT NULL AND content IS NOT NULL THEN 'complete'
            WHEN objectives IS NOT NULL OR content IS NOT NULL THEN 'partial'
            ELSE 'minimal'
          END as content_quality
        FROM lesson_plans 
        ${whereClause}
        ORDER BY lesson_date DESC, created_at DESC
        LIMIT 50
      `, {
        replacements,
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: lessonPlans
      });

    } catch (error) {
      console.error('Get lesson plans error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch lesson plans'
      });
    }
  }

  // Get available AI models
  async getAvailableModels(req, res) {
    try {
      const models = aiQuestionService.getAvailableModels();
      
      res.json({
        success: true,
        data: {
          models,
          default_priority: ['gemini', 'openai']
        }
      });

    } catch (error) {
      console.error('Get models error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available models'
      });
    }
  }

  // Get generation history
  async getGenerationHistory(req, res) {
    try {
      const { id: teacher_id } = req.user;
      const { limit = 20 } = req.query;

      const history = await db.sequelize.query(`
        SELECT 
          g.id, g.lesson_plan_id, g.ai_model_used, g.created_at,
          l.title as lesson_title, l.subject_code, l.class_code,
          JSON_LENGTH(g.generated_questions, '$.questions') as question_count
        FROM ai_question_generations g
        JOIN lesson_plans l ON g.lesson_plan_id = l.id
        WHERE g.teacher_id = :teacher_id
        ORDER BY g.created_at DESC
        LIMIT :limit
      `, {
        replacements: { teacher_id, limit: parseInt(limit) },
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch generation history'
      });
    }
  }
}

module.exports = new AIQuestionController();
