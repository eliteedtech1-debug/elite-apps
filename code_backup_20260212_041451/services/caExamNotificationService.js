/**
 * CA/Exam Notification Service
 *
 * Handles:
 * - Sending notifications to teachers about upcoming deadlines
 * - Notification scheduling
 * - Email/SMS integration
 */

const db = require('../models');
const { getDaysRemaining } = require('../utils/caExamDateUtils');

/**
 * Generate unique notification code
 */
function generateNotificationCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `NOTIF-${timestamp}-${random}`;
}

/**
 * Send notifications to teachers for a specific CA setup
 * @param {number} caSetupId - CA setup ID
 * @returns {Promise<number>} Number of notifications created
 */
async function sendTeacherNotifications(caSetupId) {
  try {
    // Get CA setup details
    const [caSetup] = await db.sequelize.query(
      `SELECT cs.*,
              DATEDIFF(cs.submission_deadline, CURDATE()) as days_remaining
       FROM ca_setup cs
       WHERE cs.id = :ca_setup_id`,
      {
        replacements: { ca_setup_id: caSetupId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!caSetup) {
      throw new Error('CA setup not found');
    }

    // Check if notifications already sent
    if (caSetup.notification_sent === 1) {
      console.log(`Notifications already sent for CA setup ${caSetupId}`);
      return 0;
    }

    const daysRemaining = caSetup.days_remaining;

    // Determine priority based on days remaining
    let priority = 'Normal';
    if (daysRemaining <= 3) priority = 'Urgent';
    else if (daysRemaining <= 7) priority = 'High';
    else if (daysRemaining <= 14) priority = 'High';

    // Get all active teachers for this school
    const teachers = await db.sequelize.query(
      `SELECT id, name, email, mobile_no
       FROM users
       WHERE school_id = :school_id
         AND user_type = 'Teacher'
         AND status = 'Active'`,
      {
        replacements: { school_id: caSetup.school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (teachers.length === 0) {
      console.log('No active teachers found');
      return 0;
    }

    // Create notification for each teacher
    const notificationPromises = teachers.map(teacher => {
      const notificationCode = generateNotificationCode();

      return db.sequelize.query(
        `INSERT INTO ca_exam_notifications (
          notification_code,
          school_id,
          branch_id,
          ca_setup_id,
          notification_type,
          recipient_type,
          recipient_id,
          title,
          message,
          ca_type,
          deadline_date,
          priority,
          is_sent,
          sent_date,
          sent_via_in_app
        ) VALUES (
          :notification_code,
          :school_id,
          :branch_id,
          :ca_setup_id,
          'Upcoming Deadline',
          'Teacher',
          :teacher_id,
          :title,
          :message,
          :ca_type,
          :deadline_date,
          :priority,
          1,
          NOW(),
          1
        )`,
        {
          replacements: {
            notification_code: notificationCode,
            school_id: caSetup.school_id,
            branch_id: caSetup.branch_id,
            ca_setup_id: caSetupId,
            teacher_id: teacher.id,
            title: `Upcoming ${caSetup.ca_type} Question Submission Deadline`,
            message: `You have ${daysRemaining} days remaining to submit questions for ${caSetup.ca_type}. Deadline: ${new Date(caSetup.submission_deadline).toDateString()}`,
            ca_type: caSetup.ca_type,
            deadline_date: caSetup.submission_deadline,
            priority: priority
          },
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    });

    await Promise.all(notificationPromises);

    // Mark notifications as sent in ca_setup
    await db.sequelize.query(
      `UPDATE ca_setup SET notification_sent = 1 WHERE id = :ca_setup_id`,
      {
        replacements: { ca_setup_id: caSetupId },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    console.log(`✅ Sent ${teachers.length} notifications for ${caSetup.ca_type}`);
    return teachers.length;

  } catch (error) {
    console.error('Error sending teacher notifications:', error);
    throw error;
  }
}

/**
 * Schedule notifications for upcoming deadlines
 * Checks all active CA setups and sends notifications if deadline is approaching
 * @param {string} schoolId - School ID
 * @param {string} branchId - Branch ID (optional)
 * @returns {Promise<Object>} Summary of notifications sent
 */
async function scheduleUpcomingNotifications(schoolId, branchId = null) {
  try {
    // Get all active CA setups with upcoming deadlines
    const upcomingSetups = await db.sequelize.query(
      `SELECT id, ca_type, submission_deadline,
              DATEDIFF(submission_deadline, CURDATE()) as days_remaining
       FROM ca_setup
       WHERE school_id = :school_id
         ${branchId ? 'AND branch_id = :branch_id' : ''}
         AND is_active = 1
         AND status = 'Active'
         AND notification_sent = 0
         AND submission_deadline >= CURDATE()
         AND DATEDIFF(submission_deadline, CURDATE()) <= 21`,
      {
        replacements: {
          school_id: schoolId,
          branch_id: branchId
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (upcomingSetups.length === 0) {
      return {
        success: true,
        message: 'No upcoming deadlines requiring notifications',
        count: 0
      };
    }

    let totalNotifications = 0;

    for (const setup of upcomingSetups) {
      const count = await sendTeacherNotifications(setup.id);
      totalNotifications += count;
    }

    return {
      success: true,
      message: `Notifications scheduled for ${upcomingSetups.length} CA setups`,
      setupsProcessed: upcomingSetups.length,
      totalNotificationsSent: totalNotifications
    };

  } catch (error) {
    console.error('Error scheduling notifications:', error);
    return {
      success: false,
      message: 'Error scheduling notifications',
      error: error.message
    };
  }
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID
 */
async function markNotificationAsRead(notificationId, userId) {
  try {
    await db.sequelize.query(
      `UPDATE ca_exam_notifications
       SET is_read = 1, read_date = NOW()
       WHERE id = :notification_id AND recipient_id = :user_id`,
      {
        replacements: {
          notification_id: notificationId,
          user_id: userId
        },
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Send notification when submission status changes
 * @param {number} submissionId - Submission ID
 * @param {string} notificationType - Type of notification
 * @param {string} message - Notification message
 */
async function sendSubmissionNotification(submissionId, notificationType, message) {
  try {
    // Get submission details
    const [submission] = await db.sequelize.query(
      `SELECT ces.*, u.name as teacher_name, u.email as teacher_email
       FROM ca_exam_submissions ces
       JOIN users u ON ces.teacher_id = u.id
       WHERE ces.id = :submission_id`,
      {
        replacements: { submission_id: submissionId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!submission) {
      throw new Error('Submission not found');
    }

    const notificationCode = generateNotificationCode();

    await db.sequelize.query(
      `INSERT INTO ca_exam_notifications (
        notification_code,
        school_id,
        branch_id,
        ca_setup_id,
        notification_type,
        recipient_type,
        recipient_id,
        submission_id,
        title,
        message,
        ca_type,
        priority,
        is_sent,
        sent_date,
        sent_via_in_app
      ) VALUES (
        :notification_code,
        :school_id,
        :branch_id,
        :ca_setup_id,
        :notification_type,
        'Teacher',
        :teacher_id,
        :submission_id,
        :title,
        :message,
        :ca_type,
        'Normal',
        1,
        NOW(),
        1
      )`,
      {
        replacements: {
          notification_code: notificationCode,
          school_id: submission.school_id,
          branch_id: submission.branch_id,
          ca_setup_id: submission.ca_setup_id,
          notification_type: notificationType,
          teacher_id: submission.teacher_id,
          submission_id: submissionId,
          title: `${submission.ca_type} Submission ${notificationType}`,
          message: message,
          ca_type: submission.ca_type
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    console.log(`✅ Notification sent to ${submission.teacher_name}: ${notificationType}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending submission notification:', error);
    throw error;
  }
}

module.exports = {
  sendTeacherNotifications,
  scheduleUpcomingNotifications,
  markNotificationAsRead,
  sendSubmissionNotification,
  generateNotificationCode
};
