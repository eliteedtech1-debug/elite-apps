const cron = require('node-cron');
const chatbotActionsService = require('./chatbotActionsService');

class ChatbotSchedulerService {
  constructor() {
    this.schedules = new Map();
    this.loadSchedules();
  }

  loadSchedules() {
    // Daily attendance at 8 AM
    cron.schedule('0 8 * * *', () => {
      this.sendScheduledReport('attendance_summary', 'daily');
    });

    // Weekly financial summary on Friday at 5 PM
    cron.schedule('0 17 * * 5', () => {
      this.sendScheduledReport('financial_summary', 'weekly');
    });

    // Monthly summary on 1st of month at 9 AM
    cron.schedule('0 9 1 * *', () => {
      this.sendScheduledReport('monthly_summary', 'monthly');
    });

    console.log('✅ Chatbot scheduler initialized');
  }

  async sendScheduledReport(reportType, frequency) {
    console.log(`📊 Sending scheduled ${reportType} (${frequency})`);
    
    // Get all schools/branches that have auto-reports enabled
    // This would query a settings table in production
    const subscribers = await this.getSubscribers(reportType);
    
    for (const subscriber of subscribers) {
      try {
        const context = {
          schoolId: subscriber.school_id,
          branchId: subscriber.branch_id,
          userType: subscriber.user_type
        };

        let report;
        switch(reportType) {
          case 'attendance_summary':
            report = await chatbotActionsService.getAttendanceSummary(context);
            break;
          case 'financial_summary':
            report = await chatbotActionsService.getFinancialSummary('this week', context);
            break;
          case 'monthly_summary':
            report = await this.getMonthlyReport(context);
            break;
        }

        // Send via configured channel (email, SMS, WhatsApp)
        await this.sendReport(subscriber, report);
        
        console.log(`✅ Sent ${reportType} to ${subscriber.email}`);
      } catch (error) {
        console.error(`❌ Failed to send ${reportType} to ${subscriber.email}:`, error.message);
      }
    }
  }

  async getSubscribers(reportType) {
    // Mock data - in production, query from chatbot_schedules table
    return [
      {
        user_id: 1208,
        school_id: 'SCH/23',
        branch_id: 'BRCH/29',
        user_type: 'branchadmin',
        email: 'admin@school.com',
        phone: '+234...',
        channel: 'email',
        report_types: ['attendance_summary', 'financial_summary']
      }
    ];
  }

  async sendReport(subscriber, report) {
    // Send via configured channel
    switch(subscriber.channel) {
      case 'email':
        return await this.sendEmail(subscriber.email, report);
      case 'sms':
        return await this.sendSMS(subscriber.phone, report);
      case 'whatsapp':
        return await this.sendWhatsApp(subscriber.phone, report);
      default:
        console.log('No channel configured');
    }
  }

  async sendEmail(email, report) {
    console.log(`📧 Sending email to ${email}`);
    // Email implementation here
    return true;
  }

  async sendSMS(phone, report) {
    console.log(`📱 Sending SMS to ${phone}`);
    // SMS implementation here
    return true;
  }

  async sendWhatsApp(phone, report) {
    console.log(`💬 Sending WhatsApp to ${phone}`);
    // WhatsApp implementation here
    return true;
  }

  async getMonthlyReport(context) {
    const attendance = await chatbotActionsService.getAttendanceSummary(context);
    const financial = await chatbotActionsService.getFinancialSummary('this month', context);
    const performance = await chatbotActionsService.getPerformanceSummary(context);

    return {
      text: `📊 **Monthly Summary**

${attendance.text}

---

${financial.text}

---

${performance.text}`,
      intent: 'monthly_summary',
      confidence: 0.95
    };
  }

  // User commands to manage schedules
  async setupSchedule(userId, reportType, frequency, time, channel) {
    // Save to database
    console.log(`✅ Schedule created: ${reportType} ${frequency} at ${time} via ${channel}`);
    return {
      text: `✅ **Schedule Created**

Report: ${reportType}
Frequency: ${frequency}
Time: ${time}
Channel: ${channel}

You'll receive automatic reports starting tomorrow!`,
      intent: 'schedule_created',
      confidence: 0.95
    };
  }

  async listSchedules(userId) {
    // Query user's schedules from database
    const schedules = [
      { type: 'Attendance Summary', frequency: 'Daily', time: '8:00 AM', channel: 'Email' },
      { type: 'Financial Summary', frequency: 'Weekly', time: '5:00 PM Friday', channel: 'WhatsApp' }
    ];

    let text = '📅 **Your Scheduled Reports**\n\n';
    schedules.forEach((s, idx) => {
      text += `${idx + 1}. ${s.type}\n   • ${s.frequency} at ${s.time}\n   • Via ${s.channel}\n\n`;
    });

    return {
      text,
      intent: 'list_schedules',
      confidence: 0.95,
      actionButtons: [
        { type: 'action', label: '➕ Add Schedule', action: 'add_schedule' },
        { type: 'action', label: '🗑️ Remove Schedule', action: 'remove_schedule' }
      ]
    };
  }
}

module.exports = new ChatbotSchedulerService();
