/**
 * Chart of Accounts Setup API Routes
 *
 * Provides endpoints for manual chart of accounts setup and management.
 * Includes bulk setup for existing schools and validation endpoints.
 *
 * Security Features:
 * - Admin-only access for setup operations
 * - Input validation and sanitization
 * - Comprehensive audit logging
 * - Rate limiting for bulk operations
 */

const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const chartOfAccountsSetupService = require('../services/ChartOfAccountsSetupService');
const ChartOfAccountsHooks = require('../hooks/ChartOfAccountsHooks');
const models = require('../models');

// Rate limiting for setup operations
const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 setup requests per windowMs
  message: { success: false, message: 'Too many setup requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // Limit each IP to 1 bulk request per windowMs
  message: { success: false, message: 'Too many bulk requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = (app) => {
  /**
   * @route POST /api/chart-of-accounts-setup/school
   * @desc Manually setup chart of accounts for a school
   * @access Admin only
   */
  app.post(
    '/api/chart-of-accounts-setup/school',
    authenticateToken,
    setupLimiter,
    authorize(['admin', 'super_admin']),
    [
      body('school_id').notEmpty().withMessage('School ID is required'),
      body('school_name').notEmpty().withMessage('School name is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
          });
        }

        const { school_id, school_name } = req.body;

        const result = await chartOfAccountsSetupService.setupSchoolChartOfAccounts(
          school_id,
          school_name,
          req.user.id
        );

        res.status(201).json({
          success: true,
          message: 'Chart of accounts setup completed successfully',
          data: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error setting up chart of accounts for school:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to setup chart of accounts for school',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * @route POST /api/chart-of-accounts-setup/branch
   * @desc Manually setup chart of accounts for a branch
   * @access Admin only
   */
  app.post(
    '/api/chart-of-accounts-setup/branch',
    authenticateToken,
    setupLimiter,
    authorize(['admin', 'super_admin']),
    [
      body('school_id').notEmpty().withMessage('School ID is required'),
      body('branch_id').notEmpty().withMessage('Branch ID is required'),
      body('branch_name').notEmpty().withMessage('Branch name is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
          });
        }

        const { school_id, branch_id, branch_name } = req.body;

        const result = await chartOfAccountsSetupService.setupBranchChartOfAccounts(
          school_id,
          branch_id,
          branch_name,
          req.user.id
        );

        res.status(201).json({
          success: true,
          message: 'Chart of accounts setup completed successfully for branch',
          data: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error setting up chart of accounts for branch:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to setup chart of accounts for branch',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * @route POST /api/chart-of-accounts-setup/bulk-existing
   * @desc Setup chart of accounts for all existing schools and branches
   * @access Super Admin only
   */
  app.post(
    '/api/chart-of-accounts-setup/bulk-existing',
    authenticateToken,
    bulkLimiter,
    authorize(['super_admin']),
    async (req, res) => {
      try {
        console.log(`Bulk setup initiated by user: ${req.user.id}`);

        const result = await ChartOfAccountsHooks.bulkSetupExisting(models);

        res.status(200).json({
          success: true,
          message: 'Bulk chart of accounts setup completed',
          data: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Bulk Chart of Accounts Setup Error:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to complete bulk setup',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * @route GET /api/chart-of-accounts-setup/validate/:school_id
   * @desc Validate chart of accounts setup for a school
   * @access Admin
   */
  app.get(
    '/api/chart-of-accounts-setup/validate/:school_id',
    authenticateToken,
    authorize(['admin', 'super_admin']),
    async (req, res) => {
      try {
        const { school_id } = req.params;
        const { branch_id } = req.query;

        if (!school_id) {
          return res.status(400).json({
            success: false,
            message: 'School ID is required',
          });
        }

        const validation =
          await chartOfAccountsSetupService.validateChartOfAccountsSetup(
            school_id,
            branch_id || null
          );

        res.status(200).json({
          success: true,
          message: 'Chart of accounts validation completed',
          data: validation,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Chart of Accounts Validation Error:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to validate chart of accounts',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * @route GET /api/chart-of-accounts-setup/template
   * @desc Get the standard chart of accounts template
   * @access Admin
   */
  app.get(
    '/api/chart-of-accounts-setup/template',
    authenticateToken,
    authorize(['admin', 'super_admin']),
    async (req, res) => {
      try {
        const template = chartOfAccountsSetupService.getStandardChartTemplate();

        res.status(200).json({
          success: true,
          message: 'Standard chart of accounts template retrieved',
          data: {
            template: template,
            total_accounts: template.length,
            by_type: {
              ASSET: template.filter((a) => a.account_type === 'ASSET').length,
              LIABILITY: template.filter((a) => a.account_type === 'LIABILITY').length,
              EQUITY: template.filter((a) => a.account_type === 'EQUITY').length,
              REVENUE: template.filter((a) => a.account_type === 'REVENUE').length,
              CONTRA_REVENUE: template.filter((a) => a.account_type === 'CONTRA_REVENUE')
                .length,
              EXPENSE: template.filter((a) => a.account_type === 'EXPENSE').length,
            },
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Chart of Accounts Template Error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve chart of accounts template',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * @route GET /api/chart-of-accounts-setup/status
   * @desc Get setup status for all schools and branches
   * @access Super Admin
   */
  app.get(
    '/api/chart-of-accounts-setup/status',
    authenticateToken,
    authorize(['super_admin']),
    async (req, res) => {
      try {
        const schoolsStatus = [];
        const branchesStatus = [];

        // Adapt this part based on your actual models
        try {
          if (models.School) {
            const schools = await models.School.findAll({
              attributes: ['id', 'school_name', 'name'],
            });

            for (const school of schools) {
            const validation = await chartOfAccountsSetupService.validateChartOfAccountsSetup(
              school.id,
              null
            );

              schoolsStatus.push({
                school_id: school.id,
                school_name: school.school_name || school.name,
                ...validation,
              });
            }
          }

          if (models.Branch) {
            const branches = await models.Branch.findAll({
              attributes: ['id', 'branch_name', 'name', 'school_id'],
            });

            for (const branch of branches) {
            const validation = await chartOfAccountsSetupService.validateChartOfAccountsSetup(
              branch.school_id,
              branch.id
            );

              branchesStatus.push({
                branch_id: branch.id,
                branch_name: branch.branch_name || branch.name,
                school_id: branch.school_id,
                ...validation,
              });
            }
          }
        } catch (modelError) {
          console.log('Some models not available for status check:', modelError.message);
        }

        const summary = {
          schools: {
            total: schoolsStatus.length,
            complete: schoolsStatus.filter((s) => s.is_complete).length,
            incomplete: schoolsStatus.filter((s) => !s.is_complete).length,
          },
          branches: {
            total: branchesStatus.length,
            complete: branchesStatus.filter((b) => b.is_complete).length,
            incomplete: branchesStatus.filter((b) => !b.is_complete).length,
          },
        };

        res.status(200).json({
          success: true,
          message: 'Chart of accounts setup status retrieved',
          data: {
            summary: summary,
            schools: schoolsStatus,
            branches: branchesStatus,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Chart of Accounts Status Error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve setup status',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * @route POST /api/chart-of-accounts-setup/trigger
   * @desc Manually trigger chart of accounts setup
   * @access Admin
   */
  app.post(
    '/api/chart-of-accounts-setup/trigger',
    authenticateToken,
    setupLimiter,
    authorize(['admin', 'super_admin']),
    [
      body('type').isIn(['school', 'branch']).withMessage('Type must be school or branch'),
      body('data').isObject().withMessage('Data object is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
          });
        }

        const { type, data } = req.body;

        // Add user context to data
        data.created_by = req.user.id;

        const result = await ChartOfAccountsHooks.manualSetupTrigger(type, data);

        res.status(201).json({
          success: true,
          message: `Chart of accounts setup triggered successfully for ${type}`,
          data: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Chart of Accounts Trigger Error:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to trigger chart of accounts setup',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
};

