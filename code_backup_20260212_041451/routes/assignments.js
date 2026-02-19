// const { assignments } = require("../controllers/grades");
const passport = require("passport");
const config = require("../config/config");
const { assignments, studentAssignments, assignmentResponses, getAssignments, updateAssignments } = require("../controllers/assignments");

module.exports = (app) => {
    app.post(
        "/assignments",
        passport.authenticate('jwt', { session: false }),
        assignments
    );
    app.put(
        "/assignments",
        passport.authenticate('jwt', { session: false }),
        updateAssignments
    );
    app.get('/assignments',
        passport.authenticate('jwt', { session: false }),
        getAssignments
    )
    app.delete('/assignments',
        passport.authenticate('jwt', { session: false }),
        getAssignments
    )
    app.post('/student/assignments',
        passport.authenticate('jwt', { session: false }),
        studentAssignments
    );
    app.get('/student/assignments',
        passport.authenticate('jwt', { session: false }),
        (req, res) => {
            req.body = req.query;
            studentAssignments(req, res);
        })


    app.post('/assignment/responses',
        passport.authenticate('jwt', { session: false }),
        assignmentResponses
    );

    app.get('/assignment/responses',
        passport.authenticate('jwt', { session: false }),
        (req, res) => {
            req.body = req.query;
            assignmentResponses(req, res);
        })

};