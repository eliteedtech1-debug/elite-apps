/**
 * Email Service - High-level interface for email operations
 * Uses queue system for reliable email delivery
 */

const {
  addEmailVerificationJob,
  addEmailChangeVerificationJob,
  addPasswordResetJob,
  addPasswordResetOtpJob,
  addWelcomeEmailJob,
  addNotificationJob,
  addBulkEmailJob,
  getQueueStats,
  getFailedJobs,
  retryFailedJob
} = require('../queues/emailQueue');

/**
 * Send email change verification
 */
async function sendEmailChangeVerification(data, options = {}) {
  try {
    console.log('📧 Queueing email change verification:', {
      user_id: data.user_id,
      old_email: data.old_email,
      new_email: data.new_email
    });

    const job = await addEmailChangeVerificationJob({
      user_id: data.user_id,
      user_name: data.user_name,
      old_email: data.old_email,
      new_email: data.new_email,
      verification_code: data.verification_code,
      expires_at: data.expires_at,
      template_data: data.template_data || {}
    }, {
      priority: 2, // High priority
      attempts: 5,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    // let queuePosition = null;
    // try {
    //   queuePosition = await job.getPosition();
    // } catch (error) {
    //   console.log('Could not get queue position:', error.message);
    // }

    return {
      success: true,
      message: 'Email change verification queued successfully',
      job_id: job.id,
      // queue_position: queuePosition,
      estimated_delay: options.delay || 0
    };

  } catch (error) {
    console.error('❌ Failed to queue email change verification:', error);
    return {
      success: false,
      message: 'Failed to queue email verification',
      error: error.message
    };
  }
}

/**
 * Send email verification
 */
async function sendEmailVerification(data, options = {}) {
  try {
    console.log('📧 Queueing email verification:', {
      user_id: data.user_id,
      email: data.email
    });

    const job = await addEmailVerificationJob({
      user_id: data.user_id,
      user_name: data.user_name,
      email: data.email,
      verification_code: data.verification_code,
      expires_at: data.expires_at,
      template_data: data.template_data || {}
    }, {
      priority: 2, // High priority
      attempts: 3,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    // let queuePosition = null;
    // try {
    //   queuePosition = await job.getPosition();
    // } catch (error) {
    //   console.log('Could not get queue position:', error.message);
    // }

    return {
      success: true,
      message: 'Email verification queued successfully',
      job_id: job.id,
      // queue_position: queuePosition
    };

  } catch (error) {
    console.error('❌ Failed to queue email verification:', error);
    return {
      success: false,
      message: 'Failed to queue email verification',
      error: error.message
    };
  }
}

/**
 * Send password reset email
 */
async function sendPasswordReset(data, options = {}) {
  try {
    console.log('📧 Queueing password reset:', {
      user_id: data.user_id,
      email: data.email,
      user_type: data.user_type
    });

    const job = await addPasswordResetJob({
      user_id: data.user_id,
      user_name: data.user_name,
      email: data.email,
      user_type: data.user_type,
      reset_token: data.reset_token,
      reset_url: data.reset_url,
      expires_at: data.expires_at,
      template_data: data.template_data || {}
    }, {
      priority: 1, // Critical priority
      attempts: 5,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    // let queuePosition = null;
    // try {
    //   queuePosition = await job.getPosition();
    // } catch (error) {
    //   console.log('Could not get queue position:', error.message);
    // }

    return {
      success: true,
      message: 'Password reset email queued successfully',
      job_id: job.id,
      // queue_position: queuePosition
    };

  } catch (error) {
    console.error('❌ Failed to queue password reset:', error);
    return {
      success: false,
      message: 'Failed to queue password reset email',
      error: error.message
    };
  }
}

/**
 * Send password reset OTP email
 */
async function sendPasswordResetOTP(data, options = {}) {
  try {
    console.log('📧 Queueing password reset OTP:', {
      user_id: data.user_id,
      email: data.email
    });

    const job = await addPasswordResetOtpJob({
      user_id: data.user_id,
      user_name: data.user_name,
      user_type: data.user_type,
      email: data.email,
      otp_code: data.otp_code,
      reset_url: data.reset_url,
      reset_token: data.reset_token,
      expires_at: data.expires_at,
      school_id: data.school_id,
      template_data: data.template_data || {}
    }, {
      priority: 1, // Critical priority
      attempts: 5,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    // let queuePosition = null;
    // try {
    //   queuePosition = await job.getPosition();
    // } catch (error) {
    //   console.log('Could not get queue position:', error.message);
    // }

    return {
      success: true,
      message: 'Password reset OTP email queued successfully',
      job_id: job.id,
      // queue_position: queuePosition
    };

  } catch (error) {
    console.error('❌ Failed to queue password reset OTP:', error);
    return {
      success: false,
      message: 'Failed to queue password reset OTP email',
      error: error.message
    };
  }
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(data, options = {}) {
  try {
    console.log('📧 Queueing welcome email:', {
      user_id: data.user_id,
      email: data.email,
      user_type: data.user_type
    });

    const job = await addWelcomeEmailJob({
      user_id: data.user_id,
      user_name: data.user_name,
      email: data.email,
      user_type: data.user_type,
      school_name: data.school_name,
      login_url: data.login_url,
      template_data: data.template_data || {}
    }, {
      priority: 3, // Normal priority
      attempts: 3,
      delay: options.delay || 5000, // 5 second delay for welcome emails
      ...options
    });

    // Get queue position safely
    // let queuePosition = null;
    // try {
    //   queuePosition = await job.getPosition();
    // } catch (error) {
    //   console.log('Could not get queue position:', error.message);
    // }

    return {
      success: true,
      message: 'Welcome email queued successfully',
      job_id: job.id,
      // queue_position: queuePosition
    };

  } catch (error) {
    console.error('❌ Failed to queue welcome email:', error);
    return {
      success: false,
      message: 'Failed to queue welcome email',
      error: error.message
    };
  }
}

/**
 * Send notification email
 */
async function sendNotification(data, options = {}) {
  try {
    console.log('📧 Queueing notification:', {
      user_id: data.user_id,
      email: data.email,
      subject: data.subject,
      notification_type: data.notification_type
    });

    const job = await addNotificationJob({
      user_id: data.user_id,
      user_name: data.user_name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      notification_type: data.notification_type,
      template_data: data.template_data || {}
    }, {
      priority: 3, // Normal priority
      attempts: 3,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    // let queuePosition = null;
    // try {
    //   queuePosition = await job.getPosition();
    // } catch (error) {
    //   console.log('Could not get queue position:', error.message);
    // }

    return {
      success: true,
      message: 'Notification queued successfully',
      job_id: job.id,
      // queue_position: queuePosition
    };

  } catch (error) {
    console.error('❌ Failed to queue notification:', error);
    return {
      success: false,
      message: 'Failed to queue notification',
      error: error.message
    };
  }
}

/**
 * Send bulk email
 */
async function sendBulkEmail(data, options = {}) {
  try {
    console.log('📧 Queueing bulk email:', {
      recipients_count: data.recipients.length,
      subject: data.subject,
      campaign_id: data.campaign_id
    });

    const job = await addBulkEmailJob({
      recipients: data.recipients,
      subject: data.subject,
      message: data.message,
      sender_name: data.sender_name,
      campaign_id: data.campaign_id,
      template_data: data.template_data || {}
    }, {
      priority: 5, // Bulk priority (lowest)
      attempts: 2,
      delay: options.delay || 0,
      ...options
    });

    // Get queue position safely
    // let queuePosition = null;
    // try {
    //   queuePosition = await job.getPosition();
    // } catch (error) {
    //   console.log('Could not get queue position:', error.message);
    // }

    return {
      success: true,
      message: 'Bulk email queued successfully',
      job_id: job.id,
      // queue_position: queuePosition,
      recipients_count: data.recipients.length
    };

  } catch (error) {
    console.error('❌ Failed to queue bulk email:', error);
    return {
      success: false,
      message: 'Failed to queue bulk email',
      error: error.message
    };
  }
}

/**
 * Get email queue statistics
 */
async function getEmailQueueStats() {
  try {
    const stats = await getQueueStats();
    const failed_jobs_result = await getFailedJobs(0, 50); // Get first 50 failed jobs
    
    return {
      success: true,
      data: {
        ...stats,
        failed_jobs: failed_jobs_result.data || [],
        health_status: stats.failed > stats.completed ? 'unhealthy' : 'healthy',
        last_updated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    return {
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message
    };
  }
}

/**
 * Get failed email jobs
 */
async function getFailedEmails(start = 0, end = 10) {
  try {
    const failedJobs = await getFailedJobs(start, end);
    
    return {
      success: true,
      data: failedJobs,
      count: failedJobs.length
    };
  } catch (error) {
    console.error('❌ Failed to get failed jobs:', error);
    return {
      success: false,
      message: 'Failed to get failed email jobs',
      error: error.message
    };
  }
}

/**
 * Retry failed email
 */
async function retryFailedEmail(jobId) {
  try {
    const success = await retryFailedJob(jobId);
    
    if (success) {
      return {
        success: true,
        message: `Email job ${jobId} queued for retry`
      };
    } else {
      return {
        success: false,
        message: `Failed to retry email job ${jobId} - job not found`
      };
    }
  } catch (error) {
    console.error(`❌ Failed to retry job ${jobId}:`, error);
    return {
      success: false,
      message: 'Failed to retry email job',
      error: error.message
    };
  }
}

/**
 * Delete failed email job
 */
async function deleteFailedEmail(jobId) {
  try {
    const { deleteFailedJob } = require('../queues/emailQueue');
    const success = await deleteFailedJob(jobId);
    
    return {
      success: true,
      message: `Email job ${jobId} deleted`
    };
  } catch (error) {
    console.error(`❌ Failed to delete job ${jobId}:`, error);
    return {
      success: false,
      message: 'Failed to delete email job',
      error: error.message
    };
  }
}

/**
 * Send scheduled email (with delay)
 */
async function scheduleEmail(type, data, scheduleTime, options = {}) {
  const delay = new Date(scheduleTime).getTime() - Date.now();
  
  if (delay < 0) {
    throw new Error('Schedule time must be in the future');
  }
  
  console.log(`⏰ Scheduling ${type} email for ${scheduleTime} (delay: ${delay}ms)`);
  
  const emailOptions = {
    ...options,
    delay
  };
  
  switch (type) {
    case 'email-verification':
      return await sendEmailVerification(data, emailOptions);
    case 'email-change-verification':
      return await sendEmailChangeVerification(data, emailOptions);
    case 'password-reset':
      return await sendPasswordReset(data, emailOptions);
    case 'welcome':
      return await sendWelcomeEmail(data, emailOptions);
    case 'notification':
      return await sendNotification(data, emailOptions);
    case 'bulk':
      return await sendBulkEmail(data, emailOptions);
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

/**
 * Health check for email service
 */
async function healthCheck() {
  try {
    const stats = await getQueueStats();
    const isHealthy = stats.failed <= stats.completed && stats.active < 100;
    
    return {
      success: true,
      healthy: isHealthy,
      stats,
      timestamp: new Date().toISOString(),
      status: isHealthy ? 'operational' : 'degraded'
    };
  } catch (error) {
    return {
      success: false,
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      status: 'down'
    };
  }
}

/**
 * Send receipt email with PDF attachment
 */
async function sendReceiptEmail(data, options = {}) {
  try {
    console.log('📧 Queueing receipt email:', {
      email: data.email,
      studentName: data.studentName
    });

    const { addEmailWithPDFJob } = require('../queues/emailQueue');
    
    const job = await addEmailWithPDFJob({
      school_id: data.school_id,
      email: data.email,
      subject: data.subject,
      studentName: data.studentName,
      pdfBase64: data.pdfBase64,
      filename: data.filename,
      sender_id: data.sender_id || 'system'
    }, {
      priority: 2,
      attempts: 3,
      ...options
    });

    return {
      success: true,
      message: 'Receipt email queued successfully',
      job_id: job.id
    };
  } catch (error) {
    console.error('❌ Error queueing receipt email:', error);
    return {
      success: false,
      message: 'Failed to queue receipt email',
      error: error.message
    };
  }
}

module.exports = {
  // Core email functions
  sendEmailChangeVerification,
  sendEmailVerification,
  sendPasswordReset,
  sendPasswordResetOTP,
  sendWelcomeEmail,
  sendNotification,
  sendBulkEmail,
  sendReceiptEmail,

  // Scheduling
  scheduleEmail,

  // Monitoring
  getEmailQueueStats,
  getFailedEmails,
  retryFailedEmail,
  deleteFailedEmail,
  healthCheck
};
