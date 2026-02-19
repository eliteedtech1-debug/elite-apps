const { examinations, exam_questions, examResponses } = require("../controllers/cbt-examinations");
const config = require("../config/config");
const passport = require("passport");

module.exports = (app) => {
  app.post("/examinations",
    passport.authenticate('jwt', { session: false }),
    examinations);
  app.get("/examinations",
    passport.authenticate('jwt', { session: false }),
    (req, res, next) => {
      req.body = req.query;
      examinations(req, res);
    });
  app.post("/exam-questions",
      passport.authenticate('jwt', { session: false }),
    exam_questions);
  
  app.get("/exam-questions",
      passport.authenticate('jwt', { session: false }),

      (req, res, next)=>{
       req.body = req.query;
        exam_questions(req, res)
      }
    );
app.post("/exam-responses",
      passport.authenticate('jwt', { session: false }),
    examResponses);
  
  app.get("/exam-responses",
      passport.authenticate('jwt', { session: false }),

      (req, res, next)=>{
       req.body = req.query;
        examResponses(req, res)
      }
    );
    
};