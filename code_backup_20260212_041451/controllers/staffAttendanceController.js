/**
 * Staff Attendance Controller
 * 
 * Handles all staff attendance operations including:
 * - Viewing attendance records
 * - Manual attendance entry
 * - Biometric CSV/Excel import
 * - Attendance reports and analytics
 */

const db = require('../models');
const {
  markGPSAttendance,
  validateGPSLocation,
  importBiometricAttendance,
  getAttendanceRecords
} = require('../services/staffAttendanceService');

/**
 * Mark automatic attendance (login-based)
 * 
 * @route POST /api/staff-attendance
 * @body {string} staff_id - Staff ID
 * @body {string} teacher_id - Teacher ID (same as staff_id)
 * @body {string} school_id - School ID
 * @body {string} branch_id - Branch ID
 * @body {string} date - Date YYYY-MM-DD
 * @body {string} time_in - Time HH:MM:SS
 * @body {string} status - Status (Present, Late, etc.)
 * @body {number} latitude - GPS latitude (optional)
 * @body {number} longitude - GPS longitude (optional)
 * @body {boolean} login_attendance - Flag for login-based attendance
 */
const markAttendance = async (req, res) => {
  try {
    const {
      staff_id,
      teacher_id,
      school_id,
      branch_id,
      date,
      time_in,
      latitude,
      longitude,
      login_attendance = false
    } = req.body;

    if (!staff_id || !school_id || !branch_id || !date || !time_in) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: staff_id, school_id, branch_id, date, time_in'
      });
    }

    // Check if attendance already exists for today
    const existingAttendance = await db.sequelize.query(
      `SELECT id FROM staff_attendance 
       WHERE staff_id = :staff_id 
       AND school_id = :school_id 
       AND branch_id = :branch_id 
       AND date = :date`,
      {
        replacements: { staff_id, school_id, branch_id, date },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (existingAttendance.length > 0) {
      return res.json({
        success: true,
        message: 'Attendance already marked for today',
        data: existingAttendance[0]
      });
    }

    // Get branch opening time to determine status
    const [branchInfo] = await db.sequelize.query(
      `SELECT opening_time, closing_time FROM school_locations 
       WHERE school_id = :school_id AND branch_id = :branch_id`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Determine status based on check-in time vs opening time
    let status = 'Present';
    let lateMinutes = 0;
    
    if (branchInfo && branchInfo.opening_time) {
      const openingTime = branchInfo.opening_time; // Format: HH:MM:SS
      const checkInTime = time_in; // Format: HH:MM:SS
      
      // Convert times to minutes for comparison
      const [openHour, openMin] = openingTime.split(':').map(Number);
      const [checkHour, checkMin] = checkInTime.split(':').map(Number);
      
      const openingMinutes = openHour * 60 + openMin;
      const checkInMinutes = checkHour * 60 + checkMin;
      
      if (checkInMinutes > openingMinutes) {
        lateMinutes = checkInMinutes - openingMinutes;
        status = lateMinutes > 15 ? 'Late' : 'Present'; // Grace period of 15 minutes
      }
    }

    // Insert attendance record with calculated status
    const [result] = await db.sequelize.query(
      `INSERT INTO staff_attendance 
       (staff_id, school_id, branch_id, date, check_in_time, status, gps_lat, gps_lon, method, remarks, created_at) 
       VALUES (:staff_id, :school_id, :branch_id, :date, :check_in_time, :status, :gps_lat, :gps_lon, :method, :remarks, NOW())`,
      {
        replacements: {
          staff_id,
          school_id,
          branch_id,
          date,
          check_in_time: `${date} ${time_in}`,
          status,
          gps_lat: latitude || null,
          gps_lon: longitude || null,
          method: login_attendance ? 'GPS' : 'Manual',
          remarks: lateMinutes > 0 ? `Late by ${lateMinutes} minutes` : null
        }
      }
    );

    res.json({
      success: true,
      message: `Attendance marked successfully - ${status}${lateMinutes > 0 ? ` (${lateMinutes} min late)` : ''}`,
      data: { 
        id: result.insertId,
        status,
        late_minutes: lateMinutes,
        opening_time: branchInfo?.opening_time,
        check_in_time: time_in
      }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
};

/**
 * Get attendance records for staff
 * 
 * @route GET /api/staff-attendance
 * @query {string} school_id - School ID (required)
 * @query {string} branch_id - Branch ID (optional)
 * @query {string} staff_id - Staff ID (optional)
 * @query {string} start_date - Start date YYYY-MM-DD (optional)
 * @query {string} end_date - End date YYYY-MM-DD (optional)
 * @query {string} method - Filter by method: GPS, Manual, Biometric (optional)
 */
const getAttendance = async (req, res) => {
  try {
    const { school_id, branch_id, staff_id, start_date, end_date, method } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const records = await getAttendanceRecords({
      school_id,
      branch_id,
      staff_id,
      start_date,
      end_date
    });

    // Filter by method if specified
    let filteredRecords = records;
    if (method) {
      filteredRecords = records.filter(r => r.method === method);
    }

    res.json({
      success: true,
      data: filteredRecords,
      count: filteredRecords.length
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

/**
 * Mark manual attendance
 * 
 * @route POST /api/staff-attendance/manual
 * @body {string} staff_id - Staff ID
 * @body {string} school_id - School ID
 * @body {string} branch_id - Branch ID
 * @body {string} date - Date YYYY-MM-DD
 * @body {string} check_in_time - Check-in time
 * @body {string} check_out_time - Check-out time (optional)
 * @body {string} status - Status: Present, Late, Absent, etc.
 * @body {string} remarks - Remarks (optional)
 */
const markManualAttendance = async (req, res) => {
  try {
    const {
      staff_id,
      school_id,
      branch_id,
      date,
      check_in_time,
      check_out_time,
      status,
      remarks
    } = req.body;

    // Validate required fields
    if (!staff_id || !school_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, School ID, and Date are required'
      });
    }

    // Check if attendance already exists
    const [existing] = await db.sequelize.query(
      `SELECT id FROM staff_attendance 
       WHERE staff_id = :staff_id 
         AND date = :date 
         AND school_id = :school_id`,
      {
        replacements: { staff_id, date, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (existing) {
      // Update existing record
      await db.sequelize.query(
        `UPDATE staff_attendance 
         SET check_in_time = :check_in_time,
             check_out_time = :check_out_time,
             status = :status,
             remarks = :remarks,
             method = 'Manual',
             updated_at = NOW(),
             updated_by = :updated_by
         WHERE id = :id`,
        {
          replacements: {
            id: existing.id,
            check_in_time,
            check_out_time: check_out_time || null,
            status: status || 'Present',
            remarks: remarks || null,
            updated_by: req.user?.id || null
          }
        }
      );

      res.json({
        success: true,
        message: 'Attendance updated successfully',
        data: { id: existing.id, staff_id, date, status }
      });
    } else {
      // Insert new record
      const [result] = await db.sequelize.query(
        `INSERT INTO staff_attendance 
         (staff_id, school_id, branch_id, date, check_in_time, check_out_time,
          method, status, remarks, created_by, created_at)
         VALUES 
         (:staff_id, :school_id, :branch_id, :date, :check_in_time, :check_out_time,
          'Manual', :status, :remarks, :created_by, NOW())`,
        {
          replacements: {
            staff_id,
            school_id,
            branch_id: branch_id || null,
            date,
            check_in_time,
            check_out_time: check_out_time || null,
            status: status || 'Present',
            remarks: remarks || null,
            created_by: req.user?.id || null
          },
          type: db.sequelize.QueryTypes.INSERT
        }
      );

      res.json({
        success: true,
        message: 'Attendance marked successfully',
        data: { id: result, staff_id, date, status }
      });
    }
  } catch (error) {
    console.error('Error marking manual attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
};

/**
 * Mark checkout for staff
 * 
 * @route POST /api/staff-attendance/:id/checkout
 * @body {string} check_out_time - Check-out time
 * @body {string} remarks - Remarks (optional)
 */
const markCheckout = async (req, res) => {
  try {
    const { id } = req.params;
    const { check_out_time, remarks, status, requires_review } = req.body;

    // Validate required fields
    if (!check_out_time) {
      return res.status(400).json({
        success: false,
        message: 'Check-out time is required'
      });
    }

    // Find the attendance record
    const attendance = await db.sequelize.query(
      `SELECT * FROM staff_attendance WHERE id = :id`,
      {
        replacements: { id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!attendance || attendance.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Check if already checked out
    if (attendance[0].check_out_time) {
      return res.status(400).json({
        success: false,
        message: 'Staff has already checked out'
      });
    }

    // Build dynamic update query
    let updateQuery = `UPDATE staff_attendance 
       SET check_out_time = :check_out_time,
           remarks = CONCAT(COALESCE(remarks, ''), ' | ', :remarks)`;
    
    const replacements = {
      id,
      check_out_time,
      remarks: remarks || 'Checked out'
    };

    // Add status if provided
    if (status) {
      updateQuery += `, status = :status`;
      replacements.status = status;
    }

    // Add requires_review flag if provided
    if (requires_review !== undefined) {
      updateQuery += `, requires_review = :requires_review`;
      replacements.requires_review = requires_review;
    }

    updateQuery += `, updated_at = NOW() WHERE id = :id`;

    // Update with checkout time
    await db.sequelize.query(updateQuery, {
      replacements
    });

    res.json({
      success: true,
      message: 'Checkout marked successfully',
      data: { id, check_out_time }
    });
  } catch (error) {
    console.error('Error marking checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark checkout',
      error: error.message
    });
  }
};

/**
 * Import biometric attendance from CSV/Excel
 * 
 * @route POST /api/staff-attendance/import
 * @body {string} school_id - School ID
 * @body {string} branch_id - Branch ID
 * @body {array} records - Array of attendance records
 * @body {string} file_name - Original file name
 * 
 * Expected record format:
 * {
 *   staff_id: "STF001",
 *   date: "2024-12-02",
 *   check_in_time: "2024-12-02 08:30:00",
 *   check_out_time: "2024-12-02 17:00:00",
 *   status: "Present"
 * }
 */
const importBiometric = async (req, res) => {
  try {
    const { school_id, branch_id, records, file_name } = req.body;

    // Validate required fields
    if (!school_id || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'School ID and records array are required'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records to import'
      });
    }

    // Import records
    const result = await importBiometricAttendance({
      school_id,
      branch_id,
      records,
      file_name: file_name || 'biometric_import.csv',
      imported_by: req.user?.id || null
    });

    res.json(result);
  } catch (error) {
    console.error('Error importing biometric attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import attendance',
      error: error.message
    });
  }
};

/**
 * Get attendance summary/statistics
 * 
 * @route GET /api/staff-attendance/summary
 * @query {string} school_id - School ID (required)
 * @query {string} branch_id - Branch ID (optional)
 * @query {string} start_date - Start date YYYY-MM-DD (required)
 * @query {string} end_date - End date YYYY-MM-DD (required)
 */
const getAttendanceSummary = async (req, res) => {
  try {
    const { school_id, branch_id, start_date, end_date } = req.query;

    if (!school_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'School ID, start_date, and end_date are required'
      });
    }

    let query = `
      SELECT 
        DATE(date) as date,
        COUNT(DISTINCT staff_id) as total_staff,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) as leave_count,
        SUM(CASE WHEN method = 'GPS' THEN 1 ELSE 0 END) as gps_count,
        SUM(CASE WHEN method = 'Biometric' THEN 1 ELSE 0 END) as biometric_count,
        SUM(CASE WHEN method = 'Manual' THEN 1 ELSE 0 END) as manual_count
      FROM staff_attendance
      WHERE school_id = :school_id
        AND date BETWEEN :start_date AND :end_date
    `;

    const replacements = { school_id, start_date, end_date };

    if (branch_id) {
      query += ` AND branch_id = :branch_id`;
      replacements.branch_id = branch_id;
    }

    query += ` GROUP BY DATE(date) ORDER BY date DESC`;

    const summary = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: summary,
      count: summary.length
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance summary',
      error: error.message
    });
  }
};

/**
 * Get import history
 * 
 * @route GET /api/staff-attendance/import-history
 * @query {string} school_id - School ID (required)
 * @query {string} branch_id - Branch ID (optional)
 * @query {number} limit - Limit results (default: 50)
 */
const getImportHistory = async (req, res) => {
  try {
    const { school_id, branch_id, limit = 50 } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    let query = `
      SELECT 
        bil.*,
        u.name as imported_by_name,
        u.email as imported_by_email
      FROM biometric_import_log bil
      LEFT JOIN users u ON bil.imported_by = u.id
      WHERE bil.school_id = :school_id
    `;

    const replacements = { school_id };

    if (branch_id) {
      query += ` AND bil.branch_id = :branch_id`;
      replacements.branch_id = branch_id;
    }

    query += ` ORDER BY bil.created_at DESC LIMIT :limit`;
    replacements.limit = parseInt(limit);

    const history = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching import history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch import history',
      error: error.message
    });
  }
};

/**
 * Quick scan for staff attendance using QR code
 * 
 * @route POST /api/staff-attendance/quick-scan
 * @body {string} staff_id - Staff ID from QR code
 * @body {string} date - Date YYYY-MM-DD (optional, defaults to today)
 * @body {string} time - Time HH:MM:SS (optional, defaults to now)
 * @body {object} location - GPS location (optional)
 */
const quickScan = async (req, res) => {
  try {
    const { staff_id, date, time, location } = req.body;

    if (!staff_id) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required field: staff_id is required." 
      });
    }

    // Get staff information by staff_id
    const staffQuery = `
      SELECT t.id as staff_id, t.name as staff_name, t.teacher_id, t.staff_id as staff_code, 
             t.school_id, t.branch_id, t.department, t.role
      FROM teachers t 
      WHERE (t.teacher_id = ? OR t.staff_id = ? OR t.id = ?) AND t.status = 'active'
      LIMIT 1
    `;
    
    const [staffResults] = await db.sequelize.query(staffQuery, { 
      replacements: [staff_id, staff_id, staff_id] 
    });

    if (!staffResults || staffResults.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Staff member not found or inactive",
        staff_id: staff_id
      });
    }

    const staff = staffResults[0];
    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const attendanceTime = time || new Date().toTimeString().split(' ')[0].substring(0, 8);

    // Check if attendance already exists for today
    const existingAttendanceQuery = `
      SELECT id FROM staff_attendance 
      WHERE staff_id = ? AND school_id = ? AND branch_id = ? AND date = ? 
      LIMIT 1
    `;
    
    const [existingResults] = await db.sequelize.query(existingAttendanceQuery, { 
      replacements: [staff.staff_id, staff.school_id, staff.branch_id || null, attendanceDate] 
    });

    if (existingResults && existingResults.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: "Attendance already marked for today",
        staff_name: staff.staff_name,
        staff_id: staff_id,
        date: attendanceDate
      });
    }

    // Get branch opening time to determine status
    const [branchInfo] = await db.sequelize.query(
      `SELECT opening_time, closing_time FROM school_locations 
       WHERE school_id = ? AND branch_id = ?`,
      {
        replacements: [staff.school_id, staff.branch_id || null],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Determine status based on check-in time vs opening time
    let status = 'Present';
    if (branchInfo && branchInfo.opening_time) {
      const openingTime = branchInfo.opening_time;
      const [openHour, openMin] = openingTime.split(':').map(Number);
      const [checkHour, checkMin] = attendanceTime.split(':').map(Number);
      
      const openingMinutes = openHour * 60 + openMin;
      const checkInMinutes = checkHour * 60 + checkMin;
      
      if (checkInMinutes > openingMinutes + 15) {
        status = 'Late';
      }
    }

    // Insert new attendance record
    const insertQuery = `
      INSERT INTO staff_attendance (
        staff_id, teacher_id, school_id, branch_id, date, check_in_time, status, 
        gps_lat, gps_lon, method, scan_method, location_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'qr_scan', 'qr_scan', ?, NOW())
    `;

    const locationData = location ? JSON.stringify(location) : null;
    const gpsLat = location?.latitude || null;
    const gpsLon = location?.longitude || null;

    await db.sequelize.query(insertQuery, { 
      replacements: [
        staff.staff_id,
        staff.teacher_id || staff.staff_id,
        staff.school_id,
        staff.branch_id || null,
        attendanceDate,
        attendanceTime,
        status,
        gpsLat,
        gpsLon,
        locationData
      ] 
    });

    res.status(200).json({
      success: true,
      message: "Staff attendance marked successfully",
      staff_id: staff.staff_id,
      staff_name: staff.staff_name,
      teacher_id: staff.teacher_id || staff.staff_id,
      date: attendanceDate,
      time: attendanceTime,
      status: status
    });

  } catch (error) {
    console.error("Error in staff quick attendance scan:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to mark attendance",
      message: error.message 
    });
  }
};

module.exports = {
  getAttendance,
  markAttendance,
  markManualAttendance,
  markCheckout,
  importBiometric,
  getAttendanceSummary,
  getImportHistory,
  quickScan
};
