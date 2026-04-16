-- Fix Bank Account Default Setting for Yazid Memorial Academy
-- This script sets Elite Academy as the default bank account

-- Step 1: Check current state (for verification)
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
WHERE school_id = 'YMA'
ORDER BY created_at DESC;

-- Step 2: Reset all defaults for YMA (ensure only one default)
UPDATE school_bank_accounts
SET is_default = 0
WHERE school_id = 'YMA';

-- Step 3: Set Elite Academy as default and ensure it's Active
UPDATE school_bank_accounts
SET
  is_default = 1,
  status = 'Active'
WHERE school_id = 'YMA'
  AND (
    account_name LIKE '%Elite Academy%'
    OR bank_name LIKE '%Access%'
  )
LIMIT 1;

-- Step 4: Verify the fix worked
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
WHERE school_id = 'YMA';

-- Expected result: You should see ONE row with is_default = 1 and status = 'Active'

-- Optional: Check for all schools (if you want to fix for multiple schools)
/*
SELECT
  school_id,
  COUNT(*) as total_accounts,
  SUM(CASE WHEN is_default = 1 THEN 1 ELSE 0 END) as default_accounts
FROM school_bank_accounts
GROUP BY school_id
HAVING default_accounts = 0;
*/

-- Note: After running this, refresh your browser and generate a new invoice
-- The bank details should now appear in the "PAYMENT DETAILS" section
