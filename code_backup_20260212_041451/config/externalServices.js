const cloudinary = require('cloudinary').v2;
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * External Services Configuration for Elite Scholar
 * Phase 1: Cloudinary, QR Code, Barcode, PDF Storage, CDN
 */

// Cloudinary Configuration
const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    console.log('✅ Cloudinary configured successfully');
    return true;
  } else {
    console.log('⚠️  Cloudinary not configured - missing environment variables');
    return false;
  }
};

// QR Code Service Configuration
const qrCodeConfig = {
  defaultOptions: {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256
  },
  
  // Generate QR Code
  async generate(data, options = {}) {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`QR Code generation failed: ${error.message}`);
    }
  },

  // Generate QR Code as Buffer
  async generateBuffer(data, options = {}) {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      const buffer = await QRCode.toBuffer(data, qrOptions);
      return buffer;
    } catch (error) {
      throw new Error(`QR Code buffer generation failed: ${error.message}`);
    }
  },

  // Save QR Code to file
  async saveToFile(data, filePath, options = {}) {
    try {
      const qrOptions = { ...this.defaultOptions, ...options };
      await QRCode.toFile(filePath, data, qrOptions);
      return filePath;
    } catch (error) {
      throw new Error(`QR Code file save failed: ${error.message}`);
    }
  }
};

// Barcode Service Configuration (using Code128)
const barcodeConfig = {
  // Generate simple barcode using text representation
  generate(data, options = {}) {
    const { width = 2, height = 100 } = options;
    
    // Simple Code128-like pattern generator
    const patterns = {
      '0': '11011001100', '1': '11001101100', '2': '11001100110',
      '3': '10010011000', '4': '10010001100', '5': '10001001100',
      '6': '10011001000', '7': '10011000100', '8': '10001100100',
      '9': '11001001000'
    };
    
    let barcodePattern = '';
    for (let char of data.toString()) {
      if (patterns[char]) {
        barcodePattern += patterns[char];
      }
    }
    
    return {
      pattern: barcodePattern,
      data: data,
      width: width,
      height: height
    };
  },

  // Generate barcode as SVG
  generateSVG(data, options = {}) {
    const { width = 2, height = 100 } = options;
    const barcode = this.generate(data, options);
    
    let svg = `<svg width="${barcode.pattern.length * width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    for (let i = 0; i < barcode.pattern.length; i++) {
      const bit = barcode.pattern[i];
      const color = bit === '1' ? '#000000' : '#FFFFFF';
      svg += `<rect x="${i * width}" y="0" width="${width}" height="${height}" fill="${color}"/>`;
    }
    
    svg += '</svg>';
    return svg;
  }
};

// PDF Storage Configuration
const pdfStorageConfig = {
  // Local storage paths
  paths: {
    temp: path.join(process.cwd(), 'temp', 'pdfs'),
    storage: path.join(process.cwd(), 'storage', 'pdfs'),
    public: path.join(process.cwd(), 'public', 'pdfs')
  },

  // Initialize storage directories
  initializeDirectories() {
    Object.values(this.paths).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  },

  // Upload PDF to Cloudinary
  async uploadToCloudinary(filePath, options = {}) {
    try {
      if (!configureCloudinary()) {
        throw new Error('Cloudinary not configured');
      }

      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw',
        folder: 'pdfs',
        format: 'pdf',
        ...options
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
        bytes: result.bytes,
        format: result.format
      };
    } catch (error) {
      throw new Error(`PDF upload to Cloudinary failed: ${error.message}`);
    }
  },

  // Store PDF locally
  async storeLocally(buffer, filename, subfolder = '') {
    try {
      const storageDir = subfolder ? 
        path.join(this.paths.storage, subfolder) : 
        this.paths.storage;
      
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const filePath = path.join(storageDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      return {
        path: filePath,
        url: `/pdfs/${subfolder ? subfolder + '/' : ''}${filename}`,
        size: buffer.length
      };
    } catch (error) {
      throw new Error(`Local PDF storage failed: ${error.message}`);
    }
  }
};

// CDN Configuration
const cdnConfig = {
  // Cloudinary CDN transformations
  cloudinary: {
    // Optimize image delivery
    optimizeImage(publicId, options = {}) {
      const {
        width,
        height,
        quality = 'auto',
        format = 'auto',
        crop = 'fill'
      } = options;

      return cloudinary.url(publicId, {
        width,
        height,
        quality,
        format,
        crop,
        fetch_format: 'auto',
        flags: 'progressive'
      });
    },

    // Generate thumbnail
    generateThumbnail(publicId, size = 150) {
      return cloudinary.url(publicId, {
        width: size,
        height: size,
        crop: 'thumb',
        gravity: 'face',
        quality: 'auto',
        format: 'auto'
      });
    },

    // Generate responsive images
    generateResponsive(publicId, breakpoints = [320, 768, 1024, 1920]) {
      return breakpoints.map(width => ({
        width,
        url: cloudinary.url(publicId, {
          width,
          quality: 'auto',
          format: 'auto',
          crop: 'scale'
        })
      }));
    }
  },

  // Local CDN simulation
  local: {
    baseUrl: process.env.CDN_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
    
    generateUrl(path) {
      return `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    }
  }
};

// Service Health Check
const healthCheck = {
  async checkCloudinary() {
    try {
      if (!configureCloudinary()) {
        return { status: 'disabled', message: 'Cloudinary not configured' };
      }
      
      await cloudinary.api.ping();
      return { status: 'healthy', message: 'Cloudinary connection successful' };
    } catch (error) {
      return { status: 'error', message: `Cloudinary error: ${error.message}` };
    }
  },

  async checkQRCode() {
    try {
      await qrCodeConfig.generate('health-check');
      return { status: 'healthy', message: 'QR Code service operational' };
    } catch (error) {
      return { status: 'error', message: `QR Code error: ${error.message}` };
    }
  },

  async checkBarcode() {
    try {
      barcodeConfig.generate('123456789');
      return { status: 'healthy', message: 'Barcode service operational' };
    } catch (error) {
      return { status: 'error', message: `Barcode error: ${error.message}` };
    }
  },

  async checkPDFStorage() {
    try {
      pdfStorageConfig.initializeDirectories();
      return { status: 'healthy', message: 'PDF storage directories ready' };
    } catch (error) {
      return { status: 'error', message: `PDF storage error: ${error.message}` };
    }
  },

  async checkAll() {
    const checks = await Promise.all([
      this.checkCloudinary(),
      this.checkQRCode(),
      this.checkBarcode(),
      this.checkPDFStorage()
    ]);

    return {
      cloudinary: checks[0],
      qrCode: checks[1],
      barcode: checks[2],
      pdfStorage: checks[3],
      overall: checks.every(check => check.status === 'healthy' || check.status === 'disabled') ? 'healthy' : 'degraded'
    };
  }
};

// Initialize services
const initializeServices = async () => {
  console.log('🚀 Initializing External Services...');
  
  // Configure Cloudinary
  configureCloudinary();
  
  // Initialize PDF storage directories
  pdfStorageConfig.initializeDirectories();
  
  // Run health checks
  const health = await healthCheck.checkAll();
  console.log('📊 Service Health Status:', health);
  
  return health;
};

module.exports = {
  cloudinary,
  qrCodeConfig,
  barcodeConfig,
  pdfStorageConfig,
  cdnConfig,
  healthCheck,
  initializeServices,
  configureCloudinary
};