// Simple working AI timetable generation function
const db = require("../models");

const generate_ai_timetable = async (req, res) => {
  try {
    const { section, apply_cultural_rules = true } = req.body;
    const school_id = req.user.school_id;
    
    if (!section) {
      return res.status(400).json({ 
        success: false, 
        error: 'section is required' 
      });
    }
    
    console.log(`🤖 Generating AI timetable for ${school_id} - ${section}`);
    
    // Get teacher assignments
    const assignments = await db.sequelize.query(
      `SELECT * FROM teacher_classes WHERE school_id = :school_id AND section = :section LIMIT 10`,
      {
        replacements: { school_id, section },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No teacher assignments found for this section"
      });
    }
    
    // Create simple timetable entries
    const timetableEntries = [];
    const timeSlots = [
      { start_time: '08:15', end_time: '08:55' },
      { start_time: '08:55', end_time: '09:35' },
      { start_time: '09:50', end_time: '10:30' }
    ];
    
    for (let i = 0; i < Math.min(assignments.length, timeSlots.length); i++) {
      const assignment = assignments[i];
      const slot = timeSlots[i];
      
      await db.sequelize.query(
        `INSERT INTO lesson_time_table 
         (day, class_code, class_name, subject, teacher_id, section, start_time, end_time, school_id, branch_id, status)
         VALUES ('Monday', :class_code, :class_name, :subject, :teacher_id, :section, :start_time, :end_time, :school_id, :branch_id, 'Active')
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        {
          replacements: {
            class_code: assignment.class_code,
            class_name: assignment.class_name,
            subject: assignment.subject,
            teacher_id: assignment.teacher_id,
            section: section,
            start_time: slot.start_time,
            end_time: slot.end_time,
            school_id: school_id,
            branch_id: req.user.branch_id || null
          },
          type: db.sequelize.QueryTypes.INSERT
        }
      );
      
      timetableEntries.push({
        class_code: assignment.class_code,
        subject: assignment.subject,
        start_time: slot.start_time,
        end_time: slot.end_time
      });
    }
    
    res.json({
      success: true,
      message: `AI timetable generated with ${timetableEntries.length} entries`,
      data: {
        entries_created: timetableEntries.length,
        assignments_used: assignments.length,
        timetable_entries: timetableEntries
      }
    });
    
  } catch (error) {
    console.error('Error in generate_ai_timetable:', error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI timetable",
      error: error.message
    });
  }
};

module.exports = { generate_ai_timetable };
