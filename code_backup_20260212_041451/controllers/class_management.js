"use strict";

const db = require("../models");
const { Class } = db;
const { getNextCodeByDescription } = require("./codeGenerator");

const handleError = (res, err, message) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: message || "An error occurred while processing your request."
  });
};

// Get all classes excluding parent classes (classes that are used as parent_id by other classes)
const getAllClasses = async (req, res) => {
  try {
    const { school_id, branch_id, status, section } = req.body;
    
    const results = await db.sequelize.query(
      `SELECT c.*, 
        (SELECT COUNT(DISTINCT s.admission_no) 
         FROM students s 
         WHERE s.current_class = c.class_code
         AND s.school_id = c.school_id 
         AND s.branch_id = c.branch_id
         AND s.status = 'Active') as student_count,
        (SELECT COUNT(*) FROM subjects sub WHERE sub.class_code = c.class_code AND sub.school_id = c.school_id) as subject_count,
        (SELECT COUNT(*) FROM teacher_classes tc WHERE tc.class_code = c.class_code AND tc.school_id = c.school_id) as assigned_subject_count,
        (SELECT COUNT(DISTINCT tc.teacher_id) FROM teacher_classes tc WHERE tc.class_code = c.class_code AND tc.school_id = c.school_id) as subject_teacher_count,
        (SELECT t.name FROM teachers t JOIN class_role cr ON t.id = cr.teacher_id WHERE cr.class_name = c.class_name AND cr.role = 'Form Master' AND cr.school_id = c.school_id LIMIT 1) as form_master_name,
        (SELECT COUNT(*) FROM class_role cr WHERE cr.class_name = c.class_name AND cr.role = 'Form Master' AND cr.school_id = c.school_id) as form_master_count
      FROM classes c
      WHERE c.school_id = :school_id
        AND (:branch_id IS NULL OR c.branch_id = :branch_id)
        AND (:status IS NULL OR :status = 'all' OR c.status = :status)
        AND (:section IS NULL OR :section = 'all' OR c.section = :section)
        AND c.class_code NOT IN (
          SELECT DISTINCT parent_id FROM classes 
          WHERE parent_id IS NOT NULL AND school_id = :school_id
        )
      ORDER BY c.section, c.class_name`,
      {
        replacements: { 
          school_id: school_id || req.user?.school_id,
          branch_id: branch_id || req.user?.branch_id || null,
          status: status || 'active',
          section: section || null
        },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    res.json({ success: true, data: results });
  } catch (err) {
    handleError(res, err, "Error fetching classes.");
  }
};

// const class_management = async (req, res) => {
//   const {
//     id = 0,
//     query_type = "create",
//     class_code = null,
//     class_name = null,
//     description = null,
//     max_population = null,
//     class_teacher = null,
//     section = null,
//     branch_id = null,
//     school_id = null
//   } = req.body;

//   try {
//     const results = await db.sequelize.query(
//       `call class_management(:id,:query_type,:class_code,:class_name,:description,:max_population,:class_teacher,:section,:school_id)`,
//       {
//         replacements: {
//           id,
//           query_type,
//           class_code,
//           class_name,
//           description,
//           max_population,
//           class_teacher,
//           section,
//           school_id:req.user.school_id
//         }
//       }
//     );
//     res.json({
//       success: true,
//       results,
//       message: "Class management action completed."
//     });
//   } catch (err) {
//     handleError(res, err, "Error in class_management.");
//   }
// };

// const classes = async (req, res) => {
//   try {
//     const data = Array.isArray(req.body) ? req.body : [req.body];
//     const responses = [];
//     const errors = [];

//     const promises = data.map(async (item) => {
//       const {
//         id = 0,
//         query_type = null,
//         class_name = null,
//         section = null,
//         class_code = null,
//         branch_id = null,
//         school_id = null
//       } = item;

//       try {
//         const results = await db.sequelize.query(
//           `call classes(:query_type, :id, :class_name, :class_code, :section, :branch_id, :school_id)`,
//           {
//             replacements: {
//               id,
//               query_type,
//               class_name,
//               section,
//               branch_id,
//               school_id:school_id??req.user.school_id,
//               class_code
//             }
//           }
//         );
//         responses.push(results);
//       } catch (error) {
//         errors.push(error);
//         console.error("Error processing class item:", error);
//       }
//     });

//     await Promise.all(promises);

//     res.json({
//       success: true,
//       data: data.length === 1 ? responses[0] : responses,
//       errors,
//       message: "Classes processed successfully."
//     });
//   } catch (err) {
//     handleError(res, err, "Error in processing classes.");
//   }
// };



const classes = async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];
    const responses = [];
    const errors = [];

    const promises = data.map(async (item) => {
      const {
        id = 0,
        query_type = null,
        class_name = null,
        section = null,
        class_code = null,
        branch_id = null,
        school_id = null,
      } = item;
      console.log(req.body)
      try {
        const results = await db.sequelize.query(
          `CALL classes(:query_type, :id, :class_name, :class_code, :section, :branch_id, :school_id);`,
          {
            replacements: {
              id,
              query_type,
              class_name,
              section,
              branch_id:req.user.branch_id??branch_id,
              school_id:req.user.school_id,
              class_code
            }
          }
        );
        responses.push(results);
      } catch (error) {
        errors.push({ error: error.message, item });
        console.error("Error processing class item:", error);
      }
    });

    await Promise.all(promises);

    res.json({
      success: true,
      data: data.length === 1 ? responses[0] : responses,
      errors,
      message: "Classes processed successfully."
    });
  } catch (err) {
    handleError(res, err, "Error in processing classes.");
  }
};

// const get_class_management = async (req, res) => {
//   const {
//     id = 0,
//     query_type = "select",
//     class_code = null,
//     class_name = null,
//     description = null,
//     max_population = null,
//     class_teacher = null,
//     section = null,
//   } = req.body;

//   try {
//     const results = await db.sequelize.query(
//       `call class_management(:id,:query_type,:class_code,:class_name,:description,:max_population,:class_teacher,:section)`,
//       {
//         replacements: {
//           id,
//           query_type,
//           class_code,
//           class_name, 
//           description,
//           max_population,
//           class_teacher,
//           section
//         }
//       }
//     );
//     res.json({
//       success: true,
//       results,
//       message: "Class management data fetched successfully."
//     });
//   } catch (err) {
//     handleError(res, err, "Error in get_class_management.");
//   }
// };

const get_section = async (req, res) => {
    const {
      id = 1, 
      query_type = "select-sections", // Make sure this is set to 'select-sections'
    } = req.body;
  
    try {
      const results = await db.sequelize.query(
        `CALL get_sections('select-sections',:branch_id)`,
        {
          replacements: {
          branch_id:req.query.branch_id?? req.user.branch_id
          }
        }
      );
      res.json({
        success: true,
        results
      });
    } catch (err) {
      console.error('Error in get_section:', err);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching sections.'
      });
    }
  };
  

  const get_section_classes = async (req, res) => {
    const {
      query_type = "select-section-classes", // Default to 'select-section-classes'
      section = null // Default to null if not provided
    } = req.body;
  
    console.log(req.body);
  
    try {
      // Get branch_id from query params or headers
      const branch_id = req.query.branch_id || req.headers['x-branch-id'] || req.user.branch_id;
      
      // Ensure both query_type and section are passed to the stored procedure
      const results = await db.sequelize.query(
        `CALL get_section_classes(:query_type, :section, :branch_id, :school_id)`, // Use parameterized query
        {
          replacements: { query_type, section, branch_id, school_id: req.user.school_id} // Pass dynamic values as replacements
        }
      );
  
      // Return success response with the results
      res.json({
        success: true,
        results,
        message: "Classes in section fetched successfully."
      });
    } catch (err) {
      // Handle and return the error
      console.error("Error in get_section_classes:", err.message);
      res.status(500).json({
        success: false,
        message: "Error in fetching classes for the section.",
        error: err.message
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
      where.status='Active'
      const sections = await db.Class.findAll({
        attributes: ['section'],
        where: where,
        group: ['section'],
        order: [['section_id', 'ASC']]
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
        action = 'assign'
      } = req.body;
  
      const userSchoolId = school_id || req.user.school_id;
      const userBranchId = branch_id || req.user.branch_id;
  
      if (!class_code) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Class code is required'
        });
      }
  
      const classExists = await Class.findOne({
        where: {
          class_code,
          school_id: userSchoolId,
          branch_id: userBranchId
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
        await db.sequelize.query(
          `DELETE FROM class_role WHERE class_code = :class_code AND role = 'Form Master' AND school_id = :school_id`,
          {
            replacements: { 
              class_code,
              school_id: userSchoolId
            },
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
  
      const [teacherExists] = await db.sequelize.query(
        `SELECT id, name FROM teachers WHERE id = :teacher_id AND school_id = :school_id AND branch_id = :branch_id`,
        {
          replacements: {
            teacher_id,
            school_id: userSchoolId,
            branch_id: userBranchId
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
  
      const [existingAssignment] = await db.sequelize.query(
        `SELECT cr.class_code, c.class_name FROM class_role cr 
         JOIN classes c ON cr.class_code = c.class_code AND c.school_id = :school_id AND c.branch_id = :branch_id
         WHERE cr.teacher_id = :teacher_id AND cr.role = 'Form Master' AND cr.school_id = :school_id AND cr.class_code != :class_code`,
        {
          replacements: { 
            teacher_id, 
            class_code,
            school_id: userSchoolId,
            branch_id: userBranchId
          },
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
  
      await db.sequelize.query(
        `DELETE FROM class_role WHERE class_code = :class_code AND role = 'Form Master' AND school_id = :school_id`,
        {
          replacements: { 
            class_code,
            school_id: userSchoolId
          },
          transaction
        }
      );
  
      const [maxId] = await db.sequelize.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(class_role_id, 4) AS UNSIGNED)), 0) + 1 as next_id FROM class_role WHERE class_role_id LIKE 'CR//%'`,
        {
          type: db.sequelize.QueryTypes.SELECT,
          transaction
        }
      );
  
      const newRoleId = `CR//${String(maxId.next_id).padStart(5, '0')}`;
  
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
            school_id: userSchoolId
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

      // Check if user has admin privileges (you may need to adjust this logic based on your auth system)
      const isAdmin = req.user?.user_type?.toLowerCase() === 'admin' ||
                     req.user?.user_type?.toLowerCase() === 'superadmin';

      // Build the base query
      let query = `
        SELECT
          tc.id,
          tc.teacher_id,
          tc.class_code,
          tc.subject_code as subject_id,
          tc.subject,
          t.name as teacher_name
        FROM active_teacher_classes tc
        LEFT JOIN teachers t ON tc.teacher_id = t.id
        WHERE tc.class_code = :class_code
          AND tc.school_id = :school_id
      `;
      const replacements = {
        class_code,
        school_id: school_id || req.user.school_id
      };

      // For non-admin users, restrict to their branch if it exists in query or user context
      // Since teacher_classes doesn't have branch_id column directly, we need to make sure
      // the access is properly controlled - this is important for security
      if (!isAdmin) {
        // For non-admin users, you might want to perform additional checks based on their permissions
        // This could include checking if they are assigned to this class as teacher, etc.
      }

      // Add branch filtering if explicitly provided in query
      if (branch_id) {
        // This would require checking the classes table since teacher_classes doesn't have branch_id
        query += ` AND EXISTS (
          SELECT 1 FROM classes c
          WHERE c.class_code = tc.class_code
            AND c.school_id = tc.school_id
            AND c.branch_id = :branch_id
        )`;
        replacements.branch_id = branch_id;
      }

      query += " ORDER BY tc.subject";

      const classSubjects = await db.sequelize.query(query, {
        replacements: replacements,
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
      const classSpecificSubjectsQuery = `
        SELECT DISTINCT
          s.subject_code,
          s.subject,
          s.subject_code as subject_id
        FROM subjects s
        WHERE s.class_code = :class_code
        AND s.school_id = :school_id
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

const classNameExists = async (class_name, school_id, branch_id) => {
  const existingClass = await Class.findOne({
    where: { class_name, school_id, branch_id }
  });
  return existingClass;
};

const checkClassNamesExistence = async (req, res) => {
  try {
    const { school_id, branch_id, classes } = req.body;

    // Ensure `classes` is always an array of { class_name }
    const classNames = Array.isArray(classes) ? classes : [classes];

    // Run checks in parallel for better performance
    const results = await Promise.all(
      classNames.map(async (item) => {
        const exists = await classNameExists(item.class_name, school_id, branch_id);
        return { class_name: item.class_name, exists };
      })
    );

    res.json({
      success: true,
      results,
      message: "Class name existence check completed."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error checking class name existence.",
      error: error.message
    });
  }
};

// Get all subject-teacher assignments for a section (for Smart Timetable)
const getSectionSubjectAssignments = async (req, res) => {
  try {
    const { section, school_id, branch_id } = req.query;

    if (!section) {
      return res.status(400).json({
        success: false,
        message: 'Section is required'
      });
    }

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    // Get all subject-teacher assignments for classes in this section
    const sectionSubjectsQuery = `
      SELECT
        tc.id,
        tc.teacher_id,
        tc.class_code,
        tc.subject_code,
        tc.subject as subject_name,
        c.class_name,
        c.section,
        t.name as teacher_name
      FROM active_teacher_classes tc
      INNER JOIN classes c ON tc.class_code = c.class_code AND tc.school_id = c.school_id
      LEFT JOIN teachers t ON tc.teacher_id = t.id AND tc.school_id = t.school_id
      WHERE c.section = :section
        AND tc.school_id = :school_id
        ${branch_id ? 'AND c.branch_id = :branch_id' : ''}
      ORDER BY c.class_name, tc.subject
    `;

    const assignments = await db.sequelize.query(sectionSubjectsQuery, {
      replacements: {
        section,
        school_id: school_id || req.user.school_id,
        branch_id: branch_id || req.user.branch_id
      },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: assignments,
      count: assignments.length
    });

  } catch (err) {
    console.error('Error in getSectionSubjectAssignments:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while fetching section subject assignments'
    });
  }
};

const updateFormMaster = async (req, res) => {
  const { class_code } = req.params;
  const { teacherId, school_id, branch_id } = req.body;
  
  const effectiveSchoolId = school_id || req.user.school_id || req.headers['x-school-id'];
  const effectiveBranchId = branch_id || req.user.branch_id || req.headers['x-branch-id'];

  const transaction = await db.sequelize.transaction();

  try {
    const classExists = await db.Class.findOne({
      where: {
        class_code,
        school_id: effectiveSchoolId,
        branch_id: effectiveBranchId
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

    // First, remove any existing form master for this class
    await db.sequelize.query(
      `DELETE FROM class_role WHERE class_code = :class_code AND role = 'Form Master'`, {
        replacements: {
          class_code
        },
        transaction
      }
    );

    if (teacherId) { // If teacherId is provided, assign new form master
      const [teacherExists] = await db.sequelize.query(
        `SELECT id, name FROM teachers WHERE id = :teacherId AND school_id = :school_id`, {
          replacements: {
            teacherId,
            school_id: effectiveSchoolId
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
                 WHERE cr.teacher_id = :teacherId AND cr.role = 'Form Master'`, {
          replacements: {
            teacherId
          },
          type: db.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (existingAssignment) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Teacher ${teacherExists.name} is already a Form Master for class ${existingAssignment.class_name}`
        });
      }

      const [maxId] = await db.sequelize.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(class_role_id, 4) AS UNSIGNED)), 0) + 1 as next_id FROM class_role WHERE class_role_id LIKE 'CR//%'`, {
          type: db.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      const newRoleId = `CR//${String(maxId.next_id).padStart(5, '0')}`;

      await db.sequelize.query(
        `INSERT INTO class_role (class_role_id, teacher_id, section_id, class_name, class_code, role, school_id) 
                 VALUES (:class_role_id, :teacher_id, :section_id, :class_name, :class_code, 'Form Master', :school_id)`, {
          replacements: {
            class_role_id: newRoleId,
            teacher_id: teacherId,
            section_id: classExists.section,
            class_name: classExists.class_name,
            class_code,
            school_id
          },
          transaction
        }
      );

      await transaction.commit();
      return res.json({
        success: true,
        message: `${teacherExists.name} assigned as Form Master.`
      });

    } else { // If teacherId is null or undefined, it's a removal
      await transaction.commit();
      return res.json({
        success: true,
        message: 'Form Master removed.'
      });
    }
  } catch (err) {
    await transaction.rollback();
    console.error('Error in updateFormMaster:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred.'
    });
  }
};

// Create classes with optional arms
const createClasses = async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];
  const errors = [];

  try {
    for (const item of payload) {
      const { class_name, section, school_id, branch_id, class_arms = [] } = item;
      const cleanClassName = (class_name || "").trim();
      const cleanSection = (section || "").trim();
      const cleanBranchId = (branch_id || req.user?.branch_id || "").trim();
      const cleanSchoolId = (school_id || req.user?.school_id || "").trim();

      if (!cleanClassName || !cleanSection || !cleanSchoolId || !cleanBranchId) {
        errors.push({ error: "Missing required fields", item });
        continue;
      }

      if (class_arms.length > 0) {
        let parentClass = await Class.findOne({
          where: { class_name: cleanClassName, section: cleanSection, branch_id: cleanBranchId, school_id: cleanSchoolId },
        });
        if (!parentClass) {
          const parentCode = await getNextCodeByDescription("class");
          parentClass = await Class.create({
            class_name: cleanClassName, class_code: parentCode, section: cleanSection,
            branch_id: cleanBranchId, school_id: cleanSchoolId, status: 'Active',
          });
        }

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
            class_name: armClassName, class_code: armCode, section: cleanSection,
            branch_id: cleanBranchId, school_id: cleanSchoolId, parent_id: parentClass.class_code, status: 'Active',
          });
          results.push({ class_code: newArm.class_code, class_name: newArm.class_name, section: newArm.section, parent_id: parentClass.class_code, status: 'created' });
        }
      } else {
        const existing = await Class.findOne({
          where: { class_name: cleanClassName, section: cleanSection, branch_id: cleanBranchId, school_id: cleanSchoolId },
        });
        if (existing) {
          results.push({ class_code: existing.class_code, class_name: existing.class_name, section: existing.section, status: 'existing' });
          continue;
        }
        const class_code = await getNextCodeByDescription("class");
        const newClass = await Class.create({
          class_name: cleanClassName, class_code, section: cleanSection,
          branch_id: cleanBranchId, school_id: cleanSchoolId, status: 'Active',
        });
        results.push({ class_code: newClass.class_code, class_name: newClass.class_name, section: newClass.section, status: 'created' });
      }
    }
    return res.status(201).json({ success: true, data: results, errors });
  } catch (err) {
    console.error("Error creating class:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// Get classes with arms nested inside parent
const getAllClassesWithArms = async (req, res) => {
  try {
    const { school_id, branch_id } = req.query;
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

    const parentClasses = classes.filter(c => !c.parent_id);
    const armClasses = classes.filter(c => c.parent_id);

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

module.exports = {
  classes,
  getAllClasses,
  getAllClassesWithArms,
  createClasses,
  get_section,
  get_section_classes,
  getClassSections,
  assignFormMaster,
  getAvailableTeachers,
  assignSubjectTeacher,
  getClassSubjects,
  getSubjects,
  getClassSpecificSubjects,
  checkClassNamesExistence,
  getSectionSubjectAssignments,
  updateFormMaster,
};
