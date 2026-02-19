/**
 * Staff Attendance Service
 * 
 * This service handles all staff attendance operations including:
 * - GPS-based attendance marking
 * - Manual attendance entry
 * - Biometric data import from CSV/Excel
 * - Attendance reporting and analytics
 */

const db = require('../models');
const { isWithinRadius, formatDistance } = require('../utils/gpsUtils');

/**
 * Mark staff attendance via GPS during login
 * 
 * @param {object} params - Attendance parameters
 * @param {string} params.staff_id - Staff ID
 * @param {number} params.user_id - User ID
 * @param {string} params.school_id - School ID
 * @param {string} params.branch_id - Branch ID
 * @param {number} params.gps_lat - Staff GPS latitude
 * @param {number} params.gps_lon - Staff GPS longitude
 * @param {number} params.distance - Distance from school in meters
 * @returns {Promise<object>} Attendance record
 */
async function markGPSAttendance(params) {
  const {
    staff_id,
    user_id,
    school_id,
    branch_id,
    gps_lat,
    gps_lon,
    distance
  } = params;

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const now = new Date();

  try {
    // Check if attendance already exists for today
    const [existingAttendance] = await db.sequelize.query(
      `SELECT id, check_in_time, method 
       FROM staff_attendance 
       WHERE staff_id = :staff_id 
         AND date = :date 
         AND school_id = :school_id
       LIMIT 1`,
      {
        replacements: { staff_id, date: today, school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (existingAttendance) {
      console.log(`✅ Attendance already marked for staff ${staff_id} on ${today}`);
      return {
        success: true,
        message: 'Attendance already marked for today',
        data: existingAttendance,
        isNew: false
      };
    }

    // Determine status based on time (example: late if after 9 AM)
    const checkInHour = now.getHours();
    const status = checkInHour >= 9 ? 'Late' : 'Present';

    // Insert new attendance record
    const [result] = await db.sequelize.query(
      `INSERT INTO staff_attendance
       (staff_id, user_id, school_id, branch_id, date, check_in_time,
        method, gps_lat, gps_lon, distance_from_branch, status, created_at)
       VALUES
       (:staff_id, :user_id, :school_id, :branch_id, :date, :check_in_time,
        'GPS', :gps_lat, :gps_lon, :distance, :status, NOW())`,
      {
        replacements: {
          staff_id,
          user_id,
          school_id,
          branch_id,
          date: today,
          check_in_time: now,
          gps_lat,
          gps_lon,
          distance,
          status
        },
        type: db.sequelize.QueryTypes.INSERT
      }
    );

    console.log(`✅ GPS attendance marked for staff ${staff_id} - Status: ${status}`);

    return {
      success: true,
      message: `Attendance marked successfully - ${status}`,
      data: {
        id: result,
        staff_id,
        date: today,
        check_in_time: now,
        status,
        method: 'GPS',
        distance: distance
      },
      isNew: true
    };
  } catch (error) {
    console.error('Error marking GPS attendance:', error);
    throw error;
  }
}

/**
 * Validate GPS location against branch coordinates
 * 
 * @param {object} params - Validation parameters
 * @param {string} params.school_id - School ID
 * @param {string} params.branch_id - Branch ID (from selected_branch in auth context)
 * @param {number} params.staff_lat - Staff latitude
 * @param {number} params.staff_lon - Staff longitude
 * @returns {Promise<object>} Validation result
 */
async function validateGPSLocation(params) {
  const { school_id, branch_id, staff_lat, staff_lon } = params;

  try {
    // Step 1: Check if GPS attendance is enabled for the school
    const [school] = await db.sequelize.query(
      `SELECT staff_login_system, school_name
       FROM school_setup 
       WHERE school_id = :school_id 
         AND status = 'Active'
       LIMIT 1`,
      {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    if (!school) {
      return {
        isValid: false,
        error: 'School not found or inactive',
        code: 'SCHOOL_NOT_FOUND'
      };
    }

    // Check if GPS attendance is enabled
    if (school.staff_login_system !== 1) {
      return {
        isValid: true,
        gpsEnabled: false,
        message: 'GPS attendance not enabled for this school'
      };
    }

    // Step 2: Fetch branch GPS coordinates from school_locations
    const [branch] = await db.sequelize.query(
      `SELECT latitude, longitude, gps_radius, branch_name, location
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

    if (!branch) {
      return {
        isValid: false,
        error: 'Branch not found or inactive. Please contact administrator.',
        code: 'BRANCH_NOT_FOUND'
      };
    }

    // Check if branch has GPS coordinates configured
    if (!branch.latitude || !branch.longitude) {
      return {
        isValid: false,
        error: `GPS coordinates not configured for ${branch.branch_name}. Please contact administrator.`,
        code: 'GPS_NOT_CONFIGURED'
      };
    }

    // Step 3: Calculate distance and validate
    const allowedRadius = branch.gps_radius || 80; // Default 80 meters
    const locationCheck = isWithinRadius(
      branch.latitude,
      branch.longitude,
      staff_lat,
      staff_lon,
      allowedRadius
    );

    if (!locationCheck.isWithinRadius) {
      return {
        isValid: false,
        gpsEnabled: true,
        error: `You are ${formatDistance(locationCheck.distance)} away from ${branch.branch_name} (${branch.location}). ` +
               `You must be within ${formatDistance(allowedRadius)} to log in and mark attendance.`,
        code: 'OUTSIDE_RADIUS',
        data: {
          distance: locationCheck.distance,
          allowedRadius: locationCheck.allowedRadius,
          branchName: branch.branch_name,
          branchLocation: branch.location,
          schoolName: school.school_name
        }
      };
    }

    // GPS validation passed
    return {
      isValid: true,
      gpsEnabled: true,
      message: 'GPS location validated successfully',
      data: {
        distance: locationCheck.distance,
        allowedRadius: locationCheck.allowedRadius,
        branchName: branch.branch_name,
        branchLocation: branch.location,
        schoolName: school.school_name,
        branchLat: branch.latitude,
        branchLon: branch.longitude
      }
    };
  } catch (error) {
    console.error('Error validating GPS location:', error);
    throw error;
  }
}

/**
 * Import biometric attendance from CSV/Excel data
 * 
 * @param {object} params - Import parameters
 * @param {string} params.school_id - School ID
 * @param {string} params.branch_id - Branch ID
 * @param {array} params.records - Array of attendance records
 * @param {string} params.file_name - Original file name
 * @param {number} params.imported_by - User ID performing import
 * @returns {Promise<object>} Import result
 */
async function importBiometricAttendance(params) {
  const { school_id, branch_id, records, file_name, imported_by } = params;

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  try {
    // Start transaction
    const transaction = await db.sequelize.transaction();

    try {
      for (const record of records) {
        try {
          const { staff_id, date, check_in_time, check_out_time, status } = record;

          // Validate required fields
          if (!staff_id || !date) {
            failCount++;
            errors.push({
              staff_id,
              date,
              error: 'Missing required fields (staff_id or date)'
            });
            continue;
          }

          // Check if record already exists
          const [existing] = await db.sequelize.query(
            `SELECT id FROM staff_attendance 
             WHERE staff_id = :staff_id 
               AND date = :date 
               AND school_id = :school_id`,
            {
              replacements: { staff_id, date, school_id },
              type: db.sequelize.QueryTypes.SELECT,
              transaction
            }
          );

          if (existing) {
            // Update existing record
            await db.sequelize.query(
              `UPDATE staff_attendance 
               SET check_in_time = :check_in_time,
                   check_out_time = :check_out_time,
                   status = :status,
                   method = 'Biometric',
                   updated_at = NOW(),
                   updated_by = :updated_by
               WHERE id = :id`,
              {
                replacements: {
                  id: existing.id,
                  check_in_time,
                  check_out_time,
                  status: status || 'Present',
                  updated_by: imported_by
                },
                transaction
              }
            );
          } else {
            // Insert new record
            await db.sequelize.query(
              `INSERT INTO staff_attendance 
               (staff_id, school_id, branch_id, date, check_in_time, check_out_time,
                method, status, created_by, created_at)
               VALUES 
               (:staff_id, :school_id, :branch_id, :date, :check_in_time, :check_out_time,
                'Biometric', :status, :created_by, NOW())`,
              {
                replacements: {
                  staff_id,
                  school_id,
                  branch_id,
                  date,
                  check_in_time,
                  check_out_time,
                  status: status || 'Present',
                  created_by: imported_by
                },
                transaction
              }
            );
          }

          successCount++;
        } catch (recordError) {
          failCount++;
          errors.push({
            staff_id: record.staff_id,
            date: record.date,
            error: recordError.message
          });
        }
      }

      // Log the import
      await db.sequelize.query(
        `INSERT INTO biometric_import_log 
         (school_id, branch_id, import_date, file_name, total_records,
          successful_imports, failed_imports, error_log, imported_by, created_at)
         VALUES 
         (:school_id, :branch_id, CURDATE(), :file_name, :total_records,
          :successful_imports, :failed_imports, :error_log, :imported_by, NOW())`,
        {
          replacements: {
            school_id,
            branch_id,
            file_name,
            total_records: records.length,
            successful_imports: successCount,
            failed_imports: failCount,
            error_log: JSON.stringify(errors),
            imported_by
          },
          transaction
        }
      );

      // Commit transaction
      await transaction.commit();

      return {
        success: true,
        message: `Import completed: ${successCount} successful, ${failCount} failed`,
        data: {
          total: records.length,
          successful: successCount,
          failed: failCount,
          errors: errors.length > 0 ? errors : null
        }
      };
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error importing biometric attendance:', error);
    throw error;
  }
}

/**
 * Get staff attendance for a specific date range
 * 
 * @param {object} params - Query parameters
 * @param {string} params.school_id - School ID
 * @param {string} params.branch_id - Branch ID (optional)
 * @param {string} params.staff_id - Staff ID (optional)
 * @param {string} params.start_date - Start date (YYYY-MM-DD)
 * @param {string} params.end_date - End date (YYYY-MM-DD)
 * @returns {Promise<array>} Attendance records
 */
async function getAttendanceRecords(params) {
  const { school_id, branch_id, staff_id, start_date, end_date } = params;

  let query = `
    SELECT 
      sa.*,
      t.name as staff_name,
      t.id as teacher_id,
      t.staff_role as designation,
      t.staff_type as role,
      t.passport_url as profile_picture,
      u.email
    FROM staff_attendance sa
    LEFT JOIN teachers t ON sa.staff_id = t.id
    LEFT JOIN users u ON sa.user_id = u.id
    WHERE sa.school_id = :school_id
  `;

  const replacements = { school_id };

  if (branch_id) {
    query += ` AND sa.branch_id = :branch_id`;
    replacements.branch_id = branch_id;
  }

  if (staff_id) {
    query += ` AND sa.staff_id = :staff_id`;
    replacements.staff_id = staff_id;
  }

  if (start_date) {
    query += ` AND sa.date >= :start_date`;
    replacements.start_date = start_date;
  }

  if (end_date) {
    query += ` AND sa.date <= :end_date`;
    replacements.end_date = end_date;
  }

  query += ` ORDER BY sa.date DESC, sa.check_in_time DESC`;

  try {
    const records = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    return records;
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    throw error;
  }
}

module.exports = {
  markGPSAttendance,
  validateGPSLocation,
  importBiometricAttendance,
  getAttendanceRecords
};
