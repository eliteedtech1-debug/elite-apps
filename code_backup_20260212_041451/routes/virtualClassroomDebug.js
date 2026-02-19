const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require("../models");
const sequelize = db.sequelize;
const { QueryTypes } = require("sequelize");
const { getVirtualClassroomAvatar } = require("../utils/avatarUtils");

// Apply authentication middleware
router.use(authenticateToken);

/**
 * @route POST /api/virtual-classroom-debug/test-join/:room_id
 * @desc Test join functionality with detailed debugging
 */
router.post('/test-join/:room_id', async (req, res) => {
  try {
    const { room_id } = req.params;
    const {
      participant_name = 'Test User',
      participant_type = 'student',
      participant_id = 'test_user_001',
      user_avatar = null
    } = req.body;

    // Get avatar from user.passport_url if available, otherwise use provided user_avatar
    const userPassportUrl = req.user?.passport_url;
    const finalUserAvatar = (userPassportUrl && userPassportUrl.trim() !== '') ? userPassportUrl : user_avatar;

    console.log('=== VIRTUAL CLASSROOM JOIN DEBUG ===');
    console.log('Room ID:', room_id);
    console.log('Request Body:', req.body);
    console.log('Request Headers:', {
      'x-school-id': req.headers['x-school-id'],
      'x-user-id': req.headers['x-user-id'],
      'x-user-type': req.headers['x-user-type'],
      'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
    });
    console.log('User Object:', req.user);

    // Step 1: Check if classroom exists
    console.log('\n--- Step 1: Checking classroom existence ---');
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
      console.log('❌ Classroom not found or not accessible');
      return res.status(404).json({
        success: false,
        message: "Virtual classroom not found or not accessible",
        debug: {
          room_id,
          school_id: req.user.school_id,
          query_result: classroom
        }
      });
    }

    const classroomData = classroom[0];
    console.log('✅ Classroom found:', {
      id: classroomData.id,
      title: classroomData.title,
      status: classroomData.status,
      teacher_id: classroomData.teacher_id,
      scheduled_date: classroomData.scheduled_date,
      scheduled_time: classroomData.scheduled_time
    });

    // Step 2: Check timing
    console.log('\n--- Step 2: Checking timing restrictions ---');
    const moment = require('moment');
    const scheduledDateTime = moment(`${classroomData.scheduled_date} ${classroomData.scheduled_time}`);
    const now = moment();
    const timeDiff = scheduledDateTime.diff(now, 'minutes');

    console.log('Scheduled DateTime:', scheduledDateTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Current DateTime:', now.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Time Difference (minutes):', timeDiff);

    // Check access permissions
    const isClassroomTeacher = participant_type === 'teacher' && classroomData.teacher_id === req.user.id;
    const canStudentJoin = participant_type === 'student' && (timeDiff <= 15 || classroomData.status === 'active');
    const canOtherTeacherJoin = participant_type === 'teacher' && classroomData.teacher_id !== req.user.id && (timeDiff <= 15 || classroomData.status === 'active');

    console.log('Access Check:', {
      isClassroomTeacher,
      canStudentJoin,
      canOtherTeacherJoin,
      participant_type,
      classroom_teacher_id: classroomData.teacher_id,
      user_id: req.user.id,
      classroom_status: classroomData.status
    });

    if (!isClassroomTeacher && !canStudentJoin && !canOtherTeacherJoin && timeDiff > 15) {
      console.log('❌ Access denied due to timing restrictions');
      return res.status(400).json({
        success: false,
        message: `Class will be available 15 minutes before scheduled time or when the teacher starts the class. Please wait ${timeDiff} more minutes.`,
        scheduled_time: scheduledDateTime.format('YYYY-MM-DD HH:mm:ss'),
        debug: {
          timeDiff,
          isClassroomTeacher,
          canStudentJoin,
          canOtherTeacherJoin
        }
      });
    }

    console.log('✅ Timing check passed');

    // Step 3: Record participant joining
    console.log('\n--- Step 3: Recording participant ---');
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
        left_at = NULL
    `;

    try {
      await sequelize.query(participantQuery, {
        replacements: {
          room_id,
          participant_id,
          participant_name,
          participant_type,
          user_avatar: getVirtualClassroomAvatar(participant_type, participant_name, finalUserAvatar),
          school_id: req.user.school_id,
          branch_id: req.user.branch_id
        },
        type: QueryTypes.INSERT
      });
      console.log('✅ Participant recorded successfully');
    } catch (participantError) {
      console.log('❌ Error recording participant:', participantError.message);
      return res.status(500).json({
        success: false,
        message: "Error recording participant",
        error: participantError.message,
        debug: {
          query: participantQuery,
          replacements: {
            room_id,
            participant_id,
            participant_name,
            participant_type,
            user_avatar,
            school_id: req.user.school_id,
            branch_id: req.user.branch_id
          }
        }
      });
    }

    // Step 4: Update classroom status if teacher joins
    console.log('\n--- Step 4: Updating classroom status ---');
    if (participant_type === 'teacher' && classroomData.status === 'scheduled') {
      try {
        await sequelize.query(
          `UPDATE virtual_classrooms 
           SET status = 'active', started_at = NOW() 
           WHERE room_id = :room_id`,
          {
            replacements: { room_id },
            type: QueryTypes.UPDATE
          }
        );
        console.log('✅ Classroom status updated to active');
      } catch (updateError) {
        console.log('⚠️ Warning: Could not update classroom status:', updateError.message);
      }
    }

    // Step 5: Generate response
    console.log('\n--- Step 5: Generating response ---');
    const response = {
      success: true,
      message: "Successfully joined virtual classroom",
      data: {
        room_id,
        classroom_title: classroomData.title,
        meeting_url: classroomData.meeting_url,
        jitsi_config: {
          roomName: room_id,
          displayName: participant_name,
          userInfo: {
            displayName: participant_name,
            email: `${participant_id}@${req.user.school_id}.edu`
          },
          configOverwrite: {
            startWithAudioMuted: participant_type === 'student',
            startWithVideoMuted: participant_type === 'student',
            enableWelcomePage: false,
            enableClosePage: false,
            prejoinPageEnabled: false,
            disableModeratorIndicator: true,
            enableEmailInStats: false,
            enableLobbyChat: false,
            enableInsecureRoomNameWarning: false,
            enableUserRolesBasedOnToken: false,
            doNotStoreRoom: true,
            requireDisplayName: false,
            disableDeepLinking: true,
            enableLobby: false,
            enableKnocking: false,
            ...(participant_type === 'teacher' && {
              startAsModerator: true,
              enableModeratorIndicator: true
            })
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: participant_type === 'teacher' ? [
              'microphone', 'camera', 'closedcaptions', 'desktop',
              'fullscreen', 'fodeviceselection', 'hangup', 'profile',
              'chat', 'recording', 'livestreaming', 'etherpad',
              'sharedvideo', 'settings', 'raisehand', 'videoquality',
              'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videobackgroundblur', 'download', 'help',
              'mute-everyone', 'security'
            ] : [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat',
              'raisehand', 'videoquality', 'filmstrip', 'stats',
              'shortcuts', 'tileview', 'videobackgroundblur'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: "",
            SHOW_POWERED_BY: false,
            DISABLE_PRESENCE_STATUS: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false
          }
        }
      },
      debug: {
        classroom_data: classroomData,
        timing_info: {
          scheduled: scheduledDateTime.format('YYYY-MM-DD HH:mm:ss'),
          current: now.format('YYYY-MM-DD HH:mm:ss'),
          diff_minutes: timeDiff
        },
        access_permissions: {
          isClassroomTeacher,
          canStudentJoin,
          canOtherTeacherJoin
        }
      }
    };

    console.log('✅ Join process completed successfully');
    console.log('=== END DEBUG ===\n');

    res.json(response);

  } catch (error) {
    console.error("❌ Error in test join:", error);
    console.log('=== END DEBUG (ERROR) ===\n');
    
    res.status(500).json({
      success: false,
      message: "Error testing virtual classroom join",
      error: error.message,
      debug: {
        stack: error.stack,
        request_body: req.body,
        request_params: req.params,
        user_info: req.user
      }
    });
  }
});

/**
 * @route GET /api/virtual-classroom-debug/validate-setup/:room_id
 * @desc Validate complete virtual classroom setup
 */
router.get('/validate-setup/:room_id', async (req, res) => {
  try {
    const { room_id } = req.params;
    const validation = {
      success: true,
      checks: [],
      errors: [],
      warnings: []
    };

    // Check 1: Database tables exist
    try {
      const tableCheck = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name IN ('virtual_classrooms', 'virtual_classroom_participants', 'virtual_classroom_notifications')
      `, { type: QueryTypes.SELECT });
      
      const tables = tableCheck.map(t => t.table_name);
      validation.checks.push({
        name: 'Database Tables',
        status: tables.length === 3 ? 'PASS' : 'FAIL',
        details: `Found tables: ${tables.join(', ')}`
      });
      
      if (tables.length !== 3) {
        validation.errors.push('Missing virtual classroom database tables. Run the migration.');
      }
    } catch (error) {
      validation.checks.push({
        name: 'Database Tables',
        status: 'ERROR',
        details: error.message
      });
      validation.errors.push(`Database error: ${error.message}`);
    }

    // Check 2: Classroom exists
    try {
      const classroom = await sequelize.query(`
        SELECT * FROM virtual_classrooms WHERE room_id = :room_id
      `, {
        replacements: { room_id },
        type: QueryTypes.SELECT
      });

      validation.checks.push({
        name: 'Classroom Exists',
        status: classroom.length > 0 ? 'PASS' : 'FAIL',
        details: classroom.length > 0 ? `Found classroom: ${classroom[0].title}` : 'Classroom not found'
      });

      if (classroom.length === 0) {
        validation.errors.push('Classroom not found in database');
      } else {
        const classroomData = classroom[0];
        
        // Check 3: Classroom status
        validation.checks.push({
          name: 'Classroom Status',
          status: ['scheduled', 'active'].includes(classroomData.status) ? 'PASS' : 'WARN',
          details: `Status: ${classroomData.status}`
        });

        if (!['scheduled', 'active'].includes(classroomData.status)) {
          validation.warnings.push(`Classroom status is '${classroomData.status}' - may not be joinable`);
        }

        // Check 4: Meeting URL
        validation.checks.push({
          name: 'Meeting URL',
          status: classroomData.meeting_url ? 'PASS' : 'FAIL',
          details: classroomData.meeting_url || 'Missing meeting URL'
        });

        if (!classroomData.meeting_url) {
          validation.errors.push('Meeting URL is missing');
        }
      }
    } catch (error) {
      validation.checks.push({
        name: 'Classroom Exists',
        status: 'ERROR',
        details: error.message
      });
      validation.errors.push(`Error checking classroom: ${error.message}`);
    }

    // Check 5: Authentication setup
    validation.checks.push({
      name: 'Authentication',
      status: req.user ? 'PASS' : 'FAIL',
      details: req.user ? `User ID: ${req.user.id}, School: ${req.user.school_id}` : 'No user authentication'
    });

    if (!req.user) {
      validation.errors.push('Authentication middleware not working');
    }

    // Check 6: Required headers
    const requiredHeaders = ['x-school-id'];
    const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);
    
    validation.checks.push({
      name: 'Required Headers',
      status: missingHeaders.length === 0 ? 'PASS' : 'WARN',
      details: missingHeaders.length === 0 ? 'All headers present' : `Missing: ${missingHeaders.join(', ')}`
    });

    if (missingHeaders.length > 0) {
      validation.warnings.push(`Missing headers: ${missingHeaders.join(', ')}`);
    }

    // Overall validation result
    validation.success = validation.errors.length === 0;

    res.json(validation);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error validating setup",
      error: error.message
    });
  }
});

module.exports = router;