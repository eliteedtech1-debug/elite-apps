require('dotenv').config();
const { Worker } = require('bullmq');
const axios = require('axios');
const { connection, SMS_JOB_TYPES } = require('./smsQueue');
const db = require('../models');

/**
 * Normalize phone number to international format (234...)
 * 
 * Handles various formats:
 * - 07070784184 → 2347070784184
 * - +2347070784184 → 2347070784184
 * - 2347070784184 → 2347070784184 (no change)
 *
 * @param {string} phone - Phone number in any format
 * @param {string} countryCode - Default country code (default: 234 for Nigeria)
 * @returns {string} Normalized phone number
 */
function normalizePhoneNumber(phone, countryCode = '234') {
  if (!phone) return null;

  // Convert to string and remove all spaces, dashes, parentheses
  let normalized = String(phone).replace(/[\s\-\(\)]/g, '');

  // Remove leading + sign if present
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }

  // If starts with 0, replace with country code
  if (normalized.startsWith('0')) {
    normalized = countryCode + normalized.substring(1);
  }

  // If doesn't start with country code, prepend it
  if (!normalized.startsWith(countryCode)) {
    normalized = countryCode + normalized;
  }

  // Validate length (Nigerian numbers should be 13 digits: 234 + 10 digits)
  if (normalized.length !== 13) {
    console.warn(`⚠️ Invalid phone number length: ${normalized} (expected 13 digits)`);
  }

  return normalized;
}

// Function to send SMS via eBulkSMS API
const sendSms = async (message, recipients, sender, dndsender = 1, jobId) => {
  try {
    // Get credentials from environment variables
    const EBULKSMS_USERNAME = process.env.EBULKSMS_USERNAME;
    const EBULKSMS_API_KEY = process.env.EBULKSMS_API_KEY;

    // Validate environment credentials
    if (!EBULKSMS_USERNAME || !EBULKSMS_API_KEY) {
      console.error("❌ eBulkSMS credentials not configured in .env file");
      console.error("💡 Please add EBULKSMS_USERNAME and EBULKSMS_API_KEY to your .env file");
      throw new Error("SMS service not configured. Please contact administrator.");
    }

    // Validate request payload
    if (!message || !recipients) {
      throw new Error("Invalid request payload. Missing message or recipients.");
    }

    // Transform recipients format if needed
    // Expected format: recipients = [{msidn: "234..."}, ...]
    // EBulkSMS expects: recipients = {gsm: [{msidn: "234...", msgid: "..."}, ...]}
    let formattedRecipients;

    if (Array.isArray(recipients)) {
      // Input format - transform to EBulkSMS format
      if (recipients.length === 0) {
        throw new Error("No recipients specified");
      }

      // Normalize phone numbers and filter out invalid ones
      const normalizedRecipients = [];
      const invalidNumbers = [];

      recipients.forEach((recipient, index) => {
        const rawPhone = typeof recipient === 'object' ? (recipient.msidn || recipient.phone || recipient) : recipient;
        if (!rawPhone) {
          invalidNumbers.push(`Recipient ${index + 1}: Missing phone number`);
          return;
        }

        const normalizedPhone = normalizePhoneNumber(rawPhone);
        if (!normalizedPhone) {
          invalidNumbers.push(`Recipient ${index + 1}: Invalid phone number ${rawPhone}`);
          return;
        }

        normalizedRecipients.push({
          msidn: normalizedPhone,
          msgid: recipient.msgid || `msg_${Date.now()}_${index}`,
          name: recipient.name || 'Unknown',
          id: recipient.id || null
        });
      });

      // If there are invalid numbers, warn but continue with valid ones
      if (invalidNumbers.length > 0) {
        console.warn(`⚠️ Skipped ${invalidNumbers.length} invalid phone number(s):`);
        invalidNumbers.forEach(msg => console.warn(`   - ${msg}`));
      }

      if (normalizedRecipients.length === 0) {
        throw new Error("No valid phone numbers found");
      }

      formattedRecipients = {
        gsm: normalizedRecipients
      };

      console.log(`✅ Normalized ${normalizedRecipients.length} phone number(s) for job ${jobId}`);
    } else if (recipients.gsm && Array.isArray(recipients.gsm)) {
      // Already in EBulkSMS format - still normalize the numbers
      if (recipients.gsm.length === 0) {
        throw new Error("No recipients specified");
      }

      const normalizedRecipients = recipients.gsm.map((recipient, index) => ({
        msidn: normalizePhoneNumber(recipient.msidn || recipient.msisdn),
        msgid: recipient.msgid || `msg_${Date.now()}_${index}`,
        name: recipient.name || 'Unknown',
        id: recipient.id || null
      })).filter(r => r.msidn); // Filter out null values

      formattedRecipients = {
        gsm: normalizedRecipients
      };
    } else {
      throw new Error("Invalid recipients format. Expected array or {gsm: []} object");
    }

    console.log(`📱 Sending SMS to ${formattedRecipients.gsm.length} recipient(s) for job ${jobId} via eBulkSMS...`);

    // Check if message contains Arabic characters
    const hasArabicChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(message);

    // Build SMS payload with credentials from .env
    const smsPayload = {
      SMS: {
        auth: {
          username: EBULKSMS_USERNAME,
          apikey: EBULKSMS_API_KEY,
        },
        message: {
          sender: sender,
          messagetext: message,
          flash: "0", // Default to no flash
          // Set unicode parameter for Arabic text (1 for unicode, 0 for standard GSM)
          unicode: hasArabicChars ? "1" : "0"
        },
        recipients: formattedRecipients,
        dndsender: dndsender,
      },
    };

    // Forward request to eBulkSMS API
    const ebulksmsResponse = await axios.post(
      "https://api.ebulksms.com/sendsms.json",
      smsPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    // Parse eBulkSMS response
    const responseData = ebulksmsResponse.data;

    if (responseData.response && responseData.response.status === "SUCCESS") {
      console.log(`✅ SMS sent successfully for job ${jobId}! Total sent: ${responseData.response.totalsent}, Cost: ${responseData.response.cost} units`);
      
      return {
        success: true,
        totalSent: responseData.response.totalsent,
        cost: responseData.response.cost,
        status: responseData.response.status
      };
    } else {
      // eBulkSMS returned an error status
      const errorStatus = responseData.response ? responseData.response.status : "UNKNOWN_ERROR";
      console.error(`❌ eBulkSMS Error for job ${jobId}: ${errorStatus}`);
      
      throw new Error(`SMS sending failed: ${errorStatus}`);
    }

  } catch (error) {
    console.error(`❌ Error sending SMS for job ${jobId}:`, error.message);

    // Handle axios errors
    if (error.response) {
      // eBulkSMS API returned an error response
      throw new Error(`eBulkSMS API Error: ${error.response.data || error.message}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error("SMS service is currently unavailable. Please try again later.");
    } else {
      // Something else happened
      throw error;
    }
  }
};

// Process SMS jobs
const processSmsJob = async (job) => {
  const { type, ...data } = job.data;

  console.log(`🔄 Processing SMS job ${job.id} of type: ${type}`);

  try {
    // Handle different job types
    switch (type) {
      case SMS_JOB_TYPES.SINGLE_SMS:
        return await processSingleSmsJob(job, data);

      case SMS_JOB_TYPES.BULK_SMS:
        return await processBulkSmsJob(job, data);

      case SMS_JOB_TYPES.NOTIFICATION_SMS:
        return await processNotificationSmsJob(job, data);

      default:
        throw new Error(`Unknown SMS job type: ${type}`);
    }
  } catch (error) {
    console.log(`❌ SMS job ${job.id} failed:`, {
      type,
      error: error.message
    });

    // Add error context to job
    await job.log(`Error: ${error.message}`);

    // Throw error to trigger retry logic
    throw error;
  }
};

// Process single SMS job
const processSingleSmsJob = async (job, data) => {
  const { to, message, sender, dndsender } = data;

  console.log(`📱 Processing single SMS job ${job.id}:`, {
    to,
    message: message.substring(0, 50) + '...',
    sender
  });

  // Check subscription and update usage before sending
  const userId = data.sender_id || 'system';
  const schoolId = data.school_id || 'system';
  const messageCount = 1;

  let activeSubscription = null;
  let costPerMessage = data.cost_per_message || 0;

  try {
    const subscriptions = await db.sequelize.query(
      `SELECT ms.*, mp.package_type, mp.unit_cost, mp.messages_per_term
       FROM messaging_subscriptions ms
       JOIN messaging_packages mp ON ms.package_id = mp.id
       WHERE ms.school_id = ?
         AND mp.service_type = 'sms'
         AND ms.status = 'active'
         AND ms.end_date >= CURDATE()
       ORDER BY ms.end_date DESC
       LIMIT 1`,
      {
        replacements: [schoolId],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (subscriptions.length > 0) {
      activeSubscription = subscriptions[0];

      // Check if this is a termly package and if we have enough messages
      if (activeSubscription.package_type === 'termly') {
        const remainingMessages = activeSubscription.total_messages - activeSubscription.messages_used;
        if (remainingMessages < messageCount) {
          throw new Error(`Insufficient messages in subscription. Remaining: ${remainingMessages}, Needed: ${messageCount}`);
        }
        costPerMessage = 0; // Cost already paid upfront for termly packages
      } else if (activeSubscription.package_type === 'payg') {
        // For pay-as-you-go, use the cost from the subscription
        costPerMessage = parseFloat(activeSubscription.unit_cost) || 0;
      }
    } else {
      // Allow password reset SMS even without subscription (critical system function)
      if (data.message && data.message.includes('password reset OTP')) {
        console.log('⚠️ Bypassing subscription check for password reset SMS');
        costPerMessage = 0;
      } else {
        throw new Error('No active SMS subscription found');
      }
    }
  } catch (subError) {
    console.error('⚠️ Error checking subscription:', subError.message);
    throw subError; // Re-throw to fail the job
  }

  // Send SMS
  const result = await sendSms(message, [{ msidn: to }], sender, dndsender, job.id);

  // Update subscription usage counter
  if (activeSubscription && activeSubscription.package_type === 'termly') {
    // For termly packages, increment messages_used counter
    await db.sequelize.query(
      `UPDATE messaging_subscriptions
       SET messages_used = messages_used + ?
       WHERE id = ?`,
      {
        replacements: [messageCount, activeSubscription.id],
        type: db.sequelize.QueryTypes.UPDATE
      }
    );
    console.log(`✅ Updated subscription usage: +${messageCount} messages (Subscription ID: ${activeSubscription.id})`);
  }

  // Record usage in messaging_usage table for both termly and PAYG
  const totalCost = costPerMessage * messageCount;
  if (activeSubscription) {
    await db.sequelize.query(
      `INSERT INTO messaging_usage
       (school_id, subscription_id, service_type, message_count, cost)
       VALUES (?, ?, 'sms', ?, ?)`,
      {
        replacements: [schoolId, activeSubscription.id, messageCount, totalCost],
        type: db.sequelize.QueryTypes.INSERT
      }
    );
  }

  // Update job progress
  await job.updateProgress(100);

  // Save to messaging_history table for tracking
  try {
    const school_id = data.school_id || 'system';
    const branch_id = data.branch_id || 'unknown';
    const sender_id = data.sender_id || 'system';

    // Extract recipient details
    const normalizedPhone = normalizePhoneNumber(to);
    const recipientName = normalizedPhone ? normalizedPhone.substring(4, 7) + '***' : 'Unknown';

    await db.sequelize.query(
      `INSERT INTO messaging_history
       (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, recipient_name,
        recipient_identifier, channel, message_type, recipients_count, message_text, cost, status, created_at)
       VALUES (?, ?, ?, 'admin', 'mixed', ?, ?, ?, 'sms', 'single', 1, ?, ?, 'sent', NOW())`,
      {
        replacements: [
          school_id,
          branch_id,
          sender_id,
          data.recipient_id || 'unknown', // recipient_id
          recipientName, // recipient_name
          normalizedPhone, // recipient_identifier (phone number)
          message, // message_text
          costPerMessage // cost
        ],
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    console.log(`✅ Saved single SMS history for ${normalizedPhone}`);
  } catch (historyError) {
    console.error('⚠️ Error saving SMS message history:', historyError);
    // Continue even if history saving fails
  }

  // Log success
  console.log(`✅ Single SMS job ${job.id} completed successfully:`, {
    type: SMS_JOB_TYPES.SINGLE_SMS,
    to,
    totalSent: result.totalSent
  });

  return {
    success: true,
    type: SMS_JOB_TYPES.SINGLE_SMS,
    recipient: to,
    totalSent: result.totalSent,
    timestamp: new Date().toISOString()
  };
};

// Process bulk SMS job
const processBulkSmsJob = async (job, data) => {
  const { recipients, message, sender, campaign_id, dndsender } = data;

  console.log(`📱 Processing bulk SMS job ${job.id}:`, {
    recipients_count: recipients.length,
    message: message.substring(0, 50) + '...',
    sender,
    campaign_id
  });

  // Check subscription and update usage before sending
  const userId = data.sender_id || 'system';
  const schoolId = data.school_id || 'system';
  const messageCount = Array.isArray(recipients) ? recipients.length : (recipients.gsm ? recipients.gsm.length : 0);

  let activeSubscription = null;
  let costPerMessage = data.cost_per_message || 0;

  try {
    const subscriptions = await db.sequelize.query(
      `SELECT ms.*, mp.package_type, mp.unit_cost, mp.messages_per_term
       FROM messaging_subscriptions ms
       JOIN messaging_packages mp ON ms.package_id = mp.id
       WHERE ms.school_id = ?
         AND mp.service_type = 'sms'
         AND ms.status = 'active'
         AND ms.end_date >= CURDATE()
       ORDER BY ms.end_date DESC
       LIMIT 1`,
      {
        replacements: [schoolId],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (subscriptions.length > 0) {
      activeSubscription = subscriptions[0];

      // Check if this is a termly package and if we have enough messages
      if (activeSubscription.package_type === 'termly') {
        const remainingMessages = activeSubscription.total_messages - activeSubscription.messages_used;
        if (remainingMessages < messageCount) {
          throw new Error(`Insufficient messages in subscription. Remaining: ${remainingMessages}, Needed: ${messageCount}`);
        }
        costPerMessage = 0; // Cost already paid upfront for termly packages
      } else if (activeSubscription.package_type === 'payg') {
        // For pay-as-you-go, use the cost from the subscription
        costPerMessage = parseFloat(activeSubscription.unit_cost) || 0;
      }
    } else {
      // Allow password reset SMS even without subscription (critical system function)
      if (data.message && data.message.includes('password reset OTP')) {
        console.log('⚠️ Bypassing subscription check for password reset SMS');
        costPerMessage = 0;
      } else {
        throw new Error('No active SMS subscription found');
      }
    }
  } catch (subError) {
    console.error('⚠️ Error checking subscription:', subError.message);
    throw subError; // Re-throw to fail the job
  }

  // Send SMS to all recipients
  const result = await sendSms(message, recipients, sender, dndsender, job.id);

  // Update subscription usage counter
  if (activeSubscription && activeSubscription.package_type === 'termly') {
    // For termly packages, increment messages_used counter
    await db.sequelize.query(
      `UPDATE messaging_subscriptions
       SET messages_used = messages_used + ?
       WHERE id = ?`,
      {
        replacements: [messageCount, activeSubscription.id],
        type: db.sequelize.QueryTypes.UPDATE
      }
    );
    console.log(`✅ Updated subscription usage: +${messageCount} messages (Subscription ID: ${activeSubscription.id})`);
  }

  // Record usage in messaging_usage table for both termly and PAYG
  const totalCost = costPerMessage * result.totalSent;
  if (activeSubscription) {
    await db.sequelize.query(
      `INSERT INTO messaging_usage
       (school_id, subscription_id, service_type, message_count, cost)
       VALUES (?, ?, 'sms', ?, ?)`,
      {
        replacements: [schoolId, activeSubscription.id, result.totalSent, totalCost],
        type: db.sequelize.QueryTypes.INSERT
      }
    );
  }

  // Update job progress
  await job.updateProgress(100);

  // Save to messaging_history table for unified tracking
  try {
    const school_id = data.school_id || 'system';
    const branch_id = data.branch_id || 'unknown';
    const sender_id = data.sender_id || 'system';
    const totalCostForMessage = costPerMessage * result.totalSent;

    // Build recipients list from input
    const recipientsList = recipients.map(recipient => {
      if (typeof recipient === 'object') {
        return {
          phone: normalizePhoneNumber(recipient.msidn || recipient.phone || recipient),
          name: recipient.name || 'Unknown',
          id: recipient.id || null,
          msgid: recipient.msgid || `msg_${Date.now()}_${Math.random()}`
        };
      } else {
        // If recipient is just a phone number
        return {
          phone: normalizePhoneNumber(recipient),
          name: normalizePhoneNumber(recipient).substring(4, 7) + '***', // masked name
          id: null,
          msgid: `msg_${Date.now()}_${Math.random()}`
        };
      }
    });

    const messageType = recipientsList.length > 1 ? 'bulk' : 'single';

    if (messageType === 'single') {
      // Single SMS - use individual fields
      await db.sequelize.query(
        `INSERT INTO messaging_history
         (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, recipient_name,
          recipient_identifier, channel, message_type, recipients_count, message_text, cost, status, created_at)
         VALUES (?, ?, ?, 'admin', 'mixed', ?, ?, ?, 'sms', 'single', 1, ?, ?, 'sent', NOW())`,
        {
          replacements: [
            school_id,
            branch_id,
            sender_id,
            recipientsList[0].id || 'unknown', // recipient_id
            recipientsList[0].name, // recipient_name
            recipientsList[0].phone, // recipient_identifier (phone number)
            message, // message_text
            costPerMessage // cost
          ],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    } else {
      // Bulk SMS - save 1 record with recipients list
      await db.sequelize.query(
        `INSERT INTO messaging_history
         (school_id, branch_id, sender_id, sender_type, recipient_type, channel, message_type,
          recipients_count, recipients_list, message_text, cost, status, created_at)
         VALUES (?, ?, ?, 'admin', 'mixed', 'sms', 'bulk', ?, ?, ?, ?, 'sent', NOW())`,
        {
          replacements: [
            school_id,
            branch_id,
            sender_id,
            result.totalSent, // Use actual sent count
            JSON.stringify(recipientsList), // recipients_list as JSON
            message, // message_text
            totalCostForMessage // total cost for all recipients
          ],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    }

    console.log(`✅ Saved bulk SMS history: ${messageType} message with ${result.totalSent} recipient(s)`);
  } catch (historyError) {
    console.error('⚠️ Error saving SMS message history:', historyError);
    // Continue even if history saving fails
  }

  // Log success
  console.log(`✅ Bulk SMS job ${job.id} completed successfully:`, {
    type: SMS_JOB_TYPES.BULK_SMS,
    campaign_id,
    totalSent: result.totalSent
  });

  return {
    success: true,
    type: SMS_JOB_TYPES.BULK_SMS,
    campaign_id,
    totalSent: result.totalSent,
    timestamp: new Date().toISOString()
  };
};

// Process notification SMS job
const processNotificationSmsJob = async (job, data) => {
  const { to, message, sender, dndsender } = data;

  console.log(`📱 Processing notification SMS job ${job.id}:`, {
    to,
    message: message.substring(0, 50) + '...',
    sender
  });

  // Check subscription and update usage before sending
  const userId = data.sender_id || 'system';
  const schoolId = data.school_id || 'system';
  const messageCount = 1;

  let activeSubscription = null;
  let costPerMessage = data.cost_per_message || 0;

  try {
    const subscriptions = await db.sequelize.query(
      `SELECT ms.*, mp.package_type, mp.unit_cost, mp.messages_per_term
       FROM messaging_subscriptions ms
       JOIN messaging_packages mp ON ms.package_id = mp.id
       WHERE ms.school_id = ?
         AND mp.service_type = 'sms'
         AND ms.status = 'active'
         AND ms.end_date >= CURDATE()
       ORDER BY ms.end_date DESC
       LIMIT 1`,
      {
        replacements: [schoolId],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (subscriptions.length > 0) {
      activeSubscription = subscriptions[0];

      // Check if this is a termly package and if we have enough messages
      if (activeSubscription.package_type === 'termly') {
        const remainingMessages = activeSubscription.total_messages - activeSubscription.messages_used;
        if (remainingMessages < messageCount) {
          throw new Error(`Insufficient messages in subscription. Remaining: ${remainingMessages}, Needed: ${messageCount}`);
        }
        costPerMessage = 0; // Cost already paid upfront for termly packages
      } else if (activeSubscription.package_type === 'payg') {
        // For pay-as-you-go, use the cost from the subscription
        costPerMessage = parseFloat(activeSubscription.unit_cost) || 0;
      }
    } else {
      // Allow password reset SMS even without subscription (critical system function)
      if (data.message && data.message.includes('password reset OTP')) {
        console.log('⚠️ Bypassing subscription check for password reset SMS');
        costPerMessage = 0;
      } else {
        throw new Error('No active SMS subscription found');
      }
    }
  } catch (subError) {
    console.error('⚠️ Error checking subscription:', subError.message);
    throw subError; // Re-throw to fail the job
  }

  // Send SMS
  const result = await sendSms(message, [{ msidn: to }], sender, dndsender, job.id);

  // Update subscription usage counter
  if (activeSubscription && activeSubscription.package_type === 'termly') {
    // For termly packages, increment messages_used counter
    await db.sequelize.query(
      `UPDATE messaging_subscriptions
       SET messages_used = messages_used + ?
       WHERE id = ?`,
      {
        replacements: [messageCount, activeSubscription.id],
        type: db.sequelize.QueryTypes.UPDATE
      }
    );
    console.log(`✅ Updated subscription usage: +${messageCount} messages (Subscription ID: ${activeSubscription.id})`);
  }

  // Record usage in messaging_usage table for both termly and PAYG
  const totalCost = costPerMessage * messageCount;
  if (activeSubscription) {
    await db.sequelize.query(
      `INSERT INTO messaging_usage
       (school_id, subscription_id, service_type, message_count, cost)
       VALUES (?, ?, 'sms', ?, ?)`,
      {
        replacements: [schoolId, activeSubscription.id, messageCount, totalCost],
        type: db.sequelize.QueryTypes.INSERT
      }
    );
  }

  // Update job progress
  await job.updateProgress(100);

  // Save to messaging_history table for tracking
  try {
    const school_id = data.school_id || 'system';
    const branch_id = data.branch_id || 'unknown';
    const sender_id = data.sender_id || 'system';

    // Extract recipient details
    const normalizedPhone = normalizePhoneNumber(to);
    const recipientName = normalizedPhone ? normalizedPhone.substring(4, 7) + '***' : 'Unknown';

    await db.sequelize.query(
      `INSERT INTO messaging_history
       (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, recipient_name,
        recipient_identifier, channel, message_type, recipients_count, message_text, cost, status, created_at)
       VALUES (?, ?, ?, 'admin', 'mixed', ?, ?, ?, 'sms', 'single', 1, ?, ?, 'sent', NOW())`,
      {
        replacements: [
          school_id,
          branch_id,
          sender_id,
          data.recipient_id || 'unknown', // recipient_id
          recipientName, // recipient_name
          normalizedPhone, // recipient_identifier (phone number)
          message, // message_text
          costPerMessage // cost
        ],
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    console.log(`✅ Saved notification SMS history for ${normalizedPhone}`);
  } catch (historyError) {
    console.error('⚠️ Error saving SMS message history:', historyError);
    // Continue even if history saving fails
  }

  // Log success
  console.log(`✅ Notification SMS job ${job.id} completed successfully:`, {
    type: SMS_JOB_TYPES.NOTIFICATION_SMS,
    to,
    totalSent: result.totalSent
  });

  return {
    success: true,
    type: SMS_JOB_TYPES.NOTIFICATION_SMS,
    recipient: to,
    totalSent: result.totalSent,
    timestamp: new Date().toISOString()
  };
};

// Create SMS worker
const smsWorker = new Worker('sms-queue', processSmsJob, {
  connection,
  concurrency: 5, // Process up to 5 jobs concurrently
  removeOnComplete: 100,
  removeOnFail: 50,
  settings: {
    stalledInterval: 30000,    // Check for stalled jobs every 30 seconds
    maxStalledCount: 1         // Max number of times a job can be stalled
  }
});

// Worker event listeners
smsWorker.on('ready', () => {
  console.log('🚀 SMS worker is ready and waiting for jobs');
});

smsWorker.on('active', (job) => {
  console.log(`⚡ SMS worker started processing job ${job.id}`);
});

smsWorker.on('completed', (job, result) => {
  console.log(`✅ SMS worker completed job ${job.id}:`, {
    type: result.type,
    recipient: result.recipient || result.campaign_id || 'bulk',
    totalSent: result.totalSent
  });
});

smsWorker.on('failed', (job, err) => {
  console.log(`❌ SMS worker failed job ${job.id}:`, {
    error: err.message,
    attemptsMade: job.attemptsMade,
    attemptsTotal: job.opts.attempts
  });
});

smsWorker.on('stalled', (job) => {
  console.log(`⚠️ SMS worker job ${job.id} stalled`);
});

smsWorker.on('error', (err) => {
  console.log('❌ SMS worker error:', err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📱 Shutting down SMS worker...');
  await smsWorker.close();
  console.log('📱 SMS worker shut down complete');
});

process.on('SIGINT', async () => {
  console.log('📱 Shutting down SMS worker...');
  await smsWorker.close();
  console.log('📱 SMS worker shut down complete');
  process.exit(0);
});

module.exports = {
  smsWorker,
  processSmsJob
};
// File remotely deleted