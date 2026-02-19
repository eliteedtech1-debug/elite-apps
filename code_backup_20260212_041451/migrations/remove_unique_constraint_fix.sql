-- Remove the incorrect unique constraint on subscription_id from subscription_payments table
-- A single subscription can have multiple payments, so this constraint is invalid

ALTER TABLE subscription_payments DROP INDEX IF EXISTS subscription_id;