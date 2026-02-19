/**
 * Biometric Import Controller
 * 
 * Handles importing attendance data from biometric devices
 * Supports: Fingerprint scanners, Facial recognition, Card readers
 */

const db = require('../models');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

/**
 * Preview imported file data
 */
exports.previewImport = async (req, res) => {
  try {
    const { device_type, school_id, branch_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!device_type || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'device_type and school_id are required'
      });
    }

    // Parse file based on extension
    let records = [];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (fileExt === '.csv') {
      records = await parseCSV(file.path);
    } else if (['.xlsx', '.xls'].includes(fileExt)) {
      records = await parseExcel(file.path);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file format. Please upload CSV or Excel file.'
      });
    }

    // Validate records
    const validatedRecords = await validateRecords(records, school_id, branch_id, device_type);

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json({
      success: true,
      message: 'File parsed successfully',
      data: validatedRecords,
      summary: {
        total: validatedRecords.length,
        valid: validatedRecords.filter(r => r.status === 'valid').length,
        invalid: validatedRecords.filter(r => r.status === 'invalid').length
      }
    });
  } catch (error) {
    console.error('Preview import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview import',
      error: error.message
    });
  }
};

/**
 * Import attendance records
 */
exports.importAttendance = async (req, res) => {
  try {
    const { records, device_type, school_id, branch_id } = req.body;
    const user_id = req.user?.id || req.body.user_id;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records to import'
      });
    }

    // Filter only valid records
    const validRecords = records.filter(r => r.status === 'valid');

    if (validRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid records to import'
      });
    }

    let successful = 0;
    let failed = 0;
    const errors = [];

    // Import records
    for (const record of validRecords) {
      try {
        // Get staff_id from staff table
        const [staff] = await db.sequelize.query(
          `SELECT staff_id FROM staff WHERE staff_id = :staff_id AND school_id = :school_id`,
          {
            replacements: {
              staff_id: record.staff_id,
              school_id
            },
            type: db.sequelize.QueryTypes.SELECT
          }
        );

        if (!staff) {
          failed++;
          errors.push({
            staff_id: record.staff_id,
            error: 'Staff not found'
          });
          continue;
        }

        // Check if attendance already exists
        const [existing] = await db.sequelize.query(
          `SELECT id FROM staff_attendance 
           WHERE staff_id = :staff_id 
             AND DATE(date) = :date 
             AND school_id = :school_id`,
          {
            replacements: {
              staff_id: record.staff_id,
              date: record.date,
              school_id
            },
            type: db.sequelize.QueryTypes.SELECT
          }
        );

        if (existing) {
          // Update existing record
          await db.sequelize.query(
            `UPDATE staff_attendance 
             SET check_in_time = :check_in_time,
                 check_out_time = :check_out_time,
                 method = :method,
                 device_id = :device_id,
                 updated_at = NOW()
             WHERE id = :id`,
            {
              replacements: {
                id: existing.id,
                check_in_time: record.check_in_time,
                check_out_time: record.check_out_time || null,
                method: device_type,
                device_id: record.device_id
              }
            }
          );
        } else {
          // Insert new record
          await db.sequelize.query(
            `INSERT INTO staff_attendance 
             (staff_id, user_id, school_id, branch_id, date, check_in_time, check_out_time, method, device_id, status, created_at)
             VALUES (:staff_id, :user_id, :school_id, :branch_id, :date, :check_in_time, :check_out_time, :method, :device_id, 'Present', NOW())`,
            {
              replacements: {
                staff_id: record.staff_id,
                user_id: user_id || null,
                school_id,
                branch_id: branch_id || null,
                date: record.date,
                check_in_time: record.check_in_time,
                check_out_time: record.check_out_time || null,
                method: device_type,
                device_id: record.device_id
              }
            }
          );
        }

        successful++;
      } catch (error) {
        console.error('Error importing record:', error);
        failed++;
        errors.push({
          staff_id: record.staff_id,
          error: error.message
        });
      }
    }

    // Log import history
    await db.sequelize.query(
      `INSERT INTO biometric_import_history 
       (school_id, branch_id, file_name, device_type, total_records, successful, failed, imported_by, status, created_at)
       VALUES (:school_id, :branch_id, :file_name, :device_type, :total_records, :successful, :failed, :imported_by, :status, NOW())`,
      {
        replacements: {
          school_id,
          branch_id: branch_id || null,
          file_name: 'biometric_import',
          device_type,
          total_records: validRecords.length,
          successful,
          failed,
          imported_by: user_id || 'system',
          status: failed === 0 ? 'completed' : 'partial'
        }
      }
    );

    res.json({
      success: true,
      message: `Import completed. ${successful} records imported successfully, ${failed} failed.`,
      data: {
        total: validRecords.length,
        successful,
        failed,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Import attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import attendance',
      error: error.message
    });
  }
};

/**
 * Get import history
 */
exports.getImportHistory = async (req, res) => {
  try {
    const { school_id, branch_id } = req.query;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'school_id is required'
      });
    }

    const history = await db.sequelize.query(
      `SELECT * FROM biometric_import_history 
       WHERE school_id = :school_id 
         ${branch_id ? 'AND branch_id = :branch_id' : ''}
       ORDER BY created_at DESC
       LIMIT 50`,
      {
        replacements: { school_id, branch_id },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get import history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch import history',
      error: error.message
    });
  }
};

/**
 * Parse CSV file
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        records.push({
          staff_id: row['Staff ID'] || row['staff_id'],
          staff_name: row['Staff Name'] || row['staff_name'],
          date: row['Date'] || row['date'],
          check_in_time: row['Check In Time'] || row['check_in_time'],
          check_out_time: row['Check Out Time'] || row['check_out_time'],
          device_id: row['Device ID'] || row['device_id'] || 'UNKNOWN'
        });
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

/**
 * Parse Excel file
 */
async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  return data.map(row => ({
    staff_id: row['Staff ID'] || row['staff_id'],
    staff_name: row['Staff Name'] || row['staff_name'],
    date: row['Date'] || row['date'],
    check_in_time: row['Check In Time'] || row['check_in_time'],
    check_out_time: row['Check Out Time'] || row['check_out_time'],
    device_id: row['Device ID'] || row['device_id'] || 'UNKNOWN'
  }));
}

/**
 * Validate records
 */
async function validateRecords(records, school_id, branch_id, device_type) {
  const validated = [];

  for (const record of records) {
    let status = 'valid';
    let errors = [];

    // Validate required fields
    if (!record.staff_id) {
      status = 'invalid';
      errors.push('Missing staff ID');
    }

    if (!record.date) {
      status = 'invalid';
      errors.push('Missing date');
    }

    if (!record.check_in_time) {
      status = 'invalid';
      errors.push('Missing check-in time');
    }

    // Validate date format
    if (record.date && !isValidDate(record.date)) {
      status = 'invalid';
      errors.push('Invalid date format');
    }

    // Validate time format
    if (record.check_in_time && !isValidTime(record.check_in_time)) {
      status = 'invalid';
      errors.push('Invalid check-in time format');
    }

    if (record.check_out_time && !isValidTime(record.check_out_time)) {
      status = 'invalid';
      errors.push('Invalid check-out time format');
    }

    // Check if staff exists
    if (record.staff_id) {
      const [staff] = await db.sequelize.query(
        `SELECT staff_id FROM staff WHERE staff_id = :staff_id AND school_id = :school_id`,
        {
          replacements: { staff_id: record.staff_id, school_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      if (!staff) {
        status = 'invalid';
        errors.push('Staff not found in system');
      }
    }

    validated.push({
      ...record,
      device_type,
      status,
      errors: errors.length > 0 ? errors.join(', ') : undefined
    });
  }

  return validated;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Validate time format (HH:MM:SS or HH:MM)
 */
function isValidTime(timeString) {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  return regex.test(timeString);
}

module.exports = exports;
