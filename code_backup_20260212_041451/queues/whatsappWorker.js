const { Worker } = require('bullmq');
const { connection, WHATSAPP_JOB_TYPES } = require('./whatsappQueue');
const whatsappService = require('../services/baileysWhatsappService');
const db = require('../models');

/**
 * Auto-reconnect WhatsApp if not connected
 */
const ensureWhatsAppConnection = async (school_id) => {
  console.log(`🔄 Ensuring WhatsApp connection for school ${school_id}...`);
  
  try {
    // Get school details
    const [school] = await db.sequelize.query(
      'SELECT school_name, short_name FROM school_setup WHERE school_id = ?',
      { replacements: [school_id], type: db.sequelize.QueryTypes.SELECT }
    );
    
    const shortName = school?.short_name || 'SCHOOL';
    
    // Always reconnect to ensure fresh connection .
    // edit
    await whatsappService.initializeClient(school_id, shortName, true);
    
    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify connection
    const status = await whatsappService.getClientStatus(school_id);
    const isConnected = status === 'CONNECTED';
    
    if (!isConnected) {
      throw new Error(`Connection failed, status: ${status}`);
    }
    
    console.log(`✅ WhatsApp connected for school ${school_id}`);
    return true;
  } catch (error) {
    console.error(`❌ Connection failed for ${school_id}:`, error.message);
    throw new Error(`WhatsApp not connected for school ${school_id}. Please connect first.`);
  }
};

/**
 * Process WhatsApp jobs
 */
const processWhatsAppJob = async (job) => {
  const { type, ...data } = job.data;

  console.log(`🔄 Processing WhatsApp job ${job.id} of type: ${type}`);

  try {
    // Handle different job types
    switch (type) {
      case WHATSAPP_JOB_TYPES.SINGLE_MESSAGE:
        return await processSingleMessageJob(job, data);

      case WHATSAPP_JOB_TYPES.BULK_MESSAGE:
        return await processBulkMessageJob(job, data);

      case WHATSAPP_JOB_TYPES.MESSAGE_WITH_PDF:
        return await processMessageWithPDFJob(job, data);

      default:
        throw new Error(`Unknown WhatsApp job type: ${type}`);
    }
  } catch (error) {
    console.log(`❌ WhatsApp job ${job.id} failed:`, {
      type,
      error: error.message
    });

    // Add error context to job
    await job.log(`Error: ${error.message}`);

    // Throw error to trigger retry logic
    throw error;
  }
};

/**
 * Process single WhatsApp message job
 */
const processSingleMessageJob = async (job, data) => {
  const { phone, message, school_id } = data;

  console.log(`💬 Processing single WhatsApp message job ${job.id}:`, {
    phone,
    school_id,
    message: message.substring(0, 50) + '...'
  });

  // Check if WhatsApp is connected for this school (with auto-reconnect)
  await ensureWhatsAppConnection(school_id);

  // Check subscription and update usage before sending
  const userId = data.user_id || 'system';
  const messageCount = 1;

  let activeSubscription = null;
  let costPerMessage = data.cost_per_message || 0;

  try {
    const subscriptions = await db.sequelize.query(
      `SELECT ms.*, mp.package_type, mp.unit_cost, mp.messages_per_term
       FROM messaging_subscriptions ms
       JOIN messaging_packages mp ON ms.package_id = mp.id
       WHERE ms.school_id = ?
         AND mp.service_type = 'whatsapp'
         AND ms.status = 'active'
         AND ms.end_date >= CURDATE()
       ORDER BY ms.end_date DESC
       LIMIT 1`,
      {
        replacements: [school_id],
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
      throw new Error('No active WhatsApp subscription found');
    }
  } catch (subError) {
    console.error('⚠️ Error checking subscription:', subError.message);
    throw subError; // Re-throw to fail the job
  }

  // Send WhatsApp message
  const result = await whatsappService.sendMessage(school_id, phone, message);

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
    console.log(`✅ Updated WhatsApp subscription usage: +${messageCount} messages (Subscription ID: ${activeSubscription.id})`);
  }

  // Record usage in messaging_usage table for both termly and PAYG
  const totalCost = costPerMessage * messageCount;
  if (activeSubscription) {
    await db.sequelize.query(
      `INSERT INTO messaging_usage
       (school_id, subscription_id, service_type, message_count, cost)
       VALUES (?, ?, 'whatsapp', ?, ?)`,
      {
        replacements: [school_id, activeSubscription.id, messageCount, totalCost],
        type: db.sequelize.QueryTypes.INSERT
      }
    );
  }

  // Update job progress
  await job.updateProgress(100);

  // Save to messaging_history table for tracking
  try {
    const school_id = data.school_id || 'system';
    const branch_id = data.metadata?.branch_id || 'unknown';
    const sender_id = data.user_id || 'system';

    await db.sequelize.query(
      `INSERT INTO messaging_history
       (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, recipient_name,
        recipient_identifier, channel, message_type, recipients_count, message_text, cost, total_cost, status, created_at)
       VALUES (?, ?, ?, 'admin', 'mixed', ?, ?, ?, 'whatsapp', 'single', 1, ?, ?, ?, 'sent', NOW())`,
      {
        replacements: [
          school_id,
          branch_id,
          sender_id,
          data.metadata?.recipient_id || 'unknown', // recipient_id
          data.metadata?.recipient_name || phone.substring(0, 7) + '...', // recipient_name
          phone, // recipient_identifier (phone number)
          message, // message_text
          costPerMessage, // cost per message
          totalCost // total cost
        ],
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    console.log(`✅ Saved single WhatsApp message history for ${phone}`);
  } catch (historyError) {
    console.error('⚠️ Error saving WhatsApp message history:', historyError);
    // Continue even if history saving fails
  }

  // Log to whatsapp_messages table as well for compatibility
  try {
    await db.whatsapp_messages.create({
      school_id: school_id,
      total_sent: 1,
      total_failed: 0,
      message_text: message,
      recipients: JSON.stringify([{ phone: phone }]),
      results: JSON.stringify(result),
      cost: costPerMessage,
      has_attachment: false,
      created_at: new Date()
    });
  } catch (dbError) {
    console.error('⚠️ Failed to log WhatsApp message to whatsapp_messages table:', dbError);
  }

  // Log success
  console.log(`✅ Single WhatsApp message job ${job.id} completed successfully:`, {
    type: WHATSAPP_JOB_TYPES.SINGLE_MESSAGE,
    phone,
    result
  });

  return {
    success: true,
    type: WHATSAPP_JOB_TYPES.SINGLE_MESSAGE,
    phone,
    result,
    timestamp: new Date().toISOString()
  };
};

/**
 * Process bulk WhatsApp message job
 */
const processBulkMessageJob = async (job, data) => {
  const { recipients, message, school_id, campaign_id } = data;

  console.log(`💬 Processing bulk WhatsApp message job ${job.id}:`, {
    recipients_count: recipients.length,
    school_id,
    campaign_id,
    message: message.substring(0, 50) + '...'
  });

  // Check if WhatsApp is connected for this school
  const isConnected = await whatsappService.isConnected(school_id);

  if (!isConnected) {
    throw new Error(`WhatsApp not connected for school ${school_id}. Please connect first.`);
  }

  // Check subscription and update usage before sending
  const userId = data.user_id || 'system';
  const messageCount = recipients.length;

  let activeSubscription = null;
  let costPerMessage = data.cost_per_message || 0;

  try {
    const subscriptions = await db.sequelize.query(
      `SELECT ms.*, mp.package_type, mp.unit_cost, mp.messages_per_term
       FROM messaging_subscriptions ms
       JOIN messaging_packages mp ON ms.package_id = mp.id
       WHERE ms.school_id = ?
         AND mp.service_type = 'whatsapp'
         AND ms.status = 'active'
         AND ms.end_date >= CURDATE()
       ORDER BY ms.end_date DESC
       LIMIT 1`,
      {
        replacements: [school_id],
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
      throw new Error('No active WhatsApp subscription found');
    }
  } catch (subError) {
    console.error('⚠️ Error checking subscription:', subError.message);
    throw subError; // Re-throw to fail the job
  }

  // Prepare recipients array for bulk sending
  const recipientsWithMessages = recipients.map(recipient => ({
    phone: recipient.phone || recipient.msisdn || recipient.msidn,
    message: message
  }));

  // Send bulk messages
  const results = await whatsappService.sendBulkMessages(school_id, recipientsWithMessages);

  // Update subscription usage counter
  if (activeSubscription && activeSubscription.package_type === 'termly') {
    // For termly packages, increment messages_used counter
    await db.sequelize.query(
      `UPDATE messaging_subscriptions
       SET messages_used = messages_used + ?
       WHERE id = ?`,
      {
        replacements: [results.totalSent, activeSubscription.id],
        type: db.sequelize.QueryTypes.UPDATE
      }
    );
    console.log(`✅ Updated WhatsApp subscription usage: +${results.totalSent} messages (Subscription ID: ${activeSubscription.id})`);
  }

  // Record usage in messaging_usage table for both termly and PAYG
  const totalCost = costPerMessage * results.totalSent;
  if (activeSubscription) {
    await db.sequelize.query(
      `INSERT INTO messaging_usage
       (school_id, subscription_id, service_type, message_count, cost)
       VALUES (?, ?, 'whatsapp', ?, ?)`,
      {
        replacements: [school_id, activeSubscription.id, results.totalSent, totalCost],
        type: db.sequelize.QueryTypes.INSERT
      }
    );
  }

  // Update job progress
  await job.updateProgress(100);

  // Save to messaging_history table for unified tracking
  try {
    const school_id = data.school_id || 'system';
    const branch_id = data.metadata?.branch_id || 'unknown';
    const sender_id = data.user_id || 'system';

    // Build recipients list from input
    const recipientsList = recipients.map(recipient => {
      const phone = recipient.phone || recipient.msisdn || recipient.msidn;
      return {
        phone: phone,
        name: recipient.name || 'Unknown',
        id: recipient.recipient_id || recipient.id || null
      };
    });

    const messageType = recipientsList.length > 1 ? 'bulk' : 'single';
    const totalCostForMessage = costPerMessage * results.totalSent;

    if (messageType === 'single') {
      // Single message - use individual fields
      await db.sequelize.query(
        `INSERT INTO messaging_history
         (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, recipient_name,
          recipient_identifier, channel, message_type, recipients_count, message_text, cost, total_cost, status, created_at)
         VALUES (?, ?, ?, 'admin', 'mixed', ?, ?, ?, 'whatsapp', 'single', 1, ?, ?, ?, 'sent', NOW())`,
        {
          replacements: [
            school_id,
            branch_id,
            sender_id,
            recipientsList[0].id || 'unknown',
            recipientsList[0].name,
            recipientsList[0].phone,
            message,
            costPerMessage,
            totalCostForMessage
          ],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    } else {
      // Bulk message - save 1 record with recipients list
      await db.sequelize.query(
        `INSERT INTO messaging_history
         (school_id, branch_id, sender_id, sender_type, recipient_type, channel, message_type,
          recipients_count, recipients_list, message_text, cost, total_cost, status, created_at)
         VALUES (?, ?, ?, 'admin', 'mixed', 'whatsapp', 'bulk', ?, ?, ?, ?, ?, 'sent', NOW())`,
        {
          replacements: [
            school_id,
            branch_id,
            sender_id,
            results.totalSent, // Use actual sent count
            JSON.stringify(recipientsList),
            message,
            totalCostForMessage, // Cost for sent messages only
            totalCostForMessage  // Total cost
          ],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    }

    console.log(`✅ Saved bulk WhatsApp message history: ${messageType} message with ${results.totalSent} recipient(s)`);
  } catch (historyError) {
    console.error('⚠️ Error saving WhatsApp message history:', historyError);
    // Continue even if history saving fails
  }

  // Log to whatsapp_messages table as well for compatibility
  try {
    await db.whatsapp_messages.create({
      school_id: school_id,
      total_sent: results.totalSent,
      total_failed: results.totalFailed,
      message_text: message,
      recipients: JSON.stringify(recipients),
      results: JSON.stringify(results),
      cost: results.totalSent * costPerMessage,
      created_at: new Date()
    });
  } catch (dbError) {
    console.error('⚠️ Failed to log bulk WhatsApp message to whatsapp_messages table:', dbError);
    // Continue even if logging fails
  }

  // Log success
  console.log(`✅ Bulk WhatsApp message job ${job.id} completed successfully:`, {
    type: WHATSAPP_JOB_TYPES.BULK_MESSAGE,
    campaign_id,
    totalSent: results.totalSent,
    totalFailed: results.totalFailed
  });

  return {
    success: true,
    type: WHATSAPP_JOB_TYPES.BULK_MESSAGE,
    campaign_id,
    results,
    timestamp: new Date().toISOString()
  };
};

/**
 * Process WhatsApp message with PDF job
 */
const processMessageWithPDFJob = async (job, data) => {
  const { phone, message, pdfBase64, filename, school_id } = data;

  console.log(`💬 Processing WhatsApp message with PDF job ${job.id}:`, {
    phone,
    school_id,
    has_pdf: !!pdfBase64,
    filename
  });

  // Ensure WhatsApp is connected (auto-reconnect if needed)
  await ensureWhatsAppConnection(school_id);

  // Check subscription and update usage before sending
  const userId = data.user_id || 'system';
  const messageCount = 1; // PDF attachment counts as 1 message

  let activeSubscription = null;
  let costPerMessage = data.cost_per_message || 0;

  try {
    const subscriptions = await db.sequelize.query(
      `SELECT ms.*, mp.package_type, mp.unit_cost, mp.messages_per_term
       FROM messaging_subscriptions ms
       JOIN messaging_packages mp ON ms.package_id = mp.id
       WHERE ms.school_id = ?
         AND mp.service_type = 'whatsapp'
         AND ms.status = 'active'
         AND ms.end_date >= CURDATE()
       ORDER BY ms.end_date DESC
       LIMIT 1`,
      {
        replacements: [school_id],
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
      throw new Error('No active WhatsApp subscription found');
    }
  } catch (subError) {
    console.error('⚠️ Error checking subscription:', subError.message);
    throw subError; // Re-throw to fail the job
  }

  // Convert base64 to buffer
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  const pdfFilename = filename || `Document_${Date.now()}.pdf`;

  if (pdfBuffer.length === 0) {
    throw new Error('PDF data is empty. Cannot send empty PDF attachment.');
  }

  // Send message with PDF
  const result = await whatsappService.sendMessageWithPDF(
    school_id,
    phone,
    message,
    pdfBuffer,
    pdfFilename
  );

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
    console.log(`✅ Updated WhatsApp subscription usage: +${messageCount} messages (Subscription ID: ${activeSubscription.id})`);
  }

  // Record usage in messaging_usage table for both termly and PAYG
  const totalCost = costPerMessage * messageCount;
  if (activeSubscription) {
    await db.sequelize.query(
      `INSERT INTO messaging_usage
       (school_id, subscription_id, service_type, message_count, cost)
       VALUES (?, ?, 'whatsapp', ?, ?)`,
      {
        replacements: [school_id, activeSubscription.id, messageCount, totalCost],
        type: db.sequelize.QueryTypes.INSERT
      }
    );
  }

  // Update job progress
  await job.updateProgress(100);

  // Save to messaging_history table for tracking
  try {
    const school_id = data.school_id || 'system';
    const branch_id = data.metadata?.branch_id || 'unknown';
    const sender_id = data.user_id || 'system';

    await db.sequelize.query(
      `INSERT INTO messaging_history
       (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, recipient_name,
        recipient_identifier, channel, message_type, recipients_count, message_text, cost, total_cost, status, has_attachment, attachment_type, created_at)
       VALUES (?, ?, ?, 'admin', 'mixed', ?, ?, ?, 'whatsapp', 'single', 1, ?, ?, ?, 'sent', 1, 'pdf', NOW())`,
      {
        replacements: [
          school_id,
          branch_id,
          sender_id,
          data.metadata?.recipient_id || 'unknown', // recipient_id
          data.metadata?.recipient_name || phone.substring(0, 7) + '...', // recipient_name
          phone, // recipient_identifier (phone number)
          message, // message_text
          costPerMessage, // cost per message
          totalCost // total cost
        ],
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    console.log(`✅ Saved WhatsApp message with PDF history for ${phone}`);
  } catch (historyError) {
    console.error('⚠️ Error saving WhatsApp message with PDF history:', historyError);
    // Continue even if history saving fails
  }

  // Log to whatsapp_messages table
  try {
    await db.sequelize.query(
      `INSERT INTO whatsapp_messages (school_id, branch_id, total_sent, total_failed, message_text, recipients, results, cost, created_by)
       VALUES (?, ?, 1, 0, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          school_id,
          data.branch_id || 'unknown',
          message,
          JSON.stringify([{ phone }]),
          JSON.stringify(result),
          costPerMessage,
          data.sender_id || 'system'
        ]
      }
    );
    console.log(`✅ Logged WhatsApp message to whatsapp_messages table`);
  } catch (logError) {
    console.error('⚠️ Failed to log to whatsapp_messages:', logError.message);
  }

  // Log success
  console.log(`✅ WhatsApp message with PDF job ${job.id} completed successfully:`, {
    type: WHATSAPP_JOB_TYPES.MESSAGE_WITH_PDF,
    phone,
    result
  });

  return {
    success: true,
    type: WHATSAPP_JOB_TYPES.MESSAGE_WITH_PDF,
    phone,
    result,
    timestamp: new Date().toISOString()
  };
};

// Create WhatsApp worker
const whatsappWorker = new Worker('whatsapp-queue', processWhatsAppJob, {
  connection,
  concurrency: 3, // Process up to 3 jobs concurrently (WhatsApp is rate-limited)
  removeOnComplete: 100,
  removeOnFail: 50,
  settings: {
    stalledInterval: 30000,    // Check for stalled jobs every 30 seconds
    maxStalledCount: 1         // Max number of times a job can be stalled
  }
});

// Worker event listeners
whatsappWorker.on('ready', () => {
  console.log('🚀 WhatsApp worker is ready and waiting for jobs');
});

whatsappWorker.on('active', (job) => {
  console.log(`⚡ WhatsApp worker started processing job ${job.id}`);
});

whatsappWorker.on('completed', (job, result) => {
  console.log(`✅ WhatsApp worker completed job ${job.id}:`, {
    type: result.type,
    phone: result.phone || result.campaign_id || 'bulk',
    totalSent: result.results?.totalSent
  });
});

whatsappWorker.on('failed', (job, err) => {
  console.log(`❌ WhatsApp worker failed job ${job.id}:`, {
    error: err.message,
    attemptsMade: job.attemptsMade,
    attemptsTotal: job.opts.attempts
  });
});

whatsappWorker.on('stalled', (job) => {
  console.log(`⚠️ WhatsApp worker job ${job.id} stalled`);
});

whatsappWorker.on('error', (err) => {
  console.log('❌ WhatsApp worker error:', err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('💬 Shutting down WhatsApp worker...');
  await whatsappWorker.close();
  console.log('💬 WhatsApp worker shut down complete');
});

process.on('SIGINT', async () => {
  console.log('💬 Shutting down WhatsApp worker...');
  await whatsappWorker.close();
  console.log('💬 WhatsApp worker shut down complete');
  process.exit(0);
});

module.exports = {
  whatsappWorker,
  processWhatsAppJob
};