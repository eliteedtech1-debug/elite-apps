const db = require('../models');
const { uploadToCloudinary } = require('../services/cloudinaryServices');

// Simple admin profile update - only handles fields that exist in users table
const updateAdminProfile = async (req, res) => {
  try {
    console.log('🔍 Admin profile update request:', req.body);
    console.log('🔍 Request body keys:', Object.keys(req.body));
    console.log('🔍 Phone field check:');
    console.log('   req.body.phone:', req.body.phone);
    console.log('   req.body.phoneNumber:', req.body.phoneNumber);
    console.log('   req.body.mobile:', req.body.mobile);
    console.log('   req.body.mobile_no:', req.body.mobile_no);
    
    const {
      user_id,
      full_name,
      email,
      phone,
      username,
      digital_signature
    } = req.body;
    
    console.log('🔍 Extracted values:');
    console.log('   user_id:', user_id);
    console.log('   full_name:', full_name);
    console.log('   email:', email);
    console.log('   phone:', phone);
    console.log('   username:', username);
    console.log('   digital_signature length:', digital_signature?.length || 0);
    
    // Validate input
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: user_id'
      });
    }
    
    // Build update fields - only fields that exist in users table
    const updateFields = {};
    
    if (full_name !== undefined) updateFields.name = full_name;
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (username !== undefined) updateFields.username = username;
    if (digital_signature !== undefined) {
      // Upload to Cloudinary if it's a base64 string
      if (digital_signature.startsWith('data:image')) {
        try {
          const cloudinaryResult = await uploadToCloudinary(digital_signature, 'signatures');
          updateFields.digital_signature = cloudinaryResult.secure_url;
          console.log('✅ Signature uploaded to Cloudinary:', cloudinaryResult.secure_url);
        } catch (uploadError) {
          console.error('❌ Cloudinary upload failed:', uploadError);
          // Fallback to base64 if upload fails
          updateFields.digital_signature = digital_signature;
        }
      } else {
        updateFields.digital_signature = digital_signature;
      }
      console.log('🔍 Digital signature length:', digital_signature?.length || 0);
    }
    
    console.log('🔍 Admin update fields:', updateFields);
    
    // Filter out undefined and null values
    const filteredFields = Object.fromEntries(
      Object.entries(updateFields).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    if (Object.keys(filteredFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    console.log('🔍 Filtered fields:', filteredFields);
    
    // Build SET clause
    const setClause = Object.keys(filteredFields)
      .map(key => `${key} = :${key}`)
      .join(', ');
    
    // Build UPDATE query for users table
    const updateQuery = `UPDATE users SET ${setClause}, updatedAt = NOW() WHERE id = :user_id`;
    
    console.log('🔍 Update query:', updateQuery);
    console.log('🔍 Query replacements:', { ...filteredFields, user_id });
    
    // Execute the update
    const result = await db.sequelize.query(updateQuery, {
      replacements: { ...filteredFields, user_id },
      type: db.sequelize.QueryTypes.UPDATE
    });
    
    console.log('📝 Update result:', result);
    const affectedRows = result[1] || result?.affectedRows || 0;
    console.log('📈 Affected rows:', affectedRows);
    
    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no changes made'
      });
    }
    
    // Log the activity
    try {
      await db.sequelize.query(
        `INSERT INTO user_activity_log (user_id, activity_type, description, created_at) VALUES (:user_id, 'admin_profile_update', 'Admin profile updated', NOW())`,
        {
          replacements: { user_id },
          type: db.sequelize.QueryTypes.INSERT
        }
      );
    } catch (logError) {
      console.log('Activity log error:', logError);
      // Don't fail the main operation if logging fails
    }
    
    return res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully',
      data: {
        user_id: user_id,
        updated_fields: Object.keys(filteredFields),
        affected_rows: affectedRows
      }
    });
    
  } catch (error) {
    console.error('Admin profile update error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update admin profile',
      error_type: 'server_error',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  updateAdminProfile
};