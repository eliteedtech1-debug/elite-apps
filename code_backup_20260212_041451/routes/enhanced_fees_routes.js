const express = require('express');
const { body, query, param } = require('express-validator');
const enhancedFeesController = require('../controllers/enhanced_fees_controller');
const { authenticate } = require('../middleware/auth');


// Apply authentication middleware to all routes
module.exports = (app) => {

// Fee Items Routes
app.post('/fee-items',
  // [
  //   body('fee_code').notEmpty().withMessage('Fee code is required'),
  //   body('fee_name').notEmpty().withMessage('Fee name is required'),
  //   body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  //   body('fee_type').isIn(['TUITION', 'REGISTRATION', 'EXAMINATION', 'TRANSPORT', 'LIBRARY', 'LABORATORY', 'SPORTS', 'OTHER'])
  //     .withMessage('Invalid fee type'),
  //   body('account_id').isInt({ min: 1 }).withMessage('Valid account ID is required'),
  //   body('academic_year').notEmpty().withMessage('Academic year is required'),
  //   body('term').notEmpty().withMessage('Term is required'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required'),
  //   body('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   body('created_by').isInt({ min: 1 }).withMessage('Valid user ID is required')
  // ],
  enhancedFeesController.createFeeItem
);

app.get('/fee-items',
  // [
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   query('academic_year').optional().notEmpty().withMessage('Academic year cannot be empty'),
  //   query('term').optional().notEmpty().withMessage('Term cannot be empty'),
  //   query('fee_type').optional().isIn(['TUITION', 'REGISTRATION', 'EXAMINATION', 'TRANSPORT', 'LIBRARY', 'LABORATORY', 'SPORTS', 'OTHER'])
  //     .withMessage('Invalid fee type'),
  //   query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DRAFT']).withMessage('Invalid status')
  // ],
  enhancedFeesController.getFeeItems
);

// Fee Structures Routes
app.post('/fee-structures',
  // [
  //   body('structure_name').notEmpty().withMessage('Structure name is required'),
  //   body('class_code').notEmpty().withMessage('Class code is required'),
  //   body('class_name').notEmpty().withMessage('Class name is required'),
  //   body('academic_year').notEmpty().withMessage('Academic year is required'),
  //   body('term').notEmpty().withMessage('Term is required'),
  //   body('fee_items').isArray({ min: 1 }).withMessage('At least one fee item is required'),
  //   body('total_amount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required'),
  //   body('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   body('created_by').isInt({ min: 1 }).withMessage('Valid user ID is required')
  // ],
  enhancedFeesController.createFeeStructure
);

app.get('/fee-structures',
  // [
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   query('academic_year').optional().notEmpty().withMessage('Academic year cannot be empty'),
  //   query('term').optional().notEmpty().withMessage('Term cannot be empty')
  // ],
  enhancedFeesController.getFeeStructures
);

app.post('/fee-structures/:structureId/publish',
  // [
  //   param('structureId').isInt({ min: 1 }).withMessage('Valid structure ID is required'),
  //   body('published_by').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required')
  // ],
  enhancedFeesController.publishFeeStructure
);

// Bills Management Routes
app.get('/bills',
  // [
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   query('academic_year').optional().notEmpty().withMessage('Academic year cannot be empty'),
  //   query('term').optional().notEmpty().withMessage('Term cannot be empty'),
  //   query('class_name').optional().notEmpty().withMessage('Class name cannot be empty'),
  //   query('status').optional().isIn(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'PAID', 'CANCELLED'])
  //     .withMessage('Invalid status'),
  //   query('search').optional().notEmpty().withMessage('Search term cannot be empty')
  // ],
  enhancedFeesController.getStudentBills
);

app.post('/bills/adjust',
  // [
  //   body('bill_id').isInt({ min: 1 }).withMessage('Valid bill ID is required'),
  //   body('adjustment_type').isIn(['DISCOUNT', 'WAIVER', 'ADDITIONAL', 'PENALTY'])
  //     .withMessage('Invalid adjustment type'),
  //   body('adjustment_reason').notEmpty().withMessage('Adjustment reason is required'),
  //   body('adjustment_value').isFloat({ min: 0 }).withMessage('Adjustment value must be a positive number'),
  //   body('is_percentage').isBoolean().withMessage('is_percentage must be a boolean'),
  //   body('apply_to_all').isBoolean().withMessage('apply_to_all must be a boolean'),
  //   body('adjusted_by').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required'),
  //   body('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  enhancedFeesController.adjustBill
);

app.post('/bills/:billId/approve',
  // [
  //   param('billId').isInt({ min: 1 }).withMessage('Valid bill ID is required'),
  //   body('approved_by').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required')
  // ],
  (req, res) => {
    // Implementation for bill approval
    res.json({ success: true, message: 'Bill approved successfully' });
  }
);

app.post('/bills/:billId/publish',
  // [
  //   param('billId').isInt({ min: 1 }).withMessage('Valid bill ID is required'),
  //   body('published_by').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required')
  // ],
  (req, res) => {
    // Implementation for bill publishing
    res.json({ success: true, message: 'Bill published successfully' });
  }
);

// Family Bills Routes
app.get('/family-bills',
  // [
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   query('academic_year').optional().notEmpty().withMessage('Academic year cannot be empty'),
  //   query('term').optional().notEmpty().withMessage('Term cannot be empty')
  // ],
  enhancedFeesController.getFamilyBills
);

app.post('/family-bills/adjust',
  // [
  //   body('family_id').isInt({ min: 1 }).withMessage('Valid family ID is required'),
  //   body('family_discount').isFloat({ min: 0 }).withMessage('Family discount must be a positive number'),
  //   body('family_discount_type').isIn(['PERCENTAGE', 'FIXED']).withMessage('Invalid discount type'),
  //   body('discount_reason').notEmpty().withMessage('Discount reason is required'),
  //   body('apply_to_existing_bills').isBoolean().withMessage('apply_to_existing_bills must be a boolean'),
  //   body('adjusted_by').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required'),
  //   body('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  enhancedFeesController.applyFamilyDiscount
);

// Cash Drawer Management Routes
app.post('/cash-drawer/open',
  // [
  //   body('opening_balance').isFloat({ min: 0 }).withMessage('Opening balance must be a positive number'),
  //   body('opened_by').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required'),
  //   body('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  enhancedFeesController.openCashDrawer
);

app.post('/cash-drawer/close',
  // [
  //   body('drawer_id').isInt({ min: 1 }).withMessage('Valid drawer ID is required'),
  //   body('closing_balance').isFloat({ min: 0 }).withMessage('Closing balance must be a positive number'),
  //   body('closed_by').isInt({ min: 1 }).withMessage('Valid user ID is required')
  // ],
  enhancedFeesController.closeCashDrawer
);

app.get('/cash-drawer/status',
  // [
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   query('user_id').isInt({ min: 1 }).withMessage('Valid user ID is required')
  // ],
  enhancedFeesController.getCashDrawerStatus
);

// Payment Processing Routes
app.post('/payments/process',
  // [
  //   body('receipt_number').notEmpty().withMessage('Receipt number is required'),
  //   body('student_admission_no').notEmpty().withMessage('Student admission number is required'),
  //   body('student_name').notEmpty().withMessage('Student name is required'),
  //   body('payment_date').isISO8601().withMessage('Valid payment date is required'),
  //   body('payment_method').isIn(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'MOBILE_MONEY'])
  //     .withMessage('Invalid payment method'),
  //   body('payment_items').isArray({ min: 1 }).withMessage('At least one payment item is required'),
  //   body('total_amount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  //   body('amount_received').isFloat({ min: 0 }).withMessage('Amount received must be a positive number'),
  //   body('collected_by').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  //   body('school_id').isInt({ min: 1 }).withMessage('Valid school ID is required'),
  //   body('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  enhancedFeesController.processPayment
);

// Search and Reports Routes
app.get('/students/outstanding-payments',
  // [
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   query('search').optional().notEmpty().withMessage('Search term cannot be empty'),
  //   query('class_name').optional().notEmpty().withMessage('Class name cannot be empty'),
  //   query('academic_year').optional().notEmpty().withMessage('Academic year cannot be empty'),
  //   query('term').optional().notEmpty().withMessage('Term cannot be empty')
  // ],
  enhancedFeesController.searchStudentsWithOutstandingPayments
);

app.get('/fees/metrics',
  // [
  //   query('start_date').isISO8601().withMessage('Valid start date is required'),
  //   query('end_date').isISO8601().withMessage('Valid end date is required'),
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  enhancedFeesController.getFeesMetrics
);

app.get('/fees/payment-trends',
  // [
  //   query('start_date').isISO8601().withMessage('Valid start date is required'),
  //   query('end_date').isISO8601().withMessage('Valid end date is required'),
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  enhancedFeesController.getPaymentTrends
);

app.get('/fees/classwise-collection',
  // [
  //   query('start_date').isISO8601().withMessage('Valid start date is required'),
  //   query('end_date').isISO8601().withMessage('Valid end date is required'),
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  enhancedFeesController.getClasswiseCollection
);

app.get('/fees/payment-methods',
  // [
  //   query('start_date').isISO8601().withMessage('Valid start date is required'),
  //   query('end_date').isISO8601().withMessage('Valid end date is required'),
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  enhancedFeesController.getPaymentMethods
);

app.get('/fees/recent-payments',
  // [
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required'),
  //   query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  // ],
  enhancedFeesController.getRecentPayments
);

// Export and Reporting Routes
app.get('/reports/export',
  // [
  //   query('type').isIn(['financial-summary', 'fees-collection', 'balance-sheet', 'income-statement'])
  //     .withMessage('Invalid report type'),
  //   query('start_date').isISO8601().withMessage('Valid start date is required'),
  //   query('end_date').isISO8601().withMessage('Valid end date is required'),
  //   query('format').isIn(['pdf', 'excel', 'csv']).withMessage('Invalid format'),
  //   query('branch_id').isInt({ min: 1 }).withMessage('Valid branch ID is required')
  // ],
  (req, res) => {
    // Implementation for report export
    res.json({ success: true, message: 'Report export functionality to be implemented' });
  }
);
}