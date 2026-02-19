-- Modify subscription_pricing table to simplify structure
-- Remove term/annual distinctions and add discount_per_annum column

-- Rename the existing table temporarily
ALTER TABLE subscription_pricing RENAME TO subscription_pricing_old;

-- Create the new simplified subscription_pricing table
CREATE TABLE subscription_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_name VARCHAR(255) NOT NULL,
    base_price_per_student DECIMAL(10, 2) NOT NULL, -- Combined price per student (annual)
    discount_per_annum DECIMAL(5, 2) DEFAULT 0, -- New column for annual discount
    cbt_stand_alone_cost DECIMAL(10, 2) DEFAULT 0,
    sms_subscription_cost DECIMAL(10, 2) DEFAULT 0,
    whatsapp_subscription_cost DECIMAL(10, 2) DEFAULT 0,
    email_subscription_cost DECIMAL(10, 2) DEFAULT 0,
    express_finance_cost DECIMAL(10, 2) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Migrate data from the old table to the new table
-- Using annual values as the new base prices since they're typically the main pricing model
INSERT INTO subscription_pricing (
    pricing_name,
    base_price_per_student,
    discount_per_annum,
    cbt_stand_alone_cost,
    sms_subscription_cost,
    whatsapp_subscription_cost,
    email_subscription_cost,
    express_finance_cost,
    is_active,
    created_at,
    updated_at
)
SELECT 
    pricing_name,
    base_price_per_student_annum as base_price_per_student,
    annual_discount_percentage as discount_per_annum,
    cbt_stand_alone_cost_annum as cbt_stand_alone_cost,
    sms_subscription_cost_annum as sms_subscription_cost,
    whatsapp_subscription_cost_annum as whatsapp_subscription_cost,
    email_subscription_cost_annum as email_subscription_cost,
    express_finance_cost_annum as express_finance_cost,
    is_active,
    created_at,
    updated_at
FROM subscription_pricing_old;

-- Drop the old table
DROP TABLE subscription_pricing_old;

-- Update the foreign key reference in subscription_plan_features table if needed
-- (This should remain the same since we're keeping the id primary key)

-- Update any related tables that might reference the old structure
-- This might include school_subscriptions table which references pricing plan