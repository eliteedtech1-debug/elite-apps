const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const { authorizeReview, reviewLessonPlan, getReviewHistory } = require('../controllers/lessonPlanReviewController');
const { requireAdmin, requireBranchAccess } = require('../middleware/lessonPlanAuth');
const { auditMiddleware } = require('../middleware/auditLogger');
const { sanitizeInput, validateRemarkLength } = require('../middleware/sanitizer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.use(authenticateToken);
router.use(auditMiddleware);
router.use(sanitizeInput);

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const school_id = req.headers['x-school-id'];
    const branch_id = req.headers['x-branch-id'];
    
    let where = 'WHERE school_id = :school_id';
    const replacements = { school_id };
    
    if (branch_id) {
      where += ' AND branch_id = :branch_id';
      replacements.branch_id = branch_id;
    }
    
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM lesson_plans ${where}
    `, { replacements, type: QueryTypes.SELECT });
    res.json({ success: true, data: stats[0] || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Test endpoint for debugging
router.get('/test', async (req, res) => {
  try {
    const school_id = req.headers['x-school-id'];
    const branch_id = req.headers['x-branch-id'];
    
    let where = 'WHERE school_id = :school_id';
    const replacements = { school_id };
    
    if (branch_id) {
      where += ' AND branch_id = :branch_id';
      replacements.branch_id = branch_id;
    }
    
    // Simple test query
    const plans = await sequelize.query(`
      SELECT id, title, status
      FROM lesson_plans 
      ${where}
      LIMIT 5
    `, { replacements, type: QueryTypes.SELECT });
    
    res.json({ success: true, data: plans, message: 'Test query successful' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get lesson plans
router.get('/', async (req, res) => {
  try {
    const school_id = req.headers['x-school-id'];
    const branch_id = req.headers['x-branch-id'];
    const { status, academic_year, term, teacher_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let where = 'WHERE school_id = :school_id';
    const replacements = { school_id, limit: parseInt(limit), offset: parseInt(offset) };
    
    if (branch_id) {
      where += ' AND branch_id = :branch_id';
      replacements.branch_id = branch_id;
    }
    
    // Handle multiple status values (comma-separated)
    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      const statusPlaceholders = statusList.map((_, index) => `:status${index}`).join(',');
      where += ` AND status IN (${statusPlaceholders})`;
      statusList.forEach((s, index) => {
        replacements[`status${index}`] = s;
      });
    }
    
    if (academic_year) { where += ' AND academic_year = :academic_year'; replacements.academic_year = academic_year; }
    if (term) { where += ' AND term = :term'; replacements.term = term; }
    if (teacher_id) { where += ' AND teacher_id = :teacher_id'; replacements.teacher_id = teacher_id; }
    
    const plans = await sequelize.query(`
      SELECT id, title, subject_code, class_code, term, academic_year, 
             lesson_date, duration_minutes, objectives, content, 
             activities, resources, status, ai_generated, school_id, branch_id, 
             created_at, updated_at
      FROM lesson_plans
      ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    `, { replacements, type: QueryTypes.SELECT });
    
    const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM lesson_plans ${where}`, { replacements, type: QueryTypes.SELECT });
    const total = countResult[0]?.total || 0;
    
    res.json({ success: true, data: plans, pagination: { total_items: total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error('Error fetching lesson plans:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Review lesson plan with authorization and audit trail
router.post('/:id/review', requireAdmin, validateRemarkLength, authorizeReview, reviewLessonPlan);

// Get review history for a lesson plan
router.get('/:id/reviews', requireAdmin, getReviewHistory);

// Generate AI lesson plan
router.post('/generate-ai', async (req, res) => {
  try {
    const { topic, subject, class_level, duration = 45 } = req.body;
    
    if (!topic || !subject || !class_level) {
      return res.status(400).json({ 
        success: false, 
        message: 'Topic, subject, and class_level are required' 
      });
    }

    let content = null;
    let aiProvider = 'fallback';
    let errors = [];

    console.log('AI Generation attempt for:', { topic, subject, class_level });
    console.log('Available API keys:', {
      huggingface: !!process.env.HUGGINGFACE_API_KEY,
      cohere: !!process.env.COHERE_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY
    });

    // Try Hugging Face first (free) - use 2026 router endpoint
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        console.log('Trying Hugging Face...');
        const hfResponse = await fetch('https://router.huggingface.co/hf-inference/models/gpt2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: `Create a lesson plan for ${topic} in ${subject} for ${class_level} students. Include objectives, content, activities, and resources.`,
            parameters: { max_length: 200, temperature: 0.7 }
          })
        });
        
        console.log('HF Response status:', hfResponse.status);
        if (hfResponse.ok) {
          const hfData = await hfResponse.json();
          console.log('HF Response:', hfData);
          if (hfData && hfData[0]?.generated_text) {
            aiProvider = 'huggingface';
            content = parseAIResponse(hfData[0].generated_text, topic, subject, class_level);
          }
        } else {
          const errorText = await hfResponse.text();
          errors.push(`HF: ${hfResponse.status} - ${errorText}`);
        }
      } catch (hfError) {
        console.log('Hugging Face failed:', hfError.message);
        errors.push(`HF: ${hfError.message}`);
      }
    }

    // Try Cohere (free tier) - use 2026 model
    if (!content && process.env.COHERE_API_KEY) {
      try {
        console.log('Trying Cohere...');
        const cohereResponse = await fetch('https://api.cohere.com/v2/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'command-a-03-2025',
            messages: [{
              role: 'user',
              content: `Create a lesson plan for "${topic}" in ${subject} for ${class_level} students. Include objectives, content, activities, and resources.`
            }],
            max_tokens: 400
          })
        });
        
        console.log('Cohere Response status:', cohereResponse.status);
        if (cohereResponse.ok) {
          const cohereData = await cohereResponse.json();
          console.log('Cohere Response:', cohereData);
          if (cohereData.message?.content?.[0]?.text) {
            aiProvider = 'cohere';
            content = parseAIResponse(cohereData.message.content[0].text, topic, subject, class_level);
          }
        } else {
          const errorText = await cohereResponse.text();
          errors.push(`Cohere: ${cohereResponse.status} - ${errorText}`);
        }
      } catch (cohereError) {
        console.log('Cohere failed:', cohereError.message);
        errors.push(`Cohere: ${cohereError.message}`);
      }
    }

    // Try Gemini (free tier) if others failed
    if (!content && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const result = await model.generateContent(`Create a detailed lesson plan for "${topic}" in ${subject} for ${class_level} students (${duration} minutes). Include: 1) Learning objectives (4 points), 2) Lesson content with explanations, 3) Learning activities (4 activities), 4) Required resources (4 items).`);
        
        const text = result.response.text();
        if (text) {
          aiProvider = 'gemini';
          content = parseAIResponse(text, topic, subject, class_level);
        }
      } catch (geminiError) {
        console.log('Gemini failed:', geminiError.message);
      }
    }

    // Try OpenAI (free tier $5 credit) if others failed
    if (!content && process.env.OPENAI_API_KEY) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo', // Cheapest model
            messages: [{
              role: 'user',
              content: `Create a lesson plan for "${topic}" in ${subject} for ${class_level} students. Include objectives, content, activities, and resources.`
            }],
            max_tokens: 600, // Limit tokens to save credits
            temperature: 0.7
          })
        });
        
        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          if (openaiData.choices?.[0]?.message?.content) {
            aiProvider = 'openai';
            content = parseAIResponse(openaiData.choices[0].message.content, topic, subject, class_level);
          }
        }
      } catch (openaiError) {
        console.log('OpenAI failed:', openaiError.message);
      }
    }

    // Fallback to simple generation
    if (!content) {
      content = {
        title: `${topic} - ${subject} (${class_level})`,
        content: `<h2>${topic}</h2><p>${topic} is an important concept in ${subject} that students need to understand.</p><h3>Key Points:</h3><ul><li>Fundamental principles of ${topic}</li><li>Practical applications in ${subject}</li><li>Problem-solving strategies</li></ul>`,
        objectives: [
          `Understand the fundamental concepts of ${topic}`,
          `Apply ${topic} principles to solve problems`,
          `Explain the importance of ${topic} in ${subject}`,
          `Connect ${topic} to real-world applications`
        ],
        activities: [
          'Interactive demonstrations and explanations',
          'Practice exercises and problem-solving',
          'Group discussions and collaboration',
          'Real-world application examples'
        ],
        resources: [
          'Textbook and reference materials',
          'Visual aids and diagrams',
          'Practice worksheets and exercises',
          'Assessment materials'
        ]
      };
    }

    res.json({ success: true, data: content, ai_provider: aiProvider, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper function to parse AI responses
function parseAIResponse(aiText, topic, subject, class_level) {
  try {
    // Convert LaTeX math to HTML
    let content = aiText
      .replace(/\\\((.*?)\\\)/g, '<span class="math">$1</span>') // Inline math
      .replace(/\\\[(.*?)\\\]/g, '<div class="math-block">$1</div>') // Block math
      .replace(/\$\$(.*?)\$\$/g, '<div class="math-block">$1</div>') // Block math $$
      .replace(/\$(.*?)\$/g, '<span class="math">$1</span>') // Inline math $
      .replace(/\\log_(\w+)\(([^)]+)\)/g, 'log<sub>$1</sub>($2)') // log_b(x)
      .replace(/(\w+)\^(\w+)/g, '$1<sup>$2</sup>') // Exponents
      .replace(/(\w+)_(\w+)/g, '$1<sub>$2</sub>') // Subscripts
      .replace(/#{1,6}\s*/g, '<h3>') // Headers
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/---/g, '<hr>') // Horizontal rules
      .replace(/\n\n/g, '</p><p>') // Paragraphs
      .replace(/^\s*(\d+\.)/gm, '<li>$1') // Numbered lists
      .replace(/^\s*-\s*/gm, '<li>'); // Bullet lists

    // Wrap in paragraphs
    if (!content.includes('<h') && !content.includes('<p>')) {
      content = `<p>${content}</p>`;
    }

    // Extract sections
    const objectives = extractSection(aiText, ['objectives', 'learning objectives', 'goals', 'by the end']) || [
      `Understand the fundamental concepts of ${topic}`,
      `Apply ${topic} principles to solve problems`,
      `Analyze ${topic} in the context of ${subject}`,
      `Evaluate real-world applications of ${topic}`
    ];
    
    const activities = extractSection(aiText, ['activities', 'learning activities', 'exercises', 'teaching']) || [
      'Interactive demonstrations',
      'Guided practice exercises',
      'Group discussions and collaboration',
      'Real-world problem solving'
    ];
    
    const resources = extractSection(aiText, ['resources', 'materials', 'equipment']) || [
      'Textbook and reference materials',
      'Visual aids and diagrams',
      'Practice worksheets',
      'Assessment tools'
    ];

    return {
      title: `${topic} - ${subject} (${class_level})`,
      content,
      objectives: Array.isArray(objectives) ? objectives : objectives.split('\n').filter(Boolean),
      activities: Array.isArray(activities) ? activities : activities.split('\n').filter(Boolean),
      resources: Array.isArray(resources) ? resources : resources.split('\n').filter(Boolean)
    };
  } catch (error) {
    console.log('Parse error:', error);
    return null;
  }
}

function extractSection(text, keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}:?\\s*([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
    const match = text.match(regex);
    if (match) {
      return match[1].split('\n').map(line => line.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
    }
  }
  return null;
}

module.exports = router;
