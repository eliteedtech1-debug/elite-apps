const db = require("../models");
const dayjs = require("dayjs");
const AdmissionHelpers = require('../utils/admissionHelpers');
const { Op } = require('sequelize');

class AdmissionApplicationController {
  // Submit new admission application
  static async submitApplication(req, res) {
    try {
      const {
        name_of_applicant,
        date_of_birth,
        gender,
        home_address,
        type_of_application,
        class_id,
        state_of_origin,
        l_g_a,
        last_school_attended,
        last_class,
        special_health_needs,
        guardian_name,
        guardian_phone,
        guardian_email,
        guardian_address,
        guardian_relationship,
        parent_fullname,
        parent_phone,
        parent_email,
        parent_address,
        parent_occupation,
        academic_year,
        school_id,
        branch_id,
        token_code,
        payment_reference
      } = req.body;

      // Validate required fields
      if (!school_id || !branch_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'school_id and branch_id are required' 
        });
      }

      // Check if admission is open for this branch
      const [admissionSettings] = await db.sequelize.query(
        `SELECT 
          admission_open,
          admission_closing_date,
          CASE 
            WHEN admission_closing_date IS NOT NULL 
                 AND admission_closing_date <= CURDATE() 
            THEN 0
            ELSE admission_open
          END as effective_admission_open
         FROM school_admission_settings 
         WHERE school_id = :school_id AND branch_id = :branch_id`,
        { replacements: { school_id, branch_id } }
      );

      const settings = admissionSettings[0];
      if (settings && settings.effective_admission_open === 0) {
        return res.status(403).json({
          success: false,
          error: 'Admission is currently closed for this branch',
          details: {
            admission_open: settings.admission_open,
            admission_closing_date: settings.admission_closing_date,
            message: settings.admission_closing_date && new Date(settings.admission_closing_date) <= new Date() 
              ? 'Admission has closed due to deadline' 
              : 'Admission has been manually closed'
          }
        });
      }

      // Validate class belongs to school/branch
      if (class_id && !await AdmissionHelpers.validateClass(class_id, school_id, branch_id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid class for school/branch' 
        });
      }

      // Verify branch belongs to school
      if (!await AdmissionHelpers.validateBranch(school_id, branch_id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid branch for school' 
        });
      }

      // Enforce access rules (token or payment)
      const accessValidation = await AdmissionHelpers.validateAccess(
        school_id, 
        branch_id, 
        token_code, 
        payment_reference
      );
      
      if (!accessValidation.valid) {
        return res.status(400).json({
          success: false,
          error: accessValidation.message
        });
      }

      // Get class name from class_id for stored procedure
      let className = type_of_application;
      if (class_id) {
        const classes = await AdmissionHelpers.getActiveClasses(school_id, branch_id);
        const selectedClass = classes.find(c => c.id === parseInt(class_id));
        className = selectedClass ? selectedClass.class_name : type_of_application;
      }

      const result = await db.sequelize.query(
        `CALL school_admission_form(
          :query_type, :upload, :applicant_id, :guardian_id, :parent_id,
          :type_of_application, :name_of_applicant, :home_address, :date_of_birth,
          :guardian_name, :guardian_phone, :guardian_email, :guardian_address, :guardian_relationship,
          :parent_fullname, :parent_phone, :parent_email, :parent_address, :parent_occupation,
          :state_of_origin, :l_g_a, :last_school_attended, :mathematics, :english,
          :special_health_needs, :sex, :admission_no, :school, :status,
          :academic_year, :school_id, :branch_id, :short_name, :last_class, :others, :in_id, :p_other_score
        )`,
        {
          replacements: {
            query_type: 'create',
            upload: '',
            applicant_id: '',
            guardian_id: '',
            parent_id: '',
            type_of_application: className,
            name_of_applicant,
            home_address,
            date_of_birth: date_of_birth ? dayjs(date_of_birth).format("YYYY-MM-DD") : null,
            guardian_name,
            guardian_phone,
            guardian_email,
            guardian_address,
            guardian_relationship,
            parent_fullname,
            parent_phone,
            parent_email,
            parent_address,
            parent_occupation,
            state_of_origin,
            l_g_a,
            last_school_attended,
            mathematics: '',
            english: '',
            special_health_needs,
            sex: gender,
            admission_no: '',
            school: '',
            status: 'submitted',
            academic_year,
            school_id,
            branch_id,
            short_name: '',
            last_class,
            others: '',
            in_id: null,
            p_other_score: 0
          }
        }
      );

      // Mark token as used if provided
      if (accessValidation.token) {
        await AdmissionToken.increment('used_count', {
          where: { token_code: accessValidation.token.token_code }
        });
        
        // Update status if usage limit reached
        if (accessValidation.token.used_count + 1 >= accessValidation.token.usage_limit) {
          await AdmissionToken.update(
            { status: 'used' },
            { where: { token_code: accessValidation.token.token_code } }
          );
        }
      }

      res.json({ 
        success: true, 
        data: result[0],
        access_method: accessValidation.method
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get application by ID
  static async getApplication(req, res) {
    try {
      const { id } = req.params;
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id;

      const result = await db.sequelize.query(
        `CALL school_admission_form(
          :query_type, '', :applicant_id, '', '', '', '', '', null,
          '', '', '', '', '', '', '', '', '', '',
          '', '', '', '', '', '', '', '', '',
          '', :school_id, :branch_id, '', '', '', :in_id, :p_other_score
        )`,
        {
          replacements: {
            query_type: 'select_id',
            applicant_id: '',
            school_id,
            branch_id,
            in_id: id,
            p_other_score: 0
          }
        }
      );

      if (result[0] && result[0].length > 0) {
        res.json({ success: true, data: result[0][0] });
      } else {
        res.status(404).json({ success: false, message: 'Application not found' });
      }
    } catch (error) {
      console.error('Error getting application:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get all applications for school/branch
  static async getApplications(req, res) {
    try {
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id;
      const { status, academic_year } = req.query;

      const result = await db.sequelize.query(
        `CALL school_admission_form(
          :query_type, '', '', '', '', '', '', '', null,
          '', '', '', '', '', '', '', '', '', '',
          '', '', '', '', '', '', '', '', '',
          :status, :academic_year, :school_id, :branch_id, '', '', '', :in_id, :p_other_score
        )`,
        {
          replacements: {
            query_type: 'select',
            status: status || '',
            academic_year: academic_year || '',
            school_id,
            branch_id,
            in_id: null,
            p_other_score: 0
          }
        }
      );

      res.json({ success: true, data: result[0] });
    } catch (error) {
      console.error('Error getting applications:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update application status
  static async updateStatus(req, res) {
    try {
      const { applicant_id, status, mathematics, english, other_score, notes } = req.body;
      const user_school_id = req.user.school_id;

      if (!applicant_id || !status) {
        return res.status(400).json({ 
          success: false, 
          error: 'applicant_id and status are required' 
        });
      }

      // Direct update to school_applicants table
      await db.sequelize.query(
        `UPDATE school_applicants 
         SET status = :status,
             mathematics = COALESCE(:mathematics, mathematics),
             english = COALESCE(:english, english),
             other_score = COALESCE(:other_score, other_score)
         WHERE applicant_id = :applicant_id AND school_id = :school_id`,
        {
          replacements: {
            applicant_id,
            status,
            mathematics: mathematics || null,
            english: english || null,
            other_score: other_score || null,
            school_id: user_school_id
          }
        }
      );

      res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Public endpoint to check application status by application ID
  static async getApplicationStatus(req, res) {
    try {
      const { applicant_id } = req.query;

      if (!applicant_id) {
        return res.status(400).json({ success: false, message: 'applicant_id query parameter is required' });
      }

      const [application] = await db.sequelize.query(
        `SELECT 
          sa.applicant_id,
          sa.name_of_applicant,
          sa.date_of_birth,
          sa.sex as gender,
          sa.home_address,
          sa.status,
          sa.type_of_application,
          sa.academic_year,
          sa.state_of_origin,
          sa.l_g_a,
          sa.mathematics,
          sa.english,
          sa.other_score,
          c.class_name,
          p.fullname as parent_fullname,
          p.phone as parent_phone,
          p.email as parent_email,
          p.address as parent_address,
          ss.school_name,
          sl.branch_name,
          ss.badge_url as school_logo,
          ss.address as school_address,
          ss.primary_contact_number as school_phone,
          ss.email_address as school_email,
          sl.location as branch_address
        FROM school_applicants sa
        LEFT JOIN parents p ON sa.parent_id = p.parent_id
        LEFT JOIN classes c ON sa.current_class = c.class_code AND c.school_id = sa.school_id
        LEFT JOIN school_setup ss ON sa.school_id = ss.school_id
        LEFT JOIN school_locations sl ON sa.branch_id = sl.branch_id
        WHERE sa.applicant_id = :applicant_id`,
        {
          replacements: { applicant_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }

      res.json({ success: true, data: application });
    } catch (error) {
      console.error('Error fetching application status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = AdmissionApplicationController;
