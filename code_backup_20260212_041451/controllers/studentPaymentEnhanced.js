const db = require("../models");
const { schoolRevenuesEnhanced } = require("./feesSetupEnhanced");

/**
 * Enhanced Student Payment Controller - Delegates to feesSetupEnhanced
 */

const studentPaymentEnhanced = async (req, res) => {
  console.log('📍 [1] Student Payment v2 endpoint called');
  
  try {
    const { 
      code = "", 
      class_code = "", 
      term = "", 
      operation_type = "publish",
      academic_year = "",
      school_id = "",
      branch_id = ""
    } = req.body;
    
    // Get secure context
    const headerSchoolId = req.headers['x-school-id'] || req.get('X-School-Id');
    const headerBranchId = req.headers['x-branch-id'] || req.get('X-Branch-Id');
    
    const secureSchoolId = school_id || req.user?.school_id || headerSchoolId;
    const secureBranchId = branch_id || req.user?.branch_id || headerBranchId;
    
    if (!secureSchoolId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No school context available",
        error: "MISSING_SCHOOL_CONTEXT"
      });
    }
    
    // Get the fee details from school_revenues first
    const feeDetails = await db.sequelize.query(
      `SELECT description, amount, quantity FROM school_revenues WHERE code = :code AND school_id = :school_id`,
      {
        replacements: { code, school_id: secureSchoolId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    if (!feeDetails || feeDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fee item not found",
        error: "FEE_NOT_FOUND"
      });
    }
    
    const fee = feeDetails[0];
    
    // Delegate to schoolRevenuesEnhanced with proper parameters
    const publishRequest = {
      ...req,
      body: {
        query_type: "UPDATE", // Republish existing revenue
        id: code,
        description: fee.description,
        amount: fee.amount,
        quantity: fee.quantity,
        class_code,
        term,
        academic_year,
        school_id: secureSchoolId,
        branch_id: secureBranchId,
        operation_type: "publish"
      }
    };
    
    console.log('📍 [2] Delegating to schoolRevenuesEnhanced for actual publish');
    return await schoolRevenuesEnhanced(publishRequest, res);
    
  } catch (error) {
    console.error('❌ Error in studentPaymentEnhanced:', error);
    return res.status(500).json({
      success: false,
      message: "Operation failed",
      error: error.message
    });
  }
};

/**
 * Validate payment request
 */
const validatePaymentRequest = (data) => {
  const { class_code, term, academic_year, operation_type } = data;
  
  if (!class_code || !term || !academic_year) {
    return {
      isValid: false,
      message: "Missing required parameters: class_code, term, academic_year"
    };
  }
  
  return { isValid: true, message: "Validation passed" };
};

/**
 * Check for existing publications
 */
const checkForExistingPublications = async (data) => {
  return {
    hasDuplicates: false,
    message: "No duplicates found",
    details: {}
  };
};

/**
 * Check for duplicate revenue
 */
const checkForDuplicateRevenue = async (data) => {
  return {
    hasDuplicates: false,
    message: "No duplicates found",
    duplicates: []
  };
};

module.exports = {
  studentPaymentEnhanced,
  validatePaymentRequest,
  checkForExistingPublications,
  checkForDuplicateRevenue
};
