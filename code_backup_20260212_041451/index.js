require('dotenv').config();

const express = require("express");
const http = require('http');
const passport = require("passport");
const models = require("./models");
const path = require('path');
const compression = require('compression');
const { setupCorsAuthFix } = require('./middleware/corsAuthFix');

// Import services
const { redisConnection } = require('./utils/redisConnection');
const socketService = require('./services/socketService');
const firebaseService = require('./services/firebaseService');

const app = express();
const server = http.createServer(app);

// Initialize services
socketService.initialize(server);
firebaseService.initialize();

// Disable ETag to prevent caching issues with user-specific data
app.set('etag', false);

// Middleware - compression first for best performance
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balance between compression speed and ratio
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Request ID middleware for audit trail
const { requestIdMiddleware } = require('./middleware/auditMiddleware');
app.use(requestIdMiddleware);

// Apply enhanced CORS and auth fix middleware
setupCorsAuthFix(app);

// School ID and Branch ID injector middleware - injects for both public and private routes as needed
app.use((req, res, next) => {
  try {
    // Extract headers (case-insensitive) - these are the ones provided by the client
    const headerSchoolId = req.headers['x-school-id'] || req.headers['X-School-Id'] || req.headers['X-School-ID'];
    const headerBranchId = req.headers['x-branch-id'] || req.headers['X-Branch-Id'] || req.headers['X-Branch-ID'];
    const headerUserId = req.headers['x-user-id'] || req.headers['X-User-Id'] || req.headers['X-User-ID'];
    const headerUserType = req.headers['x-user-type'] || req.headers['X-User-Type'] || req.headers['X-User-Type'];
    const headerAdminNeedsBranch = req.headers['x-admin-needs-branch'] || req.headers['X-Admin-Needs-Branch'];
    
    // Check if current path is public using the centralized config
    const { isPublicPath } = require('./config/publicRoutes');
    const environment = process.env.NODE_ENV || 'development';
    const isPublicRoute = isPublicPath(req.path, environment);
    
    // Ensure req.user exists
    if (!req.user) req.user = {};
    if (!req.body) req.body = {};
    if (!req.query) req.query = {};
    
    // Extract and store headers for public routes as well (as they should accept these headers)
    // For public routes, we store the headers but don't necessarily use them for injection
    if (isPublicRoute) {
      // Handle x-school-id header (not compulsory but when provided allow them to pass)
      if (headerSchoolId) {
        req.user.school_id = headerSchoolId;
        // Don't overwrite body/query if they already have school_id (frontend may send it directly)
        if (!req.body.school_id) req.body.school_id = headerSchoolId;
        if (!req.query.school_id) req.query.school_id = headerSchoolId;
      }
      
      // Handle x-admin-needs-branch header with value 'true'
      if (headerAdminNeedsBranch && headerAdminNeedsBranch.toString().toLowerCase() === 'true') {
        req.user.admin_needs_branch = true;
        // Don't overwrite if already present in body/query
        if (req.body.admin_needs_branch === undefined) req.body.admin_needs_branch = true;
        if (req.query.admin_needs_branch === undefined) req.query.admin_needs_branch = true;
      }
      
      // Store other headers as well (don't overwrite existing body/query values)
      if (headerBranchId) {
        req.user.branch_id = headerBranchId;
        if (!req.body.branch_id) req.body.branch_id = headerBranchId;
        if (!req.query.branch_id) req.query.branch_id = headerBranchId;
      }
      if (headerUserId) {
        req.user.id = headerUserId;
        if (!req.body.user_id) req.body.user_id = headerUserId;
        if (!req.query.user_id) req.query.user_id = headerUserId;
      }
      if (headerUserType) {
        req.user.user_type = headerUserType;
        if (!req.body.user_type) req.body.user_type = headerUserType;
        if (!req.query.user_type) req.query.user_type = headerUserType;
      }
    } else {
      // For private routes, headers ALWAYS override (to support super admin)
      if (headerSchoolId) {
        req.user.school_id = headerSchoolId;
        // Only inject into body/query if they don't already exist
        if (!req.body.school_id) req.body.school_id = headerSchoolId;
        if (!req.query.school_id) req.query.school_id = headerSchoolId;
      }
      if (headerBranchId) {
        req.user.branch_id = headerBranchId;
        if (!req.body.branch_id) req.body.branch_id = headerBranchId;
        if (!req.query.branch_id) req.query.branch_id = headerBranchId;
      }
      if (headerUserId) {
        req.user.id = headerUserId;
        if (!req.body.user_id) req.body.user_id = headerUserId;
        if (!req.query.user_id) req.query.user_id = headerUserId;
      }
      if (headerUserType) {
        req.user.user_type = headerUserType;
        if (!req.body.user_type) req.body.user_type = headerUserType;
        if (!req.query.user_type) req.query.user_type = headerUserType;
      }
    }

    next();
  } catch (error) {
    console.error('❌ Header injection error:', error);
    // Never block requests - always continue
    next();
  }
});

// Initialize Passport.js
app.use(passport.initialize());



// Port setup - use configured port from environment variable
const port = process.env.PORT || 34567; // Default to 34567 if no PORT is set

// Serve static files from the public directory
app.use('/static', express.static(path.join(__dirname, 'public')));

// Serve uploaded files (recitations, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize comprehensive logging system BEFORE model sync to ensure proper logging setup
const { initializeLogging } = require('./logging/initializeLogging');
initializeLogging(app, models).catch(err => {
    console.error('❌ Failed to initialize logging system:', err.message);
});

// Force model synchronization with better error handling
let syncAttempts = 0;
const maxSyncAttempts = 3;

const attemptSync = async () => {
  try {
    syncAttempts++;
    console.log(`🔄 Attempting database sync (attempt ${syncAttempts}/${maxSyncAttempts})...`);
    
    // Test all database connections
    const { testConnections } = require('./config/databases');
    const connectionResults = await testConnections();
    
    // Sync main database
    await models.sequelize.sync();
    console.log("✅ Main database synced successfully");
    
    // Sync audit database if configured
    if (connectionResults.audit) {
      const auditDB = require('./models/audit');
      await auditDB.sequelize.sync();
      console.log("✅ Audit database synced successfully");
    }
    
    // Sync AI database if configured
    if (connectionResults.ai) {
      const aiDB = require('./models/ai');
      await aiDB.sequelize.sync();
      console.log("✅ AI database synced successfully");
    }
    
    return true;
  } catch (err) {
    console.error(`❌ SEQUELIZE SYNC FAILED (attempt ${syncAttempts}):`, err);
    
    // Check if it's a connection manager error during shutdown
    if (err.message && err.message.includes('ConnectionManager was closed')) {
      console.log('💾 Database connection was closed during sync - this is expected during shutdown');
      return false;
    }
    
    // If we haven't reached max attempts, wait and retry
    if (syncAttempts < maxSyncAttempts) {
      console.log(`⏳ Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return attemptSync();
    }
    
    // For other errors after max attempts, exit the process
    console.error('💥 Critical database sync error after max attempts - exiting process');
    process.exit(1);
  }
};

// Start the sync process
attemptSync();

// Passport configuration
require("./config/passport")(passport);

// Default route
app.get("/", (req, res) => res.send("Hello my World"));

// Load routes
require("./routes/user.js")(app);
app.use("/file-upload", require("./routes/fileUpload"));
require("./routes/secureUserRoutes.js")(app);
require("./routes/sessionManagement.js")(app);
require("./routes/admission_form.js")(app);
require("./routes/data_entry_form.js")(app);
require("./routes/secondary_school_entrance_form.js")(app);
require("./routes/teachers.js")(app);
require("./routes/class_management.js")(app);
// OLD: require("./routes/subject_management.js")(app); // DEPRECATED - Replaced by enhanced subjects controller
require("./routes/admission_number_generator.js")(app);
require("./routes/class_routine.js")(app);
require("./routes/lesson_time_table.js")(app);
require("./routes/examinations.js")(app);
require("./routes/payments.js")(app);
require("./routes/school-setups.js")(app);
require("./routes/class_rooms.js")(app);
require('./routes/school_creation.js')(app);
require("./routes/grades.js")(app);
require("./routes/lessons.js")(app);
// require("./routes/lessonPlans.js")(app);
require("./routes/lessonNotes.js")(app);
require("./routes/syllabusRoutes.js")(app);
require("./routes/student_exam_report.js")(app);
require("./routes/cbt-examinations.js")(app);
require("./routes/exam_table.js")(app);
require("./routes/rules.js")(app);
require("./routes/qr_code.js")(app);
require("./routes/attendance.js")(app);
require("./routes/financial_report.js")(app);
require("./routes/school_admission_form.js")(app);
require("./routes/admissions.js")(app);
app.use('/api/admission-tokens', require('./routes/admissionTokens'));
app.use('/api/admission-branches', require('./routes/admissionBranches'));
require("./routes/sections.js")(app);
require("./routes/class_timing.js")(app);
require("./routes/school_location.js")(app);

// Add alias for school-location
const branchRoutes = require('./routes/branchRoutes');
app.use('/api/school-location', branchRoutes);

// Credit Balance Management Routes
app.use('/api/credit-balance', require('./routes/creditBalance'));

// Notifications Routes (NEW - elite_logs based)
app.use('/api/system', require('./routes/systemNotifications'));

// Legacy notifications route (OLD - deprecated)
// app.use('/api/system/notifications', require('./routes/notifications'));

// Roles Routes
app.use('/api/roles', require('./routes/roles'));

require("./routes/profiles.js")(app);
require("./routes/assignments.js")(app);
app.use('/api/syllabus', require('./routes/syllabus'));
app.use('/api/teacher-lesson-plans', require('./routes/teacherLessonPlans'));
// app.use('/api/v1/lesson-plans', require('./routes/enhancedLessonPlans'));
app.use('/api/v1/syllabus', require('./routes/syllabusIntegration'));
app.use('/api/v1/curriculum', require('./routes/curriculumScraping'));
app.use('/api/v1/subject-mapping', require('./routes/subjectMapping'));
app.use('/api/v1/lesson-plans', require('./routes/lessonPlans'));
app.use('/api/v1/ai-questions', require('./routes/aiQuestions'));
app.use('/api/system', require('./routes/systemNotifications'));
app.use('/api', require('./routes/search_routes'));
app.use('/api', require('./routes/audit'));
app.use('/api/v1/assessments', require('./routes/assessments'));

// Test route for files.elitescholar.ng pilot
app.use('/api/file-upload', require('./routes/fileUpload'));
require("./routes/cloudinary.js")(app);
require("./routes/studentPayment.js")(app);
require("./routes/overpayment.js")(app);
require("./routes/test-payment.js")(app);
require("./routes/student_promotion.js")(app);
require("./routes/testing.js")(app);

// Additional routes that were in the previous version but not in src
require("./routes/paystackRoutes.js")(app);
require("./routes/subjects.js")(app);
require("./routes/predefinedSubjects.js")(app);
require("./routes/timetableGenerator.js")(app);
require("./routes/studentAttendance.js")(app);
require("./routes/exams-analytics.js")(app);
require("./routes/roll-calls.js")(app);
require("./routes/caAssessmentRoutes.js")(app);
require("./routes/salaryStructure.js")(app);
require("./routes/loanRoutes.js")(app);
require("./routes/SchoolAccessRoutes.js")(app);
require("./routes/app-config.js")(app);
require("./routes/finance-dashboard.js")(app);
require("./routes/enhanced_financial_routes.js")(app);
require("./routes/financial_dashboard_routes.js")(app);
require("./routes/enhanced_income_report.js")(app);
require("./routes/chartOfAccounts.js")(app);
require("./routes/accounting_api.js")(app);
require("./routes/application_status_tracker.js")(app);
require("./routes/notification_service.js")(app);
require("./routes/enhanced_application.js")(app);
require("./routes/admission_analytics.js")(app);
require("./routes/document_management.js")(app);
require("./routes/application_draft.js")(app);
require("./routes/family_billing.js")(app);
require("./routes/payroll.js")(app);
require("./routes/dashboard_override.js")(app);
require("./routes/ormPayments.js")(app);
require("./routes/feesSetupEnhanced.js")(app);
require("./routes/studentPaymentEnhanced.js")(app);
require("./routes/gaapCompliance.js")(app);
require("./routes/api_custom_items.js")(app);
require("./routes/studentDetails.js")(app);
require("./routes/supportRouteLoader.js")(app);
require("./routes/reportConfiguration.js")(app);
require("./routes/schoolSettings.js")(app);
require("./routes/debug_routes.js")(app);
require("./routes/financial_analytics_pdf.js")(app);
require("./routes/subscription_billing.js")(app);
require("./routes/dashboardRoutes.js")(app); // Dashboard API endpoints
require("./routes/paymentRoutes.js")(app);
require("./routes/companyInfo.js")(app);

// General Query Routes - for select-all and select operations with branch filtering
app.use('/api/general-query', require('./routes/generalQuery'));

// Communications Routes
app.use('/api/communications', require('./routes/communications'));

// Virtual Classroom Routes
app.use('/api/virtual-classroom', require('./routes/virtualClassroom'));

// Supply Management Routes - Now properly structured to work under /api prefix
require('./routes/supplyManagement')(app);
app.use('/api/dashboard', require('./routes/assetManagement/assetDashboardRoutes'));

// Branch Routes
app.use('/api/branch', require('./routes/branchRoutes'));

// RBAC Routes - Role-Based Access Control
app.use('/api/rbac', require('./routes/rbac'));

// SuperAdmin Routes - Mounted under /api/superadmin
const superadminRouter = require('express').Router();
superadminRouter.use(passport.authenticate('jwt', { session: false }));
require('./routes/superadminRoutes')(superadminRouter);
app.use('/api/superadmin', superadminRouter);

// CA Groups Routes - for managing CA groups with grade boundaries
app.use('/api/v2/ca-groups', passport.authenticate('jwt', { session: false }), require('./routes/caGroups'));

// Parent Reports Routes - for checking report availability
app.use('/api/parent-reports', require('./routes/parentReportsRoutes'));

// SMS Service Routes - for sending SMS via eBulkSMS
app.use('/api', require('./routes/sms_service'));

// WhatsApp Service Routes - for sending free WhatsApp messages
app.use('/api', require('./routes/whatsapp_service'));

// WhatsApp System Configuration Routes - for developer configuration
app.use('/api/whatsapp', require('./routes/whatsapp_system_config'));

// Email Service Routes - for sending email receipts
app.use('/api', require('./routes/email_service'));

// Reminder Service Routes - for payment reminders
app.use('/api', require('./routes/reminder_service'));

// Invoice Service Routes - for bulk invoice sending
app.use('/api', require('./routes/invoice_service'));

// Communication Setup Routes - for managing subscriptions and costs
app.use('/api', require('./routes/communication_setup'));

// Messaging History Routes - for tracking sent messages
app.use('/api', require('./routes/messaging_history'));

// Account Activation Routes - for OTP-based account activation
app.use('/api/auth/activation', require('./routes/accountActivation'));

// Simple Account Activation Routes - simplified OTP-based activation without stored procedures
app.use('/api/auth/simple', require('./routes/simpleAccountActivation'));

// Student Subjects Routes - for managing student selective subject assignments
app.use('/api/student-subjects', require('./routes/studentSubjectsRoutes'));

// School Bank Accounts Management
app.use('/api/bank-accounts', require('./routes/schoolBankAccounts'));

// Payment Gateway Configuration Management
app.use('/api/payment-gateway-config', require('./routes/paymentGatewayConfig'));

// ID Card Management Routes - Template management and card generation
app.use('/api/id-cards', require('./routes/idCards'));
app.use('/api/id-card-generation', require('./routes/idCardGeneration'));
app.use('/api/id-card-templates', require('./routes/idCardTemplates'));
app.use('/api/id-card-financial', require('./routes/idCardFinancial'));

// Staff Attendance Routes - GPS-based attendance system
app.use('/api/staff-attendance', require('./routes/staffAttendanceRoutes'));

// GPS Configuration Routes - GPS setup and management
app.use('/api/gps-config', require('./routes/gpsConfigRoutes'));

// Attendance Configuration Routes - Check-in/out times, overtime, penalties
app.use('/api', require('./routes/attendanceConfig'));

// CA/Exam Process Routes - Question submission and moderation workflow
app.use('/api', require('./routes/ca_exam_routes'));

// Direct ca-setup route (without /api prefix for compatibility)
const caExamProcessController = require('./controllers/caExamProcessController');
const { authenticateToken } = require('./middleware/auth');
app.put('/ca-setup', authenticateToken, caExamProcessController.updateCASetupBulk);

// RBAC Routes
app.use('/api', require('./routes/rbac'));

// Recitation Routes
app.use('/api/recitations', require('./routes/recitations'));

// Remarks Routes - Form Master and Teacher remarks
app.use('/remarks', require('./routes/remarks'));

// Exam Remarks Routes - End of term teacher/principal remarks
app.use('/exam-remarks', require('./routes/exam-remarks'));

// Redis initialization and health check
async function initializeRedis() {
  try {
    console.log('🔄 Initializing Redis connection...');
    await redisConnection.initialize();

    const isHealthy = await redisConnection.isHealthy();
    if (isHealthy) {
      console.log('✅ Redis is healthy and connected');
      return true;
    } else {
      console.log('⚠️ Redis connection failed, application will run without queue functionality');
      return false;
    }
  } catch (error) {
    console.log('⚠️ Redis is not available, application will run without queue functionality');
    console.log('   Queue operations (email, SMS, WhatsApp) will be degraded or disabled');
    return false;
  }
}

// Start queue workers only if Redis is available
async function startQueueWorkers() {
  try {
    const redisAvailable = await redisConnection.isHealthy();

    if (!redisAvailable) {
      console.log('⚠️ Skipping queue workers - Redis not available');
      return false;
    }

    console.log('🔄 Starting queue workers...');

    // Start email worker
    try {
      require('./queues/emailWorker');
      console.log('✅ Email worker started');
    } catch (err) {
      console.error('❌ Email worker failed:', err.message);
    }

    // Start SMS worker
    try {
      require('./queues/smsWorker');
      console.log('✅ SMS worker started');
    } catch (err) {
      console.error('❌ SMS worker failed:', err.message);
    }

    // Start WhatsApp worker
    try {
      require('./queues/whatsappWorker');
      console.log('✅ WhatsApp worker started');
    } catch (err) {
      console.error('❌ WhatsApp worker failed:', err.message);
    }

    return true;
  } catch (error) {
    console.error('❌ Error starting queue workers:', error.message);
    return false;
  }
}

//create a server
server.listen(port, async function () {
  var host = "0.0.0.0";
  var port = server.address().port;
  console.log("App listening at http://%s:%s", host, port);

  // Initialize Redis connection (with graceful degradation if unavailable)
  const redisInitialized = await initializeRedis();

  // Initialize cache service
  try {
    const cacheService = require('./services/cacheService');
    await cacheService.connect();
    console.log('✅ Cache service initialized');
  } catch (error) {
    console.error('❌ Cache service unavailable (will work without caching):', error.message);
  }

  // Initialize reminder cron jobs
  try {
    require('./cron/reminderCron');
    console.log('✅ Reminder cron jobs initialized');
  } catch (error) {
    console.error('❌ Failed to initialize reminder cron:', error);
  }

  // Start queue workers only if Redis is available
  if (redisInitialized) {
    await startQueueWorkers();
  } else {
    // Retry starting workers after a delay in case Redis connects later
    setTimeout(async () => {
      console.log('🔄 Retrying queue workers after Redis delay...');
      const redisHealthy = await redisConnection.isHealthy();
      if (redisHealthy) {
        await startQueueWorkers();
      }
    }, 3000); // 3 second delay
  }

  // Start subscription scheduler for automatic expiry handling
  try {
    const subscriptionScheduler = require('./services/subscriptionScheduler');
    subscriptionScheduler.start();
    console.log('✅ Subscription scheduler started successfully');
  } catch (error) {
    console.error('❌ Failed to start subscription scheduler:', error);
  }

  // Start role expiration scheduler
  try {
    const roleExpirationScheduler = require('./services/roleExpirationScheduler');
    roleExpirationScheduler.start();
    console.log('✅ Role expiration scheduler started successfully');
  } catch (error) {
    console.error('❌ Failed to start role expiration scheduler:', error);
  }
});
server.timeout = 120000;

// ============================================================================
// Centralized Graceful Shutdown Handler
// ============================================================================
let isShuttingDown = false;
let activeRequests = 0;
let isDatabaseShuttingDown = false;

// Middleware to track active requests
app.use((req, res, next) => {
  activeRequests++;
  res.on('finish', () => {
    activeRequests--;
  });
  res.on('close', () => {
    activeRequests--;
  });
  next();
});

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('⚠️ Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  try {
    // Step 1: Stop accepting new connections
    console.log('📡 Preventing new connections...');
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Step 2: Wait for active requests to finish (with timeout)
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    console.log(`⏳ Waiting for ${activeRequests} active requests to finish...`);
    while (activeRequests > 0 && waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
      if (activeRequests > 0 && waited % 5000 === 0) { // Log every 5 seconds
        console.log(`⏳ Still waiting for ${activeRequests} active requests...`);
      }
    }

    if (activeRequests > 0) {
      console.log(`⚠️  Timeout waiting for ${activeRequests} requests to finish. Continuing with shutdown...`);
    } else {
      console.log('✅ All active requests completed.');
    }

    // Step 3: Wait for queues to finish current jobs (with timeout)
    console.log('⏳ Waiting for queues to finish current jobs (max 10s)...');
    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 10000)), // 10s timeout
      Promise.all([
        // Queues will finish their current jobs
        new Promise((resolve) => setTimeout(resolve, 1000))
      ])
    ]);

    // Step 4: Close queue connections (in order)
    try {
      console.log('📧 Closing email queue...');
      const emailQueue = require('./queues/emailQueue');
      if (emailQueue && typeof emailQueue.emailQueue === 'function') {
        const queue = emailQueue.emailQueue();
        if (queue && queue.close) {
          await queue.close();
        }
      }
    } catch (err) {
      console.log('⚠️ Email queue already closed or not available');
    }

    try {
      console.log('📱 Closing SMS queue...');
      const smsQueue = require('./queues/smsQueue');
      if (smsQueue && typeof smsQueue.smsQueue === 'function') {
        const queue = smsQueue.smsQueue();
        if (queue && queue.close) {
          await queue.close();
        }
      }
    } catch (err) {
      console.log('⚠️ SMS queue already closed or not available');
    }

    try {
      console.log('💬 Closing WhatsApp queue...');
      const whatsappQueue = require('./queues/whatsappQueue');
      if (whatsappQueue && typeof whatsappQueue.whatsappQueue === 'function') {
        const queue = whatsappQueue.whatsappQueue();
        if (queue && queue.close) {
          await queue.close();
        }
      }
    } catch (err) {
      console.log('⚠️ WhatsApp queue already closed or not available');
    }

    // Step 5: Close Redis connection (after all queues are closed)
    try {
      console.log('🔒 Closing Redis connection...');
      await redisConnection.disconnect();
    } catch (err) {
      console.log('⚠️ Redis connection already closed or not available');
    }

    // Step 6: Stop database logging and interception before closing connections
    try {
      console.log('🛑 Stopping database logging...');
      isDatabaseShuttingDown = true;
      
      // Stop database logger first
      const DatabaseLogger = require('./logging/DatabaseLogger');
      if (DatabaseLogger && typeof DatabaseLogger.stop === 'function') {
        DatabaseLogger.stop();
        console.log('✅ Database logger stopped');
      }
      
      // Stop database query interceptor
      try {
        const { DatabaseQueryInterceptor } = require('./middleware/databaseQueryInterceptor');
        if (DatabaseQueryInterceptor && typeof DatabaseQueryInterceptor.stop === 'function') {
          DatabaseQueryInterceptor.stop();
          console.log('✅ Database query interceptor stopped');
        }
      } catch (interceptorErr) {
        console.log('⚠️ Database query interceptor not available or already stopped');
      }
      
      // Wait a moment for any ongoing operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      console.log('⚠️ Error stopping database logging (continuing with shutdown):', err.message);
    }

    // Step 7: Close database connections
    try {
      console.log('💾 Closing database connections...');
      
      // Check if connection manager is still open
      if (models.sequelize && models.sequelize.connectionManager && !models.sequelize.connectionManager.isClosed) {
        await models.sequelize.close();
        console.log('✅ Database connections closed');
      } else {
        console.log('✅ Database connections already closed');
      }
    } catch (err) {
      if (err.message.includes('ConnectionManager was closed')) {
        console.log('✅ Database connections already closed');
      } else {
        console.error('❌ Error closing database:', err.message);
      }
    }

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});
