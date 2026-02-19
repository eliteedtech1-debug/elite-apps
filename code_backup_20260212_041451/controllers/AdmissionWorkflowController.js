const db = require("../models");

class AdmissionWorkflowController {
  // Screen application (non-exam schools)
  static async screenApplication(req, res) {
    try {
      const { applicant_id, decision, notes } = req.body;
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id;

      const newStatus = decision === 'approve' ? 'screened' : 'rejected';

      await db.sequelize.query(
        `UPDATE school_applicants 
         SET status = :status, updated_at = NOW(), updated_by = :updated_by
         WHERE applicant_id = :applicant_id AND school_id = :school_id AND branch_id = :branch_id`,
        {
          replacements: {
            status: newStatus,
            updated_by: req.user.username || req.user.id,
            applicant_id,
            school_id,
            branch_id
          }
        }
      );

      // Log status change
      await db.sequelize.query(
        `INSERT INTO admission_status_history 
         (applicant_id, school_id, branch_id, old_status, new_status, notes, changed_by, changed_at)
         VALUES (:applicant_id, :school_id, :branch_id, 'submitted', :new_status, :notes, :changed_by, NOW())`,
        {
          replacements: {
            applicant_id,
            school_id,
            branch_id,
            new_status: newStatus,
            notes: notes || '',
            changed_by: req.user.username || req.user.id
          }
        }
      );

      res.json({ success: true, message: `Application ${newStatus} successfully` });
    } catch (error) {
      console.error('Error screening application:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Schedule exam
  static async scheduleExam(req, res) {
    try {
      const { applicant_id, exam_date, exam_venue, subjects } = req.body;
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id;

      await db.sequelize.query(
        `UPDATE school_applicants 
         SET status = 'exam_scheduled', updated_at = NOW(), updated_by = :updated_by
         WHERE applicant_id = :applicant_id AND school_id = :school_id AND branch_id = :branch_id`,
        {
          replacements: {
            updated_by: req.user.username || req.user.id,
            applicant_id,
            school_id,
            branch_id
          }
        }
      );

      // Log status change
      await db.sequelize.query(
        `INSERT INTO admission_status_history 
         (applicant_id, school_id, branch_id, old_status, new_status, notes, changed_by, changed_at)
         VALUES (:applicant_id, :school_id, :branch_id, 'submitted', 'exam_scheduled', :notes, :changed_by, NOW())`,
        {
          replacements: {
            applicant_id,
            school_id,
            branch_id,
            notes: `Exam scheduled for ${exam_date} at ${exam_venue}`,
            changed_by: req.user.username || req.user.id
          }
        }
      );

      res.json({ success: true, message: 'Exam scheduled successfully' });
    } catch (error) {
      console.error('Error scheduling exam:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Submit exam results
  static async submitExamResults(req, res) {
    try {
      const { applicant_id, mathematics, english, other_score } = req.body;
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id;

      // Calculate pass/fail based on scores
      const mathScore = parseInt(mathematics) || 0;
      const engScore = parseInt(english) || 0;
      const otherScoreInt = parseInt(other_score) || 0;
      const totalScore = mathScore + engScore + otherScoreInt;
      const percentage = totalScore / 3; // Assuming out of 100

      const newStatus = percentage >= 50 ? 'exam_passed' : 'exam_failed';

      await db.sequelize.query(
        `CALL update_student_scores(
          :applicant_id, :mathematics, :english, :other_score,
          :status, :branch_id, :school_id, :query_type
        )`,
        {
          replacements: {
            applicant_id,
            mathematics,
            english,
            other_score: otherScoreInt,
            status: newStatus,
            branch_id,
            school_id,
            query_type: newStatus === 'exam_passed' ? 'Pass' : 'Fail'
          }
        }
      );

      // Log status change with exam details
      await db.sequelize.query(
        `INSERT INTO admission_status_history 
         (applicant_id, school_id, branch_id, old_status, new_status, 
          exam_mathematics, exam_english, exam_other_score, exam_total_score, exam_percentage,
          changed_by, changed_at)
         VALUES (:applicant_id, :school_id, :branch_id, 'exam_scheduled', :new_status,
                 :mathematics, :english, :other_score, :total_score, :percentage,
                 :changed_by, NOW())`,
        {
          replacements: {
            applicant_id,
            school_id,
            branch_id,
            new_status: newStatus,
            mathematics,
            english,
            other_score: otherScoreInt,
            total_score: totalScore,
            percentage,
            changed_by: req.user.username || req.user.id
          }
        }
      );

      res.json({ 
        success: true, 
        message: `Exam results submitted. Status: ${newStatus}`,
        data: { status: newStatus, percentage }
      });
    } catch (error) {
      console.error('Error submitting exam results:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Admit student (final step)
  static async admitStudent(req, res) {
    try {
      const { applicant_id, admission_class, admission_date } = req.body;
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id;

      // Generate admission number
      await db.sequelize.query(
        `CALL admission_no_generator(:applicant_id, :school_id, :branch_id)`,
        {
          replacements: { applicant_id, school_id, branch_id }
        }
      );

      // Update status to admitted
      await db.sequelize.query(
        `UPDATE school_applicants 
         SET status = 'admitted', current_class = :admission_class, 
             updated_at = NOW(), updated_by = :updated_by
         WHERE applicant_id = :applicant_id AND school_id = :school_id AND branch_id = :branch_id`,
        {
          replacements: {
            admission_class,
            updated_by: req.user.username || req.user.id,
            applicant_id,
            school_id,
            branch_id
          }
        }
      );

      // Log final status change
      await db.sequelize.query(
        `INSERT INTO admission_status_history 
         (applicant_id, school_id, branch_id, new_status, notes, changed_by, changed_at)
         VALUES (:applicant_id, :school_id, :branch_id, 'admitted', :notes, :changed_by, NOW())`,
        {
          replacements: {
            applicant_id,
            school_id,
            branch_id,
            notes: `Admitted to ${admission_class}`,
            changed_by: req.user.username || req.user.id
          }
        }
      );

      res.json({ success: true, message: 'Student admitted successfully' });
    } catch (error) {
      console.error('Error admitting student:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get workflow status
  static async getWorkflowStatus(req, res) {
    try {
      const { applicant_id } = req.params;
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id;

      const [statusHistory] = await db.sequelize.query(
        `SELECT * FROM admission_status_history 
         WHERE applicant_id = :applicant_id AND school_id = :school_id AND branch_id = :branch_id
         ORDER BY changed_at ASC`,
        {
          replacements: { applicant_id, school_id, branch_id }
        }
      );

      res.json({ success: true, data: statusHistory });
    } catch (error) {
      console.error('Error getting workflow status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = AdmissionWorkflowController;
