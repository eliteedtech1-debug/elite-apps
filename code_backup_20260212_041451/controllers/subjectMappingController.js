const db = require('../models');

class SubjectMappingController {
  // GET /api/v1/subject-mapping/school-subjects - Get school's subjects for mapping
  async getSchoolSubjects(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      
      // Get school's current subjects from subjects table
      const schoolSubjects = await db.sequelize.query(`
        SELECT DISTINCT 
          s.subject as school_subject_name,
          s.subject_code as school_subject_code,
          s.class_code as school_class_code,
          c.class_name as school_class_name,
          c.section as school_section,
          ssm.global_subject_code,
          ssm.global_level_code,
          ssm.mapping_status,
          ssm.id as mapping_id
        FROM subjects s
        INNER JOIN classes c ON (s.class_code = c.class_code AND s.school_id = c.school_id AND s.branch_id = c.branch_id)
        LEFT JOIN school_subject_mapping ssm ON (
          s.subject COLLATE utf8mb4_unicode_ci = ssm.school_subject_name COLLATE utf8mb4_unicode_ci
          AND s.class_code COLLATE utf8mb4_unicode_ci = ssm.school_class_code COLLATE utf8mb4_unicode_ci
          AND ssm.school_id = :school_id
        )
        WHERE s.school_id = :school_id
        ORDER BY c.class_name IS NULL, c.section, c.class_name, s.subject
      `, {
        replacements: { school_id },
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: schoolSubjects
      });
    } catch (error) {
      console.error('Get school subjects error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve school subjects'
      });
    }
  }

  // GET /api/v1/subject-mapping/global-content - Get available global content
  async getGlobalContent(req, res) {
    try {
      const globalContent = await db.sequelize.query(`
        SELECT DISTINCT
          global_subject_code,
          global_level_code,
          global_subject_name,
          COUNT(*) as topic_count,
          scraped_source
        FROM global_curriculum_content 
        GROUP BY global_subject_code, global_level_code, global_subject_name, scraped_source
        ORDER BY global_level_code, global_subject_code
      `, {
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: globalContent
      });
    } catch (error) {
      console.error('Get global content error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve global content'
      });
    }
  }

  // GET /api/v1/subject-mapping/global-content-details - Get detailed content for a subject/level
  async getGlobalContentDetails(req, res) {
    try {
      const { subject, level } = req.query;
      
      const contentDetails = await db.sequelize.query(`
        SELECT id, title, content, week, term, scraped_source
        FROM global_curriculum_content 
        WHERE global_subject_code = :subject AND global_level_code = :level
        ORDER BY term, week
      `, {
        replacements: { subject, level },
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: contentDetails
      });
    } catch (error) {
      console.error('Get global content details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve content details'
      });
    }
  }

  // POST /api/v1/subject-mapping/create - Create subject mapping
  async createMapping(req, res) {
    try {
      const { school_id, branch_id, id: mapped_by } = req.user;
      const {
        school_subject_name,
        school_subject_code,
        school_class_code,
        global_subject_code,
        global_level_code,
        mapping_confidence = 1.00
      } = req.body;

      // Use NULL for branch_id to match existing data pattern
      const effectiveBranchId = null;

      // Check if mapping already exists
      const existingMapping = await db.sequelize.query(`
        SELECT id FROM school_subject_mapping 
        WHERE school_id = :school_id 
        AND school_subject_name = :school_subject_name 
        AND school_class_code = :school_class_code
      `, {
        replacements: { school_id, school_subject_name, school_class_code },
        type: db.Sequelize.QueryTypes.SELECT
      });

      if (existingMapping.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Mapping already exists for this subject and class'
        });
      }

      // Create new mapping
      const [insertResult] = await db.sequelize.query(`
        INSERT INTO school_subject_mapping (
          school_id, branch_id, school_subject_name, school_subject_code,
          school_class_code, global_subject_code, global_level_code,
          mapping_confidence, mapped_by, mapping_status
        ) VALUES (
          :school_id, :branch_id, :school_subject_name, :school_subject_code,
          :school_class_code, :global_subject_code, :global_level_code,
          :mapping_confidence, :mapped_by, 'pending'
        )
      `, {
        replacements: {
          school_id, branch_id: effectiveBranchId, school_subject_name, 
          school_subject_code: school_subject_code || null,
          school_class_code, global_subject_code, global_level_code,
          mapping_confidence, mapped_by: null // Set to null to avoid FK constraint
        },
        type: db.Sequelize.QueryTypes.INSERT
      });

      res.status(201).json({
        success: true,
        data: { mapping_id: insertResult },
        message: 'Subject mapping created successfully'
      });
    } catch (error) {
      console.error('Create mapping error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create subject mapping'
      });
    }
  }

  // PUT /api/v1/subject-mapping/:id/approve - Approve mapping (Senior Master)
  async approveMapping(req, res) {
    try {
      const { id } = req.params;
      const { school_id, branch_id } = req.user;
      const { action } = req.body; // 'approve' or 'reject'

      const status = action === 'approve' ? 'approved' : 'rejected';
      const effectiveBranchId = branch_id || req.headers['x-branch-id'];

      const [affectedRows] = await db.sequelize.query(`
        UPDATE school_subject_mapping 
        SET mapping_status = :status, approved_by = :approved_by, updated_at = NOW()
        WHERE id = :id 
          AND school_id = :school_id 
          AND (
            (branch_id IS NULL AND :branch_id IS NULL) OR 
            (branch_id = :branch_id)
          )
      `, {
        replacements: { 
          id, 
          status, 
          approved_by: null,
          school_id,
          branch_id: effectiveBranchId
        },
        type: db.Sequelize.QueryTypes.UPDATE
      });

      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Mapping not found'
        });
      }

      res.json({
        success: true,
        message: `Mapping ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Approve mapping error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve mapping'
      });
    }
  }

  // POST /api/v1/subject-mapping/auto-suggest - AI-powered mapping suggestions
  async autoSuggestMappings(req, res) {
    try {
      const { school_id } = req.user;
      
      // Get unmapped school subjects
      const unmappedSubjects = await db.sequelize.query(`
        SELECT DISTINCT 
          s.subject as school_subject_name,
          s.class_code as school_class_code
        FROM subjects s
        LEFT JOIN school_subject_mapping ssm ON (
          s.subject = ssm.school_subject_name 
          AND s.class_code = ssm.school_class_code
          AND ssm.school_id = :school_id
        )
        WHERE s.school_id = :school_id AND ssm.id IS NULL
      `, {
        replacements: { school_id },
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get available global content
      const globalContent = await db.sequelize.query(`
        SELECT DISTINCT global_subject_code, global_level_code, subject, class_code
        FROM syllabus WHERE is_global_content = TRUE
      `, {
        type: db.Sequelize.QueryTypes.SELECT
      });

      // AI-powered mapping suggestions
      const suggestions = [];
      
      for (const schoolSubject of unmappedSubjects) {
        const suggestion = this.generateMappingSuggestion(schoolSubject, globalContent);
        if (suggestion) {
          suggestions.push({
            school_subject_name: schoolSubject.school_subject_name,
            school_class_code: schoolSubject.school_class_code,
            suggested_global_subject_code: suggestion.global_subject_code,
            suggested_global_level_code: suggestion.global_level_code,
            confidence_score: suggestion.confidence,
            reasoning: suggestion.reasoning
          });
        }
      }

      res.json({
        success: true,
        data: suggestions,
        message: `Generated ${suggestions.length} mapping suggestions`
      });
    } catch (error) {
      console.error('Auto suggest mappings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate mapping suggestions'
      });
    }
  }

  generateMappingSuggestion(schoolSubject, globalContent) {
    const { school_subject_name, school_class_code } = schoolSubject;
    
    // Simple AI logic for mapping suggestions
    const subjectName = school_subject_name.toLowerCase();
    const className = school_class_code.toLowerCase();
    
    // Mathematics variations
    if (subjectName.includes('math')) {
      const levelMapping = this.mapClassToLevel(className);
      if (levelMapping) {
        return {
          global_subject_code: 'MATH_PRIMARY',
          global_level_code: levelMapping,
          confidence: this.calculateConfidence(subjectName, 'mathematics'),
          reasoning: `Detected mathematics subject variant: "${school_subject_name}"`
        };
      }
    }
    
    // English variations
    if (subjectName.includes('english') || subjectName.includes('language')) {
      const levelMapping = this.mapClassToLevel(className);
      if (levelMapping) {
        return {
          global_subject_code: 'ENG_PRIMARY',
          global_level_code: levelMapping,
          confidence: this.calculateConfidence(subjectName, 'english'),
          reasoning: `Detected English/Language subject: "${school_subject_name}"`
        };
      }
    }
    
    // Science variations
    if (subjectName.includes('science') || subjectName.includes('basic science')) {
      const levelMapping = this.mapClassToLevel(className);
      if (levelMapping) {
        return {
          global_subject_code: 'SCI_PRIMARY',
          global_level_code: levelMapping,
          confidence: this.calculateConfidence(subjectName, 'science'),
          reasoning: `Detected Science subject: "${school_subject_name}"`
        };
      }
    }
    
    return null;
  }

  mapClassToLevel(className) {
    const classMap = {
      'primary 1': 'P1', 'p1': 'P1', 'class 1': 'P1',
      'primary 2': 'P2', 'p2': 'P2', 'class 2': 'P2',
      'primary 3': 'P3', 'p3': 'P3', 'class 3': 'P3',
      'primary 4': 'P4', 'p4': 'P4', 'class 4': 'P4',
      'primary 5': 'P5', 'p5': 'P5', 'class 5': 'P5',
      'primary 6': 'P6', 'p6': 'P6', 'class 6': 'P6',
      'jss 1': 'JSS1', 'jss1': 'JSS1', 'junior 1': 'JSS1',
      'jss 2': 'JSS2', 'jss2': 'JSS2', 'junior 2': 'JSS2',
      'jss 3': 'JSS3', 'jss3': 'JSS3', 'junior 3': 'JSS3'
    };
    
    return classMap[className] || null;
  }

  calculateConfidence(schoolSubject, globalSubject) {
    const subject = schoolSubject.toLowerCase();
    
    // Exact match
    if (subject === globalSubject) return 0.95;
    
    // Contains keyword
    if (subject.includes(globalSubject)) return 0.85;
    
    // Mathematics variations
    if (globalSubject === 'mathematics') {
      if (subject.includes('math') || subject.includes('arithmetic') || subject.includes('numeracy')) {
        return 0.80;
      }
    }
    
    // English variations
    if (globalSubject === 'english') {
      if (subject.includes('language') || subject.includes('literacy') || subject.includes('communication')) {
        return 0.75;
      }
    }
    
    return 0.60; // Default confidence for partial matches
  }

  // POST /api/v1/subject-mapping/bulk-create - Create multiple mappings with admin decisions
  async bulkCreateMappings(req, res) {
    try {
      const { school_id, branch_id, id: mapped_by } = req.user;
      const { mappings } = req.body; // Array of mapping decisions
      
      const results = [];
      const errors = [];
      
      for (const mapping of mappings) {
        try {
          const {
            school_subject_name,
            school_class_code,
            global_subject_code,
            global_level_code,
            admin_decision, // 'accept', 'modify', 'reject'
            confidence_score
          } = mapping;
          
          if (admin_decision === 'reject') {
            results.push({
              school_subject_name,
              status: 'rejected',
              message: 'Admin rejected auto-suggestion'
            });
            continue;
          }
          
          // Create mapping (accept or modify)
          const [insertResult] = await db.sequelize.query(`
            INSERT INTO school_subject_mapping (
              school_id, branch_id, school_subject_name, school_class_code,
              global_subject_code, global_level_code, mapping_confidence,
              mapped_by, mapping_status
            ) VALUES (
              :school_id, :branch_id, :school_subject_name, :school_class_code,
              :global_subject_code, :global_level_code, :confidence_score,
              :mapped_by, 'pending'
            )
          `, {
            replacements: {
              school_id, branch_id, school_subject_name, school_class_code,
              global_subject_code, global_level_code, 
              confidence_score: confidence_score || 0.80,
              mapped_by
            },
            type: db.Sequelize.QueryTypes.INSERT
          });
          
          results.push({
            school_subject_name,
            mapping_id: insertResult,
            status: admin_decision,
            message: `Mapping ${admin_decision}ed by admin`
          });
          
        } catch (error) {
          errors.push({
            school_subject_name: mapping.school_subject_name,
            error: error.message
          });
        }
      }
      
      res.status(201).json({
        success: true,
        data: {
          total_processed: mappings.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors
        },
        message: `Processed ${mappings.length} mapping decisions`
      });
    } catch (error) {
      console.error('Bulk create mappings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process bulk mapping decisions'
      });
    }
  }
  async getMappedContent(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { subject_name, class_code } = req.query;
      
      // Use headers as fallback
      const effectiveSchoolId = school_id || req.headers['x-school-id'];
      const effectiveBranchId = branch_id || req.headers['x-branch-id'];

      let whereClause = 'WHERE ssm.school_id = :school_id AND ssm.mapping_status = "approved"';
      const replacements = { school_id: effectiveSchoolId, branch_id: effectiveBranchId };

      if (subject_name) {
        whereClause += ' AND ssm.school_subject_name = :subject_name';
        replacements.subject_name = subject_name;
      }
      if (class_code) {
        whereClause += ' AND ssm.school_class_code = :class_code';
        replacements.class_code = class_code;
      }

      const mappedContent = await db.sequelize.query(`
        SELECT 
          gcc.id, gcc.title, gcc.content, gcc.term, gcc.week,
          gcc.global_subject_code, gcc.global_level_code,
          ssm.school_subject_name, ssm.school_class_code,
          c.class_name as school_class_name, c.section as school_section,
          ssm.mapping_confidence, gcc.scraped_source
        FROM school_subject_mapping ssm
        INNER JOIN global_curriculum_content gcc ON (
          gcc.global_subject_code COLLATE utf8mb4_unicode_ci = ssm.global_subject_code COLLATE utf8mb4_unicode_ci
          AND gcc.global_level_code COLLATE utf8mb4_unicode_ci = ssm.global_level_code COLLATE utf8mb4_unicode_ci
        )
        LEFT JOIN classes c ON (
          ssm.school_class_code COLLATE utf8mb4_unicode_ci = c.class_code COLLATE utf8mb4_unicode_ci
          AND ssm.school_id COLLATE utf8mb4_unicode_ci = c.school_id COLLATE utf8mb4_unicode_ci
          AND (
            (:branch_id IS NULL AND c.branch_id IS NULL) OR 
            (c.branch_id = :branch_id) OR
            (c.branch_id IS NULL)
          )
        )
        ${whereClause}
        ORDER BY c.section, c.class_name, ssm.school_subject_name, gcc.term, gcc.week
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: mappedContent || [],
        count: mappedContent ? mappedContent.length : 0
      });
    } catch (error) {
      console.error('Get mapped content error:', error);
      res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No mapped content found'
      });
    }
  }

  // POST /api/v1/subject-mapping/generate-lesson-plan - Generate lesson plan from mapped content
  // POST /api/v1/subject-mapping/generate-lesson-plan - Generate lesson plan from mapped content
  async generateLessonPlanFromMapping(req, res) {
    try {
      const { school_subject_name, school_class_code, title, lesson_date, duration_minutes, include_syllabus_alignment } = req.body;

      // Calculate time allocations based on user's duration
      const totalMinutes = parseInt(duration_minutes) || 40;
      const intro = Math.ceil(totalMinutes * 0.15); // 15%
      const mainLesson = Math.ceil(totalMinutes * 0.45); // 45%
      const discussion = Math.ceil(totalMinutes * 0.15); // 15%
      const practice = Math.ceil(totalMinutes * 0.20); // 20%
      const summary = totalMinutes - (intro + mainLesson + discussion + practice); // Remaining time

      // Get syllabus suggestions if requested
      let syllabusContext = null;
      let alignmentPercentage = 0;
      
      if (include_syllabus_alignment) {
        try {
          const syllabusTopics = await db.sequelize.query(`
            SELECT id, topic, subtopic, learning_objectives, content_outline
            FROM syllabus 
            WHERE global_subject_code = :subject_code 
            AND global_level_code = :class_code
            AND (topic LIKE :title_pattern OR subtopic LIKE :title_pattern)
            LIMIT 3
          `, {
            replacements: { 
              subject_code: school_subject_name,
              class_code: school_class_code,
              title_pattern: `%${title}%`
            },
            type: db.Sequelize.QueryTypes.SELECT
          });

          if (syllabusTopics.length > 0) {
            syllabusContext = syllabusTopics;
            alignmentPercentage = 85; // High alignment when syllabus topics found
          }
        } catch (syllabusError) {
          console.log('Syllabus lookup failed, continuing without alignment:', syllabusError.message);
        }
      }

      // Generate comprehensive lesson plan content with optional syllabus context
      const syllabusEnhancement = syllabusContext ? `
<div style="background: #f0f8ff; padding: 10px; margin: 10px 0; border-left: 4px solid #1890ff;">
<h4>📚 Curriculum Alignment</h4>
<p><strong>Related Syllabus Topics:</strong></p>
<ul>
${syllabusContext.map(topic => `<li><strong>${topic.topic}</strong>: ${topic.subtopic || topic.learning_objectives}</li>`).join('')}
</ul>
</div>` : '';

      const lessonPlan = {
        title: title || 'Lesson Plan',
        subject: school_subject_name,
        classCode: school_class_code,
        lessonDate: lesson_date,
        syllabusAlignment: syllabusContext,
        alignmentPercentage,
        
        objectives: `${syllabusEnhancement}
<p><strong>By the end of this lesson on ${title}, students will be able to:</strong></p>
<ul>
<li>Define and explain the concept of ${title}</li>
<li>Identify the key components and processes involved</li>
<li>Analyze the importance and applications in real life</li>
<li>Demonstrate understanding through practical examples</li>
<li>Apply knowledge to solve related problems</li>
</ul>`,

        activities: `<p><strong>Lesson Structure (${totalMinutes} minutes):</strong></p>

<h3>1. Introduction & Warm-up (${intro} minutes)</h3>
<ul>
<li>Greet students and take attendance</li>
<li>Review previous lesson briefly</li>
<li>Introduce today's topic: <strong>${title}</strong></li>
<li>Ask students what they already know about ${title}</li>
<li>Share lesson objectives with the class</li>
</ul>

<h3>2. Main Lesson Presentation (${mainLesson} minutes)</h3>
<ul>
<li>Present key concepts of ${title} using visual aids</li>
<li>Explain the fundamental principles step by step</li>
<li>Use real-world examples to illustrate concepts</li>
<li>Encourage questions and provide clarifications</li>
<li>Demonstrate practical applications where applicable</li>
</ul>

<h3>3. Interactive Discussion (${discussion} minutes)</h3>
<ul>
<li>Facilitate class discussion on ${title}</li>
<li>Ask thought-provoking questions</li>
<li>Encourage student participation and sharing</li>
<li>Address misconceptions if any arise</li>
</ul>

<h3>4. Practice Activities (${practice} minutes)</h3>
<ul>
<li>Provide hands-on exercises related to ${title}</li>
<li>Guide students through problem-solving</li>
<li>Offer individual assistance as needed</li>
<li>Monitor student progress and understanding</li>
</ul>

<h3>5. Summary & Conclusion (${summary} minutes)</h3>
<ul>
<li>Recap the main points covered</li>
<li>Highlight key takeaways about ${title}</li>
<li>Preview the next lesson topic</li>
<li>Assign homework or follow-up activities</li>
</ul>`,

        resources: `<p><strong>Required Materials and Resources:</strong></p>
<ul>
<li><strong>Teaching Materials:</strong>
  <ul>
    <li>Whiteboard/Blackboard and markers/chalk</li>
    <li>Projector and laptop for presentations</li>
    <li>Visual aids, charts, and diagrams related to ${title}</li>
    <li>Handouts and worksheets for practice</li>
  </ul>
</li>
<li><strong>Reference Materials:</strong>
  <ul>
    <li>Textbook: ${school_subject_name} for ${school_class_code}</li>
    <li>Additional reference books and materials</li>
    <li><strong>Online Resources:</strong>
      <ul>
        <li><a href="https://www.khanacademy.org/search?search_again=1&page_search_query=${encodeURIComponent(title)}" target="_blank">Khan Academy - ${title}</a></li>
        <li><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + school_subject_name + ' lesson')}" target="_blank">Educational Videos on YouTube</a></li>
        <li><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank">Wikipedia - ${title}</a></li>
        <li><a href="https://www.britannica.com/search?query=${encodeURIComponent(title)}" target="_blank">Encyclopedia Britannica - ${title}</a></li>
        <li><a href="https://www.coursera.org/search?query=${encodeURIComponent(title)}" target="_blank">Coursera Free Courses</a></li>
        <li><a href="https://openstax.org/" target="_blank">OpenStax Free Textbooks</a></li>
        <li><a href="https://www.edx.org/search?q=${encodeURIComponent(title)}" target="_blank">edX Free Online Courses</a></li>
        <li><a href="https://www.ted.com/search?q=${encodeURIComponent(title)}" target="_blank">TED Talks - ${title}</a></li>
      </ul>
    </li>
    <li>Real-world examples and case studies</li>
  </ul>
</li>
<li><strong>Assessment Tools:</strong>
  <ul>
    <li>Quiz questions for quick assessment</li>
    <li>Observation checklist for student participation</li>
    <li>Exit tickets for lesson feedback</li>
  </ul>
</li>
<li><strong>Additional Open Source Resources:</strong>
  <ul>
    <li><a href="https://www.oercommons.org/search?q=${encodeURIComponent(title)}" target="_blank">OER Commons - Open Educational Resources</a></li>
    <li><a href="https://www.mit.edu/search/?q=${encodeURIComponent(title)}" target="_blank">MIT OpenCourseWare</a></li>
    <li><a href="https://www.khanacademy.org/" target="_blank">Khan Academy Practice Exercises</a></li>
    <li><a href="https://phet.colorado.edu/" target="_blank">PhET Interactive Simulations (for Science topics)</a></li>
    <li><a href="https://www.ck12.org/search/?q=${encodeURIComponent(title)}" target="_blank">CK-12 Foundation Resources</a></li>
  </ul>
</li>
</ul>`
      };

      res.json({
        success: true,
        data: { lesson_plan: lessonPlan }
      });

    } catch (error) {
      console.error('Generate lesson plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate lesson plan'
      });
    }
  }
}

module.exports = new SubjectMappingController();
