# Remita School Fees Payment Implementation Plan

## Overview
This plan outlines how to integrate Remita RRR generation for parents to pay their children's school fees using existing database tables.

---

## Existing Database Tables Analysis

### 1. **parents** table
- `parent_id` (VARCHAR) - Unique parent identifier
- `fullname`, `phone`, `email` - Parent contact details
- `school_id` - School association
- `user_id` - Links to users table

### 2. **students** table
- `admission_no` (VARCHAR) - Unique student identifier
- `parent_id` (VARCHAR) - Links to parents table
- `student_name`, `surname`, `first_name`
- `current_class`, `class_code`, `class_name`
- `academic_year`, `section`, `stream`
- `school_id`, `branch_id`

### 3. **payment_entries** table
- `item_id` - Auto-increment primary key
- `ref_no` - Payment reference
- `admission_no` - Links to students
- `item_category` - e.g., "School Fees"
- `description` - Payment description
- `cr` (credit), `dr` (debit) - Amounts
- `unit_price`, `quantity`
- `payment_status` - Default 'Pending'
- `payment_date`, `due_date`
- `academic_year`, `term`
- `school_id`, `branch_id`

---

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Create Remita Configuration Table
```sql
CREATE TABLE IF NOT EXISTS remita_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  merchant_id VARCHAR(100) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  service_type_id VARCHAR(100) NOT NULL,
  is_production BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_school_remita (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 1.2 Create Remita Transactions Table
```sql
CREATE TABLE IF NOT EXISTS remita_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_ref VARCHAR(50) UNIQUE NOT NULL,
  rrr VARCHAR(50) UNIQUE,
  admission_no VARCHAR(50) NOT NULL,
  parent_id VARCHAR(25) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payer_name VARCHAR(100) NOT NULL,
  payer_email VARCHAR(100),
  payer_phone VARCHAR(20) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  term VARCHAR(20) NOT NULL,
  payment_purpose VARCHAR(200),
  remita_status_code VARCHAR(10) DEFAULT '025',
  remita_status_message VARCHAR(100),
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_date TIMESTAMP NULL,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20) NOT NULL,
  line_items JSON,
  INDEX idx_admission (admission_no),
  INDEX idx_parent (parent_id),
  INDEX idx_rrr (rrr),
  INDEX idx_status (remita_status_code),
  FOREIGN KEY (admission_no) REFERENCES students(admission_no),
  FOREIGN KEY (parent_id) REFERENCES parents(parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 1.3 Add Remita Fields to payment_entries
```sql
ALTER TABLE payment_entries 
ADD COLUMN remita_rrr VARCHAR(50) NULL AFTER ref_no,
ADD COLUMN remita_payment_ref VARCHAR(50) NULL AFTER remita_rrr,
ADD INDEX idx_remita_rrr (remita_rrr);
```

---

### Phase 2: Backend Implementation

#### 2.1 Configuration Module (`src/config/remita.config.js`)
```javascript
module.exports = {
  getSchoolConfig: async (schoolId) => {
    // Fetch from remita_config table
    const config = await db.query(
      'SELECT * FROM remita_config WHERE school_id = ?',
      [schoolId]
    );
    
    return {
      merchantId: config.merchant_id,
      apiKey: config.api_key,
      serviceTypeId: config.service_type_id,
      gatewayUrl: config.is_production 
        ? 'https://login.remita.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit'
        : 'https://remitademo.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit'
    };
  }
};
```

#### 2.2 Remita Service (`src/services/remita.service.js`)
```javascript
const crypto = require('crypto');
const axios = require('axios');

class RemitaService {
  generatePaymentRef() {
    const prefix = 'SF' + new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(10000000 + Math.random() * 90000000);
    return prefix + random;
  }

  generateHash(merchantId, serviceTypeId, orderId, amount, apiKey) {
    const hashString = merchantId + serviceTypeId + orderId + amount + apiKey;
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  async generateRRR(config, paymentData) {
    const hash = this.generateHash(
      config.merchantId,
      config.serviceTypeId,
      paymentData.paymentRef,
      paymentData.amount,
      config.apiKey
    );

    const payload = {
      serviceTypeId: config.serviceTypeId,
      amount: paymentData.amount,
      hash: hash,
      orderId: paymentData.paymentRef,
      payerName: paymentData.payerName,
      payerEmail: paymentData.payerEmail,
      payerPhone: paymentData.payerPhone,
      lineItems: paymentData.lineItems
    };

    const response = await axios.post(config.gatewayUrl, payload, {
      headers: {
        'Authorization': `remitaConsumerKey=${config.merchantId},remitaConsumerToken=${hash}`,
        'Content-Type': 'application/json'
      }
    });

    // Parse JSONP response
    let data;
    const jsonpMatch = response.data.match(/jsonp\s*\((.*)\)/);
    if (jsonpMatch) {
      data = JSON.parse(jsonpMatch[1]);
    } else {
      data = response.data;
    }

    return {
      success: true,
      rrr: data.RRR.trim(),
      statusCode: data.statuscode,
      status: data.status
    };
  }

  async verifyPayment(config, rrr) {
    const hash = crypto.createHash('sha512')
      .update(rrr + config.apiKey + config.merchantId)
      .digest('hex');

    const verifyUrl = config.is_production
      ? `https://login.remita.net/remita/ecomm/${config.merchantId}/${rrr}/${hash}/status.reg`
      : `https://remitademo.net/remita/ecomm/${config.merchantId}/${rrr}/${hash}/status.reg`;

    const response = await axios.get(verifyUrl);
    return response.data;
  }
}

module.exports = new RemitaService();
```

#### 2.3 Payment Controller (`src/controllers/payment.controller.js`)
```javascript
const remitaService = require('../services/remita.service');
const remitaConfig = require('../config/remita.config');

exports.getStudentPendingFees = async (req, res) => {
  const { admissionNo } = req.params;
  
  // Get student details
  const student = await db.query(
    `SELECT s.*, p.fullname as parent_name, p.email as parent_email, 
            p.phone as parent_phone, p.parent_id
     FROM students s
     LEFT JOIN parents p ON s.parent_id = p.parent_id
     WHERE s.admission_no = ?`,
    [admissionNo]
  );

  // Get pending payment entries
  const pendingFees = await db.query(
    `SELECT * FROM payment_entries 
     WHERE admission_no = ? 
     AND payment_status = 'Pending'
     AND academic_year = ?
     AND term = ?`,
    [admissionNo, student.academic_year, currentTerm]
  );

  res.json({
    student: student,
    pendingFees: pendingFees,
    totalAmount: pendingFees.reduce((sum, fee) => sum + parseFloat(fee.dr), 0)
  });
};

exports.generateRRRForStudent = async (req, res) => {
  const { admissionNo, selectedItems, payerInfo } = req.body;
  
  // Get student and school details
  const student = await db.query(
    'SELECT * FROM students WHERE admission_no = ?',
    [admissionNo]
  );

  // Get school Remita configuration
  const config = await remitaConfig.getSchoolConfig(student.school_id);

  // Calculate total amount from selected payment items
  const items = await db.query(
    'SELECT * FROM payment_entries WHERE item_id IN (?)',
    [selectedItems]
  );
  
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.dr), 0);

  // Generate payment reference
  const paymentRef = remitaService.generatePaymentRef();

  // Prepare line items for split payment
  const lineItems = [
    {
      lineItemsId: `BNB1${Date.now()}`,
      beneficiaryName: "SCHOOL REVENUE ACCOUNT",
      beneficiaryAccount: config.schoolAccount,
      bankCode: config.schoolBankCode,
      beneficiaryAmount: totalAmount - 500, // Minus platform fee
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

  // Generate RRR
  const result = await remitaService.generateRRR(config, {
    paymentRef,
    amount: totalAmount,
    payerName: payerInfo.name,
    payerEmail: payerInfo.email,
    payerPhone: payerInfo.phone,
    lineItems
  });

  if (result.success) {
    // Save to remita_transactions
    await db.query(
      `INSERT INTO remita_transactions 
       (payment_ref, rrr, admission_no, parent_id, amount, payer_name, 
        payer_email, payer_phone, academic_year, term, payment_purpose, 
        remita_status_code, remita_status_message, school_id, branch_id, line_items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentRef, result.rrr, admissionNo, student.parent_id, totalAmount,
        payerInfo.name, payerInfo.email, payerInfo.phone, student.academic_year,
        currentTerm, 'School Fees Payment', result.statusCode, result.status,
        student.school_id, student.branch_id, JSON.stringify(lineItems)
      ]
    );

    // Update payment_entries with RRR
    await db.query(
      `UPDATE payment_entries 
       SET remita_rrr = ?, remita_payment_ref = ?
       WHERE item_id IN (?)`,
      [result.rrr, paymentRef, selectedItems]
    );

    res.json({
      success: true,
      rrr: result.rrr,
      paymentRef: paymentRef,
      amount: totalAmount,
      paymentUrl: `https://remitademo.net/remita/ecomm/finalize.reg?merchantId=${config.merchantId}&rrr=${result.rrr}`
    });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
};

exports.verifyPayment = async (req, res) => {
  const { rrr } = req.params;

  // Get transaction details
  const transaction = await db.query(
    'SELECT * FROM remita_transactions WHERE rrr = ?',
    [rrr]
  );

  // Get school config
  const config = await remitaConfig.getSchoolConfig(transaction.school_id);

  // Verify with Remita
  const verification = await remitaService.verifyPayment(config, rrr);

  if (verification.status === '00' || verification.status === '01') {
    // Update remita_transactions
    await db.query(
      `UPDATE remita_transactions 
       SET remita_status_code = ?, remita_status_message = ?, verification_date = NOW()
       WHERE rrr = ?`,
      [verification.status, 'Successful', rrr]
    );

    // Update payment_entries
    await db.query(
      `UPDATE payment_entries 
       SET payment_status = 'Paid', payment_date = NOW()
       WHERE remita_rrr = ?`,
      [rrr]
    );

    // Create payment receipt
    await db.query(
      `INSERT INTO payment_receipts 
       (receipt_no, admission_no, amount, payment_method, payment_ref, school_id, branch_id)
       VALUES (?, ?, ?, 'Remita', ?, ?, ?)`,
      [
        'RCP' + Date.now(),
        transaction.admission_no,
        transaction.amount,
        transaction.payment_ref,
        transaction.school_id,
        transaction.branch_id
      ]
    );

    res.json({ success: true, message: 'Payment verified successfully' });
  } else {
    res.json({ success: false, message: 'Payment not successful' });
  }
};
```

---

### Phase 3: API Routes

#### 3.1 Routes (`src/routes/payment.routes.js`)
```javascript
const router = require('express').Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth');

// Get student pending fees
router.get('/student/:admissionNo/pending-fees', 
  authenticate, 
  paymentController.getStudentPendingFees
);

// Generate RRR for payment
router.post('/generate-rrr', 
  authenticate, 
  paymentController.generateRRRForStudent
);

// Verify payment
router.get('/verify/:rrr', 
  authenticate, 
  paymentController.verifyPayment
);

// Webhook for Remita callback
router.post('/remita/webhook', 
  paymentController.handleRemitaWebhook
);

module.exports = router;
```

---

### Phase 4: Frontend Implementation

#### 4.1 Parent Dashboard - View Children's Fees
```javascript
// Component: ParentDashboard.jsx
const ParentDashboard = () => {
  const [children, setChildren] = useState([]);
  
  useEffect(() => {
    // Fetch parent's children
    fetch(`/api/parents/${parentId}/children`)
      .then(res => res.json())
      .then(data => setChildren(data));
  }, []);

  return (
    <div>
      <h2>My Children</h2>
      {children.map(child => (
        <ChildCard 
          key={child.admission_no}
          student={child}
          onPayFees={() => navigateToPayment(child.admission_no)}
        />
      ))}
    </div>
  );
};
```

#### 4.2 Payment Selection Page
```javascript
// Component: PaymentSelection.jsx
const PaymentSelection = ({ admissionNo }) => {
  const [pendingFees, setPendingFees] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetch(`/api/payment/student/${admissionNo}/pending-fees`)
      .then(res => res.json())
      .then(data => setPendingFees(data.pendingFees));
  }, []);

  const handleGenerateRRR = async () => {
    const response = await fetch('/api/payment/generate-rrr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admissionNo,
        selectedItems,
        payerInfo: {
          name: parentName,
          email: parentEmail,
          phone: parentPhone
        }
      })
    });

    const result = await response.json();
    if (result.success) {
      // Redirect to Remita payment page
      window.location.href = result.paymentUrl;
    }
  };

  return (
    <div>
      <h3>Select Fees to Pay</h3>
      {pendingFees.map(fee => (
        <FeeItem 
          key={fee.item_id}
          fee={fee}
          onSelect={(id) => setSelectedItems([...selectedItems, id])}
        />
      ))}
      <button onClick={handleGenerateRRR}>
        Pay ₦{calculateTotal(selectedItems)}
      </button>
    </div>
  );
};
```

---

### Phase 5: Workflow Summary

1. **Parent Login** → View children linked to their `parent_id`
2. **Select Child** → View pending fees from `payment_entries` table
3. **Select Fees** → Choose which fees to pay (can be multiple)
4. **Generate RRR** → System creates:
   - Payment reference
   - Remita RRR via API
   - Record in `remita_transactions`
   - Updates `payment_entries` with RRR
5. **Redirect to Remita** → Parent completes payment on Remita portal
6. **Callback/Webhook** → Remita notifies system of payment status
7. **Verification** → System verifies payment with Remita API
8. **Update Records** → 
   - Mark `payment_entries` as 'Paid'
   - Update `remita_transactions` status
   - Generate receipt in `payment_receipts`

---

### Phase 6: Additional Features

#### 6.1 Payment History
```sql
-- Query for parent to view payment history
SELECT 
  rt.payment_ref,
  rt.rrr,
  s.student_name,
  rt.amount,
  rt.payment_purpose,
  rt.transaction_date,
  rt.remita_status_message
FROM remita_transactions rt
JOIN students s ON rt.admission_no = s.admission_no
WHERE rt.parent_id = ?
ORDER BY rt.transaction_date DESC;
```

#### 6.2 Email Notifications
- Send RRR to parent's email after generation
- Send payment confirmation after successful payment
- Send receipt via email

#### 6.3 SMS Notifications
- Send RRR via SMS
- Send payment confirmation via SMS

---

## Security Considerations

1. **API Key Protection**: Store in environment variables, never expose to frontend
2. **Hash Validation**: Always validate Remita responses
3. **Authentication**: Ensure only authenticated parents can generate RRR
4. **Authorization**: Parents can only pay for their own children
5. **Amount Validation**: Verify amounts match before generating RRR
6. **Webhook Security**: Validate webhook requests from Remita

---

## Testing Checklist

- [ ] Test RRR generation with demo credentials
- [ ] Test payment verification
- [ ] Test webhook handling
- [ ] Test parent can only see their children
- [ ] Test multiple fee items selection
- [ ] Test payment status updates
- [ ] Test receipt generation
- [ ] Test email/SMS notifications

---

## Deployment Steps

1. Run database migrations
2. Configure Remita credentials for each school
3. Update environment variables
4. Deploy backend changes
5. Deploy frontend changes
6. Test with demo environment
7. Switch to production after successful testing

---

## Support & Maintenance

- Monitor failed transactions
- Handle payment disputes
- Reconcile payments with Remita
- Generate financial reports
- Handle refunds if needed
