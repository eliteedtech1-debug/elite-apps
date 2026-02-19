const db = require("../models");

/**
 * Enhanced Time Slot Service for Nigerian Schools
 * Integrates with teacher_classes and provides AI-powered scheduling
 */
class EnhancedTimeSlotService {
  
  /**
   * Get Nigerian school templates
   */
  async getNigerianTemplates(schoolLevel = null, region = 'all') {
    try {
      let whereClause = 'WHERE is_system_template = TRUE AND is_active = TRUE';
      const replacements = {};
      
      if (schoolLevel) {
        whereClause += ' AND (school_level = :schoolLevel OR school_level = "both")';
        replacements.schoolLevel = schoolLevel;
      }
      
      if (region !== 'all') {
        whereClause += ' AND (region = :region OR region = "all")';
        replacements.region = region;
      }
      
      const templates = await db.sequelize.query(
        `SELECT * FROM time_slot_templates ${whereClause} ORDER BY school_level, region`,
        {
          replacements,
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      
      return { success: true, data: templates };
    } catch (error) {
      console.error('Error fetching Nigerian templates:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Generate time slots from template for a specific section
   */
  async generateFromTemplate(templateId, schoolId, section) {
    try {
      // Get template data
      const [template] = await db.sequelize.query(
        'SELECT * FROM time_slot_templates WHERE id = :templateId',
        {
          replacements: { templateId },
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      
      if (!template) {
        return { success: false, error: 'Template not found' };
      }
      
      const periods = JSON.parse(template.template_data).periods;
      const timeSlots = [];
      
      // Generate time slots for each day of the week
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      for (const day of daysOfWeek) {
        for (const period of periods) {
          const slotId = `${templateId}_${schoolId}_${section}_${day}_${period.start}`.replace(/[^a-zA-Z0-9]/g, '_');
          
          timeSlots.push({
            slot_id: slotId,
            school_id: schoolId,
            section: section,
            slot_name: `${period.name} - ${day}`,
            start_time: period.start,
            end_time: period.end,
            duration_minutes: period.duration || this.calculateDuration(period.start, period.end),
            slot_type: period.type,
            template_id: templateId,
            day_of_week: day,
            is_active: true,
            activities: period.type === 'Academic' ? 'Lesson' : period.type
          });
        }
      }
      
      return { success: true, data: timeSlots };
    } catch (error) {
      console.error('Error generating from template:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get teacher assignments for AI optimization
   */
  async getTeacherAssignments(schoolId, section = null) {
    try {
      let query = `SELECT 
          tc.id,
          tc.teacher_id,
          tc.class_code,
          tc.class_name,
          tc.subject_code,
          tc.subject as subject_name,
          tc.subject_priority,
          tc.is_morning_preferred,
          tc.max_periods_per_day,
          CASE 
            WHEN tc.subject IN ('Mathematics', 'Further Mathematics', 'Physics', 'Chemistry') THEN 'STEM'
            WHEN tc.subject IN ('English', 'Literature', 'History') THEN 'Languages'
            WHEN tc.subject IN ('Fine Arts', 'Music', 'Physical Education') THEN 'Creative'
            ELSE 'General'
          END as subject_category
        FROM teacher_classes tc`;
      
      const replacements = { schoolId };
      let whereClause = ' WHERE tc.school_id = :schoolId';
      
      if (section) {
        // Join with classes table to filter by section
        query = `SELECT 
          tc.id,
          tc.teacher_id,
          tc.class_code,
          tc.class_name,
          tc.subject_code,
          tc.subject as subject_name,
          tc.subject_priority,
          tc.is_morning_preferred,
          tc.max_periods_per_day,
          CASE 
            WHEN tc.subject IN ('Mathematics', 'Further Mathematics', 'Physics', 'Chemistry') THEN 'STEM'
            WHEN tc.subject IN ('English', 'Literature', 'History') THEN 'Languages'
            WHEN tc.subject IN ('Fine Arts', 'Music', 'Physical Education') THEN 'Creative'
            ELSE 'General'
          END as subject_category
        FROM teacher_classes tc
        JOIN classes c ON tc.class_code = c.class_code`;
        
        whereClause = ' WHERE tc.school_id = :schoolId AND c.section = :section';
        replacements.section = section;
      }
      
      query += whereClause + ' ORDER BY tc.subject_priority DESC, tc.is_morning_preferred DESC';
      
      const assignments = await db.sequelize.query(query, {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      });
      
      return { success: true, data: assignments };
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Apply Nigerian education optimization rules
   */
  applyNigerianOptimization(timeSlots, teacherAssignments) {
    const optimizedSlots = [];
    const teacherSchedule = new Map(); // Track teacher availability
    
    // Sort time slots by day and time
    const sortedSlots = timeSlots.sort((a, b) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const dayDiff = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
      if (dayDiff !== 0) return dayDiff;
      return this.timeToMinutes(a.start_time) - this.timeToMinutes(b.start_time);
    });
    
    // Group assignments by class
    const assignmentsByClass = new Map();
    teacherAssignments.forEach(assignment => {
      if (!assignmentsByClass.has(assignment.class_code)) {
        assignmentsByClass.set(assignment.class_code, []);
      }
      assignmentsByClass.get(assignment.class_code).push(assignment);
    });
    
    // Apply Nigerian education rules
    for (const slot of sortedSlots) {
      if (slot.slot_type !== 'Academic') {
        optimizedSlots.push(slot);
        continue;
      }
      
      const classAssignments = assignmentsByClass.get(slot.class_code) || [];
      const isMorningSlot = this.timeToMinutes(slot.start_time) < 720; // Before 12:00 PM
      
      // Find best teacher for this slot
      let bestAssignment = null;
      let bestScore = -1;
      
      for (const assignment of classAssignments) {
        const teacherKey = `${assignment.teacher_id}_${slot.day_of_week}_${slot.start_time}`;
        
        // Skip if teacher is already assigned at this time
        if (teacherSchedule.has(teacherKey)) continue;
        
        let score = 0;
        
        // Nigerian education optimization: Morning priority for STEM subjects
        if (isMorningSlot && assignment.is_morning_preferred) {
          score += 30;
        }
        
        // Subject priority scoring
        if (assignment.subject_priority === 'high') score += 20;
        else if (assignment.subject_priority === 'medium') score += 10;
        
        // Prefer STEM subjects in morning
        if (isMorningSlot && assignment.subject_category === 'STEM') {
          score += 25;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestAssignment = assignment;
        }
      }
      
      if (bestAssignment) {
        const teacherKey = `${bestAssignment.teacher_id}_${slot.day_of_week}_${slot.start_time}`;
        teacherSchedule.set(teacherKey, true);
        
        optimizedSlots.push({
          ...slot,
          teacher_id: bestAssignment.teacher_id,
          subject: bestAssignment.subject_name,
          subject_code: bestAssignment.subject_code,
          optimization_score: bestScore,
          optimization_reason: this.getOptimizationReason(bestAssignment, isMorningSlot)
        });
      } else {
        // No teacher available - mark as unassigned
        optimizedSlots.push({
          ...slot,
          teacher_id: null,
          subject: 'Unassigned',
          optimization_reason: 'No available teacher for this time slot'
        });
      }
    }
    
    return optimizedSlots;
  }
  
  /**
   * Helper methods
   */
  calculateDuration(startTime, endTime) {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    return end - start;
  }
  
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  getOptimizationReason(assignment, isMorningSlot) {
    const reasons = [];
    
    if (isMorningSlot && assignment.is_morning_preferred) {
      reasons.push('Optimal morning slot for high-concentration subject');
    }
    
    if (assignment.subject_priority === 'high') {
      reasons.push('High priority subject');
    }
    
    if (isMorningSlot && assignment.subject_category === 'STEM') {
      reasons.push('STEM subject optimally placed in morning');
    }
    
    return reasons.join('; ') || 'Standard assignment';
  }
}

module.exports = new EnhancedTimeSlotService();
