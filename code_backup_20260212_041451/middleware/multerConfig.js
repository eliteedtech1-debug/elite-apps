const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Cloudinary storage for assets
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'elite-scholar/assets',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto' }
    ]
  },
});

// Set up Cloudinary storage for inspections (supports PDFs)
const inspectionStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'elite-scholar/inspections',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
    resource_type: 'auto', // Auto-detect resource type
  },
});

// Check file type for assets
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// Check file type for inspections (images + PDFs)
function checkInspectionFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|pdf/;
  const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'application/pdf';
  if (mimetype) {
    return cb(null, true);
  } else {
    cb('Error: Images and PDFs Only!');
  }
}

// Initialize upload for assets
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
});

// Initialize upload for inspections
const inspectionUpload = multer({
  storage: inspectionStorage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    checkInspectionFileType(file, cb);
  }
});

module.exports = upload;
module.exports.inspectionUpload = inspectionUpload;
