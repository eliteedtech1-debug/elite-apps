// Enhanced getClassCAReports function with Traditional/Monthly school support
// Add this to the existing caAssessmentController.js

const db = require("../models");

const getEnhancedClassCAReports = async (req, res) => {
  console.log('=== DEBUG START ===');
  console.log('req.body:', JSON.stringify(req.body));
  console.log('req.query:', JSON.stringify(req.query));
  console.log('=== DEBUG END ===');
  
  const {
    query_type = null,
    class_code = null,
    ca_type = null,
    academic_year = null,
    term = null,
    admission_no = null,
    assessment_mode = null // 'traditional' or 'monthly'
  } = req.body;

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

    /** ---------------------------------------------------------
     *  Helper: Determine School Assessment Type
     * ----------------------------------------------------------
     */
    const determineSchoolType = async () => {
      // First check the school_setup table for assessmentType
      const schoolSetup = await db.sequelize.query(
        `SELECT assessmentType FROM school_setup WHERE school_id = :school_id LIMIT 1`,
        {
          replacements: { school_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (schoolSetup && schoolSetup[0]?.assessmentType) {
        const assessmentType = schoolSetup[0].assessmentType.toLowerCase();
        return {
          type: assessmentType === 'monthly' ? 'monthly' : 'traditional',
          available_types: [],
          is_traditional: assessmentType !== 'monthly',
          is_monthly: assessmentType === 'monthly'
        };
      }

      // Fallback to CA setup detection
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

      // Check for traditional pattern (CA1, CA2, CA3, CA4)
      const traditionalTypes = ['CA1', 'CA2', 'CA3', 'CA4'];
      const hasTraditionalPattern = traditionalTypes.every(type => 
        caSetups.some(setup => setup.ca_type === type)
      );

      // Check for monthly/weekly patterns
      const hasWeeklyPattern = caSetups.some(setup => 
        setup.ca_type.includes('WEEK') || 
        setup.ca_type.includes('MONTHLY') ||
        setup.count > 4
      );

      return {
        type: hasWeeklyPattern ? 'monthly' : 'traditional',
        available_types: caSetups.map(s => s.ca_type),
        is_traditional: hasTraditionalPattern,
        is_monthly: hasWeeklyPattern
      };
    };

    /** ---------------------------------------------------------
     *  Helper: Fetch CA Configuration
     * ----------------------------------------------------------
     */
    const fetchCAConfiguration = async (schoolType) => {
      const classSection = await db.sequelize.query(
        `SELECT section FROM classes WHERE class_code = :class_code AND school_id = :school_id`,
        { replacements: { class_code, school_id }, type: db.sequelize.QueryTypes.SELECT }
      );
      const section = classSection[0]?.section || 'All';

      if (schoolType === 'traditional') {
        // Traditional CA setup (CA1, CA2, CA3, CA4, EXAM)
        const sectionSpecific = await db.sequelize.query(
          `SELECT ca_type AS assessment_type, 
            COALESCE(SUM(DISTINCT intended_contribution_percent), MAX(overall_contribution_percent)) AS contribution_percent,
            MIN(week_number) AS week_number, 
            MIN(id) AS ca_setup_id, SUM(max_score) AS max_score
          FROM ca_setup 
          WHERE school_id = :school_id 
            AND branch_id = :branch_id
            AND (section = :section OR section = 'All') 
            AND status = 'Active'
            AND ca_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'EXAM')
          GROUP BY ca_type
          ORDER BY CASE ca_type 
            WHEN 'CA1' THEN 1 WHEN 'CA2' THEN 2 WHEN 'CA3' THEN 3 
            WHEN 'CA4' THEN 4 WHEN 'EXAM' THEN 5 ELSE 6 END`,
          { replacements: { school_id, branch_id, section }, type: db.sequelize.QueryTypes.SELECT }
        );

        return sectionSpecific.length > 0 ? sectionSpecific : await db.sequelize.query(
          `SELECT ca_type AS assessment_type,
            COALESCE(SUM(DISTINCT intended_contribution_percent), MAX(overall_contribution_percent)) AS contribution_percent,
            MIN(week_number) AS week_number,
            MIN(id) AS ca_setup_id, SUM(max_score) AS max_score
          FROM ca_setup 
          WHERE school_id = :school_id 
            AND branch_id = :branch_id
            AND section = 'All' 
            AND status = 'Active'
            AND ca_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'EXAM')
          GROUP BY ca_type
          ORDER BY CASE ca_type 
            WHEN 'CA1' THEN 1 WHEN 'CA2' THEN 2 WHEN 'CA3' THEN 3 
            WHEN 'CA4' THEN 4 WHEN 'EXAM' THEN 5 ELSE 6 END`,
          { replacements: { school_id, branch_id }, type: db.sequelize.QueryTypes.SELECT }
        );
      } else {
        // Monthly/Weekly CA setup
        let sectionSpecific = await db.sequelize.query(
          `SELECT ca_type AS assessment_type, 
            week_number,
            max_score,
            overall_contribution_percent AS contribution_percent,
            intended_contribution_percent,
            id AS ca_setup_id
          FROM ca_setup 
          WHERE school_id = :school_id 
            AND branch_id = :branch_id
            AND (section = :section OR section = 'All') 
            AND status = 'Active'
          ORDER BY week_number ASC, ca_type ASC`,
          { replacements: { school_id, branch_id, section }, type: db.sequelize.QueryTypes.SELECT }
        );

        if (sectionSpecific.length === 0) {
          sectionSpecific = await db.sequelize.query(
            `SELECT ca_type AS assessment_type,
              week_number,
              max_score,
              overall_contribution_percent AS contribution_percent,
              intended_contribution_percent,
              id AS ca_setup_id
            FROM ca_setup 
            WHERE school_id = :school_id 
              AND branch_id = :branch_id
              AND section = 'All' 
              AND status = 'Active'
            ORDER BY week_number ASC, ca_type ASC`,
            { replacements: { school_id, branch_id }, type: db.sequelize.QueryTypes.SELECT }
          );
        }

        // Deduplicate by (assessment_type, week_number) - keep the one with lowest ca_setup_id
        const uniqueMap = new Map();
        sectionSpecific.forEach((item) => {
          const key = `${item.assessment_type}_${item.week_number}`;
          const existing = uniqueMap.get(key);
          if (!existing || item.ca_setup_id < existing.ca_setup_id) {
            uniqueMap.set(key, item);
          }
        });

        return Array.from(uniqueMap.values());
      }
    };

    // Determine school assessment type
    const schoolTypeInfo = await determineSchoolType();
    const effectiveMode = assessment_mode || schoolTypeInfo.type;

    /** ---------------------------------------------------------
     *  CASE 1: View Class CA Report
     * ----------------------------------------------------------
     */
    if (query_type === 'View Class CA Report' && class_code) {
      const caConfiguration = await fetchCAConfiguration(effectiveMode);

      if (!caConfiguration || caConfiguration.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: `No CA configuration found for ${effectiveMode} assessment mode.`,
          school_type: schoolTypeInfo,
          assessment_mode: effectiveMode
        });
      }

      let reportQuery;
      let queryReplacements = { class_code, school_id, branch_id };

      if (effectiveMode === 'traditional') {
        // Traditional report query (CA1, CA2, CA3, CA4, EXAM)
        reportQuery = `
          SELECT DISTINCT
            all_scores.admission_no,
            all_scores.subject_code,
            all_scores.ca_setup_id,
            all_scores.score,
            all_scores.max_score,
            all_scores.week_number,
            all_scores.assessment_type,
            all_scores.student_name,
            all_scores.class_name,
            all_scores.school_id,
            all_scores.current_class,
            all_scores.subject,
            all_scores.academic_year,
            all_scores.term,
            all_scores.overall_contribution_percent,
            class_counts.total_students_in_class,
            all_scores.avg_per_subject,
            subject_rankings.sbj_position,
            ROUND((all_scores.score / all_scores.max_score) * 100, 2) as percentage,
            ROUND((all_scores.score / all_scores.max_score) * all_scores.overall_contribution_percent, 2) as weighted_score
          FROM (
            SELECT DISTINCT
              ws.admission_no,
              ws.subject_code,
              ws.ca_setup_id,
              ws.score,
              ws.max_score,
              ws.week_number,
              ws.assessment_type,
              s.student_name,
              c.class_name,
              s.school_id,
              c.class_code AS current_class,
              sub.subject AS subject,
              COALESCE(ws.academic_year, :academic_year) AS academic_year,
              COALESCE(ws.term, :term) AS term,
              cs.overall_contribution_percent,
              AVG(ws.score) OVER (PARTITION BY ws.subject_code, ws.assessment_type) as avg_per_subject
            FROM weekly_scores ws
            LEFT JOIN ca_setup cs ON ws.ca_setup_id = cs.id
            LEFT JOIN students s ON ws.admission_no = s.admission_no
            LEFT JOIN classes c ON ws.class_code = c.class_code
            LEFT JOIN subjects sub ON ws.subject_code = sub.subject_code
            WHERE ws.class_code = :class_code 
              AND s.school_id = :school_id
              AND ws.assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'CA5', 'CA6', 'CA7', 'EXAM')
        `;

        if (ca_type) {
          reportQuery += ` AND ws.assessment_type = :ca_type`;
          queryReplacements.ca_type = ca_type;
        }
        if (academic_year) {
          queryReplacements.academic_year = academic_year;
        }
        if (term) {
          queryReplacements.term = term;
        }

      } else {
        // Monthly report query (week-based)
        reportQuery = `
          SELECT DISTINCT
            all_scores.admission_no,
            all_scores.subject_code,
            all_scores.ca_setup_id,
            all_scores.score,
            all_scores.max_score,
            all_scores.week_number,
            all_scores.assessment_type,
            all_scores.student_name,
            all_scores.class_name,
            all_scores.school_id,
            all_scores.current_class,
            all_scores.subject,
            all_scores.academic_year,
            all_scores.term,
            all_scores.overall_contribution_percent,
            class_counts.total_students_in_class,
            all_scores.avg_per_subject,
            subject_rankings.sbj_position,
            ROUND((all_scores.score / all_scores.max_score) * 100, 2) as percentage,
            ROUND((all_scores.score / all_scores.max_score) * all_scores.overall_contribution_percent, 2) as weighted_score
          FROM (
            SELECT DISTINCT
              ws.admission_no,
              ws.subject_code,
              ws.ca_setup_id,
              ws.score,
              ws.max_score,
              ws.week_number,
              ws.assessment_type,
              s.student_name,
              c.class_name,
              s.school_id,
              c.class_code AS current_class,
              sub.subject AS subject,
              COALESCE(ws.academic_year, :academic_year) AS academic_year,
              COALESCE(ws.term, :term) AS term,
              cs.overall_contribution_percent,
              AVG(ws.score) OVER (PARTITION BY ws.subject_code, ws.week_number, ws.assessment_type) as avg_per_subject
            FROM weekly_scores ws
            LEFT JOIN ca_setup cs ON ws.ca_setup_id = cs.id
            LEFT JOIN students s ON ws.admission_no = s.admission_no
            LEFT JOIN classes c ON ws.class_code = c.class_code
            LEFT JOIN subjects sub ON ws.subject_code = sub.subject_code
            WHERE ws.class_code = :class_code 
              AND s.school_id = :school_id
              AND s.branch_id = :branch_id
        `;

        if (ca_type) {
          reportQuery += ` AND ws.assessment_type = :ca_type`;
          queryReplacements.ca_type = ca_type;
        }
        if (academic_year) {
          reportQuery += ` AND ws.academic_year = :academic_year`;
          queryReplacements.academic_year = academic_year;
        }
        if (term) {
          reportQuery += ` AND ws.term = :term`;
          queryReplacements.term = term;
        }
      }

      // Complete the query with common parts
      reportQuery += `
          ) all_scores
          LEFT JOIN (
            SELECT 
              class_code, 
              COUNT(DISTINCT admission_no) as total_students_in_class
            FROM students 
            WHERE school_id = :school_id AND class_code = :class_code
            GROUP BY class_code
          ) class_counts ON all_scores.current_class = class_counts.class_code
          LEFT JOIN (
            SELECT 
              ws2.admission_no,
              ws2.subject_code,
              ROW_NUMBER() OVER (
                PARTITION BY ws2.subject_code 
                ORDER BY SUM(ws2.score) DESC
              ) as sbj_position
            FROM weekly_scores ws2
            LEFT JOIN students s2 ON ws2.admission_no = s2.admission_no
            WHERE ws2.class_code = :class_code 
              AND s2.school_id = :school_id
            GROUP BY ws2.admission_no, ws2.subject_code
          ) subject_rankings ON all_scores.admission_no = subject_rankings.admission_no 
            AND all_scores.subject_code = subject_rankings.subject_code
          ORDER BY 
            all_scores.admission_no,
            all_scores.subject_code,
            ${effectiveMode === 'traditional' 
              ? `CASE all_scores.assessment_type 
                   WHEN 'CA1' THEN 1 WHEN 'CA2' THEN 2 WHEN 'CA3' THEN 3 
                   WHEN 'CA4' THEN 4 WHEN 'CA5' THEN 5 WHEN 'CA6' THEN 6 
                   WHEN 'CA7' THEN 7 WHEN 'EXAM' THEN 8 END`
              : `all_scores.week_number, all_scores.assessment_type`
            }
      `;

      const results = await db.sequelize.query(reportQuery, {
        replacements: queryReplacements,
        type: db.sequelize.QueryTypes.SELECT
      });

      // Fetch all subjects for this class (even those without scores)
      const allSubjects = await db.sequelize.query(
        `SELECT DISTINCT subject_code, subject 
         FROM subjects 
         WHERE class_code = :class_code 
           AND school_id = :school_id 
           AND branch_id = :branch_id 
           AND status = 'Active'
         ORDER BY subject`,
        { replacements: { class_code, school_id, branch_id }, type: db.sequelize.QueryTypes.SELECT }
      );

      // Fetch section for the class
      const [classInfo] = await db.sequelize.query(
        `SELECT section FROM classes WHERE class_code = :class_code LIMIT 1`,
        { replacements: { class_code }, type: db.sequelize.QueryTypes.SELECT }
      );

      // Group results by student and subject for template consumption
      const groupedData = {};
      results.forEach(row => {
        const studentKey = row.admission_no;
        if (!groupedData[studentKey]) {
          groupedData[studentKey] = {
            admission_no: row.admission_no,
            student_name: row.student_name,
            class_name: row.class_name,
            school_id: row.school_id,
            current_class: row.current_class,
            academic_year: row.academic_year,
            term: row.term,
            total_students_in_class: row.total_students_in_class,
            subjects: {}
          };
        }
        
        const subjectKey = row.subject_code;
        if (!groupedData[studentKey].subjects[subjectKey]) {
          groupedData[studentKey].subjects[subjectKey] = {
            subject: row.subject,
            subject_code: row.subject_code,
            weeks: {},
            total: 0,
            maxPossible: 0,
            subject_position: row.sbj_position,
            out_of: row.total_students_in_class,
            subject_class_average: row.avg_per_subject
          };
        }
        
        const weekNum = row.week_number;
        groupedData[studentKey].subjects[subjectKey].weeks[weekNum] = {
          score: parseFloat(row.score) || 0,
          maxScore: parseFloat(row.max_score) || 0
        };
        groupedData[studentKey].subjects[subjectKey].total += parseFloat(row.weighted_score) || 0;
        groupedData[studentKey].subjects[subjectKey].maxPossible += parseFloat(row.overall_contribution_percent) || 0;
      });

      // Convert to array format
      const groupedResults = Object.values(groupedData).map((student) => ({
        ...student,
        subjects: Object.values(student.subjects)
      }));

      // If no results, generate student-subject combinations for empty report
      if (results.length === 0) {
        const fallbackResults = await db.sequelize.query(`
          SELECT 
            s.admission_no,
            s.student_name,
            s.stream AS student_stream,
            s.profile_picture,
            c.class_code,
            c.class_name,
            sub.subject_code,
            sub.subject,
            sub.type AS subject_type,
            NULL AS ca1_score,
            NULL AS ca2_score,
            NULL AS ca3_score,
            NULL AS ca4_score,
            NULL AS exam_score,
            NULL AS total_score,
            '0.00' AS total_max_score,
            NULL AS percentage,
            NULL AS grade,
            NULL AS remark,
            :academic_year AS academic_year,
            :term AS term
          FROM students s
          INNER JOIN classes c ON s.current_class = c.class_code
          INNER JOIN subjects sub ON sub.class_code = c.class_code AND sub.status = 'Active'
          WHERE c.class_code = :class_code
            AND s.school_id = :school_id
            AND s.branch_id = :branch_id
            AND c.school_id = :school_id
            AND s.status = 'Active'
          ORDER BY s.student_name, sub.subject`,
          {
            replacements: { class_code, academic_year, term, school_id, branch_id },
            type: db.sequelize.QueryTypes.SELECT
          }
        );
        
        return res.json({
          success: true,
          data: fallbackResults,
          groupedData: [],
          allSubjects: [],
          caConfiguration: caConfiguration,
          section: '',
          school_type: schoolTypeInfo,
          assessment_mode: effectiveMode,
          query_parameters: queryReplacements,
          message: `Class CA Report (${effectiveMode} mode) retrieved successfully.`
        });
      }

      return res.json({
        success: true,
        data: results,
        groupedData: groupedResults,
        allSubjects: allSubjects,
        caConfiguration: caConfiguration,
        section: classInfo?.section || '',
        school_type: schoolTypeInfo,
        assessment_mode: effectiveMode,
        query_parameters: queryReplacements,
        message: `Class CA Report (${effectiveMode} mode) retrieved successfully.`
      });
    }

    /** ---------------------------------------------------------
     *  CASE 2: Individual Student Report
     * ----------------------------------------------------------
     */
    if (query_type === 'View Individual Student Report' && admission_no) {
      const caConfiguration = await fetchCAConfiguration(effectiveMode);

      let studentQuery;
      let studentReplacements = { admission_no, school_id, branch_id };

      if (effectiveMode === 'traditional') {
        studentQuery = `
          SELECT 
            ws.admission_no,
            s.student_name,
            ws.class_code,
            c.class_name,
            ws.subject_code,
            sub.subject as subject_name,
            ws.assessment_type,
            ws.score,
            ws.max_score,
            ROUND((ws.score / ws.max_score) * 100, 2) as percentage,
            cs.overall_contribution_percent,
            ROUND((ws.score / ws.max_score) * cs.overall_contribution_percent, 2) as weighted_score,
            ws.academic_year,
            ws.term
          FROM weekly_scores ws
          LEFT JOIN students s ON ws.admission_no = s.admission_no AND ws.school_id = s.school_id
          LEFT JOIN classes c ON ws.class_code = c.class_code AND ws.school_id = c.school_id
          LEFT JOIN subjects sub ON ws.subject_code = sub.subject_code AND ws.school_id = sub.school_id
          LEFT JOIN ca_setup cs ON ws.assessment_type = cs.ca_type 
            AND ws.school_id = cs.school_id 
            AND ws.branch_id = cs.branch_id
          WHERE ws.admission_no = :admission_no 
            AND ws.school_id = :school_id 
            AND ws.branch_id = :branch_id
            AND ws.assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'EXAM')
          ORDER BY 
            ws.subject_code,
            CASE ws.assessment_type 
              WHEN 'CA1' THEN 1 WHEN 'CA2' THEN 2 WHEN 'CA3' THEN 3 
              WHEN 'CA4' THEN 4 WHEN 'EXAM' THEN 5 
            END
        `;
      } else {
        studentQuery = `
          SELECT 
            ws.admission_no,
            s.student_name,
            ws.class_code,
            c.class_name,
            ws.subject_code,
            sub.subject as subject_name,
            ws.assessment_type,
            ws.week_number,
            ws.score,
            ws.max_score,
            ROUND((ws.score / ws.max_score) * 100, 2) as percentage,
            cs.overall_contribution_percent,
            ROUND((ws.score / ws.max_score) * cs.overall_contribution_percent, 2) as weighted_score,
            ws.academic_year,
            ws.term,
            aw.begin_date as week_start,
            aw.end_date as week_end
          FROM weekly_scores ws
          LEFT JOIN students s ON ws.admission_no = s.admission_no AND ws.school_id = s.school_id
          LEFT JOIN classes c ON ws.class_code = c.class_code AND ws.school_id = c.school_id
          LEFT JOIN subjects sub ON ws.subject_code = sub.subject_code AND ws.school_id = sub.school_id
          LEFT JOIN ca_setup cs ON ws.assessment_type = cs.ca_type 
            AND ws.week_number = cs.week_number
            AND ws.school_id = cs.school_id 
            AND ws.branch_id = cs.branch_id
          LEFT JOIN academic_weeks aw ON ws.week_number = aw.week_number
            AND ws.school_id = aw.school_id
            AND ws.branch_id = aw.branch_id
          WHERE ws.admission_no = :admission_no 
            AND ws.school_id = :school_id 
            AND ws.branch_id = :branch_id
          ORDER BY 
            ws.subject_code,
            ws.week_number,
            ws.assessment_type
        `;
      }

      if (academic_year) {
        studentQuery += ` AND ws.academic_year = :academic_year`;
        studentReplacements.academic_year = academic_year;
      }
      if (term) {
        studentQuery += ` AND ws.term = :term`;
        studentReplacements.term = term;
      }
      if (ca_type) {
        studentQuery += ` AND ws.assessment_type = :ca_type`;
        studentReplacements.ca_type = ca_type;
      }

      const results = await db.sequelize.query(studentQuery, {
        replacements: studentReplacements,
        type: db.sequelize.QueryTypes.SELECT
      });

      return res.json({
        success: true,
        data: results,
        caConfiguration: caConfiguration,
        school_type: schoolTypeInfo,
        assessment_mode: effectiveMode,
        query_parameters: studentReplacements,
        message: `Individual Student CA Report (${effectiveMode} mode) retrieved successfully.`
      });
    }

    /** ---------------------------------------------------------
     *  Default: Return configuration info
     * ----------------------------------------------------------
     */
    const caConfiguration = await fetchCAConfiguration(effectiveMode);
    
    return res.json({
      success: true,
      data: {
        caConfiguration: caConfiguration,
        school_type: schoolTypeInfo,
        assessment_mode: effectiveMode,
        available_query_types: [
          'View Class CA Report',
          'View Individual Student Report'
        ],
        debug_info: {
          query_type_received: query_type,
          class_code_received: class_code,
          condition_met: query_type === 'View Class CA Report' && class_code,
          req_body: req.body,
          req_query: req.query
        }
      },
      message: `CA Report configuration (${effectiveMode} mode) retrieved successfully.`
    });

  } catch (error) {
    console.error("Error in getEnhancedClassCAReports:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during enhanced class CA report retrieval.",
      error: error.message,
    });
  }
};

// Export the enhanced function
module.exports = {
  // ... existing exports
  getEnhancedClassCAReports
};