# Remita RRR Generation Guide for Express.js

This guide shows how to generate Remita RRR (Remita Retrieval Reference) for payment processing in an Express.js backend.

## Overview

The RRR generation process involves:
1. Creating a payment reference
2. Generating a hash for authentication
3. Sending payment details to Remita API
4. Storing the returned RRR in your database

## Prerequisites

```bash
npm install axios crypto
```

## Configuration

Create a `remita.config.js` file:

```javascript
module.exports = {
  merchantId: 'YOUR_MERCHANT_ID',
  apiKey: 'YOUR_API_KEY',
  serviceTypeId: 'YOUR_SERVICE_TYPE_ID',
  gatewayUrl: 'https://remitademo.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit',
  // For production: https://login.remita.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit
};
```

## Implementation

### 1. Generate Payment Reference

```javascript
function generatePaymentRef() {
  const prefix = 'REG' + new Date().getFullYear().toString().slice(-2);
  const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
  return prefix + randomNumber;
}
```

### 2. Generate Hash

```javascript
const crypto = require('crypto');

function generateHash(merchantId, serviceTypeId, orderId, totalAmount, apiKey) {
  const hashString = merchantId + serviceTypeId + orderId + totalAmount + apiKey;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}
```

### 3. Generate RRR (Main Function)

```javascript
const axios = require('axios');
const config = require('./remita.config');

async function generateRRR(paymentData) {
  const {
    paymentRef,
    amount,
    payerName,
    payerEmail,
    payerPhone,
    lineItems // Array of split payment details
  } = paymentData;

  // Generate hash
  const hash = generateHash(
    config.merchantId,
    config.serviceTypeId,
    paymentRef,
    amount,
    config.apiKey
  );

  // Generate unique line item IDs
  const timestamp = Date.now();
  const lineItemsWithIds = lineItems.map((item, index) => ({
    lineItemsId: `BNB${index + 1}${timestamp}`,
    beneficiaryName: item.beneficiaryName,
    beneficiaryAccount: item.beneficiaryAccount,
    bankCode: item.bankCode,
    beneficiaryAmount: item.beneficiaryAmount,
    deductFeeFrom: index === 0 ? "1" : "0" // First beneficiary pays fee
  }));

  // Prepare request payload
  const payload = {
    serviceTypeId: config.serviceTypeId,
    amount: amount,
    hash: hash,
    orderId: paymentRef,
    payerName: payerName,
    payerEmail: payerEmail,
    payerPhone: payerPhone,
    lineItems: lineItemsWithIds
  };

  try {
    // Make API request
    const response = await axios.post(config.gatewayUrl, payload, {
      headers: {
        'Authorization': `remitaConsumerKey=${config.merchantId},remitaConsumerToken=${hash}`,
        'Content-Type': 'application/json',
        'cache-control': 'no-cache'
      }
    });

    // Parse JSONP response
    let responseData;
    const jsonpMatch = response.data.match(/jsonp\s*\((.*)\)/);
    if (jsonpMatch) {
      responseData = JSON.parse(jsonpMatch[1]);
    } else {
      responseData = response.data;
    }

    // Return RRR details
    return {
      success: true,
      rrr: responseData.RRR.trim(),
      statusCode: responseData.statuscode,
      status: responseData.status,
      paymentRef: paymentRef
    };

  } catch (error) {
    console.error('Remita RRR Generation Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 4. Express.js Route Example

```javascript
const express = require('express');
const router = express.Router();

router.post('/generate-rrr', async (req, res) => {
  const {
    studentId,
    amount,
    payerName,
    payerEmail,
    payerPhone,
    academicSession,
    paymentPurpose
  } = req.body;

  // Generate payment reference
  const paymentRef = generatePaymentRef();

  // Define line items (split payment to different accounts)
  const lineItems = [
    {
      beneficiaryName: "SCHOOL REVENUE ACCOUNT",
      beneficiaryAccount: "1012750390",
      bankCode: "057", // Zenith Bank
      beneficiaryAmount: amount - 3400 // Main amount minus other splits
    },
    {
      beneficiaryName: "ICT PROJECT",
      beneficiaryAccount: "0221574354",
      bankCode: "058", // GTBank
      beneficiaryAmount: 1000
    },
    {
      beneficiaryName: "SPIDER TECHNOLOGIES LIMITED",
      beneficiaryAccount: "0502544320",
      bankCode: "232", // Sterling Bank
      beneficiaryAmount: 400
    },
    {
      beneficiaryName: "SCHOOL DEPARTMENT ACCOUNT",
      beneficiaryAccount: "2018691926",
      bankCode: "011", // First Bank
      beneficiaryAmount: 2000
    }
  ];

  // Generate RRR
  const result = await generateRRR({
    paymentRef,
    amount,
    payerName,
    payerEmail,
    payerPhone,
    lineItems
  });

  if (result.success) {
    // Save to database
    await db.paymentHistory.create({
      studentId,
      paymentRef,
      paymentRrr: result.rrr,
      amount,
      payerName,
      payerEmail,
      payerPhone,
      paymentStatus: result.statusCode, // '025' = pending
      paymentMessage: result.status,
      academicSession,
      paymentPurpose,
      paymentDate: new Date()
    });

    res.json({
      success: true,
      rrr: result.rrr,
      paymentRef: paymentRef,
      amount: amount
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error
    });
  }
});

module.exports = router;
```

### 5. Payment Verification

```javascript
async function verifyPayment(rrr) {
  const hash = crypto.createHash('sha512')
    .update(rrr + config.apiKey + config.merchantId)
    .digest('hex');

  const verifyUrl = `https://remitademo.net/remita/ecomm/${config.merchantId}/${rrr}/${hash}/status.reg`;

  try {
    const response = await axios.get(verifyUrl);
    
    // Parse response
    const data = response.data;
    
    return {
      success: true,
      status: data.status,
      amount: data.amount,
      message: data.message
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 6. Complete Payment Flow

```javascript
// 1. Generate RRR
app.post('/api/payment/generate', async (req, res) => {
  const result = await generateRRR(req.body);
  res.json(result);
});

// 2. Redirect user to Remita payment page
// Frontend: window.location.href = `https://remitademo.net/remita/ecomm/finalize.reg?merchantId=${merchantId}&rrr=${rrr}&hash=${hash}&responseurl=${callbackUrl}`;

// 3. Handle payment callback
app.post('/api/payment/callback', async (req, res) => {
  const { rrr } = req.body;
  
  const verification = await verifyPayment(rrr);
  
  if (verification.success && verification.status === '00') {
    // Update payment status in database
    await db.paymentHistory.update(
      { paymentStatus: '00', paymentMessage: 'Successful' },
      { where: { paymentRrr: rrr } }
    );
    
    res.redirect('/payment/success');
  } else {
    res.redirect('/payment/failed');
  }
});
```

## Important Notes

1. **Hash Generation**: Always use SHA-512 for hash generation
2. **Line Items**: Total of all `beneficiaryAmount` must equal the main `amount`
3. **Status Codes**:
   - `025` = Pending
   - `00` = Successful
   - `01` = Successful (alternative)
4. **Environment**: Use demo URL for testing, production URL for live
5. **Security**: Never expose `apiKey` in frontend code

## Testing

Use Remita's demo credentials for testing:
- Merchant ID: Demo merchant ID
- API Key: Demo API key
- Test cards available in Remita documentation

## Error Handling

Common errors:
- Invalid hash: Check hash generation logic
- Invalid service type: Verify serviceTypeId
- Amount mismatch: Ensure line items sum equals total amount
- Network timeout: Increase timeout or retry logic

## Database Schema

```sql
CREATE TABLE payment_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id VARCHAR(50),
  payment_ref VARCHAR(50) UNIQUE,
  payment_rrr VARCHAR(50),
  amount DECIMAL(10,2),
  payer_name VARCHAR(100),
  payer_email VARCHAR(100),
  payer_phone VARCHAR(20),
  payment_status VARCHAR(10),
  payment_message VARCHAR(100),
  academic_session VARCHAR(20),
  payment_purpose VARCHAR(200),
  payment_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Resources

- [Remita API Documentation](https://www.remita.net/developers/)
- [Remita Demo Environment](https://remitademo.net)
