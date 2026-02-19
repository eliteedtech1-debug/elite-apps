const {
  setupBranchChartOfAccounts,
  ensureAllBranchesHaveAccounts,
  copyChartOfAccounts,
  getChartOfAccounts,
  checkBranchAccounts,
  createDefaultChartOfAccounts
} = require("../controllers/chartOfAccounts");

module.exports = function(app) {
  // Setup chart of accounts for a branch
  app.post("/api/setup-branch-accounts", setupBranchChartOfAccounts);

  // Ensure all branches have required accounts
  app.post("/api/ensure-all-branches-accounts", ensureAllBranchesHaveAccounts);

  // Copy chart of accounts from one branch to another
  app.post("/api/copy-chart-of-accounts", copyChartOfAccounts);

  // Get chart of accounts for a school/branch
  app.get("/api/chart-of-accounts", getChartOfAccounts);

  // Check if branch has required accounts
  app.get("/api/check-branch-accounts", checkBranchAccounts);

  // Create default chart of accounts
  app.post("/api/create-default-chart-of-accounts", createDefaultChartOfAccounts);
};