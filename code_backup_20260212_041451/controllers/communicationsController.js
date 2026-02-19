const db = require('../models');

const communicationsController = {
  async getDeveloperDashboard(req, res) {
    try {
      const [systemStats] = await db.sequelize.query(`
        SELECT 
          COUNT(DISTINCT school_id) as total_schools,
          COUNT(*) as total_messages,
          SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as successful_messages,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages,
          SUM(CASE WHEN channel = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp_count,
          SUM(CASE WHEN channel = 'email' THEN 1 ELSE 0 END) as email_count,
          SUM(CASE WHEN channel = 'sms' THEN 1 ELSE 0 END) as sms_count,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as week_count,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as month_count
        FROM messaging_history
      `);

      const [schoolActivity] = await db.sequelize.query(`
        SELECT 
          s.school_name,
          s.school_id,
          COUNT(mh.id) as message_count,
          SUM(CASE WHEN mh.status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN mh.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          MAX(mh.created_at) as last_activity
        FROM schools s
        LEFT JOIN messaging_history mh ON s.school_id = mh.school_id
        WHERE mh.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY s.school_id, s.school_name
        ORDER BY message_count DESC
        LIMIT 10
      `);

      const [channelTrends] = await db.sequelize.query(`
        SELECT 
          DATE(created_at) as date,
          channel,
          COUNT(*) as count,
          SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as success_count
        FROM messaging_history
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at), channel
        ORDER BY date DESC
      `);

      const [errorLogs] = await db.sequelize.query(`
        SELECT 
          school_id,
          channel,
          'Delivery failed' as error_message,
          COUNT(*) as error_count,
          MAX(created_at) as last_occurrence
        FROM messaging_history
        WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY school_id, channel
        ORDER BY error_count DESC
        LIMIT 20
      `);

      const [performanceMetrics] = await db.sequelize.query(`
        SELECT 
          channel,
          COUNT(*) as total_messages,
          SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as successful,
          ROUND((SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as success_rate
        FROM messaging_history
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY channel
      `);

      res.json({
        success: true,
        data: {
          systemStats: systemStats[0],
          schoolActivity,
          channelTrends,
          errorLogs,
          performanceMetrics
        }
      });
    } catch (error) {
      console.error('Developer dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch developer dashboard data'
      });
    }
  },

  async getSchoolDashboard(req, res) {
    try {
      const { school_id, branch_id } = req.user;

      const branchFilter = branch_id ? 'AND branch_id = ?' : '';
      const branchParam = branch_id ? [branch_id] : [];

      const [stats] = await db.sequelize.query(`
        SELECT 
          COUNT(*) as total_messages,
          SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as successful_messages,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages,
          SUM(CASE WHEN channel = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp_count,
          SUM(CASE WHEN channel = 'email' THEN 1 ELSE 0 END) as email_count,
          SUM(CASE WHEN channel = 'sms' THEN 1 ELSE 0 END) as sms_count,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as week_count,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as month_count
        FROM messaging_history
        WHERE school_id = ? ${branchFilter}
      `, { replacements: [school_id, ...branchParam] });

      const [messageTrends] = await db.sequelize.query(`
        SELECT 
          DATE(created_at) as date,
          channel,
          COUNT(*) as count,
          SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as success_count
        FROM messaging_history
        WHERE school_id = ? ${branchFilter}
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at), channel
        ORDER BY date DESC
      `, { replacements: [school_id, ...branchParam] });

      const [recipientStats] = await db.sequelize.query(`
        SELECT 
          recipient_type,
          COUNT(*) as message_count,
          SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as success_count
        FROM messaging_history
        WHERE school_id = ? ${branchFilter}
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY recipient_type
      `, { replacements: [school_id, ...branchParam] });

      const [costAnalysis] = await db.sequelize.query(`
        SELECT 
          channel,
          COUNT(*) as message_count,
          SUM(cost) as estimated_cost
        FROM messaging_history
        WHERE school_id = ? ${branchFilter}
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY channel
      `, { replacements: [school_id, ...branchParam] });

      const [recentMessages] = await db.sequelize.query(`
        SELECT 
          id,
          channel,
          recipient_name,
          recipient_type,
          message_text,
          status,
          created_at,
          cost
        FROM messaging_history
        WHERE school_id = ? ${branchFilter}
        ORDER BY created_at DESC
        LIMIT 20
      `, { replacements: [school_id, ...branchParam] });

      const [branchComparison] = await db.sequelize.query(`
        SELECT 
          sl.branch_name,
          sl.branch_id,
          COUNT(mh.id) as message_count,
          SUM(CASE WHEN mh.status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as success_count
        FROM school_locations sl
        LEFT JOIN messaging_history mh ON sl.branch_id = mh.branch_id
        WHERE sl.school_id = ? AND (mh.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR mh.created_at IS NULL)
        GROUP BY sl.branch_id, sl.branch_name
        ORDER BY message_count DESC
      `, { replacements: [school_id] });

      res.json({
        success: true,
        data: {
          stats: stats[0],
          messageTrends,
          recipientStats,
          costAnalysis,
          recentMessages,
          branchComparison
        }
      });
    } catch (error) {
      console.error('School dashboard error:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch school dashboard data',
        details: error.message
      });
    }
  }
};

module.exports = communicationsController;

