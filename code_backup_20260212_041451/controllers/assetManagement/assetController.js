const db = require('../../models');
const Asset = db.Asset;
const AssetCategory = db.AssetCategory;
const FacilityRoom = db.FacilityRoom;
const SchoolLocation = require('../../models/SchoolLocation');
const { generateId, generateAssetId, generateTagId } = require('../../utils/idGenerator');
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const { Op } = require('sequelize');

class AssetController {
  // Create new asset
  async createAsset(req, res) {
    try {
      const {
        asset_name, category_id, brand, model, serial_number,
        description, purchase_date, purchase_cost, warranty_expiry_date,
        supplier_name, supplier_contact, room_id, branch_id, status,
        condition_rating, notes, expected_life
      } = req.body;

      const { school_id, id: user_id } = req.user;

      // Validate room_id if provided
      let validRoomId = null;
      if (room_id) {
        const room = await FacilityRoom.findOne({ where: { room_id, school_id } });
        if (room) {
          validRoomId = room_id;
        }
      }

      const asset_id = generateAssetId();
      const asset_tag = generateTagId();

      const assetData = {
        asset_id,
        asset_tag,
        asset_name,
        category_id,
        brand,
        model,
        serial_number,
        description,
        purchase_date,
        purchase_cost,
        current_value: purchase_cost, // Initially same as purchase cost
        depreciation_rate: 0,
        expected_life,
        warranty_expiry_date,
        supplier_name,
        supplier_contact,
        room_id: validRoomId,
        branch_id,
        school_id,
        status: status || 'Working',
        condition_rating: condition_rating || 'Good',
        notes,
        created_by: user_id
      };

      const newAsset = await Asset.create(assetData);

      // Log asset creation
      await this.logAssetHistory(
        asset_id,
        'Created',
        `Asset "${asset_name}" created and registered in system`,
        user_id,
        req.user.name || 'System User',
        school_id,
        null,
        assetData
      );

      return successResponse(res, 'Asset created successfully', { asset_id, asset_tag }, 201);
    } catch (error) {
      console.error('Create asset error:', error);
      return errorResponse(res, 'Failed to create asset', 500);
    }
  }

  // Get asset images
  async getAssetImages(req, res) {
    try {
      const { asset_id } = req.params;
      
      if (!asset_id) {
        return errorResponse(res, 'Asset ID is required', 400);
      }

      // For now, return empty array since we don't have asset images table
      // This can be extended when asset images functionality is implemented
      return successResponse(res, 'Asset images retrieved successfully', []);
      
    } catch (error) {
      console.error('Error in getAssetImages:', error);
      return errorResponse(res, 'Failed to retrieve asset images', 500);
    }
  }

  // Generate QR code for asset
  async generateQR(req, res) {
    try {
      const { asset_id } = req.params;
      
      if (!asset_id) {
        return errorResponse(res, 'Asset ID is required', 400);
      }

      // Check if asset exists
      const asset = await Asset.findByPk(asset_id);
      if (!asset) {
        return errorResponse(res, 'Asset not found', 404);
      }

      // Generate QR code URL (you can use a QR code library like qrcode)
      const qrData = {
        asset_id: asset.asset_id,
        asset_name: asset.asset_name,
        asset_tag: asset.asset_tag,
        url: `${req.protocol}://${req.get('host')}/api/assets/${asset_id}`
      };

      // For now, return the data that would be encoded in QR
      // In production, you'd generate actual QR code image
      return successResponse(res, 'QR code data generated successfully', {
        qr_data: JSON.stringify(qrData),
        qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}`
      });

    } catch (error) {
      console.error('Generate QR error:', error);
      return errorResponse(res, 'Failed to generate QR code', 500);
    }
  }

  // View asset history
  async viewHistory(req, res) {
    try {
      const { asset_id } = req.params;
      
      if (!asset_id) {
        return errorResponse(res, 'Asset ID is required', 400);
      }

      // Get asset history from various tables
      const history = await db.sequelize.query(`
        SELECT 
          'transfer' as action_type,
          at.transfer_date as action_date,
          CONCAT('Transferred from ', fr1.room_name, ' to ', fr2.room_name) as description,
          at.notes,
          at.created_at
        FROM asset_transfers at
        LEFT JOIN facility_rooms fr1 ON at.from_room_id = fr1.room_id
        LEFT JOIN facility_rooms fr2 ON at.to_room_id = fr2.room_id
        WHERE at.asset_id = :asset_id
        
        UNION ALL
        
        SELECT 
          'inspection' as action_type,
          ai.inspection_date as action_date,
          CONCAT('Inspection - Status: ', ai.status) as description,
          ai.notes,
          ai.created_at
        FROM asset_inspections ai
        WHERE ai.asset_id = :asset_id
        
        UNION ALL
        
        SELECT 
          'maintenance' as action_type,
          mr.request_date as action_date,
          CONCAT('Maintenance Request - ', mr.request_type) as description,
          mr.description as notes,
          mr.created_at
        FROM maintenance_requests mr
        WHERE mr.asset_id = :asset_id
        
        ORDER BY action_date DESC, created_at DESC
      `, {
        replacements: { asset_id },
        type: db.sequelize.QueryTypes.SELECT,
      });

      return successResponse(res, 'Asset history retrieved successfully', history);

    } catch (error) {
      console.error('View history error:', error);
      return errorResponse(res, 'Failed to retrieve asset history', 500);
    }
  }

  // Update asset status
  async updateStatus(req, res) {
    try {
      const { asset_id } = req.params;
      const { status, notes } = req.body;
      
      if (!asset_id || !status) {
        return errorResponse(res, 'Asset ID and status are required', 400);
      }

      const validStatuses = ['Operational', 'Damaged', 'Under Maintenance', 'Decommissioned', 'Lost', 'In Storage'];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, 'Invalid status', 400);
      }

      await Asset.update(
        { status, notes, updated_at: new Date() },
        { where: { asset_id } }
      );

      return successResponse(res, 'Asset status updated successfully');

    } catch (error) {
      console.error('Update status error:', error);
      return errorResponse(res, 'Failed to update asset status', 500);
    }
  }

  // Calculate depreciation using straight-line method
  calculateDepreciation(purchaseDate, purchaseCost, depreciationRate, expectedLifeYears = 5) {
    if (!purchaseDate || !purchaseCost) return null;
    
    const currentDate = new Date();
    const purchaseDateObj = new Date(purchaseDate);
    const yearsElapsed = (currentDate - purchaseDateObj) / (365.25 * 24 * 60 * 60 * 1000);
    
    // Use provided depreciation rate or calculate based on expected life
    const annualDepreciationRate = depreciationRate || (100 / expectedLifeYears);
    
    // Straight-line depreciation
    const totalDepreciation = (purchaseCost * annualDepreciationRate * yearsElapsed) / 100;
    const currentValue = Math.max(0, purchaseCost - totalDepreciation);
    
    return {
      current_value: parseFloat(currentValue.toFixed(2)),
      depreciation_rate: annualDepreciationRate,
      years_elapsed: parseFloat(yearsElapsed.toFixed(2)),
      total_depreciation: parseFloat(totalDepreciation.toFixed(2)),
      expected_life_years: expectedLifeYears
    };
  }

  // Log asset history
  async logAssetHistory(asset_id, action_type, description, user_id, user_name, school_id, old_values = null, new_values = null) {
    try {
      const history_id = generateId('HIST');
      await db.sequelize.query(
        `INSERT INTO asset_history (history_id, asset_id, action_type, description, user_id, user_name, old_values, new_values, school_id)
         VALUES (:history_id, :asset_id, :action_type, :description, :user_id, :user_name, :old_values, :new_values, :school_id)`,
        {
          replacements: {
            history_id,
            asset_id,
            action_type,
            description,
            user_id,
            user_name,
            old_values: old_values ? JSON.stringify(old_values) : null,
            new_values: new_values ? JSON.stringify(new_values) : null,
            school_id
          }
        }
      );
    } catch (error) {
      console.error('Error logging asset history:', error);
    }
  }

  // Get asset details by ID
  async getAssetById(req, res) {
    try {
      const { asset_id } = req.params;
      
      if (!asset_id) {
        return errorResponse(res, 'Asset ID is required', 400);
      }

      const asset = await Asset.findByPk(asset_id);
      
      if (!asset) {
        return errorResponse(res, 'Asset not found', 404);
      }

      // Calculate current depreciation
      const depreciationInfo = this.calculateDepreciation(
        asset.purchase_date,
        asset.purchase_cost,
        asset.depreciation_rate,
        asset.expected_life_years || 5
      );

      // Update current value if depreciation calculated
      if (depreciationInfo) {
        await Asset.update(
          { current_value: depreciationInfo.current_value },
          { where: { asset_id } }
        );
        
        // Add depreciation info to response
        asset.dataValues.depreciation_info = depreciationInfo;
        asset.dataValues.current_value = depreciationInfo.current_value;
        asset.dataValues.depreciation_rate = depreciationInfo.depreciation_rate;
        asset.dataValues.expected_life_years = depreciationInfo.expected_life_years;
      }

      return successResponse(res, 'Asset retrieved successfully', asset);

    } catch (error) {
      console.error('Get asset by ID error:', error);
      return errorResponse(res, 'Failed to retrieve asset', 500);
    }
  }

  // Upload asset images
  async uploadAssetImages(req, res) {
    try {
      const { asset_id } = req.params;
      const images = req.files;

      if (!images || images.length === 0) {
        return errorResponse(res, 'No images uploaded', 400);
      }

      // Get Cloudinary URLs from uploaded files
      const image_urls = images.map(image => image.path); // Cloudinary URL is in image.path

      // Store image URLs in database (create asset_images table if needed)
      for (const image_url of image_urls) {
        await db.sequelize.query(
          'INSERT INTO asset_images (asset_id, image_url, cloudinary_public_id) VALUES (:asset_id, :image_url, :public_id)',
          {
            replacements: { 
              asset_id, 
              image_url,
              public_id: images.find(img => img.path === image_url)?.public_id || null
            },
            type: db.sequelize.QueryTypes.INSERT,
          }
        );
      }

      return successResponse(res, 'Images uploaded successfully to Cloudinary', {
        uploaded_images: image_urls.length,
        urls: image_urls
      });
    } catch (error) {
      console.error('Upload asset images error:', error);
      return errorResponse(res, 'Failed to upload images to Cloudinary', 500);
    }
  }

  // Get all assets with filters
  async getAssets(req, res) {
    try {
      // Fallback for school_id from headers
      const school_id = req.user?.school_id || req.headers['x-school-id'] || req.body?.school_id || req.query?.school_id;
      const { branch_id, room_id, category_id, status, search, limit, offset } = req.query;

      if (!school_id) {
        return errorResponse(res, 'School ID is required', 400);
      }

      // Use direct Sequelize query instead of static method
      const whereClause = { school_id };
      
      if (branch_id) {
        whereClause.branch_id = branch_id;
      }
      if (category_id) {
        whereClause.category_id = category_id;
      }
      if (room_id) {
        whereClause.room_id = room_id;
      }
      if (status) {
        whereClause.status = status;
      }

      const assets = await Asset.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
      });

      return successResponse(res, 'Assets retrieved successfully', assets);
    } catch (error) {
      console.error('Get assets error:', error);
      return errorResponse(res, 'Failed to retrieve assets', 500);
    }
  }

  // Get single asset
  async getAssetById(req, res) {
    try {
      const { asset_id } = req.params;

      const asset = await Asset.findOne({
        where: { asset_id },
        include: [
          { model: AssetCategory, as: 'AssetCategory', attributes: ['category_name'] },
          { model: FacilityRoom, as: 'FacilityRoom', attributes: ['room_name'] }
        ]
      });

      if (!asset) {
        return errorResponse(res, 'Asset not found', 404);
      }

      return successResponse(res, 'Asset retrieved successfully', asset);
    } catch (error) {
      console.error('Get asset error:', error);
      return errorResponse(res, 'Failed to retrieve asset', 500);
    }
  }

  // Update asset
  async updateAsset(req, res) {
    try {
      const { asset_id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.asset_id;
      delete updateData.asset_tag;
      delete updateData.school_id;
      delete updateData.created_by;
      delete updateData.createdAt;

      const [updatedRowsCount] = await Asset.update(updateData, {
        where: { asset_id }
      });

      if (updatedRowsCount === 0) {
        return errorResponse(res, 'Asset not found', 404);
      }

      return successResponse(res, 'Asset updated successfully');
    } catch (error) {
      console.error('Update asset error:', error);
      return errorResponse(res, 'Failed to update asset', 500);
    }
  }

  // Delete asset (soft delete by changing status)
  async deleteAsset(req, res) {
    try {
      const { asset_id } = req.params;

      const [updatedRowsCount] = await Asset.update({
        status: 'Decommissioned',
        updatedAt: new Date()
      }, {
        where: { asset_id }
      });

      if (updatedRowsCount === 0) {
        return errorResponse(res, 'Asset not found', 404);
      }

      return successResponse(res, 'Asset decommissioned successfully');
    } catch (error) {
      console.error('Delete asset error:', error);
      return errorResponse(res, 'Failed to delete asset', 500);
    }
  }

  // Get asset dashboard statistics
  async getAssetStatistics(req, res) {
    try {
      const { school_id } = req.user;
      const { branch_id } = req.query;

      let whereClause = { school_id };
      if (branch_id) whereClause.branch_id = branch_id;

      const totalAssets = await Asset.count({ where: whereClause });

      const operational = await Asset.count({
        where: { ...whereClause, status: 'Operational' }
      });

      const damaged = await Asset.count({
        where: { ...whereClause, status: 'Damaged' }
      });

      const underMaintenance = await Asset.count({
        where: { ...whereClause, status: 'Under Maintenance' }
      });

      const decommissioned = await Asset.count({
        where: { ...whereClause, status: 'Decommissioned' }
      });

      const totalValue = await Asset.sum('current_value', { where: whereClause });

      const statistics = {
        total_assets: totalAssets,
        operational,
        damaged,
        under_maintenance: underMaintenance,
        decommissioned,
        total_value: totalValue || 0
      };

      return successResponse(res, 'Asset statistics retrieved successfully', statistics);
    } catch (error) {
      console.error('Get asset statistics error:', error);
      return errorResponse(res, 'Failed to retrieve asset statistics', 500);
    }
  }

  // Get assets by room
  async getAssetsByRoom(req, res) {
    try {
      const { room_id } = req.params;

      const assets = await Asset.findAll({
        where: { room_id },
        include: [
          { model: AssetCategory, as: 'AssetCategory', attributes: ['category_name'] }
        ],
        order: [['asset_name', 'ASC']]
      });

      return successResponse(res, 'Room assets retrieved successfully', assets);
    } catch (error) {
      console.error('Get assets by room error:', error);
      return errorResponse(res, 'Failed to retrieve room assets', 500);
    }
  }

  // Get maintenance due assets
  async getMaintenanceDue(req, res) {
    try {
      console.log('🔍 Starting maintenance due asset retrieval');

      // Check if user object exists
      if (!req.user) {
        console.log('❌ No user object found in request context');
        return errorResponse(res, 'User authentication required', 401);
      }

      const { school_id } = req.user;
      console.log(`📋 Extracted school_id: ${school_id}`);

      if (!school_id) {
        console.log('❌ No school_id found in user context');
        return errorResponse(res, 'School ID is required', 400);
      }

      console.log(`🔍 Fetching maintenance due assets for school: ${school_id}`);

      // Use direct database query to avoid any model-level issues
      const { execute } = require('../../config/database');
      const query = `
        SELECT a.*
        FROM assets a
        WHERE a.school_id = ?
        AND a.status = 'Under Maintenance'
        ORDER BY a.updatedAt ASC
      `;

      console.log('🔍 Executing database query...');
      const [rows] = await execute(query, [school_id]);
      console.log(`✅ Query executed successfully, found ${rows.length} assets under maintenance`);

      // Add next_inspection_date field for compatibility
      const responseAssets = rows.map(asset => ({
        ...asset,
        next_inspection_date: null
      }));

      console.log(`✅ Returning ${responseAssets.length} maintenance due assets for school: ${school_id}`);

      return successResponse(res, 'Maintenance due assets retrieved successfully', responseAssets);
    } catch (error) {
      console.error('🚨 Complete error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        sql: error.sql ? error.sql : 'No SQL in error',
        cause: error.cause || 'No cause specified'
      });

      return errorResponse(res, 'Failed to retrieve maintenance due assets', 500);
    }
  }

  // Get assets by category
  async getAssetsByCategory(req, res) {
    try {
      const { category_id } = req.params;

      const assets = await Asset.findAll({
        where: { category_id },
        include: [
          { model: FacilityRoom, as: 'FacilityRoom', attributes: ['room_name'] }
        ],
        order: [['asset_name', 'ASC']]
      });

      return successResponse(res, 'Category assets retrieved successfully', assets);
    } catch (error) {
      console.error('Get assets by category error:', error);
      return errorResponse(res, 'Failed to retrieve category assets', 500);
    }
  }

  // Get recent assets (newly added or recently updated)
  async getRecentAssets(req, res) {
    try {
      // Fallback for school_id and branch_id from headers
      const school_id = req.user?.school_id || req.headers['x-school-id'] || req.body?.school_id || req.query?.school_id;
      const branch_id = req.query?.branch_id || req.headers['x-branch-id'] || req.body?.branch_id;
      const limit = parseInt(req.query?.limit || req.body?.limit || '10');

      console.log('📊 Recent Assets Request:', {
        school_id,
        branch_id,
        limit,
        user: req.user
      });

      // Validate required parameters
      if (!school_id) {
        console.error('❌ Missing school_id');
        return errorResponse(res, 'School ID is required', 400);
      }

      // Build where clause
      const whereClause = { school_id };
      if (branch_id) {
        whereClause.branch_id = branch_id;
      }

      // Get recent assets sorted by createdAt descending
      const recentAssets = await Asset.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: limit,
        attributes: [
          'asset_id',
          'asset_tag',
          'asset_name',
          'category_id',
          'brand',
          'model',
          'status',
          'condition_rating',
          'room_id',
          'purchase_date',
          'purchase_cost',
          'createdAt',
          'updatedAt'
        ]
      });

      console.log(`✅ Retrieved ${recentAssets.length} recent assets`);

      return successResponse(res, 'Recent assets retrieved successfully', {
        assets: recentAssets,
        count: recentAssets.length,
        limit: limit
      });
    } catch (error) {
      console.error('❌ Get recent assets error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return errorResponse(res, 'Failed to retrieve recent assets', 500);
    }
  }

  // Import assets from CSV file
  async importAssets(req, res) {
    try {
      const { school_id, id: user_id } = req.user;

      // Check if a file was uploaded
      if (!req.file && !req.files) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      // Get the file - may be in req.file (single) or req.files (array/multiple)
      const uploadedFile = req.file || (req.files && req.files[0]);
      if (!uploadedFile) {
        return errorResponse(res, 'No file found in upload', 400);
      }

      console.log(`File uploaded for asset import: ${uploadedFile.originalname} (${uploadedFile.size} bytes)`);

      // In a real implementation, we would parse the CSV file
      // For now, we'll simulate the process
      const fs = require('fs');
      const path = uploadedFile.path;

      // Read the file content (in a real implementation, we'd use a CSV parser)
      const fileContent = fs.readFileSync(path, 'utf8');
      console.log(`File content: ${fileContent.substring(0, 200)}...`); // Log first 200 chars

      // Parse CSV content (simplified approach - in production use a proper library like 'csv-parser')
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));

      // Expected headers for asset import
      const expectedHeaders = [
        'asset_tag', 'asset_name', 'category_name', 'status',
        'room_name', 'branch_name', 'current_value', 'brand',
        'model', 'serial_number', 'purchase_date', 'purchase_cost',
        'depreciation_rate', 'expected_life', 'warranty_expiry_date',
        'condition_rating', 'supplier_name', 'supplier_contact',
        'description', 'notes'
      ];

      // Validate headers
      const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        console.error(`Missing required headers: ${missingHeaders.join(', ')}`);
        return errorResponse(res, `CSV file missing required columns: ${missingHeaders.join(', ')}`, 400);
      }

      // Process each row starting from index 1 (skip headers)
      let successCount = 0;
      let errorCount = 0;
      let errorDetails = [];

      // Skip the first line (headers) and process data rows
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines

        const values = lines[i].split(',').map(val => val.trim().replace(/"/g, ''));

        // Create an object mapping headers to values
        const assetData = {};
        for (let j = 0; j < headers.length; j++) {
          if (j < values.length) {
            assetData[headers[j]] = values[j];
          }
        }

        try {
          // Process the asset data
          const asset_id = generateAssetId();
          const newAssetData = {
            asset_id,
            asset_tag: assetData.asset_tag || generateTagId(),
            asset_name: assetData.asset_name,
            category_id: assetData.category_id, // This would need to be mapped from category_name
            brand: assetData.brand,
            model: assetData.model,
            serial_number: assetData.serial_number,
            description: assetData.description,
            purchase_date: assetData.purchase_date,
            purchase_cost: parseFloat(assetData.purchase_cost) || 0,
            current_value: parseFloat(assetData.current_value) || parseFloat(assetData.purchase_cost) || 0,
            depreciation_rate: parseFloat(assetData.depreciation_rate) || 0,
            expected_life: parseInt(assetData.expected_life) || null,
            warranty_expiry_date: assetData.warranty_expiry_date,
            supplier_name: assetData.supplier_name,
            supplier_contact: assetData.supplier_contact,
            room_id: assetData.room_id, // This would need to be mapped from room_name
            branch_id: assetData.branch_id || assetData.branch_name, // Try to get branch_id
            school_id,
            status: assetData.status || 'Working',
            condition_rating: assetData.condition_rating || 'Good',
            notes: assetData.notes,
            created_by: user_id
          };

          // In a real implementation, we would map category_name to category_id and room_name to room_id
          // For now, we'll try to get those from related tables
          const categoryResult = await AssetCategory.findOne({
            where: { category_name: assetData.category_name, school_id }
          });

          if (categoryResult) {
            newAssetData.category_id = categoryResult.category_id;
          } else {
            // If category doesn't exist, create a default one or skip
            // For now, we'll set it to null
            newAssetData.category_id = null;
          }

          // Similarly for room mapping
          if (assetData.room_name) {
            const roomResult = await FacilityRoom.findOne({
              where: { room_name: assetData.room_name, school_id }
            });

            if (roomResult) {
              newAssetData.room_id = roomResult.room_id;
            }
          }

          // Create the asset in the database
          await Asset.create(newAssetData);
          successCount++;

        } catch (assetError) {
          errorCount++;
          errorDetails.push({
            row: i,
            error: assetError.message,
            data: assetData
          });
          console.error(`Error processing asset row ${i}:`, assetError);
        }
      }

      // Remove the uploaded file after processing
      fs.unlinkSync(path);

      // Prepare results
      const importResult = {
        success: errorCount === 0, // Considered success if no errors
        totalRecords: lines.length - 1, // Minus header row
        imported: successCount,
        failed: errorCount,
        errorDetails: errorDetails,
        message: `Import completed. ${successCount} assets imported, ${errorCount} failed.`
      };

      // Return success response
      return successResponse(res, 'Assets import completed successfully', importResult);
    } catch (error) {
      console.error('Import assets error:', error);
      return errorResponse(res, 'Failed to import assets', 500);
    }
  }

  // Get asset history
  async getAssetHistory(req, res) {
    try {
      const { asset_id } = req.params;
      const { school_id } = req.user;
      
      if (!asset_id) {
        return errorResponse(res, 'Asset ID is required', 400);
      }

      const history = await db.sequelize.query(
        `SELECT history_id, asset_id, action_type, description, user_name, 
                old_values, new_values, created_at
         FROM asset_history 
         WHERE asset_id = :asset_id AND school_id = :school_id
         ORDER BY created_at DESC`,
        {
          replacements: { asset_id, school_id },
          type: db.sequelize.QueryTypes.SELECT
        }
      );

      return successResponse(res, 'Asset history retrieved successfully', history);
    } catch (error) {
      console.error('Get asset history error:', error);
      return errorResponse(res, 'Failed to retrieve asset history', 500);
    }
  }
}

module.exports = new AssetController();
module.exports.uploadAssetImages = new AssetController().uploadAssetImages;