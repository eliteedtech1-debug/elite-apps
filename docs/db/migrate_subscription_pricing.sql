-- Migrate subscription_pricing table to simplified structure
-- This script will transform the existing table to the new simplified structure

-- STEP 1: Create a temporary table with the new structure
CREATE TABLE subscription_pricing_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pricing_name VARCHAR(255) NOT NULL,
    base_price_per_student DECIMAL(10, 2) NOT NULL, -- Using annual price as primary price
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

-- STEP 2: Migrate data from old table to new table using annual values as primary
INSERT INTO subscription_pricing_new (
    id,
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
    id,
    pricing_name,
    base_price_per_student_annum as base_price_per_student,  -- Using annual as primary
    annual_discount_percentage as discount_per_annum,
    cbt_stand_alone_cost_annum as cbt_stand_alone_cost,
    sms_subscription_cost_annum as sms_subscription_cost,
    whatsapp_subscription_cost_annum as whatsapp_subscription_cost,
    email_subscription_cost_annum as email_subscription_cost,
    express_finance_cost_annum as express_finance_cost,
    is_active,
    created_at,
    updated_at
FROM subscription_pricing;

-- STEP 3: Drop the foreign key constraint in subscription_plan_features if it exists
-- This is needed to allow us to drop the old table
ALTER TABLE subscription_plan_features 
DROP FOREIGN KEY subscription_plan_features_ibfk_1;

-- STEP 4: Drop the old subscription_pricing table
DROP TABLE subscription_pricing;

-- STEP 5: Rename the new table to the original name
ALTER TABLE subscription_pricing_new RENAME TO subscription_pricing;

-- STEP 6: Recreate the foreign key constraint
ALTER TABLE subscription_plan_features 
ADD CONSTRAINT subscription_plan_features_ibfk_1 
FOREIGN KEY (pricing_plan_id) REFERENCES subscription_pricing(id) ON DELETE CASCADE;

-- STEP 7: Add necessary indexes
ALTER TABLE subscription_plan_features ADD INDEX idx_pricing_plan_id (pricing_plan_id);

-- STEP 8: Verify the migration by showing the new table structure
DESCRIBE subscription_pricing;

-- STEP 9: Show sample data to confirm successful migration
SELECT * FROM subscription_pricing LIMIT 10;