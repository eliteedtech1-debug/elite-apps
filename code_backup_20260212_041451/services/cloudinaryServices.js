const multer = require("multer");
const { cloudinary, storage } = require("../config/cloudinaryComfig");

// Set up multer for file upload using the Cloudinary storage
const upload = multer({ storage });

// Cloudinary controller
const cloudinaryServices = {
  // Upload a file to Cloudinary
  uploadFile: [
    upload.single("file"), // Multer middleware to handle file upload
    async (req, res) => {
      try {
        // If file is uploaded successfully
        if (req.file) {
          // The file URL on Cloudinary
          const fileUrl = req.file.path;
          return res.status(200).json({
            message: "File uploaded successfully",
            fileUrl
          });
        }
        // If no file is uploaded
        return res.status(400).json({ error: "No file uploaded" });
        
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }

  ],

  // Upload text to Cloudinary
  uploadText: async (req, res) => {
    const { text } = req.body;

    try {
      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      // Create an upload from the text
      const result = await cloudinary.v2.uploader.upload(
        `data:text/plain;base64,${Buffer.from(text).toString("base64")}`,
        {
          resource_type: "auto", // Automatically detect file type
          folder: "document" // Folder where text will be stored
        }
      );

      return res.status(200).json({
        message: "Text uploaded successfully",
        fileUrl: result.secure_url // The Cloudinary URL for the uploaded text
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

// Helper function to upload base64 images to Cloudinary
const uploadToCloudinary = async (base64String, folder = 'uploads') => {
  try {
    const result = await cloudinary.v2.uploader.upload(base64String, {
      folder: folder,
      resource_type: 'auto'
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

module.exports = cloudinaryServices;
module.exports.uploadToCloudinary = uploadToCloudinary;
