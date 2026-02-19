const { class_routine, get_class_routine } = require("../controllers/class_routine");
const config = require("../config/config");

module.exports = (app) => {
    app.post(
        "/class_routine",
        //    config.authRequest
        class_routine
    );
    app.get(
        "/get_class_routine",
        //    config.authRequest
        get_class_routine
    );
};

