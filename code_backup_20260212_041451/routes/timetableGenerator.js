const passport = require("passport");
const {
  generateTimetable,
  getTimetable,
  deleteTimetable
} = require("../controllers/timetableGenerator");

module.exports = (app) => {
  /**
   * POST /generate-timetable
   * Generate automated timetable based on provided subjects, classes, and time slots
   * 
   * Expected payload:
   * {
   *   "school_id": "SCH/1",
   *   "subjects": [
   *     {
   *       "subject": "English Language",
   *       "class_name": "Nursery 1",
   *       "section": "NURSERY",
   *       "teacher_id": 712,
   *       "subject_code": "SBJ0001"
   *     }
   *   ],
   *   "section": "NURSERY",
   *   "classes": ["Nursery 1", "Nursery 2"],
   *   "timeSlots": [
   *     {
   *       "time_slot": "08:00 - 08:45",
   *       "start_time": "08:00",
   *       "end_time": "08:45",
   *       "activities": "Lesson"
   *     }
   *   ]
   * }
   */
  app.post(
    "/generate-timetable",
    passport.authenticate("jwt", { session: false }),
    generateTimetable
  );

  /**
   * GET /timetable
   * Retrieve generated timetable with optional filters
   * 
   * Query parameters:
   * - school_id (required): School identifier
   * - section (optional): Filter by section
   * - class_name (optional): Filter by specific class
   * - day (optional): Filter by specific day
   */
  app.get(
    "/timetable",
    passport.authenticate("jwt", { session: false }),
    getTimetable
  );

  /**
   * DELETE /timetable
   * Delete timetable entries for specified section and classes
   * 
   * Expected payload:
   * {
   *   "school_id": "SCH/1",
   *   "section": "NURSERY",
   *   "classes": ["Nursery 1", "Nursery 2"] // optional, if not provided, deletes all classes in section
   * }
   */
  app.delete(
    "/timetable",
    passport.authenticate("jwt", { session: false }),
    deleteTimetable
  );

  /**
   * GET /timetable/status
   * Get timetable generation status and statistics
   */
  app.get(
    "/timetable/status",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const { school_id } = req.query;
        
        if (!school_id) {
          return res.status(400).json({
            success: false,
            message: "school_id is required"
          });
        }

        const db = require("../models");
        
        // Get statistics
        const stats = await db.sequelize.query(`
          SELECT 
            section,
            class_name,
            COUNT(*) as total_entries,
            COUNT(DISTINCT day) as days_covered,
            COUNT(DISTINCT subject) as subjects_count,
            MIN(start_time) as earliest_time,
            MAX(end_time) as latest_time
          FROM lesson_time_table 
          WHERE school_id = :school_id AND status = 'Active'
          GROUP BY section, class_name
          ORDER BY section, class_name
        `, {
          replacements: { school_id },
          type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
          success: true,
          data: {
            statistics: stats,
            school_id: school_id
          }
        });

      } catch (error) {
        console.error("Error fetching timetable status:", error);
        res.status(500).json({
          success: false,
          message: "An error occurred while fetching timetable status",
          error: error.message
        });
      }
    }
  );
};