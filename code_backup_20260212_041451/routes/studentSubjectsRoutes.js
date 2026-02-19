/**
 * Student Subjects Routes
 * Handles student selective subject assignments (e.g., Islamic Studies OR Hausa)
 */

const express = require('express');
const router = express.Router();
const db = require('../models');

/**
 * GET /api/student-subjects?admission_no=XXX
 * Get all selective subjects assigned to a student for their current class
 */
router.get('/', async (req, res) => {
  try {
    const { admission_no } = req.query;
    const school_id = req.headers['x-school-id'] || req.query.school_id;
    const class_code = req.query.class_code; // Optional: filter by specific class

    if (!admission_no) {
      return res.status(400).json({
        success: false,
        message: 'admission_no is required'
      });
    }

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // If no class_code provided, get student's current class
    let finalClassCode = class_code;
    if (!finalClassCode) {
      const studentInfo = await db.sequelize.query(`
        SELECT current_class
        FROM students
        WHERE admission_no = :admission_no AND school_id = :school_id
        LIMIT 1
      `, {
        replacements: { admission_no, school_id },
        type: db.Sequelize.QueryTypes.SELECT
      });

      if (studentInfo && studentInfo.length > 0) {
        finalClassCode = studentInfo[0].current_class;
      }
    }

    const subjects = await db.sequelize.query(`
      SELECT
        ss.id,
        ss.admission_no,
        ss.subject_code,
        ss.class_code,
        s.subject as subject_name,
        s.type,
        ss.created_at
      FROM student_subjects ss
      INNER JOIN subjects s ON ss.subject_code = s.subject_code AND ss.school_id = s.school_id
      WHERE ss.admission_no = :admission_no
        AND ss.school_id = :school_id
        ${finalClassCode ? 'AND ss.class_code = :class_code' : ''}
      ORDER BY s.subject
    `, {
      replacements: { admission_no, school_id, class_code: finalClassCode },
      type: db.Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: subjects,
      class_code: finalClassCode
    });

  } catch (error) {
    console.error('Error fetching student subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student subjects',
      error: error.message
    });
  }
});

/**
 * POST /api/student-subjects
 * Assign selective subjects to a student for a specific class
 * Body: { admission_no, subject_codes: ['ISL101', 'FRE102'], class_code, school_id, branch_id }
 */
router.post('/', async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { admission_no, subject_codes, branch_id } = req.body;
    const school_id = req.headers['x-school-id'] || req.body.school_id;
    let { class_code } = req.body;

    if (!admission_no || !school_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'admission_no and school_id are required'
      });
    }

    // If class_code not provided, get student's current class
    if (!class_code) {
      const studentInfo = await db.sequelize.query(`
        SELECT current_class
        FROM students
        WHERE admission_no = :admission_no AND school_id = :school_id
        LIMIT 1
      `, {
        replacements: { admission_no, school_id },
        type: db.Sequelize.QueryTypes.SELECT,
        transaction
      });

      if (studentInfo && studentInfo.length > 0 && studentInfo[0].current_class) {
        class_code = studentInfo[0].current_class;
      } else {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Student not found or has no current class assigned'
        });
      }
    }

    if (!Array.isArray(subject_codes)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'subject_codes must be an array'
      });
    }

    // Delete existing selective subject assignments for this student and class
    await db.sequelize.query(`
      DELETE FROM student_subjects
      WHERE admission_no = :admission_no
        AND school_id = :school_id
        AND class_code = :class_code
    `, {
      replacements: { admission_no, school_id, class_code },
      transaction
    });

    // Insert new subject assignments (only if there are subjects to insert)
    if (subject_codes.length > 0) {
      const values = subject_codes.map(subject_code =>
        `('${admission_no}', '${subject_code}', '${class_code}', '${school_id}', ${branch_id ? `'${branch_id}'` : 'NULL'})`
      ).join(',');

      await db.sequelize.query(`
        INSERT INTO student_subjects (admission_no, subject_code, class_code, school_id, branch_id)
        VALUES ${values}
      `, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Successfully assigned ${subject_codes.length} selective subject(s) to student ${admission_no} for class ${class_code}`,
      class_code: class_code
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error assigning student subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign subjects to student',
      error: error.message
    });
  }
});

/**
 * DELETE /api/student-subjects?admission_no=XXX&subject_code=YYY
 * Remove a specific selective subject from a student for their current class
 */
router.delete('/', async (req, res) => {
  try {
    const { admission_no, subject_code } = req.query;
    const school_id = req.headers['x-school-id'] || req.query.school_id;
    let class_code = req.query.class_code;

    if (!admission_no || !subject_code) {
      return res.status(400).json({
        success: false,
        message: 'admission_no and subject_code are required'
      });
    }

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // If class_code not provided, get student's current class
    if (!class_code) {
      const studentInfo = await db.sequelize.query(`
        SELECT current_class
        FROM students
        WHERE admission_no = :admission_no AND school_id = :school_id
        LIMIT 1
      `, {
        replacements: { admission_no, school_id },
        type: db.Sequelize.QueryTypes.SELECT
      });

      if (studentInfo && studentInfo.length > 0) {
        class_code = studentInfo[0].current_class;
      }
    }

    await db.sequelize.query(`
      DELETE FROM student_subjects
      WHERE admission_no = :admission_no
        AND subject_code = :subject_code
        AND school_id = :school_id
        ${class_code ? 'AND class_code = :class_code' : ''}
    `, {
      replacements: { admission_no, subject_code, school_id, class_code }
    });

    res.json({
      success: true,
      message: 'Subject removed successfully',
      class_code: class_code
    });

  } catch (error) {
    console.error('Error removing student subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove subject',
      error: error.message
    });
  }
});

/**
 * GET /api/student-subjects/class/:class_code
 * Get all students with their selective subjects for a class
 */
router.get('/class/:class_code', async (req, res) => {
  try {
    const { class_code } = req.params;
    const school_id = req.headers['x-school-id'] || req.query.school_id;
    const branch_id = req.headers['x-branch-id'] || req.query.branch_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const results = await db.sequelize.query(`
      SELECT
        st.admission_no,
        st.student_name,
        st.stream,
        st.current_class as class_code,
        c.class_name,
        GROUP_CONCAT(ss.subject_code) as selective_subject_codes,
        GROUP_CONCAT(s.subject SEPARATOR ', ') as selective_subjects
      FROM students st
      LEFT JOIN classes c ON st.current_class = c.class_code AND c.school_id = st.school_id
      LEFT JOIN student_subjects ss ON st.admission_no = ss.admission_no
        AND ss.school_id = st.school_id
        AND ss.class_code = st.current_class
      LEFT JOIN subjects s ON ss.subject_code = s.subject_code AND s.school_id = ss.school_id
      WHERE st.current_class = :class_code
        AND st.school_id = :school_id
        ${branch_id ? 'AND st.branch_id = :branch_id' : ''}
        AND st.status = 'Active'
      GROUP BY st.admission_no, st.student_name, st.stream, st.current_class, c.class_name
      ORDER BY st.student_name
    `, {
      replacements: { class_code, school_id, branch_id },
      type: db.Sequelize.QueryTypes.SELECT
    });

    console.log('[student-subjects/class] Query results:', {
      isArray: Array.isArray(results),
      count: results?.length,
      firstStudent: results?.[0],
      allResults: results
    });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error fetching class student subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class student subjects',
      error: error.message
    });
  }
});

module.exports = router;
