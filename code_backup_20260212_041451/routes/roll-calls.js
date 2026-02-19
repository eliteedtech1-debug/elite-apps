const { authenticate } = require("../middleware/auth");
const db = require("../models");
const validator = require("validator");
const { stringify } = require("csv-stringify");
const moment = require("moment");
const { attendanceSetup } = require("../controllers/school_location");
module.exports = (app) => {

  // GET /roll-call/classes
  app.get('/roll-call/classes', async (req, res) => {
    try {
      const { school_id, branch_id } = req.query;

    //   if (!school_id || !branch_id) {
    //     return res.status(400).json({ success: false, message: 'School ID and Branch ID are required' });
    //   }

      const classes = await db.sequelize.query('SELECT * FROM classes WHERE school_id = :school_id AND branch_id = :branch_id', {
        replacements: { school_id: school_id ?? req.user.school_id, branch_id: branch_id ?? req.user.branch_id }
      });

      res.json({
        success: true,
        data: classes,
        message: `Found ${classes.length} classes`
      });
    } catch (error) {
      console.error('Error fetching classes:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching classes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // GET /roll-call/academic-weeks
  app.get('/roll-call/academic-weeks', authenticate, async (req, res) => {
    try {
      const { start_date, end_date, academic_year, branch_id: branchIdQuery } = req.query;

      if (!start_date || !end_date || !academic_year) {
        return res.status(400).json({ success: false, message: 'Start date, end date, and academic_year parameters are required' });
      }

      const startDate = moment(start_date);
      const endDate = moment(end_date);

      const normalizedBranchId = (branchIdQuery || req.user.branch_id || req.headers['x-branch-id'] || '').trim();

      if (!normalizedBranchId) {
        console.warn('⚠️ Missing branch_id for academic weeks request', {
          user_id: req.user?.id,
          user_type: req.user?.user_type,
          header_branch: req.headers['x-branch-id']
        });
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required to fetch academic weeks. Please select a branch and try again.'
        });
      }

      const replacements = {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        school_id: req.user.school_id,
        branch_id: normalizedBranchId,
        academic_year: academic_year
      };

      const weeks = await db.sequelize.query('CALL GetAcademicWeeksByDateRange(:start_date, :end_date, :school_id,:branch_id)', {
        replacements
      });

      res.json({
        success: true,
        data: weeks,
        branch_id: normalizedBranchId,
        message: `Found ${weeks.length} academic weeks for ${startDate.format('MM/YYYY')} to ${endDate.format('MM/YYYY')}`
      });

    } catch (error) {
      console.error('Error fetching academic weeks:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching academic weeks',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // GET /roll-call/students/:class_code
  app.get('/roll-call/students/:class_code', async (req, res) => {
    try {
      const { class_code } = req.params;

      if (!class_code || typeof class_code !== 'string') {
        return res.status(400).json({ success: false, message: 'Valid class_code is required' });
      }

      const students = await db.sequelize.query('CALL GetStudentsByClass(:class_code)', {
        replacements: { class_code }
      });

      res.json({
        success: true,
        data: students,
        message: `Found ${students.length} students in class ${class_code}`
      });

    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching students',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // POST /roll-call/attendance/submit
  app.post('/roll-call/attendance/submit', authenticate, async (req, res) => {
    try {
      const {
        class_code,
        academic_week_id,
        attendance_date,
        day_of_week,
        marked_by,
        attendance_data,
        branch_id
      } = req.body;

      if (!class_code || !academic_week_id || !attendance_date || !day_of_week || !marked_by || !attendance_data) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required: class_code, academic_week_id, attendance_date, day_of_week, marked_by, attendance_data'
        });
      }

      if (!Array.isArray(attendance_data) || attendance_data.length === 0) {
        return res.status(400).json({ success: false, message: 'attendance_data must be a non-empty array' });
      }

      if (day_of_week < 1 || day_of_week > 5) {
        return res.status(400).json({ success: false, message: 'day_of_week must be between 1 (Monday) and 5 (Friday)' });
      }

      for (const record of attendance_data) {
        if (!record.admission_no || !record.status) {
          return res.status(400).json({ success: false, message: 'Each record must have admission_no and status' });
        }
        if (!['P', 'A', 'L', 'E', 'D','HD-IN','HD-OUT'].includes(record.status)) {
          return res.status(400).json({ success: false, message: 'Status must be one of: P, A, L, E, D, HD-IN, HD-OUT' });
        }
      }

      const result = await db.sequelize.query(
        'CALL SubmitAttendance(:class_code, :academic_week_id, :attendance_date, :day_of_week, :marked_by, :attendance_data, :branch_id,:school_id)',
        {
          replacements: {
            class_code,
            academic_week_id,
            attendance_date,
            day_of_week,
            marked_by,
            attendance_data: JSON.stringify(attendance_data),
            branch_id: req.user.branch_id ? req.user.branch_id : branch_id,
            school_id: req.user.school_id ? req.user.school_id : null
          }
        }
      );

      res.json({
        success: true,
        message: result.message,
        records_processed: result.records_processed,
        data: {
          class_code,
          attendance_date,
          total_records: attendance_data.length
        }
      });

    } catch (error) {
      console.error('Error submitting attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while submitting attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // GET /roll-call/attendance/summary (with query params)
  // IMPORTANT: This must come BEFORE /roll-call/attendance/:class_code to avoid "summary" being treated as a :class_code parameter
  app.get('/roll-call/attendance/summary', async (req, res) => {
    try {
      const { class_code, start_date, end_date } = req.query;

      console.log('📊 Attendance Summary Request:', { class_code, start_date, end_date });

      if (!class_code || typeof class_code !== 'string') {
        return res.status(400).json({ success: false, message: 'Valid class_code is required' });
      }

      if (!start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Start date and end date parameters are required' });
      }

      // First, let's check if records exist
      const recordCheck = await db.sequelize.query(
        `SELECT COUNT(*) as count FROM attendance_records WHERE class_code = :class_code AND attendance_date = :start_date`,
        {
          replacements: { class_code, start_date: moment(start_date).format('YYYY-MM-DD') },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );
      console.log('📝 Records exist check:', recordCheck);

      // Query attendance_records directly for real-time summary
      const formattedStartDate = moment(start_date).format('YYYY-MM-DD');
      const formattedEndDate = moment(end_date).format('YYYY-MM-DD');

      console.log('Fetching attendance summary:', {
        class_code,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      });

      // Test with a simple raw query first
      const testQuery = `SELECT * FROM attendance_records WHERE class_code = '${class_code}' AND attendance_date = '${formattedStartDate}' LIMIT 5`;
      console.log('🧪 Test query:', testQuery);

      const testResult = await db.sequelize.query(testQuery, {
        type: db.Sequelize.QueryTypes.SELECT
      });
      console.log('🧪 Test result count:', testResult.length);

      const summary = await db.sequelize.query(
        `SELECT
          (SELECT COUNT(*) FROM students WHERE current_class = :class_code AND status IN ('Active', 'Suspended')) as total_students,
          COUNT(*) as total_records,
          COALESCE(SUM(CASE WHEN ar.status = 'P' THEN 1 ELSE 0 END), 0) as present,
          COALESCE(SUM(CASE WHEN ar.status = 'A' THEN 1 ELSE 0 END), 0) as absent,
          COALESCE(SUM(CASE WHEN ar.status = 'L' THEN 1 ELSE 0 END), 0) as late,
          COALESCE(SUM(CASE WHEN ar.status = 'E' THEN 1 ELSE 0 END), 0) as excused,
          COALESCE(SUM(CASE WHEN ar.status = 'D' THEN 1 ELSE 0 END), 0) as dismissed,
          COALESCE(SUM(CASE WHEN ar.status IN ('HD-IN', 'HD-OUT') THEN 1 ELSE 0 END), 0) as half_day,
          COALESCE(SUM(CASE WHEN ar.status = 'HD-IN' THEN 1 ELSE 0 END), 0) as half_day_in,
          COALESCE(SUM(CASE WHEN ar.status = 'HD-OUT' THEN 1 ELSE 0 END), 0) as half_day_out,
          ROUND(COALESCE(
            (
              SUM(CASE WHEN ar.status = 'P' THEN 1.0 ELSE 0 END) +
              SUM(CASE WHEN ar.status = 'L' THEN 0.8 ELSE 0 END) +
              SUM(CASE WHEN ar.status = 'HD-IN' THEN 0.5 ELSE 0 END) +
              SUM(CASE WHEN ar.status = 'HD-OUT' THEN 0.5 ELSE 0 END)
            ) * 100.0 / NULLIF(
              (SELECT COUNT(*) FROM students WHERE current_class = :class_code AND status IN ('Active', 'Suspended')) -
              SUM(CASE WHEN ar.status = 'E' THEN 1 ELSE 0 END)
            , 0)
          , 0)) as attendance_rate
        FROM attendance_records ar
        WHERE ar.class_code = :class_code
          AND ar.attendance_date BETWEEN :start_date AND :end_date`,
        {
          replacements: {
            class_code,
            start_date: formattedStartDate,
            end_date: formattedEndDate
          },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      console.log('Attendance Summary query result:', JSON.stringify(summary, null, 2));

      // summary is already an array of results, get the first one
      const result = summary[0] || {
        total_students: 0,
        total_records: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        dismissed: 0,
        half_day: 0,
        half_day_in: 0,
        half_day_out: 0,
        attendance_rate: 0
      };

      console.log('Final result:', result);

      res.json({
        success: true,
        data: result,
        message: `Found ${result.total_records || 0} attendance records for class ${class_code} from ${start_date} to ${end_date}`
      });

    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching attendance summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // GET /roll-call/attendance/summary/:class_code (with year/month params)
  app.get('/roll-call/attendance/summary/:class_code', async (req, res) => {
    try {
      const { class_code } = req.params;
      const { year, month } = req.query;

      if (!class_code || typeof class_code !== 'string') {
        return res.status(400).json({ success: false, message: 'Valid class_code is required' });
      }

      if (!year || !month) {
        return res.status(400).json({ success: false, message: 'Year and month parameters are required' });
      }

      const summary = await db.sequelize.query('CALL GetAttendanceSummaryReport(:class_code, :year, :month)', {
        replacements: {
          class_code,
          year: parseInt(year),
          month: parseInt(month)
        }
      });

      res.json({
        success: true,
        data: summary,
        message: `Generated attendance summary for class ${class_code} in ${month}/${year}`
      });

    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching attendance summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // GET /roll-call/attendance/:class_code
  // IMPORTANT: This must come AFTER the /roll-call/attendance/summary routes
  app.get('/roll-call/attendance/:class_code', async (req, res) => {
    try {
      const { class_code } = req.params;
      const { start_date, end_date, } = req.query;

      if (!class_code || typeof class_code !== 'string') {
        return res.status(400).json({ success: false, message: 'Valid class_code is required' });
      }

      if (!start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Start date and end date parameters are required' });
      }

      const attendance = await db.sequelize.query('CALL GetAttendanceByDateRange(:class_code, :start_date, :end_date)', {
        replacements: {
          class_code,
          start_date: moment(start_date).startOf('day').toDate(),
          end_date: moment(end_date).endOf('day').toDate()
        }
      });

      res.json({
        success: true,
        data: attendance,
        message: `Found ${attendance.length} attendance records for class ${class_code} from ${start_date} to ${end_date}`
      });

    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  /**
   * PUT /roll-call/attendance/update
   * Update a single attendance record
   */
  app.put('/roll-call/attendance/update', async (req, res) => {
    try {
      const {
        admission_no,
        attendance_date,
        status,
        notes,
        marked_by
      } = req.body;

      if (!admission_no || !attendance_date || !status || !marked_by) {
        return res.status(400).json({
          success: false,
          message: 'admission_no, attendance_date, status, and marked_by are required'
        });
      }

      if (!['P', 'A', 'L', 'E', 'D', 'HD-IN', 'HD-OUT'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be one of: P (Present), A (Absent), L (Late), E (Excused), D (Dismissed), HD-IN (Half Day In), HD-OUT (Half Day Out)'
        });
      }

      const result = await db.sequelize.query(
        `UPDATE attendance_records 
         SET status = :status, notes = :notes, marked_by = :marked_by, marked_at = CURRENT_TIMESTAMP 
         WHERE admission_no = :admission_no AND attendance_date = :attendance_date`,
        {
          replacements: { status, notes: notes || null, marked_by, admission_no, attendance_date }
        }
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      res.json({
        success: true,
        message: 'Attendance record updated successfully',
        data: { admission_no, attendance_date, status, notes }
      });

    } catch (error) {
      console.error('Error updating attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  /**
   * DELETE /roll-call/attendance/:admissionNo/:date
   */
  app.delete('/roll-call/attendance/:admissionNo/:date', async (req, res) => {
    try {
      const { admissionNo, date } = req.params;

      if (!admissionNo || !date) {
        return res.status(400).json({ success: false, message: 'Admission number and date are required' });
      }

      const result = await db.sequelize.query(
        `DELETE FROM attendance_records 
         WHERE admission_no = :admission_no AND attendance_date = :attendance_date`,
        {
          replacements: { admission_no: admissionNo, attendance_date: date }
        }
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Attendance record not found' });
      }

      res.json({
        success: true,
        message: 'Attendance record deleted successfully',
        data: { admission_no: admissionNo, attendance_date: date }
      });

    } catch (error) {
      console.error('Error deleting attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  /**
   * GET /roll-call/attendance/export/:class_code
   * Query params: year, month, format=csv|json
   */
  app.get('/roll-call/attendance/export/:class_code', async (req, res) => {
    try {
      const { class_code } = req.params;
      const { year, month, format = 'json' } = req.query;

      if (!class_code || !year || !month) {
        return res.status(400).json({
          success: false,
          message: 'class_code, year and month are required'
        });
      }

      const attendanceRows = await db.sequelize.query(
        'CALL GetAttendanceByDateRange(:class_code, :start_date, :end_date)',
        {
          replacements: {
            class_code,
            start_date: new Date(year, month - 1, 1),
            end_date: new Date(year, month, 0)
          }
        }
      );

      const summaryRows = await db.sequelize.query(
        'CALL GetAttendanceSummaryReport(:class_code, :start_date, :end_date)',
        {
          replacements: {
            class_code,
            start_date: new Date(year, month - 1, 1),
            end_date: new Date(year, month, 0)
          }
        }
      );

      if (format === 'csv') {
        let csv = 'Student Name,Roll Number,Date,Day,Status,Notes,Week Number\n';

        attendanceRows.forEach(record => {
          csv += `"${record.student_name}","${record.roll_number}","${record.attendance_date}","${record.day_of_week}","${record.status}","${record.notes || ''}","${record.week_number}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_${class_code}_${year}_${month}.csv"`);
        return res.send(csv);
      }

      res.json({
        success: true,
        data: {
          attendance: attendanceRows,
          summary: summaryRows,
          metadata: {
            class_code,
            year: parseInt(year),
            month: parseInt(month),
            total_records: attendanceRows.length,
            total_students: summaryRows.length
          }
        },
        message: `Exported attendance data for class ${class_code} in ${month}/${year}`
      });

    } catch (error) {
      console.error('Error exporting attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while exporting attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get('/roll-call/general/report', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;

    // Validate parameters
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    // Validate date ranges
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date or end date provided'
      });
    }

    // Format dates to MySQL compatible string (YYYY-MM-DD)
    const mysqlStartDate = startDate.toISOString().split('T')[0];
    const mysqlEndDate = endDate.toISOString().split('T')[0];

    try {
      // Attendance breakdown by status
      const rows = await db.sequelize.query(
        `SELECT status, COUNT(*) AS count
         FROM attendance_records
         WHERE school_id = :schoolId
           AND branch_id = :branchId
           AND attendance_date BETWEEN :startDate AND :endDate
         GROUP BY status`,
        {
          replacements: {
            schoolId: req.user.school_id,
            branchId: branch_id,
            startDate: mysqlStartDate,
            endDate: mysqlEndDate
          },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      return res.json({
        success: true,
        data: rows,
        message: `Found ${rows.length} attendance status categories between ${mysqlStartDate} and ${mysqlEndDate}`
      });

    } catch (error) {
      console.error('Error fetching attendance report:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching attendance report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

  } catch (error) {
    console.error('Unexpected error in roll-call report:', error);
    return res.status(500).json({
      success: false,
      message: 'Unexpected server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Enhanced Attendance Report API Endpoints

// Get detailed attendance report with filtering options
app.get('/roll-call/detailed/report', authenticate, async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      branch_id, 
      class_code, 
      gender, 
      status,
      report_type = 'detailed' 
    } = req.query;

    // Validate parameters
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    // Validate date ranges
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date or end date provided'
      });
    }

    // Format dates to MySQL compatible string (YYYY-MM-DD)
    const mysqlStartDate = startDate.toISOString().split('T')[0];
    const mysqlEndDate = endDate.toISOString().split('T')[0];

    // Build dynamic WHERE conditions
    let whereConditions = `WHERE a.school_id = :schoolId 
                          AND a.branch_id = :branchId 
                          AND a.attendance_date BETWEEN :startDate AND :endDate`;
    
    let replacements = {
      schoolId: req.user.school_id,
      branchId: branch_id,
      startDate: mysqlStartDate,
      endDate: mysqlEndDate
    };

    if (class_code) {
      whereConditions += ` AND a.class_code = :classCode`;
      replacements.classCode = class_code;
    }

    if (gender) {
      whereConditions += ` AND s.sex = :gender`;
      replacements.sex = gender;
    }

    if (status) {
      whereConditions += ` AND a.status = :status`;
      replacements.status = status;
    }

    try {
      let query;
      
      switch (report_type) {
        case 'class-wise':
          query = `
            SELECT 
              c.class_name,
              a.status,
              COUNT(*) as count,
              ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY c.class_name)), 2) as percentage
            FROM attendance_records a
            JOIN classes c ON a.class_code = c.class_code
            LEFT JOIN students s ON a.admission_no = s.admission_no
            ${whereConditions}
            GROUP BY c.class_name, a.status
            ORDER BY c.class_name, a.status
          `;
          break;

        case 'gender-wise':
          query = `
            SELECT 
              s.sex AS gender,
              a.status,
              COUNT(*) as count,
              ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY s.sex)), 2) as percentage
            FROM attendance_records a
            LEFT JOIN students s ON a.admission_no = s.admission_no
            JOIN classes c ON a.class_code = c.class_code
            ${whereConditions}
            GROUP BY s.sex, a.status
            ORDER BY s.sex, a.status
          `;
          break;

        case 'status-wise':
          query = `
            SELECT 
              a.status,
              COUNT(*) as count,
              s.student_name,
              c.class_name,
              s.sex as gender,
              a.attendance_date,
              a.marked_at
            FROM attendance_records a
            JOIN classes c ON a.class_code = c.class_code
            LEFT JOIN students s ON a.admission_no = s.admission_no
            ${whereConditions}
            ORDER BY a.status, c.class_name, s.student_name
          `;
          break;

        case 'summary':
          query = `
            SELECT 
              a.status,
              COUNT(*) as count
            FROM attendance_records a
            JOIN classes c ON a.class_code = c.class_code
            LEFT JOIN students s ON a.admission_no = s.admission_no
            ${whereConditions}
            GROUP BY a.status
            ORDER BY count DESC
          `;
          break;

        default: // detailed
          query = `
            SELECT 
              a.id,
              s.admission_no,
              s.student_name,
              s.sex AS gender,
              c.class_name,
              a.class_code,
              a.status,
              a.attendance_date,
              a.marked_at,
              a.marked_by,
              a.remarks
            FROM attendance_records a
            JOIN classes c ON a.class_code = c.class_code
            LEFT JOIN students s ON a.admission_no = s.admission_no
            ${whereConditions}
            ORDER BY a.attendance_date DESC, c.class_name, s.student_name
          `;
      }

      const rows = await db.sequelize.query(query, {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      });

      return res.json({
        success: true,
        data: rows,
        report_type,
        filters: {
          start_date: mysqlStartDate,
          end_date: mysqlEndDate,
          branch_id,
          class_code,
          gender,
          status
        },
        message: `Found ${rows.length} records for ${report_type} report`
      });

    } catch (error) {
      console.error('Error fetching detailed attendance report:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching attendance report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (error) {
    console.error('Unexpected error in detailed attendance report:', error);
    return res.status(500).json({
      success: false,
      message: 'Unexpected server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Get attendance statistics for dashboard
app.get('/roll-call/statistics', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const mysqlStartDate = startDate.toISOString().split('T')[0];
    const mysqlEndDate = endDate.toISOString().split('T')[0];

    try {
      // Overall statistics
      const overallStats = await db.sequelize.query(
        `SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT admission_no) as unique_students,
          COUNT(DISTINCT class_code) as classes_involved,
          COUNT(DISTINCT attendance_date) as days_recorded
        FROM attendance_records 
        WHERE school_id = :schoolId 
          AND branch_id = :branchId 
          AND attendance_date BETWEEN :startDate AND :endDate`,
        {
          replacements: {
            schoolId: req.user.school_id,
            branchId: branch_id,
            startDate: mysqlStartDate,
            endDate: mysqlEndDate
          },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      // Attendance rate by date
      const dailyAttendance = await db.sequelize.query(
        `SELECT 
          attendance_date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present,
          ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
        FROM attendance_records 
        WHERE school_id = :schoolId 
          AND branch_id = :branchId 
          AND attendance_date BETWEEN :startDate AND :endDate
        GROUP BY attendance_date
        ORDER BY attendance_date`,
        {
          replacements: {
            schoolId: req.user.school_id,
            branchId: branch_id,
            startDate: mysqlStartDate,
            endDate: mysqlEndDate
          },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      // Class performance
      const classPerformance = await db.sequelize.query(
        `SELECT 
          c.class_name,
          COUNT(*) as total_records,
          SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present_count,
          ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
        FROM attendance_records a
        JOIN classes c ON a.class_code = c.class_code
        WHERE a.school_id = :schoolId 
          AND a.branch_id = :branchId 
          AND a.attendance_date BETWEEN :startDate AND :endDate
        GROUP BY c.class_name, a.class_code
        ORDER BY attendance_rate DESC`,
        {
          replacements: {
            schoolId: req.user.school_id,
            branchId: branch_id,
            startDate: mysqlStartDate,
            endDate: mysqlEndDate
          },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      return res.json({
        success: true,
        data: {
          overall: overallStats[0],
          daily_attendance: dailyAttendance,
          class_performance: classPerformance
        },
        message: 'Attendance statistics retrieved successfully'
      });

    } catch (error) {
      console.error('Error fetching attendance statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (error) {
    console.error('Unexpected error in attendance statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Unexpected server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Export attendance report to various formats
app.get('/roll-call/export', authenticate, async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      branch_id, 
      format = 'csv',
      class_code,
      gender,
      status 
    } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const mysqlStartDate = startDate.toISOString().split('T')[0];
    const mysqlEndDate = endDate.toISOString().split('T')[0];

    // Build dynamic WHERE conditions
    let whereConditions = `WHERE a.school_id = :schoolId 
                          AND a.branch_id = :branchId 
                          AND a.attendance_date BETWEEN :startDate AND :endDate`;
    
    let replacements = {
      schoolId: req.user.school_id,
      branchId: branch_id,
      startDate: mysqlStartDate,
      endDate: mysqlEndDate
    };

    if (class_code) {
      whereConditions += ` AND a.class_code = :classCode`;
      replacements.classCode = class_code;
    }

    if (gender) {
      whereConditions += ` AND s.sex = :gender`;
      replacements.sex = gender;
    }

    if (status) {
      whereConditions += ` AND a.status = :status`;
      replacements.status = status;
    }

    const query = `
      SELECT 
        s.student_name,
        s.admission_no as student_number,
        s.sex AS gender,
        c.class_name,
        a.status,
        a.attendance_date,
        a.marked_at,
        a.marked_by,
        a.remarks,
        CASE 
          WHEN a.status = 'P' THEN 'Present'
          WHEN a.status = 'A' THEN 'Absent'
          WHEN a.status = 'L' THEN 'Late'
          WHEN a.status = 'E' THEN 'Excused'
          WHEN a.status = 'D' THEN 'Dismissed'
          WHEN a.status = 'HD-IN' THEN 'Half Day In'
          WHEN a.status = 'HD-OUT' THEN 'Half Day Out'
          ELSE a.status
        END as status_label
      FROM attendance_records a
      JOIN classes c ON a.class_code = c.class_code
      LEFT JOIN students s ON a.admission_no = s.admission_no
      ${whereConditions}
      ORDER BY a.attendance_date DESC, c.class_name, s.student_name
    `;

    const rows = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    if (format === 'json') {
      return res.json({
        success: true,
        data: rows,
        count: rows.length,
        filters: { start_date, end_date, branch_id, class_code, gender, status }
      });
    }

    if (format === 'csv') {
      const csvHeaders = [
        'Student Name',
        'Student Number', 
        'Class',
        'Status',
        'Gender',
        'Date',
        'Marked At',
        'Marked By',
        'Remarks'
      ];

      const csvRows = rows.map(row => [
        row.student_name || 'N/A',
        row.student_number || 'N/A',
        row.class_name,
        row.status_label,
        row.gender === 'M' ? 'Male' : row.gender === 'F' ? 'Female' : 'N/A',
        row.attendance_date,
        row.marked_at,
        row.marked_by || 'System',
        row.remarks || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${mysqlStartDate}_to_${mysqlEndDate}.csv`);
      return res.send(csvContent);
    }

    return res.status(400).json({
      success: false,
      message: 'Unsupported export format. Use json or csv.'
    });

  } catch (error) {
    console.error('Error exporting attendance report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while exporting report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get class-wise attendance summary
app.get('/roll-call/class-wise/summary', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const mysqlStartDate = startDate.toISOString().split('T')[0];
    const mysqlEndDate = endDate.toISOString().split('T')[0];

    const rows = await db.sequelize.query(
      `SELECT 
        c.class_name,
        c.class_code,
        COUNT(*) as total_records,
        COUNT(DISTINCT a.admission_no) as unique_students,
        SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'A' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'L' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'E' THEN 1 ELSE 0 END) as excused,
        SUM(CASE WHEN a.status = 'D' THEN 1 ELSE 0 END) as dismissed,
        SUM(CASE WHEN a.status LIKE 'HD%' THEN 1 ELSE 0 END) as half_day,
        ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
      FROM attendance_records a
      JOIN classes c ON a.class_code = c.class_code
      WHERE a.school_id = :schoolId 
        AND a.branch_id = :branchId 
        AND a.attendance_date BETWEEN :startDate AND :endDate
      GROUP BY c.class_name, c.class_code
      ORDER BY c.class_name`,
      {
        replacements: {
          schoolId: req.user.school_id,
          branchId: branch_id,
          startDate: mysqlStartDate,
          endDate: mysqlEndDate
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      data: rows,
      message: `Class-wise attendance summary for ${rows.length} classes`
    });

  } catch (error) {
    console.error('Error fetching class-wise summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching class-wise summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get gender-wise attendance summary
app.get('/roll-call/gender-wise/summary', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, branch_id, class_code } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const mysqlStartDate = startDate.toISOString().split('T')[0];
    const mysqlEndDate = endDate.toISOString().split('T')[0];

    let whereConditions = `WHERE a.school_id = :schoolId 
                          AND a.branch_id = :branchId 
                          AND a.attendance_date BETWEEN :startDate AND :endDate`;
    
    let replacements = {
      schoolId: req.user.school_id,
      branchId: branch_id,
      startDate: mysqlStartDate,
      endDate: mysqlEndDate
    };

    if (class_code) {
      whereConditions += ` AND a.class_code = :classCode`;
      replacements.classCode = class_code;
    }

    const rows = await db.sequelize.query(
      `SELECT 
        s.sex AS gender,
        COUNT(*) as total_records,
        COUNT(DISTINCT a.admission_no) as unique_students,
        SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'A' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'L' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'E' THEN 1 ELSE 0 END) as excused,
        ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
      FROM attendance_records a
      LEFT JOIN students s ON a.admission_no = s.admission_no
      JOIN classes c ON a.class_code = c.class_code
      ${whereConditions}
      GROUP BY s.sex AS gender
      ORDER BY s.sex AS gender`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      data: rows,
      message: `Gender-wise attendance summary retrieved`
    });

  } catch (error) {
    console.error('Error fetching gender-wise summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching gender-wise summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get attendance trends over time
app.get('/roll-call/trends', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, branch_id, interval = 'daily' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const mysqlStartDate = startDate.toISOString().split('T')[0];
    const mysqlEndDate = endDate.toISOString().split('T')[0];

    let dateFormat = '%Y-%m-%d';
    let groupBy = 'attendance_date';

    if (interval === 'weekly') {
      dateFormat = '%Y-%u';
      groupBy = 'YEARWEEK(attendance_date)';
    } else if (interval === 'monthly') {
      dateFormat = '%Y-%m';
      groupBy = 'DATE_FORMAT(attendance_date, "%Y-%m")';
    }

    const rows = await db.sequelize.query(
      `SELECT 
        ${groupBy} as period,
        DATE_FORMAT(attendance_date, '${dateFormat}') as formatted_date,
        COUNT(*) as total_records,
        SUM(CASE WHEN status IN ('P','HD-IN') THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status IN ('L','HD-OUT') THEN 1 ELSE 0 END) as late,
        ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
      FROM attendance_records 
      WHERE school_id = :schoolId 
        AND branch_id = :branchId 
        AND attendance_date BETWEEN :startDate AND :endDate
      GROUP BY ${groupBy}
      ORDER BY attendance_date`,
      {
        replacements: {
          schoolId: req.user.school_id,
          branchId: branch_id,
          startDate: mysqlStartDate,
          endDate: mysqlEndDate
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      data: rows,
      interval,
      message: `Attendance trends for ${interval} interval retrieved`
    });

  } catch (error) {
    console.error('Error fetching attendance trends:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching trends',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get student-wise attendance summary
app.get('/roll-call/student-wise/summary', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, branch_id, class_code, limit = 100 } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const mysqlStartDate = startDate.toISOString().split('T')[0];
    const mysqlEndDate = endDate.toISOString().split('T')[0];

    let whereConditions = `WHERE a.school_id = :schoolId 
                          AND a.branch_id = :branchId 
                          AND a.attendance_date BETWEEN :startDate AND :endDate`;
    
    let replacements = {
      schoolId: req.user.school_id,
      branchId: branch_id,
      startDate: mysqlStartDate,
      endDate: mysqlEndDate,
      limit: parseInt(limit)
    };

    if (class_code) {
      whereConditions += ` AND a.class_code = :classCode`;
      replacements.classCode = class_code;
    }

    const rows = await db.sequelize.query(
      `SELECT 
        s.admission_no,
        s.student_name,
        s.sex AS gender,
        c.class_name,
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'A' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'L' THEN 1 ELSE 0 END) as late_days,
        ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_percentage,
        MIN(a.attendance_date) as first_record,
        MAX(a.attendance_date) as last_record
      FROM attendance_records a
      LEFT JOIN students s ON a.admission_no = s.admission_no
      JOIN classes c ON a.class_code = c.class_code
      ${whereConditions}
      GROUP BY s.admission_no, s.student_name, s.sex AS gender, c.class_name
      ORDER BY attendance_percentage DESC, s.student_name
      LIMIT :limit`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      data: rows,
      count: rows.length,
      message: `Student-wise attendance summary for ${rows.length} students`
    });

  } catch (error) {
    console.error('Error fetching student-wise summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching student-wise summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// ===== ATTENDANCE DASHBOARD API - EXPRESS.JS + SEQUELIZE =====

// Dashboard Query Endpoint - Main endpoint for dashboard data
app.get('/reports/attendance/dashboard', authenticate, async (req, res) => {
  try {
    const { 
      query_type, 
      branch_id, 
      startDate, 
      endDate, 
      class_code,
      gender,
      status,
      limit = 100,
      interval = 'daily'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    const startDateFormatted = new Date(startDate).toISOString().split('T')[0];
    const endDateFormatted = new Date(endDate).toISOString().split('T')[0];

    let result = {};

    switch (query_type) {
      case 'dashboard-cards':
        result = await getDashboardCards(req.user.school_id, branch_id, startDateFormatted, endDateFormatted);
        break;
      case 'daily-trends':
        result = await getDailyTrends(req.user.school_id, branch_id, startDateFormatted, endDateFormatted);
        break;
      case 'class-performance':
        result = await getClassPerformance(req.user.school_id, branch_id, startDateFormatted, endDateFormatted);
        break;
      case 'status-breakdown':
        result = await getStatusBreakdown(req.user.school_id, branch_id, startDateFormatted, endDateFormatted, class_code, gender);
        break;
      case 'student-summary':
        result = await getStudentSummary(req.user.school_id, branch_id, startDateFormatted, endDateFormatted, class_code, limit);
        break;
      case 'gender-analytics':
        result = await getGenderAnalytics(req.user.school_id, branch_id, startDateFormatted, endDateFormatted, class_code);
        break;
      case 'attendance-trends':
        result = await getAttendanceTrends(req.user.school_id, branch_id, startDateFormatted, endDateFormatted, interval);
        break;
      case 'export-data':
        result = await getExportData(req.user.school_id, branch_id, startDateFormatted, endDateFormatted, class_code, gender, status);
        break;
      case 'alerts':
        result = await getAttendanceAlerts(req.user.school_id, branch_id, startDateFormatted, endDateFormatted);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid query type'
        });
    }

    return res.json({
      success: true,
      data: [result], // Wrapped in array to match your expected format
      query_type,
      message: `${query_type} data retrieved successfully`
    });

  } catch (error) {
    console.error(`Error in dashboard_query (${req.query.query_type}):`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== HELPER FUNCTIONS =====

// Dashboard Cards Data
async function getDashboardCards(school_id, branch_id, startDate, endDate) {
  try {
    // Overall statistics
    const overallStats = await db.sequelize.query(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT admission_no) as unique_students,
        COUNT(DISTINCT class_code) as classes_involved,
        COUNT(DISTINCT attendance_date) as days_recorded,
        ROUND(AVG(CASE WHEN status = 'P' THEN 100.0 ELSE 0.0 END), 2) as attendance_rate
      FROM attendance_records 
      WHERE school_id = :school_id 
        AND branch_id = :branch_id 
        AND attendance_date BETWEEN :startDate AND :endDate`,
      {
        replacements: { school_id, branch_id, startDate, endDate },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    // Today's attendance
    const todayStats = await db.sequelize.query(
      `SELECT 
        COUNT(*) as today_total,
        SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as today_present,
        ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as today_rate
      FROM attendance_records 
      WHERE school_id = :school_id 
        AND branch_id = :branch_id 
        AND attendance_date = CURDATE()`,
      {
        replacements: { school_id, branch_id },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    // Absenteeism alerts
    const absenteeismAlerts = await db.sequelize.query(
      `SELECT COUNT(DISTINCT admission_no) as chronic_absentees
      FROM attendance_records 
      WHERE school_id = :school_id 
        AND branch_id = :branch_id 
        AND attendance_date BETWEEN :startDate AND :endDate
        AND status = 'A'
      GROUP BY admission_no
      HAVING COUNT(*) > 5`,
      {
        replacements: { school_id, branch_id, startDate, endDate },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    // Latest trends
    const trendComparison = await db.sequelize.query(
      `SELECT 
        ROUND(AVG(CASE WHEN status = 'P' THEN 100.0 ELSE 0.0 END), 2) as current_rate
      FROM attendance_records 
      WHERE school_id = :school_id 
        AND branch_id = :branch_id 
        AND attendance_date BETWEEN DATE_SUB(:endDate, INTERVAL 7 DAY) AND :endDate`,
      {
        replacements: { school_id, branch_id, endDate },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return {
      overview: {
        ...overallStats[0],
        today_total: todayStats[0]?.today_total || 0,
        today_present: todayStats[0]?.today_present || 0,
        today_rate: todayStats[0]?.today_rate || 0,
        chronic_absentees: absenteeismAlerts.length || 0,
        trend_rate: trendComparison[0]?.current_rate || 0
      },
      trends: {
        attendance_change: '+2.3%',
        student_growth: '+5.1%',
        class_performance: '+1.8%',
        alert_reduction: '-12.5%'
      }
    };
  } catch (error) {
    console.error('Error in getDashboardCards:', error);
    throw error;
  }
}

// Daily Trends Data
async function getDailyTrends(school_id, branch_id, startDate, endDate) {
  try {
    const dailyData = await db.sequelize.query(
      `SELECT 
        attendance_date as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'L' THEN 1 ELSE 0 END) as late,
        ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
      FROM attendance_records 
      WHERE school_id = :school_id 
        AND branch_id = :branch_id 
        AND attendance_date BETWEEN :startDate AND :endDate
      GROUP BY attendance_date
      ORDER BY attendance_date DESC
      LIMIT 30`,
      {
        replacements: { school_id, branch_id, startDate, endDate },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return { daily_trends: dailyData };
  } catch (error) {
    console.error('Error in getDailyTrends:', error);
    throw error;
  }
}

// Class Performance Data
async function getClassPerformance(school_id, branch_id, startDate, endDate) {
  try {
    const classData = await db.sequelize.query(
      `SELECT 
        c.class_name,
        c.class_code,
        COUNT(*) as total_records,
        COUNT(DISTINCT a.admission_no) as unique_students,
        SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'A' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN a.status = 'L' THEN 1 ELSE 0 END) as late_count,
        ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
      FROM attendance_records a
      JOIN classes c ON a.class_code = c.class_code
      WHERE a.school_id = :school_id 
        AND a.branch_id = :branch_id 
        AND a.attendance_date BETWEEN :startDate AND :endDate
      GROUP BY c.class_name, c.class_code
      ORDER BY attendance_rate DESC`,
      {
        replacements: { school_id, branch_id, startDate, endDate },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return { class_performance: classData };
  } catch (error) {
    console.error('Error in getClassPerformance:', error);
    throw error;
  }
}

// Status Breakdown Data
async function getStatusBreakdown(school_id, branch_id, startDate, endDate, class_code, gender) {
  try {
    let whereConditions = `WHERE a.school_id = :school_id 
                          AND a.branch_id = :branch_id 
                          AND a.attendance_date BETWEEN :startDate AND :endDate`;
    
    let replacements = { school_id, branch_id, startDate, endDate };

    if (class_code) {
      whereConditions += ` AND a.class_code = :class_code`;
      replacements.class_code = class_code;
    }

    if (gender) {
      whereConditions += ` AND s.sex = :gender`;
      replacements.gender = gender;
    }

    const statusData = await db.sequelize.query(
      `SELECT 
        a.status as status_value,
        CASE 
          WHEN a.status = 'P' THEN 'Present'
          WHEN a.status = 'A' THEN 'Absent'
          WHEN a.status = 'L' THEN 'Late'
          WHEN a.status = 'E' THEN 'Excused'
          WHEN a.status = 'D' THEN 'Dismissed'
          WHEN a.status LIKE '%In%' THEN '½Day In'
          WHEN a.status LIKE '%Out%' THEN '½Day Out'
          ELSE 'Other'
        END as status_label,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage,
        CASE 
          WHEN a.status = 'P' THEN '#10B981'
          WHEN a.status = 'A' THEN '#EF4444'
          WHEN a.status = 'L' THEN '#0d15263b'
          WHEN a.status = 'E' THEN '#8B5CF6'
          WHEN a.status = 'D' THEN '#15f112ff'
          WHEN a.status LIKE '%In%' THEN '#656f84ff'
          WHEN a.status LIKE '%Out%' THEN '#3fc4deff'
          ELSE '#3B82F6'
        END as color
      FROM attendance_records a
      LEFT JOIN students s ON a.admission_no = s.admission_no
      ${whereConditions}
      GROUP BY a.status
      ORDER BY count DESC`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return { status_breakdown: statusData };
  } catch (error) {
    console.error('Error in getStatusBreakdown:', error);
    throw error;
  }
}

// Student Summary Data
async function getStudentSummary(school_id, branch_id, startDate, endDate, class_code, limit) {
  try {
    let whereConditions = `WHERE a.school_id = :school_id 
                          AND a.branch_id = :branch_id 
                          AND a.attendance_date BETWEEN :startDate AND :endDate`;
    
    let replacements = { school_id, branch_id, startDate, endDate, limit: parseInt(limit) };

    if (class_code) {
      whereConditions += ` AND a.class_code = :class_code`;
      replacements.class_code = class_code;
    }

    const studentData = await db.sequelize.query(
      `SELECT 
        s.admission_no,
        s.admission_no,
        s.student_name,
        s.sex as gender,
        c.class_name,
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'A' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'L' THEN 1 ELSE 0 END) as late_days,
        ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_percentage,
        CASE 
          WHEN ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) >= 95 THEN 'Excellent'
          WHEN ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) >= 85 THEN 'Good'
          WHEN ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) >= 75 THEN 'Average'
          ELSE 'Poor'
        END as performance_category
      FROM attendance_records a
      LEFT JOIN students s ON a.admission_no = s.admission_no
      JOIN classes c ON a.class_code = c.class_code
      ${whereConditions}
      GROUP BY s.admission_no, s.student_name, s.sex, c.class_name
      ORDER BY attendance_percentage DESC
      LIMIT :limit`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return { student_summary: studentData };
  } catch (error) {
    console.error('Error in getStudentSummary:', error);
    throw error;
  }
}

// Gender Analytics Data
async function getGenderAnalytics(school_id, branch_id, startDate, endDate, class_code) {
  try {
    let whereConditions = `WHERE a.school_id = :school_id 
                          AND a.branch_id = :branch_id 
                          AND a.attendance_date BETWEEN :startDate AND :endDate`;
    
    let replacements = { school_id, branch_id, startDate, endDate };

    if (class_code) {
      whereConditions += ` AND a.class_code = :class_code`;
      replacements.class_code = class_code;
    }

    const genderData = await db.sequelize.query(
      `SELECT 
        CASE 
          WHEN s.sex = 'M' THEN 'Male'
          WHEN s.sex = 'F' THEN 'Female'
          ELSE 'Not Specified'
        END as gender,
        COUNT(*) as total_records,
        COUNT(DISTINCT a.admission_no) as unique_students,
        SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'A' THEN 1 ELSE 0 END) as absent_count,
        ROUND((SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
      FROM attendance_records a
      LEFT JOIN students s ON a.admission_no = s.admission_no
      ${whereConditions}
      GROUP BY COALESCE(s.sex, 'NULL')
      ORDER BY s.sex`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return { gender_analytics: genderData };
  } catch (error) {
    console.error('Error in getGenderAnalytics:', error);
    throw error;
  }
}

// Attendance Trends Data
async function getAttendanceTrends(school_id, branch_id, startDate, endDate, interval) {
  try {
    let dateFormat = '%Y-%m-%d';
    let groupBy = 'attendance_date';

    if (interval === 'weekly') {
      dateFormat = '%Y-%u';
      groupBy = 'YEARWEEK(attendance_date)';
    } else if (interval === 'monthly') {
      dateFormat = '%Y-%m';
      groupBy = 'DATE_FORMAT(attendance_date, "%Y-%m")';
    }

    const trendsData = await db.sequelize.query(
      `SELECT 
        ${groupBy} as period,
        DATE_FORMAT(attendance_date, '${dateFormat}') as formatted_date,
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'L' THEN 1 ELSE 0 END) as late,
        ROUND((SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
      FROM attendance_records 
      WHERE school_id = :school_id 
        AND branch_id = :branch_id 
        AND attendance_date BETWEEN :startDate AND :endDate
      GROUP BY ${groupBy}
      ORDER BY attendance_date`,
      {
        replacements: { school_id, branch_id, startDate, endDate },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return { attendance_trends: trendsData, interval };
  } catch (error) {
    console.error('Error in getAttendanceTrends:', error);
    throw error;
  }
}

// Export Data
async function getExportData(school_id, branch_id, startDate, endDate, class_code, gender, status) {
  try {
    let whereConditions = `WHERE a.school_id = :school_id 
                          AND a.branch_id = :branch_id 
                          AND a.attendance_date BETWEEN :startDate AND :endDate`;
    
    let replacements = { school_id, branch_id, startDate, endDate };

    if (class_code) {
      whereConditions += ` AND a.class_code = :class_code`;
      replacements.class_code = class_code;
    }

    if (gender) {
      whereConditions += ` AND s.sex = :gender`;
      replacements.gender = gender;
    }

    if (status) {
      whereConditions += ` AND a.status = :status`;
      replacements.status = status;
    }

    const exportData = await db.sequelize.query(
      `SELECT 
        s.student_name,
        s.admission_no as student_number,
        s.sex AS gender,
        c.class_name,
        a.status,
        a.attendance_date,
        a.marked_at,
        a.marked_by,
        a.remarks,
        CASE 
          WHEN a.status = 'P' THEN 'Present'
          WHEN a.status = 'A' THEN 'Absent'
          WHEN a.status = 'L' THEN 'Late'
          WHEN a.status = 'E' THEN 'Excused'
          WHEN a.status = 'D' THEN 'Dismissed'
          WHEN a.status = 'HD-IN' THEN 'Half Day In'
          WHEN a.status = 'HD-OUT' THEN 'Half Day Out'
          ELSE a.status
        END as status_label
      FROM attendance_records a
      JOIN classes c ON a.class_code = c.class_code
      LEFT JOIN students s ON a.admission_no = s.admission_no
      ${whereConditions}
      ORDER BY a.attendance_date DESC, c.class_name, s.student_name`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return { export_data: exportData };
  } catch (error) {
    console.error('Error in getExportData:', error);
    throw error;
  }
}

// Attendance Alerts
async function getAttendanceAlerts(school_id, branch_id, startDate, endDate) {
  try {
    // Students with high absenteeism
    const chronicAbsentees = await db.sequelize.query(
      `SELECT 
        s.student_name,
        s.admission_no,
        c.class_name,
        COUNT(CASE WHEN a.status = 'A' THEN 1 END) as absent_days,
        COUNT(*) as total_days,
        ROUND((COUNT(CASE WHEN a.status = 'A' THEN 1 END) * 100.0 / COUNT(*)), 2) as absenteeism_rate
      FROM attendance_records a
      LEFT JOIN students s ON a.admission_no = s.admission_no
      JOIN classes c ON a.class_code = c.class_code
      WHERE a.school_id = :school_id 
        AND a.branch_id = :branch_id 
        AND a.attendance_date BETWEEN :startDate AND :endDate
      GROUP BY s.admission_no, s.student_name, c.class_name
      HAVING absenteeism_rate > 20
      ORDER BY absenteeism_rate DESC
      LIMIT 20`,
      {
        replacements: { school_id, branch_id, startDate, endDate },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    // Classes with low attendance
    const lowPerformingClasses = await db.sequelize.query(
      `SELECT 
        c.class_name,
        ROUND(AVG(CASE WHEN a.status = 'P' THEN 100.0 ELSE 0.0 END), 2) as avg_attendance_rate,
        COUNT(*) as total_records
      FROM attendance_records a
      JOIN classes c ON a.class_code = c.class_code
      WHERE a.school_id = :school_id 
        AND a.branch_id = :branch_id 
        AND a.attendance_date BETWEEN :startDate AND :endDate
      GROUP BY c.class_name
      HAVING avg_attendance_rate < 80
      ORDER BY avg_attendance_rate ASC
      LIMIT 10`,
      {
        replacements: { school_id, branch_id, startDate, endDate },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    return { 
      alerts: {
        chronic_absentees: chronicAbsentees,
        low_performing_classes: lowPerformingClasses,
        alert_count: chronicAbsentees.length + lowPerformingClasses.length
      }
    };
  } catch (error) {
    console.error('Error in getAttendanceAlerts:', error);
    throw error;
  }
}
 app.get("/attendance/export/:format", authenticate, async (req, res) => {
    try {
      // Validate headers
      const schoolIdHeader = req.get("x-school-id");
      const branchIdHeader = req.get("x-branch-id");
      const authHeader = req.get("Authorization");
      const isAdmin = !req.user.branch_id || req.user.branch_id === "";

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Missing or invalid Authorization header",
        });
      }
      if (!schoolIdHeader || schoolIdHeader === "undefined") {
        return res.status(400).json({
          success: false,
          message: "Missing or invalid x-school-id header",
        });
      }
      if (!isAdmin && (!branchIdHeader || branchIdHeader === "undefined")) {
        return res.status(400).json({
          success: false,
          message: "Missing x-branch-id header for non-admin user",
        });
      }
      if (schoolIdHeader !== req.user.school_id) {
        return res.status(403).json({
          success: false,
          message: "x-school-id header does not match user school_id",
        });
      }

      // Validate query parameters
      const { branch_id, startDate, endDate, class_code, gender, status } = req.query;
      const queryErrors = validateQuery({ branch_id, startDate, endDate, class_code, gender, status });
      if (queryErrors) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          error: queryErrors.join(", "),
        });
      }

      const format = req.params.format.toLowerCase();
      if (!["json", "csv"].includes(format)) {
        return res.status(400).json({
          success: false,
          message: "Unsupported export format. Use json or csv.",
        });
      }

      // Fetch data
      const exportResult = await getExportData(
        req.user.school_id,
        branch_id,
        startDate,
        endDate,
        class_code,
        gender,
        status
      );

      const data = exportResult.export_data;

      // JSON response
      if (format === "json") {
        return res.json({
          success: true,
          data,
          count: data.length,
        });
      }

      // CSV response
      if (format === "csv") {
        const csvHeaders = [
          "Student Name",
          "Student Number",
          "Class",
          "Status",
          "Gender",
          "Date",
          "Marked At",
          "Marked By",
          "Remarks",
        ];

        const csvRows = data.map((row) => ({
          "Student Name": row.student_name || "N/A",
          "Student Number": row.student_number || "N/A",
          Class: row.class_name,
          Status: row.status_label,
          Gender: row.gender === "M" ? "Male" : row.gender === "F" ? "Female" : "N/A",
          Date: row.attendance_date,
          "Marked At": row.marked_at,
          "Marked By": row.marked_by || req.user.username || req.user.id || "System",
          Remarks: row.remarks || "",
        }));

        const csvStream = stringify(csvRows, {
          header: true,
          columns: csvHeaders,
          quoted_string: true,
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=attendance_report_${sanitizeFilename(startDate)}_to_${sanitizeFilename(endDate)}.csv`
        );

        csvStream.pipe(res);
        return;
      }
    } catch (error) {
      console.error("Error exporting attendance data:", {
        error: error.message,
        stack: error.stack,
        school_id: req.user?.school_id,
        format: req.params.format,
        query: req.query,
      });

      return res.status(500).json({
        success: false,
        message: "Internal server error while exporting data",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });
 //GET  attendance-setup
  //  app.get('/api/attendance-setup',authenticate,
  //       (req, res, next) => {
  //         req.body = req.query;
  //         attendanceSetup(req, res);
  //       }
  //   );
  //    app.post('/api/attendance-setup',
  //     authenticate,
  //       attendanceSetup
  //   );
   
}