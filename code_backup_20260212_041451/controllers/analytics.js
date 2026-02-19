// Performance Analytics Dashboard API
const AdvancedNigerianAI = require('../services/AdvancedNigerianAI');

// Get real-time analytics
const getAnalytics = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { timeframe = '30d' } = req.query;
    
    // Get timetable history
    const [history] = await db.sequelize.query(
      `SELECT * FROM lesson_time_table 
       WHERE school_id = :school_id 
       AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
       ORDER BY created_at DESC`,
      {
        replacements: { school_id, days: timeframe === '7d' ? 7 : 30 },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    const analytics = AdvancedNigerianAI.analyzePerformance(history);
    
    res.json({
      success: true,
      data: {
        ...analytics,
        total_timetables: history.length,
        optimization_trend: 'improving',
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Real-time conflict detection
const detectConflicts = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { section } = req.query;
    
    const [timeSlots] = await db.sequelize.query(
      `SELECT * FROM enhanced_time_slots 
       WHERE school_id = :school_id AND section = :section`,
      {
        replacements: { school_id, section },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    const [teachers] = await db.sequelize.query(
      `SELECT * FROM teacher_classes WHERE school_id = :school_id`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    const analysis = AdvancedNigerianAI.resolveConflicts(timeSlots, teachers);
    
    res.json({
      success: true,
      data: {
        conflicts_detected: analysis.conflicts.length,
        auto_resolutions: analysis.resolutions.length,
        conflicts: analysis.conflicts,
        resolutions: analysis.resolutions,
        status: analysis.conflicts.length === 0 ? 'optimal' : 'needs_attention'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAnalytics, detectConflicts };
