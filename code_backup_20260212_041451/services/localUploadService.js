const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/recitations');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Upload audio file to local server
 * @param {string} filePath - Temp file path from multer
 * @returns {Promise<object>} Upload result
 */
const uploadAudio = async (filePath) => {
  const ext = path.extname(filePath) || '.webm';
  const filename = `recitation_${Date.now()}${ext}`;
  const destPath = path.join(uploadsDir, filename);
  
  // Move file from temp to uploads
  fs.renameSync(filePath, destPath);
  
  return {
    secure_url: `/uploads/recitations/${filename}`,
    public_id: filename.replace(ext, ''),
    format: ext.replace('.', ''),
    duration: 0
  };
};

/**
 * Delete audio file from local server
 * @param {string} publicId - File identifier
 */
const deleteAudio = async (publicId) => {
  const files = fs.readdirSync(uploadsDir);
  const file = files.find(f => f.startsWith(publicId));
  if (file) {
    fs.unlinkSync(path.join(uploadsDir, file));
  }
};

module.exports = { uploadAudio, deleteAudio };
