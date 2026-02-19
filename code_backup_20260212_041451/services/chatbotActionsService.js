const { sequelize } = require('../models');
const chatbotVisualizationService = require('./chatbotVisualizationService');

class ChatbotActionsService {
  constructor() {
    this.userPatterns = new Map();
  }

  getContextualSuggestions(userId, currentTime = new Date()) {
    const hour = currentTime.getHours();
    const day = currentTime.getDay();
    const suggestions = [];

    // Morning suggestions (7-11 AM)
    if (hour >= 7 && hour < 11) {
      suggestions.push('📊 Check today\'s attendance');
      suggestions.push('📋 View absent students');
    }

    // Afternoon suggestions (12-3 PM)
    if (hour >= 12 && hour < 15) {
      suggestions.push('💰 Check today\'s revenue');
      suggestions.push('🎯 View class performance');
    }

    // End of day (4-6 PM)
    if (hour >= 16 && hour < 18) {
      suggestions.push('💳 Outstanding fees report');
      suggestions.push('📧 Send fee reminders');
    }

    // Friday suggestions
    if (day === 5) {
      suggestions.push('📊 Weekly financial summary');
      suggestions.push('📅 Schedule weekly reports');
    }

    // Month start (1st-3rd)
    const date = currentTime.getDate();
    if (date >= 1 && date <= 3) {
      suggestions.push('📈 Monthly summary report');
      suggestions.push('💳 Send monthly fee reminders');
    }

    // Always available
    suggestions.push('🔍 Navigate to page');
    
    return suggestions.slice(0, 4);
  }

  trackUserAction(userId, action) {
    if (!this.userPatterns.has(userId)) {
      this.userPatterns.set(userId, {
        actions: [],
        lastSeen: new Date(),
        preferences: {}
      });
    }

    const pattern = this.userPatterns.get(userId);
    pattern.actions.push({
      action,
      timestamp: new Date()
    });
    pattern.lastSeen = new Date();

    // Keep only last 50 actions
    if (pattern.actions.length > 50) {
      pattern.actions = pattern.actions.slice(-50);
    }

    // Update preferences
    this.updatePreferences(userId);
  }

  updatePreferences(userId) {
    const pattern = this.userPatterns.get(userId);
    if (!pattern) return;

    const actionCounts = {};
    pattern.actions.forEach(a => {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    });

    // Find most frequent actions
    const sorted = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    pattern.preferences.topActions = sorted.map(([action]) => action);
  }

  getPersonalizedSuggestions(userId) {
    const pattern = this.userPatterns.get(userId);
    if (!pattern || !pattern.preferences.topActions) {
      return this.getContextualSuggestions(userId);
    }

    const suggestions = [];
    const actionLabels = {
      'attendance_summary': '📊 Attendance summary',
      'financial_summary': '💰 Financial summary',
      'outstanding_fees': '💳 Outstanding fees',
      'absent_students': '📋 Absent students',
      'student_performance': '🎯 Performance report',
      'send_fee_reminders': '📧 Send fee reminders'
    };

    // Add user's top actions
    pattern.preferences.topActions.forEach(action => {
      if (actionLabels[action]) {
        suggestions.push(actionLabels[action]);
      }
    });

    // Fill with contextual suggestions
    const contextual = this.getContextualSuggestions(userId);
    contextual.forEach(s => {
      if (suggestions.length < 4 && !suggestions.includes(s)) {
        suggestions.push(s);
      }
    });

    return suggestions.slice(0, 4);
  }
  detectActionIntent(message) {
    const patterns = {
      attendance_summary: [
        'summarize attendance', 'attendance summary', 'attendance report',
        'how many present', 'attendance today', 'today attendance',
        'show attendance summary', 'attendance'
      ],
      attendance_trend: [
        'attendance trend', 'attendance graph', 'attendance chart',
        'show attendance trend', 'attendance over time'
      ],
      revenue_trend: [
        'revenue trend', 'revenue graph', 'revenue chart',
        'show revenue trend', 'revenue over time', 'payment trend'
      ],
      class_comparison: [
        'compare classes', 'class comparison', 'compare performance',
        'which class is best', 'class ranking'
      ],
      financial_summary: [
        'financial summary', 'revenue report', 'payments today',
        'how much collected', 'financial report', 'revenue today',
        'payments this week', 'payments this month', 'financial this week',
        'revenue', 'fees', 'payments', 'financial'
      ],
      student_performance: [
        'class performance', 'student performance', 'top students',
        'exam results', 'grade distribution', 'performance', 'results', 'grades'
      ],
      payroll_summary: [
        'payroll summary', 'salary summary', 'staff salaries', 'payroll report',
        'salary report', 'payroll', 'salaries', 'staff payment', 'payroll this month',
        'payroll last month', 'salary this month', 'salary last month'
      ],
      staff_payslip: [
        'payslip', 'my payslip', 'salary slip', 'payment slip', 'staff payslip'
      ],
      send_fee_reminders: [
        'send fee reminders', 'fee reminders', 'remind fees', 'payment reminders',
        'send payment reminders', 'remind about fees'
      ],
      bulk_mark_present: [
        'mark all present', 'mark everyone present', 'mark class present'
      ],
      bulk_send_sms: [
        'send sms to', 'send message to', 'notify parents'
      ],
      outstanding_fees: [
        'outstanding fees', 'unpaid fees', 'fee defaulters', 'who owes fees',
        'students with outstanding', 'pending payments'
      ],
      absent_students: [
        'absent students', 'who is absent', 'absent today', 'missing students',
        'students absent'
      ],
      setup_schedule: [
        'schedule report', 'auto report', 'send me daily', 'send me weekly',
        'automatic report', 'schedule summary'
      ],
      list_schedules: [
        'my schedules', 'show schedules', 'list schedules', 'scheduled reports'
      ],
      generate_invoice: [
        'generate invoice', 'create invoice', 'make invoice', 'create bill', 'invoice'
      ],
      generate_report: [
        'generate report', 'create report', 'end of term report', 'report card',
        'student report', 'class report', 'exam report', 'ca report'
      ],
      generate_receipt: [
        'generate receipt', 'create receipt', 'make receipt', 'receipt'
      ]
    };

    const normalized = message.toLowerCase().trim();
    
    for (const [intent, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => normalized === keyword || normalized.includes(keyword))) {
        return intent;
      }
    }
    
    return null;
  }

  async processAction(message, userId, context) {
    const intent = this.detectActionIntent(message);
    
    if (!intent) return null;
    
    // Track user action for personalization
    this.trackUserAction(userId, intent);
    
    try {
      let result;
      switch(intent) {
        case 'attendance_summary':
          result = await this.getAttendanceSummary(context);
          break;
        case 'attendance_trend':
          result = await this.getAttendanceTrendChart(context);
          break;
        case 'revenue_trend':
          result = await this.getRevenueTrendChart(context);
          break;
        case 'class_comparison':
          result = await this.getClassComparisonChart(context);
          break;
        case 'financial_summary':
          result = await this.getFinancialSummary(message, context);
          break;
        case 'student_performance':
          result = await this.getPerformanceSummary(context);
          break;
        case 'payroll_summary':
          result = await this.getPayrollSummary(message, context);
          break;
        case 'staff_payslip':
          result = await this.getStaffPayslip(userId, context);
          break;
        case 'outstanding_fees':
          result = await this.getOutstandingFees(context);
          break;
        case 'absent_students':
          result = await this.getAbsentStudents(context);
          break;
        case 'send_fee_reminders':
          result = await this.sendFeeReminders(message, userId, context);
          break;
        case 'bulk_mark_present':
          result = await this.bulkMarkPresent(message, userId, context);
          break;
        case 'bulk_send_sms':
          result = await this.bulkSendSMS(message, userId, context);
          break;
        case 'setup_schedule':
          result = await this.setupSchedulePrompt(message);
          break;
        case 'list_schedules':
          result = await this.listSchedules(userId);
          break;
        case 'generate_invoice':
          result = await this.generateInvoiceFlow(message, userId, context);
          break;
        case 'generate_report':
          result = await this.generateReportFlow(message, userId, context);
          break;
        default:
          return null;
      }

      // Add personalized suggestions to result
      if (result && !result.suggestions) {
        result.suggestions = this.getPersonalizedSuggestions(userId);
      }

      return result;
    } catch (error) {
      console.error('Chatbot action error:', error);
      return {
        text: "I encountered an error processing your request. Please try again or contact support.",
        intent: 'action_error',
        confidence: 0.5,
        suggestions: this.getContextualSuggestions(userId)
      };
    }
  }

  async getAttendanceSummary(context) {
    const today = new Date().toISOString().split('T')[0];
    
    const studentQuery = `
      SELECT 
        COUNT(DISTINCT admission_no) as total_students,
        SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'L' THEN 1 ELSE 0 END) as late
      FROM attendance_records
      WHERE DATE(attendance_date) = ? 
        AND school_id = ? 
        AND branch_id = ?
    `;
    
    const staffQuery = `
      SELECT 
        COUNT(DISTINCT staff_id) as total_staff,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
      FROM staff_attendance
      WHERE DATE(date) = ? 
        AND school_id = ? 
        AND branch_id = ?
    `;
    
    const [studentResults] = await sequelize.query(studentQuery, {
      replacements: [today, context.schoolId, context.branchId]
    });
    
    const [staffResults] = await sequelize.query(staffQuery, {
      replacements: [today, context.schoolId, context.branchId]
    });
    
    const students = studentResults[0] || { total_students: 0, present: 0, absent: 0, late: 0 };
    const staff = staffResults[0] || { total_staff: 0, present: 0, absent: 0 };
    
    const studentPercentage = students.total_students > 0 
      ? Math.round((students.present / students.total_students) * 100) 
      : 0;
    const staffPercentage = staff.total_staff > 0 
      ? Math.round((staff.present / staff.total_staff) * 100) 
      : 0;
    
    const text = `📊 **Attendance Summary** - ${new Date().toLocaleDateString()}

👨‍🎓 **Students:**
• Present: ${students.present}/${students.total_students} (${studentPercentage}%)
• Absent: ${students.absent}
• Late: ${students.late}

👨‍🏫 **Staff:**
• Present: ${staff.present}/${staff.total_staff} (${staffPercentage}%)
• Absent: ${staff.absent}

${studentPercentage >= 90 ? '✅ Excellent attendance!' : studentPercentage >= 75 ? '⚠️ Good attendance' : '❌ Low attendance - action needed'}`;

    return {
      text,
      intent: 'attendance_summary',
      confidence: 0.95,
      actionButtons: [
        { type: 'download', label: '📥 Download Report', action: 'download_attendance' },
        { type: 'details', label: '📊 View Details', action: 'view_attendance_details' }
      ],
      data: { students, staff, date: today }
    };
  }

  async getFinancialSummary(message, context) {
    let period = 'today';
    let startDate, endDate;
    const today = new Date();
    
    if (message.includes('week')) {
      period = 'week';
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      startDate = weekStart.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else if (message.includes('month')) {
      period = 'month';
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else {
      startDate = endDate = today.toISOString().split('T')[0];
    }
    
    const revenueQuery = `
      SELECT 
        SUM(dr) as total_revenue,
        COUNT(*) as payment_count
      FROM payment_entries
      WHERE DATE(created_at) BETWEEN ? AND ?
        AND school_id = ? 
        AND branch_id = ?
        AND payment_status = 'Paid'
        AND dr > 0
    `;
    
    const expenditureQuery = `
      SELECT 
        SUM(net_pay) as total_expenditure,
        COUNT(*) as payroll_count
      FROM payroll_lines
      WHERE DATE(created_at) BETWEEN ? AND ?
        AND school_id = ? 
        AND branch_id = ?
        AND is_processed = 1
    `;
    
    const [revenueResults] = await sequelize.query(revenueQuery, {
      replacements: [startDate, endDate, context.schoolId, context.branchId]
    });
    
    const [expenditureResults] = await sequelize.query(expenditureQuery, {
      replacements: [startDate, endDate, context.schoolId, context.branchId]
    });
    
    const revenue = revenueResults[0]?.total_revenue || 0;
    const expenditure = expenditureResults[0]?.total_expenditure || 0;
    const net = revenue - expenditure;
    const paymentCount = revenueResults[0]?.payment_count || 0;
    
    const formatCurrency = (amount) => `₦${Number(amount).toLocaleString()}`;
    
    const text = `💰 **Financial Summary** - ${period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}

**Revenue:** ${formatCurrency(revenue)}
• Payments received: ${paymentCount}

**Expenditure:** ${formatCurrency(expenditure)}

**Net:** ${formatCurrency(net)} ${net >= 0 ? '📈' : '📉'}

${net >= 0 ? '✅ Positive cash flow' : '⚠️ Negative cash flow'}`;

    return {
      text,
      intent: 'financial_summary',
      confidence: 0.95,
      actionButtons: [
        { type: 'download', label: '📥 Download Report', action: 'download_financial' },
        { type: 'details', label: '📊 View Breakdown', action: 'view_financial_details' }
      ],
      data: { revenue, expenditure, net, period, startDate, endDate }
    };
  }

  async getPerformanceSummary(context) {
    // Get current term from academic_calendar
    const calendarQuery = `
      SELECT term, academic_year 
      FROM academic_calendar 
      WHERE school_id = ? 
        AND branch_id = ? 
        AND status = 'active' 
      LIMIT 1
    `;
    
    const [calendarResults] = await sequelize.query(calendarQuery, {
      replacements: [context.schoolId, context.branchId]
    });
    
    const currentTerm = calendarResults[0]?.term || context.term || 'First Term';
    const academicYear = calendarResults[0]?.academic_year || context.academicYear || '2025-2026';
    
    const performanceQuery = `
      SELECT 
        COUNT(DISTINCT w.admission_no) as total_students,
        AVG((w.score/w.max_score)*100) as average_score,
        SUM(CASE WHEN (w.score/w.max_score)*100 >= 80 THEN 1 ELSE 0 END) as excellent,
        SUM(CASE WHEN (w.score/w.max_score)*100 >= 70 AND (w.score/w.max_score)*100 < 80 THEN 1 ELSE 0 END) as good,
        SUM(CASE WHEN (w.score/w.max_score)*100 >= 60 AND (w.score/w.max_score)*100 < 70 THEN 1 ELSE 0 END) as fair,
        SUM(CASE WHEN (w.score/w.max_score)*100 < 60 THEN 1 ELSE 0 END) as poor
      FROM weekly_scores w
      WHERE w.term = ? 
        AND w.academic_year = ?
        AND w.school_id = ? 
        AND w.branch_id = ?
    `;
    
    const topStudentsQuery = `
      SELECT 
        s.student_name,
        AVG((w.score/w.max_score)*100) as average_score,
        w.class_code
      FROM weekly_scores w
      JOIN students s ON w.admission_no = s.admission_no
      WHERE w.term = ? 
        AND w.academic_year = ?
        AND w.school_id = ? 
        AND w.branch_id = ?
      GROUP BY s.student_name, w.class_code
      ORDER BY average_score DESC
      LIMIT 3
    `;
    
    const [performanceResults] = await sequelize.query(performanceQuery, {
      replacements: [currentTerm, academicYear, context.schoolId, context.branchId]
    });
    
    const [topStudents] = await sequelize.query(topStudentsQuery, {
      replacements: [currentTerm, academicYear, context.schoolId, context.branchId]
    });
    
    const perf = performanceResults[0] || { 
      total_students: 0, average_score: 0, excellent: 0, good: 0, fair: 0, poor: 0 
    };
    
    const avgScore = Math.round(perf.average_score || 0);
    
    let topStudentsText = '';
    if (topStudents.length > 0) {
      topStudentsText = '\n\n**Top 3 Students:**\n';
      topStudents.forEach((student, idx) => {
        topStudentsText += `${idx + 1}. ${student.first_name} ${student.last_name} - ${Math.round(student.total_score)}% (${student.class_name})\n`;
      });
    }
    
    const text = `🎓 **Performance Summary** - ${currentTerm}

**Class Average:** ${avgScore}%

**Grade Distribution:**
• Excellent (80-100): ${perf.excellent} students
• Good (70-79): ${perf.good} students
• Fair (60-69): ${perf.fair} students
• Poor (<60): ${perf.poor} students
${topStudentsText}
${avgScore >= 75 ? '✅ Excellent overall performance!' : avgScore >= 60 ? '⚠️ Good performance' : '❌ Performance needs improvement'}`;

    return {
      text,
      intent: 'student_performance',
      confidence: 0.95,
      actionButtons: [
        { type: 'download', label: '📥 Full Report', action: 'download_performance' },
        { type: 'details', label: '📊 Class Breakdown', action: 'view_class_performance' }
      ],
      data: { performance: perf, topStudents, term: currentTerm }
    };
  }

  async getAttendanceTrendChart(context) {
    const data = await chatbotVisualizationService.getAttendanceTrend(context, 7);
    const chart = chatbotVisualizationService.generateBarChart(data);
    const trend = chatbotVisualizationService.generateTrendLine(data);
    const sparkline = chatbotVisualizationService.generateSparkline(data.map(d => d.value));

    const avgRate = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const today = data[data.length - 1];
    const yesterday = data[data.length - 2];
    const change = today.value - yesterday.value;

    return {
      text: `📊 **Attendance Trend (Last 7 Days)**
${chart}
**Trend:** ${trend}
**Sparkline:** ${sparkline}

**Average:** ${avgRate.toFixed(1)}%
**Today:** ${today.value.toFixed(1)}% (${change > 0 ? '+' : ''}${change.toFixed(1)}% from yesterday)

${avgRate >= 85 ? '✅ Excellent attendance' : avgRate >= 75 ? '⚠️ Good attendance' : '❌ Needs improvement'}`,
      intent: 'attendance_trend',
      confidence: 0.95,
      data
    };
  }

  async getRevenueTrendChart(context) {
    const data = await chatbotVisualizationService.getRevenueTrend(context, 7);
    const chart = chatbotVisualizationService.generateBarChart(data);
    const trend = chatbotVisualizationService.generateTrendLine(data);
    const sparkline = chatbotVisualizationService.generateSparkline(data.map(d => d.value));

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const avg = total / data.length;
    const today = data[data.length - 1];

    return {
      text: `💰 **Revenue Trend (Last 7 Days)**
${chart}
**Trend:** ${trend}
**Sparkline:** ${sparkline}

**Total:** ₦${total.toLocaleString()}
**Daily Average:** ₦${avg.toLocaleString()}
**Today:** ₦${today.value.toLocaleString()}

${trend.includes('📈') ? '✅ Revenue growing' : trend.includes('📉') ? '⚠️ Revenue declining' : '➡️ Revenue stable'}`,
      intent: 'revenue_trend',
      confidence: 0.95,
      data
    };
  }

  async getClassComparisonChart(context) {
    const data = await chatbotVisualizationService.getClassComparison(context);
    const chart = chatbotVisualizationService.generateBarChart(data);

    const best = data[0];
    const worst = data[data.length - 1];
    const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;

    return {
      text: `🎯 **Class Performance Comparison**
${chart}
**Best:** ${best.label} (${best.value.toFixed(1)}%)
**Worst:** ${worst.label} (${worst.value.toFixed(1)}%)
**Average:** ${avg.toFixed(1)}%

💡 **Insight:** ${best.label} outperforms by ${(best.value - avg).toFixed(1)}%`,
      intent: 'class_comparison',
      confidence: 0.95,
      data
    };
  }

  async getPayrollSummary(message, context) {
    // Extract period from message (default to current month)
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    // Check for specific month/year in message
    const monthMatch = message.match(/(\d{4})-(\d{2})/);
    if (monthMatch) {
      year = parseInt(monthMatch[1]);
      month = parseInt(monthMatch[2]);
    } else if (message.includes('last month')) {
      month = month === 1 ? 12 : month - 1;
      year = month === 12 ? year - 1 : year;
    }

    const periodMonth = `${year}-${String(month).padStart(2, '0')}`;

    const query = `
      SELECT 
        COUNT(DISTINCT pl.staff_id) as total_staff,
        SUM(pl.basic_salary) as total_basic,
        SUM(pl.net_pay) as total_net,
        AVG(pl.net_pay) as avg_salary,
        SUM(pl.total_allowances) as total_allowances,
        SUM(pl.total_deductions) as total_deductions,
        SUM(pl.total_loans) as total_loans,
        pp.status as period_status,
        SUM(CASE WHEN pl.is_processed = 1 THEN 1 ELSE 0 END) as processed_count
      FROM payroll_lines pl
      JOIN payroll_periods pp ON pl.period_id = pp.period_id
      WHERE pl.school_id = ?
        AND pl.branch_id = ?
        AND pp.period_month = ?
      GROUP BY pp.status
    `;

    const [summary] = await sequelize.query(query, {
      replacements: [context.schoolId, context.branchId, periodMonth]
    });

    const data = summary[0];
    
    // If no data for current month, check for latest available period
    if (!data || !data.total_staff || Number(data.total_staff) === 0) {
      const [latestPeriod] = await sequelize.query(`
        SELECT pp.period_month, pp.status, COUNT(pl.payroll_line_id) as line_count
        FROM payroll_periods pp
        JOIN payroll_lines pl ON pp.period_id = pl.period_id
        WHERE pl.school_id = ? AND pl.branch_id = ?
        GROUP BY pp.period_month, pp.status
        ORDER BY pp.period_month DESC
        LIMIT 1
      `, {
        replacements: [context.schoolId, context.branchId]
      });

      if (latestPeriod && latestPeriod.length > 0) {
        const latest = latestPeriod[0];
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
        return {
          text: `💼 **Payroll Summary - ${monthName} ${year}**

⚠️ No payroll data for ${monthName} ${year}

**Latest Available:** ${latest.period_month} (${latest.line_count} staff, Status: ${latest.status})

Click below to view:`,
          intent: 'payroll_no_data',
          confidence: 0.95,
          suggestions: [
            `payroll ${latest.period_month}`,
            'Show all periods'
          ],
          data: { latestPeriod: latest.period_month }
        };
      }
    }

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    
    // Determine status
    let statusEmoji = '';
    let statusMessage = '';
    
    switch(data.period_status) {
      case 'initiated':
        statusEmoji = '🔵';
        statusMessage = 'Initiated (Not yet processed)';
        break;
      case 'approved':
        statusEmoji = '✅';
        statusMessage = 'Approved';
        break;
      case 'locked':
        statusEmoji = '🔒';
        statusMessage = 'Locked';
        break;
      case 'disbursed':
        statusEmoji = '💰';
        statusMessage = 'Disbursed';
        break;
      default:
        statusEmoji = '⏳';
        statusMessage = data.period_status || 'Pending';
    }

    const text = `💼 **Payroll Summary - ${monthName} ${year}**

**Status:** ${statusEmoji} ${statusMessage}
**Total Staff:** ${data.total_staff || 0}
**Processed:** ${data.processed_count || 0} of ${data.total_staff || 0}

**Financial Summary:**
• Total Basic Salary: ₦${Number(data.total_basic || 0).toLocaleString()}
• Total Net Salary: ₦${Number(data.total_net || 0).toLocaleString()}
• Average Salary: ₦${Number(data.avg_salary || 0).toLocaleString()}

**Breakdown:**
• Allowances: ₦${Number(data.total_allowances || 0).toLocaleString()}
• Deductions: ₦${Number(data.total_deductions || 0).toLocaleString()}
• Loans Recovered: ₦${Number(data.total_loans || 0).toLocaleString()}

${data.total_staff > 0 ? '✅ Payroll processed' : '⚠️ No payroll data'}`;

    return {
      text,
      intent: 'payroll_summary',
      confidence: 0.95,
      actionButtons: [
        { type: 'download', label: '📥 Download Report', action: 'download_payroll' },
        { type: 'details', label: '📊 View Details', action: 'view_payroll_details' },
        { type: 'action', label: '💳 Individual Payslips', action: 'view_payslips' }
      ],
      data: { ...data, period: `${monthName} ${year}`, periodMonth }
    };
  }

  async getStaffPayslip(userId, context) {
    // Get staff info from userId
    const [staff] = await sequelize.query(`
      SELECT s.id, s.first_name, s.last_name, s.staff_id
      FROM staff s
      JOIN user_accounts ua ON s.staff_id = ua.staff_id
      WHERE ua.id = ?
    `, {
      replacements: [userId]
    });

    if (!staff || staff.length === 0) {
      return {
        text: '⚠️ **No Staff Record Found**\n\nThis feature is only available for staff members.',
        intent: 'payslip_not_found',
        confidence: 0.9
      };
    }

    const staffData = staff[0];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const query = `
      SELECT 
        pl.*,
        s.first_name,
        s.last_name,
        s.staff_id as employee_id,
        gl.name as grade_level,
        gl.step
      FROM payroll_lines pl
      JOIN staff s ON pl.staff_id = s.id
      LEFT JOIN grade_levels gl ON s.grade_level_id = gl.id
      WHERE pl.staff_id = ?
        AND pl.school_id = ?
        AND pl.branch_id = ?
        AND DATE_FORMAT(pl.created_at, '%Y-%m') = ?
        AND pl.is_processed = 1
      ORDER BY pl.created_at DESC
      LIMIT 1
    `;

    const [payslip] = await sequelize.query(query, {
      replacements: [staffData.id, context.schoolId, context.branchId, currentMonth]
    });

    if (!payslip || payslip.length === 0) {
      return {
        text: `💳 **No Payslip Available**

No processed payslip found for ${staffData.first_name} ${staffData.last_name} this month.

Please contact HR or check back later.`,
        intent: 'payslip_not_available',
        confidence: 0.9,
        suggestions: ['Contact HR', 'View last month payslip']
      };
    }

    const slip = payslip[0];
    const monthName = new Date(slip.created_at).toLocaleString('default', { month: 'long', year: 'numeric' });

    const text = `💳 **Payslip - ${monthName}**

**Employee Details:**
• Name: ${slip.first_name} ${slip.last_name}
• Employee ID: ${slip.employee_id}
• Grade Level: ${slip.grade_level || 'N/A'}
• Step: ${slip.step || 'N/A'}

**Earnings:**
• Basic Salary: ₦${Number(slip.basic_salary || 0).toLocaleString()}
• Allowances: ₦${Number(slip.total_allowances || 0).toLocaleString()}
• **Gross Pay:** ₦${Number((slip.basic_salary || 0) + (slip.total_allowances || 0)).toLocaleString()}

**Deductions:**
• Total Deductions: ₦${Number(slip.total_deductions || 0).toLocaleString()}
• Loan Recovery: ₦${Number(slip.total_loans || 0).toLocaleString()}

**Net Pay:** ₦${Number(slip.net_pay || 0).toLocaleString()}

Status: ${slip.is_processed ? '✅ Processed' : '⏳ Pending'}`;

    return {
      text,
      intent: 'staff_payslip',
      confidence: 0.95,
      actionButtons: [
        { type: 'download', label: '📥 Download Payslip', action: 'download_payslip' },
        { type: 'action', label: '📧 Email Payslip', action: 'email_payslip' },
        { type: 'details', label: '📊 View Breakdown', action: 'view_payslip_breakdown' }
      ],
      data: slip
    };
  }

  async generateReportFlow(message, userId, context) {
    // Parse message for class, term, year, report type
    const classMatch = message.match(/JSS\d|SS\d|PRIMARY\s*\d/i);
    const termMatch = message.match(/term\s*(\d)/i);
    const yearMatch = message.match(/20\d{2}/);
    const reportTypeMatch = message.match(/ca\d|exam|broadsheet|end of term|end of session/i);

    if (!classMatch) {
      return {
        text: `📊 **Generate Report**

Please specify:
• Class (e.g., JSS1, SS2, PRIMARY 3)
• Report Type (CA1, CA2, EXAM, Broadsheet)
• Term (optional)
• Year (optional)

**Examples:**
"Generate JSS1 end of term report"
"Create SS2 CA1 report Term 1 2026"
"Generate PRIMARY 3 exam report"`,
        intent: 'generate_report_prompt',
        confidence: 0.90,
        suggestions: [
          'Generate JSS1 exam report',
          'Generate SS2 CA1 report',
          'Cancel'
        ]
      };
    }

    const className = classMatch[0].toUpperCase().replace(/\s+/g, ' ');
    const term = termMatch ? `Term ${termMatch[1]}` : 'Term 1';
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
    
    let reportType = 'EXAM';
    let endpoint = 'reports/end_of_term_report';
    let requestData = {};

    if (reportTypeMatch) {
      const type = reportTypeMatch[0].toLowerCase();
      if (type.includes('ca')) {
        reportType = type.toUpperCase();
        endpoint = 'reports/class-ca';
        requestData = {
          query_type: 'View Class CA Report',
          class_code: className,
          ca_type: reportType,
          academic_year: year,
          term: term
        };
      } else if (type.includes('broadsheet')) {
        reportType = 'BROADSHEET';
        requestData = {
          queryType: 'class',
          admissionNo: null,
          classCode: className,
          academicYear: year,
          term: term,
          reportType: 'BROADSHEET'
        };
      } else if (type.includes('session')) {
        reportType = 'END_OF_SESSION_AGGREGATE';
        endpoint = 'reports/end_of_session_aggregate';
        requestData = {
          queryType: 'class',
          admissionNo: null,
          classCode: className,
          academicYear: year
        };
      } else {
        requestData = {
          queryType: 'class',
          admissionNo: null,
          classCode: className,
          academicYear: year,
          term: term
        };
      }
    } else {
      requestData = {
        queryType: 'class',
        admissionNo: null,
        classCode: className,
        academicYear: year,
        term: term
      };
    }

    try {
      // This would call the actual report generation API
      // For now, return a success message with download link
      
      return {
        text: `📊 **Report Generation Started**

**Class:** ${className}
**Report Type:** ${reportType}
**Term:** ${term}
**Year:** ${year}

⏳ Generating report...

This may take a few moments depending on class size.

**Note:** The actual PDF generation happens in the frontend.
You can:
1. Go to Reports page
2. Select ${className}
3. Click "Generate Report"

Or I can guide you there!`,
        intent: 'generate_report_info',
        confidence: 0.95,
        navigationLink: '/academic/examinations/exam-results/end-of-term-report',
        actionButtons: [
          { type: 'action', label: '📧 Email When Ready', action: 'email_report' }
        ],
        suggestions: [
          'Generate another report',
          'Show me student list',
          'Cancel'
        ],
        data: {
          className,
          reportType,
          term,
          year,
          endpoint,
          requestData
        }
      };

    } catch (error) {
      console.error('Report generation error:', error);
      return {
        text: `❌ **Report Generation Failed**

Error: ${error.message}

Please try:
• Check if class has students
• Verify exam results are entered
• Ensure term/year are correct

Or navigate to Reports page manually.`,
        intent: 'report_generation_error',
        confidence: 0.5,
        suggestions: ['Try again', 'Navigate to reports page']
      };
    }
  }

  async generateInvoiceFlow(message, userId, context) {
    return {
      text: `🧾 **Invoice Generation**

To generate an invoice, I need some information:

1. Student name or ID
2. Term (e.g., Term 1, Term 2)
3. Academic year

Please provide the student details, for example:
"Generate invoice for John Doe, Term 1, 2025/2026"

Or you can use the main system to generate invoices with more options.`,
      intent: 'generate_invoice_prompt',
      confidence: 0.90,
      suggestions: [
        'Navigate to invoice page',
        'Show me payment records',
        'Never mind'
      ]
    };
  }

  async getOutstandingFees(context) {
    const query = `
      SELECT 
        s.admission_no,
        s.first_name,
        s.last_name,
        s.class_name,
        SUM(pe.cr - pe.dr) as outstanding
      FROM students s
      JOIN payment_entries pe ON s.admission_no = pe.admission_no
      WHERE pe.school_id = ? 
        AND pe.branch_id = ?
      GROUP BY s.admission_no, s.first_name, s.last_name, s.class_name
      HAVING outstanding > 0
      ORDER BY outstanding DESC
      LIMIT 10
    `;
    
    const [results] = await sequelize.query(query, {
      replacements: [context.schoolId, context.branchId]
    });
    
    const totalOutstanding = results.reduce((sum, r) => sum + parseFloat(r.outstanding), 0);
    const count = results.length;
    
    let studentList = '';
    if (results.length > 0) {
      studentList = '\n\n**Top 10 Defaulters:**\n';
      results.forEach((student, idx) => {
        studentList += `${idx + 1}. ${student.first_name} ${student.last_name} (${student.class_name}) - ₦${Number(student.outstanding).toLocaleString()}\n`;
      });
    }
    
    const text = `💳 **Outstanding Fees**

**Total Outstanding:** ₦${totalOutstanding.toLocaleString()}
**Students:** ${count}
${studentList}
${count > 0 ? '⚠️ Action needed: Send reminders' : '✅ All fees paid!'}`;

    return {
      text,
      intent: 'outstanding_fees',
      confidence: 0.95,
      actionButtons: [
        { type: 'action', label: '📧 Send Reminders', action: 'send_fee_reminders' },
        { type: 'download', label: '📥 Download List', action: 'download_defaulters' },
        { type: 'details', label: '📊 View All', action: 'view_all_defaulters' }
      ],
      suggestions: this.getPersonalizedSuggestions(context.userId || 0),
      data: { results, totalOutstanding, count }
    };
  }

  async getAbsentStudents(context) {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        s.admission_no,
        s.first_name,
        s.last_name,
        s.class_name,
        a.status
      FROM students s
      JOIN attendance a ON s.id = a.student_id
      WHERE a.date = ?
        AND a.status = 'absent'
        AND a.school_id = ?
        AND a.branch_id = ?
      ORDER BY s.class_name, s.last_name
      LIMIT 20
    `;
    
    const [results] = await sequelize.query(query, {
      replacements: [today, context.schoolId, context.branchId]
    });
    
    const count = results.length;
    
    let studentList = '';
    if (results.length > 0) {
      studentList = '\n\n**Absent Students:**\n';
      results.forEach((student, idx) => {
        studentList += `${idx + 1}. ${student.first_name} ${student.last_name} (${student.class_name})\n`;
      });
    }
    
    const text = `📋 **Absent Students Today**

**Total Absent:** ${count}
${studentList}
${count > 0 ? '⚠️ Consider contacting parents' : '✅ Perfect attendance!'}`;

    return {
      text,
      intent: 'absent_students',
      confidence: 0.95,
      actionButtons: [
        { type: 'action', label: '📱 Send SMS to Parents', action: 'sms_absent_parents' },
        { type: 'action', label: '📧 Email Parents', action: 'email_absent_parents' },
        { type: 'download', label: '📥 Download List', action: 'download_absent' }
      ],
      suggestions: this.getPersonalizedSuggestions(context.userId || 0),
      data: { results, count, date: today }
    };
  }

  async sendFeeReminders(message, userId, context) {
    const classMatch = message.match(/JSS\d|SS\d|PRIMARY\d/i);
    const targetClass = classMatch ? classMatch[0] : 'all';
    
    return {
      text: `📧 **Send Fee Reminders**

Target: ${targetClass === 'all' ? 'All students with outstanding fees' : targetClass}

This will send reminders via:
• SMS to parents
• Email to parents
• WhatsApp (if configured)

**Note:** This is a simulation. Actual SMS/Email sending requires:
1. SMS gateway configuration
2. Email SMTP setup
3. Parent contact details

Would you like to proceed?`,
      intent: 'send_fee_reminders_confirm',
      confidence: 0.90,
      suggestions: [
        'Yes, send reminders',
        'Show me outstanding fees first',
        'Cancel'
      ],
      actionButtons: [
        { type: 'action', label: '✅ Confirm & Send', action: 'confirm_send_reminders' },
        { type: 'info', label: '📊 View Outstanding', action: 'view_outstanding' }
      ]
    };
  }

  async bulkMarkPresent(message, userId, context) {
    const classMatch = message.match(/JSS\d|SS\d|PRIMARY\s*\d/i);
    const targetClass = classMatch ? classMatch[0].toUpperCase().replace(/\s+/g, ' ') : null;

    if (!targetClass) {
      return {
        text: `📋 **Mark Students Present**

Please specify a class. Example:
"Mark all JSS1 students present"
"Mark SS2 present"`,
        intent: 'bulk_mark_present_prompt',
        confidence: 0.90,
        suggestions: ['Mark JSS1 present', 'Mark SS2 present', 'Cancel']
      };
    }

    // Get student count
    const [students] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE class_name = ?
        AND school_id = ?
        AND branch_id = ?
    `, {
      replacements: [targetClass, context.schoolId, context.branchId]
    });

    const count = students[0].count;

    return {
      text: `⚠️ **Confirm Bulk Action**

This will mark **${count} ${targetClass} students** as present for today.

Are you sure you want to proceed?`,
      intent: 'bulk_mark_present_confirm',
      confidence: 0.95,
      actionButtons: [
        { type: 'action', label: '✅ Yes, Mark Present', action: `confirm_mark_present_${targetClass}` },
        { type: 'action', label: '❌ Cancel', action: 'cancel' }
      ],
      data: { class: targetClass, count }
    };
  }

  async bulkSendSMS(message, userId, context) {
    const classMatch = message.match(/JSS\d|SS\d|PRIMARY\s*\d/i);
    const targetClass = classMatch ? classMatch[0].toUpperCase().replace(/\s+/g, ' ') : 'all';

    // Get parent count
    const classFilter = targetClass !== 'all' ? `AND s.class_name = '${targetClass}'` : '';
    
    const [parents] = await sequelize.query(`
      SELECT COUNT(DISTINCT s.parent_phone) as count
      FROM students s
      WHERE s.school_id = ?
        AND s.branch_id = ?
        AND s.parent_phone IS NOT NULL
        ${classFilter}
    `, {
      replacements: [context.schoolId, context.branchId]
    });

    const count = parents[0].count;

    return {
      text: `📱 **Confirm Bulk SMS**

This will send SMS to **${count} parents** ${targetClass !== 'all' ? `of ${targetClass}` : ''}.

**Message:** Fee reminder for outstanding balance.

**Note:** SMS charges apply (₦4 per SMS = ₦${count * 4})

Proceed?`,
      intent: 'bulk_sms_confirm',
      confidence: 0.95,
      actionButtons: [
        { type: 'action', label: '✅ Yes, Send SMS', action: `confirm_sms_${targetClass}` },
        { type: 'action', label: '❌ Cancel', action: 'cancel' }
      ],
      data: { class: targetClass, count, cost: count * 4 }
    };
  }

  async setupSchedulePrompt(message) {
    return {
      text: `📅 **Setup Automatic Reports**

I can send you reports automatically:

**Daily Reports:**
• Attendance Summary (8:00 AM)
• Revenue Summary (6:00 PM)

**Weekly Reports:**
• Financial Summary (Friday 5:00 PM)
• Performance Summary (Friday 6:00 PM)

**Monthly Reports:**
• Complete Summary (1st of month, 9:00 AM)

**Delivery Options:**
• Email
• SMS
• WhatsApp

Example: "Send me attendance daily at 8am via email"`,
      intent: 'setup_schedule_prompt',
      confidence: 0.90,
      suggestions: [
        'Send me attendance daily at 8am',
        'Weekly financial summary on Friday',
        'Show my schedules'
      ]
    };
  }

  async listSchedules(userId) {
    // Mock data - in production, query from database
    const schedules = [
      { type: 'Attendance Summary', frequency: 'Daily', time: '8:00 AM', channel: 'Email', active: true },
      { type: 'Financial Summary', frequency: 'Weekly', time: '5:00 PM Friday', channel: 'Email', active: true }
    ];

    let text = '📅 **Your Scheduled Reports**\n\n';
    
    if (schedules.length === 0) {
      text += 'No schedules set up yet.\n\nType "schedule report" to create one!';
    } else {
      schedules.forEach((s, idx) => {
        const status = s.active ? '✅' : '⏸️';
        text += `${status} ${idx + 1}. ${s.type}\n   • ${s.frequency} at ${s.time}\n   • Via ${s.channel}\n\n`;
      });
    }

    return {
      text,
      intent: 'list_schedules',
      confidence: 0.95,
      actionButtons: [
        { type: 'action', label: '➕ Add Schedule', action: 'add_schedule' },
        { type: 'action', label: '⏸️ Pause All', action: 'pause_schedules' }
      ],
      suggestions: [
        'Add new schedule',
        'Schedule attendance daily'
      ]
    };
  }
}

module.exports = new ChatbotActionsService();
