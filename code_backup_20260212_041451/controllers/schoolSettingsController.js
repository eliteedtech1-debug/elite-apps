const db = require("../models");
const { QueryTypes } = require('sequelize');

/**
 * School Settings Controller
 * Uses the `report_configurations` table (one row per school/branch)
 */

// Full default configuration
const DEFAULT_CONFIGURATION = {
  visibility: {
    showPosition: true,
    showOutOf: true,
    showClassAverage: true,
    showGradeDetails: true,
    showCharacterAssessment: true,
    showSchoolLogo: true,
    showSchoolContactDetails: true,
    showStudentPhoto: true,
    showFormTeacher: true,
    showTeacherRemarks: true,
    showPrincipalRemarks: true,
    showNextTerm: true,
    showAttendancePerformance: true,
    showAttendanceStats: true,
    showAttendanceRate: true,
    showAttendanceDetails: true,
  },
  tableHeaders: {
    ca1Name: "CA1",
    ca2Name: "CA2",
    ca3Name: "EXAM",
    examName: "Exam",
    ca1Score: 20,
    ca2Score: 10,
    ca3Score: 70,
    examScore: 0,
    useCustomHeaders: true,
  },
  colors: {
    primary: "#8b5cf6",
    secondary: "#6b7280",
    accent: "#10b981",
    background: "#ffffff",
    border: "#d1d5db",
    headerBackground: "#f3f4f6",
    gradeExcellent: "#059669",
    gradeGood: "#f59e0b",
    gradePoor: "#ef4444",
    attendanceExcellent: "#059669",
    attendanceGood: "#10b981",
    attendanceAverage: "#f59e0b",
    attendancePoor: "#ef4444",
  },
  layout: {
    headerStyle: "modern",
    tableStyle: "striped",
    assessmentLayout: "row",
    fontSize: "medium",
    spacing: "relaxed",
    borderRadius: "rounded",
  },
  content: {
    showMotto: true,
    showPrincipalSignature: true,
    showFormTeacherRemarks: true,
    customFooter: "🌟 Celebrating Every Achievement - Building Bright Futures 🌟",
    reportTitle: "STUDENT ACHIEVEMENT REPORT",
    schoolAddress: "",
    customHeaderText: "Celebrating Learning Progress",
    customSchoolMotto: "",
    customBadgeUrl: "",
    customPrimaryContact: "",
    customSecondaryContact: "",
    customEmailAddress: "",
    customWebsite: "",
    attendanceTitle: "PARTICIPATION & ATTENDANCE",
    attendanceThreshold: 90,
    showAttendanceGrade: true,
    attendanceGradeScale: {
      excellent: 95,
      good: 90,
      average: 80,
      poor: 80,
    },
  },
  principal_remarks: "Keep up the good work.",
  next_term_date: "TBA",
  school_motto: "",
  report_footer_text: "",
};

const getSchoolSettings = async (req, res) => {
  try {
    const { school_id, branch_id, academic_year, term } = req.query;
    const schoolId = school_id || req.user?.school_id;
    const branchId = branch_id || req.user?.branch_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: "school_id is required"
      });
    }

    // Build query based on whether branch_id is provided
    let query, replacements;
    if (branchId) {
      // Look for branch-specific configuration first
      query = `
        SELECT * FROM report_configurations
        WHERE school_id = :school_id AND branch_id = :branch_id
        ORDER BY created_at DESC
        LIMIT 1
      `;
      replacements = { school_id: schoolId, branch_id: branchId };
    } else {
      // Look for school-wide configuration (branch_id is NULL)
      query = `
        SELECT * FROM report_configurations
        WHERE school_id = :school_id AND branch_id IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `;
      replacements = { school_id: schoolId };
    }

    const [results] = await db.sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    let finalConfig = { ...DEFAULT_CONFIGURATION };

    if (results && results.length > 0) {
      const configRecord = results[0];
      try {
        // Parse JSON configuration
        const parsedConfig = JSON.parse(configRecord.configuration);
        // Merge defaults with saved config (saved overrides default)
        finalConfig = { ...DEFAULT_CONFIGURATION, ...parsedConfig };
      } catch (parseError) {
        console.error('Error parsing configuration JSON:', parseError);
        // Use defaults if parsing fails
      }
    }

    // Fetch next term begin date from academic_calendar if academic_year and term are provided
    if (academic_year && term) {
      try {
        // Define term order
        const termOrder = ['First Term', 'Second Term', 'Third Term'];
        const currentTermIndex = termOrder.indexOf(term);

        if (currentTermIndex !== -1) {
          let nextTermQuery, nextTermReplacements;

          // Check if there's a next term in the same academic year
          if (currentTermIndex < termOrder.length - 1) {
            const nextTerm = termOrder[currentTermIndex + 1];
            nextTermQuery = `
              SELECT begin_date
              FROM academic_calendar
              WHERE school_id = :school_id
                AND branch_id = :branch_id
                AND academic_year = :academic_year
                AND term = :next_term
              LIMIT 1
            `;
            nextTermReplacements = {
              school_id: schoolId,
              branch_id: branchId,
              academic_year,
              next_term: nextTerm
            };
          } else {
            // Current term is Third Term, look for First Term of next academic year
            // Extract years from academic_year format "2024/2025"
            const [startYear, endYear] = academic_year.split('/').map(y => parseInt(y));
            const nextAcademicYear = `${startYear + 1}/${endYear + 1}`;

            nextTermQuery = `
              SELECT begin_date
              FROM academic_calendar
              WHERE school_id = :school_id
                AND branch_id = :branch_id
                AND academic_year = :next_academic_year
                AND term = 'First Term'
              LIMIT 1
            `;
            nextTermReplacements = {
              school_id: schoolId,
              branch_id: branchId,
              next_academic_year: nextAcademicYear
            };
          }

          const nextTermData = await db.sequelize.query(nextTermQuery, {
            replacements: nextTermReplacements,
            type: QueryTypes.SELECT
          });

          if (nextTermData && nextTermData.length > 0 && nextTermData[0].begin_date) {
            // Format the date nicely (e.g., "May 5, 2025")
            const beginDate = new Date(nextTermData[0].begin_date);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            finalConfig.next_term_date = beginDate.toLocaleDateString('en-US', options);
          }
        }
      } catch (nextTermError) {
        console.error('Error fetching next term date:', nextTermError);
        // Keep default "TBA" if query fails
      }
    }

    res.status(200).json({
      success: true,
      data: finalConfig,
      metadata: {
        school_id: schoolId,
        branch_id: branchId || null,
        loaded_from_db: (results && results.length > 0),
        record_id: results && results.length > 0 ? results[0].id : null
      }
    });

  } catch (error) {
    console.error("Error fetching school settings:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const updateSchoolSettings = async (req, res) => {
  try {
    const { school_id, branch_id, settings } = req.body;
    const schoolId = school_id || req.user?.school_id;
    const branchId = branch_id || req.user?.branch_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: "school_id is required"
      });
    }

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        error: "Settings must be a non-array object"
      });
    }

    // First, ensure the table exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS report_configurations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL,
        branch_id VARCHAR(50) DEFAULT NULL,
        configuration JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_school_id (school_id),
        INDEX idx_school_branch (school_id, branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.sequelize.query(createTableQuery);

    // Check if configuration already exists
    let existingQuery, existingReplacements;
    
    if (branchId) {
      existingQuery = `
        SELECT id FROM report_configurations 
        WHERE school_id = :school_id AND branch_id = :branch_id
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      existingReplacements = { school_id: schoolId, branch_id: branchId };
    } else {
      existingQuery = `
        SELECT id FROM report_configurations 
        WHERE school_id = :school_id AND branch_id IS NULL
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      existingReplacements = { school_id: schoolId };
    }

    const [existing] = await db.sequelize.query(existingQuery, {
      replacements: existingReplacements,
      type: QueryTypes.SELECT
    });

    const configJson = JSON.stringify(settings);

    let result;
    let created = false;

    if (existing && existing.length > 0) {
      // Update existing configuration
      const updateQuery = `
        UPDATE report_configurations 
        SET configuration = :configuration, updated_at = CURRENT_TIMESTAMP 
        WHERE id = :id
      `;

      await db.sequelize.query(updateQuery, {
        replacements: { 
          configuration: configJson, 
          id: existing[0].id 
        }
      });

      result = {
        id: existing[0].id,
        school_id: schoolId,
        branch_id: branchId,
        configuration: settings,
        updated_at: new Date()
      };
    } else {
      // Insert new configuration
      const insertQuery = `
        INSERT INTO report_configurations (school_id, branch_id, configuration) 
        VALUES (:school_id, :branch_id, :configuration)
      `;

      await db.sequelize.query(insertQuery, {
        replacements: { 
          school_id: schoolId, 
          branch_id: branchId,
          configuration: configJson 
        }
      });

      // Get the inserted record to return
      const selectQuery = `
        SELECT * FROM report_configurations 
        WHERE school_id = :school_id AND branch_id = :branch_id
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const [newRecord] = await db.sequelize.query(selectQuery, {
        replacements: { school_id: schoolId, branch_id: branchId },
        type: QueryTypes.SELECT
      });

      result = newRecord[0];
      created = true;
    }

    res.status(200).json({
      success: true,
      message: "School settings updated successfully",
      data: result.configuration,
      metadata: {
        school_id: schoolId,
        branch_id: branchId,
        record_id: result.id,
        created: created
      }
    });

  } catch (error) {
    console.error("Error updating school settings:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const deleteSchoolSetting = async (req, res) => {
  try {
    const { school_id, branch_id } = req.body;
    const schoolId = school_id || req.user?.school_id;
    const branchId = branch_id || req.user?.branch_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: "school_id is required"
      });
    }

    // Build the delete query based on whether branch_id is provided
    let deleteQuery, deleteReplacements;
    
    if (branchId) {
      deleteQuery = `
        DELETE FROM report_configurations 
        WHERE school_id = :school_id AND branch_id = :branch_id
      `;
      deleteReplacements = { school_id: schoolId, branch_id: branchId };
    } else {
      deleteQuery = `
        DELETE FROM report_configurations 
        WHERE school_id = :school_id AND branch_id IS NULL
      `;
      deleteReplacements = { school_id: schoolId };
    }

    const [result] = await db.sequelize.query(deleteQuery, {
      replacements: deleteReplacements
    });

    const deletedCount = result.affectedRows || 0;

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Configuration not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "School configuration deleted successfully",
      metadata: {
        school_id: schoolId,
        branch_id: branchId || null,
        deleted_count: deletedCount
      }
    });

  } catch (error) {
    console.error("Error deleting school configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getSchoolSettings,
  updateSchoolSettings,
  deleteSchoolSetting
};