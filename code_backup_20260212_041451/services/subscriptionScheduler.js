const cron = require('node-cron');
const db = require('../models');

/**
 * Subscription Scheduler Service
 *
 * This service runs scheduled tasks to:
 * 1. Mark expired subscriptions as 'expired'
 * 2. Reset usage counters when a new term starts
 */

class SubscriptionScheduler {
  constructor() {
    this.tasks = [];
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    console.log('📅 Starting subscription scheduler...');

    // Run daily at midnight to check for expired subscriptions
    this.tasks.push(
      cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running daily subscription expiry check...');
        await this.checkExpiredSubscriptions();
      })
    );

    // Run hourly to check for expired subscriptions (more frequent for testing)
    this.tasks.push(
      cron.schedule('0 * * * *', async () => {
        console.log('🔄 Running hourly subscription expiry check...');
        await this.checkExpiredSubscriptions();
      })
    );

    console.log('✅ Subscription scheduler started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    console.log('🛑 Stopping subscription scheduler...');
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    console.log('✅ Subscription scheduler stopped');
  }

  /**
   * Check for expired subscriptions and mark them as expired
   */
  async checkExpiredSubscriptions() {
    try {
      // Find all active subscriptions that have passed their end_date
      const expiredSubs = await db.sequelize.query(
        `SELECT
          ms.id,
          ms.school_id,
          mp.service_type,
          mp.package_name,
          ms.end_date,
          ms.messages_used,
          ms.total_messages
         FROM messaging_subscriptions ms
         JOIN messaging_packages mp ON ms.package_id = mp.id
         WHERE ms.status = 'active'
           AND ms.end_date < CURDATE()`,
        {
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (expiredSubs.length === 0) {
        console.log('✅ No expired subscriptions found');
        return;
      }

      console.log(`⚠️ Found ${expiredSubs.length} expired subscription(s)`);

      // Mark each expired subscription as 'expired'
      for (const sub of expiredSubs) {
        await db.sequelize.query(
          `UPDATE messaging_subscriptions
           SET status = 'expired'
           WHERE id = ?`,
          {
            replacements: [sub.id],
            type: db.sequelize.QueryTypes.UPDATE
          }
        );

        console.log(
          `📝 Marked subscription as expired: School ${sub.school_id}, ` +
          `${sub.service_type} ${sub.package_name}, ` +
          `Used ${sub.messages_used}/${sub.total_messages} messages, ` +
          `Ended: ${sub.end_date}`
        );

        // Log the expiry event
        await db.sequelize.query(
          `INSERT INTO messaging_usage
           (school_id, subscription_id, service_type, message_count, cost, created_at)
           VALUES (?, ?, ?, 0, 0, NOW())`,
          {
            replacements: [
              sub.school_id,
              sub.id,
              `${sub.service_type}_expired`
            ],
            type: db.sequelize.QueryTypes.INSERT
          }
        );
      }

      console.log(`✅ Successfully marked ${expiredSubs.length} subscription(s) as expired`);
    } catch (error) {
      console.error('❌ Error checking expired subscriptions:', error);
    }
  }

  /**
   * Manually trigger expiry check (useful for testing or admin actions)
   */
  async manualExpiryCheck() {
    console.log('🔧 Manually triggering expiry check...');
    await this.checkExpiredSubscriptions();
  }

  /**
   * Reset subscription usage for a new term
   * This should be called when a school starts a new term
   */
  async resetTermUsage(schoolId, academicYear, term) {
    try {
      console.log(`🔄 Resetting term usage for school ${schoolId}, Year: ${academicYear}, Term: ${term}`);

      // For termly subscriptions, we don't reset - they expire at term end
      // New subscriptions need to be purchased for the new term
      // This is by design for the billing model

      // However, we can create a log entry for the new term start
      await db.sequelize.query(
        `INSERT INTO messaging_usage
         (school_id, subscription_id, service_type, message_count, cost, created_at)
         VALUES (?, NULL, 'term_start', 0, 0, NOW())`,
        {
          replacements: [schoolId],
          type: db.sequelize.QueryTypes.INSERT
        }
      );

      console.log(`✅ Logged new term start for school ${schoolId}`);
    } catch (error) {
      console.error('❌ Error resetting term usage:', error);
    }
  }

  /**
   * Get subscription expiry warnings (subscriptions expiring within X days)
   */
  async getExpiryWarnings(daysThreshold = 7) {
    try {
      const warnings = await db.sequelize.query(
        `SELECT
          ms.id,
          ms.school_id,
          mp.service_type,
          mp.package_name,
          mp.package_type,
          ms.start_date,
          ms.end_date,
          ms.messages_used,
          ms.total_messages,
          DATEDIFF(ms.end_date, CURDATE()) as days_remaining,
          ss.school_name,
          ss.email as school_email
         FROM messaging_subscriptions ms
         JOIN messaging_packages mp ON ms.package_id = mp.id
         LEFT JOIN school_setup ss ON ms.school_id = ss.school_id
         WHERE ms.status = 'active'
           AND DATEDIFF(ms.end_date, CURDATE()) <= ?
           AND DATEDIFF(ms.end_date, CURDATE()) >= 0
         ORDER BY ms.end_date ASC`,
        {
          replacements: [daysThreshold],
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      return warnings;
    } catch (error) {
      console.error('❌ Error getting expiry warnings:', error);
      return [];
    }
  }
}

// Create singleton instance
const subscriptionScheduler = new SubscriptionScheduler();

module.exports = subscriptionScheduler;
