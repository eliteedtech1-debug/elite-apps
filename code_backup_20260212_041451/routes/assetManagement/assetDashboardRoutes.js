const express = require('express');
const router = express.Router();
const passport = require('passport');

// Temporary test endpoint without auth
router.get('/test-data', async (req, res) => {
  const summary = {
    totalAssets: 3,
    statusBreakdown: {
      working: 2,
      underMaintenance: 1,
      decommissioned: 0
    },
    totalValue: 150000,
    nearingEndOfLife: [],
    monthlyMaintenance: 0,
    highCostAssets: [
      {
        asset_id: 'AST002',
        asset_tag: 'PROJ001',
        asset_name: 'Projector',
        category_name: 'Electronics',
        status: 'Under Maintenance',
        room_name: 'Classroom A',
        branch_name: 'Main Campus'
      }
    ]
  };
  
  res.json({
    success: true,
    message: 'Assets summary retrieved successfully',
    data: summary
  });
});

// All other routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

router.get('/summary', async (req, res) => {
  try {
    const db = require('../../models');
    const { Asset } = db;
    
    const { school_id } = req.user;
    
    const totalAssets = await Asset.count({ where: { school_id } });
    const workingAssets = await Asset.count({ where: { school_id, status: 'Operational' } });
    const underMaintenanceAssets = await Asset.count({ where: { school_id, status: 'Under Maintenance' } });
    const decommissionedAssets = await Asset.count({ where: { school_id, status: 'Decommissioned' } });
    
    const highCostAssets = await Asset.findAll({
      where: { school_id },
      attributes: ['asset_id', 'asset_tag', 'asset_name', 'category_name', 'status', 'room_name', 'branch_name'],
      order: [['purchase_cost', 'DESC']],
      limit: 10
    });
    
    const totalValue = await Asset.sum('purchase_cost', { where: { school_id } });
    
    const summary = {
      totalAssets,
      statusBreakdown: {
        working: workingAssets,
        underMaintenance: underMaintenanceAssets,
        decommissioned: decommissionedAssets
      },
      totalValue: totalValue || 0,
      nearingEndOfLife: [],
      monthlyMaintenance: 0,
      highCostAssets: highCostAssets.map(asset => ({
        asset_id: asset.asset_id,
        asset_tag: asset.asset_tag,
        asset_name: asset.asset_name,
        category_name: asset.category_name,
        status: asset.status,
        room_name: asset.room_name,
        branch_name: asset.branch_name
      }))
    };
    
    res.json({
      success: true,
      message: 'Assets summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    console.error('Get assets summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assets summary',
      error: error.message
    });
  }
});

module.exports = router;
