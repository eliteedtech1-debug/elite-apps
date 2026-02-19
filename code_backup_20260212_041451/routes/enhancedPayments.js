const EnhancedPaymentsController = require('../controllers/EnhancedPaymentsController');

/**
 * ENHANCED PAYMENTS ROUTES
 * 
 * These routes handle payments with complete separation of:
 * - Standard fee items (basic charges)
 * - Custom items (additional charges) 
 * - Discounts (separate liability/expense items)
 * - Fines (separate revenue items)
 * 
 * Each type gets proper accounting treatment as separate entities.
 * Database: skcooly_db, User: root, Password: ''
 */

module.exports = (app) => {

/**
 * @route POST /api/enhanced-payments/create-bill
 * @desc Create a bill with separated entities (standard items, custom items, discounts, fines)
 * @access Private
 * @body {
 *   admission_no: string (required),
 *   class_code: string (required),
 *   academic_year: string (required),
 *   term: string (required),
 *   standard_items: [
 *     {
 *       description: string,
 *       unit_price: number,
 *       quantity: number,
 *       item_category: string
 *     }
 *   ],
 *   custom_items: [
 *     {
 *       item_id: number,
 *       custom_amount: number,
 *       quantity: number,
 *       custom_description: string
 *     }
 *   ],
 *   discounts: [
 *     {
 *       description: string,
 *       amount: number,
 *       discount_type: 'FIXED' | 'PERCENTAGE',
 *       percentage_base_amount: number
 *     }
 *   ],
 *   fines: [
 *     {
 *       description: string,
 *       amount: number,
 *       fine_type: 'FINE' | 'PENALTY'
 *     }
 *   ],
 *   branch_id: string,
 *   created_by: string,
 *   create_journal_entry: boolean,
 *   notes: string
 * }
 * @example
 * POST /api/enhanced-payments/create-bill
 * {
 *   "admission_no": "STU001",
 *   "class_code": "JSS1A",
 *   "academic_year": "2023/2024",
 *   "term": "First Term",
 *   "standard_items": [
 *     {
 *       "description": "Tuition Fee",
 *       "unit_price": 50000,
 *       "quantity": 1,
 *       "item_category": "TUITION"
 *     }
 *   ],
 *   "custom_items": [
 *     {
 *       "item_id": 5,
 *       "custom_amount": 5000,
 *       "quantity": 1,
 *       "custom_description": "Extra Coaching"
 *     }
 *   ],
 *   "discounts": [
 *     {
 *       "description": "Early Payment Discount",
 *       "amount": 2000,
 *       "discount_type": "FIXED"
 *     }
 *   ],
 *   "fines": [
 *     {
 *       "description": "Late Payment Fine",
 *       "amount": 1000,
 *       "fine_type": "PENALTY"
 *     }
 *   ],
 *   "created_by": "admin",
 *   "create_journal_entry": true,
 *   "notes": "Complete bill with all entity types"
 * }
 */
app.post('/api/enhanced-payments/create-bill', EnhancedPaymentsController.createBillWithSeparatedEntities);

/**
 * @route GET /api/enhanced-payments/student-breakdown
 * @desc Get detailed breakdown of student bill by entity type
 * @access Private
 * @query {
 *   admission_no: string (required),
 *   academic_year: string (optional),
 *   term: string (optional)
 * }
 * @example
 * GET /api/enhanced-payments/student-breakdown?admission_no=STU001&academic_year=2023/2024&term=First%20Term
 */
app.get('/api/enhanced-payments/student-breakdown', EnhancedPaymentsController.getStudentBillBreakdown);

/**
 * @route POST /api/enhanced-payments/apply-discount
 * @desc Apply discount as separate entity with proper accounting
 * @access Private
 * @body {
 *   admission_no: string (required),
 *   class_code: string (required),
 *   academic_year: string (required),
 *   term: string (required),
 *   discounts: [
 *     {
 *       description: string,
 *       amount: number,
 *       discount_type: 'FIXED' | 'PERCENTAGE',
 *       percentage_base_amount: number
 *     }
 *   ],
 *   created_by: string,
 *   create_journal_entry: boolean,
 *   notes: string
 * }
 * @example
 * POST /api/enhanced-payments/apply-discount
 * {
 *   "admission_no": "STU001",
 *   "class_code": "JSS1A", 
 *   "academic_year": "2023/2024",
 *   "term": "First Term",
 *   "discounts": [
 *     {
 *       "description": "Scholarship Discount",
 *       "amount": 10,
 *       "discount_type": "PERCENTAGE",
 *       "percentage_base_amount": 50000
 *     }
 *   ],
 *   "created_by": "admin",
 *   "create_journal_entry": true,
 *   "notes": "Scholarship discount applied"
 * }
 */
app.post('/api/enhanced-payments/apply-discount', (req, res) => {
  // Transform request to use the main create-bill endpoint with only discounts
  const enhancedRequest = {
    ...req.body,
    standard_items: [],
    custom_items: [],
    fines: []
  };
  req.body = enhancedRequest;
  EnhancedPaymentsController.createBillWithSeparatedEntities(req, res);
});

/**
 * @route POST /api/enhanced-payments/apply-fine
 * @desc Apply fine as separate entity with proper accounting
 * @access Private
 * @body {
 *   admission_no: string (required),
 *   class_code: string (required),
 *   academic_year: string (required),
 *   term: string (required),
 *   fines: [
 *     {
 *       description: string,
 *       amount: number,
 *       fine_type: 'FINE' | 'PENALTY'
 *     }
 *   ],
 *   created_by: string,
 *   create_journal_entry: boolean,
 *   notes: string
 * }
 * @example
 * POST /api/enhanced-payments/apply-fine
 * {
 *   "admission_no": "STU001",
 *   "class_code": "JSS1A",
 *   "academic_year": "2023/2024", 
 *   "term": "First Term",
 *   "fines": [
 *     {
 *       "description": "Late Payment Penalty",
 *       "amount": 2000,
 *       "fine_type": "PENALTY"
 *     }
 *   ],
 *   "created_by": "admin",
 *   "create_journal_entry": true,
 *   "notes": "Late payment penalty applied"
 * }
 */
app.post('/api/enhanced-payments/apply-fine', (req, res) => {
  // Transform request to use the main create-bill endpoint with only fines
  const enhancedRequest = {
    ...req.body,
    standard_items: [],
    custom_items: [],
    discounts: []
  };
  req.body = enhancedRequest;
  EnhancedPaymentsController.createBillWithSeparatedEntities(req, res);
});

/**
 * @route POST /api/enhanced-payments/standard-items-only
 * @desc Create bill with only standard fee items (no discounts/fines)
 * @access Private
 * @body {
 *   admission_no: string (required),
 *   class_code: string (required),
 *   academic_year: string (required),
 *   term: string (required),
 *   standard_items: [
 *     {
 *       description: string,
 *       unit_price: number,
 *       quantity: number,
 *       item_category: string
 *     }
 *   ],
 *   created_by: string,
 *   create_journal_entry: boolean,
 *   notes: string
 * }
 * @example
 * POST /api/enhanced-payments/standard-items-only
 * {
 *   "admission_no": "STU001",
 *   "class_code": "JSS1A",
 *   "academic_year": "2023/2024",
 *   "term": "First Term",
 *   "standard_items": [
 *     {
 *       "description": "Tuition Fee",
 *       "unit_price": 50000,
 *       "quantity": 1,
 *       "item_category": "TUITION"
 *     },
 *     {
 *       "description": "Development Levy",
 *       "unit_price": 10000,
 *       "quantity": 1,
 *       "item_category": "LEVY"
 *     }
 *   ],
 *   "created_by": "admin",
 *   "create_journal_entry": true,
 *   "notes": "Standard fees only - no discounts or fines"
 * }
 */
app.post('/api/enhanced-payments/standard-items-only', (req, res) => {
  // Transform request to use the main create-bill endpoint with only standard items
  const enhancedRequest = {
    ...req.body,
    custom_items: [],
    discounts: [],
    fines: []
  };
  req.body = enhancedRequest;
  EnhancedPaymentsController.createBillWithSeparatedEntities(req, res);
});

};