const express = require('express');
const router = express.Router();
const db = require('../models');

/**
 * Student Timetable Routes
 * Provides timetable data in formats optimized for student dashboard
 */

/**
 * GET /api/student-timetable/array
 * Returns timetable as a flat array for easy filtering
 */
router.get('/array', async (req, res) => {
  try {
    const {
      school_id,
      section,
      class_name,
      class_code,
      day,
      student_id
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
    if (class_code) whereClause.class_code = class_code;
    if (day) whereClause.day = day;

    const timetableEntries = await db.LessonTimeTable.findAll({
      where: whereClause,
      order: [
        ['day', 'ASC'],
        ['start_time', 'ASC']
      ],
      raw: true // Return plain objects instead of Sequelize instances
    });

    // Transform the data to ensure it's a clean array
    const cleanTimetable = timetableEntries.map(entry => ({
      id: entry.id,
      day: entry.day,
      class_name: entry.class_name,
      class_code: entry.class_code,
      subject: entry.subject,
      teacher_id: entry.teacher_id,
      section: entry.section,
      start_time: entry.start_time,
      end_time: entry.end_time,
      status: entry.status,
      school_id: entry.school_id,
      // Add computed fields for easier filtering
      datetime: `${entry.day} ${entry.start_time}`,
      is_today: entry.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      is_current: false, // Will be computed on frontend
      is_next: false     // Will be computed on frontend
    }));

    // Return as a simple array
    res.json(cleanTimetable);

  } catch (error) {
    console.error("Error fetching student timetable array:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the timetable",
      error: error.message
    });
  }
});

/**
 * GET /api/student-timetable/next-class
 * Returns the next upcoming class for a student
 */
router.get('/next-class', async (req, res) => {
  try {
    const {
      school_id,
      class_name,
      class_code,
      section
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
    if (class_code) whereClause.class_code = class_code;

    const timetableEntries = await db.LessonTimeTable.findAll({
      where: whereClause,
      order: [
        ['day', 'ASC'],
        ['start_time', 'ASC']
      ],
      raw: true
    });

    // Find next class based on current time
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    let nextClass = null;

    // First, try to find a class today that hasn't started yet
    const todayClasses = timetableEntries.filter(entry => entry.day === currentDay);
    for (const classEntry of todayClasses) {
      if (classEntry.start_time > currentTime) {
        nextClass = classEntry;
        break;
      }
    }

    // If no class found today, find the first class of the next day
    if (!nextClass) {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const currentDayIndex = dayOrder.indexOf(currentDay);
      
      for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (currentDayIndex + i) % 7;
        const nextDay = dayOrder[nextDayIndex];
        
        const nextDayClasses = timetableEntries.filter(entry => entry.day === nextDay);
        if (nextDayClasses.length > 0) {
          nextClass = nextDayClasses[0]; // First class of the day
          break;
        }
      }
    }

    if (nextClass) {
      res.json({
        success: true,
        data: {
          ...nextClass,
          is_today: nextClass.day === currentDay,
          time_until: calculateTimeUntil(nextClass.day, nextClass.start_time)
        }
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: "No upcoming classes found"
      });
    }

  } catch (error) {
    console.error("Error fetching next class:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the next class",
      error: error.message
    });
  }
});

/**
 * GET /api/student-timetable/today
 * Returns today's timetable as an array
 */
router.get('/today', async (req, res) => {
  try {
    const {
      school_id,
      class_name,
      class_code,
      section
    } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: "school_id is required"
      });
    }

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const whereClause = {
      school_id: school_id,
      status: 'Active',
      day: currentDay
    };

    if (section) whereClause.section = section;
    if (class_name) whereClause.class_name = class_name;
    if (class_code) whereClause.class_code = class_code;

    const todayClasses = await db.LessonTimeTable.findAll({
      where: whereClause,
      order: [['start_time', 'ASC']],
      raw: true
    });

    // Add status indicators
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    const classesWithStatus = todayClasses.map(classEntry => ({
      ...classEntry,
      is_current: classEntry.start_time <= currentTime && classEntry.end_time > currentTime,
      is_completed: classEntry.end_time <= currentTime,
      is_upcoming: classEntry.start_time > currentTime
    }));

    res.json(classesWithStatus);

  } catch (error) {
    console.error("Error fetching today's timetable:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching today's timetable",
      error: error.message
    });
  }
});

/**
 * Helper function to calculate time until a class
 */
function calculateTimeUntil(day, startTime) {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Create a date object for the class
  const classDate = new Date();
  const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayIndex = dayOrder.indexOf(currentDay);
  const classDayIndex = dayOrder.indexOf(day);
  
  let daysUntil = classDayIndex - currentDayIndex;
  if (daysUntil < 0) {
    daysUntil += 7; // Next week
  }
  
  classDate.setDate(classDate.getDate() + daysUntil);
  const [hours, minutes] = startTime.split(':');
  classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const timeDiff = classDate.getTime() - now.getTime();
  const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hoursUntil < 0) {
    return "Class has started";
  } else if (hoursUntil === 0) {
    return `${minutesUntil} minutes`;
  } else if (hoursUntil < 24) {
    return `${hoursUntil}h ${minutesUntil}m`;
  } else {
    const days = Math.floor(hoursUntil / 24);
    const remainingHours = hoursUntil % 24;
    return `${days}d ${remainingHours}h`;
  }
}

module.exports = router;