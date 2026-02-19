const { QueryTypes } = require('sequelize');
const models = require('../models');

// ✅ Use the FULL default that matches your expected structure
const DEFAULT_REPORT_CONFIG = {
  visibility: {
    showPosition: true,
    showOutOf: true,
    showClassAverage: true,
    showGradeDetails: true,
    showCharacterAssessment: true,
    showSchoolLogo: true,
    showSchoolContactDetails: true, // ← include all fields
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
    customBadgeUrl: "", // ← Base64 goes here
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

module.exports = (app) => {

  // GET
  app.get('/api/report-configuration', async (req, res) => {
    try {
      let { school_id, branch_id } = req.query;
      
      // Fallback to headers if not provided in query
      if (!school_id) school_id = req.headers['x-school-id'];
      if (!branch_id) branch_id = req.headers['x-branch-id'];
      
      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Both school_id and branch_id are required (via query params or headers)'
        });
      }

      console.log(`🔍 Fetching config for school=${school_id}, branch=${branch_id}`);

      const rows = await models.sequelize.query(
        `SELECT configuration FROM report_configurations 
         WHERE school_id = :school_id AND branch_id = :branch_id`,
        {
          replacements: { school_id, branch_id },
          type: QueryTypes.SELECT
        }
      );
        console.log({rows});
        
      if (rows.length > 0) {
        let config = DEFAULT_REPORT_CONFIG;
        try {
          config = { ...DEFAULT_REPORT_CONFIG, ...JSON.parse(rows[0].configuration) };
        } catch (e) {
          console.error('Failed to parse config JSON:', e);
        }
        return res.json({ success: true, data: config, message: 'Loaded from DB' });
      } else {
        return res.json({
          success: true,
          data: DEFAULT_REPORT_CONFIG,
          message: 'Default returned (no record found)'
        });
      }
    } catch (error) {
      console.error('GET error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // POST
  app.post('/api/report-configuration', async (req, res) => {
    try {
      const { school_id, branch_id, ...configData } = req.body;
      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Both school_id and branch_id are required'
        });
      }

      // Validate structure (optional but helpful)
      const required = ['visibility', 'tableHeaders', 'colors', 'layout', 'content'];
      for (const key of required) {
        if (!configData[key]) {
          return res.status(400).json({
            success: false,
            message: `Missing section: ${key}`
          });
        }
      }

      const configJson = JSON.stringify(configData);
      console.log(`💾 Saving config for school=${school_id}, branch=${branch_id}`);

      // Upsert using INSERT ... ON DUPLICATE KEY UPDATE
      await models.sequelize.query(
        `
        INSERT INTO report_configurations (school_id, branch_id, configuration)
        VALUES (:school_id, :branch_id, :configuration)
        ON DUPLICATE KEY UPDATE
          configuration = VALUES(configuration),
          updated_at = CURRENT_TIMESTAMP
        `,
        {
          replacements: { school_id, branch_id, configuration: configJson }
        }
      );

      res.json({
        success: true,
        message: 'Configuration saved',
        data: configData
      });
    } catch (error) {
      console.error('POST error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // DELETE
  app.delete('/api/report-configuration', async (req, res) => {
    try {
      const { school_id, branch_id } = req.query;
      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          message: 'Both school_id and branch_id are required'
        });
      }

      await models.sequelize.query(
        `DELETE FROM report_configurations WHERE school_id = :school_id AND branch_id = :branch_id`,
        { replacements: { school_id, branch_id } }
      );

      res.json({
        success: true,
        message: 'Configuration deleted',
        data: DEFAULT_REPORT_CONFIG
      });
    } catch (error) {
      console.error('DELETE error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
};