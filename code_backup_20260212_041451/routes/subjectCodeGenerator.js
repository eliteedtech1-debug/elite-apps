/**
 * Subject Code Generator Management Routes
 * Provides endpoints for monitoring and configuring the resilient code generator
 */

const passport = require("passport");
const db = require("../models");

module.exports = (app) => {
  /**
   * GET /api/subject-code-generator/health
   * Health check for the subject code generator
   */
  app.get(
    "/api/subject-code-generator/health",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const healthCheck = await db.Subject.checkCodeGeneratorHealth();
        
        res.json({
          success: true,
          data: healthCheck,
          message: healthCheck.healthy ? "Code generator is healthy" : "Code generator has issues"
        });
      } catch (error) {
        console.error("Health check failed:", error);
        res.status(500).json({
          success: false,
          message: "Health check failed",
          error: error.message
        });
      }
    }
  );

  /**
   * GET /api/subject-code-generator/config
   * Get current configuration
   */
  app.get(
    "/api/subject-code-generator/config",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const config = db.Subject.getCodeGeneratorConfig();
        
        res.json({
          success: true,
          data: config,
          message: "Configuration retrieved successfully"
        });
      } catch (error) {
        console.error("Failed to get configuration:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get configuration",
          error: error.message
        });
      }
    }
  );

  /**
   * PUT /api/subject-code-generator/config
   * Update configuration (Admin only)
   */
  app.put(
    "/api/subject-code-generator/config",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        // Check if user is admin
        if (req.user.user_type !== 'Admin' && req.user.user_type !== 'SuperAdmin') {
          return res.status(403).json({
            success: false,
            message: "Only administrators can modify code generator configuration"
          });
        }

        const {
          enableCustomGenerator,
          enableTimestampFallback,
          enableHashFallback,
          enableUUIDFallback,
          maxRetries,
          logFallbacks
        } = req.body;

        const newConfig = {};
        if (enableCustomGenerator !== undefined) newConfig.enableCustomGenerator = enableCustomGenerator;
        if (enableTimestampFallback !== undefined) newConfig.enableTimestampFallback = enableTimestampFallback;
        if (enableHashFallback !== undefined) newConfig.enableHashFallback = enableHashFallback;
        if (enableUUIDFallback !== undefined) newConfig.enableUUIDFallback = enableUUIDFallback;
        if (maxRetries !== undefined) newConfig.maxRetries = maxRetries;
        if (logFallbacks !== undefined) newConfig.logFallbacks = logFallbacks;

        db.Subject.configureCodeGenerator(newConfig);
        const updatedConfig = db.Subject.getCodeGeneratorConfig();

        console.log(`📝 Code generator configuration updated by ${req.user.id}:`, newConfig);

        res.json({
          success: true,
          data: updatedConfig,
          message: "Configuration updated successfully"
        });
      } catch (error) {
        console.error("Failed to update configuration:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update configuration",
          error: error.message
        });
      }
    }
  );

  /**
   * POST /api/subject-code-generator/test
   * Test code generation with different strategies
   */
  app.post(
    "/api/subject-code-generator/test",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          school_id = req.user.school_id,
          branch_id = req.user.branch_id,
          subject_name = 'TEST_SUBJECT',
          section = 'TEST_SECTION'
        } = req.body;

        const testResults = [];
        
        // Test multiple code generations
        for (let i = 0; i < 3; i++) {
          try {
            const startTime = Date.now();
            const code = await db.Subject.generateSubjectCode(school_id, branch_id, `${subject_name}_${i}`, section);
            const endTime = Date.now();
            
            testResults.push({
              attempt: i + 1,
              success: true,
              code: code,
              generation_time_ms: endTime - startTime
            });
          } catch (error) {
            testResults.push({
              attempt: i + 1,
              success: false,
              error: error.message
            });
          }
        }

        const successCount = testResults.filter(r => r.success).length;
        const avgTime = testResults
          .filter(r => r.success)
          .reduce((sum, r) => sum + r.generation_time_ms, 0) / successCount;

        res.json({
          success: true,
          data: {
            test_results: testResults,
            summary: {
              total_attempts: testResults.length,
              successful: successCount,
              failed: testResults.length - successCount,
              average_generation_time_ms: avgTime || 0,
              success_rate: (successCount / testResults.length) * 100
            }
          },
          message: "Code generation test completed"
        });
      } catch (error) {
        console.error("Test failed:", error);
        res.status(500).json({
          success: false,
          message: "Test failed",
          error: error.message
        });
      }
    }
  );

  /**
   * POST /api/subject-code-generator/emergency-disable
   * Emergency disable custom generator (Admin only)
   */
  app.post(
    "/api/subject-code-generator/emergency-disable",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        // Check if user is admin
        if (req.user.user_type !== 'Admin' && req.user.user_type !== 'SuperAdmin') {
          return res.status(403).json({
            success: false,
            message: "Only administrators can perform emergency operations"
          });
        }

        // Disable custom generator and enable all fallbacks
        db.Subject.configureCodeGenerator({
          enableCustomGenerator: false,
          enableTimestampFallback: true,
          enableHashFallback: true,
          enableUUIDFallback: true,
          logFallbacks: true
        });

        console.log(`🚨 EMERGENCY: Custom generator disabled by ${req.user.id}`);

        res.json({
          success: true,
          message: "Custom generator disabled. All fallback strategies enabled.",
          data: db.Subject.getCodeGeneratorConfig()
        });
      } catch (error) {
        console.error("Emergency disable failed:", error);
        res.status(500).json({
          success: false,
          message: "Emergency disable failed",
          error: error.message
        });
      }
    }
  );
};