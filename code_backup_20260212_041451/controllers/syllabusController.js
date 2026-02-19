const db = require('../models');
const { Op } = require('sequelize');
const geminiService = require('../services/geminiService');

class SyllabusController {
  // GET /api/v1/syllabus/topics - Get syllabus topics filtered by teacher assignments
  async getSyllabusTopics(req, res) {
    try {
      const { school_id, id: teacher_id } = req.user;
      const { class_code, subject, term, week } = req.query;

      // Parse school_id if it's in 'SCH/1' format
      const parsedSchoolId = school_id.includes('/') ? school_id.split('/')[1] : school_id;

      // Get teacher's assigned classes and subjects
      const teacherAssignments = await db.TeacherClass.findAll({
        where: { teacher_id },
        attributes: ['class_code', 'subject', 'class_name']
      });

      if (teacherAssignments.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: 'No class assignments found for teacher'
        });
      }

      // Build filter for syllabus topics
      const whereClause = {
        [Op.and]: [
          {
            [Op.or]: teacherAssignments.map(assignment => ({
              class_code: assignment.class_code,
              subject: assignment.subject
            }))
          },
          { status: { [Op.ne]: 'Deleted' } }
        ]
      };

      // Apply additional filters
      if (class_code) whereClause.class_code = class_code;
      if (subject) whereClause.subject = subject;
      if (term) whereClause.term = term;
      if (week) whereClause.week = week;

      const syllabusTopics = await db.Syllabus.findAll({
        where: whereClause,
        order: [['term', 'ASC'], ['week', 'ASC'], ['created_at', 'ASC']]
      });

      res.json({
        success: true,
        data: syllabusTopics,
        teacher_assignments: teacherAssignments,
        message: 'Syllabus topics retrieved successfully'
      });
    } catch (error) {
      console.error('Get syllabus topics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve syllabus topics'
      });
    }
  }

  // POST /api/v1/lesson-plans/generate - AI-powered lesson plan generation
  async generateLessonContent(req, res) {
    try {
      const { lesson_plan_id, class_code } = req.body;

      if (!lesson_plan_id) {
        return res.status(400).json({
          success: false,
          message: 'Lesson plan ID is required'
        });
      }

      // Get the lesson plan
      const lessonPlan = await db.LessonPlan.findByPk(lesson_plan_id);
      if (!lessonPlan) {
        return res.status(404).json({
          success: false,
          message: 'Lesson plan not found'
        });
      }

      // Get class information for age-appropriate language
      const classInfo = await db.Class.findOne({
        where: { class_code: class_code || lessonPlan.class_code },
        attributes: ['class_name', 'level']
      });

      const classLevel = classInfo?.class_name || class_code || 'General';

      // Generate lesson content using AI
      const result = await geminiService.generateLessonContent(lessonPlan, classLevel);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate lesson content',
          error: result.error
        });
      }

      res.json({
        success: true,
        data: {
          content: result.content,
          metadata: result.metadata
        },
        message: 'Lesson content generated successfully'
      });
    } catch (error) {
      console.error('Generate lesson content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate lesson content',
        error: error.message
      });
    }
  }

  async generateLessonPlan(req, res) {
    try {
      const { school_id, id: teacher_id, branch_id } = req.user;
      const { 
        syllabus_topic_ids, 
        class_code, 
        subject_code, 
        duration_minutes = 40,
        lesson_date,
        title 
      } = req.body;

      if (!syllabus_topic_ids || syllabus_topic_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Syllabus topic IDs are required'
        });
      }

      // Get syllabus topics
      const syllabusTopics = await db.Syllabus.findAll({
        where: {
          id: { [Op.in]: syllabus_topic_ids },
          status: { [Op.ne]: 'Deleted' }
        }
      });

      if (syllabusTopics.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No valid syllabus topics found'
        });
      }

      // Get class information
      const classInfo = await db.Class.findOne({
        where: { class_code },
        attributes: ['class_name', 'section', 'level']
      });

      // Get subject information
      const subjectInfo = await db.Subject.findOne({
        where: { subject_code },
        attributes: ['subject']
      });

      // Generate lesson plan using Gemini AI
      const aiGeneratedContent = await geminiService.generateLessonPlan(
        syllabusTopics,
        classInfo?.class_name || 'Unknown Class',
        subjectInfo?.subject || 'Unknown Subject',
        duration_minutes
      );

      // Create lesson plan in database
      const lessonPlan = await db.LessonPlan.create({
        title: title || `Lesson Plan - ${syllabusTopics[0].title}`,
        teacher_id,
        school_id,
        branch_id,
        subject_code,
        class_code,
        lesson_date: lesson_date || new Date(),
        duration_minutes,
        objectives: aiGeneratedContent.objectives,
        content: aiGeneratedContent.content,
        activities: aiGeneratedContent.activities,
        resources: aiGeneratedContent.resources,
        assessment_methods: aiGeneratedContent.assessment_methods,
        homework: aiGeneratedContent.homework,
        status: 'draft'
      });

      res.status(201).json({
        success: true,
        data: {
          lesson_plan: lessonPlan,
          syllabus_topics: syllabusTopics,
          ai_generated: true
        },
        message: 'AI-powered lesson plan generated successfully'
      });
    } catch (error) {
      console.error('Generate lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate lesson plan'
      });
    }
  }

  // GET /api/v1/syllabus/coverage - Calculate curriculum coverage
  async getCurriculumCoverage(req, res) {
    try {
      const { school_id, id: teacher_id } = req.user;
      const { class_code, subject, term, academic_year } = req.query;

      // Get teacher's assignments
      const teacherAssignments = await db.TeacherClass.findAll({
        where: { teacher_id },
        attributes: ['class_code', 'subject', 'class_name']
      });

      if (teacherAssignments.length === 0) {
        return res.json({
          success: true,
          data: { coverage_percentage: 0, details: [] },
          message: 'No assignments found'
        });
      }

      // Build coverage analysis for each assignment
      const coverageData = [];

      for (const assignment of teacherAssignments) {
        // Filter by query parameters if provided
        if (class_code && assignment.class_code !== class_code) continue;
        if (subject && assignment.subject !== subject) continue;

        // Get total syllabus topics for this class/subject
        const totalTopicsWhere = {
          class_code: assignment.class_code,
          subject: assignment.subject,
          status: { [Op.ne]: 'Deleted' }
        };
        if (term) totalTopicsWhere.term = term;

        const totalTopics = await db.Syllabus.count({
          where: totalTopicsWhere
        });

        // Get completed topics (those with lesson plans)
        const completedTopics = await db.sequelize.query(`
          SELECT COUNT(DISTINCT s.id) as completed_count
          FROM syllabus s
          INNER JOIN lesson_plans lp ON (
            lp.class_code = s.class_code 
            AND lp.subject_code IN (
              SELECT subject_code FROM subjects 
              WHERE subject = s.subject 
              AND class_code = s.class_code
            )
          )
          WHERE s.class_code = :class_code
          AND s.subject = :subject
          AND s.status != 'Deleted'
          AND lp.teacher_id = :teacher_id
          AND lp.status IN ('approved', 'submitted')
          ${term ? 'AND s.term = :term' : ''}
        `, {
          replacements: { 
            class_code: assignment.class_code, 
            subject: assignment.subject, 
            teacher_id,
            ...(term && { term })
          },
          type: db.sequelize.QueryTypes.SELECT
        });

        const completed = parseInt(completedTopics[0]?.completed_count || 0);
        const coverage_percentage = totalTopics > 0 ? Math.round((completed / totalTopics) * 100) : 0;

        coverageData.push({
          class_code: assignment.class_code,
          class_name: assignment.class_name,
          subject: assignment.subject,
          total_topics: totalTopics,
          completed_topics: completed,
          coverage_percentage,
          status: coverage_percentage >= 80 ? 'Good' : coverage_percentage >= 60 ? 'Fair' : 'Poor'
        });
      }

      // Calculate overall coverage
      const totalAllTopics = coverageData.reduce((sum, item) => sum + item.total_topics, 0);
      const totalCompleted = coverageData.reduce((sum, item) => sum + item.completed_topics, 0);
      const overallCoverage = totalAllTopics > 0 ? Math.round((totalCompleted / totalAllTopics) * 100) : 0;

      res.json({
        success: true,
        data: {
          overall_coverage_percentage: overallCoverage,
          total_topics: totalAllTopics,
          completed_topics: totalCompleted,
          details: coverageData
        },
        message: 'Curriculum coverage calculated successfully'
      });
    } catch (error) {
      console.error('Get curriculum coverage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate curriculum coverage'
      });
    }
  }

  // PUT /api/v1/lesson-plans/:id/enhance - AI enhancement of existing plans
  async enhanceLessonPlan(req, res) {
    try {
      const { id } = req.params;
      const { id: teacher_id, school_id, branch_id } = req.user;
      const { enhancement_type = 'general' } = req.body;

      // Validate enhancement type
      const validTypes = ['general', 'technology', 'differentiation', 'assessment'];
      if (!validTypes.includes(enhancement_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid enhancement type. Must be: general, technology, differentiation, or assessment'
        });
      }

      // Get existing lesson plan
      const lessonPlan = await db.LessonPlan.findOne({
        where: {
          id,
          teacher_id,
          school_id,
          branch_id
        }
      });

      if (!lessonPlan) {
        return res.status(404).json({
          success: false,
          error: 'Lesson plan not found or access denied'
        });
      }

      // Enhance using Gemini AI
      const enhancedContent = await geminiService.enhanceLessonPlan(
        {
          objectives: lessonPlan.objectives,
          content: lessonPlan.content,
          activities: lessonPlan.activities,
          resources: lessonPlan.resources,
          assessment_methods: lessonPlan.assessment_methods,
          homework: lessonPlan.homework
        },
        enhancement_type
      );

      // Update lesson plan with enhanced content
      await lessonPlan.update({
        objectives: enhancedContent.objectives,
        content: enhancedContent.content,
        activities: enhancedContent.activities,
        resources: enhancedContent.resources,
        assessment_methods: enhancedContent.assessment_methods,
        homework: enhancedContent.homework,
        status: 'draft' // Reset to draft after enhancement
      });

      res.json({
        success: true,
        data: {
          lesson_plan: lessonPlan,
          enhancement_type,
          ai_enhanced: true
        },
        message: `Lesson plan enhanced with ${enhancement_type} improvements`
      });
    } catch (error) {
      console.error('Enhance lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to enhance lesson plan'
      });
    }
  }

  async getLessonPlans(req, res) {
    try {
      const school_id = req.query.school_id || req.headers['x-school-id'];
      const branch_id = req.query.branch_id || req.headers['x-branch-id'];
      const user_id = req.user?.id || req.headers['x-user-id'];
      const user_type = req.user?.user_type || req.headers['x-user-type'];
      const { academic_year, term, class_code, subject_code, teacher_id: query_teacher_id } = req.query;
      
      // Determine if user is admin/superadmin (can view all teachers' lesson plans)
      const isAdmin = ['Admin', 'admin', 'SuperAdmin', 'superadmin', 'branchadmin'].includes(user_type);
      
      // Get teacher_id - use query parameter if provided (for admin filtering), 
      // otherwise get from user_id if not admin
      let teacher_id = null;
      if (query_teacher_id) {
        // Admin filtering by specific teacher
        teacher_id = parseInt(query_teacher_id, 10) || query_teacher_id;
      } else if (!isAdmin && user_id) {
        // Non-admin users can only see their own lesson plans
        const [teacher] = await db.sequelize.query(
          `SELECT id FROM teachers WHERE user_id = :user_id LIMIT 1`,
          { replacements: { user_id }, type: db.Sequelize.QueryTypes.SELECT }
        );
        teacher_id = teacher?.id;
      }
      // If admin and no teacher_id specified, teacher_id remains null to show all
      
      const whereConditions = {};
      if (school_id) whereConditions.school_id = school_id;
      
      // Handle branch_id - convert string format "BRCH/29" to integer if needed
      let branchIdValue = null;
      if (branch_id) {
        branchIdValue = typeof branch_id === 'string' && branch_id.includes('/') 
          ? parseInt(branch_id.split('/').pop(), 10) || branch_id.split('/').pop()
          : typeof branch_id === 'string' 
          ? parseInt(branch_id, 10) || branch_id
          : branch_id;
        // Only add branch_id filter if we have a valid value
        if (branchIdValue !== null && branchIdValue !== undefined && branchIdValue !== '') {
          whereConditions.branch_id = branchIdValue;
        }
      }
      
      if (teacher_id) whereConditions.teacher_id = teacher_id;
      
      // Apply academic_year filter if provided
      if (academic_year) {
        whereConditions.academic_year = academic_year;
      }
      
      // Apply term filter if provided
      if (term) {
        whereConditions.term = term;
      }

      // Apply status filter if provided (support comma-separated values for multiple statuses)
      if (req.query.status) {
        const statusValues = req.query.status.split(',').map(s => s.trim());
        if (statusValues.length === 1) {
          whereConditions.status = statusValues[0];
        } else {
          whereConditions.status = { [Op.in]: statusValues };
        }
      }
      
      // Apply class_code filter if provided
      // Handle both formats: "CLS0620" (code) and "JSS3" (name)
      if (class_code) {
        // Try to find matching class to get both code and name
        try {
          const classMatches = await db.sequelize.query(
            `SELECT DISTINCT class_code, class_name FROM classes 
             WHERE (class_code = :class_code OR class_name = :class_code)
             AND school_id = :school_id
             LIMIT 5`,
            {
              replacements: { class_code, school_id },
              type: db.Sequelize.QueryTypes.SELECT
            }
          );
          
          if (classMatches && classMatches.length > 0) {
            // Extract all possible class_code values to search for
            const possibleClassCodes = new Set();
            classMatches.forEach(match => {
              if (match.class_code) possibleClassCodes.add(match.class_code);
              if (match.class_name) possibleClassCodes.add(match.class_name);
            });
            
            const classCodeValues = Array.from(possibleClassCodes);
            whereConditions.class_code = {
              [Op.in]: classCodeValues
            };
          } else {
            // Fallback: search by the provided value directly
            whereConditions.class_code = class_code;
          }
        } catch (err) {
          console.warn('Class lookup failed, using direct search:', err);
          whereConditions.class_code = class_code;
        }
      }
      
      // Filter by subject_code - the model stores subject_code in the 'subject_code' field
      // Support both subject_code (new format) and subject name (legacy format)
      if (subject_code) {
        // Try to find matching subject in subjects table to get both code and name
        // This allows us to search for lesson plans saved with either format
        try {
          const subjectMatches = await db.sequelize.query(
            `SELECT DISTINCT subject_code, subject FROM subjects 
             WHERE (subject_code = :subject_code OR subject = :subject_code)
             AND school_id = :school_id
             LIMIT 5`,
            {
              replacements: { subject_code, school_id },
              type: db.Sequelize.QueryTypes.SELECT
            }
          );
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:405',message:'Subject lookup result',data:{subject_code,subjectMatches,matchesCount:subjectMatches?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          if (subjectMatches && subjectMatches.length > 0) {
            // Extract all possible subject values (codes and names) to search for
            const possibleSubjects = new Set();
            subjectMatches.forEach(match => {
              if (match.subject_code) possibleSubjects.add(match.subject_code);
              if (match.subject) possibleSubjects.add(match.subject);
            });
            
            // Use Op.in to search for any matching subject value
            const subjectValues = Array.from(possibleSubjects);
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:430',message:'Building Op.in filter',data:{subjectValues,possibleSubjectsSize:possibleSubjects.size,OpInStructure:{[Op.in]:subjectValues}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            whereConditions.subject_code = {
              [Op.in]: subjectValues
            };
          } else {
            // Fallback: search by the provided value directly
            whereConditions.subject_code = subject_code;
          }
        } catch (err) {
          // If subject lookup fails, fall back to direct search
          console.warn('Subject lookup failed, using direct search:', err);
          whereConditions.subject_code = subject_code;
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:437',message:'Final where conditions built',data:{whereConditions,subject_code_query:subject_code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      console.log('Lesson Plans Query Filters:', {
        school_id,
        branch_id_header: branch_id,
        branch_id_filter: whereConditions.branch_id,
        teacher_id,
        academic_year,
        term,
        class_code,
        subject_code,
        whereConditions
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:466',message:'Before Sequelize query',data:{whereConditions,subjectCondition:whereConditions.subject,hasOpIn:!!(whereConditions.subject && whereConditions.subject[Op.in])},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      const lessonPlans = await db.sequelize.query(`
        SELECT id, title, subject_code, class_code, lesson_date, duration_minutes, 
               objectives, content, activities, resources, status, ai_generated, 
               school_id, branch_id, created_at, updated_at, academic_year, term, week_no,
               submitted_at
        FROM lesson_plans
        WHERE school_id = :school_id
        ${branchIdValue ? 'AND branch_id = :branch_id' : ''}
        ${academic_year ? 'AND academic_year = :academic_year' : ''}
        ${term ? 'AND term = :term' : ''}
        ${req.query.status ? 'AND status IN (' + req.query.status.split(',').map((_, i) => `:status${i}`).join(',') + ')' : ''}
        ORDER BY created_at DESC
      `, {
        replacements: {
          school_id,
          branch_id: branchIdValue,
          academic_year,
          term,
          ...Object.fromEntries(
            (req.query.status ? req.query.status.split(',').map(s => s.trim()) : [])
              .map((status, i) => [`status${i}`, status])
          )
        },
        type: db.Sequelize.QueryTypes.SELECT
      }) || [];

      // If admin or filtering by teacher, enrich with teacher information
      if ((isAdmin || query_teacher_id) && lessonPlans.length > 0) {
        const teacherIds = [...new Set(lessonPlans.map(lp => lp.teacher_id).filter(Boolean))];
        if (teacherIds.length > 0) {
          const [teachers] = await db.sequelize.query(
            `SELECT id, name, teacher_id, staff_id, email FROM teachers WHERE id IN (:teacherIds)`,
            {
              replacements: { teacherIds },
              type: db.Sequelize.QueryTypes.SELECT
            }
          );
          
          // Map teacher data to lesson plans
          const teachersMap = {};
          (teachers || []).forEach(teacher => {
            teachersMap[teacher.id] = teacher;
          });
          
          lessonPlans.forEach(plan => {
            if (plan.teacher_id && teachersMap[plan.teacher_id]) {
              plan.teacher = teachersMap[plan.teacher_id];
            }
          });
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:477',message:'Query result',data:{lessonPlansCount:lessonPlans.length,lessonPlans:lessonPlans.map(lp=>({id:lp.id,subject:lp.subject,class_code:lp.class_code,academic_year:lp.academic_year,term:lp.term}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      res.json({
        success: true,
        data: lessonPlans
      });
    } catch (error) {
      console.error('Get lesson plans error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch lesson plans',
        data: []
      });
    }
  }

  async getAcademicWeeks(req, res) {
    try {
      const school_id = req.query.school_id || req.headers['x-school-id'];
      const branch_id = req.query.branch_id || req.headers['x-branch-id'];
      const { academic_year, term } = req.query;

      const weeks = await db.sequelize.query(`
        SELECT week_number, weeks, begin_date, end_date, status
        FROM academic_weeks
        WHERE school_id = :school_id
          AND branch_id = :branch_id
          ${academic_year ? 'AND academic_year = :academic_year' : ''}
          ${term ? 'AND term = :term' : ''}
        ORDER BY week_number ASC
      `, {
        replacements: { school_id, branch_id, academic_year, term },
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: weeks
      });
    } catch (error) {
      console.error('Get academic weeks error:', error);
      res.json({ success: true, data: [] });
    }
  }

  async saveLessonPlan(req, res) {
    try {
      const school_id = req.headers['x-school-id'];
      const branch_id = req.headers['x-branch-id'];
      const user_id = req.user?.id || req.headers['x-user-id'];
      const { id } = req.body;

      // Check if editing existing lesson plan
      if (id) {
        const existingPlan = await db.LessonPlan.findByPk(id);
        if (existingPlan && existingPlan.status === 'approved') {
          return res.status(400).json({
            success: false,
            message: 'Cannot edit approved lesson plans'
          });
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:464',message:'Headers extracted',data:{school_id,branch_id,user_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
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
        status = 'draft',
        ai_generated,
        ai_model_used,
        academic_year,
        term,
        week_no,
        teacher_id: bodyTeacherId
      } = req.body;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:489',message:'Request body parsed',data:{subject_code,class_code,academic_year,term,branch_id_original:branch_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Use teacher_id from body if provided, otherwise lookup from user_id
      let teacher_id = bodyTeacherId;
      if (!teacher_id && user_id) {
        const [teacher] = await db.sequelize.query(
          `SELECT id FROM teachers WHERE user_id = :user_id LIMIT 1`,
          { replacements: { user_id }, type: db.Sequelize.QueryTypes.SELECT }
        );
        teacher_id = teacher?.id;
      }

      // Handle branch_id conversion - convert "BRCH/29" to integer 29
      let branchIdValue = branch_id;
      if (branch_id && typeof branch_id === 'string' && branch_id.includes('/')) {
        branchIdValue = parseInt(branch_id.split('/').pop(), 10);
      } else if (branch_id && typeof branch_id === 'string') {
        branchIdValue = parseInt(branch_id, 10);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:496',message:'Branch ID conversion',data:{branch_id_original:branch_id,branchIdValue,type:typeof branchIdValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      const createData = {
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
        ai_generated: ai_generated || false,
        ai_model_used,
        school_id,
        branch_id: branchIdValue,
        teacher_id,
        academic_year,
        term,
        week_no,
        submitted_at: status === 'submitted' ? new Date() : null
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:520',message:'Before create - data prepared',data:createData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      let lessonPlan;
      if (id) {
        await db.LessonPlan.update(createData, { where: { id } });
        lessonPlan = await db.LessonPlan.findByPk(id);
      } else {
        lessonPlan = await db.LessonPlan.create(createData);
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:523',message:'Create successful',data:{lessonPlanId:lessonPlan?.id,lessonPlanData:lessonPlan?.dataValues},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      res.status(201).json({
        success: true,
        data: lessonPlan,
        message: id ? 'Lesson plan updated successfully' : 'Lesson plan saved successfully'
      });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'syllabusController.js:530',message:'Save error caught',data:{errorMessage:error.message,errorStack:error.stack,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.error('Save lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save lesson plan'
      });
    }
  }

  async submitLessonPlan(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user?.id || req.headers['x-user-id'];
      
      // Get teacher_id from teachers table
      let teacher_id = null;
      if (user_id) {
        const [teacher] = await db.sequelize.query(
          `SELECT id FROM teachers WHERE user_id = :user_id LIMIT 1`,
          { replacements: { user_id }, type: db.Sequelize.QueryTypes.SELECT }
        );
        teacher_id = teacher?.id;
      }

      // Find lesson plan - if no teacher_id found, just check by id and status
      const whereClause = { id, status: 'draft' };
      if (teacher_id) {
        whereClause.teacher_id = teacher_id;
      }

      const lessonPlan = await db.LessonPlan.findOne({
        where: whereClause
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
        error: error.message || 'Failed to submit lesson plan'
      });
    }
  }

  async deleteLessonPlan(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user?.id || req.headers['x-user-id'];

      const [teacher] = await db.sequelize.query(
        `SELECT id FROM teachers WHERE user_id = :user_id LIMIT 1`,
        { replacements: { user_id }, type: db.Sequelize.QueryTypes.SELECT }
      );
      const teacher_id = teacher?.id;

      const lessonPlan = await db.LessonPlan.findOne({
        where: { id, teacher_id }
      });

      if (!lessonPlan) {
        return res.status(404).json({
          success: false,
          message: 'Lesson plan not found or you do not have permission to delete it'
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
        error: error.message || 'Failed to delete lesson plan'
      });
    }
  }
}

module.exports = new SyllabusController();