-- ============================================================================
-- ELITE CORE PRODUCTION DATABASE MIGRATION
-- Date: 2025-12-05
-- Description: Consolidated migration for Asset Management and Supply Management
-- ============================================================================

-- Use the appropriate database
-- ============================================================================
-- SECTION 1: ASSET CATEGORIES TABLE
-- ============================================================================

-- Add branch_id column if not exists
SET @dbname = DATABASE();
SET @tablename = 'asset_categories';
SET @columnname = 'branch_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) NULL AFTER school_id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add status column if not exists
SET @columnname = 'status';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(''Active'', ''Inactive'') DEFAULT ''Active'' AFTER branch_id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add depreciation_rate column if not exists
SET @columnname = 'depreciation_rate';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(5,2) DEFAULT NULL COMMENT ''Annual depreciation rate as percentage''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add created_at column if not exists
SET @columnname = 'created_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add updated_at column if not exists
SET @columnname = 'updated_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================================
-- SECTION 2: FACILITY ROOMS TABLE
-- ============================================================================

SET @tablename = 'facility_rooms';

-- Add branch_id column if not exists
SET @columnname = 'branch_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) NULL AFTER school_id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add status column if not exists
SET @columnname = 'status';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(''Active'', ''Inactive'') DEFAULT ''Active''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add created_at column if not exists
SET @columnname = 'created_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add updated_at column if not exists
SET @columnname = 'updated_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================================
-- SECTION 3: ASSETS TABLE
-- ============================================================================

SET @tablename = 'assets';

-- Add branch_id column if not exists
SET @columnname = 'branch_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) NULL AFTER school_id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add asset_code column if not exists
SET @columnname = 'asset_code';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) AFTER asset_name')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add purchase_price column if not exists
SET @columnname = 'purchase_price';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(10,2) AFTER purchase_cost')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add created_at column if not exists
SET @columnname = 'created_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add updated_at column if not exists
SET @columnname = 'updated_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================================
-- SECTION 4: CREATE NEW TABLES (IF NOT EXISTS)
-- ============================================================================

-- Create asset_images table
CREATE TABLE IF NOT EXISTS asset_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id VARCHAR(20) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  cloudinary_public_id VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_asset_id (asset_id)
);

-- ============================================================================
-- SECTION 5: DATA UPDATES
-- ============================================================================

-- Update depreciation rates for existing categories
UPDATE asset_categories 
SET depreciation_rate = CASE 
    WHEN LOWER(category_name) LIKE '%furniture%' OR LOWER(category_code) LIKE '%fur%' THEN 10.00
    WHEN LOWER(category_name) LIKE '%electronic%' OR LOWER(category_code) LIKE '%elec%' THEN 25.00
    WHEN LOWER(category_name) LIKE '%computer%' OR LOWER(category_code) LIKE '%comp%' THEN 33.33
    WHEN LOWER(category_name) LIKE '%vehicle%' OR LOWER(category_code) LIKE '%veh%' THEN 20.00
    WHEN LOWER(category_name) LIKE '%equipment%' OR LOWER(category_code) LIKE '%equip%' THEN 15.00
    WHEN LOWER(category_name) LIKE '%lab%' THEN 12.50
    WHEN LOWER(category_name) LIKE '%sport%' THEN 20.00
    WHEN LOWER(category_name) LIKE '%book%' OR LOWER(category_name) LIKE '%library%' THEN 0.00
    ELSE 10.00
END
WHERE depreciation_rate IS NULL;

-- Sync status fields from is_active
UPDATE asset_categories 
SET status = CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END 
WHERE status IS NULL AND is_active IS NOT NULL;

UPDATE facility_rooms 
SET status = CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END 
WHERE status IS NULL AND is_active IS NOT NULL;

-- Sync timestamp fields
UPDATE asset_categories 
SET created_at = createdAt 
WHERE created_at IS NULL AND createdAt IS NOT NULL;

UPDATE asset_categories 
SET updated_at = updatedAt 
WHERE updated_at IS NULL AND updatedAt IS NOT NULL;

UPDATE facility_rooms 
SET created_at = createdAt 
WHERE created_at IS NULL AND createdAt IS NOT NULL;

UPDATE facility_rooms 
SET updated_at = updatedAt 
WHERE updated_at IS NULL AND updatedAt IS NOT NULL;

UPDATE assets 
SET created_at = createdAt 
WHERE created_at IS NULL AND createdAt IS NOT NULL;

UPDATE assets 
SET updated_at = updatedAt 
WHERE updated_at IS NULL AND updatedAt IS NOT NULL;

-- ============================================================================
-- SECTION 6: CREATE HELPER FUNCTION
-- ============================================================================

DELIMITER //

DROP FUNCTION IF EXISTS get_average_depreciation_rate //

CREATE FUNCTION get_average_depreciation_rate() 
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE avg_rate DECIMAL(5,2);
    
    SELECT ROUND(AVG(depreciation_rate), 2) INTO avg_rate
    FROM asset_categories 
    WHERE depreciation_rate IS NOT NULL 
    AND depreciation_rate > 0
    ORDER BY created_at DESC 
    LIMIT 10;
    
    IF avg_rate IS NULL THEN
        SET avg_rate = 15.00;
    END IF;
    
    RETURN avg_rate;
END //

DELIMITER ;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration completed successfully!' AS status;
