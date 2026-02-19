const express = require('express');
const db = require('../models');
const { Op } = require('sequelize');

module.exports = function(app) {
  const router = express.Router();

  // Get online staff members (users with active sessions)
  router.get('/online-staff', async (req, res) => {
    try {
      // Calculate the time threshold (5 minutes ago)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Use raw SQL query to avoid complex Sequelize association issues
      const onlineStaff = await db.sequelize.query(`
        SELECT DISTINCT
          u.id,
          u.name,
          u.user_type,
          u.email,
          u.last_activity,
          ls.last_activity as session_last_activity,
          ls.ip_address,
          ls.device_info
        FROM users u
        LEFT JOIN login_sessions ls ON u.id = ls.user_id 
          AND ls.is_active = 1 
          AND ls.last_activity > :fiveMinutesAgo
        WHERE u.user_type IN ('admin', 'superadmin', 'teacher')
          AND (u.last_activity > :fiveMinutesAgo OR ls.last_activity > :fiveMinutesAgo)
        ORDER BY 
          COALESCE(ls.last_activity, u.last_activity) DESC,
          u.last_activity DESC
      `, {
        replacements: { fiveMinutesAgo },
        type: db.sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: onlineStaff
      });
    } catch (error) {
      console.error('Error fetching online staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch online staff members'
      });
    }
  });

  // Get specific user online status
  router.get('/user-status/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Calculate the time threshold (5 minutes ago)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const userStatus = await db.sequelize.query(`
        SELECT 
          u.id,
          u.name,
          u.user_type,
          u.email,
          u.last_activity,
          ls.last_activity as session_last_activity,
          CASE 
            WHEN ls.last_activity > :fiveMinutesAgo OR u.last_activity > :fiveMinutesAgo 
            THEN 'online' 
            ELSE 'offline' 
          END as status
        FROM users u
        LEFT JOIN login_sessions ls ON u.id = ls.user_id 
          AND ls.is_active = 1 
          AND ls.last_activity > :fiveMinutesAgo
        WHERE u.id = :userId
        LIMIT 1
      `, {
        replacements: { userId, fiveMinutesAgo },
        type: db.sequelize.QueryTypes.SELECT
      });

      if (!userStatus || userStatus.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userStatus[0];
      const lastActivity = user.session_last_activity || user.last_activity;

      res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          user_type: user.user_type,
          email: user.email,
          status: user.status,
          last_activity: lastActivity
        }
      });
    } catch (error) {
      console.error('Error fetching user status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user status'
      });
    }
  });

  // Mount the router
  app.use('/api/support', router);
};