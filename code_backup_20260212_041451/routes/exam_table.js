const { exam_table, get_exam_table } = require("../controllers/exam_table");

module.exports = (app) => {
  app.post("/exam_table", exam_table);
  app.get("/get_exam_table", get_exam_table);
};
