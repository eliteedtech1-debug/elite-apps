const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticateToken } = require('../middleware/auth');

// GET /api/roles/user-types - Get available user types for school
router.get('/user-types', authenticateToken, async (req, res) => {
  try {
    const { school_id } = req.user;

    // Get user types from users table
    const userTypes = await db.sequelize.query(
      `SELECT DISTINCT user_type 
       FROM users 
       WHERE school_id = ? 
       AND user_type NOT IN ('super_admin', 'superadmin')
       AND user_type IS NOT NULL
       ORDER BY user_type`,
      { 
        replacements: [school_id],
        type: db.Sequelize.QueryTypes.SELECT 
      }
    );

    // Check if students exist
    const hasStudents = await db.sequelize.query(
      'SELECT COUNT(*) as count FROM students WHERE school_id = ? LIMIT 1',
      { 
        replacements: [school_id],
        type: db.Sequelize.QueryTypes.SELECT 
      }
    );

    const formattedTypes = userTypes.map(u => u.user_type.toLowerCase());
    
    // Add 'student' if students exist and not already in list
    if (hasStudents[0].count > 0 && !formattedTypes.includes('student')) {
      formattedTypes.unshift('student');
    }

    res.json({
      success: true,
      data: formattedTypes.sort()
    });
  } catch (error) {
    console.error('Error fetching user types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user types'
    });
  }
});

module.exports = router;
