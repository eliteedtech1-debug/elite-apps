const db =  require("../models");

const class_routine = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        query_type = "create",
        teacher = null,
        class_ = null,
        section = null,
        day = null,
        start_time = null,
        end_time = null,
        class_room = null,
    } = req.body;

    db.sequelize
        .query(
            `call class_routine(0,:query_type,:teacher,:class_,:section,:day,:start_time,:end_time,:class_room)`,
            {
                replacements: {
                    id,
                    query_type,
                    teacher,
                    class_,
                    section,
                    day,
                    start_time,
                    end_time,
                    class_room,

                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};



const get_class_routine = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        query_type = "select",
        teacher = null,
        class_ = null,
        section = null,
        day = null,
        start_time = null,
        end_time = null,
        class_room = null,

    } = req.body;

    db.sequelize
        .query(
            `call class_routine(0,:query_type,:teacher,:class_,:section,:day,:start_time,:end_time,:class_room)`,
            {
                replacements: {
                    id,
                    query_type,
                    teacher,
                    class_,
                    section,
                    day,
                    start_time,
                    end_time,
                    class_room,

                },
            }
        )
        .then((results) => res.json({ success: true, results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};



module.exports =  { class_routine, get_class_routine };
