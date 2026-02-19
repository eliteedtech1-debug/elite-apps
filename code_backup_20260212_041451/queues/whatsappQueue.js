const { redisConnection } = require('../utils/redisConnection');
const { FallbackQueue } = require('./fallbackQueue');
const { Queue } = require('bullmq');

// Global variables to hold our queue and connection instances
let whatsappQueue = null;
let connection = null;
let initialized = false;

// Initialize queue with Redis or fallback
async function initializeWhatsAppQueue() {
  if (initialized) {
    return { whatsappQueue, connection };
  }

  const redisInstance = await redisConnection.initialize();

  if (redisInstance) {
    // Use Redis-based BullMQ queue
    connection = redisInstance;

    // WhatsApp Queue Configuration
    const whatsappQueueConfig = {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 3,           // Retry up to 3 times (WhatsApp can be unreliable)
        backoff: {
          type: 'exponential',
          delay: 3000,         // Start with 3 second delay (more appropriate for WhatsApp)
        },
        delay: 0,              // No initial delay
      }
    };

    whatsappQueue = new Queue('whatsapp-queue', whatsappQueueConfig);
    console.log('💬 WhatsApp queue initialized with Redis');
  } else {
    // Use fallback queue
    whatsappQueue = new FallbackQueue('whatsapp-queue');
    console.log('💬 WhatsApp queue initialized with fallback (Redis unavailable)');
  }

  initialized = true;
  return { whatsappQueue, connection };
}

// Job Types
const WHATSAPP_JOB_TYPES = {
  SINGLE_MESSAGE: 'single-message',
  BULK_MESSAGE: 'bulk-message',
  MESSAGE_WITH_PDF: 'message-with-pdf',
  NOTIFICATION: 'notification'
};

// Priority Levels
const PRIORITY_LEVELS = {
  CRITICAL: 1,    // Security alerts, payment confirmations
  HIGH: 2,        // Important notifications
  NORMAL: 3,      // Regular notifications
  LOW: 4,         // Newsletters, reminders
  BULK: 5         // Mass communications
};

/**
 * Add single WhatsApp message job to queue
 */
async function addSingleMessageJob(data, options = {}) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeWhatsAppQueue();
  }

  const jobData = {
    type: WHATSAPP_JOB_TYPES.SINGLE_MESSAGE,
    phone: data.phone,
    message: data.message,
    school_id: data.school_id,
    user_id: data.sender_id || 'system',
    cost_per_message: data.cost_per_message,
    metadata: data.metadata || {}
  };

  const jobOptions = {
    priority: PRIORITY_LEVELS.NORMAL,
    delay: options.delay || 0,
    attempts: options.attempts || 3,
    ...options
  };

  console.log('💬 Adding single WhatsApp message job to queue:', {
    phone: jobData.phone,
    school_id: jobData.school_id,
    priority: jobOptions.priority
  });

  return await whatsappQueue.add(WHATSAPP_JOB_TYPES.SINGLE_MESSAGE, jobData, jobOptions);
}

/**
 * Add bulk WhatsApp message job to queue
 */
async function addBulkMessageJob(data, options = {}) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeWhatsAppQueue();
  }

  const jobData = {
    type: WHATSAPP_JOB_TYPES.BULK_MESSAGE,
    recipients: data.recipients, // Array of recipient objects
    message: data.message,
    school_id: data.school_id,
    user_id: data.sender_id || 'system',
    cost_per_message: data.cost_per_message,
    campaign_id: data.campaign_id,
    metadata: data.metadata || {}
  };

  const jobOptions = {
    priority: PRIORITY_LEVELS.BULK,
    delay: options.delay || 0,
    attempts: options.attempts || 3,
    ...options
  };

  console.log('💬 Adding bulk WhatsApp message job to queue:', {
    recipients_count: jobData.recipients.length,
    school_id: jobData.school_id,
    campaign_id: jobData.campaign_id
  });

  return await whatsappQueue.add(WHATSAPP_JOB_TYPES.BULK_MESSAGE, jobData, jobOptions);
}

/**
 * Add WhatsApp message with PDF job to queue
 */
async function addMessageWithPDFJob(data, options = {}) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeWhatsAppQueue();
  }

  const jobData = {
    type: WHATSAPP_JOB_TYPES.MESSAGE_WITH_PDF,
    phone: data.phone,
    message: data.message,
    pdfBase64: data.pdfBase64,
    filename: data.filename,
    school_id: data.school_id,
    user_id: data.sender_id || 'system',
    cost_per_message: data.cost_per_message,
    metadata: data.metadata || {}
  };

  const jobOptions = {
    priority: PRIORITY_LEVELS.HIGH,
    delay: options.delay || 0,
    attempts: options.attempts || 3,
    ...options
  };

  console.log('💬 Adding WhatsApp message with PDF job to queue:', {
    phone: jobData.phone,
    school_id: jobData.school_id,
    has_pdf: !!jobData.pdfBase64,
    priority: jobOptions.priority
  });

  return await whatsappQueue.add(WHATSAPP_JOB_TYPES.MESSAGE_WITH_PDF, jobData, jobOptions);
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeWhatsAppQueue();
  }

  try {
    if (whatsappQueue.getStats) {
      // Fallback queue
      return await whatsappQueue.getStats();
    } else {
      // BullMQ queue
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        whatsappQueue.getWaiting(),
        whatsappQueue.getActive(),
        whatsappQueue.getCompleted(),
        whatsappQueue.getFailed(),
        whatsappQueue.getDelayed()
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
    await initializeWhatsAppQueue();
  }

  const defaultOptions = {
    grace: 5000,        // Grace period for active jobs
    count: 100,         // Number of jobs to clean
    type: 'completed'   // Type of jobs to clean
  };

  const cleanOptions = { ...defaultOptions, ...options };

  try {
    if (whatsappQueue.clean) {
      // Fallback queue
      return await whatsappQueue.clean(cleanOptions.grace, cleanOptions.count, cleanOptions.type);
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
    await initializeWhatsAppQueue();
  }

  if (whatsappQueue.pause) {
    // Fallback queue
    await whatsappQueue.pause();
  } else {
    // BullMQ queue
    await whatsappQueue.pause();
  }
  console.log('⏸️ WhatsApp queue paused');
}

async function resumeQueue() {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeWhatsAppQueue();
  }

  if (whatsappQueue.resume) {
    // Fallback queue
    await whatsappQueue.resume();
  } else {
    // BullMQ queue
    await whatsappQueue.resume();
  }
  console.log('▶️ WhatsApp queue resumed');
}

/**
 * Get failed jobs for retry
 */
async function getFailedJobs(start = 0, end = 10) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeWhatsAppQueue();
  }

  try {
    let failedJobs;
    if (whatsappQueue.getFailed) {
      // Fallback queue
      failedJobs = await whatsappQueue.getFailed(start, end);
    } else {
      // BullMQ queue
      failedJobs = await whatsappQueue.getFailed(start, end);
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
 * Retry failed job
 */
async function retryFailedJob(jobId) {
  // Ensure initialization has completed
  if (!initialized) {
    await initializeWhatsAppQueue();
  }

  try {
    if (whatsappQueue.retryJob) {
      // Fallback queue
      return await whatsappQueue.retryJob(jobId);
    } else {
      // BullMQ queue
      const job = await whatsappQueue.getJob(jobId);
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
initializeWhatsAppQueue().catch(error => {
  console.error('Failed to initialize WhatsApp queue:', error.message);
  // Even if Redis fails, we'll use fallback queue
  whatsappQueue = new FallbackQueue('whatsapp-queue');
  initialized = true;
  console.log('💬 WhatsApp queue initialized with fallback after error');
});

// Note: Graceful shutdown is now handled centrally in src/index.js
// Individual SIGTERM handlers removed to prevent Redis connection conflicts

module.exports = {
  whatsappQueue: () => whatsappQueue,
  connection: () => connection,
  WHATSAPP_JOB_TYPES,
  PRIORITY_LEVELS,

  // Job creators
  addSingleMessageJob,
  addBulkMessageJob,
  addMessageWithPDFJob,

  // Queue management
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  getFailedJobs,
  retryFailedJob
};