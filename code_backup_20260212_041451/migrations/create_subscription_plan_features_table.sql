-- Create table for subscription plan features using JSON
CREATE TABLE IF NOT EXISTS subscription_plan_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_plan_id INT NOT NULL,
    features JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pricing_plan_id) REFERENCES subscription_pricing(id) ON DELETE CASCADE,
    INDEX idx_pricing_plan_id (pricing_plan_id)
);

-- Insert default configurations for basic, standard, and premium plans using JSON
-- Basic Plan (id=1) - Core features only
INSERT INTO subscription_plan_features (
    pricing_plan_id, 
    features
) VALUES (
    1,  -- pricing_plan_id (Basic)
    JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 0,
        'senior_secondary_section', 0,
        'islamiyya', 0,
        'tahfiz', 0,
        'cbt_stand_alone', 0,
        'sms_subscription', 0,
        'whatsapp_subscription', 0,
        'email_subscription', 0,
        'assessment_type', 'Fixed'
    )
);

-- Standard Plan (id=2) - More features
INSERT INTO subscription_plan_features (
    pricing_plan_id, 
    features
) VALUES (
    2,  -- pricing_plan_id (Standard)
    JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 1,
        'senior_secondary_section', 1,
        'islamiyya', 0,
        'tahfiz', 0,
        'cbt_stand_alone', 1,
        'sms_subscription', 0,
        'whatsapp_subscription', 0,
        'email_subscription', 0,
        'assessment_type', 'Monthly'
    )
);

-- Premium Plan (id=3) - All features
INSERT INTO subscription_plan_features (
    pricing_plan_id, 
    features
) VALUES (
    3,  -- pricing_plan_id (Premium)
    JSON_OBJECT(
        'result_station', 1,
        'nursery_section', 1,
        'primary_section', 1,
        'junior_secondary_section', 1,
        'senior_secondary_section', 1,
        'islamiyya', 1,
        'tahfiz', 1,
        'cbt_stand_alone', 1,
        'sms_subscription', 1,
        'whatsapp_subscription', 1,
        'email_subscription', 1,
        'assessment_type', 'Monthly'
    )
);

ALTER TABLE `subscription_payments` ADD `school_id` VARCHAR(20) NOT NULL AFTER `created_by`; 