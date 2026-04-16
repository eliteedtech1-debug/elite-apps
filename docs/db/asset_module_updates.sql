-- Asset Management Module Database Updates

-- 1. ALTER an existing table to add new columns and modify existing ones.
ALTER TABLE `assets`
  ADD COLUMN `expected_life` INT(11) NULL DEFAULT NULL COMMENT 'Expected life of the asset in years' AFTER `depreciation_rate`,
  MODIFY COLUMN `status` ENUM('Operational', 'Damaged', 'Under Maintenance', 'Decommissioned', 'Lost', 'In Storage', 'Working') NOT NULL DEFAULT 'Working';

-- 2. CREATE a new table for asset images if it doesn't exist.
CREATE TABLE IF NOT EXISTS `asset_images` (
  `image_id` INT(11) NOT NULL AUTO_INCREMENT,
  `asset_id` VARCHAR(20) NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `asset_id` (`asset_id`),
  CONSTRAINT `asset_images_ibfk_1` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. CREATE a new table for maintenance images if it doesn't exist.
CREATE TABLE IF NOT EXISTS `maintenance_images` (
  `image_id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_id` VARCHAR(20) NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `request_id` (`request_id`),
  CONSTRAINT `maintenance_images_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `maintenance_requests` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Sample seed data (optional, but good for testing)
-- No sample data will be added to avoid conflicts with existing data.
