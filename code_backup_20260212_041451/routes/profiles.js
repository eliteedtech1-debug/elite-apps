// const { lesson } = require("../controllers/grades");
const passport = require("passport");
const config = require("../config/config");
const { update_admin_profile, update_teacher_profile } = require("../controllers/profiles");

module.exports = (app) => {
    app.put(
        "/update_admin_profile",
         passport.authenticate('jwt', { session: false }),
         update_admin_profile
    );
    
    app.put('/update_teacher_profile', 
     passport.authenticate('jwt', { session: false }),
    (req, res, nex) =>{
        req.body = req.query;
        update_teacher_profile(req, res);
    })
    
    // app.post(
    //     "/getProfile",
    //      passport.authenticate('jwt', { session: false }),
    //     getProfile
    // );
    // app.get('/getProfile',
    //  passport.authenticate('jwt', { session: false }),
    // (req, res, nex) =>{
    //     req.body = req.query;
    //     getProfile(req, res);
    // })
    
};