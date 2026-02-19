const SchoolAccessController = require("../controllers/schoolAccessController");
const { authenticate, authorize } = require('../middleware/auth');
const controller = new SchoolAccessController();

module.exports = (app) => {
  // GET: All schools with access summary
  app.get('/schools/access', authenticate, (req, res) => controller.getSchoolsWithAccess(req, res));

  // GET: Access config for a school
  app.get('/schools/access/config', authenticate, (req, res) => controller.getSchoolAccessConfig(req, res));

  // POST: Update access config
  app.post('/schools/access/config', authenticate, (req, res) => controller.updateSchoolAccess(req, res));

  // POST: Bulk update features
  app.post('/schools/access/bulk-update', authenticate, (req, res) => controller.bulkUpdateSchoolFeatures(req, res));

  // POST: Clone access config
  app.post('/schools/access/clone', authenticate, (req, res) => controller.cloneSchoolAccess(req, res));

  // POST: Reset access to default
  app.post('/schools/access/reset', authenticate, (req, res) => controller.resetSchoolAccess(req, res));

  // GET: User access summary for a school
  app.get('/schools/access/summary', authenticate, (req, res) => controller.getSchoolUserSummary(req, res));

  // GET: Access analytics across schools
  app.get('/schools/access/analytics', authenticate, (req, res) => controller.getAccessAnalytics(req, res));

  // GET: Audit trail
  app.get('/schools/access/audit', authenticate, (req, res) => controller.getAccessAuditTrail(req, res));

  // POST: Validate user access
  app.post('/schools/access/validate', authenticate, (req, res) => controller.validateUserAccess(req, res));
}

