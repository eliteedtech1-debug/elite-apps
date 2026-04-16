# Bank Account Integration Guide for Invoices

## Overview
This guide shows how to integrate bank account details into student invoices and family invoices.

## Helper Functions Available

**File**: `backend/src/utils/bankAccountsHelper.js`

### Functions:

1. **getDefaultBankAccount(school_id, branch_id)**
   - Returns the default bank account for a school
   - Returns `null` if no default account found

2. **getActiveBankAccounts(school_id, branch_id)**
   - Returns all active bank accounts
   - Sorted by default first, then by creation date

3. **formatBankDetailsForInvoice(account)**
   - Formats bank account object for invoice display
   - Returns formatted object with clean property names

## Integration Steps

### Step 1: Import Helper Functions

At the top of your invoice generation file:

```javascript
const { getDefaultBankAccount, formatBankDetailsForInvoice } = require('../utils/bankAccountsHelper');
```

### Step 2: Fetch Bank Account in Invoice Controller

In your invoice generation function (before PDF generation):

```javascript
// Example: In student invoice controller
const generateInvoice = async (req, res) => {
  const { student_id, school_id, branch_id } = req.body;

  try {
    // ... existing code to fetch student and invoice data ...

    // Fetch default bank account
    const bankAccount = await getDefaultBankAccount(school_id, branch_id);
    const bankDetails = formatBankDetailsForInvoice(bankAccount);

    // ... continue with PDF generation ...

    // Pass bankDetails to PDF template
    const pdfData = {
      student: studentData,
      invoice: invoiceData,
      bankDetails: bankDetails, // Add this
      // ... other data ...
    };

    // Generate PDF with bank details
    const pdfBuffer = await generatePDFWithBankDetails(pdfData);

    res.json({
      success: true,
      pdf: pdfBuffer.toString('base64'),
      bankDetails: bankDetails // Include in response
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Step 3: Update PDF Template (React-PDF Example)

If using `@react-pdf/renderer`:

```jsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const InvoiceDocument = ({ invoice, student, bankDetails }) => (
  <Document>
    <Page style={styles.page}>
      {/* ... existing invoice content ... */}

      {/* Bank Details Section */}
      {bankDetails && (
        <View style={styles.bankSection}>
          <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>
          <View style={styles.divider} />

          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Bank Name:</Text>
            <Text style={styles.bankValue}>{bankDetails.bankName}</Text>
          </View>

          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Number:</Text>
            <Text style={styles.bankValue}>{bankDetails.accountNumber}</Text>
          </View>

          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Name:</Text>
            <Text style={styles.bankValue}>{bankDetails.accountName}</Text>
          </View>

          {bankDetails.bankCode && (
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Bank Code:</Text>
              <Text style={styles.bankValue}>{bankDetails.bankCode}</Text>
            </View>
          )}

          {bankDetails.swiftCode && (
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>SWIFT Code:</Text>
              <Text style={styles.bankValue}>{bankDetails.swiftCode}</Text>
            </View>
          )}
        </View>
      )}

      {/* No bank details message */}
      {!bankDetails && (
        <View style={styles.noBankSection}>
          <Text style={styles.warningText}>
            Please contact the school office for payment details.
          </Text>
        </View>
      )}
    </Page>
  </Document>
);

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  bankSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    border: '1px solid #dee2e6',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  divider: {
    borderBottom: '1px solid #dee2e6',
    marginBottom: 10,
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bankLabel: {
    width: '40%',
    fontWeight: 'bold',
    color: '#555',
  },
  bankValue: {
    width: '60%',
    color: '#333',
  },
  noBankSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
  },
  warningText: {
    color: '#856404',
    textAlign: 'center',
  },
});
```

### Step 4: Update HTML Invoice Template (Alternative)

If using HTML-to-PDF conversion:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .bank-details {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }
    .bank-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 5px;
    }
    .bank-row {
      display: flex;
      margin-bottom: 8px;
    }
    .bank-label {
      width: 40%;
      font-weight: bold;
      color: #555;
    }
    .bank-value {
      width: 60%;
      color: #333;
    }
    .no-bank-warning {
      margin-top: 30px;
      padding: 15px;
      background-color: #fff3cd;
      border-radius: 8px;
      text-align: center;
      color: #856404;
    }
  </style>
</head>
<body>
  <!-- ... existing invoice content ... -->

  <!-- Bank Details Section -->
  {{#if bankDetails}}
  <div class="bank-details">
    <div class="bank-title">PAYMENT DETAILS</div>

    <div class="bank-row">
      <div class="bank-label">Bank Name:</div>
      <div class="bank-value">{{bankDetails.bankName}}</div>
    </div>

    <div class="bank-row">
      <div class="bank-label">Account Number:</div>
      <div class="bank-value">{{bankDetails.accountNumber}}</div>
    </div>

    <div class="bank-row">
      <div class="bank-label">Account Name:</div>
      <div class="bank-value">{{bankDetails.accountName}}</div>
    </div>

    {{#if bankDetails.bankCode}}
    <div class="bank-row">
      <div class="bank-label">Bank Code:</div>
      <div class="bank-value">{{bankDetails.bankCode}}</div>
    </div>
    {{/if}}

    {{#if bankDetails.swiftCode}}
    <div class="bank-row">
      <div class="bank-label">SWIFT Code:</div>
      <div class="bank-value">{{bankDetails.swiftCode}}</div>
    </div>
    {{/if}}
  </div>
  {{else}}
  <div class="no-bank-warning">
    Please contact the school office for payment details.
  </div>
  {{/if}}
</body>
</html>
```

## Example Files to Update

### 1. Student Invoice Generation

**Likely files**:
- `backend/src/controllers/studentPayment.js`
- `backend/src/controllers/studentPaymentEnhanced.js`
- `backend/src/services/invoiceGenerator.js`
- Any PDF generation service for student invoices

**Integration**:
```javascript
// In student invoice controller
const { getDefaultBankAccount, formatBankDetailsForInvoice } = require('../utils/bankAccountsHelper');

// ... in your invoice generation function
const school_id = req.user.school_id || req.headers['x-school-id'];
const branch_id = req.user.branch_id || req.headers['x-branch-id'];

const bankAccount = await getDefaultBankAccount(school_id, branch_id);
const bankDetails = formatBankDetailsForInvoice(bankAccount);

// Pass to PDF generator
generatePDF({ ...invoiceData, bankDetails });
```

### 2. Family Invoice Generation

**Likely files**:
- `backend/src/controllers/family_billing.js`
- `backend/src/routes/family_billing.js`
- Family billing PDF generator

**Integration**: Same as student invoice (shown above)

### 3. Email Invoice Templates

If invoices are sent via email, update email templates:

```javascript
// In email service
const emailTemplate = `
  <h2>Invoice Details</h2>
  <!-- ... invoice details ... -->

  <h3>Payment Details</h3>
  <table>
    <tr>
      <td><strong>Bank Name:</strong></td>
      <td>${bankDetails.bankName}</td>
    </tr>
    <tr>
      <td><strong>Account Number:</strong></td>
      <td>${bankDetails.accountNumber}</td>
    </tr>
    <tr>
      <td><strong>Account Name:</strong></td>
      <td>${bankDetails.accountName}</td>
    </tr>
    ${bankDetails.bankCode ? `
    <tr>
      <td><strong>Bank Code:</strong></td>
      <td>${bankDetails.bankCode}</td>
    </tr>
    ` : ''}
  </table>
`;
```

## Testing

### 1. Test Data Setup

```sql
-- Insert test bank account
INSERT INTO school_bank_accounts
(school_id, branch_id, account_name, account_number, bank_name, bank_code, is_default, status)
VALUES
('SCH/1', 'default', 'Elite Core Academy', '0123456789', 'First Bank of Nigeria', '011', 1, 'Active');
```

### 2. Test Invoice Generation

```bash
# Generate invoice and check bank details appear
curl -X POST http://localhost:34567/api/generate-invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "student_id": "123",
    "school_id": "SCH/1"
  }'
```

### 3. Verify PDF Output

- Check that bank details section appears
- Verify all fields are populated correctly
- Confirm formatting is clean and readable
- Test with and without optional fields (bank_code, swift_code)

## Troubleshooting

### Bank Details Not Showing

**Check**:
1. Is there a default bank account?
   ```sql
   SELECT * FROM school_bank_accounts WHERE school_id = 'SCH/1' AND is_default = 1;
   ```

2. Is the account status 'Active'?

3. Is the helper function returning data?
   ```javascript
   console.log('Bank Details:', bankDetails);
   ```

### Wrong Bank Account Showing

**Check**:
1. Multiple default accounts? (should only be one)
   ```sql
   SELECT COUNT(*) FROM school_bank_accounts WHERE school_id = 'SCH/1' AND is_default = 1;
   ```

2. Branch filtering working correctly?

### Styling Issues

- Check CSS/styles for bankSection
- Verify React-PDF version compatibility
- Test PDF rendering in different viewers

## Quick Integration Checklist

- [ ] Import helper functions
- [ ] Fetch bank account in controller
- [ ] Pass bank details to PDF generator
- [ ] Update PDF template to include bank section
- [ ] Handle case when no bank account exists
- [ ] Test with active bank account
- [ ] Test without bank account
- [ ] Test with partial bank details (optional fields)
- [ ] Verify formatting in PDF output
- [ ] Test email templates if applicable

## Support

If you need help integrating:
1. Check the helper function is working: `getDefaultBankAccount(school_id)`
2. Verify bank account exists in database
3. Check PDF template syntax
4. Review console logs for errors

---

**Note**: The exact integration will depend on your current invoice generation implementation. Adapt the examples above to match your codebase structure.
