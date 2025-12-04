# Bank Details Not Showing on Invoice - Fix

## Problem

You have a bank account saved (Elite Academy, Access Bank, 089900, 123) but it's not appearing on the invoice PDF.

## Root Cause

The bank account exists in the database but is **not marked as default**. The `getDefaultBankAccount` API endpoint only returns accounts where `is_default = 1` AND `status = 'Active'`.

Looking at your bank accounts page, I can see "Elite AcademyDefault" in the account name, but the `is_default` flag in the database is likely set to `0`.

## Solution

### Option 1: Set as Default via UI (Recommended)

1. Go to `http://localhost:3000/management/finance/bank-accounts`
2. Find your "Elite Academy" account
3. Click the "Set as Default" toggle/switch
4. The account should now show with a "Default" badge
5. Generate a new invoice and verify bank details appear

### Option 2: Fix via SQL (If UI doesn't work)

Run this SQL query to manually set the account as default:

```sql
-- First, check current status
SELECT
  id,
  account_name,
  bank_name,
  account_number,
  is_default,
  status
FROM school_bank_accounts
WHERE school_id = 'YOUR_SCHOOL_ID';

-- If you see is_default = 0, fix it:
-- Step 1: Unset all defaults for this school
UPDATE school_bank_accounts
SET is_default = 0
WHERE school_id = 'YOUR_SCHOOL_ID';

-- Step 2: Set the Elite Academy account as default
UPDATE school_bank_accounts
SET is_default = 1, status = 'Active'
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND account_name = 'Elite Academy';

-- Verify the fix
SELECT
  id,
  account_name,
  bank_name,
  account_number,
  is_default,
  status
FROM school_bank_accounts
WHERE school_id = 'YOUR_SCHOOL_ID';
```

Replace `'YOUR_SCHOOL_ID'` with your actual school ID (e.g., 'YMA' for Yazid Memorial Academy).

### Option 3: Quick SQL Fix (One-liner)

```sql
UPDATE school_bank_accounts
SET is_default = 1, status = 'Active'
WHERE account_name LIKE '%Elite Academy%'
  AND bank_name LIKE '%Access%'
LIMIT 1;
```

## Verification Steps

After applying the fix:

### 1. Check API Response

Open browser console and check network tab when on class bill page:

```
Request: GET /api/bank-accounts/default?school_id=YMA&branch_id=...
Response should be:
{
  "success": true,
  "data": {
    "id": 1,
    "school_id": "YMA",
    "account_name": "Elite Academy",
    "account_number": "089900",
    "bank_name": "Access Bank",
    "bank_code": "123",
    "is_default": 1,
    "status": "Active"
  }
}
```

### 2. Check Frontend Console

Open browser console (F12) and look for:
```
✅ Default bank account loaded: {account_name: "Elite Academy", ...}
```

If you see:
```
ℹ️ No default bank account configured
```
Then the API is not returning a default account.

### 3. Generate Invoice

1. Go to class billing page
2. Generate any student invoice
3. Check the PDF
4. You should now see this section:

```
┌──────────────────────────────────────┐
│        PAYMENT DETAILS               │
├──────────────────────────────────────┤
│ Bank Name      │ Access Bank         │
│ Account Name   │ Elite Academy       │
│ Account Number │ 089900              │
│ Bank Code      │ 123                 │
├──────────────────────────────────────┤
│ ⓘ Please quote your child's name and│
│   admission number when making payment│
└──────────────────────────────────────┘
```

## Debugging Steps

If bank details still don't appear after setting as default:

### 1. Check Database Directly

```sql
SELECT * FROM school_bank_accounts WHERE school_id = 'YMA';
```

Look for:
- `is_default` should be `1` (not `0`)
- `status` should be `'Active'` (not `'Inactive'`)

### 2. Check API Endpoint

Test the API directly:

```bash
# Replace with your school_id
curl -H "x-school-id: YMA" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:34567/api/bank-accounts/default
```

Expected response:
```json
{
  "success": true,
  "data": {...}
}
```

If you get:
```json
{
  "success": false,
  "message": "No default bank account found"
}
```

Then the database query isn't finding the default account.

### 3. Check Frontend Request

In browser console, check the network tab for:

```
Request URL: http://localhost:34567/api/bank-accounts/default?school_id=YMA&branch_id=...
Request Headers:
  x-school-id: YMA
  x-branch-id: ... (if applicable)
  Authorization: Bearer ...
```

### 4. Common Issues

**Issue:** `is_default` is stored as string `"1"` instead of integer `1`
**Fix:**
```sql
UPDATE school_bank_accounts SET is_default = 1 WHERE is_default = '1';
```

**Issue:** Multiple accounts have `is_default = 1`
**Fix:**
```sql
-- Keep only the first one as default
UPDATE school_bank_accounts SET is_default = 0;
UPDATE school_bank_accounts SET is_default = 1
WHERE id = (SELECT MIN(id) FROM school_bank_accounts WHERE school_id = 'YMA');
```

**Issue:** Account exists but status is 'Inactive'
**Fix:**
```sql
UPDATE school_bank_accounts SET status = 'Active'
WHERE school_id = 'YMA' AND account_name = 'Elite Academy';
```

## Complete Fix SQL Script

```sql
-- Complete fix for Yazid Memorial Academy (YMA)
-- Adjust school_id as needed

-- Step 1: Check current state
SELECT
  id,
  school_id,
  account_name,
  bank_name,
  account_number,
  bank_code,
  is_default,
  status,
  created_at
FROM school_bank_accounts
WHERE school_id = 'YMA';

-- Step 2: Reset all defaults for this school
UPDATE school_bank_accounts
SET is_default = 0
WHERE school_id = 'YMA';

-- Step 3: Set Elite Academy as default and active
UPDATE school_bank_accounts
SET is_default = 1,
    status = 'Active'
WHERE school_id = 'YMA'
  AND account_name LIKE '%Elite Academy%';

-- Step 4: Verify the fix
SELECT
  id,
  school_id,
  account_name,
  bank_name,
  account_number,
  bank_code,
  is_default,
  status
FROM school_bank_accounts
WHERE school_id = 'YMA' AND is_default = 1;

-- Expected result: One row with is_default = 1 and status = 'Active'
```

## Quick Test Command

After applying the SQL fix, test immediately:

```bash
# Test the API endpoint
curl -X GET "http://localhost:34567/api/bank-accounts/default?school_id=YMA" \
  -H "Content-Type: application/json"

# Should return the Elite Academy bank account details
```

## Summary

**The issue:** Bank account exists but `is_default` flag is set to `0` instead of `1`

**The fix:** Set `is_default = 1` for your Elite Academy account

**Where to fix:**
1. **Best:** Use UI toggle in Bank Accounts Management page
2. **Backup:** Run SQL UPDATE query directly

**How to verify:** Generate new invoice and check for "PAYMENT DETAILS" section

---

**Files Modified:** None (only database update needed)
**SQL Query:** See "Complete Fix SQL Script" above
**Expected Result:** Bank details appear on all future invoices
