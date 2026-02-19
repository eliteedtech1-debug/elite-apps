// Simple AI timetable generation that creates lesson_time_table entries
const generate_ai_timetable_fixed = async (req, res) => {
  try {
    const { section, apply_cultural_rules = true } = req.body;
    const school_id = req.user.school_id;
    
    console.log(`🤖 Generating AI timetable for ${school_id} - ${section}`);
    
    // Get teacher assignments
    const assignments = await db.sequelize.query(
      `SELECT * FROM teacher_classes WHERE school_id = :school_id AND section = :section`,
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
    
    // Get time slots
    const timeSlots = await db.sequelize.query(
      `SELECT * FROM enhanced_time_slots WHERE school_id = :school_id AND section = :section AND slot_type = 'Academic'`,
      {
        replacements: { school_id, section },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    // Create timetable entries
    const timetableEntries = [];
    
    for (const assignment of assignments) {
      for (const slot of timeSlots) {
        const entry = {
          day: slot.day_of_week || 'Monday',
          class_code: assignment.class_code,
          class_name: assignment.class_name,
          subject: assignment.subject,
          subject_code: assignment.subject_code,
          teacher_id: assignment.teacher_id,
          section: section,
          start_time: slot.start_time,
          end_time: slot.end_time,
          school_id: school_id,
          status: 'Active'
        };
        
        // Insert into lesson_time_table
        await db.sequelize.query(
          `INSERT INTO lesson_time_table 
           (day, class_code, class_name, subject, subject_code, teacher_id, section, 
            start_time, end_time, school_id, status, created_at, updated_at)
           VALUES (:day, :class_code, :class_name, :subject, :subject_code, :teacher_id, 
                   :section, :start_time, :end_time, :school_id, :status, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
           subject = VALUES(subject), teacher_id = VALUES(teacher_id), updated_at = NOW()`,
          {
            replacements: entry,
            type: db.sequelize.QueryTypes.INSERT
          }
        );
        
        timetableEntries.push(entry);
      }
    }
    
    res.json({
      success: true,
      message: `AI timetable generated with ${timetableEntries.length} entries`,
      data: {
        entries_created: timetableEntries.length,
        assignments_used: assignments.length,
        time_slots_used: timeSlots.length
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

module.exports = { generate_ai_timetable_fixed };
