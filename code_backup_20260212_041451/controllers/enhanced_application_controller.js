const db = require("../models");
const moment = require("moment");
const { sendStatusNotification } = require("./notification_service");

/**
 * Enhanced Application Controller with integrated notifications
 * Extends the existing school_admission.form.js with notification capabilities
 */

const updateApplicationStatusWithNotification = async (req, res) => {
  try {
    const {
      applicant_id,
      new_status,
      comments = '',
      next_action_date = null,
      assigned_to = null,
      documents_required = null,
      exam_details = null,
      interview_details = null
    } = req.body;

    const updated_by = req.user?.id || req.user?.user_id;
    const school_id = req.user?.school_id;
    const branch_id = req.user?.branch_id;

    // Get current application status
    const currentApplication = await db.sequelize.query(
      `SELECT status, applicant_id FROM school_applicants WHERE applicant_id = :applicant_id AND school_id = :school_id`,
      {
        replacements: { applicant_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!currentApplication.length) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const current_status = currentApplication[0].status;

    // Update application status
    await db.sequelize.query(
      `UPDATE school_applicants 
       SET status = :new_status, 
           updated_at = NOW(),
           next_action_date = :next_action_date,
           assigned_to = :assigned_to
       WHERE applicant_id = :applicant_id AND school_id = :school_id`,
      {
        replacements: {
          new_status,
          next_action_date,
          assigned_to,
          applicant_id,
          school_id
        }
      }
    );

    // Insert status history record
    await db.sequelize.query(
      `INSERT INTO application_status_history 
       (applicant_id, previous_status, new_status, comments, updated_by, 
        school_id, branch_id, documents_required, exam_details, interview_details, created_at)
       VALUES (:applicant_id, :previous_status, :new_status, :comments, :updated_by, 
               :school_id, :branch_id, :documents_required, :exam_details, :interview_details, NOW())`,
      {
        replacements: {
          applicant_id,
          previous_status: current_status,
          new_status,
          comments,
          updated_by,
          school_id,
          branch_id,
          documents_required: documents_required ? JSON.stringify(documents_required) : null,
          exam_details: exam_details ? JSON.stringify(exam_details) : null,
          interview_details: interview_details ? JSON.stringify(interview_details) : null
        }
      }
    );

    // Send notifications
    try {
      const statusChange = {
        previous_status: current_status,
        new_status,
        comments,
        updated_by
      };

      const additionalData = {
        documents_required,
        exam_details,
        interview_details
      };

      await sendStatusNotification(applicant_id, statusChange, additionalData);
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
      // Continue with the response even if notification fails
    }

    res.json({
      success: true,
      message: "Application status updated and notifications sent",
      data: {
        applicant_id,
        previous_status: current_status,
        new_status,
        updated_at: new Date()
      }
    });

  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating application status",
      error: error.message
    });
  }
};

/**
 * Enhanced application submission with automatic notifications
 */
const submitApplicationWithNotification = async (req, res) => {
  try {
    const applicationData = {
      ...req.body,
      status: "submitted",
      school_id: req.user?.school_id,
      branch_id: req.user?.branch_id
    };

    // Call the existing school_admission_form procedure
    const result = await db.sequelize.query(
      `CALL school_admission_form(:query_type, :upload,:applicant_id,:guardian_id,:parent_id, :type_of_application, :name_of_applicant, :home_address, :date_of_birth, :guardian_name, :guardian_phone_no, :guardian_email, :guardian_address, :guardian_relationship, :parent_fullname, :parent_phone_no, :parent_email, :parent_address, :parent_occupation, :state_of_origin, :l_g_a, :last_school_attended, :mathematics, :english, :special_health_needs, :sex, :admission_no, :school, :status,:academic_year,:school_id,:branch_id,:short_name,:last_class,:others,:id,:other_score)`,
      {
        replacements: {
          query_type: "create",
          upload: applicationData.upload || "",
          applicant_id: "",
          guardian_id: "",
          parent_id: "",
          type_of_application: applicationData.type_of_application || "",
          name_of_applicant: applicationData.name_of_applicant || "",
          home_address: applicationData.home_address || "",
          date_of_birth: applicationData.date_of_birth ? moment.utc(applicationData.date_of_birth).local().format("YYYY-MM-DD") : null,
          guardian_name: applicationData.guardian_name || "",
          guardian_phone_no: applicationData.guardian_phone_no || "",
          guardian_email: applicationData.guardian_email || "",
          guardian_address: applicationData.guardian_address || "",
          guardian_relationship: applicationData.guardian_relationship || "",
          parent_fullname: applicationData.parent_fullname || "",
          parent_phone_no: applicationData.parent_phone_no || "",
          parent_email: applicationData.parent_email || "",
          parent_address: applicationData.parent_address || "",
          parent_occupation: applicationData.parent_occupation || "",
          state_of_origin: applicationData.state_of_origin || "",
          l_g_a: applicationData.l_g_a || "",
          last_school_attended: applicationData.last_school_attended || "",
          mathematics: applicationData.mathematics || "",
          english: applicationData.english || "",
          special_health_needs: applicationData.special_health_needs || "",
          sex: applicationData.sex || "",
          admission_no: applicationData.admission_no || "",
          school: applicationData.school || "",
          status: "submitted",
          academic_year: applicationData.academic_year || "",
          school_id: applicationData.school_id,
          branch_id: applicationData.branch_id,
          short_name: applicationData.short_name || "",
          last_class: applicationData.last_class || "",
          others: applicationData.others || "",
          id: null,
          other_score: applicationData.other_score || 0
        }
      }
    );

    // Get the created application ID from the result
    const createdApplication = result[0][0];
    const applicant_id = createdApplication?.applicant_id;

    if (applicant_id) {
      // Send submission notification
      try {
        const statusChange = {
          previous_status: null,
          new_status: "submitted",
          comments: "Application submitted successfully",
          updated_by: req.user?.id
        };

        await sendStatusNotification(applicant_id, statusChange);
      } catch (notificationError) {
        console.error("Error sending submission notification:", notificationError);
      }
    }

    res.json({
      success: true,
      message: "Application submitted successfully and confirmation sent",
      data: result[0]
    });

  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting application",
      error: error.message
    });
  }
};

/**
 * Bulk notification sender for multiple applicants
 */
const sendBulkNotifications = async (req, res) => {
  try {
    const { applicant_ids, notification_type, custom_message } = req.body;
    const school_id = req.user?.school_id;

    if (!applicant_ids || !Array.isArray(applicant_ids) || applicant_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid applicant IDs"
      });
    }

    const results = [];

    for (const applicant_id of applicant_ids) {
      try {
        // Get current status for each applicant
        const currentStatus = await db.sequelize.query(
          `SELECT status FROM school_applicants WHERE applicant_id = :applicant_id AND school_id = :school_id`,
          {
            replacements: { applicant_id, school_id },
            type: db.sequelize.QueryTypes.SELECT
          }
        );

        if (currentStatus.length > 0) {
          const statusChange = {
            previous_status: currentStatus[0].status,
            new_status: currentStatus[0].status,
            comments: custom_message || "Bulk notification",
            updated_by: req.user?.id
          };

          const result = await sendStatusNotification(applicant_id, statusChange);
          results.push({
            applicant_id,
            success: true,
            notifications_sent: result.notifications_sent
          });
        } else {
          results.push({
            applicant_id,
            success: false,
            error: "Applicant not found"
          });
        }
      } catch (error) {
        results.push({
          applicant_id,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Bulk notifications completed. ${successful} successful, ${failed} failed.`,
      data: {
        total: applicant_ids.length,
        successful,
        failed,
        results
      }
    });

  } catch (error) {
    console.error("Error sending bulk notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error sending bulk notifications",
      error: error.message
    });
  }
};

module.exports = {
  updateApplicationStatusWithNotification,
  submitApplicationWithNotification,
  sendBulkNotifications
};
