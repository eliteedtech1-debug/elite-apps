-- Create the subscription_pricing table
CREATE TABLE IF NOT EXISTS subscription_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_name VARCHAR(255) NOT NULL,
    base_price_per_student_term DECIMAL(10, 2) NOT NULL,
    base_price_per_student_annum DECIMAL(10, 2) NOT NULL,
    annual_discount_percentage DECIMAL(5, 2) DEFAULT 0,
    cbt_stand_alone_cost_term DECIMAL(10, 2) DEFAULT 0,
    sms_subscription_cost_term DECIMAL(10, 2) DEFAULT 0,
    whatsapp_subscription_cost_term DECIMAL(10, 2) DEFAULT 0,
    email_subscription_cost_term DECIMAL(10, 2) DEFAULT 0,
    express_finance_cost_term DECIMAL(10, 2) DEFAULT 0,
    cbt_stand_alone_cost_annum DECIMAL(10, 2) DEFAULT 0,
    sms_subscription_cost_annum DECIMAL(10, 2) DEFAULT 0,
    whatsapp_subscription_cost_annum DECIMAL(10, 2) DEFAULT 0,
    email_subscription_cost_annum DECIMAL(10, 2) DEFAULT 0,
    express_finance_cost_annum DECIMAL(10, 2) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the subscription_plan_features table
CREATE TABLE IF NOT EXISTS subscription_plan_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_plan_id INT NOT NULL,
    features JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pricing_plan_id) REFERENCES subscription_pricing(id) ON DELETE CASCADE,
    INDEX idx_pricing_plan_id (pricing_plan_id)
);

-- Insert default pricing plans
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
('Basic Plan', 500.00, 1500.00, 0.00, 500.00, 300.00, 300.00, 300.00, 1000.00, 1500.00, 900.00, 900.00, 900.00, 3000.00, 1),
('Standard Plan', 700.00, 2100.00, 0.00, 500.00, 300.00, 300.00, 300.00, 1000.00, 1500.00, 900.00, 900.00, 900.00, 3000.00, 1),
('Premium Plan', 1000.00, 3000.00, 0.00, 500.00, 300.00, 300.00, 300.00, 1000.00, 1500.00, 900.00, 900.00, 900.00, 3000.00, 1);

-- Insert default features for each plan
INSERT IGNORE INTO subscription_plan_features (pricing_plan_id, features)
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
)),
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
)),
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
));