const db = require("../models");
const cron = require('node-cron');

/**
 * Duplicate Cleanup Controller
 * 
 * This controller manages the cleanup of duplicate payment and journal entries
 * while preserving one copy as proof. It includes both manual and scheduled cleanup.
 */

/**
 * Run duplicate cleanup (manual trigger)
 */
const runDuplicateCleanup = async (req, res) => {
  try {
    const {
      dry_run = true,
      batch_size = 100,
      school_id,
      branch_id,
      academic_year
    } = req.body;

    const { user } = req;
    
    console.log("Starting duplicate cleanup:", {
      dry_run,
      batch_size,
      school_id: school_id || user?.school_id,
      branch_id: branch_id || user?.branch_id,
      academic_year,
      triggered_by: user?.user_id || 'SYSTEM'
    });

    // Run the cleanup procedure
    const [result] = await db.sequelize.query(
      `CALL run_duplicate_cleanup(
        :dry_run,
        :batch_size,
        :school_id,
        :branch_id,
        :academic_year
      )`,
      {
        replacements: {
          dry_run: dry_run ? 1 : 0,
          batch_size: parseInt(batch_size),
          school_id: school_id || user?.school_id || null,
          branch_id: branch_id || user?.branch_id || null,
          academic_year: academic_year || null
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    const summary = result[0];
    
    res.status(200).json({
      success: true,
      data: summary,
      message: dry_run 
        ? "Dry run completed - no actual deletions performed"
        : "Duplicate cleanup completed successfully"
    });

  } catch (error) {
    console.error("Error in runDuplicateCleanup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run duplicate cleanup",
      error: error.message
    });
  }
};

/**
 * Get duplicate cleanup status and history
 */
const getCleanupStatus = async (req, res) => {
  try {
    const {
      limit = 10,
      school_id,
      branch_id,
      academic_year
    } = req.query;

    const { user } = req;

    // Get recent cleanup operations
    const [cleanupHistory] = await db.sequelize.query(
      `SELECT 
         id,
         operation_type,
         dry_run,
         batch_size,
         school_id,
         branch_id,
         academic_year,
         status,
         started_at,
         completed_at,
         payment_duplicates_found,
         payment_duplicates_removed,
         journal_duplicates_found,
         journal_duplicates_removed,
         TIMESTAMPDIFF(SECOND, started_at, COALESCE(completed_at, NOW())) as duration_seconds
       FROM duplicate_cleanup_log
       WHERE 1=1
         ${school_id || user?.school_id ? 'AND (school_id IS NULL OR school_id = :school_id)' : ''}
         ${branch_id || user?.branch_id ? 'AND (branch_id IS NULL OR branch_id = :branch_id)' : ''}
         ${academic_year ? 'AND (academic_year IS NULL OR academic_year = :academic_year)' : ''}
       ORDER BY started_at DESC
       LIMIT :limit`,
      {
        replacements: {
          school_id: school_id || user?.school_id,
          branch_id: branch_id || user?.branch_id,
          academic_year: academic_year || null,
          limit: parseInt(limit)
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    // Get current duplicate counts
    const [currentDuplicates] = await db.sequelize.query(
      `SELECT 
         'payment_duplicates' as type,
         COUNT(*) as duplicate_groups,
         SUM(duplicate_count - 1) as total_duplicates
       FROM (
         SELECT 
           ref_no, class_code, term, academic_year, description, admission_no,
           COUNT(*) as duplicate_count
         FROM payment_entries
         WHERE 1=1
           ${school_id || user?.school_id ? 'AND school_id = :school_id' : ''}
           ${branch_id || user?.branch_id ? 'AND branch_id = :branch_id' : ''}
           ${academic_year ? 'AND academic_year = :academic_year' : ''}
           AND ref_no IS NOT NULL AND ref_no != ''
         GROUP BY ref_no, class_code, term, academic_year, description, admission_no
         HAVING COUNT(*) > 1
       ) as duplicates
       
       UNION ALL
       
       SELECT 
         'journal_duplicates' as type,
         COUNT(*) as duplicate_groups,
         SUM(duplicate_count - 1) as total_duplicates
       FROM (
         SELECT 
           je.payment_entry_id, je.account_code, je.description,
           COUNT(*) as duplicate_count
         FROM journal_entries je
         JOIN payment_entries pe ON je.payment_entry_id = pe.item_id
         WHERE 1=1
           ${school_id || user?.school_id ? 'AND pe.school_id = :school_id' : ''}
           ${branch_id || user?.branch_id ? 'AND pe.branch_id = :branch_id' : ''}
           ${academic_year ? 'AND pe.academic_year = :academic_year' : ''}
           AND je.payment_entry_id IS NOT NULL
         GROUP BY je.payment_entry_id, je.account_code, je.description
         HAVING COUNT(*) > 1
       ) as journal_duplicates`,
      {
        replacements: {
          school_id: school_id || user?.school_id,
          branch_id: branch_id || user?.branch_id,
          academic_year: academic_year || null
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    // Process current duplicates data
    const duplicateStats = {
      payment_duplicates: 0,
      payment_duplicate_groups: 0,
      journal_duplicates: 0,
      journal_duplicate_groups: 0
    };

    currentDuplicates.forEach(row => {
      if (row.type === 'payment_duplicates') {
        duplicateStats.payment_duplicates = row.total_duplicates || 0;
        duplicateStats.payment_duplicate_groups = row.duplicate_groups || 0;
      } else if (row.type === 'journal_duplicates') {
        duplicateStats.journal_duplicates = row.total_duplicates || 0;
        duplicateStats.journal_duplicate_groups = row.duplicate_groups || 0;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        current_duplicates: duplicateStats,
        cleanup_history: cleanupHistory,
        recommendations: generateCleanupRecommendations(duplicateStats, cleanupHistory)
      },
      message: "Cleanup status retrieved successfully"
    });

  } catch (error) {
    console.error("Error in getCleanupStatus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get cleanup status",
      error: error.message
    });
  }
};

/**
 * Get detailed duplicate analysis
 */
const getDuplicateAnalysis = async (req, res) => {
  try {
    const {
      analysis_type = 'summary', // 'summary', 'detailed', 'by_class', 'by_term'
      school_id,
      branch_id,
      academic_year,
      limit = 50
    } = req.query;

    const { user } = req;

    let query = '';
    let replacements = {
      school_id: school_id || user?.school_id,
      branch_id: branch_id || user?.branch_id,
      academic_year: academic_year || null,
      limit: parseInt(limit)
    };

    switch (analysis_type) {
      case 'detailed':
        query = `
          SELECT 
            ref_no,
            class_code,
            term,
            academic_year,
            description,
            admission_no,
            COUNT(*) as duplicate_count,
            MIN(item_id) as oldest_item_id,
            MAX(item_id) as newest_item_id,
            SUM(cr) as total_amount,
            MIN(created_at) as first_created,
            MAX(created_at) as last_created
          FROM payment_entries
          WHERE 1=1
            ${school_id || user?.school_id ? 'AND school_id = :school_id' : ''}
            ${branch_id || user?.branch_id ? 'AND branch_id = :branch_id' : ''}
            ${academic_year ? 'AND academic_year = :academic_year' : ''}
            AND ref_no IS NOT NULL AND ref_no != ''
          GROUP BY ref_no, class_code, term, academic_year, description, admission_no
          HAVING COUNT(*) > 1
          ORDER BY duplicate_count DESC, ref_no
          LIMIT :limit
        `;
        break;

      case 'by_class':
        query = `
          SELECT 
            class_code,
            COUNT(DISTINCT CONCAT(ref_no, '|', description, '|', admission_no)) as duplicate_groups,
            SUM(duplicate_count - 1) as total_duplicates,
            SUM(total_amount) as total_duplicate_amount
          FROM (
            SELECT 
              class_code,
              ref_no,
              description,
              admission_no,
              COUNT(*) as duplicate_count,
              SUM(cr) as total_amount
            FROM payment_entries
            WHERE 1=1
              ${school_id || user?.school_id ? 'AND school_id = :school_id' : ''}
              ${branch_id || user?.branch_id ? 'AND branch_id = :branch_id' : ''}
              ${academic_year ? 'AND academic_year = :academic_year' : ''}
              AND ref_no IS NOT NULL AND ref_no != ''
            GROUP BY class_code, ref_no, description, admission_no
            HAVING COUNT(*) > 1
          ) as class_duplicates
          GROUP BY class_code
          ORDER BY total_duplicates DESC
          LIMIT :limit
        `;
        break;

      case 'by_term':
        query = `
          SELECT 
            term,
            academic_year,
            COUNT(DISTINCT CONCAT(ref_no, '|', description, '|', admission_no)) as duplicate_groups,
            SUM(duplicate_count - 1) as total_duplicates,
            SUM(total_amount) as total_duplicate_amount
          FROM (
            SELECT 
              term,
              academic_year,
              ref_no,
              description,
              admission_no,
              COUNT(*) as duplicate_count,
              SUM(cr) as total_amount
            FROM payment_entries
            WHERE 1=1
              ${school_id || user?.school_id ? 'AND school_id = :school_id' : ''}
              ${branch_id || user?.branch_id ? 'AND branch_id = :branch_id' : ''}
              ${academic_year ? 'AND academic_year = :academic_year' : ''}
              AND ref_no IS NOT NULL AND ref_no != ''
            GROUP BY term, academic_year, ref_no, description, admission_no
            HAVING COUNT(*) > 1
          ) as term_duplicates
          GROUP BY term, academic_year
          ORDER BY total_duplicates DESC
          LIMIT :limit
        `;
        break;

      default: // summary
        query = `
          SELECT 
            'Payment Entries' as category,
            COUNT(*) as duplicate_groups,
            SUM(duplicate_count - 1) as total_duplicates,
            SUM(total_amount) as total_duplicate_amount,
            AVG(duplicate_count) as avg_duplicates_per_group,
            MAX(duplicate_count) as max_duplicates_in_group
          FROM (
            SELECT 
              COUNT(*) as duplicate_count,
              SUM(cr) as total_amount
            FROM payment_entries
            WHERE 1=1
              ${school_id || user?.school_id ? 'AND school_id = :school_id' : ''}
              ${branch_id || user?.branch_id ? 'AND branch_id = :branch_id' : ''}
              ${academic_year ? 'AND academic_year = :academic_year' : ''}
              AND ref_no IS NOT NULL AND ref_no != ''
            GROUP BY ref_no, class_code, term, academic_year, description, admission_no
            HAVING COUNT(*) > 1
          ) as payment_summary
          
          UNION ALL
          
          SELECT 
            'Journal Entries' as category,
            COUNT(*) as duplicate_groups,
            SUM(duplicate_count - 1) as total_duplicates,
            SUM(total_credit) as total_duplicate_amount,
            AVG(duplicate_count) as avg_duplicates_per_group,
            MAX(duplicate_count) as max_duplicates_in_group
          FROM (
            SELECT 
              COUNT(*) as duplicate_count,
              SUM(credit) as total_credit
            FROM journal_entries je
            JOIN payment_entries pe ON je.payment_entry_id = pe.item_id
            WHERE 1=1
              ${school_id || user?.school_id ? 'AND pe.school_id = :school_id' : ''}
              ${branch_id || user?.branch_id ? 'AND pe.branch_id = :branch_id' : ''}
              ${academic_year ? 'AND pe.academic_year = :academic_year' : ''}
              AND je.payment_entry_id IS NOT NULL
            GROUP BY je.payment_entry_id, je.account_code, je.description
            HAVING COUNT(*) > 1
          ) as journal_summary
        `;
        break;
    }

    const [analysisResult] = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT,
    });

    res.status(200).json({
      success: true,
      data: {
        analysis_type,
        results: analysisResult,
        filters: {
          school_id: school_id || user?.school_id,
          branch_id: branch_id || user?.branch_id,
          academic_year: academic_year || 'All'
        }
      },
      message: `Duplicate analysis (${analysis_type}) completed successfully`
    });

  } catch (error) {
    console.error("Error in getDuplicateAnalysis:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get duplicate analysis",
      error: error.message
    });
  }
};

/**
 * Schedule periodic duplicate cleanup
 */
const schedulePeriodicCleanup = () => {
  // Run cleanup every day at 2 AM (dry run)
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running scheduled duplicate cleanup (dry run)...');
    
    try {
      await runScheduledCleanup(true); // dry_run = true
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
    }
  });

  // Run actual cleanup every Sunday at 3 AM
  cron.schedule('0 3 * * 0', async () => {
    console.log('🧹 Running scheduled duplicate cleanup (actual cleanup)...');
    
    try {
      await runScheduledCleanup(false); // dry_run = false
    } catch (error) {
      console.error('❌ Scheduled actual cleanup failed:', error);
    }
  });

  console.log('✅ Duplicate cleanup scheduler initialized');
  console.log('   - Daily dry run: Every day at 2:00 AM');
  console.log('   - Weekly cleanup: Every Sunday at 3:00 AM');
};

/**
 * Internal function for scheduled cleanup
 */
const runScheduledCleanup = async (dry_run = true) => {
  try {
    const [result] = await db.sequelize.query(
      `CALL run_duplicate_cleanup(:dry_run, 500, NULL, NULL, NULL)`,
      {
        replacements: {
          dry_run: dry_run ? 1 : 0
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    const summary = result[0];
    
    console.log(`✅ Scheduled cleanup completed (${dry_run ? 'dry run' : 'actual'}):`, {
      payment_duplicates_found: summary.payment_duplicates_found,
      payment_duplicates_removed: summary.payment_duplicates_removed,
      journal_duplicates_found: summary.journal_duplicates_found,
      journal_duplicates_removed: summary.journal_duplicates_removed,
      message: summary.message
    });

    return summary;

  } catch (error) {
    console.error('❌ Scheduled cleanup error:', error);
    throw error;
  }
};

/**
 * Generate cleanup recommendations based on current state
 */
const generateCleanupRecommendations = (duplicateStats, cleanupHistory) => {
  const recommendations = [];
  
  const totalDuplicates = duplicateStats.payment_duplicates + duplicateStats.journal_duplicates;
  const lastCleanup = cleanupHistory[0];
  
  if (totalDuplicates === 0) {
    recommendations.push({
      type: 'success',
      message: 'No duplicates found - system is clean',
      action: 'none'
    });
  } else if (totalDuplicates < 10) {
    recommendations.push({
      type: 'info',
      message: `${totalDuplicates} duplicates found - low priority cleanup`,
      action: 'schedule_cleanup'
    });
  } else if (totalDuplicates < 100) {
    recommendations.push({
      type: 'warning',
      message: `${totalDuplicates} duplicates found - recommended cleanup`,
      action: 'run_cleanup_soon'
    });
  } else {
    recommendations.push({
      type: 'error',
      message: `${totalDuplicates} duplicates found - urgent cleanup needed`,
      action: 'run_cleanup_immediately'
    });
  }

  if (!lastCleanup) {
    recommendations.push({
      type: 'info',
      message: 'No previous cleanup history - consider running a dry run first',
      action: 'run_dry_run'
    });
  } else if (lastCleanup.dry_run) {
    recommendations.push({
      type: 'info',
      message: 'Last operation was a dry run - consider running actual cleanup',
      action: 'run_actual_cleanup'
    });
  }

  return recommendations;
};

module.exports = {
  runDuplicateCleanup,
  getCleanupStatus,
  getDuplicateAnalysis,
  schedulePeriodicCleanup,
  runScheduledCleanup
};