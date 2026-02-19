const { school_admission_form, update_school_admission_form, school_application_form } = require("../controllers/school_admission.form");
const passport = require("passport");

module.exports = (app) => {
  app.post("/application_form",
    passport.authenticate('jwt', { session: false }),
    school_admission_form);
  app.get("/application_list",  passport.authenticate('jwt', { session: false }), (req, res, nex) => {
    req.body = req.query;
   
    school_admission_form(req, res);
  });
  app.post("/update_application_form",
    passport.authenticate('jwt', { session: false }),
   update_school_admission_form);
   app.post("/application-form",
   school_application_form)
};