const {studentAttendances, secondary_school_entrance_form, get_secondary_school_entrance_form, update_secondary_school_entrance_form, update_current_class_secondary_school_entrance_form, getParent, get_secondary_school_entrance_form_, exam_garding, students, Parents, studentsBulk, updateParent, students_v2, softDeleteStudent, studentsBulk_v2, updateStudentDetails, updateStudentStream } = require("../controllers/secondary_school_entrance_form");
const { handleFileUpload } = require("../controllers/fileUploadController");
const config = require("../config/config");
const multer = require("multer");
const passport = require("passport");
// 

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
module.exports = (app) => {
    app.post(
        "/secondary_school_entrance_form",
        //    config.authRequest
        secondary_school_entrance_form
    );
    app.post(
        "/exam_grading",
        //    config.authRequest
        exam_garding
    );
    app.get(
        "/get_secondary_school_entrance_form",
        //    config.authRequest
        get_secondary_school_entrance_form
    );

    app.get(
        "/get_secondary_school_entrance_form/data/:current_class",
        //    config.authRequest
        get_secondary_school_entrance_form_
    );

    app.put(
        "/update_secondary_school_entrance_form",
        //    config.authRequest
        update_secondary_school_entrance_form
    );
    app.put(
        "/update_current_class_secondary_school_entrance_form",
        //    config.authRequest
        update_current_class_secondary_school_entrance_form
    );
    app.get("/get-parent", 
      passport.authenticate('jwt', { session: false }),
      (req, res, next) => {
        getParent(req, res)
    })
    // Parent creation endpoints (supports both /parent and /create/parents)
    app.post("/parent",
      passport.authenticate('jwt', { session: false }),
    (req, res, next) => {
        // Support both query_type (from query) and query_type1 (from body)
        if (req.query.query_type && !req.body.query_type1) {
          req.body.query_type1 = req.query.query_type;
        }
        // If no query_type provided, default to 'create'
        if (!req.body.query_type1 && !req.query.query_type) {
          req.body.query_type1 = 'create';
        }
        Parents(req, res)
    })

    app.post("/create/parents",
      passport.authenticate('jwt', { session: false }),
    (req, res, next) => {
        // Support both query_type (from query) and query_type1 (from body)
        if (req.query.query_type && !req.body.query_type1) {
          req.body.query_type1 = req.query.query_type;
        }
        Parents(req, res)
    })

    app.post("/upload-document", upload.single("media"), handleFileUpload);
    app.get('/students/v2', 
        passport.authenticate('jwt', {
            session: false,
          }),
          (req, res, next) => {
          req.body = req.query
          students_v2(req, res)
        });
    app.post('/students/v2',
        passport.authenticate('jwt', {
            session: false,
          }),
          students_v2);

    app.get('/students', 
        passport.authenticate('jwt', {
        session: false,
      }), (req, res, next) => {
        req.body = {
          ...req.query,
          branch_id: req.query.branch_id || req.headers['x-branch-id'] || req.user?.branch_id,
          school_id: req.query.school_id || req.headers['x-school-id'] || req.user?.school_id
        }
        students(req, res)
    });
    app.post('/students',
        passport.authenticate('jwt', {
            session: false,
          }),
        students);
    app.post('/students/attendance',  
        passport.authenticate('jwt', {
        session: false,
      }),
       studentAttendances);
    app.get('/students/attendance', 
        passport.authenticate('jwt', {
            session: false,
          }),
        (req, res, next) => {
        req.body = req.query
        studentAttendances(req, res)
    });

    app.post('/students/bulk',  
        passport.authenticate('jwt', {
        session: false,
      }),
      studentsBulk);

    app.post('/students/bulk/v2',  
        passport.authenticate('jwt', {
        session: false,
      }),
      studentsBulk_v2);

    app.post('/update-parent',
        passport.authenticate('jwt', {
            session: false,
          }),
          updateParent
    )

    // Soft delete student route
    app.post('/students/soft-delete',
        passport.authenticate('jwt', {
            session: false,
        }),
        softDeleteStudent
    )

    // POST /students/update-stream
    app.post("/students/update-stream", updateStudentStream);
    app.put('/students/:id',
        passport.authenticate('jwt', {
            session: false,
        }),
        updateStudentDetails
    )
};

