const { getStudentCount, getPricingPlans, getPricingPlanFeatures, updatePricingPlanFeatures, createSubscription, getSchoolSubscription, updateSchoolSubscription, recordPayment } = require("../controllers/subscription_billing");

/**
 * Subscription Billing Routes
 * 
 * This module handles all subscription-related API endpoints
 */

module.exports = function (app) {
  // Get active student count for a school
  app.get("/api/student-count", getStudentCount);
  
  // Get subscription pricing plans
  app.get("/api/subscription-pricing", getPricingPlans);
  
  // Get and update pricing plan features
  app.get("/api/subscription-pricing/:plan_id/features", getPricingPlanFeatures);
  app.put("/api/subscription-pricing/:plan_id/features", updatePricingPlanFeatures);
  
  // Subscription operations
  app.post("/api/create-subscription", createSubscription);
  app.get("/api/school-subscription", getSchoolSubscription);  // Get school's current subscription
  app.post("/api/school-subscription-update", updateSchoolSubscription);  // Update school subscription settings
  app.post("/api/subscription-payments", recordPayment);       // Record a payment
};