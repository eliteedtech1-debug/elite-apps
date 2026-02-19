const OpenAI = require('openai');

class TimetableMakerService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateSmartTimetable(teachers, timeSlots, section, options = {}) {
    try {
      const prompt = this.buildPrompt(teachers, timeSlots, section, options);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert school timetable generator. Create optimal timetables considering teacher preferences, subject priorities, and Nigerian educational standards."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const aiSuggestion = response.choices[0].message.content;
      return this.parseAIResponse(aiSuggestion, teachers, timeSlots);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      // Fallback to rule-based generation
      return this.generateRuleBasedTimetable(teachers, timeSlots, section);
    }
  }

  buildPrompt(teachers, timeSlots, section, options) {
    const teacherInfo = teachers.map(t => 
      `${t.subject} (Priority: ${t.subject_priority}, Morning Preferred: ${t.is_morning_preferred ? 'Yes' : 'No'})`
    ).join(', ');

    const slotInfo = timeSlots.map(s => 
      `${s.start_time}-${s.end_time}`
    ).join(', ');

    return `
Generate a weekly timetable for ${section} section with the following constraints:

TEACHERS & SUBJECTS: ${teacherInfo}

TIME SLOTS: ${slotInfo}

RULES:
1. High priority subjects (Mathematics, English, Sciences) should be scheduled in morning slots
2. Teachers with morning preference should get early slots when possible
3. Avoid consecutive periods for the same teacher
4. Distribute subjects evenly across the week
5. Consider Nigerian school standards and prayer times

DAYS: Monday to Friday

Please provide a structured timetable assignment for each day and time slot.
Format: Day | Time | Subject | Reasoning
`;
  }

  parseAIResponse(aiResponse, teachers, timeSlots) {
    // Parse AI response and create structured timetable
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timetable = [];
    
    // Simple parsing - in production, this would be more sophisticated
    const lines = aiResponse.split('\n').filter(line => line.includes('|'));
    
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const day = parts[0];
        const time = parts[1];
        const subject = parts[2];
        
        const teacher = teachers.find(t => 
          t.subject.toLowerCase().includes(subject.toLowerCase()) ||
          subject.toLowerCase().includes(t.subject.toLowerCase())
        );
        
        const slot = timeSlots.find(s => 
          time.includes(s.start_time) || s.start_time.includes(time.split('-')[0])
        );
        
        if (teacher && slot && days.includes(day)) {
          timetable.push({
            day,
            teacher,
            slot,
            confidence: 0.9
          });
        }
      }
    }
    
    return timetable.length > 0 ? timetable : this.generateRuleBasedTimetable(teachers, timeSlots);
  }

  generateRuleBasedTimetable(teachers, timeSlots, section) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timetable = [];
    
    for (const day of days) {
      const dayTeachers = [...teachers];
      
      for (const slot of timeSlots) {
        if (dayTeachers.length === 0) break;
        
        // Smart assignment logic
        const isEarlySlot = slot.start_time < '10:00';
        let selectedTeacher;
        
        if (isEarlySlot) {
          // Prioritize high priority subjects in morning
          selectedTeacher = dayTeachers.find(t => 
            t.subject_priority === 'high' && t.is_morning_preferred === 1
          ) || dayTeachers.find(t => t.subject_priority === 'high') || dayTeachers[0];
        } else {
          // Random selection for afternoon slots
          selectedTeacher = dayTeachers[Math.floor(Math.random() * dayTeachers.length)];
        }
        
        if (selectedTeacher) {
          timetable.push({
            day,
            teacher: selectedTeacher,
            slot,
            confidence: 0.8
          });
          
          // Remove teacher to avoid consecutive periods
          const index = dayTeachers.findIndex(t => t.id === selectedTeacher.id);
          if (index > -1) dayTeachers.splice(index, 1);
        }
      }
    }
    
    return timetable;
  }

  async generateRecommendations(currentTimetable, teachers, section) {
    try {
      const prompt = `
Analyze this current timetable and provide AI recommendations for optimization:

CURRENT TIMETABLE: ${JSON.stringify(currentTimetable.slice(0, 10))}
AVAILABLE TEACHERS: ${teachers.length}
SECTION: ${section}

Provide 3-5 specific recommendations to improve:
1. Subject distribution
2. Teacher workload balance
3. Morning optimization for core subjects
4. Conflict resolution
5. Nigerian education standards compliance

Format as JSON array with: {type, priority, description, action}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert timetable optimizer. Provide specific, actionable recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const aiResponse = response.choices[0].message.content;
      
      try {
        return JSON.parse(aiResponse);
      } catch {
        // Fallback to rule-based recommendations
        return this.generateRuleBasedRecommendations(currentTimetable, teachers, section);
      }
    } catch (error) {
      console.error('AI Recommendations Error:', error);
      return this.generateRuleBasedRecommendations(currentTimetable, teachers, section);
    }
  }

  generateRuleBasedRecommendations(currentTimetable, teachers, section) {
    const recommendations = [];

    // Check morning optimization
    const morningSlots = currentTimetable.filter(t => t.start_time < '10:00');
    const morningHighPriority = morningSlots.filter(t => 
      ['Mathematics', 'English Language', 'Sciences'].some(subject => 
        t.subject.toLowerCase().includes(subject.toLowerCase())
      )
    );

    if (morningHighPriority.length / morningSlots.length < 0.6) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        description: 'Move more core subjects (Math, English, Sciences) to morning slots',
        action: 'reschedule_morning_priority'
      });
    }

    // Check teacher workload
    const teacherWorkload = {};
    currentTimetable.forEach(t => {
      teacherWorkload[t.teacher_id] = (teacherWorkload[t.teacher_id] || 0) + 1;
    });

    const maxWorkload = Math.max(...Object.values(teacherWorkload));
    const minWorkload = Math.min(...Object.values(teacherWorkload));

    if (maxWorkload - minWorkload > 5) {
      recommendations.push({
        type: 'balance',
        priority: 'medium',
        description: 'Teacher workload is unbalanced. Redistribute periods more evenly',
        action: 'balance_teacher_workload'
      });
    }

    // Check for gaps
    const dailySchedules = {};
    currentTimetable.forEach(t => {
      if (!dailySchedules[t.day]) dailySchedules[t.day] = [];
      dailySchedules[t.day].push(t);
    });

    Object.keys(dailySchedules).forEach(day => {
      const daySlots = dailySchedules[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (daySlots.length < 6) {
        recommendations.push({
          type: 'coverage',
          priority: 'medium',
          description: `${day} has only ${daySlots.length} periods. Consider adding more subjects`,
          action: 'fill_empty_slots'
        });
      }
    });

    return recommendations;
  }

  calculateOptimizationScore(timetable, teachers, timeSlots) {
    const totalSlots = 5 * timeSlots.length; // 5 days
    const filledSlots = timetable.length;
    const fillRate = (filledSlots / totalSlots) * 100;
    
    // Calculate morning optimization (high priority subjects in morning)
    const morningSlots = timetable.filter(t => t.slot.start_time < '10:00');
    const morningHighPriority = morningSlots.filter(t => t.teacher.subject_priority === 'high');
    const morningOptimization = morningSlots.length > 0 ? 
      (morningHighPriority.length / morningSlots.length) * 100 : 0;
    
    // Calculate teacher preference satisfaction
    const preferenceScore = timetable.filter(t => {
      const isEarlySlot = t.slot.start_time < '10:00';
      return !t.teacher.is_morning_preferred || isEarlySlot;
    }).length / timetable.length * 100;
    
    const overallScore = (fillRate * 0.4) + (morningOptimization * 0.3) + (preferenceScore * 0.3);
    
    return {
      percentage: Math.round(overallScore),
      grade: overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' : 'C',
      fillRate: Math.round(fillRate),
      morningOptimization: Math.round(morningOptimization),
      preferenceScore: Math.round(preferenceScore)
    };
  }
}

module.exports = TimetableMakerService;
