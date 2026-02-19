const db = require("../models"); const express = require('express');
// Average Scores by Subject
const getAverageScoresBySubject = async (req, res) => {
    const { term, academic_year, school_id, branch_id } = req.query;
    if (!term || !academic_year || !school_id || !branch_id) {
        return res.status(400).json({ error: 'Required parameters missing' });
    }
    try {
        const query = `
      SELECT
        s.subject_name as subject,
        AVG((w.score/w.max_score)*100) as average
      FROM weekly_scores w
      JOIN subjects s ON w.subject_code = s.subject_code
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY s.subject_name
      ORDER BY average DESC;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching average scores by subject:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Average Scores by Class
const getAverageScoresByClass = async (req, res) => {
    const { term, academic_year, school_id, branch_id } = req.query;
    if (!term || !academic_year || !school_id || !branch_id) {
        return res.status(400).json({ error: 'Required parameters missing' });
    }
    try {
        const query = `
      SELECT
        c.class_name,
        AVG((w.score/w.max_score)*100) as average
      FROM weekly_scores w
      JOIN classes c ON w.class_code = c.class_code
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY c.class_name
      ORDER BY average DESC;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching average scores by class:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// School Performance
const getSchoolPerformance = async (req, res) => {
    const { term, academic_year, school_id, branch_id } = req.query;
    if (!term || !academic_year || !school_id || !branch_id) {
        return res.status(400).json({ error: 'Required parameters missing' });
    }
    try {
        const query = `
      SELECT
        w.academic_year,
        w.term,
        AVG((w.score/w.max_score)*100) as average_score
      FROM weekly_scores w
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY w.academic_year, w.term
      ORDER BY w.academic_year, w.term;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching school performance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Grade Distribution by Subject
const getGradeDistributionBySubject = async (req, res) => {
    const { term, academic_year, school_id, branch_id } = req.query;
    if (!term || !academic_year || !school_id || !branch_id) {
        return res.status(400).json({ error: 'Required parameters missing' });
    }
    try {
        const query = `
      SELECT
        s.subject_name as subject,
        CASE
          WHEN (w.score/w.max_score)*100 >= 80 THEN 'A'
          WHEN (w.score/w.max_score)*100 >= 70 THEN 'B'
          WHEN (w.score/w.max_score)*100 >= 60 THEN 'C'
          WHEN (w.score/w.max_score)*100 >= 50 THEN 'D'
          ELSE 'F'
        END as grade,
        COUNT(*) as count
      FROM weekly_scores w
      JOIN subjects s ON w.subject_code = s.subject_code
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY s.subject_name,
        CASE
          WHEN (w.score/w.max_score)*100 >= 80 THEN 'A'
          WHEN (w.score/w.max_score)*100 >= 70 THEN 'B'
          WHEN (w.score/w.max_score)*100 >= 60 THEN 'C'
          WHEN (w.score/w.max_score)*100 >= 50 THEN 'D'
          ELSE 'F'
        END
      ORDER BY s.subject_name, grade;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching grade distribution by subject:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Class Subject Performance
const getClassSubjectPerformance = async (req, res) => {
    const { term, academic_year, school_id, branch_id } = req.query;
    if (!term || !academic_year || !school_id || !branch_id) {
        return res.status(400).json({ error: 'Required parameters missing' });
    }
    try {
        const query = `
      SELECT
        c.class_name,
        s.subject_name as subject,
        AVG((w.score/w.max_score)*100) as score
      FROM weekly_scores w
      JOIN classes c ON w.class_code = c.class_code
      JOIN subjects s ON w.subject_code = s.subject_code
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY c.class_name, s.subject_name
      ORDER BY c.class_name, s.subject_name;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching class subject performance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Previously provided endpoints
const getStudentPerformanceSummary = async (req, res) => {
    const { term, academic_year, school_id, branch_id } = req.query;
    if (!term || !academic_year || !school_id || !branch_id) {
        return res.status(400).json({ error: 'Required parameters missing' });
    }
    try {
        const query = `
      SELECT
        w.admission_no,
        st.student_name,
        c.class_name,
        AVG((w.score/w.max_score)*100) as average_score
      FROM weekly_scores w
      JOIN students st ON w.admission_no = st.admission_no
      JOIN classes c ON w.class_code = c.class_code
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY w.admission_no, st.student_name, c.class_name
      ORDER BY average_score DESC;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching student performance summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTopPerformingStudents = async (req, res) => {
    try {
        const { term, academic_year, school_id, branch_id } = req.query;
        if (!term || !academic_year || !school_id || !branch_id) {
            return res.status(400).json({ error: 'Required parameters missing' });
        }
        const query = `
      SELECT
        w.admission_no as student_id,
        st.student_name as name,
        c.class_name as class,
        AVG((w.score/w.max_score)*100) as average_score
      FROM weekly_scores w
      JOIN students st ON w.admission_no = st.admission_no
      JOIN classes c ON w.class_code = c.class_code
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY w.admission_no, st.student_name, c.class_name
      ORDER BY average_score DESC
      LIMIT 10;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching top performing students:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getSubjectFailureRate = async (req, res) => {
    try {
        const { term, academic_year, school_id, branch_id } = req.query;
        if (!term || !academic_year || !school_id || !branch_id) {
            return res.status(400).json({ error: 'Required parameters missing' });
        }
        const query = `
      SELECT
        s.subject_name as subject,
        (COUNT(CASE WHEN (w.score/w.max_score)*100 < 50 THEN 1 END) / COUNT(*)) * 100 as failure_rate
      FROM weekly_scores w
      JOIN subjects s ON w.subject_code = s.subject_code
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY s.subject_name
      ORDER BY failure_rate DESC;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching subject failure rate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getComparativeTermPerformance = async (req, res) => {
    try {
        const { term, academic_year, school_id, branch_id } = req.query;
        if (!term || !academic_year || !school_id || !branch_id) {
            return res.status(400).json({ error: 'Required parameters missing' });
        }
        const query = `
      SELECT
        w.term,
        AVG((w.score/w.max_score)*100) as average_score
      FROM weekly_scores w
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY w.term
      ORDER BY w.term;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching comparative term performance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getGradeDistributionByClass = async (req, res) => {
    try {
        const { term, academic_year, school_id, branch_id } = req.query;
        if (!term || !academic_year || !school_id || !branch_id) {
            return res.status(400).json({ error: 'Required parameters missing' });
        }
        const query = `
      SELECT
        c.class_name,
        CASE
          WHEN (w.score/w.max_score)*100 >= 80 THEN 'A'
          WHEN (w.score/w.max_score)*100 >= 70 THEN 'B'
          WHEN (w.score/w.max_score)*100 >= 60 THEN 'C'
          WHEN (w.score/w.max_score)*100 >= 50 THEN 'D'
          ELSE 'F'
        END as grade,
        COUNT(*) as count
      FROM weekly_scores w
      JOIN classes c ON w.class_code = c.class_code
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY c.class_name,
        CASE
          WHEN (w.score/w.max_score)*100 >= 80 THEN 'A'
          WHEN (w.score/w.max_score)*100 >= 70 THEN 'B'
          WHEN (w.score/w.max_score)*100 >= 60 THEN 'C'
          WHEN (w.score/w.max_score)*100 >= 50 THEN 'D'
          ELSE 'F'
        END
      ORDER BY c.class_name, grade;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching grade distribution by class:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPerformanceHeatmap = async (req, res) => {
    try {
        const { term, academic_year, school_id, branch_id } = req.query;
        if (!term || !academic_year || !school_id || !branch_id) {
            return res.status(400).json({ error: 'Required parameters missing' });
        }

        const query = `
     SELECT
        w.subject_code,
        s.subject_name AS subject,
        c.class_name,
        AVG((w.score/w.max_score)*100) AS score
        FROM weekly_scores w
        JOIN classes c ON w.class_code = c.class_code
        JOIN subjects s ON w.subject_code = s.subject_code
        JOIN students st ON w.admission_no = st.admission_no
        WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
        GROUP BY w.subject_code, s.subject_name, c.class_name
        ORDER BY c.class_name, s.subject_name;
    `;

        const [rows] = await db.sequelize.query(query, {
            replacements: [term, academic_year, school_id, branch_id],
        });

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching performance heatmap:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const getStudentProgress = async (req, res) => {
    try {
        const { term, academic_year, school_id, branch_id } = req.query;
        if (!term || !academic_year || !school_id || !branch_id) {
            return res.status(400).json({ error: 'Required parameters missing' });
        }
        const query = `
      SELECT
        w.term,
        AVG((w.score/w.max_score)*100) as average_score
      FROM weekly_scores w
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.academic_year = ? AND st.school_id = ? AND w.branch_id = ?
      GROUP BY w.term
      ORDER BY w.term;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [academic_year, school_id, branch_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching student progress:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getBranchRankings = async (req, res) => {
    try {
        const { term, academic_year, school_id, branch_id } = req.query;
        if (!term || !academic_year || !school_id || !branch_id) {
            return res.status(400).json({ error: 'Required parameters missing' });
        }
        const query = `
      SELECT
        b.branch_name,
        AVG((w.score/w.max_score)*100) as average_score,
        RANK() OVER (ORDER BY AVG((w.score/w.max_score)*100) DESC) as rank
      FROM weekly_scores w
      JOIN school_locations b ON w.branch_id = b.branch_id
      JOIN students st ON w.admission_no = st.admission_no
      WHERE w.term = ? AND w.academic_year = ? AND st.school_id = ?
      GROUP BY b.branch_name
      ORDER BY rank;
    `;
        const [rows] = await db.sequelize.query(query, { replacements: [term, academic_year, school_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching branch rankings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Performance by Section Analytics (for the frontend API)
const getSectionAnalytics = async (req, res) => {
    try {
        const { academicYear, term, section, classCode, branchId, gender } = req.body;
        const { school_id } = req.user;
        if (!academicYear || !term) {
            return res.status(400).json({ error: 'Academic year and term are required' });
        }

        let whereConditions = ['w.academic_year = ?', 'w.term = ?', 'st.school_id = ?'];
        let replacements = [academicYear, term, school_id];

        // Add branch filtering
        if (branchId) {
            whereConditions.push('st.branch_id = ?');
            replacements.push(branchId);
        }

        // Add class filtering
        if (classCode && classCode !== 'ALL') {
            whereConditions.push('c.class_code = ?');
            replacements.push(classCode);
        }

        // Add gender filtering
        if (gender && gender !== 'All Genders') {
            whereConditions.push('st.sex = ?');
            replacements.push(gender);
        }

        const query = `
      SELECT
        COALESCE(c.section, st.section) as section,
        AVG((w.score/w.max_score)*100) as avg,
        COUNT(DISTINCT w.admission_no) as totalStudents,
        (COUNT(CASE WHEN (w.score/w.max_score)*100 >= 50 THEN 1 END) / COUNT(w.admission_no)) * 100 as passRate
      FROM weekly_scores w
      JOIN students st ON w.admission_no = st.admission_no
      LEFT JOIN classes c ON w.class_code = c.class_code
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY COALESCE(c.section, st.section)
      ORDER BY avg DESC;
    `;
        console.log('Executing performance by section analytics query:', query);
        console.log('Replacements:', replacements);
        const [rows] = await db.sequelize.query(query, { replacements });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching performance by section analytics:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Gender Analytics (for the frontend API)
const getGenderAnalytics = async (req, res) => {
    try {
        const { academicYear, term, section, classCode, branchId, gender } = req.body;
        const { school_id } = req.user;
        if (!academicYear || !term) {
            return res.status(400).json({ error: 'Academic year and term are required' });
        }

        let whereConditions = ['w.academic_year = ?', 'w.term = ?', 'st.school_id = ?'];
        let replacements = [academicYear, term, school_id];

        // Add branch filtering
        if (branchId) {
            whereConditions.push('st.branch_id = ?');
            replacements.push(branchId);
        }

        // Add class filtering
        if (classCode && classCode !== 'ALL') {
            whereConditions.push('w.class_code = ?');
            replacements.push(classCode);
        }

        // Add section filtering
        if (section && section !== 'All Sections') {
            whereConditions.push(`(
                LOWER(c.class_name) LIKE ? OR 
                LOWER(c.section) LIKE ? OR
                LOWER(st.section) LIKE ?
            )`);
            const sectionPattern = `%${section.toLowerCase()}%`;
            replacements.push(sectionPattern, sectionPattern, sectionPattern);
        }

        const query = `
      SELECT
        st.sex as gender,
        AVG((w.score/w.max_score)*100) as average_percentage,
        COUNT(DISTINCT w.admission_no) as studentCount,
        (COUNT(CASE WHEN (w.score/w.max_score)*100 >= 50 THEN 1 END) / COUNT(w.admission_no)) * 100 as passRate
      FROM weekly_scores w
      JOIN students st ON w.admission_no = st.admission_no
      LEFT JOIN classes c ON w.class_code = c.class_code
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY st.sex
      ORDER BY average_percentage DESC;
    `;
        console.log('Executing gender analytics query:', query);
        console.log('Replacements:', replacements);
        const [rows] = await db.sequelize.query(query, { replacements });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching gender analytics:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Teacher-Class Performance Analytics
const getTeacherClassAnalytics = async (req, res) => {
    try {
        const { academicYear, term, section, classCode, branchId, gender } = req.body;
        const { school_id } = req.user;
        if (!academicYear || !term) {
            return res.status(400).json({ error: 'Academic year and term are required' });
        }

        let whereConditions = ['w.academic_year = ?', 'w.term = ?', 'st.school_id = ?'];
        let replacements = [academicYear, term, school_id];

        // Add branch filtering
        if (branchId) {
            whereConditions.push('st.branch_id = ?');
            replacements.push(branchId);
        }

        // Add class filtering
        if (classCode && classCode !== 'ALL') {
            whereConditions.push('tc.class_code = ?');
            replacements.push(classCode);
        }

        // Add section filtering
        if (section && section !== 'All Sections') {
            whereConditions.push(`(
                LOWER(c.class_name) LIKE ? OR 
                LOWER(c.section) LIKE ? OR
                LOWER(st.section) LIKE ?
            )`);
            const sectionPattern = `%${section.toLowerCase()}%`;
            replacements.push(sectionPattern, sectionPattern, sectionPattern);
        }

        // Add gender filtering
        if (gender && gender !== 'All Genders') {
            whereConditions.push('st.sex = ?');
            replacements.push(gender);
        }

        const query = `
      SELECT
        tc.teacher_id,
        t.name,
        tc.class_code,
        c.class_name,
        tc.subject_code,
        s.subject as subject,
        AVG((w.score/w.max_score)*100) as avg,
        COUNT(DISTINCT w.admission_no) as totalStudents,
        (COUNT(CASE WHEN (w.score/w.max_score)*100 >= 50 THEN 1 END) / COUNT(w.admission_no)) * 100 as passRate
      FROM active_teacher_classes tc
      JOIN teachers t ON tc.teacher_id = t.id
      JOIN classes c ON tc.class_code = c.class_code
      JOIN subjects s ON tc.subject_code = s.subject_code
      JOIN weekly_scores w ON w.subject_code = s.subject_code AND w.class_code = tc.class_code
      JOIN students st ON w.admission_no = st.admission_no AND w.class_code = tc.class_code
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY tc.teacher_id, t.name, tc.class_code, c.class_name, tc.subject_code, s.subject
      ORDER BY avg DESC;
    `;
        console.log('Executing teacher-class analytics query:', query);
        console.log('Replacements:', replacements);
        const [rows] = await db.sequelize.query(query, { replacements });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching teacher-class analytics:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Class Performance Analytics
const getClassAnalytics = async (req, res) => {
    try {
        const { academicYear, term, section, classCode, branchId, gender } = req.body;
        const { school_id } = req.user;
        if (!academicYear || !term) {
            return res.status(400).json({ error: 'Academic year and term are required' });
        }

        let whereConditions = ['w.academic_year = ?', 'w.term = ?', 'st.school_id = ?'];
        let replacements = [academicYear, term, school_id];

        // Add section filtering
        if (section && section !== 'All Sections') {
            whereConditions.push(`(
                LOWER(c.class_name) LIKE ? OR 
                LOWER(c.section) LIKE ? OR
                LOWER(st.section) LIKE ?
            )`);
            const sectionPattern = `%${section.toLowerCase()}%`;
            replacements.push(sectionPattern, sectionPattern, sectionPattern);
        }

        // Add class filtering
        if (classCode && classCode !== 'ALL') {
            whereConditions.push('c.class_code = ?');
            replacements.push(classCode);
        }

        // Add branch filtering via students table
        if (branchId) {
            whereConditions.push('st.branch_id = ?');
            replacements.push(branchId);
        }

        // Add gender filtering
        if (gender && gender !== 'All Genders') {
            whereConditions.push('st.sex = ?');
            replacements.push(gender);
        }

        const query = `
      SELECT
        c.class_code,
        c.class_name,
        AVG((w.score/w.max_score)*100) as avg,
        COUNT(DISTINCT w.admission_no) as totalStudents,
        (COUNT(CASE WHEN (w.score/w.max_score)*100 >= 50 THEN 1 END) / COUNT(w.admission_no)) * 100 as passRate
      FROM weekly_scores w
      JOIN classes c ON w.class_code = c.class_code
      JOIN students st ON w.admission_no = st.admission_no
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY c.class_code, c.class_name
      ORDER BY avg DESC;
    `;
        console.log('Executing class analytics query:', query);
        console.log('Replacements:', replacements);
        const [rows] = await db.sequelize.query(query, { replacements });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching class analytics:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Get all branches for analytics (no query_type required)
const getAllBranches = async (req, res) => {
    try {
        const { school_id } = req.user; // Get from authentication middleware

        // Query to get all branches for the school
        const query = `
      SELECT
        branch_id,
        branch_name,
        location,
        short_name,
        status
      FROM school_locations
      WHERE school_id = ?
      ORDER BY branch_name;
    `;
        console.log('Executing branches query:', query);
        console.log('School ID:', school_id);
        const [rows] = await db.sequelize.query(query, { replacements: [school_id] });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

module.exports = {
    getClassSubjectPerformance,
    getAverageScoresBySubject,
    getAverageScoresByClass,
    getSchoolPerformance,
    getGradeDistributionBySubject,

    getStudentPerformanceSummary,
    getTopPerformingStudents,
    getSubjectFailureRate,
    getComparativeTermPerformance,
    getGradeDistributionByClass,
    getPerformanceHeatmap,
    getStudentProgress,
    getBranchRankings,
    getSectionAnalytics,
    getGenderAnalytics,
    getTeacherClassAnalytics,
    getClassAnalytics,
    getAllBranches
};
