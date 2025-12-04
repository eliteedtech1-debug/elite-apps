-- ============================================================
-- Simple Update: Bronze → Standard, Silver → Premium, Gold → Elite
-- ============================================================
-- This script updates existing messaging package names
-- from Bronze/Silver/Gold to Standard/Premium/Elite
-- AND calculates proper unit costs for termly packages
--
-- Since this is a new system, no backward compatibility needed
-- ============================================================

-- Update all Bronze packages to Standard
UPDATE messaging_packages
SET package_name = REPLACE(package_name, 'Bronze', 'Standard'),
    description = REPLACE(description, 'Bronze', 'Standard')
WHERE package_name LIKE '%Bronze%';

-- Update all Silver packages to Premium
UPDATE messaging_packages
SET package_name = REPLACE(package_name, 'Silver', 'Premium'),
    description = REPLACE(description, 'Silver', 'Premium')
WHERE package_name LIKE '%Silver%';

-- Update all Gold packages to Elite
UPDATE messaging_packages
SET package_name = REPLACE(package_name, 'Gold', 'Elite'),
    description = REPLACE(description, 'Gold', 'Elite')
WHERE package_name LIKE '%Gold%';

-- Fix unit costs for termly packages (calculate from package_cost / messages_per_term)
UPDATE messaging_packages
SET unit_cost = ROUND(package_cost / messages_per_term, 4)
WHERE package_type = 'termly'
  AND messages_per_term > 0
  AND unit_cost = 0;

-- Verify the changes
SELECT
    id,
    package_name,
    service_type,
    package_type,
    messages_per_term,
    unit_cost,
    package_cost,
    description
FROM messaging_packages
ORDER BY service_type, package_type, messages_per_term;
