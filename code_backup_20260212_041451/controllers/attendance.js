const db = require("../models");

// Attendance Scanner for QR codes
exports.quickScan = async (req, res) => {
  const { admission_no, date, time, location } = req.body;
  
  if (!admission_no || !date) {
    return res.status(400).json({ 
      error: "Missing required fields: admission_no and date are required." 
    });
  }

  // Get user ID from authenticated request (req.user should exist if passport middleware is used)
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required",
      message: "User must be authenticated to mark attendance"
    });
  }
  
  // Use authenticated user's ID for marked_by field
  const markedBy = req.user.id.toString();

  try {
    // First, get student information by admission number
    const studentQuery = `
      SELECT s.id as student_id, s.student_name, s.admission_no, s.current_class, s.class_name,
             s.school_id, s.branch_id
      FROM students s 
      WHERE s.admission_no = ? AND s.status = 'active'
      LIMIT 1
    `;
    
    const [studentResults] = await db.sequelize.query(studentQuery, { 
      replacements: [admission_no] 
    });

    if (!studentResults || studentResults.length === 0) {
      return res.status(404).json({ 
        error: "Student not found or inactive",
        admission_no: admission_no
      });
    }

    const student = studentResults[0];

    // Get school opening and closing time from school_locations table
    const schoolTimeQuery = `
      SELECT opening_time, closing_time 
      FROM school_locations 
      WHERE school_id = ? AND (branch_id = ? OR branch_id IS NULL)
      LIMIT 1
    `;
    
    const [schoolTimeResults] = await db.sequelize.query(schoolTimeQuery, { 
      replacements: [student.school_id, student.branch_id] 
    });

    // Determine attendance status based on current time vs opening/closing time
    let status = 'P'; // Default to Present
    const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS format
    
    if (schoolTimeResults && schoolTimeResults.length > 0) {
      const { opening_time, closing_time } = schoolTimeResults[0];
      
      if (opening_time && closing_time) {
        // Calculate half-day point (midpoint between opening and closing)
        const openingMinutes = timeToMinutes(opening_time);
        const closingMinutes = timeToMinutes(closing_time);
        const halfDayMinutes = openingMinutes + ((closingMinutes - openingMinutes) / 2);
        const currentMinutes = timeToMinutes(currentTime);
        
        if (currentMinutes > openingMinutes && currentMinutes <= halfDayMinutes) {
          status = 'L'; // Late
        } else if (currentMinutes > halfDayMinutes) {
          status = 'HD-IN'; // Half-day in (very late arrival)
        }
        // Note: HD-OUT would be handled by a separate checkout endpoint
      }
    }

    // Helper function to convert time string to minutes
    function timeToMinutes(timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }

    // Get academic_week_id for the attendance date
    let academicWeekId = 0;
    try {
      // Try to get academic_week_id from Academic_weeks table (case may vary)
      const weekQuery = `
        SELECT id FROM Academic_weeks 
        WHERE ? BETWEEN \`begin\` AND \`end\`
          AND academic_year = (SELECT academic_year FROM students WHERE admission_no = ? LIMIT 1)
        LIMIT 1
      `;
      const [weekResults] = await db.sequelize.query(weekQuery, {
        replacements: [date, admission_no]
      });
      if (weekResults && weekResults.length > 0) {
        academicWeekId = weekResults[0].id;
      }
    } catch (weekError) {
      // If academic_week_id not found, use 0 (can be updated later)
      console.warn('Could not fetch academic_week_id, using default 0:', weekError.message);
      academicWeekId = 0;
    }

    // Check if attendance already exists for today (with multi-tenant support)
    const existingAttendanceQuery = `
      SELECT id FROM attendance_records 
      WHERE admission_no = ? AND attendance_date = ? AND school_id = ? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))
      LIMIT 1
    `;
    
    const [existingResults] = await db.sequelize.query(existingAttendanceQuery, { 
      replacements: [
        admission_no, 
        date, 
        student.school_id,
        student.branch_id || null,
        student.branch_id || null
      ] 
    });

    if (existingResults && existingResults.length > 0) {
      return res.status(409).json({ 
        error: "Attendance already marked for today",
        student_name: student.student_name,
        admission_no: admission_no,
        date: date
      });
    }

    // Calculate day of week (1=Monday, 2=Tuesday, etc.)
    const attendanceDate = new Date(date + 'T00:00:00'); // Ensure proper date parsing
    let dayOfWeek = attendanceDate.getDay();
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday = 7, Monday = 1
    
    // Use current_class or class_name as class_code
    const classCode = student.current_class || student.class_name || null;
    
    if (!classCode) {
      return res.status(400).json({
        success: false,
        error: "Student class information is missing"
      });
    }

    // Insert new attendance record into attendance_records table
    const insertQuery = `
      INSERT INTO attendance_records (
        admission_no, class_code, academic_week_id, attendance_date, day_of_week, 
        status, marked_by, school_id, branch_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const notes = location ? `QR Scan - Location: ${JSON.stringify(location)}` : 'QR Code Scan';

    await db.sequelize.query(insertQuery, { 
      replacements: [
        admission_no,
        classCode,
        academicWeekId,
        date,
        dayOfWeek,
        status,
        markedBy,
        student.school_id,
        student.branch_id || null,
        notes
      ] 
    });

    res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      student_id: student.student_id,
      student_name: student.student_name,
      admission_no: admission_no,
      class_code: classCode,
      date: date,
      day_of_week: dayOfWeek,
      status: status,
      marked_by: 'qr_scan'
    });

  } catch (error) {
    console.error("Error in quick attendance scan:", error);
    res.status(500).json({ 
      error: "Failed to mark attendance",
      message: error.message 
    });
  }
};

// Check-in: Create a new attendance record with remarks from rules
exports.checkIn = async (req, res) => {
  const { name, className, role, department, date, check_in_time } = req.body;

  // ✅ Validate required fields before executing query
  if (!name || !date || !check_in_time) {
    console.error("Missing required check-in parameters:", req.body);
    return res.status(400).json({ error: "Missing required fields for check-in." });
  }

  const query = `CALL manage_attendance('check_in', NULL, ?, ?, ?, ?, ?, ?, NULL)`;
  const params = [name, className, role, department, date, check_in_time];

  try {
    const results = await db.sequelize.query(query, { replacements: params });

    // ✅ Handle non-iterable responses
    const formattedResults = Array.isArray(results) ? results[0] : [];

    res.status(200).json({
      message: "Check-in recorded successfully.",
      data: formattedResults,
    });
  } catch (err) {
    console.error("Error executing check-in procedure:", err);
    res.status(500).json({ error: "An error occurred while processing check-in." });
  }
};



// Check-out: Update the check-out time for an existing attendance record
exports.checkOut = async (req, res) => {
  const { name, date, check_out_time } = req.body;

  if (!name || !date || !check_out_time) {
    console.error("Missing required check-out parameters:", req.body);
    return res.status(400).json({ error: "Missing required fields for check-out." });
  }

  const query = `CALL manage_attendance('check_out', NULL, ?, NULL, NULL, NULL, ?, NULL, ?)`;
  const params = [name, date, check_out_time];

  try {
    const results = await db.sequelize.query(query, { replacements: params });

    const formattedResults = Array.isArray(results) ? results[0] : [];

    res.status(200).json({ message: "Check-out recorded successfully.", data: formattedResults });
  } catch (err) {
    console.error("Error executing check-out procedure:", err);
    res.status(500).json({ error: "An error occurred while processing check-out." });
  }
};



// Get all attendance records
exports.getAllAttendance =  (req, res) => {
  // const query = `CALL manage_attendance('get_all', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`;

  
    db.sequelize.query(`CALL manage_attendance('get_all', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`)
    .then((resp)=>res.json({success:true,results:resp}))
    .catch((error)=>res.status(500).json(console.log(error)))
};





// Get a specific attendance record by ID
exports.getAttendanceById = async (req, res) => {
  const { id } = req.params;

  const query = `CALL manage_attendance('get_one', ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`;
  const params = [id];

  try {
    const [results] = await db.sequelize.query(query, { replacements: params });

    res.status(200).json({
      message: "Attendance record fetched successfully.",
      data: results,
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching attendance record." });
  }
};

// Delete a specific attendance record by ID
exports.deleteAttendanceById = async (req, res) => {
  const { id } = req.params;

  const query = `CALL manage_attendance('delete_one', ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`;
  const params = [id];

  try {
    await db.sequelize.query(query, { replacements: params });

    res.status(200).json({
      message: "Attendance record deleted successfully.",
    });
  } catch (err) {
    res.status(500).json({ error: "Error deleting attendance record." });
  }
};

// Delete all attendance records
exports.deleteAllAttendance = async (req, res) => {
  const query = `CALL manage_attendance('delete_all', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`;

  try {
    await db.sequelize.query(query);

    res.status(200).json({
      message: "All attendance records deleted successfully.",
    });
  } catch (err) {
    res.status(500).json({ error: "Error deleting all attendance records." });
  }
};

// Get daily attendance records for students
exports.getDailyAttendance = async (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ 
      error: "Date parameter is required" 
    });
  }

  try {
    const query = `
      SELECT 
        ar.id,
        ar.admission_no,
        s.student_name,
        ar.status,
        ar.created_at,
        ar.marked_by
      FROM attendance_records ar
      JOIN students s ON ar.admission_no = s.admission_no
      WHERE ar.attendance_date = ?
      ORDER BY ar.created_at DESC
    `;
    
    const [results] = await db.sequelize.query(query, { 
      replacements: [date] 
    });

    res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (err) {
    console.error('Error fetching daily attendance:', err);
    res.status(500).json({ 
      error: "Error fetching daily attendance records",
      details: err.message 
    });
  }
};


// Quick checkout for early departures (HD-OUT)
exports.quickCheckout = async (req, res) => {
  const { admission_no, date } = req.body;
  
  if (!admission_no || !date) {
    return res.status(400).json({ 
      error: "Missing required fields: admission_no and date are required." 
    });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    // Check if student has attendance record for today
    const existingQuery = `
      SELECT id FROM attendance_records 
      WHERE admission_no = ? AND attendance_date = ?
      LIMIT 1
    `;
    
    const [existing] = await db.sequelize.query(existingQuery, { 
      replacements: [admission_no, date] 
    });

    if (!existing || existing.length === 0) {
      return res.status(404).json({ 
        error: "No attendance record found for today. Student must check in first." 
      });
    }

    // Update status to HD-OUT
    const updateQuery = `
      UPDATE attendance_records 
      SET status = 'HD-OUT', notes = CONCAT(COALESCE(notes, ''), ' | Early checkout at ', NOW())
      WHERE admission_no = ? AND attendance_date = ?
    `;
    
    await db.sequelize.query(updateQuery, { 
      replacements: [admission_no, date] 
    });

    // Get student name for response
    const studentQuery = `SELECT student_name FROM students WHERE admission_no = ?`;
    const [studentResult] = await db.sequelize.query(studentQuery, { 
      replacements: [admission_no] 
    });

    res.status(200).json({
      success: true,
      message: "Early checkout recorded successfully",
      student_name: studentResult[0]?.student_name || 'Unknown',
      admission_no: admission_no,
      status: 'HD-OUT'
    });

  } catch (err) {
    console.error('Error processing checkout:', err);
    res.status(500).json({ 
      error: "Error processing checkout",
      details: err.message 
    });
  }
};
// Staff quick scan for check-in
exports.staffQuickScan = async (req, res) => {
  const { staff_id, date, time, location } = req.body;
  
  if (!staff_id || !date) {
    return res.status(400).json({ 
      error: "Missing required fields: staff_id and date are required." 
    });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    // Get staff information
    const staffQuery = `
      SELECT t.id, t.name as staff_name, t.staff_id, t.school_id, t.branch_id
      FROM teachers t 
      WHERE t.staff_id = ? AND t.status = 'active'
      LIMIT 1
    `;
    
    const [staffResults] = await db.sequelize.query(staffQuery, { 
      replacements: [staff_id] 
    });

    if (!staffResults || staffResults.length === 0) {
      return res.status(404).json({ 
        error: "Staff not found or inactive",
        staff_id: staff_id
      });
    }

    const staff = staffResults[0];

    // Get school opening and closing time
    const schoolTimeQuery = `
      SELECT opening_time, closing_time 
      FROM school_locations 
      WHERE school_id = ? AND (branch_id = ? OR branch_id IS NULL)
      LIMIT 1
    `;
    
    const [schoolTimeResults] = await db.sequelize.query(schoolTimeQuery, { 
      replacements: [staff.school_id, staff.branch_id] 
    });

    // Determine attendance status
    let status = 'P';
    const currentTime = new Date().toTimeString().split(' ')[0];
    
    if (schoolTimeResults && schoolTimeResults.length > 0) {
      const { opening_time, closing_time } = schoolTimeResults[0];
      
      if (opening_time && closing_time) {
        const openingMinutes = timeToMinutes(opening_time);
        const closingMinutes = timeToMinutes(closing_time);
        const halfDayMinutes = openingMinutes + ((closingMinutes - openingMinutes) / 2);
        const currentMinutes = timeToMinutes(currentTime);
        
        if (currentMinutes > openingMinutes && currentMinutes <= halfDayMinutes) {
          status = 'L';
        } else if (currentMinutes > halfDayMinutes) {
          status = 'HD-IN';
        }
      }
    }

    function timeToMinutes(timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }

    // Check existing attendance
    const existingQuery = `
      SELECT id FROM staff_attendance 
      WHERE staff_id = ? AND date = ? AND school_id = ?
      LIMIT 1
    `;
    
    const [existing] = await db.sequelize.query(existingQuery, { 
      replacements: [staff.staff_id, date, staff.school_id] 
    });

    if (existing && existing.length > 0) {
      return res.status(409).json({ 
        error: "Attendance already marked for today",
        staff_name: staff.staff_name
      });
    }

    // Insert attendance record
    const insertQuery = `
      INSERT INTO staff_attendance (
        staff_id, date, check_in_time, method, status, school_id, branch_id, remarks, created_by
      ) VALUES (?, ?, NOW(), 'Manual', ?, ?, ?, ?, ?)
    `;

    const remarks = location ? `QR Scan - Location: ${JSON.stringify(location)}` : 'QR Code Scan';

    await db.sequelize.query(insertQuery, { 
      replacements: [
        staff.staff_id,
        date,
        status,
        staff.school_id,
        staff.branch_id,
        remarks,
        req.user.id
      ] 
    });

    res.status(200).json({
      success: true,
      message: "Staff attendance marked successfully",
      staff_name: staff.staff_name,
      staff_id: staff.staff_id,
      status: status
    });

  } catch (err) {
    console.error('Error processing staff attendance:', err);
    res.status(500).json({ 
      error: "Error processing staff attendance",
      details: err.message 
    });
  }
};

// Staff quick checkout
exports.staffQuickCheckout = async (req, res) => {
  const { staff_id, date } = req.body;
  
  if (!staff_id || !date) {
    return res.status(400).json({ 
      error: "Missing required fields: staff_id and date are required." 
    });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    // Check if staff has attendance record for today
    const existingQuery = `
      SELECT id FROM staff_attendance 
      WHERE staff_id = ? AND date = ?
      LIMIT 1
    `;
    
    const [existing] = await db.sequelize.query(existingQuery, { 
      replacements: [staff_id, date] 
    });

    if (!existing || existing.length === 0) {
      return res.status(404).json({ 
        error: "No attendance record found for today. Staff must check in first." 
      });
    }

    // Update checkout time and status
    const updateQuery = `
      UPDATE staff_attendance 
      SET check_out_time = NOW(), status = 'Half-Day', remarks = CONCAT(COALESCE(remarks, ''), ' | Early checkout at ', NOW())
      WHERE staff_id = ? AND date = ?
    `;
    
    await db.sequelize.query(updateQuery, { 
      replacements: [staff_id, date] 
    });

    // Get staff name
    const staffQuery = `SELECT name as staff_name FROM teachers WHERE staff_id = ?`;
    const [staffResult] = await db.sequelize.query(staffQuery, { 
      replacements: [staff_id] 
    });

    res.status(200).json({
      success: true,
      message: "Early checkout recorded successfully",
      staff_name: staffResult[0]?.staff_name || 'Unknown',
      staff_id: staff_id,
      status: 'Half-Day'
    });

  } catch (err) {
    console.error('Error processing staff checkout:', err);
    res.status(500).json({ 
      error: "Error processing staff checkout",
      details: err.message 
    });
  }
};

// Get daily staff attendance
exports.getStaffDailyAttendance = async (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ 
      error: "Date parameter is required" 
    });
  }

  try {
    const query = `
      SELECT 
        sa.id,
        sa.staff_id,
        t.name as staff_name,
        sa.status,
        sa.check_in_time,
        sa.check_out_time,
        sa.created_by
      FROM staff_attendance sa
      JOIN teachers t ON sa.staff_id = t.staff_id
      WHERE sa.date = ?
      ORDER BY sa.check_in_time DESC
    `;
    
    const [results] = await db.sequelize.query(query, { 
      replacements: [date] 
    });

    res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (err) {
    console.error('Error fetching staff daily attendance:', err);
    res.status(500).json({ 
      error: "Error fetching staff daily attendance records",
      details: err.message 
    });
  }
};
