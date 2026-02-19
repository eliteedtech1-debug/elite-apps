"use strict";

const {
  gradeSetup,
  examReports,
  examCaSetup
} = require("../controllers/grades");
const config = require("../config/config");
const passport = require("passport");
module.exports = app => {
  app.post("/grade-setup",
    passport.authenticate('jwt', { session: false }),
    gradeSetup);
  app.get('/grade-setup',
    passport.authenticate('jwt', { session: false }),
    (req, res, nex) => {
      req.body = req.query;
      gradeSetup(req, res);
    });
  app.get('/exam-reports',
    passport.authenticate('jwt', { session: false }),
    (req, res, nex) => {
      examReports(req, res);
    });
    app.get('/exam-ca-setup',
      passport.authenticate('jwt', { session: false }),
      (req, res, nex) => {
        req.body = req.query;
        examCaSetup(req, res);
      });

  app.post('/exam-ca-setup',
    passport.authenticate('jwt', { session: false }),
      examCaSetup);
  
};
//# sourceMappingURL=grades.js.map