const { admission_number_generator, get_admission_number_generator } = require("../controllers/admission_number_generator");
const config = require("../config/config");

module.exports = (app) => {
    app.post(
        "/admission_number_generator",
        //    config.authRequest
        admission_number_generator
    );
    app.get(
        "/get_admission_number_generator",
        //    config.authRequest
        get_admission_number_generator
    );
};

