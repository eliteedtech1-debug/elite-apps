const { redisConnection } = require('../utils/redisConnection');
const { FallbackQueue } = require('./fallbackQueue');
const { Queue } = require('bullmq');

// Global variables to hold our queue and connection instances
let smsQueue = null;
let connection = null;
let initialized = false;

// Initialize queue with Redis or fallback
async function initializeSmsQueue() {
  if (initialized) {
    return { smsQueue, connection };
  }

  const redisInstance = await redisConnection.initialize();

  if (redisInstance) {
    // Use Redis-based BullMQ queue
    connection = redisInstance;

    // SMS Queue Configuration
    const smsQueueConfig = {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 5,           // Retry up to 5 times
        backoff: {
          type: 'exponential',
          delay: 2000,         // Start with 2 second delay
        },
        delay: 0,              // No initial delay
      }
    };

    smsQueue = new Queue('sms-queue', smsQueueConfig);
    console.log('📱 SMS queue initialized with Redis');
  } else {
    // Use fallback queue
    smsQueue = new FallbackQueue('sms-queue');
    console.log('📱 SMS queue initialized with fallback (Redis unavailable)');
  }

  initialized = true;
  return { smsQueue, connection };
}

// Job Types
const SMS_JOB_TYPES = {
  SINGLE_SMS: 'single-sms',
  BULK_SMS: 'bulk-sms',
  NOTIFICATION_SMS: 'notification-sms'
};

// Priority Levels
const PRIORITY_LEVELS = {
  CRITICAL: 1,    // Security alerts
  HIGH: 2,        // Account changes, important notifications
  NORMAL: 3,      // Regular notifications
  LOW: 4,         // Newsletters, bulk communications
  BULK: 5         // Mass communications
};

/**
 * Add single SMS job to queue
 */
async function addSingleSmsJob(data, options = {}) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  const jobData = {
    type: SMS_JOB_TYPES.SINGLE_SMS,
    to: data.to,
    message: data.message,
    sender: data.sender,
    user_id: data.user_id,
    school_id: data.school_id,
    branch_id: data.branch_id,
    cost_per_message: data.cost_per_message,
    dndsender: data.dndsender
  };

  const jobOptions = {
    priority: PRIORITY_LEVELS.NORMAL,
    delay: options.delay || 0,
    attempts: options.attempts || 3,
    ...options
  };

  console.log('📱 Adding single SMS job to queue:', {
    to: jobData.to,
    user_id: jobData.user_id,
    priority: jobOptions.priority
  });

  return await smsQueue.add(SMS_JOB_TYPES.SINGLE_SMS, jobData, jobOptions);
}

/**
 * Add bulk SMS job to queue
 */
async function addBulkSmsJob(data, options = {}) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  const jobData = {
    type: SMS_JOB_TYPES.BULK_SMS,
    recipients: data.recipients, // Array of phone numbers or recipient objects
    message: data.message,
    sender: data.sender,
    campaign_id: data.campaign_id,
    user_id: data.user_id,
    school_id: data.school_id,
    branch_id: data.branch_id,
    cost_per_message: data.cost_per_message,
    dndsender: data.dndsender
  };

  const jobOptions = {
    priority: PRIORITY_LEVELS.BULK,
    delay: options.delay || 0,
    attempts: options.attempts || 2,
    ...options
  };

  console.log('📱 Adding bulk SMS job to queue:', {
    recipients_count: jobData.recipients.length,
    message: jobData.message.substring(0, 50) + '...',
    campaign_id: jobData.campaign_id
  });

  return await smsQueue.add(SMS_JOB_TYPES.BULK_SMS, jobData, jobOptions);
}

/**
 * Add notification SMS job to queue
 */
async function addNotificationSmsJob(data, options = {}) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  const jobData = {
    type: SMS_JOB_TYPES.NOTIFICATION_SMS,
    to: data.to,
    message: data.message,
    sender: data.sender,
    notification_type: data.notification_type,
    user_id: data.user_id,
    school_id: data.school_id,
    branch_id: data.branch_id,
    cost_per_message: data.cost_per_message,
    dndsender: data.dndsender
  };

  const jobOptions = {
    priority: PRIORITY_LEVELS.NORMAL,
    delay: options.delay || 0,
    attempts: options.attempts || 3,
    ...options
  };

  console.log('📱 Adding notification SMS job to queue:', {
    to: jobData.to,
    notification_type: jobData.notification_type
  });

  return await smsQueue.add(SMS_JOB_TYPES.NOTIFICATION_SMS, jobData, jobOptions);
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  try {
    if (smsQueue.getStats) {
      // Fallback queue
      return await smsQueue.getStats();
    } else {
      // BullMQ queue
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        smsQueue.getWaiting(),
        smsQueue.getActive(),
        smsQueue.getCompleted(),
        smsQueue.getFailed(),
        smsQueue.getDelayed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    }
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      error: error.message
    };
  }
}

/**
 * Clean old jobs from queue
 */
async function cleanQueue(options = {}) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  const defaultOptions = {
    grace: 5000,        // Grace period for active jobs
    count: 100,         // Number of jobs to clean
    type: 'completed'   // Type of jobs to clean
  };

  const cleanOptions = { ...defaultOptions, ...options };

  try {
    if (smsQueue.clean) {
      // Fallback queue
      return await smsQueue.clean(cleanOptions.grace, cleanOptions.count, cleanOptions.type);
    } else {
      // BullMQ queues don't have a clean method on the Queue instance
      // Clean operations are typically handled by QueueScheduler
      console.log('Clean operation not directly available for BullMQ queue');
      return { cleaned: 0 };
    }
  } catch (error) {
    console.error('Error cleaning queue:', error);
    throw error;
  }
}

/**
 * Pause/Resume queue
 */
async function pauseQueue() {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  if (smsQueue.pause) {
    // Fallback queue
    await smsQueue.pause();
  } else {
    // BullMQ queue
    await smsQueue.pause();
  }
  console.log('⏸️ SMS queue paused');
}

async function resumeQueue() {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  if (smsQueue.resume) {
    // Fallback queue
    await smsQueue.resume();
  } else {
    // BullMQ queue
    await smsQueue.resume();
  }
  console.log('▶️ SMS queue resumed');
}

/**
 * Get failed jobs for retry
 */
async function getFailedJobs(start = 0, end = 10) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  try {
    let failedJobs;
    if (smsQueue.getFailed) {
      // Fallback queue
      failedJobs = await smsQueue.getFailed(start, end);
    } else {
      // BullMQ queue
      failedJobs = await smsQueue.getFailed(start, end);
    }

    return failedJobs.map(job => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason || (job.error ? job.error : 'Unknown error'),
      attemptsMade: job.attemptsMade || 0,
      timestamp: job.timestamp,
      processedOn: job.processedOn
    }));
  } catch (error) {
    console.error('Error getting failed jobs:', error);
    return [];
  }
}

/**
 * Get the position of a job in the queue
 */
async function getJobPosition(job) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  try {
    // Check if the job has its own getPosition method (fallback queue case)
    if (typeof job.getPosition === 'function') {
      // This is a fallback queue job with its own getPosition method
      return await job.getPosition();
    } else {
      // This is a BullMQ job, use the BullMQ approach
      // Get all waiting jobs and find the position of the specified job
      const waitingJobs = await smsQueue.getWaiting();
      const jobIndex = waitingJobs.findIndex(waitingJob => waitingJob.id === job.id);

      if (jobIndex !== -1) {
        return jobIndex + 1; // +1 to make it 1-indexed
      } else {
        // If job is not in waiting list, it might have started processing
        return waitingJobs.length + 1; // Approximation
      }
    }
  } catch (error) {
    console.error('Error getting job position:', error);
    return -1;
  }
}

/**
 * Retry failed job
 */
async function retryFailedJob(jobId) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeSmsQueue();
  }

  try {
    if (smsQueue.retryJob) {
      // Fallback queue
      return await smsQueue.retryJob(jobId);
    } else {
      // BullMQ queue
      const job = await smsQueue.getJob(jobId);
      if (job) {
        await job.retry();
        console.log(`🔄 Retrying failed job ${jobId}`);
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error(`Error retrying job ${jobId}:`, error);
    return false;
  }
}

// Initialize the queue when module is loaded
initializeSmsQueue().catch(error => {
  console.error('Failed to initialize SMS queue:', error.message);
  // Even if Redis fails, we'll use fallback queue
  smsQueue = new FallbackQueue('sms-queue');
  initialized = true;
  console.log('📱 SMS queue initialized with fallback after error');
});

// Note: Graceful shutdown is now handled centrally in src/index.js
// Individual SIGTERM handlers removed to prevent Redis connection conflicts

module.exports = {
  smsQueue: () => smsQueue,
  connection: () => connection,
  SMS_JOB_TYPES,
  PRIORITY_LEVELS,

  // Job creators
  addSingleSmsJob,
  addBulkSmsJob,
  addNotificationSmsJob,

  // Queue management
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  getFailedJobs,
  retryFailedJob,
  getJobPosition,
  
  // Add SMS job
  addSMSJob: async (data) => {
    const queue = smsQueue();
    if (!queue) throw new Error('SMS queue not initialized');
    return await queue.add('send-sms', data);
  }
};