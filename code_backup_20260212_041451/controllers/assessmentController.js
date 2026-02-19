const db = require('../models');
const aiService = require('../services/aiQuestionService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class AssessmentController {
  // POST /api/v1/assessments/generate-draft - Generate assessment as draft for moderation
  async generateAssessmentDraft(req, res) {
    try {
      const teacher_id = req.user?.id;
      const school_id = req.user?.school_id || req.headers['x-school-id'];
      const branch_id = req.user?.branch_id || req.headers['x-branch-id'];
      const {
        lesson_plan_id,
        ca_setup_id,
        question_types = ['multiple_choice', 'short_answer', 'essay', 'fill_in_blank'],
        question_count = 10,
        difficulty_level = 'medium',
        assessment_title,
        subject_code,
        class_code,
        custom_topic,
        ai_model = 'auto'
      } = req.body;

      let lessonPlan = {
        title: custom_topic || lesson_plan_id || assessment_title || 'Assessment',
        subject_code: subject_code || 'General',
        class_code: class_code || 'All',
        objectives: '',
        content: ''
      };

      // Try to get lesson plan from database if numeric ID
      if (lesson_plan_id && !isNaN(lesson_plan_id)) {
        const [dbPlan] = await db.sequelize.query(`
          SELECT * FROM syllabus_tracker WHERE id = :lesson_plan_id LIMIT 1
        `, {
          replacements: { lesson_plan_id },
          type: db.Sequelize.QueryTypes.SELECT
        }).catch(() => [null]);

        if (dbPlan) {
          lessonPlan = {
            title: dbPlan.title || lessonPlan.title,
            subject_code: dbPlan.subject_code || subject_code,
            class_code: dbPlan.class_code || class_code,
            objectives: dbPlan.objectives || '',
            content: dbPlan.lesson_content || dbPlan.activities || ''
          };
        }
      }

      // If custom topic provided, use it as content
      if (custom_topic || (typeof lesson_plan_id === 'string' && isNaN(lesson_plan_id))) {
        lessonPlan.title = custom_topic || lesson_plan_id;
        lessonPlan.content = `Topic: ${custom_topic || lesson_plan_id}`;
      }

      // Generate questions using AI
      const aiAssessment = await aiService.generateQuestions(lessonPlan, {
        questionTypes: question_types,
        difficulty: difficulty_level,
        count: question_count,
        model: ai_model
      });

      res.status(201).json({
        success: true,
        data: {
          assessment: {
            title: lessonPlan.title,
            ca_type: ca_setup_id,
            subject_code: lessonPlan.subject_code,
            class_code: lessonPlan.class_code,
            ...aiAssessment
          },
          status: 'Draft',
          message: 'AI-generated questions ready for review.'
        },
        message: 'Assessment draft generated successfully'
      });
    } catch (error) {
      console.error('Generate assessment draft error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate assessment draft'
      });
    }
  }

  // POST /api/v1/assessments/submit-for-moderation - Submit draft for moderation
  async submitForModeration(req, res) {
    try {
      const { id: teacher_id } = req.user;
      const { submission_id, comments } = req.body;

      const [affectedRows] = await db.sequelize.query(`
        UPDATE ca_question_submissions 
        SET status = 'Submitted', 
            submission_date = NOW(),
            comments = :comments,
            updated_at = NOW()
        WHERE id = :submission_id AND teacher_id = :teacher_id AND status = 'Draft'
      `, {
        replacements: { submission_id, teacher_id, comments },
        type: db.Sequelize.QueryTypes.UPDATE
      });

      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Draft submission not found or already submitted'
        });
      }

      res.json({
        success: true,
        message: 'Questions submitted for moderation successfully'
      });
    } catch (error) {
      console.error('Submit for moderation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit for moderation'
      });
    }
  }

  // GET /api/v1/assessments/my-submissions - Get teacher's question submissions
  async getMySubmissions(req, res) {
    try {
      const teacher_id = req.user?.id;
      const school_id = req.user?.school_id || req.headers['x-school-id'];
      const { status, academic_year, term } = req.query;

      // Check if table exists
      const [tables] = await db.sequelize.query(
        "SHOW TABLES LIKE 'ca_question_submissions'"
      );
      
      if (!tables || tables.length === 0) {
        return res.json({ success: true, data: [] });
      }

      let whereClause = 'WHERE cqs.teacher_id = :teacher_id AND cqs.school_id = :school_id';
      const replacements = { teacher_id, school_id };

      if (status) {
        whereClause += ' AND cqs.status = :status';
        replacements.status = status;
      }
      if (academic_year) {
        whereClause += ' AND cas.academic_year = :academic_year';
        replacements.academic_year = academic_year;
      }
      if (term) {
        whereClause += ' AND cas.term = :term';
        replacements.term = term;
      }

      const submissions = await db.sequelize.query(`
        SELECT 
          cqs.id, cqs.submission_code, cqs.status, cqs.ai_generated,
          cqs.created_at, cqs.submission_date, cqs.comments,
          cas.ca_type, cas.week_number, cas.max_score,
          cqs.subject_code, cqs.class_code, cqs.total_marks
        FROM ca_question_submissions cqs
        LEFT JOIN ca_setups cas ON cqs.ca_setup_id = cas.id
        ${whereClause}
        ORDER BY cqs.created_at DESC
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: submissions
      });
    } catch (error) {
      console.error('Get submissions error:', error);
      res.json({
        success: true,
        data: []
      });
    }
  }

  async generateAssessmentQuestions(req, res) {
    try {
      const { id: teacher_id, school_id, branch_id } = req.user;
      const {
        lesson_plan_id,
        question_types = ['multiple_choice', 'short_answer'],
        question_count = 10,
        difficulty_level = 'primary',
        assessment_title
      } = req.body;

      // Get lesson plan content
      const lessonPlan = await db.sequelize.query(`
        SELECT lp.*, s.title as syllabus_title, s.content as syllabus_content
        FROM syllabus_tracker lp
        LEFT JOIN syllabus s ON lp.syllabus_id = s.id
        WHERE lp.id = :lesson_plan_id AND lp.teacher_id = :teacher_id
      `, {
        replacements: { lesson_plan_id, teacher_id },
        type: db.Sequelize.QueryTypes.SELECT
      });

      if (lessonPlan.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Lesson plan not found'
        });
      }

      const plan = lessonPlan[0];
      const contentForAI = `
        Title: ${plan.title}
        Content: ${plan.lesson_content}
        Objectives: ${plan.objectives}
        Activities: ${plan.activities}
        Syllabus Content: ${plan.syllabus_content}
      `;

      // Generate assessment using AI
      const aiAssessment = await assessmentGeneratorAI.generateAssessment(contentForAI, {
        questionTypes: question_types,
        difficulty: difficulty_level,
        questionCount: question_count,
        subject: plan.subject,
        classLevel: plan.class_code
      });

      // Save assessment to database
      const [insertResult] = await db.sequelize.query(`
        INSERT INTO assessments (
          teacher_id, lesson_plan_id, title, instructions, 
          questions, total_marks, time_limit, question_types,
          difficulty_level, ai_generated, school_id, branch_id,
          status, created_at
        ) VALUES (
          :teacher_id, :lesson_plan_id, :title, :instructions,
          :questions, :total_marks, :time_limit, :question_types,
          :difficulty_level, true, :school_id, :branch_id,
          'draft', NOW()
        )
      `, {
        replacements: {
          teacher_id,
          lesson_plan_id,
          title: assessment_title || aiAssessment.assessment_title,
          instructions: aiAssessment.instructions,
          questions: JSON.stringify(aiAssessment.questions),
          total_marks: aiAssessment.total_marks,
          time_limit: aiAssessment.time_limit,
          question_types: JSON.stringify(question_types),
          difficulty_level,
          school_id,
          branch_id
        },
        type: db.Sequelize.QueryTypes.INSERT
      });

      res.status(201).json({
        success: true,
        data: {
          assessment_id: insertResult,
          assessment: aiAssessment,
          lesson_plan: {
            id: plan.id,
            title: plan.title,
            subject: plan.subject,
            class_code: plan.class_code
          }
        },
        message: 'Assessment generated successfully'
      });
    } catch (error) {
      console.error('Generate assessment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate assessment'
      });
    }
  }

  // GET /api/v1/assessments - Get teacher's assessments
  async getAssessments(req, res) {
    try {
      const { id: teacher_id, school_id } = req.user;
      const { status, subject, page = 1, limit = 20 } = req.query;

      let whereClause = 'WHERE a.teacher_id = :teacher_id AND a.school_id = :school_id';
      const replacements = { teacher_id, school_id };

      if (status) {
        whereClause += ' AND a.status = :status';
        replacements.status = status;
      }

      if (subject) {
        whereClause += ' AND lp.subject = :subject';
        replacements.subject = subject;
      }

      const offset = (page - 1) * limit;
      replacements.limit = parseInt(limit);
      replacements.offset = offset;

      const assessments = await db.sequelize.query(`
        SELECT 
          a.id, a.title, a.total_marks, a.time_limit, a.status,
          a.ai_generated, a.created_at, a.question_types,
          lp.title as lesson_title, lp.subject, lp.class_code
        FROM assessments a
        LEFT JOIN syllabus_tracker lp ON a.lesson_plan_id = lp.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: assessments,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get assessments error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve assessments'
      });
    }
  }

  // GET /api/v1/assessments/:id/export - Export assessment as PDF
  async exportAssessment(req, res) {
    try {
      const { id } = req.params;
      const { id: teacher_id } = req.user;
      const { format = 'pdf' } = req.query;

      // Get assessment data
      const assessment = await db.sequelize.query(`
        SELECT a.*, lp.title as lesson_title, lp.subject, lp.class_code
        FROM assessments a
        LEFT JOIN syllabus_tracker lp ON a.lesson_plan_id = lp.id
        WHERE a.id = :id AND a.teacher_id = :teacher_id
      `, {
        replacements: { id, teacher_id },
        type: db.Sequelize.QueryTypes.SELECT
      });

      if (assessment.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Assessment not found'
        });
      }

      const assessmentData = assessment[0];
      const questions = JSON.parse(assessmentData.questions);

      if (format === 'pdf') {
        // Generate PDF
        const doc = new PDFDocument();
        const filename = `assessment_${id}_${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '../temp', filename);

        // Ensure temp directory exists
        const tempDir = path.dirname(filepath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        doc.pipe(fs.createWriteStream(filepath));

        // PDF Content
        doc.fontSize(16).text(assessmentData.title, { align: 'center' });
        doc.fontSize(12).text(`Subject: ${assessmentData.subject} | Class: ${assessmentData.class_code}`);
        doc.text(`Time: ${assessmentData.time_limit} minutes | Total Marks: ${assessmentData.total_marks}`);
        doc.text(`Instructions: ${assessmentData.instructions}`);
        doc.moveDown();

        questions.forEach((question, index) => {
          doc.text(`${index + 1}. ${question.question} (${question.marks} marks)`);
          
          if (question.type === 'multiple_choice') {
            question.options.forEach((option, optIndex) => {
              doc.text(`   ${String.fromCharCode(65 + optIndex)}. ${option}`);
            });
          }
          doc.moveDown();
        });

        doc.end();

        // Wait for PDF to be written
        doc.on('end', () => {
          res.download(filepath, filename, (err) => {
            if (err) {
              console.error('PDF download error:', err);
            }
            // Clean up temp file
            fs.unlink(filepath, () => {});
          });
        });
      } else {
        // Return JSON format
        res.json({
          success: true,
          data: {
            assessment: assessmentData,
            questions
          }
        });
      }
    } catch (error) {
      console.error('Export assessment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export assessment'
      });
    }
  }

  // POST /api/v1/assessments/question-bank - Generate question bank for subject
  async generateQuestionBank(req, res) {
    try {
      const { id: teacher_id, school_id } = req.user;
      const {
        subject,
        class_code,
        term,
        questions_per_topic = 5,
        question_types = ['multiple_choice', 'short_answer']
      } = req.body;

      // Get syllabus topics for the subject
      const syllabusTopics = await db.sequelize.query(`
        SELECT s.id, s.title, s.content, s.week
        FROM syllabus s
        INNER JOIN school_subject_mapping ssm ON (
          s.global_subject_code = ssm.global_subject_code 
          AND s.global_level_code = ssm.global_level_code
        )
        WHERE ssm.school_id = :school_id 
        AND ssm.school_subject_name = :subject
        AND ssm.school_class_code = :class_code
        AND ssm.mapping_status = 'approved'
        ${term ? 'AND s.term = :term' : ''}
        ORDER BY s.week
      `, {
        replacements: { school_id, subject, class_code, term },
        type: db.Sequelize.QueryTypes.SELECT
      });

      if (syllabusTopics.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No syllabus topics found for the specified criteria'
        });
      }

      // Generate question bank using AI
      const questionBank = await assessmentGeneratorAI.generateQuestionBank(syllabusTopics, {
        questionsPerTopic: questions_per_topic,
        questionTypes: question_types,
        subject,
        classLevel: class_code
      });

      // Save question bank to database
      const [insertResult] = await db.sequelize.query(`
        INSERT INTO question_banks (
          teacher_id, subject, class_code, term, 
          question_bank_data, total_questions, total_topics,
          ai_generated, school_id, created_at
        ) VALUES (
          :teacher_id, :subject, :class_code, :term,
          :question_bank_data, :total_questions, :total_topics,
          true, :school_id, NOW()
        )
      `, {
        replacements: {
          teacher_id,
          subject,
          class_code,
          term,
          question_bank_data: JSON.stringify(questionBank),
          total_questions: questionBank.totalQuestions,
          total_topics: questionBank.totalTopics,
          school_id
        },
        type: db.Sequelize.QueryTypes.INSERT
      });

      res.status(201).json({
        success: true,
        data: {
          question_bank_id: insertResult,
          ...questionBank
        },
        message: `Generated question bank with ${questionBank.totalQuestions} questions across ${questionBank.totalTopics} topics`
      });
    } catch (error) {
      console.error('Generate question bank error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate question bank'
      });
    }
  }
}

module.exports = new AssessmentController();
