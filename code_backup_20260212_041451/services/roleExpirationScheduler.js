const cron = require('node-cron');
const { runExpirationCheck } = require('./roleExpirationService');

/**
 * Role Expiration Scheduler
 * Runs daily to revoke expired roles and send expiration warnings
 */

class RoleExpirationScheduler {
  constructor() {
    this.task = null;
  }

  start() {
    console.log('📅 Starting role expiration scheduler...');

    // Run daily at 1 AM
    this.task = cron.schedule('0 1 * * *', async () => {
      console.log('🔄 Running role expiration check...');
      const result = await runExpirationCheck();
      console.log(`✅ Role expiration check complete: ${result.revoked} revoked, ${result.notified} warned`);
    });

    console.log('✅ Role expiration scheduler started');
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    console.log('🛑 Role expiration scheduler stopped');
  }
}

module.exports = new RoleExpirationScheduler();
