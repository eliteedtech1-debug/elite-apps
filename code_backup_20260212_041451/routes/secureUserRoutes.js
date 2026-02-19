const express = require('express');
const passport = require('passport');
const config = require('../config/config');
const { allowOnly, reqSubDomain } = require('../services/routesHelper');

// Import original user controller for login functions
const {
  login,
  studentLogin
} = require('../controllers/user');

// Import enhanced security middleware
const {
  loginSecurityStack,
  securityHeaders
} = require('../middleware/enhancedSecurity');

// Import header injector middleware
const { headerInjector } = require('../middleware/headerInjector');

// Import original controllers for non-login endpoints
const {
  create,
  findAllUsers,
  findById,
  update,
  deleteUser,
  verifyToken,
  compose_sms,
  superadminLogin
} = require('../controllers/user');

module.exports = (app) => {
  const router = express.Router();

  // Apply security headers to all routes
  router.use(securityHeaders);

  // ===== SECURE LOGIN ENDPOINTS =====
  
  /**
   * User login with security middleware applied
   */
  router.post('/login', 
    loginSecurityStack,  // Apply security middleware
    reqSubDomain,        // Extract subdomain info
    login               // Original login controller
  );

  /**
   * Student login with security middleware applied
   */
  router.post('/student-login',
    loginSecurityStack,  // Apply security middleware
    reqSubDomain,        // Extract subdomain info
    studentLogin        // Original student login controller
  );

  /** 
   * Superadmin login with security middleware applied
   */
  router.post('/superadmin-login',
    loginSecurityStack,  // Apply security middleware
    superadminLogin      // Original controller
  );

  // ===== PROTECTED ENDPOINTS (Original functionality) =====

  /**
   * Create a new user
   */
  router.post('/create',
    passport.authenticate('jwt', { session: false }),
    create
  );

  /** 
   * Token verification endpoint with header injection for branch switching
   */
  router.get('/verify-token',
    headerInjector,      // Inject headers for branch switching functionality
    passport.authenticate('jwt', { session: false }),
    reqSubDomain,
    verifyToken
  );

  /**
   * Retrieve all users
   */
  router.get('/',
    headerInjector,      // Inject headers for school/branch context
    passport.authenticate('jwt', { session: false }),
    allowOnly(config.accessLevels.admin, findAllUsers)
  );

  /**
   * Retrieve user by ID
   */
  router.get('/:userId',
    headerInjector,      // Inject headers for context
    passport.authenticate('jwt', { session: false }),
    allowOnly(config.accessLevels.admin, findById)
  );

  /**
   * Update a user
   */
  router.put('/:userId',
    headerInjector,      // Inject headers for context
    passport.authenticate('jwt', { session: false }),
    allowOnly(config.accessLevels.user, update)
  );

  /**
   * Delete a user
   */
  router.delete('/:userId',
    headerInjector,      // Inject headers for context
    passport.authenticate('jwt', { session: false }),
    allowOnly(config.accessLevels.admin, deleteUser)
  );

  /**
   * Compose SMS
   */
  router.post('/compose-sms',
    passport.authenticate('jwt', { session: false }),
    compose_sms
  );

  // ===== SECURITY MONITORING ENDPOINTS =====

  /**
   * Get security status (Admin only)
   */
  router.get('/security/status',
    passport.authenticate('jwt', { session: false }),
    allowOnly(config.accessLevels.admin, async (req, res) => {
      try {
        const db = require('../models');
        
        // Get recent login attempts
        const [loginAttempts] = await db.sequelize.query(`
          SELECT 
            COUNT(*) as total_attempts,
            SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successful_logins,
            SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failed_attempts,
            COUNT(DISTINCT username) as unique_users,
            COUNT(DISTINCT ip_address) as unique_ips
          FROM login_attempts 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `, {
          type: db.sequelize.QueryTypes.SELECT
        });

        // Get active lockouts
        const [activeLockouts] = await db.sequelize.query(`
          SELECT COUNT(*) as active_lockouts
          FROM account_lockouts 
          WHERE is_active = TRUE
        `, {
          type: db.sequelize.QueryTypes.SELECT
        });

        // Get recent security events
        const securityEvents = await db.sequelize.query(`
          SELECT event_type, severity, COUNT(*) as count
          FROM security_events 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
          GROUP BY event_type, severity
          ORDER BY severity DESC, count DESC
        `, {
          type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
          success: true,
          data: {
            login_attempts: loginAttempts[0] || {
              total_attempts: 0,
              successful_logins: 0,
              failed_attempts: 0,
              unique_users: 0,
              unique_ips: 0
            },
            active_lockouts: activeLockouts[0]?.active_lockouts || 0,
            security_events: securityEvents,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('Security status error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve security status'
        });
      }
    })
  );

  /**
   * Get recent failed login attempts (Admin only)
   */
  router.get('/security/failed-attempts',
    passport.authenticate('jwt', { session: false }),
    allowOnly(config.accessLevels.admin, async (req, res) => {
      try {
        const db = require('../models');
        const limit = parseInt(req.query.limit) || 50;
        
        const failedAttempts = await db.sequelize.query(`
          SELECT 
            username,
            ip_address,
            user_agent,
            failure_reason,
            created_at,
            COUNT(*) OVER (PARTITION BY ip_address) as ip_attempt_count,
            COUNT(*) OVER (PARTITION BY username) as username_attempt_count
          FROM login_attempts 
          WHERE success = FALSE 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
          ORDER BY created_at DESC 
          LIMIT :limit
        `, {
          replacements: { limit },
          type: db.sequelize.QueryTypes.SELECT
        });

        res.json({
          success: true,
          data: failedAttempts
        });

      } catch (error) {
        console.error('Failed attempts query error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve failed attempts'
        });
      }
    })
  );

  // Mount the router with /users prefix
  app.use('/users', router);

  // Also mount legacy endpoints for backward compatibility
  app.post('/students/login', 
    loginSecurityStack,
    reqSubDomain,
    studentLogin
  );

  app.post('/superadmin-login',
    loginSecurityStack,
    superadminLogin
  );
};