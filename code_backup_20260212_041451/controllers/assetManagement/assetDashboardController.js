const db = require('../../models');
const Asset = db.Asset;
const MaintenanceRequest = db.MaintenanceRequest;
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const { Op } = require('sequelize');

class AssetDashboardController {
  async getAssetsSummary(req, res) {
    try {
      console.log('getAssetsSummary called with user:', req.user);
      const { school_id } = req.user;
      console.log('School ID:', school_id);

      const totalAssets = await Asset.count({ where: { school_id } });
      console.log('Total assets:', totalAssets);
      
      const workingAssets = await Asset.count({ where: { school_id, status: 'Operational' } });
      const underMaintenanceAssets = await Asset.count({ where: { school_id, status: 'Under Maintenance' } });
      const decommissionedAssets = await Asset.count({ where: { school_id, status: 'Decommissioned' } });

      const nearingEndOfLife = await Asset.findAll({
        where: {
          school_id,
          expected_life: { [Op.ne]: null },
          purchase_date: { [Op.ne]: null },
          [Op.and]: db.sequelize.literal(`DATE_ADD(purchase_date, INTERVAL expected_life YEAR) < DATE_ADD(NOW(), INTERVAL 1 YEAR)`)
        },
        attributes: ['asset_id', 'asset_tag', 'asset_name', 'last_inspection_date', 'next_inspection_date', 'status'],
        limit: 10
      });

      const monthlyMaintenance = await MaintenanceRequest.count({
        where: {
          school_id,
          request_date: {
            [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        }
      });

      const highCostAssets = await Asset.findAll({
        where: {
            school_id,
            purchase_cost: { [Op.gte]: 500000 }
        },
        attributes: ['asset_id', 'asset_tag', 'asset_name', 'category_name', 'status', 'room_name', 'branch_name'],
        order: [['purchase_cost', 'DESC']],
        limit: 10
      });

      // Calculate total value of all assets
      const totalValue = await Asset.sum('purchase_cost', { where: { school_id } });

      const summary = {
        totalAssets,
        statusBreakdown: {
          working: workingAssets,
          underMaintenance: underMaintenanceAssets,
          decommissioned: decommissionedAssets
        },
        totalValue: totalValue || 0,
        nearingEndOfLife: nearingEndOfLife.map(asset => ({
          asset_id: asset.asset_id,
          asset_tag: asset.asset_tag,
          asset_name: asset.asset_name,
          last_inspection_date: asset.last_inspection_date,
          next_inspection_date: asset.next_inspection_date,
          status: asset.status
        })),
        monthlyMaintenance,
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

      console.log('Summary result:', summary);
      return successResponse(res, 'Assets summary retrieved successfully', summary);
    } catch (error) {
      console.error('Get assets summary error:', error);
      return errorResponse(res, 'Failed to retrieve assets summary', 500);
    }
  }

  async getDashboardStats(req, res) {
    try {
      const { school_id } = req.user;

      const totalAssets = await Asset.count({ where: { school_id } });
      const workingAssets = await Asset.count({ where: { school_id, status: 'Operational' } });
      const underMaintenanceAssets = await Asset.count({ where: { school_id, status: 'Under Maintenance' } });
      const decommissionedAssets = await Asset.count({ where: { school_id, status: 'Decommissioned' } });

      const stats = {
        totalAssets,
        working: workingAssets,
        underMaintenance: underMaintenanceAssets,
        decommissioned: decommissionedAssets
      };

      return successResponse(res, 'Dashboard stats retrieved successfully', stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return errorResponse(res, 'Failed to retrieve dashboard stats', 500);
    }
  }

  async getAssetReports(req, res) {
    try {
      const { school_id } = req.user;

      // Example report data - adjust based on your needs
      const reports = {
        assetValueReport: await this.getAssetValueReport(school_id),
        maintenanceReport: await this.getMaintenanceReport(school_id),
        assetStatusReport: await this.getAssetStatusReport(school_id)
      };

      return successResponse(res, 'Asset reports retrieved successfully', reports);
    } catch (error) {
      console.error('Get asset reports error:', error);
      return errorResponse(res, 'Failed to retrieve asset reports', 500);
    }
  }

  async getAssetValueReport(school_id) {
    // Calculate total asset value
    const assetValue = await Asset.sum('purchase_cost', { where: { school_id } });

    // Get asset value by category
    const valueByCategory = await Asset.findAll({
      where: { school_id },
      attributes: ['category_id', [db.sequelize.fn('SUM', db.sequelize.col('purchase_cost')), 'total_value']],
      group: ['category_id'],
      raw: true
    });

    return {
      totalAssetValue: assetValue || 0,
      valueByCategory
    };
  }

  async getMaintenanceReport(school_id) {
    // Get maintenance statistics
    const scheduledMaintenance = await MaintenanceRequest.count({
      where: {
        school_id,
        status: 'Scheduled'
      }
    });

    const completedMaintenance = await MaintenanceRequest.count({
      where: {
        school_id,
        status: 'Completed'
      }
    });

    const inProgressMaintenance = await MaintenanceRequest.count({
      where: {
        school_id,
        status: 'In Progress'
      }
    });

    return {
      scheduledMaintenance,
      completedMaintenance,
      inProgressMaintenance
    };
  }

  async getAssetStatusReport(school_id) {
    // Get asset status breakdown
    const statusBreakdown = await Asset.findAll({
      where: { school_id },
      attributes: ['status', [db.sequelize.fn('COUNT', '*'), 'count']],
      group: ['status'],
      raw: true
    });

    return statusBreakdown;
  }
}

module.exports = new AssetDashboardController();
