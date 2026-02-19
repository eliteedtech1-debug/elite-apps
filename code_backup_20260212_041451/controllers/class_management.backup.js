"use strict";

const db = require("../models");

const handleError = (res, err, message) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: message || "An error occurred while processing your request."
  });
};

const class_management = async (req, res) => {
  const {
    id = 0,
    query_type = "create",
    class_code = null,
    class_name = null,
    description = null,
    max_population = null,
    class_teacher = null,
    section = null,
    branch_id = null,
    school_id = null
  } = req.body;

  try {
    const results = await db.sequelize.query(
      `call class_management(:id,:query_type,:class_code,:class_name,:description,:max_population,:class_teacher,:section,:school_id)`,
      {
        replacements: {
          id,
          query_type,
          class_code,
          class_name,
          description,
          max_population,
          class_teacher,
          section,
          school_id:req.user.school_id
        }
      }
    );
    res.json({
      success: true,
      results,
      message: "Class management action completed."
    });
  } catch (err) {
    handleError(res, err, "Error in class_management.");
  }
};

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

const get_class_management = async (req, res) => {
  const {
    id = 0,
    query_type = "select",
    class_code = null,
    class_name = null,
    description = null,
    max_population = null,
    class_teacher = null,
    section = null,
  } = req.body;

  try {
    const results = await db.sequelize.query(
      `call class_management(:id,:query_type,:class_code,:class_name,:description,:max_population,:class_teacher,:section)`,
      {
        replacements: {
          id,
          query_type,
          class_code,
          class_name, 
          description,
          max_population,
          class_teacher,
          section
        }
      }
    );
    res.json({
      success: true,
      results,
      message: "Class management data fetched successfully."
    });
  } catch (err) {
    handleError(res, err, "Error in get_class_management.");
  }
};

const get_section = async (req, res) => {
    const {
      id = 1, 
      query_type = "select-sections", // Make sure this is set to 'select-sections'
      class_code = null,
      class_name = null,
      description = null,
      max_population = null,
      class_teacher = null,
      section = null
    } = req.body;
  
    try {
      const results = await db.sequelize.query(
        `CALL get_sections('select-sections')`,
        {
          replacements: {
            id: parseInt(id, 10), // Ensure id is an integer (0 if not provided)
            query_type, 
            class_code,
            class_name,
            description,
            max_population,
            class_teacher,
            section
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
      // Ensure both query_type and section are passed to the stored procedure
      const results = await db.sequelize.query(
        `CALL get_section_classes(:query_type, :section, :branch_id, :school_id)`, // Use parameterized query
        {
          replacements: { query_type, section,  branch_id:branch_id??req.user.school_id, school_id:req.user.school_id} // Pass dynamic values as replacements
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
  
  
  
  
module.exports = {
  class_management,
  get_class_management,
  classes,
  get_section,
  get_section_classes
};
