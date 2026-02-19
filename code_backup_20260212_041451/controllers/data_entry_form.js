const db =  require("../models");

const data_entry_form = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        query_type = "create",
        date = null,
        admission_number = null,
        class1 = null,
        stream = null,
        first_name1 = null,
        middle_name = null,
        surname = null,
        sex = null,
        bloog_group = null,
        email = null,
        nationality = null,
        state_of_origin = null,
        home_address = null,
        street = null,
        city = null,
        first_name = null,
        relationship = null,
        mobile_no = null,
        address = null,
        street1 = null,
        city1 = null,
        state = null,
    } = req.body;

    db.sequelize
        .query(
            `call data_entry_form(0,:query_type,:date,:admission_number,:class1,:stream,:first_name1,:middle_name,:surname,:sex,:bloog_group,:email,:nationality,:state_of_origin,:home_address,:street,:city,:first_name,:relationship,:mobile_no,:address,:street1,:city1,:state)`,
            {
                replacements: {
                    id,
                    query_type,
                    date,
                    admission_number,
                    class1,
                    stream,
                    first_name1,
                    middle_name,
                    surname,
                    sex,
                    bloog_group,
                    email,
                    nationality,
                    state_of_origin,
                    home_address,
                    street,
                    city,
                    first_name,
                    relationship,
                    mobile_no,
                    address,
                    street1,
                    city1,
                    state,
                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};



const get_data_entry_form = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        query_type = "select",
        date = null,
        admission_number = null,
        class1 = null,
        stream = null,
        first_name1 = null,
        middle_name = null,
        surname = null,
        sex = null,
        bloog_group = null,
        email = null,
        nationality = null,
        state_of_origin = null,
        home_address = null,
        street = null,
        city = null,
        first_name = null,
        relationship = null,
        mobile_no = null,
        address = null,
        street1 = null,
        city1 = null,
        state = null,
    } = req.body;

    db.sequelize
        .query(
            `call data_entry_form(0,:query_type,:date,:admission_number,:class1,:stream,:first_name1,:middle_name,:surname,:sex,:bloog_group,:email,:nationality,:state_of_origin,:home_address,:street,:city,:first_name,:relationship,:mobile_no,:address,:street1,:city1,:state)`,
            {
                replacements: {
                    id,
                    query_type,
                    date,
                    admission_number,
                    class1,
                    stream,
                    first_name1,
                    middle_name,
                    surname,
                    sex,
                    bloog_group,
                    email,
                    nationality,
                    state_of_origin,
                    home_address,
                    street,
                    city,
                    first_name,
                    relationship,
                    mobile_no,
                    address,
                    street1,
                    city1,
                    state,
                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};



module.exports= { data_entry_form, get_data_entry_form };
