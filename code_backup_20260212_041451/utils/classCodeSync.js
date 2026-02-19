/**
 * Class Code Synchronization Utilities
 * 
 * Utilities to keep current_class and class_code in sync during the transition period
 */

const db = require('../models');

/**
 * Sync class_code with current_class for a single student
 * @param {string} admissionNo - Student admission number
 * @param {string} newClassCode - New class code to set
 * @returns {Promise<boolean>} - Success status
 */
async function syncStudentClassCode(admissionNo, newClassCode) {
  try {
    const student = await db.Student.findOne({
      where: { admission_no: admissionNo }
    });
    
    if (!student) {
      throw new Error(`Student with admission_no ${admissionNo} not found`);
    }
    
    // Update both fields to keep them in sync
    await student.update({
      current_class: newClassCode,
      class_code: newClassCode
    });
    
    console.log(`✅ Synced class code for student ${admissionNo}: ${newClassCode}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to sync class code for student ${admissionNo}:`, error.message);
    return false;
  }
}

/**
 * Bulk sync class codes for multiple students
 * @param {Array} updates - Array of {admissionNo, classCode} objects
 * @returns {Promise<Object>} - Results summary
 */
async function bulkSyncClassCodes(updates) {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (const update of updates) {
    try {
      const success = await syncStudentClassCode(update.admissionNo, update.classCode);
      if (success) {
        results.successful++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        admissionNo: update.admissionNo,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Ensure a student object has both current_class and class_code in sync
 * @param {Object} studentData - Student data object
 * @returns {Object} - Student data with synced class fields
 */
function ensureClassCodeSync(studentData) {
  const synced = { ...studentData };
  
  // If current_class is provided but class_code is not, sync it
  if (synced.current_class && !synced.class_code) {
    synced.class_code = synced.current_class;
  }
  
  // If class_code is provided but current_class is not, sync it
  if (synced.class_code && !synced.current_class) {
    synced.current_class = synced.class_code;
  }
  
  return synced;
}

/**
 * Check sync status for all students
 * @returns {Promise<Object>} - Sync status report
 */
async function checkSyncStatus() {
  try {
    const [results] = await db.sequelize.query(`
      SELECT 
        COUNT(*) as total_students,
        COUNT(CASE WHEN current_class = class_code THEN 1 END) as synced_records,
        COUNT(CASE WHEN current_class != class_code THEN 1 END) as out_of_sync,
        COUNT(CASE WHEN current_class IS NULL AND class_code IS NOT NULL THEN 1 END) as missing_current_class,
        COUNT(CASE WHEN current_class IS NOT NULL AND class_code IS NULL THEN 1 END) as missing_class_code
      FROM students
    `);
    
    return results[0];
  } catch (error) {
    console.error('❌ Failed to check sync status:', error.message);
    throw error;
  }
}

/**
 * Get out of sync records
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Array of out of sync student records
 */
async function getOutOfSyncRecords(limit = 10) {
  try {
    const [results] = await db.sequelize.query(`
      SELECT 
        admission_no,
        class_name,
        current_class,
        class_code,
        'OUT_OF_SYNC' as status
      FROM students 
      WHERE current_class != class_code 
         OR (current_class IS NULL AND class_code IS NOT NULL)
         OR (current_class IS NOT NULL AND class_code IS NULL)
      LIMIT :limit
    `, {
      replacements: { limit },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    return results;
  } catch (error) {
    console.error('❌ Failed to get out of sync records:', error.message);
    throw error;
  }
}

/**
 * Fix all out of sync records (current_class takes precedence)
 * @returns {Promise<Object>} - Fix results
 */
async function fixAllOutOfSync() {
  try {
    const outOfSyncRecords = await getOutOfSyncRecords(1000); // Get up to 1000 records
    
    if (outOfSyncRecords.length === 0) {
      return { message: 'All records are already in sync', fixed: 0 };
    }
    
    const updates = outOfSyncRecords.map(record => ({
      admissionNo: record.admission_no,
      classCode: record.current_class || record.class_code // Prefer current_class
    }));
    
    const results = await bulkSyncClassCodes(updates);
    
    return {
      message: `Fixed ${results.successful} out of ${outOfSyncRecords.length} records`,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors
    };
  } catch (error) {
    console.error('❌ Failed to fix out of sync records:', error.message);
    throw error;
  }
}

/**
 * Middleware to ensure class code sync in API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function ensureClassCodeSyncMiddleware(req, res, next) {
  // If request body contains student data, ensure sync
  if (req.body && (req.body.current_class || req.body.class_code)) {
    req.body = ensureClassCodeSync(req.body);
  }
  
  // If request body contains an array of students, ensure sync for each
  if (req.body && Array.isArray(req.body.students)) {
    req.body.students = req.body.students.map(ensureClassCodeSync);
  }
  
  next();
}

module.exports = {
  syncStudentClassCode,
  bulkSyncClassCodes,
  ensureClassCodeSync,
  checkSyncStatus,
  getOutOfSyncRecords,
  fixAllOutOfSync,
  ensureClassCodeSyncMiddleware
};