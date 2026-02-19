const bcrypt = require("bcryptjs");
const db = require("../models");
const moment = require("moment");
const { Sequelize } = db;
const logger = require("../logging/Logger");

const teachers = async (req, res) => {
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
    teacherSubjects = [],
    teacherRoles = [],
  } = req.body;

  if (query_type === 'create') {

    console.log("Calling Create teachers stored procedure...");
    try {
        const [existingUser] = await db.sequelize.query(
            `SELECT id FROM users WHERE (email = :email OR phone = :mobile_no) AND school_id = :school_id AND branch_id = :branch_id LIMIT 1`,
            {
                replacements: { email, mobile_no, school_id: school_id || req.user?.school_id, branch_id },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email or phone number already exists in this branch."
            });
        }
    } catch (checkError) {
        console.error("Error checking for existing teacher", { error: checkError });
        return res.status(500).json({ success: false, message: "Error checking for existing user." });
    }
  }

  if (!password && query_type === "create") {
    return res.status(400).json({
      success: false,
      message: "Password is required and must be a string.",
    });
  }

  const saltRounds = 10;
  let hashedPassword = null;
  if (password) {
    hashedPassword = await bcrypt.hash(password, saltRounds);
  }

  const t = await db.sequelize.transaction(); // 🔥 start transaction

  try {
    console.log("Calling teachers stored procedure...");

    // Verify the database connection is healthy before proceeding
    try {
      await db.sequelize.authenticate();
      console.log("✅ Database connection is healthy");
    } catch (authErr) {
      console.error("❌ Database connection is not healthy:", authErr.message);
      throw new Error("Database connection is not available");
    }

    // Log the data being sent to troubleshoot
    console.log("Teachers procedure data:", {
      id, query_type, name, sex, age, address, date_of_birth,
      marital_status, state_of_origin, mobile_no, email, qualification,
      user_type, staff_type, staff_role, working_experience, religion,
      last_place_of_work, do_you_have, when_do, account_name,
      account_number, bank, passport_url,
      branch_id: req.headers['x-branch-id'] || req.body.branch_id || branch_id || req.user?.branch_id,
      school_id: school_id || req.user?.school_id || req.headers['x-school-id'] || req.body.school_id
    });

    // 1. Call the main teachers stored procedure
    const teacherResult = await db.sequelize.query(
      `CALL teachers(:query_type,:id,:name,:sex,:age,:address,:date_of_birth,:marital_status,:state_of_origin,:mobile_no,:email,:qualification,:user_type,:staff_type,:staff_role,:working_experience,:religion,:last_place_of_work,:do_you_have,:when_do,:account_name,:account_number,:bank,:passport_url,:branch_id,:school_id,:password)`,
      {
        replacements: {
          id: id || null,
          query_type,
          name,
          sex: sex || null,
          age: age !== "" && age !== undefined ? age : null,
          address: address || null,
          date_of_birth:
            date_of_birth && date_of_birth !== "Invalid date" && date_of_birth !== ""
              ? (() => {
                  const parsedDate = moment(date_of_birth);
                  if (!parsedDate.isValid()) {
                    throw new Error(`Invalid date format for date_of_birth: ${date_of_birth}`);
                  }
                  if (parsedDate.isAfter(moment())) {
                    throw new Error(`Date of birth cannot be in the future: ${date_of_birth}`);
                  }
                  return parsedDate.format("YYYY-MM-DD");
                })()
              : null,
          marital_status: marital_status || null,
          state_of_origin: state_of_origin || null,
          mobile_no,
          email,
          qualification: qualification || null,
          user_type: user_type || 'Teacher', // Ensure user_type has a default
          staff_type: staff_type || null,
          staff_role: staff_role || null,
          working_experience: working_experience || null,
          religion: religion || null,
          last_place_of_work: last_place_of_work || null,
          do_you_have: do_you_have || null,
          when_do: when_do !== "" && when_do !== undefined ? when_do : null,
          account_name: account_name || null,
          account_number: account_number || null,
          bank: bank || null,
          passport_url: passport_url || "",
          // Ensure branch_id is set from request body, user object, or headers (in priority order)
          branch_id: req.headers['x-branch-id'] || req.body.branch_id || branch_id || req.user?.branch_id || null,
          school_id: school_id || req.user?.school_id || req.headers['x-school-id'] || req.body.school_id,
          password: hashedPassword,
        },
        type: db.sequelize.QueryTypes.RAW, // Use RAW type to get the exact results
        transaction: t, // ✅ include in transaction
      }
    );
    let teacher_id;
    if(query_type.toLowerCase() !== 'create') {
      teacher_id = req.body.teacher_id;
    } else {
      // Handle different possible return formats from the stored procedure
      if (Array.isArray(teacherResult) && teacherResult[0] && Array.isArray(teacherResult[0]) && teacherResult[0][0]) {
        // Format might be [ [ { teacher_id: someValue } ], [...], [...] ]
        const firstResult = teacherResult[0];
        if (firstResult.length > 0 && firstResult[0].teacher_id !== undefined) {
          teacher_id = firstResult[0].teacher_id;
        } else if (firstResult.length > 0 && Object.keys(firstResult[0]).includes('teacher_id')) {
          // Looking at the first object in the result
          teacher_id = firstResult[0].teacher_id || firstResult[0].id || null;
        }
      } else if (teacherResult && teacherResult[0]) {
        // Alternative format like [ { teacher_id: someValue }, other_results... ]
        const firstObject = Array.isArray(teacherResult[0]) ? teacherResult[0][0] : teacherResult[0];
        teacher_id = firstObject.teacher_id || firstObject.id || null;
      }

      // If still no teacher_id found, log for debugging
      if (!teacher_id) {
        console.log("DEBUG: teacherResult structure:", JSON.stringify(teacherResult, null, 2));
      }
    }
    if (!teacher_id) throw new Error("Teacher insert failed");

    // 2. Insert teacher subjects
    for (let i = 0; i < teacherSubjects.length; i++) {
      const element = teacherSubjects[i];
      const {
        query_type = "create",
        id = 0,
        subject = null,
        subject_code = null,
        class_name = null,
        class_code = null,
      } = element;

      try {
        await db.sequelize.query(
          `CALL teacher_classes(:query_type, :in_id, :in_teacher_id, :in_subject, :in_subject_code, :in_class_name, :in_class_code)`,
          {
            replacements: {
              query_type,
              in_id: id,
              in_teacher_id: teacher_id,
              in_subject: subject,
              in_subject_code: subject_code,
              in_class_name: class_name,
              in_class_code: class_code,
            },
            transaction: t, // ✅ include in transaction
          }
        );
      } catch (subjectError) {
        console.error("Error inserting teacher subject:", {
          subject_data: element,
          error: subjectError.message,
          teacher_id: teacher_id,
          sql_error: subjectError.sqlMessage || subjectError.parent?.sqlMessage
        });
        throw subjectError;
      }
    }

    // 3. Insert teacher roles
    for (let i = 0; i < teacherRoles.length; i++) {
      const element = teacherRoles[i];
      const {
        query_type = "create",
        class_role_id = null,
        section = null,
        class_name = null,
        class_code = null,
        role = null,
      } = element;

      try {
        await db.sequelize.query(
          `CALL class_role(:query_type, :class_role_id, :teacher_id, :section_id, :class_code, :role, :class_name, :school_id)`,
          {
            replacements: {
              query_type,
              class_role_id,
              teacher_id,
              section_id: section,
              class_code,
              role,
              class_name,
              school_id: school_id || req.user?.school_id || req.headers['x-school-id'],
            },
            transaction: t, // ✅ include in transaction
          }
        );
      } catch (roleError) {
        console.error("Error inserting teacher role:", {
          role_data: element,
          error: roleError.message,
          teacher_id: teacher_id,
          sql_error: roleError.sqlMessage || roleError.parent?.sqlMessage
        });
        throw roleError;
      }
    }

    // ✅ Commit everything if no errors
    await t.commit();

    res.json({
      success: true,
      teacher_id,
      subjects_added: teacherSubjects.length,
      roles_added: teacherRoles.length,
      message: `Teacher created successfully with ${teacherSubjects.length} subjects and ${teacherRoles.length} roles`,
    });
  } catch (err) {
    // ❌ Rollback everything if any error
    await t.rollback();

    // Log the error with more specific details
    console.error("Teachers procedure error details:", {
      error_message: err.message,
      error_original: err.original,
      error_sql: err.sql || (err.parent && err.parent.sql),
      error_sql_state: err.sqlState || (err.parent && err.parent.sqlState),
      error_code: err.code || (err.parent && err.parent.code),
      error_errno: err.errno || (err.parent && err.parent.errno),
      error_sql_message: err.sqlMessage || (err.parent && err.parent.sqlMessage),
      request_body: req.body,
      error_stack: err.stack
    });

    // Use the custom logger with more detailed information
    logger.error("Error processing teacher data", {
        original_error: err.original,
        fields: err.fields,
        errors: err.errors,
        request_body: req.body,
        error_message: err.message,
        error_stack: err.stack,
        sql_error: err.sqlMessage || err.parent?.sqlMessage,
        sql_state: err.sqlState || err.parent?.sqlState,
        error_code: err.code || err.parent?.code,
        error_errno: err.errno || err.parent?.errno,
        sql_query: err.sql || err.parent?.sql
    });

    res.status(500).json({
      success: false,
      message: "Error processing teacher data",
      error: "Validation error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      original_error: process.env.NODE_ENV === 'development' && err.original ? err.original : undefined,
      error_fields: process.env.NODE_ENV === 'development' && err.fields ? err.fields : undefined,
      sql_error: process.env.NODE_ENV === 'development' && (err.sqlMessage || err.parent?.sqlMessage),
      error_code: process.env.NODE_ENV === 'development' && (err.code || err.parent?.code),
      sql_state: process.env.NODE_ENV === 'development' && (err.sqlState || err.parent?.sqlState)
    });
  }
};




const get_teachers = async (req, res) => {
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
    password = null,
    class_code = null,
  } = req.query;

  const school_id = req.headers['x-school-id'] || req.query.school_id || req.user?.school_id;
  const branch_id = req.headers['x-branch-id'] || req.query.branch_id || req.user?.branch_id;

  console.log(`[get_teachers] Resolved school_id: ${school_id}, branch_id: ${branch_id}`);

  if (!school_id) {
    return res.status(400).json({ success: false, message: "Could not determine school ID." });
  }
  if (!branch_id) {
    return res.status(400).json({ success: false, message: "Could not determine branch ID." });
  }

  // Handle class-teacher query type
  if (query_type === 'class-teacher' && class_code) {
    try {
      const [teacher] = await db.sequelize.query(
        `SELECT t.*, u.digital_signature 
         FROM class_role cr
         JOIN teachers t ON cr.teacher_id = t.id
         LEFT JOIN users u ON t.user_id = u.id
         WHERE cr.class_code = :class_code 
           AND cr.role = 'Form Master'
           AND cr.school_id = :school_id
           AND t.status = 'Active'
           AND (t.is_deleted IS NULL OR t.is_deleted = 0)
         LIMIT 1`,
        {
          replacements: { class_code, school_id },
          type: db.sequelize.QueryTypes.SELECT,
        }
      );
      return res.json({ success: true, data: teacher || {} });
    } catch (err) {
      console.error('[get_teachers] Error fetching class teacher:', err);
      return res.status(500).json({ success: false, message: "Error getting class teacher" });
    }
  }

  try {
    console.log('[get_teachers] Calling "teachers" stored procedure...');
    const teachersData = await db.sequelize.query(
      `call teachers(:query_type,:id,:name,:sex,:age,:address,:date_of_birth,:marital_status,:state_of_origin,:mobile_no,:email,:qualification,
         :user_type,:staff_type,:staff_role,:working_experience,:religion,:last_place_of_work,:do_you_have,:when_do,:account_name,:account_number,:bank,:passport_url,:branch_id,:school_id,:password)`,
      {
        replacements: {
          id, query_type, name, sex,
          age: age !== "" ? age : null,
          address,
          date_of_birth: date_of_birth !== "" ? date_of_birth : null,
          marital_status, state_of_origin, mobile_no, email, qualification,
          user_type, staff_type, staff_role, working_experience, religion,
          last_place_of_work, do_you_have,
          when_do: when_do !== "" ? when_do : null,
          account_name, account_number, bank,
          branch_id: branch_id || "",
          school_id: school_id,
          password, passport_url,
        },
        type: db.sequelize.QueryTypes.RAW,
      }
    );
    console.log(`[get_teachers] Stored procedure returned ${teachersData?.length || 0} teachers.`);

    console.log('[get_teachers] Fetching Form Master assignments...');
    const formMasterAssignments = await db.sequelize.query(
      `SELECT cr.teacher_id, cr.class_code, cr.class_name 
       FROM class_role cr 
       JOIN classes c ON cr.class_code = c.class_code AND cr.school_id = c.school_id
       WHERE cr.role = 'Form Master' 
         AND cr.school_id = :school_id 
         AND c.branch_id = :branch_id`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );
    console.log(`[get_teachers] Found ${formMasterAssignments?.length || 0} Form Master assignments.`);

    let teachersWithRoles = [];
    try {
      console.log('[get_teachers] Merging roles with teacher data...');
      if(Array.isArray(teachersData)) {
        teachersWithRoles = teachersData
          .filter(teacher => teacher.is_deleted !== 1) // Filter out soft-deleted teachers
          .map(teacher => {
            const masterRoles = formMasterAssignments.filter(assignment => assignment.teacher_id === teacher.id);
            return {
              ...teacher,
              form_master_roles: masterRoles,
              is_form_master: masterRoles.length > 0,
              form_master_classes: masterRoles.map(r => r.class_name).join(', '),
            };
          });
        console.log('[get_teachers] Merging complete.');
      } else {
        console.warn('[get_teachers] teachersData is not an array, skipping merge.');
      }
    } catch (mergeError) {
      console.error('[get_teachers] Error during data merging:', mergeError);
      // Decide if you want to throw or just log. For now, we'll let it proceed to the catch block.
      throw mergeError;
    }


    res.json({ success: true, data: teachersWithRoles });
  } catch (err) {
    console.error('[get_teachers] Caught error:', err);
    res.status(500).json({ success: false, message: "Error getting teacher data" });
  }
};

const getTeacherClassesAndRoles = async (req, res) => {
  const school_id = req.user.school_id;
  const isTeacher = req.user.user_type.toLowerCase() === "teacher";
  const requestedTeacherId = req.query.teacher_id;
  
  // Determine the teacher_id to use based on the request
  let teacherId;
  if (isTeacher && !requestedTeacherId) {
    // For teacher users without specific teacher_id in query, find their teacher record via user_id
    const [teacher] = await db.sequelize.query(
      `SELECT id FROM teachers WHERE user_id = :user_id AND school_id = :school_id`,
      {
        replacements: { user_id: req.user.id, school_id },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    if (!teacher) {
      return res.status(404).json({
        success: false,
        msg: "Teacher record not found for this user.",
      });
    }
    teacherId = teacher.id;
  } else {
    // For non-teachers or when a specific teacher_id is provided
    teacherId = requestedTeacherId;
  }
  
  console.log({ teacherId, REQ_USER: req.user, requestedTeacherId, isTeacher });

  // If not a teacher and no specific teacher_id provided, return all classes in school
  if (!isTeacher && !teacherId) {
    const teacherClasses = await db.sequelize.query(
      `SELECT c.* 
          FROM classes c
          WHERE c.branch_id = :branch_id
            AND c.status = 'Active'
            AND (
              c.parent_id IS NOT NULL
              OR NOT EXISTS (
                SELECT 1 FROM classes child 
                WHERE child.parent_id = c.class_code
              )
            )
       AND school_id = :school_id`,
      {
        replacements: { school_id, branch_id: req.user.branch_id||req.headers['x-branch-id'] },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    // Fixed: was querying subjects table, should query teacher_classes
    const teacherRoles = await db.sequelize.query(
      `SELECT tc.*, c.class_name
       FROM active_teacher_classes tc 
       INNER JOIN classes c ON tc.class_code = c.class_code
       WHERE tc.school_id = :school_id`,
      {
        replacements: { school_id },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    return res.json({
      success: true,
      data: {
        teacher_classes: teacherClasses,
        teacher_roles: teacherRoles,
      },
    });
  }

  try {
    // Verify that the teacher exists
    const [teacher] = await db.sequelize.query(
      `SELECT id FROM teachers WHERE id = :teacher_id AND school_id = :school_id`,
      {
        replacements: { teacher_id: teacherId, school_id },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    // If no teacher found, return error
    if (!teacher) {
      return res.status(404).json({
        success: false,
        msg: "Teacher record not found.",
      });
    }

    // Fetch classes assigned to this specific teacher
    const teacherClasses = await db.sequelize.query(
      `SELECT tc.*, c.section FROM active_teacher_classes tc
        INNER JOIN classes c ON tc.class_code = c.class_code
       WHERE tc.teacher_id = :teacher_id AND tc.school_id = :school_id`,
      {
        replacements: { teacher_id: teacherId, school_id },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    // Fetch roles assigned to this specific teacher
    const teacherRoles = await db.sequelize.query(
      `SELECT cr.*, cl.class_name
       FROM class_role cr 
       LEFT JOIN classes cl ON cr.class_code = cl.class_code 
       WHERE cr.teacher_id = :teacher_id AND cr.school_id = :school_id`,
      {
        replacements: { teacher_id: teacherId, school_id },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    return res.json({
      success: true,
      data: {
        teacher_classes: teacherClasses,
        teacher_roles: teacherRoles,
      },
    });
  } catch (error) {
    console.error("Error in getTeacherClassesAndRoles:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch teacher class and role data.",
      error: error.message,
    });
  }
};

const teacherSubjects = (req, res) => {
  // This function seems to be a standalone endpoint for teacher subjects.
  // The main 'teachers' endpoint now handles subject assignments as part of staff creation.
  // If this is still needed as a separate endpoint for updates, it should be adjusted.
  // For now, keeping it as is, but noting its redundancy with the main 'teachers' endpoint's new logic.

  const data = Array.isArray(req.body) ? req.body : [req.body];
  const promises = data.map((element) => {
    const {
      query_type = "create",
      id = 0,
      teacher_id = 0,
      subject = null,
      class_name = null,
      section = null,
      class_code = null,
      branch_id = null,
      subject_code = null, // Added subject_code
    } = element;
    return db.sequelize.query(
      `CALL teacher_classes (
        :query_type,
        :id,
        :teacher_id,
        :subject,
        :subject_code,
        :class_name,
        :class_code,
        :section,
        :branch_id,
        :school_id
      )`,
      {
        replacements: {
          query_type,
          id,
          teacher_id,
          subject,
          subject_code,
          class_name,
          class_code,
          section,
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
        .json({ success: false, message: "Error processing teacher subjects" });
    });
};

const getTeacherDetails = (query_type, teacher_id, res) => {
  const query = `CALL get_all_teacher_details(:query_type, :teacher_id)`;
  db.sequelize
    .query(query, {
      replacements: {
        query_type,
        teacher_id: teacher_id || null,
      },
    })
    .then((results) => {
      if (results && results[0]) {
        res.json({ success: true, data: results[0] });
      } else {
        res
          .status(404)
          .json({ success: false, message: "No teacher details found." });
      }
    })
    .catch((err) => {
      console.error("Database error: ", err);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching teacher details.",
      });
    });
};

const getTeacherDetailsBySchoolId = async (req, res) => {
  try {
    const { school_id, query_type, teacher_id = null } = req.body;
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
    const query = `CALL get_teacher_details_by_school_id(:school_id, :query_type, :teacher_id)`;
    const replacements = {
      school_id,
      query_type,
      teacher_id: query_type === "one" ? teacher_id : null,
    };
    const [results] = await db.sequelize.query(query, { replacements });
    if (!results.length) {
      return res.status(404).json({
        success: false,
        message: "No teacher details found for the specified criteria.",
      });
    }
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching teacher details:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching teacher details.",
    });
  }
};
const getTeacherDashboard = async (req, res) => {
  try {
    const query_type = req.query.query_type || "summary"; // summary | lessons | assignments
    const teacher_id = req.query.teacher_id; // default to logged-in teacher
    const branch_id = req.query.branch_id || req.user.branch_id;
    const school_id = req.query.school_id || req.user.school_id;
    const academic_year =
      req.query.academic_year || req.headers["x-academic-year"] || null;
    const term = req.query.term || req.headers["x-term"] || null;
    console.log(
      query_type,
      teacher_id,
      branch_id,
      school_id,
      academic_year,
      term
    );
    const results = await db.sequelize.query(
      `CALL teacher_dashboard_summary(:query_type,:teacher_id,:branch_id,:school_id,:academic_year,:term)`,
      {
        replacements: {
          query_type,
          teacher_id,
          branch_id,
          school_id,
          academic_year,
          term,
        },
      }
    );

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching teacher dashboard summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch teacher dashboard summary",
      error: error.message,
    });
  }
};

const checkTeacherExistence = async (req, res) => {
  const { email, phone } = req.query;
  const school_id = req.user.school_id;

  if (!email && !phone) {
    return res.status(400).json({
      success: false,
      message: "Email or mobile number is required for checking.",
    });
  }

  try {
    let query =
      "SELECT email,phone FROM users WHERE school_id = :school_id AND (";
    const replacements = { school_id };

    if (email) {
      query += "email = :email";
      replacements.email = email;
    }

    if (phone) {
      if (email) query += " OR ";
      query += "phone = :phone";
      replacements.phone = phone;
    }

    query += ")";

    const existingTeacher = await db.sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });
    console.log(existingTeacher)

    if (existingTeacher.length > 0) {
      const found = existingTeacher[0];
      if (email && found.email === email) {
        return res.json({ exists: true, message: "Email already exists." });
      }
      if (phone && found.phone === phone) {
        return res.json({
          exists: true,
          message: "Mobile number already exists.",
        });
      }
    }

    return res.json({ exists: false });
  } catch (error) {
    console.error("Error checking teacher existence:", error);
    res.status(500).json({
      success: false,
      message: "Error checking teacher existence",
      error: error.message,
    });
  }
};

// Bulk upload teachers from frontend validated data
const bulkUploadTeachers = async (req, res) => {
  const { teachers, school_id, branch_id } = req.body;

  if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Teachers array is required and must not be empty.",
    });
  }

  const saltRounds = 10;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  const t = await db.sequelize.transaction();

  try {
    // Check for existing emails and phone numbers in the database
    const emails = teachers.map(teacher => teacher.email.toLowerCase());
    const phones = teachers.map(teacher => teacher.mobile_no);

    const existingTeachers = await db.sequelize.query(
      `SELECT email, mobile_no FROM teachers WHERE school_id = :school_id AND (email IN (:emails) OR mobile_no IN (:phones))`,
      {
        replacements: {
          school_id: school_id || req.user.school_id,
          emails,
          phones
        },
        type: Sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    const existingEmails = new Set(existingTeachers.map(t => t.email));
    const existingPhones = new Set(existingTeachers.map(t => t.mobile_no));

    // Process each teacher
    for (let i = 0; i < teachers.length; i++) {
      const teacherData = teachers[i];
      
      try {
        // Check for duplicates
        if (existingEmails.has(teacherData.email.toLowerCase())) {
          errors.push({
            index: i + 1,
            email: teacherData.email,
            message: "Email already exists in database"
          });
          errorCount++;
          continue;
        }

        if (existingPhones.has(teacherData.mobile_no)) {
          errors.push({
            index: i + 1,
            email: teacherData.email,
            message: "Phone number already exists in database"
          });
          errorCount++;
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(teacherData.password, saltRounds);

        // Create teacher record
        const [teacherResult] = await db.sequelize.query(
          `CALL teachers(:query_type,:id,:name,:sex,:age,:address,:date_of_birth,:marital_status,:state_of_origin,:mobile_no,:email,:qualification,:user_type,:staff_type,:staff_role,:working_experience,:religion,:last_place_of_work,:do_you_have,:when_do,:account_name,:account_number,:bank,:passport_url,:branch_id,:school_id,:password)`,
          {
            replacements: {
              id: null,
              query_type: "create",
              name: teacherData.name,
              sex: teacherData.sex || null,
              age: teacherData.age || null,
              address: teacherData.address || null,
              date_of_birth: teacherData.date_of_birth ? moment(teacherData.date_of_birth).format("YYYY-MM-DD") : null,
              marital_status: teacherData.marital_status || null,
              state_of_origin: teacherData.state_of_origin || null,
              mobile_no: teacherData.mobile_no,
              email: teacherData.email.toLowerCase(),
              qualification: teacherData.qualification || null,
              user_type: "teacher",
              staff_type: teacherData.staff_type,
              staff_role: teacherData.staff_role,
              working_experience: teacherData.working_experience || null,
              religion: teacherData.religion || null,
              last_place_of_work: teacherData.last_place_of_work || null,
              do_you_have: null,
              when_do: null,
              account_name: teacherData.account_name || null,
              account_number: teacherData.account_number || null,
              bank: teacherData.bank || null,
              passport_url: "",
              branch_id: req.headers['x-branch-id'] || req.user?.branch_id || branch_id,
              school_id: school_id || req.user?.school_id || req.headers['x-school-id'],
              password: hashedPassword,
            },
            transaction: t,
          }
        );

        if (teacherResult?.teacher_id) {
          successCount++;
          // Add to existing sets to prevent duplicates in subsequent iterations
          existingEmails.add(teacherData.email.toLowerCase());
          existingPhones.add(teacherData.mobile_no);
        } else {
          errors.push({
            index: i + 1,
            email: teacherData.email,
            message: "Failed to create teacher record"
          });
          errorCount++;
        }
      } catch (error) {
        console.error(`Error creating teacher ${teacherData.email}:`, error);
        errors.push({
          index: i + 1,
          email: teacherData.email,
          message: error.message || "Unknown error occurred"
        });
        errorCount++;
      }
    }

    // Commit transaction if at least one teacher was created successfully
    if (successCount > 0) {
      await t.commit();
    } else {
      await t.rollback();
    }

    res.json({
      success: successCount > 0,
      message: `Bulk upload completed. ${successCount} teachers created successfully, ${errorCount} failed.`,
      successCount,
      errorCount,
      totalProcessed: teachers.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    await t.rollback();
    console.error("Bulk upload error:", error);
    res.status(500).json({
      success: false,
      message: "Bulk upload failed",
      error: error.message,
    });
  }
};

// Bulk check existence of emails and phone numbers
const checkBulkTeacherExistence = async (req, res) => {
  const { emails, phones } = req.body;
  const school_id = req.user.school_id;

  // Validate input
  if (!emails || !Array.isArray(emails) || !phones || !Array.isArray(phones)) {
    return res.status(400).json({
      success: false,
      message: "Emails and phones arrays are required.",
    });
  }

  try {
    // Build SQL query to find existing records
    let query = "SELECT email, mobile_no FROM teachers WHERE school_id = :school_id AND (";
    const replacements = { school_id };
    
    // Add email conditions
    const emailConditions = [];
    emails.forEach((email, index) => {
      if (email) {
        emailConditions.push(`email = :email${index}`);
        replacements[`email${index}`] = email.toLowerCase();
      }
    });
    
    // Add phone number conditions
    const phoneConditions = [];
    phones.forEach((phone, index) => {
      if (phone) {
        phoneConditions.push(`mobile_no = :phone${index}`);
        replacements[`phone${index}`] = phone;
      }
    });
    
    // Combine all conditions
    const allConditions = [...emailConditions, ...phoneConditions];
    if (allConditions.length === 0) {
      return res.json({ 
        success: true, 
        data: [] // No emails or phones to check
      });
    }
    
    query += allConditions.join(" OR ");
    query += ")";

    // Execute the query
    const existingTeachers = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT,
    });

    // Create lookup objects for faster search
    const existingEmails = new Set(existingTeachers.map(teacher => teacher.email?.toLowerCase()));
    const existingPhones = new Set(existingTeachers.map(teacher => teacher.mobile_no));

    // Process each email and phone to determine if they exist
    const results = [];
    
    // Process emails
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      if (!email) {
        // If email is not provided, skip check
        results.push({
          email: null,
          phone: phones[i] || null,
          emailExists: false,
          phoneExists: false
        });
        continue;
      }
      
      // Check if this email exists in the database
      const emailExists = existingEmails.has(email.toLowerCase());
      
      // Check if the corresponding phone number exists
      let phoneExists = false;
      if (phones[i]) {
        phoneExists = existingPhones.has(phones[i]);
      }
      // push
      results.push({
        email: email,
        phone: phones[i] || null,
        emailExists,
        phoneExists
      });
    }

    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error checking bulk teacher existence:", error);
    res.status(500).json({
      success: false,
      message: "Error checking teacher existence",
      error: error.message,
    });
  }
};

const assignSubjectsToTeacher = async (req, res) => {
    const { teacherId } = req.params;
    const { class_code, subject_codes } = req.body;
    const { school_id } = req.user;
    const branch_id = req.headers['x-branch-id'] || req.user.branch_id;

    if (!class_code || !subject_codes || !Array.isArray(subject_codes)) {
        return res.status(400).json({ success: false, message: "class_code and subject_codes array are required." });
    }

    const t = await db.sequelize.transaction();

    try {
        // 1. Un-assign subjects that are no longer in the list for this teacher in this class
        await db.sequelize.query(
            `DELETE FROM teacher_classes
                 WHERE teacher_id = :teacherId
                   AND class_code = :class_code
                   AND school_id = :school_id
                   AND subject_code NOT IN (:subject_codes)`,
            {
                replacements: { teacherId, class_code, school_id, subject_codes: subject_codes.length ? subject_codes : [''] },
                transaction: t
            }
        );

        if (subject_codes.length > 0) {
            const [classInfo] = await db.sequelize.query(
                `SELECT class_name FROM classes WHERE class_code = :class_code AND school_id = :school_id AND branch_id = :branch_id`, 
                { replacements: { class_code, school_id, branch_id }, type: db.sequelize.QueryTypes.SELECT, transaction: t }
            );
            if(!classInfo) {
                await t.rollback();
                return res.status(404).json({ success: false, message: 'Class not found.' });
            }

            for (const subject_code of subject_codes) {
                const [subjectInfo] = await db.sequelize.query(
                    `SELECT subject FROM subjects WHERE subject_code = :subject_code AND school_id = :school_id AND branch_id = :branch_id`, 
                    { replacements: { subject_code, school_id, branch_id }, type: db.sequelize.QueryTypes.SELECT, transaction: t }
                );
                if(!subjectInfo) {
                    await t.rollback();
                    return res.status(404).json({ success: false, message: `Subject with code ${subject_code} not found.` });
                }

                // Check for existing assignment - teacher_classes table does NOT have branch_id column
                // Branch filtering is done through the class_code which is already branch-specific
                const [existingAssignment] = await db.sequelize.query(
                    `SELECT id FROM teacher_classes WHERE class_code = :class_code AND subject_code = :subject_code AND school_id = :school_id`,
                    { replacements: { class_code, subject_code, school_id }, type: db.sequelize.QueryTypes.SELECT, transaction: t }
                );

                if (existingAssignment) {
                    await db.sequelize.query(
                        `UPDATE teacher_classes SET teacher_id = :teacherId WHERE id = :id`,
                        { replacements: { teacherId, id: existingAssignment.id }, transaction: t }
                    );
                } else {
                    // Insert new assignment - teacher_classes table does NOT have branch_id column
                    await db.sequelize.query(
                      `INSERT INTO teacher_classes (teacher_id, class_code, class_name, subject_code, subject, school_id)
                       VALUES (:teacher_id, :class_code, :class_name, :subject_code, :subject, :school_id)`,
                      {
                        replacements: {
                          teacher_id: teacherId,
                          class_code,
                          class_name: classInfo.class_name,
                          subject_code,
                          subject: subjectInfo.subject,
                          school_id
                        },
                        transaction: t
                      }
                    );
                }
            }
        }

        await t.commit();
        res.json({ success: true, message: 'Subject assignments updated successfully.' });

    } catch (err) {
        await t.rollback();
        console.error('Error in assignSubjectsToTeacher:', err);
        res.status(500).json({ success: false, message: 'An error occurred during subject assignment.' });
    }
};

// Soft delete teacher and associated data
const deleteTeacher = async (req, res) => {
  const { teacherId } = req.params;
  const school_id = req.user?.school_id || req.headers['x-school-id'];
  const adminId = req.user?.id || req.user?.user_id;

  if (!teacherId) {
    return res.status(400).json({
      success: false,
      message: "Teacher ID is required."
    });
  }

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "School ID is required."
    });
  }

  const t = await db.sequelize.transaction();

  try {
    // Verify teacher exists and belongs to the school
    const [teacher] = await db.sequelize.query(
      `SELECT id, user_id, is_deleted FROM teachers WHERE id = :teacherId AND school_id = :school_id`,
      {
        replacements: { teacherId, school_id },
        type: db.Sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (!teacher) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Teacher not found or does not belong to this school."
      });
    }

    if (teacher.is_deleted === 1) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Teacher is already deleted."
      });
    }

    // Step 1: Permanently delete relational data from class_role (teacher_roles)
    await db.sequelize.query(
      `DELETE FROM class_role WHERE teacher_id = :teacherId AND school_id = :school_id`,
      {
        replacements: { teacherId, school_id },
        transaction: t
      }
    );

    // Step 2: Permanently delete relational data from teacher_classes
    await db.sequelize.query(
      `DELETE FROM teacher_classes WHERE teacher_id = :teacherId AND school_id = :school_id`,
      {
        replacements: { teacherId, school_id },
        transaction: t
      }
    );

    // Step 3: Soft delete the teacher record
    await db.sequelize.query(
      `UPDATE teachers
       SET is_deleted = 1
       WHERE id = :teacherId AND school_id = :school_id`,
      {
        replacements: { teacherId, school_id },
        transaction: t
      }
    );

    // Step 4: Soft delete the linked user (if exists)
    if (teacher.user_id) {
      await db.sequelize.query(
        `UPDATE users
         SET status = 'Inactive'
         WHERE id = :userId AND school_id = :school_id`,
        {
          replacements: { userId: teacher.user_id, school_id },
          transaction: t
        }
      );
    }

    // Commit transaction
    await t.commit();

    logger.info("Teacher deleted successfully", {
      teacher_id: teacherId,
      user_id: teacher.user_id,
      deleted_by: adminId,
      school_id
    });

    res.json({
      success: true,
      message: "Teacher deleted successfully."
    });

  } catch (err) {
    await t.rollback();

    logger.error("Error deleting teacher", {
      teacher_id: teacherId,
      error: err.message,
      stack: err.stack,
      school_id
    });

    res.status(500).json({
      success: false,
      message: "Error deleting teacher",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  teachers,
  teacherSubjects,
  getTeacherDetails,
  getTeacherDetailsBySchoolId,
  get_teachers,
  getTeacherClassesAndRoles,
  checkTeacherExistence,
  getTeacherDashboard,
  bulkUploadTeachers,
  checkBulkTeacherExistence, //bulk check existence of emails and phone numbers
  assignSubjectsToTeacher,
  deleteTeacher,
};