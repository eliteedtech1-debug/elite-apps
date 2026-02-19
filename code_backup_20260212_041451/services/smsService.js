/**
 * SMS Service - High-level interface for SMS operations
 * Uses queue system for reliable SMS delivery via eBulkSMS
 */

const {
  addSingleSmsJob,
  addBulkSmsJob,
  addNotificationSmsJob,
  getQueueStats,
  getFailedJobs,
  retryFailedJob,
  getJobPosition,
  PRIORITY_LEVELS
} = require('../queues/smsQueue');

/**
 * Normalize phone number to international format
 * Converts Nigerian numbers to 234 format
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;

  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle Nigerian numbers
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.substring(1);
  } else if (cleaned.startsWith('234')) {
    // Already in correct format
  } else if (cleaned.length === 10) {
    // Assume it's Nigerian without country code
    cleaned = '234' + cleaned;
  }

  return cleaned;
}

/**
 * Send password reset OTP via SMS
 */
async function sendPasswordResetOTPSms(data, options = {}) {
  try {
    console.log('📱 Queueing password reset OTP SMS:', {
      user_id: data.user_id,
      phone: data.phone ? `${data.phone.substring(0, 3)}***${data.phone.slice(-2)}` : 'N/A'
    });

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(data.phone);

    if (!normalizedPhone) {
      throw new Error('Invalid phone number provided');
    }

    // Calculate expiry time in minutes
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const expiryMinutes = Math.round((expiresAt - now) / 1000 / 60);

    // Construct OTP message
    const message = `Your password reset OTP is: ${data.otp_code}. Valid for ${expiryMinutes} minutes. Do not share this code with anyone.`;

    // Get sender name (use school name if available, otherwise default)
    const sender = data.sender || process.env.SMS_SENDER_NAME || 'ElScholar';

    const job = await addSingleSmsJob({
      to: normalizedPhone,
      message: message,
      sender: sender,
      user_id: data.user_id,
      school_id: data.school_id || '',
      branch_id: data.branch_id || '',
      cost_per_message: data.cost_per_message || 0,
      dndsender: data.dndsender || 0
    }, {
      priority: PRIORITY_LEVELS.CRITICAL, // Critical priority for security
      attempts: 5,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    let queuePosition = null;
    try {
      queuePosition = await getJobPosition(job);
    } catch (error) {
      console.log('Could not get queue position:', error.message);
    }

    return {
      success: true,
      message: 'Password reset OTP SMS queued successfully',
      job_id: job.id,
      queue_position: queuePosition
    };

  } catch (error) {
    console.error('❌ Failed to queue password reset OTP SMS:', error);
    return {
      success: false,
      message: 'Failed to queue password reset OTP SMS',
      error: error.message
    };
  }
}

/**
 * Send verification code via SMS
 */
async function sendVerificationCodeSms(data, options = {}) {
  try {
    console.log('📱 Queueing verification code SMS:', {
      user_id: data.user_id,
      phone: data.phone ? `${data.phone.substring(0, 3)}***${data.phone.slice(-2)}` : 'N/A'
    });

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(data.phone);

    if (!normalizedPhone) {
      throw new Error('Invalid phone number provided');
    }

    // Calculate expiry time in minutes
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const expiryMinutes = Math.round((expiresAt - now) / 1000 / 60);

    // Construct verification message
    const message = `Your verification code is: ${data.verification_code}. Valid for ${expiryMinutes} minutes.`;

    // Get sender name
    const sender = data.sender || process.env.SMS_SENDER_NAME || 'ElScholar';

    const job = await addSingleSmsJob({
      to: normalizedPhone,
      message: message,
      sender: sender,
      user_id: data.user_id,
      school_id: data.school_id || '',
      branch_id: data.branch_id || '',
      cost_per_message: data.cost_per_message || 0,
      dndsender: data.dndsender || 0
    }, {
      priority: PRIORITY_LEVELS.HIGH, // High priority
      attempts: 3,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    let queuePosition = null;
    try {
      queuePosition = await getJobPosition(job);
    } catch (error) {
      console.log('Could not get queue position:', error.message);
    }

    return {
      success: true,
      message: 'Verification code SMS queued successfully',
      job_id: job.id,
      queue_position: queuePosition
    };

  } catch (error) {
    console.error('❌ Failed to queue verification code SMS:', error);
    return {
      success: false,
      message: 'Failed to queue verification code SMS',
      error: error.message
    };
  }
}

/**
 * Send notification SMS
 */
async function sendNotificationSms(data, options = {}) {
  try {
    console.log('📱 Queueing notification SMS:', {
      user_id: data.user_id,
      phone: data.phone ? `${data.phone.substring(0, 3)}***${data.phone.slice(-2)}` : 'N/A',
      notification_type: data.notification_type
    });

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(data.phone);

    if (!normalizedPhone) {
      throw new Error('Invalid phone number provided');
    }

    // Get sender name
    const sender = data.sender || process.env.SMS_SENDER_NAME || 'ElScholar';

    const job = await addNotificationSmsJob({
      to: normalizedPhone,
      message: data.message,
      sender: sender,
      notification_type: data.notification_type || 'general',
      user_id: data.user_id,
      school_id: data.school_id || '',
      branch_id: data.branch_id || '',
      cost_per_message: data.cost_per_message || 0,
      dndsender: data.dndsender || 0
    }, {
      priority: PRIORITY_LEVELS.NORMAL,
      attempts: 3,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    let queuePosition = null;
    try {
      queuePosition = await getJobPosition(job);
    } catch (error) {
      console.log('Could not get queue position:', error.message);
    }

    return {
      success: true,
      message: 'Notification SMS queued successfully',
      job_id: job.id,
      queue_position: queuePosition
    };

  } catch (error) {
    console.error('❌ Failed to queue notification SMS:', error);
    return {
      success: false,
      message: 'Failed to queue notification SMS',
      error: error.message
    };
  }
}

/**
 * Send bulk SMS
 */
async function sendBulkSms(data, options = {}) {
  try {
    console.log('📱 Queueing bulk SMS:', {
      recipients_count: data.recipients ? data.recipients.length : 0,
      campaign_id: data.campaign_id
    });

    if (!data.recipients || data.recipients.length === 0) {
      throw new Error('No recipients provided for bulk SMS');
    }

    // Normalize all phone numbers
    const normalizedRecipients = data.recipients.map(recipient => {
      if (typeof recipient === 'string') {
        return normalizePhoneNumber(recipient);
      } else if (recipient.phone) {
        return {
          ...recipient,
          phone: normalizePhoneNumber(recipient.phone)
        };
      }
      return recipient;
    }).filter(r => r); // Remove any null/undefined entries

    // Get sender name
    const sender = data.sender || process.env.SMS_SENDER_NAME || 'ElScholar';

    const job = await addBulkSmsJob({
      recipients: normalizedRecipients,
      message: data.message,
      sender: sender,
      campaign_id: data.campaign_id,
      user_id: data.user_id,
      school_id: data.school_id || '',
      branch_id: data.branch_id || '',
      cost_per_message: data.cost_per_message || 0,
      dndsender: data.dndsender || 0
    }, {
      priority: PRIORITY_LEVELS.BULK,
      attempts: 2,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    let queuePosition = null;
    try {
      queuePosition = await getJobPosition(job);
    } catch (error) {
      console.log('Could not get queue position:', error.message);
    }

    return {
      success: true,
      message: 'Bulk SMS queued successfully',
      job_id: job.id,
      queue_position: queuePosition,
      recipients_count: normalizedRecipients.length
    };

  } catch (error) {
    console.error('❌ Failed to queue bulk SMS:', error);
    return {
      success: false,
      message: 'Failed to queue bulk SMS',
      error: error.message
    };
  }
}

/**
 * Get SMS queue statistics
 */
async function getSmsQueueStats() {
  try {
    const stats = await getQueueStats();
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('❌ Failed to get SMS queue stats:', error);
    return {
      success: false,
      message: 'Failed to get SMS queue statistics',
      error: error.message
    };
  }
}

/**
 * Get failed SMS jobs
 */
async function getFailedSms(start = 0, end = 10) {
  try {
    const failed = await getFailedJobs(start, end);
    return {
      success: true,
      failed
    };
  } catch (error) {
    console.error('❌ Failed to get failed SMS:', error);
    return {
      success: false,
      message: 'Failed to get failed SMS jobs',
      error: error.message
    };
  }
}

/**
 * Retry failed SMS job
 */
async function retryFailedSms(jobId) {
  try {
    const result = await retryFailedJob(jobId);
    return {
      success: result,
      message: result ? 'SMS job retry initiated' : 'Failed to retry SMS job'
    };
  } catch (error) {
    console.error('❌ Failed to retry SMS job:', error);
    return {
      success: false,
      message: 'Failed to retry SMS job',
      error: error.message
    };
  }
}

/**
 * Health check for SMS service
 */
async function healthCheck() {
  try {
    const stats = await getQueueStats();

    return {
      success: true,
      status: 'healthy',
      queue: {
        waiting: stats.waiting || 0,
        active: stats.active || 0,
        completed: stats.completed || 0,
        failed: stats.failed || 0
      },
      provider: 'eBulkSMS',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ SMS health check failed:', error);
    return {
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  // Core SMS functions
  sendPasswordResetOTPSms,
  sendVerificationCodeSms,
  sendNotificationSms,
  sendBulkSms,

  // Utilities
  normalizePhoneNumber,

  // Monitoring
  getSmsQueueStats,
  getFailedSms,
  retryFailedSms,
  healthCheck
};
