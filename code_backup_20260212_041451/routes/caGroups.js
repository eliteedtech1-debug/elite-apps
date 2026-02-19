const express = require('express');
const router = express.Router();
const CAGroupController = require('../controllers/CAGroupController');

/**
 * CA GROUPS ROUTES
 * 
 * These routes manage CA Groups which contain:
 * - Multiple CAs (CA1, CA2, CA3, etc.) + Exam
 * - Minimum 3 CAs + 1 Exam per group
 * - Single Grade Boundaries setup per group (shared by all CAs)
 * - Flexible CA configurations with different contributions
 * 
 * All routes require authentication and are scoped to school/branch
 */

/**
 * @route GET /api/v2/ca-groups/active
 * @desc Get the currently active CA group
 * @access Private
 */
router.get('/active', CAGroupController.getActiveCAGroup);

/**
 * @route GET /api/v2/ca-groups
 * @desc Get all CA groups for the authenticated user's school/branch
 * @access Private
 * @query {boolean} is_active - Filter by active status
 * @query {string} academic_level - Filter by academic level
 */
router.get('/', CAGroupController.getAllCAGroups);

/**
 * @route GET /api/v2/ca-groups/:id
 * @desc Get a specific CA group by ID
 * @access Private
 * @param {number} id - CA Group ID
 */
router.get('/:id', CAGroupController.getCAGroupById);

/**
 * @route POST /api/v2/ca-groups
 * @desc Create a new CA group
 * @access Private
 * @body {string} group_name - Name of the CA group
 * @body {string} description - Optional description
 * @body {string} academic_level - Academic level (Primary, JSS, SSS, etc.)
 * @body {array} ca_configurations - Array of CA configuration objects (min 4: 3 CAs + 1 Exam)
 * @body {array} grade_boundaries - Array of grade boundary objects
 * @body {boolean} is_default - Whether this is the default group
 * @body {boolean} activate_on_create - Whether to activate this group immediately
 */
router.post('/', CAGroupController.createCAGroup);

/**
 * @route PUT /api/v2/ca-groups/:id
 * @desc Update a CA group
 * @access Private
 * @param {number} id - CA Group ID
 * @body {string} group_name - Name of the CA group
 * @body {string} description - Optional description
 * @body {string} academic_level - Academic level
 * @body {array} ca_configurations - Array of CA configuration objects
 * @body {array} grade_boundaries - Array of grade boundary objects
 * @body {boolean} is_default - Whether this is the default group
 */
router.put('/:id', CAGroupController.updateCAGroup);

/**
 * @route POST /api/v2/ca-groups/:id/activate
 * @desc Activate a CA group (deactivates all others)
 * @access Private
 * @param {number} id - CA Group ID
 */
router.post('/:id/activate', CAGroupController.activateCAGroup);

/**
 * @route DELETE /api/v2/ca-groups/:id
 * @desc Delete a CA group
 * @access Private
 * @param {number} id - CA Group ID
 */
router.delete('/:id', CAGroupController.deleteCAGroup);

module.exports = router;