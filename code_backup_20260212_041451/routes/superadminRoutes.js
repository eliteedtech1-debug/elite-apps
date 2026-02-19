module.exports = (app) => {
  console.log('🔧 Loading superadminRoutes...');
  const userController = require("../controllers/user");
  const superadminController = require("../controllers/superadminController");
  console.log('🔧 User controller keys:', Object.keys(userController));
  const { superadminLogin, getQueueStats, retryJob, getFailedEmailJobs, deleteFailedJob } = userController;

  // Super Admin Login route - kept at root level as it's an auth endpoint
  app.post("/superadmin-login", superadminLogin);

  // Super Admin Queue Management - relative path, will be mounted with API prefix
  app.get("/queues/stats", getQueueStats);
  app.get("/queues/failed-jobs", getFailedEmailJobs);
  
  // Super Admin Job Management
  app.post("/superadmin/queues/jobs/:jobId/retry", retryJob);
  app.delete("/superadmin/queues/jobs/:jobId", deleteFailedJob);

  // Get current user's superadmin features
  app.get("/my-features", superadminController.getMyFeatures);

  // Get features by plan (for UI)
  app.get("/plan-features", superadminController.getPlanFeatures);

  // SuperAdmin Management (Developer only)
  app.get("/superadmins", superadminController.getSuperAdmins);
  app.post("/superadmins", superadminController.createSuperAdmin);
  app.put("/superadmins/:id", superadminController.updateSuperAdmin);
  app.put("/superadmins/:id/features", superadminController.updateSuperAdminFeatures);
  app.post("/superadmins/:id/delete", superadminController.deleteSuperAdmin);
};