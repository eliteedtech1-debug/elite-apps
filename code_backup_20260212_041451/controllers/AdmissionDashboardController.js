const db = require("../models");

class AdmissionDashboardController {
  // Get admission settings for branch
  static async getAdmissionSettings(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user?.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user?.branch_id;

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id and branch_id are required'
        });
      }

      const [settings] = await db.sequelize.query(
        `SELECT 
          id,
          school_id,
          branch_id,
          access_mode,
          admission_open,
          admission_closing_date,
          application_fee,
          exam_fee,
          acceptance_fee,
          academic_year,
          admission_start_date,
          admission_end_date
         FROM school_admission_settings 
         WHERE school_id = :school_id AND branch_id = :branch_id
         ORDER BY created_at DESC LIMIT 1`,
        { replacements: { school_id, branch_id } }
      );

      const result = settings[0] || {
        school_id,
        branch_id,
        access_mode: 'FREE',
        admission_open: 1,
        admission_closing_date: null,
        application_fee: null,
        exam_fee: null,
        acceptance_fee: null,
        academic_year: new Date().getFullYear().toString(),
        admission_start_date: null,
        admission_end_date: null
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching admission settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update admission settings
  static async updateAdmissionSettings(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user?.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user?.branch_id;
      const {
        admission_open,
        admission_closing_date,
        access_mode,
        application_fee,
        exam_fee,
        acceptance_fee
      } = req.body;

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id and branch_id are required'
        });
      }

      // Check if closing date is in the past
      if (admission_closing_date && new Date(admission_closing_date) <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Admission closing date cannot be in the past'
        });
      }

      const [result] = await db.sequelize.query(
        `INSERT INTO school_admission_settings 
         (school_id, branch_id, admission_open, admission_closing_date, access_mode, 
          application_fee, exam_fee, acceptance_fee, academic_year)
         VALUES (:school_id, :branch_id, :admission_open, :admission_closing_date, 
                 :access_mode, :application_fee, :exam_fee, :acceptance_fee, :academic_year)
         ON DUPLICATE KEY UPDATE
         admission_open = VALUES(admission_open),
         admission_closing_date = VALUES(admission_closing_date),
         access_mode = VALUES(access_mode),
         application_fee = VALUES(application_fee),
         exam_fee = VALUES(exam_fee),
         acceptance_fee = VALUES(acceptance_fee),
         updated_at = CURRENT_TIMESTAMP`,
        {
          replacements: {
            school_id,
            branch_id,
            admission_open: admission_open ? 1 : 0,
            admission_closing_date: admission_closing_date || null,
            access_mode: access_mode || 'FREE',
            application_fee: application_fee || null,
            exam_fee: exam_fee || null,
            acceptance_fee: acceptance_fee || null,
            academic_year: new Date().getFullYear().toString()
          }
        }
      );

      res.json({
        success: true,
        message: 'Admission settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating admission settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all branches with admission status
  static async getBranchesAdmissionStatus(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user?.school_id;

      if (!school_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id is required'
        });
      }

      const [branches] = await db.sequelize.query(
        `SELECT 
          sl.branch_id,
          sl.branch_name,
          sl.location,
          sl.status as branch_status,
          COALESCE(sas.admission_open, 1) as admission_open,
          sas.admission_closing_date,
          sas.access_mode,
          CASE 
            WHEN sas.admission_closing_date IS NOT NULL 
                 AND sas.admission_closing_date <= CURDATE() 
            THEN 0
            ELSE COALESCE(sas.admission_open, 1)
          END as effective_admission_open
         FROM school_locations sl
         LEFT JOIN school_admission_settings sas 
           ON sl.school_id = sas.school_id AND sl.branch_id = sas.branch_id
         WHERE sl.school_id = :school_id 
           AND sl.status = 'Active'
         ORDER BY sl.branch_name`,
        { replacements: { school_id } }
      );

      res.json({
        success: true,
        data: branches || []
      });
    } catch (error) {
      console.error('Error fetching branches admission status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get admission statistics
  static async getStatistics(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user?.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user?.branch_id;

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id and branch_id are required'
        });
      }

      const [stats] = await db.sequelize.query(
        `SELECT 
          COUNT(*) as total_applications,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as screened_count,
          SUM(CASE WHEN status = 'exam_scheduled' THEN 1 ELSE 0 END) as exam_scheduled_count,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as exam_passed_count,
          SUM(CASE WHEN status = 'admitted' THEN 1 ELSE 0 END) as admitted_count,
          SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as enrolled_count,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
          academic_year
         FROM school_applicants 
         WHERE school_id = :school_id AND branch_id = :branch_id
         GROUP BY academic_year
         ORDER BY academic_year DESC LIMIT 1`,
        { replacements: { school_id, branch_id } }
      );

      // Get access method distribution
      const [accessStats] = await db.sequelize.query(
        `SELECT 
          sas.access_mode,
          COUNT(sa.id) as count
         FROM school_admission_settings sas
         LEFT JOIN school_applicants sa ON sa.school_id = sas.school_id AND sa.branch_id = sas.branch_id
         WHERE sas.school_id = :school_id AND sas.branch_id = :branch_id
         GROUP BY sas.access_mode`,
        { replacements: { school_id, branch_id } }
      );

      const result = stats[0] || {
        total_applications: 0,
        submitted_count: 0,
        screened_count: 0,
        exam_scheduled_count: 0,
        exam_passed_count: 0,
        admitted_count: 0,
        rejected_count: 0,
        token_applications: 0,
        paid_applications: 0,
        free_applications: 0
      };

      // Calculate access method counts
      const accessMode = accessStats[0]?.access_mode || 'FREE';
      const totalApps = parseInt(result.total_applications) || 0;
      
      if (accessMode === 'FREE') {
        result.free_applications = totalApps;
        result.token_applications = 0;
        result.paid_applications = 0;
      } else if (accessMode === 'TOKEN') {
        result.free_applications = 0;
        result.token_applications = totalApps;
        result.paid_applications = 0;
      } else if (accessMode === 'PAID') {
        result.free_applications = 0;
        result.token_applications = 0;
        result.paid_applications = totalApps;
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching admission statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get exam schedules
  static async getExamSchedules(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user?.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user?.branch_id;

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id and branch_id are required'
        });
      }

      const [schedules] = await db.sequelize.query(
        `SELECT 
          sa.id,
          sa.name_of_applicant as applicant_name,
          DATE_FORMAT(sa.examination_date, '%Y-%m-%d') as exam_date,
          sa.time as exam_time,
          sa.venue,
          sa.type_of_application as class_name,
          sa.status
         FROM school_applicants sa
         WHERE sa.school_id = :school_id 
           AND (:branch_id = '' OR sa.branch_id = :branch_id)
           AND sa.status IN ('exam_scheduled', 'exam_passed')
           AND sa.examination_date >= CURDATE()
         ORDER BY sa.examination_date ASC, sa.time ASC
         LIMIT 10`,
        { replacements: { school_id, branch_id: branch_id || '' } }
      );

      res.json({
        success: true,
        data: schedules || []
      });
    } catch (error) {
      console.error('Error fetching exam schedules:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get pending payments
  static async getPendingPayments(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user?.school_id;
      const branch_id = req.headers['x-branch-id'] || req.user?.branch_id;

      if (!school_id || !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id and branch_id are required'
        });
      }

      // Get real pending payments from database
      const [payments] = await db.sequelize.query(
        `SELECT 
          sa.id,
          sa.name_of_applicant as applicant_name,
          CASE 
            WHEN sa.status = 'exam_scheduled' THEN 'Exam Fee'
            WHEN sa.status = 'exam_passed' THEN 'Acceptance Fee'
            ELSE 'Application Fee'
          END as payment_type,
          CASE 
            WHEN sa.status = 'exam_scheduled' THEN (
              SELECT exam_fee FROM school_admission_settings 
              WHERE school_id = :school_id AND branch_id = :branch_id
            )
            WHEN sa.status = 'exam_passed' THEN (
              SELECT acceptance_fee FROM school_admission_settings 
              WHERE school_id = :school_id AND branch_id = :branch_id
            )
            ELSE (
              SELECT application_fee FROM school_admission_settings 
              WHERE school_id = :school_id AND branch_id = :branch_id
            )
          END as amount,
          DATE_ADD(sa.date, INTERVAL 30 DAY) as due_date,
          CASE 
            WHEN DATE_ADD(sa.date, INTERVAL 30 DAY) < CURDATE() THEN 'overdue'
            ELSE 'pending'
          END as status
        FROM school_applicants sa
        WHERE sa.school_id = :school_id 
        AND sa.branch_id = :branch_id
        AND sa.payment_reference IS NULL
        AND sa.status IN ('submitted', 'screened', 'exam_scheduled', 'exam_passed')
        ORDER BY sa.date DESC`,
        {
          replacements: { school_id, branch_id }
        }
      );

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get branches admission status
  static async getBranchesAdmissionStatus(req, res) {
    try {
      const school_id = req.headers['x-school-id'] || req.user?.school_id;

      if (!school_id) {
        return res.status(400).json({
          success: false,
          error: 'school_id is required'
        });
      }

      const [branches] = await db.sequelize.query(
        `SELECT 
          sl.branch_id,
          sl.branch_name,
          sl.location,
          COALESCE(sas.admission_open, 1) as admission_open,
          sas.admission_closing_date,
          COALESCE(sas.access_mode, 'FREE') as access_mode,
          CASE 
            WHEN sas.admission_closing_date IS NULL THEN COALESCE(sas.admission_open, 1)
            WHEN sas.admission_closing_date >= CURDATE() THEN COALESCE(sas.admission_open, 1)
            ELSE 0
          END as effective_admission_open
         FROM school_locations sl
         LEFT JOIN school_admission_settings sas ON sl.school_id = sas.school_id AND sl.branch_id = sas.branch_id
         WHERE sl.school_id = :school_id
         ORDER BY sl.branch_name ASC`,
        { replacements: { school_id } }
      );

      res.json({
        success: true,
        data: branches || []
      });
    } catch (error) {
      console.error('Error fetching branches admission status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = AdmissionDashboardController;
