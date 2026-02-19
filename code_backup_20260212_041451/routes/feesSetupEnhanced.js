const passport = require("passport");
const {
  schoolRevenuesEnhanced,
  getSchoolRevenuesEnhanced,
  publishDraftFees,
  validateFeesSetupRequest,
  checkForExistingFeeStructures
} = require("../controllers/feesSetupEnhanced");

/**
 * Enhanced Fees Setup Routes with Independent Submit/Publish Treatment
 * 
 * Features:
 * - Independent submit (draft) and publish operations
 * - Comprehensive duplicate prevention with user-friendly responses
 * - Toast notification support for frontend integration
 * - Integration with existing school_revenues system
 */

module.exports = (app) => {
  
  // Enhanced unified fees setup endpoint
  app.post(
    "/api/fees-setup/enhanced",
    passport.authenticate("jwt", { session: false }),
    schoolRevenuesEnhanced
  );

  // Dedicated submit endpoint (draft mode)
  app.post(
    "/api/fees-setup/submit",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      console.log({schoolRevenuesEnhanced:req.body});
      
      // Ensure all operations are set to submit mode
      const operations = Array.isArray(req.body) ? req.body : [req.body];
      const submitOperations = operations.map(op => ({
        ...op,
        operation_type: "submit"
      }));
      
      req.body = submitOperations;
      return schoolRevenuesEnhanced(req, res);
    }
  );

  // Dedicated publish endpoint (final publication)
  app.post(
    "/api/fees-setup/publish",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      // Ensure all operations are set to publish mode
      const operations = Array.isArray(req.body) ? req.body : [req.body];
      const publishOperations = operations.map(op => ({
        ...op,
        operation_type: "publish"
      }));
      
      req.body = publishOperations;
      return schoolRevenuesEnhanced(req, res);
    }
  );

  // Publish draft fees endpoint
  app.post(
    "/api/fees-setup/publish-drafts",
    passport.authenticate("jwt", { session: false }),
    publishDraftFees
  );

  // Enhanced get fees setup with status information
  app.get(
    "/api/fees-setup/enhanced",
    passport.authenticate("jwt", { session: false }),
    getSchoolRevenuesEnhanced
  );

  // Check for existing fee structures (duplicate prevention helper)
  app.post(
    "/api/fees-setup/check-duplicates",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          description = "",
          class_code = "",
          term = "",
          academic_year = "",
          branch_id = ""
        } = req.body;

        // Validate required parameters
        if (!description || !academic_year) {
          return res.status(400).json({
            success: false,
            message: "Description and academic year are required",
            toast: {
              type: "error",
              title: "Validation Error",
              message: "Description and academic year are required",
              duration: 5000
            }
          });
        }

        // Check for duplicates
        const duplicateCheck = await checkForExistingFeeStructures({
          description,
          class_code,
          term,
          academic_year,
          school_id: req.user.school_id,
          branch_id: branch_id || req.user.branch_id
        });

        if (duplicateCheck.hasDuplicates) {
          return res.status(200).json({
            success: true,
            hasDuplicates: true,
            message: duplicateCheck.message,
            duplicateInfo: duplicateCheck.details,
            toast: {
              type: "warning",
              title: "Duplicate Detected",
              message: duplicateCheck.message,
              duration: 8000,
              actions: [
                {
                  label: "Proceed with Update",
                  action: "proceed_update",
                  style: "primary"
                },
                {
                  label: "Cancel",
                  action: "cancel",
                  style: "secondary"
                }
              ]
            }
          });
        }

        return res.status(200).json({
          success: true,
          hasDuplicates: false,
          message: "No duplicates found. Safe to proceed with publication.",
          toast: {
            type: "success",
            title: "Ready to Publish",
            message: "No existing fee structures found. You can proceed safely.",
            duration: 3000
          }
        });

      } catch (error) {
        console.error("Error in check-duplicates:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to check for duplicates",
          error: error.message,
          toast: {
            type: "error",
            title: "Check Failed",
            message: "Unable to verify duplicate status. Please try again.",
            duration: 5000
          }
        });
      }
    }
  );

  // Validate fees setup request endpoint
  app.post(
    "/api/fees-setup/validate",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          description = "",
          amount = 0,
          academic_year = "",
          operation_type = "submit"
        } = req.body;

        const validation = validateFeesSetupRequest({
          description,
          amount,
          academic_year,
          operation_type
        });

        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.message,
            toast: {
              type: "error",
              title: "Validation Failed",
              message: validation.message,
              duration: 5000
            }
          });
        }

        return res.status(200).json({
          success: true,
          message: "Validation passed successfully",
          toast: {
            type: "success",
            title: "Validation Passed",
            message: "All required parameters are valid",
            duration: 3000
          }
        });

      } catch (error) {
        console.error("Error in validate:", error);
        return res.status(500).json({
          success: false,
          message: "Validation check failed",
          error: error.message,
          toast: {
            type: "error",
            title: "Validation Error",
            message: "Unable to validate request. Please try again.",
            duration: 5000
          }
        });
      }
    }
  );

  // Get fees setup status for a specific academic year/term
  app.get(
    "/api/fees-setup/status",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          class_code = "",
          term = "",
          academic_year = ""
        } = req.query;

        if (!academic_year) {
          return res.status(400).json({
            success: false,
            message: "Academic year is required",
            toast: {
              type: "error",
              title: "Missing Parameter",
              message: "Academic year is required",
              duration: 5000
            }
          });
        }

        const db = require("../models");
        
        // Get fees setup status
        const [statusResult] = await db.sequelize.query(
          `SELECT 
             COUNT(*) as total_fees,
             COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_fees,
             COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_fees,
             COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_fees,
             SUM(amount) as total_amount,
             MIN(created_at) as first_created,
             MAX(updated_at) as last_updated,
             GROUP_CONCAT(DISTINCT description ORDER BY description) as fee_types
           FROM school_revenues 
           WHERE academic_year = :academic_year
             AND school_id = :school_id
             ${class_code ? "AND class_code = :class_code" : ""}
             ${term ? "AND term = :term" : ""}`,
          {
            replacements: { 
              academic_year,
              school_id: req.user.school_id,
              class_code,
              term
            },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );

        const status = statusResult[0];
        let setupStatus = "not_setup";
        
        if (status.total_fees > 0) {
          if (status.draft_fees > 0 && status.active_fees === 0) {
            setupStatus = "draft";
          } else if (status.active_fees > 0) {
            setupStatus = "published";
          } else if (status.inactive_fees > 0) {
            setupStatus = "inactive";
          }
        }

        return res.status(200).json({
          success: true,
          status: setupStatus,
          data: {
            total_fees: status.total_fees,
            draft_fees: status.draft_fees,
            active_fees: status.active_fees,
            inactive_fees: status.inactive_fees,
            total_amount: parseFloat(status.total_amount || 0),
            first_created: status.first_created,
            last_updated: status.last_updated,
            fee_types: status.fee_types ? status.fee_types.split(',') : []
          },
          message: `Fees setup status: ${setupStatus}`,
          toast: {
            type: "info",
            title: "Status Retrieved",
            message: `Current status: ${setupStatus.replace('_', ' ').toUpperCase()}`,
            duration: 3000
          }
        });

      } catch (error) {
        console.error("Error getting fees setup status:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to get fees setup status",
          error: error.message,
          toast: {
            type: "error",
            title: "Status Check Failed",
            message: "Unable to retrieve fees setup status",
            duration: 5000
          }
        });
      }
    }
  );

  // Bulk fees setup operation endpoint
  app.post(
    "/api/fees-setup/bulk",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          operations = [], // Array of fee setup operations
          operation_type = "submit", // Default operation type for all
          create_journal_entries = true,
          force_override = false
        } = req.body;

        if (!Array.isArray(operations) || operations.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Operations array is required and cannot be empty",
            toast: {
              type: "error",
              title: "Invalid Request",
              message: "Please provide at least one fee setup operation",
              duration: 5000
            }
          });
        }

        // Add operation_type to all operations
        const enhancedOperations = operations.map(op => ({
          ...op,
          operation_type,
          create_journal_entries,
          force_override
        }));

        // Process through the enhanced controller
        req.body = enhancedOperations;
        return schoolRevenuesEnhanced(req, res);

      } catch (error) {
        console.error("Error in bulk fees setup:", error);
        return res.status(500).json({
          success: false,
          message: "Bulk fees setup failed",
          error: error.message,
          toast: {
            type: "error",
            title: "Bulk Operation Failed",
            message: "Unable to complete bulk fees setup. Please try again.",
            duration: 5000
          }
        });
      }
    }
  );

  // Legacy compatibility routes - redirect to enhanced endpoints
  app.post("/school/revenues/enhanced", (req, res) => {
    res.redirect(307, "/api/fees-setup/enhanced");
  });

  app.get("/school/revenues/enhanced", (req, res) => {
    res.redirect(`/api/fees-setup/enhanced?${new URLSearchParams(req.query)}`);
  });

  // Enhanced school revenues route (maintains backward compatibility)
  app.post(
    "/school/revenues/submit",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      const operations = Array.isArray(req.body) ? req.body : [req.body];
      const submitOperations = operations.map(op => ({
        ...op,
        operation_type: "submit"
      }));
      
      req.body = submitOperations;
      return schoolRevenuesEnhanced(req, res);
    }
  );

  app.post(
    "/school/revenues/publish",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      const operations = Array.isArray(req.body) ? req.body : [req.body];
      const publishOperations = operations.map(op => ({
        ...op,
        operation_type: "publish"
      }));
      
      req.body = publishOperations;
      return schoolRevenuesEnhanced(req, res);
    }
  );
};