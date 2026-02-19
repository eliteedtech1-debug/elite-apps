const db = require("../models");
const moment = require("moment");
// Days of the week for timetable generation
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Generate automated timetable based on provided payload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateTimetable = async (req, res) => {
  try {
    const {
      school_id,
      subjects = [],
      section,
      classes = [],
      timeSlots = []
    } = req.body;

    // Validation
    if (!school_id || !section || !classes.length || !timeSlots.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: school_id, section, classes, and timeSlots are required"
      });
    }

    // Filter only lesson time slots for subject assignment
    const lessonTimeSlots = timeSlots.filter(slot => slot.activities === 'Lesson');
    
    if (lessonTimeSlots.length > 0 && subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Subjects are required when lesson time slots are provided"
      });
    }

    console.log(`Generating timetable for ${section} section with ${classes.length} classes`);
    console.log(`Lesson slots: ${lessonTimeSlots.length}, Total slots: ${timeSlots.length}`);

    // Clear existing timetable for the section and classes
    await clearExistingTimetable(school_id, section, classes.map(c => c.class_code || c));

    const generatedEntries = [];
    
    // Generate timetable for each day of the week
    for (const day of WEEKDAYS) {
      for (const classItem of classes) {
        const className = classItem.class_name || classItem;
        const classCode = classItem.class_code || classItem;
        
        // Generate entries for each time slot
        for (const timeSlot of timeSlots) {
          let entry;
          
          if (timeSlot.activities === 'Lesson' && subjects.length > 0) {
            // For lesson slots, assign subjects based on class_code
            const classSubjects = subjects.filter(sub => {
              // Match subject to class using class_code
              if (sub.class_code) {
                return sub.class_code === classCode;
              }
              // Fallback to class_name if class_code not available
              return sub.class_name === className;
            });
            
            if (classSubjects.length > 0) {
              // Use round-robin assignment for subjects
              const subjectIndex = generatedEntries.filter(e => 
                e.day === day && 
                e.class_name === className && 
                e.subject !== 'Break' && 
                e.subject !== 'Lunch' && 
                e.subject !== 'Assembly'
              ).length % classSubjects.length;
              
              const selectedSubject = classSubjects[subjectIndex];
              
              entry = {
                day: day,
                class_name: className,
                subject: selectedSubject.subject,
                teacher_id: selectedSubject.teacher_id || req.user?.id || 1,
                section: section,
                school_location: null,
                start_time: timeSlot.start_time,
                end_time: timeSlot.end_time,
                status: 'Active',
                school_id: school_id,
                class_code: classCode // Store class_code for reference
              };
            } else {
              // If no subjects assigned to this class, use a default placeholder
              entry = {
                day: day,
                class_name: className,
                subject: 'No Subject Assigned',
                teacher_id: req.user?.id || 1,
                section: section,
                school_location: null,
                start_time: timeSlot.start_time,
                end_time: timeSlot.end_time,
                status: 'Active',
                school_id: school_id,
                class_code: classCode
              };
            }
          } else {
            // For non-lesson slots (Break, Lunch, Assembly, etc.)
            entry = {
              day: day,
              class_name: className,
              subject: timeSlot.activities,
              teacher_id: req.user?.id || 1, // Default teacher or current user
              section: section,
              school_location: null,
              start_time: timeSlot.start_time,
              end_time: timeSlot.end_time,
              status: 'Active',
              school_id: school_id,
              class_code: classCode
            };
          }
          
          if (entry) {
            generatedEntries.push(entry);
          }
        }
      }
    }

    // Bulk insert the generated timetable entries
    if (generatedEntries.length > 0) {
      await db.LessonTimeTable.bulkCreate(generatedEntries);
      
      console.log(`Successfully generated ${generatedEntries.length} timetable entries`);
      
      res.json({
        success: true,
        message: "Timetable generated successfully!",
        data: {
          entriesGenerated: generatedEntries.length,
          classes: classes.map(c => c.class_name || c),
          section: section,
          days: WEEKDAYS,
          timeSlots: timeSlots.length,
          lessonSlots: lessonTimeSlots.length,
          subjects: subjects.length
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "No timetable entries could be generated with the provided data"
      });
    }

  } catch (error) {
    console.error("Error generating timetable:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating the timetable",
      error: error.message
    });
  }
};

/**
 * Clear existing timetable entries for the specified classes
 * @param {string} school_id - School ID
 * @param {string} section - Section name
 * @param {Array} classCodes - Array of class codes
 */
const clearExistingTimetable = async (school_id, section, classCodes) => {
  try {
    // Delete existing timetable entries for the specified classes
    await db.LessonTimeTable.destroy({
      where: {
        school_id: school_id,
        section: section,
        class_code: {
          [db.Sequelize.Op.in]: classCodes
        }
      }
    });
    
    console.log(`Cleared existing timetable for section: ${section}, classes: ${classCodes.join(', ')}`);
  } catch (error) {
    console.error("Error clearing existing timetable:", error);
    throw error;
  }
};

/**
 * Get generated timetable for a specific section and classes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTimetable = async (req, res) => {
  try {
    const {
      school_id,
      section,
      class_name,
      day
    } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: "school_id is required"
      });
    }

    const whereClause = {
      school_id: school_id,
      status: 'Active'
    };

    if (section) whereClause.section = section;
    if (class_name) whereClause.class_name = class_name;
    if (day) whereClause.day = day;

    const timetableEntries = await db.LessonTimeTable.findAll({
      where: whereClause,
      order: [
        ['day', 'ASC'],
        ['class_name', 'ASC'],
        ['start_time', 'ASC']
      ]
    });

    // Group by day and class for better organization
    const groupedTimetable = {};
    
    timetableEntries.forEach(entry => {
      const dayKey = entry.day;
      const classKey = entry.class_name;
      
      if (!groupedTimetable[dayKey]) {
        groupedTimetable[dayKey] = {};
      }
      
      if (!groupedTimetable[dayKey][classKey]) {
        groupedTimetable[dayKey][classKey] = [];
      }
      
      groupedTimetable[dayKey][classKey].push(entry);
    });

    res.json({
      success: true,
      data: {
        timetable: groupedTimetable,
        timetableArray: timetableEntries, // Add flat array for frontend compatibility
        totalEntries: timetableEntries.length,
        filters: {
          school_id,
          section,
          class_name,
          day
        }
      }
    });

  } catch (error) {
    console.error("Error fetching timetable:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the timetable",
      error: error.message
    });
  }
};

/**
 * Delete timetable entries
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteTimetable = async (req, res) => {
  try {
    const {
      school_id,
      section,
      classes
    } = req.body;

    if (!school_id || !section) {
      return res.status(400).json({
        success: false,
        message: "school_id and section are required"
      });
    }

    const deletedCount = await clearExistingTimetable(school_id, section, classes || []);

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} timetable entries`,
      data: {
        deletedCount,
        school_id,
        section,
        classes: classes || 'all'
      }
    });

  } catch (error) {
    console.error("Error deleting timetable:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the timetable",
      error: error.message
    });
  }
};

module.exports = {
  generateTimetable,
  getTimetable,
  deleteTimetable,
  clearExistingTimetable
};