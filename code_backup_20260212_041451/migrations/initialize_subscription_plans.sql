-- Initial data for subscription pricing plans
-- This script creates the basic, standard, and premium plans

-- Insert default pricing plans if they don't exist
INSERT IGNORE INTO subscription_pricing (
    pricing_name, 
    base_price_per_student_term, 
    base_price_per_student_annum, 
    annual_discount_percentage,
    cbt_stand_alone_cost_term,
    sms_subscription_cost_term,
    whatsapp_subscription_cost_term,
    email_subscription_cost_term,
    express_finance_cost_term,
    cbt_stand_alone_cost_annum,
    sms_subscription_cost_annum,
    whatsapp_subscription_cost_annum,
    email_subscription_cost_annum,
    express_finance_cost_annum,
    is_active
) VALUES 
('Basic Plan', 500, 1500, 0, 500, 300, 300, 300, 1000, 1500, 900, 900, 900, 3000, 1),
('Standard Plan', 700, 2100, 0, 500, 300, 300, 300, 1000, 1500, 900, 900, 900, 3000, 1),
('Premium Plan', 1000, 3000, 0, 500, 300, 300, 300, 1000, 1500, 900, 900, 900, 3000, 1);

-- Update the JSON feature data for each plan
-- First check if the features already exist for these plans
INSERT INTO subscription_plan_features (pricing_plan_id, features)
VALUES 
(1, JSON_OBJECT(
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
))
ON DUPLICATE KEY UPDATE
    features = JSON_OBJECT(
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
    );

INSERT INTO subscription_plan_features (pricing_plan_id, features)
VALUES 
(2, JSON_OBJECT(
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
))
ON DUPLICATE KEY UPDATE
    features = JSON_OBJECT(
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
    );

INSERT INTO subscription_plan_features (pricing_plan_id, features)
VALUES 
(3, JSON_OBJECT(
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
))
ON DUPLICATE KEY UPDATE
    features = JSON_OBJECT(
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
    );