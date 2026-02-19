const express = require('express');
const router = express.Router();
const reminderService = require('../services/reminderService');

router.post('/reminders/schedule', async (req, res) => {
  try {
    const { school_id, term, academic_year, days_until_due } = req.body;

    if (!school_id || !term || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'School ID, term, and academic year are required'
      });
    }

    const result = await reminderService.scheduleReminders(
      school_id, 
      term, 
      academic_year,
      days_until_due || 7
    );

    res.json({
      success: true,
      message: `Scheduled ${result.scheduled} reminders`,
      data: result
    });
  } catch (error) {
    console.error('❌ Error scheduling reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule reminders',
      error: error.message
    });
  }
});

router.post('/reminders/send', async (req, res) => {
  try {
    const { limit } = req.body;

    const result = await reminderService.sendPendingReminders(limit || 100);

    res.json({
      success: true,
      message: `Sent ${result.sent} reminders`,
      data: result
    });
  } catch (error) {
    console.error('❌ Error sending reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminders',
      error: error.message
    });
  }
});

router.get('/reminders/stats', async (req, res) => {
  try {
    const { school_id, term, academic_year } = req.query;

    if (!school_id || !term || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'School ID, term, and academic year are required'
      });
    }

    const stats = await reminderService.getReminderStats(school_id, term, academic_year);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting reminder stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reminder stats',
      error: error.message
    });
  }
});

router.get('/reminders/list', async (req, res) => {
  try {
    const { school_id, term, academic_year, status } = req.query;

    let query = 'SELECT * FROM payment_reminders WHERE school_id = ?';
    const replacements = [school_id];

    if (term) {
      query += ' AND term = ?';
      replacements.push(term);
    }

    if (academic_year) {
      query += ' AND academic_year = ?';
      replacements.push(academic_year);
    }

    if (status) {
      query += ' AND status = ?';
      replacements.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const reminders = await require('../models').sequelize.query(query, {
      replacements,
      type: require('../models').sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: reminders
    });
  } catch (error) {
    console.error('❌ Error listing reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list reminders',
      error: error.message
    });
  }
});

module.exports = router;
