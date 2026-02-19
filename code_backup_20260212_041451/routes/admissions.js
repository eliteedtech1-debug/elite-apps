const AdmissionApplicationController = require('../controllers/AdmissionApplicationController');
const AdmissionWorkflowController = require('../controllers/AdmissionWorkflowController');
const AdmissionDashboardController = require('../controllers/AdmissionDashboardController');
const ClassController = require('../controllers/classController');
const passport = require('passport');
const dualSchoolContext = require('../middleware/dualSchoolContext');
const enforceBranchContext = require('../middleware/enforceBranchContext');

module.exports = (app) => {
  // Dashboard routes
  app.get('/api/admissions/statistics',
    passport.authenticate('jwt', { session: false }),
    dualSchoolContext,
    AdmissionDashboardController.getStatistics);

  // Debug route for testing
  app.get('/api/debug/statistics',
    AdmissionDashboardController.getStatistics);

  app.get('/api/admissions/exam-schedules',
    passport.authenticate('jwt', { session: false }),
    dualSchoolContext,
    AdmissionDashboardController.getExamSchedules);

  // Debug route for testing
  app.get('/api/debug/exam-schedules',
    AdmissionDashboardController.getExamSchedules);

  // Debug route for testing
  app.get('/api/debug/branches-status',
    AdmissionDashboardController.getBranchesAdmissionStatus);

  // Debug route to check headers
  app.get('/api/debug/headers', (req, res) => {
    res.json({
      success: true,
      headers: req.headers,
      school_id: req.headers['x-school-id'],
      branch_id: req.headers['x-branch-id']
    });
  });

  app.get('/api/admissions/pending-payments',
    passport.authenticate('jwt', { session: false }),
    dualSchoolContext,
    AdmissionDashboardController.getPendingPayments);

  // Admission settings routes
  app.get('/api/admissions/settings',
    passport.authenticate('jwt', { session: false }),
    dualSchoolContext,
    AdmissionDashboardController.getAdmissionSettings);

  app.post('/api/admissions/settings',
    passport.authenticate('jwt', { session: false }),
    dualSchoolContext,
    AdmissionDashboardController.updateAdmissionSettings);

  app.get('/api/admissions/branches-status',
    passport.authenticate('jwt', { session: false }),
    dualSchoolContext,
    AdmissionDashboardController.getBranchesAdmissionStatus);

  // Classes endpoint with dual context resolution
  app.get('/api/admissions/classes', 
    passport.authenticate('jwt', { session: false }),
    dualSchoolContext,
    ClassController.getClasses);

  // Application routes with dual context
  app.post('/api/admissions/applications', 
    passport.authenticate('jwt', { session: false }),
    dualSchoolContext,
    enforceBranchContext,
    AdmissionApplicationController.submitApplication);
    
  app.get('/api/admissions/applications', 
    passport.authenticate('jwt', { session: false }), 
    AdmissionApplicationController.getApplications);

  // Public endpoint for checking application status (uses query param due to / in IDs)
  app.get('/api/admissions/applications/status', 
    AdmissionApplicationController.getApplicationStatus);
    
  app.get('/api/admissions/applications/:id', 
    passport.authenticate('jwt', { session: false }), 
    AdmissionApplicationController.getApplication);
    
  app.put('/api/admissions/applications/status', 
    passport.authenticate('jwt', { session: false }), 
    dualSchoolContext,
    AdmissionApplicationController.updateStatus);

  // Workflow routes
  app.post('/api/admissions/workflow/screen', 
    passport.authenticate('jwt', { session: false }), 
    AdmissionWorkflowController.screenApplication);
    
  app.post('/api/admissions/workflow/schedule-exam', 
    passport.authenticate('jwt', { session: false }), 
    AdmissionWorkflowController.scheduleExam);
    
  app.post('/api/admissions/workflow/exam-results', 
    passport.authenticate('jwt', { session: false }), 
    AdmissionWorkflowController.submitExamResults);
    
  app.post('/api/admissions/workflow/admit', 
    passport.authenticate('jwt', { session: false }), 
    AdmissionWorkflowController.admitStudent);
    
  app.get('/api/admissions/workflow/status/:applicant_id', 
    passport.authenticate('jwt', { session: false }), 
    AdmissionWorkflowController.getWorkflowStatus);
};
