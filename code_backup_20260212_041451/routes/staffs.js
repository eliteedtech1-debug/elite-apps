const {
  staff,
  get_staff,
  staffSubjects,
  getStaffDetails,
  getStaffDetailsBySchoolId,
} = require("../controllers/staffs");
const config = require("../config/config");
const passport = require("passport");

module.exports = (app) => {
  app.post(
    "/staff",
    passport.authenticate("jwt", { session: false }),
    staff
  );
  app.get(
    "/staffs",

    passport.authenticate("jwt", { session: false }),
    get_staff
  );
  app.post(
    "/staff_subjects",
    passport.authenticate("jwt", { session: false }),
    staffSubjects
  );
  app.get(
    "/staff_subjects",
    passport.authenticate("jwt", { session: false }),
    (req, res, next) => {
      req.body = req.query;

      staffSubjects(req, res);
    }
  );
  // Route to get teacher details (based on query_type and optional teacher_id)
  app.get("/get_staff_details", (req, res) => {
    // Ensure parameters are coming from query
    const { query_type, staff_id } = req.query;

    if (!query_type) {
      return res
        .status(400)
        .json({ success: false, message: "Query type is required." });
    }

    getStaffDetails(query_type, staff_id, res);
  });

  // Route to get teacher details by school_id
  app.get("/get_staff_details_by_school_id", (req, res) => {
    const { school_id, query_type, staff_id = null } = req.query;

    if (!school_id || !query_type) {
      return res.status(400).json({
        success: false,
        message: "School ID and query type ('all' or 'one') are required.",
      });
    }

    // Call getStaffDetailsBySchoolId with the parameters
    getStaffDetailsBySchoolId(req, res, school_id, query_type, staff_id);
  });
};
