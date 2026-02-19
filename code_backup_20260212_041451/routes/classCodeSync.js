/**
 * Class Code Synchronization Routes
 * 
 * API endpoints for monitoring and managing class code synchronization
 */

const express = require('express');
const router = express.Router();
const { 
  checkSyncStatus, 
  getOutOfSyncRecords, 
  fixAllOutOfSync,
  syncStudentClassCode 
} = require('../utils/classCodeSync');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/class-code-sync/status
 * Check the synchronization status between current_class and class_code
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await checkSyncStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        sync_percentage: status.total_students > 0 
          ? Math.round((status.synced_records / status.total_students) * 100) 
          : 100,
        is_fully_synced: status.out_of_sync === 0
      }
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check sync status',
      error: error.message
    });
  }
});

/**
 * GET /api/class-code-sync/out-of-sync
 * Get records that are out of sync
 */
router.get('/out-of-sync', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const records = await getOutOfSyncRecords(limit);
    
    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('Error getting out of sync records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get out of sync records',
      error: error.message
    });
  }
});

/**
 * POST /api/class-code-sync/fix-all
 * Fix all out of sync records
 */
router.post('/fix-all', authenticate, async (req, res) => {
  try {
    const results = await fixAllOutOfSync();
    
    res.json({
      success: true,
      message: results.message,
      data: {
        successful: results.successful,
        failed: results.failed,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('Error fixing out of sync records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix out of sync records',
      error: error.message
    });
  }
});

/**
 * POST /api/class-code-sync/sync-student
 * Sync class code for a specific student
 */
router.post('/sync-student', authenticate, async (req, res) => {
  try {
    const { admission_no, class_code } = req.body;
    
    if (!admission_no || !class_code) {
      return res.status(400).json({
        success: false,
        message: 'admission_no and class_code are required'
      });
    }
    
    const success = await syncStudentClassCode(admission_no, class_code);
    
    if (success) {
      res.json({
        success: true,
        message: `Successfully synced class code for student ${admission_no}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to sync class code for student ${admission_no}`
      });
    }
  } catch (error) {
    console.error('Error syncing student class code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync student class code',
      error: error.message
    });
  }
});

/**
 * GET /api/class-code-sync/health
 * Health check endpoint for sync system
 */
router.get('/health', authenticate, async (req, res) => {
  try {
    const status = await checkSyncStatus();
    const isHealthy = status.out_of_sync === 0;
    
    res.status(isHealthy ? 200 : 206).json({
      success: true,
      healthy: isHealthy,
      data: {
        total_students: status.total_students,
        synced_records: status.synced_records,
        out_of_sync: status.out_of_sync,
        sync_percentage: status.total_students > 0 
          ? Math.round((status.synced_records / status.total_students) * 100) 
          : 100
      },
      message: isHealthy 
        ? 'All records are in sync' 
        : `${status.out_of_sync} records are out of sync`
    });
  } catch (error) {
    console.error('Error checking sync health:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      message: 'Failed to check sync health',
      error: error.message
    });
  }
});

module.exports = router;