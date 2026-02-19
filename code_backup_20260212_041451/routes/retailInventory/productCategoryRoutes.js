const express = require('express');
const router = express.Router();
const passport = require('passport');
const db = require('../../models');

// In-memory storage for categories by school/branch
const categoriesBySchool = {};

// Reference to product storage (shared with productRoutes)
let productStorage = {};
try {
  const productRoutes = require('./productRoutes');
  if (productRoutes.productStorage) {
    productStorage = productRoutes.productStorage;
  }
} catch (error) {
  // Fallback if productRoutes not available
  productStorage = {};
}

// Additional storage for accounting and sales
const stockStorage = {};
const orderStorage = {};
const salesStorage = {};
const journalStorage = {};
const paymentStorage = {};
const ledgerStorage = {};
const productSalesStorage = {}; // Track product performance
const customerDebtStorage = {}; // Track outstanding debts

// Helper to get school key
const getSchoolKey = (req) => {
  const schoolId = req.headers['x-school-id'] || req.user?.school_id;
  const branchId = req.headers['x-branch-id'] || req.user?.branch_id;
  return `${schoolId}_${branchId || 'main'}`;
};

// Helper to get categories for school
const getSchoolCategories = (schoolKey) => {
  if (!categoriesBySchool[schoolKey]) {
    categoriesBySchool[schoolKey] = [
      {
        category_id: 'CAT001',
        category_name: 'Uniforms & Clothing',
        description: 'School uniforms, clothing and accessories',
        is_active: true
      },
      {
        category_id: 'CAT002',
        category_name: 'Stationery & Supplies',
        description: 'Books, pens, paper and office supplies',
        is_active: true
      },
      {
        category_id: 'CAT003',
        category_name: 'Sports Equipment',
        description: 'Sports and physical education equipment',
        is_active: true
      },
      {
        category_id: 'CAT004',
        category_name: 'Textbooks & Materials',
        description: 'Educational textbooks and learning materials',
        is_active: true
      },
      {
        category_id: 'CAT005',
        category_name: 'Electronics & IT',
        description: 'Electronic devices and IT equipment',
        is_active: true
      }
    ];
  }
  return categoriesBySchool[schoolKey];
};

// Test endpoint without auth
router.get('/test', (req, res) => {
  const schoolKey = getSchoolKey(req);
  const categories = getSchoolCategories(schoolKey);
  
  res.json({
    success: true,
    message: 'Product categories retrieved successfully',
    data: categories
  });
});

// POST route without auth for testing
router.post('/', async (req, res) => {
  try {
    const { category_name, is_active = true } = req.body;
    
    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const schoolKey = getSchoolKey(req);
    const categories = getSchoolCategories(schoolKey);
    
    const categoryId = `CAT${Date.now()}`;
    const newCategory = {
      category_id: categoryId,
      category_name,
      description: '',
      is_active
    };
    
    categories.push(newCategory);
    
    res.json({
      success: true,
      message: 'Product category created successfully',
      data: newCategory
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product category',
      error: error.message
    });
  }
});

// All other routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

// Product Category Routes
router.get('/', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const categories = getSchoolCategories(schoolKey);
    
    res.json({
      success: true,
      message: 'Product categories retrieved successfully',
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product categories',
      error: error.message
    });
  }
});

// Customers endpoint
router.get('/customers', async (req, res) => {
  try {
    const customers = [
      {
        customer_id: 'CUST001',
        customer_name: 'John Doe (Parent)',
        email: 'john.doe@email.com',
        phone: '+234-801-234-5678',
        customer_type: 'Parent'
      },
      {
        customer_id: 'CUST002',
        customer_name: 'Jane Smith (Parent)',
        email: 'jane.smith@email.com',
        phone: '+234-802-345-6789',
        customer_type: 'Parent'
      },
      {
        customer_id: 'CUST003',
        customer_name: 'Mike Johnson (Staff)',
        email: 'mike.johnson@school.edu',
        phone: '+234-803-456-7890',
        customer_type: 'Staff'
      }
    ];
    
    res.json({
      success: true,
      message: 'Customers retrieved successfully',
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve customers',
      error: error.message
    });
  }
});

// Create new sale with full accounting
router.post('/sales', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const {
      sale_number,
      customer_id,
      customer_name,
      customer_type,
      sale_date,
      items,
      subtotal,
      tax,
      total,
      payment_method,
      payment_status,
      accounting_entries,
      payment_entry,
      stock_updates
    } = req.body;

    // 1. Create sale record
    const saleRecord = {
      sale_id: `SAL${Date.now()}`,
      sale_number,
      customer_id,
      customer_name,
      customer_type,
      sale_date,
      items,
      subtotal,
      tax,
      total,
      payment_method,
      payment_status,
      sold_by: req.user?.name || req.user?.email || 'Unknown',
      created_at: new Date().toISOString(),
      school_id: req.user?.school_id || 'SCH/20',
      branch_id: req.user?.branch_id || null
    };

    // Store sale
    if (!salesStorage[schoolKey]) salesStorage[schoolKey] = [];
    salesStorage[schoolKey].push(saleRecord);

    // 2. Update product stock quantities
    const products = productStorage[schoolKey] || [];
    stock_updates.forEach(update => {
      const productIndex = products.findIndex(p => p.product_id === update.product_id);
      if (productIndex !== -1) {
        products[productIndex].stock_quantity = update.remaining_stock;
        products[productIndex].last_updated = new Date().toISOString();
      }
    });

    // 3. Create journal entries for proper accounting
    const journalEntries = accounting_entries.map(entry => ({
      entry_id: `JE${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transaction_date: sale_date,
      reference_number: sale_number,
      account_name: entry.account_name,
      account_code: entry.account_code,
      account_type: entry.account_type,
      debit_amount: entry.account_type === 'DEBIT' ? entry.amount : 0,
      credit_amount: entry.account_type === 'CREDIT' ? entry.amount : 0,
      description: entry.description,
      transaction_type: 'SALE',
      created_at: new Date().toISOString(),
      school_id: req.user?.school_id || 'SCH/20',
      branch_id: req.user?.branch_id || null
    }));

    // Store journal entries
    if (!journalStorage[schoolKey]) journalStorage[schoolKey] = [];
    journalStorage[schoolKey].push(...journalEntries);

    // 4. Create payment entry record
    const paymentRecord = {
      payment_id: `PAY${Date.now()}`,
      reference_number: sale_number,
      payment_type: payment_entry.payment_type,
      amount: payment_entry.amount,
      payment_method: payment_entry.payment_method,
      payer_name: payment_entry.payer_name,
      payer_type: payment_entry.payer_type,
      description: payment_entry.description,
      status: payment_entry.status,
      payment_date: sale_date,
      created_at: new Date().toISOString(),
      school_id: req.user?.school_id || 'SCH/20',
      branch_id: req.user?.branch_id || null
    };

    // Store payment entry
    if (!paymentStorage[schoolKey]) paymentStorage[schoolKey] = [];
    paymentStorage[schoolKey].push(paymentRecord);

    // 5. Update ledger balances
    const ledgerUpdates = {};
    accounting_entries.forEach(entry => {
      if (!ledgerUpdates[entry.account_code]) {
        ledgerUpdates[entry.account_code] = {
          account_name: entry.account_name,
          account_code: entry.account_code,
          debit_total: 0,
          credit_total: 0
        };
      }
      
      if (entry.account_type === 'DEBIT') {
        ledgerUpdates[entry.account_code].debit_total += entry.amount;
      } else {
        ledgerUpdates[entry.account_code].credit_total += entry.amount;
      }
    });

    // Store ledger updates
    if (!ledgerStorage[schoolKey]) ledgerStorage[schoolKey] = {};
    Object.keys(ledgerUpdates).forEach(accountCode => {
      if (!ledgerStorage[schoolKey][accountCode]) {
        ledgerStorage[schoolKey][accountCode] = {
          ...ledgerUpdates[accountCode],
          balance: 0,
          last_updated: new Date().toISOString()
        };
      }
      
      const account = ledgerStorage[schoolKey][accountCode];
      account.debit_total = (account.debit_total || 0) + ledgerUpdates[accountCode].debit_total;
      account.credit_total = (account.credit_total || 0) + ledgerUpdates[accountCode].credit_total;
      
      // Calculate balance based on account type
      if (['1001', '1201', '5001'].includes(accountCode)) { // Assets, COGS
        account.balance = account.debit_total - account.credit_total;
      } else { // Liabilities, Revenue
        account.balance = account.credit_total - account.debit_total;
      }
      
      account.last_updated = new Date().toISOString();
    });

    // 6. Track product sales performance
    items.forEach(item => {
      const productKey = `${schoolKey}_${item.product_id}`;
      if (!productSalesStorage[productKey]) {
        productSalesStorage[productKey] = {
          product_id: item.product_id,
          product_name: item.product_name,
          total_quantity_sold: 0,
          total_revenue: 0,
          sales_count: 0,
          last_sale_date: null,
          school_id: req.user?.school_id || 'SCH/20'
        };
      }
      
      const productSales = productSalesStorage[productKey];
      productSales.total_quantity_sold += item.quantity;
      productSales.total_revenue += item.subtotal;
      productSales.sales_count += 1;
      productSales.last_sale_date = sale_date;
    });

    // 7. Handle customer debt tracking (for partial payments)
    const customerKey = `${schoolKey}_${customer_id}`;
    if (payment_status === 'Partial' || payment_status === 'Pending') {
      const amountPaid = req.body.amount_paid || 0;
      const outstandingAmount = total - amountPaid;
      
      if (!customerDebtStorage[customerKey]) {
        customerDebtStorage[customerKey] = {
          customer_id,
          customer_name,
          customer_type,
          total_debt: 0,
          transactions: [],
          school_id: req.user?.school_id || 'SCH/20'
        };
      }
      
      customerDebtStorage[customerKey].total_debt += outstandingAmount;
      customerDebtStorage[customerKey].transactions.push({
        sale_number,
        sale_date,
        total_amount: total,
        amount_paid: amountPaid,
        outstanding: outstandingAmount,
        status: payment_status
      });
    }

    res.json({
      success: true,
      message: 'Sale processed successfully with full accounting',
      data: {
        sale: saleRecord,
        journal_entries: journalEntries.length,
        payment_entry: paymentRecord.payment_id,
        stock_updates: stock_updates.length,
        ledger_accounts_updated: Object.keys(ledgerUpdates).length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process sale',
      error: error.message
    });
  }
});

// Get products with stock quantities
router.get('/products', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    let products = productStorage[schoolKey] || [];
    
    // Add sample products if storage is empty
    if (products.length === 0) {
      products = [
        {
          product_id: 'PRD001',
          product_name: 'School Uniform Shirt',
          sku: 'UNI-0001',
          selling_price: 2500,
          stock_quantity: 25,
          category: 'Uniforms'
        },
        {
          product_id: 'PRD002',
          product_name: 'Exercise Books (Pack of 10)',
          sku: 'STA-0001',
          selling_price: 150,
          stock_quantity: 45,
          category: 'Stationery'
        },
        {
          product_id: 'PRD003',
          product_name: 'Football (Size 5)',
          sku: 'SPO-0001',
          selling_price: 3500,
          stock_quantity: 8,
          category: 'Sports'
        },
        {
          product_id: 'PRD004',
          product_name: 'Scientific Calculator',
          sku: 'STA-0002',
          selling_price: 1200,
          stock_quantity: 15,
          category: 'Stationery'
        },
        {
          product_id: 'PRD005',
          product_name: 'School Bag',
          sku: 'UNI-0002',
          selling_price: 4500,
          stock_quantity: 0,
          category: 'Uniforms'
        }
      ];
      
      // Store the sample products
      productStorage[schoolKey] = products;
    }
    
    // Ensure all products have stock_quantity
    const productsWithStock = products.map(product => ({
      ...product,
      stock_quantity: product.stock_quantity !== undefined ? product.stock_quantity : Math.floor(Math.random() * 50) + 10,
      selling_price: product.selling_price || 1000 + Math.floor(Math.random() * 5000)
    }));
    
    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: productsWithStock
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message
    });
  }
});

// Get sales transactions
router.get('/sales', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    let sales = salesStorage[schoolKey] || [];
    
    // Add sample sales if storage is empty (for testing)
    if (sales.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      sales = [
        {
          sale_id: 'SAL001',
          sale_number: 'SAL-2026-001',
          customer_name: 'John Doe (Parent)',
          sale_date: today,
          total: 2650,
          payment_status: 'Paid',
          sold_by: 'Admin User',
          items: [
            { product_id: 'PRD001', product_name: 'School Uniform Shirt', quantity: 1, price: 2500 },
            { product_id: 'PRD002', product_name: 'Exercise Books (Pack of 10)', quantity: 1, price: 150 }
          ]
        },
        {
          sale_id: 'SAL002', 
          sale_number: 'SAL-2026-002',
          customer_name: 'Jane Smith (Student)',
          sale_date: today,
          total: 3550,
          payment_status: 'Paid',
          sold_by: 'Admin User',
          items: [
            { product_id: 'PRD002', product_name: 'Exercise Books (Pack of 10)', quantity: 3, price: 150 },
            { product_id: 'PRD004', product_name: 'Scientific Calculator', quantity: 1, price: 1200 },
            { product_id: 'PRD003', product_name: 'Football (Size 5)', quantity: 1, price: 1900 }
          ]
        }
      ];
      salesStorage[schoolKey] = sales;
    }
    
    res.json({
      success: true,
      message: 'Sales transactions retrieved successfully',
      data: sales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sales transactions',
      error: error.message
    });
  }
});

// Get journal entries
router.get('/journal-entries', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const entries = journalStorage[schoolKey] || [];
    
    res.json({
      success: true,
      message: 'Journal entries retrieved successfully',
      data: entries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve journal entries',
      error: error.message
    });
  }
});

// Get payment entries
router.get('/payment-entries', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const payments = paymentStorage[schoolKey] || [];
    
    res.json({
      success: true,
      message: 'Payment entries retrieved successfully',
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment entries',
      error: error.message
    });
  }
});

// Get product sales analytics
router.get('/product-analytics', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'productCategoryRoutes.js:577',message:'product-analytics endpoint called',data:{startDate:req.query.startDate,endDate:req.query.endDate,schoolId:req.user?.school_id,branchId:req.user?.branch_id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const schoolId = req.headers['x-school-id'] || req.user?.school_id;
    const branchId = req.headers['x-branch-id'] || req.user?.branch_id;
    const { startDate, endDate } = req.query;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'productCategoryRoutes.js:584',message:'Extracted query params',data:{schoolId,branchId,startDate,endDate},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }
    
    // Calculate date range for current period
    const currentStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentEndDate = endDate || new Date().toISOString().split('T')[0];
    
    // Calculate previous period (same duration before current period)
    const currentStart = new Date(currentStartDate);
    const currentEnd = new Date(currentEndDate);
    const periodDays = Math.ceil((currentEnd - currentStart) / (1000 * 60 * 60 * 24));
    const prevEndDate = new Date(currentStart);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);
    const prevStartDateStr = prevStartDate.toISOString().split('T')[0];
    const prevEndDateStr = prevEndDate.toISOString().split('T')[0];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'productCategoryRoutes.js:605',message:'Calculated date ranges',data:{currentStartDate,currentEndDate,prevStartDateStr,prevEndDateStr},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Query current period sales from payment_entries
    // Note: Database uses 'Items' (title case, plural), not 'ITEMS' (uppercase)
    const currentPeriodQuery = `
      SELECT 
        description as product_name,
        SUM(quantity) as total_sold,
        SUM(dr) as total_revenue,
        COUNT(*) as sales_count,
        AVG(dr / NULLIF(quantity, 0)) as avg_price
      FROM payment_entries
      WHERE school_id = ?
        ${branchId ? 'AND (branch_id = ? OR branch_id IS NULL)' : ''}
        AND item_category = 'Items'
        AND payment_status != 'Excluded'
        AND dr > 0
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY description
      ORDER BY total_revenue DESC
    `;
    
    const currentParams = branchId 
      ? [schoolId, branchId, currentStartDate, currentEndDate]
      : [schoolId, currentStartDate, currentEndDate];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'productCategoryRoutes.js:627',message:'Executing current period query',data:{query:currentPeriodQuery.substring(0,100),params:currentParams},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const currentPeriodData = await db.sequelize.query(currentPeriodQuery, {
      replacements: currentParams,
      type: db.sequelize.QueryTypes.SELECT
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'productCategoryRoutes.js:635',message:'Current period query result',data:{rowCount:Array.isArray(currentPeriodData)?currentPeriodData.length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // #region agent log - Check what item_category values actually exist
    const checkCategoryQuery = `SELECT DISTINCT item_category, COUNT(*) as count FROM payment_entries WHERE school_id = ? ${branchId ? 'AND (branch_id = ? OR branch_id IS NULL)' : ''} AND dr > 0 AND DATE(created_at) BETWEEN ? AND ? GROUP BY item_category`;
    const checkCategoryParams = branchId ? [schoolId, branchId, currentStartDate, currentEndDate] : [schoolId, currentStartDate, currentEndDate];
    const categoryData = await db.sequelize.query(checkCategoryQuery, {replacements:checkCategoryParams,type:db.sequelize.QueryTypes.SELECT});
    fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'productCategoryRoutes.js:652',message:'Item category values in database',data:{categories:categoryData,query:'item_category = ITEMS'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Query previous period for comparison
    const prevPeriodQuery = `
      SELECT 
        description as product_name,
        SUM(quantity) as total_sold,
        SUM(dr) as total_revenue
      FROM payment_entries
      WHERE school_id = ?
        ${branchId ? 'AND (branch_id = ? OR branch_id IS NULL)' : ''}
        AND item_category = 'Items'
        AND payment_status != 'Excluded'
        AND dr > 0
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY description
    `;
    
    const prevParams = branchId
      ? [schoolId, branchId, prevStartDateStr, prevEndDateStr]
      : [schoolId, prevStartDateStr, prevEndDateStr];
    
    const prevPeriodData = await db.sequelize.query(prevPeriodQuery, {
      replacements: prevParams,
      type: db.sequelize.QueryTypes.SELECT
    });
    
    // Create map of previous period data by product name
    const prevPeriodMap = {};
    (prevPeriodData || []).forEach(item => {
      prevPeriodMap[item.product_name] = {
        total_sold: parseFloat(item.total_sold) || 0,
        total_revenue: parseFloat(item.total_revenue) || 0
      };
    });
    
    // Transform current period data and add comparison metrics
    const analytics = (currentPeriodData || []).map((item, index) => {
      const totalSold = parseFloat(item.total_sold) || 0;
      const totalRevenue = parseFloat(item.total_revenue) || 0;
      const avgPrice = parseFloat(item.avg_price) || 0;
      const salesCount = parseInt(item.sales_count) || 0;
      
      const prevData = prevPeriodMap[item.product_name] || { total_sold: 0, total_revenue: 0 };
      const prevSold = prevData.total_sold;
      const prevRevenue = prevData.total_revenue;
      
      const quantityChange = totalSold - prevSold;
      const revenueChange = totalRevenue - prevRevenue;
      const quantityTrend = prevSold > 0 ? ((quantityChange / prevSold) * 100) : (totalSold > 0 ? 100 : 0);
      const revenueTrend = prevRevenue > 0 ? ((revenueChange / prevRevenue) * 100) : (totalRevenue > 0 ? 100 : 0);
      
      return {
        id: `product_${index}`,
        product_id: `product_${index}`,
        product_name: item.product_name,
        current_stock: 0, // Not available from payment_entries
        total_sold: totalSold,
        total_revenue: totalRevenue,
        sales_count: salesCount,
        prev_sold: prevSold,
        prev_revenue: prevRevenue,
        quantity_change: quantityChange,
        revenue_change: revenueChange,
        quantity_trend: quantityTrend,
        revenue_trend: revenueTrend,
        avg_price: avgPrice
      };
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'productCategoryRoutes.js:695',message:'Analytics transformation complete',data:{analyticsCount:analytics.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    res.json({
      success: true,
      message: 'Product sales analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/062549ea-4903-4db6-8434-086f4d78edd6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'productCategoryRoutes.js:704',message:'Error in product-analytics',data:{error:error.message,stack:error.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.error('Product analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product analytics',
      error: error.message
    });
  }
});

// Get customer debts
router.get('/customer-debts', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const debts = [];
    
    Object.keys(customerDebtStorage).forEach(key => {
      if (key.startsWith(schoolKey)) {
        const debt = customerDebtStorage[key];
        if (debt.total_debt > 0) {
          debts.push(debt);
        }
      }
    });
    
    // Sort by debt amount descending
    debts.sort((a, b) => b.total_debt - a.total_debt);
    
    res.json({
      success: true,
      message: 'Customer debts retrieved successfully',
      data: debts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer debts',
      error: error.message
    });
  }
});

// Get revenue summary
router.get('/revenue-summary', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const sales = salesStorage[schoolKey] || [];
    
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    
    const todaySales = sales.filter(s => s.sale_date === today);
    const monthSales = sales.filter(s => s.sale_date.startsWith(thisMonth));
    
    const totalDebts = Object.keys(customerDebtStorage)
      .filter(key => key.startsWith(schoolKey))
      .reduce((sum, key) => sum + customerDebtStorage[key].total_debt, 0);
    
    const summary = {
      today: {
        sales_count: todaySales.length,
        revenue: todaySales.reduce((sum, s) => sum + s.total, 0)
      },
      month: {
        sales_count: monthSales.length,
        revenue: monthSales.reduce((sum, s) => sum + s.total, 0)
      },
      outstanding_debts: totalDebts,
      total_customers_with_debt: Object.keys(customerDebtStorage)
        .filter(key => key.startsWith(schoolKey) && customerDebtStorage[key].total_debt > 0).length
    };
    
    res.json({
      success: true,
      message: 'Revenue summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve revenue summary',
      error: error.message
    });
  }
});

// Get ledger balances
router.get('/ledger', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const ledger = ledgerStorage[schoolKey] || {};
    
    res.json({
      success: true,
      message: 'Ledger balances retrieved successfully',
      data: Object.values(ledger)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve ledger balances',
      error: error.message
    });
  }
});

module.exports = router;

// POST endpoint for creating sales transactions
router.post('/sales', async (req, res) => {
  try {
    const newSale = {
      transaction_id: `TXN${Date.now()}`,
      transaction_number: `SAL-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      ...req.body,
      created_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Sales transaction created successfully',
      data: newSale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create sales transaction',
      error: error.message
    });
  }
});

// Temporary purchase orders endpoint (until server restart)
router.get('/orders', async (req, res) => {
  try {
    const orders = [
      {
        order_id: 'PO001',
        po_number: 'PO-2026-001',
        order_number: 'PO-2026-001',
        supplier_name: 'SchoolWear Suppliers Ltd',
        order_date: '2026-01-01',
        expected_delivery: '2026-01-10',
        expected_delivery_date: '2026-01-10',
        status: 'pending',
        total_amount: 125000,
        grand_total: 125000,
        items_count: 3,
        created_by: 'Admin User'
      },
      {
        order_id: 'PO002',
        po_number: 'PO-2026-002',
        order_number: 'PO-2026-002',
        supplier_name: 'StudyMax Stationery',
        order_date: '2026-01-03',
        expected_delivery: '2026-01-08',
        expected_delivery_date: '2026-01-08',
        status: 'delivered',
        total_amount: 45000,
        grand_total: 45000,
        items_count: 5,
        created_by: 'Admin User'
      }
    ];
    
    res.json({
      success: true,
      message: 'Purchase orders retrieved successfully',
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve purchase orders',
      error: error.message
    });
  }
});

// POST endpoint for creating purchase orders
router.post('/orders', async (req, res) => {
  try {
    const schoolKey = getSchoolKey(req);
    const orders = getSchoolCategories(schoolKey); // Reuse categories storage for orders
    
    const newOrder = {
      order_id: `PO${Date.now()}`,
      order_number: `PO-2026-${String(orders.length + 1).padStart(3, '0')}`,
      ...req.body,
      created_at: new Date().toISOString()
    };
    
    // Store in a separate orders array (simulate)
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

// PUT endpoint for updating purchase orders
router.put('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    res.json({
      success: true,
      message: 'Purchase order updated successfully',
      data: {
        order_id: orderId,
        ...req.body,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update purchase order',
      error: error.message
    });
  }
});

router.get('/:category_id', async (req, res) => {
  try {
    const { category_id } = req.params;
    const { school_id } = req.user;
    
    res.json({
      success: true,
      message: 'Product category retrieved successfully',
      data: {
        category_id,
        category_name: 'Sample Category',
        description: 'Sample category description',
        is_active: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product category',
      error: error.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category_name, is_active = true } = req.body;
    
    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const categoryId = `CAT${Date.now()}`;
    
    res.json({
      success: true,
      message: 'Product category created successfully',
      data: {
        category_id: categoryId,
        category_name,
        is_active
      }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product category',
      error: error.message
    });
  }
});

module.exports = router;