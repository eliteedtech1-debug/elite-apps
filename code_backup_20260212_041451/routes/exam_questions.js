const {
  exam_question,
  exam_questions_list,
} = require("../controllers/exam_questions");

module.exports = (app) => {
  app.post("/exam_questions", exam_question);
  app.put("/exam_questions", exam_question);
  app.delete("/exam_questions", exam_question);
  app.get("/exam_questions", exam_questions_list);
};
