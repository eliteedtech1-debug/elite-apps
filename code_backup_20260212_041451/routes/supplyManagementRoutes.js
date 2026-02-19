module.exports = (app) => {
  // Asset Management Routes
  const assetCategoryRoutes = require('./assetManagement/assetCategoryRoutes');
  const facilityRoomRoutes = require('./assetManagement/facilityRoomRoutes');
  const assetRoutes = require('./assetManagement/assetRoutes');
  const assetInspectionRoutes = require('./assetManagement/assetInspectionRoutes');
  const maintenanceRequestRoutes = require('./assetManagement/maintenanceRequestRoutes');
  const assetTransferRoutes = require('./assetManagement/assetTransferRoutes');
  const assetDashboardRoutes = require('./assetManagement/assetDashboardRoutes');

  // Retail Inventory Routes
  const productCategoryRoutes = require('./retailInventory/productCategoryRoutes');
  const productRoutes = require('./retailInventory/productRoutes');
  const productVariantRoutes = require('./retailInventory/productVariantRoutes');
  const stockManagementRoutes = require('./retailInventory/stockManagementRoutes');
  const supplierRoutes = require('./retailInventory/supplierRoutes');
  const purchaseOrderRoutes = require('./retailInventory/purchaseOrderRoutes');
  const salesTransactionRoutes = require('./retailInventory/salesTransactionRoutes');
  const stockAdjustmentRoutes = require('./retailInventory/stockAdjustmentRoutes');
  const stockTransactionRoutes = require('./retailInventory/stockTransactionRoutes');
  const inventoryDashboardRoutes = require('./retailInventory/inventoryDashboardRoutes');

  // Asset Management Routes
  app.use('/api/supply-management/asset-categories', assetCategoryRoutes);
  // Alias route for the format used by the frontend
  app.use('/api/supply-management/asset/categories', assetCategoryRoutes);
  app.use('/api/supply-management/facility-rooms', facilityRoomRoutes);
  app.use('/api/supply-management/assets', assetRoutes);
  
  // Add shorter alias routes for easier access
  app.use('/api/assets', assetRoutes);
  app.use('/api/asset-categories', assetCategoryRoutes);
  app.use('/api/facility-rooms', facilityRoomRoutes);
  
  app.use('/api/supply-management/asset-inspections', assetInspectionRoutes);
  app.use('/api/supply-management/maintenance-requests', maintenanceRequestRoutes);
  app.use('/api/supply-management/asset-transfers', assetTransferRoutes);
  app.use('/api/supply-management/asset/transfers', assetTransferRoutes); // Alias
  app.use('/api/supply-management/asset-dashboard', assetDashboardRoutes);

  // Retail Inventory Routes
  app.use('/api/supply-management/inventory/categories', productCategoryRoutes);
  app.use('/api/supply-management/inventory/products', productRoutes);
  app.use('/api/supply-management/inventory/variants', productVariantRoutes);
  app.use('/api/supply-management/inventory/stock', stockManagementRoutes);
  app.use('/api/supply-management/inventory/suppliers', supplierRoutes);
  app.use('/api/supply-management/inventory/orders', purchaseOrderRoutes);
  app.use('/api/supply-management/inventory/sales', salesTransactionRoutes);
  app.use('/api/supply-management/inventory/adjustments', stockAdjustmentRoutes);
  app.use('/api/supply-management/inventory/transactions', stockTransactionRoutes);
  app.use('/api/supply-management/inventory/dashboard', inventoryDashboardRoutes);

  // Supply Management Reports Routes
  app.use('/api/supply-management/reports', require('./supplyManagementReportRoutes'));
};