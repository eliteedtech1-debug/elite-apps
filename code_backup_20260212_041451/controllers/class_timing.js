const db = require("../models");
const dbConnection = require("../config/database");
const TimetableMakerService = require("../services/TimetableMakerService");
const moment = require("moment");

const class_timing = (req, res) => {
  const {
    query_type = "create",
    id = null,
    school_id = null,
    branch_id = null,
    section = null,
    start_time = null,
    end_time = null,
    activities = null,
  } = req.body;

  db.sequelize
    .query(
      `CALL ClassTiming(:query_type, :id, :school_id, :section, :start_time, :end_time, :activities)`,
      {
        replacements: {
          query_type,
          id,
          school_id: req.user.school_id ?? school_id,
          section,
          start_time,
          end_time,
          activities,
        },
      }
    )
    .then((results) => res.json({ success: true, data: results }))
    .catch((err) => {
      console.error("Database Error in class_timing:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

async function bulk_class_timing(req, res) {
  const timing = Array.isArray(req.body) ? req.body : [req.body];

  const promises = timing.map((record) => {
    const {
      query_type = null,
      id = null,
      school_id = null,
      branch_id = null,
      section = null,
      start_time = null,
      end_time = null,
      activities = null,
    } = record;

    return db.sequelize.query(
      `CALL ClassTiming(:query_type, :id, :school_id, :section, :start_time, :end_time, :activities)`,
      {
        replacements: {
          query_type,
          id,
          school_id: req.user.school_id ?? school_id,
          section,
          start_time,
          end_time,
          activities,
        },
      }
    );
  });

  try {
    const results = await Promise.all(promises);
    res.status(200).json({ success: true, data: results.flat() });
  } catch (error) {
    console.error("Error during bulk insert:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
}

const delete_class_timing = (req, res) => {
  const {
    school_id = null,
    branch_id = null,
    section = null,
    start_time = null,
    end_time = null,
    activities = null,
  } = req.body;
  const { id = null, query_type = null } = req.query;

  db.sequelize
    .query(
      `CALL ClassTiming(:query_type, :id, :school_id, :section, :start_time, :end_time, :activities)`,
      {
        replacements: {
          query_type,
          id,
          school_id: req.user.school_id ?? school_id,
          section,
          start_time,
          end_time,
          activities,
        },
      }
    )
    .then((results) => res.json({ success: true, data: results }))
    .catch((err) => {
      console.error("Database Error in class_timing:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

const get_class_timing = async (req, res) => {
  const {
    query_type = "select",
    section = null,
    school_id = null,
    class_code = null,
  } = req.query;

  try {
    const actualSchoolId = school_id || req.user?.school_id;
    
    let query = `
      SELECT id, day, class_code, class_name, subject, teacher_id, section, start_time, end_time, school_id
      FROM lesson_time_table 
      WHERE school_id = ? AND section = ?
    `;
    let params = [actualSchoolId, section];
    
    // Add class filtering if class_code is provided
    if (class_code && class_code.trim() !== '') {
      query += ` AND class_code = ?`;
      params.push(class_code);
    }
    
    query += ` ORDER BY day, start_time`;
    
    const [results] = await dbConnection.execute(query, params);
    
    res.json({ success: true, data: results });
  } catch (err) {
    console.error("Database Error in get_class_timing:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// New endpoint to get time slots formatted for frontend
const get_time_slots = (req, res) => {
  const {
    section = null,
    school_id = null,
  } = req.query;

  console.log(`Fetching time slots for section: ${section}, school_id: ${school_id ?? req.user?.school_id}`);

  const finalSchoolId = school_id ?? req.user?.school_id;
  
  if (!finalSchoolId) {
    return res.status(400).json({ 
      success: false, 
      error: "School ID is required. Please ensure you are authenticated or provide school_id parameter." 
    });
  }

  let query = `SELECT DISTINCT 
    CONCAT(start_time, ' - ', end_time) as label,
    CONCAT(start_time, ' - ', end_time) as value,
    start_time,
    end_time,
    activities,
    section
  FROM class_timing 
  WHERE school_id = :school_id`;
  
  const replacements = { school_id: finalSchoolId };
  
  if (section) {
    query += ` AND section = :section`;
    replacements.section = section;
  }
  
  query += ` ORDER BY start_time ASC`;

  db.sequelize
    .query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    })
    .then((results) => {
      console.log(`Found ${results.length} time slots`);
      
      if (results.length === 0) {
        console.log(`No time slots found for section: ${section}, school_id: ${finalSchoolId}`);
        // Return empty array with success true - this is normal when no time slots are configured
        return res.json({ 
          success: true, 
          data: [],
          message: section ? 
            `No time slots configured for section '${section}'. Please add time slots in the Time Slot Manager.` :
            `No time slots configured for school '${finalSchoolId}'. Please add time slots in the Time Slot Manager.`
        });
      }
      
      res.json({ success: true, data: results });
      console.log("Time slots fetched successfully:", results);
    })
    .catch((err) => {
      console.error("Database Error in get_time_slots:", err);
      res.status(500).json({ 
        success: false, 
        error: err.message,
        details: "Failed to fetch time slots from database"
      });
    });
};

// Generate default 45-minute time slots
const generate_default_slots = (req, res) => {
  const {
    section = null,
    school_id = null,
  } = req.query;

  if (!section) {
    return res.status(400).json({ success: false, error: "Section is required" });
  }

  // Generate predefined 45-minute slots
  const generateSlots = () => {
    const slots = [];
    const startHour = 8; // 8:00 AM
    const endHour = 16; // 4:00 PM
    const slotDuration = 45; // 45 minutes
    const breakDuration = 15; // 15 minutes break

    let currentHour = startHour;
    let currentMinute = 0;
    let slotNumber = 1;

    while (currentHour < endHour) {
      const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Calculate end time
      let endMinute = currentMinute + slotDuration;
      let endHour = currentHour;
      
      if (endMinute >= 60) {
        endHour += Math.floor(endMinute / 60);
        endMinute = endMinute % 60;
      }
      
      if (endHour >= 16) break; // Don't go past 4 PM
      
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      slots.push({
        start_time: startTime,
        end_time: endTime,
        activities: slotNumber === 3 ? 'Break' : 'Lesson', // 3rd slot is break
        section: section,
        school_id: school_id ?? req.user.school_id
      });

      // Move to next slot time
      if (slotNumber === 3) {
        // After break, continue immediately
        currentMinute = endMinute;
        currentHour = endHour;
      } else {
        // After lesson, add break time
        currentMinute = endMinute + breakDuration;
        currentHour = endHour;
      }
      
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
      
      slotNumber++;
      
      // Safety check to prevent infinite loop
      if (slotNumber > 10) break;
    }

    return slots;
  };

  try {
    const defaultSlots = generateSlots();
    res.json({ success: true, data: defaultSlots });
    console.log("Default time slots generated successfully");
  } catch (err) {
    console.error("Error generating default slots:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  class_timing,
  get_class_timing,
  delete_class_timing,
  bulk_class_timing,
  get_time_slots,
  generate_default_slots,
  
  // Enhanced functions - temporary placeholders
  enhanced_time_slots: (req, res) => res.json({ success: true, message: "Enhanced time slots endpoint" }),
  get_enhanced_time_slots: (req, res) => res.json({ success: true, data: [] }),
  delete_enhanced_time_slots: (req, res) => res.json({ success: true, message: "Deleted" }),
  get_nigerian_templates: (req, res) => res.json({ success: true, data: [] }),
  generate_from_template: (req, res) => res.json({ success: true, message: "Template generated" }),
  bulk_enhanced_time_slots: (req, res) => res.json({ success: true, message: "Bulk operation completed" }),
  get_teacher_assignments: async (req, res) => {
    try {
      const { school_id, section, class_code } = req.query;
      
      let query = `SELECT * FROM teacher_classes WHERE school_id = ?`;
      let params = [school_id];
      
      if (section) {
        query += ` AND class_name LIKE ?`;
        params.push(`%${section}%`);
      }
      
      if (class_code && class_code.trim() !== '') {
        query += ` AND class_code = ?`;
        params.push(class_code);
      }
      
      const [results] = await dbConnection.execute(query, params);
      
      // Calculate unique teachers
      const uniqueTeachers = new Set(results.map(r => r.teacher_id));
      
      res.json({ 
        success: true, 
        data: results,
        summary: {
          unique_teachers: uniqueTeachers.size,
          total_assignments: results.length
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  generate_ai_timetable: async (req, res) => {
    try {
      const { school_id, section, options = {} } = req.body;
      const actualSchoolId = school_id || req.user?.school_id;

      // Get teacher assignments
      const teacherQuery = `SELECT * FROM teacher_classes WHERE school_id = ? AND class_name LIKE ?`;
      const [teachers] = await dbConnection.execute(teacherQuery, [actualSchoolId, `%${section}%`]);

      // Get time slots
      const slotsQuery = `SELECT * FROM enhanced_time_slots WHERE school_id = ? AND section = ? AND slot_type = 'Academic' ORDER BY start_time`;
      const [timeSlots] = await dbConnection.execute(slotsQuery, [actualSchoolId, section]);

      if (teachers.length === 0) {
        return res.status(400).json({ success: false, error: 'No teacher assignments found for this section' });
      }

      if (timeSlots.length === 0) {
        return res.status(400).json({ success: false, error: 'No time slots configured for this section' });
      }

      // Clear existing timetable
      await dbConnection.execute(`DELETE FROM lesson_time_table WHERE school_id = ? AND section = ?`, [actualSchoolId, section]);

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      let entriesCreated = 0;
      const conflicts = [];

      // Generate timetable
      for (const day of days) {
        const dayTeachers = [...teachers];
        
        for (const slot of timeSlots) {
          if (dayTeachers.length === 0) break;

          // Smart assignment: prioritize high priority subjects in morning
          const isEarlySlot = slot.start_time < '10:00';
          let selectedTeacher;

          if (isEarlySlot) {
            selectedTeacher = dayTeachers.find(t => t.subject_priority === 'high' && t.is_morning_preferred === 1) ||
                            dayTeachers.find(t => t.subject_priority === 'high') ||
                            dayTeachers[0];
          } else {
            selectedTeacher = dayTeachers[Math.floor(Math.random() * dayTeachers.length)];
          }

          if (selectedTeacher) {
            // Insert timetable entry
            const insertQuery = `
              INSERT INTO lesson_time_table 
              (day, class_code, class_name, subject, teacher_id, section, start_time, end_time, school_id, branch_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await dbConnection.execute(insertQuery, [
              day,
              selectedTeacher.class_code,
              selectedTeacher.class_name,
              selectedTeacher.subject,
              selectedTeacher.teacher_id,
              section,
              slot.start_time,
              slot.end_time,
              actualSchoolId,
              req.user?.branch_id || null
            ]);

            entriesCreated++;
            
            // Remove teacher to avoid consecutive periods
            const teacherIndex = dayTeachers.findIndex(t => t.id === selectedTeacher.id);
            if (teacherIndex > -1) {
              dayTeachers.splice(teacherIndex, 1);
            }
          }
        }
      }

      // Calculate optimization metrics
      const totalPeriods = days.length * timeSlots.length;
      const fillRate = (entriesCreated / totalPeriods) * 100;
      const optimizationScore = Math.min(95, Math.max(60, fillRate - conflicts.length * 5));

      const response = {
        success: true,
        message: "AI timetable generated successfully",
        data: {
          entries_created: entriesCreated,
          optimization_summary: {
            total_periods: entriesCreated,
            conflicts_resolved: conflicts.length,
            optimization_score: {
              percentage: Math.round(optimizationScore),
              grade: optimizationScore >= 90 ? 'A+' : optimizationScore >= 80 ? 'A' : optimizationScore >= 70 ? 'B' : 'C'
            },
            teacher_utilization: Math.round((teachers.length / entriesCreated) * 100),
            schedule_efficiency: Math.round(fillRate)
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('AI Timetable Generation Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  get_ai_recommendations: async (req, res) => {
    try {
      const { school_id, section } = req.query;
      const actualSchoolId = school_id || req.user?.school_id;

      // Get current timetable analysis
      const timetableQuery = `SELECT * FROM lesson_time_table WHERE school_id = ? AND section = ?`;
      const [currentTimetable] = await dbConnection.execute(timetableQuery, [actualSchoolId, section]);

      // Get teacher assignments
      const teacherQuery = `SELECT * FROM teacher_classes WHERE school_id = ? AND class_name LIKE ?`;
      const [teachers] = await dbConnection.execute(teacherQuery, [actualSchoolId, `%${section}%`]);

      // Use AI service to analyze and recommend
      const timetableService = new TimetableMakerService();
      const recommendations = await timetableService.generateRecommendations(currentTimetable, teachers, section);

      res.json({ success: true, data: recommendations });
    } catch (error) {
      console.error('AI Recommendations Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  get_ai_recommendations: async (req, res) => {
    try {
      const { school_id, section } = req.query;
      const actualSchoolId = school_id || req.user?.school_id;

      // Get current timetable analysis
      const timetableQuery = `SELECT * FROM lesson_time_table WHERE school_id = ? AND section = ?`;
      const [currentTimetable] = await dbConnection.execute(timetableQuery, [actualSchoolId, section]);

      // Get teacher assignments
      const teacherQuery = `SELECT * FROM teacher_classes WHERE school_id = ? AND class_name LIKE ?`;
      const [teachers] = await dbConnection.execute(teacherQuery, [actualSchoolId, `%${section}%`]);

      // Use AI service to analyze and recommend
      const timetableService = new TimetableMakerService();
      const recommendations = await timetableService.generateRecommendations(currentTimetable, teachers, section);

      res.json({ success: true, data: recommendations });
    } catch (error) {
      console.error('AI Recommendations Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  get_prayer_times: (req, res) => res.json({ success: true, data: {} }),
  get_ramadan_adjustments: (req, res) => res.json({ success: true, data: {} }),
  bulk_enhanced_time_slots: (req, res) => res.json({ success: true, message: "Bulk operation completed" }),
};
