const express = require('express');
const router = express.Router();
const passport = require('passport');
const { sequelize } = require('../models');

// All routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

// Get branches for the school
router.get('/', async (req, res) => {
  try {
    const { school_id } = req.user;
    
    // Fetch branches from database
    const [branches] = await sequelize.query(
      `SELECT 
        branch_id, 
        branch_name, 
        school_id
      FROM school_locations 
      WHERE school_id = :school_id 
      ORDER BY branch_name ASC`,
      {
        replacements: { school_id },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    res.json({
      success: true,
      message: 'Branches retrieved successfully',
      data: branches || []
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve branches',
      error: error.message
    });
  }
});

// Update branch personal development scale
router.post('/update-personal-dev-scale', async (req, res) => {
  try {
    const { personal_dev_scale } = req.body;
    const branch_id = req.headers['x-branch-id'];
    const { school_id } = req.user;
    
    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }
    
    if (!personal_dev_scale || !['Alphabet', 'Numeric'].includes(personal_dev_scale)) {
      return res.status(400).json({
        success: false,
        message: 'Valid personal_dev_scale is required (Alphabet or Numeric)'
      });
    }
    
    // Update branch personal development scale
    const [result] = await sequelize.query(
      `UPDATE school_locations 
       SET personal_dev_scale = :personal_dev_scale 
       WHERE branch_id = :branch_id 
       AND school_id = :school_id`,
      {
        replacements: { personal_dev_scale, branch_id, school_id },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    res.json({
      success: true,
      message: 'Branch personal development scale updated successfully',
      data: { personal_dev_scale, branch_id }
    });
  } catch (error) {
    console.error('Update branch personal dev scale error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update branch personal development scale',
      error: error.message
    });
  }
});

module.exports = router;
