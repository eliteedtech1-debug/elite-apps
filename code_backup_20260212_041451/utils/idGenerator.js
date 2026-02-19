// Utility function for generating IDs
const crypto = require('crypto');

const generateId = (prefix = 'ID') => {
  // Generate a random string based on timestamp and random data
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(3).toString('hex');
  return `${prefix}-${timestamp}${randomPart}`.toUpperCase();
};

// Specific ID generators for different entities
const generateAssetId = () => generateId('ASSET');
const generateCategoryId = (type = 'GEN') => generateId(`CAT-${type}`);
const generateRoomId = () => generateId('ROOM');
const generateProductId = () => generateId('PROD');
const generateSupplierId = () => generateId('SUP');
const generatePurchaseOrderId = () => generateId('PO');
const generatePurchaseOrderItemId = () => generateId('PO-ITEM');
const generateSalesTransactionId = () => generateId('SALE');
const generateSalesTransactionItemId = () => generateId('SALE-ITEM');
const generateStockAdjustmentId = () => generateId('ADJ');
const generateAssetInspectionId = () => generateId('INS');
const generateAssetTransferId = () => generateId('TRANS');
const generateAssetDocumentId = () => generateId('DOC');
const generateMaintenanceRequestId = () => generateId('REQ');
const generateStockTransactionId = () => generateId('STOCK-TRANS');
const generateProductVariantId = () => generateId('VAR');
const generateTagId = () => generateId('TAG');

module.exports = {
  generateId,
  generateAssetId,
  generateCategoryId,
  generateRoomId,
  generateProductId,
  generateSupplierId,
  generatePurchaseOrderId,
  generatePurchaseOrderItemId,
  generateSalesTransactionId,
  generateSalesTransactionItemId,
  generateStockAdjustmentId,
  generateAssetInspectionId,
  generateAssetTransferId,
  generateAssetDocumentId,
  generateMaintenanceRequestId,
  generateStockTransactionId,
  generateProductVariantId,
  generateTagId
};