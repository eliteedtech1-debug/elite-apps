const express = require('express');
const router = express.Router();
const passport = require('passport');
const notificationService = require('../services/notificationService');

router.get('/', 
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { limit = 50, offset = 0, isRead } = req.query;
      const userId = req.user.id;
      const schoolId = req.headers['x-school-id'] || req.user.school_id;

      const { rows: notifications, count } = await notificationService.getUserNotifications(
        userId, 
        { limit: parseInt(limit), offset: parseInt(offset), isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined }
      );

      const { stats, categoryBreakdown } = await notificationService.getStats(userId, schoolId);

      res.json({
        success: true,
        data: {
          notifications,
          total: count,
          stats,
          categoryBreakdown
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post('/send-bulk',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { title, message, type, category, recipients, actionUrl } = req.body;
      const schoolId = req.headers['x-school-id'] || req.user.school_id;
      const branchId = req.headers['x-branch-id'] || req.user.branch_id;
      const createdBy = req.user.id;

      if (recipients === 'all') {
        await notificationService.sendToSchool({
          schoolId,
          title,
          message,
          type,
          category,
          actionUrl,
          createdBy
        });
      } else {
        const users = await getRecipientsByType(recipients, schoolId, branchId);
        const notifications = users.map(user => ({
          userId: user.id,
          title,
          message,
          type,
          category,
          actionUrl,
          schoolId,
          branchId,
          createdBy
        }));
        await notificationService.createBulk(notifications);
      }

      res.json({ success: true, message: 'Notifications sent successfully' });
    } catch (error) {
      console.error('Send bulk notification error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post('/mark-read',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { notificationIds } = req.body;
      const userId = req.user.id;

      await notificationService.markAsRead(notificationIds, userId);

      res.json({ success: true, message: 'Notifications marked as read' });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post('/mark-all-read',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      await notificationService.markAllAsRead(userId);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all read error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

async function getRecipientsByType(type, schoolId, branchId) {
  const db = require('../models');
  
  const queries = {
    staff: `SELECT id FROM users WHERE school_id = :schoolId AND user_type IN ('Admin', 'Teacher', 'Staff') AND status = 'active'`,
    teachers: `SELECT id FROM users WHERE school_id = :schoolId AND user_type = 'Teacher' AND status = 'active'`,
    parents: `SELECT id FROM users WHERE school_id = :schoolId AND user_type = 'Parent' AND status = 'active'`,
    students: `SELECT id FROM users WHERE school_id = :schoolId AND user_type = 'Student' AND status = 'active'`
  };

  return await db.sequelize.query(queries[type] || queries.staff, {
    replacements: { schoolId, branchId },
    type: db.sequelize.QueryTypes.SELECT
  });
}

module.exports = router;
