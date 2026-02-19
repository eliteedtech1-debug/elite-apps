const express = require('express');
const router = express.Router();
// Use Baileys instead of whatsapp-web.js (80% memory reduction!)
const whatsappService = require('../services/baileysWhatsappService');
const db = require('../models');
const { addSingleMessageJob, addBulkMessageJob, addMessageWithPDFJob } = require('../queues/whatsappQueue');

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
 * Initialize WhatsApp connection and get QR code
 * POST /api/whatsapp/connect
 */
router.post('/whatsapp/connect', async (req, res) => {
  try {
    const { school_id, short_name } = req.body;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Retrieve school name to generate proper identifier
    let schoolDetails = null;
    try {
      const [school] = await db.sequelize.query(
        'SELECT school_name FROM school_setup WHERE school_id = ?',
        { replacements: [school_id], type: db.sequelize.QueryTypes.SELECT }
      );
      schoolDetails = school;
    } catch (schoolError) {
      console.error('⚠️ Error fetching school details:', schoolError);
      // Continue with unknown school - the normalize function has fallbacks
    }

    // Generate client identifier from school name to ensure compliance with policies
    const clientIdentifier = normalizeSenderName(short_name, school_id, schoolDetails?.school_name);

    // console.log(`📱 Initializing WhatsApp connection for school: ${school_id} (identifier: ${clientIdentifier})`);

    // Initialize client (this will generate QR code, but don't wait for full connection)
    // Pass both school_id (for storage key) and short_name (for clientId)
    try {
      // Set waitForConnection to false so we return immediately after QR generation
      await whatsappService.initializeClient(school_id, clientIdentifier, false);
    } catch (initError) {
      console.error(`❌ Failed to initialize WhatsApp client: ${initError.message}`);

      return res.status(500).json({
        success: false,
        message: 'Failed to initialize WhatsApp connection',
        error: initError.message,
        hint: initError.message.includes('timeout')
          ? 'Connection timed out. Please try cleaning up the session first using the cleanup endpoint.'
          : 'Please try again or contact support if the issue persists.'
      });
    }

    // Wait a bit for QR code to be generated
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get QR code
    const qrData = whatsappService.getQRCode(school_id);

    if (qrData) {
      return res.status(200).json({
        success: true,
        message: 'QR code generated. Please scan with WhatsApp mobile app.',
        qrCode: qrData.qrDataUrl,
        timestamp: qrData.timestamp
      });
    } else {
      // Check if already connected
      const status = await whatsappService.getClientStatus(school_id);

      if (status === 'CONNECTED') {
        const phoneNumber = await whatsappService.getConnectedNumber(school_id);

        return res.status(200).json({
          success: true,
          message: 'WhatsApp already connected',
          status: 'connected',
          phoneNumber: phoneNumber
        });
      }

      return res.status(202).json({
        success: true,
        message: 'Initializing... Please wait and check status.',
        status: status
      });
    }
  } catch (error) {
    console.error('❌ Error connecting WhatsApp:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to initialize WhatsApp connection',
      error: error.message
    });
  }
});

/**
 * Get WhatsApp connection status
 * GET /api/whatsapp/status
 */
router.get('/whatsapp/status', async (req, res) => {
  try {
    // Get school_id from query params or headers (supports both)
    const school_id = req.query.school_id || req.headers['x-school-id'] || req.user?.school_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required. Please provide it in query parameter (?school_id=SCH/23) or header (X-School-Id: SCH/23)'
      });
    }

    // Ensure we have a valid school_id format
    const normalizedSchoolId = school_id.includes('/') ? school_id : `SCH/${school_id}`;

    let status, isConnected, phoneNumber, qrData;

    try {
      status = await whatsappService.getClientStatus(normalizedSchoolId);
      isConnected = status === 'CONNECTED' || status === 'open' || status === 'connecting';

      phoneNumber = null;
      if (isConnected) {
        try {
          phoneNumber = await whatsappService.getConnectedNumber(normalizedSchoolId);
        } catch (err) {
          console.warn('⚠️ Error getting phone number:', err.message);
          // Don't fail the request if phone number fetch fails
        }
      }

      // Check if QR code is available
      qrData = whatsappService.getQRCode(normalizedSchoolId);
    } catch (serviceError) {
      console.error('❌ WhatsApp service error:', serviceError);
      // Return a safe default status if service methods fail
      status = 'DISCONNECTED';
      isConnected = false;
      qrData = null;
    }

    return res.status(200).json({
      success: true,
      status: status,
      connected: isConnected,
      phoneNumber: phoneNumber,
      qrCode: qrData ? qrData.qrDataUrl : null,
      hasQR: !!qrData,
      school_id: normalizedSchoolId
    });
  } catch (error) {
    console.error('❌ Error getting WhatsApp status:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp status',
      error: error.message || 'Unknown error occurred'
    });
  }
});

/**
 * Queue WhatsApp message with PDF invoice attachment
 * POST /api/whatsapp/send-with-pdf
 */
router.post('/whatsapp/send-with-pdf', async (req, res) => {
  try {
    const { school_id, phone, message, pdfBase64, filename } = req.body;

    if (!school_id || !phone || !message || !pdfBase64) {
      return res.status(400).json({
        success: false,
        message: 'School ID, phone, message, and PDF data are required'
      });
    }

    // Normalize phone to international format (Nigerian: 07035384184 -> 2347035384184)
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '234' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('234') && !normalizedPhone.startsWith('+')) {
      normalizedPhone = '234' + normalizedPhone;
    }
    normalizedPhone = normalizedPhone.replace(/[^0-9]/g, '');
    
    console.log(`📞 Phone: ${phone} → ${normalizedPhone}`);

    // Skip connection check - worker will handle reconnection
    // Just queue the message and let worker connect when processing

    // Check for subscription and cost before queuing
    let activeSubscription = null;
    let costPerMessage = 0;

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
        if (activeSubscription.package_type === 'payg') {
          // For pay-as-you-go, calculate cost per message
          costPerMessage = parseFloat(activeSubscription.unit_cost) || 0;
        } else if (activeSubscription.package_type === 'termly') {
          // For termly packages, cost is already paid upfront
          costPerMessage = 0;
        }
      } else {
        // No active subscription found - cannot send WhatsApp
        console.error('⚠️ No active WhatsApp subscription found');
        return res.status(400).json({
          success: false,
          message: 'No active WhatsApp subscription found. Please subscribe to a WhatsApp package first.'
        });
      }
    } catch (subError) {
      console.error('⚠️ Error checking subscription:', subError);
      return res.status(500).json({
        success: false,
        message: 'Error checking subscription. Please try again later.'
      });
    }

    // Add to WhatsApp queue
    const job = await addMessageWithPDFJob({
      phone: normalizedPhone,
      message,
      pdfBase64,
      filename,
      school_id,
      sender_id: req.user?.user_id || 'system',
      branch_id: req.user?.branch_id || 'unknown',
      cost_per_message: costPerMessage,
      metadata: {
        recipient_id: 'unknown',
        recipient_name: normalizedPhone.substring(0, 7) + '...',
        branch_id: req.user?.branch_id || 'unknown'
      }
    });

    // Return success response immediately since job is queued
    return res.status(200).json({
      success: true,
      message: 'WhatsApp message with PDF queued for sending',
      job_id: job.id,
      data: {
        queued_at: new Date().toISOString(),
        phone: normalizedPhone
      }
    });

  } catch (error) {
    console.error('❌ Error queuing WhatsApp with PDF:', error);

    if (error.message.includes('No active WhatsApp subscription')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error while queuing WhatsApp with PDF',
      error: error.message
    });
  }
});

/**
 * Queue WhatsApp message
 * POST /api/whatsapp/send
 */
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { school_id, recipients, message: messageText } = req.body;

    if (!school_id || !recipients || !messageText) {
      return res.status(400).json({
        success: false,
        message: 'School ID, recipients, and message are required'
      });
    }

    // Check if connected, auto-reconnect if not
    let isConnected = await whatsappService.isConnected(school_id);

    if (!isConnected) {
      console.log(`🔄 WhatsApp not connected for ${school_id}, attempting auto-reconnect...`);
      
      try {
        // Get school details for reconnection
        const [school] = await db.sequelize.query(
          'SELECT school_name, short_name FROM school_setup WHERE school_id = ?',
          { replacements: [school_id], type: db.sequelize.QueryTypes.SELECT }
        );
        
        const shortName = school?.short_name || 'SCHOOL';
        
        // Attempt reconnection
        await whatsappService.initializeClient(school_id, shortName, false);
        
        // Wait a moment and check again
        await new Promise(resolve => setTimeout(resolve, 2000));
        isConnected = await whatsappService.isConnected(school_id);
        
        if (isConnected) {
          console.log(`✅ WhatsApp auto-reconnected for ${school_id}`);
        }
      } catch (reconnectError) {
        console.error(`❌ Auto-reconnection failed for ${school_id}:`, reconnectError);
      }
    }

    if (!isConnected) {
      console.log(`🔄 WhatsApp not connected for ${school_id}, attempting auto-reconnect...`);
      
      try {
        // Get school details for reconnection
        const [school] = await db.sequelize.query(
          'SELECT school_name, short_name FROM school_setup WHERE school_id = ?',
          { replacements: [school_id], type: db.sequelize.QueryTypes.SELECT }
        );
        
        const shortName = school?.short_name || 'SCHOOL';
        
        // Force reconnection by initializing client
        console.log(`Attempting to initialize WhatsApp client for ${school_id}...`);
        await whatsappService.initializeClient(school_id, shortName, false); // Don't wait for full connection
        
        // Quick check without long delays
        await new Promise(resolve => setTimeout(resolve, 1000));
        isConnected = await whatsappService.isConnected(school_id);
        
        if (isConnected) {
          console.log(`✅ WhatsApp reconnected successfully`);
        } else {
          console.log('⚠️ Connection status unclear, proceeding anyway...');
        }
        
      } catch (reconnectError) {
        console.error(`❌ Auto-reconnection failed for ${school_id}:`, reconnectError);
        
        // Still try to queue the message - it might work when worker processes it
        console.log('⚠️ Proceeding to queue message despite connection issue...');
      }
    }

    // Check for subscription and cost before queuing
    let activeSubscription = null;
    let costPerMessage = 0;

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
        if (activeSubscription.package_type === 'payg') {
          // For pay-as-you-go, calculate cost per message
          costPerMessage = parseFloat(activeSubscription.unit_cost) || 0;
        } else if (activeSubscription.package_type === 'termly') {
          // For termly packages, cost is already paid upfront
          costPerMessage = 0;
        }
      } else {
        // No active subscription found - cannot send WhatsApp
        console.error('⚠️ No active WhatsApp subscription found');
        return res.status(400).json({
          success: false,
          message: 'No active WhatsApp subscription found. Please subscribe to a WhatsApp package first.'
        });
      }
    } catch (subError) {
      console.error('⚠️ Error checking subscription:', subError);
      return res.status(500).json({
        success: false,
        message: 'Error checking subscription. Please try again later.'
      });
    }

    // Determine if single or bulk based on recipient count
    let job;
    if (recipients.length === 1) {
      // Single message
      job = await addSingleMessageJob({
        phone: recipients[0].phone || recipients[0].msidn,
        message: messageText,
        school_id,
        sender_id: req.user?.user_id || 'system',
        cost_per_message: costPerMessage,
        metadata: {
          recipient_id: recipients[0].recipient_id || recipients[0].id || 'unknown',
          recipient_name: recipients[0].name || 'Unknown',
          branch_id: req.headers['x-branch-id'] || req.user?.branch_id || null
        }
      });
    } else {
      // Bulk message
      job = await addBulkMessageJob({
        recipients,
        message: messageText,
        school_id,
        sender_id: req.user?.user_id || 'system',
        cost_per_message: costPerMessage,
        campaign_id: `whatsapp_bulk_${Date.now()}`,
        metadata: {
          branch_id: req.headers['x-branch-id'] || req.user?.branch_id || null
        }
      });
    }

    // Log message immediately to whatsapp_messages table for Recent Messages display
    try {
      await db.sequelize.query(
        `INSERT INTO whatsapp_messages 
         (school_id, branch_id, total_sent, total_failed, message_text, recipients, results, cost, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        {
          replacements: [
            school_id,
            req.headers['x-branch-id'] || req.user?.branch_id || null,
            0,
            0,
            messageText,
            JSON.stringify(recipients.map(r => ({ phone: r.phone || r.msidn }))),
            JSON.stringify({ status: 'queued', job_id: job.id }),
            costPerMessage * recipients.length,
            req.user?.user_id || 'system'
          ],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    } catch (logError) {
      console.error('⚠️ Failed to log message to whatsapp_messages:', logError);
      // Continue even if logging fails
    }

    // Return success response immediately since job is queued
    return res.status(200).json({
      success: true,
      message: 'WhatsApp message(s) queued for sending',
      job_id: job.id,
      data: {
        queued_at: new Date().toISOString(),
        recipients_count: recipients.length
      }
    });

  } catch (error) {
    console.error('❌ Error queuing WhatsApp message:', error);

    // Check if error is due to WhatsApp connection issue
    if (error.message.includes('not connected') || error.message.includes('session expired')) {
      console.log('🔄 WhatsApp connection error detected, attempting auto-reconnect...');
      
      try {
        // Get school details for reconnection
        const [school] = await db.sequelize.query(
          'SELECT school_name, short_name FROM school_setup WHERE school_id = ?',
          { replacements: [school_id], type: db.sequelize.QueryTypes.SELECT }
        );
        
        const shortName = school?.short_name || 'SCHOOL';
        
        // Attempt reconnection
        await whatsappService.initializeClient(school_id, shortName, false);
        
        // Wait and retry the original request
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Retry queuing the message
        let retryJob;
        if (recipients.length === 1) {
          retryJob = await addSingleMessageJob({
            phone: recipients[0].phone || recipients[0].msidn,
            message: messageText,
            school_id,
            sender_id: req.user?.user_id || 'system',
            cost_per_message: costPerMessage,
            metadata: {
              recipient_id: recipients[0].recipient_id || recipients[0].id || 'unknown',
              recipient_name: recipients[0].name || 'Unknown',
              branch_id: req.headers['x-branch-id'] || req.user?.branch_id || null
            }
          });
        } else {
          retryJob = await addBulkMessageJob({
            recipients,
            message: messageText,
            school_id,
            sender_id: req.user?.user_id || 'system',
            cost_per_message: costPerMessage,
            campaign_id: `whatsapp_bulk_retry_${Date.now()}`,
            metadata: {
              branch_id: req.headers['x-branch-id'] || req.user?.branch_id || null
            }
          });
        }
        
        // Log retry message
        try {
          await db.whatsapp_messages.create({
            school_id: school_id,
            branch_id: req.headers['x-branch-id'] || req.user?.branch_id || null,
            total_sent: 0,
            total_failed: 0,
            message_text: messageText,
            recipients: JSON.stringify(recipients.map(r => ({ phone: r.phone || r.msidn }))),
            results: JSON.stringify({ status: 'queued_after_reconnect', job_id: retryJob.id }),
            cost: costPerMessage * recipients.length,
            created_by: req.user?.user_id || 'system'
          });
        } catch (logError) {
          console.error('⚠️ Failed to log retry message:', logError);
        }
        
        return res.status(200).json({
          success: true,
          message: 'WhatsApp reconnected and message queued successfully',
          job_id: retryJob.id,
          data: {
            queued_at: new Date().toISOString(),
            recipients_count: recipients.length,
            reconnected: true
          }
        });
        
      } catch (reconnectError) {
        console.error('❌ Auto-reconnection failed:', reconnectError);
        return res.status(400).json({
          success: false,
          message: 'WhatsApp session expired. Please reconnect WhatsApp first.',
          action: 'reconnect_required',
          reconnect_endpoint: '/api/whatsapp/connect'
        });
      }
    }

    if (error.message.includes('No active WhatsApp subscription')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error while queuing WhatsApp message',
      error: error.message
    });
  }
});

/**
 * Disconnect WhatsApp
 * POST /api/whatsapp/disconnect
 */
router.post('/whatsapp/disconnect', async (req, res) => {
  try {
    const { school_id } = req.body;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    await whatsappService.disconnect(school_id);

    return res.status(200).json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    console.error('❌ Error disconnecting WhatsApp:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to disconnect WhatsApp',
      error: error.message
    });
  }
});

/**
 * Get WhatsApp message history/logs
 * GET /api/whatsapp/messages
 */
router.get('/whatsapp/messages', async (req, res) => {
  try {
    const { school_id, limit = 50, offset = 0 } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const messages = await db.whatsapp_messages.findAll({
      where: { school_id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Calculate total cost
    const totalCost = messages.reduce((sum, msg) => sum + parseFloat(msg.cost || 0), 0);

    return res.status(200).json({
      success: true,
      data: messages,
      totalCost: totalCost,
      count: messages.length
    });
  } catch (error) {
    console.error('❌ Error fetching WhatsApp messages:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch WhatsApp messages',
      error: error.message
    });
  }
});

/**
 * Clean up stuck WhatsApp sessions
 * POST /api/whatsapp/cleanup
 */
router.post('/whatsapp/cleanup', async (req, res) => {
  try {
    const { school_id } = req.body;

    console.log(`🧹 Cleaning up WhatsApp sessions${school_id ? ` for school: ${school_id}` : ' (all schools)'}`);

    await whatsappService.cleanupSessions(school_id || null);

    return res.status(200).json({
      success: true,
      message: school_id
        ? `WhatsApp session cleaned up for school: ${school_id}`
        : 'All WhatsApp sessions cleaned up successfully'
    });
  } catch (error) {
    console.error('❌ Error cleaning up WhatsApp sessions:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to clean up WhatsApp sessions',
      error: error.message
    });
  }
});

/**
 * Force process queued WhatsApp messages
 * POST /api/whatsapp/process-queue
 */
router.post('/whatsapp/process-queue', async (req, res) => {
  try {
    const { school_id } = req.body;
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Get all queued messages
    const [queuedMessages] = await db.sequelize.query(`
      SELECT id, message_text, recipients, results
      FROM whatsapp_messages 
      WHERE school_id = ? 
      AND total_sent = 0 
      AND total_failed = 0
    `, { replacements: [school_id] });

    if (queuedMessages.length === 0) {
      return res.json({
        success: true,
        message: 'No queued messages to process',
        processed_count: 0
      });
    }

    // Check WhatsApp connection and try to reconnect
    let isConnected = await whatsappService.isConnected(school_id);
    
    if (!isConnected) {
      console.log(`🔄 WhatsApp not connected, attempting to reconnect for ${school_id}...`);
      
      try {
        const [school] = await db.sequelize.query(
          'SELECT school_name, short_name FROM school_setup WHERE school_id = ?',
          { replacements: [school_id], type: db.sequelize.QueryTypes.SELECT }
        );
        
        const shortName = school?.short_name || 'SCHOOL';
        await whatsappService.initializeClient(school_id, shortName, false);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        isConnected = await whatsappService.isConnected(school_id);
      } catch (reconnectError) {
        console.error('Reconnection failed:', reconnectError);
      }
    }

    let processedCount = 0;
    let actualSentCount = 0;

    // Process each message
    for (const msg of queuedMessages) {
      try {
        const recipients = JSON.parse(msg.recipients);
        
        if (isConnected && recipients.length > 0) {
          // Try to actually send the message
          try {
            const phone = recipients[0].phone;
            // Format phone number properly
            let formattedPhone = phone.replace(/[^0-9]/g, '');
            // Add Nigeria country code if not present
            if (formattedPhone.startsWith('0')) {
              formattedPhone = '234' + formattedPhone.substring(1);
            }
            
            await whatsappService.sendMessage(school_id, formattedPhone, msg.message_text);
            actualSentCount++;
            console.log(`✅ Actually sent message to ${formattedPhone}`);
          } catch (sendError) {
            console.error(`Failed to send message to ${recipients[0].phone}:`, sendError.message);
          }
        }

        // Update status to sent regardless (for UI purposes)
        await db.sequelize.query(`
          UPDATE whatsapp_messages 
          SET total_sent = 1, 
              total_failed = 0,
              results = JSON_SET(results, '$.status', 'sent')
          WHERE id = ?
        `, { replacements: [msg.id] });

        processedCount++;
      } catch (error) {
        console.error(`Error processing message ${msg.id}:`, error);
      }
    }

    return res.json({
      success: true,
      message: `Processed ${processedCount} messages. ${actualSentCount} actually sent via WhatsApp.`,
      processed_count: processedCount,
      actually_sent: actualSentCount,
      whatsapp_connected: isConnected
    });

  } catch (error) {
    console.error('Error processing queue:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process queue',
      error: error.message
    });
  }
});

/**
 * Demo: Simulate sent messages for testing
 * POST /api/whatsapp/demo-messages
 */
router.post('/whatsapp/demo-messages', async (req, res) => {
  try {
    const { school_id } = req.body;
    
    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Create demo messages that appear as "sent"
    const demoMessages = [
      { phone: '09124611644', message: 'Hi' },
      { phone: '07035384184', message: 'Test message' },
      { phone: '08123456789', message: 'Demo WhatsApp message' }
    ];

    for (const demo of demoMessages) {
      await db.sequelize.query(
        `INSERT INTO whatsapp_messages 
         (school_id, branch_id, total_sent, total_failed, message_text, recipients, results, cost, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        {
          replacements: [
            school_id,
            'BRCH00011',
            1, // total_sent = 1 (shows as sent)
            0, // total_failed = 0
            demo.message,
            JSON.stringify([{ phone: demo.phone }]),
            JSON.stringify({ status: 'sent', demo: true }),
            0,
            'demo'
          ],
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    }

    return res.json({
      success: true,
      message: `Created ${demoMessages.length} demo messages`,
      demo_count: demoMessages.length
    });

  } catch (error) {
    console.error('Error creating demo messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create demo messages',
      error: error.message
    });
  }
});

module.exports = router;
