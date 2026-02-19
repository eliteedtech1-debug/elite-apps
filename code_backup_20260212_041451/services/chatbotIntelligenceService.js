const { sequelize } = require('../models');

class ChatbotIntelligenceService {
  async detectAnomalies(context) {
    const alerts = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      // 1. Attendance anomaly
      const [attendanceToday] = await sequelize.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
        FROM attendance
        WHERE date = ? AND school_id = ? AND branch_id = ?
      `, {
        replacements: [today, context.schoolId, context.branchId]
      });

      const [attendanceYesterday] = await sequelize.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
        FROM attendance
        WHERE date = ? AND school_id = ? AND branch_id = ?
      `, {
        replacements: [yesterday, context.schoolId, context.branchId]
      });

      if (attendanceToday[0] && attendanceYesterday[0]) {
        const todayRate = (attendanceToday[0].present / attendanceToday[0].total) * 100;
        const yesterdayRate = (attendanceYesterday[0].present / attendanceYesterday[0].total) * 100;
        const drop = yesterdayRate - todayRate;

        if (drop > 10) {
          alerts.push({
            type: 'attendance_drop',
            severity: 'high',
            message: `🚨 Attendance dropped ${drop.toFixed(1)}% today (${todayRate.toFixed(1)}% vs ${yesterdayRate.toFixed(1)}% yesterday)`,
            action: 'view_absent_students'
          });
        }
      }

      // 2. Unpaid fees anomaly
      const [unpaidLong] = await sequelize.query(`
        SELECT COUNT(DISTINCT s.id) as count
        FROM students s
        JOIN payment_entries pe ON s.admission_no = pe.admission_no
        WHERE pe.school_id = ? 
          AND pe.branch_id = ?
          AND (pe.cr - pe.dr) > 0
          AND pe.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, {
        replacements: [context.schoolId, context.branchId]
      });

      if (unpaidLong[0] && unpaidLong[0].count > 0) {
        alerts.push({
          type: 'unpaid_fees',
          severity: 'medium',
          message: `⚠️ ${unpaidLong[0].count} students haven't paid fees in 30+ days`,
          action: 'view_defaulters'
        });
      }

      // 3. Staff attendance anomaly
      const [staffAbsent] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM staff_attendance
        WHERE date = ? 
          AND status = 'absent'
          AND school_id = ? 
          AND branch_id = ?
      `, {
        replacements: [today, context.schoolId, context.branchId]
      });

      if (staffAbsent[0] && staffAbsent[0].count > 3) {
        alerts.push({
          type: 'staff_absent',
          severity: 'high',
          message: `🚨 ${staffAbsent[0].count} staff members absent today`,
          action: 'view_staff_attendance'
        });
      }

      return alerts;
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return [];
    }
  }

  parseNaturalQuery(message) {
    const normalized = message.toLowerCase().trim();
    const query = {
      action: null,
      class: null,
      subject: null,
      period: null,
      entity: null
    };

    // Extract class (JSS1, JSS2, JSS3, SS1, SS2, SS3, PRIMARY 1-6)
    const classMatch = normalized.match(/\b(jss[1-3]|ss[1-3]|primary\s*[1-6])\b/i);
    if (classMatch) {
      query.class = classMatch[1].toUpperCase().replace(/\s+/g, ' ');
    }

    // Extract time period
    if (normalized.includes('today')) query.period = 'today';
    else if (normalized.includes('yesterday')) query.period = 'yesterday';
    else if (normalized.includes('this week')) query.period = 'this_week';
    else if (normalized.includes('last week')) query.period = 'last_week';
    else if (normalized.includes('this month')) query.period = 'this_month';
    else if (normalized.includes('last month')) query.period = 'last_month';

    // Extract action
    if (normalized.includes('paid') || normalized.includes('payment')) {
      query.action = 'payments';
    } else if (normalized.includes('absent')) {
      query.action = 'absent';
    } else if (normalized.includes('present') || normalized.includes('attendance')) {
      query.action = 'attendance';
    } else if (normalized.includes('performance') || normalized.includes('result') || normalized.includes('grade')) {
      query.action = 'performance';
    } else if (normalized.includes('payroll') || normalized.includes('salary') || normalized.includes('salaries')) {
      query.action = 'payroll';
      // Extract specific period if mentioned
      if (normalized.includes('this month')) query.period = 'this_month';
      else if (normalized.includes('last month')) query.period = 'last_month';
    } else if (normalized.includes('teacher')) {
      query.action = 'teachers';
      query.entity = 'teacher';
    } else if (normalized.includes('student')) {
      query.action = 'students';
      query.entity = 'student';
    }

    return query;
  }

  async executeNaturalQuery(message, context) {
    const query = this.parseNaturalQuery(message);
    
    if (!query.action) return null;

    try {
      switch (query.action) {
        case 'payments':
          return await this.getPaymentsByQuery(query, context);
        case 'absent':
          return await this.getAbsentByQuery(query, context);
        case 'attendance':
          return await this.getAttendanceByQuery(query, context);
        case 'performance':
          return await this.getPerformanceByQuery(query, context);
        case 'payroll':
          return await this.getPayrollByQuery(query, context);
        case 'teachers':
          return await this.getTeachersByQuery(query, context);
        default:
          return null;
      }
    } catch (error) {
      console.error('Natural query execution error:', error);
      return null;
    }
  }

  async getPaymentsByQuery(query, context) {
    const dateFilter = this.getDateFilter(query.period);
    const classFilter = query.class ? `AND s.class_name = '${query.class}'` : '';

    const [results] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE WHEN pe.payment_status = 'Paid' THEN s.id END) as paid_students,
        SUM(CASE WHEN pe.payment_status = 'Paid' THEN pe.dr ELSE 0 END) as total_amount
      FROM students s
      LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no
      WHERE s.school_id = ? 
        AND s.branch_id = ?
        ${classFilter}
        ${dateFilter ? `AND pe.created_at >= '${dateFilter}'` : ''}
    `, {
      replacements: [context.schoolId, context.branchId]
    });

    const data = results[0];
    const className = query.class || 'all classes';
    const period = query.period ? query.period.replace('_', ' ') : 'total';

    return {
      text: `💰 **Payment Summary - ${className}**

**Period:** ${period}
**Paid:** ${data.paid_students} out of ${data.total_students} students
**Amount:** ₦${Number(data.total_amount || 0).toLocaleString()}
**Percentage:** ${data.total_students > 0 ? ((data.paid_students / data.total_students) * 100).toFixed(1) : 0}%`,
      intent: 'natural_query_payments',
      confidence: 0.95,
      data
    };
  }

  async getAbsentByQuery(query, context) {
    const dateFilter = this.getDateFilter(query.period) || new Date().toISOString().split('T')[0];
    const classFilter = query.class ? `AND s.class_name = '${query.class}'` : '';

    const [results] = await sequelize.query(`
      SELECT 
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
        ${classFilter}
      ORDER BY s.class_name, s.last_name
      LIMIT 20
    `, {
      replacements: [dateFilter, context.schoolId, context.branchId]
    });

    const className = query.class || 'all classes';
    let text = `📋 **Absent Students - ${className}**\n\n**Total:** ${results.length}\n`;

    if (results.length > 0) {
      text += '\n**Students:**\n';
      results.forEach((s, idx) => {
        text += `${idx + 1}. ${s.first_name} ${s.last_name} (${s.class_name})\n`;
      });
    } else {
      text += '\n✅ No absent students!';
    }

    return {
      text,
      intent: 'natural_query_absent',
      confidence: 0.95,
      data: results
    };
  }

  async getAttendanceByQuery(query, context) {
    const dateFilter = this.getDateFilter(query.period) || new Date().toISOString().split('T')[0];
    const classFilter = query.class ? `AND s.class_name = '${query.class}'` : '';

    const [results] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent
      FROM students s
      JOIN attendance a ON s.id = a.student_id
      WHERE a.date = ?
        AND a.school_id = ?
        AND a.branch_id = ?
        ${classFilter}
    `, {
      replacements: [dateFilter, context.schoolId, context.branchId]
    });

    const data = results[0];
    const className = query.class || 'all classes';
    const rate = data.total > 0 ? ((data.present / data.total) * 100).toFixed(1) : 0;

    return {
      text: `📊 **Attendance - ${className}**

**Present:** ${data.present}
**Absent:** ${data.absent}
**Total:** ${data.total}
**Rate:** ${rate}%

${rate >= 90 ? '✅ Excellent' : rate >= 75 ? '⚠️ Good' : '❌ Needs attention'}`,
      intent: 'natural_query_attendance',
      confidence: 0.95,
      data
    };
  }

  async getPerformanceByQuery(query, context) {
    const classFilter = query.class ? `AND class_name = '${query.class}'` : '';

    const [results] = await sequelize.query(`
      SELECT 
        AVG(total_score) as avg_score,
        COUNT(*) as total_students,
        MAX(total_score) as highest,
        MIN(total_score) as lowest
      FROM exam_results
      WHERE school_id = ?
        AND branch_id = ?
        ${classFilter}
    `, {
      replacements: [context.schoolId, context.branchId]
    });

    const data = results[0];
    const className = query.class || 'all classes';

    return {
      text: `🎯 **Performance - ${className}**

**Average:** ${Number(data.avg_score || 0).toFixed(1)}%
**Highest:** ${Number(data.highest || 0).toFixed(1)}%
**Lowest:** ${Number(data.lowest || 0).toFixed(1)}%
**Students:** ${data.total_students}`,
      intent: 'natural_query_performance',
      confidence: 0.95,
      data
    };
  }

  async getTeachersByQuery(query, context) {
    const today = new Date().toISOString().split('T')[0];

    const [results] = await sequelize.query(`
      SELECT 
        st.first_name,
        st.last_name,
        sa.status
      FROM staff st
      LEFT JOIN staff_attendance sa ON st.id = sa.staff_id AND sa.date = ?
      WHERE st.school_id = ?
        AND st.branch_id = ?
        AND st.role = 'teacher'
        AND (sa.status = 'absent' OR sa.status IS NULL)
      LIMIT 20
    `, {
      replacements: [today, context.schoolId, context.branchId]
    });

    let text = `👨‍🏫 **Teachers Absent Today**\n\n**Total:** ${results.length}\n`;

    if (results.length > 0) {
      text += '\n**Teachers:**\n';
      results.forEach((t, idx) => {
        text += `${idx + 1}. ${t.first_name} ${t.last_name}\n`;
      });
    } else {
      text += '\n✅ All teachers present!';
    }

    return {
      text,
      intent: 'natural_query_teachers',
      confidence: 0.95,
      data: results
    };
  }

  async getPayrollByQuery(query, context) {
    const period = query.period || 'this_month';
    
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    
    if (period === 'last_month') {
      month = month === 1 ? 12 : month - 1;
      year = month === 12 ? year - 1 : year;
    }
    
    const periodMonth = `${year}-${String(month).padStart(2, '0')}`;

    const [results] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT pl.staff_id) as total_staff,
        SUM(pl.basic_salary) as total_basic,
        SUM(pl.net_pay) as total_net,
        AVG(pl.net_pay) as avg_salary,
        SUM(pl.total_allowances) as total_allowances,
        SUM(pl.total_deductions) as total_deductions,
        pp.status as period_status,
        SUM(CASE WHEN pl.is_processed = 1 THEN 1 ELSE 0 END) as processed_count
      FROM payroll_lines pl
      JOIN payroll_periods pp ON pl.period_id = pp.period_id
      WHERE pl.school_id = ?
        AND pl.branch_id = ?
        AND pp.period_month = ?
      GROUP BY pp.status
    `, {
      replacements: [context.schoolId, context.branchId, periodMonth]
    });

    const data = results[0];
    
    // If no data, find latest available
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
        const periodText = period.replace('_', ' ');
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
        
        return {
          text: `💼 **Payroll Summary - ${periodText}**

⚠️ No payroll data for ${monthName} ${year}

**Latest Available:** ${latest.period_month} (${latest.line_count} staff, Status: ${latest.status})

Click below to view:`,
          intent: 'natural_query_payroll_no_data',
          confidence: 0.95,
          suggestions: [
            `payroll ${latest.period_month}`,
            'Show all periods'
          ]
        };
      }
      
      return {
        text: `💼 **Payroll Summary - ${periodMonth}**

⚠️ No payroll data found

Please check if payroll has been initiated for this period.`,
        intent: 'natural_query_payroll_no_data',
        confidence: 0.95
      };
    }

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    
    // Determine status emoji and message
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

    return {
      text: `💼 **Payroll Summary - ${monthName} ${year}**

**Status:** ${statusEmoji} ${statusMessage}
**Total Staff:** ${data.total_staff || 0}
**Processed:** ${data.processed_count || 0} of ${data.total_staff || 0}

**Financial Summary:**
• Total Net Salary: ₦${Number(data.total_net || 0).toLocaleString()}
• Average Salary: ₦${Number(data.avg_salary || 0).toLocaleString()}

**Breakdown:**
• Basic: ₦${Number(data.total_basic || 0).toLocaleString()}
• Allowances: ₦${Number(data.total_allowances || 0).toLocaleString()}
• Deductions: ₦${Number(data.total_deductions || 0).toLocaleString()}

${data.period_status === 'initiated' ? '⚠️ Payroll not yet processed' : data.period_status === 'disbursed' ? '✅ Payroll disbursed' : ''}`,
      intent: 'natural_query_payroll',
      confidence: 0.95,
      data: { ...data, periodMonth, statusMessage }
    };
  }

  getDateFilter(period) {
    const now = new Date();
    
    switch (period) {
      case 'today':
        return now.toISOString().split('T')[0];
      case 'yesterday':
        return new Date(now - 86400000).toISOString().split('T')[0];
      case 'this_week':
        const weekStart = new Date(now - (now.getDay() * 86400000));
        return weekStart.toISOString().split('T')[0];
      case 'last_week':
        const lastWeekStart = new Date(now - ((now.getDay() + 7) * 86400000));
        return lastWeekStart.toISOString().split('T')[0];
      case 'this_month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      case 'last_month':
        return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      default:
        return null;
    }
  }

  isNaturalQuery(message) {
    const patterns = [
      /how many.*paid/i,
      /how many.*absent/i,
      /which.*teacher/i,
      /show.*top.*student/i,
      /who.*absent/i,
      /attendance.*jss|ss|primary/i,
      /payment.*jss|ss|primary/i,
      /performance.*jss|ss|primary/i,
      /payroll.*this|last/i,
      /salary.*this|last/i,
      /staff.*salary/i
    ];

    return patterns.some(pattern => pattern.test(message));
  }
}

module.exports = new ChatbotIntelligenceService();
