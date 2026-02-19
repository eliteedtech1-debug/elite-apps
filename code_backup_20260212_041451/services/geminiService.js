const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  async generateLessonContent(lessonPlan, classLevel) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Determine age-appropriate language based on class level
      const languageGuidance = this.getLanguageGuidance(classLevel);

      const prompt = `You are creating educational content that students will read and learn from directly.

**Context:**
- Class Level: ${classLevel}
- ${languageGuidance}
- Topic: ${lessonPlan.title}
- Duration: ${lessonPlan.duration_minutes} minutes
- Subject: ${lessonPlan.subject_code}

**Lesson Plan Overview:**
${lessonPlan.content || ''}

**Learning Objectives:**
${lessonPlan.objectives || ''}

**Your Task:**
Write comprehensive lesson content that students can read, understand, and learn from independently. This is NOT teacher notes - write directly to the students.

**Structure:**

1. **Introduction**
   - Start with an engaging question or scenario
   - Explain why this topic is important
   - State what students will learn in simple terms

2. **Main Content**
   - Explain concepts clearly and thoroughly
   - Define all key terms in student-friendly language
   - Use examples students can relate to
   - Break complex ideas into simple steps
   - Include diagrams descriptions where helpful
   - Add "Did you know?" facts to maintain interest

3. **Practice & Application**
   - Provide worked examples with step-by-step solutions
   - Include practice questions students can try
   - Show real-world applications
   - Add reflection questions

4. **Summary**
   - Recap key points in bullet format
   - Provide a simple way to remember main concepts
   - Suggest further reading or exploration

**Writing Style:**
- Write in second person ("you will learn", "you can see")
- Use ${languageGuidance.toLowerCase()}
- Be conversational but educational
- Include analogies and comparisons
- Make it engaging and easy to follow
- Format with HTML: <h3>, <p>, <ul>, <li>, <strong>, <em>
- DO NOT wrap entire sections in <ol> or <ul> tags - use them only for lists within content

**Example Opening:**
"Have you ever wondered why...? In this lesson, you will discover..."

Generate student-friendly educational content that is clear, engaging, and ready for students to read and learn from.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return {
        success: true,
        content: text,
        metadata: {
          model: 'gemini-1.5-flash',
          classLevel,
          duration: lessonPlan.duration_minutes
        }
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getLanguageGuidance(classLevel) {
    const level = classLevel.toUpperCase();
    
    if (level.includes('JSS1') || level.includes('JSS2')) {
      return 'Use simple, clear language appropriate for 10-12 year olds. Avoid complex terminology. Use concrete examples.';
    } else if (level.includes('JSS3') || level.includes('SS1')) {
      return 'Use age-appropriate language for 13-14 year olds. Introduce academic vocabulary with explanations. Use relatable examples.';
    } else if (level.includes('SS2') || level.includes('SS3')) {
      return 'Use formal academic language appropriate for 15-17 year olds. Include subject-specific terminology. Use real-world applications.';
    } else if (level.includes('PRIMARY') || level.includes('BASIC')) {
      return 'Use very simple language for 6-11 year olds. Short sentences. Visual and hands-on examples.';
    } else {
      return 'Use clear, professional academic language appropriate for the student age group.';
    }
  }

  async generateLessonPlan(syllabusTopics, className, subject, duration) {
    // Existing method for generating lesson plans from syllabus
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const topicsText = syllabusTopics.map(t => `- ${t.title}: ${t.description || ''}`).join('\n');

      const prompt = `Create a comprehensive lesson plan for ${className} students in ${subject} (${duration} minutes).

**Topics to Cover:**
${topicsText}

**Generate:**
1. Learning Objectives (4 specific, measurable objectives)
2. Lesson Content (detailed explanation of concepts)
3. Learning Activities (4 engaging activities)
4. Required Resources (4 specific items)
5. Assessment Methods (formative and summative)
6. Homework Assignment

**Formatting Rules:**
- Use HTML tags: <h3>, <p>, <ul>, <li>, <strong>, <em>
- DO NOT wrap entire sections in <ol> or <ul> tags
- Use list tags only for actual lists within content
- Be specific and practical`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return this.parseLessonPlanResponse(text);
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  parseLessonPlanResponse(text) {
    return {
      objectives: this.extractSection(text, 'objectives'),
      content: this.extractSection(text, 'content'),
      activities: this.extractSection(text, 'activities'),
      resources: this.extractSection(text, 'resources'),
      assessment_methods: this.extractSection(text, 'assessment'),
      homework: this.extractSection(text, 'homework')
    };
  }

  extractSection(text, section) {
    const regex = new RegExp(`${section}[:\\s]+(.*?)(?=\\n\\n|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }
}

module.exports = new GeminiService();
