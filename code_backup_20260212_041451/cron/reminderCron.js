const cron = require('node-cron');
const reminderService = require('../services/reminderService');

console.log('🔔 Payment reminder cron job initialized');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('🔔 Running payment reminder job...');
  try {
    const result = await reminderService.sendPendingReminders(100);
    console.log(`✅ Reminder job complete: ${result.sent} sent, ${result.failed} failed`);
  } catch (error) {
    console.error('❌ Reminder job failed:', error);
  }
});

// Also run every hour during business hours (8 AM - 6 PM)
cron.schedule('0 8-18 * * *', async () => {
  console.log('🔔 Running hourly reminder check...');
  try {
    const result = await reminderService.sendPendingReminders(50);
    if (result.sent > 0) {
      console.log(`✅ Hourly check: ${result.sent} reminders sent`);
    }
  } catch (error) {
    console.error('❌ Hourly reminder check failed:', error);
  }
});

console.log('✅ Reminder cron jobs scheduled:');
console.log('   - Daily at 9 AM');
console.log('   - Hourly from 8 AM to 6 PM');

module.exports = {};
