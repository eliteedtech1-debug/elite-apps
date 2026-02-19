const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// In-memory storage for created products (by school_id)
const productStorage = {};

// Test endpoint without auth
router.get('/test', (req, res) => {
  const mockProducts = [
    {
      product_id: 'PRD001',
      product_name: 'School Uniform Shirt',
      sku: 'UNI-SHIRT-001',
      category_name: 'Uniforms',
      selling_price: 2500,
      cost_price: 1800,
      quantity_available: 45,
      is_active: true
    }
  ];
  
  res.json({
    success: true,
    message: 'Products retrieved successfully',
    data: mockProducts
  });
});

// All other routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

// Create product with JSON or file upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { school_id } = req.user;
    const file = req.file;
    
    // Initialize storage for school if not exists
    if (!productStorage[school_id]) {
      productStorage[school_id] = [];
    }
    
    const productData = req.body;
    
    const newProduct = {
      product_id: 'PRD' + Date.now(),
      product_name: productData.product_name || 'New Product',
      sku: productData.sku || 'SKU-' + Date.now(),
      category_id: productData.category_id || 'CAT001',
      category_name: productData.category_id === 'CAT002' ? 'Stationery' : 'Uniforms',
      brand: productData.brand || '',
      unit_of_measure: productData.unit_of_measure || 'piece',
      selling_price: parseInt(productData.selling_price) || 0,
      cost_price: parseInt(productData.cost_price) || 0,
      reorder_level: parseInt(productData.reorder_level) || 0,
      quantity_available: parseInt(productData.quantity_available) || 0,
      has_variants: productData.has_variants || false,
      description: productData.description || '',
      notes: productData.notes || '',
      is_active: productData.is_active !== false,
      product_image_url: productData.product_image_url || (file ? `/uploads/${file.originalname}` : null),
      created_at: new Date().toISOString(),
      school_id
    };
    
    // Store the product
    productStorage[school_id].push(newProduct);
    
    console.log(`Product created for school ${school_id}:`, newProduct.product_name);
    
    res.json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// Get all products for the school
router.get('/', async (req, res) => {
  try {
    const { school_id } = req.user;
    
    // Get products for this school from storage
    const schoolProducts = productStorage[school_id] || [];
    
    // If no products created yet, return default mock data
    const products = schoolProducts.length > 0 ? schoolProducts : [
      {
        product_id: 'PRD001',
        product_name: 'School Uniform Shirt',
        sku: 'UNI-0001',
        category_name: 'Uniforms & Clothing',
        brand: 'SchoolWear Pro',
        unit_of_measure: 'piece',
        selling_price: 2500,
        cost_price: 1800,
        quantity_available: 45,
        reorder_level: 10,
        is_active: true
      },
      {
        product_id: 'PRD002',
        product_name: 'Exercise Books (Pack of 10)', 
        sku: 'STA-0001',
        category_name: 'Stationery & Supplies',
        brand: 'StudyMax',
        unit_of_measure: 'pack',
        selling_price: 150,
        cost_price: 100,
        quantity_available: 120,
        reorder_level: 20,
        is_active: true
      },
      {
        product_id: 'PRD003',
        product_name: 'Football (Size 5)', 
        sku: 'SPO-0001',
        category_name: 'Sports Equipment',
        brand: 'SportsPro',
        unit_of_measure: 'piece',
        selling_price: 3500,
        cost_price: 2800,
        quantity_available: 8,
        reorder_level: 5,
        is_active: true
      }
    ];
    
    console.log(`Returning ${products.length} products for school ${school_id}`);
    
    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message
    });
  }
});

router.get('/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;
    const { school_id } = req.user;
    
    // Find product in storage
    const schoolProducts = productStorage[school_id] || [];
    const product = schoolProducts.find(p => p.product_id === product_id);
    
    if (product) {
      res.json({
        success: true,
        message: 'Product retrieved successfully',
        data: product
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product',
      error: error.message
    });
  }
});

module.exports = router;