// const db = require("../models"); // Adjust the path to your db connection
const db = require("../models");

// const { sequelize } = db.sequelize;
const exam_table = async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : Object.values(req.body);

    const promises = data.map((element) => {
      const {
        query_type = "create",
        id = null,
        exam_id = null,
        questionId = null,
        student_id = null,
        class_name = null,
        question = null,
        selected_option = null,
        response = null,
        answer = null,
        mark = null,
        remarks = response === answer ? "correct" : "incorrect",
        subject = null,
      } = element;

      // console.log("Processing:", {
      //   query_type,
      //   id,
      //   exam_id,
      //   question_id: questionId,
      //   student_id,
      //   class_name,
      //   question,
      //   selected_option,
      //   response,
      //   answer,
      //   mark,
      //   remarks,
      // });

      return db.sequelize.query(
        "CALL exam_table(:query_type, :id,  :exam_id, :question_id, :student_id, :class_name, :question, :selected_option, :response, :answer, :mark, :remarks, :subject)",
        {
          replacements: {
            query_type,
            id,
            exam_id,
            question_id: questionId,
            student_id,
            class_name,
            question,
            selected_option,
            response,
            answer,
            mark,
            remarks,
            subject,
          },
          logging: console.log,
        }
      );
    });

    const results = await Promise.all(promises);

    console.log("Procedure results:", results);

    res.status(200).json({
      success: true,
      data: results.flat(),
    });
  } catch (error) {
    console.error("Error processing exam_table:", error);
    res.status(500).json({
      success: false,
      message: "Error executing stored procedures",
      error: error.message,
    });
  }
};

// const get_exam_table = async (req, res) => {
//   const data = Array.isArray(req.body) ? req.body : Object.values(req.body);

//   const promises = data.map((element) => {
//     const {
//       query_type = null,
//       id = null,
//       exam_id = null,
//       questionId = null,
//       student_id = null,
//       class_name = null,
//       question = null,
//       selected_option = null,
//       response = null,
//       answer = null,
//       mark = null,
//       remarks = null,
//     } = element;
//     // const {} =

//     return db.sequelize.query(
//       "CALL exam_table(:query_type, :id, :questionId, :student_id, :class_name, :question, :selected_option, :response, :answer, :mark, :remarks)",
//       {
//         replacements: {
//           query_type,
//           id,
//           exam_id,
//           questionId,
//           student_id,
//           class_name,
//           question,
//           selected_option,
//           response,
//           answer,
//           mark,
//           remarks,
//         },
//       }
//     );
//   });
//   try {
//     const results = await Promise.all(promises);

//     res.status(200).json({
//       success: true,
//       data: results.flat(),
//     });
//   } catch (error) {
//     console.error("Error processing account_chart:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error executing stored procedures",
//       error: error.message,
//     });
//   }
// };
const get_exam_table = (req, res) => {
  console.log(req.body);
  const {
    query_type = "select",
    exam_id = null,
    student_id = null,
  } = req.query;
  const {
    id = null,
    question_id = null,
    class_name = null,
    question = null,
    selected_option = null,
    response = null,
    answer = null,
    mark = null,
    remarks = null,
    subject = null,
  } = req.body;

  db.sequelize
    .query(
      "CALL exam_table(:query_type, :id, :exam_id, :question_id, :student_id, :class_name, :question, :selected_option, :response, :answer, :mark, :remarks, :subject)",
      {
        replacements: {
          query_type,
          id,
          exam_id,
          question_id,
          student_id,
          class_name,
          question,
          selected_option,
          response,
          answer,
          mark,
          remarks,
          subject,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

module.exports = {
  exam_table,
  get_exam_table,
};
