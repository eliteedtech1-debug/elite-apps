const db = require('../models');

/**
 * Promote or Graduate Students
 * POST /students/promote
 */
const promoteStudents = async (req, res) => {
  const {
    school_id,
    branch_id,
    current_academic_year,
    next_academic_year,
    current_class,
    current_section,
    next_class,
    next_section,
    promotion_type, // 'promote' or 'graduate'
    students, // Array of admission numbers
    effective_date,
    created_by
  } = req.body;

  // Validation
  if (!school_id || !branch_id || !students || students.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: school_id, branch_id, and students are required'
    });
  }

  if (!current_class || !current_section) {
    return res.status(400).json({
      success: false,
      message: 'Current class and section are required'
    });
  }

  if (promotion_type === 'promote' && (!next_class || !next_section || next_class === '' || next_section === '')) {
    return res.status(400).json({
      success: false,
      message: 'For promotion, next_class and next_section are required'
    });
  }

  const transaction = await db.sequelize.transaction();

  try {
    const promotedStudents = [];
    const errors = [];

    console.log(`Processing ${students.length} students for ${promotion_type}`);
    console.log('Students array:', students);

    for (const admission_no of students) {
      try {
        console.log(`Processing student: ${admission_no}`);

        if (promotion_type === 'promote') {
          // First check if student exists
          const [existingStudent] = await db.sequelize.query(
            `SELECT admission_no, student_name, current_class, section, class_code, class_name FROM students
             WHERE admission_no = ? AND school_id = ? AND branch_id = ?`,
            {
              replacements: [admission_no, school_id, branch_id],
              type: db.sequelize.QueryTypes.SELECT,
              transaction
            }
          );

          if (!existingStudent) {
            console.warn(`⚠️ Student ${admission_no} not found`);
            errors.push({
              admission_no,
              error: 'Student not found in the specified school/branch'
            });
            continue;
          }

          console.log(`Found student: ${existingStudent.student_name}, current class: ${existingStudent.current_class}`);

          // Get the new class details from classes table
          const [newClassDetails] = await db.sequelize.query(
            `SELECT class_name, class_code FROM classes
             WHERE class_code = ? AND school_id = ?`,
            {
              replacements: [next_class, school_id],
              type: db.sequelize.QueryTypes.SELECT,
              transaction
            }
          );

          if (!newClassDetails) {
            console.warn(`⚠️ Target class ${next_class} not found`);
            errors.push({
              admission_no,
              error: `Target class ${next_class} not found in the system`
            });
            continue;
          }

          console.log(`Target class details: ${newClassDetails.class_name} (${newClassDetails.class_code})`);

          // PROMOTION: Move student to next class - Update ALL class-related fields
          await db.sequelize.query(
            `UPDATE students
             SET
               current_class = ?,
               class_code = ?,
               class_name = ?,
               section = ?,
               academic_year = ?,
               promoted_date = ?,
               promoted_by = ?,
               updated_at = NOW()
             WHERE admission_no = ?
               AND school_id = ?
               AND branch_id = ?`,
            {
              replacements: [
                newClassDetails.class_code,     // current_class
                newClassDetails.class_code,     // class_code
                newClassDetails.class_name,     // class_name
                next_section,                   // section
                next_academic_year,             // academic_year
                effective_date || new Date(),   // promoted_date
                created_by || 'system',         // promoted_by
                admission_no,
                school_id,
                branch_id
              ],
              transaction
            }
          );

          console.log(`✅ Successfully promoted student: ${admission_no} to ${newClassDetails.class_name} (${newClassDetails.class_code})`);

          // Log promotion history
          await db.sequelize.query(
            `INSERT INTO student_promotion_history
             (school_id, branch_id, admission_no, from_class, from_section,
              to_class, to_section, from_academic_year, to_academic_year,
              promotion_type, effective_date, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'promote', ?, ?, NOW())`,
            {
              replacements: [
                school_id,
                branch_id,
                admission_no,
                current_class,
                current_section,
                next_class,
                next_section,
                current_academic_year,
                next_academic_year,
                effective_date || new Date(),
                created_by || 'system'
              ],
              type: db.sequelize.QueryTypes.INSERT,
              transaction
            }
          );

          promotedStudents.push({
            admission_no,
            student_name: existingStudent.student_name,
            status: 'Promoted',
            previous_class: existingStudent.current_class,
            previous_section: existingStudent.section,
            from: `${existingStudent.current_class} - ${existingStudent.section}`,
            to: `${next_class} - ${next_section}`,
            new_class: next_class,
            new_section: next_section,
            academic_year: next_academic_year
          });

        } else if (promotion_type === 'graduate') {
          // GRADUATION: Mark student as graduated
          console.log(`Graduating student ${admission_no}`);
          console.log('Graduation params:', {
            effective_date: effective_date || new Date(),
            next_academic_year,
            created_by: created_by || 'system',
            admission_no,
            school_id,
            branch_id
          });

          // First check if student exists
          const [existingStudent] = await db.sequelize.query(
            `SELECT admission_no, student_name, status FROM students
             WHERE admission_no = ? AND school_id = ? AND branch_id = ?`,
            {
              replacements: [admission_no, school_id, branch_id],
              type: db.sequelize.QueryTypes.SELECT,
              transaction
            }
          );

          if (!existingStudent) {
            console.warn(`⚠️ Student ${admission_no} not found`);
            errors.push({
              admission_no,
              error: 'Student not found in the specified school/branch'
            });
            continue;
          }

          console.log(`Found student: ${existingStudent.student_name}, current status: ${existingStudent.status}`);

          // Update student to graduated
          await db.sequelize.query(
            `UPDATE students
             SET
               status = 'Graduated',
               graduation_date = ?,
               academic_year = ?,
               graduated_by = ?,
               updated_at = NOW()
             WHERE admission_no = ?
               AND school_id = ?
               AND branch_id = ?`,
            {
              replacements: [
                effective_date || new Date(),
                next_academic_year,
                created_by || 'system',
                admission_no,
                school_id,
                branch_id
              ],
              transaction
            }
          );

          console.log(`✅ Successfully graduated student: ${admission_no}`);

          // Log graduation history
          await db.sequelize.query(
            `INSERT INTO student_promotion_history
             (school_id, branch_id, admission_no, from_class, from_section,
              to_class, to_section, from_academic_year, to_academic_year,
              promotion_type, effective_date, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'graduate', ?, ?, NOW())`,
            {
              replacements: [
                school_id,
                branch_id,
                admission_no,
                current_class,
                current_section,
                current_academic_year,
                next_academic_year,
                effective_date || new Date(),
                created_by || 'system'
              ],
              type: db.sequelize.QueryTypes.INSERT,
              transaction
            }
          );

          promotedStudents.push({
            admission_no,
            student_name: existingStudent.student_name,
            status: 'Graduated',
            previous_status: existingStudent.status,
            from: `${current_class} - ${current_section}`,
            graduation_date: effective_date || new Date(),
            academic_year: next_academic_year
          });
        }

      } catch (studentError) {
        console.error(`Error processing student ${admission_no}:`, studentError);
        errors.push({
          admission_no,
          error: studentError.message
        });
      }
    }

    // Commit transaction
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `Successfully ${promotion_type === 'promote' ? 'promoted' : 'graduated'} ${promotedStudents.length} student(s)`,
      data: {
        promoted: promotedStudents,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          total_requested: students.length,
          successful: promotedStudents.length,
          failed: errors.length,
          promotion_type
        }
      }
    });

  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();

    console.error('Error promoting students:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing student promotion',
      error: error.message
    });
  }
};

/**
 * Get Promotion History
 * GET /students/promotion-history
 */
const getPromotionHistory = async (req, res) => {
  const { school_id, branch_id, academic_year, promotion_type, limit = 100 } = req.query;

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: 'school_id is required'
    });
  }

  try {
    let query = `
      SELECT
        sph.*,
        s.student_name,
        s.profile_picture
      FROM student_promotion_history sph
      LEFT JOIN students s ON sph.admission_no = s.admission_no
      WHERE sph.school_id = ?
    `;

    const replacements = [school_id];

    if (branch_id) {
      query += ' AND sph.branch_id = ?';
      replacements.push(branch_id);
    }

    if (academic_year) {
      query += ' AND (sph.from_academic_year = ? OR sph.to_academic_year = ?)';
      replacements.push(academic_year, academic_year);
    }

    if (promotion_type) {
      query += ' AND sph.promotion_type = ?';
      replacements.push(promotion_type);
    }

    query += ' ORDER BY sph.created_at DESC LIMIT ?';
    replacements.push(parseInt(limit));

    const history = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: history,
      count: history.length
    });

  } catch (error) {
    console.error('Error fetching promotion history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch promotion history',
      error: error.message
    });
  }
};

module.exports = {
  promoteStudents,
  getPromotionHistory
};
