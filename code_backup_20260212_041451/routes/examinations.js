const { examinations, examsAttendance, examGradings, studentAggregator } = require("../controllers/examinations");
const config = require("../config/config");
const passport = require("passport");

module.exports = (app) => {
    app.post('/exams/attendance', examsAttendance);
    app.get('/exams/attendance', (req, res, next) => {
        req.body = req.query
        examsAttendance(req, res)
    });

    app.post('/exams/gradings',
        passport.authenticate('jwt', { session: false }),
        examGradings);
    app.get('/exams/gradings', 
        passport.authenticate('jwt', { session: false }),
    (req, res, next) => {
        req.body = req.query
        examGradings(req, res)
    });

    app.get('/students-agrigator',
        passport.authenticate('jwt', { session: false }),
          studentAggregator);
    ;
    
};

