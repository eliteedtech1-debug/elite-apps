const db =  require("../models");

const class_rooms = (req, res) => {
    // const {  } = req.body;
    const {
        query_type = "create",
        id = null,
        block_no = null,
        capacity = null,
        status = null,
    } = req.body;

    db.sequelize
        .query(
            `call class_rooms(:query_type,:id,:block_no,:capacity,:status)`,
            {
                replacements: {
                    query_type,
                    id,
                    block_no,
                    capacity,
                    status,
                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};



const get_class_rooms = (req, res) => {
    // const {  } = req.body;
    const {
        query_type = "select",
        id = null,
        block_no = null,
        capacity = null,
        status = null,
    } = req.body;

    db.sequelize
        .query(
            `call class_rooms(:query_type,:id,:block_no,:capacity,:status)`,
            {
                replacements: {
                    id,
                    query_type,
                    block_no,
                    capacity,
                    status,
                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};

module.exports =  { class_rooms, get_class_rooms };
