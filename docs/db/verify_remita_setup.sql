-- =====================================================
-- Remita Configuration Verification for SCH/20
-- Date: 2026-02-07
-- =====================================================

-- 1. Check Gateway Configuration
SELECT 
  config_id,
  school_id,
  gateway_name,
  is_active,
  is_test_mode,
  school_payment_integration,
  JSON_EXTRACT(config_data, '$.environment') as environment,
  JSON_EXTRACT(config_data, '$.public_key') as public_key,
  JSON_EXTRACT(config_data, '$.merchant_id') as merchant_id,
  created_at
FROM payment_gateway_config 
WHERE school_id = 'SCH/20';

-- 2. Check if staff exist for testing
SELECT 
  id, staff_id, name, email, phone, school_id
FROM staff 
WHERE school_id = 'SCH/20' 
LIMIT 5;

-- 3. Check recent payroll records
SELECT 
  payroll_line_id, staff_id, period_month, 
  net_pay, payment_method, gateway_name,
  payment_status, disbursement_status
FROM payroll_lines 
WHERE school_id = 'SCH/20' 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check payment gateway transactions
SELECT 
  transaction_id, gateway_name, reference,
  amount, status, created_at
FROM payment_gateway_transactions 
WHERE school_id = 'SCH/20' 
ORDER BY created_at DESC 
LIMIT 5;
