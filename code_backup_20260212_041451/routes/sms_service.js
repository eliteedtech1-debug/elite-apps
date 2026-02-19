const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../models");
const { addSingleSmsJob, addBulkSmsJob } = require("../queues/smsQueue");
require("dotenv").config();

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
 * Normalize phone number to international format (234...)
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

/**
 * Queue SMS for sending via eBulkSMS API
 * POST /send-sms
 *
 * This endpoint uses credentials from .env file for security
 * Frontend only sends message content and recipients
 * Now uses queue system for better performance and reliability
 */
router.post("/send-sms", async (req, res) => {
  try {
    const { message, recipients, dndsender } = req.body;

    // Validate request payload
    if (!message || !recipients) {
      return res.status(400).json({
        success: false,
        message: "Invalid request payload. Missing message or recipients.",
      });
    }

    // Validate message
    if (!message.sender || !message.messagetext) {
      return res.status(400).json({
        success: false,
        message: "Missing sender name or message text",
      });
    }

    // Check for subscription and cost before queuing
    const userId = req.user?.user_id || 'system'; // Assuming user info is available in req.user
    const schoolId = req.user?.school_id || 'unknown';
    const branchId = req.user?.branch_id || 'unknown';

    // Get school details to generate proper sender name
    let schoolDetails = null;
    try {
      const [school] = await db.sequelize.query(
        'SELECT school_name FROM school_setup WHERE school_id = ?',
        { replacements: [schoolId], type: db.sequelize.QueryTypes.SELECT }
      );
      schoolDetails = school;
    } catch (schoolError) {
      console.error('⚠️ Error fetching school details:', schoolError);
      // Continue with unknown school - the normalize function has fallbacks
    }

    // Generate sender name from school name to ensure compliance with provider policies
    const sender = normalizeSenderName(message.sender, schoolId, schoolDetails?.school_name);

    // Get active subscription details for cost calculation
    let activeSubscription = null;
    let costPerMessage = 0;

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
        if (activeSubscription.package_type === 'payg') {
          // For pay-as-you-go, calculate cost per message
          costPerMessage = parseFloat(activeSubscription.unit_cost) || 0;
        } else if (activeSubscription.package_type === 'termly') {
          // For termly packages, cost is already paid upfront
          costPerMessage = 0;
        }
      } else {
        // No active subscription found - cannot send SMS
        console.error('⚠️ No active SMS subscription found');
        return res.status(400).json({
          success: false,
          message: 'No active SMS subscription found. Please subscribe to an SMS package first.'
        });
      }
    } catch (subError) {
      console.error('⚠️ Error checking subscription:', subError);
      return res.status(500).json({
        success: false,
        message: 'Error checking subscription. Please try again later.'
      });
    }

    // Determine if this is a single SMS or bulk SMS based on recipients
    let smsJob;
    const smsData = {
      message: message.messagetext,
      sender,
      dndsender: dndsender || 1,
      user_id: userId,
      school_id: schoolId,
      branch_id: branchId,
      cost_per_message: costPerMessage // Include cost per message for tracking
    };

    if (Array.isArray(recipients) && recipients.length === 1) {
      // Single SMS
      const recipient = recipients[0];
      const phone = recipient.msisdn || recipient.msidn || recipient.phone;
      smsData.to = phone;
      smsData.recipient_id = recipient.id || 'unknown';
      
      // Add to single SMS queue
      smsJob = await addSingleSmsJob(smsData);
    } else if (Array.isArray(recipients) && recipients.length > 1) {
      // Bulk SMS
      smsData.recipients = recipients;
      smsData.campaign_id = `bulk_sms_${Date.now()}`; // Generate a campaign ID
      
      // Add to bulk SMS queue
      smsJob = await addBulkSmsJob(smsData);
    } else if (recipients.gsm && Array.isArray(recipients.gsm)) {
      // Already in eBulkSMS format
      smsData.recipients = recipients.gsm;
      smsData.campaign_id = `bulk_sms_${Date.now()}`;
      
      // Add to bulk SMS queue if more than 1 recipient, single otherwise
      if (recipients.gsm.length === 1) {
        smsData.to = recipients.gsm[0].msidn || recipients.gsm[0].msisdn;
        smsData.recipient_id = recipients.gsm[0].id || 'unknown';
        smsJob = await addSingleSmsJob(smsData);
      } else {
        smsJob = await addBulkSmsJob(smsData);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid recipients format. Expected array of recipients or {gsm: []} object",
      });
    }

    // Return success response immediately since job is queued
    return res.status(200).json({
      success: true,
      message: "SMS queued for sending",
      job_id: smsJob.id,
      data: {
        queued_at: new Date().toISOString(),
        recipients_count: Array.isArray(recipients) ? recipients.length : (recipients.gsm ? recipients.gsm.length : 0)
      }
    });

  } catch (error) {
    console.error("❌ Error queuing SMS:", error.message);

    if (error.message.includes('No active SMS subscription')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while queuing SMS",
      error: error.message,
    });
  }
});

/**
 * Get SMS Delivery Reports
 * GET /sms-delivery-report
 *
 * Query params:
 * - uniqueid: (optional) specific message ID to check
 */
router.get("/sms-delivery-report", async (req, res) => {
  try {
    const { uniqueid } = req.query;

    // Get credentials from environment variables
    const EBULKSMS_USERNAME = process.env.EBULKSMS_USERNAME;
    const EBULKSMS_API_KEY = process.env.EBULKSMS_API_KEY;

    if (!EBULKSMS_USERNAME || !EBULKSMS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "SMS service not configured",
      });
    }

    let url = `https://api.ebulksms.com/getdlr.json?username=${encodeURIComponent(EBULKSMS_USERNAME)}&apikey=${encodeURIComponent(EBULKSMS_API_KEY)}`;

    if (uniqueid) {
      url += `&uniqueid=${encodeURIComponent(uniqueid)}`;
    }

    console.log("📊 Fetching SMS delivery reports...");

    const dlrResponse = await axios.get(url, {
      timeout: 30000,
    });

    if (dlrResponse.data && dlrResponse.data.dlr) {
      return res.status(200).json({
        success: true,
        data: dlrResponse.data.dlr,
      });
    } else {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No delivery reports available",
      });
    }
  } catch (error) {
    console.error("❌ Error fetching delivery reports:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch delivery reports",
      error: error.message,
    });
  }
});

/**
 * Check eBulkSMS Account Balance
 * GET /sms-balance
 *
 * Uses credentials from .env file
 */
router.get("/sms-balance", async (req, res) => {
  try {
    // Get credentials from environment variables
    const EBULKSMS_USERNAME = process.env.EBULKSMS_USERNAME;
    const EBULKSMS_API_KEY = process.env.EBULKSMS_API_KEY;

    if (!EBULKSMS_USERNAME || !EBULKSMS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "SMS service not configured",
      });
    }

    const url = `https://api.ebulksms.com/balance/${encodeURIComponent(EBULKSMS_USERNAME)}/${encodeURIComponent(EBULKSMS_API_KEY)}`;

    console.log("💰 Checking SMS account balance...");

    const balanceResponse = await axios.get(url, {
      timeout: 30000,
    });

    const balance = balanceResponse.data;

    // eBulkSMS returns plain text with balance or error status
    if (balance && !balance.includes("FAILURE") && !balance.includes("ERROR")) {
      return res.status(200).json({
        success: true,
        balance: parseFloat(balance) || balance,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to retrieve balance",
        error: balance,
      });
    }
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to check SMS balance",
      error: error.message,
    });
  }
});

module.exports = router;
