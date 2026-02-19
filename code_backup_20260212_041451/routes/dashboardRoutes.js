const dashboardController = require('../controllers/dashboardController');

/**
 * Dashboard API Routes
 * Simple, dedicated endpoints for dashboard data
 */
module.exports = function (app) {
  // Get recent subscriptions for dashboard table
  app.get('/api/dashboard/recent-subscriptions', dashboardController.getRecentSubscriptions);

  // Get subscription statistics for dashboard cards
  app.get('/api/dashboard/subscription-stats', dashboardController.getSubscriptionStats);
};
