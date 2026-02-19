const passport = require("passport");
const {
  runDuplicateCleanup,
  getCleanupStatus,
  getDuplicateAnalysis
} = require("../controllers/duplicateCleanupController");

/**
 * Routes for Duplicate Cleanup Management
 * 
 * These routes provide endpoints for managing duplicate payment and journal entries
 */

module.exports = (app) => {
  
  // Run duplicate cleanup (manual trigger)
  app.post(
    "/api/duplicate-cleanup/run",
    passport.authenticate("jwt", { session: false }),
    runDuplicateCleanup
  );

  // Get cleanup status and history
  app.get(
    "/api/duplicate-cleanup/status",
    passport.authenticate("jwt", { session: false }),
    getCleanupStatus
  );

  // Get detailed duplicate analysis
  app.get(
    "/api/duplicate-cleanup/analysis",
    passport.authenticate("jwt", { session: false }),
    getDuplicateAnalysis
  );

  // Health check for cleanup system
  app.get(
    "/api/duplicate-cleanup/health",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const db = require("../models");
        
        // Check if cleanup procedures exist
        const [procedures] = await db.sequelize.query(
          `SHOW PROCEDURE STATUS WHERE Name IN (
            'run_duplicate_cleanup',
            'cleanup_payment_duplicates', 
            'cleanup_journal_duplicates'
          )`,
          {
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );

        // Check if cleanup tables exist
        const [tables] = await db.sequelize.query(
          `SHOW TABLES LIKE 'duplicate_cleanup%'`,
          {
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );

        const health = {
          procedures_available: procedures.length >= 3,
          tables_available: tables.length >= 2,
          procedures_found: procedures.map(p => p.Name),
          tables_found: tables.map(t => Object.values(t)[0]),
          system_ready: procedures.length >= 3 && tables.length >= 2
        };

        res.status(200).json({
          success: true,
          data: health,
          message: health.system_ready 
            ? "Duplicate cleanup system is ready"
            : "Duplicate cleanup system needs setup"
        });

      } catch (error) {
        console.error("Error in cleanup health check:", error);
        res.status(500).json({
          success: false,
          message: "Failed to check cleanup system health",
          error: error.message
        });
      }
    }
  );

  // Get cleanup configuration
  app.get(
    "/api/duplicate-cleanup/config",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const config = {
        default_batch_size: 100,
        max_batch_size: 1000,
        scheduled_cleanup: {
          dry_run_schedule: "Daily at 2:00 AM",
          actual_cleanup_schedule: "Weekly on Sunday at 3:00 AM"
        },
        safety_features: [
          "Dry run mode available",
          "Preserves oldest entry as proof",
          "Comprehensive logging",
          "Batch processing",
          "Transaction safety"
        ],
        supported_filters: [
          "school_id",
          "branch_id", 
          "academic_year"
        ]
      };

      res.status(200).json({
        success: true,
        data: config,
        message: "Cleanup configuration retrieved successfully"
      });
    }
  );

};