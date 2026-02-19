const db =  require("../models");

const admission_number_generator = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        query_type = "create",
        school = null,
        class_type = null,
        admission_year = null,
        serial_no = null,
        type_of_school = null,

    } = req.body;

    db.sequelize
        .query(
            `call admission_number_generator(:id,:query_type,:school,:class_type,:admission_year,:serial_no,:type_of_school)`,
            {
                replacements: {
                    id,
                    query_type,
                    school,
                    class_type,
                    admission_year,
                    serial_no:serial_no!==''?serial_no:null,
                    type_of_school,


                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};



const get_admission_number_generator = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        query_type = "select_type_of_school",
        school = null,
        class_type = null,
        admission_year = null,
        serial_no = null,
        type_of_school = null,

    } = req.body;

    db.sequelize
        .query(
            `call admission_number_generator(:id,:query_type,:school,:class_type,:admission_year,:serial_no,:type_of_school)`,
            {
                replacements: {
                    id,
                    query_type,
                    school,
                    class_type,
                    admission_year,
                    serial_no:serial_no!==''?serial_no:null,
                    type_of_school,


                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};



module.exports = { admission_number_generator, get_admission_number_generator };
