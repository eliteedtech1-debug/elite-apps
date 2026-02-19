// const { lesson } = require("../controllers/grades");
const passport = require("passport");
const config = require("../config/config");
const { lessons, commentLessons } = require("../controllers/lessons");

module.exports = (app) => {
    app.post(
        "/lessons",
         passport.authenticate('jwt', { session: false }),
        lessons
    );
    app.put(
        "/lessons",
         passport.authenticate('jwt', { session: false }),
        lessons
    );
    
    app.get('/lessons', 
     passport.authenticate('jwt', { session: false }),
    (req, res, nex) =>{
        req.body = req.query;
        lessons(req, res);
    })
    app.delete('/lessons', 
     passport.authenticate('jwt', { session: false }),
    (req, res, nex) =>{
        req.body = req.query;
        lessons(req, res);
    })
    
    app.post(
        "/commentLessons",
         passport.authenticate('jwt', { session: false }),
        commentLessons
    );
    app.get('/commentLessons',
     passport.authenticate('jwt', { session: false }),
    (req, res, nex) =>{
        req.body = req.query;
        commentLessons(req, res);
    })
    
};