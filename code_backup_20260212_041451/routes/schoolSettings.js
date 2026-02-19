const {
  getSchoolSettings,
  updateSchoolSettings,
  deleteSchoolSetting
} = require("../controllers/schoolSettingsController");
const passport = require("passport");

module.exports = (app) => {
  // GET /school-settings - Retrieve school settings
  app.get(
    "/school-settings",
    passport.authenticate('jwt', { session: false }),
    getSchoolSettings
  );

  // POST /school-settings - Update school settings
  app.post(
    "/school-settings",
    passport.authenticate('jwt', { session: false }),
    updateSchoolSettings
  );

  // PUT /school-settings - Update school settings (alias for POST)
  app.put(
    "/school-settings",
    passport.authenticate('jwt', { session: false }),
    updateSchoolSettings
  );

  // DELETE /school-settings - Delete a specific school setting
  app.delete(
    "/school-settings",
    passport.authenticate('jwt', { session: false }),
    deleteSchoolSetting
  );
};