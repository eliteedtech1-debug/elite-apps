const db = require("../models");

const getStudentResults = (req, res) => {
  const admission_no =
    req.params.admission_no || req.query.admission_no || req.body.admission_no;
  console.log(`Student results for admission number:`, admission_no);

  if (!admission_no) {
    return res
      .status(400)
      .json({ success: false, message: "Admission number is required." });
  }
  db.sequelize
    .query(`Call get-result(:admission_no)`, {
      replacements: { admission_no },
      type: db.Sequelize.QueryTypes.RAW
    })
    .then((results) => {
      res.json({ success: true, results });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the student details."
      });
    });
};

const getStudentResultsWithExamType = (req, res) => {
  const admission_no = req.body.admission_no;
  console.log(
    `Student results with exam type for admission number:`,
    admission_no
  );

  if (!admission_no) {
    return res
      .status(400)
      .json({ success: false, message: "Admission number is required." });
  }

  db.sequelize
    .query(`Call get_student_results_with_exam_type(:admission_no)`, {
      replacements: { admission_no },
      type: db.Sequelize.QueryTypes.RAW
    })
    .then((results) => {
      res.json({ success: true, results });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the student results."
      });
    });
};

const getStudentResult = (req, res) => {
  const { query_type = "get-result" } = req.body;
  const admission_no = req.body.admission_no;
  console.log(
    `Student results with exam type for admission number:`,
    admission_no
  );

  if (!admission_no) {
    return res
      .status(400)
      .json({ success: false, message: "Admission number is required." });
  }

  db.sequelize
    .query(`Call student_result(:query_type,:admission_no)`, {
      replacements: { query_type, admission_no },
      type: db.Sequelize.QueryTypes.RAW
    })
    .then((results) => {
      res.json({ success: true, results });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the student results."
      });
    });
};

// Controller for fetching class results by class name
const getClassResultsByClassName = (req, res) => {
  const className =
    req.params.class_name || req.query.class_name || req.body.class_name;
  const show_exam_type = req.query.show_exam_type === "true";

  console.log(`Class results for class name:`, className);

  if (!className) {
    return res
      .status(400)
      .json({ success: false, message: "Class name is required." });
  }

  db.sequelize
    .query(
      `CALL get_class_results_by_class_name(:className, :show_exam_type)`,
      {
        replacements: { className, show_exam_type },
        type: db.Sequelize.QueryTypes.RAW
      }
    )
    .then((results) => {
      res.json({ success: true, results });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the class results."
      });
    });
};


const getClassResults = (req, res) => {
  const {query_type=null,admission_no=null, class_code=null, term=null, academic_year=null, school_id=null, branch_id=null} = req.body;

  if (!class_code) {
    return res.status(400).json({
      success: false,
      message: "class_code  is required."
    });
  }
  db.sequelize.query(`Call get_class_results(:query_type,:admission_no,:class_code,:academic_year,:term,:school_id,:branch_id)`, {
    replacements: {
      query_type,
      class_code,
      admission_no,
      term, academic_year, 
      school_id: school_id ?? req.user.school_id,
      branch_id: branch_id 
    },
    type: db.Sequelize.QueryTypes.RAW
  }).then((results) => {
    res.json({
      success: true,
      results:results||[]
    });
})};

const getCharacterScores = (req, res) => {
  const {
    query_type = null,
    id = null,
    school_id = null,
    branch_id = null,
    academic_year = null,
    term = null,
    section = null,
    category = null,
    admission_no = null,
    student_name = null,
    grade = null,
    created_by = null,
    description = null,
    class_name = null,
    class_code=null,
    status = null
  } = req.body;

  console.log('getCharacterScores called with query_type:', query_type);

  // Get fallback values
  const finalSchoolId = school_id || req.user.school_id || req.headers['x-school-id'];
  const finalBranchId = branch_id || req.headers['x-branch-id'] || req.user.branch_id;

  // Handle special query types
  const { old_category, new_category, from_section, to_section, from_branch_id, to_branch_id } = req.body;

  // Update Domain Category
  if (query_type === 'Update Domain Category') {
    db.sequelize.query(
      `UPDATE character_traits 
       SET category = :new_category 
       WHERE category = :old_category 
         AND section = :section 
         AND school_id = :school_id
         AND branch_id = :branch_id`,
      {
        replacements: {
          old_category,
          new_category,
          section,
          school_id: finalSchoolId,
          branch_id: finalBranchId
        },
        type: db.Sequelize.QueryTypes.UPDATE
      }
    )
    .then(() => {
      res.json({ success: true, message: 'Domain category updated successfully' });
    })
    .catch((error) => {
      console.error('Update Domain Category error:', error);
      res.status(500).json({ success: false, message: 'Failed to update domain category' });
    });
    return;
  }

  // Delete Domain
  if (query_type === 'Delete Domain') {
    db.sequelize.query(
      `DELETE FROM character_traits 
       WHERE category = :category 
         AND section = :section 
         AND school_id = :school_id
         AND branch_id = :branch_id`,
      {
        replacements: {
          category,
          section,
          school_id: finalSchoolId,
          branch_id: finalBranchId
        },
        type: db.Sequelize.QueryTypes.DELETE
      }
    )
    .then(() => {
      res.json({ success: true, message: 'Domain and all traits deleted successfully' });
    })
    .catch((error) => {
      console.error('Delete Domain error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete domain' });
    });
    return;
  }

  // Copy Domains
  if (query_type === 'Copy Domains') {
    const query = from_section === 'ALL'
      ? `INSERT INTO character_traits (school_id, branch_id, section, category, description)
         SELECT school_id, branch_id, :to_section, category, description
         FROM character_traits
         WHERE school_id = :school_id AND branch_id = :branch_id`
      : `INSERT INTO character_traits (school_id, branch_id, section, category, description)
         SELECT school_id, branch_id, :to_section, category, description
         FROM character_traits
         WHERE section = :from_section AND school_id = :school_id AND branch_id = :branch_id`;
    
    db.sequelize.query(query, {
      replacements: {
        from_section,
        to_section,
        school_id: finalSchoolId,
        branch_id: finalBranchId
      },
      type: db.Sequelize.QueryTypes.INSERT
    })
    .then(() => {
      res.json({ success: true, message: 'Domains copied successfully' });
    })
    .catch((error) => {
      console.error('Copy Domains error:', error);
      res.status(500).json({ success: false, message: 'Failed to copy domains' });
    });
    return;
  }

  // Copy from Branch
  if (query_type === 'Copy from Branch') {
    const fromBranchCondition = from_branch_id === 'NULL' || from_branch_id === '' 
      ? 'branch_id IS NULL' 
      : 'branch_id = :from_branch_id';
    
    db.sequelize.query(
      `INSERT INTO character_traits (school_id, branch_id, section, category, description)
       SELECT :school_id, :to_branch_id, section, category, description
       FROM character_traits
       WHERE school_id = :school_id AND ${fromBranchCondition}`,
      {
        replacements: {
          from_branch_id: from_branch_id === 'NULL' || from_branch_id === '' ? null : from_branch_id,
          to_branch_id: to_branch_id || finalBranchId,
          school_id: finalSchoolId
        },
        type: db.Sequelize.QueryTypes.INSERT
      }
    )
    .then(() => {
      res.json({ success: true, message: 'Traits copied from branch successfully' });
    })
    .catch((error) => {
      console.error('Copy from Branch error:', error);
      res.status(500).json({ success: false, message: 'Failed to copy traits from branch' });
    });
    return;
  }

  // Handle Select School Characters separately
  if (query_type === 'Select School Characters') {
    console.log('Fetching character traits for school:', finalSchoolId, 'branch:', finalBranchId, 'section:', section);
    
    db.sequelize.query(
      `SELECT id, school_id, branch_id, category, description, section
       FROM character_traits
       WHERE school_id = :school_id
         AND branch_id = :branch_id
         ${section ? 'AND section = :section' : ''}
       ORDER BY section, category, description`,
      {
        replacements: {
          school_id: finalSchoolId,
          branch_id: finalBranchId,
          section: section || null
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      console.log('Found', results.length, 'character traits');
      res.json({
        success: true,
        results
      });
    })
    .catch((error) => {
      console.error('Error fetching character traits:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching character traits."
      });
    });
    return;
  }

  // Handle student character scores for individual student
  if (query_type === 'select-student-record') {
    db.sequelize.query(
      `SELECT * FROM character_scores
       WHERE admission_no = :admission_no
         AND class_code = :class_code
         AND academic_year = :academic_year
         AND term = :term
         AND school_id = :school_id
       ORDER BY category, description`,
      {
        replacements: {
          admission_no,
          class_code,
          academic_year,
          term,
          school_id: finalSchoolId
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      res.json({ success: true, results });
    })
    .catch((error) => {
      console.error('Error fetching student character scores:', error);
      res.status(500).json({ success: false, message: "Error fetching student character scores" });
    });
    return;
  }

  // Handle student character scores
  if (query_type === 'select') {
    db.sequelize.query(
      `SELECT * FROM character_scores
       WHERE admission_no = :admission_no
         AND academic_year = :academic_year
         AND term = :term
         AND school_id = :school_id
       ORDER BY category, description`,
      {
        replacements: {
          admission_no,
          academic_year,
          term,
          school_id: finalSchoolId
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      res.json({ success: true, results });
    })
    .catch((error) => {
      console.error('Error fetching student character scores:', error);
      res.status(500).json({ success: false, message: "Error fetching character scores" });
    });
    return;
  }

  // Handle View Class Character Scores - fetch all character scores for a class
  if (query_type === 'View Class Character Scores' || query_type === 'select-class-record') {
    db.sequelize.query(
      `SELECT cs.*, s.student_name 
       FROM character_scores cs
       LEFT JOIN students s ON cs.admission_no = s.admission_no
       WHERE cs.class_code = :class_code
         AND cs.school_id = :school_id
       ORDER BY cs.admission_no, cs.category, cs.description`,
      {
        replacements: {
          class_code,
          school_id: finalSchoolId
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      res.json({ success: true, results });
    })
    .catch((error) => {
      console.error('Error fetching class character scores:', error);
      res.status(500).json({ success: false, message: "Error fetching class character scores" });
    });
    return;
  }

  db.sequelize
    .query(
      `CALL character_scores (
            :query_type,
            :school_id,
            :academic_year,
            :term,
            :section,
            :category,
            :admission_no,
            :student_name,
            :grade,
            :created_by,
            :description,
            :class_name,
            :class_code,
            :id,
            :branch_id)`,
      {
        replacements: {
          query_type,
          school_id: school_id ?? req.user.school_id,
          academic_year,
          term,
          section,
          category,
          admission_no,
          student_name,
          grade,
          created_by,
          description,
          class_name,
          class_code,
          id,
          branch_id: branch_id ?? req.headers['x-branch-id'] ?? req.user.branch_id
        },
        type: db.Sequelize.QueryTypes.RAW
      }
    )
    .then((results) => {
      res.json({
        success: true,
        results
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the student details."
      });
    });
};
const postCharacterScores = async (req, res) => {
  try {
    // Handle special query types that don't use the stored procedure
    const { query_type, old_category, new_category, category, section, school_id, branch_id, from_section, to_section } = req.body;
    
    // Get fallback values from headers
    const finalSchoolId = school_id || req.user.school_id || req.headers['x-school-id'];
    const finalBranchId = branch_id || req.headers['x-branch-id'] || req.user.branch_id;
    
    // Update Domain Category - rename category for all traits
    if (query_type === 'Update Domain Category') {
      await db.sequelize.query(
        `UPDATE character_traits 
         SET category = :new_category 
         WHERE category = :old_category 
           AND section = :section 
           AND school_id = :school_id
           AND branch_id = :branch_id`,
        {
          replacements: {
            old_category,
            new_category,
            section,
            school_id: finalSchoolId,
            branch_id: finalBranchId
          },
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );
      return res.json({ success: true, message: 'Domain category updated successfully' });
    }
    
    // Delete Domain - delete all traits in a category
    if (query_type === 'Delete Domain') {
      await db.sequelize.query(
        `DELETE FROM character_traits 
         WHERE category = :category 
           AND section = :section 
           AND school_id = :school_id
           AND branch_id = :branch_id`,
        {
          replacements: {
            category,
            section,
            school_id: finalSchoolId,
            branch_id: finalBranchId
          },
          type: db.Sequelize.QueryTypes.DELETE
        }
      );
      return res.json({ success: true, message: 'Domain and all traits deleted successfully' });
    }

    // Copy Domains - copy all domains and traits from one section to another
    if (query_type === 'Copy Domains') {
      if (from_section === 'ALL') {
        // Copy all sections to target section
        await db.sequelize.query(
          `INSERT INTO character_traits (school_id, branch_id, section, category, description)
           SELECT school_id, branch_id, :to_section, category, description
           FROM character_traits
           WHERE school_id = :school_id
             AND branch_id = :branch_id`,
          {
            replacements: {
              to_section,
              school_id: finalSchoolId,
              branch_id: finalBranchId
            },
            type: db.Sequelize.QueryTypes.INSERT
          }
        );
      } else {
        // Copy specific section to target section
        await db.sequelize.query(
          `INSERT INTO character_traits (school_id, branch_id, section, category, description)
           SELECT school_id, branch_id, :to_section, category, description
           FROM character_traits
           WHERE section = :from_section 
             AND school_id = :school_id
             AND branch_id = :branch_id`,
          {
            replacements: {
              from_section,
              to_section,
              school_id: finalSchoolId,
              branch_id: finalBranchId
            },
            type: db.Sequelize.QueryTypes.INSERT
          }
        );
      }
      return res.json({ success: true, message: 'Domains copied successfully' });
    }

    // Copy from Branch - copy all traits from another branch to current branch
    if (query_type === 'Copy from Branch') {
      const { from_branch_id, to_branch_id } = req.body;
      
      // Handle NULL branch_id (main branch)
      const fromBranchCondition = from_branch_id === 'NULL' || from_branch_id === '' 
        ? 'branch_id IS NULL' 
        : 'branch_id = :from_branch_id';
      
      await db.sequelize.query(
        `INSERT INTO character_traits (school_id, branch_id, section, category, description)
         SELECT :school_id, :to_branch_id, section, category, description
         FROM character_traits
         WHERE school_id = :school_id
           AND ${fromBranchCondition}`,
        {
          replacements: {
            from_branch_id: from_branch_id === 'NULL' || from_branch_id === '' ? null : from_branch_id,
            to_branch_id: to_branch_id || finalBranchId,
            school_id: finalSchoolId
          },
          type: db.Sequelize.QueryTypes.INSERT
        }
      );
      return res.json({ success: true, message: 'Traits copied from branch successfully' });
    }

    // Select School Characters - get all character traits for the school/branch
    if (query_type === 'Select School Characters') {
      const results = await db.sequelize.query(
        `SELECT id, school_id, branch_id, category, description, section
         FROM character_traits
         WHERE school_id = :school_id
           AND branch_id = :branch_id
         ORDER BY section, category, description`,
        {
          replacements: {
            school_id: finalSchoolId,
            branch_id: finalBranchId
          },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );
      return res.json({ success: true, results });
    }

    // Ensure operations is an array, even if a single object is provided.
    const operations = Array.isArray(req.body) ? req.body : [req.body];
    console.log(operations);

    const results = await Promise.all(
      operations.map(async (operation) => {
        const {
          query_type = null,
          id = null,
          school_id = null,
          branch_id = null,
          academic_year = null,
          term = null,
          section = null,
          category = null,
          admission_no = null,
          student_name = null,
          grade = null,
          created_by = null,
          description = null,
          class_name = null,
          class_code=null,
          status = null
        } = operation;

        // Execute the stored procedure using Sequelize.
        return await db.sequelize.query(
          `CALL character_scores (
            :query_type,
            :school_id,
            :academic_year,
            :term,
            :section,
            :category,
            :admission_no,
            :student_name,
            :grade,
            :created_by,
            :description,
            :class_name,
            :class_code,
            :id,
            :branch_id)`,
          {
            replacements: {
              query_type,
              school_id: school_id ?? req.user.school_id,
              academic_year,
              term,
              section,
              category,
              admission_no,
              student_name,
              grade,
              created_by,
              description,
              class_name,
              class_code,
              id,
              branch_id: branch_id ?? req.headers['x-branch-id'] ?? req.user.branch_id
            },
            type: db.Sequelize.QueryTypes.RAW
          }
        );
      })
    );

    // Return a consolidated response for all operations.
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing the request."
    });
  }
};
const examRemarks = async (req, res) => {
  try {
    const {
      query_type = null,
      id = null,
      created_by = null,
      admission_no = null,
      academic_year = null,
      term = null,
      remark_type = null,
      remark = null
    } = req.body;

    const result = await db.sequelize.query(
      `CALL exam_remarks(:query_type, :id, :created_by, :admission_no, :academic_year, :term, :remark_type, :remark)`,
      {
        replacements: {
          query_type,
          id,
          created_by,
          admission_no,
          academic_year,
          term,
          remark_type,
          remark
        }
      }
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error executing exam_remarks procedure:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

module.exports = {
  getStudentResult,
  getStudentResults,
  getStudentResultsWithExamType,
  getClassResultsByClassName,
  getClassResults,
  getCharacterScores,
  postCharacterScores,
  examRemarks
};
