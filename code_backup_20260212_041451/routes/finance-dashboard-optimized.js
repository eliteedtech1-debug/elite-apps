const db = require("../models");
const { authenticate } = require('../middleware/auth');

module.exports = (app) => {
  // 🚀 OPTIMIZED: Admin Dashboard Metrics - Single Query Approach
  app.get("/admin-dashboard/metrics", authenticate, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { school_id } = req.user;
      const { startDate, endDate } = req.query;

      if (!school_id) {
        return res.status(400).json({ 
          success: false,
          error: "School ID is required",
          timing: Date.now() - startTime
        });
      }

      // ✅ OPTIMIZED: Single comprehensive query instead of multiple queries
      const query = `
        SELECT 
          -- Fees collected (Fees + Items)
          COALESCE(SUM(CASE 
            WHEN item_category IN ('Fees', 'Item') AND dr > 0 
            THEN dr ELSE 0 
          END), 0) AS totalFeesCollected,
          
          -- Other charges (Other Revenue)
          COALESCE(SUM(CASE 
            WHEN item_category = 'Other Revenue' AND dr > 0 
            THEN dr ELSE 0 
          END), 0) AS otherCharges,
          
          -- Outstanding balance (credits - debits)
          COALESCE(SUM(cr - dr), 0) AS totalOutstanding,
          
          -- Count unique students with payments
          COUNT(DISTINCT CASE 
            WHEN dr > 0 THEN admission_no 
          END) AS studentsWithPayments,
          
          -- Total unique students (for calculating unpaid)
          (SELECT COUNT(DISTINCT admission_no) 
           FROM students 
           WHERE school_id = ?) AS totalStudents
           
        FROM payment_entries 
        WHERE school_id = ? 
          AND updated_at BETWEEN ? AND ?
      `;

      // ✅ SECURE: Parameterized query (prevents SQL injection)
      const [results] = await db.sequelize.query(query, {
        replacements: [school_id, school_id, startDate, endDate],
        timeout: 5000 // 5 second timeout
      });

      const data = results[0];
      
      // Calculate students not paid
      const studentsNotPaid = (data.totalStudents || 0) - (data.studentsWithPayments || 0);

      // ✅ FAST: Single response with all metrics (direct format to match original)
      const response = {
        totalFeesCollected: parseFloat(data.totalFeesCollected || 0).toFixed(2),
        feesGrowth: 0, // TODO: Calculate from previous period
        otherCharges: parseFloat(data.otherCharges || 0).toFixed(2),
        otherChargesGrowth: 0, // TODO: Calculate from previous period
        studentsNotPaid: parseInt(studentsNotPaid || 0).toString(),
        notPaidGrowth: 0, // TODO: Calculate from previous period
        totalOutstanding: parseFloat(data.totalOutstanding || 0).toFixed(2),
        outstandingGrowth: 0, // TODO: Calculate from previous period
      };

      // 📊 Performance logging
      const responseTime = Date.now() - startTime;
      console.log(`📊 Admin Dashboard Metrics: ${responseTime}ms (optimized)`);
      
      if (responseTime > 1000) {
        console.warn(`⚠️ Slow query detected: ${responseTime}ms - consider adding database indexes`);
      }

      res.json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Admin Dashboard Metrics Error (${responseTime}ms):`, error);
      
      res.status(500).json({ 
        success: false,
        error: "Internal server error",
        message: "Failed to fetch dashboard metrics",
        timing: responseTime,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // 🚀 OPTIMIZED: Dashboard Health Check
  app.get("/admin-dashboard/health", authenticate, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { school_id } = req.user;
      
      // Simple health check query
      const [result] = await db.sequelize.query(
        'SELECT COUNT(*) as count FROM payment_entries WHERE school_id = ? LIMIT 1',
        { 
          replacements: [school_id],
          timeout: 2000 // 2 second timeout
        }
      );

      res.json({
        success: true,
        status: 'healthy',
        timing: Date.now() - startTime,
        dataAvailable: result[0].count > 0
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        timing: Date.now() - startTime,
        error: error.message
      });
    }
  });

  // 🚀 OPTIMIZED: Quick Dashboard Summary (for loading states)
  app.get("/admin-dashboard/quick-summary", authenticate, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { school_id } = req.user;
      
      // Ultra-fast summary query (no date filtering for speed)
      const query = `
        SELECT 
          COUNT(*) as totalTransactions,
          COALESCE(SUM(dr), 0) as totalCollected,
          COUNT(DISTINCT admission_no) as studentsWithTransactions
        FROM payment_entries 
        WHERE school_id = ? 
        LIMIT 1
      `;

      const [results] = await db.sequelize.query(query, {
        replacements: [school_id],
        timeout: 1000 // 1 second timeout
      });

      res.json({
        success: true,
        data: {
          totalTransactions: parseInt(results[0].totalTransactions || 0),
          totalCollected: parseFloat(results[0].totalCollected || 0),
          studentsWithTransactions: parseInt(results[0].studentsWithTransactions || 0)
        },
        timing: Date.now() - startTime,
        type: 'quick-summary'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timing: Date.now() - startTime
      });
    }
  });
};

// 📝 Performance Notes:
// 1. Single query instead of multiple queries reduces database round trips
// 2. Parameterized queries prevent SQL injection and improve performance
// 3. Query timeouts prevent hanging requests
// 4. Performance logging helps identify slow queries
// 5. Health check endpoint for monitoring
// 6. Quick summary for immediate loading states