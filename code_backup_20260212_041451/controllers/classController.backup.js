// controllers/classController.js
const db = require("../models");
const { getNextCodeByDescription } = require("./codeGenerator");
const { Class } = db;

const createClasses = async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];
  const errors = [];

  try {
    for (const item of payload) {
      const {
        class_name,
        section,
        school_id,
        branch_id,
        class_arms = [],
      } = item;

      const cleanClassName = (class_name || "").trim();
      const cleanSection = (section || "").trim();
      const cleanBranchId = (branch_id || req.user?.branch_id || "").trim();
      const cleanSchoolId = (school_id || req.user?.school_id || "").trim();

      if (!cleanClassName || !cleanSection || !cleanSchoolId || !cleanBranchId) {
        errors.push({ error: "Missing required fields", item });
        continue;
      }

      if (class_arms.length > 0) {
        // Find or create parent class first
        let parentClass = await Class.findOne({
          where: { class_name: cleanClassName, section: cleanSection, branch_id: cleanBranchId, school_id: cleanSchoolId },
        });

        if (!parentClass) {
          const parentCode = await getNextCodeByDescription("class");
          parentClass = await Class.create({
            class_name: cleanClassName,
            class_code: parentCode,
            section: cleanSection,
            branch_id: cleanBranchId,
            school_id: cleanSchoolId,
            status: 'Active',
          });
        }

        // Create arms with parent_id
        for (const arm of class_arms) {
          const armClassName = `${cleanClassName} ${arm.arm_name}`;
          const existingArm = await Class.findOne({
            where: { class_name: armClassName, section: cleanSection, branch_id: cleanBranchId, school_id: cleanSchoolId },
          });

          if (existingArm) {
            results.push({ class_code: existingArm.class_code, class_name: existingArm.class_name, section: existingArm.section, status: 'existing' });
            continue;
          }

          const armCode = await getNextCodeByDescription("class");
          const newArm = await Class.create({
            class_name: armClassName,
            class_code: armCode,
            section: cleanSection,
            branch_id: cleanBranchId,
            school_id: cleanSchoolId,
            parent_id: parentClass.class_code,
            status: 'Active',
          });

          results.push({ class_code: newArm.class_code, class_name: newArm.class_name, section: newArm.section, parent_id: parentClass.class_code, status: 'created' });
        }
      } else {
        // No arms - create single class
        const existing = await Class.findOne({
          where: { class_name: cleanClassName, section: cleanSection, branch_id: cleanBranchId, school_id: cleanSchoolId },
        });

        if (existing) {
          results.push({ class_code: existing.class_code, class_name: existing.class_name, section: existing.section, status: 'existing' });
          continue;
        }

        const class_code = await getNextCodeByDescription("class");
        const newClass = await Class.create({
          class_name: cleanClassName,
          class_code,
          section: cleanSection,
          branch_id: cleanBranchId,
          school_id: cleanSchoolId,
          status: 'Active',
        });

        results.push({ class_code: newClass.class_code, class_name: newClass.class_name, section: newClass.section, status: 'created' });
      }
    }

    return res.status(201).json({ success: true, data: results, errors });
  } catch (err) {
    console.error("💥 Error creating class:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "An error occurred while creating classes",
    });
  }
};

// Get all classes with filtering support and student/teacher counts
const getAllClasses = async (req, res) => {
  try {
    const { school_id, branch_id, status, section } = req.query;

    const where = {};
    if (school_id) where.school_id = school_id;
    if (branch_id) where.branch_id = branch_id;
    
    // Filter by status if specified (default to all if not specified)
    if (status && status !== 'all') {
      where.status = status === 'active' ? 'Active' : 'Inactive';
    }
    
    // Filter by section if specified
    if (section && section !== 'all') {
      where.section = section;
    }

    // Get classes with student, subject teacher, form master details, and subject count
    const classesQuery = `
      SELECT 
        c.*,
        COALESCE(student_counts.student_count, 0) as student_count,
        COALESCE(subject_teacher_counts.subject_teacher_count, 0) as subject_teacher_count,
        COALESCE(subject_counts.subject_count, 0) as subject_count,
        COALESCE(subject_counts.assigned_subject_count, 0) as assigned_subject_count,
        COALESCE(form_master_counts.form_master_count, 0) as form_master_count,
        form_master_info.form_master_name,
        form_master_info.form_master_id
      FROM classes c
      LEFT JOIN (
        SELECT current_class, COUNT(*) as student_count 
        FROM students 
        WHERE current_class IS NOT NULL 
        GROUP BY current_class
      ) student_counts ON c.class_code = student_counts.current_class
      LEFT JOIN (
        SELECT class_code, COUNT(DISTINCT teacher_id) as subject_teacher_count 
        FROM teacher_classes 
        WHERE class_code IS NOT NULL 
        GROUP BY class_code
      ) subject_teacher_counts ON c.class_code = subject_teacher_counts.class_code
      LEFT JOIN (
        SELECT 
          s.class_code,
          COUNT(DISTINCT s.subject_code) as subject_count,
          COUNT(DISTINCT CASE WHEN tc.teacher_id IS NOT NULL THEN s.subject_code END) as assigned_subject_count
        FROM subjects s
        LEFT JOIN teacher_classes tc ON s.class_code = tc.class_code AND s.subject_code = tc.subject_code
        WHERE s.class_code IS NOT NULL 
        GROUP BY s.class_code
      ) subject_counts ON c.class_code = subject_counts.class_code
      LEFT JOIN (
        SELECT class_code, COUNT(DISTINCT teacher_id) as form_master_count 
        FROM class_role 
        WHERE class_code IS NOT NULL AND role = 'Form Master'
        GROUP BY class_code
      ) form_master_counts ON c.class_code = form_master_counts.class_code
      LEFT JOIN (
        SELECT 
          cr.class_code,
          t.name as form_master_name,
          cr.teacher_id as form_master_id
        FROM class_role cr
        JOIN teachers t ON cr.teacher_id = t.id
        WHERE cr.role = 'Form Master'
      ) form_master_info ON c.class_code = form_master_info.class_code
      WHERE 1=1
      ${school_id ? 'AND c.school_id = :school_id' : ''}
      ${branch_id ? 'AND c.branch_id = :branch_id' : ''}
      ${status && status !== 'all' ? 'AND c.status = :status' : ''}
      ${section && section !== 'all' ? 'AND c.section = :section' : ''}
      ORDER BY c.status DESC, c.section ASC, c.class_name ASC
    `;

    const replacements = {};
    if (school_id) replacements.school_id = school_id;
    if (branch_id) replacements.branch_id = branch_id;
    if (status && status !== 'all') {
      replacements.status = status === 'active' ? 'Active' : 'Inactive';
    }
    if (section && section !== 'all') replacements.section = section;

    const classes = await db.sequelize.query(classesQuery, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    // Get unique sections for frontend filtering
    const sections = [...new Set(classes.map(cls => cls.section))].sort();
    
    // Calculate counts
    const counts = {
      total: classes.length,
      active: classes.filter(cls => cls.status === 'Active').length,
      inactive: classes.filter(cls => cls.status === 'Inactive').length,
      total_students: classes.reduce((sum, cls) => sum + (parseInt(cls.student_count) || 0), 0),
      total_subject_teachers: classes.reduce((sum, cls) => sum + (parseInt(cls.subject_teacher_count) || 0), 0),
      total_form_masters: classes.reduce((sum, cls) => sum + (parseInt(cls.form_master_count) || 0), 0),
      sections: sections.reduce((acc, section) => {
        const sectionClasses = classes.filter(cls => cls.section === section);
        acc[section] = {
          classes: sectionClasses.length,
          students: sectionClasses.reduce((sum, cls) => sum + (parseInt(cls.student_count) || 0), 0),
          subject_teachers: sectionClasses.reduce((sum, cls) => sum + (parseInt(cls.subject_teacher_count) || 0), 0),
          form_masters: sectionClasses.reduce((sum, cls) => sum + (parseInt(cls.form_master_count) || 0), 0)
        };
        return acc;
      }, {})
    };

    res.json({ 
      success: true, 
      data: classes,
      meta: {
        counts,
        sections,
        filters_applied: {
          status: status || 'all',
          section: section || 'all'
        }
      }
    });
  } catch (err) {
    console.error('Error in getAllClasses:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get classes with arms nested inside parent
const getAllClassesWithArms = async (req, res) => {
  try {
    const { school_id, branch_id, status, section } = req.query;

    const replacements = {
      school_id: school_id || req.user?.school_id,
      branch_id: branch_id || req.user?.branch_id || null,
    };

    const classes = await db.sequelize.query(`
      SELECT c.* FROM classes c
      WHERE c.school_id = :school_id
      ${branch_id ? 'AND c.branch_id = :branch_id' : ''}
      ORDER BY c.section, c.class_name
    `, { replacements, type: db.sequelize.QueryTypes.SELECT });

    // Separate parents and arms
    const parentClasses = classes.filter(c => !c.parent_id);
    const armClasses = classes.filter(c => c.parent_id);

    // Nest arms inside parents
    const result = parentClasses.map(parent => ({
      ...parent,
      arms: armClasses.filter(arm => arm.parent_id === parent.class_code)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error in getAllClassesWithArms:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single class (with arms)
const getClassByCode = async (req, res) => {
  try {
    const { class_code } = req.params;
    const where = { class_code };

    const cls = await Class.findOne({
      where,
    });

    if (!cls)
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });

    res.json({ success: true, data: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update class by class_code
const updateClasses = async (req, res) => {
  try {
    const class_code = req.query.class_code || req.body.class_code;
    const { class_name, section, status, stream } = req.body;

    if (!class_code) {
      return res.status(400).json({ success: false, message: "class_code is required" });
    }

    const cls = await Class.findOne({ where: { class_code } });

    if (!cls) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const updateData = {};
    if (class_name !== undefined) updateData.class_name = class_name.trim();
    if (section !== undefined) updateData.section = section.trim();
    if (status !== undefined) updateData.status = status;
    if (stream !== undefined) updateData.stream = stream;

    await cls.update(updateData);

    res.json({ success: true, message: "Class updated successfully", data: cls });
  } catch (err) {
    console.error("Error updating class:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete class by class_code with student validation and confirmation
const deleteClasses = async (req, res) => {
  try {
    const class_code = req.query.class_code || req.body.class_code;

    if (!class_code) {
      return res.status(400).json({ success: false, message: "Class code is required" });
    }

    const cls = await Class.findOne({ where: { class_code } });

    if (!cls) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    // Check for students
    const [studentCount] = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM students WHERE current_class = :class_code`,
      { replacements: { class_code }, type: db.sequelize.QueryTypes.SELECT }
    );

    if (studentCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class with ${studentCount.count} students. Move students first.`
      });
    }

    await cls.destroy();

    res.json({ success: true, message: "Class deleted successfully" });
  } catch (err) {
    console.error("Error deleting class:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// Middleware to route POST requests based on query_type
const classOperationRouter = async (req, res) => {
  const { query_type } = req.body;

  try {
    switch (query_type) {
      case 'delete':
        return await deleteClasses(req, res);
      case 'update':
        return await updateClasses(req, res);
      case 'create':
      default:
        return await createClasses(req, res);
    }
  } catch (error) {
    console.error('💥 Error in classOperationRouter:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing the request',
      error: error.message
    });
  }
};

// Get available sections for filtering
const getClassSections = async (req, res) => {
  try {
    const { school_id, branch_id } = req.query;

    const where = {};
    if (school_id) where.school_id = school_id;
    if (branch_id) where.branch_id = branch_id;

    const sections = await Class.findAll({
      attributes: ['section'],
      where: where,
      group: ['section'],
      order: [['section', 'ASC']]
    });

    const sectionList = sections.map(s => s.section);

    res.json({ 
      success: true, 
      data: sectionList
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Assign or update Form Master for a class
const assignFormMaster = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      class_code,
      teacher_id,
      school_id,
      branch_id,
      action = 'assign' // 'assign', 'remove', 'update'
    } = req.body;

    if (!class_code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Class code is required'
      });
    }

    // Verify class exists
    const classExists = await Class.findOne({
      where: {
        class_code,
        school_id: school_id || req.user.school_id,
        branch_id: branch_id || req.user.branch_id
      },
      transaction
    });

    if (!classExists) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (action === 'remove') {
      // Remove existing Form Master
      await db.sequelize.query(
        `DELETE FROM class_role WHERE class_code = :class_code AND role = 'Form Master'`,
        {
          replacements: { class_code },
          transaction
        }
      );

      await transaction.commit();
      return res.json({
        success: true,
        message: 'Form Master removed successfully',
        action: 'removed'
      });
    }

    if (!teacher_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Teacher ID is required for assignment'
      });
    }

    // Verify teacher exists
    const [teacherExists] = await db.sequelize.query(
      `SELECT id, name FROM teachers WHERE id = :teacher_id AND school_id = :school_id`,
      {
        replacements: {
          teacher_id,
          school_id: school_id || req.user.school_id
        },
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!teacherExists) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check if teacher is already a Form Master for another class
    const [existingAssignment] = await db.sequelize.query(
      `SELECT cr.class_code, c.class_name FROM class_role cr 
       JOIN classes c ON cr.class_code = c.class_code 
       WHERE cr.teacher_id = :teacher_id AND cr.role = 'Form Master' AND cr.class_code != :class_code`,
      {
        replacements: { teacher_id, class_code },
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (existingAssignment) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Teacher ${teacherExists.name} is already a Form Master for class ${existingAssignment.class_name}`,
        existing_assignment: {
          class_code: existingAssignment.class_code,
          class_name: existingAssignment.class_name
        }
      });
    }

    // Remove any existing Form Master for this class
    await db.sequelize.query(
      `DELETE FROM class_role WHERE class_code = :class_code AND role = 'Form Master'`,
      {
        replacements: { class_code },
        transaction
      }
    );

    // Generate new class_role_id
    const [maxId] = await db.sequelize.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(class_role_id, 4) AS UNSIGNED)), 0) + 1 as next_id FROM class_role WHERE class_role_id LIKE 'CR//%'`,
      {
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const newRoleId = `CR//${String(maxId.next_id).padStart(5, '0')}`;

    // Assign new Form Master
    await db.sequelize.query(
      `INSERT INTO class_role (class_role_id, teacher_id, section_id, class_name, class_code, role, school_id) 
       VALUES (:class_role_id, :teacher_id, :section_id, :class_name, :class_code, 'Form Master', :school_id)`,
      {
        replacements: {
          class_role_id: newRoleId,
          teacher_id,
          section_id: classExists.section,
          class_name: classExists.class_name,
          class_code,
          school_id: school_id || req.user.school_id
        },
        transaction
      }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: `${teacherExists.name} has been assigned as Form Master for ${classExists.class_name}`,
      data: {
        class_role_id: newRoleId,
        teacher_id,
        teacher_name: teacherExists.name,
        class_code,
        class_name: classExists.class_name,
        role: 'Form Master',
        action: action === 'update' ? 'updated' : 'assigned'
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Error in assignFormMaster:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while assigning Form Master'
    });
  }
};

// Assign or remove subject teacher
const assignSubjectTeacher = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      class_code,
      subject_code,
      teacher_id,
      school_id,
      branch_id,
      action = 'assign' // 'assign' or 'remove'
    } = req.body;

    if (!class_code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Class code is required'
      });
    }

    if (!subject_code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Subject code is required'
      });
    }

    // Verify class exists
    const classExists = await Class.findOne({
      where: {
        class_code,
        school_id: school_id || req.user.school_id,
        branch_id: branch_id || req.user.branch_id
      },
      transaction
    });

    if (!classExists) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (action === 'remove') {
      // Remove existing subject teacher assignment
      await db.sequelize.query(
        `DELETE FROM teacher_classes WHERE class_code = :class_code AND subject_code = :subject_code`,
        {
          replacements: { class_code, subject_code },
          transaction
        }
      );

      await transaction.commit();
      return res.json({
        success: true,
        message: 'Subject teacher removed successfully',
        action: 'removed'
      });
    }

    if (!teacher_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Teacher ID is required for assignment'
      });
    }

    // Verify teacher exists
    const [teacherExists] = await db.sequelize.query(
      `SELECT id, name FROM teachers WHERE id = :teacher_id AND school_id = :school_id`,
      {
        replacements: {
          teacher_id,
          school_id: school_id || req.user.school_id
        },
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!teacherExists) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify subject exists
    const [subjectExists] = await db.sequelize.query(
      `SELECT subject_code, subject FROM subjects WHERE subject_code = :subject_code AND school_id = :school_id`,
      {
        replacements: {
          subject_code,
          school_id: school_id || req.user.school_id
        },
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!subjectExists) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if assignment already exists
    const [existingAssignment] = await db.sequelize.query(
      `SELECT id FROM teacher_classes WHERE class_code = :class_code AND subject_code = :subject_code`,
      {
        replacements: { class_code, subject_code },
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (existingAssignment) {
      // Update existing assignment
      await db.sequelize.query(
        `UPDATE teacher_classes SET teacher_id = :teacher_id WHERE class_code = :class_code AND subject_code = :subject_code`,
        {
          replacements: { teacher_id, class_code, subject_code },
          transaction
        }
      );
    } else {
      // Create new assignment
      await db.sequelize.query(
        `INSERT INTO teacher_classes (teacher_id, class_code, class_name, subject_code, subject, school_id) 
         VALUES (:teacher_id, :class_code, :class_name, :subject_code, :subject, :school_id)`,
        {
          replacements: {
            teacher_id,
            class_code,
            class_name: classExists.class_name,
            subject_code,
            subject: subjectExists.subject,
            school_id: school_id || req.user.school_id
          },
          transaction
        }
      );
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `${teacherExists.name} has been assigned to teach ${subjectExists.subject} for ${classExists.class_name}`,
      data: {
        teacher_id,
        teacher_name: teacherExists.name,
        class_code,
        class_name: classExists.class_name,
        subject_code,
        subject_name: subjectExists.subject,
        action: existingAssignment ? 'updated' : 'assigned'
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Error in assignSubjectTeacher:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while assigning subject teacher'
    });
  }
};

// Get class subjects with teacher assignments
const getClassSubjects = async (req, res) => {
  try {
    const { class_code } = req.params;
    const { school_id, branch_id } = req.query;

    if (!class_code) {
      return res.status(400).json({
        success: false,
        message: 'Class code is required'
      });
    }

    const classSubjectsQuery = `
      SELECT 
        tc.id,
        tc.teacher_id,
        tc.class_code,
        tc.subject_code as subject_id,
        tc.subject,
        t.name as teacher_name
      FROM teacher_classes tc
      LEFT JOIN teachers t ON tc.teacher_id = t.id
      WHERE tc.class_code = :class_code
      AND tc.school_id = :school_id
      ORDER BY tc.subject
    `;

    const classSubjects = await db.sequelize.query(classSubjectsQuery, {
      replacements: {
        class_code,
        school_id: school_id || req.user.school_id
      },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: classSubjects
    });

  } catch (err) {
    console.error('Error in getClassSubjects:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while fetching class subjects'
    });
  }
};

// Get subjects specifically assigned to a class
const getClassSpecificSubjects = async (req, res) => {
  try {
    const { class_code } = req.params;
    const { school_id, branch_id } = req.query;

    if (!class_code) {
      return res.status(400).json({
        success: false,
        message: 'Class code is required'
      });
    }

    // Get all subjects assigned to this specific class from subjects table
    // const classSpecificSubjectsQuery = `
    //   SELECT DISTINCT
    //     s.subject_code,
    //     s.subject,
    //     s.subject_code as subject_id
    //   FROM subjects s
    //   WHERE s.class_code = :class_code
    //   AND s.school_id = :school_id
    //   ORDER BY s.subject
    // `;
    const classSpecificSubjectsQuery = `
        SELECT DISTINCT
          s.subject_code,
          s.subject,
          s.subject_code AS subject_id
        FROM subjects s
        INNER JOIN classes c
            ON c.class_code = s.class_code
            AND c.school_id = s.school_id
        WHERE s.class_code = :class_code
          AND s.school_id = :school_id
          AND s.status = 'Active'
          AND c.status = 'Active'
        ORDER BY s.subject
      `;


    const subjects = await db.sequelize.query(classSpecificSubjectsQuery, {
      replacements: {
        class_code,
        school_id: school_id || req.user.school_id
      },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: subjects
    });

  } catch (err) {
    console.error('Error in getClassSpecificSubjects:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while fetching class-specific subjects'
    });
  }
};

// Get available subjects
const getSubjects = async (req, res) => {
  try {
    const { school_id, branch_id } = req.query;

    const subjectsQuery = `
      SELECT 
        subject_code,
        subject,
        subject_code as subject_id
      FROM subjects
      WHERE school_id = :school_id
      ORDER BY subject
    `;

    const subjects = await db.sequelize.query(subjectsQuery, {
      replacements: {
        school_id: school_id || req.user.school_id
      },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: subjects
    });

  } catch (err) {
    console.error('Error in getSubjects:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while fetching subjects'
    });
  }
};

// Get available teachers for Form Master assignment
const getAvailableTeachers = async (req, res) => {
  try {
    const { school_id, branch_id } = req.query;

    const teachersQuery = `
      SELECT 
        t.id as teacher_id,
        t.name,
        t.name as full_name,
        t.mobile_no,
        t.staff_type,
        fm.class_code as current_form_master_class,
        fm.class_name as current_form_master_class_name
      FROM teachers t
      LEFT JOIN (
        SELECT cr.teacher_id, cr.class_code, c.class_name
        FROM class_role cr
        JOIN classes c ON cr.class_code = c.class_code
        WHERE cr.role = 'Form Master'
      ) fm ON t.id = fm.teacher_id
      WHERE t.school_id = :school_id
      ${branch_id ? 'AND t.branch_id = :branch_id' : ''}
      AND t.status = 'Active'
      AND t.staff_type = 'Academic Staff'
      ORDER BY t.name
    `;

    const teachers = await db.sequelize.query(teachersQuery, {
      replacements: {
        school_id: school_id || req.user.school_id,
        branch_id: branch_id || req.user.branch_id
      },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: teachers,
      meta: {
        total: teachers.length,
        available: teachers.filter(t => !t.current_form_master_class).length,
        assigned: teachers.filter(t => t.current_form_master_class).length
      }
    });

  } catch (err) {
    console.error('Error in getAvailableTeachers:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while fetching teachers'
    });
  }
};

module.exports = {
  createClasses,
  getAllClasses,
  getAllClassesWithArms,
  getClassByCode,
  updateClasses,
  deleteClasses,
  classOperationRouter,
  getClassSections,
  assignFormMaster,
  getAvailableTeachers,
  assignSubjectTeacher,
  getClassSubjects,
  getSubjects,
  getClassSpecificSubjects,
};
