const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/v1/syllabus/suggestions - Get syllabus suggestions for lesson planning
router.get('/suggestions', async (req, res) => {
  try {
    const { subject_code, class_code, lesson_title } = req.query;
    const { school_id } = req.user;

    if (!subject_code || !class_code) {
      return res.status(400).json({
        success: false,
        error: 'subject_code and class_code are required'
      });
    }

    // Get relevant syllabus topics based on subject and class
    const suggestions = await db.sequelize.query(`
      SELECT 
        s.id,
        s.title as topic,
        s.content as subtopic,
        s.objectives as learning_objectives,
        s.content as content_outline,
        s.week as week_number,
        s.term,
        CASE 
          WHEN :lesson_title IS NOT NULL AND s.title LIKE CONCAT('%', :lesson_title, '%') THEN 100
          WHEN :lesson_title IS NOT NULL AND s.content LIKE CONCAT('%', :lesson_title, '%') THEN 90
          WHEN :lesson_title IS NOT NULL AND s.objectives LIKE CONCAT('%', :lesson_title, '%') THEN 80
          ELSE 70
        END as relevance_score
      FROM syllabus s
      WHERE s.global_subject_code = :subject_code
      AND s.global_level_code = :class_code
      AND s.is_global_content = 1
      ORDER BY relevance_score DESC, s.week ASC
      LIMIT 10
    `, {
      replacements: { subject_code, class_code, lesson_title: lesson_title || null },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Get coverage statistics for this teacher
    const coverage = await db.sequelize.query(`
      SELECT 
        COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(syllabus_topics, '$[*].id'))) as covered_topics,
        COUNT(*) as total_lessons,
        AVG(curriculum_alignment_percentage) as avg_alignment
      FROM lesson_plans 
      WHERE teacher_id = :teacher_id 
      AND subject_code = :subject_code 
      AND class_code = :class_code
      AND syllabus_topics IS NOT NULL
    `, {
      replacements: { 
        teacher_id: req.user.id, 
        subject_code, 
        class_code 
      },
      type: db.Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        suggestions,
        coverage_stats: coverage[0],
        total_available: suggestions.length
      }
    });

  } catch (error) {
    console.error('Syllabus suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get syllabus suggestions'
    });
  }
});

// GET /api/v1/syllabus/recommendations - Smart recommendations for what to teach next
router.get('/recommendations', async (req, res) => {
  try {
    const { subject_code, class_code } = req.query;
    const { id: teacher_id } = req.user;
    
    if (!subject_code || !class_code) {
      return res.status(400).json({
        success: false,
        error: 'subject_code and class_code are required'
      });
    }

    // Get covered topics from lesson plans
    const coveredTopics = await db.sequelize.query(`
      SELECT DISTINCT syllabus_topics
      FROM lesson_plans 
      WHERE subject_code = :subject_code 
      AND class_code = :class_code 
      AND teacher_id = :teacher_id
      AND syllabus_topics IS NOT NULL
    `, {
      replacements: { subject_code, class_code, teacher_id },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Extract covered topic IDs
    const coveredIds = new Set();
    coveredTopics.forEach(row => {
      if (row.syllabus_topics) {
        try {
          const topics = JSON.parse(row.syllabus_topics);
          topics.forEach(id => coveredIds.add(id));
        } catch (e) {}
      }
    });

    // Get all available topics with sequencing
    const allTopics = await db.sequelize.query(`
      SELECT 
        id,
        JSON_UNQUOTE(JSON_EXTRACT(syllabus_content, '$.topic')) as topic,
        JSON_UNQUOTE(JSON_EXTRACT(syllabus_content, '$.subtopic')) as subtopic,
        JSON_UNQUOTE(JSON_EXTRACT(syllabus_content, '$.learning_objectives')) as learning_objectives,
        prerequisites,
        difficulty_level,
        estimated_duration,
        sequence_order
      FROM syllabus_suggestions 
      WHERE subject_code = :subject_code AND class_code = :class_code
      ORDER BY sequence_order ASC
    `, {
      replacements: { subject_code, class_code },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Smart recommendation logic
    const recommendations = [];
    
    for (const topic of allTopics) {
      // Skip if already covered
      if (coveredIds.has(topic.id)) continue;
      
      // Check prerequisites
      let prerequisitesMet = true;
      if (topic.prerequisites) {
        try {
          const prereqs = JSON.parse(topic.prerequisites);
          for (const prereq of prereqs) {
            const prereqTopic = allTopics.find(t => {
              try {
                const content = JSON.parse(t.syllabus_content || '{}');
                return content.topic === prereq;
              } catch (e) { return false; }
            });
            if (prereqTopic && !coveredIds.has(prereqTopic.id)) {
              prerequisitesMet = false;
              break;
            }
          }
        } catch (e) {}
      }
      
      if (prerequisitesMet) {
        recommendations.push({
          ...topic,
          recommendation_reason: coveredIds.size === 0 ? 'foundational_topic' : 'next_in_sequence',
          priority: topic.sequence_order || 999
        });
      }
    }

    // Sort by priority and limit to top 5
    recommendations.sort((a, b) => a.priority - b.priority);
    const topRecommendations = recommendations.slice(0, 5);

    res.json({
      success: true,
      data: {
        recommendations: topRecommendations,
        coverage_stats: {
          covered_topics: coveredIds.size,
          total_topics: allTopics.length,
          completion_percentage: allTopics.length > 0 ? Math.round((coveredIds.size / allTopics.length) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('Smart recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

// POST /api/v1/syllabus/cache-suggestions - Cache syllabus suggestions for faster access
router.post('/cache-suggestions', async (req, res) => {
  try {
    const { subject_code, class_code, topic_keywords, syllabus_content } = req.body;

    await db.sequelize.query(`
      INSERT INTO syllabus_suggestions (subject_code, class_code, topic_keywords, syllabus_content)
      VALUES (:subject_code, :class_code, :topic_keywords, :syllabus_content)
      ON DUPLICATE KEY UPDATE 
      topic_keywords = :topic_keywords,
      syllabus_content = :syllabus_content,
      created_at = NOW()
    `, {
      replacements: {
        subject_code,
        class_code,
        topic_keywords,
        syllabus_content: JSON.stringify(syllabus_content)
      }
    });

    res.json({
      success: true,
      message: 'Syllabus suggestions cached successfully'
    });

  } catch (error) {
    console.error('Cache suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cache suggestions'
    });
  }
});

module.exports = router;
