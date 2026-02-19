const express = require('express');
const router = express.Router();
const UnifiedCustomItemsController = require('../controllers/UnifiedCustomItemsController');
const { authenticateToken } = require('../middleware/auth');

/**
 * UNIFIED CUSTOM ITEMS ROUTES
 * 
 * This module handles ALL custom items as separate, independent entities.
 * No mixing of discounts, fines, or other charges in the same form.
 * Each item type (Fees, Discounts, Fines, etc.) is treated distinctly.
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CUSTOM ITEM MANAGEMENT

/**
 * @route POST /api/custom-items
 * @desc Create a new custom item (any type: Fee, Discount, Fine, etc.)
 * @access Private
 * @body {
 *   item_code: string (required),
 *   item_name: string (required),
 *   description: string,
 *   item_category: enum (required) - 'Fees', 'Items', 'Discount', 'Fines', 'Penalties', 'Refunds', 'Other Revenue', 'Expenses',
 *   item_type: enum (required) - 'CHARGE', 'FEE', 'ITEM', 'DISCOUNT', 'FINE', 'PENALTY', 'REFUND', 'CREDIT', 'EXPENSE', 'OTHER',
 *   default_amount: decimal,
 *   calculation_method: enum - 'FIXED', 'PERCENTAGE', 'CALCULATED',
 *   percentage_rate: decimal,
 *   is_taxable: boolean,
 *   tax_rate: decimal,
 *   is_mandatory: boolean,
 *   is_recurring: boolean,
 *   applicable_classes: array,
 *   applicable_terms: array,
 *   applicable_sections: array,
 *   min_amount: decimal,
 *   max_amount: decimal,
 *   status: enum - 'ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED',
 *   branch_id: string,
 *   created_by: string (required)
 * }
 */
router.post('/', UnifiedCustomItemsController.createCustomItem);

/**
 * @route GET /api/custom-items
 * @desc Get all custom items with optional filtering
 * @access Private
 * @query {
 *   item_category?: string,
 *   item_type?: string,
 *   status?: string,
 *   branch_id?: string,
 *   class_code?: string,
 *   term?: string
 * }
 */
router.get('/', UnifiedCustomItemsController.getCustomItems);

/**
 * @route GET /api/custom-items/discounts
 * @desc Get all available discount items
 * @access Private
 * @query {
 *   class_code?: string,
 *   term?: string,
 *   branch_id?: string
 * }
 */
router.get('/discounts', UnifiedCustomItemsController.getAvailableDiscounts);

/**
 * @route GET /api/custom-items/fines
 * @desc Get all available fine/penalty items
 * @access Private
 * @query {
 *   class_code?: string,
 *   term?: string,
 *   branch_id?: string
 * }
 */
router.get('/fines', UnifiedCustomItemsController.getAvailableFines);

// ITEM APPLICATION

/**
 * @route POST /api/custom-items/apply
 * @desc Apply custom items to a student
 * @access Private
 * @body {
 *   admission_no: string (required),
 *   class_code: string,
 *   academic_year: string,
 *   term: string,
 *   items: array (required) - [
 *     {
 *       item_id: number (required),
 *       custom_amount?: decimal (uses default if not provided),
 *       quantity?: number (default: 1),
 *       custom_description?: string,
 *       percentage_base_amount?: decimal (for percentage calculations)
 *     }
 *   ],
 *   branch_id?: string,
 *   created_by: string (required),
 *   create_journal_entry?: boolean (default: true),
 *   notes?: string
 * }
 */
router.post('/apply', UnifiedCustomItemsController.applyCustomItems);

// STUDENT INQUIRY

/**
 * @route GET /api/custom-items/student
 * @desc Get all custom items applied to a specific student
 * @access Private
 * @query {
 *   admission_no: string (required),
 *   academic_year?: string,
 *   term?: string,
 *   item_category?: string,
 *   item_type?: string
 * }
 */
router.get('/student', UnifiedCustomItemsController.getStudentCustomItems);

module.exports = router;