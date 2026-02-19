const SimplifiedFinancialDashboardController = require("../controllers/simplified_financial_dashboard");
const { authenticateToken } = require("../middleware/auth");

module.exports = (app) => {
  // ========================================
  // SIMPLIFIED FINANCIAL DASHBOARD ROUTES
  // Uses payment_entries table directly
  // ========================================
  
  // Simplified Financial Dashboard (using payment_entries)
  app.get("/api/v2/schools/reports/dashboard-simplified", authenticateToken, SimplifiedFinancialDashboardController.getFinancialDashboard);
  
  // Simplified Income Data (using payment_entries)
  app.get("/api/v2/schools/reports/income-simplified", authenticateToken, SimplifiedFinancialDashboardController.getIncomeData);
  
  // Simplified Expense Data (using payment_entries)
  app.get("/api/v2/schools/reports/expenses-simplified", authenticateToken, SimplifiedFinancialDashboardController.getExpenseData);
  
  // Override the main dashboard route to use simplified version temporarily
  app.get("/api/v2/schools/reports/dashboard", authenticateToken, SimplifiedFinancialDashboardController.getFinancialDashboard);
};