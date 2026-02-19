/**
 * Financial Routes Compatibility Layer
 * 
 * This file ensures all possible frontend routes are properly redirected to the new enhanced accounting APIs.
 * It covers all legacy routes, API v2 routes, and any other financial routes the frontend might call.
 */

module.exports = (app) => {
  console.log('🔗 Loading Financial Routes Compatibility Layer...');

  // ========================================
  // CORE FINANCIAL REPORT REDIRECTS
  // ========================================
  
  // Income Reports - All variations
  app.get('/income-report', (req, res) => {
    console.log('🔄 Redirecting /income-report to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-reports?${new URLSearchParams(req.query)}`);
  });

  app.get('/income-reports', (req, res) => {
    console.log('🔄 Redirecting /income-reports to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-reports?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/income', (req, res) => {
    console.log('🔄 Redirecting /reports/income to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-reports?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/income-reports', (req, res) => {
    console.log('🔄 Redirecting /reports/income-reports to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-reports?${new URLSearchParams(req.query)}`);
  });

  // Expenses Reports - All variations
  app.get('/expenses-report', (req, res) => {
    console.log('🔄 Redirecting /expenses-report to enhanced accounting API');
    res.redirect(`/api/v2/accounting/expenses-reports?${new URLSearchParams(req.query)}`);
  });

  app.get('/expenses-reports', (req, res) => {
    console.log('🔄 Redirecting /expenses-reports to enhanced accounting API');
    res.redirect(`/api/v2/accounting/expenses-reports?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/expenses', (req, res) => {
    console.log('🔄 Redirecting /reports/expenses to enhanced accounting API');
    res.redirect(`/api/v2/accounting/expenses-reports?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/expenses-reports', (req, res) => {
    console.log('🔄 Redirecting /reports/expenses-reports to enhanced accounting API');
    res.redirect(`/api/v2/accounting/expenses-reports?${new URLSearchParams(req.query)}`);
  });

  // Profit & Loss Reports - All variations
  app.get('/profit-loss', (req, res) => {
    console.log('🔄 Redirecting /profit-loss to enhanced accounting API');
    res.redirect(`/api/v2/accounting/profit-loss?${new URLSearchParams(req.query)}`);
  });

  app.get('/profit-loss-report', (req, res) => {
    console.log('🔄 Redirecting /profit-loss-report to enhanced accounting API');
    res.redirect(`/api/v2/accounting/profit-loss?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/profit-loss', (req, res) => {
    console.log('🔄 Redirecting /reports/profit-loss to enhanced accounting API');
    res.redirect(`/api/v2/accounting/profit-loss?${new URLSearchParams(req.query)}`);
  });

  // Income & Expenses Combined Reports
  app.get('/income-expenses', (req, res) => {
    console.log('🔄 Redirecting /income-expenses to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-expenses?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/income-expenses', (req, res) => {
    console.log('🔄 Redirecting /reports/income-expenses to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-expenses?${new URLSearchParams(req.query)}`);
  });

  // ========================================
  // FINANCIAL DASHBOARD REDIRECTS
  // ========================================
  
  app.get('/reports/dashboard', (req, res) => {
    console.log('🔄 Redirecting /reports/dashboard to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-expenses?${new URLSearchParams(req.query)}`);
  });

  app.get('/reports/financial-summary', (req, res) => {
    console.log('🔄 Redirecting /reports/financial-summary to enhanced accounting API');
    res.redirect(`/api/v2/accounting/profit-loss?${new URLSearchParams(req.query)}`);
  });

  app.get('/dashboard', (req, res) => {
    console.log('🔄 Redirecting /dashboard to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-expenses?${new URLSearchParams(req.query)}`);
  });

  // ========================================
  // API V2 SCHOOLS REPORTS REDIRECTS
  // ========================================
  
  app.get('/api/v2/schools/reports/income-statement', (req, res) => {
    console.log('🔄 Redirecting /api/v2/schools/reports/income-statement to enhanced accounting API');
    res.redirect(`/api/v2/accounting/profit-loss?${new URLSearchParams(req.query)}`);
  });

  app.get('/api/v2/schools/reports/dashboard', (req, res) => {
    console.log('🔄 Redirecting /api/v2/schools/reports/dashboard to enhanced accounting API');
    res.redirect(`/api/v2/accounting/income-expenses?${new URLSearchParams(req.query)}`);
  });

  app.get('/api/v2/schools/reports/trial-balance', (req, res) => {
    console.log('🔄 Redirecting /api/v2/schools/reports/trial-balance to enhanced accounting API');
    res.redirect(`/api/v2/accounting/trial-balance?${new URLSearchParams(req.query)}`);
  });

  console.log('✅ Financial Routes Compatibility Layer loaded successfully');
};