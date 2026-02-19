/**
 * Queue Monitoring Dashboard
 * Provides web interface for monitoring email queue
 */

const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { emailQueue } = require('./emailQueue');

// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board with email queue
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});

// Queue monitoring functions
class QueueMonitor {
  constructor() {
    this.emailQueue = emailQueue;
    this.startTime = new Date();
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      totalCompleted: 0,
      averageProcessingTime: 0,
      lastProcessedAt: null
    };
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Track completed jobs
    this.emailQueue.on('completed', (job, result) => {
      this.stats.totalProcessed++;
      this.stats.totalCompleted++;
      this.stats.lastProcessedAt = new Date();
      
      // Calculate average processing time
      const processingTime = job.processedOn - job.processedOn;
      this.updateAverageProcessingTime(processingTime);
      
      console.log(`📊 Queue Stats - Completed: ${this.stats.totalCompleted}, Failed: ${this.stats.totalFailed}`);
    });
    
    // Track failed jobs
    this.emailQueue.on('failed', (job, err) => {
      this.stats.totalProcessed++;
      this.stats.totalFailed++;
      
      console.log(`📊 Queue Stats - Completed: ${this.stats.totalCompleted}, Failed: ${this.stats.totalFailed}`);
    });
    
    // Track stalled jobs
    this.emailQueue.on('stalled', (job) => {
      console.log(`⚠️ Job ${job.id} stalled - investigating...`);
    });
  }
  
  updateAverageProcessingTime(newTime) {
    if (this.stats.totalCompleted === 1) {
      this.stats.averageProcessingTime = newTime;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.totalCompleted - 1) + newTime) / this.stats.totalCompleted;
    }
  }
  
  async getDetailedStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.emailQueue.getWaiting(),
        this.emailQueue.getActive(),
        this.emailQueue.getCompleted(0, 100),
        this.emailQueue.getFailed(0, 50),
        this.emailQueue.getDelayed()
      ]);
      
      // Calculate success rate
      const totalProcessed = this.stats.totalCompleted + this.stats.totalFailed;
      const successRate = totalProcessed > 0 ? (this.stats.totalCompleted / totalProcessed) * 100 : 0;
      
      // Get job types distribution
      const jobTypes = {};
      [...waiting, ...active, ...completed.slice(0, 20)].forEach(job => {
        const type = job.data?.type || 'unknown';
        jobTypes[type] = (jobTypes[type] || 0) + 1;
      });
      
      // Get recent failures
      const recentFailures = failed.slice(0, 10).map(job => ({
        id: job.id,
        type: job.data?.type,
        recipient: job.data?.to,
        error: job.failedReason,
        failedAt: job.failedOn,
        attempts: job.attemptsMade
      }));
      
      return {
        overview: {
          uptime: Date.now() - this.startTime.getTime(),
          totalProcessed: this.stats.totalProcessed,
          successRate: Math.round(successRate * 100) / 100,
          averageProcessingTime: Math.round(this.stats.averageProcessingTime),
          lastProcessedAt: this.stats.lastProcessedAt
        },
        current: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length
        },
        jobTypes,
        recentFailures,
        health: {
          status: this.getHealthStatus(),
          issues: this.getHealthIssues()
        }
      };
    } catch (error) {
      console.error('Error getting detailed stats:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  getHealthStatus() {
    const failureRate = this.stats.totalProcessed > 0 
      ? (this.stats.totalFailed / this.stats.totalProcessed) * 100 
      : 0;
    
    if (failureRate > 50) return 'critical';
    if (failureRate > 20) return 'warning';
    if (failureRate > 5) return 'degraded';
    return 'healthy';
  }
  
  getHealthIssues() {
    const issues = [];
    
    const failureRate = this.stats.totalProcessed > 0 
      ? (this.stats.totalFailed / this.stats.totalProcessed) * 100 
      : 0;
    
    if (failureRate > 20) {
      issues.push(`High failure rate: ${Math.round(failureRate)}%`);
    }
    
    if (this.stats.averageProcessingTime > 30000) {
      issues.push(`Slow processing: ${Math.round(this.stats.averageProcessingTime/1000)}s average`);
    }
    
    const timeSinceLastProcessed = this.stats.lastProcessedAt 
      ? Date.now() - this.stats.lastProcessedAt.getTime()
      : null;
    
    if (timeSinceLastProcessed && timeSinceLastProcessed > 300000) { // 5 minutes
      issues.push('No recent activity');
    }
    
    return issues;
  }
  
  async getJobDetails(jobId) {
    try {
      const job = await this.emailQueue.getJob(jobId);
      
      if (!job) {
        return { error: 'Job not found' };
      }
      
      return {
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress: job.progress,
        delay: job.delay,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        returnvalue: job.returnvalue,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  
  async retryAllFailed() {
    try {
      const failedJobs = await this.emailQueue.getFailed();
      let retried = 0;
      
      for (const job of failedJobs) {
        try {
          await job.retry();
          retried++;
        } catch (error) {
          console.log(`Failed to retry job ${job.id}:`, error.message);
        }
      }
      
      return {
        success: true,
        message: `Retried ${retried} out of ${failedJobs.length} failed jobs`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async cleanOldJobs(options = {}) {
    const defaultOptions = {
      grace: 24 * 60 * 60 * 1000, // 24 hours
      count: 100,
      type: 'completed'
    };
    
    const cleanOptions = { ...defaultOptions, ...options };
    
    try {
      const result = await this.emailQueue.clean(
        cleanOptions.grace,
        cleanOptions.count,
        cleanOptions.type
      );
      
      return {
        success: true,
        cleaned: result.length,
        type: cleanOptions.type
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create monitor instance
const queueMonitor = new QueueMonitor();

// API endpoints for monitoring
const createMonitoringRoutes = (app) => {
  // Bull Board UI
  app.use('/admin/queues', serverAdapter.getRouter());
  
  // Custom API endpoints
  app.get('/api/queue/stats', async (req, res) => {
    try {
      const stats = await queueMonitor.getDetailedStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.get('/api/queue/job/:id', async (req, res) => {
    try {
      const jobDetails = await queueMonitor.getJobDetails(req.params.id);
      res.json({ success: true, data: jobDetails });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.post('/api/queue/retry-failed', async (req, res) => {
    try {
      const result = await queueMonitor.retryAllFailed();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.post('/api/queue/clean', async (req, res) => {
    try {
      const result = await queueMonitor.cleanOldJobs(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  app.get('/api/queue/health', async (req, res) => {
    try {
      const stats = await queueMonitor.getDetailedStats();
      res.json({
        success: true,
        health: stats.health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

module.exports = {
  serverAdapter,
  queueMonitor,
  createMonitoringRoutes
};