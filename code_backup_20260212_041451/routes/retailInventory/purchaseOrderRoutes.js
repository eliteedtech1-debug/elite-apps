const express = require('express');
const router = express.Router();
const passport = require('passport');

// In-memory storage for purchase orders by school
const purchaseOrderStorage = {};

// Helper to get school key
const getSchoolKey = (req) => {
  const schoolId = req.headers['x-school-id'] || req.user?.school_id;
  const branchId = req.headers['x-branch-id'] || req.user?.branch_id;
  return `${schoolId}_${branchId || 'main'}`;
};

// Helper to get purchase orders for school
const getSchoolPurchaseOrders = (schoolKey) => {
  if (!purchaseOrderStorage[schoolKey]) {
    purchaseOrderStorage[schoolKey] = [
      {
        order_id: 'PO001',
        order_number: 'PO-2026-001',
        supplier_name: 'SchoolWear Suppliers Ltd',
        order_date: '2026-01-01',
        expected_delivery: '2026-01-10',
        status: 'pending',
        total_amount: 125000,
        items_count: 3,
        created_by: 'Admin User'
      },
      {
        order_id: 'PO002',
        order_number: 'PO-2026-002',
        supplier_name: 'StudyMax Stationery',
        order_date: '2026-01-03',
        expected_delivery: '2026-01-08',
        status: 'delivered',
        total_amount: 45000,
        items_count: 5,
        created_by: 'Admin User'
      }
    ];
  }
  return purchaseOrderStorage[schoolKey];
};

// Test endpoint without auth
router.get('/test', (req, res) => {
  const schoolKey = getSchoolKey(req);
  const orders = getSchoolPurchaseOrders(schoolKey);
  
  res.json({
    success: true,
    message: 'Purchase orders retrieved successfully',
    data: orders
  });
});

// All other routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

// Get purchase orders
router.get('/', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const orders = getSchoolPurchaseOrders(schoolKey);
    
    res.json({
      success: true,
      message: 'Purchase orders retrieved successfully',
      data: orders
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve purchase orders',
      error: error.message
    });
  }
});

// Create purchase order
router.post('/', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const orders = getSchoolPurchaseOrders(schoolKey);
    
    const newOrder = {
      order_id: `PO${Date.now()}`,
      order_number: `PO-2026-${String(orders.length + 1).padStart(3, '0')}`,
      ...req.body,
      created_at: new Date().toISOString()
    };
    
    orders.push(newOrder);
    
    res.json({
      success: true,
      message: 'Purchase order created successfully',
      data: newOrder
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message
    });
  }
});

module.exports = router;
