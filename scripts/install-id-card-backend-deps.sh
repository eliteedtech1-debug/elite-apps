#!/bin/bash

# Student ID Card Generator - Backend Dependencies Installation
# Date: 2026-01-02
# Description: Install correct server-side dependencies for ID card generation

echo "🚀 Installing Student ID Card Generator Backend Dependencies..."

cd /Users/apple/Downloads/apps/elite/elscholar-api

# Install server-side PDF generation dependencies
echo "📦 Installing PDFKit for server-side PDF generation..."
npm install pdfkit

echo "📦 Installing QR code generation..."
npm install qrcode

echo "📦 Installing barcode generation..."
npm install jsbarcode

echo "📦 Installing Canvas for image processing..."
npm install canvas

echo "📦 Installing Sharp for image optimization..."
npm install sharp

echo "📦 Installing Multer for file uploads..."
npm install multer

echo "✅ Backend dependencies installed successfully!"

echo "📋 Installed packages:"
echo "  - pdfkit: Server-side PDF generation"
echo "  - qrcode: QR code generation"
echo "  - jsbarcode: Barcode generation"
echo "  - canvas: Image processing"
echo "  - sharp: Image optimization"
echo "  - multer: File upload handling"

echo ""
echo "⚠️  NOTE: React-PDF is NOT needed in the backend!"
echo "   React-PDF is only for frontend PDF preview."
echo "   Backend uses PDFKit for actual PDF generation."

echo ""
echo "🎯 Next steps:"
echo "1. Restart the backend server"
echo "2. Test the ID card generation endpoints"
echo "3. Verify PDF generation works correctly"
