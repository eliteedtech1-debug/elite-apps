-- Asset Management Complete Database Migration
-- This file contains ALL necessary schema changes for asset management to work properly

-- Fix asset_categories table
ALTER TABLE elite_yazid.asset_categories 
ADD COLUMN IF NOT EXISTS status ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER branch_id;

ALTER TABLE elite_yazid.asset_categories 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER status;

ALTER TABLE elite_yazid.asset_categories 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Fix facility_rooms table
ALTER TABLE elite_yazid.facility_rooms 
ADD COLUMN IF NOT EXISTS status ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER notes;

ALTER TABLE elite_yazid.facility_rooms 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER status;

ALTER TABLE elite_yazid.facility_rooms 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Fix assets table - add missing columns that models expect
ALTER TABLE elite_yazid.assets 
ADD COLUMN IF NOT EXISTS asset_code VARCHAR(20) AFTER asset_name;

ALTER TABLE elite_yazid.assets 
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) AFTER purchase_cost;

ALTER TABLE elite_yazid.assets 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER updatedAt;

ALTER TABLE elite_yazid.assets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Create asset_images table for Cloudinary image storage
CREATE TABLE IF NOT EXISTS elite_yazid.asset_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id VARCHAR(20) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  cloudinary_public_id VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  INDEX idx_asset_id (asset_id)
);

-- Update existing data to sync status fields
UPDATE elite_yazid.asset_categories SET status = CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END WHERE status IS NULL;
UPDATE elite_yazid.facility_rooms SET status = CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END WHERE status IS NULL;

-- Update timestamp fields
UPDATE elite_yazid.asset_categories SET created_at = createdAt WHERE created_at IS NULL;
UPDATE elite_yazid.asset_categories SET updated_at = updatedAt WHERE updated_at IS NULL;
UPDATE elite_yazid.facility_rooms SET created_at = createdAt WHERE created_at IS NULL;
UPDATE elite_yazid.facility_rooms SET updated_at = updatedAt WHERE updated_at IS NULL;
UPDATE elite_yazid.assets SET created_at = createdAt WHERE created_at IS NULL;
UPDATE elite_yazid.assets SET updated_at = updatedAt WHERE updated_at IS NULL;
