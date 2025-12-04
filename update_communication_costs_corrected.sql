-- Migration to update communication channel costs per unit based on plan tier
-- NOTE: For the current implementation, communication channel costs are handled in the frontend UI
-- with fixed values (SMS: ₦5/4.5/4.0, WhatsApp: ₦2.0/1.5/1.0, Email: ₦0 per unit).
-- However, we're updating the database to reflect correct unit costs for future flexibility.
-- 
-- SMS: Standard ₦5/unit, Premium ₦4.5/unit, Elite ₦4.0/unit
-- WhatsApp: Standard ₦2.0/unit, Premium ₦1.5/unit, Elite ₦1.0/unit
-- Email: All plans ₦0/unit
-- CBT: Fixed at ₦200/unit across all plans

-- Update Standard Plan (id=1) - with unit costs as base rates
UPDATE subscription_pricing 
SET 
    sms_subscription_cost_term = 5.00,
    whatsapp_subscription_cost_term = 2.00,
    email_subscription_cost_term = 0.00,
    sms_subscription_cost_annum = 15.00, -- 5.00 * 3 terms
    whatsapp_subscription_cost_annum = 6.00, -- 2.00 * 3 terms
    email_subscription_cost_annum = 0.00,
    cbt_stand_alone_cost_term = 200.00,  -- CBT per unit cost
    cbt_stand_alone_cost_annum = 600.00  -- CBT per unit cost * 3 terms
WHERE id = 1;

-- Update Premium Plan (id=2) - with unit costs as base rates
UPDATE subscription_pricing 
SET 
    sms_subscription_cost_term = 4.50,
    whatsapp_subscription_cost_term = 1.50,
    email_subscription_cost_term = 0.00,
    sms_subscription_cost_annum = 13.50, -- 4.50 * 3 terms
    whatsapp_subscription_cost_annum = 4.50, -- 1.50 * 3 terms
    email_subscription_cost_annum = 0.00,
    cbt_stand_alone_cost_term = 200.00,  -- CBT per unit cost (same across plans)
    cbt_stand_alone_cost_annum = 600.00  -- CBT per unit cost * 3 terms
WHERE id = 2;

-- Update Elite Plan (id=3) - with unit costs as base rates
UPDATE subscription_pricing 
SET 
    sms_subscription_cost_term = 4.00,
    whatsapp_subscription_cost_term = 1.00,
    email_subscription_cost_term = 0.00,
    sms_subscription_cost_annum = 12.00, -- 4.00 * 3 terms
    whatsapp_subscription_cost_annum = 3.00, -- 1.00 * 3 terms
    email_subscription_cost_annum = 0.00,
    cbt_stand_alone_cost_term = 200.00,  -- CBT per unit cost (same across plans)
    cbt_stand_alone_cost_annum = 600.00  -- CBT per unit cost * 3 terms
WHERE id = 3;

-- Note: For the current implementation, the frontend will use fixed unit costs rather than database values
-- for communication channels. The database values are updated for consistency and future flexibility.

-- Confirm the updates
SELECT * FROM subscription_pricing;