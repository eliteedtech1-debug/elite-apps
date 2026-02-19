// Supply Management API Root Route
const express = require('express');

module.exports = (app) => {
  // Import all supply management modules
  const assetManagementRoutes = require('../assetManagement/assetRoutes');
  const supplyManagementReportRoutes = require('../supplyManagementReportRoutes');

  // Root endpoint for supply management
  app.get('/api/supply-management', (req, res) => {
    res.json({
      success: true,
      message: 'Supply Management API is running',
      endpoints: {
        assetManagement: '/api/supply-management/asset/*',
        inventoryManagement: '/api/supply-management/inventory/*',
        reports: '/api/supply-management/reports/*'
      }
    });
  });

  // Asset Management Module Routes
  app.use('/api/supply-management/asset', assetManagementRoutes);

  // Retail Inventory Management Module Routes
  console.log('Loading product routes...');
  const productRoutes = require('../retailInventory/productRoutes');
  console.log('Product routes loaded successfully');
  app.use('/api/supply-management/inventory/products', productRoutes);
  console.log('Product routes mounted at /api/supply-management/inventory/products');
  
  const supplierRoutes = require('../retailInventory/supplierRoutes');
  app.use('/api/supply-management/inventory/suppliers', supplierRoutes);
  
  const stockManagementRoutes = require('../retailInventory/stockManagementRoutes');
  app.use('/api/supply-management/inventory/stock', stockManagementRoutes);
  console.log('Stock routes mounted at /api/supply-management/inventory/stock');
  
  const productCategoryRoutes = require('../retailInventory/productCategoryRoutes');
  app.use('/api/supply-management/inventory/categories', productCategoryRoutes);
  console.log('Category routes mounted at /api/supply-management/inventory/categories');
  
  // COMMENTED OUT: Conflicts with individual stock routes
  // app.use('/api/supply-management/inventory', inventoryManagementRoutes);

  // Supply Management Reports Routes
  app.use('/api/supply-management/reports', supplyManagementReportRoutes);
};