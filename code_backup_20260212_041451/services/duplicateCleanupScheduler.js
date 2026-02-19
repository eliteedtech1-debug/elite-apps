const { schedulePeriodicCleanup } = require('../controllers/duplicateCleanupController');

/**
 * Duplicate Cleanup Scheduler Service
 * 
 * This service initializes and manages the periodic cleanup of duplicate entries.
 * It should be called when the application starts.
 */

let schedulerInitialized = false;

/**
 * Initialize the duplicate cleanup scheduler
 */
const initializeScheduler = () => {
  if (schedulerInitialized) {
    console.log('⚠️  Duplicate cleanup scheduler already initialized');
    return;
  }

  try {
    console.log('🚀 Initializing duplicate cleanup scheduler...');
    
    // Start the periodic cleanup scheduler
    schedulePeriodicCleanup();
    
    schedulerInitialized = true;
    
    console.log('✅ Duplicate cleanup scheduler initialized successfully');
    console.log('📅 Schedule:');
    console.log('   - Daily dry run: Every day at 2:00 AM');
    console.log('   - Weekly cleanup: Every Sunday at 3:00 AM');
    
  } catch (error) {
    console.error('❌ Failed to initialize duplicate cleanup scheduler:', error);
    throw error;
  }
};

/**
 * Check if scheduler is initialized
 */
const isSchedulerInitialized = () => {
  return schedulerInitialized;
};

/**
 * Get scheduler status
 */
const getSchedulerStatus = () => {
  return {
    initialized: schedulerInitialized,
    schedules: {
      daily_dry_run: {
        enabled: schedulerInitialized,
        schedule: '0 2 * * *', // Every day at 2 AM
        description: 'Daily dry run to identify duplicates'
      },
      weekly_cleanup: {
        enabled: schedulerInitialized,
        schedule: '0 3 * * 0', // Every Sunday at 3 AM
        description: 'Weekly actual cleanup of duplicates'
      }
    },
    next_runs: schedulerInitialized ? {
      daily_dry_run: getNextRunTime('0 2 * * *'),
      weekly_cleanup: getNextRunTime('0 3 * * 0')
    } : null
  };
};

/**
 * Calculate next run time for a cron expression
 */
const getNextRunTime = (cronExpression) => {
  try {
    const cron = require('node-cron');
    
    // This is a simplified calculation - in production you might want to use a more robust library
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // Default to 2 AM tomorrow
    
    if (cronExpression === '0 2 * * *') {
      // Daily at 2 AM
      if (now.getHours() < 2) {
        // Today at 2 AM
        const today = new Date(now);
        today.setHours(2, 0, 0, 0);
        return today.toISOString();
      } else {
        // Tomorrow at 2 AM
        return tomorrow.toISOString();
      }
    } else if (cronExpression === '0 3 * * 0') {
      // Sunday at 3 AM
      const nextSunday = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7;
      if (daysUntilSunday === 0 && now.getHours() < 3) {
        // Today is Sunday and it's before 3 AM
        nextSunday.setHours(3, 0, 0, 0);
      } else {
        // Next Sunday
        nextSunday.setDate(now.getDate() + (daysUntilSunday || 7));
        nextSunday.setHours(3, 0, 0, 0);
      }
      return nextSunday.toISOString();
    }
    
    return tomorrow.toISOString();
  } catch (error) {
    console.error('Error calculating next run time:', error);
    return null;
  }
};

/**
 * Manual trigger for testing scheduler
 */
const triggerManualCleanup = async (dry_run = true) => {
  if (!schedulerInitialized) {
    throw new Error('Scheduler not initialized');
  }

  const { runScheduledCleanup } = require('../controllers/duplicateCleanupController');
  
  console.log(`🧹 Manual trigger: ${dry_run ? 'Dry run' : 'Actual'} cleanup...`);
  
  try {
    const result = await runScheduledCleanup(dry_run);
    console.log('✅ Manual cleanup completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    throw error;
  }
};

module.exports = {
  initializeScheduler,
  isSchedulerInitialized,
  getSchedulerStatus,
  triggerManualCleanup
};