-- =====================================================
-- Remita API Configuration
-- Date: 2026-02-06
-- =====================================================

-- Remita Test/Demo Credentials
INSERT INTO `payment_gateway_config` 
  (`school_id`, `gateway_name`, `is_active`, `is_default`, `config_data`)
VALUES 
  ('SCH/20', 'remita', 1, 1, JSON_OBJECT(
    'merchant_id', '2547916',
    'api_key', '1946',
    'api_token', 'Q0dQMDAwMDAwMDAwMDAwMDAwMDA=',
    'service_type_id', '4430731',
    'environment', 'test',
    'base_url', 'https://remitademo.net/remita',
    'api_base_url', 'https://remitademo.net/remita/exapp/api/v1/send/api'
  ))
ON DUPLICATE KEY UPDATE
  `is_active` = 1,
  `is_default` = 1,
  `config_data` = JSON_OBJECT(
    'merchant_id', '2547916',
    'api_key', '1946',
    'api_token', 'Q0dQMDAwMDAwMDAwMDAwMDAwMDA=',
    'service_type_id', '4430731',
    'environment', 'test',
    'base_url', 'https://remitademo.net/remita',
    'api_base_url', 'https://remitademo.net/remita/exapp/api/v1/send/api'
  );

-- =====================================================
-- Remita API Endpoints Reference
-- =====================================================
-- Base URL (Test): https://remitademo.net/remita
-- Base URL (Live): https://login.remita.net/remita
--
-- Key Endpoints:
-- 1. Generate RRR: POST /exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit
-- 2. Payment Status: GET /exapp/api/v1/send/api/echannelsvc/merchant/api/paymentstatus/{rrr}/{merchantId}/{hash}
-- 3. Bulk Payment: POST /exapp/api/v1/send/api/rpgsvc/rpg/api/v2/bulk/payment
-- 4. Payment Status Check: GET /exapp/api/v1/send/api/rpgsvc/rpg/api/v2/bulk/payment/status/{batchId}
--
-- Authentication:
-- - Header: Authorization: remitaConsumerKey={merchantId},remitaConsumerToken={apiToken}
-- - Hash: SHA512(merchantId + serviceTypeId + orderId + totalAmount + apiKey)
-- =====================================================

ALTER TABLE payment_gateway_config 
ADD COLUMN is_test_mode TINYINT(1) DEFAULT 1
AFTER config_data
,
ADD COLUMN school_payment_integration ENUM('full', 'payroll_only') DEFAULT 'full' 
AFTER is_test_mode
;