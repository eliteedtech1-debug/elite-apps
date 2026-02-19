const moment = require("moment");
const db = require("../models");

const examinations = (req, res) => {
    // const {  } = req.body;
    const {
        id = null,
        teacher_id = null,
        query_type = "create",
        class_name = null,
        subject_code = null,
        exam_type = null,
        duration = null,
        start_time = null,
        end_time = null,
        invigilator = null,
        exam_date = null,
        subject_name = null,
        class_code = null,
        title = null,
        term = null,
        academic_year = null,
        branch_id = null,
    } = req.body;

    db.sequelize
        .query(
            `call examinations(:query_type,:id, :teacher_id, :subject_name, :title, :class_name,:class_code,:subject_code,:exam_type,:duration,:start_time,:end_time,:invigilator,:exam_date,:term,:academic_year,:school_id, :branch_id)`,
            {
                replacements: {
                    id,
                    teacher_id,
                    subject_name,
                    query_type,
                    exam_type,
                    title,
                    class_name,
                    class_code,
                    subject_code,
                    exam_type,
                    duration,
                    start_time: start_time ? moment.utc(start_time, 'h:mm A').local().format('h:mm A') : null,
                    end_time: end_time ? moment.utc(end_time, 'h:mm A').local().format('h:mm A') : null,
                    invigilator,
                    exam_date: exam_date ? moment.utc(exam_date, 'YYYY-MM-DD').local().format('YYYY-MM-DD') === 'Invalid date' ? null : moment.utc(exam_date, 'YYYY-MM-DD').local().format('YYYY-MM-DD') : null,
                    term,
                    academic_year,
                    school_id: req.user.school_id,
                    branch_id:branch_id ?? req.user.branch_id,
                },
            }
        )
        .then((results) => res.json({ success: true, data: results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};


const studentAggregator = (req, res) => {
    // const {  } = req.body;
    const {
        class_name = null,
    } = req.query;

    db.sequelize
        .query(
            `call studentAggregator(:class_name)`,
            {
                replacements: {
                    class_name,
                },
            }
        )
        .then((results) => res.json({ success: true, data: results }))
        .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
        });
};

// const get_exammination = (req, res) => {
//     const {
//         query_type = "select",
//         class_name = null,
//         subject = null,
//         exammination_hall = null,
//         duration = null,
//         start_time = null,
//         end_time = null,
//         invigilator = null,
//         exam_date = null,
//     } = req.body;

//     db.sequelize
//         .query(
//             `CALL exammination(0, :query_type, :class_name, :subject, :exammination_hall, :duration, :start_time, :end_time, :invigilator,:exam_date)`,
//             {
//                 replacements: {
//                     query_type,
//                     class_name,
//                     subject,
//                     exammination_hall,
//                     duration,
//                     start_time: start_time ? moment.utc(start_time).local().format('YYYY-MM-DD HH:mm:ss') : null,
//                     end_time: end_time ? moment.utc(end_time).local().format('YYYY-MM-DD HH:mm:ss') : null,
//                     invigilator,
//                     exam_date,
//                 },
//             }
//         )
//         .then((results) => res.json({ success: true, results }))
//         .catch((err) => {
//             console.error("Error in fetching examination data:", err);
//             res.status(500).json({ success: false, message: "Internal Server Error" });
//         });
// };

const examsAttendance = (req, res) => {
    // Ensure `data` is always an array for batch processing
    const data = Array.isArray(req.body) ? req.body : [req.body];

    // Map over data array to create a promise for each item
    const promises = data.map((item) => {
        const {
            query_type = null,
            id = null,
            teacher_name = null,
            teacher_id = null,
            section = null,
            class_name = null,
            day = null,
            status = null,
            student_name = null,
            admission_no = null,
            term = null,
            academic_year = null,
            start_date = null,
            end_date = null
        } = item;

        // Call the stored procedure with necessary replacements
        return db.sequelize.query(
            `CALL exams_attendance(
                :query_type,
                :id,
                :teacher_name,
                :teacher_id,
                :section,
                :class_name,
                :day,
                :status,
                :student_name,
                :admission_no,
                :term,
                :academic_year,
                :start_date,
                :end_date
            )`,
            {
                replacements: {
                    query_type,
                    id,
                    teacher_name,
                    teacher_id,
                    section,
                    class_name,
                    day,
                    status,
                    student_name,
                    admission_no,
                    term,
                    academic_year,
                    start_date,
                    end_date
                },
            }
        );
    });

    // Execute all promises and respond once all are completed
    Promise.all(promises)
        .then((results) => res.json({ success: true, data: results }))
        .catch((err) => {
            console.error(err);
            res.status(500).json({ success: false, error: err.message });
        });
};


// Bulk insert endpoint
async function examGradings(req, res) {
    const records = Array.isArray(req.body) ? req.body : [req.body];

    const promises = records.map((record) => {
        const {
            query_type = null,
            id = null,
            class_code = null,
            admission_no = null,
            student_name = null,
            subject = null,
            subject_code = null,
            academic_year = null,
            term = null,
            ca1Score = 0,
            ca2Score = 0,
            ca3Score = 0,
            ca4Score = 0,
            examScore = 0,
            mark_by = null,
            status = null,
            branch_id = null,
            school_id = null,

        } = record;

        return db.sequelize.query(
            `CALL student_grading(
                :query_type,
                :id,
                :class_code,
                :admission_no,
                :student_name,
                :subject,
                :subject_code,
                :academic_year,
                :term,
                :ca1Score,
                :ca2Score,
                :ca3Score,
                :ca4Score,
                :examScore,
                :mark_by,
                :status,
                :branch_id,
                :school_id
            )`,
            {
                replacements: {
                    query_type,
                    id,
                    class_code,
                    admission_no,
                    student_name,
                    subject,
                    subject_code,
                    academic_year,
                    term,
                    ca1Score: ca1Score > 0 ? ca1Score : 0,
                    ca2Score: ca2Score > 0 ? ca2Score : 0,
                    ca3Score: ca2Score > 0 ? ca3Score : 0,
                    ca4Score: ca2Score > 0 ? ca4Score : 0,
                    examScore: examScore > 0 ? examScore : 0,
                    mark_by,
                    status,
                    branch_id: req.user.branch_id ?? branch_id,
                    school_id: req.user.school_id,
                },
            })

    });

    try {
        const results = await Promise.all(promises);
        res.status(200).json({ success: true, data: results.flat() });
    } catch (error) {
        console.error('Error during bulk insert:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
};

module.exports = { examinations, examsAttendance, examGradings, studentAggregator };
