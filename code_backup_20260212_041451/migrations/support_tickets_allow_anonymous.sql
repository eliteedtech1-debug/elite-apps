-- Migration: Allow anonymous users to create support tickets
-- This allows users on login page or not logged in to create tickets

-- Step 1: Add anonymous user fields
ALTER TABLE `support_tickets`
ADD COLUMN `anonymous_name` VARCHAR(255) NULL AFTER `user_id`,
ADD COLUMN `anonymous_email` VARCHAR(255) NULL AFTER `anonymous_name`,
ADD COLUMN `anonymous_phone` VARCHAR(255) NULL AFTER `anonymous_email`;

-- Step 2: Modify user_id to allow NULL (allow anonymous tickets)
ALTER TABLE `support_tickets`
MODIFY COLUMN `user_id` INT NULL;

-- Step 3: Add comment to explain the fields
ALTER TABLE `support_tickets`
COMMENT = 'Support tickets table - user_id can be NULL for anonymous users. Use anonymous_* fields to contact them.';

-- Verification query
-- Run this to check the table structure after migration:
-- DESCRIBE support_tickets;

-- Sample anonymous ticket creation test:
-- INSERT INTO support_tickets (title, description, category, priority, status, anonymous_name, anonymous_email, anonymous_phone, created_at, updated_at)
-- VALUES ('Test Anonymous Ticket', 'Testing anonymous ticket creation', 'technical', 'medium', 'open', 'Test User', 'test@example.com', '1234567890', NOW(), NOW());
