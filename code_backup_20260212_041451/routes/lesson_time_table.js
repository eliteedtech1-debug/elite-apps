// const { lesson_time_table, get_lesson_time_table } = require("../controllers/lesson_time_table");
const passport = require("passport");
const config = require("../config/config");
const { lesson_time_table } = require("../controllers/lesson_time_table");
// const { lesson_time_table } = require("../controllers/lesson_time_table");

module.exports = (app) => {
    app.post(
        "/lesson_time_table",

            passport.authenticate('jwt', { session: false }),
        lesson_time_table
    );
    app.get(
        "/lesson_time_table",

            passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
            req.body = req.query;
            lesson_time_table(req, res)
        }
    );
};

