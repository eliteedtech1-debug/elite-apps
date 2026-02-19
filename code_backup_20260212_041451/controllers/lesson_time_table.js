const db = require("../models");

const lesson_time_table = async (req, res) => {
    console.log(req.body);

    try {
        const data = Array.isArray(req.body) ? req.body : [req.body];
        const responses = [];
        const errors = [];

        // Map each item to an async operation and collect promises
        const promises = data.map(async (item) => {
            const {
                query_type = null,
                id = null,
                day = null,
                class_name = null,
                subject = null,
                teacher_id = null,
                section = null,
                start_time = null,
                end_time = null,
                status = 'Active',
                branch_id = null,
                class_code = null,
            } = item;

            // Ensure teacher_id is null if it is empty
            const cleanTeacherId = teacher_id === '' || teacher_id == null ? null : teacher_id;

            try {
                const result = await db.sequelize.query(
                    `CALL lesson_time_table(:query_type, :id, :day, :class_name, :subject, :teacher_id, :section, :branch_id, :start_time, :end_time, :status, :school_id, :branch_id,:class_code)`,
                    {
                        replacements: {
                            query_type,
                            id,
                            day,
                            class_name,
                            subject,
                            teacher_id: cleanTeacherId,
                            section,
                            start_time,
                            end_time,
                            status,
                            school_id: req.user.school_id,
                            branch_id:branch_id??req.user.branch_id,
                            class_code
                        },
                    }
                );
                responses.push(result);
            } catch (err) {
                console.error({err});
                
                errors.push(err);
            }
        });

        // Wait for all promises to resolve
        await Promise.all(promises);

        // Handle responses and errors
        if (errors.length > 0) {
            return res.status(500).json({ success: false, errors });
        }

        return res.json({
            success: true,
            data: data.length === 1 ? responses[0] : responses,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { lesson_time_table };
