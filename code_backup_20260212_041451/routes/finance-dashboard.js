const db = require("../models");
const { authenticate, authorize } = require('../middleware/auth');
module.exports = (app) => {
  // Dashboard metrics endpoint

  app.get('/payments/metrics', authenticate, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const school_id = req.user?.school_id;

      // Require school_id
      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required',
        });
      }

      // Build conditions
      let condition = ` AND pe.school_id = ?`;
      const params = [school_id];

      if (startDate && endDate) {
        condition += ` AND pe.created_at BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      }

      // Single query for all metrics
      const query = `
      SELECT 
        -- Total Expected Revenue (all credits)
        COALESCE(SUM(pe.cr), 0) as total_expected_revenue,

        -- Total Received Revenue (all debits for fees/items/other revenue)
        COALESCE(SUM(CASE 
          WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue')
          THEN pe.dr ELSE 0 END), 0) as total_received_revenue,

        -- Expected school fees (fees + items only)
        COALESCE(SUM(CASE 
          WHEN pe.item_category IN ('Fees','Item') 
          THEN pe.cr ELSE 0 END), 0) as expected_school_fees,

        -- Received school fees (fees + items only)
        COALESCE(SUM(CASE 
          WHEN pe.item_category IN ('Fees','Item')
          THEN pe.dr ELSE 0 END), 0) as received_school_fees,

        -- Payroll expected (Salary credits)
        COALESCE(SUM(CASE 
          WHEN pe.item_category = 'Salary' 
          THEN pe.cr ELSE 0 END), 0) as total_payroll_expected,

        -- Payroll paid (Salary debits)
        COALESCE(SUM(CASE 
          WHEN pe.item_category = 'Salary' 
          THEN pe.dr ELSE 0 END), 0) as total_payroll_paid,

        -- Payroll pending (Expected - Paid)
        COALESCE(SUM(CASE 
          WHEN pe.item_category = 'Salary' 
          THEN pe.cr - pe.dr ELSE 0 END), 0) as total_payroll_pending,

        -- Other Expenditures (debits only)
        COALESCE(SUM(CASE 
          WHEN pe.item_category = 'Other Expenditure' 
          THEN pe.dr ELSE 0 END), 0) as other_expenditure
      FROM payment_entries pe
      WHERE 1=1 ${condition}
    `;

      const [results] = await db.sequelize.query(query, { replacements: params });
      const data = results[0];

      // Derived metrics
      const metrics = {
        totalExpectedRevenue: parseFloat(data.total_expected_revenue || 0),
        totalReceivedRevenue: parseFloat(data.total_received_revenue || 0),
        expectedSchoolFees: parseFloat(data.expected_school_fees || 0),
        receivedSchoolFees: parseFloat(data.received_school_fees || 0),
        totalPayrollExpected: parseFloat(data.total_payroll_expected || 0),
        totalPayrollPaid: parseFloat(data.total_payroll_paid || 0),
        totalPayrollPending: parseFloat(data.total_payroll_pending || 0),
        otherExpenditure: parseFloat(data.other_expenditure || 0),
      };

      metrics.outstandingBalance = metrics.expectedSchoolFees - metrics.receivedSchoolFees;
      metrics.totalExpenditure = metrics.totalPayrollPaid + metrics.otherExpenditure;
      metrics.netProfit = metrics.totalReceivedRevenue - metrics.totalExpenditure;
      metrics.revenueRealizationRate = metrics.totalExpectedRevenue > 0
        ? (metrics.totalReceivedRevenue / metrics.totalExpectedRevenue) * 100
        : 0;

      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard metrics',
        error: error.message
      });
    }
  });

  // Get monthly trends
  app.get('/payments/trends', authenticate, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let dateCondition = '';
      let params = [];
      if (startDate && endDate) {
        dateCondition = `WHERE school_id = ? AND pe.created_at BETWEEN ? AND ?`;
        params = [req.user.school_id, startDate, endDate];
      }

      const query = `
        SELECT 
          DATE_FORMAT(pe.created_at, '%Y-%m') as month,
          COALESCE(SUM(CASE WHEN pe.item_category IN ('Fees', 'Item', 'Other Revenue') THEN pe.cr ELSE 0 END), 0) as revenue,
          COALESCE(SUM(CASE WHEN pe.item_category = 'Other Expenditure' THEN pe.dr ELSE 0 END), 0) as expenditure
        FROM payment_entries pe
        ${dateCondition}
        GROUP BY DATE_FORMAT(pe.created_at, '%Y-%m')
        ORDER BY month ASC
      `;

      const [revenueExpenditureTrends] = await db.sequelize.query(query, { replacements: params });

      const payrollQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COALESCE(SUM(net_pay), 0) as payroll
        FROM payroll_lines
        ${dateCondition.replace('pe.', '')}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
      `;

      const [payrollTrends] = await db.sequelize.query(payrollQuery, { replacements: params });

      // Merge trends data
      const mergedTrends = revenueExpenditureTrends.map(trend => {
        const payroll = payrollTrends.find(p => p.month === trend.month);
        return {
          month: trend.month,
          revenue: parseFloat(trend.revenue || 0),
          expenditure: parseFloat(trend.expenditure || 0),
          payroll: parseFloat(payroll?.payroll || 0)
        };
      });

      res.json({
        success: true,
        data: mergedTrends
      });
    } catch (error) {
      console.error('Error fetching trends:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching trends',
        error: error.message
      });
    }
  });

  // Get all payment entries all payments are either Items or Fee
  // app.get('/payments/report', authenticate, async (req, res) => {
  //   try {
  //     const { startDate, endDate, category, status, page = 1, limit = 50 } = req.query;

  //     let conditions = [];
  //     let queryParams = [];

  //     if (startDate && endDate) {
  //       conditions.push(`school_id = ? AND created_at BETWEEN ? AND ?`);
  //       queryParams.push(req.user.school_id, startDate, endDate);
  //     }

  //       conditions.push(`item_category IN (?)`);
  //       queryParams.push('Item, Fee');

  //     if (status && status !== 'all') {
  //       conditions.push(`payment_status = ?`);
  //       queryParams.push(status);
  //     }

  //      conditions.push(`payment_status = ?`);
  //       queryParams.push(status);

  //     const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  //     const offset = (page - 1) * limit;

  //     // Get total count for pagination
  //     const countQuery = `SELECT COUNT(*) as total FROM payment_entries ${whereClause}`;
  //     const [countResult] = await db.sequelize.query(countQuery, { replacements: queryParams });
  //     const total = countResult[0].total;

  //     // Get paginated results
  //     const query = `
  //       SELECT p.*, p.dr as amount, s.student_name FROM payment_entries p

  //       JOIN students s 
  //       ON admission_no = s.admission_no
  //       ${whereClause}
  //       ORDER BY created_at DESC 
  //       LIMIT ? OFFSET ?
  //     `;
  //     queryParams.push(parseInt(limit), parseInt(offset));

  //     const [payments] = await db.sequelize.query(query, { replacements: queryParams });

  //     res.json({
  //       success: true,
  //       data: {
  //         payments: payments,
  //         pagination: {
  //           total: total,
  //           page: parseInt(page),
  //           limit: parseInt(limit),
  //           totalPages: Math.ceil(total / limit)
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Error fetching payments:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error fetching payments',
  //       error: error.message
  //     });
  //   }
  // });
  // Get all payment entries (all payments are either Items or Fee)
  app.get('/payments/report', authenticate, async (req, res) => {
    try {
      const { startDate, endDate, status, page = 1, limit = 50 } = req.query;

      const conditions = [];
      const queryParams = [];

      // Always filter by school_id
      conditions.push(`p.school_id = ?`);
      queryParams.push(req.user.school_id);

      // Date filter
      if (startDate && endDate) {
        conditions.push(`p.created_at BETWEEN ? AND ?`);
        queryParams.push(startDate, endDate);
      }

      // Category filter (Items or Fee)
      conditions.push(`p.item_category IN (?, ?)`);
      queryParams.push('Item', 'Fees');

      // Status filter (skip if "all")
      if (status && status !== 'all') {
        conditions.push(`p.payment_status = ?`);
        queryParams.push(status);
      }

      conditions.push(`p.payment_status != ?`);
      queryParams.push('Excluded');
      
   // Category filter (Items or Fee)
      conditions.push(`p.dr > ?`);
      queryParams.push('0');

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM payment_entries p ${whereClause}`;
      const [countResult] = await db.sequelize.query(countQuery, { replacements: queryParams });
      const total = countResult[0].total;

      // Get paginated results
      const query = `
      SELECT 
        p.*, 
        SUM(COALESCE(p.dr,0)) as amount, 
        s.student_name 
      FROM payment_entries p
      JOIN students s 
        ON p.admission_no = s.admission_no
      ${whereClause}
      GROUP BY admission_no
      ORDER BY p.created_at DESC 
      LIMIT ? OFFSET ?
    `;
      const paginatedParams = [...queryParams, parseInt(limit), offset];
      const [payments] = await db.sequelize.query(query, { replacements: paginatedParams });

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payments',
        error: error.message
      });
    }
  });

  // Get revenue analysis with expected vs received
  app.get('/revenue-analysis', authenticate, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let dateCondition = '';
      let params = [];

      if (startDate && endDate) {
        dateCondition = 'AND sf.school_id = ? AND sf.created_at BETWEEN ? AND ?';
        params = [req.user.school_id, startDate, endDate];
      }

      const query = `
        SELECT 
          sf.admission_no,
          sf.student_name,
          sf.current_code,
          sf.class_name,
          pe.item_category as category,
          COALESCE(SUM(sf.cr), 0) as expected_amount,
          COALESCE(SUM(COALESCE(pe.dr, 0)), 0) as received_amount,
          COALESCE(SUM(sf.cr), 0) - COALESCE(SUM(COALESCE(pe.dr, 0)), 0) as balance,
          CASE 
            WHEN SUM(COALESCE(pe.dr, 0)) >= COALESCE(SUM(sf.cr), 0) THEN 'Completed'
            WHEN SUM(COALESCE(pe.dr, 0)) > 0 THEN 'Partial'
            ELSE 'Pending'
          END as status
        FROM students sf
        LEFT JOIN payment_entries pe ON sf.admission_no = pe.admission_no 
          AND pe.item_category IN ('Fees', 'Item')
        WHERE 1=1 ${dateCondition}
        GROUP BY sf.admission_no, sf.student_name, sf.class_code, sf.fee_type
        ORDER BY sf.student_name
      `;

      const [analysis] = await db.sequelize.query(query, { replacements: params });

      // Format the numeric values
      const formattedAnalysis = analysis.map(item => ({
        ...item,
        expected_amount: parseFloat(item.cr),
        received_amount: parseFloat(item.received_amount),
        balance: parseFloat(item.balance)
      }));

      res.json({
        success: true,
        data: formattedAnalysis
      });
    } catch (error) {
      console.error('Error fetching revenue analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching revenue analysis',
        error: error.message
      });
    }
  });

  // Get all payroll entries
  app.get('/payroll/reports', authenticate, async (req, res) => {
    try {
      const { startDate, endDate, department, status } = req.query;

      let conditions = [];
      let queryParams = [];

      if (startDate && endDate) {
        conditions.push(`school_id = ? AND created_at BETWEEN ? AND ?`);
        queryParams.push(req.user.school_id, startDate, endDate);
      }

      if (department && department !== 'all') {
        conditions.push(`department = ?`);
        queryParams.push(department);
      }

      if (status && status !== 'all') {
        conditions.push(`payment_status = ?`);
        queryParams.push(status);
      }

      conditions.push(`item_category = ?`);
      queryParams.push('Salary');

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT * FROM payment_entries  
        ${whereClause}
        ORDER BY created_at DESC
      `;

      const [payrollEntries] = await db.sequelize.query(query, { replacements: queryParams });

      res.json({
        success: true,
        data: payrollEntries
      });
    } catch (error) {
      console.error('Error fetching payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payroll',
        error: error.message
      });
    }
  });
  // Get payroll by department summary
  app.get('/payroll/department-summary', authenticate, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let whereClause = 'WHERE item_category = ?';
      let params = ['Salary'];

      if (startDate && endDate) {
        whereClause += 'AND  school_id = ? AND created_at BETWEEN ? AND ?';
        params.push(req.user.school_id, startDate, endDate);
      }

      const query = `
      SELECT item_category as department,
        COUNT(DISTINCT admission_no) as employee_count,
        COALESCE(SUM(cr), 0) as total_salary,
        COALESCE(AVG(cr), 0) as avg_salary,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN cr ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'Pending' THEN cr ELSE 0 END), 0) as pending_amount
      FROM payment_entries
      ${whereClause}
      GROUP BY department
    `;
      // net_pay
      const [summary] = await db.sequelize.query(query, { replacements: params });

      // Format the numeric values
      const formattedSummary = summary.map(dept => ({
        department: dept.department,
        employee_count: parseInt(dept.employee_count),
        total_salary: parseFloat(dept.total_salary),
        avg_salary: parseFloat(dept.avg_salary),
        paid_amount: parseFloat(dept.paid_amount || 0),
        pending_amount: parseFloat(dept.pending_amount || 0)
      }));

      res.json({
        success: true,
        data: formattedSummary
      });
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payroll summary',
        error: error.message
      });
    }
  });
  // Generate summary report
  app.get('/reports/summary', authenticate, async (req, res) => {
    try {
      const { startDate, endDate, format = 'json' } = req.query;

      let dateCondition = '';
      let params = [];

      if (startDate && endDate) {
        dateCondition = 'WHERE school_id = ? AND pe.created_at BETWEEN ? AND ?';
        params = [req.user.school_id, startDate, endDate];
      }

      // Comprehensive report query
      const query = `
        SELECT 
          -- Revenue metrics
          COALESCE(SUM(CASE WHEN item_category IN ('Fees', 'Item', 'Other Revenue') AND dr > 0 THEN dr ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN item_category = 'Fees' THEN cr ELSE 0 END), 0) as fees_revenue,
          COALESCE(SUM(CASE WHEN item_category = 'Item' THEN cr ELSE 0 END), 0) as items_revenue,
          COALESCE(SUM(CASE WHEN item_category = 'Other Revenue' THEN cr ELSE 0 END), 0) as other_revenue,
          
          -- Expenditure metrics
          COALESCE(SUM(CASE WHEN item_category = 'Other Expenditure' THEN dr ELSE 0 END), 0) as other_expenditure,
          
          -- Status metrics
          COUNT(CASE WHEN payment_status = 'Completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN payment_status = 'Partial' THEN 1 END) as partial_payments,
          COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN payment_status = 'Cancelled' THEN 1 END) as cancelled_payments
          
        FROM payment_entries pe
        ${dateCondition}
      `;

      const payrollQuery = `
        SELECT COALESCE(SUM(net_pay), 0) as payroll_expenditure
        FROM payroll_lines
        ${dateCondition.replace('pe.', '')}
      `;

      const [results] = await db.sequelize.query(query, { replacements: params });
      const [payrollResults] = await db.sequelize.query(payrollQuery, { replacements: params });

      const data = results[0];
      const payrollData = payrollResults[0];

      const summaryData = {
        revenue: {
          total: parseFloat(data.total_revenue || 0),
          fees: parseFloat(data.fees_revenue || 0),
          items: parseFloat(data.items_revenue || 0),
          other: parseFloat(data.other_revenue || 0)
        },
        expenditure: {
          payroll: parseFloat(payrollData.payroll_expenditure || 0),
          other: parseFloat(data.other_expenditure || 0),
          total: parseFloat(payrollData.payroll_expenditure || 0) + parseFloat(data.other_expenditure || 0)
        },
        payments: {
          completed: parseInt(data.completed_payments || 0),
          partial: parseInt(data.partial_payments || 0),
          pending: parseInt(data.pending_payments || 0),
          cancelled: parseInt(data.cancelled_payments || 0)
        },
        net_profit: parseFloat(data.total_revenue || 0) -
          (parseFloat(payrollData.payroll_expenditure || 0) + parseFloat(data.other_expenditure || 0)),
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'All time'
        }
      };

      if (format === 'csv') {
        // Convert to CSV format
        let csv = 'Metric,Value\n';
        csv += `Total Revenue,${summaryData.revenue.total}\n`;
        csv += `Fees Revenue,${summaryData.revenue.fees}\n`;
        csv += `Items Revenue,${summaryData.revenue.items}\n`;
        csv += `Other Revenue,${summaryData.revenue.other}\n`;
        csv += `Payroll Expenditure,${summaryData.expenditure.payroll}\n`;
        csv += `Other Expenditure,${summaryData.expenditure.other}\n`;
        csv += `Total Expenditure,${summaryData.expenditure.total}\n`;
        csv += `Net Profit,${summaryData.net_profit}\n`;
        csv += `Completed Payments,${summaryData.payments.completed}\n`;
        csv += `Partial Payments,${summaryData.payments.partial}\n`;
        csv += `Pending Payments,${summaryData.payments.pending}\n`;
        csv += `Cancelled Payments,${summaryData.payments.cancelled}\n`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=summary_report_${Date.now()}.csv`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: summaryData
        });
      }
    } catch (error) {
      console.error('Error generating summary report:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating summary report',
        error: error.message
      });
    }
  });

  app.get("/students-by-class", authenticate, async (req, res) => {
    try {
      const { school_id } = req.user;
      if (!school_id) {
        return res.status(400).json({ error: "Missing school_id" });
      }

      const [results] = await db.sequelize.query(
        `SELECT 
            s.class_name,
            s.current_class,
            COUNT(s.admission_no) AS student_count
        FROM students s
        WHERE s.school_id = ?
        GROUP BY s.class_name, s.current_class`,
        [school_id]
      );

      res.json(results);
    } catch (error) {
      console.error("Error in getStudentsByClass:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/student-payments-summary", authenticate, async function getStudentPaymentsSummary(req, res) {
    try {
      const { school_id } = req.user;
      if (!school_id) {
        return res.status(400).json({ error: "Missing school_id" });
      }

      const [results] = await db.sequelize.query(
        `SELECT 
          s.class_name,
          s.current_class,
          COUNT(s.admission_no) AS student_count,
          COALESCE(SUM(p.cr), 0) AS total_expected_amount,
          COALESCE(SUM(p.dr), 0) AS total_collected_amount,
          COALESCE(SUM(p.cr - p.dr), 0) AS balance_remaining,
          p.academic_year,
          p.term
      FROM students s
      LEFT JOIN payments p 
          ON s.admission_no = p.admission_no 
         AND s.school_id = p.school_id
      WHERE s.school_id = ?
      GROUP BY s.class_name, s.current_class, p.academic_year, p.term
      ORDER BY s.class_name, p.term
      `,
        [school_id]
      );

      res.json(results);
    } catch (error) {
      console.error("Error in getStudentPaymentsSummary:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/student-details/:class_name", authenticate, async (req, res) => {
    try {
      const { school_id } = req.user;
      const { class_name } = req.params;

      if (!school_id || !class_name) {
        return res.status(400).json({ error: "Missing school_id or class_name" });
      }

      const [results] = await db.sequelize.query(
        `
      SELECT admission_no, student_name, class_name, current_class
      FROM students
      WHERE school_id = ? AND class_name = ?
      `,
        [school_id, class_name]
      );

      res.json(results);
    } catch (error) {
      console.error("Error in getStudentDetails:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/student-payment-history/:admission_no", authenticate, async (req, res) => {
    try {
      const { school_id } = req.user;
      const { admission_no } = req.params;

      if (!school_id || !admission_no) {
        return res.status(400).json({ error: "Missing school_id or admission_no" });
      }

      const [results] = await db.sequelize.query(
        `
      SELECT 
          p.updated_at,
          p.cr AS expected_amount,
          p.dr AS collected_amount,
          (p.cr - p.dr) AS balance,
          p.academic_year,
          p.term
      FROM payments p
      WHERE p.school_id = ? AND p.admission_no = ?
      ORDER BY p.updated_at DESC
      `,
        [school_id, admission_no]
      );

      res.json(results);
    } catch (error) {
      console.error("Error in getStudentPaymentHistory:", error);
      res.status(500).json({ error: "Server error" });
    }
  });



  app.get("/admin-dashboard/metrics", authenticate, async (req, res) => {
    try {
      const { school_id } = req.user;
      const { startDate, endDate } = req.query;

      if (!school_id) {
        return res.status(400).json({ error: "School ID is required" });
      }

      // Total fees collected (Chart of Accounts first, fallback to payment_status)
      const [feesCollected] = await db.sequelize.query(
        `SELECT COALESCE(
          SUM(CASE WHEN pe.dr > 0 AND pe.payment_status IN ('Confirmed', 'Paid', 'completed') THEN pe.dr ELSE 0 END) -
          SUM(CASE WHEN pe.payment_status = 'Refund' AND pe.cr > 0 THEN pe.cr ELSE 0 END), 0
        ) AS totalFeesCollected
      FROM payment_entries pe
      LEFT JOIN chart_of_accounts coa ON pe.account_id = coa.account_id
      WHERE pe.school_id = :school_id  
        AND (
          coa.account_type = 'REVENUE' OR 
          (pe.account_id IS NULL AND pe.description LIKE '%TUITION%') OR
          (pe.account_id IS NULL AND pe.item_category IN ('PAYMENT', 'Fees', 'Item'))
        )
        AND pe.updated_at BETWEEN :startDate AND :endDate`,
        { replacements: { school_id, startDate, endDate } }
      );

      // Other charges collected (Other Revenue)
      const [otherCharges] = await db.sequelize.query(
        `
      SELECT COALESCE(SUM(dr), 0) AS otherCharges
      FROM payment_entries
      WHERE school_id = :school_id
        AND item_category = 'Other Revenue'
        AND updated_at BETWEEN :startDate AND :endDate ;`,
        { replacements: { school_id, startDate, endDate } }
      );

      // Students not paid
      const [studentsNotPaid] = await db.sequelize.query(
        `
      SELECT COUNT(*) AS studentsNotPaid
      FROM students s
      WHERE s.school_id = :school_id
        AND NOT EXISTS (
          SELECT 1 
          FROM payment_entries p 
          WHERE p.admission_no = s.admission_no
            AND p.school_id = s.school_id
            AND p.updated_at BETWEEN :startDate AND :endDate)`,
        { replacements: { school_id, startDate, endDate } }
      );

      // Outstanding balance (Chart of Accounts first, fallback to payment_status)
      const [outstanding] = await db.sequelize.query(
        `
      SELECT 
        COALESCE(
          -- Expected Revenue (bills minus scholarships/discounts)
          SUM(CASE WHEN pe.cr > 0 AND pe.payment_status NOT IN ('Cancelled', 'Reversed', 'Excluded') THEN pe.cr ELSE 0 END) -
          SUM(CASE WHEN pe.payment_status IN ('Discount', 'Scholarship') AND pe.cr > 0 THEN pe.cr ELSE 0 END) -
          -- Collected Revenue (payments minus refunds)
          SUM(CASE WHEN pe.dr > 0 AND pe.payment_status IN ('Confirmed', 'Paid', 'completed') THEN pe.dr ELSE 0 END) +
          SUM(CASE WHEN pe.payment_status = 'Refund' AND pe.cr > 0 THEN pe.cr ELSE 0 END),
          0
        ) AS totalOutstanding
      FROM payment_entries pe
      LEFT JOIN chart_of_accounts coa ON pe.account_id = coa.account_id
      WHERE pe.school_id = :school_id
        AND pe.updated_at BETWEEN :startDate AND :endDate
        AND (
          coa.account_type = 'REVENUE' OR 
          (pe.account_id IS NULL AND pe.description LIKE '%TUITION%') OR
          (pe.account_id IS NULL AND pe.item_category IN ('PAYMENT', 'DISCOUNT', 'SCHOLARSHIP', 'Fees', 'Item'))
        )`,
        { replacements: { school_id, startDate, endDate } }
      );

      // Total expenditure (Chart of Accounts first, fallback to payment_status)
      const [expenditure] = await db.sequelize.query(
        `
      SELECT 
        COALESCE(
          SUM(CASE WHEN pe.dr > 0 AND coa.account_type = 'EXPENSE' THEN pe.dr ELSE 0 END) +
          SUM(CASE WHEN pe.payment_status IN ('Discount', 'Scholarship', 'Refund') AND pe.cr > 0 THEN pe.cr ELSE 0 END) +
          SUM(CASE WHEN pe.account_id IS NULL AND pe.item_category IN ('Salary', 'Payroll', 'Expense', 'Operational Cost') AND pe.dr > 0 THEN pe.dr ELSE 0 END) +
          COALESCE((
            SELECT SUM(pl.net_pay) 
            FROM payroll_lines pl 
            WHERE pl.school_id = :school_id 
            AND pl.created_at BETWEEN :startDate AND :endDate
            AND pl.is_processed = 1
          ), 0),
          0
        ) AS totalExpenditure
      FROM payment_entries pe
      LEFT JOIN chart_of_accounts coa ON pe.account_id = coa.account_id
      WHERE pe.school_id = :school_id
        AND pe.updated_at BETWEEN :startDate AND :endDate`,
        { replacements: { school_id, startDate, endDate } }
      );

      // TODO: Replace these dummy growth % with real prev-period comparison
      const response = {
        totalFeesCollected: feesCollected[0]?.totalFeesCollected || 0,
        feesGrowth: 0, // growth %
        otherCharges: otherCharges[0]?.otherCharges || 0,
        otherChargesGrowth: 0,
        studentsNotPaid: studentsNotPaid[0]?.studentsNotPaid || 0,
        notPaidGrowth: 0,
        totalOutstanding: outstanding[0]?.totalOutstanding || 0,
        outstandingGrowth: 0,
        totalExpenditure: expenditure[0]?.totalExpenditure || 0,
        expenditureGrowth: 0,
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching payment metrics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  //  AND updated_at BETWE
};