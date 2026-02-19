const db = require("../models");
const paystackService = require('../services/paystackService');

class AdmissionBranchController {
  // Get branches with ongoing admissions
  static async getAdmissionBranches(req, res) {
    try {
      const { school_id } = req.query;

      if (!school_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id query parameter is required'
        });
      }

      const [branches] = await db.sequelize.query(
        `SELECT 
          sl.branch_id,
          sl.branch_name,
          ss.school_name,
          sl.school_id,
          COALESCE(sas.admission_open, 1) as admission_open,
          sas.admission_closing_date,
          CASE 
            WHEN COALESCE(sas.admission_open, 1) = 0 THEN 0
            WHEN sas.admission_closing_date IS NULL THEN COALESCE(sas.admission_open, 1)
            WHEN sas.admission_closing_date >= CURDATE() THEN COALESCE(sas.admission_open, 1)
            ELSE 0
          END as effective_admission_open,
          CASE 
            WHEN sas.admission_closing_date IS NULL THEN NULL
            ELSE DATEDIFF(sas.admission_closing_date, CURDATE())
          END as days_remaining
         FROM school_locations sl
         INNER JOIN school_setup ss ON ss.school_id = sl.school_id
         LEFT JOIN school_admission_settings sas 
           ON sl.school_id = sas.school_id AND sl.branch_id = sas.branch_id
         WHERE sl.school_id = :school_id 
           AND sl.status = 'Active'
           AND (sas.admission_open IS NULL OR sas.admission_open = 1)
           AND (sas.admission_closing_date IS NULL OR sas.admission_closing_date >= CURDATE())
         ORDER BY sl.branch_name ASC`,
        { replacements: { school_id } }
      );

      res.json({
        success: true,
        data: branches || []
      });
    } catch (error) {
      console.error('Error fetching admission branches:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get single branch details by branch_id
  static async getBranchDetails(req, res) {
    try {
      const { branch_id } = req.query;

      if (!branch_id) {
        return res.status(400).json({
          success: false,
          error: 'branch_id query parameter is required'
        });
      }

      const [branches] = await db.sequelize.query(
        `SELECT 
          sl.branch_id,
          sl.branch_name,
          sl.location as branch_address,
          ss.school_name,
          ss.badge_url as school_logo,
          ss.address as school_address,
          ss.email_address as school_email,
          sl.school_id,
          sl.short_name,
          COALESCE(sas.admission_open, 1) as admission_open,
          sas.admission_closing_date,
          COALESCE(sas.access_mode, 'FREE') as access_mode,
          sas.application_fee,
          CASE 
            WHEN sas.admission_closing_date IS NOT NULL AND sas.admission_closing_date <= CURDATE() THEN 0
            ELSE COALESCE(sas.admission_open, 1)
          END as effective_admission_open,
          CASE 
            WHEN sas.admission_closing_date IS NULL THEN NULL
            ELSE DATEDIFF(sas.admission_closing_date, CURDATE())
          END as days_remaining
         FROM school_locations sl
         LEFT JOIN school_setup ss ON ss.school_id = sl.school_id
         LEFT JOIN school_admission_settings sas 
           ON sl.school_id = sas.school_id AND sl.branch_id = sas.branch_id
         WHERE sl.branch_id = :branch_id 
           AND sl.status = 'Active'
           AND (
             CASE 
               WHEN sas.admission_closing_date IS NOT NULL AND sas.admission_closing_date <= CURDATE() THEN 0
               ELSE COALESCE(sas.admission_open, 1)
             END = 1
           )`,
        { replacements: { branch_id } }
      );

      if (!branches || branches.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found or admission is closed'
        });
      }

      res.json({
        success: true,
        data: branches[0]
      });
    } catch (error) {
      console.error('Error fetching branch details:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all schools with ongoing admissions (for public access)
  static async getSchoolsWithAdmissions(req, res) {
    try {
      const [schools] = await db.sequelize.query(
        `SELECT DISTINCT
          sl.school_id,
          ss.school_name,
          sl.short_name,
          COUNT(sl.branch_id) as open_branches,
          MIN(sas.admission_closing_date) as earliest_closing_date
         FROM school_locations sl
         LEFT JOIN school_setup ss ON ss.school_id = sl.school_id
         LEFT JOIN school_admission_settings sas 
           ON sl.school_id = sas.school_id AND sl.branch_id = sas.branch_id
         WHERE sl.status = 'Active'
           AND (
             (sas.admission_open IS NULL OR sas.admission_open = 1)
             AND (sas.admission_closing_date IS NULL OR sas.admission_closing_date >= CURDATE())
           )
         GROUP BY sl.school_id, ss.school_name, sl.short_name
         HAVING open_branches > 0
         ORDER BY ss.school_name ASC`
      );

      res.json({
        success: true,
        data: schools || []
      });
    } catch (error) {
      console.error('Error fetching schools with admissions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get classes for public admission form
  static async getPublicClasses(req, res) {
    try {
      const { school_id, branch_id } = req.query;

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id and branch_id are required'
        });
      }

      const [classes] = await db.sequelize.query(
        `SELECT id, class_name, class_code, section 
         FROM classes 
         WHERE school_id = :school_id 
           AND branch_id = :branch_id 
           AND status = 'Active'
         ORDER BY class_name ASC`,
        { replacements: { school_id, branch_id } }
      );

      res.json({
        success: true,
        data: classes || []
      });
    } catch (error) {
      console.error('Error fetching public classes:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Submit public admission application
  static async submitPublicApplication(req, res) {
    try {
      const applicationData = req.body;
      const { school_id, branch_id } = applicationData;

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id and branch_id are required'
        });
      }

      // Verify admission is open (default to open if no settings exist)
      const [settings] = await db.sequelize.query(
        `SELECT COALESCE(sas.admission_open, 1) as admission_open, sas.admission_closing_date 
         FROM school_locations sl
         LEFT JOIN school_admission_settings sas ON sl.school_id = sas.school_id AND sl.branch_id = sas.branch_id
         WHERE sl.school_id = :school_id AND sl.branch_id = :branch_id`,
        { replacements: { school_id, branch_id } }
      );

      if (settings.length && settings[0].admission_open === 0) {
        return res.status(400).json({
          success: false,
          error: 'Admission is currently closed for this branch'
        });
      }
      
      // Check closing date if set
      if (settings.length && settings[0].admission_closing_date && new Date(settings[0].admission_closing_date) < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Admission deadline has passed for this branch'
        });
      }

      // Generate applicant_id and application number
      const [countResult] = await db.sequelize.query(
        `SELECT COUNT(*) as count FROM school_applicants WHERE school_id = :school_id`,
        { replacements: { school_id } }
      );
      const count = countResult[0]?.count || 0;
      const nextNum = count + 1;
      const applicant_id = `APL/${school_id.replace('SCH/', '')}/${String(nextNum).padStart(5, '0')}`;
      const application_no = `APP/${school_id.replace('SCH/', '')}/${new Date().getFullYear()}/${String(nextNum).padStart(4, '0')}`;

      // Generate parent_id
      const parent_id = `PAR/${school_id.replace('SCH/', '')}/${String(nextNum).padStart(5, '0')}`;

      // First, create parent record
      await db.sequelize.query(
        `INSERT INTO parents (
          parent_id, fullname, phone, email, occupation, address, school_id, user_id, user_type
        ) VALUES (
          :parent_id, :fullname, :phone, :email, :occupation, :address, :school_id, 0, 'Parent'
        )`,
        {
          replacements: {
            parent_id,
            fullname: applicationData.parent_fullname || '',
            phone: applicationData.parent_phone || '',
            email: applicationData.parent_email || '',
            occupation: applicationData.parent_occupation || '',
            address: applicationData.parent_address || '',
            school_id
          }
        }
      );

      // Then, create application record with parent_id reference
      await db.sequelize.query(
        `INSERT INTO school_applicants (
          applicant_id, parent_id, name_of_applicant, date_of_birth, sex,
          home_address, state_of_origin, l_g_a, last_school_attended, last_class,
          special_health_needs, school_id, branch_id, academic_year, status, date
        ) VALUES (
          :applicant_id, :parent_id, :name_of_applicant, :date_of_birth, :sex,
          :home_address, :state_of_origin, :l_g_a, :last_school_attended, :last_class,
          :special_health_needs, :school_id, :branch_id, :academic_year, 'pending', CURDATE()
        )`,
        { 
          replacements: {
            applicant_id,
            parent_id,
            name_of_applicant: applicationData.name_of_applicant || '',
            date_of_birth: applicationData.date_of_birth || null,
            sex: applicationData.gender?.toLowerCase() || '',
            home_address: applicationData.home_address || '',
            state_of_origin: applicationData.state_of_origin || '',
            l_g_a: applicationData.l_g_a || '',
            last_school_attended: applicationData.last_school_attended || '',
            last_class: applicationData.last_class || '',
            special_health_needs: applicationData.special_health_needs || '',
            school_id,
            branch_id,
            academic_year: applicationData.academic_year || new Date().getFullYear().toString()
          }
        }
      );

      res.json({
        success: true,
        message: 'Application submitted successfully',
        data: { application_no }
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Initialize admission payment
  static async initializeAdmissionPayment(req, res) {
    try {
      const { school_id, branch_id, amount, email, applicant_name } = req.body;

      if (!school_id || !branch_id || !amount || !email) {
        return res.status(400).json({
          success: false,
          message: 'School ID, branch ID, amount, and email are required'
        });
      }

      // Get branch details
      const [branch] = await db.sequelize.query(
        `SELECT sl.branch_name, ss.school_name
         FROM school_locations sl 
         JOIN school_setup ss ON sl.school_id = ss.school_id 
         WHERE sl.branch_id = :branch_id AND sl.school_id = :school_id`,
        {
          replacements: { branch_id, school_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      const reference = `ADM-${branch_id}-${Date.now()}`;
      const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/application/${branch_id}?payment=success&reference=${reference}`;
      
      const paymentData = {
        email: email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference: reference,
        currency: 'NGN',
        callback_url: callbackUrl,
        metadata: {
          school_id: school_id,
          branch_id: branch_id,
          payment_type: 'admission_fee',
          applicant_name: applicant_name || 'Applicant',
          custom_fields: [
            {
              display_name: 'School',
              variable_name: 'school_name',
              value: branch.school_name
            },
            {
              display_name: 'Branch',
              variable_name: 'branch_name',
              value: branch.branch_name
            }
          ]
        }
      };

      // Payment goes to main company account (settlement account)
      // Schools are subaccounts - settlement handled separately
      const transaction = await paystackService.initializeTransaction(paymentData, 1);

      res.status(200).json({
        success: true,
        data: {
          authorization_url: transaction.authorization_url,
          access_code: transaction.access_code,
          reference: transaction.reference
        }
      });
    } catch (error) {
      console.error('Error initializing admission payment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to initialize payment'
      });
    }
  }
}

module.exports = AdmissionBranchController;
