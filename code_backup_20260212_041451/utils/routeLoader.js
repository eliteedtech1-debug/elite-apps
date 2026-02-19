/**
 * Simplified Route Loader
 * Loads all routes without strict authentication
 */

const passport = require('passport');

/**
 * Load core application routes
 */
function loadCoreRoutes(app) {
  console.log('🔄 Loading core routes...');
  require('../routes/core_routes')(app);
}

/**
 * Load all main application routes without authentication middleware
 */
function loadMainRoutes(app) {
  console.log('🔄 Loading main application routes...');
  
  const routeFiles = [
    '../routes/user.js',
    '../routes/admission_form.js',
    '../routes/data_entry_form.js',
    '../routes/secondary_school_entrance_form.js',
    '../routes/teachers.js',
    '../routes/class_management.js',
    '../routes/subject_management.js',
    '../routes/admission_number_generator.js',
    '../routes/class_routine.js',
    '../routes/lesson_time_table.js',
    '../routes/examinations.js',
    '../routes/payments.js',
    '../routes/school-setups.js',
    '../routes/class_rooms.js',
    '../routes/school_creation.js',
    '../routes/grades.js',
    '../routes/lessons.js',
    '../routes/student_exam_report.js',
    '../routes/cbt-examinations.js',
    '../routes/exam_table.js',
    '../routes/rules.js',
    '../routes/qr_code.js',
    '../routes/attendance.js',
    '../routes/financial_report.js',
    '../routes/school_admission_form.js',
    '../routes/sections.js',
    '../routes/class_timing.js',
    '../routes/school_location.js',
    '../routes/profiles.js',
    '../routes/assignments.js',
    '../routes/cloudinary.js',
    '../routes/studentPayment.js',
    '../routes/testing.js',
    '../routes/exams-analytics.js',
    '../routes/roll-calls.js',
    '../routes/caAssessmentRoutes.js',
    '../routes/salaryStructure.js',
    '../routes/loanRoutes.js',
    '../routes/SchoolAccessRoutes.js',
    '../routes/app-config.js',
    '../routes/finance-dashboard.js',
    '../routes/enhanced_financial_routes.js',
    '../routes/financial_dashboard_routes.js',
    '../routes/enhanced_income_report.js',
    '../routes/chartOfAccounts.js',
    '../routes/accounting_api.js',
    '../routes/application_status_tracker.js',
    '../routes/notification_service.js',
    '../routes/enhanced_application.js',
    '../routes/admission_analytics.js',
    '../routes/document_management.js',
    '../routes/application_draft.js',
    '../routes/family_billing.js',
    '../routes/payroll.js',
    '../routes/dashboard_override.js',
    '../routes/debug_payment_entries.js',
    '../routes/debug_general_ledger.js',
    '../routes/financial_data_discovery.js',
    '../routes/generate_test_data.js',
    '../routes/debug_payments.js',
    '../routes/ormPayments.js'  // Add ORM payments route
  ];
  
  routeFiles.forEach(routeFile => {
    try {
      require(routeFile)(app);
      console.log(`✅ ${routeFile} loaded`);
    } catch (err) {
      console.log(`⚠️ ${routeFile} not available:`, err.message);
    }
  });
  
  // API routes (without authentication)
  try {
    app.use('/api/accounting/chart-of-accounts', require('../routes/api_chart_of_accounts'));
    console.log('✅ Chart of Accounts API routes loaded');
  } catch (err) {
    console.log('⚠️ Chart of Accounts API routes not available:', err.message);
  }
  
  try {
    app.use('/api/accounting/transactions', require('../routes/api_accounting_transactions'));
    console.log('✅ Simple accounting transactions API loaded');
  } catch (err) {
    console.log('⚠️ Simple accounting transactions API not available:', err.message);
  }
}

/**
 * Load all routes
 */
function loadAllRoutes(app) {
  console.log('🔄 Loading all application routes...');
  loadCoreRoutes(app);
  loadMainRoutes(app);
  console.log('✅ All routes loaded');
}

module.exports = {
  loadAllRoutes,
  loadCoreRoutes,
  loadMainRoutes
};