const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { addEmailJob } = require('../queues/emailQueue');
const { addSingleMessageJob: addWhatsAppJob } = require('../queues/whatsappQueue');
const { addSMSJob } = require('../queues/smsQueue');

// Send messages endpoint (alias for /api/communications/send)
router.post('/messaging-send', authenticateToken, async (req, res) => {
  try {
    const school_id = req.body.school_id || req.headers['x-school-id'] || req.user.school_id;
    const branch_id = req.body.branch_id || req.headers['x-branch-id'] || req.user.branch_id;
    const sender_id = req.user.id;
    const { channels, recipient_type, recipient_ids, message, subject } = req.body;

    if (!channels || !recipient_type || !recipient_ids || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const normalizedRecipientType = recipient_type.replace(/s$/, '');
    const recipientIdsArray = Array.isArray(recipient_ids) 
      ? recipient_ids.map(id => parseInt(String(id)))
      : [parseInt(String(recipient_ids))];

    let recipients;
    
    if (normalizedRecipientType === 'parent') {
      recipients = await db.sequelize.query(`
        SELECT p.id as parent_id, p.user_id, u.id, u.name, u.email, u.phone
        FROM parents p
        JOIN users u ON p.user_id = u.id
        WHERE p.id IN (:ids) AND p.school_id = :schoolId
      `, { 
        replacements: { ids: recipientIdsArray, schoolId: school_id },
        type: db.sequelize.QueryTypes.SELECT
      });
    } else {
      recipients = await db.sequelize.query(`
        SELECT id, name, email, phone
        FROM users
        WHERE id IN (:ids) AND school_id = :schoolId
      `, { 
        replacements: { ids: recipientIdsArray, schoolId: school_id },
        type: db.sequelize.QueryTypes.SELECT
      });
    }

    const results = [];

    for (const channel of channels) {
      for (const recipient of recipients) {
        if (channel === 'email' && recipient.email) {
          await addEmailJob({
            school_id,
            branch_id,
            sender_id,
            recipient_id: recipient.id,
            recipient_name: recipient.name,
            recipient_type: normalizedRecipientType,
            email: recipient.email,
            subject: subject || 'Message',
            message
          });
          results.push({ channel: 'email', recipient: recipient.email, status: 'queued' });
        }

        if (channel === 'whatsapp' && recipient.phone) {
          await addWhatsAppJob({
            school_id,
            branch_id,
            sender_id,
            recipients: [{
              id: recipient.id,
              name: recipient.name,
              phone: recipient.phone
            }],
            recipient_type: normalizedRecipientType,
            message_text: message
          });
          results.push({ channel: 'whatsapp', recipient: recipient.phone, status: 'queued' });
        }

        if (channel === 'sms' && recipient.phone) {
          await addSMSJob({
            school_id,
            branch_id,
            sender_id,
            recipient_id: recipient.id,
            recipient_name: recipient.name,
            recipient_type: normalizedRecipientType,
            phone: recipient.phone,
            message
          });
          results.push({ channel: 'sms', recipient: recipient.phone, status: 'queued' });
        }
      }
    }

    res.json({
      success: true,
      message: 'Messages queued successfully',
      queued: results.length,
      results
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get messaging history for a school
 * GET /api/messaging-history
 * 
 * Query params:
 * - school_id (required): School ID
 * - channel (optional): Filter by channel (sms, whatsapp, email)
 * - recipient_type (optional): Filter by recipient type (parent, teacher, student)
 * - date_from (optional): Filter from date
 * - date_to (optional): Filter to date
 * - limit (optional): Number of records to return (default: 50)
 * - offset (optional): Offset for pagination (default: 0)
 */
router.get('/messaging-history', async (req, res) => {
  try {
    const {
      school_id: querySchoolId,
      branch_id: queryBranchId,
      channel,
      recipient_type,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;

    // Fallback to headers if not in query
    const school_id = querySchoolId || req.headers['x-school-id'];
    const branch_id = queryBranchId || req.headers['x-branch-id'];

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Build dynamic query
    let query = `
      SELECT 
        id,
        school_id,
        branch_id,
        sender_id,
        sender_type,
        recipient_type,
        recipient_id,
        recipient_name,
        recipient_identifier,
        channel,
        message_text,
        message_subject,
        status,
        cost,
        created_at
      FROM messaging_history
      WHERE school_id = ?
    `;
    const replacements = [school_id];

    // Add branch filter if provided
    if (branch_id) {
      query += ' AND branch_id = ?';
      replacements.push(branch_id);
    }

    // Add filters
    if (channel) {
      query += ' AND channel = ?';
      replacements.push(channel);
    }

    if (recipient_type) {
      query += ' AND recipient_type = ?';
      replacements.push(recipient_type);
    }

    if (date_from) {
      query += ' AND created_at >= ?';
      replacements.push(date_from);
    }

    if (date_to) {
      query += ' AND created_at <= ?';
      replacements.push(date_to);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    replacements.push(parseInt(limit), parseInt(offset));

    const history = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    // Get total count for pagination info
    let countQuery = 'SELECT COUNT(*) as count FROM messaging_history WHERE school_id = ?';
    const countReplacements = [school_id];

    if (branch_id) {
      countQuery += ' AND branch_id = ?';
      countReplacements.push(branch_id);
    }

    if (channel) {
      countQuery += ' AND channel = ?';
      countReplacements.push(channel);
    }

    if (recipient_type) {
      countQuery += ' AND recipient_type = ?';
      countReplacements.push(recipient_type);
    }

    if (date_from) {
      countQuery += ' AND created_at >= ?';
      countReplacements.push(date_from);
    }

    if (date_to) {
      countQuery += ' AND created_at <= ?';
      countReplacements.push(date_to);
    }

    const [{ count }] = await db.sequelize.query(countQuery, {
      replacements: countReplacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: {
        records: history,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching messaging history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messaging history',
      error: error.message
    });
  }
});

/**
 * Get messaging statistics
 * GET /api/messaging-stats
 * 
 * Query params:
 * - school_id (required): School ID
 * - period (optional): 'daily', 'weekly', 'monthly', 'yearly' (default: monthly)
 */
router.get('/messaging-stats', async (req, res) => {
  try {
    const { 
      school_id: querySchoolId, 
      branch_id: queryBranchId, 
      period = 'monthly' 
    } = req.query;

    // Fallback to headers if not in query
    const school_id = querySchoolId || req.headers['x-school-id'];
    const branch_id = queryBranchId || req.headers['x-branch-id'];

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Build different queries based on the period
    let statsQuery, statsReplacements;
    const branchFilter = branch_id ? 'AND branch_id = ?' : '';
    
    switch (period) {
      case 'daily':
        statsQuery = `
          SELECT 
            DATE(created_at) as period,
            channel,
            recipient_type,
            COUNT(*) as total_messages,
            SUM(cost) as total_cost,
            COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            AVG(LENGTH(message_text)) as avg_message_length
          FROM messaging_history
          WHERE school_id = ? ${branchFilter}
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at), channel, recipient_type
          ORDER BY DATE(created_at) DESC, channel
        `;
        statsReplacements = branch_id ? [school_id, branch_id] : [school_id];
        break;
      case 'weekly':
        statsQuery = `
          SELECT 
            CONCAT(YEAR(created_at), '-W', LPAD(WEEK(created_at), 2, '0')) as period,
            channel,
            recipient_type,
            COUNT(*) as total_messages,
            SUM(cost) as total_cost,
            COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            AVG(LENGTH(message_text)) as avg_message_length
          FROM messaging_history
          WHERE school_id = ? ${branchFilter}
            AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
          GROUP BY YEAR(created_at), WEEK(created_at), channel, recipient_type
          ORDER BY YEAR(created_at) DESC, WEEK(created_at) DESC, channel
        `;
        statsReplacements = branch_id ? [school_id, branch_id] : [school_id];
        break;
      case 'yearly':
        statsQuery = `
          SELECT 
            YEAR(created_at) as period,
            channel,
            recipient_type,
            COUNT(*) as total_messages,
            SUM(cost) as total_cost,
            COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            AVG(LENGTH(message_text)) as avg_message_length
          FROM messaging_history
          WHERE school_id = ? ${branchFilter}
          GROUP BY YEAR(created_at), channel, recipient_type
          ORDER BY YEAR(created_at) DESC, channel
        `;
        statsReplacements = branch_id ? [school_id, branch_id] : [school_id];
        break;
      case 'monthly':
      default:
        statsQuery = `
          SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as period,
            channel,
            recipient_type,
            COUNT(*) as total_messages,
            SUM(cost) as total_cost,
            COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            AVG(LENGTH(message_text)) as avg_message_length
          FROM messaging_history
          WHERE school_id = ? ${branchFilter}
            AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          GROUP BY DATE_FORMAT(created_at, '%Y-%m'), channel, recipient_type
          ORDER BY DATE_FORMAT(created_at, '%Y-%m') DESC, channel
        `;
        statsReplacements = branch_id ? [school_id, branch_id] : [school_id];
        break;
    }

    const stats = await db.sequelize.query(statsQuery, {
      replacements: statsReplacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    // Get overall totals
    const totals = await db.sequelize.query(
      `
      SELECT 
        COUNT(*) as total_messages,
        SUM(cost) as total_cost,
        COUNT(CASE WHEN channel = 'sms' THEN 1 END) as sms_count,
        COUNT(CASE WHEN channel = 'whatsapp' THEN 1 END) as whatsapp_count,
        COUNT(CASE WHEN channel = 'email' THEN 1 END) as email_count,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_total,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_total
      FROM messaging_history
      WHERE school_id = ?
      `,
      {
        replacements: [school_id],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        statistics: stats,
        totals: totals[0]
      }
    });
  } catch (error) {
    console.error('Error fetching messaging statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messaging statistics',
      error: error.message
    });
  }
});

/**
 * Get billing report for schools
 * GET /api/messaging-billing
 *
 * Query params:
 * - school_id (optional): Specific school ID (admin can query specific school)
 * - date_from (optional): Start date for billing period
 * - date_to (optional): End date for billing period
 * - group_by (optional): 'school' or 'month' (default: 'school')
 */
router.get('/messaging-billing', async (req, res) => {
  try {
    const {
      school_id,
      date_from,
      date_to,
      group_by = 'school'
    } = req.query;

    let billingQuery;
    let replacements = [];

    if (group_by === 'month') {
      // Monthly billing report per school
      billingQuery = `
        SELECT
          school_id,
          DATE_FORMAT(created_at, '%Y-%m') as billing_period,
          channel,
          COUNT(*) as total_messages_sent,
          SUM(recipients_count) as total_recipients,
          SUM(cost) as total_cost,
          MIN(created_at) as period_start,
          MAX(created_at) as period_end
        FROM messaging_history
        WHERE 1=1
      `;
    } else {
      // Overall billing per school
      billingQuery = `
        SELECT
          school_id,
          channel,
          COUNT(*) as total_messages_sent,
          SUM(recipients_count) as total_recipients,
          SUM(cost) as total_cost,
          MIN(created_at) as first_message_date,
          MAX(created_at) as last_message_date,
          COUNT(CASE WHEN message_type = 'bulk' THEN 1 END) as bulk_messages_count,
          COUNT(CASE WHEN message_type = 'single' THEN 1 END) as single_messages_count
        FROM messaging_history
        WHERE 1=1
      `;
    }

    // Add filters
    if (school_id) {
      billingQuery += ' AND school_id = ?';
      replacements.push(school_id);
    }

    if (date_from) {
      billingQuery += ' AND created_at >= ?';
      replacements.push(date_from);
    }

    if (date_to) {
      billingQuery += ' AND created_at <= ?';
      replacements.push(date_to);
    }

    // Group by clause
    if (group_by === 'month') {
      billingQuery += ' GROUP BY school_id, DATE_FORMAT(created_at, \'%Y-%m\'), channel';
      billingQuery += ' ORDER BY school_id, billing_period DESC, channel';
    } else {
      billingQuery += ' GROUP BY school_id, channel';
      billingQuery += ' ORDER BY school_id, channel';
    }

    const billingData = await db.sequelize.query(billingQuery, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    // Get summary totals
    let summaryQuery = `
      SELECT
        COUNT(DISTINCT school_id) as total_schools,
        COUNT(*) as total_message_records,
        SUM(recipients_count) as total_recipients_all,
        SUM(cost) as total_revenue,
        SUM(CASE WHEN channel = 'sms' THEN cost END) as sms_revenue,
        SUM(CASE WHEN channel = 'whatsapp' THEN cost END) as whatsapp_revenue,
        SUM(CASE WHEN channel = 'email' THEN cost END) as email_revenue
      FROM messaging_history
      WHERE 1=1
    `;
    const summaryReplacements = [];

    if (school_id) {
      summaryQuery += ' AND school_id = ?';
      summaryReplacements.push(school_id);
    }

    if (date_from) {
      summaryQuery += ' AND created_at >= ?';
      summaryReplacements.push(date_from);
    }

    if (date_to) {
      summaryQuery += ' AND created_at <= ?';
      summaryReplacements.push(date_to);
    }

    const [summary] = await db.sequelize.query(summaryQuery, {
      replacements: summaryReplacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: {
        billing_records: billingData,
        summary: summary,
        period: {
          from: date_from || 'inception',
          to: date_to || 'current',
          group_by: group_by
        }
      }
    });
  } catch (error) {
    console.error('Error fetching billing report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch billing report',
      error: error.message
    });
  }
});

/**
 * Get detailed school message count for billing
 * GET /api/school-message-count/:school_id
 *
 * Returns detailed breakdown of messages sent by a specific school
 */
router.get('/school-message-count/:school_id', async (req, res) => {
  try {
    const { school_id } = req.params;
    const { date_from, date_to } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Get detailed breakdown
    let detailQuery = `
      SELECT
        channel,
        message_type,
        COUNT(*) as message_count,
        SUM(recipients_count) as total_recipients,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost_per_message,
        MIN(created_at) as first_sent,
        MAX(created_at) as last_sent
      FROM messaging_history
      WHERE school_id = ?
    `;
    const replacements = [school_id];

    if (date_from) {
      detailQuery += ' AND created_at >= ?';
      replacements.push(date_from);
    }

    if (date_to) {
      detailQuery += ' AND created_at <= ?';
      replacements.push(date_to);
    }

    detailQuery += ' GROUP BY channel, message_type ORDER BY channel, message_type';

    const details = await db.sequelize.query(detailQuery, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    // Get overall total
    let totalQuery = `
      SELECT
        COUNT(*) as total_message_records,
        SUM(recipients_count) as total_recipients_reached,
        SUM(cost) as total_amount_due
      FROM messaging_history
      WHERE school_id = ?
    `;
    const totalReplacements = [school_id];

    if (date_from) {
      totalQuery += ' AND created_at >= ?';
      totalReplacements.push(date_from);
    }

    if (date_to) {
      totalQuery += ' AND created_at <= ?';
      totalReplacements.push(date_to);
    }

    const [totals] = await db.sequelize.query(totalQuery, {
      replacements: totalReplacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: {
        school_id: school_id,
        breakdown: details,
        totals: totals,
        period: {
          from: date_from || 'inception',
          to: date_to || 'current'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching school message count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch school message count',
      error: error.message
    });
  }
});

module.exports = router;