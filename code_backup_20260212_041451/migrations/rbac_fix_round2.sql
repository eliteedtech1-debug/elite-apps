-- RBAC Migration Fix - Round 2
-- Fixes the feature_id column issue in user_permission_overrides table

-- The table exists but uses 'permission_id' instead of 'feature_id'
-- Current structure has: user_id, permission_id, granted, conditions, etc.
-- Migration expects: user_id, feature_id

-- Option 1: Add feature_id column (if we need both)
-- ALTER TABLE `user_permission_overrides` 
-- ADD COLUMN `feature_id` int(11) NOT NULL AFTER `user_id`;

-- Option 2: Use existing permission_id as feature_id (recommended)
-- Update the migration to use permission_id instead of feature_id

-- Fix the index creation to use existing column:
ALTER TABLE `user_permission_overrides` 
ADD UNIQUE INDEX IF NOT EXISTS `unique_user_feature_override` (`user_id`, `permission_id`);

-- Note: The migration script should be updated to use 'permission_id' 
-- instead of 'feature_id' to match the existing production schema
