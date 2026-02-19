const { data_entry_form, get_data_entry_form } = require("../controllers/data_entry_form");
const config = require("../config/config");

module.exports = (app) => {
    app.post(
        "/data_entry_form",
        //    config.authRequest
        data_entry_form
    );
    app.get(
        "/get_data_entry_form",
        //    config.authRequest
        get_data_entry_form
    );
};

