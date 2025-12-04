-- ============================================================
-- Fix Duplicate Messaging Packages
-- ============================================================
-- This script identifies and removes duplicate packages
-- from the messaging_packages table
-- ============================================================

-- Step 1: View duplicates
SELECT
  package_name,
  service_type,
  package_type,
  COUNT(*) as duplicate_count,
  GROUP_CONCAT(id) as package_ids
FROM messaging_packages
GROUP BY package_name, service_type, package_type
HAVING COUNT(*) > 1;

-- Step 2: Keep only one copy of each package (the one with lowest ID)
-- Delete duplicates while keeping the first occurrence

DELETE t1 FROM messaging_packages t1
INNER JOIN messaging_packages t2
WHERE
  t1.id > t2.id AND
  t1.package_name = t2.package_name AND
  t1.service_type = t2.service_type AND
  t1.package_type = t2.package_type;

-- Step 3: Verify - should return no rows if duplicates are removed
SELECT
  package_name,
  service_type,
  package_type,
  COUNT(*) as count
FROM messaging_packages
GROUP BY package_name, service_type, package_type
HAVING COUNT(*) > 1;

-- Step 4: View all remaining packages
SELECT
  id,
  package_name,
  service_type,
  package_type,
  messages_per_term,
  unit_cost,
  package_cost,
  is_active
FROM messaging_packages
ORDER BY service_type, package_type, messages_per_term;

-- ============================================================
-- Alternative: Clear all and re-insert clean data
-- ============================================================
-- Uncomment below if you want to start fresh

/*
-- Backup existing subscriptions (important!)
CREATE TABLE IF NOT EXISTS messaging_subscriptions_backup AS
SELECT * FROM messaging_subscriptions;

-- Clear packages (this will also clear related subscriptions if CASCADE is set)
DELETE FROM messaging_packages;

-- Reset auto-increment
ALTER TABLE messaging_packages AUTO_INCREMENT = 1;

-- Now run the messaging_packages_sample.sql script again to insert fresh data
*/

-- ============================================================
-- Quick Check Queries
-- ============================================================

-- Count packages by service type
SELECT service_type, package_type, COUNT(*) as count
FROM messaging_packages
WHERE is_active = 1
GROUP BY service_type, package_type;

-- Expected results:
-- sms, payg: 1
-- sms, termly: 4
-- whatsapp, payg: 1
-- whatsapp, termly: 3
-- email, payg: 1
-- email, termly: 3

-- Total should be 13 packages
SELECT COUNT(*) as total_active_packages
FROM messaging_packages
WHERE is_active = 1;
