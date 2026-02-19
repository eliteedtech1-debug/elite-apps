const passport = require("passport");
const {
  getPredefinedSubjects,
  createPredefinedSubject,
  updatePredefinedSubject,
  deletePredefinedSubject
} = require("../controllers/predefinedSubjects");

module.exports = (app) => {
  app.get(
    "/predefined-subjects",
    passport.authenticate("jwt", { session: false }),
    getPredefinedSubjects
  );

  app.post(
    "/predefined-subjects",
    passport.authenticate("jwt", { session: false }),
    createPredefinedSubject
  );

  app.put(
    "/predefined-subjects/:id",
    passport.authenticate("jwt", { session: false }),
    updatePredefinedSubject
  );

  app.delete(
    "/predefined-subjects/:id",
    passport.authenticate("jwt", { session: false }),
    deletePredefinedSubject
  );
};
