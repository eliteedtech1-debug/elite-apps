const {
    schoolCalendar,
    taskTodos,
    syllabus,
    syllabusTracker,
    leaveRecords,
    exam_calendar,
    libraryCatalogue,
    bookSupplies,
    update_exam_calendar,
    generateTimetable,
    generateTimetable2,
    dashboardQuery,
    manageNoticeBoard,
    managePrivilages,
    reportTheme
} = require("../controllers/school-setups");
const config = require("../config/config");
const passport = require("passport");
// const { exam_calendar } = require("../controllers/exam_calendar");

module.exports = (app) => {
    app.post(
        "/school-calendar",
        passport.authenticate('jwt', { session: false }),
        schoolCalendar
    );
    app.get(
        "/school-calendar",
        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
            req.body = req.query;
            schoolCalendar(req, res);
        }
    );
    app.post("/task-todos",
        passport.authenticate('jwt', { session: false }), taskTodos);
    app.get("/task-todos", (req, res, next) => {
        req.body = req.query;
        taskTodos(req, res);
    });
    app.post("/syllabus",
        passport.authenticate('jwt', { session: false }), syllabus);
    app.get("/syllabus",
        passport.authenticate('jwt', { session: false }), (req, res, next) => {
            req.body = req.query;
            syllabus(req, res);
        });

    app.post('/syllabus-tracker',

        passport.authenticate('jwt', { session: false }),
        syllabusTracker
    )
    app.get('/syllabus-tracker',

        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
            req.body = req.query;
            syllabusTracker(req, res)
        })
    app.post('/leave-records',

        passport.authenticate('jwt', { session: false }),
        leaveRecords
    )
    app.get('/leave-records',

        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
            req.body = req.query;
            leaveRecords(req, res)
        },
    )
    app.post(
        "/exam_calendar",

        passport.authenticate('jwt', { session: false }),
        exam_calendar
    );
    app.post("/update_exam_calendar",

        passport.authenticate('jwt', { session: false }),
        update_exam_calendar);
    app.get(
        "/exam_calendar",

        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
            req.body = req.query
            exam_calendar(req, res)
        }
    );
    app.post(
        "/library",

        passport.authenticate('jwt', { session: false }),
        libraryCatalogue
    );
    app.get(
        "/library",
        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
            req.body = req.query
            libraryCatalogue(req, res)
        }
    );
    app.post(
        "/books",
        passport.authenticate('jwt', { session: false }),
        bookSupplies
    );
    app.get(
        "/books",
        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
            req.body = req.query
            bookSupplies(req, res)
        }
    );
    app.post(
        "/generate-timetable",
        passport.authenticate('jwt', { session: false }),
        generateTimetable
    );
    

    app.post(
        "/automate-timetable",
        passport.authenticate('jwt', { session: false }),
        generateTimetable2
    );

    app.get('/dashboard_query',
        passport.authenticate('jwt', { session: false }),
        (req, res, nex) =>{
        req.body = req.query;
        dashboardQuery(req, res);
    })
    app.post('/notice-board',
        passport.authenticate('jwt', { session: false }),
        manageNoticeBoard
    )
    app.get('/notice-board',
        passport.authenticate('jwt', { session: false }),
        (req, res, next)=>{
            req.body = req.query;
            manageNoticeBoard(req, res, next)
        }
    );
    app.post('/school-setup/privileges',
        passport.authenticate('jwt', { session: false }),
        managePrivilages
    );
    

    app.post('/school-setup/report-theme',
        passport.authenticate('jwt', { session: false }),
        reportTheme
    );
};
