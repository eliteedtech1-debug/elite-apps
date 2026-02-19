const db = require('../models');
const { getAuditConnection } = require('../config/database');
const socketService = require('./socketService');

class NotificationTriggerService {
  async sendNotification(triggerEvent, data, recipients) {
    try {
      const auditDb = await getAuditConnection();
      
      const [trigger] = await auditDb.query(
        'SELECT * FROM notification_triggers WHERE trigger_event = ? AND is_active = 1',
        { replacements: [triggerEvent], type: db.Sequelize.QueryTypes.SELECT }
      );

      if (!trigger) {
        console.log(`No active trigger found for: ${triggerEvent}`);
        return;
      }

      const title = this.replaceTemplate(trigger.title_template, data);
      const message = this.replaceTemplate(trigger.message_template, data);
      
      let expiresAt = null;
      if (trigger.retention_policy === 'temporary' && trigger.retention_days) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + trigger.retention_days);
        expiresAt = expiry;
      }

      const notifications = recipients.map(recipientId => ({
        id: this.generateUUID(),
        user_id: recipientId,
        school_id: data.school_id,
        branch_id: data.branch_id,
        title,
        message,
        link: data.link || null,
        icon: data.icon || null,
        type: 'notification',
        category: trigger.category,
        is_read: 0,
        is_bulk: recipients.length > 1 ? 1 : 0,
        retention_policy: trigger.retention_policy,
        expires_at: expiresAt,
        auto_delete_after_read: trigger.auto_delete_after_read,
        metadata: JSON.stringify({
          trigger_event: triggerEvent,
          ...data
        })
      }));

      await auditDb.query(
        `INSERT INTO system_notifications 
        (id, user_id, school_id, branch_id, title, message, link, icon, type, category, 
         is_read, is_bulk, retention_policy, expires_at, auto_delete_after_read, metadata) 
        VALUES ${notifications.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
        { 
          replacements: notifications.flatMap(n => [
            n.id, n.user_id, n.school_id, n.branch_id, n.title, n.message, 
            n.link, n.icon, n.type, n.category, n.is_read, n.is_bulk,
            n.retention_policy, n.expires_at, n.auto_delete_after_read, n.metadata
          ])
        }
      );

      recipients.forEach(recipientId => {
        socketService.sendToUser(recipientId, 'notification', {
          title, message, category: trigger.category
        });
      });

      console.log(`Sent ${recipients.length} notifications for: ${triggerEvent}`);
    } catch (error) {
      console.error('Notification trigger error:', error);
    }
  }

  async cleanupExpiredNotifications() {
    try {
      const auditDb = await getAuditConnection();
      
      await auditDb.query(
        'DELETE FROM system_notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()'
      );
      
      await auditDb.query(
        'DELETE FROM system_notifications WHERE auto_delete_after_read = 1 AND is_read = 1'
      );
      
      console.log('Cleaned up expired notifications');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  replaceTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async triggerAssignmentPublished(assignmentData) {
    const students = await db.sequelize.query(
      `SELECT u.id FROM users u 
       INNER JOIN students s ON u.id = s.id 
       WHERE s.class_code = ? AND s.school_id = ? AND u.user_type = "Student"`,
      { 
        replacements: [assignmentData.class_code, assignmentData.school_id],
        type: db.Sequelize.QueryTypes.SELECT 
      }
    );
    
    await this.sendNotification('assignment_published', assignmentData, students.map(s => s.id));
  }

  async triggerVirtualClassScheduled(classData) {
    const students = await db.sequelize.query(
      `SELECT u.id FROM users u 
       INNER JOIN students s ON u.id = s.id 
       WHERE s.class_code = ? AND s.school_id = ?`,
      { 
        replacements: [classData.class_code, classData.school_id],
        type: db.Sequelize.QueryTypes.SELECT 
      }
    );
    
    const teachers = await db.sequelize.query(
      `SELECT id FROM users WHERE school_id = ? AND user_type = "Teacher"`,
      { 
        replacements: [classData.school_id],
        type: db.Sequelize.QueryTypes.SELECT 
      }
    );
    
    const allRecipients = [...students.map(s => s.id), ...teachers.map(t => t.id)];
    await this.sendNotification('virtual_class_scheduled', classData, allRecipients);
  }

  async triggerRoleAssigned(roleData) {
    await this.sendNotification('role_assigned', roleData, [roleData.user_id]);
  }

  async triggerAttendanceMarked(attendanceData) {
    const [student] = await db.sequelize.query(
      'SELECT id FROM students WHERE admission_no = ? AND school_id = ?',
      { 
        replacements: [attendanceData.admission_no, attendanceData.school_id],
        type: db.Sequelize.QueryTypes.SELECT 
      }
    );
    
    if (student) {
      await this.sendNotification('attendance_marked', attendanceData, [student.id]);
    }
  }

  async triggerStudentAnnouncement(announcementData) {
    const students = await db.sequelize.query(
      `SELECT u.id FROM users u 
       INNER JOIN students s ON u.id = s.id 
       WHERE s.school_id = ? AND s.branch_id = ?`,
      { 
        replacements: [announcementData.school_id, announcementData.branch_id],
        type: db.Sequelize.QueryTypes.SELECT 
      }
    );
    
    await this.sendNotification('student_announcement', announcementData, students.map(s => s.id));
  }

  async sendToStudent(studentId, title, message, data = {}) {
    await this.sendNotification('student_announcement', {
      title,
      message,
      ...data
    }, [studentId]);
  }
}

module.exports = new NotificationTriggerService();
