const { admission_form, get_admission_form,  } = require("../controllers/admission_form");
const config = require("../config/config");
// OLD: const { getResults } = require("../controllers/subject_management"); // DEPRECATED
// getResults function moved to appropriate controller or deprecated

module.exports = (app) => {
    app.post(
        "/admission_form",
        //    config.authRequest
        admission_form
    );
    app.get(
        "/get_admission_form",
        //    config.authRequest
        get_admission_form
    );

    // OLD: app.get("/get_results",getResults) // DEPRECATED - Move to appropriate results controller
    app.get("/get_results", (req, res) => {
        res.status(410).json({
            success: false,
            message: "This endpoint has been deprecated. Please use the appropriate results API.",
            deprecated: true
        });
    })
};

