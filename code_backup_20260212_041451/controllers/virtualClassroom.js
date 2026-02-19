const jwt = require('jsonwebtoken');
const { QueryTypes, Op, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const sequelize = db.sequelize;
const moment = require('moment');
const { getVirtualClassroomAvatar } = require("../utils/avatarUtils");

// Generate unique room ID
const generateRoomId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `room_${timestamp}_${randomStr}`;
};

// Generate meeting password
const generateMeetingPassword = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Create virtual classroom
const createVirtualClassroom = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      title,
      description = '', // Default to empty string if not provided
      class_code,
      subject,
      scheduled_date,
      scheduled_time,
      duration_minutes,
      teacher_id,
      teacher_name,
      academic_year,
      term,
      meeting_type = 'scheduled', // 'scheduled' or 'instant'
      max_participants = 50,
      enable_recording = false,
      enable_chat = true,
      enable_screen_share = true,
      enable_whiteboard = false
    } = req.body;

    // Validate required fields
    if (!title || !class_code || !subject || !scheduled_date || !scheduled_time || !duration_minutes || !teacher_name || !academic_year || !term) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        required: ['title', 'class_code', 'subject', 'scheduled_date', 'scheduled_time', 'duration_minutes', 'teacher_name', 'academic_year', 'term']
      });
    }

    // Use req.user.user_id for teachers (the actual user ID) and req.user.id for other user types
    // This aligns with the user object structure where user_id is the actual user identifier
    const actualTeacherId = req.user.id;

    const room_id = generateRoomId();
    const meeting_password = generateMeetingPassword();
    const meeting_url = `${process.env.FRONTEND_URL}/virtual-classroom/join/${room_id}`;

    // Insert virtual classroom record
    const insertQuery = `
      INSERT INTO virtual_classrooms (
        room_id, title, description, class_code, subject,
        scheduled_date, scheduled_time, duration_minutes,
        teacher_id, teacher_name, academic_year, term,
        meeting_type, meeting_password, meeting_url,
        max_participants, enable_recording, enable_chat,
        enable_screen_share, enable_whiteboard,
        status, school_id, branch_id, created_by, created_at
      ) VALUES (
        :room_id, :title, :description, :class_code, :subject,
        :scheduled_date, :scheduled_time, :duration_minutes,
        :teacher_id, :teacher_name, :academic_year, :term,
        :meeting_type, :meeting_password, :meeting_url,
        :max_participants, :enable_recording, :enable_chat,
        :enable_screen_share, :enable_whiteboard,
        'scheduled', :school_id, :branch_id, :created_by, NOW()
      )
    `;

    // Ensure all parameters have values
    const replacements = {
      room_id,
      title: title || '',
      description: description || '',
      class_code: class_code || '',
      subject: subject || '',
      scheduled_date: scheduled_date || '',
      scheduled_time: scheduled_time || '',
      duration_minutes: duration_minutes || 60,
      teacher_id: actualTeacherId || '',
      teacher_name: teacher_name || '',
      academic_year: academic_year || '',
      term: term || '',
      meeting_type: meeting_type || 'scheduled',
      meeting_password,
      meeting_url,
      max_participants: max_participants || 50,
      enable_recording: enable_recording || false,
      enable_chat: enable_chat !== false,
      enable_screen_share: enable_screen_share !== false,
      enable_whiteboard: enable_whiteboard || false,
      school_id: req.user?.school_id || req.headers['x-school-id'] || '',
      branch_id: req.user?.branch_id || req.headers['x-branch-id'] || '',
      created_by: req.user?.name || 'Teacher'
    };

    console.log('Virtual Classroom Insert Parameters:', replacements);

    await sequelize.query(insertQuery, {
      replacements,
      transaction,
      type: QueryTypes.INSERT,
      timeout: 30000 // 30 second timeout
    });

    // Get students in the class for notifications
    const studentsQuery = `
      SELECT admission_no, student_name, parent_id, guardian_id
      FROM students 
      WHERE current_class = :class_code 
        AND school_id = :school_id 
        AND status = 'Active'
    `;

    const students = await sequelize.query(studentsQuery, {
      replacements: {
        class_code,
        school_id: req.user?.school_id || req.headers['x-school-id'] || ''
      },
      transaction,
      type: QueryTypes.SELECT,
      timeout: 30000 // 30 second timeout
    });

    // Create notifications for students
    const notificationPromises = students.map(student => {
      const notificationQuery = `
        INSERT INTO virtual_classroom_notifications (
          room_id, recipient_type, recipient_id, recipient_name,
          notification_type, title, message, scheduled_date,
          scheduled_time, meeting_url, status, school_id,
          branch_id, created_by, created_at
        ) VALUES (
          :room_id, 'student', :recipient_id, :recipient_name,
          'class_scheduled', :title, :message, :scheduled_date,
          :scheduled_time, :meeting_url, 'pending', :school_id,
          :branch_id, :created_by, NOW()
        )
      `;

      const message = `Virtual class "${title}" has been scheduled for ${scheduled_date} at ${scheduled_time}. Subject: ${subject}. Click to join when the time comes.`;

      return sequelize.query(notificationQuery, {
        replacements: {
          room_id,
          recipient_id: student.admission_no,
          recipient_name: student.student_name,
          title: `Virtual Class: ${title}`,
          message,
          scheduled_date,
          scheduled_time,
          meeting_url,
          school_id: req.user?.school_id || req.headers['x-school-id'] || '',
          branch_id: req.user?.branch_id || req.headers['x-branch-id'] || '',
          created_by: req.user?.name || req.user?.id || 'Teacher'
        },
        transaction,
        type: QueryTypes.INSERT,
        timeout: 30000 // 30 second timeout
      });
    });

    await Promise.race([
      Promise.all(notificationPromises),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Notification creation timeout')), 30000)
      )
    ]);

    await Promise.race([
      transaction.commit(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction commit timeout')), 30000)
      )
    ]);

    res.json({
      success: true,
      message: "Virtual classroom created successfully",
      data: {
        room_id,
        meeting_url,
        meeting_password,
        students_notified: students.length,
        scheduled_date,
        scheduled_time
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error creating virtual classroom:", error);
    console.error("Request body:", req.body);
    console.error("Request user:", req.user);
    console.error("Full error:", error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('Named parameter')) {
      errorMessage = `Missing required parameter. Please check all required fields are provided. Original error: ${error.message}`;
    } else if (error.message.includes("doesn't exist")) {
      errorMessage = `Database table missing. Please run the virtual classroom migration. Original error: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      message: "Error creating virtual classroom",
      error: errorMessage,
      debug: {
        originalError: error.message,
        requestBody: req.body,
        userInfo: req.user
      }
    });
  }
};

// Get virtual classrooms
// const getVirtualClassrooms = async (req, res) => {
//   try {
//     // First check if the table exists
//     const tableCheckQuery = `
//       SELECT COUNT(*) as count 
//       FROM virtual_classrooms .tables 
//       WHERE table_schema = DATABASE() 
//       AND table_name = 'virtual_classrooms'
//     `;
    
//     const tableExists = await sequelize.query(tableCheckQuery, {
//       type: QueryTypes.SELECT
//     });
    
//     if (!tableExists[0] || tableExists[0].count === 0) {
//       return res.status(500).json({
//         success: false,
//         message: "Virtual classroom tables not found. Please run the database migration.",
//         error: "Table 'virtual_classrooms' doesn't exist"
//       });
//     }

//     const {
//       query_type = 'teacher_classes',
//       teacher_id,
//       class_code,
//       student_admission_no,
//       status = 'all',
//       date_filter = 'upcoming',
//       limit = 50,
//       offset = 0
//     } = req.query;

//     let whereClause = `WHERE vc.school_id = :school_id`;
//     let replacements = {
//       school_id: req.user.school_id,
//       limit: parseInt(limit),
//       offset: parseInt(offset)
//     };

//     // Build dynamic where clause based on query type
//     if (query_type === 'teacher_classes' && req.user.id) {
//       whereClause += ` AND vc.teacher_id = :teacher_id`;
//       // Use the actual user ID for teachers
//       replacements.teacher_id = req.user.id;
//     }

//     if (query_type === 'class_schedule' && class_code) {
//       whereClause += ` AND vc.class_code = :class_code`;
//       replacements.class_code = class_code;
//     }

//     if (query_type === 'student_classes' && student_admission_no) {
//       // For students, join with their class
//       whereClause += ` AND vc.class_code = (
//         SELECT current_class FROM students 
//         WHERE admission_no = :student_admission_no 
//         AND school_id = :school_id
//       )`;
//       replacements.student_admission_no = student_admission_no;
//     }

//     if (status !== 'all') {
//       whereClause += ` AND vc.status = :status`;
//       replacements.status = status;
//     }

//     // Date filtering
//     if (date_filter === 'upcoming') {
//       whereClause += ` AND vc.scheduled_date >= CURDATE()`;
//     } else if (date_filter === 'today') {
//       whereClause += ` AND vc.scheduled_date = CURDATE()`;
//     } else if (date_filter === 'past') {
//       whereClause += ` AND vc.scheduled_date < CURDATE()`;
//     }

//     const query = `
//       SELECT 
//         vc.id,
//         vc.room_id,
//         vc.title,
//         vc.description,
//         vc.class_code,
//         vc.subject,
//         vc.scheduled_date,
//         vc.scheduled_time,
//         vc.duration_minutes,
//         vc.teacher_id,
//         vc.teacher_name,
//         vc.academic_year,
//         vc.term,
//         vc.meeting_type,
//         vc.meeting_url,
//         vc.max_participants,
//         vc.enable_recording,
//         vc.enable_chat,
//         vc.enable_screen_share,
//         vc.enable_whiteboard,
//         vc.status,
//         vc.started_at,
//         vc.ended_at,
//         vc.created_at,
//         c.class_name,
//         (SELECT COUNT(*) FROM virtual_classroom_participants vcp 
//          WHERE vcp.room_id = vc.room_id) as participant_count
//       FROM virtual_classrooms vc
//       LEFT JOIN classes c ON vc.class_code = c.class_code
//       ${whereClause}
//       ORDER BY vc.scheduled_date DESC, vc.scheduled_time DESC
//       LIMIT :limit OFFSET :offset
//     `;

//     const classrooms = await sequelize.query(query, {
//       replacements,
//       type: QueryTypes.SELECT
//     });

//     res.json({
//       success: true,
//       data: classrooms,
//       pagination: {
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//         total: classrooms.length
//       }
//     });

//   } catch (error) {
//     console.error("Error fetching virtual classrooms:", error);
//     console.error("Request query:", req.query);
//     console.error("Request user:", req.user);
    
//     // Provide more specific error messages
//     let errorMessage = error.message;
//     if (error.message.includes("doesn't exist")) {
//       errorMessage = `Virtual classroom tables not found. Please run the database migration: mysql -u root skcooly_db < database_migrations/create_virtual_classroom_tables.sql`;
//     }
    
//     res.status(500).json({
//       success: false,
//       message: "Error fetching virtual classrooms",
//       error: errorMessage,
//       debug: {
//         originalError: error.message,
//         requestQuery: req.query,
//         userInfo: req.user
//       }
//     });
//   }
// };
const getVirtualClassrooms = async (req, res) => {
  try {
    const {
      query_type = 'teacher_classes',
      class_code,
      student_admission_no,
      status = 'all',
      date_filter = 'upcoming',
      limit = 50,
      offset = 0
    } = req.query;

    // Auto-end expired classes before returning results
    const autoEndQuery = `
      UPDATE virtual_classrooms
      SET status = 'completed', ended_at = NOW()
      WHERE status = 'active'
        AND ended_at IS NULL
        AND TIMESTAMPADD(MINUTE, duration_minutes, 
          COALESCE(started_at, CONCAT(scheduled_date, ' ', scheduled_time))
        ) < NOW()
    `;
    
    await sequelize.query(autoEndQuery, {
      type: QueryTypes.UPDATE
    });

    let whereClause = `WHERE vc.school_id = :school_id`;
    let replacements = {
      school_id: req.user.school_id,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    // ✅ Always use req.user.id for teacher filtering
    if (query_type === 'teacher_classes') {
      whereClause += ` AND vc.teacher_id = :teacher_id`;
      replacements.teacher_id = req.user.id;
    }

    // Filter by class schedule
    if (query_type === 'class_schedule' && class_code) {
      whereClause += ` AND vc.class_code = :class_code`;
      replacements.class_code = class_code;
    }

    // Filter for student assigned class
    if (query_type === 'student_classes' && student_admission_no) {
      whereClause += ` AND vc.class_code = (
        SELECT current_class 
        FROM students 
        WHERE admission_no = :student_admission_no 
        AND school_id = :school_id
      )`;
      replacements.student_admission_no = student_admission_no;
    }

    // Status filtering
    if (status !== 'all') {
      whereClause += ` AND vc.status = :status`;
      replacements.status = status;
      
      // For active status, also check if class hasn't expired
      if (status === 'active') {
        whereClause += ` AND (
          vc.ended_at IS NULL 
          AND TIMESTAMPADD(MINUTE, vc.duration_minutes, 
            COALESCE(vc.started_at, CONCAT(vc.scheduled_date, ' ', vc.scheduled_time))
          ) > NOW()
        )`;
      }
    }

    // Date filtering
    if (date_filter === 'upcoming') {
      whereClause += ` AND vc.scheduled_date >= CURDATE()`;
    } else if (date_filter === 'today') {
      whereClause += ` AND vc.scheduled_date = CURDATE()`;
    } else if (date_filter === 'past') {
      whereClause += ` AND vc.scheduled_date < CURDATE()`;
    }

    const query = `
      SELECT 
        vc.id,
        vc.room_id,
        vc.title,
        vc.description,
        vc.class_code,
        vc.subject,
        vc.scheduled_date,
        vc.scheduled_time,
        vc.duration_minutes,
        vc.teacher_id,
        vc.teacher_name,
        vc.academic_year,
        vc.term,
        vc.meeting_type,
        vc.meeting_url,
        vc.max_participants,
        vc.enable_recording,
        vc.enable_chat,
        vc.enable_screen_share,
        vc.enable_whiteboard,
        vc.status,
        vc.started_at,
        vc.ended_at,
        vc.created_at,
        c.class_name,
        (SELECT COUNT(*) FROM virtual_classroom_participants vcp 
         WHERE vcp.room_id = vc.room_id) as participant_count
      FROM virtual_classrooms vc
      LEFT JOIN classes c ON vc.class_code = c.class_code
      ${whereClause}
      ORDER BY vc.scheduled_date DESC, vc.scheduled_time DESC
      LIMIT :limit OFFSET :offset
    `;

    const classrooms = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: classrooms,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: classrooms.length
      }
    });

  } catch (error) {
    console.error("Error fetching virtual classrooms:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching virtual classrooms",
      error: error.message
    });
  }
};

// Generate Jitsi JWT token for JaaS (8x8.vc)
const generateJitsiToken = (roomName, displayName, userId, userEmail, isModerator = false) => {
  const privateKey = process.env.JITSI_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const appId = process.env.JITSI_APP_ID;
  const keyId = process.env.JITSI_KEY_ID;

  if (!privateKey || !appId || !keyId) {
    console.warn('JaaS credentials not set - JWT generation skipped');
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    iat: now,
    exp: now + 7200,
    nbf: now - 5,
    sub: appId,
    room: '*',
    context: {
      user: {
        id: String(userId),
        name: displayName,
        email: userEmail,
        moderator: isModerator,
        "hidden-from-recorder": false
      },
      features: {
        recording: isModerator,
        livestreaming: isModerator,
        transcription: false,
        "outbound-call": false
      }
    }
  };

  try {
    return jwt.sign(payload, privateKey, { 
      algorithm: 'RS256',
      header: { kid: keyId, typ: 'JWT', alg: 'RS256' }
    });
  } catch (error) {
    console.error('Error generating Jitsi token:', error);
    return null;
  }
};

// Join virtual classroom
const joinVirtualClassroom = async (req, res) => {
  try {
    const { room_id } = req.params;
    
    // Log the complete request for debugging
    console.log('=== VIRTUAL CLASSROOM JOIN REQUEST ===');
    console.log('Authenticated User:', {
      id: req.user.id,
      user_type: req.user.user_type,
      school_id: req.user.school_id,
      full_name: req.user.full_name,
      name: req.user.name,
      admission_no: req.user.admission_no
    });
    console.log('Request Body:', req.body);
    console.log('Headers:', {
      'x-school-id': req.headers['x-school-id'],
      'x-user-id': req.headers['x-user-id'],
      'x-user-type': req.headers['x-user-type']
    });
    
    // Use req.user.id consistently for participant identification
    let participant_type, participant_id, participant_name, user_avatar;

    // Determine participant type based on authenticated user from req.user
    const userType = req.user.user_type.toLowerCase();
    participant_type = (userType === 'teacher' || userType === 'admin' || userType === 'branchadmin') ? 'teacher' : 'student';

    // ✅ ALWAYS use req.user.id (the authenticated user ID) for consistency
    // IMPORTANT: Convert to string to match database storage format
    participant_id = String(req.user.id);

    console.log('Setting participant_id:', {
      user_id: req.user.id,
      user_user_id: req.user.user_id,
      user_type: req.user.user_type,
      selected_id: participant_id,
      typeof_participant_id: typeof participant_id,
      note: 'Always using req.user.id (converted to string) for consistency with classroom creation'
    });
    
    // Use the participant name from request body if provided, otherwise fallback to req.user information
    participant_name = req.body.participant_name || req.user.full_name || req.user.name || req.user.username || `${req.user.id}`;
    
    // Use the user avatar from request body if provided, otherwise fallback to req.user information
    user_avatar = req.body.user_avatar || req.user.profile_picture || req.user.passport_url || '';
    
    console.log('Participant name selection:', {
      full_name: req.user.full_name,
      name: req.user.name,
      username: req.user.username,
      user_id: req.user.id,
      request_body_participant_name: req.body.participant_name,
      final_participant_name: participant_name
    });
    
    console.log('Using consistent req.user.id for participant identification:', {
      participant_type,
      participant_id,
      participant_name,
      user_avatar,
      user_data: {
        id: req.user.id,
        name: req.user.name,
        full_name: req.user.full_name,
        username: req.user.username
      },
      request_body: {
        participant_name: req.body.participant_name,
        participant_id: req.body.participant_id,
        user_avatar: req.body.user_avatar
      }
    });
    
    console.log('✅ Final participant identification:', {
      participant_type,
      participant_id,
      participant_name,
      user_avatar,
      authenticated_user_id: req.user.id,
      authenticated_user_type: req.user.user_type
    });

    // Enhanced logging for debugging
    console.log('=== VIRTUAL CLASSROOM JOIN ATTEMPT ===');
    console.log('Room ID:', room_id);
    console.log('Request Body:', req.body);
    console.log('User Info:', {
      id: req.user?.id,
      school_id: req.user?.school_id,
      user_type: req.user?.user_type
    });
    console.log('Headers:', {
      'x-school-id': req.headers['x-school-id'],
      'x-user-id': req.headers['x-user-id'],
      'x-user-type': req.headers['x-user-type']
    });

    // Validate required fields
    if (!participant_name || !participant_type || !participant_id) {
      console.log('❌ Missing required fields for join');
      return res.status(400).json({
        success: false,
        message: "Missing required fields: participant_name, participant_type, participant_id",
        provided: { 
          participant_name, 
          participant_type, 
          participant_id,
          user_id: req.user.id,
          user_name: req.user.name,
          user_full_name: req.user.full_name
        }
      });
    }

    // Check if classroom exists and is active
    const classroomQuery = `
      SELECT * FROM virtual_classrooms 
      WHERE room_id = :room_id 
        AND school_id = :school_id
        AND status IN ('scheduled', 'active')
    `;

    const classroom = await sequelize.query(classroomQuery, {
      replacements: {
        room_id,
        school_id: req.user.school_id
      },
      type: QueryTypes.SELECT
    });

    if (!classroom.length) {
      console.log('❌ Classroom not found:', {
        room_id,
        school_id: req.user.school_id,
        query_result: classroom
      });
      return res.status(404).json({
        success: false,
        message: "Virtual classroom not found or not accessible",
        debug: {
          room_id,
          school_id: req.user.school_id,
          searched_statuses: ['scheduled', 'active']
        }
      });
    }

    const classroomData = classroom[0];

    // Check if it's time to join (within 15 minutes of scheduled time)
    const scheduledDateTime = moment(`${classroomData.scheduled_date} ${classroomData.scheduled_time}`);
    const now = moment();
    const timeDiff = scheduledDateTime.diff(now, 'minutes');

    // ⚠️ COMPREHENSIVE AUTHORIZATION CHECK: Debug all possible authorization paths
    console.log('=== AUTHORIZATION DEBUG INFO ===');
    console.log('Participant Info:', {
      participant_type,
      participant_id,
      participant_name,
      school_id: req.user.school_id
    });
    console.log('Classroom Info:', {
      teacher_id: classroomData.teacher_id,
      school_id: classroomData.school_id,
      status: classroomData.status,
      scheduled_date: classroomData.scheduled_date,
      scheduled_time: classroomData.scheduled_time
    });
    console.log('Comparison Results:', {
      exact_id_match: classroomData.teacher_id === participant_id,
      loose_id_match: classroomData.teacher_id == participant_id,
      string_id_match: String(classroomData.teacher_id) === String(participant_id),
      same_school: classroomData.school_id === req.user.school_id,
      is_teacher: participant_type === 'teacher',
      is_student: participant_type === 'student'
    });
    
    // Check if the participant is the classroom teacher using consistent ID
    // For teachers, use user_id for comparison; for others, use id
    const teacherIdForComparison = req.user.id;
    
    console.log('=== DEBUG CLASSROOM AUTHORIZATION ===', {
      classroom_teacher_id: classroomData.teacher_id,
      participant_id: participant_id,
      teacherIdForComparison: teacherIdForComparison,
      user_id: req.user.id,
      user_user_id: req.user.user_id,
      user_type: req.user.user_type,
      classroomData_teacher_id: classroomData.teacher_id,
      string_comparisons: {
        exact_match: classroomData.teacher_id === teacherIdForComparison,
        loose_match: classroomData.teacher_id == teacherIdForComparison,
        string_match_1: classroomData.teacher_id === String(teacherIdForComparison),
        string_match_2: String(classroomData.teacher_id) === String(teacherIdForComparison)
      }
    });
    
    // ✅ Check if this teacher is the classroom creator OR if user is Admin/BranchAdmin (automatic moderator)
    const isAutoModerator = userType === 'admin' || userType === 'branchadmin';
    const isClassroomTeacher = participant_type === 'teacher' &&
                               (String(classroomData.teacher_id) === String(teacherIdForComparison) || isAutoModerator);
                                
    if (classroomData.teacher_id !== participant_id) {
        console.log('!!! ID MISMATCH DETECTED !!!', {
            classroomData_teacher_id: classroomData.teacher_id,
            participant_id: participant_id,
            difference: 'The classroom creator ID does not match the participant ID'
        });
    }
    
    console.log('Authorization Results:', {
      is_classroom_teacher: isClassroomTeacher,
      participant_id: participant_id,
      classroom_teacher_id: classroomData.teacher_id
    });
    
    // Students can join if within 15 minutes OR if class is already active
    const canStudentJoin = participant_type === 'student' && (timeDiff <= 15 || classroomData.status === 'active');
    
    console.log('Access Decision Matrix:', {
      isClassroomTeacher: isClassroomTeacher ? '✅ YES - Classroom Creator' : '❌ NO - Not Creator',
      canStudentJoin: canStudentJoin ? '✅ YES - Student Access Allowed' : '❌ NO - Student Access Denied',
      time_diff: timeDiff,
      status: classroomData.status,
      final_decision: isClassroomTeacher || canStudentJoin ? '✅ ACCESS GRANTED' : '❌ ACCESS DENIED'
    });

    // Access granted if user is the classroom teacher or a student meeting time conditions
    const accessGranted = isClassroomTeacher || canStudentJoin;
    
    if (!accessGranted && timeDiff > 15) {
      console.log('❌ ACCESS DENIED - Detailed Analysis:', {
        timeDiff,
        isClassroomTeacher,
        canStudentJoin,
        canAuthorizedTeacherJoin,
        participant_type,
        classroom_teacher_id: classroomData.teacher_id,
        participant_id,
        classroom_status: classroomData.status,
        user_school_id: req.user.school_id,
        classroom_school_id: classroomData.school_id,
        same_school: classroomData.school_id === req.user.school_id
      });
      return res.status(400).json({
        success: false,
        message: `Class will be available 15 minutes before scheduled time or when the teacher starts the class. Please wait ${timeDiff} more minutes.`,
        scheduled_time: scheduledDateTime.format('YYYY-MM-DD HH:mm:ss'),
        debug: {
          timeDiff,
          access_check: {
            isClassroomTeacher,
            canStudentJoin,
            canAuthorizedTeacherJoin
          }
        }
      });
    }

    console.log('✅ ACCESS GRANTED - Final Decision');
    console.log('Access justification:', {
      isClassroomTeacher: isClassroomTeacher ? '✅ Classroom creator' : '❌ Not classroom creator',
      canStudentJoin: canStudentJoin ? '✅ Student access allowed' : '❌ Student access denied',
      final_access: accessGranted ? '✅ GRANTED' : '❌ DENIED'
    });

    // First, update any existing active record for this participant (where left_at is NULL)
    // This handles the case where a participant is already in the room
    const updateExistingQuery = `
      UPDATE virtual_classroom_participants 
      SET 
        joined_at = NOW(),
        participant_name = :participant_name,
        participant_type = :participant_type,
        user_avatar = :user_avatar
      WHERE room_id = :room_id 
        AND participant_id = :participant_id 
        AND left_at IS NULL
    `;

    await sequelize.query(updateExistingQuery, {
      replacements: {
        room_id,
        participant_id,
        participant_name,
        participant_type,
        user_avatar: getVirtualClassroomAvatar(participant_type, participant_name, user_avatar),
        school_id: req.headers['x-school-id'] || req.user.school_id,
        branch_id: req.headers['x-branch-id'] || req.user.branch_id
      },
      type: QueryTypes.UPDATE
    });

    // Then insert a new record if no existing active record was updated
    // Use INSERT IGNORE to handle potential race conditions
    const participantQuery = `
      INSERT INTO virtual_classroom_participants (
        room_id, participant_id, participant_name, participant_type,
        user_avatar, joined_at, school_id, branch_id
      ) VALUES (
        :room_id, :participant_id, :participant_name, :participant_type,
        :user_avatar, NOW(), :school_id, :branch_id
      )
      ON DUPLICATE KEY UPDATE
        joined_at = NOW(),
        left_at = NULL,
        user_avatar = VALUES(user_avatar),
        participant_name = VALUES(participant_name),
        participant_type = VALUES(participant_type)
    `;

    // Prepare replacements with proper null handling and static avatar fallback
    const participantReplacements = {
      room_id,
      participant_id,
      participant_name,
      participant_type,
      user_avatar: getVirtualClassroomAvatar(participant_type, participant_name, user_avatar),
      school_id: req.headers['x-school-id'] || req.user.school_id,
      branch_id: req.headers['x-branch-id'] || req.user.branch_id
    };

    console.log('Participant query replacements:', participantReplacements);

    await sequelize.query(participantQuery, {
      replacements: participantReplacements,
      type: QueryTypes.INSERT
    });

    // Update classroom status to active if teacher joins
    if (participant_type === 'teacher' && classroomData.status === 'scheduled') {
      await sequelize.query(
        `UPDATE virtual_classrooms 
         SET status = 'active', started_at = NOW() 
         WHERE room_id = :room_id`,
        {
          replacements: { room_id },
          type: QueryTypes.UPDATE
        }
      );
    }

    console.log('✅ Join successful for:', participant_name);
    console.log('=== END JOIN ATTEMPT ===\n');

    // Get the avatar that was used (either provided or generated)
    const finalAvatar = participantReplacements.user_avatar;

    // ⚠️ CRITICAL: Log the final moderator decision
    console.log('🔑 CRITICAL MODERATOR DECISION:', {
      participant_name,
      participant_type,
      isClassroomTeacher,
      will_join_as_moderator: isClassroomTeacher,
      teacher_id_in_db: classroomData.teacher_id,
      current_user_id: req.user.id,
      ids_match: classroomData.teacher_id === req.user.id
    });

    res.json({
      success: true,
      message: "Successfully joined virtual classroom",
      data: {
        room_id,
        classroom_title: classroomData.title,
        meeting_url: classroomData.meeting_url,
        participant_avatar: finalAvatar,
        jitsi_config: {
          roomName: room_id,
          displayName: participant_name,
          userInfo: {
            displayName: participant_name,
            email: req.user?.email || `${participant_id}@${req.user?.school_id || 'school'}.edu`,
            avatarURL: finalAvatar,
            // Additional user identification for Jitsi
            id: participant_id,
            userId: participant_id,
            // CRITICAL: Mark as moderator in userInfo for public Jitsi
            moderator: isClassroomTeacher ? 'true' : 'false'
          },
          jwt: generateJitsiToken(
            room_id,
            participant_name,
            participant_id,
            req.user?.email || `${participant_id}@school.edu`,
            isClassroomTeacher
          ),
          configOverwrite: {
            // ===== MODERATOR ROLE ASSIGNMENT (CRITICAL) =====
            // Only the classroom teacher/creator gets moderator privileges
            startAsModerator: isClassroomTeacher,

            // ===== LOBBY & WAITING ROOM SETTINGS =====
            // Disable all lobby/waiting behaviors for smooth joining
            disableLobby: true,
            enableLobby: false,
            enableLobbyChat: false,
            enableKnocking: false,
            hideLobbyButton: true,

            // Disable "waiting for moderator" screen
            disableWaitingForModerator: true,
            disableWaitingForOwner: true,

            // ===== PRE-JOIN & WELCOME PAGE SETTINGS =====
            prejoinPageEnabled: false,
            enablePrejoinPage: false,
            enableWelcomePage: false,
            enableClosePage: false,

            // ===== BASIC MEETING SETTINGS =====
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            startSilent: false,
            disableAudioLevels: false,
            enableTalkWhileMuted: true,

            // ===== AUTHENTICATION & TOKEN SETTINGS =====
            // For public Jitsi servers, disable token-based features
            enableFeaturesBasedOnToken: false,
            enableUserRolesBasedOnToken: false,
            enableTokenAuth: false,
            disableAuthentication: true,

            // ===== ROOM ACCESS SETTINGS =====
            // For public Jitsi servers
            requireDisplayName: false,
            requireEmail: false,
            enableGuestAccess: true,

            // CRITICAL: Disable lobby for this room
            lobby: {
              enabled: false
            },

            // ===== FEATURE CONTROLS =====
            disableInviteFunctions: false,  // Allow participants to invite others
            enableTileView: true,           // Allow tile view
            disableProfile: false,

            // ===== OPTIMIZATION SETTINGS =====
            disableDeepLinking: true,
            disableThirdPartyRequests: true,
            p2p: {
              enabled: false  // Disable P2P for better moderation control
            }
          },
          interfaceConfigOverwrite: {
            // ===== TOOLBAR CONFIGURATION =====
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop',
              'fullscreen', 'fodeviceselection', 'hangup', 'profile',
              'chat', 'recording', 'livestreaming', 'etherpad',
              'sharedvideo', 'settings', 'raisehand', 'videoquality',
              'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videobackgroundblur', 'download', 'help',
              'mute-everyone', 'security'  // Moderator buttons will only be visible to moderators
            ],

            // ===== BRANDING =====
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            PROVIDER_NAME: 'Elite Scholar',

            // ===== DISPLAY NAMES =====
            DEFAULT_REMOTE_DISPLAY_NAME: 'Guest',
            DEFAULT_LOCAL_DISPLAY_NAME: participant_name,

            // ===== LOBBY & WAITING UI SETTINGS =====
            DISABLE_LOBBY: true,
            HIDE_LOBBY: true,
            DISABLE_LOBBY_BUTTON: true,
            HIDE_LOBBY_HEADER: true,
            HIDE_LOBBY_FOOTER: true,
            DISABLE_WAITING_FOR_MODERATOR: true,
            DISABLE_WAITING_FOR_OWNER: true,

            // ===== MODERATOR INDICATORS =====
            DISABLE_MODERATOR_INDICATOR: false,  // Show who is moderator
            ENABLE_MODERATOR_INDICATOR: true,

            // ===== NOTIFICATIONS =====
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            HIDE_JOIN_LEAVE_NOTIFICATIONS: false,
            DISABLE_JOIN_LEAVE_ANNOTATION: false,

            // ===== TOOLBAR & UI BEHAVIOR =====
            TOOLBAR_ALWAYS_VISIBLE: false,
            TOOLBAR_TIMEOUT: 4000,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,

            // ===== ADDITIONAL SETTINGS =====
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
            DISABLE_PRIVATE_CHAT: false,
            DISABLE_PRESENCE_STATUS: false,
            SHOW_JVB_CONNECTION_INFO: false
          }
        }
      }
    });

  } catch (error) {
    console.error("❌ Error joining virtual classroom:", error);
    console.error("Request details:", {
      params: req.params,
      body: req.body,
      user: req.user,
      headers: {
        'x-school-id': req.headers['x-school-id'],
        'x-user-id': req.headers['x-user-id']
      }
    });
    console.log('=== END JOIN ATTEMPT (ERROR) ===\n');
    
    res.status(500).json({
      success: false,
      message: "Error joining virtual classroom",
      error: error.message,
      debug: {
        stack: error.stack,
        request_params: req.params,
        request_body: req.body,
        user_info: req.user
      }
    });
  }
};

// End virtual classroom
const endVirtualClassroom = async (req, res) => {
  try {
    const { room_id } = req.params;
    const school_id = req.user?.school_id || req.headers['x-school-id'];
    const user_id = req.user?.id || req.headers['x-user-id'];

    // Update classroom status
    const updateQuery = `
      UPDATE virtual_classrooms 
      SET status = 'completed', ended_at = NOW()
      WHERE room_id = :room_id 
        AND school_id = :school_id
        AND (teacher_id = :user_id OR :user_id IS NULL)
    `;

    const result = await sequelize.query(updateQuery, {
      replacements: {
        room_id,
        school_id,
        user_id
      },
      type: QueryTypes.UPDATE
    });

    // Auto-end expired classes
    const autoEndQuery = `
      UPDATE virtual_classrooms
      SET status = 'completed', ended_at = NOW()
      WHERE status = 'active'
        AND ended_at IS NULL
        AND TIMESTAMPADD(MINUTE, duration_minutes, 
          COALESCE(started_at, CONCAT(scheduled_date, ' ', scheduled_time))
        ) < NOW()
    `;
    
    await sequelize.query(autoEndQuery, {
      type: QueryTypes.UPDATE
    });

    // Update all participants as left
    // We need to handle the unique constraint (room_id, participant_id, left_at) carefully
    // First, update each participant_id only once by getting the minimum ID for each participant
    const updateParticipantsQuery = `
      UPDATE virtual_classroom_participants 
      SET left_at = NOW()
      WHERE id IN (
        SELECT * FROM (
          SELECT MIN(id) as id
          FROM virtual_classroom_participants
          WHERE room_id = :room_id AND left_at IS NULL
          GROUP BY participant_id
        ) AS temp_table
      )
    `;
    
    await sequelize.query(updateParticipantsQuery, {
      replacements: { room_id },
      type: QueryTypes.UPDATE
    });
    
    // Then, handle any remaining participants (duplicates) with unique timestamps to avoid constraint violations
    // Use a separate query to update remaining records with slightly different timestamps
    const remainingQuery = `
      UPDATE virtual_classroom_participants
      SET left_at = DATE_ADD(NOW(), INTERVAL (id % 100) MICROSECOND)
      WHERE room_id = :room_id AND left_at IS NULL
    `;
    
    await sequelize.query(remainingQuery, {
      replacements: { room_id },
      type: QueryTypes.UPDATE
    });

    res.json({
      success: true,
      message: "Virtual classroom ended successfully"
    });

  } catch (error) {
    console.error("Error ending virtual classroom:", error);
    res.status(500).json({
      success: false,
      message: "Error ending virtual classroom",
      error: error.message
    });
  }
};

// Get notifications for student
const getStudentNotifications = async (req, res) => {
  try {
    const { student_admission_no } = req.params;
    const school_id = req.user.school_id;

    // Get active virtual classrooms for this student's class
    const query = `
      SELECT 
        vc.*,
        c.class_name,
        'class_started' as notification_type,
        CONCAT(vc.subject, ' class with ', vc.teacher_name, ' has started! Click to join now.') as message,
        CONCAT(vc.subject, ' Class Started') as title,
        CONCAT('/virtual-classroom/join/', vc.room_id) as join_url,
        false as is_read
      FROM virtual_classrooms vc
      LEFT JOIN classes c ON vc.class_code = c.class_code
      LEFT JOIN students s ON s.current_class = vc.class_code
      WHERE s.admission_no = :student_admission_no 
        AND vc.school_id = :school_id
        AND vc.status = 'active'
        AND vc.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      ORDER BY vc.created_at DESC
      LIMIT 5
    `;

    const notifications = await db.sequelize.query(query, {
      replacements: { student_admission_no, school_id },
      type: db.Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error("Error fetching student notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message
    });
  }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
  try {
    const { notification_id } = req.params;

    await sequelize.query(
      `UPDATE virtual_classroom_notifications 
       SET status = 'read', read_at = NOW() 
       WHERE id = :notification_id AND school_id = :school_id`,
      {
        replacements: {
          notification_id,
          school_id: req.user.school_id
        },
        type: QueryTypes.UPDATE
      }
    );

    res.json({
      success: true,
      message: "Notification marked as read"
    });

  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Error updating notification",
      error: error.message
    });
  }
};

// Update virtual classroom
const updateVirtualClassroom = async (req, res) => {
  try {
    const { room_id } = req.params;
    const {
      title,
      description,
      class_code,
      subject,
      scheduled_date,
      scheduled_time,
      duration_minutes,
      academic_year,
      term,
      enable_recording,
      enable_chat,
      enable_screen_share,
      enable_whiteboard
    } = req.body;

    // Build dynamic update query
    let updateFields = [];
    let replacements = {
      room_id,
      school_id: req.user.school_id,
      // Use the actual user ID for teachers (the user_id field)
      teacher_id: (req.user.user_type === 'Teacher') ? (req.user.user_id || req.user.id) : req.user.id
    };

    // Add fields to update only if they are provided
    if (title !== undefined) {
      updateFields.push('title = :title');
      replacements.title = title;
    }
    if (description !== undefined) {
      updateFields.push('description = :description');
      replacements.description = description;
    }
    if (class_code !== undefined) {
      updateFields.push('class_code = :class_code');
      replacements.class_code = class_code;
    }
    if (subject !== undefined) {
      updateFields.push('subject = :subject');
      replacements.subject = subject;
    }
    if (scheduled_date !== undefined) {
      updateFields.push('scheduled_date = :scheduled_date');
      replacements.scheduled_date = scheduled_date;
    }
    if (scheduled_time !== undefined) {
      updateFields.push('scheduled_time = :scheduled_time');
      replacements.scheduled_time = scheduled_time;
    }
    if (duration_minutes !== undefined) {
      updateFields.push('duration_minutes = :duration_minutes');
      replacements.duration_minutes = duration_minutes;
    }
    if (academic_year !== undefined) {
      updateFields.push('academic_year = :academic_year');
      replacements.academic_year = academic_year;
    }
    if (term !== undefined) {
      updateFields.push('term = :term');
      replacements.term = term;
    }
    if (enable_recording !== undefined) {
      updateFields.push('enable_recording = :enable_recording');
      replacements.enable_recording = enable_recording;
    }
    if (enable_chat !== undefined) {
      updateFields.push('enable_chat = :enable_chat');
      replacements.enable_chat = enable_chat;
    }
    if (enable_screen_share !== undefined) {
      updateFields.push('enable_screen_share = :enable_screen_share');
      replacements.enable_screen_share = enable_screen_share;
    }
    if (enable_whiteboard !== undefined) {
      updateFields.push('enable_whiteboard = :enable_whiteboard');
      replacements.enable_whiteboard = enable_whiteboard;
    }

    // Always update the updated_by and updated_at fields
    updateFields.push('updated_by = :updated_by');
    updateFields.push('updated_at = NOW()');
    replacements.updated_by = req.user.name || req.user.id;

    if (updateFields.length === 2) { // Only updated_by and updated_at would be present
      return res.status(400).json({
        success: false,
        message: "No fields provided for update"
      });
    }

    const updateQuery = `
      UPDATE virtual_classrooms 
      SET ${updateFields.join(', ')}
      WHERE room_id = :room_id 
        AND school_id = :school_id 
        AND teacher_id = :teacher_id
        AND status = 'scheduled'
    `;

    const result = await sequelize.query(updateQuery, {
      replacements,
      type: QueryTypes.UPDATE
    });

    if (result[1] === 0) {
      return res.status(404).json({
        success: false,
        message: "Virtual classroom not found, already started, or you don't have permission to update it"
      });
    }

    res.json({
      success: true,
      message: "Virtual classroom updated successfully"
    });

  } catch (error) {
    console.error("Error updating virtual classroom:", error);
    res.status(500).json({
      success: false,
      message: "Error updating virtual classroom",
      error: error.message
    });
  }
};

module.exports = {
  createVirtualClassroom,
  getVirtualClassrooms,
  joinVirtualClassroom,
  endVirtualClassroom,
  getStudentNotifications,
  markNotificationRead,
  updateVirtualClassroom,
  generateJitsiToken
};