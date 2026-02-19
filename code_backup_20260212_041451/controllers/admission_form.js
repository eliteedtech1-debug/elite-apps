const db =  require("../models");

const admission_form = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        query_type = "create",
        pupils_name = null,
        pupils_last_name ="",
        date_of_birth = null,
        religion = null,
        health_needs = null,
        medical_report = null,
        last_school = null,
        last_class = null,
        nationality = null,
        state_of_origin = null,
        town_lga = null,
        father_name = null,
        father_occupation = null,
        father_contact_address = null,
        father_postal_address = null,
        father_place_of_work = null,
        father_telephone = null,
        father_email = null,
        mother_name = null,
        mother_occupation = null,
        mother_address = null,
        mother_place_of_work = null,
        mother_telephone = null,
        mother_email = null,
        next_of_kin = null,
        next_of_kin_occupation = null,
        next_of_kin_contact_address = null,
        next_of_kin_email = null,
        next_of_kin_tel = null,
        student_signature = null,
        sponsor_signature = null,
        date_from = null,
        date_to = null,
    } = req.body;

    db.sequelize
        .query(
            `call admission_form(0,:query_type,:pupils_name,:pupils_last_name,:date_of_birth,:religion,:health_needs,:medical_report,:last_school,:last_class,:nationality,:state_of_origin,:town_lga,:father_name,:father_occupation,:father_contact_address,:father_postal_address,:father_place_of_work,:father_telephone,:father_email,:mother_name,:mother_occupation,:mother_address,:mother_place_of_work,:mother_telephone,:mother_email,:next_of_kin,:next_of_kin_occupation,:next_of_kin_contact_address,:next_of_kin_email,:next_of_kin_tel,:student_signature,:sponsor_signature,:date_from,:date_to)`,
            {
                replacements: {
                    id,
                    query_type,
                    pupils_name,
                    pupils_last_name,
                    date_of_birth,
                    religion,
                    health_needs,
                    medical_report,
                    last_school,
                    last_class,
                    nationality,
                    state_of_origin,
                    town_lga,
                    father_name,
                    father_occupation,
                    father_contact_address,
                    father_postal_address,
                    father_place_of_work,
                    father_telephone,
                    father_email,
                    mother_name,
                    mother_occupation,
                    mother_address,
                    mother_place_of_work,
                    mother_telephone,
                    mother_email,
                    next_of_kin,
                    next_of_kin_occupation,
                    next_of_kin_contact_address,
                    next_of_kin_email,
                    next_of_kin_tel,
                    student_signature,
                    sponsor_signature,
                    date_from,
                    date_to,
                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};

const get_admission_form = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        query_type = "select",
        pupils_name = null,
        pupils_last_name ="",
        date_of_birth = null,
        religion = null,
        health_needs = null,
        medical_report = null,
        last_school = null,
        last_class = null,
        nationality = null,
        state_of_origin = null,
        town_lga = null,
        father_name = null,
        father_occupation = null,
        father_contact_address = null,
        father_postal_address = null,
        father_place_of_work = null,
        father_telephone = null,
        father_email = null,
        mother_name = null,
        mother_occupation = null,
        mother_address = null,
        mother_place_of_work = null,
        mother_telephone = null,
        mother_email = null,
        next_of_kin = null,
        next_of_kin_occupation = null,
        next_of_kin_contact_address = null,
        next_of_kin_email = null,
        next_of_kin_tel = null,
        student_signature = null,
        sponsor_signature = null,
        date_from = null,
        date_to = null,
    } = req.body;

    db.sequelize
        .query(
            `call admission_form(0,:query_type,:pupils_name,:pupils_last_name,:date_of_birth,:religion,:health_needs,:medical_report,:last_school,:last_class,:nationality,:state_of_origin,:town_lga,:father_name,:father_occupation,:father_contact_address,:father_postal_address,:father_place_of_work,:father_telephone,:father_email,:mother_name,:mother_occupation,:mother_address,:mother_place_of_work,:mother_telephone,:mother_email,:next_of_kin,:next_of_kin_occupation,:next_of_kin_contact_address,:next_of_kin_email,:next_of_kin_tel,:student_signature,:sponsor_signature,:date_from,:date_to)`,
            {
                replacements: {
                    id,
                    query_type,
                    pupils_name,
                    pupils_last_name,
                    date_of_birth,
                    religion,
                    health_needs,
                    medical_report,
                    last_school,
                    last_class,
                    nationality,
                    state_of_origin,
                    town_lga,
                    father_name,
                    father_occupation,
                    father_contact_address,
                    father_postal_address,
                    father_place_of_work,
                    father_telephone,
                    father_email,
                    mother_name,
                    mother_occupation,
                    mother_address,
                    mother_place_of_work,
                    mother_telephone,
                    mother_email,
                    next_of_kin,
                    next_of_kin_occupation,
                    next_of_kin_contact_address,
                    next_of_kin_email,
                    next_of_kin_tel,
                    student_signature,
                    sponsor_signature,
                    date_from,
                    date_to,
                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};




module.exports = { admission_form, get_admission_form };
