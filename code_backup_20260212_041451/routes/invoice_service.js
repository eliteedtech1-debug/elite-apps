const express = require('express');
const router = express.Router();
const db = require('../models');
const { addSingleMessageJob } = require('../queues/whatsappQueue');

router.post('/invoices/send-bulk', async (req, res) => {
  try {
    const school_id = req.body.school_id || req.headers['x-school-id'];
    const branch_id = req.body.branch_id || req.headers['x-branch-id'];
    const { term, academic_year, class_code, channel, student_ids } = req.body;

    if (!school_id || !term || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'School ID, term, and academic year are required'
      });
    }

    let query = `
      SELECT 
        s.admission_no, 
        s.student_name, 
        p.phone, 
        p.email,
        SUM(pe.cr) as total_bill
      FROM students s
      LEFT JOIN parents p ON s.parent_id = p.parent_id
      LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no
        AND pe.term = ? AND pe.academic_year = ?
      WHERE s.school_id = ?
    `;
    const replacements = [term, academic_year, school_id];

    if (branch_id) {
      query += ' AND s.branch_id = ?';
      replacements.push(branch_id);
    }

    if (class_code) {
      query += ' AND s.class_code = ?';
      replacements.push(class_code);
    }

    if (student_ids && student_ids.length > 0) {
      query += ` AND s.admission_no IN (${student_ids.map(() => '?').join(',')})`;
      replacements.push(...student_ids);
    }

    query += ' GROUP BY s.admission_no, s.student_name, p.phone, p.email HAVING total_bill > 0';

    const students = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    let queued = 0;
    const results = { whatsapp: 0, email: 0, skipped: 0 };

    for (const student of students) {
      const message = `Dear Parent,\n\nYour child ${student.student_name}'s bill for ${term} ${academic_year} is ready.\n\nTotal Amount: ₦${parseFloat(student.total_bill).toLocaleString()}\n\nPlease make payment at your earliest convenience.\n\nThank you.`;

      let sent = false;

      if ((channel === 'whatsapp' || channel === 'both') && student.phone) {
        await addSingleMessageJob({
          school_id,
          phone: student.phone,
          message
        });
        results.whatsapp++;
        sent = true;
      }

      if ((channel === 'email' || channel === 'both') && student.email) {
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
          to: student.email,
          subject: `Invoice Ready - ${student.student_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1890ff;">Invoice Notification</h2>
              <p>Dear Parent,</p>
              <p>Your child <strong>${student.student_name}</strong>'s bill for <strong>${term} ${academic_year}</strong> is ready.</p>
              <p><strong>Total Amount: ₦${parseFloat(student.total_bill).toLocaleString()}</strong></p>
              <p>Please make payment at your earliest convenience.</p>
              <p>Thank you.</p>
              <hr style="border: 1px solid #f0f0f0; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">This is an automated notification.</p>
            </div>
          `
        });
        results.email++;
        sent = true;
      }

      if (sent) queued++;
      else results.skipped++;
    }

    res.json({
      success: true,
      message: `Queued ${queued} invoice notifications`,
      data: {
        total_students: students.length,
        queued,
        ...results
      }
    });
  } catch (error) {
    console.error('❌ Error sending bulk invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk invoices',
      error: error.message
    });
  }
});

module.exports = router;
