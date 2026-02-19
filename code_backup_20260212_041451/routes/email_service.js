const express = require('express');
const router = express.Router();
const { addEmailWithPDFJob } = require('../queues/emailQueue');

router.post('/email/send-with-pdf', async (req, res) => {
  try {
    const { school_id, email, subject, studentName, pdfBase64, filename } = req.body;

    if (!school_id || !email || !pdfBase64) {
      return res.status(400).json({
        success: false,
        message: 'School ID, email, and PDF data are required'
      });
    }

    const job = await addEmailWithPDFJob({
      school_id,
      email,
      subject: subject || `Payment Receipt - ${studentName}`,
      studentName,
      pdfBase64,
      filename: filename || 'receipt.pdf',
      sender_id: req.user?.user_id || 'system'
    });

    res.json({
      success: true,
      message: 'Email queued for sending',
      job_id: job.id,
      data: {
        queued_at: new Date().toISOString(),
        email
      }
    });
  } catch (error) {
    console.error('❌ Error queueing email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue email',
      error: error.message
    });
  }
});

router.get('/email/status', async (req, res) => {
  try {
    const { school_id } = req.query;

    const [stats] = await require('../models').sequelize.query(
      `SELECT 
         COUNT(*) as total_sent,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM email_messages
       WHERE school_id = ?
         AND DATE(created_at) = CURDATE()`,
      { replacements: [school_id] }
    );

    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    console.error('❌ Error getting email stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email stats',
      error: error.message
    });
  }
});

module.exports = router;
