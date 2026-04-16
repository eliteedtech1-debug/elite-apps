# Remita Integration - Quick Reference

## 🚀 Quick Start

### 1. Database Setup
```sql
-- Run these migrations in order:
SOURCE payment_gateway_integration.sql;
SOURCE remita_api_keys.sql;
```

### 2. Configure for School
```sql
-- Insert config for your school
INSERT INTO payment_gateway_config 
  (school_id, gateway_name, is_active, is_default, is_test_mode, config_data)
VALUES 
  ('SCH/20', 'remita', 1, 1, 1, JSON_OBJECT(
    'merchant_id', '2547916',
    'api_key', '1946',
    'api_token', 'Q0dQMDAwMDAwMDAwMDAwMDAwMDA=',
    'service_type_id', '4430731',
    'environment', 'test',
    'base_url', 'https://remitademo.net/remita',
    'api_base_url', 'https://remitademo.net/remita/exapp/api/v1/send/api'
  ));
```

### 3. Test Payment
```bash
# Check config
curl -X GET http://localhost:34567/payroll/payment-gateway/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-School-Id: SCH/20"

# Process payment
curl -X POST http://localhost:34567/payroll/staff/123/pay-via-gateway \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-School-Id: SCH/20"
```

---

## 📋 API Endpoints

### Backend Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/payroll/payment-gateway/config` | Get gateway config | Required |
| POST | `/payroll/staff/:staffId/pay-via-gateway` | Pay staff via gateway | Admin/BranchAdmin |
| GET | `/payroll/payment-status/:reference` | Check payment status | Required |
| GET | `/api/payment-gateway-config` | List all configs | Required |
| GET | `/api/payment-gateway-config/:schoolId` | Get school config | Required |
| POST | `/api/payment-gateway-config` | Create config | Required |
| PUT | `/api/payment-gateway-config/:id` | Update config | Required |

---

## 🗄️ Database Tables

### payment_gateway_config
```sql
SELECT * FROM payment_gateway_config WHERE school_id = 'SCH/20';
```

**Key Columns:**
- `school_id` - School identifier
- `gateway_name` - 'remita', 'paystack', etc.
- `is_active` - 1 = active, 0 = inactive
- `is_test_mode` - 1 = test, 0 = live
- `school_payment_integration` - 'full' or 'payroll_only'
- `config_data` - JSON with credentials

### payment_gateway_transactions
```sql
SELECT * FROM payment_gateway_transactions 
WHERE school_id = 'SCH/20' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Key Columns:**
- `reference` - Payment reference (RRR)
- `amount` - Payment amount
- `status` - 'pending', 'processing', 'success', 'failed'
- `request_payload` - API request
- `response_payload` - API response
- `staff_id` - Staff being paid

### payroll_lines (Enhanced)
```sql
SELECT 
  staff_id, net_pay, 
  payment_method, gateway_name, 
  payment_reference, payment_status,
  disbursement_status
FROM payroll_lines 
WHERE period_month = '2026-02' 
  AND payment_method = 'gateway';
```

**New Columns:**
- `payment_method` - 'manual' or 'gateway'
- `gateway_name` - 'remita', etc.
- `payment_reference` - RRR from gateway
- `payment_status` - 'pending', 'success', 'failed'
- `payment_response` - JSON response
- `payment_initiated_at` - When payment started
- `payment_completed_at` - When payment completed

---

## 🔐 Remita API

### Hash Generation
```javascript
// SHA512(merchantId + serviceTypeId + orderId + totalAmount + apiKey)
const crypto = require('crypto');
const hashString = `${merchantId}${serviceTypeId}${orderId}${totalAmount}${apiKey}`;
const hash = crypto.createHash('sha512').update(hashString).digest('hex');
```

### Payment Init Request
```javascript
{
  serviceTypeId: "4430731",
  amount: 50000.00,
  orderId: "PAY-1738918374000-123",
  payerName: "John Doe",
  payerEmail: "john@school.com",
  payerPhone: "08012345678",
  description: "Salary payment for John Doe",
  hash: "generated_sha512_hash"
}
```

### Status Check Hash
```javascript
// SHA512(rrr + apiKey + merchantId)
const hashString = `${rrr}${apiKey}${merchantId}`;
const hash = crypto.createHash('sha512').update(hashString).digest('hex');
```

---

## 🎨 Frontend Usage

### Load Gateway Config
```typescript
_get('payroll/payment-gateway/config', (res: any) => {
  if (res.success && res.data) {
    setPaymentGatewayConfig(res.data);
  }
});
```

### Process Payment
```typescript
_post(`payroll/staff/${staffId}/pay-via-gateway`, {}, (res: any) => {
  if (res.success) {
    message.success('Payment processed successfully');
    // Update UI
  }
});
```

### Check Status
```typescript
_get(`payroll/payment-status/${reference}`, (res: any) => {
  if (res.success) {
    console.log('Status:', res.data.status);
  }
});
```

---

## 🔍 Debugging

### Check Gateway Config
```sql
SELECT 
  school_id, gateway_name, is_active, is_test_mode,
  JSON_EXTRACT(config_data, '$.environment') as environment,
  JSON_EXTRACT(config_data, '$.merchant_id') as merchant_id
FROM payment_gateway_config;
```

### View Recent Transactions
```sql
SELECT 
  transaction_id, school_id, gateway_name,
  reference, amount, status,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created,
  error_message
FROM payment_gateway_transactions 
ORDER BY created_at DESC 
LIMIT 20;
```

### Check Failed Payments
```sql
SELECT 
  t.reference, t.amount, t.status, t.error_message,
  s.name as staff_name, s.email
FROM payment_gateway_transactions t
LEFT JOIN staff s ON t.staff_id = s.id
WHERE t.status = 'failed'
  AND t.school_id = 'SCH/20'
ORDER BY t.created_at DESC;
```

### View Payroll Payment Status
```sql
SELECT 
  pl.staff_id, s.name,
  pl.net_pay, pl.payment_method,
  pl.gateway_name, pl.payment_reference,
  pl.payment_status, pl.disbursement_status,
  pl.payment_completed_at
FROM payroll_lines pl
LEFT JOIN staff s ON pl.staff_id = s.id
WHERE pl.period_month = '2026-02'
  AND pl.school_id = 'SCH/20'
  AND pl.payment_method = 'gateway';
```

---

## ⚠️ Common Issues

### Issue: "Remita not configured for this school"
**Solution:** Insert gateway config for the school
```sql
INSERT INTO payment_gateway_config (school_id, gateway_name, is_active, config_data)
VALUES ('SCH/XX', 'remita', 1, '{"merchant_id":"xxx","api_key":"xxx"}');
```

### Issue: "Invalid hash"
**Solution:** Verify hash generation order
```javascript
// Correct order for payment init:
merchantId + serviceTypeId + orderId + totalAmount + apiKey

// Correct order for status check:
rrr + apiKey + merchantId
```

### Issue: Payment stuck in "pending"
**Solution:** Check payment status manually
```bash
curl -X GET http://localhost:34567/payroll/payment-status/RRR_HERE \
  -H "Authorization: Bearer TOKEN" \
  -H "X-School-Id: SCH/20"
```

### Issue: "Staff not found"
**Solution:** Verify staff_id and school_id match
```sql
SELECT id, staff_id, name, school_id 
FROM staff 
WHERE staff_id = 'STAFF_ID_HERE';
```

---

## 📊 Monitoring Queries

### Daily Payment Summary
```sql
SELECT 
  DATE(created_at) as payment_date,
  COUNT(*) as total_payments,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(amount) as total_amount
FROM payment_gateway_transactions
WHERE school_id = 'SCH/20'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY payment_date DESC;
```

### Gateway Performance
```sql
SELECT 
  gateway_name,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate,
  SUM(amount) as total_amount
FROM payment_gateway_transactions
WHERE school_id = 'SCH/20'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY gateway_name;
```

### Pending Payments
```sql
SELECT 
  t.reference, t.amount, 
  s.name as staff_name, s.email,
  t.created_at,
  TIMESTAMPDIFF(MINUTE, t.created_at, NOW()) as minutes_pending
FROM payment_gateway_transactions t
LEFT JOIN staff s ON t.staff_id = s.id
WHERE t.status = 'pending'
  AND t.school_id = 'SCH/20'
ORDER BY t.created_at;
```

---

## 🔧 Configuration Options

### Integration Types

**Full System (`full`):**
- Payment gateway used for all modules
- Student fees, payroll, expenses, etc.

**Payroll Only (`payroll_only`):**
- Payment gateway only for payroll disbursement
- Other modules use manual/bank transfer

### Test vs Live Mode

**Test Mode (`is_test_mode = 1`):**
- Uses test credentials
- Points to demo environment
- No real money transferred

**Live Mode (`is_test_mode = 0`):**
- Uses production credentials
- Points to live environment
- Real money transferred

---

## 📝 Code Locations

### Backend
- Service: `elscholar-api/src/services/PaymentGatewayService.js`
- Controller: `elscholar-api/src/controllers/PayrollController.js` (lines 3077-3177)
- Config Controller: `elscholar-api/src/controllers/PaymentGatewayConfigController.js`
- Routes: `elscholar-api/src/routes/payroll.js` (lines 118-121)
- Config Routes: `elscholar-api/src/routes/paymentGatewayConfig.js`

### Frontend
- Salary Disbursement: `elscholar-ui/src/feature-module/payroll/SalaryDisbursement.tsx` (lines 1053-1107)
- Gateway Config: `elscholar-ui/src/feature-module/superadmin/PaymentGatewayConfig.tsx`

### SQL
- Schema: `payment_gateway_integration.sql`
- Credentials: `remita_api_keys.sql`

---

## 🎯 Next Steps

1. **Test Environment Setup**
   - Run migrations
   - Configure test credentials
   - Test with small amounts

2. **Production Setup**
   - Obtain production Remita credentials
   - Update config with live credentials
   - Set `is_test_mode = 0`

3. **Monitoring**
   - Set up transaction monitoring
   - Configure alerts for failed payments
   - Regular reconciliation

4. **Additional Gateways**
   - Add Paystack configuration
   - Add Flutterwave configuration
   - Test multi-gateway support

---

**Quick Reference Version:** 1.0  
**Last Updated:** February 7, 2026
