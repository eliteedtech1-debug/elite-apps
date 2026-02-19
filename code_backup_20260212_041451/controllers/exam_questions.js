const db = require("../models");
const { v4: UUIDV4 } = require("uuid");

const exam_question = (req, res) => {
  const {
    exam_id = null,
    question = null,
    marks = null,
    option1 = null,
    option2 = null,
    option3 = null,
    option4 = null,
    answer = null,
  } = req.body;
  const { query_type = "create", id = null } = req.query;
  db.sequelize
    .query(
      `call exam_questions(:query_type,:id,:exam_id,:question,:marks,:option1,:option2,:option3,:option4,:answer)`,
      {
        replacements: {
          query_type,
          id: query_type === "create" ? UUIDV4() : id,
          exam_id,
          question,
          marks,
          option1,
          option2,
          option3,
          option4,
          answer,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
const exam_questions_list = (req, res) => {
  console.log(req.body);
  const { exam_id = null, id = null } = req.query;
  const {
    query_type = "select",
    question = null,
    marks = null,
    option1 = null,
    option2 = null,
    option3 = null,
    option4 = null,
    answer = null,
  } = req.body;

  db.sequelize
    .query(
      `call exam_questions(:query_type,:id,:exam_id,:question,:marks,:option1,:option2,:option3,:option4,:answer)`,
      {
        replacements: {
          query_type,
          id,
          exam_id,
          question,
          marks,
          option1,
          option2,
          option3,
          option4,
          answer,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
module.exports = { exam_question, exam_questions_list };
