const passport = require("passport");
const {
  studentPaymentEnhanced,
  validatePaymentRequest,
  checkForExistingPublications
} = require("../controllers/studentPaymentEnhanced");

/**
 * Enhanced Student Payment Routes with Independent Submit/Publish Treatment
 * 
 * Features:
 * - Separate endpoints for submit and publish operations
 * - Comprehensive duplicate prevention with user-friendly responses
 * - Toast notification support for frontend integration
 * - Validation and error handling
 */

module.exports = (app) => {
  
  // Enhanced unified endpoint with operation type parameter
  app.post(
    "/api/studentpayment/enhanced",
    passport.authenticate("jwt", { session: false }),
    studentPaymentEnhanced
  );
  
  // NEW: Enhanced endpoint with student ledger integration
  app.post(
    "/api/studentpayment/enhanced-with-ledger",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      // Force student ledger integration
      req.body.create_student_ledger_entries = true;
      req.body.operation_type = "publish";
      return studentPaymentEnhanced(req, res);
    }
  );

  // NEW: Non-procedure endpoint that doesn't interfere with existing APIs
  app.post(
    "/api/studentpayment/v2",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      // Force the enhanced controller to use JavaScript logic only
      req.body.use_javascript_logic = true;
      req.body.operation_type = "publish"; // Default to publish
      return studentPaymentEnhanced(req, res);
    }
  );

  // Dedicated submit endpoint (draft mode)
  app.post(
    "/api/studentpayment/submit",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      req.body.operation_type = "submit";
      return studentPaymentEnhanced(req, res);
    }
  );

  // Dedicated publish endpoint (final publication)
  app.post(
    "/api/studentpayment/publish",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      req.body.operation_type = "publish";
      return studentPaymentEnhanced(req, res);
    }
  );

  // Republish endpoint with enhanced duplicate handling
  app.post(
    "/api/studentpayment/republish",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      req.body.operation_type = "publish";
      req.body.republish = true;
      return studentPaymentEnhanced(req, res);
    }
  );

  // Check for existing publications (duplicate prevention helper)
  app.post(
    "/api/studentpayment/check-duplicates",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          code = "",
          class_code = "",
          term = "",
          academic_year = "",
          branch_id = "",
          school_id = ""
        } = req.body;

        // Validate required parameters
        const validation = validatePaymentRequest({
          class_code,
          term,
          academic_year,
          operation_type: "publish" // Default for duplicate check
        });

        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.message,
            toast: {
              type: "error",
              title: "Validation Error",
              message: validation.message,
              duration: 5000
            }
          });
        }

        // Check for duplicates
        const duplicateCheck = await checkForExistingPublications({
          code,
          class_code,
          term,
          academic_year,
          school_id: school_id || req.user?.school_id,
          branch_id: branch_id || req.user?.branch_id
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
                  label: "Proceed with Republish",
                  action: "proceed_republish",
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
            message: "No existing publications found. You can proceed safely.",
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

  // Validate payment request endpoint
  app.post(
    "/api/studentpayment/validate",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          class_code = "",
          term = "",
          academic_year = "",
          operation_type = "submit"
        } = req.body;

        const validation = validatePaymentRequest({
          class_code,
          term,
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

  // Get publication status for a class/term/year
  app.get(
    "/api/studentpayment/status",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          class_code = "",
          term = "",
          academic_year = "",
          code = ""
        } = req.query;

        if (!class_code || !term || !academic_year) {
          return res.status(400).json({
            success: false,
            message: "class_code, term, and academic_year are required",
            toast: {
              type: "error",
              title: "Missing Parameters",
              message: "Class code, term, and academic year are required",
              duration: 5000
            }
          });
        }

        const db = require("../models");
        
        // Get publication status
        const [statusResult] = await db.sequelize.query(
          `SELECT 
             COUNT(*) as total_entries,
             COUNT(CASE WHEN payment_status = 'Draft' THEN 1 END) as draft_entries,
             COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as published_entries,
             COUNT(CASE WHEN payment_status = 'Paid' THEN 1 END) as paid_entries,
             MIN(created_at) as first_created,
             MAX(updated_at) as last_updated,
             GROUP_CONCAT(DISTINCT description ORDER BY description) as fee_types
           FROM payment_entries 
           WHERE class_code = :class_code 
             AND term = :term 
             AND academic_year = :academic_year
             AND school_id = :school_id
             ${code ? "AND ref_no = :code" : ""}`,
          {
            replacements: { 
              class_code, 
              term, 
              academic_year,
              school_id: req.user.school_id,
              code
            },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );

        const status = statusResult[0];
        let publicationStatus = "not_published";
        
        if (status.total_entries > 0) {
          if (status.draft_entries > 0 && status.published_entries === 0) {
            publicationStatus = "draft";
          } else if (status.published_entries > 0) {
            publicationStatus = "published";
          }
        }

        return res.status(200).json({
          success: true,
          status: publicationStatus,
          data: {
            total_entries: status.total_entries,
            draft_entries: status.draft_entries,
            published_entries: status.published_entries,
            paid_entries: status.paid_entries,
            first_created: status.first_created,
            last_updated: status.last_updated,
            fee_types: status.fee_types ? status.fee_types.split(',') : []
          },
          message: `Publication status: ${publicationStatus}`,
          toast: {
            type: "info",
            title: "Status Retrieved",
            message: `Current status: ${publicationStatus.replace('_', ' ').toUpperCase()}`,
            duration: 3000
          }
        });

      } catch (error) {
        console.error("Error getting publication status:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to get publication status",
          error: error.message,
          toast: {
            type: "error",
            title: "Status Check Failed",
            message: "Unable to retrieve publication status",
            duration: 5000
          }
        });
      }
    }
  );

  // Check for duplicate revenue items
  app.post(
    "/api/revenues/check-duplicates",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          description,
          class_code,
          term,
          academic_year,
          revenue_type = 'Fees'
        } = req.body;

        const school_id = req.user?.school_id;
        const branch_id = req.user?.branch_id;

        if (!description || !class_code || !term || !academic_year || !school_id) {
          return res.status(400).json({
            success: false,
            message: 'Missing required parameters'
          });
        }

        const { checkForDuplicateRevenue } = require('../controllers/studentPaymentEnhanced');
        
        const duplicateCheck = await checkForDuplicateRevenue({
          description,
          class_code,
          term,
          academic_year,
          school_id,
          branch_id,
          revenue_type
        });

        return res.json({
          success: true,
          hasDuplicates: duplicateCheck.hasDuplicates,
          message: duplicateCheck.message,
          duplicates: duplicateCheck.duplicates
        });

      } catch (error) {
        console.error('Error checking duplicates:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to check for duplicates',
          error: error.message
        });
      }
    }
  );

  // Bulk operation endpoint for multiple classes
  app.post(
    "/api/studentpayment/bulk",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const {
          operations = [], // Array of { class_code, term, academic_year, operation_type }
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
              message: "Please provide at least one operation to perform",
              duration: 5000
            }
          });
        }

        const results = [];
        const errors = [];

        for (const operation of operations) {
          try {
            // Create a mock request object for each operation
            const mockReq = {
              body: {
                ...operation,
                create_journal_entries,
                force_override
              },
              user: req.user
            };

            const mockRes = {
              status: (code) => ({
                json: (data) => ({ statusCode: code, data })
              })
            };

            const result = await studentPaymentEnhanced(mockReq, mockRes);
            results.push({
              operation,
              success: true,
              result: result.data || result
            });

          } catch (error) {
            errors.push({
              operation,
              success: false,
              error: error.message
            });
          }
        }

        const successCount = results.length;
        const errorCount = errors.length;

        return res.status(200).json({
          success: errorCount === 0,
          message: `Bulk operation completed. ${successCount} successful, ${errorCount} failed.`,
          results,
          errors,
          summary: {
            total: operations.length,
            successful: successCount,
            failed: errorCount
          },
          toast: {
            type: errorCount === 0 ? "success" : "warning",
            title: "Bulk Operation Complete",
            message: `${successCount} operations successful${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
            duration: 8000
          }
        });

      } catch (error) {
        console.error("Error in bulk operation:", error);
        return res.status(500).json({
          success: false,
          message: "Bulk operation failed",
          error: error.message,
          toast: {
            type: "error",
            title: "Bulk Operation Failed",
            message: "Unable to complete bulk operation. Please try again.",
            duration: 5000
          }
        });
      }
    }
  );
};