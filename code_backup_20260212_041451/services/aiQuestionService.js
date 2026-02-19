const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

class AIQuestionService {
  constructor() {
    // Initialize Gemini with multiple API keys for rotation
    this.geminiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4
    ].filter(key => key);
    
    this.currentGeminiIndex = 0;
    this.gemini = this.geminiKeys.length > 0 ? new GoogleGenerativeAI(this.geminiKeys[0]) : null;
    
    // Initialize OpenAI
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    
    // Initialize Groq (free, fast) - uses OpenAI-compatible API
    this.groq = process.env.GROQ_API_KEY ? new OpenAI({ 
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    }) : null;
    
    // Initialize Hugging Face (free)
    this.huggingfaceKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
    
    // Priority: Groq (free/fast) -> Gemini (free) -> HuggingFace (free) -> OpenAI (paid)
    this.modelPriority = ['groq', 'gemini', 'huggingface', 'openai'];
  }

  async generateQuestions(lessonPlan, questionConfig) {
    const { 
      questionTypes = ['multiple_choice', 'short_answer', 'essay'],
      difficulty = 'medium',
      count = 10,
      model = 'auto'
    } = questionConfig;

    const prompt = this.buildQuestionPrompt(lessonPlan, questionTypes, difficulty, count);
    
    try {
      if (model === 'auto') {
        return await this.generateWithFallback(prompt);
      } else {
        return await this.generateWithModel(prompt, model);
      }
    } catch (error) {
      console.error('AI Question Generation Error:', error);
      throw new Error('Failed to generate questions');
    }
  }

  buildQuestionPrompt(lessonPlan, questionTypes, difficulty, count) {
    const isSTEM = /math|physic|chemist|science|biology|algebra|calculus/i.test(lessonPlan.subject_code || '');
    
    return `Generate ${count} assessment questions based on this lesson plan:

LESSON DETAILS:
Title: ${lessonPlan.title}
Subject: ${lessonPlan.subject_code}
Class: ${lessonPlan.class_code}
Objectives: ${lessonPlan.objectives || 'Not specified'}
Content: ${lessonPlan.content || lessonPlan.activities || 'Not specified'}
Topics: ${lessonPlan.content || lessonPlan.activities || 'Not specified'}

QUESTION REQUIREMENTS:
- Types: ${questionTypes.join(', ')}
- Difficulty: ${difficulty}
- Total Questions: ${count}
${isSTEM ? '- Focus on calculations, problem-solving, and practical applications' : '- Focus on understanding, analysis, and application of concepts'}

RESPONSE FORMAT (Valid JSON only):
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text here",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Why this is correct",
      "difficulty": "medium",
      "marks": 2,
      "learning_objective": "Related objective"
    },
    {
      "type": "short_answer",
      "question": "Question text here",
      "sample_answer": "Expected answer",
      "marking_scheme": "Key points to award marks",
      "difficulty": "medium",
      "marks": 5,
      "learning_objective": "Related objective"
    }
  ],
  "total_marks": 50,
  "estimated_time": "45 minutes"
}

IMPORTANT GUIDELINES:
1. For STEM subjects: Create calculation-based questions with real numbers and formulas
2. For non-STEM: Focus on conceptual understanding and application
3. Ensure questions align with lesson objectives
4. Test different cognitive levels (remember, understand, apply, analyze)
5. Make questions age-appropriate for the class level
6. Include clear marking schemes with specific point allocation
7. Cover key concepts from the lesson content
8. Ensure all marks in questions are in brackets format: "(X marks)"
9. Return ONLY valid JSON - no additional text or explanations outside the JSON structure`;
  }

  async generateWithFallback(prompt) {
    const hasGemini = this.geminiKeys.length > 0;
    const hasOpenAI = !!this.openai;
    
    console.log('AI Status:', { hasGemini, hasOpenAI, geminiKeys: this.geminiKeys.length });
    
    if (!hasGemini && !hasOpenAI) {
      console.log('No AI keys configured, using mock');
      return this.generateMockQuestions(prompt);
    }

    const errors = [];
    for (const model of this.modelPriority) {
      try {
        console.log(`Trying AI model: ${model}`);
        const result = await this.generateWithModel(prompt, model);
        if (result && result.questions && result.questions.length > 0) {
          console.log(`Successfully generated ${result.questions.length} questions with ${model}`);
          return result;
        }
      } catch (error) {
        console.error(`${model} failed:`, error.message);
        errors.push(`${model}: ${error.message}`);
        continue;
      }
    }
    
    console.error('All AI models failed:', errors);
    // Return mock with error info
    const mock = this.generateMockQuestions(prompt);
    mock.ai_error = errors.join('; ');
    return mock;
  }

  generateMockQuestions(prompt) {
    const topicMatch = prompt.match(/Topic: (.+?)(?:\n|$)/i) || prompt.match(/Title: (.+?)(?:\n|$)/i);
    const countMatch = prompt.match(/Total Questions: (\d+)/);
    const typesMatch = prompt.match(/Types: (.+?)(?:\n|$)/);
    
    const topic = topicMatch ? topicMatch[1].trim() : 'General Knowledge';
    const count = countMatch ? parseInt(countMatch[1]) : 5;
    const types = typesMatch ? typesMatch[1].split(',').map(t => t.trim()) : ['multiple_choice', 'short_answer'];
    
    const questions = [];
    
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const qNum = i + 1;
      
      if (type === 'multiple_choice') {
        questions.push({
          type: 'multiple_choice',
          question: `Question ${qNum}: Which of the following best describes ${topic}?`,
          options: [
            `A correct statement about ${topic}`,
            `An incorrect statement about ${topic}`,
            `Another incorrect option`,
            `None of the above`
          ],
          correct_answer: `A correct statement about ${topic}`,
          explanation: `This is correct because it accurately describes ${topic}.`,
          difficulty: 'medium',
          marks: 2
        });
      } else if (type === 'short_answer') {
        questions.push({
          type: 'short_answer',
          question: `Question ${qNum}: Briefly explain the concept of ${topic}.`,
          sample_answer: `${topic} refers to... [Expected 2-3 sentences explaining the concept]`,
          difficulty: 'medium',
          marks: 3
        });
      } else if (type === 'essay') {
        questions.push({
          type: 'essay',
          question: `Question ${qNum}: Discuss the importance of ${topic} and its applications.`,
          sample_answer: `A comprehensive essay should cover: definition, importance, examples, and applications of ${topic}.`,
          difficulty: 'hard',
          marks: 10
        });
      } else if (type === 'fill_in_blank') {
        questions.push({
          type: 'fill_in_blank',
          question: `Question ${qNum}: ${topic} is defined as __________.`,
          correct_answer: `[correct definition of ${topic}]`,
          difficulty: 'easy',
          marks: 2
        });
      } else if (type === 'true_false') {
        questions.push({
          type: 'true_false',
          question: `Question ${qNum}: ${topic} is an important concept in this subject. (True/False)`,
          correct_answer: 'True',
          explanation: `This is true because ${topic} is fundamental to understanding the subject.`,
          difficulty: 'easy',
          marks: 1
        });
      } else {
        questions.push({
          type: type,
          question: `Question ${qNum}: Describe ${topic}.`,
          sample_answer: `Answer about ${topic}`,
          difficulty: 'medium',
          marks: 2
        });
      }
    }
    
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    
    return {
      questions,
      total_marks: totalMarks,
      time_limit: Math.ceil(totalMarks * 1.5),
      generated_by: 'mock_fallback',
      note: 'Configure OPENAI_API_KEY or GEMINI_API_KEY for AI-generated questions',
      generated_at: new Date().toISOString()
    };
  }

  async generateWithModel(prompt, model) {
    switch (model) {
      case 'gemini':
        return await this.generateWithGemini(prompt);
      case 'openai':
        return await this.generateWithOpenAI(prompt);
      case 'groq':
        return await this.generateWithGroq(prompt);
      case 'huggingface':
        return await this.generateWithHuggingFace(prompt);
      default:
        throw new Error(`Unsupported model: ${model}`);
    }
  }

  async generateWithGroq(prompt) {
    if (!this.groq) {
      throw new Error('Groq API key not configured');
    }

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator. Generate assessment questions in valid JSON format only.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
    });

    const text = completion.choices[0].message.content;
    return this.parseAIResponse(text, 'groq');
  }

  async generateWithHuggingFace(prompt) {
    if (!this.huggingfaceKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const response = await fetch(
      'https://router.huggingface.co/novita/v3/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.huggingfaceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-v3-0324',
          messages: [
            { role: 'system', content: 'You are an expert educator. Generate assessment questions in valid JSON format only.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 3000
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    return this.parseAIResponse(text, 'huggingface');
  }

  async generateWithGemini(prompt) {
    if (!this.gemini || this.geminiKeys.length === 0) {
      throw new Error('Gemini API key not configured');
    }

    let lastError;
    
    // Try all available Gemini keys
    for (let attempt = 0; attempt < this.geminiKeys.length; attempt++) {
      try {
        const currentKey = this.geminiKeys[this.currentGeminiIndex];
        const geminiClient = new GoogleGenerativeAI(currentKey);
        const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return this.parseAIResponse(text, 'gemini');
      } catch (error) {
        lastError = error;
        console.warn(`Gemini key ${this.currentGeminiIndex + 1} failed:`, error.message);
        
        // Rotate to next key
        this.currentGeminiIndex = (this.currentGeminiIndex + 1) % this.geminiKeys.length;
        
        // If quota exceeded, try next key immediately
        if (error.message.includes('quota') || error.message.includes('limit')) {
          continue;
        }
        
        // For other errors, wait a bit before trying next key
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw lastError || new Error('All Gemini API keys failed');
  }

  async generateWithOpenAI(prompt) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator who creates high-quality assessment questions. Always respond with valid JSON format as specified in the prompt.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: 'json_object' }
      });

      const text = completion.choices[0].message.content;
      return this.parseAIResponse(text, 'openai');
    } catch (error) {
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI quota exceeded');
      }
      throw error;
    }
  }

  parseAIResponse(text, model) {
    try {
      // Clean the response text
      let cleanText = text.trim();
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*|\s*```/g, '');
      cleanText = cleanText.replace(/```\s*|\s*```/g, '');
      
      // Extract JSON from response
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate response structure
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response structure - missing questions array');
      }

      // Validate each question
      parsed.questions.forEach((q, index) => {
        if (!q.type || !q.question || !q.marks) {
          throw new Error(`Question ${index + 1} missing required fields`);
        }
        
        // Ensure marks are numbers
        if (typeof q.marks !== 'number') {
          q.marks = parseInt(q.marks) || 1;
        }
      });

      // Calculate total marks if not provided
      if (!parsed.total_marks) {
        parsed.total_marks = parsed.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
      }

      // Add metadata
      return {
        ...parsed,
        generated_by: model,
        generated_at: new Date().toISOString(),
        question_count: parsed.questions.length
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response:', text);
      throw new Error(`Invalid AI response format: ${error.message}`);
    }
  }

  // Get available models
  getAvailableModels() {
    const models = [];
    if (this.gemini) models.push({ id: 'gemini', name: 'Google Gemini', status: 'available' });
    if (this.openai) models.push({ id: 'openai', name: 'OpenAI GPT', status: 'available' });
    
    return models;
  }

  // Set model priority
  setModelPriority(priority) {
    this.modelPriority = priority;
  }
}

module.exports = new AIQuestionService();
