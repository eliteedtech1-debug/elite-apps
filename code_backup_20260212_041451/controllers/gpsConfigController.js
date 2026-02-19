/**
 * GPS Configuration Controller
 * 
 * Handles GPS configuration for school branches and GPS attendance settings
 */

const db = require('../models');

/**
 * Get all branches with GPS configuration
 */
exports.getBranches = async (req, res) => {
  try {
    // Get school_id from headers (case-insensitive) or query params (fallback)
    const school_id = req.headers['x-school-id'] || req.headers['X-School-Id'] || req.query.school_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'school_id is required in headers (x-school-id) or query params'
      });
    }

    const branches = await db.sequelize.query(
      `SELECT 
        branch_id,
        branch_name,
        location,
        latitude,
        longitude,
        gps_radius,
        opening_time,
        closing_time,
        status
      FROM school_locations
      WHERE school_id = :school_id
      ORDER BY branch_name ASC`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: branches,
      count: branches.length
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    });
  }
};

/**
 * Update GPS configuration for a branch
 */
exports.updateBranchGPS = async (req, res) => {
  try {
    // Get school_id and branch_id from headers (case-insensitive) or body (fallback)
    const school_id = req.headers['x-school-id'] || req.headers['X-School-Id'] || req.body.school_id;
    const branch_id = req.headers['x-branch-id'] || req.headers['X-Branch-Id'] || req.body.branch_id;
    const { latitude, longitude, gps_radius, opening_time, closing_time } = req.body;

    // Validation
    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'school_id and branch_id are required (in headers or body)'
      });
    }

    // Check if branch exists
    const [branch] = await db.sequelize.query(
      `SELECT branch_id FROM school_locations 
       WHERE school_id = :school_id AND branch_id = :branch_id`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Build dynamic update query
    const updates = [];
    const replacements = { school_id, branch_id };

    if (latitude !== undefined && longitude !== undefined) {
      // Validate coordinates
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude. Must be between -90 and 90'
        });
      }
      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid longitude. Must be between -180 and 180'
        });
      }
      updates.push('latitude = :latitude', 'longitude = :longitude');
      replacements.latitude = latitude;
      replacements.longitude = longitude;
    }

    if (gps_radius !== undefined) {
      const radius = gps_radius || 100;
      if (radius < 10 || radius > 1000) {
        return res.status(400).json({
          success: false,
          message: 'GPS radius must be between 10 and 1000 meters'
        });
      }
      updates.push('gps_radius = :gps_radius');
      replacements.gps_radius = radius;
    }

    if (opening_time !== undefined) {
      updates.push('opening_time = :opening_time');
      replacements.opening_time = opening_time;
    }

    if (closing_time !== undefined) {
      updates.push('closing_time = :closing_time');
      replacements.closing_time = closing_time;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = NOW()');

    // Update configuration
    await db.sequelize.query(
      `UPDATE school_locations 
       SET ${updates.join(', ')}
       WHERE school_id = :school_id AND branch_id = :branch_id`,
      { replacements }
    );

    // Fetch updated branch
    const [updated] = await db.sequelize.query(
      `SELECT * FROM school_locations 
       WHERE school_id = :school_id AND branch_id = :branch_id`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      message: 'GPS configuration updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating branch GPS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update GPS configuration',
      error: error.message
    });
  }
};

/**
 * Get school GPS attendance status
 */
exports.getSchoolGPSStatus = async (req, res) => {
  try {
    // Get school_id from headers (case-insensitive) or query params (fallback)
    const school_id = req.headers['x-school-id'] || req.headers['X-School-Id'] || req.query.school_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'school_id is required in headers (x-school-id) or query params'
      });
    }

    const [school] = await db.sequelize.query(
      `SELECT 
        school_id,
        school_name,
        staff_login_system,
        status
      FROM school_setup
      WHERE school_id = :school_id`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    res.json({
      success: true,
      data: school
    });
  } catch (error) {
    console.error('Error fetching school GPS status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school GPS status',
      error: error.message
    });
  }
};

/**
 * Update school GPS attendance setting
 */
exports.updateSchoolGPS = async (req, res) => {
  try {
    // Get school_id from headers (case-insensitive) or body (fallback)
    const school_id = req.headers['x-school-id'] || req.headers['X-School-Id'] || req.body.school_id;
    const { staff_login_system } = req.body;

    // Validation
    if (!school_id || staff_login_system === undefined) {
      return res.status(400).json({
        success: false,
        message: 'school_id (in headers or body) and staff_login_system are required'
      });
    }

    // Validate staff_login_system value
    if (![0, 1].includes(staff_login_system)) {
      return res.status(400).json({
        success: false,
        message: 'staff_login_system must be 0 (disabled) or 1 (enabled)'
      });
    }

    // Check if school exists
    const [school] = await db.sequelize.query(
      `SELECT school_id FROM school_setup WHERE school_id = :school_id`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // If enabling GPS, check if at least one branch has GPS configured
    if (staff_login_system === 1) {
      const [branchWithGPS] = await db.sequelize.query(
        `SELECT COUNT(*) as count FROM school_locations 
         WHERE school_id = :school_id 
           AND latitude IS NOT NULL 
           AND longitude IS NOT NULL`,
        {
          replacements: { school_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (branchWithGPS.count === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot enable GPS attendance. Please configure GPS coordinates for at least one branch first.'
        });
      }
    }

    // Update school GPS setting
    await db.sequelize.query(
      `UPDATE school_setup 
       SET staff_login_system = :staff_login_system,
           updated_at = NOW()
       WHERE school_id = :school_id`,
      {
        replacements: {
          school_id,
          staff_login_system
        }
      }
    );

    // Fetch updated school
    const [updated] = await db.sequelize.query(
      `SELECT * FROM school_setup WHERE school_id = :school_id`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      message: `GPS attendance ${staff_login_system === 1 ? 'enabled' : 'disabled'} successfully`,
      data: updated
    });
  } catch (error) {
    console.error('Error updating school GPS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update GPS attendance setting',
      error: error.message
    });
  }
};

/**
 * Get GPS configuration summary
 */
exports.getGPSSummary = async (req, res) => {
  try {
    // Get school_id from headers (case-insensitive) or query params (fallback)
    const school_id = req.headers['x-school-id'] || req.headers['X-School-Id'] || req.query.school_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'school_id is required in headers (x-school-id) or query params'
      });
    }

    // Get school GPS status
    const [school] = await db.sequelize.query(
      `SELECT staff_login_system FROM school_setup WHERE school_id = :school_id`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Get branch GPS statistics
    const [stats] = await db.sequelize.query(
      `SELECT 
        COUNT(*) as total_branches,
        SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) as configured_branches,
        SUM(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END) as unconfigured_branches
      FROM school_locations
      WHERE school_id = :school_id`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: {
        gps_enabled: school?.staff_login_system === 1,
        total_branches: stats.total_branches,
        configured_branches: stats.configured_branches,
        unconfigured_branches: stats.unconfigured_branches,
        configuration_complete: stats.configured_branches === stats.total_branches
      }
    });
  } catch (error) {
    console.error('Error fetching GPS summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GPS summary',
      error: error.message
    });
  }
};

module.exports = exports;
