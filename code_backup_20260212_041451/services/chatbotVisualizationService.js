const { sequelize } = require('../models');

class ChatbotVisualizationService {
  generateBarChart(data, maxWidth = 20) {
    if (!data || data.length === 0) return '';

    const maxValue = Math.max(...data.map(d => d.value));
    let chart = '\n';

    data.forEach(item => {
      const barLength = Math.round((item.value / maxValue) * maxWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(maxWidth - barLength);
      const percentage = maxValue > 0 ? ((item.value / maxValue) * 100).toFixed(0) : 0;
      chart += `${item.label.padEnd(10)} ${bar} ${percentage}%\n`;
    });

    return chart;
  }

  generateTrendLine(data) {
    if (!data || data.length < 2) return '';

    const values = data.map(d => d.value);
    const trend = this.calculateTrend(values);
    const arrow = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
    const change = Math.abs(trend).toFixed(1);

    return `${arrow} ${trend > 0 ? '+' : ''}${change}% trend`;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }

  async getAttendanceTrend(context, days = 7) {
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const [result] = await sequelize.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
        FROM attendance
        WHERE date = ? AND school_id = ? AND branch_id = ?
      `, {
        replacements: [dateStr, context.schoolId, context.branchId]
      });

      const rate = result[0].total > 0 ? (result[0].present / result[0].total) * 100 : 0;
      data.push({ label: dayName, value: rate, date: dateStr });
    }

    return data;
  }

  async getRevenueTrend(context, days = 7) {
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const [result] = await sequelize.query(`
        SELECT COALESCE(SUM(dr), 0) as revenue
        FROM payment_entries
        WHERE DATE(created_at) = ? 
          AND payment_status = 'Paid'
          AND school_id = ? 
          AND branch_id = ?
      `, {
        replacements: [dateStr, context.schoolId, context.branchId]
      });

      data.push({ label: dayName, value: parseFloat(result[0].revenue), date: dateStr });
    }

    return data;
  }

  async getClassComparison(context) {
    const [results] = await sequelize.query(`
      SELECT 
        s.class_name as label,
        AVG(er.total_score) as value
      FROM exam_results er
      JOIN students s ON er.admission_no = s.admission_no
      WHERE er.school_id = ? AND er.branch_id = ?
      GROUP BY s.class_name
      ORDER BY value DESC
      LIMIT 10
    `, {
      replacements: [context.schoolId, context.branchId]
    });

    return results;
  }

  formatCurrency(value) {
    return `₦${Number(value).toLocaleString()}`;
  }

  generateSparkline(values, width = 10) {
    if (!values || values.length === 0) return '';
    
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;

    return values.map(v => {
      if (range === 0) return chars[4];
      const normalized = (v - min) / range;
      const index = Math.floor(normalized * (chars.length - 1));
      return chars[index];
    }).join('');
  }
}

module.exports = new ChatbotVisualizationService();
