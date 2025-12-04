# Bank Details on Invoice - Debugging Guide

## Current Issue
API returns bank account data correctly, but bank details don't show on generated PDF invoices.

## API Verification ✅
```bash
curl 'http://localhost:34567/api/bank-accounts?school_id=SCH/18&branch_id=BRCH00025' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'X-School-Id: SCH/18' \
  -H 'X-Branch-Id: BRCH00025'

# Response: ✅ Working
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_id": "SCH/18",
      "branch_id": "BRCH00025",
      "account_name": "Elite Academy",
      "account_number": "089900",
      "bank_name": "Access Bank",
      "bank_code": "123",
      "is_default": 1,
      "status": "Active"
    }
  ]
}
```

## Changes Made

### 1. SWIFT Code Removed ✅
- Removed from form: `BankAccountsManagement.tsx`
- Removed from all PDF templates
- Backend still returns it but frontend doesn't display it

### 2. Balance Condition Removed ✅
- Bank details now show on ALL invoices (not just when balance > 0)

### 3. Multiple Accounts Support (1-3) ✅
- Fetches ALL active accounts (max 3)
- Displays in row format with 3 columns:
  - **Bank Name** (35% width)
  - **Account Name** (35% width)
  - **Account Number** (30% width, bold, colored)

### 4. Bank Code Column Removed ✅
- No longer displayed in invoices per your request

## Debugging Steps

### Step 1: Check Console Logs

Open browser DevTools (F12) → Console tab and visit:
```
http://localhost:3000/management/class-bill?class_code=CLS0445&term=Second%20Term&academic_year=2024/2025&class_name=Nursery%202%20A
```

**Expected Console Output:**
```
✅ 1 active bank account(s) loaded: [{...}]
```

**If you see this instead:**
```
ℹ️ No bank accounts configured
```
→ API call failed or returned empty array

### Step 2: Verify Network Request

1. Open DevTools → Network tab
2. Filter by "bank-accounts"
3. Look for: `GET /api/bank-accounts?school_id=SCH/18&branch_id=BRCH00025`
4. Check response status:
   - ✅ **200 OK** with data
   - ❌ **401/403** → Authentication issue
   - ❌ **404/500** → Backend error

### Step 3: Check PDF Generation Logs

When you generate an invoice, check console for:
```
📄 ReceiptPDF - bankAccount: null
📄 ReceiptPDF - bankAccounts: [{account_name: "Elite Academy", ...}]
📄 ReceiptPDF - accounts to display: [{account_name: "Elite Academy", ...}]
```

**If bankAccounts is empty `[]`:**
→ BillClasses.tsx is not passing the data correctly

**If you don't see these logs at all:**
→ PDF component is not being called

### Step 4: Verify State in BillClasses

Add this temporary debug code in BillClasses.tsx after line 381:

```typescript
console.log(`✅ ${activeAccounts.length} active bank account(s) loaded:`, activeAccounts);
console.log('Full response:', res.data); // Add this line
```

This will show exactly what data the API returned.

### Step 5: Check PDF Component Props

In BillClasses.tsx, find where ReceiptPDF is called (around line 502) and verify:

```typescript
<ReceiptPDF
  ...
  bankAccounts={bankAccounts}  // ← Should be array, not null
/>
```

Add temporary logging right before:
```typescript
console.log('🔍 Passing to PDF - bankAccounts:', bankAccounts);
```

## Common Issues & Fixes

### Issue 1: bankAccounts is always []
**Cause:** API call failed or returned no active accounts

**Fix:**
```sql
-- Check database
SELECT * FROM school_bank_accounts
WHERE school_id = 'SCH/18'
  AND branch_id = 'BRCH00025'
  AND status = 'Active';

-- If no results, make sure at least one account is Active
UPDATE school_bank_accounts
SET status = 'Active'
WHERE school_id = 'SCH/18' AND id = 1;
```

### Issue 2: Console shows data but PDF doesn't render
**Cause:** React PDF rendering issue or prop not passed correctly

**Fix:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Restart frontend dev server:
   ```bash
   cd elscholar-ui
   npm start
   ```

### Issue 3: "PAYMENT DETAILS" section doesn't appear at all
**Cause:** Condition `accounts && accounts.length > 0` evaluates to false

**Fix:**
Add this debug in PDF component (e.g., ReceiptPDF.jsx line 556):
```javascript
console.log('🔍 accounts check:', accounts, 'length:', accounts?.length);
```

### Issue 4: PDF generates but bank section is blank/white
**Cause:** Styling issue or map() not working in @react-pdf/renderer

**Fix:**
Check if the accounts.map() is actually rendering. The updated code should work, but if not, try:
```jsx
{accounts && accounts.length > 0 && accounts.map((account, index) => (
  <View key={`account-${index}`}>  {/* More specific key */}
    <Text>{account.bank_name}</Text>
  </View>
))}
```

## Quick Test Script

Create a test file: `test-bank-accounts.js`

```javascript
const accounts = [
  {
    bank_name: "Access Bank",
    account_name: "Elite Academy",
    account_number: "089900",
    is_default: 1,
    status: "Active"
  }
];

console.log('Test accounts:', accounts);
console.log('accounts && accounts.length > 0:', accounts && accounts.length > 0);
console.log('First account:', accounts[0]);

// Test the map
accounts.map((account, index) => {
  console.log(`Account ${index}:`, account.bank_name, account.account_number);
});
```

Run: `node test-bank-accounts.js`

## Expected Behavior

### When Everything Works:

1. **Page Load:**
   ```
   Console: ✅ 1 active bank account(s) loaded: [{...}]
   ```

2. **PDF Generation:**
   ```
   Console: 📄 ReceiptPDF - bankAccounts: [{...}]
   Console: 📄 ReceiptPDF - accounts to display: [{...}]
   ```

3. **PDF Display:**
   - "PAYMENT DETAILS" section appears
   - Header row with: Bank Name | Account Name | Account Number
   - One row per account (max 3)
   - Alternating row colors
   - Account number is bold and colored

## Final Layout

The invoice should show:

```
PAYMENT DETAILS
┌────────────────────────────────────────────────────┐
│ Bank Name    │ Account Name    │ Account Number   │  ← Blue/Green header
├────────────────────────────────────────────────────┤
│ Access Bank  │ Elite Academy   │ 089900          │  ← White background
├────────────────────────────────────────────────────┤
│ First Bank   │ Elite School    │ 1234567890      │  ← Gray background (if 2nd account)
└────────────────────────────────────────────────────┘

Please quote your child's name and admission number when making payment
```

## If Still Not Working

1. **Take a screenshot** of:
   - Browser console (showing all logs)
   - Network tab (showing API response)
   - The generated PDF

2. **Share the output** of:
   ```bash
   # Check database
   mysql -u root elite_yazid -e "SELECT * FROM school_bank_accounts WHERE school_id='SCH/18';"

   # Check API response
   curl 'http://localhost:34567/api/bank-accounts?school_id=SCH/18&branch_id=BRCH00025' \
     -H 'Authorization: Bearer YOUR_TOKEN' \
     -H 'X-School-Id: SCH/18'
   ```

3. **Verify these files were updated:**
   - `BillClasses.tsx` - Line 262, 367-392
   - `ReceiptPDF.jsx` - Lines 174-184, 555-597
   - `InvoicePDF.jsx` - Lines 174-184, 554-596
   - `FamilyInvoicePDF.tsx` - Lines 56-57, 297-304, 511-553

The issue is most likely either:
- API not returning data (check database)
- Frontend state not updating (check console logs)
- Props not being passed correctly (check PDF component logs)
