const { payments,
     getPayments,
     createTransaction,
     updateTransactionStatus,
     receiptUrls,
     schoolRevenues,
     genericSchoolFees,
     singleschoolRevenues,
     schoolFeesProgress,
     revenueExpenditureReport,
     getSchoolRevenues,
     testPaymentEntries,
     testDirectQuery } = require("../controllers/payments");
const passport = require('passport');
const { smartAuth, passportWithFallback, devAuth } = require('../middleware/flexibleAuth');
module.exports = (app) => {

    // Note: Global authentication is now applied in index.js
    // Individual routes no longer need manual authentication middleware
    
    app.post(
        "/payments",

    passport.authenticate('jwt', { session: false }),
        //    config.authRequest - handled globally
        payments
    );
    app.get("/payments",

    passport.authenticate('jwt', { session: false }),
        getPayments
    )
    app.post("/school/revenues", 
        passport.authenticate('jwt', { session: false }),
         schoolRevenues)
    app.get("/school/revenues", 
        
        passport.authenticate('jwt', { session: false }),
        (req, res, next) => {
        // Temporarily remove authentication for testing
        // Mock user object if not authenticated
        if (!req.user) {
            req.user = {
                school_id: req.query.school_id ,
                branch_id: req.query.branch_id
            };
        }
        getSchoolRevenues(req, res);
    });

    app.get("/single/revenues",
        (req, res, next) => {
            req.body = req.query;
            singleschoolRevenues(req, res);
        });

    // Route for creating transactions (single or bulk)
    app.post('/payments/create', createTransaction);

    // Route for updating transaction status
    app.post('/payments/update', updateTransactionStatus);
    app.post(
        "/receipt-urls",
        //    config.authRequest
        passport.authenticate('jwt', {session: false}),
        receiptUrls
    );

    app.post("/payments/generic-school-fees",
        passport.authenticate('jwt', {session: false}),
        genericSchoolFees
    );
    app.get("/payments/generic-school-fees",
        passport.authenticate('jwt', {session: false}),
        (req, res, next) => {
            req.body = req.query;
            genericSchoolFees(req, res);
        }
    )
    app.post("/payments/school-fees-progress",
        passport.authenticate('jwt', {session: false}),
        schoolFeesProgress
    );
    
    // GET route for school fees progress (for frontend compatibility)
    app.get("/payments/school-fees-progress", 
        (req, res, next) => {
            // Set CORS headers explicitly
            res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-School-Id,X-Branch-Id,Accept,Origin,Cache-Control,X-Requested-With,Referer,Sec-Ch-Ua,Sec-Ch-Ua-Mobile,Sec-Ch-Ua-Platform,User-Agent,X-User-Id,X-User-Type');
            res.header('Access-Control-Allow-Credentials', 'true');
            
            // Provide default date range if not specified
            const currentYear = new Date().getFullYear();
            const defaultStartDate = `${currentYear}-01-01`;
            const defaultEndDate = `${currentYear}-12-31`;
            
            req.body = {
                startDate: req.query.startDate || defaultStartDate,
                endDate: req.query.endDate || defaultEndDate
            };
            
            console.log('🔍 School fees progress called with user:', req.user);
            console.log('🔍 Date range:', req.body);
            
            schoolFeesProgress(req, res);
        }
    );
    app.post('/payments/revenue-expenditure', 
           passport.authenticate('jwt', {session: false}),
        revenueExpenditureReport
    );
    
    // GET route for revenue expenditure report (for frontend compatibility)
    app.get('/payments/revenue-expenditure', 
        (req, res, next) => {
            // Set CORS headers explicitly
            res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-School-Id,X-Branch-Id,Accept,Origin,Cache-Control,X-Requested-With,Referer,Sec-Ch-Ua,Sec-Ch-Ua-Mobile,Sec-Ch-Ua-Platform,User-Agent,X-User-Id,X-User-Type');
            res.header('Access-Control-Allow-Credentials', 'true');
            
            // Provide default date range if not specified
            const currentYear = new Date().getFullYear();
            const defaultStartDate = `${currentYear}-01-01`;
            const defaultEndDate = `${currentYear}-12-31`;
            
            req.body = {
                startDate: req.query.startDate || defaultStartDate,
                endDate: req.query.endDate || defaultEndDate
            };
            
            console.log('🔍 Revenue expenditure called with user:', req.user);
            console.log('🔍 Date range:', req.body);
            
            revenueExpenditureReport(req, res);
        }
    );

    // Additional convenience routes for common GET operations
    app.get('/payments/student/:admission_no',
        passport.authenticate('jwt', {session: false}),
        (req, res) => {
            req.query.query_type = 'select-student';
            req.query.admission_no = req.params.admission_no;
            getPayments(req, res);
        }
    );

    app.get('/payments/class/:class_name/bills',
        passport.authenticate('jwt', {session: false}),
        (req, res) => {
            req.query.query_type = 'select-bills';
            req.query.class_name = req.params.class_name;
            getPayments(req, res);
        }
    );

    app.get('/payments/reference/:ref_no',
        passport.authenticate('jwt', {session: false}),
        (req, res) => {
            req.query.query_type = 'select-ref';
            req.query.ref_no = req.params.ref_no;
            getPayments(req, res);
        }
    );

    app.get('/payments/balance/:admission_no',
        passport.authenticate('jwt', {session: false}),
        (req, res) => {
            req.query.query_type = 'balance';
            req.query.admission_no = req.params.admission_no;
            getPayments(req, res);
        }
    );

    // Test endpoint for debugging
    app.get('/payments/test',
        passport.authenticate('jwt', {session: false}),
        testPaymentEntries
    );

    // Direct query test endpoint
    app.get('/payments/test-direct',
        passport.authenticate('jwt', {session: false}),
        testDirectQuery
    );

    // Test endpoint for payments without authentication (for debugging)
    app.get('/payments/test-no-auth', (req, res) => {
        // Mock user object for testing
        req.user = {
            school_id: req.query.school_id || 'SCH/1',
            branch_id: req.query.branch_id || null
        };
        
        // Don't override query_type, use what's provided
        getPayments(req, res);
    });

    // Temporary bypass for main payments endpoint (for debugging)
    app.get('/payments/bypass-auth', (req, res) => {
        // Mock user object for testing
        req.user = {
            school_id: req.query.school_id || 'SCH/1',
            branch_id: req.query.branch_id || null
        };
        
        console.log('🔍 Bypass auth endpoint called with query:', req.query);
        console.log('🔍 Mock user:', req.user);
        
        // Call the same function as the main endpoint
        getPayments(req, res);
    });

    // Test endpoint specifically for the summary query type (no auth required)
    app.get('/payments/test-summary', (req, res) => {
        // Set CORS headers explicitly
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-School-Id,X-Branch-Id');
        res.header('Access-Control-Allow-Credentials', 'true');
        
        // Mock user object for testing
        req.user = {
            school_id: req.query.school_id || req.headers['x-school-id'] || 'SCH/1',
            branch_id: req.query.branch_id || req.headers['x-branch-id'] || null
        };
        
        // Force query_type to summary
        req.query.query_type = 'summary';
        
        console.log('🔍 Test summary endpoint called with query:', req.query);
        console.log('🔍 Mock user:', req.user);
        console.log('🔍 Headers:', req.headers);
        
        // Call the same function as the main endpoint
        getPayments(req, res);
    });

    // CORS preflight handler for payments endpoints
    app.options('/payments*', (req, res) => {
        console.log('🔍 CORS OPTIONS request for payments:', req.path);
        console.log('🔍 Origin:', req.headers.origin);
        console.log('🔍 Requested headers:', req.headers['access-control-request-headers']);
        
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-School-Id,X-Branch-Id,Accept,Origin,Cache-Control,X-Requested-With,Referer,Sec-Ch-Ua,Sec-Ch-Ua-Mobile,Sec-Ch-Ua-Platform,User-Agent,X-User-Id,X-User-Type');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400');
        res.status(200).end();
    });
};

