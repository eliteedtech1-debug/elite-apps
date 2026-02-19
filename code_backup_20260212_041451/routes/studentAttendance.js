const db = require('../models');
const { authenticate } = require('../middleware/auth');

/**
 * STUDENT ATTENDANCE API ROUTES
 * 
 * These routes provide ORM-based attendance data specifically for students
 * to view their own attendance progress and statistics.
 * 
 * Features:
 * - Student-specific attendance records
 * - Attendance statistics and analytics
 * - Monthly/weekly attendance summaries
 * - Attendance trends and progress tracking
 * 
 * Access Control:
 * - Routes are accessible to authenticated students (users with admission_no)
 * - Alternatively, any authenticated user can access by providing admission_no parameter
 * - This allows teachers/admins to view student attendance by providing admission_no
 */

module.exports = (app) => {

  /**
   * GET /api/student-attendance/my-attendance
   * Get attendance records for the logged-in student
   * @access Private (Student only or with admission_no parameter)
   * @query {string} admission_no - Student admission number (optional if user is student)
   * @query {string} start_date - Start date filter (YYYY-MM-DD)
   * @query {string} end_date - End date filter (YYYY-MM-DD)
   * @query {number} limit - Number of records to return (default: 100)
   * @query {number} offset - Number of records to skip (default: 0)
   */
  app.get('/api/student-attendance/my-attendance', authenticate, async (req, res) => {
    try {
      const { start_date, end_date, limit = 100, offset = 0 } = req.query;
      const { user } = req;

      // Check if user is a student or if admission_no is provided in query/body
      const admissionNo = req.query.admission_no || req.body.admission_no || user.admission_no;
      
      if (!admissionNo) {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only accessible to students or requires admission_no parameter'
        });
      }

      // Build date filter
      let dateFilter = '';
      const replacements = {
        admission_no: admissionNo,
        school_id: user.school_id,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      if (start_date && end_date) {
        dateFilter = 'AND ar.attendance_date BETWEEN :start_date AND :end_date';
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      } else if (start_date) {
        dateFilter = 'AND ar.attendance_date >= :start_date';
        replacements.start_date = start_date;
      } else if (end_date) {
        dateFilter = 'AND ar.attendance_date <= :end_date';
        replacements.end_date = end_date;
      }

      // Get attendance records with class information
      const attendanceRecords = await db.sequelize.query(`
        SELECT 
          ar.id,
          ar.admission_no,
          ar.attendance_date,
          ar.status,
          ar.marked_at,
          ar.marked_by,
          ar.notes as remarks,
          c.class_name,
          c.class_code,
          CASE 
            WHEN ar.status = 'P' THEN 'Present'
            WHEN ar.status = 'A' THEN 'Absent'
            WHEN ar.status = 'L' THEN 'Late'
            WHEN ar.status = 'E' THEN 'Excused'
            WHEN ar.status = 'D' THEN 'Dismissed'
            WHEN ar.status = 'HD-IN' THEN 'Half Day In'
            WHEN ar.status = 'HD-OUT' THEN 'Half Day Out'
            ELSE ar.status
          END as status_label,
          DAYNAME(ar.attendance_date) as day_of_week
        FROM attendance_records ar
        LEFT JOIN classes c ON ar.class_code = c.class_code
        WHERE ar.admission_no = :admission_no 
          AND ar.school_id = :school_id
          ${dateFilter}
        ORDER BY ar.attendance_date DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get total count for pagination
      const totalCountResult = await db.sequelize.query(`
        SELECT COUNT(*) as total
        FROM attendance_records ar
        WHERE ar.admission_no = :admission_no 
          AND ar.school_id = :school_id
          ${dateFilter}
      `, {
        replacements: {
          admission_no: admissionNo,
          school_id: user.school_id,
          ...(start_date && { start_date }),
          ...(end_date && { end_date })
        },
        type: db.Sequelize.QueryTypes.SELECT
      });

      const totalCount = totalCountResult[0]?.total || 0;

      res.json({
        success: true,
        data: attendanceRecords,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
        },
        message: `Retrieved ${attendanceRecords.length} attendance records`
      });

    } catch (error) {
      console.error('Error fetching student attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching attendance records',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  /**
   * GET /api/student-attendance/statistics
   * Get attendance statistics for the logged-in student
   * @access Private (Student only or with admission_no parameter)
   * @query {string} admission_no - Student admission number (optional if user is student)
   * @query {string} start_date - Start date filter (YYYY-MM-DD)
   * @query {string} end_date - End date filter (YYYY-MM-DD)
   */
  app.get('/api/student-attendance/statistics', authenticate, async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      const { user } = req;

      // Check if user is a student or if admission_no is provided in query/body
      const admissionNo = req.query.admission_no || req.body.admission_no || user.admission_no;
      
      if (!admissionNo) {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only accessible to students or requires admission_no parameter'
        });
      }

      // Build date filter
      let dateFilter = '';
      const replacements = {
        admission_no: admissionNo,
        school_id: user.school_id
      };

      if (start_date && end_date) {
        dateFilter = 'AND attendance_date BETWEEN :start_date AND :end_date';
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      } else {
        // Default to current academic year if no dates provided
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const academicYearStart = currentDate.getMonth() >= 8 ? currentYear : currentYear - 1;
        dateFilter = 'AND attendance_date >= :start_date';
        replacements.start_date = `${academicYearStart}-09-01`;
      }

      // Get overall statistics
      const overallStats = await db.sequelize.query(`
        SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN status = 'L' THEN 1 ELSE 0 END) as late_days,
          SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END) as excused_days,
          SUM(CASE WHEN status = 'D' THEN 1 ELSE 0 END) as dismissed_days,
          SUM(CASE WHEN status LIKE 'HD%' THEN 1 ELSE 0 END) as half_days,
          ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_percentage,
          MIN(attendance_date) as first_record_date,
          MAX(attendance_date) as last_record_date
        FROM attendance_records 
        WHERE admission_no = :admission_no 
          AND school_id = :school_id
          ${dateFilter}
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get monthly breakdown
      const monthlyStats = await db.sequelize.query(`
        SELECT 
          DATE_FORMAT(attendance_date, '%Y-%m') as month,
          DATE_FORMAT(attendance_date, '%M %Y') as month_name,
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN status = 'L' THEN 1 ELSE 0 END) as late_days,
          ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_percentage
        FROM attendance_records 
        WHERE admission_no = :admission_no 
          AND school_id = :school_id
          ${dateFilter}
        GROUP BY DATE_FORMAT(attendance_date, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get weekly breakdown for current month
      const weeklyStats = await db.sequelize.query(`
        SELECT 
          YEARWEEK(attendance_date) as week,
          DATE_FORMAT(attendance_date, '%Y Week %u') as week_name,
          MIN(attendance_date) as week_start,
          MAX(attendance_date) as week_end,
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent_days,
          ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_percentage
        FROM attendance_records 
        WHERE admission_no = :admission_no 
          AND school_id = :school_id
          AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
        GROUP BY YEARWEEK(attendance_date)
        ORDER BY week DESC
        LIMIT 8
      `, {
        replacements: {
          admission_no: admissionNo,
          school_id: user.school_id
        },
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Get recent attendance (last 30 days)
      const recentAttendance = await db.sequelize.query(`
        SELECT 
          attendance_date,
          status,
          CASE 
            WHEN status = 'P' THEN 'Present'
            WHEN status = 'A' THEN 'Absent'
            WHEN status = 'L' THEN 'Late'
            WHEN status = 'E' THEN 'Excused'
            WHEN status = 'D' THEN 'Dismissed'
            WHEN status = 'HD-IN' THEN 'Half Day In'
            WHEN status = 'HD-OUT' THEN 'Half Day Out'
            ELSE status
          END as status_label,
          DAYNAME(attendance_date) as day_of_week
        FROM attendance_records 
        WHERE admission_no = :admission_no 
          AND school_id = :school_id
          AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ORDER BY attendance_date DESC
      `, {
        replacements: {
          admission_no: admissionNo,
          school_id: user.school_id
        },
        type: db.Sequelize.QueryTypes.SELECT
      });

      const stats = overallStats[0] || {};

      res.json({
        success: true,
        data: {
          overall: {
            ...stats,
            attendance_grade: getAttendanceGrade(stats.attendance_percentage || 0)
          },
          monthly_breakdown: monthlyStats,
          weekly_breakdown: weeklyStats,
          recent_attendance: recentAttendance,
          summary: {
            total_days: stats.total_days || 0,
            present_days: stats.present_days || 0,
            absent_days: stats.absent_days || 0,
            late_days: stats.late_days || 0,
            attendance_percentage: stats.attendance_percentage || 0,
            days_range: {
              start: stats.first_record_date,
              end: stats.last_record_date
            }
          }
        },
        message: 'Attendance statistics retrieved successfully'
      });

    } catch (error) {
      console.error('Error fetching attendance statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching attendance statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  /**
   * GET /api/student-attendance/calendar
   * Get attendance data formatted for calendar view
   * @access Private (Student only or with admission_no parameter)
   * @query {string} admission_no - Student admission number (optional if user is student)
   * @query {string} year - Year (YYYY)
   * @query {string} month - Month (1-12)
   */
  app.get('/api/student-attendance/calendar', authenticate, async (req, res) => {
    try {
      const { year, month } = req.query;
      const { user } = req;

      // Check if user is a student or if admission_no is provided in query/body
      const admissionNo = req.query.admission_no || req.body.admission_no || user.admission_no;
      
      if (!admissionNo) {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only accessible to students or requires admission_no parameter'
        });
      }

      // Validate year and month
      const currentYear = new Date().getFullYear();
      const yearNum = parseInt(year) || currentYear;
      const monthNum = parseInt(month) || (new Date().getMonth() + 1);

      if (yearNum < 2020 || yearNum > 2030 || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year or month provided'
        });
      }

      // Get attendance records for the specified month
      const attendanceRecords = await db.sequelize.query(`
        SELECT 
          attendance_date,
          status,
          CASE 
            WHEN status = 'P' THEN 'Present'
            WHEN status = 'A' THEN 'Absent'
            WHEN status = 'L' THEN 'Late'
            WHEN status = 'E' THEN 'Excused'
            WHEN status = 'D' THEN 'Dismissed'
            WHEN status = 'HD-IN' THEN 'Half Day In'
            WHEN status = 'HD-OUT' THEN 'Half Day Out'
            ELSE status
          END as status_label,
          DAYNAME(attendance_date) as day_of_week,
          DAY(attendance_date) as day_number
        FROM attendance_records 
        WHERE admission_no = :admission_no 
          AND school_id = :school_id
          AND YEAR(attendance_date) = :year
          AND MONTH(attendance_date) = :month
        ORDER BY attendance_date
      `, {
        replacements: {
          admission_no: admissionNo,
          school_id: user.school_id,
          year: yearNum,
          month: monthNum
        },
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Format data for calendar
      const calendarData = {};
      attendanceRecords.forEach(record => {
        calendarData[record.attendance_date] = {
          status: record.status,
          status_label: record.status_label,
          day_of_week: record.day_of_week,
          day_number: record.day_number
        };
      });

      // Get month statistics
      const monthStats = await db.sequelize.query(`
        SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN status = 'L' THEN 1 ELSE 0 END) as late_days,
          ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_percentage
        FROM attendance_records 
        WHERE admission_no = :admission_no 
          AND school_id = :school_id
          AND YEAR(attendance_date) = :year
          AND MONTH(attendance_date) = :month
      `, {
        replacements: {
          admission_no: admissionNo,
          school_id: user.school_id,
          year: yearNum,
          month: monthNum
        },
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          calendar_data: calendarData,
          month_statistics: monthStats[0] || {
            total_days: 0,
            present_days: 0,
            absent_days: 0,
            late_days: 0,
            attendance_percentage: 0
          },
          month_info: {
            year: yearNum,
            month: monthNum,
            month_name: new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' }),
            total_records: attendanceRecords.length
          }
        },
        message: `Calendar data retrieved for ${new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' })} ${yearNum}`
      });

    } catch (error) {
      console.error('Error fetching calendar attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching calendar data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  /**
   * GET /api/student-attendance/trends
   * Get attendance trends and analytics for the student
   * @access Private (Student only or with admission_no parameter)
   * @query {string} admission_no - Student admission number (optional if user is student)
   * @query {string} period - Period type: 'weekly', 'monthly', 'yearly' (default: 'monthly')
   * @query {number} limit - Number of periods to return (default: 12)
   */
  app.get('/api/student-attendance/trends', authenticate, async (req, res) => {
    try {
      const { period = 'monthly', limit = 12 } = req.query;
      const { user } = req;

      // Check if user is a student or if admission_no is provided in query/body
      const admissionNo = req.query.admission_no || req.body.admission_no || user.admission_no;
      
      if (!admissionNo) {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only accessible to students or requires admission_no parameter'
        });
      }

      let dateFormat, groupBy, orderBy;
      
      switch (period) {
        case 'weekly':
          dateFormat = '%Y Week %u';
          groupBy = 'YEARWEEK(attendance_date)';
          orderBy = 'YEARWEEK(attendance_date) DESC';
          break;
        case 'yearly':
          dateFormat = '%Y';
          groupBy = 'YEAR(attendance_date)';
          orderBy = 'YEAR(attendance_date) DESC';
          break;
        default: // monthly
          dateFormat = '%M %Y';
          groupBy = 'DATE_FORMAT(attendance_date, "%Y-%m")';
          orderBy = 'DATE_FORMAT(attendance_date, "%Y-%m") DESC';
      }

      const trendsData = await db.sequelize.query(`
        SELECT 
          ${groupBy} as period_key,
          DATE_FORMAT(attendance_date, '${dateFormat}') as period_name,
          MIN(attendance_date) as period_start,
          MAX(attendance_date) as period_end,
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN status = 'L' THEN 1 ELSE 0 END) as late_days,
          SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END) as excused_days,
          ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_percentage
        FROM attendance_records 
        WHERE admission_no = :admission_no 
          AND school_id = :school_id
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT :limit
      `, {
        replacements: {
          admission_no: admissionNo,
          school_id: user.school_id,
          limit: parseInt(limit)
        },
        type: db.Sequelize.QueryTypes.SELECT
      });

      // Calculate trend direction
      const trendsWithDirection = trendsData.map((trend, index) => {
        let direction = 'stable';
        if (index < trendsData.length - 1) {
          const currentPercentage = trend.attendance_percentage;
          const previousPercentage = trendsData[index + 1].attendance_percentage;
          if (currentPercentage > previousPercentage) {
            direction = 'improving';
          } else if (currentPercentage < previousPercentage) {
            direction = 'declining';
          }
        }
        
        return {
          ...trend,
          trend_direction: direction,
          attendance_grade: getAttendanceGrade(trend.attendance_percentage)
        };
      });

      res.json({
        success: true,
        data: {
          trends: trendsWithDirection,
          period_type: period,
          summary: {
            total_periods: trendsData.length,
            average_attendance: trendsData.length > 0 
              ? Math.round(trendsData.reduce((sum, t) => sum + t.attendance_percentage, 0) / trendsData.length * 100) / 100
              : 0,
            best_period: trendsData.length > 0 
              ? trendsData.reduce((best, current) => current.attendance_percentage > best.attendance_percentage ? current : best)
              : null,
            worst_period: trendsData.length > 0 
              ? trendsData.reduce((worst, current) => current.attendance_percentage < worst.attendance_percentage ? current : worst)
              : null
          }
        },
        message: `Attendance trends retrieved for ${period} periods`
      });

    } catch (error) {
      console.error('Error fetching attendance trends:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching attendance trends',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  /**
   * GET /api/student-attendance/health
   * Health check for student attendance API
   * @access Private
   */
  app.get('/api/student-attendance/health', authenticate, async (req, res) => {
    try {
      // Test database connectivity
      await db.sequelize.authenticate();
      
      // Test attendance_records table access
      const testQuery = await db.sequelize.query(
        'SELECT COUNT(*) as count FROM attendance_records WHERE school_id = :school_id LIMIT 1',
        {
          replacements: { school_id: req.user.school_id },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        message: 'Student Attendance API is healthy',
        data: {
          database_connected: true,
          attendance_table_accessible: true,
          sample_record_count: testQuery[0]?.count || 0,
          timestamp: new Date().toISOString(),
          user_type: req.user.user_type || 'Unknown',
          has_admission_no: !!req.user.admission_no
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Student Attendance API health check failed',
        error: error.message
      });
    }
  });

};

/**
 * Helper function to determine attendance grade based on percentage
 */
function getAttendanceGrade(percentage) {
  if (percentage >= 95) return 'Excellent';
  if (percentage >= 85) return 'Good';
  if (percentage >= 75) return 'Average';
  if (percentage >= 65) return 'Below Average';
  return 'Poor';
}