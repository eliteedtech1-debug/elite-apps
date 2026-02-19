const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const syllabusController = {
  // Get syllabus tree structure
  async getSyllabusTree(req, res) {
    try {
      const school_id = (req.query.school_id && req.query.school_id !== 'undefined') 
        ? req.query.school_id 
        : req.headers['x-school-id'];
      const branch_id = (req.query.branch_id && req.query.branch_id !== 'undefined') 
        ? req.query.branch_id 
        : req.headers['x-branch-id'];
      
      const syllabusData = await sequelize.query(`
        SELECT 
          s.id,
          s.subject,
          s.class_code,
          s.title,
          s.content,
          s.week,
          s.term,
          s.status,
          aw.begin_date as week_start,
          aw.end_date as week_end,
          aw.weeks as week_label,
          ac.academic_year,
          c.class_name
        FROM syllabus s
        LEFT JOIN academic_weeks aw ON s.week = aw.week_number 
          AND s.term = aw.term 
          AND aw.school_id = :school_id
        LEFT JOIN academic_calendar ac ON s.term = ac.term 
          AND ac.school_id = :school_id 
          AND ac.status = 'Active'
        LEFT JOIN classes c ON s.class_code = c.class_code
          AND c.school_id = :school_id
        WHERE s.created_by LIKE :school_pattern
        ORDER BY s.class_code, s.subject, s.week
      `, {
        replacements: { 
          school_pattern: `%${school_id}%`,
          school_id: school_id
        },
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: syllabusData
      });
    } catch (error) {
      console.error('Error fetching syllabus tree:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch syllabus data'
      });
    }
  },

  // Get syllabus topics for a specific class/subject
  async getSyllabusTopics(req, res) {
    try {
      const { classCode, subject } = req.params;
      const { school_id } = req.query;

      const topics = await sequelize.query(`
        SELECT 
          id,
          title,
          content,
          week,
          term,
          status
        FROM syllabus
        WHERE class_code = :classCode 
        AND subject = :subject 
        AND created_by LIKE :school_pattern
        ORDER BY week
      `, {
        replacements: { classCode, subject, school_pattern: `%${school_id}%` },
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: topics
      });
    } catch (error) {
      console.error('Error fetching syllabus topics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch syllabus topics'
      });
    }
  },

  // Get syllabus coverage data
  async getSyllabusCoverage(req, res) {
    try {
      const school_id = (req.query.school_id && req.query.school_id !== 'undefined') 
        ? req.query.school_id 
        : req.headers['x-school-id'];
      const branch_id = (req.query.branch_id && req.query.branch_id !== 'undefined') 
        ? req.query.branch_id 
        : req.headers['x-branch-id'];
      const { subject_id, start_date, end_date } = req.query;

      let query = `
        SELECT 
          s.id,
          s.subject,
          s.class_code,
          s.title,
          s.week,
          s.term,
          s.status,
          c.class_name,
          COUNT(lp.id) as lesson_plans_count
        FROM syllabus s
        LEFT JOIN lesson_plans lp ON s.id = lp.syllabus_id
        LEFT JOIN classes c ON s.class_code = c.class_code
          AND c.school_id = :school_id
        WHERE s.created_by LIKE :school_pattern
      `;

      const replacements = { 
        school_pattern: `%${school_id}%`,
        school_id: school_id
      };

      if (subject_id) {
        query += ` AND s.subject = :subject_id`;
        replacements.subject_id = subject_id;
      }

      query += ` GROUP BY s.id, s.subject, s.class_code, s.title, s.week, s.term, s.status, c.class_name ORDER BY s.class_code, s.subject, s.week`;

      const coverageData = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: coverageData
      });
    } catch (error) {
      console.error('Error fetching syllabus coverage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch syllabus coverage'
      });
    }
  },

  // Get subjects
  async getSubjects(req, res) {
    try {
      const school_id = (req.query.school_id && req.query.school_id !== 'undefined') 
        ? req.query.school_id 
        : req.headers['x-school-id'];
      const branch_id = (req.query.branch_id && req.query.branch_id !== 'undefined') 
        ? req.query.branch_id 
        : req.headers['x-branch-id'];

      const subjects = await sequelize.query(`
        SELECT DISTINCT 
          s.subject as subject_name,
          s.subject as id
        FROM syllabus s
        WHERE s.created_by LIKE :school_pattern
        ORDER BY s.subject
      `, {
        replacements: { school_pattern: `%${school_id}%` },
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: subjects
      });
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subjects'
      });
    }
  }
};

module.exports = syllabusController;
