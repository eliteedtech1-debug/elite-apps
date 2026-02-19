const { getCompanyInfo, updateCompanyInfo } = require("../controllers/companyInfoController");

/**
 * Company Information Routes
 * 
 * API endpoints for managing company information
 */

module.exports = function (app) {
  // Get company information
  app.get("/api/company-info", getCompanyInfo);
  
  // Update company information (requires admin authentication)
  app.put("/api/company-info", updateCompanyInfo);
};