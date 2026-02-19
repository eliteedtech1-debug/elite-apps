const express = require('express');
const router = express.Router();
const {
  createVirtualClassroom,
  getVirtualClassrooms,
  joinVirtualClassroom,
  endVirtualClassroom,
  getStudentNotifications,
  markNotificationRead,
  updateVirtualClassroom,
  generateJitsiToken
} = require('../controllers/virtualClassroom');

// Middleware for authentication
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/virtual-classroom/create
 * @desc Create a new virtual classroom
 * @access Teacher, Admin
 */
router.post('/create', createVirtualClassroom);

/**
 * @route GET /api/virtual-classroom/list
 * @desc Get virtual classrooms based on query parameters
 * @access Teacher, Student, Admin
 * @query {string} query_type - 'teacher_classes', 'class_schedule', 'student_classes'
 * @query {string} teacher_id - Filter by teacher ID
 * @query {string} class_code - Filter by class code
 * @query {string} student_admission_no - Filter by student admission number
 * @query {string} status - Filter by status ('scheduled', 'active', 'completed', 'cancelled')
 * @query {string} date_filter - 'upcoming', 'today', 'past', 'all'
 * @query {number} limit - Number of records to return (default: 50)
 * @query {number} offset - Number of records to skip (default: 0)
 */
router.get('/list', getVirtualClassrooms);

/**
 * @route POST /api/virtual-classroom/join/:room_id
 * @desc Join a virtual classroom
 * @access Teacher, Student
 */
router.post('/join/:room_id', joinVirtualClassroom);

/**
 * @route PUT /api/virtual-classroom/end/:room_id
 * @desc End a virtual classroom session
 * @access Teacher (only the teacher who created the classroom)
 */
router.put('/end/:room_id', endVirtualClassroom);

/**
 * @route GET /api/virtual-classroom/notifications/:student_admission_no
 * @desc Get notifications for a specific student
 * @access Student, Parent, Admin
 */
router.get('/notifications/:student_admission_no', getStudentNotifications);

/**
 * @route PUT /api/virtual-classroom/notifications/:notification_id/read
 * @desc Mark a notification as read
 * @access Student, Parent, Teacher, Admin
 */
router.put('/notifications/:notification_id/read', markNotificationRead);

/**
 * @route GET /api/virtual-classroom/room/:room_id
 * @desc Get details of a specific virtual classroom
 * @access Teacher, Student, Admin
 */
router.get('/room/:room_id', async (req, res) => {
  try {
    const { room_id } = req.params;
    
    const query = `
      SELECT 
        vc.*,
        c.class_name,
        (SELECT COUNT(*) FROM virtual_classroom_participants vcp 
         WHERE vcp.room_id = vc.room_id AND vcp.left_at IS NULL) as active_participants,
        (SELECT COUNT(*) FROM virtual_classroom_participants vcp 
         WHERE vcp.room_id = vc.room_id) as total_participants
      FROM virtual_classrooms vc
      LEFT JOIN classes c ON vc.class_code = c.class_code
      WHERE vc.room_id = :room_id AND vc.school_id = :school_id
    `;

    const classroom = await require('../models').sequelize.query(query, {
      replacements: {
        room_id,
        school_id: req.user?.school_id || req.headers['x-school-id'] || ''
      },
      type: require('sequelize').QueryTypes.SELECT
    });

    if (!classroom.length) {
      return res.status(404).json({
        success: false,
        message: "Virtual classroom not found"
      });
    }

    res.json({
      success: true,
      data: classroom[0]
    });

  } catch (error) {
    console.error("Error fetching classroom details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching classroom details",
      error: error.message
    });
  }
});

/**
 * @route GET /api/virtual-classroom/participants/:room_id
 * @desc Get participants of a virtual classroom
 * @access Teacher, Admin
 */
router.get('/participants/:room_id', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { active_only = 'false' } = req.query;

    let whereClause = 'WHERE vcp.room_id = :room_id AND vcp.school_id = :school_id';
    if (active_only === 'true') {
      whereClause += ' AND vcp.left_at IS NULL';
    }

    const query = `
      SELECT 
        vcp.*,
        CASE 
          WHEN vcp.left_at IS NULL THEN 'active'
          ELSE 'left'
        END as session_status
      FROM virtual_classroom_participants vcp
      ${whereClause}
      ORDER BY vcp.joined_at DESC
    `;

    const participants = await require('../models').sequelize.query(query, {
      replacements: {
        room_id,
        school_id: req.user?.school_id || req.headers['x-school-id'] || ''
      },
      type: require('sequelize').QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: participants
    });

  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching participants",
      error: error.message
    });
  }
});

/**
 * @route PUT /api/virtual-classroom/update/:room_id
 * @desc Update virtual classroom details
 * @access Teacher (only the teacher who created the classroom)
 */
router.put('/update/:room_id', updateVirtualClassroom);

/**
 * @route POST /api/virtual-classroom/generate-token
 * @desc Generate a Jitsi JWT token for video calls
 * @access Authenticated users
 */
router.post('/generate-token', (req, res) => {
  try {
    const { roomName, userName, userId, userEmail, schoolId, user_type } = req.body;
    
    // Determine if user should have moderator privileges
    const isModerator = user_type === 'Teacher' || user_type === 'Admin';
    
    const token = generateJitsiToken(
      roomName, 
      userName, 
      userId || req.user.id, 
      userEmail || req.user.email, 
      schoolId || req.user.school_id, 
      isModerator
    );
    
    if (token) {
      res.json({
        success: true,
        token: token
      });
    } else {
      // If token generation fails (e.g., due to missing secret), 
      // return success with null token and handle appropriately on frontend
      res.json({
        success: true,
        token: null,
        message: "Token not generated (may not be required for public Jitsi server)"
      });
    }
  } catch (error) {
    console.error("Error generating Jitsi token:", error);
    res.status(500).json({
      success: false,
      message: "Error generating token",
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/virtual-classroom/cancel/:room_id
 * @desc Cancel a virtual classroom
 * @access Teacher (only the teacher who created the classroom), Admin
 */
router.delete('/cancel/:room_id', async (req, res) => {
  try {
    const { room_id } = req.params;
    const cancellation_reason = req.body.cancellation_reason || req.query.cancellation_reason;

    // Debug logging to help troubleshoot the issue
    console.log('Cancel Virtual Classroom Debug Info:', {
      room_id,
      authenticated_user_id: req.user.id,
      authenticated_user_user_id: req.user.user_id,
      user_type: req.user.user_type,
      attempting_teacher_id: req.user.user_type === 'Teacher' ? (req.user.user_id || req.user.id) : req.user.id,
      school_id: req.user.school_id
    });

    // Construct query to handle both old and new teacher ID storage for backward compatibility
    let updateQuery;
    let replacements;
    
    // Determine the correct IDs for comparison based on user type
    // For teachers, check against both the teacher record ID and the referenced user_id
    const isTeacher = req.user.user_type === 'Teacher';
    const idToCheck1 = req.user.id;  // This is the ID in the current user object (737 from debug)
    const idToCheck2 = isTeacher ? (req.user.user_id || req.user.id) : req.user.id;  // For teachers, use user_id if available
    
    updateQuery = `
      UPDATE virtual_classrooms 
      SET 
        status = 'cancelled',
        updated_by = :updated_by,
        updated_at = NOW()
      WHERE room_id = :room_id 
        AND school_id = :school_id 
        AND (teacher_id = :id_check_1 OR teacher_id = :id_check_2)
        AND status IN ('scheduled', 'active')
    `;
    
    replacements = {
      room_id,
      updated_by: req.user.name || req.user.id,
      school_id: req.user.school_id,
      id_check_1: idToCheck1,
      id_check_2: idToCheck2
    };
    
    console.log('Cancel Classroom - checking potential IDs:', {
      id_check_1: idToCheck1,
      id_check_2: idToCheck2,
      user_type: req.user.user_type,
      user_id: req.user.id,
      user_user_id: req.user.user_id
    });

    const result = await require('../models').sequelize.query(updateQuery, {
      replacements,
      type: require('sequelize').QueryTypes.UPDATE
    });

    if (result[1] === 0) {
      // Query the classroom to see what's happening
      const checkQuery = `
        SELECT room_id, teacher_id, school_id, status
        FROM virtual_classrooms
        WHERE room_id = :room_id
      `;
      const classroomCheck = await require('../models').sequelize.query(checkQuery, {
        replacements: { room_id },
        type: require('sequelize').QueryTypes.SELECT
      });
      
      // Check each condition individually to identify the issue
      const conditionChecks = {
        room_id_matches: classroomCheck.length > 0 && classroomCheck[0].room_id === room_id,
        school_id_matches: classroomCheck.length > 0 && classroomCheck[0].school_id === req.user.school_id,
        status_eligible: classroomCheck.length > 0 && ['scheduled', 'active'].includes(classroomCheck[0].status),
        teacher_id_matches_new: classroomCheck.length > 0 && classroomCheck[0].teacher_id == (req.user.user_id || null), // Use loose comparison for string/number
        teacher_id_matches_old: classroomCheck.length > 0 && classroomCheck[0].teacher_id == (req.user.id || null) // Use loose comparison for string/number
      };
      
      console.log('Cancel Virtual Classroom - Condition Checks:', conditionChecks);
      console.log('Classroom lookup for debugging:', classroomCheck);
      
      return res.status(404).json({
        success: false,
        message: "Virtual classroom not found or you don't have permission to cancel it",
        debug: {
          room_id,
          classroom_found: classroomCheck.length > 0,
          classroom_details: classroomCheck[0] || null,
          authenticated_user_id: req.user.id,
          authenticated_user_user_id: req.user.user_id,
          actual_teacher_id_used: req.user.user_type === 'Teacher' ? (req.user.user_id || req.user.id) : req.user.id,
          condition_checks: conditionChecks,
          replacements_used: replacements
        }
      });
    }

    // TODO: Send cancellation notifications to students
    // This would involve creating notification records and sending push notifications

    res.json({
      success: true,
      message: "Virtual classroom cancelled successfully"
    });

  } catch (error) {
    console.error("Error cancelling virtual classroom:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling virtual classroom",
      error: error.message
    });
  }
});

/**
 * @route POST /api/virtual-classroom/notify-students
 * @desc Notify students when a virtual class starts
 * @access Teacher
 */
router.post('/notify-students', async (req, res) => {
  try {
    console.log('📢 Notify students endpoint called');
    const { classroom_id, room_id, class_name, subject, teacher_name, join_url, message } = req.body;
    const school_id = req.user?.school_id || req.headers['x-school-id'] || 'SCH/23';

    console.log('Request data:', { room_id, subject, teacher_name, school_id });

    // Get students in this class - simplified query
    const studentsQuery = `
      SELECT DISTINCT s.admission_no, s.student_name as name
      FROM students s
      WHERE s.current_class = (
        SELECT class_code FROM virtual_classrooms 
        WHERE room_id = :room_id AND school_id = :school_id
      ) AND s.school_id = :school_id AND s.status = 'Active'
    `;

    console.log('Executing simplified students query...');
    const students = await require('../models').sequelize.query(studentsQuery, {
      replacements: { room_id, school_id },
      type: require('sequelize').QueryTypes.SELECT
    });

    console.log(`Found ${students.length} students:`, students.map(s => ({ name: s.name, admission_no: s.admission_no })));

    // Send real-time notifications via Socket.IO
    try {
      const socketService = require('../services/socketService');
      console.log('SocketService loaded successfully');
      
      students.forEach(student => {
        const notificationData = {
          id: Date.now() + Math.random(),
          title: `${subject} Class Started`,
          message: `${subject} class with ${teacher_name} has started! Click to join now.`,
          join_url: join_url || `/virtual-classroom/join/${room_id}`,
          room_id,
          subject,
          teacher_name,
          timestamp: new Date()
        };

        // Send to student using admission_no as identifier
        socketService.sendToUser(`student_${student.admission_no}`, {
          type: 'class-started',
          data: notificationData
        });

        console.log(`✅ Sent notification to student ${student.name} (${student.admission_no})`);
      });
      
    } catch (socketError) {
      console.error('Socket service error:', socketError);
      // Continue even if socket fails
    }

    res.json({
      success: true,
      message: `Real-time notifications sent to ${students.length} students`,
      notified_count: students.length
    });

  } catch (error) {
    console.error('❌ Error notifying students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to notify students',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * @route POST /api/virtual-classroom/test-notification
 * @desc Test notification system
 * @access Student
 */
router.post('/test-notification', async (req, res) => {
  try {
    const { user_id } = req.body;
    const socketService = require('../services/socketService');
    
    const testNotification = {
      id: Date.now(),
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      join_url: '/virtual-classroom/join/test',
      room_id: 'test',
      subject: 'Test Subject',
      teacher_name: 'Test Teacher',
      timestamp: new Date()
    };

    // Send test notification
    socketService.sendToUser(user_id || req.user.id, {
      type: 'class-started',
      data: testNotification
    });

    console.log(`Sent test notification to user ${user_id || req.user.id}`);

    res.json({
      success: true,
      message: 'Test notification sent',
      user_id: user_id || req.user.id
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

module.exports = router;