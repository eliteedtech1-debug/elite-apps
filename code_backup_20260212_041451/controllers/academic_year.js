const db = require("../models");

const CreateAcademicYear = async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : [req.body];

    // console.log("Received data:", data);
    const promises = data.map((element) => {
      const {
        query_type = "",
        id = "",
        term = "",
        year = "",
        begin_date = null,
        end_date = null,
        status = "",
        total_weeks = null,
        branch_id = null,
        school_id = null,
      } = element;
      console.log(element);
      return db.sequelize.query(
        `Call academic_year( 
      :query_type,
      :id,
      :term,
      :year ,
      :begin_date ,
      :end_date,
      :status,
      :total_weeks,
      :branch_id,
      :school_id )`,
        {
          replacements: {
            query_type,
            branch_id: branch_id ?? req.user.branch_id,
            school_id: school_id || req.user.school_id,
            id,
            term,
            year,
            begin_date,
            end_date,
            status,
            total_weeks,
          },
        }
      );
    });
    const results = await Promise.all(promises);
    console.log("Procedure results:", results);

    res.json({
      success: true,
      message: "Created successfully",
      result: results.flat(),
    });
  } catch (error) {
    console.error(error);

    // Check if it's a duplicate entry error
    if (error.original && error.original.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: `The academic year '${element.year}' and term '${element.term}' already exist.`,
      });
    }

    res.status(500).json({
      success: false,
      message: "An error occurred while creating the academic year.",
    });
  }
};

const getAcademicYear = async (req, res) => {
  const {
    id = "",
    term = "",
    year = "",
    begin_date = null,
    end_date = null,
    status = "",
    total_weeks = null,
    branch_id = null,
    school_id = null, // Accept school_id from query for super admin
  } = req.query;

  const { query_type = "select" } = req.query;
  console.log(req.query + " returning");
  try {
    const results = await db.sequelize.query(
      `Call academic_year(
      :query_type,
      :id,
      :term,
      :year ,
      :begin_date ,
      :end_date,
      :status,
      :total_weeks,
      :branch_id,
      :school_id)`,
      {
        replacements: {
          query_type,
          branch_id: branch_id ?? req.user?.branch_id,
          school_id: school_id ?? req.user?.school_id, // Use query param if provided
          id,
          term,
          year,
          begin_date,
          end_date,
          status,
          total_weeks,
        },
      }
    );

    res.json({
      success: true,
      message: "Created successfully",
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the student details.",
    });
  }
};
const updateAcademicYear = async (req, res) => {
  const {
    id = "",
    term = "",
    year = "",
    begin_date = null,
    end_date = null,
    status = "",
    total_weeks = null,
    branch_id = null,
    query_type = "update",
  } = req.body;

  console.log(req.query + " returning");
  try {
    const results = await db.sequelize.query(
      `Call academic_year( 
      :query_type,
    :id,
     :term,
    :year ,
    :begin_date ,
    :end_date,
    :status,
    :total_weeks,
    :branch_id,
    :school_id
    )`,
      {
        replacements: {
          query_type,
          school_id: req.user.school_id,
          branch_id: branch_id ?? req.user.branch_id,
          id,
          term,
          year,
          begin_date,
          end_date,
          status,
          total_weeks,
        },
      }
    );

    res.json({
      success: true,
      message: "Created successfully",
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the student details.",
    });
  }
};

const termsSetup = async (req, res) => {
  const {
    query_type = "select",
    school_id = "",
    term = "",
    year = "",
    begin_date = "",
    end_date = "",
    status = "",
  } = req.body;

  try {
    const results = await db.sequelize.query(
      `Call termsSetup( 
      :query_type,
      :school_id,
      :term,
      :year,
      :begin_date ,
      :end_date,
      :status )`,
      {
        replacements: {
          query_type,
          school_id: req.user.school_id,
          term,
          year,
          begin_date,
          end_date,
          status,
        },
      }
    );

    res.json({
      success: true,
      message: "Created successfully",
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the student details.",
    });
  }
};

module.exports = {
  CreateAcademicYear,
  getAcademicYear,
  updateAcademicYear,
  termsSetup,
};
