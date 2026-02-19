require('dotenv').config();
// Load environment variables first to ensure they're available
require('dotenv').config();

const express = require("express");
const passport = require("passport");
const cors = require("cors");
const models = require("./models");
const path = require('path');
const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Completely disable CORS for the public school details endpoint
app.use('/schools/get-details', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  //res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-School-Id, X-Branch-Id, X-User-Id, X-User-Type');
  // Handle preflight requests for this specific route
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
// Zero CORS restrictions and disable caching for the public schools/get-details endpoint
app.use('/schools/get-details', (req, res, next) => {
  // Set CORS headers for all requests to this endpoint - allow ALL origins
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Prevent caching - important for the public schools/get-details endpoint
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  // Handle preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Handle preflight requests for all other routes
app.options('*', (req, res) => {
  // Get the origin from the request
  const origin = req.headers.origin;
  // Allow all origins, but only if they match our allowed domains pattern
  if (origin) {
    // For local development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      // For production, allow any subdomain of our main domain
      const allowedDomains = ['elitescholar.ng', 'brainstorm.ng'];
      const isAllowed = allowedDomains.some(domain => origin.includes(domain));
      if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin);
      } else {
        res.header('Access-Control-Allow-Origin', '*');
      }
    }
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-School-Id, X-Branch-Id, X-User-Id, X-User-Type');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// For all other routes, use dynamic CORS that allows subdomains
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost requests for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow all subdomains of our main domains
    const allowedDomains = ['elitescholar.ng', 'brainstorm.ng'];
    const isAllowed = allowedDomains.some(domain => origin.includes(domain));
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    // For security, we'll still allow all origins but you can restrict this more if needed
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-School-Id", "X-Branch-Id", "X-User-Id", "X-User-Type"],
}));
// Initialize Passport.js
app.use(passport.initialize());

// School ID and Branch ID injector middleware
app.use((req, res, next) => {
  try {
    // Extract headers (case-insensitive)
    const headerSchoolId = req.headers['x-school-id'] || req.headers['X-School-Id'] || req.headers['X-School-ID'];
    const headerBranchId = req.headers['x-branch-id'] || req.headers['X-Branch-Id'] || req.headers['X-Branch-ID'];
    const headerUserId = req.headers['x-user-id'] || req.headers['X-User-Id'] || req.headers['X-User-ID'];
    const headerUserType = req.headers['x-user-type'] || req.headers['X-User-Type'] || req.headers['X-User-TYPE'];
    
    // Skip header injection for specific public routes
    const isPublicRoute = req.path === '/schools/get-details';
    
    // Ensure req.user exists
    if (!req.user) req.user = {};
    if (!req.body) req.body = {};
    if (!req.query) req.query = {};
    
    // Only inject headers if the corresponding values are not already present in the request
    // And only if this is not a public route that should not have headers injected
    if (!isPublicRoute) {
      if (headerSchoolId && !req.body.school_id && !req.query.school_id && !req.user.school_id) {
        req.user.school_id = headerSchoolId;
        req.body.school_id = headerSchoolId;
        req.query.school_id = headerSchoolId;
      }
      if (headerBranchId && !req.body.branch_id && !req.query.branch_id && !req.user.branch_id) {
        req.user.branch_id = headerBranchId;
        req.body.branch_id = headerBranchId;
        req.query.branch_id = headerBranchId;
      }
      if (headerUserId && !req.body.user_id && !req.query.user_id && !req.user.id) {
        req.user.id = headerUserId;
        req.body.user_id = headerUserId;
        req.query.user_id = headerUserId;
      }
      if (headerUserType && !req.body.user_type && !req.query.user_type && !req.user.user_type) {
        req.user.user_type = headerUserType;
        req.body.user_type = headerUserType;
        req.query.user_type = headerUserType;
      }
    }

    next();
  } catch (error) {
    console.error('❌ Header injection error:', error);
    // Never block requests - always continue
    next();
  }
});

// Port setup - use configured port or default to 34567
const port = process.env.PORT || 34567;

// Serve static files from the public directory
app.use('/static', express.static(path.join(__dirname, 'public')));

// Force model synchronization
models.sequelize.sync().then(() => {
  console.log("Database synced");
});

// Passport configuration
require("./config/passport")(passport);

// Default route
app.get("/", (req, res) => res.send("Hello my World"));

// Load routes
require("./routes/user.js")(app);
require("./routes/admission_form.js")(app);
require("./routes/data_entry_form.js")(app);
require("./routes/secondary_school_entrance_form.js")(app);
require("./routes/teachers.js")(app);
require("./routes/class_management.js")(app);
require("./routes/subject_management.js")(app);
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
require("./routes/student_exam_report.js")(app);
require("./routes/cbt-examinations.js")(app);
require("./routes/exam_table.js")(app);
require("./routes/rules.js")(app);
require("./routes/qr_code.js")(app);
require("./routes/attendance.js")(app);
require("./routes/financial_report.js")(app);
require("./routes/school_admission_form.js")(app);
require("./routes/sections.js")(app);
require("./routes/class_timing.js")(app);
require("./routes/school_location.js")(app);
require("./routes/profiles.js")(app);
require("./routes/assignments.js")(app);
require("./routes/cloudinary.js")(app);
require("./routes/studentPayment.js")(app);
require("./routes/testing.js")(app);

// Additional routes that were in the previous version but not in src
require("./routes/paystackRoutes.js")(app);
require("./routes/subjects.js")(app);
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
require("./routes/api_custom_items.js")(app);
require("./routes/supportRouteLoader.js")(app);

//create a server
var server = app.listen(port, function () {
  var host = "0.0.0.0";
  var port = server.address().port;
  console.log("App listening at http://%s:%s", host, port);
});
