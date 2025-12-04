-- Add Multiple Bank Accounts for Testing
-- This script helps you add 2-3 bank accounts for a school to test the multi-account invoice display

-- Example: Add second bank account for SCH/18
INSERT INTO school_bank_accounts (
  school_id,
  branch_id,
  account_name,
  account_number,
  bank_name,
  bank_code,
  is_default,
  status,
  created_at,
  updated_at
) VALUES (
  'SCH/18',
  'BRCH00025',
  'Elite Academy Fees Account',
  '0123456789',
  'First Bank of Nigeria',
  '011',
  0, -- Not default (default is already set to Access Bank)
  'Active',
  NOW(),
  NOW()
);

-- Example: Add third bank account for SCH/18
INSERT INTO school_bank_accounts (
  school_id,
  branch_id,
  account_name,
  account_number,
  bank_name,
  bank_code,
  is_default,
  status,
  created_at,
  updated_at
) VALUES (
  'SCH/18',
  'BRCH00025',
  'Elite Academy Operations',
  '9876543210',
  'GTBank',
  '058',
  0, -- Not default
  'Active',
  NOW(),
  NOW()
);

-- Verify all active accounts for the school
SELECT
  id,
  bank_name,
  account_name,
  account_number,
  bank_code,
  is_default,
  status
FROM school_bank_accounts
WHERE school_id = 'SCH/18'
  AND branch_id = 'BRCH00025'
  AND status = 'Active'
ORDER BY is_default DESC, created_at DESC
LIMIT 3;

-- Expected output: 3 accounts
-- 1. Access Bank (is_default = 1) - Already exists
-- 2. First Bank of Nigeria (is_default = 0) - Just added
-- 3. GTBank (is_default = 0) - Just added
