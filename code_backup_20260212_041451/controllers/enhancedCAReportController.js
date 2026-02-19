const db = require("../models");
const { Op } = require("sequelize");

/**
 * Enhanced CA Report Controller
 * Supports both Traditional (CA1,CA2,CA3,CA4) and Monthly (Week-based) assessment systems
 */

/**
 * Determine school assessment type based on CA setup configuration
 */
const getSchoolAssessmentType = async (school_id, branch_id) => {
  try {
    // Check if school has weekly/monthly setup (more than 4 CA types or week-based naming)
    const caSetups = await db.sequelize.query(
      `SELECT DISTINCT ca_type, COUNT(*) as count 
       FROM ca_setup 
       WHERE school_id = :school_id AND branch_id = :branch_id AND status = 'Active'
       GROUP BY ca_type
       ORDER BY ca_type`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Check for monthly/weekly patterns
    const hasWeeklyPattern = caSetups.some(setup => 
      setup.ca_type.includes('WEEK') || 
      setup.ca_type.includes('MONTHLY') ||
      setup.count > 4
    );

    // Check for traditional pattern (CA1, CA2, CA3, CA4)
    const traditionalTypes = ['CA1', 'CA2', 'CA3', 'CA4'];
    const hasTraditionalPattern = traditionalTypes.every(type => 
      caSetups.some(setup => setup.ca_type === type)
    );

    return {
      type: hasWeeklyPattern ? 'Monthly' : 'Traditional',
      available_types: caSetups.map(s => s.ca_type),
      is_traditional: hasTraditionalPattern,
      is_monthly: hasWeeklyPattern
    };
  } catch (error) {
    console.error('Error determining school assessment type:', error);
    return { type: 'Traditional', available_types: [], is_traditional: true, is_monthly: false };
  }
};

/**
 * Get CA Report Data with Traditional/Monthly school support
 */
const getEnhancedCAReport = async (req, res) => {
  try {
    // Extract school_id and branch_id from req.user or headers as fallback
    const school_id = req.user?.school_id || req.headers['x-school-id'];
    const branch_id = req.user?.branch_id || req.headers['x-branch-id'];
    
    const { 
      class_code, 
      subject_code, 
      ca_type,
      week_number,
      admission_no,
      academic_year,
      term,
      assessment_mode // 'traditional' or 'monthly'
    } = req.query;

    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "School ID and Branch ID are required."
      });
    }

    // Determine school assessment type
    const schoolType = await getSchoolAssessmentType(school_id, branch_id);
    const effectiveMode = assessment_mode || schoolType.type.toLowerCase();

    // Get CA configuration based on school type
    let caConfig;
    if (effectiveMode === 'traditional') {
      caConfig = await getTraditionalCAConfig(school_id, branch_id, class_code);
    } else {
      caConfig = await getMonthlyCAConfig(school_id, branch_id, class_code);
    }

    // Build query parameters
    const queryParams = {
      school_id,
      branch_id,
      ...(class_code && { class_code }),
      ...(subject_code && { subject_code }),
      ...(ca_type && { ca_type }),
      ...(week_number && { week_number }),
      ...(admission_no && { admission_no }),
      ...(academic_year && { academic_year }),
      ...(term && { term })
    };

    // Get CA scores based on mode
    let reportData;
    if (effectiveMode === 'traditional') {
      reportData = await getTraditionalCAReportData(queryParams);
    } else {
      reportData = await getMonthlyCAReportData(queryParams);
    }

    res.json({
      success: true,
      data: {
        school_assessment_type: schoolType,
        assessment_mode: effectiveMode,
        caConfiguration: caConfig,
        report_data: reportData,
        query_parameters: queryParams
      },
      message: `Enhanced CA Report (${effectiveMode}) retrieved successfully`
    });

  } catch (error) {
    console.error("Error in getEnhancedCAReport:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating enhanced CA report.",
      error: error.message
    });
  }
};

/**
 * Get Traditional CA Configuration (CA1, CA2, CA3, CA4)
 */
const getTraditionalCAConfig = async (school_id, branch_id, class_code) => {
  try {
    // Get class section
    const classInfo = await db.sequelize.query(
      `SELECT section FROM classes WHERE class_code = :class_code AND school_id = :school_id`,
      { 
        replacements: { class_code, school_id }, 
        type: db.sequelize.QueryTypes.SELECT 
      }
    );
    
    const section = classInfo[0]?.section || 'All';

    // Get traditional CA setup (CA1, CA2, CA3, CA4)
    const caSetups = await db.sequelize.query(
      `SELECT 
        ca_type,
        overall_contribution_percent,
        max_score,
        week_number,
        is_active,
        is_locked,
        section
      FROM ca_setup 
      WHERE school_id = :school_id 
        AND branch_id = :branch_id 
        AND (section = :section OR section = 'All')
        AND ca_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'EXAM')
        AND status = 'Active'
      ORDER BY 
        CASE ca_type 
          WHEN 'CA1' THEN 1 
          WHEN 'CA2' THEN 2 
          WHEN 'CA3' THEN 3 
          WHEN 'CA4' THEN 4 
          WHEN 'EXAM' THEN 5 
        END`,
      {
        replacements: { school_id, branch_id, section },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    return {
      mode: 'traditional',
      section,
      ca_types: caSetups,
      total_ca_contribution: caSetups
        .filter(ca => ca.ca_type !== 'EXAM')
        .reduce((sum, ca) => sum + parseFloat(ca.overall_contribution_percent), 0),
      exam_contribution: caSetups
        .find(ca => ca.ca_type === 'EXAM')?.overall_contribution_percent || 0
    };
  } catch (error) {
    console.error('Error getting traditional CA config:', error);
    throw error;
  }
};

/**
 * Get Monthly CA Configuration (Week-based assessments)
 */
const getMonthlyCAConfig = async (school_id, branch_id, class_code) => {
  try {
    // Get class section
    const classInfo = await db.sequelize.query(
      `SELECT section FROM classes WHERE class_code = :class_code AND school_id = :school_id`,
      { 
        replacements: { class_code, school_id }, 
        type: db.sequelize.QueryTypes.SELECT 
      }
    );
    
    const section = classInfo[0]?.section || 'All';

    // Get weekly/monthly CA setup
    const caSetups = await db.sequelize.query(
      `SELECT 
        ca_type,
        week_number,
        max_score,
        overall_contribution_percent,
        is_active,
        is_locked,
        section,
        created_at
      FROM ca_setup 
      WHERE school_id = :school_id 
        AND branch_id = :branch_id 
        AND (section = :section OR section = 'All')
        AND status = 'Active'
      ORDER BY week_number ASC, ca_type ASC`,
      {
        replacements: { school_id, branch_id, section },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Group by weeks for monthly view
    const weeklyGroups = caSetups.reduce((groups, setup) => {
      const week = setup.week_number;
      if (!groups[week]) {
        groups[week] = [];
      }
      groups[week].push(setup);
      return groups;
    }, {});

    return {
      mode: 'monthly',
      section,
      weekly_assessments: weeklyGroups,
      total_weeks: Object.keys(weeklyGroups).length,
      ca_types: [...new Set(caSetups.map(s => s.ca_type))],
      total_assessments: caSetups.length
    };
  } catch (error) {
    console.error('Error getting monthly CA config:', error);
    throw error;
  }
};

/**
 * Get Traditional CA Report Data
 */
const getTraditionalCAReportData = async (queryParams) => {
  try {
    const { school_id, branch_id, class_code, subject_code, ca_type, admission_no } = queryParams;

    let whereClause = `
      WHERE cs.school_id = :school_id 
        AND cs.branch_id = :branch_id
        AND ws.assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'EXAM')
    `;
    
    const replacements = { school_id, branch_id };

    if (class_code) {
      whereClause += ` AND ws.class_code = :class_code`;
      replacements.class_code = class_code;
    }
    
    if (subject_code) {
      whereClause += ` AND ws.subject_code = :subject_code`;
      replacements.subject_code = subject_code;
    }
    
    if (ca_type) {
      whereClause += ` AND ws.assessment_type = :ca_type`;
      replacements.ca_type = ca_type;
    }
    
    if (admission_no) {
      whereClause += ` AND ws.admission_no = :admission_no`;
      replacements.admission_no = admission_no;
    }

    const reportData = await db.sequelize.query(
      `SELECT 
        ws.admission_no,
        s.student_name,
        ws.class_code,
        c.class_name,
        ws.subject_code,
        sub.subject as subject_name,
        ws.assessment_type as ca_type,
        ws.score,
        ws.max_score,
        ROUND((ws.score / ws.max_score) * 100, 2) as percentage,
        cs.overall_contribution_percent,
        ROUND((ws.score / ws.max_score) * cs.overall_contribution_percent, 2) as weighted_score,
        ws.academic_year,
        ws.term,
        ws.created_at as score_date
      FROM weekly_scores ws
      LEFT JOIN ca_setup cs ON ws.assessment_type = cs.ca_type 
        AND ws.ca_setup_id = cs.id
      LEFT JOIN students s ON ws.admission_no = s.admission_no AND cs.school_id = s.school_id
      LEFT JOIN classes c ON ws.class_code = c.class_code AND cs.school_id = c.school_id
      LEFT JOIN subjects sub ON ws.subject_code = sub.subject_code AND cs.school_id = sub.school_id
      ${whereClause}
      ORDER BY 
        ws.admission_no,
        ws.subject_code,
        CASE ws.assessment_type 
          WHEN 'CA1' THEN 1 
          WHEN 'CA2' THEN 2 
          WHEN 'CA3' THEN 3 
          WHEN 'CA4' THEN 4 
          WHEN 'EXAM' THEN 5 
        END`,
      {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Calculate student summaries for traditional system
    const studentSummaries = calculateTraditionalSummaries(reportData);

    return {
      scores: reportData,
      summaries: studentSummaries,
      statistics: {
        total_students: [...new Set(reportData.map(r => r.admission_no))].length,
        total_subjects: [...new Set(reportData.map(r => r.subject_code))].length,
        ca_types_covered: [...new Set(reportData.map(r => r.ca_type))],
        total_scores: reportData.length
      }
    };
  } catch (error) {
    console.error('Error getting traditional CA report data:', error);
    throw error;
  }
};

/**
 * Get Monthly CA Report Data
 */
const getMonthlyCAReportData = async (queryParams) => {
  try {
    const { school_id, branch_id, class_code, subject_code, week_number, admission_no } = queryParams;

    let whereClause = `
      WHERE cs.school_id = :school_id 
        AND cs.branch_id = :branch_id
    `;
    
    const replacements = { school_id, branch_id };

    if (class_code) {
      whereClause += ` AND ws.class_code = :class_code`;
      replacements.class_code = class_code;
    }
    
    if (subject_code) {
      whereClause += ` AND ws.subject_code = :subject_code`;
      replacements.subject_code = subject_code;
    }
    
    if (week_number) {
      whereClause += ` AND ws.week_number = :week_number`;
      replacements.week_number = week_number;
    }
    
    if (admission_no) {
      whereClause += ` AND ws.admission_no = :admission_no`;
      replacements.admission_no = admission_no;
    }

    const reportData = await db.sequelize.query(
      `SELECT 
        ws.admission_no,
        s.student_name,
        ws.class_code,
        c.class_name,
        ws.subject_code,
        sub.subject as subject_name,
        ws.assessment_type as ca_type,
        ws.week_number,
        ws.score,
        ws.max_score,
        ROUND((ws.score / ws.max_score) * 100, 2) as percentage,
        cs.overall_contribution_percent,
        ROUND((ws.score / ws.max_score) * cs.overall_contribution_percent, 2) as weighted_score,
        ws.academic_year,
        ws.term,
        ws.created_at as score_date,
        aw.begin_date as week_start,
        aw.end_date as week_end
      FROM weekly_scores ws
      LEFT JOIN ca_setup cs ON ws.assessment_type = cs.ca_type 
        AND ws.week_number = cs.week_number
        AND ws.ca_setup_id = cs.id
      LEFT JOIN students s ON ws.admission_no = s.admission_no AND cs.school_id = s.school_id
      LEFT JOIN classes c ON ws.class_code = c.class_code AND cs.school_id = c.school_id
      LEFT JOIN subjects sub ON ws.subject_code = sub.subject_code AND cs.school_id = sub.school_id
      LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
        AND cs.school_id = aw.school_id
        AND cs.branch_id = aw.branch_id
      ${whereClause}
      ORDER BY 
        ws.admission_no,
        ws.subject_code,
        ws.week_number,
        ws.assessment_type`,
      {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Calculate student summaries for monthly system
    const studentSummaries = calculateMonthlySummaries(reportData);

    return {
      scores: reportData,
      summaries: studentSummaries,
      statistics: {
        total_students: [...new Set(reportData.map(r => r.admission_no))].length,
        total_subjects: [...new Set(reportData.map(r => r.subject_code))].length,
        weeks_covered: [...new Set(reportData.map(r => r.week_number))],
        ca_types_covered: [...new Set(reportData.map(r => r.ca_type))],
        total_scores: reportData.length
      }
    };
  } catch (error) {
    console.error('Error getting monthly CA report data:', error);
    throw error;
  }
};

/**
 * Calculate summaries for traditional assessment system
 */
const calculateTraditionalSummaries = (reportData) => {
  const studentGroups = reportData.reduce((groups, score) => {
    const key = `${score.admission_no}_${score.subject_code}`;
    if (!groups[key]) {
      groups[key] = {
        admission_no: score.admission_no,
        student_name: score.student_name,
        subject_code: score.subject_code,
        subject_name: score.subject_name,
        scores: {}
      };
    }
    groups[key].scores[score.ca_type] = {
      score: score.score,
      max_score: score.max_score,
      percentage: score.percentage,
      weighted_score: score.weighted_score
    };
    return groups;
  }, {});

  return Object.values(studentGroups).map(student => {
    const caScores = ['CA1', 'CA2', 'CA3', 'CA4'].map(type => student.scores[type] || null);
    const examScore = student.scores['EXAM'] || null;
    
    const totalCAScore = caScores
      .filter(s => s !== null)
      .reduce((sum, s) => sum + (s.weighted_score || 0), 0);
    
    const totalExamScore = examScore ? examScore.weighted_score || 0 : 0;
    const overallScore = totalCAScore + totalExamScore;

    return {
      ...student,
      ca_summary: {
        ca1: caScores[0],
        ca2: caScores[1],
        ca3: caScores[2],
        ca4: caScores[3],
        total_ca_score: totalCAScore
      },
      exam_summary: examScore,
      overall_summary: {
        total_score: overallScore,
        grade: calculateGrade(overallScore),
        remark: calculateRemark(overallScore)
      }
    };
  });
};

/**
 * Calculate summaries for monthly assessment system
 */
const calculateMonthlySummaries = (reportData) => {
  const studentGroups = reportData.reduce((groups, score) => {
    const key = `${score.admission_no}_${score.subject_code}`;
    if (!groups[key]) {
      groups[key] = {
        admission_no: score.admission_no,
        student_name: score.student_name,
        subject_code: score.subject_code,
        subject_name: score.subject_name,
        weekly_scores: {}
      };
    }
    
    const weekKey = `week_${score.week_number}`;
    if (!groups[key].weekly_scores[weekKey]) {
      groups[key].weekly_scores[weekKey] = [];
    }
    
    groups[key].weekly_scores[weekKey].push({
      ca_type: score.ca_type,
      score: score.score,
      max_score: score.max_score,
      percentage: score.percentage,
      weighted_score: score.weighted_score,
      week_start: score.week_start,
      week_end: score.week_end
    });
    
    return groups;
  }, {});

  return Object.values(studentGroups).map(student => {
    const weeks = Object.keys(student.weekly_scores).sort();
    const totalWeightedScore = weeks.reduce((sum, week) => {
      return sum + student.weekly_scores[week].reduce((weekSum, score) => {
        return weekSum + (score.weighted_score || 0);
      }, 0);
    }, 0);

    return {
      ...student,
      weekly_summary: student.weekly_scores,
      overall_summary: {
        total_weeks: weeks.length,
        total_weighted_score: totalWeightedScore,
        average_weekly_score: weeks.length > 0 ? totalWeightedScore / weeks.length : 0,
        grade: calculateGrade(totalWeightedScore),
        remark: calculateRemark(totalWeightedScore)
      }
    };
  });
};

/**
 * Calculate grade based on score
 */
const calculateGrade = (score) => {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 40) return 'E';
  return 'F';
};

/**
 * Calculate remark based on score
 */
const calculateRemark = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 40) return 'Pass';
  return 'Fail';
};

/**
 * Get available assessment types for a school
 */
const getAvailableAssessmentTypes = async (req, res) => {
  try {
    // Extract school_id and branch_id from req.user or headers as fallback
    const school_id = req.user?.school_id || req.headers['x-school-id'];
    const branch_id = req.user?.branch_id || req.headers['x-branch-id'];

    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "School ID and Branch ID are required."
      });
    }

    const schoolType = await getSchoolAssessmentType(school_id, branch_id);
    
    res.json({
      success: true,
      data: schoolType,
      message: "Available assessment types retrieved successfully"
    });

  } catch (error) {
    console.error("Error in getAvailableAssessmentTypes:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching assessment types.",
      error: error.message
    });
  }
};

module.exports = {
  getEnhancedCAReport,
  getAvailableAssessmentTypes,
  getSchoolAssessmentType,
  getTraditionalCAConfig,
  getMonthlyCAConfig
};