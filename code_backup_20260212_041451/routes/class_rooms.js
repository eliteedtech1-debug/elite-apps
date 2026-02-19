const { class_rooms, get_class_rooms } = require("../controllers/class_rooms");
const config = require("../config/config");

module.exports = (app) => {
    app.post(
        "/class_rooms",
        //    config.authRequest
        class_rooms
    );
    app.get(
        "/get_class_rooms",
        //    config.authRequest
        get_class_rooms
    );
};

