const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    return true;
  }
  return false;
};

// Initialize Cloudinary
configureCloudinary();

/**
 * Upload audio file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result with secure_url, public_id, format, duration
 */
const uploadAudio = async (filePath, options = {}) => {
  try {
    // Check if Cloudinary is configured
    if (!configureCloudinary()) {
      console.log('Cloudinary not configured, skipping upload');
      // Clean up local file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      // Return mock response for development
      return {
        secure_url: '/uploads/audio/mock-audio.mp3',
        public_id: 'mock_' + Date.now(),
        format: 'mp3',
        duration: 60
      };
    }

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video', // Use 'video' for audio files to support larger sizes
      folder: 'recitations',
      allowed_formats: ['webm', 'mp3', 'm4a', 'ogg', 'wav'],
      max_file_size: parseInt(process.env.MAX_AUDIO_SIZE) || 6 * 1024 * 1024, // 6MB default
      ...options
    });

    // Clean up local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      duration: result.duration || 0,
      bytes: result.bytes
    };
  } catch (error) {
    // Clean up local file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Upload image to Cloudinary
 * @param {string|Buffer} source - File path or buffer
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
const uploadImage = async (source, options = {}) => {
  try {
    if (!configureCloudinary()) {
      console.log('Cloudinary not configured, returning mock response');
      return {
        secure_url: '/uploads/images/mock-image.jpg',
        public_id: 'mock_' + Date.now(),
        format: 'jpg',
        width: 400,
        height: 300
      };
    }

    const uploadOptions = {
      resource_type: 'image',
      folder: options.folder || 'images',
      quality: 'auto',
      format: 'auto',
      ...options
    };

    const result = await cloudinary.uploader.upload(source, uploadOptions);

    // Clean up local file if it's a file path
    if (typeof source === 'string' && fs.existsSync(source)) {
      fs.unlinkSync(source);
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  } catch (error) {
    // Clean up local file on error
    if (typeof source === 'string' && fs.existsSync(source)) {
      fs.unlinkSync(source);
    }
    throw new Error(`Cloudinary image upload failed: ${error.message}`);
  }
};

/**
 * Upload PDF to Cloudinary
 * @param {string|Buffer} source - File path or buffer
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
const uploadPDF = async (source, options = {}) => {
  try {
    if (!configureCloudinary()) {
      console.log('Cloudinary not configured, returning mock response');
      return {
        secure_url: '/uploads/pdfs/mock-document.pdf',
        public_id: 'mock_' + Date.now(),
        format: 'pdf'
      };
    }

    const uploadOptions = {
      resource_type: 'raw',
      folder: options.folder || 'pdfs',
      format: 'pdf',
      ...options
    };

    const result = await cloudinary.uploader.upload(source, uploadOptions);

    // Clean up local file if it's a file path
    if (typeof source === 'string' && fs.existsSync(source)) {
      fs.unlinkSync(source);
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    // Clean up local file on error
    if (typeof source === 'string' && fs.existsSync(source)) {
      fs.unlinkSync(source);
    }
    throw new Error(`Cloudinary PDF upload failed: ${error.message}`);
  }
};

/**
 * Upload ID card image with optimizations
 * @param {string|Buffer} source - File path or buffer
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
const uploadIdCard = async (source, options = {}) => {
  try {
    const idCardOptions = {
      folder: 'id-cards',
      quality: 'auto:best',
      format: 'auto',
      width: 1000,
      height: 600,
      crop: 'limit',
      ...options
    };

    return await uploadImage(source, idCardOptions);
  } catch (error) {
    throw new Error(`ID card upload failed: ${error.message}`);
  }
};

/**
 * Generate optimized image URL
 * @param {string} publicId - Cloudinary public ID
 * @param {object} transformations - Image transformations
 * @returns {string} Optimized image URL
 */
const getOptimizedImageUrl = (publicId, transformations = {}) => {
  if (!configureCloudinary()) {
    return `/images/${publicId}`;
  }

  return cloudinary.url(publicId, {
    quality: 'auto',
    format: 'auto',
    fetch_format: 'auto',
    ...transformations
  });
};

/**
 * Generate thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @param {number} size - Thumbnail size
 * @returns {string} Thumbnail URL
 */
const getThumbnailUrl = (publicId, size = 150) => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'thumb',
    gravity: 'face'
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {Promise<object>} Deletion result
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    if (!configureCloudinary()) {
      return { result: 'ok', message: 'Mock deletion successful' };
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary deletion failed: ${error.message}`);
  }
};

/**
 * Delete audio file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} Deletion result
 */
const deleteAudio = async (publicId) => {
  return await deleteFile(publicId, 'video');
};

/**
 * Get file details from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type
 * @returns {Promise<object>} File details
 */
const getFileDetails = async (publicId, resourceType = 'image') => {
  try {
    if (!configureCloudinary()) {
      return {
        public_id: publicId,
        format: 'mock',
        resource_type: resourceType,
        bytes: 1024
      };
    }

    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to get file details: ${error.message}`);
  }
};

/**
 * Get audio file details from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} File details
 */
const getAudioDetails = async (publicId) => {
  return await getFileDetails(publicId, 'video');
};

/**
 * Health check for Cloudinary service
 * @returns {Promise<object>} Health status
 */
const healthCheck = async () => {
  try {
    if (!configureCloudinary()) {
      return { status: 'disabled', message: 'Cloudinary not configured' };
    }
    
    await cloudinary.api.ping();
    return { status: 'healthy', message: 'Cloudinary connection successful' };
  } catch (error) {
    return { status: 'error', message: `Cloudinary error: ${error.message}` };
  }
};

module.exports = {
  cloudinary,
  configureCloudinary,
  uploadAudio,
  uploadImage,
  uploadPDF,
  uploadIdCard,
  deleteAudio,
  deleteFile,
  getAudioDetails,
  getFileDetails,
  getOptimizedImageUrl,
  getThumbnailUrl,
  healthCheck
};
