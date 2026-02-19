const auditDB = require('../models/audit');
const socketService = require('./socketService');

class NotificationService {
  async create({ userId, title, message, type = 'info', category = 'general', actionUrl, metadata, schoolId, branchId, createdBy }) {
    const notification = await auditDB.EliteLog.create({
      userId,
      title,
      message,
      type,
      category,
      actionUrl,
      metadata,
      schoolId,
      branchId,
      createdBy
    });

    socketService.sendToUser(userId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt
    });

    return notification;
  }

  async createBulk(notifications) {
    const created = await auditDB.EliteLog.bulkCreate(notifications);
    
    created.forEach(notif => {
      socketService.sendToUser(notif.userId, {
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        category: notif.category,
        actionUrl: notif.actionUrl,
        createdAt: notif.createdAt
      });
    });

    return created;
  }

  async sendToSchool({ schoolId, title, message, type, category, actionUrl, metadata, createdBy }) {
    const db = require('../models');
    const users = await db.sequelize.query(
      `SELECT id FROM users WHERE school_id = :schoolId AND status = 'active'`,
      { replacements: { schoolId }, type: db.sequelize.QueryTypes.SELECT }
    );

    const notifications = users.map(user => ({
      userId: user.id,
      title,
      message,
      type,
      category,
      actionUrl,
      metadata,
      schoolId,
      createdBy
    }));

    return await this.createBulk(notifications);
  }

  async getUserNotifications(userId, { limit = 50, offset = 0, isRead }) {
    const where = { userId };
    if (isRead !== undefined) where.isRead = isRead;

    return await auditDB.EliteLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  async markAsRead(notificationIds, userId) {
    return await auditDB.EliteLog.update(
      { isRead: true, readAt: new Date() },
      { where: { id: notificationIds, userId } }
    );
  }

  async markAllAsRead(userId) {
    return await auditDB.EliteLog.update(
      { isRead: true, readAt: new Date() },
      { where: { userId, isRead: false } }
    );
  }

  async getStats(userId, schoolId) {
    const [stats] = await auditDB.sequelize.query(`
      SELECT 
        COUNT(*) as total_notifications,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as week_count
      FROM elite_logs
      WHERE user_id = :userId AND school_id = :schoolId
    `, { replacements: { userId, schoolId }, type: auditDB.sequelize.QueryTypes.SELECT });

    const categoryBreakdown = await auditDB.sequelize.query(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count
      FROM elite_logs
      WHERE user_id = :userId AND school_id = :schoolId
      GROUP BY category
    `, { replacements: { userId, schoolId }, type: auditDB.sequelize.QueryTypes.SELECT });

    return { stats, categoryBreakdown };
  }
}

module.exports = new NotificationService();
