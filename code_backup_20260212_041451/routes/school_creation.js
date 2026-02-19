const passport = require("passport");
const {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchoolStatus,
  updateSchool,
  getSchoolByShortName,
  getSchoolFeatures,
  saveSchoolOverrides,
} = require("../controllers/school_creation");

module.exports = (app) => {
  // Create a new school or update attendance settings
  app.post(
    "/school-setup",
    passport.authenticate("jwt", { session: false }),
    createSchool
  );

  // Get school setup data
  app.get(
    "/school-setup",
    passport.authenticate("jwt", { session: false }),
    getAllSchools
  );

  app.post(
    "/schools/signup",

    passport.authenticate("jwt", { session: false }),
    createSchool
  );


  // Fetch all schools
  app.get(
    "/schools",
    passport.authenticate("jwt", { session: false }),
    getAllSchools
  );

  // Fetch a specific school by ID
  // app.get(
  //   "/schools/:school_id",
  //   passport.authenticate("jwt", { session: false }),
  //   getSchoolById
  // );
  app.get(
    "/get-schools",
    passport.authenticate("jwt", { session: false }),
    getSchoolById
  );

  // Fetch the school URL by ID
  // app.get(
  //   "/schools/:school_id/url",
  //   passport.authenticate("jwt", { session: false }),
  //   // getSchoolUrl
  // );

  // Update the status of a school
  app.put(
    "/schools/status",
    passport.authenticate("jwt", { session: false }),
    updateSchoolStatus
  );

  // Update a school
  app.post(
    "/update-school",
    passport.authenticate("jwt", { session: false }),
    updateSchool
  );
  // /schools/get-details.
  app.get('/schools/get-details',
    getSchoolByShortName
  )

  // School features (plan + overrides)
  app.get('/schools/features',
    passport.authenticate("jwt", { session: false }),
    getSchoolFeatures
  )

  app.put('/schools/:school_id/overrides',
    passport.authenticate("jwt", { session: false }),
    saveSchoolOverrides
  )
};
