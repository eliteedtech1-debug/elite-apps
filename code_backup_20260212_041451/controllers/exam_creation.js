const moment = require("moment");
const db = require("../models");
const { v4: UUIDV4 } = require("uuid");

const exam_creation = (req, res) => {
  const {
    teacher_id = null,
    class_name = null,
    subject_name = null,
    assessment_type = null,
    term = null,
    start_time = null,
    end_time = null,
    commence_date = null,
    status = "pending",
    academic_year = null,
    class_code = null,
    admission_no = null,
  } = req.body;

  const { query_type = "create", id = null } = req.query;

  // console.log({ commence_date });

  db.sequelize
    .query(
      `call exam_creation(:query_type,:id,:teacher_id,:assessment_type,:class_name,:class_code,:term,:subject_name,:commence_date,:start_time,:end_time,:status,:academic_year,:school_id,:admission_no)`,
      {
        replacements: {
          query_type,
          id: query_type === "create" ? UUIDV4() : id,
          teacher_id,
          assessment_type,
          class_name,
          class_code,
          term,
          subject_name,
          commence_date: commence_date
            ? moment.utc(commence_date).local().format("YYYY-MM-DD")
            : null,

          start_time: start_time ? moment(start_time, "HH:mm").format("h:mm A") : null,
          end_time: end_time ? moment(end_time, "HH:mm").format("h:mm A") : null,
          status,
          academic_year,
          school_id: req.user.school_id,
          admission_no,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
const exam_list = (req, res) => {
  const {
    class_name = null,
    class_code = null,
    subject_name = null,
    term = null,
    assessment_type = null,
    start_time = "00:00:00",
    end_time = "00:00:00",
    commence_date = null,
    status = null,
    academic_year = null,
    admission_no = null,
  } = req.body;

  const { query_type = "select", id = 0, teacher_id = null } = req.query;
  // {
  //   SELECT x.*, SUM(q.marks) as total_marks, COUNT(q.id) as total_questions, CONCAT(x.class_name, ' ', x.term, '  ', x.subject_name, ' ', x.assessment_type ) AS assessment_type  FROM exam_creation x JOIN exam_questions q ON x.id = q.exam_id WHERE  x.teacher_id = in_teacher_id;
  // }
  db.sequelize
    .query(
      `call exam_creation(:query_type,:id,:teacher_id,:assessment_type,:class_name,:class_code,:term,:subject_name,:commence_date,:start_time,:end_time,:status,:academic_year,:school_id,:admission_no)`,
      {
        replacements: {
          query_type,
          id,
          teacher_id,
          assessment_type,
          class_name,
          class_code,
          term,
          subject_name,
          commence_date: commence_date
            ? moment.utc(commence_date).local().format("YYYY-MM-DD")
            : null,
          start_time,
          end_time,
          status,
          academic_year,
          school_id: req.user.school_id,
          admission_no,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

module.exports = { exam_creation, exam_list };
