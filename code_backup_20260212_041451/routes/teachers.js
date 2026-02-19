const {
  teachers,
  get_teachers,
  teacherSubjects,
  getTeacherDetails,
  getTeacherDetailsBySchoolId,
  getTeacherClassesAndRoles,
  getTeacherDashboard,
  checkTeacherExistence,
  bulkUploadTeachers,
  checkBulkTeacherExistence,
  assignSubjectsToTeacher,
  deleteTeacher
} = require("../controllers/teachers");
const passport = require("passport");
const {
  getStudentDashboard
} = require("../controllers/secondary_school_entrance_form");

module.exports = (app) => {
  app.post(
    "/teachers",
    passport.authenticate("jwt", {
      session: false
    }),
    teachers
  );
  app.get(
    "/teachers",
    (req, res, next) => {
      console.log("GET /teachers route hit with query:", req.query);
      next();
    },
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      console.log("GET /teachers authenticated, calling get_teachers");
      next();
    },
    get_teachers
  );

  // Test route to verify the endpoint is registered
  app.get("/teachers/test", (req, res) => {
    res.json({
      success: true,
      message: "Teachers route is working"
    });
  });
  app.get(
    "/student/dashboard",
    passport.authenticate("jwt", {
      session: false
    }),
    getStudentDashboard
  );
  app.get(
    "/classes-roles",
    passport.authenticate("jwt", {
      session: false
    }),
    getTeacherClassesAndRoles
  );
  // app.get(
  //   '/teachers/dashboard',
  //   passport.authenticate('jwt', { session: false }),
  //   (req, res) => {
  //     res.status(501).json({ success: false, message: 'Teacher dashboard not implemented yet' });
  //   }
  // );
  app.get(
    "/teachers/dashboard",
    passport.authenticate("jwt", {
      session: false
    }),
    getTeacherDashboard
  )
  app.get(
    "/check-existence",
    passport.authenticate("jwt", {
      session: false
    }),
    checkTeacherExistence
  );
  app.post(
    "/teachers/:teacherId/subjects",
    passport.authenticate("jwt", {
      session: false
    }),
    assignSubjectsToTeacher
  );
  app.post(
    "/teacher_subjects",
    passport.authenticate("jwt", {
      session: false
    }),
    teacherSubjects
  );
  app.get(
    "/teacher_subjects",
    passport.authenticate("jwt", {
      session: false
    }),
    (req, res, next) => {
      req.body = req.query;

      teacherSubjects(req, res);
    }
  );
  // Route to get teacher details (based on query_type and optional teacher_id)
  app.get("/get_teachers_details", (req, res) => {
    // Ensure parameters are coming from query
    const {
      query_type,
      teacher_id
    } = req.query;

    if (!query_type) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Query type is required."
        });
    }

    getTeacherDetails(query_type, teacher_id, res);
  });

  // Route to get teacher details by school_id
  app.get("/get_teachers_details_by_school_id", (req, res) => {
    // Call getTeacherDetailsBySchoolId with the request and response
    getTeacherDetailsBySchoolId(req, res);
  });

  // Route for bulk upload teachers
  app.post(
    "/teachers/bulk-upload",
    passport.authenticate("jwt", {
      session: false
    }),
    bulkUploadTeachers
  );

  // Route for bulk checking existence of emails and phones
  app.post(
    "/teachers/check-bulk-existence",
    passport.authenticate("jwt", {
      session: false
    }),
    checkBulkTeacherExistence
  );

  // Route for soft deleting a teacher
  app.delete(
    "/teachers/:teacherId",
    passport.authenticate("jwt", {
      session: false
    }),
    deleteTeacher
  );
};