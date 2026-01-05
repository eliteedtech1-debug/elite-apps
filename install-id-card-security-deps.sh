#!/bin/bash

# ID Card Security Dependencies Installation Script
# Installs all required packages for comprehensive security implementation

echo "🔒 Installing ID Card Security Dependencies..."

# Navigate to API directory
cd elscholar-api

# Install validation and security packages
echo "📦 Installing validation packages..."
npm install express-validator@6.14.2 --save

echo "📦 Installing image processing packages..."
npm install sharp@0.32.6 --save

echo "📦 Installing crypto and security packages..."
npm install crypto-js@4.1.1 --save
npm install helmet@7.1.0 --save
npm install express-rate-limit@6.10.0 --save

echo "📦 Installing file upload packages..."
npm install multer@1.4.5-lts.1 --save

echo "📦 Installing additional security utilities..."
npm install validator@13.11.0 --save
npm install sanitize-html@2.11.0 --save

# Verify installations
echo "✅ Verifying installations..."

# Check if packages are installed
packages=(
  "express-validator"
  "sharp"
  "crypto-js"
  "helmet"
  "express-rate-limit"
  "multer"
  "validator"
  "sanitize-html"
)

for package in "${packages[@]}"; do
  if npm list "$package" > /dev/null 2>&1; then
    echo "✓ $package installed successfully"
  else
    echo "✗ $package installation failed"
    exit 1
  fi
done

echo ""
echo "🔒 ID Card Security Dependencies Installation Complete!"
echo ""
echo "📋 Installed Packages:"
echo "   • express-validator - Input validation and sanitization"
echo "   • sharp - Secure image processing and optimization"
echo "   • crypto-js - Additional cryptographic functions"
echo "   • helmet - Security headers middleware"
echo "   • express-rate-limit - Rate limiting middleware"
echo "   • multer - Secure file upload handling"
echo "   • validator - String validation utilities"
echo "   • sanitize-html - HTML sanitization"
echo ""
echo "🚀 Security middleware is now ready for use!"
echo ""
echo "📝 Next Steps:"
echo "   1. Run database migration: mysql < elscholar-api/database_migrations/id_card_audit_log_table.sql"
echo "   2. Update environment variables for QR encryption"
echo "   3. Configure Cloudinary for secure file storage"
echo "   4. Test security middleware with sample requests"
echo ""