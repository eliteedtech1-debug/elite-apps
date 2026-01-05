#!/bin/bash

# =====================================================
# Student ID Card Generator - Dependency Installation
# Phase 1 Deployment Script
# =====================================================

set -e

echo "🚀 Installing Student ID Card Generator Dependencies"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the elscholar-api directory."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $REQUIRED_VERSION or higher is required. Current version: $NODE_VERSION"
    exit 1
fi

print_success "Node.js version check passed: $NODE_VERSION"

# Install core dependencies
print_status "Installing core dependencies..."
npm install --save \
    @react-pdf/renderer@^4.3.0 \
    @react-pdf/fontkit@^2.1.2 \
    canvas@^2.11.2 \
    jsbarcode@^3.11.5 \
    react@^18.3.1 \
    react-dom@^18.3.1 \
    sharp@^0.34.4

if [ $? -eq 0 ]; then
    print_success "Core dependencies installed successfully"
else
    print_error "Failed to install core dependencies"
    exit 1
fi

# Install additional dependencies if not already present
print_status "Checking and installing additional dependencies..."

# Check if qrcode is installed
if ! npm list qrcode > /dev/null 2>&1; then
    print_status "Installing qrcode..."
    npm install --save qrcode@^1.5.4
fi

# Check if pdfkit is installed
if ! npm list pdfkit > /dev/null 2>&1; then
    print_status "Installing pdfkit..."
    npm install --save pdfkit@^0.17.2
fi

# Check if multer is installed
if ! npm list multer > /dev/null 2>&1; then
    print_status "Installing multer..."
    npm install --save multer@^1.4.5-lts.1
fi

# Check if uuid is installed
if ! npm list uuid > /dev/null 2>&1; then
    print_status "Installing uuid..."
    npm install --save uuid@^9.0.0
fi

# Install development dependencies
print_status "Installing development dependencies..."
npm install --save-dev \
    @types/canvas@^2.1.1 \
    @types/qrcode@^1.5.5 \
    @types/uuid@^9.0.8

# Verify installations
print_status "Verifying installations..."

REQUIRED_PACKAGES=(
    "@react-pdf/renderer"
    "@react-pdf/fontkit"
    "canvas"
    "jsbarcode"
    "qrcode"
    "pdfkit"
    "multer"
    "uuid"
    "sharp"
)

FAILED_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if npm list "$package" > /dev/null 2>&1; then
        print_success "$package ✓"
    else
        print_error "$package ✗"
        FAILED_PACKAGES+=("$package")
    fi
done

# Check for system dependencies
print_status "Checking system dependencies..."

# Check for canvas system dependencies
if command -v pkg-config >/dev/null 2>&1; then
    print_success "pkg-config found ✓"
else
    print_warning "pkg-config not found. Canvas may not work properly."
    echo "  Install with: brew install pkg-config (macOS) or apt-get install pkg-config (Ubuntu)"
fi

# Check for Cairo (required by canvas)
if pkg-config --exists cairo 2>/dev/null; then
    print_success "Cairo found ✓"
else
    print_warning "Cairo not found. Canvas may not work properly."
    echo "  Install with: brew install cairo (macOS) or apt-get install libcairo2-dev (Ubuntu)"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p uploads/id-cards
mkdir -p logs
mkdir -p tmp/id-card-uploads

print_success "Directories created successfully"

# Set proper permissions
print_status "Setting directory permissions..."
chmod 755 uploads/id-cards
chmod 755 logs
chmod 755 tmp/id-card-uploads

# Test basic functionality
print_status "Testing basic functionality..."

# Create a simple test script
cat > test_id_card_deps.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('Testing ID Card Generator dependencies...');

try {
    // Test React-PDF
    const ReactPDF = require('@react-pdf/renderer');
    console.log('✓ React-PDF loaded successfully');
    
    // Test Canvas
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(200, 200);
    console.log('✓ Canvas created successfully');
    
    // Test QR Code
    const QRCode = require('qrcode');
    console.log('✓ QRCode library loaded successfully');
    
    // Test JSBarcode
    const JsBarcode = require('jsbarcode');
    console.log('✓ JSBarcode library loaded successfully');
    
    // Test UUID
    const { v4: uuidv4 } = require('uuid');
    const testUuid = uuidv4();
    console.log('✓ UUID generated successfully:', testUuid);
    
    console.log('\n🎉 All dependencies are working correctly!');
    process.exit(0);
} catch (error) {
    console.error('❌ Dependency test failed:', error.message);
    process.exit(1);
}
EOF

# Run the test
node test_id_card_deps.js

if [ $? -eq 0 ]; then
    print_success "Dependency test passed!"
    rm test_id_card_deps.js
else
    print_error "Dependency test failed!"
    rm test_id_card_deps.js
    exit 1
fi

# Final summary
echo ""
echo "=============================================="
if [ ${#FAILED_PACKAGES[@]} -eq 0 ]; then
    print_success "🎉 All dependencies installed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Configure your environment variables"
    echo "2. Run database migrations"
    echo "3. Start the server with: npm run dev"
    echo ""
    echo "ID Card Generator endpoints will be available at:"
    echo "  - Template Management: /api/id-cards/templates"
    echo "  - Card Generation: /api/id-cards/generation"
    echo "  - Health Check: /api/id-cards/health"
else
    print_error "❌ Some dependencies failed to install:"
    for package in "${FAILED_PACKAGES[@]}"; do
        echo "  - $package"
    done
    echo ""
    echo "Please resolve these issues before proceeding."
    exit 1
fi

echo "=============================================="