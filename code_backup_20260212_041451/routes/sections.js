const passport = require("passport");
const {
  CreateAcademicYear,
  getAcademicYear,
  updateAcademicYear,
} = require("../controllers/academic_year");
const { CreateSections, getSections, deleteSection } = require("../controllers/sections");

module.exports = (app) => {
  app.post(
    "/section-setup",
    passport.authenticate("jwt", { session: false }),
    CreateSections
  );
  app.get(
    "/get-sections",
    passport.authenticate("jwt", { session: false }),
    getSections
  );
  app.get(
    "/get-academic-years",
    passport.authenticate("jwt", { session: false }),
    getAcademicYear
  );
  app.post(
    "/create-academic-years",
    passport.authenticate("jwt", { session: false }),
    CreateAcademicYear
  );
  app.post(
    "/update-academic-years",
    passport.authenticate("jwt", { session: false }),
    updateAcademicYear
  );
  
  // Section deletion endpoint
  app.post(
    "/sections",
    passport.authenticate("jwt", { session: false }),
    deleteSection
  );
};
