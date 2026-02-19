const bcrypt = require("bcryptjs/dist/bcrypt");
const db = require("../models");

const manageBranches = async (req, res) => {
  const {
    query_type,
    branch_id = null,
    school_id = null,
    branch_name = null,
    location = null,
    short_name = null,
    status = null,
  } = req.body;

  try {
    const results = await db.sequelize.query(
      `CALL manage_branches(
        :query_type, :branch_id,  :school_id, :branch_name, :location, :short_name, :status
      )`,
      {
        replacements: {
          query_type,
          branch_id,
          school_id,
          branch_name,
          location,
          short_name,
          status,
        },
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error managing branches:", err);
    res.status(500).json({
      success: false,
      message: "Error managing branches",
      error: err.message,
    });
  }
};

const branchAdmin = async (req, res) => {
  const {
    name = null,
    phone = null,
    password = null,
    email = null,
    status = null,
    username = null,
    id = null,
  } = req.body;
  const { query_type = "select", branch = null } = req.query;
  const school_id = req.user.school_id;
  if (!password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Password is required and must be a string.",
    });
  }

  // Generate salt and hash the password using bcryptjs
  const saltRounds = 10;
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, saltRounds);
  } catch (err) {
    console.error("Error hashing password:", err);
    return res.status(500).json({
      success: false,
      message: "Error hashing password",
      error: err.message,
    });
  }

  try {
    const results = await db.sequelize.query(
      `CALL branch_admin(
        :query_type, :branch_id, :name, :email, :phone, :password, :username, :school_id, :status, :id
      )`,
      {
        replacements: {
          query_type,
          branch_id: branch,
          name,
          phone,
          password: hashedPassword,
          email,
          username,
          school_id,
          status,
          id,
        },
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error managing branches:", err);
    res.status(500).json({
      success: false,
      message: "Error managing branches",
      error: err.message,
    });
  }
};
const updateBranchAdmin = async (req, res) => {
  const {
    name = null,
    phone = null,
    password = null,
    email = null,
    username = null,
    status = null,
  } = req.body;
  const { query_type = "select", branch = null, id = null } = req.query;
  const school_id = req.user.school_id;

  try {
    const results = await db.sequelize.query(
      `CALL branch_admin(
        :query_type, :branch_id, :name, :email, :phone, :password, :username, :school_id, :status, :id
      )`,
      {
        replacements: {
          query_type,
          branch_id: branch,
          name,
          phone,
          password,
          email,
          username,
          school_id,
          status,
          id,
        },
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error managing branches:", err);
    res.status(500).json({
      success: false,
      message: "Error managing branches",
      error: err.message,
    });
  }
};

const getBranchAdmin = async (req, res) => {
  const {
    name = null,
    phone = null,
    password = null,
    email = null,
    username = null,
    status = null,
    id = null,
  } = req.body;
  const { query_type = "select", branch = null } = req.query;
  const school_id = req.user.school_id;

  try {
    const results = await db.sequelize.query(
      `CALL branch_admin(
        :query_type, :branch_id, :name, :email, :phone, :password, :username, :school_id, :status, :id
      )`,
      {
        replacements: {
          query_type,
          branch_id: branch,
          name,
          phone,
          password,
          email,
          username,
          school_id,
          status,
          id,
        },
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error managing branches:", err);
    res.status(500).json({
      success: false,
      message: "Error managing branches",
      error: err.message,
    });
  }
};

const attendanceSetup = async (req, res) => {
  const {
    query_type = "select",
    allow_backdated_attendance = null,
    backdated_days = null,
  } = req.body;

  const school_id = req.user.school_id;
  const branch_id = req.user.branch_id || req.headers['x-branch-id'] || null;

  try {
    const results = await db.sequelize.query(
      `CALL attendance_setup(
        :query_type, :school_id, :branch_id, :allow_backdated_attendance, :backdated_days
      )`,
      {
        replacements: {
          query_type,
          school_id,
          branch_id,
          allow_backdated_attendance,
          backdated_days,
        },
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error in attendance setup:", err);
    res.status(500).json({
      success: false,
      message: "Error in attendance setup",
      error: err.message,
    });
  }
};

const updateBranchSettings = async (req, res) => {
  const { branch_id } = req.params;
  const { enable_ca_auto_lock } = req.body;
  try {
    await db.sequelize.query(
      `UPDATE school_locations SET enable_ca_auto_lock = :enable_ca_auto_lock WHERE branch_id = :branch_id`,
      { replacements: { enable_ca_auto_lock, branch_id }, type: db.sequelize.QueryTypes.UPDATE }
    );
    res.json({ success: true, message: 'Branch settings updated' });
  } catch (err) {
    console.error("Error updating branch settings:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  manageBranches,
  branchAdmin,
  getBranchAdmin,
  updateBranchAdmin,
  attendanceSetup,
  updateBranchSettings
};
