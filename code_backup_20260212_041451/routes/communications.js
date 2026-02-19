const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticateToken } = require('../middleware/auth');
const communicationsController = require('../controllers/communicationsController');
const { addSingleMessageJob: addWhatsAppJob } = require('../queues/whatsappQueue');
const { addEmailJob } = require('../queues/emailQueue');
const { addSMSJob } = require('../queues/smsQueue');

// Developer Dashboard (system-wide metrics)
router.get('/developer-dashboard', authenticateToken, communicationsController.getDeveloperDashboard);

// School Dashboard (school-specific metrics)
router.get('/school-dashboard', authenticateToken, communicationsController.getSchoolDashboard);

// Send messages via queue
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { school_id, branch_id, id: sender_id } = req.user;
    const { channels, recipient_type, recipient_ids, message, subject } = req.body;

    console.log('Send request:', { school_id, branch_id, sender_id, recipient_type, recipient_ids });

    if (!channels || !recipient_type || !recipient_ids || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Normalize recipient_type (remove trailing 's')
    const normalizedRecipientType = recipient_type.replace(/s$/, '');
    
    // Convert recipient_ids to numbers
    const recipientIdsArray = Array.isArray(recipient_ids) 
      ? recipient_ids.map(id => parseInt(String(id)))
      : [parseInt(String(recipient_ids))];

    console.log('Normalized:', { normalizedRecipientType, recipientIdsArray });

    let recipients;
    
    // If sending to parents, map parent IDs to user IDs  
    if (normalizedRecipientType === 'parent') {
      const placeholders = recipientIdsArray.map(() => '?').join(',');
      const query = `
        SELECT p.id as parent_id, p.user_id, u.id, u.name, u.email, u.phone
        FROM parents p
        JOIN users u ON p.user_id = u.id
        WHERE p.id IN (${placeholders}) AND p.school_id = ?
      `;
      const replacements = [...recipientIdsArray, school_id];
      console.log('Parent query:', query);
      console.log('Replacements:', replacements);
      [recipients] = await db.sequelize.query(query, { replacements });
    } else {
      // For teachers, use user IDs directly
      const placeholders = recipientIdsArray.map(() => '?').join(',');
      [recipients] = await db.sequelize.query(`
        SELECT id, name, email, phone
        FROM users
        WHERE id IN (${placeholders}) AND school_id = ?
      `, { replacements: [...recipientIdsArray, school_id] });
    }

    console.log('Recipients found:', recipients.length);

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

// Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;

    // Build branch filter
    const branchFilter = branch_id ? 'AND branch_id = ?' : '';
    const branchParam = branch_id ? [branch_id] : [];

    // Get statistics from existing tables
    const [smsStats] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(total_sent) as total_sent,
        SUM(total_failed) as total_failed,
        SUM(cost) as total_cost
      FROM sms_messages 
      WHERE school_id = ? ${branchFilter}
    `, { replacements: [school_id, ...branchParam] });

    const [whatsappStats] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(total_sent) as total_sent,
        SUM(total_failed) as total_failed
      FROM whatsapp_messages 
      WHERE school_id = ? ${branchFilter}
    `, { replacements: [school_id, ...branchParam] });

    const [emailStats] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as total_messages
      FROM communication_logs 
      WHERE school_id = ? ${branchFilter} AND type = 'email'
    `, { replacements: [school_id, ...branchParam] });

    const [todayStats] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as today_count
      FROM communication_logs 
      WHERE school_id = ? ${branchFilter} AND DATE(created_at) = CURDATE()
    `, { replacements: [school_id, ...branchParam] });

    const [weekStats] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as week_count
      FROM communication_logs 
      WHERE school_id = ? ${branchFilter} AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, { replacements: [school_id, ...branchParam] });

    const [monthStats] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as month_count
      FROM communication_logs 
      WHERE school_id = ? ${branchFilter} AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, { replacements: [school_id, ...branchParam] });

    // Get recent messages - show actual status from database
    let recentMessages = [];
    
    try {
      // Get from whatsapp_messages table with real status updates
      const [dbMessages] = await db.sequelize.query(`
        SELECT 
          'whatsapp' as type,
          COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(recipients, '$[0].phone')),
            'Multiple Recipients'
          ) as recipient,
          message_text as message,
          NULL as subject,
          CASE 
            WHEN JSON_UNQUOTE(JSON_EXTRACT(results, '$.status')) = 'sent' THEN 'sent'
            WHEN total_failed > 0 THEN 'failed'
            WHEN total_sent > 0 THEN 'sent'
            ELSE 'queued'
          END as status,
          created_at as sent_at,
          GREATEST(total_sent, JSON_LENGTH(recipients)) as recipient_count,
          COALESCE(cost, 0) as cost
        FROM whatsapp_messages 
        WHERE school_id = ? ${branchFilter}
        ORDER BY created_at DESC 
        LIMIT 10
      `, { replacements: [school_id, ...branchParam] });
      
      recentMessages = dbMessages;
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      recentMessages = [];
    }

    const stats = {
      totalSent: (smsStats[0]?.total_sent || 0) + (whatsappStats[0]?.total_sent || 0) + (emailStats[0]?.total_messages || 0),
      smsCount: smsStats[0]?.total_sent || 0,
      whatsappCount: whatsappStats[0]?.total_sent || 0,
      emailCount: emailStats[0]?.total_messages || 0,
      todaySent: todayStats[0]?.today_count || 0,
      weekSent: weekStats[0]?.week_count || 0,
      monthSent: monthStats[0]?.month_count || 0
    };

    res.json({
      success: true,
      data: {
        stats,
        recentMessages
      }
    });
  } catch (error) {
    console.error('Communications dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
});

// Get sent messages with filters
router.get('/sent-messages', authenticateToken, async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { type, status, search, start_date, end_date } = req.query;

    let whereClause = 'WHERE school_id = ?';
    let replacements = [school_id];

    // Add branch filtering
    if (branch_id) {
      whereClause += ' AND branch_id = ?';
      replacements.push(branch_id);
    }

    if (type && type !== 'all') {
      whereClause += ' AND type = ?';
      replacements.push(type);
    }

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      replacements.push(status);
    }

    if (search) {
      whereClause += ' AND (message LIKE ? OR recipient LIKE ?)';
      replacements.push(`%${search}%`, `%${search}%`);
    }

    if (start_date && end_date) {
      whereClause += ' AND DATE(created_at) BETWEEN ? AND ?';
      replacements.push(start_date, end_date);
    }

    const [messages] = await db.sequelize.query(`
      SELECT 
        id,
        type,
        recipient,
        message,
        subject,
        status,
        created_at as sent_at,
        1 as recipient_count,
        0 as cost,
        error_message,
        branch_id
      FROM communication_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT 50
    `, { replacements });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Sent messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sent messages'
    });
  }
});

// Retry failed message
router.post('/retry-message', authenticateToken, async (req, res) => {
  try {
    const { message_id } = req.body;

    // Mock implementation
    res.json({
      success: true,
      message: 'Message retry initiated'
    });
  } catch (error) {
    console.error('Retry message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry message'
    });
  }
});

// Get configuration
router.get('/configuration', authenticateToken, async (req, res) => {
  try {
    const { school_id } = req.user;

    // Mock configuration data
    const config = {
      sms_enabled: false,
      whatsapp_enabled: false,
      email_enabled: false,
      max_recipients_per_batch: 100,
      retry_attempts: 3
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

// Update configuration
router.put('/configuration', authenticateToken, async (req, res) => {
  try {
    const { school_id } = req.user;
    const configData = req.body;

    // Mock implementation - save configuration
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Update configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// Test connection
router.post('/test-connection', authenticateToken, async (req, res) => {
  try {
    const { service } = req.body;

    // Mock test - always return success for now
    res.json({
      success: true,
      message: `${service} connection test successful`
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed'
    });
  }
});

module.exports = router;
