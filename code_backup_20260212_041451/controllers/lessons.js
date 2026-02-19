// const db= require("../models");
const db = require("../models");

const lessons = (req, res) => {
  // const {  } = req.body;
  const {
    query_type = null,
    id = null,
    class_name = null,
    subject_code = null,
    lesson_date = null,
    attachment = null,
    content = null,
    upload = null,
    teacher = null,
    teacher_id = null,
    title = null,
    branch_id = null,
    class_code = null,
    academic_year = null,
    term = null,
    duration = null,
    materials = null,
    objectives = null,
    status = null,
  } = req.body;

  db.sequelize
    .query(
      `call lessons(:query_type,:id,:class_name,:subject,:lesson_date,:attachment,:content,:teacher,:teacher_id,:title, :school_id,:branch_id,:class_code,:academic_year,:term,:duration,:materials,:objectives,:status)`,
      {
        replacements: {
          query_type,
          id,
          class_name,
          subject: subject_code,
          lesson_date,
          attachment,
          content,
          teacher,
          teacher_id: teacher_id ?? req.user.id,
          title,
          attachment: attachment ? attachment : upload,
          branch_id: branch_id ?? req.user.branch_id,
          school_id: req.user.school_id,
          class_code,
          academic_year,
          term,
          duration: duration || 45,
          materials,
          objectives,
          status: query_type === 'create' ? 'Draft' : status,
        },
      }
    )
    .then((results) => res.json({ success: true, data: results }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

const commentLessons = (req, res) => {
  // const {  } = req.body;
  const {
    query_type = "create",
    id = null,
    lesson_id = null,
    user_id = null,
    user_name = null,
    user_role = null,
    parent_id = null,
    comment = null,
  } = req.body;

  db.sequelize
    .query(
      `call lesson_comments(:query_type,:id,:lesson_id,:user_id,:user_name,:user_role,:parent_id,:comment)`,
      {
        replacements: {
          query_type,
          id,
          lesson_id,
          user_id,
          user_name,
          user_role,
          parent_id,
          comment,
        },
      }
    )
    .then((results) => res.json({ success: true, data: results }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
module.exports = { lessons, commentLessons };