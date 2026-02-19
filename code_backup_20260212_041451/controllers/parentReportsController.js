const db = require("../models");

/**
 * Get report availability for a specific student
 * Returns which CA reports and End of Term reports are available (Released status)
 * Groups reports by academic year and term
 *
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.admission_no - Student's admission number
 * @param {string} req.query.branch_id - Branch ID
 * @param {string} req.query.class_code - Class Code
 *
 * @returns {Object} Report availability status grouped by academic year
 */
const getReportAvailability = async (req, res) => {
  try {
    const {
      admission_no,
      class_code
    } = req.query;

    // Validate required parameters
    if (!admission_no) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: admission_no is required"
      });
    }

    if (!class_code) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: class_code is required"
      });
    }

    // const effectiveBranchId = branch_id || req.user?.branch_id;

    // if (!effectiveBranchId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Branch ID is required"
    //   });
    // }

    // First, get all academic years and terms where student has score records
    const academicYearsQuery = `
      SELECT DISTINCT
        ws.academic_year,
        ws.term,
        ws.class_code,
        COALESCE(c.class_name, ws.class_code) as class_name
      FROM weekly_scores ws
      LEFT JOIN classes c ON ws.class_code = c.class_code
      WHERE ws.admission_no = :admission_no
        AND ws.class_code = :class_code
      ORDER BY ws.academic_year DESC, ws.term DESC
    `;

    let academicYears = [];
    try {
      academicYears = await db.sequelize.query(academicYearsQuery, {
        replacements: {
          admission_no,
          class_code
        },
        type: db.sequelize.QueryTypes.SELECT
      });
    } catch (error) {
      console.error("Error querying weekly_scores table:", error.message);
      // Try with alternative table name if weekly_scores doesn't exist
      try {
        const alternativeQuery = `
          SELECT DISTINCT
            ws.academic_year,
            ws.term,
            ws.class_code,
            COALESCE(c.class_name, ws.class_code) as class_name
          FROM student_scores ws  // Alternative table name
          LEFT JOIN classes c ON ws.class_code = c.class_code 
          WHERE ws.admission_no = :admission_no
            AND ws.class_code = :class_code
          ORDER BY ws.academic_year DESC, ws.term DESC
        `;
        
        academicYears = await db.sequelize.query(alternativeQuery, {
          replacements: {
            admission_no,
            class_code
          },
          type: db.sequelize.QueryTypes.SELECT
        });
      } catch (error2) {
        // If both fail, try with weekly_scores table name
        try {
          const altWeeklyScoresQuery = `
            SELECT DISTINCT
              ws.academic_year,
              ws.term,
              ws.class_code,
              COALESCE(c.class_name, ws.class_code) as class_name
            FROM weekly_scores ws
            LEFT JOIN classes c ON ws.class_code = c.class_code
            WHERE ws.admission_no = :admission_no
            AND ws.class_code = :class_code
            ORDER BY ws.academic_year DESC, ws.term DESC
          `;
          
          academicYears = await db.sequelize.query(altWeeklyScoresQuery, {
            replacements: {
              admission_no,
              class_code
            },
            type: db.sequelize.QueryTypes.SELECT
          });
        } catch (error3) {
          // If all table attempts fail, return empty results
          console.error("All query attempts failed:", error3.message);
          return res.json({
            success: true,
            data: {
              student: {
                admission_no
              },
              academic_years: [],
              summary: {
                total_years: 0,
                total_terms: 0
              }
            },
            message: "No score records found for this student"
          });
        }
      }
    }

    if (!academicYears || academicYears.length === 0) {
      return res.json({
        success: true,
        data: {
          student: {
            admission_no
          },
          academic_years: [],
          summary: {
            total_years: 0,
            total_terms: 0
          }
        },
        message: "No score records found for this student"
      });
    }

    // Now fetch report availability for each academic year/term combination
    const reportsByYear = [];

    for (const yearTerm of academicYears) {
      const { academic_year, term, class_code, class_name } = yearTerm;

      // Query to check CA report availability 
      let caAvailability = [];
      try {
        const caAvailabilityQuery = `
          SELECT DISTINCT
            assessment_type AS ca_type,
            status,
            COUNT(*) as score_count
          FROM weekly_scores
          WHERE admission_no = :admission_no
            AND class_code = :class_code
            AND academic_year = :academic_year
            AND term = :term
            AND status = 'Released'
          GROUP BY assessment_type, status
          ORDER BY assessment_type
        `;

        caAvailability = await db.sequelize.query(caAvailabilityQuery, {
          replacements: {
            admission_no,
            class_code,
            academic_year,
            term,
          },
          type: db.sequelize.QueryTypes.SELECT
        });
      } catch (error) {
        console.error("Error fetching CA availability:", error.message);
      }
      console.log({caAvailability});
      
      // Query to check if EXAM results are available (indicates End of Term report is ready)
      let examAvailability = [];
      try {
        const examAvailabilityQuery = `
          SELECT DISTINCT
            assessment_type as ca_type,
            status,
            COUNT(*) as score_count
          FROM weekly_scores
          WHERE admission_no = :admission_no
            AND class_code = :class_code
            AND academic_year = :academic_year
            AND term = :term
            AND assessment_type = 'EXAM'
            AND status = 'Released'
          GROUP BY assessment_type, status
        `;

        examAvailability = await db.sequelize.query(examAvailabilityQuery, {
          replacements: {
            admission_no,
            class_code,
            academic_year,
            term,
          },
          type: db.sequelize.QueryTypes.SELECT
        });
      } catch (error) {
        console.error("Error fetching exam availability:", error.message);
      }

      // Organize available CA reports
      const availableCAs = caAvailability
        .filter(ca => ca.ca_type && ca.ca_type !== 'EXAM')
        .map(ca => ({
          ca_type: ca.ca_type,
          status: ca.status,
          score_count: ca.score_count || 0,
          is_available: true,
          report_url: `/ca-report?admission_no=${admission_no}&ca_type=${ca.ca_type}&academic_year=${academic_year}&term=${term}`
        }));

      // Check if End of Term report is available (EXAM must be Released)
      const endOfTermAvailable = examAvailability.length > 0 &&
                                 examAvailability.some(exam => exam.status === 'Released');

      // Get all configured CA types for this term to show what's not yet released
      let allCATypes = [];
      try {
        const allCATypesQuery = `
          SELECT DISTINCT ca_type
          FROM ca_setup
          WHERE school_id = (SELECT school_id FROM classes WHERE class_code = :class_code LIMIT 1)
            AND branch_id = (SELECT branch_id FROM classes WHERE class_code = :class_code LIMIT 1)
            AND ca_type != 'EXAM'
            AND is_active = '1'
          ORDER BY ca_type
        `;

        allCATypes = await db.sequelize.query(allCATypesQuery, {
          replacements: {
            class_code
          },
          type: db.sequelize.QueryTypes.SELECT
        });
      } catch (error) {
        console.error("Error fetching CA types:", error.message);
        // If CA setup query fails, only show CAs that have been released (from availableCAs)
        allCATypes = availableCAs.map(ca => ({ ca_type: ca.ca_type }));
      }

      // If no CA types configured, only show released CAs
      if (!allCATypes || allCATypes.length === 0) {
        allCATypes = availableCAs.map(ca => ({ ca_type: ca.ca_type }));
      }

      // Create a complete list showing both available and unavailable reports
      const releasedCATypes = new Set(availableCAs.map(ca => ca.ca_type));
      const completeCAList = allCATypes.map(caType => {
        if (caType.ca_type && releasedCATypes.has(caType.ca_type)) {
          return availableCAs.find(ca => ca.ca_type === caType.ca_type);
        } else if (caType.ca_type) {
          return {
            ca_type: caType.ca_type,
            status: 'Not Released',
            score_count: 0,
            is_available: false,
            report_url: null
          };
        }
        return null;
      }).filter(Boolean);

      // Add this year/term to the results
      reportsByYear.push({
        academic_year,
        term,
        class_code,
        class_name,
        ca_reports: completeCAList,
        end_of_term_report: {
          is_available: endOfTermAvailable,
          status: endOfTermAvailable ? 'Released' : 'Not Released',
          exam_score_count: endOfTermAvailable && examAvailability[0] ? examAvailability[0].score_count || 0 : 0,
          report_url: endOfTermAvailable ? `/end-of-term-report?admission_no=${admission_no}&academic_year=${academic_year}&term=${term}` : null
        },
        summary: {
          total_ca_types: completeCAList.length,
          available_ca_reports: availableCAs.filter(ca => ca.is_available).length,
          end_of_term_available: endOfTermAvailable
        }
      });
    }

    // Group by academic year
    const groupedByYear = {};
    reportsByYear.forEach(report => {
      if (!groupedByYear[report.academic_year]) {
        groupedByYear[report.academic_year] = {
          academic_year: report.academic_year,
          terms: []
        };
      }
      groupedByYear[report.academic_year].terms.push({
        term: report.term,
        class_code: report.class_code,
        class_name: report.class_name,
        ca_reports: report.ca_reports,
        end_of_term_report: report.end_of_term_report,
        summary: report.summary
      });
    });

    const academicYearsArray = Object.values(groupedByYear);

    return res.json({
      success: true,
      data: {
        student: {
          admission_no
        },
        academic_years: academicYearsArray,
        summary: {
          total_years: academicYearsArray.length,
          total_terms: reportsByYear.length,
          last_updated: new Date().toISOString()
        }
      },
      message: "Report availability retrieved successfully"
    });

  } catch (error) {
    console.error("Error in getReportAvailability:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching report availability",
      error: error.message
    });
  }
};

/**
 * Get End of Term report data for a specific student
 * Uses the same logic as admin endpoint for consistency
 */
const getEndOfTermReport = async (req, res) => {
  try {
    const { admission_no, academic_year, term, branch_id } = req.query;

    if (!admission_no || !academic_year || !term) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    // Import and use the admin controller directly
    const caAssessmentController = require('./caAssessmentController');
    
    // Create admin-format request
    const adminReq = {
      body: {
        queryType: "student",
        admissionNo: admission_no,
        academicYear: academic_year,
        term: term,
        classCode: null
      },
      user: {
        school_id: 'SCH/20',
        branch_id: branch_id && branch_id !== 'undefined' ? branch_id : null
      }
    };

    // Call admin endpoint and return result
    return await caAssessmentController.getEndOfTermReport(adminReq, res);

  } catch (error) {
    console.error("Error in getEndOfTermReport:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch End of Term report data",
      error: error.message
    });
  }
};

module.exports = {
  getReportAvailability,
  getEndOfTermReport
};
