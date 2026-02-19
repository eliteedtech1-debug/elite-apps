const AdaptiveFinancialDashboardController = require("../controllers/adaptive_financial_dashboard");
const { authenticateToken } = require("../middleware/auth");

module.exports = (app) => {
  // Override the financial dashboard to use adaptive data source detection
  app.get("/api/v2/schools/reports/dashboard", authenticateToken, (req, res, next) => {
    return AdaptiveFinancialDashboardController.getFinancialDashboard(req, res, next);
  });
};