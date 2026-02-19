const { Worker } = require('bullmq');
const { connection } = require('./whatsappQueue');
const nodemailer = require('nodemailer');
const db = require('../models');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

const processEmailJob = async (job) => {
  const { type, ...data } = job.data;

  console.log(`📧 Processing email job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'email-with-pdf':
        return await processEmailWithPDF(job, data);
      case 'send-email':
        return await processSendEmail(job, data);
      default:
        throw new Error(`Unknown email job type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Email job ${job.id} failed:`, error.message);
    throw error;
  }
};

const processSendEmail = async (job, data) => {
  const { school_id, branch_id, sender_id, recipient_id, recipient_name, recipient_type, email, subject, message } = data;

  console.log(`📧 Sending email to ${email}`);

  const [schoolInfo] = await db.sequelize.query(
    'SELECT school_name, email_address FROM school_setup WHERE school_id = ?',
    { replacements: [school_id] }
  );
  const schoolName = schoolInfo?.[0]?.school_name || process.env.SMTP_FROM_NAME;
  const schoolEmail = schoolInfo?.[0]?.email_address || process.env.SMTP_FROM_ADDRESS;

  const mailOptions = {
    from: `${schoolName} <${schoolEmail}>`,
    to: email,
    subject: subject || `Message from ${schoolName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">${subject || `Message from ${schoolName}`}</h2>
        <p>Dear ${recipient_name},</p>
        <div style="white-space: pre-wrap;">${message}</div>
        <hr style="border: 1px solid #f0f0f0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated email from ${schoolName}. Please do not reply.
        </p>
      </div>
    `
  };

  const result = await transporter.sendMail(mailOptions);

  console.log(`✅ Email sent to ${email}:`, result.messageId);

  await db.sequelize.query(
    `INSERT INTO messaging_history 
     (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, 
      recipient_name, recipient_identifier, channel, message_text, message_subject, 
      status, cost, created_at)
     VALUES (?, ?, ?, 'system', ?, ?, ?, ?, 'email', ?, ?, 'sent', 0, NOW())`,
    {
      replacements: [
        school_id,
        branch_id || 'SYSTEM',
        sender_id || 'system',
        recipient_type,
        recipient_id || email,
        recipient_name,
        email,
        message,
        subject || 'Message from School'
      ]
    }
  );

  return { success: true, email, messageId: result.messageId };
};

const processEmailWithPDF = async (job, data) => {
  const { school_id, email, subject, studentName, pdfBase64, filename } = data;

  console.log(`📧 Sending receipt email to ${email}`);

  const [schoolInfo] = await db.sequelize.query(
    'SELECT school_name, email_address FROM school_setup WHERE school_id = ?',
    { replacements: [school_id] }
  );
  const schoolName = schoolInfo?.[0]?.school_name || process.env.SMTP_FROM_NAME;
  const schoolEmail = schoolInfo?.[0]?.email_address || process.env.SMTP_FROM_ADDRESS;

  const pdfBuffer = Buffer.from(pdfBase64, 'base64');

  const mailOptions = {
    from: `${schoolName} <${schoolEmail}>`,
    to: email,
    subject: subject || `Payment Receipt - ${schoolName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Payment Receipt</h2>
        <p>Dear Parent,</p>
        <p>Please find attached the payment receipt for <strong>${studentName}</strong>.</p>
        <p>Thank you for your payment.</p>
        <hr style="border: 1px solid #f0f0f0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated email from ${schoolName}. Please do not reply.
        </p>
      </div>
    `,
    attachments: [{
      filename: filename || 'receipt.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  };

  const result = await transporter.sendMail(mailOptions);

  console.log(`✅ Email sent to ${email}:`, result.messageId);

  await db.sequelize.query(
    `INSERT INTO messaging_history 
     (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, 
      recipient_name, recipient_identifier, channel, message_text, message_subject, 
      status, cost, created_at)
     VALUES (?, ?, ?, 'system', 'parent', ?, ?, ?, 'email', ?, ?, 'sent', 0, NOW())`,
    {
      replacements: [
        school_id,
        data.branch_id || 'SYSTEM',
        data.sender_id || 'system',
        data.recipient_id || email,
        studentName,
        email,
        mailOptions.html.replace(/<[^>]*>/g, '').substring(0, 500),
        subject || 'Payment Receipt'
      ]
    }
  );

  await db.sequelize.query(
    `INSERT INTO email_messages (school_id, recipient_email, subject, status, sent_at, created_by)
     VALUES (?, ?, ?, 'sent', NOW(), ?)`,
    {
      replacements: [
        school_id,
        email,
        subject,
        data.sender_id || 'system'
      ]
    }
  );

  await db.sequelize.query(
    `INSERT INTO messaging_usage (school_id, service_type, message_count, cost)
     VALUES (?, 'email', 1, 0)`,
    { replacements: [school_id] }
  );

  return { success: true, email, messageId: result.messageId };
};

const worker = new Worker('email', processEmailJob, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000
  }
});

worker.on('completed', (job, result) => {
  console.log(`✅ Email job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Email worker error:', err);
});

console.log('🚀 Email worker is ready and waiting for jobs');

module.exports = worker;
