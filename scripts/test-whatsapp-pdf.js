/**
 * Test script for WhatsApp PDF sending functionality
 *
 * This script tests the end-to-end WhatsApp PDF sending implementation
 *
 * Prerequisites:
 * 1. Backend server must be running
 * 2. WhatsApp must be connected (QR code scanned)
 * 3. Valid school_id and test phone number required
 *
 * Usage: node test-whatsapp-pdf.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_SCHOOL_ID = 'your_school_id'; // Replace with actual school ID
const TEST_PHONE = '08012345678'; // Replace with actual test phone number

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

async function testWhatsAppConnection() {
  log(colors.blue, '🔍', 'Testing WhatsApp connection status...');

  try {
    const response = await axios.get(`${API_BASE_URL}/whatsapp/status`, {
      params: { school_id: TEST_SCHOOL_ID }
    });

    if (response.data.success && response.data.connected) {
      log(colors.green, '✅', `WhatsApp connected: ${response.data.phoneNumber}`);
      return true;
    } else {
      log(colors.yellow, '⚠️', `WhatsApp not connected. Status: ${response.data.status}`);
      if (response.data.hasQR) {
        log(colors.yellow, '📱', 'QR code is available. Please scan it first.');
      }
      return false;
    }
  } catch (error) {
    log(colors.red, '❌', `Error checking WhatsApp status: ${error.message}`);
    return false;
  }
}

async function generateTestPDF() {
  log(colors.blue, '📄', 'Generating test PDF...');

  // Create a simple PDF buffer (in real scenario, this would come from @react-pdf/renderer)
  // For testing purposes, we'll create a minimal PDF structure
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Invoice) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000304 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
398
%%EOF`;

  const pdfBuffer = Buffer.from(pdfContent);
  const pdfBase64 = pdfBuffer.toString('base64');

  log(colors.green, '✅', `PDF generated (${pdfBuffer.length} bytes)`);

  return pdfBase64;
}

async function testWhatsAppPDFSending() {
  log(colors.blue, '📤', 'Testing WhatsApp PDF sending...');

  try {
    const pdfBase64 = await generateTestPDF();

    const message = `🏫 *TEST SCHOOL*
📋 *SCHOOL FEES INVOICE*

Student: Test Student
Class: Test Class
Total Amount: ₦50,000.00

This is a test invoice.

Thank you!`;

    const response = await axios.post(`${API_BASE_URL}/whatsapp/send-with-pdf`, {
      school_id: TEST_SCHOOL_ID,
      phone: TEST_PHONE,
      message: message,
      pdfBase64: pdfBase64,
      filename: 'Test_Invoice.pdf'
    });

    if (response.data.success) {
      log(colors.green, '✅', 'WhatsApp message with PDF sent successfully!');
      log(colors.green, '📊', `Message ID: ${response.data.data.messageId}`);
      log(colors.green, '📞', `Recipient: ${response.data.data.recipient}`);
      return true;
    } else {
      log(colors.red, '❌', `Failed to send: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log(colors.red, '❌', `Error sending WhatsApp with PDF: ${error.message}`);
    if (error.response) {
      log(colors.red, '📋', `Server response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  log(colors.blue, '🧪', 'WhatsApp PDF Sending Test Suite');
  console.log('='.repeat(60) + '\n');

  // Check configuration
  if (TEST_SCHOOL_ID === 'your_school_id' || TEST_PHONE === '08012345678') {
    log(colors.red, '⚠️', 'Please update TEST_SCHOOL_ID and TEST_PHONE in the script');
    process.exit(1);
  }

  // Test 1: Check WhatsApp connection
  const isConnected = await testWhatsAppConnection();
  console.log('');

  if (!isConnected) {
    log(colors.yellow, '⏸️', 'Skipping PDF send test - WhatsApp not connected');
    log(colors.yellow, '💡', 'Connect WhatsApp first by scanning QR code');
    process.exit(0);
  }

  // Test 2: Send WhatsApp with PDF
  const sendSuccess = await testWhatsAppPDFSending();
  console.log('');

  // Summary
  console.log('='.repeat(60));
  if (sendSuccess) {
    log(colors.green, '🎉', 'All tests passed!');
  } else {
    log(colors.red, '❌', 'Some tests failed');
  }
  console.log('='.repeat(60) + '\n');
}

// Run tests
runTests().catch(error => {
  log(colors.red, '💥', `Unexpected error: ${error.message}`);
  process.exit(1);
});
