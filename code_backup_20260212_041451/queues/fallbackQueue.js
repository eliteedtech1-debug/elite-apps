/**
 * Fallback Queue Implementation
 * Used when Redis is unavailable
 */

class FallbackQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    this.completedJobs = [];
    this.failedJobs = [];
    this.activeJobs = new Set();
    this.processors = new Map();
    this.isPaused = false;
    
    // Start processing jobs in the background
    this.startProcessing();
  }

  /**
   * Add a job to the queue
   */
  async add(name, data, opts = {}) {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const job = {
      id,
      name,
      data,
      opts,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: opts.attempts || 3,
      delay: opts.delay || 0,
      priority: opts.priority || 3, // Normal priority
    };

    this.jobs.push(job);
    
    console.log(`📧 Fallback queue: Added job ${id} to ${this.name}`);
    
    return {
      id,
      delay: job.delay,
      attemptsMade: 0,
      processedOn: null,
      finishedOn: null,
      timestamp: job.timestamp,
      opts: job.opts,
      data: job.data,
      name: job.name,
      priority: job.priority,
      
      // Mock methods for interface compatibility
      getPosition: async () => {
        // Find the position of this specific job in the waiting queue
        const jobIndex = this.jobs.findIndex(job => job.id === id);
        return jobIndex !== -1 ? jobIndex + 1 : -1; // 1-indexed position or -1 if not found
      },
      retry: async () => this.retryJob(id),
    };
  }

  /**
   * Add a processor to handle jobs
   */
  process(name, handler) {
    if (typeof name === 'function') {
      // If only handler is provided (for default processor)
      this.processors.set('default', name);
    } else {
      // If name and handler are provided
      this.processors.set(name, handler);
    }
  }

  /**
   * Start processing jobs
   */
  startProcessing() {
    setInterval(async () => {
      if (this.isPaused || this.jobs.length === 0) return;
      
      // Filter jobs that are ready to process (considering delay)
      const readyJobs = this.jobs.filter(job => 
        Date.now() >= (job.timestamp + job.delay)
      ).sort((a, b) => a.priority - b.priority); // Process higher priority first
      
      if (readyJobs.length === 0) return;
      
      const job = readyJobs[0];
      this.jobs = this.jobs.filter(j => j.id !== job.id);
      
      if (this.activeJobs.has(job.id)) return; // Already processing
      
      this.activeJobs.add(job.id);
      
      try {
        console.log(`🔄 Fallback queue: Processing job ${job.id} (${job.name})`);
        
        // Find appropriate processor
        let handler = this.processors.get(job.name) || this.processors.get('default');
        
        if (!handler) {
          throw new Error(`No processor found for job type: ${job.name}`);
        }
        
        // Execute the job
        await handler(job);
        
        // Mark as completed
        this.completedJobs.push({ ...job, completedAt: Date.now() });
        this.activeJobs.delete(job.id);
        
        console.log(`✅ Fallback queue: Job ${job.id} completed successfully`);
      } catch (error) {
        this.activeJobs.delete(job.id);
        job.attempts++;
        
        console.error(`❌ Fallback queue: Job ${job.id} failed:`, error.message);
        
        if (job.attempts < job.maxAttempts) {
          // Re-add to queue for retry
          job.timestamp = Date.now(); // Reset timestamp
          this.jobs.push(job);
          console.log(`🔄 Fallback queue: Re-queued job ${job.id} for retry (${job.attempts}/${job.maxAttempts})`);
        } else {
          // Mark as failed
          this.failedJobs.push({ ...job, failedAt: Date.now(), error: error.message });
          console.log(`💥 Fallback queue: Job ${job.id} failed permanently after ${job.maxAttempts} attempts`);
        }
      }
    }, 1000); // Process every second
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId) {
    const failedJobIndex = this.failedJobs.findIndex(job => job.id === jobId);
    if (failedJobIndex !== -1) {
      const [failedJob] = this.failedJobs.splice(failedJobIndex, 1);
      failedJob.attempts = 0; // Reset attempts
      failedJob.timestamp = Date.now(); // Reset timestamp
      this.jobs.push(failedJob);
      console.log(`🔄 Fallback queue: Re-queued failed job ${jobId} for retry`);
      return true;
    }
    return false;
  }

  /**
   * Pause the queue
   */
  async pause() {
    this.isPaused = true;
    console.log(`⏸️ Fallback queue: ${this.name} paused`);
  }

  /**
   * Resume the queue
   */
  async resume() {
    this.isPaused = false;
    console.log(`▶️ Fallback queue: ${this.name} resumed`);
  }

  /**
   * Get various job lists
   */
  async getWaiting() {
    return this.jobs.filter(job => !this.activeJobs.has(job.id) && 
      Date.now() >= (job.timestamp + job.delay));
  }

  async getActive() {
    return this.jobs.filter(job => this.activeJobs.has(job.id));
  }

  async getCompleted(start = 0, end = -1) {
    return end === -1 ? 
      [...this.completedJobs] : 
      this.completedJobs.slice(start, end);
  }

  async getFailed(start = 0, end = -1) {
    return end === -1 ? 
      [...this.failedJobs] : 
      this.failedJobs.slice(start, end);
  }

  async getDelayed() {
    return this.jobs.filter(job => Date.now() < (job.timestamp + job.delay));
  }

  /**
   * Clean old jobs
   */
  async clean(gracePeriod, count, type) {
    const now = Date.now();
    let cleanedCount = 0;

    if (type === 'completed') {
      const before = this.completedJobs.length;
      this.completedJobs = this.completedJobs.filter(
        job => (now - job.completedAt) <= gracePeriod
      );
      cleanedCount = before - this.completedJobs.length;
    } else if (type === 'failed') {
      const before = this.failedJobs.length;
      this.failedJobs = this.failedJobs.filter(
        job => (now - job.failedAt) <= gracePeriod
      );
      cleanedCount = before - this.failedJobs.length;
    }

    console.log(`🧹 Fallback queue: Cleaned ${cleanedCount} ${type} jobs`);
    return { cleaned: cleanedCount };
  }

  /**
   * Get queue stats
   */
  async getStats() {
    return {
      waiting: this.jobs.length,
      active: this.activeJobs.size,
      completed: this.completedJobs.length,
      failed: this.failedJobs.length,
      delayed: this.jobs.filter(job => Date.now() < (job.timestamp + job.delay)).length
    };
  }
}

module.exports = {
  FallbackQueue
};