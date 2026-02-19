const db = require("../models");
const moment = require("moment");


const school_admission_form = (req, res) => {
    const {
      upload = "",
      applicant_id = "",
      guardian_id = "",
      parent_id = "",
      type_of_application = "",
      name_of_applicant = "",
      home_address = "",
      date_of_birth = null,
      guardian_name = "",
      guardian_phone_no = "",
      guardian_email = "",
      guardian_address = "",
      guardian_relationship = "",
      parent_fullname = "",
      parent_phone_no = "",
      parent_email = "",
      parent_address = "",
      parent_occupation = "",
      state_of_origin = "",
      l_g_a = "",
      last_school_attended = "",
      mathematics = "",
      english = "",
      special_health_needs = "",
      sex = "",
      admission_no = "",
      school = "",
      status = "pending",
      school_id = "",
      academic_year = "",
      short_name = "",
      last_class= "",
      others = "",
      subject_id = null,
      subject_name = "",
      section_id = null,
      exam_venue = "",
      exam_mark = 0,
      exam_status = "pending",
      other_score = 0,
      branch_id=null
    } = req.body;
  
    const { query_type = "create", id = null } = req.query;
  
    db.sequelize
      .query(
        `CALL school_admission_form(:query_type, :upload,:applicant_id,:guardian_id,:parent_id, :type_of_application, :name_of_applicant, :home_address, :date_of_birth, :guardian_name, :guardian_phone_no, :guardian_email, :guardian_address, :guardian_relationship, :parent_fullname, :parent_phone_no, :parent_email, :parent_address, :parent_occupation, :state_of_origin, :l_g_a, :last_school_attended, :mathematics, :english, :special_health_needs, :sex, :admission_no, :school, :status,:academic_year,:school_id,:branch_id,:short_name,:last_class,:others,:id,:other_score)`,
        {
          replacements: {
            query_type,
            upload,
            applicant_id,
            guardian_id,
            parent_id,
            type_of_application,
            name_of_applicant,
            home_address,
            date_of_birth: date_of_birth
              ? moment.utc(date_of_birth).local().format("YYYY-MM-DD")
              : null,
            guardian_name,
            guardian_phone_no,
            guardian_email,
            guardian_address,
            guardian_relationship,
            parent_fullname,
            parent_phone_no,
            parent_email,
            parent_address,
            parent_occupation,
            state_of_origin,
            l_g_a,
            last_school_attended,
            mathematics,
            english,
            special_health_needs,
            sex,
            admission_no,
            school,
            status,
            academic_year,
            school_id:req.user.school_id,
            branch_id:branch_id??req.user.branch_id,
            short_name,
            last_class,
            others,
            id,
            other_score
          },
        }
      )
      .then((data) => res.json({ success: true, data }))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
      });
};

const school_application_form = (req, res) => {
  const {
    upload = "",
    applicant_id = "",
    guardian_id = "",
    parent_id = "",
    type_of_application = "",
    name_of_applicant = "",
    home_address = "",
    date_of_birth = null,
    guardian_name = "",
    guardian_phone_no = "",
    guardian_email = "",
    guardian_address = "",
    guardian_relationship = "",
    parent_fullname = "",
    parent_phone_no = "",
    email = "",
    parent_address = "",
    parent_occupation = "",
    state_of_origin = "",
    l_g_a = "",
    last_school_attended = "",
    mathematics = "",
    english = "",
    special_health_needs = "",
    sex = "",
    admission_no = "",
    school = "",
    status = "pending",
    school_id = "",
    academic_year = "",
    short_name = "",
    last_class= "",
    others = "",
    subject_id = null,
    subject_name = "",
    section_id = null,
    exam_venue = "",
    exam_mark = 0,
    exam_status = "pending",
    other_score = 0,
    branch_id=null
  } = req.body;

  const { query_type = "create", id = null } = req.query;

  db.sequelize
    .query(
      `CALL school_admission_form(:query_type, :upload,:applicant_id,:guardian_id,:parent_id, :type_of_application, :name_of_applicant, :home_address, :date_of_birth, :guardian_name, :guardian_phone_no, :guardian_email, :guardian_address, :guardian_relationship, :parent_fullname, :parent_phone_no, :email, :parent_address, :parent_occupation, :state_of_origin, :l_g_a, :last_school_attended, :mathematics, :english, :special_health_needs, :sex, :admission_no, :school, :status,:academic_year,:school_id,:branch_id,:short_name,:last_class,:others,:id,:other_score)`,
      {
        replacements: {
          query_type,
          upload,
          applicant_id,
          guardian_id,
          parent_id,
          type_of_application,
          name_of_applicant,
          home_address,
          date_of_birth: date_of_birth
            ? moment.utc(date_of_birth).local().format("YYYY-MM-DD")
            : null,
          guardian_name,
          guardian_phone_no,
          guardian_email,
          guardian_address,
          guardian_relationship,
          parent_fullname,
          parent_phone_no,
          email,
          parent_address,
          parent_occupation,
          state_of_origin,
          l_g_a,
          last_school_attended,
          mathematics,
          english,
          special_health_needs,
          sex,
          admission_no,
          school,
          status,
          academic_year,
          school_id,
          branch_id,
          short_name,
          last_class,
          others,
          id,
          other_score
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    });
};
const update_school_admission_form = async (req, res) => {
  try {
    const {
      applicant_id = "",
      mathematics = "",
      english = "",
      statusText = "",
      other_score = 0,
      branch_id = "",
    } = req.body;

    const school_id = req?.user?.dataValues?.school_id || null;

    await db.sequelize.query(
      `CALL update_student_scores(
        :applicant_id, 
        :mathematics,            
        :english,            
        :other_score,           
        :status,
        :branch_id,
        :school_id,          
        :query_type
      );`,
      {
        replacements: {
          applicant_id,
          mathematics,
          english,
          other_score,
          status: statusText,
          branch_id: branch_id ?? req.user.branch_id,
          school_id,
          query_type: statusText
        },
      }
    );

    if (statusText === "Assigned") {
      const {
        parent_id = null,
        guardian_id= null,
        name_of_applicant= null,
        home_address= null,
        date_of_birth= null,
        sex= null,
        religion= null,
        tribe= null,
        state_of_origin= null,
        l_g_a= null,
        nationality= null,
        last_school_attended= null,
        special_health_needs= null,
        blood_group= null,
        admission_no= null,
        academic_year= null,
        type_of_application= null,
        mother_tongue= null,
        language_known= null,
        current_class= null,
        profile_picture= null,
        medical_condition= null,
        transfer_certificate= null,
      } = req.body;

      await db.sequelize.query(
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
          :school_id
        )`,
        {
          replacements: {
            query_type: 'CREATE',
            id: null, 
            parent_id,
            guardian_id,
            student_name:name_of_applicant,
            home_address,
            date_of_birth,
            sex,
            religion,
            tribe,
            state_of_origin,
            l_g_a,
            nationality,
            last_school_attended :last_school_attended,
            special_health_needs,
            blood_group,
            admission_no,
            admission_date: new Date().toISOString().split("T")[0],
            academic_year,
            status: "Active", 
            section: type_of_application,
            mother_tongue,
            language_known,
            current_class,
            profile_picture,
            medical_condition,
            transfer_certificate,
            branch_id: branch_id?? req.user.branch_id,
            school_id:req.user.school_id||school_id,
          },
        }
      );
    }

    res.json({ success: true, message: "Operation successful" });
  } catch (err) {
    console.error("Error updating school admission form:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};




// const submitAdmissionForm = async (req, res) => {
//   try {
//     const {
//       query_type = "create",
//       id = null,
//       upload = "",
//       type_of_application = "",
//       name_of_applicant = "",
//       home_address = "",
//       date_of_birth = null,
//       guardian_name = "",
//       guardian_phone_no = "",
//       guardian_email = "",
//       guardian_address = "",
//       guardian_relationship = "",
//       parent_fullname = "",
//       parent_phone_no = "",
//       parent_email = "",
//       parent_address = "",
//       parent_occupation = "",
//       state_of_origin = "",
//       l_g_a = "",
//       last_school_attended = "",
//       mathematics = "",
//       english = "",
//       special_health_needs = "",
//       sex = "",
//       admission_no = "",
//       school = "",
//       status = "pending",
//       school_id = "",
//       academic_year = "",
//       subject_id = null,
//       subject_name = "",
//       section_id = null,
//       exam_venue = "",
//       exam_mark = 0,
//       exam_status = "pending",
//     } = req.body;

//     // Convert date format if date_of_birth is provided
//     const formattedDateOfBirth = date_of_birth
//       ? moment.utc(date_of_birth).local().format("YYYY-MM-DD")
//       : null;

//     const [admissionResult] = await db.sequelize.query(
//       `CALL school_admission_form(
//         :query_type, :upload, :type_of_application, 
//         :name_of_applicant, :home_address, :date_of_birth, 
//         :guardian_name, :guardian_phone_no, :guardian_email, 
//         :guardian_address, :guardian_relationship, :parent_fullname, 
//         :parent_phone_no, :parent_email, :parent_address, 
//         :parent_occupation, :state_of_origin, :l_g_a, 
//         :last_school_attended, :mathematics, :english, 
//         :special_health_needs, :sex, :admission_no, 
//         :school, :status, :academic_year, :school_id)`,
//       {
//         replacements: {
//           query_type,
//           id,
//           upload,
//           type_of_application,
//           name_of_applicant,
//           home_address,
//           date_of_birth: formattedDateOfBirth,
//           guardian_name,
//           guardian_phone_no,
//           guardian_email,
//           guardian_address,
//           guardian_relationship,
//           parent_fullname,
//           parent_phone_no,
//           parent_email,
//           parent_address,
//           parent_occupation,
//           state_of_origin,
//           l_g_a,
//           last_school_attended,
//           mathematics,
//           english,
//           special_health_needs,
//           sex,
//           admission_no,
//           school,
//           status,
//           school_id,
//           academic_year,
//         },
//       }
//     );

//     const applicant_id = admissionResult[0].applicant_id;

//     await db.sequelize.query(
//       `CALL entrance_exam_submission(
//         :subject_id, :subject_name, :school_id, :section_id, 
//         :academic_year, :exam_venue, :exam_mark, :applicant_id, :exam_status)`,
//       {
//         replacements: {
//           subject_id,
//           subject_name,
//           school_id,
//           section_id,
//           academic_year,
//           exam_venue,
//           exam_mark,
//           applicant_id,
//           exam_status,
//         },
//       }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Admission form and entrance exam submitted successfully.",
//     });
//   } catch (error) {
//     console.error("Error submitting admission form:", error);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while processing the request.",
//       error: error.message,
//     });
//   }
// };

module.exports = { school_admission_form,
  update_school_admission_form,
  school_application_form

 };
