const moment = require("moment");
const db = require("../models");
const bcrypt = require("bcryptjs");
// const { NULL } = require("mysql2/lib/constants/types");

// const secondary_school_entrance_form = (req, res) => {
//     // const {  } = req.body;
//     const {
//         id = null,
//         query_type = "create",
//         upload = null,
//         type_of_application = null,
//         name_of_applicant = null,
//         home_address = null,
//         date_of_birth = null,
//         sex = null,
//         religion = null,
//         tribe = null,
//         school_attended = null,
//         class1 = null,
//         state_of_origin = null,
//         l_g_a = null,
//         nationality = null,
//         time = null,
//         venue = null,
//         common_entrance = null,
//         placement = null,
//         examination_date = null,
//         date = null,
//         first_name = null,
//         examination_number = null,
//         father_name = null,
//         state_of_origin1 = null,
//         address = null,
//         school = null,
//         examination_number1 = null,
//         name1 = null,
//         mother_name = null,
//         state_of_origin3 = null,
//         state_of_origin2 = null,
//         home_address1 = null,
//         office_marker_address = null,
//         telephone_address = null,
//         other_score = null,
//         venue1 = null,
//         image = null,
//         mathematics = null,
//         english = null,
//         others = null,
//         admission_no = null,
//         last_school_attended = null,
//         special_health_needs = null,
//         date_of_birth1 = null,
//         father_place_of_work = null,
//         father_occapation = null,
//         blood_group = null,
//         academic_year = null,
//         admission_date = null,
//         roll_number = null,
//         status = null,
//         section = null,
//         house = null,
//         category = null,
//         primary_contact_number = null,
//         other_score = null,
//         mother_tongue = null,
//         language_known = null,
//         application_no = null,
//         admission_year = null,
//         type_of_school = null,
//         class_type = null,
//         current_class = null,
//         medical_condition = null,
//         upload_transfer_certificate = null,
//         parents = [],
//         exam_subjects = [],
//         last_class=null,
//     } = req.body;
//     console.log(req.body)

//     // console.log(query_type, "NAGUDU")
//     // if (query_type === 'create') {
//     let schoolPrefix = 'YMA'
//     let year = moment().format("YY")
//     const classType = type_of_application === 'PRIMARY' ? "APP-PRI" : type_of_application === 'SECONDARY' ? "APP-SEC" : type_of_application === 'NURSERY' ? "APP-NUR" : "APP-PRE"
//     // db.sequelize
//     //     .query(
//     //         `call admission_number_generator(:id,:query_type,:school,:class_type,:year,:serial_no,:type_of_school)`, {
//     //         replacements: {
//     //             id: '',
//     //             query_type: 'select',
//     //             school: schoolPrefix,
//     //             class_type: classType,
//     //             year: year,
//     //             serial_no: '',
//     //             type_of_school,
//     //         },
//     //     }
//     //     )
//     //     .then((resp) => {
//     //         console.log(resp)
//     //         const nextNo = resp && resp.length ? resp[0].serial_no : ''

//     //         const new_application_no = schoolPrefix + '/' + classType + '/' + year + '/' + nextNo.toString().padStart(3, '0')

//     db.sequelize
//         .query(`CALL students_applications(
//         :query_type,
//         :id,
//         :upload,
//         :type_of_application,
//         :name_of_applicant,
//         :home_address,
//         :date_of_birth,
//         :sex,
//         :religion,
//         :tribe,
//         :school_attended,
//         :last_class,
//         :state_of_origin,
//         :l_g_a,
//         :nationality,
//         :examination_date,
//         :address,
//         :school,
//         :mathematics,
//         :english,
//         :others,
//         :other_score,
//         :admission_no,
//         :last_school_attended,
//         :special_health_needs,
//         :father_place_of_work,
//         :father_occapation,
//         :blood_group,
//         :academic_year,
//         :admission_date,
//         :status,
//         :mother_tongue,
//         :language_known,
//         :application_no,
//         :admission_year,
//         :class_type,
//         :current_class,
//         :medical_condition,
//         :upload_transfer_certificate)`,
//             {
//                 replacements: {
//                     id,
//                     query_type,
//                     upload,
//                     type_of_application,
//                     name_of_applicant,
//                     home_address,
//                     date_of_birth,
//                     sex,
//                     religion,
//                     tribe,
//                     school_attended,
//                     class1,
//                     state_of_origin,
//                     l_g_a,
//                     nationality,
//                     time,
//                     venue,
//                     common_entrance,
//                     placement,
//                     examination_date:null,
//                     date,
//                     first_name,
//                     examination_number,
//                     father_name,
//                     state_of_origin1,
//                     address,
//                     school,
//                     mathematics,
//                     english,
//                     others,
//                     other_score,
//                     last_school_attended,
//                     special_health_needs,
//                     date_of_birth1,
//                     father_place_of_work,
//                     father_occapation,
//                     blood_group,
//                     admission_no,
//                     academic_year,
//                     admission_date,
//                     roll_number,
//                     status: "Assigned",
//                     mother_tongue,
//                     language_known,
//                     application_no,
//                     admission_year,
//                     class_type,
//                     current_class,
//                     medical_condition,
//                     upload_transfer_certificate,
//                     other_score: 0,
//                     section,
//                     last_class
//                 },
//             }
//         )
//         .then((results) => {
//             console.log(results)

//             // console.log(`${school}+ '/', ${classType}+ '/', ${year}+ '/', ${admin_no}`)

//             parents.forEach((item) => {
//                 const { id = "0", query_type = "create", student_name = null, phone_no = null, email = null, ralationship = null, is_gurdian = null, occupation = null } = item;
//                 db.sequelize.query(`CALL parent(:id,:query_type,:student_name,:phone_no,:email,:ralationship,:is_gurdian,:occupation,:admission_no)`, {
//                     replacements: {
//                         id,
//                         query_type,
//                         student_name,
//                         phone_no,
//                         email,
//                         ralationship,
//                         is_gurdian,
//                         occupation,
//                         admission_no: results[0].admission_number,
//                     }
//                 })
//             })

//             exam_subjects.forEach((subject) => {
//                 db.sequelize.query(`CALL exam_subjects(:query_type,NULL,:application_no,::subject,:score,:status)`, {
//                     replacements: {
//                         query_type: "create",
//                         application_no: results[0].admission_number,
//                         subject,
//                         score: null,
//                         status: "NOT_ATTEMPTED",
//                     }
//                 })
//             });

//             res.json({ success: true, results })

//         })
//         .catch((err) => {
//             console.log(err);
//             res.status(500).json({ success: false });
//         });
//     // })
//     // }
//     // else {
//     //     db.sequelize
//     //         .query(
//     //             `call secondary_school_entrance_form(:id,:query_type,:type_of_application,:name_of_applicant,:home_address,:date_of_birth,:sex,:religion,:tribe,:school_attended,:class1,:state_of_origin,:l_g_a,:nationality,:time,:venue,:common_entrance,:placement,:examination_date,:date,:first_name,:examination_number,:father_name,:state_of_origin1,:address,:school,:examination_number1,:name1,:mother_name,:state_of_origin3,:state_of_origin2,:home_address1,:office_marker_address,:telephone_address,:other_score,:venue1,:image,:mathematics,:english,:others,:admission_no,:last_school_attended,:special_health_needs,:date_of_birth1,:father_place_of_work,:father_occapation,:blood_group,:academic_year,:admission_date,:roll_number,:status,:section,:house,:category,:primary_contact_number,:caste,:mother_tongue,:language_known,:application_no)`,
//     //             {
//     //                 replacements: {
//     //                     id,
//     //                     query_type,
//     //                     type_of_application,
//     //                     name_of_applicant,
//     //                     home_address,
//     //                     date_of_birth,
//     //                     sex,
//     //                     religion,
//     //                     tribe,
//     //                     school_attended,
//     //                     class1,
//     //                     state_of_origin,
//     //                     l_g_a,
//     //                     nationality,
//     //                     time,
//     //                     venue,
//     //                     common_entrance,
//     //                     placement,
//     //                     examination_date,
//     //                     date,
//     //                     first_name,
//     //                     examination_number,
//     //                     father_name,
//     //                     state_of_origin1,
//     //                     address,
//     //                     school,
//     //                     examination_number1,
//     //                     name1,
//     //                     mother_name,
//     //                     state_of_origin3,
//     //                     state_of_origin2,
//     //                     home_address1,
//     //                     office_marker_address,
//     //                     telephone_address,
//     //                     other_score,
//     //                     venue1,
//     //                     image: null,
//     //                     mathematics,
//     //                     english,
//     //                     others,
//     //                     admission_no,
//     //                     last_school_attended,
//     //                     special_health_needs,
//     //                     date_of_birth1,
//     //                     father_place_of_work,
//     //                     father_occapation,
//     //                     blood_group,
//     //                     academic_year,
//     //                     admission_date,
//     //                     roll_number,
//     //                     status,
//     //                     section,
//     //                     house,
//     //                     category,
//     //                     primary_contact_number,
//     //                     caste,
//     //                     mother_tongue,
//     //                     language_known,
//     //                     application_no,
//     //                 },
//     //             }
//     //         )
//     //         .then((results) => res.json({ success: true, results }))
//     //         .catch((err) => {
//     //             console.log(err);
//     //             res.status(500).json({ success: false });
//     //         });
//     // }
// };

// const secondary_school_entrance_form = (req, res) => {
//     // const {  } = req.body;
//     const {
//         id = null,
//         query_type = "create",
//         upload = null,
//         type_of_application = null,
//         name_of_applicant = null,
//         home_address = null,
//         date_of_birth = null,
//         sex = null,
//         religion = null,
//         tribe = null,
//         school_attended = null,
//         class1 = null,
//         state_of_origin = null,
//         l_g_a = null,
//         nationality = null,
//         time = null,
//         venue = null,
//         common_entrance = null,
//         placement = null,
//         examination_date = null,
//         date = null,
//         first_name = null,
//         examination_number = null,
//         father_name = null,
//         state_of_origin1 = null,
//         address = null,
//         school = null,
//         examination_number1 = null,
//         name1 = null,
//         mother_name = null,
//         state_of_origin3 = null,
//         state_of_origin2 = null,
//         home_address1 = null,
//         office_marker_address = null,
//         telephone_address = null,
//         other_score = null,
//         venue1 = null,
//         image = null,
//         mathematics = null,
//         english = null,
//         others = null,
//         admission_no = null,
//         last_school_attended = null,
//         special_health_needs = null,
//         date_of_birth1 = null,
//         father_place_of_work = null,
//         father_occapation = null,
//         blood_group = null,
//         academic_year = null,
//         admission_date = null,
//         roll_number = null,
//         status = null,
//         section = null,
//         house = null,
//         category = null,
//         primary_contact_number = null,
//         other_score = null,
//         mother_tongue = null,
//         language_known = null,
//         application_no = null,
//         admission_year = null,
//         type_of_school = null,
//         class_type = null,
//         current_class = null,
//         medical_condition = null,
//         upload_transfer_certificate = null,
//         parents = [],
//         exam_subjects = [],
//         last_class=null
//     } = req.body;
//     console.log(req.body)

//     // console.log(query_type, "NAGUDU")
//     // if (query_type === 'create') {
//     let schoolPrefix = 'YMA'
//     let year = moment().format("YY")
//     const classType = type_of_application === 'PRIMARY' ? "APP-PRI" : type_of_application === 'SECONDARY' ? "APP-SEC" : type_of_application === 'NURSERY' ? "APP-NUR" : "APP-PRE"
//     // db.sequelize
//     //     .query(
//     //         `call admission_number_generator(:id,:query_type,:school,:class_type,:year,:serial_no,:type_of_school)`, {
//     //         replacements: {
//     //             id: '',
//     //             query_type: 'select',
//     //             school: schoolPrefix,
//     //             class_type: classType,
//     //             year: year,
//     //             serial_no: '',
//     //             type_of_school,
//     //         },
//     //     }
//     //     )
//     //     .then((resp) => {
//     //         console.log(resp)
//     //         const nextNo = resp && resp.length ? resp[0].serial_no : ''

//     //         const new_application_no = schoolPrefix + '/' + classType + '/' + year + '/' + nextNo.toString().padStart(3, '0')

//     db.sequelize
//         .query(`CALL students_applications(
//         :query_type,
//         :id,
//         :upload,
//         :type_of_application,
//         :name_of_applicant,
//         :home_address,
//         :date_of_birth,
//         :sex,
//         :religion,
//         :tribe,
//         :school_attended,
//         :last_class,
//         :state_of_origin,
//         :l_g_a,
//         :nationality,
//         :examination_date,
//         :address,
//         :school,
//         :mathematics,
//         :english,
//         :others,
//         :other_score,
//         :admission_no,
//         :last_school_attended,
//         :special_health_needs,
//         :father_place_of_work,
//         :father_occapation,
//         :blood_group,
//         :academic_year,
//         :admission_date,
//         :status,
//         :mother_tongue,
//         :language_known,
//         :application_no,
//         :admission_year,
//         :class_type,
//         :current_class,
//         :medical_condition,
//         :upload_transfer_certificate)`,
//             {
//                 replacements: {
//                     id,
//                     query_type,
//                     upload,
//                     type_of_application,
//                     name_of_applicant,
//                     home_address,
//                     date_of_birth,
//                     sex,
//                     religion,
//                     tribe,
//                     school_attended,
//                     class1,
//                     state_of_origin,
//                     l_g_a,
//                     nationality,
//                     time,
//                     venue,
//                     common_entrance,
//                     placement,
//                     examination_date:null,
//                     date,
//                     first_name,
//                     examination_number,
//                     father_name,
//                     state_of_origin1,
//                     address,
//                     school,
//                     mathematics,
//                     english,
//                     others,
//                     other_score,
//                     last_school_attended,
//                     special_health_needs,
//                     date_of_birth1,
//                     father_place_of_work,
//                     father_occapation,
//                     blood_group,
//                     admission_no,
//                     academic_year,
//                     admission_date,
//                     roll_number,
//                     status: "Assigned",
//                     mother_tongue,
//                     language_known,
//                     application_no,
//                     admission_year,
//                     class_type,
//                     current_class,
//                     medical_condition,
//                     upload_transfer_certificate,
//                     other_score: 0,
//                     section,
//                     last_class
//                 },
//             }
//         )
//         .then((results) => {
//             console.log(results)

//             // console.log(`${school}+ '/', ${classType}+ '/', ${year}+ '/', ${admin_no}`)

//             parents.forEach((item) => {
//                 const { id = "0", query_type = "create", student_name = null, phone_no = null, email = null, ralationship = null, is_gurdian = null, occupation = null } = item;
//                 db.sequelize.query(`CALL parent(:id,:query_type,:student_name,:phone_no,:email,:ralationship,:is_gurdian,:occupation,:admission_no)`, {
//                     replacements: {
//                         id,
//                         query_type,
//                         student_name,
//                         phone_no,
//                         email,
//                         ralationship,
//                         is_gurdian,
//                         occupation,
//                         admission_no: results[0].admission_number,
//                     }
//                 })
//             })

//             exam_subjects.forEach((subject) => {
//                 db.sequelize.query(`CALL exam_subjects(:query_type,NULL,:application_no,::subject,:score,:status)`, {
//                     replacements: {
//                         query_type: "create",
//                         application_no: results[0].admission_number,
//                         subject,
//                         score: null,
//                         status: "NOT_ATTEMPTED",
//                     }
//                 })
//             });

//             res.json({ success: true, results })

//         })
//         .catch((err) => {
//             console.log(err);
//             res.status(500).json({ success: false });
//         });
//     // })
//     // }
//     // else {
//     //     db.sequelize
//     //         .query(
//     //             `call secondary_school_entrance_form(:id,:query_type,:type_of_application,:name_of_applicant,:home_address,:date_of_birth,:sex,:religion,:tribe,:school_attended,:class1,:state_of_origin,:l_g_a,:nationality,:time,:venue,:common_entrance,:placement,:examination_date,:date,:first_name,:examination_number,:father_name,:state_of_origin1,:address,:school,:examination_number1,:name1,:mother_name,:state_of_origin3,:state_of_origin2,:home_address1,:office_marker_address,:telephone_address,:other_score,:venue1,:image,:mathematics,:english,:others,:admission_no,:last_school_attended,:special_health_needs,:date_of_birth1,:father_place_of_work,:father_occapation,:blood_group,:academic_year,:admission_date,:roll_number,:status,:section,:house,:category,:primary_contact_number,:caste,:mother_tongue,:language_known,:application_no)`,
//     //             {
//     //                 replacements: {
//     //                     id,
//     //                     query_type,
//     //                     type_of_application,
//     //                     name_of_applicant,
//     //                     home_address,
//     //                     date_of_birth,
//     //                     sex,
//     //                     religion,
//     //                     tribe,
//     //                     school_attended,
//     //                     class1,
//     //                     state_of_origin,
//     //                     l_g_a,
//     //                     nationality,
//     //                     time,
//     //                     venue,
//     //                     common_entrance,
//     //                     placement,
//     //                     examination_date,
//     //                     date,
//     //                     first_name,
//     //                     examination_number,
//     //                     father_name,
//     //                     state_of_origin1,
//     //                     address,
//     //                     school,
//     //                     examination_number1,
//     //                     name1,
//     //                     mother_name,
//     //                     state_of_origin3,
//     //                     state_of_origin2,
//     //                     home_address1,
//     //                     office_marker_address,
//     //                     telephone_address,
//     //                     other_score,
//     //                     venue1,
//     //                     image: null,
//     //                     mathematics,
//     //                     english,
//     //                     others,
//     //                     admission_no,
//     //                     last_school_attended,
//     //                     special_health_needs,
//     //                     date_of_birth1,
//     //                     father_place_of_work,
//     //                     father_occapation,
//     //                     blood_group,
//     //                     academic_year,
//     //                     admission_date,
//     //                     roll_number,
//     //                     status,
//     //                     section,
//     //                     house,
//     //                     category,
//     //                     primary_contact_number,
//     //                     caste,
//     //                     mother_tongue,
//     //                     language_known,
//     //                     application_no,
//     //                 },
//     //             }
//     //         )
//     //         .then((results) => res.json({ success: true, results }))
//     //         .catch((err) => {
//     //             console.log(err);
//     //             res.status(500).json({ success: false });
//     //         });
//     // }
// };

const secondary_school_entrance_form = (req, res) => {
  // const {  } = req.body;
  const {
    id = null,
    query_type = "create",
    upload = null,
    type_of_application = null,
    name_of_applicant = null,
    home_address = null,
    date_of_birth = null,
    sex = null,
    religion = null,
    tribe = null,
    school_attended = null,
    class1 = null,
    state_of_origin = null,
    l_g_a = null,
    nationality = null,
    time = null,
    venue = null,
    common_entrance = null,
    placement = null,
    examination_date = null,
    date = null,
    first_name = null,
    examination_number = null,
    father_name = null,
    state_of_origin1 = null,
    address = null,
    school = null,
    examination_number1 = null,
    name1 = null,
    mother_name = null,
    state_of_origin3 = null,
    state_of_origin2 = null,
    home_address1 = null,
    office_marker_address = null,
    telephone_address = null,
    other_score = null,
    venue1 = null,
    image = null,
    mathe = null,
    english = null,
    other_subjects = null,
    admission_no = null,
    last_school_attended = null,
    special_health_needs = null,
    date_of_birth1 = null,
    father_place_of_work = null,
    father_occapation = null,
    blood_group = null,
    academic_year = null,
    admission_date = null,
    roll_number = null,
    status = null,
    section = null,
    house = null,
    category = null,
    primary_contact_number = null,
    caste = null,
    mother_tongue = null,
    language_known = null,
    application_no = null,
    admission_year = null,
    type_of_school = null,
    class_type = null,
    current_class = null,
    medical_condition = null,
    upload_transfer_certificate = null,
    parents = [],
    school_id = null,
  } = req.body;
  console.log(req.body);

  // console.log(query_type, "NAGUDU")
  // if (query_type === 'create') {
  let schoolPrefix = "YMA";
  let year = moment().format("YY");
  const classType =
    type_of_application === "PRIMARY"
      ? "APP-PRI"
      : type_of_application === "SECONDARY"
        ? "APP-SEC"
        : type_of_application === "NURSERY"
          ? "APP-NUR"
          : "APP-PRE";
  db.sequelize
    .query(
      `call school_applicants(:id,:query_type,:upload,:type_of_application,:name_of_applicant,:home_address,
            :date_of_birth,:sex,:religion,:tribe,:school_attended,:class1,:state_of_origin,:l_g_a,:nationality,:time,
            :venue,:common_entrance,:placement,:examination_date,:date,:first_name,:examination_number,:father_name,
            :state_of_origin1,:address,:school,:examination_number1,:name1,:mother_name,:state_of_origin3,:state_of_origin2,
            :home_address1,:office_marker_address,:telephone_address,:other_score,:venue1,:image,:mathe,:english,:other_subjects,:admission_no,
            :last_school_attended,:special_health_needs,:date_of_birth1,:father_place_of_work,:father_occapation,:blood_group,
            :academic_year,:admission_date,:roll_number,:status,:section,:house,:category,:primary_contact_number,:caste,
            :mother_tongue,:language_known,:application_no,:admission_year,:class_type,:current_class,:medical_condition,:upload_transfer_certificate,:school_id)`,
      {
        replacements: {
          id,
          query_type,
          upload,
          type_of_application,
          name_of_applicant,
          home_address,
          date_of_birth: moment(date_of_birth).isValid()
            ? moment(date_of_birth).format("YYYY-MM-DD") // returns a proper JS Date
            : null,
          sex,
          religion,
          tribe,
          school_attended,
          class1,
          state_of_origin,
          l_g_a,
          nationality,
          time,
          venue,
          common_entrance,
          placement,
          examination_date: null,
          date: null,
          first_name,
          examination_number,
          father_name,
          state_of_origin1,
          address,
          school: schoolPrefix,
          examination_number1,
          name1,
          mother_name,
          state_of_origin3,
          state_of_origin2,
          home_address1,
          office_marker_address,
          telephone_address,
          other_score: null,
          venue1,
          image: null,
          mathe,
          english,
          other_subjects,
          last_school_attended,
          special_health_needs,
          date_of_birth1: null,
          father_place_of_work,
          father_occapation,
          blood_group,
          admission_no,
          academic_year,
          admission_date: null,
          roll_number,
          status,
          section,
          house,
          category,
          primary_contact_number,
          caste,
          mother_tongue,
          language_known,
          application_no,
          admission_year: year,
          class_type: classType,
          current_class,
          medical_condition,
          upload_transfer_certificate,
          school_id,
        },
      }
    )
    .then((results) => {
      console.log(results);

      // console.log(`${school}+ '/', ${classType}+ '/', ${year}+ '/', ${admin_no}`)

      // parents.forEach((item) => {
      const {
        id = "0",
        query_type = "create",
        parent_fullname = null,
        parent_phone_no = null,
        parent_email = null,
        ralationship = null,
        is_gurdian = "Yes",
        occupation = null,
        school_id = null,
      } = req.body;
      db.sequelize.query(
        `CALL parents(:query_type,:id,:parent_fullname,:parent_phone_no,:parent_email,:ralationship,:is_gurdian,:occupation,:admission_no,:school_id)`,
        {
          replacements: {
            id,
            query_type,
            parent_fullname,
            parent_phone_no,
            parent_email,
            ralationship,
            is_gurdian,
            occupation,
            admission_no: results[0].admission_number,
            school_id,
          },
        }
      );

      res.json({ success: true, results });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
// })
// }
// else {
//     db.sequelize
//         .query(
//             `call secondary_school_entrance_form(:id,:query_type,:type_of_application,:name_of_applicant,:home_address,:date_of_birth,:sex,:religion,:tribe,:school_attended,:class1,:state_of_origin,:l_g_a,:nationality,:time,:venue,:common_entrance,:placement,:examination_date,:date,:first_name,:examination_number,:father_name,:state_of_origin1,:address,:school,:examination_number1,:name1,:mother_name,:state_of_origin3,:state_of_origin2,:home_address1,:office_marker_address,:telephone_address,:other_score,:venue1,:image,:mathe,:english,:others,:admission_no,:last_school_attended,:special_health_needs,:date_of_birth1,:father_place_of_work,:father_occapation,:blood_group,:academic_year,:admission_date,:roll_number,:status,:section,:house,:category,:primary_contact_number,:caste,:mother_tongue,:language_known,:application_no)`,
//             {
//                 replacements: {
//                     id,
//                     query_type,
//                     type_of_application,
//                     name_of_applicant,
//                     home_address,
//                     date_of_birth,
//                     sex,
//                     religion,
//                     tribe,
//                     school_attended,
//                     class1,
//                     state_of_origin,
//                     l_g_a,
//                     nationality,
//                     time,
//                     venue,
//                     common_entrance,
//                     placement,
//                     examination_date,
//                     date,
//                     first_name,
//                     examination_number,
//                     father_name,
//                     state_of_origin1,
//                     address,
//                     school,
//                     examination_number1,
//                     name1,
//                     mother_name,
//                     state_of_origin3,
//                     state_of_origin2,
//                     home_address1,
//                     office_marker_address,
//                     telephone_address,
//                     other_score,
//                     venue1,
//                     image: null,
//                     mathe,
//                     english,
//                     others,
//                     admission_no,
//                     last_school_attended,
//                     special_health_needs,
//                     date_of_birth1,
//                     father_place_of_work,
//                     father_occapation,
//                     blood_group,
//                     academic_year,
//                     admission_date,
//                     roll_number,
//                     status,
//                     section,
//                     house,
//                     category,
//                     primary_contact_number,
//                     caste,
//                     mother_tongue,
//                     language_known,
//                     application_no,
//                 },
//             }
//         )
//         .then((results) => res.json({ success: true, results }))
//         .catch((err) => {
//             console.log(err);
//             res.status(500).json({ success: false });
//         });
// }
const get_secondary_school_entrance_form = (req, res) => {
  // const {  } = req.body;
  const {
    id = null,
    query_type = "select",
    upload = null,
    type_of_application = null,
    name_of_applicant = null,
    home_address = null,
    date_of_birth = null,
    sex = null,
    religion = null,
    tribe = null,
    school_attended = null,
    class1 = null,
    state_of_origin = null,
    l_g_a = null,
    nationality = null,
    time = null,
    venue = null,
    common_entrance = null,
    placement = null,
    examination_date = null,
    date = null,
    first_name = null,
    examination_number = null,
    father_name = null,
    state_of_origin1 = null,
    address = null,
    school = null,
    examination_number1 = null,
    name1 = null,
    mother_name = null,
    state_of_origin3 = null,
    state_of_origin2 = null,
    home_address1 = null,
    office_marker_address = null,
    telephone_address = null,
    other_score = null,
    venue1 = null,
    image = null,
    mathematics = 0,
    english = 0,
    others = 0,
    admission_no = null,
    last_school_attended = null,
    special_health_needs = null,
    date_of_birth1 = null,
    father_place_of_work = null,
    father_occapation = null,
    blood_group = null,
    academic_year = null,
    admission_date = null,
    roll_number = 0,
    status = null,
    section = null,
    house = null,
    category = null,
    primary_contact_number = null,
    caste = null,
    mother_tongue = null,
    language_known = null,
    application_no = null,
    admission_year = null,
    class_type = null,
    current_class = null,
    medical_condition = null,
    upload_transfer_certificate = null,
    parents = [],
    school_id = null,
  } = req.query;

  db.sequelize
    .query(
      `call school_applicants(:id,:query_type,:upload,:type_of_application,:name_of_applicant,:home_address,:date_of_birth,:sex,:religion,:tribe,:school_attended,:class1,:state_of_origin,:l_g_a,:nationality,:time,:venue,:common_entrance,:placement,:examination_date,:date,:first_name,:examination_number,:father_name,:state_of_origin1,:address,:school,:examination_number1,:name1,:mother_name,:state_of_origin3,:state_of_origin2,:home_address1,:office_marker_address,:telephone_address,:other_score,:venue1,:image,:mathematics,:english,:others,:admission_no,:last_school_attended,:special_health_needs,:date_of_birth1,:father_place_of_work,:father_occapation,:blood_group,:academic_year,:admission_date,:roll_number,:status,:section,:house,:category,:primary_contact_number,:caste,:mother_tongue,:language_known,:application_no,:admission_year,:class_type,:current_class,:medical_condition,:upload_transfer_certificate,:school_id)`,
      {
        replacements: {
          id,
          query_type,
          upload,
          type_of_application,
          name_of_applicant,
          home_address,
          date_of_birth,
          sex,
          religion,
          tribe,
          school_attended,
          class1,
          state_of_origin,
          l_g_a,
          nationality,
          time: null,
          venue,
          common_entrance,
          placement,
          examination_date: null,
          date,
          first_name,
          examination_number,
          father_name,
          state_of_origin1,
          address,
          school,
          examination_number1,
          name1,
          mother_name,
          state_of_origin3,
          state_of_origin2,
          home_address1,
          office_marker_address,
          telephone_address,
          other_score: null,
          venue1,
          image: null,
          mathematics,
          english,
          others,
          admission_no,
          last_school_attended,
          special_health_needs,
          date_of_birth1: null,
          father_place_of_work,
          father_occapation,
          blood_group,
          academic_year,
          admission_date,
          roll_number,
          status,
          section,
          house,
          category,
          primary_contact_number,
          caste,
          mother_tongue,
          language_known,
          application_no,
          admission_year,
          class_type,
          current_class,
          medical_condition,
          upload_transfer_certificate,
          school_id,
        },
      }
    )
    .then((results) => {
      if (query_type === "create") {
        parents.forEach((item) => {
          const {
            id = null,
            query_type = "create",
            fullname = null,
            phone_no = null,
            email = null,
            ralationship = null,
            is_gurdian = null,
            occupation = null,
            school_id = null,
          } = item;
          db.sequelize.query(
            `CALL parent(:id,:query_type,:fullname,:phone_no,:email,:ralationship,:is_gurdian,:occupation,:admission_no,:school_id)`,
            {
              replacements: {
                id,
                query_type,
                fullname,
                phone_no,
                email,
                ralationship,
                is_gurdian,
                occupation,
                admission_no: results[0].admission_no,
                school_id,
              },
            }
          );
        });
      }
      res.json({ success: true, results });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

const get_secondary_school_entrance_form_ = (req, res) => {
  // const {  } = req.body;
  const {
    id = null,
    query_type = "select_user",
    upload = null,
    type_of_application = null,
    name_of_applicant = null,
    home_address = null,
    date_of_birth = null,
    sex = null,
    religion = null,
    tribe = null,
    school_attended = null,
    class1 = null,
    state_of_origin = null,
    l_g_a = null,
    nationality = null,
    time = null,
    venue = null,
    common_entrance = null,
    placement = null,
    examination_date = null,
    date = null,
    first_name = null,
    examination_number = null,
    father_name = null,
    state_of_origin1 = null,
    address = null,
    school = null,
    examination_number1 = null,
    name1 = null,
    mother_name = null,
    state_of_origin3 = null,
    state_of_origin2 = null,
    home_address1 = null,
    office_marker_address = null,
    telephone_address = null,
    other_score = null,
    venue1 = null,
    image = null,
    mathematics = 0,
    english = 0,
    others = 0,
    admission_no = null,
    last_school_attended = null,
    special_health_needs = null,
    date_of_birth1 = null,
    father_place_of_work = null,
    father_occapation = null,
    blood_group = null,
    academic_year = null,
    admission_date = null,
    roll_number = 0,
    status = null,
    section = null,
    house = null,
    category = null,
    primary_contact_number = null,
    caste = null,
    mother_tongue = null,
    language_known = null,
    application_no = null,
    admission_year = null,
    class_type = null,
    // current_class = null,
    medical_condition = null,
    upload_transfer_certificate = null,
    // subject_type = null,
    school_id = null,
  } = req.query;

  const { current_class } = req.params;

  db.sequelize
    .query(
      `call school_applicants(:id,:query_type,:upload,:type_of_application,:name_of_applicant,:home_address,:date_of_birth,:sex,:religion,:tribe,:school_attended,:class1,:state_of_origin,:l_g_a,:nationality,:time,:venue,:common_entrance,:placement,:examination_date,:date,:first_name,:examination_number,:father_name,:state_of_origin1,:address,:school,:examination_number1,:name1,:mother_name,:state_of_origin3,:state_of_origin2,:home_address1,:office_marker_address,:telephone_address,:other_score,:venue1,:image,:mathematics,:english,:others,:admission_no,:last_school_attended,:special_health_needs,:date_of_birth1,:father_place_of_work,:father_occapation,:blood_group,:academic_year,:admission_date,:roll_number,:status,:section,:house,:category,:primary_contact_number,:caste,:mother_tongue,:language_known,:application_no,:admission_year,:class_type,:current_class,:medical_condition,:upload_transfer_certificate,:school_id);`,
      {
        replacements: {
          id,
          query_type,
          upload,
          type_of_application,
          name_of_applicant,
          home_address,
          date_of_birth,
          sex,
          religion,
          tribe,
          school_attended,
          class1,
          state_of_origin,
          l_g_a,
          nationality,
          time: null,
          venue,
          common_entrance,
          placement,
          examination_date: null,
          date,
          first_name: 0,
          examination_number,
          father_name,
          state_of_origin1,
          address,
          school,
          examination_number1,
          name1,
          mother_name,
          state_of_origin3,
          state_of_origin2,
          home_address1,
          office_marker_address,
          telephone_address,
          other_score: null,
          venue1,
          image: null,
          mathematics,
          english,
          others,
          admission_no,
          last_school_attended,
          special_health_needs,
          date_of_birth1,
          father_place_of_work,
          father_occapation,
          blood_group,
          academic_year,
          admission_date,
          roll_number,
          status,
          section,
          house,
          category,
          primary_contact_number,
          caste,
          mother_tongue,
          language_known,
          application_no,
          admission_year,
          class_type,
          current_class: current_class,
          medical_condition,
          upload_transfer_certificate,
          school_id,
        },
      }
    )
    .then((results) => res.json({ success: true, results }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

const update_secondary_school_entrance_form = (req, res) => {
  // const {  } = req.body;
  const {
    query_type = null,
    upload = null,
    last_class = null,
    type_of_application = null,
    name_of_applicant = null,
    home_address = null,
    date_of_birth = null,
    sex = null,
    religion = null,
    tribe = null,
    school_attended = null,
    class1 = null,
    state_of_origin = null,
    l_g_a = null,
    nationality = null,
    time = null,
    venue = null,
    common_entrance = null,
    placement = null,
    examination_date = null,
    date = null,
    first_name = null,
    examination_number = null,
    father_name = null,
    state_of_origin1 = null,
    address = null,
    school = null,
    examination_number1 = null,
    name1 = null,
    mother_name = null,
    state_of_origin3 = null,
    state_of_origin2 = null,
    home_address1 = null,
    office_marker_address = null,
    telephone_address = null,
    mathematics = null,
    english = null,
    others = null,
    admission_no = null,
    statusText = null,
    last_school_attended = null,
    special_health_needs = null,
    date_of_birth1 = null,
    father_place_of_work = null,
    father_occapation = null,
    blood_group = null,
    academic_year = null,
    admission_date = null,
    roll_number = null,
    status = null,
    section = null,
    house = null,
    category = null,
    primary_contact_number = null,
    caste = null,
    mother_tongue = null,
    language_known = null,
    application_no = null,
    type_of_school = null,
    admission_year = null,
    class_type = null,
    current_class = null,
    medical_condition = null,
    upload_transfer_certificate = null,
    id = null,
    other_score = 0,
    venue1 = null,
    school_id = null,
  } = req.body;

  if (statusText === "Assigned" && query_type === "update") {
    let schoolPrefix = "YMA";
    let year = "24";
    const classType =
      type_of_application === "Primary"
        ? "PRI"
        : type_of_application === "Secondary"
          ? "SEC"
          : type_of_application === "Nursery"
            ? "NUR"
            : "PRE";
    db.sequelize
      .query(
        `call admission_number_generator(:id,:query_type,:school,:class_type,:year,:serial_no,:type_of_school,:school_id)`,
        {
          replacements: {
            id,
            query_type: "select",
            school: schoolPrefix,
            class_type: classType,
            year: year,
            serial_no: "",
            type_of_school,
            school_id,
          },
        }
      )
      .then((resp) => {
        console.log(resp);
        const nextNo = resp && resp.length ? resp[0].serial_no : "";
        const admissionNumber =
          schoolPrefix +
          "/" +
          classType +
          "/" +
          year +
          "/" +
          nextNo.toString().padStart(3, "0");
        db.sequelize
          .query(
            `CALL students_applications(
                            :query_type, 
                            :id, 
                            :upload, 
                            :type_of_application, 
                            :name_of_applicant, 
                            :home_address, 
                            :date_of_birth, 
                            :sex, 
                            :religion, 
                            :tribe, 
                            :school_attended, 
                            :last_class, 
                            :state_of_origin, 
                            :l_g_a, 
                            :nationality, 
                            :examination_date, 
                            :address, 
                            :school, 
                            :mathematics, 
                            :english, 
                            :others, 
                            :other_score, 
                            :admission_no, 
                            :last_school_attended, 
                            :special_health_needs, 
                            :father_place_of_work, 
                            :father_occapation, 
                            :blood_group, 
                            :academic_year, 
                            :admission_date, 
                            :status, 
                            :mother_tongue, 
                            :language_known, 
                            :application_no, 
                            :admission_year, 
                            :class_type, 
                            :current_class, 
                            :medical_condition, 
                            :upload_transfer_certificate,
                            :school_id)`,
            {
              replacements: {
                id,
                query_type,
                last_class,
                upload,
                type_of_application,
                name_of_applicant,
                home_address,
                date_of_birth,
                sex,
                religion,
                tribe,
                school_attended,
                class1,
                state_of_origin,
                l_g_a,
                nationality,
                time,
                venue,
                common_entrance,
                placement,
                examination_date: null,
                date,
                first_name,
                examination_number,
                father_name,
                state_of_origin1,
                address,
                school,
                mathematics,
                english,
                others,
                other_score,
                last_school_attended,
                special_health_needs,
                date_of_birth1,
                father_place_of_work,
                father_occapation,
                blood_group,
                admission_no: !admission_no ? admissionNumber : admission_no,
                academic_year,
                admission_date,
                roll_number,
                status: statusText,
                mother_tongue,
                language_known,
                application_no,
                admission_year,
                class_type,
                current_class,
                medical_condition,
                upload_transfer_certificate,
                section,
                house,
                category,
                primary_contact_number,
                school_id,
              },
            }
          )
          .then((results) => {
            if (!admission_no || admission_no === "") {
              db.sequelize.query(
                `call admission_number_generator(:id,:query_type,:school,:class_type,:year,:serial_no,:type_of_school)`,
                {
                  replacements: {
                    id,
                    query_type: "update",
                    school: schoolPrefix,
                    class_type: classType,
                    year: year,
                    serial_no: nextNo + 1,
                    type_of_school,
                  },
                }
              );
            }

            res.json({ success: true, results });
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ success: false });
          });
      });
  } else {
    db.sequelize
      .query(
        `call secondary_school_entrance_form(:id,:query_type,:upload,:type_of_application,:name_of_applicant,:home_address,:date_of_birth,:sex,:religion,:tribe,:school_attended,:class1,:state_of_origin,:l_g_a,:nationality,:time,:venue,:common_entrance,:placement,:examination_date,:date,:first_name,:examination_number,:father_name,:state_of_origin1,:address,:school,:examination_number1,:name1,:mother_name,:state_of_origin3,:state_of_origin2,:home_address1,:office_marker_address,:telephone_address,:other_score,:venue1,:image,:mathematics,:english,:others,:admission_no,:last_school_attended,:special_health_needs,:date_of_birth1,:father_place_of_work,:father_occapation,:blood_group,:academic_year,:admission_date,:roll_number,:status,:section,:house,:category,:primary_contact_number,:caste,:mother_tongue,:language_known,:application_no,:admission_year,:class_type,:current_class,:medical_condition,:upload_transfer_certificate,:school_id)`,
        {
          replacements: {
            id,
            query_type,
            upload,
            type_of_application,
            name_of_applicant,
            home_address,
            date_of_birth: moment(date_of_birth).isValid()
              ? moment(date_of_birth).format("YYYY-MM-DD") // returns a proper JS Date
              : null,
            sex,
            religion,
            tribe,
            school_attended,
            class1,
            state_of_origin,
            l_g_a,
            nationality,
            time,
            venue,
            common_entrance,
            placement,
            examination_date: null,
            date,
            first_name,
            examination_number,
            father_name,
            state_of_origin1,
            address,
            school,
            examination_number1,
            name1,
            mother_name,
            state_of_origin3,
            state_of_origin2,
            home_address1,
            office_marker_address,
            telephone_address,
            other_score,
            venue1,
            image: null,
            mathematics,
            english,
            others,
            admission_no,
            last_school_attended,
            special_health_needs,
            date_of_birth1,
            father_place_of_work,
            father_occapation,
            blood_group,
            academic_year,
            admission_date,
            roll_number,
            status: statusText,
            section,
            house,
            category,
            primary_contact_number,
            caste,
            mother_tongue,
            language_known,
            application_no,
            admission_year,
            class_type,
            current_class,
            medical_condition,
            upload_transfer_certificate,
            school_id,
          },
        }
      )
      .then((results) => {
        res.json({ success: true, results });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ success: false });
      });
  }
};
const update_current_class_secondary_school_entrance_form = (req, res) => {
  // const {  } = req.body;
  const {
    id = null,
    query_type = "update_current_class",
    upload = null,
    type_of_application = null,
    name_of_applicant = null,
    home_address = null,
    date_of_birth = null,
    sex = null,
    religion = null,
    tribe = null,
    school_attended = null,
    class1 = null,
    state_of_origin = null,
    l_g_a = null,
    nationality = null,
    time = null,
    venue = null,
    common_entrance = null,
    placement = null,
    examination_date = null,
    date = null,
    first_name = null,
    examination_number = null,
    father_name = null,
    state_of_origin1 = null,
    address = null,
    school = null,
    examination_number1 = null,
    name1 = null,
    mother_name = null,
    state_of_origin3 = null,
    state_of_origin2 = null,
    home_address1 = null,
    office_marker_address = null,
    telephone_address = null,
    other_score = null,
    venue1 = null,
    image = null,
    mathematics = null,
    english = null,
    others = null,
    admission_no = null,
    statusText = null,
    last_school_attended = null,
    special_health_needs = null,
    date_of_birth1 = null,
    father_place_of_work = null,
    father_occapation = null,
    blood_group = null,
    academic_year = null,
    admission_date = null,
    roll_number = null,
    status = null,
    section = null,
    house = null,
    category = null,
    primary_contact_number = null,
    caste = null,
    mother_tongue = null,
    language_known = null,
    application_no = null,
    type_of_school = null,
    admission_year = null,
    class_type = null,
    current_class = null,
    medical_condition = null,
    upload_transfer_certificate = null,
    school_id = null,
  } = req.body;

  db.sequelize
    .query(
      `call school_applicants(:id,:query_type,:upload,:type_of_application,:name_of_applicant,:home_address,:date_of_birth,:sex,:religion,:tribe,:school_attended,:class1,:state_of_origin,:l_g_a,:nationality,:time,:venue,:common_entrance,:placement,:examination_date,:date,:first_name,:examination_number,:father_name,:state_of_origin1,:address,:school,:examination_number1,:name1,:mother_name,:state_of_origin3,:state_of_origin2,:home_address1,:office_marker_address,:telephone_address,:other_score,:venue1,:image,:mathematics,:english,:others,:admission_no,:last_school_attended,:special_health_needs,:date_of_birth1,:father_place_of_work,:father_occapation,:blood_group,:academic_year,:admission_date,:roll_number,:status,:section,:house,:category,:primary_contact_number,:caste,:mother_tongue,:language_known,:application_no,:admission_year,:class_type,:current_class,:medical_condition,:upload_transfer_certificate,:school_id)`,
      {
        replacements: {
          id,
          query_type,
          upload,
          type_of_application,
          name_of_applicant,
          home_address,
          date_of_birth,
          sex,
          religion,
          tribe,
          school_attended,
          class1,
          state_of_origin,
          l_g_a,
          nationality,
          time,
          venue,
          common_entrance,
          placement,
          examination_date: null,
          date,
          first_name,
          examination_number,
          father_name,
          state_of_origin1,
          address,
          school,
          examination_number1,
          name1,
          mother_name,
          state_of_origin3,
          state_of_origin2,
          home_address1,
          office_marker_address,
          telephone_address,
          other_score,
          venue1,
          image: null,
          mathematics,
          english,
          others,
          admission_no,
          last_school_attended,
          special_health_needs,
          date_of_birth1,
          father_place_of_work,
          father_occapation,
          blood_group,
          academic_year,
          admission_date,
          roll_number,
          status: "Assign",
          section,
          house,
          category,
          primary_contact_number,
          caste,
          mother_tongue,
          language_known,
          application_no,
          admission_year,
          class_type,
          current_class,
          medical_condition,
          upload_transfer_certificate,
          school_id,
        },
      }
    )
    .then((results) => {
      res.json({ success: true, results });
      console.log(res, "LSLSL");
    })
    .catch((err) => {
      console.log("SLSLSLSLSLSLSLLSS", err.toString().split(":")[1]);
      res
        .status(500)
        .json({ success: false, message: err.toString().split(":")[1] });
    });
};

const getParent = (req, res) => {
  // Handle get-parent-phone query type from query params
  if (req.query.query_type === 'get-parent-phone') {
    db.sequelize.query(
      `SELECT p.phone 
       FROM parents p
       INNER JOIN students s ON s.parent_id = p.parent_id
       WHERE s.admission_no = :admission_no
       LIMIT 1`,
      {
        replacements: {
          admission_no: req.query.admission_no
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      if (results.length > 0) {
        res.json({ success: true, data: { phone: results[0].phone } });
      } else {
        res.json({ success: false, message: 'No parent phone found for this student' });
      }
    })
    .catch((err) => {
      console.error('Error fetching parent phone:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch parent phone' });
    });
    return;
  }

  // console.log(req.body)
  const {
    fullname = null,
    phone_no = null,
    email = null,
    relationship = null,
    is_guardian = null,
    occupation = null,
    school_id = null,
    admission_no = null,
  } = req.body;
  console.log(req.body);
  const {
    id = null,
    query_type = "select",
    children_admin_no = null,
  } = req.query;

  // Handle get-parent-phone query type
  if (req.body.query_type === 'get-parent-phone') {
    db.sequelize.query(
      `SELECT p.phone 
       FROM parents p
       INNER JOIN students s ON s.parent_id = p.parent_id
       WHERE s.admission_no = :admission_no
       LIMIT 1`,
      {
        replacements: {
          admission_no: req.body.admission_no
        },
        type: db.Sequelize.QueryTypes.SELECT
      }
    )
    .then((results) => {
      if (results.length > 0) {
        res.json({ success: true, data: { phone: results[0].phone } });
      } else {
        res.json({ success: false, message: 'No parent phone found for this student' });
      }
    })
    .catch((err) => {
      console.error('Error fetching parent phone:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch parent phone' });
    });
    return;
  }

  db.sequelize
    .query(
      `CALL parents(:query_type, :id, :fullname, :phone_no, :email, :relationship, :is_guardian, :occupation, :children_admin_no, :school_id)`, // Match param names
      {
        replacements: {
          id: id ?? 0,
          query_type,
          fullname,
          phone_no,
          email: email ?? null,
          relationship,
          is_guardian,
          occupation,
          children_admin_no,
          school_id: req.user.school_id,
        },
      }
    )
    .then((results) => {
      if (query_type === "create") {
        const newParentId = results[0]?.new_parent_id;
        res.json({ success: true, parentId: newParentId });
      } else {
        res.json({ success: true, results });
      }
    })
    .catch((err) => {
      console.error("SQL Error:", err);
      res.status(500).json({
        success: false,
        message: err.original?.sqlMessage || "Database error",
      });
    });
};
const Parents = (req, res) => {
  const {
    id = null,
    query_type1 = "",
    fullname = null,
    phone = null,
    email = null,
    relationship = null,
    is_guardian = "No",
    occupation = null,
    school_id = null,
    branch_id = null,
  } = req.body;
  console.log(req.body, "ohayo");

  const { children_admin_no = null } = req.query;

  db.sequelize
    .query(
      `CALL parents(:query_type, :id, :name, :phone, :email, :relationship, :is_guardian, :occupation, :children_admin_no, :school_id)`, // Match param names
      {
        replacements: {
          query_type: query_type1,
          id,
          name: fullname,
          phone,
          email,
          relationship,
          is_guardian,
          occupation,
          school_id: req.user.school_id ?? school_id,
          children_admin_no
        },
      }
    )
    .then((results) => {
      console.log(results, "ohayou");
      if (query_type1 === "create") {
        // After successful creation, fetch the created parent details
        const { fullname, phone, email, school_id } = req.body;
        db.sequelize.query(
          `SELECT p.*, u.name, u.email, u.phone as user_phone 
           FROM parents p 
           LEFT JOIN users u ON p.user_id = u.id 
           WHERE p.fullname = :fullname AND p.phone = :phone AND p.email = :email AND p.school_id = :school_id 
           ORDER BY p.id DESC LIMIT 1`,
          {
            replacements: { fullname, phone, email, school_id: req.user.school_id ?? school_id }
          }
        ).then(parentData => {
          res.json({
            success: true,
            message: "Parent created successfully",
            data: parentData[0][0] || null
          });
        }).catch(fetchErr => {
          // If fetch fails, still return success but without data
          console.error("Error fetching created parent:", fetchErr);
          res.json({
            success: true,
            message: "Parent created successfully",
            data: null
          });
        });
      } else {
        res.json({ success: true, results });
      }
    })
    .catch((err) => {
      console.error("SQL Error:", err);
      res.status(500).json({
        success: false,
        message: err.original?.sqlMessage || "Database error",
      });
    });
};

const exam_garding = (req, res) => {
  // console.log(req.body, "jshgfjshdgfashdfg")
  const arr = [];
  req.body.map((item) => {
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
      school_id = null,
    } = item;

    arr.push(
      db.sequelize.query(
        `call manage_class_attendances( 
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
                :school_id )`,
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
            school_id,
          },
        }
      )
    );
  });
  Promise.all(arr)
    .then((results) => res.json({ success: true, results }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

const students = async (req, res) => {
  const {
    id = null,
    parent_id = null,
    studen_class = null,
    guardian_id = null,
    student_name = null,
    phone_number = null,
    email = null,
    home_address = null,
    date_of_birth = null,
    sex = null,
    religion = null,
    tribe = null,
    state_of_origin = null,
    l_g_a = null,
    nationality = null,
    last_school_attended = null,
    special_health_needs = null,
    blood_group = null,
    admission_no = null,
    admission_date = null,
    academic_year = null,
    status = null,
    section = null,
    mother_tongue = null,
    language_known = null,
    transfer_certificate = null,
    profile_picture = null,
    medical_condition = null,
    query_type = null,
    parents = [],
    current_class = null,
    branch_id = null,
    short_name = null,
    school_id = null,
    password = "123456",
  } = req.body;

  // 🔑 Password hashing
  const saltedPassword = async (password) => {
    if (!password) return null;
    else if (password.length > 15) return password;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  };

  try {
    const hashed = await saltedPassword(password);
    let primaryParentId = parent_id; // Use existing parent_id if provided

    // ✅ STEP 1: Create the primary parent first (if parents array is not empty)
    if (parents && parents.length > 0) {
      const primaryParent = parents[0]; // Get the first parent as primary
      const {
        id = null,
        query_type = "create",
        fullname = null,
        phone = null,
        email = null,
        ralationship = null,
        is_gurdian = null,
        occupation = null,
      } = primaryParent;

      if (fullname && phone && ralationship && occupation) {
        const parentResult = await db.sequelize.query(
          `CALL parents(
            :query_type,
            :id,
            :name,
            :phone,
            :email,
            :ralationship,
            :is_gurdian,
            :occupation,
            :children_admin_no,
            :school_id
          )`,
          {
            replacements: {
              query_type,
              id,
              name: fullname,
              phone,
              email,
              ralationship,
              is_gurdian,
              occupation,
              children_admin_no: null, // No student yet
              school_id: req?.user?.school_id,
            },
          }
        );

        // Extract the new parent ID from the result
        primaryParentId = parentResult[0]?.parent_id;
      }
    }

    // ✅ STEP 2: Create the student with the parent_id reference
    const results = await db.sequelize.query(
      `CALL students_queries(
        :query_type,
        :id,
        :parent_id,
        :guardian_id,
        :student_name,
        :home_address,
        :date_of_birth,
        :sex,
        :religion,
        :tribe,
        :state_of_origin,
        :l_g_a,
        :nationality,
        :last_school_attended,
        :special_health_needs,
        :blood_group,
        :admission_no,
        :admission_date,
        :academic_year,
        :status,
        :section,
        :mother_tongue,
        :language_known,
        :current_class,
        :profile_picture,
        :medical_condition,
        :transfer_certificate,
        :branch_id,
        :school_id,
        :password
      )`,
      {
        replacements: {
          query_type,
          id,
          parent_id: primaryParentId || null, // Use the created parent's ID or null
          guardian_id,
          student_name,
          home_address,
          date_of_birth: moment(date_of_birth).isValid()
            ? moment(date_of_birth).format("YYYY-MM-DD") // returns a proper JS Date
            : null,
          sex,
          religion,
          tribe,
          state_of_origin,
          l_g_a,
          nationality,
          last_school_attended,
          special_health_needs,
          blood_group,
          admission_no,
          admission_date: new Date().toISOString().split("T")[0],
          academic_year,
          status,
          section,
          mother_tongue,
          language_known,
          current_class,
          profile_picture,
          medical_condition,
          transfer_certificate,
          branch_id: branch_id ?? (req?.user?.branch_id || null),
          school_id: req?.user?.school_id || null,
          password: hashed,
        },
      }
    );

    // ✅ STEP 3: Create additional parents with student's admission_no
    if (parents && parents.length > 0) {
      // If parent_id was provided, create ALL parents from the array
      // If parent_id was not provided, create parents starting from index 1 (since index 0 was already created)
      const startIndex = parent_id ? 0 : 1;

      for (let i = startIndex; i < parents.length; i++) {
        const item = parents[i];
        const {
          id = null,
          query_type = "create",
          fullname = null,
          phone = null,
          email = null,
          ralationship = null,
          is_gurdian = null,
          occupation = null,
        } = item;

        if (fullname && phone && ralationship && occupation) {
          await db.sequelize.query(
            `CALL parents(
              :query_type,
              :id,
              :name,
              :phone,
              :email,
              :ralationship,
              :is_gurdian,
              :occupation,
              :children_admin_no,
              :school_id
            )`,
            {
              replacements: {
                query_type,
                id,
                name: fullname,
                phone,
                email,
                ralationship,
                is_gurdian,
                occupation,
                children_admin_no: results[0].admission_no,
                school_id: req?.user?.school_id,
              },
            }
          );
        }
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// const studentsBulk = async (req, res) => {
//   console.log('Bulk upload request:', req.user?.user);
//   const {school_id, branch_id} = req.body || {};
//   try {
//     const actions = Array.isArray(req.body) ? req.body : [req.body];
//     console.log(`Processing ${actions.length} student records`);

//     // Process each student individually and collect detailed results
//     const detailedResults = [];
//     let successCount = 0;
//     let failureCount = 0;

//     // Use transaction for data consistency
//     const results = await db.sequelize.transaction(async (t) => {
//       const promises = actions.map(async (item, index) => {
//         const rowNumber = index + 1;

//         try {
//           const {
//             id = null,
//             parent_id = null,
//             student_class = null,
//             guardian_id = null,
//             student_name = null,
//             phone_number = null,
//             email = null,
//             home_address = null,
//             date_of_birth = null,
//             sex = null,
//             religion = null,
//             tribe = null,
//             state_of_origin = null,
//             l_g_a = null,
//             nationality = null,
//             last_school_attended = null,
//             special_health_needs = null,
//             blood_group = null,
//             admission_no = null,
//             admission_date = null,
//             academic_year = null,
//             status = null,
//             section = null,
//             mother_tongue = null,
//             language_known = null,
//             transfer_certificate = null,
//             profile_picture = null,
//             medical_condition = null,
//             current_class = null,
//             password = "123456",
//           } = item;

//           // Hash password
//           const saltedPassword = async (password) => {
//             if (!password) return null;
//             if (password.length > 15) return password;
//             const salt = await bcrypt.genSalt(10);
//             return await bcrypt.hash(password, salt);
//           };

//           const hashed = await saltedPassword(password);

//           // Call stored procedure for individual student
//           const result = await db.sequelize.query(
//             `CALL students_queries(
//               :query_type,
//               :id,
//               :parent_id,
//               :guardian_id,
//               :student_name,
//               :home_address,
//               :date_of_birth,
//               :sex,
//               :religion,
//               :tribe,
//               :state_of_origin,
//               :l_g_a,
//               :nationality,
//               :last_school_attended,
//               :special_health_needs,
//               :blood_group,
//               :admission_no,
//               :admission_date,
//               :academic_year,
//               :status,
//               :section,
//               :mother_tongue,
//               :language_known,
//               :current_class,
//               :profile_picture,
//               :medical_condition,
//               :transfer_certificate,
//               :branch_id,
//               :school_id,
//               :password
//             )`,
//             {
//               replacements: {
//                 query_type: "BULK RETURNINGS",
//                 id,
//                 parent_id,
//                 guardian_id,
//                 student_name,
//                 phone_number,
//                 email,
//                 home_address,
//                 date_of_birth: moment(date_of_birth).isValid()
//                   ? moment(date_of_birth).format("YYYY-MM-DD")
//                   : null,
//                 sex,
//                 religion,
//                 tribe,
//                 state_of_origin,
//                 l_g_a,
//                 nationality,
//                 last_school_attended,
//                 special_health_needs,
//                 blood_group,
//                 admission_no,
//                 admission_date: admission_date || moment().format("YYYY-MM-DD"),
//                 academic_year,
//                 status,
//                 section,
//                 mother_tongue,
//                 language_known,
//                 transfer_certificate,
//                 profile_picture,
//                 medical_condition,
//                 current_class,
//                 branch_id: branch_id || req?.user?.branch_id || null,
//                 school_id: req?.user?.school_id || null,
//                 student_class,
//                 password: hashed,
//               },
//               transaction: t,
//             }
//           );

//           // Check if the stored procedure returned success
//           const procedureResult = result && result[0]  ? result[0] : null;

//           if (procedureResult && (procedureResult.admission_no || procedureResult.student_id || procedureResult.success !== false)) {
//             // Success case
//             successCount++;
//             detailedResults.push({
//               row: rowNumber,
//               status: 'success',
//               student_name: student_name || 'Unknown',
//               admission_no: procedureResult.admission_no || 'Generated',
//               message: 'Student created successfully',
//               data: procedureResult
//             });

//             console.log(`Row ${rowNumber}: SUCCESS - ${student_name} created with admission ${procedureResult.admission_no}`);
//             return result;
//           } else {
//             // Failure case - stored procedure didn't return expected success indicators
//             failureCount++;
//             detailedResults.push({
//               row: rowNumber,
//               status: 'error',
//               student_name: student_name || 'Unknown',
//               admission_no: null,
//               message: procedureResult?.error || procedureResult?.message || 'Failed to create student - no success indicator returned',
//               error: procedureResult
//             });

//             console.log(`Row ${rowNumber}: FAILED - ${student_name} - ${procedureResult?.error || 'Unknown error'}`);
//             return null;
//           }

//         } catch (itemError) {
//           // Individual item error
//           failureCount++;
//           detailedResults.push({
//             row: rowNumber,
//             status: 'error',
//             student_name: item.student_name || 'Unknown',
//             admission_no: null,
//             message: itemError.message || 'Database error occurred',
//             error: itemError.toString()
//           });

//           console.error(`Row ${rowNumber}: ERROR - ${item.student_name} - ${itemError.message}`);
//           return null;
//         }
//       });

//       return await Promise.all(promises);
//     });

//     // Prepare comprehensive response
//     const response = {
//       success: true,
//       message: `Bulk operation completed: ${successCount} successful, ${failureCount} failed`,
//       summary: {
//         total: actions.length,
//         successful: successCount,
//         failed: failureCount,
//         success_rate: Math.round((successCount / actions.length) * 100)
//       },
//       data: results.filter(r => r !== null), // Only successful results
//       detailed_results: detailedResults, // All results with individual status
//       errors: detailedResults.filter(r => r.status === 'error'), // Only errors
//       successes: detailedResults.filter(r => r.status === 'success') // Only successes
//     };

//     console.log(`Bulk upload completed: ${successCount}/${actions.length} successful`);

//     res.status(200).json(response);

//   } catch (error) {
//     console.error("Critical error in bulk operation:", error);

//     res.status(500).json({
//       success: false,
//       message: "Critical error during bulk operation",
//       error: error.message,
//       summary: {
//         total: Array.isArray(req.body) ? req.body.length : 1,
//         successful: 0,
//         failed: Array.isArray(req.body) ? req.body.length : 1,
//         success_rate: 0
//       },
//       detailed_results: [],
//       errors: [{
//         row: 'all',
//         status: 'error',
//         message: error.message,
//         error: error.toString()
//       }]
//     });
//   }
// };

// const students_v2 = async (req, res) => {
//   const {
//     id = null,
//     parent_id = null,
//     studen_class = null,
//     guardian_id = null,
//     surname = null,
//     first_name = null,
//     other_name = null,
//     phone_number = null,
//     email = null,
//     home_address = null,
//     date_of_birth = null,
//     sex = null,
//     religion = null,
//     tribe = null,
//     state_of_origin = null,
//     l_g_a = null,
//     nationality = null,
//     last_school_attended = null,
//     special_health_needs = null,
//     blood_group = null,
//     admission_no = null,
//     admission_date = null,
//     academic_year = null,
//     status = null,
//     section = null,
//     mother_tongue = null,
//     language_known = null,
//     transfer_certificate = null,
//     profile_picture = null,
//     medical_condition = null,
//     query_type = null,
//     parents = [],
//     current_class = null,
//     branch_id = null,
//     short_name = null,
//     school_id = null,
//     password = "123456",
//   } = req.body;

//   // 🔑 Password hashing
//   const saltedPassword = async (password) => {
//     if (!password) return null;
//     else if (password.length > 15) return password;
//     const salt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(password, salt);
//     return hash;
//   };

//   try {
//     const hashed = await saltedPassword(password);

//     // 🔄 Use database transaction to ensure atomicity
//     const results = await db.sequelize.transaction(async (transaction) => {
//       let primaryParentId = parent_id; // Use existing parent_id if provided

//       // ✅ STEP 1: Create the primary parent first ONLY if parent_id is not provided and parents array exists
//       if (!parent_id && parents && parents.length > 0) {
//         const primaryParent = parents[0]; // Get the first parent as primary
//         const {
//           id: parentId = null,
//           query_type: parentQueryType = "create",
//           fullname = null,
//           phone = null,
//           email = null,
//           ralationship = null,
//           is_gurdian = null,
//           occupation = null,
//         } = primaryParent;

//         if (fullname && phone && ralationship && occupation) {
//           console.log('Creating primary parent:', { fullname, phone, ralationship, occupation });

//           const parentResult = await db.sequelize.query(
//             `CALL parents(
//               :query_type,
//               :id,
//               :name,
//               :phone,
//               :email,
//               :ralationship,
//               :is_gurdian,
//               :occupation,
//               :children_admin_no,
//               :school_id
//             )`,
//             {
//               replacements: {
//                 query_type: parentQueryType,
//                 id: parentId,
//                 name: fullname,
//                 phone,
//                 email,
//                 ralationship,
//                 is_gurdian,
//                 occupation,
//                 children_admin_no: null, // No student yet
//                 school_id: req?.user?.school_id,
//               },
//               transaction, // Include transaction
//             }
//           );

//           console.log('Parent creation result:', parentResult);

//           // Extract the new parent ID from the result - try multiple possible field names
//           primaryParentId = parentResult[0]?.new_parent_id ||
//                            parentResult[0]?.parent_id ||
//                            parentResult[0]?.id ||
//                            parentResult[0]?.insertId;

//           console.log('Extracted primaryParentId:', primaryParentId);

//           if (!primaryParentId) {
//             throw new Error('Failed to get parent ID from parent creation result');
//           }
//         }
//       }

//       // ✅ STEP 2: Create the student with the parent_id reference
//       const studentResults = await db.sequelize.query(
//         `CALL students_queries_v2(
//           :query_type,
//           :id,
//           :parent_id,
//           :guardian_id,
//           :surname,
//           :first_name,
//           :other_name,
//           :home_address,
//           :date_of_birth,
//           :sex,
//           :religion,
//           :tribe,
//           :state_of_origin,
//           :l_g_a,
//           :nationality,
//           :last_school_attended,
//           :special_health_needs,
//           :blood_group,
//           :admission_no,
//           :admission_date,
//           :academic_year,
//           :status,
//           :section,
//           :mother_tongue,
//           :language_known,
//           :current_class,
//           :profile_picture,
//           :medical_condition,
//           :transfer_certificate,
//           :school_location,
//           :school_id,
//           :password
//         )`,
//         {
//           replacements: {
//             query_type,
//             id,
//             parent_id: primaryParentId || null, // Use the created parent's ID or null
//             guardian_id,
//             surname,
//             first_name,
//             other_name,
//             home_address,
//             date_of_birth: moment(date_of_birth).isValid()
//               ? moment(date_of_birth).format("YYYY-MM-DD") // returns a proper JS Date
//               : null,
//             sex,
//             religion,
//             tribe,
//             state_of_origin,
//             l_g_a,
//             nationality,
//             last_school_attended,
//             special_health_needs,
//             blood_group,
//             admission_no,
//             admission_date: new Date().toISOString().split("T")[0],
//             academic_year,
//             status,
//             section,
//             mother_tongue,
//             language_known,
//             current_class,
//             profile_picture,
//             medical_condition,
//             transfer_certificate,
//             school_location: branch_id ?? req?.user?.branch_id,
//             school_id: req?.user?.school_id || null,
//             password: hashed,
//           },
//           transaction, // Include transaction
//         }
//       );

//       // ✅ STEP 3: Create additional parents with student's admission_no
//       if (parents && parents.length > 0) {
//         // If parent_id was provided, create ALL parents from the array
//         // If parent_id was not provided, create parents starting from index 1 (since index 0 was already created)
//         const startIndex = parent_id ? 0 : 1;

//         for (let i = startIndex; i < parents.length; i++) {
//           const item = parents[i];
//           const {
//             id = null,
//             query_type = "create",
//             fullname = null,
//             phone = null,
//             email = null,
//             ralationship = null,
//             is_gurdian = null,
//             occupation = null,
//           } = item;

//           if (fullname && phone && ralationship && occupation) {
//             await db.sequelize.query(
//               `CALL parents(
//                 :query_type,
//                 :id,
//                 :name,
//                 :phone,
//                 :email,
//                 :ralationship,
//                 :is_gurdian,
//                 :occupation,
//                 :children_admin_no,
//                 :school_id
//               )`,
//               {
//                 replacements: {
//                   query_type,
//                   id,
//                   name: fullname,
//                   phone,
//                   email,
//                   ralationship,
//                   is_gurdian,
//                   occupation,
//                   children_admin_no: studentResults[0].admission_no,
//                   school_id: req?.user?.school_id,
//                 },
//                 transaction, // Include transaction
//               }
//             );
//           }
//         }
//       }

//       return studentResults; // Return the student results from transaction
//     });

//     res.json({ success: true, data: results });
//   } catch (err) {
//     console.error('Transaction failed and rolled back:', err);
//     res.status(500).json({
//       success: false,
//       error: err.message,
//       message: 'Student creation failed. All changes have been rolled back.'
//     });
//   }
// };



// Helper: Parse full name into surname, first, other
const parseName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return { surname: '', first_name: '', other_names: '' };
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { surname: parts[0], first_name: parts[0], other_names: '' };
  }

  const surname = parts[parts.length - 1];
  const first_name = parts[0];
  const other_names = parts.slice(1, -1).join(' ') || null;

  return { surname, first_name, other_names };
};

// Helper: Generate admission number format
const generateAdmissionNumber = (shortName, branchIndex, code) => {
  return `${shortName.toUpperCase()}/${branchIndex}/${String(code).padStart(4, '0')}`;
};

// const studentsBulk = async (req, res) => {
//   const school_id = req.body?.school_id || req.user?.school_id;
//   const branch_id = req.body?.branch_id || req.user?.branch_id;

//   if (!school_id || !branch_id) {
//     return res.status(400).json({
//       success: false,
//       message: 'school_id and branch_id are required (via body or auth context)'
//     });
//   }

//   try {
//     // Handle both array and single object
//     const rawActions = Array.isArray(req.body) ? req.body : [req.body];

//     // Remove top-level school_id/branch_id from each item
//     const actions = rawActions.map(item => {
//       const { school_id: _, branch_id: __, ...rest } = item;
//       return rest;
//     });

//     console.log(`[BULK STUDENTS] Processing ${actions.length} records for school=${school_id}, branch=${branch_id}`);

//     // === STEP 1: Validate all class references (case-insensitive) ===
//     const classIdentifiers = [...new Set(
//       actions
//         .map(s => s.current_class?.trim())
//         .filter(cls => cls != null && cls !== '')
//     )];

//     let validClassMap = new Map();

//     if (classIdentifiers.length > 0) {
//       // Normalize to uppercase for comparison
//       const normalizedIdentifiers = classIdentifiers.map(id => id.toUpperCase());

//       const validClasses = await db.sequelize.query(
//         `SELECT class_code, class_name, section 
//          FROM classes 
//          WHERE (UPPER(class_code) IN (:identifiers) OR UPPER(class_name) IN (:identifiers))
//            AND school_id = :school_id 
//            AND branch_id = :branch_id`,
//         {
//           replacements: {
//             identifiers: normalizedIdentifiers,
//             school_id,
//             branch_id
//           },
//           type: db.sequelize.QueryTypes.SELECT
//         }
//       );

//       // Store normalized keys (uppercase) in the map
//       for (const cls of validClasses) {
//         if (cls.class_code) validClassMap.set(cls.class_code.toUpperCase(), cls);
//         if (cls.class_name) validClassMap.set(cls.class_name.toUpperCase(), cls);
//       }
//     }

//     // === STEP 2: Validate each student ===
//     const validationResults = actions.map((item, idx) => {
//       const row = idx + 1;
//       const errors = [];

//       if (!item.student_name?.trim()) errors.push('Student name is required');
//       if (!item.current_class?.trim()) errors.push('Current class is required');
//       if (!item.sex?.trim()) errors.push('Gender is required');

//       // Validate class (case-insensitive)
//       const normalizedClass = item.current_class?.trim().toUpperCase();
//       if (normalizedClass && !validClassMap.has(normalizedClass)) {
//         errors.push(`Invalid class: "${item.current_class}" not found for this school and branch`);
//       }

//       return {
//         row,
//         valid: errors.length === 0,
//         errors,
//         data: item,
//         normalizedClass // store for later use
//       };
//     });

//     const invalidRecords = validationResults.filter(r => !r.valid);

//     // Always return full error report if any invalid
//     if (invalidRecords.length > 0) {
//       const errorDetails = invalidRecords.map(r => ({
//         row: r.row,
//         student_name: r.data.student_name || 'Unknown',
//         message: r.errors.join('; ')
//       }));

//       return res.status(400).json({
//         success: false,
//         message: `${invalidRecords.length} student(s) failed validation`,
//         summary: {
//           total: actions.length,
//           successful: 0,
//           failed: invalidRecords.length,
//           success_rate: 0
//         },
//         detailed_results: errorDetails.map(e => ({ ...e, status: 'error' })),
//         errors: errorDetails,
//         successes: []
//       });
//     }

//     // === STEP 3: Get school location & branch index ===
//     const schoolLocation = await db.SchoolLocation.findOne({
//       where: { school_id, branch_id }
//     });

//     if (!schoolLocation) {
//       return res.status(400).json({
//         success: false,
//         message: 'School location not found for this school and branch'
//       });
//     }

//     const branchIndexResult = await db.sequelize.query(
//       `SELECT COUNT(*) as count 
//        FROM school_locations 
//        WHERE school_id = :school_id 
//          AND id <= (SELECT id FROM school_locations WHERE school_id = :school_id AND branch_id = :branch_id)`,
//       {
//         replacements: { school_id, branch_id },
//         type: db.sequelize.QueryTypes.SELECT
//       }
//     );
//     console.log(`[BULK STUDENTS] Branch index for branch_id=${branch_id} is ${JSON.stringify(branchIndexResult)}`);
//     const branch_index = parseInt(branchIndexResult[0].count, 10);

//     // === STEP 4: Transaction & student creation ===
//     const result = await db.sequelize.transaction(async (t) => {
//       const lockedLocation = await db.SchoolLocation.findOne({
//         where: { school_id, branch_id },
//         lock: t.LOCK.UPDATE,
//         transaction: t
//       });

//       if (!lockedLocation) {
//         throw new Error('Could not lock school location for admission number generation');
//       }

//       let currentCode = lockedLocation.code;
//       const studentsToCreate = [];
//       const detailedResults = [];

//       for (let i = 0; i < actions.length; i++) {
//         const item = actions[i];
//         const row = i + 1;
//         const normalizedClass = validationResults[i].normalizedClass;
//         const classData = validClassMap.get(normalizedClass);

//         const { surname, first_name, other_names } = parseName(item.student_name);
//         const hashedPassword = await bcrypt.hash("123456", 10);

//         // Generate admission number
//         let admissionNo;
//         let attempts = 0;
//         do {
//           admissionNo = generateAdmissionNumber(schoolLocation.short_name, branch_index, currentCode + 1);
//           currentCode++;
//           attempts++;
//         } while (
//           attempts < 5 &&
//           await db.Student.count({
//             where: { admission_no: admissionNo },
//             transaction: t
//           }) > 0
//         );

//         if (attempts >= 5) {
//           throw new Error(`Failed to generate unique admission number after 5 attempts for row ${row}`);
//         }

//         studentsToCreate.push({
//           surname,
//           first_name,
//           other_names,
//           student_name: item.student_name,
//           sex: item.sex || null,
//           admission_no: admissionNo,
//           academic_year: item.academic_year || new Date().getFullYear().toString(),
//           status: 'Active',
//           student_type: 'Returning',
//           current_class: classData.class_code,
//           class_name: classData.class_name,
//           section: item.section || classData.section || null,
//           branch_id,
//           school_id,
//           password: hashedPassword,
//           parent_id: item.parent_id || null,
//           guardian_id: item.guardian_id || null,
//           home_address: item.home_address || null,
//           date_of_birth: item.date_of_birth ? moment(item.date_of_birth).format('YYYY-MM-DD') : null,
//           religion: item.religion || null,
//           tribe: item.tribe || null,
//           state_of_origin: item.state_of_origin || null,
//           l_g_a: item.l_g_a || null,
//           nationality: item.nationality || null,
//           last_school_attended: item.last_school_attended || null,
//           special_health_needs: item.special_health_needs || null,
//           blood_group: item.blood_group || null,
//           admission_date: item.admission_date ? moment(item.admission_date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
//           mother_tongue: item.mother_tongue || null,
//           language_known: item.language_known || null,
//           transfer_certificate: item.transfer_certificate || null,
//           profile_picture: item.profile_picture || null,
//           medical_condition: item.medical_condition || null,
//           createdAt: new Date(),
//           updatedAt: new Date()
//         });

//         detailedResults.push({
//           row,
//           status: 'success',
//           student_name: item.student_name,
//           admission_no: admissionNo,
//           message: 'Student created successfully'
//         });
//       }

//       // Bulk insert
//       await db.Student.bulkCreate(studentsToCreate, {
//         transaction: t,
//         validate: true
//       });

//       // Update counter
//       await lockedLocation.update({ code: currentCode }, { transaction: t });

//       return { detailedResults, total: actions.length };
//     });

//     // === STEP 5: Success response ===
//     const { detailedResults, total } = result;
//     const successCount = detailedResults.length;

//     res.status(201).json({
//       success: true,
//       message: `Bulk operation completed: ${successCount} successful, ${total - successCount} failed`,
//       summary: {
//         total,
//         successful: successCount,
//         failed: total - successCount,
//         success_rate: Math.round((successCount / total) * 100)
//       },
//       detailed_results: detailedResults,
//       successes: detailedResults,
//       errors: []
//     });

//     console.log(`[BULK STUDENTS] Completed: ${successCount}/${total} successful`);

//   } catch (error) {
//     console.error('[BULK STUDENTS] Critical error:', error);

//     res.status(500).json({
//       success: false,
//       message: 'Critical error during bulk student creation',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// const studentsBulk = async (req, res) => {
//   const school_id = req.body?.school_id || req.user?.school_id;
//   const branch_id = req.body?.branch_id || req.user?.branch_id;
//   const hashedPassword = await bcrypt.hash("123456", 10);

//   if (!school_id || !branch_id) {
//     return res.status(400).json({
//       success: false,
//       message: 'school_id and branch_id are required (via body or auth context)'
//     });
//   }

//   try {
//     const rawActions = Array.isArray(req.body) ? req.body : [req.body];
//     const actions = rawActions.map(item => {
//       const { school_id: _, branch_id: __, ...rest } = item;
//       return rest;
//     });

//     console.log(`[BULK STUDENTS] Processing ${actions.length} records for school=${school_id}, branch=${branch_id}`);

//     // === STEP 1: Validate classes (case-insensitive) ===
//     const classIdentifiers = [...new Set(
//       actions
//         .map(s => s.current_class?.trim())
//         .filter(cls => cls != null && cls !== '')
//     )];

//     let validClassMap = new Map();

//     if (classIdentifiers.length > 0) {
//       const normalizedIdentifiers = classIdentifiers.map(id => id.toUpperCase());

//       const validClasses = await db.sequelize.query(
//         `SELECT class_code, class_name, section 
//          FROM classes 
//          WHERE (UPPER(class_code) IN (:identifiers) OR UPPER(class_name) IN (:identifiers))
//            AND school_id = :school_id 
//            AND branch_id = :branch_id`,
//         {
//           replacements: {
//             identifiers: normalizedIdentifiers,
//             school_id,
//             branch_id
//           },
//           type: db.sequelize.QueryTypes.SELECT
//         }
//       );

//       for (const cls of validClasses) {
//         if (cls.class_code) validClassMap.set(cls.class_code.toUpperCase(), cls);
//         if (cls.class_name) validClassMap.set(cls.class_name.toUpperCase(), cls);
//       }
//     }
//   const admissionNo = generateAdmissionNumber(schoolLocation.short_name, branch_index, currentCode + 1);
//   currentCode++;
//     // === STEP 2: Validate each student ===
//     const validationResults = actions.map((item, idx) => {
//       const row = idx + 1;
//       const errors = [];

//       if (!item.student_name?.trim()) errors.push('Student name is required');
//       if (!item.current_class?.trim()) errors.push('Current class is required');
//       if (!item.sex?.trim()) errors.push('Gender is required');

//       const normalizedClass = item.current_class?.trim().toUpperCase();
//       if (normalizedClass && !validClassMap.has(normalizedClass)) {
//         errors.push(`Invalid class: "${item.current_class}" not found for this school and branch`);
//       }

//       return {
//         row,
//         valid: errors.length === 0,
//         errors,
//         data: item,
//         normalizedClass
//       };
//     });

//     const invalidRecords = validationResults.filter(r => !r.valid);
//     if (invalidRecords.length > 0) {
//       const errorDetails = invalidRecords.map(r => ({
//         row: r.row,
//         student_name: r.data.student_name || 'Unknown',
//         message: r.errors.join('; ')
//       }));

//       return res.status(400).json({
//         success: false,
//         message: `${invalidRecords.length} student(s) failed validation`,
//         summary: {
//           total: actions.length,
//           successful: 0,
//           failed: invalidRecords.length,
//           success_rate: 0
//         },
//         detailed_results: errorDetails.map(e => ({ ...e, status: 'error' })),
//         errors: errorDetails,
//         successes: []
//       });
//     }

//     // === STEP 3: Get school location & branch index ===
//     const SchoolLocation = db.sequelize.model('SchoolLocation');
//     const schoolLocation = await SchoolLocation.findOne({ where: { school_id, branch_id } });

//     if (!schoolLocation) {
//       return res.status(400).json({
//         success: false,
//         message: 'School location not found for this school and branch'
//       });
//     }

//     const branchIndexResult = await db.sequelize.query(
//       `SELECT COUNT(*) as count 
//        FROM school_locations 
//        WHERE school_id = :school_id 
//          AND id <= (SELECT id FROM school_locations WHERE school_id = :school_id AND branch_id = :branch_id)`,
//       {
//         replacements: { school_id, branch_id },
//         type: db.sequelize.QueryTypes.SELECT
//       }
//     );
//     const branch_index = parseInt(branchIndexResult[0].count, 10);

//     // === STEP 4: Transaction & create students ===
//     const result = await db.sequelize.transaction(async (t) => {
//       const Student = db.sequelize.model('Student');

//       const lockedLocation = await SchoolLocation.findOne({
//         where: { school_id, branch_id },
//         lock: t.LOCK.UPDATE,
//         transaction: t
//       });

//       if (!lockedLocation) {
//         throw new Error('Could not lock school location for admission number generation');
//       }

//       let currentCode = lockedLocation.code;
//       const studentsToCreate = [];
//       const detailedResults = [];

//       for (let i = 0; i < actions.length; i++) {
//         const item = actions[i];
//         const row = i + 1;
//         const normalizedClass = validationResults[i].normalizedClass;
//         const classData = validClassMap.get(normalizedClass);

//         const { surname, first_name, other_names } = parseName(item.student_name);

//         // Generate unique admission number
//         // let admissionNo;
//         // let attempts = 0;
//         // do {
//         //   admissionNo = generateAdmissionNumber(schoolLocation.short_name, branch_index, currentCode + 1);
//         //   currentCode++;
//         //   attempts++;

//         //   // Check uniqueness
//         //   const exists = await Student.count({
//         //     where: { admission_no: admissionNo },
//         //     transaction: t
//         //   });
//         //   if (exists === 0) break;
//         // } while (attempts < 5);

//         // if (attempts >= 5) {
//         //   throw new Error(`Failed to generate unique admission number after 5 attempts for row ${row}`);
//         // }
//         // password
//         const student_name = [first_name, other_names, surname].filter(Boolean).join(' ');
//         studentsToCreate.push({
//           surname,
//           first_name,
//           other_names,
//           student_name,
//           sex: item.sex || null,
//           admission_no: admissionNo,
//           academic_year: item.academic_year || new Date().getFullYear().toString(),
//           status: 'Active',
//           student_type: 'Returning',
//           current_class: classData.class_code,
//           class_name: classData.class_name,
//           section: item.section || classData.section || null,
//           branch_id,
//           school_id,
//           password: hashedPassword,
//           parent_id: item.parent_id || null,
//           guardian_id: item.guardian_id || null,
//           home_address: item.home_address || null,
//           date_of_birth: item.date_of_birth ? moment(item.date_of_birth).format('YYYY-MM-DD') : null,
//           religion: item.religion || null,
//           tribe: item.tribe || null,
//           state_of_origin: item.state_of_origin || null,
//           l_g_a: item.l_g_a || null,
//           nationality: item.nationality || null,
//           last_school_attended: item.last_school_attended || null,
//           special_health_needs: item.special_health_needs || null,
//           blood_group: item.blood_group || null,
//           admission_date: item.admission_date ? moment(item.admission_date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
//           mother_tongue: item.mother_tongue || null,
//           language_known: item.language_known || null,
//           transfer_certificate: item.transfer_certificate || null,
//           profile_picture: item.profile_picture || null,
//           medical_condition: item.medical_condition || null,
//           createdAt: new Date(),
//           updatedAt: new Date()
//         });

//         detailedResults.push({
//           row,
//           status: 'success',
//           student_name: item.student_name,
//           admission_no: admissionNo,
//           message: 'Student created successfully'
//         });
//       }

//       // ✅ BULK CREATE using correct model reference
//       await Student.bulkCreate(studentsToCreate, {
//         transaction: t,
//         validate: true
//       });

//       await lockedLocation.update({ code: currentCode }, { transaction: t });

//       return { detailedResults, total: actions.length };
//     });

//     // === STEP 5: Success response ===
//     const { detailedResults, total } = result;
//     const successCount = detailedResults.length;

//     res.status(201).json({
//       success: true,
//       message: `Bulk operation completed: ${successCount} successful, ${total - successCount} failed`,
//       summary: {
//         total,
//         successful: successCount,
//         failed: total - successCount,
//         success_rate: Math.round((successCount / total) * 100)
//       },
//       detailed_results: detailedResults,
//       successes: detailedResults,
//       errors: []
//     });

//     console.log(`[BULK STUDENTS] Completed: ${successCount}/${total} successful`);

//   } catch (error) {
//     console.error('[BULK STUDENTS] Critical error:', error);

//     res.status(500).json({
//       success: false,
//       message: 'Critical error during bulk student creation',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

const studentsBulk = async (req, res) => {
  // Allow up to 10 minutes for large bulk operations
  req.setTimeout(10 * 60 * 1000);

  const school_id = req.body?.school_id || req.user?.school_id;
  const branch_id = req.body?.branch_id || req.user?.branch_id;

  if (!school_id || !branch_id) {
    return res.status(400).json({
      success: false,
      message: 'school_id and branch_id are required (via body or auth context)'
    });
  }

  try {
    const rawActions = Array.isArray(req.body) ? req.body : [req.body];
    
    // 🔒 Enforce max batch size to prevent timeout/abuse
    if (rawActions.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 students allowed per bulk request'
      });
    }

    const actions = rawActions.map(item => {
      const { school_id: _, branch_id: __, ...rest } = item;
      return rest;
    });

    console.log(`[BULK STUDENTS] Processing ${actions.length} records for school=${school_id}, branch=${branch_id}`);

    // === STEP 1: Validate classes (case-insensitive) ===
    const classIdentifiers = [...new Set(
      actions
        .map(s => s.current_class?.trim())
        .filter(cls => cls != null && cls !== '')
    )];

    let validClassMap = new Map();

    if (classIdentifiers.length > 0) {
      const normalizedIdentifiers = classIdentifiers.map(id => id.toUpperCase());
      const validClasses = await db.sequelize.query(
        `SELECT class_code, class_name, section 
         FROM classes 
         WHERE (UPPER(class_code) IN (:identifiers) OR UPPER(class_name) IN (:identifiers))
           AND school_id = :school_id 
           AND branch_id = :branch_id`,
        {
          replacements: {
            identifiers: normalizedIdentifiers,
            school_id,
            branch_id
          },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      for (const cls of validClasses) {
        if (cls.class_code) validClassMap.set(cls.class_code.toUpperCase(), cls);
        if (cls.class_name) validClassMap.set(cls.class_name.toUpperCase(), cls);
      }
    }

    // === STEP 2: Validate each student ===
    const validationResults = actions.map((item, idx) => {
      const row = idx + 1;
      const errors = [];

      if (!item.student_name?.trim()) errors.push('Student name is required');
      if (!item.current_class?.trim()) errors.push('Current class is required');
      if (!item.sex?.trim()) errors.push('Gender is required');

      const normalizedClass = item.current_class?.trim().toUpperCase();
      if (normalizedClass && !validClassMap.has(normalizedClass)) {
        errors.push(`Invalid class: "${item.current_class}" not found for this school and branch`);
      }

      return {
        row,
        valid: errors.length === 0,
        errors,
         item,
        normalizedClass
      };
    });

    const invalidRecords = validationResults.filter(r => !r.valid);
    if (invalidRecords.length > 0) {
      const errorDetails = invalidRecords.map(r => ({
        row: r.row,
        student_name: r.data.student_name || 'Unknown',
        message: r.errors.join('; ')
      }));

      return res.status(400).json({
        success: false,
        message: `${invalidRecords.length} student(s) failed validation`,
        summary: {
          total: actions.length,
          successful: 0,
          failed: invalidRecords.length,
          success_rate: 0
        },
        detailed_results: errorDetails.map(e => ({ ...e, status: 'error' })),
        errors: errorDetails,
        successes: []
      });
    }

    // === STEP 3: Get school location & branch index ===
    const SchoolLocation = db.sequelize.model('SchoolLocation');
    const schoolLocation = await SchoolLocation.findOne({ where: { school_id, branch_id } });

    if (!schoolLocation) {
      return res.status(400).json({
        success: false,
        message: 'School location not found for this school and branch'
      });
    }

    const branchIndexResult = await db.sequelize.query(
      `SELECT COUNT(*) as count 
       FROM school_locations 
       WHERE school_id = :school_id 
         AND id <= (SELECT id FROM school_locations WHERE school_id = :school_id AND branch_id = :branch_id)`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    const branch_index = parseInt(branchIndexResult[0].count, 10);

    // === STEP 4: Transaction & optimized student creation ===
    const result = await db.sequelize.transaction(async (t) => {
      const Student = db.sequelize.model('Student');

      const lockedLocation = await SchoolLocation.findOne({
        where: { school_id, branch_id },
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!lockedLocation) {
        throw new Error('Could not lock school location for admission number generation');
      }

      // ✅ Hash default password ONCE
      const hashedPassword = await bcrypt.hash("123456", 10);

      let currentCode = lockedLocation.code;
      const studentsToCreate = [];
      const detailedResults = [];

      // ✅ PURE SYNCHRONOUS LOOP — no awaits inside!
      for (let i = 0; i < actions.length; i++) {
        const item = actions[i];
        const normalizedClass = validationResults[i].normalizedClass;
        const classData = validClassMap.get(normalizedClass);

        // Parse name: last word = surname
        const parts = item.student_name.trim().split(/\s+/);
        if (parts.length < 2) {
          throw new Error(`Row ${i + 1}: Student name must contain at least first name and surname`);
        }
        const surname = parts[parts.length - 1];
        const first_name = parts[0];
        const other_names = parts.slice(1, -1).join(' ') || null;

        // Reconstruct full name in natural order
        const student_name = [first_name, other_names, surname].filter(Boolean).join(' ');
        // console.log({ schoolLocation: schoolLocation.short_name,
        //   branch_index: branch_index,
        // },'TTTTTTEEEEEESSSSSSTTTTTTT=====>>>');

        // ✅ Generate admission number WITHOUT DB check (safe under lock)
        const admissionNo = (item.admission_no && item.admission_no.trim() !== '')? item.admission_no.trim() : generateAdmissionNumber(
          schoolLocation.short_name,
          branch_index,
          currentCode + 1
        );
        currentCode++;
        studentsToCreate.push({
          student_name,
          surname,
          first_name,
          other_names,
          sex: item.sex || null,
          admission_no: admissionNo,
          academic_year: item.academic_year || new Date().getFullYear().toString(),
          status: 'Active',
          student_type: 'Returning',
          current_class: classData.class_code,
          class_name: classData.class_name,
          section: item.section || classData.section || null,
          branch_id,
          school_id,
          password: hashedPassword, // reused
          parent_id: item.parent_id || null,
          guardian_id: item.guardian_id || null,
          home_address: item.home_address || null,
          date_of_birth: item.date_of_birth ? moment(item.date_of_birth).format('YYYY-MM-DD') : null,
          religion: item.religion || null,
          tribe: item.tribe || null,
          state_of_origin: item.state_of_origin || null,
          l_g_a: item.l_g_a || null,
          nationality: item.nationality || null,
          last_school_attended: item.last_school_attended || null,
          special_health_needs: item.special_health_needs || null,
          blood_group: item.blood_group || null,
          admission_date: item.admission_date ? moment(item.admission_date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
          mother_tongue: item.mother_tongue || null,
          language_known: item.language_known || null,
          transfer_certificate: item.transfer_certificate || null,
          profile_picture: item.profile_picture || null,
          medical_condition: item.medical_condition || null,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        detailedResults.push({
          row: i + 1,
          status: 'success',
          student_name,
          admission_no:admissionNo,
          message: 'Student created successfully'
        });
      }

      // ✅ Only 2 async operations after loop
      await Student.bulkCreate(studentsToCreate, {
        transaction: t,
        validate: true
      });

      await lockedLocation.update({ code: currentCode }, { transaction: t });

      return { detailedResults, total: actions.length };
    });

    // === STEP 5: Success response ===
    const { detailedResults, total } = result;
    const successCount = detailedResults.length;

    res.status(201).json({
      success: true,
      message: `Bulk operation completed: ${successCount} successful, ${total - successCount} failed`,
      summary: {
        total,
        successful: successCount,
        failed: total - successCount,
        success_rate: Math.round((successCount / total) * 100)
      },
      detailed_results: detailedResults,
      successes: detailedResults,
      errors: []
    });

    console.log(`[BULK STUDENTS] Completed: ${successCount}/${total} successful`);

  } catch (error) {
    console.error('[BULK STUDENTS] Critical error:', error);

    res.status(500).json({
      success: false,
      message: 'Critical error during bulk student creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const students_v2 = async (req, res) => {
  // Destructure request body with defaults
  const {
    id = null,
    parent_id = null, // ← Provided only when linking to EXISTING parent
    student_class = null, // Fixed typo: was "studen_class"
    guardian_id = null,
    surname = null,
    first_name = null,
    other_name = null,
    phone_number = null,
    email = null,
    home_address = null,
    date_of_birth = null,
    sex = null,
    religion = null,
    tribe = null,
    state_of_origin = null,
    l_g_a = null,
    nationality = null,
    last_school_attended = null,
    special_health_needs = null,
    blood_group = null,
    admission_no = null,
    admission_date = null,
    academic_year = null,
    status = null,
    section = null,
    mother_tongue = null,
    language_known = null,
    transfer_certificate = null,
    profile_picture = null,
    medical_condition = null,
    query_type = null,
    parents = [], // ← Only used when CREATING NEW parents
    current_class = null,
    branch_id = null,
    short_name = null,
    school_id = null,
    password = "123456",
  } = req.body;

  // 🔐 Helper: hash password if needed
  const saltedPassword = async (pwd) => {
    if (!pwd) return null;
    if (pwd.length > 15) return pwd; // Assume already hashed
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(pwd, salt);
  };

  try {
    const hashedPassword = await saltedPassword(password);

    // 🧾 Wrap everything in a transaction
    const results = await db.sequelize.transaction(async (transaction) => {
      let finalParentId = parent_id; // Start with provided ID (could be null)

      // 🔹 CASE: Creating a NEW primary parent (only if no parent_id given)
      if (!parent_id && Array.isArray(parents) && parents.length > 0) {
        const primaryParent = parents[0];
        const {
          fullname,
          phone,
          relationship,
          occupation,
          email = null,
          is_gurdian = null,
        } = primaryParent;

        // Only create if required fields are present
        if (fullname && phone && relationship && occupation) {
          const parentResult = await db.sequelize.query(
            `CALL parents(
              'create',
              NULL,
              :name,
              :phone,
              :email,
              :relationship,
              :is_gurdian,
              :occupation,
              NULL,
              :school_id
            )`,
            {
              replacements: {
                name: fullname,
                phone,
                email,
                relationship,
                is_gurdian,
                occupation,
                school_id: req?.user?.school_id,
              },
              transaction,
            }
          );

          // Extract new parent ID (adjust key based on your stored procedure output)
          finalParentId =
            parentResult[0]?.parent_id ||
            parentResult[0]?.id ||
            parentResult[0]?.insertId ||
            null;

          if (!finalParentId) {
            throw new Error("Failed to retrieve newly created parent ID");
          }
        }
        // If validation fails, finalParentId stays null → student has no parent
      }

      // 🔹 Create or update the student
      const studentResults = await db.sequelize.query(
        `CALL students_queries_v2(
          :query_type,
          :id,
          :parent_id,
          :guardian_id,
          :surname,
          :first_name,
          :other_name,
          :home_address,
          :date_of_birth,
          :sex,
          :religion,
          :tribe,
          :state_of_origin,
          :l_g_a,
          :nationality,
          :last_school_attended,
          :special_health_needs,
          :blood_group,
          :admission_no,
          :admission_date,
          :academic_year,
          :status,
          :section,
          :mother_tongue,
          :language_known,
          :current_class,
          :profile_picture,
          :medical_condition,
          :transfer_certificate,
          :school_location,
          :school_id,
          :password
        )`,
        {
          replacements: {
            query_type: query_type || "create",
            id,
            parent_id: finalParentId,
            guardian_id,
            surname,
            first_name,
            other_name,
            home_address,
            date_of_birth: moment(date_of_birth).isValid()
              ? moment(date_of_birth).format("YYYY-MM-DD")
              : null,
            sex,
            religion,
            tribe,
            state_of_origin,
            l_g_a,
            nationality,
            last_school_attended,
            special_health_needs,
            blood_group,
            admission_no,
            admission_date: admission_date
              ? moment(admission_date).isValid()
                ? moment(admission_date).format("YYYY-MM-DD")
                : new Date().toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            academic_year,
            status,
            section,
            mother_tongue,
            language_known,
            current_class: current_class || student_class,
            profile_picture,
            medical_condition,
            transfer_certificate,
            school_location: branch_id ?? req?.user?.branch_id,
            school_id: req?.user?.school_id,
            password: hashedPassword,
          },
          transaction,
        }
      );

      // Ensure we have an admission number to link additional parents
      const admissionNo = studentResults[0]?.admission_no;
      if (!admissionNo) {
        throw new Error("Student saved but admission number is missing");
      }

      // 🔹 Link additional parents (if any)
      if (Array.isArray(parents) && parents.length > 0) {
        const startIndex = parent_id ? 0 : 1; // Skip primary if we created it

        for (let i = startIndex; i < parents.length; i++) {
          const p = parents[i];
          const {
            fullname,
            phone,
            relationship,
            occupation,
            email = null,
            is_gurdian = null,
          } = p;

          if (fullname && phone && relationship && occupation) {
            await db.sequelize.query(
              `CALL parents(
                'create',
                NULL,
                :name,
                :phone,
                :email,
                :relationship,
                :is_gurdian,
                :occupation,
                :children_admin_no,
                :school_id
              )`,
              {
                replacements: {
                  name: fullname,
                  phone,
                  email,
                  relationship,
                  is_gurdian,
                  occupation,
                  children_admin_no: admissionNo,
                  school_id: req?.user?.school_id,
                },
                transaction,
              }
            );
          }
        }
      }

      return studentResults;
    });

    // ✅ Success response
    return res.status(200).json({
      success: true,
      message: "Student operation completed successfully",
      data: results[0] || results,
    });
  } catch (err) {
    console.error("❌ Student controller error:", err);
    return res.status(500).json({
      success: false,
      message: "Student operation failed. All changes have been rolled back.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const studentsBulk_v2 = async (req, res) => {
  console.log(req.user.user);

  try {
    const actions = Array.isArray(req.body) ? req.body : [req.body];

    const results = await db.sequelize.transaction(async (t) => {
      const promises = actions.map(async (item) => {
        const {
          id = null,
          parent_id = null,
          student_class = null,
          guardian_id = null,
          surname = null,
          first_name = null,
          other_name = null,
          phone_number = null,
          email = null,
          home_address = null,
          date_of_birth = null,
          sex = null,
          religion = null,
          tribe = null,
          state_of_origin = null,
          l_g_a = null,
          nationality = null,
          last_school_attended = null,
          special_health_needs = null,
          blood_group = null,
          admission_no = null,
          admission_date = null,
          academic_year = null,
          status = null,
          section = null,
          mother_tongue = null,
          language_known = null,
          transfer_certificate = null,
          profile_picture = null,
          medical_condition = null,
          current_class = null,
          branch_id = null,
          school_id = null,
          password = "123456",
        } = item;
        //return salted password
        const saltedPassword = async (password) => {
          if (!password) {
            return null; // or handle as needed
          } else if (password.length > 15) {
            return password; // If password is already salted, return it as is
          }
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(password, salt);
          return hash;
        };

        const hashed = await saltedPassword(password);
        // You can now use `hashed` directly wherever needed

        return db.sequelize.query(
          `CALL students_queries_v2(
            :query_type,
            :id,
            :parent_id,
            :guardian_id,
            :surname,
            :first_name,
            :other_name,
            :home_address,
            :date_of_birth,
            :sex,
            :religion,
            :tribe,
            :state_of_origin,
            :l_g_a,
            :nationality,
            :last_school_attended,
            :special_health_needs,
            :blood_group,
            :admission_no,
            :admission_date,
            :academic_year,
            :status,
            :section,
            :mother_tongue,
            :language_known,
            :current_class,
            :profile_picture,
            :medical_condition,
            :transfer_certificate,
            :branch_id,
            :school_id,
            :password
          )`,
          {
            replacements: {
              query_type: "BULK RETURNINGS",
              id,
              parent_id,
              guardian_id,
              surname,
              first_name,
              other_name,
              phone_number,
              email,
              home_address,
              date_of_birth: moment(date_of_birth).isValid()
                ? moment(date_of_birth).format("YYYY-MM-DD") // returns a proper JS Date
                : null,
              sex,
              religion,
              tribe,
              state_of_origin,
              l_g_a,
              nationality,
              last_school_attended,
              special_health_needs,
              blood_group,
              admission_no,
              admission_date: admission_date || moment().format("YYYY-MM-DD"),
              academic_year,
              status,
              section,
              mother_tongue,
              language_known,
              transfer_certificate,
              profile_picture,
              medical_condition,
              current_class,
              branch_id: req?.user?.branch_id || branch_id,
              school_id: req?.user?.school_id || school_id,
              student_class,
              password: hashed,
            },
            transaction: t,
          }
        );
      });

      return await Promise.all(promises);
    });

    res.status(200).json({
      message: "Bulk operation successful",
      data: results,
      success: true,
    });
  } catch (error) {
    console.error("Error in bulk operation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const studentAttendances = (req, res) => {
  // Ensure `data` is always an array for batch processing
  const data = Array.isArray(req.body) ? req.body : [req.body];

  // Map over data array to create a promise for each item
  const promises = data.map((item) => {
    const {
      query_type = null,
      id = null,
      teacher_name = null,
      teacher_id = null,
      student_id = null,
      section = null,
      class_name = null,
      day = null,
      status = null,
      student_name = null,
      admission_no = null,
      term = null,
      academic_year = null,
      start_date = null,
      end_date = null,
      notes = null,
      // school_id = null,
      branch_id = null,
    } = item;

    // Call the stored procedure with necessary replacements
    return db.sequelize.query(
      `CALL students_attendances(
                :query_type,
                :id,
                :teacher_id,
                :teacher_name,
                :section,
                :class_name,
                :day,
                :status,
                :student_name,
                :admission_no,
                :term,
                :academic_year,
                :start_date,
                :end_date,
                :notes,
                :school_id,
                :branch_id
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
          end_date,
          notes,
          school_id: req.user?.school_id || null,
          branch_id: req.user.branch_id || branch_id,
        },
      }
    );
  });

  // Execute all promises and respond once all are completed
  Promise.all(promises)
    .then((results) => res.json({ success: true, data: results.flat() }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    });
};

const updateParent = async (req, res) => {
  const {
    query_type = "update_parent",
    parent_id = "",
    fullname = "",
    phone = "",
    email = "",
    occupation = "",
    school_id = "",
    user_id = 0,
    role = "",
    nationality = "",
    address = "",
    state = "",
    l_g_a = "",
    passport_url = null,
  } = req.body;

  try {
    const result = await db.sequelize.query(
      `CALL update_parent(:query_type, :parent_id, :fullname, :phone, :email, :occupation, :school_id, :user_id, :role, :nationality, :address, :state, :l_g_a,:passport_url);`,
      {
        replacements: {
          query_type,
          parent_id,
          fullname,
          phone,
          email,
          occupation,
          school_id: req.user.school_id ?? school_id,
          user_id,
          role,
          nationality,
          address,
          state,
          l_g_a,
          passport_url,
        },
      }
    );

    res
      .status(200)
      .json({ message: "Parent updated successfully", result, success: true });
  } catch (error) {
    console.error("Error updating parent:", error);
    res.status(500).json({ message: "Error updating parent", error });
  }
};
const getStudentDashboard = async (req, res) => {
  try {
    const {
      admission_no = null,
      class_name = null,
      class_code = null,
      query_type = null,
    } = req.query;
    const branch_id = req.query.branch_id || req.user.branch_id;
    const school_id = req.query.school_id || req.user.school_id;
    const academic_year =
      req.query.academic_year || req.headers["x-academic-year"] || null;
    const term = req.query.term || req.headers["x-term"] || null;

    const results = await db.sequelize.query(
      `CALL get_student_dashboard_data(:admission_no, :class_name, :class_code, :school_id,:branch_id, :academic_year, :term,:query_type)`,
      {
        replacements: {
          admission_no,
          class_name,
          class_code,
          school_id,
          branch_id,
          academic_year,
          term,
          query_type,
        },
      }
    );

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching teacher dashboard summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch teacher dashboard summary",
      error: error.message,
    });
  }
};

// Soft delete student function using Sequelize ORM
const softDeleteStudent = async (req, res) => {
  console.log('Soft delete request:', req.body);
  console.log('Authenticated user:', req.user);

  try {
    const {
      admission_no = null,
      deleted_by = null,
      branch_id = null,
      school_id = null,
      reason = null,
    } = req.body;

    // Validate required fields
    if (!admission_no) {
      return res.status(400).json({
        success: false,
        message: 'Admission number is required for deletion'
      });
    }

    // Get deleted_by from request body or authenticated user
    const finalDeletedBy = deleted_by || req?.user?.id || req?.user?.user_id || 'system';

    if (!finalDeletedBy || finalDeletedBy === 'system') {
      console.warn('No user ID found in request body or authenticated user context, using system as fallback');
    }

    // Check if Student model exists
    if (!db.Student) {
      return res.status(500).json({
        success: false,
        message: 'Student model not found - please check database configuration'
      });
    }

    const currentTimestamp = new Date();
    const deleteReason = reason || 'Student deleted by admin';
    const finalSchoolId = school_id || req?.user?.school_id;
    const finalBranchId = branch_id || req?.user?.branch_id;

    // First find the student using Sequelize ORM
    const student = await db.Student.findOne({
      where: {
        admission_no: admission_no,
        school_id: finalSchoolId,
        ...(finalBranchId && { branch_id: finalBranchId })
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or access denied',
        admission_no
      });
    }

    // Check if student is already deleted
    if (student.status === 'Deleted') {
      return res.status(400).json({
        success: false,
        message: 'Student is already deleted',
        admission_no,
        student_name: student.student_name
      });
    }

    // Prepare deletion metadata
    const deletionMetadata = `${deleteReason} | Deleted by: ${finalDeletedBy} | Deleted at: ${currentTimestamp.toISOString()}`;

    // Perform soft delete using Sequelize ORM update
    const [affectedRows] = await db.Student.update(
      {
        status: 'Deleted',
        transfer_certificate: deletionMetadata,
        updated_at: currentTimestamp
      },
      {
        where: {
          admission_no: admission_no,
          school_id: finalSchoolId,
          ...(finalBranchId && { branch_id: finalBranchId })
        }
      }
    );

    if (affectedRows > 0) {
      // Log the deletion for audit purposes
      console.log(`Student soft deleted: ${admission_no} (${student.student_name}) by user ${finalDeletedBy}`);

      res.json({
        success: true,
        message: `Student ${student.student_name} has been successfully deleted`,
        data: {
          admission_no,
          student_name: student.student_name,
          previous_status: student.status,
          new_status: 'Deleted',
          deleted_by: finalDeletedBy,
          deleted_at: currentTimestamp.toISOString(),
          reason: deleteReason,
          affected_rows: affectedRows
        }
      });
    } else {
      // This shouldn't happen since we found the student, but handle it anyway
      console.error(`Soft delete failed for ${admission_no}: No rows affected despite student being found`);

      res.status(500).json({
        success: false,
        message: 'Unexpected error: Student found but update failed',
        admission_no
      });
    }

  } catch (error) {
    console.error('Critical error in soft delete operation:', error);

    // Handle specific Sequelize errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error during deletion',
        error: error.errors?.map(e => e.message).join(', ') || error.message,
        admission_no: req.body.admission_no
      });
    }

    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({
        success: false,
        message: 'Database error during deletion',
        error: error.message,
        admission_no: req.body.admission_no
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during deletion',
      error: error.message,
      admission_no: req.body.admission_no
    });
  }
};

const updateStudentDetails = async (req, res) => {
  const {
    id,
    student_name,
    admission_no,
    sex,
    date_of_birth,
    religion,
    current_class, // This is the class_code
    state_of_origin,
    school_id,
    branch_id,
    profile_picture,
    email,
    mobile_no,
    address,
  } = req.body;

  try {
    let class_name = null;
    let section_from_class = req.body.section; // Keep original section if class not changed

    if (current_class) {
        const classInfo = await db.Class.findOne({
          where: {
            class_code: current_class,
            school_id: school_id,
            branch_id: branch_id,
          },
        });
        if (classInfo) {
            class_name = classInfo.class_name;
            section_from_class = classInfo.section; // Get section from class
        }
    }

    const updateData = {
        student_name,
        sex,
        date_of_birth: moment(date_of_birth).isValid()
          ? moment(date_of_birth).format("YYYY-MM-DD")
          : null,
        religion,
        section: section_from_class, // Use the section from the class
        state_of_origin,
        profile_picture,
        email,
        phone_number: mobile_no,
        home_address: address,
    };

    if (current_class) {
        updateData.current_class = current_class;
        updateData.class_code = current_class;
        updateData.class_name = class_name;
    }

    const [updateCount] = await db.Student.update(
      updateData,
      {
        where: {
          id: id,
          admission_no: admission_no,
          school_id: school_id,
          branch_id: branch_id,
        },
      }
    );

    if (updateCount > 0) {
      const updatedStudent = await db.Student.findOne({ where: { id: id } });
      res.json({ success: true, results: updatedStudent });
    } else {
      const studentExists = await db.Student.count({ where: { id: id } });
      if (studentExists > 0) {
        const student = await db.Student.findOne({ where: { id: id } });
        res.json({ success: true, results: student, message: "No changes detected." });
      } else {
        res.status(404).json({ success: false, message: "Student not found." });
      }
    }
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the student.",
    });
  }
};

const updateStudentStream = async (req, res) => {
  try {
    const { admission_no, stream, branch_id } = req.body;

    // Validate required fields
    if (!admission_no || !stream || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "admission_no, stream, and branch_id are required",
      });
    }

    // Find student
    const student = await db.Student.findOne({
      where: {
        admission_no,
        branch_id,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Update stream
    await student.update({ stream });

    return res.status(200).json({
      success: true,
      message: "Student stream updated successfully",
      data: {
        admission_no: student.admission_no,
        stream: student.stream,
        student
      },
    });
  } catch (err) {
    console.error("🔥 Error updating stream:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

module.exports = {
  secondary_school_entrance_form,
  exam_garding,
  get_secondary_school_entrance_form,
  get_secondary_school_entrance_form_,
  update_secondary_school_entrance_form,
  update_current_class_secondary_school_entrance_form,
  students,
  students_v2,
  studentAttendances,
  getParent,
  studentsBulk,
  studentsBulk_v2,
  Parents,
  updateParent,
  getStudentDashboard,
  softDeleteStudent,
  updateStudentDetails,
  updateStudentStream
};
