const moment = require("moment");
const db = require("../models");
const { v4: UUIDV4 } = require("uuid");

const examinations = (req, res) => {
  const {
    teacher_id = null,
    class_name = null,
    subject_name = null,
    subject_code = null,
    assessment_type = null,
    section = null,
    term = null,
    start_time = null,
    end_time = null,
    commence_date = null,
    status = "Pending",
    comment = null,
    academic_year = null,
    class_code = null,
    query_type = null, 
    branch_id =null,
    id = null 
  } = req.body;

  db.sequelize
    .query(
      `CALL examinations(:query_type,:id,:teacher_id,:assessment_type,:section,:class_name,:class_code,:term,:subject_name,:subject_code,:commence_date,:start_time,:end_time,:status,:comment,:academic_year,:school_id,:branch_id);`,
      {
        replacements: {
          query_type,
          id: query_type === "create" ? UUIDV4() : id,
          teacher_id,
          assessment_type,
          section,
          class_name,
          class_code,
          term,
          subject_name,
          subject_code,
          commence_date: commence_date
            ? moment.utc(commence_date).local().format("YYYY-MM-DD")
            : null,
          comment,
          start_time: start_time ? moment(start_time, "HH:mm").format("h:mm A") : null,
          end_time: end_time ? moment(end_time, "HH:mm").format("h:mm A") : null,
          status,
          academic_year,
          school_id: req.user.school_id,
          branch_id:branch_id??req.user.branch_id,
        },
      }
    )
    .then((data) =>{ 
      console.log({ success: true, data });
      
      res.json({ success: true, data })})
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

const exam_questions = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const questions = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const item of questions) {
      const {
        query_type = null,
        id = null,
        exam_id=null,
        question_hint=null,
        question_text=null,
        attachment_url=null,
        question_type=null,
        is_case_sensitive = null,
        correct_answer = null,
        options=null,
        marks=0
      } = item;

      const result = await db.sequelize.query(
        `CALL exam_questions(
          :query_type,
          :id,
          :exam_id,
          :question_type,
          :question_text,
          :attachment_url,
          :question_hint,
          :is_case_sensitive,
          :correct_answer,
          :marks)`,
        {
          replacements: {
            query_type,
            id,
            exam_id,
            question_type,
            question_text,
            attachment_url,
            question_hint,
            marks,
            correct_answer,
            is_case_sensitive:is_case_sensitive??0
          },
          transaction
        }
      );

      const insertedQuestionId = result[0]?.question_id;
      results.push({ question_id: insertedQuestionId, result });
      console.log(JSON.stringify({result}));
      
      if (question_type && question_type.toLowerCase() === 'multiple choice' && Array.isArray(options) && insertedQuestionId) {
        for (const opt of options) {
          await db.sequelize.query(
            `CALL exam_question_options(:query_type, :id, :question_id, :option, :is_correct, :marks);`,
            {
              replacements: {
                query_type, // Explicit to avoid confusion
                question_id: insertedQuestionId??0,
                option: opt.option??null,
                id: opt.id??0,
                is_correct:opt.is_correct??0,
                marks:opt.marks??0
              },
              transaction
            }
          );
        }
      }
    }

    await transaction.commit();

    return res.json({ success: true, message: "Questions processed successfully", data: results });

  } catch (error) {
    console.error(error);
    
    await transaction.rollback(); // Rolls back everything (exam_questions + options)
    console.error("Error processing exam questions:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

const examResponses = async (req, res) => {
  try {
    const input = Array.isArray(req.body) ? req.body : [req.body];

    // Flattened version to handle both single and multiple responses
    const flatData = input.flatMap((entry) => {
      const {
        query_type = null,
        id = null,
        exam_id = null,
        question_id = null,
        admission_no = null,
        class_name = null,
        class_code = null,
        subject_name = null,
        subject_code = null,
        response = null,
        score = null,
        remark = null,
        attachment_url = null,
      } = entry;

      // Handle multi-response: response is array of strings
      if (Array.isArray(response)) {
        return response.map((resp, idx) => ({
          query_type,
          id,
          exam_id,
          question_id,
          admission_no,
          class_name,
          class_code,
          subject_name,
          subject_code,
          response: resp,
          attachment_url,
          score,
          remark,
        }));
      }

      // Normal single response
      return {
        query_type,
        id,
        exam_id,
        question_id,
        admission_no,
        class_name,
        class_code,
        subject_name,
        subject_code,
        response,
        attachment_url,
        score,
        remark,
      };
    });

    // Process all requests as stored procedure calls
    const promises = flatData.map((element) =>
      db.sequelize.query(
        `CALL examResponses(
          :query_type, :id, :exam_id, :question_id, :admission_no,
          :class_name, :class_code, :subject_name, :subject_code,
          :response, :attachment_url, :score, :remark
        );`,
        { replacements: element }
      )
    );

    const results = await Promise.all(promises);

    res.status(200).json({
      success: true,
      data: results.flat(),
    });
  } catch (error) {
    console.error("Error processing exam_responses:", error);
    res.status(500).json({
      success: false,
      message: "Error executing stored procedures",
      error: error.message,
    });
  }
};


module.exports = { 
  examinations,
   exam_questions,
   examResponses
  };
