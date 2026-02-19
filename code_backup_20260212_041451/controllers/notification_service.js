const db = require("../models");
const nodemailer = require("nodemailer");
const moment = require("moment");

/**
 * Notification Service for Application Status Updates
 * Handles email and SMS notifications for applicants and parents
 */

// Email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// SMS configuration (using a generic SMS service)
const sendSMS = async (phoneNumber, message) => {
  try {
    // This would integrate with your SMS provider (Twilio, Nexmo, etc.)
    // For now, we'll log the SMS
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    // Example integration with SMS service
    // const response = await fetch('https://api.sms-provider.com/send', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${process.env.SMS_API_KEY}` },
    //   body: JSON.stringify({ to: phoneNumber, message })
    // });
    
    return { success: true, message: "SMS sent successfully" };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send application status notification
 */
const sendStatusNotification = async (applicantId, statusChange, additionalData = {}) => {
  try {
    // Get applicant and contact information
    const applicantData = await db.sequelize.query(
      `SELECT sa.*, sa.name_of_applicant, sa.parent_email, sa.guardian_phone_no, sa.guardian_email,
              p.parent_email as parent_email_alt, p.parent_phone_no,
              s.school_name, s.school_email, s.school_phone
       FROM school_applicants sa
       LEFT JOIN parents p ON sa.parent_id = p.parent_id
       LEFT JOIN schools s ON sa.school_id = s.school_id
       WHERE sa.applicant_id = :applicantId`,
      {
        replacements: { applicantId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!applicantData.length) {
      throw new Error("Applicant not found");
    }

    const applicant = applicantData[0];
    const emailTemplate = getEmailTemplate(statusChange.new_status, applicant, statusChange, additionalData);
    const smsTemplate = getSMSTemplate(statusChange.new_status, applicant, statusChange);

    const notifications = [];

    // Send email notifications
    const emailRecipients = [
      applicant.parent_email,
      applicant.parent_email_alt,
      applicant.guardian_email
    ].filter(email => email && email.includes('@'));

    for (const email of emailRecipients) {
      try {
        const emailResult = await sendEmail(email, emailTemplate);
        notifications.push({
          applicant_id: applicantId,
          notification_type: 'email',
          title: emailTemplate.subject,
          message: emailTemplate.html,
          sent_via: 'email',
          recipient_email: email,
          status: emailResult.success ? 'sent' : 'failed',
          sent_at: emailResult.success ? new Date() : null,
          school_id: applicant.school_id,
          branch_id: applicant.branch_id
        });
      } catch (error) {
        console.error(`Error sending email to ${email}:`, error);
      }
    }

    // Send SMS notifications
    const phoneRecipients = [
      applicant.parent_phone_no,
      applicant.guardian_phone_no
    ].filter(phone => phone && phone.length >= 10);

    for (const phone of phoneRecipients) {
      try {
        const smsResult = await sendSMS(phone, smsTemplate);
        notifications.push({
          applicant_id: applicantId,
          notification_type: 'sms',
          title: `Application Status Update`,
          message: smsTemplate,
          sent_via: 'sms',
          recipient_phone: phone,
          status: smsResult.success ? 'sent' : 'failed',
          sent_at: smsResult.success ? new Date() : null,
          school_id: applicant.school_id,
          branch_id: applicant.branch_id
        });
      } catch (error) {
        console.error(`Error sending SMS to ${phone}:`, error);
      }
    }

    // Save notification records
    for (const notification of notifications) {
      await saveNotificationRecord(notification);
    }

    return {
      success: true,
      notifications_sent: notifications.filter(n => n.status === 'sent').length,
      total_attempts: notifications.length
    };

  } catch (error) {
    console.error("Error sending status notification:", error);
    throw error;
  }
};

/**
 * Send email notification
 */
const sendEmail = async (to, template) => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'admissions@school.edu',
      to: to,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get email template based on status
 */
const getEmailTemplate = (status, applicant, statusChange, additionalData) => {
  const schoolName = applicant.school_name || "Our School";
  const applicantName = applicant.name_of_applicant;
  const applicationId = applicant.applicant_id;

  const templates = {
    submitted: {
      subject: `Application Submitted Successfully - ${applicationId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;>
          <h2 style="color: #1890ff;>Application Submitted Successfully</h2>
          <p>Dear Parent/Guardian,</p>
          <p>We have successfully received the application for <strong>${applicantName}</strong>.</p>
          <div style="background-color: #f0f5ff; padding: 15px; border-radius: 5px; margin: 20px 0;>
            <h3>Application Details:</h3>
            <ul>
              <li><strong>Application ID:</strong> ${applicationId}</li>
              <li><strong>Applicant Name:</strong> ${applicantName}</li>
              <li><strong>Status:</strong> Submitted</li>
              <li><strong>Submission Date:</strong> ${moment().format('MMMM DD, YYYY')}</li>
            </ul>
          </div>
          <p>Your application is now under review. We will notify you of any updates or additional requirements.</p>
          <p>Thank you for choosing ${schoolName}.</p>
          <hr>
          <p style="font-size: 12px; color: #666;>This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
      text: `Application submitted successfully for ${applicantName}. Application ID: ${applicationId}. Status: Submitted.`
    },

    under_review: {
      subject: `Application Under Review - ${applicationId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;>
          <h2 style="color: #faad14;>Application Under Review</h2>
          <p>Dear Parent/Guardian,</p>
          <p>The application for <strong>${applicantName}</strong> is now under review by our admissions committee.</p>
          <div style="background-color: #fffbe6; padding: 15px; border-radius: 5px; margin: 20px 0;>
            <h3>What happens next:</h3>
            <ul>
              <li>Our admissions team will review all submitted documents</li>
              <li>You may be contacted for additional information if needed</li>
              <li>We will notify you of the next steps in the admission process</li>
            </ul>
          </div>
          <p>Expected review time: 3-5 business days</p>
          <p>Thank you for your patience.</p>
          <hr>
          <p style="font-size: 12px; color: #666;>Application ID: ${applicationId}</p>
        </div>
      `,
      text: `Application for ${applicantName} is under review. Application ID: ${applicationId}.`
    },

    documents_required: {
      subject: `Additional Documents Required - ${applicationId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;>
          <h2 style="color: #ff7a00;>Additional Documents Required</h2>
          <p>Dear Parent/Guardian,</p>
          <p>We need additional documents for <strong>${applicantName}</strong>'s application.</p>
          <div style="background-color: #fff2e8; padding: 15px; border-radius: 5px; margin: 20px 0;>
            <h3>Required Documents:</h3>
            ${additionalData.documents_required ? 
              `<ul>${additionalData.documents_required.map(doc => `<li>${doc}</li>`).join('')}</ul>` :
              '<p>Please check your application portal for specific requirements.</p>'
            }
          </div>
          <p><strong>Action Required:</strong> Please submit the required documents within 7 days to avoid delays.</p>
          <p>You can upload documents through your application portal or contact our admissions office.</p>
          <hr>
          <p style="font-size: 12px; color: #666;>Application ID: ${applicationId}</p>
        </div>
      `,
      text: `Additional documents required for ${applicantName}. Application ID: ${applicationId}. Please submit within 7 days.`
    },

    exam_scheduled: {
      subject: `Entrance Examination Scheduled - ${applicationId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;>
          <h2 style="color: #722ed1;>Entrance Examination Scheduled</h2>
          <p>Dear Parent/Guardian,</p>
          <p>The entrance examination has been scheduled for <strong>${applicantName}</strong>.</p>
          <div style="background-color: #f9f0ff; padding: 15px; border-radius: 5px; margin: 20px 0;>
            <h3>Examination Details:</h3>
            <ul>
              ${additionalData.exam_details ? `
                <li><strong>Date:</strong> ${additionalData.exam_details.date}</li>
                <li><strong>Time:</strong> ${additionalData.exam_details.time}</li>
                <li><strong>Venue:</strong> ${additionalData.exam_details.venue}</li>
                <li><strong>Subjects:</strong> ${additionalData.exam_details.subjects ? additionalData.exam_details.subjects.join(', ') : 'As per curriculum'}</li>
              ` : '<li>Details will be provided separately</li>'}
            </ul>
          </div>
          <p><strong>Important:</strong> Please arrive 30 minutes before the scheduled time with valid identification.</p>
          <p>Good luck!</p>
          <hr>
          <p style="font-size: 12px; color: #666;>Application ID: ${applicationId}</p>
        </div>
      `,
      text: `Entrance exam scheduled for ${applicantName}. Application ID: ${applicationId}. Check email for details.`
    },

    approved: {
      subject: `🎉 Application Approved - ${applicationId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;>
          <h2 style="color: #52c41a;>🎉 Congratulations! Application Approved</h2>
          <p>Dear Parent/Guardian,</p>
          <p>We are pleased to inform you that <strong>${applicantName}</strong>'s application has been <strong>APPROVED</strong>!</p>
          <div style="background-color: #f6ffed; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #52c41a;>
            <h3>Next Steps:</h3>
            <ul>
              <li>Complete the enrollment process within 14 days</li>
              <li>Pay the required fees to secure admission</li>
              <li>Submit any remaining documentation</li>
              <li>Attend the orientation session</li>
            </ul>
          </div>
          <p>Welcome to the ${schoolName} family!</p>
          <p>Please contact our admissions office for enrollment assistance.</p>
          <hr>
          <p style="font-size: 12px; color: #666;>Application ID: ${applicationId}</p>
        </div>
      `,
      text: `Congratulations! Application approved for ${applicantName}. Application ID: ${applicationId}. Complete enrollment within 14 days.`
    },

    rejected: {
      subject: `Application Status Update - ${applicationId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;>
          <h2 style="color: #ff4d4f;>Application Status Update</h2>
          <p>Dear Parent/Guardian,</p>
          <p>Thank you for your interest in ${schoolName}. After careful consideration, we regret to inform you that we cannot offer admission to <strong>${applicantName}</strong> at this time.</p>
          <div style="background-color: #fff2f0; padding: 15px; border-radius: 5px; margin: 20px 0;>
            <p>This decision was made due to limited spaces and high competition. Please note that this does not reflect on the applicant's abilities or potential.</p>
          </div>
          <p>We encourage you to apply again in the future and wish ${applicantName} success in their educational journey.</p>
          <p>Thank you for considering ${schoolName}.</p>
          <hr>
          <p style="font-size: 12px; color: #666;>Application ID: ${applicationId}</p>
        </div>
      `,
      text: `Application status update for ${applicantName}. Application ID: ${applicationId}. Please check email for details.`
    }
  };

  return templates[status] || templates.submitted;
};

/**
 * Get SMS template based on status
 */
const getSMSTemplate = (status, applicant, statusChange) => {
  const applicantName = applicant.name_of_applicant;
  const applicationId = applicant.applicant_id;
  const schoolName = applicant.school_name || "School";

  const templates = {
    submitted: `${schoolName}: Application submitted for ${applicantName}. ID: ${applicationId}. Status: Under Review.`,
    under_review: `${schoolName}: Application for ${applicantName} is under review. ID: ${applicationId}. Updates will follow.`,
    documents_required: `${schoolName}: Additional documents required for ${applicantName}. ID: ${applicationId}. Submit within 7 days.`,
    exam_scheduled: `${schoolName}: Entrance exam scheduled for ${applicantName}. ID: ${applicationId}. Check email for details.`,
    approved: `${schoolName}: Congratulations! ${applicantName}'s application approved. ID: ${applicationId}. Complete enrollment in 14 days.`,
    rejected: `${schoolName}: Application status update for ${applicantName}. ID: ${applicationId}. Please check email for details.`,
    admitted: `${schoolName}: ${applicantName} has been admitted! ID: ${applicationId}. Welcome to our school family.`,
    enrolled: `${schoolName}: ${applicantName} successfully enrolled. ID: ${applicationId}. Orientation details will follow.`
  };

  return templates[status] || templates.submitted;
};

/**
 * Save notification record to database
 */
const saveNotificationRecord = async (notification) => {
  try {
    await db.sequelize.query(
      `INSERT INTO application_notifications 
       (applicant_id, notification_type, title, message, sent_via, recipient_email, 
        recipient_phone, status, sent_at, school_id, branch_id, created_at)
       VALUES (:applicant_id, :notification_type, :title, :message, :sent_via, 
               :recipient_email, :recipient_phone, :status, :sent_at, :school_id, :branch_id, NOW())`,
      {
        replacements: notification
      }
    );
  } catch (error) {
    console.error("Error saving notification record:", error);
  }
};

/**
 * Get notification history for an applicant
 */
const getNotificationHistory = async (req, res) => {
  try {
    const { applicant_id } = req.params;
    const school_id = req.user?.school_id;

    const notifications = await db.sequelize.query(
      `SELECT * FROM application_notifications 
       WHERE applicant_id = :applicant_id AND school_id = :school_id
       ORDER BY created_at DESC`,
      {
        replacements: { applicant_id, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error("Error fetching notification history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notification history",
      error: error.message
    });
  }
};

/**
 * Resend notification
 */
const resendNotification = async (req, res) => {
  try {
    const { applicant_id, notification_type } = req.body;

    // Get latest status change for the applicant
    const statusChange = await db.sequelize.query(
      `SELECT * FROM application_status_history 
       WHERE applicant_id = :applicant_id 
       ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { applicant_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!statusChange.length) {
      return res.status(404).json({
        success: false,
        message: "No status history found for applicant"
      });
    }

    const result = await sendStatusNotification(applicant_id, statusChange[0]);

    res.json({
      success: true,
      message: "Notification resent successfully",
      data: result
    });

  } catch (error) {
    console.error("Error resending notification:", error);
    res.status(500).json({
      success: false,
      message: "Error resending notification",
      error: error.message
    });
  }
};

module.exports = {
  sendStatusNotification,
  getNotificationHistory,
  resendNotification,
  sendEmail,
  sendSMS
};
