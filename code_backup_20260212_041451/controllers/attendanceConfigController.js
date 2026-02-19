/**
 * Attendance Configuration Controller
 *
 * Manages attendance configuration for branches including:
 * - Check-in/check-out times
 * - Overtime rewards (supports decimal hours like 0.5, 1.75)
 * - Late penalties (supports decimal hours)
 * - Calculation settings
 */

const db = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHandler');

/**
 * Get attendance configuration for a branch
 *
 * @route GET /api/attendance-config
 * @query {string} school_id - School ID
 * @query {string} branch_id - Branch ID
 */
const getAttendanceConfig = async (req, res) => {
  const { school_id, branch_id } = req.query;

  if (!school_id || !branch_id) {
    return errorResponse(res, 'school_id and branch_id are required', 400);
  }

  try {
    const [config] = await db.sequelize.query(
      `SELECT
        school_id,
        branch_id,
        branch_name,
        check_in_start,
        check_in_end,
        check_out_start,
        check_out_end,
        standard_hours_per_day,
        standard_hours_per_week,
        late_grace_period,
        early_departure_grace,
        enable_overtime,
        overtime_rate_per_hour,
        overtime_currency,
        overtime_calculation_method,
        enable_late_penalty,
        late_penalty_per_hour,
        late_penalty_currency,
        late_penalty_method,
        enable_absence_penalty,
        absence_penalty_per_day,
        absence_penalty_currency,
        half_day_threshold_hours,
        half_day_penalty,
        round_overtime_to,
        minimum_overtime_hours,
        auto_calculate_penalties
      FROM school_locations
      WHERE school_id = :school_id
        AND branch_id = :branch_id
        AND status = 'Active'
      LIMIT 1`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!config) {
      return errorResponse(res, 'Branch configuration not found', 404);
    }

    return successResponse(res, 'Configuration retrieved successfully', config);
  } catch (error) {
    console.error('Error fetching attendance config:', error);
    return errorResponse(res, 'Failed to fetch configuration', 500, error.message);
  }
};

/**
 * Update attendance configuration for a branch
 *
 * @route PUT /api/attendance-config
 * @body {object} config - Configuration object with all settings
 */
const updateAttendanceConfig = async (req, res) => {
  const { school_id, branch_id } = req.body;

  if (!school_id || !branch_id) {
    return errorResponse(res, 'school_id and branch_id are required', 400);
  }

  const {
    check_in_start,
    check_in_end,
    check_out_start,
    check_out_end,
    standard_hours_per_day,
    standard_hours_per_week,
    late_grace_period,
    early_departure_grace,
    enable_overtime,
    overtime_rate_per_hour,
    overtime_currency,
    overtime_calculation_method,
    enable_late_penalty,
    late_penalty_per_hour,
    late_penalty_currency,
    late_penalty_method,
    enable_absence_penalty,
    absence_penalty_per_day,
    absence_penalty_currency,
    half_day_threshold_hours,
    half_day_penalty,
    round_overtime_to,
    minimum_overtime_hours,
    auto_calculate_penalties
  } = req.body;

  try {
    // Build update query dynamically
    const updates = [];
    const replacements = { school_id, branch_id };

    if (check_in_start !== undefined) {
      updates.push('check_in_start = :check_in_start');
      replacements.check_in_start = check_in_start;
    }
    if (check_in_end !== undefined) {
      updates.push('check_in_end = :check_in_end');
      replacements.check_in_end = check_in_end;
    }
    if (check_out_start !== undefined) {
      updates.push('check_out_start = :check_out_start');
      replacements.check_out_start = check_out_start;
    }
    if (check_out_end !== undefined) {
      updates.push('check_out_end = :check_out_end');
      replacements.check_out_end = check_out_end;
    }
    if (standard_hours_per_day !== undefined) {
      updates.push('standard_hours_per_day = :standard_hours_per_day');
      replacements.standard_hours_per_day = standard_hours_per_day;
    }
    if (standard_hours_per_week !== undefined) {
      updates.push('standard_hours_per_week = :standard_hours_per_week');
      replacements.standard_hours_per_week = standard_hours_per_week;
    }
    if (late_grace_period !== undefined) {
      updates.push('late_grace_period = :late_grace_period');
      replacements.late_grace_period = late_grace_period;
    }
    if (early_departure_grace !== undefined) {
      updates.push('early_departure_grace = :early_departure_grace');
      replacements.early_departure_grace = early_departure_grace;
    }
    if (enable_overtime !== undefined) {
      updates.push('enable_overtime = :enable_overtime');
      replacements.enable_overtime = enable_overtime ? 1 : 0;
    }
    if (overtime_rate_per_hour !== undefined) {
      updates.push('overtime_rate_per_hour = :overtime_rate_per_hour');
      replacements.overtime_rate_per_hour = overtime_rate_per_hour;
    }
    if (overtime_currency !== undefined) {
      updates.push('overtime_currency = :overtime_currency');
      replacements.overtime_currency = overtime_currency;
    }
    if (overtime_calculation_method !== undefined) {
      updates.push('overtime_calculation_method = :overtime_calculation_method');
      replacements.overtime_calculation_method = overtime_calculation_method;
    }
    if (enable_late_penalty !== undefined) {
      updates.push('enable_late_penalty = :enable_late_penalty');
      replacements.enable_late_penalty = enable_late_penalty ? 1 : 0;
    }
    if (late_penalty_per_hour !== undefined) {
      updates.push('late_penalty_per_hour = :late_penalty_per_hour');
      replacements.late_penalty_per_hour = late_penalty_per_hour;
    }
    if (late_penalty_currency !== undefined) {
      updates.push('late_penalty_currency = :late_penalty_currency');
      replacements.late_penalty_currency = late_penalty_currency;
    }
    if (late_penalty_method !== undefined) {
      updates.push('late_penalty_method = :late_penalty_method');
      replacements.late_penalty_method = late_penalty_method;
    }
    if (enable_absence_penalty !== undefined) {
      updates.push('enable_absence_penalty = :enable_absence_penalty');
      replacements.enable_absence_penalty = enable_absence_penalty ? 1 : 0;
    }
    if (absence_penalty_per_day !== undefined) {
      updates.push('absence_penalty_per_day = :absence_penalty_per_day');
      replacements.absence_penalty_per_day = absence_penalty_per_day;
    }
    if (absence_penalty_currency !== undefined) {
      updates.push('absence_penalty_currency = :absence_penalty_currency');
      replacements.absence_penalty_currency = absence_penalty_currency;
    }
    if (half_day_threshold_hours !== undefined) {
      updates.push('half_day_threshold_hours = :half_day_threshold_hours');
      replacements.half_day_threshold_hours = half_day_threshold_hours;
    }
    if (half_day_penalty !== undefined) {
      updates.push('half_day_penalty = :half_day_penalty');
      replacements.half_day_penalty = half_day_penalty;
    }
    if (round_overtime_to !== undefined) {
      updates.push('round_overtime_to = :round_overtime_to');
      replacements.round_overtime_to = round_overtime_to;
    }
    if (minimum_overtime_hours !== undefined) {
      updates.push('minimum_overtime_hours = :minimum_overtime_hours');
      replacements.minimum_overtime_hours = minimum_overtime_hours;
    }
    if (auto_calculate_penalties !== undefined) {
      updates.push('auto_calculate_penalties = :auto_calculate_penalties');
      replacements.auto_calculate_penalties = auto_calculate_penalties ? 1 : 0;
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No configuration fields to update', 400);
    }

    // Update the configuration
    await db.sequelize.query(
      `UPDATE school_locations
       SET ${updates.join(', ')},
           updated_at = NOW()
       WHERE school_id = :school_id
         AND branch_id = :branch_id`,
      {
        replacements,
        type: db.sequelize.QueryTypes.UPDATE
      }
    );

    // Fetch and return updated configuration
    const [updatedConfig] = await db.sequelize.query(
      `SELECT * FROM school_locations
       WHERE school_id = :school_id
         AND branch_id = :branch_id
       LIMIT 1`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    return successResponse(res, 'Configuration updated successfully', updatedConfig);
  } catch (error) {
    console.error('Error updating attendance config:', error);
    return errorResponse(res, 'Failed to update configuration', 500, error.message);
  }
};

/**
 * Get all branches with their attendance configuration
 *
 * @route GET /api/attendance-config/all
 * @query {string} school_id - School ID
 */
const getAllBranchConfigs = async (req, res) => {
  const { school_id } = req.query;

  if (!school_id) {
    return errorResponse(res, 'school_id is required', 400);
  }

  try {
    const configs = await db.sequelize.query(
      `SELECT * FROM v_branch_attendance_config
       WHERE school_id = :school_id
       ORDER BY branch_name`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    return successResponse(res, 'Branch configurations retrieved successfully', configs);
  } catch (error) {
    console.error('Error fetching branch configs:', error);
    return errorResponse(res, 'Failed to fetch branch configurations', 500, error.message);
  }
};

module.exports = {
  getAttendanceConfig,
  updateAttendanceConfig,
  getAllBranchConfigs
};
