const db = require("../models");

/**
 * Enhanced Fees Setup Controller with Independent Submit/Publish Treatment
 * 
 * This controller enhances the existing school_revenues functionality with:
 * - Independent treatment for submit vs publish operations
 * - Comprehensive duplicate prevention with user-friendly messages
 * - Toast notification support for frontend visibility
 * - Integration with existing studentPayments system
 */

/**
 * Enhanced School Revenues with Submit/Publish Treatment
 * Replaces the existing schoolRevenues function with enhanced functionality
 */
const schoolRevenuesEnhanced = async (req, res) => {
  try {
    const operations = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
// operation_type
    console.log("Enhanced School Revenues Request:", {
      operationCount: operations.length,
      operations: operations.map(op => ({
        query_type: op.query_type,
        operation_type: op.operation_type,
        description: op.description,
        class_code: op.class_code,
        term: op.term,
        academic_year: op.academic_year
      }))
    });

    for (const operation of operations) {
      const {
        query_type = "INSERT",
        operation_type = "submit", // "submit" or "publish"
        id = null,
        description = null,
        amount = null,
        revenue_type = null,
        section = null,
        is_optional = operation.is_optional,
        status = "Draft", // Default to Draft for submit operations
        account_type = null,
        branch_id = null,
        academic_year = null,
        quantity = 1,
        force_override = false,
        create_journal_entries = true
      } = operation;

      // Validate required parameters
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
            title: "Validation Error",
            message: validation.message,
            duration: 5000
          }
        });
      }

      // Normalize term and class_name for cross-product processing
      const terms = normalizeField(operation.term);
      const classes = normalizeField(operation.class_name);

      // Generate cross-product: each class × each term
      const processedOperations = classes.length > 0 && terms.length > 0
        ? classes.flatMap((cls) =>
            terms.map((termItem) => ({
              ...operation,
              class_code: cls.value,
              class_name: cls.label,
              term: termItem.value,
              term_label: termItem.label
            }))
          )
        : [{
            ...operation,
            // Preserve original values if normalization didn't work
            class_code: operation.class_code || null,
            class_name: operation.class_name || null,
            term: operation.term || null
          }];

      // Process each combination with enhanced logic
      for (const processedOperation of processedOperations) {
        try {
          let result;

          if (operation_type === "submit") {
            // Submit operation: Create/update draft fee structures
            result = await handleSubmitFeesSetup({
              ...processedOperation,
              query_type,
              school_id: req.user.school_id,
              branch_id: processedOperation.branch_id || branch_id || req.user.branch_id,
              created_by: req.user.user_id || 'SYSTEM'
            });

            results.push({
              operation: processedOperation,
              result,
              toast: {
                type: "success",
                title: "Draft Saved",
                message: `Fee structure for ${processedOperation.description} saved as draft`,
                duration: 3000
              }
            });

          } else if (operation_type === "publish") {
            // Publish operation: Check for duplicates and publish
            const duplicateCheck = await checkForExistingFeeStructures({
              description: processedOperation.description,
              class_code: processedOperation.class_code,
              term: processedOperation.term,
              academic_year: processedOperation.academic_year,
              school_id: req.user.school_id,
              branch_id: processedOperation.branch_id || branch_id || req.user.branch_id
            });

            if (duplicateCheck.hasDuplicates && !force_override) {
              return res.status(409).json({
                success: false,
                message: duplicateCheck.message,
                duplicateInfo: duplicateCheck.details,
                toast: {
                  type: "warning",
                  title: "Duplicate Detected",
                  message: duplicateCheck.message,
                  duration: 8000,
                  actions: [
                    {
                      label: "Override & Publish",
                      action: "retry_with_override",
                      style: "primary"
                    },
                    {
                      label: "Update Existing",
                      action: "switch_to_update",
                      style: "secondary"
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

            // Proceed with publishing
            result = await handlePublishFeesSetup({
              ...processedOperation,
              query_type,
              school_id: req.user.school_id,
              branch_id: processedOperation.branch_id || branch_id || req.user.branch_id,
              created_by: req.user.user_id || 'SYSTEM',
              force_override,
              create_journal_entries
            });

            results.push({
              operation: processedOperation,
              result,
              toast: {
                type: "success",
                title: "Fees Published",
                message: `Fee structure for ${processedOperation.description} published successfully`,
                duration: 5000
              }
            });

          } else {
            // Invalid operation type
            return res.status(400).json({
              success: false,
              message: "Invalid operation type. Must be 'submit' or 'publish'",
              toast: {
                type: "error",
                title: "Invalid Operation",
                message: "Operation type must be either 'submit' or 'publish'",
                duration: 5000
              }
            });
          }

        } catch (operationError) {
          console.error("Error processing operation:", operationError);
          
          // Handle specific duplicate constraint errors
          if (operationError.message.includes('Duplicate entry') || operationError.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
              success: false,
              message: "Duplicate fee structure detected. This fee has already been published.",
              error: "DUPLICATE_ENTRY",
              toast: {
                type: "error",
                title: "Duplicate Not Allowed",
                message: "This fee structure has already been published. Use update to modify existing fees.",
                duration: 8000,
                actions: [
                  {
                    label: "Update Instead",
                    action: "switch_to_update",
                    style: "primary"
                  }
                ]
              }
            });
          }

          results.push({
            operation: processedOperation,
            error: operationError.message,
            toast: {
              type: "error",
              title: "Operation Failed",
              message: `Failed to process ${processedOperation.description}: ${operationError.message}`,
              duration: 5000
            }
          });
        }
      }
    }

    // Return consolidated results
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;

    return res.status(200).json({
      success: errorCount === 0,
      message: `Fees setup completed. ${successCount} successful, ${errorCount} failed.`,
      data: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount
      },
      toast: {
        type: errorCount === 0 ? "success" : "warning",
        title: "Fees Setup Complete",
        message: `${successCount} operations successful${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        duration: 5000
      }
    });

  } catch (error) {
    console.error("Error in schoolRevenuesEnhanced controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process fees setup",
      error: error.message,
      toast: {
        type: "error",
        title: "Setup Failed",
        message: "An unexpected error occurred. Please try again.",
        duration: 5000
      }
    });
  }
};

/**
 * Validate fees setup request parameters
 */
const validateFeesSetupRequest = ({ description, amount, academic_year, operation_type }) => {
  if (!description) {
    return {
      isValid: false,
      message: "Fee description is required"
    };
  }

  if (!amount || amount <= 0) {
    return {
      isValid: false,
      message: "Valid fee amount is required"
    };
  }

  if (!academic_year) {
    return {
      isValid: false,
      message: "Academic year is required"
    };
  }

  if (!["submit", "publish"].includes(operation_type)) {
    return {
      isValid: false,
      message: "Operation type must be either 'submit' or 'publish'"
    };
  }

  return { isValid: true };
};

/**
 * Normalize field into array of { value, label }
 */
const normalizeField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') return [{ value: field, label: field }];
  if (typeof field === 'object' && field.value != null && field.label != null) {
    return [field];
  }
  console.warn("Unexpected field format:", field);
  return [];
};

/**
 * Check for existing fee structures to prevent duplicates
 */
const checkForExistingFeeStructures = async ({
  description,
  class_code,
  term,
  academic_year,
  school_id,
  branch_id
}) => {
  try {
    const [existingFees] = await db.sequelize.query(
      `SELECT 
         COUNT(*) as fee_count,
         GROUP_CONCAT(DISTINCT status) as statuses,
         MIN(created_at) as first_created,
         MAX(updated_at) as last_updated
       FROM school_revenues 
       WHERE description = :description
         AND academic_year = :academic_year
         AND school_id = :school_id
         ${class_code ? "AND class_code = :class_code" : ""}
         ${term ? "AND term = :term" : ""}
         ${branch_id ? "AND branch_id = :branch_id" : ""}`,
      {
        replacements: { 
          description, 
          class_code, 
          term, 
          academic_year, 
          school_id,
          branch_id 
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    const fee = existingFees[0];
    
    if (fee.fee_count > 0) {
      return {
        hasDuplicates: true,
        message: `Fee "${description}" for ${academic_year}${term ? ` - ${term}` : ''} already exists. ${fee.fee_count} entries found.`,
        details: {
          fee_count: fee.fee_count,
          statuses: fee.statuses,
          first_created: fee.first_created,
          last_updated: fee.last_updated,
          description,
          class_code,
          term,
          academic_year
        }
      };
    }

    return { hasDuplicates: false };

  } catch (error) {
    console.error("Error checking for existing fee structures:", error);
    return { 
      hasDuplicates: false,
      error: error.message 
    };
  }
};

/**
 * Handle submit operation (draft mode)
 */
const handleSubmitFeesSetup = async (operation) => {
  console.log("Handling SUBMIT fees setup:", operation);

  // Create or update draft fee structure
  const result = await db.sequelize.query(
    `CALL school_revenues(
      :query_type,
      :id,
      :description,
      :amount,
      :term,
      :section,
      :class_name,
      :class_code,
      :revenue_type,
      :is_optional,
      'Draft',
      :account_type,
      :school_id,
      :branch_id,
      :academic_year,
      :quantity
    )`,
    {
      replacements: {
        query_type: operation.query_type,
        id: operation.id,
        description: operation.description,
        amount: operation.amount,
        term: operation.term,
        section: operation.section,
        class_name: operation.class_name,
        class_code: operation.class_code,
        revenue_type: operation.revenue_type,
        is_optional: operation.is_optional,
        account_type: operation.account_type,
        school_id: operation.school_id,
        branch_id: operation.branch_id,
        academic_year: operation.academic_year,
        quantity: operation.quantity || 1
      }
    }
  );

  return {
    operation: "submit_fees_setup",
    status: "draft",
    result
  };
};

/**
 * Handle publish operation (final publication)
 */
const handlePublishFeesSetup = async (operation) => {
  console.log("Handling PUBLISH fees setup:", operation);

  // Create published fee structure with Posted status
  const result = await db.sequelize.query(
    `CALL school_revenues(
      :query_type,
      :id,
      :description,
      :amount,
      :term,
      :section,
      :class_name,
      :class_code,
      :revenue_type,
      :is_optional,
      'Posted',
      :account_type,
      :school_id,
      :branch_id,
      :academic_year,
      :quantity
    )`,
    {
      replacements: {
        query_type: operation.query_type,
        id: operation.id || null,
        description: operation.description,
        amount: operation.amount,
        term: operation.term,
        section: operation.section || '',
        class_name: operation.class_name || '',
        class_code: operation.class_code,
        revenue_type: operation.revenue_type || 'Fees',
        is_optional: operation.is_optional || 'No',
        account_type: operation.account_type || 'Revenue',
        school_id: operation.school_id,
        branch_id: operation.branch_id,
        academic_year: operation.academic_year,
        quantity: operation.quantity || 1
      }
    }
  );

  // If create_journal_entries is true, create payment_entries for students
  if (operation.create_journal_entries) {
    try {
      let revenueCode = null;
      
      if (operation.query_type === "INSERT") {
        // Get the newly created revenue code
        const [newRevenue] = await db.sequelize.query(
          `SELECT code FROM school_revenues 
           WHERE description = :description 
             AND academic_year = :academic_year
             AND school_id = :school_id
             AND class_code = :class_code
             AND term = :term
           ORDER BY created_at DESC LIMIT 1`,
          {
            replacements: {
              description: operation.description,
              academic_year: operation.academic_year,
              school_id: operation.school_id,
              class_code: operation.class_code,
              term: operation.term
            },
            type: db.Sequelize.QueryTypes.SELECT,
          }
        );
        revenueCode = newRevenue?.code;
      } else if (operation.query_type === "UPDATE" && operation.id) {
        // For republishing, use the existing revenue code
        revenueCode = operation.id;
      }

      if (revenueCode) {
        console.log(`🔄 Creating payment entries for revenue code: ${revenueCode}, class: ${operation.class_code}`);
        
        // Insert payment entries only for students who don't already have them (duplicate prevention)
        // Apply scholarship discounts when creating payment entries
        const insertResult = await db.sequelize.query(
          `INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity, payment_status)
           SELECT :code, s.admission_no, s.current_class, :academic_year, :term, 
                  ROUND(:amount * (1 - COALESCE(s.scholarship_percentage, 0) / 100), 2) as discounted_amount,
                  ROUND(:unit_price * (1 - COALESCE(s.scholarship_percentage, 0) / 100), 2) as discounted_unit_price,
                  CASE 
                    WHEN s.scholarship_percentage > 0 THEN CONCAT(:description, ' (', s.scholarship_percentage, '% scholarship applied)')
                    ELSE :description
                  END as final_description,
                  :school_id, :branch_id, :quantity, 'Pending'
           FROM students s
           LEFT JOIN payment_entries pe ON pe.ref_no = :code AND pe.admission_no = s.admission_no
           WHERE s.school_id = :school_id 
             AND (:branch_id IS NULL OR s.branch_id = :branch_id)
             AND s.current_class = :class_code
             AND s.status IN ('Active', 'Suspended', 'ACTIVE', 'SUSPENDED', 'Current', 'Enrolled', 'Present')
             AND pe.admission_no IS NULL`,
          {
            replacements: {
              code: revenueCode,
              academic_year: operation.academic_year,
              term: operation.term,
              amount: operation.amount,
              unit_price: operation.amount,
              description: operation.description,
              school_id: operation.school_id,
              branch_id: operation.branch_id || null,
              class_code: operation.class_code,
              quantity: operation.quantity || 1
            },
            type: db.Sequelize.QueryTypes.INSERT
          }
        );
        
        const affectedRows = insertResult[1] || 0;
        console.log(`✅ Payment entries created for revenue code: ${revenueCode}, affected rows: ${affectedRows}`);
        
        if (affectedRows === 0) {
          console.log(`ℹ️ No new payment entries needed - all students already have entries for ${revenueCode}`);
        }
      } else {
        console.error("❌ Could not get revenue code");
        throw new Error("Revenue code not found");
      }
    } catch (paymentError) {
      console.error("❌ Error creating payment entries:", paymentError);
      throw paymentError;
    }
  }

  return {
    operation: "publish_fees_setup",
    status: "published",
    result
  };
};

/**
 * Enhanced Get School Revenues with filtering and status information
 */
const getSchoolRevenuesEnhanced = async (req, res) => {
  try {
    const {
      query_type = "SELECT",
      id = null,
      description = null,
      amount = null,
      revenue_type = null,
      section = null,
      is_optional = null,
      status = null,
      class_code = null,
      class_name = null,
      account_type = null,
      branch_id = null,
      academic_year = null,
      term = null,
      quantity = 1,
      include_draft = false // New parameter to include draft fees
    } = req.query;

    // Call the original stored procedure
    const result = await db.sequelize.query(
      `CALL school_revenues(
        :query_type,
        :id,
        :description,
        :amount,
        :term,
        :section,
        :class_name,
        :class_code,
        :revenue_type,
        :is_optional,
        :status,
        :account_type,
        :school_id,
        :branch_id,
        :academic_year,
        :quantity
      )`,
      {
        replacements: {
          query_type,
          id: id ?? null,
          description,
          amount,
          term: term ?? null,
          section,
          class_name: class_name ?? null,
          class_code: class_code ?? null,
          revenue_type,
          is_optional,
          status: status ?? (include_draft ? null : 'Active'),
          account_type,
          branch_id: branch_id ?? req.user.branch_id,
          school_id: req.user.school_id,
          academic_year,
          quantity: quantity || 1
        }
      }
    );

    // Get additional status information
    const [statusInfo] = await db.sequelize.query(
      `SELECT 
         COUNT(*) as total_fees,
         COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_fees,
         COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_fees,
         COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_fees,
         SUM(amount) as total_amount
       FROM school_revenues 
       WHERE school_id = :school_id
         ${branch_id ? "AND branch_id = :branch_id" : ""}
         ${academic_year ? "AND academic_year = :academic_year" : ""}
         ${term ? "AND term = :term" : ""}`,
      {
        replacements: {
          school_id: req.user.school_id,
          branch_id: branch_id ?? req.user.branch_id,
          academic_year,
          term
        },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    res.status(200).json({ 
      success: true, 
      data: result,
      summary: statusInfo[0],
      filters: {
        academic_year,
        term,
        status,
        include_draft
      },
      toast: {
        type: "info",
        title: "Fees Retrieved",
        message: `Found ${statusInfo[0].total_fees} fee structures`,
        duration: 3000
      }
    });

  } catch (error) {
    console.error("Error executing school_revenues operation:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      toast: {
        type: "error",
        title: "Retrieval Failed",
        message: "Failed to retrieve fee structures",
        duration: 5000
      }
    });
  }
};

/**
 * Publish fees from draft to active
 */
const publishDraftFees = async (req, res) => {
  try {
    const {
      fee_ids = [], // Array of specific fee IDs to publish
      class_code = null,
      term = null,
      academic_year = null,
      create_journal_entries = true
    } = req.body;

    if (fee_ids.length === 0 && !class_code && !term && !academic_year) {
      return res.status(400).json({
        success: false,
        message: "Either fee_ids or class/term/year filters are required",
        toast: {
          type: "error",
          title: "Invalid Request",
          message: "Please specify which fees to publish",
          duration: 5000
        }
      });
    }

    let whereClause = "status = 'Draft' AND school_id = :school_id";
    let replacements = { school_id: req.user.school_id };

    if (fee_ids.length > 0) {
      whereClause += " AND id IN (:fee_ids)";
      replacements.fee_ids = fee_ids;
    } else {
      if (class_code) {
        whereClause += " AND class_code = :class_code";
        replacements.class_code = class_code;
      }
      if (term) {
        whereClause += " AND term = :term";
        replacements.term = term;
      }
      if (academic_year) {
        whereClause += " AND academic_year = :academic_year";
        replacements.academic_year = academic_year;
      }
    }

    // Update draft fees to active
    const [updateResult] = await db.sequelize.query(
      `UPDATE school_revenues 
       SET status = 'Active', updated_at = NOW() 
       WHERE ${whereClause}`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.UPDATE,
      }
    );

    // Get the published fees for student payment generation
    const publishedFees = await db.sequelize.query(
      `SELECT code, class_code, term, academic_year, amount, unit_price, description, school_id, branch_id, quantity 
       FROM school_revenues 
       WHERE ${whereClause.replace("status = 'Draft'", "status = 'Active'")}`,
      {
        replacements,
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    // Generate student payments for published fees using direct SQL
    if (create_journal_entries && publishedFees.length > 0) {
      for (const fee of publishedFees) {
        try {
          // Check if entries already exist
          const [existing] = await db.sequelize.query(
            `SELECT COUNT(*) as cnt FROM payment_entries WHERE ref_no = :code`,
            { replacements: { code: fee.code }, type: db.Sequelize.QueryTypes.SELECT }
          );
          
          if (existing.cnt === 0) {
            // Update revenue status to Posted
            await db.sequelize.query(
              `UPDATE school_revenues SET status = 'Posted' WHERE code = :code`,
              { replacements: { code: fee.code }, type: db.Sequelize.QueryTypes.UPDATE }
            );
            
            // Insert payment entries for students with scholarship discounts applied
            await db.sequelize.query(
              `INSERT INTO payment_entries (ref_no, admission_no, class_code, academic_year, term, cr, unit_price, description, school_id, branch_id, quantity, payment_status)
               SELECT :code, admission_no, current_class, :academic_year, :term, 
                      ROUND(:amount * (1 - COALESCE(scholarship_percentage, 0) / 100), 2) as discounted_amount,
                      ROUND(:unit_price * (1 - COALESCE(scholarship_percentage, 0) / 100), 2) as discounted_unit_price,
                      CASE 
                        WHEN scholarship_percentage > 0 THEN CONCAT(:description, ' (', scholarship_percentage, '% scholarship applied)')
                        ELSE :description
                      END as final_description,
                      :school_id, :branch_id, :quantity, 'Pending'
               FROM students
               WHERE school_id = :school_id 
                 AND (branch_id = :branch_id OR :branch_id IS NULL)
                 AND current_class = :class_code
                 AND status IN ('Active', 'Suspended', 'ACTIVE', 'SUSPENDED', 'Current', 'Enrolled', 'Present')`,
              {
                replacements: {
                  code: fee.code,
                  academic_year: fee.academic_year,
                  term: fee.term,
                  amount: fee.amount,
                  unit_price: fee.unit_price || fee.amount,
                  description: fee.description,
                  school_id: fee.school_id,
                  branch_id: fee.branch_id || null,
                  class_code: fee.class_code,
                  quantity: fee.quantity || 1
                },
                type: db.Sequelize.QueryTypes.INSERT
              }
            );
          }
        } catch (paymentError) {
          console.error(`Error publishing student payments for fee ${fee.code}:`, paymentError);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully published ${publishedFees.length} fee structures`,
      data: {
        published_count: publishedFees.length,
        published_fees: publishedFees
      },
      toast: {
        type: "success",
        title: "Fees Published",
        message: `${publishedFees.length} fee structures published successfully`,
        duration: 5000
      }
    });

  } catch (error) {
    console.error("Error publishing draft fees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish fees",
      error: error.message,
      toast: {
        type: "error",
        title: "Publish Failed",
        message: "Failed to publish fee structures",
        duration: 5000
      }
    });
  }
};

module.exports = {
  schoolRevenuesEnhanced,
  getSchoolRevenuesEnhanced,
  publishDraftFees,
  validateFeesSetupRequest,
  checkForExistingFeeStructures,
  handleSubmitFeesSetup,
  handlePublishFeesSetup
};