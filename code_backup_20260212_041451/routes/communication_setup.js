const express = require('express');
const router = express.Router();
const db = require('../models');

/**
 * Get messaging costs and packages
 * GET /api/messaging-costs
 */
router.get('/messaging-costs', async (req, res) => {
  try {
    // Get all messaging packages
    const packages = await db.sequelize.query(
      `SELECT 
        id,
        package_name,
        service_type,
        package_type,
        messages_per_term,
        unit_cost,
        package_cost,
        currency,
        description,
        is_active
      FROM messaging_packages 
      WHERE is_active = 1
      ORDER BY service_type, package_type, messages_per_term DESC`,
      {
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Group packages by service type and package type
    const groupedPackages = {};

    packages.forEach(pkg => {
      if (!groupedPackages[pkg.service_type]) {
        groupedPackages[pkg.service_type] = {
          payg: [],
          termly: [],
          annual: []
        };
      }

      if (pkg.package_type === 'payg') {
        groupedPackages[pkg.service_type].payg.push(pkg);
      } else if (pkg.package_type === 'termly') {
        groupedPackages[pkg.service_type].termly.push(pkg);
      } else if (pkg.package_type === 'annual') {
        groupedPackages[pkg.service_type].annual.push(pkg);
      }
    });

    return res.status(200).json({
      success: true,
      data: groupedPackages
    });
  } catch (error) {
    console.error('Error fetching messaging costs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messaging costs',
      error: error.message
    });
  }
});

/**
 * Update school subscription
 * PUT /api/school/subscription
 */
router.put('/school/subscription', async (req, res) => {
  try {
    const {
      school_id,
      sms_subscription,
      whatsapp_subscription,
      email_subscription
    } = req.body;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Build update object with only provided fields
    const updateFields = {};
    if (sms_subscription !== undefined) updateFields.sms_subscription = sms_subscription;
    if (whatsapp_subscription !== undefined) updateFields.whatsapp_subscription = whatsapp_subscription;
    if (email_subscription !== undefined) updateFields.email_subscription = email_subscription;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No subscription fields provided to update'
      });
    }

    // Update school_setup table
    const [affectedRows] = await db.sequelize.query(
      `UPDATE school_setup
       SET ${Object.keys(updateFields).map(key => `${key} = ?`).join(', ')}
       WHERE school_id = ?`,
      {
        replacements: [...Object.values(updateFields), school_id],
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: updateFields
    });
  } catch (error) {
    console.error('Error updating school subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message
    });
  }
});

/**
 * Get school subscription status
 * GET /api/school/subscription
 */
router.get('/school/subscription', async (req, res) => {
  try {
    const { school_id } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const [school] = await db.sequelize.query(
      `SELECT
        sms_subscription,
        whatsapp_subscription,
        email_subscription,
        school_name,
        short_name
       FROM school_setup
       WHERE school_id = ?`,
      {
        replacements: [school_id],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: school
    });
  } catch (error) {
    console.error('Error fetching school subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status',
      error: error.message
    });
  }
});

/**
 * Get school's messaging subscription status
 * GET /api/messaging-subscription
 */
router.get('/messaging-subscription', async (req, res) => {
  try {
    const { school_id } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Get current active subscriptions for the school from messaging_subscriptions
    const subscriptions = await db.sequelize.query(
      `SELECT 
        ms.id as subscription_id,
        mp.package_name,
        mp.service_type,
        mp.package_type,
        mp.messages_per_term,
        mp.unit_cost,
        mp.package_cost,
        mp.description,
        ms.start_date,
        ms.end_date,
        mp.messages_per_term as total_messages,
        COALESCE(ms.messages_used, 0) as messages_used,
        ms.status,
        DATEDIFF(ms.end_date, CURDATE()) as days_remaining
      FROM messaging_subscriptions ms
      JOIN messaging_packages mp ON ms.package_id = mp.id
      WHERE ms.school_id = ?
        AND ms.status = 'active'
        AND ms.end_date >= CURDATE()
      ORDER BY ms.start_date DESC`,
      {
        replacements: [school_id],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    return res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching school messaging subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status',
      error: error.message
    });
  }
});

/**
 * Subscribe to a messaging package
 * POST /api/messaging-subscribe
 */
router.post('/messaging-subscribe', async (req, res) => {
  try {
    const { school_id, package_id, start_date, end_date } = req.body;

    if (!school_id || !package_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID and Package ID are required'
      });
    }

    // Validate that the package exists and is active
    const [packageInfo] = await db.sequelize.query(
      'SELECT * FROM messaging_packages WHERE id = ? AND is_active = 1',
      {
        replacements: [package_id],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!packageInfo) {
      return res.status(404).json({
        success: false,
        message: 'Package not found or inactive'
      });
    }

    // Prepare the subscription data
    const subscriptionData = {
      school_id,
      package_id,
      start_date: start_date || new Date().toISOString().split('T')[0],
      end_date: end_date,
      total_messages: packageInfo.messages_per_term,
      status: 'active'
    };

    // If end_date is not provided, calculate it based on package type
    if (!end_date) {
      const startDate = new Date(subscriptionData.start_date);
      const endDate = new Date(startDate);

      // Set end date based on package type
      if (packageInfo.package_type === 'annual') {
        // Annual package: 12 months (1 year)
        endDate.setFullYear(startDate.getFullYear() + 1);
      } else if (packageInfo.package_type === 'termly') {
        // Termly package: 3 months (1 term)
        endDate.setMonth(startDate.getMonth() + 3);
      } else {
        // PAYG: set end date far in the future (no expiry)
        endDate.setFullYear(startDate.getFullYear() + 10);
      }

      subscriptionData.end_date = endDate.toISOString().split('T')[0];
    }

    // Create the subscription
    const [result] = await db.sequelize.query(
      `INSERT INTO messaging_subscriptions 
       (school_id, package_id, start_date, end_date, total_messages, messages_used, status)
       VALUES (?, ?, ?, ?, ?, 0, 'active')`,
      {
        replacements: [
          subscriptionData.school_id,
          subscriptionData.package_id,
          subscriptionData.start_date,
          subscriptionData.end_date,
          subscriptionData.total_messages
        ],
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    // Update the school's subscription status in school_setup
    await db.sequelize.query(
      `UPDATE school_setup 
       SET ${packageInfo.service_type}_subscription = 1 
       WHERE school_id = ?`,
      {
        replacements: [school_id],
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed to messaging package',
      data: {
        subscription_id: result.insertId,
        ...subscriptionData
      }
    });
  } catch (error) {
    console.error('Error subscribing to messaging package:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to messaging package',
      error: error.message
    });
  }
});

/**
 * Record messaging usage
 * POST /api/messaging-usage
 */
router.post('/messaging-usage', async (req, res) => {
  try {
    const { school_id, service_type, message_count = 1, subscription_id } = req.body;

    if (!school_id || !service_type) {
      return res.status(400).json({
        success: false,
        message: 'School ID and service type are required'
      });
    }

    // Get current active subscription for this service type
    let activeSubscription = null;
    if (subscription_id) {
      // Use specific subscription if provided
      const [sub] = await db.sequelize.query(
        `SELECT ms.*, mp.package_type, mp.unit_cost, mp.messages_per_term
         FROM messaging_subscriptions ms
         JOIN messaging_packages mp ON ms.package_id = mp.id
         WHERE ms.id = ? AND ms.school_id = ? AND ms.status = 'active'`,
        {
          replacements: [subscription_id, school_id],
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      activeSubscription = sub;
    } else {
      // Find any active subscription for this service type
      const subscriptions = await db.sequelize.query(
        `SELECT ms.*, mp.package_type, mp.unit_cost, mp.messages_per_term
         FROM messaging_subscriptions ms
         JOIN messaging_packages mp ON ms.package_id = mp.id
         WHERE ms.school_id = ? 
           AND mp.service_type = ?
           AND ms.status = 'active'
           AND ms.end_date >= CURDATE()
         ORDER BY ms.end_date DESC
         LIMIT 1`,
        {
          replacements: [school_id, service_type],
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      if (subscriptions.length > 0) {
        activeSubscription = subscriptions[0];
      }
    }

    // Calculate cost based on subscription type
    let cost = 0;
    const isPayg = activeSubscription && activeSubscription.package_type === 'payg';
    const isTermly = activeSubscription && activeSubscription.package_type === 'termly';
    
    if (isPayg) {
      // Pay-as-you-go: charge per message at unit rate
      cost = activeSubscription.unit_cost * message_count;
    } else {
      // For termly packages, cost is already paid upfront
      // Check if messages remaining in subscription
      if (isTermly) {
        if (activeSubscription.messages_used + message_count > activeSubscription.total_messages) {
          return res.status(400).json({
            success: false,
            message: `Exceeds remaining messages in subscription. Messages used: ${activeSubscription.messages_used}, Total: ${activeSubscription.total_messages}`
          });
        }
      }
    }

    // Record the usage
    const [usageResult] = await db.sequelize.query(
      `INSERT INTO messaging_usage 
       (school_id, subscription_id, service_type, message_count, cost)
       VALUES (?, ?, ?, ?, ?)`,
      {
        replacements: [school_id, subscription_id || null, service_type, message_count, cost],
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    // Update messages used count if using a termly package
    if (isTermly && activeSubscription) {
      await db.sequelize.query(
        `UPDATE messaging_subscriptions 
         SET messages_used = messages_used + ?
         WHERE id = ?`,
        {
          replacements: [message_count, activeSubscription.id],
          type: db.sequelize.QueryTypes.UPDATE
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Messaging usage recorded successfully',
      data: {
        usage_id: usageResult.insertId,
        cost,
        remaining_messages: isTermly 
          ? Math.max(0, activeSubscription.total_messages - (activeSubscription.messages_used + message_count))
          : 'N/A for pay-as-you-go'
      }
    });
  } catch (error) {
    console.error('Error recording messaging usage:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record messaging usage',
      error: error.message
    });
  }
});

/**
 * Get messaging history for a school
 * GET /api/messaging-history
 */
router.get('/messaging-history', async (req, res) => {
  try {
    const { school_id, limit = 50, offset = 0, channel, recipient_type, date_from, date_to } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Build dynamic query with filters
    let query = `
      SELECT 
        id,
        school_id,
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

    // Add optional filters
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

    // Count total records with filters
    let countQuery = 'SELECT COUNT(*) as count FROM messaging_history WHERE school_id = ?';
    const countReplacements = [school_id];

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

    const [countResult] = await db.sequelize.query(countQuery, {
      replacements: countReplacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: {
        records: history,
        pagination: {
          total: countResult.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(countResult.count / parseInt(limit))
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
 * Manual subscription expiry check
 * POST /api/messaging-subscription/check-expiry
 */
router.post('/messaging-subscription/check-expiry', async (req, res) => {
  try {
    const subscriptionScheduler = require('../services/subscriptionScheduler');
    await subscriptionScheduler.manualExpiryCheck();

    return res.status(200).json({
      success: true,
      message: 'Subscription expiry check completed successfully'
    });
  } catch (error) {
    console.error('Error running manual expiry check:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to run expiry check',
      error: error.message
    });
  }
});

/**
 * Get subscription expiry warnings
 * GET /api/messaging-subscription/expiry-warnings
 */
router.get('/messaging-subscription/expiry-warnings', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const subscriptionScheduler = require('../services/subscriptionScheduler');
    const warnings = await subscriptionScheduler.getExpiryWarnings(parseInt(days));

    return res.status(200).json({
      success: true,
      data: warnings,
      count: warnings.length
    });
  } catch (error) {
    console.error('Error fetching expiry warnings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expiry warnings',
      error: error.message
    });
  }
});

/**
 * Helper function to generate appropriate sender names from school names
 * This ensures compliance with SMS/Email provider policies by using standardized abbreviations
 */
function generateSenderName(schoolName, schoolId) {
  if (!schoolName || typeof schoolName !== 'string') {
    return sanitizeSenderName(schoolId, schoolId);
  }

  // Generate abbreviation from school name (e.g., "Crescent International School" -> "CIS")
  let abbreviation = '';
  const words = schoolName
    .replace(/[^\w\s]/g, ' ') // Replace special characters with spaces
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 0); // Remove empty strings
  
  // Take first letter of first 3 words to form abbreviation
  for (let i = 0; i < Math.min(3, words.length); i++) {
    const word = words[i];
    if (word.length > 0) {
      abbreviation += word.charAt(0).toUpperCase();
    }
  }
  
  // If abbreviation is empty or too short, use a fallback
  if (!abbreviation || abbreviation.length < 2) {
    return sanitizeSenderName(schoolId, schoolId);
  }
  
  // Limit to 10 characters maximum as required by most providers
  return abbreviation.substring(0, 10);
}

/**
 * Helper function to sanitize sender names (removes special chars, limits length)
 */
function sanitizeSenderName(name, schoolId) {
  // Clean and limit the name to appropriate length for providers
  let cleanedName = name
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .trim()
    .substring(0, 10); // Limit length as required by most providers
  
  // If after cleaning it's empty, use branded fallback
  if (!cleanedName || cleanedName.length < 2) {
    return 'EliteEdTech'.substring(0, 10);
  }
  
  return cleanedName;
}

/**
 * Helper function to normalize sender names to comply with SMS/Email provider policies
 * This function ensures names are not numeric-only and meet character requirements
 */
function normalizeSenderName(rawName, schoolId, schoolName) {
  // If school name is provided, generate abbreviation from it instead of using rawName
  if (schoolName && typeof schoolName === 'string' && schoolName.trim()) {
    return generateSenderName(schoolName, schoolId);
  }
  
  // Check if the name is numeric-only (which violates provider policies)
  if (/^\d+$/.test(rawName.trim())) {
    // Generate from school name if available, otherwise use school ID
    return generateSenderName(schoolName, schoolId);
  }
  
  // If rawName is not numeric, try to generate from school name
  return generateSenderName(schoolName, schoolId);
}

/**
 * Send bulk emails
 * POST /api/send-email
 */
router.post('/send-email', async (req, res) => {
  try {
    const { recipients, subject, message, school_id } = req.body;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipients array is required and must not be empty'
      });
    }

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Validate each recipient has required fields
    for (const recipient of recipients) {
      if (!recipient.email) {
        return res.status(400).json({
          success: false,
          message: `Email address is required for recipient: ${recipient.name || 'Unknown'}`
        });
      }
    }

    // Get branch_id from user context or headers
    const branch_id = req.user?.branch_id || req.headers['x-branch-id'];
    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    // Check if school has email subscription with auto-enable fallback
    let [school] = await db.sequelize.query(
      'SELECT email_subscription, short_name, school_name FROM school_setup WHERE school_id = ?',
      { replacements: [school_id], type: db.sequelize.QueryTypes.SELECT }
    );

    if (!school) {
      return res.status(400).json({
        success: false,
        message: 'School not found'
      });
    }

    // Auto-enable email subscription if not active (email is usually free)
    if (!school.email_subscription) {
      try {
        await db.sequelize.query(
          'UPDATE school_setup SET email_subscription = 1 WHERE school_id = ?',
          { replacements: [school_id] }
        );
        school.email_subscription = 1;
        console.log(`✅ Auto-enabled email subscription for school ${school_id}`);
      } catch (enableError) {
        console.error('Failed to auto-enable email subscription:', enableError);
        return res.status(400).json({
          success: false,
          message: 'School does not have active email subscription. Please contact administrator.'
        });
      }
    }

    // Use email service to send bulk emails via queue with retry logic
    // Generate sender name from school name to ensure compliance with provider policies
    const sender_name = normalizeSenderName(school.short_name, school.school_id, school.school_name);

    const emailService = require('../services/emailService');
    let result;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        result = await emailService.sendBulkEmail({
          recipients,
          subject,
          message,
          sender_name,
          campaign_id: `BULK_EMAIL_${Date.now()}_${retryCount}`
        });

        if (result.success) {
          break; // Success, exit retry loop
        }
      } catch (emailError) {
        console.error(`Email send attempt ${retryCount + 1} failed:`, emailError);
        
        if (retryCount === maxRetries) {
          return res.status(500).json({
            success: false,
            message: 'Failed to send email after multiple attempts. Please try again later.',
            error: emailError.message
          });
        }
      }
      
      retryCount++;
      if (retryCount <= maxRetries) {
        console.log(`Retrying email send (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive delay
      }
    }

    // Record messaging history
    if (result.success) {
      await db.sequelize.query(
        `INSERT INTO messaging_history 
         (school_id, branch_id, sender_id, sender_type, recipient_type, channel, message_text, message_subject, status, cost, recipients_count, message_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            school_id,
            branch_id, // branch_id
            req.user?.user_id || req.user?.id || 'system', // sender_id
            req.user?.user_type || 'system', // sender_type
            'mixed', // recipient_type (since we're sending to multiple/mixed recipients)
            'email', // channel
            message, // message_text
            subject, // message_subject
            'queued', // status (messaging system will update this to 'sent' or 'failed' based on result)
            0, // cost (for now, assuming emails don't have cost)
            recipients.length, // recipients_count
            'bulk' // message_type
          ],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    }

    return res.status(200).json({
      success: result.success,
      message: result.message,
      job_id: result.job_id,
      recipients_count: recipients.length,
      error: result.error
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

module.exports = router;
