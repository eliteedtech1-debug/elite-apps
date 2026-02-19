-- Migration to convert existing subscription_plan_features table to JSON structure
-- This script will preserve existing data while converting to the new JSON format

-- First, backup the existing table (optional but recommended)
-- CREATE TABLE subscription_plan_features_backup AS SELECT * FROM subscription_plan_features;

-- Modify the table to use JSON for features instead of individual columns
-- If the table already exists with the old structure, we need to recreate it properly
-- and migrate the data

-- Since we're changing the structure, we'll recreate the table appropriately
-- First, drop the existing table if needed
-- DROP TABLE IF EXISTS subscription_plan_features_new;

-- Create new table with JSON structure
CREATE TABLE IF NOT EXISTS subscription_plan_features_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_plan_id INT NOT NULL,
    features JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pricing_plan_id) REFERENCES subscription_pricing(id) ON DELETE CASCADE,
    INDEX idx_pricing_plan_id (pricing_plan_id)
);

-- Migrate data from old structure (if exists) to new JSON structure
INSERT INTO subscription_plan_features_new (pricing_plan_id, features)
SELECT 
    pricing_plan_id,
    JSON_OBJECT(
        'result_station', COALESCE(result_station, 0),
        'nursery_section', COALESCE(nursery_section, 0),
        'primary_section', COALESCE(primary_section, 0),
        'junior_secondary_section', COALESCE(junior_secondary_section, 0),
        'senior_secondary_section', COALESCE(senior_secondary_section, 0),
        'islamiyya', COALESCE(islamiyya, 0),
        'tahfiz', COALESCE(tahfiz, 0),
        'cbt_stand_alone', COALESCE(cbt_stand_alone, 0),
        'sms_subscription', COALESCE(sms_subscription, 0),
        'whatsapp_subscription', COALESCE(whatsapp_subscription, 0),
        'email_subscription', COALESCE(email_subscription, 0),
        'assessment_type', COALESCE(assessment_type, 'Fixed')
    ) AS features
FROM subscription_plan_features
ON DUPLICATE KEY UPDATE
    features = VALUES(features);

-- Drop the old table
DROP TABLE subscription_plan_features;

-- Rename the new table to the original name
RENAME TABLE subscription_plan_features_new TO subscription_plan_features;