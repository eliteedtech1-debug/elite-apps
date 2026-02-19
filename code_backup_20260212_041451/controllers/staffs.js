const bcrypt = require("bcryptjs/dist/bcrypt");
const db = require("../models");
const moment = require("moment");

const staff = async (req, res) => {
  const {
    id = null,
    query_type = null,
    name = null,
    sex = null,
    age = null,
    address = null,
    date_of_birth = null,
    marital_status = null,
    state_of_origin = null,
    mobile_no = null,
    email = null,
    qualification = null,
    working_experience = null,
    religion = null,
    last_place_of_work = null,
    do_you_have = null,
    when_do = null,
    account_name = null,
    account_number = null,
    bank = null,
    passport_url = "",
    school_id = null,
    user_type = null,
    staff_type = null,
    staff_role = null,
    branch_id = null,
    password = null,
    staffSubjects = [],
    staffRoles = [],
  } = req.body;

  if (!password && query_type === "create") {
    return res.status(400).json({
      success: false,
      message: "Password is required and must be a string.",
    });
  }
  const saltRounds = 10;
  let hashedPassword = null;
  if (password) {
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
  }

  db.sequelize
    .query(
      `call staff(:query_type,:id,:name,:sex,:age,:address,:date_of_birth,:marital_status,:state_of_origin,:mobile_no,:email,:qualification,:user_type,:staff_type,:staff_role,:working_experience,:religion,:last_place_of_work,:do_you_have,:when_do,:account_name,:account_number,:bank,:passport_url,:branch_id,:school_id,:password)`,
      {
        replacements: {
          id,
          query_type,
          name,
          sex,
          age: age !== "" ? age : null,
          address,
          date_of_birth:
            date_of_birth !== "Invalid date" && date_of_birth !== ""
              ? moment(date_of_birth).format("YYYY-MM-DDTHH", "YYYY-MM-DD")
              : null,
          marital_status,
          state_of_origin,
          mobile_no,
          email,
          qualification,
          user_type,
          staff_type,
          staff_role,
          working_experience,
          religion,
          last_place_of_work,
          do_you_have,
          when_do: when_do !== "" ? when_do : null,
          account_name,
          account_number,
          bank,
          passport_url,
          branch_id: (branch_id ?? req.user.branch_id) || "",
          school_id: req.user.school_id,
          password: hashedPassword,
        },
      }
    )
    .then((results) => {
      console.log({ results });

        const staffSubjects2 = staffSubjects.length
        ? staffSubjects.filter((element) => {
            return element.role !== 'Form Master';
          })
        : [];
      
      const promises = staffSubjects2.length
        ? staffSubjects2.map((element) => {
            const {
              query_type = "create",
              id = 0,
              class_code = null,
              subject = null,
              subject_code = null,
              class_name = null,
            } = element;

            console.log('Calling staff_classes with:', {
              query_type,
              id,
              staff_id: results[0]?.staff_id || element.staff_id,
              subject,
              subject_code,
              class_name,
              class_code
            });
            
            return db.sequelize.query(
              `CALL staff_classes (
                :query_type,
                :id,
                :staff_id,
                :subject,
                :subject_code,
                :class_name,
                :class_code)`,
              {
                replacements: {
                  query_type,
                  id,
                  staff_id: results[0]?.staff_id
                    ? results[0]?.staff_id
                    : element.staff_id,
                  subject,
                  subject_code,
                  class_name,
                  class_code,
                },
              }
            );
          })
        : [];

        const staffRoles1 = staffSubjects.length
        ? staffSubjects.filter((element) => {
            return element.role === 'Form Master';
          })
        : [];
      
      Promise.all(promises)
        .then((results2) => {
          if (staffRoles1.length) {
            return db.sequelize.query(
              `CALL class_role(:query_type,:class_role_id,:staff_id,:section_id,:class_code,:role)`,
              {
                replacements: {
                  class_role_id: staffRoles1[0]?.class_role_id || null,
                  staff_id: results[0].staff_id,
                  section_id: staffRoles1[0]?.section_id || "",
                  class_code: staffRoles1[0]?.class_code || "",
                  role: staffRoles1[0]?.role || "",
                  query_type: staffRoles1[0]?.query_type ?? "create",
                },
              }
            );
          } else {
            return Promise.resolve();
          }
          return [];
        })
        .then((results3) => {
          res.json({ success: true, results });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            success: false,
            message: "Error processing staff subjects or roles",
          });
        });
    })
    .catch((err) => {
      console.log(err);
      res
        .status(500)
        .json({ success: false, message: "Error processing staff data" });
    });
};

const get_staff = async (req, res) => {
  const {
    id = null,
    query_type = null,
    name = null,
    sex = null,
    age = null,
    address = null,
    date_of_birth = null,
    marital_status = null,
    state_of_origin = null,
    mobile_no = null,
    email = null,
    qualification = null,
    user_type = null,
    staff_type = null,
    staff_role = null,
    working_experience = null,
    religion = null,
    last_place_of_work = null,
    do_you_have = null,
    when_do = null,
    account_name = null,
    account_number = null,
    bank = null,
    passport_url = "",
    school_id = null,
    branch_id = null,
    password = null,
    staffSubjects = [],
    staffRoles = [],
  } = req.query;

  db.sequelize
    .query(
      `call staff(:query_type,:id,:name,:sex,:age,:address,:date_of_birth,:marital_status,:state_of_origin,:mobile_no,:email,:qualification,
        :user_type,:staff_type,:staff_role,:working_experience,:religion,:last_place_of_work,:do_you_have,:when_do,:account_name,:account_number,:bank,:passport_url,:branch_id,:school_id,:password)`,
      {
        replacements: {
          id,
          query_type,
          name,
          sex,
          age: age !== "" ? age : null,
          address,
          date_of_birth: date_of_birth !== "" ? date_of_birth : null,
          marital_status,
          state_of_origin,
          mobile_no,
          email,
          qualification,
          user_type,
          staff_type,
          staff_role,
          working_experience,
          religion,
          last_place_of_work,
          do_you_have,
          when_do: when_do !== "" ? when_do : null,
          account_name,
          account_number,
          bank,
          branch_id: (branch_id ?? req.user.branch_id) || "",
          school_id: req.user.school_id,
          password,
          passport_url,
        },
      }
    )
    .then((results) => {
      res.json({ success: true, data: results });
    })
    .catch((err) => {
      console.log(err);
      res
        .status(500)
        .json({ success: false, message: "error getting staff data" });
    });
};

const staffSubjects = (req, res) => {
  const data = Array.isArray(req.body) ? req.body : [req.body];

  const promises = data.map((element) => {
    const {
      query_type = "create",
      id = 0,
      staff_id = 0,
      subject = null,
      class_name = null,
      section = null,
      class_code = null,
      branch_id = null,
    } = element;

    return db.sequelize.query(
      `CALL staff_classes (
        :query_type,
        :id,
        :staff_id,
        :subject,
        :section,
        :class_name,
        :class_code,
        :branch_id,
        :school_id)`,
      {
        replacements: {
          query_type,
          id,
          staff_id,
          subject,
          section,
          class_name,
          class_code,
          branch_id: branch_id ?? req.user.branch_id,
          school_id: req.user.school_id,
        },
      }
    );
  });

  Promise.all(promises)
    .then((results) => {
      res.json({ success: true, data: results });
    })
    .catch((err) => {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Error processing staff subjects" });
    });
};

const getStaffDetails = (query_type, staff_id, res) => {
  const query = `CALL get_all_staff_details(:query_type, :staff_id)`;

  db.sequelize
    .query(query, {
      replacements: {
        query_type,
        staff_id: staff_id || null,
      },
    })
    .then((results) => {
      if (results && results[0]) {
        res.json({ success: true, data: results[0] });
      } else {
        res
          .status(404)
          .json({ success: false, message: "No staff details found." });
      }
    })
    .catch((err) => {
      console.error("Database error: ", err);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching staff details.",
      });
    });
};

const getStaffDetailsBySchoolId = async (req, res) => {
  try {
    const { school_id, query_type, staff_id = null } = req.body;

    if (!school_id || !query_type) {
      return res.status(400).json({
        success: false,
        message: "School ID and query type ('all' or 'one') are required.",
      });
    }

    if (query_type !== "all" && query_type !== "one") {
      return res.status(400).json({
        success: false,
        message: "Invalid query type. Use 'all' or 'one'.",
      });
    }

    const query = `CALL get_staff_details_by_school_id(:school_id, :query_type, :staff_id)`;

    const replacements = {
      school_id,
      query_type,
      staff_id: query_type === "one" ? staff_id : null,
    };

    const [results] = await db.sequelize.query(query, { replacements });

    if (!results.length) {
      return res.status(404).json({
        success: false,
        message: "No staff details found for the specified criteria.",
      });
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching staff details:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching staff details.",
    });
  }
};

module.exports = {
  staff,
  staffSubjects,
  getStaffDetails,
  getStaffDetailsBySchoolId,
  get_staff,
};