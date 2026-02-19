const express = require('express');
const router = express.Router();
const passport = require('passport');

// In-memory storage for stock data by school
const stockStorage = {};

// Helper to get school key
const getSchoolKey = (req) => {
  const schoolId = req.headers['x-school-id'] || req.user?.school_id;
  const branchId = req.headers['x-branch-id'] || req.user?.branch_id;
  return `${schoolId}_${branchId || 'main'}`;
};

// Helper to get stock data for school
const getSchoolStock = (schoolKey) => {
  if (!stockStorage[schoolKey]) {
    stockStorage[schoolKey] = [
      {
        stock_id: 'STK001',
        product_id: 'PRD001',
        product_name: 'School Uniform Shirt',
        sku: 'UNI-SHIRT-001',
        category_name: 'Uniforms',
        branch_name: 'Main Branch',
        quantity_on_hand: 45,
        quantity_reserved: 5,
        quantity_available: 40,
        reorder_level: 10,
        cost_price: 1800,
        selling_price: 2500
      },
      {
        stock_id: 'STK002',
        product_id: 'PRD002',
        product_name: 'Exercise Books',
        sku: 'STAT-BOOK-001',
        category_name: 'Stationery',
        branch_name: 'Main Branch',
        quantity_on_hand: 120,
        quantity_reserved: 15,
        quantity_available: 105,
        reorder_level: 20,
        cost_price: 100,
        selling_price: 150
      }
    ];
  }
  return stockStorage[schoolKey];
};

// Test endpoint without auth
router.get('/test', (req, res) => {
  const schoolKey = getSchoolKey(req);
  const stock = getSchoolStock(schoolKey);
  
  res.json({
    success: true,
    message: 'Stock levels retrieved successfully',
    data: stock
  });
});

// All other routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

// Get stock levels
router.get('/', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const stock = getSchoolStock(schoolKey);
    
    res.json({
      success: true,
      message: 'Stock levels retrieved successfully',
      data: stock
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stock levels',
      error: error.message
    });
  }
});

// Get low stock alerts
router.get('/low-alerts', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const stock = getSchoolStock(schoolKey);
    
    const lowStockItems = stock.filter(item => 
      item.quantity_available <= item.reorder_level
    );
    
    res.json({
      success: true,
      message: 'Low stock alerts retrieved successfully',
      data: lowStockItems
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve low stock alerts',
      error: error.message
    });
  }
});

// Get stock value summary
router.get('/value-summary', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const stock = getSchoolStock(schoolKey);
    
    const totalCostValue = stock.reduce((sum, item) => 
      sum + (item.quantity_on_hand * item.cost_price), 0
    );
    
    const totalSellingValue = stock.reduce((sum, item) => 
      sum + (item.quantity_on_hand * item.selling_price), 0
    );
    
    res.json({
      success: true,
      message: 'Stock value summary retrieved successfully',
      data: {
        total_cost_value: totalCostValue,
        total_selling_value: totalSellingValue,
        total_items: stock.length
      }
    });
  } catch (error) {
    console.error('Get stock value summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stock value summary',
      error: error.message
    });
  }
});

// Stock adjustment
router.put('/adjust', async (req, res) => {
  try {
    const { product_id, quantity_change, reason, reference_id, reference_type } = req.body;
    const schoolKey = getSchoolKey(req);
    const stock = getSchoolStock(schoolKey);
    
    let stockItem = stock.find(item => 
      item.product_id === product_id || item.stock_id === reference_id
    );
    
    // If stock item doesn't exist, create new stock entry
    if (!stockItem) {
      const newStockId = `STK${Date.now()}`;
      stockItem = {
        stock_id: newStockId,
        product_id: product_id,
        product_name: `Product ${product_id}`,
        sku: `SKU-${product_id}`,
        category_name: 'General',
        branch_name: 'Main Branch',
        quantity_on_hand: 0,
        quantity_reserved: 0,
        quantity_available: 0,
        reorder_level: 10,
        cost_price: 0,
        selling_price: 0
      };
      stock.push(stockItem);
    }
    
    // Apply adjustment (positive = increase, negative = decrease)
    const adjustment = parseInt(quantity_change) || 0;
    stockItem.quantity_on_hand = Math.max(0, stockItem.quantity_on_hand + adjustment);
    stockItem.quantity_available = Math.max(0, stockItem.quantity_available + adjustment);
    
    res.json({
      success: true,
      message: reference_type === 'Stock Addition' ? 'Stock added successfully' : 'Stock adjustment completed successfully',
      data: stockItem
    });
  } catch (error) {
    console.error('Stock adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust stock',
      error: error.message
    });
  }
});

module.exports = router;
