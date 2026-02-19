const express = require('express');
const router = express.Router();
const passport = require('passport');

// Test endpoint without auth
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Inventory dashboard API is working', 
    timestamp: new Date() 
  });
});

// Test stats endpoint with mock data
router.get('/test-stats', (req, res) => {
  const mockStats = {
    totalProducts: 25,
    totalStockValue: 2500000,
    lowStockItems: 3,
    totalMonthlySales: 850000
  };
  
  res.json({
    success: true,
    message: 'Dashboard stats retrieved successfully',
    data: mockStats
  });
});

// All other routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

// Dashboard Routes
router.get('/stats', async (req, res) => {
  try {
    const { school_id } = req.user;
    
    // Simplified stats for now
    const stats = {
      totalProducts: 0,
      totalStockValue: 0,
      lowStockItems: 0,
      totalMonthlySales: 0
    };
    
    res.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory dashboard statistics',
      error: error.message
    });
  }
});

module.exports = router;