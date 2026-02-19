const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticateToken } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const { getAuditConnection } = require('../config/database');

// GET /api/system/notifications - Role-aware notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    let { user_type, id: userId, school_id } = req.user;
    const auditDb = await getAuditConnection();
    
    // For students, if id is admission_no (string), get numeric ID
    if (user_type.toLowerCase() === 'student' && isNaN(userId)) {
      const [student] = await db.sequelize.query(
        'SELECT id FROM students WHERE admission_no = ? AND school_id = ?',
        { replacements: [userId, school_id], type: db.Sequelize.QueryTypes.SELECT }
      );
      if (student) {
        userId = student.id;
      }
    }
    
    console.log('Request user:', { user_type, userId, school_id });

    // Test basic query first
    const testQuery = await auditDb.query(
      'SELECT COUNT(*) as count FROM system_notifications WHERE school_id = ?',
      { replacements: [school_id], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    console.log('Test query result:', testQuery);

    const normalizedUserType = user_type.toLowerCase();
    const isAdmin = ['admin', 'branchadmin', 'superadmin'].includes(normalizedUserType);

    console.log('User type check:', { normalizedUserType, isAdmin });

    if (isAdmin) {
      // Simple admin stats - count bulk notifications as 1 each
      const stats = await auditDb.query(`
        SELECT 
          (SELECT COUNT(*) FROM system_notifications WHERE school_id = ? AND is_bulk = 1) +
          (SELECT COUNT(DISTINCT CONCAT(title, message, DATE(created_at))) FROM system_notifications WHERE school_id = ? AND is_bulk = 0) as total_notifications,
          
          (SELECT COUNT(*) FROM system_notifications WHERE school_id = ? AND is_bulk = 1 AND is_read = 0) +
          (SELECT COUNT(DISTINCT CONCAT(title, message, DATE(created_at))) FROM system_notifications WHERE school_id = ? AND is_bulk = 0 AND is_read = 0) as unread_count,
          
          (SELECT COUNT(*) FROM system_notifications WHERE school_id = ? AND is_bulk = 1 AND DATE(created_at) = CURDATE()) +
          (SELECT COUNT(DISTINCT CONCAT(title, message, DATE(created_at))) FROM system_notifications WHERE school_id = ? AND is_bulk = 0 AND DATE(created_at) = CURDATE()) as today_count,
          
          (SELECT COUNT(*) FROM system_notifications WHERE school_id = ? AND is_bulk = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) +
          (SELECT COUNT(DISTINCT CONCAT(title, message, DATE(created_at))) FROM system_notifications WHERE school_id = ? AND is_bulk = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as week_count
      `, { replacements: [school_id, school_id, school_id, school_id, school_id, school_id, school_id, school_id], type: db.Sequelize.QueryTypes.SELECT });

      // Get recent notifications - show bulk as single items, group individual duplicates
      const notifications = await auditDb.query(`
        SELECT 
          id, user_id, title, message, type, category, is_read, created_at, is_bulk, metadata,
          CASE 
            WHEN is_bulk = 1 THEN CONCAT(title, ' (sent to ', JSON_EXTRACT(metadata, '$.total_recipients'), ' users)')
            ELSE title
          END as display_title
        FROM system_notifications
        WHERE school_id = ? AND (
          is_bulk = 1 OR 
          (is_bulk = 0 AND id = (SELECT MIN(id) FROM system_notifications s2 WHERE s2.title = system_notifications.title AND s2.message = system_notifications.message AND s2.school_id = ?))
        )
        ORDER BY created_at DESC
        LIMIT 20
      `, { replacements: [school_id, school_id], type: db.Sequelize.QueryTypes.SELECT });

      // Category breakdown - count properly
      const categories = await auditDb.query(`
        SELECT 
          category,
          (SELECT COUNT(*) FROM system_notifications WHERE school_id = ? AND category = cat.category AND is_bulk = 1) +
          (SELECT COUNT(DISTINCT CONCAT(title, message, DATE(created_at))) FROM system_notifications WHERE school_id = ? AND category = cat.category AND is_bulk = 0) as count,
          
          (SELECT COUNT(*) FROM system_notifications WHERE school_id = ? AND category = cat.category AND is_bulk = 1 AND is_read = 0) +
          (SELECT COUNT(DISTINCT CONCAT(title, message, DATE(created_at))) FROM system_notifications WHERE school_id = ? AND category = cat.category AND is_bulk = 0 AND is_read = 0) as unread_count
        FROM (SELECT DISTINCT category FROM system_notifications WHERE school_id = ?) cat
      `, { replacements: [school_id, school_id, school_id, school_id, school_id], type: db.Sequelize.QueryTypes.SELECT });

      res.json({
        success: true,
        view: 'dashboard',
        data: {
          stats: stats[0],
          notifications: notifications,
          categoryBreakdown: categories,
          pagination: {
            page: 1,
            limit: 20,
            total: stats[0].total_notifications
          }
        }
      });

    } else {
      // Staff view
      const notifications = await auditDb.query(`
        SELECT * FROM system_notifications 
        WHERE user_id = ? AND school_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `, { replacements: [userId, school_id], type: db.Sequelize.QueryTypes.SELECT });

      const unreadCount = await auditDb.query(`
        SELECT COUNT(*) as count FROM system_notifications 
        WHERE user_id = ? AND school_id = ? AND is_read = 0
      `, { replacements: [userId, school_id], type: db.Sequelize.QueryTypes.SELECT });

      res.json({
        success: true,
        view: 'inbox',
        data: {
          notifications,
          unreadCount: unreadCount[0].count,
          pagination: { page: 1, limit: 20 }
        }
      });
    }

  } catch (error) {
    console.error('System notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
});

// POST /api/system/notifications/send-bulk - Send bulk notification (Admin only)
router.post('/notifications/send-bulk', authenticateToken, async (req, res) => {
  try {
    const { user_type, school_id } = req.user;
    
    if (user_type.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { title, message, type, category, recipients } = req.body;

    let userIds = [];
    if (recipients === 'all') {
      const users = await db.sequelize.query(
        'SELECT id FROM users WHERE school_id = ?',
        { replacements: [school_id], type: db.Sequelize.QueryTypes.SELECT }
      );
      userIds = users.map(u => u.id);
    } else {
      const users = await db.sequelize.query(
        'SELECT id FROM users WHERE school_id = ? AND user_type = ?',
        { replacements: [school_id, recipients], type: db.Sequelize.QueryTypes.SELECT }
      );
      userIds = users.map(u => u.id);
    }

    await notificationService.sendBulkNotification(userIds, title, message, {
      type,
      category,
      schoolId: school_id
    });

    res.json({
      success: true,
      message: `Notification sent to ${userIds.length} users`
    });

  } catch (error) {
    console.error('Send bulk notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

// POST /api/system/notifications/mark-read - Mark notifications as read
router.post('/notifications/mark-read', authenticateToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notificationIds } = req.body;
    const auditDb = await getAuditConnection();

    await auditDb.query(
      'UPDATE system_notifications SET is_read = 1, updated_at = NOW() WHERE id IN (?) AND user_id = ?',
      { replacements: [notificationIds, userId] }
    );

    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
