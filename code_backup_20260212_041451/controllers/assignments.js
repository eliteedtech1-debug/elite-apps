const db = require("../models");
const moment = require("moment");

const assignments = (req, res) => {
  console.log(req.user, "AUTHENTICATED USER");

  // Get parameters from both body and query
  const params = { ...req.query, ...req.body };
  
  const {
    query_type = null,
    id = null,
    teacher_id = null,
    class_name = null,
    subject = null,
    subject_code = null,
    assignment_date = null,
    submission_date = null,
    attachment = null,
    content = null,
    upload = null,
    teacher_name = null,
    title = null,
    marks = null,
    questions = [],
    school_id = null,
    branch_id = null,
    class_code = null,
    start_date = null,
    end_date = null,
    academic_year = null,
    term = null,
    status = null,
    admission_no = null,
  } = params;

  // Handle select-responses with direct query
  if (query_type === 'select-responses') {
    db.sequelize.query(
      `SELECT 
        ar.admission_no,
        s.student_name,
        MAX(ar.created_at) as submitted_at,
        COUNT(DISTINCT ar.question_id) as questions_answered,
        SUM(ar.score) as total_score
      FROM assignment_responses ar
      LEFT JOIN students s ON ar.admission_no = s.admission_no
      WHERE ar.assignment_id = :assignment_id
      GROUP BY ar.admission_no, s.student_name
      ORDER BY MAX(ar.created_at) DESC`,
      {
        replacements: { assignment_id: id },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      console.log('Student responses found:', results.length);
      res.json({ success: true, data: results, count: results.length });
    })
    .catch((err) => {
      console.error('Error fetching responses:', err);
      res.status(500).json({ success: false, message: err.message });
    });
    return;
  }

  // SECURITY: Allow viewing other teachers' assignments for certain query types
  const authenticatedTeacherId = req.user.id;
  let effectiveTeacherId = authenticatedTeacherId;
  
  // Allow viewing other teachers' assignments for select operations
  if (query_type === 'select_teacher_assignment' || query_type === 'select') {
    effectiveTeacherId = teacher_id || authenticatedTeacherId;
  }

  db.sequelize
    .query(
      `call assignments(:query_type,:id,:teacher_id,:class_name,:class_code,:subject,:subject_code,:assignment_date,:submission_date,:attachment,:content,:teacher_name,:title,:marks,:school_id,:branch_id,:academic_year,:term,:start_date,:end_date,:status,:admission_no)`,
      {
        replacements: {
          query_type,
          id,
          teacher_id: authenticatedTeacherId,
          class_name,
          subject,
          subject_code,
          assignment_date,
          submission_date,
          attachment: attachment ? attachment : upload,
          content,
          teacher_name,
          title,
          marks,
          branch_id: branch_id ?? req.user.branch_id,
          school_id: req.user.school_id,
          class_code,
          academic_year,
          term,
          start_date: start_date ?? moment().format("YYYY/MM/DD"),
          end_date: end_date ?? moment().format("YYYY/MM/DD"),
          status,
          admission_no,
        },
      }
    )
    .then((results) => {
      questions.forEach((item, index) => {
        console.log({ assignment: item });

        const {
          query_type = "insert",
          id = null,
          assignment_id = results[0].assignment_id,
          subject = null,
          correct_answer = null,
          question_text = null,
          attachment_url = null,
          question_type = null,
          options = null,
          marks = null,
        } = item;
        db.sequelize.query(
          `CALL assignment_questions (
                    :query_type,
                    :id,
                    :assignment_id,
                    :question_type,
                    :question_text,
                    :attachment_url,
                    :options,
                    :correct_answer,
                    :marks
                    )`,
          {
            replacements: {
              query_type,
              id,
              assignment_id,
              subject,
              correct_answer,
              question_text,
              attachment_url,
              question_type,
              options,
              marks,
            },
          }
        );
      });
      res.json({ success: true, data: results });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

const updateAssignments = (req, res) => {
  console.log(req.user, "AUTHENTICATED USER");

  const {
    query_type = null,
    id = null,
    teacher_id = null,
    class_name = null,
    subject = null,
    subject_code = null,
    assignment_date = null,
    submission_date = null,
    attachment = null,
    content = null,
    upload = null,
    teacher_name = null,
    title = null,
    marks = null,
    questions = [],
    school_id = null,
    branch_id = null,
    class_code = null,
    start_date = null,
    end_date = null,
    academic_year = null,
    term = null,
    status = null,
    admission_no = null,
  } = req.body;

  // SECURITY FIX: Use authenticated user's ID as teacher_id
  const authenticatedTeacherId = req.user.id;

  db.sequelize
    .query(
      `call assignments(:query_type,:id,:teacher_id,:class_name,:class_code,:subject,:subject_code,:assignment_date,:submission_date,:attachment,:content,:teacher_name,:title,:marks,:school_id,:branch_id,:academic_year,:term,:start_date,:end_date,:status,:admission_no)`,
      {
        replacements: {
          query_type,
          id,
          teacher_id: authenticatedTeacherId,
          class_name,
          subject,
          subject_code,
          assignment_date,
          submission_date,
          attachment: attachment ? attachment : upload,
          content,
          teacher_name,
          title,
          marks,
          branch_id: branch_id ?? req.user.branch_id,
          school_id: req.user.school_id,
          class_code,
          academic_year,
          term,
          start_date: start_date ?? moment().format("YYYY/MM/DD"),
          end_date: end_date ?? moment().format("YYYY/MM/DD"),
          status,
          admission_no,
        },
      }
    )
    .then((results) => {
      questions.forEach((item, index) => {
        console.log({ assignment: item });

        const {
          query_type = "insert",
          id = null,
          assignment_id = results[0].assignment_id,
          subject = null,
          correct_answer = null,
          question_text = null,
          attachment_url = null,
          question_type = null,
          options = null,
          marks = null,
        } = item;
        db.sequelize.query(
          `CALL assignment_questions (
                    :query_type,
                    :id,
                    :assignment_id,
                    :question_type,
                    :question_text,
                    :attachment_url,
                    :options,
                    :correct_answer,
                    :marks
                    )`,
          {
            replacements: {
              query_type,
              id,
              assignment_id,
              subject,
              correct_answer,
              question_text,
              attachment_url,
              question_type,
              options,
              marks,
            },
          }
        );
      });
      res.json({ success: true, data: results });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

const studentAssignments = async (req, res) => {
  // Ensure data is an array, even if a single object is provided
  const data = Array.isArray(req.body) ? req.body : [req.body];

  // Create an array to store promises for the database queries
  const promises = data.map((element) => {
    const {
      query_type = null,
      id = null,
      assignment_id = null,
      school_id = null,
      student_name = null,
      admission_no = null,
      class_name = null,
      teacher_id = null,
      subject = null,
      level = null,
      attachement = null,
      content = null,
      marks = null,
      score = null,
      remark = null,
      comment = null,
      teacher_name = null,
    } = element;

    return db.sequelize.query(
      `CALL student_assignments(
                :query_type,
                :id,
                :assignment_id,
                :student_name,
                :admission_no,
                :class_name,
                :subject,
                :teacher_id,
                :teacher_name,
                :attachement,
                :content,
                :marks,
                :score,
                :remark,
                :comment)`,
      {
        replacements: {
          query_type,
          id,
          assignment_id,
          school_id,
          student_name,
          admission_no,
          class_name,
          subject,
          level,
          teacher_id,
          teacher_name,
          attachement,
          content,
          marks,
          score,
          remark,
          comment,
        },
      }
    );
  });

  try {
    // Wait for all promises to resolve
    const results = await Promise.all(promises);

    // Flatten the results array if necessary and send response
    res.status(200).json({
      success: true,
      data: results.flat(),
    });
  } catch (error) {
    console.error("Error processing account_chart:", error);
    res.status(500).json({
      success: false,
      message: "Error executing stored procedures",
      error: error.message,
    });
  }
};

const assignmentResponses = async (req, res) => {
  const {
    query_type = null,
    assignment_id = null,
    admission_no = null,
    subject = null,
    id = null,
  } = req.body;
  
  // Extract the responses array from the request body
  const data = req.body.responses || [];
  
  // If no responses array, try to handle single response
  const responses = Array.isArray(data) ? data : [data];

  // Create an array to store promises for the database queries
  const promises = responses.map((element) => {
    const {
      id = null,
      question_id = null,
      response = null,
      score = null,
      remark = null,
    } = element;
    
    // Use top-level metadata for all database calls
    return db.sequelize.query(
      `CALL assignmentResponses (
                :assignment_id,
                :question_id,
                :admission_no,
                :subject,
                :response,
                :score,
                :remark,
                :id
            )`,
      {
        replacements: {
            assignment_id,
            question_id,
            admission_no,
            subject,
            response,
            score,
            remark,
            id
        },
      }
    );
  });

  try {
    // Wait for all promises to resolve
    const results = await Promise.all(promises);

    // Flatten the results array if necessary and send response
    res.status(200).json({
      success: true,
      data: results.flat(),
    });
  } catch (error) {
    console.error("Error processing assignment responses:", error);
    res.status(500).json({
      success: false,
      message: "Error executing stored procedures",
      error: error.message,
    });
  }
};

const getAssignments = (req, res) => {
  const {
    query_type = null,
    id = null,
    teacher_id = null,
    class_name = null,
    subject = null,
    subject_code = null,
    assignment_date = null,
    submission_date = null,
    attachment = null,
    content = null,
    upload = null,
    teacher_name = null,
    title = null,
    marks = null,
    branch_id = null,
    class_code = null,
    start_date = null,
    end_date = null,
    academic_year = null,
    term = null,
    status = null,
    admission_no = null,
  } = req.query;

  // Handle select-submitted with direct query
  if (query_type === 'select-submitted') {
    const { content, id } = req.query;
    return db.sequelize.query(
      `SELECT 
        ar.*,
        aq.question_text,
        aq.question_type,
        aq.correct_answer,
        aq.options
      FROM assignment_responses ar
      LEFT JOIN assignment_questions aq ON ar.question_id = aq.id
      WHERE ar.assignment_id = :assignment_id 
        AND ar.admission_no = :admission_no
      ORDER BY ar.question_id`,
      {
        replacements: { 
          assignment_id: id,
          admission_no: content 
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      console.log('Student submitted responses found:', results.length);
      res.json({ success: true, data: results, count: results.length });
    })
    .catch((err) => {
      console.error('Error fetching submitted responses:', err);
      res.status(500).json({ success: false, message: err.message });
    });
  }

  // Handle select-responses with direct query
  if (query_type === 'select-responses') {
    const reqSchoolId = req.query.school_id || req.headers['x-school-id'] || req.user?.school_id;
    const reqClassCode = req.query.class_code;
    
    return db.sequelize.query(
      `SELECT 
        s.admission_no,
        s.student_name,
        MAX(ar.created_at) as submitted_at,
        COUNT(DISTINCT ar.question_id) as response_count,
        COALESCE(SUM(ar.score), 0) as score,
        (SELECT SUM(marks) FROM assignment_questions WHERE assignment_id = :assignment_id) as marks
      FROM students s
      LEFT JOIN assignment_responses ar ON s.admission_no = ar.admission_no AND ar.assignment_id = :assignment_id
      WHERE s.current_class = :class_code 
        AND s.school_id = :school_id
        AND s.status = 'Active'
      GROUP BY s.admission_no, s.student_name
      ORDER BY s.student_name ASC`,
      {
        replacements: { 
          assignment_id: id,
          class_code: reqClassCode,
          school_id: reqSchoolId
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      console.log('Student responses found:', results.length);
      res.json({ success: true, data: results, count: results.length });
    })
    .catch((err) => {
      console.error('Error fetching responses:', err);
      res.status(500).json({ success: false, message: err.message });
    });
  }

  // SECURITY: Allow viewing other teachers' assignments for certain query types
  const authenticatedTeacherId = req.user.id;
  const authenticatedUserType = req.user.user_type;
  let effectiveTeacherId = authenticatedTeacherId;
  
  // Allow viewing other teachers' assignments for select operations
  if (query_type === 'select_teacher_assignment' || query_type === 'select') {
    effectiveTeacherId = teacher_id || authenticatedTeacherId;
  } else if (authenticatedUserType === 'Teacher' && teacher_id && parseInt(teacher_id) !== parseInt(authenticatedTeacherId)) {
    // For other operations, teachers can only access their own assignments
    console.warn('🚨 SECURITY VIOLATION: Teacher', authenticatedTeacherId, 'attempted to access assignments for teacher', teacher_id);
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: You can only access your own assignments',
      error: 'FORBIDDEN'
    });
  }
  
  console.log('🔒 SECURITY: Using effective teacher_id:', effectiveTeacherId, 'for query_type:', query_type);

  const queryParams = {
    query_type,
    id,
    teacher_id: effectiveTeacherId,
    class_name,
    subject,
    subject_code,
    assignment_date,
    submission_date,
    attachment: attachment ? attachment : upload,
    content,
    teacher_name,
    title,
    marks,
    branch_id: branch_id ?? req.user.branch_id,
    school_id: req.user.school_id,
    class_code,
    academic_year,
    term,
    start_date: start_date ?? moment().format("YYYY/MM/DD"),
    end_date: end_date ?? moment().format("YYYY/MM/DD"),
    status,
    admission_no,
  };
  console.log('📋 Query parameters:', JSON.stringify(queryParams, null, 2));

  db.sequelize
    .query(
      `call assignments(:query_type,:id,:teacher_id,:class_name,:class_code,:subject,:subject_code,:assignment_date,:submission_date,:attachment,:content,:teacher_name,:title,:marks,:school_id,:branch_id,:academic_year,:term,:start_date,:end_date,:status,:admission_no)`,
      {
        replacements: queryParams,
      }
    )
    .then((results) => {
      let data = results?.[0] || results || [];
      
      // Ensure data is always an array
      if (!Array.isArray(data)) {
        data = data ? [data] : [];
      }
      
      console.log('Assignments API response:', data.length, 'records found');
      res.json({ success: true, data: data, count: data.length });
    })
    .catch((err) => {
      console.error('Error in assignments API:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: err.message 
      });
    });
};

module.exports = {
  assignments,
  studentAssignments,
  assignmentResponses,
  getAssignments,
  updateAssignments,
};
