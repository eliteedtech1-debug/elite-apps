const express = require('express');
const router = express.Router();
const CustomChargeController = require('../controllers/CustomChargeController');
const { authenticateToken } = require('../middleware/auth');

/**
 * CUSTOM CHARGES ROUTES
 * 
 * This module handles all custom charge operations including:
 * - Creating charge item templates
 * - Applying charges to students
 * - Managing discounts and fines
 * - Proper accounting treatment
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CHARGE ITEM TEMPLATE MANAGEMENT

/**
 * @route POST /api/custom-charges/items
 * @desc Create a new custom charge item template
 * @access Private
 * @body {
 *   charge_code: string (required),
 *   charge_name: string (required),
 *   description: string,
 *   item_category: enum (required) - 'Fees', 'Items', 'Discount', 'Fines', 'Penalties', 'Refunds', 'Other Revenue', 'Expenses',
 *   default_amount: decimal (required),
 *   is_taxable: boolean,
 *   tax_rate: decimal,
 *   is_mandatory: boolean,
 *   is_recurring: boolean,
 *   applicable_classes: array,
 *   applicable_terms: array,
 *   status: enum - 'ACTIVE', 'INACTIVE', 'DRAFT',
 *   branch_id: string,
 *   created_by: string (required)
 * }
 */
router.post('/items', CustomChargeController.createChargeItem);

/**
 * @route GET /api/custom-charges/items
 * @desc Get all custom charge item templates
 * @access Private
 * @query {
 *   item_category?: string,
 *   status?: string,
 *   branch_id?: string
 * }
 */
router.get('/items', CustomChargeController.getChargeItems);

// CHARGE APPLICATION

/**
 * @route POST /api/custom-charges/apply
 * @desc Apply custom charges to a student
 * @access Private
 * @body {
 *   admission_no: string (required),
 *   class_code: string,
 *   academic_year: string,
 *   term: string,
 *   charges: array (required) - [
 *     {
 *       charge_id: number (required),
 *       charge_code: string,
 *       amount?: decimal (uses default if not provided),
 *       quantity?: number (default: 1),
 *       description?: string (custom description)
 *     }
 *   ],
 *   branch_id?: string,
 *   created_by: string (required),
 *   create_journal_entry?: boolean (default: true)
 * }
 */
router.post('/apply', CustomChargeController.applyCharges);

// DISCOUNT MANAGEMENT

/**
 * @route POST /api/custom-charges/discount
 * @desc Apply discount to a student (as separate item)
 * @access Private
 * @body {
 *   admission_no: string (required),
 *   class_code: string,
 *   academic_year: string,
 *   term: string,
 *   discount_amount: decimal (required),
 *   discount_type: enum - 'FIXED', 'PERCENTAGE' (default: 'FIXED'),
 *   discount_reason: string (required),
 *   applicable_to_ref_no?: string (specific transaction),
 *   branch_id?: string,
 *   created_by: string (required)
 * }
 */
router.post('/discount', CustomChargeController.applyDiscount);

// FINE MANAGEMENT

/**
 * @route POST /api/custom-charges/fine
 * @desc Apply fine to a student (as separate item)
 * @access Private
 * @body {
 *   admission_no: string (required),
 *   class_code: string,
 *   academic_year: string,
 *   term: string,
 *   fine_amount: decimal (required),
 *   fine_reason: string (required),
 *   due_date?: date,
 *   branch_id?: string,
 *   created_by: string (required)
 * }
 */
router.post('/fine', CustomChargeController.applyFine);

// STUDENT CHARGE INQUIRY

/**
 * @route GET /api/custom-charges/student
 * @desc Get all charges for a specific student
 * @access Private
 * @query {
 *   admission_no: string (required),
 *   academic_year?: string,
 *   term?: string,
 *   item_category?: string
 * }
 */
router.get('/student', CustomChargeController.getStudentCharges);

module.exports = router;