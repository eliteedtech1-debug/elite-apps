const moment = require("moment");
const db = require("../models");

function calculateStatus(checkInTime, workStartTime, lateThreshold) {
  const checkIn = moment(checkInTime, "HH:mm:ss");
  const workStart = moment(workStartTime, "HH:mm:ss");
  const lateLimit = workStart.clone().add(lateThreshold, "minutes");

  if (checkIn.isAfter(lateLimit)) {
    return "late";
  } else {
    return "present";
  }
}

function calculatePunctualityScore(stats) {
  const totalWorkDays = stats.present_days + stats.late_days + stats.half_days;
  if (totalWorkDays === 0) return 0;

  const punctualDays = stats.present_days + stats.half_days * 0.5;
  return Math.round((punctualDays / totalWorkDays) * 100 * 100) / 100; // Round to 2 decimal places
}

exports.signin = async (req, res) => {
  console.log(req.body, "signinnnnnnnnnnnnnnnnnnnnnnnnnnnnnn");
  try {
    const { user_id, school_id, timestamp, ip_address, location_data } =
      req.body;

    if (!user_id || !school_id || !timestamp) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: user_id, school_id, timestamp",
      });
    }

    const date = moment(timestamp).format("YYYY-MM-DD");
    const time = moment(timestamp).format("HH:mm:ss");

    const [existingRecord] = await db.sequelize.query(
      "SELECT * FROM attendance_new WHERE user_id = :user_id AND date = :date",
      {
        replacements: { user_id, date },
      }
    );

    if (existingRecord.length > 0 && existingRecord[0].check_in_time) {
      return res.status(400).json({
        success: false,
        message: "User has already signed in today",
      });
    }

    const [schoolData] = await db.sequelize.query(
      "SELECT work_start_time, late_threshold_minutes FROM schools WHERE school_id = :school_id",
      {
        replacements: { school_id },
      }
    );

    if (schoolData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }
    console.log(schoolData, "schoolData");

    const { work_start_time, late_threshold_minutes } = schoolData[0];
    const status = calculateStatus(
      time,
      work_start_time,
      late_threshold_minutes
    );

    if (existingRecord.length > 0) {
      await db.sequelize.query(
        `UPDATE attendance_new SET 
         check_in_time = :time, status = :status, ip_address = :ip_address, updated_at = NOW()
         WHERE user_id = :user_id AND date = :date`,
        {
          replacements: {
            time,
            status,
            ip_address,
            location_data,
            user_id,
            date,
          },
          type: db.sequelize.QueryTypes.UPDATE,
        }
      );
    } else {
      await db.sequelize.query(
        `INSERT INTO attendance_new (user_id, school_id, date, check_in_time, status, ip_address)
         VALUES (:user_id, :school_id, :date, :time, :status, :ip_address)`,
        {
          replacements: { user_id, school_id, date, time, status, ip_address },
          type: db.sequelize.QueryTypes.INSERT,
        }
      );
    }

    await db.sequelize.query(
      `INSERT INTO attendance_logs (user_id, school_id, action_type, timestamp, ip_address)
       VALUES (:user_id, :school_id, 'signin', :timestamp, :ip_address)`,
      {
        replacements: { user_id, school_id, timestamp, ip_address },
        type: db.sequelize.QueryTypes.INSERT,
      }
    );

    // Update monthly stats
    await updateMonthlyStats(user_id, school_id, date);

    res.json({
      success: true,
      message: "Sign in recorded successfully",
      data: {
        status,
        time,
        date,
      },
    });
  } catch (error) {
    console.error("Sign in error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Sign Out Endpoint
exports.signout = async (req, res) => {
  try {
    const { user_id, school_id, timestamp, ip_address, location_data } =
      req.body;

    if (!user_id || !school_id || !timestamp) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: user_id, school_id, timestamp",
      });
    }

    const date = moment(timestamp).format("YYYY-MM-DD");
    const time = moment(timestamp).format("HH:mm:ss");

    // Check if user has signed in today
    const [existingRecord] = await db.execute(
      "SELECT * FROM attendance WHERE user_id = ? AND date = ? AND check_in_time IS NOT NULL",
      [user_id, date]
    );

    if (existingRecord.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot sign out without signing in first",
      });
    }

    // Update check out time
    await db.execute(
      "UPDATE attendance SET check_out_time = ?, updated_at = NOW() WHERE user_id = ? AND date = ?",
      [time, user_id, date]
    );

    // Log the sign-out action
    await db.execute(
      `INSERT INTO attendance_logs (user_id, school_id, action_type, timestamp, ip_address, location_data)
       VALUES (?, ?, 'signout', ?, ?, ?)`,
      [user_id, school_id, timestamp, ip_address, JSON.stringify(location_data)]
    );

    res.json({
      success: true,
      message: "Sign out recorded successfully",
      data: {
        time,
        date,
      },
    });
  } catch (error) {
    console.error("Sign out error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get User Attendance Status for Today
exports.status = async (req, res) => {
  try {
    const { user_id } = req.params;
    const today = moment().format("YYYY-MM-DD");

    const [attendance] = await db.execute(
      `SELECT a.*, u.username, u.user_type, s.school_name 
       FROM attendance a
       JOIN users u ON a.user_id = u.user_id
       JOIN schools s ON a.school_id = s.school_id
       WHERE a.user_id = ? AND a.date = ?`,
      [user_id, today]
    );

    if (attendance.length === 0) {
      return res.json({
        success: true,
        data: {
          hasSignedInToday: false,
          hasSignedOutToday: false,
          status: "absent",
        },
      });
    }

    const record = attendance[0];
    res.json({
      success: true,
      data: {
        hasSignedInToday: !!record.check_in_time,
        hasSignedOutToday: !!record.check_out_time,
        status: record.status,
        check_in_time: record.check_in_time,
        check_out_time: record.check_out_time,
        date: record.date,
      },
    });
  } catch (error) {
    console.error("Get status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get Attendance Report
exports.report = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { month, year } = req.query;

    let dateFilter = "";
    let params = [user_id];

    if (month && year) {
      dateFilter = "AND MONTH(a.date) = ? AND YEAR(a.date) = ?";
      params.push(month, year);
    } else {
      // Default to current month
      dateFilter =
        "AND MONTH(a.date) = MONTH(CURDATE()) AND YEAR(a.date) = YEAR(CURDATE())";
    }

    const [attendanceRecords] = await db.execute(
      `SELECT a.*, u.username, u.user_type, s.school_name
       FROM attendance a
       JOIN users u ON a.user_id = u.user_id
       JOIN schools s ON a.school_id = s.school_id
       WHERE a.user_id = ? ${dateFilter}
       ORDER BY a.date DESC`,
      params
    );

    // Get monthly stats
    const monthStr =
      month && year
        ? `${year}-${String(month).padStart(2, "0")}`
        : moment().format("YYYY-MM");
    const [stats] = await db.execute(
      "SELECT * FROM attendance_stats WHERE user_id = ? AND month = ?",
      [user_id, monthStr]
    );

    res.json({
      success: true,
      data: {
        records: attendanceRecords,
        stats: stats[0] || null,
      },
    });
  } catch (error) {
    console.error("Get report error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update Monthly Statistics
async function updateMonthlyStats(user_id, school_id, date) {
  try {
    const month = moment(date).format("YYYY-MM");

    // Get attendance counts for the month
    const [counts] = await db.execute(
      `SELECT 
         COUNT(*) as total_days,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
         SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days,
         SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_days
       FROM attendance 
       WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [user_id, month]
    );

    const stats = counts[0];
    const punctualityScore = calculatePunctualityScore(stats);

    // Insert or update stats
    await db.execute(
      `INSERT INTO attendance_stats 
       (user_id, school_id, month, total_days, present_days, absent_days, late_days, half_days, excused_days, punctuality_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_days = VALUES(total_days),
       present_days = VALUES(present_days),
       absent_days = VALUES(absent_days),
       late_days = VALUES(late_days),
       half_days = VALUES(half_days),
       excused_days = VALUES(excused_days),
       punctuality_score = VALUES(punctuality_score),
       updated_at = NOW()`,
      [
        user_id,
        school_id,
        month,
        stats.total_days,
        stats.present_days,
        stats.absent_days,
        stats.late_days,
        stats.half_days,
        stats.excused_days,
        punctualityScore,
      ]
    );
  } catch (error) {
    console.error("Error updating monthly stats:", error);
  }
}

// Get School Dashboard Stats
exports.dashboard = async (req, res) => {
  try {
    const { school_id } = req.params;
    const today = moment().format("YYYY-MM-DD");

    // Today's attendance summary
    const [todayStats] = await db.execute(
      `SELECT 
         COUNT(*) as total_expected,
         SUM(CASE WHEN check_in_time IS NOT NULL THEN 1 ELSE 0 END) as signed_in,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as on_time,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
       FROM attendance a
       JOIN users u ON a.user_id = u.user_id
       WHERE a.school_id = ? AND a.date = ? AND u.user_type IN ('teacher', 'admin', 'branchadmin')`,
      [school_id, today]
    );

    // This month's overview
    const currentMonth = moment().format("YYYY-MM");
    const [monthlyStats] = await db.execute(
      `SELECT 
         AVG(punctuality_score) as avg_punctuality,
         COUNT(*) as total_staff
       FROM attendance_stats 
       WHERE school_id = ? AND month = ?`,
      [school_id, currentMonth]
    );

    res.json({
      success: true,
      data: {
        today: todayStats[0],
        monthly: monthlyStats[0],
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.postAttendanceSetup = async (req, res) => {
  const {
    school_id = "",
    branch_id = "",
    allow_backdated_attendance = 0,
    backdated_days = 0,
  } = req.body;

  try {
    // Call the attendance_setup stored procedure to update
    await db.sequelize.query(
      `CALL attendance_setup('UPDATE', :school_id, :branch_id, :allow_backdated_attendance, :backdated_days)`,
      {
        replacements: {
          school_id,
          branch_id,
          allow_backdated_attendance,
          backdated_days,
        },
      }
    );

    res.json({
      success: true,
      message: "Attendance setup updated successfully",
    });
  } catch (error) {
    console.error("Error updating attendance setup:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getAttendanceSetup = async (req, res) => {
  try {
    const { school_id, branch_id } = req.query;

    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "school_id and branch_id are required",
      });
    }

    // Call the attendance_setup stored procedure to select
    const attendanceSetup = await db.sequelize.query(
      `CALL attendance_setup('SELECT', :school_id, :branch_id, NULL, NULL)`,
      { replacements: { school_id, branch_id } }
    );

    res.json({
      success: true,
      data: attendanceSetup,
    });
  } catch (error) {
    console.error("Error getting attendance setup:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/// chabges
exports.getAttendanceSetupById = async (req, res) => {
  try {
    const { school_id, branch_id } = req.query;

    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "school_id and branch_id are required",
      });
    }

    // Call the attendance_setup stored procedure to select
    const attendanceSetup = await db.sequelize.query(
      `CALL attendance_setup('SELECT', :school_id, :branch_id, NULL, NULL)`,
      { replacements: { school_id, branch_id } }
    );

    res.json({
      success: true,
      data: attendanceSetup,
    });
  } catch (error) {
    console.error("Error getting attendance setup:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getAttendanceAllAttendance = async (req, res) => {
  try {
    const [attendanceAll] = await db.sequelize.query(
      `SELECT a.*, s.school_name  AS school_name, 
       FROM attendance_new a 
       JOIN school_setup s ON s.school_id = a.school_id`
    );

    res.json({
      success: true,
      data: attendanceAll,
    });
  } catch (error) {
    console.error("Error getting attendance records:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        date,
        school_id,
        school_name,
        COUNT(CASE WHEN check_in_time IS NOT NULL THEN 1 END) AS checked_in_users,
        COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) AS checked_out_users,
        COUNT(*) AS total_users
      FROM attendance_new
      GROUP BY date, school_id, school_name
      ORDER BY date DESC, school_name
    `;

    const [summary] = await db.sequelize.query(query);
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error getting attendance summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getDetailedAttendance = async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { school_id, date, user_id, status } = req.query;
    
    let baseQuery = `
      SELECT 
        attendance_id,
        user_id,
        school_id,
        school_name,
        date,
        check_in_time,
        check_out_time,
        status,
        ip_address,
        location_data,
        notes,
        created_at,
        updated_at
      FROM attendance_new
    `;
    
    const conditions = [];
    const params = [];
    
    if (school_id) {
      conditions.push('school_id = ?');
      params.push(school_id);
    }
    
    if (date) {
      conditions.push('date = ?');
      params.push(date);
    }
    
    if (user_id) {
      conditions.push('user_id = ?');
      params.push(user_id);
    }
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    baseQuery += ' ORDER BY date DESC, school_name, user_id';
    
    const [details] = await db.sequelize.query(baseQuery, {
      replacements: params
    });
    
    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error("Error getting detailed attendance:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateAttendanceStatus = async (req, res) => {
  const {
    school_id = "",
    branch_id = "",
    allow_backdated_attendance = 0,
    backdated_days = 0,
  } = req.body;

  if (!school_id || !branch_id) {
    return res.status(400).json({
      success: false,
      message: "school_id and branch_id are required",
    });
  }

  try {
    // Call the attendance_setup stored procedure to update
    await db.sequelize.query(
      `CALL attendance_setup('UPDATE', :school_id, :branch_id, :allow_backdated_attendance, :backdated_days)`,
      {
        replacements: {
          school_id,
          branch_id,
          allow_backdated_attendance,
          backdated_days,
        },
      }
    );

    res.json({
      success: true,
      message: "Attendance status updated successfully",
    });
  } catch (error) {
    console.error("Error updating attendance status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
