const cloudinary = require('../../CloudinaryAltenative');

const handleFileUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.buffer, {
      filename: req.file.originalname
    });
    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error("Error uploading:", error);
    res.status(500).json({ success: false, error: "Error uploading file" });
  }
};

module.exports = { handleFileUpload };
