const db = require("../models");
const moment = require("moment");

/**
 * Admission Analytics Controller
 * Provides comprehensive analytics and reporting for the admission process
 */

/**
 * Get admission dashboard analytics
 */
const getAdmissionDashboard = async (req, res) => {
  try {
    const { 
      academic_year = null, 
      branch_id = null, 
      date_from = null, 
      date_to = null 
    } = req.query;
    
    const school_id = req.user?.school_id;
    const userBranchId = req.user?.branch_id;

    // Build date filter
    let dateFilter = "";
    if (date_from && date_to) {
      dateFilter = `AND DATE(sa.created_at) BETWEEN '${date_from}' AND '${date_to}'`;
    } else if (date_from) {
      dateFilter = `AND DATE(sa.created_at) >= '${date_from}'`;
    } else if (date_to) {
      dateFilter = `AND DATE(sa.created_at) <= '${date_to}'`;
    }

    // Build filters
    let filters = `WHERE sa.school_id = '${school_id}'`;
    if (academic_year) filters += ` AND sa.academic_year = '${academic_year}'`;
    if (branch_id) filters += ` AND sa.branch_id = '${branch_id}'`;
    else if (userBranchId) filters += ` AND sa.branch_id = '${userBranchId}'`;
    filters += ` ${dateFilter}`;

    // Get application status summary
    const statusSummary = await db.sequelize.query(`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM school_applicants sa2 ${filters})), 2) as percentage
      FROM school_applicants sa
      ${filters}
      GROUP BY status
      ORDER BY count DESC
    `, { type: db.sequelize.QueryTypes.SELECT });

    // Get monthly application trends
    const monthlyTrends = await db.sequelize.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as applications,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM school_applicants sa
      ${filters}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `, { type: db.sequelize.QueryTypes.SELECT });

    // Get class-wise distribution
    const classDistribution = await db.sequelize.query(`
      SELECT 
        last_class as class_applied,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        ROUND(AVG(CASE WHEN mathematics IS NOT NULL AND mathematics != '' THEN CAST(mathematics AS DECIMAL(5,2)) END), 2) as avg_math_score,
        ROUND(AVG(CASE WHEN english IS NOT NULL AND english != '' THEN CAST(english AS DECIMAL(5,2)) END), 2) as avg_english_score
      FROM school_applicants sa
      ${filters}
      GROUP BY last_class
      ORDER BY count DESC
    `, { type: db.sequelize.QueryTypes.SELECT });

    // Get gender distribution
    const genderDistribution = await db.sequelize.query(`
      SELECT 
        sex as gender,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM school_applicants sa2 ${filters})), 2) as percentage
      FROM school_applicants sa
      ${filters}
      GROUP BY sex
    `, { type: db.sequelize.QueryTypes.SELECT });

    // Get top performing states
    const statePerformance = await db.sequelize.query(`
      SELECT 
        state_of_origin,
        COUNT(*) as applications,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        ROUND((COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / COUNT(*)), 2) as approval_rate
      FROM school_applicants sa
      ${filters}
      AND state_of_origin IS NOT NULL AND state_of_origin != ''
      GROUP BY state_of_origin
      HAVING COUNT(*) >= 5
      ORDER BY approval_rate DESC, applications DESC
      LIMIT 10
    `, { type: db.sequelize.QueryTypes.SELECT });

    // Get examination performance analytics
    const examPerformance = await db.sequelize.query(`
      SELECT 
        COUNT(CASE WHEN mathematics IS NOT NULL AND mathematics != '' THEN 1 END) as math_taken,
        COUNT(CASE WHEN english IS NOT NULL AND english != '' THEN 1 END) as english_taken,
        ROUND(AVG(CASE WHEN mathematics IS NOT NULL AND mathematics != '' THEN CAST(mathematics AS DECIMAL(5,2)) END), 2) as avg_math,
        ROUND(AVG(CASE WHEN english IS NOT NULL AND english != '' THEN CAST(english AS DECIMAL(5,2)) END), 2) as avg_english,
        MAX(CASE WHEN mathematics IS NOT NULL AND mathematics != '' THEN CAST(mathematics AS DECIMAL(5,2)) END) as max_math,
        MAX(CASE WHEN english IS NOT NULL AND english != '' THEN CAST(english AS DECIMAL(5,2)) END) as max_english,
        MIN(CASE WHEN mathematics IS NOT NULL AND mathematics != '' THEN CAST(mathematics AS DECIMAL(5,2)) END) as min_math,
        MIN(CASE WHEN english IS NOT NULL AND english != '' THEN CAST(english AS DECIMAL(5,2)) END) as min_english
      FROM school_applicants sa
      ${filters}
    `, { type: db.sequelize.QueryTypes.SELECT });

    // Get recent activity
    const recentActivity = await db.sequelize.query(`
      SELECT 
        sa.applicant_id,
        sa.name_of_applicant,
        sa.status,
        sa.last_class,
        sa.created_at,
        sa.updated_at,
        CASE 
          WHEN sa.updated_at > sa.created_at THEN 'Updated'
          ELSE 'Created'
        END as activity_type
      FROM school_applicants sa
      ${filters}
      ORDER BY GREATEST(sa.created_at, COALESCE(sa.updated_at, sa.created_at)) DESC
      LIMIT 20
    `, { type: db.sequelize.QueryTypes.SELECT });

    // Get conversion funnel data
    const conversionFunnel = await db.sequelize.query(`
      SELECT 
        'Applications Submitted' as stage,
        COUNT(*) as count,
        100.0 as percentage,
        1 as stage_order
      FROM school_applicants sa ${filters}
      
      UNION ALL
      
      SELECT 
        'Under Review' as stage,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM school_applicants sa2 ${filters})), 2) as percentage,
        2 as stage_order
      FROM school_applicants sa ${filters} AND status IN ('under_review', 'documents_required', 'exam_scheduled', 'approved', 'admitted', 'enrolled')
      
      UNION ALL
      
      SELECT 
        'Approved' as stage,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM school_applicants sa2 ${filters})), 2) as percentage,
        3 as stage_order
      FROM school_applicants sa ${filters} AND status IN ('approved', 'admitted', 'enrolled')
      
      UNION ALL
      
      SELECT 
        'Enrolled' as stage,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM school_applicants sa2 ${filters})), 2) as percentage,
        4 as stage_order
      FROM school_applicants sa ${filters} AND status = 'enrolled'
      
      ORDER BY stage_order
    `, { type: db.sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        summary: {
          total_applications: statusSummary.reduce((sum, item) => sum + parseInt(item.count), 0),
          status_breakdown: statusSummary,
          conversion_rate: conversionFunnel.find(f => f.stage === 'Enrolled')?.percentage || 0
        },
        trends: {
          monthly: monthlyTrends,
          conversion_funnel: conversionFunnel
        },
        demographics: {
          class_distribution: classDistribution,
          gender_distribution: genderDistribution,
          state_performance: statePerformance
        },
        performance: {
          examination: examPerformance[0] || {},
          recent_activity: recentActivity
        }
      }
    });

  } catch (error) {
    console.error("Error fetching admission dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admission dashboard",
      error: error.message
    });
  }
};

/**
 * Get detailed application reports
 */
const getApplicationReports = async (req, res) => {
  try {
    const { 
      report_type = 'summary',
      academic_year = null,
      branch_id = null,
      status = null,
      date_from = null,
      date_to = null,
      class_filter = null,
      gender_filter = null
    } = req.query;

    const school_id = req.user?.school_id;
    const userBranchId = req.user?.branch_id;

    // Build filters
    let filters = `WHERE sa.school_id = '${school_id}'`;
    if (academic_year) filters += ` AND sa.academic_year = '${academic_year}'`;
    if (branch_id) filters += ` AND sa.branch_id = '${branch_id}'`;
    else if (userBranchId) filters += ` AND sa.branch_id = '${userBranchId}'`;
    if (status) filters += ` AND sa.status = '${status}'`;
    if (class_filter) filters += ` AND sa.last_class = '${class_filter}'`;
    if (gender_filter) filters += ` AND sa.sex = '${gender_filter}'`;
    
    if (date_from && date_to) {
      filters += ` AND DATE(sa.created_at) BETWEEN '${date_from}' AND '${date_to}'`;
    }

    let query = "";
    
    switch (report_type) {
      case 'detailed':
        query = `
          SELECT 
            sa.applicant_id,
            sa.name_of_applicant,
            sa.sex,
            sa.date_of_birth,
            sa.last_class,
            sa.last_school_attended,
            sa.state_of_origin,
            sa.l_g_a,
            sa.status,
            sa.mathematics,
            sa.english,
            sa.other_score,
            sa.guardian_name,
            sa.guardian_phone_no,
            sa.guardian_email,
            sa.parent_fullname,
            sa.parent_phone_no,
            sa.parent_email,
            sa.academic_year,
            sa.created_at,
            sa.updated_at
          FROM school_applicants sa
          ${filters}
          ORDER BY sa.created_at DESC
        `;
        break;
        
      case 'performance':
        query = `
          SELECT 
            sa.applicant_id,
            sa.name_of_applicant,
            sa.last_class,
            sa.mathematics,
            sa.english,
            sa.other_score,
            sa.status,
            CASE 
              WHEN sa.mathematics IS NOT NULL AND sa.mathematics != '' AND sa.english IS NOT NULL AND sa.english != ''
              THEN ROUND((CAST(sa.mathematics AS DECIMAL(5,2)) + CAST(sa.english AS DECIMAL(5,2))) / 2, 2)
              ELSE NULL
            END as average_score
          FROM school_applicants sa
          ${filters}
          AND (sa.mathematics IS NOT NULL AND sa.mathematics != '' OR sa.english IS NOT NULL AND sa.english != '')
          ORDER BY average_score DESC
        `;
        break;
        
      case 'status_history':
        query = `
          SELECT 
            ash.applicant_id,
            sa.name_of_applicant,
            ash.previous_status,
            ash.new_status,
            ash.comments,
            ash.updated_by,
            ash.created_at as status_change_date
          FROM application_status_history ash
          JOIN school_applicants sa ON ash.applicant_id = sa.applicant_id
          ${filters.replace('WHERE sa.', 'WHERE sa.')}
          ORDER BY ash.created_at DESC
        `;
        break;
        
      default: // summary
        query = `
          SELECT 
            sa.applicant_id,
            sa.name_of_applicant,
            sa.sex,
            sa.last_class,
            sa.status,
            sa.guardian_phone_no,
            sa.guardian_email,
            sa.academic_year,
            sa.created_at
          FROM school_applicants sa
          ${filters}
          ORDER BY sa.created_at DESC
        `;
    }

    const results = await db.sequelize.query(query, { 
      type: db.sequelize.QueryTypes.SELECT 
    });

    res.json({
      success: true,
      data: {
        report_type,
        total_records: results.length,
        records: results
      }
    });

  } catch (error) {
    console.error("Error generating application report:", error);
    res.status(500).json({
      success: false,
      message: "Error generating application report",
      error: error.message
    });
  }
};

/**
 * Get admission statistics for comparison
 */
const getAdmissionComparison = async (req, res) => {
  try {
    const { 
      compare_type = 'year_over_year', // year_over_year, branch_comparison
      academic_years = null,
      branch_ids = null
    } = req.query;

    const school_id = req.user?.school_id;

    let query = "";
    
    if (compare_type === 'year_over_year') {
      const years = academic_years ? academic_years.split(',') : [];
      const yearFilter = years.length > 0 ? `AND academic_year IN ('${years.join("','")}')` : '';
      
      query = `
        SELECT 
          academic_year,
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN status = 'enrolled' THEN 1 END) as enrolled,
          ROUND(AVG(CASE WHEN mathematics IS NOT NULL AND mathematics != '' THEN CAST(mathematics AS DECIMAL(5,2)) END), 2) as avg_math,
          ROUND(AVG(CASE WHEN english IS NOT NULL AND english != '' THEN CAST(english AS DECIMAL(5,2)) END), 2) as avg_english
        FROM school_applicants
        WHERE school_id = '${school_id}' ${yearFilter}
        GROUP BY academic_year
        ORDER BY academic_year DESC
      `;
    } else if (compare_type === 'branch_comparison') {
      const branches = branch_ids ? branch_ids.split(',') : [];
      const branchFilter = branches.length > 0 ? `AND branch_id IN ('${branches.join("','")}')` : '';
      
      query = `
        SELECT 
          branch_id,
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN status = 'enrolled' THEN 1 END) as enrolled,
          ROUND(AVG(CASE WHEN mathematics IS NOT NULL AND mathematics != '' THEN CAST(mathematics AS DECIMAL(5,2)) END), 2) as avg_math,
          ROUND(AVG(CASE WHEN english IS NOT NULL AND english != '' THEN CAST(english AS DECIMAL(5,2)) END), 2) as avg_english
        FROM school_applicants
        WHERE school_id = '${school_id}' ${branchFilter}
        GROUP BY branch_id
        ORDER BY total_applications DESC
      `;
    }

    const results = await db.sequelize.query(query, { 
      type: db.sequelize.QueryTypes.SELECT 
    });

    res.json({
      success: true,
      data: {
        compare_type,
        comparison_data: results
      }
    });

  } catch (error) {
    console.error("Error fetching admission comparison:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admission comparison",
      error: error.message
    });
  }
};

module.exports = {
  getAdmissionDashboard,
  getApplicationReports,
  getAdmissionComparison
};
