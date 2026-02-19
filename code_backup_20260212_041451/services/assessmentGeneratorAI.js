const { GoogleGenerativeAI } = require('@google/generative-ai');

class AssessmentGeneratorAI {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }

  async generateAssessment(lessonContent, options = {}) {
    const {
      questionTypes = ['multiple_choice', 'short_answer'],
      difficulty = 'primary',
      questionCount = 10,
      subject,
      classLevel
    } = options;

    const prompt = `
    Generate assessment questions for Nigerian ${classLevel} students:
    
    LESSON CONTENT:
    ${lessonContent}
    
    REQUIREMENTS:
    - Subject: ${subject}
    - Class Level: ${classLevel}
    - Question Types: ${questionTypes.join(', ')}
    - Difficulty: ${difficulty}
    - Total Questions: ${questionCount}
    
    QUESTION DISTRIBUTION:
    ${questionTypes.includes('multiple_choice') ? '- 60% Multiple Choice (4 options, 1 correct)' : ''}
    ${questionTypes.includes('short_answer') ? '- 30% Short Answer' : ''}
    ${questionTypes.includes('essay') ? '- 10% Essay Questions' : ''}
    
    FORMAT (JSON Response):
    {
      "assessment_title": "Assessment title",
      "instructions": "Student instructions",
      "questions": [
        {
          "type": "multiple_choice",
          "question": "Question text",
          "options": ["A", "B", "C", "D"],
          "correct_answer": "A",
          "explanation": "Why this is correct",
          "marks": 2
        },
        {
          "type": "short_answer",
          "question": "Question text",
          "sample_answer": "Expected answer",
          "marks": 5
        }
      ],
      "total_marks": 50,
      "time_limit": 60
    }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Invalid AI response format');
    } catch (error) {
      console.error('Assessment generation error:', error);
      throw new Error('Failed to generate assessment');
    }
  }

  async generateQuestionBank(syllabusTopics, options = {}) {
    const {
      questionsPerTopic = 5,
      questionTypes = ['multiple_choice', 'short_answer'],
      subject,
      classLevel
    } = options;

    const questions = [];

    for (const topic of syllabusTopics) {
      try {
        const topicAssessment = await this.generateAssessment(topic.content, {
          questionTypes,
          difficulty: classLevel.toLowerCase(),
          questionCount: questionsPerTopic,
          subject,
          classLevel
        });

        questions.push({
          topic_id: topic.id,
          topic_title: topic.title,
          questions: topicAssessment.questions
        });
      } catch (error) {
        console.error(`Failed to generate questions for topic ${topic.id}:`, error);
      }
    }

    return {
      subject,
      classLevel,
      totalTopics: syllabusTopics.length,
      totalQuestions: questions.reduce((sum, topic) => sum + topic.questions.length, 0),
      questionBank: questions
    };
  }
}

module.exports = new AssessmentGeneratorAI();
