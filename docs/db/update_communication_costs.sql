-- Migration to update communication channel costs per unit based on plan tier
-- SMS: Standard: ₦5/unit, Premium: ₦4.5/unit, Elite: ₦4.0/unit
-- WhatsApp: Standard: ₦2.0/unit, Premium: ₦1.5/unit, Elite: ₦1.0/unit
-- Email: All plans ₦0/unit
-- Note: The costs in the database will represent monthly costs which will be multiplied by terms

-- Update Standard Plan (id=1)
UPDATE subscription_pricing 
SET 
    sms_subscription_cost_term = 5.00,
    whatsapp_subscription_cost_term = 2.00,
    email_subscription_cost_term = 0.00,
    sms_subscription_cost_annum = 15.00, -- 5.00 * 3 terms
    whatsapp_subscription_cost_annum = 6.00, -- 2.00 * 3 terms
    email_subscription_cost_annum = 0.00
WHERE id = 1;

-- Update Premium Plan (id=2)
UPDATE subscription_pricing 
SET 
    sms_subscription_cost_term = 4.50,
    whatsapp_subscription_cost_term = 1.50,
    email_subscription_cost_term = 0.00,
    sms_subscription_cost_annum = 13.50, -- 4.50 * 3 terms
    whatsapp_subscription_cost_annum = 4.50, -- 1.50 * 3 terms
    email_subscription_cost_annum = 0.00
WHERE id = 2;

-- Update Elite Plan (id=3)
UPDATE subscription_pricing 
SET 
    sms_subscription_cost_term = 4.00,
    whatsapp_subscription_cost_term = 1.00,
    email_subscription_cost_term = 0.00,
    sms_subscription_cost_annum = 12.00, -- 4.00 * 3 terms
    whatsapp_subscription_cost_annum = 3.00, -- 1.00 * 3 terms
    email_subscription_cost_annum = 0.00
WHERE id = 3;

-- Update CBT costs to represent the per-unit rate (though this will be handled differently in the frontend)
-- The actual CBT cost per unit (₦200) will be handled in the UI, so we'll set these to placeholder values
-- since we're now using units * fixed rate in the UI (₦200 per unit)

-- Confirm the updates
SELECT * FROM subscription_pricing;