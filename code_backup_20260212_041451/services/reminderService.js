const db = require('../models');
const { addSingleMessageJob } = require('../queues/whatsappQueue');
const { addEmailWithPDFJob } = require('../queues/emailQueue');

class ReminderService {
  async scheduleReminders(school_id, term, academic_year, daysUntilDue = 7) {
    try {
      console.log(`📅 Scheduling reminders for ${school_id}, ${term} ${academic_year}`);

      const students = await db.sequelize.query(
        `SELECT 
           s.admission_no as student_id,
           s.admission_no,
           s.student_name,
           p.phone as parent_phone,
           p.email as parent_email,
           COALESCE(SUM(pe.cr), 0) as total_bill,
           COALESCE(SUM(pe.dr), 0) as total_paid,
           (COALESCE(SUM(pe.cr), 0) - COALESCE(SUM(pe.dr), 0)) as balance_due
         FROM students s
         LEFT JOIN parents p ON s.parent_id = p.parent_id
         LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no 
           AND pe.term = ? AND pe.academic_year = ?
         WHERE s.school_id = ?
           AND s.status = 'active'
         GROUP BY s.admission_no, s.student_name, p.phone, p.email
         HAVING balance_due > 0`,
        { 
          replacements: [term, academic_year, school_id],
          type: db.sequelize.QueryTypes.SELECT 
        }
      );

      let scheduled = 0;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysUntilDue);

      for (const student of students) {
        const reminderType = student.parent_phone && student.parent_email ? 'both' 
          : student.parent_phone ? 'whatsapp' 
          : student.parent_email ? 'email' 
          : null;

        if (!reminderType) continue;

        await db.sequelize.query(
          `INSERT INTO payment_reminders 
           (school_id, student_id, admission_no, student_name, parent_phone, parent_email, 
            balance_due, term, academic_year, due_date, reminder_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          { 
            replacements: [
              school_id, 
              student.student_id, 
              student.admission_no,
              student.student_name,
              student.parent_phone, 
              student.parent_email, 
              student.balance_due,
              term,
              academic_year,
              dueDate,
              reminderType
            ] 
          }
        );
        scheduled++;
      }

      console.log(`✅ Scheduled ${scheduled} reminders`);
      return { success: true, scheduled, total: students.length };
    } catch (error) {
      console.error('❌ Error scheduling reminders:', error);
      throw error;
    }
  }

  async sendPendingReminders(limit = 100) {
    try {
      console.log('📤 Sending pending reminders...');

      const reminders = await db.sequelize.query(
        `SELECT * FROM payment_reminders 
         WHERE status = 'pending' 
           AND due_date <= CURDATE()
         ORDER BY created_at ASC
         LIMIT ?`,
        { 
          replacements: [limit],
          type: db.sequelize.QueryTypes.SELECT 
        }
      );

      let sent = 0;
      let failed = 0;

      for (const reminder of reminders) {
        try {
          const message = `Dear Parent,\n\nYour child ${reminder.student_name} has an outstanding balance of ₦${parseFloat(reminder.balance_due).toLocaleString()} for ${reminder.term} ${reminder.academic_year}.\n\nPlease make payment at your earliest convenience.\n\nThank you.`;

          if (reminder.reminder_type === 'whatsapp' || reminder.reminder_type === 'both') {
            if (reminder.parent_phone) {
              await addSingleMessageJob({
                school_id: reminder.school_id,
                phone: reminder.parent_phone,
                message
              });
            }
          }

          if (reminder.reminder_type === 'email' || reminder.reminder_type === 'both') {
            if (reminder.parent_email) {
              // For email, we need to send HTML email without PDF
              const nodemailer = require('nodemailer');
              const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: true,
                auth: {
                  user: process.env.SMTP_USERNAME,
                  pass: process.env.SMTP_PASSWORD
                },
                tls: { rejectUnauthorized: false }
              });

              await transporter.sendMail({
                from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_ADDRESS}>`,
                to: reminder.parent_email,
                subject: `Payment Reminder - ${reminder.student_name}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ff4d4f;">Payment Reminder</h2>
                    <p>Dear Parent,</p>
                    <p>Your child <strong>${reminder.student_name}</strong> has an outstanding balance of <strong>₦${parseFloat(reminder.balance_due).toLocaleString()}</strong> for ${reminder.term} ${reminder.academic_year}.</p>
                    <p>Please make payment at your earliest convenience.</p>
                    <p>Thank you.</p>
                    <hr style="border: 1px solid #f0f0f0; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">This is an automated reminder. Please do not reply.</p>
                  </div>
                `
              });
            }
          }

          await db.sequelize.query(
            'UPDATE payment_reminders SET status = ?, sent_at = NOW() WHERE id = ?',
            { replacements: ['sent', reminder.id] }
          );
          sent++;
        } catch (error) {
          console.error(`❌ Failed to send reminder ${reminder.id}:`, error.message);
          await db.sequelize.query(
            'UPDATE payment_reminders SET status = ?, error_message = ? WHERE id = ?',
            { replacements: ['failed', error.message, reminder.id] }
          );
          failed++;
        }
      }

      console.log(`✅ Sent ${sent} reminders, ${failed} failed`);
      return { success: true, sent, failed, total: reminders.length };
    } catch (error) {
      console.error('❌ Error sending reminders:', error);
      throw error;
    }
  }

  async getReminderStats(school_id, term, academic_year) {
    const [stats] = await db.sequelize.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         SUM(balance_due) as total_outstanding
       FROM payment_reminders
       WHERE school_id = ?
         AND term = ?
         AND academic_year = ?`,
      { 
        replacements: [school_id, term, academic_year],
        type: db.sequelize.QueryTypes.SELECT 
      }
    );

    return stats[0];
  }
}

module.exports = new ReminderService();
