# Phase 2: AI Integration & Services

**Team Lead**: Backend Expert (AI Specialist)  
**Duration**: Weeks 3-4  
**Dependencies**: Phase 1 Complete  
**Deliverables**: AI-powered lesson generation, Nigerian education context

---

## Task 1: Enhanced Gemini AI Service

### 1.1 Nigerian Education AI Service
```javascript
// File: /elscholar-api/src/services/nigerianEducationAI.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

class NigerianEducationAI {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }

  async generateLessonPlan(syllabusTopics, classLevel, subject, duration = 40) {
    const prompt = `
    Generate a comprehensive lesson plan for Nigerian ${classLevel} students:
    
    CONTEXT:
    - Subject: ${subject}
    - Class Level: ${classLevel}
    - Duration: ${duration} minutes
    - Topics: ${syllabusTopics.map(t => t.title).join(', ')}
    - Educational System: Nigerian (NERDC Standards)
    
    REQUIREMENTS:
    1. Use Nigerian educational context and examples
    2. Include local cultural references where appropriate
    3. Apply age-appropriate teaching methodologies
    4. Ensure NERDC curriculum alignment
    
    FORMAT (JSON Response):
    {
      "title": "Lesson title",
      "objectives": ["Specific learning objectives"],
      "content": "Detailed lesson content with Nigerian examples",
      "activities": ["Interactive activities suitable for Nigerian classrooms"],
      "resources": ["Required materials and resources"],
      "assessment_methods": ["Assessment strategies"],
      "homework": "Relevant homework assignments",
      "cultural_context": "Nigerian cultural integration",
      "methodology": "Teaching approach (play-way for primary, etc.)"
    }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Invalid AI response format');
    } catch (error) {
      console.error('AI Generation Error:', error);
      throw new Error('Failed to generate lesson plan');
    }
  }

  async enhanceLessonPlan(existingPlan, enhancementType) {
    const prompts = {
      'technology': `Enhance this lesson plan with technology integration suitable for Nigerian schools`,
      'differentiation': `Add differentiated instruction strategies for diverse learners`,
      'assessment': `Improve assessment methods with formative and summative strategies`,
      'general': `Improve overall lesson quality and engagement`
    };

    const prompt = `
    ${prompts[enhancementType] || prompts.general}:
    
    EXISTING PLAN:
    ${JSON.stringify(existingPlan, null, 2)}
    
    ENHANCEMENT REQUIREMENTS:
    - Maintain Nigerian educational context
    - Keep practical for typical Nigerian classroom resources
    - Ensure age-appropriate improvements
    - Focus on ${enhancementType} enhancement
    
    Return enhanced lesson plan in same JSON format.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Invalid enhancement response');
    } catch (error) {
      console.error('AI Enhancement Error:', error);
      throw new Error('Failed to enhance lesson plan');
    }
  }
}

module.exports = new NigerianEducationAI();
```

---

## Task 2: AI-Powered Lesson Plan Controller

### 2.1 Enhanced Lesson Plan Generation
```javascript
// File: /elscholar-api/src/controllers/aiLessonController.js
const db = require('../models');
const nigerianEducationAI = require('../services/nigerianEducationAI');
const { checkTeacherPermission } = require('../middleware/teacherPermissions');

class AILessonController {
  // POST /api/v1/ai/generate-lesson-plan
  async generateLessonPlan(req, res) {
    try {
      const { id: teacher_id, school_id, branch_id } = req.user;
      const { 
        syllabus_topic_ids, 
        class_code, 
        subject_code, 
        lesson_date,
        duration_minutes = 40,
        enhancement_preferences = []
      } = req.body;

      // Validate input
      if (!syllabus_topic_ids || syllabus_topic_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Syllabus topic IDs are required'
        });
      }

      // Get syllabus topics
      const syllabusTopics = await db.Syllabus.findAll({
        where: {
          id: { [db.Sequelize.Op.in]: syllabus_topic_ids },
          status: { [db.Sequelize.Op.ne]: 'Deleted' }
        }
      });

      if (syllabusTopics.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No valid syllabus topics found'
        });
      }

      // Get class and subject information
      const [classInfo, subjectInfo] = await Promise.all([
        db.Class.findOne({
          where: { class_code },
          attributes: ['class_name', 'section', 'level']
        }),
        db.Subject.findOne({
          where: { subject_code },
          attributes: ['subject']
        })
      ]);

      // Generate AI lesson plan
      const aiContent = await nigerianEducationAI.generateLessonPlan(
        syllabusTopics,
        classInfo?.class_name || 'Unknown Class',
        subjectInfo?.subject || 'Unknown Subject',
        duration_minutes
      );

      // Create lesson plan in database
      const lessonPlan = await db.LessonPlan.create({
        teacher_id,
        syllabus_id: syllabusTopics[0].id,
        class_code,
        subject_code,
        title: aiContent.title,
        lesson_date: lesson_date || new Date(),
        duration_minutes,
        objectives: JSON.stringify(aiContent.objectives),
        content: aiContent.content,
        activities: JSON.stringify(aiContent.activities),
        resources: JSON.stringify(aiContent.resources),
        assessment_methods: JSON.stringify(aiContent.assessment_methods),
        homework: aiContent.homework,
        ai_generated: true,
        ai_enhancement_type: 'initial_generation',
        ai_confidence_score: 0.85,
        status: 'draft',
        school_id,
        branch_id
      });

      res.status(201).json({
        success: true,
        data: {
          lesson_plan: lessonPlan,
          ai_content: aiContent,
          syllabus_topics: syllabusTopics
        },
        message: 'AI lesson plan generated successfully'
      });

    } catch (error) {
      console.error('AI lesson generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate AI lesson plan'
      });
    }
  }

  // POST /api/v1/ai/bulk-generate
  async bulkGenerateLessonPlans(req, res) {
    try {
      const { id: teacher_id, school_id, branch_id } = req.user;
      const { 
        class_code, 
        subject_code, 
        term, 
        start_date,
        lessons_per_week = 3
      } = req.body;

      // Get all syllabus topics for the term
      const syllabusTopics = await db.Syllabus.findAll({
        where: {
          class_code,
          subject: subject_code,
          term,
          status: { [db.Sequelize.Op.ne]: 'Deleted' }
        },
        order: [['week_no', 'ASC']]
      });

      if (syllabusTopics.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No syllabus topics found for the specified criteria'
        });
      }

      const generatedPlans = [];
      const startDate = new Date(start_date);

      // Generate lesson plans for each topic
      for (let i = 0; i < syllabusTopics.length; i++) {
        const topic = syllabusTopics[i];
        
        // Calculate lesson date based on lessons per week
        const weekOffset = Math.floor(i / lessons_per_week);
        const dayOffset = (i % lessons_per_week) * 2; // Every 2 days
        const lessonDate = new Date(startDate);
        lessonDate.setDate(startDate.getDate() + (weekOffset * 7) + dayOffset);

        try {
          const aiContent = await nigerianEducationAI.generateLessonPlan(
            [topic],
            class_code,
            subject_code
          );

          const lessonPlan = await db.LessonPlan.create({
            teacher_id,
            syllabus_id: topic.id,
            class_code,
            subject_code,
            title: aiContent.title,
            lesson_date: lessonDate,
            duration_minutes: 40,
            objectives: JSON.stringify(aiContent.objectives),
            content: aiContent.content,
            activities: JSON.stringify(aiContent.activities),
            resources: JSON.stringify(aiContent.resources),
            assessment_methods: JSON.stringify(aiContent.assessment_methods),
            homework: aiContent.homework,
            ai_generated: true,
            ai_enhancement_type: 'bulk_generation',
            ai_confidence_score: 0.80,
            status: 'draft',
            school_id,
            branch_id
          });

          generatedPlans.push(lessonPlan);
        } catch (error) {
          console.error(`Failed to generate plan for topic ${topic.id}:`, error);
        }
      }

      res.status(201).json({
        success: true,
        data: {
          generated_count: generatedPlans.length,
          total_topics: syllabusTopics.length,
          lesson_plans: generatedPlans
        },
        message: `Successfully generated ${generatedPlans.length} lesson plans`
      });

    } catch (error) {
      console.error('Bulk generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk generate lesson plans'
      });
    }
  }
}

module.exports = new AILessonController();
```

---

## Task 3: Curriculum Coverage Analytics

### 3.1 Coverage Analysis Service
```javascript
// File: /elscholar-api/src/services/curriculumAnalytics.js
const db = require('../models');

class CurriculumAnalytics {
  async calculateTeacherCoverage(teacherId, filters = {}) {
    const { class_code, subject_code, term, academic_year } = filters;
    
    const whereClause = { teacher_id: teacherId };
    if (class_code) whereClause.class_code = class_code;
    if (subject_code) whereClause.subject_code = subject_code;

    // Get teacher's lesson plans
    const lessonPlans = await db.LessonPlan.findAll({
      where: whereClause,
      include: [{
        model: db.Syllabus,
        as: 'syllabus',
        where: {
          ...(term && { term }),
          ...(academic_year && { academic_year })
        }
      }]
    });

    // Get total syllabus topics for comparison
    const totalTopicsWhere = {};
    if (class_code) totalTopicsWhere.class_code = class_code;
    if (term) totalTopicsWhere.term = term;
    if (academic_year) totalTopicsWhere.academic_year = academic_year;

    const totalTopics = await db.Syllabus.count({
      where: {
        ...totalTopicsWhere,
        status: { [db.Sequelize.Op.ne]: 'Deleted' }
      }
    });

    const coveredTopics = lessonPlans.length;
    const coveragePercentage = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;

    return {
      total_topics: totalTopics,
      covered_topics: coveredTopics,
      coverage_percentage: coveragePercentage,
      lesson_plans: lessonPlans.length,
      status: this.getCoverageStatus(coveragePercentage)
    };
  }

  getCoverageStatus(percentage) {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Good';
    if (percentage >= 60) return 'Fair';
    return 'Needs Improvement';
  }

  async getTeacherProductivityMetrics(teacherId, dateRange) {
    const { start_date, end_date } = dateRange;
    
    const metrics = await db.sequelize.query(`
      SELECT 
        COUNT(*) as total_plans,
        COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_generated_plans,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_plans,
        AVG(CASE WHEN ai_generated = true THEN ai_confidence_score END) as avg_ai_confidence,
        COUNT(DISTINCT class_code) as classes_taught,
        COUNT(DISTINCT subject_code) as subjects_taught
      FROM lesson_plans 
      WHERE teacher_id = :teacher_id 
      AND created_at BETWEEN :start_date AND :end_date
    `, {
      replacements: { teacher_id: teacherId, start_date, end_date },
      type: db.Sequelize.QueryTypes.SELECT
    });

    return metrics[0];
  }
}

module.exports = new CurriculumAnalytics();
```

---

## Task 4: AI Route Integration

### 4.1 AI Routes Setup
```javascript
// File: /elscholar-api/src/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiLessonController = require('../controllers/aiLessonController');
const { authenticateToken } = require('../middleware/auth');
const { checkTeacherPermission } = require('../middleware/teacherPermissions');

// Apply authentication to all AI routes
router.use(authenticateToken);

// AI lesson plan generation
router.post('/generate-lesson-plan', 
  checkTeacherPermission('lesson_plans', 'create'),
  aiLessonController.generateLessonPlan
);

// Bulk lesson plan generation
router.post('/bulk-generate',
  checkTeacherPermission('lesson_plans', 'create'),
  aiLessonController.bulkGenerateLessonPlans
);

// Enhance existing lesson plan
router.put('/enhance-lesson/:id',
  checkTeacherPermission('lesson_plans', 'edit_own'),
  aiLessonController.enhanceLessonPlan
);

module.exports = router;
```

---

## Execution Checklist

### AI Service Tasks
- [ ] Implement NigerianEducationAI service
- [ ] Add Nigerian context prompts
- [ ] Test AI response parsing
- [ ] Add error handling for API failures
- [ ] Implement response caching

### Controller Tasks  
- [ ] Create AILessonController
- [ ] Implement single lesson generation
- [ ] Implement bulk generation
- [ ] Add lesson plan enhancement
- [ ] Test all AI endpoints

### Analytics Tasks
- [ ] Build curriculum coverage analytics
- [ ] Create teacher productivity metrics
- [ ] Add performance tracking
- [ ] Implement reporting features

### Integration Tasks
- [ ] Set up AI routes
- [ ] Add permission middleware
- [ ] Test AI workflow end-to-end
- [ ] Monitor AI usage and costs

---

**Completion Criteria**: AI services functional, lesson plans auto-generated, Nigerian context integrated, analytics working.

**Next Phase**: Frontend & User Experience (Phase 3)
