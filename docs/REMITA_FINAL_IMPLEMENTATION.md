# Remita School Fees - Final Implementation

## Architecture

**App-Level**: One Remita integration (merchant_id, api_key, service_type_id)  
**School-Level**: Individual bank accounts for split payment

---

## Database Changes

### 1. App-Level Remita Config (Environment Variables)

```bash
# .env file - Store once, never in database
REMITA_MERCHANT_ID=YOUR_MERCHANT_ID
REMITA_API_KEY=YOUR_API_KEY
REMITA_SERVICE_TYPE_ID=YOUR_SERVICE_TYPE_ID
REMITA_ENVIRONMENT=production
```

**OR** if you prefer database (single row only):

```sql
-- Single global config (not per school)
INSERT INTO payment_gateway_config 
  (school_id, gateway_name, is_active, is_default, config_data)
VALUES 
  ('GLOBAL', 'remita', 1, 1, JSON_OBJECT(
    'merchant_id', 'YOUR_MERCHANT_ID',
    'api_key', 'YOUR_API_KEY',
    'service_type_id', 'YOUR_SERVICE_TYPE_ID',
    'environment', 'production'
  ))
ON DUPLICATE KEY UPDATE config_data = VALUES(config_data);
```

### 2. School Bank Accounts Table (Already exists or create)

```sql
CREATE TABLE IF NOT EXISTS school_bank_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  bank_code VARCHAR(10) NOT NULL COMMENT 'CBN bank code',
  bank_name VARCHAR(100),
  account_type ENUM('revenue', 'platform_fee', 'other') DEFAULT 'revenue',
  is_default BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_school_account (school_id, account_number),
  INDEX idx_school (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. Extend Existing Tables

```sql
-- Extend payment_gateway_transactions for school fees
ALTER TABLE payment_gateway_transactions
ADD COLUMN IF NOT EXISTS admission_no VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS parent_id VARCHAR(25) NULL,
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS term VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS payment_items JSON NULL,
ADD INDEX IF NOT EXISTS idx_admission (admission_no),
ADD INDEX IF NOT EXISTS idx_parent (parent_id);

-- Link payment_entries to gateway
ALTER TABLE payment_entries 
ADD COLUMN IF NOT EXISTS gateway_transaction_id INT NULL,
ADD COLUMN IF NOT EXISTS gateway_reference VARCHAR(100) NULL,
ADD INDEX IF NOT EXISTS idx_gateway_ref (gateway_reference);
```

---

## Implementation

### 1. Configuration Service

```javascript
// src/services/gateway.config.js
class GatewayConfigService {
  getAppRemitaConfig() {
    // Option 1: From environment variables (RECOMMENDED)
    return {
      merchantId: process.env.REMITA_MERCHANT_ID,
      apiKey: process.env.REMITA_API_KEY,
      serviceTypeId: process.env.REMITA_SERVICE_TYPE_ID,
      isProduction: process.env.REMITA_ENVIRONMENT === 'production',
      gatewayUrl: process.env.REMITA_ENVIRONMENT === 'production'
        ? 'https://login.remita.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit'
        : 'https://remitademo.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit'
    };
    
    // Option 2: From database (if you prefer)
    // const config = await db.query(
    //   `SELECT config_data FROM payment_gateway_config 
    //    WHERE school_id = 'GLOBAL' AND gateway_name = 'remita'`
    // );
    // const data = JSON.parse(config.config_data);
    // return { ...data, gatewayUrl: ... };
  }

  async getSchoolBankAccounts(schoolId) {
    return await db.query(
      `SELECT * FROM school_bank_accounts 
       WHERE school_id = ? ORDER BY is_default DESC`,
      [schoolId]
    );
  }
}

module.exports = new GatewayConfigService();
```

### 2. Payment Controller

```javascript
// src/controllers/schoolfees.payment.controller.js
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
  
  // Get app-level Remita config (from env variables - no DB query needed)
  const remitaConfig = await gatewayConfig.getAppRemitaConfig();
  
  // Get school's bank accounts
  const schoolAccounts = await gatewayConfig.getSchoolBankAccounts(student.school_id);
  const revenueAccount = schoolAccounts.find(a => a.account_type === 'revenue');
  const platformAccount = schoolAccounts.find(a => a.account_type === 'platform_fee');

  const paymentRef = remitaService.generatePaymentRef();

  const lineItems = [
    {
      lineItemsId: `BNB1${Date.now()}`,
      beneficiaryName: revenueAccount.account_name,
      beneficiaryAccount: revenueAccount.account_number,
      bankCode: revenueAccount.bank_code,
      beneficiaryAmount: totalAmount - 500,
      deductFeeFrom: "1"
    },
    {
      lineItemsId: `BNB2${Date.now()}`,
      beneficiaryName: platformAccount.account_name,
      beneficiaryAccount: platformAccount.account_number,
      bankCode: platformAccount.bank_code,
      beneficiaryAmount: 500,
      deductFeeFrom: "0"
    }
  ];

  const result = await remitaService.generateRRR(remitaConfig, {
    paymentRef,
    amount: totalAmount,
    payerName: payerInfo.name,
    payerEmail: payerInfo.email,
    payerPhone: payerInfo.phone,
    lineItems
  });

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

  await db.query(
    `UPDATE payment_entries 
     SET gateway_transaction_id = ?, gateway_reference = ?
     WHERE item_id IN (?)`,
    [txn.insertId, result.rrr, selectedItems]
  );

  res.json({
    success: true,
    rrr: result.rrr,
    amount: totalAmount,
    paymentUrl: `${remitaConfig.isProduction ? 'https://login.remita.net' : 'https://remitademo.net'}/remita/ecomm/finalize.reg?merchantId=${remitaConfig.merchantId}&rrr=${result.rrr}`
  });
};

exports.verifyPayment = async (req, res) => {
  const { rrr } = req.params;

  const txn = await db.query(
    'SELECT * FROM payment_gateway_transactions WHERE reference = ?', [rrr]
  );

  const remitaConfig = await gatewayConfig.getAppRemitaConfig();
  const verification = await remitaService.verifyPayment(remitaConfig, rrr);

  if (verification.status === '00' || verification.status === '01') {
    await db.query(
      `UPDATE payment_gateway_transactions 
       SET status = 'success', response_payload = ?
       WHERE reference = ?`,
      [JSON.stringify(verification), rrr]
    );

    await db.query(
      `UPDATE payment_entries 
       SET payment_status = 'Paid', payment_date = NOW()
       WHERE gateway_reference = ?`,
      [rrr]
    );

    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
};
```

### 3. School Onboarding - Add Bank Accounts

```javascript
// src/controllers/school.onboarding.controller.js
exports.addSchoolBankAccount = async (req, res) => {
  const { schoolId, accountName, accountNumber, bankCode, bankName, accountType } = req.body;

  await db.query(
    `INSERT INTO school_bank_accounts 
     (school_id, account_name, account_number, bank_code, bank_name, account_type, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [schoolId, accountName, accountNumber, bankCode, bankName, accountType, 
     accountType === 'revenue' ? 1 : 0]
  );

  res.json({ success: true });
};
```

---

## School Onboarding Flow

### During School Setup:

```sql
-- Only add bank accounts (NO Remita credentials)
INSERT INTO school_bank_accounts 
  (school_id, account_name, account_number, bank_code, bank_name, account_type, is_default)
VALUES 
  ('SCH/20', 'PREMIER ACADEMY REVENUE', '1012750390', '057', 'Zenith Bank', 'revenue', 1),
  ('SCH/20', 'PLATFORM FEE ACCOUNT', '0502544320', '232', 'Sterling Bank', 'platform_fee', 0);
```

### Remita Credentials (Set Once):

```bash
# .env file
REMITA_MERCHANT_ID=YOUR_MERCHANT_ID
REMITA_API_KEY=YOUR_API_KEY
REMITA_SERVICE_TYPE_ID=YOUR_SERVICE_TYPE_ID
REMITA_ENVIRONMENT=production
```

---

## Summary

### App Level (Stored Once)
- **Environment Variables** (Recommended): Store in `.env` file
  ```
  REMITA_MERCHANT_ID=xxx
  REMITA_API_KEY=xxx
  REMITA_SERVICE_TYPE_ID=xxx
  ```
- **OR Database**: Single row in `payment_gateway_config` with `school_id = 'GLOBAL'`
- Never repeated, accessed globally

### School Level (Per school)
- Each school has bank accounts in `school_bank_accounts`
- Configured during onboarding
- No Remita credentials stored here

### Benefits
1. ✅ Remita credentials stored once (env or single DB row)
2. ✅ Each school gets money in their account
3. ✅ Platform fee automatically split
4. ✅ Easy to update credentials (one place)
5. ✅ Secure (credentials not repeated)
