const Asset = require('../models/assetManagement/Asset');
const Product = require('../models/retailInventory/Product');
const ProductStock = require('../models/retailInventory/ProductStock');
const SalesTransaction = require('../models/retailInventory/SalesTransaction');
const StockTransaction = require('../models/retailInventory/StockTransaction');
const db = require('../config/database');

class SupplyManagementReportingService {
  // Get asset reports by various criteria
  static async getAssetReports(school_id, report_type, params = {}) {
    switch(report_type) {
      case 'assets-by-status':
        return this.getAssetsByStatusReport(school_id, params);
      case 'assets-by-category':
        return this.getAssetsByCategoryReport(school_id, params);
      case 'assets-by-location':
        return this.getAssetsByLocationReport(school_id, params);
      case 'maintenance-report':
        return this.getMaintenanceReport(school_id, params);
      case 'asset-depreciation':
        return this.getAssetDepreciationReport(school_id, params);
      default:
        throw new Error('Invalid report type for assets');
    }
  }

  // Get inventory reports by various criteria
  static async getInventoryReports(school_id, report_type, params = {}) {
    switch(report_type) {
      case 'inventory-summary':
        return this.getInventorySummaryReport(school_id, params);
      case 'low-stock-report':
        return this.getLowStockReport(school_id, params);
      case 'sales-report':
        return this.getSalesReport(school_id, params);
      case 'stock-movement':
        return this.getStockMovementReport(school_id, params);
      case 'product-profitability':
        return this.getProductProfitabilityReport(school_id, params);
      default:
        throw new Error('Invalid report type for inventory');
    }
  }

  // Asset reports
  static async getAssetsByStatusReport(school_id, params) {
    const { branch_id } = params;
    
    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(current_value) as total_value
      FROM assets
      WHERE school_id = ?
    `;
    const paramsArray = [school_id];

    if (branch_id) {
      query += ' AND branch_id = ?';
      paramsArray.push(branch_id);
    }

    query += ' GROUP BY status ORDER BY status';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  static async getAssetsByCategoryReport(school_id, params) {
    const { branch_id } = params;
    
    let query = `
      SELECT 
        ac.category_name,
        COUNT(*) as count,
        SUM(a.current_value) as total_value
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.category_id
      WHERE a.school_id = ?
    `;
    const paramsArray = [school_id];

    if (branch_id) {
      query += ' AND a.branch_id = ?';
      paramsArray.push(branch_id);
    }

    query += ' GROUP BY ac.category_id, ac.category_name ORDER BY count DESC';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  static async getAssetsByLocationReport(school_id, params) {
    const { branch_id } = params;
    
    let query = `
      SELECT 
        sl.branch_name,
        fr.room_name,
        COUNT(*) as count,
        SUM(a.current_value) as total_value
      FROM assets a
      LEFT JOIN school_locations sl ON a.branch_id = sl.branch_id
      LEFT JOIN facility_rooms fr ON a.room_id = fr.room_id
      WHERE a.school_id = ?
    `;
    const paramsArray = [school_id];

    if (branch_id) {
      query += ' AND a.branch_id = ?';
      paramsArray.push(branch_id);
    }

    query += ' GROUP BY sl.branch_id, sl.branch_name, fr.room_id, fr.room_name ORDER BY sl.branch_name, fr.room_name';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  static async getMaintenanceReport(school_id, params) {
    const { start_date, end_date } = params;
    
    let query = `
      SELECT 
        a.asset_name,
        a.asset_tag,
        mr.issue_description,
        mr.request_date,
        mr.status,
        mr.priority,
        mr.estimated_cost,
        mr.actual_cost
      FROM maintenance_requests mr
      LEFT JOIN assets a ON mr.asset_id = a.asset_id
      WHERE mr.school_id = ?
    `;
    const paramsArray = [school_id];

    if (start_date && end_date) {
      query += ' AND mr.request_date BETWEEN ? AND ?';
      paramsArray.push(start_date, end_date);
    }

    query += ' ORDER BY mr.request_date DESC';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  // Inventory reports
  static async getInventorySummaryReport(school_id, params) {
    const { branch_id } = params;
    
    let query = `
      SELECT 
        pc.category_name,
        COUNT(ps.product_id) as total_products,
        SUM(ps.quantity_available) as total_available,
        SUM(ps.quantity_on_hand * ps.cost_price) as total_cost_value,
        SUM(ps.quantity_available * ps.selling_price) as total_selling_value
      FROM product_stock ps
      LEFT JOIN products p ON ps.product_id = p.product_id
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      WHERE ps.school_id = ?
    `;
    const paramsArray = [school_id];

    if (branch_id) {
      query += ' AND ps.branch_id = ?';
      paramsArray.push(branch_id);
    }

    query += ' GROUP BY pc.category_id, pc.category_name ORDER BY total_available DESC';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  static async getLowStockReport(school_id, params) {
    const { branch_id } = params;
    
    let query = `
      SELECT 
        p.product_name,
        p.sku,
        ps.quantity_available,
        p.reorder_level,
        pc.category_name,
        sl.branch_name
      FROM product_stock ps
      LEFT JOIN products p ON ps.product_id = p.product_id
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      LEFT JOIN school_locations sl ON ps.branch_id = sl.branch_id
      WHERE ps.school_id = ? AND ps.quantity_available <= p.reorder_level
    `;
    const paramsArray = [school_id];

    if (branch_id) {
      query += ' AND ps.branch_id = ?';
      paramsArray.push(branch_id);
    }

    query += ' ORDER BY ps.quantity_available ASC';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  static async getSalesReport(school_id, params) {
    const { start_date, end_date, branch_id } = params;
    
    let query = `
      SELECT 
        st.sale_number,
        st.sale_date,
        st.customer_name,
        st.total_amount,
        st.payment_status,
        st.payment_method,
        u.name as sold_by_name,
        sl.branch_name
      FROM sales_transactions st
      LEFT JOIN users u ON st.sold_by = u.id
      LEFT JOIN school_locations sl ON st.branch_id = sl.branch_id
      WHERE st.school_id = ?
    `;
    const paramsArray = [school_id];

    if (start_date && end_date) {
      query += ' AND st.sale_date BETWEEN ? AND ?';
      paramsArray.push(start_date, end_date);
    }

    if (branch_id) {
      query += ' AND st.branch_id = ?';
      paramsArray.push(branch_id);
    }

    query += ' ORDER BY st.sale_date DESC';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  static async getStockMovementReport(school_id, params) {
    const { start_date, end_date, branch_id, product_id, transaction_type } = params;
    
    let query = `
      SELECT 
        st.transaction_date,
        st.transaction_type,
        p.product_name,
        p.sku,
        pv.variant_name,
        st.quantity,
        st.unit_cost,
        (st.quantity * st.unit_cost) as total_cost,
        st.notes,
        u.name as created_by_name
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.product_id
      LEFT JOIN product_variants pv ON st.variant_id = pv.variant_id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE st.school_id = ?
    `;
    const paramsArray = [school_id];

    if (start_date && end_date) {
      query += ' AND st.transaction_date BETWEEN ? AND ?';
      paramsArray.push(start_date, end_date);
    }

    if (branch_id) {
      query += ' AND st.branch_id = ?';
      paramsArray.push(branch_id);
    }

    if (product_id) {
      query += ' AND st.product_id = ?';
      paramsArray.push(product_id);
    }

    if (transaction_type) {
      query += ' AND st.transaction_type = ?';
      paramsArray.push(transaction_type);
    }

    query += ' ORDER BY st.transaction_date DESC, st.created_at DESC';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  static async getProductProfitabilityReport(school_id, params) {
    const { start_date, end_date, branch_id } = params;
    
    // This would require more complex queries to calculate profitability
    // For now, returning a simplified structure
    const query = `
      SELECT 
        p.product_name,
        p.sku,
        SUM(sti.quantity) as total_sold,
        SUM(sti.total_price) as total_revenue,
        SUM(sti.quantity * sti.cost_price) as total_cost,
        (SUM(sti.total_price) - SUM(sti.quantity * sti.cost_price)) as profit
      FROM sales_transaction_items sti
      LEFT JOIN sales_transactions st ON sti.sale_id = st.sale_id
      LEFT JOIN products p ON sti.product_id = p.product_id
      WHERE st.school_id = ?
    `;
    const paramsArray = [school_id];

    if (start_date && end_date) {
      query += ' AND st.sale_date BETWEEN ? AND ?';
      paramsArray.push(start_date, end_date);
    }

    if (branch_id) {
      query += ' AND st.branch_id = ?';
      paramsArray.push(branch_id);
    }

    query += ' GROUP BY sti.product_id, p.product_name, p.sku ORDER BY profit DESC';

    const [rows] = await db.execute(query, paramsArray);
    return rows;
  }

  // Export data to various formats
  static async exportReport(report_type, school_id, params = {}, format = 'json') {
    let reportData;

    if (report_type.startsWith('asset-')) {
      reportData = await this.getAssetReports(school_id, report_type, params);
    } else if (report_type.startsWith('inventory-')) {
      reportData = await this.getInventoryReports(school_id, report_type, params);
    } else {
      throw new Error('Invalid report type for export');
    }

    switch(format) {
      case 'json':
        return this.formatJson(reportData);
      case 'csv':
        return this.formatCsv(reportData);
      case 'pdf':
        return this.formatPdf(reportData, report_type, params);
      default:
        throw new Error('Unsupported export format');
    }
  }

  // Format data as JSON
  static formatJson(data) {
    return JSON.stringify(data, null, 2);
  }

  // Format data as CSV
  static formatCsv(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  // Format data as PDF (placeholder - would integrate with PDF generation library)
  static formatPdf(data, report_type, params) {
    // This would typically integrate with a PDF generation library like PDFKit or Puppeteer
    // For now, returning a placeholder
    return {
      message: `PDF export for ${report_type} would be generated here`,
      data: data.slice(0, 10), // Only show first 10 records in placeholder
      reportType: report_type,
      params: params
    };
  }
}

module.exports = SupplyManagementReportingService;