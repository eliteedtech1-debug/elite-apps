#!/bin/bash

# External Services Setup Script for Elite Core Phase 1
# This script sets up Cloudinary, QR Code, Barcode, PDF Storage, and CDN services

echo "🚀 Setting up External Services for Elite Core Phase 1..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the correct directory
if [ ! -f "elscholar-api/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Navigate to API directory
cd elscholar-api

print_info "Checking current dependencies..."

# Check if required packages are installed
REQUIRED_PACKAGES=("qrcode" "cloudinary" "multer" "sharp")
MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! npm list "$package" > /dev/null 2>&1; then
        MISSING_PACKAGES+=("$package")
    fi
done

# Install missing packages
if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    print_info "Installing missing packages: ${MISSING_PACKAGES[*]}"
    npm install "${MISSING_PACKAGES[@]}"
    print_status "Packages installed successfully"
else
    print_status "All required packages are already installed"
fi

# Create necessary directories
print_info "Creating storage directories..."

DIRECTORIES=(
    "temp/qrcodes"
    "temp/barcodes" 
    "temp/pdfs"
    "temp/uploads"
    "storage/pdfs/reports"
    "storage/pdfs/id-cards"
    "storage/pdfs/certificates"
    "storage/pdfs/invoices"
    "storage/pdfs/transcripts"
    "public/pdfs"
    "public/images"
    "public/qr-codes"
    "public/barcodes"
)

for dir in "${DIRECTORIES[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    else
        print_info "Directory already exists: $dir"
    fi
done

# Create .gitkeep files for empty directories
print_info "Creating .gitkeep files..."
for dir in "${DIRECTORIES[@]}"; do
    if [ ! -f "$dir/.gitkeep" ]; then
        touch "$dir/.gitkeep"
    fi
done

# Check environment variables
print_info "Checking environment configuration..."

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    print_warning "No .env file found. Copying from .env.example..."
    cp .env.example .env
fi

# Check for required environment variables
REQUIRED_ENV_VARS=(
    "CLOUDINARY_CLOUD_NAME"
    "CLOUDINARY_API_KEY" 
    "CLOUDINARY_API_SECRET"
    "FRONTEND_URL"
)

MISSING_ENV_VARS=()

for var in "${REQUIRED_ENV_VARS[@]}"; do
    if ! grep -q "^$var=" "$ENV_FILE" || grep -q "^$var=$" "$ENV_FILE"; then
        MISSING_ENV_VARS+=("$var")
    fi
done

if [ ${#MISSING_ENV_VARS[@]} -gt 0 ]; then
    print_warning "Missing or empty environment variables:"
    for var in "${MISSING_ENV_VARS[@]}"; do
        echo "  - $var"
    done
    print_info "Please update your .env file with the correct values"
fi

# Add new environment variables for external services
print_info "Adding external services configuration to .env..."

NEW_ENV_VARS=(
    "# External Services Configuration"
    "CDN_ENABLED=false"
    "CDN_BASE_URL="
    "MAX_FILE_SIZE=10485760"
    "MAX_AUDIO_SIZE=6291456"
    "QR_CODE_DEFAULT_SIZE=256"
    "BARCODE_DEFAULT_WIDTH=2"
    "BARCODE_DEFAULT_HEIGHT=100"
    "PDF_STORAGE_PROVIDER=local"
    "IMAGE_OPTIMIZATION_ENABLED=true"
    ""
)

# Check if external services config already exists
if ! grep -q "# External Services Configuration" "$ENV_FILE"; then
    print_info "Adding external services configuration..."
    echo "" >> "$ENV_FILE"
    for var in "${NEW_ENV_VARS[@]}"; do
        echo "$var" >> "$ENV_FILE"
    done
    print_status "External services configuration added to .env"
else
    print_info "External services configuration already exists in .env"
fi

# Create service initialization script
print_info "Creating service initialization script..."

cat > src/scripts/initialize-external-services.js << 'EOF'
const { initializeServices } = require('../config/externalServices');
const qrCodeService = require('../services/qrCodeService');
const barcodeService = require('../services/barcodeService');
const pdfStorageService = require('../services/pdfStorageService');

/**
 * Initialize all external services
 */
async function initializeExternalServices() {
  console.log('🚀 Initializing External Services...');
  
  try {
    // Initialize main services
    const health = await initializeServices();
    
    // Run individual service health checks
    const qrHealth = await qrCodeService.healthCheck();
    const barcodeHealth = await barcodeService.healthCheck();
    const pdfHealth = await pdfStorageService.healthCheck();
    
    console.log('📊 Service Health Status:');
    console.log('  QR Code Service:', qrHealth.status);
    console.log('  Barcode Service:', barcodeHealth.status);
    console.log('  PDF Storage Service:', pdfHealth.status);
    console.log('  Overall Status:', health.overall);
    
    // Clean up old temporary files
    console.log('🧹 Cleaning up temporary files...');
    qrCodeService.cleanupTempFiles();
    barcodeService.cleanupTempFiles();
    await pdfStorageService.cleanupOldFiles('temp');
    
    console.log('✅ External services initialized successfully');
    return health;
  } catch (error) {
    console.error('❌ External services initialization failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeExternalServices()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeExternalServices };
EOF

print_status "Service initialization script created"

# Update main index.js to include external services
print_info "Updating main server file..."

# Check if external services route is already added
if ! grep -q "externalServices" src/index.js; then
    # Add external services route
    sed -i '/\/\/ Routes/a\\n// External Services Routes\napp.use("/api/external", require("./routes/externalServices"));' src/index.js
    print_status "External services routes added to main server"
else
    print_info "External services routes already configured"
fi

# Create test script
print_info "Creating test script..."

cat > test-external-services.js << 'EOF'
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:34567';

async function testExternalServices() {
  console.log('🧪 Testing External Services...');
  
  try {
    // Test health check
    console.log('Testing health check...');
    const healthResponse = await axios.get(`${API_BASE}/api/external/health`);
    console.log('Health Status:', healthResponse.data.health.overall);
    
    // Test QR code generation
    console.log('Testing QR code generation...');
    const qrResponse = await axios.post(`${API_BASE}/api/external/qr-code/custom`, {
      data: 'Test QR Code',
      type: 'test'
    });
    console.log('QR Code generated:', qrResponse.data.success);
    
    // Test barcode generation
    console.log('Testing barcode generation...');
    const barcodeResponse = await axios.post(`${API_BASE}/api/external/barcode/custom`, {
      data: '123456789',
      type: 'test'
    });
    console.log('Barcode generated:', barcodeResponse.data.success);
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testExternalServices();
EOF

print_status "Test script created"

# Create documentation
print_info "Creating documentation..."

cat > EXTERNAL_SERVICES_README.md << 'EOF'
# External Services Integration - Phase 1

This document describes the external services integration for Elite Core Phase 1.

## Services Included

### 1. Cloudinary Integration
- Image storage and optimization
- PDF storage with CDN delivery
- Automatic format conversion
- Responsive image generation

### 2. QR Code Generation
- Student ID QR codes
- Attendance QR codes
- Payment QR codes
- Custom QR codes
- Cloud storage integration

### 3. Barcode Generation
- Code128 barcode format
- Student ID barcodes
- Asset management barcodes
- Inventory barcodes
- SVG and PNG output formats

### 4. PDF Storage & CDN
- Local and cloud storage options
- Automatic fallback mechanisms
- Categorized storage (reports, ID cards, certificates)
- Metadata management
- CDN delivery optimization

## API Endpoints

### QR Code Endpoints
- `POST /api/external/qr-code/student-id` - Generate student ID QR code
- `POST /api/external/qr-code/attendance` - Generate attendance QR code
- `POST /api/external/qr-code/payment` - Generate payment QR code
- `POST /api/external/qr-code/custom` - Generate custom QR code

### Barcode Endpoints
- `POST /api/external/barcode/student-id` - Generate student ID barcode
- `POST /api/external/barcode/asset` - Generate asset barcode
- `POST /api/external/barcode/inventory` - Generate inventory barcode
- `POST /api/external/barcode/custom` - Generate custom barcode

### PDF Storage Endpoints
- `POST /api/external/pdf/upload` - Upload PDF file
- `POST /api/external/pdf/student-report` - Store student report
- `POST /api/external/pdf/id-card` - Store ID card PDF
- `GET /api/external/pdf/info/:provider/:filePath` - Get file info

### Image Upload Endpoints
- `POST /api/external/image/upload` - Upload image to Cloudinary
- `POST /api/external/image/id-card` - Upload ID card image
- `GET /api/external/image/optimize/:publicId` - Get optimized image URL
- `GET /api/external/image/thumbnail/:publicId` - Get thumbnail URL

### Health Check Endpoints
- `GET /api/external/health` - Overall health check
- `GET /api/external/health/qr-code` - QR code service health
- `GET /api/external/health/barcode` - Barcode service health
- `GET /api/external/health/pdf-storage` - PDF storage health
- `GET /api/external/health/cloudinary` - Cloudinary health

## Environment Variables

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# External Services Configuration
CDN_ENABLED=false
CDN_BASE_URL=
MAX_FILE_SIZE=10485760
MAX_AUDIO_SIZE=6291456
QR_CODE_DEFAULT_SIZE=256
BARCODE_DEFAULT_WIDTH=2
BARCODE_DEFAULT_HEIGHT=100
PDF_STORAGE_PROVIDER=local
IMAGE_OPTIMIZATION_ENABLED=true
```

## Usage Examples

### Generate Student ID QR Code
```javascript
const response = await fetch('/api/external/qr-code/student-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    student_id: 123,
    admission_no: 'STU001',
    name: 'John Doe',
    class_name: 'Grade 10A',
    school_id: 1,
    branch_id: 1,
    uploadToCloud: true
  })
});
```

### Generate Barcode
```javascript
const response = await fetch('/api/external/barcode/student-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    student_id: 123,
    admission_no: 'STU001',
    uploadToCloud: false
  })
});
```

### Upload PDF
```javascript
const formData = new FormData();
formData.append('pdf', pdfFile);
formData.append('category', 'reports');
formData.append('preferCloud', 'true');

const response = await fetch('/api/external/pdf/upload', {
  method: 'POST',
  body: formData
});
```

## Testing

Run the test script to verify all services are working:

```bash
node test-external-services.js
```

## Maintenance

### Cleanup Temporary Files
```bash
curl -X POST http://localhost:34567/api/external/cleanup/temp
```

### Health Monitoring
```bash
curl http://localhost:34567/api/external/health
```
EOF

print_status "Documentation created"

# Set permissions
chmod +x test-external-services.js
chmod +x src/scripts/initialize-external-services.js

print_status "Permissions set"

# Final summary
echo ""
print_info "🎉 External Services Setup Complete!"
echo ""
print_info "Next steps:"
echo "1. Update your .env file with correct Cloudinary credentials"
echo "2. Start your server: npm run dev"
echo "3. Test the services: node test-external-services.js"
echo "4. Check health status: curl http://localhost:34567/api/external/health"
echo ""
print_info "Services configured:"
echo "  ✅ Cloudinary Integration"
echo "  ✅ QR Code Generation"
echo "  ✅ Barcode Generation"
echo "  ✅ PDF Storage & CDN"
echo "  ✅ Image Upload & Optimization"
echo ""
print_warning "Remember to configure your environment variables before testing!"

cd ..