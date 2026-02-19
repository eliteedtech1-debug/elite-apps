# Remita School Fees Payment - Revised Implementation

## Using Existing Infrastructure

### Existing Tables to Utilize

#### 1. `payment_gateway_config` (Already exists)
```sql
-- Structure:
config_id, school_id, gateway_name, is_active, is_default, config_data (JSON)

-- Remita config_data structure:
{
  "merchant_id": "xxx",
  "api_key": "xxx", 
  "service_type_id": "xxx",
  "environment": "test|production",
  "school_account": "1234567890",
  "school_bank_code": "057",
  "platform_account": "0987654321",
  "platform_bank_code": "058"
}
```

#### 2. `payment_gateway_transactions` (Already exists)
```sql
-- Extend for school fees by adding columns:
ALTER TABLE payment_gateway_transactions
ADD COLUMN admission_no VARCHAR(50) NULL AFTER staff_id,
ADD COLUMN parent_id VARCHAR(25) NULL AFTER admission_no,
ADD COLUMN academic_year VARCHAR(20) NULL,
ADD COLUMN term VARCHAR(20) NULL,
ADD COLUMN payment_items JSON NULL COMMENT 'Array of payment_entry item_ids',
ADD INDEX idx_admission (admission_no),
ADD INDEX idx_parent (parent_id);
```

#### 3. `payment_entries` (Already exists)
```sql
-- Add gateway tracking columns:
ALTER TABLE payment_entries 
ADD COLUMN gateway_transaction_id INT NULL AFTER ref_no,
ADD COLUMN gateway_reference VARCHAR(100) NULL,
ADD INDEX idx_gateway_transaction (gateway_transaction_id);
```

---

## Implementation

### 1. Configuration Service (`src/services/gateway.config.js`)

```javascript
class GatewayConfigService {
  async getRemitaConfig(schoolId) {
    const config = await db.query(
      `SELECT config_data FROM payment_gateway_config 
       WHERE school_id = ? AND gateway_name = 'remita' AND is_active = 1`,
      [schoolId]
    );
    
    if (!config) throw new Error('Remita not configured for this school');
    
    const data = JSON.parse(config.config_data);
    return {
      merchantId: data.merchant_id,
      apiKey: data.api_key,
      serviceTypeId: data.service_type_id,
      isProduction: data.environment === 'production',
      gatewayUrl: data.environment === 'production'
        ? 'https://login.remita.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit'
        : 'https://remitademo.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit',
      schoolAccount: data.school_account,
      schoolBankCode: data.school_bank_code,
      platformAccount: data.platform_account,
      platformBankCode: data.platform_bank_code
    };
  }
}

module.exports = new GatewayConfigService();
```

### 2. Remita Service (`src/services/remita.service.js`)

```javascript
const crypto = require('crypto');
const axios = require('axios');

class RemitaService {
  generatePaymentRef() {
    return 'SF' + Date.now() + Math.floor(Math.random() * 1000);
  }

  generateHash(merchantId, serviceTypeId, orderId, amount, apiKey) {
    const str = merchantId + serviceTypeId + orderId + amount + apiKey;
    return crypto.createHash('sha512').update(str).digest('hex');
  }

  async generateRRR(config, data) {
    const hash = this.generateHash(
      config.merchantId, config.serviceTypeId, 
      data.paymentRef, data.amount, config.apiKey
    );

    const payload = {
      serviceTypeId: config.serviceTypeId,
      amount: data.amount,
      hash,
      orderId: data.paymentRef,
      payerName: data.payerName,
      payerEmail: data.payerEmail,
      payerPhone: data.payerPhone,
      lineItems: data.lineItems
    };

    const response = await axios.post(config.gatewayUrl, payload, {
      headers: {
        'Authorization': `remitaConsumerKey=${config.merchantId},remitaConsumerToken=${hash}`,
        'Content-Type': 'application/json'
      }
    });

    const jsonpMatch = response.data.match(/jsonp\s*\((.*)\)/);
    const result = jsonpMatch ? JSON.parse(jsonpMatch[1]) : response.data;

    return {
      rrr: result.RRR.trim(),
      statusCode: result.statuscode,
      status: result.status
    };
  }

  async verifyPayment(config, rrr) {
    const hash = crypto.createHash('sha512')
      .update(rrr + config.apiKey + config.merchantId)
      .digest('hex');

    const url = config.isProduction
      ? `https://login.remita.net/remita/ecomm/${config.merchantId}/${rrr}/${hash}/status.reg`
      : `https://remitademo.net/remita/ecomm/${config.merchantId}/${rrr}/${hash}/status.reg`;

    const response = await axios.get(url);
    return response.data;
  }
}

module.exports = new RemitaService();
```

### 3. Payment Controller (`src/controllers/schoolfees.payment.controller.js`)

```javascript
const remitaService = require('../services/remita.service');
const gatewayConfig = require('../services/gateway.config');

exports.generateRRR = async (req, res) => {
  const { admissionNo, selectedItems, payerInfo } = req.body;

  const student = await db.query(
    'SELECT * FROM students WHERE admission_no = ?', [admissionNo]
  );

  const items = await db.query(
    'SELECT * FROM payment_entries WHERE item_id IN (?)', [selectedItems]
  );

  const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.dr), 0);
  const config = await gatewayConfig.getRemitaConfig(student.school_id);
  const paymentRef = remitaService.generatePaymentRef();

  const lineItems = [
    {
      lineItemsId: `BNB1${Date.now()}`,
      beneficiaryName: "SCHOOL REVENUE",
      beneficiaryAccount: config.schoolAccount,
      bankCode: config.schoolBankCode,
      beneficiaryAmount: totalAmount - 500,
      deductFeeFrom: "1"
    },
    {
      lineItemsId: `BNB2${Date.now()}`,
      beneficiaryName: "PLATFORM FEE",
      beneficiaryAccount: config.platformAccount,
      bankCode: config.platformBankCode,
      beneficiaryAmount: 500,
      deductFeeFrom: "0"
    }
  ];

  const result = await remitaService.generateRRR(config, {
    paymentRef,
    amount: totalAmount,
    payerName: payerInfo.name,
    payerEmail: payerInfo.email,
    payerPhone: payerInfo.phone,
    lineItems
  });

  // Save to payment_gateway_transactions
  const [txn] = await db.query(
    `INSERT INTO payment_gateway_transactions 
     (school_id, gateway_name, transaction_type, reference, amount, status,
      request_payload, response_payload, admission_no, parent_id, 
      academic_year, term, payment_items)
     VALUES (?, 'remita', 'collection', ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.school_id, result.rrr, totalAmount,
      JSON.stringify({ paymentRef, lineItems }),
      JSON.stringify(result),
      admissionNo, student.parent_id,
      student.academic_year, req.body.term,
      JSON.stringify(selectedItems)
    ]
  );

  // Link payment_entries to gateway transaction
  await db.query(
    `UPDATE payment_entries 
     SET gateway_transaction_id = ?, gateway_reference = ?
     WHERE item_id IN (?)`,
    [txn.insertId, result.rrr, selectedItems]
  );

  res.json({
    success: true,
    rrr: result.rrr,
    paymentRef,
    amount: totalAmount,
    paymentUrl: `https://remitademo.net/remita/ecomm/finalize.reg?merchantId=${config.merchantId}&rrr=${result.rrr}`
  });
};

exports.verifyPayment = async (req, res) => {
  const { rrr } = req.params;

  const txn = await db.query(
    'SELECT * FROM payment_gateway_transactions WHERE reference = ?', [rrr]
  );

  const config = await gatewayConfig.getRemitaConfig(txn.school_id);
  const verification = await remitaService.verifyPayment(config, rrr);

  if (verification.status === '00' || verification.status === '01') {
    await db.query(
      `UPDATE payment_gateway_transactions 
       SET status = 'success', response_payload = ?, updated_at = NOW()
       WHERE reference = ?`,
      [JSON.stringify(verification), rrr]
    );

    await db.query(
      `UPDATE payment_entries 
       SET payment_status = 'Paid', payment_date = NOW()
       WHERE gateway_reference = ?`,
      [rrr]
    );

    res.json({ success: true, message: 'Payment verified' });
  } else {
    res.json({ success: false, message: 'Payment failed' });
  }
};

exports.handleWebhook = async (req, res) => {
  const { rrr, status } = req.body;

  await db.query(
    `INSERT INTO payment_gateway_webhooks 
     (gateway_name, event_type, reference, payload, processed)
     VALUES ('remita', 'payment.notification', ?, ?, 0)`,
    [rrr, JSON.stringify(req.body)]
  );

  // Process webhook asynchronously
  processWebhook(rrr, status);

  res.status(200).send('OK');
};
```

### 4. Setup Remita for School

```sql
-- Configure Remita for a school
INSERT INTO payment_gateway_config 
  (school_id, gateway_name, is_active, is_default, config_data)
VALUES 
  ('SCH/20', 'remita', 1, 1, JSON_OBJECT(
    'merchant_id', 'YOUR_MERCHANT_ID',
    'api_key', 'YOUR_API_KEY',
    'service_type_id', 'YOUR_SERVICE_TYPE_ID',
    'environment', 'test',
    'school_account', '1012750390',
    'school_bank_code', '057',
    'platform_account', '0502544320',
    'platform_bank_code', '232'
  ));
```

---

## Benefits of Using Existing Tables

1. **No new tables** - Reuses `payment_gateway_config` and `payment_gateway_transactions`
2. **Multi-gateway support** - Can add Paystack, Flutterwave later
3. **Consistent structure** - Same pattern for all payment gateways
4. **Audit trail** - All transactions logged in one place
5. **Webhook handling** - Centralized webhook processing

---

## Migration Script

```sql
-- Extend payment_gateway_transactions for school fees
ALTER TABLE payment_gateway_transactions
ADD COLUMN admission_no VARCHAR(50) NULL AFTER staff_id,
ADD COLUMN parent_id VARCHAR(25) NULL AFTER admission_no,
ADD COLUMN academic_year VARCHAR(20) NULL,
ADD COLUMN term VARCHAR(20) NULL,
ADD COLUMN payment_items JSON NULL,
ADD INDEX idx_admission (admission_no),
ADD INDEX idx_parent (parent_id);

-- Link payment_entries to gateway transactions
ALTER TABLE payment_entries 
ADD COLUMN gateway_transaction_id INT NULL AFTER ref_no,
ADD COLUMN gateway_reference VARCHAR(100) NULL,
ADD INDEX idx_gateway_transaction (gateway_transaction_id),
ADD CONSTRAINT fk_payment_gateway_txn 
  FOREIGN KEY (gateway_transaction_id) 
  REFERENCES payment_gateway_transactions(transaction_id);
```

---

## Routes

```javascript
router.post('/schoolfees/generate-rrr', authenticate, generateRRR);
router.get('/schoolfees/verify/:rrr', authenticate, verifyPayment);
router.post('/webhooks/remita', handleWebhook);
```

---

## Complete Workflow

1. Parent selects child's pending fees
2. System generates RRR using `payment_gateway_config`
3. Transaction logged in `payment_gateway_transactions`
4. `payment_entries` linked to transaction via `gateway_transaction_id`
5. Parent pays on Remita
6. Webhook received → logged in `payment_gateway_webhooks`
7. Verification updates both tables
8. Receipt generated

This approach is cleaner, reuses existing infrastructure, and supports multiple payment gateways.
