const { Student } = require('../models');
const { QueryTypes } = require('sequelize');

module.exports = function(app) {
  // Get active student count for a school
  app.get('/api/students/count', async (req, res) => {
    try {
      const { school_id, status = 'active' } = req.query;
      const userSchoolId = req.user?.school_id || school_id;

      if (!userSchoolId) {
        return res.status(400).json({
          success: false,
          message: 'school_id is required'
        });
      }

      let query = `
        SELECT COUNT(*) as count
        FROM students s
        WHERE s.school_id = ?
      `;
      
      const params = [userSchoolId];

      if (status === 'active') {
        query += ' AND (s.status IS NULL OR s.status = "active")';
      }

      const result = await Student.sequelize.query(query, {
        replacements: params,
        type: QueryTypes.SELECT
      });

      return res.json({
        success: true,
        count: result[0]?.count || 0
      });

    } catch (error) {
      console.error('Error fetching student count:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Search students by name
  app.get('/api/students', async (req, res) => {
    try {
      const { search, school_id, branch_id } = req.query;
      const userSchoolId = req.user?.school_id || school_id;
      const userBranchId = req.user?.branch_id || branch_id;

      if (!userSchoolId) {
        return res.status(400).json({
          success: false,
          message: 'school_id is required'
        });
      }

      let query = `
        SELECT 
          s.id,
          s.student_id,
          s.student_name,
          s.admission_no,
          s.class_code
        FROM students s
        WHERE s.school_id = ?
      `;
      
      const params = [userSchoolId];

      if (userBranchId) {
        query += ' AND s.branch_id = ?';
        params.push(userBranchId);
      }

      if (search) {
        query += ' AND (s.student_name LIKE ? OR s.admission_no LIKE ? OR s.student_id LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY s.student_name LIMIT 50';

      const students = await Student.sequelize.query(query, {
        replacements: params,
        type: QueryTypes.SELECT
      });

      return res.json({
        success: true,
        data: students
      });
    } catch (error) {
      console.error('Error fetching students:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }
  });

  // Get students for broadsheet (only Active classes and Active/Suspended students)
  app.get('/api/students/broadsheet', async (req, res) => {
    try {
      const { class_code, school_id, branch_id } = req.query;

      // Validate required parameters
      if (!class_code) {
        return res.status(400).json({
          success: false,
          message: 'class_code is required'
        });
      }

      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'school_id is required'
        });
      }

      // Query students with class and status filtering
      const students = await Student.sequelize.query(
        `SELECT
          s.id,
          s.admission_no,
          s.student_name,
          s.first_name,
          s.surname,
          s.other_names,
          s.class_code,
          s.current_class,
          s.section,
          s.status as student_status,
          c.class_name,
          c.status as class_status
        FROM students s
        INNER JOIN classes c ON s.current_class = c.class_code AND s.school_id = c.school_id
        WHERE s.current_class = :class_code
          AND s.school_id = :school_id
          ${branch_id ? 'AND s.branch_id = :branch_id' : ''}
          AND c.status = 'Active'
          AND s.status IN ('Active', 'Suspended')
        ORDER BY s.student_name ASC`,
        {
          replacements: { class_code, school_id, branch_id },
          type: QueryTypes.SELECT
        }
      );

      return res.status(200).json({
        success: true,
        data: students,
        count: students.length
      });

    } catch (error) {
      console.error('Error fetching broadsheet students:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Get student details by admission number with parent information
  app.get('/api/students/details', async (req, res) => {
    try {
      const { admission_no } = req.query;
      
      if (!admission_no) {
        return res.status(400).json({
          success: false,
          message: 'Admission number is required'
        });
      }

      // Check if school_id is provided in query (required for security)
      const { school_id } = req.query;
      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }

      // Use raw query to get student data with optional parent info
      let student = await Student.sequelize.query(
        `SELECT 
          s.admission_no,
          s.student_name,
          s.first_name,
          s.other_names,
          s.surname,
          s.home_address as address,
          s.date_of_birth,
          s.sex as gender,
          s.religion,
          s.state_of_origin,
          s.nationality,
          s.blood_group,
          s.class_code,
          s.current_class,
          s.section,
          s.profile_picture as student_image,
          s.parent_id,
          s.created_at,
          s.updated_at
        FROM students s
        WHERE s.admission_no = :admission_no AND s.school_id = :school_id`,
        {
          replacements: { admission_no, school_id },
          type: QueryTypes.SELECT
        }
      );

      if (!student || student.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // If the student has a parent_id, try to get parent information
      let result = student[0];
      if (result.parent_id) {
        try {
          const parent = await Student.sequelize.query(
            `SELECT 
              phone as parent_phone,
              fullname as parent_name,
              email as parent_email
            FROM parents 
            WHERE parent_id = :parent_id AND school_id = :school_id LIMIT 1`,
            {
              replacements: { parent_id: result.parent_id, school_id },
              type: QueryTypes.SELECT
            }
          );
          
          if (parent && parent.length > 0) {
            result = { ...result, ...parent[0] };
          }
        } catch (parentError) {
          // If parent query fails (e.g. parents table doesn't exist), just continue without parent data
          console.log('Could not fetch parent information:', parentError.message);
          // Add default empty values for parent data
          result.parent_phone = null;
          result.parent_name = null;
          result.parent_email = null;
        }
      } else {
        // Add default values for parent data when no parent_id exists
        result.parent_phone = null;
        result.parent_name = null;
        result.parent_email = null;
      }

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error fetching student details:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Alternative route using URL parameter instead of query parameter
  app.get('/api/students/details/:admission_no', async (req, res) => {
    try {
      const { admission_no } = req.params;
      
      // Check if school_id is provided in query (required for security)
      const { school_id } = req.query;
      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }

      // Use raw query to get student data with optional parent info
      let student = await Student.sequelize.query(
        `SELECT 
          s.admission_no,
          s.student_name,
          s.first_name,
          s.other_names,
          s.surname,
          s.home_address as address,
          s.date_of_birth,
          s.sex as gender,
          s.religion,
          s.state_of_origin,
          s.nationality,
          s.blood_group,
          s.class_code,
          s.current_class,
          s.section,
          s.profile_picture as student_image,
          s.parent_id,
          s.created_at,
          s.updated_at
        FROM students s
        WHERE s.admission_no = :admission_no AND s.school_id = :school_id`,
        {
          replacements: { admission_no, school_id },
          type: QueryTypes.SELECT
        }
      );

      if (!student || student.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // If the student has a parent_id, try to get parent information
      let result = student[0];
      if (result.parent_id) {
        try {
          const parent = await Student.sequelize.query(
            `SELECT 
              phone as parent_phone,
              fullname as parent_name,
              email as parent_email
            FROM parents 
            WHERE parent_id = :parent_id AND school_id = :school_id LIMIT 1`,
            {
              replacements: { parent_id: result.parent_id, school_id },
              type: QueryTypes.SELECT
            }
          );
          
          if (parent && parent.length > 0) {
            result = { ...result, ...parent[0] };
          }
        } catch (parentError) {
          // If parent query fails (e.g. parents table doesn't exist), just continue without parent data
          console.log('Could not fetch parent information:', parentError.message);
          // Add default empty values for parent data
          result.parent_phone = null;
          result.parent_name = null;
          result.parent_email = null;
        }
      } else {
        // Add default values for parent data when no parent_id exists
        result.parent_phone = null;
        result.parent_name = null;
        result.parent_email = null;
      }

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error fetching student details:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Update student scholarship
  app.post('/students/update-scholarship', async (req, res) => {
    try {
      const { admission_no, scholarship_percentage, scholarship_type, school_id, branch_id } = req.body;
      const userSchoolId = req.user?.school_id || school_id;
      const userBranchId = req.user?.branch_id || branch_id;

      if (!admission_no || !userSchoolId) {
        return res.status(400).json({
          success: false,
          message: 'admission_no and school_id are required'
        });
      }

      // Validate scholarship percentage
      if (scholarship_percentage !== undefined) {
        const percentage = parseFloat(scholarship_percentage);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          return res.status(400).json({
            success: false,
            message: 'Scholarship percentage must be between 0 and 100'
          });
        }
      }

      // Build update object
      const updateData = {};
      if (scholarship_percentage !== undefined) {
        updateData.scholarship_percentage = parseFloat(scholarship_percentage);
      }
      if (scholarship_type !== undefined) {
        updateData.scholarship_type = scholarship_type;
      }

      // Update student
      const [updatedRows] = await Student.update(updateData, {
        where: {
          admission_no,
          school_id: userSchoolId,
          ...(userBranchId && { branch_id: userBranchId })
        }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      return res.json({
        success: true,
        message: 'Scholarship updated successfully',
        data: updateData
      });

    } catch (error) {
      console.error('Error updating scholarship:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });
};