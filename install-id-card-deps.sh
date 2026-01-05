#!/bin/bash

echo "🔧 Installing ID Card Generator dependencies..."

cd elscholar-api

# Install React-PDF for PDF generation
npm install @react-pdf/renderer

# Install canvas for barcode generation
npm install canvas

# Install jsbarcode for barcode generation
npm install jsbarcode

# Install react and react-dom as peer dependencies for React-PDF
npm install react react-dom

echo "✅ Dependencies installed successfully!"
echo ""
echo "📦 Installed packages:"
echo "  - @react-pdf/renderer (PDF generation)"
echo "  - canvas (image processing)"
echo "  - jsbarcode (barcode generation)"
echo "  - react & react-dom (React-PDF dependencies)"
echo ""
echo "🚀 ID Card Generator Phase 1 API is ready!"